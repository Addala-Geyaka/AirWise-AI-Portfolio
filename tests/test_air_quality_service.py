"""Service tests for freshness, bounded caching, and unavailable data."""

import asyncio
from datetime import UTC, datetime, timedelta

import pytest

from app.clients.open_meteo import AirPayload, CurrentAir, CurrentWeather, HourlyAir, WeatherPayload
from app.services.air_quality import AirQualityService, ServiceUnavailable


class FakeClient:
    """Deterministic async source double for orchestration tests."""

    def __init__(self, air: AirPayload, weather: WeatherPayload | Exception) -> None:
        self.air = air
        self.weather = weather
        self.air_calls = 0
        self.weather_calls = 0

    async def fetch_air(self, latitude: float, longitude: float) -> AirPayload:
        self.air_calls += 1
        return self.air

    async def fetch_weather(self, latitude: float, longitude: float) -> WeatherPayload:
        self.weather_calls += 1
        if isinstance(self.weather, Exception):
            raise self.weather
        return self.weather


def make_air(time: datetime | None = None, aqi: float | None = 54) -> AirPayload:
    """Construct a valid source payload for a fixed instant."""
    timestamp = time or datetime.now(UTC)
    return AirPayload(
        current=CurrentAir(time=timestamp, us_aqi=aqi, pm2_5=7.2),
        hourly=HourlyAir(time=[timestamp, timestamp + timedelta(hours=1)], us_aqi=[aqi, 40]),
    )


@pytest.mark.asyncio
async def test_service_returns_source_values_and_weather() -> None:
    """Service output preserves the source AQI and weather values."""
    client = FakeClient(make_air(), WeatherPayload(current=CurrentWeather(temperature_2m=21)))
    result = await AirQualityService(client).get_conditions(12.9, 77.5, "Bengaluru")
    assert result.aqi == 54
    assert result.aqi_category == "Moderate"
    assert result.temperature_c == 21
    assert result.pollutants[0].value == 7.2
    assert len(result.forecast) == 2


@pytest.mark.asyncio
async def test_service_marks_old_source_timestamp_stale() -> None:
    """Source timestamps older than the explicit age bound are marked stale."""
    old = datetime.now(UTC) - timedelta(hours=5)
    client = FakeClient(make_air(old), WeatherPayload())
    result = await AirQualityService(client).get_conditions(12.9, 77.5, "Bengaluru")
    assert result.freshness == "stale"


@pytest.mark.asyncio
async def test_service_applies_source_offset_to_naive_timestamps() -> None:
    """Naive source-local timestamps are not compared in the server timezone."""
    local_time = datetime.now(UTC) - timedelta(hours=8)
    naive_source_time = local_time.replace(tzinfo=None)
    air = AirPayload(
        timezone="America/Los_Angeles",
        utc_offset_seconds=-8 * 60 * 60,
        current=CurrentAir(time=naive_source_time, us_aqi=54),
        hourly=HourlyAir(time=[naive_source_time], us_aqi=[54]),
    )
    client = FakeClient(air, WeatherPayload())
    result = await AirQualityService(client).get_conditions(12, 77, "Bengaluru")
    assert result.freshness == "current"
    assert result.timezone == "America/Los_Angeles"
    assert result.timestamp is not None
    assert result.timestamp.utcoffset() == timedelta(hours=-8)
    assert result.forecast[0].time.utcoffset() == timedelta(hours=-8)


@pytest.mark.asyncio
async def test_service_keeps_air_when_weather_is_unavailable() -> None:
    """A failed weather request does not hide usable air data."""
    client = FakeClient(make_air(), RuntimeError("timeout"))
    result = await AirQualityService(client).get_conditions(12.9, 77.5, "Bengaluru")
    assert result.aqi == 54
    assert result.temperature_c is None


@pytest.mark.asyncio
async def test_service_caches_by_rounded_coordinates() -> None:
    """Coordinates rounded to two decimals share a cache entry."""
    client = FakeClient(make_air(), WeatherPayload())
    service = AirQualityService(client)
    first = await service.get_conditions(12.971, 77.594, "Bengaluru")
    second = await service.get_conditions(12.974, 77.591, "Different label")
    assert first.aqi == second.aqi
    assert second.place_name == "Different label"
    assert second.latitude == 12.974
    assert second.longitude == 77.591
    assert client.air_calls == 1


@pytest.mark.asyncio
async def test_service_cache_evicts_least_recently_used_entries() -> None:
    """The coordinate cache stays bounded and evicts its oldest entry."""
    client = FakeClient(make_air(), WeatherPayload())
    service = AirQualityService(client, cache_max_entries=2)
    await service.get_conditions(10, 70, "First")
    await service.get_conditions(11, 71, "Second")
    await service.get_conditions(11.001, 71.001, "Second alias")
    await service.get_conditions(12, 72, "Third")
    await service.get_conditions(10, 70, "First again")
    assert client.air_calls == 4


@pytest.mark.asyncio
async def test_failed_force_refresh_keeps_the_valid_cache_entry() -> None:
    """A failed manual refresh does not discard data that was already cached."""
    client = FakeClient(make_air(), WeatherPayload())
    service = AirQualityService(client)
    original_fetch_air = client.fetch_air
    first = await service.get_conditions(12, 77, "Bengaluru")

    async def fail_air(latitude: float, longitude: float) -> AirPayload:
        raise RuntimeError("temporary source failure")

    client.fetch_air = fail_air  # type: ignore[method-assign]
    with pytest.raises(ServiceUnavailable):
        await service.get_conditions(12, 77, "Bengaluru", force_refresh=True)

    client.fetch_air = original_fetch_air  # type: ignore[method-assign]
    cached = await service.get_conditions(12, 77, "Bengaluru")
    assert cached.aqi == first.aqi
    assert client.air_calls == 1


@pytest.mark.asyncio
async def test_service_preserves_cancellation_from_required_air_request() -> None:
    """A cancelled upstream task remains cancellation, not a service error."""
    client = FakeClient(make_air(), WeatherPayload())

    async def cancel_air(latitude: float, longitude: float) -> AirPayload:
        raise asyncio.CancelledError

    client.fetch_air = cancel_air  # type: ignore[method-assign]
    with pytest.raises(asyncio.CancelledError):
        await AirQualityService(client).get_conditions(12, 77, "Bengaluru")


@pytest.mark.asyncio
async def test_service_rejects_missing_air() -> None:
    """Unavailable air data produces a typed service error."""
    client = FakeClient(make_air(), WeatherPayload())
    service = AirQualityService(client)

    async def fail_air(latitude: float, longitude: float) -> AirPayload:
        raise RuntimeError("timeout")

    client.fetch_air = fail_air  # type: ignore[method-assign]
    with pytest.raises(ServiceUnavailable):
        await service.get_conditions(12, 77, "Bengaluru")


@pytest.mark.asyncio
async def test_service_marks_missing_current_reading_unavailable() -> None:
    """A valid payload with no current item remains explicitly unavailable."""
    client = FakeClient(AirPayload(), WeatherPayload())
    result = await AirQualityService(client).get_conditions(12, 77, "Bengaluru")
    assert result.freshness == "unavailable"
    assert result.aqi is None
    assert all(item.value is None for item in result.pollutants)

"""Tests for fixed upstream hosts, validation, and retries."""

from datetime import UTC, datetime

import httpx
import pytest
import respx

from app.clients.open_meteo import (
    AIR_QUALITY_URL,
    GEOCODING_URL,
    WEATHER_URL,
    OpenMeteoClient,
    UpstreamError,
)


@pytest.mark.asyncio
@respx.mock
async def test_geocoding_returns_bounded_place_models() -> None:
    """Geocoding results are mapped into the public place contract."""
    respx.get(GEOCODING_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "results": [
                    {"name": "Bengaluru", "country": "India", "latitude": 12.9, "longitude": 77.5}
                ]
            },
        )
    )
    async with httpx.AsyncClient() as http:
        places = await OpenMeteoClient(http).search_places("Bengaluru")
    assert places[0].name == "Bengaluru"
    assert len(places) == 1


@pytest.mark.asyncio
@respx.mock
async def test_air_and_weather_payloads_validate() -> None:
    """Air and weather methods parse their documented fields."""
    now = datetime.now(UTC).isoformat()
    respx.get(AIR_QUALITY_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "timezone": "Asia/Kolkata",
                "utc_offset_seconds": 19800,
                "current": {"time": now, "us_aqi": 42, "pm2_5": 5.2},
            },
        )
    )
    respx.get(WEATHER_URL).mock(
        return_value=httpx.Response(
            200, json={"current": {"temperature_2m": 24, "wind_speed_10m": 4}}
        )
    )
    async with httpx.AsyncClient() as http:
        client = OpenMeteoClient(http)
        air = await client.fetch_air(12, 77)
        weather = await client.fetch_weather(12, 77)
    assert air.current is not None and air.current.us_aqi == 42
    assert air.timezone == "Asia/Kolkata"
    assert air.utc_offset_seconds == 19800
    assert weather.current is not None and weather.current.temperature_2m == 24


@pytest.mark.asyncio
@respx.mock
async def test_malformed_response_is_rejected() -> None:
    """Malformed source JSON produces a typed upstream error."""
    respx.get(GEOCODING_URL).mock(return_value=httpx.Response(200, json={"results": [{"name": 9}]}))
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError):
            await OpenMeteoClient(http).search_places("Bengaluru")


@pytest.mark.asyncio
@respx.mock
async def test_invalid_timezone_metadata_is_rejected() -> None:
    """Out-of-range source offsets fail response validation instead of leaking."""
    respx.get(AIR_QUALITY_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "timezone": "Asia/Kolkata",
                "utc_offset_seconds": 200000,
                "current": {"time": datetime.now(UTC).isoformat(), "us_aqi": 42},
            },
        )
    )
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError, match="Air response did not match its schema"):
            await OpenMeteoClient(http).fetch_air(12, 77)


@pytest.mark.asyncio
@respx.mock
async def test_upstream_error_retries_then_returns_safe_error() -> None:
    """Transient HTTP errors retry a bounded number of times."""
    route = respx.get(GEOCODING_URL).mock(return_value=httpx.Response(503))
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError, match="could not be reached"):
            await OpenMeteoClient(http, attempts=2).search_places("Bengaluru")
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
async def test_permanent_client_error_is_not_retried() -> None:
    """A non-transient 4xx response fails without a redundant retry."""
    route = respx.get(GEOCODING_URL).mock(return_value=httpx.Response(400))
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError, match="could not be reached"):
            await OpenMeteoClient(http, attempts=3).search_places("Bengaluru")
    assert route.call_count == 1


@pytest.mark.asyncio
@respx.mock
async def test_malformed_json_retries_then_returns_safe_error() -> None:
    """Invalid upstream JSON follows the bounded retry and sanitized error path."""
    route = respx.get(GEOCODING_URL).mock(
        return_value=httpx.Response(
            200,
            content=b"{invalid",
            headers={"content-type": "application/json"},
        )
    )
    async with httpx.AsyncClient() as http:
        with pytest.raises(UpstreamError, match="could not be reached"):
            await OpenMeteoClient(http, attempts=2).search_places("Bengaluru")
    assert route.call_count == 2


def test_api_hosts_are_fixed() -> None:
    """Only the expected upstream hostnames are embedded in the client."""
    assert "open-meteo.com" in AIR_QUALITY_URL
    assert "open-meteo.com" in WEATHER_URL
    assert "open-meteo.com" in GEOCODING_URL

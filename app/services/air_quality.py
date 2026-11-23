"""Orchestrate parallel upstream requests and deterministic air quality rules."""

import asyncio
from collections import OrderedDict
from datetime import UTC, datetime, timedelta, timezone
from time import monotonic
from typing import Literal

from app.clients.open_meteo import AirPayload, CurrentWeather, OpenMeteoClient
from app.domain.safety import aqi_category
from app.schemas.air_quality import AirQualityResponse, ForecastPoint, Pollutant

PollutantKey = Literal[
    "pm2_5",
    "pm10",
    "ozone",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "carbon_monoxide",
]
POLLUTANT_DETAILS: tuple[tuple[PollutantKey, str, str], ...] = (
    ("pm2_5", "PM2.5", "μg/m³"),
    ("pm10", "PM10", "μg/m³"),
    ("ozone", "Ozone", "μg/m³"),
    ("nitrogen_dioxide", "Nitrogen dioxide", "μg/m³"),
    ("sulphur_dioxide", "Sulphur dioxide", "μg/m³"),
    ("carbon_monoxide", "Carbon monoxide", "μg/m³"),
)
SOURCE = "Open-Meteo air quality forecast (CAMS model)"
STALE_AFTER = timedelta(hours=3)
DEFAULT_CACHE_MAX_ENTRIES = 256


class ServiceUnavailable(RuntimeError):
    """Raised when usable air quality data cannot be fetched."""


class AirQualityService:
    """Return validated conditions with a small coordinate-based TTL cache."""

    def __init__(
        self,
        client: OpenMeteoClient,
        cache_ttl_seconds: int = 600,
        cache_max_entries: int = DEFAULT_CACHE_MAX_ENTRIES,
    ) -> None:
        self._client = client
        self._cache_ttl = cache_ttl_seconds
        self._cache_max_entries = max(1, cache_max_entries)
        self._cache: OrderedDict[tuple[float, float], tuple[float, AirQualityResponse]] = (
            OrderedDict()
        )

    async def get_conditions(
        self,
        latitude: float,
        longitude: float,
        place_name: str,
        force_refresh: bool = False,
    ) -> AirQualityResponse:
        """Get air and weather together, bypassing the TTL cache when requested."""
        key = (round(latitude, 2), round(longitude, 2))
        cached = self._cache.get(key)
        if cached is not None and not force_refresh:
            created_at, response = cached
            if monotonic() - created_at < self._cache_ttl:
                self._cache.move_to_end(key)
                return response.model_copy(
                    update={
                        "place_name": place_name,
                        "latitude": latitude,
                        "longitude": longitude,
                    }
                )
            self._cache.pop(key)
        air, weather = await asyncio.gather(
            self._client.fetch_air(latitude, longitude),
            self._client.fetch_weather(latitude, longitude),
            return_exceptions=True,
        )
        if isinstance(air, BaseException):
            if isinstance(air, Exception):
                raise ServiceUnavailable("Air quality data is not available.") from air
            raise air
        if isinstance(weather, BaseException):
            if isinstance(weather, Exception):
                weather_current = None
            else:
                raise weather
        else:
            weather_current = weather.current
        response = self._build_response(latitude, longitude, place_name, air, weather_current)
        self._cache[key] = (monotonic(), response)
        self._cache.move_to_end(key)
        while len(self._cache) > self._cache_max_entries:
            self._cache.popitem(last=False)
        return response

    @staticmethod
    def _build_response(
        latitude: float,
        longitude: float,
        place_name: str,
        air: AirPayload,
        weather: CurrentWeather | None,
    ) -> AirQualityResponse:
        """Translate source payload models into the public response contract."""
        current = air.current
        aqi = current.us_aqi if current else None
        category = aqi_category(aqi)
        freshness: Literal["current", "stale", "unavailable"] = "unavailable"
        timestamp = _apply_source_offset(current.time, air.utc_offset_seconds) if current else None
        if timestamp is not None:
            age = datetime.now(UTC) - timestamp.astimezone(UTC)
            freshness = "stale" if age > STALE_AFTER else "current"
        pollutants = [
            Pollutant(
                key=key, label=label, value=getattr(current, key) if current else None, unit=unit
            )
            for key, label, unit in POLLUTANT_DETAILS
        ]
        return AirQualityResponse(
            place_name=place_name,
            latitude=latitude,
            longitude=longitude,
            source=SOURCE,
            timezone=air.timezone,
            timestamp=timestamp,
            freshness=freshness,
            aqi=aqi,
            aqi_category=category[0] if category else None,
            aqi_color=category[1] if category else None,
            pollutants=pollutants,
            forecast=AirQualityService._forecast_points(air),
            temperature_c=weather.temperature_2m if weather else None,
            humidity_percent=weather.relative_humidity_2m if weather else None,
            wind_speed_kmh=weather.wind_speed_10m if weather else None,
        )

    @staticmethod
    def _forecast_points(air: AirPayload) -> list[ForecastPoint]:
        """Pair source forecast timestamps and AQI values without extrapolation."""
        if air.hourly is None:
            return []
        return [
            ForecastPoint(
                time=_apply_source_offset(time, air.utc_offset_seconds),
                aqi=aqi,
            )
            for time, aqi in zip(air.hourly.time, air.hourly.us_aqi, strict=False)
        ]


def _apply_source_offset(value: datetime, offset_seconds: int | None) -> datetime:
    """Make a naive provider timestamp independent of the server's local timezone."""
    if value.tzinfo is not None:
        return value
    try:
        source_timezone = timezone(timedelta(seconds=offset_seconds or 0))
    except ValueError:
        source_timezone = UTC
    return value.replace(tzinfo=source_timezone)

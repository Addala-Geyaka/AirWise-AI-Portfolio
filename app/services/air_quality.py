"""Orchestrate parallel upstream requests and deterministic air quality rules."""

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Literal

from app.clients.open_meteo import OpenMeteoClient
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


class ServiceUnavailable(RuntimeError):
    """Raised when usable air quality data cannot be fetched."""


class AirQualityService:
    """Return validated conditions with a small coordinate-based TTL cache."""

    def __init__(self, client: OpenMeteoClient, cache_ttl_seconds: int = 600) -> None:
        self._client = client
        self._cache_ttl = cache_ttl_seconds
        self._cache: dict[tuple[float, float], tuple[datetime, AirQualityResponse]] = {}

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
        if (
            not force_refresh
            and cached
            and datetime.now(UTC) - cached[0] < timedelta(seconds=self._cache_ttl)
        ):
            return cached[1].model_copy(update={"place_name": place_name})
        air, weather = await asyncio.gather(
            self._client.fetch_air(latitude, longitude),
            self._client.fetch_weather(latitude, longitude),
            return_exceptions=True,
        )
        if isinstance(air, Exception):
            raise ServiceUnavailable("Air quality data is not available.") from air
        if isinstance(weather, asyncio.CancelledError):
            raise weather
        weather_current = None if isinstance(weather, BaseException) else weather.current
        response = self._build_response(latitude, longitude, place_name, air, weather_current)
        self._cache[key] = (datetime.now(UTC), response)
        return response

    @staticmethod
    def _build_response(
        latitude: float,
        longitude: float,
        place_name: str,
        air: object,
        weather: object,
    ) -> AirQualityResponse:
        """Translate source payload models into the public response contract."""
        from app.clients.open_meteo import AirPayload, CurrentWeather

        if not isinstance(air, AirPayload):
            raise ServiceUnavailable("Air quality data is not available.")
        current = air.current
        aqi = current.us_aqi if current else None
        category = aqi_category(aqi)
        freshness = "unavailable"
        timestamp = current.time if current else None
        if timestamp is not None:
            age = datetime.now(UTC) - timestamp.astimezone(UTC)
            freshness = "stale" if age > STALE_AFTER else "current"
        pollutants = [
            Pollutant(
                key=key, label=label, value=getattr(current, key) if current else None, unit=unit
            )
            for key, label, unit in POLLUTANT_DETAILS
        ]
        forecast = AirQualityService._forecast_points(air)
        current_weather = weather if isinstance(weather, CurrentWeather) else None
        return AirQualityResponse(
            place_name=place_name,
            latitude=latitude,
            longitude=longitude,
            source=SOURCE,
            timestamp=timestamp,
            freshness=freshness,  # type: ignore[arg-type]
            aqi=aqi,
            aqi_category=category[0] if category else None,
            aqi_color=category[1] if category else None,
            pollutants=pollutants,
            forecast=forecast,
            temperature_c=current_weather.temperature_2m if current_weather else None,
            humidity_percent=current_weather.relative_humidity_2m if current_weather else None,
            wind_speed_kmh=current_weather.wind_speed_10m if current_weather else None,
        )

    @staticmethod
    def _forecast_points(air: object) -> list[ForecastPoint]:
        """Pair source forecast timestamps and AQI values without extrapolation."""
        from app.clients.open_meteo import AirPayload

        if not isinstance(air, AirPayload) or air.hourly is None:
            return []
        return [
            ForecastPoint(time=time, aqi=air.hourly.us_aqi[index])
            for index, time in enumerate(air.hourly.time[: len(air.hourly.us_aqi)])
        ]

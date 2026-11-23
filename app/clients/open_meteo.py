"""Validated client for Open-Meteo geocoding, air quality, and weather APIs."""

import asyncio
from datetime import datetime

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.schemas.air_quality import Place

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_CURRENT = "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide"
WEATHER_CURRENT = "temperature_2m,relative_humidity_2m,wind_speed_10m"


class UpstreamError(RuntimeError):
    """Raised when an upstream response is unavailable or malformed."""


class UpstreamModel(BaseModel):
    """Base model for documented upstream fields while allowing API additions."""

    model_config = ConfigDict(extra="ignore")


class CurrentAir(UpstreamModel):
    """Current pollutant measurements and source model time."""

    time: datetime
    us_aqi: float | None = None
    pm2_5: float | None = None
    pm10: float | None = None
    ozone: float | None = None
    nitrogen_dioxide: float | None = None
    sulphur_dioxide: float | None = None
    carbon_monoxide: float | None = None


class HourlyAir(UpstreamModel):
    """Short AQI forecast series."""

    time: list[datetime] = Field(default_factory=list)
    us_aqi: list[float | None] = Field(default_factory=list)


class AirPayload(UpstreamModel):
    """Air quality API payload subset."""

    timezone: str | None = Field(default=None, max_length=80)
    utc_offset_seconds: int | None = Field(default=None, ge=-86399, le=86399)
    current: CurrentAir | None = None
    hourly: HourlyAir | None = None


class CurrentWeather(UpstreamModel):
    """Current weather variables used as context."""

    temperature_2m: float | None = None
    relative_humidity_2m: float | None = None
    wind_speed_10m: float | None = None


class WeatherPayload(UpstreamModel):
    """Weather API payload subset."""

    current: CurrentWeather | None = None


class GeocodingResult(UpstreamModel):
    """Single place returned by the geocoding API."""

    name: str
    country: str | None = None
    latitude: float
    longitude: float
    admin1: str | None = None
    admin2: str | None = None
    feature_code: str | None = None


class GeocodingPayload(UpstreamModel):
    """Geocoding API payload subset."""

    results: list[GeocodingResult] = Field(default_factory=list)


class OpenMeteoClient:
    """Call fixed Open-Meteo API hosts through a shared async HTTP client."""

    def __init__(self, client: httpx.AsyncClient, attempts: int = 2) -> None:
        self._client = client
        self._attempts = attempts

    async def search_places(self, query: str) -> list[Place]:
        """Return globally matched cities and administrative locations."""
        params: dict[str, str | int | float | bool | None] = {
            "name": query,
            "count": 100,
            "language": "en",
        }
        payload = await self._get_json(GEOCODING_URL, params)
        try:
            response = GeocodingPayload.model_validate(payload)
        except ValidationError as exc:
            raise UpstreamError("Geocoding response did not match its schema.") from exc
        return [
            Place(
                name=item.name,
                country=item.country,
                latitude=item.latitude,
                longitude=item.longitude,
                admin1=item.admin1,
                admin2=item.admin2,
                feature_code=item.feature_code,
            )
            for item in response.results
        ]

    async def fetch_air(self, latitude: float, longitude: float) -> AirPayload:
        """Fetch modelled AQI and pollutant values for coordinates."""
        params: dict[str, str | int | float | bool | None] = {
            "latitude": latitude,
            "longitude": longitude,
            "current": AIR_CURRENT,
            "hourly": "us_aqi",
            "forecast_hours": 12,
            "timezone": "auto",
        }
        payload = await self._get_json(AIR_QUALITY_URL, params)
        try:
            return AirPayload.model_validate(payload)
        except ValidationError as exc:
            raise UpstreamError("Air response did not match its schema.") from exc

    async def fetch_weather(self, latitude: float, longitude: float) -> WeatherPayload:
        """Fetch weather context for the same coordinates."""
        params: dict[str, str | int | float | bool | None] = {
            "latitude": latitude,
            "longitude": longitude,
            "current": WEATHER_CURRENT,
            "timezone": "auto",
        }
        payload = await self._get_json(WEATHER_URL, params)
        try:
            return WeatherPayload.model_validate(payload)
        except ValidationError as exc:
            raise UpstreamError("Weather response did not match its schema.") from exc

    async def _get_json(
        self, url: str, params: dict[str, str | int | float | bool | None]
    ) -> object:
        """Fetch and decode a response with a short bounded retry."""
        for attempt in range(self._attempts):
            try:
                response = await self._client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                retryable = status in {408, 429} or status >= 500
                if not retryable or attempt + 1 == self._attempts:
                    raise UpstreamError("An upstream service could not be reached.") from exc
            except (httpx.HTTPError, ValueError) as exc:
                if attempt + 1 == self._attempts:
                    raise UpstreamError("An upstream service could not be reached.") from exc
                await asyncio.sleep(0.1 * (2**attempt))
        raise UpstreamError("An upstream service could not be reached.")

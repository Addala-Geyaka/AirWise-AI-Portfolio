"""Typed request and response models for city and air quality data."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    """Base model that rejects unknown fields and implicit coercion."""

    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Place(StrictModel):
    """Geocoded or browser-derived location."""

    name: str = Field(min_length=1, max_length=100)
    country: str | None = Field(default=None, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    city: str | None = Field(default=None, max_length=100)
    district: str | None = Field(default=None, max_length=100)
    admin1: str | None = Field(default=None, max_length=100)
    admin2: str | None = Field(default=None, max_length=100)
    postcode: str | None = Field(default=None, max_length=20)
    feature_code: str | None = Field(default=None, max_length=20)


class PlaceSearchResponse(StrictModel):
    """A bounded list of geocoded search results."""

    places: list[Place] = Field(max_length=100)


class Pollutant(StrictModel):
    """A pollutant reading and the unit supplied by the source."""

    key: Literal["pm2_5", "pm10", "ozone", "nitrogen_dioxide", "sulphur_dioxide", "carbon_monoxide"]
    label: str
    value: float | None
    unit: str


class ForecastPoint(StrictModel):
    """One source-provided AQI forecast point."""

    time: datetime
    aqi: float | None


class AirQualityResponse(StrictModel):
    """Current modelled conditions with data provenance and availability."""

    place_name: str
    latitude: float
    longitude: float
    source: str
    timezone: str | None
    timestamp: datetime | None
    freshness: Literal["current", "stale", "unavailable"]
    aqi: float | None
    aqi_category: str | None
    aqi_color: str | None
    pollutants: list[Pollutant]
    forecast: list[ForecastPoint]
    temperature_c: float | None
    humidity_percent: float | None
    wind_speed_kmh: float | None

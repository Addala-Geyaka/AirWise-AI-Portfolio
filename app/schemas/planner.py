"""Bounded input and output contracts for AI-assisted planning text."""

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.air_quality import StrictModel


class PlannerForecastPoint(StrictModel):
    """A forecast number used to create a short planning summary."""

    time: datetime
    aqi: float | None = Field(default=None, ge=0, le=1000)


class PlannerBriefRequest(StrictModel):
    """Source values only; the endpoint accepts no free-form user prompt."""

    aqi: float | None = Field(default=None, ge=0, le=1000)
    forecast: list[PlannerForecastPoint] = Field(default_factory=list, max_length=12)


class PlannerBriefResponse(StrictModel):
    """A short generated or deterministic air-quality summary."""

    brief: str = Field(min_length=1, max_length=400)
    provider: Literal["gemini", "rules"]

"""Deterministic, non-medical air quality guidance."""

import math

from app.domain.factors import AQI_BANDS


def aqi_category(value: float | None) -> tuple[str, str] | None:
    """Map a valid US AQI value to its category label and color."""
    if value is None or not math.isfinite(value) or value < 0 or value > 500:
        return None
    rounded = round(value)
    for lower, upper, label, color in AQI_BANDS:
        if lower <= rounded <= upper:
            return label, color
    return None


def daily_guidance(value: float | None, sensitive_group: bool) -> list[str]:
    """Return conservative actions from AQI bands and a family preference."""
    category = aqi_category(value)
    if category is None:
        return [
            "Current AQI is unavailable. Check a local air quality authority "
            "before planning outdoors."
        ]
    if value is not None and value <= 50:
        return [
            "Outdoor plans can follow your usual routine.",
            "Check again later; conditions can change.",
        ]
    if value is not None and value <= 100:
        return ["Consider choosing a time with a lower forecast AQI for longer outdoor activity."]
    guidance = ["Move strenuous outdoor tasks to a lower-AQI time or an indoor option."]
    if sensitive_group:
        guidance.append("Follow local public-health guidance for sensitive groups.")
    else:
        guidance.append("Check local public-health guidance before extended outdoor activity.")
    return guidance


def safe_ventilation_guidance(value: float | None) -> str:
    """Describe outdoor-air ventilation options without implying indoor readings."""
    if value is None:
        return "Outdoor AQI is unavailable; use a local source before changing ventilation."
    if value > 100:
        return (
            "If practical, limit unfiltered outdoor air while AQI is elevated; "
            "follow building guidance."
        )
    return "Ventilate when useful for your space, and avoid indoor pollution sources."

"""Golden tests for stable AQI bands and guidance rules."""

import pytest

from app.domain.safety import aqi_category, daily_guidance, safe_ventilation_guidance


@pytest.mark.parametrize(
    ("value", "label"),
    [
        (0, "Good"),
        (50, "Good"),
        (51, "Moderate"),
        (100, "Moderate"),
        (101, "Unhealthy for sensitive groups"),
        (150, "Unhealthy for sensitive groups"),
        (151, "Unhealthy"),
        (200, "Unhealthy"),
        (201, "Very unhealthy"),
        (300, "Very unhealthy"),
        (301, "Hazardous"),
        (500, "Hazardous"),
    ],
)
def test_aqi_category_boundaries(value: int, label: str) -> None:
    """Every EPA band edge maps to the expected descriptor."""
    result = aqi_category(value)
    assert result is not None
    assert result[0] == label


@pytest.mark.parametrize("value", [None, -1, 501, float("nan"), float("inf")])
def test_invalid_aqi_has_no_category(value: float | None) -> None:
    """Missing and out-of-range data remain unavailable."""
    assert aqi_category(value) is None


def test_guidance_handles_missing_values_without_inventing_readings() -> None:
    """Missing readings direct the user to a local source."""
    assert "unavailable" in daily_guidance(None, False)[0].lower()


def test_guidance_changes_for_sensitive_group_preference() -> None:
    """Sensitive-group preference adds a local-guidance reminder."""
    guidance = daily_guidance(120, True)
    assert any("sensitive groups" in item for item in guidance)
    assert any("lower-AQI" in item for item in guidance)


def test_good_aqi_guidance_keeps_usual_routine() -> None:
    """Good AQI suggests the usual routine and a later check."""
    assert len(daily_guidance(30, False)) == 2


def test_ventilation_guidance_preserves_unavailable_status() -> None:
    """Ventilation guidance never substitutes a missing AQI value."""
    assert "unavailable" in safe_ventilation_guidance(None).lower()


def test_ventilation_guidance_for_elevated_aqi() -> None:
    """Elevated conditions produce cautious, non-medical wording."""
    assert "limit unfiltered outdoor air" in safe_ventilation_guidance(140)

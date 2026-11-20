"""Sourced AQI category limits and documented estimation factors."""

# US EPA AQI category bands, current as of 2026-11-20.
# Source: https://www.epa.gov/outdoor-air-quality-data/airdata-basic-information
AQI_BANDS: tuple[tuple[int, int, str, str], ...] = (
    (0, 50, "Good", "#398566"),
    (51, 100, "Moderate", "#b87920"),
    (101, 150, "Unhealthy for sensitive groups", "#bd603b"),
    (151, 200, "Unhealthy", "#b54f55"),
    (201, 300, "Very unhealthy", "#7b5fa8"),
    (301, 500, "Hazardous", "#75464f"),
)

# Emissions avoided are not currently calculated in this first release. When added,
# factors must identify source year, units, and a region/vehicle assumption here.

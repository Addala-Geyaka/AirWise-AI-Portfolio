# Data and methodology

## Air quality

AirWise requests the source-provided `us_aqi` and pollutant fields from Open-Meteo. It displays source values without recalculating or interpolating missing pollutant measurements. The provider describes these as model forecasts with CAMS input, not local monitor readings. The source timestamp, UTC offset, and timezone are preserved; naive source timestamps use the provider's offset for freshness checks, and the interface formats times in the selected location's timezone. Values older than three hours are labeled stale; absent values are labeled unavailable.

The AQI descriptor bands are centralized in `app/domain/factors.py` and follow the US EPA table: Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–300, and Hazardous 301–500. AQI outside the supported range is unavailable.

## Routine guidance

The planner uses simple deterministic conditions. It does not predict health outcomes or diagnose sensitivity. It encourages flexible timing, a lower-AQI forecast window, and checking local public-health guidance. A local preference controls whether sensitive-group reminders appear.

Indoor guidance is contextual only. No indoor sensor is connected, and outdoor readings are never presented as indoor measurements. Plants are not recommended as a substitute for filtration.

An optional Gemini summary receives only the current AQI number and forecast timestamps/values. It does not receive the selected city, account identity, family preference, or free-form user text. If Gemini is not configured or fails, the API returns a deterministic summary. The model text is a short explanation, not a new measurement or health assessment.

## Emissions and exposure

The current app does not calculate emissions savings. It does not treat a sustainable alternative as personal exposure reduction. Any future estimate must state its activity data, source year, factor source, and units in `app/domain/factors.py`, and must be labeled as an estimate.

## Sources

- [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)
- [Open-Meteo Weather API](https://open-meteo.com/en/docs)
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- [US EPA AirData AQI categories](https://www.epa.gov/outdoor-air-quality-data/airdata-basic-information)

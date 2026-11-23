# AirWise AI Build Plan

## Goal

Deliver a responsive urban air quality app that helps people understand modelled city readings and make practical plans. The source brief named the modules but did not include their detailed specifications, so the first version uses conservative, clearly labeled defaults.

## Delivered

- React, strict TypeScript, Vite, React Query, Zod validation, route-level lazy loading, keyboard support, responsive navigation, and reduced-motion styles.
- Dashboard with city search, current US AQI, source timestamp, pollutant readings, weather context, and a 12-hour model forecast.
- Worldwide place lookup with city/state/country context, user-triggered browser location, and a selected-coordinate map link.
- Versioned local storage for location, family preference, and planner actions.
- Supabase email/password and Google sign-in with guest mode until the user configures project credentials.
- Optional Gemini brief from AQI/forecast numbers with a server-side key and rules-based fallback.
- Rule-based daily planner, indoor guidance that does not claim to use a sensor, sustainable alternatives without unsupported savings totals, timing comparison, and action checklist.
- FastAPI routers, bounded Pydantic contracts, fixed Open-Meteo hosts, parallel air/weather retrieval, coordinate-keyed TTL cache, timeouts, retry bounds, CORS allowlist, rate limits, security headers, health route, and sanitized errors.
- CI, local quality commands, security/methodology/performance documentation, and requirement traceability.

## Quality status

- Frontend: lint, formatting, strict typing, 13 unit tests, 6 Chromium E2E assertions, production build, and the 250 KB gzip entry budget pass. Current entry JavaScript is 160.7 KB gzip; the Playwright process did not exit cleanly after reporting all cases passed on this Windows host. See [docs/QUALITY.md](docs/QUALITY.md).
- Python: Ruff formatting/lint and mypy strict pass; 63 tests pass at 95.28% branch coverage.
- `npm audit` found zero vulnerabilities. `pip-audit` found no known vulnerabilities in installed PyPI dependencies; the local project is not published on PyPI.

## Scope decisions

- Gemini writes an optional brief; core routine actions remain deterministic and labeled Rule-based.
- No emissions savings or personal exposure reduction is calculated without sourced factors and user activity inputs.
- Missing and stale source values stay explicit. Forecasts are modelled data, not station measurements.
- Family settings contain a general preference only; the app does not request personal health details or provide medical advice.

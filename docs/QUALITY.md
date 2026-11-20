# Quality evidence

## Gates

| Gate | Command | Result |
|---|---|---|
| Python lint and formatting | `ruff check app tests` and `ruff format --check app tests` | Pass locally. |
| Python strict typing | `mypy app` | Pass locally across 23 source files. |
| Backend unit and coverage | `pytest --cov=app --cov-branch --cov-fail-under=90` | Blocked during collection: Windows Application Control denies loading `pydantic_core` from this workspace. The 22 pure safety/domain tests pass; the planner tests are present but hit the same collection block. |
| Frontend lint and formatting | `npm run lint` and `npm run format:check` | Pass locally. |
| Frontend strict typing | `npm run typecheck` | Pass locally; also runs as part of the production build. |
| Frontend unit and axe tests | `npm test` | Pass: 9 tests in 3 files. jsdom skips canvas-based contrast math; full WCAG contrast checks run in Chromium. |
| Browser journey and axe | `npm run test:e2e -- --workers=1` | Pass: 6 Chromium tests cover global city/state/country search, location/map, account setup, planner persistence, phone-width layout, and WCAG axe checks. |
| Production bundle | `npm run build` and `npm run check:bundle` | Pass. Entry JavaScript is 101.7 KB gzip, below the 250 KB budget; the chart is lazy loaded. |
| NPM dependency audit | `npm install @supabase/supabase-js` | Install audit reported zero vulnerabilities across 373 packages. A separate `npm audit` refresh could not reach registry.npmjs.org. |
| Python package audit | `pip-audit` | Latest completed scan found no known vulnerabilities in PyPI packages; the local project is not published on PyPI and is skipped. |

## Product scope

- Planner actions are deterministic. Gemini summaries activate when `APP_GEMINI_API_KEY` is set on the API; missing keys and upstream errors fall back to rules.
- Supabase email and Google sign-in activate when the frontend Supabase URL and publishable key are configured. Guest mode remains available.
- Global geocoding requests up to 100 matches for each search and shows administrative and country context; it is an online search, not a packaged offline gazetteer.
- Air quality and weather readings come from Open-Meteo. When source data is stale or unavailable, the interface labels that state and provides a safe fallback.
- The indoor page gives general guidance and does not claim to read an indoor sensor. The simulator compares forecast timing and does not estimate personal exposure or health outcomes.
- The full backend coverage gate still needs to run in an environment where Windows Application Control allows the Pydantic native extension to load.

# Quality evidence

## Gates

Checks run in this workspace on Windows with Python 3.14.8 and the installed Node toolchain.

| Gate | Command | Result |
|---|---|---|
| Python lint and formatting | `ruff check app tests` and `ruff format --check app tests` | Pass. All 30 Python files are formatted. |
| Python strict typing | `mypy app` | Pass across 24 source files. |
| Backend tests and coverage | `python -m coverage run -m pytest`, then `python -m coverage report --fail-under=90` | Pass: 69 tests; 96% branch-aware coverage. CI runs coverage directly because pytest-cov reported no collected data on the GitHub runner despite all tests passing. The run reports deprecation warnings from the installed Starlette TestClient/httpx integration and SlowAPI under Python 3.14. |
| Frontend lint and formatting | `npm run lint` and `npm run format:check` | Pass. Formatting now includes CSS and E2E TypeScript. |
| Frontend strict typing | `npm run typecheck` | Pass. |
| Frontend unit tests | `npm test` | Pass: 14 tests in 5 files. jsdom logs its expected unsupported canvas diagnostic from axe-core; Chromium runs the full accessibility check. |
| Browser journeys and axe | `npm run test:e2e -- --workers=1` | All 6 Chromium cases passed, covering keyboard search, location/map, planner persistence, account setup, phone-width layout, and axe. The Playwright process did not exit after reporting the results in this Windows sandbox and was interrupted, so a clean process exit was not captured. |
| Production build | `npm run build` | Pass. Vite warns about the raw-size main chunk and dependency annotations; the gzip budget below passes and the chart remains split into its own chunk. |
| Bundle budget | `npm run check:bundle` | Pass: entry JavaScript is 161.0 KB gzipped, below the 250 KB limit. |
| NPM dependency audit | `npm audit --audit-level=high` | Pass: zero vulnerabilities found. |
| Python dependency audit | `pip-audit` | No known vulnerabilities found in installed PyPI dependencies. The local `airwise-ai` project is not published to PyPI and was skipped. |

The project supports Python 3.12 and later; the local backend run used Python 3.14.8. Re-run CI on Python 3.12 to verify the declared minimum version independently.

## Product scope

- Planner actions are deterministic. Gemini summaries activate when `APP_GEMINI_API_KEY` is set on the API; missing keys and upstream errors fall back to rules.
- Supabase email and Google sign-in activate when the frontend Supabase URL and publishable key are configured. Guest mode remains available.
- Global geocoding requests up to 100 matches for each search and shows administrative and country context; it is an online search, not a packaged offline gazetteer.
- Air quality and weather readings come from Open-Meteo. When source data is stale or unavailable, the interface labels that state and provides a safe fallback.
- The indoor page gives general guidance and does not claim to read an indoor sensor. The simulator compares forecast timing and does not estimate personal exposure or health outcomes.

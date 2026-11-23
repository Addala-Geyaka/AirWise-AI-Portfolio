# AirWise AI Engineering Audit

## Scope

Reviewed the existing React/TypeScript frontend, FastAPI backend, upstream clients, schemas, state and data flow, tests, CI, security documentation, and feature pages. The application was already present and functional; the former audit incorrectly described an empty workspace and has been replaced with findings from the current source.

## Hack2Skill precision review

The read-only audit for this pass identified these issues before any edits:

| Priority | File(s) | Weakness | Evaluation category | Smallest effective correction |
|---|---|---|---|---|
| High | `app/core/middleware.py`, `tests/test_safety.py` | The body-size guard trusted `Content-Length` and did not count streamed request bytes, allowing chunked bodies to bypass the configured limit. | Security, Testing | Count bytes as ASGI request messages arrive, reject over-limit streams before routing, and cover the absent-length path. |
| High | `frontend/src/components/Topbar.tsx`, `frontend/e2e/airwise.spec.ts` | The input declared combobox/listbox semantics but did not support arrow-key option navigation; Enter always selected the first result. | Accessibility, Testing | Track an active option, expose it with `aria-activedescendant`, and verify ArrowDown/Enter selection in the browser journey. |
| Medium | `app/clients/open_meteo.py`, `tests/test_open_meteo.py` | Provider numeric models accepted non-finite floats; malformed `NaN` readings could reach response construction. | Reliability, Security, Testing | Reject NaN and infinities at the Pydantic upstream boundary and add a malformed-provider regression test. |
| Medium | `.gitignore`, `airwise_ai.egg-info/`, `frontend/tsconfig.tsbuildinfo` | Generated package metadata and TypeScript build state were committed as project source. | Code Quality | Remove these generated artifacts from version control and ignore their patterns. |
| Medium | `frontend/src/styles.css`, `frontend/src/styles/theme.css`, `frontend/src/styles/components.css`, `frontend/package.json` | Three CSS files were not formatted, and the formatter gate did not include CSS. | Code Quality | Format the affected CSS and extend the existing formatting check to CSS and E2E TypeScript. |
| Low | `frontend/src/components/Topbar.tsx`, `frontend/src/lib/api.ts` | Search labels and API place names implemented separate case-insensitive deduplication logic. | Code Quality | Share one small text-part normalization helper while preserving the existing fields sent to the API. |

Baseline Ruff, mypy, and ESLint checks passed. Prettier passed for its configured files but reported the three unformatted CSS files when explicitly checked. The upstream Pydantic model accepted a `NaN` AQI value. The tracked file list contained generated `.egg-info` and `.tsbuildinfo` artifacts. The local `.env` files were ignored and untracked; their values were not read.

## Findings and remediation

| Priority | Finding before changes | Remediation |
|---|---|---|
| High | The backend coordinate cache had no entry limit, so browsing many locations could grow process memory indefinitely. A rounded-coordinate cache hit also returned the first request's coordinates. | Use a monotonic-clock TTL and a 256-entry LRU bound. Refresh the returned place name and coordinates for each request. |
| High | `asyncio.gather(return_exceptions=True)` allowed a cancelled required air-data task to be converted into an ordinary service error. | Preserve cancellation and other non-application `BaseException` signals; continue treating ordinary weather errors as optional missing context. |
| Medium | The Open-Meteo retry loop retried permanent 4xx responses, adding delay and upstream load without a likely recovery. | Retry only 408, 429, 5xx, transport failures, and malformed JSON; return a sanitized error immediately for other 4xx responses. |
| Medium | The planner and progress pages duplicated completed-action state updates despite an existing shared immutable helper. | Both pages now use `toggleCompletedAction`. |
| Medium | Air-quality and planner queries did not pass TanStack Query's abort signal to `fetch`, so obsolete requests could continue after their query was abandoned. | Thread the signal through the shared API reader to the browser request. |
| High | Source-local timestamps were compared as if they used the server timezone, and browser formatting used the viewer's timezone even when another city was selected. | Preserve the provider's timezone and UTC offset, make naive source timestamps explicit, and format readings and forecast times in the selected location's timezone. |
| High | The edited `.env.example` contained a populated Gemini credential-like value. | Cleared the sample value. If it was an active credential, rotate it; clearing the sample does not revoke it. The Supabase URL and publishable key remain in the frontend example because those are public client configuration. |

## Remediation completed in this pass

- The request-size middleware now checks declared lengths, counts streamed bytes into a bounded buffer, and replays accepted bodies to the route; malformed and oversized requests are rejected before routing.
- The location combobox now supports ArrowUp, ArrowDown, Escape, and Enter, and exposes the active option to assistive technology.
- Upstream air-quality and weather models reject non-finite numbers such as `NaN` and infinity.
- One shared helper now deduplicates location text parts case-insensitively.
- CSS formatting is enforced alongside TypeScript and E2E formatting; the three previously unformatted CSS files were formatted.
- Generated `.egg-info` and `tsconfig.tsbuildinfo` files were removed from version control and added to `.gitignore`.

## Tests added

- Backend: assert cached coordinates match the current request, LRU eviction stays bounded, cancellation propagates, permanent 4xx responses are not retried, and naive source-local timestamps use the provider's UTC offset.
- Frontend: assert request cancellation reaches `fetch`, malformed API responses fail schema validation, and times render in the selected location's timezone.
- This pass: reject streamed and malformed request bodies with safe response headers, verify valid body replay and disconnect propagation, reject non-finite provider readings, verify ArrowDown/Enter selects the active location in Chromium, and test shared case-insensitive location-part deduplication.

## Architecture and security review

- API keys are loaded into the server-side Gemini client; the browser API boundary validates responses with Zod.
- Public request schemas bound coordinates, names, and planner payloads; routes return generic upstream errors.
- CORS uses an explicit configured origin list, and the API applies security headers, request-size checks, and rate limits.
- Frontend routes are lazy loaded; AQI and weather are requested concurrently; place search is debounced; the chart is split from the initial bundle.
- Completed-action and location preferences are validated before use and remain local to the browser.
- Existing accessibility support includes semantic page structure, a skip link, labeled controls, visible data states, reduced-motion styles, a forecast table, and browser axe checks. This audit did not find a demonstrated accessibility regression requiring a UI redesign.

## Remaining limits

- The bounded cache is process-local. It is not shared across workers or deployment replicas, and equivalent simultaneous cache misses are not coalesced.
- Production deployment still needs exact frontend/API hosts in CORS and Content Security Policy configuration, as documented in `docs/SECURITY.md`.
- The optional multi-factor activity-window feature was not added. The backend currently has hourly AQI but only current weather, so hourly temperature, humidity, and wind inputs are not available for a transparent forecast-window recommendation.
- The supplied 96.90/100 evaluation score was not measured again. No new score is claimed.

## Validation

See `docs/QUALITY.md` for the checks run in this workspace and any host-specific limitations.

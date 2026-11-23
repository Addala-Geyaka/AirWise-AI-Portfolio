# Architecture

## Request flow

The browser requests typed API data. FastAPI validates query bounds, and route handlers pass only validated values to the service layer. `AirQualityService` fetches air data and weather concurrently through the one shared async HTTP client. The air payload is required for a dashboard response; weather may be unavailable without hiding valid air data. Source timezone and UTC offset accompany timestamps so freshness checks and browser displays use the selected location's time. The optional planner endpoint sends only current AQI and forecast numbers to Gemini, then validates and bounds the returned text. If Gemini is not configured or unavailable, it returns deterministic summary text.

## Backend map

```text
app/
  api/routers/       health, global geocoding, current conditions, planner brief
  clients/           fixed-host Open-Meteo and Photon geocoding clients
  core/              settings, middleware, shared limiter
  domain/            sourced AQI bands and pure guidance functions
  schemas/           strict public API response models
  services/          parallel orchestration, TTL cache, Gemini summary/fallback
```

There is one shared `httpx.AsyncClient`, explicit connect/read timeouts, two bounded upstream attempts, and an in-memory TTL cache keyed by coordinates rounded to two decimal places. Weather failure is treated as missing context. AQI failure produces a sanitized `503`.

## Frontend map

```text
frontend/src/
  app/               route layout, selected place, shared contexts
  auth/              Supabase email and Google sign-in
  components/        navigation, search, chart, common panels
  features/          dashboard, family, planner, indoor, alternatives, simulator, progress
  hooks/             debounce and preference persistence
  lib/               API boundary, formatting, versioned local storage
  types/             Zod schemas and inferred TypeScript types
```

Routes are lazy loaded. TanStack Query owns server state and uses a five-minute stale time. Charts load separately. Zod validates API responses and browser storage before the app uses them. Global search is debounced, uses Photon first for worldwide named-place search, and falls back to Open-Meteo when Photon has no match or is unavailable. Results include available address and administrative context; the selected-location chip shows the city or place name. Browser geolocation is user-triggered; selected coordinates can be opened on OpenStreetMap. Location and planning preferences remain local to the browser.

## AI and planning

Routine action cards remain rule-based and adapt to the selected AQI. When configured, Gemini adds a short summary from the AQI and forecast only; no account details, free text, or family preferences are sent. The output is displayed as escaped text, bounded to 400 characters, and always has a deterministic fallback. The key is read by FastAPI from `APP_GEMINI_API_KEY` and never sent to the browser.

## Deployment boundaries

Deploy the React app from `frontend/` to Vercel and the API from the repository root to Render. CORS must list the exact deployed frontend origin. The frontend’s `connect-src` policy must be updated to the exact API host before deployment. All upstream hostnames are constants in the backend client.

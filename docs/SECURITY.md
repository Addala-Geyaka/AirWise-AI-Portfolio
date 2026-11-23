# Security notes

## Threat model

| Threat | Control |
|---|---|
| Arbitrary upstream URL / SSRF | Backend clients use fixed Open-Meteo, Photon, and Google Generative Language hosts. User input cannot set a URL. |
| Invalid coordinates or search terms | FastAPI query bounds and a bounded global-location search term. |
| Upstream schema drift | Pydantic validates geocoding, air, weather, and public API models; malformed responses become a generic service error. |
| Prompt injection / unsafe model content | The planner accepts only bounded AQI numbers and forecast timestamps; it accepts no user prompt, profile preference, or account data. Model output is length-limited and rendered as text. |
| Browser storage tampering | Versioned Zod schemas; invalid values fall back to defaults. |
| Cross-origin access | CORS uses a configured explicit origin list and excludes `*`. |
| Request floods | SlowAPI applies 30/minute route limits and a 120/minute default. |
| Oversized requests | Middleware rejects bodies over the configured cap while reading the ASGI request stream, including requests without a declared `Content-Length`. Planner POST bodies are also schema-bounded. |
| Browser script injection | No `dangerouslySetInnerHTML`; Vercel CSP does not allow inline scripts. |
| Sensitive logs | The application does not log user preferences, search strings, or response bodies. Request IDs are generated server-side. |
| Unsafe browser capabilities | Camera and microphone are disabled, geolocation requires same-origin permission, and framing is blocked. |

## Secrets

Keep `APP_GEMINI_API_KEY` in the API environment (`.env` locally, the host secret store in deployment); never put it in a `VITE_*` variable. Supabase URL and publishable key may be used in the browser. Never expose a Supabase service-role key. Google OAuth client secrets belong in Supabase provider settings, not this repository.

## Known limits

- Rate limiting and the response cache are process-local; multiple replicas do not share state.
- The body-size middleware buffers at most the configured request limit before routing. Increase that limit only when a route needs larger request payloads.
- Vercel’s CSP allows `https://*.onrender.com` by default for initial setup. Narrow it to the exact deployed API host before production.
- `APP_CORS_ORIGINS` must be set to the deployed origin; the local development defaults are not suitable for a public deployment.
- Add the exact Supabase project host to the deployed CSP `connect-src` if using a custom Supabase domain.

## Verification

`npm audit` is part of CI. `pip-audit` checks installed Python packages. API boundary tests cover invalid input, CORS, security headers, and oversized declared requests.

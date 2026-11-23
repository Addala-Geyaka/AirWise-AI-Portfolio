# Performance

- One process-wide async HTTP client reuses connections with explicit timeouts and connection limits.
- Air quality and weather calls run concurrently. A weather timeout does not block air quality results.
- Server cache entries use two-decimal coordinate keys, a configurable TTL, and a 256-entry LRU bound. The frontend query cache uses a five-minute stale time.
- City search waits 350 ms after typing before requesting geocoding results.
- React routes are split with `React.lazy`; Recharts is isolated in a lazy dashboard chunk.
- GZip middleware compresses responses over 500 bytes.
- A CI budget checks the entry JavaScript bundle at under 250 KB gzipped. See the latest measured result in [QUALITY.md](QUALITY.md).
- `/health` returns a lightweight process check for deployment probes.

The cache is in memory and resets on restart. It is not shared between workers or replicas, and simultaneous misses for the same coordinates are not coalesced.

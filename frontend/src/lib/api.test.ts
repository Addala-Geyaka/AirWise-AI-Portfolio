import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAirQuality } from "./api";

const place = {
  name: "Bengaluru",
  country: "India",
  latitude: 12.9716,
  longitude: 77.5946,
};

const airResponse = {
  place_name: "Bengaluru, India",
  latitude: 12.9716,
  longitude: 77.5946,
  source: "Open-Meteo air quality forecast (CAMS model)",
  timezone: "Asia/Kolkata",
  timestamp: null,
  freshness: "unavailable",
  aqi: null,
  aqi_category: null,
  aqi_color: null,
  pollutants: [],
  forecast: [],
  temperature_c: null,
  humidity_percent: null,
  wind_speed_kmh: null,
};

describe("air quality API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passes query cancellation through and validates the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(airResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAirQuality(place, false, signal);

    expect(result.aqi).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("latitude=12.9716"),
      expect.objectContaining({ signal }),
    );
  });

  it("rejects a malformed API response at the client boundary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ...airResponse, freshness: "unknown" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchAirQuality(place)).rejects.toThrow();
  });
});

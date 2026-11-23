import { describe, expect, it } from "vitest";
import { buildRoutine } from "./rules";
import type { AirQuality } from "../../types/air";

const baseAir: AirQuality = {
  place_name: "Bengaluru, India",
  latitude: 12.9,
  longitude: 77.5,
  source: "Open-Meteo",
  timezone: "Asia/Kolkata",
  timestamp: new Date().toISOString(),
  freshness: "current",
  aqi: 120,
  aqi_category: "Unhealthy for sensitive groups",
  aqi_color: "#bd603b",
  pollutants: [],
  forecast: [],
  temperature_c: null,
  humidity_percent: null,
  wind_speed_kmh: null,
};

describe("daily planner rules", () => {
  it("uses a no-assumptions fallback when AQI is missing", () => {
    expect(buildRoutine(undefined, false)[0]?.detail).toContain("unavailable");
  });

  it("offers a usual routine for a low reading", () => {
    expect(buildRoutine({ ...baseAir, aqi: 30 }, false)[0]?.title).toBe(
      "Follow your usual routine",
    );
  });

  it("includes local sensitive-group guidance when selected", () => {
    const plan = buildRoutine(baseAir, true);
    expect(plan.some((action) => action.id === "local-guidance")).toBe(true);
  });

  it("does not add a profile-specific reminder by default", () => {
    const plan = buildRoutine(baseAir, false);
    expect(plan.some((action) => action.id === "local-guidance")).toBe(false);
  });
});

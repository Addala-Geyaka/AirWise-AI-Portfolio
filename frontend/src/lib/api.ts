import {
  AirQualitySchema,
  PlacesResponseSchema,
  type AirQuality,
  type Place,
} from "../types/air";
import { PlannerBriefSchema, type PlannerBrief } from "../types/plan";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function readJson<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return schema.parse(await response.json());
}

export function fetchPlannerBrief(air: AirQuality): Promise<PlannerBrief> {
  return readJson("/api/v1/planner/brief", PlannerBriefSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      aqi: air.aqi,
      forecast: air.forecast.slice(0, 12),
    }),
  });
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const params = new URLSearchParams({ q: query });
  const result = await readJson(
    `/api/v1/places/search?${params}`,
    PlacesResponseSchema,
    { signal },
  );
  return result.places;
}

export async function fetchAirQuality(
  place: Place,
  forceRefresh = false,
): Promise<AirQuality> {
  const parts = [
    place.name,
    place.district,
    place.city,
    place.admin1,
    place.country,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const placeName = parts
    .filter(
      (value, index) =>
        parts.findIndex(
          (candidate) =>
            candidate.toLocaleLowerCase() === value.toLocaleLowerCase(),
        ) === index,
    )
    .join(", ")
    .slice(0, 100);
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    place_name: placeName,
  });
  if (forceRefresh) params.set("force_refresh", "true");
  return readJson(`/api/v1/air-quality?${params}`, AirQualitySchema);
}

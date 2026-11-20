import { z } from "zod";
import { PlaceSchema, type Place } from "../types/air";

const KEY = "airwise.location.v1";
const StoredPlaceSchema = z.object({
  version: z.literal(1),
  place: PlaceSchema,
});

export const DEFAULT_PLACE: Place = {
  name: "Bengaluru",
  country: "India",
  latitude: 12.9716,
  longitude: 77.5946,
  admin1: "Karnataka",
};

export function loadPlace(): Place {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PLACE;
    const parsed = StoredPlaceSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data.place : DEFAULT_PLACE;
  } catch {
    return DEFAULT_PLACE;
  }
}

export function savePlace(place: Place): void {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ version: 1, place: PlaceSchema.parse(place) }),
  );
}

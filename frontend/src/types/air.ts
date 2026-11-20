import { z } from "zod";

export const PlaceSchema = z.object({
  name: z.string().min(1).max(100),
  country: z.string().max(80).nullable().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().max(100).nullable().optional(),
  district: z.string().max(100).nullable().optional(),
  admin1: z.string().max(100).nullable().optional(),
  admin2: z.string().max(100).nullable().optional(),
  postcode: z.string().max(20).nullable().optional(),
  feature_code: z.string().max(20).nullable().optional(),
});

export const PlacesResponseSchema = z.object({
  places: z.array(PlaceSchema).max(100),
});

export const PollutantSchema = z.object({
  key: z.enum([
    "pm2_5",
    "pm10",
    "ozone",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "carbon_monoxide",
  ]),
  label: z.string(),
  value: z.number().nullable(),
  unit: z.string(),
});

export const ForecastPointSchema = z.object({
  time: z.string(),
  aqi: z.number().nullable(),
});

export const AirQualitySchema = z.object({
  place_name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  source: z.string(),
  timestamp: z.string().nullable(),
  freshness: z.enum(["current", "stale", "unavailable"]),
  aqi: z.number().nullable(),
  aqi_category: z.string().nullable(),
  aqi_color: z.string().nullable(),
  pollutants: z.array(PollutantSchema),
  forecast: z.array(ForecastPointSchema),
  temperature_c: z.number().nullable(),
  humidity_percent: z.number().nullable(),
  wind_speed_kmh: z.number().nullable(),
});

export type Place = z.infer<typeof PlaceSchema>;
export type AirQuality = z.infer<typeof AirQualitySchema>;
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;

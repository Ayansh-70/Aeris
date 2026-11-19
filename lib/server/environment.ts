import { z } from "zod";
import type { Air } from "../domain";
import { memoized, providerJson, PublicError } from "./http";

const pollutants = {
  pm2_5: "PM2.5", pm10: "PM10", nitrogen_dioxide: "NO₂", ozone: "O₃",
  carbon_monoxide: "CO", sulphur_dioxide: "SO₂",
} as const;
const indices = Object.keys(pollutants).map((key) => "us_aqi_" + key);
const readings = z.record(z.string(), z.number().nullable());
const units = z.record(z.string(), z.string());
const seconds = z.number().int().min(0).max(4_102_444_800);
const currentSchema = readings.and(z.object({ time: seconds }));
const airSchema = z.object({
  current: currentSchema, current_units: units,
  timezone: z.string().max(80),
  hourly: z.object({ time: z.array(seconds).max(72), us_aqi: z.array(z.number().nullable()).max(72) }).optional(),
  hourly_units: units.optional(),
});
const weatherSchema = z.object({ current: currentSchema, current_units: units });
const iso = (epoch: number) => new Date(epoch * 1000).toISOString();
const isIndex = (value: number | null | undefined): value is number =>
  typeof value === "number" && value >= 0;
function validZone(zone: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: zone }); return zone; }
  catch { return "UTC"; }
}

export function normalizeAir(raw: unknown, weatherRaw: unknown): Air {
  const data = airSchema.safeParse(raw);
  if (!data.success) throw new PublicError(503, "Air quality data could not be verified.");
  const { current, current_units: unit, hourly, hourly_units } = data.data;
  const aqi = unit.us_aqi === "USAQI" && isIndex(current.us_aqi) ? Math.round(current.us_aqi) : null;
  const weather = weatherSchema.safeParse(weatherRaw);
  function condition(key: string, expected: string) {
    if (!weather.success || Math.abs(weather.data.current.time - current.time) > 7200) return null;
    return weather.data.current_units[key] === expected ? weather.data.current[key] ?? null : null;
  }
  const concentrations = Object.entries(pollutants).flatMap(([key, name]) => {
    const value = current[key];
    return isIndex(value) && unit[key]?.normalize("NFKC") === "μg/m3"
      ? [{ name, value, unit: "µg/m³" }] : [];
  });
  const dominant = Object.entries(pollutants).filter(([key]) => {
    const sub = "us_aqi_" + key;
    return aqi !== null && unit[sub] === "USAQI" && isIndex(current[sub]) && Math.round(current[sub]!) === aqi;
  }).map(([, label]) => label).join(" / ");
  return {
    aqi, sample: false, timestamp: iso(current.time), timezone: validZone(data.data.timezone),
    hourly: hourly && hourly.time.length === hourly.us_aqi.length && hourly_units?.us_aqi === "USAQI"
      ? hourly.time.flatMap((time, i) => isIndex(hourly.us_aqi[i])
        ? [{ time: iso(time), aqi: Math.round(hourly.us_aqi[i]!) }] : []) : [],
    pollutants: concentrations, ...(dominant ? { dominant } : {}),
    temperature: condition("temperature_2m", "°C"), humidity: condition("relative_humidity_2m", "%"),
    wind: condition("wind_speed_10m", "km/h"),
  };
}

export function sampleAir(): Air {
  const start = Date.UTC(2025, 0, 15, 2);
  const values = [164, 170, 175, 169, 155, 147, 141, 136, 131, 129, 133, 141,
    150, 159, 166, 173, 178, 181, 180, 177, 174, 173, 170, 168];
  return {
    sample: true, timezone: "Asia/Kolkata", timestamp: new Date(start).toISOString(),
    aqi: values[0], hourly: values.map((aqi, hour) => ({ time: new Date(start + hour * 3_600_000).toISOString(), aqi })),
    pollutants: Object.values(pollutants).map((name, i) => ({
      name, value: [78, 116, 23, 34, 720, 7][i], unit: "µg/m³",
    })),
    temperature: 14, wind: 7, humidity: 68,
  };
}

const cachedAir = memoized(600_000, async (key) => {
  const [latitude, longitude] = key.split(",");
  const air = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  air.search = new URLSearchParams({ latitude, longitude, current: ["us_aqi", ...Object.keys(pollutants), ...indices].join(","),
    hourly: "us_aqi", forecast_hours: "24", timeformat: "unixtime", timezone: "auto" }).toString();
  const weather = new URL("https://api.open-meteo.com/v1/forecast");
  weather.search = new URLSearchParams({ latitude, longitude, current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    timeformat: "unixtime", wind_speed_unit: "kmh" }).toString();
  const [raw, conditions] = await Promise.all([providerJson(air), providerJson(weather).catch(() => null)]);
  return normalizeAir(raw, conditions);
});

export type DataMode = "live" | "demo";
export function getAir(latitude: number, longitude: number, mode: DataMode): Promise<Air> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new PublicError(400, "Coordinates must be valid latitude and longitude values.");
  }
  return mode === "demo" ? Promise.resolve(sampleAir()) : cachedAir(latitude.toFixed(2) + "," + longitude.toFixed(2));
}

const location = z.object({
  name: z.string().min(1).max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  country: z.string().max(120).optional(), timezone: z.string().max(80).optional(),
});
export const geocode = memoized(3_600_000, async (query) => {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" }).toString();
  const data = z.object({ results: z.array(location).max(6).optional() }).safeParse(await providerJson(url));
  if (!data.success) throw new PublicError(503, "Location results could not be verified.");
  return (data.data.results ?? []).map((city) => ({ ...city, country: city.country ?? "", timezone: validZone(city.timezone ?? "UTC") }));
});


import type { Air } from "./model";

// AirNow's US AQI categories apply to the rounded, dimensionless index.
const bands = [
  [50, "Good"],
  [100, "Moderate"],
  [150, "Unhealthy for Sensitive Groups"],
  [200, "Unhealthy"],
  [300, "Very Unhealthy"],
  [Infinity, "Hazardous"],
] as const;
export function category(aqi: number | null | undefined): string {
  if (aqi == null || !Number.isFinite(aqi) || aqi < 0) return "Unavailable";
  return bands.find(([max]) => Math.round(aqi) <= max)![1];
}
export function isStale(timestamp: string, now = Date.now()) {
  const age = now - Date.parse(timestamp);
  return !Number.isFinite(age) || age > 3 * 3600_000 || age < -3600_000;
}
export function usableAir(air: Air | null, now = Date.now()): air is Air {
  return !!air && (air.sample || !isStale(air.timestamp, now));
}
export function currentIndex(air: Air | null, now = Date.now()): number | null {
  if (!usableAir(air, now) || category(air.aqi) === "Unavailable") return null;
  return Math.round(air.aqi!);
}

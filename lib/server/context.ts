import { z } from "zod";
import { category, indoorAdvice, isStale, planDay, profileSchema, recommendations } from "../domain";
import { getAir } from "./environment";

export const contextSchema = z.object({
  profile: profileSchema, mode: z.enum(["live", "demo"]).default("live"),
});

export async function buildContext(input: z.infer<typeof contextSchema>) {
  const { profile, mode } = input;
  const { latitude, longitude } = profile.location;
  const air = await getAir(latitude, longitude, mode).catch(() => null);
  const stale = !!air && !air.sample && isStale(air.timestamp);
  const usable = stale ? null : air;
  const conditions = air?.aqi == null ? "Current US AQI is unavailable."
    : (air.sample ? "Sample Data · " : stale ? "Stale model data · " : "CAMS via Open-Meteo · ") +
      "US AQI " + air.aqi + " (" + category(air.aqi) + ") at " + air.timestamp + ".";
  return { profile, air: usable, conditions, stale, actions: recommendations(profile, usable),
    indoor: indoorAdvice(profile, usable), plan: planDay(profile, usable) };
}
export type HouseholdContext = Awaited<ReturnType<typeof buildContext>>;


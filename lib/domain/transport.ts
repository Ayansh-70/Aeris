import type { Mode } from "./model";

export const factorSource =
  "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025";
// UK DESNZ 2025, Business travel–land, kg CO2e. Motor vehicles use vehicle-km;
// bus and rail already include the national fleet's average occupancy.
const factors: Record<Mode, number> = {
  Car: 0.16272,
  Carpool: 0.16272,
  Motorcycle: 0.11367,
  Bus: 0.10385,
  Rail: 0.03546,
  Walk: 0,
  Cycle: 0,
  Remote: 0,
};
export function compareTrips(
  baseline: Mode,
  alternative: Mode,
  distance: number,
  trips: number,
  occupancy = 2,
) {
  if (
    !Number.isFinite(distance) ||
    distance < 0 ||
    !Number.isSafeInteger(trips) ||
    trips < 0
  ) {
    throw new RangeError(
      "Enter a nonnegative distance and a whole number of one-way trips.",
    );
  }
  if (!Number.isInteger(occupancy) || occupancy < 2 || occupancy > 8) {
    throw new RangeError(
      "Select between two and eight carpool occupants, including the driver.",
    );
  }
  const factor = (mode: Mode) =>
    mode === "Carpool" ? factors.Car / occupancy : factors[mode];
  const baselineFactor = factor(baseline);
  const alternativeFactor = factor(alternative);
  const km = distance * trips;
  return {
    baseline: km * baselineFactor,
    alternative: km * alternativeFactor,
    savings: km * (baselineFactor - alternativeFactor),
    baselineFactor,
    alternativeFactor,
  };
}

export const challenges = [
  {
    id: "transit",
    title: "Public transport week",
    task: "Replace an available solo car trip with a bus or rail journey.",
    target: 5,
  },
  {
    id: "idling",
    title: "Idle-free pickup",
    task: "Switch the engine off while parked at pickup when it is safe to do so.",
    target: 3,
  },
  {
    id: "indoor",
    title: "A smoke-free evening",
    task: "Skip incense and candles for an evening and invite a neighbor to try it.",
    target: 5,
  },
  {
    id: "waste",
    title: "Keep smoke off your street",
    task: "Share a verified local waste collection option as an alternative to burning.",
    target: 1,
  },
] as const;

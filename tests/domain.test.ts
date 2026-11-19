import { describe, expect, it } from "vitest";
import {
  category,
  compareTrips,
  currentIndex,
  defaultProfile,
  indoorAdvice,
  isStale,
  planDay,
  profileSchema,
  recommendations,
  type Air,
} from "../lib/domain";

const timestamp = "2026-01-01T01:00:00Z";
const now = Date.parse(timestamp);
const air: Air = {
  aqi: 180,
  timestamp,
  timezone: "Asia/Kolkata",
  sample: true,
  pollutants: [],
  hourly: [],
  temperature: null,
  humidity: null,
  wind: null,
};

describe("US AQI and forecast integrity", () => {
  it.each([
    [0, "Good"],
    [50, "Good"],
    [51, "Moderate"],
    [100, "Moderate"],
    [101, "Unhealthy for Sensitive Groups"],
    [150, "Unhealthy for Sensitive Groups"],
    [151, "Unhealthy"],
    [200, "Unhealthy"],
    [201, "Very Unhealthy"],
    [300, "Very Unhealthy"],
    [301, "Hazardous"],
    [900, "Hazardous"],
    [50.7, "Moderate"],
    [null, "Unavailable"],
    [-1, "Unavailable"],
    [NaN, "Unavailable"],
  ] as const)("classifies %s as %s", (value, expected) =>
    expect(category(value)).toBe(expected),
  );
  it("rejects invalid, future and expired readings", () => {
    expect(isStale(timestamp, now + 3 * 3600000)).toBe(false);
    expect(isStale(timestamp, now + 3 * 3600000 + 1)).toBe(true);
    expect(isStale(timestamp, now - 2 * 3600000)).toBe(true);
    expect(isStale("broken", now)).toBe(true);
    expect(
      currentIndex({ ...air, sample: false }, now + 24 * 3600000),
    ).toBeNull();
    expect(currentIndex(null, now)).toBeNull();
  });
});

describe("local profile and recommendations", () => {
  it("round-trips a locally serialized profile", () => {
    expect(
      profileSchema.parse(JSON.parse(JSON.stringify(defaultProfile))),
    ).toEqual(defaultProfile);
  });
  it.each([
    { distance: -1 },
    { location: { name: "Delhi", latitude: 95, longitude: 10 } },
    { commute: "28:00" },
    { members: 0 },
    { goals: ["invented"] },
    { persona: "driver" },
  ])("rejects invalid preferences", (patch) => {
    expect(
      profileSchema.safeParse({ ...defaultProfile, ...patch }).success,
    ).toBe(false);
  });
  it("prioritizes safety at unhealthy levels and can use no-data guidance", () => {
    expect(recommendations(defaultProfile, air)[0].id).toBe("activity");
    expect(recommendations(defaultProfile, null)[0].title).toContain(
      "advisory",
    );
  });
  it("uses persona to rank recommendations on clear days", () => {
    const mild = { ...air, aqi: 30 };
    expect(recommendations(defaultProfile, mild)[0].focus).toBe("Indoor air");
    expect(
      recommendations({ ...defaultProfile, persona: "Organizer" }, mild)[0]
        .focus,
    ).toBe("Community");
    expect(
      recommendations(
        { ...defaultProfile, persona: "Commuter", goals: ["Reduce emissions"] },
        mild,
      )[0].focus,
    ).toBe("Emissions");
  });
  it("can prioritize sensitive household members at orange levels", () => {
    const orange = { ...air, aqi: 101 };
    expect(recommendations(defaultProfile, orange)[0].focus).toBe("Exposure");
    expect(
      recommendations({ ...defaultProfile, children: false }, orange)[0].focus,
    ).toBe("Indoor air");
  });
  it("respects equipment and no-purchase budgets", () => {
    expect(
      indoorAdvice(defaultProfile, air).map((item) => item.id),
    ).not.toContain("filter");
    expect(
      indoorAdvice({ ...defaultProfile, purifier: true }, air).some(
        (item) => item.id === "filter",
      ),
    ).toBe(true);
  });
});

describe("daily plan", () => {
  it("chooses a lower model hour in the location timezone outside fixed commitments", () => {
    const hourly = [
      { time: "2026-01-01T01:30:00Z", aqi: 45 }, // 07:00, before work
      { time: "2026-01-01T05:00:00Z", aqi: 10 }, // 10:30, at work
      { time: "2026-01-01T12:30:00Z", aqi: 25 }, // 18:00, after work
      { time: "2026-01-02T12:30:00Z", aqi: 5 },
    ]; // tomorrow
    const plan = planDay(defaultProfile, { ...air, hourly }, now);
    expect(plan.find((item) => item.id === "movement")?.time).toBe("18:00");
    expect(plan.find((item) => item.id === "commute")?.time).toBe(
      defaultProfile.commute,
    );
  });
  it("retains an indoor activity if all hours are polluted or missing", () => {
    for (const model of [
      null,
      air,
      { ...air, hourly: [{ time: "2026-01-01T12:30:00Z", aqi: 155 }] },
    ]) {
      expect(
        planDay(defaultProfile, model, now).find(
          (item) => item.id === "movement",
        )?.title,
      ).toContain("indoor");
    }
  });
});

describe("transport scenarios", () => {
  it("uses passenger-km factors once and computes signed savings", () => {
    const result = compareTrips("Car", "Bus", 10, 10);
    expect(result.baseline).toBeCloseTo(16.272);
    expect(result.alternative).toBeCloseTo(10.385);
    expect(result.savings).toBeCloseTo(5.887);
    expect(compareTrips("Rail", "Motorcycle", 10, 10).savings).toBeLessThan(0);
  });
  it("splits a pooled car across occupants only and scales to partial weeks", () => {
    expect(
      compareTrips("Carpool", "Rail", 10, 6, 4).baselineFactor,
    ).toBeCloseTo(0.16272 / 4);
    expect(compareTrips("Car", "Rail", 10, 6).savings).toBeCloseTo(
      compareTrips("Car", "Rail", 10, 10).savings * 0.6,
    );
  });
  it("handles zero distance, remote work and identical modes", () => {
    expect(compareTrips("Car", "Bus", 0, 5).savings).toBe(0);
    expect(compareTrips("Car", "Remote", 5, 1).alternative).toBe(0);
    expect(compareTrips("Rail", "Rail", 5, 2).savings).toBe(0);
  });
  it("rejects fractional trips and invalid occupancy", () => {
    expect(() => compareTrips("Car", "Bus", 8, 1.5)).toThrow();
    expect(() => compareTrips("Carpool", "Bus", 8, 10, 0)).toThrow();
  });
});

import { z } from "zod";

export const goals = [
  "Reduce exposure",
  "Reduce emissions",
  "Improve indoor air",
  "Protect sensitive members",
  "Save money",
  "Build sustainable habits",
] as const;
export const modes = [
  "Car",
  "Carpool",
  "Motorcycle",
  "Bus",
  "Rail",
  "Walk",
  "Cycle",
  "Remote",
] as const;
export type Mode = (typeof modes)[number];
export const personas = ["Family", "Commuter", "Organizer"] as const;
export const budgets = ["Low", "Moderate", "Flexible"] as const;
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const locationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type Location = z.infer<typeof locationSchema>;
export const profileSchema = z.object({
  location: locationSchema,
  persona: z.enum(personas),
  members: z.number().int().min(1).max(50),
  children: z.boolean(),
  olderAdults: z.boolean(),
  sensitive: z.boolean(),
  home: z.enum(["Apartment", "House"]),
  mode: z.enum(modes),
  distance: z.number().min(0).max(500),
  wake: clock,
  commute: clock,
  finish: clock,
  exercise: z.boolean(),
  exhaust: z.boolean(),
  windows: z.boolean(),
  purifier: z.boolean(),
  budget: z.enum(budgets),
  goals: z
    .array(z.string().refine((value) => goals.some((goal) => goal === value)))
    .max(goals.length),
});
export type Profile = z.infer<typeof profileSchema>;
export const defaultProfile: Profile = {
  location: { name: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  persona: "Family",
  members: 3,
  children: true,
  olderAdults: false,
  sensitive: false,
  home: "Apartment",
  mode: "Car",
  distance: 10,
  wake: "07:00",
  commute: "09:00",
  finish: "17:30",
  exercise: true,
  exhaust: false,
  windows: true,
  purifier: false,
  budget: "Low",
  goals: ["Reduce exposure", "Improve indoor air"],
};

export interface Air {
  aqi: number | null;
  timestamp: string;
  sample: boolean;
  timezone: string;
  hourly: { time: string; aqi: number }[];
  pollutants: { name: string; value: number; unit: string }[];
  dominant?: string;
  temperature: number | null;
  humidity: number | null;
  wind: number | null;
}
export interface Action {
  id: string;
  title: string;
  why: string;
  benefit: string;
  effort: string;
  cost: string;
  evidence: string;
  focus: "Exposure" | "Indoor air" | "Emissions" | "Community";
}

export function hasSensitiveMembers(profile: Profile) {
  return profile.sensitive || profile.children || profile.olderAdults;
}

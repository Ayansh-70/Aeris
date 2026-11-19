"use client";

import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";
import type { Air, Profile } from "@/lib/domain";

const stateEvent = "aeris:updated";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(stateEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(stateEvent, listener);
  };
}

export function localDay(timeZone?: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((part) => parts.find((p) => p.type === part)?.value)
    .join("-");
}

export function useDeviceValue<T>(
  key: string,
  schema: z.ZodType<T>,
  initial: T,
) {
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  let value = initial;
  if (raw) {
    try {
      const result = schema.safeParse(JSON.parse(raw));
      if (result.success) value = result.data;
    } catch {
      /* Recover from older or damaged local records. */
    }
  }
  function save(next: T) {
    try {
      localStorage.setItem(key, JSON.stringify(schema.parse(next)));
      window.dispatchEvent(new Event(stateEvent));
      return true;
    } catch {
      return false;
    }
  }
  return [value, save] as const;
}

export const progressSchema = z.array(z.string().max(100)).max(100);

export function planProgressKey(profile: Profile, air: Air | null) {
  return `aeris:plan-done:${profile.location.latitude},${profile.location.longitude}:${localDay(air?.timezone)}`;
}

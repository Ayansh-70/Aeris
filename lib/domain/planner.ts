import { activityAdvice, indoorAdvice } from "./advice";
import { currentIndex, usableAir } from "./air";
import { hasSensitiveMembers, type Air, type Profile } from "./model";

export interface PlanItem {
  id: string;
  time: string;
  title: string;
  why: string;
}

function localFormatter(timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}
function localTime(formatter: Intl.DateTimeFormat, instant: number) {
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    day: parts.year + "-" + parts.month + "-" + parts.day,
    clock: parts.hour + ":" + parts.minute,
  };
}
function minutes(clock: string) {
  const [hour, minute] = clock.split(":").map(Number);
  return hour * 60 + minute;
}

function activitySlot(
  profile: Profile,
  air: Air | null,
  now: number,
): PlanItem {
  const backup = {
    id: "movement",
    time: profile.finish,
    title: "Plan a gentle indoor activity",
    why: "No suitable outdoor forecast hour was found within your free time. Choose a cleaner indoor room.",
  };
  if (!profile.exercise || !usableAir(air, now)) return backup;
  const instant = air.sample ? Date.parse(air.timestamp) : now;
  const formatter = localFormatter(air.timezone);
  const today = localTime(formatter, instant).day;
  const commute = minutes(profile.commute),
    finish = minutes(profile.finish);
  const suitable = air.hourly
    .flatMap((point) => {
      const stamp = Date.parse(point.time);
      if (
        !Number.isFinite(stamp) ||
        stamp < instant ||
        !Number.isFinite(point.aqi) ||
        point.aqi < 0
      )
        return [];
      const { day, clock } = localTime(formatter, stamp);
      const time = minutes(clock);
      // Reserve half an hour before departure. Permit a short after-work slot.
      const occupied =
        finish >= commute
          ? time >= commute - 30 && time < finish + 30
          : time >= commute - 30 || time < finish + 30;
      if (
        day !== today ||
        time < minutes(profile.wake) ||
        time >= 21 * 60 ||
        occupied
      )
        return [];
      return [{ clock, aqi: Math.round(point.aqi) }];
    })
    .sort((a, b) => a.aqi - b.aqi || a.clock.localeCompare(b.clock));
  const best = suitable[0];
  if (!best || best.aqi > (hasSensitiveMembers(profile) ? 50 : 100))
    return backup;
  return {
    id: "movement",
    time: best.clock,
    title: "Consider a short outdoor activity",
    why: `This available hour has a modeled US AQI of ${best.aqi}. Recheck before you go and choose a route away from traffic.`,
  };
}

export function planDay(
  profile: Profile,
  air: Air | null,
  now = Date.now(),
): PlanItem[] {
  const outdoor = activityAdvice(profile, currentIndex(air, now));
  const indoor = indoorAdvice(profile, air, now);
  const cooking = indoor.find((item) => item.id === "cooking")!;
  const ventilation = indoor.find((item) => item.id === "windows")!;
  const away = profile.mode !== "Remote";
  const timeline = [
    {
      id: "morning",
      time: profile.wake,
      title: outdoor.title,
      why: outdoor.why,
    },
    {
      id: "commute",
      time: profile.commute,
      title: away
        ? "Keep your usual departure"
        : "Start your work-from-home day",
      why: away
        ? `Keep the fixed ${profile.mode.toLowerCase()} commute. Where feasible, wait away from idling vehicles and busy junctions.`
        : "Working at home avoids commute travel. Combine other errands when practical.",
    },
    {
      id: "windows",
      time: profile.wake,
      title: ventilation.title,
      why: ventilation.why + " " + ventilation.benefit,
    },
    {
      id: "evening",
      time: profile.finish,
      title: cooking.title,
      why: cooking.benefit,
    },
    {
      id: "habit",
      time: profile.finish,
      title:
        profile.persona === "Organizer"
          ? "Invite a neighbor to the idle-free challenge"
          : "Combine tomorrow’s errands",
      why:
        profile.persona === "Organizer"
          ? "Share one practical action for the next pickup period."
          : "Group stops along an existing route to avoid a separate motorized trip.",
    },
  ];
  if (profile.exercise) timeline.push(activitySlot(profile, air, now));
  return timeline.sort((a, b) => a.time.localeCompare(b.time));
}

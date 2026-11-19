import { currentIndex } from "./air";
import {
  hasSensitiveMembers,
  type Profile,
  type Air,
  type Action,
} from "./model";

function action(
  id: string,
  title: string,
  why: string,
  benefit: string,
  focus: Action["focus"],
  details: Partial<Pick<Action, "cost" | "effort" | "evidence">> = {},
): Action {
  return {
    id,
    title,
    why,
    benefit,
    focus,
    cost: "No purchase",
    effort: "Easy",
    evidence: "Public-health guidance",
    ...details,
  };
}

export function activityAdvice(profile: Profile, aqi: number | null): Action {
  const sensitive = hasSensitiveMembers(profile);
  const focus = "Exposure";
  if (aqi === null)
    return action(
      "activity",
      "Check the local advisory first",
      "A current outdoor US AQI is unavailable for your area.",
      "Choose an indoor backup until conditions can be checked.",
      focus,
    );
  if (aqi > 300)
    return action(
      "activity",
      "Move physical activity indoors",
      "The outdoor index is hazardous. Follow official local alerts and use a cleaner indoor space.",
      "Avoid breathing heavily outdoors while pollution is extreme.",
      focus,
    );
  if (aqi > 200 || (aqi > 150 && sensitive))
    return action(
      "activity",
      profile.children
        ? "Move active play indoors"
        : "Keep strenuous exercise indoors",
      sensitive
        ? "Someone in your household may be more sensitive to the current pollution."
        : "The outdoor index is very unhealthy for everyone.",
      "Reduce time spent breathing heavily in polluted outdoor air.",
      focus,
    );
  if (aqi > 150 || (aqi > 100 && sensitive))
    return action(
      "activity",
      "Shorten strenuous outdoor activity",
      sensitive
        ? "Children, older adults and other sensitive members can be affected at this level."
        : "The index is unhealthy even for adults without known sensitivities.",
      "Take more breaks and choose a lighter activity to reduce inhaled pollution.",
      focus,
    );
  if (aqi > 100 || (aqi > 50 && sensitive))
    return action(
      "activity",
      "Keep an indoor backup",
      "The regional model cannot capture every street or individual sensitivity.",
      "Scale back exertion if conditions worsen or anyone feels uncomfortable.",
      focus,
    );
  return action(
    "activity",
    "Check conditions before heading out",
    "Your area’s index allows more flexibility. Busy roads can still have higher concentrations.",
    "Choose a quieter route for outdoor time.",
    focus,
  );
}

export function indoorAdvice(
  profile: Profile,
  air: Air | null,
  now = Date.now(),
): Action[] {
  const aqi = currentIndex(air, now);
  const windowAdvice =
    aqi === null
      ? "Check outdoor conditions before airing out"
      : aqi > 100
        ? "Time ventilation around outdoor pollution"
        : "Air out when local conditions allow";
  const ventilation = action(
    "windows",
    windowAdvice,
    aqi === null
      ? "Outdoor data is missing or stale, so a cleaner hour cannot be identified."
      : aqi > 100
        ? "When outdoor air is polluted, open windows can let particles inside. Air out when conditions improve."
        : "Outdoor air can help clear cooking odors and moisture when surrounding air is cleaner.",
    "Keep required ventilation clear. Heat, smoke inside and combustion appliances also affect when to ventilate.",
    "Indoor air",
  );
  const cooking = action(
    "cooking",
    profile.exhaust
      ? "Use the kitchen exhaust while cooking"
      : "Choose a lower-smoke cooking method",
    profile.exhaust
      ? "A hood that vents outdoors helps remove cooking particles at their source."
      : "High-heat frying and charring generate particles inside your home.",
    profile.exhaust
      ? "Switch on the hood during cooking. Check whether yours vents outdoors or recirculates."
      : "Steam or simmer a meal when practical, and keep required kitchen ventilation available.",
    "Indoor air",
  );
  const sources = action(
    "sources",
    "Skip incense and scented candles",
    `Burning indoors adds particles to the air in your ${profile.home.toLowerCase()}.`,
    "Removing a smoke source can improve indoor air without buying equipment.",
    "Indoor air",
  );
  const filtration = profile.purifier
    ? action(
        "filter",
        "Run your purifier in the occupied room",
        "A correctly sized particulate filter can lower airborne particle levels in that room.",
        "Check filter condition and follow the manufacturer’s settings and replacement schedule.",
        "Indoor air",
        { cost: "Running cost" },
      )
    : action(
        "filter",
        "Check room size before choosing filtration",
        "A portable HEPA unit’s clean-air delivery rate needs to match the occupied room.",
        "Correct sizing helps reduce airborne particles. Allow for replacement filters and electricity.",
        "Indoor air",
        { cost: "Purchase", effort: "Some planning" },
      );
  const cleaning = action(
    "cleaning",
    "Damp-wipe settled dust",
    "Dry sweeping can lift settled particles back into the air.",
    "Use a damp cloth or mop on suitable surfaces.",
    "Indoor air",
  );
  const cards =
    profile.windows && aqi !== null && aqi > 100
      ? [ventilation, sources, cooking]
      : [sources, cooking, ventilation];
  return [
    ...cards,
    ...(profile.purifier || profile.budget !== "Low" ? [filtration] : []),
    cleaning,
  ];
}

export function recommendations(profile: Profile, air: Air | null): Action[] {
  const aqi = currentIndex(air);
  const sensitive = hasSensitiveMembers(profile);
  const indoor = indoorAdvice(profile, air)[0];
  const commute = action(
    "commute",
    profile.mode === "Remote"
      ? "Combine errands on your next outing"
      : "Compare your next commute",
    profile.mode === "Remote"
      ? "Your usual workday avoids a trip. Grouping other stops can reduce driving distance."
      : `For your ${profile.distance} km ${profile.mode.toLowerCase()} trip, compare a feasible alternative before leaving.`,
    "Estimate greenhouse gas emissions separately from time spent beside busy roads.",
    "Emissions",
    { evidence: "Transport scenario", effort: "Some planning" },
  );
  const community = action(
    "community",
    "Organize an idle-free pickup",
    "Waiting vehicles can add exhaust where neighbors gather.",
    "Invite drivers to switch off while safely parked.",
    "Community",
    { evidence: "Source reduction", effort: "Some planning" },
  );
  const outdoor = activityAdvice(profile, aqi);
  const priorityOutdoor = aqi === null || aqi > 150 || (sensitive && aqi > 100);
  const scores = [
    {
      item: outdoor,
      rank: priorityOutdoor
        ? 100
        : 35 +
          (profile.goals.includes("Reduce exposure") ? 12 : 0) +
          (sensitive && profile.goals.includes("Protect sensitive members")
            ? 15
            : 0),
    },
    {
      item: indoor,
      rank:
        40 +
        (profile.persona === "Family" ? 12 : 0) +
        (profile.goals.includes("Improve indoor air") ? 12 : 0) +
        (profile.budget === "Low" ? 5 : 0),
    },
    {
      item: commute,
      rank:
        30 +
        (profile.persona === "Commuter" ? 30 : 0) +
        (profile.goals.includes("Reduce emissions") ? 12 : 0) +
        (profile.goals.includes("Save money") ? 7 : 0),
    },
    {
      item: community,
      rank:
        15 +
        (profile.persona === "Organizer" ? 63 : 0) +
        (profile.goals.includes("Build sustainable habits") ? 5 : 0),
    },
  ];
  return scores.sort((a, b) => b.rank - a.rank).map((entry) => entry.item);
}

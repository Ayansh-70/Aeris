"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  SlidersHorizontal,
  Wind,
} from "lucide-react";
import { z } from "zod";
import { currentIndex, indoorAdvice, planDay } from "@/lib/domain";
import { FeatureHeading, Place, type FeatureProps } from "./shared";
import {
  localDay,
  planProgressKey,
  progressSchema,
  useDeviceValue,
} from "./storage";

const savedPlanSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string(),
        time: z.string(),
        title: z.string(),
        why: z.string(),
      }),
    )
    .max(30),
  profileSignature: z.string(),
  forecastSignature: z.string(),
  savedAt: z.string(),
  sample: z.boolean(),
});
type SavedPlan = z.infer<typeof savedPlanSchema>;
const optionalPlan = savedPlanSchema.nullable();

export function Planner({ profile, air }: FeatureProps) {
  const day = localDay(air?.timezone);
  const progressKey = planProgressKey(profile, air);
  const [done, setDone] = useDeviceValue(progressKey, progressSchema, []);
  const [saved, setSaved] = useDeviceValue<SavedPlan | null>(
    progressKey.replace("plan-done", "plan"),
    optionalPlan,
    null,
  );
  const [notice, setNotice] = useState("");
  const [rebuild, setRebuild] = useState(false);
  const signature = JSON.stringify(profile);
  const forecastSignature = JSON.stringify([
    air?.timestamp,
    currentIndex(air),
    air?.hourly,
  ]);
  const stored =
    !rebuild &&
    saved?.profileSignature === signature &&
    saved.forecastSignature === forecastSignature &&
    saved.sample === Boolean(air?.sample)
      ? saved
      : null;
  const steps = stored?.steps ?? planDay(profile, air);
  const completed = steps.filter((step) => done.includes(step.id)).length;
  function change(ids: string[]) {
    if (!setDone(ids))
      setNotice(
        "Browser storage is unavailable. Your progress could not be saved.",
      );
  }
  function save() {
    const ok = setSaved({
      steps,
      profileSignature: signature,
      forecastSignature,
      savedAt: new Date().toISOString(),
      sample: Boolean(air?.sample),
    });
    if (ok) setRebuild(false);
    setNotice(
      ok
        ? "Daily plan saved on this device."
        : "Your browser could not save this plan.",
    );
  }
  return (
    <div className="page ft-page">
      <FeatureHeading
        title="Daily planner"
        description="A practical routine built around your household and the outdoor forecast."
      >
        <Place profile={profile} />
      </FeatureHeading>
      <div className="ft-summary">
        <CalendarDays />
        <div>
          <strong>{day}</strong>
          <small>
            {stored ? "Saved plan" : "Suggested plan"} · {completed} of{" "}
            {steps.length} actions completed
          </small>
        </div>
      </div>
      <div className="ft-row">
        <button className="ft-btn" onClick={save}>
          <Bookmark size={16} />
          Save plan
        </button>
        <button
          className="ft-secondary"
          onClick={() => {
            setRebuild(true);
            setNotice(
              "Plan regenerated using the current profile and forecast.",
            );
          }}
        >
          <RefreshCw size={16} />
          Regenerate
        </button>
        <Link className="ft-secondary" href="/onboarding">
          <SlidersHorizontal size={16} />
          Edit preferences
        </Link>
      </div>
      <ol className="ft-timeline">
        {steps.map((step) => (
          <li className="ft-panel" key={step.id}>
            <span className="ft-time">
              <Clock3 size={14} />
              {step.time}
            </span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.why}</p>
            </div>
            <label className="ft-step-check">
              <input
                aria-label={`Mark ${step.title} complete`}
                type="checkbox"
                checked={done.includes(step.id)}
                onChange={(e) =>
                  change(
                    e.target.checked
                      ? [...done, step.id]
                      : done.filter((id) => id !== step.id),
                  )
                }
              />
              <span>Done</span>
            </label>
          </li>
        ))}
      </ol>
      <button
        className="ft-secondary"
        disabled={!done.length}
        onClick={() => {
          change([]);
        }}
      >
        Reset daily progress
      </button>
      <p className="ft-status" role="status">
        {notice}
      </p>
    </div>
  );
}

export function Indoor({ profile, air }: FeatureProps) {
  const actions = indoorAdvice(profile, air);
  const [saved, setSaved] = useDeviceValue(
    "aeris:indoor-saved",
    progressSchema,
    [],
  );
  const [notice, setNotice] = useState("");
  return (
    <div className="page ft-page">
      <FeatureHeading
        title="Indoor air advisor"
        description="Manage cooking emissions, ventilation and particle sources in your home."
      >
        <Place profile={profile} />
      </FeatureHeading>
      <div className="ft-summary">
        <Wind />
        <div>
          <strong>
            {profile.home} · {profile.budget.toLowerCase()} budget
          </strong>
          <small>
            {profile.purifier
              ? "Portable purifier available"
              : "No portable purifier"}{" "}
            ·{" "}
            {profile.exhaust
              ? "Kitchen exhaust available"
              : "No kitchen exhaust"}
          </small>
        </div>
      </div>
      <div className="ft-card-grid">
        {actions.map((action) => (
          <article className="ft-panel ft-stack" key={action.id}>
            <div className="ft-row">
              <span className="ft-tag">{action.focus}</span>
            </div>
            <h2>{action.title}</h2>
            <p>{action.why}</p>
            <p className="ft-benefit">
              <CheckCircle2 size={16} />
              {action.benefit}
            </p>
            <dl className="ft-facts">
              <div>
                <dt>Cost</dt>
                <dd>{action.cost}</dd>
              </div>
              <div>
                <dt>Effort</dt>
                <dd>{action.effort}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{action.evidence}</dd>
              </div>
            </dl>
            <button
              className="ft-secondary"
              aria-pressed={saved.includes(action.id)}
              onClick={() => {
                const ok = setSaved(
                  saved.includes(action.id)
                    ? saved.filter((id) => id !== action.id)
                    : [...saved, action.id],
                );
                setNotice(
                  ok
                    ? "Saved actions updated."
                    : "Your browser could not save this action.",
                );
              }}
            >
              <Bookmark size={15} />
              {saved.includes(action.id) ? "Saved action" : "Save action"}
            </button>
          </article>
        ))}
      </div>
      <p className="ft-muted">
        Outdoor estimates cannot measure indoor concentrations. Consider indoor
        smoke, cooking and ventilation needs when deciding when to open windows.
      </p>
      <p role="status">{notice}</p>
    </div>
  );
}

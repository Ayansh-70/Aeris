"use client";

import { useState } from "react";
import { ClipboardCopy, Flag, UsersRound } from "lucide-react";
import { z } from "zod";
import { challenges, compareTrips, factorSource } from "@/lib/domain";
import { FeatureHeading, Field, Place, type FeatureProps } from "./shared";
import { localDay, useDeviceValue } from "./storage";

const registrations = z.record(
  z.string(),
  z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366),
);
type Progress = z.infer<typeof registrations>;

export default function Community({ profile, air }: FeatureProps) {
  const [progress, save] = useDeviceValue<Progress>(
    "aeris:community",
    registrations,
    {},
  );
  const [people, setPeople] = useState(5);
  const [notice, setNotice] = useState("");
  const [shareText, setShareText] = useState("");
  const today = localDay(air?.timezone);
  const estimate = compareTrips("Car", "Bus", profile.distance, 2);
  function update(id: string, days: string[]) {
    const ok = save({ ...progress, [id]: days });
    setNotice(
      ok
        ? "Challenge progress saved on this device."
        : "Your browser could not save challenge progress.",
    );
  }
  async function copy() {
    const summary = challenges
      .filter((c) => progress[c.id])
      .map(
        (c) =>
          c.title + " (" + progress[c.id].length + "/" + c.target + " days)",
      )
      .join(", ");
    const text = `My clean-air challenges in ${profile.location.name}: ${summary || "exploring challenges"}. Pick one action with your household and track it locally in VayuGuard AI.`;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Challenge summary copied.");
    } catch {
      setShareText(text);
      setNotice("Select and copy your summary below.");
    }
  }
  return (
    <div className="page ft-page">
      <FeatureHeading
        title="Community actions"
        description="Take part in neighborhood challenges and track your own actions on this device."
      >
        <Place profile={profile} />
      </FeatureHeading>
      <div className="ft-summary">
        <Flag />
        <div>
          <strong>{Object.keys(progress).length} challenges joined</strong>
          <small>
            Personal tracker ·{" "}
            {Object.values(progress).reduce(
              (sum, days) => sum + days.length,
              0,
            )}{" "}
            completed action-days
          </small>
        </div>
        <button className="ft-secondary" onClick={copy}>
          <ClipboardCopy size={15} />
          Copy summary
        </button>
      </div>
      {shareText && (
        <Field label="Shareable summary">
          <textarea readOnly value={shareText} />
        </Field>
      )}
      <div className="ft-card-grid">
        {challenges.map((challenge) => {
          const days = progress[challenge.id];
          const complete = Boolean(days && days.length >= challenge.target);
          return (
            <article className="ft-panel ft-stack" key={challenge.id}>
              <span className="ft-tag">{challenge.target}-day challenge</span>
              <h2>{challenge.title}</h2>
              <p>{challenge.task}</p>
              {days && (
                <div>
                  <small>
                    {days.length} of {challenge.target} days logged
                  </small>
                  <progress
                    aria-label={`${challenge.title} progress`}
                    value={days.length}
                    max={challenge.target}
                  />
                </div>
              )}
              {!days ? (
                <button
                  className="ft-secondary"
                  onClick={() => update(challenge.id, [])}
                >
                  Join challenge
                </button>
              ) : (
                <button
                  className="ft-secondary"
                  disabled={complete || days.includes(today)}
                  onClick={() => update(challenge.id, [...days, today])}
                >
                  {complete
                    ? "Challenge complete"
                    : days.includes(today)
                      ? "Logged today"
                      : "Log today’s action"}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <p className="ft-status" role="status">
        {notice}
      </p>
      <section className="ft-panel ft-stack">
        <span className="ft-icon">
          <UsersRound size={20} />
        </span>
        <h2>Model a neighborhood commute</h2>
        <p>
          What if each participant replaced one round trip by solo car with a
          bus ride?
        </p>
        <Field label={`Hypothetical participants · ${people}`}>
          <input
            type="range"
            min="1"
            max="100"
            value={people}
            onChange={(e) => setPeople(Number(e.target.value))}
          />
        </Field>
        <div className="ft-stat" aria-live="polite">
          <strong>
            {(estimate.savings * people).toFixed(2)} kg CO₂e estimated saving
          </strong>
          <small>
            {profile.distance} km × 2 trips × ({estimate.baselineFactor} −{" "}
            {estimate.alternativeFactor}) kg CO₂e/passenger-km × {people} people
          </small>
        </div>
        <p className="ft-muted">
          Hypothetical participation uses UK average emission factors. Actual
          neighborhood participation and savings are unknown.{" "}
          <a href={factorSource} target="_blank" rel="noreferrer">
            Factor source ↗
          </a>
        </p>
      </section>
    </div>
  );
}

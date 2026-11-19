"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check as Done } from "lucide-react";
import { goals, modes, profileSchema, type Profile } from "@/lib/domain";
import { Check, FeatureHeading, Field, type FeatureProps } from "./shared";
import LocationPicker from "./LocationPicker";

const steps = ["Location", "Household", "Lifestyle", "Goals"] as const;
const personas = ["Family", "Commuter", "Organizer"] as const;
const personaLabels = {
  Family: "Urban family",
  Commuter: "Student or professional",
  Organizer: "Community organizer",
};

export function ProfileForm({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: (profile: Profile) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Profile>(profile);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function next(event: React.FormEvent) {
    event.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      setError("");
      return;
    }
    const result = profileSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues.map((issue) => issue.message).join(" "));
      return;
    }
    try {
      setProfile(result.data);
      router.push("/dashboard");
    } catch {
      setError(
        "Your browser could not save the profile. Allow local storage and try again.",
      );
    }
  }
  return (
    <div className="page ft-page">
      <FeatureHeading
        title="Your household profile"
        description="Shape your clean-air plan around where and how you live."
      />
      <div className="ft-wizard">
        <ol aria-label="Profile setup steps" className="ft-steps">
          {steps.map((name, index) => (
            <li aria-current={step === index ? "step" : undefined} key={name}>
              <span>{step > index ? <Done size={14} /> : index + 1}</span>
              {name}
            </li>
          ))}
        </ol>
        <form className="ft-panel ft-stack" onSubmit={next}>
          <h2>
            {
              [
                "Where do you live?",
                "Who is the plan for?",
                "What does your day look like?",
                "What matters most?",
              ][step]
            }
          </h2>
          {step === 0 && (
            <LocationPicker
              location={draft.location}
              onChange={(value) => update("location", value)}
            />
          )}
          {step === 1 && (
            <>
              <fieldset>
                <legend>Plan for</legend>
                <div className="ft-row">
                  {personas.map((persona) => (
                    <label className="ft-choice" key={persona}>
                      <input
                        type="radio"
                        name="persona"
                        checked={draft.persona === persona}
                        onChange={() => update("persona", persona)}
                      />
                      {personaLabels[persona]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="ft-grid">
                <Field label="Household members">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={draft.members || ""}
                    onChange={(e) => update("members", Number(e.target.value))}
                  />
                </Field>
                <Field label="Home type">
                  <select
                    value={draft.home}
                    onChange={(e) =>
                      update("home", e.target.value as Profile["home"])
                    }
                  >
                    <option>Apartment</option>
                    <option>House</option>
                  </select>
                </Field>
              </div>
              <fieldset>
                <legend>Household considerations</legend>
                <div className="ft-stack ft-tight">
                  {(
                    [
                      ["children", "Children live here"],
                      ["olderAdults", "Older adults live here"],
                      ["sensitive", "Someone is sensitive to air pollution"],
                    ] as const
                  ).map(([key, label]) => (
                    <Check
                      key={key}
                      label={label}
                      checked={draft[key]}
                      onChange={(value) => update(key, value)}
                    />
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {step === 2 && (
            <>
              <div className="ft-grid">
                <Field label="Usual transport">
                  <select
                    value={draft.mode}
                    onChange={(e) =>
                      update("mode", e.target.value as Profile["mode"])
                    }
                  >
                    {modes.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </Field>
                <Field label="One-way distance (km)">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="300"
                    required
                    value={draft.distance}
                    onChange={(e) => update("distance", Number(e.target.value))}
                  />
                </Field>
              </div>
              <div className="ft-grid ft-three">
                {(
                  [
                    ["wake", "Wake-up time"],
                    ["commute", "Commute starts"],
                    ["finish", "Work or school ends"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      type="time"
                      required
                      value={draft[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <div className="ft-grid">
                {(
                  [
                    ["exercise", "I enjoy outdoor exercise"],
                    ["exhaust", "My kitchen has an exhaust fan"],
                    ["windows", "I usually keep windows open"],
                    ["purifier", "I have a portable air purifier"],
                  ] as const
                ).map(([key, label]) => (
                  <Check
                    key={key}
                    label={label}
                    checked={draft[key]}
                    onChange={(v) => update(key, v)}
                  />
                ))}
              </div>
              <Field label="Budget for indoor improvements">
                <select
                  value={draft.budget}
                  onChange={(e) =>
                    update("budget", e.target.value as Profile["budget"])
                  }
                >
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>Flexible</option>
                </select>
              </Field>
            </>
          )}
          {step === 3 && (
            <fieldset>
              <legend>Choose the goals you’d like to prioritize</legend>
              <div className="ft-grid">
                {goals.map((goal) => (
                  <Check
                    key={goal}
                    label={goal}
                    checked={draft.goals.includes(goal)}
                    onChange={(checked) =>
                      update(
                        "goals",
                        checked
                          ? [...draft.goals, goal]
                          : draft.goals.filter((value) => value !== goal),
                      )
                    }
                  />
                ))}
              </div>
            </fieldset>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="ft-form-actions">
            {step > 0 && (
              <button
                className="ft-secondary"
                type="button"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button type="submit" className="ft-btn">
              {step === 3 ? "Save my profile" : "Continue"}{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Settings({ profile, demo, setDemo, clearData }: FeatureProps) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page ft-page">
      <FeatureHeading
        title="Settings"
        description="Manage your household profile, data source and device storage."
      />
      <section className="ft-panel ft-stack">
        <h2>Household profile</h2>
        <p>
          {profile.persona} · {profile.location.name} · {profile.members}{" "}
          household {profile.members === 1 ? "member" : "members"}
        </p>
        <button
          className="ft-secondary"
          onClick={() => router.push("/onboarding")}
        >
          Edit preferences
        </button>
      </section>
      <section className="ft-panel ft-stack">
        <h2>Environmental data</h2>
        <Check
          label="Use sample data for an offline demonstration"
          checked={demo}
          onChange={setDemo}
        />
        <p className="ft-muted">
          Live mode requests modeled outdoor conditions from Open-Meteo. Sample
          mode uses an illustrative scenario.
        </p>
      </section>
      <section className="ft-panel ft-stack">
        <h2>Privacy and storage</h2>
        <p>
          Your profile, saved plan and challenge progress stay in this browser.
          Location coordinates are sent to request local conditions. Questions
          and relevant household context go to the server, and to the configured
          AI provider when enabled. Avoid entering medical or identifying
          details.
        </p>
        {confirm ? (
          <div>
            <p>
              Clear your profile, plans, completed actions and challenge history
              on this device?
            </p>
            <div className="ft-row">
              <button
                className="ft-danger"
                onClick={() => {
                  clearData();
                  setConfirm(false);
                  router.push("/onboarding");
                }}
              >
                Clear device data
              </button>
              <button
                className="ft-secondary"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="ft-secondary" onClick={() => setConfirm(true)}>
            Clear local data
          </button>
        )}
      </section>
    </div>
  );
}

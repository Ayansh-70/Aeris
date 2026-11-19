"use client";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Droplets,
  House,
  MessagesSquare,
  Route,
  Thermometer,
  Users,
  Wind,
} from "lucide-react";
import { recommendations, planDay } from "@/lib/domain";
import { useWorkspace } from "./Workspace";
import { AirFailure, Attribution, useReading } from "./AirStatus";
import { Trend } from "./Trend";
import {
  planProgressKey,
  progressSchema,
  useDeviceValue,
} from "./features/storage";
const quick = [
  ["/assistant", "Ask Vayu", MessagesSquare],
  ["/planner", "Build my day", CalendarDays],
  ["/indoor-air", "Indoor air", House],
  ["/transport", "Compare transport", Route],
  ["/community", "Community actions", Users],
] as const;
const severity: Record<string, string> = {
  Good: "#bce6c4",
  Moderate: "#f7df9b",
  "Unhealthy for Sensitive Groups": "#ffcca4",
  Unhealthy: "#ffb6b1",
  "Very Unhealthy": "#d9bbe9",
  Hazardous: "#e9b6ce",
};
export function Dashboard() {
  const { air, profile, loading, refresh } = useWorkspace();
  const reading = useReading();
  const actions = recommendations(profile, air);
  const safety = actions.find((action) => action.id === "activity");
  const [completed] = useDeviceValue(
    planProgressKey(profile, air),
    progressSchema,
    [],
  );
  const [saved, setSaved] = useDeviceValue(
    "aeris:saved-actions",
    progressSchema,
    [],
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div className="eyebrow">
          <span /> ENVIRONMENTAL INTELLIGENCE
        </div>
        <h1>
          Air dashboard<span>.</span>
        </h1>
        <p>Your household briefing for {profile.location.name}.</p>
      </div>
      <AirFailure />
      <div className="dash-grid">
        <section className="reading panel">
          <div className="panel-label">
            <Activity size={17} />
            CURRENT AIR QUALITY
          </div>
          <div className="reading-value">
            {reading.value}
            <small>US AQI</small>
          </div>
          <b
            className="severity"
            style={{ background: severity[reading.label] || "#dee5df" }}
          >
            {reading.label}
          </b>
          <p>
            {reading.source}
            {air &&
              " · " +
                new Date(air.timestamp).toLocaleString("en-GB", {
                  timeZone: air.timezone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }) +
                " " +
                air.timezone}
          </p>
          {air?.dominant && <p>Dominant pollutant · {air.dominant}</p>}
          <button className="quiet" disabled={loading} onClick={refresh}>
            {loading ? "Fetching…" : "Refresh reading"}
          </button>
        </section>
        <section className="panel">
          <div className="panel-label">
            <Wind size={17} />
            HOURLY FORECAST
          </div>
          <h2>Air quality trend</h2>
          {air ? (
            <Trend air={air} />
          ) : (
            <p role="status">
              {loading
                ? "Loading hourly forecast…"
                : "Hourly forecast unavailable."}
            </p>
          )}
        </section>
      </div>
      {air && (
        <>
          <div className="conditions">
            {[
              [Thermometer, "Temperature", air.temperature, "°C"],
              [Droplets, "Humidity", air.humidity, "%"],
              [Wind, "Wind speed", air.wind, "km/h"],
            ].map(([Icon, name, value, unit]) => {
              const Glyph = Icon as typeof Wind;
              return (
                <div key={String(name)}>
                  <Glyph size={18} />
                  {String(name)}{" "}
                  <b>
                    {typeof value === "number"
                      ? value + " " + unit
                      : "Unavailable"}
                  </b>
                </div>
              );
            })}
          </div>
          <section className="panel">
            <h2>Pollutant breakdown</h2>
            <div className="pollutants">
              {air.pollutants.map((p) => (
                <div key={p.name}>
                  <small>{p.name}</small>
                  <b>
                    {p.value} <em>{p.unit}</em>
                  </b>
                </div>
              ))}
            </div>
            {!air.pollutants.length && (
              <p>Individual pollutant values are unavailable.</p>
            )}
          </section>
        </>
      )}
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span /> PERSONAL GUIDANCE
          </div>
          <h2>Today’s priorities</h2>
        </div>
        <Link className="quiet" href="/onboarding">
          Edit profile
        </Link>
      </div>
      {safety && (
        <p className="guide-summary">
          <strong>{safety.title}.</strong> {safety.why} {safety.benefit}
        </p>
      )}
      <div className="feature-grid">
        {actions.slice(0, 3).map((a) => (
          <article className="feature-card" key={a.id}>
            <div className="eyebrow">{a.focus}</div>
            <h3>{a.title}</h3>
            <p>{a.why}</p>
            <p>{a.benefit}</p>
            <small>
              {a.effort} effort · {a.cost} · {a.evidence}
            </small>
            <button
              className="quiet"
              aria-pressed={saved.includes(a.id)}
              onClick={() =>
                setSaved(
                  saved.includes(a.id)
                    ? saved.filter((id) => id !== a.id)
                    : [...saved, a.id],
                )
              }
            >
              {saved.includes(a.id) ? "Saved · remove" : "Save action"}
            </button>
          </article>
        ))}
      </div>
      <div className="brief-band">
        <CalendarDays />
        <div>
          <h3>Household actions</h3>
          <p>
            {saved.length} saved recommendations ·{" "}
            {
              planDay(profile, air).filter((step) =>
                completed.includes(step.id),
              ).length
            }{" "}
            plan steps completed today
          </p>
        </div>
        <Link className="secondary" href="/planner">
          View plan
        </Link>
      </div>
      <div className="quick-links">
        {quick.map(([url, label, Icon]) => (
          <Link href={url} key={url}>
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </div>
      <Attribution />
    </div>
  );
}

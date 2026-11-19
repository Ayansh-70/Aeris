"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useDeviceValue } from "./storage";
import { ArrowUpRight, BusFront, Footprints, Leaf } from "lucide-react";
import {
  category,
  compareTrips,
  factorSource,
  indoorAdvice,
  isStale,
  modes,
  type Mode,
} from "@/lib/domain";
import { FeatureHeading, Field, Place, type FeatureProps } from "./shared";

const format = new Intl.NumberFormat("en", { maximumFractionDigits: 3 });
const modeLabels: Record<Mode, string> = {
  Car: "Private car",
  Carpool: "Carpool",
  Motorcycle: "Motorcycle",
  Bus: "Bus",
  Rail: "Rail / metro",
  Walk: "Walking",
  Cycle: "Cycling",
  Remote: "Work from home",
};

function ModeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Mode;
  onChange: (value: Mode) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as Mode)}>
        {modes.map((mode) => (
          <option key={mode} value={mode}>
            {modeLabels[mode]}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Mobility({ page, profile, air, ...rest }: FeatureProps) {
  const [scenario, setScenario] = useState("Commute");
  const whatIf = page === "what-if";
  const title = whatIf
    ? "What-if simulator"
    : page === "impact"
      ? "Impact calculator"
      : "Transport advisor";
  return (
    <div className="page ft-page">
      <FeatureHeading
        title={title}
        description={
          whatIf
            ? "Explore how changes to your routine could affect emissions or exposure."
            : "Compare the climate impact of your commute, one passenger at a time."
        }
      >
        <Place profile={profile} />
      </FeatureHeading>
      <nav className="ft-tabs" aria-label="Travel and impact tools">
        {[
          ["transport", "Compare transport"],
          ["impact", "Impact calculator"],
          ["what-if", "What-if scenarios"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={"/" + href}
            aria-current={page === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {whatIf && (
        <Field label="Change to explore">
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option>Commute</option>
            <option>Indoor sources</option>
            <option>Outdoor exercise time</option>
          </select>
        </Field>
      )}
      {whatIf && scenario === "Indoor sources" ? (
        <section className="ft-panel ft-stack">
          <h2>Reduce indoor combustion</h2>
          <p>
            <strong>Current scenario</strong> · Incense, candles or smoky
            cooking can introduce particles indoors.
          </p>
          <p>
            <strong>Proposed scenario</strong> · Replace a burning fragrance
            with an unscented routine and use available cooking exhaust.
          </p>
          {indoorAdvice(profile, air)
            .slice(0, 1)
            .map((action) => (
              <p className="ft-benefit" key={action.id}>
                <Leaf size={17} />
                {action.why}
              </p>
            ))}
          <p className="ft-muted">
            The change can reduce indoor sources. Room volume, air exchange and
            actual emissions determine the outcome, so a numerical exposure
            saving is unavailable.
          </p>
          <Link className="ft-secondary" href="/indoor-air">
            Open indoor advisor <ArrowUpRight size={14} />
          </Link>
        </section>
      ) : whatIf && scenario === "Outdoor exercise time" ? (
        <HourlyScenario air={air} />
      ) : (
        <TripComparison page={page} profile={profile} air={air} {...rest} />
      )}
    </div>
  );
}

function HourlyScenario({ air }: Pick<FeatureProps, "air">) {
  const [first, setFirst] = useState(0);
  const [second, setSecond] = useState(1);
  const hours =
    air && (air.sample || !isStale(air.timestamp))
      ? air.hourly
          .filter((hour) => Date.parse(hour.time) >= Date.parse(air.timestamp))
          .slice(0, 24)
      : [];
  if (hours.length < 2)
    return (
      <section className="ft-panel">
        <h2>Exercise timing</h2>
        <p>
          Two current forecast hours are needed to compare timing. Use an indoor
          activity or check an official local forecast.
        </p>
      </section>
    );
  const local = (time: string) =>
    new Intl.DateTimeFormat("en", {
      timeZone: air?.timezone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(time));
  const from = hours[Math.min(first, hours.length - 1)];
  const to = hours[Math.min(second, hours.length - 1)];
  return (
    <section className="ft-panel ft-stack">
      <h2>Move an outdoor activity</h2>
      <div className="ft-grid">
        {[
          { label: "Current time", i: first, set: setFirst },
          { label: "Proposed time", i: second, set: setSecond },
        ].map(({ label, i, set }) => (
          <Field key={label} label={label}>
            <select
              value={Math.min(i, hours.length - 1)}
              onChange={(e) => set(Number(e.target.value))}
            >
              {hours.map((hour, j) => (
                <option value={j} key={hour.time}>
                  {local(hour.time)} · US AQI {hour.aqi}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </div>
      <p>
        The proposed hour has{" "}
        {to.aqi === from.aqi
          ? "the same"
          : to.aqi < from.aqi
            ? "a lower"
            : "a higher"}{" "}
        modeled US AQI ({to.aqi}, {category(to.aqi)}) compared with {from.aqi} (
        {category(from.aqi)}).
      </p>
      <p className="ft-muted">
        {air?.sample ? "Sample forecast. " : ""}A lower value can still indicate
        unhealthy conditions. Actual exposure depends on your route, exertion
        and time outdoors.
      </p>
    </section>
  );
}

const tripSchema = z.object({
  base: z.enum(modes),
  alternative: z.enum(modes),
  distance: z.number().min(0).max(500),
  trips: z.number().int().min(0).max(28),
  changed: z.number().int().min(0).max(28),
  occupancy: z.number().int().min(2).max(8),
});
type Trip = z.infer<typeof tripSchema>;

function TripComparison({ profile, page }: FeatureProps) {
  const [saved, save] = useDeviceValue<Trip>(
    `aeris:trips:${profile.mode}:${profile.distance}`,
    tripSchema,
    {
      base: profile.mode,
      alternative: profile.mode === "Rail" ? "Bus" : "Rail",
      distance: profile.distance,
      trips: 10,
      changed: 6,
      occupancy: 2,
    },
  );
  const [sessionOnly, setSessionOnly] = useState<Trip | null>(null);
  const trip = sessionOnly ?? saved;
  const { base, alternative, distance, trips, changed, occupancy } = trip;
  function update(patch: Partial<Trip>) {
    const next = { ...trip, ...patch };
    setSessionOnly(save(next) ? null : next);
  }
  const whatIf = page === "what-if";
  const switched = whatIf ? Math.min(changed, trips) : trips;
  const all = compareTrips(base, alternative, distance, trips, occupancy);
  const delta = compareTrips(base, alternative, distance, switched, occupancy);
  const proposed = all.baseline - delta.savings;
  const max = Math.max(all.baseline, proposed, 0.001);
  const bars = [
    { label: "Current", value: all.baseline },
    { label: "Proposed", value: proposed },
  ];
  const active = alternative === "Cycle" || alternative === "Walk";
  return (
    <>
      <div className="ft-split">
        <section className="ft-panel ft-stack">
          <h2>Trip assumptions</h2>
          <div className="ft-grid">
            <ModeField
              label="Current mode"
              value={base}
              onChange={(base) => update({ base })}
            />
            <ModeField
              label="Alternative mode"
              value={alternative}
              onChange={(alternative) => update({ alternative })}
            />
          </div>
          <Field label={`One-way distance · ${format.format(distance)} km`}>
            <input
              type="number"
              aria-label="One-way distance in kilometers"
              min="0"
              max="500"
              step="0.1"
              value={distance}
              onChange={(e) =>
                update({
                  distance: Math.max(0, Math.min(500, Number(e.target.value))),
                })
              }
            />
          </Field>
          <Field label={`One-way trips per week · ${trips}`}>
            <input
              type="range"
              min="0"
              max="28"
              value={trips}
              onChange={(e) => update({ trips: Number(e.target.value) })}
            />
          </Field>
          {whatIf && (
            <Field label={`Trips switched per week · ${switched}`}>
              <input
                type="range"
                min="0"
                max={trips}
                value={switched}
                onChange={(e) => update({ changed: Number(e.target.value) })}
              />
            </Field>
          )}
          {(base === "Carpool" || alternative === "Carpool") && (
            <Field label="People sharing the car">
              <select
                value={occupancy}
                onChange={(e) => update({ occupancy: Number(e.target.value) })}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          )}
        </section>
        <section className="ft-panel ft-result" aria-live="polite">
          <span className="ft-icon">
            <Leaf size={21} />
          </span>
          <h2>Estimated weekly {delta.savings < 0 ? "increase" : "saving"}</h2>
          <div className="ft-value">
            {format.format(Math.abs(delta.savings))} <small>kg CO₂e</small>
          </div>
          <p>
            {switched} of {trips} one-way trips switched to{" "}
            {modeLabels[alternative].toLowerCase()}.
          </p>
          <div
            className="ft-bars"
            role="group"
            aria-label="Weekly emissions per passenger"
          >
            {bars.map((bar) => (
              <div key={bar.label}>
                <div>
                  <span>{bar.label}</span>
                  <strong>{format.format(bar.value)} kg</strong>
                </div>
                <div className="ft-track">
                  <i style={{ width: `${(bar.value / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {page === "transport" && (
        <ModeChart
          trip={trip}
          onChoose={(alternative) => update({ alternative })}
        />
      )}
      <section className="ft-panel ft-stack">
        <h2>How the estimate works</h2>
        <p>
          Distance × emission factor × one-way trips gives kg CO₂e per
          passenger. Unchanged trips retain the current mode’s factor.
        </p>
        <div className="ft-grid">
          {[
            { label: "Current mode", mode: base, factor: all.baselineFactor },
            {
              label: "Alternative mode",
              mode: alternative,
              factor: all.alternativeFactor,
            },
          ].map((item) => (
            <div className="ft-stat" key={item.label}>
              <small>
                {item.label} · {modeLabels[item.mode]}
              </small>
              <strong>
                {item.factor.toLocaleString("en", { maximumFractionDigits: 7 })}{" "}
                kg CO₂e / passenger-km
              </strong>
              <small>
                {format.format(item.factor * distance)} kg per one-way trip
              </small>
            </div>
          ))}
        </div>
        <p className="ft-muted">
          Illustrative UK averages serve as proxies. Vehicle type, occupancy,
          electricity mix and route length vary locally. Walking, cycling and
          remote work assume zero direct trip emissions. Lifecycle effects and
          extra energy used at home are excluded.{" "}
          <a href={factorSource} target="_blank" rel="noreferrer">
            Emission factor source ↗
          </a>
        </p>
      </section>
      <section className="ft-panel ft-stack">
        <h2>Travel trade-offs</h2>
        <p className="ft-benefit">
          <BusFront size={18} />
          Shared services can distribute transport emissions across passengers.
          Check actual service availability, fares and accessibility for your
          route.
        </p>
        <p className="ft-benefit">
          <Footprints size={18} />
          {active
            ? "Active travel avoids tailpipe emissions on the trip. Breathing harder near traffic can increase inhaled pollution. Consider a quieter route or an indoor alternative during smog."
            : "Time at traffic stops, vehicle ventilation and roadside waiting can all affect personal exposure. CO₂e estimates do not predict the change in local AQI or inhaled particles."}
        </p>
      </section>
    </>
  );
}

function ModeChart({
  trip,
  onChoose,
}: {
  trip: Trip;
  onChoose: (mode: Mode) => void;
}) {
  const options = modes.map((mode) => ({
    mode,
    emissions: compareTrips(trip.base, mode, trip.distance, 1, trip.occupancy)
      .alternative,
  }));
  const max = Math.max(...options.map((option) => option.emissions), 0.001);
  return (
    <section className="ft-panel ft-stack">
      <h2>Compare all travel modes</h2>
      <p>
        Choose an alternative to update the weekly comparison. Each bar shows
        estimated kg CO₂e per passenger for one {trip.distance} km trip.
      </p>
      <div className="ft-mode-chart">
        {options.map(({ mode, emissions }) => (
          <button
            key={mode}
            aria-pressed={trip.alternative === mode}
            onClick={() => onChoose(mode)}
          >
            <span>{modeLabels[mode]}</span>
            <span className="ft-track" aria-hidden="true">
              <i style={{ width: `${(emissions / max) * 100}%` }} />
            </span>
            <strong>{format.format(emissions)} kg</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

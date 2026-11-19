"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { locationSchema, type Location } from "@/lib/domain";
import { z } from "zod";
import { Field } from "./shared";

const cities: Location[] = [
  { name: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  { name: "Delhi", latitude: 28.6519, longitude: 77.2315 },
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
];
const resultSchema = z.object({
  locations: z.array(locationSchema.extend({ country: z.string().optional() })),
});

export default function LocationPicker({
  location,
  onChange,
}: {
  location: Location;
  onChange: (value: Location) => void;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<z.infer<typeof resultSchema>["locations"]>(
    [],
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function select(value: Location) {
    controller.current?.abort();
    setBusy(false);
    onChange(value);
    setFound([]);
    setQuery("");
    setMessage(`Selected ${value.name}.`);
  }
  async function search() {
    const term = query.trim();
    if (term.length < 2) {
      setMessage("Enter at least two letters to search.");
      return;
    }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setMessage("");
    setFound([]);
    try {
      const response = await fetch(
        "/api/geocode?q=" + encodeURIComponent(term),
        { signal: request.signal },
      );
      if (!response.ok) throw new Error();
      const { locations } = resultSchema.parse(await response.json());
      setFound(locations);
      setMessage(
        locations.length
          ? "Choose a city below."
          : "No matching cities. Try another spelling or a preset.",
      );
    } catch {
      if (!request.signal.aborted)
        setMessage(
          "City search is unavailable. Choose a preset or use your location.",
        );
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  function locate() {
    if (!navigator.geolocation) {
      setMessage(
        "Location is unavailable in this browser. Choose a city below.",
      );
      return;
    }
    setMessage("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        select({
          name: "My location",
          latitude: Number(position.coords.latitude.toFixed(2)),
          longitude: Number(position.coords.longitude.toFixed(2)),
        });
      },
      () =>
        setMessage("Location was unavailable. Search or choose a city below."),
      { timeout: 10000, maximumAge: 300000 },
    );
  }
  return (
    <div className="ft-stack">
      <div className="ft-selected">
        <MapPin size={20} />
        <div>
          <strong>{location.name}</strong>
          <small>
            {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
          </small>
        </div>
      </div>
      <div className="ft-search">
        <Field label="Search for a city">
          <input
            value={query}
            maxLength={80}
            placeholder="City or town"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
        </Field>
        <button
          type="button"
          className="ft-btn"
          disabled={busy}
          onClick={search}
        >
          <Search size={16} />
          {busy ? "Searching…" : "Search"}
        </button>
      </div>
      {found.length > 0 && (
        <ul className="ft-results">
          {found.map((result, index) => (
            <li key={index}>
              <button type="button" onClick={() => select(result)}>
                {result.name}
                {result.country ? ", " + result.country : ""}{" "}
                <small>
                  {result.latitude.toFixed(2)}°, {result.longitude.toFixed(2)}°
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="ft-row">
        {cities.map((city) => (
          <button
            type="button"
            key={city.name}
            onClick={() => select(city)}
            aria-pressed={location.name === city.name}
            className="ft-chip"
          >
            {city.name}
          </button>
        ))}
      </div>
      <div>
        <button type="button" className="ft-secondary" onClick={locate}>
          <LocateFixed size={16} /> Use my location
        </button>
        <p className="ft-muted">
          Your rounded coordinates select the outdoor forecast. You can also
          choose a city manually.
        </p>
      </div>
      <p role="status" className="ft-status">
        {message}
      </p>
    </div>
  );
}

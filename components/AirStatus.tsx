"use client";
import { useWorkspace } from "./Workspace";
import { category, isStale } from "@/lib/domain";
export function useReading() {
  const { air, loading, error } = useWorkspace();
  return {
    value: air?.aqi == null ? "—" : Math.round(air.aqi),
    label:
      air?.aqi != null
        ? category(air.aqi)
        : loading
          ? "Updating"
          : "Unavailable",
    source: air?.sample
      ? "Sample Data"
      : air && isStale(air.timestamp)
        ? "Stale model data"
        : air
          ? "Modeled air quality"
          : loading
            ? "Fetching model data"
            : "Model unavailable",
    error,
  };
}
export function AirFailure() {
  const { error, refresh, setDemo } = useWorkspace();
  return error ? (
    <div role="status" className="failure">
      {error} <button onClick={refresh}>Retry</button>{" "}
      <button onClick={() => setDemo(true)}>Use Sample Data</button>
    </div>
  ) : null;
}
export function Attribution() {
  return (
    <p className="attribution">
      Modeled forecasts from{" "}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Open-Meteo
      </a>{" "}
      and the{" "}
      <a
        href="https://atmosphere.copernicus.eu/"
        target="_blank"
        rel="noreferrer"
      >
        Copernicus Atmosphere Monitoring Service
      </a>
      . All indices use the US AQI scale.
    </p>
  );
}

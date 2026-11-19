"use client";
import { useState } from "react";
import type { Air } from "@/lib/domain";
export function Trend({ air }: { air: Air }) {
  const [index, setIndex] = useState(0);
  const points = air.hourly;
  if (!points.length) return <p>Hourly forecasts are unavailable.</p>;
  const chosen = Math.min(index, points.length - 1);
  const fmt = (time: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: air.timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time));
  const max = Math.max(50, ...points.map((p) => p.aqi));
  const width = 520;
  const height = 110;
  const x = (i: number) =>
    4 + (i * (width - 8)) / Math.max(1, points.length - 1);
  const y = (v: number) => height - 5 - (v / max) * (height - 12);
  const d = points
    .map((p, i) => (i ? "L" : "M") + x(i) + " " + y(p.aqi))
    .join(" ");
  return (
    <div className="trend">
      <output>
        {fmt(points[chosen].time)} ·{" "}
        <strong>{points[chosen].aqi} US AQI</strong>
      </output>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Modeled US AQI trend"
      >
        <defs>
          <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop stopColor="#9dd9b5" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2={width}
            y1={12 + i * 29}
            y2={12 + i * 29}
            stroke="#d9e3dd"
            strokeDasharray="3 4"
          />
        ))}
        <path
          d={
            d +
            " L" +
            x(points.length - 1) +
            " " +
            height +
            " L4 " +
            height +
            "Z"
          }
          fill="url(#chartFill)"
        />
        <path d={d} fill="none" stroke="#187457" strokeWidth="2.8" />
        <circle
          cx={x(chosen)}
          cy={y(points[chosen].aqi)}
          r="4"
          fill="#12664f"
        />
      </svg>
      <input
        type="range"
        aria-label="Inspect forecast hour"
        min="0"
        max={points.length - 1}
        value={chosen}
        onChange={(e) => setIndex(Number(e.target.value))}
      />
      <div className="axis">
        <span>{fmt(points[0].time)}</span>
        <span>{air.timezone}</span>
        <span>{fmt(points.at(-1)!.time)}</span>
      </div>
    </div>
  );
}

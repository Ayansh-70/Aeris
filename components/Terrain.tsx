// Procedural terrain illustration. The contours convey landscape, not measurements.
export function Terrain() {
  const height = (x: number, z: number) => {
    const ridge =
      56 * Math.exp(-((x - 410 - z * 0.2) ** 2) / 8300) +
      26 * Math.exp(-((x - 220) ** 2) / 4800);
    return (
      125 +
      z * 0.76 -
      (ridge +
        14 * Math.sin(x / 48 + z / 38) +
        11 * Math.cos(x / 69 - z / 32)) *
        Math.exp(-z / 250)
    );
  };
  const line = (z: number) =>
    Array.from({ length: 100 }, (_, i) => {
      const x = i * 7 - 20;
      return (i ? "L" : "M") + x + " " + height(x, z).toFixed(2);
    }).join(" ");
  return (
    <svg
      className="terrain"
      viewBox="0 0 650 330"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="#8ab6a1" opacity=".43" />
        </pattern>
        <linearGradient id="earth" x2="0" y2="1">
          <stop stopColor="#60846c" />
          <stop offset="1" stopColor="#b6d4a0" />
        </linearGradient>
      </defs>
      <rect width="650" height="330" fill="url(#dots)" />
      <circle cx="442" cy="73" r="32" fill="#e9bf7e" />
      <path d={line(0) + " L680 330 L-20 330Z"} fill="#154638" />
      {Array.from({ length: 54 }, (_, i) => (
        <path
          key={i}
          d={line(i * 6)}
          fill="none"
          stroke="url(#earth)"
          strokeWidth={i % 5 === 0 ? 1.15 : 0.65}
          opacity=".88"
        />
      ))}
    </svg>
  );
}

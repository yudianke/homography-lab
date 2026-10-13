import type { EducationMode, Overlay } from "../math/education";
export default function GeometryOverlay({
  overlay,
  mode,
  showGrid,
}: {
  overlay: Overlay;
  mode: EducationMode;
  showGrid: boolean;
}) {
  if (!overlay.ok || (mode === "Grid" && !showGrid)) return null;
  return (
    <g
      className={`education-overlay mode-${mode.replace(" ", "-").toLowerCase()}`}
      aria-label={`${mode} mathematical overlay`}
    >
      {overlay.segments.map(([a, b], i) => (
        <line
          key={i}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          className={mode === "Distances" && i === 1 ? "second-segment" : ""}
        />
      ))}
      {overlay.points.map((p, i) => (
        <g
          key={i}
          data-overlay-point={i}
          transform={`translate(${p.x} ${p.y})`}
        >
          <circle r="5" />
          <text
            x={mode === "Distances" ? 12 : 10}
            y={mode === "Distances" ? 4 : -10}
          >
            {overlay.labels[i]}
          </text>
        </g>
      ))}
    </g>
  );
}

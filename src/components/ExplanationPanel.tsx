import { Robot } from "./Header";
import type { EducationMode, Overlay } from "../math/education";
const concepts = {
  Grid: [
    "One plane, two views",
    "Look! The grid changes shape, but its lines remain straight.",
    "Blue dashed lines are the mathematical grid. The faint lines embedded in the artwork are decorative.",
  ],
  "Straight Lines": [
    "Straight lines stay straight",
    "Even when the map tilts, points on the same line stay together.",
    "Homography preserves collinearity: points on a straight line remain on a straight line. M is the mapped source midpoint; it need not bisect the destination segment.",
  ],
  Angles: [
    "A right angle can change",
    "A 90° corner does not always look like 90° after perspective projection.",
    "Homography does not generally preserve angles. A right angle in the original map may appear acute or obtuse in the perspective view.",
  ],
  Distances: [
    "Equal distances can look unequal",
    "Two equal distances in the real map can look different from another viewpoint.",
    "Equal distances on a physical plane may appear unequal after perspective projection. Equality is possible: the default view is affine and preserves equal spacing along a line. Try the perspective example.",
  ],
};
const value = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "Unavailable" : n.toFixed(2);
export default function ExplanationPanel({
  mode,
  source,
  destination,
  showGrid,
}: {
  mode: EducationMode;
  source: Overlay;
  destination: Overlay;
  showGrid: boolean;
}) {
  const [title, guide, explanation] = concepts[mode];
  return (
    <section className="panel explanation">
      <span className="eyebrow">WHAT IS HOMOGRAPHY?</span>
      <h2>{title}</h2>
      <div className="lesson-guide">
        <Robot />
        <p>{guide}</p>
      </div>
      <p>{explanation}</p>
      {!destination.ok ? (
        <p className="lesson-error" role="status">
          Overlay unavailable: {destination.error}
        </p>
      ) : (
        <>
          {mode === "Grid" && (
            <p className="lesson-note">
              {showGrid
                ? "Compare the same evenly spaced source grid in both views."
                : "Grid is hidden. Enable Show Grid to compare the two views."}
            </p>
          )}
          {mode === "Straight Lines" && (
            <div className="lesson-values">
              <span>Mapped midpoint distance from line</span>
              <strong>
                {destination.deviation == null
                  ? "Unavailable"
                  : destination.deviation === 0
                    ? "0"
                    : destination.deviation.toExponential(3)}{" "}
                map units
              </strong>
            </div>
          )}
          {mode === "Angles" && (
            <div className="lesson-values">
              <span>Original angle</span>
              <strong>{value(source.ok ? source.angle : null)}°</strong>
              <span>Transformed angle</span>
              <strong>{value(destination.angle)}°</strong>
            </div>
          )}
          {mode === "Distances" && (
            <table className="distance-table">
              <caption>Euclidean distance in map coordinate units</caption>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Original</th>
                  <th>Perspective</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((i) => (
                  <tr key={i}>
                    <th>{i === 0 ? "P₁–P₂" : "P₂–P₃"}</th>
                    <td>{value(source.ok ? source.distances?.[i] : null)}</td>
                    <td>{value(destination.distances?.[i])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      <p className="overlay-legend">
        {mode === "Grid"
          ? "Blue dashed lines = mathematical grid"
          : mode === "Distances"
            ? "Amber = P₁–P₂ · violet = P₂–P₃"
            : "Amber points and lines correspond across both maps."}
      </p>
      <details>
        <summary>Homography essentials</summary>
        <p>
          A 3×3 matrix maps corresponding points between two views of a plane.
          Four valid pairs, with no three points collinear in either view, are
          sufficient. Lines remain straight; lengths, angles and parallelism are
          not generally preserved.
        </p>
      </details>
    </section>
  );
}

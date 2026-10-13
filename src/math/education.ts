import {
  transformPoint,
  type Matrix3x3,
  type Point2D,
  type Quad,
} from "./homography.ts";
export type EducationMode = "Grid" | "Straight Lines" | "Angles" | "Distances";
export const MODES: EducationMode[] = [
  "Grid",
  "Straight Lines",
  "Angles",
  "Distances",
];
export const PERSPECTIVE_EXAMPLE: Quad = [
  { x: 120, y: 40 },
  { x: 280, y: 40 },
  { x: 390, y: 380 },
  { x: 10, y: 380 },
];
const finite = (p: Point2D) => Number.isFinite(p.x) && Number.isFinite(p.y);
export function distance(a: Point2D, b: Point2D): number | null {
  if (!finite(a) || !finite(b)) return null;
  const value = Math.hypot(b.x - a.x, b.y - a.y);
  return Number.isFinite(value) ? value : null;
}
export function angleDegrees(
  a: Point2D,
  vertex: Point2D,
  b: Point2D,
): number | null {
  const la = distance(a, vertex),
    lb = distance(b, vertex);
  if (la === null || lb === null || la < 1e-10 || lb < 1e-10) return null;
  const ax = (a.x - vertex.x) / la,
    ay = (a.y - vertex.y) / la,
    bx = (b.x - vertex.x) / lb,
    by = (b.y - vertex.y) / lb;
  return (
    (Math.atan2(Math.abs(ax * by - ay * bx), ax * bx + ay * by) * 180) / Math.PI
  );
}
export function lineDeviation(
  a: Point2D,
  b: Point2D,
  p: Point2D,
): number | null {
  const length = distance(a, b);
  if (length === null || length < 1e-10 || !finite(p)) return null;
  const value = Math.abs(
    ((b.x - a.x) / length) * (p.y - a.y) - ((b.y - a.y) / length) * (p.x - a.x),
  );
  return Number.isFinite(value) ? value : null;
}
export type Overlay =
  | {
      ok: true;
      segments: readonly [Point2D, Point2D][];
      points: Point2D[];
      labels: string[];
      angle: number | null;
      distances: readonly [number | null, number | null] | null;
      deviation: number | null;
    }
  | { ok: false; error: string };
export function buildOverlay(
  H: Matrix3x3,
  mode: EducationMode,
  density = 5,
): Overlay {
  const map = (p: Point2D) => {
    const result = transformPoint(H, p);
    if (!result.ok) throw new Error(result.error);
    return result;
  };
  try {
    if (mode === "Grid") {
      if (!Number.isInteger(density) || density < 2 || density > 10)
        throw new Error("Grid density must be between 2 and 10.");
      const segments: [Point2D, Point2D][] = [];
      for (let i = 1; i < density; i++) {
        const t = (400 * i) / density;
        for (const pair of [
          [
            { x: t, y: 0 },
            { x: t, y: 400 },
          ],
          [
            { x: 0, y: t },
            { x: 400, y: t },
          ],
        ] as const) {
          const a = map(pair[0]),
            b = map(pair[1]);
          if (Math.sign(a.homogeneous[2]) !== Math.sign(b.homogeneous[2]))
            throw new Error("A grid line crosses the projective horizon.");
          segments.push([a.point, b.point]);
        }
      }
      return {
        ok: true,
        segments,
        points: [],
        labels: [],
        angle: null,
        distances: null,
        deviation: null,
      };
    }
    const source: Point2D[] =
      mode === "Straight Lines"
        ? [
            { x: 40, y: 135 },
            { x: 200, y: 135 },
            { x: 360, y: 135 },
          ]
        : mode === "Angles"
          ? [
              { x: 270, y: 247 },
              { x: 143, y: 247 },
              { x: 143, y: 125 },
            ]
          : [
              { x: 240, y: 60 },
              { x: 240, y: 200 },
              { x: 240, y: 340 },
            ];
    const mapped = source.map(map);
    if (
      mapped.some(
        (p) =>
          Math.sign(p.homogeneous[2]) !== Math.sign(mapped[0].homogeneous[2]),
      )
    )
      throw new Error("The demonstration crosses the projective horizon.");
    const points = mapped.map((p) => p.point);
    const [a, b, c] = points;
    return {
      ok: true,
      segments: [
        [a, b],
        [b, c],
      ],
      points,
      labels:
        mode === "Distances"
          ? ["P₁", "P₂", "P₃"]
          : mode === "Angles"
            ? ["U", "O", "V"]
            : ["L", "M", "R"],
      angle: mode === "Angles" ? angleDegrees(a, b, c) : null,
      distances: mode === "Distances" ? [distance(a, b), distance(b, c)] : null,
      deviation: mode === "Straight Lines" ? lineDeviation(a, c, b) : null,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Overlay unavailable.",
    };
  }
}

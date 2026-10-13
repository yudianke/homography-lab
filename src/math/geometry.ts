import type { Point2D, Quad } from "./homography";

export type QuadConstraints = {
  minEdgeLength: number;
  minArea: number;
  minAltitude: number;
  minTurnSine: number;
};
export const DEFAULT_CONSTRAINTS: QuadConstraints = {
  minEdgeLength: 24,
  minArea: 1600,
  minAltitude: 8,
  minTurnSine: 0.035,
};
export function signedArea(quad: Quad): number {
  return (
    quad.reduce((sum, p, i) => {
      const next = quad[(i + 1) % 4];
      return sum + p.x * next.y - p.y * next.x;
    }, 0) / 2
  );
}
/** Positive winding is clockwise in SVG's y-down coordinate system.
 * Strict positive turns at every vertex imply a simple, convex quad.
 * Absolute altitude plus a scale-independent angle guard prevent near-collinearity.
 */
export function validateQuad(
  quad: Quad,
  constraints = DEFAULT_CONSTRAINTS,
): string | null {
  if (quad.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return "Coordinates must be finite.";
  const lengths = quad.map((p, i) =>
    Math.hypot(p.x - quad[(i + 1) % 4].x, p.y - quad[(i + 1) % 4].y),
  );
  if (lengths.some((length) => length < constraints.minEdgeLength))
    return "Keep the corners farther apart.";
  if (signedArea(quad) < constraints.minArea)
    return "Keep enough area and preserve clockwise corner order.";
  for (let i = 0; i < 4; i++) {
    const a = quad[i],
      b = quad[(i + 1) % 4],
      c = quad[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross <= 0) return "Keep the boundary convex without crossing edges.";
    if (
      cross / Math.hypot(c.x - a.x, c.y - a.y) < constraints.minAltitude ||
      cross / (lengths[i] * lengths[(i + 1) % 4]) < constraints.minTurnSine
    ) {
      return "Keep three neighboring corners from lining up.";
    }
  }
  return null;
}
export function moveCorner(quad: Quad, index: number, point: Point2D): Quad {
  const next: [Point2D, Point2D, Point2D, Point2D] = [...quad];
  next[index] = point;
  return next;
}
/** Keep the full handle reachable in the shared SVG canvas. */
export function clampToMap(point: Point2D): Point2D {
  return {
    x: Math.max(0, Math.min(400, point.x)),
    y: Math.max(0, Math.min(400, point.y)),
  };
}

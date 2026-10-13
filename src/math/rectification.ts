import {
  invertHomography,
  transformPoint,
  ORIGINAL_CORNERS,
  type Matrix3x3,
  type Quad,
} from "./homography.ts";

export type RectificationSnapshot = Readonly<{
  H: Matrix3x3;
  inverse: Matrix3x3;
  corners: Quad;
  grid: boolean;
  size: number;
}>;
export function createSnapshot(
  H: Matrix3x3,
  grid: boolean,
  size: number,
): RectificationSnapshot {
  if (!Number.isInteger(size) || size < 16 || size > 2048)
    throw new Error("Rectification resolution must be 16–2048 pixels.");
  const inverse = invertHomography(H);
  if (!inverse.ok) throw new Error(inverse.error);
  const mapped = ORIGINAL_CORNERS.map((p) => transformPoint(H, p));
  if (mapped.some((p) => !p.ok))
    throw new Error("A map corner cannot be projected.");
  const weights = mapped.map((p) => (p.ok ? p.homogeneous[2] : 0));
  if (weights.some((w) => Math.sign(w) !== Math.sign(weights[0])))
    throw new Error("The map crosses the projective horizon.");
  // Normalize before float32 upload, then reject overflow/underflow of significant terms.
  const scale = Math.max(...H.flat().map(Math.abs));
  const matrix = H.map((row) =>
    Object.freeze(row.map((v) => v / scale)),
  ) as unknown as Matrix3x3;
  if (
    !matrix
      .flat()
      .every(
        (v) =>
          Number.isFinite(Math.fround(v)) && (v === 0 || Math.fround(v) !== 0),
      )
  )
    throw new Error("Transformation exceeds GPU precision.");
  const normalizedInverse = invertHomography(matrix);
  if (
    !normalizedInverse.ok ||
    !normalizedInverse.matrix
      .flat()
      .every((v) => Number.isFinite(Math.fround(v)))
  )
    throw new Error("Inverse exceeds GPU precision.");
  return Object.freeze({
    H: Object.freeze(matrix),
    inverse: normalizedInverse.matrix,
    corners: Object.freeze(
      mapped.map((p) => Object.freeze(p.ok ? { ...p.point } : { x: 0, y: 0 })),
    ) as unknown as Quad,
    grid,
    size,
  });
}
export function rectificationState(
  state: RectificationSnapshot | null,
  action:
    | { type: "capture"; snapshot: RectificationSnapshot }
    | { type: "reset" | "edit" | "changed" },
): RectificationSnapshot | null {
  return action.type === "capture" ? action.snapshot : null;
}
export function outputDimensions(snapshot: RectificationSnapshot) {
  return { width: snapshot.size, height: snapshot.size };
}
export function snapshotMatches(
  snapshot: RectificationSnapshot,
  corners: Quad,
  grid: boolean,
) {
  return (
    snapshot.grid === grid &&
    corners.every(
      (p, i) =>
        Math.hypot(p.x - snapshot.corners[i].x, p.y - snapshot.corners[i].y) <
        1e-7,
    )
  );
}
/** Geometry returns through H^-1; backward IMAGE sampling must instead locate Hp. */
export function perspectiveSample(
  snapshot: RectificationSnapshot,
  point: { x: number; y: number },
) {
  return transformPoint(snapshot.H, point);
}

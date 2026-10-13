/** Shared SVG coordinates: x increases right, y increases down; map spans 0–400. */
export type Point2D = Readonly<{ x: number; y: number }>;
/** Clockwise order: top-left A, top-right B, bottom-right C, bottom-left D. */
export type Quad = readonly [Point2D, Point2D, Point2D, Point2D];
export type Corners = Quad;
export type Matrix3x3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];
export const MAP_SIZE = 400;
export const ORIGINAL_CORNERS: Corners = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 400 },
  { x: 0, y: 400 },
];
/** A static affine illustration, not a computed camera homography. */
export const PREVIEW_CORNERS: Corners = [
  { x: 80, y: 55 },
  { x: 400, y: 135 },
  { x: 320, y: 355 },
  { x: 0, y: 275 },
];
export const IDENTITY_MATRIX: Matrix3x3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export type MathFailure = { ok: false; error: string };
export type HomographyResult = { ok: true; matrix: Matrix3x3 } | MathFailure;
export type PointTransformResult =
  | { ok: true; point: Point2D; homogeneous: readonly [number, number, number] }
  | MathFailure;
const EPS = 1e-12;
const fail = (error: string): MathFailure => ({ ok: false, error });
const matrixOf = (v: number[]): Matrix3x3 => [
  [v[0], v[1], v[2]],
  [v[3], v[4], v[5]],
  [v[6], v[7], v[8]],
];
/** Canonical scale: largest-magnitude coefficient is +1; h33 may be zero. */
function canonical(H: Matrix3x3): HomographyResult {
  const values = H.flat();
  if (!values.every(Number.isFinite))
    return fail("Non-finite matrix coefficients.");
  const largest = values.reduce(
    (a, b) => (Math.abs(b) > Math.abs(a) ? b : a),
    0,
  );
  if (largest === 0) return fail("Zero matrix has no projective mapping.");
  return { ok: true, matrix: matrixOf(values.map((v) => v / largest)) };
}
/** Composition H2 after H1. Throws on non-finite input or arithmetic overflow. */
export function multiplyHomographies(H2: Matrix3x3, H1: Matrix3x3): Matrix3x3 {
  if (![...H2.flat(), ...H1.flat()].every(Number.isFinite))
    throw new RangeError("Non-finite matrix input.");
  const values = Array.from({ length: 9 }, (_, i) =>
    H2[Math.floor(i / 3)].reduce((sum, v, k) => sum + v * H1[k][i % 3], 0),
  );
  if (!values.every(Number.isFinite))
    throw new RangeError("Matrix composition overflow.");
  return matrixOf(values);
}
export function transformPoint(
  H: Matrix3x3,
  point: Point2D,
): PointTransformResult {
  if (![...H.flat(), point.x, point.y].every(Number.isFinite))
    return fail("Point or matrix is non-finite.");
  const [a, b, w] = H.map(
    (row) => row[0] * point.x + row[1] * point.y + row[2],
  );
  const denominatorScale =
    Math.abs(H[2][0] * point.x) +
    Math.abs(H[2][1] * point.y) +
    Math.abs(H[2][2]);
  if (![a, b, w, denominatorScale].every(Number.isFinite))
    return fail("Projection overflow.");
  if (w === 0 || Math.abs(w) <= EPS * denominatorScale)
    return fail(
      "Point is on or numerically near the projective horizon (w = 0).",
    );
  const mapped = { x: a / w, y: b / w };
  if (![mapped.x, mapped.y].every(Number.isFinite))
    return fail("Perspective division overflow.");
  return { ok: true, point: mapped, homogeneous: [a, b, w] };
}
/** Partial-pivot Gauss–Jordan inversion of 3x3 H, not the DLT coefficient system. */
export function invertHomography(H: Matrix3x3): HomographyResult {
  const normalized = canonical(H);
  if (!normalized.ok) return normalized;
  const rows = normalized.matrix.map((row, i) => [
    ...row,
    ...IDENTITY_MATRIX[i],
  ]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++)
      if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
    if (Math.abs(rows[pivot][col]) <= EPS)
      return fail("Matrix is singular or numerically ill-conditioned.");
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    rows[col] = rows[col].map((v) => v / divisor);
    for (let r = 0; r < 3; r++)
      if (r !== col) {
        const factor = rows[r][col];
        rows[r] = rows[r].map((v, j) => v - factor * rows[col][j]);
      }
  }
  return canonical(matrixOf(rows.flatMap((row) => row.slice(3))));
}
/** Explicit result: callers never receive Infinity as an error sentinel. */
export function calculateReprojectionError(
  H: Matrix3x3,
  source: Point2D,
  destination: Point2D,
): { ok: true; error: number } | MathFailure {
  if (![destination.x, destination.y].every(Number.isFinite))
    return fail("Destination is non-finite.");
  const mapped = transformPoint(H, source);
  if (!mapped.ok) return mapped;
  const error = Math.hypot(
    mapped.point.x - destination.x,
    mapped.point.y - destination.y,
  );
  return Number.isFinite(error)
    ? { ok: true, error }
    : fail("Reprojection error overflow.");
}
/** Normalize centroid to zero and RMS distance to sqrt(2), independent of map units. */
function normalizePoints(points: Quad) {
  const cx = points.reduce((s, p) => s + p.x / 4, 0),
    cy = points.reduce((s, p) => s + p.y / 4, 0);
  const distances = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const radius = Math.max(...distances);
  if (!Number.isFinite(radius) || radius === 0)
    throw new Error("Coincident points or coordinate range too large.");
  const rms =
    radius *
    Math.sqrt(distances.reduce((s, d) => s + (d / radius) ** 2, 0) / 4);
  const scale = Math.SQRT2 / rms;
  const normalized = points.map((p) => ({
    x: (p.x - cx) * scale,
    y: (p.y - cy) * scale,
  }));
  if (
    !normalized.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)) ||
    !Number.isFinite(scale)
  )
    throw new Error("Point normalization is unstable.");
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++)
      for (let k = j + 1; k < 4; k++) {
        const a = normalized[i],
          b = normalized[j],
          c = normalized[k];
        const area = Math.abs(
          (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
        );
        if (area < 1e-8)
          throw new Error(
            "Three points are coincident, collinear, or numerically too close to collinear.",
          );
      }
  return {
    points: normalized,
    T: [
      [scale, 0, -scale * cx],
      [0, scale, -scale * cy],
      [0, 0, 1],
    ] as Matrix3x3,
    undo: [
      [1 / scale, 0, cx],
      [0, 1 / scale, cy],
      [0, 0, 1],
    ] as Matrix3x3,
  };
}
/** Exactly four correspondences: normalized 8x9 homogeneous DLT.
 * Partial row pivoting discovers 8 pivot columns; the remaining coefficient
 * is the free scale variable. We never assume h33 != 0 or invert the 8x8 system.
 */
export function computeHomography(
  source: Quad,
  destination: Quad,
): HomographyResult {
  if (
    ![...source, ...destination].every(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
    )
  )
    return fail("Correspondences must be finite.");
  try {
    const s = normalizePoints(source),
      d = normalizePoints(destination);
    const rows = s.points.flatMap((p, i) => {
      const q = d.points[i];
      return [
        [-p.x, -p.y, -1, 0, 0, 0, q.x * p.x, q.x * p.y, q.x],
        [0, 0, 0, -p.x, -p.y, -1, q.y * p.x, q.y * p.y, q.y],
      ];
    });
    const original = rows.map((r) => [...r]);
    const pivots: number[] = [];
    const threshold = EPS * Math.max(...rows.flat().map(Math.abs));
    for (let col = 0; col < 9 && pivots.length < 8; col++) {
      const rank = pivots.length;
      let pivot = rank;
      for (let r = rank + 1; r < 8; r++)
        if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
      if (Math.abs(rows[pivot][col]) <= threshold) continue;
      [rows[rank], rows[pivot]] = [rows[pivot], rows[rank]];
      const divisor = rows[rank][col];
      rows[rank] = rows[rank].map((v) => v / divisor);
      for (let r = 0; r < 8; r++)
        if (r !== rank) {
          const factor = rows[r][col];
          rows[r] = rows[r].map((v, j) => v - factor * rows[rank][j]);
        }
      pivots.push(col);
    }
    if (pivots.length !== 8)
      return fail(
        "Correspondences do not determine a stable unique homography.",
      );
    const free = Array.from({ length: 9 }, (_, i) => i).find(
      (i) => !pivots.includes(i),
    )!;
    const vector = Array(9).fill(0);
    vector[free] = 1;
    pivots.forEach((col, r) => {
      vector[col] = -rows[r][free];
    });
    const hn = canonical(matrixOf(vector));
    if (!hn.ok) return hn;
    if (
      original.some(
        (row) =>
          Math.abs(
            row.reduce((sum, v, i) => sum + v * hn.matrix.flat()[i], 0),
          ) > 1e-8,
      )
    )
      return fail("DLT residual exceeds numerical tolerance.");
    const H = canonical(
      multiplyHomographies(d.undo, multiplyHomographies(hn.matrix, s.T)),
    );
    if (!H.ok) return H;
    const inverse = invertHomography(H.matrix);
    if (!inverse.ok) return inverse;
    // Validate in normalized destination units, rather than silently accepting a bad solve.
    for (let i = 0; i < 4; i++) {
      const mapped = transformPoint(H.matrix, source[i]);
      if (!mapped.ok) return mapped;
      const projected = transformPoint(d.T, mapped.point);
      if (!projected.ok) return projected;
      if (
        Math.hypot(
          projected.point.x - d.points[i].x,
          projected.point.y - d.points[i].y,
        ) > 1e-7
      )
        return fail("Reprojection residual exceeds numerical tolerance.");
    }
    return H;
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Numerical estimation failed.",
    );
  }
}
export function inverseConsistencyError(
  H: Matrix3x3,
  inverse: Matrix3x3,
): number {
  const product = multiplyHomographies(inverse, H);
  const scale = (product[0][0] + product[1][1] + product[2][2]) / 3;
  if (!Number.isFinite(scale) || scale === 0)
    throw new RangeError("Invalid inverse product scale.");
  return Math.max(
    ...product
      .flat()
      .map((v, i) => Math.abs(v / scale - (i % 4 === 0 ? 1 : 0))),
  );
}

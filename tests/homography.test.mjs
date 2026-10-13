import test from "node:test";
import assert from "node:assert/strict";
import {
  computeHomography,
  transformPoint,
  invertHomography,
  multiplyHomographies,
  calculateReprojectionError,
  inverseConsistencyError,
  ORIGINAL_CORNERS,
  PREVIEW_CORNERS,
  IDENTITY_MATRIX,
} from "../src/math/homography.ts";
const S = ORIGINAL_CORNERS;
function matrix(result) {
  assert.equal(result.ok, true, result.error);
  return result.matrix;
}
function point(H, p) {
  const r = transformPoint(H, p);
  assert.equal(r.ok, true, r.error);
  return r.point;
}
function close(a, b, tol = 1e-7) {
  assert.ok(
    Math.hypot(a.x - b.x, a.y - b.y) < tol,
    JSON.stringify({ a, b, tol }),
  );
}
function verifyKnown(H, source = S) {
  const dest = source.map((p) => point(H, p));
  const estimated = matrix(computeHomography(source, dest));
  for (const p of [...source, { x: 150, y: 130 }, { x: 215, y: 247 }])
    close(point(estimated, p), point(H, p));
  return estimated;
}
test("A Identity", () => verifyKnown(IDENTITY_MATRIX));
test("B Translation", () =>
  verifyKnown([
    [1, 0, 81],
    [0, 1, -33],
    [0, 0, 1],
  ]));
test("C Scaling", () =>
  verifyKnown([
    [2, 0, 0],
    [0, 0.35, 0],
    [0, 0, 1],
  ]));
test("D Affine rotation, shear, nonuniform scale", () =>
  verifyKnown([
    [1.2, -0.4, 20],
    [0.6, 0.8, -10],
    [0, 0, 1],
  ]));
const projective = [
  [1.1, 0.2, 15],
  [-0.15, 0.9, 40],
  [0.001, -0.0007, 1],
];
test("E Perspective", () => verifyKnown(projective));
test("F Inverse roundtrip and normalized identity residual", () => {
  const inv = matrix(invertHomography(projective));
  for (const p of [...S, { x: 200, y: 200 }])
    close(point(inv, point(projective, p)), p);
  assert.ok(inverseConsistencyError(projective, inv) < 1e-10);
});
test("G Composition applies H1 then H2", () => {
  const h2 = [
    [0.8, 0.1, 20],
    [0.3, 1.2, 30],
    [0.0003, 0, 1],
  ];
  const product = multiplyHomographies(h2, projective);
  for (const p of [...S, { x: 200, y: 200 }])
    close(point(product, p), point(h2, point(projective, p)));
});
test("H Degenerate and nearly collinear geometry fails explicitly", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
  ];
  for (const q of [
    line,
    [S[0], S[0], S[2], S[3]],
    [
      { x: 0, y: 0 },
      { x: 1, y: 1e-12 },
      { x: 2, y: 0 },
      { x: 0, y: 4 },
    ],
  ]) {
    assert.equal(computeHomography(q, S).ok, false);
    assert.equal(computeHomography(S, q).ok, false);
  }
});
test("I Scale ambiguity including negative, tiny and large scales", () => {
  for (const k of [-7, 1e-100, 1e100]) {
    const scaled = projective.map((r) => r.map((v) => v * k));
    for (const p of [...S, { x: 200, y: 200 }])
      close(point(scaled, p), point(projective, p));
    assert.equal(invertHomography(scaled).ok, true);
  }
});
test("J Valid nonsingular zero h33", () => {
  const H = [
    [1, 0, 1],
    [0, 1, 2],
    [0.01, 0.02, 0],
  ];
  const source = [
    { x: 10, y: 20 },
    { x: 400, y: 20 },
    { x: 400, y: 400 },
    { x: 10, y: 400 },
  ];
  const estimated = verifyKnown(H, source);
  assert.ok(Math.abs(estimated[2][2]) < 1e-10);
  close(
    point(
      matrix(invertHomography(estimated)),
      point(estimated, { x: 100, y: 80 }),
    ),
    { x: 100, y: 80 },
  );
});
test("Rejects non-finite inputs, singular and near singular inverse", () => {
  assert.equal(
    computeHomography(
      S,
      S.map((p) => ({ ...p, x: Infinity })),
    ).ok,
    false,
  );
  assert.equal(transformPoint(projective, { x: NaN, y: 0 }).ok, false);
  for (const H of [
    [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 1],
    ],
    [
      [1, 0, 0],
      [0, 1e-14, 0],
      [0, 0, 1],
    ],
    [
      [NaN, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  ])
    assert.equal(invertHomography(H).ok, false);
  assert.throws(
    () =>
      multiplyHomographies(
        [
          [Infinity, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        projective,
      ),
    RangeError,
  );
});
test("Horizon and near-zero cancelling denominator controlled failure", () => {
  const H = [
    [1, 0, 0],
    [0, 1, 0],
    [1, 0, -1],
  ];
  assert.equal(transformPoint(H, { x: 1, y: 2 }).ok, false);
  assert.equal(transformPoint(H, { x: 1 + 1e-14, y: 2 }).ok, false);
  assert.equal(
    calculateReprojectionError(H, { x: 1, y: 2 }, { x: 0, y: 0 }).ok,
    false,
  );
});
test("Small but well-conditioned geometry normalized correctly", () => {
  const small = S.map((p) => ({ x: p.x * 1e-9, y: p.y * 1e-9 }));
  const estimated = matrix(computeHomography(small, small));
  for (const p of small) close(point(estimated, p), p, 1e-18);
});
test("Default preview metrics and center", () => {
  const H = matrix(computeHomography(S, PREVIEW_CORNERS));
  close(point(H, { x: 200, y: 200 }), { x: 200, y: 205 });
  const errors = S.map((p, i) => {
    const e = calculateReprojectionError(H, p, PREVIEW_CORNERS[i]);
    assert.equal(e.ok, true);
    return e.error;
  });
  assert.ok(Math.max(...errors) < 1e-9);
  console.log(
    "Default validation",
    JSON.stringify({
      H,
      center: transformPoint(H, { x: 200, y: 200 }),
      maxError: Math.max(...errors),
      inverseError: inverseConsistencyError(H, matrix(invertHomography(H))),
    }),
  );
});
test("Deterministic projective sweep: 200 estimates and inverse roundtrips", () => {
  for (let i = 1; i <= 200; i++) {
    const t = i / 200;
    const H = [
      [0.5 + t, 0.2 * t, 30 * t],
      [-0.1 * t, 1.3 - t * 0.3, 20],
      [0.0015 * t, -0.001 * t, 1],
    ];
    const estimated = verifyKnown(H);
    const inv = matrix(invertHomography(estimated));
    close(point(inv, point(estimated, { x: 137, y: 219 })), { x: 137, y: 219 });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  createSnapshot,
  snapshotMatches,
  perspectiveSample,
  outputDimensions,
  rectificationState,
} from "../src/math/rectification.ts";
import {
  IDENTITY_MATRIX,
  ORIGINAL_CORNERS,
  transformPoint,
} from "../src/math/homography.ts";
const affine = [
  [0.7, 0.1, 30],
  [-0.1, 0.8, 60],
  [0, 0, 1],
];
const perspective = [
  [0.9, 0.12, 30],
  [0.06, 0.8, 20],
  [0.001, 0.0007, 1],
];
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
for (const [name, H] of [
  ["A Identity", IDENTITY_MATRIX],
  ["B Affine", affine],
  ["C Perspective", perspective],
])
  test(`${name} rectification restores corners and straight-line points`, () => {
    const s = createSnapshot(H, true, 512);
    for (const p of [
      ...ORIGINAL_CORNERS,
      { x: 40, y: 135 },
      { x: 200, y: 135 },
      { x: 360, y: 135 },
    ]) {
      const q = perspectiveSample(s, p);
      assert.ok(q.ok);
      const r = transformPoint(s.inverse, q.point);
      assert.ok(r.ok);
      near(r.point.x, p.x);
      near(r.point.y, p.y);
    }
  });
test("D Forward/inverse consistency across interior samples", () => {
  const s = createSnapshot(perspective, false, 512);
  for (let y = 0; y <= 400; y += 20)
    for (let x = 0; x <= 400; x += 20) {
      const q = perspectiveSample(s, { x, y });
      assert.ok(q.ok);
      const r = transformPoint(s.inverse, q.point);
      assert.ok(r.ok);
      near(r.point.x, x);
      near(r.point.y, y);
    }
});
test("E Output dimensions remain square across resolutions", () => {
  for (const n of [16, 256, 513, 1024, 2048])
    assert.deepEqual(outputDimensions(createSnapshot(perspective, true, n)), {
      width: n,
      height: n,
    });
  for (const n of [0, 15, 2049, Infinity, NaN, 2.5])
    assert.throws(() => createSnapshot(perspective, true, n));
});
test("F Reset and Back to Editing clear results without modifying transformation", () => {
  const s = createSnapshot(affine, true, 512),
    before = JSON.stringify(s);
  assert.equal(rectificationState(null, { type: "capture", snapshot: s }), s);
  assert.equal(rectificationState(s, { type: "reset" }), null);
  assert.equal(rectificationState(s, { type: "edit" }), null);
  assert.equal(JSON.stringify(s), before);
});
test("G Invalid/singular/horizon transformations fail before rendering", () => {
  for (const H of [
    [
      [1, 0, 0],
      [0, 0, 0],
      [0, 0, 1],
    ],
    [
      [NaN, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [1, 0, 0],
      [0, 1, 0],
      [0.01, 0, -1],
    ],
  ])
    assert.throws(() => createSnapshot(H, true, 512));
});
test("H Captures are detached; corner changes invalidate results", () => {
  const H = perspective.map((r) => [...r]);
  const s = createSnapshot(H, true, 512),
    before = JSON.stringify(s);
  H[0][2] = 99;
  assert.equal(JSON.stringify(s), before);
  assert.equal(rectificationState(s, { type: "changed" }), null);
  assert.ok(Object.isFrozen(s.H[0]));
  assert.ok(snapshotMatches(s, s.corners, true));
  assert.equal(snapshotMatches(s, s.corners, false), false);
  assert.equal(
    snapshotMatches(
      s,
      s.corners.map((p, i) => (i === 0 ? { x: p.x + 2, y: p.y } : p)),
      true,
    ),
    false,
  );
});
test("I Backward sampling uses forward H, not inverse H", () => {
  const s = createSnapshot(
    [
      [1, 0, 40],
      [0, 1, 20],
      [0, 0, 1],
    ],
    false,
    512,
  );
  const p = perspectiveSample(s, { x: 100, y: 100 });
  assert.ok(p.ok);
  near(p.point.x, 140);
  near(p.point.y, 120);
});
test("J Capture and clearing preserve the original source and caller matrix", () => {
  const H = perspective.map((r) => [...r]),
    before = JSON.stringify({ H, ORIGINAL_CORNERS });
  const s = createSnapshot(H, false, 512);
  rectificationState(s, { type: "reset" });
  assert.equal(JSON.stringify({ H, ORIGINAL_CORNERS }), before);
});

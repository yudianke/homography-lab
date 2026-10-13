import test from "node:test";
import assert from "node:assert/strict";
import {
  angleDegrees,
  distance,
  lineDeviation,
  buildOverlay,
  PERSPECTIVE_EXAMPLE,
} from "../src/math/education.ts";
import {
  transformPoint,
  IDENTITY_MATRIX,
  computeHomography,
  ORIGINAL_CORNERS,
  PREVIEW_CORNERS,
} from "../src/math/homography.ts";
const H = [
  [1, 0.2, 10],
  [0.1, 1, 20],
  [0.001, 0.002, 1],
];
const map = (p) => {
  const r = transformPoint(H, p);
  assert.ok(r.ok);
  return r.point;
};
const near = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
test("A collinearity under a projective map", () => {
  near(
    lineDeviation(
      map({ x: 20, y: 80 }),
      map({ x: 380, y: 80 }),
      map({ x: 170, y: 80 }),
    ),
    0,
  );
});
test("B endpoint and intermediate straight-line mapping", () => {
  const o = buildOverlay(H, "Straight Lines");
  assert.ok(o.ok);
  near(o.deviation, 0);
  for (let x = 40; x <= 360; x += 20)
    near(lineDeviation(o.points[0], o.points[2], map({ x, y: 135 })), 0);
});
test("C angles at 90,60,45 degrees", () => {
  for (const degrees of [90, 60, 45]) {
    const radians = (degrees * Math.PI) / 180;
    near(
      angleDegrees(
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        { x: Math.cos(radians), y: Math.sin(radians) },
      ),
      degrees,
    );
  }
});
test("D Euclidean distances and equal source spacing", () => {
  near(distance({ x: 1, y: 2 }, { x: 4, y: 6 }), 5);
  const o = buildOverlay(IDENTITY_MATRIX, "Distances");
  assert.ok(o.ok);
  assert.deepEqual(o.distances, [140, 140]);
});
test("E known projective distortion has analytically correct lengths", () => {
  const h = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0.002, 1],
    ],
    o = buildOverlay(h, "Distances");
  assert.ok(o.ok);
  const expected = [60, 200, 340].map((y) => ({
    x: 240 / (1 + 0.002 * y),
    y: y / (1 + 0.002 * y),
  }));
  near(
    o.distances[0],
    Math.hypot(expected[1].x - expected[0].x, expected[1].y - expected[0].y),
  );
  near(
    o.distances[1],
    Math.hypot(expected[2].x - expected[1].x, expected[2].y - expected[1].y),
  );
  assert.ok(Math.abs(o.distances[0] - o.distances[1]) > 10);
  const a = buildOverlay(h, "Angles");
  assert.ok(a.ok);
  assert.ok(Math.abs(a.angle - 90) > 1);
});
test("F affine denominator is constant and preserves equal collinear spacing", () => {
  const h = computeHomography(ORIGINAL_CORNERS, PREVIEW_CORNERS);
  assert.ok(h.ok);
  const ws = ORIGINAL_CORNERS.map(
    (p) => transformPoint(h.matrix, p).homogeneous[2],
  );
  ws.forEach((w) => near(w, ws[0]));
  const o = buildOverlay(h.matrix, "Distances");
  assert.ok(o.ok);
  near(o.distances[0], o.distances[1]);
});
test("G invalid geometry has controlled unavailable results", () => {
  assert.equal(
    angleDegrees({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    null,
  );
  assert.equal(distance({ x: NaN, y: 0 }, { x: 0, y: 0 }), null);
  assert.equal(
    lineDeviation({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
    null,
  );
  assert.equal(
    buildOverlay(
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
      "Angles",
    ).ok,
    false,
  );
  assert.equal(buildOverlay(H, "Grid", 0).ok, false);
  assert.equal(
    buildOverlay(
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 1, -200],
      ],
      "Distances",
    ).ok,
    false,
  );
});
test("H overlay points use exactly the homography engine output", () => {
  const source = {
    "Straight Lines": [
      { x: 40, y: 135 },
      { x: 200, y: 135 },
      { x: 360, y: 135 },
    ],
    Angles: [
      { x: 270, y: 247 },
      { x: 143, y: 247 },
      { x: 143, y: 125 },
    ],
    Distances: [
      { x: 240, y: 60 },
      { x: 240, y: 200 },
      { x: 240, y: 340 },
    ],
  };
  for (const mode of Object.keys(source)) {
    const o = buildOverlay(H, mode);
    assert.ok(o.ok);
    assert.deepEqual(o.points, source[mode].map(map));
  }
});
test("Grid densities, bounds and same-H endpoint mapping", () => {
  for (const n of [5, 8, 10]) {
    const original = buildOverlay(IDENTITY_MATRIX, "Grid", n),
      warped = buildOverlay(H, "Grid", n);
    assert.ok(original.ok && warped.ok);
    assert.equal(warped.segments.length, 2 * (n - 1));
    assert.deepEqual(
      warped.segments,
      original.segments.map((pair) => pair.map(map)),
    );
  }
});
test("Perspective example demonstrates unequal distances and reset default does not", () => {
  const h = computeHomography(ORIGINAL_CORNERS, PERSPECTIVE_EXAMPLE);
  assert.ok(h.ok);
  const o = buildOverlay(h.matrix, "Distances");
  assert.ok(o.ok);
  assert.ok(Math.abs(o.distances[0] - o.distances[1]) > 20);
});

test("All modes remain finite and synchronized for default, trapezoid, near rectangle and extreme configurations", () => {
  const configurations = [
    PREVIEW_CORNERS,
    PERSPECTIVE_EXAMPLE,
    [
      { x: 5, y: 5 },
      { x: 395, y: 8 },
      { x: 392, y: 395 },
      { x: 8, y: 392 },
    ],
    [
      { x: 180, y: 35 },
      { x: 240, y: 70 },
      { x: 395, y: 390 },
      { x: 5, y: 360 },
    ],
  ];
  for (const corners of configurations) {
    const result = computeHomography(ORIGINAL_CORNERS, corners);
    assert.ok(result.ok);
    for (const mode of ["Grid", "Straight Lines", "Angles", "Distances"]) {
      const original = buildOverlay(IDENTITY_MATRIX, mode),
        overlay = buildOverlay(result.matrix, mode);
      assert.ok(original.ok && overlay.ok);
      for (let i = 0; i < overlay.segments.length; i++)
        for (let j = 0; j < 2; j++) {
          const expected = transformPoint(
            result.matrix,
            original.segments[i][j],
          );
          assert.ok(expected.ok);
          near(distance(expected.point, overlay.segments[i][j]), 0);
        }
      if (mode === "Straight Lines") near(overlay.deviation, 0);
      if (mode === "Angles") assert.ok(Number.isFinite(overlay.angle));
      if (mode === "Distances")
        assert.ok(overlay.distances.every(Number.isFinite));
    }
  }
});

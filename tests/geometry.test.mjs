import test from "node:test";
import assert from "node:assert/strict";
import {
  validateQuad,
  signedArea,
  moveCorner,
  clampToMap,
} from "../src/math/geometry.ts";
const square = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 400 },
  { x: 0, y: 400 },
];
test("accepts default preview and strongly foreshortened convex quads", () => {
  assert.equal(
    validateQuad([
      { x: 80, y: 55 },
      { x: 400, y: 135 },
      { x: 320, y: 355 },
      { x: 0, y: 275 },
    ]),
    null,
  );
  assert.equal(
    validateQuad([
      { x: 150, y: 140 },
      { x: 240, y: 150 },
      { x: 390, y: 390 },
      { x: 10, y: 360 },
    ]),
    null,
  );
});
test("rejects crossed, reversed, concave and collapsed configurations", () => {
  for (const quad of [
    [square[0], square[2], square[1], square[3]],
    [...square].reverse(),
    moveCorner(square, 1, { x: 100, y: 250 }),
    moveCorner(square, 1, { x: 1, y: 1 }),
  ])
    assert.ok(validateQuad(quad));
});
test("rejects insufficient area, near-collinearity and nonfinite values", () => {
  assert.ok(
    validateQuad([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 30 },
      { x: 0, y: 30 },
    ]),
  );
  assert.ok(
    validateQuad([
      { x: 0, y: 0 },
      { x: 200, y: 1 },
      { x: 400, y: 0 },
      { x: 0, y: 400 },
    ]),
  );
  assert.ok(
    validateQuad([
      { x: 0, y: 0 },
      { x: 200, y: -1 },
      { x: 400, y: 0 },
      { x: 0, y: 400 },
    ]),
  );
  assert.ok(validateQuad(moveCorner(square, 0, { x: NaN, y: 0 })));
});
test("thresholds are configurable and inputs remain unchanged", () => {
  assert.equal(signedArea(square), 160000);
  assert.ok(
    validateQuad(square, {
      minEdgeLength: 401,
      minArea: 0,
      minAltitude: 0,
      minTurnSine: 0,
    }),
  );
  assert.ok(
    validateQuad(square, {
      minEdgeLength: 0,
      minArea: 160001,
      minAltitude: 0,
      minTurnSine: 0,
    }),
  );
  const moved = moveCorner(square, 0, { x: 10, y: 10 });
  assert.deepEqual(square[0], { x: 0, y: 0 });
  assert.deepEqual(moved[0], { x: 10, y: 10 });
  assert.deepEqual(clampToMap({ x: -500, y: 900 }), { x: 0, y: 400 });
});

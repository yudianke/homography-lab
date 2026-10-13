import test from "node:test";
import assert from "node:assert/strict";
import {
  matrixToUniform,
  createWarpRenderer,
  MAP_VIEW,
} from "../src/rendering/warpRenderer.ts";
test("GLSL upload preserves row-major mathematical matrix via column-major storage", () => {
  const h = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    u = matrixToUniform(h),
    p = [3, 5, 1];
  const gpu = [0, 1, 2].map(
    (r) => u[r] * p[0] + u[3 + r] * p[1] + u[6 + r] * p[2],
  );
  assert.deepEqual(
    gpu,
    h.map((row) => row.reduce((s, v, i) => s + v * p[i], 0)),
  );
  assert.deepEqual(MAP_VIEW, { x: -42, y: -40, width: 484, height: 484 });
});
test("Unavailable WebGL fails explicitly", () => {
  assert.throws(
    () => createWarpRenderer({ getContext: () => null }),
    /WebGL is unavailable/,
  );
});

import React from "react";
import { createRoot } from "react-dom/client";
import { createRectificationRenderer } from "../src/rendering/rectificationRenderer";
import { createWarpRenderer } from "../src/rendering/warpRenderer";
import { createSnapshot, perspectiveSample } from "../src/math/rectification";
import {
  computeHomography,
  IDENTITY_MATRIX,
  ORIGINAL_CORNERS,
  PREVIEW_CORNERS,
} from "../src/math/homography";
import RectificationPanel from "../src/components/RectificationPanel";
const result = document.querySelector("#result")!;
const assert = (v: unknown, message: string) => {
  if (!v) throw new Error(message);
};
const source = document.createElement("canvas");
source.width = source.height = 256;
const ctx = source.getContext("2d")!;
ctx.fillStyle = "#ddd";
ctx.fillRect(0, 0, 256, 256);
for (let y = 0; y < 256; y += 32)
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = `rgb(${x},${y},${(x + y) % 256})`;
    ctx.fillRect(x, y, 32, 32);
  }
for (const [x, y, color] of [
  [0, 0, "red"],
  [224, 0, "lime"],
  [224, 224, "blue"],
  [0, 224, "yellow"],
] as const) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 32, 32);
}
ctx.strokeStyle = "white";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(20, 128);
ctx.lineTo(236, 128);
ctx.moveTo(128, 20);
ctx.lineTo(128, 236);
ctx.stroke();
ctx.fillStyle = "black";
ctx.font = "bold 30px sans-serif";
ctx.fillText("H", 164, 100);
document.querySelector("#run")!.addEventListener("click", () => {
  const logs: string[] = [];
  let renderer: ReturnType<typeof createRectificationRenderer> | undefined;
  try {
    const hash = Array.from(ctx.getImageData(0, 0, 256, 256).data).join(",");
    const configurations = [
      ["Identity", ORIGINAL_CORNERS],
      ["Affine", PREVIEW_CORNERS],
      [
        "Perspective",
        [
          { x: 120, y: 40 },
          { x: 280, y: 40 },
          { x: 390, y: 380 },
          { x: 10, y: 380 },
        ],
      ],
      [
        "Extreme",
        [
          { x: 180, y: 40 },
          { x: 220, y: 40 },
          { x: 390, y: 380 },
          { x: 10, y: 380 },
        ],
      ],
    ] as const;
    for (const [name, corners] of configurations) {
      const solve = computeHomography(ORIGINAL_CORNERS, corners);
      assert(solve.ok, "solve failed");
      if (!solve.ok) continue;
      const snap = createSnapshot(solve.matrix, true, 512),
        n = snap.size;
      renderer = createRectificationRenderer(
        document.querySelector("#output")!,
      );
      renderer.prepare(source, snap);
      const { gl } = renderer.resources,
        pixels = new Uint8Array(2 * n * n * 4);
      gl.readPixels(0, 0, 2 * n, n, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const live = createWarpRenderer(document.createElement("canvas"));
      live.setTexture(source);
      live.draw(snap.inverse, n, n);
      const livePixels = new Uint8Array(n * n * 4);
      live.resources.gl.readPixels(
        0,
        0,
        n,
        n,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        livePixels,
      );
      for (let y = 0; y < n; y += 7)
        for (let x = 0; x < n; x += 7)
          for (let c = 0; c < 4; c++)
            assert(
              Math.abs(
                livePixels[(y * n + x) * 4 + c] -
                  pixels[(y * 2 * n + x) * 4 + c],
              ) < 2,
              `${name}: before does not match selected live perspective`,
            );
      live.dispose();
      let max = 0,
        count = 0;
      const at = (x: number, y: number, c: number) =>
        pixels[
          (Math.max(0, Math.min(n - 1, y)) * 2 * n +
            Math.max(0, Math.min(n - 1, x))) *
            4 +
            c
        ];
      for (let y = 8; y < n - 8; y += 11)
        for (let x = 8; x < n - 8; x += 11) {
          const q = perspectiveSample(snap, {
            x: ((x + 0.5) / n) * 400,
            y: (1 - (y + 0.5) / n) * 400,
          });
          assert(q.ok, "sample failed");
          if (!q.ok) continue;
          const sx = ((q.point.x + 42) / 484) * n - 0.5,
            sy = (1 - (q.point.y + 40) / 484) * n - 0.5,
            ix = Math.floor(sx),
            iy = Math.floor(sy),
            fx = sx - ix,
            fy = sy - iy;
          for (let c = 0; c < 4; c++) {
            const expected =
              at(ix, iy, c) * (1 - fx) * (1 - fy) +
              at(ix + 1, iy, c) * fx * (1 - fy) +
              at(ix, iy + 1, c) * (1 - fx) * fy +
              at(ix + 1, iy + 1, c) * fx * fy;
            max = Math.max(
              max,
              Math.abs(expected - pixels[(y * 2 * n + n + x) * 4 + c]),
            );
          }
          count++;
        }
      assert(max < 2, `${name} two-pass mismatch ${max}`);
      for (const [x, y, expected] of [
        [25, 25, [255, 0, 0]],
        [375, 25, [0, 255, 0]],
        [375, 375, [0, 0, 255]],
        [25, 375, [255, 255, 0]],
      ] as const) {
        const offset =
          (Math.floor((1 - y / 400) * n) * 2 * n +
            n +
            Math.floor((x / 400) * n)) *
          4;
        assert(
          expected.every((v, c) => Math.abs(pixels[offset + c] - v) < 25),
          `${name} recovered corner color/orientation mismatch`,
        );
      }
      logs.push(
        `PASS ${name}: ${count} pixels match CPU bilinear sampling of the actual before image; max channel error ${max.toFixed(3)}/255`,
      );
      // Poison only the captured perspective texture. Both panels MUST change.
      gl.bindTexture(gl.TEXTURE_2D, renderer.resources.texture);
      const poison = new Uint8Array(n * n * 4);
      for (let i = 0; i < poison.length; i += 4) {
        poison[i] = 255;
        poison[i + 2] = 255;
        poison[i + 3] = 255;
      }
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        n,
        n,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        poison,
      );
      renderer.drawComparison();
      const center = new Uint8Array(4);
      gl.readPixels(
        n + Math.floor(n / 2),
        Math.floor(n / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        center,
      );
      assert(
        center[0] === 255 && center[1] === 0 && center[2] === 255,
        "After bypassed perspective texture",
      );
      const resources = renderer.resources;
      renderer.dispose();
      assert(
        !gl.isTexture(resources.texture) &&
          !gl.isProgram(resources.program) &&
          !gl.isTexture(resources.base.texture) &&
          !gl.isBuffer(resources.base.buffer),
        "GPU resources leaked",
      );
      renderer = undefined;
    }
    renderer = createRectificationRenderer(document.querySelector("#output")!);
    renderer.prepare(
      source,
      createSnapshot(
        [
          [1, 0, 1000],
          [0, 1, 1000],
          [0, 0, 1],
        ],
        false,
        256,
      ),
    );
    const missing = new Uint8Array(4);
    renderer.resources.gl.readPixels(
      384,
      128,
      1,
      1,
      renderer.resources.gl.RGBA,
      renderer.resources.gl.UNSIGNED_BYTE,
      missing,
    );
    assert(missing[3] === 0, "Missing image region was reconstructed");
    renderer.dispose();
    renderer = undefined;
    logs.push(
      "PASS Recovered colored corners preserve orientation",
      "PASS Cropped/missing regions remain transparent",
    );
    assert(
      hash === Array.from(ctx.getImageData(0, 0, 256, 256).data).join(","),
      "Original source changed",
    );
    logs.push(
      "PASS Mutating only the intermediate perspective image changes the rectified result",
      "PASS Original source pixels unchanged",
      "PASS GPU textures, buffers, programs disposed",
      "ALL RECTIFICATION GPU CHECKS PASSED",
    );
  } catch (error) {
    logs.push(`FAIL ${error}`);
  } finally {
    renderer?.dispose();
    result.textContent = logs.join("\n");
  }
});
document.querySelector("#context")!.addEventListener("click", async () => {
  const root = createRoot(document.querySelector("#lifecycle")!);
  const wait = async (fn: () => boolean) => {
    for (let i = 0; i < 100; i++) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error("Lifecycle check timed out");
  };
  try {
    root.render(
      <RectificationPanel
        snapshot={createSnapshot(IDENTITY_MATRIX, true, 256)}
        onEdit={() => {}}
        onReset={() => {}}
      />,
    );
    await wait(
      () =>
        !!document.querySelector("#lifecycle canvas") &&
        !document.querySelector("#lifecycle [role=status]"),
    );
    const canvas =
        document.querySelector<HTMLCanvasElement>("#lifecycle canvas")!,
      gl = canvas.getContext("webgl")!,
      ext = gl.getExtension("WEBGL_lose_context");
    assert(ext, "Context loss extension unavailable");
    ext!.loseContext();
    await wait(
      () =>
        !!document
          .querySelector("#lifecycle [role=status]")
          ?.textContent?.includes("lost"),
    );
    ext!.restoreContext();
    await wait(() => !document.querySelector("#lifecycle [role=status]"));
    assert(
      canvas.width === 512 && canvas.height === 256,
      "Restored output dimensions incorrect",
    );
    root.unmount();
    assert(!document.querySelector("#lifecycle canvas"), "Unmount failed");
    result.textContent +=
      "\nPASS production rectification component: context loss, restoration, re-render and unmount";
  } catch (error) {
    root.unmount();
    result.textContent += `\nFAIL ${error}`;
  }
});

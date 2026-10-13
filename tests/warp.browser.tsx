import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import MapArtwork from "../src/components/MapArtwork";
import { getMapTexture } from "../src/rendering/mapTexture";
import { createWarpRenderer } from "../src/rendering/warpRenderer";
import {
  computeHomography,
  invertHomography,
  transformPoint,
  ORIGINAL_CORNERS,
  PREVIEW_CORNERS,
  type Quad,
  type Matrix3x3,
} from "../src/math/homography";
import { validateQuad } from "../src/math/geometry";
const sourceRoot = createRoot(document.querySelector("#source")!);
const out = document.querySelector<HTMLPreElement>("#results")!;
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function solve(q: Quad) {
  const h = computeHomography(ORIGINAL_CORNERS, q);
  assert(h.ok, "H failed");
  const inv = invertHomography(h.matrix);
  assert(inv.ok, "Inverse failed");
  return { H: h.matrix, inverse: inv.matrix };
}
async function source(grid: boolean) {
  flushSync(() =>
    sourceRoot.render(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="1024"
        height="1024"
        viewBox="0 0 400 400"
      >
        <MapArtwork showGrid={grid} />
      </svg>,
    ),
  );
  return getMapTexture(
    grid,
    document.querySelector<SVGSVGElement>("#source svg")!,
  );
}
document.querySelector<HTMLButtonElement>("#run")!.onclick = async () => {
  out.textContent = "Running…";
  const messages: string[] = [];
  const pass = (s: string) => {
    messages.push("PASS " + s);
    out.textContent = messages.join("\n");
  };
  const canvas = document.querySelector<HTMLCanvasElement>("#output")!;
  let renderer: ReturnType<typeof createWarpRenderer> | undefined;
  try {
    renderer = createWarpRenderer(canvas);
    const image = await source(true);
    renderer.setTexture(image);
    const reference = document.createElement("canvas");
    reference.width = reference.height = 1024;
    const ctx = reference.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const rgba = ctx.getImageData(0, 0, 1024, 1024).data;
    const gl = renderer.resources.gl;
    function read(inverse: Matrix3x3, width = 484, height = 484) {
      renderer!.draw(inverse, width, height);
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      assert(gl.getError() === gl.NO_ERROR, "GPU error");
      return pixels;
    }
    function expected(x: number, y: number, c: number) {
      const u = (x / 400) * 1024 - 0.5,
        v = (y / 400) * 1024 - 0.5;
      const x0 = Math.floor(u),
        y0 = Math.floor(v),
        fx = u - x0,
        fy = v - y0;
      const at = (xx: number, yy: number) =>
        rgba[
          (Math.max(0, Math.min(1023, yy)) * 1024 +
            Math.max(0, Math.min(1023, xx))) *
            4 +
            c
        ];
      return (
        at(x0, y0) * (1 - fx) * (1 - fy) +
        at(x0 + 1, y0) * fx * (1 - fy) +
        at(x0, y0 + 1) * (1 - fx) * fy +
        at(x0 + 1, y0 + 1) * fx * fy
      );
    }
    function compare(q: Quad, name: string, width = 484, height = 484) {
      assert(validateQuad(q) === null, name + " invalid quad");
      const { H, inverse } = solve(q);
      const pixels = read(inverse, width, height);
      let checked = 0,
        maxError = 0,
        worst = "";
      for (let y = 5; y < height; y += 11)
        for (let x = 5; x < width; x += 11) {
          const p = transformPoint(inverse, {
            x: -42 + (484 * (x + 0.5)) / width,
            y: -40 + 484 * (1 - (y + 0.5) / height),
          });
          if (
            !p.ok ||
            p.point.x < 2 ||
            p.point.y < 2 ||
            p.point.x > 398 ||
            p.point.y > 398
          )
            continue;
          for (let c = 0; c < 4; c++) {
            const err = Math.abs(
              pixels[(y * width + x) * 4 + c] -
                expected(p.point.x, p.point.y, c),
            );
            if (err > maxError) {
              maxError = err;
              worst = JSON.stringify({
                x,
                y,
                p: p.point,
                c,
                gpu: pixels[(y * width + x) * 4 + c],
                cpu: expected(p.point.x, p.point.y, c),
              });
            }
          }
          checked++;
        }
      assert(checked > 20, name + " too few interior samples");
      assert(
        maxError < 8,
        name + " CPU/GPU color mismatch " + maxError + " " + worst,
      );
      pass(
        `${name}: ${checked} sampled pixels, max channel error ${maxError.toFixed(3)}/255`,
      );
      for (const [label, x, y] of [
        ["Museum", 211, 70],
        ["Station", 215, 318],
        ["Home", 50, 206],
        ["River", 375, 175],
      ] as const) {
        const d = transformPoint(H, { x, y });
        assert(d.ok, "landmark transform");
        const px = Math.floor(((d.point.x + 42) / 484) * width),
          py = Math.floor((1 - (d.point.y + 40) / 484) * height);
        const back = transformPoint(inverse, {
          x: -42 + (484 * (px + 0.5)) / width,
          y: -40 + 484 * (1 - (py + 0.5) / height),
        });
        assert(back.ok, "landmark inverse");
        let err = 0;
        for (let c = 0; c < 4; c++)
          err = Math.max(
            err,
            Math.abs(
              pixels[(py * width + px) * 4 + c] -
                expected(back.point.x, back.point.y, c),
            ),
          );
        assert(err < 8, label + " mismatch " + err);
      }
      for (const y of [135, 247, 40, 80, 120]) {
        const points = [0, 200, 400].map((x) => transformPoint(H, { x, y }));
        assert(
          points.every((p) => p.ok),
          "line projection",
        );
        const [a, b, c] = points.map((p) => (p.ok ? p.point : { x: 0, y: 0 }));
        assert(
          Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) <
            1e-7,
          "Bent line",
        );
      }
      return pixels;
    }
    compare(ORIGINAL_CORNERS, "Identity");
    const baseline = compare(PREVIEW_CORNERS, "Default perspective");
    const trapezoid: Quad = [
      { x: 120, y: 40 },
      { x: 280, y: 40 },
      { x: 390, y: 380 },
      { x: 10, y: 380 },
    ];
    compare(trapezoid, "Trapezoid");
    compare(
      [
        { x: 180, y: 35 },
        { x: 240, y: 70 },
        { x: 395, y: 390 },
        { x: 5, y: 360 },
      ],
      "Extreme valid perspective",
    );
    compare(trapezoid, "Mobile resolution", 320, 320);
    compare(trapezoid, "2x device-pixel resolution", 968, 968);
    const reset = read(solve(PREVIEW_CORNERS).inverse);
    assert(
      reset.every((v, i) => v === baseline[i]),
      "Reset pixels differ",
    );
    pass("Reset restores exact default framebuffer");
    renderer.setTexture(await source(false));
    const noGrid = read(solve(PREVIEW_CORNERS).inverse);
    assert(
      noGrid.some((v, i) => v !== baseline[i]),
      "Grid toggle did not change pixels",
    );
    renderer.setTexture(await source(true));
    assert(
      read(solve(PREVIEW_CORNERS).inverse).every((v, i) => v === baseline[i]),
      "Cached grid image changed",
    );
    pass("Grid off/on and cached texture restore");
    pass(
      "Museum, Station, Home, River mapping and road/grid collinearity in all configurations",
    );
    const start = performance.now();
    for (let i = 0; i < 120; i++)
      renderer.draw(
        solve(i % 2 ? trapezoid : PREVIEW_CORNERS).inverse,
        484,
        484,
      );
    gl.finish();
    pass(
      `120 draw/solve updates completed in ${(performance.now() - start).toFixed(1)} ms (local throughput check, not an FPS guarantee)`,
    );
    const resources = renderer.resources;
    renderer.dispose();
    assert(
      !gl.isProgram(resources.program) &&
        !gl.isBuffer(resources.buffer) &&
        !gl.isTexture(resources.texture) &&
        resources.shaders.every((s) => !gl.isShader(s)),
      "Resources retained",
    );
    pass("GPU program, buffer, texture and shaders deleted");
    renderer = undefined;
    const unsupported = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    let failed = false;
    try {
      createWarpRenderer(unsupported);
    } catch {
      failed = true;
    }
    assert(failed, "Unavailable WebGL not rejected");
    pass("Unavailable WebGL produces explicit failure");
    out.textContent += "\nALL GPU CHECKS PASSED";
  } catch (error) {
    out.textContent +=
      "\nFAIL " + (error instanceof Error ? error.stack : String(error));
  } finally {
    renderer?.dispose();
  }
};

// Exercise the production React component's context-loss and cleanup lifecycle.
import WarpedMap from "../src/components/WarpedMap";
const lifecycleRoot = createRoot(document.querySelector("#lifecycle")!);
const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
document.querySelector<HTMLButtonElement>("#context")!.onclick = async () => {
  const report = document.createElement("pre");
  document.querySelector("#lifecycle")!.after(report);
  try {
    flushSync(() =>
      lifecycleRoot.render(
        <svg viewBox="-42 -40 484 484" width="400" height="400">
          <WarpedMap inverse={solve(PREVIEW_CORNERS).inverse} showGrid={true} />
        </svg>,
      ),
    );
    await nextPaint();
    const canvas =
      document.querySelector<HTMLCanvasElement>("#lifecycle canvas")!;
    const gl = canvas.getContext("webgl")!;
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension) {
      report.textContent = "SKIP context-loss extension unavailable";
      return;
    }
    function event(name: string) {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(name + " timed out")),
          5000,
        );
        canvas.addEventListener(
          name,
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
    }
    const lost = event("webglcontextlost");
    extension.loseContext();
    await lost;
    await nextPaint();
    assert(
      document
        .querySelector("#lifecycle .warp-error")
        ?.textContent?.includes("context lost"),
      "Context loss warning absent",
    );
    const restored = event("webglcontextrestored");
    extension.restoreContext();
    await restored;
    await nextPaint();
    await nextPaint();
    await new Promise<void>((resolve, reject) => {
      const host = document.querySelector("#lifecycle")!;
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("Recovery: " + host.textContent));
      }, 5000);
      const observer = new MutationObserver(() => {
        if (!host.querySelector(".warp-error")) {
          clearTimeout(timer);
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(host, { childList: true, subtree: true });
      if (!host.querySelector(".warp-error")) {
        clearTimeout(timer);
        observer.disconnect();
        resolve();
      }
    });
    assert(!gl.isContextLost(), "Context still lost");
    assert(gl.getError() === gl.NO_ERROR, "Error after restoration");
    flushSync(() => lifecycleRoot.render(null));
    assert(!document.querySelector("#lifecycle canvas"), "Unmount left canvas");
    report.textContent =
      "PASS production component: context loss warning, context restoration, texture reload, and unmount";
  } catch (error) {
    report.textContent = "FAIL " + String(error);
  } finally {
    flushSync(() => lifecycleRoot.render(null));
  }
};

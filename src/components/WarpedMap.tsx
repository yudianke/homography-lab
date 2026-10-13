import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Matrix3x3 } from "../math/homography";
import {
  createWarpRenderer,
  type WarpRenderer,
} from "../rendering/warpRenderer";
import { getMapTexture } from "../rendering/mapTexture";
import MapArtwork from "./MapArtwork";
export default function WarpedMap({
  inverse,
  showGrid,
  onGpuStatus,
}: {
  inverse: Matrix3x3 | null;
  showGrid: boolean;
  onGpuStatus?: (status: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<WarpRenderer | null>(null);
  const source = useRef<SVGSVGElement>(null);
  const latestInverse = useRef(inverse);
  const [generation, setGeneration] = useState(0),
    [status, setStatus] = useState("Loading map texture…");
  const drawRef = useRef<() => void>(() => {});
  useEffect(() => { onGpuStatus?.(status); }, [status, onGpuStatus]);
  useLayoutEffect(() => {
    const element = canvas.current!;
    let frame = 0,
      disposed = false;
    function draw() {
      if (disposed) return;
      const bounds = element.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      try {
        renderer.current?.draw(
          latestInverse.current,
          Math.max(1, Math.round(bounds.width * dpr)),
          Math.max(1, Math.round(bounds.height * dpr)),
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "WebGL draw failed.",
        );
      }
    }
    drawRef.current = schedule;
    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; draw(); });
    }
    function lost(event: Event) {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      setStatus("WebGL context lost. Waiting for the browser to restore it…");
    }
    function restored() {
      setGeneration((v) => v + 1);
    }
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", restored);
    const observer = new ResizeObserver(schedule);
    observer.observe(element.closest("svg")!);
    window.addEventListener("resize", schedule);
    // Re-register the media query after a display/DPR change.
    let media: MediaQueryList;
    function watchDpr() {
      media?.removeEventListener("change", watchDpr);
      media = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      media.addEventListener("change", watchDpr);
      schedule();
    }
    watchDpr();
    try {
      renderer.current = createWarpRenderer(element);
      setStatus("Loading map texture…");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "WebGL initialization failed.",
      );
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      media?.removeEventListener("change", watchDpr);
      element.removeEventListener("webglcontextlost", lost);
      element.removeEventListener("webglcontextrestored", restored);
      renderer.current?.dispose();
      renderer.current = null;
      drawRef.current = () => {};
    };
  }, [generation]);
  useLayoutEffect(() => {
    latestInverse.current = inverse;
    drawRef.current();
  }, [inverse, generation]);
  useEffect(() => {
    let stale = false;
    getMapTexture(showGrid, source.current!)
      .then((image) => {
        if (
          stale ||
          !renderer.current ||
          renderer.current.resources.gl.isContextLost()
        )
          return;
        try {
          renderer.current.setTexture(image);
          setStatus("");
          drawRef.current();
        } catch (error) {
          setStatus(
            error instanceof Error ? error.message : "Texture upload failed.",
          );
        }
      })
      .catch((error) => {
        if (!stale) setStatus(error.message);
      });
    return () => {
      stale = true;
    };
  }, [showGrid, generation]);
  return (
    <foreignObject
      x="-42"
      y="-40"
      width="484"
      height="484"
      className="warp-layer"
    >
      <div className="warp-surface">
        <svg
          ref={source}
          xmlns="http://www.w3.org/2000/svg"
          width="1024"
          height="1024"
          viewBox="0 0 400 400"
          className="texture-source"
          aria-hidden="true"
        >
          <MapArtwork showGrid={showGrid} />
        </svg>
        <canvas
          ref={canvas}
          aria-label="Map warped by the displayed homography"
          style={{ visibility: status ? "hidden" : "visible" }}
        />
        {!onGpuStatus && (status || !inverse) && (
          <div className="warp-error" role="status">
            {status || "Warp unavailable: the homography is invalid."}
          </div>
        )}
      </div>
    </foreignObject>
  );
}

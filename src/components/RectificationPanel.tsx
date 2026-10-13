import { useEffect, useRef, useState } from "react";
import type { RectificationSnapshot } from "../math/rectification";
import { createRectificationRenderer } from "../rendering/rectificationRenderer";
import { getMapTexture } from "../rendering/mapTexture";
import MapArtwork from "./MapArtwork";
import { Robot } from "./Header";

export default function RectificationPanel({
  snapshot,
  onEdit,
  onReset,
}: {
  snapshot: RectificationSnapshot;
  onEdit: () => void;
  onReset: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    source = useRef<SVGSVGElement>(null),
    panel = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("Generating rectified image…"),
    [generation, setGeneration] = useState(0);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [snapshot]);
  useEffect(() => {
    const element = canvas.current!;
    let stale = false;
    let renderer: ReturnType<typeof createRectificationRenderer> | undefined;
    const lost = (event: Event) => {
      event.preventDefault();
      setStatus("WebGL context lost. Waiting for restoration…");
    };
    const restored = () => setGeneration((v) => v + 1);
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", restored);
    setStatus("Generating rectified image…");
    try {
      renderer = createRectificationRenderer(element);
      getMapTexture(snapshot.grid, source.current!)
        .then((image) => {
          if (stale || renderer!.resources.gl.isContextLost()) return;
          try {
            renderer!.prepare(image, snapshot);
            setStatus("");
          } catch (error) {
            setStatus(
              error instanceof Error ? error.message : "Rectification failed.",
            );
          }
        })
        .catch((error) => {
          if (!stale) setStatus(String(error));
        });
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Rectification is unavailable.",
      );
    }
    return () => {
      stale = true;
      element.removeEventListener("webglcontextlost", lost);
      element.removeEventListener("webglcontextrestored", restored);
      renderer?.dispose();
    };
  }, [snapshot, generation]);
  return (
    <section
      ref={panel}
      tabIndex={-1}
      className="panel rectification-panel"
      aria-labelledby="rectification-title"
    >
      <div className="rectification-heading">
        <div>
          <div className="eyebrow">BRING THE MAP BACK · PAGE 11</div>
          <h2 id="rectification-title">Perspective Rectification</h2>
        </div>
        <span className="pill">
          Captured perspective · {snapshot.size} × {snapshot.size}
        </span>
      </div>
      <div className="rectification-labels">
        <h3>Before — Perspective View</h3>
        <h3>After — Rectified View</h3>
      </div>
      <div className="rectification-images">
        <svg
          ref={source}
          xmlns="http://www.w3.org/2000/svg"
          width="1024"
          height="1024"
          viewBox="0 0 400 400"
          className="texture-source"
          aria-hidden="true"
        >
          <MapArtwork showGrid={snapshot.grid} />
        </svg>
        <canvas
          ref={canvas}
          aria-label="Captured perspective image on the left and image-to-image rectification on the right"
          style={{ visibility: status ? "hidden" : "visible" }}
        />
        {status && (
          <p role="status" className="rectification-status">
            {status}
          </p>
        )}
      </div>
      <div className="lesson-guide">
        <Robot />
        <p>
          Great! We used the homography to recover a front-facing view of the
          map.
        </p>
      </div>
      <p>
        The perspective image compresses different parts of this planar map by
        different amounts. Inverse homography returns its geometry to a
        front-facing square. This comparison captures the map image without
        editing handles or educational overlays; changing corners or Show Grid
        clears it.
      </p>
      <div className="rectification-equations">
        <span>Forward mapping: p′ ∼ Hp</span>
        <span>Inverse mapping: p ∼ H⁻¹p′</span>
        <span>Backward sampling: I_rectified(p) = I_perspective(Hp)</span>
      </div>
      <p>
        For each output pixel, backward sampling uses <strong>forward H</strong>{" "}
        to locate its color in the captured perspective image. Homogeneous
        division is implicit. Bilinear interpolation blends four neighboring
        pixels.
      </p>
      <p className="sampling-note">
        <strong>Geometry returns; lost detail does not.</strong> Perspective
        compression reduces detail, enlarging it cannot recover information
        never captured, and bilinear interpolation may blur it. Cropped or
        missing regions stay transparent. Repeated resampling can degrade
        quality; each click starts from a fresh perspective image, without
        sharpening or reconstruction.
      </p>
      <div className="actions">
        <button onClick={onEdit}>Back to Editing</button>
        <button onClick={onReset}>Reset Transformation</button>
      </div>
    </section>
  );
}

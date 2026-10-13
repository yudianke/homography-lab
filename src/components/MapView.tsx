import type { Corners, Point2D, Matrix3x3 } from "../math/homography";
import WarpedMap from "./WarpedMap";
import GeometryOverlay from "./GeometryOverlay";
import type { Overlay, EducationMode } from "../math/education";
import MapArtwork from "./MapArtwork";
import type { CornerInteraction } from "../hooks/useCornerInteraction";
type Props = {
  overlay?: Overlay;
  mode?: EducationMode;
  perspective?: boolean;
  corners: Corners;
  showGrid: boolean;
  showPoints: boolean;
  interaction?: CornerInteraction;
  samplePoint?: Point2D;
  inverse?: Matrix3x3 | null;
  onGpuStatus?: (status: string) => void;
};
export default function MapView({
  perspective = false,
  corners,
  showGrid,
  showPoints,
  interaction,
  samplePoint,
  inverse,
  onGpuStatus,
  overlay,
  mode,
}: Props) {
  return (
    <svg
      className={`map-svg ${perspective ? "interactive-map" : ""} ${interaction?.active != null ? "is-dragging" : ""}`}
      viewBox="-42 -40 484 484"
      role={perspective ? "group" : "img"}
      {...interaction?.handlers}
      aria-label={
        perspective
          ? "Live perspective map. Focus a corner and use arrow keys; Shift moves faster."
          : "Top-down map with roads, a garden, museum, home and station."
      }
    >
      {!perspective && (
        <g>
          <MapArtwork showGrid={showGrid} />
          {!perspective && (
            <rect
              width="400"
              height="400"
              fill="none"
              stroke={perspective ? "#26998d" : "#397bce"}
              strokeWidth="2"
            />
          )}
        </g>
      )}
      {perspective && (
        <WarpedMap inverse={inverse ?? null} showGrid={showGrid} onGpuStatus={onGpuStatus} />
      )}
      {perspective && (
        <polygon
          className={
            interaction?.warning ? "quad-boundary invalid" : "quad-boundary"
          }
          points={corners.map((p) => `${p.x},${p.y}`).join(" ")}
        />
      )}
      {overlay && mode && (
        <GeometryOverlay overlay={overlay} mode={mode} showGrid={showGrid} />
      )}
      {showPoints &&
        corners.map((p, i) => (
          <g
            key={i}
            data-corner={i}
            transform={`translate(${p.x} ${p.y})`}
            className={
              perspective
                ? `corner-handle ${interaction?.active === i ? "active" : ""} ${interaction?.selected === i ? "selected" : ""}`
                : undefined
            }
            tabIndex={perspective ? 0 : undefined}
            role={perspective ? "button" : undefined}
            aria-label={
              perspective
                ? `Corner ${"ABCD"[i]} prime, x ${p.x.toFixed(1)}, y ${p.y.toFixed(1)}. Use arrow keys to move.`
                : undefined
            }
          >
            {perspective && <circle className="handle-halo" r="22" />}
            <circle
              r="8"
              fill="white"
              stroke={perspective ? "#158d82" : "#286ad1"}
              strokeWidth="3"
            />
            <text
              x={i === 0 || i === 3 ? -18 : 18}
              y={i < 2 ? -16 : 27}
              textAnchor="middle"
              fill={perspective ? "#08786e" : "#2359a8"}
              fontSize="16"
              fontWeight="700"
            >
              {"ABCD"[i]}
              {perspective ? "′" : ""}
            </text>
          </g>
        ))}
      {samplePoint && (
        <g
          className="sample-point"
          transform={`translate(${samplePoint.x} ${samplePoint.y})`}
          aria-label={perspective ? "Mapped sample P prime" : "Center sample P"}
        >
          <circle r="8" />
          <path d="M-12 0H12M0-12V12" />
          <text x="14" y="-12">
            P{perspective ? "′" : ""}
          </text>
        </g>
      )}
    </svg>
  );
}

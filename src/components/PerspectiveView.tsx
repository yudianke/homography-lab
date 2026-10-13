import MapView from "./MapView";
import type { Overlay, EducationMode } from "../math/education";
import type { Corners, Point2D, Matrix3x3 } from "../math/homography";
import type { CornerInteraction } from "../hooks/useCornerInteraction";
export default function PerspectiveView(props: {
  overlay: Overlay;
  mode: EducationMode;
  corners: Corners;
  showGrid: boolean;
  showPoints: boolean;
  interaction: CornerInteraction;
  samplePoint?: Point2D;
  inverse: Matrix3x3 | null;
  onGpuStatus?: (status: string) => void;
  gpuReady?: boolean;
  gpuStatus?: string;
}) {
  return (
    <section className="panel visual">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">02 / ROBOT SPACE</span>
          <h2>Perspective View</h2>
        </div>
        <span className="tag teal">{props.gpuReady === false ? "GPU unavailable / loading" : "Live perspective"}</span>
      </div>
      <div className="map-stage perspective">
        <MapView {...props} perspective />
        <span className="preview-label">{props.gpuReady === false ? "GEOMETRY OVERLAY · IMAGE UNAVAILABLE" : "LIVE PERSPECTIVE TRANSFORMATION"}</span>
      </div>
      {props.gpuStatus && <p className="gpu-status" role="status">{props.gpuStatus}</p>}
      <div className="panel-foot">
        <span className="dot teal-dot" />
        {props.gpuReady === false ? "The mathematical overlays remain interactive; the GPU image is unavailable." : props.showPoints
          ? "Drag a corner and watch how every point on the map follows the same homography."
          : "Enable Show Corresponding Points to drag the corners."}
      </div>
      <div className="coordinate-readout" aria-live="polite" aria-atomic="true">
        {props.interaction.selected !== null ? (
          <>
            <strong>{"ABCD"[props.interaction.selected]}′</strong> x{" "}
            {props.corners[props.interaction.selected].x.toFixed(1)} · y{" "}
            {props.corners[props.interaction.selected].y.toFixed(1)}
          </>
        ) : (
          "Select a corner · arrow keys also move points"
        )}
        {props.interaction.warning && (
          <span className="constraint-warning">
            {props.interaction.warning}
          </span>
        )}
      </div>
    </section>
  );
}

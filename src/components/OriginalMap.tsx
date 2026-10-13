import MapView from "./MapView";
import type { Overlay, EducationMode } from "../math/education";
import type { Corners, Point2D } from "../math/homography";
export default function OriginalMap(props: {
  overlay: Overlay;
  mode: EducationMode;
  corners: Corners;
  showGrid: boolean;
  showPoints: boolean;
  samplePoint?: Point2D;
}) {
  return (
    <section className="panel visual">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / MAP SPACE</span>
          <h2>Original Map</h2>
        </div>
        <span className="tag">Top-down view</span>
      </div>
      <div className="map-stage">
        <MapView {...props} />
        <span className="axis">y ↓ &nbsp; x →</span>
      </div>
      <div className="panel-foot">
        <span className="dot blue" />
        Our world, seen from above.
        <span className="coordinate">400 × 400 units</span>
      </div>
    </section>
  );
}

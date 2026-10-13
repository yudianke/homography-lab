import { publicAsset } from "../assets";
export function Robot() {
  return (
    <img
      className="robot-art"
      src={publicAsset("comic/robot-h.webp")}
      width="48"
      height="48"
      alt=""
      aria-hidden="true"
    />
  );
}
export default function Header() {
  return (
    <header>
      <div className="brand">
        <span className="brand-icon">
          <Robot />
        </span>
        <div>
          <h1>
            Homography Lab<span className="beta">COMIC + LAB</span>
          </h1>
          <p>
            Drag, Transform, Understand — An Interactive Journey into
            Perspective Geometry
          </p>
        </div>
      </div>
      <div className="course">
        NYU Robot Perception<span>Creative Project 1</span>
      </div>
    </header>
  );
}

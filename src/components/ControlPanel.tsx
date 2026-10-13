type Props = {
  grid: boolean;
  points: boolean;
  matrix: boolean;
  onGrid: () => void;
  onPoints: () => void;
  onMatrix: () => void;
  onReset: () => void;
  onRectify: () => void;
  canRectify: boolean;
};
export default function ControlPanel(p: Props) {
  return (
    <section
      id="rectification-controls"
      tabIndex={-1}
      className="panel controls"
      aria-label="View controls"
    >
      <div className="control-title">
        View controls<span>Make the geometry visible</span>
      </div>
      <div className="toggles">
        {[
          ["Show Grid", p.grid, p.onGrid],
          ["Show Corresponding Points", p.points, p.onPoints],
          ["Show Matrix", p.matrix, p.onMatrix],
        ].map(([label, checked, action]) => (
          <label className="toggle" key={String(label)}>
            <input
              type="checkbox"
              checked={Boolean(checked)}
              onChange={action as () => void}
            />
            <span>{String(label)}</span>
          </label>
        ))}
      </div>
      <div className="actions">
        <button onClick={p.onReset}>↺ &nbsp; Reset Transformation</button>
        <button
          onClick={p.onRectify}
          disabled={!p.canRectify}
          title={
            p.canRectify
              ? "Recover a front-facing image from the current perspective"
              : "A ready WebGL map and a valid homography are required"
          }
        >
          Rectify View
        </button>
      </div>
    </section>
  );
}

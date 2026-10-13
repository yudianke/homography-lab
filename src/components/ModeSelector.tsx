import { MODES, type EducationMode } from "../math/education";
export default function ModeSelector({
  mode,
  onMode,
  density,
  onDensity,
  onExample,
}: {
  mode: EducationMode;
  onMode: (mode: EducationMode) => void;
  density: number;
  onDensity: (density: number) => void;
  onExample: () => void;
}) {
  return (
    <section className="panel mode-controls" aria-label="Geometry lessons">
      <div>
        <span className="eyebrow">WHAT CHANGES? WHAT STAYS?</span>
        <div
          className="mode-buttons"
          role="group"
          aria-label="Visualization mode"
        >
          {MODES.map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => onMode(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      {mode === "Grid" && (
        <label className="density">
          Grid cells{" "}
          <select
            value={density}
            onChange={(e) => onDensity(Number(e.target.value))}
          >
            <option value={5}>5 × 5</option>
            <option value={8}>8 × 8</option>
            <option value={10}>10 × 10</option>
          </select>
        </label>
      )}
      <button onClick={onExample} className="example-button">
        Try perspective example
      </button>
    </section>
  );
}

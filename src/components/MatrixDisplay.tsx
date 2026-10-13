import type { HomographyDiagnostics } from "../hooks/useHomography";
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "Unavailable";
  if (value === 0) return "0.0000";
  return Math.abs(value) < 0.001 || Math.abs(value) >= 10000
    ? value.toExponential(3)
    : value.toFixed(4);
}
export default function MatrixDisplay({
  diagnostics: d,
  onComic,
}: {
  diagnostics: HomographyDiagnostics;
  onComic?: () => void;
}) {
  const errors = d.errors?.filter((e) => e.ok).map((e) => e.error);
  return (
    <section className="panel matrix-panel">
      <div className="panel-heading">
        <h2>
          Homography Matrix <em>(H)</em>
        </h2>
        <span className="tag">Live · Step 3</span>
      </div>
      {onComic && (
        <button className="comic-link" onClick={onComic}>
          Inside the Matrix · PDF 10
        </button>
      )}
      {d.result.ok ? (
        <>
          <div className="matrix-row">
            <span className="math">H =</span>
            <div
              className="matrix"
              role="group"
              aria-label="Computed 3 by 3 homography matrix"
            >
              {d.result.matrix.flat().map((n, i) => (
                <span
                  key={i}
                  title={n.toPrecision(16)}
                  className={n ? "nonzero" : ""}
                >
                  {formatNumber(n)}
                </span>
              ))}
            </div>
          </div>
          <div className="matrix-equation">p′ ∼ Hp</div>
        </>
      ) : (
        <p className="math-warning" role="status">
          Transformation unavailable: {d.result.error}
        </p>
      )}
      <p>
        H is defined up to nonzero scale. Normalization: largest-magnitude
        coefficient = +1; h₃₃ may be zero.
      </p>
      <div className="validation-metrics">
        <div>
          <span>Corner Reprojection Error (max)</span>
          <strong>
            {errors?.length === 4
              ? `${formatNumber(Math.max(...errors))} units`
              : "Unavailable"}
          </strong>
        </div>
        <div>
          <span>Inverse consistency · max |H⁻¹H / scale − I|</span>
          <strong>
            {d.inverseError !== null
              ? formatNumber(d.inverseError)
              : "Unavailable"}
          </strong>
        </div>
      </div>
      <p>
        The homography matrix maps points from the original planar map to the
        perspective view. Dragging a corner changes the projective
        transformation.
      </p>
      <div className="perspective-terms">
        <h3>Inside the Matrix</h3>
        <pre aria-label="Symbolic homography matrix">
          {
            "H = [ h₁₁  h₁₂  h₁₃ ]\n    [ h₂₁  h₂₂  h₂₃ ]\n    [ h₃₁  h₃₂  h₃₃ ]"
          }
        </pre>
        <p>
          The first two rows produce homogeneous coordinates a and b. The third
          row gives w = h₃₁x + h₃₂y + h₃₃. Dividing a and b by w creates the
          projective effect.
        </p>
        <div>
          <span>
            h₃₁:{" "}
            <strong>
              {d.result.ok
                ? formatNumber(d.result.matrix[2][0])
                : "Unavailable"}
            </strong>
          </span>
          <span>
            h₃₂:{" "}
            <strong>
              {d.result.ok
                ? formatNumber(d.result.matrix[2][1])
                : "Unavailable"}
            </strong>
          </span>
        </div>
        <p>
          With h₃₁ = h₃₂ = 0 and h₃₃ ≠ 0, w is constant and the mapping is
          affine after normalization. Values above use the largest-magnitude
          coefficient = +1 convention; raw magnitudes depend on scale and are
          not independent measures of perspective strength.
        </p>
      </div>
    </section>
  );
}

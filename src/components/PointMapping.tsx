import type { HomographyDiagnostics } from "../hooks/useHomography";
import { formatNumber } from "./MatrixDisplay";
export default function PointMapping({
  diagnostics: d,
}: {
  diagnostics: HomographyDiagnostics;
}) {
  return (
    <section className="panel point-mapping">
      <div className="panel-heading">
        <h2>Point Mapping</h2>
        <span className="tag sample-tag">● Center sample · P → P′</span>
      </div>
      <div className="mapping-values">
        <div>
          <span>Original (x, y)</span>
          <strong>(200.0000, 200.0000)</strong>
        </div>
        <div>
          <span>Before division (a, b, w)</span>
          <strong>
            {d.sample?.ok
              ? `(${d.sample.homogeneous.map(formatNumber).join(", ")})`
              : "Unavailable"}
          </strong>
        </div>
        <div>
          <span>Transformed (x′, y′) = (a/w, b/w)</span>
          <strong>
            {d.sample?.ok
              ? `(${formatNumber(d.sample.point.x)}, ${formatNumber(d.sample.point.y)})`
              : "Unavailable"}
          </strong>
        </div>
      </div>
      <p>
        {!d.result.ok
          ? d.result.error
          : d.sample && !d.sample.ok
            ? d.sample.error
            : "The amber points and the entire map use the same computed H. The shader samples the source artwork through H⁻¹."}
      </p>
    </section>
  );
}

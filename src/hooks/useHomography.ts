import { useMemo } from "react";
import {
  computeHomography,
  transformPoint,
  invertHomography,
  calculateReprojectionError,
  inverseConsistencyError,
  ORIGINAL_CORNERS,
  type Quad,
  type Point2D,
} from "../math/homography";
export const SAMPLE_POINT: Point2D = { x: 200, y: 200 };
export function useHomography(corners: Quad) {
  return useMemo(() => {
    const result = computeHomography(ORIGINAL_CORNERS, corners);
    if (!result.ok)
      return {
        result,
        sample: null,
        errors: null,
        inverse: null,
        inverseError: null,
      };
    const sample = transformPoint(result.matrix, SAMPLE_POINT);
    const errors = ORIGINAL_CORNERS.map((p, i) =>
      calculateReprojectionError(result.matrix, p, corners[i]),
    );
    const inverse = invertHomography(result.matrix);
    let inverseError: number | null = null;
    if (inverse.ok) {
      try {
        inverseError = inverseConsistencyError(result.matrix, inverse.matrix);
      } catch {
        /* UI reports unavailable rather than invalid numbers. */
      }
    }
    return { result, sample, errors, inverse, inverseError };
  }, [corners]);
}
export type HomographyDiagnostics = ReturnType<typeof useHomography>;

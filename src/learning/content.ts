/** PDF physical pages, including the cover and contents. Chapter numbers differ. */
export const COMIC_PAGES = [
  {
    title: "Perspective Homography",
    summary:
      "Cover: A Robot's Journey from Map to Reality. Robot H sits beside a colorful city map; the street and map show the same town from different viewpoints.",
  },
  {
    title: "Table of Contents",
    summary:
      "The contents list Core Concepts and Overview, then the ten illustrated chapters from perspective formation to advanced projective geometry. Reader numbers refer to physical PDF pages, not chapter numbers.",
  },
  {
    title: "Core Concepts",
    summary:
      "A homography is a projective transformation between planes, represented by a 3×3 matrix. At least four valid point correspondences determine it. Straight lines and collinearity are preserved, while lengths, angles and parallelism generally are not.",
  },
  {
    title: "Overview — How Homography Works",
    summary:
      "Three panels introduce observing a viewpoint, matching the same physical landmarks, and rectifying one planar view into another. The illustrated workflow is Observe, Match, Transform.",
  },
  {
    title: "A Map, Two Views",
    summary:
      "H notices that a flat map looks tilted. Rays connect the map plane through the camera center to the image plane. Rotation and uniform scaling cannot remove general perspective; a homography links the plane's two views.",
  },
  {
    title: "Follow the Light",
    summary:
      "Each point sends a ray toward the camera. In the simplified pinhole model, u = fX/Z and v = fY/Z: farther objects appear smaller. Parallel world lines can meet at vanishing points; directions on one plane have vanishing points on a vanishing line.",
  },
  {
    title: "One Plane, Two Views",
    summary:
      "Corresponding points denote the same location on the plane, even when their coordinates differ. One invertible rule maps the whole plane. A diagram progresses from rigid to similarity, affine and projective transformations.",
  },
  {
    title: "What Changes? What Stays?",
    summary:
      "Four panels show that straight lines and incidence remain, angles can change, equal steps can look unequal, and a homography is not a free-form rubber-sheet warp. Midpoints and ordinary distance ratios need not remain the same.",
  },
  {
    title: "Four Pairs, One Rule",
    summary:
      "Match the same four landmarks in two views. Each pair supplies two independent constraints; use distinct points with no three collinear in either set. Spread-out matches improve stability. Noisy matches and outliers motivate later robust methods.",
  },
  {
    title: "Inside the Matrix",
    summary:
      "Homogeneous coordinates (a,b,w), for nonzero w, represent (a/w,b/w); this extra coordinate is not depth. The rule x′ ∼ Hx has eight independent degrees of freedom because nonzero scale changes nothing. Inverse H reverses the mapping, and H₂H₁ composes two mappings.",
  },
  {
    title: "Bring the Map Back",
    summary:
      "Choose known target dimensions or aspect ratio, estimate the mapping, then sample backward for each target pixel. Interpolation estimates colors between samples. Enlarging a compressed patch does not create new detail, and missing content stays missing.",
  },
  {
    title: "Powerful, with Limits",
    summary:
      "A flat plane can share one homography; a curved surface generally cannot. Translation creates parallax across depths, while ideal pure camera rotation is a special homography case. Examples include documents, planar AR, panoramas and projection art; lens distortion needs separate correction.",
  },
  {
    title: "When Matches Get Messy",
    summary:
      "Advanced reading: feature matching proposes candidates; RANSAC tests minimal sets and refits inliers. Normalized DLT solves Ah = 0 using SVD. Refinement and held-out reprojection checks evaluate the fit. These additional algorithms are not implemented in this lab.",
  },
  {
    title: "Beyond the Flat Map",
    summary:
      "Advanced reading: homogeneous geometry includes points at infinity. Points transform as p′ ∼ Hp, lines as l′ ∼ H⁻ᵀl. Incidence and cross-ratio are preserved. Camera motion and plane geometry shape H; the fundamental matrix instead relates points to epipolar lines.",
  },
] as const;
export function comicPage(page: number) {
  return Number.isFinite(page)
    ? Math.max(1, Math.min(COMIC_PAGES.length, Math.trunc(page)))
    : 1;
}
export function comicPagePath(page: number) {
  return `/comic/page-${String(comicPage(page)).padStart(2, "0")}.webp`;
}
export const CHAPTERS = {
  drag: 5,
  perspective: 6,
  plane: 7,
  geometry: 8,
  correspondence: 9,
  matrix: 10,
  rectification: 11,
} as const;
export function conceptPage(mode: string) {
  return mode === "Grid" ? CHAPTERS.plane : CHAPTERS.geometry;
}
export const JOURNEY = [
  {
    id: "observe",
    title: "Observe",
    page: 5,
    target: "map-lab",
    action: "Show the two views",
    message:
      "Hi! I'm H. Let's see why the same map looks different from another viewpoint.",
    detail:
      "Compare the same planar map in the original and perspective views.",
  },
  {
    id: "transform",
    title: "Transform",
    page: 9,
    target: "map-lab",
    action: "Try the corner handles",
    message:
      "Try dragging a corner! Every point on the map follows the same projective transformation.",
    detail:
      "Four distinct corresponding pairs, with no three collinear in either view, determine H. Focus a corner and use arrow keys; hold Shift for larger steps.",
  },
  {
    id: "geometry",
    title: "Explore Geometry",
    page: 8,
    target: "geometry-lessons",
    action: "Show geometry controls",
    message:
      "Straight lines stay straight, but angles and distances may change!",
    detail:
      "Try each of the three lessons below. A specific transform can preserve an angle or distance; non-preservation is the general rule.",
  },
  {
    id: "matrix",
    title: "Understand the Matrix",
    page: 10,
    target: "matrix-lessons",
    action: "Show the live matrix",
    message:
      "These nine numbers describe our mapping. Only eight degrees of freedom are independent.",
    detail:
      "p′ ∼ Hp: drag a corner and watch H and Point Mapping update. Divide by the final homogeneous coordinate to read the mapped point.",
  },
  {
    id: "rectify",
    title: "Rectify",
    page: 11,
    target: "rectification-controls",
    action: "Show Rectify View",
    message: "Now let's bring the map back using inverse homography!",
    detail:
      "Click Rectify View to resample the captured perspective image. Geometric reversal uses H⁻¹; backward image sampling uses H. Lost detail cannot be recovered.",
  },
] as const;
export function journeyState(
  stage: number | null,
  action:
    | { type: "start" | "next" | "previous" | "exit" }
    | { type: "go"; stage: number },
): number | null {
  if (action.type === "exit") return null;
  if (action.type === "start") return 0;
  if (action.type === "go")
    return Number.isInteger(action.stage) &&
      action.stage >= 0 &&
      action.stage < JOURNEY.length
      ? action.stage
      : stage;
  if (stage === null) return null;
  return Math.max(
    0,
    Math.min(JOURNEY.length - 1, stage + (action.type === "next" ? 1 : -1)),
  );
}

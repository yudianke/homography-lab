# Homography Lab — Step 7

Perspective Homography: A Robot's Journey from Map to Reality.
NYU Robot Perception | Creative Project 1.

## Run

Requires Node.js 22.18+ (Node.js 24 recommended) and npm.

```sh
npm install
npm run dev
```

Open the URL printed by Vite, normally http://127.0.0.1:5173.

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

## Current status — Step 7

Original comic integration, the optional five-stage classroom journey, and UI polish are complete. See [STEP7.md](../STEP7.md) for asset integration, 47 passing tests, browser/GPU verification, screenshots and limitations. Steps 1–6 remain available; [STEP6.md](../STEP6.md) documents the real GPU rectification pipeline.

## Mathematical engine (Step 3)

The existing project, corner reducer, pointer handlers, geometric constraints and Reset behavior are preserved. No dependencies were added.

- `math/homography.ts`: normalized four-correspondence solver, projection, inverse, composition, reprojection error and inverse consistency.
- `hooks/useHomography.ts`: memoized solver and validation derived directly from the existing destination corner state; also retains the inverse for future use.
- `components/MatrixDisplay.tsx`: real matrix, scientific notation, declared scale convention, measured maximum reprojection error and inverse residual, explicit failure messages.
- `components/PointMapping.tsx`: source center, homogeneous triple and perspective-divided destination.
- `MapView`, `OriginalMap`, `PerspectiveView`: amber source P and mapped P′ markers. Map artwork now uses the WebGL renderer described in STEP4.md.
- `App`, `Header`, CSS: Step 3 wiring and small responsive mathematical UI additions.
- `tests/homography.test.mjs`: required mathematical cases and robustness coverage.

## Mathematical engine

Four ordered correspondences A→A′, B→B′, C→C′, D→D′ yield eight homogeneous linear equations in nine coefficients. Both point sets are centered and scaled to RMS radius sqrt(2). The solver constructs the normalized 8×9 DLT system and uses Gaussian elimination with partial row pivoting. It discovers eight independent pivot columns and assigns the remaining free variable as scale, so it does not assume h33 is nonzero. It never inverts the DLT coefficient matrix.

The result is denormalized as H = T_destination⁻¹ H_normalized T_source. The similarity normalization inverse is known analytically. Output matrices use a canonical projective scale: **the largest-magnitude coefficient is +1**. This convention works when h33=0 and may switch the dominant coefficient during dragging; equivalent H matrices still describe the same mapping.

The formulation follows the standard homogeneous linear method described in the [Oxford VGG multiple-view geometry reference code](https://www.robots.ox.ac.uk/~vgg/hzbook/code/). This implementation is independently written in TypeScript and adds the checks below.

Exports:

- `computeHomography(source: Quad, destination: Quad): HomographyResult`
- `transformPoint(H, point): PointTransformResult`, including `(a,b,w)` and `(a/w,b/w)`
- `invertHomography(H): HomographyResult`, using partial-pivot Gauss–Jordan elimination of the 3×3 matrix
- `multiplyHomographies(H2,H1): Matrix3x3`, applying H1 then H2
- `calculateReprojectionError(H,source,destination)`: explicit success/error result with Euclidean error; unlike the brief's numeric example, this cannot return Infinity as a failure sentinel
- `inverseConsistencyError(H,inverse)`: max absolute residual of the product normalized by its mean diagonal

Estimation, inversion and projection return discriminated `ok` results, never a fabricated identity fallback. Composition and inverse-consistency utilities throw `RangeError` for non-finite input, overflow or invalid normalization; the UI handles unavailable diagnostics explicitly. Source and destination corner state is never changed to make a numerical solve succeed.

## Numerical guards and limits

JavaScript double precision is used throughout. Guards include finite input checks, every source/destination triple's normalized area (threshold 1e-8), rank and partial pivot thresholds (1e-12 relative to normalized system scale), DLT residual (1e-8), normalized reprojection residual (1e-7), and near-singular inverse rejection (normalized pivot threshold 1e-12).

Perspective division tests w relative to the sum of absolute denominator terms, preserving scale invariance while rejecting zero or heavily cancelled denominators. Arithmetic overflow returns a controlled failure. A uniformly tiny but well-conditioned quadrilateral is supported through normalization; coincident or nearly collinear geometry is rejected. Very large offsets, extreme condition numbers and values outside floating-point range can be rejected even if an exact-arithmetic transformation exists. This is an exact four-point solver, not a noisy overdetermined SVD fit or RANSAC estimator.

The UI retains Step 2's independent interactive constraints: convex clockwise boundary, minimum edge 24 map units, minimum area 1,600 square units, minimum consecutive triangle altitude 8 units, and minimum turn sine 0.035. These keep normal dragging away from degeneracy; solver checks also protect standalone API use.

## State and visualization

`useCornerInteraction` remains the single source of destination coordinates. `useHomography` computes derived results with `useMemo([corners])`; toggling panels does not rerun the solver. Coordinates use the shared 400×400 map space, x right, y down. The source center is (200,200). Its mapped marker and readout use the same computed matrix as the matrix panel, with no interpolation.

Step 2 behavior remains: primary-pointer capture, inverse screen CTM conversion, grab offset, immediate PointerMove updates, cancellation/lost-capture cleanup, bounded coordinates, reset, and arrow-key movement (2 units; Shift 10). Visibility toggles work independently. The sample markers remain visible as mathematical references even when corner markers are hidden.

The map interior now uses the computed inverse homography in the WebGL shader. See STEP4.md for rendering details and GPU checks. Rectification is available through the two-pass pipeline documented in STEP6.md.

## Verification

The Step 3 baseline included 19 passing tests (the current suite has 47): the previous 4 geometry tests plus 15 mathematical tests covering identity, translation, scaling, affine transforms, perspective, inverse roundtrips, composition, degeneracy, general homogeneous scaling (negative/tiny/large), nonsingular zero-h33, nonfinite/singular/near-singular inputs, projective horizons, tiny normalized geometry, default metrics, and a deterministic sweep of 200 projective estimates with inverse roundtrips. Matrix tests compare mapped points or scale-normalized products, not raw coefficients.

Default Step 1 corner positions produce:

```text
H ≈ [ 0.010000  -0.002500  1.000000 ]
    [ 0.002500   0.006875  0.687500 ]
    [ 0.000000   0.000000  0.012500 ]

Center: (200,200) → (200.00000000000006,205)
Homogeneous center: (2.500000000000001,2.5625,0.0125)
Maximum corner reprojection error: 1.2710574864626038e-13 map units
Normalized inverse consistency error: 1.5901631863120724e-14
```

These are actual floating-point residuals, not forced zeros. The default boundary happens to be affine; dragging individual corners produces nonzero projective coefficients.

Browser verification:

- Dragged each of A′, B′, C′, D′ and confirmed H changed after every drag; point readout and marker changed with it.
- Independently projected the four source corners using the rendered full-precision coefficient tooltips. After the four drags, max residual was 8.04e-14; center mapping (224.55129613631553,189.80782448258137) matched the marker's SVG position to floating-point precision.
- Reset restored the exact initial displayed matrix and center mapping.
- Desktop and 390 px mobile panels inspected; document width matched viewport width with no horizontal overflow.
- Browser console returned no warnings/errors and all nine displayed coefficients were finite.
- TypeScript check and production build passed. No performance benchmark was run; pointer moves trigger memoized synchronous solves of the small fixed-size system.

The Windows sandbox restricts Vite filesystem resolution; approved host execution was used for builds and local preview, as in earlier steps. Physical touch and OS-driven pointer cancellation were not re-tested in Step 3; the dragging implementation is unchanged.

Step 7 integrates the supplied original 14-page comic and extracts Robot H from its cover. The existing planar map remains the live rendering source. Typography uses local system fonts without external font requests.

## Structure

```text
homography-lab/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── MapArtwork.tsx
│   │   ├── MapView.tsx
│   │   ├── OriginalMap.tsx
│   │   ├── PerspectiveView.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── MatrixDisplay.tsx
│   │   ├── PointMapping.tsx
│   │   └── ExplanationPanel.tsx
│   ├── hooks/
│   │   ├── useCornerInteraction.ts
│   │   └── useHomography.ts
│   ├── math/
│   │   ├── geometry.ts
│   │   └── homography.ts
│   ├── styles/index.css
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── geometry.test.mjs
│   └── homography.test.mjs
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

Step 7 is complete. Ready for Step 8 after user approval.






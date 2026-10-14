# Perspective Homography: A Robot's Journey from Map to Reality

## Project Overview

Homography Lab is an interactive educational companion to our NYU Robot Perception Creative Project 1 comic. Robot H guides learners from a flat city map to a perspective view, connecting visual experiments with the mathematics behind planar transformations. Explore freely or follow a five-stage classroom demonstration. The revised 15-page comic, including References, is included, with Team 12 credit and contextual links from the experiments. Comic slides link: https://docs.google.com/presentation/d/1_wD71H8vJC1RAoZC2de5AOFbbW1xu6FpE8jAEqopa9s/edit?usp=sharing

## Features

- Interactive four-corner perspective manipulation, with mouse and keyboard controls.
- Real-time 3×3 homography estimation and WebGL perspective-correct map warping.
- Grid, straight-line, angle and distance demonstrations.
- Point correspondence, homogeneous coordinates and measured reprojection error.
- GPU-based perspective rectification with before/after comparison.
- Integrated comic reader with page navigation, enlarged viewing and companion summaries.
- Optional guided learning, responsive layouts and reduced-motion support.

## Technical Implementation

The application uses React, TypeScript and Vite, with SVG map artwork and geometry overlays. A normalized four-correspondence solver estimates the homography and its inverse. WebGL uses inverse transformation and texture sampling to render the map, while SVG overlays use the same mathematical model.

Two-pass GPU rectification first captures the perspective image into a texture, then samples that image to recover a front-facing view. It does not substitute the original map. Pointer updates and draws are coalesced with animation frames; shader programs, buffers and map textures are reused during dragging. Resources are released on component cleanup and recreated after context restoration. No backend is required.

## Run Locally

Use Node.js 24 LTS and npm. From the project folder:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Validate and build with the existing scripts:

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

For a GitHub Pages project site, use `npm run build -- --mode pages`, then `npm run preview -- --mode pages`. Open `/homography-lab/` on the printed server. Local development defaults to `/`; the Pages build uses `/homography-lab/`. See [manual deployment instructions](MANUAL_DEPLOYMENT.md) for owner-controlled publication and optional custom base paths.

## Testing

The final local release passed **48 automated Node tests**, covering mathematical transformations, invalid quadrilaterals, geometry, rectification, comic integrity and asset paths. Browser checks additionally validated GPU pixels, interactions, responsive layouts, WebGL context restoration, repeated mount/unmount and Reset/Rectify cycles, resource cleanup, and a forced unsupported-WebGL state. TypeScript checks and the production build passed.

The production build was served and tested locally under `/homography-lab/`, including comic assets and lazy-loaded code. Browser harnesses and reproduction steps are documented in the [release report](RELEASE_REPORT.md). These are local regression checks; they do not establish a universal FPS or GPU-memory guarantee.

## 1–2 Minute Demo Walkthrough

1. Show the original and perspective maps (10 seconds).
2. Drag one corner; observe the warp and matrix (15 seconds).
3. Switch between Straight Lines, Angles and Distances (20 seconds).
4. Click **Try perspective example** to reveal unequal apparent spacing (10 seconds).
5. Click **Rectify View** and compare both images (15 seconds).
6. Open the original comic or **Start Guided Demo** (20 seconds).

## Live Demo

[Live demo](https://yudianke.github.io/homography-lab/)

[GitHub repository](https://github.com/yudianke/homography-lab)

The repository owner manages publication manually. A local Pages workflow is included.

## Limitations

GPU image rendering requires a WebGL-compatible browser. Without WebGL, the lab displays guidance and disables rectification while retaining mathematical explanations, geometry overlays and the comic. Extreme perspective compression may reduce visual detail; image rectification cannot recover lost information. Comic pages are raster previews with summaries, not complete text transcriptions. Physical touch and every browser/device combination have not been tested.

This interactive demo was developed with the assistance of OpenAI Codex.

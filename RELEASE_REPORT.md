# Final release report — Step 8

**Status:** local release ready, 2026-10-13. Nothing has been published. No Git/GitHub commands, repository access, authentication or remote deployment were performed. Step 8 is the final development stage.

## Release changes

- Concise English README (approximately 594 words), a 90-second demo and clearly marked placeholder live URL.
- Environment-aware `vite.config.mjs`: root development/default build; `/homography-lab/` for `--mode pages`; optional `VITE_BASE_PATH` override.
- All public comic URLs now use Vite's base, including the cover portrait, original PDF and lazily loaded page images. Map SVG and shader sources are embedded code; map raster textures use local blob URLs.
- Local `.github/workflows/deploy.yml` for main pushes/manual dispatch: Node 24, clean installation, tests, typecheck, Pages build, artifact upload and deployment. The owner must enable Pages and run publication. Instructions are in `MANUAL_DEPLOYMENT.md`.
- Pointer movement coalesces to one pending update per animation frame, flushing the latest position at gesture end. Pending callbacks and pointer capture are released on unmount. Map draws similarly coalesce resize, matrix and texture updates.
- Unsupported/lost WebGL hides the image, gives a readable status outside the geometry layer and disables Rectify until ready. SVG lessons, matrix calculations and comic remain available. No CPU image fallback or solver changes.
- Comic dialog focus restoration now follows component updates instead of depending on a possibly suspended animation frame. Narrow guide buttons wrap/stack rather than clipping labels.

## Performance and lifecycle audit

| Area | Finding |
| --- | --- |
| React and solver | Homography is memoized by corner state; pointer events are coalesced before reducer updates. Other UI changes do not re-estimate H. |
| Texture and shader work | Shader programs/buffers reused; no texture upload or GPU allocation during 100 corner updates per test cycle. Map raster cache holds at most two 1024-square canvases (grid on/off). |
| Canvas and DPR | Live canvas dimensions change only when measured size changes; DPR is capped at 2 and watched. ResizeObserver and window listeners are cleaned up. |
| Rectification | Two passes use the default framebuffer and a GPU perspective texture. No custom framebuffer or renderbuffer objects are allocated. Comparison resolution is fixed for a captured snapshot; CSS resizes it without reallocating the snapshot. |
| Disposal | Textures, buffers, programs and shaders become invalid after disposal; pending draws, observers, DPR listeners and context listeners are removed. Stale async image work cannot upload to an unmounted renderer. |
| Context recovery | Production warp and rectification components recreate resources and reload/re-render after restoration. |

## Verified results

- **48/48 Node tests passed**: all prior 47 tests plus root/subpath asset resolution. Existing tests cover invalid/crossed/degenerate quadrilaterals and numerical robustness.
- `npm run typecheck` and `npm run build -- --mode pages` passed. An isolated clean `npm ci --offline --no-audit --no-fund` installed the locked dependencies successfully.
- Browser release harness passed three component mount/unmount cycles, 300 rapid keyboard corner updates total, resizing, nine Reset/Rectify/close sequences, valid-handle cleanup checks, and forced WebGL initialization failure with disabled Rectify and working comic.
- Original browser guide harness passed all fourteen page loads, page boundaries, chapter links, dialog focus restoration, the complete five-stage journey, geometry modes, rectification and exits without corner reset.
- Warp GPU pixel checks passed identity/default/trapezoid/extreme/mobile/2× resolution, reset, grid caching, landmarks and disposal. Maximum sampled channel error was 0.712/255. A local 120-update draw/solve check took 18.9 ms; it is not an FPS guarantee.
- Rectification GPU tests passed four configurations with 2,116 pixel samples each; maximum channel error was 0.894/255. Tests confirmed orientation, transparent missing areas, actual intermediate-image dependence, unchanged source and disposal.
- Both WebGL component context-loss/restoration/unmount checks passed.
- Production simulation at `http://127.0.0.1:4180/homography-lab/` passed script/CSS loading, lazy comic loading, keyboard and actual pointer dragging, all teaching modes, perspective example, rectification, navigation and refresh. Actual pointer dragging moved A from (122,40) to approximately (161.3,66.2).
- All **20 production files** matched their built bytes over HTTP, including 14 page images, the original PDF, portrait, CSS, main JS, lazy reader JS and index. This detects missing-file HTML fallbacks, not merely HTTP 200 responses.
- Desktop and narrow production layouts inspected; narrow document width and scroll width both measured 342 CSS pixels. Final guide labels are fully readable. No warnings/errors in the inspected production browser console.

Final bundle: main JS **280.95 KB / 89.53 KB gzip**, lazy reader **4.42 / 1.82 KB**, CSS **20.85 / 5.58 KB**. The main JS increased about 1.09 KB uncompressed from Step 7. Comic media stays separate and only the current reader page is mounted.

## Reproduce locally

Run `npm ci`, `npm test`, `npm run typecheck`, then `npm run dev`. Open these development-only harnesses and click their labeled run buttons:

- `/tests/warp.html` — pixel checks and context recovery.
- `/tests/rectification.html` — rectification pixels and context recovery.
- `/tests/learning.html` — comic and guide interactions.
- `/tests/release.html` — repeated lifecycle, resize and forced failure checks.
- `/tests/fallback.html` — visual preview with WebGL intentionally unavailable.

For production: run `npm run build -- --mode pages`, then `npm run preview -- --mode pages --port 4180`. In another terminal, run `node tests/pages-check.mjs`. Set `PREVIEW_ORIGIN` if using another port. Browser harnesses are not bundled into the public site and are not automatically executed by the workflow; its automated gate runs the Node tests, typecheck and build.

## Deliverables and limits

The final ZIP contains source, lockfile, public comic assets, workflow, Vite config, tests, documentation and screenshots; it excludes dependencies, generated dist, local scratch files and Git metadata. `.gitignore` also excludes environment files and temporary test output. Earlier Step reports are retained as historical records; this report is authoritative for the release.

Screenshots: `screenshots/step8-production.jpg`, `step8-webgl-fallback.jpg`, `step8-mobile.jpg`.

No reliable continuous FPS, driver-level GPU memory measurement, physical-touch audit or exhaustive cross-browser/screen-reader audit was performed. Local resource handles and throughput checks are not substitutes for those measurements. Production hosting, account permissions, remote action execution and the placeholder URL remain unverified until the owner publishes. Mathematical/visual limits of extreme perspective, lost information and raster comic zoom remain as described in the README.

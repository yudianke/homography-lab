import {
  useState,
  useMemo,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import LearningJourney, {
  showLearningArea,
} from "./components/LearningJourney";
import { JOURNEY, CHAPTERS, conceptPage } from "./learning/content";
const ComicReader = lazy(() => import("./components/ComicReader"));
import RectificationPanel from "./components/RectificationPanel";
import {
  createSnapshot,
  rectificationState,
  snapshotMatches,
} from "./math/rectification";
import Header, { Robot } from "./components/Header";
import OriginalMap from "./components/OriginalMap";
import PerspectiveView from "./components/PerspectiveView";
import ControlPanel from "./components/ControlPanel";
import MatrixDisplay from "./components/MatrixDisplay";
import ExplanationPanel from "./components/ExplanationPanel";
import { useCornerInteraction } from "./hooks/useCornerInteraction";
import { ORIGINAL_CORNERS, IDENTITY_MATRIX } from "./math/homography";
import {
  buildOverlay,
  type EducationMode,
  type Overlay,
} from "./math/education";
import ModeSelector from "./components/ModeSelector";
import { useHomography, SAMPLE_POINT } from "./hooks/useHomography";
import PointMapping from "./components/PointMapping";
export default function App() {
  const interaction = useCornerInteraction();
  const { corners } = interaction;
  const diagnostics = useHomography(corners);
  const [gpuStatus, setGpuStatus] = useState("Loading map texture…");
  const gpuReady = !gpuStatus;
  const [mode, setMode] = useState<EducationMode>("Grid");
  const [density, setDensity] = useState(5);
  const sourceOverlay = useMemo(
    () => buildOverlay(IDENTITY_MATRIX, mode, density),
    [mode, density],
  );
  const destinationOverlay = useMemo<Overlay>(
    () =>
      diagnostics.result.ok
        ? buildOverlay(diagnostics.result.matrix, mode, density)
        : { ok: false, error: diagnostics.result.error },
    [diagnostics, mode, density],
  );
  const [grid, setGrid] = useState(true),
    [points, setPoints] = useState(true),
    [matrix, setMatrix] = useState(true);
  const [snapshot, dispatchSnapshot] = useReducer(rectificationState, null);
  const [rectificationError, setRectificationError] = useState("");
  const [stage, setStage] = useState<number | null>(null);
  const [comic, setComic] = useState<{ page: number; serial: number } | null>(
    null,
  );
  const comicReturn = useRef<HTMLElement | null>(null);
  const openComic = useCallback((page: number) => {
    comicReturn.current = document.activeElement as HTMLElement;
    setComic((previous) => ({ page, serial: (previous?.serial ?? 0) + 1 }));
  }, []);
  const closeComic = useCallback(() => {
    setComic(null);
    {
      const target = comicReturn.current?.isConnected
        ? comicReturn.current
        : document.getElementById("map-lab");
      target?.focus();
      target?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, []);
  const changeStage = useCallback((next: number | null) => {
    setStage(next);
    if (next === 1) setPoints(true);
    if (next === 2) setMode("Straight Lines");
    if (next === 3) setMatrix(true);
  }, []);
  useEffect(() => {
    dispatchSnapshot({ type: "changed" });
    setRectificationError("");
  }, [corners, grid]);
  function reset() {
    dispatchSnapshot({ type: "reset" });
    setRectificationError("");
    interaction.reset();
  }
  function rectify() {
    if (!gpuReady) return;
    interaction.stop();
    try {
      if (!diagnostics.result.ok) throw new Error(diagnostics.result.error);
      const canvas = document.querySelector<HTMLCanvasElement>(
        ".interactive-map canvas",
      );
      const size = Math.min(2048, Math.max(16, canvas?.width || 512));
      dispatchSnapshot({
        type: "capture",
        snapshot: createSnapshot(diagnostics.result.matrix, grid, size),
      });
      setRectificationError("");
    } catch (error) {
      setRectificationError(
        error instanceof Error ? error.message : "Rectification failed.",
      );
    }
  }
  return (
    <>
      <a className="skip-link" href="#map-lab">
        Skip to interactive maps
      </a>
      <Header />
      <main data-demo={stage === null ? "free" : JOURNEY[stage].id}>
        <section className="intro">
          <div>
            <div className="eyebrow">PERSPECTIVE HOMOGRAPHY</div>
            <h2>
              One map. <span>A different point of view.</span>
            </h2>
            <p>
              A hands-on companion to Perspective Homography: A Robot's Journey
              from Map to Reality.
            </p>
          </div>
          <div className="robot-note">
            <Robot />
            <p>
              Hi, I’m <strong>H!</strong>
              <br />
              Let’s see the world differently.
            </p>
          </div>
        </section>
        <LearningJourney
          stage={stage}
          onStage={changeStage}
          onComic={openComic}
          mode={mode}
          onMode={setMode}
        />
        <div id="geometry-lessons" tabIndex={-1}>
          <ModeSelector
            mode={mode}
            onMode={setMode}
            density={density}
            onDensity={setDensity}
            onExample={interaction.example}
          />
          <div className="context-links">
            <button
              className="comic-link"
              onClick={() => openComic(conceptPage(mode))}
            >
              See this concept in the comic · PDF {conceptPage(mode)}
            </button>
            <button
              className="comic-link"
              onClick={() => openComic(CHAPTERS.drag)}
            >
              Why the map looks skewed · PDF 5–7
            </button>
            <button
              className="comic-link"
              onClick={() => openComic(CHAPTERS.correspondence)}
            >
              Four-point correspondence · PDF 9
            </button>
          </div>
        </div>
        <div
          id="map-lab"
          tabIndex={-1}
          className="visual-grid"
          aria-label="Interactive original and perspective maps"
        >
          <OriginalMap
            overlay={sourceOverlay}
            mode={mode}
            samplePoint={SAMPLE_POINT}
            corners={ORIGINAL_CORNERS}
            showGrid={grid}
            showPoints={points}
          />
          <PerspectiveView
            gpuReady={gpuReady}
            onGpuStatus={setGpuStatus}
            gpuStatus={gpuStatus}
            overlay={destinationOverlay}
            mode={mode}
            inverse={
              diagnostics.inverse?.ok ? diagnostics.inverse.matrix : null
            }
            samplePoint={
              diagnostics.sample?.ok ? diagnostics.sample.point : undefined
            }
            interaction={interaction}
            corners={corners}
            showGrid={grid}
            showPoints={points}
          />
        </div>
        <ControlPanel
          grid={grid}
          points={points}
          matrix={matrix}
          onGrid={() => setGrid((v) => !v)}
          onPoints={() => {
            interaction.stop();
            setPoints((v) => !v);
          }}
          onMatrix={() => setMatrix((v) => !v)}
          onReset={reset}
          onRectify={rectify}
          canRectify={gpuReady && diagnostics.result.ok && !!diagnostics.inverse?.ok}
        />
        <div className="context-links">
          <button
            className="comic-link"
            onClick={() => openComic(CHAPTERS.rectification)}
          >
            Rectification in the comic · PDF 11
          </button>
          {stage !== null && (
            <button
              className="comic-link"
              onClick={() => showLearningArea("journey")}
            >
              Return to guide
            </button>
          )}
        </div>
        {rectificationError && <p role="alert">{rectificationError}</p>}
        {snapshot && snapshotMatches(snapshot, corners, grid) && (
          <RectificationPanel
            snapshot={snapshot}
            onReset={reset}
            onEdit={() => {
              dispatchSnapshot({ type: "edit" });
              document
                .querySelector<HTMLElement>(
                  '.interactive-map [data-corner="0"]',
                )
                ?.focus();
            }}
          />
        )}
        <div
          id="matrix-lessons"
          tabIndex={-1}
          className={`learning-grid ${matrix ? "" : "without-matrix"}`}
        >
          {matrix && (
            <MatrixDisplay
              diagnostics={diagnostics}
              onComic={() => openComic(CHAPTERS.matrix)}
            />
          )}
          <div className="concept-column">
            <ExplanationPanel
              mode={mode}
              source={sourceOverlay}
              destination={destinationOverlay}
              showGrid={grid}
            />
            <PointMapping diagnostics={diagnostics} />
          </div>
        </div>
        {stage === 3 && (
          <button
            className="comic-link"
            onClick={() => showLearningArea("journey")}
          >
            Return to guide
          </button>
        )}
        {comic && (
          <Suspense fallback={<p role="status">Opening comic reader…</p>}>
            <ComicReader
              key={comic.serial}
              initialPage={comic.page}
              onClose={closeComic}
            />
          </Suspense>
        )}
        <footer>
          <span>
            <strong>H</strong> &nbsp; From map to reality, one correspondence at
            a time.
          </span>
          <span>
            Original comic &amp; Robot H · Team 12 · Creative Project 1
          </span>
        </footer>
      </main>
    </>
  );
}

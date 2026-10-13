import { memo, useEffect, useRef, useState } from "react";
import { COMIC_PAGES, comicPage, comicPagePath } from "../learning/content";
import { publicAsset } from "../assets";
const PDF = publicAsset("comic/original-comic.pdf");
function PageImage({ page }: { page: number }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  return (
    <>
      <img
        src={publicAsset(comicPagePath(page))}
        width="1600"
        height="900"
        decoding="async"
        alt={`Original comic, PDF page ${page}: ${COMIC_PAGES[page - 1].title}. An accessible page summary follows the viewer.`}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && <p role="status">Loading page {page}…</p>}
      {status === "error" && (
        <p role="alert">
          This page could not load.{" "}
          <a href={`${PDF}#page=${page}`} target="_blank" rel="noopener">
            Open the original PDF instead
          </a>
          .
        </p>
      )}
    </>
  );
}
function ComicReader({
  initialPage,
  onClose,
}: {
  initialPage: number;
  onClose: () => void;
}) {
  const [page, setPage] = useState(comicPage(initialPage)),
    [enlarged, setEnlarged] = useState(false),
    [zoom, setZoom] = useState(1);
  const panel = useRef<HTMLElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    enlargeButton = useRef<HTMLButtonElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, []);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (enlarged) dialog.current?.showModal();
    else if (restoreFocus.current) {
      enlargeButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [enlarged]);
  function changePage(n: number) {
    setPage(comicPage(n));
    viewport.current?.scrollTo(0, 0);
  }
  function closeEnlarged() {
    restoreFocus.current = true;
    setEnlarged(false);
    setZoom(1);
  }
  const navigation = (
    <div className="comic-navigation">
      <button disabled={page === 1} onClick={() => changePage(page - 1)}>
        Previous page
      </button>
      <label>
        PDF page{" "}
        <select
          value={page}
          onChange={(e) => changePage(Number(e.target.value))}
        >
          {COMIC_PAGES.map((p, i) => (
            <option key={p.title} value={i + 1}>
              {i + 1} — {p.title}
            </option>
          ))}
        </select>
      </label>
      <button disabled={page === 14} onClick={() => changePage(page + 1)}>
        Next page
      </button>
      <span role="status" aria-live="polite">
        Page {page} of 14
      </span>
    </div>
  );
  const summary = (
    <div className="comic-summary">
      <h3>{COMIC_PAGES[page - 1].title}</h3>
      <p>{COMIC_PAGES[page - 1].summary}</p>
      {page === 11 && (
        <p className="notation-note">
          <strong>Same rule, different H convention.</strong> This comic page
          defines H from photo to target, so its backward sampler uses H⁻¹. Our
          lab defines H from original map to perspective, so our rectifier's
          backward sampler uses H. Both sample the input image from each output
          pixel.
        </p>
      )}
      <p className="comic-caption">
        Companion summary for accessibility; the original page above is
        unchanged. PDF page numbers include the cover and contents.
      </p>
    </div>
  );
  return (
    <section
      id="comic-reader"
      ref={panel}
      tabIndex={-1}
      className="panel comic-reader"
      aria-labelledby="comic-title"
    >
      <div className="comic-heading">
        <div>
          <p className="eyebrow">CREATIVE PROJECT 1 · 14 ORIGINAL PAGES</p>
          <h2 id="comic-title">Explore the Original Comic</h2>
        </div>
        <button onClick={onClose}>Return to Interactive Lab</button>
      </div>
      <p className="comic-byline">
        Perspective Homography: A Robot's Journey from Map to Reality · Team 12
      </p>
      {!enlarged && (
        <>
          {navigation}
          <div className="comic-page">
            <PageImage key={page} page={page} />
          </div>
          <div className="comic-actions">
            <button ref={enlargeButton} onClick={() => setEnlarged(true)}>
              Enlarge page
            </button>
            <a href={`${PDF}#page=${page}`} target="_blank" rel="noopener">
              Open original PDF (new tab)
            </a>
            <a href={PDF} download>
              Download original PDF · 5.2 MB
            </a>
          </div>
          {summary}
        </>
      )}
      {enlarged && (
        <dialog
          ref={dialog}
          className="comic-dialog"
          aria-labelledby="enlarged-title"
          onCancel={(e) => {
            e.preventDefault();
            closeEnlarged();
          }}
        >
          <div className="comic-heading">
            <h2 id="enlarged-title">Comic · enlarged reading</h2>
            <button autoFocus onClick={closeEnlarged}>
              Close enlarged view
            </button>
          </div>
          {navigation}
          <label className="zoom-control">
            Reading zoom{" "}
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={1}>Fit page</option>
              <option value={2}>200%</option>
              <option value={3}>300%</option>
              <option value={4}>400%</option>
            </select>
          </label>
          <p className="comic-caption">
            Zoom in and scroll to read smaller captions. Escape closes this
            view.
          </p>
          <div
            className="comic-viewport"
            ref={viewport}
            tabIndex={0}
            role="region"
            aria-label="Scrollable comic page"
          >
            <div className="comic-zoom" style={{ width: `${zoom * 100}%` }}>
              <PageImage key={page} page={page} />
            </div>
          </div>
          {summary}
        </dialog>
      )}
    </section>
  );
}
export default memo(ComicReader);

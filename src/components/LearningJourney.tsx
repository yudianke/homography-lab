import { memo } from "react";
import { Robot } from "./Header";
import { JOURNEY, journeyState } from "../learning/content";
import type { EducationMode } from "../math/education";
export function showLearningArea(id: string) {
  const target = document.getElementById(id);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "start", behavior: "auto" });
}
function LearningJourney({
  stage,
  onStage,
  onComic,
  mode,
  onMode,
}: {
  stage: number | null;
  onStage: (stage: number | null) => void;
  onComic: (page: number) => void;
  mode: EducationMode;
  onMode: (mode: EducationMode) => void;
}) {
  const step = stage === null ? null : JOURNEY[stage];
  return (
    <section
      id="journey"
      tabIndex={-1}
      className={`panel journey ${step ? "journey-active" : ""}`}
      aria-labelledby="journey-title"
    >
      <div className="journey-heading">
        <Robot />
        <div>
          <p className="eyebrow">THE COMIC, MADE INTERACTIVE</p>
          <h2 id="journey-title">Follow Robot H's Journey</h2>
        </div>
        <div className="journey-entry">
          <button className="comic-link" onClick={() => onComic(1)}>
            Explore the Original Comic
          </button>
          {stage === null ? (
            <button className="primary-button" onClick={() => onStage(0)}>
              Start Guided Demo
            </button>
          ) : (
            <button onClick={() => onStage(null)}>Exit Demo</button>
          )}
        </div>
      </div>
      {step && stage !== null ? (
        <>
          <ol className="journey-steps" aria-label="Learning stages">
            {JOURNEY.map((s, i) => (
              <li key={s.id}>
                <button
                  aria-current={stage === i ? "step" : undefined}
                  onClick={() => onStage(i)}
                >
                  <span>{i + 1}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
          <div
            className="journey-message"
            aria-live="polite"
            aria-atomic="true"
          >
            <h3>
              Stage {stage + 1} of 5 — {step.title}
            </h3>
            <p>{step.message}</p>
          </div>
          <p className="journey-detail">{step.detail}</p>
          {stage === 2 && (
            <div
              className="journey-geometry"
              role="group"
              aria-label="Explore three geometry lessons"
            >
              {(["Straight Lines", "Angles", "Distances"] as const).map((m) => (
                <button
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => onMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <div className="journey-navigation">
            <button
              disabled={stage === 0}
              onClick={() => onStage(journeyState(stage, { type: "previous" }))}
            >
              Previous step
            </button>
            <button
              className="primary-button"
              onClick={() =>
                onStage(
                  stage === 4 ? null : journeyState(stage, { type: "next" }),
                )
              }
            >
              {stage === 4 ? "Finish Demo" : "Next step"}
            </button>
            <button onClick={() => showLearningArea(step.target)}>
              {step.action}
            </button>
            <button className="comic-link" onClick={() => onComic(step.page)}>
              See this concept in the comic · PDF {step.page}
            </button>
          </div>
        </>
      ) : (
        <p className="journey-detail">
          Five short stops: observe, transform, explore, understand, and
          rectify. Or keep exploring freely.
        </p>
      )}
    </section>
  );
}
export default memo(LearningJourney);

import React from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App";
import "../src/styles/index.css";
const fixture = document.querySelector("#fixture")!;
const output = document.querySelector("#results")!;
let root: ReturnType<typeof createRoot> | undefined;
const wait = async (fn: () => boolean) => {
  for (let i = 0; i < 160; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("UI state timed out");
};
const tick = () =>
  new Promise<void>((resolve) => {
    const fallback = setTimeout(resolve, 100);
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(fallback); resolve(); }));
  });
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const button = (text: string) => {
  const element = Array.from(fixture.querySelectorAll("button")).find(
    (b) => b.textContent === text,
  );
  if (!element) throw new Error(`Missing button: ${text}`);
  return element;
};
const click = async (text: string) => {
  button(text).click();
  await tick();
};
const corners = () =>
  Array.from(fixture.querySelectorAll(".interactive-map [data-corner]"))
    .map((e) => e.getAttribute("transform"))
    .join("|");
document.querySelector("#run")!.addEventListener("click", async () => {
  const trigger = document.querySelector<HTMLButtonElement>("#run")!;
  trigger.disabled = true;
  const log: string[] = [];
  try {
    root?.unmount();
    root = createRoot(fixture);
    root.render(<App />);
    await wait(() => !!fixture.querySelector(".interactive-map canvas"));
    await tick();
    assert(
      fixture.querySelectorAll('img[src*="page-"]').length === 0,
      "Comic pages eagerly loaded",
    );
    log.push("PASS No full comic page is mounted before the reader opens");
    await click("Explore the Original Comic");
    await wait(() => !!fixture.querySelector("#comic-reader"));
    for (let page = 1; page <= 14; page++) {
      await wait(() => {
        const image =
          fixture.querySelector<HTMLImageElement>(".comic-page img");
        return (
          !!image?.complete &&
          image.naturalWidth === 1600 &&
          image.src.endsWith(`page-${String(page).padStart(2, "0")}.webp`)
        );
      });
      assert(
        fixture.querySelectorAll(".comic-page img").length === 1,
        "More than one page mounted",
      );
      if (page < 14) await click("Next page");
    }
    assert(button("Next page").disabled, "Next not bounded");
    await click("Previous page");
    assert(
      fixture
        .querySelector(".comic-page img")
        ?.getAttribute("src")
        ?.endsWith("13.webp"),
      "Previous failed",
    );
    await click("Enlarge page");
    assert(fixture.querySelector("dialog")?.open, "Enlarged dialog not open");
    await click("Close enlarged view");
    assert(
      document.activeElement === button("Enlarge page"),
      "Focus not restored after enlarged reading",
    );
    await click("Return to Interactive Lab");
    assert(!fixture.querySelector("#comic-reader"), "Reader did not close");
    log.push(
      "PASS All 14 pages load individually, navigation bounds, enlarged reading and return focus",
    );
    for (const [text, page] of [
      ["Why the map looks skewed · PDF 5–7", 5],
      ["Four-point correspondence · PDF 9", 9],
      ["Inside the Matrix · PDF 10", 10],
      ["Rectification in the comic · PDF 11", 11],
    ] as const) {
      await click(text);
      await wait(() => !!fixture.querySelector(".comic-page img"));
      assert(
        fixture
          .querySelector(".comic-page img")
          ?.getAttribute("src")
          ?.includes(`-${String(page).padStart(2, "0")}.webp`),
        "Wrong chapter",
      );
      await click("Return to Interactive Lab");
    }
    log.push("PASS Context links open the correct physical PDF pages");
    const before = corners();
    await click("Start Guided Demo");
    assert(
      fixture.querySelector("main")?.getAttribute("data-demo") === "observe",
      "Wrong first stage",
    );
    await click("Next step");
    assert(
      fixture.querySelector("main")?.getAttribute("data-demo") === "transform",
      "Wrong second stage",
    );
    const handle = fixture.querySelector<SVGElement>(
      '.interactive-map [data-corner="0"]',
    )!;
    handle.focus();
    handle.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    await tick();
    assert(corners() !== before, "Guide blocked keyboard corner movement");
    const afterMove = corners();
    await click("Next step");
    assert(
      fixture.querySelector("main")?.getAttribute("data-demo") === "geometry",
      "Wrong third stage",
    );
    for (const text of ["Straight Lines", "Angles", "Distances"]) {
      const target = Array.from(
        fixture.querySelectorAll<HTMLButtonElement>(".journey-geometry button"),
      ).find((b) => b.textContent === text)!;
      target.click();
      await tick();
      assert(
        fixture
          .querySelector(".interactive-map .education-overlay")
          ?.getAttribute("aria-label")
          ?.includes(text),
        "Geometry mode not updated",
      );
    }
    await click("See this concept in the comic · PDF 8");
    await wait(() => !!fixture.querySelector(".comic-page img"));
    assert(
      fixture
        .querySelector(".comic-page img")
        ?.getAttribute("src")
        ?.endsWith("08.webp"),
      "Geometry comic link wrong",
    );
    await click("Return to Interactive Lab");
    await click("Next step");
    assert(
      fixture.querySelector("main")?.getAttribute("data-demo") === "matrix" &&
        !!fixture.querySelector(".matrix"),
      "Matrix not visible",
    );
    await click("Next step");
    assert(
      fixture.querySelector("main")?.getAttribute("data-demo") === "rectify",
      "Wrong final stage",
    );
    await click("Rectify View");
    await wait(
      () =>
        !!fixture.querySelector(".rectification-images canvas") &&
        !fixture.querySelector(".rectification-status"),
    );
    assert(corners() === afterMove, "Guide or rectify reset corners");
    await click("Back to Editing");
    await click("Finish Demo");
    assert(
      fixture.querySelector("main")?.getAttribute("data-demo") === "free",
      "Finish failed",
    );
    log.push(
      "PASS Full Observe → Transform → Geometry → Matrix → Rectify sequence; keyboard corners, three modes and real rectification remain available",
    );
    for (let stage = 0; stage < 5; stage++) {
      await click("Start Guided Demo");
      for (let i = 0; i < stage; i++) await click("Next step");
      await click("Exit Demo");
      assert(
        fixture.querySelector("main")?.getAttribute("data-demo") === "free",
        "Exit failed",
      );
      assert(corners() === afterMove, "Exiting guide reset corners");
    }
    log.push("PASS Exit available at every stage without resetting the map");
    const canvas = fixture.querySelector(".interactive-map canvas");
    const images = performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes("/comic/")).length;
    const start = performance.now();
    for (let i = 0; i < 30; i++)
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: i % 2 ? "ArrowLeft" : "ArrowRight",
          bubbles: true,
        }),
      );
    await tick();
    assert(
      fixture.querySelector(".interactive-map canvas") === canvas,
      "Canvas recreated while interacting",
    );
    assert(
      performance
        .getEntriesByType("resource")
        .filter((r) => r.name.includes("/comic/")).length === images,
      "Comic resources requested during dragging",
    );
    log.push(
      `PASS 30 keyboard updates retained the canvas and requested no comic resources (${(performance.now() - start).toFixed(1)} ms including render wait / background timer fallback; not an FPS benchmark)`,
    );
    log.push("ALL COMIC / GUIDE UI CHECKS PASSED");
  } catch (error) {
    log.push(`FAIL ${error}`);
  } finally {
    output.textContent = log.join("\n");
    trigger.disabled = false;
  }
});



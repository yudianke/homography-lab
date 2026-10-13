import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  COMIC_PAGES,
  CHAPTERS,
  JOURNEY,
  comicPage,
  comicPagePath,
  conceptPage,
  journeyState,
} from "../src/learning/content.ts";
test("All fourteen numbered comic pages have unique titles, accessible summaries and bounded assets", () => {
  assert.equal(COMIC_PAGES.length, 14);
  assert.equal(new Set(COMIC_PAGES.map((p) => p.title)).size, 14);
  COMIC_PAGES.forEach((p, i) => {
    assert.ok(p.summary.length > 80);
    const asset = new URL(`../public${comicPagePath(i + 1)}`, import.meta.url);
    const bytes = readFileSync(asset);
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.ok(statSync(asset).size < 400000);
  });
});
test("Reader page navigation is bounded and safe for invalid input", () => {
  assert.equal(comicPage(0), 1);
  assert.equal(comicPage(15), 14);
  assert.equal(comicPage(8), 8);
  assert.equal(comicPage(NaN), 1);
  assert.equal(comicPage(Infinity), 1);
  assert.equal(comicPage(9.9), 9);
  assert.equal(comicPagePath(14), "/comic/page-14.webp");
});
test("Chapter links match inspected physical PDF pages, not chapter numbers", () => {
  assert.deepEqual(CHAPTERS, {
    drag: 5,
    perspective: 6,
    plane: 7,
    geometry: 8,
    correspondence: 9,
    matrix: 10,
    rectification: 11,
  });
  for (const mode of ["Straight Lines", "Angles", "Distances"])
    assert.equal(conceptPage(mode), 8);
  assert.equal(conceptPage("Grid"), 7);
  assert.equal(COMIC_PAGES[10].title, "Bring the Map Back");
});
test("Journey traverses five ordered stages and can exit from every stage", () => {
  assert.deepEqual(
    JOURNEY.map((s) => s.id),
    ["observe", "transform", "geometry", "matrix", "rectify"],
  );
  let state = journeyState(null, { type: "start" });
  assert.equal(state, 0);
  for (let i = 0; i < 5; i++) {
    assert.equal(state, i);
    assert.equal(journeyState(state, { type: "exit" }), null);
    state = journeyState(state, { type: "next" });
  }
  assert.equal(state, 4);
  for (let i = 4; i >= 0; i--) {
    assert.equal(state, i);
    state = journeyState(state, { type: "previous" });
  }
  assert.equal(state, 0);
  assert.equal(journeyState(null, { type: "next" }), null);
  assert.equal(journeyState(2, { type: "go", stage: 99 }), 2);
});
test("Original PDF is byte-for-byte preserved", () => {
  const pdf = readFileSync(
    new URL("../public/comic/original-comic.pdf", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(pdf).digest("hex"),
    "4a868d4ae1216df5cd146a886a39039c05e32d89baa20f7a98f51ced47209e2a",
  );
});

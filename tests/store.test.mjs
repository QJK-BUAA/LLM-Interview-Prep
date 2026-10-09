import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS, getChapter } from "../content/catalog.js";

import {
  DEFAULT_STATE,
  getProgress,
  loadState,
  saveState,
  setMode,
  setTheme,
  toggleSection,
} from "../app/store.js";

function makeStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem() {
      return value;
    },
    setItem(_key, nextValue) {
      value = nextValue;
    },
    read() {
      return value;
    },
  };
}

test("returns independent defaults when no stored state exists", () => {
  const first = loadState(makeStorage());
  const second = loadState(makeStorage());

  assert.deepEqual(first, DEFAULT_STATE);
  assert.notEqual(first, second);
  first.completed["00"] = ["intuition"];
  assert.deepEqual(second.completed, {});
});

test("falls back when stored JSON is invalid", () => {
  saveState(setTheme(DEFAULT_STATE, "dark"), {
    setItem() {
      throw new Error("quota");
    },
  });
  const storage = makeStorage("{");
  assert.deepEqual(loadState(storage), DEFAULT_STATE);
});

test("normalizes modes and removes unknown chapters and sections", () => {
  const storage = makeStorage(
    JSON.stringify({
      version: 99,
      currentChapter: "missing",
      mode: "speedrun",
      theme: "neon",
      completed: {
        "00": ["intuition", "missing", "intuition"],
        "99": ["quiz"],
      },
    }),
  );

  assert.deepEqual(loadState(storage), {
    version: 2,
    currentChapter: "00",
    mode: "learn",
    theme: "light",
    completed: { "00": ["intuition"] },
  });
});

test("toggles valid sections without mutating the previous state", () => {
  const initial = loadState(makeStorage());
  const completed = toggleSection(initial, "00", "intuition");
  const reopened = toggleSection(completed, "00", "intuition");

  assert.deepEqual(initial.completed, {});
  assert.deepEqual(completed.completed, { "00": ["intuition"] });
  assert.deepEqual(reopened.completed, {});
  assert.equal(toggleSection(initial, "99", "quiz"), initial);
});

test("normalizes mode and theme updates", () => {
  const initial = loadState(makeStorage());

  assert.equal(setMode(initial).mode, "learn");
  assert.equal(setMode(initial).mode, "learn");
  assert.equal(setTheme(initial, "dark").theme, "dark");
  assert.equal(setTheme(initial, "invalid").theme, "light");
  assert.equal(initial.mode, "learn");
});

test("calculates chapter and catalog progress from valid sections", () => {
  let state = loadState(makeStorage());
  state = toggleSection(state, "00", "intuition");
  state = toggleSection(state, "00", "quiz");

  const chapter = getProgress(state, "00");
  const overall = getProgress(state);

  const chapterTotal = getChapter("00").sections.length;
  const overallTotal = CHAPTERS.reduce((sum, item) => sum + item.sections.length, 0);
  assert.deepEqual(chapter, { completed: 2, total: chapterTotal, percentage: Math.round(200 / chapterTotal) });
  assert.equal(overall.completed, 2);
  assert.equal(overall.total, overallTotal);
  assert.equal(overall.percentage, Math.round(200 / overallTotal));
});

test("keeps an in-memory fallback when storage reads and writes throw", () => {
  const brokenStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
  };
  const state = setTheme(
    toggleSection(loadState(makeStorage()), "00", "example"),
    "dark",
  );

  assert.doesNotThrow(() => saveState(state, brokenStorage));
  assert.deepEqual(loadState(brokenStorage), state);
});

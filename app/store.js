import { CHAPTERS } from "../content/catalog.js";

export const STORAGE_KEY = "ml-roadmap-state-v2";
export const LEGACY_STORAGE_KEY = "ml-roadmap-state-v1";

export const DEFAULT_STATE = Object.freeze({
  version: 2,
  currentChapter: "00",
  mode: "learn",
  theme: "light",
  completed: Object.freeze({}),
});

const chapterById = new Map(
  CHAPTERS.map((chapter) => [
    chapter.id,
    {
      chapter,
      sectionIds: new Set(chapter.sections.map((section) => section.id)),
    },
  ]),
);

function cloneState(state) {
  return {
    version: 2,
    currentChapter: state.currentChapter,
    mode: state.mode,
    theme: state.theme,
    completed: Object.fromEntries(
      Object.entries(state.completed).map(([chapterId, sectionIds]) => [
        chapterId,
        [...sectionIds],
      ]),
    ),
  };
}

function freshDefaultState() {
  return cloneState(DEFAULT_STATE);
}

function normalizeState(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return freshDefaultState();
  }

  const completed = {};
  if (
    candidate.completed &&
    typeof candidate.completed === "object" &&
    !Array.isArray(candidate.completed)
  ) {
    for (const chapter of CHAPTERS) {
      // Chapter 20 has a new subject; 21–29 did not exist in the old course.
      if (candidate.version === 1 && Number(chapter.id) >= 20) continue;
      const storedIds = candidate.completed[chapter.id];
      if (!Array.isArray(storedIds)) continue;

      const uniqueStoredIds = new Set(
        storedIds.filter((sectionId) => typeof sectionId === "string"),
      );
      const validIds = chapter.sections
        .map((section) => section.id)
        .filter((sectionId) => uniqueStoredIds.has(sectionId));

      if (validIds.length > 0) {
        completed[chapter.id] = validIds;
      }
    }
  }

  return {
    version: 2,
    currentChapter: chapterById.has(candidate.currentChapter)
      ? candidate.currentChapter
      : "00",
    mode: candidate.mode === "interview" ? "interview" : "learn",
    theme: candidate.theme === "dark" ? "dark" : "light",
    completed,
  };
}

let memoryFallback = freshDefaultState();

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadState(storage = defaultStorage()) {
  if (!storage) {
    return cloneState(memoryFallback);
  }

  let serialized;
  let migrating = false;
  try {
    serialized = storage.getItem(STORAGE_KEY);
    if (serialized === null) {
      serialized = storage.getItem(LEGACY_STORAGE_KEY);
      migrating = serialized !== null;
    }
  } catch {
    return cloneState(memoryFallback);
  }

  if (serialized === null) {
    return freshDefaultState();
  }

  try {
    const parsed = JSON.parse(serialized);
    const state = normalizeState(
      migrating && parsed && typeof parsed === "object"
        ? { ...parsed, version: 1 }
        : parsed,
    );
    memoryFallback = cloneState(state);
    if (migrating) saveState(state, storage);
    return state;
  } catch {
    memoryFallback = freshDefaultState();
    return freshDefaultState();
  }
}

export function saveState(state, storage = defaultStorage()) {
  const normalized = normalizeState(state);
  memoryFallback = cloneState(normalized);

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // The in-memory copy remains available for the current page session.
  }

  return cloneState(normalized);
}

export function toggleSection(state, chapterId, sectionId) {
  const chapterInfo = chapterById.get(chapterId);
  if (!chapterInfo || !chapterInfo.sectionIds.has(sectionId)) {
    return state;
  }

  const normalized = normalizeState(state);
  const currentIds = new Set(normalized.completed[chapterId] ?? []);

  if (currentIds.has(sectionId)) {
    currentIds.delete(sectionId);
  } else {
    currentIds.add(sectionId);
  }

  const completed = { ...normalized.completed };
  const orderedIds = chapterInfo.chapter.sections
    .map((section) => section.id)
    .filter((id) => currentIds.has(id));

  if (orderedIds.length > 0) {
    completed[chapterId] = orderedIds;
  } else {
    delete completed[chapterId];
  }

  return { ...normalized, completed };
}

export function setMode(state, mode) {
  return {
    ...normalizeState(state),
    mode: mode === "interview" ? "interview" : "learn",
  };
}

export function setTheme(state, theme) {
  return {
    ...normalizeState(state),
    theme: theme === "dark" ? "dark" : "light",
  };
}

export function setCurrentChapter(state, chapterId) {
  if (!chapterById.has(chapterId)) return state;
  return { ...normalizeState(state), currentChapter: chapterId };
}

export function getProgress(state, chapterId) {
  const normalized = normalizeState(state);
  const chapters = chapterId
    ? CHAPTERS.filter((chapter) => chapter.id === chapterId)
    : CHAPTERS;

  const total = chapters.reduce(
    (sum, chapter) => sum + chapter.sections.length,
    0,
  );
  const completed = chapters.reduce(
    (sum, chapter) =>
      sum + (normalized.completed[chapter.id]?.length ?? 0),
    0,
  );

  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

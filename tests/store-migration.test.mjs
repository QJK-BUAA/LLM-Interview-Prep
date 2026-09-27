import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY, LEGACY_STORAGE_KEY, loadState, saveState, toggleSection,
} from "../app/store.js";

function storageWith(values = {}) {
  const map = new Map(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    map,
  };
}

test("migrates old progress once, retaining settings and removing repurposed chapter 20", () => {
  const old = {
    version: 1, currentChapter: "19", mode: "interview", theme: "dark",
    completed: { "00": ["quiz"], "19": ["derivation"], "20": ["quiz"], "29": ["quiz"] },
  };
  const storage = storageWith({ [LEGACY_STORAGE_KEY]: old });
  const state = loadState(storage);
  assert.equal(state.version, 2);
  assert.equal(state.currentChapter, "19");
  assert.equal(state.mode, "interview");
  assert.equal(state.theme, "dark");
  assert.deepEqual(state.completed, { "00": ["quiz"], "19": ["derivation"] });
  assert.deepEqual(JSON.parse(storage.map.get(LEGACY_STORAGE_KEY)), old);
  assert.deepEqual(JSON.parse(storage.map.get(STORAGE_KEY)), state);
});

test("v2 data wins over legacy and preserves new chapter 20 completion", () => {
  const storage = storageWith({
    [LEGACY_STORAGE_KEY]: { version: 1, completed: { "00": ["quiz"] } },
    [STORAGE_KEY]: { version: 2, currentChapter: "20", completed: { "20": ["quiz"] } },
  });
  assert.deepEqual(loadState(storage).completed, { "20": ["quiz"] });
  const next = toggleSection(loadState(storage), "20", "code");
  saveState(next, storage);
  assert.deepEqual(loadState(storage).completed["20"], ["code", "quiz"]);
});

test("bad current JSON does not resurrect stale legacy progress", () => {
  const storage = storageWith({ [LEGACY_STORAGE_KEY]: { version: 1, completed: { "00": ["quiz"] } } });
  storage.map.set(STORAGE_KEY, "{");
  assert.deepEqual(loadState(storage).completed, {});
});

test("new chapter 29 progress survives save and reload", () => {
  const storage = storageWith();
  saveState(toggleSection(loadState(storage), "29", "quiz"), storage);
  assert.deepEqual(loadState(storage).completed, { "29": ["quiz"] });
});

test("migration survives read-only storage without discarding in-memory progress", () => {
  const storage = storageWith({ [LEGACY_STORAGE_KEY]: { version: 1, completed: { "19": ["quiz"] } } });
  storage.setItem = () => { throw new Error("quota"); };
  assert.deepEqual(loadState(storage).completed, { "19": ["quiz"] });
  assert.deepEqual(loadState({ getItem() { throw new Error("denied"); } }).completed, { "19": ["quiz"] });
});

import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS } from "../content/catalog.js";
import { validateChapter } from "../content/schema.js";
import { visibleSections } from "../app/renderer.js";
import { parseRoute, searchSections } from "../app/app.js";
import { DEFAULT_STATE, getProgress, loadState, STORAGE_KEY } from "../app/store.js";

test("every chapter has a connected learning path and worked whiteboard exercises", () => {
  for (const chapter of CHAPTERS) {
    assert.deepEqual(validateChapter(chapter), [], chapter.id);
    assert.equal(chapter.sections[0].type, "roadmap", chapter.id);
    const whiteboard = chapter.sections.find(section => section.id === "whiteboard");
    assert.equal(whiteboard?.type, "quiz", chapter.id);
    assert.ok(whiteboard.questions.length >= 3, chapter.id);
    for (const { q, a } of whiteboard.questions) {
      assert.ok(q.length > 12 && a.length > 45, `${chapter.id}: substantive exercise`);
      assert.match(a, /得分点/, chapter.id);
    }
    const topics = chapter.sections.filter(section =>
      section.id.startsWith("math-") && section.type === "derivation",
    );
    assert.ok(topics.length >= 1, `${chapter.id}: addressable math topics`);
    for (const topic of topics) {
      assert.match(topic.body, /\$\$[\s\S]+?\$\$/, `${chapter.id}/${topic.id}: display equations`);
    }
  }
});

test("all formulas and examples remain reachable in interview mode and by deep link", () => {
  for (const chapter of CHAPTERS) {
    const visible = visibleSections(chapter, "interview");
    for (const section of chapter.sections) {
      if (!["derivation", "example", "roadmap"].includes(section.type)) continue;
      assert.ok(visible.includes(section), `${chapter.id}/${section.id}`);
      assert.deepEqual(parseRoute(`#${chapter.id}/${section.id}`), {
        chapterId: chapter.id, sectionId: section.id,
      });
    }
    assert.ok(visible.some(section => section.id === "whiteboard"), chapter.id);
  }
});

test("search finds concrete mathematical topics instead of only the chapter heading", () => {
  assert.deepEqual(searchSections(""), []);
  for (const chapter of CHAPTERS) {
    const topic = chapter.sections.find(section => section.id.startsWith("math-"));
    assert.ok(topic, chapter.id);
    const matches = searchSections(topic.title);
    assert.ok(matches.some(match =>
      match.chapterId === chapter.id && match.sectionId === topic.id,
    ), `${chapter.id}/${topic.id}`);
  }
});

test("existing completion records survive while new whiteboard content remains uncompleted", () => {
  const originalIds = [
    "intuition", "example", "diagram", "derivation", "code",
    "pitfall", "comparison", "interview", "quiz",
  ];
  const stored = {
    ...DEFAULT_STATE,
    mode: "interview",
    completed: Object.fromEntries(CHAPTERS.map(chapter => [chapter.id, originalIds])),
  };
  const state = loadState({
    getItem: key => key === STORAGE_KEY ? JSON.stringify(stored) : null,
  });
  for (const chapter of CHAPTERS) {
    assert.deepEqual([...state.completed[chapter.id]].sort(), [...originalIds].sort());
    const progress = getProgress(state, chapter.id);
    assert.equal(progress.completed, 9);
    assert.ok(progress.total > 9);
    assert.ok(progress.percentage < 100);
    assert.ok(!state.completed[chapter.id].includes("whiteboard"));
  }
});

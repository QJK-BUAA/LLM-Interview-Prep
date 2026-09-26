import test from "node:test";
import assert from "node:assert/strict";

import {
  REQUIRED_SECTION_TYPES,
  validateChapter,
} from "../content/schema.js";

function makeCompleteChapter() {
  return {
    id: "00",
    slug: "roadmap",
    part: "起点",
    title: "学习地图",
    subtitle: "从训练数据到会推理的模型",
    level: "入门",
    duration: 25,
    prerequisites: [],
    tags: ["路线"],
    objectives: ["解释机器学习主线"],
    summary: "从任务、数据、目标函数和优化理解机器学习。",
    sections: REQUIRED_SECTION_TYPES.map((type) => ({
      id: type,
      type,
      title: type,
      body: "足够完整的教学正文。",
      ...(type === "diagram"
        ? {
            diagram: {
              kind: "flow",
              nodes: ["输入", "输出"],
              links: [[0, 1]],
            },
          }
        : {}),
      ...(type === "quiz"
        ? {
            questions: [
              { q: "问题一", a: "答案一" },
              { q: "问题二", a: "答案二" },
              { q: "问题三", a: "答案三" },
            ],
          }
        : {}),
    })),
    sources: [
      {
        label: "教材",
        url: "https://example.com",
        evidence: "原始资料",
      },
    ],
  };
}

test("accepts a complete chapter", () => {
  assert.deepEqual(validateChapter(makeCompleteChapter()), []);
});

test("rejects missing teaching layers and short quizzes", () => {
  const chapter = makeCompleteChapter();
  chapter.sections = chapter.sections.filter(
    (section) => section.type !== "example",
  );
  chapter.sections.find((section) => section.type === "quiz").questions.length =
    2;

  const errors = validateChapter(chapter);
  assert.ok(errors.some((error) => error.includes("example")));
  assert.ok(errors.some((error) => error.includes("3 questions")));
});

test("rejects duplicate section ids and malformed diagrams", () => {
  const chapter = makeCompleteChapter();
  chapter.sections[1].id = chapter.sections[0].id;
  chapter.sections.find((section) => section.type === "diagram").diagram.links =
    [[0, 4]];

  const errors = validateChapter(chapter);
  assert.ok(errors.some((error) => error.includes("duplicate section id")));
  assert.ok(errors.some((error) => error.includes("diagram link")));
});

test("rejects incomplete metadata and non-http sources", () => {
  const chapter = makeCompleteChapter();
  chapter.objectives = [];
  chapter.sources[0].url = "paper.pdf";

  const errors = validateChapter(chapter);
  assert.ok(errors.some((error) => error.includes("objectives")));
  assert.ok(errors.some((error) => error.includes("source URL")));
});

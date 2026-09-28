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
    sections: [...REQUIRED_SECTION_TYPES.map((type) => ({
      id: type,
      type,
      title: type,
      body: "足够完整的教学正文。",
      ...(type === "roadmap"
        ? { links: [
            { label: "核心定义", sectionId: "derivation", level: "必会" },
            { label: "动手计算", sectionId: "example", level: "推导" },
            { label: "自测", sectionId: "quiz", level: "进阶" },
          ] }
        : {}),
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
    })), {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习",
      body: "写出步骤，再核对得分点。",
      questions: [1, 2, 3].map(number => ({
        q: `推导问题 ${number}`,
        a: "定义变量，展开目标，计算导数。得分点：假设与中间步骤。",
      })),
    }],
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

test("rejects broken learning paths but allows multiple independent derivations", () => {
  const chapter = makeCompleteChapter();
  chapter.sections.push({
    id: "math-gradient", type: "derivation", title: "求导", body: "完整推导。",
  });
  assert.deepEqual(validateChapter(chapter), []);
  chapter.sections[0].links[0].sectionId = "missing-math";
  assert.ok(validateChapter(chapter).some(error => error.includes("invalid roadmap link")));
});

test("rejects missing whiteboard exercises and answers without scoring points", () => {
  const chapter = makeCompleteChapter();
  const whiteboard = chapter.sections.find(section => section.id === "whiteboard");
  whiteboard.questions[0].a = "只有一个结论，没有推导要求。";
  assert.ok(validateChapter(chapter).some(error => error.includes("得分点")));
  chapter.sections = chapter.sections.filter(section => section.id !== "whiteboard");
  assert.ok(validateChapter(chapter).some(error => error.includes("whiteboard")));
});

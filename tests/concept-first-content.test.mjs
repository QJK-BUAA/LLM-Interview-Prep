import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTERS } from "../content/catalog.js";

function countDisplayMath(text) {
  return (text.match(/\$\$/g) ?? []).length / 2;
}

function countNumericLiterals(text) {
  return (text.match(/(?<![\p{L}_])[-+]?\d+(?:[.,]\d+)*(?![\p{L}_])/gu) ?? [])
    .length;
}

function countArithmeticSteps(text) {
  return (text.match(
    /(?:(?<![\p{L}\d])\d+(?:\.\d+)?\s*[×+÷=/%]|[=≈]\s*-?\d+(?:\.\d+)?)/gu,
  ) ?? []).length;
}

test("first-reading examples explain mechanisms instead of becoming calculation drills", () => {
  for (const chapter of CHAPTERS) {
    const example = chapter.sections.find(section => section.id === "example");
    assert.ok(example, `${chapter.id}: example exists`);
    assert.ok(
      countDisplayMath(example.body) <= 1,
      `${chapter.id}: visible example contains too many display calculations`,
    );
    assert.ok(
      countArithmeticSteps(example.body) <= 2,
      `${chapter.id}: visible example contains too many arithmetic steps`,
    );
    assert.ok(
      countNumericLiterals(example.body) <= 14,
      `${chapter.id}: visible example contains too many numeric literals`,
    );
  }
});

test("basic quizzes test meaning and judgment rather than precise arithmetic", () => {
  const calculationPrompt =
    /(?:求|计算|算出|是多少|各是多少|分别是多少|写出).{0,48}(?:\d|概率|损失|回报|比率|优势|梯度|参数|长度|显存|成本)/;
  for (const chapter of CHAPTERS) {
    const quiz = chapter.sections.find(section => section.id === "quiz");
    assert.ok(quiz, `${chapter.id}: basic quiz exists`);
    for (const [index, question] of quiz.questions.entries()) {
      assert.doesNotMatch(
        question.q,
        calculationPrompt,
        `${chapter.id}/quiz/${index + 1}: move precise calculation to whiteboard`,
      );
    }
  }
});

test("other first-reading prose does not reintroduce hidden calculation drills", () => {
  const proseTypes = new Set([
    "intuition", "roadmap", "diagram", "pitfall", "comparison", "interview",
  ]);
  for (const chapter of CHAPTERS) {
    for (const section of chapter.sections) {
      if (!proseTypes.has(section.type)) continue;
      const prose = section.body.replace(/~~~[\s\S]*?~~~/g, "");
      assert.ok(
        countDisplayMath(prose) <= 1,
        `${chapter.id}/${section.id}: too many visible display calculations`,
      );
      assert.ok(
        countArithmeticSteps(prose) <= 2,
        `${chapter.id}/${section.id}: too many visible arithmetic steps`,
      );
    }
  }
});

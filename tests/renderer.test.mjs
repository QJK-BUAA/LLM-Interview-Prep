import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  renderChapter,
  renderDiagram,
  renderMarkdown,
  visibleSections,
} from "../app/renderer.js";

test("escapes untrusted HTML characters", () => {
  assert.equal(
    escapeHtml('<script data-x="1">&'),
    "&lt;script data-x=&quot;1&quot;&gt;&amp;",
  );
});

test("preserves fenced code as escaped code markup", () => {
  const html = renderMarkdown('~~~python\nprint("<x>")\n~~~');

  assert.match(html, /<pre class="code-block">/);
  assert.match(html, /<code class="language-python">print\(&quot;&lt;x&gt;&quot;\)/);
  assert.doesNotMatch(html, /<p>~~~/);
});

test("renders markdown tables with accessible structure", () => {
  const html = renderMarkdown("| 名称 | 值 |\n|---|---:|\n| A | 2 |");

  assert.match(html, /<div class="table-scroll"[^>]*>/);
  assert.match(html, /<th scope="col"[^>]*>名称<\/th>/);
  assert.match(html, /<td class="align-right">2<\/td>/);
});

test("emits safe inline and display math placeholders", () => {
  const html = renderMarkdown('内联 $a < b$。\n\n$$x="unsafe"$$');

  assert.match(html, /class="math-placeholder math-inline"/);
  assert.match(html, /data-math="a &lt; b"/);
  assert.match(html, /class="math-placeholder math-display"/);
  assert.doesNotMatch(html, /data-math="[^"]*"unsafe"/);
});

test("renders flow, matrix and comparison diagram variants", () => {
  const flow = renderDiagram({
    kind: "flow",
    nodes: ["输入", "<输出>"],
    links: [[0, 1]],
  });
  const matrix = renderDiagram({
    kind: "matrix",
    nodes: ["Q [B,S,H]", "K [B,S,H]"],
    links: [],
  });
  const comparison = renderDiagram({
    kind: "comparison",
    nodes: ["SFT", "OPD"],
    links: [],
  });

  assert.match(flow, /diagram--flow/);
  assert.match(flow, /&lt;输出&gt;/);
  assert.match(flow, /aria-hidden="true">→/);
  assert.match(matrix, /diagram--matrix/);
  assert.match(comparison, /diagram--comparison/);
});

test("annotates only the first glossary occurrence", () => {
  const html = renderMarkdown("token 进入模型，第二个 token 已有上下文。", {
    glossary: true,
    seenTerms: new Set(),
  });

  assert.equal((html.match(/class="glossary-term"/g) ?? []).length, 1);
  assert.match(html, /data-definition=/);
});

test("filters sections for interview mode", () => {
  const chapter = {
    sections: [
      { type: "roadmap" },
      { type: "intuition" },
      { type: "example" },
      { type: "derivation" },
      { type: "pitfall" },
      { type: "comparison" },
      { type: "interview" },
      { type: "quiz" },
    ],
  };

  assert.equal(visibleSections(chapter, "learn").length, 8);
  assert.deepEqual(
    visibleSections(chapter, "interview").map((section) => section.type),
    ["roadmap", "example", "derivation", "pitfall", "comparison", "interview", "quiz"],
  );
});

test("renders completion controls and folded quiz answers", () => {
  const chapter = {
    id: "99",
    title: "测试章节",
    subtitle: "安全渲染",
    part: "测试",
    level: "入门",
    duration: 10,
    prerequisites: [],
    tags: ["测试"],
    objectives: ["检查输出"],
    summary: "摘要",
    sources: [{ label: "来源", url: "https://example.com", evidence: "测试" }],
    sections: [
      {
        id: "quiz",
        type: "quiz",
        title: "自测",
        body: "先回答。",
        questions: [{ q: "一加一？", a: "二。" }],
      },
    ],
  };

  const html = renderChapter(chapter, {
    mode: "learn",
    completed: { "99": ["quiz"] },
  });

  assert.match(html, /data-action="toggle-section"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /<details class="quiz-answer">/);
  assert.match(html, /<summary>查看答案<\/summary>/);
});

test("interview formulas are open, indexed and linked to folded whiteboard answers", () => {
  const chapter = {
    id: "99", title: "公式测试", subtitle: "", part: "", level: "", duration: 30,
    summary: "", objectives: [], sources: [],
    sections: [
      { id: "roadmap", type: "roadmap", title: "路线", body: "先定义再求导。",
        links: [{ label: "求导", sectionId: "math-gradient", level: "推导" }] },
      { id: "math-gradient", type: "derivation", title: "梯度", body: "$$L=x^2$$" },
      { id: "whiteboard", type: "quiz", title: "白板", body: "先作答。",
        questions: [{ q: "求导？", a: "$2x$。" }] },
    ],
  };
  const html = renderChapter(chapter, { mode: "interview" });
  assert.match(html, /class="derivation-disclosure" open/);
  assert.match(html, /href="#99\/math-gradient"/);
  assert.match(html, /href="#99\/whiteboard"/);
  assert.match(html, /class="quiz-answer"><summary>/);
  assert.match(html, /data-action="set-derivations" data-open="false"/);
});

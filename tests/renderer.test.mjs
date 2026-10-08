import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  renderChapter,
  renderDiagram,
  renderMarkdown,
  visibleSections,
} from "../app/renderer.js";
import { CHAPTERS } from "../content/catalog.js";
import { READING_GUIDES } from "../content/reading-guides.js";
import { searchChapters, searchSections } from "../app/app.js";

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

test("both modes retain diagrams and code alongside all teaching sections", () => {
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
      { type: "diagram" },
      { type: "code" },
    ],
  };

  assert.equal(visibleSections(chapter, "learn").length, 10);
  assert.deepEqual(
    visibleSections(chapter, "interview").map((section) => section.type),
    ["roadmap", "intuition", "example", "derivation", "pitfall", "comparison", "interview", "quiz", "diagram", "code"],
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

test("both reading modes introduce the problem and example before the formula index", () => {
  const chapter = {
    id: "99", title: "学习时长与分数", subtitle: "", part: "", level: "", duration: 30,
    summary: "先预测，再检查误差。", objectives: ["计算三个预测的误差"], sources: [],
    sections: [
      { id: "intuition", type: "intuition", title: "怎样预测分数", body: "我们有三位同学的记录。" },
      { id: "example", type: "example", title: "比较预测与记录", body: "预测少了两分。" },
      { id: "roadmap", type: "roadmap", title: "怎样继续学习", body: "从误差进入导数。",
        links: [{ label: "平方误差", sectionId: "derivation", level: "推导" }] },
      { id: "derivation", type: "derivation", title: "计算误差", body: "$$L=e^2$$" },
    ],
  };
  for (const mode of ["learn", "interview"]) {
    const html = renderChapter(chapter, { mode });
    const positions = [
      'id="intuition"', 'class="chapter-objectives"', 'id="example"',
      'id="roadmap"', 'class="formula-index"', 'id="derivation"',
    ].map(marker => html.indexOf(marker));
    assert.ok(positions.every(position => position >= 0), mode);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, mode);
    assert.equal((html.match(/class="chapter-objectives"/g) ?? []).length, 1);
    assert.equal((html.match(/class="formula-index"/g) ?? []).length, 1);
    assert.equal(html.includes('<details class="formula-index" open>'), mode === "interview");
    assert.equal(html.includes('<details class="derivation-disclosure" open>'), mode === "interview");
    assert.match(html, /L=e\^2/); // Folded math remains intact in the document.
  }
});

test("all real lessons expose individually written takeaways outside folded derivations", () => {
  for (const chapter of CHAPTERS) {
    const guide = READING_GUIDES[chapter.id];
    const html = renderChapter(chapter, { mode: "learn" });
    const count = chapter.sections.filter(section => section.type === "derivation").length;
    assert.ok(guide.goal && guide.checkpoint && guide.later, chapter.id);
    assert.equal((html.match(/class="topic-takeaway"/g) ?? []).length, count, chapter.id);
    assert.equal((html.match(/class="derivation-disclosure" open/g) ?? []).length, 0, chapter.id);
    assert.match(html, /class="reading-guide"/);
    assert.equal((html.match(/class="lesson-section /g) ?? []).length, chapter.sections.length);
    for (const id of guide.focus) {
      assert.match(html, new RegExp(`href="#${chapter.id}/${id}"`));
    }
    const interview = renderChapter(chapter, { mode: "interview" });
    assert.equal((interview.match(/class="derivation-disclosure" open/g) ?? []).length, count);
    assert.match(interview, /class="code-block"/);
    assert.match(interview, /class="diagram /);
  }
});

test("folded detail glossary does not consume a later visible definition", () => {
  const chapter = {
    id: "99", title: "", subtitle: "", part: "", level: "", duration: 1,
    summary: "", objectives: [], sources: [],
    sections: [
      { id: "math-test", type: "derivation", title: "", body: "token。" },
      { id: "example", type: "example", title: "", body: "token。" },
    ],
  };
  const html = renderChapter(chapter, { mode: "learn" });
  const visible = html.slice(html.indexOf('id="example"'));
  assert.match(visible, /class="glossary-term"/);
});

test("reading guidance and individual takeaways are searchable", () => {
  assert.ok(searchChapters("不连续刷十三套证明").some(chapter => chapter.id === "04"));
  assert.ok(searchSections("前向在哪些位置复用参数").some(section =>
    section.chapterId === "01" && section.sectionId === "math-broadcast-backward"));
});

# Learning Readability Implementation Plan

> **For agentic workers:** Use executing-plans in this session. Preserve old chapter/section IDs and stored progress. The user has authorized reasonable corrections; proceed through verification without another approval round.

**Goal:** Make the first reading understandable while retaining interview derivations and correcting misleading SFT teaching.

**Architecture:** A small static teaching-guide module supplies chapter goals and per-topic explanations. Renderer uses native disclosures to separate these explanations from detailed derivations; content edits improve the detailed material itself.

**Tech Stack:** ES modules, native HTML details, existing Markdown/KaTeX renderer, Node tests, Python numerical checks, agent-browser.

## 1. Freeze evidence and write reading guides

- [x] Read all chapter summaries/examples/roadmaps and all derivation openings; fully read 01/02/30 and selected dense derivations listed in the design.
- [x] Inspect renderer, navigation, validation and existing tests. Confirm detailed derivations always open, mode filtering hides code/diagrams, deep links already open derivations.
- [x] Save a compact baseline using the real renderer math placeholders (not overlapping dollar regexes). Capture a representative default learning page before edits.
- [x] Create `content/reading-guides.js` with the interface:

```js
export const READING_GUIDES = {
  "01": {
    goal: "先给每个轴贴上样本、位置和特征的标签。",
    checkpoint: "能解释两句话怎样从 24 个输入数变为 36 个输出数，并排除 padding。",
    focus: ["derivation", "math-masked-mean"],
    later: "矩阵与广播反向在学完第 02 章链式法则后复算。",
    topics: {
      derivation: "线性层汇总特征，共享偏置复用到多个位置；能运行仍要检查每个数属于谁。",
      "math-matmul-backward": "共享权重汇总所有使用位置的反馈；输入梯度保留各位置，不能把两种求和混起来。",
    },
  },
};
```

Fill all 31 entries and every final derivation topic with concrete, individually written text. The above defines the contract; no missing topic is accepted by validation.

## 2. Improve detailed lessons

- [x] In `content/chapter-01.js`, rewrite the four dense core derivations. Introduce dimensions once in ordinary language; put numeric feedback before compact generalization. Preserve numerical examples and derivative conditions.
- [x] In `content/chapter-02.js`, rewrite matrix differentiation and Lasso; split every whiteboard answer into result, steps and scoring points, retaining each question.
- [x] Rewrite exact targeted sections: 03 `derivation`/`math-mle-map`, 04 `math-logistic`/`math-svm`/`math-xgboost`, 06 `derivation`, 09 `math-attention-backward`, 15 `math-gae-telescoping`. Do not replace a mathematical equation with an unqualified slogan.
- [x] Rework all of `content/chapter-30.js` around a single response with three target tokens. Fix all scoped issues in the design, retain section IDs and question coverage. `math-completion-criteria` becomes comparison without an artificial formula.
- [x] Give 30 `code` a runnable PyTorch toy pipeline: explicit segment IDs, assistant target mask, causal within-segment visibility, safe pad rows, target mask shifted with labels, cross-segment first-label suppression, valid-token mean. Explain real templates separately; do not present toy token IDs as real tokenizer output.
- [x] Reformat two long inline number arrays in 24 `math-paired-inference` into ordinary comma-separated numbers/display blocks to eliminate mobile overflow.

## 3. Implement reading behavior

- [x] `app/renderer.js`: import guides, render a compact chapter reading guide after roadmap and formula index; render per-topic takeaway outside disclosure; keep fallback chapters without guide usable.
- [x] Derivation behavior:

```js
const expanded = options.mode === "interview";
content = renderTakeaway(guide.topics[section.id]) +
  `<details class="derivation-disclosure"${expanded ? " open" : ""}>` +
  `<summary>展开公式、手算与证明</summary>${content}</details>`;
```

Render the takeaway before its detailed body so hidden glossary occurrences cannot consume visible first definitions. Use separate glossary scope in detailed content where necessary. Both modes expose all section types.

- [x] Add mode explanations, accessible expand/collapse controls and guide links. Learning copy says “先理解要点，再展开推导”; interview copy says “先尝试白板，再查完整推导、图解和代码”.
- [x] `app/app.js`: include guide text in search fields; preserve deep-link opening. Keep mode switching anchored to the currently visible section rather than a stale pixel offset when page height changes.
- [x] `app/styles.css`/`index.html`: style guide/takeaway with existing tokens; add concise button descriptions. No new imagery, third mode or storage migration.

## 4. Verify contracts and actual behavior

- [x] Check guide coverage and links inside `scripts/validate-content.mjs`; use complete CHAPTERS positions for partial-range prerequisites.
- [x] Update renderer tests to assert learning starts folded with readable takeaway and interview starts open; both retain code/diagrams. Check safe rendering, no lost sections/questions, search and unchanged completion.
- [x] Extend real lesson-code validation for SFT pad/assistant/shift/segment boundaries. Add numerical SFT examples that compute from probabilities/lengths, including proportionality of sequence sum and token mean on a fixed batch.
- [x] Run `npm test`, `npm run validate`, `node scripts/check-math-rendering.mjs`, `python3 scripts/check-interview-math.py`, `python3 scripts/check-comprehensive-math.py`, and the existing PyTorch lesson-code command in its available environment.
- [x] Update `scripts/audit-browser.mjs` to expect mode-dependent open count and dynamic chapter count. Check all layouts both at default state and after opening details. No successful “30/30” when actual total is 31.
- [x] Update `scripts/audit-interactions.mjs` for the new mode contract. Run `ROADMAP_AUDIT_PREFIX=readability` with both browser scripts; add targeted native UI checks for guide links, search, open/close, mode anchors and completion.
- [x] Inspect desktop/mobile screenshots for 01, 02, 30 and a representative long advanced chapter.

## 5. Deliver

- [x] Update README and write `docs/research/readability-2026-10-08.md` with before/after examples, actual reading scope and validation evidence. No “normal density” standard or guarantee of learning improvement.
- [x] Review the diff, load git-commit/gh-cli skills, commit only this work. Preserve pre-existing untracked artifacts.
- [x] Fast-forward main if safe, push the approved website update to origin/main, verify Pages serves the new renderer/guides and works under its repository subpath.
- [x] Mark the active goal complete only after all applicable tasks and publication verification pass.

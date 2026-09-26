# Beginner ML Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new offline-first, beginner-friendly 21-chapter ML-to-LLM-post-training learning application, with complete rewritten content including OPD and OPSD.

**Architecture:** Use a zero-build ES-module web application. Each chapter is an isolated data module validated against one content contract; rendering, routing, search, progress persistence, glossary, and mode filtering remain separate modules. KaTeX is vendored locally and all content is available without network access.

**Tech Stack:** HTML5, CSS, vanilla JavaScript ES modules, local KaTeX, Node.js built-in test runner, Python static HTTP server, Playwright browser verification.

---

## File Map

- `index.html`: accessible application shell and fixed regions.
- `package.json`: ESM declaration and validation/test scripts.
- `README.md`: local usage, architecture, content scope, verification commands.
- `app/app.js`: application controller, events, routing, search orchestration.
- `app/renderer.js`: Markdown-lite, KaTeX, diagrams, chapter and quiz rendering.
- `app/store.js`: resilient local progress, mode, theme, and navigation state.
- `app/glossary.js`: beginner definitions for recurring terms.
- `app/styles.css`: responsive visual system and component states.
- `content/schema.js`: required section types and chapter validation.
- `content/catalog.js`: imports and exports ordered chapter catalog.
- `content/chapter-00.js` through `content/chapter-20.js`: rewritten teaching content.
- `scripts/validate-content.mjs`: structural, coverage, link, and duplicate checks.
- `tests/schema.test.mjs`: content-contract unit tests.
- `tests/store.test.mjs`: state normalization and storage fallback tests.
- `tests/renderer.test.mjs`: escaping, Markdown, diagram, and mode-filter tests.
- `vendor/katex/*`: copied local KaTeX runtime, CSS, and fonts.

## Shared Content Contract

Every chapter exports this shape:

```js
export default {
  id: "00",
  slug: "roadmap",
  part: "起点",
  title: "学习地图",
  subtitle: "从训练数据到会推理的模型",
  level: "入门",
  duration: 25,
  prerequisites: [],
  tags: ["路线", "机器学习"],
  objectives: ["说清 ML、深度学习和 LLM 的包含关系"],
  summary: "一句完整、可独立理解的结论。",
  sections: [
    { id: "intuition", type: "intuition", title: "先建立直觉", body: "..." },
    { id: "example", type: "example", title: "最小例子", body: "..." },
    {
      id: "diagram",
      type: "diagram",
      title: "机制图",
      body: "...",
      diagram: { kind: "flow", nodes: ["数据", "模型", "预测"], links: [[0, 1], [1, 2]] }
    },
    { id: "derivation", type: "derivation", title: "公式拆解", body: "..." },
    { id: "code", type: "code", title: "代码实验", body: "```python\n...\n```" },
    { id: "pitfall", type: "pitfall", title: "常见误区", body: "..." },
    { id: "comparison", type: "comparison", title: "方法对比", body: "..." },
    { id: "interview", type: "interview", title: "面试表达", body: "..." },
    {
      id: "quiz",
      type: "quiz",
      title: "自测",
      body: "完成后再看答案。",
      questions: [
        { q: "问题一", a: "答案一" },
        { q: "问题二", a: "答案二" },
        { q: "问题三", a: "答案三" }
      ]
    }
  ],
  sources: [{ label: "来源名称", url: "https://...", evidence: "原始资料" }]
};
```

Required section types are:

```js
export const REQUIRED_SECTION_TYPES = [
  "intuition",
  "example",
  "diagram",
  "derivation",
  "code",
  "pitfall",
  "comparison",
  "interview",
  "quiz"
];
```

## Task 1: Project Contract and Test Harness

**Files:**
- Create: `package.json`
- Create: `content/schema.js`
- Create: `tests/schema.test.mjs`

- [x] **Step 1: Write the failing schema tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateChapter } from "../content/schema.js";

const REQUIRED_TYPES = [
  "intuition", "example", "diagram", "derivation", "code",
  "pitfall", "comparison", "interview", "quiz"
];

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
    sections: REQUIRED_TYPES.map((type) => ({
      id: type,
      type,
      title: type,
      body: "足够完整的教学正文。",
      ...(type === "diagram"
        ? { diagram: { kind: "flow", nodes: ["输入", "输出"], links: [[0, 1]] } }
        : {}),
      ...(type === "quiz"
        ? { questions: [
            { q: "问题一", a: "答案一" },
            { q: "问题二", a: "答案二" },
            { q: "问题三", a: "答案三" }
          ] }
        : {})
    })),
    sources: [{ label: "教材", url: "https://example.com", evidence: "原始资料" }]
  };
}

test("accepts a complete chapter", () => {
  assert.deepEqual(validateChapter(makeCompleteChapter()), []);
});

test("rejects missing teaching layers and short quizzes", () => {
  const chapter = makeCompleteChapter();
  chapter.sections = chapter.sections.filter((section) => section.type !== "example");
  chapter.sections.find((section) => section.type === "quiz").questions.length = 2;
  const errors = validateChapter(chapter);
  assert.ok(errors.some((error) => error.includes("example")));
  assert.ok(errors.some((error) => error.includes("3 questions")));
});
```

- [x] **Step 2: Run the test and verify failure**

Run: `node --test tests/schema.test.mjs`

Expected: FAIL because `content/schema.js` does not exist.

- [x] **Step 3: Implement the schema and package scripts**

Implement `validateChapter(chapter)` to check metadata, unique section IDs, all required types, three or more quiz questions, valid diagram nodes, absolute HTTP(S) source URLs, and non-empty body text.

```json
{
  "name": "ml-roadmap",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "validate": "node scripts/validate-content.mjs",
    "serve": "python3 -m http.server 8010"
  }
}
```

- [x] **Step 4: Run tests**

Run: `npm test`

Expected: all schema tests PASS.

- [x] **Step 5: Commit**

```bash
git add package.json content/schema.js tests/schema.test.mjs
git commit -m "test: define chapter content contract"
```

## Task 2: Part 0 and Part 1 Content

**Files:**
- Create: `content/chapter-00.js`
- Create: `content/chapter-01.js`
- Create: `content/chapter-02.js`
- Create: `content/chapter-03.js`
- Create: `content/chapter-04.js`
- Create: `content/catalog.js`
- Create: `scripts/validate-content.mjs`

- [x] **Step 1: Add catalog validation before chapter content**

The script imports `CHAPTERS`, calls `validateChapter` for every chapter, and checks:

```js
assert.equal(CHAPTERS.length, 21);
assert.deepEqual(CHAPTERS.map((chapter) => chapter.id), [
  "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"
]);
```

Without `--range`, it also requires exactly 21 ordered chapter IDs. With `--range 00-04`, it validates only the requested existing chapters and deliberately skips the final count check. Both modes reject duplicate slugs, duplicate section IDs, missing prerequisite IDs, placeholder markers, and chapters with fewer than 1,800 Chinese characters.

- [x] **Step 2: Verify validation fails**

Run: `npm run validate`

Expected: FAIL because the 21 chapters are not present.

- [x] **Step 3: Write chapters 00-04**

Write every chapter against the shared contract. Include:

- 00: supervised learning, self-supervised pretraining, SFT, preference optimization, RL and distillation on one map.
- 01: scalar/vector/matrix/tensor, axes, shape tracing, broadcasting, matrix multiplication, NumPy-style examples.
- 02: vectors, dot products, matrices, derivatives, partial derivatives, chain rule, gradients and gradient descent.
- 03: random variables, expectation, variance, conditional probability, MLE, entropy, cross-entropy, KL, sampling, bias/variance.
- 04: regression/classification/generation, train-validation-test split, leakage, loss vs metric, precision/recall/F1/AUC/PR, calibration and A/B tests.

Each chapter must use a distinct hand-calculable numeric example and define every symbol before use.

- [x] **Step 4: Run targeted checks**

Run: `node scripts/validate-content.mjs --range 00-04`

Expected: chapters 00-04 pass; global count remains incomplete until later tasks.

- [x] **Step 5: Commit**

```bash
git add content/chapter-0*.js content/catalog.js scripts/validate-content.mjs
git commit -m "content: add beginner foundations"
```

## Task 3: Part 2 Deep Learning Foundations

**Files:**
- Create: `content/chapter-05.js`
- Create: `content/chapter-06.js`
- Create: `content/chapter-07.js`
- Modify: `content/catalog.js`

- [x] **Step 1: Write chapters 05-07**

Cover:

- 05: neuron, layer, activation, forward pass, loss, computation graph, chain rule, backpropagation, autograd, gradient vanishing/explosion.
- 06: GD/SGD, momentum, AdaGrad, RMSProp, Adam, AdamW, learning rate, warmup, clipping, Xavier/Kaiming/GPT-style initialization, BatchNorm/LayerNorm/RMSNorm, dropout and weight decay.
- 07: convolution and receptive field, pooling, ResNet, recurrence and BPTT, LSTM/GRU gates, teacher forcing, exposure bias, why attention replaced recurrence for large language models.

Use shape tables in each architecture and distinguish optimizer clipping from PPO clipping.

- [x] **Step 2: Validate the part**

Run: `node scripts/validate-content.mjs --range 05-07`

Expected: 3 chapters pass all teaching-contract checks.

- [x] **Step 3: Commit**

```bash
git add content/chapter-05.js content/chapter-06.js content/chapter-07.js content/catalog.js
git commit -m "content: teach deep learning foundations"
```

## Task 4: Part 3 LLM Foundations and Systems

**Files:**
- Create: `content/chapter-08.js`
- Create: `content/chapter-09.js`
- Create: `content/chapter-10.js`
- Create: `content/chapter-11.js`
- Create: `content/chapter-12.js`
- Modify: `content/catalog.js`

- [x] **Step 1: Write chapters 08-12**

Cover:

- 08: text-to-token pipeline, BPE/BBPE/WordPiece, vocabulary trade-offs, embeddings, tied embeddings and sequence padding.
- 09: scaled dot-product attention, masks, multi-head attention, residuals, normalization, FFN, causal LM loss, complete shape walkthrough and compact forward pseudocode.
- 10: RoPE, ALiBi/YaRN positioning, RMSNorm, SwiGLU, MHA/MQA/GQA/MLA, dense/MoE, load balancing, Mamba/SSM and NSA; separate mature practice from active research.
- 11: numeric formats, parameter/gradient/optimizer/activation memory, mixed precision, checkpointing, ZeRO/FSDP, tensor/pipeline/data parallelism, FlashAttention, KV Cache, prefill/decode and throughput/latency.
- 12: low-rank intuition, LoRA matrices and initialization, rank/alpha/dropout/target modules, merging, QLoRA/NF4/double quantization/paged optimizer, DoRA/AdaLoRA/rsLoRA and method selection.

- [x] **Step 2: Validate the part**

Run: `node scripts/validate-content.mjs --range 08-12`

Expected: 5 chapters pass and all prerequisite links resolve.

- [x] **Step 3: Commit**

```bash
git add content/chapter-{08,09,10,11,12}.js content/catalog.js
git commit -m "content: add transformer and llm systems path"
```

## Task 5: Part 4 Reinforcement Learning Foundations

**Files:**
- Create: `content/chapter-13.js`
- Create: `content/chapter-14.js`
- Create: `content/chapter-15.js`
- Modify: `content/catalog.js`

- [x] **Step 1: Write chapters 13-15**

Cover:

- 13: agent/environment loop, state/action/reward, trajectory, return, discount, Markov property, policy, V/Q/A, Bellman expectation and optimality equations, MC vs TD, on-policy vs off-policy.
- 14: tabular Q-Learning update, SARSA contrast, exploration, function approximation, DQN loss, replay buffer, target network, deadly triad, Double/Dueling DQN and why value-based methods poorly fit LLM token spaces.
- 15: log-derivative trick, REINFORCE, baseline as control variate, actor-critic, TD residual, GAE bias-variance trade-off, entropy bonus and token-level policy-gradient mapping.

- [x] **Step 2: Validate the part**

Run: `node scripts/validate-content.mjs --range 13-15`

Expected: 3 chapters pass; formulas define state, action, return, policy, value, advantage and likelihood ratio consistently.

- [x] **Step 3: Commit**

```bash
git add content/chapter-{13,14,15}.js content/catalog.js
git commit -m "content: build reinforcement learning foundations"
```

## Task 6: Part 5 LLM Post-Training

**Files:**
- Create: `content/chapter-16.js`
- Create: `content/chapter-17.js`
- Create: `content/chapter-18.js`
- Create: `content/chapter-19.js`
- Create: `content/chapter-20.js`
- Modify: `content/catalog.js`

- [x] **Step 1: Write PPO and GRPO family chapters**

Chapter 16 covers reward modeling, four-model RLHF, importance sampling, TRPO motivation, PPO penalty/clip, GAE, KL roles, training loop and failure modes.

Chapter 17 covers GRPO group baseline, critic removal, token/sequence aggregation, RLVR, zero-variance groups, DAPO, Dr.GRPO, GSPO, RLOO, REINFORCE++, clipping and length bias.

- [x] **Step 2: Write preference optimization**

Chapter 18 derives DPO from KL-regularized reward maximization and Bradley-Terry preference likelihood. It then compares IPO, KTO, ORPO, SimPO, online/iterative DPO and step-level variants without presenting all variants as interchangeable.

- [x] **Step 3: Write the OPD and OPSD chapter**

Chapter 19 must include the full design requirements:

```text
SFT: teacher trajectory -> student imitation (off-policy, dense)
GRPO: student trajectory -> verifier scalar (on-policy, sparse)
OPD: student trajectory -> external teacher distribution (on-policy, dense)
OPSD: student trajectory -> same model + privileged context (on-policy, dense)
```

Derive the per-token teacher-student objective, explain KL direction, show training pseudocode, compare compute/memory, and cover information leakage, teacher mismatch, long-CoT destabilization, Purified OPSD, RLSD, H2SD and Lightning OPD with primary-source links.

- [x] **Step 4: Write the 2026 synthesis**

Chapter 20 organizes methods by data origin, feedback granularity, teacher requirement, exploration, credit assignment, online/offline status, compute cost and failure mode. Include a method-selection decision tree and at least 20 interview questions spanning chapters 13-20.

- [x] **Step 5: Validate all content**

Run: `npm run validate`

Expected:

```text
21 chapters validated
189 required teaching sections present
0 duplicate ids
0 unresolved prerequisites
OPD coverage: PASS
OPSD coverage: PASS
```

- [x] **Step 6: Commit**

```bash
git add content/chapter-{16,17,18,19,20}.js content/catalog.js
git commit -m "content: complete llm post-training curriculum"
```

## Task 7: State and Progress

**Files:**
- Create: `app/store.js`
- Create: `tests/store.test.mjs`

- [ ] **Step 1: Write state tests**

Test defaults, invalid JSON recovery, unknown chapter removal, section toggling, mode normalization, and storage write failures.

```js
test("falls back when stored JSON is invalid", () => {
  const storage = { getItem: () => "{", setItem: () => {} };
  assert.deepEqual(loadState(storage), DEFAULT_STATE);
});
```

- [ ] **Step 2: Verify failure**

Run: `node --test tests/store.test.mjs`

Expected: FAIL because `app/store.js` is missing.

- [ ] **Step 3: Implement state module**

Export `DEFAULT_STATE`, `loadState`, `saveState`, `toggleSection`, `setMode`, `setTheme`, and `getProgress`. Keep an in-memory fallback when the Storage API throws.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

Expected: all tests PASS.

```bash
git add app/store.js tests/store.test.mjs
git commit -m "feat: persist local learning progress"
```

## Task 8: Renderer, Diagrams, and Glossary

**Files:**
- Create: `app/renderer.js`
- Create: `app/glossary.js`
- Create: `tests/renderer.test.mjs`
- Copy: `vendor/katex/`

- [ ] **Step 1: Write renderer tests**

Test HTML escaping, fenced code preservation, table rendering, math placeholders, flow/matrix/comparison diagrams, glossary annotation, interview-mode filtering and quiz answer disclosure markup.

- [ ] **Step 2: Verify failure**

Run: `node --test tests/renderer.test.mjs`

Expected: FAIL because renderer exports are missing.

- [ ] **Step 3: Implement pure rendering functions**

Export:

```js
export function escapeHtml(value) {}
export function renderMarkdown(source, options = {}) {}
export function renderDiagram(diagram) {}
export function visibleSections(chapter, mode) {}
export function renderChapter(chapter, state) {}
```

Do not interpolate unescaped source content into attributes. KaTeX failures return `<code class="math-fallback">...</code>`.

- [ ] **Step 4: Add glossary**

Include concise definitions for at least 60 recurring terms, including tensor, gradient, logit, token, policy, trajectory, return, advantage, critic, on-policy, off-policy, KL, RLVR, OPD, OPSD and privileged information.

- [ ] **Step 5: Copy local KaTeX assets**

Run:

```bash
mkdir -p vendor
cp -R ../ml-notes/static/katex vendor/katex
```

- [ ] **Step 6: Test and commit**

Run: `npm test`

Expected: renderer and existing tests PASS.

```bash
git add app/renderer.js app/glossary.js tests/renderer.test.mjs vendor/katex
git commit -m "feat: render lessons diagrams and formulas"
```

## Task 9: Application Shell and Controller

**Files:**
- Create: `index.html`
- Create: `app/app.js`
- Create: `app/styles.css`

- [ ] **Step 1: Build the semantic shell**

Use `header`, `nav`, `main`, `article`, and `aside`. Provide icon buttons with `aria-label` and `title`, a search input with label, a two-state segmented mode control, a stable progress meter and mobile drawers.

- [ ] **Step 2: Implement controller behavior**

Load the catalog, parse `#chapter/section`, render grouped navigation, filter search results, render the selected chapter, wire section completion, preserve scroll restoration, copy code, theme, mode, drawers and invalid-route recovery.

- [ ] **Step 3: Implement responsive styling**

Use three columns above 1180px, two columns from 760px to 1179px, and one column with drawers below 760px. Add distinct styles for intuition, examples, derivations, pitfalls, comparisons, interviews and quizzes. Keep cards at 8px radius or less.

- [ ] **Step 4: Run static checks**

Run:

```bash
npm test
npm run validate
```

Expected: all tests pass and 21 chapters validate.

- [ ] **Step 5: Commit**

```bash
git add index.html app/app.js app/styles.css
git commit -m "feat: build offline learning workspace"
```

## Task 10: Documentation and Full Verification

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/plans/2026-09-26-beginner-ml-roadmap.md`

- [ ] **Step 1: Write README**

Document:

```bash
cd /Users/bytedance/Desktop/面试/ml-roadmap
npm test
npm run validate
python3 -m http.server 8010
```

Explain project scope, directory ownership, offline behavior and how to add a chapter.

- [ ] **Step 2: Start the server**

Run: `python3 -m http.server 8010`

Expected: server listens on `http://127.0.0.1:8010/`.

- [ ] **Step 3: Verify HTTP resources**

Run:

```bash
curl -f http://127.0.0.1:8010/
curl -f http://127.0.0.1:8010/content/catalog.js
curl -f http://127.0.0.1:8010/vendor/katex/katex.min.js
```

Expected: all requests return HTTP 200.

- [ ] **Step 4: Run browser acceptance**

At 1440x1000 and 390x844:

- Load chapter 00 without manual selection.
- Search `OPSD` and open chapter 19.
- Switch between learning and interview mode.
- Expand a derivation and a quiz answer.
- Mark a section complete, reload, and confirm persistence.
- Copy a code block.
- Open and close each mobile drawer.
- Confirm no clipped text, overlap, horizontal page overflow, failed resources, or console errors.

- [ ] **Step 5: Capture verification screenshots**

Save desktop and mobile screenshots under `artifacts/` and inspect them visually.

- [ ] **Step 6: Complete plan checkboxes and commit**

```bash
git add README.md artifacts docs/superpowers/plans/2026-09-26-beginner-ml-roadmap.md
git commit -m "docs: finish roadmap verification"
```

## Completion Evidence

The project is complete only when all of the following are simultaneously true:

1. `npm test` passes.
2. `npm run validate` reports all 21 chapters and all 189 required teaching sections.
3. Search finds OPD and OPSD in chapter 19 and the synthesis chapter.
4. Browser acceptance passes at both required viewports with zero console errors.
5. Screenshots show readable, non-overlapping content.
6. The old `/Users/bytedance/Desktop/面试/ml-notes` directory has no modifications.

# Concept-First Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unnecessary numerical calculation from the first reading while retaining rigorous folded derivations and whiteboard practice.

**Architecture:** Rewrite visible examples and basic quizzes in the existing chapter objects. Preserve section IDs, derivations, whiteboards, sources and progress storage; add a focused content test that rejects arithmetic-heavy first-reading examples.

**Tech Stack:** JavaScript lesson objects, Node test runner, existing content validator and KaTeX checks, Python numerical suites, agent-browser.

---

### Task 1: Define the first-reading contract

**Files:**
- Create: `tests/concept-first-content.test.mjs`
- Modify: `README.md`

- [x] Add a test that inspects every non-whiteboard `example` and `quiz` section, rejects three or more display formulas in an example, and rejects basic quiz prompts dominated by arithmetic operators or requests to compute a precise result.
- [x] Add explicit exceptions only for shape and unit identification; do not exempt whole chapters.
- [x] Run `node --test tests/concept-first-content.test.mjs` and confirm it fails on the current content.
- [x] Document the concept-first rule in README.

### Task 2: Rewrite foundations and model-building examples

**Files:**
- Modify: `content/chapter-00.js` through `content/chapter-15.js`
- Modify: `content/chapter-30.js`
- Modify: `content/reading-guides.js`

- [x] Replace arithmetic-heavy visible examples with conceptual traces for prediction, tensors, gradients, probability, evaluation, neural networks, optimization, sequence models, tokenization, Transformer, architecture, systems, PEFT and RL foundations.
- [x] Keep at most one small number or shape where it establishes meaning; move exact calculations to existing derivations or whiteboards.
- [x] Rewrite basic quizzes as meaning, direction, distinction and debugging questions.
- [x] Keep code runnable but remove prose that asks the reader to reproduce exact outputs by hand.
- [x] Run the focused test and content validator.

### Task 3: Rewrite post-training and Agent examples

**Files:**
- Modify: `content/chapter-16.js` through `content/chapter-29.js`
- Modify: `content/reading-guides.js`
- Modify: `content/source-manifest.js` only if a source anchor moves

- [x] Replace PPO/GRPO/DPO/OPD optimizer arithmetic in visible examples with update-direction and supervision-source explanations.
- [x] Replace industrial score, budget and ratio calculations in first-reading examples with evidence-reading and attribution decisions; retain sourced figures in folded or reference material.
- [x] Replace Agentic RL reward, ESS, neighbor and queue arithmetic with task-state, signal-quality and system-contract examples.
- [x] Rewrite basic quizzes to test method boundaries and diagnosis, leaving precise estimators to whiteboards.
- [x] Run source validation and focused content tests.

### Task 4: Verify behavior and publish

**Files:**
- Modify: `docs/research/audience-audit-2026-10-10.md`
- Create: `docs/research/concept-first-revision-2026-10-10.md`

- [x] Run `npm test`, `npm run validate`, KaTeX parsing, all existing Python math checks and lesson-code checks.
- [x] Run browser layout and interaction checks at desktop, tablet and phone sizes, saving temporary artifacts outside the repository.
- [x] Record actual modified chapters, retained calculations and validation scope; do not claim learning effectiveness without learner testing.
- [ ] Commit only task files, push `main`, and verify GitHub Pages serves the new content.

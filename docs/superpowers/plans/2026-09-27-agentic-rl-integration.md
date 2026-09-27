# Agentic RL Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand ML Roadmap to 30 substantive chapters covering all 37 documents at upstream commit `66ae4423b36270ef50a288fb1bb2e1b31c46c329`.

**Architecture:** Keep the existing offline ES-module application and chapter contract. Record document-to-section coverage in a source manifest; authoritative references and correction notes distinguish evidence from opinion. Migrate progress to v2 and derive displayed counts from the catalog.

**Tech Stack:** Vanilla JS, local KaTeX, Node test runner, Python HTTP server, Chromium via agent-browser.

User approved the design and explicitly requested immediate implementation. No additional approval gate applies. Work in the existing isolated repository and feature branch. Main worker integrates and verifies; independent content workers own disjoint chapter files. The named subagent/worktree/finishing skills are unavailable, so use the installed executing-plans workflow and native agent/git tools.

## File responsibilities

- `content/chapter-20.js`–`chapter-29.js`: complete lessons, nine section types each.
- `content/chapter-00.js`, `chapter-11.js`, `chapter-16.js`–`chapter-19.js`: integration bridges without removing existing foundations.
- `content/source-manifest.js`: immutable upstream identity, 37 document mappings, substantive coverage anchors.
- `content/catalog.js`: all 30 chapters in dependency order.
- `scripts/validate-content.mjs`: strict count, teaching contract, real content coverage, source mappings and prerequisites.
- `app/store.js`: v1→v2 migration, preserve 00–19 progress/settings, discard old 20 completion.
- `app/app.js`, `index.html`: dynamic counts and visible source navigation.
- `app/renderer.js`, `app/styles.css`: only fixes needed to faithfully present branching diagrams and new content.
- `app/glossary.js`: new recurring terms.
- `tests/source-manifest.test.mjs`, `tests/store-migration.test.mjs`: coverage and migration behavior.
- `docs/research/`: source inventory and correction evidence; `artifacts/`: acceptance results/screenshots.
- `README.md`: actual 30-chapter usage and attribution; `THIRD_PARTY_NOTICES.md`: upstream license.

## Task 1: Freeze evidence and establish coverage

- [ ] Compare local upstream SHA and all 37 markdown paths to the approved spec; retain file hashes.
- [ ] Verify key definitions using original papers: DAPO 2503.14476, VAPO 2504.05118, MiniMax-M1 2506.13585, GSPO 2507.18071, SAPO 2511.20347.
- [ ] Verify industrial/Agentic references where used. Do not repeat unverified scores, affiliation, “first”, or universal convergence claims.
- [ ] Save a correction ledger with source claim, verified replacement, primary URL and evidence excerpt. Cover CISPO/GSPO, RM vs critic, clipping gradient, MoE IS support, pass@k, industrial costs, and author predictions.

## Task 2: Write chapters 20–24

All chapter modules export the existing object contract. Use `String.raw` for math and `~~~python` fences.

- [ ] **20**: VAPO critic initialization, decoupled/length-adaptive GAE and positive NLL; CISPO clipped detached token IS weights; GSPO normalized sequence ratio; SAPO soft gates. Hand-calculate clipping for positive/negative advantages and distinguish derivative w.r.t. ratio from log probability. Explain Routing Replay as complementary engineering, not mathematically obsolete.
- [ ] **21**: six SFT acquisition families, RL query/reward/environment axes, success-rate vs pass@k, contamination and quality filters, mixtures/curricula and SFT–RL feedback. Include Self-Instruct, Evol-Instruct, OSS-Instruct, SelfCodeAlign, SkillMix, CodecLM, STaR, LSP, SGALM, SWE-smith, GASP, DoReMi, FineWeb and Seed-Coder in substantive teaching.
- [ ] **22**: DeepSeek R1/V3/V3.2, Qwen2.5/3/3.5, Seed DAPO/VAPO/1.5/2.0/Coder. Compare task, stages, data, reward, constraints and evidence boundary; explain model-specific reported outcomes without mixing benchmarks/cost denominators.
- [ ] **23**: Kimi K1.5/K2/K2.5, MiniMax 01/M1/M2/M2.5/M2.7, GLM-5 and closed-source public alignment. Teach partial rollout, long2short, MuonClip, mode fusion/interleaving, Forge and cross-stage distillation. Mark blog-only information and unspecified internals.
- [ ] **24**: move useful original chapter 20 synthesis here; eight-dimensional selection, seven-algorithm comparison, corrected historical evolution, six proposed common practices, five challenges and nine author viewpoints as testable hypotheses. Preserve 20 integrated interview questions.
- [ ] Validate each owned module independently with `validateChapter`, ≥1,800 Chinese characters and actual numeric/code/quiz content.

## Task 3: Write chapters 25–29

- [ ] **25**: environment, state/observation/history, token vs tool actions, multi-turn trajectory, four challenges, response-only masking, a complete toy agent episode and return calculation.
- [ ] **26**: IGPO, CM2, SeeUPO, ARLArena/SAMPO, VCPO. Also explain EDGE-GRPO, ReGFT, PF-PPO, ZeroSearch, DARS, ProRL, GMPO, OTB and Dr. MAS, with primary references and limitations. ESS numeric example; separate baseline validity from sampling/reweighting.
- [ ] **27**: EMPO², LUFFY, GiGPO, ELPO, ProxMO plus TreePO, LADDER, SGE, SSRL, Step-GRPO, ARPO and VinePPO. Teach state grouping, weighted baseline, memory transfer and error-localization uncertainty. Hand-calculate a step baseline and avoid claiming correlation proves causality.
- [ ] **28**: task+environment+verifier+trajectory pipeline; SWE F2P/P2P, Terminal/Search synthesis; async freshness, TITO, IcePop, deterministic attention/routing, partial rollout, prefix sharing, Agent Swarm/PARL; ABE/AWM/ASTRA/GEM. Code checks version/ID/mask consistency.
- [ ] **29**: complete algorithm map, three technical routes, industry/ecosystem evidence and original author predictions without invented census percentages; decisions, failure diagnosis, comprehensive interview questions and capstone assessment.
- [ ] Validate chapter modules and all claimed primary sources before integration.

## Task 4: Bridge old chapters, catalog, glossary and source manifest

- [ ] Add Pre/Mid/Post/Agentic route to 00, consistency bridge to 11, reward boundaries to 16, DAPO details to 17, industrial DPO placement to 18, cross-stage OPD to 19.
- [ ] Add new imports to `content/catalog.js` in 00–29 order; every prerequisite must occur earlier.
- [ ] Add glossary terms for new algorithms, TITO, ESS, partial rollout, RM/critic, environment/observation and rollout policy versions.
- [ ] Build all 37 source manifest entries with `path`, `sha256`, `chapters`, and `coverage` entries containing `chapterId`, `sectionId`, `terms`; source-only mentions do not count as body coverage.
- [ ] Write failing manifest tests, observe failure, then implement validation. Example independent assertions:

```js
assert.equal(SOURCE_DOCUMENTS.length, 37);
assert.deepEqual(CHAPTERS.map(c => c.id),
  Array.from({ length: 30 }, (_, i) => String(i).padStart(2, "0")));
for (const doc of SOURCE_DOCUMENTS) {
  assert.ok(doc.coverage.length > 0);
  for (const anchor of doc.coverage) {
    const section = CHAPTERS.find(c => c.id === anchor.chapterId)
      ?.sections.find(s => s.id === anchor.sectionId);
    assert.ok(section);
    for (const term of anchor.terms) assert.ok(section.body.includes(term));
  }
}
```

- [ ] Upgrade validation to 30/270, code fences, prerequisite order, manifest coverage; check all new search terms in body text.

## Task 5: State migration and application integration

- [ ] Write migration tests in a new file using a key-aware Map storage: preserve 00/19 and settings from v1, discard old 20 progress, prefer v2 over v1, keep new 20/29 progress on v2 reload, malformed/throwing storage falls back safely.
- [ ] Observe tests fail against v1 store.
- [ ] Use `STORAGE_KEY = "ml-roadmap-state-v2"` and `LEGACY_STORAGE_KEY = "ml-roadmap-state-v1"`. Read v2 first; only when absent read legacy, normalize legacy to version 2 and omit legacy chapter 20. Persist migrated data to v2 without modifying legacy backup.
- [ ] Set course label with `CHAPTERS.length`; progress uses `getProgress(state)`; remove all hardcoded UI 21/189.
- [ ] Display upstream document links per chapter with attribution; make branch/cycle diagrams reflect actual links if renderer currently flattens them.
- [ ] Run `npm test`, `npm run validate`, `git diff --check`; update baseline store expectations to v2/270.

## Task 6: Documentation, browser acceptance and completion audit

- [ ] Update README for 30 chapters, routes, v2 migration, upstream commit, coverage and verification commands; include upstream MIT attribution.
- [ ] Start local Python server on 8010; verify HTTP 200 for HTML, app, catalog, all chapters and KaTeX/fonts.
- [ ] At 1440×1000, 900×900 and 390×844 verify all 30 chapter renders, math, diagram links, bounds and console/network. Save structured results and inspected screenshots under `artifacts/`.
- [ ] Use native browser actions for search, navigation, learn/interview switch, folding, code copy, completion/reload, theme, both drawers and invalid route recovery. Inspect code/formula/table scrolling locally without hiding page overflow.
- [ ] Verify source document path set against frozen upstream; inspect coverage beyond keyword counts. Re-run tests only after fixes.
- [ ] Confirm old `ml-notes` has no new modification timestamps, all plan items completed, final git diff clean; commit meaningful increments then final verification.
- [ ] Mark goal complete only after every design requirement is proved by current evidence.

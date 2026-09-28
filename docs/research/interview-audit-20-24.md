# Interview Mathematics Audit: Chapters 20-24

Date: 2026-09-28.

Scope: `content/chapter-20.js` through `content/chapter-24.js`, this audit,
and `scripts/check-math-20-24.py`. No UI, schema, manifest, shared test, or
other chapter edits were made by this worker. No commit was created.

## Inputs and Preservation

Read the approved design and plan:

- `docs/superpowers/specs/2026-09-28-interview-math-design.md`
- `docs/superpowers/plans/2026-09-28-interview-math.md`

Read all five original chapters, `content/source-manifest.js`, and the
relevant evidence ledgers in full:

- `docs/research/advanced-policy-data-evidence.md`
- `docs/research/industrial-evidence.md`
- `docs/research/integration-evidence.md`

The evidence ledgers retain the 2026-09-27 primary-source verification and
the upstream revision `66ae4423b36270ef50a288fb1bb2e1b31c46c329`.
This revision reuses those verified definitions, rather than claiming a
new industrial training reproduction or a new web verification.

In every chapter, deep equality against `git show HEAD:content/chapter-XX.js`
confirmed preservation of all nine original section objects:
`intuition`, `example`, `diagram`, `derivation`, `code`, `pitfall`,
`comparison`, `interview`, `quiz`. This preserves bodies, diagrams, original
questions, and source-anchor phrases, not just the IDs. In particular,
chapter 20's verified VAPO, CISPO, GSPO, and SAPO derivations remain intact.

## Exact New IDs

Every chapter starts with `roadmap` of type `roadmap` and ends with
`whiteboard` of type `quiz`. Each roadmap has at least three distinct,
existing in-chapter targets, with levels restricted to `必会`, `推导`,
and `进阶`. Every new whiteboard answer contains `得分点`.

| Chapter | New independent derivation IDs | Sections | Whiteboard questions |
| --- | --- | ---: | ---: |
| 20 | `math-gradient-units`, `math-update-diagnostics` | 13 | 3 |
| 21 | `math-pass-k-proof`, `math-dynamic-selection`, `math-weight-verifier` | 14 | 3 |
| 22 | `math-domain-normalization`, `math-distillation-pipeline`, `math-pipeline-budget` | 14 | 3 |
| 23 | `math-async-ratio`, `math-opd-gradient`, `math-agent-budget` | 14 | 3 |
| 24 | `math-objective-gradients`, `math-paired-inference`, `math-budget-design` | 14 | 4 |

Total: 45 unchanged original sections, 5 roadmaps, 14 independent math
sections, and 5 whiteboards containing 16 worked questions. All math
sections provide definitions and assumptions, derivation steps, numerical
substitution, interpretation, and follow-up limits.

## Coverage and Evidence

| Exact target | Added reasoning and evidence boundary |
| --- | --- |
| `20/math-gradient-units` | Converts the verified local coefficients into parameter gradients with mask, batch, and length factors; derives token versus sequence averaging and the relative positive-NLL scale. Primary definitions remain those verified in the advanced-policy ledger: VAPO section 4, M1/CISPO section 3.1, GSPO section 4, SAPO sections 3-4. The new normalization examples are independent teaching calculations. |
| `20/math-update-diagnostics` | Derives absolute-coefficient concentration and the covariance of mean log-ratio. Uses the ledger's warning that GSPO noise reduction requires correlation assumptions. This ESS-shaped diagnostic is explicitly not an independent-token sample count or a parameter-gradient norm. |
| `21/math-pass-k-proof` | Proves the combinatorial estimator by averaging subset indicators, following the pass@k definition verified against `2107.03374`, section 2.1. Distinguishes original IID generation from without-replacement subset selection and gives a finite-sample plug-in counterexample. |
| `21/math-dynamic-selection` | Derives mixed-group acceptance, Bayes-selected task proportions, negative-binomial collection costs, and the limits of inverse acceptance weighting. DAPO supplies the filtering mechanism; the probability and cost calculations are teaching derivations, not disclosed DAPO measurements. |
| `21/math-weight-verifier` | Inverts token-mixture weights, derives fixed-weight ESS from variance, and uses a confusion table to derive verifier pass rate, retained-pool correctness, and the conditional noise-gradient relation. All examples are synthetic. DoReMi's existing scope as pretraining evidence is preserved. |
| `22/math-domain-normalization` | Connects R1 mixed SFT, V3.2 expert distillation/mixed RL, and Seed task-specific feedback to explicit domain-normalized losses and logits gradients. Evidence: industrial ledger E22-01, E22-03, E22-11. No shared proprietary weight vector is asserted. |
| `22/math-distillation-pipeline` | Separates verified-output RS distributions, hard-output SFT, fixed-prefix full-vocabulary forward KL, and mode conditioning. Evidence: E22-01, E22-02, E22-06 and the Qwen3 fusion correction in the advanced-policy ledger. Forward KL is a specified teaching implementation, not an inferred undisclosed Qwen recipe. |
| `22/math-pipeline-budget` | Derives rejected-token costs and distinguishes offline RS from student-prefix teacher scoring. Qwen3's 3,995 queries and V3 Table 1 costs retain E22-02/E22-06 attribution. The 16 rollouts, 4,096-token lengths, CU rates, acceptance, and teacher costs are explicitly teaching assumptions. |
| `23/math-async-ratio` | Separates parameter drift from train/infer mismatch, then distinguishes conditional token correction from full-trajectory ratios and support truncation. Evidence: E23-01, E23-06, E23-09, E23-11, E23-12; support discussion also agrees with E22-04. The factorization is a mathematical analysis, not an assertion of a complete IcePop or Forge implementation. |
| `23/math-opd-gradient` | Starts from GLM-5 section 3.5's frozen teacher/student log-probability difference, then derives its fixed-prefix, unclipped reverse-KL gradient relation and a clipping-bias counterexample. Evidence: E23-12 and integration ledger's cross-stage OPD verification. Explicitly excludes unconditional equivalence for asynchronous trajectory optimization. |
| `23/math-agent-budget` | Derives dependency critical paths, a simplified shared-prefix work ledger, and stable-queue Little's law. Evidence: E23-01, E23-04, E23-09, E23-11. No teaching work ratio is presented as PARL/Forge's measured speedup; repeated-prefix loss multiplicity must be retained. |
| `24/math-objective-gradients` | Derives SFT and DPO parameter gradients and compares them with verified policy coefficients and fixed-prefix forward/reverse KL gradients. Uses the chapter's original DPO/PPO references and the previous evidence ledgers. Sampling support, information access, and normalization determine applicability. |
| `24/math-paired-inference` | Independently derives paired effect/variance, exact conditional McNemar, Holm step-down/adjusted p values, and approximate paired Wald intervals. The contingency tables are synthetic teaching examples, not industrial benchmark claims. States independence, clustered tasks, discrete/degenerate cases, and the difference between exact testing and approximate intervals. |
| `24/math-budget-design` | Converts the chapter's existing synthetic A/B costs into marginal cost and deployment amortization, then specifies controlled comparisons and seed/search budgets. The upstream cross-model experiences and nine opinions remain hypotheses, not empirical proof. |

## Original Manifest Anchors

All 29 term occurrences targeting these five chapters were checked directly
against the current `SOURCE_DOCUMENTS` entries. No manifest edit was needed.
Repeated occurrences below correspond to distinct source mappings.

| Chapter / original section | Required body terms |
| --- | --- |
| `20/derivation` | `VAPO`, `CISPO`, `GSPO`, `SAPO` |
| `20/comparison` | `CISPO`, `GSPO` |
| `20/intuition` | `PPO` |
| `20/pitfall` | `梯度` |
| `21/intuition` | `SFT`, `RL` |
| `22/intuition` | `DeepSeek`, `Qwen`, `Seed` |
| `23/intuition` | `Kimi`, `MiniMax`, `GLM` in both GLM and Agentic Training mappings |
| `23/comparison` | `OpenAI` |
| `24/intuition` | `PPO`, `演进图`, `CISPO`, `2017`, `2023` |
| `24/comparison` | `选型`, `VAPO`, `SAPO`, `六条跨模型经验` |
| `24/pitfall` | `五个挑战`, `九条观点` |

Counts by chapter: 8, 2, 3, 5, 11. Additional legacy terms in the evidence
ledgers are preserved because the original section objects are unchanged.

## Independent Numerical Verification

Run:

```sh
python3 scripts/check-math-20-24.py
```

Result: 15 test methods passed. The script uses only Python's standard
library; it neither executes chapter code nor reads chapter text to obtain
expected answers. Finite differences perturb the actual mathematical
objectives while preserving required stop-gradients. Combinatorial checks
enumerate every binary outcome and every k-subset for n from 1 through 6,
and compare exact rational expectations with the stated estimator.

| Target | Independently verified values |
| --- | --- |
| 20 policy derivatives | PPO four cases `0, -3, 1, 0`; GSPO two-token coefficients `0.5, 0.5`; SAPO coefficient `1.1796715994`; detached CISPO coefficients checked by finite differences |
| 20 units and diagnostics | Sequence projection `0.25` versus token projection `-0.125`; NLL/main coefficient ratio `0.4`; concentration `25/13 = 1.9230769`; log-ratio variance `0.4804530139`; correlated mean variance `0.208` |
| 21 pass@k | `13/28` versus plug-in `7/16`; n=k=2 plug-in expectation `5/8`, true target `3/4`; all-success/failure and invalid count boundaries |
| 21 dynamic sampling | Acceptance `[0.3438, 0.875]`, total `0.6094`, first accepted share `0.2820807351`; `164.0958319659` candidate groups and `656383.3278634723` expected tokens for 100 retained groups |
| 21 mixture and noise | Sample mixture `[0.8,0.2]` gives equal expected tokens; observed pass `0.27`; retained correctness `19/27`; noise-gradient factor `0.85`; existing DoReMi example first weight `0.3543436938` |
| 22 domain loss | Equal-domain NLL `2` versus flat-token NLL `2.6`; fourfold per-token weight difference; weighted rewards `0.72` and `2.07` after changing one reward scale |
| 22 distillation | Forward KL `0.1927447570`, soft-target gradient `[-0.3,0.3]`, hard-target gradient `[-0.5,0.5]`; RS output distribution `[1,0]` |
| 22 budget | RS `6800 CU`, incorrectly retained-only `3200 CU`, illustrative OPD `3500 CU`; query example `261816320` tokens; V3 post/total `0.1793400287%`, post/pretrain `0.1876876877%` |
| 23 ratios and OPD | Ratio `1.2 * 1.25 = 1.5`; unsupported-target IS expectation `0.6` versus masked conditional `1`; OPD expected ascent `0.4300222726`, clipped `0.3860777811` |
| 23 system work | Independent parallel latency `8` seconds versus dependent `11`; dependent speedup `15/11`; simplified prefix work ratio `33/13`; stable in-flight count `10`, illustrative version age `2` |
| 24 objectives | DPO loss `log(1.5)`, coefficients `[-1/3,1/3]`; forward KL gradient `[-0.4,0.4]`, reverse gradient `[-0.4300222726,0.4300222726]` |
| 24 statistics | Exact McNemar `0.629058837890625`; paired SE `0.0413289343`; approximate interval `[-0.0510047112,0.1110047112]`; Holm adjusted `[0.0234375,0.0771484375,0.62905883789]`, only first rejected |
| 24 budget | `2M` versus `3M` generated tokens, `500 GPU-hours` per unit success-probability difference, equivalently `5` per percentage point; 100-hour budget fits five A or two B runs |

The clipping example's chapter text rounds `0.3860777811` to `0.386078`.
Expected counts can be fractional even though realized groups and tokens
are integers. Numerical correctness is not evidence of industrial efficacy.

## Structural and Rendering Verification

Direct imports of only the owned chapters were used to avoid depending on
other workers' incomplete content edits.

- `node --check` passed for each of the five modules.
- `validateChapter` returned no errors for each chapter using the main
  worker's updated schema.
- Section IDs were unique; roadmap targets existed; original sections
  were deep-equal to HEAD; all whiteboards had at least three valid q/a
  objects with scoring points.
- All original embedded Python examples were separately extracted and
  executed: five examples, five successful exits.
- Actual `renderChapter` output was checked in both modes. Every
  derivation remained visible and initially open, roadmap/formula links
  resolved to the expected IDs, and old/new answers remained disclosures.
- Local KaTeX parsed body and answer formulas with `throwOnError: true`
  and `strict: "error"`: zero failures.

| Chapter | Learn sections / formulas | Interview sections / formulas |
| --- | ---: | ---: |
| 20 | 13 / 161 | 10 / 159 |
| 21 | 14 / 148 | 11 / 148 |
| 22 | 14 / 112 | 11 / 112 |
| 23 | 14 / 126 | 11 / 126 |
| 24 | 14 / 106 | 11 / 106 |

There were 653 learn-mode and 651 interview-mode formula occurrences
(1,304 total, counting repeated occurrences). These are parser checks,
not a measure of pedagogical completeness.

## Integration Limits

This audit is scoped content and numerical verification. Browser layout,
responsive behavior, search interaction, persisted progress, and final
whole-repository tests belong to the main integration worker. No
browser or full-site acceptance is claimed here. Existing industrial
results retain their original model, version, protocol, and evidence
qualifications; new examples do not disclose or infer hidden parameters.

# Interview Mathematics Audit: Chapters 25-29

Date: 2026-09-28.

## Scope and Evidence

Implemented only:

- `content/chapter-25.js` through `content/chapter-29.js`
- `scripts/check-math-25-29.py`
- This audit

Design and authorization come from
`docs/superpowers/specs/2026-09-28-interview-math-design.md` and
`docs/superpowers/plans/2026-09-28-interview-math.md`.
No approval loop, commit, UI changes, schema changes, or source-manifest edits
were made by this worker. Other workers' changes were left intact.

Read all five owned chapters, `content/source-manifest.js`, and these existing
evidence records:

- `docs/research/agentic-core-evidence.md`: POMDP, IGPO, CM2, SeeUPO,
  ARLArena/SAMPO, VCPO, and the nine related reward/stability methods.
- `docs/research/agentic-exploration-systems-evidence.md`: exploration/credit
  methods, exact versus soft candidates, TITO, IcePop, environment construction,
  partial rollout, Forge, routing, and PARL.
- `docs/research/integration-evidence.md`: chapter 29's synthesis, source
  statistics limitations, and separation of author predictions from evidence.

Existing paper-specific definitions and caveats were preserved verbatim.
New probability, calculus, queueing, and statistical examples are explicitly
teaching abstractions. They do not claim to reproduce a paper's complete
optimizer, production system, experimental result, or unpublished hyperparameter.

## Preserved Anchors

Every chapter retains these nine original section objects, including their
complete bodies, questions, diagrams, types, and titles:

`intuition`, `example`, `diagram`, `derivation`, `code`, `pitfall`,
`comparison`, `interview`, `quiz`.

A direct comparison against `git show HEAD:content/chapter-XX.js` checked
deep equality of every original section and the entire `sources` array.
All 45 original sections and all 54 source entries were unchanged.

| Chapter | Source entries | Manifest coverage records | Manifest target section IDs |
| --- | ---: | ---: | --- |
| 25 | 4 | 5 | `intuition`, `diagram` |
| 26 | 15 | 2 | `intuition`, `comparison` |
| 27 | 12 | 1 | `comparison` |
| 28 | 16 | 8 | `intuition`, `example`, `derivation`, `pitfall`, `comparison` |
| 29 | 7 | 7 | `intuition`, `diagram`, `pitfall`, `comparison` |

All 23 coverage records still resolve to real sections, and all required
normalized body terms remain present. Repeated coverage records can point to
the same section; the table does not confuse records with distinct targets.

## Chapter 25

New IDs: `roadmap`, `math-belief`, `math-action-masks`, `math-smdp`, `whiteboard`.

Roadmap targets: `example`, `math-belief`, `math-action-masks`, `math-smdp`,
`whiteboard`. Prerequisite chain: conditional probability and policy gradients,
then hidden-state inference, action likelihood, masks, and duration-aware return.

| Section | Independent check | Result and boundary |
| --- | --- | --- |
| `math-belief` | `Chapter25.test_belief_bayes_and_zero_evidence` | Predictive belief `(0.52, 0.48)`; positive-observation evidence `0.564`; posterior `(39/47, 8/47)`; negative-observation posterior first component `13/109`. Equal nonzero likelihood retains the predictive belief; zero evidence is rejected. |
| `math-action-masks` | `Chapter25.test_masked_likelihood_and_finite_difference` | Mask `[0,1,1,0,1]`; policy probability factor `0.1`; loss `log(10)/3 = 0.7675283643`. Finite differences give generated-logit gradients `(-1/6,-1/4,-1/15)` and zero direct loss for user/tool positions. |
| `math-smdp` | `Chapter25.test_smdp_time_and_truncation` | Durations 2 and 3 seconds give `G1=0.629`, `G0=0.40949`; timestamp sum equals recursion. Per-turn discount instead gives `0.62`. A nonterminal cut bootstraps, while incorrectly terminating gives `-0.1`. |

Whiteboard: 3 complete questions, covering Bayes derivation, masked likelihood
and gradients, and SMDP/truncation. All answers include scoring criteria and
follow-up conditions. The policy/environment distinction and the indirect
gradient through tool representations are explicit.

## Chapter 26

New IDs: `roadmap`, `math-potential-shaping`, `math-entropy`,
`math-reward-noise`, `math-suffix-is`, `whiteboard`.

Roadmap targets: `math-potential-shaping`, `math-entropy`,
`math-reward-noise`, `math-suffix-is`, `derivation`, `whiteboard`.
Learning chain: reward invariance, information definitions, noise-induced
gradient changes, suffix distribution correction, then verified methods.

| Section | Independent check | Result and boundary |
| --- | --- | --- |
| `math-potential-shaping` | `Chapter26.test_shaping_telescope_and_terminal_reversal` | Shaping `[0.25,0.22,-0.8]`; new return `0.42=0.62-0.2`. Terminal potential 1 gives `1.149`. A one-step terminal-potential example reverses action preference. Telescope checked at discounts 0, 0.5, 0.9, 1 and terminal potentials 0, 1. |
| `math-potential-shaping` | `Chapter26.test_shaping_bootstrap_and_smdp` | Corrected value `V'=V-Phi` cancels the cutoff residue; duration-aware shaping also telescopes. Infinite-horizon arguments explicitly require bounded potential and discount below 1. |
| `math-entropy` | `Chapter26.test_entropy_gradient_and_information` | Entropy `0.5004024235`; symmetric-channel information gain `0.1927447570` nats. Binary logit derivative `-0.2218070978`; categorical derivatives agree with finite differences and sum to zero. IGPO's answer-conditioned difference is not identified with policy entropy or expected mutual information. |
| `math-reward-noise` | `Chapter26.test_reward_noise_bias_variance_and_calibration` | False positive 0.2/false negative 0.1 shrink the gradient from `0.25` to `0.175`. Marginally zero-mean, action-correlated noise gives bias `0.5`; independent centered noise adds variance `0.01`. Error-rate sum 1 destroys signal; sum above 1 reverses it. |
| `math-suffix-is` | `Chapter26.test_suffix_is_enumeration_clipping_and_support` | Exhaustive weights `[2.4,0.8,0.6,0.2]`; mean 1, second moment 1.7, exact reward 0.6. Clipping at 2 gives 0.5; last-step-only correction gives 0.375. Four-path ESS `40/17`. Empty suffix weight 1 and missing behavior support are checked. |

Whiteboard: 4 complete questions, including a shaping proof, entropy chain rule,
judge-noise counterexample, and exhaustive suffix calculation. Fixed-prefix
entropy derivatives are separated from full trajectory-distribution gradients.

## Chapter 27

New IDs: `roadmap`, `math-credit-baselines`, `math-neighbor-boundaries`,
`math-exploration-sparsity`, `whiteboard`.

Roadmap targets: `math-credit-baselines`, `math-neighbor-boundaries`,
`math-exploration-sparsity`, `derivation`, `whiteboard`.
Learning chain: episode/step return origins, baseline independence, candidate
semantics, neighbor weighting, and exploration under sparse relative rewards.

| Section | Independent check | Result and boundary |
| --- | --- | --- |
| `math-credit-baselines` | `Chapter27.test_episode_step_credit_and_singleton` | Episode rewards `[1,0,0]`, suffix returns `[1,0.6,0]`, local coefficient 0.5 give `[0.9,-0.3,-0.6]`. Single-visit centered step advantage is zero. |
| `math-credit-baselines` | `Chapter27.test_optimal_baseline_gradient_variance` | Bernoulli `p=0.8` has gradient 0.16 and optimal fixed baseline 0.2. Baselines 0, 0.2, 0.8 give variances 0.0064, 0, 0.0576. The zero-variance result is limited to this deterministic binary example. |
| `math-credit-baselines` | `Chapter27.test_self_baseline_and_loo_exact_expectations` | Exhaustive two-sample enumeration gives self-containing mean-baseline expectation 0.08 versus LOO 0.16. Detach does not remove statistical dependence. |
| `math-neighbor-boundaries` | `Chapter27.test_soft_neighbors_temperature_and_exclusion` | Weights `(0.6,0.3,0.1)`, baseline 0.78, advantage 0.22, effective candidates `50/23`. Excluding self gives baseline 0.45 and advantage 0.55. Temperature derivative agrees with finite differences; zero/negative temperature and empty candidates are rejected; ties and hot/cold limits checked. |
| `math-exploration-sparsity` | `Chapter27.test_exploration_coverage_and_zero_signal` | At `p=0.1,K=4`, hit probability 0.3439 versus mixed-group probability 0.3438. Minimum K for 95% coverage is 29, costing 58000 tokens/174 calls in the example. Completely correlated groups retain hit probability 0.1 and have no relative reward signal. |

Whiteboard: 4 complete questions. State aliasing is explicitly separated from
action-dependent baseline bias: an action-independent observation baseline can
still satisfy the score identity, even though a collision invalidates a causal
interpretation of local return differences. Excluding self is a teaching
comparison, not a claim about mandatory ProxMO behavior.

## Chapter 28

New IDs: `roadmap`, `math-async-ratios`, `math-queue-throughput`,
`math-prefix-reuse`, `whiteboard`.

Roadmap targets: `example`, `math-async-ratios`, `math-queue-throughput`,
`math-prefix-reuse`, `code`, `whiteboard`.
Learning chain: environment validity, probability identity, gradient path,
queue boundaries, accepted throughput, and shared-computation equivalence.

| Section | Independent check | Result and boundary |
| --- | --- | --- |
| `math-async-ratios` | `Chapter28.test_two_ratios_and_ppo_boundaries` | Ratios 1.2, 1.25, 1.5; retained IcePop/PPO contribution 1.44, direct-ratio filter gives zero. Inclusive filter endpoints and PPO flat-region gradients checked away from nondifferentiable knots. |
| `math-async-ratios` | `Chapter28.test_detached_score_finite_difference` | Frozen-weight score gradient -1.05; direct differentiable ratio gradient -1.05; erroneous differentiable ratio times log-prob gradient +0.2141714445. Detaching a ratio-only loss yields zero gradient. |
| `math-async-ratios`, original `code` | `Chapter28.test_ess_scaling_freshness_and_valid_failure` | ESS `12/7`, invariant to adding 1000 to log weights; clipped uniform weights misleadingly give 4. Empty/nonfinite inputs rejected; oldest-version lag and binary F2P/P2P outcomes checked. |
| `math-queue-throughput` | `Chapter28.test_queue_units_capacity_and_selection` | Little: 40 in-flight / 2 episodes/s = 20 seconds. Capacity upper bound 3 episodes/s; separate M/M/1 examples give 1 and 5 seconds. Accepted rate 1.35 episodes/s = 1350 tokens/s; weight-effective proxy 0.5785714286. Short-task acceptance share shifts to 75%. |
| `math-prefix-reuse` | `Chapter28.test_prefix_counts_and_shared_gradient` | Token count 480 versus 180, saving 62.5%; no savings when prefix length is zero or batch size is one. Shared and unshared scalar losses give loss 0.5, gradient 2; unintended averaging changes gradient to 1. |

Whiteboard: 4 complete questions, including an environment-state counterexample
with identical text but different payment state. Top-p support, raw behavior
probabilities, partial versus full trajectory correction, mean versus tail
latency, conditional acceptance rates, model-versioned caches, branch loss
weights, and task/environment positive and negative controls are explicit.

## Chapter 29

New IDs: `roadmap`, `math-training-objective`, `math-budget-lagrange`,
`math-aggregate-evaluation`, `whiteboard`.

Roadmap targets: `example`, `math-training-objective`, `math-budget-lagrange`,
`math-aggregate-evaluation`, `comparison`, `whiteboard`.
Learning chain: joint success and per-step costs, returns/advantages,
actor/critic/regularization, constrained budgets, and paired independent
evaluation.

| Section | Independent check | Result and boundary |
| --- | --- | --- |
| `math-training-objective` | `Chapter29.test_end_to_end_training_loss` | Rewards `[-0.2,0.9]`, returns `[0.7,0.9]`, critic `[0.3,1.1]`, advantages `[0.4,-0.2]`; actor -0.28, critic 0.05, combined loss -0.259. Finite differences verify active/flat PPO branches. |
| `math-budget-lagrange` | `Chapter29.test_lagrange_gradients_and_hard_budget_counterexample` | Lagrangian 0.57; multiplier derivatives -2 and +1000 verified independently. Projected updates yield 0.03 and 0. Average calls `[0,20]` satisfy budget 10 while violating the per-episode limit. |
| `math-aggregate-evaluation` | `Chapter29.test_aggregation_paired_interval_and_mcnemar` | Micro 0.8, macro 0.65. Paired difference 0.06, SE 0.0467531666, approximate interval `[-0.0316362,0.1516362]`; exact McNemar p=0.2862787247. The displayed SE was corrected to 0.046753 after independent arithmetic comparison. |
| `math-aggregate-evaluation` | `Chapter29.test_wilson_cost_and_holm_boundaries` | Wilson 54/100 interval `[0.44264685,0.63439356]`; 0/N and N/N boundaries checked, N=0 rejected. Amortized calls/success 14.81481481 versus 25. Holm rejects only the first of `[0.01,0.04,0.20]`. Zero-success cost ratio is not a finite result. |

Whiteboard: 4 complete questions. The exact on-policy score identity is
distinguished from PPO and fixed-prefix KL/entropy surrogates. Budget penalties
are not permission enforcement. Statistical non-significance is not equivalence,
task-level repeats require clustering, and all-task cost differs from
success-only average cost.

## Executed Verification

`python3 scripts/check-math-25-29.py`: **22 tests passed** using only the Python
standard library. The checker independently enumerates probability spaces,
evaluates scalar objectives, and compares central finite differences with
analytic derivatives. It does not parse lesson expressions or reuse embedded
lesson code. Freeze semantics are preserved for finite-difference checks of
detached weights. Text/test correspondence was separately checked during this
audit; formula counts alone are not a content-quality test.

Scoped Node verification dynamically imported each chapter, ran
`node --check content/chapter-XX.js`, called `validateChapter`, checked roadmap
targets and first position, checked complete scored whiteboard answers, and
compared original objects against Git HEAD. All passed.

Every body, question, and answer was rendered through `renderMarkdown`; all
`data-math` fragments were parsed by the bundled KaTeX with
`throwOnError: true, strict: "error"`. A separate delimiter pass checked that
math delimiters outside code fences were closed.

| Chapter | Total sections | New math sections | Whiteboard questions | Parsed math fragments |
| --- | ---: | ---: | ---: | ---: |
| 25 | 14 | 3 | 3 | 106 |
| 26 | 15 | 4 | 4 | 158 |
| 27 | 14 | 3 | 4 | 128 |
| 28 | 14 | 3 | 4 | 113 |
| 29 | 14 | 3 | 4 | 97 |
| Total | 71 | 16 | 19 | 602 |

All five original embedded Python examples were also extracted and executed.
Their assertions passed, including trajectory returns, raw-weight ESS, anchor
and soft baselines, trajectory rejection rules, and aggregate evaluation.

Browser layout, shared renderer interactions, full-course integration, and
production model training are outside this worker's scope and are not claimed
as verified here. No commit was created.

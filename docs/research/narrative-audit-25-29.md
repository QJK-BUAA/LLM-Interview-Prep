# Narrative Revision Audit: Chapters 25-29

Date: 2026-09-30.

## Authorization and Scope

This worker owns only `content/chapter-25.js` through `content/chapter-29.js`
and this audit. No commits, shared-file edits, UI edits, test edits, or edits to
the integrated source-reading document are authorized for this worker.

The complete approved design and implementation plan were read:

- `docs/superpowers/specs/2026-09-30-narrative-course-design.md`
- `docs/superpowers/plans/2026-09-30-narrative-course.md`

The abbreviated requested `plans/` path resolves to the second path above.
All five existing chapters were read in full, including original derivations,
the 16 `math-*` derivations, questions, and sources. Existing evidence read in
full: `agentic-core-evidence.md`, `agentic-exploration-systems-evidence.md`,
`integration-evidence.md`, `advanced-policy-data-evidence.md`, and
`interview-audit-25-29.md`. The source manifest was read to preserve its exact
chapter/section anchors and required concepts.

## Source Reading

All ten files below were read in full from
`/private/tmp/agentic-rl-analysis-66ae4423`, not inferred from headings, search
matches, prior summaries, or algorithm familiarity. Paths were first located
with `rg --files`. Local `git rev-parse HEAD` returned
`66ae4423b36270ef50a288fb1bb2e1b31c46c329`.

The assignment comprises the Agentic index, all five ch1 files, both ch2 files,
and two connecting Post-Training files: 1,192 lines in total. Line counts are
scope checks, not evidence of comprehension. The records below supply the
actual claims, decisions, and precise course locations.

Evidence status throughout: the upstream files are **secondary synthesis**.
Paper definitions and system claims retain the independently checked versions
in the existing evidence ledgers. This revision rereads those ledgers; it does
not claim a new retrieval of every cited paper or reproduction of results.
All course hand calculations are **teaching examples**, not reported scores.

### 1. `docs/agentic-rl/index.md` (70 lines)

Actual headings/blocks: `Agentic RL 调研报告`, `与 Post-Training 报告的关系`,
`核心论文索引`, `阅读建议`.

The index separates the reports' roles: the first supplies optimization
foundations, while the second foregrounds multi-turn interaction, tools, and
four challenges. Its quick, algorithm, and engineering reading routes organize
navigation rather than prove technical results.

**Adopted:** the transition from post-training to interaction in
`25/intuition`, and a failure-oriented method index in `29/comparison`.
`25/roadmap` introduces the concrete trajectory before abstract state and
probability. **Not adopted:** Tier ordering, the unqualified "first convergence"
label, and the uncontextualized EMPO² percentage in the index.
`29/intuition` and `29/comparison` state why a reading map is not a census or
an impact ranking. **Evidence:** organizational synthesis; index counts and
Tier values remain source assertions without a reproducible coding table.

### 2. `docs/agentic-rl/ch1/1.1-overview.md` (62 lines)

Actual headings: `RLVR 的成功与边界`, `Agentic RL 的核心矛盾`,
`四大核心挑战`.

The source motivates sparse feedback, unstable estimates, costly exploration,
and delayed credit by contrasting complete-answer rollouts with interleaved
tool interaction. Its contradiction table wrongly attributes short-horizon,
verifiable, one-step assumptions to RL itself.

**Adopted:** the four diagnostic categories and their interaction in
`25/comparison`; observation/action boundaries in `25/diagram`.
**Corrected:** `25/intuition`, `25/derivation`, and `25/pitfall` explain that RL
already models sequential decisions. Tool use does not necessarily remove
verifiability: the warehouse's final location can be checked. A local
observation need not be a Markov state; the task, observation, history, and
belief are distinguished only after the reader has followed the trajectory.
**Not adopted:** 68%/53%/44%/44% as independently verified field frequencies.
**Evidence:** secondary taxonomy; Kaelbling and Sutton/Barto foundations are
identified in `agentic-core-evidence.md`, not established by the overview.

### 3. `docs/agentic-rl/ch1/1.2-reward-stability.md` (172 lines)

Actual headings: `奖励信号：从稀疏到自包含`, `IGPO — 信息增益作为内在奖励`,
`CM2 — 多维度 Checklist 奖励`, `训练稳定性：从经验到收敛保证`,
`SeeUPO — 首个多轮 RL 收敛保证`, `ARLArena/SAMPO — 系统性稳定性分析框架`,
`VCPO — 方差控制的动态学习率`, and the two `其他方案概览` tables.

**Adopted:** distinguish missing reward information from unstable estimation.
`26/intuition` and `26/example` compare two failed warehouse runs, answer
log-prob changes, dependent checklist items, and concentrated sample weights.
`26/derivation` connects the named mechanisms to the learning signal.

**Corrected:** IGPO is the teacher-forced *mean answer log-probability*
difference, not annotation-free belief learning; identical gains can still
collapse. CM2's Evidence/Focus/Question/Pass-Fail/Strictness/Dependency/Weight
are item fields, not seven universal skills; dense criteria do not force dense
assignment. SeeUPO's suffix update does not assume statistically independent
turns or prove arbitrary neural POMDP convergence. ARLArena's negative,
low-ratio instability must be interpreted with the actual surrogate, not
confused with standard PPO's flat branch. VCPO uses raw-weight ESS relative
to an on-policy reference, square-root learning-rate scaling, and a
gradient-energy-weighted baseline, not a universal unbiased batch mean.
Locations: `26/derivation`, `26/math-suffix-is`, `26/example`, `26/pitfall`.

The secondary tables are retained substantively in `26/comparison`:
EDGE-GRPO combines entropy-driven advantage and guided correction; ReGFT is
reference-guided pre-RL SFT; PF-PPO filtration changes the sampled population;
ZeroSearch trains a noisy-document simulator; DARS allocates depth/breadth;
ProRL resets the KL reference, not behavior probabilities; GMPO aggregates a
signed surrogate, not raw negative rewards; OTB's forward proxy is not an
exact parameter-gradient norm; Dr. MAS uses per-role statistics.

**Not adopted:** incorrect institutional/conference attributions,
universal RM-free/no-supervision claims, mismatched benchmark gains, or
unconditional optimality. **Evidence:** paper-specific definitions/versions
in `agentic-core-evidence.md`; the additional shaping, entropy, noise, and IS
calculations are teaching derivations, not purported full implementations.

### 4. `docs/agentic-rl/ch1/1.3-exploration-credit.md` (179 lines)

Actual headings: `探索效率：突破 On-Policy 局限`, `EMPO² — 记忆增强探索`,
`LUFFY — 混合策略学习`, `信用分配：长程归因的精细化`,
`GiGPO — 锚点状态分组`, `ELPO — 错误定位与分层归因`,
`ProxMO — 语义邻近性软聚合`, and both `其他方案概览` tables.

**Adopted:** separate finding a useful route from assigning credit within it,
in `27/intuition` and `27/diagram`. Memory-assisted/no-memory evaluation and
expert-guided behavior require distinct conditions. `27/example` compares
exact-state and soft-neighbor baselines using the same suffix returns while
explicitly retaining different candidate sets.

**Corrected:** RL parameter updates already transmit experience across
episodes; external tips add a retrievable channel. LUFFY is mixed-policy
learning with policy shaping, not merely an extra regularization penalty.
GiGPO anchors can span time indices; ProxMO PSA uses same-step candidates and
TF-IDF cosine, not a required learned embedding network. ELPO's failed suffix
probes are budget-dependent evidence, not proof of irrecoverability; the
lower clipping bound changes the negative update rather than assigning fixed
labels before/at/after an error. Locations: `27/derivation`,
`27/math-credit-baselines`, `27/math-neighbor-boundaries`.

`27/comparison` also retains TreePO's segment advantages (not only caching),
LADDER's verified easier variants, SGE's high-level strategies, SSRL's
simulated search, Step-GRPO's matching/structural criteria, ARPO's adaptive
rollouts, and VinePPO's repeated-prefix value estimates. `27/pitfall` separates
replayable text from reversible real-world actions.

**Not adopted:** "on-policy cannot learn new patterns", SSRL zero-cost/offline
claims, universal precise causal credit, or benchmark percentages as general
gains. **Evidence:** paper readings in `agentic-exploration-systems-evidence.md`;
the 0.4096 missed-recovery probability and baseline examples are instructional.

### 5. `docs/agentic-rl/ch1/1.4-engineering.md` (48 lines)

Actual headings: `GLM-5 — 异步 Agent RL 基础设施`,
`Kimi K2 — 大规模工具使用训练`, `环境构建`.

The source links unpredictable tool latency to decoupled rollout/training and
contrasts industrial tool synthesis with environment-building research.
**Adopted:** task/environment/verifier/trajectory separation in
`28/intuition`; environment versus trajectory products in `28/comparison`.

**Corrected:** TITO preserves actual token streams and is not a tool-I/O
acronym. Asynchrony does not require a critic. DSA chooses historical KV
positions, while MoE selects experts; changing to `torch.topk` is not an
all-platform stable-tie guarantee. Kimi's tool specifications do not count
independent executable environments, self-critique is not objective ground
truth, and a fixed GLM phase order must not be projected onto K2.
Locations: `28/intuition`, `28/diagram`, `28/pitfall`, `28/comparison`.

**Not adopted:** LMArena rank, "most detailed" ranking, generic deterministic
CUDA cure, or ASTRA/GEM as interchangeable environment factories.
**Evidence:** official reports/API evidence S01-S14 in
`agentic-exploration-systems-evidence.md`. ABE builds executable local tasks,
AWM uses code/database state, ASTRA supplies graph-guided trajectories and
rule-verifiable environments, and this GEM primarily supplies trajectories.

### 6. `docs/agentic-rl/ch1/1.5-algorithm-summary.md` (58 lines)

Actual headings: `全部算法一览`, `按影响力分级`, `技术路线图`.

**Adopted:** a lookup table connecting a failure to a candidate intervention,
in `29/comparison`; detailed mechanisms remain in chapters 26-28.
**Corrected:** the table's "no external RM" does not mean no answer, rubric,
or reference supervision; GMPO does not geometrically average raw reward and
CM2 does not define seven fixed capabilities. These corrections remain at
`26/intuition` and `26/comparison`.

**Not adopted:** weighting institutional backing at 15%, Tier-based teaching
priority, a single causal algorithm replacement tree, or "GRPO defines RLVR".
`29/comparison` explicitly replaces prestige with task relevance and testability.
**Evidence:** secondary navigation only; its categories are not comparative
experiments or a proof that the methods compose.

### 7. `docs/agentic-rl/ch2/2.1-landscape.md` (146 lines)

Actual headings: `时间线`, `论文分布`, `机构分布`,
`技术路线分析：哪些方向最有前景`, `四大挑战的解决进展`,
`三条技术路线`, `产业观察：从论文到产品`, `已落地的 Agentic RL 产品`,
`开源生态`, `中美对比`.

**Adopted:** routes A (estimator/constraint repair), B (feedback/update
reformulation), and C (environment/data/memory), in `29/diagram`, plus
implementation/rollout/environment/evaluation ecosystem layers in
`29/comparison`. The routes meet at controlled, independent evaluation.

**Corrected:** memory changes the policy's information and generated
environments change the training distribution, so C is not automatically
orthogonal to every algorithm. Existing sequential RL is not fundamentally a
one-step framework. `29/intuition`, `29/diagram`, and `29/interview` retain
these distinctions. **Not adopted:** regional percentages, open-source rates,
the 3-6 month commercialization claim, or inferred proprietary product
training recipes. The timeline's placement of ABE in 2024 is not carried into
the course as a verified date. **Evidence:** secondary synthesis/author
opinion; no complete coding table supports an independently reproducible
census. Product claims require product-specific public evidence.

### 8. `docs/agentic-rl/ch2/2.2-outlook.md` (109 lines)

Actual headings: `核心判断与个人观点`, the six numbered `观点` blocks
(credit, SeeUPO, memory, engineering/data, a possible "R1 moment", environments),
and `未来方向与预测` with `短期 (2026)`, `中期 (2027)`, `长期方向`.

**Adopted:** all six questions in `29/pitfall`, each reframed with observable
tests: credit-cost comparisons, finite-budget training, no-tips transfer,
controlled cost breakdowns, measurable planning/correction, and real versus
synthetic environment transfer. `29/interview` asks what result would reject a
proposed method.

**Corrected:** parameter learning already carries experience, multi-turn RL
was not made "solvable" for the first time by SeeUPO, and incomparable AIME or
agent gains do not establish decreasing algorithmic returns.
**Not adopted:** 2027 as a guaranteed delivery date, stars/MAU as algorithm
quality, or a universal next-breakthrough prediction.
**Evidence:** expressly author forecasts and hypotheses, not experimental
facts. The six judgments are retained as questions rather than discarded or
silently promoted into conclusions.

### 9. `docs/post-training/ch1/1.2-rlhf-rlvr.md` (88 lines)

Actual headings: `RLHF 范式：从人类反馈中学习`, `经典三阶段流程`,
`RL 优化目标`, `奖励模型的已知问题`, `RLVR 范式：基于可验证奖励的强化学习`,
`RLHF vs RLVR 对比`, `为什么 RLVR 在推理任务上取得了突破？`,
`2025 年的收敛范式`.

**Adopted:** distinguish reward provenance from the update algorithm and
interaction format. `25/intuition` contrasts complete-answer RLVR rollouts
with interleaved tool trajectories without redefining sequential RL;
`28/intuition` separates executable verification from self-critique rubric
feedback. `26/intuition` separates reward model, critic, baseline, and
advantage. `29/math-training-objective` distinguishes behavior policy from
KL reference.

**Corrected:** rule-based feedback is not intrinsically noise-free or immune
to reward hacking; a wrong field, incomplete test, or writable verdict can
reward the wrong outcome (`25/pitfall`, `26/math-reward-noise`, `28/example`).
RLVR need not mean a single answer string: environment terminal state can be
verified. KL is a regularizer, not a verifier or a correctness proof.
**Not adopted:** a universal mandatory SFT/stage pipeline, RLVR invented by a
single model release, or PPO versus GRPO as the definition of reward type.
**Evidence:** connecting secondary overview; reward/verifier boundaries are
supported by the existing core and advanced-policy evidence records.

### 10. `docs/post-training/ch2/2.10-agentic-training.md` (260 lines)

Actual headings: `1. GLM-5 训练全流程` (including `1.2.5 On-Policy Cross-Stage
Distillation（OPD）：防遗忘`), `2. Agentic 数据合成`, `2.1 标准流水线（6 步）`,
`2.2 SWE 数据合成`, `2.3 Terminal 数据合成`, `2.4 Search 数据合成`,
`3. RL 训练挑战与解决方案`, `3.1.1 IcePop：显式处理训推分布差异`,
`3.1.2 DSA（DeepSeek Sparse Attention）带来的不一致`,
`3.2 异步框架 off-policy 问题`, `3.3 Kimi K2.5 的 Agent Swarm`,
`奖励设计（PARL）`, `上下文管理`, `要点总结`.

**Adopted:** the task/environment/feedback/trajectory production chain in
`25/diagram` and `28/example`; SWE F2P/P2P, Terminal reference/negative controls,
Search WKG/evidence snapshots; mixed-version trajectories in `28/diagram`;
IcePop versus direct-ratio masking in `28/derivation` and
`28/math-async-ratios`; fixed subagents, trainable orchestration, annealed
auxiliary rewards, and critical path versus total work in `28/derivation`.

**Corrected:** inspect actual sampling probabilities, not merely an old model
name; accepted small ratios do not prove unbiased full-trajectory correction.
Masking outliers is not PPO clipping. Deterministic top-k/replay claims need
the restrictions in `28/pitfall`. Search "few steps" is not necessarily one
search. The fixed Removing/Obfuscation/Replace taxonomy was not independently
confirmed as a universal MiniMax recipe. `28/comparison` instead retains
verified evidence-guided rewriting and Forge's per-sample losses.

OPD's earlier-stage teachers and current-student sampling are retained as a
connection in `29/comparison`, with full derivation delegated to the existing
`19/derivation` rather than duplicated here. It is not a universal no-forgetting
guarantee. Base/mid-training token budgets and detailed phase histories belong
to chapters 19/23 and are not repeated as universal recipes.
**Not adopted:** universal optimizer-momentum resets, "small discrepancy means
safe to learn", fixed parallel speedups, or an advantage mean detached from a
policy score as a trainable objective.
**Evidence:** secondary article-based synthesis; official-report checks are
S01-S10 of the exploration/systems ledger and the OPD entry of the integration
ledger. The course's ratios and scheduling calculations are teaching examples.

## Opening and Route Audit

All five actual `sections` arrays now begin with `intuition`, `example`,
`roadmap`, not merely a renderer-side rearrangement. All 15 opening/example/
route bodies changed. Routes retain valid local destinations, add the original
derivation explicitly, and follow actual section order. A link back to the
just-completed example is a recap, not an instruction to learn abstractions
before the example.

| Chapter | Concrete task before abstractions | Route continuation |
|---|---|---|
| 25 | Find the blue box: task-only input, list files, read blue.txt, observe C3, submit, charge two query costs, terminate. The full action/observation/reward table precedes POMDP notation. | Interaction/training loops, original trajectory objective, noisy service belief, generated-token loss, elapsed-time discount, code and diagnostic map. |
| 26 | Compare two warehouse failures: useful evidence followed by a transcription error versus guessing. Three separate checks yield IG 1, checklist 0.7, and ESS ratio 3/7. | Scoring versus estimation, original method mechanisms, shaping boundary, information versus entropy, judge noise, suffix IS, ESS code and method choice. |
| 27 | Find an order, verify refund eligibility, submit. The same refund setting now introduces exploration, exact-state comparison, soft neighbors, and failed recovery probes. | Candidate sets and return origins, original method derivation, combined credit and variance, hidden-permission collisions, exploration budget, code and method map. |
| 28 | Repair an empty-list bug without regressions; validate the environment, tests, generation versions, and probabilities before accepting the trace. Terminal/Search extend this same acceptance contract. | Task factory, original reward/version/ratio/parallel-work calculations, gradient path, queue capacity and accepted throughput, prefix-gradient conservation, input checks. |
| 29 | Select a research assistant when answer accuracy rises but evidence completeness falls and tool calls increase. Counts are explicitly instructional. | Three intervention routes, joint success/cost definitions, two-turn training loss, adaptive expected-budget penalties, paired evaluation and failure-oriented selection. |

Both requested wording corrections are applied:

- `25/math-smdp`: "开场找箱子任务按每轮折扣的结果是 0.62", avoiding
  confusion with the upstream GitHub repository.
- `26/intuition`: "仍经常提交错误答案", replacing the ambiguous wording.

## Every Derivation

All 21 derivations, including the five original `derivation` sections and
16 `math-*` sections, now start with a concrete task paragraph without LaTeX.
The records below identify the actual reasoning added inside each derivation,
not merely an opening sentence or a reused end-of-section checklist.

Evidence status for every numeric row: **original teaching construction**.
Existing formulas are retained verbatim, including occurrence multiplicity
within their original sections. Existing citations and their verification
limits are unchanged. General probability, optimization, and queue examples
are not attributed as complete implementations of the named papers.

### Chapter 25: From a Tool Trace to a Learning Target

| Exact section | Task, inputs, and explanatory transitions | Numeric readout and next action |
|---|---|---|
| `25/derivation` | Turn the three warehouse rows into training data without teaching the model to imitate tool observations. Names full state, visible observation, history, generated text, parsed action, and parameter roles only after the task. Explains prediction, observation likelihood, normalization, conditional token products becoming log sums, score-function differentiation, and why past rewards disappear in expectation. Explains actor sign, effective-token denominator, and termination versus truncation. | Returns 0.62/0.8/1 produce start-discount gradient coefficients 0.62/0.72/0.81. Bootstrapping value 1 after reading preserves 0.62; false termination keeps only costs. Next: explicitly calculate belief and token gradients. |
| `25/math-belief` | Decide whether a warehouse service's green light is enough to proceed. States usable/faulty, prior 0.6/0.4, transition matrix, and noisy observation likelihood are inputs. Expands the two paths into predicted availability, then joint green-light masses, then posterior normalization. Explains remaining-horizon Bellman as immediate reward plus observation-weighted future value, not posterior-as-value. | Predicted availability 0.52, evidence probability 0.564, posterior 39/47 versus 8/47. About 17% fault probability remains despite green. Non-green gives 13/109; zero likelihood is undefined. Next: compare inspection cost with fault loss before acting. |
| `25/math-action-masks` | Compute behavior likelihood for a mixed user/assistant/tool trace compressed to three generated targets. Restates trajectory-factor meanings and explains why fixed environment factors have no direct score. Walks through conditional probability multiplication, three-token averaging, sigmoid differentiation, and gradient-descent direction. Keeps semantic-action marginalization distinct. | Probabilities 0.5/0.25/0.8 give 0.1 and loss 0.767528; independent-logit gradients are -1/6, -1/4, -1/15. The least likely target gets the largest encouraging update. Next: derive masks from generation spans and compare matching prefixes before computing ratios. |
| `25/math-smdp` | Re-evaluate the same warehouse trace when queries take 2 and 3 seconds. Defines internal reward times, duration, belief, action value, terminal flag, and elapsed-time discount. Explains first folding rewards to each call's start, then moving future value back by the call duration. | Backward and timestamp calculations both yield 0.40949, versus 0.62 under per-call discount. A worker pause with next value 0.629 preserves the target; false termination gives -0.1. Next: log reward timestamps and stop reasons, then distinguish time preference from task correctness. |

### Chapter 26: From Scores to Reliable Estimates

| Exact section | Task, inputs, and explanatory transitions | Numeric readout and next action |
|---|---|---|
| `26/derivation` | Learn from useful warehouse retrieval followed by a wrong submission. Explains teacher-forced prefixes and mean answer-log-prob differences; updated suffix probability chains; ARLArena's actual surrogate boundary; behavior-weight cancellation, moving an action-independent baseline outside the sum, and differentiating a normalized distribution. Expands squared gradient energy and the self-term in an empirical group mean. | IG is 1; two suffix success probabilities changing from 0.5/0.5 to 0.8/0.75 give weight 2.4, not a new environmental truth. Negative-advantage PPO at ratio 0.2 has the retained -0.8 flat branch. Four self-including independent samples leave 0.75 of the expected unnormalized gradient. Next: inspect whether changing the reward itself preserves preferences. |
| `26/math-potential-shaping` | Give the two costly warehouse queries earlier progress feedback without changing which complete route is preferred. Defines sufficient state, fixed potential, shaped reward, and horizon. Separates positive arrival and negative departure terms so equal-discount intermediate terms visibly cancel; preserves terminal residual and consistent bootstrap. | Potentials 0.2/0.5/0.8/0 give shaping 0.25/0.22/-0.8 and return 0.42, exactly 0.2 below 0.62. Nonzero terminal potential gives 1.149; the one-step counterexample reverses preference. Next: enumerate success/failure/budget terminal states and test return differences before adding progress rewards. |
| `26/math-entropy` | Choose between randomizing repeated queries and rewarding informative evidence. Distinguishes hidden-state entropy, action entropy, and answer-conditioned IG; explains entropy expansion into expected KL. Walks from entropy's probability derivative through the softmax Jacobian to the centered logit gradient. | A symmetric 0.8-accurate sensor reduces expected entropy by 0.192745 nats. At action probability 0.8 the binary entropy derivative is -0.221807; gradient ascent lowers the dominant logit. IG -1 is compatible with nonnegative expected Shannon information. Next: log evidence gain and behavioral diversity separately before interpreting exploration. |
| `26/math-reward-noise` | Diagnose a warehouse judge that accepts some wrong submissions and rejects some correct ones. Names true reward, observed reward, error, and score. Explains expectation linearity, conditional zero-mean cancellation, vanishing cross covariance, and remaining score-weighted noise variance. Constructs the affine judge response from its two label-conditioned endpoints. | False-positive 0.2 and false-negative 0.1 give 0.2 + 0.7R, shrinking the p=0.5 gradient from 0.25 to 0.175. A globally zero-mean action-correlated error adds bias 0.5. Next: audit independent truth by action/task before calibrating, filtering, or increasing learning rate. |
| `26/math-suffix-is` | Reuse old warehouse continuations after improving file selection and submission. Names fixed prefix, old/new suffix policies, return, and weight; explicitly cancels old path probability against the likelihood-ratio denominator. Explains why conditional products do not require general turn independence. | Four paths yield weights 2.4/0.8/0.6/0.2; exact weighted success 0.6, clipped estimate 0.5, last-action-only estimate 0.375, second moment 1.7, ESS 40/17. Next: retain raw and optimized weights plus filtered tasks; if useful suffixes never occur, address exploration rather than weighting. |

### Chapter 27: From Comparable Routes to Credit

| Exact section | Task, inputs, and explanatory transitions | Numeric readout and next action |
|---|---|---|
| `27/derivation` | Decide which refund actions to strengthen. Names episode versus suffix returns, exact anchor membership, same-step neighbor membership, and combination weight. Explains each baseline average and subtraction, softmax normalization, the action-independent score cancellation, LUFFY's quotient rule followed by the log-probability chain rule, ELPO's lower-clipping branch, and Monte Carlo value-difference construction. | Exact anchor 0.5333 gives 0.4667; soft baseline 0.78 gives 0.22. LUFFY's low-ratio local coefficient is about 0.0826 versus 0.01. At negative advantage -1 and ratio 0.7, moving the lower bound from 0.8 to 0.6 changes a flat -0.8 term to active -0.7. Four-probe failure remains 0.4096; 3/4 minus 2/4 gives estimated value improvement 0.25, not proven causal uplift. Next: use existing comparable traces before buying additional suffix rollouts. |
| `27/math-credit-baselines` | Preserve both a refund route's useful suffix and its expensive earlier detour. Separates the two return origins, subtracts each group's own mean, and then combines. Derives the baseline by fixing gradient mean, minimizing gradient second moment, differentiating squared residuals, and dividing by expected score energy. Separately explains self-inclusion bias. | Combined advantages 0.9/-0.3/-0.6; the second route is locally positive but globally negative. Binary p=0.8 gives optimal baseline 0.2 and gradient 0.16 in both outcomes; reward-mean baseline 0.8 increases variance to 0.0576 versus 0.0064 without baseline. N=2 self-inclusion gives 0.08, LOO restores 0.16. Next: validate mean, variance, and dependence separately before state-grouping checks. |
| `27/math-neighbor-boundaries` | Compare identical-looking refund observations with different hidden permissions, then assess soft matching. Explains collision-induced return differences, the 1:1/2:1/6 exponential normalization, effective candidate count, self-exclusion renormalization, and the temperature derivative as a centered similarity followed by weighted covariance. | Hidden-state values 0.9/0.1 create spurious local differences +/-0.4. Soft weights yield baseline 0.78 and advantage 0.22; effective neighbors 50/23. Excluding self gives 0.45 and 0.55. Temperature direction depends on covariance, and ties/zero vectors remain explicit edge cases. Next: audit permissions, neighbor lists, and temperature before calling the comparison causal. |
| `27/math-exploration-sparsity` | Budget sampling for a refund agent with about one success in ten. Derives complement probabilities for any success and mixed-reward groups, explains independence, then solves the log inequality with sign reversal and integer ceiling. Keeps original per-trajectory token/tool costs. | Four rollouts give hit 0.3439, mixed 0.3438, and no relative outcome signal in 0.6562 of groups. Reaching 95% hit coverage requires 29 attempts: 58,000 token and 174 calls versus 8,000 and 24. Correlated copies do not obtain this benefit. Next: compare independent exploration, curriculum, and guidance under fixed budget, then measure accepted system throughput. |

### Chapter 28: From an Executed Task to a Valid Update

| Exact section | Task, inputs, and explanatory transitions | Numeric readout and next action |
|---|---|---|
| `28/derivation` | Admit a code-repair trace, decide its reward and freshness, correct probabilities, and distinguish parallel wait from work. Explains binary test multiplication as conjunction, minimum generation version as oldest context, old-infer/old-train/new-train ratio roles, response masks, fixed weights, PPO min/clip, direct-ratio filtering, and max versus sum across branches. | F2P [1,1] and P2P [1,1,0] give reward 0. Versions 9/11 at learner 12 give lag 3 and rejection at threshold 2. Probabilities 0.20/0.24/0.30 yield 1.2/1.25/1.5; weighted PPO contribution 1.44 versus direct-ratio filtering. Orchestration 2 plus branches 5/3/4 gives critical path 7 and work 14. Next: verify the derivative, not just the scalar ratio. |
| `28/math-async-ratios` | Check the gradient for one generated token across inference/training versions. Shows cancellation of the common old-train probability only for identical conditional events. Traces frozen score weighting versus a differentiable ratio/log-probability product through the product rule and retains support/sampling-transform constraints. | The same ratio 1.5 gives derivative -1.05 when frozen in score loss; forgetting detach yields +0.214171. PPO plateau and filtered zero weight are distinct routes to zero gradient. Next: finite-difference with the center-point weight fixed, then enable filtering/clipping independently. |
| `28/math-queue-throughput` | Explain why a busy code-repair rollout system delivers few fresh training traces. Derives Little's law through accumulated in-system residence time. Converts environment slots, token/s, and learner rate into episode/s before comparing; explains the second acceptance fraction is conditional, not an independence assumption. | 40 in flight at 2/s imply mean 20 seconds; stage capacities 4/6/3 cap ideal throughput at 3/s. Validity 0.9 and conditional freshness 0.75 leave 1.35/s or 1350 token/s. ESS-weighted 0.578571 is only a proxy; 90 short versus 30 long accepted tasks changes the mixture to 75% short. Next: diagnose length-bucket losses before expanding compute. |
| `28/math-prefix-reuse` | Share the same file-reading prefix across four patch candidates without dropping any sample loss. Explains subtracting duplicate prefix counts, names token-count symbols, and applies the chain rule by collecting weighted branch gradients before passing through the shared Jacobian. Keeps environment identity, checkpoint, dropout, routing, and actor/context distinctions. | Four 100-token prefixes and 20-token suffixes fall from 480 to 180 ideal processed token, a 62.5% count reduction. Scalar shared graph has loss 0.5 and gradient 2; accidental averaging gives gradient 1. Next: compare logits, per-sample loss, and gradients before benchmarking actual throughput. |

### Chapter 29: From Product Requirements to Evidence

| Exact section | Task, inputs, and explanatory transitions | Numeric readout and next action |
|---|---|---|
| `29/derivation` | Build an auditable research-assistant result table. Explains binary conjunction then task averaging, same-currency price-times-quantity addition, and the complement/product argument for independent repeated attempts. Keeps cost, latency, selection, and coverage distinct. | Joint success is 54/100 versus 48/100. At 0.01 currency units/call and 0.000001/token, 8 calls plus 1000 token cost 0.081; 12 calls cost 0.121. Hypothetical p=0.54 with two independent attempts gives coverage 0.7884, not improved pass@1. Next: align training reward with the frozen acceptance table. |
| `29/math-training-objective` | Train on a two-turn evidence-search/submission trace with costs 0.2/0.1 and final success 1. Explains one-time terminal reward, per-turn cost, return origin, critic residual and detach; derives score and causal token sums before introducing PPO as a local surrogate. Separates actor/critic denominators and KL/entropy signs from behavior/reference roles. | Rewards -0.2/0.9 yield returns 0.7/0.9 and advantages 0.4/-0.2. The negative-advantage min chooses -0.16, yielding actor -0.28, critic 0.05, and total -0.259. This verifies arithmetic, not comparative capability. Next: log each component and adapt penalties from explicit budget requirements. |
| `29/math-budget-lagrange` | Respond to mean usage 12 calls/3000 token against budgets 10/4000. Explains policy maximization versus multiplier minimization, units, retaining budget constants for multiplier updates, the two minus signs yielding a plus-excess update, and projection to nonnegative penalties. | Current Lagrangian is 0.57; call penalty rises from 0.02 to 0.03 and token penalty falls from 0.00001 to 0. The 0/20-call pair satisfies mean 10 while violating a per-task limit. Next: validate training averages, runtime authorization, and tail latency as separate contracts. |
| `29/math-aggregate-evaluation` | Decide whether 54 versus 48 joint successes justifies selecting A. Separates a mixed-task aggregation example from the paired search comparison. Explains paired differences, centered sum of squares, sample variance then variance of the mean, binomial directions among discordant pairs, Wilson score inversion, failure-inclusive amortized costs, and sequential Holm thresholds. | Micro 0.8 versus macro 0.65; discordant 14/8 gives difference 0.06, SE 0.046753, interval including zero, exact McNemar p about 0.2863. Wilson for 54/100 is about [0.4426,0.6344]; calls per joint success are 14.8148 versus 25. Next: retain metrics, collect independent/stratified tasks, and avoid post-hoc denominators or seed selection. |

## Executed Verification

No helper files or shared tests were created or modified. Temporary checks ran
through Node standard input. Contract comparisons used `git show HEAD:content/
chapter-XX.js`, parsed as JavaScript modules, rather than textual ID guesses.

| Check | Observed result |
|---|---|
| `node --check` on all five owned chapter modules | 5/5 passed. |
| `validateChapter` restricted to the owned chapters | 5/5 passed with the current first-three-order schema. |
| Actual opening order and narrative starts | All 5 arrays begin intuition/example/roadmap; all 15 opening/example/route bodies and 21 derivation bodies changed; all 36 required first paragraphs are math-free. |
| Existing structure and unrelated content | All 71 section IDs/types retained. All 51 question/answer objects deep-equal to HEAD. Chapter metadata and source arrays unchanged; non-target sections deep-equal to HEAD. |
| Formula preservation | All 540 existing body formula occurrences retained verbatim within their original sections, including multiplicity. Counts by chapter: 94, 141, 118, 102, 85. Questions are additionally protected by object equality. |
| Local route destinations/order | 36/36 links resolve and follow actual section order. |
| Assigned source-manifest contracts | 23 owned chapter/section anchors and all 30 required body terms passed. |
| Raw math and rendered math | 634 body/question formulas parsed from source with no unmatched delimiters; the scoped learn-mode renderer produced the same 634 occurrences. Local KaTeX parsed all with `throwOnError: true`. Per chapter: 124, 164, 131, 113, 102. |
| `python3 scripts/check-math-25-29.py` | All 22 existing independent arithmetic, finite-difference, support, bias, queue, budget, and paired-statistics tests passed. |
| Embedded Python extracted from the actual chapter bodies | All 5 blocks ran successfully, including trace rejection cases, masks, ESS, baselines, and evaluation outputs. |
| `git diff --check` on owned chapter paths | Passed with no whitespace errors. |

Embedded-code readouts: chapter 25 returns [0.62, 0.8, 1.0]; chapter 26
ESS 1.71428571 and learning rate 6.55e-06; chapter 27 baselines 0.5333 and
0.78 with recovery miss probability 0.4096; chapter 28 IcePop term 1.44
and direct-ratio masked weight zero; chapter 29 answer rate 0.75, joint
success 0.5, mean calls 11.5, and mean latency 50.

Full-repository tests, browser interaction/visual acceptance, and the
integrated reading document remain the main agent's responsibility. Scoped
server-side rendering and KaTeX parsing above do not claim browser acceptance
or reproduction of any published training result.

Status: assigned source reading, all narrative revisions, per-derivation
audit, and scoped verification completed. Ownership is ready to return to the
main agent for integrated acceptance; no commit was made.

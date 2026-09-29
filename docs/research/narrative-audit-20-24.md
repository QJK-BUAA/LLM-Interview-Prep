# Narrative Audit: Chapters 20-24

Date: 2026-09-30. Scope: only `content/chapter-20.js` through
`content/chapter-24.js` and this file. No shared files or commits.

## Reading And Evidence

The approved narrative design and implementation plan were read in full:
`docs/superpowers/specs/2026-09-30-narrative-course-design.md` and
`docs/superpowers/plans/2026-09-30-narrative-course.md`.
All five existing chapters were read before editing. The following existing
research records were read before or alongside the upstream reread:

- `advanced-policy-data-evidence.md`: primary definitions, direct derivative
  corrections, data-method definitions and their conditions.
- `industrial-evidence.md`: report/version/benchmark/cost attribution, later
  publication updates, and limits on public disclosures.
- `integration-evidence.md`: cross-stage OPD, MTP, PRM/MCTS and Gemma methods.
- `interview-audit-20-24.md`: original numerical checks, IDs and source anchors.

All 19 assigned upstream Markdown files below were located with `rg --files`
and exact filename patterns and read from beginning to end, including tables,
admonitions, diagrams' text, captions, limitations and references. The local
checkout is `/private/tmp/agentic-rl-analysis-66ae4423`; `git rev-parse HEAD`
returned `66ae4423b36270ef50a288fb1bb2e1b31c46c329`. Each file's computed SHA-256
matched `content/source-manifest.js`'s archived identity. Hash agreement proves
version identity, not correctness or comprehension.

The records below distinguish four evidence statuses:

- **Survey**: this round directly reread the fixed upstream secondary source.
- **Primary-backed**: definitions/results were previously checked against the
  named original source in the existing evidence ledgers. This round retained
  those corrections; it does not claim a new independent paper replication.
- **Public-limited**: official blog, model card abstract/metadata, or incomplete
  report disclosure; undisclosed parameters stay unknown.
- **Teaching / opinion**: synthetic calculations or an author's hypothesis,
  neither an industrial measurement nor a demonstrated general law.

Course references use `chapterID/sectionID`. References outside chapters 20-24
describe integration boundaries, not files modified or independently audited
by this worker. The main integrator owns the full 37-source reading document.

## Source-By-Source Reread

Paths in the following 19 records are relative to `docs/post-training/` in
the fixed upstream checkout. Quoted Chinese headings are actual source
headings, not headings invented from filenames.

### 1. `ch1/1.7-vapo.md`

**Headings:** `核心论点`, `核心公式`, `三大 Critic 修复技术`,
`技术来源总结`, `消融实验汇总`.

**Mechanisms and use:** the source connects long-CoT credit assignment to
critic warmup on Monte Carlo returns, decoupled actor/critic GAE,
length-adaptive policy lambda, and a correct-response NLL term. Adopted in
`20/intuition`, `20/derivation` and `20/math-gradient-units`; `22/intuition`
places this combination within DAPO/VAPO/Seed reports. The course computes
lambda for lengths 100 and 1000, and restores the NLL/main-loss scale.

**Corrections / not used:** value pretraining and decoupled GAE are inherited
from VC-PPO, not all VAPO-original as the provenance table says. MC targets
need genuine terminal boundaries; lambda=1 does not eliminate all error.
The paper's title and actor length adaptation follow the ledger, not a
fixed actor lambda of 0.95. Do not promote the source's ablation deltas,
50 warmup steps, or mu=0.1 to universal recipes or claim exact causal credit.

**Status:** Survey; Primary-backed by VAPO section 4 and VC-PPO in the
advanced-policy ledger. Length and gradient-unit examples are Teaching.

### 2. `ch1/1.8-cispo.md`

**Headings:** `核心问题`, `核心公式`, `PPO vs CISPO 梯度行为`.

**Mechanisms and use:** the source discusses rare branching tokens losing
positive-surrogate updates during repeated updates of one rollout batch.
Its actual formula clips and detaches a token IS weight before multiplying
advantage and current log probability. Adopted in `20/derivation`,
`20/example`, `23/derivation` and `23/math-async-ratio`.

**Corrections / not used:** CISPO is Clipped IS-weight Policy Optimization,
not sequence clipping. Retain the M1 report title from the ledger. PPO's
zero-gradient region depends on advantage sign; being outside either bound
is insufficient. CISPO does not ensure a nonzero gradient for zero advantage,
masked tokens or numerical saturation. M1 has no effective lower clipping
bound; the course's double-sided 0.8/1.2 examples are explicitly synthetic.
Do not universalize the source's 16-update/first-update observation.

**Status:** Survey; Primary-backed by MiniMax-M1 section 3.1, including
stop-gradient. Four-quadrant coefficients are Teaching checks.

### 3. `ch1/1.9-gspo.md`

**Headings:** `核心问题`, `核心公式`, `GRPO vs GSPO 梯度对比`,
`极小裁剪范围`, `深入：MoE 训练为什么难`,
`对照：旧时代的工程补丁——Routing Replay`,
`R2 vs R3：Routing Replay 自身的演进`,
`深入：GSPO 凭什么能根治 MoE`, `GRPO vs GSPO on MoE：一图总结`,
`参考资料`.

**Mechanisms and use:** geometric-mean token ratios produce a normalized
sequence surrogate and shared sequence gate; R2 records recompute routing,
whereas R3 records rollout routing. Adopted in `20/derivation`,
`20/pitfall`, `20/math-update-diagnostics` and `23/math-async-ratio`.
The two-token example separates mean log-ratio from intra-sequence dispersion.

**Corrections / not used:** the source both calls replay complementary and
declares it obsolete. Retain complementarity. Different expert selections
do not by themselves destroy output-distribution support. A normalized
sequence ratio is not the original trajectory IS product, and its derivative
includes `s*A/T`. Noise averaging requires covariance assumptions; it does
not guarantee `1/sqrt(T)` decay, MoE stability, exact trust-region constraints
or removal of backend mismatch. R3 can retain router gate gradients and
does not eliminate every numerical discrepancy. Do not copy issue scores,
fixed replay overheads or framework-version switches as universal results.

**Status:** Survey; Primary-backed by GSPO section 4, R3 section 4 and the
version-sensitive verl README recorded in the ledger. Covariance examples
are Teaching.

### 4. `ch1/1.10-sapo.md`

**Headings:** `核心问题`, `核心公式`, `统一视角：三种 Gating 函数`,
`与 GSPO 的联系`, `为什么要非对称温度`.

**Mechanisms and use:** a scaled sigmoid objective gives a continuous
ratio-space derivative; advantage-sign-dependent temperatures regulate
decay. Adopted in `20/intuition`, `20/derivation`, `20/example` and
`24/math-objective-gradients`.

**Corrections / not used:** the log-policy coefficient is
`A*r*4*p*(1-p)`, not the sigmoid or its derivative alone. Symmetry of the
ratio-space gate is not symmetry of the complete update. Preserve masks,
zero advantages and numerical saturation as zero-gradient cases.
The GSPO connection assumes small steps and low within-sequence log-ratio
dispersion; it is not exact objective/vector-gradient equivalence or a
universal superset theorem. The source's temperatures are not recommended
defaults; not every historical policy method uses hard clipping.

**Status:** Survey; Primary-backed by SAPO sections 3-4 plus direct
chain-rule correction in the ledger. The 1.1797 coefficient is Teaching.

### 5. `ch1/1.11-cheatsheet.md`

**Headings / table labels:** `1.11 全部算法公式速查表`, `使用说明`,
`GSPO 在表中的特殊位置`. This short file has a single comparison table,
not hidden derivation subsections.

**Mechanisms and use:** the table separates objective, advantage source,
IS granularity and clipping/gating. Adopted as distinct comparison axes in
`20/comparison`, `24/comparison` and `24/math-objective-gradients`.

**Corrections / not used:** critic-free GRPO is not necessarily RM-free
or restricted to RLVR. Keep minimization versus maximization signs clear
when adding VAPO NLL. Do not repeat "GSPO restores IS validity", "only
MoE-specific method", or "replay retired" as established facts. Normalization,
stop-gradients and sampling conditions remain in the full derivations.

**Status:** Survey organization; precise formulas are Primary-backed by
the individual method records, not established by the summary table.

### 6. `ch1/1.12-evolution.md`

**Headings / labels:** `1.12 演进逻辑总结`, `演进动因（与上图箭头对应）：`,
`图中的两条主线`, `其他值得关注的算法：`.

**Mechanisms and use:** the diagram organizes critic repair, clipping
weights, sequence aggregation and soft gates by motivating failures.
The related-method table adds Dr.GRPO normalization bias, REINFORCE++
global normalization and PRIME's online implicit process reward.
Adopted in `20/intuition`, `20/comparison`, `24/intuition` and `24/pitfall`.

**Corrections / not used:** keep branches rather than an inevitable
replacement chain. GRPO need not remove the RM; CISPO need not preserve
every actual gradient; GSPO need not replace replay; SAPO's conditional
gate approximation is not an exact merger of methods. Dr.GRPO corrects
specified biases, not every finite-sample bias; REINFORCE++ has batch
conditions; PRIME changes feedback/credit rather than clipping. The 15.1%
PRIME summary is not repeated without its model/task/baseline protocol.

**Status:** Survey organization; related-method definitions Primary-backed
by the advanced-policy ledger; historical inevitability is not adopted.

### 7. `ch2/2.1-deepseek.md`

**Headings:** `DeepSeek-R1 -- 纯 RL 推理涌现`,
`R1-Zero：纯 RL 的涌现实验`, `四阶段 Pipeline`, `GRPO 的选择理由`,
`失败尝试（报告 Section 3.4 -- 极有价值的负面结果）`,
`蒸馏模型：蒸馏 >> 直接 RL`, `DeepSeek-V3 -- 高效后训练与蒸馏`,
`Post-Training Pipeline`, `极致成本效率`, `Multi-Token Prediction (MTP)`,
`DeepSeek-V3.2 -- Specialist Distillation 与 GRPO 工程化`,
`三阶段后训练 Pipeline`, `四个 GRPO 稳定化创新`, `后训练成本的剧变`,
`关键结果`, `负面结果与局限`, `系列演进分析`.

**Mechanisms and use:** adopted the distinction between direct RL on a
pretrained base, R1's cold SFT/RL/RS-mixed SFT/RL stages, output distillation,
V3/V3.2 expert data generation, mixed RL, and routing/sampling-mask
consistency in `22/intuition`, `22/diagram`, `22/derivation`,
`22/math-domain-normalization` and `22/math-distillation-pipeline`.
V3's cost table motivates `22/example` and `22/math-pipeline-budget`.
Self-Rewarding, MTP and negative PRM/MCTS experiences retain separate roles.

**Corrections / not used:** Zero does not mean random initialization; V3
39.2 is not V3-Base; cross-year AIME scores are not one controlled gain.
V3 already trained domain experts. V3.2 Speciale is a separate
reasoning-oriented variant, not the standard model's mandatory third
stage, and its competition results must not be assigned to the general
model. V3's 5.576M dollars is formal total training, not R1 RL cost or
all R&D. A total-cost denominator is not a pretraining denominator.
No fixed critic-memory multiplier, MTP speedup, reflection-word frequency,
undisclosed stage schedule or "unbounded ROI" is inferred from this source.

**Status:** Survey; Primary-backed by industrial E22-01 through E22-04 and
integration evidence. Cost extrapolations and budget examples are Teaching,
not a reconstruction of hidden industrial accounts.

### 8. `ch2/2.2-kimi.md`

**Headings:** `Kimi K1.5 -- 长上下文推理 Scaling`,
`算法选择：非 GRPO、非 PPO`, `长上下文 RL 的关键技术`, `工程亮点`,
`Kimi K2 -- 开放 Agentic 智能`, `模型架构`,
`MuonClip 优化器（核心工程创新）`, `大规模 Agentic 数据合成（三阶段）`,
`Self-Critique Rubric Rewards`, `RL 基础设施`,
`关键结果（非 Thinking 模式）`, `Kimi K2.5 -- 多模态 Agentic 演进`,
`三个反直觉的发现`, `Agent Swarm / PARL（并行 Agent 协作学习）`,
`Toggle（Token 高效 RL）`, `系列演进分析`.

**Mechanisms and use:** adopted partial rollout's pause/resume semantics,
long2short's four alternatives, tool/domain -> rubric/task -> validated
trajectory generation, self-critique preference feedback, and a trainable
PARL orchestrator with frozen subagents in `23/intuition`, `23/example`,
`23/math-async-ratio` and `23/math-agent-budget`.

**Corrections / not used:** MuonClip's QK-Clip observes maximum attention
logits, not Q/K spectral norms; it is pretraining optimization, not policy
ratio clipping. K2.5 early fusion changes vision-data timing/proportion,
not the network layer where embeddings enter. Zero-Vision SFT does not
mean no image training. Toggle's 25-30% result belongs to K2 Thinking;
PARL's 4.5x result has a wide-search workload boundary. Self-critique is
not zero supervision or a value baseline. Do not import sandbox startup
times, inference FLOPs savings or every leaderboard row as reproducible
properties of any Kimi deployment.

**Status:** Survey; Primary-backed by industrial E23-01 through E23-04.
Fragment masks and critical-path timings are Teaching assumptions.

### 9. `ch2/2.3-qwen.md`

**Headings:** `Qwen2.5 -- 奠基性 Pipeline`, `六维度 RM 设计（核心方法创新）`,
`GRPO 阶段设计`, `Qwen3 -- 四阶段与思考模式融合`,
`阶段 2 的极致效率`, `Thinking Mode Fusion（阶段 3）`,
`Strong-to-Weak 蒸馏`, `Qwen3.5 -- 混合架构探索`,
`架构创新：GDN + MoE 混合`, `GSPO -- 修复 GRPO 在 MoE 上的根本缺陷`,
`SAPO -- 平滑替代硬裁剪`, `不对称温度（关键细节）`,
`与 GSPO 的关系`, `关键优势`, `系列演进分析`.

**Mechanisms and use:** Qwen2.5's response-score variance motivates the
three-query example; Qwen3's cold CoT/reasoning RL/mode fusion/general RL
motivates mode-conditioned distillation and query-versus-token budgets.
Adopted in `22/intuition`, `22/example`, `22/math-distillation-pipeline`,
`22/math-pipeline-budget` and `21/comparison`. The GSPO/SAPO sections are
cross-checked against `20/derivation`, not treated as new definitions.

**Corrections / not used:** six annotation criteria do not prove six RM
heads; long-context recipes are not one fixed post-GRPO stage for the
whole family. The 3,995-query, 170-step result is Qwen3-235B-A22B reasoning
RL on AIME 2024, not the final AIME 2025 score. Fusion need not pair two
answers from one RL checkpoint; explicit thinking-budget control exists.
Strong-to-weak includes offline outputs and on-policy distribution
supervision; its reported cost ratio is conditional. Retain formal names
Group Sequence / Soft Adaptive, old-policy rather than reference-policy
ratio semantics, and CISPO's token definition. Qwen3.5 blog architecture
does not disclose a specific optimizer or prove inherited hyperparameters.

**Status:** Survey; Primary-backed by industrial E22-05 through E22-08.
Qwen3.5 details used here are Public-limited, not newly web-verified.

### 10. `ch2/2.4-minimax.md`

**Headings:** `MiniMax-01 -- 长上下文后训练`, `架构基础`,
`五阶段后训练 Pipeline`, `MiniMax-M1 -- CISPO 与推理 RL`,
`GRPO 的具体失败模式`, `CISPO 算法`, `三阶段训练`, `关键工程发现`,
`MiniMax-M2 / M2.5 -- Agent-Native RL`, `M2（2025.10）`,
`M2.5 与 Forge 框架（2026.02）`, `关键结果`,
`MiniMax-M2.7 -- 自我进化`, `系列演进分析`.

**Mechanisms and use:** adopt Text-01's short/long SFT and DPO followed by
short online RL; M1's detached-weight update and numerical diagnostics;
Forge's decoupling, windowed consumption and shared-prefix computation.
These appear in `23/intuition`, `23/derivation`, `23/pitfall`,
`23/math-async-ratio` and `23/math-agent-budget`.

**Corrections / not used:** the source's CISPO sequence-geometric-mean
formula contradicts its own ch1 and M1's original definition; retain
token weights and detach. Half as many updates does not imply half memory,
FLOPs or cost. M1's 534,700-dollar RL rental estimate excludes base/CPT/R&D;
V3's total is not R1 RL. FP32 head diagnosis is about measured engine
mismatch, not BF16 inability to represent 1e-8; smaller epsilon addresses
tiny-gradient scaling, not a universal anti-NaN rule. Windowed FIFO does
not evict the oldest unfinished task. Prefix reuse is not a fixed service
price reduction. M1-80k AIME 2024 is 86.0 in the checked table.
The later M2-series report supersedes "no paper": M2 uses full attention,
and M2.7 improves some Agent metrics but regresses on MMLU-Pro. Internal
self-evolution shares remain reported, researcher-guided workflow figures.

**Status:** Survey; Primary-backed/Public-limited as separated in
industrial E23-05 through E23-10. No complete proprietary recipe is claimed.

### 11. `ch2/2.5-glm.md`

**Headings:** `模型架构`, `五阶段后训练 Pipeline`, `三种 Thinking 模式`,
`TITO Gateway -- 被忽视的工程关键`, `非确定性 CUDA top-k Bug`,
`异步 Agentic RL -- "Slime" 框架`, `Cross-Stage Distillation`,
`国产芯片适配`.

**Mechanisms and use:** adopt interleaved/preserved/turn-level thinking,
token-ID preservation, asynchronous policy-age tracking and previous-stage
checkpoint teachers in `23/intuition`, `23/diagram`,
`23/math-async-ratio` and `23/math-opd-gradient`.

**Corrections / not used:** the source's scalar teacher-score gap is
replaced with frozen token log-probability differences. Group size one
works because of teacher supervision, not group centering. IcePop handles
train/infer mismatch and is not just a KL penalty. The checked report
describes entropy dropping in the DSA incident, contrary to this file's
"entropy surge"; torch.topk's behavior is not a universal determinism
guarantee. TITO does not solve every numerical mismatch. Cross-stage
distillation mitigates forgetting, not guaranteed recovery of every
capability. Report harnesses qualify 77.8 and 75.9, not "best of all known
models". Chip-adaptation counts and blanket "most detailed report" rankings
are not used as algorithm evidence.

**Status:** Survey; Primary-backed by industrial E23-11/E23-12 and the
integration ledger's GLM-5 section 3.5 verification.

### 12. `ch2/2.6-seed.md`

**Headings:** `DAPO -- 四个修复让 GRPO 飞升`, `四个修复及贡献量化`,
`VAPO -- 让 PPO 在长 CoT 中复活`, `七个修复`,
`Seed1.5-Thinking -- 大规模验证`, `RFT 反面发现`,
`Seed2.0 与 Seed-Coder`, `系列演进分析`.

**Mechanisms and use:** retain the component-diagnosis narrative:
Clip-Higher, dynamic groups, token aggregation and overlong handling;
value warmup, GAE separation and positive NLL; Seed1.5's feedback and
streaming rollout; Seed-Coder's quality-filtered code pipeline.
Mapped to `22/intuition`, `22/comparison`, `20/derivation` and
`21/pitfall`.

**Corrections / not used:** retain correct DAPO/VAPO names. Overlong
penalties do not certify partial correctness. All-equal groups remove the
relative reward signal, not all regularizer gradients. Seed1.5's 73/79
DAPO/VAPO comparison uses the 150B ablation model, not final 200B.
One RFT initialization result does not prohibit RS elsewhere.
Seed-Coder uses GRPO with DAPO-like changes, not a VAPO validation.
Seed2.0 has a later model card; the existing verification covered official
release and card abstract/metadata, not all training details. Do not infer
VAPO adoption, repeat the unchecked 98.3 score or set parameter thresholds
for critic superiority.

**Status:** Survey; Primary-backed by industrial E22-09 through E22-12;
Seed2.0 is Public-limited under E22-13.

### 13. `ch2/2.7-closed-source.md`

**Headings:** `OpenAI -- 可参考的安全对齐细节`,
`Google Gemini -- "RL*F" 与有限披露`,
`Anthropic -- Constitutional AI 基础`.

**Mechanisms and use:** adopted safety-specification supervision,
helpfulness/safety reward gating, verifiable plus generative feedback,
CAI critique/revision and AI-preference learning, and historical HH-RLHF
in `23/comparison`, `23/derivation` and `23/pitfall`.
Gemma's BOND/WARM/WARP act on output distributions, reward-model weights
and policy weights respectively; they remain distinct from Gemini claims.

**Corrections / not used:** Deliberative Alignment has SFT and RL stages;
its data generation/filtering is not a four-stage training recipe.
Do not claim CoT is universally hidden from every RM, fixed Gemini critic
details, or that a zero safety score mathematically prevents real-world
unsafe behavior. Public historical methods are not complete current
OpenAI/Google/Anthropic product recipes.

**Status:** Survey; Primary-backed by industrial E23-13 through E23-15
and integration Gemma evidence, with Public-limited product attribution.

### 14. `ch2/2.8-cross-model.md`

**Headings:** `后训练 Pipeline 对比`, `RL 算法演进脉络`,
`奖励设计对比`, `十条共性训练经验`, `趋势展望`.

**Mechanisms and use:** the source groups ten experiences covering cold
SFT, queries, distillation, RM exposure, MoE, length curricula,
infrastructure, critic reuse, stage forgetting and thinking modes.
The course deliberately regroups these into six bounded cross-model
lessons in `24/comparison`, not a claim that the original has six.
`22/intuition` and `23/intuition` supply the report-specific cases;
`24/math-budget-design` supplies the controlled comparison.

**Corrections / not used:** do not inherit mandatory tiny SFT, universal
small-model distillation optimality, fixed RM-use schedules, mandatory
short/long separation, unconditional critic superiority or perfect
forgetting recovery. MC return is a critic target, not a separate external
reward; CISPO is token-level; Speciale is a branch; six Qwen criteria
do not specify RM architecture. The six trend predictions remain
hypotheses, not a forecast proved by the cross-model table.

**Status:** Survey synthesis/opinion. Each adopted empirical example keeps
its Primary-backed qualification from the industrial ledger.

### 15. `ch2/2.9-data-engineering.md`

**Headings:** `全景图`, `一、SFT 数据获取：6 种方法`,
`横向对比速查`, `❶ Cold-start 人工标注`, `❷ 强模型蒸馏`,
`❸ 拒绝采样 (Rejection Sampling)`, `❹ 指令合成`,
`❺ Agentic 合成 (Seed-then-Expand)`, `❻ 自博弈`,
`二、RL 数据获取：3 个维度`, `❶ Query 获取与筛选`,
`❷ 奖励信号构建`, `❸ 环境与测例构建`, `三、质量控制要点`,
`四、数据混合与课程`, `五、SFT–RL 数据闭环`,
`六、核心要点提炼`, `参考文献`.

**Mechanisms and use:** retain six composable acquisition routes and the
query/reward/environment split in `21/intuition` and `21/comparison`.
Self-Instruct creates instruction/input/output then filters; Evol-Instruct
adds constraints; OSS-Instruct grounds generation in real code;
SelfCodeAlign extracts concepts and executes tests; Instruct-SkillMix
combines skills; CodecLM encodes target-use metadata and compares model
answer quality. SWE-smith produces verified bug tasks before successful
agent traces; Sol-Ver jointly improves solving/testing. GASP uses real
goalposts; LSP uses challenger/solver roles; SGALM anchors generation and
Real/Fake discrimination to real data; STaR is answer-supervised
rationalization. `21/example`, all four `21` derivations, `21/diagram`
and `21/pitfall` turn acquisition into an auditable data pipeline.

**Corrections / not used:** distinguish success fraction from pass@k,
including the source's misuse of "Pass@10" as ten-sample average accuracy.
No universal 20%-60% learnable interval, parameter cutoff for RL, 1/10
distillation cost, verifier reliability stars or "no external data"
self-play category. STaR can rationalize after direct failure using gold;
LSP's assumptions do not ensure arbitrary neural training convergence.
DoReMi uses reference/proxy excess loss and Group DRO, not just raw loss
or scaling-law fitting. Seed-Coder's correct paper is 2506.03524, not the
astrophysics link 2506.02737. Quality filters are not PII/license guarantees.
RL needs feedback grounds even without token demonstrations. Split before
synthesis and recheck provenance; public benchmark names are not permission
to train on held-out tests. Fusion does not require paired answers from
one checkpoint, and recycling data needs stop/rollback conditions.

**Status:** Survey; named methods Primary-backed by the advanced-policy
ledger. Pass@k proof, selection costs, token weights and verifier confusion
tables are Teaching; no industrial dataset or automatic privacy auditor
is claimed.

### 16. `ch2/2.10-agentic-training.md`

**Headings:** `1. GLM-5 训练全流程`,
`1.1 Base Model Training：先把底座练扎实`,
`1.2 Post-Training：渐进式对齐`, `1.2.1 SFT：不只是指令微调`,
`1.2.5 On-Policy Cross-Stage Distillation（OPD）：防遗忘`,
`2. Agentic 数据合成`, `2.1 标准流水线（6 步）`,
`2.2 SWE 数据合成`, `2.3 Terminal 数据合成`, `2.4 Search 数据合成`,
`3. RL 训练挑战与解决方案`, `3.1 训推不一致问题`,
`3.1.1 IcePop：显式处理训推分布差异`,
`3.1.2 DSA（DeepSeek Sparse Attention）带来的不一致`,
`3.2 异步框架 off-policy 问题`, `3.3 Kimi K2.5 的 Agent Swarm`,
`要点总结`.

**Mechanisms and use:** the article-derived overview connects executable
tasks, resettable environments, verified traces and training contracts.
SWE needs both fail-to-pass and pass-to-pass checks; Terminal needs
environment/scripts; Search uses evidence graphs or query evolution.
Adopted in `23/intuition`, `23/diagram`, `21/comparison`.
Its explicit teacher/student token-logprob difference corrects the
less precise GLM overview. Train/infer ratio, per-action policy versions,
freshness and frozen-subagent orchestration motivate
`23/math-async-ratio`, `23/math-opd-gradient`, `23/math-agent-budget`.

**Corrections / not used:** keep the mathematical separation between
parameter drift and same-version engine mismatch, token versus complete
trajectory correction, and masks versus exact off-policy recovery.
Do not assert all old-state distributions are corrected by one local
ratio, or that deterministic top-k is guaranteed across every platform.
Preserve the source's entropy-drop direction over the contradictory
2.5 summary. Its proposed OPD continuous-learning benefits are not a
universal no-forgetting theorem. Detailed environment construction and
pre/mid-training exposition belong to other assigned chapters; no claim
is made to reproduce the linked Zhihu article or every implementation.

**Status:** Survey/secondary article organization; adopted GLM/Kimi
definitions Primary-backed by industrial/integration ledgers. Ratio
factorization and queue examples are Teaching.

### 17. `ch3/3.1-timeline-paradigms.md`

**Headings:** `关键里程碑`, `时间线的几个关键转折`,
`Post-Training 范式演变`, `四代范式`, `范式演变的驱动力`.

**Mechanisms and use:** historical organization links PPO, preference
training, DPO, GRPO, reasoning RL and interactive Agent training to changing
feedback and task requirements. Adopted in `24/intuition` and
`24/comparison`, with actual objectives compared in
`24/math-objective-gradients`.

**Corrections / not used:** retain PPO 2017, DPO 2023 and DeepSeekMath
2024; Alpaca/Vicuna are 2023 examples, not 2020-2022 releases.
The four paradigms coexist rather than abolish one another. DPO does
not require a separately trained RM, SFT can learn capabilities, RLVR
still needs feedback, and RL has always supported sequential decisions.
No unverified count of an "explosion" of papers or result-based historical
inevitability is promoted to fact.

**Status:** Survey history with Primary-backed dates from existing
references; period labels and turning-point interpretations are opinion.

### 18. `ch3/3.2-challenges-future.md`

**Headings:** `六大行业共识`, `共识一：轻量 SFT + 重度 RL 成为标准范式`,
`共识二：Hard Clipping 是 GRPO 系列的原罪`,
`共识三：MoE 模型需要专用 RL 方案`, `共识四：Query 质量远比数量重要`,
`共识五：大模型 RL，小模型蒸馏`, `共识六：工程实现的重要性不亚于算法设计`,
`核心技术挑战与现有解法`,
`挑战一：信任域设计 -- 从梯度消失到连续门控`,
`挑战二：Critic 的规模化困境`, `挑战三：不可验证任务的奖励设计`,
`挑战四：长序列优化的粒度选择`, `挑战五：多阶段 Pipeline 的能力遗忘`,
`挑战关系总览`.

**Mechanisms and use:** keep the five interacting challenges in
`24/pitfall`: update constraints, critic quality/cost, feedback reliability,
long-sequence aggregation and forgetting. `20/pitfall` and
`20/math-update-diagnostics` connect them to measurable gradients and
covariance; `24/comparison` bounds the six claimed "consensus" lessons.

**Corrections / not used:** non-differentiable rewards can still be hacked;
rules are not noiseless. Token ratios do not provide causal token credit.
Hard-clipped gradients are sign-dependent and not permanently absent
across all future batches; detached clipped weights are continuous in
value despite slope changes. Reject scale cutoffs, fixed critic overheads,
unconditional SAPO equivalence, perfect no-forgetting and blanket claims
that engineering bugs only appear at scale. MuonClip is not an RL ratio
method. Preserve all method and industrial corrections above.

**Status:** Survey synthesis, not independently established industry
consensus; mechanisms qualified by Primary-backed ledger checks.

### 19. `ch3/3.3-opinions.md`

**Headings:** `算法演进的深层规律`, `被低估的杠杆与被高估的方向`,
`RL 的本质：教授还是选择？`, `产业格局与竞争壁垒`,
`对未来方向的判断`, `写在最后`.
The nine numbered opinion callouts concern regularization analogies,
model-scale dependence, query selection, marginal algorithm gains,
teaching versus selection, two-tier economics, data construction,
adaptive gates and data flywheels.

**Mechanisms and use:** every opinion has a bounded experiment-oriented
counterpart in `24/pitfall`. `24/math-paired-inference` and
`24/math-budget-design` teach how to distinguish a suggestive result from
a supported selection decision.

**Corrections / not used:** L1/L2 analogies are not policy-objective
equivalences; cross-paper AIME deltas do not establish diminishing returns.
No 100B/200B critic threshold, guaranteed lightweight-critic benefit,
proof of never-seen pretraining behavior, universal small-team strategy,
undisclosed V3.2 dollar estimate or unconstrained self-evolution is adopted.
Not all post-training objectives equal `f(r)*A`; DPO and KL supervision
need their own gradients. Query quality and data recycling are tested
against fixed budgets, independent evaluators and regression slices,
not assumed best from an author's closing recommendation.

**Status:** explicitly author opinion, not industry proof. Statistical
and cost examples added by the course are Teaching.

## Derivation Revision Record

All 19 derivations were revised in place: five original `derivation`
sections and fourteen `math-*` sections. Each now begins with a specific
task in prose before any LaTeX, defines its inputs and symbols, explains
the intermediate calculation, interprets numerical results, and connects
to the next calculation or verification action. The records below identify
the actual teaching work rather than counting generic introductions.

The chapter openings now form a continuous task sequence:

- **20:** correct mathematical answers appear, but training becomes
  unstable; separate credit estimation, update gates and aggregation.
- **21:** a repository repair dataset lacks reliable trajectories and
  executable tests; trace acquisition, verification and data recycling.
- **22:** build an assistant that handles mathematics, code and ordinary
  requests; read industrial stages as choices with distinct feedback
  and cost requirements.
- **23:** a repository task is unfinished while the learner updates;
  account for actual actions, tool observations, behavior versions and
  waiting time.
- **24:** a 7B code assistant gains three correct answers at extra cost;
  select feasible supervision and require paired evidence before adoption.

For every chapter, `intuition`, `example`, `roadmap` are the actual first
three array entries, not a renderer-only rearrangement. Each example
extends its opening and distinguishes synthetic inputs from report
observations. Roadmaps explain the reasoning order, offer prerequisite
references, and link forward through real sections. Full report details,
corrections, source citations and question objects remain available at
their original IDs.

### Chapter 20

| Section ID | Teaching Task And Inputs | Calculation And Numerical Readout | Interpretation And Next Step |
| --- | --- | --- | --- |
| `derivation` | Start with terminally scored mathematical responses; derive usable advantages before comparing update rules. Define actor/critic, prefix/action, rewards, discount, GAE and frozen behavior policy. | The existing three-step code example is now explained in prose: rewards `[0,0,1]`, values `[0.2,0.3,0.4,0]`, residuals `[0.1,0.1,0.6]`, lambda-one advantages `[0.8,0.7,0.6]`, all critic targets `1`. Retain length lambdas `0.8/0.98`, the PPO/CISPO four quadrants, GSPO geometric mean and SAPO chain rule. Reconnect CISPO `2.4`, GSPO `0.5` per token and SAPO `1.1797` to the opening example. | Explain telescoping, then hold advantages fixed while changing the gate or ratio unit. These are local coefficients, not complete parameter gradients. Next restore masks and batch/length denominators. Terminal/truncation distinctions, VC-PPO attribution, detached TOKEN CISPO, M1's absent effective lower bound and conditional SAPO approximation are retained. |
| `math-gradient-units` | Mix a two-token positive response with a six-token negative response; ask which direction the batch actually updates. Define `B x T_max` tensors, mask, total tokens, score vectors and fixed rollout quantities. | Differentiate the same local objectives under sequence and token aggregation. Retain direction `0.25` versus `-0.125`; positive NLL adds `0.05` against the main term `0.125`, hence `40%`. Explicitly define positive-token count and avoid dividing GSPO by length twice. | A denominator change can reverse direction, not merely rescale learning rate. Align aggregation and auxiliary-loss units before interpreting hyperparameters. Next examine whether a few normalized coefficients dominate. |
| `math-update-diagnostics` | Training still degrades with an apparently normal average ratio; distinguish concentrated coefficients from correlated probability noise. Inputs are four absolute coefficients, two token ratios and an equicorrelated long sequence. | Normalize `[1,1,1,7]` to obtain concentration ESS `100/52 = 1.9231`, not four independent samples. Ratios `[0.5,2]` have geometric mean `1` but log-ratio variance `0.480453`. Expand the variance sum into `T` variance and `T(T-1)` covariance terms: at `T=100`, variance `1`, correlation `0.2`, the mean variance is `0.208`, not `0.01`. | Record tails, within-sequence variance, coefficient concentration and actual gradient directions separately. Routing alignment and sequence averaging are complementary. Next run finite differences, then inspect the dataset and reward-selection process in chapter 21. |

### Chapter 21

| Section ID | Teaching Task And Inputs | Calculation And Numerical Readout | Interpretation And Next Step |
| --- | --- | --- | --- |
| `derivation` | Decide what the next pagination-repair training round consumes: audited target trajectories or tasks with environments and rewards. Define token masks, fixed SFT data, policy, task distribution, success counts, group size and domain lengths. | Preserve SFT/RL contracts, pass@k, mixed-group probability, token shares and DoReMi excess loss. Reuse `2/8 = 25%` and pass@2 `46.43%`; explicitly evaluate the existing mixed-group formula at `p=0.25,G=4` as `0.6796875`. Retain DoReMi weights about `0.354/0.646` from excess losses `0.2/0.8`. | Explain why candidate coverage, presence of relative signal and domain weights answer different questions. DoReMi remains a pretraining result, not a proven post-training recipe. Next prove coverage, then analyze selection cost and verification noise. |
| `math-pass-k-proof` | Eight repair candidates contain two passes; estimate coverage with only two attempts without confusing empirical success fraction and future success probability. Inputs are fixed-policy IID Bernoulli outcomes and a fixed verifier. | Count subsets, then average their success indicators to prove unbiasedness under the stated assumptions. Retain `13/28 = 46.43%` versus plug-in `7/16 = 43.75%`, and the `n=k=2` counterexample with expectations `3/4` versus `5/8`. | Distinguish sampling candidate subsets from generating candidates; subset indicators need not be independent. Report candidate coverage, not selection success. Next show how filtering changes the distribution of retained logs. |
| `math-dynamic-selection` | Sample hard and moderate repair tasks equally, generate four attempts each, and retain mixed-success groups until there are 100. Define category probabilities, success rates, acceptance event and normalizer. | Derive acceptance, apply Bayes to category proportions, and use negative-binomial waiting costs. Preserve acceptance `[0.3438,0.875]`, mean `0.6094`, retained shares about `[0.282081,0.717919]`, `164.095832` candidate groups and `656,383.328` expected generated tokens instead of `400,000` retained tokens. Preserve marginal inverse-weight identity and its support conditions. | Explain that inverse category weights cannot undo conditioning within trajectory groups. Log candidate and retained counts, set a retry limit and preserve coverage channels for zero-acceptance tasks. Next inspect concentrated weights and noisy verifier labels. |
| `math-weight-verifier` | Implement equal mathematics/code token shares and audit whether a pool marked entirely verified is truly correct. Inputs are domain lengths, fixed positive weights and explicit false-accept/false-reject rates. | Invert the token-share equation to sample `[0.8,0.2]` for lengths `[1000,4000]`. Explain variance under fixed independent equal-variance measurements, giving ESS `1.9231`. Decompose observed pass probability into false and true acceptance: true correctness `0.2` becomes observed `0.27`; accepted-pool precision is `0.19/0.27 = 0.703704`. | Equal token mass is not equal row count; the retained pool can still contain `29.63%` incorrect solutions. Fixed-rate gradient scaling is conditional and fails under action-dependent hacking. Next combine token accounting, weight checks, independent tests and lineage gates in the executable lab. |

### Chapter 22

| Section ID | Teaching Task And Inputs | Calculation And Numerical Readout | Interpretation And Next Step |
| --- | --- | --- | --- |
| `derivation` | Plan the next round for a mathematics/code/general assistant; calculate query signal, domain objective and cost share separately. Define reward mean/variance, frozen group advantage, domain distribution, task weights and consistent cost units. | Connect mean-centering and standardization to query B: variance `0.1875`, advantages about `[-0.577,-0.577,-0.577,1.732]`. Preserve three-domain weighted reward `0.72` and the complete non-overlapping cost decomposition. Reconnect the V3 table's approximately `0.179%` post-training share with its stated denominator. | These are three different measurements, not interchangeable percentages. Query variance is not established long-term learning value, and total reward does not reveal undisclosed domain weights. Next implement domain weights in the loss denominator. |
| `math-domain-normalization` | Give mathematics and code equal objective weight despite 1000/4000-token responses. Define domain labels, masks, token counts, target domain weights, token NLL and logits. | Differentiate the domain-normalized loss, then regroup a flat token loss to expose implicit domain weights. Retain equal-domain loss `2` versus flat `2.6`, and fourfold per-token weighting for the shorter domain. Derive the mixed-return score-function gradient; code reward rescaling changes `0.72` to `2.07` with unchanged sampling weights. | Explicit averaging changes training emphasis; sampled domain percentages alone are insufficient. Preserve the distinction between a return gradient and clipped/normalized surrogates. Next identify whether the averaged supervision is an output trajectory or a teacher distribution. |
| `math-distillation-pipeline` | Choose between an interface returning verified complete code and one returning teacher probabilities on student prefixes. Define the teacher generation distribution, verifier, acceptance normalizer, student logits and mode condition. | Condition teacher `[0.6,0.4]` on only the first candidate passing, obtaining `[1,0]` and `3.333333` expected attempts for two successes. Derive fixed-prefix forward KL and `p-t`: at teacher `[0.8,0.2]`, student `[0.5,0.5]`, KL is `0.192745` nats and gradient `[-0.3,0.3]`, versus hard-label `[-0.5,0.5]`. Preserve student-prefix state-distribution and thinking-mode qualifications. | Explain what information each interface transfers and why a prefix-local gradient is not automatically a full on-policy trajectory gradient. Qwen's exact KL direction/weights are not inferred from this teaching implementation. Next budget rejected outputs and recurring teacher queries separately. |
| `math-pipeline-budget` | Obtain one million training tokens through 25%-acceptance RS or student-prefix teacher supervision. Inputs explicitly specify equal lengths, independent acceptance, optimization passes and per-thousand-token teaching CU rates. | Derive candidate volume from waiting time, charge generation/verification on every candidate and optimization on retained data. Preserve `6800 CU` RS versus the incorrect `3200 CU` retained-only calculation, and `3500 CU` OPD under one teacher query. Preserve `3995*16*4096 = 261,816,320` hypothetical rollout tokens, plus V3 shares `0.179340%` of formal total and `0.187688%` of pretraining. | Different supervision and omitted system costs prevent a quality/cost superiority claim. Query count is not rollout volume; CU is not a vendor price. Next add tools, waiting and asynchronous execution in chapter 23. |

### Chapter 23

| Section ID | Teaching Task And Inputs | Calculation And Numerical Readout | Interpretation And Next Step |
| --- | --- | --- | --- |
| `derivation` | Train only a repository assistant's new actions, distinguish task reward from prior-stage teacher feedback, and locate safety scoring in the final reward. Define trajectories, prefixes, behavior policy, masks, frozen weights and total active tokens. | Preserve masked CISPO and make `0.6/N` explicit from weight `1.2`, advantage `0.5`; observations contribute zero. Reconnect teacher/student probabilities `0.8/0.4` to log-gap `0.693`. Preserve simplified safety product: helpfulness/safety `0.9/0` yields `0`, while `0.6/1` yields `0.6`. Explicitly disambiguate safety `s` from prefix `s`. | These mechanisms occupy different positions and are not claimed to form one vendor's full objective. M1's absent effective lower bound remains explicit; local coefficients are not full parameter updates and safe scores are not safety proofs. Next audit the actual probability and token inputs under asynchrony. |
| `math-async-ratio` | A generated action has probability `0.2`, old training-engine recomputation gives `0.25`, and current training gives `0.30`; diagnose the missed factor and missing sampling support. Define the three normalized distributions and fixed-prefix statistic. | Insert the old training probability to factor actual ratio `1.5` into parameter change `1.2` and engine mismatch `1.25`. Preserve detached upper-clipped CISPO coefficient `0.6`. Derive the full trajectory ratio with environment cancellation. With behavior `[0.6,0.4,0]`, target `[0.3,0.3,0.4]`, sampled ratio expectation is `0.6`; conditioning target to `[0.5,0.5,0]` restores `1` but changes the target. | Fixed-prefix correction does not restore the prefix state distribution, and absent support cannot be recovered. Save behavior logprobs, action IDs, sampling masks and versions; distinguish TITO, route alignment and freshness. Next compute teacher gradients with these inputs aligned. |
| `math-opd-gradient` | Restore a lost repair capability using a saved earlier teacher when only one current trajectory is generated per task. Define positive fixed-prefix student/teacher probabilities, logits, action one-hot and detached log-gap. | Differentiate sampled logprob and average under the student, then independently differentiate reverse KL. Preserve expected ascent `0.24*log(6) = 0.430022` for student `[0.4,0.6]`, teacher `[0.8,0.2]`. With uniform behavior and upper clipping at `1`, expectation becomes `0.386078`; retain token/domain denominator requirements. | Group size one still has teacher information, but not a GRPO group baseline. Clipping changes the expected update; the fixed-prefix identity does not establish an exact whole asynchronous GLM objective. Next validate capability retention and inspect queue/budget costs. |
| `math-agent-budget` | Speed up repository tasks using parallel checks and shared prefixes without changing dependencies or statistical weights. Define task graph times, overhead, finish times, token work, arrival rate and residence time. | Explain dependency recurrence: durations `[4,6,3]` plus `2` overhead give `15` serial, `8` independent parallel, or `11` with the third task depending on the second. Retain speedups `1.875` and `1.363636`. Shared prefixes reduce linear work `3300` to `1300` (`2.538462` ratio), not a measured Forge speedup. Little's law gives `10` in flight and approximate age `2` versions. | Parallelism rearranges time; reuse reduces repeated work but must preserve original loss weights. Age is not a KL bound and stable-queue assumptions matter. Next use cost and paired quality for chapter 24 selection; chapter 28 owns full system details. |

### Chapter 24

| Section ID | Teaching Task And Inputs | Calculation And Numerical Readout | Interpretation And Next Step |
| --- | --- | --- | --- |
| `derivation` | Evaluate a code-assistant proposal by separating what its update changes from whether three net extra correct answers support adoption. Define an explicitly schematic weighted-logprob objective, full costs and paired discordant counts. | Preserve the schematic loss with its non-universality warning; explain joint task/trajectory sampling. Preserve the cost sum, exact McNemar expression and Holm procedure, adding the existing example's `b=7,c=10`, `p=0.629059` readout. Reconnect `35/20` GPU-hours and `63%/60%` success. | A positive observed effect and higher spending do not attribute improvement to the algorithm. Define the comparison family and overall error rate; do not equate nonsignificance with equivalence. Next check precise gradients and supervision availability before statistical selection. |
| `math-objective-gradients` | Select a feasible method for a 7B assistant with demonstrations and executable tests but no resident teacher. Define parameter versus logit coordinates, sequence likelihood, score vectors, masks/gates and frozen reference/teacher data. | Preserve SFT, DPO, policy-surrogate and both KL derivatives. DPO at beta `1`, margin `log(2)` gives loss `0.405465` and chosen/rejected coefficients `-1/3,+1/3`, unlike SFT's single `-1`. Teacher `[0.8,0.2]`, student `[0.4,0.6]` gives forward gradient `[-0.4,0.4]` versus reverse approximately `[-0.430022,0.430022]`. | Explicitly connect each gradient to its required demonstration, preference, verifier or probability interface. Local loss magnitude cannot rank model quality; privilege must be removed at evaluation. Next compare outcomes on matched tasks rather than incomparable training losses. |
| `math-paired-inference` | Keep the same 100-task A/B table while estimating effect, testing direction, giving an interval and adjusting three prespecified comparisons. Define paired binary outcomes and task-independence/cluster qualifications. | Preserve shared-correct `53`, shared-wrong `30`, discordant `7/10`, effect `0.03`. Condition on `17` discordant tasks: combination sum `41,226`, exact p `0.629059`. Expand squared differences to obtain SE `0.041329` and approximate interval `[-0.051005,0.111005]`. Retain three-comparison Holm adjusted p values `[0.0234375,0.0771484375,0.62905883789]`, with only the first rejected. | Explain what each calculation adds and why the interval is approximate, not exact or a posterior probability. Positive effect, nonsignificance and a cross-zero interval are compatible; no equivalence claim follows. Next carry this uncertainty into marginal-cost decisions. |
| `math-budget-design` | Decide whether to spend more when B's uncertain three-point gain costs 15 extra GPU-hours. Define complete per-run cost, a fixed budget cap, success estimates, per-request inference cost and request count. | Retain `2M` versus `3M` generated tokens despite `100/50` steps; marginal ratio `15/0.03 = 500` GPU-hours per unit probability, or `5` per percentage point. Explain one-time training versus recurring inference in `C/Q + I`. Preserve the 100-hour capacity arithmetic: five A runs or two B runs with 30 hours left, clarifying these are alternative per-configuration capacities, not a combined 100-hour bill. | The denominator's uncertainty makes the marginal ratio unreliable. Predeclare matched seeds, complete budgets, comparison family and final-test use; include discarded candidates and search costs. Next use the comparison table and whiteboard questions to explain an evidence-based selection. |

### Retention And Clarifications

- No mathematical topic or original displayed equation was removed.
  Existing numerical examples remain the reference calculations.
- The three-step GAE values were already in chapter 20's code and numeric
  tests; the revision brings their explanation into the derivation.
- The added mixed-group evaluation `1 - 0.25^4 - 0.75^4 = 0.6796875`
  is a synthetic evaluation of an existing formula, independently checked.
- The pagination example now explicitly says the second check is an
  additional independent boundary test; a prior pass is not silently
  redefined as a pass of the stronger verifier.
- Chapter 24's 100-hour example now states that five-versus-two run counts
  are alternative capacities for one configuration. The arithmetic is
  unchanged; this avoids implying both configurations fit into the same
  aggregate 100-hour budget.
- No new industrial benchmark, price, hyperparameter or reproduction is
  claimed. Existing primary-backed corrections and public-disclosure
  limits are preserved, including Seed2.0's model-card-only scope and
  Qwen3.5's limited recipe disclosure.

## Verification

Scoped checks completed on 2026-09-30:

- `node --check` passed for all five chapter files.
- Imported the baseline chapter modules using `git show HEAD:<path>` and
  compared them with the working modules: all **69 section IDs and types**
  are preserved, as are all chapter metadata and source objects.
- Every non-narrative section is deep-equal to baseline, including the
  complete **48 question-and-answer entries** (including **16 whiteboard
  questions**), diagrams, code, pitfalls, comparisons and interview material.
- All 15 opening/example/roadmap bodies and all **19 derivation bodies**
  differ from baseline; their first paragraphs contain neither dollar
  math delimiters nor LaTeX commands. Every derivation's first and final
  paragraphs were also read together to check task/result continuity.
- The actual first three IDs are `intuition`, `example`, `roadmap` in
  each file. Roadmap targets exist and appear in strictly increasing
  learning order. Rendering both learning and interview modes passed
  **50 roadmap-target checks**, all derivation-ID checks, opening/objective
  ordering and the existing formula-index mode-state checks. An initial
  chapter-20 roadmap link to `diagram` failed because diagrams are hidden
  in interview mode; that new link was removed and the text now marks the
  diagram as a learning-mode aid. Both modes passed after the fix.
- All **71 original display formulas** in the revised sections remain
  verbatim. A separate comparison found **zero missing original inline
  formulas** within their original sections; no code-lab formula was changed.
- `python3 scripts/check-math-20-24.py`: **15/15 tests passed**, covering
  derivatives, GAE, aggregation, noise, exact subset enumeration, dynamic
  selection, verification noise, distillation, support, cost, McNemar
  and Holm.
- Extracted and executed each chapter's existing `~~~python` lab with
  `python3 -`: **5/5 passed**, including finite differences and boundary
  assertions. No files were created to run these snippets.
- Scoped use of the existing renderer and local KaTeX parsed **738 formula
  occurrences in learning mode** with zero failures: chapter 20 `180`,
  21 `163`, 22 `123`, 23 `139`, 24 `133`. Interview mode passed **736
  occurrences** (chapter 20 `178`, the other four counts unchanged).
  These counts include repeated formulas and answers, not distinct
  mathematical topics. Math delimiter checks passed.
- All **24 source-manifest anchors** located within owned chapters retain
  their **29 required body terms**; source hashes were verified separately
  during the complete reread described above.
- Scoped `git diff --check` passed.
- Audit coverage was checked against the actual chapter sections:
  **19/19 source records** and **19/19 per-derivation records** are present.

Whole-site UI, shared test changes, the integrated 37-source document and
browser acceptance belong to the main integrator. No commits, shared-file
edits, industrial training runs or new primary-paper replications were
performed by this worker.

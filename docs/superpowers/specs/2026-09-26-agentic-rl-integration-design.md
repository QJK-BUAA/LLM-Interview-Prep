# Agentic RL 全量资料整合设计

日期：2026-09-26

## 1. 目标

在现有 `/Users/bytedance/Desktop/面试/ml-roadmap` 中吸收
[`xavierzhang2002/agentic-rl-analysis`](https://github.com/xavierzhang2002/agentic-rl-analysis)
仓库截至提交 `66ae4423b36270ef50a288fb1bb2e1b31c46c329` 的全部 37 份 Markdown
文档，将当前 21 章课程扩展为 30 章连续学习路线。

“全部文档都要学习”定义为：

1. 逐篇阅读来源仓库的正文，而不是只读取目录或当前链接。
2. 每份文档都进入可审计的来源映射表，至少有一个明确的目标章节。
3. 每个重要概念、算法、工业案例和作者判断都被吸收、校正、合并或明确标记为不应作为事实采用。
4. 最终正文按本项目的新手教学契约重写，不逐字复制来源材料。
5. 关键技术结论回到原论文或官方技术报告核验，来源仓库作为二级综述来源。

## 2. 来源审计

来源仓库包含：

- 37 份 Markdown，共约 4,595 行。
- 12 篇 Post-Training 算法基础文档。
- 10 篇工业模型与数据工程文档。
- 3 篇技术演进、挑战与观点文档。
- 7 篇 Agentic RL 算法、工程、全景和展望文档。
- 5 份 README、首页和分区索引类元文档。
- 18 张论文流程图或机制图。

内容覆盖 50 余篇论文与 12 个以上模型/技术报告，主题可分为四层：

1. 后训练优化算法：PPO、GRPO、DAPO、VAPO、CISPO、GSPO、SAPO 等。
2. 工业训练 Pipeline：DeepSeek、Qwen、Seed、Kimi、MiniMax、GLM 和闭源模型。
3. 数据与系统：数据合成、Query 筛选、奖励、环境、异步训练、训推一致性。
4. Agentic RL：奖励稳定性、探索效率、长程信用分配、环境和未来路线。

### 2.1 需要校正的来源问题

来源仓库是高价值调研材料，但不能直接视作权威事实集合。整合前必须处理：

- CISPO 在算法章被定义为“裁剪 token 级 IS 权重、对权重 stop-gradient”，在
  MiniMax 案例章又被描述为“序列级 ratio 裁剪”。最终以原论文定义为准，并将
  CISPO 与 GSPO 分开讲解。
- DAPO、VAPO 的论文标题和缩写解释存在不一致，最终使用 arXiv 元数据中的正式标题。
- “RLVR 没有 reward hacking”“GSPO 淘汰 Routing Replay”等绝对表述需要降级为
  有条件结论。解析器漏洞、测试覆盖不足和跨引擎不一致仍然存在。
- 模型榜单、训练成本和消融数字必须绑定具体模型、数据集、评测协议及报告日期，
  不外推为通用规律。
- 来源中的“行业共识”“个人观点”“未来预测”必须与论文结果分栏，不能混写。
- 无公开技术报告的闭源模型和只发布博客的模型，只记录公开事实，不推断训练细节。

## 3. 方案选择

### 方案 A：扩展为 30 章连续课程

把高级后训练、工业实践、数据工程和 Agentic RL 纳入统一依赖图。

- 优点：学习顺序连续；每章仍可保持单一主题；便于建立公式、例子和面试题。
- 代价：新增 9 章，并重写第 20 章；内容与浏览器验收工作量最大。
- 结论：采用。

### 方案 B：保持 21 章

把全部材料压入当前第 17 至 20 章。

- 优点：章节编号不变。
- 缺点：单章会同时承担算法、工业案例、数据工程和 Agentic RL，破坏新手教学契约。
- 结论：不采用。

### 方案 C：新增独立附录

保留 21 章主线，把新内容做成可选资料页。

- 优点：对已有内容改动小。
- 缺点：Agentic RL 与 MDP、策略梯度、RLVR 的先修链断开；用户难以判断阅读顺序。
- 结论：不采用。

## 4. 最终课程结构

### Part 0 至 Part 4：保留现有地基

| 章节 | 主题 | 本次处理 |
| --- | --- | --- |
| 00 | 学习地图 | 更新为 30 章路线，加入 Mid-Training 与 Agentic RL |
| 01-15 | 数学、ML、DL、LLM、RL 地基 | 保留结构，仅补必要的跨章链接和术语 |

### Part 5：LLM 后训练

| 章节 | 主题 | 主要来源 |
| --- | --- | --- |
| 16 | PPO、奖励模型与经典 RLHF | RLHF/RLVR、PPO、闭源安全对齐 |
| 17 | GRPO、DAPO、Dr.GRPO 与 RLOO | GRPO、DAPO、演进逻辑 |
| 18 | DPO 与离线偏好优化 | DPO、工业 Pipeline 中的离线阶段 |
| 19 | OPD、OPSD 与跨阶段蒸馏 | GLM-5、Agentic Training、现有 OPD/OPSD 论文 |
| 20 | VAPO、CISPO、GSPO、SAPO 与 MoE 稳定性 | VAPO、CISPO、GSPO、SAPO |
| 21 | 后训练数据工程与 SFT–RL 飞轮 | 数据工程专题 |
| 22 | 工业案例 I：DeepSeek、Qwen 与 Seed | 三个模型系列报告 |
| 23 | 工业案例 II：Kimi、MiniMax、GLM 与闭源模型 | 四类模型报告、Agentic Training |
| 24 | 跨模型经验、技术演进与方法选择 | 速查表、演进、跨模型、挑战与观点 |

### Part 6：Agentic RL

| 章节 | 主题 | 主要来源 |
| --- | --- | --- |
| 25 | 从推理 RL 到 Agentic RL | Agentic RL 概述、四大挑战 |
| 26 | 奖励信号与训练稳定性 | IGPO、CM2、SeeUPO、ARLArena/SAMPO、VCPO |
| 27 | 探索效率与长程信用分配 | EMPO²、LUFFY、GiGPO、ELPO、ProxMO |
| 28 | 环境、轨迹与异步训练系统 | GLM-5、Kimi K2、Forge、ABE、ASTRA、GEM |
| 29 | Agentic RL 全景、路线判断与综合面试 | 算法速查、领域全景、未来预测 |

第 20 章由原“最终综合章”改写为高级在线策略优化；原第 20 章中仍有效的
方法选择、实验设计和面试内容迁移至第 24 章。第 25 至 29 章构成可独立进入、
但与第 13 至 24 章严格相连的 Agentic RL 学习路径。

## 5. 现有章节修改边界

- 第 00 章：新增 Pre/Mid/Post-Training 与 Agentic RL 全景图，更新路线和总章数。
- 第 11 章：增加训推引擎一致性、确定性和异步系统的前置概念，但详细内容留给第 28 章。
- 第 16 章：补充 RLHF/RLVR 适用边界、RM 暴露风险和不可验证任务的奖励问题。
- 第 17 章：保留 GRPO 主线，强化 DAPO；将 VAPO/CISPO/GSPO 的完整推导移到第 20 章。
- 第 18 章：补充 DPO 在工业多阶段 Pipeline 中的实际位置，不扩成在线 RL 章节。
- 第 19 章：加入 Cross-Stage Distillation 与多阶段遗忘，但继续以 OPD/OPSD 机制为核心。
- 第 20 章：完全改写为高级在线优化算法。
- 第 21 至 29 章：新增。

其他章节不做与本目标无关的重写。

## 6. 全部来源文档映射

最终项目新增机器可读来源清单，记录仓库 URL、提交 SHA、源文件、目标章节、
覆盖主题和证据类型。以下是设计级映射：

| 来源文档 | 目标章节 |
| --- | --- |
| `README.md` | README、00 |
| `README_zh.md` | README、00 |
| `docs/index.md` | 00、24、29 |
| `docs/post-training/index.md` | 00、24 |
| `docs/post-training/ch1/1.1-training-landscape.md` | 00 |
| `docs/post-training/ch1/1.2-rlhf-rlvr.md` | 16、25 |
| `docs/post-training/ch1/1.3-dpo.md` | 18 |
| `docs/post-training/ch1/1.4-ppo.md` | 16 |
| `docs/post-training/ch1/1.5-grpo.md` | 17 |
| `docs/post-training/ch1/1.6-dapo.md` | 17 |
| `docs/post-training/ch1/1.7-vapo.md` | 20 |
| `docs/post-training/ch1/1.8-cispo.md` | 20 |
| `docs/post-training/ch1/1.9-gspo.md` | 20、28 |
| `docs/post-training/ch1/1.10-sapo.md` | 20 |
| `docs/post-training/ch1/1.11-cheatsheet.md` | 20、24 |
| `docs/post-training/ch1/1.12-evolution.md` | 20、24 |
| `docs/post-training/ch2/2.1-deepseek.md` | 22 |
| `docs/post-training/ch2/2.2-kimi.md` | 23、28 |
| `docs/post-training/ch2/2.3-qwen.md` | 22 |
| `docs/post-training/ch2/2.4-minimax.md` | 23、28 |
| `docs/post-training/ch2/2.5-glm.md` | 19、23、28 |
| `docs/post-training/ch2/2.6-seed.md` | 22 |
| `docs/post-training/ch2/2.7-closed-source.md` | 23 |
| `docs/post-training/ch2/2.8-cross-model.md` | 24 |
| `docs/post-training/ch2/2.9-data-engineering.md` | 21、28 |
| `docs/post-training/ch2/2.10-agentic-training.md` | 19、23、25、28 |
| `docs/post-training/ch3/3.1-timeline-paradigms.md` | 00、24、25 |
| `docs/post-training/ch3/3.2-challenges-future.md` | 20、24、26、28 |
| `docs/post-training/ch3/3.3-opinions.md` | 24、29 |
| `docs/agentic-rl/index.md` | 25、29 |
| `docs/agentic-rl/ch1/1.1-overview.md` | 25 |
| `docs/agentic-rl/ch1/1.2-reward-stability.md` | 26 |
| `docs/agentic-rl/ch1/1.3-exploration-credit.md` | 27 |
| `docs/agentic-rl/ch1/1.4-engineering.md` | 28 |
| `docs/agentic-rl/ch1/1.5-algorithm-summary.md` | 29 |
| `docs/agentic-rl/ch2/2.1-landscape.md` | 29 |
| `docs/agentic-rl/ch2/2.2-outlook.md` | 29 |

验收脚本必须验证上述 37 个路径全部存在于清单，且每项至少映射一个有效章节。

## 7. 教学写法

每个新增或重写章节继续满足现有九层契约：

1. 直觉：先解释要解决的失败模式。
2. 最小例子：使用可手算数值或可跟踪轨迹。
3. 机制图：使用离线 DOM 图示，不复制来源仓库截图。
4. 公式推导：定义符号后逐步展开。
5. 代码实验：提供短小可运行代码或完整伪代码。
6. 常见误区：明确相似方法边界。
7. 方法对比：给出适用条件、成本与失败方式。
8. 面试表达：30 秒答案及追问展开。
9. 自测：至少三题，默认折叠答案。

复杂章节还必须提供“诊断顺序”：先判断数据/奖励/轨迹/系统哪个环节失效，
再选择算法，避免将缩写排列成无条件升级链。

## 8. 证据规则

每条结论按以下层级写入：

- **原论文定义**：算法公式、理论命题和论文实验。
- **官方技术报告结果**：模型 Pipeline、训练规模、榜单和工程故障。
- **跨来源经验**：至少两个独立公开来源支持，且说明适用条件。
- **来源作者观点**：保留价值但明确标为观点或教学假设。
- **本项目教学解释**：类比、数字例子和决策树，不冒充研究结论。

所有 2025–2026 算法至少引用原论文或官方材料。只有博客的模型必须标记
“公开信息有限”。数值结果必须附模型、数据集和报告来源；不使用无条件的
“SOTA”“完全解决”“零风险”等表述。

## 9. 数据与代码结构

新增：

- `content/chapter-21.js` 至 `content/chapter-29.js`
- `content/source-manifest.js`
- `tests/source-manifest.test.mjs`
- 更新后的桌面与移动截图

修改：

- `content/chapter-00.js`
- `content/chapter-11.js`
- `content/chapter-16.js` 至 `content/chapter-20.js`
- `content/catalog.js`
- `content/schema.js`
- `scripts/validate-content.mjs`
- `app/glossary.js`
- `app/app.js`
- `index.html`
- `README.md`

章节仍是独立 ES modules，渲染器与状态层不承载学科内容。目录数量和总进度由
catalog 动态生成，不再在 HTML 中写死 21 和 189。

状态存储升级为版本 2：保留 00–19 的有效完成记录；由于第 20 章语义改变，
旧第 20 章完成记录丢弃。主题和模式继续保留。

## 10. 校验与测试

### 内容校验

- 章节数量严格为 30，ID 为 00–29。
- 270 个必需教学 section 全部存在。
- 每章不少于 1,800 个中文字符。
- 每章有代码围栏、图示、至少三道题和至少一个来源。
- 37 份来源文档全部进入来源清单，无遗漏、重复路径或无效目标章节。
- 搜索至少覆盖 SAPO、VAPO、CISPO、GSPO、DeepSeek-V3.2、Kimi K2.5、
  GLM-5、TITO、Agentic RL、SeeUPO、EMPO²、IGPO、GiGPO、ELPO 和 ProxMO。

### 单元测试

- 来源清单的提交 SHA、路径唯一性和目标章节有效性。
- 30 章 catalog 顺序。
- 状态 v1 到 v2 的迁移规则。
- 现有 schema、store 和 renderer 回归测试。

### 浏览器验收

在 1440×1000、900×900 和 390×844 下验证：

- 首页进入第 00 章并显示 30 章。
- 搜索算法、模型和 Agentic RL 术语能到达正确章节。
- 第 20、21、22、23、25、26、27、28、29 章公式、表格、代码和图示正常。
- 学习/面试模式、目录、抽屉、完成状态、刷新恢复和代码复制可用。
- 逐章检查 00–29，无页面级横向溢出、遮挡、公式 fallback 或控制台错误。
- 所有本地模块、KaTeX 与字体资源返回 HTTP 200。

## 11. 完成标准

只有以下条件同时满足才算完成：

1. 30 章均通过九层教学契约和字数校验。
2. 37 份来源文档在机器可读清单中全部有落点。
3. 来源中的算法矛盾已依据原论文修正，观点与事实分层。
4. 原 21 章基础链不退化，新增章节按先修关系可连续学习。
5. 单元测试、内容校验和三档浏览器验收全部通过。
6. 新截图已人工检查，工作区提交完成。
7. 旧 `/Users/bytedance/Desktop/面试/ml-notes` 仍无修改。

## 12. 非目标

- 不逐字镜像来源仓库，也不复制其 MkDocs 页面结构。
- 不把 18 张来源截图直接搬入课程；机制图继续使用本项目离线 DOM 图示。
- 不复现所有论文实验或训练模型。
- 不把来源作者的预测包装成已经验证的结论。
- 不引入新的前端框架、在线字体或运行时网络依赖。

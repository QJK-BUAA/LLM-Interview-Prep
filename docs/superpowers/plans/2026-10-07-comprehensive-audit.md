# Comprehensive Curriculum Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全面检查现有 30 章课程的合理性、完整性与正确性，修复可证实的问题，并给出有边界的完整性结论。

**Architecture:** 以 `635fb27` 为基线，在原课程内精确修订。按五个不重叠章节范围完整审查，另审术语、全局先修、来源覆盖和页面；发现问题先给证据与修法，再实施。保留章节、旧小节 ID 和学习进度。

**Tech Stack:** 原生 ES modules、Node tests、Python 独立数值校验、本地 KaTeX、agent-browser、原论文与官方资料。

---

这是用户已授权课程工作的继续检查与修正，不另行请求规格或执行许可。
已使用 brainstorming 梳理范围，writing-plans 记录流程，再按 executing-plans 分工执行。
推荐的 subagent-driven-development 未安装，开始审查时工具发现也未提供新建代理工具；因此本轮由主代理按五个范围分批精读，各批先不看旧审计结论，保持先检查后修正。
当前功能分支工作区干净，不更换或破坏原 `ml-notes` 项目。

## 审查尺度

以已声明的“基础 ML → 神经网络/Transformer/系统 → 后训练 → Agentic RL 面试”范围判定完整性，不声称覆盖机器学习所有研究方向。

每章逐项检查目标、开场、例子、路线、图、所有推导、代码、误区、对比、面试表达、全部问答及来源。章节必须给出可操作学习结果；“出现算法名字”不等于完整讲解。区分：

- **错误**：公式、代码、条件、技术定义或引用不成立，给出原句及反例/一手依据。
- **关键缺口**：声明的目标或下一章所需能力没有可学习的落点，给出前后依赖。
- **范围外延伸**：对部分岗位有价值但不是当前主线承诺，说明边界，不任意膨胀课程。
- **表述问题**：同章或跨章符号、单位、出处、结论强度冲突，修改应消除具体误解。

既有数学测试用于回归，不替代独立推导；既有 audit/evidence 用于追溯，不直接当作当前正确性的证明。涉及新近算法、工业配方或冲突结论时回读一手来源，网络失败不能写成已验证。

## Task 1：基线与全局盘点

**Files:** `content/catalog.js`、`content/source-manifest.js`、`app/glossary.js`；
新增 `artifacts/comprehensive-baseline-*`、最终 `docs/research/comprehensive-audit-2026-10-07.md`。

- [x] 确认分支、基线和工作区；读取项目约束与原规格。
- [x] 枚举每章实际目标、推导、问题和来源，形成最终覆盖表。
- [x] 执行基线 `npm test`、`npm run validate`、`node scripts/check-math-rendering.mjs`、`python3 scripts/check-interview-math.py`，保留本轮日志。
- [x] 主代理检查 glossary 全部定义与正文边界；确认修法记录于 `comprehensive-audit-global.md`。
- [x] 核查 37 份固定上游文档的内容落点和 30 章的学习依赖，不无提示切换上游版本。

## Task 2：全章独立审查

**Files:** `content/chapter-00.js` 至 `chapter-29.js`；
新增 `docs/research/comprehensive-audit-00-04.md`、`05-12.md`、`13-19.md`、`20-24.md`、`25-29.md`。

- [x] 按五个范围分别完整读取实际正文；第一遍不以旧 narrative-audit 的“通过”引导判断。
- [x] 各批报告每章覆盖结论、具体问题、严重程度、证据/独立数值、推荐修订与可选延伸。所有教学形式均须审查，包括原来未改写的代码、对比和问答。
- [x] 公式检查目标、随机变量、维度、符号、归一化、采样分布、stop-gradient、端点和适用条件；用小反例或独立计算验证可疑点。
- [x] 来源检查算法正式定义、版本/日期/指标/成本分母与披露边界；关键说法回读原论文/官方资料，不仅打开链接。
- [x] 各批报告跨章依赖；第一阶段不改课程，不提交，避免修订掩盖基线问题。
- [x] 主代理读取全部问题，排除误报，按证据确认修订；对关键结论独立复算或复读一手材料。

## Task 3：精确修订

**Files:** 经 Task 2 确认的问题所对应章节、`app/glossary.js`、相关数值脚本或测试。

- [x] 给确认的问题记录精确文件和修法，再分批实施；不因审查而机械重写无问题内容。
- [x] 若属于声明范围内的实质缺口，在最接近的现有章节补足动机、公式、手算与问答；新增 section 使用新 ID，旧 ID 和存储键保留。
- [x] 公式/数值变化同步正文、代码、题目和独立数值程序；只为真实计算风险或行为回归添加检查，纯措辞不写镜像测试。
- [x] 主代理统一术语、先修和总阅读说明。保持问题→例子→路线的开篇及面试模式完整公式。
- [x] 在最终报告中逐条记录已修复问题与残留边界，不以篇数、字数、公式数证明质量。

## Task 4：验收与交付

**Files:** `scripts/audit-browser.mjs`、`scripts/audit-interactions.mjs`；
新增 `artifacts/comprehensive-*` 及最终总报告。

- [x] 对实际变更运行相应验证，再完成全套 Node、schema、KaTeX 和五组数值程序；失败后定位原因，不为过关删除检查。
- [x] 使用本轮独立浏览器 session 和产物名前缀，检查三宽度两模式、释义、公式、搜索、索引、旧路由和进度；查看代表性截图。
- [x] 最终报告给出 30 章逐章覆盖、37 份综述对应范围、确认问题及修复、可选方向与未验证范围。
- [x] 检查文档链接、diff、工作区，保存本地提交，不推送或发布；仅当剩余工作确实完成时结束 goal。

## 自检

审查范围可执行，检查与实现分开；未预设“全对”或为追求问题数而找错。当前没有需要用户决策的范围分歧。若遇到来源不明确，记录不确定性并继续独立工作；必要时缩小技术主张，不能虚构验证。

## 审查阶段记录

已完整精读 00–19 的全部教学形式，形成 `docs/research/comprehensive-audit-00-04.md`、`comprehensive-audit-05-12.md` 与 `comprehensive-audit-13-19.md`。确认问题、独立反例与推荐修法均已记录。09 的 mask 接口和完整前向、10 的 ALiBi/YaRN 目标覆盖、19 的公式与代码聚合分母是需修复的实质项；13–19 另有定义和速记条件需与详细推导统一。

新增位置专题已定向复读 ALiBi v2 §3、YaRN v3 §3.2–3.3/A.1。13–19 复读了 DAPO、Dr.GRPO、GLM-5 跨阶段蒸馏、OPSD、RLSD、Lightning、Purified、H²SD 与 Rethinking OPSD 的相关方法或诊断节，并记录原文内部不宜照搬的表述与实现边界。上游临时快照消失后重新克隆至 `/Users/bytedance/.cache/ml-roadmap/agentic-rl-analysis`，固定同一 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`；本轮已实际重读上游 1.2–1.6 共 5 份，其余留待后两批和全局检查。

20–24 的全部教学形式也已完整精读，记录于 `docs/research/comprehensive-audit-20-24.md`。确认 VAPO 正例项首式归一化需与论文/代码统一、安全乘积需限定 s=0 的硬门控解释，以及 24 的 OPSD 信息迁移表述。其余公式、数值和已核验工业归属没有发现需机械重写的问题。本批复读 18 组一手方法/诊断节点，并完整读完剩余 post-training 源文档及全局入口；本轮固定上游累计 29/37，剩余 8 份均属 agentic-rl。

25–29 的全部教学形式与余下 8 份 agentic-rl 上游文档也已读完。五批报告齐全；全局先修、glossary 与完整性修法记录于 `docs/research/comprehensive-audit-global.md`。本轮再次验证固定版本 37 份文件、263729 字节、SHA-256 全匹配。26/27 的关键方法均定向复读原论文完整方法节；新增调度、截断采样、ALiBi/YaRN、投机解码已读取对应原始定义。

以上为修订前独立审查的记录。随后已实施五批报告与 global 决策：四个新推导、09 完整前向、数学/来源条件、全局释义与先修；保留全部 439 个旧小节 ID、260 道旧题。当前 443 小节、143 推导、126 白板，逐章盘点见 `artifacts/comprehensive-final-inventory.json`。

37 项 Node、内容契约、4681 处 KaTeX、五组原数值、7 项新增数学及5项实际正文代码行为检查通过。三宽度两模式的 180 个布局初次通过后，截图发现窄屏 tooltip 裁切，已修复定位并给交互检查增加真实边界断言。修复后的 180 个布局、三宽度原生交互均通过，控制台错误 0，代表截图已查看；总报告为 `docs/research/comprehensive-audit-2026-10-07.md`。本计划、修订和验收产物一并保存在本地提交，不推送。

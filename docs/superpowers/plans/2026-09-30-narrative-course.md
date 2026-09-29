# Narrative Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让课程按具体问题、已有知识、公式推导和结果解释连续展开，并提供 37 份 GitHub 原文的实质阅读对应说明。

**Architecture:** 保留章节与小节 ID，直接重编原正文；原 `intuition` 成为章首。正文顺序、目录、搜索和进度继续使用同一套 sections。renderer 将目标移至开场之后、公式索引移至路线之后。

**Tech Stack:** 原生 ES modules、现有 KaTeX、Node tests、Python 数值程序、agent-browser。

---

已有明确修订授权，不再次询问方案或执行方式。在现有干净功能分支 `feat/beginner-roadmap` 上执行。已加载 brainstorming、writing-plans、executing-plans；推荐的 subagent-driven-development 未安装，使用原生分工工具执行五个独立内容任务，主代理统一整合。原文目录为 `/private/tmp/agentic-rl-analysis-66ae4423`，固定提交和 37 文件哈希已核对。

## Task 1：重编正文及来源重读

**Files:** `content/chapter-00.js` 至 `content/chapter-29.js`；
`docs/research/narrative-audit-00-04.md`、`05-12`、`13-19`、`20-24`、`25-29`。

- [x] 派发五个互不重叠的内容任务。各组完整读取负责章节、本设计、对应上游原文以及既有 evidence 记录。不得凭算法常识跳过上游正文。
- [x] 每章保留原全部 ID/type、公式主题、题目、来源；数组前三节重排为 `intuition`, `example`, `roadmap`。其余 sections 按知识依赖保留或调整，路线 links 必须与真实学习顺序匹配。
- [x] 重写 `intuition` 为具体场景、问题和跨章衔接；改写 `example` 的解释，明确例子数字的角色；改写 `roadmap` 的先后原因。第 00 章初读目标限于模型、预测、误差、训练/评估和学习路线，高阶公式标明后续回访。
- [x] 对全部 derivation 重编开头、必要中间衔接和结尾。第一段用无 LaTeX 的文字说明一个特定计算任务；随后解释变量，再推公式，最后解释结果回到任务。不得简单复制通用六句提示到所有主题。
- [x] 保持数学公式和手算值一致。若需要纠错，写入审查记录并同步数值程序；不能删去不容易解释的公式。把“必须马上会”“先修只需四则运算”等矛盾要求修正。
- [x] 每组记录每个推导的实际任务、对应旧例子/数字、关键解释变化；有上游对应的章另列原文件、小节、论点、采纳/修正、课程位置。基础补充章如实说明教材来源。
- [x] 本组逐章运行 `node --check`，检查前 3 个 ID、全部旧 ID、数学分隔符和路线目标；不修改共享 UI/schema/tests，不提交。

原文分配：

- 00–04：README/README_zh、docs/index、post-training/index、训练全景、时间线；01–04 主要为补充基础。
- 05–12：基础补充，明确其来源不是本 GitHub；可读取 README 理解课程定位，保留原教材/论文来源。
- 13–19：post-training/ch1 的 RLHF/RLVR、DPO、PPO、GRPO、DAPO；GLM 与 agentic-training 中蒸馏部分。13–15 是先修基础。
- 20–24：完整读取 post-training/ch1 的 VAPO/CISPO/GSPO/SAPO/cheatsheet/evolution，ch2 的全部 10 篇，ch3 的三篇；为工业与综合章节保持原文脉络。
- 25–29：agentic-rl/index 及 ch1/ch2 全部 7 篇，另读 post-training 的 RLHF/RLVR 和 agentic-training 联系部分。

## Task 2：阅读顺序与公式索引

**Files:** `app/renderer.js`, `app/styles.css`, `content/schema.js`,
`scripts/validate-content.mjs`, `tests/renderer.test.mjs`,
`tests/interview-curriculum.test.mjs`, `tests/source-manifest.test.mjs`。

- [x] 面试类型集合增加 `intuition`；其余现有类型保留，推导正文继续默认展开。
- [x] 把 `renderChapter` 里已有的目标 section 提取为 `objectivesHtml` 常量。章首 header 后不再先输出 objectives/formulaIndex；按以下完整映射生成正文：

```js
const lessonHtml = sections.map(section => {
  const html = renderSection(section, chapter.id, completed, markdownOptions);
  if (section.id === "intuition") return html + objectivesHtml;
  if (section.type === "roadmap") return html + formulaIndex;
  return html;
}).join("");
```

这里 `sections`、`completed`、`markdownOptions`、`renderSection` 均为现有实现，`objectivesHtml` 逐字复用原目标模板。最终 `<div class="lesson-sections">` 消费 `lessonHtml`；不再在其前输出两份目标或索引。

- [x] 将现有 formulaIndex 外层由 nav 改为带相同类名的 details：

```js
`<details class="formula-index" ${mode === "interview" ? "open" : ""}>` +
`<summary>本章公式与白板练习</summary>` +
/* 保留现有解释段、完整主题链接、白板入口和两个展开按钮的模板内容 */
`</details>`
```

上面的保留项是现有 `formulaIndex` 内部模板，不新增第二套列表。原 h2 替换为 summary，不同时保留两个标题。

- [x] 对 summary 增加明确可点击样式；将 `.lesson-sections` 内的 `.chapter-objectives` 和 `.formula-index` 顶部 margin 归零，以 grid gap 控制间距。宽公式仍在自身容器滚动，检查新首屏高度。
- [x] 内容校验和课程测试由“第 1 节 roadmap”更新为实际 `["intuition","example","roadmap"]`，保留 roadmap、独立推导、白板、来源、旧 ID 和进度断言。
- [x] 新增渲染行为测试：开场先于 objectives、例子先于 formulaIndex；学习模式索引不 open、面试模式 open；两模式的公式正文均 open。测试使用已有章节或完整 fixture，不依赖固定总字数。

## Task 3：整合 37 份原文阅读说明

**Files:** `docs/research/source-reading-2026-09-30.md`, `README.md`。

- [x] 主代理读取各组记录，按 `SOURCE_DOCUMENTS` 的完整路径集合逐篇形成 37 行或 37 个短小节。每份必须给出原文小节、实际论点、课程 section ID、吸收与纠正；索引类记录说明组织作用。
- [x] 对关键说法直接回读原文件，不以代理摘要替代不确定事实。明确 00–15 的基础补充与后半综述改编范围。
- [x] 保留固定 SHA 和既有一手核验记录；源文观点不直接升格为事实，未披露参数不补造，未采用内容如实解释。
- [x] README 加阅读说明链接并更新新顺序。页面原有来源链接保持可用，来源说明不挤占开场。

## Task 4：连贯性与最终验收

**Files:** `scripts/audit-browser.mjs`, `scripts/audit-interactions.mjs`,
`artifacts/narrative-*`, `docs/research/narrative-acceptance.md`。

- [x] 主代理逐章检查所有推导的第一段和结尾，精读 00/02/04/09/16/17/19/25 的连续教学链；有突兀处直接修订，记录具体前后变化。
- [x] 运行 `npm test`、`npm run validate`、`node scripts/check-math-rendering.mjs`、`python3 scripts/check-interview-math.py`。只有出现错误或后续相关修改才重跑对应检查。
- [x] 浏览器脚本使用本轮命名 session 和 `narrative-*` 产物；动态数量依旧来自 catalog/visibleSections。新增观察学习模式索引默认折叠、面试模式保留开场。
- [x] 三宽度两模式全章检查，实际点击新索引 summary、主题链接、白板、模式、搜索和完成；旧的原生点击必须确认目标未被顶栏遮挡。
- [x] 截图包含 00 章真实首屏、一个公式从问题到结果的连续片段、后训练原理及手机开场。检查图片，不只看自动报告。
- [x] 完成验收记录、勾选计划、最终 diff 与本地提交。不新增发布或外部同步。

## Self-review

方案保持用户要求的完整数学内容；核心变化是叙事而非计数。旧 ID 和存储迁移不变，第一节契约与 UI/测试一起更新。来源记录与实际内容位置互相验证。无待用户决定的实现选项，继续实施。

执行结果见 [叙事验收记录](../../research/narrative-acceptance.md)。00 的代码与岗位路线已进一步移到回访推导前，四条来源锚点随全景段落移至 `00/diagram`。全部原推导公式、ID、题目与来源 URL 保留；37 项测试、五组数值程序和三宽度两模式浏览器验收通过。

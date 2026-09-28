# Interview mathematics implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 30 章课程改为能按知识依赖学习、现场写公式并完成推导追问的面试教材。

**Architecture:** 原章节保留 ID 并就地扩写，多个数学主题是独立 section。路线数据只引用章内 section，不引入第二套内容源；renderer/app 统一消费目录。旧进度继续按 ID 恢复。

**Tech Stack:** 原生 JavaScript ES modules、离线 KaTeX、Node test runner、Python 数值检查、agent-browser。

---

本次依据用户明确修订要求直接执行。当前已在独立功能分支 `feat/beginner-roadmap`，工作区干净；不再另建无法直接被当前本地服务器读取的 checkout。已加载 executing-plans；其推荐的 subagent-driven-development 未安装，使用可用原生 agents 分工并由主代理整合、复核。

### Task 1：章节正文

**Files:** `content/chapter-00.js` 至 `content/chapter-29.js`；每组另写 `docs/research/interview-audit-<range>.md`。

- [x] 分为 00–04、05–12、13–19、20–24、25–29 五个互不重叠范围，逐章读取并按设计表修订。每篇至少新增路线和三道白板题；原推导不够时必须增加独立主题，而非缩写成公式列表。
- [x] 使用下面的固定数据契约；所有 links 指向最终章内 ID：

```js
{
  id: "roadmap", type: "roadmap", title: "知识路线与面试要求",
  body: String.raw`先修能力、概念依赖和本章核心问题的完整说明。`,
  links: [
    { label: "定义与目标", sectionId: "derivation", level: "必会" },
    { label: "梯度推导", sectionId: "math-gradient", level: "推导" },
    { label: "闭卷检验", sectionId: "whiteboard", level: "必会" }
  ]
}
```

```js
{
  id: "whiteboard", type: "quiz", title: "白板练习：推导、手算与追问",
  body: "先在纸上作答，再核对推导与得分点。",
  questions: [
    { q: "本章的具体推导题", a: String.raw`逐步数学解答以及 **得分点**。` },
    { q: "本章带完整已知条件的数字题", a: String.raw`代入、计算、解释及 **得分点**。` },
    { q: "本章的反例或边界追问", a: String.raw`成立条件、反例及 **得分点**。` }
  ]
}
```

- [x] 每组核对原 source-manifest 锚点，保留证据和已核验的先进算法定义。审查记录必须列出真实新 section IDs、独立算例计算结果和边界，不以字数验收。
- [x] 逐个运行 `node --check content/chapter-XX.js`，并导入核对唯一 ID、路线目标、公式闭合和题目字段。

### Task 2：数学与面试呈现

**Files:** `app/renderer.js`、`app/app.js`、`app/styles.css`、`content/schema.js`、`scripts/validate-content.mjs`。

- [x] 将 `roadmap` 加入教学契约并验证 links 目标；移除“恰好九节”的限制。允许同类型不同 ID 的独立推导。
- [x] 面试可见类型为：

```js
new Set(["roadmap", "example", "derivation", "pitfall", "comparison", "interview", "quiz"])
```

- [x] 推导输出 `<details class="derivation-disclosure" open>`；summary 用“公式与逐步推导”。章首从 derivation 小节生成带 hash 的主题索引、白板入口与 `data-action="set-derivations"` 的展开/收起按钮。
- [x] 路线 links 生成真实 `#chapterId/sectionId` 链接；正文和目录显示中文类型名。章节跳转命中推导时自动展开目标。
- [x] 搜索保留章目录行为，并新增具体小节匹配结果，点击命中例子、公式或答案的小节时可以直接定位；面试模式命中不可见小节时切换回学习模式。
- [x] 修改样式使移动端按钮换行、数学/表格容器滚动、正文不溢出，公式索引在两种模式可见。

### Task 3：有意义的验证

**Files:** `tests/renderer.test.mjs`、`tests/source-manifest.test.mjs`、`tests/interview-curriculum.test.mjs`、`scripts/check-interview-math.py`、`scripts/check-math-rendering.mjs`。

- [x] 用行为测试确认面试模式包含例子/推导、推导默认展开、原自测仍折叠、路线链接存在；拒绝无效路线引用和无得分点的白板题。
- [x] 课程测试逐章查路线、独立推导、题目及前置顺序，同时保留 37 份来源覆盖测试；删除固定 270 的断言。
- [x] KaTeX 校验通过 renderer 提取全部 `data-math`，对正文和答案调用 `renderToString(...,{throwOnError:true})`。
- [x] 数值验证：softmax CE、逻辑回归、LayerNorm/RMSNorm、LoRA 初始梯度、Attention 反传、DPO 和蒸馏 KL 用有限差分；Bayes、ridge、CNN 形状、KV、pass@k、GRPO/RLOO、GAE、shaping、IS/ESS 用独立算例，依据实际新正文数值对齐。
- [x] 执行 `npm test`、`npm run validate`、`node scripts/check-math-rendering.mjs`、`python3 scripts/check-interview-math.py`，所有检查必须通过。

### Task 4：浏览器与交付

**Files:** `README.md`、`artifacts/interview-*`、`docs/research/interview-acceptance.md`。

- [x] 使用命名 session，在 1440、1024、390 三宽度检查所有章节两种模式的公式错误、正文溢出和目录完整；截图至少展示传统 ML 梯度、Transformer 推导、后训练白板题。
- [x] 实际点击搜索结果、公式索引、白板入口、全收起/展开、完成、模式和主题；刷新验证旧完成记录和新 section 进度。
- [x] README 更新为真实完成的知识范围和操作方式；验收记录报告观察结果，不将公式计数等同于面试保证。
- [x] 对照 30 行覆盖表复核全部要求，完成最终 diff 检查与本地提交；不推送、不发布。

最终交付：30 章、439 小节、139 个推导主题、122 道白板题。36 项测试、五组数值检查、4,249 处公式解析和三宽度两模式浏览器验收通过。额外补齐 Lasso、朴素 Bayes、kNN、AdaBoost。完整结果见 `docs/research/interview-acceptance.md`。

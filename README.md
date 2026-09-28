# ML Roadmap

一个从零基础机器学习延伸到 LLM 后训练与 Agentic RL 的中文面试学习工作台。项目包含 30 章，按知识点组织公式、逐步推导、手算和白板追问，不依赖前端框架或构建工具，KaTeX 与字体均保存在仓库内。

## 开始使用

无需安装 npm 依赖。Node.js 用于测试和内容校验，Python 用于启动静态服务器。

```bash
cd /Users/bytedance/Desktop/面试/ml-roadmap
npm test
npm run validate
node scripts/check-math-rendering.mjs
python3 scripts/check-interview-math.py
python3 -m http.server 8010
```

然后打开 [http://127.0.0.1:8010/](http://127.0.0.1:8010/)。

不要直接双击 `index.html`：浏览器通常会阻止 `file://` 页面加载 ES modules。

## 内容范围

课程按依赖关系组织为七个阶段：

| 范围 | 主题 |
| --- | --- |
| 00 | 学习地图 |
| 01-04 | 张量反传、矩阵求导、SVD/PCA、MLE/MAP、回归与 L1/L2、朴素 Bayes、kNN、SVM、树与 Boosting、聚类、评估 |
| 05-07 | 神经网络、反向传播、优化器、CNN、RNN 与 LSTM |
| 08-12 | Tokenization、Transformer、现代 LLM 组件、训练与推理系统、PEFT |
| 13-15 | MDP、价值方法、策略梯度、Actor-Critic 与 GAE |
| 16-24 | RLHF、GRPO/DAPO、DPO、OPD/OPSD、VAPO/CISPO/GSPO/SAPO、数据工程、工业案例与选型 |
| 25-29 | Agentic RL 基础、奖励稳定性、探索与信用分配、环境/异步系统、全景与综合面试 |

每章从知识路线开始，列出依赖和面试要求；随后有直觉、例子、机制、分主题数学推导、代码、误区、对比和问答，最后用基础自测与白板题检查理解。公式解释符号与维度，推导说明假设，白板题提供计算过程和得分点。

第 19 章讲 OPD、OPSD 与跨阶段蒸馏，第 24、29 章分别汇总后训练和 Agentic RL 的选型与面试。零基础读者按 00–29 学习；已有 Transformer 基础可从 13 章进入后训练；Agent 方向在 13、15、17、21 章基础上进入 25–29。

面试复习时先在章首选择一个公式主题，遮住正文写定义、目标和推导，再进入“白板练习”作答。能口述但不能独立写出中间步骤的知识点，应回到对应推导重新计算。第 00 章给出按岗位和知识依赖安排的复习路线。

本轮逐章覆盖、数值例题与实际浏览器结果见 [面试数学验收记录](docs/research/interview-acceptance.md)。

## 来源与改编

本轮完整学习并重新组织 [Xavier 的 LLM Post-Training 与 Agentic RL 研究](https://github.com/XavierZhang2002/agentic-rl-analysis) 的 37 份 Markdown，固定提交为 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`。感谢 Xavier / Agentic RL Analysis Contributors。

[来源映射](content/source-manifest.js) 逐篇记录目标章节和正文位置，[原文快照索引](docs/research/source-inventory.json) 保留文件 SHA-256 与标题。每章末尾“本章扩展阅读”可打开相应源文档。原论文定义、报告结果、教学例子与作者观点分开说明；纠错证据保存在 [research](docs/research/) 中。MIT 许可说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

来源固定于上述提交，原始论文核验截至 2026-09-27；个别后续官方报告用于纠正源文档已经过时的披露状态。这些记录不是模型实验复现，也不以不同报告的分数构造跨模型优劣排名。

## 学习功能

- 学习模式显示全部内容；面试模式保留知识路线、手算例子、全部公式推导、误区、对比、问答与练习。
- 章首公式索引直接跳转到数学主题，提供白板练习入口和全部推导展开/收起按钮。
- 左侧课程目录支持标题、标签、摘要、正文和题目的全文搜索，匹配结果可直达具体小节。
- 每节可以独立标记完成，总进度和章节进度保存在 `localStorage`。
- URL hash 保存当前章节与小节，刷新后可恢复当前位置。
- 公式推导默认展开，自测和白板答案默认折叠，代码块可以一键复制。
- 术语首次出现时提供悬停或键盘聚焦释义。
- 桌面使用三栏布局，平板使用两栏布局，手机使用课程与本章双抽屉。
- 浅色和深色主题均保存在本地。

## 离线边界

应用运行所需的 HTML、CSS、JavaScript、课程数据、KaTeX 和字体全部位于本仓库。启动本地静态服务器后，即使断网也可以阅读正文、渲染公式、搜索并记录进度。

章节末尾的“来源与证据”链接指向论文、教材或官方资料；只有主动打开这些外部来源时才需要网络。

## 目录职责

```text
ml-roadmap/
├── index.html                 # 可访问的应用壳
├── app/
│   ├── app.js                 # 路由、搜索、事件与界面编排
│   ├── renderer.js            # Markdown-lite、公式、图示与章节渲染
│   ├── store.js               # 进度、模式、主题与持久化
│   ├── glossary.js            # 首次出现术语的简明定义
│   └── styles.css             # 响应式视觉系统
├── content/
│   ├── schema.js              # 章节数据契约
│   ├── catalog.js             # 有序章节目录
│   ├── source-manifest.js      # 37 份源文档到正文的覆盖关系
│   ├── source-revision.js      # 固定提交与源文件哈希
│   └── chapter-00.js ... chapter-29.js
├── vendor/katex/              # 本地公式运行库、样式与字体
├── scripts/validate-content.mjs
├── tests/
├── artifacts/                 # 浏览器验收截图
└── docs/                     # superpowers 设计/计划；research 核验记录
```

模块边界是单向的：`catalog` 提供内容，`renderer` 生成安全 HTML，`app` 负责交互，`store` 负责状态。课程正文不写进控制器，状态模块也不接触 DOM。

## 修改或新增章节

1. 复制一个 `content/chapter-XX.js`，填写新的唯一 `id`、`slug`、元数据、正文和来源。
2. 第一节是 `roadmap`，保留九种原教学形式：`intuition`、`example`、`diagram`、`derivation`、`code`、`pitfall`、`comparison`、`interview`、`quiz`。同一形式可按知识点拆成多个独立 section。
3. 保证 section ID 在章内唯一，至少一个新增数学主题使用 `math-` 前缀；`roadmap.links` 的 `sectionId` 指向真实小节，`level` 为“必会”“推导”或“进阶”。`whiteboard` 使用 `quiz` 类型，至少三题，答案包含完整过程与“得分点”。来源使用绝对 HTTP(S) URL。
4. 在 `content/catalog.js` 中按学习顺序导入并加入章节。
5. 若扩展当前 00-29 的固定课程规模，同步调整 `scripts/validate-content.mjs` 和目录测试中的预期 ID 序列；目录标题与进度总数从 catalog 自动计算。
6. 运行 `npm test`、`npm run validate`、全部 KaTeX 解析和 Python 数值校验，再运行 `node scripts/audit-browser.mjs` 与 `node scripts/audit-interactions.mjs` 检查浏览器。

`npm run validate` 会拒绝缺少教学层、断裂的知识路线、缺少白板题、前置章节失效或后置、重复 ID、占位标记、来源映射缺失和正文锚点失效。KaTeX 校验检查公式能否解析；独立数值程序检查梯度、概率、形状和预算算例；教学与原论文的对应见 `docs/research/interview-audit-*.md`。这些检查各有目的，公式数量本身不是质量证明。

## 状态与重置

本地状态使用键 `ml-roadmap-state-v2`。首次打开自动从 v1 迁移 00–19 章完成记录、模式与主题；旧第 20 章更换了主题，其完成标记会清除。原综合选型内容移至第 24 章，旧 slug 链接仍能定位该内容。v1 原始数据保留作备份，已有 v2 状态时不会重复迁移。

本轮保留已有 v2 小节 ID 和完成记录，新增公式主题与白板题默认未完成。因此总进度百分比可能降低，原有记录不会丢失。

需要彻底重置时，在浏览器开发者工具中同时删除 `ml-roadmap-state-v2` 和 `ml-roadmap-state-v1` 后刷新。只删除 v2 会再次从 v1 备份迁移。Storage API 不可用时退化为当前页面会话内的内存状态。

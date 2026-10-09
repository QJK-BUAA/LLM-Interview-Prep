# ML Roadmap

一个从零基础机器学习延伸到 LLM 后训练与 Agentic RL 的中文面试学习工作台。项目包含 31 章，先用问题、例子和文字要点建立理解，再按需展开公式、手算和证明。不依赖前端框架或构建工具，KaTeX 与字体均保存在仓库内。

## 开始使用

无需安装 npm 依赖。Node.js 用于测试和内容校验，Python 用于启动静态服务器。

```bash
cd /Users/bytedance/Desktop/面试/ml-roadmap
npm test
npm run validate
node scripts/check-math-rendering.mjs
python3 scripts/check-interview-math.py
python3 scripts/check-comprehensive-math.py
python3 -m http.server 8010
```

然后打开 [http://127.0.0.1:8010/](http://127.0.0.1:8010/)。

不要直接双击 `index.html`：浏览器通常会阻止 `file://` 页面加载 ES modules。

## 内容范围

课程按依赖关系组织为七个阶段：

| 范围 | 主题 |
| --- | --- |
| 00 | 从预测分数开始：输入、参数、误差、训练与验证 |
| 01-04 | 张量反传、矩阵求导、SVD/PCA、MLE/MAP、回归与 L1/L2、朴素 Bayes、kNN、SVM、树与 Boosting、聚类、评估 |
| 05-07 | 神经网络、反向传播、优化器、CNN、RNN 与 LSTM |
| 08-12 | Tokenization、Transformer、现代 LLM 组件、训练与推理系统、PEFT |
| 13-15 | MDP、价值方法、策略梯度、Actor-Critic 与 GAE |
| 30 | 监督微调（SFT）：token 级 CE、mask、chat template、packing 与完成判据 |
| 16-24 | RLHF、GRPO/DAPO、DPO、OPD/OPSD、VAPO/CISPO/GSPO/SAPO、数据工程、工业案例与选型 |
| 25-29 | Agentic RL 基础、奖励稳定性、探索与信用分配、环境/异步系统、全景与综合面试 |

每章先提出一个具体问题，再用小例子解释输入、选择和结果，随后说明学习路线。推导从待解决的计算问题进入，逐步引入符号、假设和公式，最后解释计算结果；机制图、代码、误区、对比和问答帮助连接不同表达，基础自测与白板题提供完整过程和得分点。

第 19 章讲 OPD、OPSD 与跨阶段蒸馏，第 24、29 章分别汇总后训练和 Agentic RL 的选型与面试。零基础读者按侧栏顺序读完 31 章；已具备 01–06、08–12 对应能力者可从 13 章进入后训练起点，经 30（SFT）进入 16–24 的 RLHF/DPO/数据/工业案例，Agent 方向继续走到 29。白板验收可免读已掌握部分，未通过则沿先修链接回补；完整路线和闭合的快捷路线见第 00 章。

课程包含 warmup/cosine、top-k/top-p、ALiBi/YaRN、投机解码专题，以及 Transformer 整网前向与 mask/loss 接口；第 30 章 SFT 显示在 15 和 16 之间。当前共 458 个小节、147 个推导专题、131 道白板题；SFT checkpoint 选择改用观察与处理对照，不再写成一个停止训练公式。逐章阅读与回访估计合计 84.75 小时，练习、编码和错题重做另计，首轮不要求读完全部推导。推荐系统召回/CTR/序列推荐、RAG/reranker、完整 scaling-law 实验、视觉/语音/扩散、GNN 与因果推断等属于后续岗位专项。

面试复习时可在学习路线之后的公式索引选择主题，遮住正文写定义、目标和推导，再进入“白板练习”作答。第 00 章初读先完成预测和误差例子；总体风险、似然和奖励专题注明后续回访章节，学过求导、概率和策略梯度后再串联这些目标。

阅读层次、密集段落与 SFT 纠错见 [学习可读性修订记录](docs/research/readability-2026-10-08.md)。此前逐章审查见 [全内容检查报告](docs/research/comprehensive-audit-2026-10-07.md)，正文连贯性与页面验收见 [叙事修订验收记录](docs/research/narrative-acceptance.md)，早期数学补充见 [面试数学验收记录](docs/research/interview-acceptance.md)。

## 来源与改编

课程对照 [Xavier 的 LLM Post-Training 与 Agentic RL 研究](https://github.com/XavierZhang2002/agentic-rl-analysis) 的 37 份 Markdown，固定提交为 `66ae4423b36270ef50a288fb1bb2e1b31c46c329`。第 16–29 章的组织与方法综述主要参考这两份报告；第 00–15 章大部分数学、经典 ML、神经网络与 RL 基础是课程补充，并非来自该仓库。感谢 Xavier / Agentic RL Analysis Contributors。

[逐篇阅读与改编说明](docs/research/source-reading-2026-09-30.md) 记录原文具体小节、实质论点、吸收位置，以及补充、纠正和未采用的内容。[来源映射](content/source-manifest.js) 和 [原文快照索引](docs/research/source-inventory.json) 保存可检查的正文锚点与 SHA-256；它们证明版本和覆盖，阅读说明进一步交代改编取舍。每章末尾“本章扩展阅读”可打开原文。原论文定义、报告结果、教学例子与作者观点分开说明；纠错证据保存在 [research](docs/research/) 中。MIT 许可说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

来源固定于上述提交。2026-10-07 再次完整阅读 37 份综述，并按确认问题定向复读原论文方法；具体版本、章节和未读范围见本轮五批审查记录。个别后续官方报告用于纠正源文档已经过时的披露状态。这些记录不是模型实验复现，也不以不同报告的分数构造跨模型优劣排名。

## 学习功能

- 全站采用单一阅读形态：要点与例子始终可见，详细公式、手算与证明默认收起，可按需展开或一次性全部展开；图解与代码不受折叠影响。
- 每章“第一遍怎样学”说明首轮目标、完成判断与回访顺序；147 个推导各有独立的文字要点，折叠后仍可阅读。
- 路线后的公式索引可直接跳到数学主题和白板练习，提供全部推导展开/收起按钮，索引本身默认收起。
- 左侧课程目录支持标题、标签、摘要、正文、题目与阅读要点的全文搜索，匹配结果可直达具体小节并展开推导。
- 每节可以独立标记完成，总进度和章节进度保存在 `localStorage`。
- URL hash 保存当前章节与小节，刷新后可恢复当前位置。
- 自测和白板答案默认折叠，代码块可以一键复制；已有完成记录不变。
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
│   ├── reading-guides.js      # 各章首轮目标与每个推导的文字要点
│   ├── source-manifest.js      # 37 份源文档到正文的覆盖关系
│   ├── source-revision.js      # 固定提交与源文件哈希
│   └── chapter-00.js ... chapter-30.js
├── vendor/katex/              # 本地公式运行库、样式与字体
├── scripts/validate-content.mjs
├── tests/
├── artifacts/                 # 浏览器验收截图
└── docs/                     # superpowers 设计/计划；research 核验记录
```

模块边界是单向的：`catalog` 提供内容，`renderer` 生成安全 HTML，`app` 负责交互，`store` 负责状态。课程正文不写进控制器，状态模块也不接触 DOM。

## 修改或新增章节

1. 复制一个 `content/chapter-XX.js`，填写新的唯一 `id`、`slug`、元数据、正文和来源。
2. 前三节依次是 `intuition`、`example`、`roadmap`，先讲问题和例子再引入路线；保留 `diagram`、`derivation`、`code`、`pitfall`、`comparison`、`interview`、`quiz`。同一形式可按知识点拆成多个独立 section。开场和推导先用文字说明具体任务，再引入数学符号。
3. 保证 section ID 在章内唯一，至少一个新增数学主题使用 `math-` 前缀；`roadmap.links` 的 `sectionId` 指向真实小节，`level` 为“必会”“推导”或“进阶”。`whiteboard` 使用 `quiz` 类型，至少三题，答案包含完整过程与“得分点”。来源使用绝对 HTTP(S) URL。
4. 在 `content/catalog.js` 中按学习顺序导入并加入章节，在 `content/reading-guides.js` 中补齐首轮目标、完成判断、重点链接、回访建议与每个推导的具体要点。
5. 若扩展当前 00-30 的固定课程规模，同步调整 `scripts/validate-content.mjs` 的 ID 集合与 `tests/source-manifest.test.mjs` 的章节总数；章节 ID 保留追加时的两位数，显示顺序由 `content/catalog.js` 的数组位置决定，可按依赖关系插入新章而不动旧 ID。目录标题与进度总数从 catalog 自动计算。
6. 运行 `npm test`、`npm run validate`、全部 KaTeX 解析和 Python 数值校验，再运行 `node scripts/audit-browser.mjs` 与 `node scripts/audit-interactions.mjs` 检查浏览器。

实际正文代码的回归为 `python3 scripts/check-lesson-code.py`，需本地安装 PyTorch，使用小型 CPU 张量验证 09 的完整前向、19 的聚合、27 的数值契约与 30 的 SFT mask/packing/shift。它不是阅读网页的运行依赖。浏览器验收依赖 `agent-browser` CLI；设置 `ROADMAP_AUDIT_PREFIX=readability` 可使用独立 session 和产物前缀，`ROADMAP_URL` 可指定服务地址。布局验收同时检查默认视图和展开后的全部内容。

`npm run validate` 会拒绝缺少教学层、阅读指引或推导要点，断裂的知识路线、缺少白板题、前置章节失效或后置、重复 ID、占位标记、来源映射缺失和正文锚点失效。KaTeX 校验检查公式能否解析；独立数值程序检查梯度、概率、形状和预算算例；教学与原论文的对应见 `docs/research/interview-audit-*.md`。这些检查各有目的，公式数量本身不是质量证明。

## 状态与重置

本地状态使用键 `ml-roadmap-state-v2`。首次打开自动从 v1 迁移 00–19 章完成记录、模式与主题；旧第 20 章更换了主题，其完成标记会清除。原综合选型内容移至第 24 章，旧 slug 链接仍能定位该内容。v1 原始数据保留作备份，已有 v2 状态时不会重复迁移。

本轮保留全部旧 v2 小节 ID 及完成记录。原 00–29 共 439 个小节的进度分母，经补齐数学专题变为 443；再追加第 30 章 SFT 后，分母变为 458，题库增至 131 道白板。旧完成项仍完成，新增章节与小节按原规则等待学习与标记；无需清空进度。

需要彻底重置时，在浏览器开发者工具中同时删除 `ml-roadmap-state-v2` 和 `ml-roadmap-state-v1` 后刷新。只删除 v2 会再次从 v1 备份迁移。Storage API 不可用时退化为当前页面会话内的内存状态。

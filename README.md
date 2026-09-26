# ML Roadmap

一个从零基础机器学习延伸到 2026 年 LLM 后训练的中文学习工作台。项目包含 21 章重新编写的课程正文，不依赖前端框架或构建工具，KaTeX 与字体均保存在仓库内。

## 开始使用

无需安装 npm 依赖。Node.js 用于测试和内容校验，Python 用于启动静态服务器。

```bash
cd /Users/bytedance/Desktop/面试/ml-roadmap
npm test
npm run validate
python3 -m http.server 8010
```

然后打开 [http://127.0.0.1:8010/](http://127.0.0.1:8010/)。

不要直接双击 `index.html`：浏览器通常会阻止 `file://` 页面加载 ES modules。

## 内容范围

课程按依赖关系组织为六个阶段：

| 范围 | 主题 |
| --- | --- |
| 00 | 学习地图 |
| 01-04 | Python、张量、数学、概率、机器学习流程与评估 |
| 05-07 | 神经网络、反向传播、优化器、CNN、RNN 与 LSTM |
| 08-12 | Tokenization、Transformer、现代 LLM 组件、训练与推理系统、PEFT |
| 13-15 | MDP、价值方法、策略梯度、Actor-Critic 与 GAE |
| 16-20 | RLHF、PPO、GRPO、RLVR、DPO、OPD、OPSD 与 2026 前沿 |

每章都包含直觉、可手算例子、机制图、公式拆解、代码实验、常见误区、方法对比、面试表达和至少三道自测题。第 19 章完整讲解 OPD 与 OPSD，第 20 章用于方法选择和综合面试复习。

## 学习功能

- 学习模式显示完整的九层教学内容，面试模式聚焦误区、对比、问答和自测。
- 左侧课程目录支持标题、标签、摘要、正文和题目的全文搜索。
- 每节可以独立标记完成，总进度和章节进度保存在 `localStorage`。
- URL hash 保存当前章节与小节，刷新后可恢复当前位置。
- 公式推导与自测答案默认折叠，代码块可以一键复制。
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
│   └── chapter-00.js ... chapter-20.js
├── vendor/katex/              # 本地公式运行库、样式与字体
├── scripts/validate-content.mjs
├── tests/
├── artifacts/                 # 浏览器验收截图
└── docs/superpowers/          # 设计文档与实施计划
```

模块边界是单向的：`catalog` 提供内容，`renderer` 生成安全 HTML，`app` 负责交互，`store` 负责状态。课程正文不写进控制器，状态模块也不接触 DOM。

## 修改或新增章节

1. 复制一个 `content/chapter-XX.js`，填写新的唯一 `id`、`slug`、元数据、正文和来源。
2. 保留九种必需 section：`intuition`、`example`、`diagram`、`derivation`、`code`、`pitfall`、`comparison`、`interview`、`quiz`。
3. 保证 section ID 在章内唯一，自测不少于三题，来源使用绝对 HTTP(S) URL。
4. 在 `content/catalog.js` 中按学习顺序导入并加入章节。
5. 若扩展当前 00-20 的固定课程规模，同步调整 `scripts/validate-content.mjs` 中的预期 ID 序列。
6. 运行 `npm test` 和 `npm run validate`，再在浏览器中检查路由、公式、搜索和响应式布局。

`npm run validate` 会拒绝缺少教学层、前置章节失效、重复 ID、占位标记或正文不足 1,800 个中文字符的章节。

## 状态与重置

本地状态使用键 `ml-roadmap-state-v1`。需要重置学习进度时，可在浏览器开发者工具中删除该键并刷新页面。应用在 Storage API 不可用时会自动退化为当前页面会话内的内存状态。

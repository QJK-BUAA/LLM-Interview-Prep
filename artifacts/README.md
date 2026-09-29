# 验收产物索引

当前版本的开场、公式上下文和阅读顺序修订见
[叙事修订验收记录](../docs/research/narrative-acceptance.md)。
本轮产物使用 `narrative-*` 前缀，包含真实章首截图、两模式布局报告和原生交互记录。
上一轮数学补充见 [面试数学验收记录](../docs/research/interview-acceptance.md)。
下文保留 2026-09-27 的历史整合快照，其数量和截图不代表当前页面顺序。

## 2026-09-30 叙事修订

- 首屏：[桌面](narrative-opening-1440x1000.png)、[平板](narrative-opening-1024x900.png)、[手机](narrative-opening-390x844.png)。
- 连续推导：[风险与一次更新](narrative-formula-risk.png)、[蒸馏 KL 梯度](narrative-formula-distillation.png)。
- [内容保留与路线](narrative-content-review.json)、[三宽度两模式布局](narrative-layout-audit.json)、[原生交互](narrative-interaction-audit.json)。
- [37 项测试](narrative-tests.log)、[内容与来源校验](narrative-validation.log)、[公式解析](narrative-math-rendering.log)、[五组数值检查](narrative-numerical.log)。

截图已实际查看，完整判断、修订示例与证据边界见本轮验收记录。

## 2026-09-27 整合验收

验收日期：2026-09-27。所有结果来自当前本地 `ml-roadmap`，不代表论文训练复现。

| 规格要求 | 当前证据 |
| --- | --- |
| 30 章，00–29 连续先修 | `content-audit.json`：30 章、7 个 Part、270 个教学区块 |
| 新手教学层与自测 | 全部章节有九层教学；正文共 81,268 汉字，138 道自测 |
| 全部 37 份源文档 | source inventory 与获批规格路径集合一致；manifest 含 61 个实际正文锚点 |
| 事实校正 | `docs/research/` 的四份专项账本与主集成记录；公式、模型结果、观点分开呈现 |
| 新章代码可运行 | `examples-and-search.json`：20–29 章的 10 段 Python 代码执行成功 |
| 新方法可搜索 | 同文件：18 个关键算法／模型／系统词都有结果 |
| 存储与渲染回归 | `npm test`：29/29；含 v1→v2、20/29 新进度、坏数据回退与真实分支边 |
| 内容门禁 | `npm run validate`：30/270、无重复、无无效先修、37 份来源锚点通过 |
| 三档全章布局 | `browser-layout-audit.json`：1440×1000、900×900、390×844，各 30/30 通过 |
| 展开内容 | 布局检查先展开全部公式推导、自测答案和扩展阅读；每档 1,083 处公式无 fallback |
| 实际交互 | `browser-interaction-audit.json`：三档视口全部通过原生点击、输入、滚动和刷新 |
| 本地 HTTP 资源 | `http-audit.json`：62/62 返回 200，覆盖所有章节、应用脚本、KaTeX 与字体 |
| 错误与资源 | 浏览器控制台零错误、无失败资源；报告保留请求状态，未包含鉴权数据 |
| 旧项目保留 | `ml-notes` 42 个文件最新 mtime 仍为 2026-09-16，规格提交后修改数为 0 |

实际交互包含：默认第 00 章、30 章标签、旧进度迁移、EMPO² 搜索进入 27、
学习／面试模式、目录跳转、推导展开、保留展开状态的完成操作、刷新后完成状态、
复制 API 成功提示、答案展开、主题持久化、课程和本章抽屉关闭、非法 hash 回退。

复制的验收依据是原生按钮触发 Clipboard 写入成功及产品反馈，不读取用户系统剪贴板。
全部自动化使用独立命名浏览器会话；迁移测试数据不写入用户已有浏览器。

## 已人工检查的截图

- [桌面 1440×1000](integration-1440x1000.png)
- [平板 900×900](integration-900x900.png)
- [手机 390×844](integration-390x844.png)
- [桌面分支图](integration-desktop-diagram.png)
- [手机公式推导](integration-mobile-derivation.png)

手机中的宽公式、表格、代码块在各自容器内横向滚动；页面整体无横向溢出。
新分支图按原始 links 显示每条边，避免将并行分支和反馈回路画成线性流水线。

## 可重复运行

保持本地 HTTP 服务运行，并已安装 `agent-browser`：

```bash
npm test
npm run validate
node scripts/audit-browser.mjs
node scripts/audit-interactions.mjs
```

冻结来源可从匹配提交的检出重建：

```bash
node scripts/snapshot-sources.mjs /tmp/agentic-rl-analysis-66ae4423
```

旧的 `desktop-1440x1000.png`、`mobile-390x844.png` 是此前 21 章版本截图，
不作为本次 30 章验收证据。

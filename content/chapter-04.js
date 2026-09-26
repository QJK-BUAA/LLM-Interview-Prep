const chapter = {
  id: "04",
  slug: "ml-workflow-evaluation",
  part: "数学与机器学习地基",
  title: "机器学习任务、训练流程与评估",
  subtitle: "先定义成功，再开始训练",
  level: "入门",
  duration: 85,
  prerequisites: ["03"],
  tags: ["监督学习", "数据划分", "指标", "泛化", "A/B 测试"],
  objectives: [
    "识别回归、分类、排序和生成任务",
    "正确划分训练集、验证集和测试集",
    "根据业务代价选择准确率、F1、AUC 或 PR 指标",
    "发现数据泄漏、分布漂移和离线在线不一致",
  ],
  summary:
    "可靠的机器学习从任务定义和数据边界开始；模型分数只有在数据无泄漏、指标匹配代价、比较协议一致时才有意义。",
  sections: [
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：训练像做练习，测试像闭卷考试",
      body: String.raw`机器学习项目最容易犯的错误，是先选一个流行模型，再寻找它能解决什么。正确顺序相反：先定义输入、输出、决策成本和成功标准，再选择数据、模型与指标。

训练集用于调整参数，验证集用于选择超参数、阈值和版本，测试集只在最终评估时使用。把测试集反复拿来调模型，就像提前看了考试题；即使没有直接训练参数，决策过程也已经从测试答案中获得信息。

“泛化”指模型在未见但来自目标分布的数据上仍表现良好。训练误差低只是必要条件，不是成功证明。若训练集与真实线上流量不同，模型可能在离线测试很好，部署后却失败。

不同任务的输出不同。回归预测连续值，分类选择类别，排序关心候选顺序，生成产生可变长度序列。相同数据可以形成不同任务，例如商品点击率既可做概率回归，也可在候选集上做排序；任务定义决定标签、损失和评估方式。`,
    },
    {
      id: "example",
      type: "example",
      title: "最小例子：准确率 99% 的模型为什么没用",
      body: String.raw`假设 10,000 笔交易中只有 100 笔欺诈。一个模型把所有交易都预测为正常，正确 9,900 笔，准确率达到 99%，但一笔欺诈也没抓到。

定义正类为欺诈。若另一个模型得到：真正例 TP=80，假正例 FP=120，假负例 FN=20，真负例 TN=9,780，则：

$$Precision=\frac{TP}{TP+FP}=\frac{80}{200}=0.4$$

$$Recall=\frac{TP}{TP+FN}=\frac{80}{100}=0.8$$

Precision 说“报警中有多少是真的”，Recall 说“真实欺诈中抓到了多少”。若漏掉欺诈代价更高，应优先保证 Recall；若每次人工复核很贵，则也要控制 Precision。

F1 是二者调和平均：

$$F1=\frac{2PR}{P+R}=\frac{2\times0.4\times0.8}{1.2}\approx0.533$$

这个例子说明指标不是越多越好，而要对应真实错误成本。上线前应把“漏报一次”和“误报一次”的代价写清楚。`,
    },
    {
      id: "diagram",
      type: "diagram",
      title: "从问题定义到线上监控",
      body: String.raw`一个可审计的项目应形成闭环：问题定义产生标签和指标；数据检查发现偏差与泄漏；训练只看训练集；验证负责选择；冻结方案后测试一次；上线后继续监控输入分布、预测质量和业务结果。

任何箭头都可能断裂。标签可能晚到，训练数据可能只覆盖活跃用户，离线特征可能在线不可获得，线上阈值可能与验证时不同。模型开发不是只完成中间的训练框。

LLM 评估尤其要区分能力与采样。pass@1 衡量一次回答成功率，pass@k 衡量给 k 次机会能否至少成功一次；温度和采样数量会改变结果。比较算法时必须固定模型、prompt、解码和评测器，否则差异无法归因。`,
      diagram: {
        kind: "flow",
        nodes: [
          "问题与代价",
          "数据与标签",
          "训练/验证",
          "冻结测试",
          "部署与监控",
        ],
        links: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
        ],
      },
    },
    {
      id: "derivation",
      type: "derivation",
      title: "从混淆矩阵到 ROC、PR 与校准",
      body: String.raw`二分类模型先输出分数，再由阈值转成类别。降低阈值通常同时增加真正例率和假正例率：

$$TPR=\frac{TP}{TP+FN},\qquad FPR=\frac{FP}{FP+TN}$$

ROC 曲线以 FPR 为横轴、TPR 为纵轴，AUC 可解释为随机抽取一个正样本和一个负样本时，正样本得分更高的概率。它衡量排序能力，不直接给出最佳阈值。

类别极不平衡时，大量 TN 会让 FPR 看起来很小。PR 曲线直接观察：

$$Precision=\frac{TP}{TP+FP},\qquad Recall=\frac{TP}{TP+FN}$$

因此更能暴露正类预测质量。指标选择仍取决于应用，不应机械规定“不平衡就只能用 PR”。

校准研究预测概率是否可信。把样本按置信度分桶，第 $m$ 桶平均置信度为 $conf(B_m)$，实际准确率为 $acc(B_m)$，期望校准误差可写为：

$$ECE=\sum_m\frac{|B_m|}{N}|acc(B_m)-conf(B_m)|$$

一个模型可以 AUC 很高但严重过度自信，因为排序正确不等于概率绝对值准确。`,
    },
    {
      id: "code",
      type: "code",
      title: "代码实验：从预测列表计算指标",
      body: String.raw`下面手算混淆矩阵，避免把库函数当成黑盒。改变 threshold，观察 Precision 与 Recall 如何此消彼长。

~~~python
labels = [1, 0, 1, 0, 0, 1, 0, 0]
scores = [0.9, 0.8, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1]
threshold = 0.5

predictions = [int(score >= threshold) for score in scores]
tp = sum(y == 1 and p == 1 for y, p in zip(labels, predictions))
fp = sum(y == 0 and p == 1 for y, p in zip(labels, predictions))
fn = sum(y == 1 and p == 0 for y, p in zip(labels, predictions))
tn = sum(y == 0 and p == 0 for y, p in zip(labels, predictions))

precision = tp / (tp + fp)
recall = tp / (tp + fn)
f1 = 2 * precision * recall / (precision + recall)
print({"tp": tp, "fp": fp, "fn": fn, "tn": tn})
print({"precision": precision, "recall": recall, "f1": f1})
~~~

生产代码还要处理分母为零、样本权重、多类别平均方式和置信区间。报告 macro-F1 或 micro-F1 时必须注明：macro 先按类别平均，给小类同等权重；micro 先汇总计数，更受大类影响。`,
    },
    {
      id: "pitfall",
      type: "pitfall",
      title: "常见误区：最危险的问题不会报错",
      body: String.raw`**数据泄漏**：把预测时不可获得的信息放入特征，例如用最终退款状态预测下单时欺诈；或先对全量数据标准化再切分，使测试分布参与均值计算。

**重复样本泄漏**：同一用户、病人或文档的近重复内容跨越训练与测试集。随机按行切分不能阻止实体信息泄漏，应按用户、时间或来源分组。

**调参污染测试集**：每次看测试结果后再改模型，相当于对测试集过拟合。应保留独立验证集，最终测试尽量只执行一次。

**只报告最好随机种子**：随机初始化和采样带来方差。应预先规定种子或报告多次运行的均值与区间。

**代理指标错配**：离线 reward model 分数上升，不等于用户体验提高；代码通过公开测试，不等于泛化到隐藏测试。需要针对奖励作弊设计审计集。

**忽略基线**：复杂模型提升 0.2%，若简单规则或上一个版本波动就有 0.5%，结论没有说服力。`,
    },
    {
      id: "comparison",
      type: "comparison",
      title: "指标选择速查",
      body: String.raw`| 任务特征 | 首要指标 | 必须补充 |
|---|---|---|
| 类别较均衡、错误代价接近 | Accuracy | 混淆矩阵 |
| 正类稀少、关心报警质量 | PR-AUC / Precision / Recall | 指定阈值与基线比例 |
| 关心整体排序 | ROC-AUC | 校准和业务阈值 |
| 概率用于后续决策 | Log loss / Brier / ECE | 可靠性图 |
| 排序列表 | NDCG / MRR / Recall@k | 候选集构造 |
| 开放生成 | 任务成功率、人工评审 | 解码设置、评审一致性 |
| 代码或数学推理 | pass@1、pass@k | 采样数、温度、验证器 |

离线评估回答“在这份固定数据和协议上怎样”，在线实验回答“真实系统中造成什么影响”。A/B 测试需要随机分流、互斥实验、预先定义主指标和观察窗口。大量同时检验会增加假阳性，应使用 Holm 等方法控制多重比较。

统计显著不等于业务显著。样本足够大时极小差异也可能显著；报告效应量和置信区间，才能判断收益是否值得部署成本。`,
    },
    {
      id: "interview",
      type: "interview",
      title: "面试表达：如何设计一个可靠实验",
      body: String.raw`**30 秒回答：**“我先定义线上决策与错误代价，再确定主指标和护栏指标。数据按真实部署边界切分，避免时间、用户和特征泄漏；所有调参只用训练与验证集。最终在冻结测试集比较强基线，报告多随机种子、效应量和置信区间，上线后再用 A/B 测试验证业务影响。” 

若追问类别不平衡，不能只答“用 F1”。先说明漏报和误报哪个更贵，再选择阈值与指标；PR 曲线通常比 ROC 更直观，但最终仍应落到业务成本。

若追问 LLM 评估，强调固定 prompt 模板、采样参数、最大长度、判题器版本和样本集合。对随机生成应报告重复采样；对同一批题比较两个模型，可使用配对检验，而不是把两组结果当独立样本。

若追问数据漂移，区分输入分布漂移、标签关系变化和用户行为反馈环。监控不仅看特征统计，还看校准、分群性能和延迟到达的真实标签。`,
    },
    {
      id: "quiz",
      type: "quiz",
      title: "自测：指标必须对应代价",
      body: "每题先说明业务假设，再给结论；没有上下文时不要机械选择指标。",
      questions: [
        {
          q: "正类只占 0.1% 时，为什么 99.9% accuracy 可能毫无意义？",
          a: "全预测为负类就能达到该准确率，却召回不到任何正类。需要查看混淆矩阵、Recall、Precision 和 PR 曲线。",
        },
        {
          q: "为什么按时间切分常比随机切分更接近线上部署？",
          a: "部署时通常用过去训练、预测未来。时间切分能暴露分布漂移，并避免未来信息通过近重复样本或聚合特征泄漏到训练集。",
        },
        {
          q: "AUC 很高是否说明模型输出的 0.9 可以解释为九成正确率？",
          a: "不能。AUC 衡量排序，概率解释需要校准检验；模型可能排序很好但整体过度自信或不够自信。",
        },
      ],
    },
  ],
  sources: [
    {
      label: "Scikit-learn Model Evaluation",
      url: "https://scikit-learn.org/stable/modules/model_evaluation.html",
      evidence: "官方文档",
    },
    {
      label: "Google Rules of ML",
      url: "https://developers.google.com/machine-learning/guides/rules-of-ml",
      evidence: "工程指南",
    },
    {
      label: "The Elements of Statistical Learning",
      url: "https://hastie.su.domains/ElemStatLearn/",
      evidence: "教材",
    },
  ],
};

export default chapter;

const chapter = {
  id: "04",
  slug: "ml-workflow-evaluation",
  part: "数学与机器学习地基",
  title: "经典机器学习：模型推导、训练与评估",
  subtitle: "从概率分类、邻近方法、间隔与集成到聚类、排序和泛化",
  level: "基础进阶",
  duration: 540,
  prerequisites: ["03"],
  tags: ["逻辑回归", "朴素Bayes", "kNN", "SVM", "决策树", "随机森林", "AdaBoost", "GBDT", "XGBoost", "K-means", "EM", "排序", "评估"],
  objectives: [
    "推导逻辑回归梯度、朴素 Bayes 后验与 SVM 对偶，解释 kNN 距离和维数灾难",
    "手算树的信息增益、随机森林方差、AdaBoost 权重、GBDT 残差和 XGBoost 叶值",
    "从目标函数推导 K-means 交替更新与 Gaussian mixture 的 EM",
    "按决策成本选择分类和排序指标，推导阈值及偏差方差分解",
    "在无数据泄漏的训练、验证、测试与线上协议下比较模型",
  ],
  summary:
    "经典模型不是名词清单：先从目标推梯度或交替更新，再用手算检验边界，最后在无泄漏且匹配决策成本的协议下比较泛化。",
  sections: [
    {
      id: "roadmap",
      type: "roadmap",
      title: "知识路线与面试要求",
      body: String.raw`先修第 02 章矩阵梯度、正定性和线性回归，以及第 03 章 Bernoulli 似然、Bayes、期望和 Jensen。若还不能写出 $X^\top(Xw-y)$ 的维度或区分后验与似然，应先回补对应小节。

建议分六次学习，每次约 90 分钟，总计约 540 分钟只是正文与首轮练习的预算，不代表一天就掌握所有算法。第一轮：数据边界 → 逻辑回归 → 朴素 Bayes，比较判别模型与生成模型。第二轮：kNN → SVM，比较局部距离与全局间隔。第三轮：树 → 随机森林/GBDT，比较独立集成与逐轮纠错。第四轮：AdaBoost → XGBoost，从指数损失和二阶近似分别推更新。第五轮：K-means → EM。第六轮：分类/排序指标 → 偏差方差，完成可靠实验设计。每轮都要做对应数字题，并在后续日期闭卷复测。

面试最低要求是能从目标写更新、解释凸性或局部最优、算一次小例子，并说明何种数据和成本下应换模型或指标。`,
      links: [
        { label: "逻辑回归梯度与 Hessian", sectionId: "math-logistic", level: "必会" },
        { label: "朴素 Bayes 与平滑", sectionId: "math-naive-bayes", level: "必会" },
        { label: "kNN、尺度与维度", sectionId: "math-knn", level: "必会" },
        { label: "SVM 对偶与核", sectionId: "math-svm", level: "推导" },
        { label: "树的分裂目标", sectionId: "math-tree", level: "必会" },
        { label: "随机森林与 GBDT", sectionId: "math-rf-gbdt", level: "必会" },
        { label: "AdaBoost 指数损失", sectionId: "math-adaboost", level: "推导" },
        { label: "XGBoost 叶权重", sectionId: "math-xgboost", level: "推导" },
        { label: "K-means", sectionId: "math-kmeans", level: "必会" },
        { label: "EM 与软分配", sectionId: "math-em", level: "推导" },
        { label: "分类与成本阈值", sectionId: "derivation", level: "必会" },
        { label: "排序目标与指标", sectionId: "math-ranking", level: "必会" },
        { label: "偏差方差与实验", sectionId: "math-bias-variance", level: "进阶" },
        { label: "闭卷验收", sectionId: "whiteboard", level: "必会" },
      ],
    },
    {
      id: "intuition",
      type: "intuition",
      title: "先建立直觉：训练像做练习，测试像闭卷考试",
      body: String.raw`机器学习项目最容易犯的错误，是先选一个流行模型，再寻找它能解决什么。正确顺序相反：先定义输入、输出、决策成本和成功标准，再选择数据、模型与指标。

训练集用于调整参数，验证集用于选择超参数、阈值和版本，测试集只在最终评估时使用。把测试集反复拿来调模型，就像提前看了考试题；即使没有直接训练参数，决策过程也已经从测试答案中获得信息。

“泛化”指模型在未见但来自目标分布的数据上仍表现良好。训练误差低不是成功证明，也不意味着应放弃正则化去追求零训练误差。若训练集与真实线上流量不同，模型可能在离线测试很好，部署后却失败。

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
      title: "分类评估：从混淆矩阵推到排序、校准和成本阈值",
      body: String.raw`**定义。** 二分类标签 $y_i\in\{0,1\}$，分数 $s_i\in\mathbb R$，阈值 $t$ 给出预测 $\hat y_i=\mathbf1[s_i\ge t]$。TP、FP、FN、TN 分别按预测与标签的交叉计数。降低阈值通常同时增加真正例率和假正例率：

$$TPR=\frac{TP}{TP+FN},\qquad FPR=\frac{FP}{FP+TN}$$

ROC 曲线以 FPR 为横轴、TPR 为纵轴。若正负样本数分别为 $N_+,N_->0$，经验 AUC 是对所有正负对比较：

$$\mathrm{AUC}=\frac1{N_+N_-}\sum_{i:y_i=1}\sum_{j:y_j=0}
\left(\mathbf1[s_i>s_j]+\tfrac12\mathbf1[s_i=s_j]\right).$$

它等于随机正样本分数胜过随机负样本的概率，加上并列概率的一半，不直接给出最佳阈值。原代码里的正样本分数是 $(0.9,0.7,0.3)$，负样本是 $(0.8,0.6,0.4,0.2,0.1)$，胜出的对数为 $5+4+2=11$，故 AUC 为 $11/15\approx0.733333$。

类别极不平衡时，大量 TN 会让 FPR 看起来很小。PR 曲线直接观察：

$$Precision=\frac{TP}{TP+FP},\qquad Recall=\frac{TP}{TP+FN}$$

因此更能暴露正类预测质量。指标选择仍取决于应用，不应机械规定“不平衡就只能用 PR”。

校准研究预测概率是否可信。若按预测类别的置信度分桶，第 $m$ 桶平均置信度为 $conf(B_m)$，实际准确率为 $acc(B_m)$，经验校准误差可写为：

$$ECE=\sum_m\frac{|B_m|}{N}|acc(B_m)-conf(B_m)|$$

若按正类概率分桶，则应比较桶内正类比例与平均正类概率，不能混用 top-label 准确率。ECE 依赖分桶且不是概率质量的完整度量；Brier 分数 $\frac1N\sum_i(p_i-y_i)^2$ 和 log loss 可作为补充。

**从业务代价推阈值。** 假设 $p=P(y=1\mid x)$ 已校准、正确决策成本为零，误报成本 $C_{\rm FP}>0$、漏报成本 $C_{\rm FN}>0$。预测正类的条件期望成本为 $C_{\rm FP}(1-p)$，预测负类为 $C_{\rm FN}p$。选择前者要求

$$C_{\rm FP}(1-p)\le C_{\rm FN}p
\quad\Longleftrightarrow\quad
p\ge\frac{C_{\rm FP}}{C_{\rm FP}+C_{\rm FN}}.$$

取误报成本 1、漏报成本 9，阈值为 0.1，而不是固定 0.5。$p=0.2$ 时报警成本 0.8、不报成本 1.8，应该报警。若概率未校准、类别先验漂移或每个人的成本不同，需要重新估计，不能机械使用该阈值。

**追问。** PR 的随机排序基准与正类比例有关，AUC 和 PR-AUC 都要注明候选集和采样比例。F1 不直接包含 TN，也不等价于任意业务成本；没有预测正例时 precision 分母为零，报告需说明约定，而非默默产生 NaN。`,
    },
    {
      id: "math-logistic",
      type: "derivation",
      title: "逻辑回归：从 Bernoulli 似然到梯度和 Hessian",
      body: String.raw`**问题与维度。** $N$ 个样本，$X\in\mathbb R^{N\times d}$，$y\in\{0,1\}^N$，$w\in\mathbb R^d$，$b\in\mathbb R$。线性分数 $z_i=x_i^\top w+b$，概率 $p_i=\sigma(z_i)$。它假设对数赔率 $\log[p_i/(1-p_i)]=z_i$ 线性，而非标签线性。

**似然与目标。** 条件独立 Bernoulli 似然取负对数平均，截距不惩罚：

$$L(w,b)=\frac1N\sum_i[\log(1+e^{z_i})-y_iz_i]+\frac\lambda2\|w\|^2.$$

稳定计算 softplus 可用 $\max(z,0)+\log(1+e^{-|z|})$，避免先求概率再取极小数的对数。

**一阶推导。** $\sigma'(z)=p(1-p)$，单样本交叉熵导数为

$$\frac{\partial\ell_i}{\partial z_i}
=\left(-\frac{y_i}{p_i}+\frac{1-y_i}{1-p_i}\right)p_i(1-p_i)
=p_i-y_i.$$

于是 $\nabla_wL=X^\top(p-y)/N+\lambda w$，$\partial L/\partial b=\sum_i(p_i-y_i)/N$。增广 $\tilde X=[X,\mathbf1]\in\mathbb R^{N\times(d+1)}$、$\theta=(w,b)$，$R=\operatorname{diag}(1,\ldots,1,0)$：

$$\nabla_\theta L=\frac1N\tilde X^\top(p-y)+\lambda R\theta,\quad
H=\frac1N\tilde X^\top D\tilde X+\lambda R,\quad
D=\operatorname{diag}(p_i(1-p_i)).$$

任意 $v$ 满足 $v^\top Hv=\sum_ip_i(1-p_i)(\tilde x_i^\top v)^2/N+\lambda v^\top Rv\ge0$，所以目标凸，但半正定不自动意味着参数唯一或有限最优点存在。

**完整手算。** $d=1$，$x=(1,2)$，$y=(0,1)$，$w=b=0$，$\lambda=0$。$p=(1/2,1/2)$，$L=\log2$，残差 $(1/2,-1/2)$：

$$\nabla_{(w,b)}L=(-1/4,0),\qquad
H=\begin{bmatrix}5/8&3/8\\3/8&1/4\end{bmatrix}.$$

取学习率 0.1，$w'=0.025,b'=0$，损失约为 0.687092。Newton 方法改为解 $H\Delta=\nabla L$ 再 $\theta\leftarrow\theta-\Delta$，大规模或病态时需要阻尼及线性求解器。

**追问。** 完全线性可分且无正则时，参数范数趋于无穷可使 NLL 趋近零，未必有有限 MLE。正则化、早停和概率校准解决不同问题。类权重或重采样会改变被拟合的目标分布，得到的数值不一定还是部署后验。`,
    },
    {
      id: "math-naive-bayes",
      type: "derivation",
      title: "朴素 Bayes：条件独立、log 后验与 Laplace 平滑",
      body: String.raw`**模型与目标。** 分类标签 $y\in\{1,\ldots,K\}$，特征 $x=(x_1,\ldots,x_d)$。从联合分布 $P(y)P(x\mid y)$ 建模，假设特征在给定类别后条件独立：

$$P(x\mid y=c)=\prod_{j=1}^dP(x_j\mid y=c),\qquad
\log P(y=c\mid x)=s_c(x)-\log\sum_{k=1}^Ke^{s_k(x)},$$

$$s_c(x)=\log P(y=c)+\sum_j\log P(x_j\mid y=c).$$

分类取 $\arg\max_cs_c$，可省略各类别共享的分母；若要后验概率就必须用 log-sum-exp 归一化。条件独立不是特征在整体数据中独立，也不意味着真实数据必然满足这个假设。相关特征被重复计证据时，类别预测仍可能有用，但概率容易过度自信。

**Bernoulli 与平滑推导。** 二值特征 $x_j\in\{0,1\}$，设 $\phi_{cj}=P(x_j=1\mid y=c)$，类别内有 $n_c$ 条样本，其中 $n_{cj}$ 条该特征为 1。条件似然与第 03 章 Bernoulli 相同，MLE 为 $n_{cj}/n_c$。加入对称 Beta($\alpha,\alpha$) 先验后，后验预测概率为

$$\hat\phi_{cj}=\frac{n_{cj}+\alpha}{n_c+2\alpha},\qquad
s_c=\log\pi_c+\sum_j[x_j\log\hat\phi_{cj}+(1-x_j)\log(1-\hat\phi_{cj})].$$

$\alpha=1$ 即 add-one/Laplace 平滑，这是后验均值或后验预测，不是 Beta(1,1) 先验的 MAP。二值特征的“未出现”也贡献似然，不应只加出现项。

**完整小例。** 两类各 4 条邮件，先验均为 1/2。两个二值特征分别表示出现链接、出现优惠词。垃圾类样本为 $(1,1),(1,1),(1,1),(0,1)$，正常类为 $(1,0),(0,0),(0,0),(0,0)$。未平滑时正常类优惠词概率为零，遇到 $(1,1)$ 会被直接判为零似然。取 $\alpha=1$：

$$\phi_{\rm spam}=(4/6,5/6),\qquad
\phi_{\rm normal}=(2/6,1/6).$$

新邮件 $x=(1,1)$ 的未归一化权重为 $(1/2)(4/6)(5/6)=10/36$ 和 $(1/2)(2/6)(1/6)=1/36$，log 分数约为 $-1.280934,-3.583519$，归一化垃圾后验为 $10/11\approx0.909091$。若 $x=(0,0)$，两项权重对调，垃圾后验变成 $1/11$。

**追问。** 多项式文本模型使用词计数和 $\phi_{cj}=(n_{cj}+\alpha)/(\sum_vn_{cv}+\alpha V)$，分母是类内总词数而非文档数，不能与 Bernoulli 混用；连续特征可采用类条件 Gaussian。训练复杂度通常线性于样本特征总量，条件独立让估计简单，但平滑不能修复假设错误或类别先验漂移。`,
    },
    {
      id: "math-knn",
      type: "derivation",
      title: "kNN：距离、加权投票、标准化与维数灾难",
      body: String.raw`**问题与规则。** 保存训练样本 $(x_i,y_i)$，$x_i\in\mathbb R^d$。对查询 $x$ 取最近的 $k$ 个训练点组成 $\mathcal N_k(x)$，常用欧氏距离 $d(x,x_i)=\sqrt{\sum_j(x_j-x_{ij})^2}$。分类可估计局部类别比例，回归可估计局部条件均值：

$$\hat P(y=c\mid x)=
\frac{\sum_{i\in\mathcal N_k(x)}w_i\mathbf1[y_i=c]}{\sum_{i\in\mathcal N_k(x)}w_i},
\qquad
\hat f(x)=\frac{\sum_iw_iy_i}{\sum_iw_i}.$$

均匀投票取 $w_i=1$，距离加权可取 $w_i=1/(d_i+\epsilon)$。零距离点要明示策略，例如只对重合点投票，避免无穷权重；并列票也要固定规则。

**投票手算。** 一维查询 $x=0$，三个邻居 $(x_i,y_i)=(1,1),(2,0),(3,0)$，$k=3$。均匀投票正类概率为 $1/3$，预测负类；距离均非零，可取 $\epsilon=0$，正类权重为 1，负类总权重为 $1/2+1/3=5/6$，正类概率为 $1/(1+5/6)=6/11$，预测翻转。选择 $k$、距离和权重本身就是模型选择，需用验证集。

**标准化为什么改变邻居。** 某训练折估得特征尺度 $s=(1,100)$，这两个尺度来自完整训练折而非仅下面两个候选。查询为 $(0,0)$，候选 A 为 $(1,100)$、B 为 $(3,0)$。原始欧氏距离约为 $100.005$ 与 3，B 更近；按训练尺度变为

$$d_{\rm scaled}(x,x_i)=\sqrt{\sum_j((x_j-x_{ij})/s_j)^2},$$

则 A 距离 $\sqrt2$、B 距离 3，A 更近。训练均值在两点相减时抵消；测试数据不能参与尺度拟合。标准化并非总有益，特征单位本来表达重要代价时应使用领域定义的度量。

**维数灾难的可算例子。** 若数据均匀分布在单位 $d$ 维立方体，一个位于其内部的等边轴对齐邻域要覆盖比例 $q$ 的质量，其边长满足 $\ell^d=q$，故 $\ell=q^{1/d}$。取 $q=0.1$，$d=2,10,100$ 时边长分别约为 $0.316228,0.794328,0.977237$；高维下收集 10% 样本所需范围几乎跨满每个轴，“局部”已不局部。

**追问。** 小 $k$ 通常低平滑偏差、高估计方差，大 $k$ 相反；无关维度会稀释有用距离。暴力检索每个查询需 $O(Nd)$ 距离计算，树索引在高维可能退化，近似近邻还需评估召回损失。上述维数灾难例依赖均匀满维分布，低内在维度的数据可以更容易，不能仅凭 embedding 维数断言 kNN 无用。`,
    },
    {
      id: "math-svm",
      type: "derivation",
      title: "SVM：几何间隔、软间隔对偶与核技巧",
      body: String.raw`**目标与约定。** 标签改为 $y_i\in\{-1,+1\}$，$x_i,w\in\mathbb R^d$，决策为 $\operatorname{sign}(w^\top x+b)$。到超平面的有符号距离是 $y_i(w^\top x_i+b)/\|w\|$。把最小函数间隔固定为 1 后，最大几何间隔等价于最小化 $\|w\|^2/2$。

不可分数据引入松弛 $\xi_i\ge0$、惩罚 $C>0$，采用损失求和约定：

$$\min_{w,b,\xi}\frac12\|w\|^2+C\sum_i\xi_i,\quad
y_i(w^\top x_i+b)\ge1-\xi_i.$$

固定 $w,b$ 时最小可行 $\xi_i=\max(0,1-y_i(w^\top x_i+b))$，因此等价于范数惩罚加 hinge loss。$C$ 越大越重视违约损失，不是越强的范数正则。

**对偶逐步推导。** 为两个不等式分别引入 $\alpha_i,\mu_i\ge0$：

$$\mathcal L=\tfrac12\|w\|^2+C\sum_i\xi_i
+\sum_i\alpha_i[1-\xi_i-y_i(w^\top x_i+b)]-\sum_i\mu_i\xi_i.$$

对 $w,b,\xi_i$ 求驻点，得 $w=\sum_i\alpha_iy_ix_i$、$\sum_i\alpha_iy_i=0$、$C-\alpha_i-\mu_i=0$。消去原变量后：

$$\max_\alpha\sum_i\alpha_i-\frac12\sum_{i,j}\alpha_i\alpha_jy_iy_jx_i^\top x_j,
\quad 0\le\alpha_i\le C,\quad \sum_i\alpha_iy_i=0.$$

软间隔问题凸且可严格满足不等式，强对偶成立。KKT 互补条件为 $\alpha_i[1-\xi_i-y_if_i]=0$、$(C-\alpha_i)\xi_i=0$。若 $0<\alpha_i<C$，则 $\xi_i=0,y_if_i=1$，可用该点恢复 $b=y_i-w^\top x_i$；$\alpha_i=C$ 的点可能位于间隔内或被误分，不一定全误分。

**手算。** 两点 $(x,y)=(-1,-1),(1,1)$，$C=1$。约束令 $\alpha_1=\alpha_2=a$，对偶为 $2a-2a^2$，导数 $2-4a=0$ 给 $a=1/2$。于是 $w=1,b=0,\xi=0$，原/对偶目标均为 $1/2$，两条间隔边界距离为 $2/\|w\|=2$。若 $C<1/2$，最优 $a=C$ 被盒约束截住，不能继续使用 $a=1/2$。

**核与追问。** 用 $K(x_i,x_j)=\phi(x_i)^\top\phi(x_j)$ 替换内积，预测为 $\sum_i\alpha_iy_iK(x_i,x)+b$。例如一维二次核 $(1+xx')^2$ 对应 $\phi(x)=(1,\sqrt2x,x^2)$。有效核的任意有限 Gram 矩阵应对称半正定，因为 $c^\top Kc=\|\sum_ic_i\phi(x_i)\|^2\ge0$。任意相似度未必是核；核矩阵通常占 $O(N^2)$ 存储，SVM 分数也不自动是校准概率。`,
    },
    {
      id: "math-tree",
      type: "derivation",
      title: "决策树：熵、Gini、回归叶值与分裂增益",
      body: String.raw`**问题。** 在节点 $S$ 中有 $n$ 个样本、$K$ 类，经验比例 $p_k=n_k/n$。树选择特征与阈值，将节点分成 $S_L,S_R$；损失是子节点不纯度的样本数加权平均，而非两个子节点等权平均。

$$H(S)=-\sum_kp_k\log p_k,\quad
G(S)=1-\sum_kp_k^2=\sum_kp_k(1-p_k),$$

$$\operatorname{Gain}_I=I(S)-\frac{n_L}{n}I(S_L)-\frac{n_R}{n}I(S_R).$$

熵是在节点内采用最优常量类别概率后的平均 log loss；Gini 等于按节点类别分布随机猜一个类别时与真实类别不一致的概率。这里熵用自然对数；改底只缩放熵增益，不改同一节点的最大增益选择。

**完整手算。** 根节点六个样本，3 正 3 负，熵为 $\log2\approx0.693147$，Gini 为 0.5。某分裂左侧 2 正 0 负，右侧 1 正 3 负。左侧不纯度为零，右侧：

$$H_R=-\tfrac14\log\tfrac14-\tfrac34\log\tfrac34\approx0.562335,\quad
G_R=1-(1/4)^2-(3/4)^2=0.375.$$

加权熵为 $(4/6)H_R\approx0.374890$，信息增益约 0.318257；加权 Gini 为 0.25，Gini 增益为 0.25。分裂后的叶概率分别为 1 和 1/4；小样本纯叶容易过度自信。

**回归树推导。** 叶内预测一个常数 $c$，最小化 $\sum_{i\in S}(y_i-c)^2$。求导 $2\sum_i(c-y_i)=0$，得 $c=\bar y_S$；分裂比较父节点 SSE 与左右 SSE 之差。标签 $(1,3)$ 的叶均值为 2，SSE 为 2。绝对误差则以中位数为最优，不能仍用均值公式。

**追问。** 连续特征的候选阈值可取排序后相邻不同值的中点；分类树通常是贪心局部最优，不保证整棵树全局最优。最小叶样本数、最大深度、剪枝控制方差；归一化信息增益能缓解多取值特征的选择偏好，但不是解决所有偏差。缺失值规则与所有阈值都只能从训练集拟合。`,
    },
    {
      id: "math-rf-gbdt",
      type: "derivation",
      title: "随机森林与 GBDT：降低相关方差，或逐轮拟合负梯度",
      body: String.raw`**随机森林的目标。** 回归森林平均 $T$ 棵树的预测，分类可平均概率或投票。各树使用 bootstrap 样本和分裂时随机候选特征，使强但高方差的树尽量不完全相关。在固定输入上，假设每棵树预测方差为 $\sigma^2$，两两相关系数同为 $\rho$：

$$\operatorname{Var}\left(\frac1T\sum_{t=1}^T f_t\right)
=\frac{T\sigma^2+T(T-1)\rho\sigma^2}{T^2}
=\sigma^2\left[\rho+\frac{1-\rho}{T}\right].$$

这是简化的等方差等相关模型。取 $\sigma^2=4,\rho=0.25,T=10$，方差为 $4(0.25+0.075)=1.3$；独立时才是 0.4。无限多树仍留下 $\rho\sigma^2=1$，所以增加树数不能消除所有误差。bootstrap 抽取 $N$ 次后，单个样本未入袋概率为 $(1-1/N)^N\to e^{-1}\approx0.368$，可用对应的袋外树预测该样本；反复用袋外分数调参也会选择性过拟合。

**GBDT 的目标。** 模型是累加函数 $F_T(x)=F_0(x)+\sum_{t=1}^T\eta h_t(x)$，标量 $\eta>0$ 是收缩率。每轮在已有预测 $F_{t-1}(x_i)$ 处求损失对预测的负梯度：

$$r_{it}=-\left.\frac{\partial\ell(y_i,F)}{\partial F}\right|_{F=F_{t-1}(x_i)}.$$

用回归树拟合 $(x_i,r_{it})$，必要时在每个叶区域 $R_{jt}$ 内再做一维线搜索 $\gamma_{jt}=\arg\min_\gamma\sum_{i\in R_{jt}}\ell(y_i,F_{t-1}(x_i)+\gamma)$，更新 $F_t=F_{t-1}+\eta\sum_j\gamma_{jt}\mathbf1[x\in R_{jt}]$。平方损失 $\ell=(y-F)^2/2$ 的负梯度是残差 $y-F$；logistic NLL 对 logit 的负梯度为 $y-\sigma(F)$，不能直接对概率生搬平方残差更新。

**手算一轮。** 两个特征值 $x=(-1,1)$、标签 $y=(1,3)$。平方损失最优常量 $F_0=2$，半平方和为 1。残差 $(-1,1)$，树在零处分裂得到两个叶值 -1、1。$\eta=0.5$ 时预测变为 $(1.5,2.5)$，半平方和为 0.25。

**追问。** RF 的树通常独立训练、可并行；GBDT 每轮依赖上一轮预测，沿负梯度逐步纠错。二者不应简单贴成“只降方差/只降偏差”：树深、相关性、学习率和样本量共同影响泛化。分类 boosting 的初始 logit 常取训练正类赔率的对数，类别全同或加权时需另行处理。`,
    },
    {
      id: "math-adaboost",
      type: "derivation",
      title: "AdaBoost：从指数损失推弱学习器权重与样本重加权",
      body: String.raw`**目标与符号。** 二分类标签 $y_i\in\{-1,+1\}$，弱分类器 $h_t(x)\in\{-1,+1\}$，累积分数 $F_t(x)=F_{t-1}(x)+\alpha_th_t(x)$，最终预测符号。AdaBoost 可看作逐轮最小化指数损失 $\sum_i e^{-y_iF(x_i)}$ 的前向加法建模。

定义当前归一化样本权重 $D_t(i)=e^{-y_iF_{t-1}(x_i)}/\sum_j e^{-y_jF_{t-1}(x_j)}$。固定弱分类器后，它的加权错误率 $\varepsilon_t=\sum_iD_t(i)\mathbf1[y_i\ne h_t(x_i)]$。新旧损失比为

$$Z_t(\alpha)=\sum_iD_t(i)e^{-\alpha y_ih_t(x_i)}
=(1-\varepsilon_t)e^{-\alpha}+\varepsilon_te^\alpha.$$

**推导系数。** 求导令零：

$$-(1-\varepsilon_t)e^{-\alpha}+\varepsilon_te^\alpha=0
\Rightarrow\alpha_t=\frac12\log\frac{1-\varepsilon_t}{\varepsilon_t}.$$

内部公式要求 $0<\varepsilon_t<1$，有用的正系数弱学习器通常需 $\varepsilon_t<1/2$。代回得 $Z_t=2\sqrt{\varepsilon_t(1-\varepsilon_t)}$，样本权重更新为

$$D_{t+1}(i)=\frac{D_t(i)e^{-\alpha_ty_ih_t(x_i)}}{Z_t}.$$

正确样本乘 $e^{-\alpha_t}$，错误样本乘 $e^{\alpha_t}$；强调的是相对权重，所有权重最终仍和为 1。

**完整手算。** 四个样本初始各重 1/4，某弱分类器只错第 4 个。$\varepsilon=1/4$，$\alpha=\tfrac12\log3\approx0.549306$，$Z=\sqrt3/2\approx0.866025$。前三个权重更新为 $(1/4)(1/\sqrt3)/Z=1/6$，错误样本为 $(1/4)\sqrt3/Z=1/2$。从 $F_0=0$ 出发，平均指数损失由 1 降为 0.866025，而该弱分类器在新权重下的错误率已变为 1/2，下一轮需寻找新的有效方向。

**与 GBDT 的关系及边界。** 因 $\mathbf1[y_iF_T(x_i)\le0]\le e^{-y_iF_T(x_i)}$，初始均匀权重时训练错误率上界为 $\prod_tZ_t$；这不是测试误差保证。AdaBoost 使用指数损失对应的乘法重加权，GBDT 是更一般的函数负梯度框架，不能把它们只当两套无关名字。$\varepsilon=0$ 时最优系数趋无穷，实际可停止或限制系数；$\varepsilon=1/2$ 时 $\alpha=0$；$\varepsilon>1/2$ 可在允许时翻转弱分类器。指数惩罚对长期误分点增长很快，噪声标签和离群值可能吸走权重，早停与弱学习器复杂度都需验证。`,
    },
    {
      id: "math-xgboost",
      type: "derivation",
      title: "XGBoost：二阶近似、最优叶权重与分裂增益",
      body: String.raw`**目标与符号。** 第 $t$ 轮给当前标量预测 $\hat y_i$ 加一棵树 $f(x)=w_{q(x)}$，$q$ 把样本映射到 $T$ 个叶，$w\in\mathbb R^T$。考虑可二阶求导损失之和，树正则为 $\Omega(f)=\gamma T+\frac\lambda2\sum_jw_j^2$，$\lambda,\gamma\ge0$，本节无 L1 项且先令收缩率为 1。

在旧预测处作二阶 Taylor 展开，定义 $g_i=\partial\ell_i/\partial\hat y_i$、$h_i=\partial^2\ell_i/\partial\hat y_i^2$。去掉与新树无关的常数：

$$\tilde L=\sum_i[g_if(x_i)+\tfrac12h_if(x_i)^2]+\gamma T+\tfrac\lambda2\sum_jw_j^2.$$

把同叶样本聚合，$I_j=\{i:q(x_i)=j\}$，$G_j=\sum_{i\in I_j}g_i$，$H_j=\sum_{i\in I_j}h_i$：

$$\tilde L=\sum_j[G_jw_j+\tfrac12(H_j+\lambda)w_j^2]+\gamma T.$$

若 $H_j+\lambda>0$，求导令零得到

$$w_j^*=-\frac{G_j}{H_j+\lambda},\qquad
\tilde L^*=-\frac12\sum_j\frac{G_j^2}{H_j+\lambda}+\gamma T.$$

父叶换成左右两叶时多一个叶惩罚，目标下降量为

$$\operatorname{Gain}=\frac12\left[
\frac{G_L^2}{H_L+\lambda}+\frac{G_R^2}{H_R+\lambda}
-\frac{(G_L+G_R)^2}{H_L+H_R+\lambda}\right]-\gamma.$$

**完整手算。** 使用平方损失 $\ell=(\hat y-y)^2/2$，所以 $g_i=\hat y_i-y_i,h_i=1$，此时二阶展开精确。旧预测全为零，标签为 $(-1,-1,1,1)$，按前两点/后两点分裂，$G_L=2,G_R=-2,H_L=H_R=2$。$\lambda=1,\gamma=0.1$：

$$w_L=-2/3,\quad w_R=2/3,\quad w_P=0,\quad
\operatorname{Gain}=\tfrac12(4/3+4/3)-0.1=37/30\approx1.233333.$$

直接核算：父树目标是数据损失 2 加一叶惩罚 0.1，共 2.1；分裂后数据损失 $2/9$、权重惩罚 $4/9$、两叶惩罚 0.2，共 $13/15\approx0.866667$，差值确为 $37/30$。

**追问。** 叶权重是负的梯度和除以曲率和，并非简单残差均值；$\lambda=0$ 且平方损失时才退化为平均残差。logistic 的 $h_i=p_i(1-p_i)$，饱和时很小，需正则与最小子节点 Hessian 和等约束。收缩率 $\eta<1$ 在求叶权重后缩小实际更新；原分裂增益不是缩放后实际损失下降的精确数值。非二次损失的 Taylor 目标也不保证等于真实目标。`,
    },
    {
      id: "math-kmeans",
      type: "derivation",
      title: "K-means：固定分配求中心，固定中心求分配",
      body: String.raw`**目标与维度。** 无标签样本 $x_i\in\mathbb R^d$，给定簇数 $K$，中心 $\mu_k\in\mathbb R^d$，硬分配 $z_i\in\{1,\ldots,K\}$。目标是簇内平方距离：

$$J(z,\mu)=\sum_{i=1}^N\|x_i-\mu_{z_i}\|^2.$$

这是关于离散分配与连续中心的联合非凸问题。Lloyd 算法交替精确优化其中一组变量。

**分配步。** 固定中心时每个样本项彼此独立，令 $z_i=\arg\min_k\|x_i-\mu_k\|^2$，并列采用固定规则。**中心步。** 固定分配，令 $S_k=\{i:z_i=k\}$，对 $\mu_k$ 求导：

$$\nabla_{\mu_k}J=2\sum_{i\in S_k}(\mu_k-x_i)=0
\Rightarrow\mu_k=\frac1{|S_k|}\sum_{i\in S_k}x_i.$$

两步都不增加目标，但不保证全局最优。若簇为空，分母为零，要重置中心或保留旧中心并明示策略。

**手算。** 一维点 $(0,2,8,10)$，$K=2$，初始中心 $(0,8)$。按最近中心分配为 $\{0,2\}$、$\{8,10\}$，初始目标为 $0+4+0+4=8$。更新均值得 $(1,9)$，目标为 $1+1+1+1=4$；再次分配不变，到达固定点。

**追问。** 欧氏距离对尺度敏感，应只在训练集拟合缩放。均值对离群值敏感，非球状或不等密度簇未必适合；增大 $K$ 只会使最优训练目标不增，所以不能靠最小训练 SSE 选 $K$。多次初始化、k-means++ 和 silhouette 等诊断缓解问题，但不能证明找到了真簇。`,
    },
    {
      id: "math-em",
      type: "derivation",
      title: "Gaussian mixture 与 EM：从 Jensen 下界到软聚类",
      body: String.raw`**模型与目标。** $x_i\in\mathbb R^d$，隐藏类别 $z_i\in\{1,\ldots,K\}$，混合权重 $\pi_k>0,\sum_k\pi_k=1$，均值 $\mu_k\in\mathbb R^d$，协方差 $\Sigma_k\in\mathbb R^{d\times d}$ 正定。混合密度与对数似然为

$$p_\theta(x_i)=\sum_k\pi_k\mathcal N(x_i;\mu_k,\Sigma_k),\quad
\ell(\theta)=\sum_i\log\sum_kp_\theta(x_i,z_i=k).$$

log 外面套 sum，直接求解参数困难。为每个样本引入分布 $q_i(k)$，由凹函数 Jensen：

$$\log p_\theta(x_i)=\log\sum_kq_i(k)\frac{p_\theta(x_i,k)}{q_i(k)}
\ge\sum_kq_i(k)\log\frac{p_\theta(x_i,k)}{q_i(k)}.$$

等号在 $q_i(k)=p_\theta(k\mid x_i)$ 时成立；下界与对数似然的差是非负的 $\mathrm{KL}(q_i\|p_\theta(z_i\mid x_i))$。

**E 步。** 用旧参数计算责任度

$$r_{ik}=\frac{\pi_k\mathcal N(x_i;\mu_k,\Sigma_k)}
{\sum_j\pi_j\mathcal N(x_i;\mu_j,\Sigma_j)},\qquad \sum_kr_{ik}=1.$$

**M 步。** 固定责任度，最大化完整对数似然的加权期望。对 $\pi$ 用和为 1 的拉格朗日约束，得 $\pi_k=N_k/N$，其中 $N_k=\sum_ir_{ik}$；对均值求导得 $\sum_ir_{ik}\Sigma_k^{-1}(x_i-\mu_k)=0$，故

$$\mu_k=\frac{\sum_ir_{ik}x_i}{N_k},\qquad
\Sigma_k=\frac{\sum_ir_{ik}(x_i-\mu_k)(x_i-\mu_k)^\top}{N_k}.$$

协方差公式可从精度矩阵 $\Lambda_k=\Sigma_k^{-1}$ 推出：相关目标为 $(N_k/2)\log|\Lambda_k|-\tfrac12\operatorname{tr}(\Lambda_kS_k)$，求导设零给出 $N_k\Lambda_k^{-1}=S_k$。

**两点手算。** $x=(-1,1)$，两个一维分量，旧权重各 1/2、旧均值 $(-1,1)$、方差均为 1。点 -1 属于左分量的责任度为 $a=1/(1+e^{-2})\approx0.880797$，右分量为 $1-a$；点 1 对称。于是 $N_1=N_2=1$，新权重仍各半，新均值为 $\pm(2a-1)\approx\pm0.761594$。新方差均为 $1-(2a-1)^2\approx0.419974$，由加权二阶矩减均值平方得到。

**单调性与边界。** E 步让下界在旧参数处贴紧，M 步增加下界，因此精确 EM 的观测对数似然不下降，但可能收敛局部最优。某协方差塌缩到单个数据点时高斯混合似然可无界，需要最小协方差或先验等约束，不能把无约束 EM 当成总有良态最优解。固定相等球形协方差并让方差趋零，责任度趋向最近中心的硬分配，才与 K-means 联系起来；一般 GMM 不是 K-means 的同义词。`,
    },
    {
      id: "math-ranking",
      type: "derivation",
      title: "排序：pairwise 目标、NDCG、MRR 与 Recall@k",
      body: String.raw`**问题与单位。** 每个 query 有候选文档，模型输出分数 $s_i=f_\theta(q,d_i)$，相关性等级 $r_i\ge0$。先定义候选集和每个 query 的权重，再评价次序；把所有 query 文档混在一起算一次 AUC 不等价于检索排序质量。

**成对学习推导。** 对标签给定的偏好对 $i\succ j$，用 $P(i\succ j)=\sigma(s_i-s_j)$ 建模。负对数似然

$$\ell_{ij}=\log(1+e^{-(s_i-s_j)}),\quad
\frac{\partial\ell}{\partial s_i}=\sigma(s_i-s_j)-1,\quad
\frac{\partial\ell}{\partial s_j}=1-\sigma(s_i-s_j).$$

若分数相等，损失为 $\log2$，梯度为 $(-1/2,+1/2)$。学习率 0.2 直接更新两个分数得到 $(0.1,-0.1)$，新损失为 $\log(1+e^{-0.2})\approx0.598139$。对实际模型还需链式法则乘各自 $\nabla_\theta s$。该 pairwise 目标不保证最优 NDCG，尤其当各位置错误成本不同。

**有等级相关性的指标。** 采用指数 gain 和对数折扣：

$$DCG@k=\sum_{i=1}^k\frac{2^{r_i}-1}{\log_2(i+1)},\qquad
NDCG@k=\frac{DCG@k}{IDCG@k}.$$

$IDCG$ 是同一 query 的候选标签按相关性理想排序所得值。例中预测次序的标签为 $(2,0,1)$，$k=3$。$DCG=3+0+1/2=3.5$，理想排序 $(2,1,0)$ 的 $IDCG=3+1/\log_2 3\approx3.630930$，故 $NDCG\approx0.963940$。

**二值相关性。** MRR 是各 query 首个相关结果排名的倒数再平均；若从未找到，约定该 query 为零。Recall@k 是前 $k$ 个相关文档数除以已知相关文档总数。二值列表 $(0,1,1)$ 有两个相关文档，首个排第 2，RR 为 1/2；Recall@2 为 1/2。这些指标回答不同问题：MRR 不奖励找到第二个相关项，Recall 不惩罚相关项在前 k 内的先后次序。

**追问。** 没有相关文档的 query 会导致 IDCG 或 recall 分母为零，应事先约定排除还是记零，并报告数量。负采样、候选召回和 query 难度改变指标基线；必须固定候选集和标注协议。把 k 扩大通常提高 recall，却未必改善用户看到的前几项质量。`,
    },
    {
      id: "math-bias-variance",
      type: "derivation",
      title: "偏差方差分解：为什么训练误差不是模型选择目标",
      body: String.raw`**假设与对象。** 固定测试输入 $x$，真实标签 $Y=f^*(x)+\epsilon$，$\mathbb E[\epsilon\mid x]=0$，$\operatorname{Var}(\epsilon\mid x)=\sigma^2$。随机训练集 $D$ 产生预测 $\hat f_D(x)$，独立测试噪声与训练过程独立。记平均预测 $\bar f(x)=\mathbb E_D\hat f_D(x)$。

插入并减去 $\bar f$，展开平方，利用 $\mathbb E_D(\hat f_D-\bar f)=0$ 和噪声均值为零使交叉项消失：

$$\mathbb E_{D,\epsilon}[(Y-\hat f_D(x))^2]
=\underbrace{(\bar f(x)-f^*(x))^2}_{\text{偏差平方}}
+\underbrace{\mathbb E_D[(\hat f_D(x)-\bar f(x))^2]}_{\text{模型方差}}
+\underbrace{\sigma^2}_{\text{不可约噪声}}.$$

这是平方损失和指定采样条件下的分解，不是所有分类指标都能照抄的公式。再对测试 $x$ 的分布取期望才能得到总体风险。

**手算。** 真函数值为 2、噪声方差为 0.25，模型在两个等概率训练集上的预测为 1、3。平均预测为 2、偏差平方为零、模型方差为 1，所以期望测试平方误差为 1.25。另一个稳定模型总预测 1.5，偏差平方 0.25、模型方差零，总误差 0.5，说明更灵活却波动大的模型未必更好。

**连接训练与验证。** 正则化、树深和早停可能增大偏差、降低方差，最佳权衡由验证集估计，不能只凭理论口号决定。独立测试集用于冻结方案后的确认，所有标准化、特征选择、PCA 和阈值调节必须放在每个训练折内。时间或用户相关数据按部署边界分组切分，不能用随机按行切分冒充独立泛化。

**追问。** 当训练集变化时模型参数变化产生的方差，和在固定模型上重复采样输出产生的方差，不是同一个量；多随机种子并不能代替多份独立数据。超参数搜索次数越多，对验证集的选择性过拟合越严重，应保留最终测试或使用嵌套验证。部署后还需用 A/B 测试区分相关预测能力与真实业务因果收益。`,
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
    {
      id: "whiteboard",
      type: "quiz",
      title: "白板练习：经典模型全链路验收",
      body: "每题都要写目标、关键推导、数字和成立条件。按六轮学习路线分批完成，并隔日复测，不要用原始概念题替代这些推导题。",
      questions: [
        {
          q: "逻辑回归 x=(1,2)、y=(0,1)，w=b=0，无正则、平均 NLL。推导并计算梯度和 Hessian，说明凸目标为何仍可能没有有限 MLE。",
          a: String.raw`单样本 $\ell=\log(1+e^z)-yz$，一阶为 $p-y$、二阶为 $p(1-p)$。增广设计每行为 $(x_i,1)$，得到 $\nabla L=\tilde X^\top(p-y)/2=(-1/4,0)$，$H=\tilde X^\top\operatorname{diag}(1/4,1/4)\tilde X/2=[[5/8,3/8],[3/8,1/4]]$。Hessian 半正定保证凸性，但完全可分时放大分离方向使损失趋零而参数趋无穷。**得分点**：平均系数、偏置交叉项、二阶推导、有限解与凸性区别。`,
        },
        {
          q: "软间隔 SVM 两点为 (-1,-1)、(1,+1)，C=1。由对偶求 alpha、w、b，并解释核函数的合法条件。",
          a: String.raw`驻点给 $w=\sum_i\alpha_iy_ix_i$、$\sum_i\alpha_iy_i=0$、$0\le\alpha_i\le1$。因此两系数均为 $a$，对偶是 $2a-2a^2$，求导得 $a=1/2$。$w=1$，用内部支持向量的 $y_i(w x_i+b)=1$ 得 $b=0$，原/对偶目标均为 1/2。核代替内积，任意 Gram 矩阵应对称半正定，因 $c^\top Kc$ 是特征空间向量范数平方。**得分点**：盒约束来源、对偶二次项、KKT 恢复截距、核不是任意相似度。`,
        },
        {
          q: "树节点 3 正 3 负，分裂成左侧 2 正 0 负、右侧 1 正 3 负。分别计算信息增益和 Gini 增益。",
          a: String.raw`父熵为 $\log2$，父 Gini 为 1/2。左叶纯度损失零；右叶正比例 1/4，熵为 $-(1/4)\log(1/4)-(3/4)\log(3/4)=0.562335$，Gini 为 3/8。按样本数 2/6、4/6 加权，子熵为 0.374890、子 Gini 为 1/4。两种增益分别为 0.318257 和 1/4。**得分点**：比例定义、零概率约定、按样本数加权、声明对数底。`,
        },
        {
          q: "平方损失 XGBoost 旧预测均为 0，标签 (-1,-1,1,1)，分成前后两叶，lambda=1、gamma=0.1、学习率为 1。推导叶权重与 gain 并直接核对。",
          a: String.raw`$g=\hat y-y=(1,1,-1,-1)$，$h_i=1$。聚合得 $G_L=2,G_R=-2,H_L=H_R=2$。叶目标导数 $G+(H+\lambda)w=0$，所以 $w_L=-2/3,w_R=2/3$，父权重为零。增益 $\tfrac12(4/3+4/3)-0.1=37/30$。父目标为 2.1，子目标为 $2/9+4/9+0.2=13/15$，差相同。**得分点**：梯度符号、Hessian 和、父项与新增叶惩罚、展开精确依赖平方损失。`,
        },
        {
          q: "对点 (0,2,8,10)，K-means 初始中心为 (0,8)，做一轮。再说明 GMM 的 E 步为什么不能直接替换成最近中心。",
          a: String.raw`最近分配得到 $\{0,2\}$ 与 $\{8,10\}$，目标为 8。固定分配对中心求导，均值更新为 $(1,9)$，目标降为 4，再分配不变。GMM 责任度是 $\pi_k\mathcal N(x;\mu_k,\Sigma_k)$ 归一化后的后验，依赖权重和协方差，通常是软分配。只有固定相等球形方差并趋于零等条件下才逼近最近中心。**得分点**：两个交替目标、数值下降、局部最优与空簇边界、GMM 条件。`,
        },
        {
          q: "GMM 两点为 -1、1，两个分量旧均值 -1、1，权重各半、方差均为 1。计算一轮 EM 的责任度、均值与方差。",
          a: String.raw`对点 -1，两分量密度之比为 $1:e^{-2}$，左责任度 $a=1/(1+e^{-2})=0.880797$，点 1 对称。因此有效计数各为 1，新权重仍各半，左均值 $-a+(1-a)=1-2a=-0.761594$，右均值相反。加权二阶矩均为 1，新方差为 $1-(2a-1)^2=0.419974$。**得分点**：归一化后验、有效计数、均值和协方差都更新、EM 单调而非全局保证。`,
        },
        {
          q: "预测排序相关性为 (2,0,1)，用指数 gain 算 NDCG@3；已校准欺诈概率为 0.2，误报成本 1、漏报成本 9，应否报警？",
          a: String.raw`$DCG=3+1/2=3.5$，理想排序 $(2,1,0)$ 给 $IDCG=3+1/\log_2 3=3.630930$，NDCG 为 0.963940。报警成本为 $1(1-0.2)=0.8$，不报为 $9\cdot0.2=1.8$，故报警；一般阈值为 $C_{\rm FP}/(C_{\rm FP}+C_{\rm FN})=0.1$。**得分点**：同一候选集归一化、排名折扣、成本推导、校准概率前提。`,
        },
        {
          q: "真函数值 2、噪声方差 0.25，模型在两个等概率训练集预测为 1 和 3；另一个模型恒预测 1.5。推导并比较期望测试平方误差。",
          a: String.raw`写 $Y-\hat f=(f^*-\bar f)+(\bar f-\hat f)+\epsilon$，独立零均值使交叉项消失，得到偏差平方加模型方差加噪声。第一模型均值 2、偏差零、方差 1，总误差 1.25；第二模型偏差平方 0.25、方差零，总误差 0.5。**得分点**：训练集随机性、独立测试噪声、平方损失假设、不能用训练拟合优劣代替测试风险。`,
        },
        {
          q: "Bernoulli 朴素 Bayes 两类各 4 条样本，两个特征的出现数分别为垃圾类 (3,4)、正常类 (1,0)。先验各半，做 Laplace 平滑后求 x=(1,1) 的 log 分数和后验。",
          a: String.raw`平滑是每个二值结果加 1，分母为 $4+2=6$，得到垃圾特征概率 $(4/6,5/6)$、正常 $(2/6,1/6)$。条件独立给未归一化权重 $10/36$ 和 $1/36$，log 分数为 -1.280934、-3.583519。后验用两项之和归一化，垃圾概率为 $10/11$。**得分点**：给定类别的条件独立、分母为何加 2、log-sum-exp 归一化、零频率被平滑而非丢弃特征；对缺失的二值特征还需乘 $1-\phi$。`,
        },
        {
          q: "查询 0，三个邻居为 (位置,标签)=(1,1),(2,0),(3,0)。比较均匀与倒数距离投票；100 维均匀单位立方体中覆盖 10% 质量的等边邻域要多宽？",
          a: String.raw`均匀投票正类概率为 $1/3$，预测零。倒数距离权重为 $1,1/2,1/3$，正类概率 $1/(1+1/2+1/3)=6/11$，预测一。等边邻域体积为 $\ell^{100}$，令其等于 0.1，得 $\ell=0.1^{1/100}\approx0.977237$，几乎跨满每个轴。**得分点**：权重归一化、距离零点策略、先在训练集标准化、说明均匀满维假设而非泛化为所有高维数据。`,
        },
        {
          q: "AdaBoost 初始 4 个样本等权，弱分类器只错一个。从指数损失推 alpha 和下一轮权重，说明错率为 0、1/2 时怎么办。",
          a: String.raw`把新旧损失比写为 $Z(\alpha)=(1-\varepsilon)e^{-\alpha}+\varepsilon e^\alpha$，求导设零得 $\alpha=\tfrac12\log[(1-\varepsilon)/\varepsilon]$。$\varepsilon=1/4$ 时 $\alpha=\tfrac12\log3$，$Z=\sqrt3/2$。三个正确点乘 $e^{-\alpha}$ 后归一化各为 $1/6$，错点为 $1/2$，平均指数损失变为 0.866025。$\varepsilon=0$ 时系数趋无穷，可停止或限制；$\varepsilon=1/2$ 时系数为零。**得分点**：指数损失分组、导数、归一化常数、错误样本增权及噪声敏感性。`,
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

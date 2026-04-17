# Equation Family Expansion Plan v1

本文档用于把当前系统从“逐题型补洞”推进到“按代数家族规划扩展”。

目标不是立刻扩更多 parser 或 generator 分支，而是先回答四个问题：

1. 当前已经稳定支持了哪些代数家族。
2. 当前 operation 语义覆盖到了哪些教学动作。
3. 下一阶段几个候选家族分别会给 Template / AI Prompt / Render / Fallback 带来什么影响。
4. 哪一个家族最适合作为下一个试点，用来验证 DSL v2 的扩展方式。

## 1. 当前已支持的代数家族

### 1.1 一元一次方程

当前覆盖的主形态：

- `ax=c`
- `ax+b=c`
- `a(x+b)=c`
- `a(x+b)+d=c`
- `ax+b=cx+d`
- `a(x+b)+c(x+d)=e`

当前稳定复用的 operation：

- `write_equation`
- `move_term`
- `expand_brackets`
- `combine_like_terms`
- `simplify_expression`
- `divide_both_sides`
- `final_answer`

家族特征：

- 这是当前 operation 体系的骨架来源。
- Template / AI Prompt / Render / Fallback 都已经围绕这条链路跑通。

### 1.2 一元一次不等式

当前覆盖的主形态：

- `ax+b relation c`
- `a(x+b) relation c`

当前稳定复用或新增的 operation：

- 复用：`write_equation`、`move_term`、`expand_brackets`、`simplify_expression`、`divide_both_sides`
- 新增：`solve_inequality`、`flip_inequality_sign`

家族特征：

- 它证明了“同一个代数动作在不同家族里可以带不同语义后果”，例如 `divide_both_sides` 在不等式里要关心方向。
- Render v2 已经开始读取 operation，而不只是 `kind`。

### 1.3 分式方程

当前覆盖的主形态：

- `x/a+b=c`
- `(x+a)/b=c`
- `x/a+x/b=c`

当前稳定复用或新增的 operation：

- 复用：`write_equation`、`move_term`、`combine_like_terms`、`simplify_expression`、`divide_both_sides`、`final_answer`
- 新增语义重点：`clear_denominator`、`multiply_both_sides`

家族特征：

- 它证明了 operation 不只是“算了什么”，还要表达“为什么这样算”，例如最小公倍数与去分母。
- 分式显示、提示语义和中间步骤自然度，已经开始要求 Render 读更细的数学语义。

## 2. 当前 operation 资产盘点

当前 DSL v2 已稳定使用的 operation：

- `write_equation`
- `move_term`
- `expand_brackets`
- `combine_like_terms`
- `clear_denominator`
- `multiply_both_sides`
- `divide_both_sides`
- `simplify_expression`
- `final_answer`
- `solve_inequality`
- `flip_inequality_sign`

可以把它们粗分成四类：

### 2.1 结构变形

- `write_equation`
- `move_term`
- `expand_brackets`
- `combine_like_terms`
- `simplify_expression`

### 2.2 等式 / 不等式两边同步操作

- `clear_denominator`
- `multiply_both_sides`
- `divide_both_sides`

### 2.3 结论表达

- `final_answer`
- `solve_inequality`

### 2.4 关系语义修正

- `flip_inequality_sign`

这套资产说明：系统已经不只是“按 kind 渲染步骤”，而是开始具备“跨家族复用基础数学动作”的能力。

## 3. 下一阶段候选代数家族

下面给出建议候选，并按“operation 复用度”和“主链路侵入度”做判断。

### 3.1 分式不等式

是否可复用现有 operation：

- 高复用。
- 可直接复用 `write_equation`、`move_term`、`clear_denominator`、`multiply_both_sides`、`combine_like_terms`、`simplify_expression`、`divide_both_sides`、`solve_inequality`、`flip_inequality_sign`。

建议新增 operation：

- `state_domain_restriction`
  - 用于表达“分母不为 0”的限制条件。
- `intersect_solution_set`
  - 用于表达“代数解”和“定义域限制”取交集后的最终结论。
- 可选预留：`analyze_sign_interval`
  - 如果后续进入更完整的分式不等式与符号法分析。

对 Template / AI Prompt / Render / Fallback 的影响：

- Template：大部分仍可沿用 `transform` / `answer` 模板。
- AI Prompt：需要教 AI 区分“计算得到的不等式解”与“结合限制后的最终可取范围”。
- Render：需要对“限制条件”和“取交集”给出轻量提示。
- Fallback：需要把“不支持的分式不等式形态”与“不支持的普通不等式”分开说明。

复杂度判断：

- 中等。
- 难点不在基础变形，而在定义域与解集表达。

### 3.2 整式化简

是否可复用现有 operation：

- 中高复用。
- 可复用 `expand_brackets`、`combine_like_terms`、`simplify_expression`。

建议新增 operation：

- `rewrite_expression`
  - 用于表达重排或标准化书写。
- 可选预留：`collect_like_terms`
  - 如果后续想把“合并同类项”与“先收集再合并”分开。

对 Template / AI Prompt / Render / Fallback 的影响：

- Template：大部分可以复用 `expand` / `transform`。
- AI Prompt：需要从“解方程口径”切到“化简表达式口径”。
- Render：动画可以复用，但 answer 区和标签要从“答案”转成“化简结果”。
- Fallback：需要单独的 unsupported 文案，因为这不再是 equation family。

复杂度判断：

- 中等偏低。
- 风险不在数学，而在当前产品叙事更偏“解题”而不是“化简”。

### 3.3 因式分解基础

是否可复用现有 operation：

- 部分复用。
- 可复用 `write_equation`、`simplify_expression`，但核心动作不可复用。

建议新增 operation：

- `factor_out_common_term`
- `factor_as_binomial`
- `factor_as_square`

对 Template / AI Prompt / Render / Fallback 的影响：

- Template：需要新增“拆成因式”的视觉模板，现有 move / expand 不够。
- AI Prompt：需要从“形变后更接近答案”切到“从和式转成积式”的教学口径。
- Render：需要有更明确的“括号形成”或“因式聚合”提示。
- Fallback：家族边界要单列。

复杂度判断：

- 中等。
- 问题在于这是新的表达目标，不再是单纯求未知数。

### 3.4 一元二次方程基础

可进一步阅读 [Quadratic Equation Family Plan v1](./quadratic-equation-family-plan-v1.md)，这里先保留总纲级摘要。

如果下一步进入求根公式型，可继续阅读 [Quadratic Formula Plan v1](./quadratic-formula-plan-v1.md)。

是否可复用现有 operation：

- 中等复用。
- 仍可复用 `write_equation`、`move_term`、`expand_brackets`、`combine_like_terms`、`simplify_expression`、`divide_both_sides`。

建议新增 operation：

- `factor_quadratic`
- `split_into_linear_factors`
- `apply_zero_product_rule`
- `extract_square_root`
- `compute_discriminant`
- `apply_quadratic_formula`
- `collect_solution_branches`

对 Template / AI Prompt / Render / Fallback 的影响：

- Template：需要支持“一个步骤导向多个解分支”的表达。
- AI Prompt：需要理解分支结构，而不是单链路步骤。
- Render：当前单线性 step list 会开始吃紧，尤其在“零乘积法”和“开平方正负分支”这类步骤里。
- Fallback：必须把“支持因式分解型 / 开平方型 / 公式法型”与“暂不支持更复杂二次方程”区分开。

复杂度判断：

- 中高。
- 它是主干家族，下一步最适合先从因式分解型试点，而不是直接进入公式法。

### 3.5 二元一次方程组

可进一步阅读 [Linear System Family Plan v1](./linear-system-family-plan-v1.md)，先把代入法、消元法和结果分类的 operation 语义单独规划清楚，再进入试点实现。

是否可复用现有 operation：

- 部分复用。
- 可复用 `write_equation`、`move_term`、`simplify_expression`、`divide_both_sides`。

建议新增 operation：

- `substitute_variable`
- `eliminate_variable`
- `solve_sub_equation`
- `back_substitute`
- `final_solution_pair`

对 Template / AI Prompt / Render / Fallback 的影响：

- Template：需要同时表达两条方程之间的关系。
- AI Prompt：需要知道替代链条和消元目标变量。
- Render：当前单公式定位系统需要扩展到双行甚至双列语义。
- Fallback：输入形态和 unsupported 原因要大改。

复杂度判断：

- 高。
- 它很重要，但对当前单公式渲染假设冲击最大。

## 4. 扩展路线图

建议路线图如下：

### 第一优先级

- 分式不等式

原因：

- 复用现有 operation 最多。
- 直接检验“方程家族语义”和“不等式家族语义”能否组合。
- 仍然保持单变量、单链路推导，对当前 Render 和 Template 最友好。

### 第二优先级

- 一元二次方程基础

原因：

- 是初中代数主干家族。
- 能推动 DSL 从“线性操作”走向“分支解集操作”。

### 第三优先级

- 二元一次方程组

原因：

- 教学价值高。
- 但它要求渲染层从单公式语义升级到多公式关系语义。

### 第四优先级

- 整式化简
- 因式分解基础

原因：

- 数学上重要，但它们更偏“表达式处理家族”，会把产品叙事从“解方程/不等式”拉向“表达式加工”。
- 更适合在 equation family 稳定后单独开一个 expression family 规划。

## 5. 下一个试点家族

建议选定：

- 分式不等式

### 5.1 选择理由

1. 它是当前三条已支持主线的自然交叉点。
2. 它可以最大化复用现有 operation，而不是从零造一套新的模板语言。
3. 它能检验 DSL v2 是否真的具备“家族组合能力”，而不是只会一条家族一条家族地堆分支。
4. 它仍然保持单未知数、线性步骤序列，对当前 Scene / StepCard / AnswerOverlay 的压力相对可控。

## 6. 试点 operation 草案

以下草案不是立刻实现，而是下一阶段扩展时的设计基线。

### 6.1 可直接复用的 operation

- `write_equation`
- `move_term`
- `expand_brackets`
- `combine_like_terms`
- `clear_denominator`
- `multiply_both_sides`
- `divide_both_sides`
- `simplify_expression`
- `solve_inequality`
- `flip_inequality_sign`

### 6.2 建议新增的 operation

#### `state_domain_restriction`

用途：

- 表达分母不为 0 或未知数不可取某值。

建议字段：

```ts
{
  type: 'state_domain_restriction';
  restrictedLatex?: string;
  reasonLatex?: string;
}
```

示例语义：

- `x-2\\ne0`
- `x\\ne2`

#### `intersect_solution_set`

用途：

- 把代数求得的不等式解与定义域限制合并成最终结论。

建议字段：

```ts
{
  type: 'intersect_solution_set';
  baseSolutionLatex?: string;
  restrictionLatex?: string;
  resultLatex?: string;
}
```

示例语义：

- 基础解：`x>2`
- 限制：`x\\ne3`
- 最终：`x>2, x\\ne3`

#### 预留：`analyze_sign_interval`

用途：

- 当后续进入更完整的分式不等式时，用于表达“按零点与不可取值分区间分析正负”。

建议字段：

```ts
{
  type: 'analyze_sign_interval';
  criticalPointsLatex?: string[];
  selectedIntervalsLatex?: string[];
}
```

这个 operation 不建议在试点第一阶段就落地，但应该在 DSL 规划里留出位置。

补充：

- 如果下一阶段开始做变量分母分式不等式，还需要和 `find_critical_points` 成对设计。
- 详见 [Variable-Denominator Fraction Inequality Plan v1](./variable-denominator-fraction-inequality-plan-v1.md)。
- 如果下一阶段开始做二元一次方程组，还需要把“跨方程操作”和“结果分类”单独建模。
- 详见 [Linear System Family Plan v1](./linear-system-family-plan-v1.md)。

### 6.3 Template 影响草案

- `state_domain_restriction`
  - 先映射到 `transform`
  - 默认弱动作，不做复杂动画
- `intersect_solution_set`
  - 映射到 `answer`
  - 允许作为 `solve_inequality` 前的过渡结论，或最终答案前的最后一步
- `analyze_sign_interval`
  - 初期仍映射到 `transform`
  - Render 先只做轻提示，不做数轴

### 6.4 AI Prompt 影响草案

需要在 note/token/action prompt 里增加三条规则：

1. 区分“代数化简得到的中间不等式”与“结合限制后的最终解集”。
2. 对 `state_domain_restriction` 优先输出“限制条件”口径，而不是“计算右边”这类泛化 note。
3. 对 `intersect_solution_set` 优先输出“综合定义域和不等式解”的 note。

### 6.5 Render 影响草案

第一阶段只做轻量语义提示：

- `state_domain_restriction`
  - 用次级颜色强调限制表达式
- `intersect_solution_set`
  - 在答案区前给一个轻量“结合限制条件”提示
- `solve_inequality`
  - 保留当前 answer overlay

这保证试点仍然遵守“主链路不变，只新增 operation 语义”的原则。

### 6.6 Fallback 影响草案

分式不等式需要把 unsupported 进一步细分：

- 支持：常系数分式不等式、可直接同乘正数去分母的形态
- 暂不支持：需要完整符号法、区间法、数轴法的复杂形态

fallback 文案建议显式指出：

- 是“不等式家族已识别但当前子形态未支持”
- 还是“整体输入不在当前代数家族支持范围内”

## 7. 为什么此时做家族规划更优

继续零散扩题型的问题是：

1. 容易把 operation 命名做成局部补丁，后续跨家族无法复用。
2. 容易让 Template / AI Prompt / Render 在每轮扩题时各补各的，语义逐步漂移。
3. 容易让 fallback 只有 parser 层面的“不支持”，却没有家族层面的边界说明。
4. 容易出现“能生成步骤，但语义不完整，出片风格不稳定”的中间状态。

先做家族规划的好处是：

1. 先定义“哪些 operation 是共用骨架，哪些 operation 是家族特有语义”。
2. 后续扩题时可以先看 operation 路线图，而不是先写 parser 正则。
3. 可以提前判断 Render 是否需要新语义层，而不是等画面发虚后再补。
4. 可以把试点做成 DSL 设计验证，而不是单个题型的临时胜利。

结论：

- 当前系统已经从“题型脚本”进入“operation 语义系统”阶段。
- 下一步最值得验证的不是再多支持一个孤立题型，而是验证 operation 能否跨家族组合。
- 因此，下一个试点应选“分式不等式”。

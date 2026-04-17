# Quadratic Formula Plan v1

本文档只做判别式 / 求根公式型一元二次方程规划，不直接进入实现。

目标是先把四件事定清楚：

1. 公式法型一元二次方程的优先支持范围。
2. 判别式、根的个数分类和最终答案形态的 operation 设计方向。
3. 它与现有 Generator / Template / AI Prompt / Render / Fallback 主链路的兼容方式。
4. 下一阶段最适合先试点哪一个样例。

## 1. 为什么要求根公式型需要单列规划

因式分解型和开平方型已经把“多分支解”带进了系统，但它们还没有真正引入下面四个新问题：

### 1.1 判别式本身是一个中间语义

在线性题和当前已支持的二次试点里，中间步骤大多是直接朝答案推进的形变。

求根公式型不是这样。

它通常先经过：

- 整理到 `ax^2+bx+c=0`
- 计算 `\Delta=b^2-4ac`
- 根据 `\Delta` 判断根的情况
- 再决定是否进入公式求解

这意味着 `\Delta` 不是普通算术结果，而是后续分支策略的语义前提。

### 1.2 根的个数需要先分类

公式法型第一次稳定引入“先判断有几个实数根，再决定最终表达”的流程：

- `\Delta>0`：两个不同实根
- `\Delta=0`：一个重根
- `\Delta<0`：无实数解

这和因式分解型、开平方型最大的不同在于：系统不再只是在“分支求解”，而是在“先分类，再决定是否分支”。

### 1.3 无实数解需要正式表达

当前已支持的线性、不等式、分式不等式和二次试点，最终都还能落到实数范围内的结论。

求根公式型第一次需要稳定表达：

- 没有实数解；
- 不进入 `x_1` / `x_2` 两个分支；
- 最终 answer 不再是普通单值，也不是普通双分支集合。

### 1.4 公式步骤更长，渲染压力更大

`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}` 这种步骤比当前系统的大多数中间式都更长。

它会带来几类新压力：

- 主公式和代入式很容易过长；
- `\Delta` 与最终根式之间需要有语义连接；
- note 不能只说“代入公式”，还要说清“为什么现在可以这样做”。

## 2. 规划范围

本轮规划对象限定为“可整理为标准型并在实数范围内讨论”的求根公式型一元二次方程。

至少覆盖三种结果形态：

1. 两个不同实根
2. 一个重根
3. 无实数解

当前不在本轮优先范围内：

- 复数根表达
- 配方法作为独立求解路线
- 含分母、含根式或更复杂前置变形的一般二次方程
- 二次不等式

## 3. 结果形态路线图

建议把公式法型按结果形态拆成三个阶段，而不是一次性全上。

### 第一阶段：两个不同实根

典型样例：

- `x^2-2x-1=0`
- `2x^2+x-1=0`

特征：

- `\Delta>0`
- `apply_quadratic_formula` 会自然导出两个分支
- 可以直接复用现有 `collect_solution_branches`

对当前答案模型的关系：

- 和因式分解型、开平方型一样，最终仍然是“两个解”的汇总；
- 但分支的来源不再是积式或 `\pm`，而是求根公式中的 `\pm`。

这是最适合先试点的结果形态，因为它能最大化复用当前“多分支解 -> 解集汇总”的语义资产。

### 第二阶段：一个重根

典型样例：

- `x^2-2x+1=0`
- `2x^2-4x+2=0`

特征：

- `\Delta=0`
- 公式仍可用，但最终只有一个实数解
- `collect_solution_branches` 可以继续复用，但需要允许“一个分支收束成单个解”

对当前答案模型的关系：

- 它处在“多分支系统”和“单答案展示”之间；
- 系统需要允许“按公式求解，但最终答案只剩一个重根”。

这一步的价值在于验证：branch semantics 不等于一定有两个不同结果。

### 第三阶段：无实数解

典型样例：

- `x^2+2x+5=0`
- `x^2+4x+8=0`

特征：

- `\Delta<0`
- 不应继续进入实数范围下的求根分支
- 需要单独表达“无实数解”

对当前答案模型的关系：

- 这是第一次出现“分类完成后，不进入求值分支”的二次方程结果；
- 它会逼着系统把“最终结论”从结果值扩展到结果状态。

## 4. operation 设计方向

本轮只做规划，不把这些 operation 落到代码中。

### 4.1 `compute_discriminant`

用途：

- 计算并展示 `\Delta=b^2-4ac`；
- 把系数与判别式建立明确对应关系；
- 为后续根的个数分类和公式代入做准备。

最小建议字段：

```ts
{
  type: 'compute_discriminant';
  coefficientsLatex?: {a: string; b: string; c: string};
  substitutionLatex?: string;
  discriminantLatex?: string;
}
```

### 4.2 `classify_root_count`

用途：

- 根据 `\Delta` 的正负判断根的个数；
- 明确告诉后续步骤是进入双根、重根还是无实数解。

最小建议字段：

```ts
{
  type: 'classify_root_count';
  discriminantLatex?: string;
  relationLatex?: string;
  classification?: 'two_real_roots' | 'double_root' | 'no_real_root';
}
```

这是求根公式型相对当前二次试点最关键的新 operation 之一，因为它承担“从计算结果进入答案形态判断”的语义跳转。

### 4.3 `apply_quadratic_formula`

用途：

- 把 `a`、`b`、`c` 代入求根公式；
- 在 `\Delta>=0` 时给出一个或两个分支结果。

最小建议字段：

```ts
{
  type: 'apply_quadratic_formula';
  coefficientsLatex?: {a: string; b: string; c: string};
  discriminantLatex?: string;
  formulaLatex?: string;
  branchesLatex?: string[];
}
```

### 4.4 `collect_solution_branches`

用途：

- 把公式得到的根收束成最终答案；
- 兼容两个不同实根和一个重根两种结果。

最小建议字段：

```ts
{
  type: 'collect_solution_branches';
  branchesLatex?: string[];
  resultLatex?: string;
}
```

和当前系统的关系：

- 两个不同实根时，可直接复用当前多分支解模型；
- 一个重根时，可以允许 `branchesLatex` 退化为单元素数组；
- 它仍然适合作为最终答案汇总点。

### 4.5 可选：`state_no_real_solution`

用途：

- 当 `\Delta<0` 时，单独表达“在实数范围内无解”；
- 避免把“无实数解”硬塞进 `collect_solution_branches`。

最小建议字段：

```ts
{
  type: 'state_no_real_solution';
  discriminantLatex?: string;
  conclusionLatex?: string;
}
```

这个 operation 本轮只做预留。

如果后续实现时希望最小化新增 operation，也可以先采用：

```text
compute_discriminant
-> classify_root_count
-> final_answer
```

来表达无实数解。

## 5. 三种结果形态的最小链路草案

### 5.1 两个不同实根

```text
write_equation
-> simplify_expression
-> compute_discriminant
-> classify_root_count
-> apply_quadratic_formula
-> collect_solution_branches
```

典型样例：

- `x^2-2x-1=0`

### 5.2 一个重根

```text
write_equation
-> simplify_expression
-> compute_discriminant
-> classify_root_count
-> apply_quadratic_formula
-> collect_solution_branches
```

典型样例：

- `x^2-2x+1=0`

说明：

- 链路和“两不同实根”一致；
- 真正不同的是 `classify_root_count` 和最终答案形态。

### 5.3 无实数解

最小保守链：

```text
write_equation
-> simplify_expression
-> compute_discriminant
-> classify_root_count
-> final_answer
```

若后续决定显式建模：

```text
write_equation
-> simplify_expression
-> compute_discriminant
-> classify_root_count
-> state_no_real_solution
```

典型样例：

- `x^2+2x+5=0`

## 6. 与现有分支 / 答案模型的关系

### 6.1 两个不同实根

- 可以直接复用现有 `collect_solution_branches` 语义；
- answer label 仍然可以是“两个解”或“解集”；
- 关键变化在于分支来源从“零积法则 / 开平方”变成“公式中的 `\pm`”。

### 6.2 一个重根

- 需要允许“经过分支型链路，但最后只得到一个值”；
- 这要求 answer 语义不要把“是否有分支”简单等同于“最终一定有两个不同解”。

### 6.3 无实数解

- 这是当前系统答案模型里最不一样的一类；
- 最终表达不是值、不是区间、也不是多个解，而是“无实数解”这个状态结论；
- 这也是推荐先做规划、暂不急着实现的关键原因。

## 7. 对主链路各层的影响

### 7.1 Generator native v2

- 仍建议先在 native v2 中表达完整 operation 链；
- 继续沿用 v2 -> v1 投影；
- 不需要第一轮就把所有一般二次方程都纳入。

### 7.2 Template-aware v2

- `compute_discriminant`、`classify_root_count`、`apply_quadratic_formula` 初期都可以继续挂在 `transform` / `answer` 大类下；
- 但模板需要逐步接受“中间步骤不是直接解未知数，而是在判断根的情况”。

### 7.3 AI Prompt v2

- 需要明确告诉 AI：判别式不是普通数值，而是后续分类依据；
- 需要区分“两个实根”“一个重根”“无实数解”三种不同结论口径；
- 对 `apply_quadratic_formula` 的 note 要求会高于当前 `extract_square_root`。

### 7.4 Render v2

- 求根公式步骤更长，可能需要更紧凑的 LaTeX 展示和更谨慎的标签长度；
- `classify_root_count` 最好有轻量语义提示，例如“先判断根的个数”；
- “无实数解”需要与普通答案卡片区分开，但不必第一轮就引入新容器结构。

### 7.5 Fallback

- unsupported 文案需要明确区分：
  - 支持因式分解型；
  - 支持开平方型；
  - 支持求根公式型中的哪些标准形；
  - 暂不支持复数根和更复杂前置变形。

## 8. 推荐试点样例

建议把后续第一个求根公式型试点定为：

- `x^2-2x-1=0`

推荐理由：

1. 它确实需要公式法，不会和当前已支持的因式分解型完全重叠。
2. `\Delta=8>0`，能直接验证“两个不同实根”这条主链。
3. 系数简单，代入公式的书写压力还在可控范围内。
4. 它会自然暴露根式结果显示、长公式 note 和答案汇总的真实压力。

建议同时保留两个后续样例作为规划锚点：

- `x^2-2x+1=0`
  - 用于验证重根。
- `x^2+2x+5=0`
  - 用于验证无实数解。

## 9. 为什么先做规划再试点更优

如果现在直接进实现，很容易把三类问题混在一起：

- 判别式计算；
- 根的个数分类；
- 最终答案到底是两个根、一个根还是无实数解。

这样做的风险是：

1. Generator 先写出“能算”的链路，但 operation 语义不稳。
2. Render 被迫同时处理长公式、多分支和无解状态，第一轮就过载。
3. `collect_solution_branches` 与 `final_answer` 的职责边界会不清楚。

先做规划更稳妥，因为它先把最难的边界拆开了：

- 哪些情况仍能复用当前多分支模型；
- 哪些情况需要新的分类 operation；
- 哪些情况可能需要单独的“无实数解”表达。

## 10. 为什么此时进入 Quadratic Formula Plan v1 最合理

当前系统已经完成了：

- 线性方程；
- 一元一次不等式；
- 分式方程；
- 分式不等式；
- 因式分解型二次方程；
- 开平方型二次方程。

下一步真正缺的，不是继续在已知链路上补更多局部变形，而是补上二次家族里最后一个主干求解路线。

求根公式型正好承担这个角色，因为它会把以下能力一起暴露出来：

- 判别式中间语义；
- 根的个数分类；
- 更长公式步骤；
- 无实数解表达；
- 多分支答案与非分支答案的并存。

所以现在进入 `Quadratic Formula Plan v1` 是顺序上最合理的一步：

1. 它延续了二次家族，而不是突然跳到新的大类。
2. 它补的是当前二次体系最关键的缺口。
3. 它先用规划把边界讲清，再进入试点实现，能明显降低返工成本。

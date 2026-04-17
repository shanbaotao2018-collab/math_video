# Quadratic Equation Family Plan v1

本文档只做一元二次方程家族规划，不直接进入实现。

目标是先把三件事定清楚：

1. 一元二次方程家族的优先支持范围。
2. 它相对当前线性 / 不等式 / 分式体系新增了哪些 operation 语义。
3. 下一阶段最适合从哪个二次子家族开始试点。

## 1. 为什么一元二次方程需要单列家族规划

一元二次方程不是“在线性方程后面多补几个 parser 分支”。

它第一次系统性引入下面三类新问题：

### 1.1 多分支解

线性家族的大多数最终答案都能写成单表达式，例如：

- `x=3`
- `x>2`
- `(-2,1)`

但一元二次方程的最终答案经常是：

- `x=1` 或 `x=3`
- `x=\\pm2`
- `x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}`

这说明系统不再只是“把最后一行当答案”，还要开始表达“分支解集”。

### 1.2 可能无实数解

线性方程和当前已支持的不等式，大多数情况下最终都还能落到实数范围内的单一结论。

一元二次方程第一次稳定引入：

- 两个实数解；
- 一个重根；
- 无实数解。

这意味着 operation 不只是求值动作，还要能表达“判定没有实数解”。

### 1.3 最终答案不再总是单表达式

在线性体系里，answer label 通常只要显示“最终答案”或“不等式解”。

在二次体系里，最终答案可能是：

- 两个独立解值；
- 一组分支；
- 一个重根；
- “无实数解”。

因此二次家族会第一次真正推动：

- answer semantics 从单结果转向解集；
- step semantics 从单链路转向分支收集。

## 2. 规划范围

本轮规划对象限定为三个一元二次方程子家族：

1. 因式分解型
2. 开平方型
3. 判别式 / 求根公式型

不在本轮优先范围内的内容：

- 配方法作为独立完整家族
- 复数范围求解
- 高阶多项式方程
- 二次不等式
- 二元二次或多变量系统

## 3. 一元二次方程家族扩展路线图

建议路线图如下：

### 第一阶段：因式分解型

目标样例：

- `x^2-5x+6=0`
- `x^2=9`
- `(x-2)(x+1)=0`

原因：

- 最接近当前线性体系的“先变形，再出结论”链路；
- 可以先把“多解分支”这件事引入系统；
- 不需要一上来就把判别式、根号和公式渲染一起拉进来。

### 第二阶段：开平方型

目标样例：

- `(x-1)^2=9`
- `x^2=16`
- `2(x+3)^2=18`

原因：

- 它第一次稳定引入 `\\pm` 分支；
- 但仍然比判别式 / 求根公式型更短、更直观；
- 可以验证“一个核心步骤导出两个对称分支”的表达能力。

### 第三阶段：判别式 / 求根公式型

目标样例：

- `x^2-4x+3=0`
- `2x^2+x-1=0`
- `x^2+2x+5=0`

原因：

- 它覆盖面最大，但也是当前主链路改动压力最大的子家族；
- 需要明确表达 `\\Delta`、平方根、公式代入和“无实数解”；
- 更适合作为二次家族语义稳定后的扩展，而不是第一跳。

## 4. 子家族拆分

### 4.1 因式分解型

典型样例：

- `x^2-5x+6=0`
- `(x-2)(x+1)=0`
- `x^2-4=0`

当前可复用的 operation：

- `write_equation`
- `move_term`
- `simplify_expression`
- `expand_brackets`
- `combine_like_terms`

这些 operation 主要承担：

- 整理到标准型；
- 把已有括号展开或反向观察成适合因式分解的形态；
- 在分支前把表达式规范化。

建议新增 operation 草案：

- `factor_quadratic`
  - 用于把二次三项式改写为因式乘积。
- `split_into_linear_factors`
  - 用于明确展示积式中的两个一次因式。
- `apply_zero_product_rule`
  - 用于表达“两个因式乘积为 0，则至少一个因式为 0”。
- `collect_solution_branches`
  - 用于把 `x=...`、`x=...` 两条子结论汇总为最终解集。

最小链路草案：

```text
write_equation
-> simplify_expression
-> factor_quadratic
-> split_into_linear_factors
-> apply_zero_product_rule
-> collect_solution_branches
```

主链路影响：

- Template：需要支持“积式 -> 两个一次方程”的教学表达。
- AI Prompt：需要理解“零乘积法”是分支开始点。
- Render：需要轻量表达“从一个积式导出两个因式条件”。
- Fallback：要把“支持可因式分解型”和“暂不支持公式法型”明确分开。

### 4.2 开平方型

典型样例：

- `x^2=9`
- `(x-1)^2=16`
- `2(x+3)^2=18`

当前可复用的 operation：

- `write_equation`
- `move_term`
- `simplify_expression`
- `divide_both_sides`

这些 operation 主要承担：

- 把平方项单独留在一边；
- 把系数化成 1；
- 把方程整理成“某个平方 = 常数”的形态。

建议新增 operation 草案：

- `extract_square_root`
  - 用于表达“两边开平方，得到正负两个分支”。
- `collect_solution_branches`
  - 用于把 `x=a` 与 `x=b` 汇总为最终解集。

可选预留：

- `normalize_square_form`
  - 如果后续需要把“整理成 `(x-a)^2=b`”单独做成语义步骤。

最小链路草案：

```text
write_equation
-> move_term
-> simplify_expression
-> divide_both_sides
-> extract_square_root
-> collect_solution_branches
```

主链路影响：

- Template：需要能接受 `\\pm` 分支语义。
- AI Prompt：需要从“求一个值”切到“开平方会导出两个相反结果”。
- Render：需要明确 `\\pm` 不是普通文本，而是两个分支的来源。
- Fallback：要区分“能整理成平方型”与“不能直接开平方”的情况。

### 4.3 判别式 / 求根公式型

典型样例：

- `x^2-4x+3=0`
- `2x^2+x-1=0`
- `x^2+2x+5=0`

当前可复用的 operation：

- `write_equation`
- `move_term`
- `simplify_expression`
- `divide_both_sides`

这些 operation 主要承担：

- 先整理到 `ax^2+bx+c=0` 标准型；
- 在代入公式前把系数和常数项明确下来。

建议新增 operation 草案：

- `compute_discriminant`
  - 用于求 `\\Delta=b^2-4ac` 并判断解的情况。
- `apply_quadratic_formula`
  - 用于代入求根公式。
- `collect_solution_branches`
  - 用于把两个公式结果汇总为最终解集。

可选预留：

- `state_no_real_solution`
  - 如果希望把“无实数解”单独建模，而不是只通过 answer note 表达。

最小链路草案：

```text
write_equation
-> simplify_expression
-> compute_discriminant
-> apply_quadratic_formula
-> collect_solution_branches
```

主链路影响：

- Template：需要处理公式代入和长 LaTeX 步骤。
- AI Prompt：需要对 `\\Delta` 的教学口径单独建模。
- Render：可能第一次出现单步公式过长、需要更自然的分行或紧凑展示。
- Fallback：要把“公式法支持”和“暂不支持复数根”分开。

可进一步阅读 [Quadratic Formula Plan v1](./quadratic-formula-plan-v1.md)，把判别式、根的个数分类和“无实数解”这几类结果形态单独规划清楚后，再进入试点实现。

## 5. 新 operation 设计方向

本轮先不把这些 operation 落进代码，只给最小职责定义。

### 5.1 `factor_quadratic`

用途：

- 把 `x^2-5x+6` 这类标准二次式转成乘积形式。

最小建议字段：

```ts
{
  type: 'factor_quadratic';
  sourceLatex?: string;
  factoredLatex?: string;
}
```

### 5.2 `split_into_linear_factors`

用途：

- 把 `(x-2)(x-3)=0` 中的两个一次因式显式列出来，方便后续零乘积法。

最小建议字段：

```ts
{
  type: 'split_into_linear_factors';
  factorsLatex?: string[];
}
```

### 5.3 `apply_zero_product_rule`

用途：

- 表达“若两个因式的积为 0，则其中至少有一个因式为 0”。

最小建议字段：

```ts
{
  type: 'apply_zero_product_rule';
  factorsLatex?: string[];
  branchEquationsLatex?: string[];
}
```

### 5.4 `extract_square_root`

用途：

- 表达“两边开平方后得到正负两个分支”。

最小建议字段：

```ts
{
  type: 'extract_square_root';
  radicandLatex?: string;
  branchesLatex?: string[];
}
```

### 5.5 `compute_discriminant`

用途：

- 计算并解释 `\\Delta`，为判断根的情况和进入公式法做准备。

最小建议字段：

```ts
{
  type: 'compute_discriminant';
  coefficientsLatex?: {a: string; b: string; c: string};
  discriminantLatex?: string;
}
```

### 5.6 `apply_quadratic_formula`

用途：

- 把系数代入求根公式并给出两个根。

最小建议字段：

```ts
{
  type: 'apply_quadratic_formula';
  coefficientsLatex?: {a: string; b: string; c: string};
  formulaLatex?: string;
  branchesLatex?: string[];
}
```

### 5.7 `collect_solution_branches`

用途：

- 把分支步骤收束成最终解集。

最小建议字段：

```ts
{
  type: 'collect_solution_branches';
  branchesLatex?: string[];
  resultLatex?: string;
}
```

## 6. 与现有主链路的兼容方式

这轮规划的原则仍然是不推翻现有主链路：

```text
Generator native v2
-> Template-aware v2
-> AI Prompt v2
-> Render v2
-> Fallback
```

兼容思路如下：

### 6.1 Generator native v2

- 二次家族先在 native v2 里把新 operation 链建出来；
- 再继续沿用现有的 v2 -> v1 投影；
- 不要求第一轮就支持通用二次方程求解器。

### 6.2 Template-aware v2

- 第一阶段仍可复用 `transform` / `answer` 的大框架；
- 只需要让模板识别新的 operation label 和 note 口径；
- 真正复杂的“分支可视化”可以先推迟到试点稳定之后。

### 6.3 AI Prompt v2

- 需要让 prompt 知道哪些步骤是“分支产生点”；
- 需要让 prompt 区分“候选分支结果”和“最终解集”；
- 不要求 AI 去发明数学推导，只增强教学表达。

### 6.4 Render v2

- 第一阶段仍可保持线性 step list；
- 分支语义先通过 note、label、轻量 overlay 提示；
- 真正的树状分支渲染不应该在试点第一轮就引入。

### 6.5 Fallback

- 二次家族必须单列 unsupported 文案；
- 要明确区分：
  - 支持因式分解型；
  - 支持开平方型；
  - 支持判别式 / 求根公式型；
  - 暂不支持复数解或更复杂变形。

## 7. 推荐试点子家族

建议下一阶段先从“因式分解型”开始。

推荐样例：

- `x^2-5x+6=0`
- `x^2-4=0`

推荐理由：

1. 它最接近当前系统已稳定的“整理表达式 -> 得出结论”节奏。
2. 它第一次引入多解分支，但不必立刻引入根号、判别式和长公式。
3. 它能直接验证 `collect_solution_branches` 这类二次家族核心 operation 是否足够。
4. 它对 Render 和 Template 的压力相对可控，先不用把整套视觉系统改成树形。

推荐的最小 operation 草案：

```text
write_equation
-> simplify_expression
-> factor_quadratic
-> split_into_linear_factors
-> apply_zero_product_rule
-> collect_solution_branches
```

如果试点样例是 `x^2-4=0`，也可以允许：

```text
write_equation
-> factor_quadratic
-> split_into_linear_factors
-> apply_zero_product_rule
-> collect_solution_branches
```

## 8. 为什么现在做 Quadratic Equation Family Plan v1

此时继续深挖分式不等式，收益会开始递减。

原因不是分式不等式已经“完全做完”，而是当前系统下一步更缺的是新的主干能力：

- 多分支解；
- 无实数解；
- 解集汇总；
- 二次家族的最终 answer semantics。

这些问题不会在继续补分式不等式时自然出现，但它们迟早会成为整个初中代数体系扩展的主阻塞点。

所以现在先做 Quadratic Equation Family Plan v1，更有价值：

1. 它把系统从“线性变形链”推进到“分支解链”。
2. 它能提前暴露 Render / Template / Prompt 在多解表达上的边界。
3. 它为后续二次不等式、配方法、函数零点等更完整代数家族打基础。

这一步不是暂停扩展，而是在给下一类真正不同结构的问题先定骨架。

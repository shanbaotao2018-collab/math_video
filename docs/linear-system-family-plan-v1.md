# Linear System Family Plan v1

本文档只做二元一次方程组家族规划，不直接进入实现。

目标是先把四件事定清楚：

1. 二元一次方程组家族的优先支持范围。
2. 代入法与消元法各自更适合落在哪条 operation 链上。
3. 唯一解 / 无解 / 无穷多解三种结果形态如何进入现有 answer 语义。
4. 下一阶段最适合作为试点的是哪一条路径，以及为什么。

## 1. 为什么二元一次方程组需要单列家族规划

二元一次方程组不是“把一元一次方程复制两遍”。

它第一次系统性引入下面四类新问题：

### 1.1 多方程对象

当前系统的大部分 step 默认围绕“同一行公式如何变化”展开。

但方程组天然至少有两个对象：

- 第一条方程
- 第二条方程

后续不管是代入法还是消元法，都需要在 step 语义里明确“当前正在操作哪一条方程，另一条方程提供了什么信息”。

### 1.2 联立关系

一元家族大多是：

- 变形
- 求未知数
- 写答案

方程组则要求系统表达：

- 从一个方程里改写出某个变量；
- 把这个表达式代入另一条方程；
- 或者把两条方程对齐后相加 / 相减消元。

这说明 operation 不再只是“公式内部变形”，还要表达“方程与方程之间的联立关系”。

### 1.3 结果分类

二元一次方程组的结果不只是一个数值或一个区间。

它至少有三种稳定结果形态：

- 唯一解：`x=2, y=1`
- 无解：两条直线平行，不存在公共点
- 无穷多解：两条方程本质等价，有无数组公共点

这会推动系统进一步区分：

- 求解步骤
- 结果分类步骤
- 最终解对或状态结论

### 1.4 可能需要新的 scene 表达策略

当前 scene 默认是“题目 + 单列步骤 + 单答案区”。

方程组即使先不改主链路，也必须在规划层提前承认一个事实：

- 后续 render 可能需要更清晰的“双方程配对”表达。

否则即使 generator 能输出 step，画面上也可能无法清楚表达“代入来源”和“消元对象”。

## 2. 规划范围

本轮规划对象限定为：

1. 代入法型
2. 消元法型
3. 结果分类：
   - 唯一解
   - 无解
   - 无穷多解

不在本轮优先范围内的内容：

- 三元一次方程组
- 含分母的复杂方程组
- 非线性方程组
- 几何语义、图像法、矩阵法
- 一步以上的大规模预处理

## 3. 二元一次方程组家族路线图

建议路线图如下：

### 第一阶段：代入法最小试点

目标样例：

- `x+y=5, x-y=1`
- `y=2x+1, x+y=7`

原因：

- 它更贴近当前“一条链接一条链”的生成方式。
- 可以先把“从一条方程解出一个变量，再代入另一条方程”这条最小跨方程语义跑通。
- 对现有 scene 的冲击小于完整消元法。

### 第二阶段：消元法最小试点

目标样例：

- `x+y=5, x-y=1`
- `2x+y=7, 2x-y=1`

原因：

- 它第一次显式引入“对齐目标变量”和“相加 / 相减消元”的教学语义。
- 更能验证“多方程同步操作”的表达能力。

### 第三阶段：结果分类扩展

目标样例：

- 唯一解：`x+y=5, x-y=1`
- 无解：`x+y=2, x+y=5`
- 无穷多解：`x+y=2, 2x+2y=4`

原因：

- 这一步验证方程组 answer 模型不只会输出有序数对，还能输出状态结论。
- 它和当前二次方程里“无实数解”的经验相连，但对象更复杂。

## 4. 路径拆分

### 4.1 代入法型

典型样例：

- `x+y=5, x-y=1`
- `y=2x+1, x+y=7`
- `2x+y=8, y=x+2`

当前可复用的 operation：

- `write_equation`
- `move_term`
- `simplify_expression`
- `divide_both_sides`
- `combine_like_terms`
- `final_answer`

这些 operation 主要承担：

- 把某条方程整理成 `x=...` 或 `y=...`
- 在代入后继续按一元一次方程思路化简
- 在最后把单变量答案补成解对

建议新增 operation 草案：

#### `rewrite_equation_for_substitution`

用途：

- 把某一条方程改写成适合代入的形式，例如 `y=5-x`。

建议字段：

```ts
{
  type: 'rewrite_equation_for_substitution';
  sourceEquationLatex?: string;
  targetVariableLatex?: string;
  rewrittenLatex?: string;
}
```

#### `substitute_expression`

用途：

- 把改写出的表达式代入另一条方程。

建议字段：

```ts
{
  type: 'substitute_expression';
  sourceVariableLatex?: string;
  substitutedExpressionLatex?: string;
  sourceEquationLatex?: string;
  targetEquationLatex?: string;
}
```

#### `solve_single_variable_equation`

用途：

- 明确说明“联立之后，当前已经转成一元一次方程求某个变量”。

建议字段：

```ts
{
  type: 'solve_single_variable_equation';
  variableLatex?: string;
  resultLatex?: string;
}
```

#### `back_substitute_solution`

用途：

- 把已经求出的一个变量带回某条原方程或中间方程，求另一个变量。

建议字段：

```ts
{
  type: 'back_substitute_solution';
  knownSolutionLatex?: string;
  targetEquationLatex?: string;
  resultLatex?: string;
}
```

#### `collect_system_solution`

用途：

- 把两个单变量结果汇总为有序数对或系统最终答案。

建议字段：

```ts
{
  type: 'collect_system_solution';
  solutionPairLatex?: string;
  classification?: 'unique_solution' | 'no_solution' | 'infinite_solutions';
}
```

最小链路草案：

```text
write_equation
-> rewrite_equation_for_substitution
-> substitute_expression
-> solve_single_variable_equation
-> back_substitute_solution
-> collect_system_solution
```

主链路影响：

- Template：前几步仍可先映射到 `transform`，最后一步映射到 `answer`。
- AI Prompt：需要学会区分“被代入的方程”和“代入到哪一条方程”。
- Render：至少要能轻提示“这一行来自哪一条方程”。
- Fallback：要明确说明当前只支持最小代入法形态。

### 4.2 消元法型

典型样例：

- `x+y=5, x-y=1`
- `2x+y=7, 2x-y=1`
- `3x+2y=8, 3x-2y=4`

当前可复用的 operation：

- `write_equation`
- `simplify_expression`
- `combine_like_terms`
- `divide_both_sides`
- `final_answer`

这些 operation 主要承担：

- 消元后的单变量方程继续按一元思路处理
- 化简相加 / 相减后的结果
- 把最终数值整理成标准答案

建议新增 operation 草案：

#### `eliminate_variable`

用途：

- 表达“将两条方程相加或相减，使某个变量消去”。

建议字段：

```ts
{
  type: 'eliminate_variable';
  eliminatedVariableLatex?: string;
  methodLatex?: 'add' | 'subtract';
  sourceEquationsLatex?: string[];
  resultEquationLatex?: string;
}
```

#### `solve_single_variable_equation`

用途：

- 消元之后转为一元一次方程，继续求出剩余变量。

代入法与消元法都应复用这个 operation，而不是各自发明一个。

#### `back_substitute_solution`

用途：

- 将消元得到的变量值带回原方程，求出另一个变量。

#### `collect_system_solution`

用途：

- 汇总唯一解或结果状态。

最小链路草案：

```text
write_equation
-> eliminate_variable
-> solve_single_variable_equation
-> back_substitute_solution
-> collect_system_solution
```

主链路影响：

- Template：需要表达“双方程 -> 一条新方程”的过渡。
- AI Prompt：要理解“消去的是哪个变量”和“相加还是相减”。
- Render：当前单列 step card 足够做最小试点，但中长期可能需要双行配对高亮。
- Fallback：要把“已识别为方程组，但当前消元前预处理过重”单列出来。

## 5. 结果分类设计

方程组结果分类建议单独建模，而不是只靠 answer note 暗示。

建议新增 operation：

### `classify_system_result`

用途：

- 在系统层面表达“当前方程组是唯一解、无解还是无穷多解”。

建议字段：

```ts
{
  type: 'classify_system_result';
  classification: 'unique_solution' | 'no_solution' | 'infinite_solutions';
  reasonLatex?: string;
}
```

典型语义：

- `0=3` -> `no_solution`
- `0=0` -> `infinite_solutions`
- 得到单个 `x=...` 且可回代求 `y=...` -> `unique_solution`

与最终答案的关系：

- `unique_solution` 后面通常接 `collect_system_solution`
- `no_solution` / `infinite_solutions` 可以直接进入 `collect_system_solution`
- 如果后续觉得状态语义还不够，再考虑单独拆 `state_no_solution` / `state_infinite_solutions`

## 6. operation 草案总表

建议第一版 DSL 先预留以下新增 operation：

- `rewrite_equation_for_substitution`
- `substitute_expression`
- `eliminate_variable`
- `solve_single_variable_equation`
- `back_substitute_solution`
- `classify_system_result`
- `collect_system_solution`

其中建议优先级如下：

### 6.1 第一优先级

- `rewrite_equation_for_substitution`
- `substitute_expression`
- `solve_single_variable_equation`
- `back_substitute_solution`
- `collect_system_solution`

理由：

- 它们足够支撑代入法最小试点。
- 并且可以最大程度复用现有一元一次方程处理链。

### 6.2 第二优先级

- `eliminate_variable`
- `classify_system_result`

理由：

- 它们是方程组家族真正完成“家族化”的关键。
- 但比最小代入法试点更容易触碰 scene 和 answer 结构边界。

## 7. 与现有主链路的兼容方式

### 7.1 Generator native v2

建议后续优先让 native v2 直接输出“方程组家族 operation”，再投影回 v1。

原因：

- 代入与消元本身就是新语义，不适合硬塞进旧 `kind` 推断。
- 只有 native v2 先有明确 operation，Template / AI Prompt / Render 才能读懂它们。

### 7.2 Template

第一阶段建议仍尽量保守：

- `rewrite_equation_for_substitution` -> `transform`
- `substitute_expression` -> `transform`
- `eliminate_variable` -> `transform`
- `solve_single_variable_equation` -> `transform`
- `back_substitute_solution` -> `transform`
- `classify_system_result` -> `transform` 或 `answer`
- `collect_system_solution` -> `answer`

也就是说，先不发明全新的模板体系，而是先把 operation 语义串通。

### 7.3 AI Prompt

需要新增三条最小规则：

1. 明确 step 涉及哪一条原方程、哪一条目标方程。
2. 代入法里区分“改写一条方程”和“把表达式代入另一条方程”。
3. 方程组最终答案优先表达为“有序数对”或“系统结论”，而不是单个变量结论。

### 7.4 Render

第一阶段不要求改主结构，但需要承认两个风险：

1. 当前单行公式 patch 的语义锚点主要面向单方程。
2. 方程组后续很可能需要“双方程并置”或“来源方程标记”。

因此规划上建议：

- 最小试点先控制在 step 数少、来源清楚的代入法题。
- Render v1 先只做轻提示，不急着做双列 scene。

### 7.5 Fallback

方程组 fallback 文案建议显式区分：

- 输入已识别为二元一次方程组，但当前子形态未支持
- 输入根本不在当前方程组家族范围

这样后续扩形态时，unsupported 边界更清楚。

## 8. 推荐试点路径

推荐下一个试点路径是：

### 代入法最小试点

建议样例：

- `x+y=5, x-y=1`

推荐原因：

1. 它最容易把“联立关系”压缩成一条清晰的新链路。
2. 它能最大程度复用现有一元一次方程的 move / simplify / divide 能力。
3. 它对 render 的压力比消元法小，不要求第一轮就做双方程并行动画。
4. 它已经足够验证“两个方程对象 + 回代 + 解对汇总”这几个核心问题。

推荐最小 operation 链：

```text
write_equation
-> rewrite_equation_for_substitution
-> substitute_expression
-> solve_single_variable_equation
-> back_substitute_solution
-> collect_system_solution
```

## 9. 为什么先做规划再试点更优

如果现在直接实现 parser 和 generator，风险很大：

1. 很容易把代入法写成若干个局部 if/else，而不是稳定的家族级 operation。
2. 很容易让“结果分类”晚于“唯一解 happy path”，后续补无解 / 无穷多解时返工 answer 模型。
3. 很容易在 render 层临时塞双方程显示逻辑，最后 scene 语义和 step 语义脱节。

先做规划的价值是：

1. 先把“跨方程操作”和“单方程变形”分开。
2. 先把“求解步骤”和“结果分类步骤”分开。
3. 先承认 scene 可能需要新的表达策略，而不是等实现后再补救。

## 10. 为什么此时进入 Linear System Family Plan v1 最合理

当前系统已经连续跑通了：

- 一元一次方程
- 一元一次不等式
- 分式方程 / 分式不等式
- 一元二次方程三类主路径

下一步最值得验证的，不是继续在单变量方程里补更多边角形态，而是进入“多对象联立求解”。

二元一次方程组正好是最自然的下一跳，因为：

1. 它仍然属于初中代数主干题型。
2. 它引入的是新的结构挑战，而不是单纯增加一个变形步骤。
3. 它能直接检验当前 DSL、Template、AI Prompt、Render 是否能从“单公式系统”升级到“关系系统”。

所以现在进入 `Linear System Family Plan v1`，是顺序上最合理的下一步：

- 先把 operation 骨架定清楚；
- 再做最小代入法试点；
- 再扩消元法与结果分类。

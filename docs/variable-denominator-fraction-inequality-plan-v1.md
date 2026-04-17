# Variable-Denominator Fraction Inequality Plan v1

本文档只做规划与最小试点准备，不直接把“变量分母分式不等式”全面接入现有主链路。

目标是先把下面这条教学链路设计清楚：

1. 先声明定义域限制。
2. 找出会改变符号或使式子无意义的临界点。
3. 按临界点切分区间并分析符号。
4. 选出满足不等式的区间。
5. 将符号分析结果与定义域限制统一表达为最终解集。

本轮规划对象：

- `\\frac{1}{x-1}>0`
- `\\frac{1}{x+2}<0`
- 下一阶段样例预留：`\\frac{x}{x+1}\\le2`

## 1. 范围边界

本轮不做：

- parser / generator 的完整支持落地
- 数轴组件或复杂区间动画
- 含两个以上临界点的通用分式不等式求解
- 变量同时出现在分子、分母且需要完整移项后再通分的复杂形态

本轮要明确的是：

- 新 operation 应该长什么样
- 它们如何与已有 operation 组合
- 1 到 2 个最小试点样例应当产出什么 step 结构
- Template / AI Prompt / Render / Fallback 最低兼容要求是什么

## 2. 为什么不能直接沿用“去分母 -> 线性不等式”

对 `\\frac{x}{2}+3>7` 这类题，分母是正常数，`clear_denominator` 的语义是稳定的。

但对 `\\frac{1}{x-1}>0` 这类题，不能直接“同乘 `x-1`”：

- `x-1` 的符号未知；
- 如果直接同乘，是否要翻转不等号取决于 `x-1` 的正负；
- `x=1` 还会让原式无意义。

所以这类题的主语义不再是“去分母”，而是：

- 定义域；
- 临界点；
- 区间符号分析；
- 解集交集。

这就是它必须单列 operation 的原因。

## 3. 新增 operation 设计

### 3.1 `find_critical_points`

用途：

- 把会影响符号或使表达式无意义的关键点显式列出来。
- 在最小试点里，主要来自“分母为 0”的点；后续可扩到分子为 0 的点。

最小建议字段：

```ts
{
  type: 'find_critical_points';
  pointsLatex?: string[];
  reasonLatex?: string;
}
```

字段语义：

- `pointsLatex`
  - 例如 `['x=1']`、`['x=-2']`
- `reasonLatex`
  - 例如 `x-1=0`、`x+2=0`

最小 note 口径：

- `令分母为 0，可得临界点 x=1`
- `先找使分母为 0 的点，得到 x=-2`

### 3.2 `analyze_sign_interval`

用途：

- 按临界点把数轴切开，并说明哪些区间上分式为正或为负。
- 第一阶段不要求可视化数轴，但 step 语义必须先独立出来。

最小建议字段：

```ts
{
  type: 'analyze_sign_interval';
  criticalPointsLatex?: string[];
  selectedIntervalsLatex?: string[];
  signSummaryLatex?: string;
}
```

字段语义：

- `criticalPointsLatex`
  - 例如 `['1']`
- `selectedIntervalsLatex`
  - 例如 `['(1,+\\infty)']`、`['(-\\infty,-2)']`
- `signSummaryLatex`
  - 例如 `x>1` 时分式为正，`x<-2` 时分式为负

最小 note 口径：

- `以 x=1 为分界，分式在右侧为正`
- `以 x=-2 为分界，分式在左侧为负`

## 4. 与现有 operation 的协同关系

这两个新 operation 不会替代已有 `state_domain_restriction` 和 `intersect_solution_set`，而是补足其中间语义。

建议最小链路：

1. `write_equation`
2. `state_domain_restriction`
3. `find_critical_points`
4. `analyze_sign_interval`
5. `intersect_solution_set`

四个关键 operation 的职责分工：

- `state_domain_restriction`
  - 先声明原式在哪些点无意义
  - 这是定义域层面的结论
- `find_critical_points`
  - 把决定区间切分的点提取出来
  - 这是分析准备步骤
- `analyze_sign_interval`
  - 说明各区间上的符号并选出满足不等式的区间
  - 这是主要求解步骤
- `intersect_solution_set`
  - 把选中的区间与定义域限制统一成最终解集
  - 这是最终表达步骤

在最小试点里，`intersect_solution_set` 可能看起来与 `analyze_sign_interval` 结果一致，但仍建议保留：

- 它让“分析得到的候选解”和“结合限制后的最终解”保持结构分离；
- 后续扩到 `\\frac{x}{x+1}\\le2` 时，这一步会真正承接多个限制来源。

## 5. 最小 operation 链草案

### 5.1 单一变量分母、分子为正常数

适用：

- `\\frac{1}{x-a}>0`
- `\\frac{1}{x-a}<0`

建议链路：

```text
write_equation
-> state_domain_restriction
-> find_critical_points
-> analyze_sign_interval
-> intersect_solution_set
```

### 5.2 下一阶段预留：变量在分子与分母同时出现

适用：

- `\\frac{x}{x+1}\\le2`

建议链路草案：

```text
write_equation
-> state_domain_restriction
-> move_term
-> simplify_expression
-> clear_denominator            // 这里不再是“直接同乘未知符号”，需要后续细化
-> find_critical_points
-> analyze_sign_interval
-> intersect_solution_set
```

这说明：

- 当前最小试点不应该直接跳到这类题；
- 否则 `clear_denominator` 的现有语义会和变量符号不确定发生冲突。

## 6. 最小试点样例的预期 step 结构

### 6.1 `\\frac{1}{x-1}>0`

预期 native v2 steps：

```ts
[
  {
    legacyKind: 'write',
    latex: '\\frac{1}{x-1}>0',
    operation: {type: 'write_equation'}
  },
  {
    legacyKind: 'transform',
    latex: 'x-1\\ne0',
    note: '先说明原式有意义时分母不能为 0',
    operation: {
      type: 'state_domain_restriction',
      reasonLatex: 'x-1\\ne0',
      restrictionLatex: 'x\\ne1'
    }
  },
  {
    legacyKind: 'transform',
    latex: 'x=1',
    note: '令分母为 0，可得临界点 x=1',
    operation: {
      type: 'find_critical_points',
      pointsLatex: ['x=1'],
      reasonLatex: 'x-1=0'
    }
  },
  {
    legacyKind: 'transform',
    latex: 'x>1',
    note: '以 x=1 为分界，分式在右侧为正',
    operation: {
      type: 'analyze_sign_interval',
      criticalPointsLatex: ['1'],
      selectedIntervalsLatex: ['(1,+\\infty)'],
      signSummaryLatex: '\\frac{1}{x-1}>0\\text{ when }x>1'
    }
  },
  {
    legacyKind: 'answer',
    latex: 'x>1',
    note: '结合定义域限制，原不等式的解集为 x>1',
    operation: {
      type: 'intersect_solution_set',
      baseSolutionLatex: '(1,+\\infty)',
      restrictionLatex: 'x\\ne1',
      resultLatex: '(1,+\\infty)'
    }
  }
]
```

### 6.2 `\\frac{1}{x+2}<0`

预期 native v2 steps：

```ts
[
  {
    legacyKind: 'write',
    latex: '\\frac{1}{x+2}<0',
    operation: {type: 'write_equation'}
  },
  {
    legacyKind: 'transform',
    latex: 'x+2\\ne0',
    note: '先说明原式有意义时分母不能为 0',
    operation: {
      type: 'state_domain_restriction',
      reasonLatex: 'x+2\\ne0',
      restrictionLatex: 'x\\ne-2'
    }
  },
  {
    legacyKind: 'transform',
    latex: 'x=-2',
    note: '令分母为 0，可得临界点 x=-2',
    operation: {
      type: 'find_critical_points',
      pointsLatex: ['x=-2'],
      reasonLatex: 'x+2=0'
    }
  },
  {
    legacyKind: 'transform',
    latex: 'x<-2',
    note: '以 x=-2 为分界，分式在左侧为负',
    operation: {
      type: 'analyze_sign_interval',
      criticalPointsLatex: ['-2'],
      selectedIntervalsLatex: ['(-\\infty,-2)'],
      signSummaryLatex: '\\frac{1}{x+2}<0\\text{ when }x<-2'
    }
  },
  {
    legacyKind: 'answer',
    latex: 'x<-2',
    note: '结合定义域限制，原不等式的解集为 x<-2',
    operation: {
      type: 'intersect_solution_set',
      baseSolutionLatex: '(-\\infty,-2)',
      restrictionLatex: 'x\\ne-2',
      resultLatex: '(-\\infty,-2)'
    }
  }
]
```

## 7. 对 Template / AI Prompt / Render / Fallback 的影响

### 7.1 Template

最小要求：

- `find_critical_points` 先映射到 `transform`
- `analyze_sign_interval` 先映射到 `transform`
- `intersect_solution_set` 继续映射到 `answer`

这一阶段不要求新增复杂模板，只要求模板系统不把这两步误识别成普通化简。

### 7.2 AI Prompt

最小要求：

- note prompt 要知道：
  - `find_critical_points` 是“找分界点”
  - `analyze_sign_interval` 是“按区间判断正负”
- token prompt 要优先保留：
  - 完整分式
  - 临界点
  - 选中的区间或最终不等式范围
- visual action prompt 暂时仍可保守，只做弱高亮

这一阶段不要求 AI 生成数轴语义，只要求别把“区间分析”写回成泛化的代数变形话术。

### 7.3 Render

最小要求：

- `find_critical_points`
  - 给出轻量“临界点”标签或次级提示
- `analyze_sign_interval`
  - 给出轻量“区间分析”标签
- `intersect_solution_set`
  - 保留当前答案态，但文案应偏“最终解集”

这一阶段不要求真正渲染数轴或开闭区间图。

### 7.4 Fallback

需要把 unsupported 边界再细分：

- 可进入最小试点规划范围：
  - `1/(x-a)>0`
  - `1/(x-a)<0`
- 继续 fallback：
  - `x/(x+1)\\le2`
  - 含两个及以上临界点的复杂分式不等式
  - 需要移项、通分、再做符号法的变量分母题

fallback 文案建议明确写出：

- 当前仅规划并预留“单临界点变量分母分式不等式”；
- 更复杂形式仍按现有复杂分式不等式策略处理。

## 8. 为什么先做“规划 + 最小试点”更优

直接全量实现的问题很明确：

- 变量分母分式不等式不是“多加几个 parser 分支”就能稳定成立；
- 它会第一次把系统从“代数变形链”推向“定义域 + 临界点 + 区间分析链”；
- 一旦 operation 先设计不清，Template、AI Prompt、Render 会各自补语义，最后难以统一。

先做规划与最小试点的收益：

- 可以先验证 `find_critical_points` 和 `analyze_sign_interval` 是否足够表达核心教学动作；
- 可以先确认 `state_domain_restriction -> ... -> intersect_solution_set` 这条链在 DSL 上是否闭合；
- 可以把首批实现限制在单临界点样例，避免一开始就把复杂分式不等式全摊开；
- 可以让后续从 `1/(x-a)` 平滑过渡到 `x/(x+1)\\le2`，而不是重写一套 operation 语义。

因此，本轮最合适的目标不是“支持更多题”，而是先把变量分母分式不等式的最小语义骨架定住。

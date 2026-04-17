# 初中代数教学视频系统使用手册

本文档记录当前项目从手写步骤升级到自动生成、AI 增强、统一渲染输入的完整开发过程，并说明各模块职责、使用方式和可试题型。

## 1. 项目目标

本项目用于生成初中一元一次方程的教学视频数据与渲染结果。

当前主流程已经从早期的“手工编写每一步推导”升级为：

```text
输入方程
  -> Generator 规则生成步骤
  -> DSL 标准结构
  -> Template 默认教学动作
  -> Phase 三阶段节奏
  -> Anchor / Token 定位语义
  -> AI Assist 可选增强
  -> Observability 生成报告
  -> End-to-End Integration 输出可渲染 AlgebraProblem
  -> Remotion 渲染视频
```

最终目标是：输入一个支持范围内的方程，得到一份可直接用于视频渲染的 `AlgebraProblem`。

## 2. 开发过程概览

### 2.1 Generator v1

位置：

- `src/engine/generator/parser.ts`
- `src/engine/generator/transforms.ts`
- `src/engine/generator/index.ts`

作用：

- 识别一元一次方程的简单形态。
- 根据规则生成步骤骨架。
- 输出 `AlgebraProblem`。
- 不支持的题型返回 `supported: false`，不直接崩溃。

Generator 只负责数学步骤：

- `latex`
- `kind`
- `note` 的基础版本
- `tokenMap` 的基础版本

它不负责复杂动画、不负责真实 AI、不负责渲染。

### 2.2 DSL v1

位置：

- `src/types/algebra.ts`
- `src/types/visuals.ts`
- `src/utils/visualActions.ts`

作用：

- 统一数据协议。
- 定义 `AlgebraProblem`、`AlgebraStep`、`AlgebraVisualAction`。
- 明确 `latex` 是公式主字段，`expression` 仅保留兼容。
- 保证 `visualActions` 至少是数组，避免渲染层大量空判断。

核心结构：

```ts
type AlgebraProblem = {
  equation: string;
  answer: string;
  steps: AlgebraStep[];
};

type AlgebraStep = {
  id: string;
  latex: string;
  kind: StepKind;
  note?: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};
```

### 2.3 Template v1

位置：

- `src/utils/templates.ts`

作用：

- 根据 `step.kind` 自动补默认 `visualActions`。
- 当 step 已经显式提供 `visualActions` 时，不覆盖。
- 给步骤补默认 `phaseConfig`。

默认行为：

- `write`: 不补动作。
- `expand`: 高亮源项，然后执行展开动作。
- `move`: 高亮移动项，移动，淡出原项，淡入结果项。
- `answer`: 强调答案。
- `transform`: 当前保持弱默认，通常为空动作。

Template 只负责“默认教学动作”，不重新生成数学步骤。

### 2.4 Phase System v1

位置：

- `src/utils/phases.ts`

作用：

- 为每个 step 提供统一三阶段节奏：
  - `intro`
  - `action`
  - `settle`
- 不再让动画组件到处写分散的 frame 判断。

典型配置：

- `expand` 的 action 段较明显。
- `move` 的 action 段最长。
- `answer` 的 settle 段更长。

核心工具：

```ts
resolveStepPhaseRanges(duration, kind, optionalConfig?)
getPhaseProgress(frame, phaseRange)
```

### 2.5 Anchor Semantics v1

位置：

- `src/types/visuals.ts`
- `src/utils/anchors.ts`

作用：

- 把箭头、高亮等定位从“屏幕偏移”升级为“语义锚点”。
- 例如：
  - `distributor`
  - `moving_term`
  - `result_term_slot`
  - `answer_term`

示例：

```ts
{
  type: 'move',
  source: {line: 'previous', role: 'moving_term'},
  targetAnchor: {line: 'current', role: 'result_term_slot'},
  term: 'moving_term',
  targetSide: 'right'
}
```

Anchor v1 仍然是轻量实现：基于公式行矩形和角色比例规则，不做 KaTeX 深层解析。

### 2.6 Formula Token Mapping v1

位置：

- `src/types/visuals.ts`
- `src/utils/anchors.ts`
- `src/engine/generator/index.ts`

作用：

- 为关键公式片段建立 `tokenMap`。
- 让高亮、淡入淡出、箭头定位可以更稳定地引用数学对象。

示例：

```ts
tokenMap: [
  {id: 's3-left-term', text: '2x', role: 'left_term'},
  {id: 's3-right-value', text: '14', role: 'right_value'},
  {id: 's3-result-term', text: '-6', role: 'result_term'}
]
```

Token Mapping v1 不做 KaTeX AST 解析，而是用公式容器宽度和文本长度权重近似切分 token 区域。

### 2.7 AI Assist v1.1 / v1.2 / v1.3

位置：

- `src/engine/ai/aiEnhancementTypes.ts`
- `src/engine/ai/buildEnhancementPrompt.ts`
- `src/engine/ai/buildTokenMapEnhancementPrompt.ts`
- `src/engine/ai/buildVisualActionsEnhancementPrompt.ts`
- `src/engine/ai/mergeEnhancementResult.ts`

作用：

- AI v1.1：补充 `note`。
- AI v1.2：补充 `tokenMap`。
- AI v1.3：补充 `visualActions`。

AI 增强层的边界：

- 不修改 `latex`。
- 不修改 `kind`。
- 不重新做数学推导。
- 不直接改渲染逻辑。
- 所有 AI 输出必须经过 parse / validate / merge。
- 非法输出不会覆盖原数据。

### 2.8 AI Orchestrator v1

位置：

- `src/engine/ai/enhanceProblemWithAI.ts`

作用：

- 把 note、tokenMap、visualActions 三段 AI 能力串成流水线。
- 执行顺序：

```text
note -> tokenMap -> visualActions
```

任意阶段失败时，不中断整体流程，保留已有 problem 数据继续后续阶段。

### 2.9 Real AI Client v1

位置：

- `src/engine/ai/aiClient.ts`

作用：

- 提供真实 AI client 抽象。
- 业务逻辑只接收 `(prompt) => Promise<string | null>`。
- 不把具体厂商 SDK、模型名、鉴权方式写进 orchestrator。

核心类型：

```ts
type AIEnhancer = (prompt: string) => Promise<string | null>;
```

当前项目保留 mock 模式；真实模型需要外部注入 client。

### 2.10 Observability v1

位置：

- `src/engine/ai/enhanceProblemWithAI.ts`

作用：

- 为 AI 增强流水线生成阶段报告。
- 记录每段是否启用、是否成功、耗时、合并了多少步骤、失败原因。

核心报告：

```ts
type EnhancementStageReport = {
  stage: 'note' | 'tokenMap' | 'visualActions';
  enabled: boolean;
  success: boolean;
  skipped: boolean;
  mergedStepCount: number;
  durationMs: number;
  reason?: string;
};
```

### 2.11 End-to-End Integration v1

位置：

- `src/engine/integration/buildEnhancedLessonProblem.ts`
- `src/engine/integration/index.ts`
- `src/engine/index.ts`

作用：

- 提供统一主流程入口。
- 调用方只需要输入方程和选项。
- 输出可直接用于渲染的 `AlgebraProblem`。
- 可选返回 AI 增强报告。
- unsupported 题型返回明确结果。

主入口：

```ts
buildEnhancedLessonProblem(equation, options)
generateLessonVideoInput(equation, options)
```

### 2.12 Unsupported & Degradation Strategy v1

位置：

- `src/engine/integration/buildEnhancedLessonProblem.ts`
- `src/engine/integration/lessonBuildStatus.ts`
- `src/engine/integration/index.ts`
- `src/types/algebra.ts`

作用：

- 主流程统一返回 `supported`、`quality`、`reason`、`reasons`、`problem`、`report`。
- `quality` 只允许：`full`、`partial`、`fallback`、`unsupported`。
- `reason` 使用 `LessonBuildReason` 白名单，避免调用方依赖自由文本。
- generator 不支持时不抛错，默认返回最小 fallback problem。
- AI 失败时保留 generator/template 的可渲染结果，并通过 `report` 和质量字段表达降级。
- tokenMap 缺失时继续走 Anchor fallback。
- visualActions 缺失时继续走 Template 默认动作。

fallback problem 最小结构：

```json
{
  "title": "暂不支持的题型",
  "question": "x^2=4",
  "equation": "x^2=4",
  "answer": "x^2=4",
  "note": "当前题型暂不在自动推导支持范围内...",
  "steps": [
    {
      "id": "fallback-s1",
      "kind": "write",
      "latex": "x^2=4",
      "note": "当前题型暂不在自动推导支持范围内...",
      "visualActions": []
    }
  ]
}
```

四种结果形态示例：

```ts
// full: generator + AI/report + template 全部可用
{
  supported: true,
  quality: 'full',
  problem
}

// partial: AI 某阶段失败，但主流程返回可渲染 problem
{
  supported: true,
  quality: 'partial',
  reason: 'ai_stage_failed',
  reasons: ['ai_stage_failed'],
  problem,
  report
}

// fallback: generator 不支持，主流程返回最小安全 problem
{
  supported: false,
  quality: 'fallback',
  reason: 'unsupported_equation_pattern',
  reasons: ['unsupported_equation_pattern', 'fallback_problem_created'],
  equation: 'x^2=4',
  problem
}

// unsupported: 调用方关闭 fallback，只返回明确不支持状态
{
  supported: false,
  quality: 'unsupported',
  reason: 'unsupported_equation_pattern',
  reasons: ['unsupported_equation_pattern'],
  equation: 'x^2=4'
}
```

### 2.13 Generator v2

位置：

- `src/engine/generator/parser.ts`
- `src/engine/generator/transforms.ts`
- `src/engine/generator/index.ts`

新增支持范围：

- `x/2+3=7`
- `2(x+3)+4=18`
- `3(x-2)+5=20`
- `2x+3=x+8`

Generator v2 仍只扩展数学步骤骨架，核心字段是 `latex`、`kind` 和可选 `note`。现有 `tokenMap` 只作为 Anchor 兼容的基础定位元数据保留；`visualActions`、AI 增强、Template、Phase 和 Render 仍由各自模块负责。新题型无法解析时仍返回 `supported: false`，由主流程的 unsupported / fallback 策略继续处理。

样例骨架：

```ts
// x/2+3=7
[
  {kind: 'write', latex: '\\frac{x}{2}+3=7'},
  {kind: 'move', latex: '\\frac{x}{2}=7-3', note: '两边同时减去 3'},
  {kind: 'transform', latex: '\\frac{x}{2}=4', note: '计算右边'},
  {kind: 'transform', latex: 'x=4\\cdot 2', note: '两边同时乘以 2'},
  {kind: 'transform', latex: 'x=8', note: '计算乘法'},
  {kind: 'answer', latex: 'x=8', note: '得到答案'}
]

// 2(x+3)+4=18
[
  {kind: 'write', latex: '2(x+3)+4=18'},
  {kind: 'expand', latex: '2x+6+4=18', note: '展开括号'},
  {kind: 'transform', latex: '2x+10=18', note: '合并常数项'},
  {kind: 'move', latex: '2x=18-10', note: '两边同时减去 10'},
  {kind: 'transform', latex: '2x=8', note: '计算右边'},
  {kind: 'transform', latex: 'x=8\\div 2', note: '两边同时除以 2'},
  {kind: 'answer', latex: 'x=4', note: '得到答案'}
]

// 3(x-2)+5=20
[
  {kind: 'write', latex: '3(x-2)+5=20'},
  {kind: 'expand', latex: '3x-6+5=20', note: '展开括号'},
  {kind: 'transform', latex: '3x-1=20', note: '合并常数项'},
  {kind: 'move', latex: '3x=20+1', note: '两边同时加上 1'},
  {kind: 'transform', latex: '3x=21', note: '计算右边'},
  {kind: 'transform', latex: 'x=21\\div 3', note: '两边同时除以 3'},
  {kind: 'answer', latex: 'x=7', note: '得到答案'}
]

// 2x+3=x+8
[
  {kind: 'write', latex: '2x+3=x+8'},
  {kind: 'move', latex: '2x-x=8-3', note: '把含 x 的项移到左边，常数项移到右边'},
  {kind: 'transform', latex: 'x=5', note: '合并同类项'},
  {kind: 'answer', latex: 'x=5', note: '得到答案'}
]
```

### 2.14 Step Granularity Refinement v1

位置：

- `src/engine/generator/index.ts`
- `src/engine/generator/transforms.ts`
- `docs/algebra-system-guide.md`

作用：

- 不扩大 parser 支持范围。
- 将“合并同类项”“除以系数”“最终答案展示”拆成更自然的教学步骤。
- 继续只产出步骤骨架字段：`latex`、`kind`、可选 `note`，并保留既有轻量 tokenMap 兼容。
- 不修改 Template、Phase、Anchor、AI、Render 或 fallback。

优化前后对比：

```ts
// 2x+3=x+8
// before
[
  {kind: 'write', latex: '2x+3=x+8'},
  {kind: 'move', latex: '2x-x=8-3', note: '把含 x 的项移到左边，常数项移到右边'},
  {kind: 'answer', latex: 'x=5', note: '合并同类项，得到答案'}
]

// after
[
  {kind: 'write', latex: '2x+3=x+8'},
  {kind: 'move', latex: '2x-x=8-3', note: '把含 x 的项移到左边，常数项移到右边'},
  {kind: 'transform', latex: 'x=5', note: '合并同类项'},
  {kind: 'answer', latex: 'x=5', note: '得到答案'}
]

// x/2+3=7
// before
[
  {kind: 'write', latex: '\\frac{x}{2}+3=7'},
  {kind: 'move', latex: '\\frac{x}{2}=7-3', note: '两边同时减去 3'},
  {kind: 'transform', latex: '\\frac{x}{2}=4', note: '计算右边'},
  {kind: 'transform', latex: 'x=4\\cdot 2', note: '两边同时乘以 2'},
  {kind: 'answer', latex: 'x=8', note: '计算得到答案'}
]

// after
[
  {kind: 'write', latex: '\\frac{x}{2}+3=7'},
  {kind: 'move', latex: '\\frac{x}{2}=7-3', note: '两边同时减去 3'},
  {kind: 'transform', latex: '\\frac{x}{2}=4', note: '计算右边'},
  {kind: 'transform', latex: 'x=4\\cdot 2', note: '两边同时乘以 2'},
  {kind: 'transform', latex: 'x=8', note: '计算乘法'},
  {kind: 'answer', latex: 'x=8', note: '得到答案'}
]

// 2(x+3)+4=18
// before
[
  {kind: 'write', latex: '2(x+3)+4=18'},
  {kind: 'expand', latex: '2x+6+4=18', note: '展开括号'},
  {kind: 'transform', latex: '2x+10=18', note: '合并常数项'},
  {kind: 'move', latex: '2x=18-10', note: '两边同时减去 10'},
  {kind: 'transform', latex: '2x=8', note: '计算右边'},
  {kind: 'answer', latex: 'x=4', note: '两边同时除以 2'}
]

// after
[
  {kind: 'write', latex: '2(x+3)+4=18'},
  {kind: 'expand', latex: '2x+6+4=18', note: '展开括号'},
  {kind: 'transform', latex: '2x+10=18', note: '合并常数项'},
  {kind: 'move', latex: '2x=18-10', note: '两边同时减去 10'},
  {kind: 'transform', latex: '2x=8', note: '计算右边'},
  {kind: 'transform', latex: 'x=8\\div 2', note: '两边同时除以 2'},
  {kind: 'answer', latex: 'x=4', note: '得到答案'}
]
```

### 2.15 Render Quality Pass v1

位置：

- `src/scenes/LinearEquationLessonScene.tsx`
- `src/components/ArrowGuide.tsx`
- `src/components/ExpandGuideLayer.tsx`
- `src/components/MoveGuideLayer.tsx`
- `src/components/HighlightOverlay.tsx`
- `src/components/StepCard.tsx`
- `src/components/SubtitleBar.tsx`
- `src/styles/global.css`
- `src/utils/phases.ts`
- `src/utils/timing.ts`
- `src/data/linearEquationLesson.ts`

作用：

- 不修改 parser / generator 题型范围。
- 不修改 AI / fallback 主流程。
- 统一标题、主公式、步骤、note、guide、answer 的视觉层级。
- 让 refined steps 更像课堂板书，而不是只列公式结果。

视觉规范：

- combined 画面顶部显示紧凑课程标题和题型标签。
- 主公式优先使用第一步 LaTeX，避免 `x/2` 这类输入文本在主视觉里弱化为普通斜杠。
- 当前步骤有左侧强调线和弱背景；answer 步骤使用暖色强调。
- transform 保持中性板书状态；answer 使用最终结论卡片和更长 settle。
- expand 和 move 使用同一 chalk-yellow guide 语言。
- move 的箭头更细、更淡，继续让状态变化成为主表达。
- note 只在有内容时出现，使用底部轻量条，不占用公式区和 guide 区。
- answer step duration 和 answer hold 增加，给最终结论留出停留时间。

渲染抽查：

- `2(x+3)=14`：expand 帧中标题、主公式、展开步骤层级清晰；展开箭头可见但不压过公式。
- `x/2+3=7`：主公式显示为 `\frac{x}{2}+3=7`；move 帧中状态变化清楚，note 位于底部且不遮挡公式。
- `2x+3=x+8`：move 帧中箭头退为辅助，当前步骤和 note 共同表达“移项”；最终帧 answer 卡片突出 `x=5`，并保留更长停留。
- `x^2=4`：fallback 帧可渲染，显示原题、最小步骤和说明 note，没有崩溃或空画面。

### 2.16 DSL v2 + Generator v3 Planning

位置：

- `src/types/algebraDslV2.ts`
- `src/types/algebra.ts`
- `docs/algebra-system-guide.md`

目标：

- 不破坏现有 v1 主链路。
- 在 `kind + latex + note` 之外补充更明确的数学操作语义。
- 让 Generator v3 可以面向“代数操作”生成步骤，而不是只面向显示结果生成步骤。

DSL v2 类型草案：

```ts
type AlgebraOperationTypeV2 =
  | 'write_equation'
  | 'move_term'
  | 'expand_brackets'
  | 'combine_like_terms'
  | 'multiply_both_sides'
  | 'divide_both_sides'
  | 'simplify_expression'
  | 'final_answer';

type AlgebraStepV2 = {
  id: string;
  legacyKind: AlgebraStepKind;
  operation: AlgebraOperationV2;
  sourceLatex?: string;
  targetLatex: string;
  latex: string;
  note?: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};

type AlgebraProblemV2 = {
  schemaVersion: 'algebra-dsl-v2-draft';
  equation: string;
  answer: string;
  title?: string;
  steps: AlgebraStepV2[];
};
```

核心操作语义：

```ts
type AlgebraOperationV2 =
  | {type: 'move_term'; termLatex?: string; fromSide?: 'left' | 'right'; toSide?: 'left' | 'right'; inverseTermLatex?: string}
  | {type: 'expand_brackets'; factorLatex?: string; bracketLatex?: string}
  | {type: 'combine_like_terms'; groups?: LikeTermGroupV2[]}
  | {type: 'multiply_both_sides'; multiplierLatex?: string}
  | {type: 'divide_both_sides'; divisorLatex?: string}
  | {type: 'final_answer'; variableLatex: string; valueLatex?: string};
```

兼容迁移：

- `AlgebraStep` v1 保持当前结构，继续服务 Template / Phase / Anchor / Token / AI / Render。
- `AlgebraStepV2` 增加 `legacyKind`，让现有模板仍可按旧 kind 推导默认动作。
- `latex` 保留为渲染主字段，`targetLatex` 表达本步骤结果，`sourceLatex` 表达上一步来源。
- 当前新增 `toAlgebraStepV2Draft` 和 `toAlgebraProblemV2Draft`，可以把 v1 结果投影成 v2 草案结构。
- Generator v3 初期可以同时输出 v1 problem 和 v2 draft；主流程继续消费 v1，调试面板或 AI prompt 可先试用 v2。

v1 step 到 v2 step 的初始映射：

| v1 kind / note | v2 operation | 说明 |
| --- | --- | --- |
| `write` | `write_equation` | 原题或当前方程展示 |
| `expand` | `expand_brackets` | 括号展开 |
| `move` | `move_term` | 移项，后续补 term/source/target |
| `transform` + `合并` | `combine_like_terms` | 合并常数项、同类项 |
| `transform` + `乘以` | `multiply_both_sides` | 去分母或等式两边同乘 |
| `transform` + `除以` | `divide_both_sides` | 系数化为 1 |
| `transform` 其他 | `simplify_expression` | 计算右边、计算乘法等普通化简 |
| `answer` | `final_answer` | 最终结论 |

Generator v3 优先支持范围：

1. 一元一次不等式：
   - `2x+3>7`
   - `3(x-1)<=12`
   - 重点补充“不等号方向”和“乘除负数变号”语义。
2. 更复杂分式方程：
   - `x/3+2=5`
   - `(x+1)/2=4`
   - `x/2+x/3=5`
   - 重点补充通分、去分母、等式两边同乘。
3. 多括号一元一次方程：
   - `2(x+3)+3(x-1)=20`
   - `4(x-2)-2(x+1)=10`
   - 重点补充多次分配律和同类项分组。
4. 两边含代数式的一元一次方程：
   - `2(x+3)=x+8`
   - `3x+2=2(x+5)`
   - `2(x+1)+3=x+9`
   - 重点补充展开、移项、合并同类项的稳定顺序。

本轮不纳入：

- 几何证明和图形题。
- 函数图像题。
- 需要坐标系、图形构造、判定定理或图像采样的题型。

迁移计划：

1. `v2-draft`：保留 v1 输出，新增 v2 类型和 v1->v2 适配器。
2. `v2-shadow`：Generator 继续产出 v1，同时旁路产出 v2 steps，用测试和样例对齐。
3. `template-aware-v2`：Template 优先读 `operation.type`，失败时回落到 `legacyKind`。
4. `ai-prompt-v2`：AI prompt 使用 `operation` 而不是只看 `kind/latex`，让 note/token/action 更稳定。
5. `generator-v3-native`：复杂代数题直接生成 v2 operations，再降级投影为 v1 兼容 problem。
6. `render-v2`：渲染层逐步使用 `operation` 做更细粒度动作，但保留 v1 fallback。

### 2.17 Template-aware v2

位置：

- `src/utils/templates.ts`
- `docs/algebra-system-guide.md`

目标：

- 不切换现有主流程输出格式。
- Template 仍输出 v1 `AlgebraStep`。
- 模板选择优先读取 `step.operation.type`。
- 当 step 没有显式 operation 时，用 `toAlgebraStepV2Draft` 从 v1 step 推断 operation。
- operation 不可用或未覆盖时，继续回退到旧 `kind` 路径。

operation 到模板行为的映射：

| DSL v2 operation | template kind | 默认行为 |
| --- | --- | --- |
| `write_equation` | `write` | 无动作，补 write phase |
| `expand_brackets` | `expand` | 高亮分配项，补展开箭头 |
| `move_term` | `move` | 高亮移动项，状态变化为主，箭头为辅 |
| `final_answer` | `answer` | 最终答案强调 |
| `combine_like_terms` | `transform` | 弱默认，仅补 transform phase |
| `multiply_both_sides` | `transform` | 弱默认，仅补 transform phase |
| `divide_both_sides` | `transform` | 弱默认，仅补 transform phase |
| `simplify_expression` | `transform` | 弱默认，仅补 transform phase |

补全前后示例：

```ts
// input: legacy kind 还是 transform，但 v2 operation 表达真实数学动作
{
  id: 's2',
  kind: 'transform',
  latex: '2x+6=14',
  operation: {type: 'expand_brackets'}
}

// after normalizeStepWithTemplate
{
  id: 's2',
  kind: 'transform',
  latex: '2x+6=14',
  operation: {type: 'expand_brackets'},
  phaseConfig: DEFAULT_PHASE_CONFIGS.expand,
  visualActions: [
    {type: 'highlight', target: 'source', anchor: {line: 'previous', role: 'distributor'}},
    {type: 'expand', source: {line: 'previous', role: 'distributor'}, targets: {...}}
  ]
}
```

显式 visualActions 仍然优先：

```ts
{
  id: 's4',
  kind: 'transform',
  latex: 'x=4',
  operation: {type: 'final_answer', variableLatex: 'x', valueLatex: '4'},
  visualActions: [{type: 'highlight', target: 'custom'}]
}
```

上面的 step 会使用 `final_answer` 的 phase，但不会覆盖调用方显式给出的 `visualActions`。

### 2.18 Generator v3 Native Output Pilot

位置：

- `src/engine/generator/index.ts`
- `src/types/algebraDslV2.ts`
- `src/types/algebra.ts`
- `docs/algebra-system-guide.md`

目标：

- 先让 generator 内部原生生成 DSL v2 operation。
- 不切断现有 v1 `AlgebraProblem` 输出。
- 对试点题型生成 `AlgebraProblemV2`，再投影回兼容 v1 problem。
- 主流程、AI、fallback、render 仍可继续消费 v1 problem。

新增入口：

```ts
generateAlgebraStepsV2Draft(equation)
```

返回：

```ts
{
  supported: true,
  native: true,
  problem: AlgebraProblemV2,
  legacyProblem: AlgebraProblem
}
```

试点范围：

- `2(x+3)+4=18`
- `x/2+3=7`
- `2x+3=x+8`

native v2 示例：

```ts
// 2(x+3)+4=18
[
  {legacyKind: 'write', latex: '2(x+3)+4=18', operation: {type: 'write_equation'}},
  {
    legacyKind: 'expand',
    latex: '2x+6+4=18',
    operation: {type: 'expand_brackets', factorLatex: '2', bracketLatex: 'x+3'}
  },
  {
    legacyKind: 'transform',
    latex: '2x+10=18',
    operation: {
      type: 'combine_like_terms',
      groups: [{category: 'constant', termsLatex: ['+6', '+4'], resultLatex: '+10'}]
    }
  },
  {
    legacyKind: 'move',
    latex: '2x=18-10',
    operation: {type: 'move_term', termLatex: '+10', inverseTermLatex: '-10', fromSide: 'left', toSide: 'right'}
  },
  {legacyKind: 'transform', latex: '2x=8', operation: {type: 'simplify_expression'}},
  {legacyKind: 'transform', latex: 'x=8\\div 2', operation: {type: 'divide_both_sides', divisorLatex: '2'}},
  {legacyKind: 'answer', latex: 'x=4', operation: {type: 'final_answer', variableLatex: 'x', valueLatex: '4'}}
]

// x/2+3=7
[
  {legacyKind: 'write', latex: '\\frac{x}{2}+3=7', operation: {type: 'write_equation'}},
  {
    legacyKind: 'move',
    latex: '\\frac{x}{2}=7-3',
    operation: {type: 'move_term', termLatex: '+3', inverseTermLatex: '-3', fromSide: 'left', toSide: 'right'}
  },
  {legacyKind: 'transform', latex: '\\frac{x}{2}=4', operation: {type: 'simplify_expression'}},
  {legacyKind: 'transform', latex: 'x=4\\cdot 2', operation: {type: 'multiply_both_sides', multiplierLatex: '2'}},
  {legacyKind: 'transform', latex: 'x=8', operation: {type: 'simplify_expression'}},
  {legacyKind: 'answer', latex: 'x=8', operation: {type: 'final_answer', variableLatex: 'x', valueLatex: '8'}}
]
```

投影回 v1 后：

```ts
// 2x+3=x+8
[
  {kind: 'write', latex: '2x+3=x+8', operation: {type: 'write_equation'}},
  {kind: 'move', latex: '2x-x=8-3', operation: {type: 'move_term', termLatex: 'x', inverseTermLatex: '-x'}},
  {kind: 'transform', latex: 'x=5', operation: {type: 'combine_like_terms', groups: [...]}},
  {kind: 'answer', latex: 'x=5', operation: {type: 'final_answer', variableLatex: 'x', valueLatex: '5'}}
]
```

与旧 v1 -> v2 draft 适配路径的差异：

- 后置适配只能从 `kind` 和 `note` 推断 operation 类型。
- native v2 在生成数学步骤时就知道具体操作对象。
- native v2 可以保留 `factorLatex`、`bracketLatex`、`termLatex`、`inverseTermLatex`、`groups`、`multiplierLatex`、`divisorLatex`。
- 后置适配适合作为兼容兜底，native v2 才适合作为 Generator v3、AI prompt v2、render v2 的真实协议。

### 2.19 AI Prompt v2

位置：

- `src/engine/ai/aiEnhancementTypes.ts`
- `src/engine/ai/buildEnhancementPrompt.ts`
- `src/engine/ai/buildTokenMapEnhancementPrompt.ts`
- `src/engine/ai/buildVisualActionsEnhancementPrompt.ts`

目标：

- 不改变 orchestrator / parse / validate / merge / render 主链路。
- note、tokenMap、visualActions 三类 prompt 继续接收 v1 `AlgebraStep`，但当 step 带有 DSL v2 `operation` 时，prompt 输入优先携带 operation 语义。
- 当 step 没有 operation 时，输入仍保持 legacy `{id, kind, latex}` 形态。
- prompt 只携带 `operation.type` 和相关数学字段，不携带渲染状态、已合并增强结果或内部调试字段。

prompt v2 step 输入结构：

```ts
{
  id: 's4',
  kind: 'move',
  latex: '2x=18-10',
  operation: {
    type: 'move_term',
    termLatex: '+10',
    inverseTermLatex: '-10',
    fromSide: 'left',
    toSide: 'right'
  }
}
```

三类 prompt 的 v2 输入示例：

```ts
// note prompt: 直接知道这是合并常数项，不需要从 transform + latex 猜
{
  question: '2(x+3)+4=18',
  steps: [
    {
      id: 's3',
      kind: 'transform',
      latex: '2x+10=18',
      operation: {
        type: 'combine_like_terms',
        groups: [{category: 'constant', termsLatex: ['+6', '+4'], resultLatex: '+10'}]
      }
    }
  ]
}

// tokenMap prompt: 直接知道要标注被移项对象和结果项
{
  question: 'x/2+3=7',
  steps: [
    {
      id: 's2',
      kind: 'move',
      latex: '\\frac{x}{2}=7-3',
      operation: {
        type: 'move_term',
        termLatex: '+3',
        inverseTermLatex: '-3',
        fromSide: 'left',
        toSide: 'right'
      }
    }
  ]
}

// visualActions prompt: 直接知道展开动作的乘数和括号对象
{
  question: '2(x+3)+4=18',
  steps: [
    {
      id: 's2',
      kind: 'expand',
      latex: '2x+6+4=18',
      operation: {
        type: 'expand_brackets',
        factorLatex: '2',
        bracketLatex: 'x+3'
      }
    }
  ]
}
```

operation 对 AI 的价值：

- `move_term` 不再需要 AI 从 `kind: move` 推断到底是移常数项还是移含 x 的项。
- `expand_brackets` 明确给出乘数和括号内部表达式，减少把普通 transform 误判成展开的概率。
- `combine_like_terms` 通过 `groups` 告诉 AI 哪些项参与合并，以及合并结果是什么。
- `multiply_both_sides` / `divide_both_sides` 明确是等式两边同乘或同除，不再只依赖 note 文案。
- `final_answer` 明确变量和值，答案强调动作和 token 标注更稳定。

这一步放在 native v2 generator 之后做，是因为 generator 已经能在数学变换发生时保留真实 operation 字段；AI prompt v2 现在消费这些字段，可以先提升 note / token / action 的稳定性，同时保持后续 render v2 仍有明确的数据基础。

### 2.20 Render v2 Semantic Pass

位置：

- `src/scenes/LinearEquationLessonScene.tsx`
- `src/components/GuideLayer.tsx`
- `src/components/OperationSemanticOverlay.tsx`
- `src/components/StepCard.tsx`
- `src/utils/anchors.ts`
- `src/utils/renderOperations.ts`
- `src/styles/global.css`

目标：

- 不移除现有 `visualActions` 渲染逻辑。
- Render 层开始弱接入 DSL v2 `operation.type`。
- 有 `operation` 时优先用 operation 字段和 tokenMap 定位元素，找不到再回退到原有 anchor 规则。
- 不改 generator / AI / template 主逻辑。

operation-aware 分支：

- `expand_brackets`：在没有显式 expand action 时可生成默认展开箭头；已有 expand action 时保留动作，但用 operation 语义稳定 source / target。
- `move_term`：使用 `operation.termLatex` 修正 move / highlight / fade_out 的移动对象，先从 tokenMap 的文本或 role 定位，再回退 anchor。
- `combine_like_terms`：根据 `operation.groups` 高亮上一行参与合并的项，并强调当前行合并后的结果项。
- `multiply_both_sides` / `divide_both_sides`：显示“两边同乘 / 同除”的轻量操作提示，并强调当前操作因子位置。
- `final_answer`：把 `operation.variableLatex + valueLatex` 作为答案表达兜底，并增强最终步骤的视觉强调。

示例：

```ts
// move_term: visualActions 仍可存在，但移动对象由 operation.termLatex 修正
{
  kind: 'move',
  latex: '2x=18-10',
  operation: {
    type: 'move_term',
    termLatex: '+10',
    inverseTermLatex: '-10',
    fromSide: 'left',
    toSide: 'right'
  },
  tokenMap: [
    {id: 's4-right-value', text: '18', role: 'right_value'},
    {id: 's4-result-term', text: '-10', role: 'result_term'}
  ]
}

// expand_brackets: 没有显式 visualActions 时也能从 operation 生成展开引导
{
  kind: 'expand',
  latex: '2x+6+4=18',
  operation: {
    type: 'expand_brackets',
    factorLatex: '2',
    bracketLatex: 'x+3'
  }
}
```

与 visualActions-only 的差异：

- visualActions-only 只知道“做 move / expand 动画”，具体数学对象通常依赖 role 和 anchor 兜底。
- operation-aware 知道“移动的是 `+10`”“展开的是 `2(x+3)`”“合并的是 `+6` 和 `+4`”，因此定位和强调更贴近数学语义。
- visualActions 仍然是显式动画 DSL；operation 是语义修正和缺省提示来源。两者并存，render 不反向修改 step 数据。

Render v2 是当前阶段的关键升级点，因为前面的 generator v3 native output 和 AI prompt v2 已经把数学语义传到主链路，但最终用户感知发生在画面里。Render 开始读 operation 后，语义不再只停留在数据层，而能直接改善动画路径、元素强调和教学节奏。

### 2.21 Generator v3 Expansion Phase 2

位置：

- `src/types/algebraDslV2.ts`
- `src/engine/generator/parser.ts`
- `src/engine/generator/transforms.ts`
- `src/engine/generator/index.ts`
- `src/utils/templates.ts`
- `src/engine/ai/aiEnhancementTypes.ts`
- `src/engine/ai/buildEnhancementPrompt.ts`
- `src/engine/ai/buildTokenMapEnhancementPrompt.ts`
- `src/engine/ai/buildVisualActionsEnhancementPrompt.ts`
- `src/utils/renderOperations.ts`
- `src/components/OperationSemanticOverlay.tsx`
- `docs/algebra-system-guide.md`

新增支持范围：

- 一元一次不等式：`2x+3>7`、`3(x-1)<=12`
- 更复杂分式方程：`(x+1)/2=4`、`x/2+x/3=5`
- 多括号一元一次方程：`2(x+3)+3(x-1)=20`

新增 operation：

- `clear_denominator`：表达去分母或两边同乘最小公倍数。
- `solve_inequality`：表达不等式最终解集。
- `flip_inequality_sign`：预留负数乘除导致不等号变号的语义。

native v2 示例：

```ts
// 一元一次不等式: 2x+3>7
[
  {legacyKind: 'write', latex: '2x+3>7', operation: {type: 'write_equation'}},
  {legacyKind: 'move', latex: '2x>7-3', operation: {type: 'move_term', termLatex: '+3', inverseTermLatex: '-3'}},
  {legacyKind: 'transform', latex: '2x>4', operation: {type: 'simplify_expression'}},
  {legacyKind: 'transform', latex: 'x>4\\div 2', operation: {type: 'divide_both_sides', divisorLatex: '2'}},
  {legacyKind: 'answer', latex: 'x>2', operation: {type: 'solve_inequality', variableLatex: 'x', relationLatex: '>', valueLatex: '2'}}
]

// 分式方程: x/2+x/3=5
[
  {legacyKind: 'write', latex: '\\frac{x}{2}+\\frac{x}{3}=5', operation: {type: 'write_equation'}},
  {legacyKind: 'transform', latex: '3x+2x=30', operation: {type: 'clear_denominator', denominatorsLatex: ['2', '3'], multiplierLatex: '6'}},
  {legacyKind: 'transform', latex: '5x=30', operation: {type: 'combine_like_terms', groups: [{category: 'variable', termsLatex: ['3x', '+2x'], resultLatex: '5x'}]}},
  {legacyKind: 'transform', latex: 'x=30\\div 5', operation: {type: 'divide_both_sides', divisorLatex: '5'}},
  {legacyKind: 'answer', latex: 'x=6', operation: {type: 'final_answer', variableLatex: 'x', valueLatex: '6'}}
]

// 多括号方程: 2(x+3)+3(x-1)=20
[
  {legacyKind: 'write', latex: '2(x+3)+3(x-1)=20', operation: {type: 'write_equation'}},
  {legacyKind: 'expand', latex: '2x+6+3x-3=20', operation: {type: 'expand_brackets', expansions: [{factorLatex: '2', bracketLatex: 'x+3'}, {factorLatex: '3', bracketLatex: 'x-1'}]}},
  {legacyKind: 'transform', latex: '5x+3=20', operation: {type: 'combine_like_terms', groups: [{category: 'variable', termsLatex: ['2x', '+3x'], resultLatex: '5x'}, {category: 'constant', termsLatex: ['+6', '-3'], resultLatex: '+3'}]}},
  {legacyKind: 'move', latex: '5x=20-3', operation: {type: 'move_term', termLatex: '+3', inverseTermLatex: '-3'}},
  {legacyKind: 'transform', latex: '5x=17', operation: {type: 'simplify_expression'}},
  {legacyKind: 'transform', latex: 'x=17\\div 5', operation: {type: 'divide_both_sides', divisorLatex: '5'}},
  {legacyKind: 'answer', latex: 'x=\\frac{17}{5}', operation: {type: 'final_answer', variableLatex: 'x', valueLatex: '\\frac{17}{5}'}}
]
```

投影回 v1 后：

```ts
// v1 仍是 AlgebraStep，但保留 operation，主流程和 render 可继续消费
[
  {kind: 'write', latex: '2x+3>7', operation: {type: 'write_equation'}},
  {kind: 'move', latex: '2x>7-3', operation: {type: 'move_term', termLatex: '+3'}},
  {kind: 'transform', latex: '2x>4', operation: {type: 'simplify_expression'}},
  {kind: 'transform', latex: 'x>4\\div 2', operation: {type: 'divide_both_sides', divisorLatex: '2'}},
  {kind: 'answer', latex: 'x>2', operation: {type: 'solve_inequality', variableLatex: 'x', relationLatex: '>', valueLatex: '2'}}
]
```

这轮扩题型的核心不是“多几个 parser 正则”，而是让新题型从生成阶段就带着 `clear_denominator`、`combine_like_terms`、`solve_inequality` 等语义进入 Template / AI Prompt / Render。这样新增题型不只是能算出答案，也能继承现有语义驱动动画和降级策略。

### 2.22 Operation Coverage & Regression Suite v1

位置：

- `src/engine/regression/operationCoverage.ts`
- `src/engine/regression/runOperationCoverageRegression.ts`
- `package.json`
- `docs/algebra-system-guide.md`

目标：

- 为当前 DSL v2 operation 建立覆盖表。
- 为 Generator native v2、v2 -> v1 投影、Template-aware v2、AI Prompt v2、Render v2、Fallback 建立轻量回归护栏。
- 不引入测试框架或新库。

运行：

```bash
npm run regression:operations
```

检查内容：

- generator 是否 `supported` 且 `native` 标记符合预期。
- native v2 steps 是否包含预期 operation。
- v2 -> v1 投影是否保留 operation 且 step 数一致。
- Template 是否能通过 `OPERATION_TEMPLATE_KIND` 识别每个 operation。
- note / tokenMap / visualActions 三类 AI prompt 是否消费到 operation。
- Render v2 是否识别 render-aware operation。
- `x^2=4` 是否仍走 unsupported / fallback。

operation 覆盖矩阵：

| operation | template kind | render-aware | 代表样例 |
| --- | --- | --- | --- |
| `write_equation` | `write` | 否 | `2x+3>7`, `(x+1)/2=4` |
| `move_term` | `move` | 是 | `2x+3>7`, `2(x+3)+3(x-1)=20` |
| `expand_brackets` | `expand` | 是 | `3(x-1)<=12`, `2(x+3)+3(x-1)=20` |
| `combine_like_terms` | `transform` | 是 | `x/2+x/3=5`, `2(x+3)+3(x-1)=20` |
| `multiply_both_sides` | `transform` | 是 | `x/2+3=7` |
| `divide_both_sides` | `transform` | 是 | `2x+3>7`, `x/2+x/3=5` |
| `simplify_expression` | `transform` | 否 | `2x+3>7`, `(x+1)/2=4` |
| `final_answer` | `answer` | 是 | `(x+1)/2=4`, `2(x+3)+3(x-1)=20` |
| `clear_denominator` | `transform` | 是 | `(x+1)/2=4`, `x/2+x/3=5` |
| `solve_inequality` | `answer` | 是 | `2x+3>7`, `3(x-1)<=12` |
| `flip_inequality_sign` | `transform` | 否 | `-2x+3>7` |

关键回归样例：

```ts
[
  {
    equation: '2x+3>7',
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'divide_both_sides', 'solve_inequality'],
    expectedAnswer: 'x>2'
  },
  {
    equation: '3(x-1)<=12',
    expectedOperations: ['write_equation', 'expand_brackets', 'move_term', 'simplify_expression', 'divide_both_sides', 'solve_inequality'],
    expectedAnswer: 'x\\le5'
  },
  {
    equation: '-2x+3>7',
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'flip_inequality_sign', 'solve_inequality'],
    expectedAnswer: 'x<-2'
  },
  {
    equation: '(x+1)/2=4',
    expectedOperations: ['write_equation', 'clear_denominator', 'simplify_expression', 'move_term', 'final_answer'],
    expectedAnswer: 'x=7'
  },
  {
    equation: 'x/2+x/3=5',
    expectedOperations: ['write_equation', 'clear_denominator', 'combine_like_terms', 'divide_both_sides', 'final_answer'],
    expectedAnswer: 'x=6'
  },
  {
    equation: '2(x+3)+3(x-1)=20',
    expectedOperations: ['write_equation', 'expand_brackets', 'combine_like_terms', 'move_term', 'simplify_expression', 'divide_both_sides', 'final_answer'],
    expectedAnswer: 'x=\\frac{17}{5}'
  }
]
```

当前阶段先做 coverage / regression，比继续扩题型更优。因为主链已经从 generator 延伸到 Template、AI prompt、Render 和 fallback；任何一个 operation 缺模板映射、prompt 序列化或 render 识别，新增题型都会变成“能生成但不可稳定出片”。这套回归护栏先把语义链路固定下来，后续扩题型时才不会反复打碎已跑通的主流程。

## 3. 当前模块清单

### 3.1 类型层

位置：

- `src/types/algebra.ts`
- `src/types/visuals.ts`

职责：

- 定义系统协议。
- 约束 step、problem、visual action、phase、anchor、token。

### 3.2 生成层

位置：

- `src/engine/generator/`

职责：

- 方程解析。
- 数学变换。
- 生成步骤骨架。
- 返回 supported / unsupported。

### 3.3 AI 层

位置：

- `src/engine/ai/`

职责：

- 构造 prompt。
- mock AI。
- real AI client 抽象。
- parse / validate / merge。
- orchestrator。
- observability report。

### 3.4 集成层

位置：

- `src/engine/integration/`

职责：

- 串联 Generator、Template、AI Orchestrator。
- 输出可渲染数据。

### 3.5 规范化和动画编排层

位置：

- `src/utils/templates.ts`
- `src/utils/phases.ts`
- `src/utils/anchors.ts`
- `src/utils/visualActions.ts`
- `src/utils/actionResolver.ts`
- `src/utils/timing.ts`

职责：

- 默认动作补全。
- 三阶段节奏。
- 锚点解析。
- token slot 解析。
- 时间轴生成。

### 3.6 渲染层

位置：

- `src/components/`
- `src/scenes/`
- `src/compositions/`
- `src/index.ts`

职责：

- Remotion composition。
- 公式显示。
- 高亮、移动、展开、淡入淡出、答案强调等视觉表现。
- 视频渲染。

## 4. 支持题型

Generator v1 只支持初中一元一次方程的简单整数形式。

支持：

```text
a(x+b)=c
a(x-b)=c
ax+b=c
ax-b=c
ax=c
```

其中：

- `a`、`b`、`c` 当前按整数解析。
- 未知数只支持 `x`。
- 等号左右结构要简单。

可以试用的题目：

```text
2(x+3)=14
3(x-2)=12
4(x+1)=20
3x+5=17
5x-4=16
2x=8
7x=21
x+3=10
x-5=2
```

预期支持，但建议逐个验证：

```text
-2(x+3)=10
2(x-3)=8
-3x+6=0
```

不支持：

```text
x^2+1=5
2x+3y=10
(x+1)(x+2)=12
2(x+3)+4=18
x/2+3=7
2/(x+1)=5
```

不支持原因：

- 二次方程。
- 多变量。
- 多括号。
- 复杂分式。
- 多项组合。
- 超出 v1 范围。

## 5. 最推荐的使用方式

### 5.1 生成可渲染 problem

```ts
import {buildEnhancedLessonProblem} from './engine';

const result = await buildEnhancedLessonProblem('2(x+3)=14', {
  ai: true,
  mode: 'mock',
  returnReport: true
});

if (!result.supported) {
  console.log(result.reason);
} else {
  console.log(result.problem);
  console.log(result.report);
}
```

### 5.2 不使用 AI，只用规则和模板

```ts
const result = await buildEnhancedLessonProblem('3x+5=17', {
  ai: false
});
```

输出仍然会经过 Template 规范化，可以直接用于渲染。

### 5.3 使用 mock AI

```ts
const result = await buildEnhancedLessonProblem('2(x+3)=14', {
  ai: true,
  mode: 'mock',
  returnReport: true
});
```

mock AI 不调用外部模型，适合开发和测试。

### 5.4 使用真实 AI

```ts
import {buildEnhancedLessonProblem} from './engine';
import {createRealAIEnhancer} from './engine/ai/aiClient';

const realEnhancer = createRealAIEnhancer({
  request: async (prompt) => {
    const rawJson = await callYourModel(prompt);
    return rawJson;
  },
  onError: (error) => {
    console.error(error);
  }
});

const result = await buildEnhancedLessonProblem('2(x+3)=14', {
  ai: true,
  mode: 'real',
  enhancer: realEnhancer,
  returnReport: true
});
```

注意：

- 真实 AI 必须返回严格 JSON 字符串。
- AI 输出会被校验。
- 校验失败不会覆盖原始数据。
- 没有注入 `enhancer` 或 `clients` 时，`mode: 'real'` 不会真正调用 AI。

### 5.5 分阶段注入真实 AI

```ts
const result = await buildEnhancedLessonProblem('2(x+3)=14', {
  ai: true,
  mode: 'real',
  clients: {
    note: noteEnhancer,
    tokenMap: tokenMapEnhancer,
    visualActions: visualActionsEnhancer
  },
  returnReport: true
});
```

这样可以让不同阶段使用不同模型或不同 prompt 策略。

## 6. 输出结果示例

调用：

```ts
const result = await buildEnhancedLessonProblem('2(x+3)=14', {
  ai: true,
  mode: 'mock',
  returnReport: true
});
```

结果结构：

```json
{
  "supported": true,
  "problem": {
    "equation": "2(x+3)=14",
    "answer": "x=4",
    "steps": [
      {
        "id": "s1",
        "kind": "write",
        "latex": "2(x+3)=14",
        "note": "写出原方程",
        "visualActions": []
      },
      {
        "id": "s2",
        "kind": "expand",
        "latex": "2x+6=14",
        "note": "用乘法分配律展开括号",
        "visualActions": [
          {"type": "highlight", "target": "source"},
          {"type": "expand"}
        ]
      },
      {
        "id": "s3",
        "kind": "move",
        "latex": "2x=14-6",
        "note": "把常数项移到等号右边",
        "visualActions": [
          {"type": "highlight", "target": "moving_term"},
          {"type": "move", "term": "moving_term", "targetSide": "right"},
          {"type": "fade_out", "target": "moving_term"},
          {"type": "fade_in", "target": "result_term"}
        ]
      },
      {
        "id": "s4",
        "kind": "transform",
        "latex": "2x=8",
        "note": "计算并化简右边",
        "visualActions": []
      },
      {
        "id": "s5",
        "kind": "answer",
        "latex": "x=4",
        "note": "系数化为 1，得到答案",
        "visualActions": [
          {"type": "answer", "target": "answer_term"}
        ]
      }
    ]
  }
}
```

## 7. Unsupported 示例

调用：

```ts
const result = await buildEnhancedLessonProblem('x^2+1=5', {
  ai: true,
  mode: 'mock',
  returnReport: true
});
```

返回：

```json
{
  "supported": false,
  "equation": "x^2+1=5",
  "reason": "Algebra Step Generator v1 only supports a(x+b)=c, a(x-b)=c, ax+b=c, ax-b=c, and ax=c with integer values."
}
```

## 8. Report 怎么看

Report 是给开发者看的运行诊断结果，不会自动写进视频文件。

获取方式：

```ts
const result = await buildEnhancedLessonProblem('2(x+3)=14', {
  ai: true,
  mode: 'mock',
  returnReport: true
});

if (result.supported) {
  console.log(result.report);
}
```

示例：

```json
{
  "stages": {
    "note": {
      "durationMs": 1,
      "enabled": true,
      "mergedStepCount": 5,
      "skipped": false,
      "stage": "note",
      "success": true
    },
    "tokenMap": {
      "durationMs": 0,
      "enabled": true,
      "mergedStepCount": 4,
      "skipped": false,
      "stage": "tokenMap",
      "success": true
    },
    "visualActions": {
      "durationMs": 0,
      "enabled": true,
      "mergedStepCount": 0,
      "reason": "no_steps_merged",
      "skipped": false,
      "stage": "visualActions",
      "success": true
    }
  },
  "success": true,
  "totalDurationMs": 1
}
```

字段含义：

```text
enabled          这一段是否启用
success          请求、解析、校验是否成功
skipped          是否被配置跳过
mergedStepCount  实际改动了多少个 step
durationMs       阶段耗时
reason           失败或无改动原因
```

常见 reason：

```text
stage_disabled              阶段被关闭
real_mode_without_client    real 模式没有注入真实 client
ai_client_returned_null     AI client 返回 null
parse_or_validation_failed  AI 返回不是合法 JSON 或没通过校验
no_steps_merged             阶段成功，但没有实际覆盖 step
```

## 9. 渲染视频

安装依赖：

```bash
npm install
```

类型检查：

```bash
npm run typecheck
```

本地预览：

```bash
npm run dev
```

渲染视频：

```bash
npm run render
```

默认输出：

```text
out/algebra-linear-equation-mvp.mp4
```

当前 Remotion 渲染入口仍使用项目已有 composition 和数据文件。End-to-End Integration 已经提供可渲染 `AlgebraProblem`，后续可以继续把 scene/data 入口收敛到 `buildEnhancedLessonProblem`。

## 10. 调试建议

### 10.1 先验证题型是否支持

```ts
const result = await buildEnhancedLessonProblem('3x+5=17', {
  ai: false
});

if (!result.supported) {
  console.log(result.reason);
}
```

### 10.2 再打开 mock AI

```ts
const result = await buildEnhancedLessonProblem('3x+5=17', {
  ai: true,
  mode: 'mock',
  returnReport: true
});
```

### 10.3 最后接真实 AI

```ts
const result = await buildEnhancedLessonProblem('3x+5=17', {
  ai: true,
  mode: 'real',
  enhancer: realEnhancer,
  returnReport: true
});
```

如果视频里效果缺失，先看 report：

- note 没成功：检查 AI 返回 JSON。
- tokenMap 没成功：检查 token text 是否真实存在于 `latex`。
- visualActions 没成功：检查 action type 和字段结构。
- mergedStepCount 为 0：说明这段成功执行，但没有产生实际覆盖。

## 11. 当前边界

当前系统不是通用数学 CAS，也不是复杂方程求解器。

明确不做：

- 多变量方程。
- 二次方程。
- 多括号展开。
- 复杂分式。
- KaTeX AST 深层解析。
- AI 接管数学推导。
- AI 直接改渲染组件。

当前策略是：

```text
规则系统保证数学正确性
Template 保证默认可渲染
AI 只做增强
Report 负责诊断
Integration 提供统一入口
```

## 12. 后续扩展方向

可以继续做：

- 阅读 [Equation Family Expansion Plan v1](./equation-family-expansion-plan-v1.md)，按代数家族而不是零散题型推进后续扩展。
- 阅读 [Quadratic Equation Family Plan v1](./quadratic-equation-family-plan-v1.md)，先把一元二次方程的分支解语义和 operation 设计清楚，再进入试点实现。
- 阅读 [Quadratic Formula Plan v1](./quadratic-formula-plan-v1.md)，先把判别式、根的个数分类和无实数解表达规划清楚，再进入求根公式型试点。
- 阅读 [Linear System Family Plan v1](./linear-system-family-plan-v1.md)，先把二元一次方程组的代入法、消元法和结果分类规划清楚，再进入最小试点。
- 阅读 [Variable-Denominator Fraction Inequality Plan v1](./variable-denominator-fraction-inequality-plan-v1.md)，先规划变量分母分式不等式的定义域与区间分析链路，再进入实现。
- 把 Remotion scene 的数据来源切换为 `buildEnhancedLessonProblem`。
- 增加 CLI 脚本：输入方程，输出 problem JSON 和 report JSON。
- 增加更多题型：
  - `a(x+b)+d=c`
  - `ax+b=dx+c`
  - 简单分式方程
- 增加 token 精准定位。
- 接入真实 AI SDK。
- 把 report 写入 `out/report.json`，方便每次渲染后查看。

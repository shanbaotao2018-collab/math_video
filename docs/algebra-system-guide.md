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

- 把 Remotion scene 的数据来源切换为 `buildEnhancedLessonProblem`。
- 增加 CLI 脚本：输入方程，输出 problem JSON 和 report JSON。
- 增加更多题型：
  - `a(x+b)+d=c`
  - `ax+b=dx+c`
  - 简单分式方程
- 增加 token 精准定位。
- 接入真实 AI SDK。
- 把 report 写入 `out/report.json`，方便每次渲染后查看。

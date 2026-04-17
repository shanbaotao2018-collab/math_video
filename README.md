# Math Video

基于 React + TypeScript + Remotion 的初中代数推导视频项目。

当前项目用于生成黑板风格的代数推导视频，支持：

- KaTeX 数学公式渲染
- 数据驱动题目、步骤、字幕、答案
- 两种可切换布局
- 自动步骤时间轴分配
- 关键步骤视觉引导箭头

## 环境要求

- Node.js 20+
- npm 10+

如果本机 `npm` 缓存目录权限异常，可使用：

```bash
npm install --cache /tmp/math-video-npm-cache
```

## 安装依赖

```bash
npm install
```

或：

```bash
npm install --cache /tmp/math-video-npm-cache
```

## 常用命令

本地预览：

```bash
npm run dev
```

类型检查：

```bash
npm run typecheck
```

渲染视频：

```bash
npm run render
```

统一产品入口：

```bash
npm run product -- "x+y=5, x-y=1"
```

交付层 Web Demo + API：

```bash
npm run delivery
```

带 AI 编排和完整 report：

```bash
npm run product -- --equation "x^2-2x-1=0" --ai
```

默认输出文件：

```text
out/algebra-linear-equation-mvp.mp4
```

## 产品化入口

题型支持范围和输入规范见：[支持题型使用手册](docs/supported-problem-types-manual.md)。

`npm run product` 会返回一个统一的 JSON 对象，至少包含：

- `schemaVersion`: product entry schema 版本
- `versions`: 当前 engine / product entry / capability catalog 版本
- `changeSummary`: 当前 release 与最小变更摘要
- `family`: 家族识别结果
- `supported`: 是否处于支持链路
- `quality`: `full / partial / fallback / unsupported`
- `qualityTier`: `instant / basic / standard / detailed`
- `qualityLabel`: 对外展示用教学质量标签
- `presentationStrategy`: 实际展示策略
- `presentationSource`: `auto / override`
- `teachingScript`: 面向短视频口播/字幕的结构化教学脚本
- `shotPlan`: 面向视频层的结构化镜头计划
- `subtitleCuePlan`: 面向字幕和口播对齐的 cue 时间轴
- `videoRender`: 视频渲染就绪状态与推荐视口
- `report`: AI 编排报告，未启用时为空
- `problem`: 归一化后的推导结果
- `lesson`: 可直接送进当前 scene/composition 的 render-ready lesson
- `render`: 当前渲染入口信息，包含 `renderable` 和 `lessonIncluded`

补充 QA 脚本：

```bash
npm run demo:qa
```

最小视频导出：

```bash
npm run video -- "2x+3=7"
```

示例：

```bash
npm run product -- "x+y=2, x+y=5"
```

返回结果中会明确显示：

- `schemaVersion: "algebra-product-entry-v1"`
- `versions.engineVersion: "0.1.0"`
- `family.id: "linear_system"`
- `supported: true`
- `quality: "partial"` 或 `quality: "fallback"` / `quality: "unsupported"`
- `qualityTier: "detailed"`
- `presentationStrategy.id: "semantic_full_steps"`
- `teachingScript.steps`
- `shotPlan.shots`
- `subtitleCuePlan.cues`
- `videoRender.renderable`
- `problem.steps`
- `lesson.layout: "combined-main"`
- `render.compositionId: "AlgebraLinearEquationMvp"`

### presentationMode

默认 `presentationMode` 是 `auto`，会根据 `qualityTier` 自动选择展示策略。调用方也可以显式覆盖：

```bash
npm run product -- --presentation-mode full_steps "2x+3=7"
npm run product -- --presentation-mode answer_only "x+y=5, x-y=1"
```

可选值：

- `auto`: 按 `qualityTier` 自动映射
- `answer_only`: 只返回最终答案或极简步骤
- `compact_steps`: 精简关键步骤
- `full_steps`: 保留完整标准流程
- `semantic_full_steps`: 完整流程并强化区间、分支或系统求解提示

`qualityTier` 当前含义：

- `instant`: 一步解或极简单题
- `basic`: 简单线性题
- `standard`: 标准教学流程，如分式方程、二次方程
- `detailed`: 复杂链路，如分式不等式、方程组

## Delivery 入口

`npm run delivery` 会启动一个最小 Web Demo，同时暴露 HTTP API：

- Web Demo: `GET /`
- 健康检查: `GET /health`
- 能力目录: `GET /capabilities`
- 内容样例包: `GET /examples`
- 求解接口: `POST /solve`

`GET /health` 现在也会返回版本和最近一次变更摘要：

```bash
curl -s http://127.0.0.1:4173/health
```

```json
{
  "ok": true,
  "versions": {
    "engineVersion": "0.1.0",
    "productEntrySchemaVersion": "algebra-product-entry-v1",
    "capabilityCatalogSchemaVersion": "algebra-capability-catalog-v1"
  },
  "changeSummary": {
    "currentReleaseId": "subtitle-voice-cue-pass-v1",
    "strategy": "stable-contract-with-additive-expansion",
    "latest": {
      "id": "subtitle-voice-cue-pass-v1",
      "date": "2026-04-15",
      "contractImpact": "minor"
    }
  }
}
```

`POST /solve` 请求体字段：

```json
{
  "equation": "x+y=5, x-y=1",
  "ai": false,
  "includeLesson": true,
  "presentationMode": "auto",
  "returnReport": true,
  "noFallback": false
}
```

返回值就是 `buildAlgebraProductEntry(...)` 的完整结构。

`GET /capabilities` 返回第一版能力目录，包含支持 family、shape 示例、推荐 `qualityTier` / `presentationMode`、结果形态和边界样例。

`GET /examples` 返回官方内容包，覆盖 featured、teaching、edge 和 unsupported 四组正式样例。

示例：

```bash
curl -s http://127.0.0.1:4173/examples
```

响应结构核心字段：

```json
{
  "schemaVersion": "algebra-content-pack-v1",
  "featured_examples": [
    {
      "id": "featured-linear-system-substitution",
      "equation": "x+y=5, x-y=1",
      "family": "linear_system",
      "label": "方程组代入法演示题",
      "difficulty": "detailed",
      "recommendedPresentationMode": "semantic_full_steps",
      "tags": ["featured", "system", "substitution"]
    }
  ],
  "teaching_examples": [],
  "edge_cases": [],
  "unsupported_examples": []
}
```

示例：

```bash
curl -s http://127.0.0.1:4173/capabilities
```

响应结构核心字段：

```json
{
  "versions": {
    "engineVersion": "0.1.0",
    "productEntrySchemaVersion": "algebra-product-entry-v1",
    "capabilityCatalogSchemaVersion": "algebra-capability-catalog-v1"
  },
  "schemaVersion": "algebra-capability-catalog-v1",
  "changeSummary": {
    "currentReleaseId": "subtitle-voice-cue-pass-v1"
  },
  "boundaries": {
    "fallback": {
      "when": "默认 fallbackOnUnsupported=true。",
      "behavior": "返回可渲染的 fallback problem..."
    },
    "unsupported": {
      "when": "fallbackOnUnsupported=false 或 CLI 使用 --no-fallback。",
      "behavior": "返回 supported=false 和 quality=unsupported..."
    }
  },
  "families": [
    {
      "family": "linear_system",
      "supportedShapes": [
        {
          "id": "linear-system-substitution-basic / linear-system-substitution-solved",
          "label": "代入法",
          "examples": ["x+y=5, x-y=1", "y=2x+1, x+y=7"]
        }
      ],
      "currentResult": {
        "kind": "system_solution",
        "format": "方程组分类结果",
        "examples": ["(x, y) = (3, 2)", "无解", "无穷多解"]
      },
      "recommendation": {
        "qualityTier": "detailed",
        "presentationMode": "semantic_full_steps"
      },
      "boundaries": [
        {
          "behavior": "fallback",
          "example": "x+y+z=3, x-y=1",
          "reason": "当前方程组只覆盖二元一次试点形态。"
        }
      ]
    }
  ]
}
```

## 能力目录

当前支持家族：

| family | 支持形态示例 | 推荐 tier / mode | 当前结果形态 |
|---|---|---|---|
| `linear_equation` | `2x=8`, `2x+3=7`, `2(x+3)=14` | `basic` / `compact_steps` | `x=...` |
| `linear_inequality` | `2x+3>7`, `-2x+3>7`, `2(x+3)<=14` | `basic` / `compact_steps` | `x relation value` |
| `fraction_equation` | `(x+1)/2=4`, `x/2+x/3=5` | `standard` / `full_steps` | `x=...` |
| `fraction_inequality` | `(x+1)/2<=4`, `(x-1)/(x+2)>0` | `detailed` / `semantic_full_steps` | 区间或不等式解集 |
| `linear_system` | `x+y=5, x-y=1`, `2x+y=7, 2x-y=1` | `detailed` / `semantic_full_steps` | 有序数对、无解或无穷多解 |
| `quadratic_equation` | `x^2=16`, `x^2-5x+6=0`, `x^2-2x-1=0` | `standard` / `full_steps` | 两个实根、重根或无实数解 |

边界行为：

- 默认 `fallbackOnUnsupported=true`：不支持题型返回 `quality: "fallback"`，保留可渲染 fallback problem 和边界说明。
- `fallbackOnUnsupported=false` 或 CLI `--no-fallback`：不支持题型返回 `supported: false`、`quality: "unsupported"`，通常不包含 `problem / lesson`。
- 示例边界：`x/(-2)+3=7` 当前不在分式方程自动推导范围内。

### capability catalog 结构

- `versions`: 当前 engine / product entry / capability catalog 版本
- `schemaVersion`: 目录版本，当前固定为 `algebra-capability-catalog-v1`
- `changeSummary`: 最小 changelog 摘要，包含当前 release、策略和 changelog entries
- `boundaries`: 全局 fallback / unsupported 行为说明
- `families[]`: 每个已支持家族的对外能力描述
- `families[].supportedShapes[]`: 当前已支持的 shape id、标签、示例和补充说明
- `families[].currentResult`: 当前结果形态，描述输出种类、展示格式和示例答案
- `families[].recommendation`: 推荐的 `qualityTier` / `presentationMode`，以及推荐原因
- `families[].boundaries[]`: 当前家族的 fallback / unsupported 边界样例
- `presentationModes[]`: delivery 层允许调用方传入的展示模式
- `qualityTiers[]`: 当前教学质量分层定义

### changelog 结构

- `changeSummary.currentReleaseId`: 当前 release id
- `changeSummary.latest`: 最近一次变更的标题、日期、impact 和摘要
- `changeSummary.entries[]`: 追加式 changelog
- `changeSummary.entries[].changes.familiesAdded[]`: 新增 family
- `changeSummary.entries[].changes.shapesAdded[]`: 新增 shape
- `changeSummary.entries[].changes.presentationModesAdded[]`: 新增 presentationMode
- `changeSummary.entries[].changes.qualityTiersAdded[]`: 新增 qualityTier
- `changeSummary.entries[].changes.resultShapeChanges[]`: 新增或变化的结果形态

## 内容包

官方内容包用于统一 Web Demo、API 样例、教学演示和人工评估入口，当前包含：

- `featured_examples`: 首屏演示题和对外展示题
- `teaching_examples`: 标准教学流程题
- `edge_cases`: 分类、区间、无解/重根等边界题
- `unsupported_examples`: 用于展示 fallback / unsupported 行为的正式不支持题

### content pack 结构

- `schemaVersion`: 当前固定为 `algebra-content-pack-v1`
- `versions`: 当前 engine / product entry / capability catalog 版本
- `changeSummary`: 当前 release 与变更摘要
- `categories[]`: 用于 Web Demo 展示的分组列表
- `featured_examples[]` / `teaching_examples[]` / `edge_cases[]` / `unsupported_examples[]`
- 每条示例至少包含：
  - `id`
  - `equation`
  - `family`
  - `label`
  - `difficulty`（可选）
  - `recommendedPresentationMode`（可选）
  - `tags`（可选）
  - `qa`（Demo QA 用的最小断言）

### content pack QA 字段

`qa` 当前用于 Demo QA runner，最小结构为：

- `expectedFamily`
- `expectedSupported`
- `expectedRenderable`
- `recommendedPresentationModeAvailable`（可选）
- `stepCountRange.min`
- `stepCountRange.max`

这些断言用于校验：

- family 是否与内容包声明一致
- supported / renderable 是否符合演示预期
- 推荐 `presentationMode` 是否真的可用
- 输出 step count 是否落在可接受区间

## Demo QA

`npm run demo:qa` 会基于官方 content pack 逐题调用当前 product entry，作为 `evaluate` / `regression:operations` 之外的补充检查。

输出至少包括：

- `featured_examples` pass rate
- `teaching_examples` pass rate
- `edge_cases` pass rate
- `unsupported_examples` pass rate

示例摘要：

```text
[demo-qa] featured_examples: 3/3 passed (100.0%)
[demo-qa] teaching_examples: 5/5 passed (100.0%)
[demo-qa] edge_cases: 4/4 passed (100.0%)
[demo-qa] unsupported_examples: 6/6 passed (100.0%)
[demo-qa] total: 18/18 passed (100.0%)
```

### 推荐演示题

- `2(x+3)=14`: 适合展示一次方程的展开与移项
- `x+y=5, x-y=1`: 适合展示方程组的详细教学链路
- `x/2+x/3=5`: 适合展示去分母后的标准流程
- `(x-1)/(x+2)>0`: 适合展示定义域、临界点和区间分析
- `x^2-2x-1=0`: 适合展示求根公式链路
- `x+y=2, x+y=5`: 适合展示无解边界题
- `x/(-2)+3=7`: 适合展示 unsupported/fallback 边界行为

## Teaching Script

`teachingScript` 是在 `problem.steps` 之上生成的一层短视频教学脚本，复用已有的 `operation`、`note`、`family` 和展示后的 step 序列。

结构：

```ts
type TeachingScript = {
  introHook?: string;
  steps: TeachingScriptStep[];
  outroSummary?: string;
};

type TeachingScriptStep = {
  stepId: string;
  narration: string;
  emphasis?: string;
  mistakeWarning?: string;
  memoryTip?: string;
  pacingHint?: 'fast' | 'normal' | 'slow' | 'pause';
};
```

说明：

- `stepId` 与返回的 `problem.steps[i].id` 对齐
- `narration` 是口播主句，不允许为空
- `emphasis` 是该步最值得高亮的教学点
- `mistakeWarning` 是易错提醒
- `memoryTip` 是口诀或记忆点
- `pacingHint` 为后续视频节奏层预留

fallback / unsupported 行为：

- `fallback`: 返回最小可解释的 teachingScript
- `unsupported`: 若没有 `problem`，则 `teachingScript` 为空

### 样例摘要

`2x+3=7`

```json
{
  "introHook": "我们来看这道基础方程，关键是一步一步把 x 单独留下来。",
  "steps": [
    {"stepId": "s1", "narration": "先把题目写清楚，看看已知条件是什么。"},
    {"stepId": "s2", "narration": "把这一项移到另一边，记得符号要跟着改变。"},
    {"stepId": "s5", "narration": "这一步得到最终结果。"}
  ],
  "outroSummary": "最后答案是：x=2。"
}
```

`x^2-2x-1=0`

```json
{
  "introHook": "这是一元二次方程，先看它最后会有几个解。",
  "steps": [
    {"stepId": "s1", "narration": "先把题目写清楚，看看已知条件是什么。"},
    {"stepId": "s2", "narration": "先算判别式，看看后面该怎么求。"},
    {"stepId": "s3", "narration": "先看判别式，判断这个方程有几个解。"},
    {"stepId": "s4", "narration": "把系数代入求根公式，再把正负两个分支分别算出来。"},
    {"stepId": "s5", "narration": "把几个结果合在一起，就是最终答案。"}
  ],
  "outroSummary": "最后答案是：x=1-根号2 或 x=1+根号2。"
}
```

`x+y=5, x-y=1`

```json
{
  "introHook": "这道题是方程组，关键是把两个方程变成一个来解。",
  "steps": [
    {"stepId": "s1", "narration": "先把题目写清楚，看看已知条件是什么。"},
    {"stepId": "s2", "narration": "先把一个变量单独写出来，方便后面代入。"},
    {"stepId": "s3", "narration": "把刚才的式子代进去，把两个方程先化成一个一元方程。"},
    {"stepId": "s9", "narration": "已经知道一个变量了，再代回去求另一个变量。"},
    {"stepId": "s10", "narration": "把两个变量配成一组，这就是方程组的解。"}
  ],
  "outroSummary": "最后答案是：(x,y)=(3,2)。"
}
```

## Shot Plan

`shotPlan` 是在 `teachingScript` 之上生成的一层视频规划数据，把每一步口播映射成可驱动渲染的镜头序列。

结构：

```ts
type ShotPlan = {
  shots: TeachingShot[];
};

type TeachingShot = {
  shotId: string;
  stepId: string;
  narration: string;
  shotType:
    | 'write'
    | 'transform'
    | 'highlight'
    | 'substitute'
    | 'eliminate'
    | 'interval'
    | 'branch'
    | 'answer';
  focusLatex?: string;
  animation?:
    | 'fade_in'
    | 'slide_left'
    | 'slide_right'
    | 'highlight_pulse'
    | 'replace'
    | 'draw';
  durationMs: number;
};
```

说明：

- `shotId` 全局唯一，当前按 `sh1 / sh2 / ...` 生成
- `stepId` 与 `teachingScript.steps[].stepId`、`problem.steps[].id` 对齐
- `narration` 直接复用 teachingScript 的口播主句
- `shotType` 决定镜头语义，如写题、变形、高亮、代入、区间分析、分支展示、答案收束
- `animation` 是建议动画，不是实际渲染实现
- `focusLatex` 优先取 operation 里的关键 latex，再回退到 `step.latex`
- `durationMs` 用于控制每个镜头停留时长

### duration 规则

- 先按口播字数估算：`字数 / 4 * 1000`
- 再叠加 shotType 偏置：
  - `write`: `+500ms`
  - `transform`: `+300ms`
  - `highlight`: `+700ms`
  - `substitute`: `+800ms`
  - `eliminate`: `+800ms`
  - `interval`: `+1200ms`
  - `branch`: `+1000ms`
  - `answer`: `+1500ms`
- 最后叠加 pacingHint：
  - `fast`: `×0.8`
  - `normal`: `×1`
  - `slow`: `×1.3`
  - `pause`: `×1.5`
- 输出会被限制在 `800ms ~ 6000ms`

### 如何驱动视频渲染

- `shotType` 决定当前镜头的视觉语义
- `animation` 决定推荐转场或强调方式
- `focusLatex` 决定公式层该聚焦的内容
- `durationMs` 决定镜头节奏

这层本身不做视频渲染，但已经把“教学口播”转换成“视频可执行计划”。

### 样例摘要

`2x+3=7`

```json
[
  {"shotType": "write", "durationMs": 4000},
  {"shotType": "transform", "durationMs": 5300},
  {"shotType": "answer", "durationMs": 6000}
]
```

`x^2-2x-1=0`

```json
[
  {"shotType": "write", "durationMs": 4000},
  {"shotType": "transform", "durationMs": 4050},
  {"shotType": "highlight", "durationMs": 6000},
  {"shotType": "branch", "durationMs": 6000},
  {"shotType": "branch", "durationMs": 6000},
  {"shotType": "answer", "durationMs": 6000}
]
```

`x+y=5, x-y=1`

```json
[
  {"shotType": "write", "durationMs": 4000},
  {"shotType": "highlight", "durationMs": 5450},
  {"shotType": "substitute", "durationMs": 6000},
  {"shotType": "transform", "durationMs": 5550},
  {"shotType": "transform", "durationMs": 5300},
  {"shotType": "transform", "durationMs": 2300},
  {"shotType": "transform", "durationMs": 3440},
  {"shotType": "transform", "durationMs": 3840},
  {"shotType": "transform", "durationMs": 5550},
  {"shotType": "answer", "durationMs": 6000}
]
```

## Video Render Pass v1

当前最小视频链路：

```text
buildAlgebraProductEntry
-> teachingScript
-> shotPlan
-> buildVideoRenderPlan
-> buildVideoHtml
-> Chrome headless 截帧
-> ffmpeg 合成 mp4
```

### VideoRenderPlan

```ts
type VideoRenderPlan = {
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  shots: VideoRenderShot[];
};

type VideoRenderShot = {
  shotId: string;
  stepId: string;
  startMs: number;
  endMs: number;
  shotType: string;
  narration: string;
  subtitle: string;
  focusLatex?: string;
  animation?: string;
};
```

默认视口：

- `width: 1080`
- `height: 1920`
- `fps: 30`

### HTML 结构

生成的 HTML 视频页至少包含：

- `#video-root`
- `#video-frame`
- `.video-header`
- `.formula-card`
- `#formula-latex`
- `#context-panel`
- `.video-footer`
- `#subtitle-bar`
- `#timeline-root`

页面支持两种模式：

- 直接打开 HTML：自动按 `renderPlan.shots` 播放
- 在 URL 后加 `?view=timeline`：切换到时间轴检查页

### 使用方式

```bash
npm run video -- "2x+3=7"
npm run video -- "x^2-2x-1=0" --html-only
npm run video -- "x+y=5, x-y=1" --html-only
```

输出到 `out/`：

- `algebra-video-<slug>.html`
- `algebra-video-<slug>-timeline.html`
- `algebra-video-<slug>.render-plan.json`
- `algebra-video-<slug>.product-entry.json`
- `algebra-video-<slug>-frames/`
- `algebra-video-<slug>.mp4`（导出成功时）

### 当前限制

- 先做结构化视频，不包含 TTS
- 字幕暂时直接复用 narration
- 公式区当前优先稳定输出 latex 字符串
- mp4 导出依赖本机 Chrome headless 与 ffmpeg

## Subtitle & Voice Cue Pass v1

`subtitleCuePlan` 是把 `teachingScript.steps` 和 `videoRenderPlan.shots` 收口后的稳定 cue 时间轴。

结构：

```ts
type SubtitleCuePlan = {
  cues: SubtitleCue[];
};

type SubtitleCue = {
  cueId: string;
  stepId: string;
  shotId: string;
  text: string;
  startMs: number;
  endMs: number;
  emphasis?: string;
};
```

说明：

- `cueId` 全局唯一，当前按 `cue1 / cue2 / ...` 生成
- `stepId` 对应 `problem.steps[].id`
- `shotId` 对应 `videoRenderPlan.shots[].shotId`
- `text` 默认来自 `teachingScript.steps[].narration`
- `startMs / endMs` 与对应 shot 对齐
- `emphasis` 复用 teachingScript 的重点提示

当前 HTML 视频页已优先消费 `subtitleCuePlan`，不再直接把字幕条绑定到 `shot.narration`。

视频导出脚本还会同步写出：

- `out/algebra-video-<slug>.subtitle-cues.json`
- `out/algebra-video-<slug>.srt`

### cue 样例

`2x+3=7`

```json
[
  {"cueId": "cue1", "stepId": "s1", "text": "先把题目写清楚，看看已知条件是什么。", "startMs": 0, "endMs": 4000},
  {"cueId": "cue2", "stepId": "s2", "text": "把这一项移到另一边，记得符号要跟着改变。", "startMs": 4000, "endMs": 9300},
  {"cueId": "cue3", "stepId": "s5", "text": "这一步得到最终结果。", "startMs": 9300, "endMs": 15300}
]
```

`x^2-2x-1=0`

```json
[
  {"cueId": "cue1", "stepId": "s1", "text": "先把题目写清楚，看看已知条件是什么。", "startMs": 0, "endMs": 4000},
  {"cueId": "cue3", "stepId": "s3", "text": "先看判别式，判断这个方程有几个解。", "startMs": 8050, "endMs": 14050},
  {"cueId": "cue6", "stepId": "s5", "text": "把几个结果合在一起，就是最终答案。", "startMs": 26050, "endMs": 32050}
]
```

`x+y=5, x-y=1`

```json
[
  {"cueId": "cue2", "stepId": "s2", "text": "先把一个变量单独写出来，方便后面代入。", "startMs": 4000, "endMs": 9450},
  {"cueId": "cue3", "stepId": "s3", "text": "把刚才的式子代进去，把两个方程先化成一个一元方程。", "startMs": 9450, "endMs": 15450},
  {"cueId": "cue10", "stepId": "s10", "text": "把两个变量配成一组，这就是方程组的解。", "startMs": 41430, "endMs": 47430}
]
```

## 兼容性与变更策略

稳定合同字段：

- product entry: `schemaVersion`、`versions`、`changeSummary.currentReleaseId`、`family.id`、`supported`、`quality`、`qualityTier`、`presentationStrategy.id`、`render.renderable`、`videoRender.renderable`、`subtitleCuePlan.cues`
- capability catalog: `schemaVersion`、`versions`、`changeSummary`、`families[].family`、`families[].supportedShapes`、`families[].currentResult`、`presentationModes`、`qualityTiers`
- delivery API: `GET /health` 的 `versions` / `changeSummary`，`GET /capabilities` 的 catalog 骨架，`POST /solve` 的 product entry 骨架

允许增量扩展的部分：

- 新增 family、shape、boundary 示例、changelog entries
- 在现有对象中新增非必需字段
- 为 `presentationModes`、`qualityTiers`、`currentResult.examples` 增加更多值，只要旧值语义不变

以下情况视为 breaking change：

- 删除、重命名或改变稳定合同字段的语义
- 修改 `quality`、`qualityTier`、`presentationStrategy.id`、`family.id` 已有枚举值的含义
- 将当前可解析的返回对象改成需要不同解析路径的结构
- 在不变更 schema version 的前提下，移除旧调用方依赖的字段

## 项目结构

```text
src/
  compositions/   Remotion composition 入口
  scenes/         页面级布局与时序逻辑
  components/     可复用渲染组件
  data/           题目与步骤数据
  types/          TypeScript 类型定义
  utils/          时间轴与工具函数
  styles/         全局样式
```

## 数据入口

当前示例数据文件：

[src/data/linearEquationLesson.ts](/Users/shanbaotao/math_video/src/data/linearEquationLesson.ts)

数据类型定义：

[src/types/algebra.ts](/Users/shanbaotao/math_video/src/types/algebra.ts)

当前 `AlgebraLesson` 主要字段：

- `layout`: 布局类型
- `title`: 标题
- `problemType`: 题型名
- `prompt`: 题目公式
- `strategy`: 解题思路
- `answer`: 最终答案
- `labels`: 页面文案
- `steps`: 推导步骤
- `pacing`: 片头和答案停留等时长

## 步骤数据格式

单步结构：

```ts
{
  id: 's2',
  expression: '2x+6=14',
  note: '展开括号',
  kind: 'expand',
  guide: 'expand'
}
```

字段说明：

- `id`: 步骤唯一标识，必须唯一
- `expression`: 当前步骤显示的公式，使用 KaTeX/LaTeX 语法
- `note`: 当前步骤字幕，可省略
- `kind`: 步骤类型
- `guide`: 可选视觉引导类型

`kind` 可选值：

- `'write'`
- `'transform'`
- `'expand'`
- `'move'`
- `'answer'`

`guide` 可选值：

- `'expand'`
- `'move'`

如果不写 `guide`，系统会自动推断：

- `kind === 'expand'` -> `guide: 'expand'`
- `kind === 'move'` -> `guide: 'move'`

## 可直接渲染的数据例子

```ts
import type {AlgebraLesson} from '../types/algebra';

export const linearEquationLesson: AlgebraLesson = {
  layout: 'combined-main',
  title: '解一元一次方程',
  problemType: '一元一次方程',
  prompt: '2(x+3)=14',
  strategy: '先展开括号，再移项，最后把未知数前面的系数化为 1。',
  answer: 'x=4',
  labels: {
    kicker: '初中代数推导视频 MVP',
    subtitle: '一元一次方程',
    problemSection: '题目',
    strategySection: '思路',
    stepsSection: '推导过程',
    answerTag: '最终答案'
  },
  pacing: {
    introFrames: 45,
    stepHoldFrames: 55,
    stepGapFrames: 28,
    answerHoldFrames: 60
  },
  steps: [
    {
      id: 's1',
      expression: '2(x+3)=14',
      kind: 'write'
    },
    {
      id: 's2',
      expression: '2x+6=14',
      note: '展开括号',
      kind: 'expand',
      guide: 'expand'
    },
    {
      id: 's3',
      expression: '2x=8',
      note: '两边同时减去 6',
      kind: 'move',
      guide: 'move'
    },
    {
      id: 's4',
      expression: 'x=4',
      note: '两边同时除以 2',
      kind: 'answer'
    }
  ]
};
```

## 布局

在数据中通过 `layout` 指定：

```ts
layout: 'split-panels'
```

或：

```ts
layout: 'combined-main'
```

含义：

- `split-panels`: 左侧题目和思路，右侧推导过程，底部字幕
- `combined-main`: 只保留两部分
  - 上方主内容：`prompt + steps + answer`
  - 下方字幕：当前步骤说明

两种布局共用：

- 黑板背景
- KaTeX 公式渲染
- 时间轴
- 底部字幕
- 答案高亮
- 视觉引导箭头

## 时间轴机制

时间轴工具文件：

[src/utils/timing.ts](/Users/shanbaotao/math_video/src/utils/timing.ts)

提供两个核心函数：

- `getStepDuration(step)`
- `buildStepTimeline(steps)`

### 当前 timing 规则

- 基础时长 `40` 帧
- 每个 LaTeX 可见字符 `+2` 帧
- 如果有 `note`，额外 `+15` 帧
- 如果 `kind` 是 `expand / move / transform`，额外 `+20` 帧
- 如果 `kind` 是 `answer`，额外 `+40` 帧

`buildStepTimeline(steps)` 返回：

- 每一步的 `id / from / duration`
- `totalFrames`

渲染时会在控制台输出 timeline 调试信息。

## 视觉引导箭头

相关组件：

- [src/components/ArrowGuide.tsx](/Users/shanbaotao/math_video/src/components/ArrowGuide.tsx)
- [src/components/GuideLayer.tsx](/Users/shanbaotao/math_video/src/components/GuideLayer.tsx)

行为：

- `expand`: 显示两条分支箭头
- `move`: 显示一条横向箭头
- 只在当前步骤显示
- 上一步不会保留箭头
- 动画时长约占当前 step 的 `60%`

当前限制：

- 箭头使用固定相对坐标
- 不依赖 KaTeX DOM
- 表达的是“方向引导”，不是精确字符级定位

## 当前 Composition

- ID: `AlgebraLinearEquationMvp`
- 分辨率: `1920x1080`
- 帧率: `30fps`

入口文件：

- [src/index.ts](/Users/shanbaotao/math_video/src/index.ts)
- [src/Root.tsx](/Users/shanbaotao/math_video/src/Root.tsx)

## 常见修改位置

- 调整布局与场景逻辑：
  [src/scenes/LinearEquationLessonScene.tsx](/Users/shanbaotao/math_video/src/scenes/LinearEquationLessonScene.tsx)
- 调整全局样式：
  [src/styles/global.css](/Users/shanbaotao/math_video/src/styles/global.css)
- 调整步骤显示：
  [src/components/StepCard.tsx](/Users/shanbaotao/math_video/src/components/StepCard.tsx)
- 调整字幕样式：
  [src/components/SubtitleBar.tsx](/Users/shanbaotao/math_video/src/components/SubtitleBar.tsx)
- 调整时间轴规则：
  [src/utils/timing.ts](/Users/shanbaotao/math_video/src/utils/timing.ts)
- 调整箭头引导：
  [src/components/GuideLayer.tsx](/Users/shanbaotao/math_video/src/components/GuideLayer.tsx)

## Git 提交

提交当前改动：

```bash
git add .
git commit -m "your message"
```

如果远程仓库已配置，可继续推送：

```bash
git push -u origin main
```

## 后续建议

- 把每页最大显示步骤数做成数据配置
- 把箭头坐标也做成数据配置
- 支持多题批量渲染
- 支持更多题型，例如分数方程、含小数方程、二元一次方程

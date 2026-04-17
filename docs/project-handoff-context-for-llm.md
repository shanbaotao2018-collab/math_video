# Math Video 项目完整交接说明

本文档用于把当前 `math_video` 项目的完整上下文交给其他大模型或接手开发者。当前状态基于本地仓库：

```text
/Users/shanbaotao/math_video
```

当前最新提交：

```text
fbd1bf0 Add creative variant AB pack v1
```

## 1. 项目定位

这是一个 **初中代数短视频自动生成系统**。

它不是通用 CAS，也不是只做数学求解的引擎。它的目标是：

> 对支持范围内的初中代数题，自动生成可用于短视频生产的完整产品数据，包括数学步骤、教学脚本、字幕、强调点、节奏点、封面策略、发布文案、A/B 创意变体、HTML 预览、封面图和可选视频资产。

当前项目已经从最早的“能展示一道题”升级到了比较完整的短视频生产链路。

核心能力包括：

- 识别代数题型 family
- 生成结构化数学步骤
- 生成 lesson / teachingScript / shotPlan
- 生成字幕 cue、重点 cue、节奏 cue、口播 cue
- 生成 publishing pack：标题、封面文案、简介、标签、封面帧
- 生成封面策略：`hook_cover` / `mistake_cover` / `result_cover`
- 生成 A/B 创意变体：`error_variant` / `hook_variant` / `result_variant`
- 单题导出 HTML、cover HTML、cover PNG、publishing JSON、variant 包
- batch 批量导出 starter-five 等系列内容
- mock/real TTS 抽象
- evaluation / regression / QA 脚本

技术栈：

```text
TypeScript
React
Remotion
KaTeX
Node.js scripts
```

依赖很少，没有引入复杂外部服务：

```text
react
react-dom
remotion
katex
typescript
```

## 2. 当前 Git 状态

最近提交：

```text
fbd1bf0 Add creative variant AB pack v1
8dbc343 Add cover thumbnail optimization pass v1
745cf1b Add algebra video generation v1 system
dde0b8d Add algebra lesson generation pipeline
c530070 Implement algebra video MVP with timeline and guide arrows
```

当前重要规则：

> 每次完成代码修改后，要自动提交 GitHub。commit message 要包含本次修改内容。只提交当前任务相关文件，不混入无关脏改动。

当前主分支：

```text
main
```

远程仓库：

```text
https://github.com/shanbaotao2018-collab/math_video.git
```

## 3. 常用命令

安装依赖：

```bash
npm install
```

类型检查：

```bash
npm run typecheck
```

完整 evaluation：

```bash
npm run evaluate
```

数学操作覆盖 regression：

```bash
npm run regression:operations
```

生成产品 JSON：

```bash
npm run product -- "2x+3=7"
```

生成单题视频相关资产：

```bash
npm run video -- "2x+3=7"
```

只生成 HTML / cover / publishing 等资产，不导出 MP4：

```bash
npm run video -- "2x+3=7" --html-only
```

批量生成 starter-five：

```bash
npm run batch -- --dataset starter-five
```

启动交付层 Web Demo + API：

```bash
npm run delivery
```

启动 Remotion Studio：

```bash
npm run dev
```

Remotion 直接渲染：

```bash
npm run render
```

## 4. 入口结构

### 4.1 产品主入口

核心入口是：

```text
src/engine/integration/buildAlgebraProductEntry.ts
```

外部 CLI：

```text
src/cli/algebraProductCli.ts
```

命令：

```bash
npm run product -- "x+y=5, x-y=1"
```

它返回统一的 `AlgebraProductEntry`，这是整个系统最重要的产品级 JSON。

### 4.2 单题导出入口

脚本：

```text
scripts/render-algebra-video.cjs
```

命令：

```bash
npm run video -- "2x+3=7" --html-only
```

会输出到 `out/`：

```text
preview html
cover html
cover png
timeline html
timeline screenshot
render plan json
publishing json
product-entry json
subtitle cues json
srt
voice cues json
voice cue srt
voice cue txt
voice cue pause-debug json
voice cue speakable txt
creative variant publishing json
creative variant cover html
creative variant cover png
```

### 4.3 批量导出入口

脚本：

```text
scripts/render-algebra-batch.cjs
```

命令：

```bash
npm run batch -- --dataset starter-five
```

starter-five 当前会生成 5 条内容，每条都有 3 个 creative variants。

### 4.4 Delivery API

脚本：

```text
scripts/algebra-delivery-server.cjs
```

命令：

```bash
npm run delivery
```

主要接口：

```text
GET  /
GET  /health
GET  /capabilities
GET  /examples
POST /solve
```

`POST /solve` 返回的就是 `buildAlgebraProductEntry(...)` 的完整结构。

## 5. 总体数据流

当前核心链路大致如下：

```text
输入 equation
  ↓
normalizeAlgebraInput
  ↓
parseEquation / recognizeAlgebraFamily
  ↓
generateAlgebraStepsV2Draft
  ↓
buildEnhancedLessonProblem
  ↓
inferAlgebraQualityTier
  ↓
applyAlgebraPresentationStrategy
  ↓
buildTeachingScriptWithContext
  ↓
buildShotPlan
  ↓
buildVideoRenderPlan
  ↓
buildSubtitleCuePlan
  ↓
buildEmphasisPlan
  ↓
buildRhythmPlan
  ↓
buildVoiceCuePlan
  ↓
buildPublishingPack
  ↓
coverStrategy + creativeVariants
  ↓
buildVideoHtml / buildCoverHtml
  ↓
video / batch / delivery export
```

当前明确的工程边界：

- Generator / parser / transforms / DSL operation 是数学主链路。
- teachingScript / shotPlan / subtitle / emphasis / rhythm / voice / publishing / cover / variants 是表达层、渲染层、发布层。
- 最近几轮新增功能都刻意没有改 Generator / parser / transforms / DSL operation。

## 6. Product Entry 结构

`buildAlgebraProductEntry` 返回的主要字段：

```ts
type AlgebraProductEntry = {
  schemaVersion: string;
  versions: AlgebraContractVersions;
  changeSummary: AlgebraChangeSnapshot;

  input: string;
  normalizedEquation: string;
  normalization: AlgebraNormalizationResult;

  family: AlgebraFamilyRecognition;
  supported: boolean;
  native: boolean;

  quality: "full" | "partial" | "fallback" | "unsupported";
  qualityTier: "instant" | "basic" | "standard" | "detailed";
  qualityLabel: string;
  buildQualityLabel: string;

  presentationStrategy: AlgebraPresentationStrategy;
  presentationSource: "auto" | "override";

  problem?: AlgebraProblem;
  lesson?: AlgebraLesson;

  teachingScript?: TeachingScript;
  shotPlan?: ShotPlan;
  subtitleCuePlan?: SubtitleCuePlan;
  emphasisPlan?: EmphasisPlan;
  rhythmPlan?: RhythmPlan;
  voiceCuePlan?: VoiceCuePlan;

  publishingPack?: PublishingPack;
  videoHook?: VideoHook;

  videoRender?: {
    recommendedViewport: {
      fps: number;
      width: number;
      height: number;
    };
    renderable: boolean;
  };

  render: {
    compositionId: "AlgebraLinearEquationMvp";
    scene: "LinearEquationLessonScene";
    renderable: boolean;
    lessonIncluded: boolean;
  };

  report?: EnhancementRunReport;
};
```

重要说明：

- `problem` 是数学步骤结果。
- `lesson` 是 Remotion scene 可用的传统渲染数据。
- `teachingScript` 是短视频讲解脚本。
- `shotPlan` 是镜头计划。
- `subtitleCuePlan` 是字幕时间轴。
- `emphasisPlan` 是 hook / rule / mistake / result 强调 cue。
- `rhythmPlan` 是节奏 cue，如 beat / pause / repeat / slow / speed_up。
- `voiceCuePlan` 是口播 cue。
- `publishingPack` 是发布资产，包括标题、封面、文案、标签、变体。
- `videoHook` 是 teachingScript hook 的产品级透出。

## 7. 当前支持题型

详细文档见：

```text
docs/supported-problem-types-manual.md
```

当前支持 family：

```text
linear_equation
linear_inequality
fraction_equation
fraction_inequality
linear_system
quadratic_equation
unknown
```

### 7.1 一元一次方程 linear_equation

示例：

```text
2x=8
2x+3=7
2x+3=x+7
2(x+3)=14
2(x+1)+3(x+2)=13
```

结果：

```text
x=4
x=2
x=-2
```

推荐展示：

```text
compact_steps
```

简单一步题可能是：

```text
qualityTier: instant
presentationStrategy: answer_only
```

### 7.2 一元一次不等式 linear_inequality

示例：

```text
2x+3>7
-2x+3>7
2(x+3)<=14
```

支持负系数除法变号。

结果：

```text
x>2
x<-2
x<=4
```

推荐展示：

```text
compact_steps
```

### 7.3 分式方程 fraction_equation

示例：

```text
x/2+3=7
(x+1)/2=4
x/2+x/3=5
```

结果：

```text
x=8
x=7
x=6
```

推荐展示：

```text
full_steps
```

边界：

```text
x/(-2)+3=7
```

这类负分母分式方程当前不稳定，可能 fallback。

### 7.4 分式不等式 fraction_inequality

示例：

```text
(x+1)/2<=4
x/2+3>=7
1/(x+2)>0
(x-1)/(x+2)>0
x/(x+2)<=1
```

结果可能是区间 / 并集：

```text
x<=7
x>2
(-\infty,-2)\cup(1,+\infty)
```

推荐展示：

```text
semantic_full_steps
```

### 7.5 二元一次方程组 linear_system

示例：

```text
x+y=5, x-y=1
y=2x+1, x+y=7
2x+y=7, 2x-y=1
x+y=2, x+y=5
x+y=2, 2x+2y=4
```

结果：

```text
(x,y)=(3,2)
(x,y)=(2,3)
无解
无穷多解
```

推荐展示：

```text
semantic_full_steps
```

输入建议：

```text
x+y=5, x-y=1
```

中文逗号和分号有归一化，但生产环境建议统一英文逗号。

### 7.6 一元二次方程 quadratic_equation

示例：

```text
x^2=16
(x+1)^2=9
x^2-5x+6=0
(x-2)(x-3)=0
x^2-2x-1=0
x^2+2x+5=0
```

支持：

```text
开平方
平方式
因式分解
零乘积法
判别式
求根公式
无实数解
重根
两个实根
```

推荐展示：

```text
full_steps
```

## 8. 展示策略 presentationMode

输入可以指定：

```bash
npm run product -- --presentation-mode full_steps "2x+3=7"
npm run product -- --presentation-mode answer_only "x+y=5, x-y=1"
```

可选值：

```text
auto
answer_only
compact_steps
full_steps
semantic_full_steps
```

含义：

```text
auto                 根据 qualityTier 自动选择
answer_only          只看最终答案或极简步骤
compact_steps        精简关键步骤
full_steps           完整标准流程
semantic_full_steps  完整流程并强化区间、分支、方程组等语义
```

qualityTier：

```text
instant   一步题或极简单题
basic     简单线性题
standard  标准教学流程，如分式方程、二次方程
detailed  复杂链路，如分式不等式、方程组
```

## 9. Teaching Script 层

核心文件：

```text
src/engine/teaching/buildTeachingScript.ts
src/engine/teaching/teachingScriptTypes.ts
```

当前 `TeachingScriptStep` 结构是：

```ts
type TeachingScriptStep = {
  emphasis?: string;
  memoryTip?: string;
  mistakeWarning?: string;
  narration: string;
  pacingHint?: "fast" | "normal" | "pause" | "slow";
  stepId: string;
};
```

重要提醒：

> 当前没有 `riskLevel` / `riskType` / `memoryWorthy`。
> 之前曾经做过 Step-Risk 数据层尝试，但已经按用户要求回滚到 Hook Aggression & Retention Pass v1。后续大模型不要误以为 risk metadata 还存在。

TeachingScript 里有：

```ts
type TeachingScript = {
  hook?: VideoHook;
  introHook?: string;
  outroSummary?: string;
  persona?: TeachingPersonaId;
  steps: TeachingScriptStep[];
};
```

persona：

```text
calm_teacher
exam_coach
strict_teacher
```

hook style：

```text
mistake_first
question_first
shortcut_first
```

## 10. Hook Aggression & Retention Pass v1 当前效果

这个 pass 的目标是把“讲解型内容”升级为“停留型 + 完播型内容”。

核心规则：

### 10.1 Hook 三类化

hook 被强化为三类：

```text
错误型：90%的人都会错 / 你一定会在这一步翻车
阻断型：先别急着算 / 别急着移项
利益型：这题3秒就能做完 / 这一步能省一半时间
```

### 10.2 信息去重

系统尽量避免同一句文案在 hook / emphasis / subtitle 中重复出现。

优先级：

```text
hook > emphasis > subtitle
```

### 10.3 单屏一个主信息

渲染层强调：

```text
一帧只保留一个主表达
```

例如：

```text
公式为主
或 易错点为主
或 结论为主
```

其他信息弱化为小字、半透明或延迟出现。

### 10.4 结果页锤子化

结果页不只是普通 `x=2`，而是三段式：

```text
最终答案
x = 2
这一步就定死了 / 别再写成别的了
```

### 10.5 节奏收紧

目标：

```text
1.5 秒内出现第一信息点
0.0 - 0.6s hook
0.6 - 1.2s 公式
1.2 - 2.0s 关键提示
```

### 10.6 打断点

每 3-5 秒出现：

```text
注意
很多人这里会错
停一下
```

这些主要来自 emphasisPlan / rhythmPlan 的增强。

## 11. Emphasis / Rhythm / Subtitle / Voice 层

核心文件：

```text
src/engine/render/buildSubtitleCuePlan.ts
src/engine/render/buildEmphasisPlan.ts
src/engine/render/buildRhythmPlan.ts
src/engine/render/buildVoiceCuePlan.ts
```

### 11.1 EmphasisPlan

类型：

```ts
type EmphasisKind = "hook" | "mistake" | "result" | "rule";
```

用途：

```text
把 hook、规则、易错点、最终结论变成可对齐字幕时间轴的重点 cue。
```

### 11.2 RhythmPlan

用于短视频节奏：

```text
beat
pause
repeat
slow
speed_up
```

用途：

```text
控制开头 beat、易错停顿、结果慢放、重复强化等。
```

### 11.3 SubtitleCuePlan

把 teachingScript steps 对齐到 video render timeline。

### 11.4 VoiceCuePlan

生成口播片段、停顿、语气、srt、speakable text。

## 12. Cover Thumbnail Optimization Pass v1

最新封面层位于：

```text
src/engine/render/buildPublishingPack.ts
src/engine/render/buildCoverHtml.ts
src/engine/render/publishingPackTypes.ts
```

### 12.1 Cover Mode

当前最小 cover mode：

```ts
type PublishingCoverMode =
  | "hook_cover"
  | "mistake_cover"
  | "result_cover";
```

含义：

```text
hook_cover     适合冷启动、问题钩子、系列入口
mistake_cover  适合易错拦截、错误预防
result_cover   适合考前复习、结果导向、捷径导向
```

### 12.2 CoverStrategy

当前结构：

```ts
type PublishingCoverStrategy = {
  badge: string;
  formulaText?: string;
  mainTitle: string;
  mode: PublishingCoverMode;
  reason: string;
  source: "answer" | "cover_text" | "emphasis" | "title" | "video_hook";
  subtitle?: string;
};
```

### 12.3 选择逻辑

优先级大致是：

```text
recommendedUseCase / contentGoal
  ↓
videoHook.style
  ↓
emphasisPlan
  ↓
answer/result
```

映射：

```text
cold_start_reach    -> hook_cover
mistake_prevention  -> mistake_cover
exam_revision       -> result_cover
series_playlist     -> hook_cover
concept_building    -> 根据 hook / emphasis fallback
```

### 12.4 封面展示规则

封面 HTML 遵循：

```text
一个 badge
一个 mainTitle
一个 formulaText 或 result
可选一行 subtitle
```

避免把标题、公式、易错点、讲解句堆在同一屏。

## 13. Creative Variant & A/B Pack Pass v1

这是当前最新完成的 pass。

目标：

> 同一道题自动生成多套标题 / 封面 / 首屏 hook 版本，用于点击率和停留率测试。

类型定义在：

```text
src/engine/render/publishingPackTypes.ts
```

### 13.1 Variant 类型

```ts
type PublishingCreativeVariantType =
  | "error_variant"
  | "hook_variant"
  | "result_variant";
```

### 13.2 Variant 结构

```ts
type PublishingCreativeVariant = {
  badge: string;
  coverStrategy: PublishingCoverStrategy;
  coverText: string;
  heroHookText: string;
  title: string;
  type: PublishingCreativeVariantType;
  variantId: string;
};
```

### 13.3 PublishingPack 当前结构

```ts
type PublishingPack = {
  caption: string;
  coverFrame: PublishingCoverFrame;
  coverStrategy: PublishingCoverStrategy;
  coverText: string;
  creativeVariants: PublishingCreativeVariant[];
  hashtags: string[];
  series?: PublishingSeriesInfo;
  title: string;
};
```

### 13.4 三种 variant 的方向

```text
error_variant
  coverMode: mistake_cover
  badge: 易错点
  主打：90%会错 / 很多人会错 / 易错提醒

hook_variant
  coverMode: hook_cover
  badge: 先看这里
  主打：停一下 / 先别急 / 入口钩子

result_variant
  coverMode: result_cover
  badge: 最终答案
  主打：答案 / 结果 / 省时间
```

每个 variant 至少影响：

```text
publishingPack.title
publishingPack.coverText
coverStrategy.mode
coverStrategy
heroHookText
badge
```

### 13.5 单题导出 variant 包

命令：

```bash
npm run video -- "2x+3=7" --html-only
```

会生成：

```text
out/algebra-video-2x-3-7-variants/
  algebra-video-2x-3-7.variant-error.publishing.json
  algebra-video-2x-3-7.variant-error.cover.html
  algebra-video-2x-3-7.variant-error.cover.png

  algebra-video-2x-3-7.variant-hook.publishing.json
  algebra-video-2x-3-7.variant-hook.cover.html
  algebra-video-2x-3-7.variant-hook.cover.png

  algebra-video-2x-3-7.variant-result.publishing.json
  algebra-video-2x-3-7.variant-result.cover.html
  algebra-video-2x-3-7.variant-result.cover.png
```

### 13.6 Batch variant 包

命令：

```bash
npm run batch -- --dataset starter-five
```

当前 starter-five：

```text
5 条题
每条 3 个 variants
合计 15 个 variant publishing JSON
合计 15 个 variant cover HTML
```

如果加 `--video` 且本机有 Chrome，则可以输出 cover PNG。

## 14. PublishingPack 设计

核心文件：

```text
src/engine/render/buildPublishingPack.ts
```

当前 `PublishingPack` 输出：

```text
title
coverText
coverFrame
coverStrategy
creativeVariants
caption
hashtags
series
```

### 14.1 title

根据 family / hookStyle / series episode 自动生成。

例如：

```text
一元一次方程怎么下手？别急着移项，先看哪一步最省。
分式方程捷径：这一步能省一半时间：先去分母。
一元一次不等式易错点：90%的人都会错在变号。
```

### 14.2 coverText

通常两行：

```text
主封面句
答案 x=2
```

但 coverStrategy 会进一步去重，避免副句和公式/结果重复。

### 14.3 caption

用于平台简介，包含：

```text
hook
题目
答案
重点
persona 风格
```

### 14.4 hashtags

自动组合：

```text
#初中数学
#数学解题
#一元一次方程
#分式方程
#易错题
#解题技巧
#考试技巧
...
```

### 14.5 coverFrame

仍保留旧逻辑，选择代表封面的时间点 / shot：

```text
hook_emphasis
mistake_emphasis
result_emphasis
rule_emphasis
answer_shot
first_shot
```

Cover pass 是在旧 `coverFrame / coverText` 上增强，没有删除旧结构。

## 15. HTML / 渲染层

主要文件：

```text
src/engine/render/buildVideoHtml.ts
src/engine/render/buildCoverHtml.ts
src/scenes/LinearEquationLessonScene.tsx
src/styles/global.css
```

### 15.1 buildVideoHtml

用于生成短视频预览 HTML，支持：

```text
hero
timeline view
subtitle
emphasis panel
rhythm effects
answer card
publishingPack copy
videoHook
```

### 15.2 buildCoverHtml

用于生成单独封面 HTML。

输入：

```ts
{
  equation?: string;
  familyLabel?: string;
  publishingPack: PublishingPack;
}
```

会读取：

```text
publishingPack.coverStrategy.badge
publishingPack.coverStrategy.mainTitle
publishingPack.coverStrategy.formulaText
publishingPack.coverStrategy.subtitle
publishingPack.coverStrategy.mode
```

输出一个 1080x1920 适配的 HTML 封面。单题导出时会用 Chrome headless 截成 PNG。

## 16. Batch 层

核心文件：

```text
src/engine/batch/algebraBatchDatasets.ts
src/engine/batch/buildBatchProductionPlan.ts
src/engine/batch/buildBatchContentProgrammingPlan.ts
src/engine/batch/seriesRhythmTemplates.ts
src/engine/batch/applyBatchTemplateDeepExecution.ts
```

### 16.1 Dataset

当前有 starter-five 数据集。

batch 会为每个 episode 生成：

```text
preview.html
cover.html
variants/
product-entry.json
publishing.json
render-plan.json
subtitle-cues.json
subtitle.srt
voice-cues.json
voice-cues.srt
voice-cues.txt
voice-cues.speakable.txt
audio-track.json 可选
video.mp4 可选
video.voiced.mp4 可选
cover.png 可选
```

### 16.2 Content Programming

用于批量内容编排：

```text
contentGoal
copyIntensity
recommendedUseCase
recommendedTemplateId
publishPriorityScore
recommendedPublishingOrder
templateSnapshot
```

contentGoal：

```text
collection
exam_skill
hook
mistake
teaching
```

recommendedUseCase：

```text
cold_start_reach
concept_building
exam_revision
mistake_prevention
series_playlist
```

### 16.3 Series Rhythm Templates

模板：

```text
cold-start-hook
concept-teaching
exam-sprint
mistake-guardrail
playlist-bridge
```

每个模板会给出：

```text
preferredHookStyle
preferredPersona
preferredPresentationMode
preferredDurationBandSec
emphasisBias
outroStyle
useCase
```

Deep execution 会把模板影响应用到：

```text
teachingScript.outroSummary
shotPlan duration
emphasisPlan priority
rhythmPlan
voiceCuePlan
publishingPack.caption
publishingPack.coverStrategy
```

## 17. TTS 层

核心文件：

```text
src/engine/tts/synthesizeVoiceCuePlan.ts
src/engine/tts/providerCapabilities.ts
src/engine/tts/ttsTypes.ts
src/engine/tts/voiceProviderMappings.ts
src/engine/tts/voiceStrategyProfiles.ts
scripts/audio-finalization.cjs
```

支持：

```text
mock provider
real provider
voice cue speakable text
voice cue srt
pause debug
mixed wav
voiced mp4
```

`npm run video -- "2x+3=7" --tts mock` 可走 mock TTS。

## 18. AI 增强层

目录：

```text
src/engine/ai/
```

包含：

```text
aiClient.ts
aiEnhancementTypes.ts
buildEnhancementPrompt.ts
buildTokenMapEnhancementPrompt.ts
buildVisualActionsEnhancementPrompt.ts
enhanceProblemWithAI.ts
mergeEnhancementResult.ts
```

当前主链路默认通常使用：

```text
ai: false
```

可以通过：

```bash
npm run product -- --equation "x^2-2x-1=0" --ai
```

启用 AI 编排和完整 report。

这层不是最近几个 pass 的重点，后续修改时要避免把 AI 增强和数学求解主链路混在一起。

## 19. Evaluation / Regression

核心文件：

```text
src/engine/evaluation/runAlgebraEvaluation.ts
src/engine/evaluation/algebraEvaluationCases.ts
src/engine/regression/runOperationCoverageRegression.ts
src/engine/regression/operationCoverage.ts
```

### 19.1 当前 evaluation 结果

最近验证：

```text
npm run typecheck
通过

npm run evaluate
32/32 passed (100.0%)

npm run regression:operations
passed 29 generator cases, 33 operation entries, and unsupported fallback checks
```

evaluation 覆盖：

```text
family 识别
支持/不支持
answer
step count
operation subset
presentation strategy
teachingScript
shotPlan
subtitleCuePlan
emphasisPlan
rhythmPlan
voiceCuePlan
publishingPack
coverStrategy
creativeVariants
batch production
series rhythm templates
TTS provider capability
robustness normalization
fallback / unsupported
```

### 19.2 Creative Variant evaluation

当前新增断言包括：

```text
variant 数量必须是 3
必须包含 error_variant / hook_variant / result_variant
variant title 必须不同
variant coverStrategy.mainTitle 必须不同
variant cover mode 必须和类型一致
variant publishing json / cover html 文件必须可生成
```

### 19.3 Cover evaluation

当前新增断言包括：

```text
renderable 视频必须能生成 cover asset
cover mode 必须合法
cover mainTitle 非空
cover visible copy 不重复
cover mainTitle 必须和 publishingPack / videoHook / result 来源对齐
cover html 必须包含封面标记
```

## 20. 重要工程边界

后续大模型必须特别注意这些边界。

### 20.1 不要随便改数学主链路

除非用户明确要求，否则不要改：

```text
src/engine/generator/index.ts
src/engine/generator/parser.ts
src/engine/generator/transforms.ts
src/types/algebraDslV2.ts
```

这些是数学解析、DSL operation、步骤生成的核心。

最近几个 pass 的要求都是：

```text
不改 Generator
不改 parser
不改 transforms
不改 DSL operation
不改数学语义主链路
```

### 20.2 表达层可以改，但要保持兼容

可以改的常见层：

```text
src/engine/teaching/
src/engine/render/
src/engine/batch/
scripts/render-algebra-video.cjs
scripts/render-algebra-batch.cjs
src/engine/evaluation/
```

但要注意：

```text
buildAlgebraProductEntry 不要轻易破坏返回结构
delivery / evaluate / regression / video / batch / TTS 主链路不能断
PublishingPack 旧字段 coverText / coverFrame / title / caption / hashtags 要保留
```

### 20.3 不要引入新库

最近 pass 明确要求：

```text
不引入新库
```

现有能力足够完成大部分表达层 / 发布层增强。

### 20.4 风险标签当前不存在

再次强调：

```text
TeachingScriptStep 当前没有 riskLevel / riskType / memoryWorthy。
```

不要基于不存在字段写代码。

### 20.5 输出资产不是源码

`out/` 是生成产物，不应提交。当前提交只提交源码、脚本、文档。

## 21. 目录结构说明

重要目录：

```text
src/engine/generator/
  数学解析、DSL、步骤生成

src/engine/integration/
  产品主入口、能力目录、质量分级、展示策略、输入归一化

src/engine/teaching/
  teachingScript、shotPlan、短视频讲解脚本

src/engine/render/
  subtitle/emphasis/rhythm/voice/video html/publishing/cover

src/engine/batch/
  批量数据集、批量计划、系列节奏模板、批量深度执行

src/engine/tts/
  TTS provider、voice profile、音频合成计划

src/engine/evaluation/
  产品级 evaluation

src/engine/regression/
  操作覆盖 regression

src/components/
  Remotion/React 可视组件

src/scenes/
  Remotion scene

scripts/
  video/batch/delivery/audio finalization 脚本

docs/
  使用手册和扩展计划
```

## 22. 关键文件速查

主产品入口：

```text
src/engine/integration/buildAlgebraProductEntry.ts
```

题型能力目录：

```text
src/engine/integration/algebraCapabilityCatalog.ts
```

变更管理：

```text
src/engine/integration/algebraChangeManagement.ts
```

数学生成：

```text
src/engine/generator/index.ts
```

解析器：

```text
src/engine/generator/parser.ts
```

数学 transforms：

```text
src/engine/generator/transforms.ts
```

Teaching script：

```text
src/engine/teaching/buildTeachingScript.ts
```

Shot plan：

```text
src/engine/teaching/buildShotPlan.ts
```

Publishing pack：

```text
src/engine/render/buildPublishingPack.ts
```

Cover HTML：

```text
src/engine/render/buildCoverHtml.ts
```

Video HTML：

```text
src/engine/render/buildVideoHtml.ts
```

Emphasis：

```text
src/engine/render/buildEmphasisPlan.ts
```

Rhythm：

```text
src/engine/render/buildRhythmPlan.ts
```

Subtitle：

```text
src/engine/render/buildSubtitleCuePlan.ts
```

Voice cue：

```text
src/engine/render/buildVoiceCuePlan.ts
```

Batch：

```text
src/engine/batch/buildBatchProductionPlan.ts
```

Batch content programming：

```text
src/engine/batch/buildBatchContentProgrammingPlan.ts
```

Evaluation：

```text
src/engine/evaluation/runAlgebraEvaluation.ts
```

Supported type manual：

```text
docs/supported-problem-types-manual.md
```

## 23. 当前发布资产示例

输入：

```bash
npm run video -- "2x+3=7" --html-only
```

基础资产：

```text
out/algebra-video-2x-3-7.html
out/algebra-video-2x-3-7.cover.html
out/algebra-video-2x-3-7.cover.png
out/algebra-video-2x-3-7-timeline.html
out/algebra-video-2x-3-7-timeline.png
out/algebra-video-2x-3-7.render-plan.json
out/algebra-video-2x-3-7.publishing.json
out/algebra-video-2x-3-7.product-entry.json
out/algebra-video-2x-3-7.subtitle-cues.json
out/algebra-video-2x-3-7.srt
out/algebra-video-2x-3-7.voice-cues.json
out/algebra-video-2x-3-7.voice-cues.srt
out/algebra-video-2x-3-7.voice-cues.txt
out/algebra-video-2x-3-7.voice-cues.pause-debug.json
out/algebra-video-2x-3-7.voice-cues.speakable.txt
```

Variant 资产：

```text
out/algebra-video-2x-3-7-variants/
  algebra-video-2x-3-7.variant-error.publishing.json
  algebra-video-2x-3-7.variant-error.cover.html
  algebra-video-2x-3-7.variant-error.cover.png

  algebra-video-2x-3-7.variant-hook.publishing.json
  algebra-video-2x-3-7.variant-hook.cover.html
  algebra-video-2x-3-7.variant-hook.cover.png

  algebra-video-2x-3-7.variant-result.publishing.json
  algebra-video-2x-3-7.variant-result.cover.html
  algebra-video-2x-3-7.variant-result.cover.png
```

## 24. 样例 Variant 输出

### 24.1 `2x+3=7`

```json
[
  {
    "type": "error_variant",
    "title": "一元一次方程易错版：90%会错：很多人会忘记变号",
    "coverMode": "mistake_cover",
    "badge": "易错点",
    "heroHookText": "90%会错：很多人会忘记变号"
  },
  {
    "type": "hook_variant",
    "title": "一元一次方程钩子版：停一下：别急着移项，先看哪一步最省。",
    "coverMode": "hook_cover",
    "badge": "先看这里",
    "heroHookText": "停一下：别急着移项，先看哪一步最省。"
  },
  {
    "type": "result_variant",
    "title": "一元一次方程答案版：x=2",
    "coverMode": "result_cover",
    "badge": "最终答案",
    "heroHookText": "答案落定"
  }
]
```

### 24.2 `2x+3>7`

```json
[
  {
    "type": "error_variant",
    "title": "一元一次不等式易错版：90%会错：很多人会忘记变号",
    "coverMode": "mistake_cover"
  },
  {
    "type": "hook_variant",
    "title": "一元一次不等式钩子版：停一下：90%的人都会错在变号。",
    "coverMode": "hook_cover"
  },
  {
    "type": "result_variant",
    "title": "一元一次不等式答案版：x>2",
    "coverMode": "result_cover"
  }
]
```

### 24.3 `x/2+x/3=5`

```json
[
  {
    "type": "error_variant",
    "title": "分式方程易错版：90%会错：去分母时不要漏掉任何一项。",
    "coverMode": "mistake_cover"
  },
  {
    "type": "hook_variant",
    "title": "分式方程钩子版：停一下：这一步能省一半时间：先去分母。",
    "coverMode": "hook_cover"
  },
  {
    "type": "result_variant",
    "title": "分式方程答案版：x=6",
    "coverMode": "result_cover"
  }
]
```

## 25. 当前项目已完成的关键 pass

### 25.1 Algebra Video Generation v1 System

提交：

```text
745cf1b Add algebra video generation v1 system
```

主要完成：

```text
支持多题型代数生成
产品入口 buildAlgebraProductEntry
teachingScript
shotPlan
subtitleCuePlan
emphasisPlan
rhythmPlan
voiceCuePlan
publishingPack
batch
evaluation
tts
docs
```

### 25.2 Hook Aggression & Retention Pass v1

目标：

```text
让内容从讲解型升级为停留型 + 完播型
```

效果：

```text
hook 更短视频化
开头 1.5 秒内出现信息点
每帧一个主信息
结果页锤子化
打断点增强
去重 hook / emphasis / subtitle
```

### 25.3 Cover Thumbnail Optimization Pass v1

提交：

```text
8dbc343 Add cover thumbnail optimization pass v1
```

效果：

```text
新增 coverStrategy
新增 hook_cover / mistake_cover / result_cover
新增 buildCoverHtml
单题导出 cover.html / cover.png
batch 导出 cover.html / cover.png
evaluation 增强封面断言
```

### 25.4 Creative Variant & A/B Pack Pass v1

提交：

```text
fbd1bf0 Add creative variant AB pack v1
```

效果：

```text
新增 error_variant / hook_variant / result_variant
每个 variant 独立 title / coverText / coverStrategy / heroHookText / badge
单题导出 variant publishing json / cover html / cover png
batch starter-five 每条导出 3 个 variant
evaluation 增强 A/B 断言
```

## 26. 后续开发建议

如果其他大模型接手，建议优先做这些方向。

### 26.1 不建议立刻做

不建议在没有明确需求时改：

```text
parser
generator
transforms
DSL operation
数学求解主链路
```

因为当前表达层、发布层还有很多高 ROI 空间。

### 26.2 推荐下一步方向

可考虑：

```text
1. Variant analytics schema
   给每个 creative variant 增加实验 ID、平台、投放批次、指标占位字段。

2. Hero preview variant
   当前 variant 已影响 heroHookText，但 video HTML 主画面还没有按 variant 独立导出 hero preview。
   可以新增 variant hero preview HTML。

3. Publishing pack selected variant override
   允许 CLI 参数选择 --variant error|hook|result，然后导出对应版本作为主 publishingPack。

4. Cover visual style variant
   当前 variant 主要是文案和 mode。
   后续可以让 error/hook/result 有不同但稳定的视觉版式。

5. Batch variant manifest
   当前 batch manifest 记录 assetPaths.creativeVariants。
   可以进一步做 A/B 测试 manifest，包含 variantId、title、coverPath、recommendedUseCase、publishPriority。

6. Platform-specific package
   为抖音 / 视频号 / 小红书分别生成标题长度、标签、封面比例、简介版本。

7. 自动内容排期
   基于 batch contentProgramming 的 publishPriorityScore 输出发布顺序和发布时间建议。
```

### 26.3 如果要重新做 Step-Risk

之前 Step-Risk 已回滚。若未来重新做，建议：

```text
先只在 TeachingScriptStep 增加 risk metadata
不要立刻改 emphasis/render
先保证 typecheck/evaluate
再单独做 EmphasisPlan 风险驱动
```

但当前用户最近明确回滚到 Hook Aggression & Retention Pass v1 后，后续工作都没有 risk metadata。

## 27. 给其他大模型的工作原则

如果另一个模型继续开发，请遵守：

```text
1. 先读代码，不要凭空假设字段存在。
2. 改动前先 rg 相关字段和入口。
3. 不要改数学主链路，除非用户明确要求。
4. 表达层改动优先放在 render / publishing / batch / scripts。
5. 新增字段尽量 additive，不破坏旧字段。
6. 每次改完必须跑 npm run typecheck。
7. 涉及产品链路必须跑 npm run evaluate。
8. 涉及 generator/parser/transforms 必须跑 npm run regression:operations。
9. 涉及 video/batch 导出，要实际跑 npm run video 或 npm run batch。
10. 每次完成后提交 GitHub，commit message 写清楚改了什么。
```

当前最低验证组合：

```bash
npm run typecheck
npm run evaluate
npm run regression:operations
```

涉及导出时：

```bash
npm run video -- "2x+3=7" --html-only
npm run batch -- --dataset starter-five
```

## 28. 当前系统一句话总结

这个项目当前已经不是单纯“数学题渲染 demo”，而是一个初中代数短视频生成产品链路：

> 输入一道题，系统能识别题型、生成步骤、生成讲解脚本、生成字幕和口播时间轴、生成短视频节奏和强调点、生成发布文案、生成封面策略、生成 A/B 创意变体，并导出单题或批量生产资产。

它当前最强的部分是：

```text
产品化入口清晰
支持题型明确
表达层和发布层已经比较完整
evaluation 覆盖广
新增功能保持 additive
数学主链路相对稳定
```

它当前最需要谨慎的地方是：

```text
不要把表达层需求误改成 parser/generator 需求
不要假设是通用 CAS
不要破坏 buildAlgebraProductEntry 的统一输出结构
不要删除旧 publishingPack 字段
不要把 out/ 产物提交进 Git
```

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

默认输出文件：

```text
out/algebra-linear-equation-mvp.mp4
```

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

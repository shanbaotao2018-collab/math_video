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
      guide: 'expand',
      note: '展开括号',
      kind: 'expand'
    },
    {
      id: 's3',
      expression: '2x=8',
      guide: 'move',
      note: '两边同时减去 6',
      kind: 'move'
    },
    {
      id: 's4',
      expression: 'x=4',
      note: '两边同时除以 2',
      kind: 'answer'
    }
  ]
};

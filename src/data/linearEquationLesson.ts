import type {AlgebraLesson} from '../types/algebra';
import {generateAlgebraSteps} from '../engine/generator';
import {normalizeLessonWithTemplate} from '../utils/templates';

const generatedProblem = generateAlgebraSteps('4(x+2)=20');

if (generatedProblem.supported === false) {
  throw new Error(generatedProblem.reason);
}

const rawLinearEquationLesson: AlgebraLesson = {
  layout: 'combined-main',
  title: '解一元一次方程',
  problemType: '一元一次方程',
  prompt: generatedProblem.problem.equation,
  strategy: '先展开括号，再移项，最后把未知数前面的系数化为 1。',
  answer: generatedProblem.problem.answer,
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
  steps: generatedProblem.problem.steps
};

export const linearEquationLesson = normalizeLessonWithTemplate(rawLinearEquationLesson);

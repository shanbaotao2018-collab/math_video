export type AlgebraStepKind = 'write' | 'transform' | 'expand' | 'move' | 'answer';
export type AlgebraStepGuide = 'expand' | 'move';

export type AlgebraStep = {
  id: string;
  kind: AlgebraStepKind;
  guide?: AlgebraStepGuide;
  note?: string;
  expression: string;
};

export type LessonStep = AlgebraStep;

export type LessonPacing = {
  introFrames: number;
  stepHoldFrames: number;
  stepGapFrames: number;
  answerHoldFrames: number;
};

export type LessonLabels = {
  kicker: string;
  subtitle: string;
  problemSection: string;
  strategySection: string;
  stepsSection: string;
  answerTag: string;
};

export type LessonLayout = 'split-panels' | 'combined-main';

export type AlgebraLesson = {
  layout: LessonLayout;
  title: string;
  problemType: string;
  prompt: string;
  strategy: string;
  answer: string;
  labels: LessonLabels;
  steps: AlgebraStep[];
  pacing: LessonPacing;
};

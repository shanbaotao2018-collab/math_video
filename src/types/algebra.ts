import type {AlgebraVisualAction, FormulaToken, PositionRef, TokenRef, VisualLine} from './visuals';

export type StepKind = 'write' | 'transform' | 'expand' | 'move' | 'cancel' | 'answer';

export type AlgebraStepKind = StepKind;

export type StepPhaseConfig = {
  introRatio: number;
  actionRatio: number;
  settleRatio: number;
};

export type PhaseFrameRange = {
  from: number;
  to: number;
};

export type StepPhaseRange = {
  intro: PhaseFrameRange;
  action: PhaseFrameRange;
  settle: PhaseFrameRange;
};

export type StepPhaseRanges = StepPhaseRange;

export type AlgebraStep = {
  id: string;
  kind: StepKind;
  latex: string;
  note?: string;
  phaseConfig?: Partial<StepPhaseConfig>;
  expression?: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};

export type LessonStep = AlgebraStep;

export type AlgebraProblem = {
  answer: string;
  equation: string;
  steps: AlgebraStep[];
};

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

export type {
  AlgebraVisualAction,
  AnchorRef,
  AnchorRole,
  FormulaToken,
  PositionRef,
  TokenRef,
  VisualActionType,
  VisualLine,
  VisualRef
} from './visuals';

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
  operation?: import('./algebraDslV2').AlgebraOperationV2;
  phaseConfig?: Partial<StepPhaseConfig>;
  expression?: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};

export type LessonStep = AlgebraStep;

export type AlgebraProblem = {
  answer: string;
  equation: string;
  note?: string;
  question?: string;
  steps: AlgebraStep[];
  title?: string;
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

export {
  toAlgebraProblemV1FromV2Draft,
  toAlgebraProblemV2Draft,
  toAlgebraStepV1FromV2Draft,
  toAlgebraStepV2Draft,
  type AlgebraOperationTypeV2,
  type AlgebraOperationV2,
  type AlgebraProblemV2,
  type AlgebraStepV2,
  type EquationSideV2,
  type LikeTermGroupV2
} from './algebraDslV2';

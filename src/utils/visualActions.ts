import type {AlgebraProblem, AlgebraStep} from '../types/algebra';

export const normalizeStepVisualActions = (step: AlgebraStep): AlgebraStep => {
  return {
    ...step,
    visualActions: step.visualActions ?? []
  };
};

export const normalizeProblemVisualActions = (problem: AlgebraProblem): AlgebraProblem => {
  return {
    ...problem,
    steps: problem.steps.map(normalizeStepVisualActions)
  };
};

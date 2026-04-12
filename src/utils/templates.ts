import type {AlgebraLesson, AlgebraProblem, AlgebraStep, AlgebraStepKind, AlgebraVisualAction, StepPhaseConfig} from '../types/algebra';
import {DEFAULT_PHASE_CONFIGS} from './phases';
import {normalizeProblemVisualActions, normalizeStepVisualActions} from './visualActions';

type StepTemplate = {
  phaseConfig: StepPhaseConfig;
  visualActions: AlgebraVisualAction[];
};

export const STEP_TEMPLATES: Partial<Record<AlgebraStepKind, StepTemplate>> = {
  write: {
    phaseConfig: DEFAULT_PHASE_CONFIGS.write,
    visualActions: []
  },
  expand: {
    phaseConfig: DEFAULT_PHASE_CONFIGS.expand,
    visualActions: [
      {
        anchor: {line: 'previous', role: 'distributor'},
        target: 'source',
        type: 'highlight'
      },
      {
        source: {line: 'previous', role: 'distributor'},
        targets: {
          left: {line: 'current', role: 'expanded_left_term'},
          right: {line: 'current', role: 'expanded_right_term'}
        },
        type: 'expand'
      }
    ]
  },
  move: {
    phaseConfig: DEFAULT_PHASE_CONFIGS.move,
    visualActions: [
      {
        anchor: {line: 'previous', role: 'moving_term'},
        target: 'moving_term',
        term: 'moving_term',
        type: 'highlight'
      },
      {
        source: {line: 'previous', role: 'moving_term'},
        targetAnchor: {line: 'current', role: 'result_term_slot'},
        targetSide: 'right',
        term: 'moving_term',
        type: 'move'
      },
      {
        anchor: {line: 'previous', role: 'moving_term'},
        target: 'moving_term',
        term: 'moving_term',
        type: 'fade_out'
      },
      {
        anchor: {line: 'current', role: 'result_term'},
        target: 'result_term',
        type: 'fade_in'
      }
    ]
  },
  answer: {
    phaseConfig: DEFAULT_PHASE_CONFIGS.answer,
    visualActions: [{target: 'answer_term', type: 'answer'}]
  }
};

const hasExplicitVisualActions = (step: AlgebraStep) => {
  return (step.visualActions?.length ?? 0) > 0;
};

export const normalizeStepWithTemplate = (step: AlgebraStep): AlgebraStep => {
  const template = STEP_TEMPLATES[step.kind];

  if (!template) {
    return normalizeStepVisualActions(step);
  }

  return normalizeStepVisualActions({
    ...step,
    phaseConfig: {
      ...template.phaseConfig,
      ...step.phaseConfig
    },
    visualActions: hasExplicitVisualActions(step) ? step.visualActions : template.visualActions
  });
};

export const normalizeProblemWithTemplate = (problem: AlgebraProblem): AlgebraProblem => {
  return normalizeProblemVisualActions({
    ...problem,
    steps: problem.steps.map(normalizeStepWithTemplate)
  });
};

export const normalizeLessonWithTemplate = (lesson: AlgebraLesson): AlgebraLesson => {
  return {
    ...lesson,
    steps: lesson.steps.map(normalizeStepWithTemplate)
  };
};

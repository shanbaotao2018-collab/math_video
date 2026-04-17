import {
  toAlgebraStepV2Draft,
  type AlgebraLesson,
  type AlgebraOperationTypeV2,
  type AlgebraOperationV2,
  type AlgebraProblem,
  type AlgebraStep,
  type AlgebraStepKind,
  type AlgebraVisualAction,
  type StepPhaseConfig
} from '../types/algebra';
import {DEFAULT_PHASE_CONFIGS} from './phases';
import {normalizeProblemVisualActions, normalizeStepVisualActions} from './visualActions';

type TemplateAwareAlgebraStep = AlgebraStep & {
  operation?: AlgebraOperationV2;
};

type StepTemplate = {
  phaseConfig: StepPhaseConfig;
  visualActions: AlgebraVisualAction[];
};

export const STEP_TEMPLATES: Partial<Record<AlgebraStepKind, StepTemplate>> = {
  write: {
    phaseConfig: DEFAULT_PHASE_CONFIGS.write,
    visualActions: []
  },
  transform: {
    phaseConfig: DEFAULT_PHASE_CONFIGS.transform,
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

export const OPERATION_TEMPLATE_KIND: Record<AlgebraOperationTypeV2, AlgebraStepKind> = {
  apply_zero_product_rule: 'transform',
  analyze_sign_interval: 'transform',
  apply_quadratic_formula: 'transform',
  back_substitute_solution: 'transform',
  classify_system_result: 'transform',
  clear_denominator: 'transform',
  classify_root_count: 'transform',
  collect_solution_branches: 'answer',
  collect_system_solution: 'answer',
  combine_like_terms: 'transform',
  compute_discriminant: 'transform',
  divide_both_sides: 'transform',
  eliminate_variable: 'transform',
  expand_brackets: 'expand',
  extract_square_root: 'transform',
  factor_quadratic: 'transform',
  final_answer: 'answer',
  find_critical_points: 'transform',
  flip_inequality_sign: 'transform',
  intersect_solution_set: 'answer',
  move_term: 'move',
  multiply_both_sides: 'transform',
  rewrite_equation_for_substitution: 'transform',
  split_into_linear_factors: 'transform',
  solve_single_variable_equation: 'transform',
  solve_inequality: 'answer',
  state_no_real_solution: 'answer',
  state_no_solution: 'answer',
  state_infinite_solutions: 'answer',
  state_domain_restriction: 'transform',
  substitute_expression: 'transform',
  simplify_expression: 'transform',
  write_equation: 'write'
};

const hasExplicitVisualActions = (step: AlgebraStep) => {
  return (step.visualActions?.length ?? 0) > 0;
};

export const resolveTemplateKindForStep = (step: AlgebraStep, previousStep?: AlgebraStep): AlgebraStepKind => {
  const templateAwareStep = step as TemplateAwareAlgebraStep;
  const operation = templateAwareStep.operation ?? toAlgebraStepV2Draft(step, previousStep).operation;

  return OPERATION_TEMPLATE_KIND[operation.type] ?? step.kind;
};

export const normalizeStepWithTemplate = (step: AlgebraStep, previousStep?: AlgebraStep): AlgebraStep => {
  const templateKind = resolveTemplateKindForStep(step, previousStep);
  const template = STEP_TEMPLATES[templateKind];

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
    steps: problem.steps.map((step, index) => normalizeStepWithTemplate(step, problem.steps[index - 1]))
  });
};

export const normalizeLessonWithTemplate = (lesson: AlgebraLesson): AlgebraLesson => {
  return {
    ...lesson,
    steps: lesson.steps.map((step, index) => normalizeStepWithTemplate(step, lesson.steps[index - 1]))
  };
};

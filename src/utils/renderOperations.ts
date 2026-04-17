import type {AlgebraStep, AlgebraVisualAction} from '../types/algebra';
import type {AlgebraOperationV2} from '../types/algebraDslV2';

type ExpandAction = Extract<AlgebraVisualAction, {type: 'expand'}>;
type FadeOutAction = Extract<AlgebraVisualAction, {type: 'fade_out'}>;
type HighlightAction = Extract<AlgebraVisualAction, {type: 'highlight'}>;
type MoveAction = Extract<AlgebraVisualAction, {type: 'move'}>;
export type OperationAnswerVariant =
  | 'default'
  | 'linear-system-infinite-solutions'
  | 'linear-system-no-solution'
  | 'linear-system-unique-solution'
  | 'quadratic-two-roots'
  | 'quadratic-double-root'
  | 'quadratic-no-real-root';

export const getStepOperation = (step: AlgebraStep | null | undefined): AlgebraOperationV2 | undefined => {
  return step?.operation;
};

export const hasOperationDrivenGuide = (step: AlgebraStep | null | undefined) => {
  const type = getStepOperation(step)?.type;

  return (
    type === 'expand_brackets' ||
    type === 'rewrite_equation_for_substitution' ||
    type === 'substitute_expression' ||
    type === 'move_term' ||
    type === 'combine_like_terms' ||
    type === 'solve_single_variable_equation' ||
    type === 'back_substitute_solution' ||
    type === 'factor_quadratic' ||
    type === 'split_into_linear_factors' ||
    type === 'apply_zero_product_rule' ||
    type === 'extract_square_root' ||
    type === 'compute_discriminant' ||
    type === 'classify_root_count' ||
    type === 'classify_system_result' ||
    type === 'apply_quadratic_formula' ||
    type === 'state_no_real_solution' ||
    type === 'state_no_solution' ||
    type === 'state_infinite_solutions' ||
    type === 'clear_denominator' ||
    type === 'multiply_both_sides' ||
    type === 'divide_both_sides' ||
    type === 'flip_inequality_sign' ||
    type === 'state_domain_restriction' ||
    type === 'find_critical_points' ||
    type === 'analyze_sign_interval' ||
    type === 'collect_solution_branches' ||
    type === 'collect_system_solution' ||
    type === 'final_answer' ||
    type === 'solve_inequality' ||
    type === 'intersect_solution_set'
  );
};

export const getOperationMoveTerm = (operation: AlgebraOperationV2 | undefined) => {
  return operation?.type === 'move_term' ? operation.termLatex : undefined;
};

export const getOperationAnswerExpression = (step: AlgebraStep | null | undefined) => {
  const operation = getStepOperation(step);

  if (operation?.type !== 'final_answer') {
    if (
      operation?.type !== 'solve_inequality' &&
      operation?.type !== 'intersect_solution_set' &&
      operation?.type !== 'collect_solution_branches' &&
      operation?.type !== 'collect_system_solution' &&
      operation?.type !== 'state_no_real_solution' &&
      operation?.type !== 'state_no_solution' &&
      operation?.type !== 'state_infinite_solutions'
    ) {
      return undefined;
    }

    if (operation.type === 'intersect_solution_set') {
      return operation.resultLatex;
    }

    if (operation.type === 'collect_solution_branches') {
      return operation.resultLatex;
    }

    if (operation.type === 'collect_system_solution') {
      return operation.solutionPairLatex;
    }

    if (operation.type === 'state_no_real_solution') {
      return operation.conclusionLatex;
    }

    if (operation.type === 'state_no_solution') {
      return operation.conclusionLatex;
    }

    if (operation.type === 'state_infinite_solutions') {
      return operation.conclusionLatex;
    }

    if (!operation.valueLatex) {
      return undefined;
    }

    return `${operation.variableLatex}${operation.relationLatex}${operation.valueLatex}`;
  }

  if (!operation.valueLatex) {
    return undefined;
  }

  return `${operation.variableLatex}=${operation.valueLatex}`;
};

export const getOperationAnswerLabel = (step: AlgebraStep | null | undefined, fallbackLabel: string) => {
  const operation = getStepOperation(step);
  const answerVariant = getOperationAnswerVariant(step);

  if (operation?.type === 'intersect_solution_set') {
    return '最终解集';
  }

  if (answerVariant === 'quadratic-two-roots') {
    return '两个解';
  }

  if (answerVariant === 'quadratic-double-root') {
    return '重根';
  }

  if (operation?.type === 'solve_inequality') {
    return '不等式解';
  }

  if (answerVariant === 'quadratic-no-real-root') {
    return '无实数解';
  }

  if (operation?.type === 'collect_system_solution') {
    return '方程组唯一解';
  }

  if (operation?.type === 'state_no_solution') {
    return '方程组无解';
  }

  if (operation?.type === 'state_infinite_solutions') {
    return '方程组有无穷多解';
  }

  return fallbackLabel;
};

export const getOperationAnswerVariant = (step: AlgebraStep | null | undefined): OperationAnswerVariant => {
  const operation = getStepOperation(step);

  if (operation?.type === 'collect_solution_branches') {
    const branchCount = operation.branchesLatex?.length ?? 0;

    if (branchCount >= 2) {
      return 'quadratic-two-roots';
    }

    if (branchCount === 1) {
      return 'quadratic-double-root';
    }
  }

  if (operation?.type === 'state_no_real_solution') {
    return 'quadratic-no-real-root';
  }

  if (operation?.type === 'collect_system_solution') {
    return 'linear-system-unique-solution';
  }

  if (operation?.type === 'state_no_solution') {
    return 'linear-system-no-solution';
  }

  if (operation?.type === 'state_infinite_solutions') {
    return 'linear-system-infinite-solutions';
  }

  return 'default';
};

export const withOperationExpandAction = (
  step: AlgebraStep | null | undefined,
  action?: ExpandAction
): ExpandAction | null => {
  const operation = getStepOperation(step);

  if (operation?.type !== 'expand_brackets') {
    return action ?? null;
  }

  return {
    source: action?.source ?? {line: 'previous', role: 'distributor'},
    target: action?.target,
    targets: action?.targets ?? {
      left: {line: 'current', role: 'expanded_left_term'},
      right: {line: 'current', role: 'expanded_right_term'}
    },
    type: 'expand'
  };
};

export const withOperationMoveAction = (
  step: AlgebraStep | null | undefined,
  action?: MoveAction
): MoveAction | null => {
  const operation = getStepOperation(step);

  if (operation?.type !== 'move_term') {
    return action ?? null;
  }

  return {
    ...action,
    source: action?.source ?? {line: 'previous', role: 'moving_term'},
    target: action?.target ?? {line: 'current', role: 'result_term'},
    targetAnchor: action?.targetAnchor ?? {line: 'current', role: 'result_term_slot'},
    targetSide: action?.targetSide ?? operation.toSide,
    term: getOperationMoveTerm(operation) ?? action?.term ?? 'moving_term',
    type: 'move'
  };
};

export const withOperationMoveHighlightAction = (
  step: AlgebraStep | null | undefined,
  action?: HighlightAction
): HighlightAction | null => {
  const operation = getStepOperation(step);

  if (operation?.type !== 'move_term') {
    return action ?? null;
  }

  return {
    ...action,
    anchor: action?.anchor ?? {line: 'previous', role: 'moving_term'},
    target: action?.target ?? 'moving_term',
    term: getOperationMoveTerm(operation) ?? action?.term ?? 'moving_term',
    type: 'highlight'
  };
};

export const withOperationMoveFadeOutAction = (
  step: AlgebraStep | null | undefined,
  action?: FadeOutAction
): FadeOutAction | null => {
  const operation = getStepOperation(step);

  if (operation?.type !== 'move_term') {
    return action ?? null;
  }

  return {
    ...action,
    anchor: action?.anchor ?? {line: 'previous', role: 'moving_term'},
    target: action?.target ?? 'moving_term',
    term: getOperationMoveTerm(operation) ?? action?.term ?? 'moving_term',
    type: 'fade_out'
  };
};

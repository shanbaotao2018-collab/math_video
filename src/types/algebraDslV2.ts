import type {AlgebraProblem, AlgebraStep, AlgebraStepKind, AlgebraVisualAction, FormulaToken} from './algebra';

export type AlgebraOperationTypeV2 =
  | 'write_equation'
  | 'rewrite_equation_for_substitution'
  | 'substitute_expression'
  | 'eliminate_variable'
  | 'move_term'
  | 'expand_brackets'
  | 'combine_like_terms'
  | 'solve_single_variable_equation'
  | 'back_substitute_solution'
  | 'factor_quadratic'
  | 'split_into_linear_factors'
  | 'apply_zero_product_rule'
  | 'extract_square_root'
  | 'compute_discriminant'
  | 'classify_root_count'
  | 'apply_quadratic_formula'
  | 'state_no_real_solution'
  | 'classify_system_result'
  | 'state_no_solution'
  | 'state_infinite_solutions'
  | 'clear_denominator'
  | 'multiply_both_sides'
  | 'divide_both_sides'
  | 'simplify_expression'
  | 'state_domain_restriction'
  | 'find_critical_points'
  | 'analyze_sign_interval'
  | 'collect_solution_branches'
  | 'collect_system_solution'
  | 'final_answer'
  | 'solve_inequality'
  | 'flip_inequality_sign'
  | 'intersect_solution_set';

export type EquationSideV2 = 'left' | 'right';

export type LikeTermGroupV2 = {
  category: 'constant' | 'fraction' | 'numeric' | 'variable';
  resultLatex: string;
  termsLatex: string[];
};

export type QuadraticCoefficientsLatexV2 = {
  a: string;
  b: string;
  c: string;
};

export type AlgebraOperationV2 =
  | {
      type: 'write_equation';
    }
  | {
      rewrittenLatex?: string;
      sourceEquationLatex?: string;
      targetVariableLatex?: string;
      type: 'rewrite_equation_for_substitution';
    }
  | {
      sourceEquationLatex?: string;
      sourceVariableLatex?: string;
      substitutedExpressionLatex?: string;
      targetEquationLatex?: string;
      type: 'substitute_expression';
    }
  | {
      eliminatedVariableLatex?: string;
      methodLatex?: 'add' | 'subtract';
      resultEquationLatex?: string;
      sourceEquationsLatex?: string[];
      type: 'eliminate_variable';
    }
  | {
      fromSide?: EquationSideV2;
      inverseTermLatex?: string;
      termLatex?: string;
      toSide?: EquationSideV2;
      type: 'move_term';
    }
  | {
      bracketLatex?: string;
      expansions?: {
        bracketLatex?: string;
        factorLatex?: string;
        resultLatex?: string;
      }[];
      factorLatex?: string;
      type: 'expand_brackets';
    }
  | {
      groups?: LikeTermGroupV2[];
      type: 'combine_like_terms';
    }
  | {
      resultLatex?: string;
      type: 'solve_single_variable_equation';
      variableLatex?: string;
    }
  | {
      knownSolutionLatex?: string;
      resultLatex?: string;
      targetEquationLatex?: string;
      type: 'back_substitute_solution';
    }
  | {
      factoredLatex?: string;
      sourceLatex?: string;
      type: 'factor_quadratic';
    }
  | {
      factorsLatex?: string[];
      type: 'split_into_linear_factors';
    }
  | {
      branchEquationsLatex?: string[];
      factorsLatex?: string[];
      type: 'apply_zero_product_rule';
    }
  | {
      branchesLatex?: string[];
      radicandLatex?: string;
      type: 'extract_square_root';
    }
  | {
      coefficientsLatex?: QuadraticCoefficientsLatexV2;
      discriminantLatex?: string;
      substitutionLatex?: string;
      type: 'compute_discriminant';
    }
  | {
      classification?: 'double_root' | 'no_real_root' | 'two_real_roots';
      discriminantLatex?: string;
      relationLatex?: string;
      type: 'classify_root_count';
    }
  | {
      branchesLatex?: string[];
      coefficientsLatex?: QuadraticCoefficientsLatexV2;
      discriminantLatex?: string;
      formulaLatex?: string;
      type: 'apply_quadratic_formula';
    }
  | {
      conclusionLatex?: string;
      discriminantLatex?: string;
      type: 'state_no_real_solution';
    }
  | {
      classification?: 'infinite_solutions' | 'no_solution' | 'unique_solution';
      reasonLatex?: string;
      type: 'classify_system_result';
    }
  | {
      conclusionLatex?: string;
      type: 'state_no_solution';
    }
  | {
      conclusionLatex?: string;
      type: 'state_infinite_solutions';
    }
  | {
      denominatorLatex?: string;
      denominatorsLatex?: string[];
      multiplierLatex?: string;
      type: 'clear_denominator';
    }
  | {
      multiplierLatex?: string;
      type: 'multiply_both_sides';
    }
  | {
      divisorLatex?: string;
      type: 'divide_both_sides';
    }
  | {
      type: 'simplify_expression';
    }
  | {
      reasonLatex?: string;
      restrictionLatex?: string;
      type: 'state_domain_restriction';
    }
  | {
      pointsLatex?: string[];
      reasonLatex?: string;
      type: 'find_critical_points';
    }
  | {
      criticalPointsLatex?: string[];
      selectedIntervalsLatex?: string[];
      signSummaryLatex?: string;
      type: 'analyze_sign_interval';
    }
  | {
      branchesLatex?: string[];
      resultLatex?: string;
      type: 'collect_solution_branches';
    }
  | {
      classification?: 'infinite_solutions' | 'no_solution' | 'unique_solution';
      solutionPairLatex?: string;
      type: 'collect_system_solution';
    }
  | {
      valueLatex?: string;
      variableLatex: string;
      type: 'final_answer';
    }
  | {
      relationLatex: string;
      valueLatex?: string;
      variableLatex: string;
      type: 'solve_inequality';
    }
  | {
      divisorLatex?: string;
      fromRelationLatex?: string;
      reason?: string;
      toRelationLatex?: string;
      type: 'flip_inequality_sign';
    }
  | {
      baseSolutionLatex?: string;
      restrictionLatex?: string;
      resultLatex?: string;
      type: 'intersect_solution_set';
    };

export type AlgebraStepV2 = {
  id: string;
  latex: string;
  legacyKind: AlgebraStepKind;
  note?: string;
  operation: AlgebraOperationV2;
  sourceLatex?: string;
  targetLatex: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};

export type AlgebraProblemV2 = {
  answer: string;
  equation: string;
  schemaVersion: 'algebra-dsl-v2-draft';
  steps: AlgebraStepV2[];
  title?: string;
};

const getAnswerParts = (latex: string) => {
  const match = latex.match(/^([a-zA-Z]+)=(.+)$/);

  if (!match) {
    return {
      valueLatex: undefined,
      variableLatex: 'x'
    };
  }

  return {
    valueLatex: match[2],
    variableLatex: match[1]
  };
};

const getOperationFromLegacyStep = (step: AlgebraStep): AlgebraOperationV2 => {
  const note = step.note ?? '';

  if (step.kind === 'write') {
    return {
      type: 'write_equation'
    };
  }

  if (step.kind === 'expand') {
    return {
      type: 'expand_brackets'
    };
  }

  if (step.kind === 'move') {
    return {
      type: 'move_term'
    };
  }

  if (step.kind === 'answer') {
    return {
      ...getAnswerParts(step.latex),
      type: 'final_answer'
    };
  }

  if (note.includes('乘以')) {
    return {
      type: 'multiply_both_sides'
    };
  }

  if (note.includes('除以')) {
    return {
      type: 'divide_both_sides'
    };
  }

  if (note.includes('合并')) {
    return {
      type: 'combine_like_terms'
    };
  }

  return {
    type: 'simplify_expression'
  };
};

export const toAlgebraStepV2Draft = (step: AlgebraStep, previousStep?: AlgebraStep): AlgebraStepV2 => {
  return {
    id: step.id,
    latex: step.latex,
    legacyKind: step.kind,
    ...(step.note ? {note: step.note} : {}),
    operation: step.operation ?? getOperationFromLegacyStep(step),
    ...(previousStep ? {sourceLatex: previousStep.latex} : {}),
    targetLatex: step.latex,
    ...(step.tokenMap ? {tokenMap: step.tokenMap} : {}),
    ...(step.visualActions ? {visualActions: step.visualActions} : {})
  };
};

export const toAlgebraProblemV2Draft = (problem: AlgebraProblem): AlgebraProblemV2 => {
  return {
    answer: problem.answer,
    equation: problem.equation,
    schemaVersion: 'algebra-dsl-v2-draft',
    steps: problem.steps.map((step, index) => toAlgebraStepV2Draft(step, problem.steps[index - 1])),
    ...(problem.title ? {title: problem.title} : {})
  };
};

export const toAlgebraStepV1FromV2Draft = (step: AlgebraStepV2): AlgebraStep => {
  return {
    id: step.id,
    expression: step.latex,
    kind: step.legacyKind,
    latex: step.latex,
    ...(step.note ? {note: step.note} : {}),
    operation: step.operation,
    ...(step.tokenMap ? {tokenMap: step.tokenMap} : {}),
    ...(step.visualActions ? {visualActions: step.visualActions} : {})
  };
};

export const toAlgebraProblemV1FromV2Draft = (problem: AlgebraProblemV2): AlgebraProblem => {
  return {
    answer: problem.answer,
    equation: problem.equation,
    steps: problem.steps.map(toAlgebraStepV1FromV2Draft),
    ...(problem.title ? {title: problem.title} : {})
  };
};

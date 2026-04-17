import type {AlgebraStep, AlgebraVisualAction, FormulaToken} from '../../types/algebra';
import type {
  AlgebraOperationV2,
  EquationSideV2,
  LikeTermGroupV2,
  QuadraticCoefficientsLatexV2
} from '../../types/algebraDslV2';

export type AIStepEnhancement = {
  id: string;
  note?: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};

export type AIEnhancementResult = {
  steps: AIStepEnhancement[];
};

export type AIEnhancementPromptOperation = {
  baseSolutionLatex?: string;
  classification?: 'double_root' | 'infinite_solutions' | 'no_real_root' | 'no_solution' | 'two_real_roots' | 'unique_solution';
  bracketLatex?: string;
  branchEquationsLatex?: string[];
  branchesLatex?: string[];
  coefficientsLatex?: QuadraticCoefficientsLatexV2;
  criticalPointsLatex?: string[];
  denominatorLatex?: string;
  denominatorsLatex?: string[];
  discriminantLatex?: string;
  divisorLatex?: string;
  eliminatedVariableLatex?: string;
  expansions?: {
    bracketLatex?: string;
    factorLatex?: string;
    resultLatex?: string;
  }[];
  factorLatex?: string;
  factoredLatex?: string;
  factorsLatex?: string[];
  fromRelationLatex?: string;
  fromSide?: EquationSideV2;
  groups?: LikeTermGroupV2[];
  inverseTermLatex?: string;
  multiplierLatex?: string;
  methodLatex?: 'add' | 'subtract';
  pointsLatex?: string[];
  reason?: string;
  reasonLatex?: string;
  relationLatex?: string;
  restrictionLatex?: string;
  resultLatex?: string;
  radicandLatex?: string;
  formulaLatex?: string;
  conclusionLatex?: string;
  selectedIntervalsLatex?: string[];
  signSummaryLatex?: string;
  sourceLatex?: string;
  sourceEquationLatex?: string;
  sourceEquationsLatex?: string[];
  sourceVariableLatex?: string;
  solvedConstant?: string;
  substitutionLatex?: string;
  substitutedExpressionLatex?: string;
  solutionPairLatex?: string;
  targetEquationLatex?: string;
  targetVariableLatex?: string;
  termLatex?: string;
  toRelationLatex?: string;
  toSide?: EquationSideV2;
  type: AlgebraOperationV2['type'];
  valueLatex?: string;
  variableLatex?: string;
};

export type AIEnhancementPromptStep = Pick<AlgebraStep, 'id' | 'kind' | 'latex'> & {
  operation?: AIEnhancementPromptOperation;
};

export type AIEnhancementInput = {
  question: string;
  steps: AIEnhancementPromptStep[];
};

export type AIEnhancer = (prompt: string) => Promise<string | null>;

export type AIEnhancementProvider = {
  enhance: (input: AIEnhancementInput) => AIEnhancementResult | Promise<AIEnhancementResult>;
};

export type AITokenMapEnhancer = AIEnhancementProvider;

export type AIVisualActionsEnhancer = AIEnhancementProvider;

export const TOKEN_MAP_ROLE_WHITELIST = [
  'moving_term',
  'result_term',
  'left_term',
  'right_value',
  'answer_term'
] as const;

export type TokenMapRole = (typeof TOKEN_MAP_ROLE_WHITELIST)[number];

export const VISUAL_ACTION_TYPE_WHITELIST = [
  'highlight',
  'expand',
  'move',
  'fade_out',
  'fade_in',
  'answer'
] as const;

export type AIVisualActionType = (typeof VISUAL_ACTION_TYPE_WHITELIST)[number];

export const mockAIEnhancer: AIEnhancementProvider = {
  enhance: ({steps}) => {
    return {
      steps: steps.map((step) => ({
        id: step.id,
        note: getMockNote(step)
      }))
    };
  }
};

export const mockAITokenMapEnhancer: AITokenMapEnhancer = {
  enhance: ({steps}) => {
    return {
      steps: steps
        .map((step) => ({
          id: step.id,
          tokenMap: getMockTokenMap(step)
        }))
        .filter((step) => step.tokenMap.length > 0)
    };
  }
};

export const mockAIVisualActionsEnhancer: AIVisualActionsEnhancer = {
  enhance: ({steps}) => {
    return {
      steps: steps
        .map((step) => ({
          id: step.id,
          visualActions: getMockVisualActions(step)
        }))
        .filter((step) => step.visualActions.length > 0)
    };
  }
};

const getMockNote = (step: AIEnhancementPromptStep) => {
  if (step.operation?.type === 'state_domain_restriction') {
    return '先检查取值范围';
  }

  if (step.operation?.type === 'rewrite_equation_for_substitution') {
    return '先把一条方程改写成适合代入的形式';
  }

  if (step.operation?.type === 'substitute_expression') {
    return '把一个变量的表达式代入另一条方程';
  }

  if (step.operation?.type === 'eliminate_variable') {
    return '把两条方程相加或相减，消去一个变量';
  }

  if (step.operation?.type === 'find_critical_points') {
    return '先找临界点';
  }

  if (step.operation?.type === 'analyze_sign_interval') {
    return '按区间判断符号';
  }

  if (step.operation?.type === 'intersect_solution_set') {
    return '结合限制条件得到最终解集';
  }

  if (step.operation?.type === 'solve_single_variable_equation') {
    return '先解出一个变量';
  }

  if (step.operation?.type === 'back_substitute_solution') {
    return '把已知变量代回去求另一个变量';
  }

  if (step.operation?.type === 'factor_quadratic') {
    return '先把二次式分解因式';
  }

  if (step.operation?.type === 'split_into_linear_factors') {
    return '把积式看成两个一次因式';
  }

  if (step.operation?.type === 'apply_zero_product_rule') {
    return '用零积法则拆成两个一次方程';
  }

  if (step.operation?.type === 'collect_solution_branches') {
    return '汇总分支解得到最终解集';
  }

  if (step.operation?.type === 'extract_square_root') {
    return '两边开平方，得到正负两个分支';
  }

  if (step.operation?.type === 'compute_discriminant') {
    return '先算判别式';
  }

  if (step.operation?.type === 'classify_root_count') {
    return '先根据判别式判断根的个数';
  }

  if (step.operation?.type === 'apply_quadratic_formula') {
    return '把 a、b、c 代入求根公式';
  }

  if (step.operation?.type === 'state_no_real_solution') {
    return '在实数范围内无解';
  }

  if (step.operation?.type === 'classify_system_result') {
    return step.operation.classification === 'no_solution' ? '判断这个方程组无解' : '判断这个方程组有无穷多解';
  }

  if (step.operation?.type === 'collect_system_solution') {
    return '汇总成方程组的解';
  }

  if (step.operation?.type === 'state_no_solution') {
    return '说明这个方程组无解';
  }

  if (step.operation?.type === 'state_infinite_solutions') {
    return '说明这个方程组有无穷多解';
  }

  if (step.kind === 'write') {
    return '写出原方程';
  }

  if (step.kind === 'expand') {
    return '用乘法分配律展开括号';
  }

  if (step.kind === 'move') {
    return '把常数项移到等号右边';
  }

  if (step.kind === 'transform') {
    return '计算并化简右边';
  }

  if (step.kind === 'answer') {
    return '系数化为 1，得到答案';
  }

  return '观察这一步的变化';
};

const createMockToken = (stepId: string, suffix: string, text: string, role: TokenMapRole): FormulaToken => {
  return {
    id: `${stepId}-${suffix}`,
    role,
    text
  };
};

const getMockTokenMap = (step: AIEnhancementPromptStep): FormulaToken[] => {
  const linearWithConstantMatch = step.latex.match(/^(.+?)([+-]\d+)=(-?\d+)$/);

  if (linearWithConstantMatch) {
    const [, leftTerm, movingTerm, rightValue] = linearWithConstantMatch;

    return [
      createMockToken(step.id, 'left-term', leftTerm, 'left_term'),
      createMockToken(step.id, 'moving-term', movingTerm, 'moving_term'),
      createMockToken(step.id, 'right-value', rightValue, 'right_value')
    ];
  }

  const movedMatch = step.latex.match(/^(.+?)=(-?\d+)([+-]\d+)$/);

  if (movedMatch) {
    const [, leftTerm, rightValue, resultTerm] = movedMatch;

    return [
      createMockToken(step.id, 'left-term', leftTerm, 'left_term'),
      createMockToken(step.id, 'right-value', rightValue, 'right_value'),
      createMockToken(step.id, 'result-term', resultTerm, 'result_term')
    ];
  }

  const axEqualsValueMatch = step.latex.match(/^(.+?x)=(-?\d+)$/);

  if (axEqualsValueMatch) {
    const [, leftTerm, rightValue] = axEqualsValueMatch;

    return [
      createMockToken(step.id, 'left-term', leftTerm, 'left_term'),
      createMockToken(step.id, 'right-value', rightValue, 'right_value')
    ];
  }

  if (step.kind === 'answer') {
    return [createMockToken(step.id, 'answer', step.latex, 'answer_term')];
  }

  return [];
};

const getMockVisualActions = (step: AIEnhancementPromptStep): AlgebraVisualAction[] => {
  if (step.kind === 'expand') {
    return [
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
    ];
  }

  if (step.kind === 'move') {
    return [
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
    ];
  }

  if (step.kind === 'answer') {
    return [{target: 'answer_term', type: 'answer'}];
  }

  return [];
};

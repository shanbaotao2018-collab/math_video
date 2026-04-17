import type {AlgebraProblem, AlgebraStep, AlgebraOperationTypeV2} from '../../types/algebra';
import type {AlgebraFamilyRecognition} from './buildAlgebraProductEntry';
import type {AlgebraQualityTier} from './inferAlgebraQualityTier';

export type AlgebraPresentationStrategyId =
  | 'answer_only'
  | 'compact_steps'
  | 'full_steps'
  | 'semantic_full_steps';

export type AlgebraPresentationMode = 'auto' | AlgebraPresentationStrategyId;

export type AlgebraPresentationSource = 'auto' | 'override';

export type AlgebraPresentationStrategy = {
  id: AlgebraPresentationStrategyId;
  label: string;
  summary: string;
};

const STRATEGY_BY_TIER: Record<AlgebraQualityTier, AlgebraPresentationStrategy> = {
  basic: {
    id: 'compact_steps',
    label: '精简步骤',
    summary: '保留关键推导，弱化重复解释。'
  },
  detailed: {
    id: 'semantic_full_steps',
    label: '完整语义讲解',
    summary: '保留完整流程，并强化区间、分支或系统求解提示。'
  },
  instant: {
    id: 'answer_only',
    label: '快速答案',
    summary: '只展示最终结果。'
  },
  standard: {
    id: 'full_steps',
    label: '标准流程',
    summary: '保留当前完整教学流程。'
  }
};

const STRATEGY_BY_ID: Record<AlgebraPresentationStrategyId, AlgebraPresentationStrategy> = {
  answer_only: STRATEGY_BY_TIER.instant,
  compact_steps: STRATEGY_BY_TIER.basic,
  full_steps: STRATEGY_BY_TIER.standard,
  semantic_full_steps: STRATEGY_BY_TIER.detailed
};

export const isAlgebraPresentationMode = (value: unknown): value is AlgebraPresentationMode => {
  return (
    value === 'auto' ||
    value === 'answer_only' ||
    value === 'compact_steps' ||
    value === 'full_steps' ||
    value === 'semantic_full_steps'
  );
};

const SEMANTIC_HINTS: Partial<Record<AlgebraOperationTypeV2, string>> = {
  analyze_sign_interval: '语义提示：按每个区间判断符号，再决定哪些区间满足题目关系。',
  back_substitute_solution: '语义提示：先求出的变量要回代，才能得到完整有序解。',
  classify_system_result: '语义提示：化简后的等式关系决定方程组是唯一解、无解还是无穷多解。',
  collect_solution_branches: '语义提示：这里把不同分支统一汇总，避免漏解。',
  collect_system_solution: '语义提示：方程组答案要同时满足两条方程。',
  eliminate_variable: '语义提示：消元的目标是先把二元问题降成一元问题。',
  find_critical_points: '语义提示：临界点会把数轴分成若干区间，是后续区间判断的边界。',
  intersect_solution_set: '语义提示：最终解集必须同时满足不等式结果和定义域限制。',
  rewrite_equation_for_substitution: '语义提示：先把一个变量单独表示出来，方便代入另一条方程。',
  split_into_linear_factors: '语义提示：每个一次因式都会产生一个可能的解分支。',
  state_domain_restriction: '语义提示：含分母的题要先排除让分母为 0 的值。',
  substitute_expression: '语义提示：代入后只剩一个变量，求解路径会更直接。'
};

const cloneStepWithoutHeavyNote = (step: AlgebraStep): AlgebraStep => {
  if (step.kind === 'answer') {
    return {...step};
  }

  return {
    ...step,
    note: undefined
  };
};

const createAnswerStep = (problem: AlgebraProblem): AlgebraStep => {
  return {
    expression: problem.answer,
    id: 's1',
    kind: 'answer',
    latex: problem.answer
  };
};

const getAnswerStep = (problem: AlgebraProblem) => {
  return [...problem.steps].reverse().find((step) => step.kind === 'answer') ?? createAnswerStep(problem);
};

const selectCompactLinearEquationSteps = (problem: AlgebraProblem) => {
  const writeStep = problem.steps.find((step) => step.kind === 'write');
  const keyStep = problem.steps.find((step) => step.kind !== 'write' && step.kind !== 'answer');
  const answerStep = getAnswerStep(problem);
  const selectedSteps = [writeStep, keyStep, answerStep].filter((step): step is AlgebraStep => Boolean(step));
  const seenStepIds = new Set<string>();

  return selectedSteps
    .filter((step) => {
      if (seenStepIds.has(step.id)) {
        return false;
      }

      seenStepIds.add(step.id);
      return true;
    })
    .map(cloneStepWithoutHeavyNote);
};

const addSemanticHint = (step: AlgebraStep): AlgebraStep => {
  const hint = step.operation?.type ? SEMANTIC_HINTS[step.operation.type] : undefined;

  if (!hint) {
    return {...step};
  }

  if (step.note?.includes(hint)) {
    return {...step};
  }

  return {
    ...step,
    note: step.note ? `${hint} ${step.note}` : hint
  };
};

export const applyAlgebraPresentationStrategy = ({
  family,
  presentationMode = 'auto',
  problem,
  qualityTier
}: {
  family: AlgebraFamilyRecognition;
  presentationMode?: AlgebraPresentationMode;
  problem: AlgebraProblem;
  qualityTier: AlgebraQualityTier;
}): {
  presentationSource: AlgebraPresentationSource;
  presentationStrategy: AlgebraPresentationStrategy;
  problem: AlgebraProblem;
} => {
  const effectivePresentationMode = isAlgebraPresentationMode(presentationMode) ? presentationMode : 'auto';
  const presentationSource: AlgebraPresentationSource = effectivePresentationMode === 'auto' ? 'auto' : 'override';
  const presentationStrategy =
    effectivePresentationMode === 'auto' ? STRATEGY_BY_TIER[qualityTier] : STRATEGY_BY_ID[effectivePresentationMode];

  if (presentationStrategy.id === 'answer_only') {
    return {
      presentationSource,
      presentationStrategy,
      problem: {
        ...problem,
        note: presentationStrategy.summary,
        steps: [getAnswerStep(problem)]
      }
    };
  }

  if (presentationStrategy.id === 'compact_steps') {
    return {
      presentationSource,
      presentationStrategy,
      problem: {
        ...problem,
        note: presentationStrategy.summary,
        steps:
          family.id === 'linear_equation'
            ? selectCompactLinearEquationSteps(problem)
            : problem.steps.map(cloneStepWithoutHeavyNote)
      }
    };
  }

  if (presentationStrategy.id === 'semantic_full_steps') {
    return {
      presentationSource,
      presentationStrategy,
      problem: {
        ...problem,
        note: presentationStrategy.summary,
        steps: problem.steps.map(addSemanticHint)
      }
    };
  }

  return {
    presentationSource,
    presentationStrategy,
    problem: {
      ...problem,
      note: problem.note ?? presentationStrategy.summary,
      steps: problem.steps.map((step) => ({...step}))
    }
  };
};

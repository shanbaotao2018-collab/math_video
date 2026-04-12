import type {AlgebraStep, AlgebraVisualAction, FormulaToken} from '../../types/algebra';

export type AIStepEnhancement = {
  id: string;
  note?: string;
  tokenMap?: FormulaToken[];
  visualActions?: AlgebraVisualAction[];
};

export type AIEnhancementResult = {
  steps: AIStepEnhancement[];
};

export type AIEnhancementPromptStep = Pick<AlgebraStep, 'id' | 'kind' | 'latex'>;

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

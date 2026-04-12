import type {AlgebraProblem, AlgebraStep, AlgebraVisualAction, FormulaToken} from '../../types/algebra';
import {
  TOKEN_MAP_ROLE_WHITELIST,
  VISUAL_ACTION_TYPE_WHITELIST,
  type AIEnhancementResult,
  type AIStepEnhancement
} from './aiEnhancementTypes';

const MAX_TOKENS_PER_STEP = 5;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isValidStepEnhancement = (value: unknown): value is AIStepEnhancement => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return false;
  }

  if (value.note !== undefined && typeof value.note !== 'string') {
    return false;
  }

  if (value.tokenMap !== undefined && !Array.isArray(value.tokenMap)) {
    return false;
  }

  return value.visualActions === undefined || Array.isArray(value.visualActions);
};

export const isValidAIEnhancementResult = (value: unknown): value is AIEnhancementResult => {
  if (!isRecord(value) || !Array.isArray(value.steps)) {
    return false;
  }

  return value.steps.every(isValidStepEnhancement);
};

export const parseAIEnhancementResult = (raw: string): AIEnhancementResult | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    return isValidAIEnhancementResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const isAllowedTokenRole = (role: string | undefined) => {
  return role === undefined || TOKEN_MAP_ROLE_WHITELIST.includes(role as (typeof TOKEN_MAP_ROLE_WHITELIST)[number]);
};

const isValidFormulaTokenForStep = (token: unknown, step: AlgebraStep): token is FormulaToken => {
  if (!isRecord(token) || typeof token.id !== 'string' || typeof token.text !== 'string') {
    return false;
  }

  if (!token.text || !step.latex.includes(token.text)) {
    return false;
  }

  return token.role === undefined || (typeof token.role === 'string' && isAllowedTokenRole(token.role));
};

export const isValidTokenMapForStep = (tokenMap: unknown, step: AlgebraStep): tokenMap is FormulaToken[] => {
  if (!Array.isArray(tokenMap) || tokenMap.length === 0 || tokenMap.length > MAX_TOKENS_PER_STEP) {
    return false;
  }

  return tokenMap.every((token) => isValidFormulaTokenForStep(token, step));
};

export const isValidTokenMapEnhancementResult = (
  value: unknown,
  steps: AlgebraStep[]
): value is AIEnhancementResult => {
  if (!isValidAIEnhancementResult(value)) {
    return false;
  }

  const stepsById = new Map(steps.map((step) => [step.id, step]));

  return value.steps.every((enhancement) => {
    if (enhancement.tokenMap === undefined) {
      return true;
    }

    const step = stepsById.get(enhancement.id);

    return step ? isValidTokenMapForStep(enhancement.tokenMap, step) : false;
  });
};

export const parseTokenMapEnhancementResult = (
  raw: string,
  steps: AlgebraStep[]
): AIEnhancementResult | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    return isValidTokenMapEnhancementResult(parsed, steps) ? parsed : null;
  } catch {
    return null;
  }
};

const hasOnlyKeys = (value: Record<string, unknown>, allowedKeys: string[]) => {
  const allowedKeySet = new Set(allowedKeys);

  return Object.keys(value).every((key) => allowedKeySet.has(key));
};

const isVisualLine = (value: unknown) => {
  return value === undefined || value === 'current' || value === 'next' || value === 'previous';
};

const isPositionRef = (value: unknown) => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['line', 'role', 'tokenId'])) {
    return false;
  }

  if (!isVisualLine(value.line)) {
    return false;
  }

  if (value.role !== undefined && typeof value.role !== 'string') {
    return false;
  }

  if (value.tokenId !== undefined && typeof value.tokenId !== 'string') {
    return false;
  }

  return typeof value.role === 'string' || typeof value.tokenId === 'string';
};

const isTargetsRef = (value: unknown) => {
  if (!isRecord(value) || !hasOnlyKeys(value, ['left', 'right'])) {
    return false;
  }

  return isPositionRef(value.left) && isPositionRef(value.right);
};

const isStringOrUndefined = (value: unknown) => {
  return value === undefined || typeof value === 'string';
};

const isAllowedVisualActionType = (value: unknown) => {
  return typeof value === 'string' && VISUAL_ACTION_TYPE_WHITELIST.includes(value as (typeof VISUAL_ACTION_TYPE_WHITELIST)[number]);
};

const isValidVisualAction = (action: unknown): action is AlgebraVisualAction => {
  if (!isRecord(action) || !isAllowedVisualActionType(action.type)) {
    return false;
  }

  if (action.type === 'expand') {
    return (
      hasOnlyKeys(action, ['type', 'source', 'target', 'targets']) &&
      isStringOrUndefined(action.target) &&
      (action.source === undefined || isPositionRef(action.source)) &&
      (action.targets === undefined || isTargetsRef(action.targets))
    );
  }

  if (action.type === 'move') {
    return (
      hasOnlyKeys(action, ['type', 'source', 'target', 'targetAnchor', 'targetSide', 'term', 'result', 'resultLatex']) &&
      typeof action.term === 'string' &&
      isStringOrUndefined(action.result) &&
      isStringOrUndefined(action.resultLatex) &&
      (action.targetSide === undefined || action.targetSide === 'left' || action.targetSide === 'right') &&
      (action.source === undefined || isPositionRef(action.source)) &&
      (action.target === undefined || isPositionRef(action.target)) &&
      (action.targetAnchor === undefined || isPositionRef(action.targetAnchor))
    );
  }

  if (action.type === 'highlight' || action.type === 'fade_out') {
    return (
      hasOnlyKeys(action, ['type', 'anchor', 'target', 'term']) &&
      isStringOrUndefined(action.target) &&
      isStringOrUndefined(action.term) &&
      (action.anchor === undefined || isPositionRef(action.anchor))
    );
  }

  if (action.type === 'fade_in') {
    return (
      hasOnlyKeys(action, ['type', 'anchor', 'target', 'expression']) &&
      isStringOrUndefined(action.target) &&
      isStringOrUndefined(action.expression) &&
      (action.anchor === undefined || isPositionRef(action.anchor))
    );
  }

  if (action.type === 'answer') {
    return hasOnlyKeys(action, ['type', 'target', 'expression']) && isStringOrUndefined(action.target) && isStringOrUndefined(action.expression);
  }

  return false;
};

export const isValidVisualActionsForStep = (visualActions: unknown): visualActions is AlgebraVisualAction[] => {
  if (!Array.isArray(visualActions)) {
    return false;
  }

  return visualActions.every(isValidVisualAction);
};

export const isValidVisualActionsEnhancementResult = (value: unknown): value is AIEnhancementResult => {
  if (!isValidAIEnhancementResult(value)) {
    return false;
  }

  return value.steps.every((enhancement) => {
    return enhancement.visualActions === undefined || isValidVisualActionsForStep(enhancement.visualActions);
  });
};

export const parseVisualActionsEnhancementResult = (raw: string): AIEnhancementResult | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    return isValidVisualActionsEnhancementResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const mergeStepEnhancements = (
  steps: AlgebraStep[],
  enhancementResult: unknown
): AlgebraStep[] => {
  if (!isValidAIEnhancementResult(enhancementResult)) {
    return steps;
  }

  const notesByStepId = new Map(
    enhancementResult.steps
      .filter((step) => typeof step.note === 'string')
      .map((step) => [step.id, step.note as string])
  );

  return steps.map((step) => {
    const note = notesByStepId.get(step.id);

    if (note === undefined) {
      return step;
    }

    return {
      ...step,
      note
    };
  });
};

export const mergeProblemEnhancements = (
  problem: AlgebraProblem,
  enhancementResult: unknown
): AlgebraProblem => {
  return {
    ...problem,
    steps: mergeStepEnhancements(problem.steps, enhancementResult)
  };
};

export const mergeStepTokenMapEnhancements = (
  steps: AlgebraStep[],
  enhancementResult: unknown
): AlgebraStep[] => {
  if (!isValidAIEnhancementResult(enhancementResult)) {
    return steps;
  }

  const enhancementsByStepId = new Map(enhancementResult.steps.map((step) => [step.id, step]));

  return steps.map((step) => {
    const enhancement = enhancementsByStepId.get(step.id);

    if (!enhancement?.tokenMap || !isValidTokenMapForStep(enhancement.tokenMap, step)) {
      return step;
    }

    return {
      ...step,
      tokenMap: enhancement.tokenMap
    };
  });
};

export const mergeProblemTokenMapEnhancements = (
  problem: AlgebraProblem,
  enhancementResult: unknown
): AlgebraProblem => {
  return {
    ...problem,
    steps: mergeStepTokenMapEnhancements(problem.steps, enhancementResult)
  };
};

export const mergeStepVisualActionsEnhancements = (
  steps: AlgebraStep[],
  enhancementResult: unknown
): AlgebraStep[] => {
  if (!isValidAIEnhancementResult(enhancementResult)) {
    return steps;
  }

  const enhancementsByStepId = new Map(enhancementResult.steps.map((step) => [step.id, step]));

  return steps.map((step) => {
    const enhancement = enhancementsByStepId.get(step.id);

    if (!enhancement?.visualActions || !isValidVisualActionsForStep(enhancement.visualActions)) {
      return step;
    }

    return {
      ...step,
      visualActions: enhancement.visualActions
    };
  });
};

export const mergeProblemVisualActionsEnhancements = (
  problem: AlgebraProblem,
  enhancementResult: unknown
): AlgebraProblem => {
  return {
    ...problem,
    steps: mergeStepVisualActionsEnhancements(problem.steps, enhancementResult)
  };
};

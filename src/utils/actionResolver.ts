import type {AlgebraStep, AlgebraVisualAction} from '../types/algebra';

export type VisualActionType = AlgebraVisualAction['type'];

export type VisualActionBuckets = {
  answer: Extract<AlgebraVisualAction, {type: 'answer'}>[];
  cancel: Extract<AlgebraVisualAction, {type: 'cancel'}>[];
  expand: Extract<AlgebraVisualAction, {type: 'expand'}>[];
  fadeIn: Extract<AlgebraVisualAction, {type: 'fade_in'}>[];
  fadeOut: Extract<AlgebraVisualAction, {type: 'fade_out'}>[];
  highlight: Extract<AlgebraVisualAction, {type: 'highlight'}>[];
  move: Extract<AlgebraVisualAction, {type: 'move'}>[];
};

export const getVisualActions = (step: AlgebraStep | null | undefined): AlgebraVisualAction[] => {
  return step?.visualActions ?? [];
};

export const getVisualActionsByType = <Type extends VisualActionType>(
  step: AlgebraStep | null | undefined,
  type: Type
): Extract<AlgebraVisualAction, {type: Type}>[] => {
  return getVisualActions(step).filter(
    (action): action is Extract<AlgebraVisualAction, {type: Type}> => action.type === type
  );
};

export const getFirstVisualAction = <Type extends VisualActionType>(
  step: AlgebraStep | null | undefined,
  type: Type
) => {
  return getVisualActionsByType(step, type)[0];
};

export const hasVisualAction = (step: AlgebraStep | null | undefined, type: VisualActionType) => {
  return getVisualActions(step).some((action) => action.type === type);
};

export const resolveVisualActionBuckets = (step: AlgebraStep | null | undefined): VisualActionBuckets => {
  return {
    answer: getVisualActionsByType(step, 'answer'),
    cancel: getVisualActionsByType(step, 'cancel'),
    expand: getVisualActionsByType(step, 'expand'),
    fadeIn: getVisualActionsByType(step, 'fade_in'),
    fadeOut: getVisualActionsByType(step, 'fade_out'),
    highlight: getVisualActionsByType(step, 'highlight'),
    move: getVisualActionsByType(step, 'move')
  };
};

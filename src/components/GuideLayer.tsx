import {AbsoluteFill} from 'remotion';

import {CancelOverlay} from './CancelOverlay';
import {ExpandGuideLayer} from './ExpandGuideLayer';
import {FadeOverlay} from './FadeOverlay';
import {HighlightOverlay} from './HighlightOverlay';
import {MathFormula} from './MathFormula';
import {MoveGuideLayer} from './MoveGuideLayer';
import {OperationSemanticOverlay} from './OperationSemanticOverlay';
import type {AlgebraLesson, LessonLayout} from '../types/algebra';
import {resolveVisualActionBuckets} from '../utils/actionResolver';
import {
  DEFAULT_MOVE_SOURCE,
  DEFAULT_MOVE_TARGET,
  getMovePositionPatch,
  type ExpandGuideRects,
  type MoveGuideRects
} from '../utils/anchors';
import {
  hasOperationDrivenGuide,
  withOperationExpandAction,
  withOperationMoveAction,
  withOperationMoveFadeOutAction,
  withOperationMoveHighlightAction
} from '../utils/renderOperations';

type StepLike = AlgebraLesson['steps'][number];

type Props = {
  expandRects?: ExpandGuideRects;
  layout: LessonLayout;
  moveRects?: MoveGuideRects;
  operationRects?: MoveGuideRects;
  progress: number;
  step: StepLike | null;
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

const ramp = (progress: number, start: number, end: number) => {
  if (end <= start) {
    return progress >= end ? 1 : 0;
  }

  return clamp((progress - start) / (end - start));
};

export const GuideLayer = ({expandRects, layout, moveRects, operationRects, progress, step}: Props) => {
  const actionBuckets = resolveVisualActionBuckets(step);
  const hasVisualActions =
    actionBuckets.expand.length > 0 ||
    actionBuckets.move.length > 0 ||
    actionBuckets.highlight.length > 0 ||
    actionBuckets.fadeOut.length > 0 ||
    actionBuckets.fadeIn.length > 0 ||
    actionBuckets.cancel.length > 0;
  const hasOperationGuide = hasOperationDrivenGuide(step);

  if (!step || (!hasVisualActions && !hasOperationGuide)) {
    return null;
  }

  const expandActions =
    actionBuckets.expand.length > 0
      ? actionBuckets.expand.map((action) => withOperationExpandAction(step, action) ?? action)
      : [withOperationExpandAction(step)].filter((action): action is NonNullable<typeof action> => Boolean(action));
  const highlightActions =
    actionBuckets.highlight.length > 0
      ? actionBuckets.highlight.map((action) => withOperationMoveHighlightAction(step, action) ?? action)
      : [withOperationMoveHighlightAction(step)].filter((action): action is NonNullable<typeof action> => Boolean(action));
  const fadeOutActions =
    actionBuckets.fadeOut.length > 0
      ? actionBuckets.fadeOut.map((action) => withOperationMoveFadeOutAction(step, action) ?? action)
      : [withOperationMoveFadeOutAction(step)].filter((action): action is NonNullable<typeof action> => Boolean(action));
  const moveActions =
    actionBuckets.move.length > 0
      ? actionBuckets.move.map((action) => withOperationMoveAction(step, action) ?? action)
      : [withOperationMoveAction(step)].filter((action): action is NonNullable<typeof action> => Boolean(action));
  const guideMoveRects = moveRects ?? operationRects;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 5}}>
      {expandActions.map((action, index) => {
        return (
          <ExpandGuideLayer
            key={`expand-${index}`}
            action={action}
            layout={layout}
            progress={progress}
            rects={expandRects}
          />
        );
      })}
      {highlightActions.map((action, index) => {
        return (
          <HighlightOverlay
            key={`highlight-${index}`}
            action={action}
            layout={layout}
            progress={progress}
            rects={guideMoveRects}
          />
        );
      })}
      {fadeOutActions.map((action, index) => {
        const patch = getMovePositionPatch(layout, guideMoveRects, action.anchor, DEFAULT_MOVE_SOURCE, action.term);

        return (
          <FadeOverlay
            key={`fade-out-${index}`}
            opacity={ramp(progress, 0.28, 0.52)}
            style={{
              left: patch.left,
              top: patch.top,
              width: patch.width,
              height: patch.height,
              borderRadius: 6,
              background: 'rgba(9, 31, 22, 0.92)',
              boxShadow: '0 0 14px rgba(9, 31, 22, 0.86)'
            }}
          />
        );
      })}
      {moveActions.map((action, index) => {
        return (
          <MoveGuideLayer
            key={`move-${index}`}
            action={action}
            layout={layout}
            progress={progress}
            rects={guideMoveRects}
          />
        );
      })}
      {actionBuckets.fadeIn.map((action, index) => {
        const moveAction = moveActions[0];
        const patch = getMovePositionPatch(layout, guideMoveRects, action.anchor, DEFAULT_MOVE_TARGET, moveAction?.term);

        if (!action.expression) {
          return null;
        }

        return (
          <FadeOverlay
            key={`fade-in-${index}`}
            opacity={ramp(progress, 0.54, 0.9)}
            style={{
              left: patch.left,
              top: patch.top - patch.height * 0.12
            }}
          >
            <MathFormula
              expression={action.expression}
              displayMode
              className="step-formula"
              style={{
                color: '#fff8d5',
                fontSize: layout === 'combined-main' ? 46 : 33,
                textShadow: '0 0 12px rgba(255, 233, 156, 0.18)'
              }}
            />
          </FadeOverlay>
        );
      })}
      {actionBuckets.cancel.map((action, index) => {
        return (
          <CancelOverlay
            key={`cancel-${index}`}
            action={action}
            layout={layout}
            progress={progress}
            rects={guideMoveRects}
          />
        );
      })}
      <OperationSemanticOverlay layout={layout} progress={progress} rects={operationRects ?? guideMoveRects} step={step} />
    </AbsoluteFill>
  );
};

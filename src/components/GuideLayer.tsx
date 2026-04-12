import {AbsoluteFill} from 'remotion';

import {CancelOverlay} from './CancelOverlay';
import {ExpandGuideLayer} from './ExpandGuideLayer';
import {FadeOverlay} from './FadeOverlay';
import {HighlightOverlay} from './HighlightOverlay';
import {MathFormula} from './MathFormula';
import {MoveGuideLayer} from './MoveGuideLayer';
import type {AlgebraLesson, LessonLayout} from '../types/algebra';
import {resolveVisualActionBuckets} from '../utils/actionResolver';
import {
  DEFAULT_MOVE_SOURCE,
  DEFAULT_MOVE_TARGET,
  getMovePositionPatch,
  type ExpandGuideRects,
  type MoveGuideRects
} from '../utils/anchors';

type StepLike = AlgebraLesson['steps'][number];

type Props = {
  expandRects?: ExpandGuideRects;
  layout: LessonLayout;
  moveRects?: MoveGuideRects;
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

export const GuideLayer = ({expandRects, layout, moveRects, progress, step}: Props) => {
  const actionBuckets = resolveVisualActionBuckets(step);
  const hasVisualActions =
    actionBuckets.expand.length > 0 ||
    actionBuckets.move.length > 0 ||
    actionBuckets.highlight.length > 0 ||
    actionBuckets.fadeOut.length > 0 ||
    actionBuckets.fadeIn.length > 0 ||
    actionBuckets.cancel.length > 0;

  if (!step || !hasVisualActions) {
    return null;
  }

  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 5}}>
      {actionBuckets.expand.map((action, index) => {
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
      {actionBuckets.highlight.map((action, index) => {
        return (
          <HighlightOverlay
            key={`highlight-${index}`}
            action={action}
            layout={layout}
            progress={progress}
            rects={moveRects}
          />
        );
      })}
      {actionBuckets.fadeOut.map((action, index) => {
        const patch = getMovePositionPatch(layout, moveRects, action.anchor, DEFAULT_MOVE_SOURCE, action.term);

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
      {actionBuckets.move.map((action, index) => {
        return (
          <MoveGuideLayer
            key={`move-${index}`}
            action={action}
            layout={layout}
            progress={progress}
            rects={moveRects}
          />
        );
      })}
      {actionBuckets.fadeIn.map((action, index) => {
        const moveAction = actionBuckets.move[0];
        const patch = getMovePositionPatch(layout, moveRects, action.anchor, DEFAULT_MOVE_TARGET, moveAction?.term);

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
          <CancelOverlay key={`cancel-${index}`} action={action} layout={layout} progress={progress} rects={moveRects} />
        );
      })}
    </AbsoluteFill>
  );
};

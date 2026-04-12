import {FadeOverlay} from './FadeOverlay';
import {DEFAULT_MOVE_SOURCE, getMovePositionPatch, type MoveGuideRects} from '../utils/anchors';
import type {AlgebraVisualAction, LessonLayout} from '../types/algebra';

type Props = {
  action: Extract<AlgebraVisualAction, {type: 'highlight'}>;
  layout: LessonLayout;
  progress: number;
  rects?: MoveGuideRects;
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

const pulse = (progress: number, fadeInEnd: number, fadeOutStart: number, fadeOutEnd: number) => {
  return Math.min(ramp(progress, 0, fadeInEnd), 1 - ramp(progress, fadeOutStart, fadeOutEnd));
};

export const HighlightOverlay = ({action, layout, progress, rects}: Props) => {
  const patch = getMovePositionPatch(layout, rects, action.anchor, DEFAULT_MOVE_SOURCE, action.term);

  return (
    <FadeOverlay
      opacity={pulse(progress, 0.12, 0.26, 0.42)}
      style={{
        left: patch.left - 6,
        top: patch.top - 5,
        width: patch.width + 12,
        height: patch.height + 10,
        borderRadius: 6,
        background: 'rgba(255, 233, 156, 0.1)',
        border: '2px solid rgba(255, 233, 156, 0.88)',
        boxShadow: '0 0 14px rgba(255, 233, 156, 0.24)'
      }}
    />
  );
};

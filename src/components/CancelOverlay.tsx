import {FadeOverlay} from './FadeOverlay';
import {DEFAULT_MOVE_SOURCE, getMovePositionPatch, type MoveGuideRects} from '../utils/anchors';
import type {AlgebraVisualAction, LessonLayout} from '../types/algebra';

type Props = {
  action: Extract<AlgebraVisualAction, {type: 'cancel'}>;
  layout: LessonLayout;
  progress: number;
  rects?: MoveGuideRects;
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

export const CancelOverlay = ({action, layout, progress, rects}: Props) => {
  const patch = getMovePositionPatch(layout, rects, action.anchor, DEFAULT_MOVE_SOURCE, action.term);

  return (
    <FadeOverlay
      opacity={clamp(progress)}
      style={{
        left: patch.left,
        top: patch.top + patch.height * 0.48,
        width: patch.width,
        height: 4,
        borderRadius: 4,
        background: 'rgba(255, 233, 156, 0.9)',
        transform: 'rotate(-8deg)',
        transformOrigin: 'center'
      }}
    />
  );
};

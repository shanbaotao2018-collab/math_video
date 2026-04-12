import {ArrowGuide} from './ArrowGuide';
import {getMoveArrowAnchors, type MoveGuideRects} from '../utils/anchors';
import type {AlgebraVisualAction, LessonLayout} from '../types/algebra';

type Props = {
  action: Extract<AlgebraVisualAction, {type: 'move'}>;
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

export const MoveGuideLayer = ({action, layout, progress, rects}: Props) => {
  const moveArrow = getMoveArrowAnchors(layout, rects, action);
  const arrowProgress = ramp(progress, 0.16, 0.5);

  return <ArrowGuide from={moveArrow.from} to={moveArrow.to} progress={arrowProgress} />;
};

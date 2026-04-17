import {ArrowGuide} from './ArrowGuide';
import {getExpandGuideAnchors, type ExpandGuideRects} from '../utils/anchors';
import type {AlgebraVisualAction, LessonLayout} from '../types/algebra';

type Props = {
  action: Extract<AlgebraVisualAction, {type: 'expand'}>;
  layout: LessonLayout;
  progress: number;
  rects?: ExpandGuideRects;
};

export const ExpandGuideLayer = ({action, layout, progress, rects}: Props) => {
  const anchors = getExpandGuideAnchors(layout, rects, action);
  const arrows = [
    {from: anchors.source, to: anchors.leftTarget},
    {from: anchors.source, to: anchors.rightTarget}
  ];

  return (
    <>
      {arrows.map((arrow, index) => {
        return <ArrowGuide key={index} from={arrow.from} to={arrow.to} progress={progress} opacity={0.76} strokeWidth={4} />;
      })}
    </>
  );
};

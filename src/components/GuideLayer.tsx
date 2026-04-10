import {AbsoluteFill} from 'remotion';

import {ArrowGuide} from './ArrowGuide';
import type {AlgebraLesson, AlgebraStepGuide, LessonLayout} from '../types/algebra';

type StepLike = AlgebraLesson['steps'][number];

type Props = {
  layout: LessonLayout;
  progress: number;
  step: StepLike | null;
};

const getResolvedGuide = (step: StepLike | null): AlgebraStepGuide | null => {
  if (!step) {
    return null;
  }

  if (step.guide) {
    return step.guide;
  }

  if (step.kind === 'expand') {
    return 'expand';
  }

  if (step.kind === 'move') {
    return 'move';
  }

  return null;
};

export const GuideLayer = ({layout, progress, step}: Props) => {
  const guide = getResolvedGuide(step);

  if (!guide) {
    return null;
  }

  const moveArrow =
    layout === 'combined-main'
      ? {from: {x: 1090, y: 420}, to: {x: 1370, y: 420}}
      : {from: {x: 1160, y: 415}, to: {x: 1435, y: 415}};
  const expandArrows =
    layout === 'combined-main'
      ? [
          {from: {x: 900, y: 235}, to: {x: 1120, y: 390}},
          {from: {x: 1030, y: 235}, to: {x: 1315, y: 390}}
        ]
      : [
          {from: {x: 410, y: 290}, to: {x: 1160, y: 375}},
          {from: {x: 470, y: 290}, to: {x: 1295, y: 375}}
        ];

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {guide === 'move' ? <ArrowGuide from={moveArrow.from} to={moveArrow.to} progress={progress} /> : null}
      {guide === 'expand'
        ? expandArrows.map((arrow, index) => {
            return <ArrowGuide key={index} from={arrow.from} to={arrow.to} progress={progress} />;
          })
        : null}
    </AbsoluteFill>
  );
};

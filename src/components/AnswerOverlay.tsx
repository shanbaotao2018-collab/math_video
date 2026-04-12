import {interpolate} from 'remotion';

import {AnswerHighlight} from './AnswerHighlight';

type Props = {
  expression: string;
  label: string;
  progress: number;
};

export const AnswerOverlay = ({expression, label, progress}: Props) => {
  return (
    <div
      style={{
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.95, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })})`
      }}
    >
      <AnswerHighlight label={label} expression={expression} />
    </div>
  );
};

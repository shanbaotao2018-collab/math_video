import {interpolate} from 'remotion';

import {AnswerHighlight} from './AnswerHighlight';
import type {OperationAnswerVariant} from '../utils/renderOperations';

type Props = {
  expression: string;
  label: string;
  variant?: OperationAnswerVariant;
  progress: number;
};

export const AnswerOverlay = ({expression, label, variant = 'default', progress}: Props) => {
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
      <AnswerHighlight label={label} expression={expression} variant={variant} />
    </div>
  );
};

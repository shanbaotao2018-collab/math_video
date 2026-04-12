import {forwardRef, type CSSProperties} from 'react';

import {MathFormula} from './MathFormula';
import type {LessonStep} from '../types/algebra';

type Props = {
  index: number;
  step: LessonStep;
  style?: CSSProperties;
};

export const StepCard = forwardRef<HTMLDivElement, Props>(({index, step, style}, ref) => {
  return (
    <div className="step-card" style={style}>
      <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
      <MathFormula ref={ref} expression={step.latex} className="step-formula" displayMode />
    </div>
  );
});

StepCard.displayName = 'StepCard';

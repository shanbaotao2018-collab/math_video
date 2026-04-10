import type {CSSProperties} from 'react';

import {MathFormula} from './MathFormula';
import type {LessonStep} from '../types/algebra';

type Props = {
  index: number;
  step: LessonStep;
  style?: CSSProperties;
};

export const StepCard = ({index, step, style}: Props) => {
  return (
    <div className="step-card" style={style}>
      <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
      <MathFormula expression={step.expression} className="step-formula" displayMode />
    </div>
  );
};

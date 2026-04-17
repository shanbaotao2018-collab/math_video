import {forwardRef, type CSSProperties} from 'react';

import {MathFormula} from './MathFormula';
import type {LessonStep} from '../types/algebra';
import {getOperationAnswerVariant} from '../utils/renderOperations';

type Props = {
  active?: boolean;
  index: number;
  step: LessonStep;
  style?: CSSProperties;
};

export const StepCard = forwardRef<HTMLDivElement, Props>(({active = false, index, step, style}, ref) => {
  const answerVariant = getOperationAnswerVariant(step);
  const className = [
    'step-card',
    active ? 'step-card-active' : '',
    step.kind === 'transform' ? 'step-card-transform' : '',
    step.kind === 'answer' ||
    step.operation?.type === 'final_answer' ||
    step.operation?.type === 'collect_solution_branches' ||
    step.operation?.type === 'collect_system_solution' ||
    step.operation?.type === 'solve_inequality' ||
    step.operation?.type === 'intersect_solution_set' ||
    step.operation?.type === 'state_no_real_solution' ||
    step.operation?.type === 'state_no_solution' ||
    step.operation?.type === 'state_infinite_solutions'
      ? 'step-card-answer'
      : '',
    answerVariant === 'linear-system-no-solution' ? 'step-card-system-no-solution' : '',
    answerVariant === 'linear-system-infinite-solutions' ? 'step-card-system-infinite-solutions' : '',
    answerVariant === 'linear-system-unique-solution' ? 'step-card-system-unique-solution' : '',
    answerVariant !== 'default' ? 'step-card-quadratic-outcome' : '',
    answerVariant === 'quadratic-two-roots' ? 'step-card-quadratic-two-roots' : '',
    answerVariant === 'quadratic-double-root' ? 'step-card-quadratic-double-root' : '',
    answerVariant === 'quadratic-no-real-root' ? 'step-card-quadratic-no-real-root' : '',
    step.operation?.type === 'final_answer' ||
    step.operation?.type === 'collect_solution_branches' ||
    step.operation?.type === 'collect_system_solution' ||
    step.operation?.type === 'solve_inequality' ||
    step.operation?.type === 'intersect_solution_set' ||
    step.operation?.type === 'state_no_real_solution' ||
    step.operation?.type === 'state_no_solution' ||
    step.operation?.type === 'state_infinite_solutions'
      ? 'step-card-final-operation'
      : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={style}>
      <div className="step-index">{String(index + 1).padStart(2, '0')}</div>
      <MathFormula ref={ref} expression={step.latex} className="step-formula" displayMode />
    </div>
  );
});

StepCard.displayName = 'StepCard';

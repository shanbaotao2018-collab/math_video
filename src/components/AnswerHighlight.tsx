import {MathFormula} from './MathFormula';
import type {OperationAnswerVariant} from '../utils/renderOperations';

type Props = {
  label: string;
  expression: string;
  variant?: OperationAnswerVariant;
};

const resolveHammerText = (expression: string) => {
  return /无解|无穷多解|无实数解/.test(expression) ? '别再写成别的了' : '这一步就定死了';
};

export const AnswerHighlight = ({expression, label, variant = 'default'}: Props) => {
  const isOutcome = variant !== 'default';

  return (
    <div
      className={[
        'answer-highlight',
        isOutcome ? 'answer-highlight-quadratic' : '',
        variant === 'linear-system-no-solution' ? 'answer-highlight-system-no-solution' : '',
        variant === 'linear-system-infinite-solutions' ? 'answer-highlight-system-infinite-solutions' : '',
        variant === 'linear-system-unique-solution' ? 'answer-highlight-system-unique-solution' : '',
        variant === 'quadratic-two-roots' ? 'answer-highlight-quadratic-two-roots' : '',
        variant === 'quadratic-double-root' ? 'answer-highlight-quadratic-double-root' : '',
        variant === 'quadratic-no-real-root' ? 'answer-highlight-quadratic-no-real-root' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'answer-label',
          isOutcome ? 'answer-label-quadratic' : '',
          variant === 'linear-system-no-solution' ? 'answer-label-system-no-solution' : '',
          variant === 'linear-system-infinite-solutions' ? 'answer-label-system-infinite-solutions' : '',
          variant === 'linear-system-unique-solution' ? 'answer-label-system-unique-solution' : '',
          variant === 'quadratic-two-roots' ? 'answer-label-quadratic-two-roots' : '',
          variant === 'quadratic-double-root' ? 'answer-label-quadratic-double-root' : '',
          variant === 'quadratic-no-real-root' ? 'answer-label-quadratic-no-real-root' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
      </div>
      <MathFormula
        expression={expression}
        className={[
          'answer-formula',
          isOutcome ? 'answer-formula-quadratic' : '',
          variant === 'linear-system-no-solution' ? 'answer-formula-system-no-solution' : '',
          variant === 'linear-system-infinite-solutions' ? 'answer-formula-system-infinite-solutions' : '',
          variant === 'linear-system-unique-solution' ? 'answer-formula-system-unique-solution' : '',
          variant === 'quadratic-two-roots' ? 'answer-formula-quadratic-two-roots' : '',
          variant === 'quadratic-double-root' ? 'answer-formula-quadratic-double-root' : '',
          variant === 'quadratic-no-real-root' ? 'answer-formula-quadratic-no-real-root' : ''
        ]
          .filter(Boolean)
          .join(' ')}
        displayMode
      />
      <div className="answer-hammer">{resolveHammerText(expression)}</div>
    </div>
  );
};

import {MathFormula} from './MathFormula';

type Props = {
  label: string;
  expression: string;
};

export const AnswerHighlight = ({expression, label}: Props) => {
  return (
    <div className="answer-highlight">
      <div className="answer-label">{label}</div>
      <MathFormula expression={expression} className="answer-formula" displayMode />
    </div>
  );
};

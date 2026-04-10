import type {CSSProperties} from 'react';

import {renderMathExpression} from '../utils/katex';

type Props = {
  expression: string;
  displayMode?: boolean;
  className?: string;
  style?: CSSProperties;
};

export const MathFormula = ({className, displayMode = false, expression, style}: Props) => {
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{
        __html: renderMathExpression(expression, displayMode)
      }}
    />
  );
};

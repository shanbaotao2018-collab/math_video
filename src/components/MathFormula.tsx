import {forwardRef, type CSSProperties} from 'react';

import {renderMathExpression} from '../utils/katex';

type Props = {
  expression: string;
  displayMode?: boolean;
  className?: string;
  style?: CSSProperties;
};

export const MathFormula = forwardRef<HTMLDivElement, Props>(
  ({className, displayMode = false, expression, style}, ref) => {
    return (
      <div
        className={className}
        ref={ref}
        style={style}
        dangerouslySetInnerHTML={{
          __html: renderMathExpression(expression, displayMode)
        }}
      />
    );
  }
);

MathFormula.displayName = 'MathFormula';

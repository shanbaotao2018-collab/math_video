import katex from 'katex';

export const renderMathExpression = (expression: string, displayMode = false) => {
  return katex.renderToString(expression, {
    displayMode,
    output: 'html',
    strict: 'ignore',
    throwOnError: false
  });
};

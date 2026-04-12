import type {ParsedEquation} from './parser';

export type LinearEquationState = {
  coefficient: number;
  constant: number;
  latex: string;
  right: number;
};

export type MovedTermState = {
  coefficient: number;
  latex: string;
  right: number;
  simplifiedLatex: string;
};

export type DividedCoefficientState = {
  answer: string;
  latex: string;
};

export const formatCoefficientTerm = (coefficient: number) => {
  if (coefficient === 1) {
    return 'x';
  }

  if (coefficient === -1) {
    return '-x';
  }

  return `${coefficient}x`;
};

export const formatSignedConstant = (constant: number) => {
  if (constant === 0) {
    return '';
  }

  return constant > 0 ? `+${constant}` : `${constant}`;
};

export const formatLinearLatex = (coefficient: number, constant = 0) => {
  return `${formatCoefficientTerm(coefficient)}${formatSignedConstant(constant)}`;
};

const getGcd = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;

    a = b;
    b = remainder;
  }

  return a || 1;
};

const formatRational = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    return String(numerator);
  }

  if (numerator === 0) {
    return '0';
  }

  const sign = numerator * denominator < 0 ? '-' : '';
  const absoluteNumerator = Math.abs(numerator);
  const absoluteDenominator = Math.abs(denominator);
  const gcd = getGcd(absoluteNumerator, absoluteDenominator);
  const reducedNumerator = absoluteNumerator / gcd;
  const reducedDenominator = absoluteDenominator / gcd;

  if (reducedDenominator === 1) {
    return `${sign}${reducedNumerator}`;
  }

  return `${sign}\\frac{${reducedNumerator}}{${reducedDenominator}}`;
};

export const expandBrackets = (equation: Extract<ParsedEquation, {shape: 'distributed'}>): LinearEquationState => {
  const coefficient = equation.coefficient;
  const constant = equation.coefficient * equation.innerConstant;

  return {
    coefficient,
    constant,
    latex: `${formatLinearLatex(coefficient, constant)}=${equation.right}`,
    right: equation.right
  };
};

export const moveTerm = (equation: LinearEquationState): MovedTermState => {
  const movedSign = equation.constant > 0 ? '-' : '+';
  const movedConstant = Math.abs(equation.constant);
  const right = equation.right - equation.constant;

  return {
    coefficient: equation.coefficient,
    latex: `${formatCoefficientTerm(equation.coefficient)}=${equation.right}${movedSign}${movedConstant}`,
    right,
    simplifiedLatex: `${formatCoefficientTerm(equation.coefficient)}=${right}`
  };
};

export const divideCoefficient = (equation: Pick<MovedTermState, 'coefficient' | 'right'>): DividedCoefficientState => {
  const answerValue = formatRational(equation.right, equation.coefficient);
  const answer = `x=${answerValue}`;

  return {
    answer,
    latex: answer
  };
};

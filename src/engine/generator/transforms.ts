import type {InequalitySign, ParsedEquation} from './parser';

export type LinearEquationState = {
  coefficient: number;
  constant: number;
  latex: string;
  right: number;
};

export type ExpandedWithOuterConstantState = {
  coefficient: number;
  expandedConstant: number;
  latex: string;
  outerConstant: number;
  right: number;
};

export type FractionEquationState = {
  constant: number;
  denominator: number;
  latex: string;
  right: number;
};

export type FractionInequalityState = {
  constant: number;
  denominator: number;
  latex: string;
  relation: InequalitySign;
  right: number;
};

export type MovedFractionConstantState = {
  denominator: number;
  latex: string;
  right: number;
  simplifiedLatex: string;
};

export type MovedFractionInequalityConstantState = {
  denominator: number;
  latex: string;
  relation: InequalitySign;
  right: number;
  simplifiedLatex: string;
};

export type MultipliedDenominatorState = {
  answer: string;
  latex: string;
  simplifiedLatex: string;
};

export type ClearedFractionInequalityState = {
  clearedRight: number;
  latex: string;
  simplifiedLatex: string;
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
  operationLatex: string;
};

export type MovedVariableTermState = {
  coefficient: number;
  latex: string;
  right: number;
  simplifiedLatex: string;
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

const formatUnsignedCoefficientTerm = (coefficient: number) => {
  const absoluteCoefficient = Math.abs(coefficient);

  return absoluteCoefficient === 1 ? 'x' : `${absoluteCoefficient}x`;
};

const formatMovedCoefficientTerm = (coefficient: number) => {
  return coefficient > 0 ? `-${formatUnsignedCoefficientTerm(coefficient)}` : `+${formatUnsignedCoefficientTerm(coefficient)}`;
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

export const formatFractionLatex = (denominator: number, constant = 0) => {
  return `\\frac{x}{${denominator}}${formatSignedConstant(constant)}`;
};

export const getGcd = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;

    a = b;
    b = remainder;
  }

  return a || 1;
};

export const getLeastCommonMultiple = (left: number, right: number) => {
  return Math.abs(left * right) / getGcd(left, right);
};

export const formatRational = (numerator: number, denominator: number) => {
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

export const formatRelationLatex = (relation: InequalitySign) => {
  if (relation === '<=') {
    return '\\le';
  }

  if (relation === '>=') {
    return '\\ge';
  }

  return relation;
};

export const flipInequalityRelation = (relation: InequalitySign): InequalitySign => {
  if (relation === '<') {
    return '>';
  }

  if (relation === '>') {
    return '<';
  }

  if (relation === '<=') {
    return '>=';
  }

  return '<=';
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

export const expandBracketsWithOuterConstant = (
  equation: Extract<ParsedEquation, {shape: 'distributed-with-constant'}>
): ExpandedWithOuterConstantState => {
  const coefficient = equation.coefficient;
  const expandedConstant = equation.coefficient * equation.innerConstant;

  return {
    coefficient,
    expandedConstant,
    latex: `${formatCoefficientTerm(coefficient)}${formatSignedConstant(expandedConstant)}${formatSignedConstant(
      equation.outerConstant
    )}=${equation.right}`,
    outerConstant: equation.outerConstant,
    right: equation.right
  };
};

export const combineExpandedConstants = (equation: ExpandedWithOuterConstantState): LinearEquationState => {
  const constant = equation.expandedConstant + equation.outerConstant;

  return {
    coefficient: equation.coefficient,
    constant,
    latex: `${formatLinearLatex(equation.coefficient, constant)}=${equation.right}`,
    right: equation.right
  };
};

export const createFractionEquationState = (
  equation: Extract<ParsedEquation, {shape: 'fraction-with-constant'}>
): FractionEquationState => {
  return {
    constant: equation.constant,
    denominator: equation.denominator,
    latex: `${formatFractionLatex(equation.denominator, equation.constant)}=${equation.right}`,
    right: equation.right
  };
};

export const createFractionInequalityState = (
  equation: Extract<ParsedEquation, {shape: 'fraction-inequality-with-constant'}>
): FractionInequalityState => {
  return {
    constant: equation.constant,
    denominator: equation.denominator,
    latex: `${formatFractionLatex(equation.denominator, equation.constant)}${formatRelationLatex(equation.relation)}${equation.right}`,
    relation: equation.relation,
    right: equation.right
  };
};

export const moveFractionConstant = (equation: FractionEquationState): MovedFractionConstantState => {
  const movedSign = equation.constant > 0 ? '-' : '+';
  const movedConstant = Math.abs(equation.constant);
  const right = equation.right - equation.constant;
  const fractionLatex = formatFractionLatex(equation.denominator);

  return {
    denominator: equation.denominator,
    latex: `${fractionLatex}=${equation.right}${movedSign}${movedConstant}`,
    right,
    simplifiedLatex: `${fractionLatex}=${right}`
  };
};

export const moveFractionInequalityConstant = (
  equation: FractionInequalityState
): MovedFractionInequalityConstantState => {
  const movedSign = equation.constant > 0 ? '-' : '+';
  const movedConstant = Math.abs(equation.constant);
  const right = equation.right - equation.constant;
  const fractionLatex = formatFractionLatex(equation.denominator);
  const relationLatex = formatRelationLatex(equation.relation);

  return {
    denominator: equation.denominator,
    latex: `${fractionLatex}${relationLatex}${equation.right}${movedSign}${movedConstant}`,
    relation: equation.relation,
    right,
    simplifiedLatex: `${fractionLatex}${relationLatex}${right}`
  };
};

export const multiplyDenominator = (equation: MovedFractionConstantState): MultipliedDenominatorState => {
  const answerValue = equation.right * equation.denominator;
  const answer = `x=${answerValue}`;

  return {
    answer,
    latex: `x=${equation.right}\\cdot ${equation.denominator}`,
    simplifiedLatex: answer
  };
};

export const clearFractionInequalityByDenominator = (
  equation: Pick<MovedFractionInequalityConstantState, 'denominator' | 'relation' | 'right'>
): ClearedFractionInequalityState => {
  const clearedRight = equation.right * equation.denominator;
  const relationLatex = formatRelationLatex(equation.relation);

  return {
    clearedRight,
    latex: `x${relationLatex}${equation.right}\\cdot ${equation.denominator}`,
    simplifiedLatex: `x${relationLatex}${clearedRight}`
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
    latex: answer,
    operationLatex: equation.coefficient === 1 ? answer : `x=${equation.right}\\div ${equation.coefficient}`
  };
};

export const moveVariableTerms = (
  equation: Extract<ParsedEquation, {shape: 'variables-both-sides'}>
): MovedVariableTermState => {
  const coefficient = equation.coefficient - equation.rightCoefficient;
  const right = equation.rightConstant - equation.constant;

  return {
    coefficient,
    latex: `${formatCoefficientTerm(equation.coefficient)}${formatMovedCoefficientTerm(
      equation.rightCoefficient
    )}=${equation.rightConstant}${formatSignedConstant(-equation.constant)}`,
    right,
    simplifiedLatex: `${formatCoefficientTerm(coefficient)}=${right}`
  };
};

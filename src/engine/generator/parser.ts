export type SupportedEquationShape =
  | 'bracket-fraction'
  | 'bracket-fraction-inequality'
  | 'distributed'
  | 'distributed-with-constant'
  | 'fraction-with-constant'
  | 'fraction-inequality-with-constant'
  | 'fraction-sum'
  | 'fraction-variable-denominator-inequality'
  | 'linear-system-elimination-basic'
  | 'linear-system-infinite-solutions-basic'
  | 'linear-system-no-solution-basic'
  | 'linear-system-substitution-basic'
  | 'linear-system-substitution-solved'
  | 'linear-inequality'
  | 'linear-with-constant'
  | 'linear'
  | 'multi-distributed'
  | 'quadratic-factored'
  | 'quadratic-formula-double-root'
  | 'quadratic-formula-no-real-root'
  | 'quadratic-formula-two-real-roots'
  | 'quadratic-square-root'
  | 'quadratic-standard-factorable'
  | 'reciprocal-variable-denominator-inequality'
  | 'standard-rational-inequality'
  | 'distributed-inequality'
  | 'variables-both-sides';

export type InequalitySign = '<' | '<=' | '>' | '>=';

export type ParsedEquation =
  | {
      denominator: number;
      innerConstant: number;
      raw: string;
      right: number;
      shape: 'bracket-fraction';
    }
  | {
      denominator: number;
      innerConstant: number;
      raw: string;
      relation: InequalitySign;
      right: number;
      shape: 'bracket-fraction-inequality';
    }
  | {
      coefficient: number;
      innerConstant: number;
      raw: string;
      right: number;
      shape: 'distributed';
    }
  | {
      coefficient: number;
      innerConstant: number;
      outerConstant: number;
      raw: string;
      right: number;
      shape: 'distributed-with-constant';
    }
  | {
      constant: number;
      denominator: number;
      raw: string;
      right: number;
      shape: 'fraction-with-constant';
    }
  | {
      constant: number;
      denominator: number;
      raw: string;
      relation: InequalitySign;
      right: number;
      shape: 'fraction-inequality-with-constant';
    }
  | {
      leftDenominator: number;
      raw: string;
      right: number;
      rightDenominator: number;
      shape: 'fraction-sum';
    }
  | {
      denominatorInnerConstant: number;
      raw: string;
      relation: InequalitySign;
      right: number;
      shape: 'fraction-variable-denominator-inequality';
    }
  | {
      denominatorInnerConstant: number;
      numeratorInnerConstant: number;
      raw: string;
      relation: '<' | '>';
      shape: 'standard-rational-inequality';
    }
  | {
      innerConstant: number;
      raw: string;
      relation: '<' | '>';
      shape: 'reciprocal-variable-denominator-inequality';
    }
  | {
      firstRight: number;
      raw: string;
      secondRight: number;
      xCoefficient: number;
      shape: 'linear-system-elimination-basic';
    }
  | {
      firstRight: number;
      raw: string;
      secondRight: number;
      shape: 'linear-system-infinite-solutions-basic';
    }
  | {
      firstRight: number;
      raw: string;
      secondRight: number;
      shape: 'linear-system-no-solution-basic';
    }
  | {
      firstRight: number;
      raw: string;
      secondRight: number;
      shape: 'linear-system-substitution-basic';
    }
  | {
      raw: string;
      solvedConstant: number;
      solvedSlope: number;
      targetRight: number;
      shape: 'linear-system-substitution-solved';
    }
  | {
      coefficient: number;
      constant: number;
      raw: string;
      relation: InequalitySign;
      right: number;
      shape: 'linear-inequality';
    }
  | {
      coefficient: number;
      constant: number;
      raw: string;
      right: number;
      shape: 'linear-with-constant';
    }
  | {
      coefficient: number;
      raw: string;
      right: number;
      shape: 'linear';
    }
  | {
      leftCoefficient: number;
      leftInnerConstant: number;
      raw: string;
      right: number;
      rightCoefficient: number;
      rightInnerConstant: number;
      shape: 'multi-distributed';
    }
  | {
      leftFactorInnerConstant: number;
      raw: string;
      rightFactorInnerConstant: number;
      shape: 'quadratic-factored';
    }
  | {
      constant: number;
      discriminant: number;
      linearCoefficient: number;
      quadraticCoefficient: number;
      raw: string;
      shape: 'quadratic-formula-double-root';
    }
  | {
      constant: number;
      discriminant: number;
      linearCoefficient: number;
      quadraticCoefficient: number;
      raw: string;
      shape: 'quadratic-formula-no-real-root';
    }
  | {
      constant: number;
      discriminant: number;
      linearCoefficient: number;
      quadraticCoefficient: number;
      raw: string;
      shape: 'quadratic-formula-two-real-roots';
    }
  | {
      innerConstant: number;
      raw: string;
      right: number;
      shape: 'quadratic-square-root';
    }
  | {
      constant: number;
      linearCoefficient: number;
      raw: string;
      shape: 'quadratic-standard-factorable';
    }
  | {
      coefficient: number;
      innerConstant: number;
      raw: string;
      relation: InequalitySign;
      right: number;
      shape: 'distributed-inequality';
    }
  | {
      constant: number;
      coefficient: number;
      raw: string;
      rightCoefficient: number;
      rightConstant: number;
      shape: 'variables-both-sides';
    };

export type ParseEquationResult =
  | {
      equation: ParsedEquation;
      supported: true;
    }
  | {
      equation: string;
      reason: string;
      supported: false;
    };

const SUPPORTED_SHAPES_MESSAGE =
  'Algebra Step Generator v3 supports a(x+b)=c, a(x+b)+d=c, x/a+b=c, (x+a)/b=c, x/a+x/b=c, ax+b=c, ax+b relation c, a(x+b) relation c, ax=c, ax+b=cx+d, a(x+b)+c(x+d)=e, x^2=c, (x+a)^2=c with positive perfect-square c, x^2+bx+c=0 when it can be factorized over integers, standard ax^2+bx+c=0 for the quadratic-formula pilot, (x+a)(x+b)=0 with integer values, and the substitution pilot forms x+y=a, x-y=b or y=ax+b, x+y=c.';

const SUPPORTED_LINEAR_SYSTEM_SHAPES_MESSAGE =
  'Supported linear system pilot forms are x+y=a, x-y=b, ax+y=c, ax-y=d, y=ax+b, x+y=c, x+y=a with x+y=b, and x+y=a with 2x+2y=2a using integer values.';

const SUPPORTED_INEQUALITY_SHAPES_MESSAGE =
  'Supported inequality forms are ax+b relation c and a(x+b) relation c with integer values.';

const SUPPORTED_FRACTION_SHAPES_MESSAGE =
  'Supported fraction equation forms are x/a+b=c, (x+a)/b=c, and x/a+x/b=c with positive integer denominators.';

const SUPPORTED_FRACTION_INEQUALITY_SHAPES_MESSAGE =
  'Supported fraction inequality forms are x/a+b relation c, (x+a)/b relation c with positive integer denominators, 1/(x+a) relation 0, x/(x+a) relation c, and (x+a)/(x+b) relation 0 with single linear numerator and denominator.';

const normalizeEquation = (equation: string) => {
  return equation.replace(/\s+/g, '');
};

const parseInteger = (value: string) => {
  return Number.parseInt(value, 10);
};

const parseCoefficient = (value: string) => {
  if (value === '' || value === '+') {
    return 1;
  }

  if (value === '-') {
    return -1;
  }

  return parseInteger(value);
};

const isValidCoefficient = (value: number) => {
  return Number.isInteger(value) && value !== 0;
};

const isValidDenominator = (value: number) => {
  return Number.isInteger(value) && value > 0;
};

const isValidInteger = (value: number) => {
  return Number.isInteger(value);
};

const isPositivePerfectSquare = (value: number) => {
  if (!Number.isInteger(value) || value <= 0) {
    return false;
  }

  const squareRoot = Math.sqrt(value);

  return Number.isInteger(squareRoot);
};

const canFactorMonicQuadraticOverIntegers = (linearCoefficient: number, constant: number) => {
  if (constant === 0) {
    return true;
  }

  const limit = Math.abs(constant);

  for (let left = -limit; left <= limit; left += 1) {
    if (left === 0 || constant % left !== 0) {
      continue;
    }

    if (left + constant / left === linearCoefficient) {
      return true;
    }
  }

  return false;
};

const getQuadraticDiscriminant = (quadraticCoefficient: number, linearCoefficient: number, constant: number) => {
  return linearCoefficient * linearCoefficient - 4 * quadraticCoefficient * constant;
};

const parseQuadraticFormulaParts = (raw: string) => {
  const match = raw.match(/^([+-]?\d*)x\^2([+-])(\d*)x([+-])(\d+)=0$/);

  if (!match) {
    return null;
  }

  const [, quadraticValue, linearSign, linearValue, constantSign, constantValue] = match;
  const quadraticCoefficient = parseCoefficient(quadraticValue);
  const linearCoefficient = parseCoefficient(`${linearSign}${linearValue}`);
  const unsignedConstant = parseInteger(constantValue);
  const constant = constantSign === '-' ? -unsignedConstant : unsignedConstant;
  const discriminant = getQuadraticDiscriminant(quadraticCoefficient, linearCoefficient, constant);

  if (
    !isValidCoefficient(quadraticCoefficient) ||
    !isValidInteger(linearCoefficient) ||
    !isValidInteger(constant)
  ) {
    return null;
  }

  return {
    constant,
    discriminant,
    linearCoefficient,
    quadraticCoefficient
  };
};

export const parseEquation = (equation: string): ParseEquationResult => {
  const raw = normalizeEquation(equation);

  if (!raw) {
    return {
      equation,
      reason: 'Equation is empty.',
      supported: false
    };
  }

  if (raw.includes(',')) {
    const noSolutionLinearSystemMatch = raw.match(/^x\+y=([+-]?\d+),x\+y=([+-]?\d+)$/);

    if (noSolutionLinearSystemMatch) {
      const [, firstRightValue, secondRightValue] = noSolutionLinearSystemMatch;
      const firstRight = parseInteger(firstRightValue);
      const secondRight = parseInteger(secondRightValue);

      if (isValidInteger(firstRight) && isValidInteger(secondRight) && firstRight !== secondRight) {
        return {
          equation: {
            firstRight,
            raw,
            secondRight,
            shape: 'linear-system-no-solution-basic'
          },
          supported: true
        };
      }
    }

    const infiniteSolutionsLinearSystemMatch = raw.match(/^x\+y=([+-]?\d+),2x\+2y=([+-]?\d+)$/);

    if (infiniteSolutionsLinearSystemMatch) {
      const [, firstRightValue, secondRightValue] = infiniteSolutionsLinearSystemMatch;
      const firstRight = parseInteger(firstRightValue);
      const secondRight = parseInteger(secondRightValue);

      if (isValidInteger(firstRight) && isValidInteger(secondRight) && secondRight === firstRight * 2) {
        return {
          equation: {
            firstRight,
            raw,
            secondRight,
            shape: 'linear-system-infinite-solutions-basic'
          },
          supported: true
        };
      }
    }

    const basicLinearSystemMatch = raw.match(/^x\+y=([+-]?\d+),x-y=([+-]?\d+)$/);

    if (basicLinearSystemMatch) {
      const [, firstRightValue, secondRightValue] = basicLinearSystemMatch;
      const firstRight = parseInteger(firstRightValue);
      const secondRight = parseInteger(secondRightValue);

      if (isValidInteger(firstRight) && isValidInteger(secondRight)) {
        return {
          equation: {
            firstRight,
            raw,
            secondRight,
            shape: 'linear-system-substitution-basic'
          },
          supported: true
        };
      }
    }

    const eliminationLinearSystemMatch = raw.match(/^([+-]?\d*)x\+y=([+-]?\d+),([+-]?\d*)x-y=([+-]?\d+)$/);

    if (eliminationLinearSystemMatch) {
      const [, firstCoefficientValue, firstRightValue, secondCoefficientValue, secondRightValue] =
        eliminationLinearSystemMatch;
      const firstCoefficient = parseCoefficient(firstCoefficientValue);
      const secondCoefficient = parseCoefficient(secondCoefficientValue);
      const firstRight = parseInteger(firstRightValue);
      const secondRight = parseInteger(secondRightValue);

      if (
        isValidCoefficient(firstCoefficient) &&
        firstCoefficient === secondCoefficient &&
        isValidInteger(firstRight) &&
        isValidInteger(secondRight)
      ) {
        return {
          equation: {
            firstRight,
            raw,
            secondRight,
            xCoefficient: firstCoefficient,
            shape: 'linear-system-elimination-basic'
          },
          supported: true
        };
      }
    }

    const solvedLinearSystemMatch = raw.match(/^y=([+-]?\d*)x([+-])(\d+),x\+y=([+-]?\d+)$/);

    if (solvedLinearSystemMatch) {
      const [, slopeValue, constantSign, constantValue, targetRightValue] = solvedLinearSystemMatch;
      const solvedSlope = parseCoefficient(slopeValue);
      const unsignedSolvedConstant = parseInteger(constantValue);
      const solvedConstant = constantSign === '-' ? -unsignedSolvedConstant : unsignedSolvedConstant;
      const targetRight = parseInteger(targetRightValue);

      if (isValidCoefficient(solvedSlope) && isValidInteger(solvedConstant) && isValidInteger(targetRight)) {
        return {
          equation: {
            raw,
            solvedConstant,
            solvedSlope,
            targetRight,
            shape: 'linear-system-substitution-solved'
          },
          supported: true
        };
      }
    }

    return {
      equation,
      reason: SUPPORTED_LINEAR_SYSTEM_SHAPES_MESSAGE,
      supported: false
    };
  }

  const linearInequalityMatch = raw.match(/^([+-]?\d*)x([+-])(\d+)(<=|>=|<|>)([+-]?\d+)$/);

  if (linearInequalityMatch) {
    const [, coefficientValue, sign, constantValue, relation, rightValue] = linearInequalityMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const unsignedConstant = parseInteger(constantValue);
    const constant = sign === '-' ? -unsignedConstant : unsignedConstant;
    const right = parseInteger(rightValue);

    if (isValidCoefficient(coefficient) && isValidInteger(constant) && isValidInteger(right)) {
      return {
        equation: {
          coefficient,
          constant,
          raw,
          relation: relation as InequalitySign,
          right,
          shape: 'linear-inequality'
        },
        supported: true
      };
    }
  }

  const distributedInequalityMatch = raw.match(/^([+-]?\d*)\(x([+-])(\d+)\)(<=|>=|<|>)([+-]?\d+)$/);

  if (distributedInequalityMatch) {
    const [, coefficientValue, sign, innerValue, relation, rightValue] = distributedInequalityMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (isValidCoefficient(coefficient) && isValidInteger(innerConstant) && isValidInteger(right)) {
      return {
        equation: {
          coefficient,
          innerConstant,
          raw,
          relation: relation as InequalitySign,
          right,
          shape: 'distributed-inequality'
        },
        supported: true
      };
    }
  }

  const fractionWithConstantInequalityMatch = raw.match(/^x\/(\d+)([+-])(\d+)(<=|>=|<|>)([+-]?\d+)$/);

  if (fractionWithConstantInequalityMatch) {
    const [, denominatorValue, sign, constantValue, relation, rightValue] = fractionWithConstantInequalityMatch;
    const denominator = parseInteger(denominatorValue);
    const unsignedConstant = parseInteger(constantValue);
    const constant = sign === '-' ? -unsignedConstant : unsignedConstant;
    const right = parseInteger(rightValue);

    if (isValidDenominator(denominator) && isValidInteger(constant) && isValidInteger(right)) {
      return {
        equation: {
          constant,
          denominator,
          raw,
          relation: relation as InequalitySign,
          right,
          shape: 'fraction-inequality-with-constant'
        },
        supported: true
      };
    }
  }

  const bracketFractionInequalityMatch = raw.match(/^\(x([+-])(\d+)\)\/(\d+)(<=|>=|<|>)([+-]?\d+)$/);

  if (bracketFractionInequalityMatch) {
    const [, sign, innerValue, denominatorValue, relation, rightValue] = bracketFractionInequalityMatch;
    const denominator = parseInteger(denominatorValue);
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (isValidDenominator(denominator) && isValidInteger(innerConstant) && isValidInteger(right)) {
      return {
        equation: {
          denominator,
          innerConstant,
          raw,
          relation: relation as InequalitySign,
          right,
          shape: 'bracket-fraction-inequality'
        },
        supported: true
      };
    }
  }

  const reciprocalVariableDenominatorInequalityMatch = raw.match(/^1\/\(x([+-])(\d+)\)(<|>)0$/);

  if (reciprocalVariableDenominatorInequalityMatch) {
    const [, sign, innerValue, relation] = reciprocalVariableDenominatorInequalityMatch;
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;

    if (isValidInteger(innerConstant)) {
      return {
        equation: {
          innerConstant,
          raw,
          relation: relation as '<' | '>',
          shape: 'reciprocal-variable-denominator-inequality'
        },
        supported: true
      };
    }
  }

  const fractionVariableDenominatorInequalityMatch = raw.match(/^x\/\(x([+-])(\d+)\)(<=|>=|<|>)([+-]?\d+)$/);

  if (fractionVariableDenominatorInequalityMatch) {
    const [, sign, innerValue, relation, rightValue] = fractionVariableDenominatorInequalityMatch;
    const unsignedInnerConstant = parseInteger(innerValue);
    const denominatorInnerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (isValidInteger(denominatorInnerConstant) && isValidInteger(right)) {
      return {
        equation: {
          denominatorInnerConstant,
          raw,
          relation: relation as InequalitySign,
          right,
          shape: 'fraction-variable-denominator-inequality'
        },
        supported: true
      };
    }
  }

  const standardRationalInequalityMatch = raw.match(/^\(x([+-])(\d+)\)\/\(x([+-])(\d+)\)(<|>)0$/);

  if (standardRationalInequalityMatch) {
    const [, numeratorSign, numeratorValue, denominatorSign, denominatorValue, relation] =
      standardRationalInequalityMatch;
    const unsignedNumeratorInnerConstant = parseInteger(numeratorValue);
    const unsignedDenominatorInnerConstant = parseInteger(denominatorValue);
    const numeratorInnerConstant =
      numeratorSign === '-' ? -unsignedNumeratorInnerConstant : unsignedNumeratorInnerConstant;
    const denominatorInnerConstant =
      denominatorSign === '-' ? -unsignedDenominatorInnerConstant : unsignedDenominatorInnerConstant;

    if (isValidInteger(numeratorInnerConstant) && isValidInteger(denominatorInnerConstant)) {
      return {
        equation: {
          denominatorInnerConstant,
          numeratorInnerConstant,
          raw,
          relation: relation as '<' | '>',
          shape: 'standard-rational-inequality'
        },
        supported: true
      };
    }
  }

  if (raw.includes('/') && /(<=|>=|<|>)/.test(raw)) {
    return {
      equation,
      reason: SUPPORTED_FRACTION_INEQUALITY_SHAPES_MESSAGE,
      supported: false
    };
  }

  if (/(<=|>=|<|>)/.test(raw)) {
    return {
      equation,
      reason: SUPPORTED_INEQUALITY_SHAPES_MESSAGE,
      supported: false
    };
  }

  if ((raw.match(/=/g) ?? []).length !== 1) {
    return {
      equation,
      reason: 'Equation must contain exactly one equals sign.',
      supported: false
    };
  }

  const shiftedQuadraticSquareRootMatch = raw.match(/^\(x([+-])(\d+)\)\^2=([+-]?\d+)$/);

  if (shiftedQuadraticSquareRootMatch) {
    const [, sign, innerValue, rightValue] = shiftedQuadraticSquareRootMatch;
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (isValidInteger(innerConstant) && isPositivePerfectSquare(right)) {
      return {
        equation: {
          innerConstant,
          raw,
          right,
          shape: 'quadratic-square-root'
        },
        supported: true
      };
    }
  }

  const simpleQuadraticSquareRootMatch = raw.match(/^x\^2=([+-]?\d+)$/);

  if (simpleQuadraticSquareRootMatch) {
    const [, rightValue] = simpleQuadraticSquareRootMatch;
    const right = parseInteger(rightValue);

    if (isPositivePerfectSquare(right)) {
      return {
        equation: {
          innerConstant: 0,
          raw,
          right,
          shape: 'quadratic-square-root'
        },
        supported: true
      };
    }
  }

  const quadraticFactoredMatch = raw.match(/^\(x([+-])(\d+)\)\(x([+-])(\d+)\)=0$/);

  if (quadraticFactoredMatch) {
    const [, leftSign, leftValue, rightSign, rightValue] = quadraticFactoredMatch;
    const leftUnsignedInnerConstant = parseInteger(leftValue);
    const rightUnsignedInnerConstant = parseInteger(rightValue);
    const leftFactorInnerConstant = leftSign === '-' ? -leftUnsignedInnerConstant : leftUnsignedInnerConstant;
    const rightFactorInnerConstant = rightSign === '-' ? -rightUnsignedInnerConstant : rightUnsignedInnerConstant;

    if (isValidInteger(leftFactorInnerConstant) && isValidInteger(rightFactorInnerConstant)) {
      return {
        equation: {
          leftFactorInnerConstant,
          raw,
          rightFactorInnerConstant,
          shape: 'quadratic-factored'
        },
        supported: true
      };
    }
  }

  const quadraticFormulaParts = parseQuadraticFormulaParts(raw);

  if (quadraticFormulaParts && quadraticFormulaParts.discriminant <= 0) {
    return {
      equation: {
        ...quadraticFormulaParts,
        raw,
        shape:
          quadraticFormulaParts.discriminant === 0
            ? 'quadratic-formula-double-root'
            : 'quadratic-formula-no-real-root'
      },
      supported: true
    };
  }

  const quadraticStandardWithLinearMatch = raw.match(/^x\^2([+-])(\d*)x([+-])(\d+)=0$/);

  if (quadraticStandardWithLinearMatch) {
    const [, linearSign, linearValue, constantSign, constantValue] = quadraticStandardWithLinearMatch;
    const linearMagnitude = parseCoefficient(`${linearSign}${linearValue}`);
    const unsignedConstant = parseInteger(constantValue);
    const constant = constantSign === '-' ? -unsignedConstant : unsignedConstant;

    if (
      isValidCoefficient(linearMagnitude) &&
      isValidInteger(constant) &&
      canFactorMonicQuadraticOverIntegers(linearMagnitude, constant)
    ) {
      return {
        equation: {
          constant,
          linearCoefficient: linearMagnitude,
          raw,
          shape: 'quadratic-standard-factorable'
        },
        supported: true
      };
    }
  }

  const quadraticStandardWithoutLinearMatch = raw.match(/^x\^2([+-])(\d+)=0$/);

  if (quadraticStandardWithoutLinearMatch) {
    const [, constantSign, constantValue] = quadraticStandardWithoutLinearMatch;
    const unsignedConstant = parseInteger(constantValue);
    const constant = constantSign === '-' ? -unsignedConstant : unsignedConstant;

    if (isValidInteger(constant) && canFactorMonicQuadraticOverIntegers(0, constant)) {
      return {
        equation: {
          constant,
          linearCoefficient: 0,
          raw,
          shape: 'quadratic-standard-factorable'
        },
        supported: true
      };
    }
  }

  if (quadraticFormulaParts && quadraticFormulaParts.discriminant > 0) {
    return {
      equation: {
        ...quadraticFormulaParts,
        raw,
        shape: 'quadratic-formula-two-real-roots'
      },
      supported: true
    };
  }

  const distributedMatch = raw.match(/^([+-]?\d*)\(x([+-])(\d+)\)=([+-]?\d+)$/);

  if (distributedMatch) {
    const [, coefficientValue, sign, innerValue, rightValue] = distributedMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (isValidCoefficient(coefficient) && isValidInteger(innerConstant) && isValidInteger(right)) {
      return {
        equation: {
          coefficient,
          innerConstant,
          raw,
          right,
          shape: 'distributed'
        },
        supported: true
      };
    }
  }

  const multiDistributedMatch = raw.match(
    /^([+-]?\d*)\(x([+-])(\d+)\)([+-])(\d*)\(x([+-])(\d+)\)=([+-]?\d+)$/
  );

  if (multiDistributedMatch) {
    const [
      ,
      leftCoefficientValue,
      leftInnerSign,
      leftInnerValue,
      rightCoefficientSign,
      rightCoefficientValue,
      rightInnerSign,
      rightInnerValue,
      rightValue
    ] = multiDistributedMatch;
    const leftCoefficient = parseCoefficient(leftCoefficientValue);
    const leftUnsignedInnerConstant = parseInteger(leftInnerValue);
    const leftInnerConstant = leftInnerSign === '-' ? -leftUnsignedInnerConstant : leftUnsignedInnerConstant;
    const rightCoefficient = parseCoefficient(`${rightCoefficientSign}${rightCoefficientValue}`);
    const rightUnsignedInnerConstant = parseInteger(rightInnerValue);
    const rightInnerConstant = rightInnerSign === '-' ? -rightUnsignedInnerConstant : rightUnsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (
      isValidCoefficient(leftCoefficient) &&
      isValidInteger(leftInnerConstant) &&
      isValidCoefficient(rightCoefficient) &&
      isValidInteger(rightInnerConstant) &&
      isValidInteger(right)
    ) {
      return {
        equation: {
          leftCoefficient,
          leftInnerConstant,
          raw,
          right,
          rightCoefficient,
          rightInnerConstant,
          shape: 'multi-distributed'
        },
        supported: true
      };
    }
  }

  const distributedWithConstantMatch = raw.match(/^([+-]?\d*)\(x([+-])(\d+)\)([+-])(\d+)=([+-]?\d+)$/);

  if (distributedWithConstantMatch) {
    const [, coefficientValue, innerSign, innerValue, outerSign, outerValue, rightValue] =
      distributedWithConstantMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = innerSign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const unsignedOuterConstant = parseInteger(outerValue);
    const outerConstant = outerSign === '-' ? -unsignedOuterConstant : unsignedOuterConstant;
    const right = parseInteger(rightValue);

    if (
      isValidCoefficient(coefficient) &&
      isValidInteger(innerConstant) &&
      isValidInteger(outerConstant) &&
      isValidInteger(right)
    ) {
      return {
        equation: {
          coefficient,
          innerConstant,
          outerConstant,
          raw,
          right,
          shape: 'distributed-with-constant'
        },
        supported: true
      };
    }
  }

  const fractionWithConstantMatch = raw.match(/^x\/(\d+)([+-])(\d+)=([+-]?\d+)$/);

  if (fractionWithConstantMatch) {
    const [, denominatorValue, sign, constantValue, rightValue] = fractionWithConstantMatch;
    const denominator = parseInteger(denominatorValue);
    const unsignedConstant = parseInteger(constantValue);
    const constant = sign === '-' ? -unsignedConstant : unsignedConstant;
    const right = parseInteger(rightValue);

    if (isValidDenominator(denominator) && isValidInteger(constant) && isValidInteger(right)) {
      return {
        equation: {
          constant,
          denominator,
          raw,
          right,
          shape: 'fraction-with-constant'
        },
        supported: true
      };
    }
  }

  const bracketFractionMatch = raw.match(/^\(x([+-])(\d+)\)\/(\d+)=([+-]?\d+)$/);

  if (bracketFractionMatch) {
    const [, sign, innerValue, denominatorValue, rightValue] = bracketFractionMatch;
    const denominator = parseInteger(denominatorValue);
    const unsignedInnerConstant = parseInteger(innerValue);
    const innerConstant = sign === '-' ? -unsignedInnerConstant : unsignedInnerConstant;
    const right = parseInteger(rightValue);

    if (isValidDenominator(denominator) && isValidInteger(innerConstant) && isValidInteger(right)) {
      return {
        equation: {
          denominator,
          innerConstant,
          raw,
          right,
          shape: 'bracket-fraction'
        },
        supported: true
      };
    }
  }

  const fractionSumMatch = raw.match(/^x\/(\d+)\+x\/(\d+)=([+-]?\d+)$/);

  if (fractionSumMatch) {
    const [, leftDenominatorValue, rightDenominatorValue, rightValue] = fractionSumMatch;
    const leftDenominator = parseInteger(leftDenominatorValue);
    const rightDenominator = parseInteger(rightDenominatorValue);
    const right = parseInteger(rightValue);

    if (isValidDenominator(leftDenominator) && isValidDenominator(rightDenominator) && isValidInteger(right)) {
      return {
        equation: {
          leftDenominator,
          raw,
          right,
          rightDenominator,
          shape: 'fraction-sum'
        },
        supported: true
      };
    }
  }

  if (raw.includes('/') && raw.includes('=')) {
    return {
      equation,
      reason: SUPPORTED_FRACTION_SHAPES_MESSAGE,
      supported: false
    };
  }

  const linearWithConstantMatch = raw.match(/^([+-]?\d*)x([+-])(\d+)=([+-]?\d+)$/);

  if (linearWithConstantMatch) {
    const [, coefficientValue, sign, constantValue, rightValue] = linearWithConstantMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const unsignedConstant = parseInteger(constantValue);
    const constant = sign === '-' ? -unsignedConstant : unsignedConstant;
    const right = parseInteger(rightValue);

    if (isValidCoefficient(coefficient) && isValidInteger(constant) && isValidInteger(right)) {
      return {
        equation: {
          coefficient,
          constant,
          raw,
          right,
          shape: 'linear-with-constant'
        },
        supported: true
      };
    }
  }

  const variablesBothSidesMatch = raw.match(/^([+-]?\d*)x([+-])(\d+)=([+-]?\d*)x([+-])(\d+)$/);

  if (variablesBothSidesMatch) {
    const [, coefficientValue, sign, constantValue, rightCoefficientValue, rightSign, rightConstantValue] =
      variablesBothSidesMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const unsignedConstant = parseInteger(constantValue);
    const constant = sign === '-' ? -unsignedConstant : unsignedConstant;
    const rightCoefficient = parseCoefficient(rightCoefficientValue);
    const unsignedRightConstant = parseInteger(rightConstantValue);
    const rightConstant = rightSign === '-' ? -unsignedRightConstant : unsignedRightConstant;

    if (
      isValidCoefficient(coefficient) &&
      isValidInteger(constant) &&
      isValidCoefficient(rightCoefficient) &&
      isValidInteger(rightConstant) &&
      coefficient !== rightCoefficient
    ) {
      return {
        equation: {
          coefficient,
          constant,
          raw,
          rightCoefficient,
          rightConstant,
          shape: 'variables-both-sides'
        },
        supported: true
      };
    }
  }

  const linearMatch = raw.match(/^([+-]?\d*)x=([+-]?\d+)$/);

  if (linearMatch) {
    const [, coefficientValue, rightValue] = linearMatch;
    const coefficient = parseCoefficient(coefficientValue);
    const right = parseInteger(rightValue);

    if (isValidCoefficient(coefficient) && isValidInteger(right)) {
      return {
        equation: {
          coefficient,
          raw,
          right,
          shape: 'linear'
        },
        supported: true
      };
    }
  }

  return {
    equation,
    reason: SUPPORTED_SHAPES_MESSAGE,
    supported: false
  };
};

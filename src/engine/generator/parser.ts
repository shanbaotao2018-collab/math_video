export type SupportedEquationShape = 'distributed' | 'linear-with-constant' | 'linear';

export type ParsedEquation =
  | {
      coefficient: number;
      innerConstant: number;
      raw: string;
      right: number;
      shape: 'distributed';
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
  'Algebra Step Generator v1 only supports a(x+b)=c, a(x-b)=c, ax+b=c, ax-b=c, and ax=c with integer values.';

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

const isValidInteger = (value: number) => {
  return Number.isInteger(value);
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

  if ((raw.match(/=/g) ?? []).length !== 1) {
    return {
      equation,
      reason: 'Equation must contain exactly one equals sign.',
      supported: false
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

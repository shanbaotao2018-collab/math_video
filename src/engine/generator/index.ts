import type {AlgebraProblem, AlgebraStep, FormulaToken} from '../../types/algebra';
import {normalizeProblemVisualActions} from '../../utils/visualActions';
import {parseEquation} from './parser';
import {
  divideCoefficient,
  expandBrackets,
  formatCoefficientTerm,
  formatLinearLatex,
  formatSignedConstant,
  moveTerm,
  type LinearEquationState
} from './transforms';

export type AlgebraStepGeneratorResult =
  | {
      problem: AlgebraProblem;
      supported: true;
    }
  | {
      equation: string;
      reason: string;
      supported: false;
    };

const createToken = (stepId: string, suffix: string, text: string, role?: string): FormulaToken => {
  return {
    id: `${stepId}-${suffix}`,
    text,
    ...(role ? {role} : {})
  };
};

const createStep = (
  index: number,
  latex: string,
  kind: AlgebraStep['kind'],
  note?: string,
  tokenMap?: FormulaToken[]
): AlgebraStep => {
  const id = `s${index}`;

  return {
    expression: latex,
    id,
    kind,
    latex,
    ...(note ? {note} : {}),
    ...(tokenMap && tokenMap.length > 0 ? {tokenMap} : {})
  };
};

const createDistributedTokenMap = (stepId: string, coefficient: number, innerConstant: number, right: number) => {
  return [
    createToken(stepId, 'distributor', String(coefficient), 'distributor'),
    createToken(stepId, 'variable', 'x', 'left_term'),
    createToken(stepId, 'inner-constant', formatSignedConstant(innerConstant), 'right_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createLinearTokenMap = (
  stepId: string,
  coefficient: number,
  constant: number,
  right: number,
  constantRole: string
) => {
  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(coefficient), 'expanded_left_term left_term'),
    createToken(stepId, 'constant-term', formatSignedConstant(constant), constantRole),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createMovedTokenMap = (stepId: string, coefficient: number, originalRight: number, movedConstant: number) => {
  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(coefficient), 'left_term'),
    createToken(stepId, 'right-value', String(originalRight), 'right_value'),
    createToken(
      stepId,
      'result-term',
      movedConstant > 0 ? `-${movedConstant}` : `+${Math.abs(movedConstant)}`,
      'result_term'
    )
  ];
};

const createAxEqualsValueTokenMap = (stepId: string, coefficient: number, right: number) => {
  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(coefficient), 'left_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createAnswerTokenMap = (stepId: string, answer: string) => {
  return [createToken(stepId, 'answer', answer, 'answer_term')];
};

const getMoveNote = (constant: number) => {
  return constant > 0 ? `两边同时减去 ${constant}` : `两边同时加上 ${Math.abs(constant)}`;
};

const getDivideNote = (coefficient: number) => {
  if (coefficient === 1) {
    return '得到答案';
  }

  return `两边同时除以 ${coefficient}`;
};

const buildStepsFromLinearState = (initialLatex: string, linearState: LinearEquationState, startIndex: number) => {
  const steps: AlgebraStep[] = [];
  let index = startIndex;

  if (linearState.constant !== 0) {
    const movedState = moveTerm(linearState);

    steps.push(
      createStep(
        index,
        movedState.latex,
        'move',
        getMoveNote(linearState.constant),
        createMovedTokenMap(`s${index}`, linearState.coefficient, linearState.right, linearState.constant)
      )
    );
    index += 1;
    steps.push(
      createStep(
        index,
        movedState.simplifiedLatex,
        'transform',
        '计算右边',
        createAxEqualsValueTokenMap(`s${index}`, movedState.coefficient, movedState.right)
      )
    );
    index += 1;

    const answerState = divideCoefficient(movedState);

    steps.push(
      createStep(index, answerState.latex, 'answer', getDivideNote(movedState.coefficient), createAnswerTokenMap(`s${index}`, answerState.answer))
    );

    return {
      answer: answerState.answer,
      steps
    };
  }

  const answerState = divideCoefficient({
    coefficient: linearState.coefficient,
    right: linearState.right
  });

  if (initialLatex !== answerState.latex) {
    steps.push(
      createStep(index, answerState.latex, 'answer', getDivideNote(linearState.coefficient), createAnswerTokenMap(`s${index}`, answerState.answer))
    );
  }

  return {
    answer: answerState.answer,
    steps
  };
};

export const generateAlgebraSteps = (equation: string): AlgebraStepGeneratorResult => {
  const parsed = parseEquation(equation);

  if (parsed.supported === false) {
    return {
      equation: parsed.equation,
      reason: parsed.reason,
      supported: false
    };
  }

  const steps: AlgebraStep[] = [];

  if (parsed.equation.shape === 'distributed') {
    steps.push(
      createStep(
        1,
        parsed.equation.raw,
        'write',
        undefined,
        createDistributedTokenMap('s1', parsed.equation.coefficient, parsed.equation.innerConstant, parsed.equation.right)
      )
    );

    const expandedState = expandBrackets(parsed.equation);

    steps.push(
      createStep(
        2,
        expandedState.latex,
        'expand',
        '展开括号',
        createLinearTokenMap('s2', expandedState.coefficient, expandedState.constant, expandedState.right, 'expanded_right_term moving_term')
      )
    );

    const linearResult = buildStepsFromLinearState(expandedState.latex, expandedState, 3);

    return {
      problem: normalizeProblemVisualActions({
        answer: linearResult.answer,
        equation: parsed.equation.raw,
        steps: [...steps, ...linearResult.steps]
      }),
      supported: true
    };
  }

  const linearState: LinearEquationState = {
    coefficient: parsed.equation.coefficient,
    constant: parsed.equation.shape === 'linear-with-constant' ? parsed.equation.constant : 0,
    latex:
      parsed.equation.shape === 'linear-with-constant'
        ? `${formatLinearLatex(parsed.equation.coefficient, parsed.equation.constant)}=${parsed.equation.right}`
        : parsed.equation.raw,
    right: parsed.equation.right
  };
  steps.push(
    createStep(
      1,
      parsed.equation.raw,
      'write',
      undefined,
      linearState.constant !== 0
        ? createLinearTokenMap('s1', linearState.coefficient, linearState.constant, linearState.right, 'moving_term')
        : createAxEqualsValueTokenMap('s1', linearState.coefficient, linearState.right)
    )
  );
  const linearResult = buildStepsFromLinearState(linearState.latex, linearState, 2);

  return {
    problem: normalizeProblemVisualActions({
      answer: linearResult.answer,
      equation: parsed.equation.raw,
      steps: [...steps, ...linearResult.steps]
    }),
    supported: true
  };
};

export {parseEquation} from './parser';
export {divideCoefficient, expandBrackets, moveTerm} from './transforms';

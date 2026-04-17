import {
  toAlgebraProblemV1FromV2Draft,
  toAlgebraProblemV2Draft,
  type AlgebraOperationV2,
  type AlgebraProblem,
  type AlgebraProblemV2,
  type AlgebraStep,
  type AlgebraStepV2,
  type FormulaToken
} from '../../types/algebra';
import {normalizeProblemVisualActions} from '../../utils/visualActions';
import {parseEquation, type InequalitySign, type ParsedEquation} from './parser';
import {
  combineExpandedConstants,
  createFractionEquationState,
  createFractionInequalityState,
  clearFractionInequalityByDenominator,
  divideCoefficient,
  expandBrackets,
  expandBracketsWithOuterConstant,
  formatCoefficientTerm,
  formatFractionLatex,
  formatLinearLatex,
  formatRational,
  formatRelationLatex,
  formatSignedConstant,
  flipInequalityRelation,
  getLeastCommonMultiple,
  moveFractionConstant,
  moveFractionInequalityConstant,
  moveTerm,
  moveVariableTerms,
  multiplyDenominator,
  type ExpandedWithOuterConstantState,
  type FractionEquationState,
  type FractionInequalityState,
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

export type AlgebraStepGeneratorV2DraftResult =
  | {
      legacyProblem: AlgebraProblem;
      native: boolean;
      problem: AlgebraProblemV2;
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

const createStepV2 = ({
  index,
  latex,
  legacyKind,
  note,
  operation,
  sourceLatex,
  tokenMap
}: {
  index: number;
  latex: string;
  legacyKind: AlgebraStep['kind'];
  note?: string;
  operation: AlgebraOperationV2;
  sourceLatex?: string;
  tokenMap?: FormulaToken[];
}): AlgebraStepV2 => {
  return {
    id: `s${index}`,
    latex,
    legacyKind,
    ...(note ? {note} : {}),
    operation,
    ...(sourceLatex ? {sourceLatex} : {}),
    targetLatex: latex,
    ...(tokenMap && tokenMap.length > 0 ? {tokenMap} : {})
  };
};

const createProblemV2Draft = (equation: string, answer: string, steps: AlgebraStepV2[]): AlgebraProblemV2 => {
  return {
    answer,
    equation,
    schemaVersion: 'algebra-dsl-v2-draft',
    steps: steps.map((step, index) => ({
      ...step,
      ...(step.sourceLatex || index === 0 ? {} : {sourceLatex: steps[index - 1].latex})
    }))
  };
};

const formatSignedCoefficientTerm = (coefficient: number) => {
  return coefficient > 0 ? `+${formatCoefficientTerm(coefficient)}` : formatCoefficientTerm(coefficient);
};

const formatInequalityLatex = (leftLatex: string, relation: InequalitySign, right: number) => {
  return `${leftLatex}${formatRelationLatex(relation)}${right}`;
};

const createDistributedTokenMap = (stepId: string, coefficient: number, innerConstant: number, right: number) => {
  return [
    createToken(stepId, 'distributor', String(coefficient), 'distributor'),
    createToken(stepId, 'variable', 'x', 'left_term'),
    createToken(stepId, 'inner-constant', formatSignedConstant(innerConstant), 'right_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createDistributedWithOuterTokenMap = (
  stepId: string,
  coefficient: number,
  innerConstant: number,
  outerConstant: number,
  right: number
) => {
  return [
    createToken(stepId, 'distributor', String(coefficient), 'distributor'),
    createToken(stepId, 'variable', 'x', 'left_term'),
    createToken(stepId, 'inner-constant', formatSignedConstant(innerConstant), 'right_term'),
    createToken(stepId, 'outer-constant', formatSignedConstant(outerConstant), 'moving_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createExpandedWithOuterTokenMap = (stepId: string, state: ExpandedWithOuterConstantState) => {
  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(state.coefficient), 'expanded_left_term left_term'),
    createToken(stepId, 'expanded-constant', formatSignedConstant(state.expandedConstant), 'expanded_right_term'),
    createToken(stepId, 'outer-constant', formatSignedConstant(state.outerConstant), 'moving_term'),
    createToken(stepId, 'right-value', String(state.right), 'right_value')
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

const createFractionTokenMap = (stepId: string, state: FractionEquationState) => {
  return [
    createToken(stepId, 'left-term', formatFractionLatex(state.denominator), 'left_term'),
    createToken(stepId, 'constant-term', formatSignedConstant(state.constant), 'moving_term'),
    createToken(stepId, 'right-value', String(state.right), 'right_value')
  ];
};

const createFractionEqualsTokenMap = (stepId: string, denominator: number, right: number) => {
  return [
    createToken(stepId, 'left-term', formatFractionLatex(denominator), 'left_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createMovedFractionTokenMap = (stepId: string, denominator: number, originalRight: number, movedConstant: number) => {
  return [
    createToken(stepId, 'left-term', formatFractionLatex(denominator), 'left_term'),
    createToken(stepId, 'right-value', String(originalRight), 'right_value'),
    createToken(
      stepId,
      'result-term',
      movedConstant > 0 ? `-${movedConstant}` : `+${Math.abs(movedConstant)}`,
      'result_term'
    )
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

const createXEqualsValueTokenMap = (stepId: string, value: string) => {
  return [createToken(stepId, 'answer', `x=${value}`, 'answer_term')];
};

const createInequalityAnswerTokenMap = (stepId: string, answer: string) => {
  return [createToken(stepId, 'answer', answer, 'answer_term')];
};

const createQuadraticFactoredTokenMap = (stepId: string, leftFactorLatex: string, rightFactorLatex: string) => {
  return [
    createToken(stepId, 'left-factor', leftFactorLatex, 'left_term'),
    createToken(stepId, 'right-factor', rightFactorLatex, 'right_term'),
    createToken(stepId, 'right-value', '0', 'right_value')
  ];
};

const createQuadraticSquareRootTokenMap = (stepId: string, squaredBaseLatex: string, rightValue: number) => {
  return [
    createToken(stepId, 'left-term', squaredBaseLatex, 'left_term'),
    createToken(stepId, 'right-value', String(rightValue), 'right_value')
  ];
};

const createDomainRestrictionTokenMap = (stepId: string, restrictionLatex: string) => {
  return [createToken(stepId, 'restriction', restrictionLatex, 'answer_term')];
};

const createBracketFractionTokenMap = (stepId: string, innerConstant: number, denominator: number, right: number) => {
  return [
    createToken(stepId, 'left-term', `\\frac{x${formatSignedConstant(innerConstant)}}{${denominator}}`, 'left_term'),
    createToken(stepId, 'denominator', String(denominator), 'right_value'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createClearedBracketFractionTokenMap = (
  stepId: string,
  innerConstant: number,
  denominator: number,
  right: number
) => {
  return [
    createToken(stepId, 'left-term', `x${formatSignedConstant(innerConstant)}`, 'left_term'),
    createToken(stepId, 'right-value', String(right), 'right_value'),
    createToken(stepId, 'multiplier', `\\cdot ${denominator}`, 'result_term')
  ];
};

const createFractionSumTokenMap = (stepId: string, leftDenominator: number, rightDenominator: number, right: number) => {
  return [
    createToken(stepId, 'left-fraction', formatFractionLatex(leftDenominator), 'left_term'),
    createToken(stepId, 'right-fraction', `+${formatFractionLatex(rightDenominator)}`, 'right_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createTwoVariableTermTokenMap = (stepId: string, leftCoefficient: number, rightCoefficient: number, right: number) => {
  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(leftCoefficient), 'left_term'),
    createToken(stepId, 'right-term', formatSignedCoefficientTerm(rightCoefficient), 'right_term'),
    createToken(stepId, 'right-value', String(right), 'right_value')
  ];
};

const createVariablesBothSidesTokenMap = (
  stepId: string,
  coefficient: number,
  constant: number,
  rightCoefficient: number,
  rightConstant: number
) => {
  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(coefficient), 'left_term'),
    createToken(stepId, 'constant-term', formatSignedConstant(constant), 'moving_term'),
    createToken(stepId, 'right-variable-term', formatCoefficientTerm(rightCoefficient), 'moving_term'),
    createToken(stepId, 'right-constant', formatSignedConstant(rightConstant), 'right_value')
  ];
};

const createMovedVariablesTokenMap = (
  stepId: string,
  coefficient: number,
  movedCoefficient: number,
  rightConstant: number,
  movedConstant: number
) => {
  const movedVariableText =
    movedCoefficient > 0 ? `-${formatCoefficientTerm(movedCoefficient)}` : `+${formatCoefficientTerm(Math.abs(movedCoefficient))}`;

  return [
    createToken(stepId, 'left-term', formatCoefficientTerm(coefficient), 'left_term'),
    createToken(stepId, 'moved-variable-term', movedVariableText, 'result_term'),
    createToken(stepId, 'right-value', String(rightConstant), 'right_value'),
    createToken(
      stepId,
      'moved-constant',
      movedConstant > 0 ? `-${movedConstant}` : `+${Math.abs(movedConstant)}`,
      'result_term'
    )
  ];
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

const getMultiplyDenominatorNote = (denominator: number) => {
  return `分母只有 ${denominator}，最小公倍数就是 ${denominator}，两边同时乘以 ${denominator} 去分母`;
};

const formatDenominatorList = (denominators: number[]) => {
  if (denominators.length <= 1) {
    return String(denominators[0] ?? '');
  }

  if (denominators.length === 2) {
    return `${denominators[0]} 和 ${denominators[1]}`;
  }

  return `${denominators.slice(0, -1).join('、')} 和 ${denominators[denominators.length - 1]}`;
};

const getLeastCommonMultipleNote = (denominators: number[], multiplier: number) => {
  return `分母有 ${formatDenominatorList(denominators)}，最小公倍数是 ${multiplier}，两边同时乘以 ${multiplier} 去分母`;
};

const getFractionDivideNote = (coefficient: number) => {
  if (coefficient === 1) {
    return '得到答案';
  }

  return `去分母后把 x 的系数化成 1，两边同时除以 ${coefficient}`;
};

const getFractionInequalityClearNote = (denominators: number[], multiplier: number) => {
  const baseNote =
    denominators.length === 1
      ? getMultiplyDenominatorNote(multiplier)
      : getLeastCommonMultipleNote(denominators, multiplier);

  return `${baseNote}，分母是正数，不等号方向不变`;
};

const getFinalAnswerNote = () => {
  return '得到答案';
};

const getRewriteSystemEquationNote = (sourceEquationLatex: string, rewrittenLatex: string) => {
  return `先把 ${sourceEquationLatex} 改写成 ${rewrittenLatex}，把一个变量单独写出来；这样代入另一条方程后，就能先只解一个变量`;
};

const getDirectRewriteSystemEquationNote = (rewrittenLatex: string) => {
  return `${rewrittenLatex} 已经把一个变量单独写出来了，所以可以直接拿去代入另一条方程`;
};

const getSubstituteExpressionNote = (rewrittenLatex: string, targetEquationLatex: string) => {
  return `把 ${rewrittenLatex} 代入 ${targetEquationLatex}，用一个变量的式子替换原来的字母，这样方程组就先化成一元一次方程`;
};

const getEliminateVariableNote = (
  sourceEquationsLatex: string[],
  eliminatedVariableLatex: string,
  methodLatex: 'add' | 'subtract'
) => {
  const actionText = methodLatex === 'add' ? '相加' : '相减';

  return `把 ${sourceEquationsLatex.join(' 和 ')} ${actionText}，这样就能消去 ${eliminatedVariableLatex}，先化成一元一次方程`;
};

const getSystemSimplifyAfterSubstitutionNote = () => {
  return '整理代入后的式子，化成一元一次方程';
};

const getSystemSimplifyAfterEliminationNote = () => {
  return '整理消元后的式子，化成一元一次方程';
};

const getSolveSingleVariableEquationNote = (resultLatex: string) => {
  return `现在只剩一个变量，解得 ${resultLatex}`;
};

const getBackSubstituteSolutionNote = (knownSolutionLatex: string, resultLatex: string) => {
  return `已经知道 ${knownSolutionLatex}，再把它代回前面的式子，就能求出另一个变量，得到 ${resultLatex}`;
};

const getCollectSystemSolutionNote = (solutionPairLatex: string) => {
  return `把两个变量的结果配成有序数对，所以这个方程组的唯一解为 ${solutionPairLatex}`;
};

const getEliminateToClassifySystemNote = (sourceEquationsLatex: string[], setupText?: string) => {
  const setupPrefix = setupText ? `${setupText}，` : '';

  return `${setupPrefix}把 ${sourceEquationsLatex.join(' 和 ')} 相减，这样 x 和 y 都被消去，只剩下对常数的比较`;
};

const getSystemClassificationSimplifyNote = () => {
  return '整理消元后的结果，判断这个等式是真还是假';
};

const getClassifyNoSolutionNote = (reasonLatex: string) => {
  return `消元后得到 ${reasonLatex}，这是矛盾的等式，所以这个方程组无解`;
};

const getClassifyInfiniteSolutionsNote = (reasonLatex: string) => {
  return `消元后得到 ${reasonLatex}，这是恒成立的等式，说明两条方程表示同一个条件`;
};

const getStateNoSolutionNote = () => {
  return '两条方程不能同时成立，所以这个方程组无解';
};

const getStateInfiniteSolutionsNote = () => {
  return '两条方程表示同一个条件，所以满足条件的数对有无穷多组';
};

const getQuadraticFactorNote = ({
  constant,
  factoredLatex,
  linearCoefficient
}: {
  constant: number;
  factoredLatex: string;
  linearCoefficient: number;
}) => {
  if (linearCoefficient === 0 && constant < 0) {
    return `把左边看成平方差，可分解为 ${factoredLatex}`;
  }

  return `找两个数，和为 ${linearCoefficient}，积为 ${constant}，所以可分解为 ${factoredLatex}`;
};

const getSplitLinearFactorsNote = (factorsLatex: string[]) => {
  return `现在已经拆成两个一次因式：${factorsLatex.join('、')}`;
};

const getZeroProductRuleNote = (factorsLatex: string[], branchEquationsLatex: string[]) => {
  return `用零积法则：因为 ${factorsLatex.join('')}=0，两个因式的乘积为 0，所以至少有一个因式等于 0，即 ${branchEquationsLatex.join(' 或 ')}`;
};

const getCollectQuadraticOutcomeNote = (branchesLatex: string[]) => {
  if (branchesLatex.length >= 2) {
    return `把两个分支结果汇总起来，得到 ${branchesLatex.join(' 和 ')}，所以原方程的两个解为 ${branchesLatex.join(' 或 ')}`;
  }

  if (branchesLatex.length === 1) {
    return `两个分支结果重合，汇总后可得原方程的重根为 ${branchesLatex[0]}`;
  }

  return '把分支结果汇总起来，写出原方程的解';
};

const getExtractSquareRootNote = (squaredBaseLatex: string, squareRootValue: number) => {
  return `两边开平方，${squareRootValue} 的平方根是 ${squareRootValue}，所以 ${squaredBaseLatex}=${squareRootValue} 或 ${squaredBaseLatex}=-${squareRootValue}`;
};

const getComputeDiscriminantNote = (
  quadraticCoefficient: number,
  linearCoefficient: number,
  constant: number,
  discriminant: number
) => {
  return `先算判别式 Δ=b^2-4ac，它用来判断方程有几个实根；代入 a=${quadraticCoefficient}，b=${linearCoefficient}，c=${constant}，得 Δ=${discriminant}`;
};

const getClassifyRootCountNote = (discriminant: number) => {
  return `因为 Δ=${discriminant}>0，所以方程有两个不同实根，这时可以继续用求根公式`;
};

const getClassifyDoubleRootNote = (discriminant: number) => {
  return `因为 Δ=${discriminant}=0，所以方程只有一个重根；继续用求根公式时，最后会汇总成一个解`;
};

const getClassifyNoRealRootNote = (discriminant: number) => {
  return `因为 Δ=${discriminant}<0，所以方程在实数范围内无解，不再继续分支求解`;
};

const getApplyQuadraticFormulaNote = (
  quadraticCoefficient: number,
  linearCoefficient: number,
  constant: number,
  branchesLatex: string[]
) => {
  return `已知 Δ>0，可用求根公式 x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}；代入 a=${quadraticCoefficient}，b=${linearCoefficient}，c=${constant}，再把 \\pm 拆成两个分支，得到 ${branchesLatex.join(' 和 ')}`;
};

const getApplyQuadraticFormulaDoubleRootNote = (
  quadraticCoefficient: number,
  linearCoefficient: number,
  constant: number,
  rootLatex: string
) => {
  return `已知 Δ=0，可用求根公式 x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}；代入 a=${quadraticCoefficient}，b=${linearCoefficient}，c=${constant} 后，\\pm 两个结果重合，得到 ${rootLatex}`;
};

const getNoRealSolutionNote = (discriminant: number) => {
  return `因为 Δ=${discriminant}<0，根号内是负数，在实数范围内不能继续开方，所以原方程无实数解`;
};

const getSystemAnswerValue = (answer: string, variableLatex: string) => {
  const prefix = `${variableLatex}=`;

  return answer.startsWith(prefix) ? answer.slice(prefix.length) : undefined;
};

const getDomainRestrictionNote = (denominator: number) => {
  return `分母是常数 ${denominator}，恒不为 0，无额外取值限制`;
};

const getInequalityMoveNote = (constant: number) => {
  return `${getMoveNote(constant)}，只是移项，不等号方向不变`;
};

const getInequalityDivideNote = (coefficient: number) => {
  return `两边同时除以 ${coefficient}，除以正数，不等号方向不变`;
};

const getInequalityFlipNote = (coefficient: number, fromRelation: string, toRelation: string) => {
  return `两边同时除以 ${coefficient}，除以负数，不等号方向改变，${fromRelation} 变成 ${toRelation}`;
};

const getSolveInequalityNote = (answer: string) => {
  return `所以原不等式的解集为 ${answer}`;
};

const getIntersectSolutionSetNote = (answer: string) => {
  return `结合取值范围，解集仍为 ${answer}`;
};

const getVariableDenominatorRestrictionNote = (criticalPoint: number) => {
  return `先看定义域：分母不能为 0，所以 x=${criticalPoint} 不能取`;
};

const getFindCriticalPointsNote = (criticalPoint: number) => {
  return `找临界点是因为这些点会让分式无意义或改变符号；令分母为 0，得 x=${criticalPoint}`;
};

const getAnalyzeSignIntervalNote = (
  answer: string,
  criticalPoint: number,
  direction: 'left' | 'right',
  sign: 'positive' | 'negative'
) => {
  const sideText = direction === 'right' ? '右侧' : '左侧';
  const signText = sign === 'positive' ? '正' : '负';

  return `以 x=${criticalPoint} 为分界判断符号；分式在${sideText}为${signText}，且 x=${criticalPoint} 时分母为 0 不能取，所以解集是 ${answer}`;
};

const getVariableDenominatorIntersectNote = (answer: string, criticalPoint: number) => {
  return `去掉使分母为 0 的 x=${criticalPoint} 后，原不等式的解集为 ${answer}`;
};

const getMultiCriticalPointsNote = (pointsLatex: string[]) => {
  return `先找临界点，因为分子为 0 或分母为 0 时分式符号可能改变；可得 ${pointsLatex.join('、')}`;
};

const getMultiIntervalSignNote = ({
  denominatorRootLatex,
  numeratorRootLatex,
  numeratorRootSelectable
}: {
  denominatorRootLatex: string;
  numeratorRootLatex: string;
  numeratorRootSelectable: boolean;
}) => {
  return `先按临界点分段判断符号；${numeratorRootLatex} 使分子为 0，${numeratorRootSelectable ? '可以取到' : '本题不能取到'}，${denominatorRootLatex} 使分母为 0，不能取`;
};

const getMultiIntervalIntersectNote = (denominatorRootLatex: string) => {
  return `把 ${denominatorRootLatex} 这个使分母为 0 的点排除后，原不等式的解集见下式`;
};

const getConstantDenominatorRestrictionLatex = (denominator: number) => {
  return `${denominator}\\ne0`;
};

const formatVariableDenominatorLatex = (innerConstant: number) => {
  return `x${formatSignedConstant(innerConstant)}`;
};

const formatQuadraticFactorLatex = (innerConstant: number) => {
  return `(x${formatSignedConstant(innerConstant)})`;
};

const formatQuadraticSquareBaseLatex = (innerConstant: number) => {
  if (innerConstant === 0) {
    return 'x';
  }

  return `x${formatSignedConstant(innerConstant)}`;
};

const formatQuadraticSquaredLatex = (innerConstant: number) => {
  return innerConstant === 0 ? 'x^2' : `(${formatQuadraticSquareBaseLatex(innerConstant)})^2`;
};

const formatQuadraticBranchEquationLatex = (innerConstant: number) => {
  return `x${formatSignedConstant(innerConstant)}=0`;
};

const getQuadraticRootValue = (innerConstant: number) => {
  return -innerConstant;
};

const formatQuadraticSolutionLatex = (value: number) => {
  return `x=${formatRational(value, 1)}`;
};

const formatSolutionBranchesLatex = (branchesLatex: string[]) => {
  return branchesLatex.join('\\text{ 或 }');
};

const getGreatestCommonDivisor = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a || 1;
};

const getGreatestCommonDivisorForList = (values: number[]) => {
  return values.reduce((result, value) => getGreatestCommonDivisor(result, value), 0) || 1;
};

const getSquareFactorization = (value: number) => {
  let remaining = value;
  let outside = 1;

  for (let factor = 2; factor * factor <= remaining; factor += 1) {
    while (remaining % (factor * factor) === 0) {
      outside *= factor;
      remaining /= factor * factor;
    }
  }

  return {
    inside: remaining,
    outside
  };
};

const formatSqrtTermLatex = (coefficient: number, radicand: number) => {
  if (radicand === 1) {
    return String(coefficient);
  }

  if (coefficient === 1) {
    return `\\sqrt{${radicand}}`;
  }

  return `${coefficient}\\sqrt{${radicand}}`;
};

const formatSignedSqrtExpressionLatex = (
  numeratorConstant: number,
  sqrtCoefficient: number,
  radicand: number,
  denominator: number,
  sign: 'minus' | 'plus'
) => {
  const sqrtTermLatex = formatSqrtTermLatex(sqrtCoefficient, radicand);
  const signedSqrtTermLatex = sign === 'plus' ? sqrtTermLatex : `-${sqrtTermLatex}`;

  const numeratorLatex =
    numeratorConstant === 0
      ? signedSqrtTermLatex
      : `${numeratorConstant}${sign === 'plus' ? '+' : '-'}${sqrtTermLatex}`;

  if (denominator === 1) {
    return numeratorLatex;
  }

  return `\\frac{${numeratorLatex}}{${denominator}}`;
};

const getQuadraticFormulaBranches = (quadraticCoefficient: number, linearCoefficient: number, discriminant: number) => {
  const rawNumeratorConstant = -linearCoefficient;
  const rawDenominator = 2 * quadraticCoefficient;
  const {inside, outside} = getSquareFactorization(discriminant);

  if (inside === 1) {
    const branchValues = Array.from(
      new Set([
        formatRational(rawNumeratorConstant - outside, rawDenominator),
        formatRational(rawNumeratorConstant + outside, rawDenominator)
      ])
    ).sort((left, right) => left.localeCompare(right, 'en'));

    return branchValues.map((value) => `x=${value}`);
  }

  let numeratorConstant = rawNumeratorConstant;
  let denominator = rawDenominator;
  let sqrtCoefficient = outside;
  const commonDivisor = getGreatestCommonDivisorForList([numeratorConstant, denominator, sqrtCoefficient]);

  numeratorConstant /= commonDivisor;
  denominator /= commonDivisor;
  sqrtCoefficient /= commonDivisor;

  if (denominator < 0) {
    denominator *= -1;
    numeratorConstant *= -1;
    sqrtCoefficient *= -1;
  }

  const normalizedSqrtCoefficient = Math.abs(sqrtCoefficient);

  return [
    `x=${formatSignedSqrtExpressionLatex(numeratorConstant, normalizedSqrtCoefficient, inside, denominator, 'minus')}`,
    `x=${formatSignedSqrtExpressionLatex(numeratorConstant, normalizedSqrtCoefficient, inside, denominator, 'plus')}`
  ];
};

const formatQuadraticFormulaStepLatex = (quadraticCoefficient: number, linearCoefficient: number, discriminant: number) => {
  return `x=\\frac{${-linearCoefficient}\\pm\\sqrt{${discriminant}}}{${2 * quadraticCoefficient}}`;
};

const getQuadraticDoubleRootLatex = (quadraticCoefficient: number, linearCoefficient: number) => {
  return `x=${formatRational(-linearCoefficient, 2 * quadraticCoefficient)}`;
};

const formatDiscriminantLatex = (
  quadraticCoefficient: number,
  linearCoefficient: number,
  constant: number,
  discriminant: number
) => {
  return `\\Delta=(${linearCoefficient})^2-4\\cdot${quadraticCoefficient}\\cdot(${constant})=${discriminant}`;
};

const getSquareRootBranchValues = (innerConstant: number, right: number) => {
  const squareRootValue = Math.sqrt(right);
  const branchValues = Array.from(new Set([squareRootValue - innerConstant, -squareRootValue - innerConstant])).sort(
    (left, rightValue) => left - rightValue
  );

  return {
    branchEquationsLatex: [
      `${formatQuadraticSquareBaseLatex(innerConstant)}=${squareRootValue}`,
      `${formatQuadraticSquareBaseLatex(innerConstant)}=-${squareRootValue}`
    ],
    branchesLatex: branchValues.map(formatQuadraticSolutionLatex),
    squareRootValue
  };
};

const getMonicQuadraticFactorPair = (linearCoefficient: number, constant: number): [number, number] | null => {
  if (constant === 0) {
    return [0, linearCoefficient];
  }

  const limit = Math.abs(constant);

  for (let left = -limit; left <= limit; left += 1) {
    if (left === 0) {
      continue;
    }

    if (constant % left !== 0) {
      continue;
    }

    const right = constant / left;

    if (left + right === linearCoefficient) {
      return [left, right];
    }
  }

  return null;
};

const getQuadraticBranchSummary = (innerConstants: number[]) => {
  const branchesLatex = innerConstants
    .map(getQuadraticRootValue)
    .sort((left, right) => left - right)
    .map(formatQuadraticSolutionLatex);

  return {
    branchesLatex,
    resultLatex: formatSolutionBranchesLatex(branchesLatex)
  };
};

const getCriticalPointValue = (innerConstant: number) => {
  return -innerConstant;
};

const getVariableDenominatorRestrictionLatex = (innerConstant: number) => {
  return `${formatVariableDenominatorLatex(innerConstant)}\\ne0`;
};

const getVariableRestrictionAnswerLatex = (innerConstant: number) => {
  return `x\\ne${getCriticalPointValue(innerConstant)}`;
};

const formatIntervalEndpoint = (value: number) => {
  return formatRational(value, 1);
};

const getLinearRootValue = (coefficient: number, constant: number) => {
  return -constant / coefficient;
};

const getLinearRootLatex = (coefficient: number, constant: number) => {
  return formatRational(-constant, coefficient);
};

const buildIntervalLatex = (
  left: number | null,
  right: number | null,
  leftInclusive: boolean,
  rightInclusive: boolean
) => {
  const leftBracket = leftInclusive ? '[' : '(';
  const rightBracket = rightInclusive ? ']' : ')';
  const leftLatex = left === null ? '-\\infty' : formatIntervalEndpoint(left);
  const rightLatex = right === null ? '+\\infty' : formatIntervalEndpoint(right);

  return `${leftBracket}${leftLatex},${rightLatex}${rightBracket}`;
};

const formatIntervalUnionLatex = (intervals: string[]) => {
  return intervals.join('\\cup');
};

const evaluateLinear = (coefficient: number, constant: number, x: number) => {
  return coefficient * x + constant;
};

const compareAgainstZero = (value: number, relation: InequalitySign) => {
  if (relation === '<') {
    return value < 0;
  }

  if (relation === '<=') {
    return value <= 0;
  }

  if (relation === '>') {
    return value > 0;
  }

  return value >= 0;
};

const createFractionVariableDenominatorTokenMap = (stepId: string, denominatorInnerConstant: number, right: number) => {
  return [
    createToken(stepId, 'left-term', `\\frac{x}{${formatVariableDenominatorLatex(denominatorInnerConstant)}}`, 'left_term'),
    createToken(stepId, 'moving-term', String(right), 'moving_term')
  ];
};

const createStandardRationalInequalityTokenMap = (
  stepId: string,
  numeratorInnerConstant: number,
  denominatorInnerConstant: number
) => {
  return [
    createToken(
      stepId,
      'left-term',
      `\\frac{x${formatSignedConstant(numeratorInnerConstant)}}{${formatVariableDenominatorLatex(denominatorInnerConstant)}}`,
      'left_term'
    ),
    createToken(stepId, 'right-value', '0', 'right_value')
  ];
};

const createMovedFractionVariableDenominatorTokenMap = (
  stepId: string,
  denominatorInnerConstant: number,
  right: number
) => {
  return [
    createToken(stepId, 'left-term', `\\frac{x}{${formatVariableDenominatorLatex(denominatorInnerConstant)}}`, 'left_term'),
    createToken(stepId, 'result-term', right > 0 ? `-${right}` : `+${Math.abs(right)}`, 'result_term')
  ];
};

const createDomainRestrictionStep = ({
  denominator,
  index
}: {
  denominator: number;
  index: number;
}) => {
  const restrictionLatex = getConstantDenominatorRestrictionLatex(denominator);

  return createStepV2({
    index,
    latex: restrictionLatex,
    legacyKind: 'transform',
    note: getDomainRestrictionNote(denominator),
    operation: {
      reasonLatex: 'x\\in\\mathbb{R}',
      restrictionLatex,
      type: 'state_domain_restriction'
    },
    tokenMap: createDomainRestrictionTokenMap(`s${index}`, restrictionLatex)
  });
};

const createIntersectSolutionStep = ({
  answer,
  denominator,
  index
}: {
  answer: string;
  denominator: number;
  index: number;
}) => {
  return createStepV2({
    index,
    latex: answer,
    legacyKind: 'answer',
    note: getIntersectSolutionSetNote(answer),
    operation: {
      baseSolutionLatex: answer,
      restrictionLatex: getConstantDenominatorRestrictionLatex(denominator),
      resultLatex: answer,
      type: 'intersect_solution_set'
    },
    tokenMap: createInequalityAnswerTokenMap(`s${index}`, answer)
  });
};

const createVariableDenominatorDomainRestrictionStep = ({
  index,
  innerConstant
}: {
  index: number;
  innerConstant: number;
}) => {
  const latex = getVariableDenominatorRestrictionLatex(innerConstant);

  return createStepV2({
    index,
    latex,
    legacyKind: 'transform',
    note: getVariableDenominatorRestrictionNote(getCriticalPointValue(innerConstant)),
    operation: {
      reasonLatex: latex,
      restrictionLatex: getVariableRestrictionAnswerLatex(innerConstant),
      type: 'state_domain_restriction'
    },
    tokenMap: createDomainRestrictionTokenMap(`s${index}`, latex)
  });
};

const createFindCriticalPointStep = ({
  index,
  innerConstant
}: {
  index: number;
  innerConstant: number;
}) => {
  const criticalPoint = getCriticalPointValue(innerConstant);
  const latex = `x=${criticalPoint}`;

  return createStepV2({
    index,
    latex,
    legacyKind: 'transform',
    note: getFindCriticalPointsNote(criticalPoint),
    operation: {
      pointsLatex: [latex],
      reasonLatex: `${formatVariableDenominatorLatex(innerConstant)}=0`,
      type: 'find_critical_points'
    },
    tokenMap: createInequalityAnswerTokenMap(`s${index}`, latex)
  });
};

const createAnalyzeSignIntervalStep = ({
  index,
  innerConstant,
  relation
}: {
  index: number;
  innerConstant: number;
  relation: '<' | '>';
}) => {
  const criticalPoint = getCriticalPointValue(innerConstant);
  const direction = relation === '>' ? 'right' : 'left';
  const sign = relation === '>' ? 'positive' : 'negative';
  const answer = `x${formatRelationLatex(relation)}${criticalPoint}`;
  const selectedIntervalLatex =
    relation === '>' ? `(${criticalPoint},+\\infty)` : `(-\\infty,${criticalPoint})`;

  return createStepV2({
    index,
    latex: answer,
    legacyKind: 'transform',
    note: getAnalyzeSignIntervalNote(answer, criticalPoint, direction, sign),
    operation: {
      criticalPointsLatex: [String(criticalPoint)],
      selectedIntervalsLatex: [selectedIntervalLatex],
      signSummaryLatex: `\\frac{1}{${formatVariableDenominatorLatex(innerConstant)}}${formatRelationLatex(relation)}0`,
      type: 'analyze_sign_interval'
    },
    tokenMap: createInequalityAnswerTokenMap(`s${index}`, answer)
  });
};

const createVariableDenominatorIntersectSolutionStep = ({
  answer,
  index,
  innerConstant
}: {
  answer: string;
  index: number;
  innerConstant: number;
}) => {
  return createStepV2({
    index,
    latex: answer,
    legacyKind: 'answer',
    note: getVariableDenominatorIntersectNote(answer, getCriticalPointValue(innerConstant)),
    operation: {
      baseSolutionLatex: answer,
      restrictionLatex: getVariableRestrictionAnswerLatex(innerConstant),
      resultLatex: answer,
      type: 'intersect_solution_set'
    },
    tokenMap: createInequalityAnswerTokenMap(`s${index}`, answer)
  });
};

const createMultiCriticalPointStep = ({
  denominatorInnerConstant,
  index,
  numeratorConstant,
  numeratorCoefficient
}: {
  denominatorInnerConstant: number;
  index: number;
  numeratorConstant: number;
  numeratorCoefficient: number;
}) => {
  const numeratorRootLatex = `x=${getLinearRootLatex(numeratorCoefficient, numeratorConstant)}`;
  const denominatorRootLatex = `x=${formatIntervalEndpoint(getCriticalPointValue(denominatorInnerConstant))}`;
  const pointsLatex = [numeratorRootLatex, denominatorRootLatex];

  return createStepV2({
    index,
    latex: pointsLatex.join(',\\ '),
    legacyKind: 'transform',
    note: getMultiCriticalPointsNote(pointsLatex),
    operation: {
      pointsLatex,
      reasonLatex: `${formatLinearLatex(numeratorCoefficient, numeratorConstant)}=0, ${formatVariableDenominatorLatex(
        denominatorInnerConstant
      )}=0`,
      type: 'find_critical_points'
    },
    tokenMap: createInequalityAnswerTokenMap(`s${index}`, pointsLatex.join(',\\ '))
  });
};

const createMultiIntervalSignStep = ({
  denominatorInnerConstant,
  index,
  numeratorConstant,
  numeratorCoefficient,
  relation
}: {
  denominatorInnerConstant: number;
  index: number;
  numeratorConstant: number;
  numeratorCoefficient: number;
  relation: InequalitySign;
}) => {
  const numeratorRoot = getLinearRootValue(numeratorCoefficient, numeratorConstant);
  const denominatorRoot = getCriticalPointValue(denominatorInnerConstant);
  const sortedPoints = [numeratorRoot, denominatorRoot].sort((left, right) => left - right);
  const boundaries = [null, ...sortedPoints, null] as Array<number | null>;
  const selectedIntervals: Array<{
    left: number | null;
    leftInclusive: boolean;
    right: number | null;
    rightInclusive: boolean;
  }> = [];

  for (let indexOffset = 0; indexOffset < boundaries.length - 1; indexOffset += 1) {
    const leftBoundary = boundaries[indexOffset];
    const rightBoundary = boundaries[indexOffset + 1];
    const samplePoint =
      leftBoundary === null
        ? (rightBoundary ?? 0) - 1
        : rightBoundary === null
          ? leftBoundary + 1
          : (leftBoundary + rightBoundary) / 2;
    const numeratorValue = evaluateLinear(numeratorCoefficient, numeratorConstant, samplePoint);
    const denominatorValue = evaluateLinear(1, denominatorInnerConstant, samplePoint);
    const fractionValue = numeratorValue / denominatorValue;

    if (compareAgainstZero(fractionValue, relation)) {
      selectedIntervals.push({
        left: leftBoundary,
        leftInclusive: false,
        right: rightBoundary,
        rightInclusive: false
      });
    }
  }

  if ((relation === '<=' || relation === '>=') && compareAgainstZero(0, relation)) {
    selectedIntervals.forEach((interval) => {
      if (interval.right === numeratorRoot) {
        interval.rightInclusive = true;
      }

      if (interval.left === numeratorRoot) {
        interval.leftInclusive = true;
      }
    });
  }

  const selectedIntervalsLatex = selectedIntervals.map((interval) =>
    buildIntervalLatex(interval.left, interval.right, interval.leftInclusive, interval.rightInclusive)
  );
  const answerLatex = formatIntervalUnionLatex(selectedIntervalsLatex.length === 0 ? ['\\varnothing'] : selectedIntervalsLatex);
  const numeratorRootLatex = `x=${getLinearRootLatex(numeratorCoefficient, numeratorConstant)}`;
  const denominatorRootLatex = `x=${formatIntervalEndpoint(denominatorRoot)}`;
  const numeratorRootSelectable = relation === '<=' || relation === '>=';

  return createStepV2({
    index,
    latex: answerLatex,
    legacyKind: 'transform',
    note: getMultiIntervalSignNote({
      denominatorRootLatex,
      numeratorRootLatex,
      numeratorRootSelectable
    }),
    operation: {
      criticalPointsLatex: sortedPoints.map((point) => formatIntervalEndpoint(point)),
      selectedIntervalsLatex,
      signSummaryLatex: `\\frac{${formatLinearLatex(numeratorCoefficient, numeratorConstant)}}{${formatVariableDenominatorLatex(
        denominatorInnerConstant
      )}}${formatRelationLatex(relation)}0`,
      type: 'analyze_sign_interval'
    },
    tokenMap: createInequalityAnswerTokenMap(`s${index}`, answerLatex)
  });
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

    if (movedState.coefficient !== 1) {
      steps.push(createStep(index, answerState.operationLatex, 'transform', getDivideNote(movedState.coefficient)));
      index += 1;
    }

    steps.push(
      createStep(index, answerState.latex, 'answer', getFinalAnswerNote(), createAnswerTokenMap(`s${index}`, answerState.answer))
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
    if (linearState.coefficient !== 1) {
      steps.push(createStep(index, answerState.operationLatex, 'transform', getDivideNote(linearState.coefficient)));
      index += 1;
    }

    steps.push(
      createStep(index, answerState.latex, 'answer', getFinalAnswerNote(), createAnswerTokenMap(`s${index}`, answerState.answer))
    );
  }

  return {
    answer: answerState.answer,
    steps
  };
};

const buildStepsFromFractionState = (fractionState: FractionEquationState, startIndex: number) => {
  const steps: AlgebraStep[] = [];
  let index = startIndex;
  const movedState = moveFractionConstant(fractionState);

  steps.push(
    createStep(
      index,
      movedState.latex,
      'move',
      getMoveNote(fractionState.constant),
      createMovedFractionTokenMap(`s${index}`, fractionState.denominator, fractionState.right, fractionState.constant)
    )
  );
  index += 1;
  steps.push(
    createStep(
      index,
      movedState.simplifiedLatex,
      'transform',
      '计算右边',
      createFractionEqualsTokenMap(`s${index}`, movedState.denominator, movedState.right)
    )
  );
  index += 1;

  const multipliedState = multiplyDenominator(movedState);

  steps.push(createStep(index, multipliedState.latex, 'transform', getMultiplyDenominatorNote(movedState.denominator)));
  index += 1;
  steps.push(createStep(index, multipliedState.simplifiedLatex, 'transform', '计算乘法', createXEqualsValueTokenMap(`s${index}`, multipliedState.answer.slice(2))));
  index += 1;
  steps.push(createStep(index, multipliedState.answer, 'answer', getFinalAnswerNote(), createAnswerTokenMap(`s${index}`, multipliedState.answer)));

  return {
    answer: multipliedState.answer,
    steps
  };
};

const buildStepsFromMovedVariableState = (
  movedState: ReturnType<typeof moveVariableTerms>,
  startIndex: number
) => {
  const steps: AlgebraStep[] = [];
  let index = startIndex;
  const answerState = divideCoefficient(movedState);

  steps.push(
    createStep(
      index,
      movedState.simplifiedLatex,
      'transform',
      '合并同类项',
      createAxEqualsValueTokenMap(`s${index}`, movedState.coefficient, movedState.right)
    )
  );
  index += 1;

  if (movedState.coefficient !== 1) {
    steps.push(createStep(index, answerState.operationLatex, 'transform', getDivideNote(movedState.coefficient)));
    index += 1;
  }

  steps.push(createStep(index, answerState.latex, 'answer', getFinalAnswerNote(), createAnswerTokenMap(`s${index}`, answerState.answer)));

  return {
    answer: answerState.answer,
    steps
  };
};

const getAnswerValue = (answer: string) => {
  return answer.startsWith('x=') ? answer.slice(2) : undefined;
};

const formatSystemSolutionPairLatex = (xValueLatex: string, yValueLatex: string) => {
  return `(x,y)=(${xValueLatex},${yValueLatex})`;
};

const toSolveSingleVariableStep = (step: AlgebraStepV2, variableLatex: string): AlgebraStepV2 => {
  if (step.operation.type !== 'final_answer') {
    return step;
  }

  return {
    ...step,
    legacyKind: 'transform',
    note: getSolveSingleVariableEquationNote(step.latex),
    operation: {
      resultLatex: step.latex,
      type: 'solve_single_variable_equation',
      variableLatex
    },
    tokenMap: createAnswerTokenMap(step.id, step.latex)
  };
};

const buildNativeStepsFromLinearState = (
  initialLatex: string,
  linearState: LinearEquationState,
  startIndex: number,
  options?: {
    divideNote?: (coefficient: number) => string;
  }
) => {
  const steps: AlgebraStepV2[] = [];
  let index = startIndex;
  const divideNote = options?.divideNote ?? getDivideNote;

  if (linearState.constant !== 0) {
    const movedState = moveTerm(linearState);

    steps.push(
      createStepV2({
        index,
        latex: movedState.latex,
        legacyKind: 'move',
        note: getMoveNote(linearState.constant),
        operation: {
          fromSide: 'left',
          inverseTermLatex:
            linearState.constant > 0 ? `-${linearState.constant}` : `+${Math.abs(linearState.constant)}`,
          termLatex: formatSignedConstant(linearState.constant),
          toSide: 'right',
          type: 'move_term'
        },
        sourceLatex: initialLatex,
        tokenMap: createMovedTokenMap(`s${index}`, linearState.coefficient, linearState.right, linearState.constant)
      })
    );
    index += 1;

    steps.push(
      createStepV2({
        index,
        latex: movedState.simplifiedLatex,
        legacyKind: 'transform',
        note: '计算右边',
        operation: {
          type: 'simplify_expression'
        },
        tokenMap: createAxEqualsValueTokenMap(`s${index}`, movedState.coefficient, movedState.right)
      })
    );
    index += 1;

    const answerState = divideCoefficient(movedState);

    if (movedState.coefficient !== 1) {
      steps.push(
        createStepV2({
          index,
          latex: answerState.operationLatex,
          legacyKind: 'transform',
          note: divideNote(movedState.coefficient),
          operation: {
            divisorLatex: String(movedState.coefficient),
            type: 'divide_both_sides'
          }
        })
      );
      index += 1;
    }

    steps.push(
      createStepV2({
        index,
        latex: answerState.latex,
        legacyKind: 'answer',
        note: getFinalAnswerNote(),
        operation: {
          valueLatex: getAnswerValue(answerState.answer),
          variableLatex: 'x',
          type: 'final_answer'
        },
        tokenMap: createAnswerTokenMap(`s${index}`, answerState.answer)
      })
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
    if (linearState.coefficient !== 1) {
      steps.push(
        createStepV2({
          index,
          latex: answerState.operationLatex,
          legacyKind: 'transform',
          note: divideNote(linearState.coefficient),
          operation: {
            divisorLatex: String(linearState.coefficient),
            type: 'divide_both_sides'
          },
          sourceLatex: initialLatex
        })
      );
      index += 1;
    }

    steps.push(
      createStepV2({
        index,
        latex: answerState.latex,
        legacyKind: 'answer',
        note: getFinalAnswerNote(),
        operation: {
          valueLatex: getAnswerValue(answerState.answer),
          variableLatex: 'x',
          type: 'final_answer'
        },
        tokenMap: createAnswerTokenMap(`s${index}`, answerState.answer)
      })
    );
  }

  return {
    answer: answerState.answer,
    steps
  };
};

const buildNativeDistributedWithConstantProblem = (
  equation: Extract<ParsedEquation, {shape: 'distributed-with-constant'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createDistributedWithOuterTokenMap(
        `s${index}`,
        equation.coefficient,
        equation.innerConstant,
        equation.outerConstant,
        equation.right
      )
    })
  );
  index += 1;

  const expandedState = expandBracketsWithOuterConstant(equation);

  steps.push(
    createStepV2({
      index,
      latex: expandedState.latex,
      legacyKind: 'expand',
      note: '展开括号',
      operation: {
        bracketLatex: `x${formatSignedConstant(equation.innerConstant)}`,
        factorLatex: String(equation.coefficient),
        type: 'expand_brackets'
      },
      tokenMap: createExpandedWithOuterTokenMap(`s${index}`, expandedState)
    })
  );
  index += 1;

  const combinedState = combineExpandedConstants(expandedState);

  steps.push(
    createStepV2({
      index,
      latex: combinedState.latex,
      legacyKind: 'transform',
      note: '合并常数项',
      operation: {
        groups: [
          {
            category: 'constant',
            resultLatex: formatSignedConstant(combinedState.constant),
            termsLatex: [
              formatSignedConstant(expandedState.expandedConstant),
              formatSignedConstant(expandedState.outerConstant)
            ]
          }
        ],
        type: 'combine_like_terms'
      },
      tokenMap: createLinearTokenMap(`s${index}`, combinedState.coefficient, combinedState.constant, combinedState.right, 'moving_term')
    })
  );
  index += 1;

  const linearResult = buildNativeStepsFromLinearState(combinedState.latex, combinedState, index);
  const allSteps = [...steps, ...linearResult.steps];

  return createProblemV2Draft(equation.raw, linearResult.answer, allSteps);
};

const buildNativeFractionWithConstantProblem = (
  equation: Extract<ParsedEquation, {shape: 'fraction-with-constant'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const fractionState = createFractionEquationState(equation);

  steps.push(
    createStepV2({
      index,
      latex: fractionState.latex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createFractionTokenMap(`s${index}`, fractionState)
    })
  );
  index += 1;

  const movedState = moveFractionConstant(fractionState);

  steps.push(
    createStepV2({
      index,
      latex: movedState.latex,
      legacyKind: 'move',
      note: getMoveNote(fractionState.constant),
      operation: {
        fromSide: 'left',
        inverseTermLatex:
          fractionState.constant > 0 ? `-${fractionState.constant}` : `+${Math.abs(fractionState.constant)}`,
        termLatex: formatSignedConstant(fractionState.constant),
        toSide: 'right',
        type: 'move_term'
      },
      tokenMap: createMovedFractionTokenMap(`s${index}`, fractionState.denominator, fractionState.right, fractionState.constant)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: movedState.simplifiedLatex,
      legacyKind: 'transform',
      note: '计算右边',
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createFractionEqualsTokenMap(`s${index}`, movedState.denominator, movedState.right)
    })
  );
  index += 1;

  const multipliedState = multiplyDenominator(movedState);

  steps.push(
    createStepV2({
      index,
      latex: multipliedState.latex,
      legacyKind: 'transform',
      note: getMultiplyDenominatorNote(movedState.denominator),
      operation: {
        multiplierLatex: String(movedState.denominator),
        type: 'multiply_both_sides'
      }
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: multipliedState.simplifiedLatex,
      legacyKind: 'transform',
      note: '计算乘法',
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createXEqualsValueTokenMap(`s${index}`, multipliedState.answer.slice(2))
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: multipliedState.answer,
      legacyKind: 'answer',
      note: getFinalAnswerNote(),
      operation: {
        valueLatex: getAnswerValue(multipliedState.answer),
        variableLatex: 'x',
        type: 'final_answer'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, multipliedState.answer)
    })
  );

  return createProblemV2Draft(equation.raw, multipliedState.answer, steps);
};

const buildNativeVariablesBothSidesProblem = (
  equation: Extract<ParsedEquation, {shape: 'variables-both-sides'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createVariablesBothSidesTokenMap(
        `s${index}`,
        equation.coefficient,
        equation.constant,
        equation.rightCoefficient,
        equation.rightConstant
      )
    })
  );
  index += 1;

  const movedState = moveVariableTerms(equation);

  steps.push(
    createStepV2({
      index,
      latex: movedState.latex,
      legacyKind: 'move',
      note: '把含 x 的项移到左边，常数项移到右边',
      operation: {
        fromSide: 'right',
        inverseTermLatex: `-${formatCoefficientTerm(equation.rightCoefficient)}`,
        termLatex: formatCoefficientTerm(equation.rightCoefficient),
        toSide: 'left',
        type: 'move_term'
      },
      tokenMap: createMovedVariablesTokenMap(
        `s${index}`,
        equation.coefficient,
        equation.rightCoefficient,
        equation.rightConstant,
        equation.constant
      )
    })
  );
  index += 1;

  const answerState = divideCoefficient(movedState);

  steps.push(
    createStepV2({
      index,
      latex: movedState.simplifiedLatex,
      legacyKind: 'transform',
      note: '合并同类项',
      operation: {
        groups: [
          {
            category: 'variable',
            resultLatex: formatCoefficientTerm(movedState.coefficient),
            termsLatex: [formatCoefficientTerm(equation.coefficient), `-${formatCoefficientTerm(equation.rightCoefficient)}`]
          },
          {
            category: 'constant',
            resultLatex: String(movedState.right),
            termsLatex: [String(equation.rightConstant), formatSignedConstant(-equation.constant)]
          }
        ],
        type: 'combine_like_terms'
      },
      tokenMap: createAxEqualsValueTokenMap(`s${index}`, movedState.coefficient, movedState.right)
    })
  );
  index += 1;

  if (movedState.coefficient !== 1) {
    steps.push(
      createStepV2({
        index,
        latex: answerState.operationLatex,
        legacyKind: 'transform',
        note: getDivideNote(movedState.coefficient),
        operation: {
          divisorLatex: String(movedState.coefficient),
          type: 'divide_both_sides'
        }
      })
    );
    index += 1;
  }

  steps.push(
    createStepV2({
      index,
      latex: answerState.latex,
      legacyKind: 'answer',
      note: getFinalAnswerNote(),
      operation: {
        valueLatex: getAnswerValue(answerState.answer),
        variableLatex: 'x',
        type: 'final_answer'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, answerState.answer)
    })
  );

  return createProblemV2Draft(equation.raw, answerState.answer, steps);
};

const buildNativeInequalityStepsFromLinearState = (
  initialLatex: string,
  linearState: LinearEquationState,
  relation: Extract<ParsedEquation, {shape: 'linear-inequality'}>['relation'],
  startIndex: number
) => {
  const steps: AlgebraStepV2[] = [];
  let index = startIndex;
  let currentRight = linearState.right;
  let currentRelation = relation;
  let currentLatex = initialLatex;

  if (linearState.constant !== 0) {
    const movedSign = linearState.constant > 0 ? '-' : '+';
    const movedConstant = Math.abs(linearState.constant);
    currentRight = linearState.right - linearState.constant;

    steps.push(
      createStepV2({
        index,
        latex: `${formatCoefficientTerm(linearState.coefficient)}${formatRelationLatex(currentRelation)}${
          linearState.right
        }${movedSign}${movedConstant}`,
        legacyKind: 'move',
        note: getInequalityMoveNote(linearState.constant),
        operation: {
          fromSide: 'left',
          inverseTermLatex:
            linearState.constant > 0 ? `-${linearState.constant}` : `+${Math.abs(linearState.constant)}`,
          termLatex: formatSignedConstant(linearState.constant),
          toSide: 'right',
          type: 'move_term'
        },
        tokenMap: createMovedTokenMap(`s${index}`, linearState.coefficient, linearState.right, linearState.constant)
      })
    );
    currentLatex = steps[steps.length - 1].latex;
    index += 1;

    steps.push(
      createStepV2({
        index,
        latex: formatInequalityLatex(formatCoefficientTerm(linearState.coefficient), currentRelation, currentRight),
        legacyKind: 'transform',
        note: '计算右边',
        operation: {
          type: 'simplify_expression'
        },
        tokenMap: createAxEqualsValueTokenMap(`s${index}`, linearState.coefficient, currentRight)
      })
    );
    currentLatex = steps[steps.length - 1].latex;
    index += 1;
  }

  const shouldFlipRelation = linearState.coefficient < 0;
  const finalRelation = shouldFlipRelation ? flipInequalityRelation(currentRelation) : currentRelation;
  const answerValue = formatRational(currentRight, linearState.coefficient);
  const answer = `x${formatRelationLatex(finalRelation)}${answerValue}`;

  if (linearState.coefficient !== 1) {
    steps.push(
      createStepV2({
        index,
        latex: `x${formatRelationLatex(finalRelation)}${currentRight}\\div ${linearState.coefficient}`,
        legacyKind: 'transform',
        note: shouldFlipRelation
          ? getInequalityFlipNote(
              linearState.coefficient,
              formatRelationLatex(currentRelation),
              formatRelationLatex(finalRelation)
            )
          : getInequalityDivideNote(linearState.coefficient),
        operation: shouldFlipRelation
          ? {
              divisorLatex: String(linearState.coefficient),
              fromRelationLatex: formatRelationLatex(currentRelation),
              reason: `divide_by_${linearState.coefficient}`,
              toRelationLatex: formatRelationLatex(finalRelation),
              type: 'flip_inequality_sign'
            }
          : {
              divisorLatex: String(linearState.coefficient),
              type: 'divide_both_sides'
            },
        sourceLatex: currentLatex
      })
    );
    index += 1;
  }

  steps.push(
    createStepV2({
      index,
      latex: answer,
      legacyKind: 'answer',
      note: getSolveInequalityNote(answer),
      operation: {
        relationLatex: formatRelationLatex(finalRelation),
        valueLatex: answerValue,
        variableLatex: 'x',
        type: 'solve_inequality'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, answer)
    })
  );

  return {
    answer,
    steps
  };
};

const buildNativeLinearInequalityProblem = (
  equation: Extract<ParsedEquation, {shape: 'linear-inequality'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const initialLeftLatex = formatLinearLatex(equation.coefficient, equation.constant);
  const initialLatex = formatInequalityLatex(initialLeftLatex, equation.relation, equation.right);

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createLinearTokenMap(`s${index}`, equation.coefficient, equation.constant, equation.right, 'moving_term')
    })
  );
  index += 1;

  const result = buildNativeInequalityStepsFromLinearState(
    initialLatex,
    {
      coefficient: equation.coefficient,
      constant: equation.constant,
      latex: initialLatex,
      right: equation.right
    },
    equation.relation,
    index
  );

  return createProblemV2Draft(equation.raw, result.answer, [...steps, ...result.steps]);
};

const buildNativeDistributedInequalityProblem = (
  equation: Extract<ParsedEquation, {shape: 'distributed-inequality'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const initialLatex = formatInequalityLatex(
    `${equation.coefficient}(x${formatSignedConstant(equation.innerConstant)})`,
    equation.relation,
    equation.right
  );

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createDistributedTokenMap(`s${index}`, equation.coefficient, equation.innerConstant, equation.right)
    })
  );
  index += 1;

  const expandedCoefficient = equation.coefficient;
  const expandedConstant = equation.coefficient * equation.innerConstant;
  const expandedLatex = formatInequalityLatex(
    formatLinearLatex(expandedCoefficient, expandedConstant),
    equation.relation,
    equation.right
  );

  steps.push(
    createStepV2({
      index,
      latex: expandedLatex,
      legacyKind: 'expand',
      note: '展开括号',
      operation: {
        bracketLatex: `x${formatSignedConstant(equation.innerConstant)}`,
        factorLatex: String(equation.coefficient),
        type: 'expand_brackets'
      },
      tokenMap: createLinearTokenMap(`s${index}`, expandedCoefficient, expandedConstant, equation.right, 'moving_term')
    })
  );
  index += 1;

  const result = buildNativeInequalityStepsFromLinearState(
    expandedLatex,
    {
      coefficient: expandedCoefficient,
      constant: expandedConstant,
      latex: expandedLatex,
      right: equation.right
    },
    equation.relation,
    index
  );

  return createProblemV2Draft(equation.raw, result.answer, [...steps, ...result.steps]);
};

const buildNativeBracketFractionProblem = (
  equation: Extract<ParsedEquation, {shape: 'bracket-fraction'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const numeratorLatex = `x${formatSignedConstant(equation.innerConstant)}`;
  const initialLatex = `\\frac{${numeratorLatex}}{${equation.denominator}}=${equation.right}`;
  const clearedRight = equation.right * equation.denominator;

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createBracketFractionTokenMap(`s${index}`, equation.innerConstant, equation.denominator, equation.right)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: `${numeratorLatex}=${equation.right}\\cdot ${equation.denominator}`,
      legacyKind: 'transform',
      note: getMultiplyDenominatorNote(equation.denominator),
      operation: {
        denominatorLatex: String(equation.denominator),
        multiplierLatex: String(equation.denominator),
        type: 'clear_denominator'
      },
      tokenMap: createClearedBracketFractionTokenMap(
        `s${index}`,
        equation.innerConstant,
        equation.denominator,
        equation.right
      )
    })
  );
  index += 1;

  const clearedLatex = `${numeratorLatex}=${clearedRight}`;

  steps.push(
    createStepV2({
      index,
      latex: clearedLatex,
      legacyKind: 'transform',
      note: '计算乘法',
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createLinearTokenMap(`s${index}`, 1, equation.innerConstant, clearedRight, 'moving_term')
    })
  );
  index += 1;

  const result = buildNativeStepsFromLinearState(
    clearedLatex,
    {
      coefficient: 1,
      constant: equation.innerConstant,
      latex: clearedLatex,
      right: clearedRight
    },
    index
  );

  return createProblemV2Draft(equation.raw, result.answer, [...steps, ...result.steps]);
};

const buildNativeFractionInequalityWithConstantProblem = (
  equation: Extract<ParsedEquation, {shape: 'fraction-inequality-with-constant'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const fractionState = createFractionInequalityState(equation);

  steps.push(
    createStepV2({
      index,
      latex: fractionState.latex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createFractionTokenMap(`s${index}`, fractionState)
    })
  );
  index += 1;

  steps.push(
    createDomainRestrictionStep({
      denominator: equation.denominator,
      index
    })
  );
  index += 1;

  let currentRight = equation.right;
  let currentLatex = fractionState.latex;

  if (fractionState.constant !== 0) {
    const movedState = moveFractionInequalityConstant(fractionState);

    steps.push(
      createStepV2({
        index,
        latex: movedState.latex,
        legacyKind: 'move',
        note: getInequalityMoveNote(fractionState.constant),
        operation: {
          fromSide: 'left',
          inverseTermLatex:
            fractionState.constant > 0 ? `-${fractionState.constant}` : `+${Math.abs(fractionState.constant)}`,
          termLatex: formatSignedConstant(fractionState.constant),
          toSide: 'right',
          type: 'move_term'
        },
        tokenMap: createMovedFractionTokenMap(`s${index}`, fractionState.denominator, fractionState.right, fractionState.constant)
      })
    );
    index += 1;

    steps.push(
      createStepV2({
        index,
        latex: movedState.simplifiedLatex,
        legacyKind: 'transform',
        note: '计算右边',
        operation: {
          type: 'simplify_expression'
        },
        tokenMap: createFractionEqualsTokenMap(`s${index}`, movedState.denominator, movedState.right)
      })
    );
    currentRight = movedState.right;
    currentLatex = movedState.simplifiedLatex;
    index += 1;
  }

  const clearedState = clearFractionInequalityByDenominator({
    denominator: equation.denominator,
    relation: equation.relation,
    right: currentRight
  });

  steps.push(
    createStepV2({
      index,
      latex: clearedState.latex,
      legacyKind: 'transform',
      note: getFractionInequalityClearNote([equation.denominator], equation.denominator),
      operation: {
        denominatorLatex: String(equation.denominator),
        multiplierLatex: String(equation.denominator),
        type: 'clear_denominator'
      },
      sourceLatex: currentLatex
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: clearedState.simplifiedLatex,
      legacyKind: 'transform',
      note: '计算乘法',
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createAxEqualsValueTokenMap(`s${index}`, 1, clearedState.clearedRight)
    })
  );
  index += 1;

  const result = buildNativeInequalityStepsFromLinearState(
    clearedState.simplifiedLatex,
    {
      coefficient: 1,
      constant: 0,
      latex: clearedState.simplifiedLatex,
      right: clearedState.clearedRight
    },
    equation.relation,
    index
  );

  const allSteps = [...steps, ...result.steps];

  allSteps.push(
    createIntersectSolutionStep({
      answer: result.answer,
      denominator: equation.denominator,
      index: allSteps.length + 1
    })
  );

  return createProblemV2Draft(equation.raw, result.answer, allSteps);
};

const buildNativeBracketFractionInequalityProblem = (
  equation: Extract<ParsedEquation, {shape: 'bracket-fraction-inequality'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const numeratorLatex = `x${formatSignedConstant(equation.innerConstant)}`;
  const initialLatex = `\\frac{${numeratorLatex}}{${equation.denominator}}${formatRelationLatex(equation.relation)}${equation.right}`;
  const clearedRight = equation.right * equation.denominator;
  const clearedLatex = `${numeratorLatex}${formatRelationLatex(equation.relation)}${clearedRight}`;

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createBracketFractionTokenMap(`s${index}`, equation.innerConstant, equation.denominator, equation.right)
    })
  );
  index += 1;

  steps.push(
    createDomainRestrictionStep({
      denominator: equation.denominator,
      index
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: `${numeratorLatex}${formatRelationLatex(equation.relation)}${equation.right}\\cdot ${equation.denominator}`,
      legacyKind: 'transform',
      note: getFractionInequalityClearNote([equation.denominator], equation.denominator),
      operation: {
        denominatorLatex: String(equation.denominator),
        multiplierLatex: String(equation.denominator),
        type: 'clear_denominator'
      },
      tokenMap: createClearedBracketFractionTokenMap(
        `s${index}`,
        equation.innerConstant,
        equation.denominator,
        equation.right
      )
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: clearedLatex,
      legacyKind: 'transform',
      note: '计算乘法',
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createLinearTokenMap(`s${index}`, 1, equation.innerConstant, clearedRight, 'moving_term')
    })
  );
  index += 1;

  const result = buildNativeInequalityStepsFromLinearState(
    clearedLatex,
    {
      coefficient: 1,
      constant: equation.innerConstant,
      latex: clearedLatex,
      right: clearedRight
    },
    equation.relation,
    index
  );

  const allSteps = [...steps, ...result.steps];

  allSteps.push(
    createIntersectSolutionStep({
      answer: result.answer,
      denominator: equation.denominator,
      index: allSteps.length + 1
    })
  );

  return createProblemV2Draft(equation.raw, result.answer, allSteps);
};

const buildNativeReciprocalVariableDenominatorInequalityProblem = (
  equation: Extract<ParsedEquation, {shape: 'reciprocal-variable-denominator-inequality'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const denominatorLatex = formatVariableDenominatorLatex(equation.innerConstant);
  const initialLatex = `\\frac{1}{${denominatorLatex}}${formatRelationLatex(equation.relation)}0`;
  const criticalPoint = getCriticalPointValue(equation.innerConstant);
  const answer = `x${formatRelationLatex(equation.relation)}${criticalPoint}`;

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: [createToken(`s${index}`, 'fraction', `\\frac{1}{${denominatorLatex}}`, 'left_term')]
    })
  );
  index += 1;

  steps.push(
    createVariableDenominatorDomainRestrictionStep({
      index,
      innerConstant: equation.innerConstant
    })
  );
  index += 1;

  steps.push(
    createFindCriticalPointStep({
      index,
      innerConstant: equation.innerConstant
    })
  );
  index += 1;

  steps.push(
    createAnalyzeSignIntervalStep({
      index,
      innerConstant: equation.innerConstant,
      relation: equation.relation
    })
  );
  index += 1;

  steps.push(
    createVariableDenominatorIntersectSolutionStep({
      answer,
      index,
      innerConstant: equation.innerConstant
    })
  );

  return createProblemV2Draft(equation.raw, answer, steps);
};

const buildNativeFractionVariableDenominatorInequalityProblem = (
  equation: Extract<ParsedEquation, {shape: 'fraction-variable-denominator-inequality'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const denominatorLatex = formatVariableDenominatorLatex(equation.denominatorInnerConstant);
  const initialLatex = `\\frac{x}{${denominatorLatex}}${formatRelationLatex(equation.relation)}${equation.right}`;
  const numeratorCoefficient = 1 - equation.right;
  const numeratorConstant = -equation.right * equation.denominatorInnerConstant;
  const combinedLatex = `\\frac{${formatLinearLatex(numeratorCoefficient, numeratorConstant)}}{${denominatorLatex}}${formatRelationLatex(
    equation.relation
  )}0`;

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createFractionVariableDenominatorTokenMap(`s${index}`, equation.denominatorInnerConstant, equation.right)
    })
  );
  index += 1;

  steps.push(
    createVariableDenominatorDomainRestrictionStep({
      index,
      innerConstant: equation.denominatorInnerConstant
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: `\\frac{x}{${denominatorLatex}}${formatSignedConstant(-equation.right)}${formatRelationLatex(equation.relation)}0`,
      legacyKind: 'move',
      note: getInequalityMoveNote(equation.right),
      operation: {
        fromSide: 'right',
        inverseTermLatex: formatSignedConstant(-equation.right),
        termLatex: String(equation.right),
        toSide: 'left',
        type: 'move_term'
      },
      tokenMap: createMovedFractionVariableDenominatorTokenMap(`s${index}`, equation.denominatorInnerConstant, equation.right)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: combinedLatex,
      legacyKind: 'transform',
      note: '通分并化成同分母分式',
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, combinedLatex)
    })
  );
  index += 1;

  steps.push(
    createMultiCriticalPointStep({
      denominatorInnerConstant: equation.denominatorInnerConstant,
      index,
      numeratorCoefficient,
      numeratorConstant
    })
  );
  index += 1;

  const analyzeStep = createMultiIntervalSignStep({
    denominatorInnerConstant: equation.denominatorInnerConstant,
    index,
    numeratorCoefficient,
    numeratorConstant,
    relation: equation.relation
  });
  steps.push(analyzeStep);
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: analyzeStep.latex,
      legacyKind: 'answer',
      note: getMultiIntervalIntersectNote(`x=${formatIntervalEndpoint(getCriticalPointValue(equation.denominatorInnerConstant))}`),
      operation: {
        baseSolutionLatex: analyzeStep.latex,
        restrictionLatex: getVariableRestrictionAnswerLatex(equation.denominatorInnerConstant),
        resultLatex: analyzeStep.latex,
        type: 'intersect_solution_set'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, analyzeStep.latex)
    })
  );

  return createProblemV2Draft(equation.raw, analyzeStep.latex, steps);
};

const buildNativeStandardRationalInequalityProblem = (
  equation: Extract<ParsedEquation, {shape: 'standard-rational-inequality'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const numeratorLatex = formatLinearLatex(1, equation.numeratorInnerConstant);
  const denominatorLatex = formatVariableDenominatorLatex(equation.denominatorInnerConstant);
  const initialLatex = `\\frac{${numeratorLatex}}{${denominatorLatex}}${formatRelationLatex(equation.relation)}0`;

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createStandardRationalInequalityTokenMap(
        `s${index}`,
        equation.numeratorInnerConstant,
        equation.denominatorInnerConstant
      )
    })
  );
  index += 1;

  steps.push(
    createVariableDenominatorDomainRestrictionStep({
      index,
      innerConstant: equation.denominatorInnerConstant
    })
  );
  index += 1;

  steps.push(
    createMultiCriticalPointStep({
      denominatorInnerConstant: equation.denominatorInnerConstant,
      index,
      numeratorCoefficient: 1,
      numeratorConstant: equation.numeratorInnerConstant
    })
  );
  index += 1;

  const analyzeStep = createMultiIntervalSignStep({
    denominatorInnerConstant: equation.denominatorInnerConstant,
    index,
    numeratorCoefficient: 1,
    numeratorConstant: equation.numeratorInnerConstant,
    relation: equation.relation
  });
  steps.push(analyzeStep);
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: analyzeStep.latex,
      legacyKind: 'answer',
      note: getMultiIntervalIntersectNote(`x=${formatIntervalEndpoint(getCriticalPointValue(equation.denominatorInnerConstant))}`),
      operation: {
        baseSolutionLatex: analyzeStep.latex,
        restrictionLatex: getVariableRestrictionAnswerLatex(equation.denominatorInnerConstant),
        resultLatex: analyzeStep.latex,
        type: 'intersect_solution_set'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, analyzeStep.latex)
    })
  );

  return createProblemV2Draft(equation.raw, analyzeStep.latex, steps);
};

const buildNativeLinearSystemSubstitutionBasicProblem = (
  equation: Extract<ParsedEquation, {shape: 'linear-system-substitution-basic'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const sourceEquationLatex = `x+y=${equation.firstRight}`;
  const targetEquationLatex = `x-y=${equation.secondRight}`;
  const rewrittenLatex = `y=${equation.firstRight}-x`;
  const substitutedLatex = `x-(${equation.firstRight}-x)=${equation.secondRight}`;
  const simplifiedSubstitutionLatex = `${formatCoefficientTerm(2)}${formatSignedConstant(-equation.firstRight)}=${equation.secondRight}`;
  const linearState: LinearEquationState = {
    coefficient: 2,
    constant: -equation.firstRight,
    latex: simplifiedSubstitutionLatex,
    right: equation.secondRight
  };

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: rewrittenLatex,
      legacyKind: 'transform',
      note: getRewriteSystemEquationNote(sourceEquationLatex, rewrittenLatex),
      operation: {
        rewrittenLatex,
        sourceEquationLatex,
        targetVariableLatex: 'y',
        type: 'rewrite_equation_for_substitution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, rewrittenLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: substitutedLatex,
      legacyKind: 'transform',
      note: getSubstituteExpressionNote(rewrittenLatex, targetEquationLatex),
      operation: {
        sourceEquationLatex: rewrittenLatex,
        sourceVariableLatex: 'y',
        substitutedExpressionLatex: `${equation.firstRight}-x`,
        targetEquationLatex,
        type: 'substitute_expression'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, substitutedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: simplifiedSubstitutionLatex,
      legacyKind: 'transform',
      note: getSystemSimplifyAfterSubstitutionNote(),
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createLinearTokenMap(`s${index}`, linearState.coefficient, linearState.constant, linearState.right, 'moving_term')
    })
  );
  index += 1;

  const linearResult = buildNativeStepsFromLinearState(simplifiedSubstitutionLatex, linearState, index);
  const solvedLinearSteps = linearResult.steps.map((step) => toSolveSingleVariableStep(step, 'x'));
  steps.push(...solvedLinearSteps);
  index += solvedLinearSteps.length;

  const xNumerator = equation.firstRight + equation.secondRight;
  const xDenominator = 2;
  const yNumerator = equation.firstRight - equation.secondRight;
  const yDenominator = 2;
  const xValueLatex = formatRational(xNumerator, xDenominator);
  const yValueLatex = formatRational(yNumerator, yDenominator);
  const xSolutionLatex = `x=${xValueLatex}`;
  const ySolutionLatex = `y=${yValueLatex}`;
  const backSubstituteLatex = `y=${equation.firstRight}-${xValueLatex}=${yValueLatex}`;
  const solutionPairLatex = formatSystemSolutionPairLatex(xValueLatex, yValueLatex);

  steps.push(
    createStepV2({
      index,
      latex: backSubstituteLatex,
      legacyKind: 'transform',
      note: getBackSubstituteSolutionNote(xSolutionLatex, ySolutionLatex),
      operation: {
        knownSolutionLatex: xSolutionLatex,
        resultLatex: ySolutionLatex,
        targetEquationLatex: rewrittenLatex,
        type: 'back_substitute_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, backSubstituteLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: solutionPairLatex,
      legacyKind: 'answer',
      note: getCollectSystemSolutionNote(solutionPairLatex),
      operation: {
        classification: 'unique_solution',
        solutionPairLatex,
        type: 'collect_system_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, solutionPairLatex)
    })
  );

  return createProblemV2Draft(equation.raw, solutionPairLatex, steps);
};

const buildNativeLinearSystemSubstitutionSolvedProblem = (
  equation: Extract<ParsedEquation, {shape: 'linear-system-substitution-solved'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const rewrittenLatex = `y=${formatCoefficientTerm(equation.solvedSlope)}${formatSignedConstant(equation.solvedConstant)}`;
  const targetEquationLatex = `x+y=${equation.targetRight}`;
  const substitutedLatex = `x+(${formatCoefficientTerm(equation.solvedSlope)}${formatSignedConstant(
    equation.solvedConstant
  )})=${equation.targetRight}`;
  const combinedCoefficient = equation.solvedSlope + 1;
  const simplifiedSubstitutionLatex = `${formatCoefficientTerm(combinedCoefficient)}${formatSignedConstant(
    equation.solvedConstant
  )}=${equation.targetRight}`;
  const linearState: LinearEquationState = {
    coefficient: combinedCoefficient,
    constant: equation.solvedConstant,
    latex: simplifiedSubstitutionLatex,
    right: equation.targetRight
  };

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: rewrittenLatex,
      legacyKind: 'transform',
      note: getDirectRewriteSystemEquationNote(rewrittenLatex),
      operation: {
        rewrittenLatex,
        sourceEquationLatex: rewrittenLatex,
        targetVariableLatex: 'y',
        type: 'rewrite_equation_for_substitution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, rewrittenLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: substitutedLatex,
      legacyKind: 'transform',
      note: getSubstituteExpressionNote(rewrittenLatex, targetEquationLatex),
      operation: {
        sourceEquationLatex: rewrittenLatex,
        sourceVariableLatex: 'y',
        substitutedExpressionLatex: `${formatCoefficientTerm(equation.solvedSlope)}${formatSignedConstant(equation.solvedConstant)}`,
        targetEquationLatex,
        type: 'substitute_expression'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, substitutedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: simplifiedSubstitutionLatex,
      legacyKind: 'transform',
      note: getSystemSimplifyAfterSubstitutionNote(),
      operation: {
        groups: [
          {
            category: 'variable',
            resultLatex: formatCoefficientTerm(combinedCoefficient),
            termsLatex: ['x', formatSignedCoefficientTerm(equation.solvedSlope)]
          }
        ],
        type: 'combine_like_terms'
      },
      tokenMap: createLinearTokenMap(`s${index}`, linearState.coefficient, linearState.constant, linearState.right, 'moving_term')
    })
  );
  index += 1;

  const linearResult = buildNativeStepsFromLinearState(simplifiedSubstitutionLatex, linearState, index);
  const solvedLinearSteps = linearResult.steps.map((step) => toSolveSingleVariableStep(step, 'x'));
  steps.push(...solvedLinearSteps);
  index += solvedLinearSteps.length;

  const xNumerator = equation.targetRight - equation.solvedConstant;
  const xDenominator = combinedCoefficient;
  const yNumerator = equation.solvedSlope * xNumerator + equation.solvedConstant * xDenominator;
  const yDenominator = xDenominator;
  const xValueLatex = formatRational(xNumerator, xDenominator);
  const yValueLatex = formatRational(yNumerator, yDenominator);
  const xSolutionLatex = `x=${xValueLatex}`;
  const ySolutionLatex = `y=${yValueLatex}`;
  const backSubstituteLatex = `y=${equation.solvedSlope}\\cdot${xValueLatex}${formatSignedConstant(
    equation.solvedConstant
  )}=${yValueLatex}`;
  const solutionPairLatex = formatSystemSolutionPairLatex(xValueLatex, yValueLatex);

  steps.push(
    createStepV2({
      index,
      latex: backSubstituteLatex,
      legacyKind: 'transform',
      note: getBackSubstituteSolutionNote(xSolutionLatex, ySolutionLatex),
      operation: {
        knownSolutionLatex: xSolutionLatex,
        resultLatex: ySolutionLatex,
        targetEquationLatex: rewrittenLatex,
        type: 'back_substitute_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, backSubstituteLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: solutionPairLatex,
      legacyKind: 'answer',
      note: getCollectSystemSolutionNote(solutionPairLatex),
      operation: {
        classification: 'unique_solution',
        solutionPairLatex,
        type: 'collect_system_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, solutionPairLatex)
    })
  );

  return createProblemV2Draft(equation.raw, solutionPairLatex, steps);
};

const buildNativeLinearSystemEliminationBasicProblem = (
  equation: Extract<ParsedEquation, {shape: 'linear-system-elimination-basic'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const firstEquationLatex = `${formatCoefficientTerm(equation.xCoefficient)}+y=${equation.firstRight}`;
  const secondEquationLatex = `${formatCoefficientTerm(equation.xCoefficient)}-y=${equation.secondRight}`;
  const eliminatedLatex = `${formatCoefficientTerm(equation.xCoefficient * 2)}=${equation.firstRight}${formatSignedConstant(
    equation.secondRight
  )}`;
  const simplifiedEliminatedLatex = `${formatCoefficientTerm(equation.xCoefficient * 2)}=${equation.firstRight + equation.secondRight}`;
  const linearState: LinearEquationState = {
    coefficient: equation.xCoefficient * 2,
    constant: 0,
    latex: simplifiedEliminatedLatex,
    right: equation.firstRight + equation.secondRight
  };

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: eliminatedLatex,
      legacyKind: 'transform',
      note: getEliminateVariableNote([firstEquationLatex, secondEquationLatex], 'y', 'add'),
      operation: {
        eliminatedVariableLatex: 'y',
        methodLatex: 'add',
        resultEquationLatex: eliminatedLatex,
        sourceEquationsLatex: [firstEquationLatex, secondEquationLatex],
        type: 'eliminate_variable'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, eliminatedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: simplifiedEliminatedLatex,
      legacyKind: 'transform',
      note: getSystemSimplifyAfterEliminationNote(),
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createAxEqualsValueTokenMap(`s${index}`, linearState.coefficient, linearState.right)
    })
  );
  index += 1;

  const linearResult = buildNativeStepsFromLinearState(simplifiedEliminatedLatex, linearState, index);
  const solvedLinearSteps = linearResult.steps.map((step) => toSolveSingleVariableStep(step, 'x'));
  steps.push(...solvedLinearSteps);
  index += solvedLinearSteps.length;

  const xValueLatex = formatRational(equation.firstRight + equation.secondRight, equation.xCoefficient * 2);
  const yValueLatex = formatRational(equation.firstRight - equation.secondRight, 2);
  const xSolutionLatex = `x=${xValueLatex}`;
  const ySolutionLatex = `y=${yValueLatex}`;
  const backSubstituteLatex = `y=${equation.firstRight}-${equation.xCoefficient}\\cdot${xValueLatex}=${yValueLatex}`;
  const solutionPairLatex = formatSystemSolutionPairLatex(xValueLatex, yValueLatex);

  steps.push(
    createStepV2({
      index,
      latex: backSubstituteLatex,
      legacyKind: 'transform',
      note: getBackSubstituteSolutionNote(xSolutionLatex, ySolutionLatex),
      operation: {
        knownSolutionLatex: xSolutionLatex,
        resultLatex: ySolutionLatex,
        targetEquationLatex: firstEquationLatex,
        type: 'back_substitute_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, backSubstituteLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: solutionPairLatex,
      legacyKind: 'answer',
      note: getCollectSystemSolutionNote(solutionPairLatex),
      operation: {
        classification: 'unique_solution',
        solutionPairLatex,
        type: 'collect_system_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, solutionPairLatex)
    })
  );

  return createProblemV2Draft(equation.raw, solutionPairLatex, steps);
};

const buildNativeLinearSystemNoSolutionBasicProblem = (
  equation: Extract<ParsedEquation, {shape: 'linear-system-no-solution-basic'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const firstEquationLatex = `x+y=${equation.firstRight}`;
  const secondEquationLatex = `x+y=${equation.secondRight}`;
  const eliminatedLatex = `0=${equation.firstRight}${formatSignedConstant(-equation.secondRight)}`;
  const simplifiedLatex = `0=${equation.firstRight - equation.secondRight}`;
  const classifyLatex = `0\\ne${equation.firstRight - equation.secondRight}`;
  const conclusionLatex = '\\text{无解}';

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: eliminatedLatex,
      legacyKind: 'transform',
      note: getEliminateToClassifySystemNote([firstEquationLatex, secondEquationLatex]),
      operation: {
        eliminatedVariableLatex: 'x 和 y',
        methodLatex: 'subtract',
        resultEquationLatex: eliminatedLatex,
        sourceEquationsLatex: [firstEquationLatex, secondEquationLatex],
        type: 'eliminate_variable'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, eliminatedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: simplifiedLatex,
      legacyKind: 'transform',
      note: getSystemClassificationSimplifyNote(),
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, simplifiedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: classifyLatex,
      legacyKind: 'transform',
      note: getClassifyNoSolutionNote(simplifiedLatex),
      operation: {
        classification: 'no_solution',
        reasonLatex: simplifiedLatex,
        type: 'classify_system_result'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, classifyLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: conclusionLatex,
      legacyKind: 'answer',
      note: getStateNoSolutionNote(),
      operation: {
        conclusionLatex,
        type: 'state_no_solution'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, conclusionLatex)
    })
  );

  return createProblemV2Draft(equation.raw, conclusionLatex, steps);
};

const buildNativeLinearSystemInfiniteSolutionsBasicProblem = (
  equation: Extract<ParsedEquation, {shape: 'linear-system-infinite-solutions-basic'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const firstEquationLatex = `x+y=${equation.firstRight}`;
  const secondEquationLatex = `2x+2y=${equation.secondRight}`;
  const eliminatedLatex = `0=${equation.secondRight}${formatSignedConstant(-(equation.firstRight * 2))}`;
  const simplifiedLatex = '0=0';
  const conclusionLatex = '\\text{无穷多解}';

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: eliminatedLatex,
      legacyKind: 'transform',
      note: getEliminateToClassifySystemNote(
        [firstEquationLatex, secondEquationLatex],
        `先把 ${firstEquationLatex} 对齐成 2x+2y=${equation.firstRight * 2}`
      ),
      operation: {
        eliminatedVariableLatex: 'x 和 y',
        methodLatex: 'subtract',
        resultEquationLatex: eliminatedLatex,
        sourceEquationsLatex: [firstEquationLatex, secondEquationLatex],
        type: 'eliminate_variable'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, eliminatedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: simplifiedLatex,
      legacyKind: 'transform',
      note: getSystemClassificationSimplifyNote(),
      operation: {
        type: 'simplify_expression'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, simplifiedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: simplifiedLatex,
      legacyKind: 'transform',
      note: getClassifyInfiniteSolutionsNote(simplifiedLatex),
      operation: {
        classification: 'infinite_solutions',
        reasonLatex: simplifiedLatex,
        type: 'classify_system_result'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, simplifiedLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: conclusionLatex,
      legacyKind: 'answer',
      note: getStateInfiniteSolutionsNote(),
      operation: {
        conclusionLatex,
        type: 'state_infinite_solutions'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, conclusionLatex)
    })
  );

  return createProblemV2Draft(equation.raw, conclusionLatex, steps);
};

const buildNativeQuadraticFactoredProblem = (equation: Extract<ParsedEquation, {shape: 'quadratic-factored'}>) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const factorsLatex = [
    formatQuadraticFactorLatex(equation.leftFactorInnerConstant),
    formatQuadraticFactorLatex(equation.rightFactorInnerConstant)
  ];
  const factoredLatex = `${factorsLatex[0]}${factorsLatex[1]}=0`;
  const branchEquationsLatex = [
    formatQuadraticBranchEquationLatex(equation.leftFactorInnerConstant),
    formatQuadraticBranchEquationLatex(equation.rightFactorInnerConstant)
  ];
  const zeroProductLatex = formatSolutionBranchesLatex(branchEquationsLatex);
  const {branchesLatex, resultLatex} = getQuadraticBranchSummary([
    equation.leftFactorInnerConstant,
    equation.rightFactorInnerConstant
  ]);

  steps.push(
    createStepV2({
      index,
      latex: factoredLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createQuadraticFactoredTokenMap(`s${index}`, factorsLatex[0], factorsLatex[1])
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: factoredLatex,
      legacyKind: 'transform',
      note: getSplitLinearFactorsNote(factorsLatex),
      operation: {
        factorsLatex,
        type: 'split_into_linear_factors'
      },
      tokenMap: createQuadraticFactoredTokenMap(`s${index}`, factorsLatex[0], factorsLatex[1])
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: zeroProductLatex,
      legacyKind: 'transform',
      note: getZeroProductRuleNote(factorsLatex, branchEquationsLatex),
      operation: {
        branchEquationsLatex,
        factorsLatex,
        type: 'apply_zero_product_rule'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, zeroProductLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: resultLatex,
      legacyKind: 'answer',
      note: getCollectQuadraticOutcomeNote(branchesLatex),
      operation: {
        branchesLatex,
        resultLatex,
        type: 'collect_solution_branches'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, resultLatex)
    })
  );

  return createProblemV2Draft(equation.raw, resultLatex, steps);
};

const buildNativeQuadraticStandardFactorableProblem = (
  equation: Extract<ParsedEquation, {shape: 'quadratic-standard-factorable'}>
) => {
  const factorPair = getMonicQuadraticFactorPair(equation.linearCoefficient, equation.constant);

  if (!factorPair) {
    return null;
  }

  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const factorsLatex = [formatQuadraticFactorLatex(factorPair[0]), formatQuadraticFactorLatex(factorPair[1])];
  const factoredLatex = `${factorsLatex[0]}${factorsLatex[1]}=0`;
  const branchEquationsLatex = [
    formatQuadraticBranchEquationLatex(factorPair[0]),
    formatQuadraticBranchEquationLatex(factorPair[1])
  ];
  const zeroProductLatex = formatSolutionBranchesLatex(branchEquationsLatex);
  const {branchesLatex, resultLatex} = getQuadraticBranchSummary(factorPair);

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: factoredLatex,
      legacyKind: 'transform',
      note: getQuadraticFactorNote({
        constant: equation.constant,
        factoredLatex,
        linearCoefficient: equation.linearCoefficient
      }),
      operation: {
        factoredLatex,
        sourceLatex: equation.raw,
        type: 'factor_quadratic'
      },
      tokenMap: createQuadraticFactoredTokenMap(`s${index}`, factorsLatex[0], factorsLatex[1])
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: factoredLatex,
      legacyKind: 'transform',
      note: getSplitLinearFactorsNote(factorsLatex),
      operation: {
        factorsLatex,
        type: 'split_into_linear_factors'
      },
      tokenMap: createQuadraticFactoredTokenMap(`s${index}`, factorsLatex[0], factorsLatex[1])
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: zeroProductLatex,
      legacyKind: 'transform',
      note: getZeroProductRuleNote(factorsLatex, branchEquationsLatex),
      operation: {
        branchEquationsLatex,
        factorsLatex,
        type: 'apply_zero_product_rule'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, zeroProductLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: resultLatex,
      legacyKind: 'answer',
      note: getCollectQuadraticOutcomeNote(branchesLatex),
      operation: {
        branchesLatex,
        resultLatex,
        type: 'collect_solution_branches'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, resultLatex)
    })
  );

  return createProblemV2Draft(equation.raw, resultLatex, steps);
};

const buildNativeQuadraticSquareRootProblem = (equation: Extract<ParsedEquation, {shape: 'quadratic-square-root'}>) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const squaredLatex = formatQuadraticSquaredLatex(equation.innerConstant);
  const squaredBaseLatex = formatQuadraticSquareBaseLatex(equation.innerConstant);
  const initialLatex = `${squaredLatex}=${equation.right}`;
  const {branchEquationsLatex, branchesLatex, squareRootValue} = getSquareRootBranchValues(
    equation.innerConstant,
    equation.right
  );
  const extractLatex = `${squaredBaseLatex}=\\pm${squareRootValue}`;
  const resultLatex = formatSolutionBranchesLatex(branchesLatex);

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createQuadraticSquareRootTokenMap(`s${index}`, squaredLatex, equation.right)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: extractLatex,
      legacyKind: 'transform',
      note: getExtractSquareRootNote(squaredBaseLatex, squareRootValue),
      operation: {
        branchesLatex: branchEquationsLatex,
        radicandLatex: String(equation.right),
        type: 'extract_square_root'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, extractLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: resultLatex,
      legacyKind: 'answer',
      note: getCollectQuadraticOutcomeNote(branchesLatex),
      operation: {
        branchesLatex,
        resultLatex,
        type: 'collect_solution_branches'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, resultLatex)
    })
  );

  return createProblemV2Draft(equation.raw, resultLatex, steps);
};

const buildNativeQuadraticFormulaProblem = (
  equation: Extract<
    ParsedEquation,
    {
      shape:
        | 'quadratic-formula-double-root'
        | 'quadratic-formula-no-real-root'
        | 'quadratic-formula-two-real-roots';
    }
  >
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const coefficientsLatex = {
    a: String(equation.quadraticCoefficient),
    b: String(equation.linearCoefficient),
    c: String(equation.constant)
  };
  const discriminantLatex = formatDiscriminantLatex(
    equation.quadraticCoefficient,
    equation.linearCoefficient,
    equation.constant,
    equation.discriminant
  );
  const classification =
    equation.shape === 'quadratic-formula-no-real-root'
      ? 'no_real_root'
      : equation.shape === 'quadratic-formula-double-root'
        ? 'double_root'
        : 'two_real_roots';
  const classifyLatex =
    equation.discriminant > 0
      ? `\\Delta=${equation.discriminant}>0`
      : equation.discriminant === 0
        ? `\\Delta=0`
        : `\\Delta=${equation.discriminant}<0`;

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, equation.raw)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: discriminantLatex,
      legacyKind: 'transform',
      note: getComputeDiscriminantNote(
        equation.quadraticCoefficient,
        equation.linearCoefficient,
        equation.constant,
        equation.discriminant
      ),
      operation: {
        coefficientsLatex,
        discriminantLatex: String(equation.discriminant),
        substitutionLatex: discriminantLatex,
        type: 'compute_discriminant'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, discriminantLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: classifyLatex,
      legacyKind: 'transform',
      note:
        classification === 'two_real_roots'
          ? getClassifyRootCountNote(equation.discriminant)
          : classification === 'double_root'
            ? getClassifyDoubleRootNote(equation.discriminant)
            : getClassifyNoRealRootNote(equation.discriminant),
      operation: {
        classification,
        discriminantLatex: String(equation.discriminant),
        relationLatex: equation.discriminant > 0 ? '>0' : equation.discriminant === 0 ? '=0' : '<0',
        type: 'classify_root_count'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, classifyLatex)
    })
  );
  index += 1;

  if (classification === 'no_real_root') {
    const conclusionLatex = '\\text{无实数解}';

    steps.push(
      createStepV2({
        index,
        latex: conclusionLatex,
        legacyKind: 'answer',
        note: getNoRealSolutionNote(equation.discriminant),
        operation: {
          conclusionLatex,
          discriminantLatex: String(equation.discriminant),
          type: 'state_no_real_solution'
        },
        tokenMap: createAnswerTokenMap(`s${index}`, conclusionLatex)
      })
    );

    return createProblemV2Draft(equation.raw, conclusionLatex, steps);
  }

  const formulaLatex = formatQuadraticFormulaStepLatex(
    equation.quadraticCoefficient,
    equation.linearCoefficient,
    equation.discriminant
  );
  const branchesLatex =
    classification === 'double_root'
      ? [getQuadraticDoubleRootLatex(equation.quadraticCoefficient, equation.linearCoefficient)]
      : getQuadraticFormulaBranches(
          equation.quadraticCoefficient,
          equation.linearCoefficient,
          equation.discriminant
        );
  const resultLatex = formatSolutionBranchesLatex(branchesLatex);

  steps.push(
    createStepV2({
      index,
      latex: formulaLatex,
      legacyKind: 'transform',
      note:
        classification === 'double_root'
          ? getApplyQuadraticFormulaDoubleRootNote(
              equation.quadraticCoefficient,
              equation.linearCoefficient,
              equation.constant,
              branchesLatex[0] ?? 'x=0'
            )
          : getApplyQuadraticFormulaNote(
              equation.quadraticCoefficient,
              equation.linearCoefficient,
              equation.constant,
              branchesLatex
            ),
      operation: {
        branchesLatex,
        coefficientsLatex,
        discriminantLatex: String(equation.discriminant),
        formulaLatex,
        type: 'apply_quadratic_formula'
      },
      tokenMap: createInequalityAnswerTokenMap(`s${index}`, formulaLatex)
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: resultLatex,
      legacyKind: 'answer',
      note: getCollectQuadraticOutcomeNote(branchesLatex),
      operation: {
        branchesLatex,
        resultLatex,
        type: 'collect_solution_branches'
      },
      tokenMap: createAnswerTokenMap(`s${index}`, resultLatex)
    })
  );

  return createProblemV2Draft(equation.raw, resultLatex, steps);
};

const buildNativeFractionSumProblem = (
  equation: Extract<ParsedEquation, {shape: 'fraction-sum'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const multiplier = getLeastCommonMultiple(equation.leftDenominator, equation.rightDenominator);
  const leftCoefficient = multiplier / equation.leftDenominator;
  const rightCoefficient = multiplier / equation.rightDenominator;
  const clearedRight = equation.right * multiplier;
  const initialLatex = `${formatFractionLatex(equation.leftDenominator)}+${formatFractionLatex(
    equation.rightDenominator
  )}=${equation.right}`;

  steps.push(
    createStepV2({
      index,
      latex: initialLatex,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      },
      tokenMap: createFractionSumTokenMap(
        `s${index}`,
        equation.leftDenominator,
        equation.rightDenominator,
        equation.right
      )
    })
  );
  index += 1;

  const clearedLatex = `${formatCoefficientTerm(leftCoefficient)}${formatSignedCoefficientTerm(
    rightCoefficient
  )}=${clearedRight}`;

  steps.push(
    createStepV2({
      index,
      latex: clearedLatex,
      legacyKind: 'transform',
      note: getLeastCommonMultipleNote([equation.leftDenominator, equation.rightDenominator], multiplier),
      operation: {
        denominatorsLatex: [String(equation.leftDenominator), String(equation.rightDenominator)],
        multiplierLatex: String(multiplier),
        type: 'clear_denominator'
      },
      tokenMap: createTwoVariableTermTokenMap(`s${index}`, leftCoefficient, rightCoefficient, clearedRight)
    })
  );
  index += 1;

  const combinedCoefficient = leftCoefficient + rightCoefficient;
  const combinedLatex = `${formatCoefficientTerm(combinedCoefficient)}=${clearedRight}`;

  steps.push(
    createStepV2({
      index,
      latex: combinedLatex,
      legacyKind: 'transform',
      note: '合并同类项',
      operation: {
        groups: [
          {
            category: 'variable',
            resultLatex: formatCoefficientTerm(combinedCoefficient),
            termsLatex: [formatCoefficientTerm(leftCoefficient), formatSignedCoefficientTerm(rightCoefficient)]
          }
        ],
        type: 'combine_like_terms'
      },
      tokenMap: createAxEqualsValueTokenMap(`s${index}`, combinedCoefficient, clearedRight)
    })
  );
  index += 1;

  const result = buildNativeStepsFromLinearState(
    combinedLatex,
    {
      coefficient: combinedCoefficient,
      constant: 0,
      latex: combinedLatex,
      right: clearedRight
    },
    index,
    {
      divideNote: getFractionDivideNote
    }
  );

  return createProblemV2Draft(equation.raw, result.answer, [...steps, ...result.steps]);
};

const buildNativeMultiDistributedProblem = (
  equation: Extract<ParsedEquation, {shape: 'multi-distributed'}>
) => {
  const steps: AlgebraStepV2[] = [];
  let index = 1;
  const leftExpandedConstant = equation.leftCoefficient * equation.leftInnerConstant;
  const rightExpandedConstant = equation.rightCoefficient * equation.rightInnerConstant;
  const expandedLatex = `${formatCoefficientTerm(equation.leftCoefficient)}${formatSignedConstant(
    leftExpandedConstant
  )}${formatSignedCoefficientTerm(equation.rightCoefficient)}${formatSignedConstant(rightExpandedConstant)}=${
    equation.right
  }`;
  const combinedCoefficient = equation.leftCoefficient + equation.rightCoefficient;
  const combinedConstant = leftExpandedConstant + rightExpandedConstant;
  const combinedLatex = `${formatLinearLatex(combinedCoefficient, combinedConstant)}=${equation.right}`;

  steps.push(
    createStepV2({
      index,
      latex: equation.raw,
      legacyKind: 'write',
      operation: {
        type: 'write_equation'
      }
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: expandedLatex,
      legacyKind: 'expand',
      note: '分别展开两个括号',
      operation: {
        expansions: [
          {
            bracketLatex: `x${formatSignedConstant(equation.leftInnerConstant)}`,
            factorLatex: String(equation.leftCoefficient),
            resultLatex: `${formatCoefficientTerm(equation.leftCoefficient)}${formatSignedConstant(
              leftExpandedConstant
            )}`
          },
          {
            bracketLatex: `x${formatSignedConstant(equation.rightInnerConstant)}`,
            factorLatex: String(equation.rightCoefficient),
            resultLatex: `${formatCoefficientTerm(equation.rightCoefficient)}${formatSignedConstant(
              rightExpandedConstant
            )}`
          }
        ],
        type: 'expand_brackets'
      },
      tokenMap: [
        createToken(`s${index}`, 'left-term', formatCoefficientTerm(equation.leftCoefficient), 'expanded_left_term left_term'),
        createToken(`s${index}`, 'left-constant', formatSignedConstant(leftExpandedConstant), 'expanded_right_term'),
        createToken(`s${index}`, 'right-term', formatSignedCoefficientTerm(equation.rightCoefficient), 'left_term'),
        createToken(`s${index}`, 'right-constant', formatSignedConstant(rightExpandedConstant), 'moving_term'),
        createToken(`s${index}`, 'right-value', String(equation.right), 'right_value')
      ]
    })
  );
  index += 1;

  steps.push(
    createStepV2({
      index,
      latex: combinedLatex,
      legacyKind: 'transform',
      note: '合并同类项',
      operation: {
        groups: [
          {
            category: 'variable',
            resultLatex: formatCoefficientTerm(combinedCoefficient),
            termsLatex: [
              formatCoefficientTerm(equation.leftCoefficient),
              formatSignedCoefficientTerm(equation.rightCoefficient)
            ]
          },
          {
            category: 'constant',
            resultLatex: formatSignedConstant(combinedConstant),
            termsLatex: [formatSignedConstant(leftExpandedConstant), formatSignedConstant(rightExpandedConstant)]
          }
        ],
        type: 'combine_like_terms'
      },
      tokenMap: createLinearTokenMap(`s${index}`, combinedCoefficient, combinedConstant, equation.right, 'moving_term')
    })
  );
  index += 1;

  const result = buildNativeStepsFromLinearState(
    combinedLatex,
    {
      coefficient: combinedCoefficient,
      constant: combinedConstant,
      latex: combinedLatex,
      right: equation.right
    },
    index
  );

  return createProblemV2Draft(equation.raw, result.answer, [...steps, ...result.steps]);
};

const buildNativeProblemV2Draft = (equation: ParsedEquation): AlgebraProblemV2 | null => {
  if (equation.shape === 'linear-system-no-solution-basic') {
    return buildNativeLinearSystemNoSolutionBasicProblem(equation);
  }

  if (equation.shape === 'linear-system-infinite-solutions-basic') {
    return buildNativeLinearSystemInfiniteSolutionsBasicProblem(equation);
  }

  if (equation.shape === 'linear-system-elimination-basic') {
    return buildNativeLinearSystemEliminationBasicProblem(equation);
  }

  if (equation.shape === 'linear-system-substitution-basic') {
    return buildNativeLinearSystemSubstitutionBasicProblem(equation);
  }

  if (equation.shape === 'linear-system-substitution-solved') {
    return buildNativeLinearSystemSubstitutionSolvedProblem(equation);
  }

  if (equation.shape === 'linear-inequality') {
    return buildNativeLinearInequalityProblem(equation);
  }

  if (equation.shape === 'distributed-inequality') {
    return buildNativeDistributedInequalityProblem(equation);
  }

  if (equation.shape === 'fraction-inequality-with-constant') {
    return buildNativeFractionInequalityWithConstantProblem(equation);
  }

  if (equation.shape === 'bracket-fraction-inequality') {
    return buildNativeBracketFractionInequalityProblem(equation);
  }

  if (equation.shape === 'reciprocal-variable-denominator-inequality') {
    return buildNativeReciprocalVariableDenominatorInequalityProblem(equation);
  }

  if (equation.shape === 'fraction-variable-denominator-inequality') {
    return buildNativeFractionVariableDenominatorInequalityProblem(equation);
  }

  if (equation.shape === 'standard-rational-inequality') {
    return buildNativeStandardRationalInequalityProblem(equation);
  }

  if (equation.shape === 'quadratic-factored') {
    return buildNativeQuadraticFactoredProblem(equation);
  }

  if (equation.shape === 'quadratic-square-root') {
    return buildNativeQuadraticSquareRootProblem(equation);
  }

  if (equation.shape === 'quadratic-formula-double-root') {
    return buildNativeQuadraticFormulaProblem(equation);
  }

  if (equation.shape === 'quadratic-formula-no-real-root') {
    return buildNativeQuadraticFormulaProblem(equation);
  }

  if (equation.shape === 'quadratic-formula-two-real-roots') {
    return buildNativeQuadraticFormulaProblem(equation);
  }

  if (equation.shape === 'quadratic-standard-factorable') {
    return buildNativeQuadraticStandardFactorableProblem(equation);
  }

  if (equation.shape === 'bracket-fraction') {
    return buildNativeBracketFractionProblem(equation);
  }

  if (equation.shape === 'fraction-sum') {
    return buildNativeFractionSumProblem(equation);
  }

  if (equation.shape === 'multi-distributed') {
    return buildNativeMultiDistributedProblem(equation);
  }

  if (equation.shape === 'distributed-with-constant') {
    return buildNativeDistributedWithConstantProblem(equation);
  }

  if (equation.shape === 'fraction-with-constant') {
    return buildNativeFractionWithConstantProblem(equation);
  }

  if (equation.shape === 'variables-both-sides') {
    return buildNativeVariablesBothSidesProblem(equation);
  }

  return null;
};

const createGeneratorV2Result = (problem: AlgebraProblemV2): AlgebraStepGeneratorV2DraftResult => {
  return {
    legacyProblem: normalizeProblemVisualActions(toAlgebraProblemV1FromV2Draft(problem)),
    native: true,
    problem,
    supported: true
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

  const nativeProblem = buildNativeProblemV2Draft(parsed.equation);

  if (nativeProblem) {
    return {
      problem: normalizeProblemVisualActions(toAlgebraProblemV1FromV2Draft(nativeProblem)),
      supported: true
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

  if (parsed.equation.shape === 'distributed-with-constant') {
    steps.push(
      createStep(
        1,
        parsed.equation.raw,
        'write',
        undefined,
        createDistributedWithOuterTokenMap(
          's1',
          parsed.equation.coefficient,
          parsed.equation.innerConstant,
          parsed.equation.outerConstant,
          parsed.equation.right
        )
      )
    );

    const expandedState = expandBracketsWithOuterConstant(parsed.equation);

    steps.push(createStep(2, expandedState.latex, 'expand', '展开括号', createExpandedWithOuterTokenMap('s2', expandedState)));

    const combinedState = combineExpandedConstants(expandedState);

    steps.push(
      createStep(
        3,
        combinedState.latex,
        'transform',
        '合并常数项',
        createLinearTokenMap('s3', combinedState.coefficient, combinedState.constant, combinedState.right, 'moving_term')
      )
    );

    const linearResult = buildStepsFromLinearState(combinedState.latex, combinedState, 4);

    return {
      problem: normalizeProblemVisualActions({
        answer: linearResult.answer,
        equation: parsed.equation.raw,
        steps: [...steps, ...linearResult.steps]
      }),
      supported: true
    };
  }

  if (parsed.equation.shape === 'fraction-with-constant') {
    const fractionState = createFractionEquationState(parsed.equation);

    steps.push(createStep(1, fractionState.latex, 'write', undefined, createFractionTokenMap('s1', fractionState)));

    const fractionResult = buildStepsFromFractionState(fractionState, 2);

    return {
      problem: normalizeProblemVisualActions({
        answer: fractionResult.answer,
        equation: parsed.equation.raw,
        steps: [...steps, ...fractionResult.steps]
      }),
      supported: true
    };
  }

  if (parsed.equation.shape === 'variables-both-sides') {
    steps.push(
      createStep(
        1,
        parsed.equation.raw,
        'write',
        undefined,
        createVariablesBothSidesTokenMap(
          's1',
          parsed.equation.coefficient,
          parsed.equation.constant,
          parsed.equation.rightCoefficient,
          parsed.equation.rightConstant
        )
      )
    );

    const movedState = moveVariableTerms(parsed.equation);

    steps.push(
      createStep(
        2,
        movedState.latex,
        'move',
        '把含 x 的项移到左边，常数项移到右边',
        createMovedVariablesTokenMap(
          's2',
          parsed.equation.coefficient,
          parsed.equation.rightCoefficient,
          parsed.equation.rightConstant,
          parsed.equation.constant
        )
      )
    );

    const variableResult = buildStepsFromMovedVariableState(movedState, 3);

    return {
      problem: normalizeProblemVisualActions({
        answer: variableResult.answer,
        equation: parsed.equation.raw,
        steps: [...steps, ...variableResult.steps]
      }),
      supported: true
    };
  }

  if (parsed.equation.shape !== 'linear' && parsed.equation.shape !== 'linear-with-constant') {
    return {
      equation: parsed.equation.raw,
      reason: 'Native v2 generator is required for this equation shape.',
      supported: false
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

export const generateAlgebraStepsV2Draft = (equation: string): AlgebraStepGeneratorV2DraftResult => {
  const parsed = parseEquation(equation);

  if (parsed.supported === false) {
    return {
      equation: parsed.equation,
      reason: parsed.reason,
      supported: false
    };
  }

  const nativeProblem = buildNativeProblemV2Draft(parsed.equation);

  if (nativeProblem) {
    return createGeneratorV2Result(nativeProblem);
  }

  const legacyResult = generateAlgebraSteps(equation);

  if (!legacyResult.supported) {
    return legacyResult;
  }

  return {
    legacyProblem: legacyResult.problem,
    native: false,
    problem: toAlgebraProblemV2Draft(legacyResult.problem),
    supported: true
  };
};

export {parseEquation} from './parser';
export {divideCoefficient, expandBrackets, moveTerm} from './transforms';

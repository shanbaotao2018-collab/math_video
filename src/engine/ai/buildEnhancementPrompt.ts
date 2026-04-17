import type {AlgebraStep} from '../../types/algebra';
import type {AlgebraOperationV2} from '../../types/algebraDslV2';
import type {AIEnhancementInput, AIEnhancementPromptOperation, AIEnhancementPromptStep} from './aiEnhancementTypes';

const toAIEnhancementPromptOperation = (
  operation?: AlgebraOperationV2
): AIEnhancementPromptOperation | undefined => {
  if (!operation) {
    return undefined;
  }

  if (operation.type === 'move_term') {
    return {
      ...(operation.fromSide ? {fromSide: operation.fromSide} : {}),
      ...(operation.termLatex ? {termLatex: operation.termLatex} : {}),
      ...(operation.inverseTermLatex ? {inverseTermLatex: operation.inverseTermLatex} : {}),
      ...(operation.toSide ? {toSide: operation.toSide} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'rewrite_equation_for_substitution') {
    return {
      ...(operation.sourceEquationLatex ? {sourceEquationLatex: operation.sourceEquationLatex} : {}),
      ...(operation.targetVariableLatex ? {targetVariableLatex: operation.targetVariableLatex} : {}),
      ...(operation.rewrittenLatex ? {rewrittenLatex: operation.rewrittenLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'substitute_expression') {
    return {
      ...(operation.sourceEquationLatex ? {sourceEquationLatex: operation.sourceEquationLatex} : {}),
      ...(operation.targetEquationLatex ? {targetEquationLatex: operation.targetEquationLatex} : {}),
      ...(operation.sourceVariableLatex ? {sourceVariableLatex: operation.sourceVariableLatex} : {}),
      ...(operation.substitutedExpressionLatex ? {substitutedExpressionLatex: operation.substitutedExpressionLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'eliminate_variable') {
    return {
      ...(operation.eliminatedVariableLatex ? {eliminatedVariableLatex: operation.eliminatedVariableLatex} : {}),
      ...(operation.methodLatex ? {methodLatex: operation.methodLatex} : {}),
      ...(operation.sourceEquationsLatex && operation.sourceEquationsLatex.length > 0
        ? {sourceEquationsLatex: operation.sourceEquationsLatex}
        : {}),
      ...(operation.resultEquationLatex ? {resultEquationLatex: operation.resultEquationLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'expand_brackets') {
    return {
      ...(operation.factorLatex ? {factorLatex: operation.factorLatex} : {}),
      ...(operation.bracketLatex ? {bracketLatex: operation.bracketLatex} : {}),
      ...(operation.expansions && operation.expansions.length > 0 ? {expansions: operation.expansions} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'combine_like_terms') {
    return {
      ...(operation.groups && operation.groups.length > 0 ? {groups: operation.groups} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'solve_single_variable_equation') {
    return {
      ...(operation.variableLatex ? {variableLatex: operation.variableLatex} : {}),
      ...(operation.resultLatex ? {resultLatex: operation.resultLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'back_substitute_solution') {
    return {
      ...(operation.knownSolutionLatex ? {knownSolutionLatex: operation.knownSolutionLatex} : {}),
      ...(operation.targetEquationLatex ? {targetEquationLatex: operation.targetEquationLatex} : {}),
      ...(operation.resultLatex ? {resultLatex: operation.resultLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'factor_quadratic') {
    return {
      ...(operation.sourceLatex ? {sourceLatex: operation.sourceLatex} : {}),
      ...(operation.factoredLatex ? {factoredLatex: operation.factoredLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'split_into_linear_factors') {
    return {
      ...(operation.factorsLatex && operation.factorsLatex.length > 0 ? {factorsLatex: operation.factorsLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'apply_zero_product_rule') {
    return {
      ...(operation.factorsLatex && operation.factorsLatex.length > 0 ? {factorsLatex: operation.factorsLatex} : {}),
      ...(operation.branchEquationsLatex && operation.branchEquationsLatex.length > 0
        ? {branchEquationsLatex: operation.branchEquationsLatex}
        : {}),
      type: operation.type
    };
  }

  if (operation.type === 'extract_square_root') {
    return {
      ...(operation.branchesLatex && operation.branchesLatex.length > 0 ? {branchesLatex: operation.branchesLatex} : {}),
      ...(operation.radicandLatex ? {radicandLatex: operation.radicandLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'compute_discriminant') {
    return {
      ...(operation.coefficientsLatex ? {coefficientsLatex: operation.coefficientsLatex} : {}),
      ...(operation.substitutionLatex ? {substitutionLatex: operation.substitutionLatex} : {}),
      ...(operation.discriminantLatex ? {discriminantLatex: operation.discriminantLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'classify_root_count') {
    return {
      ...(operation.discriminantLatex ? {discriminantLatex: operation.discriminantLatex} : {}),
      ...(operation.relationLatex ? {relationLatex: operation.relationLatex} : {}),
      ...(operation.classification ? {classification: operation.classification} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'apply_quadratic_formula') {
    return {
      ...(operation.coefficientsLatex ? {coefficientsLatex: operation.coefficientsLatex} : {}),
      ...(operation.discriminantLatex ? {discriminantLatex: operation.discriminantLatex} : {}),
      ...(operation.formulaLatex ? {formulaLatex: operation.formulaLatex} : {}),
      ...(operation.branchesLatex && operation.branchesLatex.length > 0 ? {branchesLatex: operation.branchesLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'state_no_real_solution') {
    return {
      ...(operation.discriminantLatex ? {discriminantLatex: operation.discriminantLatex} : {}),
      ...(operation.conclusionLatex ? {conclusionLatex: operation.conclusionLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'classify_system_result') {
    return {
      ...(operation.classification ? {classification: operation.classification} : {}),
      ...(operation.reasonLatex ? {reasonLatex: operation.reasonLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'state_no_solution' || operation.type === 'state_infinite_solutions') {
    return {
      ...(operation.conclusionLatex ? {conclusionLatex: operation.conclusionLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'multiply_both_sides') {
    return {
      ...(operation.multiplierLatex ? {multiplierLatex: operation.multiplierLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'clear_denominator') {
    return {
      ...(operation.denominatorLatex ? {denominatorLatex: operation.denominatorLatex} : {}),
      ...(operation.denominatorsLatex && operation.denominatorsLatex.length > 0
        ? {denominatorsLatex: operation.denominatorsLatex}
        : {}),
      ...(operation.multiplierLatex ? {multiplierLatex: operation.multiplierLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'divide_both_sides') {
    return {
      ...(operation.divisorLatex ? {divisorLatex: operation.divisorLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'state_domain_restriction') {
    return {
      ...(operation.restrictionLatex ? {restrictionLatex: operation.restrictionLatex} : {}),
      ...(operation.reasonLatex ? {reasonLatex: operation.reasonLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'find_critical_points') {
    return {
      ...(operation.pointsLatex && operation.pointsLatex.length > 0 ? {pointsLatex: operation.pointsLatex} : {}),
      ...(operation.reasonLatex ? {reasonLatex: operation.reasonLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'analyze_sign_interval') {
    return {
      ...(operation.criticalPointsLatex && operation.criticalPointsLatex.length > 0
        ? {criticalPointsLatex: operation.criticalPointsLatex}
        : {}),
      ...(operation.selectedIntervalsLatex && operation.selectedIntervalsLatex.length > 0
        ? {selectedIntervalsLatex: operation.selectedIntervalsLatex}
        : {}),
      ...(operation.signSummaryLatex ? {signSummaryLatex: operation.signSummaryLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'collect_solution_branches') {
    return {
      ...(operation.branchesLatex && operation.branchesLatex.length > 0 ? {branchesLatex: operation.branchesLatex} : {}),
      ...(operation.resultLatex ? {resultLatex: operation.resultLatex} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'collect_system_solution') {
    return {
      ...(operation.solutionPairLatex ? {solutionPairLatex: operation.solutionPairLatex} : {}),
      ...(operation.classification ? {classification: operation.classification} : {}),
      type: operation.type
    };
  }

  if (operation.type === 'final_answer') {
    return {
      type: operation.type,
      ...(operation.variableLatex ? {variableLatex: operation.variableLatex} : {}),
      ...(operation.valueLatex ? {valueLatex: operation.valueLatex} : {})
    };
  }

  if (operation.type === 'solve_inequality') {
    return {
      type: operation.type,
      relationLatex: operation.relationLatex,
      variableLatex: operation.variableLatex,
      ...(operation.valueLatex ? {valueLatex: operation.valueLatex} : {})
    };
  }

  if (operation.type === 'flip_inequality_sign') {
    return {
      type: operation.type,
      ...(operation.divisorLatex ? {divisorLatex: operation.divisorLatex} : {}),
      ...(operation.fromRelationLatex ? {fromRelationLatex: operation.fromRelationLatex} : {}),
      ...(operation.toRelationLatex ? {toRelationLatex: operation.toRelationLatex} : {}),
      ...(operation.reason ? {reason: operation.reason} : {})
    };
  }

  if (operation.type === 'intersect_solution_set') {
    return {
      type: operation.type,
      ...(operation.baseSolutionLatex ? {baseSolutionLatex: operation.baseSolutionLatex} : {}),
      ...(operation.restrictionLatex ? {restrictionLatex: operation.restrictionLatex} : {}),
      ...(operation.resultLatex ? {resultLatex: operation.resultLatex} : {})
    };
  }

  return {
    type: operation.type
  };
};

export const toAIEnhancementPromptSteps = (steps: AlgebraStep[]): AIEnhancementPromptStep[] => {
  return steps.map(({id, kind, latex, operation}) => {
    const promptOperation = toAIEnhancementPromptOperation(operation);

    return {
      id,
      kind,
      latex,
      ...(promptOperation ? {operation: promptOperation} : {})
    };
  });
};

export const buildEnhancementPrompt = (question: string, steps: AIEnhancementPromptStep[]): string => {
  const input: AIEnhancementInput = {
    question,
    steps
  };

  return [
    '你是一个初中代数教学步骤补全器。',
    '',
    '输入会给你一道题和一组已经生成好的步骤骨架。你的任务不是修改数学步骤本身，而是为每一步补充简洁、准确的教学说明 note。',
    '',
    '要求：',
    '1. 不要修改任何 step 的 id、latex、kind。',
    '2. 只返回每一步新增的 note 字段。',
    '3. note 要短、清晰、适合初中数学教学视频。',
    '4. 如果 step.operation 存在，优先根据 operation.type 和相关字段理解数学含义，不要主要依赖 kind 猜测。',
    '5. move_term 表示移项，expand_brackets 表示展开括号，combine_like_terms 表示合并同类项，rewrite_equation_for_substitution 表示把一条方程改写成适合代入的形式，substitute_expression 表示把一个变量的表达式代入另一条方程，eliminate_variable 表示把两条方程相加或相减来消去一个变量，solve_single_variable_equation 表示方程组里先解出一个变量，back_substitute_solution 表示把已知变量代回去求另一个变量，classify_system_result 表示根据消元结果判断方程组是唯一解、无解还是无穷多解，collect_system_solution 表示把两个变量汇总成方程组的解，state_no_solution / state_infinite_solutions 表示直接给出方程组的状态结论。factor_quadratic 表示把二次式分解成乘积，split_into_linear_factors 表示显式列出两个一次因式，apply_zero_product_rule 表示用零积法则把积式转成分支方程，extract_square_root 表示两边开平方并得到正负两个分支，compute_discriminant 表示计算判别式，classify_root_count 表示根据判别式判断根的个数，apply_quadratic_formula 表示代入求根公式，collect_solution_branches 表示汇总多个分支解，state_no_real_solution 表示在实数范围内无解。clear_denominator 表示去分母，multiply_both_sides / divide_both_sides 表示等式两边同乘或同除；在分式方程里，clear_denominator / multiply_both_sides 常表示同乘分母或最小公倍数来去分母。state_domain_restriction 表示先说明分母或取值范围限制，find_critical_points 表示找临界点，analyze_sign_interval 表示按临界点划分区间并判断符号，flip_inequality_sign 表示乘除负数后不等号方向改变，solve_inequality 表示不等式中间或基础解集，intersect_solution_set 表示结合取值范围后的最终解集，final_answer 表示方程最终结论。',
    '6. 如果 step.operation 不存在，则按 legacy kind + latex 继续处理。',
    '7. 不要输出多余解释，只返回 JSON。',
    '8. 输出格式：',
    '{"steps":[{"id":"...","note":"..."}]}',
    '',
    '输入：',
    JSON.stringify(input, null, 2)
  ].join('\n');
};

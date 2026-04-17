import type {AlgebraStep} from '../../types/algebra';
import {TOKEN_MAP_ROLE_WHITELIST, type AIEnhancementInput, type AIEnhancementPromptStep} from './aiEnhancementTypes';
import {toAIEnhancementPromptSteps} from './buildEnhancementPrompt';

export const toTokenMapEnhancementPromptSteps = (steps: AlgebraStep[]): AIEnhancementPromptStep[] => {
  return toAIEnhancementPromptSteps(steps);
};

export const buildTokenMapEnhancementPrompt = (
  question: string,
  steps: AIEnhancementPromptStep[]
): string => {
  const input: AIEnhancementInput = {
    question,
    steps
  };

  return [
    '你是一个初中代数公式 token 标注器。',
    '',
    '输入会给你一道题和一组已经生成好的步骤骨架。你的任务不是修改数学步骤，而是为部分步骤补充 tokenMap，用于后续高亮、淡入淡出和箭头定位。',
    '',
    '要求：',
    '1. 不要修改任何 step 的 id、latex、kind。',
    '2. 只返回每一步新增的 tokenMap 字段。',
    '3. tokenMap 中每个 token 必须包含 id、text，可选 role。',
    `4. role 只能使用：${TOKEN_MAP_ROLE_WHITELIST.join(', ')}。`,
    '5. text 必须是对应 step.latex 中真实存在的连续文本。',
    '6. 每个 step 的 token 数量不要超过 5 个。',
    '7. 如果 step.operation 存在，优先根据 operation.type 和相关字段选择 token：move_term 标注被移动项和移项后的结果项，expand_brackets 标注乘数、括号或展开结果，combine_like_terms 标注参与合并的项与结果，rewrite_equation_for_substitution / substitute_expression / eliminate_variable / solve_single_variable_equation / back_substitute_solution / classify_system_result / collect_system_solution / state_no_solution / state_infinite_solutions 标注被改写的方程、代入或消元后的关键式、系统分类依据、单变量结果、回代结果、最终解对或系统结论，factor_quadratic / split_into_linear_factors / apply_zero_product_rule / extract_square_root / compute_discriminant / classify_root_count / apply_quadratic_formula / collect_solution_branches / state_no_real_solution 标注因式、判别式、根分类、公式分支方程、无实数解结论或最终解集，clear_denominator 标注分母、公倍数和去分母结果，multiply_both_sides / divide_both_sides / flip_inequality_sign 标注乘数、除数或变号后的关键结果，state_domain_restriction / find_critical_points / analyze_sign_interval / solve_inequality / intersect_solution_set / final_answer 标注关键结论项。分式题优先保留 \\frac{...}{...} 这种完整分式文本，不要退化成普通斜杠提示。',
    '8. 如果 step.operation 不存在，则按 legacy kind + latex 继续处理。',
    '9. 只返回合法 JSON，不要输出多余解释。',
    '10. 输出格式：',
    '{"steps":[{"id":"...","tokenMap":[{"id":"...","text":"...","role":"..."}]}]}',
    '',
    '输入：',
    JSON.stringify(input, null, 2)
  ].join('\n');
};

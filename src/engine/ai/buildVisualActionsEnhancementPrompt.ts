import type {AlgebraStep} from '../../types/algebra';
import {
  VISUAL_ACTION_TYPE_WHITELIST,
  type AIEnhancementInput,
  type AIEnhancementPromptStep
} from './aiEnhancementTypes';
import {toAIEnhancementPromptSteps} from './buildEnhancementPrompt';

export const toVisualActionsEnhancementPromptSteps = (steps: AlgebraStep[]): AIEnhancementPromptStep[] => {
  return toAIEnhancementPromptSteps(steps);
};

export const buildVisualActionsEnhancementPrompt = (
  question: string,
  steps: AIEnhancementPromptStep[]
): string => {
  const input: AIEnhancementInput = {
    question,
    steps
  };

  return [
    '你是一个初中代数教学动画 DSL 补全器。',
    '',
    '输入会给你一道题和一组已经生成好的步骤骨架。你的任务不是修改数学步骤，而是为部分步骤补充 visualActions，用于后续教学动画。',
    '',
    '要求：',
    '1. 不要修改任何 step 的 id、latex、kind。',
    '2. 只返回每一步新增的 visualActions 字段。',
    `3. action.type 只能使用：${VISUAL_ACTION_TYPE_WHITELIST.join(', ')}。`,
    '4. 字段必须严格符合已有结构，不要发明未知字段。',
    '5. target、term、result、resultLatex、expression 必须是字符串。',
    '6. targetSide 只能是 left 或 right。',
    '7. source、target、targetAnchor、anchor、targets.left、targets.right 只能使用 { "line": "...", "role": "..." } 或 { "line": "...", "tokenId": "..." } 这类引用。',
    '8. 如果 step.operation 存在，优先根据 operation.type 选择动作：expand_brackets 使用 expand 或 highlight，move_term 使用 highlight / move / fade_out / fade_in，collect_solution_branches / collect_system_solution / solve_inequality / intersect_solution_set / final_answer / state_no_real_solution / state_no_solution / state_infinite_solutions 使用 answer；factor_quadratic、split_into_linear_factors、apply_zero_product_rule、extract_square_root、compute_discriminant、classify_root_count、apply_quadratic_formula、rewrite_equation_for_substitution、substitute_expression、eliminate_variable、solve_single_variable_equation、back_substitute_solution、classify_system_result、combine_like_terms、clear_denominator、multiply_both_sides、divide_both_sides、flip_inequality_sign、state_domain_restriction、find_critical_points、analyze_sign_interval、simplify_expression 先走弱动作或不补动作，除非 token 关系非常明确。分式题不要把主要注意力放在普通斜杠排版上，应围绕完整分式、分母和同乘因子组织提示。',
    '9. move_term 的动画应以状态变化为主，箭头和移动只作为辅助提示。',
    '10. 如果 step.operation 不存在，则按 legacy kind + latex 继续处理。',
    '11. 只返回严格 JSON，不要输出多余解释。',
    '12. 输出格式：',
    '{"steps":[{"id":"...","visualActions":[{"type":"highlight","target":"..."}]}]}',
    '',
    '输入：',
    JSON.stringify(input, null, 2)
  ].join('\n');
};

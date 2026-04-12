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
    '7. 只返回合法 JSON，不要输出多余解释。',
    '8. 输出格式：',
    '{"steps":[{"id":"...","tokenMap":[{"id":"...","text":"...","role":"..."}]}]}',
    '',
    '输入：',
    JSON.stringify(input, null, 2)
  ].join('\n');
};

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
    '8. 只返回严格 JSON，不要输出多余解释。',
    '9. 输出格式：',
    '{"steps":[{"id":"...","visualActions":[{"type":"highlight","target":"..."}]}]}',
    '',
    '输入：',
    JSON.stringify(input, null, 2)
  ].join('\n');
};

import type {AlgebraStep} from '../../types/algebra';
import type {AIEnhancementInput, AIEnhancementPromptStep} from './aiEnhancementTypes';

export const toAIEnhancementPromptSteps = (steps: AlgebraStep[]): AIEnhancementPromptStep[] => {
  return steps.map(({id, kind, latex}) => ({
    id,
    kind,
    latex
  }));
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
    '4. 不要输出多余解释，只返回 JSON。',
    '5. 输出格式：',
    '{"steps":[{"id":"...","note":"..."}]}',
    '',
    '输入：',
    JSON.stringify(input, null, 2)
  ].join('\n');
};

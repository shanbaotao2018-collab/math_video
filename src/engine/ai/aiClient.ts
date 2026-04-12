import type {AIEnhancer} from './aiEnhancementTypes';

export type AIClientMode = 'mock' | 'real';

export type RealAIRequest = (prompt: string) => Promise<string>;

export type RealAIEnhancerConfig = {
  request: RealAIRequest;
  onError?: (error: unknown) => void;
};

export const createRealAIEnhancer = ({request, onError}: RealAIEnhancerConfig): AIEnhancer => {
  return async (prompt) => {
    try {
      const result = await request(prompt);

      return typeof result === 'string' ? result : null;
    } catch (error) {
      onError?.(error);

      return null;
    }
  };
};

export const createStaticAIEnhancer = (rawResult: string): AIEnhancer => {
  return async () => rawResult;
};

export const nullAIEnhancer: AIEnhancer = async () => null;

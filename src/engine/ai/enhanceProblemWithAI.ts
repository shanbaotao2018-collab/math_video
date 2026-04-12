import type {AlgebraProblem, AlgebraStep} from '../../types/algebra';
import {
  type AIEnhancementInput,
  type AIEnhancementPromptStep,
  type AIEnhancementProvider,
  type AIEnhancementResult,
  type AIEnhancer,
  type AITokenMapEnhancer,
  type AIVisualActionsEnhancer,
  mockAIEnhancer,
  mockAITokenMapEnhancer,
  mockAIVisualActionsEnhancer
} from './aiEnhancementTypes';
import type {AIClientMode} from './aiClient';
import {buildEnhancementPrompt, toAIEnhancementPromptSteps} from './buildEnhancementPrompt';
import {buildTokenMapEnhancementPrompt, toTokenMapEnhancementPromptSteps} from './buildTokenMapEnhancementPrompt';
import {
  buildVisualActionsEnhancementPrompt,
  toVisualActionsEnhancementPromptSteps
} from './buildVisualActionsEnhancementPrompt';
import {
  mergeProblemEnhancements,
  mergeProblemTokenMapEnhancements,
  mergeProblemVisualActionsEnhancements,
  parseAIEnhancementResult,
  parseTokenMapEnhancementResult,
  parseVisualActionsEnhancementResult
} from './mergeEnhancementResult';

export type AIEnhancementStage = 'note' | 'tokenMap' | 'visualActions';

export type EnhancementStageReport = {
  durationMs: number;
  enabled: boolean;
  mergedStepCount: number;
  reason?: string;
  skipped: boolean;
  stage: AIEnhancementStage;
  success: boolean;
};

export type EnhancementRunReport = {
  stages: Record<AIEnhancementStage, EnhancementStageReport>;
  success: boolean;
  totalDurationMs: number;
};

export type AIEnhancementRunResult = {
  problem: AlgebraProblem;
  report: EnhancementRunReport;
};

export type AIOrchestratorOptions = {
  note?: boolean;
  tokenMap?: boolean;
  visualActions?: boolean;
  question?: string;
  mode?: AIClientMode;
  enhancer?: AIEnhancer;
  clients?: {
    note?: AIEnhancer;
    tokenMap?: AIEnhancer;
    visualActions?: AIEnhancer;
  };
  mockEnhancers?: {
    note?: AIEnhancementProvider;
    tokenMap?: AITokenMapEnhancer;
    visualActions?: AIVisualActionsEnhancer;
  };
  /**
   * @deprecated Use `clients` for prompt-based AI calls, or `mockEnhancers`
   * for structured mock-compatible providers.
   */
  enhancers?: {
    note?: AIEnhancementProvider;
    tokenMap?: AITokenMapEnhancer;
    visualActions?: AIVisualActionsEnhancer;
  };
  onPromptBuilt?: (stage: AIEnhancementStage, prompt: string) => void;
};

const isStageEnabled = (value: boolean | undefined) => {
  return value !== false;
};

const stringifyEnhancementResult = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const getErrorReason = (error: unknown) => {
  return error instanceof Error ? error.message : 'unknown_error';
};

type RawEnhancementResult = {
  rawResult: string | null;
  reason?: string;
};

const callPromptEnhancer = async (enhancer: AIEnhancer, prompt: string) => {
  try {
    const result = await enhancer(prompt);

    return typeof result === 'string'
      ? {rawResult: result}
      : {rawResult: null, reason: 'ai_client_returned_null'};
  } catch (error) {
    return {rawResult: null, reason: getErrorReason(error)};
  }
};

const getStageClient = (
  stage: AIEnhancementStage,
  options: AIOrchestratorOptions
): AIEnhancer | null => {
  return options.clients?.[stage] ?? options.enhancer ?? null;
};

const getStructuredMockEnhancer = (
  stage: AIEnhancementStage,
  options: AIOrchestratorOptions
): AIEnhancementProvider => {
  const configuredEnhancers = options.mockEnhancers ?? options.enhancers;

  if (stage === 'note') {
    return configuredEnhancers?.note ?? mockAIEnhancer;
  }

  if (stage === 'tokenMap') {
    return configuredEnhancers?.tokenMap ?? mockAITokenMapEnhancer;
  }

  return configuredEnhancers?.visualActions ?? mockAIVisualActionsEnhancer;
};

const resolveRawEnhancementResult = async ({
  stage,
  prompt,
  input,
  options
}: {
  stage: AIEnhancementStage;
  prompt: string;
  input: AIEnhancementInput;
  options: AIOrchestratorOptions;
}): Promise<RawEnhancementResult> => {
  const client = getStageClient(stage, options);

  if (client) {
    return callPromptEnhancer(client, prompt);
  }

  if (options.mode === 'real') {
    return {
      rawResult: null,
      reason: 'real_mode_without_client'
    };
  }

  const rawResult = stringifyEnhancementResult(await getStructuredMockEnhancer(stage, options).enhance(input));

  return {
    rawResult,
    ...(rawResult ? {} : {reason: 'mock_result_not_serializable'})
  };
};

const isValueChanged = (before: unknown, after: unknown) => {
  return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
};

const countChangedSteps = (
  beforeSteps: AlgebraStep[],
  afterSteps: AlgebraStep[],
  field: 'note' | 'tokenMap' | 'visualActions'
) => {
  const beforeById = new Map(beforeSteps.map((step) => [step.id, step]));

  return afterSteps.reduce((count, step) => {
    const beforeStep = beforeById.get(step.id);

    if (!beforeStep) {
      return count;
    }

    return isValueChanged(beforeStep[field], step[field]) ? count + 1 : count;
  }, 0);
};

const createStageReport = ({
  durationMs,
  enabled,
  mergedStepCount,
  reason,
  skipped,
  stage,
  success
}: EnhancementStageReport): EnhancementStageReport => ({
  durationMs,
  enabled,
  mergedStepCount,
  ...(reason ? {reason} : {}),
  skipped,
  stage,
  success
});

const createSkippedStageReport = (stage: AIEnhancementStage): EnhancementStageReport => {
  return createStageReport({
    durationMs: 0,
    enabled: false,
    mergedStepCount: 0,
    reason: 'stage_disabled',
    skipped: true,
    stage,
    success: false
  });
};

type StageRunnerConfig = {
  buildPrompt: (question: string, steps: AIEnhancementPromptStep[]) => string;
  countField: 'note' | 'tokenMap' | 'visualActions';
  enabled: boolean;
  mergeProblem: (problem: AlgebraProblem, enhancementResult: AIEnhancementResult) => AlgebraProblem;
  options: AIOrchestratorOptions;
  parseResult: (rawResult: string, problem: AlgebraProblem) => AIEnhancementResult | null;
  problem: AlgebraProblem;
  question: string;
  stage: AIEnhancementStage;
  toPromptSteps: (steps: AlgebraStep[]) => AIEnhancementPromptStep[];
};

const runEnhancementStage = async ({
  buildPrompt,
  countField,
  enabled,
  mergeProblem,
  options,
  parseResult,
  problem,
  question,
  stage,
  toPromptSteps
}: StageRunnerConfig): Promise<{problem: AlgebraProblem; report: EnhancementStageReport}> => {
  if (!enabled) {
    return {
      problem,
      report: createSkippedStageReport(stage)
    };
  }

  const startedAt = Date.now();

  try {
    const steps = toPromptSteps(problem.steps);
    const prompt = buildPrompt(question, steps);

    options.onPromptBuilt?.(stage, prompt);

    const {rawResult, reason} = await resolveRawEnhancementResult({
      input: {question, steps},
      options,
      prompt,
      stage
    });

    if (!rawResult) {
      return {
        problem,
        report: createStageReport({
          durationMs: Date.now() - startedAt,
          enabled: true,
          mergedStepCount: 0,
          reason: reason ?? 'empty_ai_result',
          skipped: false,
          stage,
          success: false
        })
      };
    }

    const parsedResult = parseResult(rawResult, problem);

    if (!parsedResult) {
      return {
        problem,
        report: createStageReport({
          durationMs: Date.now() - startedAt,
          enabled: true,
          mergedStepCount: 0,
          reason: 'parse_or_validation_failed',
          skipped: false,
          stage,
          success: false
        })
      };
    }

    const nextProblem = mergeProblem(problem, parsedResult);
    const mergedStepCount = countChangedSteps(problem.steps, nextProblem.steps, countField);

    return {
      problem: nextProblem,
      report: createStageReport({
        durationMs: Date.now() - startedAt,
        enabled: true,
        mergedStepCount,
        ...(mergedStepCount > 0 ? {} : {reason: 'no_steps_merged'}),
        skipped: false,
        stage,
        success: true
      })
    };
  } catch (error) {
    return {
      problem,
      report: createStageReport({
        durationMs: Date.now() - startedAt,
        enabled: true,
        mergedStepCount: 0,
        reason: getErrorReason(error),
        skipped: false,
        stage,
        success: false
      })
    };
  }
};

export const enhanceProblemWithAIReport = async (
  problem: AlgebraProblem,
  options: AIOrchestratorOptions = {}
): Promise<AIEnhancementRunResult> => {
  const question = options.question ?? problem.equation;
  const startedAt = Date.now();
  let currentProblem = problem;

  const noteResult = await runEnhancementStage({
    buildPrompt: buildEnhancementPrompt,
    countField: 'note',
    enabled: isStageEnabled(options.note),
    mergeProblem: mergeProblemEnhancements,
    options,
    parseResult: (rawResult) => parseAIEnhancementResult(rawResult),
    problem: currentProblem,
    question,
    stage: 'note',
    toPromptSteps: toAIEnhancementPromptSteps
  });
  currentProblem = noteResult.problem;

  const tokenMapResult = await runEnhancementStage({
    buildPrompt: buildTokenMapEnhancementPrompt,
    countField: 'tokenMap',
    enabled: isStageEnabled(options.tokenMap),
    mergeProblem: mergeProblemTokenMapEnhancements,
    options,
    parseResult: (rawResult, activeProblem) => parseTokenMapEnhancementResult(rawResult, activeProblem.steps),
    problem: currentProblem,
    question,
    stage: 'tokenMap',
    toPromptSteps: toTokenMapEnhancementPromptSteps
  });
  currentProblem = tokenMapResult.problem;

  const visualActionsResult = await runEnhancementStage({
    buildPrompt: buildVisualActionsEnhancementPrompt,
    countField: 'visualActions',
    enabled: isStageEnabled(options.visualActions),
    mergeProblem: mergeProblemVisualActionsEnhancements,
    options,
    parseResult: (rawResult) => parseVisualActionsEnhancementResult(rawResult),
    problem: currentProblem,
    question,
    stage: 'visualActions',
    toPromptSteps: toVisualActionsEnhancementPromptSteps
  });
  currentProblem = visualActionsResult.problem;

  const stages: Record<AIEnhancementStage, EnhancementStageReport> = {
    note: noteResult.report,
    tokenMap: tokenMapResult.report,
    visualActions: visualActionsResult.report
  };

  return {
    problem: currentProblem,
    report: {
      stages,
      success: Object.values(stages).every((stageReport) => stageReport.skipped || stageReport.success),
      totalDurationMs: Date.now() - startedAt
    }
  };
};

export const enhanceProblemWithAIWithReport = enhanceProblemWithAIReport;

export const enhanceProblemWithAI = async (
  problem: AlgebraProblem,
  options: AIOrchestratorOptions = {}
): Promise<AlgebraProblem> => {
  const result = await enhanceProblemWithAIReport(problem, options);

  return result.problem;
};

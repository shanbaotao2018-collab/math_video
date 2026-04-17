import type {AlgebraProblem} from '../../types/algebra';
import {normalizeProblemWithTemplate} from '../../utils/templates';
import {generateAlgebraSteps} from '../generator';
import {
  enhanceProblemWithAIReport,
  type AIOrchestratorOptions,
  type EnhancementRunReport
} from '../ai/enhanceProblemWithAI';
import {
  createFallbackProblem,
  createGeneratedFallbackBuildStatus,
  createSupportedBuildStatus,
  createUnsupportedBuildStatus,
  type LessonBuildQuality,
  type LessonBuildReason
} from './lessonBuildStatus';

export type BuildEnhancedLessonProblemOptions = AIOrchestratorOptions & {
  ai?: boolean;
  fallbackOnUnsupported?: boolean;
  returnReport?: boolean;
};

export type BuildEnhancedLessonProblemResult = {
  equation?: string;
  problem?: AlgebraProblem;
  quality: LessonBuildQuality;
  reason?: LessonBuildReason;
  reasons?: LessonBuildReason[];
  report?: EnhancementRunReport;
  supported: boolean;
};

const normalizeRenderableProblem = (problem: AlgebraProblem): AlgebraProblem => {
  return normalizeProblemWithTemplate(problem);
};

const getUnsupportedFallbackNote = (generatorReason: string) => {
  return `当前题型暂不在自动推导支持范围内：${generatorReason}`;
};

export const buildEnhancedLessonProblem = async (
  equation: string,
  options: BuildEnhancedLessonProblemOptions = {}
): Promise<BuildEnhancedLessonProblemResult> => {
  let generated: ReturnType<typeof generateAlgebraSteps>;

  try {
    generated = generateAlgebraSteps(equation);
  } catch {
    return {
      ...createGeneratedFallbackBuildStatus('generator_failed'),
      equation,
      problem: normalizeRenderableProblem(createFallbackProblem(equation, '生成步骤时出现异常，已保留原题。'))
    };
  }

  if (!generated.supported) {
    const shouldCreateFallback = options.fallbackOnUnsupported !== false;
    const fallbackProblem = shouldCreateFallback
      ? normalizeRenderableProblem(createFallbackProblem(generated.equation, getUnsupportedFallbackNote(generated.reason)))
      : undefined;

    return {
      equation: generated.equation,
      ...(fallbackProblem ? {problem: fallbackProblem} : {}),
      ...createUnsupportedBuildStatus({
        fallback: shouldCreateFallback
      })
    };
  }

  const generatedProblem = normalizeRenderableProblem(generated.problem);

  if (options.ai === false) {
    return {
      problem: generatedProblem,
      ...createSupportedBuildStatus({
        aiDisabled: true,
        problem: generatedProblem
      })
    };
  }

  const {ai, fallbackOnUnsupported, returnReport, ...aiOptions} = options;
  let enhanced: Awaited<ReturnType<typeof enhanceProblemWithAIReport>>;

  try {
    enhanced = await enhanceProblemWithAIReport(generatedProblem, {
      ...aiOptions,
      question: aiOptions.question ?? equation
    });
  } catch {
    return {
      problem: generatedProblem,
      ...createSupportedBuildStatus({
        aiDisabled: false,
        problem: generatedProblem
      }),
      quality: 'partial',
      reason: 'ai_orchestrator_failed',
      reasons: ['ai_orchestrator_failed']
    };
  }

  const problem = normalizeRenderableProblem(enhanced.problem);

  return {
    problem,
    ...(returnReport ? {report: enhanced.report} : {}),
    ...createSupportedBuildStatus({
      aiDisabled: false,
      problem,
      report: enhanced.report
    })
  };
};

export const generateLessonVideoInput = buildEnhancedLessonProblem;

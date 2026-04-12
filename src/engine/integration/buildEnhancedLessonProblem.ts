import type {AlgebraProblem} from '../../types/algebra';
import {normalizeProblemWithTemplate} from '../../utils/templates';
import {generateAlgebraSteps} from '../generator';
import {
  enhanceProblemWithAIReport,
  type AIOrchestratorOptions,
  type EnhancementRunReport
} from '../ai/enhanceProblemWithAI';

export type BuildEnhancedLessonProblemOptions = AIOrchestratorOptions & {
  ai?: boolean;
  returnReport?: boolean;
};

export type BuildEnhancedLessonProblemResult =
  | {
      problem: AlgebraProblem;
      report?: EnhancementRunReport;
      supported: true;
    }
  | {
      equation: string;
      reason: string;
      supported: false;
    };

const normalizeRenderableProblem = (problem: AlgebraProblem): AlgebraProblem => {
  return normalizeProblemWithTemplate(problem);
};

export const buildEnhancedLessonProblem = async (
  equation: string,
  options: BuildEnhancedLessonProblemOptions = {}
): Promise<BuildEnhancedLessonProblemResult> => {
  const generated = generateAlgebraSteps(equation);

  if (!generated.supported) {
    return {
      equation: generated.equation,
      reason: generated.reason,
      supported: false
    };
  }

  const generatedProblem = normalizeRenderableProblem(generated.problem);

  if (options.ai === false) {
    return {
      problem: generatedProblem,
      supported: true
    };
  }

  const {ai, returnReport, ...aiOptions} = options;
  const enhanced = await enhanceProblemWithAIReport(generatedProblem, {
    ...aiOptions,
    question: aiOptions.question ?? equation
  });
  const problem = normalizeRenderableProblem(enhanced.problem);

  return {
    problem,
    ...(returnReport ? {report: enhanced.report} : {}),
    supported: true
  };
};

export const generateLessonVideoInput = buildEnhancedLessonProblem;

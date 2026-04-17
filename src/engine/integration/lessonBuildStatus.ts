import type {AlgebraProblem} from '../../types/algebra';
import type {AIEnhancementStage, EnhancementRunReport} from '../ai/enhanceProblemWithAI';

export type LessonBuildQuality = 'full' | 'partial' | 'fallback' | 'unsupported';

export const LESSON_BUILD_REASONS = [
  'ai_disabled',
  'ai_orchestrator_failed',
  'ai_stage_failed',
  'fallback_problem_created',
  'generator_failed',
  'token_map_missing_anchor_fallback',
  'unsupported_equation_pattern',
  'visual_actions_missing_template_fallback'
] as const;

export type LessonBuildReason = (typeof LESSON_BUILD_REASONS)[number];

export type LessonBuildStatus = {
  quality: LessonBuildQuality;
  reason?: LessonBuildReason;
  reasons?: LessonBuildReason[];
  supported: boolean;
};

const ACTIONABLE_VISUAL_STEP_KINDS = new Set(['answer', 'cancel', 'expand', 'move']);

const uniqueReasons = (reasons: LessonBuildReason[]) => {
  return Array.from(new Set(reasons));
};

const hasMissingTokenMap = (problem: AlgebraProblem) => {
  return problem.steps.some((step) => (step.tokenMap?.length ?? 0) === 0);
};

const hasMissingActionableVisualActions = (problem: AlgebraProblem) => {
  return problem.steps.some(
    (step) => ACTIONABLE_VISUAL_STEP_KINDS.has(step.kind) && (step.visualActions?.length ?? 0) === 0
  );
};

const hasActionableVisualSteps = (problem: AlgebraProblem) => {
  return problem.steps.some((step) => ACTIONABLE_VISUAL_STEP_KINDS.has(step.kind));
};

const isStageUnavailable = (report: EnhancementRunReport, stage: AIEnhancementStage) => {
  const stageReport = report.stages[stage];

  return stageReport.skipped || !stageReport.success;
};

export const createFallbackProblem = (
  equation: string,
  note = '当前题型暂不在自动推导支持范围内，先保留原题等待人工处理。'
): AlgebraProblem => {
  const normalizedEquation = equation.trim() || '未提供题目';

  return {
    answer: normalizedEquation,
    equation: normalizedEquation,
    note,
    question: normalizedEquation,
    steps: [
      {
        expression: normalizedEquation,
        id: 'fallback-s1',
        kind: 'write',
        latex: normalizedEquation,
        note,
        visualActions: []
      }
    ],
    title: '暂不支持的题型'
  };
};

export const createUnsupportedBuildStatus = ({
  fallback
}: {
  fallback: boolean;
}): LessonBuildStatus => {
  const reasons = uniqueReasons([
    'unsupported_equation_pattern',
    ...(fallback ? (['fallback_problem_created'] as LessonBuildReason[]) : [])
  ]);

  return {
    quality: fallback ? 'fallback' : 'unsupported',
    reason: reasons[0],
    reasons,
    supported: false
  };
};

export const createGeneratedFallbackBuildStatus = (reason: LessonBuildReason): LessonBuildStatus => {
  const reasons = uniqueReasons([reason, 'fallback_problem_created']);

  return {
    quality: 'fallback',
    reason: reasons[0],
    reasons,
    supported: false
  };
};

export const createSupportedBuildStatus = ({
  aiDisabled,
  problem,
  report
}: {
  aiDisabled: boolean;
  problem: AlgebraProblem;
  report?: EnhancementRunReport;
}): LessonBuildStatus => {
  const reasons: LessonBuildReason[] = [];

  if (aiDisabled) {
    reasons.push('ai_disabled');
  }

  if (report && !report.success) {
    reasons.push('ai_stage_failed');
  }

  if (report && isStageUnavailable(report, 'tokenMap') && hasMissingTokenMap(problem)) {
    reasons.push('token_map_missing_anchor_fallback');
  }

  if (report && isStageUnavailable(report, 'visualActions') && hasActionableVisualSteps(problem)) {
    reasons.push('visual_actions_missing_template_fallback');
  }

  if (!report && hasMissingTokenMap(problem)) {
    reasons.push('token_map_missing_anchor_fallback');
  }

  if (!report && (aiDisabled ? hasActionableVisualSteps(problem) : hasMissingActionableVisualActions(problem))) {
    reasons.push('visual_actions_missing_template_fallback');
  }

  const normalizedReasons = uniqueReasons(reasons);

  if (normalizedReasons.length === 0) {
    return {
      quality: 'full',
      supported: true
    };
  }

  return {
    quality: 'partial',
    reason: normalizedReasons[0],
    reasons: normalizedReasons,
    supported: true
  };
};

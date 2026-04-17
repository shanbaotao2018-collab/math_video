import {
  buildEmphasisPlan,
  buildPublishingPack,
  buildRhythmPlan,
  buildSubtitleCuePlan,
  buildVideoRenderPlan,
  buildVoiceCuePlan
} from '../render';
import type {TeachingScript} from '../teaching';
import type {TeachingShot} from '../teaching/shotPlanTypes';
import type {EmphasisCue, EmphasisPlan} from '../render/emphasisPlanTypes';
import type {
  BatchAppliedDurationBandSec,
  BatchEpisodeProductEntry,
  SeriesRhythmTemplate
} from './batchTypes';

const MIN_SHOT_DURATION_MS = 1000;
const MAX_SHOT_DURATION_MS = 8000;

const OUTRO_COPY_BY_STYLE = {
  exam_checklist: '考前最后检查这三件事：入口、关键步骤、答案格式。',
  next_episode_tease: '这一题的入口先记住，下一集继续接同系列高频题。',
  playlist_redirect: '这一题更适合和前后题一起串着看，放回系列里更容易建立完整手感。',
  rule_recap: '最后把规则压一遍：先识别结构，再按规则把步骤走完。',
  save_and_review: '把这一步先存下来，考前专门回看这一类易错点。'
} as const;

const DURATION_FACTOR_BY_BIAS = {
  exam_tip_first: {answer: 1.12, hook: 1, neutral: 0.9, result: 1.08},
  hook_first: {answer: 0.95, hook: 1.22, neutral: 0.9, result: 1.05},
  mistake_first: {answer: 0.95, hook: 1.1, neutral: 1.02, result: 1},
  playlist_bridge: {answer: 0.95, hook: 1.05, neutral: 1, result: 1.16},
  rule_first: {answer: 0.95, hook: 0.98, neutral: 1.12, result: 1.05}
} as const;

const EMPHASIS_PRIORITY_BONUS = {
  exam_tip_first: {hook: 4, mistake: 0, result: 16, rule: 60},
  hook_first: {hook: 28, mistake: 6, result: 12, rule: 8},
  mistake_first: {hook: 8, mistake: 30, result: 10, rule: 12},
  playlist_bridge: {hook: 16, mistake: 6, result: 22, rule: 10},
  rule_first: {hook: 6, mistake: 0, result: 14, rule: 72}
} as const;

const roundDurationSec = (valueMs: number) => {
  return Number((valueMs / 1000).toFixed(2));
};

const clampDuration = (value: number) => {
  return Math.max(MIN_SHOT_DURATION_MS, Math.min(MAX_SHOT_DURATION_MS, Math.round(value)));
};

const buildAppliedDurationBandSec = ({
  actualDurationMs,
  originalDurationMs,
  preferredDurationBandSec
}: {
  actualDurationMs: number;
  originalDurationMs: number;
  preferredDurationBandSec: {max: number; min: number};
}): BatchAppliedDurationBandSec => {
  return {
    actualDurationSec: roundDurationSec(actualDurationMs),
    max: preferredDurationBandSec.max,
    min: preferredDurationBandSec.min,
    originalDurationSec: roundDurationSec(originalDurationMs),
    targetDurationSec: Number(
      (((preferredDurationBandSec.min + preferredDurationBandSec.max) / 2)).toFixed(2)
    )
  };
};

const getShotCategory = ({
  index,
  lastStepId,
  shot,
  totalShots,
  videoHookTargetStepId
}: {
  index: number;
  lastStepId?: string;
  shot: TeachingShot;
  totalShots: number;
  videoHookTargetStepId?: string;
}) => {
  if (index === 0 || (videoHookTargetStepId && shot.stepId === videoHookTargetStepId)) {
    return 'hook' as const;
  }

  if (shot.shotType === 'answer') {
    return 'answer' as const;
  }

  if (index === totalShots - 1 || (lastStepId && shot.stepId === lastStepId)) {
    return 'result' as const;
  }

  return 'neutral' as const;
};

const rebalanceShotDurations = (
  shots: TeachingShot[],
  teachingScript: TeachingScript,
  preferredDurationBandSec: {max: number; min: number},
  emphasisBias: keyof typeof DURATION_FACTOR_BY_BIAS,
  videoHookTargetStepId?: string
) => {
  const originalDurationMs = shots.reduce((total, shot) => total + shot.durationMs, 0);
  const targetDurationMs = Math.round(((preferredDurationBandSec.min + preferredDurationBandSec.max) / 2) * 1000);
  const baseScale = originalDurationMs <= 0 ? 1 : targetDurationMs / originalDurationMs;
  const lastStepId = teachingScript.steps[teachingScript.steps.length - 1]?.stepId;
  const categoryFactor = DURATION_FACTOR_BY_BIAS[emphasisBias];
  let scaledShots = shots.map((shot, index) => {
    const category = getShotCategory({
      index,
      lastStepId,
      shot,
      totalShots: shots.length,
      videoHookTargetStepId
    });

    return {
      ...shot,
      durationMs: clampDuration(shot.durationMs * baseScale * categoryFactor[category])
    };
  });
  const scaledTotalMs = scaledShots.reduce((total, shot) => total + shot.durationMs, 0);
  const correctionScale = scaledTotalMs <= 0 ? 1 : targetDurationMs / scaledTotalMs;

  scaledShots = scaledShots.map((shot) => ({
    ...shot,
    durationMs: clampDuration(shot.durationMs * correctionScale)
  }));

  const actualDurationMs = scaledShots.reduce((total, shot) => total + shot.durationMs, 0);

  return {
    appliedDurationBandSec: buildAppliedDurationBandSec({
      actualDurationMs,
      originalDurationMs,
      preferredDurationBandSec
    }),
    shots: scaledShots
  };
};

const applyOutroStyle = (teachingScript: TeachingScript, outroStyle: keyof typeof OUTRO_COPY_BY_STYLE) => {
  const outroSummary = OUTRO_COPY_BY_STYLE[outroStyle];

  return {
    ...teachingScript,
    outroSummary
  };
};

const applyEmphasisBias = (
  emphasisPlan: EmphasisPlan,
  emphasisBias: keyof typeof EMPHASIS_PRIORITY_BONUS
): EmphasisPlan => {
  const priorityBonus = EMPHASIS_PRIORITY_BONUS[emphasisBias];
  const cues: EmphasisCue[] = emphasisPlan.cues
    .map((cue) => ({
      ...cue,
      priority: cue.priority + priorityBonus[cue.kind]
    }))
    .sort((left, right) => right.priority - left.priority || left.startMs - right.startMs);

  return {cues};
};

const applyOutroStyleToPublishingCaption = (
  caption: string,
  outroStyle: keyof typeof OUTRO_COPY_BY_STYLE
) => {
  const outroCopy = OUTRO_COPY_BY_STYLE[outroStyle];
  return caption.includes(outroCopy) ? caption : `${caption} ${outroCopy}`.trim();
};

export const applyBatchTemplateDeepExecution = (
  productEntry: BatchEpisodeProductEntry,
  templateSnapshot?: SeriesRhythmTemplate
): BatchEpisodeProductEntry => {
  if (
    !templateSnapshot ||
    !productEntry.problem ||
    !productEntry.teachingScript ||
    !productEntry.shotPlan
  ) {
    return productEntry;
  }

  const teachingScript = applyOutroStyle(productEntry.teachingScript, templateSnapshot.outroStyle);
  const rebalancedShotPlan = rebalanceShotDurations(
    productEntry.shotPlan.shots,
    teachingScript,
    templateSnapshot.preferredDurationBandSec,
    templateSnapshot.emphasisBias,
    productEntry.videoHook?.targetStepId
  );
  const shotPlan = {shots: rebalancedShotPlan.shots};
  const recommendedViewport = productEntry.videoRender?.recommendedViewport;
  const renderPlan = buildVideoRenderPlan(shotPlan, recommendedViewport);
  const subtitleCuePlan = buildSubtitleCuePlan(teachingScript, renderPlan);
  const emphasisPlan = applyEmphasisBias(
    buildEmphasisPlan(teachingScript, subtitleCuePlan),
    templateSnapshot.emphasisBias
  );
  const rhythmPlan = buildRhythmPlan(teachingScript, emphasisPlan, subtitleCuePlan);
  const voiceCuePlan = buildVoiceCuePlan(teachingScript, subtitleCuePlan, emphasisPlan, rhythmPlan);
  const basePublishingPack = buildPublishingPack({
    emphasisPlan,
    equation: productEntry.normalizedEquation,
    family: productEntry.family,
    presentationMode: productEntry.presentationStrategy.id,
    problem: productEntry.problem,
    qualityTier: productEntry.qualityTier,
    recommendedUseCase: templateSnapshot.useCase,
    renderPlan,
    series: productEntry.publishingPack?.series
      ? {
          episodeIndex: productEntry.publishingPack.series.episodeIndex,
          seriesId: productEntry.publishingPack.series.seriesId,
          seriesName: productEntry.publishingPack.series.seriesName
        }
      : undefined,
    teachingPersona: productEntry.teachingPersona,
    videoHook: productEntry.videoHook
  });
  const publishingPack = {
    ...basePublishingPack,
    caption: applyOutroStyleToPublishingCaption(basePublishingPack.caption, templateSnapshot.outroStyle)
  };

  return {
    ...productEntry,
    appliedDurationBandSec: rebalancedShotPlan.appliedDurationBandSec,
    appliedEmphasisBias: templateSnapshot.emphasisBias,
    appliedOutroStyle: templateSnapshot.outroStyle,
    emphasisPlan,
    publishingPack,
    rhythmPlan,
    shotPlan,
    subtitleCuePlan,
    teachingScript,
    videoRender: productEntry.videoRender
      ? {
          ...productEntry.videoRender,
          renderable: Boolean(productEntry.problem && teachingScript && shotPlan && subtitleCuePlan)
        }
      : productEntry.videoRender,
    voiceCuePlan
  };
};

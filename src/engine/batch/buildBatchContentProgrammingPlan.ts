import type {AlgebraFamilyId} from '../integration/buildAlgebraProductEntry';
import type {AlgebraPresentationMode} from '../integration/applyAlgebraPresentationStrategy';
import type {AlgebraQualityTier} from '../integration/inferAlgebraQualityTier';
import type {
  BatchContentCopyIntensity,
  BatchContentGoal,
  BatchContentProgrammingPlan,
  BatchDataset,
  BatchEpisodeContentProgramming,
  BatchEpisodeContentProgrammingInput,
  BatchRecommendedUseCase
} from './batchTypes';
import {resolveSeriesRhythmTemplateForUseCase} from './seriesRhythmTemplates';

const FAMILY_LABELS: Record<AlgebraFamilyId, string> = {
  fraction_equation: '分式方程',
  fraction_inequality: '分式不等式',
  linear_equation: '一元一次方程',
  linear_inequality: '一元一次不等式',
  linear_system: '二元一次方程组',
  quadratic_equation: '一元二次方程',
  unknown: '代数题'
};

const FAMILY_PRIORITY_SCORE: Record<AlgebraFamilyId, number> = {
  fraction_equation: 9,
  fraction_inequality: 5,
  linear_equation: 12,
  linear_inequality: 11,
  linear_system: 7,
  quadratic_equation: 10,
  unknown: 4
};

const HOOK_STYLE_PRIORITY_SCORE = {
  mistake_first: 24,
  question_first: 16,
  shortcut_first: 20
} as const;

const PRESENTATION_PRIORITY_SCORE: Record<AlgebraPresentationMode | 'unknown', number> = {
  answer_only: 8,
  auto: 8,
  compact_steps: 12,
  full_steps: 9,
  semantic_full_steps: 6,
  unknown: 8
};

const QUALITY_TIER_PRIORITY_SCORE: Record<AlgebraQualityTier | 'unknown', number> = {
  basic: 14,
  detailed: 6,
  instant: 16,
  standard: 10,
  unknown: 8
};

const GOAL_TIE_BREAKER: Record<BatchContentGoal, number> = {
  collection: 1,
  exam_skill: 4,
  hook: 3,
  mistake: 5,
  teaching: 2
};

const USE_CASE_BY_GOAL: Record<BatchContentGoal, BatchRecommendedUseCase> = {
  collection: 'series_playlist',
  exam_skill: 'exam_revision',
  hook: 'cold_start_reach',
  mistake: 'mistake_prevention',
  teaching: 'concept_building'
};

const normalizeCopy = (value?: string) => value?.replace(/\s+/g, ' ').trim() ?? '';

const clampScore = (value: number) => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const getFamilyLabel = (family?: AlgebraFamilyId) => {
  return FAMILY_LABELS[family ?? 'unknown'];
};

const measureCopyIntensityScore = (input: BatchEpisodeContentProgrammingInput) => {
  const copy = [input.title, input.coverText, input.hookText].map(normalizeCopy).filter(Boolean).join(' ');
  const keywordMatches = [
    /易错/g,
    /捷径/g,
    /技巧/g,
    /怎么/g,
    /下手/g,
    /关键/g,
    /先看/g,
    /答案/g,
    /讲清/g
  ].reduce((total, pattern) => total + (copy.match(pattern)?.length ?? 0), 0);
  const punctuationMatches = (copy.match(/[!?！？]/g)?.length ?? 0) * 2;
  const multilineBonus = input.coverText?.includes('\n') ? 2 : 0;
  const hookBonus = input.hookText ? 4 : 0;

  return keywordMatches * 3 + punctuationMatches + multilineBonus + hookBonus;
};

const inferCopyIntensity = (input: BatchEpisodeContentProgrammingInput): BatchContentCopyIntensity => {
  const score = measureCopyIntensityScore(input);

  if (score >= 16) {
    return 'high';
  }

  if (score >= 8) {
    return 'medium';
  }

  return 'low';
};

const hasEmphasisKind = (input: BatchEpisodeContentProgrammingInput, kind: 'hook' | 'mistake' | 'result' | 'rule') => {
  return input.emphasisKinds?.includes(kind) ?? false;
};

const inferContentGoal = (
  input: BatchEpisodeContentProgrammingInput,
  copyIntensity: BatchContentCopyIntensity
): BatchContentGoal => {
  if (input.hookStyle === 'mistake_first') {
    return 'mistake';
  }

  if (input.hookStyle === 'shortcut_first') {
    return 'exam_skill';
  }

  if (input.hookStyle === 'question_first') {
    return 'hook';
  }

  if (hasEmphasisKind(input, 'mistake')) {
    return 'mistake';
  }

  if (copyIntensity === 'high' || hasEmphasisKind(input, 'hook')) {
    return 'hook';
  }

  return 'teaching';
};

const buildContentPositioning = (
  input: BatchEpisodeContentProgrammingInput,
  goal: BatchContentGoal
) => {
  const familyLabel = getFamilyLabel(input.family);

  switch (goal) {
    case 'mistake':
      return `${familyLabel}易错提醒，适合前排发布拦截常见失分点。`;
    case 'exam_skill':
      return `${familyLabel}技巧向内容，适合考前复习和提分触达。`;
    case 'hook':
      return `${familyLabel}问题开场内容，适合做系列引流入口。`;
    case 'teaching':
      return `${familyLabel}教学承接内容，适合稳定输出系统讲解。`;
    case 'collection':
      return `${familyLabel}合集型内容，适合做系列收束与目录回收。`;
  }
};

const getPriorityScore = (
  input: BatchEpisodeContentProgrammingInput,
  goal: BatchContentGoal,
  copyIntensity: BatchContentCopyIntensity
) => {
  const familyScore = FAMILY_PRIORITY_SCORE[input.family ?? 'unknown'];
  const hookScore = input.hookStyle ? HOOK_STYLE_PRIORITY_SCORE[input.hookStyle] : 8;
  const presentationScore = PRESENTATION_PRIORITY_SCORE[input.presentationMode ?? 'unknown'];
  const qualityScore = QUALITY_TIER_PRIORITY_SCORE[input.qualityTier ?? 'unknown'];
  const emphasisScore = Math.min(8, input.emphasisCueCount ?? 0);
  const intensityScore =
    copyIntensity === 'high' ? 9 : copyIntensity === 'medium' ? 6 : 3;
  const goalScore =
    goal === 'mistake'
      ? 8
      : goal === 'exam_skill'
        ? 7
        : goal === 'hook'
          ? 6
          : 4;
  const hookBonus = hasEmphasisKind(input, 'hook') ? 4 : 0;
  const mistakeBonus = hasEmphasisKind(input, 'mistake') ? 4 : 0;
  const ruleBonus = hasEmphasisKind(input, 'rule') ? 2 : 0;
  const resultBonus = hasEmphasisKind(input, 'result') ? 2 : 0;

  return clampScore(
    10 +
      familyScore +
      hookScore +
      presentationScore +
      qualityScore +
      emphasisScore +
      intensityScore +
      goalScore +
      hookBonus +
      mistakeBonus +
      ruleBonus +
      resultBonus
  );
};

const buildEpisodeProgramming = (
  input: BatchEpisodeContentProgrammingInput
): Omit<BatchEpisodeContentProgramming, 'recommendedPublishingOrder'> => {
  const copyIntensity = inferCopyIntensity(input);
  const contentGoal = inferContentGoal(input, copyIntensity);
  const recommendedUseCase = USE_CASE_BY_GOAL[contentGoal];
  const recommendedTemplate = resolveSeriesRhythmTemplateForUseCase(recommendedUseCase);

  return {
    contentGoal,
    contentPositioning: buildContentPositioning(input, contentGoal),
    copyIntensity,
    episodeId: input.episodeId,
    publishPriorityScore: getPriorityScore(input, contentGoal, copyIntensity),
    recommendedTemplateId: recommendedTemplate.id,
    recommendedUseCase,
    signals: {
      coverText: input.coverText,
      emphasisCueCount: input.emphasisCueCount,
      emphasisKinds: input.emphasisKinds,
      family: input.family,
      hookStyle: input.hookStyle,
      hookText: input.hookText,
      presentationMode: input.presentationMode,
      qualityTier: input.qualityTier,
      title: input.title
    },
    templateSnapshot: recommendedTemplate
  };
};

export const buildBatchContentProgrammingPlan = (
  dataset: BatchDataset,
  inputs: BatchEpisodeContentProgrammingInput[]
): BatchContentProgrammingPlan => {
  const episodes: Array<BatchEpisodeContentProgramming & {episodeIndex: number}> = inputs.map((input) => ({
    ...buildEpisodeProgramming(input),
    episodeIndex: input.episodeIndex,
    recommendedPublishingOrder: 0
  }));

  episodes
    .slice()
    .sort((left, right) => {
      if (right.publishPriorityScore !== left.publishPriorityScore) {
        return right.publishPriorityScore - left.publishPriorityScore;
      }

      if (GOAL_TIE_BREAKER[right.contentGoal] !== GOAL_TIE_BREAKER[left.contentGoal]) {
        return GOAL_TIE_BREAKER[right.contentGoal] - GOAL_TIE_BREAKER[left.contentGoal];
      }

      return left.episodeIndex - right.episodeIndex;
    })
    .forEach((episode, index) => {
      episode.recommendedPublishingOrder = index + 1;
    });

  const finalizedEpisodes = episodes
    .map(({episodeIndex: _episodeIndex, ...episode}) => episode)
    .sort((left, right) => left.recommendedPublishingOrder - right.recommendedPublishingOrder);

  const anchorEpisode = finalizedEpisodes[0];
  const averageEpisodeScore =
    finalizedEpisodes.length === 0
      ? 0
      : finalizedEpisodes.reduce((total, episode) => total + episode.publishPriorityScore, 0) /
        finalizedEpisodes.length;
  const collectionScore = clampScore(
    Math.max(averageEpisodeScore - 8, (anchorEpisode?.publishPriorityScore ?? 0) - 16)
  );
  const collectionOrder = finalizedEpisodes.length + 1;
  const contentPositioning = '系列合集内容，适合在单集验证后做目录整理和阶段回收。';
  const collectionTemplate = resolveSeriesRhythmTemplateForUseCase('series_playlist');

  return {
    dataset: {
      anchorEpisodeId: anchorEpisode?.episodeId,
      contentGoal: 'collection',
      contentPositioning,
      datasetId: dataset.id,
      publishPriorityScore: collectionScore,
      recommendedPublishingOrder: collectionOrder,
      recommendedTemplateId: collectionTemplate.id,
      recommendedUseCase: 'series_playlist',
      templateSnapshot: collectionTemplate
    },
    episodes: finalizedEpisodes,
    series: {
      anchorEpisodeId: anchorEpisode?.episodeId,
      contentGoal: 'collection',
      contentPositioning,
      publishPriorityScore: collectionScore,
      recommendedPublishingOrder: collectionOrder,
      recommendedTemplateId: collectionTemplate.id,
      recommendedUseCase: 'series_playlist',
      seriesId: dataset.seriesId,
      templateSnapshot: collectionTemplate
    }
  };
};

import type {
  BatchRecommendedUseCase,
  SeriesRhythmTemplate,
  SeriesRhythmTemplateId
} from './batchTypes';

export const SERIES_RHYTHM_TEMPLATES: Record<SeriesRhythmTemplateId, SeriesRhythmTemplate> = {
  'cold-start-hook': {
    emphasisBias: 'hook_first',
    id: 'cold-start-hook',
    outroStyle: 'next_episode_tease',
    preferredDurationBandSec: {
      max: 38,
      min: 22
    },
    preferredHookStyle: 'question_first',
    preferredPersona: 'exam_coach',
    preferredPresentationMode: 'compact_steps',
    useCase: 'cold_start_reach'
  },
  'concept-teaching': {
    emphasisBias: 'rule_first',
    id: 'concept-teaching',
    outroStyle: 'rule_recap',
    preferredDurationBandSec: {
      max: 65,
      min: 40
    },
    preferredHookStyle: 'question_first',
    preferredPersona: 'calm_teacher',
    preferredPresentationMode: 'full_steps',
    useCase: 'concept_building'
  },
  'exam-sprint': {
    emphasisBias: 'exam_tip_first',
    id: 'exam-sprint',
    outroStyle: 'exam_checklist',
    preferredDurationBandSec: {
      max: 45,
      min: 25
    },
    preferredHookStyle: 'shortcut_first',
    preferredPersona: 'exam_coach',
    preferredPresentationMode: 'compact_steps',
    useCase: 'exam_revision'
  },
  'mistake-guardrail': {
    emphasisBias: 'mistake_first',
    id: 'mistake-guardrail',
    outroStyle: 'save_and_review',
    preferredDurationBandSec: {
      max: 42,
      min: 24
    },
    preferredHookStyle: 'mistake_first',
    preferredPersona: 'strict_teacher',
    preferredPresentationMode: 'compact_steps',
    useCase: 'mistake_prevention'
  },
  'playlist-bridge': {
    emphasisBias: 'playlist_bridge',
    id: 'playlist-bridge',
    outroStyle: 'playlist_redirect',
    preferredDurationBandSec: {
      max: 75,
      min: 45
    },
    preferredHookStyle: 'question_first',
    preferredPersona: 'calm_teacher',
    preferredPresentationMode: 'full_steps',
    useCase: 'series_playlist'
  }
};

export const SERIES_RHYTHM_TEMPLATE_BY_USE_CASE: Record<BatchRecommendedUseCase, SeriesRhythmTemplateId> = {
  cold_start_reach: 'cold-start-hook',
  concept_building: 'concept-teaching',
  exam_revision: 'exam-sprint',
  mistake_prevention: 'mistake-guardrail',
  series_playlist: 'playlist-bridge'
};

export const getSeriesRhythmTemplate = (templateId: SeriesRhythmTemplateId) => {
  return SERIES_RHYTHM_TEMPLATES[templateId];
};

export const resolveSeriesRhythmTemplateForUseCase = (useCase: BatchRecommendedUseCase) => {
  return getSeriesRhythmTemplate(SERIES_RHYTHM_TEMPLATE_BY_USE_CASE[useCase]);
};

export const listSeriesRhythmTemplates = () => {
  return Object.values(SERIES_RHYTHM_TEMPLATES);
};

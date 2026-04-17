import type {AlgebraFamilyId, AlgebraProductEntry} from '../integration/buildAlgebraProductEntry';
import type {AlgebraPresentationMode} from '../integration/applyAlgebraPresentationStrategy';
import type {AlgebraQualityTier} from '../integration/inferAlgebraQualityTier';
import type {EmphasisKind} from '../render/emphasisPlanTypes';
import type {TeachingPersonaId, VideoHookStyle} from '../teaching';

export type BatchDifficulty = 'basic' | 'challenge' | 'standard';

export type BatchDatasetEquation = {
  difficulty?: BatchDifficulty;
  equation: string;
  family?: AlgebraFamilyId;
  hookStyle?: VideoHookStyle;
  id?: string;
  presentationMode?: AlgebraPresentationMode;
  tags?: string[];
  teachingPersona?: TeachingPersonaId;
};

export type BatchDataset = {
  difficulty?: BatchDifficulty;
  equations: BatchDatasetEquation[];
  family?: AlgebraFamilyId;
  id: string;
  name: string;
  seriesId: string;
  seriesName: string;
  tags?: string[];
};

export type BatchSeries = {
  episodeCount: number;
  seriesId: string;
  seriesName: string;
};

export type BatchContentGoal = 'collection' | 'exam_skill' | 'hook' | 'mistake' | 'teaching';

export type BatchContentCopyIntensity = 'high' | 'low' | 'medium';

export type BatchRecommendedUseCase =
  | 'cold_start_reach'
  | 'concept_building'
  | 'exam_revision'
  | 'mistake_prevention'
  | 'series_playlist';

export type SeriesRhythmTemplateId =
  | 'cold-start-hook'
  | 'concept-teaching'
  | 'exam-sprint'
  | 'mistake-guardrail'
  | 'playlist-bridge';

export type SeriesRhythmDurationBandSec = {
  max: number;
  min: number;
};

export type BatchAppliedDurationBandSec = SeriesRhythmDurationBandSec & {
  actualDurationSec: number;
  originalDurationSec: number;
  targetDurationSec: number;
};

export type SeriesRhythmEmphasisBias =
  | 'exam_tip_first'
  | 'hook_first'
  | 'mistake_first'
  | 'playlist_bridge'
  | 'rule_first';

export type SeriesRhythmOutroStyle =
  | 'exam_checklist'
  | 'next_episode_tease'
  | 'playlist_redirect'
  | 'rule_recap'
  | 'save_and_review';

export type SeriesRhythmTemplate = {
  emphasisBias: SeriesRhythmEmphasisBias;
  id: SeriesRhythmTemplateId;
  preferredDurationBandSec: SeriesRhythmDurationBandSec;
  preferredHookStyle: VideoHookStyle;
  preferredPersona: TeachingPersonaId;
  preferredPresentationMode: AlgebraPresentationMode;
  outroStyle: SeriesRhythmOutroStyle;
  useCase: BatchRecommendedUseCase;
};

export type BatchEpisodeContentSignals = {
  coverText?: string;
  emphasisCueCount?: number;
  emphasisKinds?: EmphasisKind[];
  family?: AlgebraFamilyId;
  hookStyle?: VideoHookStyle;
  hookText?: string;
  presentationMode?: AlgebraPresentationMode;
  qualityTier?: AlgebraQualityTier;
  title?: string;
};

export type BatchEpisodeContentProgrammingInput = BatchEpisodeContentSignals & {
  episodeId: string;
  episodeIndex: number;
};

export type BatchEpisodeContentProgramming = {
  contentGoal: BatchContentGoal;
  contentPositioning: string;
  copyIntensity: BatchContentCopyIntensity;
  episodeId: string;
  publishPriorityScore: number;
  recommendedPublishingOrder: number;
  recommendedTemplateId: SeriesRhythmTemplateId;
  recommendedUseCase: BatchRecommendedUseCase;
  signals: BatchEpisodeContentSignals;
  templateSnapshot?: SeriesRhythmTemplate;
};

export type BatchEpisodeExecutionOverrides = {
  hookStyle?: VideoHookStyle;
  presentationMode?: AlgebraPresentationMode;
  teachingPersona?: TeachingPersonaId;
};

export type BatchEpisodeAppliedOverrides = BatchEpisodeExecutionOverrides;

export type BatchEpisodeTemplateExecution = {
  appliedOverrides?: BatchEpisodeAppliedOverrides;
  appliedTemplateId?: SeriesRhythmTemplateId;
  buildOverrides: BatchEpisodeExecutionOverrides;
};

export type BatchDatasetContentProgramming = {
  anchorEpisodeId?: string;
  contentGoal: 'collection';
  contentPositioning: string;
  datasetId: string;
  publishPriorityScore: number;
  recommendedPublishingOrder: number;
  recommendedTemplateId: SeriesRhythmTemplateId;
  recommendedUseCase: 'series_playlist';
  templateSnapshot?: SeriesRhythmTemplate;
};

export type BatchSeriesContentProgramming = {
  anchorEpisodeId?: string;
  contentGoal: 'collection';
  contentPositioning: string;
  publishPriorityScore: number;
  recommendedPublishingOrder: number;
  recommendedTemplateId: SeriesRhythmTemplateId;
  recommendedUseCase: 'series_playlist';
  seriesId: string;
  templateSnapshot?: SeriesRhythmTemplate;
};

export type BatchContentProgrammingPlan = {
  dataset: BatchDatasetContentProgramming;
  episodes: BatchEpisodeContentProgramming[];
  series: BatchSeriesContentProgramming;
};

export type BatchOutputAssetPaths = {
  audioTrack?: string;
  coverHtml: string;
  coverPng?: string;
  creativeVariantsDir: string;
  html: string;
  mp4?: string;
  productEntry: string;
  publishing: string;
  renderPlan: string;
  srt: string;
  subtitleCues: string;
  timelineHtml: string;
  voiceCueSpeakableText?: string;
  voiceCueSrt?: string;
  voiceCueText?: string;
  voiceCues?: string;
  voicedMp4?: string;
};

export type BatchEpisodePlan = {
  assetPaths: BatchOutputAssetPaths;
  contentProgramming?: BatchEpisodeContentProgramming;
  difficulty?: BatchDifficulty;
  episodeId: string;
  episodeIndex: number;
  episodeNumber: string;
  equation: string;
  outputDir: string;
  tags: string[];
};

export type BatchEpisodeProductEntry = AlgebraProductEntry & {
  appliedDurationBandSec?: BatchAppliedDurationBandSec;
  appliedEmphasisBias?: SeriesRhythmEmphasisBias;
  appliedOutroStyle?: SeriesRhythmOutroStyle;
  appliedOverrides?: BatchEpisodeAppliedOverrides;
  appliedTemplateId?: SeriesRhythmTemplateId;
};

export type BatchProductionPlan = {
  contentProgramming: BatchContentProgrammingPlan;
  dataset: BatchDataset;
  episodes: BatchEpisodePlan[];
  outputRoot: string;
  series: BatchSeries;
};

export type BatchProductionOptions = {
  includeAudioTrack?: boolean;
  includeVideo?: boolean;
  outputRoot?: string;
};

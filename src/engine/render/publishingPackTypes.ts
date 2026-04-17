export type PublishingCoverFrameSource =
  | 'answer_shot'
  | 'first_shot'
  | 'hook_emphasis'
  | 'mistake_emphasis'
  | 'result_emphasis'
  | 'rule_emphasis';

export type PublishingCoverFrame = {
  reason: string;
  source: PublishingCoverFrameSource;
  shotId?: string;
  timestampMs?: number;
};

export type PublishingCoverMode = 'hook_cover' | 'mistake_cover' | 'result_cover';

export type PublishingCoverContentGoal = 'collection' | 'exam_skill' | 'hook' | 'mistake' | 'teaching';

export type PublishingCoverRecommendedUseCase =
  | 'cold_start_reach'
  | 'concept_building'
  | 'exam_revision'
  | 'mistake_prevention'
  | 'series_playlist';

export type PublishingCoverStrategy = {
  badge: string;
  formulaText?: string;
  mainTitle: string;
  mode: PublishingCoverMode;
  reason: string;
  source: 'answer' | 'cover_text' | 'emphasis' | 'title' | 'video_hook';
  subtitle?: string;
};

export type PublishingSeriesInfo = {
  episodeIndex?: number;
  episodeKey: string;
  episodeNumber?: string;
  familyId: string;
  name: string;
  presentationMode: string;
  qualityTier: string;
  seriesId?: string;
  seriesName?: string;
};

export type PublishingSeriesContext = {
  episodeIndex?: number;
  seriesId?: string;
  seriesName?: string;
};

export type PublishingPack = {
  caption: string;
  coverFrame: PublishingCoverFrame;
  coverStrategy: PublishingCoverStrategy;
  coverText: string;
  hashtags: string[];
  series?: PublishingSeriesInfo;
  title: string;
};

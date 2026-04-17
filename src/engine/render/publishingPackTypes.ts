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
  coverText: string;
  hashtags: string[];
  series?: PublishingSeriesInfo;
  title: string;
};

import type {EmphasisKind} from './emphasisPlanTypes';
import type {TeachingPersonaId} from '../teaching';

export type VoiceStyle =
  | 'caution'
  | 'conclusion'
  | 'deliberate'
  | 'emphasis'
  | 'hook'
  | 'neutral'
  | 'quick';

export type VoiceOutroStyleHint =
  | 'exam_checklist'
  | 'next_episode_tease'
  | 'playlist_redirect'
  | 'rule_recap'
  | 'save_and_review'
  | 'standard';

export type PauseType =
  | 'none'
  | 'micro'
  | 'phrase'
  | 'emphasis'
  | 'thinking'
  | 'result';

export type VoiceSegment = {
  emphasisType?: EmphasisKind;
  localRate?: number;
  outroStyleHint?: VoiceOutroStyleHint;
  pauseAfterMs?: number;
  pauseAfterType?: PauseType;
  pauseBeforeMs?: number;
  pauseBeforeType?: PauseType;
  segmentId: string;
  speakableText: string;
  text: string;
};

export type VoiceCue = {
  cueId: string;
  emphasisCueIds?: string[];
  endMs: number;
  persona: TeachingPersonaId;
  rhythmCueIds?: string[];
  segments: VoiceSegment[];
  shotId: string;
  startMs: number;
  stepId: string;
  subtitleCueId: string;
  text: string;
  voiceStyle?: VoiceStyle;
};

export type VoiceCuePlan = {
  cues: VoiceCue[];
};

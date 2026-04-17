export type RhythmCueType = 'beat' | 'pause' | 'repeat' | 'slow' | 'speed_up';

export type RhythmCueSource =
  | 'emphasis_hook'
  | 'emphasis_mistake'
  | 'emphasis_result'
  | 'emphasis_rule'
  | 'pacing_hint';

export type RhythmCue = {
  cueId: string;
  durationMs: number;
  emphasisCueId?: string;
  source: RhythmCueSource;
  startMs: number;
  stepId: string;
  type: RhythmCueType;
};

export type RhythmPlan = {
  cues: RhythmCue[];
};

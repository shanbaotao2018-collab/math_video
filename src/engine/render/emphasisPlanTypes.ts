export type EmphasisKind = 'hook' | 'mistake' | 'result' | 'rule';

export type EmphasisSource =
  | 'mistake_warning'
  | 'outro_summary'
  | 'retention_break'
  | 'step_emphasis'
  | 'video_hook';

export type EmphasisCue = {
  cueId: string;
  displayEndMs?: number;
  displayStartMs?: number;
  endMs: number;
  kind: EmphasisKind;
  priority: number;
  shotId: string;
  source: EmphasisSource;
  startMs: number;
  stepId: string;
  subtitleCueId: string;
  targetStepId?: string;
  text: string;
};

export type EmphasisPlan = {
  cues: EmphasisCue[];
};

export type SubtitleCue = {
  cueId: string;
  emphasis?: string;
  endMs: number;
  shotId: string;
  startMs: number;
  stepId: string;
  text: string;
};

export type SubtitleCuePlan = {
  cues: SubtitleCue[];
};

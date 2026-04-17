export type TeachingShotType =
  | 'answer'
  | 'branch'
  | 'eliminate'
  | 'highlight'
  | 'interval'
  | 'substitute'
  | 'transform'
  | 'write';

export type TeachingShotAnimation =
  | 'draw'
  | 'fade_in'
  | 'highlight_pulse'
  | 'replace'
  | 'slide_left'
  | 'slide_right';

export type TeachingShot = {
  animation?: TeachingShotAnimation;
  durationMs: number;
  focusLatex?: string;
  narration: string;
  shotId: string;
  shotType: TeachingShotType;
  stepId: string;
};

export type ShotPlan = {
  shots: TeachingShot[];
};

export type VideoRenderShot = {
  animation?: string;
  endMs: number;
  focusLatex?: string;
  narration: string;
  shotId: string;
  shotType: string;
  startMs: number;
  stepId: string;
  subtitle: string;
};

export type VideoRenderPlan = {
  durationMs: number;
  fps: number;
  height: number;
  shots: VideoRenderShot[];
  width: number;
};

export type VideoViewport = {
  fps: number;
  height: number;
  width: number;
};

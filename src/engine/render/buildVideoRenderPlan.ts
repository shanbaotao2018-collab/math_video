import type {ShotPlan} from '../teaching';
import type {VideoRenderPlan, VideoRenderShot, VideoViewport} from './videoRenderTypes';

export const DEFAULT_VIDEO_VIEWPORT: VideoViewport = {
  fps: 30,
  height: 1920,
  width: 1080
};

export function buildVideoRenderPlan(
  shotPlan: ShotPlan,
  options: Partial<VideoViewport> = {}
): VideoRenderPlan {
  const width = options.width ?? DEFAULT_VIDEO_VIEWPORT.width;
  const height = options.height ?? DEFAULT_VIDEO_VIEWPORT.height;
  const fps = options.fps ?? DEFAULT_VIDEO_VIEWPORT.fps;
  let cursorMs = 0;

  const shots: VideoRenderShot[] = shotPlan.shots.map((shot) => {
    const startMs = cursorMs;
    const endMs = startMs + shot.durationMs;

    cursorMs = endMs;

    return {
      animation: shot.animation,
      endMs,
      ...(shot.focusLatex ? {focusLatex: shot.focusLatex} : {}),
      narration: shot.narration,
      shotId: shot.shotId,
      shotType: shot.shotType,
      startMs,
      stepId: shot.stepId,
      subtitle: shot.narration
    };
  });

  return {
    durationMs: cursorMs,
    fps,
    height,
    shots,
    width
  };
}

import type {TeachingScript} from '../teaching';
import type {VideoRenderPlan} from './videoRenderTypes';
import type {SubtitleCue, SubtitleCuePlan} from './subtitleCueTypes';

const normalizeText = (text?: string) => {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
};

const normalizeComparableText = (text?: string) => {
  return normalizeText(text)
    .replace(/[，。！？、；：,.!?;:"'`()（）【】\[\]…\-_]/g, '')
    .toLowerCase();
};

const reserveText = (usedTexts: Set<string>, text?: string) => {
  const comparableText = normalizeComparableText(text);

  if (comparableText) {
    usedTexts.add(comparableText);
  }
};

const makeUniqueSubtitleText = (text: string, index: number, usedTexts: Set<string>) => {
  const comparableText = normalizeComparableText(text);

  if (comparableText && !usedTexts.has(comparableText)) {
    usedTexts.add(comparableText);
    return text;
  }

  const fallbackText = `第${index + 1}步，先看公式变化。`;
  usedTexts.add(normalizeComparableText(fallbackText));
  return fallbackText;
};

export function buildSubtitleCuePlan(
  teachingScript: TeachingScript,
  videoRenderPlan: VideoRenderPlan
): SubtitleCuePlan {
  const teachingStepById = new Map(teachingScript.steps.map((step) => [step.stepId, step]));
  const reservedTexts = new Set<string>();

  reserveText(reservedTexts, teachingScript.hook?.text);
  teachingScript.steps.forEach((step) => {
    reserveText(reservedTexts, step.emphasis);
    reserveText(reservedTexts, step.mistakeWarning);
  });
  reserveText(reservedTexts, teachingScript.outroSummary);

  const cues: SubtitleCue[] = videoRenderPlan.shots.map((shot, index) => {
    const teachingStep = teachingStepById.get(shot.stepId);
    const subtitleText = makeUniqueSubtitleText(
      normalizeText(teachingStep?.narration ?? shot.subtitle ?? shot.narration),
      index,
      reservedTexts
    );

    return {
      cueId: `cue${index + 1}`,
      endMs: shot.endMs,
      shotId: shot.shotId,
      startMs: shot.startMs,
      stepId: shot.stepId,
      text: subtitleText
    };
  });

  return {cues};
}

const padSrtTime = (value: number, size = 2) => {
  return String(value).padStart(size, '0');
};

const formatSrtTimestamp = (timeMs: number) => {
  const bounded = Math.max(0, Math.round(timeMs));
  const hours = Math.floor(bounded / 3600000);
  const minutes = Math.floor((bounded % 3600000) / 60000);
  const seconds = Math.floor((bounded % 60000) / 1000);
  const milliseconds = bounded % 1000;

  return `${padSrtTime(hours)}:${padSrtTime(minutes)}:${padSrtTime(seconds)},${padSrtTime(milliseconds, 3)}`;
};

export function serializeSubtitleCuePlanToSrt(subtitleCuePlan: SubtitleCuePlan): string {
  return subtitleCuePlan.cues
    .map((cue, index) => {
      return [
        String(index + 1),
        `${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}`,
        cue.text,
        ''
      ].join('\n');
    })
    .join('\n');
}

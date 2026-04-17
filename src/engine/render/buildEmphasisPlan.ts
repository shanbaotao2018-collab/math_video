import type {TeachingScript, TeachingScriptStep} from '../teaching';
import type {SubtitleCue, SubtitleCuePlan} from './subtitleCueTypes';
import type {EmphasisCue, EmphasisKind, EmphasisPlan, EmphasisSource} from './emphasisPlanTypes';

type CueDraft = {
  displayEndMs?: number;
  displayStartMs?: number;
  kind: EmphasisKind;
  priority: number;
  source: EmphasisSource;
  targetStepId?: string;
  text: string;
};

const normalizeText = (text?: string) => {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
};

const normalizeComparableText = (text?: string) => {
  return normalizeText(text)
    .replace(/[，。！？、；：,.!?;:"'`()（）【】\[\]…\-_]/g, '')
    .toLowerCase();
};

const isResultText = (text: string) => {
  return /最终|答案|结果|无解|无穷多解|无实数解/.test(text);
};

const buildCue = (cue: SubtitleCue, draft: CueDraft, index: number): EmphasisCue => {
  return {
    cueId: `em${index + 1}`,
    ...(draft.displayEndMs !== undefined ? {displayEndMs: draft.displayEndMs} : {}),
    ...(draft.displayStartMs !== undefined ? {displayStartMs: draft.displayStartMs} : {}),
    endMs: cue.endMs,
    kind: draft.kind,
    priority: draft.priority,
    shotId: cue.shotId,
    source: draft.source,
    startMs: cue.startMs,
    stepId: cue.stepId,
    subtitleCueId: cue.cueId,
    ...(draft.targetStepId ? {targetStepId: draft.targetStepId} : {}),
    text: draft.text
  };
};

const findFirstCueForStep = (subtitleCuePlan: SubtitleCuePlan, stepId?: string) => {
  if (!stepId) {
    return undefined;
  }

  return subtitleCuePlan.cues.find((cue) => cue.stepId === stepId);
};

const addStepEmphasisDrafts = (
  draftsBySubtitleCueId: Map<string, CueDraft[]>,
  subtitleCuePlan: SubtitleCuePlan,
  step: TeachingScriptStep
) => {
  const cue = findFirstCueForStep(subtitleCuePlan, step.stepId);

  if (!cue) {
    return;
  }

  const drafts = draftsBySubtitleCueId.get(cue.cueId) ?? [];
  const emphasisText = normalizeText(step.emphasis);
  const mistakeText = normalizeText(step.mistakeWarning);

  if (emphasisText) {
    drafts.push({
      kind: isResultText(emphasisText) ? 'result' : 'rule',
      priority: isResultText(emphasisText) ? 55 : 35,
      source: 'step_emphasis',
      text: emphasisText
    });
  }

  if (mistakeText) {
    drafts.push({
      kind: 'mistake',
      priority: 80,
      source: 'mistake_warning',
      text: mistakeText
    });
  }

  if (drafts.length > 0) {
    draftsBySubtitleCueId.set(cue.cueId, drafts);
  }
};

const BREAK_TEXTS = [
  '注意',
  '停一下',
  '很多人这里会错',
  '别滑走这一步',
  '这里最容易丢分',
  '先看这一眼',
  '这一秒很关键',
  '这里别跳过'
];

const getBreakText = (breakIndex: number) => {
  return BREAK_TEXTS[breakIndex] ?? `第${breakIndex + 1}个坑来了`;
};

const addRetentionBreakDrafts = (
  draftsBySubtitleCueId: Map<string, CueDraft[]>,
  subtitleCuePlan: SubtitleCuePlan
) => {
  const cues = subtitleCuePlan.cues;
  const lastCue = cues[cues.length - 1];

  if (!lastCue || lastCue.endMs < 3200) {
    return;
  }

  let breakIndex = 0;
  const usedBreakTexts = new Set<string>();

  for (let timeMs = 3600; timeMs < lastCue.endMs - 900; timeMs += 4200) {
    const cue = cues.find((candidate) => timeMs >= candidate.startMs && timeMs < candidate.endMs);

    if (!cue) {
      continue;
    }

    const text = getBreakText(breakIndex);
    const comparableText = normalizeComparableText(text);
    breakIndex += 1;

    if (!comparableText || usedBreakTexts.has(comparableText)) {
      continue;
    }

    usedBreakTexts.add(comparableText);
    const drafts = draftsBySubtitleCueId.get(cue.cueId) ?? [];
    drafts.push({
      displayEndMs: Math.min(cue.endMs, timeMs + 1200),
      displayStartMs: timeMs,
      kind: /错|坑|丢分/.test(text) ? 'mistake' : 'rule',
      priority: 74,
      source: 'retention_break',
      text
    });
    draftsBySubtitleCueId.set(cue.cueId, drafts);
  }
};

export function buildEmphasisPlan(
  teachingScript: TeachingScript,
  subtitleCuePlan: SubtitleCuePlan
): EmphasisPlan {
  const draftsBySubtitleCueId = new Map<string, CueDraft[]>();
  const firstCue = subtitleCuePlan.cues[0];
  const usedTexts = new Set<string>();

  if (firstCue) {
    const hookText = normalizeText(teachingScript.hook?.text);

    if (hookText) {
      draftsBySubtitleCueId.set(firstCue.cueId, [
        {
          displayEndMs: Math.min(firstCue.endMs, firstCue.startMs + 600),
          displayStartMs: firstCue.startMs,
          kind: 'hook',
          priority: 100,
          source: 'video_hook',
          ...(teachingScript.hook?.targetStepId ? {targetStepId: teachingScript.hook.targetStepId} : {}),
          text: hookText
        }
      ]);
    }
  }

  teachingScript.steps.forEach((step) => {
    addStepEmphasisDrafts(draftsBySubtitleCueId, subtitleCuePlan, step);
  });

  const lastCue = subtitleCuePlan.cues[subtitleCuePlan.cues.length - 1];
  const outroText = normalizeText(teachingScript.outroSummary);

  if (lastCue && outroText) {
    const drafts = draftsBySubtitleCueId.get(lastCue.cueId) ?? [];

    drafts.push({
      kind: 'result',
      priority: 65,
      source: 'outro_summary',
      text: outroText
    });
    draftsBySubtitleCueId.set(lastCue.cueId, drafts);
  }

  addRetentionBreakDrafts(draftsBySubtitleCueId, subtitleCuePlan);

  const cues: EmphasisCue[] = [];

  subtitleCuePlan.cues.forEach((subtitleCue) => {
    const drafts = draftsBySubtitleCueId.get(subtitleCue.cueId) ?? [];

    drafts.forEach((draft) => {
      const comparableText = normalizeComparableText(draft.text);

      if (!comparableText || usedTexts.has(comparableText)) {
        return;
      }

      usedTexts.add(comparableText);
      cues.push(buildCue(subtitleCue, draft, cues.length));
    });
  });

  return {cues};
}

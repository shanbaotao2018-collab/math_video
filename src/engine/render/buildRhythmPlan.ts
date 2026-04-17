import type {TeachingScript, TeachingScriptPacingHint} from '../teaching';
import type {EmphasisCue, EmphasisPlan} from './emphasisPlanTypes';
import type {SubtitleCue, SubtitleCuePlan} from './subtitleCueTypes';
import type {RhythmCue, RhythmCueSource, RhythmCueType, RhythmPlan} from './rhythmPlanTypes';

type RhythmCueDraft = {
  durationMs: number;
  emphasisCueId?: string;
  source: RhythmCueSource;
  startMs: number;
  stepId: string;
  type: RhythmCueType;
};

const MIN_CUE_DURATION_MS = 220;

const clampDuration = (durationMs: number) => {
  return Math.max(MIN_CUE_DURATION_MS, Math.round(durationMs));
};

const addCue = (drafts: RhythmCueDraft[], draft: RhythmCueDraft) => {
  drafts.push({
    ...draft,
    durationMs: clampDuration(draft.durationMs)
  });
};

const durationWithin = (cue: Pick<SubtitleCue, 'endMs' | 'startMs'>, ratio: number, maxMs: number) => {
  return Math.min(maxMs, Math.max(MIN_CUE_DURATION_MS, Math.round((cue.endMs - cue.startMs) * ratio)));
};

const getCueTiming = (cue: EmphasisCue) => {
  return {
    endMs: cue.displayEndMs ?? cue.endMs,
    startMs: cue.displayStartMs ?? cue.startMs
  };
};

const resolveEmphasisSource = (cue: EmphasisCue): RhythmCueSource => {
  switch (cue.kind) {
    case 'hook':
      return 'emphasis_hook';
    case 'mistake':
      return 'emphasis_mistake';
    case 'result':
      return 'emphasis_result';
    case 'rule':
      return 'emphasis_rule';
  }
};

const addEmphasisRhythm = (drafts: RhythmCueDraft[], emphasisCue: EmphasisCue) => {
  const timing = getCueTiming(emphasisCue);
  const base = {
    emphasisCueId: emphasisCue.cueId,
    source: resolveEmphasisSource(emphasisCue),
    stepId: emphasisCue.stepId
  };

  if (emphasisCue.kind === 'hook') {
    addCue(drafts, {
      ...base,
      durationMs: 650,
      startMs: timing.startMs,
      type: 'beat'
    });
    return;
  }

  if (emphasisCue.kind === 'mistake') {
    addCue(drafts, {
      ...base,
      durationMs: durationWithin(timing, 0.24, 900),
      startMs: timing.startMs,
      type: 'pause'
    });
    addCue(drafts, {
      ...base,
      durationMs: 520,
      startMs: timing.startMs,
      type: 'beat'
    });
    addCue(drafts, {
      ...base,
      durationMs: durationWithin(timing, 0.2, 760),
      startMs: Math.max(timing.startMs, timing.endMs - 900),
      type: 'repeat'
    });
    return;
  }

  if (emphasisCue.kind === 'result') {
    addCue(drafts, {
      ...base,
      durationMs: durationWithin(timing, 0.38, 1400),
      startMs: Math.max(timing.startMs, timing.endMs - 1500),
      type: 'slow'
    });
    addCue(drafts, {
      ...base,
      durationMs: 560,
      startMs: Math.max(timing.startMs, timing.endMs - 1100),
      type: 'beat'
    });
    return;
  }

  addCue(drafts, {
    ...base,
    durationMs: 480,
    startMs: timing.startMs,
    type: 'beat'
  });
};

const resolvePacingType = (pacingHint?: TeachingScriptPacingHint): RhythmCueType | undefined => {
  if (pacingHint === 'fast') {
    return 'speed_up';
  }

  if (pacingHint === 'slow') {
    return 'slow';
  }

  if (pacingHint === 'pause') {
    return 'pause';
  }

  return undefined;
};

export function buildRhythmPlan(
  teachingScript: TeachingScript,
  emphasisPlan: EmphasisPlan,
  subtitleCuePlan: SubtitleCuePlan
): RhythmPlan {
  const drafts: RhythmCueDraft[] = [];
  const firstSubtitleCueByStepId = new Map<string, SubtitleCue>();

  subtitleCuePlan.cues.forEach((cue) => {
    if (!firstSubtitleCueByStepId.has(cue.stepId)) {
      firstSubtitleCueByStepId.set(cue.stepId, cue);
    }
  });

  emphasisPlan.cues.forEach((cue) => {
    addEmphasisRhythm(drafts, cue);
  });

  teachingScript.steps.forEach((step) => {
    const pacingType = resolvePacingType(step.pacingHint);
    const cue = firstSubtitleCueByStepId.get(step.stepId);

    if (!pacingType || !cue) {
      return;
    }

    addCue(drafts, {
      durationMs:
        pacingType === 'speed_up'
          ? durationWithin(cue, 0.18, 700)
          : pacingType === 'slow'
            ? durationWithin(cue, 0.3, 1100)
            : durationWithin(cue, 0.22, 850),
      source: 'pacing_hint',
      startMs: pacingType === 'speed_up' ? cue.startMs : Math.max(cue.startMs, cue.endMs - 1000),
      stepId: step.stepId,
      type: pacingType
    });
  });

  const cues: RhythmCue[] = drafts
    .sort((left, right) => left.startMs - right.startMs || left.type.localeCompare(right.type, 'en'))
    .map((draft, index) => ({
      cueId: `rh${index + 1}`,
      durationMs: draft.durationMs,
      ...(draft.emphasisCueId ? {emphasisCueId: draft.emphasisCueId} : {}),
      source: draft.source,
      startMs: draft.startMs,
      stepId: draft.stepId,
      type: draft.type
    }));

  return {cues};
}

import type {TeachingScript, TeachingScriptStep, TeachingPersonaId} from '../teaching';
import type {EmphasisCue, EmphasisKind, EmphasisPlan} from './emphasisPlanTypes';
import {normalizeSpeakableText} from './normalizeSpeakableText';
import type {RhythmCue, RhythmPlan} from './rhythmPlanTypes';
import type {SubtitleCue, SubtitleCuePlan} from './subtitleCueTypes';
import type {
  PauseType,
  VoiceCue,
  VoiceCuePlan,
  VoiceOutroStyleHint,
  VoiceSegment,
  VoiceStyle
} from './voiceCueTypes';

const DEFAULT_PERSONA: TeachingPersonaId = 'calm_teacher';

const PERSONA_SEGMENT_STYLE = {
  calm_teacher: {
    basePauseAfterType: 'phrase',
    bridgePauseType: 'micro',
    bodyRate: 0.94,
    emphasisRate: 0.88
  },
  exam_coach: {
    basePauseAfterType: 'micro',
    bridgePauseType: 'micro',
    bodyRate: 1.12,
    emphasisRate: 1.05
  },
  strict_teacher: {
    basePauseAfterType: 'phrase',
    bridgePauseType: 'micro',
    bodyRate: 1,
    emphasisRate: 0.84
  }
} as const;

const VOICE_STYLE_RATE_BIAS: Record<VoiceStyle, number> = {
  caution: 0.94,
  conclusion: 0.97,
  deliberate: 0.9,
  emphasis: 0.96,
  hook: 0.92,
  neutral: 1,
  quick: 1.08
};

const EMPHASIS_RATE_BIAS: Record<EmphasisKind, number> = {
  hook: 0.92,
  mistake: 0.86,
  result: 0.94,
  rule: 0.9
};

type SegmentDraft = {
  emphasisType?: EmphasisKind;
  localRate: number;
  outroStyleHint?: VoiceOutroStyleHint;
  pauseAfterMs?: number;
  pauseAfterType?: PauseType;
  pauseBeforeMs?: number;
  pauseBeforeType?: PauseType;
  text: string;
};

const clampRate = (value: number) => {
  return Math.max(0.72, Math.min(1.3, Number(value.toFixed(2))));
};

const normalizeText = (text?: string) => {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
};

const PERSONA_PAUSE_DEBUG_MS: Record<TeachingPersonaId, Record<PauseType, number>> = {
  calm_teacher: {
    emphasis: 350,
    micro: 120,
    none: 0,
    phrase: 220,
    result: 500,
    thinking: 450
  },
  exam_coach: {
    emphasis: 200,
    micro: 60,
    none: 0,
    phrase: 120,
    result: 280,
    thinking: 250
  },
  strict_teacher: {
    emphasis: 250,
    micro: 80,
    none: 0,
    phrase: 150,
    result: 350,
    thinking: 300
  }
};

const applyPauseFromEmphasis = (segment: SegmentDraft, emphasisType?: EmphasisKind) => {
  if (!emphasisType) {
    return segment;
  }

  if (emphasisType === 'rule') {
    const draft: SegmentDraft = {
      ...segment,
      pauseBeforeType: 'emphasis'
    };
    return draft;
  }

  if (emphasisType === 'mistake') {
    const draft: SegmentDraft = {
      ...segment,
      pauseAfterType: 'phrase',
      pauseBeforeType: 'emphasis'
    };
    return draft;
  }

  if (emphasisType === 'result') {
    const draft: SegmentDraft = {
      ...segment,
      pauseAfterType: 'result',
      pauseBeforeType: 'thinking'
    };
    return draft;
  }

  if (emphasisType === 'hook') {
    const draft: SegmentDraft = {
      ...segment,
      pauseAfterType: 'phrase'
    };
    return draft;
  }

  return segment;
};

const withLegacyPauseMs = (draft: SegmentDraft, persona: TeachingPersonaId): SegmentDraft => {
  const pauseDebugMs = PERSONA_PAUSE_DEBUG_MS[persona];

  return {
    ...draft,
    ...(draft.pauseBeforeType ? {pauseBeforeMs: pauseDebugMs[draft.pauseBeforeType]} : {pauseBeforeMs: 0}),
    ...(draft.pauseAfterType ? {pauseAfterMs: pauseDebugMs[draft.pauseAfterType]} : {pauseAfterMs: 0})
  };
};

const overlaps = (
  left: Pick<SubtitleCue, 'endMs' | 'startMs'>,
  right: Pick<RhythmCue, 'durationMs' | 'startMs'>
) => {
  return right.startMs < left.endMs && right.startMs + right.durationMs > left.startMs;
};

const resolveVoiceStyle = (
  teachingStep: TeachingScriptStep | undefined,
  emphasisCues: EmphasisCue[],
  rhythmCues: RhythmCue[]
): VoiceStyle | undefined => {
  if (emphasisCues.some((cue) => cue.kind === 'hook')) {
    return 'hook';
  }

  if (emphasisCues.some((cue) => cue.kind === 'mistake')) {
    return 'caution';
  }

  if (emphasisCues.some((cue) => cue.kind === 'result')) {
    return 'conclusion';
  }

  if (rhythmCues.some((cue) => cue.type === 'pause' || cue.type === 'slow')) {
    return 'deliberate';
  }

  if (rhythmCues.some((cue) => cue.type === 'beat')) {
    return 'emphasis';
  }

  if (rhythmCues.some((cue) => cue.type === 'speed_up') || teachingStep?.pacingHint === 'fast') {
    return 'quick';
  }

  if (teachingStep?.pacingHint === 'slow' || teachingStep?.pacingHint === 'pause') {
    return 'deliberate';
  }

  return 'neutral';
};

const splitByLength = (text: string, maxLength: number) => {
  const normalized = normalizeText(text);

  if (!normalized || normalized.length <= maxLength) {
    return normalized ? [normalized] : [];
  }

  const fragments: string[] = [];
  let cursor = normalized;

  while (cursor.length > maxLength) {
    fragments.push(cursor.slice(0, maxLength));
    cursor = cursor.slice(maxLength);
  }

  if (cursor) {
    fragments.push(cursor);
  }

  return fragments;
};

const splitWithConnectors = (text: string) => {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  return normalized
    .replace(/([，。！？；])/g, '|')
    .replace(/(先|再|最后|注意|记住|所以|然后|因为|如果|但是)/g, '|$1')
    .split('|')
    .map((fragment) => normalizeText(fragment))
    .filter(Boolean);
};

const splitExamClauses = (text: string) => {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const fragments = normalized
    .replace(/([，。！？；])/g, '|')
    .split('|')
    .map((fragment) => normalizeText(fragment))
    .filter(Boolean);

  if (fragments.length === 1) {
    return splitByLength(fragments[0], 12);
  }

  return fragments.flatMap((fragment) => splitByLength(fragment, 12));
};

const splitCalmClauses = (text: string) => {
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const baseFragments = normalized
    .replace(/([。！？；])/g, '|')
    .split('|')
    .map((fragment) => normalizeText(fragment))
    .filter(Boolean);

  if (baseFragments.length <= 1) {
    return splitByLength(normalized, 18);
  }

  if (baseFragments.length === 2) {
    return baseFragments;
  }

  const merged: string[] = [];

  for (let index = 0; index < baseFragments.length; index += 2) {
    merged.push(baseFragments.slice(index, index + 2).join('，'));
  }

  return merged;
};

const splitForPersona = (text: string, persona: TeachingPersonaId) => {
  if (persona === 'strict_teacher') {
    const fragments = splitWithConnectors(text);
    return fragments.flatMap((fragment) => splitByLength(fragment, 9));
  }

  if (persona === 'exam_coach') {
    return splitExamClauses(text);
  }

  return splitCalmClauses(text);
};

const inferOutroStyleHint = (text: string): VoiceOutroStyleHint => {
  const normalized = normalizeText(text);

  if (!normalized) {
    return 'standard';
  }

  if (normalized.includes('考前最后检查')) {
    return 'exam_checklist';
  }

  if (normalized.includes('下一集')) {
    return 'next_episode_tease';
  }

  if (normalized.includes('串着看')) {
    return 'playlist_redirect';
  }

  if (normalized.includes('规则压一遍')) {
    return 'rule_recap';
  }

  if (normalized.includes('先存下来') || normalized.includes('专门回看')) {
    return 'save_and_review';
  }

  return 'standard';
};

const extractRepeatText = (text: string) => {
  const firstChunk = splitWithConnectors(text)[0] ?? normalizeText(text);
  return firstChunk.slice(0, 10).trim();
};

const buildSegmentDrafts = ({
  emphasisType,
  fragments,
  isOutro,
  outroStyleHint,
  persona,
  voiceStyle
}: {
  emphasisType?: EmphasisKind;
  fragments: string[];
  isOutro?: boolean;
  outroStyleHint?: VoiceOutroStyleHint;
  persona: TeachingPersonaId;
  voiceStyle: VoiceStyle;
}) => {
  const personaStyle = PERSONA_SEGMENT_STYLE[persona];
  const drafts: SegmentDraft[] = fragments
    .map((fragment) => normalizeText(fragment))
    .filter(Boolean)
    .map((fragment, index, list) => {
      const baseRate = emphasisType ? personaStyle.emphasisRate : personaStyle.bodyRate;
      const localRate =
        baseRate *
        VOICE_STYLE_RATE_BIAS[voiceStyle] *
        (emphasisType ? EMPHASIS_RATE_BIAS[emphasisType] : 1) *
        (isOutro && outroStyleHint === 'next_episode_tease' && index === list.length - 1 ? 0.9 : 1);

      const draft: SegmentDraft = {
        ...(emphasisType ? {emphasisType} : {}),
        localRate: clampRate(localRate),
        ...(outroStyleHint ? {outroStyleHint} : {}),
        pauseAfterType:
          index === list.length - 1
            ? isOutro
              ? 'result'
              : personaStyle.basePauseAfterType
            : emphasisType
              ? 'phrase'
              : personaStyle.bridgePauseType,
        pauseBeforeType: index === 0 ? 'none' : personaStyle.bridgePauseType,
        text: fragment
      };
      return draft;
    })
    .map((draft) => withLegacyPauseMs(applyPauseFromEmphasis(draft, emphasisType), persona));

  if (persona === 'exam_coach' && (Boolean(emphasisType) || fragments.length > 1)) {
    const repeatText = extractRepeatText(fragments[fragments.length - 1] ?? fragments[0] ?? '');

    if (repeatText) {
      drafts.push(withLegacyPauseMs({
        localRate: clampRate(personaStyle.bodyRate * 1.08),
        ...(outroStyleHint ? {outroStyleHint} : {}),
        pauseAfterType: 'micro',
        pauseBeforeType: 'micro',
        text: repeatText
      }, persona));
    }
  }

  return drafts;
};

const buildOutroSegments = ({
  cueText,
  emphasisText,
  persona,
  voiceStyle
}: {
  cueText: string;
  emphasisText: string;
  persona: TeachingPersonaId;
  voiceStyle: VoiceStyle;
}) => {
  const outroStyleHint = inferOutroStyleHint(emphasisText);
  const personaStyle = PERSONA_SEGMENT_STYLE[persona];
  const sourceText = normalizeText(emphasisText) || normalizeText(cueText);

  if (!sourceText) {
    return [];
  }

  if (outroStyleHint === 'exam_checklist') {
    return buildSegmentDrafts({
      emphasisType: 'result',
      fragments: sourceText.replace(/：/g, '，').split(/[，]/).map((fragment) => normalizeText(fragment)),
      isOutro: true,
      outroStyleHint,
      persona,
      voiceStyle
    });
  }

  if (outroStyleHint === 'next_episode_tease') {
    const openingText = splitForPersona(sourceText, persona)[0] ?? sourceText;

    return [
      withLegacyPauseMs({
        emphasisType: 'result' as const,
        localRate: clampRate(personaStyle.emphasisRate * VOICE_STYLE_RATE_BIAS[voiceStyle] * EMPHASIS_RATE_BIAS.result),
        outroStyleHint,
        pauseAfterType: 'phrase',
        pauseBeforeType: 'thinking',
        text: openingText
      }, persona),
      withLegacyPauseMs({
        localRate: clampRate(personaStyle.bodyRate * 0.9),
        outroStyleHint,
        pauseAfterType: 'result',
        pauseBeforeType: 'phrase',
        text: '下一集继续'
      }, persona)
    ];
  }

  if (outroStyleHint === 'playlist_redirect') {
    return buildSegmentDrafts({
      emphasisType: 'result',
      fragments: sourceText.split(/[，]/).map((fragment) => normalizeText(fragment)),
      isOutro: true,
      outroStyleHint,
      persona,
      voiceStyle
    }).map((segment, index) => ({
      ...segment,
      pauseAfterMs: (segment.pauseAfterMs ?? 0) + (index === 0 ? 50 : 80)
    }));
  }

  if (outroStyleHint === 'rule_recap') {
    return buildSegmentDrafts({
      emphasisType: 'rule',
      fragments: sourceText.replace(/：/g, '，').split(/[，]/).map((fragment) => normalizeText(fragment)),
      isOutro: true,
      outroStyleHint,
      persona,
      voiceStyle
    });
  }

  if (outroStyleHint === 'save_and_review') {
    return buildSegmentDrafts({
      emphasisType: 'mistake',
      fragments: sourceText.split(/[，]/).map((fragment) => normalizeText(fragment)),
      isOutro: true,
      outroStyleHint,
      persona,
      voiceStyle
    }).map((segment, index, list) => ({
      ...segment,
      pauseAfterMs: index === list.length - 1 ? (segment.pauseAfterMs ?? 0) + 80 : segment.pauseAfterMs
    }));
  }

  return buildSegmentDrafts({
    emphasisType: 'result',
    fragments: splitForPersona(sourceText, persona),
    isOutro: true,
    outroStyleHint,
    persona,
    voiceStyle
  });
};

const applyEmphasisToSegment = (
  segment: SegmentDraft,
  emphasisType: EmphasisKind,
  voiceStyle: VoiceStyle,
  persona: TeachingPersonaId
): SegmentDraft => {
  const emphasizedDraft: SegmentDraft = {
    ...segment,
    emphasisType,
    localRate: clampRate(segment.localRate * EMPHASIS_RATE_BIAS[emphasisType] * VOICE_STYLE_RATE_BIAS[voiceStyle]),
    pauseAfterType:
      emphasisType === 'hook'
        ? 'phrase'
        : emphasisType === 'result'
          ? 'result'
          : segment.pauseAfterType ?? 'phrase'
  };

  return withLegacyPauseMs(applyPauseFromEmphasis(emphasizedDraft, emphasisType), persona);
};

const maybeAttachEmphasisToBaseSegments = ({
  baseSegments,
  emphasisCue,
  persona,
  voiceStyle
}: {
  baseSegments: SegmentDraft[];
  emphasisCue: EmphasisCue;
  persona: TeachingPersonaId;
  voiceStyle: VoiceStyle;
}) => {
  const normalizedEmphasisText = normalizeText(emphasisCue.text);
  const matchedIndex = baseSegments.findIndex((segment) => {
    return normalizeText(segment.text) === normalizedEmphasisText;
  });

  if (matchedIndex === -1) {
    return false;
  }

  baseSegments[matchedIndex] = applyEmphasisToSegment(baseSegments[matchedIndex], emphasisCue.kind, voiceStyle, persona);
  return true;
};

const toVoiceSegments = (cueId: string, drafts: SegmentDraft[]) => {
  return drafts
    .map((draft) => ({
      ...draft,
      text: normalizeText(draft.text)
    }))
    .filter((draft) => draft.text)
    .map((draft, index): VoiceSegment => {
      return {
        ...(draft.emphasisType ? {emphasisType: draft.emphasisType} : {}),
        localRate: draft.localRate,
        ...(draft.outroStyleHint ? {outroStyleHint: draft.outroStyleHint} : {}),
        ...(draft.pauseAfterMs !== undefined ? {pauseAfterMs: draft.pauseAfterMs} : {}),
        ...(draft.pauseAfterType ? {pauseAfterType: draft.pauseAfterType} : {}),
        ...(draft.pauseBeforeMs !== undefined ? {pauseBeforeMs: draft.pauseBeforeMs} : {}),
        ...(draft.pauseBeforeType ? {pauseBeforeType: draft.pauseBeforeType} : {}),
        segmentId: `${cueId}-seg${index + 1}`,
        speakableText: normalizeSpeakableText(draft.text, {pauseAfterType: draft.pauseAfterType}) || draft.text,
        text: draft.text
      };
    });
};

export function buildVoiceCuePlan(
  teachingScript: TeachingScript,
  subtitleCuePlan: SubtitleCuePlan,
  emphasisPlan?: EmphasisPlan,
  rhythmPlan?: RhythmPlan
): VoiceCuePlan {
  const persona = teachingScript.persona ?? DEFAULT_PERSONA;
  const teachingStepById = new Map(teachingScript.steps.map((step) => [step.stepId, step]));

  const cues: VoiceCue[] = subtitleCuePlan.cues.map((subtitleCue, index) => {
    const teachingStep = teachingStepById.get(subtitleCue.stepId);
    const emphasisCues =
      emphasisPlan?.cues.filter((cue) => cue.subtitleCueId === subtitleCue.cueId) ?? [];
    const rhythmCues =
      rhythmPlan?.cues.filter((cue) => cue.stepId === subtitleCue.stepId && overlaps(subtitleCue, cue)) ?? [];
    const text = normalizeText(subtitleCue.text) || normalizeText(teachingStep?.narration);
    const voiceStyle = resolveVoiceStyle(teachingStep, emphasisCues, rhythmCues) ?? 'neutral';
    const emphasisCueIds = emphasisCues.map((cue) => cue.cueId);
    const rhythmCueIds = rhythmCues.map((cue) => cue.cueId);
    const baseSegments = buildSegmentDrafts({
      fragments: splitForPersona(text, persona),
      persona,
      voiceStyle
    });
    const leadingSegments: SegmentDraft[] = [];
    const inlineSegments: SegmentDraft[] = [];
    const trailingSegments: SegmentDraft[] = [];

    emphasisCues.forEach((emphasisCue) => {
      if (maybeAttachEmphasisToBaseSegments({baseSegments, emphasisCue, persona, voiceStyle})) {
        return;
      }

      if (emphasisCue.source === 'outro_summary') {
        trailingSegments.push(
          ...buildOutroSegments({
            cueText: text,
            emphasisText: emphasisCue.text,
            persona,
            voiceStyle
          })
        );
        return;
      }

      const emphasisSegments = buildSegmentDrafts({
        emphasisType: emphasisCue.kind,
        fragments: splitForPersona(emphasisCue.text, persona),
        persona,
        voiceStyle
      });

      if (emphasisCue.kind === 'hook') {
        leadingSegments.push(...emphasisSegments);
        return;
      }

      if (emphasisCue.kind === 'result') {
        trailingSegments.push(...emphasisSegments);
        return;
      }

      inlineSegments.push(...emphasisSegments);
    });

    const combinedDrafts =
      baseSegments.length > 0
        ? [...leadingSegments, baseSegments[0], ...inlineSegments, ...baseSegments.slice(1), ...trailingSegments]
        : [...leadingSegments, ...inlineSegments, ...trailingSegments];

    const segments = toVoiceSegments(`vc${index + 1}`, combinedDrafts);

    return {
      cueId: `vc${index + 1}`,
      ...(emphasisCueIds.length > 0 ? {emphasisCueIds} : {}),
      endMs: subtitleCue.endMs,
      persona,
      ...(rhythmCueIds.length > 0 ? {rhythmCueIds} : {}),
      segments,
      shotId: subtitleCue.shotId,
      startMs: subtitleCue.startMs,
      stepId: subtitleCue.stepId,
      subtitleCueId: subtitleCue.cueId,
      text,
      ...(voiceStyle ? {voiceStyle} : {})
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

const formatTimeLabel = (timeMs: number) => {
  return `${(timeMs / 1000).toFixed(2)}s`;
};

export function serializeVoiceCuePlanToSrt(voiceCuePlan: VoiceCuePlan): string {
  return voiceCuePlan.cues
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

export function serializeVoiceCuePlanToText(voiceCuePlan: VoiceCuePlan): string {
  return voiceCuePlan.cues
    .map((cue) => {
      const style = cue.voiceStyle ? ` / ${cue.voiceStyle}` : '';
      const segmentSummary = cue.segments
        .map((segment) => {
          const emphasis = segment.emphasisType ? `:${segment.emphasisType}` : '';
          const outro = segment.outroStyleHint ? `:${segment.outroStyleHint}` : '';
          const speakable = segment.speakableText !== segment.text ? ` => ${segment.speakableText}` : '';
          const pause = `${segment.pauseBeforeType ?? 'none'}:${segment.pauseBeforeMs ?? 0}/${segment.pauseAfterType ?? 'none'}:${segment.pauseAfterMs ?? 0}`;
          return `${segment.segmentId}[${(segment.localRate ?? 1).toFixed(2)},${pause}${emphasis}${outro}] ${segment.text}${speakable}`;
        })
        .join(' | ');

      return [
        `[${formatTimeLabel(cue.startMs)}-${formatTimeLabel(cue.endMs)}] ${cue.persona}${style} ${cue.stepId}: ${cue.text}`,
        `  segments: ${segmentSummary}`
      ].join('\n');
    })
    .join('\n');
}

export function serializeVoiceCuePlanToSpeakableText(voiceCuePlan: VoiceCuePlan): string {
  return voiceCuePlan.cues
    .map((cue) => {
      const style = cue.voiceStyle ? ` / ${cue.voiceStyle}` : '';
      const segmentSummary = cue.segments
        .map((segment) => {
          return `${segment.segmentId}[${(segment.localRate ?? 1).toFixed(2)},${segment.pauseBeforeType ?? 'none'}:${segment.pauseBeforeMs ?? 0}/${segment.pauseAfterType ?? 'none'}:${segment.pauseAfterMs ?? 0}] ${segment.speakableText || segment.text}`;
        })
        .join(' | ');

      return [
        `[${formatTimeLabel(cue.startMs)}-${formatTimeLabel(cue.endMs)}] ${cue.persona}${style} ${cue.stepId}: ${cue.segments.map((segment) => segment.speakableText || segment.text).join(' ')}`,
        `  segments: ${segmentSummary}`
      ].join('\n');
    })
    .join('\n');
}

export function serializeVoiceCuePauseDebug(voiceCuePlan: VoiceCuePlan): string {
  return JSON.stringify(
    voiceCuePlan.cues.map((cue) => ({
      cueId: cue.cueId,
      persona: cue.persona,
      segments: cue.segments.map((segment) => ({
        pauseAfterMs: segment.pauseAfterMs ?? 0,
        pauseAfterType: segment.pauseAfterType ?? 'none',
        pauseBeforeMs: segment.pauseBeforeMs ?? 0,
        pauseBeforeType: segment.pauseBeforeType ?? 'none',
        segmentId: segment.segmentId,
        segmentText: segment.text,
        speakableText: segment.speakableText
      }))
    })),
    null,
    2
  );
}

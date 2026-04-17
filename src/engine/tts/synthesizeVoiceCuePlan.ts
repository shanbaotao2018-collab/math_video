declare const require: (id: string) => any;

import type {PauseType, VoiceCue, VoiceSegment, VoiceStyle} from '../render';
import type {
  AudioTrackPlan,
  AudioTrackSegment,
  TtsProvider,
  TtsProviderCapabilities,
  TtsProviderKind,
  TtsSynthesisOptions,
  VoiceTextSource,
  VoiceCuePlanInput,
  VoiceStrategyProfile
} from './ttsTypes';
import {getTtsProviderCapabilities, resolveRealProviderName} from './providerCapabilities';
import {resolveVoiceStrategyProfile} from './voiceStrategyProfiles';
import {mapVoiceStrategyRateToSayRate, resolveRealProviderVoiceMapping} from './voiceProviderMappings';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

const PERSONA_BASE_FREQUENCY: Record<VoiceStrategyProfile['persona'], number> = {
  calm_teacher: 305,
  exam_coach: 365,
  strict_teacher: 425
};

const VOICE_STYLE_FREQUENCY_OFFSET: Record<VoiceStyle, number> = {
  caution: 18,
  conclusion: -22,
  deliberate: -36,
  emphasis: 30,
  hook: 42,
  neutral: 0,
  quick: 58
};

const VOICE_STYLE_RATE_MULTIPLIER: Record<VoiceStyle, number> = {
  caution: 0.94,
  conclusion: 0.97,
  deliberate: 0.9,
  emphasis: 1.02,
  hook: 1.05,
  neutral: 1,
  quick: 1.08
};

const EMPHASIS_FREQUENCY_OFFSET = {
  hook: 55,
  mistake: 38,
  result: -18,
  rule: 24
} as const;

const EMPHASIS_AMPLITUDE_MULTIPLIER = {
  hook: 1.2,
  mistake: 1.24,
  result: 1.08,
  rule: 1.16
} as const;

const ensureDir = (dirPath: string) => {
  fs.mkdirSync(dirPath, {recursive: true});
};

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const sanitizeFilePart = (value: string) => {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'cue';
};

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const writePcmWav = (filePath: string, samples: Int16Array) => {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(offset, samples[index] ?? 0, true);
    offset += BYTES_PER_SAMPLE;
  }

  fs.writeFileSync(filePath, new Uint8Array(buffer));
};

const resolveVoiceStyle = (voiceStyle?: VoiceStyle): VoiceStyle => {
  return voiceStyle ?? 'neutral';
};

const resolveVoiceSegments = (cue: VoiceCue): VoiceSegment[] => {
  return cue.segments?.length > 0
    ? cue.segments
    : [
        {
          localRate: 1,
          pauseAfterMs: 120,
          pauseAfterType: 'phrase',
          pauseBeforeMs: 0,
          pauseBeforeType: 'none',
          segmentId: `${cue.cueId}-seg1`,
          speakableText: cue.text,
          text: cue.text
        }
      ];
};

export const resolvePauseMs = (
  pauseType: PauseType | undefined,
  voiceStrategyProfile: VoiceStrategyProfile
) => {
  if (!pauseType) {
    return 0;
  }

  return voiceStrategyProfile.pausePattern[pauseType] ?? 0;
};

const getCueDurationMs = (cue: Pick<VoiceCue, 'endMs' | 'startMs'>) => {
  return Math.max(1, cue.endMs - cue.startMs);
};

const hasVoiceTimelineOverlap = (cues: VoiceCue[]) => {
  for (let index = 1; index < cues.length; index += 1) {
    const previousCue = cues[index - 1];
    const currentCue = cues[index];

    if (currentCue.startMs < previousCue.endMs) {
      return true;
    }
  }

  return false;
};

export function normalizeVoiceTimeline(cues: VoiceCue[]): VoiceCue[] {
  let currentTime = 0;

  return cues.map((cue) => {
    const durationMs = getCueDurationMs(cue);
    const startMs = currentTime;
    const endMs = startMs + durationMs;

    currentTime = endMs;

    return {
      ...cue,
      endMs,
      startMs
    };
  });
}

const normalizeAudioTrackSegments = (segments: AudioTrackSegment[]) => {
  let cursorMs = 0;

  return segments.map((segment) => {
    const durationMs = Math.max(1, segment.generatedDurationMs ?? segment.durationMs);
    const normalizedSegment = {
      ...segment,
      durationMs,
      startMs: cursorMs
    };

    cursorMs += durationMs;
    return normalizedSegment;
  });
};

const buildSegmentSpeechWeights = (cue: VoiceCue, voiceStrategyProfile: VoiceStrategyProfile) => {
  return resolveVoiceSegments(cue).map((segment) => {
    const charWeight = Math.max(1, segment.text.trim().length);
    const rateBias = clamp((segment.localRate ?? 1) * voiceStrategyProfile.rate, 0.72, 1.35);
    const emphasisBias = segment.emphasisType ? EMPHASIS_AMPLITUDE_MULTIPLIER[segment.emphasisType] : 1;

    return (charWeight * emphasisBias) / rateBias;
  });
};

const estimateCueSpeechBudgetMs = (
  cue: VoiceCue,
  voiceStrategyProfile: VoiceStrategyProfile,
  cueDurationMs: number
) => {
  const cueSegments = resolveVoiceSegments(cue);
  const totalPauseMs = cueSegments.reduce((total, segment) => {
    return (
      total +
      resolvePauseMs(segment.pauseBeforeType, voiceStrategyProfile) +
      resolvePauseMs(segment.pauseAfterType, voiceStrategyProfile)
    );
  }, 0);

  return Math.max(
    180,
    cueDurationMs - Math.min(totalPauseMs, Math.round(cueDurationMs * 0.45))
  );
};

export function buildCueSegmentTimeline(
  cue: VoiceCue,
  voiceStrategyProfile: VoiceStrategyProfile,
  cueDurationMs = getCueDurationMs(cue)
) {
  const cueSegments = resolveVoiceSegments(cue);
  const speechBudgetMs = estimateCueSpeechBudgetMs(cue, voiceStrategyProfile, cueDurationMs);
  const speechWeights = buildSegmentSpeechWeights(cue, voiceStrategyProfile);
  const totalWeight = speechWeights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursorMs = 0;

  return cueSegments.map((segment, index) => {
    const pauseBeforeMs = resolvePauseMs(segment.pauseBeforeType, voiceStrategyProfile);
    const pauseAfterMs = resolvePauseMs(segment.pauseAfterType, voiceStrategyProfile);

    cursorMs += pauseBeforeMs;
    const speechDurationMs = Math.max(
      120,
      Math.round((speechBudgetMs * (speechWeights[index] ?? 1)) / totalWeight)
    );
    const startMs = cursorMs;
    const endMs = startMs + speechDurationMs;

    cursorMs = endMs + pauseAfterMs;

    return {
      durationMs: speechDurationMs,
      endMs,
      pauseAfterMs,
      pauseBeforeMs,
      segmentId: segment.segmentId,
      startMs
    };
  });
}

const resolveSegmentSpeech = (segment: VoiceSegment) => {
  const speakableText = segment.speakableText?.trim() ?? '';
  const fallbackText = segment.text?.trim() ?? '';

  if (speakableText) {
    return {
      source: 'speakable_text' as VoiceTextSource,
      text: speakableText
    };
  }

  return {
    source: 'text' as VoiceTextSource,
    text: fallbackText
  };
};

const buildCueSpeechPayload = (cue: VoiceCue) => {
  const segments = resolveVoiceSegments(cue);
  const resolvedSegments = segments.map((segment) => {
    return {
      ...resolveSegmentSpeech(segment),
      pauseAfterType: segment.pauseAfterType,
      pauseBeforeType: segment.pauseBeforeType,
      segmentId: segment.segmentId
    };
  });
  const sourceSet = new Set(resolvedSegments.map((segment) => segment.source));
  const textSource: VoiceTextSource =
    sourceSet.size > 1
      ? 'mixed'
      : resolvedSegments[0]?.source ?? 'text';
  const spokenText = resolvedSegments
    .map((segment, index) => {
      const before =
        index === 0
          ? ''
          : segment.pauseBeforeType === 'thinking'
            ? '... '
            : segment.pauseBeforeType === 'emphasis' || segment.pauseBeforeType === 'phrase'
              ? '，'
              : '';
      const after =
        segment.pauseAfterType === 'result'
          ? '。'
          : segment.pauseAfterType === 'thinking'
            ? '…'
            : segment.pauseAfterType === 'emphasis' || segment.pauseAfterType === 'phrase'
              ? '，'
              : '';
      return `${before}${segment.text}${after}`;
    })
    .join('')
    .trim();

  return {
    spokenText,
    textSource
  };
};

const buildProviderSelectionOrder = (
  requestedProvider: TtsProviderKind,
  voiceStrategyProfile: VoiceStrategyProfile
) => {
  return Array.from(
    new Set<TtsProviderKind>([
      requestedProvider,
      ...voiceStrategyProfile.preferredProviderOrder,
      'mock',
      'real'
    ])
  );
};

const resolvePersona = (
  voiceCuePlan: VoiceCuePlanInput,
  options: TtsSynthesisOptions
): VoiceStrategyProfile['persona'] => {
  return voiceCuePlan.cues[0]?.persona ?? options.teachingPersona ?? 'calm_teacher';
};

const estimateMockCueDurationMs = (cue: VoiceCue, voiceStrategyProfile: VoiceStrategyProfile) => {
  const cueDurationMs = Math.max(240, getCueDurationMs(cue));
  const voiceStyle = resolveVoiceStyle(cue.voiceStyle);
  const styleRateBias = 1 / VOICE_STYLE_RATE_MULTIPLIER[voiceStyle];
  const emphasisBias = voiceStyle === 'hook' || voiceStyle === 'emphasis' ? 0.12 : 0.06;
  const targetRatio = clamp(
    0.76 +
      (1 - voiceStrategyProfile.rate) * 0.45 +
      (voiceStrategyProfile.pauseScale - 1) * 0.22 +
      (voiceStrategyProfile.emphasisBoost - 1) * emphasisBias +
      (styleRateBias - 1) * 0.08,
    0.56,
    0.95
  );

  return Math.round(cueDurationMs * targetRatio);
};

const createSilenceSamples = (durationMs: number) => {
  const sampleCount = Math.max(0, Math.round((Math.max(0, durationMs) / 1000) * SAMPLE_RATE));
  return new Int16Array(sampleCount);
};

const createToneSamples = ({
  amplitude,
  durationMs,
  frequency,
  pulseRate
}: {
  amplitude: number;
  durationMs: number;
  frequency: number;
  pulseRate: number;
}) => {
  const sampleCount = Math.max(1, Math.round((durationMs / 1000) * SAMPLE_RATE));
  const samples = new Int16Array(sampleCount);
  const fadeSamples = Math.min(Math.round(SAMPLE_RATE * 0.04), Math.floor(sampleCount / 2));

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / SAMPLE_RATE;
    const envelope =
      fadeSamples > 0 && index < fadeSamples
        ? index / fadeSamples
        : fadeSamples > 0 && index > sampleCount - fadeSamples
          ? (sampleCount - index) / fadeSamples
          : 1;
    const carrier = Math.sin(2 * Math.PI * frequency * time);
    const pulse = 0.6 + 0.4 * Math.sin(2 * Math.PI * pulseRate * time);

    samples[index] = Math.round(carrier * pulse * envelope * amplitude);
  }

  return samples;
};

const concatSamples = (segments: Int16Array[]) => {
  const totalLength = segments.reduce((total, segment) => total + segment.length, 0);
  const samples = new Int16Array(totalLength);
  let offset = 0;

  segments.forEach((segment) => {
    samples.set(segment, offset);
    offset += segment.length;
  });

  return samples;
};

const createMockSamples = (cue: VoiceCue, seed: number, voiceStrategyProfile: VoiceStrategyProfile) => {
  const targetDurationMs = estimateMockCueDurationMs(cue, voiceStrategyProfile);
  const cueSegments = resolveVoiceSegments(cue);
  const voiceStyle = resolveVoiceStyle(cue.voiceStyle);
  const segmentTimeline = buildCueSegmentTimeline(cue, voiceStrategyProfile, targetDurationMs);
  const baseFrequency = PERSONA_BASE_FREQUENCY[voiceStrategyProfile.persona];
  const pulseBaseRate = clamp(3.2 * voiceStrategyProfile.rate, 2.4, 5.8);
  const sampleParts: Int16Array[] = [];
  let assembledDurationMs = 0;

  cueSegments.forEach((segment, index) => {
    const speechDurationMs = segmentTimeline[index]?.durationMs ?? 120;
    const emphasisFrequency =
      segment.emphasisType ? EMPHASIS_FREQUENCY_OFFSET[segment.emphasisType] : 0;
    const emphasisAmplitude =
      segment.emphasisType ? EMPHASIS_AMPLITUDE_MULTIPLIER[segment.emphasisType] : 1;
    const frequency =
      baseFrequency +
      VOICE_STYLE_FREQUENCY_OFFSET[voiceStyle] +
      emphasisFrequency +
      (seed % 5) * 17 +
      index * 9;
    const amplitude = Math.round(
      clamp(2400 * voiceStrategyProfile.emphasisBoost * emphasisAmplitude, 2000, 4700)
    );
    const pulseRate = clamp(
      pulseBaseRate * (segment.localRate ?? 1) * (segment.outroStyleHint === 'next_episode_tease' ? 0.92 : 1),
      2.2,
      6.2
    );
    const pauseBeforeMs = resolvePauseMs(segment.pauseBeforeType, voiceStrategyProfile);
    const pauseAfterMs = resolvePauseMs(segment.pauseAfterType, voiceStrategyProfile);

    if (pauseBeforeMs > 0) {
      sampleParts.push(createSilenceSamples(pauseBeforeMs));
      assembledDurationMs += pauseBeforeMs;
    }

    sampleParts.push(
      createToneSamples({
        amplitude,
        durationMs: speechDurationMs,
        frequency,
        pulseRate
      })
    );
    assembledDurationMs += speechDurationMs;

    if (pauseAfterMs > 0) {
      sampleParts.push(createSilenceSamples(pauseAfterMs));
      assembledDurationMs += pauseAfterMs;
    }
  });

  return {
    durationMs: assembledDurationMs,
    samples: concatSamples(sampleParts)
  };
};

const writeMockMixedTrack = (
  filePath: string,
  renderedSegments: Array<{
    durationMs: number;
    filePath: string;
  }>,
) => {
  const durationMs = Math.max(renderedSegments.reduce((total, segment) => total + segment.durationMs, 0), 1);
  const sampleCount = Math.max(1, Math.round((durationMs / 1000) * SAMPLE_RATE));
  const mixed = new Int16Array(sampleCount);
  let cursor = 0;

  renderedSegments.forEach((segment) => {
    const fileBuffer = fs.readFileSync(segment.filePath);
    const cueSamples = new Int16Array(
      fileBuffer.buffer.slice(
        fileBuffer.byteOffset + 44,
        fileBuffer.byteOffset + fileBuffer.byteLength
      )
    );

    for (let index = 0; index < cueSamples.length && cursor + index < mixed.length; index += 1) {
      mixed[cursor + index] = cueSamples[index] ?? 0;
    }

    cursor += cueSamples.length;
  });

  writePcmWav(filePath, mixed);
};

const buildSayRate = (cue: VoiceCue, voiceStrategyProfile: VoiceStrategyProfile) => {
  const voiceStyle = resolveVoiceStyle(cue.voiceStyle);
  return String(
    Math.round(
      clamp(mapVoiceStrategyRateToSayRate(voiceStrategyProfile.rate) * VOICE_STYLE_RATE_MULTIPLIER[voiceStyle], 125, 240)
    )
  );
};

const buildMockProvider = (capabilities: TtsProviderCapabilities): TtsProvider => {
  return {
    capabilities,
    kind: 'mock',
    synthesizeCue: (cue, filePath, voiceStrategyProfile) => {
      const mockResult = createMockSamples(cue, cue.cueId.length + cue.stepId.length, voiceStrategyProfile);
      const cueSpeechPayload = buildCueSpeechPayload(cue);

      writePcmWav(filePath, mockResult.samples);
      return {
        durationMs: mockResult.durationMs,
        filePath,
        spokenText: cueSpeechPayload.spokenText,
        textSource: cueSpeechPayload.textSource
      };
    }
  };
};

const buildRealProvider = (
  realProviderName: string | undefined,
  capabilities: TtsProviderCapabilities,
  voiceStrategyProfile: VoiceStrategyProfile
): TtsProvider | undefined => {
  if (realProviderName !== 'say' || !capabilities.available) {
    return undefined;
  }

  const voiceMappingResolution = resolveRealProviderVoiceMapping(realProviderName, voiceStrategyProfile);

  if (!voiceMappingResolution?.voiceMapping.actualVoiceName) {
    return undefined;
  }

  return {
    capabilities,
    kind: 'real',
    synthesizeCue: (cue, filePath, voiceStrategyProfile) => {
      const cueSpeechPayload = buildCueSpeechPayload(cue);
      const speechRate = Number(buildSayRate(cue, voiceStrategyProfile));
      const result = childProcess.spawnSync(
        'say',
        [
          '-v',
          voiceMappingResolution.voiceMapping.actualVoiceName,
          '-r',
          String(speechRate),
          '-o',
          filePath,
          '--file-format=WAVE',
          `--data-format=LEI16@${SAMPLE_RATE}`,
          cueSpeechPayload.spokenText || cue.text
        ],
        {
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );

      if (result.status !== 0) {
        return {
          filePath,
          warning: `say failed for ${cue.cueId}: ${(result.stderr || result.stdout || '').trim()}`
        };
      }

      return {
        filePath,
        locale: voiceMappingResolution.voiceMapping.actualLocale ?? voiceMappingResolution.voiceMapping.locale,
        providerName: realProviderName,
        speechRate,
        spokenText: cueSpeechPayload.spokenText,
        textSource: cueSpeechPayload.textSource,
        voiceName: voiceMappingResolution.voiceMapping.actualVoiceName
      };
    }
  };
};

const buildProvider = (
  providerKind: TtsProviderKind,
  options: TtsSynthesisOptions,
  capabilities: TtsProviderCapabilities,
  voiceStrategyProfile: VoiceStrategyProfile
) => {
  if (providerKind === 'mock') {
    return buildMockProvider(capabilities);
  }

  return buildRealProvider(resolveRealProviderName(options.realProviderName), capabilities, voiceStrategyProfile);
};

const resolveProviderSelection = (
  voiceCuePlan: VoiceCuePlanInput,
  options: TtsSynthesisOptions
) => {
  const persona = resolvePersona(voiceCuePlan, options);
  const voiceStrategyProfile = resolveVoiceStrategyProfile(persona);
  const providerFallbackOrder = buildProviderSelectionOrder(options.provider, voiceStrategyProfile);
  const warnings: string[] = [];

  for (const providerKind of providerFallbackOrder) {
    const capabilities = getTtsProviderCapabilities(providerKind, {
      realProviderName: options.realProviderName
    });
    const provider = buildProvider(providerKind, options, capabilities, voiceStrategyProfile);
    const realProviderName = resolveRealProviderName(options.realProviderName);
    const voiceMappingResolution =
      providerKind === 'real'
        ? resolveRealProviderVoiceMapping(realProviderName, voiceStrategyProfile)
        : undefined;

    if (!capabilities.available || !provider) {
      if (providerKind === options.provider && capabilities.availabilityNote) {
        warnings.push(capabilities.availabilityNote);
      }
      continue;
    }

    warnings.push(...(voiceMappingResolution?.warnings ?? []));

    if (providerKind !== options.provider) {
      warnings.push(`tts provider ${options.provider} unavailable, fell back to ${providerKind} for ${persona}.`);
    }

    return {
      persona,
      provider,
      providerCapabilities: capabilities,
      providerResolutionOrder: {
        fallbackOrder: providerFallbackOrder,
        requestedProvider: options.provider,
        resolvedProvider: provider.kind
      },
      resolvedVoice: voiceMappingResolution?.voiceMapping,
      voiceStrategyProfile,
      warnings
    };
  }

  return {
    persona,
    provider: undefined,
    providerCapabilities: getTtsProviderCapabilities(options.provider, {
      realProviderName: options.realProviderName
    }),
    providerResolutionOrder: {
      fallbackOrder: providerFallbackOrder,
      requestedProvider: options.provider
    },
    resolvedVoice: undefined,
    voiceStrategyProfile,
    warnings
  };
};

export function synthesizeVoiceCuePlan(
  voiceCuePlan: VoiceCuePlanInput,
  options: TtsSynthesisOptions
): AudioTrackPlan {
  ensureDir(options.outputDir);

  const overlapDetected = hasVoiceTimelineOverlap(voiceCuePlan.cues);
  const normalizedCues = normalizeVoiceTimeline(voiceCuePlan.cues);
  const resolvedSelection = resolveProviderSelection(voiceCuePlan, options);
  const warnings = [...resolvedSelection.warnings];

  if (overlapDetected) {
    warnings.push('voice cues overlapped in source timeline and were normalized to sequential playback.');
  }

  if (!resolvedSelection.provider) {
    return {
      overlapDetected: false,
      persona: resolvedSelection.persona,
      provider: options.provider,
      providerCapabilities: resolvedSelection.providerCapabilities,
      providerResolutionOrder: resolvedSelection.providerResolutionOrder,
      qa: {
        segmentCount: voiceCuePlan.cues.length,
        validSegmentCount: 0,
        warnings: [...warnings]
      },
      requestedProvider: options.provider,
      segments: [],
      speechMode: 'signal',
      status: 'unavailable',
      timelineMode: 'sequential',
      voiceStrategyProfile: resolvedSelection.voiceStrategyProfile,
      ...(warnings.length > 0 ? {warnings} : {})
    };
  }

  const segments: AudioTrackSegment[] = [];
  const renderedSegments: Array<{
    durationMs: number;
    filePath: string;
  }> = [];

  normalizedCues.forEach((cue) => {
    const extension = resolvedSelection.providerCapabilities.outputFormat;
    const filePath = path.join(
      options.outputDir,
      `${sanitizeFilePart(cue.cueId)}-${sanitizeFilePart(cue.stepId)}.${extension}`
    );
    const result = resolvedSelection.provider.synthesizeCue(
      cue,
      filePath,
      resolvedSelection.voiceStrategyProfile
    );

    if (result.warning) {
      warnings.push(result.warning);
    }

    if (fs.existsSync(result.filePath)) {
      const generatedDurationMs = Math.max(1, result.durationMs ?? getCueDurationMs(cue));

      segments.push({
        cueId: cue.cueId,
        durationMs: generatedDurationMs,
        displayText: cue.text,
        filePath: result.filePath,
        generatedDurationMs,
        ...(result.locale ? {locale: result.locale} : {}),
        persona: resolvedSelection.persona,
        provider: resolvedSelection.provider.kind,
        ...(result.providerName ? {providerName: result.providerName} : {}),
        qa: {
          exists: true,
          fileSizeBytes: fs.statSync(result.filePath).size,
          durationMs: generatedDurationMs,
          valid: true,
          warnings: []
        },
        ...(result.speechRate ? {speechRate: result.speechRate} : {}),
        ...(result.spokenText ? {spokenText: result.spokenText} : {}),
        startMs: cue.startMs,
        ...(result.textSource ? {textSource: result.textSource} : {}),
        ...(result.voiceName ? {voiceName: result.voiceName} : {}),
        ...(cue.voiceStyle ? {voiceStyle: cue.voiceStyle} : {})
      });
      renderedSegments.push({
        durationMs: generatedDurationMs,
        filePath: result.filePath
      });
    }
  });
  const sequentialSegments = normalizeAudioTrackSegments(segments);

  const mixedFilePath =
    resolvedSelection.provider.kind === 'mock' && renderedSegments.length > 0
      ? path.join(options.outputDir, 'mock-voice-track.wav')
      : undefined;

  if (mixedFilePath) {
    writeMockMixedTrack(mixedFilePath, renderedSegments);
  }

  return {
    ...(mixedFilePath ? {mixedFilePath} : {}),
    overlapDetected: false,
    persona: resolvedSelection.persona,
    provider: resolvedSelection.provider.kind,
    providerCapabilities: resolvedSelection.providerCapabilities,
    providerResolutionOrder: resolvedSelection.providerResolutionOrder,
    qa: {
      segmentCount: normalizedCues.length,
      validSegmentCount: sequentialSegments.length,
      warnings: [...warnings]
    },
    requestedProvider: options.provider,
    ...(resolvedSelection.resolvedVoice ? {resolvedVoice: resolvedSelection.resolvedVoice} : {}),
    segments: sequentialSegments,
    speechMode: resolvedSelection.provider.kind === 'real' ? 'real_speech' : 'signal',
    status: sequentialSegments.length > 0 ? 'available' : 'unavailable',
    timelineMode: 'sequential',
    voiceStrategyProfile: resolvedSelection.voiceStrategyProfile,
    ...(warnings.length > 0 ? {warnings} : {})
  };
}

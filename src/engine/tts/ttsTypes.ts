import type {PauseType, VoiceCue, VoiceCuePlan, VoiceStyle} from '../render';
import type {TeachingPersonaId} from '../teaching';

export type TtsProviderKind = 'mock' | 'real';

export type TtsProviderStatus = 'available' | 'unavailable';

export type SpeechMode = 'real_speech' | 'signal';

export type VoiceTextSource = 'mixed' | 'speakable_text' | 'text';

export type VoiceStrategyProfile = {
  emphasisBoost: number;
  pausePattern: Record<PauseType, number>;
  pauseScale: number;
  persona: TeachingPersonaId;
  preferredProviderOrder: TtsProviderKind[];
  rate: number;
};

export type TtsProviderCapabilities = {
  availabilityNote?: string;
  available: boolean;
  outputFormat: 'aiff' | 'wav';
  provider: TtsProviderKind;
  supportsEmphasisBoost: boolean;
  supportsPauseScale: boolean;
  supportsRate: boolean;
};

export type ProviderResolutionOrder = {
  fallbackOrder: TtsProviderKind[];
  requestedProvider: TtsProviderKind;
  resolvedProvider?: TtsProviderKind;
};

export type ProviderVoiceMapping = {
  actualLocale?: string;
  actualVoiceName?: string;
  locale: string;
  persona: TeachingPersonaId;
  providerName?: string;
  requestedVoiceName?: string;
  speechRate?: number;
  voiceCandidates?: string[];
};

export type AudioSegmentQa = {
  durationMs?: number;
  exists: boolean;
  fileSizeBytes: number;
  valid: boolean;
  warnings: string[];
};

export type AudioTrackSegment = {
  cueId: string;
  durationMs: number;
  displayText?: string;
  filePath: string;
  generatedDurationMs?: number;
  locale?: string;
  persona?: TeachingPersonaId;
  provider?: TtsProviderKind;
  providerName?: string;
  qa?: AudioSegmentQa;
  speechRate?: number;
  spokenText?: string;
  startMs: number;
  textSource?: VoiceTextSource;
  voiceName?: string;
  voiceStyle?: VoiceStyle;
};

export type AudioTrackQa = {
  expectedDurationMs?: number;
  hasAudioStream?: boolean;
  isNonSilent?: boolean;
  mixedDurationMs?: number;
  mixedFileSizeBytes?: number;
  mixedPeakDb?: number;
  segmentCount: number;
  validSegmentCount: number;
  warnings: string[];
};

export type AudioTrackPlan = {
  mixedFilePath?: string;
  overlapDetected: boolean;
  persona?: TeachingPersonaId;
  provider: TtsProviderKind;
  providerCapabilities?: TtsProviderCapabilities;
  providerResolutionOrder?: ProviderResolutionOrder;
  qa: AudioTrackQa;
  requestedProvider?: TtsProviderKind;
  resolvedVoice?: ProviderVoiceMapping;
  segments: AudioTrackSegment[];
  speechMode: SpeechMode;
  status: TtsProviderStatus;
  timelineMode: 'sequential';
  voiceStrategyProfile?: VoiceStrategyProfile;
  warnings?: string[];
};

export type TtsSynthesisOptions = {
  outputDir: string;
  provider: TtsProviderKind;
  realProviderName?: string;
  teachingPersona?: TeachingPersonaId;
};

export type TtsProvider = {
  capabilities: TtsProviderCapabilities;
  kind: TtsProviderKind;
  synthesizeCue: (
    cue: VoiceCue,
    filePath: string,
    voiceStrategyProfile: VoiceStrategyProfile
  ) => {
    durationMs?: number;
    filePath: string;
    locale?: string;
    providerName?: string;
    speechRate?: number;
    spokenText?: string;
    textSource?: VoiceTextSource;
    voiceName?: string;
    warning?: string;
  };
};

export type VoiceCuePlanInput = VoiceCuePlan;

declare const require: (id: string) => any;

import type {TeachingPersonaId} from '../teaching';
import type {ProviderVoiceMapping, VoiceStrategyProfile} from './ttsTypes';

const childProcess = require('node:child_process');

type MacOsSayVoicePreference = {
  locale: string;
  requestedVoiceName: string;
  voiceCandidates: string[];
};

type MacOsSayVoiceRecord = {
  locale: string;
  name: string;
};

type VoiceMappingResolution = {
  voiceMapping: ProviderVoiceMapping;
  warnings: string[];
};

const DEFAULT_SAY_RATE = 175;
const MIN_SAY_RATE = 125;
const MAX_SAY_RATE = 240;

const PERSONA_SAY_VOICE_PREFERENCES: Record<TeachingPersonaId, MacOsSayVoicePreference> = {
  calm_teacher: {
    locale: 'zh-CN',
    requestedVoiceName: 'Tingting',
    voiceCandidates: ['Tingting', 'Meijia', 'Sinji']
  },
  exam_coach: {
    locale: 'zh-CN',
    requestedVoiceName: 'Meijia',
    voiceCandidates: ['Meijia', 'Tingting', 'Sinji']
  },
  strict_teacher: {
    locale: 'zh-CN',
    requestedVoiceName: 'Sinji',
    voiceCandidates: ['Sinji', 'Tingting', 'Meijia']
  }
};

let cachedMacOsSayVoices: MacOsSayVoiceRecord[] | undefined;

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const listMacOsSayVoices = (): MacOsSayVoiceRecord[] => {
  if (cachedMacOsSayVoices) {
    return cachedMacOsSayVoices;
  }

  const result = childProcess.spawnSync('say', ['-v', '?'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.status !== 0) {
    cachedMacOsSayVoices = [];
    return cachedMacOsSayVoices;
  }

  cachedMacOsSayVoices = (result.stdout || '')
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => {
      const match = line.match(/^(.+?)\s{2,}([a-z]{2}_[A-Z0-9]{2,})\s+#/);

      if (!match) {
        return undefined;
      }

      return {
        locale: match[2],
        name: match[1].trim()
      };
    })
    .filter((record: MacOsSayVoiceRecord | undefined): record is MacOsSayVoiceRecord => Boolean(record));

  return cachedMacOsSayVoices ?? [];
};

const resolveFirstAvailableVoice = (voiceCandidates: string[]) => {
  const voiceByName = new Map(listMacOsSayVoices().map((voice) => [voice.name, voice]));

  for (const voiceName of voiceCandidates) {
    const voice = voiceByName.get(voiceName);

    if (voice) {
      return voice;
    }
  }

  return listMacOsSayVoices()[0];
};

export const mapVoiceStrategyRateToSayRate = (rate: number) => {
  return Math.round(clamp(DEFAULT_SAY_RATE * rate, MIN_SAY_RATE, MAX_SAY_RATE));
};

export const resolveRealProviderVoiceMapping = (
  providerName: string | undefined,
  voiceStrategyProfile: VoiceStrategyProfile
): VoiceMappingResolution | undefined => {
  if (providerName !== 'say') {
    return undefined;
  }

  const preference = PERSONA_SAY_VOICE_PREFERENCES[voiceStrategyProfile.persona];
  const resolvedVoice = resolveFirstAvailableVoice(preference.voiceCandidates);
  const warnings: string[] = [];

  if (!resolvedVoice) {
    warnings.push(`macOS say voice mapping unavailable for ${voiceStrategyProfile.persona}.`);
  } else if (resolvedVoice.name !== preference.requestedVoiceName) {
    warnings.push(
      `macOS say voice ${preference.requestedVoiceName} unavailable, using ${resolvedVoice.name} for ${voiceStrategyProfile.persona}.`
    );
  }

  return {
    voiceMapping: {
      actualLocale: resolvedVoice?.locale ?? preference.locale,
      actualVoiceName: resolvedVoice?.name ?? preference.requestedVoiceName,
      locale: preference.locale,
      persona: voiceStrategyProfile.persona,
      providerName,
      requestedVoiceName: preference.requestedVoiceName,
      speechRate: mapVoiceStrategyRateToSayRate(voiceStrategyProfile.rate),
      voiceCandidates: [...preference.voiceCandidates]
    },
    warnings
  };
};

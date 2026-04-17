import type {TeachingPersonaId} from '../teaching';
import type {VoiceStrategyProfile} from './ttsTypes';

export const VOICE_STRATEGY_PROFILES: Record<TeachingPersonaId, VoiceStrategyProfile> = {
  calm_teacher: {
    emphasisBoost: 0.92,
    pausePattern: {
      emphasis: 350,
      micro: 120,
      none: 0,
      phrase: 220,
      result: 500,
      thinking: 450
    },
    pauseScale: 1.18,
    persona: 'calm_teacher',
    preferredProviderOrder: ['real', 'mock'],
    rate: 0.92
  },
  exam_coach: {
    emphasisBoost: 1.08,
    pausePattern: {
      emphasis: 200,
      micro: 60,
      none: 0,
      phrase: 120,
      result: 280,
      thinking: 250
    },
    pauseScale: 0.98,
    persona: 'exam_coach',
    preferredProviderOrder: ['real', 'mock'],
    rate: 1.08
  },
  strict_teacher: {
    emphasisBoost: 1.18,
    pausePattern: {
      emphasis: 250,
      micro: 80,
      none: 0,
      phrase: 150,
      result: 350,
      thinking: 300
    },
    pauseScale: 0.9,
    persona: 'strict_teacher',
    preferredProviderOrder: ['real', 'mock'],
    rate: 1.02
  }
};

export const resolveVoiceStrategyProfile = (
  persona: TeachingPersonaId | undefined
): VoiceStrategyProfile => {
  return VOICE_STRATEGY_PROFILES[persona ?? 'calm_teacher'] ?? VOICE_STRATEGY_PROFILES.calm_teacher;
};

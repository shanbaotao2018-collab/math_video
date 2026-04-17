declare const process: {
  env: Record<string, string | undefined>;
};
declare const require: (id: string) => any;

import type {TtsProviderCapabilities, TtsProviderKind} from './ttsTypes';

const childProcess = require('node:child_process');

const commandExists = (command: string) => {
  const result = childProcess.spawnSync('which', [command], {
    encoding: 'utf8',
    stdio: 'ignore'
  });

  return result.status === 0;
};

export const resolveRealProviderName = (realProviderName?: string) => {
  if (realProviderName) {
    return realProviderName;
  }

  if (process.env.REAL_TTS_PROVIDER) {
    return process.env.REAL_TTS_PROVIDER;
  }

  return commandExists('say') ? 'say' : undefined;
};

export const getTtsProviderCapabilities = (
  provider: TtsProviderKind,
  options?: {
    realProviderName?: string;
  }
): TtsProviderCapabilities => {
  if (provider === 'mock') {
    return {
      available: true,
      outputFormat: 'wav',
      provider: 'mock',
      supportsEmphasisBoost: true,
      supportsPauseScale: true,
      supportsRate: true
    };
  }

  const resolvedRealProviderName = resolveRealProviderName(options?.realProviderName);

  if (resolvedRealProviderName !== 'say') {
    return {
      availabilityNote: 'real TTS provider unavailable. This build currently supports macOS say as the minimal real provider.',
      available: false,
      outputFormat: 'wav',
      provider: 'real',
      supportsEmphasisBoost: false,
      supportsPauseScale: false,
      supportsRate: true
    };
  }

  if (!commandExists('say')) {
    return {
      availabilityNote: 'real TTS provider requested but macOS say command is not available on this machine.',
      available: false,
      outputFormat: 'wav',
      provider: 'real',
      supportsEmphasisBoost: false,
      supportsPauseScale: false,
      supportsRate: true
    };
  }

  return {
    available: true,
    outputFormat: 'wav',
    provider: 'real',
    supportsEmphasisBoost: false,
    supportsPauseScale: false,
    supportsRate: true
  };
};

export const listTtsProviderCapabilities = (options?: {
  realProviderName?: string;
}): Record<TtsProviderKind, TtsProviderCapabilities> => {
  return {
    mock: getTtsProviderCapabilities('mock', options),
    real: getTtsProviderCapabilities('real', options)
  };
};

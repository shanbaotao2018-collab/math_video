import type {AlgebraStepKind, PhaseFrameRange, StepPhaseConfig, StepPhaseRange} from '../types/algebra';

export const DEFAULT_PHASE_CONFIGS: Record<AlgebraStepKind, StepPhaseConfig> = {
  write: {
    introRatio: 0.36,
    actionRatio: 0.24,
    settleRatio: 0.4
  },
  expand: {
    introRatio: 0.2,
    actionRatio: 0.55,
    settleRatio: 0.25
  },
  move: {
    introRatio: 0.15,
    actionRatio: 0.65,
    settleRatio: 0.2
  },
  transform: {
    introRatio: 0.2,
    actionRatio: 0.5,
    settleRatio: 0.3
  },
  cancel: {
    introRatio: 0.2,
    actionRatio: 0.55,
    settleRatio: 0.25
  },
  answer: {
    introRatio: 0.15,
    actionRatio: 0.35,
    settleRatio: 0.5
  }
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

const normalizePhaseConfig = (config: StepPhaseConfig): StepPhaseConfig => {
  const total = config.introRatio + config.actionRatio + config.settleRatio;

  if (total <= 0) {
    return {
      introRatio: 0.2,
      actionRatio: 0.5,
      settleRatio: 0.3
    };
  }

  return {
    introRatio: config.introRatio / total,
    actionRatio: config.actionRatio / total,
    settleRatio: config.settleRatio / total
  };
};

export const resolveStepPhaseConfig = (
  stepKind: AlgebraStepKind,
  phaseConfig?: Partial<StepPhaseConfig>
): StepPhaseConfig => {
  const defaultConfig = DEFAULT_PHASE_CONFIGS[stepKind];

  return normalizePhaseConfig({
    ...defaultConfig,
    ...phaseConfig
  });
};

export const resolveStepPhaseRanges = (
  duration: number,
  stepKind: AlgebraStepKind,
  phaseConfig?: Partial<StepPhaseConfig>
): StepPhaseRange => {
  const safeDuration = Math.max(1, duration);
  const resolvedConfig = resolveStepPhaseConfig(stepKind, phaseConfig);
  const introTo = Math.round(safeDuration * resolvedConfig.introRatio);
  const actionTo = Math.round(safeDuration * (resolvedConfig.introRatio + resolvedConfig.actionRatio));

  return {
    intro: {
      from: 0,
      to: introTo
    },
    action: {
      from: introTo,
      to: actionTo
    },
    settle: {
      from: actionTo,
      to: safeDuration
    }
  };
};

export const getPhaseProgress = (frame: number, phaseRange: PhaseFrameRange) => {
  const duration = phaseRange.to - phaseRange.from;

  if (duration <= 0) {
    return frame >= phaseRange.to ? 1 : 0;
  }

  return clamp((frame - phaseRange.from) / duration);
};

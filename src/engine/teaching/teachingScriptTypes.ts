export type TeachingScriptPacingHint = 'fast' | 'normal' | 'pause' | 'slow';

export type TeachingPersonaId = 'calm_teacher' | 'exam_coach' | 'strict_teacher';

export type VideoHookStyle = 'mistake_first' | 'question_first' | 'shortcut_first';

export type TeachingPersona = {
  guidance: string;
  id: TeachingPersonaId;
  label: string;
};

export type VideoHook = {
  style: VideoHookStyle;
  targetStepId?: string;
  text: string;
};

export type TeachingScriptStep = {
  emphasis?: string;
  memoryTip?: string;
  mistakeWarning?: string;
  narration: string;
  pacingHint?: TeachingScriptPacingHint;
  stepId: string;
};

export type TeachingScript = {
  hook?: VideoHook;
  introHook?: string;
  outroSummary?: string;
  persona?: TeachingPersonaId;
  steps: TeachingScriptStep[];
};

export type TeachingScriptFamily =
  | 'fallback'
  | 'fraction_equation'
  | 'fraction_inequality'
  | 'linear_equation'
  | 'linear_inequality'
  | 'linear_system'
  | 'quadratic_equation'
  | 'unknown';

export type BuildTeachingScriptContext = {
  family?: TeachingScriptFamily;
  hookStyle?: VideoHookStyle;
  personaId?: TeachingPersonaId;
  quality?: 'fallback' | 'full' | 'partial' | 'unsupported';
  qualityTier?: 'basic' | 'detailed' | 'instant' | 'standard';
};

import type {AlgebraLesson, AlgebraProblem, LessonLabels, LessonPacing} from '../../types/algebra';
import {normalizeLessonWithTemplate} from '../../utils/templates';
import {
  buildEmphasisPlan,
  buildPublishingPack,
  buildRhythmPlan,
  buildSubtitleCuePlan,
  buildVoiceCuePlan,
  buildVideoRenderPlan,
  DEFAULT_VIDEO_VIEWPORT,
  type EmphasisPlan,
  type PublishingPack,
  type PublishingSeriesContext,
  type RhythmPlan,
  type SubtitleCuePlan,
  type VoiceCuePlan
} from '../render';
import {
  TEACHING_PERSONAS,
  buildShotPlan,
  buildTeachingScriptWithContext,
  isTeachingPersonaId,
  type ShotPlan,
  type TeachingPersona,
  type TeachingPersonaId,
  type TeachingScript,
  type VideoHook,
  type VideoHookStyle
} from '../teaching';
import {generateAlgebraStepsV2Draft, parseEquation} from '../generator';
import type {SupportedEquationShape} from '../generator/parser';
import {
  buildEnhancedLessonProblem,
  type BuildEnhancedLessonProblemOptions
} from './buildEnhancedLessonProblem';
import type {LessonBuildQuality, LessonBuildReason} from './lessonBuildStatus';
import type {EnhancementRunReport} from '../ai/enhanceProblemWithAI';
import {normalizeAlgebraInput, type AlgebraNormalizationResult} from './normalizeAlgebraInput';
import {
  inferAlgebraQualityTier,
  QUALITY_TIER_LABELS,
  type AlgebraQualityTier
} from './inferAlgebraQualityTier';
import {
  applyAlgebraPresentationStrategy,
  type AlgebraPresentationMode,
  type AlgebraPresentationSource,
  type AlgebraPresentationStrategy
} from './applyAlgebraPresentationStrategy';
import {
  ALGEBRA_CHANGE_SNAPSHOT,
  ALGEBRA_CONTRACT_VERSIONS,
  ALGEBRA_PRODUCT_ENTRY_SCHEMA_VERSION,
  type AlgebraChangeSnapshot,
  type AlgebraContractVersions
} from './algebraChangeManagement';

export type AlgebraFamilyId =
  | 'fraction_equation'
  | 'fraction_inequality'
  | 'linear_equation'
  | 'linear_inequality'
  | 'linear_system'
  | 'quadratic_equation'
  | 'unknown';

export type AlgebraFamilyRecognition = {
  id: AlgebraFamilyId;
  label: string;
  recognizedBy: 'heuristic' | 'shape' | 'unknown';
  shape?: SupportedEquationShape;
};

export type AlgebraProductEntry = {
  buildQualityLabel: string;
  changeSummary: AlgebraChangeSnapshot;
  family: AlgebraFamilyRecognition;
  input: string;
  lesson?: AlgebraLesson;
  native: boolean;
  normalizedEquation: string;
  normalization: AlgebraNormalizationResult;
  presentationSource: AlgebraPresentationSource;
  presentationStrategy: AlgebraPresentationStrategy;
  problem?: AlgebraProblem;
  publishingPack?: PublishingPack;
  quality: LessonBuildQuality;
  qualityLabel: string;
  qualityTier: AlgebraQualityTier;
  reasons?: LessonBuildReason[];
  reason?: LessonBuildReason;
  render: {
    compositionId: 'AlgebraLinearEquationMvp';
    lessonIncluded: boolean;
    renderable: boolean;
    scene: 'LinearEquationLessonScene';
  };
  report?: EnhancementRunReport;
  schemaVersion: typeof ALGEBRA_PRODUCT_ENTRY_SCHEMA_VERSION;
  emphasisPlan?: EmphasisPlan;
  rhythmPlan?: RhythmPlan;
  shotPlan?: ShotPlan;
  subtitleCuePlan?: SubtitleCuePlan;
  supported: boolean;
  teachingPersona: TeachingPersona;
  teachingScript?: TeachingScript;
  voiceCuePlan?: VoiceCuePlan;
  videoHook?: VideoHook;
  videoRender?: {
    recommendedViewport: {
      fps: number;
      height: number;
      width: number;
    };
    renderable: boolean;
  };
  versions: AlgebraContractVersions;
};

export type BuildAlgebraProductEntryOptions = BuildEnhancedLessonProblemOptions & {
  includeLesson?: boolean;
  hookStyle?: VideoHookStyle;
  presentationMode?: AlgebraPresentationMode;
  publishingSeries?: PublishingSeriesContext;
  teachingPersona?: TeachingPersonaId;
};

type FamilyPresentation = {
  label: string;
  problemType: string;
  strategy: string;
  subtitle: string;
  title: string;
};

const DEFAULT_PACING: LessonPacing = {
  answerHoldFrames: 90,
  introFrames: 18,
  stepGapFrames: 28,
  stepHoldFrames: 55
};

const DEFAULT_LABELS: LessonLabels = {
  answerTag: '最终结果',
  kicker: '代数教学引擎',
  problemSection: '题目',
  stepsSection: '推导过程',
  strategySection: '思路',
  subtitle: '代数题'
};

const FAMILY_PRESENTATION: Record<Exclude<AlgebraFamilyId, 'unknown'>, FamilyPresentation> = {
  fraction_equation: {
    label: '分式方程',
    problemType: '分式方程',
    strategy: '先识别分母结构，必要时去分母，再按线性方程链路继续求解。',
    subtitle: '分式方程',
    title: '解分式方程'
  },
  fraction_inequality: {
    label: '分式不等式',
    problemType: '分式不等式',
    strategy: '先看定义域，再找临界点，按区间判断符号，最后写出解集。',
    subtitle: '分式不等式',
    title: '解分式不等式'
  },
  linear_equation: {
    label: '一元一次方程',
    problemType: '一元一次方程',
    strategy: '先化简，再移项，最后把未知数前面的系数化成 1。',
    subtitle: '一元一次方程',
    title: '解一元一次方程'
  },
  linear_inequality: {
    label: '一元一次不等式',
    problemType: '一元一次不等式',
    strategy: '先化简和移项，再按系数正负处理同除步骤，最后写出解集。',
    subtitle: '一元一次不等式',
    title: '解一元一次不等式'
  },
  linear_system: {
    label: '二元一次方程组',
    problemType: '二元一次方程组',
    strategy: '先识别适合的代入或消元关系，再求出一个变量，最后回代并分类方程组结果。',
    subtitle: '二元一次方程组',
    title: '解二元一次方程组'
  },
  quadratic_equation: {
    label: '一元二次方程',
    problemType: '一元二次方程',
    strategy: '先识别适合的二次方程路径，再汇总两个解、重根或无实数解。',
    subtitle: '一元二次方程',
    title: '解一元二次方程'
  }
};

const BUILD_QUALITY_LABELS: Record<LessonBuildQuality, string> = {
  fallback: 'fallback（回退展示）',
  full: 'full（完整链路）',
  partial: 'partial（主链路可用，增强层部分降级）',
  unsupported: 'unsupported（不支持）'
};

const SHAPE_TO_FAMILY: Record<SupportedEquationShape, Exclude<AlgebraFamilyId, 'unknown'>> = {
  'bracket-fraction': 'fraction_equation',
  'bracket-fraction-inequality': 'fraction_inequality',
  distributed: 'linear_equation',
  'distributed-inequality': 'linear_inequality',
  'distributed-with-constant': 'linear_equation',
  'fraction-inequality-with-constant': 'fraction_inequality',
  'fraction-sum': 'fraction_equation',
  'fraction-variable-denominator-inequality': 'fraction_inequality',
  'fraction-with-constant': 'fraction_equation',
  linear: 'linear_equation',
  'linear-inequality': 'linear_inequality',
  'linear-with-constant': 'linear_equation',
  'linear-system-elimination-basic': 'linear_system',
  'linear-system-infinite-solutions-basic': 'linear_system',
  'linear-system-no-solution-basic': 'linear_system',
  'linear-system-substitution-basic': 'linear_system',
  'linear-system-substitution-solved': 'linear_system',
  'multi-distributed': 'linear_equation',
  'quadratic-factored': 'quadratic_equation',
  'quadratic-formula-double-root': 'quadratic_equation',
  'quadratic-formula-no-real-root': 'quadratic_equation',
  'quadratic-formula-two-real-roots': 'quadratic_equation',
  'quadratic-square-root': 'quadratic_equation',
  'quadratic-standard-factorable': 'quadratic_equation',
  'reciprocal-variable-denominator-inequality': 'fraction_inequality',
  'standard-rational-inequality': 'fraction_inequality',
  'variables-both-sides': 'linear_equation'
};

const normalizeEquation = (equation: string) => {
  return equation.replace(/\s+/g, '');
};

const inferFamilyHeuristically = (equation: string): AlgebraFamilyRecognition => {
  const normalizedEquation = normalizeEquation(equation);

  if (!normalizedEquation) {
    return {
      id: 'unknown',
      label: '未知题型',
      recognizedBy: 'unknown'
    };
  }

  if (normalizedEquation.includes(',')) {
    return {
      id: 'linear_system',
      label: FAMILY_PRESENTATION.linear_system.label,
      recognizedBy: 'heuristic'
    };
  }

  if (/x\^2/.test(normalizedEquation)) {
    return {
      id: 'quadratic_equation',
      label: FAMILY_PRESENTATION.quadratic_equation.label,
      recognizedBy: 'heuristic'
    };
  }

  if (/(<=|>=|<|>)/.test(normalizedEquation)) {
    if (normalizedEquation.includes('/')) {
      return {
        id: 'fraction_inequality',
        label: FAMILY_PRESENTATION.fraction_inequality.label,
        recognizedBy: 'heuristic'
      };
    }

    return {
      id: 'linear_inequality',
      label: FAMILY_PRESENTATION.linear_inequality.label,
      recognizedBy: 'heuristic'
    };
  }

  if (normalizedEquation.includes('/')) {
    return {
      id: 'fraction_equation',
      label: FAMILY_PRESENTATION.fraction_equation.label,
      recognizedBy: 'heuristic'
    };
  }

  if (/x/.test(normalizedEquation)) {
    return {
      id: 'linear_equation',
      label: FAMILY_PRESENTATION.linear_equation.label,
      recognizedBy: 'heuristic'
    };
  }

  return {
    id: 'unknown',
    label: '未知题型',
    recognizedBy: 'unknown'
  };
};

export const recognizeAlgebraFamily = (equation: string): AlgebraFamilyRecognition => {
  const parsed = parseEquation(equation);

  if (parsed.supported) {
    const familyId = SHAPE_TO_FAMILY[parsed.equation.shape];
    const familyLabel = FAMILY_PRESENTATION[familyId].label;

    return {
      id: familyId,
      label: familyLabel,
      recognizedBy: 'shape',
      shape: parsed.equation.shape
    };
  }

  return inferFamilyHeuristically(equation);
};

const createLessonLabels = (subtitle: string): LessonLabels => {
  return {
    ...DEFAULT_LABELS,
    subtitle
  };
};

const createLessonFromProblem = (family: AlgebraFamilyRecognition, problem: AlgebraProblem): AlgebraLesson => {
  const presentation =
    family.id === 'unknown'
      ? {
          label: '未知题型',
          problemType: '代数题',
          strategy: '先识别题型，再决定生成步骤还是回退展示。',
          subtitle: '代数题',
          title: problem.title ?? '代数题演示'
        }
      : FAMILY_PRESENTATION[family.id];

  return normalizeLessonWithTemplate({
    answer: problem.answer,
    labels: createLessonLabels(presentation.subtitle),
    layout: 'combined-main',
    pacing: DEFAULT_PACING,
    problemType: presentation.problemType,
    prompt: problem.equation,
    steps: problem.steps,
    strategy: presentation.strategy,
    title: problem.title ?? presentation.title
  });
};

export const buildAlgebraProductEntry = async (
  equation: string,
  options: BuildAlgebraProductEntryOptions = {}
): Promise<AlgebraProductEntry> => {
  const normalization = normalizeAlgebraInput(equation);
  const {normalizedEquation} = normalization;
  const family = recognizeAlgebraFamily(normalizedEquation);
  const generatorResult = generateAlgebraStepsV2Draft(normalizedEquation);
  const buildResult = await buildEnhancedLessonProblem(normalizedEquation, {
    ...options,
    returnReport: options.returnReport ?? true
  });
  const qualityTier = inferAlgebraQualityTier(family, buildResult.problem);
  const presentationResult = buildResult.problem
    ? applyAlgebraPresentationStrategy({
        family,
        presentationMode: options.presentationMode ?? 'auto',
        problem: buildResult.problem,
        qualityTier
      })
    : undefined;
  const lesson =
    options.includeLesson === false || !presentationResult?.problem
      ? undefined
      : createLessonFromProblem(family, presentationResult.problem);
  const teachingScript = presentationResult?.problem
    ? buildTeachingScriptWithContext(presentationResult.problem, {
        family: buildResult.quality === 'fallback' ? 'fallback' : family.id,
        hookStyle: options.hookStyle,
        personaId: options.teachingPersona,
        quality: buildResult.quality,
        qualityTier
      })
    : undefined;
  const shotPlan =
    presentationResult?.problem && teachingScript
      ? buildShotPlan(presentationResult.problem, teachingScript)
      : undefined;
  const videoRenderPlan = shotPlan ? buildVideoRenderPlan(shotPlan, DEFAULT_VIDEO_VIEWPORT) : undefined;
  const subtitleCuePlan =
    teachingScript && videoRenderPlan
      ? buildSubtitleCuePlan(teachingScript, videoRenderPlan)
      : undefined;
  const emphasisPlan =
    teachingScript && subtitleCuePlan
      ? buildEmphasisPlan(teachingScript, subtitleCuePlan)
      : undefined;
  const rhythmPlan =
    teachingScript && emphasisPlan && subtitleCuePlan
      ? buildRhythmPlan(teachingScript, emphasisPlan, subtitleCuePlan)
      : undefined;
  const voiceCuePlan =
    teachingScript && subtitleCuePlan
      ? buildVoiceCuePlan(teachingScript, subtitleCuePlan, emphasisPlan, rhythmPlan)
      : undefined;
  const teachingPersonaId = teachingScript?.persona ?? (isTeachingPersonaId(options.teachingPersona) ? options.teachingPersona : 'calm_teacher');
  const teachingPersona = TEACHING_PERSONAS[teachingPersonaId];
  const fallbackPresentationResult = applyAlgebraPresentationStrategy({
    family,
    presentationMode: options.presentationMode ?? 'auto',
    problem: {
      answer: normalizedEquation,
      equation: normalizedEquation,
      steps: []
    },
    qualityTier
  });
  const effectivePresentationSource = presentationResult?.presentationSource ?? fallbackPresentationResult.presentationSource;
  const effectivePresentationStrategy = presentationResult?.presentationStrategy ?? fallbackPresentationResult.presentationStrategy;
  const publishingPack =
    presentationResult?.problem
      ? buildPublishingPack({
          emphasisPlan,
          equation: normalizedEquation,
          family,
          presentationMode: effectivePresentationStrategy.id,
          problem: presentationResult.problem,
          qualityTier,
          renderPlan: videoRenderPlan,
          series: options.publishingSeries,
          teachingPersona,
          videoHook: teachingScript?.hook
        })
      : undefined;

  return {
    buildQualityLabel: BUILD_QUALITY_LABELS[buildResult.quality],
    changeSummary: ALGEBRA_CHANGE_SNAPSHOT,
    family,
    input: equation,
    ...(lesson ? {lesson} : {}),
    native: generatorResult.supported ? generatorResult.native : false,
    normalizedEquation,
    normalization,
    presentationSource: effectivePresentationSource,
    presentationStrategy: effectivePresentationStrategy,
    ...(presentationResult?.problem ? {problem: presentationResult.problem} : {}),
    ...(publishingPack ? {publishingPack} : {}),
    quality: buildResult.quality,
    qualityLabel: QUALITY_TIER_LABELS[qualityTier],
    qualityTier,
    ...(buildResult.reason ? {reason: buildResult.reason} : {}),
    ...(buildResult.reasons ? {reasons: buildResult.reasons} : {}),
    render: {
      compositionId: 'AlgebraLinearEquationMvp',
      lessonIncluded: Boolean(lesson),
      renderable: Boolean(buildResult.problem),
      scene: 'LinearEquationLessonScene'
    },
    ...(buildResult.report ? {report: buildResult.report} : {}),
    schemaVersion: ALGEBRA_PRODUCT_ENTRY_SCHEMA_VERSION,
    ...(emphasisPlan ? {emphasisPlan} : {}),
    ...(rhythmPlan ? {rhythmPlan} : {}),
    ...(shotPlan ? {shotPlan} : {}),
    ...(subtitleCuePlan ? {subtitleCuePlan} : {}),
    supported: buildResult.supported,
    teachingPersona,
    ...(teachingScript ? {teachingScript} : {}),
    ...(voiceCuePlan ? {voiceCuePlan} : {}),
    ...(teachingScript?.hook ? {videoHook: teachingScript.hook} : {}),
    videoRender: {
      recommendedViewport: DEFAULT_VIDEO_VIEWPORT,
      renderable: Boolean(presentationResult?.problem && teachingScript && shotPlan && subtitleCuePlan)
    },
    versions: ALGEBRA_CONTRACT_VERSIONS
  };
};

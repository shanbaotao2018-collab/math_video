import type {AlgebraProblem} from '../../types/algebra';
import type {TeachingPersona, VideoHook} from '../teaching';
import type {EmphasisCue, EmphasisPlan} from './emphasisPlanTypes';
import type {
  PublishingCoverFrame,
  PublishingCoverFrameSource,
  PublishingCoverMode,
  PublishingCoverStrategy,
  PublishingCreativeVariant,
  PublishingCreativeVariantType,
  PublishingPack,
  PublishingCoverContentGoal,
  PublishingCoverRecommendedUseCase,
  PublishingSeriesContext
} from './publishingPackTypes';
import type {VideoRenderPlan, VideoRenderShot} from './videoRenderTypes';

type PublishingFamilyInfo = {
  id: string;
  label: string;
};

type BuildPublishingPackArgs = {
  contentGoal?: PublishingCoverContentGoal;
  emphasisPlan?: EmphasisPlan;
  equation: string;
  family: PublishingFamilyInfo;
  presentationMode: string;
  problem: AlgebraProblem;
  qualityTier: string;
  recommendedUseCase?: PublishingCoverRecommendedUseCase;
  renderPlan?: VideoRenderPlan;
  series?: PublishingSeriesContext;
  teachingPersona: TeachingPersona;
  videoHook?: VideoHook;
};

const FAMILY_HASHTAGS: Record<string, string> = {
  fraction_equation: '#分式方程',
  fraction_inequality: '#分式不等式',
  linear_equation: '#一元一次方程',
  linear_inequality: '#一元一次不等式',
  linear_system: '#方程组',
  quadratic_equation: '#一元二次方程',
  unknown: '#代数题'
};

const PERSONA_HASHTAGS: Record<TeachingPersona['id'], string> = {
  calm_teacher: '#稳扎稳打',
  exam_coach: '#考试技巧',
  strict_teacher: '#易错提醒'
};

const PRESENTATION_HASHTAGS: Record<string, string> = {
  answer_only: '#快速看答案',
  compact_steps: '#短视频讲题',
  full_steps: '#完整推导',
  semantic_full_steps: '#解题思路'
};

const normalizeText = (value?: string) => value?.replace(/\s+/g, ' ').trim() ?? '';

const cleanLatexForCopy = (value: string) => {
  return value
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\ne/g, '≠')
    .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
    .replace(/\\cup/g, '∪')
    .replace(/\\infty/g, '∞')
    .replace(/\\[,;:! ]*/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const clampCopy = (value: string, maxLength: number) => {
  const normalized = normalizeText(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
};

const formatEpisodeNumber = (episodeIndex: number) => {
  return String(episodeIndex).padStart(3, '0');
};

const uniqueTags = (tags: string[]) => {
  return Array.from(new Set(tags.filter((tag) => tag.startsWith('#') && tag.length > 1)));
};

const getCueByKind = (emphasisPlan: EmphasisPlan | undefined, kind: EmphasisCue['kind']) => {
  return emphasisPlan?.cues.find((cue) => cue.kind === kind && normalizeText(cue.text));
};

const getCoverFrameSource = (kind: EmphasisCue['kind']): PublishingCoverFrameSource => {
  switch (kind) {
    case 'hook':
      return 'hook_emphasis';
    case 'mistake':
      return 'mistake_emphasis';
    case 'result':
      return 'result_emphasis';
    case 'rule':
      return 'rule_emphasis';
  }
};

const midpoint = (shot: VideoRenderShot) => {
  return Math.min(shot.endMs - 1, shot.startMs + Math.floor((shot.endMs - shot.startMs) / 2));
};

const COVER_FRAME_PRIORITY_BY_MODE: Record<PublishingCoverMode, EmphasisCue['kind'][]> = {
  hook_cover: ['hook', 'mistake', 'result', 'rule'],
  mistake_cover: ['mistake', 'hook', 'rule', 'result'],
  result_cover: ['result', 'rule', 'hook', 'mistake']
};

const buildCoverFrame = (
  renderPlan: VideoRenderPlan | undefined,
  emphasisPlan: EmphasisPlan | undefined,
  coverMode: PublishingCoverMode
): PublishingCoverFrame => {
  const shots = renderPlan?.shots ?? [];
  const shotById = new Map(shots.map((shot) => [shot.shotId, shot]));
  const priorityCue = COVER_FRAME_PRIORITY_BY_MODE[coverMode]
    .map((kind) => getCueByKind(emphasisPlan, kind))
    .find(Boolean);

  if (priorityCue) {
    const alignedShot = shotById.get(priorityCue.shotId);

    return {
      reason: `按 ${coverMode} 选择最能支撑封面主信息的镜头。`,
      source: getCoverFrameSource(priorityCue.kind),
      shotId: priorityCue.shotId,
      timestampMs: alignedShot ? midpoint(alignedShot) : priorityCue.startMs
    };
  }

  const answerShot = shots.find((shot) => shot.shotType === 'answer');

  if (answerShot) {
    return {
      reason: '没有重点 cue 时，选择最终答案镜头作为封面帧。',
      source: 'answer_shot',
      shotId: answerShot.shotId,
      timestampMs: midpoint(answerShot)
    };
  }

  const firstShot = shots[0];

  return {
    reason: '使用首个可渲染镜头作为保底封面帧。',
    source: 'first_shot',
    ...(firstShot
      ? {
          shotId: firstShot.shotId,
          timestampMs: midpoint(firstShot)
        }
      : {timestampMs: 0})
  };
};

const buildTitle = (args: BuildPublishingPackArgs, hookText: string, answerText: string) => {
  const familyLabel = args.family.label || '代数题';
  const episodePrefix = args.series?.episodeIndex ? `第${args.series.episodeIndex}题｜` : '';

  if (args.videoHook?.style === 'mistake_first') {
    return clampCopy(`${episodePrefix}${familyLabel}易错点：${hookText || answerText}`, 46);
  }

  if (args.videoHook?.style === 'shortcut_first') {
    return clampCopy(`${episodePrefix}${familyLabel}捷径：${hookText || '先抓关键步骤'}`, 46);
  }

  if (args.videoHook?.style === 'question_first') {
    return clampCopy(`${episodePrefix}${familyLabel}怎么下手？${hookText || args.equation}`, 46);
  }

  return clampCopy(`${episodePrefix}${familyLabel}一题讲清：${args.equation}`, 46);
};

const buildCoverText = (args: BuildPublishingPackArgs, hookText: string, answerText: string) => {
  const mistakeCue = getCueByKind(args.emphasisPlan, 'mistake');
  const ruleCue = getCueByKind(args.emphasisPlan, 'rule');
  const primary = hookText || mistakeCue?.text || ruleCue?.text || `${args.family.label}一题讲清`;
  const secondary = answerText ? `答案 ${answerText}` : '';

  return [clampCopy(primary, 24), clampCopy(secondary, 18)].filter(Boolean).join('\n');
};

const splitCoverText = (coverText: string) =>
  coverText
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

const normalizeCompareText = (value?: string) =>
  normalizeText(value)
    .replace(/[，。！？、；：,.!?;:"'`()（）【】\[\]…\-_]/g, '')
    .toLowerCase();

const pushUnique = (items: string[], value?: string) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return;
  }

  const comparable = normalizeCompareText(normalized);

  if (!items.some((item) => normalizeCompareText(item) === comparable)) {
    items.push(normalized);
  }
};

const selectFirst = (...values: Array<string | undefined>) => {
  return values.map((value) => normalizeText(value)).find(Boolean) ?? '';
};

const withoutAnswerLead = (value?: string) => {
  const normalized = normalizeText(value);

  return /^答案[:：\s]/.test(normalized) ? '' : normalized;
};

const inferCoverMode = (args: BuildPublishingPackArgs, answerText: string): PublishingCoverMode => {
  if (args.recommendedUseCase === 'mistake_prevention' || args.contentGoal === 'mistake') {
    return 'mistake_cover';
  }

  if (args.recommendedUseCase === 'exam_revision' || args.contentGoal === 'exam_skill') {
    return 'result_cover';
  }

  if (
    args.recommendedUseCase === 'cold_start_reach' ||
    args.recommendedUseCase === 'series_playlist' ||
    args.contentGoal === 'collection' ||
    args.contentGoal === 'hook'
  ) {
    return 'hook_cover';
  }

  if (args.videoHook?.style === 'mistake_first') {
    return 'mistake_cover';
  }

  if (args.videoHook?.style === 'shortcut_first') {
    return 'result_cover';
  }

  if (args.videoHook?.style === 'question_first') {
    return 'hook_cover';
  }

  if (getCueByKind(args.emphasisPlan, 'mistake')) {
    return 'mistake_cover';
  }

  if (answerText && getCueByKind(args.emphasisPlan, 'result')) {
    return 'result_cover';
  }

  return 'hook_cover';
};

const buildCoverStrategy = (
  args: BuildPublishingPackArgs,
  hookText: string,
  answerText: string,
  coverText: string,
  title: string,
  coverMode?: PublishingCoverMode,
  badgeOverride?: string
): PublishingCoverStrategy => {
  const mode = coverMode ?? inferCoverMode(args, answerText);
  const coverLines = splitCoverText(coverText);
  const mistakeCue = getCueByKind(args.emphasisPlan, 'mistake');
  const resultCue = getCueByKind(args.emphasisPlan, 'result');
  const badge =
    badgeOverride ??
    (mode === 'mistake_cover'
      ? '易错点'
      : mode === 'result_cover'
        ? '最终答案'
        : args.series?.episodeIndex
          ? `第${args.series.episodeIndex}题`
          : '先看这里');
  const source =
    coverLines[0]
      ? 'cover_text'
      : title
        ? 'title'
        : hookText
          ? 'video_hook'
          : answerText
            ? 'answer'
            : 'emphasis';
  const modeTitle =
    mode === 'mistake_cover'
      ? selectFirst(coverLines[0], mistakeCue?.text, hookText, title, '这一步最容易错')
      : mode === 'result_cover'
        ? selectFirst(coverLines[0], resultCue?.text, title, answerText ? `答案 ${answerText}` : undefined, '最终答案在这一步')
        : selectFirst(coverLines[0], title, hookText, `${args.family.label}一题讲清`);
  const lines: string[] = [];

  pushUnique(lines, clampCopy(modeTitle, 22));
  pushUnique(
    lines,
    mode === 'result_cover'
      ? answerText
      : cleanLatexForCopy(args.equation)
  );
  pushUnique(
    lines,
    mode === 'mistake_cover'
      ? selectFirst(mistakeCue?.text, withoutAnswerLead(coverLines[1]), '很多人这里会错')
      : mode === 'result_cover'
        ? '别再写成别的了'
        : selectFirst(withoutAnswerLead(coverLines[1]), hookText)
  );

  const [mainTitle, formulaText, subtitle] = lines;

  return {
    badge,
    ...(formulaText ? {formulaText: clampCopy(formulaText, 18)} : {}),
    mainTitle: mainTitle || '这题先别急着算',
    mode,
    reason:
      mode === 'mistake_cover'
        ? '优先拦截易错点，提高停留判断速度。'
        : mode === 'result_cover'
          ? '优先放大答案或捷径收益，适合考前复习点击。'
          : '优先使用开头钩子，适合冷启动和系列入口。',
    source,
    ...(subtitle ? {subtitle: clampCopy(subtitle, 16)} : {})
  };
};

const getEpisodePrefix = (args: BuildPublishingPackArgs) => {
  return args.series?.episodeIndex ? `第${args.series.episodeIndex}题｜` : '';
};

const getVariantTitlePrefix = (
  args: BuildPublishingPackArgs,
  variantType: PublishingCreativeVariantType
) => {
  const familyLabel = args.family.label || '代数题';
  const episodePrefix = getEpisodePrefix(args);

  switch (variantType) {
    case 'error_variant':
      return `${episodePrefix}${familyLabel}易错版：`;
    case 'hook_variant':
      return `${episodePrefix}${familyLabel}钩子版：`;
    case 'result_variant':
      return `${episodePrefix}${familyLabel}答案版：`;
  }
};

const buildCreativeVariants = (
  args: BuildPublishingPackArgs,
  hookText: string,
  answerText: string
): PublishingCreativeVariant[] => {
  const equationText = cleanLatexForCopy(args.equation);
  const mistakeCue = getCueByKind(args.emphasisPlan, 'mistake');
  const resultCue = getCueByKind(args.emphasisPlan, 'result');
  const rawErrorHook = selectFirst(mistakeCue?.text, hookText, '这一步最容易错');
  const rawHookHook = selectFirst(hookText, '先别急着算，先看入口');
  const errorHook = clampCopy(
    /错|翻车|坑/.test(rawErrorHook) ? rawErrorHook : `90%会错：${rawErrorHook}`,
    24
  );
  const hookHook = clampCopy(/^停一下/.test(rawHookHook) ? rawHookHook : `停一下：${rawHookHook}`, 24);
  const resultHook = clampCopy(
    selectFirst(resultCue?.text, answerText ? `这题答案直接看 ${answerText}` : undefined, '这题3秒看答案'),
    24
  );
  const specs: Array<{
    badge: string;
    coverMode: PublishingCoverMode;
    coverText: string;
    heroHookText: string;
    title: string;
    type: PublishingCreativeVariantType;
    variantId: string;
  }> = [
    {
      badge: '易错点',
      coverMode: 'mistake_cover',
      coverText: [errorHook, equationText].filter(Boolean).join('\n'),
      heroHookText: errorHook,
      title: clampCopy(`${getVariantTitlePrefix(args, 'error_variant')}${errorHook}`, 46),
      type: 'error_variant',
      variantId: 'variant-error'
    },
    {
      badge: args.series?.episodeIndex ? `第${args.series.episodeIndex}题` : '先看这里',
      coverMode: 'hook_cover',
      coverText: [hookHook, equationText].filter(Boolean).join('\n'),
      heroHookText: hookHook,
      title: clampCopy(`${getVariantTitlePrefix(args, 'hook_variant')}${hookHook}`, 46),
      type: 'hook_variant',
      variantId: 'variant-hook'
    },
    {
      badge: '最终答案',
      coverMode: 'result_cover',
      coverText: [resultHook, answerText ? `答案 ${answerText}` : equationText].filter(Boolean).join('\n'),
      heroHookText: resultHook,
      title: clampCopy(`${getVariantTitlePrefix(args, 'result_variant')}${answerText || resultHook}`, 46),
      type: 'result_variant',
      variantId: 'variant-result'
    }
  ];

  return specs.map((spec) => ({
    badge: spec.badge,
    coverStrategy: buildCoverStrategy(
      args,
      spec.heroHookText,
      answerText,
      spec.coverText,
      spec.title,
      spec.coverMode,
      spec.badge
    ),
    coverText: spec.coverText,
    heroHookText: spec.heroHookText,
    title: spec.title,
    type: spec.type,
    variantId: spec.variantId
  }));
};

const buildCaption = (args: BuildPublishingPackArgs, hookText: string, answerText: string) => {
  const ruleCue = getCueByKind(args.emphasisPlan, 'rule');
  const mistakeCue = getCueByKind(args.emphasisPlan, 'mistake');
  const resultCue = getCueByKind(args.emphasisPlan, 'result');
  const personaCopy = args.teachingPersona.label.endsWith('讲解')
    ? args.teachingPersona.label
    : `${args.teachingPersona.label}风格讲解`;
  const details = [ruleCue?.text, mistakeCue?.text, resultCue?.text]
    .map((text) => normalizeText(text))
    .filter(Boolean);

  return clampCopy(
    [
      hookText || `${args.family.label}解题演示。`,
      `题目：${args.equation}。`,
      answerText ? `答案：${answerText}。` : '',
      details.length > 0 ? `重点：${details.join('；')}。` : '',
      `${personaCopy}。`
    ].join(' '),
    180
  );
};

const buildHashtags = (args: BuildPublishingPackArgs) => {
  return uniqueTags([
    '#初中数学',
    '#数学解题',
    FAMILY_HASHTAGS[args.family.id] ?? '#代数题',
    PERSONA_HASHTAGS[args.teachingPersona.id],
    PRESENTATION_HASHTAGS[args.presentationMode] ?? '#数学短视频',
    args.qualityTier === 'detailed' ? '#详细讲解' : '#基础训练',
    args.videoHook?.style === 'mistake_first' ? '#易错题' : '',
    args.videoHook?.style === 'shortcut_first' ? '#解题技巧' : ''
  ]).slice(0, 8);
};

export function buildPublishingPack(args: BuildPublishingPackArgs): PublishingPack {
  const hookText = normalizeText(args.videoHook?.text);
  const answerText = cleanLatexForCopy(args.problem.answer);
  const coverText = buildCoverText(args, hookText, answerText);
  const title = buildTitle(args, hookText, answerText);
  const coverStrategy = buildCoverStrategy(args, hookText, answerText, coverText, title);
  const creativeVariants = buildCreativeVariants(args, hookText, answerText);
  const hashtags = buildHashtags(args);
  const episodeNumber = args.series?.episodeIndex ? formatEpisodeNumber(args.series.episodeIndex) : undefined;
  const seriesId = args.series?.seriesId ?? `${args.family.id}-${args.qualityTier}`;
  const seriesName = args.series?.seriesName ?? '初中数学短题精讲';

  return {
    caption: buildCaption(args, hookText, answerText),
    coverFrame: buildCoverFrame(args.renderPlan, args.emphasisPlan, coverStrategy.mode),
    coverStrategy,
    coverText,
    creativeVariants,
    hashtags,
    series: {
      ...(args.series?.episodeIndex ? {episodeIndex: args.series.episodeIndex} : {}),
      episodeKey: episodeNumber
        ? `${seriesId}:${episodeNumber}`
        : `${args.family.id}:${args.qualityTier}:${args.presentationMode}`,
      ...(episodeNumber ? {episodeNumber} : {}),
      familyId: args.family.id,
      name: seriesName,
      presentationMode: args.presentationMode,
      qualityTier: args.qualityTier,
      seriesId,
      seriesName
    },
    title
  };
}

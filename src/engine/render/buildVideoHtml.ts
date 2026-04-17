import type {AlgebraProblem} from '../../types/algebra';
import type {ShotPlan, TeachingScript, VideoHook} from '../teaching';
import type {EmphasisCue, EmphasisKind, EmphasisPlan} from './emphasisPlanTypes';
import type {PublishingPack} from './publishingPackTypes';
import type {RhythmPlan} from './rhythmPlanTypes';
import type {SubtitleCuePlan} from './subtitleCueTypes';
import type {VideoRenderPlan, VideoRenderShot} from './videoRenderTypes';

type BuildVideoHtmlArgs = {
  emphasisPlan?: EmphasisPlan;
  equation: string;
  familyLabel?: string;
  problem: AlgebraProblem;
  publishingPack?: PublishingPack;
  renderPlan: VideoRenderPlan;
  rhythmPlan?: RhythmPlan;
  shotPlan: ShotPlan;
  subtitleCuePlan: SubtitleCuePlan;
  teachingScript: TeachingScript;
  videoHook?: VideoHook;
};

type SerializedShot = VideoRenderShot & {
  contextLabel: string;
  displayFocusLatex: string;
  displayLatex: string;
  latex: string;
};

type HeroStage = 'badge_title' | 'formula' | 'guide' | 'done';

const EMPHASIS_LABELS: Record<EmphasisKind, string> = {
  hook: '先看这里',
  mistake: '易错点',
  result: '最终答案',
  rule: '规则提醒'
};

const HERO_BADGE_BY_HOOK_STYLE: Record<NonNullable<VideoHook['style']>, string> = {
  mistake_first: '易错点',
  question_first: '先别急',
  shortcut_first: '省时间'
};

const normalizeText = (value?: string) => value?.replace(/\s+/g, ' ').trim() ?? '';

const normalizeCompareText = (value?: string) =>
  normalizeText(value)
    .replace(/[，。！？、；：,.!?;:"'`()（）【】\[\]…\-_]/g, '')
    .toLowerCase();

const clampCopy = (value: string, maxLength: number) => {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const splitCoverText = (coverText?: string) =>
  (coverText ?? '')
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

const stripAnswerLead = (value?: string) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  if (/^答案[:：\s]/.test(normalized)) {
    return '';
  }

  return normalized;
};

const stripTitleLead = (title: string, familyLabel: string) => {
  const normalized = normalizeText(title);
  const escapedFamilyLabel = escapeRegExp(familyLabel);

  return normalized
    .replace(new RegExp(`^${escapedFamilyLabel}(怎么下手|易错点|捷径)[:：？]?`), '')
    .replace(/^(怎么下手|易错点|捷径)[:：？]?/, '')
    .trim();
};

const cleanMathForDisplay = (value?: string) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\ne/g, '≠')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\sqrt\{([^{}]+)\}/g, '√($1)')
    .replace(/\\cup/g, '∪')
    .replace(/\\cap/g, '∩')
    .replace(/\\infty/g, '∞')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\*/g, '×')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/!=/g, '≠')
    .replace(/\s*([=+\-<>≤≥≠])/g, ' $1')
    .replace(/([=+\-<>≤≥≠])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
};

const compressHeroTitle = (value: string) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  const firstSentence = normalized.match(/^.{8,}?[？?!！。]/)?.[0];
  return clampCopy(firstSentence || normalized, 30);
};

const normalizeHeroGuideCandidate = (value?: string) => {
  const normalized = stripAnswerLead(value)
    .replace(/^重点[:：]\s*/, '')
    .replace(/^很多人会忘记/, '')
    .replace(/^不要/, '别')
    .replace(/的值[。.]?$/, '')
    .replace(/[。.!！?？]$/g, '')
    .trim();

  if (!normalized) {
    return '';
  }

  if (/分母.*0/.test(normalized)) {
    return '先排除分母为 0';
  }

  if (/判别式|Δ|解的个数|几个解/.test(normalized)) {
    return '先判断解的个数';
  }

  if (/临界点/.test(normalized)) {
    return '先找临界点';
  }

  if (/移项|变号/.test(normalized)) {
    return '移项记得变号';
  }

  if (/区间/.test(normalized)) {
    return '先分区间判断';
  }

  return clampCopy(normalized, 14);
};

const isGenericHeroGuide = (value: string) =>
  ['先看清题目', '先看清题', '最终结果', '最后结论'].includes(normalizeText(value));

const extractGuideFromCaption = (caption?: string) => {
  const normalized = normalizeText(caption);
  const focusMatch = normalized.match(/重点[:：]\s*([^。]+)/);
  const candidates = (focusMatch?.[1] ?? normalized)
    .split(/[；;，,。]/)
    .map((item) => normalizeHeroGuideCandidate(item))
    .filter(Boolean);

  return candidates.find((item) => !isGenericHeroGuide(item)) || candidates[0] || '';
};

const buildFamilyFallbackTitle = (familyLabel: string, equation: string) => {
  if (familyLabel.includes('不等式')) {
    return '这题最容易卡在符号判断';
  }

  if (familyLabel.includes('方程组')) {
    return '先别急着算，先看突破口';
  }

  if (familyLabel.includes('二次')) {
    return '这题别只盯着公式，先看解法入口';
  }

  if (equation.includes('/')) {
    return '分母一出来，第一步更不能乱';
  }

  return '这题第一步最容易做反';
};

const buildFamilyFallbackGuide = (familyLabel: string, equation: string) => {
  if (familyLabel.includes('不等式')) {
    return '先盯住定义域和临界点，再决定区间。';
  }

  if (familyLabel.includes('方程组')) {
    return '先找最省力的代入或消元方向。';
  }

  if (familyLabel.includes('二次')) {
    return '别急着套模板，先看结构像不像标准形。';
  }

  if (equation.includes('/')) {
    return '分式题先看哪一步会出错。';
  }

  return '别急着移项，先看最关键的一步。';
};

const inferFamilyLabel = (args: BuildVideoHtmlArgs) => {
  const direct = normalizeText(args.familyLabel);
  if (direct) {
    return direct;
  }

  const title = normalizeText(args.problem.title);
  if (title) {
    return title;
  }

  const equation = args.equation;
  if (equation.includes(',') || (equation.includes('x') && equation.includes('y'))) {
    return '二元一次方程组';
  }
  if (equation.includes('>') || equation.includes('<') || equation.includes('≥') || equation.includes('≤')) {
    return equation.includes('/') ? '分式不等式' : '一元一次不等式';
  }
  if (equation.includes('x^2') || equation.includes('x²')) {
    return '一元二次方程';
  }
  if (equation.includes('/')) {
    return '分式方程';
  }
  return '一元一次方程';
};

const getPriorityEmphasisCue = (plan?: EmphasisPlan) => {
  return [...(plan?.cues ?? [])].sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }

    return right.priority - left.priority;
  })[0];
};

const getActiveEmphasisCueAtTime = (plan: EmphasisPlan | undefined, timeMs: number) => {
  return [...(plan?.cues ?? [])]
    .filter((cue) => timeMs >= (cue.displayStartMs ?? cue.startMs) && timeMs < (cue.displayEndMs ?? cue.endMs))
    .sort((left, right) => right.priority - left.priority)[0];
};

const resolveHeroBadge = (args: BuildVideoHtmlArgs, familyLabel: string) => {
  const cue = getPriorityEmphasisCue(args.emphasisPlan);
  const hookStyleLabel = args.videoHook?.style ? HERO_BADGE_BY_HOOK_STYLE[args.videoHook.style] : '';

  if (cue?.kind === 'mistake') {
    return EMPHASIS_LABELS.mistake;
  }

  return hookStyleLabel || familyLabel || (cue ? EMPHASIS_LABELS[cue.kind] : '') || '数学短题';
};

const resolveHeroTitle = (args: BuildVideoHtmlArgs, familyLabel: string) => {
  const coverLines = splitCoverText(args.publishingPack?.coverText);
  const hookCueText = [...(args.emphasisPlan?.cues ?? [])]
    .filter((cue) => cue.kind === 'hook')
    .sort((left, right) => right.priority - left.priority)[0]?.text;

  return compressHeroTitle(
    normalizeText(args.videoHook?.text) ||
      coverLines[0] ||
      stripTitleLead(normalizeText(args.publishingPack?.title), familyLabel) ||
      normalizeText(hookCueText) ||
      buildFamilyFallbackTitle(familyLabel, args.equation)
  );
};

const resolveHeroGuide = (args: BuildVideoHtmlArgs, familyLabel: string, firstShot?: VideoRenderShot) => {
  const coverLines = splitCoverText(args.publishingPack?.coverText);
  const firstProblemStep = args.problem.steps.find((step) => step.id === firstShot?.stepId);
  const firstTeachingStep = args.teachingScript.steps.find((step) => step.stepId === firstShot?.stepId);
  const hookTargetTeachingStep = args.teachingScript.steps.find((step) => step.stepId === args.videoHook?.targetStepId);
  const hookTargetProblemStep = args.problem.steps.find((step) => step.id === args.videoHook?.targetStepId);
  const candidates = [
    normalizeHeroGuideCandidate(firstProblemStep?.note),
    normalizeHeroGuideCandidate(firstTeachingStep?.memoryTip),
    normalizeHeroGuideCandidate(firstTeachingStep?.emphasis),
    normalizeHeroGuideCandidate(hookTargetProblemStep?.note),
    normalizeHeroGuideCandidate(hookTargetTeachingStep?.memoryTip),
    normalizeHeroGuideCandidate(hookTargetTeachingStep?.emphasis),
    normalizeHeroGuideCandidate(hookTargetTeachingStep?.mistakeWarning),
    extractGuideFromCaption(args.publishingPack?.caption),
    normalizeHeroGuideCandidate(coverLines[1]),
    normalizeHeroGuideCandidate(args.teachingScript.introHook),
    normalizeHeroGuideCandidate(args.problem.note),
    normalizeHeroGuideCandidate(buildFamilyFallbackGuide(familyLabel, args.equation))
  ].filter(Boolean);
  const selected = candidates.find((item) => !isGenericHeroGuide(item)) || candidates[0] || '';

  return clampCopy(selected, 14);
};

const getShotBadge = (shotType: string, emphasisKind?: EmphasisKind) => {
  if (emphasisKind && EMPHASIS_LABELS[emphasisKind]) {
    return EMPHASIS_LABELS[emphasisKind];
  }

  switch (shotType) {
    case 'answer':
      return '最后结论';
    case 'interval':
      return '区间判断';
    case 'branch':
      return '关键分支';
    case 'highlight':
      return '先看这里';
    case 'substitute':
      return '回代检查';
    case 'eliminate':
      return '消元推进';
    default:
      return '关键一步';
  }
};

const getTimelineShotLabel = (shotType: string) => {
  switch (shotType) {
    case 'answer':
      return '答案';
    case 'branch':
      return '分支';
    case 'eliminate':
      return '消元';
    case 'highlight':
      return '强调';
    case 'interval':
      return '区间';
    case 'substitute':
      return '回代';
    case 'transform':
      return '变形';
    default:
      return '书写';
  }
};

const TIMELINE_SHOT_LABELS: Record<string, string> = {
  answer: getTimelineShotLabel('answer'),
  branch: getTimelineShotLabel('branch'),
  eliminate: getTimelineShotLabel('eliminate'),
  highlight: getTimelineShotLabel('highlight'),
  interval: getTimelineShotLabel('interval'),
  substitute: getTimelineShotLabel('substitute'),
  transform: getTimelineShotLabel('transform'),
  write: getTimelineShotLabel('write')
};

const buildShotContextLabel = (shot: VideoRenderShot, teachingScript: TeachingScript, cue?: EmphasisCue) => {
  if (shot.shotType === 'answer') {
    return '结论时刻';
  }

  if (cue) {
    return EMPHASIS_LABELS[cue.kind];
  }

  const step = teachingScript.steps.find((entry) => entry.stepId === shot.stepId);
  if (step?.mistakeWarning) {
    return '别做反';
  }
  if (step?.emphasis) {
    return '记住这句';
  }

  return '';
};

const buildShotAssistText = (
  shot: VideoRenderShot,
  problem: AlgebraProblem,
  teachingScript: TeachingScript,
  cue?: EmphasisCue
) => {
  const step = problem.steps.find((entry) => entry.id === shot.stepId);
  const teachingStep = teachingScript.steps.find((entry) => entry.stepId === shot.stepId);
  const stepNote = normalizeText(step?.note);
  const memoryTip = normalizeText(teachingStep?.memoryTip);
  const emphasisText = normalizeText(cue?.text);
  const focusMath = cleanMathForDisplay(shot.focusLatex);
  const stepMath = cleanMathForDisplay(step?.latex);

  if (shot.shotType === 'answer') {
    return clampCopy(
      normalizeText(teachingScript.outroSummary) || emphasisText || stepNote || memoryTip || '把最终答案稳稳落下来。',
      34
    );
  }

  if (stepNote && stepNote !== stepMath) {
    return clampCopy(stepNote, 28);
  }

  if (memoryTip) {
    return clampCopy(memoryTip, 28);
  }

  if (emphasisText && emphasisText !== stepMath && emphasisText !== focusMath) {
    return clampCopy(emphasisText, 28);
  }

  if (focusMath && focusMath !== stepMath) {
    return clampCopy(focusMath, 28);
  }

  if (problem.note) {
    return clampCopy(problem.note, 28);
  }

  return '';
};

const buildResultSummary = (args: BuildVideoHtmlArgs, resultCue?: EmphasisCue) => {
  const answerText = normalizeText(args.problem.answer);

  if (answerText.includes('无解') || answerText.includes('无穷多解') || answerText.includes('无实数解')) {
    return '别再写成别的了';
  }

  return resultCue?.kind === 'result' ? '这一步就定死了' : '别再写成别的了';
};

const serializeShots = (args: BuildVideoHtmlArgs) => {
  const cuesByShot = new Map<string, EmphasisCue>();

  const shotAssistCues = [...(args.emphasisPlan?.cues ?? [])].filter((cue) => {
    return cue.kind !== 'hook' && cue.source !== 'retention_break';
  });

  for (const cue of shotAssistCues.sort((left, right) => right.priority - left.priority)) {
    if (!cuesByShot.has(cue.shotId)) {
      cuesByShot.set(cue.shotId, cue);
    }
  }

  return args.renderPlan.shots.map<SerializedShot>((shot) => {
    const cue = cuesByShot.get(shot.shotId);
    const problemStep = args.problem.steps.find((step) => step.id === shot.stepId);
    const latex = cleanMathForDisplay(problemStep?.latex || shot.focusLatex || args.equation);

    return {
      ...shot,
      contextLabel: buildShotContextLabel(shot, args.teachingScript, cue),
      displayFocusLatex: buildShotAssistText(shot, args.problem, args.teachingScript, cue),
      displayLatex: latex || cleanMathForDisplay(args.equation),
      latex
    };
  });
};

export function buildVideoHtml(args: BuildVideoHtmlArgs) {
  const familyLabel = inferFamilyLabel(args);
  const firstShot = args.renderPlan.shots[0];
  const heroBadge = resolveHeroBadge(args, familyLabel);
  const heroTitle = resolveHeroTitle(args, familyLabel);
  const heroGuide = resolveHeroGuide(args, familyLabel, firstShot);
  const heroFormulaRevealMs = 600;
  const heroGuideRevealMs = 1200;
  const heroEndMs = Math.min(2000, Math.max(1800, Math.floor(args.renderPlan.durationMs * 0.16)));
  const firstEmphasisCue = getActiveEmphasisCueAtTime(args.emphasisPlan, 0) ?? getPriorityEmphasisCue(args.emphasisPlan);
  const initialShotBadge = getShotBadge(firstShot?.shotType ?? 'write', firstEmphasisCue?.kind);
  const initialFormulaLatex =
    cleanMathForDisplay(args.problem.steps.find((step) => step.id === firstShot?.stepId)?.latex) ||
    cleanMathForDisplay(args.equation);
  const initialAssistText = firstShot
    ? buildShotAssistText(firstShot, args.problem, args.teachingScript, firstEmphasisCue)
    : '';
  const initialContextLabel = firstShot
    ? buildShotContextLabel(firstShot, args.teachingScript, firstEmphasisCue)
    : '';
  const resultCue =
    [...(args.emphasisPlan?.cues ?? [])]
      .filter((cue) => cue.kind === 'result')
      .sort((left, right) => right.priority - left.priority)[0] ?? undefined;
  const resultSummary = buildResultSummary(args, resultCue);
  const serializedShots = serializeShots(args);
  const heroTitleComparable = normalizeCompareText(heroTitle);
  const heroHookComparable = normalizeCompareText(args.videoHook?.text);
  const coverFirstLineComparable = normalizeCompareText(splitCoverText(args.publishingPack?.coverText)[0]);
  const hookCueComparables = [...(args.emphasisPlan?.cues ?? [])]
    .filter((cue) => cue.kind === 'hook')
    .map((cue) => normalizeCompareText(cue.text))
    .filter(Boolean);
  const heroHookComparables = Array.from(
    new Set([heroTitleComparable, heroHookComparable, coverFirstLineComparable, ...hookCueComparables].filter(Boolean))
  );
  const data = {
    answerText: cleanMathForDisplay(args.problem.answer),
    cues: args.subtitleCuePlan.cues,
    durationMs: args.renderPlan.durationMs,
    emphasisCues: args.emphasisPlan?.cues ?? [],
    equation: cleanMathForDisplay(args.equation),
    hero: {
      badge: heroBadge,
      endMs: heroEndMs,
      formulaRevealMs: heroFormulaRevealMs,
      guide: heroGuide,
      guideRevealMs: heroGuideRevealMs,
      title: heroTitle
    },
    hookText: normalizeText(args.videoHook?.text),
    introHook: normalizeText(args.teachingScript.introHook),
    outroSummary: normalizeText(args.teachingScript.outroSummary),
    resultSummary,
    rhythmCues: args.rhythmPlan?.cues ?? [],
    shots: serializedShots,
    timelineShotLabels: TIMELINE_SHOT_LABELS,
    dedupe: {
      heroComparable: heroTitleComparable,
      heroHookComparables,
      hookComparable: heroHookComparable,
      hookCueComparables
    }
  };

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Algebra Video Preview</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: "PingFang SC", "Hiragino Sans GB", "Source Han Sans SC", sans-serif;
      --bg: #060708;
      --panel: rgba(16, 18, 24, 0.82);
      --panel-soft: rgba(18, 21, 28, 0.68);
      --text: #f9fafb;
      --muted: rgba(236, 242, 248, 0.68);
      --green: #5ff0a9;
      --blue: #6cc4ff;
      --amber: #ffd269;
      --red: #ff7878;
      --border: rgba(255, 255, 255, 0.12);
      --shadow: 0 34px 120px rgba(0, 0, 0, 0.42);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top, rgba(20, 76, 61, 0.22), transparent 34%),
        radial-gradient(circle at 80% 16%, rgba(65, 96, 170, 0.18), transparent 30%),
        linear-gradient(180deg, #0b0d12 0%, #050608 56%, #040405 100%);
      color: var(--text);
    }

    #video-root {
      display: flex;
      justify-content: center;
      padding: 28px 24px 40px;
    }

    #video-frame {
      position: relative;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      background:
        radial-gradient(circle at 24% 12%, rgba(95, 240, 169, 0.16), transparent 26%),
        radial-gradient(circle at 78% 18%, rgba(108, 196, 255, 0.12), transparent 28%),
        linear-gradient(180deg, rgba(19, 25, 34, 0.98), rgba(7, 8, 11, 0.99) 52%, rgba(4, 4, 6, 1) 100%);
    }

    #video-frame::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 22%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 7px);
      pointer-events: none;
    }

    .hero-layer,
    .content-layer,
    .subtitle-layer {
      position: absolute;
      left: 0;
      width: 100%;
      z-index: 2;
    }

    .hero-layer {
      top: 58px;
      padding: 0 64px;
      transition: opacity 300ms ease, transform 300ms ease;
    }

    .hero-layer.is-hidden {
      opacity: 0;
      transform: translateY(-26px);
      pointer-events: none;
    }

    .hero-card {
      width: 100%;
      padding: 18px 0 22px;
      border-radius: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
      position: relative;
      overflow: hidden;
    }

    .hero-card::before {
      display: none;
    }

    .hero-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0;
      color: #08140e;
      background: linear-gradient(90deg, #7df6b8, #ffd269);
      text-transform: uppercase;
    }

    .hero-title {
      position: relative;
      margin-top: 18px;
      font-size: 70px;
      line-height: 1.08;
      font-weight: 960;
      letter-spacing: 0;
      text-wrap: balance;
    }

    .hero-guide {
      position: relative;
      margin-top: 18px;
      width: fit-content;
      max-width: 92%;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 28px;
      line-height: 1.35;
      color: rgba(249, 250, 251, 0.88);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: opacity 240ms ease, transform 240ms ease;
    }

    .hero-layer.stage-badge_title .hero-guide,
    .hero-layer.stage-formula .hero-guide {
      opacity: 0;
      transform: translateY(10px);
    }

    .hero-layer.stage-formula .hero-badge,
    .hero-layer.stage-guide .hero-badge {
      opacity: 0.48;
    }

    .hero-layer.stage-formula .hero-title,
    .hero-layer.stage-guide .hero-title {
      opacity: 0.34;
      transform: translateY(-8px) scale(0.9);
      transform-origin: left top;
    }

    .hero-layer.stage-guide .hero-guide {
      font-size: 40px;
      font-weight: 940;
      color: #fff8d5;
      background: rgba(255, 210, 105, 0.12);
      border-color: rgba(255, 210, 105, 0.28);
    }

    .content-layer {
      top: 338px;
      padding: 0 64px;
      display: grid;
      gap: 24px;
    }

    .formula-card {
      position: relative;
      min-height: 684px;
      padding: 34px 40px 40px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03)),
        rgba(14, 18, 26, 0.9);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 26px 88px rgba(0, 0, 0, 0.24);
      transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease, background 240ms ease;
      overflow: hidden;
    }

    .formula-card.is-hero-focus {
      background: rgba(15, 18, 25, 0.26);
      border-color: rgba(255, 255, 255, 0.04);
      box-shadow: 0 10px 34px rgba(0, 0, 0, 0.08);
    }

    .formula-card.is-hero-focus::before {
      background:
        radial-gradient(circle at top, rgba(108, 196, 255, 0.05), transparent 32%),
        linear-gradient(180deg, rgba(255,255,255,0.012), transparent 20%);
    }

    .formula-card.is-hero-hidden {
      opacity: 0;
      transform: translateY(34px) scale(0.98);
    }

    .formula-card.is-secondary {
      min-height: 454px;
      opacity: 0.38;
      transform: scale(0.965);
    }

    .formula-card.is-secondary #formula-latex {
      min-height: 224px;
      font-size: 72px;
    }

    .formula-card.is-result-muted {
      display: none;
    }

    .formula-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top, rgba(108, 196, 255, 0.14), transparent 34%),
        linear-gradient(180deg, rgba(255,255,255,0.04), transparent 26%);
      pointer-events: none;
    }

    .formula-card.is-highlight,
    .formula-card.is-interval {
      border-color: rgba(255, 210, 105, 0.72);
      box-shadow: 0 0 0 2px rgba(255, 210, 105, 0.16), 0 26px 88px rgba(0, 0, 0, 0.26);
    }

    .formula-card.is-branch {
      border-color: rgba(108, 196, 255, 0.78);
      box-shadow: 0 0 0 2px rgba(108, 196, 255, 0.14), 0 26px 88px rgba(0, 0, 0, 0.26);
    }

    .formula-card.is-answer {
      border-color: rgba(95, 240, 169, 0.92);
      background:
        linear-gradient(180deg, rgba(95, 240, 169, 0.18), rgba(108, 196, 255, 0.06)),
        rgba(10, 20, 17, 0.94);
      box-shadow: 0 0 0 2px rgba(95, 240, 169, 0.18), 0 38px 110px rgba(95, 240, 169, 0.12);
    }

    .formula-shell {
      position: relative;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      min-height: 100%;
      align-items: start;
      gap: 22px;
      z-index: 1;
    }

    .formula-card.is-hero-focus .formula-topline,
    .formula-card.is-hero-focus .formula-heading,
    .formula-card.is-hero-focus #formula-focus {
      opacity: 0;
      pointer-events: none;
    }

    .formula-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }

    #shot-kicker {
      display: inline-flex;
      align-items: center;
      padding: 10px 16px;
      border-radius: 999px;
      font-size: 24px;
      font-weight: 900;
      color: #0a100d;
      background: linear-gradient(90deg, #ffd269, #ffc66d);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
    }

    #context-chip {
      min-height: 34px;
      font-size: 22px;
      line-height: 1.3;
      font-weight: 800;
      color: rgba(244, 248, 255, 0.72);
      text-align: right;
    }

    .formula-meta {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .formula-heading {
      font-size: 24px;
      line-height: 1.3;
      color: rgba(246, 249, 252, 0.76);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-weight: 800;
    }

    #formula-latex {
      align-self: center;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 340px;
      padding: 18px 18px 12px;
      text-align: center;
      font-family: "Times New Roman", "STIX Two Text", "Songti SC", serif;
      font-size: 100px;
      line-height: 1.12;
      font-weight: 760;
      letter-spacing: 0;
      text-wrap: balance;
      word-break: break-word;
      transition: opacity 240ms ease, transform 240ms ease, font-size 240ms ease;
    }

    .formula-card.is-hero-focus #formula-latex {
      min-height: 462px;
      padding-top: 58px;
      font-size: 128px;
    }

    #formula-focus {
      min-height: 88px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 22px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #9ff8c9;
      font-size: 32px;
      line-height: 1.36;
      font-weight: 850;
      text-align: center;
      word-break: break-word;
      transition: opacity 220ms ease, transform 220ms ease;
    }

    .emphasis-panel {
      position: relative;
      min-height: 190px;
      padding: 24px 28px 26px 40px;
      border-radius: 30px;
      border: 1px solid rgba(255, 210, 105, 0.32);
      background: rgba(37, 28, 12, 0.9);
      box-shadow: 0 22px 76px rgba(0, 0, 0, 0.18);
      overflow: hidden;
    }

    .emphasis-panel::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 18px;
      background: var(--amber);
    }

    .emphasis-panel[hidden] {
      display: none;
    }

    .emphasis-panel.is-suppressed {
      display: none;
    }

    .emphasis-panel.is-main {
      min-height: 292px;
      padding-top: 32px;
      padding-bottom: 34px;
      box-shadow: 0 32px 110px rgba(0, 0, 0, 0.26);
    }

    .emphasis-panel.emphasis-hook {
      background: rgba(15, 39, 30, 0.92);
      border-color: rgba(95, 240, 169, 0.36);
    }

    .emphasis-panel.emphasis-hook::before {
      background: var(--green);
    }

    .emphasis-panel.emphasis-rule {
      background: rgba(40, 31, 9, 0.92);
      border-color: rgba(255, 210, 105, 0.34);
    }

    .emphasis-panel.emphasis-rule::before {
      background: var(--amber);
    }

    .emphasis-panel.emphasis-mistake {
      background: rgba(48, 16, 17, 0.92);
      border-color: rgba(255, 120, 120, 0.4);
    }

    .emphasis-panel.emphasis-mistake::before {
      background: var(--red);
    }

    .emphasis-panel.emphasis-result {
      background: rgba(8, 31, 43, 0.92);
      border-color: rgba(108, 196, 255, 0.38);
    }

    .emphasis-panel.emphasis-result::before {
      background: var(--blue);
    }

    .emphasis-label {
      font-size: 23px;
      line-height: 1.3;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(244, 248, 252, 0.72);
    }

    #emphasis-text {
      margin-top: 10px;
      font-size: 44px;
      line-height: 1.24;
      font-weight: 940;
      text-wrap: balance;
      word-break: break-word;
    }

    .emphasis-panel.is-main #emphasis-text {
      font-size: 58px;
      line-height: 1.16;
    }

    .result-card {
      position: relative;
      min-height: 360px;
      padding: 34px 34px 38px;
      border-radius: 8px;
      border: 1px solid rgba(95, 240, 169, 0.42);
      background:
        linear-gradient(135deg, rgba(95, 240, 169, 0.16), rgba(108, 196, 255, 0.08)),
        rgba(10, 20, 17, 0.95);
      box-shadow: 0 26px 96px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .result-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(255,255,255,0.06), transparent 26%);
      pointer-events: none;
    }

    .result-card[hidden] {
      display: none;
    }

    .result-header {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 12px 18px;
      border-radius: 999px;
      font-size: 24px;
      font-weight: 950;
      letter-spacing: 0.08em;
      color: #07130d;
      background: linear-gradient(90deg, #7df6b8, #6cc4ff);
    }

    #result-text {
      position: relative;
      margin-top: 22px;
      font-size: 96px;
      line-height: 1.08;
      font-weight: 980;
      letter-spacing: 0;
      word-break: break-word;
      text-wrap: balance;
      font-family: "Times New Roman", "STIX Two Text", "Songti SC", serif;
    }

    .result-summary-label {
      position: relative;
      margin-top: 18px;
      font-size: 24px;
      line-height: 1.3;
      font-weight: 900;
      color: rgba(249, 250, 251, 0.72);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    #result-summary {
      position: relative;
      margin-top: 24px;
      font-size: 42px;
      line-height: 1.22;
      font-weight: 940;
      color: #fff8d5;
      word-break: break-word;
    }

    .subtitle-layer {
      bottom: 178px;
      padding: 0 72px;
      z-index: 3;
    }

    .subtitle-card {
      padding: 26px 30px 24px;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
        rgba(10, 12, 16, 0.9);
      box-shadow: 0 22px 80px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
      transition: opacity 240ms ease, transform 240ms ease, background 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
    }

    .subtitle-card.is-hero-muted {
      padding: 18px 24px 16px;
      opacity: 0.52;
      transform: scale(0.72);
      transform-origin: center bottom;
      border-color: rgba(255, 255, 255, 0.07);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
        rgba(8, 10, 14, 0.54);
      box-shadow: 0 14px 42px rgba(0, 0, 0, 0.18);
    }

    .subtitle-card.is-hero-muted .subtitle-topline,
    .subtitle-card.is-hero-muted #subtitle-secondary,
    .subtitle-card.is-hero-muted .progress-row {
      display: none;
    }

    .subtitle-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      color: rgba(249, 250, 251, 0.66);
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    #subtitle-secondary {
      margin-top: 14px;
      min-height: 28px;
      font-size: 22px;
      line-height: 1.32;
      color: rgba(249, 250, 251, 0.7);
      font-weight: 800;
    }

    #subtitle-primary {
      margin-top: 12px;
      font-size: 46px;
      line-height: 1.3;
      font-weight: 920;
      word-break: break-word;
      text-wrap: balance;
      transition: font-size 220ms ease, color 220ms ease;
    }

    .subtitle-card.is-hero-muted #subtitle-primary {
      margin-top: 0;
      min-height: 48px;
      font-size: 30px;
      line-height: 1.34;
      color: rgba(248, 250, 252, 0.78);
    }

    .subtitle-card.is-emphasis #subtitle-primary {
      color: #ffffff;
    }

    .subtitle-card.is-supporting #subtitle-primary {
      font-size: 30px;
      color: rgba(249, 250, 251, 0.54);
    }

    .subtitle-card.rhythm-pause #subtitle-primary {
      color: var(--amber);
    }

    .subtitle-card.rhythm-slow #subtitle-primary {
      color: #b9e4ff;
    }

    .subtitle-card.rhythm-speed_up #subtitle-primary {
      color: #a7ffd2;
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 18px;
      margin-top: 18px;
      font-size: 22px;
      color: rgba(249, 250, 251, 0.56);
    }

    .progress-track {
      flex: 1;
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .progress-fill {
      width: 0;
      height: 100%;
      background: linear-gradient(90deg, var(--green), var(--blue));
    }

    .animate-fade_in { animation: fadeIn 320ms ease both; }
    .animate-slide_left { animation: slideLeft 360ms ease both; }
    .animate-slide_right { animation: slideRight 360ms ease both; }
    .animate-highlight_pulse { animation: highlightPulse 720ms ease both; }
    .animate-replace { animation: replacePulse 380ms ease both; }

    .rhythm-beat {
      animation: rhythmBeat 560ms ease both;
    }

    #timeline-root {
      display: none;
      max-width: 1140px;
      margin: 0 auto;
      padding: 34px 24px 48px;
    }

    body.view-timeline #video-root { display: none; }
    body.view-timeline #timeline-root { display: block; }

    .timeline-title {
      font-size: 30px;
      font-weight: 900;
      margin-bottom: 14px;
    }

    .timeline-summary {
      color: var(--muted);
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .timeline-track {
      display: flex;
      gap: 6px;
      width: 100%;
      margin-bottom: 28px;
    }

    .timeline-bar {
      min-height: 64px;
      border-radius: 10px;
      padding: 10px 12px;
      background: rgba(26, 33, 42, 0.94);
      border: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: flex-end;
      font-size: 12px;
      overflow: hidden;
    }

    .timeline-list {
      display: grid;
      gap: 12px;
    }

    .timeline-item {
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(16, 20, 26, 0.9);
      padding: 16px 18px;
      display: grid;
      grid-template-columns: 96px 108px 1fr 126px;
      gap: 14px;
      align-items: start;
      font-size: 14px;
      line-height: 1.45;
    }

    .timeline-mono {
      font-family: "SFMono-Regular", "Menlo", monospace;
      color: rgba(241, 244, 248, 0.6);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideLeft {
      from { opacity: 0; transform: translateX(34px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideRight {
      from { opacity: 0; transform: translateX(-34px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes highlightPulse {
      0% { transform: scale(0.986); box-shadow: 0 0 0 rgba(255, 210, 105, 0); }
      50% { transform: scale(1); box-shadow: 0 0 0 16px rgba(255, 210, 105, 0.1); }
      100% { transform: scale(1); box-shadow: 0 0 0 rgba(255, 210, 105, 0); }
    }

    @keyframes replacePulse {
      from { opacity: 0.36; transform: scale(0.986); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes rhythmBeat {
      0% { transform: scale(1); filter: brightness(1); }
      42% { transform: scale(1.018); filter: brightness(1.16); }
      100% { transform: scale(1); filter: brightness(1); }
    }
  </style>
</head>
<body>
  <div id="video-root">
    <div id="video-frame">
      <div id="hero-layer" class="hero-layer">
        <div class="hero-card">
          <div id="hero-badge" class="hero-badge">${escapeHtml(heroBadge)}</div>
          <div id="hero-title" class="hero-title">${escapeHtml(heroTitle)}</div>
          <div id="hero-guide" class="hero-guide">${escapeHtml(heroGuide)}</div>
        </div>
      </div>

      <div class="content-layer">
        <div id="formula-card" class="formula-card is-hero-focus is-hero-hidden">
          <div class="formula-shell">
            <div class="formula-topline">
              <div class="formula-meta">
                <span id="shot-kicker">${escapeHtml(initialShotBadge)}</span>
              </div>
              <div id="context-chip">${escapeHtml(initialContextLabel === initialShotBadge ? '' : initialContextLabel)}</div>
            </div>
            <div class="formula-heading">${escapeHtml(familyLabel)}</div>
            <div id="formula-latex">${escapeHtml(initialFormulaLatex)}</div>
            <div id="formula-focus">${escapeHtml(initialAssistText)}</div>
          </div>
        </div>

        <div id="emphasis-panel" class="emphasis-panel${firstEmphasisCue ? ` emphasis-${firstEmphasisCue.kind}` : ''} is-suppressed" hidden>
          <div id="emphasis-kind" class="emphasis-label">${escapeHtml(
            firstEmphasisCue ? EMPHASIS_LABELS[firstEmphasisCue.kind] : '重点提示'
          )}</div>
          <div id="emphasis-text">${escapeHtml(firstEmphasisCue?.text ?? '')}</div>
        </div>

        <div id="result-card" class="result-card" hidden>
          <div class="result-header">最终答案</div>
          <div id="result-text">${escapeHtml(cleanMathForDisplay(args.problem.answer))}</div>
          <div id="result-summary">${escapeHtml(resultSummary)}</div>
        </div>
      </div>

      <div class="subtitle-layer">
        <div id="subtitle-card" class="subtitle-card is-hero-muted">
          <div class="subtitle-topline">
            <span>讲解重点</span>
            <span id="progress-text">0.0s / ${(args.renderPlan.durationMs / 1000).toFixed(1)}s</span>
          </div>
          <div id="subtitle-secondary">${escapeHtml(
            firstEmphasisCue ? EMPHASIS_LABELS[firstEmphasisCue.kind] : familyLabel
          )}</div>
          <div id="subtitle-primary"></div>
          <div class="progress-row">
            <div class="progress-track">
              <div id="progress-fill" class="progress-fill"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="timeline-root"></div>

  <script>
    const DATA = ${JSON.stringify(data)};
    const EMPHASIS_LABELS = ${JSON.stringify(EMPHASIS_LABELS)};

    const params = new URLSearchParams(window.location.search);
    const forcedTimeMs = params.has('t') ? Number(params.get('t')) : null;
    const view = params.get('view') === 'timeline' ? 'timeline' : 'preview';
    if (view === 'timeline') {
      document.body.classList.add('view-timeline');
    }

    const heroLayer = document.getElementById('hero-layer');
    const heroBadge = document.getElementById('hero-badge');
    const heroTitle = document.getElementById('hero-title');
    const heroGuide = document.getElementById('hero-guide');
    const formulaCard = document.getElementById('formula-card');
    const formulaLatex = document.getElementById('formula-latex');
    const formulaFocus = document.getElementById('formula-focus');
    const shotKicker = document.getElementById('shot-kicker');
    const contextChip = document.getElementById('context-chip');
    const emphasisPanel = document.getElementById('emphasis-panel');
    const emphasisKind = document.getElementById('emphasis-kind');
    const emphasisText = document.getElementById('emphasis-text');
    const resultCard = document.getElementById('result-card');
    const resultText = document.getElementById('result-text');
    const resultSummary = document.getElementById('result-summary');
    const subtitleCard = document.getElementById('subtitle-card');
    const subtitlePrimary = document.getElementById('subtitle-primary');
    const subtitleSecondary = document.getElementById('subtitle-secondary');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const timelineRoot = document.getElementById('timeline-root');

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const formatSeconds = (ms) => (ms / 1000).toFixed(1) + 's';
    const escapeText = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const normalizeCompare = (value) => String(value || '').replace(/\\s+/g, '').replace(/[，。！？、；：,.!?;:"'()（）【】\\[\\]…\\-_]/g, '').toLowerCase();

    const getShotForTime = (timeMs) => {
      if (DATA.shots.length === 0) {
        return null;
      }

      const bounded = clamp(timeMs, 0, Math.max(DATA.durationMs - 1, 0));
      return DATA.shots.find((shot) => bounded >= shot.startMs && bounded < shot.endMs) ?? DATA.shots[DATA.shots.length - 1];
    };

    const getCueForTime = (timeMs) => {
      if (DATA.cues.length === 0) {
        return null;
      }

      const bounded = clamp(timeMs, 0, Math.max(DATA.durationMs - 1, 0));
      return DATA.cues.find((cue) => bounded >= cue.startMs && bounded < cue.endMs) ?? DATA.cues[DATA.cues.length - 1];
    };

    const getEmphasisCueForTime = (timeMs) => {
      if (DATA.emphasisCues.length === 0) {
        return null;
      }

      const bounded = clamp(timeMs, 0, Math.max(DATA.durationMs - 1, 0));
      const matches = DATA.emphasisCues
        .filter((cue) => bounded >= (cue.displayStartMs ?? cue.startMs) && bounded < (cue.displayEndMs ?? cue.endMs))
        .sort((left, right) => right.priority - left.priority);

      return matches[0] || null;
    };

    const getRhythmCuesForTime = (timeMs) => {
      if (DATA.rhythmCues.length === 0) {
        return [];
      }

      const bounded = clamp(timeMs, 0, Math.max(DATA.durationMs - 1, 0));
      return DATA.rhythmCues.filter((cue) => bounded >= cue.startMs && bounded < cue.startMs + cue.durationMs);
    };

    const getEmphasisLabel = (kind) => EMPHASIS_LABELS[kind] || '重点提示';
    const getHeroStage = (timeMs) => {
      if (timeMs < DATA.hero.formulaRevealMs) return 'badge_title';
      if (timeMs < DATA.hero.guideRevealMs) return 'formula';
      if (timeMs < DATA.hero.endMs) return 'guide';
      return 'done';
    };
    const isHeroActive = (timeMs) => getHeroStage(timeMs) !== 'done';
    const shouldSuppressHookCueInHero = (cue, timeMs) => {
      if (!cue || !isHeroActive(timeMs)) {
        return false;
      }

      if (cue.kind !== 'hook') {
        return false;
      }

      const cueComparable = normalizeCompare(cue.text);
      return Boolean(cueComparable && DATA.dedupe.heroHookComparables.includes(cueComparable));
    };

    const getShotKicker = (shotType, emphasisKind) => {
      if (emphasisKind && EMPHASIS_LABELS[emphasisKind]) {
        return EMPHASIS_LABELS[emphasisKind];
      }

      if (shotType === 'answer') return '最后结论';
      if (shotType === 'interval') return '区间判断';
      if (shotType === 'branch') return '关键分支';
      if (shotType === 'highlight') return '先看这里';
      if (shotType === 'substitute') return '回代检查';
      if (shotType === 'eliminate') return '消元推进';
      return '关键一步';
    };

    const clearFormulaClasses = () => {
      formulaCard.className = 'formula-card';
    };

    const clearRhythmClasses = () => {
      subtitleCard.classList.remove('rhythm-pause', 'rhythm-slow', 'rhythm-speed_up', 'rhythm-beat', 'is-emphasis', 'is-supporting');
      formulaCard.classList.remove('rhythm-beat');
      emphasisPanel.classList.remove('rhythm-beat');
    };

    const applyHero = (timeMs, emphasisCue) => {
      if (!heroLayer) {
        return;
      }

      const heroStage = getHeroStage(timeMs);
      const shouldHide = heroStage === 'done';
      heroLayer.classList.toggle('is-hidden', shouldHide);
      heroLayer.classList.remove('stage-badge_title', 'stage-formula', 'stage-guide');

      if (!shouldHide) {
        heroLayer.classList.add('stage-' + heroStage);
      }

      heroTitle.textContent = DATA.hero.title;
      heroBadge.textContent = DATA.hero.badge;
      heroGuide.textContent = DATA.hero.guide || DATA.introHook || '';
    };

    const applyEmphasis = (cue, currentTimeMs) => {
      if (!cue || cue.kind === 'result' || isHeroActive(currentTimeMs) || shouldSuppressHookCueInHero(cue, currentTimeMs)) {
        emphasisPanel.hidden = true;
        emphasisPanel.classList.add('is-suppressed');
        return;
      }

      emphasisPanel.hidden = false;
      emphasisPanel.classList.remove('is-suppressed');
      emphasisPanel.className = 'emphasis-panel emphasis-' + cue.kind + ' is-main';
      emphasisKind.textContent = getEmphasisLabel(cue.kind);
      emphasisText.textContent = cue.text;
    };

    const applyResultCard = (shot, emphasisCue) => {
      const shouldShow = Boolean(shot && shot.shotType === 'answer') || Boolean(emphasisCue && emphasisCue.kind === 'result');

      if (!shouldShow) {
        resultCard.hidden = true;
        return;
      }

      resultCard.hidden = false;
      resultText.textContent = DATA.answerText || shot?.displayLatex || shot?.latex || '';
      resultSummary.textContent = DATA.resultSummary || DATA.outroSummary || '';
    };

    const applyRhythm = (rhythmCues, baseSubtitle, emphasisCue, currentTimeMs) => {
      clearRhythmClasses();
      const heroStage = getHeroStage(currentTimeMs);

      if (emphasisCue && heroStage === 'done') {
        subtitleCard.classList.add('is-emphasis');
      }

      subtitleCard.classList.toggle('is-hero-muted', heroStage !== 'done');

      if (heroStage !== 'done') {
        subtitlePrimary.textContent = '';
        return;
      }

      if (rhythmCues.length === 0) {
        subtitlePrimary.textContent = baseSubtitle;
        return;
      }

      const types = new Set(rhythmCues.map((cue) => cue.type));
      let subtitleText = baseSubtitle;

      if (types.has('pause')) {
        subtitleText = baseSubtitle + ' …';
        subtitleCard.classList.add('rhythm-pause');
      }

      if (types.has('slow')) {
        subtitleCard.classList.add('rhythm-slow');
      }

      if (types.has('speed_up')) {
        subtitleCard.classList.add('rhythm-speed_up');
      }

      if (types.has('repeat')) {
        subtitleCard.classList.add('is-supporting');
      }

      if (types.has('beat')) {
        subtitleCard.classList.add('rhythm-beat');
        formulaCard.classList.add('rhythm-beat');
        if (!emphasisPanel.hidden) {
          emphasisPanel.classList.add('rhythm-beat');
        }
      }

      subtitlePrimary.textContent = subtitleText;
    };

    const applyAnimation = (animation) => {
      if (!animation) {
        return;
      }

      const className = 'animate-' + animation;
      formulaCard.classList.remove(className);
      void formulaCard.offsetWidth;
      formulaCard.classList.add(className);
    };

    const applyShot = (shot, cue, currentTimeMs, animate) => {
      if (!shot) {
        return;
      }

      const emphasisCue = getEmphasisCueForTime(currentTimeMs);
      const heroStage = getHeroStage(currentTimeMs);
      clearFormulaClasses();
      formulaCard.classList.add('is-' + shot.shotType);
      formulaCard.classList.toggle('is-hero-focus', heroStage !== 'done');
      formulaCard.classList.toggle('is-hero-hidden', heroStage === 'badge_title');
      if (heroStage === 'done' && (emphasisCue || shot.shotType === 'answer')) {
        formulaCard.classList.add('is-secondary');
      }
      if (heroStage === 'done' && (shot.shotType === 'answer' || emphasisCue?.kind === 'result')) {
        formulaCard.classList.add('is-result-muted');
      }
      formulaLatex.textContent = shot.displayLatex || shot.latex || DATA.equation;
      formulaFocus.textContent = heroStage !== 'done' ? '' : shot.displayFocusLatex || shot.contextLabel || DATA.hero.guide || '';
      shotKicker.textContent = heroStage !== 'done' ? '' : getShotKicker(shot.shotType, emphasisCue?.kind);
      const contextText = shot.contextLabel || (emphasisCue ? getEmphasisLabel(emphasisCue.kind) : '');
      contextChip.textContent = heroStage !== 'done' ? '' : contextText === shotKicker.textContent ? '' : contextText;
      applyHero(currentTimeMs, emphasisCue);
      applyEmphasis(emphasisCue, currentTimeMs);
      applyResultCard(shot, emphasisCue);

      const baseSubtitle = cue?.text || shot.subtitle || shot.narration || DATA.hookText || DATA.introHook || DATA.hero.title;
      subtitleSecondary.textContent = heroStage !== 'done'
        ? ''
        : emphasisCue
        ? getEmphasisLabel(emphasisCue.kind)
        : shot.contextLabel || getShotKicker(shot.shotType);
      applyRhythm(getRhythmCuesForTime(currentTimeMs), baseSubtitle, emphasisCue, currentTimeMs);
      if (heroStage === 'done' && emphasisCue) {
        subtitleCard.classList.add('is-supporting');
      }

      if (animate) {
        applyAnimation(shot.animation);
      }

      const progress = DATA.durationMs <= 0 ? 0 : clamp(currentTimeMs / DATA.durationMs, 0, 1);
      progressFill.style.width = (progress * 100).toFixed(3) + '%';
      progressText.textContent = formatSeconds(currentTimeMs) + ' / ' + formatSeconds(DATA.durationMs);
    };

    const buildTimeline = () => {
      const bars = DATA.shots.map((shot) => {
        const width = DATA.durationMs <= 0 ? 0 : (shot.endMs - shot.startMs) / DATA.durationMs * 100;
        return '<div class="timeline-bar" style="width:' + width.toFixed(3) + '%"><strong>' + escapeText(shot.shotId) + '</strong></div>';
      }).join('');

      const items = DATA.shots.map((shot) => {
        const emphasis = DATA.emphasisCues
          .filter((cue) => cue.shotId === shot.shotId)
          .map((cue) => getEmphasisLabel(cue.kind) + '：' + cue.text)
          .join(' / ');
        const rhythm = DATA.rhythmCues
          .filter((cue) => cue.stepId === shot.stepId && cue.startMs >= shot.startMs && cue.startMs < shot.endMs)
          .map((cue) => cue.type + '@' + formatSeconds(cue.startMs))
          .join(' / ');

        return '<div class="timeline-item">' +
          '<div><strong>' + escapeText(shot.shotId) + '</strong><div class="timeline-mono">' + escapeText(shot.stepId || '') + '</div></div>' +
          '<div><strong>' + escapeText(DATA.timelineShotLabels[shot.shotType] || shot.shotType || '') + '</strong><div class="timeline-mono">' + escapeText(shot.animation || '') + '</div><div>' + escapeText(rhythm) + '</div></div>' +
          '<div><div>' + escapeText(shot.subtitle || '') + '</div><div class="timeline-mono">' + escapeText(shot.displayFocusLatex || shot.displayLatex || shot.latex || '') + '</div><div>' + escapeText(emphasis) + '</div></div>' +
          '<div class="timeline-mono">' + formatSeconds(shot.startMs) + ' - ' + formatSeconds(shot.endMs) + '</div>' +
        '</div>';
      }).join('');

      timelineRoot.innerHTML =
        '<div class="timeline-title">Shot Timeline</div>' +
        '<div class="timeline-summary">总时长 ' + formatSeconds(DATA.durationMs) + '，共 ' + DATA.shots.length + ' 个镜头。调试视图保留 shot / subtitle / emphasis / rhythm 关系。</div>' +
        '<div class="timeline-track">' + bars + '</div>' +
        '<div class="timeline-list">' + items + '</div>';
    };

    buildTimeline();

    if (view === 'timeline') {
      applyShot(DATA.shots[0] || null, DATA.cues[0] || null, 0, false);
    } else if (forcedTimeMs !== null && Number.isFinite(forcedTimeMs)) {
      applyShot(getShotForTime(forcedTimeMs), getCueForTime(forcedTimeMs), forcedTimeMs, false);
    } else {
      const startAt = performance.now();
      let lastShotId = '';

      const tick = (now) => {
        const elapsed = now - startAt;
        const bounded = clamp(elapsed, 0, DATA.durationMs);
        const shot = getShotForTime(bounded);
        const cue = getCueForTime(bounded);

        if (shot) {
          const animate = shot.shotId !== lastShotId;
          applyShot(shot, cue, bounded, animate);
          lastShotId = shot.shotId;
        }

        if (elapsed < DATA.durationMs) {
          requestAnimationFrame(tick);
          return;
        }

        applyShot(DATA.shots[DATA.shots.length - 1] || null, DATA.cues[DATA.cues.length - 1] || null, DATA.durationMs, false);
      };

      requestAnimationFrame(tick);
    }
  </script>
</body>
</html>`;
}

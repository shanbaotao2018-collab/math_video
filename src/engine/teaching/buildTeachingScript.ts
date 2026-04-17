import type {AlgebraProblem, AlgebraStep} from '../../types/algebra';
import type {
  BuildTeachingScriptContext,
  TeachingPersona,
  TeachingPersonaId,
  TeachingScript,
  TeachingScriptFamily,
  TeachingScriptStep,
  VideoHook,
  VideoHookStyle
} from './teachingScriptTypes';

const FAMILY_INTRO_HOOKS: Record<TeachingScriptFamily, string | undefined> = {
  fallback: '先别急着算，先看题目边界。',
  fraction_equation: '这一步能省一半时间：先处理分母。',
  fraction_inequality: '90%的人会漏定义域和临界点。',
  linear_equation: '别急着移项，先看最短入口。',
  linear_inequality: '你一定会在变号这里翻车。',
  linear_system: '先别急着算，先找消元口。',
  quadratic_equation: '先别急着套公式，先判几个解。',
  unknown: undefined
};

export const TEACHING_PERSONAS: Record<TeachingPersonaId, TeachingPersona> = {
  calm_teacher: {
    guidance: '语气平稳，强调理解过程和稳步推进。',
    id: 'calm_teacher',
    label: '平稳讲解'
  },
  exam_coach: {
    guidance: '更强调考场效率、得分点和快速判断。',
    id: 'exam_coach',
    label: '考场教练'
  },
  strict_teacher: {
    guidance: '更强调规范、易错点和不能犯的错误。',
    id: 'strict_teacher',
    label: '严格老师'
  }
};

const SPECIAL_STEP_RULES: Partial<Record<string, Omit<TeachingScriptStep, 'stepId'>>> = {
  analyze_sign_interval: {
    emphasis: '关键是分段',
    mistakeWarning: '不要漏区间',
    narration: '接下来按临界点分段，逐段判断符号。',
    pacingHint: 'slow'
  },
  apply_quadratic_formula: {
    emphasis: '公式里有正负两个分支',
    narration: '把系数代入求根公式，再把正负两个分支分别算出来。',
    pacingHint: 'slow'
  },
  apply_zero_product_rule: {
    emphasis: '积为 0，就转成因式为 0',
    memoryTip: '看到积等于 0，就想到拆成因式各自等于 0。',
    narration: '两个因式相乘等于 0，说明至少有一个因式为 0。',
    pacingHint: 'slow'
  },
  back_substitute_solution: {
    emphasis: '先知一个，再求另一个',
    narration: '已经知道一个变量了，再代回去求另一个变量。',
    pacingHint: 'normal'
  },
  classify_root_count: {
    emphasis: 'Δ 决定解的个数',
    narration: '先看判别式，判断这个方程有几个解。',
    pacingHint: 'slow'
  },
  clear_denominator: {
    emphasis: '整个式子都要同时处理',
    mistakeWarning: '去分母时不要漏掉任何一项。',
    narration: '先把分母去掉，把式子变简单。',
    pacingHint: 'normal'
  },
  collect_solution_branches: {
    emphasis: '结果一次汇总',
    narration: '把几个结果合在一起，就是最终答案。',
    pacingHint: 'pause'
  },
  collect_system_solution: {
    emphasis: '有序数对',
    narration: '把两个变量配成一组，这就是方程组的解。',
    pacingHint: 'pause'
  },
  compute_discriminant: {
    emphasis: '先判断，再求根',
    memoryTip: '先算 Δ，再决定后面走哪条求根路径。',
    narration: '先算判别式，看看后面该怎么求。',
    pacingHint: 'normal'
  },
  divide_both_sides: {
    emphasis: '两边必须同时操作',
    narration: '两边同时除以这个数，把系数消掉。',
    pacingHint: 'fast'
  },
  final_answer: {
    emphasis: '答案落锤',
    narration: '最终答案在这里落下来。',
    pacingHint: 'pause'
  },
  find_critical_points: {
    emphasis: '先找临界点',
    narration: '先把临界点找出来，这样后面才能按区间分析。',
    pacingHint: 'normal'
  },
  eliminate_variable: {
    emphasis: '消掉一个变量',
    narration: '把两式相加或相减，把这个变量消掉。',
    pacingHint: 'slow'
  },
  flip_inequality_sign: {
    emphasis: '除以负数，不等号要反向',
    mistakeWarning: '这是最容易错的一步',
    narration: '注意，这一步除以的是负数。',
    pacingHint: 'slow'
  },
  move_term: {
    emphasis: '移项要变号',
    mistakeWarning: '很多人会忘记变号',
    narration: '把这一项移到另一边，记得符号要跟着改变。',
    pacingHint: 'normal'
  },
  rewrite_equation_for_substitution: {
    emphasis: '先单独写出一个变量',
    narration: '先把一个变量单独写出来，方便后面代入。',
    pacingHint: 'normal'
  },
  solve_inequality: {
    emphasis: '范围写准',
    narration: '继续把不等式解出来，写出满足条件的范围。',
    pacingHint: 'normal'
  },
  solve_single_variable_equation: {
    emphasis: '只剩一个变量',
    narration: '现在只剩一个变量了，直接把它解出来。',
    pacingHint: 'fast'
  },
  state_domain_restriction: {
    emphasis: '分母不能为 0',
    mistakeWarning: '很多人会忘记先排除分母为 0 的值。',
    narration: '先看定义域，分母不能等于 0。',
    pacingHint: 'normal'
  },
  state_infinite_solutions: {
    emphasis: '同一个条件',
    narration: '这两条式子表示同一个条件，所以会有无穷多组解。',
    pacingHint: 'pause'
  },
  state_no_real_solution: {
    emphasis: '无实数解',
    narration: '判别式小于 0，所以这个方程在实数范围内没有解。',
    pacingHint: 'pause'
  },
  state_no_solution: {
    emphasis: '条件矛盾',
    narration: '这两个条件互相矛盾，所以方程组无解。',
    pacingHint: 'pause'
  },
  substitute_expression: {
    emphasis: '先消成一个变量',
    narration: '把刚才的式子代进去，把两个方程先化成一个一元方程。',
    pacingHint: 'slow'
  },
  write_equation: {
    emphasis: '先看清题目',
    narration: '先把题目写清楚，看看已知条件是什么。',
    pacingHint: 'fast'
  }
};

const STEP_KIND_FALLBACK_RULES: Partial<Record<AlgebraStep['kind'], Omit<TeachingScriptStep, 'stepId'>>> = {
  answer: {
    emphasis: '答案落定',
    narration: '这一步得到最终结果。',
    pacingHint: 'pause'
  },
  expand: {
    emphasis: '先展开再化简',
    narration: '先把括号展开，后面的整理就更直接了。',
    pacingHint: 'normal'
  },
  move: {
    emphasis: '移项要变号',
    mistakeWarning: '很多人会忘记变号',
    narration: '把这一项移到另一边，记得符号要跟着改变。',
    pacingHint: 'normal'
  },
  write: {
    emphasis: '先看清题目',
    narration: '先把题目写清楚，看看已知条件是什么。',
    pacingHint: 'fast'
  }
};

const DEFAULT_PERSONA_ID: TeachingPersonaId = 'calm_teacher';

const DEFAULT_HOOK_STYLE_BY_FAMILY: Record<TeachingScriptFamily, VideoHookStyle> = {
  fallback: 'question_first',
  fraction_equation: 'shortcut_first',
  fraction_inequality: 'mistake_first',
  linear_equation: 'question_first',
  linear_inequality: 'mistake_first',
  linear_system: 'question_first',
  quadratic_equation: 'question_first',
  unknown: 'question_first'
};

const VIDEO_HOOK_STYLES: VideoHookStyle[] = ['mistake_first', 'question_first', 'shortcut_first'];

export const isTeachingPersonaId = (value: string | undefined): value is TeachingPersonaId => {
  return Boolean(value && value in TEACHING_PERSONAS);
};

export const isVideoHookStyle = (value: string | undefined): value is VideoHookStyle => {
  return Boolean(value && VIDEO_HOOK_STYLES.includes(value as VideoHookStyle));
};

const cleanNote = (note?: string) => {
  if (!note) {
    return '';
  }

  return note
    .replace(/语义提示：[^。！？]*[。！？]?\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const simplifyLatexForSpeech = (latex?: string) => {
  if (!latex) {
    return '当前这一步';
  }

  return latex
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\sqrt/g, '根号')
    .replace(/\\le/g, '小于等于')
    .replace(/\\ge/g, '大于等于')
    .replace(/\\cup/g, '并')
    .replace(/\\div/g, '除以')
    .replace(/[{}]/g, '')
    .trim();
};

const sentence = (text: string) => {
  const normalized = text.trim().replace(/[。！？!?.]+$/g, '');
  return normalized ? `${normalized}。` : '这一步继续往下推。';
};

const inferFamilyFromProblem = (problem: AlgebraProblem): TeachingScriptFamily => {
  const normalizedEquation = problem.equation.replace(/\s+/g, '');

  if (normalizedEquation.includes(',')) {
    return 'linear_system';
  }

  if (/x\^2/.test(normalizedEquation)) {
    return 'quadratic_equation';
  }

  if (/(<=|>=|<|>)/.test(normalizedEquation)) {
    return normalizedEquation.includes('/') ? 'fraction_inequality' : 'linear_inequality';
  }

  if (normalizedEquation.includes('/')) {
    return 'fraction_equation';
  }

  if (/x/.test(normalizedEquation)) {
    return 'linear_equation';
  }

  return 'unknown';
};

const findStepByOperation = (problem: AlgebraProblem, operationTypes: string[]) => {
  return problem.steps.find((step) => {
    const operationType = step.operation?.type;
    return Boolean(operationType && operationTypes.includes(operationType));
  });
};

const buildVideoHook = (
  problem: AlgebraProblem,
  family: TeachingScriptFamily,
  style: VideoHookStyle
): VideoHook | undefined => {
  if (family === 'unknown') {
    return undefined;
  }

  const operationTarget =
    family === 'linear_inequality'
      ? findStepByOperation(problem, ['flip_inequality_sign', 'solve_inequality'])
      : family === 'fraction_equation'
        ? findStepByOperation(problem, ['clear_denominator'])
        : family === 'fraction_inequality'
          ? findStepByOperation(problem, ['state_domain_restriction', 'analyze_sign_interval'])
          : family === 'quadratic_equation'
            ? findStepByOperation(problem, ['classify_root_count', 'collect_solution_branches'])
            : family === 'linear_system'
              ? findStepByOperation(problem, ['classify_system_result', 'collect_system_solution'])
              : problem.steps[0];

  const hookTextByStyle: Record<VideoHookStyle, string> =
    family === 'linear_inequality'
      ? {
          mistake_first: '90%的人都会错在变号。',
          question_first: '先别急着同除，先看系数正负。',
          shortcut_first: '这一步能省一半时间：先判断不等号会不会反向。'
        }
      : family === 'fraction_equation'
        ? {
            mistake_first: '90%的人分式题会先算错分母。',
            question_first: '先别急着移项，先把分母处理掉。',
            shortcut_first: '这一步能省一半时间：先去分母。'
          }
        : family === 'fraction_inequality'
          ? {
              mistake_first: '90%的人会漏定义域，答案直接错。',
              question_first: '先别急着解，分母限制先写。',
              shortcut_first: '这题3秒入口：定义域和临界点先锁住。'
            }
          : family === 'quadratic_equation'
            ? {
                mistake_first: '你一定会在解的个数这里翻车。',
                question_first: '先别急着套公式，先看判别式。',
                shortcut_first: '这一步能省一半时间：先判几个解。'
              }
            : family === 'linear_system'
              ? {
                  mistake_first: '90%的人会把方程组答案写散。',
                  question_first: '先别急着算，先找消元口。',
                  shortcut_first: '这题3秒入口：先把两个方程压成一个。'
                }
              : {
                  mistake_first: '90%的人都会错在这一步。',
                  question_first: '别急着移项，先看哪一步最省。',
                  shortcut_first: '这题3秒就能做完，先抓最短变形。'
                };

  return {
    style,
    ...(operationTarget ? {targetStepId: operationTarget.id} : {}),
    text: hookTextByStyle[style]
  };
};

const inferGenericNarration = (step: AlgebraStep) => {
  const note = cleanNote(step.note);

  if (note) {
    if (/^(先|把|注意|最后|接下来|再|这里|已经|现在)/.test(note)) {
      return sentence(note);
    }

    return sentence(`这一步${note}`);
  }

  if (step.kind === 'answer') {
    return sentence(`这一步得到最终结果 ${simplifyLatexForSpeech(step.latex ?? step.expression)}`);
  }

  return sentence(`把式子整理成 ${simplifyLatexForSpeech(step.latex ?? step.expression)}`);
};

const inferGenericEmphasis = (step: AlgebraStep) => {
  const note = cleanNote(step.note);

  if (step.kind === 'answer') {
    return '答案落定';
  }

  if (note.includes('定义域')) {
    return '先看定义域';
  }

  if (note.includes('区间')) {
    return '按区间判断';
  }

  if (note.includes('代入')) {
    return '先化成一元';
  }

  if (note.includes('展开')) {
    return '展开后再化简';
  }

  if (note.includes('化简') || note.includes('整理')) {
    return '先整理式子';
  }

  return undefined;
};

const inferGenericWarning = (step: AlgebraStep) => {
  const note = cleanNote(step.note);

  if (note.includes('定义域')) {
    return '不要忘记排除让分母为 0 的值。';
  }

  if (note.includes('区间')) {
    return '区间一多就容易漏掉端点或漏掉某一段。';
  }

  return undefined;
};

const inferGenericMemoryTip = (step: AlgebraStep) => {
  if (step.operation?.type === 'solve_single_variable_equation') {
    return '先化简，再把未知数单独留下来。';
  }

  if (step.operation?.type === 'combine_like_terms') {
    return '看到同类项，先合并再继续。';
  }

  if (step.operation?.type === 'extract_square_root') {
    return '开平方时别忘了正负两个分支。';
  }

  return undefined;
};

const inferGenericPacing = (step: AlgebraStep): TeachingScriptStep['pacingHint'] => {
  if (step.kind === 'answer') {
    return 'pause';
  }

  if (step.operation?.type === 'write_equation') {
    return 'fast';
  }

  return 'normal';
};

const stripSentenceEnding = (text: string) => {
  return text.trim().replace(/[。！？!?.]+$/g, '');
};

const rewriteNarrationByPersona = (
  narration: string,
  step: AlgebraStep,
  family: TeachingScriptFamily,
  personaId: TeachingPersonaId
) => {
  const base = stripSentenceEnding(narration);

  if (personaId === 'calm_teacher') {
    return narration;
  }

  if (personaId === 'strict_teacher') {
    if (step.operation?.type === 'flip_inequality_sign') {
      return '这一步必须盯住：除以负数，不等号立刻反向。';
    }

    if (step.operation?.type === 'state_domain_restriction') {
      return '定义域先写，不先排除分母为 0，后面全白算。';
    }

    if (step.operation?.type === 'analyze_sign_interval') {
      return '区间一个都不能漏，漏一段答案就不完整。';
    }

    if (step.operation?.type === 'collect_system_solution' || step.operation?.type === 'state_no_solution' || step.operation?.type === 'state_infinite_solutions') {
      return `最后的结论必须写完整，${base}。`;
    }

    return `注意，${base}，这一步别错。`;
  }

  if (step.operation?.type === 'clear_denominator') {
    return '考场里遇到分式题，先把分母一起处理掉，后面会快很多。';
  }

  if (step.operation?.type === 'classify_root_count') {
    return '先看判别式，马上判断有几个解，再决定后面怎么走。';
  }

  if (step.operation?.type === 'collect_solution_branches') {
    return '把两个分支一次汇总，答案就能稳稳拿到。';
  }

  if (step.operation?.type === 'collect_system_solution') {
    return '把两个变量配成一组，考场上答案要一次写完整。';
  }

  if (step.operation?.type === 'state_domain_restriction' || family === 'fraction_inequality') {
    return `考场里，${base}，这样更容易少丢分。`;
  }

  return `考场里，${base}，这样推进更快。`;
};

const buildTeachingScriptStep = (
  step: AlgebraStep,
  family: TeachingScriptFamily,
  personaId: TeachingPersonaId
): TeachingScriptStep => {
  const specialRule = step.operation?.type ? SPECIAL_STEP_RULES[step.operation.type] : undefined;
  const kindRule = STEP_KIND_FALLBACK_RULES[step.kind];
  const baseNarration = specialRule?.narration ?? kindRule?.narration ?? inferGenericNarration(step);

  return {
    emphasis: specialRule?.emphasis ?? kindRule?.emphasis ?? inferGenericEmphasis(step),
    memoryTip: specialRule?.memoryTip ?? kindRule?.memoryTip ?? inferGenericMemoryTip(step),
    mistakeWarning: specialRule?.mistakeWarning ?? kindRule?.mistakeWarning ?? inferGenericWarning(step),
    narration: rewriteNarrationByPersona(baseNarration, step, family, personaId),
    pacingHint: specialRule?.pacingHint ?? kindRule?.pacingHint ?? inferGenericPacing(step),
    stepId: step.id
  };
};

const buildOutroSummary = (problem: AlgebraProblem, context?: BuildTeachingScriptContext) => {
  if (context?.quality === 'fallback') {
    return '当前先给出一个最小可解释版本，方便先理解题目的边界。';
  }

  if (!problem.answer) {
    return undefined;
  }

  if (problem.answer.includes('无解') || problem.answer.includes('无穷多解') || problem.answer.includes('无实数解')) {
    return sentence(`最后可以判断：${simplifyLatexForSpeech(problem.answer)}`);
  }

  return sentence(`最后答案是：${simplifyLatexForSpeech(problem.answer)}`);
};

export const buildTeachingScriptWithContext = (
  problem: AlgebraProblem,
  context: BuildTeachingScriptContext = {}
): TeachingScript => {
  const family = context.quality === 'fallback' ? 'fallback' : context.family ?? inferFamilyFromProblem(problem);
  const personaId = isTeachingPersonaId(context.personaId) ? context.personaId : DEFAULT_PERSONA_ID;
  const hookStyle = isVideoHookStyle(context.hookStyle) ? context.hookStyle : DEFAULT_HOOK_STYLE_BY_FAMILY[family];

  return {
    hook: buildVideoHook(problem, family, hookStyle),
    introHook: FAMILY_INTRO_HOOKS[family],
    outroSummary: buildOutroSummary(problem, context),
    persona: personaId,
    steps: problem.steps.map((step) => buildTeachingScriptStep(step, family, personaId))
  };
};

export function buildTeachingScript(problem: AlgebraProblem): TeachingScript {
  return buildTeachingScriptWithContext(problem);
}

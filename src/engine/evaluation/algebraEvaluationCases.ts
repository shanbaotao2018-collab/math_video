import type {AlgebraOperationTypeV2} from '../../types/algebra';
import type {
  AlgebraPresentationMode,
  AlgebraPresentationSource,
  AlgebraPresentationStrategyId
} from '../integration/applyAlgebraPresentationStrategy';
import type {AlgebraFamilyId} from '../integration/buildAlgebraProductEntry';
import type {AlgebraQualityTier} from '../integration/inferAlgebraQualityTier';
import type {LessonBuildQuality} from '../integration/lessonBuildStatus';
import type {EmphasisKind, RhythmCueType} from '../render';
import type {TeachingPersonaId, TeachingShotType, VideoHookStyle} from '../teaching';

export type AlgebraEvaluationCase = {
  description: string;
  equation: string;
  expectedAnswer?: string;
  expectedFamily: AlgebraFamilyId;
  expectedMaxStepCount?: number;
  expectedMinStepCount?: number;
  expectedNormalizedEquation?: string;
  expectedOperations?: AlgebraOperationTypeV2[];
  expectedPresentationSource?: AlgebraPresentationSource;
  expectedPresentationStrategy?: AlgebraPresentationStrategyId;
  expectedPublishingPack?: {
    minHashtags?: number;
  };
  expectedHook?: {
    nonEmpty?: boolean;
    style?: VideoHookStyle;
    targetOperation?: AlgebraOperationTypeV2;
  };
  expectedEmphasisPlan?: {
    kinds?: EmphasisKind[];
    minCues?: number;
  };
  expectedRhythmPlan?: {
    hookBeat?: boolean;
    minCues?: number;
    mistakePause?: boolean;
    resultSlow?: boolean;
    types?: RhythmCueType[];
  };
  expectedQuality?: LessonBuildQuality;
  expectedQualityTier?: AlgebraQualityTier;
  expectedShotPlan?: {
    maxShots?: number;
    minShots?: number;
    requiredShotTypes?: TeachingShotType[];
  };
  expectedStepCount?: number;
  expectedSubtitleCuePlan?: {
    minCues?: number;
  };
  expectedTeachingPersona?: {
    id: TeachingPersonaId;
    narrationShouldDiffer?: boolean;
  };
  expectedTeachingScript?: {
    expectedIntroHook?: boolean;
    expectedOutroSummary?: boolean;
    expectedStepIds?: string[];
    minStepScripts?: number;
  };
  expectedVideoRender?: {
    minShots?: number;
    renderable?: boolean;
  };
  expectedVoiceCuePlan?: {
    minCues?: number;
  };
  expectedSupported: boolean;
  includeLesson?: boolean;
  noFallback?: boolean;
  presentationMode?: AlgebraPresentationMode;
  returnReport?: boolean;
  hookStyle?: VideoHookStyle;
  teachingPersona?: TeachingPersonaId;
};

export const ALGEBRA_EVALUATION_CASES: AlgebraEvaluationCase[] = [
  {
    description: '一元一次方程一步除法',
    equation: '2x=8',
    expectedAnswer: 'x=4',
    expectedFamily: 'linear_equation',
    expectedPresentationSource: 'auto',
    expectedPresentationStrategy: 'answer_only',
    expectedQualityTier: 'instant',
    expectedStepCount: 1,
    expectedSupported: true
  },
  {
    description: '一元一次方程基础移项求解',
    equation: '2x+3=7',
    expectedAnswer: 'x=2',
    expectedFamily: 'linear_equation',
    expectedPresentationStrategy: 'compact_steps',
    expectedQualityTier: 'basic',
    expectedShotPlan: {
      maxShots: 3,
      minShots: 3,
      requiredShotTypes: ['write', 'transform', 'answer']
    },
    expectedStepCount: 3,
    expectedSubtitleCuePlan: {
      minCues: 3
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      expectedStepIds: ['s1', 's2', 's5'],
      minStepScripts: 3
    },
    expectedVideoRender: {
      minShots: 3,
      renderable: true
    },
    expectedVoiceCuePlan: {
      minCues: 3
    },
    expectedSupported: true
  },
  {
    description: 'override: 简单线性方程强制完整步骤',
    equation: '2x+3=7',
    expectedAnswer: 'x=2',
    expectedFamily: 'linear_equation',
    expectedPresentationSource: 'override',
    expectedPresentationStrategy: 'full_steps',
    expectedQualityTier: 'basic',
    expectedStepCount: 5,
    expectedSupported: true,
    presentationMode: 'full_steps'
  },
  {
    description: '一元一次方程变量在两边',
    equation: '2x+3=x+7',
    expectedAnswer: 'x=4',
    expectedFamily: 'linear_equation',
    expectedSupported: true
  },
  {
    description: '一元一次不等式基础求解',
    equation: '2x+3>7',
    expectedAnswer: 'x>2',
    expectedFamily: 'linear_inequality',
    expectedHook: {
      nonEmpty: true,
      style: 'mistake_first',
      targetOperation: 'solve_inequality'
    },
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'divide_both_sides', 'solve_inequality'],
    expectedEmphasisPlan: {
      kinds: ['hook', 'rule', 'mistake', 'result'],
      minCues: 6
    },
    expectedRhythmPlan: {
      hookBeat: true,
      minCues: 8,
      mistakePause: true,
      resultSlow: true,
      types: ['beat', 'pause', 'repeat', 'slow', 'speed_up']
    },
    expectedVoiceCuePlan: {
      minCues: 5
    },
    expectedPublishingPack: {
      minHashtags: 2
    },
    expectedPresentationStrategy: 'compact_steps',
    expectedQualityTier: 'basic',
    expectedTeachingPersona: {
      id: 'strict_teacher',
      narrationShouldDiffer: true
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      minStepScripts: 5
    },
    expectedSupported: true,
    hookStyle: 'mistake_first',
    teachingPersona: 'strict_teacher'
  },
  {
    description: '一元一次不等式负系数变号',
    equation: '-2x+3>7',
    expectedAnswer: 'x<-2',
    expectedFamily: 'linear_inequality',
    expectedHook: {
      nonEmpty: true,
      style: 'mistake_first',
      targetOperation: 'flip_inequality_sign'
    },
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'flip_inequality_sign', 'solve_inequality'],
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      minStepScripts: 5
    },
    expectedSupported: true
  },
  {
    description: '分式方程括号分子',
    equation: '(x+1)/2=4',
    expectedAnswer: 'x=7',
    expectedFamily: 'fraction_equation',
    expectedOperations: ['write_equation', 'clear_denominator', 'simplify_expression', 'move_term', 'simplify_expression', 'final_answer'],
    expectedMinStepCount: 6,
    expectedPresentationStrategy: 'full_steps',
    expectedQualityTier: 'standard',
    expectedSupported: true
  },
  {
    description: '分式方程分式和',
    equation: 'x/2+x/3=5',
    expectedAnswer: 'x=6',
    expectedFamily: 'fraction_equation',
    expectedHook: {
      nonEmpty: true,
      style: 'shortcut_first',
      targetOperation: 'clear_denominator'
    },
    expectedOperations: ['write_equation', 'clear_denominator', 'combine_like_terms', 'divide_both_sides', 'final_answer'],
    expectedEmphasisPlan: {
      kinds: ['hook', 'rule', 'mistake', 'result'],
      minCues: 7
    },
    expectedRhythmPlan: {
      hookBeat: true,
      minCues: 8,
      mistakePause: true,
      resultSlow: true,
      types: ['beat', 'pause', 'repeat', 'slow', 'speed_up']
    },
    expectedVoiceCuePlan: {
      minCues: 5
    },
    expectedPublishingPack: {
      minHashtags: 2
    },
    expectedQualityTier: 'standard',
    expectedTeachingPersona: {
      id: 'exam_coach',
      narrationShouldDiffer: true
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      minStepScripts: 5
    },
    expectedSupported: true,
    hookStyle: 'shortcut_first',
    teachingPersona: 'exam_coach'
  },
  {
    description: '分式不等式去分母后求解',
    equation: '(x+1)/2<=4',
    expectedAnswer: 'x\\le7',
    expectedFamily: 'fraction_inequality',
    expectedOperations: ['write_equation', 'state_domain_restriction', 'clear_denominator', 'move_term', 'simplify_expression', 'solve_inequality', 'intersect_solution_set'],
    expectedSupported: true
  },
  {
    description: '标准型分式不等式双临界点',
    equation: '(x-1)/(x+2)>0',
    expectedAnswer: '(-\\infty,-2)\\cup(1,+\\infty)',
    expectedFamily: 'fraction_inequality',
    expectedHook: {
      nonEmpty: true,
      style: 'mistake_first',
      targetOperation: 'state_domain_restriction'
    },
    expectedOperations: ['write_equation', 'state_domain_restriction', 'find_critical_points', 'analyze_sign_interval', 'intersect_solution_set'],
    expectedEmphasisPlan: {
      kinds: ['hook', 'rule', 'mistake', 'result'],
      minCues: 7
    },
    expectedRhythmPlan: {
      hookBeat: true,
      minCues: 8,
      mistakePause: true,
      resultSlow: true,
      types: ['beat', 'pause', 'repeat', 'slow', 'speed_up']
    },
    expectedVoiceCuePlan: {
      minCues: 5
    },
    expectedQualityTier: 'detailed',
    expectedShotPlan: {
      maxShots: 5,
      minShots: 5,
      requiredShotTypes: ['write', 'highlight', 'interval', 'transform']
    },
    expectedSubtitleCuePlan: {
      minCues: 5
    },
    expectedPublishingPack: {
      minHashtags: 2
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      minStepScripts: 5
    },
    expectedTeachingPersona: {
      id: 'strict_teacher',
      narrationShouldDiffer: true
    },
    expectedVideoRender: {
      minShots: 5,
      renderable: true
    },
    expectedSupported: true,
    hookStyle: 'mistake_first',
    teachingPersona: 'strict_teacher'
  },
  {
    description: '二次方程因式分解型',
    equation: 'x^2-5x+6=0',
    expectedAnswer: 'x=2\\text{ 或 }x=3',
    expectedFamily: 'quadratic_equation',
    expectedOperations: ['write_equation', 'factor_quadratic', 'split_into_linear_factors', 'apply_zero_product_rule', 'collect_solution_branches'],
    expectedSupported: true
  },
  {
    description: '二次方程开平方型',
    equation: 'x^2=16',
    expectedAnswer: 'x=-4\\text{ 或 }x=4',
    expectedFamily: 'quadratic_equation',
    expectedOperations: ['write_equation', 'extract_square_root', 'collect_solution_branches'],
    expectedSupported: true
  },
  {
    description: '二次方程求根公式双实根',
    equation: 'x^2-2x-1=0',
    expectedAnswer: 'x=1-\\sqrt{2}\\text{ 或 }x=1+\\sqrt{2}',
    expectedFamily: 'quadratic_equation',
    expectedHook: {
      nonEmpty: true,
      style: 'question_first',
      targetOperation: 'classify_root_count'
    },
    expectedOperations: ['write_equation', 'compute_discriminant', 'classify_root_count', 'apply_quadratic_formula', 'collect_solution_branches'],
    expectedEmphasisPlan: {
      kinds: ['hook', 'rule', 'result'],
      minCues: 7
    },
    expectedRhythmPlan: {
      hookBeat: true,
      minCues: 8,
      resultSlow: true,
      types: ['beat', 'pause', 'slow', 'speed_up']
    },
    expectedPresentationStrategy: 'full_steps',
    expectedQualityTier: 'standard',
    expectedShotPlan: {
      maxShots: 6,
      minShots: 6,
      requiredShotTypes: ['write', 'transform', 'highlight', 'branch', 'answer']
    },
    expectedStepCount: 5,
    expectedSubtitleCuePlan: {
      minCues: 6
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      expectedStepIds: ['s1', 's2', 's3', 's4', 's5'],
      minStepScripts: 5
    },
    expectedTeachingPersona: {
      id: 'exam_coach',
      narrationShouldDiffer: true
    },
    expectedVideoRender: {
      minShots: 6,
      renderable: true
    },
    expectedVoiceCuePlan: {
      minCues: 6
    },
    expectedPublishingPack: {
      minHashtags: 2
    },
    expectedSupported: true,
    hookStyle: 'question_first',
    teachingPersona: 'exam_coach'
  },
  {
    description: '二次方程无实数解',
    equation: 'x^2+2x+5=0',
    expectedAnswer: '\\text{无实数解}',
    expectedFamily: 'quadratic_equation',
    expectedOperations: ['write_equation', 'compute_discriminant', 'classify_root_count', 'state_no_real_solution'],
    expectedSupported: true
  },
  {
    description: '方程组代入法唯一解',
    equation: 'x+y=5, x-y=1',
    expectedAnswer: '(x,y)=(3,2)',
    expectedFamily: 'linear_system',
    expectedHook: {
      nonEmpty: true,
      style: 'question_first',
      targetOperation: 'collect_system_solution'
    },
    expectedOperations: ['write_equation', 'rewrite_equation_for_substitution', 'substitute_expression', 'solve_single_variable_equation', 'back_substitute_solution', 'collect_system_solution'],
    expectedEmphasisPlan: {
      kinds: ['hook', 'rule', 'result'],
      minCues: 7
    },
    expectedRhythmPlan: {
      hookBeat: true,
      minCues: 8,
      resultSlow: true,
      types: ['beat', 'pause', 'slow', 'speed_up']
    },
    expectedMinStepCount: 7,
    expectedPresentationStrategy: 'semantic_full_steps',
    expectedQualityTier: 'detailed',
    expectedShotPlan: {
      minShots: 7,
      requiredShotTypes: ['write', 'highlight', 'substitute', 'transform', 'answer']
    },
    expectedSubtitleCuePlan: {
      minCues: 10
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      expectedStepIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'],
      minStepScripts: 7
    },
    expectedTeachingPersona: {
      id: 'calm_teacher'
    },
    expectedVideoRender: {
      minShots: 10,
      renderable: true
    },
    expectedVoiceCuePlan: {
      minCues: 10
    },
    expectedPublishingPack: {
      minHashtags: 2
    },
    expectedSupported: true,
    hookStyle: 'question_first',
    teachingPersona: 'calm_teacher'
  },
  {
    description: 'override: 方程组强制只看答案',
    equation: 'x+y=5, x-y=1',
    expectedAnswer: '(x,y)=(3,2)',
    expectedFamily: 'linear_system',
    expectedPresentationSource: 'override',
    expectedPresentationStrategy: 'answer_only',
    expectedQualityTier: 'detailed',
    expectedStepCount: 1,
    expectedSupported: true,
    presentationMode: 'answer_only'
  },
  {
    description: '方程组消元法唯一解',
    equation: '2x+y=7, 2x-y=1',
    expectedAnswer: '(x,y)=(2,3)',
    expectedFamily: 'linear_system',
    expectedOperations: ['write_equation', 'eliminate_variable', 'solve_single_variable_equation', 'back_substitute_solution', 'collect_system_solution'],
    expectedSupported: true
  },
  {
    description: '方程组无解分类',
    equation: 'x+y=2, x+y=5',
    expectedAnswer: '\\text{无解}',
    expectedFamily: 'linear_system',
    expectedHook: {
      nonEmpty: true,
      style: 'mistake_first',
      targetOperation: 'classify_system_result'
    },
    expectedOperations: ['write_equation', 'eliminate_variable', 'classify_system_result', 'state_no_solution'],
    expectedEmphasisPlan: {
      kinds: ['hook', 'rule', 'result'],
      minCues: 5
    },
    expectedRhythmPlan: {
      hookBeat: true,
      minCues: 6,
      resultSlow: true,
      types: ['beat', 'pause', 'slow', 'speed_up']
    },
    expectedTeachingPersona: {
      id: 'strict_teacher',
      narrationShouldDiffer: true
    },
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      minStepScripts: 4
    },
    expectedSupported: true,
    hookStyle: 'mistake_first',
    teachingPersona: 'strict_teacher'
  },
  {
    description: '方程组无穷多解分类',
    equation: 'x+y=2, 2x+2y=4',
    expectedAnswer: '\\text{无穷多解}',
    expectedFamily: 'linear_system',
    expectedOperations: ['write_equation', 'eliminate_variable', 'classify_system_result', 'state_infinite_solutions'],
    expectedSupported: true
  },
  {
    description: 'robustness: 多余空格的一元一次方程',
    equation: '  X + 3 = 7  ',
    expectedAnswer: 'x=4',
    expectedFamily: 'linear_equation',
    expectedNormalizedEquation: 'x+3=7',
    expectedSupported: true
  },
  {
    description: 'robustness: 逗号分隔方程组含多余空格',
    equation: 'x + y = 5 , x - y = 1',
    expectedAnswer: '(x,y)=(3,2)',
    expectedFamily: 'linear_system',
    expectedNormalizedEquation: 'x+y=5,x-y=1',
    expectedSupported: true
  },
  {
    description: 'robustness: 分号分隔方程组',
    equation: 'x+y=5; x-y=1',
    expectedAnswer: '(x,y)=(3,2)',
    expectedFamily: 'linear_system',
    expectedNormalizedEquation: 'x+y=5,x-y=1',
    expectedSupported: true
  },
  {
    description: 'robustness: 空格分隔方程组',
    equation: 'x + y = 5 x - y = 1',
    expectedAnswer: '(x,y)=(3,2)',
    expectedFamily: 'linear_system',
    expectedNormalizedEquation: 'x+y=5,x-y=1',
    expectedSupported: true
  },
  {
    description: 'robustness: 小于等于符号与大小写变量',
    equation: '(X + 1) / 2 ≤ 4',
    expectedAnswer: 'x\\le7',
    expectedFamily: 'fraction_inequality',
    expectedNormalizedEquation: '(x+1)/2<=4',
    expectedOperations: ['write_equation', 'state_domain_restriction', 'clear_denominator', 'move_term', 'simplify_expression', 'solve_inequality', 'intersect_solution_set'],
    expectedPresentationStrategy: 'semantic_full_steps',
    expectedQualityTier: 'detailed',
    expectedSupported: true
  },
  {
    description: 'robustness: 大于等于符号',
    equation: '2X + 3 ≥ 7',
    expectedAnswer: 'x\\ge2',
    expectedFamily: 'linear_inequality',
    expectedNormalizedEquation: '2x+3>=7',
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'divide_both_sides', 'solve_inequality'],
    expectedSupported: true
  },
  {
    description: 'robustness: 中文标点和大小写方程组',
    equation: 'X + Y = 5， X - Y = 1。',
    expectedAnswer: '(x,y)=(3,2)',
    expectedFamily: 'linear_system',
    expectedNormalizedEquation: 'x+y=5,x-y=1',
    expectedSupported: true
  },
  {
    description: 'robustness: 简单中文文本包裹二次方程',
    equation: '解方程 x^2 - 2x - 1 = 0',
    expectedAnswer: 'x=1-\\sqrt{2}\\text{ 或 }x=1+\\sqrt{2}',
    expectedFamily: 'quadratic_equation',
    expectedNormalizedEquation: 'x^2-2x-1=0',
    expectedOperations: ['write_equation', 'compute_discriminant', 'classify_root_count', 'apply_quadratic_formula', 'collect_solution_branches'],
    expectedSupported: true
  },
  {
    description: 'robustness: 分式和空格标准化',
    equation: 'x / 2 + x / 3 = 5',
    expectedAnswer: 'x=6',
    expectedFamily: 'fraction_equation',
    expectedNormalizedEquation: 'x/2+x/3=5',
    expectedOperations: ['write_equation', 'clear_denominator', 'combine_like_terms', 'divide_both_sides', 'final_answer'],
    expectedSupported: true
  },
  {
    description: '不支持样例走 fallback',
    equation: 'x/(-2)+3=7',
    expectedFamily: 'fraction_equation',
    expectedQuality: 'fallback',
    expectedTeachingScript: {
      expectedIntroHook: true,
      expectedOutroSummary: true,
      expectedStepIds: ['fallback-s1'],
      minStepScripts: 1
    },
    expectedSupported: false
  },
  {
    description: 'override: fallback 质量不受展示模式影响',
    equation: 'x/(-2)+3=7',
    expectedFamily: 'fraction_equation',
    expectedPresentationSource: 'override',
    expectedPresentationStrategy: 'answer_only',
    expectedQuality: 'fallback',
    expectedStepCount: 1,
    expectedSupported: false,
    presentationMode: 'answer_only'
  },
  {
    description: '不支持样例关闭 fallback 后返回 unsupported',
    equation: 'x/(-2)+3=7',
    expectedFamily: 'fraction_equation',
    expectedQuality: 'unsupported',
    expectedSupported: false,
    noFallback: true
  },
  {
    description: 'override: unsupported 质量不受展示模式影响',
    equation: 'x/(-2)+3=7',
    expectedFamily: 'fraction_equation',
    expectedPresentationSource: 'override',
    expectedPresentationStrategy: 'semantic_full_steps',
    expectedQuality: 'unsupported',
    expectedStepCount: 0,
    expectedTeachingScript: {
      expectedIntroHook: false,
      expectedOutroSummary: false,
      minStepScripts: 0
    },
    expectedSubtitleCuePlan: {
      minCues: 0
    },
    expectedVideoRender: {
      minShots: 0,
      renderable: false
    },
    expectedVoiceCuePlan: {
      minCues: 0
    },
    expectedSupported: false,
    noFallback: true,
    presentationMode: 'semantic_full_steps'
  }
];

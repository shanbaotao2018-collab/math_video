import type {AlgebraFamilyId} from './buildAlgebraProductEntry';
import type {AlgebraPresentationMode} from './applyAlgebraPresentationStrategy';
import {ALGEBRA_CHANGE_SUMMARY, ALGEBRA_CONTRACT_VERSIONS, type AlgebraChangeSummary, type AlgebraContractVersions} from './algebraChangeManagement';

export const ALGEBRA_CONTENT_PACK_SCHEMA_VERSION = 'algebra-content-pack-v1';

export type AlgebraContentExample = {
  difficulty?: 'basic' | 'detailed' | 'standard';
  equation: string;
  family: Exclude<AlgebraFamilyId, 'unknown'>;
  id: string;
  label: string;
  qa?: AlgebraDemoQaExpectation;
  recommendedPresentationMode?: AlgebraPresentationMode;
  tags?: string[];
};

export type AlgebraDemoQaExpectation = {
  expectedFamily: Exclude<AlgebraFamilyId, 'unknown'>;
  expectedRenderable: boolean;
  expectedSupported: boolean;
  recommendedPresentationModeAvailable?: boolean;
  stepCountRange: {
    max: number;
    min: number;
  };
};

export type AlgebraContentPackSectionId =
  | 'featured_examples'
  | 'teaching_examples'
  | 'edge_cases'
  | 'unsupported_examples';

export type AlgebraContentPackSection = {
  examples: AlgebraContentExample[];
  id: AlgebraContentPackSectionId;
  label: string;
  summary: string;
};

export type AlgebraContentPack = {
  categories: AlgebraContentPackSection[];
  changeSummary: AlgebraChangeSummary;
  featured_examples: AlgebraContentExample[];
  schemaVersion: typeof ALGEBRA_CONTENT_PACK_SCHEMA_VERSION;
  teaching_examples: AlgebraContentExample[];
  unsupported_examples: AlgebraContentExample[];
  edge_cases: AlgebraContentExample[];
  versions: AlgebraContractVersions;
};

const FEATURED_EXAMPLES: AlgebraContentExample[] = [
  {
    difficulty: 'basic',
    equation: '2(x+3)=14',
    family: 'linear_equation',
    id: 'featured-linear-distribute',
    label: '展开括号的一元一次方程',
    qa: {
      expectedFamily: 'linear_equation',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 3, max: 3}
    },
    recommendedPresentationMode: 'compact_steps',
    tags: ['featured', 'distribution', 'starter']
  },
  {
    difficulty: 'detailed',
    equation: 'x+y=5, x-y=1',
    family: 'linear_system',
    id: 'featured-linear-system-substitution',
    label: '方程组代入法演示题',
    qa: {
      expectedFamily: 'linear_system',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 7, max: 12}
    },
    recommendedPresentationMode: 'semantic_full_steps',
    tags: ['featured', 'system', 'substitution']
  },
  {
    difficulty: 'standard',
    equation: 'x^2-2x-1=0',
    family: 'quadratic_equation',
    id: 'featured-quadratic-formula',
    label: '求根公式演示题',
    qa: {
      expectedFamily: 'quadratic_equation',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 5, max: 5}
    },
    recommendedPresentationMode: 'full_steps',
    tags: ['featured', 'quadratic', 'formula']
  }
];

const TEACHING_EXAMPLES: AlgebraContentExample[] = [
  {
    difficulty: 'basic',
    equation: '2x+3=7',
    family: 'linear_equation',
    id: 'teaching-linear-basic',
    label: '基础移项方程',
    qa: {
      expectedFamily: 'linear_equation',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 3, max: 3}
    },
    recommendedPresentationMode: 'compact_steps',
    tags: ['teaching', 'move_term']
  },
  {
    difficulty: 'basic',
    equation: '-2x+3>7',
    family: 'linear_inequality',
    id: 'teaching-linear-inequality-sign-flip',
    label: '含变号的一次不等式',
    qa: {
      expectedFamily: 'linear_inequality',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 5, max: 6}
    },
    recommendedPresentationMode: 'compact_steps',
    tags: ['teaching', 'inequality', 'sign_flip']
  },
  {
    difficulty: 'standard',
    equation: 'x/2+x/3=5',
    family: 'fraction_equation',
    id: 'teaching-fraction-sum',
    label: '多分式求和方程',
    qa: {
      expectedFamily: 'fraction_equation',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 5, max: 7}
    },
    recommendedPresentationMode: 'full_steps',
    tags: ['teaching', 'fraction', 'clear_denominator']
  },
  {
    difficulty: 'detailed',
    equation: '(x-1)/(x+2)>0',
    family: 'fraction_inequality',
    id: 'teaching-rational-inequality',
    label: '标准分式不等式',
    qa: {
      expectedFamily: 'fraction_inequality',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 5, max: 8}
    },
    recommendedPresentationMode: 'semantic_full_steps',
    tags: ['teaching', 'domain', 'interval_analysis']
  },
  {
    difficulty: 'standard',
    equation: 'x^2-5x+6=0',
    family: 'quadratic_equation',
    id: 'teaching-quadratic-factorable',
    label: '可因式分解的二次方程',
    qa: {
      expectedFamily: 'quadratic_equation',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 5, max: 5}
    },
    recommendedPresentationMode: 'full_steps',
    tags: ['teaching', 'quadratic', 'factor']
  }
];

const EDGE_CASES: AlgebraContentExample[] = [
  {
    difficulty: 'detailed',
    equation: 'x+y=2, x+y=5',
    family: 'linear_system',
    id: 'edge-system-no-solution',
    label: '方程组无解边界题',
    qa: {
      expectedFamily: 'linear_system',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 4, max: 8}
    },
    recommendedPresentationMode: 'semantic_full_steps',
    tags: ['edge', 'no_solution', 'classification']
  },
  {
    difficulty: 'detailed',
    equation: 'x+y=2, 2x+2y=4',
    family: 'linear_system',
    id: 'edge-system-infinite-solutions',
    label: '方程组无穷多解边界题',
    qa: {
      expectedFamily: 'linear_system',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 4, max: 8}
    },
    recommendedPresentationMode: 'semantic_full_steps',
    tags: ['edge', 'infinite_solutions', 'classification']
  },
  {
    difficulty: 'standard',
    equation: 'x^2+2x+5=0',
    family: 'quadratic_equation',
    id: 'edge-quadratic-no-real-root',
    label: '无实数解的二次方程',
    qa: {
      expectedFamily: 'quadratic_equation',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 4, max: 4}
    },
    recommendedPresentationMode: 'full_steps',
    tags: ['edge', 'quadratic', 'no_real_root']
  },
  {
    difficulty: 'detailed',
    equation: '1/(x+2)>0',
    family: 'fraction_inequality',
    id: 'edge-rational-domain',
    label: '只看定义域和符号的分式不等式',
    qa: {
      expectedFamily: 'fraction_inequality',
      expectedRenderable: true,
      expectedSupported: true,
      recommendedPresentationModeAvailable: true,
      stepCountRange: {min: 4, max: 7}
    },
    recommendedPresentationMode: 'semantic_full_steps',
    tags: ['edge', 'domain', 'critical_points']
  }
];

const UNSUPPORTED_EXAMPLES: AlgebraContentExample[] = [
  {
    equation: '2.5x+3=7',
    family: 'linear_equation',
    id: 'unsupported-linear-decimal-coefficient',
    label: '小数系数一次方程',
    qa: {
      expectedFamily: 'linear_equation',
      expectedRenderable: true,
      expectedSupported: false,
      stepCountRange: {min: 1, max: 3}
    },
    tags: ['unsupported', 'fallback', 'decimal_coefficient']
  },
  {
    equation: '2x+3>=y',
    family: 'linear_inequality',
    id: 'unsupported-inequality-non-single-variable',
    label: '含额外变量的一次不等式',
    qa: {
      expectedFamily: 'linear_inequality',
      expectedRenderable: true,
      expectedSupported: false,
      stepCountRange: {min: 1, max: 3}
    },
    tags: ['unsupported', 'fallback', 'multi_variable']
  },
  {
    equation: 'x/(-2)+3=7',
    family: 'fraction_equation',
    id: 'unsupported-fraction-negative-denominator',
    label: '负分母分式方程',
    qa: {
      expectedFamily: 'fraction_equation',
      expectedRenderable: true,
      expectedSupported: false,
      stepCountRange: {min: 1, max: 3}
    },
    tags: ['unsupported', 'fallback', 'negative_denominator']
  },
  {
    equation: '(x-1)(x+1)/(x+2)>0',
    family: 'fraction_inequality',
    id: 'unsupported-rational-quadratic-numerator',
    label: '双一次因式分子分式不等式',
    qa: {
      expectedFamily: 'fraction_inequality',
      expectedRenderable: true,
      expectedSupported: false,
      stepCountRange: {min: 1, max: 3}
    },
    tags: ['unsupported', 'fallback', 'multi_linear_numerator']
  },
  {
    equation: 'x+y+z=3, x-y=1',
    family: 'linear_system',
    id: 'unsupported-linear-system-three-variables',
    label: '三元方程组',
    qa: {
      expectedFamily: 'linear_system',
      expectedRenderable: true,
      expectedSupported: false,
      stepCountRange: {min: 1, max: 3}
    },
    tags: ['unsupported', 'fallback', 'three_variables']
  },
  {
    equation: 'x^2+2xy+1=0',
    family: 'quadratic_equation',
    id: 'unsupported-quadratic-two-variables',
    label: '含 xy 的二次方程',
    qa: {
      expectedFamily: 'quadratic_equation',
      expectedRenderable: true,
      expectedSupported: false,
      stepCountRange: {min: 1, max: 3}
    },
    tags: ['unsupported', 'fallback', 'two_variables']
  }
];

const CONTENT_PACK_CATEGORIES: AlgebraContentPackSection[] = [
  {
    examples: FEATURED_EXAMPLES,
    id: 'featured_examples',
    label: 'Featured Examples',
    summary: '优先用于 Web Demo、对外演示和首屏体验的代表题。'
  },
  {
    examples: TEACHING_EXAMPLES,
    id: 'teaching_examples',
    label: 'Teaching Examples',
    summary: '适合展示当前教学链路和 presentationMode 差异的标准题。'
  },
  {
    examples: EDGE_CASES,
    id: 'edge_cases',
    label: 'Edge Cases',
    summary: '用于演示分类结果、特殊解集和教学边界的边界题。'
  },
  {
    examples: UNSUPPORTED_EXAMPLES,
    id: 'unsupported_examples',
    label: 'Unsupported Examples',
    summary: '用于说明 fallback/unsupported 行为的正式不支持样例。'
  }
];

export const ALGEBRA_OFFICIAL_CONTENT_PACK: AlgebraContentPack = {
  categories: CONTENT_PACK_CATEGORIES,
  changeSummary: ALGEBRA_CHANGE_SUMMARY,
  edge_cases: EDGE_CASES,
  featured_examples: FEATURED_EXAMPLES,
  schemaVersion: ALGEBRA_CONTENT_PACK_SCHEMA_VERSION,
  teaching_examples: TEACHING_EXAMPLES,
  unsupported_examples: UNSUPPORTED_EXAMPLES,
  versions: ALGEBRA_CONTRACT_VERSIONS
};

export const getAlgebraOfficialContentPack = () => ALGEBRA_OFFICIAL_CONTENT_PACK;

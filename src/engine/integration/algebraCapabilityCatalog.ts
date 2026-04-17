import type {AlgebraFamilyId} from './buildAlgebraProductEntry';
import type {AlgebraPresentationMode} from './applyAlgebraPresentationStrategy';
import type {AlgebraQualityTier} from './inferAlgebraQualityTier';
import {
  ALGEBRA_CAPABILITY_CATALOG_SCHEMA_VERSION,
  ALGEBRA_CHANGE_SUMMARY,
  ALGEBRA_CONTRACT_VERSIONS,
  type AlgebraChangeSummary,
  type AlgebraContractVersions
} from './algebraChangeManagement';

export type AlgebraCapabilityShape = {
  examples: string[];
  id: string;
  label: string;
  notes?: string;
};

export type AlgebraCapabilityBoundary = {
  behavior: 'fallback' | 'unsupported';
  example: string;
  reason: string;
};

export type AlgebraCapabilityResult = {
  examples: string[];
  format: string;
  kind:
    | 'equation_answer'
    | 'inequality_answer'
    | 'interval_solution_set'
    | 'system_solution'
    | 'two_root_result';
};

export type AlgebraCapabilityRecommendation = {
  presentationMode: AlgebraPresentationMode;
  qualityTier: AlgebraQualityTier;
  why: string;
};

export type AlgebraCapabilityFamily = {
  boundaries: AlgebraCapabilityBoundary[];
  currentResult: AlgebraCapabilityResult;
  family: Exclude<AlgebraFamilyId, 'unknown'>;
  label: string;
  recommendation: AlgebraCapabilityRecommendation;
  recommendedPresentationMode: AlgebraPresentationMode;
  recommendedQualityTier: AlgebraQualityTier;
  resultShape: string;
  supportedShapes: AlgebraCapabilityShape[];
};

export type AlgebraCapabilityCatalog = {
  boundaries: {
    fallback: {
      behavior: string;
      when: string;
    };
    unsupported: {
      behavior: string;
      when: string;
    };
  };
  changeSummary: AlgebraChangeSummary;
  families: AlgebraCapabilityFamily[];
  presentationModes: {
    id: AlgebraPresentationMode;
    label: string;
    source: 'auto' | 'override';
  }[];
  qualityTiers: {
    id: AlgebraQualityTier;
    label: string;
  }[];
  schemaVersion: typeof ALGEBRA_CAPABILITY_CATALOG_SCHEMA_VERSION;
  versions: AlgebraContractVersions;
};

export const ALGEBRA_CAPABILITY_CATALOG: AlgebraCapabilityCatalog = {
  boundaries: {
    fallback: {
      behavior: '返回可渲染的 fallback problem，保留原题、边界原因和当前无法自动展开的说明。',
      when: '默认 fallbackOnUnsupported=true。'
    },
    unsupported: {
      behavior: '返回 supported=false 和 quality=unsupported，通常不包含 problem/lesson。',
      when: 'fallbackOnUnsupported=false 或 CLI 使用 --no-fallback。'
    }
  },
  changeSummary: ALGEBRA_CHANGE_SUMMARY,
  families: [
    {
      boundaries: [
        {
          behavior: 'fallback',
          example: '2.5x+3=7',
          reason: '当前一元一次方程只支持整数系数试点形态。'
        }
      ],
      currentResult: {
        examples: ['x=4', 'x=-2'],
        format: '单变量方程最终解',
        kind: 'equation_answer'
      },
      family: 'linear_equation',
      label: '一元一次方程',
      recommendation: {
        presentationMode: 'compact_steps',
        qualityTier: 'basic',
        why: '当前链路对基础线性方程已经能稳定给出关键步骤，适合精简展示。'
      },
      recommendedPresentationMode: 'compact_steps',
      recommendedQualityTier: 'basic',
      resultShape: '返回 x=... 的单变量答案，步骤包含写题、移项/化简、同除和最终答案。',
      supportedShapes: [
        {
          examples: ['2x=8'],
          id: 'linear',
          label: '一步一次方程',
          notes: '一步同除可被归为 instant。'
        },
        {
          examples: ['2x+3=7', '2x+3=x+7'],
          id: 'linear-with-constant / variables-both-sides',
          label: '带常数项 / 两边含未知数'
        },
        {
          examples: ['2(x+3)=14', '2(x+3)+4=18', '2(x+1)+3(x+2)=13'],
          id: 'distributed / distributed-with-constant / multi-distributed',
          label: '展开括号链路'
        }
      ]
    },
    {
      boundaries: [
        {
          behavior: 'fallback',
          example: '2x+3>=y',
          reason: '当前一元一次不等式只支持单变量 x 和整数右端。'
        }
      ],
      currentResult: {
        examples: ['x>2', 'x<=-3'],
        format: '单变量不等式结果',
        kind: 'inequality_answer'
      },
      family: 'linear_inequality',
      label: '一元一次不等式',
      recommendation: {
        presentationMode: 'compact_steps',
        qualityTier: 'basic',
        why: '当前不等式主链路稳定，重点在保留变号和关键移项。'
      },
      recommendedPresentationMode: 'compact_steps',
      recommendedQualityTier: 'basic',
      resultShape: '返回 x relation value 的不等式答案，负系数同除时会保留变号语义。',
      supportedShapes: [
        {
          examples: ['2x+3>7', '-2x+3>7'],
          id: 'linear-inequality',
          label: '基础一次不等式'
        },
        {
          examples: ['2(x+3)<=14'],
          id: 'distributed-inequality',
          label: '含括号不等式'
        }
      ]
    },
    {
      boundaries: [
        {
          behavior: 'fallback',
          example: 'x/(-2)+3=7',
          reason: '负分母分式方程暂不在自动推导支持范围。'
        }
      ],
      currentResult: {
        examples: ['x=8', 'x=6'],
        format: '去分母后的单变量方程答案',
        kind: 'equation_answer'
      },
      family: 'fraction_equation',
      label: '分式方程',
      recommendation: {
        presentationMode: 'full_steps',
        qualityTier: 'standard',
        why: '分式方程需要显式呈现去分母和化简过程，完整流程更清晰。'
      },
      recommendedPresentationMode: 'full_steps',
      recommendedQualityTier: 'standard',
      resultShape: '返回 x=... 的答案，步骤通常包含去分母、合并同类项、移项或同除。',
      supportedShapes: [
        {
          examples: ['x/2+3=7', '(x+1)/2=4'],
          id: 'fraction-with-constant / bracket-fraction',
          label: '单分式 + 常数 / 括号分子'
        },
        {
          examples: ['x/2+x/3=5'],
          id: 'fraction-sum',
          label: '多分式求和'
        }
      ]
    },
    {
      boundaries: [
        {
          behavior: 'fallback',
          example: '(x^2-1)/(x+2)>0',
          reason: '当前只支持单线性分子/分母的分式不等式试点形态。'
        }
      ],
      currentResult: {
        examples: ['x<-1 或 x>2', '(-2, 1]'],
        format: '区间或并集形式的解集',
        kind: 'interval_solution_set'
      },
      family: 'fraction_inequality',
      label: '分式不等式',
      recommendation: {
        presentationMode: 'semantic_full_steps',
        qualityTier: 'detailed',
        why: '定义域、临界点和区间分析都需要显式讲清楚，适合详细语义展示。'
      },
      recommendedPresentationMode: 'semantic_full_steps',
      recommendedQualityTier: 'detailed',
      resultShape: '返回区间或不等式解集，步骤强调定义域、临界点、区间符号和解集交集。',
      supportedShapes: [
        {
          examples: ['(x+1)/2<=4', 'x/2+3>=7'],
          id: 'bracket-fraction-inequality / fraction-inequality-with-constant',
          label: '分式不等式基础形态'
        },
        {
          examples: ['1/(x+2)>0', 'x/(x+2)<=1', '(x-1)/(x+2)>0'],
          id: 'reciprocal-variable-denominator-inequality / fraction-variable-denominator-inequality / standard-rational-inequality',
          label: '变分母与标准有理不等式'
        }
      ]
    },
    {
      boundaries: [
        {
          behavior: 'fallback',
          example: 'x+y+z=3, x-y=1',
          reason: '当前方程组只覆盖二元一次试点形态。'
        }
      ],
      currentResult: {
        examples: ['(x, y) = (3, 2)', '无解', '无穷多解'],
        format: '方程组分类结果',
        kind: 'system_solution'
      },
      family: 'linear_system',
      label: '二元一次方程组',
      recommendation: {
        presentationMode: 'semantic_full_steps',
        qualityTier: 'detailed',
        why: '代入、消元、回代和结果分类都需要完整步骤，否则信息损失明显。'
      },
      recommendedPresentationMode: 'semantic_full_steps',
      recommendedQualityTier: 'detailed',
      resultShape: '返回唯一解有序数对、无解或无穷多解，步骤包含代入/消元/分类/回代。',
      supportedShapes: [
        {
          examples: ['x+y=5, x-y=1', 'y=2x+1, x+y=7'],
          id: 'linear-system-substitution-basic / linear-system-substitution-solved',
          label: '代入法'
        },
        {
          examples: ['2x+y=7, 2x-y=1'],
          id: 'linear-system-elimination-basic',
          label: '消元法'
        },
        {
          examples: ['x+y=2, x+y=5', 'x+y=2, 2x+2y=4'],
          id: 'linear-system-no-solution-basic / linear-system-infinite-solutions-basic',
          label: '无解 / 无穷多解分类'
        }
      ]
    },
    {
      boundaries: [
        {
          behavior: 'fallback',
          example: 'x^2+2xy+1=0',
          reason: '当前二次方程只支持单变量 x 的试点形态。'
        }
      ],
      currentResult: {
        examples: ['x=2 或 x=3', 'x=1', '无实数解'],
        format: '两个实根、重根或无实数解',
        kind: 'two_root_result'
      },
      family: 'quadratic_equation',
      label: '一元二次方程',
      recommendation: {
        presentationMode: 'full_steps',
        qualityTier: 'standard',
        why: '因式分解、开平方和求根公式都需要保留过程，但通常不必额外语义扩写。'
      },
      recommendedPresentationMode: 'full_steps',
      recommendedQualityTier: 'standard',
      resultShape: '返回两个实根、重根或无实数解，步骤包含因式分解、开平方或判别式/求根公式。',
      supportedShapes: [
        {
          examples: ['x^2=16', '(x+1)^2=9'],
          id: 'quadratic-square-root',
          label: '开平方链路'
        },
        {
          examples: ['x^2-5x+6=0', '(x-2)(x-3)=0'],
          id: 'quadratic-standard-factorable / quadratic-factored',
          label: '因式分解链路'
        },
        {
          examples: ['x^2-2x-1=0', 'x^2+2x+5=0'],
          id: 'quadratic-formula-two-real-roots / quadratic-formula-no-real-root',
          label: '判别式 / 求根公式链路'
        }
      ]
    }
  ],
  presentationModes: [
    {id: 'auto', label: '按 qualityTier 自动选择展示策略', source: 'auto'},
    {id: 'answer_only', label: '只展示最终答案', source: 'override'},
    {id: 'compact_steps', label: '展示精简关键步骤', source: 'override'},
    {id: 'full_steps', label: '展示完整标准流程', source: 'override'},
    {id: 'semantic_full_steps', label: '展示完整流程并强化语义提示', source: 'override'}
  ],
  qualityTiers: [
    {id: 'instant', label: '一步解或极简单题'},
    {id: 'basic', label: '简单线性题'},
    {id: 'standard', label: '标准教学流程'},
    {id: 'detailed', label: '复杂链路、区间/分支/系统求解'}
  ],
  schemaVersion: ALGEBRA_CAPABILITY_CATALOG_SCHEMA_VERSION,
  versions: ALGEBRA_CONTRACT_VERSIONS
};

export const getAlgebraCapabilityCatalog = () => ALGEBRA_CAPABILITY_CATALOG;

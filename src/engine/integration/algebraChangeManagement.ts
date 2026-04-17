import type {AlgebraPresentationMode} from './applyAlgebraPresentationStrategy';
import type {AlgebraQualityTier} from './inferAlgebraQualityTier';

export const ALGEBRA_ENGINE_VERSION = '0.1.0';
export const ALGEBRA_PRODUCT_ENTRY_SCHEMA_VERSION = 'algebra-product-entry-v1';
export const ALGEBRA_CAPABILITY_CATALOG_SCHEMA_VERSION = 'algebra-capability-catalog-v1';

export type AlgebraTrackedFamily =
  | 'fraction_equation'
  | 'fraction_inequality'
  | 'linear_equation'
  | 'linear_inequality'
  | 'linear_system'
  | 'quadratic_equation';

export type AlgebraTrackedResultKind =
  | 'equation_answer'
  | 'inequality_answer'
  | 'interval_solution_set'
  | 'system_solution'
  | 'two_root_result';

export type AlgebraContractVersions = {
  capabilityCatalogSchemaVersion: typeof ALGEBRA_CAPABILITY_CATALOG_SCHEMA_VERSION;
  engineVersion: typeof ALGEBRA_ENGINE_VERSION;
  productEntrySchemaVersion: typeof ALGEBRA_PRODUCT_ENTRY_SCHEMA_VERSION;
};

export type AlgebraResultShapeChange = {
  family: AlgebraTrackedFamily;
  kind: AlgebraTrackedResultKind;
  summary: string;
};

export type AlgebraChangeSet = {
  familiesAdded: AlgebraTrackedFamily[];
  presentationModesAdded: AlgebraPresentationMode[];
  qualityTiersAdded: AlgebraQualityTier[];
  resultShapeChanges: AlgebraResultShapeChange[];
  shapesAdded: string[];
};

export type AlgebraChangelogEntry = {
  changes: AlgebraChangeSet;
  contractImpact: 'major' | 'minor' | 'patch';
  date: string;
  id: string;
  summary: string;
  title: string;
};

export type AlgebraChangeSnapshot = {
  currentReleaseId: string;
  latest: Pick<AlgebraChangelogEntry, 'contractImpact' | 'date' | 'id' | 'summary' | 'title'>;
  strategy: 'stable-contract-with-additive-expansion';
};

export type AlgebraChangeSummary = AlgebraChangeSnapshot & {
  entries: AlgebraChangelogEntry[];
};

export const ALGEBRA_CONTRACT_VERSIONS: AlgebraContractVersions = {
  capabilityCatalogSchemaVersion: ALGEBRA_CAPABILITY_CATALOG_SCHEMA_VERSION,
  engineVersion: ALGEBRA_ENGINE_VERSION,
  productEntrySchemaVersion: ALGEBRA_PRODUCT_ENTRY_SCHEMA_VERSION
};

export const ALGEBRA_CHANGELOG: AlgebraChangelogEntry[] = [
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: ['auto', 'answer_only', 'compact_steps', 'full_steps', 'semantic_full_steps'],
      qualityTiersAdded: ['instant', 'basic', 'standard', 'detailed'],
      resultShapeChanges: [],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-14',
    id: 'algebra-mode-override-pass-v1',
    summary: '首次对外固定 presentationMode 和 qualityTier 的可选集合。',
    title: 'Algebra Mode Override Pass v1'
  },
  {
    changes: {
      familiesAdded: [
        'linear_equation',
        'linear_inequality',
        'fraction_equation',
        'fraction_inequality',
        'linear_system',
        'quadratic_equation'
      ],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_equation',
          kind: 'equation_answer',
          summary: '对外固定为单变量方程答案 x=...。'
        },
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '对外固定为单变量不等式结果。'
        },
        {
          family: 'fraction_equation',
          kind: 'equation_answer',
          summary: '对外固定为去分母后的单变量方程答案。'
        },
        {
          family: 'fraction_inequality',
          kind: 'interval_solution_set',
          summary: '对外固定为区间或并集形式的解集。'
        },
        {
          family: 'linear_system',
          kind: 'system_solution',
          summary: '对外固定为有序数对、无解或无穷多解。'
        },
        {
          family: 'quadratic_equation',
          kind: 'two_root_result',
          summary: '对外固定为两个实根、重根或无实数解。'
        }
      ],
      shapesAdded: [
        'linear',
        'linear-with-constant / variables-both-sides',
        'distributed / distributed-with-constant / multi-distributed',
        'linear-inequality',
        'distributed-inequality',
        'fraction-with-constant / bracket-fraction',
        'fraction-sum',
        'bracket-fraction-inequality / fraction-inequality-with-constant',
        'reciprocal-variable-denominator-inequality / fraction-variable-denominator-inequality / standard-rational-inequality',
        'linear-system-substitution-basic / linear-system-substitution-solved',
        'linear-system-elimination-basic',
        'linear-system-no-solution-basic / linear-system-infinite-solutions-basic',
        'quadratic-square-root',
        'quadratic-standard-factorable / quadratic-factored',
        'quadratic-formula-two-real-roots / quadratic-formula-no-real-root'
      ]
    },
    contractImpact: 'minor',
    date: '2026-04-14',
    id: 'algebra-capability-catalog-pass-v1',
    summary: '首次把已支持 family、shape、结果形态和边界样例整理为对外目录。',
    title: 'Algebra Capability Catalog Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'algebra-change-management-pass-v1',
    summary: '补上 engine version、schema version 和最小 changelog，对外合同开始可追踪演进。',
    title: 'Algebra Change Management Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'algebra-content-pack-pass-v1',
    summary: '把 featured、teaching、edge 和 unsupported 样例收敛成官方 content pack，并对外暴露 examples 入口。',
    title: 'Algebra Content Pack Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'algebra-demo-qa-pass-v1',
    summary: '为官方内容包补上最小 QA 断言和 demo QA runner，用于校验展示题与实际输出是否一致。',
    title: 'Algebra Demo QA Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'algebra-teaching-script-pass-v1',
    summary: '新增短视频教学脚本层，把展示后的步骤转换成结构化口播脚本并接入 product entry。',
    title: 'Algebra Teaching Script Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_equation',
          kind: 'equation_answer',
          summary: '新增 shotPlan 结构，提供从 teachingScript 到镜头序列的稳定规划输出。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'pacing-shot-planning-pass-v1',
    summary: '新增 ShotPlan，把 teachingScript 转成带 shotType、animation 和 duration 的结构化镜头序列。',
    title: 'Pacing & Shot Planning Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_equation',
          kind: 'equation_answer',
          summary: '新增 videoRender 与 VideoRenderPlan，把 shotPlan 收口成 HTML 预览、frame 序列和 mp4 导出链路。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'video-render-pass-v1',
    summary: '新增最小视频渲染闭环，支持从 shotPlan 生成 HTML 预览、时间轴检查页以及 frame/mp4 输出。',
    title: 'Video Render Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_equation',
          kind: 'equation_answer',
          summary: '新增 subtitleCuePlan，把 teachingScript、shotPlan 和 videoRenderPlan 收口成稳定字幕/口播 cue 时间轴。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'subtitle-voice-cue-pass-v1',
    summary: '新增 SubtitleCuePlan，并让 HTML 视频页优先消费 cue 时间轴；同时支持导出 .srt。',
    title: 'Subtitle & Voice Cue Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增 teachingPersona 与 videoHook 输出，并让 narration 可按 persona 风格重写。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'hook-persona-pass-v1',
    summary: '在 teachingScript 之上新增短视频开头 hook、讲师 persona 和最小 narration 风格化重写。',
    title: 'Hook & Persona Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增 emphasisPlan，把 hook、规则、易错提醒和最终结论收口成可对齐字幕时间轴的重点 cue。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'emphasis-punchline-pass-v1',
    summary: '新增 EmphasisPlan，并让 HTML 视频页最小支持 hook、规则、易错点和最终结论的视觉强化。',
    title: 'Emphasis & Punchline Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增 rhythmPlan，把 emphasis 和 pacingHint 转成 pause、slow、speed_up、repeat 与 beat 节奏 cue。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'rhythm-beat-pass-v1',
    summary: '新增 RhythmPlan，并让 HTML 视频页最小支持字幕停顿、慢显示提示和 beat 强调动画。',
    title: 'Rhythm & Beat Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增 voiceCuePlan，把 teachingScript、subtitleCuePlan、emphasisPlan 和 rhythmPlan 收口成口播同步时间轴。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'tts-audio-sync-pass-v1',
    summary: '新增 VoiceCuePlan，并支持导出 voice cue 的 JSON、TXT 与 SRT 对齐文件，为后续 TTS 接入打基础。',
    title: 'TTS & Audio Sync Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增可选 TTS provider 与 audioTrackPlan，把 voiceCuePlan 转成音频片段并支持有声视频合成。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'real-tts-provider-pass-v1',
    summary: '新增 mock/real TTS provider 抽象，mock 可生成 WAV 音频轨，real 通过环境变量启用最小系统 provider。',
    title: 'Real TTS Provider Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '优化 HTML/video 渲染层的公式展示、头尾层级、重点 cue 视觉区分和最终答案卡。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'visual-polish-pass-v1',
    summary: '在不改变数学主链路的前提下，提升公式卡、hook/rule/mistake/result 强化区和最终结论卡的成片观感。',
    title: 'Visual Polish Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增 publishingPack，自动生成标题、封面文案、简介、标签和推荐封面帧。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'publishing-pack-pass-v1',
    summary: '在成片导出之外新增最小发布资产包，并支持 video 脚本导出 .publishing.json。',
    title: 'Publishing Pack Pass v1'
  },
  {
    changes: {
      familiesAdded: [],
      presentationModesAdded: [],
      qualityTiersAdded: [],
      resultShapeChanges: [
        {
          family: 'linear_inequality',
          kind: 'inequality_answer',
          summary: '新增 batch dataset/series 结构、连续 episode 编号和批量发布资产输出。'
        }
      ],
      shapesAdded: []
    },
    contractImpact: 'minor',
    date: '2026-04-15',
    id: 'batch-production-series-pass-v1',
    summary: '新增 npm run batch 入口，用于按数据集批量生成 preview、字幕、voice cue、publishing pack 和可选音视频资产。',
    title: 'Batch Production & Series System Pass v1'
  }
];

const LATEST_CHANGE = ALGEBRA_CHANGELOG[ALGEBRA_CHANGELOG.length - 1];

if (!LATEST_CHANGE) {
  throw new Error('ALGEBRA_CHANGELOG must contain at least one entry.');
}

export const ALGEBRA_CHANGE_SNAPSHOT: AlgebraChangeSnapshot = {
  currentReleaseId: LATEST_CHANGE.id,
  latest: {
    contractImpact: LATEST_CHANGE.contractImpact,
    date: LATEST_CHANGE.date,
    id: LATEST_CHANGE.id,
    summary: LATEST_CHANGE.summary,
    title: LATEST_CHANGE.title
  },
  strategy: 'stable-contract-with-additive-expansion'
};

export const ALGEBRA_CHANGE_SUMMARY: AlgebraChangeSummary = {
  ...ALGEBRA_CHANGE_SNAPSHOT,
  entries: ALGEBRA_CHANGELOG
};

export const getAlgebraContractVersions = () => ALGEBRA_CONTRACT_VERSIONS;
export const getAlgebraChangeSnapshot = () => ALGEBRA_CHANGE_SNAPSHOT;
export const getAlgebraChangeSummary = () => ALGEBRA_CHANGE_SUMMARY;

import type {BatchDataset} from './batchTypes';

export const ALGEBRA_BATCH_DATASETS: BatchDataset[] = [
  {
    difficulty: 'standard',
    equations: [
      {
        difficulty: 'basic',
        equation: '2x+3>7',
        family: 'linear_inequality',
        hookStyle: 'mistake_first',
        tags: ['inequality', 'sign'],
        teachingPersona: 'strict_teacher'
      },
      {
        equation: 'x/2+x/3=5',
        family: 'fraction_equation',
        hookStyle: 'shortcut_first',
        tags: ['fraction', 'denominator'],
        teachingPersona: 'exam_coach'
      },
      {
        difficulty: 'challenge',
        equation: '(x-1)/(x+2)>0',
        family: 'fraction_inequality',
        hookStyle: 'mistake_first',
        tags: ['fraction', 'domain', 'interval'],
        teachingPersona: 'strict_teacher'
      },
      {
        equation: 'x^2-2x-1=0',
        family: 'quadratic_equation',
        hookStyle: 'question_first',
        tags: ['quadratic', 'root_count'],
        teachingPersona: 'exam_coach'
      },
      {
        equation: 'x+y=5, x-y=1',
        family: 'linear_system',
        hookStyle: 'question_first',
        tags: ['system', 'substitution'],
        teachingPersona: 'calm_teacher'
      }
    ],
    id: 'starter-five',
    name: '初中代数 5 题启动包',
    seriesId: 'junior-algebra-starter',
    seriesName: '初中数学短题精讲',
    tags: ['junior_math', 'algebra', 'short_video']
  }
];

export const getBatchDataset = (datasetId: string) => {
  return ALGEBRA_BATCH_DATASETS.find((dataset) => dataset.id === datasetId);
};

export const listBatchDatasets = () => ALGEBRA_BATCH_DATASETS;

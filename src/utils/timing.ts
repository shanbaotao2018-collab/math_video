import type {AlgebraLesson, AlgebraStep} from '../types/algebra';

export type StepTimelineEntry = {
  id: string;
  kind: AlgebraStep['kind'];
  from: number;
  duration: number;
};

export type StepTimeline = {
  steps: StepTimelineEntry[];
  totalFrames: number;
};

const timelineCache = new WeakMap<AlgebraStep[], StepTimeline>();

const getVisibleLatexLength = (expression: string) => {
  return expression
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\\./g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '').length;
};

export const getStepDuration = (step: AlgebraStep) => {
  let duration = 40 + getVisibleLatexLength(step.expression) * 2;

  if (step.note?.trim()) {
    duration += 15;
  }

  if (step.kind === 'expand' || step.kind === 'move' || step.kind === 'transform') {
    duration += 20;
  }

  if (step.kind === 'answer') {
    duration += 40;
  }

  return duration;
};

export const buildStepTimeline = (steps: AlgebraStep[]): StepTimeline => {
  const cachedTimeline = timelineCache.get(steps);

  if (cachedTimeline) {
    return cachedTimeline;
  }

  let currentFrom = 0;
  const timelineSteps = steps.map((step) => {
    const duration = getStepDuration(step);
    const entry: StepTimelineEntry = {
      id: step.id,
      kind: step.kind,
      from: currentFrom,
      duration
    };

    currentFrom += duration;
    return entry;
  });

  const timeline = {
    steps: timelineSteps,
    totalFrames: currentFrom
  };

  console.info('[timing] Built step timeline');
  console.table(
    timelineSteps.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      from: entry.from,
      duration: entry.duration
    }))
  );
  console.info(`[timing] total step frames: ${timeline.totalFrames}`);

  timelineCache.set(steps, timeline);

  return timeline;
};

export const getStepStartFrame = (lesson: AlgebraLesson, index: number) => {
  const timeline = buildStepTimeline(lesson.steps);
  const entry = timeline.steps[index];

  return entry ? lesson.pacing.introFrames + entry.from : lesson.pacing.introFrames;
};

export const getAnswerStartFrame = (lesson: AlgebraLesson) => {
  const timeline = buildStepTimeline(lesson.steps);
  const answerEntry = [...timeline.steps].reverse().find((entry) => entry.kind === 'answer');

  if (answerEntry) {
    return lesson.pacing.introFrames + answerEntry.from;
  }

  return lesson.pacing.introFrames + timeline.totalFrames;
};

export const calculateLessonDuration = (lesson: AlgebraLesson) => {
  const timeline = buildStepTimeline(lesson.steps);
  return lesson.pacing.introFrames + timeline.totalFrames + lesson.pacing.answerHoldFrames;
};

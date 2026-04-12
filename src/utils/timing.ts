import type {AlgebraLesson, AlgebraStep} from '../types/algebra';
import {hasVisualAction} from './actionResolver';
import {normalizeStepWithTemplate} from './templates';

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
  const normalizedStep = normalizeStepWithTemplate(step);
  let duration = 40 + getVisibleLatexLength(normalizedStep.latex) * 2;

  if (normalizedStep.note?.trim()) {
    duration += 15;
  }

  if (
    normalizedStep.kind === 'transform' ||
    normalizedStep.kind === 'cancel' ||
    hasVisualAction(normalizedStep, 'expand') ||
    hasVisualAction(normalizedStep, 'move') ||
    hasVisualAction(normalizedStep, 'cancel') ||
    hasVisualAction(normalizedStep, 'highlight')
  ) {
    duration += 20;
  }

  if (normalizedStep.kind === 'answer' || hasVisualAction(normalizedStep, 'answer')) {
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
  const answerStep = [...lesson.steps].reverse().find((step) => hasVisualAction(step, 'answer') || step.kind === 'answer');
  const answerEntry = answerStep ? timeline.steps.find((entry) => entry.id === answerStep.id) : undefined;

  if (answerEntry) {
    return lesson.pacing.introFrames + answerEntry.from;
  }

  return lesson.pacing.introFrames + timeline.totalFrames;
};

export const calculateLessonDuration = (lesson: AlgebraLesson) => {
  const timeline = buildStepTimeline(lesson.steps);
  return lesson.pacing.introFrames + timeline.totalFrames + lesson.pacing.answerHoldFrames;
};

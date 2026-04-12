import {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

import {AnswerOverlay} from '../components/AnswerOverlay';
import {GuideLayer} from '../components/GuideLayer';
import {BlackboardFrame} from '../components/BlackboardFrame';
import {MathFormula} from '../components/MathFormula';
import {StepCard} from '../components/StepCard';
import {SubtitleBar} from '../components/SubtitleBar';
import type {AlgebraLesson} from '../types/algebra';
import {getFirstVisualAction, hasVisualAction} from '../utils/actionResolver';
import type {GuideRect} from '../utils/anchors';
import {getPhaseProgress, resolveStepPhaseRanges} from '../utils/phases';
import {buildStepTimeline, getAnswerStartFrame, getStepStartFrame} from '../utils/timing';

type Props = {
  lesson: AlgebraLesson;
};

const rectsAreEqual = (left: GuideRect | undefined, right: GuideRect | undefined) => {
  if (!left || !right) {
    return left === right;
  }

  const tolerance = 0.1;

  return (
    Math.abs(left.left - right.left) < tolerance &&
    Math.abs(left.top - right.top) < tolerance &&
    Math.abs(left.width - right.width) < tolerance &&
    Math.abs(left.height - right.height) < tolerance
  );
};

const rectRecordsAreEqual = (left: Record<string, GuideRect>, right: Record<string, GuideRect>) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => rectsAreEqual(left[key], right[key]));
};

const getElementUnionRect = (elements: HTMLElement[]): GuideRect | null => {
  if (elements.length === 0) {
    return null;
  }

  const rects = elements.map((element) => element.getBoundingClientRect());
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
};

const getMeasuredFormulaRect = (element: HTMLDivElement): GuideRect => {
  const formulaBases = Array.from(element.querySelectorAll<HTMLElement>('.katex-html .base'));
  const formulaRect = getElementUnionRect(formulaBases);

  if (formulaRect) {
    return formulaRect;
  }

  const formulaElement = element.querySelector<HTMLElement>('.katex-html') ?? element;
  const rect = formulaElement.getBoundingClientRect();

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
};

export const LinearEquationLessonScene = ({lesson}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const stepFormulaElements = useRef<Record<string, HTMLDivElement | null>>({});
  const [stepFormulaRects, setStepFormulaRects] = useState<Record<string, GuideRect>>({});
  const setStepFormulaElement = useCallback((stepId: string, element: HTMLDivElement | null) => {
    stepFormulaElements.current[stepId] = element;
  }, []);
  const answerStart = getAnswerStartFrame(lesson);
  const answerProgress = spring({
    fps,
    frame: frame - answerStart,
    config: {
      damping: 200,
      mass: 0.9,
      stiffness: 180
    }
  });
  const stepTimeline = buildStepTimeline(lesson.steps);
  const currentStepIndex = stepTimeline.steps.reduce((activeIndex, stepEntry, index) => {
    return frame >= lesson.pacing.introFrames + stepEntry.from ? index : activeIndex;
  }, -1);
  const currentStep = currentStepIndex >= 0 ? lesson.steps[currentStepIndex] : null;
  const currentStepEntry = currentStepIndex >= 0 ? stepTimeline.steps[currentStepIndex] : null;
  const currentStepFrame =
    currentStepEntry ? frame - (lesson.pacing.introFrames + currentStepEntry.from) : 0;
  const currentPhaseRanges =
    currentStep && currentStepEntry
      ? resolveStepPhaseRanges(currentStepEntry.duration, currentStep.kind, currentStep.phaseConfig)
      : null;
  const actionPhaseProgress = currentPhaseRanges ? getPhaseProgress(currentStepFrame, currentPhaseRanges.action) : 0;
  const isActionPhaseActive = currentPhaseRanges
    ? currentStepFrame >= currentPhaseRanges.action.from && currentStepFrame <= currentPhaseRanges.action.to
    : false;
  // The current formula-only layout fits 6 steps comfortably before the panel feels full.
  const stepsPerPage = 6;
  const currentPageStart =
    currentStepIndex >= 0 ? Math.floor(currentStepIndex / stepsPerPage) * stepsPerPage : 0;
  const visibleSteps =
    currentStepIndex >= 0
      ? lesson.steps
          .slice(currentPageStart, currentStepIndex + 1)
          .map((step, offset) => ({step, index: currentPageStart + offset}))
      : [];
  useLayoutEffect(() => {
    const nextRects: Record<string, GuideRect> = {};

    visibleSteps.forEach(({step}) => {
      const element = stepFormulaElements.current[step.id];

      if (element) {
        nextRects[step.id] = getMeasuredFormulaRect(element);
      }
    });

    setStepFormulaRects((previousRects) => {
      return rectRecordsAreEqual(previousRects, nextRects) ? previousRects : nextRects;
    });
  });
  const expandRects =
    currentStep && hasVisualAction(currentStep, 'expand') && currentStepIndex > 0
      ? {
          current: stepFormulaRects[currentStep.id],
          currentTokenMap: currentStep.tokenMap,
          previous: stepFormulaRects[lesson.steps[currentStepIndex - 1].id],
          previousTokenMap: lesson.steps[currentStepIndex - 1].tokenMap
        }
      : undefined;
  const currentMoveAction = getFirstVisualAction(currentStep, 'move');
  const moveSourceStep = currentMoveAction && currentStepIndex > 0 ? lesson.steps[currentStepIndex - 1] : null;
  const moveRects =
    currentMoveAction && currentStep
      ? {
          current: stepFormulaRects[currentStep.id],
          currentExpression: currentStep.latex,
          currentTokenMap: currentStep.tokenMap,
          expression: moveSourceStep?.latex ?? currentStep.latex,
          previous: moveSourceStep ? stepFormulaRects[moveSourceStep.id] : undefined,
          previousExpression: moveSourceStep?.latex,
          previousTokenMap: moveSourceStep?.tokenMap
        }
      : undefined;
  const renderedSteps = visibleSteps.map(({step, index}) => {
    const currentMoveResult = currentMoveAction?.resultLatex ?? currentMoveAction?.result;
    const isCurrentMoveResultStep = currentStep?.id === step.id && Boolean(currentMoveResult);
    const moveResultProgress = isCurrentMoveResultStep
      ? interpolate(actionPhaseProgress, [0.52, 0.92], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })
      : 1;
    const displayStep =
      isCurrentMoveResultStep && currentMoveResult
        ? {
            ...step,
            latex: currentMoveResult,
            expression: currentMoveResult
          }
        : step;
    const start = getStepStartFrame(lesson, index);
    const progress = spring({
      fps,
      frame: frame - start,
      config: {
        damping: 200,
        mass: 0.85,
        stiffness: 190
      }
    });
    const translateY = interpolate(progress, [0, 1], [22, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    });
    const opacity = interpolate(progress, [0, 1], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    });

    return (
      <StepCard
        key={step.id}
        ref={(element) => setStepFormulaElement(step.id, element)}
        step={displayStep}
        index={index}
        style={{
          fontSize: lesson.layout === 'combined-main' ? '46px' : undefined,
          opacity: opacity * moveResultProgress,
          transform: `translateY(${translateY}px)`
        }}
      />
    );
  });
  const answerStep = lesson.steps.find((step) => hasVisualAction(step, 'answer'));
  const answerAction = getFirstVisualAction(answerStep, 'answer');
  const answerStepIndex = answerStep ? lesson.steps.findIndex((step) => step.id === answerStep.id) : -1;
  const answerStepEntry = answerStepIndex >= 0 ? stepTimeline.steps[answerStepIndex] : undefined;
  const answerStepFrame = answerStepEntry ? frame - (lesson.pacing.introFrames + answerStepEntry.from) : 0;
  const answerPhaseRanges =
    answerStep && answerStepEntry
      ? resolveStepPhaseRanges(answerStepEntry.duration, answerStep.kind, answerStep.phaseConfig)
      : null;
  const answerSettleProgress = answerPhaseRanges
    ? getPhaseProgress(answerStepFrame, answerPhaseRanges.settle)
    : answerProgress;
  const answerOverlay = (
    <AnswerOverlay
      label={lesson.labels.answerTag}
      expression={answerAction?.expression ?? lesson.answer}
      progress={answerSettleProgress}
    />
  );
  const subtitleOverlay = currentStep ? (
    <div
      style={{
        position: 'absolute',
        left: 120,
        right: 120,
        bottom: 44
      }}
    >
      <SubtitleBar text={currentStep.note ?? ''} />
    </div>
  ) : null;

  return (
    <BlackboardFrame
      showHeader={lesson.layout !== 'combined-main'}
      title={lesson.title}
      subtitle={lesson.labels.subtitle}
      kicker={lesson.labels.kicker}
    >
      <GuideLayer
        expandRects={expandRects}
        layout={lesson.layout}
        moveRects={moveRects}
        progress={actionPhaseProgress}
        step={isActionPhaseActive ? currentStep : null}
      />
      {lesson.layout === 'combined-main' ? (
        <>
          <AbsoluteFill
            style={{
              padding: '72px 120px 188px'
            }}
          >
            <section
              className="panel chalk-panel"
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                position: 'relative'
              }}
            >
              <MathFormula expression={lesson.prompt} className="combined-prompt-formula" displayMode />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingTop: 6
                }}
              >
                {renderedSteps}
              </div>
              <div className="combined-answer-slot combined-answer-slot-centered">{answerOverlay}</div>
            </section>
          </AbsoluteFill>
          {subtitleOverlay}
        </>
      ) : (
        <>
          <AbsoluteFill
            style={{
              padding: '210px 120px 188px',
              display: 'grid',
              gridTemplateColumns: '780px 1fr',
              gap: 56
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 28
              }}
            >
              <section className="panel chalk-panel">
                <div className="section-label">{lesson.labels.problemSection}</div>
                <div className="problem-title">{lesson.problemType}</div>
                <MathFormula expression={lesson.prompt} className="problem-formula" displayMode />
              </section>
              <section className="panel chalk-panel">
                <div className="section-label">{lesson.labels.strategySection}</div>
                <p className="chalk-copy">{lesson.strategy}</p>
              </section>
            </div>
            <section
              className="panel chalk-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <div className="section-label">{lesson.labels.stepsSection}</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingTop: 6
                }}
              >
                {renderedSteps}
              </div>
            </section>
          </AbsoluteFill>
          <div
            style={{
              position: 'absolute',
              right: 120,
              bottom: 126
            }}
          >
            {answerOverlay}
          </div>
          {subtitleOverlay}
        </>
      )}
    </BlackboardFrame>
  );
};

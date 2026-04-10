import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

import {AnswerHighlight} from '../components/AnswerHighlight';
import {GuideLayer} from '../components/GuideLayer';
import {BlackboardFrame} from '../components/BlackboardFrame';
import {MathFormula} from '../components/MathFormula';
import {StepCard} from '../components/StepCard';
import {SubtitleBar} from '../components/SubtitleBar';
import type {AlgebraLesson} from '../types/algebra';
import {buildStepTimeline, getAnswerStartFrame, getStepStartFrame} from '../utils/timing';

type Props = {
  lesson: AlgebraLesson;
};

export const LinearEquationLessonScene = ({lesson}: Props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
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
  const guideDuration = currentStepEntry ? Math.max(1, currentStepEntry.duration * 0.6) : 1;
  const guideProgress = interpolate(currentStepFrame, [0, guideDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
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
  const renderedSteps = visibleSteps.map(({step, index}) => {
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
        step={step}
        index={index}
        style={{
          fontSize: lesson.layout === 'combined-main' ? '46px' : undefined,
          opacity,
          transform: `translateY(${translateY}px)`
        }}
      />
    );
  });
  const answerOverlay = (
    <div
      style={{
        opacity: answerProgress,
        transform: `scale(${interpolate(answerProgress, [0, 1], [0.95, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        })})`
      }}
    >
      <AnswerHighlight label={lesson.labels.answerTag} expression={lesson.answer} />
    </div>
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
      <GuideLayer layout={lesson.layout} progress={guideProgress} step={currentStep} />
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

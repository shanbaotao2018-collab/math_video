declare const process: {
  exitCode?: number;
};
declare const require: (id: string) => any;

import type {AlgebraOperationTypeV2} from '../../types/algebra';
import {
  applyBatchTemplateDeepExecution,
  applyBatchTemplateExecutionMetadata,
  buildBatchContentProgrammingPlan,
  buildBatchProductionPlan,
  getBatchDataset,
  resolveBatchEpisodeTemplateExecution,
  resolveSeriesRhythmTemplateForUseCase,
  slugifyBatchPathPart
} from '../batch';
import {
  buildAlgebraProductEntry,
  buildCueSegmentTimeline,
  buildVoiceCuePlan,
  buildVideoRenderPlan,
  getTtsProviderCapabilities,
  normalizeSpeakableText,
  normalizeVoiceTimeline,
  resolveRealProviderVoiceMapping,
  resolveVoiceStrategyProfile,
  synthesizeVoiceCuePlan
} from '../integration';
import type {VoiceCuePlan} from '../render';
import {ALGEBRA_EVALUATION_CASES, type AlgebraEvaluationCase} from './algebraEvaluationCases';

const fs = require('node:fs');
const childProcess = require('node:child_process');

const FFMPEG_PATH = '/opt/homebrew/bin/ffmpeg';
const FFPROBE_PATH = '/opt/homebrew/bin/ffprobe';

type FamilyStats = {
  passed: number;
  total: number;
};

type FailureRecord = {
  description: string;
  equation: string;
  issues: string[];
};

const getOperationTypes = (evaluationCase: Awaited<ReturnType<typeof buildAlgebraProductEntry>>) => {
  return evaluationCase.problem?.steps
    .map((step) => step.operation?.type)
    .filter((operation): operation is AlgebraOperationTypeV2 => Boolean(operation)) ?? [];
};

const containsOrderedOperations = (actual: AlgebraOperationTypeV2[], expected: AlgebraOperationTypeV2[]) => {
  let searchStartIndex = 0;

  return expected.every((operation) => {
    const foundIndex = actual.indexOf(operation, searchStartIndex);

    if (foundIndex === -1) {
      return false;
    }

    searchStartIndex = foundIndex + 1;
    return true;
  });
};

const joinNarrations = (result: Awaited<ReturnType<typeof buildAlgebraProductEntry>>) => {
  return result.teachingScript?.steps.map((step) => `${step.stepId}:${step.narration}`).join('|') ?? '';
};

const isDedupeSubtitleFallback = (text: string) => {
  return /^第\d+步，先看公式变化。$/.test(text);
};

const hasVisibleNarrationDifference = (
  actual: Awaited<ReturnType<typeof buildAlgebraProductEntry>>,
  baseline: Awaited<ReturnType<typeof buildAlgebraProductEntry>>
) => {
  const baselineByStepId = new Map(baseline.teachingScript?.steps.map((step) => [step.stepId, step.narration]) ?? []);

  return actual.teachingScript?.steps.some((step) => {
    const baselineNarration = baselineByStepId.get(step.stepId);
    return Boolean(baselineNarration && baselineNarration !== step.narration);
  }) ?? joinNarrations(actual) !== joinNarrations(baseline);
};

const collectCaseIssues = async (evaluationCase: AlgebraEvaluationCase) => {
  const buildOptions = {
    ai: false,
    fallbackOnUnsupported: evaluationCase.noFallback ? false : true,
    hookStyle: evaluationCase.hookStyle,
    includeLesson: evaluationCase.includeLesson ?? false,
    presentationMode: evaluationCase.presentationMode ?? 'auto',
    returnReport: evaluationCase.returnReport ?? false,
    teachingPersona: evaluationCase.teachingPersona
  };
  const result = await buildAlgebraProductEntry(evaluationCase.equation, buildOptions);
  const issues: string[] = [];

  if (result.family.id !== evaluationCase.expectedFamily) {
    issues.push(`family mismatch: expected ${evaluationCase.expectedFamily}, got ${result.family.id}`);
  }

  if (result.supported !== evaluationCase.expectedSupported) {
    issues.push(`supported mismatch: expected ${evaluationCase.expectedSupported}, got ${result.supported}`);
  }

  if (
    evaluationCase.expectedNormalizedEquation &&
    result.normalizedEquation !== evaluationCase.expectedNormalizedEquation
  ) {
    issues.push(
      `normalizedEquation mismatch: expected ${evaluationCase.expectedNormalizedEquation}, got ${result.normalizedEquation}`
    );
  }

  if (evaluationCase.expectedQuality && result.quality !== evaluationCase.expectedQuality) {
    issues.push(`quality mismatch: expected ${evaluationCase.expectedQuality}, got ${result.quality}`);
  }

  if (evaluationCase.expectedQualityTier && result.qualityTier !== evaluationCase.expectedQualityTier) {
    issues.push(`qualityTier mismatch: expected ${evaluationCase.expectedQualityTier}, got ${result.qualityTier}`);
  }

  if (
    evaluationCase.expectedPresentationStrategy &&
    result.presentationStrategy.id !== evaluationCase.expectedPresentationStrategy
  ) {
    issues.push(
      `presentationStrategy mismatch: expected ${evaluationCase.expectedPresentationStrategy}, got ${result.presentationStrategy.id}`
    );
  }

  if (
    evaluationCase.expectedPresentationSource &&
    result.presentationSource !== evaluationCase.expectedPresentationSource
  ) {
    issues.push(
      `presentationSource mismatch: expected ${evaluationCase.expectedPresentationSource}, got ${result.presentationSource}`
    );
  }

  const actualStepCount = result.problem?.steps.length ?? 0;

  if (evaluationCase.expectedStepCount !== undefined && actualStepCount !== evaluationCase.expectedStepCount) {
    issues.push(`step count mismatch: expected ${evaluationCase.expectedStepCount}, got ${actualStepCount}`);
  }

  if (
    evaluationCase.expectedMinStepCount !== undefined &&
    actualStepCount < evaluationCase.expectedMinStepCount
  ) {
    issues.push(`step count below minimum: expected >= ${evaluationCase.expectedMinStepCount}, got ${actualStepCount}`);
  }

  if (
    evaluationCase.expectedMaxStepCount !== undefined &&
    actualStepCount > evaluationCase.expectedMaxStepCount
  ) {
    issues.push(`step count above maximum: expected <= ${evaluationCase.expectedMaxStepCount}, got ${actualStepCount}`);
  }

  if (evaluationCase.expectedAnswer && result.problem?.answer !== evaluationCase.expectedAnswer) {
    issues.push(`answer mismatch: expected ${evaluationCase.expectedAnswer}, got ${result.problem?.answer ?? 'undefined'}`);
  }

  if (evaluationCase.expectedTeachingScript) {
    const teachingScript = result.teachingScript;
    const expectedTeachingScript = evaluationCase.expectedTeachingScript;
    const actualStepScripts = teachingScript?.steps.length ?? 0;

    if (
      expectedTeachingScript.expectedIntroHook === true &&
      !teachingScript?.introHook?.trim()
    ) {
      issues.push('teachingScript introHook missing.');
    }

    if (
      expectedTeachingScript.expectedIntroHook === false &&
      teachingScript?.introHook
    ) {
      issues.push(`teachingScript introHook expected absent, got ${teachingScript.introHook}`);
    }

    if (
      expectedTeachingScript.expectedOutroSummary === true &&
      !teachingScript?.outroSummary?.trim()
    ) {
      issues.push('teachingScript outroSummary missing.');
    }

    if (
      expectedTeachingScript.expectedOutroSummary === false &&
      teachingScript?.outroSummary
    ) {
      issues.push(`teachingScript outroSummary expected absent, got ${teachingScript.outroSummary}`);
    }

    if (
      expectedTeachingScript.minStepScripts !== undefined &&
      actualStepScripts < expectedTeachingScript.minStepScripts
    ) {
      issues.push(
        `teachingScript step count below minimum: expected >= ${expectedTeachingScript.minStepScripts}, got ${actualStepScripts}`
      );
    }

    if (expectedTeachingScript.expectedStepIds) {
      const actualStepIds = teachingScript?.steps.map((step) => step.stepId) ?? [];

      if (actualStepIds.join('|') !== expectedTeachingScript.expectedStepIds.join('|')) {
        issues.push(
          `teachingScript step ids mismatch: expected ${expectedTeachingScript.expectedStepIds.join(' -> ')}, got ${actualStepIds.join(' -> ')}`
        );
      }
    }

    teachingScript?.steps.forEach((step) => {
      if (!step.narration.trim()) {
        issues.push(`teachingScript narration missing for step ${step.stepId}`);
      }
    });

    const problemStepIds = new Set(result.problem?.steps.map((step) => step.id) ?? []);

    teachingScript?.steps.forEach((step) => {
      if (!problemStepIds.has(step.stepId)) {
        issues.push(`teachingScript stepId ${step.stepId} does not map to rendered problem.steps`);
      }
    });
  }

  if (evaluationCase.expectedHook) {
    const hook = result.videoHook ?? result.teachingScript?.hook;

    if (evaluationCase.expectedHook.nonEmpty && !hook?.text.trim()) {
      issues.push('videoHook missing or empty.');
    }

    if (evaluationCase.expectedHook.style && hook?.style !== evaluationCase.expectedHook.style) {
      issues.push(`videoHook style mismatch: expected ${evaluationCase.expectedHook.style}, got ${hook?.style}`);
    }

    if (hook?.text && result.teachingScript?.hook?.text !== hook.text) {
      issues.push('videoHook does not match teachingScript hook.');
    }

    if (evaluationCase.expectedHook.targetOperation) {
      const targetStep = result.problem?.steps.find((step) => step.id === hook?.targetStepId);

      if (!targetStep) {
        issues.push(`videoHook target step missing for expected operation ${evaluationCase.expectedHook.targetOperation}`);
      } else if (targetStep.operation?.type !== evaluationCase.expectedHook.targetOperation) {
        issues.push(
          `videoHook target operation mismatch: expected ${evaluationCase.expectedHook.targetOperation}, got ${targetStep.operation?.type ?? 'undefined'}`
        );
      }
    }
  }

  if (evaluationCase.expectedTeachingPersona) {
    const expectedTeachingPersona = evaluationCase.expectedTeachingPersona;

    if (result.teachingPersona.id !== expectedTeachingPersona.id) {
      issues.push(`teachingPersona mismatch: expected ${expectedTeachingPersona.id}, got ${result.teachingPersona.id}`);
    }

    if (result.teachingScript?.persona !== expectedTeachingPersona.id) {
      issues.push(`teachingScript persona mismatch: expected ${expectedTeachingPersona.id}, got ${result.teachingScript?.persona}`);
    }

    if (!result.teachingPersona.label.trim() || !result.teachingPersona.guidance.trim()) {
      issues.push(`teachingPersona metadata missing for ${expectedTeachingPersona.id}`);
    }

    if (expectedTeachingPersona.narrationShouldDiffer) {
      const baseline = await buildAlgebraProductEntry(evaluationCase.equation, {
        ...buildOptions,
        teachingPersona: 'calm_teacher'
      });

      if (!hasVisibleNarrationDifference(result, baseline)) {
        issues.push(`teachingScript narration did not visibly differ for persona ${expectedTeachingPersona.id}`);
      }
    }
  }

  if (evaluationCase.expectedEmphasisPlan) {
    const emphasisPlan = result.emphasisPlan;
    const expectedEmphasisPlan = evaluationCase.expectedEmphasisPlan;
    const emphasisCueCount = emphasisPlan?.cues.length ?? 0;
    const subtitleCueById = new Map(result.subtitleCuePlan?.cues.map((cue) => [cue.cueId, cue]) ?? []);
    const problemStepIds = new Set(result.problem?.steps.map((step) => step.id) ?? []);
    const actualKinds = new Set(emphasisPlan?.cues.map((cue) => cue.kind) ?? []);

    if ((expectedEmphasisPlan.minCues ?? 0) > 0 && (!emphasisPlan || emphasisCueCount === 0)) {
      issues.push('emphasisPlan missing or empty.');
    }

    if (
      expectedEmphasisPlan.minCues !== undefined &&
      emphasisCueCount < expectedEmphasisPlan.minCues
    ) {
      issues.push(`emphasisPlan cue count below minimum: expected >= ${expectedEmphasisPlan.minCues}, got ${emphasisCueCount}`);
    }

    expectedEmphasisPlan.kinds?.forEach((kind) => {
      if (!actualKinds.has(kind)) {
        issues.push(`emphasisPlan missing kind ${kind}`);
      }
    });

    emphasisPlan?.cues.forEach((cue) => {
      if (!cue.text.trim()) {
        issues.push(`emphasis cue text missing for ${cue.cueId}`);
      }

      if (!problemStepIds.has(cue.stepId)) {
        issues.push(`emphasis cue stepId ${cue.stepId} does not map to rendered problem.steps`);
      }

      if (cue.targetStepId && !problemStepIds.has(cue.targetStepId)) {
        issues.push(`emphasis cue targetStepId ${cue.targetStepId} does not map to rendered problem.steps`);
      }

      const subtitleCue = subtitleCueById.get(cue.subtitleCueId);

      if (!subtitleCue) {
        issues.push(`emphasis cue subtitleCueId ${cue.subtitleCueId} does not map to subtitleCuePlan`);
        return;
      }

      if (cue.stepId !== subtitleCue.stepId) {
        issues.push(`emphasis cue stepId mismatch for ${cue.cueId}: expected ${subtitleCue.stepId}, got ${cue.stepId}`);
      }

      if (cue.shotId !== subtitleCue.shotId) {
        issues.push(`emphasis cue shotId mismatch for ${cue.cueId}: expected ${subtitleCue.shotId}, got ${cue.shotId}`);
      }

      if (cue.startMs !== subtitleCue.startMs || cue.endMs !== subtitleCue.endMs) {
        issues.push(`emphasis cue time mismatch for ${cue.cueId}`);
      }
    });
  }

  if (evaluationCase.expectedRhythmPlan) {
    const rhythmPlan = result.rhythmPlan;
    const emphasisCueById = new Map(result.emphasisPlan?.cues.map((cue) => [cue.cueId, cue]) ?? []);
    const expectedRhythmPlan = evaluationCase.expectedRhythmPlan;
    const problemStepIds = new Set(result.problem?.steps.map((step) => step.id) ?? []);
    const rhythmCueCount = rhythmPlan?.cues.length ?? 0;
    const actualTypes = new Set(rhythmPlan?.cues.map((cue) => cue.type) ?? []);

    if ((expectedRhythmPlan.minCues ?? 0) > 0 && (!rhythmPlan || rhythmCueCount === 0)) {
      issues.push('rhythmPlan missing or empty.');
    }

    if (
      expectedRhythmPlan.minCues !== undefined &&
      rhythmCueCount < expectedRhythmPlan.minCues
    ) {
      issues.push(`rhythmPlan cue count below minimum: expected >= ${expectedRhythmPlan.minCues}, got ${rhythmCueCount}`);
    }

    expectedRhythmPlan.types?.forEach((type) => {
      if (!actualTypes.has(type)) {
        issues.push(`rhythmPlan missing type ${type}`);
      }
    });

    rhythmPlan?.cues.forEach((cue) => {
      if (!problemStepIds.has(cue.stepId)) {
        issues.push(`rhythm cue stepId ${cue.stepId} does not map to rendered problem.steps`);
      }

      if (cue.startMs < 0 || cue.durationMs <= 0) {
        issues.push(`rhythm cue time invalid for ${cue.cueId}: ${cue.startMs}+${cue.durationMs}`);
      }

      if (cue.emphasisCueId) {
        const emphasisCue = emphasisCueById.get(cue.emphasisCueId);

        if (!emphasisCue) {
          issues.push(`rhythm cue emphasisCueId ${cue.emphasisCueId} does not map to emphasisPlan`);
        } else if (cue.stepId !== emphasisCue.stepId) {
          issues.push(`rhythm cue stepId mismatch for ${cue.cueId}: expected ${emphasisCue.stepId}, got ${cue.stepId}`);
        }
      }
    });

    if (expectedRhythmPlan.hookBeat) {
      const hookCueIds = new Set(result.emphasisPlan?.cues.filter((cue) => cue.kind === 'hook').map((cue) => cue.cueId) ?? []);
      const hasHookBeat = rhythmPlan?.cues.some((cue) => cue.type === 'beat' && cue.emphasisCueId && hookCueIds.has(cue.emphasisCueId)) ?? false;

      if (!hasHookBeat) {
        issues.push('rhythmPlan missing beat for hook emphasis.');
      }
    }

    if (expectedRhythmPlan.mistakePause) {
      const mistakeCueIds = new Set(result.emphasisPlan?.cues.filter((cue) => cue.kind === 'mistake').map((cue) => cue.cueId) ?? []);
      const hasMistakePause = rhythmPlan?.cues.some((cue) => cue.type === 'pause' && cue.emphasisCueId && mistakeCueIds.has(cue.emphasisCueId)) ?? false;

      if (!hasMistakePause) {
        issues.push('rhythmPlan missing pause for mistake emphasis.');
      }
    }

    if (expectedRhythmPlan.resultSlow) {
      const resultCueIds = new Set(result.emphasisPlan?.cues.filter((cue) => cue.kind === 'result').map((cue) => cue.cueId) ?? []);
      const hasResultSlow = rhythmPlan?.cues.some((cue) => cue.type === 'slow' && cue.emphasisCueId && resultCueIds.has(cue.emphasisCueId)) ?? false;

      if (!hasResultSlow) {
        issues.push('rhythmPlan missing slow for result emphasis.');
      }
    }
  }

  if (evaluationCase.expectedSubtitleCuePlan) {
    const subtitleCuePlan = result.subtitleCuePlan;
    const expectedSubtitleCuePlan = evaluationCase.expectedSubtitleCuePlan;
    const cueCount = subtitleCuePlan?.cues.length ?? 0;
    const teachingStepsById = new Map(result.teachingScript?.steps.map((step) => [step.stepId, step]) ?? []);
    const problemStepIds = new Set(result.problem?.steps.map((step) => step.id) ?? []);
    const renderPlan = result.shotPlan ? buildVideoRenderPlan(result.shotPlan) : undefined;
    const renderShotById = new Map(renderPlan?.shots.map((shot) => [shot.shotId, shot]) ?? []);

    if ((expectedSubtitleCuePlan.minCues ?? 0) > 0 && (!subtitleCuePlan || cueCount === 0)) {
      issues.push('subtitleCuePlan missing or empty.');
    }

    if (
      expectedSubtitleCuePlan.minCues !== undefined &&
      cueCount < expectedSubtitleCuePlan.minCues
    ) {
      issues.push(`subtitleCuePlan count below minimum: expected >= ${expectedSubtitleCuePlan.minCues}, got ${cueCount}`);
    }

    subtitleCuePlan?.cues.forEach((cue) => {
      if (!cue.text.trim()) {
        issues.push(`subtitle cue text missing for ${cue.cueId}`);
      }

      if (cue.startMs < 0 || cue.endMs <= cue.startMs) {
        issues.push(`subtitle cue time invalid for ${cue.cueId}: ${cue.startMs}-${cue.endMs}`);
      }

      if (!problemStepIds.has(cue.stepId)) {
        issues.push(`subtitle cue stepId ${cue.stepId} does not map to rendered problem.steps`);
      }

      const teachingStep = teachingStepsById.get(cue.stepId);

      if (!teachingStep) {
        issues.push(`subtitle cue stepId ${cue.stepId} does not map to teachingScript`);
      } else if (cue.text !== teachingStep.narration && !isDedupeSubtitleFallback(cue.text)) {
        issues.push(`subtitle cue text mismatch for step ${cue.stepId}`);
      }

      const renderShot = renderShotById.get(cue.shotId);

      if (!renderShot) {
        issues.push(`subtitle cue shotId ${cue.shotId} does not map to videoRenderPlan`);
      } else {
        if (cue.startMs !== renderShot.startMs || cue.endMs !== renderShot.endMs) {
          issues.push(`subtitle cue time mismatch for shot ${cue.shotId}`);
        }

        if (cue.stepId !== renderShot.stepId) {
          issues.push(`subtitle cue stepId mismatch for shot ${cue.shotId}`);
        }
      }
    });
  }

  if (evaluationCase.expectedVoiceCuePlan) {
    const expectedVoiceCuePlan = evaluationCase.expectedVoiceCuePlan;
    const voiceCuePlan = result.voiceCuePlan;
    const voiceCueCount = voiceCuePlan?.cues.length ?? 0;
    const subtitleCueById = new Map(result.subtitleCuePlan?.cues.map((cue) => [cue.cueId, cue]) ?? []);
    const problemStepIds = new Set(result.problem?.steps.map((step) => step.id) ?? []);
    const shotIds = new Set(result.shotPlan?.shots.map((shot) => shot.shotId) ?? []);

    if ((expectedVoiceCuePlan.minCues ?? 0) > 0 && (!voiceCuePlan || voiceCueCount === 0)) {
      issues.push('voiceCuePlan missing or empty.');
    }

    if (
      expectedVoiceCuePlan.minCues !== undefined &&
      voiceCueCount < expectedVoiceCuePlan.minCues
    ) {
      issues.push(`voiceCuePlan cue count below minimum: expected >= ${expectedVoiceCuePlan.minCues}, got ${voiceCueCount}`);
    }

    voiceCuePlan?.cues.forEach((voiceCue) => {
      if (!voiceCue.text.trim()) {
        issues.push(`voice cue text missing for ${voiceCue.cueId}`);
      }

      if (!voiceCue.persona) {
        issues.push(`voice cue persona missing for ${voiceCue.cueId}`);
      }

      if (voiceCue.startMs < 0 || voiceCue.endMs <= voiceCue.startMs) {
        issues.push(`voice cue time invalid for ${voiceCue.cueId}: ${voiceCue.startMs}-${voiceCue.endMs}`);
      }

      if (!problemStepIds.has(voiceCue.stepId)) {
        issues.push(`voice cue stepId ${voiceCue.stepId} does not map to rendered problem.steps`);
      }

      if (!shotIds.has(voiceCue.shotId)) {
        issues.push(`voice cue shotId ${voiceCue.shotId} does not map to shotPlan`);
      }

      const subtitleCue = subtitleCueById.get(voiceCue.subtitleCueId);

      if (!subtitleCue) {
        issues.push(`voice cue subtitleCueId ${voiceCue.subtitleCueId} does not map to subtitleCuePlan`);
        return;
      }

      if (voiceCue.stepId !== subtitleCue.stepId) {
        issues.push(`voice cue stepId mismatch for ${voiceCue.cueId}: expected ${subtitleCue.stepId}, got ${voiceCue.stepId}`);
      }

      if (voiceCue.shotId !== subtitleCue.shotId) {
        issues.push(`voice cue shotId mismatch for ${voiceCue.cueId}: expected ${subtitleCue.shotId}, got ${voiceCue.shotId}`);
      }

      if (voiceCue.startMs !== subtitleCue.startMs || voiceCue.endMs !== subtitleCue.endMs) {
        issues.push(`voice cue time mismatch for ${voiceCue.cueId}`);
      }

      if (voiceCue.text !== subtitleCue.text) {
        issues.push(`voice cue text mismatch for ${voiceCue.cueId}`);
      }

      voiceCue.segments.forEach((segment) => {
        if (!segment.pauseBeforeType && !segment.pauseAfterType) {
          issues.push(`missing pause type for voice segment ${segment.segmentId}`);
        }

        if (segment.emphasisType === 'rule' && segment.pauseBeforeType !== 'emphasis') {
          issues.push(`emphasis pause not applied for rule segment ${segment.segmentId}`);
        }

        if (segment.emphasisType === 'mistake' && segment.pauseBeforeType !== 'emphasis') {
          issues.push(`emphasis pause not applied for mistake segment ${segment.segmentId}`);
        }

        if (segment.emphasisType === 'result' && segment.pauseAfterType !== 'result') {
          issues.push(`result pause not applied for segment ${segment.segmentId}`);
        }
      });
    });

    const normalizedVoiceCues = normalizeVoiceTimeline(voiceCuePlan?.cues ?? []);

    for (let index = 1; index < normalizedVoiceCues.length; index += 1) {
      const previousCue = normalizedVoiceCues[index - 1];
      const currentCue = normalizedVoiceCues[index];

      if (currentCue.startMs < previousCue.endMs) {
        issues.push(`Voice overlap detected between ${previousCue.cueId} and ${currentCue.cueId}`);
      }
    }

    normalizedVoiceCues.forEach((voiceCue) => {
      const voiceStrategyProfile = resolveVoiceStrategyProfile(voiceCue.persona);
      const segmentTimeline = buildCueSegmentTimeline(voiceCue, voiceStrategyProfile);

      for (let index = 1; index < segmentTimeline.length; index += 1) {
        const previousSegment = segmentTimeline[index - 1];
        const currentSegment = segmentTimeline[index];

        if (currentSegment.startMs < previousSegment.endMs) {
          issues.push(`Segment overlap detected in ${voiceCue.cueId} between ${previousSegment.segmentId} and ${currentSegment.segmentId}`);
        }
      }
    });
  }

  if (evaluationCase.expectedPublishingPack) {
    const expectedPublishingPack = evaluationCase.expectedPublishingPack;
    const publishingPack = result.publishingPack;
    const minHashtags = expectedPublishingPack.minHashtags ?? 2;

    if (!publishingPack) {
      issues.push('publishingPack missing.');
    } else {
      if (!publishingPack.title.trim()) {
        issues.push('publishingPack title missing.');
      }

      if (!publishingPack.coverText.trim()) {
        issues.push('publishingPack coverText missing.');
      }

      if (!publishingPack.caption.trim()) {
        issues.push('publishingPack caption missing.');
      }

      if (publishingPack.hashtags.length < minHashtags) {
        issues.push(
          `publishingPack hashtags below minimum: expected >= ${minHashtags}, got ${publishingPack.hashtags.length}`
        );
      }

      if (!publishingPack.coverFrame.shotId && publishingPack.coverFrame.timestampMs === undefined) {
        issues.push('publishingPack coverFrame must include shotId or timestampMs.');
      }

      const renderPlan = result.shotPlan ? buildVideoRenderPlan(result.shotPlan) : undefined;
      const renderShotById = new Map(renderPlan?.shots.map((shot) => [shot.shotId, shot]) ?? []);
      const coverShot = publishingPack.coverFrame.shotId
        ? renderShotById.get(publishingPack.coverFrame.shotId)
        : undefined;

      if (publishingPack.coverFrame.shotId && !coverShot) {
        issues.push(`publishingPack coverFrame shotId ${publishingPack.coverFrame.shotId} does not map to shotPlan.`);
      }

      if (publishingPack.coverFrame.timestampMs !== undefined) {
        const timestampMs = publishingPack.coverFrame.timestampMs;

        if (!renderPlan) {
          issues.push('publishingPack coverFrame timestamp cannot be checked because renderPlan is unavailable.');
        } else if (timestampMs < 0 || timestampMs > renderPlan.durationMs) {
          issues.push(`publishingPack coverFrame timestamp out of range: ${timestampMs}`);
        } else if (coverShot && (timestampMs < coverShot.startMs || timestampMs >= coverShot.endMs)) {
          issues.push(`publishingPack coverFrame timestamp ${timestampMs} is not inside shot ${coverShot.shotId}`);
        }
      }
    }
  }

  if (evaluationCase.expectedShotPlan) {
    const shotPlan = result.shotPlan;
    const expectedShotPlan = evaluationCase.expectedShotPlan;
    const shotCount = shotPlan?.shots.length ?? 0;

    if (!shotPlan || shotCount === 0) {
      issues.push('shotPlan missing or empty.');
    }

    if (expectedShotPlan.minShots !== undefined && shotCount < expectedShotPlan.minShots) {
      issues.push(`shotPlan count below minimum: expected >= ${expectedShotPlan.minShots}, got ${shotCount}`);
    }

    if (expectedShotPlan.maxShots !== undefined && shotCount > expectedShotPlan.maxShots) {
      issues.push(`shotPlan count above maximum: expected <= ${expectedShotPlan.maxShots}, got ${shotCount}`);
    }

    const problemStepIds = new Set(result.problem?.steps.map((step) => step.id) ?? []);
    const teachingStepsById = new Map(result.teachingScript?.steps.map((step) => [step.stepId, step]) ?? []);
    const actualShotTypes = new Set(shotPlan?.shots.map((shot) => shot.shotType) ?? []);

    expectedShotPlan.requiredShotTypes?.forEach((shotType) => {
      if (!actualShotTypes.has(shotType)) {
        issues.push(`shotPlan missing required shotType ${shotType}`);
      }
    });

    shotPlan?.shots.forEach((shot) => {
      if (!problemStepIds.has(shot.stepId)) {
        issues.push(`shotPlan stepId ${shot.stepId} does not map to rendered problem.steps`);
      }

      if (shot.durationMs <= 0) {
        issues.push(`shotPlan duration must be > 0 for ${shot.shotId}`);
      }

      const teachingStep = teachingStepsById.get(shot.stepId);

      if (!teachingStep) {
        issues.push(`shotPlan stepId ${shot.stepId} does not map to teachingScript`);
        return;
      }

      if (shot.narration !== teachingStep.narration) {
        issues.push(`shotPlan narration mismatch for ${shot.stepId}`);
      }
    });
  }

  if (evaluationCase.expectedVideoRender) {
    const expectedVideoRender = evaluationCase.expectedVideoRender;
    const videoRender = result.videoRender;

    if (expectedVideoRender.renderable !== undefined && videoRender?.renderable !== expectedVideoRender.renderable) {
      issues.push(`videoRender.renderable mismatch: expected ${expectedVideoRender.renderable}, got ${videoRender?.renderable}`);
    }

    if (result.shotPlan) {
      const renderPlan = buildVideoRenderPlan(result.shotPlan);

      if (renderPlan.shots.length !== result.shotPlan.shots.length) {
        issues.push(
          `videoRenderPlan shot count mismatch: expected ${result.shotPlan.shots.length}, got ${renderPlan.shots.length}`
        );
      }

      if (renderPlan.durationMs <= 0) {
        issues.push(`videoRenderPlan duration must be > 0, got ${renderPlan.durationMs}`);
      }

      if (
        expectedVideoRender.minShots !== undefined &&
        renderPlan.shots.length < expectedVideoRender.minShots
      ) {
        issues.push(
          `videoRenderPlan shot count below minimum: expected >= ${expectedVideoRender.minShots}, got ${renderPlan.shots.length}`
        );
      }
    } else if ((expectedVideoRender.minShots ?? 0) > 0) {
      issues.push('videoRenderPlan cannot be built because shotPlan is missing.');
    }
  }

  if (evaluationCase.expectedOperations) {
    const actualOperations = getOperationTypes(result);

    if (!containsOrderedOperations(actualOperations, evaluationCase.expectedOperations)) {
      issues.push(
        `operation sequence mismatch: expected ordered subset ${evaluationCase.expectedOperations.join(' -> ')}, got ${actualOperations.join(' -> ')}`
      );
    }
  }

  return {
    issues,
    result
  };
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

const isValidPublishPriorityScore = (value: number) => {
  return Number.isInteger(value) && value >= 0 && value <= 100;
};

const isCompleteSeriesRhythmTemplate = (
  template: ReturnType<typeof resolveSeriesRhythmTemplateForUseCase> | undefined
) => {
  return Boolean(
    template &&
      template.id &&
      template.useCase &&
      template.preferredPersona &&
      template.preferredHookStyle &&
      template.preferredPresentationMode &&
      template.preferredDurationBandSec &&
      Number.isFinite(template.preferredDurationBandSec.min) &&
      Number.isFinite(template.preferredDurationBandSec.max) &&
      template.preferredDurationBandSec.min > 0 &&
      template.preferredDurationBandSec.max >= template.preferredDurationBandSec.min &&
      template.emphasisBias &&
      template.outroStyle
  );
};

const runLocalCommand = (command: string, args: string[]) => {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.status !== 0) {
    throw new Error([result.stderr, result.stdout].filter(Boolean).join('\n').trim() || `command failed: ${command}`);
  }

  return result;
};

const getMediaDurationSec = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    const result = runLocalCommand(FFPROBE_PATH, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=nokey=1:noprint_wrappers=1',
      filePath
    ]);
    const durationSec = Number.parseFloat((result.stdout || '').trim());

    return Number.isFinite(durationSec) ? durationSec : undefined;
  } catch (_error) {
    return undefined;
  }
};

const hasAudioStream = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    const result = runLocalCommand(FFPROBE_PATH, [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      filePath
    ]);

    return Boolean((result.stdout || '').trim());
  } catch (_error) {
    return false;
  }
};

const buildContentProgrammingInput = ({
  episode,
  result
}: {
  episode: {
    episodeId: string;
    episodeIndex: number;
  };
  result: Awaited<ReturnType<typeof buildAlgebraProductEntry>>;
}) => {
  return {
    coverText: result.publishingPack?.coverText,
    emphasisCueCount: result.emphasisPlan?.cues.length,
    emphasisKinds: Array.from(new Set((result.emphasisPlan?.cues ?? []).map((cue) => cue.kind))),
    episodeId: episode.episodeId,
    episodeIndex: episode.episodeIndex,
    family: result.family.id,
    hookStyle: result.videoHook?.style,
    hookText: result.videoHook?.text,
    presentationMode: result.presentationStrategy.id,
    qualityTier: result.qualityTier,
    title: result.publishingPack?.title
  };
};

const omitUndefined = <T extends Record<string, unknown>>(value: T) => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as Partial<T>;
};

const buildSyntheticVoiceCuePlan = (
  persona: 'calm_teacher' | 'exam_coach' | 'strict_teacher'
): VoiceCuePlan => {
  return {
    cues: [
      {
        cueId: 'vc1',
        endMs: 3000,
        persona,
        segments: [
          {
            localRate: 1,
            pauseAfterMs: 120,
            pauseBeforeMs: 0,
            segmentId: 'vc1-seg1',
            speakableText: '先别急着算，先看分母。',
            text: '先别急着算，先看分母。'
          }
        ],
        shotId: 'shot1',
        startMs: 0,
        stepId: 'step1',
        subtitleCueId: 'sub1',
        text: '先别急着算，先看分母。',
        voiceStyle: 'caution'
      }
    ]
  };
};

const buildSyntheticExpressiveVoiceCuePlan = (
  persona: 'calm_teacher' | 'exam_coach' | 'strict_teacher'
) => {
  return buildVoiceCuePlan(
    {
      introHook: '先看入口。',
      persona,
      steps: [
        {
          narration: '先看分母，再整理步骤，最后检查答案。',
          stepId: 'step1'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'sub1',
          endMs: 4200,
          shotId: 'shot1',
          startMs: 0,
          stepId: 'step1',
          text: '先看分母，再整理步骤，最后检查答案。'
        }
      ]
    }
  );
};

const collectTtsProviderIssues = async () => {
  const issues: string[] = [];
  const calmProfile = resolveVoiceStrategyProfile('calm_teacher');
  const strictProfile = resolveVoiceStrategyProfile('strict_teacher');
  const examProfile = resolveVoiceStrategyProfile('exam_coach');

  if (calmProfile.persona !== 'calm_teacher') {
    issues.push(`voice strategy profile mismatch for calm_teacher: got ${calmProfile.persona}`);
  }

  if (strictProfile.persona !== 'strict_teacher') {
    issues.push(`voice strategy profile mismatch for strict_teacher: got ${strictProfile.persona}`);
  }

  if (examProfile.persona !== 'exam_coach') {
    issues.push(`voice strategy profile mismatch for exam_coach: got ${examProfile.persona}`);
  }

  if (calmProfile.pausePattern.micro === strictProfile.pausePattern.micro) {
    issues.push('persona pause pattern not applied between calm_teacher and strict_teacher.');
  }

  if (strictProfile.pausePattern.micro === examProfile.pausePattern.micro) {
    issues.push('persona pause pattern not differentiated between strict_teacher and exam_coach.');
  }

  const mockCapabilities = getTtsProviderCapabilities('mock');
  const availableRealCapabilities = getTtsProviderCapabilities('real', {
    realProviderName: 'say'
  });
  const unavailableRealCapabilities = getTtsProviderCapabilities('real', {
    realProviderName: 'missing'
  });

  if (!mockCapabilities.available || mockCapabilities.outputFormat !== 'wav') {
    issues.push('mock provider capabilities invalid.');
  }

  if (
    !mockCapabilities.supportsRate ||
    !mockCapabilities.supportsPauseScale ||
    !mockCapabilities.supportsEmphasisBoost
  ) {
    issues.push('mock provider capability flags are incomplete.');
  }

  if (unavailableRealCapabilities.available || unavailableRealCapabilities.outputFormat !== 'wav') {
    issues.push('real provider capability resolution invalid for unavailable provider.');
  }

  if (!unavailableRealCapabilities.availabilityNote?.includes('real TTS provider unavailable')) {
    issues.push('real provider capability resolution missing unavailable note.');
  }

  if (availableRealCapabilities.available) {
    const calmVoiceMapping = resolveRealProviderVoiceMapping('say', calmProfile);
    const strictVoiceMapping = resolveRealProviderVoiceMapping('say', strictProfile);
    const examVoiceMapping = resolveRealProviderVoiceMapping('say', examProfile);

    if (!calmVoiceMapping?.voiceMapping.requestedVoiceName) {
      issues.push('calm_teacher real provider voice mapping missing.');
    }

    if (!strictVoiceMapping?.voiceMapping.requestedVoiceName) {
      issues.push('strict_teacher real provider voice mapping missing.');
    }

    if (!examVoiceMapping?.voiceMapping.requestedVoiceName) {
      issues.push('exam_coach real provider voice mapping missing.');
    }
  }

  const calmMockPlan = synthesizeVoiceCuePlan(buildSyntheticVoiceCuePlan('calm_teacher'), {
    outputDir: '/tmp/math-video-evaluation-tts/profile-calm',
    provider: 'mock'
  });
  const strictMockPlan = synthesizeVoiceCuePlan(buildSyntheticVoiceCuePlan('strict_teacher'), {
    outputDir: '/tmp/math-video-evaluation-tts/profile-strict',
    provider: 'mock'
  });

  if (
    !calmMockPlan.voiceStrategyProfile ||
    !strictMockPlan.voiceStrategyProfile ||
    calmMockPlan.voiceStrategyProfile.persona !== 'calm_teacher' ||
    strictMockPlan.voiceStrategyProfile.persona !== 'strict_teacher'
  ) {
    issues.push('persona to voice strategy profile mapping missing in synthesized plans.');
  }

  if ((calmMockPlan.segments[0]?.generatedDurationMs ?? 0) <= (strictMockPlan.segments[0]?.generatedDurationMs ?? 0)) {
    issues.push('voice strategy profile did not affect mock synthesis timing between calm_teacher and strict_teacher.');
  }

  const result = await buildAlgebraProductEntry('x/2+x/3=5', {
    ai: false,
    hookStyle: 'shortcut_first',
    includeLesson: false,
    returnReport: false,
    teachingPersona: 'exam_coach'
  });
  const voiceCuePlan = result.voiceCuePlan;

  if (!voiceCuePlan || voiceCuePlan.cues.length === 0) {
    return ['tts provider evaluation requires a non-empty voiceCuePlan.'];
  }

  const mockPlan = synthesizeVoiceCuePlan(voiceCuePlan, {
    outputDir: '/tmp/math-video-evaluation-tts/mock',
    provider: 'mock'
  });

  if (mockPlan.status !== 'available') {
    issues.push(`mock tts provider expected available, got ${mockPlan.status}`);
  }

  if (mockPlan.speechMode !== 'signal') {
    issues.push(`mock speechMode mismatch: expected signal, got ${mockPlan.speechMode}`);
  }

  if (mockPlan.provider !== 'mock' || mockPlan.requestedProvider !== 'mock') {
    issues.push(`mock provider resolution mismatch: requested ${mockPlan.requestedProvider}, got ${mockPlan.provider}`);
  }

  if (mockPlan.providerResolutionOrder?.resolvedProvider !== 'mock') {
    issues.push(`mock providerResolutionOrder mismatch: got ${mockPlan.providerResolutionOrder?.resolvedProvider}`);
  }

  if (mockPlan.voiceStrategyProfile?.persona !== 'exam_coach') {
    issues.push(`voice strategy profile persona mismatch for mock exam_coach plan: got ${mockPlan.voiceStrategyProfile?.persona}`);
  }

  if (!mockPlan.providerCapabilities?.available) {
    issues.push('mock plan missing provider capabilities metadata.');
  }

  if ((mockPlan.qa?.validSegmentCount ?? 0) <= 0) {
    issues.push(`mock plan qa.validSegmentCount invalid: ${mockPlan.qa?.validSegmentCount}`);
  }

  if (mockPlan.timelineMode !== 'sequential') {
    issues.push(`mock timelineMode mismatch: expected sequential, got ${mockPlan.timelineMode}`);
  }

  if (mockPlan.overlapDetected) {
    issues.push('mock plan overlapDetected should be false after sequential normalization.');
  }

  if (mockPlan.segments.length !== voiceCuePlan.cues.length) {
    issues.push(`mock audio segment count mismatch: expected ${voiceCuePlan.cues.length}, got ${mockPlan.segments.length}`);
  }

  if (!mockPlan.mixedFilePath) {
    issues.push('mock audio track missing mixedFilePath.');
  } else {
    if (!fs.existsSync(mockPlan.mixedFilePath)) {
      issues.push(`mock mixed audio track missing on disk: ${mockPlan.mixedFilePath}`);
    }

    const mixedDurationSec = getMediaDurationSec(mockPlan.mixedFilePath);

    if (!mixedDurationSec || mixedDurationSec <= 0) {
      issues.push(`mock mixed audio duration invalid: ${mockPlan.mixedFilePath}`);
    }
  }

  const voiceCueById = new Map(voiceCuePlan.cues.map((cue) => [cue.cueId, cue]));
  let expectedStartMs = 0;

  mockPlan.segments.forEach((segment) => {
    const voiceCue = voiceCueById.get(segment.cueId);

    if (!voiceCue) {
      issues.push(`mock audio segment cueId ${segment.cueId} does not map to voiceCuePlan`);
      return;
    }

    if (segment.startMs !== expectedStartMs) {
      issues.push(`mock audio segment start mismatch for ${segment.cueId}: expected ${expectedStartMs}, got ${segment.startMs}`);
    }

    if (segment.durationMs <= 0) {
      issues.push(`mock audio segment duration invalid for ${segment.cueId}`);
    }

    if (!segment.filePath.trim()) {
      issues.push(`mock audio segment filePath missing for ${segment.cueId}`);
    }

    if (segment.persona !== 'exam_coach') {
      issues.push(`mock audio segment persona mismatch for ${segment.cueId}: got ${segment.persona}`);
    }

    if (segment.provider !== 'mock') {
      issues.push(`mock audio segment provider mismatch for ${segment.cueId}: got ${segment.provider}`);
    }

    expectedStartMs += segment.durationMs;
  });

  if (availableRealCapabilities.available) {
    const realPlan = synthesizeVoiceCuePlan(voiceCuePlan, {
      outputDir: '/tmp/math-video-evaluation-tts/real-say',
      provider: 'real',
      realProviderName: 'say'
    });

    if (realPlan.status !== 'available') {
      issues.push(`say real provider expected available, got ${realPlan.status}`);
    }

    if (realPlan.provider !== 'real' || realPlan.requestedProvider !== 'real') {
      issues.push(`say real provider resolution mismatch: requested ${realPlan.requestedProvider}, got ${realPlan.provider}`);
    }

    if (realPlan.speechMode !== 'real_speech') {
      issues.push(`say real provider speechMode mismatch: expected real_speech, got ${realPlan.speechMode}`);
    }

    if ((realPlan.qa?.validSegmentCount ?? 0) <= 0) {
      issues.push(`say real provider qa.validSegmentCount invalid: ${realPlan.qa?.validSegmentCount}`);
    }

    if (realPlan.timelineMode !== 'sequential') {
      issues.push(`say real provider timelineMode mismatch: expected sequential, got ${realPlan.timelineMode}`);
    }

    if (realPlan.overlapDetected) {
      issues.push('say real provider overlapDetected should be false after sequential normalization.');
    }

    if (realPlan.providerResolutionOrder?.resolvedProvider !== 'real') {
      issues.push(`say real providerResolutionOrder mismatch: got ${realPlan.providerResolutionOrder?.resolvedProvider}`);
    }

    if (!realPlan.resolvedVoice?.actualVoiceName) {
      issues.push('say real provider missing resolvedVoice.actualVoiceName.');
    }

    if (!realPlan.segments.some((segment) => segment.textSource === 'speakable_text' || segment.textSource === 'mixed')) {
      issues.push('say real provider did not mark any segment as using speakableText.');
    }

    if (!realPlan.segments.some((segment) => {
      return (
        typeof segment.spokenText === 'string' &&
        typeof segment.displayText === 'string' &&
        segment.spokenText !== segment.displayText
      );
    })) {
      issues.push('say real provider did not emit any normalized spokenText distinct from displayText.');
    }
  }

  const unavailableRealPlan = synthesizeVoiceCuePlan(voiceCuePlan, {
    outputDir: '/tmp/math-video-evaluation-tts/real-unavailable',
    provider: 'real',
    realProviderName: 'missing'
  });

  if (unavailableRealPlan.status !== 'available') {
    issues.push(`missing real tts provider expected graceful fallback, got ${unavailableRealPlan.status}`);
  }

  if (unavailableRealPlan.provider !== 'mock' || unavailableRealPlan.requestedProvider !== 'real') {
    issues.push(
      `missing real tts provider fallback mismatch: requested ${unavailableRealPlan.requestedProvider}, got ${unavailableRealPlan.provider}`
    );
  }

  if (unavailableRealPlan.speechMode !== 'signal') {
    issues.push(`missing real tts provider fallback speechMode mismatch: got ${unavailableRealPlan.speechMode}`);
  }

  if (unavailableRealPlan.timelineMode !== 'sequential') {
    issues.push(`missing real tts provider fallback timelineMode mismatch: got ${unavailableRealPlan.timelineMode}`);
  }

  if ((unavailableRealPlan.qa?.validSegmentCount ?? 0) <= 0) {
    issues.push(`missing real tts provider fallback qa.validSegmentCount invalid: ${unavailableRealPlan.qa?.validSegmentCount}`);
  }

  if (unavailableRealPlan.providerResolutionOrder?.requestedProvider !== 'real') {
    issues.push('missing real tts provider fallback lost requestedProvider in providerResolutionOrder.');
  }

  if (unavailableRealPlan.providerResolutionOrder?.resolvedProvider !== 'mock') {
    issues.push(`missing real tts provider fallback resolvedProvider mismatch: ${unavailableRealPlan.providerResolutionOrder?.resolvedProvider}`);
  }

  if (unavailableRealPlan.segments.length !== voiceCuePlan.cues.length) {
    issues.push(
      `missing real tts provider should fall back to a full segment set, got ${unavailableRealPlan.segments.length}`
    );
  }

  if (unavailableRealPlan.voiceStrategyProfile?.persona !== 'exam_coach') {
    issues.push(
      `missing real tts provider should keep exam_coach profile, got ${unavailableRealPlan.voiceStrategyProfile?.persona}`
    );
  }

  if (!unavailableRealPlan.warnings?.some((warning) => warning.includes('fell back to mock'))) {
    issues.push('missing real tts provider did not emit a profile-based fallback warning.');
  }

  return issues;
};

const collectVoiceExpressivenessIssues = () => {
  const issues: string[] = [];
  const calmPlan = buildSyntheticExpressiveVoiceCuePlan('calm_teacher');
  const strictPlan = buildSyntheticExpressiveVoiceCuePlan('strict_teacher');
  const examPlan = buildSyntheticExpressiveVoiceCuePlan('exam_coach');
  const calmSegments = calmPlan.cues[0]?.segments ?? [];
  const strictSegments = strictPlan.cues[0]?.segments ?? [];
  const examSegments = examPlan.cues[0]?.segments ?? [];

  if (calmSegments.length >= strictSegments.length) {
    issues.push('strict_teacher should split the same sentence into more segments than calm_teacher.');
  }

  if (examSegments.length <= calmSegments.length) {
    issues.push('exam_coach should produce a denser segment plan than calm_teacher.');
  }

  const examRepeats = new Set(examSegments.map((segment) => segment.text)).size !== examSegments.length;

  if (!examRepeats) {
    issues.push('exam_coach segment plan should include reinforcement-style repetition.');
  }

  const expressivePlan = buildVoiceCuePlan(
    {
      hook: {
        style: 'question_first',
        targetStepId: 'step1',
        text: '这一步为什么最容易错？'
      },
      outroSummary: '考前最后检查这三件事：入口、关键步骤、答案格式。',
      persona: 'strict_teacher',
      steps: [
        {
          emphasis: '先识别结构，再按规则推进。',
          mistakeWarning: '别把分母直接约掉。',
          narration: '先看分母，再整理步骤，最后检查答案。',
          stepId: 'step1'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'sub1',
          endMs: 5200,
          shotId: 'shot1',
          startMs: 0,
          stepId: 'step1',
          text: '先看分母，再整理步骤，最后检查答案。'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'em1',
          endMs: 1200,
          kind: 'hook',
          priority: 80,
          shotId: 'shot1',
          source: 'video_hook',
          startMs: 0,
          stepId: 'step1',
          subtitleCueId: 'sub1',
          text: '这一步为什么最容易错？'
        },
        {
          cueId: 'em2',
          endMs: 2400,
          kind: 'mistake',
          priority: 85,
          shotId: 'shot1',
          source: 'mistake_warning',
          startMs: 1200,
          stepId: 'step1',
          subtitleCueId: 'sub1',
          text: '别把分母直接约掉。'
        },
        {
          cueId: 'em3',
          endMs: 3600,
          kind: 'rule',
          priority: 70,
          shotId: 'shot1',
          source: 'step_emphasis',
          startMs: 2400,
          stepId: 'step1',
          subtitleCueId: 'sub1',
          text: '先识别结构，再按规则推进。'
        },
        {
          cueId: 'em4',
          endMs: 5200,
          kind: 'result',
          priority: 75,
          shotId: 'shot1',
          source: 'outro_summary',
          startMs: 3600,
          stepId: 'step1',
          subtitleCueId: 'sub1',
          text: '考前最后检查这三件事：入口、关键步骤、答案格式。'
        }
      ]
    }
  );
  const expressiveSegments = expressivePlan.cues[0]?.segments ?? [];
  const mappedEmphasisTypes = new Set(expressiveSegments.map((segment) => segment.emphasisType).filter(Boolean));

  ['hook', 'mistake', 'rule', 'result'].forEach((emphasisType) => {
    if (!mappedEmphasisTypes.has(emphasisType as 'hook' | 'mistake' | 'rule' | 'result')) {
      issues.push(`voice segments missing mapped emphasisType ${emphasisType}.`);
    }
  });

  if (!(expressiveSegments.some((segment) => segment.pauseBeforeType || segment.pauseAfterType))) {
    issues.push('voice segments missing semantic pause types.');
  }

  const ruleSegment = expressiveSegments.find((segment) => segment.emphasisType === 'rule');
  if (ruleSegment?.pauseBeforeType !== 'emphasis') {
    issues.push('emphasis pause not applied to rule segment.');
  }

  const resultSegment = expressiveSegments.find((segment) => segment.emphasisType === 'result');
  if (resultSegment?.pauseAfterType !== 'result') {
    issues.push('result pause not applied to result segment.');
  }

  const examChecklistOutroPlan = buildVoiceCuePlan(
    {
      outroSummary: '考前最后检查这三件事：入口、关键步骤、答案格式。',
      persona: 'exam_coach',
      steps: [
        {
          narration: '答案已经出来了。',
          stepId: 'step1'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'sub1',
          endMs: 2600,
          shotId: 'shot1',
          startMs: 0,
          stepId: 'step1',
          text: '答案已经出来了。'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'em1',
          endMs: 2600,
          kind: 'result',
          priority: 70,
          shotId: 'shot1',
          source: 'outro_summary',
          startMs: 0,
          stepId: 'step1',
          subtitleCueId: 'sub1',
          text: '考前最后检查这三件事：入口、关键步骤、答案格式。'
        }
      ]
    }
  );
  const nextEpisodeOutroPlan = buildVoiceCuePlan(
    {
      outroSummary: '这一题的入口先记住，下一集继续接同系列高频题。',
      persona: 'exam_coach',
      steps: [
        {
          narration: '答案已经出来了。',
          stepId: 'step1'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'sub1',
          endMs: 2600,
          shotId: 'shot1',
          startMs: 0,
          stepId: 'step1',
          text: '答案已经出来了。'
        }
      ]
    },
    {
      cues: [
        {
          cueId: 'em1',
          endMs: 2600,
          kind: 'result',
          priority: 70,
          shotId: 'shot1',
          source: 'outro_summary',
          startMs: 0,
          stepId: 'step1',
          subtitleCueId: 'sub1',
          text: '这一题的入口先记住，下一集继续接同系列高频题。'
        }
      ]
    }
  );
  const examChecklistHints = new Set(
    (examChecklistOutroPlan.cues[0]?.segments ?? [])
      .map((segment) => segment.outroStyleHint)
      .filter(Boolean)
  );
  const nextEpisodeHints = new Set(
    (nextEpisodeOutroPlan.cues[0]?.segments ?? [])
      .map((segment) => segment.outroStyleHint)
      .filter(Boolean)
  );

  if (!examChecklistHints.has('exam_checklist')) {
    issues.push('exam_checklist outro style not visible in voice segments.');
  }

  if (!nextEpisodeHints.has('next_episode_tease')) {
    issues.push('next_episode_tease outro style not visible in voice segments.');
  }

  if (
    (examChecklistOutroPlan.cues[0]?.segments.length ?? 0) ===
    (nextEpisodeOutroPlan.cues[0]?.segments.length ?? 0)
  ) {
    issues.push('different outro styles should produce different voice segment layouts.');
  }

  return issues;
};

const collectSpeakableTextIssues = async () => {
  const issues: string[] = [];
  const sampleCases = [
    {
      expectedContains: ['x', '等于', '6'],
      input: 'x=6'
    },
    {
      expectedContains: ['x', '大于等于', '2'],
      input: 'x≥2'
    },
    {
      expectedContains: ['除以', '等于', '5'],
      input: 'x/2+x/3=5'
    },
    {
      expectedContains: ['除以', '大于', '0'],
      input: '(x-1)/(x+2)>0'
    },
    {
      expectedContains: ['根号', 'x 的平方', '等于'],
      input: '√(x+1)=x^2'
    },
    {
      expectedContains: ['左开区间', '负无穷', '并集', '正无穷'],
      input: '(-∞,-2)∪(1,+∞)'
    },
    {
      expectedContains: ['有序数对', 'x', 'y', '等于', '3', '2'],
      input: '(x,y)=(3,2)'
    }
  ] as const;

  sampleCases.forEach((sampleCase) => {
    const speakableText = normalizeSpeakableText(sampleCase.input);

    if (!speakableText.trim()) {
      issues.push(`speakableText empty for sample ${sampleCase.input}`);
      return;
    }

    sampleCase.expectedContains.forEach((fragment) => {
      if (!speakableText.includes(fragment)) {
        issues.push(`speakableText normalization missing "${fragment}" for sample ${sampleCase.input}: ${speakableText}`);
      }
    });
  });

  const result = await buildAlgebraProductEntry('(x-1)/(x+2)>0', {
    ai: false,
    includeLesson: false,
    returnReport: false,
    teachingPersona: 'strict_teacher'
  });
  const cueSegments = result.voiceCuePlan?.cues.flatMap((cue) => cue.segments) ?? [];

  if (cueSegments.length === 0) {
    return ['speakable text evaluation requires voice cue segments.'];
  }

  cueSegments.forEach((segment) => {
    if (!segment.speakableText.trim()) {
      issues.push(`voice segment speakableText missing for ${segment.segmentId}`);
    }
  });

  return issues;
};

const collectAudioFinalizationIssues = async () => {
  const issues: string[] = [];
  const equation = 'x/2+x/3=5';
  const baseName = 'algebra-video-x-2-x-3-5';
  const audioTrackPath = `out/${baseName}.audio-track.json`;
  const voicedMp4Path = `out/${baseName}.voiced.mp4`;
  const requestedProvider = getTtsProviderCapabilities('real', {
    realProviderName: 'say'
  }).available
    ? 'real'
    : 'mock';

  try {
    runLocalCommand('npm', ['run', 'video', '--', equation, '--tts', requestedProvider]);
  } catch (error) {
    return [`audio finalization render failed: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (!fs.existsSync(audioTrackPath)) {
    issues.push(`audio track plan output missing: ${audioTrackPath}`);
    return issues;
  }

  const audioTrackPlan = JSON.parse(fs.readFileSync(audioTrackPath, 'utf8')) as {
    mixedFilePath?: string;
    overlapDetected?: boolean;
    provider: string;
    qa?: {
      hasAudioStream?: boolean;
      isNonSilent?: boolean;
      mixedDurationMs?: number;
      validSegmentCount?: number;
      warnings?: string[];
    };
    requestedProvider?: string;
    segments?: Array<{
      durationMs: number;
      startMs: number;
    }>;
    speechMode?: string;
    status: string;
    timelineMode?: string;
    warnings?: string[];
  };

  if (audioTrackPlan.timelineMode !== 'sequential') {
    issues.push(`audioTrackPlan timelineMode mismatch: expected sequential, got ${audioTrackPlan.timelineMode}`);
  }

  if (audioTrackPlan.overlapDetected) {
    issues.push('audioTrackPlan overlapDetected should be false after sequential normalization.');
  }

  let expectedSegmentStartMs = 0;
  (audioTrackPlan.segments ?? []).forEach((segment, index) => {
    if (segment.startMs !== expectedSegmentStartMs) {
      issues.push(`audioTrackPlan segment start mismatch at index ${index}: expected ${expectedSegmentStartMs}, got ${segment.startMs}`);
    }

    expectedSegmentStartMs += segment.durationMs;
  });

  if (audioTrackPlan.status === 'available') {
    if ((audioTrackPlan.qa?.validSegmentCount ?? 0) <= 0) {
      issues.push(`audioTrackPlan qa.validSegmentCount invalid: ${audioTrackPlan.qa?.validSegmentCount}`);
    }

    if (!audioTrackPlan.qa?.isNonSilent) {
      issues.push('audioTrackPlan mixed audio QA flagged silent or missing non-silent detection.');
    }

    if (!audioTrackPlan.mixedFilePath) {
      issues.push('audioTrackPlan status=available but mixedFilePath missing.');
    } else {
      if (!fs.existsSync(audioTrackPlan.mixedFilePath)) {
        issues.push(`mixed audio file missing: ${audioTrackPlan.mixedFilePath}`);
      }

      const audioDurationSec = getMediaDurationSec(audioTrackPlan.mixedFilePath);

      if (!audioDurationSec || audioDurationSec <= 0) {
        issues.push(`mixed audio duration invalid: ${audioTrackPlan.mixedFilePath}`);
      }

      if ((audioTrackPlan.qa?.mixedDurationMs ?? 0) <= 0) {
        issues.push(`audioTrackPlan qa.mixedDurationMs invalid: ${audioTrackPlan.qa?.mixedDurationMs}`);
      }
    }
  }

  if (!fs.existsSync(voicedMp4Path)) {
    issues.push(`voiced mp4 missing: ${voicedMp4Path}`);
    return issues;
  }

  if (audioTrackPlan.speechMode === 'real_speech') {
    if (!audioTrackPlan.qa?.hasAudioStream) {
      issues.push('speechMode=real_speech but audioTrackPlan.qa.hasAudioStream is false.');
    }

    if (!hasAudioStream(voicedMp4Path)) {
      issues.push(`voiced mp4 missing audio stream for real_speech provider: ${voicedMp4Path}`);
    }
  }

  if (audioTrackPlan.status === 'available') {
    const voicedDurationSec = getMediaDurationSec(voicedMp4Path);

    if (!voicedDurationSec || voicedDurationSec <= 0) {
      issues.push(`voiced mp4 duration invalid: ${voicedMp4Path}`);
    }
  }

  if (requestedProvider === 'real' && audioTrackPlan.requestedProvider !== 'real') {
    issues.push(`audioTrackPlan requestedProvider mismatch for real render: ${audioTrackPlan.requestedProvider}`);
  }

  return issues;
};

const collectBatchProductionIssues = async () => {
  const issues: string[] = [];
  const dataset = getBatchDataset('starter-five');

  if (!dataset) {
    return ['starter-five batch dataset missing.'];
  }

  const plan = buildBatchProductionPlan(dataset, {
    includeAudioTrack: true,
    includeVideo: true,
    outputRoot: 'out'
  });
  const expectedSeriesDir = `out/series-${slugifyBatchPathPart(dataset.seriesId)}`;
  const seenOutputDirs = new Set<string>();
  const provisionalEpisodeEntries: Array<{
    episode: (typeof plan.episodes)[number];
    result: Awaited<ReturnType<typeof buildAlgebraProductEntry>>;
  }> = [];

  if (plan.episodes.length !== dataset.equations.length) {
    issues.push(`batch episode count mismatch: expected ${dataset.equations.length}, got ${plan.episodes.length}`);
  }

  plan.episodes.forEach((episode, index) => {
    const expectedIndex = index + 1;
    const expectedNumber = String(expectedIndex).padStart(3, '0');

    if (episode.episodeIndex !== expectedIndex) {
      issues.push(`batch episodeIndex mismatch for ${episode.equation}: expected ${expectedIndex}, got ${episode.episodeIndex}`);
    }

    if (episode.episodeNumber !== expectedNumber) {
      issues.push(`batch episodeNumber mismatch for ${episode.equation}: expected ${expectedNumber}, got ${episode.episodeNumber}`);
    }

    if (!episode.outputDir.startsWith(`${expectedSeriesDir}/${expectedNumber}-`)) {
      issues.push(`batch outputDir is not standardized for ${episode.equation}: ${episode.outputDir}`);
    }

    if (seenOutputDirs.has(episode.outputDir)) {
      issues.push(`batch duplicate outputDir: ${episode.outputDir}`);
    }
    seenOutputDirs.add(episode.outputDir);

    const requiredAssetPaths = [
      episode.assetPaths.html,
      episode.assetPaths.productEntry,
      episode.assetPaths.publishing,
      episode.assetPaths.renderPlan,
      episode.assetPaths.srt,
      episode.assetPaths.subtitleCues,
      episode.assetPaths.timelineHtml,
      episode.assetPaths.voiceCueSpeakableText,
      episode.assetPaths.voiceCues,
      episode.assetPaths.voiceCueSrt,
      episode.assetPaths.voiceCueText,
      episode.assetPaths.audioTrack,
      episode.assetPaths.mp4,
      episode.assetPaths.voicedMp4
    ];

    requiredAssetPaths.forEach((assetPath) => {
      if (!assetPath?.startsWith(`${episode.outputDir}/`)) {
        issues.push(`batch asset path missing or outside outputDir for ${episode.equation}: ${assetPath ?? 'undefined'}`);
      }
    });
  });

  for (const [index, datasetEquation] of dataset.equations.entries()) {
    const episode = plan.episodes[index];
    const result = await buildAlgebraProductEntry(datasetEquation.equation, {
      ai: false,
      hookStyle: datasetEquation.hookStyle,
      includeLesson: false,
      presentationMode: datasetEquation.presentationMode,
      publishingSeries: {
        episodeIndex: episode.episodeIndex,
        seriesId: dataset.seriesId,
        seriesName: dataset.seriesName
      },
      returnReport: false,
      teachingPersona: datasetEquation.teachingPersona
    });
    provisionalEpisodeEntries.push({episode, result});
    const publishingPack = result.publishingPack;

    if (!publishingPack) {
      issues.push(`batch publishingPack missing for ${datasetEquation.equation}`);
      continue;
    }

    if (publishingPack.series?.episodeIndex !== episode.episodeIndex) {
      issues.push(`publishingPack episodeIndex mismatch for ${datasetEquation.equation}`);
    }

    if (publishingPack.series?.episodeNumber !== episode.episodeNumber) {
      issues.push(`publishingPack episodeNumber mismatch for ${datasetEquation.equation}`);
    }

    if (publishingPack.series?.seriesId !== dataset.seriesId) {
      issues.push(`publishingPack seriesId mismatch for ${datasetEquation.equation}`);
    }

    if (!publishingPack.title.includes(`第${episode.episodeIndex}题`)) {
      issues.push(`publishingPack title missing episode marker for ${datasetEquation.equation}`);
    }

    if (!publishingPack.coverText.trim() || publishingPack.hashtags.length < 2) {
      issues.push(`publishingPack publish assets incomplete for ${datasetEquation.equation}`);
    }

    const renderPlan = result.shotPlan ? buildVideoRenderPlan(result.shotPlan) : undefined;
    const renderShotById = new Map(renderPlan?.shots.map((shot) => [shot.shotId, shot]) ?? []);
    const coverShot = publishingPack.coverFrame.shotId
      ? renderShotById.get(publishingPack.coverFrame.shotId)
      : undefined;

    if (publishingPack.coverFrame.shotId && !coverShot) {
      issues.push(`batch coverFrame shotId mismatch for ${datasetEquation.equation}`);
    }

    if (renderPlan && publishingPack.coverFrame.timestampMs !== undefined) {
      const timestampMs = publishingPack.coverFrame.timestampMs;

      if (timestampMs < 0 || timestampMs > renderPlan.durationMs) {
        issues.push(`batch coverFrame timestamp out of range for ${datasetEquation.equation}`);
      } else if (coverShot && (timestampMs < coverShot.startMs || timestampMs >= coverShot.endMs)) {
        issues.push(`batch coverFrame timestamp not aligned to shot for ${datasetEquation.equation}`);
      }
    }
  }

  const contentProgramming = buildBatchContentProgrammingPlan(
    dataset,
    provisionalEpisodeEntries.map(({episode, result}) => buildContentProgrammingInput({episode, result}))
  );
  const episodeProgrammingById = new Map(
    contentProgramming.episodes.map((episodeProgramming) => [episodeProgramming.episodeId, episodeProgramming])
  );
  const executedEpisodes: Array<{
    contentProgramming: ReturnType<typeof episodeProgrammingById.get>;
    episode: (typeof plan.episodes)[number];
    productEntry: ReturnType<typeof applyBatchTemplateExecutionMetadata>;
  }> = [];

  for (const [index, datasetEquation] of dataset.equations.entries()) {
    const episode = plan.episodes[index];
    const episodeProgramming = episodeProgrammingById.get(episode.episodeId);
    const templateExecution = resolveBatchEpisodeTemplateExecution({
      templateSnapshot: episodeProgramming?.templateSnapshot
    });
    const buildOverrides = {
      hookStyle: templateExecution.buildOverrides.hookStyle ?? datasetEquation.hookStyle,
      presentationMode: templateExecution.buildOverrides.presentationMode ?? datasetEquation.presentationMode,
      teachingPersona: templateExecution.buildOverrides.teachingPersona ?? datasetEquation.teachingPersona
    };
    const executedProductEntry = applyBatchTemplateExecutionMetadata(
      await buildAlgebraProductEntry(datasetEquation.equation, {
        ai: false,
        ...omitUndefined(buildOverrides),
        includeLesson: false,
        publishingSeries: {
          episodeIndex: episode.episodeIndex,
          seriesId: dataset.seriesId,
          seriesName: dataset.seriesName
        },
        returnReport: false
      }),
      templateExecution
    );
    const deeplyExecutedProductEntry = applyBatchTemplateDeepExecution(
      executedProductEntry,
      episodeProgramming?.templateSnapshot
    );

    executedEpisodes.push({
      contentProgramming: episodeProgramming,
      episode,
      productEntry: deeplyExecutedProductEntry
    });
  }

  const seriesRhythmTemplates = Array.from(
    new Map(
      [
        contentProgramming.dataset.templateSnapshot,
        contentProgramming.series.templateSnapshot,
        ...contentProgramming.episodes.map((episodeProgramming) => episodeProgramming.templateSnapshot)
      ]
        .filter((template): template is NonNullable<typeof contentProgramming.dataset.templateSnapshot> => Boolean(template))
        .map((template) => [template.id, template])
    ).values()
  );
  const executedEpisodeById = new Map(
    executedEpisodes.map((executedEpisode) => [executedEpisode.episode.episodeId, executedEpisode])
  );
  const manifest = {
    dataset: {
      id: dataset.id,
      name: dataset.name,
      contentProgramming: contentProgramming.dataset
    },
    episodeCount: plan.episodes.length,
    episodes: plan.episodes.map((episode) => ({
      ...(executedEpisodeById.get(episode.episodeId)?.productEntry.appliedOverrides
        ? {
            appliedDurationBandSec: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedDurationBandSec,
            appliedEmphasisBias: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedEmphasisBias,
            appliedOverrides: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedOverrides,
            appliedOutroStyle: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedOutroStyle,
            appliedTemplateId: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedTemplateId
          }
        : {
            appliedDurationBandSec: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedDurationBandSec,
            appliedEmphasisBias: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedEmphasisBias,
            appliedOutroStyle: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedOutroStyle,
            appliedTemplateId: executedEpisodeById.get(episode.episodeId)?.productEntry.appliedTemplateId
          }),
      contentProgramming: episodeProgrammingById.get(episode.episodeId),
      episodeId: episode.episodeId,
      episodeIndex: episode.episodeIndex,
      episodeNumber: episode.episodeNumber,
      equation: episode.equation
    })),
    series: {
      ...plan.series,
      contentProgramming: contentProgramming.series
    },
    seriesRhythmTemplates
  };

  (['cold_start_reach', 'mistake_prevention', 'exam_revision', 'series_playlist'] as const).forEach((useCase) => {
    const template = resolveSeriesRhythmTemplateForUseCase(useCase);

    if (!template) {
      issues.push(`series rhythm template missing for useCase ${useCase}`);
      return;
    }

    if (!isCompleteSeriesRhythmTemplate(template)) {
      issues.push(`series rhythm template incomplete for useCase ${useCase}`);
    }
  });

  if (!manifest.dataset.contentProgramming || !manifest.series.contentProgramming) {
    issues.push('batch manifest missing dataset/series contentProgramming.');
  }

  if (manifest.episodes.some((episode) => !episode.contentProgramming)) {
    issues.push('batch manifest missing episode contentProgramming.');
  }

  const recommendedOrders = manifest.episodes
    .map((episode) => episode.contentProgramming?.recommendedPublishingOrder)
    .filter((order): order is number => typeof order === 'number')
    .sort((left, right) => left - right);

  if (recommendedOrders.length !== manifest.episodes.length) {
    issues.push('batch manifest recommendedPublishingOrder missing on one or more episodes.');
  } else {
    recommendedOrders.forEach((order, index) => {
      const expectedOrder = index + 1;

      if (order !== expectedOrder) {
        issues.push(`batch manifest recommendedPublishingOrder must be continuous: expected ${expectedOrder}, got ${order}`);
      }
    });
  }

  if (!isValidPublishPriorityScore(contentProgramming.dataset.publishPriorityScore)) {
    issues.push(`dataset publishPriorityScore invalid: ${contentProgramming.dataset.publishPriorityScore}`);
  }

  if (!isValidPublishPriorityScore(contentProgramming.series.publishPriorityScore)) {
    issues.push(`series publishPriorityScore invalid: ${contentProgramming.series.publishPriorityScore}`);
  }

  manifest.episodes.forEach((episode) => {
    const episodeProgramming = episode.contentProgramming;
    const executedEpisode = executedEpisodeById.get(episode.episodeId);

    if (!episodeProgramming) {
      return;
    }

    if (!isValidPublishPriorityScore(episodeProgramming.publishPriorityScore)) {
      issues.push(
        `publishPriorityScore invalid for ${episode.equation}: ${episodeProgramming.publishPriorityScore}`
      );
    }

    if (!episodeProgramming.recommendedTemplateId) {
      issues.push(`recommendedTemplateId missing for ${episode.equation}`);
    }

    if (!episodeProgramming.templateSnapshot) {
      issues.push(`templateSnapshot missing for ${episode.equation}`);
      return;
    }

    if (episodeProgramming.templateSnapshot.id !== episodeProgramming.recommendedTemplateId) {
      issues.push(`templateSnapshot id mismatch for ${episode.equation}`);
    }

    if (episodeProgramming.templateSnapshot.useCase !== episodeProgramming.recommendedUseCase) {
      issues.push(`templateSnapshot useCase mismatch for ${episode.equation}`);
    }

    if (!isCompleteSeriesRhythmTemplate(episodeProgramming.templateSnapshot)) {
      issues.push(`templateSnapshot incomplete for ${episode.equation}`);
    }

    if (!episode.appliedTemplateId) {
      issues.push(`appliedTemplateId missing for ${episode.equation}`);
    } else if (episode.appliedTemplateId !== episodeProgramming.recommendedTemplateId) {
      issues.push(`appliedTemplateId mismatch for ${episode.equation}`);
    }

    if (!executedEpisode) {
      issues.push(`executed product entry missing for ${episode.equation}`);
      return;
    }

    if (executedEpisode.productEntry.teachingPersona.id !== episodeProgramming.templateSnapshot?.preferredPersona) {
      issues.push(`teachingPersona template override not applied for ${episode.equation}`);
    }

    if (executedEpisode.productEntry.videoHook?.style !== episodeProgramming.templateSnapshot?.preferredHookStyle) {
      issues.push(`videoHook.style template override not applied for ${episode.equation}`);
    }

    if (executedEpisode.productEntry.presentationStrategy.id !== episodeProgramming.templateSnapshot?.preferredPresentationMode) {
      issues.push(`presentationStrategy template override not applied for ${episode.equation}`);
    }

    if (!executedEpisode.productEntry.appliedOverrides) {
      issues.push(`appliedOverrides missing for ${episode.equation}`);
    }

    if (!executedEpisode.productEntry.appliedDurationBandSec) {
      issues.push(`appliedDurationBandSec missing for ${episode.equation}`);
    } else {
      const appliedDurationBandSec = executedEpisode.productEntry.appliedDurationBandSec;

      if (
        appliedDurationBandSec.actualDurationSec <= 0 ||
        appliedDurationBandSec.targetDurationSec < appliedDurationBandSec.min ||
        appliedDurationBandSec.targetDurationSec > appliedDurationBandSec.max
      ) {
        issues.push(`appliedDurationBandSec invalid for ${episode.equation}`);
      }
    }

    if (executedEpisode.productEntry.appliedEmphasisBias !== episodeProgramming.templateSnapshot.emphasisBias) {
      issues.push(`appliedEmphasisBias mismatch for ${episode.equation}`);
    }

    if (executedEpisode.productEntry.appliedOutroStyle !== episodeProgramming.templateSnapshot.outroStyle) {
      issues.push(`appliedOutroStyle mismatch for ${episode.equation}`);
    }

    if (!executedEpisode.productEntry.teachingScript?.outroSummary?.includes('。')) {
      issues.push(`outroSummary missing after deep execution for ${episode.equation}`);
    }

    if (
      executedEpisode.productEntry.appliedEmphasisBias &&
      executedEpisode.productEntry.emphasisPlan?.cues.length
    ) {
      const highestPriorityCue = [...executedEpisode.productEntry.emphasisPlan.cues].sort(
        (left, right) => right.priority - left.priority || left.startMs - right.startMs
      )[0];
      const expectedLeadingKind =
        executedEpisode.productEntry.appliedEmphasisBias === 'hook_first'
          ? 'hook'
          : executedEpisode.productEntry.appliedEmphasisBias === 'mistake_first'
            ? 'mistake'
            : executedEpisode.productEntry.appliedEmphasisBias === 'exam_tip_first' ||
                executedEpisode.productEntry.appliedEmphasisBias === 'rule_first'
              ? 'rule'
              : 'result';

      if (highestPriorityCue?.kind !== expectedLeadingKind) {
        issues.push(`emphasis bias not reflected in priority for ${episode.equation}`);
      }
    }

    if (
      executedEpisode.productEntry.appliedOutroStyle &&
      !executedEpisode.productEntry.publishingPack?.caption
        .includes(executedEpisode.productEntry.teachingScript?.outroSummary ?? '')
    ) {
      issues.push(`publishingPack caption missing outroStyle trace for ${episode.equation}`);
    }
  });

  if (manifest.seriesRhythmTemplates.length < 4) {
    issues.push(
      `seriesRhythmTemplates coverage incomplete: expected >= 4, got ${manifest.seriesRhythmTemplates.length}`
    );
  }

  return issues;
};

const main = async () => {
  const failures: FailureRecord[] = [];
  const familyStats = new Map<string, FamilyStats>();
  const qualityTierStats = new Map<string, number>();
  const qualityStats = new Map<string, number>();
  const presentationSourceStats = new Map<string, number>();
  const presentationStats = new Map<string, number>();
  let fallbackCount = 0;
  let renderableCount = 0;
  let robustnessCount = 0;
  let robustnessPassedCount = 0;
  let unsupportedCount = 0;
  let passedCount = 0;

  for (const evaluationCase of ALGEBRA_EVALUATION_CASES) {
    const {issues, result} = await collectCaseIssues(evaluationCase);
    const familyStat = familyStats.get(evaluationCase.expectedFamily) ?? {passed: 0, total: 0};

    familyStat.total += 1;

    if (issues.length === 0) {
      passedCount += 1;
      familyStat.passed += 1;

      if (evaluationCase.expectedNormalizedEquation) {
        robustnessPassedCount += 1;
      }
    } else {
      failures.push({
        description: evaluationCase.description,
        equation: evaluationCase.equation,
        issues
      });
    }

    familyStats.set(evaluationCase.expectedFamily, familyStat);
    presentationSourceStats.set(result.presentationSource, (presentationSourceStats.get(result.presentationSource) ?? 0) + 1);
    presentationStats.set(result.presentationStrategy.id, (presentationStats.get(result.presentationStrategy.id) ?? 0) + 1);
    qualityTierStats.set(result.qualityTier, (qualityTierStats.get(result.qualityTier) ?? 0) + 1);
    qualityStats.set(result.quality, (qualityStats.get(result.quality) ?? 0) + 1);

    if (evaluationCase.expectedNormalizedEquation) {
      robustnessCount += 1;
    }

    if (result.quality === 'fallback') {
      fallbackCount += 1;
    }

    if (result.quality === 'unsupported') {
      unsupportedCount += 1;
    }

    if (result.render.renderable) {
      renderableCount += 1;
    }
  }

  const ttsProviderIssues = await collectTtsProviderIssues();

  if (ttsProviderIssues.length > 0) {
    failures.push({
      description: 'tts provider contract',
      equation: 'x/2+x/3=5',
      issues: ttsProviderIssues
    });
  }

  const voiceExpressivenessIssues = collectVoiceExpressivenessIssues();

  if (voiceExpressivenessIssues.length > 0) {
    failures.push({
      description: 'voice expressiveness contract',
      equation: 'voice:persona-segmentation',
      issues: voiceExpressivenessIssues
    });
  }

  const speakableTextIssues = await collectSpeakableTextIssues();

  if (speakableTextIssues.length > 0) {
    failures.push({
      description: 'speakable text normalization contract',
      equation: 'voice:speakable-text',
      issues: speakableTextIssues
    });
  }

  const batchProductionIssues = await collectBatchProductionIssues();

  if (batchProductionIssues.length > 0) {
    failures.push({
      description: 'batch production contract',
      equation: 'dataset:starter-five',
      issues: batchProductionIssues
    });
  }

  const audioFinalizationIssues = await collectAudioFinalizationIssues();

  if (audioFinalizationIssues.length > 0) {
    failures.push({
      description: 'audio finalization contract',
      equation: 'x/2+x/3=5',
      issues: audioFinalizationIssues
    });
  }

  const totalCount = ALGEBRA_EVALUATION_CASES.length;

  console.log(`[evaluation] total: ${passedCount}/${totalCount} passed (${formatPercent(totalCount === 0 ? 1 : passedCount / totalCount)})`);

  Array.from(familyStats.entries())
    .sort((left, right) => left[0].localeCompare(right[0], 'en'))
    .forEach(([family, stats]) => {
      console.log(
        `[evaluation] family ${family}: ${stats.passed}/${stats.total} passed (${formatPercent(
          stats.total === 0 ? 1 : stats.passed / stats.total
        )})`
      );
    });

  console.log(
    `[evaluation] quality counts: ${Array.from(qualityStats.entries())
      .sort((left, right) => left[0].localeCompare(right[0], 'en'))
      .map(([quality, count]) => `${quality}=${count}`)
      .join(', ')}`
  );
  console.log(
    `[evaluation] quality tier counts: ${Array.from(qualityTierStats.entries())
      .sort((left, right) => left[0].localeCompare(right[0], 'en'))
      .map(([qualityTier, count]) => `${qualityTier}=${count}`)
      .join(', ')}`
  );
  console.log(
    `[evaluation] presentation strategy counts: ${Array.from(presentationStats.entries())
      .sort((left, right) => left[0].localeCompare(right[0], 'en'))
      .map(([presentationStrategy, count]) => `${presentationStrategy}=${count}`)
      .join(', ')}`
  );
  console.log(
    `[evaluation] presentation source counts: ${Array.from(presentationSourceStats.entries())
      .sort((left, right) => left[0].localeCompare(right[0], 'en'))
      .map(([presentationSource, count]) => `${presentationSource}=${count}`)
      .join(', ')}`
  );
  console.log(`[evaluation] fallback/unsupported: fallback=${fallbackCount}, unsupported=${unsupportedCount}`);
  console.log(`[evaluation] robustness normalization: ${robustnessPassedCount}/${robustnessCount}`);
  console.log(`[evaluation] renderable: ${renderableCount}/${totalCount}`);

  if (failures.length > 0) {
    failures.forEach((failure) => {
      console.log(`[evaluation] FAIL ${failure.description} (${failure.equation})`);
      failure.issues.forEach((issue) => {
        console.log(`  - ${issue}`);
      });
    });

    process.exitCode = 1;
    return;
  }

  console.log('[evaluation] all cases passed.');
};

void main();

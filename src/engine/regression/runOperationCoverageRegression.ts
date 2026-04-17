import type {AlgebraOperationTypeV2, AlgebraStep} from '../../types/algebra';
import {
  buildEnhancementPrompt,
  toAIEnhancementPromptSteps
} from '../ai/buildEnhancementPrompt';
import {
  buildTokenMapEnhancementPrompt,
  toTokenMapEnhancementPromptSteps
} from '../ai/buildTokenMapEnhancementPrompt';
import {
  buildVisualActionsEnhancementPrompt,
  toVisualActionsEnhancementPromptSteps
} from '../ai/buildVisualActionsEnhancementPrompt';
import {generateAlgebraStepsV2Draft} from '../generator';
import {buildEnhancedLessonProblem} from '../integration';
import {getOperationAnswerLabel, hasOperationDrivenGuide} from '../../utils/renderOperations';
import {OPERATION_TEMPLATE_KIND, normalizeProblemWithTemplate, resolveTemplateKindForStep} from '../../utils/templates';
import {
  OPERATION_COVERAGE_MATRIX,
  OPERATION_REGRESSION_CASES,
  UNSUPPORTED_COMPLEX_FRACTION_INEQUALITY_REGRESSION_EQUATION,
  UNSUPPORTED_FRACTION_REGRESSION_EQUATION,
  UNSUPPORTED_INEQUALITY_REGRESSION_EQUATION,
  UNSUPPORTED_REGRESSION_EQUATION
} from './operationCoverage';

type Assert = (condition: unknown, message: string) => asserts condition;

const assert: Assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getStepOperationTypes = (steps: AlgebraStep[]) => {
  return steps
    .map((step) => step.operation?.type)
    .filter((operation): operation is AlgebraOperationTypeV2 => Boolean(operation));
};

const assertOperationSequenceContains = (
  actualOperations: AlgebraOperationTypeV2[],
  expectedOperations: AlgebraOperationTypeV2[],
  label: string
) => {
  expectedOperations.forEach((operation) => {
    assert(
      actualOperations.includes(operation),
      `${label}: expected operation ${operation}, got ${actualOperations.join(', ')}`
    );
  });
};

const assertTemplateCoverage = (steps: AlgebraStep[], label: string) => {
  steps.forEach((step, index) => {
    const operation = step.operation;

    assert(operation, `${label}: step ${step.id} is missing operation after v1 projection.`);
    assert(
      resolveTemplateKindForStep(step, steps[index - 1]) === OPERATION_TEMPLATE_KIND[operation.type],
      `${label}: template did not resolve ${operation.type} consistently.`
    );
  });

  const normalized = normalizeProblemWithTemplate({
    answer: steps.at(-1)?.latex ?? '',
    equation: label,
    steps
  });

  assert(normalized.steps.length === steps.length, `${label}: template normalization changed step count.`);
};

const assertAIPromptCoverage = (equation: string, steps: AlgebraStep[]) => {
  const noteSteps = toAIEnhancementPromptSteps(steps);
  const tokenSteps = toTokenMapEnhancementPromptSteps(steps);
  const visualSteps = toVisualActionsEnhancementPromptSteps(steps);

  [noteSteps, tokenSteps, visualSteps].forEach((promptSteps, index) => {
    promptSteps.forEach((step) => {
      assert(step.operation, `${equation}: prompt step ${step.id} missing operation in prompt set ${index}.`);
    });
  });

  const notePrompt = buildEnhancementPrompt(equation, noteSteps);
  const tokenPrompt = buildTokenMapEnhancementPrompt(equation, tokenSteps);
  const visualPrompt = buildVisualActionsEnhancementPrompt(equation, visualSteps);

  getStepOperationTypes(steps).forEach((operation) => {
    assert(notePrompt.includes(`"type": "${operation}"`), `${equation}: note prompt missing ${operation}.`);
    assert(tokenPrompt.includes(`"type": "${operation}"`), `${equation}: tokenMap prompt missing ${operation}.`);
    assert(visualPrompt.includes(`"type": "${operation}"`), `${equation}: visualActions prompt missing ${operation}.`);
  });
};

const assertRenderCoverage = (steps: AlgebraStep[], label: string) => {
  steps.forEach((step) => {
    const operation = step.operation;

    if (!operation) {
      return;
    }

    const coverage = OPERATION_COVERAGE_MATRIX.find((entry) => entry.operation === operation.type);

    if (coverage?.renderAware) {
      assert(hasOperationDrivenGuide(step), `${label}: render layer does not recognize ${operation.type}.`);
    }
  });
};

const assertExpectedNotes = (steps: AlgebraStep[], regressionCase: (typeof OPERATION_REGRESSION_CASES)[number]) => {
  const expectedNotesByOperation = regressionCase.expectedNotesByOperation;

  if (!expectedNotesByOperation) {
    return;
  }

  Object.entries(expectedNotesByOperation).forEach(([operation, expectedText]) => {
    const matchedStep = steps.find((step) => step.operation?.type === operation);

    assert(matchedStep, `${regressionCase.equation}: missing step for ${operation}.`);
    assert(
      (matchedStep.note ?? '').includes(expectedText),
      `${regressionCase.equation}: expected ${operation} note to include "${expectedText}", got "${matchedStep.note ?? ''}".`
    );
  });
};

const assertExpectedAnswerLabel = (steps: AlgebraStep[], regressionCase: (typeof OPERATION_REGRESSION_CASES)[number]) => {
  if (!regressionCase.expectedAnswerLabel) {
    return;
  }

  const answerStep = [...steps]
    .reverse()
    .find(
      (step) =>
        step.operation?.type === 'collect_solution_branches' ||
        step.operation?.type === 'collect_system_solution' ||
        step.operation?.type === 'final_answer' ||
        step.operation?.type === 'solve_inequality' ||
        step.operation?.type === 'intersect_solution_set' ||
        step.operation?.type === 'state_no_real_solution' ||
        step.operation?.type === 'state_no_solution' ||
        step.operation?.type === 'state_infinite_solutions'
    );

  assert(answerStep, `${regressionCase.equation}: missing answer step.`);
  assert(
    getOperationAnswerLabel(answerStep, '答案') === regressionCase.expectedAnswerLabel,
    `${regressionCase.equation}: expected answer label ${regressionCase.expectedAnswerLabel}, got ${getOperationAnswerLabel(answerStep, '答案')}.`
  );
};

const runGeneratorRegression = () => {
  OPERATION_REGRESSION_CASES.forEach((regressionCase) => {
    const result = generateAlgebraStepsV2Draft(regressionCase.equation);

    assert(result.supported, `${regressionCase.equation}: expected generator support.`);
    assert(result.native === regressionCase.expectedNative, `${regressionCase.equation}: native flag mismatch.`);
    assert(
      !regressionCase.expectedAnswer || result.problem.answer === regressionCase.expectedAnswer,
      `${regressionCase.equation}: expected answer ${regressionCase.expectedAnswer}, got ${result.problem.answer}.`
    );

    const nativeOperations = result.problem.steps.map((step) => step.operation.type);
    assertOperationSequenceContains(nativeOperations, regressionCase.expectedOperations, regressionCase.equation);

    const legacySteps = result.legacyProblem.steps;
    const legacyOperations = getStepOperationTypes(legacySteps);

    assert(legacySteps.length === result.problem.steps.length, `${regressionCase.equation}: v2 -> v1 step count mismatch.`);
    assertOperationSequenceContains(legacyOperations, regressionCase.expectedOperations, `${regressionCase.equation} v1`);
    assertExpectedNotes(legacySteps, regressionCase);
    assertExpectedAnswerLabel(legacySteps, regressionCase);
    assertTemplateCoverage(legacySteps, regressionCase.equation);
    assertAIPromptCoverage(regressionCase.equation, legacySteps);
    assertRenderCoverage(legacySteps, regressionCase.equation);
  });
};

const runCoverageMatrixRegression = () => {
  OPERATION_COVERAGE_MATRIX.forEach((entry) => {
    assert(entry.samples.length > 0, `${entry.operation}: coverage entry needs at least one sample.`);
    assert(OPERATION_TEMPLATE_KIND[entry.operation] === entry.templateKind, `${entry.operation}: templateKind mismatch.`);
    assert(
      OPERATION_REGRESSION_CASES.some((regressionCase) => regressionCase.expectedOperations.includes(entry.operation)),
      `${entry.operation}: no regression case asserts this operation.`
    );
  });
};

const runUnsupportedRegression = async () => {
  const generated = generateAlgebraStepsV2Draft(UNSUPPORTED_REGRESSION_EQUATION);

  assert(!generated.supported, `${UNSUPPORTED_REGRESSION_EQUATION}: generator should remain unsupported.`);

  const fallback = await buildEnhancedLessonProblem(UNSUPPORTED_REGRESSION_EQUATION, {
    ai: false
  });

  assert(!fallback.supported, `${UNSUPPORTED_REGRESSION_EQUATION}: build result should be unsupported.`);
  assert(fallback.quality === 'fallback', `${UNSUPPORTED_REGRESSION_EQUATION}: expected fallback quality.`);
  assert(Boolean(fallback.problem), `${UNSUPPORTED_REGRESSION_EQUATION}: expected fallback problem.`);

  const unsupportedOnly = await buildEnhancedLessonProblem(UNSUPPORTED_REGRESSION_EQUATION, {
    ai: false,
    fallbackOnUnsupported: false
  });

  assert(!unsupportedOnly.supported, `${UNSUPPORTED_REGRESSION_EQUATION}: unsupported-only result should be unsupported.`);
  assert(unsupportedOnly.quality === 'unsupported', `${UNSUPPORTED_REGRESSION_EQUATION}: expected unsupported quality.`);
  assert(!unsupportedOnly.problem, `${UNSUPPORTED_REGRESSION_EQUATION}: unsupported-only result should not create problem.`);

  const unsupportedInequality = await buildEnhancedLessonProblem(UNSUPPORTED_INEQUALITY_REGRESSION_EQUATION, {
    ai: false
  });

  assert(
    !unsupportedInequality.supported,
    `${UNSUPPORTED_INEQUALITY_REGRESSION_EQUATION}: build result should remain unsupported.`
  );
  assert(
    unsupportedInequality.quality === 'fallback',
    `${UNSUPPORTED_INEQUALITY_REGRESSION_EQUATION}: expected fallback quality.`
  );
  assert(Boolean(unsupportedInequality.problem), `${UNSUPPORTED_INEQUALITY_REGRESSION_EQUATION}: expected fallback problem.`);

  const unsupportedFraction = await buildEnhancedLessonProblem(UNSUPPORTED_FRACTION_REGRESSION_EQUATION, {
    ai: false
  });

  assert(
    !unsupportedFraction.supported,
    `${UNSUPPORTED_FRACTION_REGRESSION_EQUATION}: build result should remain unsupported.`
  );
  assert(
    unsupportedFraction.quality === 'fallback',
    `${UNSUPPORTED_FRACTION_REGRESSION_EQUATION}: expected fallback quality.`
  );
  assert(Boolean(unsupportedFraction.problem), `${UNSUPPORTED_FRACTION_REGRESSION_EQUATION}: expected fallback problem.`);

  const unsupportedComplexFractionInequality = await buildEnhancedLessonProblem(
    UNSUPPORTED_COMPLEX_FRACTION_INEQUALITY_REGRESSION_EQUATION,
    {
      ai: false
    }
  );

  assert(
    !unsupportedComplexFractionInequality.supported,
    `${UNSUPPORTED_COMPLEX_FRACTION_INEQUALITY_REGRESSION_EQUATION}: build result should remain unsupported.`
  );
  assert(
    unsupportedComplexFractionInequality.quality === 'fallback',
    `${UNSUPPORTED_COMPLEX_FRACTION_INEQUALITY_REGRESSION_EQUATION}: expected fallback quality.`
  );
  assert(
    Boolean(unsupportedComplexFractionInequality.problem),
    `${UNSUPPORTED_COMPLEX_FRACTION_INEQUALITY_REGRESSION_EQUATION}: expected fallback problem.`
  );
};

const main = async () => {
  runCoverageMatrixRegression();
  runGeneratorRegression();
  await runUnsupportedRegression();

  console.log(
    `[operation-regression] passed ${OPERATION_REGRESSION_CASES.length} generator cases, ${OPERATION_COVERAGE_MATRIX.length} operation entries, and unsupported fallback checks.`
  );
};

main().catch((error: unknown) => {
  console.error(error);
  throw error;
});

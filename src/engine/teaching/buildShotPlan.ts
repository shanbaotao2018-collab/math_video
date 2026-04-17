import type {AlgebraOperationV2, AlgebraProblem, AlgebraStep} from '../../types/algebra';
import type {TeachingScript, TeachingScriptStep} from './teachingScriptTypes';
import type {ShotPlan, TeachingShot, TeachingShotAnimation, TeachingShotType} from './shotPlanTypes';

const SHOT_TYPE_BY_OPERATION: Partial<Record<AlgebraOperationV2['type'], TeachingShotType>> = {
  analyze_sign_interval: 'interval',
  apply_quadratic_formula: 'branch',
  apply_zero_product_rule: 'branch',
  classify_root_count: 'highlight',
  clear_denominator: 'transform',
  collect_solution_branches: 'branch',
  collect_system_solution: 'answer',
  compute_discriminant: 'transform',
  divide_both_sides: 'transform',
  eliminate_variable: 'eliminate',
  extract_square_root: 'branch',
  find_critical_points: 'highlight',
  final_answer: 'answer',
  flip_inequality_sign: 'highlight',
  move_term: 'transform',
  rewrite_equation_for_substitution: 'highlight',
  simplify_expression: 'transform',
  state_infinite_solutions: 'answer',
  state_no_real_solution: 'answer',
  state_no_solution: 'answer',
  substitute_expression: 'substitute',
  write_equation: 'write'
};

const SHOT_TYPE_BY_STEP_KIND: Partial<Record<AlgebraStep['kind'], TeachingShotType>> = {
  answer: 'answer',
  cancel: 'transform',
  expand: 'transform',
  move: 'transform',
  transform: 'transform',
  write: 'write'
};

const ANIMATION_BY_SHOT_TYPE: Record<TeachingShotType, TeachingShotAnimation> = {
  answer: 'fade_in',
  branch: 'fade_in',
  eliminate: 'slide_right',
  highlight: 'highlight_pulse',
  interval: 'highlight_pulse',
  substitute: 'replace',
  transform: 'slide_left',
  write: 'fade_in'
};

const DURATION_OFFSET_MS: Record<TeachingShotType, number> = {
  answer: 1500,
  branch: 1000,
  eliminate: 800,
  highlight: 700,
  interval: 1200,
  substitute: 800,
  transform: 300,
  write: 500
};

const PACING_MULTIPLIER: Record<NonNullable<TeachingScriptStep['pacingHint']>, number> = {
  fast: 0.8,
  normal: 1,
  pause: 1.5,
  slow: 1.3
};

const MIN_DURATION_MS = 800;
const MAX_DURATION_MS = 6000;

const countNarrationChars = (narration: string) => {
  return narration.replace(/\s+/g, '').length;
};

const pickFirstDefinedString = (...values: Array<string | undefined>) => {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const joinLatexList = (values?: string[]) => {
  if (!values || values.length === 0) {
    return undefined;
  }

  return values.join('；');
};

const resolveShotType = (step?: AlgebraStep): TeachingShotType => {
  if (step?.operation?.type) {
    const mappedType = SHOT_TYPE_BY_OPERATION[step.operation.type];

    if (mappedType) {
      return mappedType;
    }
  }

  if (step) {
    const kindMappedType = SHOT_TYPE_BY_STEP_KIND[step.kind];

    if (kindMappedType) {
      return kindMappedType;
    }
  }

  return 'transform';
};

const resolveAnimation = (shotType: TeachingShotType): TeachingShotAnimation => {
  return ANIMATION_BY_SHOT_TYPE[shotType];
};

const resolveFocusLatexFromOperation = (operation?: AlgebraOperationV2) => {
  if (!operation) {
    return undefined;
  }

  switch (operation.type) {
    case 'move_term':
      return pickFirstDefinedString(operation.termLatex, operation.inverseTermLatex);
    case 'clear_denominator':
      return pickFirstDefinedString(operation.multiplierLatex, joinLatexList(operation.denominatorsLatex), operation.denominatorLatex);
    case 'divide_both_sides':
      return pickFirstDefinedString(operation.divisorLatex);
    case 'flip_inequality_sign':
      return pickFirstDefinedString(operation.divisorLatex, operation.toRelationLatex, operation.fromRelationLatex);
    case 'rewrite_equation_for_substitution':
      return pickFirstDefinedString(operation.rewrittenLatex, operation.targetVariableLatex, operation.sourceEquationLatex);
    case 'substitute_expression':
      return pickFirstDefinedString(operation.substitutedExpressionLatex, operation.targetEquationLatex, operation.sourceEquationLatex);
    case 'eliminate_variable':
      return pickFirstDefinedString(operation.eliminatedVariableLatex, operation.resultEquationLatex, joinLatexList(operation.sourceEquationsLatex));
    case 'analyze_sign_interval':
      return pickFirstDefinedString(operation.signSummaryLatex, joinLatexList(operation.selectedIntervalsLatex), joinLatexList(operation.criticalPointsLatex));
    case 'find_critical_points':
      return pickFirstDefinedString(joinLatexList(operation.pointsLatex), operation.reasonLatex);
    case 'apply_zero_product_rule':
      return pickFirstDefinedString(joinLatexList(operation.factorsLatex), joinLatexList(operation.branchEquationsLatex));
    case 'extract_square_root':
      return pickFirstDefinedString(joinLatexList(operation.branchesLatex), operation.radicandLatex);
    case 'collect_solution_branches':
      return pickFirstDefinedString(operation.resultLatex, joinLatexList(operation.branchesLatex));
    case 'collect_system_solution':
      return pickFirstDefinedString(operation.solutionPairLatex);
    case 'classify_root_count':
      return pickFirstDefinedString(operation.discriminantLatex, operation.relationLatex);
    case 'compute_discriminant':
      return pickFirstDefinedString(operation.substitutionLatex, operation.discriminantLatex);
    case 'apply_quadratic_formula':
      return pickFirstDefinedString(operation.formulaLatex, joinLatexList(operation.branchesLatex), operation.discriminantLatex);
    case 'state_no_real_solution':
      return pickFirstDefinedString(operation.conclusionLatex, operation.discriminantLatex);
    case 'state_no_solution':
    case 'state_infinite_solutions':
      return pickFirstDefinedString(operation.conclusionLatex);
    case 'state_domain_restriction':
      return pickFirstDefinedString(operation.restrictionLatex, operation.reasonLatex);
    case 'solve_single_variable_equation':
    case 'final_answer':
    case 'solve_inequality':
    case 'intersect_solution_set':
      return pickFirstDefinedString(
        'resultLatex' in operation ? operation.resultLatex : undefined,
        'valueLatex' in operation ? operation.valueLatex : undefined,
        'variableLatex' in operation ? operation.variableLatex : undefined,
        'resultLatex' in operation ? operation.resultLatex : undefined
      );
    default:
      return undefined;
  }
};

const resolveFocusLatex = (step?: AlgebraStep) => {
  return pickFirstDefinedString(resolveFocusLatexFromOperation(step?.operation), step?.latex);
};

export const resolveDuration = (
  shotType: TeachingShotType,
  narration: string,
  teachingStep: TeachingScriptStep
) => {
  const narrationDuration = (countNarrationChars(narration) / 4) * 1000;
  const durationWithShotBias = narrationDuration + DURATION_OFFSET_MS[shotType];
  const pacingMultiplier = PACING_MULTIPLIER[teachingStep.pacingHint ?? 'normal'];
  const adjustedDuration = durationWithShotBias * pacingMultiplier;

  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(adjustedDuration)));
};

export function buildShotPlan(problem: AlgebraProblem, teachingScript: TeachingScript): ShotPlan {
  const stepById = new Map(problem.steps.map((step) => [step.id, step]));
  const shots: TeachingShot[] = [];

  teachingScript.steps.forEach((teachingStep, index) => {
    const problemStep = stepById.get(teachingStep.stepId) ?? problem.steps[index];
    const shotType = resolveShotType(problemStep);
    const focusLatex = resolveFocusLatex(problemStep);

    shots.push({
      animation: resolveAnimation(shotType),
      durationMs: resolveDuration(shotType, teachingStep.narration, teachingStep),
      ...(focusLatex ? {focusLatex} : {}),
      narration: teachingStep.narration,
      shotId: `sh${shots.length + 1}`,
      shotType,
      stepId: teachingStep.stepId
    });

    if (problemStep?.kind === 'answer' && shotType !== 'answer') {
      shots.push({
        animation: resolveAnimation('answer'),
        durationMs: resolveDuration('answer', teachingStep.narration, teachingStep),
        ...(focusLatex ? {focusLatex} : {}),
        narration: teachingStep.narration,
        shotId: `sh${shots.length + 1}`,
        shotType: 'answer',
        stepId: teachingStep.stepId
      });
    }
  });

  return {shots};
}

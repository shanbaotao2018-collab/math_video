import type {AlgebraOperationTypeV2, AlgebraProblem} from '../../types/algebra';
import type {AlgebraFamilyRecognition} from './buildAlgebraProductEntry';

export type AlgebraQualityTier = 'instant' | 'basic' | 'standard' | 'detailed';

export const QUALITY_TIER_LABELS: Record<AlgebraQualityTier, string> = {
  basic: 'basic（基础讲解）',
  detailed: 'detailed（详细讲解）',
  instant: 'instant（快速讲解）',
  standard: 'standard（标准讲解）'
};

const DETAILED_OPERATION_TYPES = new Set<AlgebraOperationTypeV2>([
  'analyze_sign_interval',
  'back_substitute_solution',
  'classify_system_result',
  'collect_system_solution',
  'eliminate_variable',
  'find_critical_points',
  'intersect_solution_set',
  'rewrite_equation_for_substitution',
  'state_domain_restriction',
  'state_infinite_solutions',
  'state_no_solution',
  'substitute_expression'
]);

const STANDARD_OPERATION_TYPES = new Set<AlgebraOperationTypeV2>([
  'apply_quadratic_formula',
  'apply_zero_product_rule',
  'clear_denominator',
  'collect_solution_branches',
  'compute_discriminant',
  'extract_square_root',
  'factor_quadratic',
  'split_into_linear_factors'
]);

const getOperationTypes = (problem?: AlgebraProblem) => {
  return (
    problem?.steps
      .map((step) => step.operation?.type)
      .filter((operation): operation is AlgebraOperationTypeV2 => Boolean(operation)) ?? []
  );
};

const hasAnyOperationType = (operationTypes: AlgebraOperationTypeV2[], targetTypes: Set<AlgebraOperationTypeV2>) => {
  return operationTypes.some((operationType) => targetTypes.has(operationType));
};

export const inferAlgebraQualityTier = (
  family: AlgebraFamilyRecognition,
  problem?: AlgebraProblem
): AlgebraQualityTier => {
  const operationTypes = getOperationTypes(problem);
  const effectiveOperationCount = operationTypes.length > 0 ? operationTypes.length : problem?.steps.length ?? 0;

  if (
    family.id === 'fraction_inequality' ||
    family.id === 'linear_system' ||
    hasAnyOperationType(operationTypes, DETAILED_OPERATION_TYPES) ||
    effectiveOperationCount >= 8
  ) {
    return 'detailed';
  }

  if (
    family.id === 'fraction_equation' ||
    family.id === 'quadratic_equation' ||
    hasAnyOperationType(operationTypes, STANDARD_OPERATION_TYPES) ||
    effectiveOperationCount >= 6
  ) {
    return 'standard';
  }

  if (family.id === 'linear_equation' && effectiveOperationCount <= 3) {
    return 'instant';
  }

  if (family.id === 'linear_equation' || family.id === 'linear_inequality') {
    return 'basic';
  }

  if (effectiveOperationCount <= 3) {
    return 'instant';
  }

  if (effectiveOperationCount <= 5) {
    return 'basic';
  }

  return 'standard';
};

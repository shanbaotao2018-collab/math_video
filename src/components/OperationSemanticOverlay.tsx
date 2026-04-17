import {interpolate} from 'remotion';

import {FadeOverlay} from './FadeOverlay';
import type {AlgebraStep, LessonLayout} from '../types/algebra';
import {getSemanticTermPatch, type MoveGuideRects} from '../utils/anchors';

type Props = {
  layout: LessonLayout;
  progress: number;
  rects?: MoveGuideRects;
  step: AlgebraStep;
};

const clamp = (value: number) => {
  return Math.min(1, Math.max(0, value));
};

const ramp = (progress: number, start: number, end: number) => {
  if (end <= start) {
    return progress >= end ? 1 : 0;
  }

  return clamp((progress - start) / (end - start));
};

const getOperationHintText = (step: AlgebraStep) => {
  const operation = step.operation;

  if (operation?.type === 'multiply_both_sides') {
    return operation.multiplierLatex ? `同乘 ${operation.multiplierLatex}，把分母约掉` : '同乘去分母';
  }

  if (operation?.type === 'rewrite_equation_for_substitution') {
    return operation.targetVariableLatex ? `先把 ${operation.targetVariableLatex} 单独写出来，后面好代入` : '先改写成适合代入的形式';
  }

  if (operation?.type === 'substitute_expression') {
    return operation.sourceVariableLatex ? `用这个式子替换 ${operation.sourceVariableLatex}，先消成一个变量` : '把表达式代入另一条方程';
  }

  if (operation?.type === 'eliminate_variable') {
    return operation.eliminatedVariableLatex
      ? `${operation.methodLatex === 'add' ? '相加' : '相减'}后消去 ${operation.eliminatedVariableLatex}`
      : '把两条方程联立消元';
  }

  if (operation?.type === 'clear_denominator') {
    if (operation.denominatorsLatex && operation.denominatorsLatex.length > 1 && operation.multiplierLatex) {
      return `最小公倍数是 ${operation.multiplierLatex}`;
    }

    if (operation.denominatorLatex && operation.multiplierLatex) {
      return `分母是 ${operation.denominatorLatex}，同乘 ${operation.multiplierLatex}`;
    }

    return operation.multiplierLatex ? `去分母，同乘 ${operation.multiplierLatex}` : '去分母';
  }

  if (operation?.type === 'divide_both_sides') {
    return operation.divisorLatex ? `两边同除 ${operation.divisorLatex}` : '两边同除';
  }

  if (operation?.type === 'solve_single_variable_equation') {
    return operation.variableLatex ? `先解出 ${operation.variableLatex}，再回代` : '先解出一个变量';
  }

  if (operation?.type === 'back_substitute_solution') {
    return '已知一个变量，再求另一个变量';
  }

  if (operation?.type === 'factor_quadratic') {
    return '先分解成两个因式';
  }

  if (operation?.type === 'split_into_linear_factors') {
    return '把积式看成两个一次因式';
  }

  if (operation?.type === 'apply_zero_product_rule') {
    return '积为 0，转成两个一次方程';
  }

  if (operation?.type === 'extract_square_root') {
    return '两边开平方，分成 ± 两个分支';
  }

  if (operation?.type === 'compute_discriminant') {
    return '先算 Δ，判断有几个实根';
  }

  if (operation?.type === 'classify_root_count') {
    return '根据 Δ 的正负判断根的个数';
  }

  if (operation?.type === 'apply_quadratic_formula') {
    return (operation.branchesLatex?.length ?? 0) === 1 ? '代入求根公式，两个结果会重合' : '先写 x=(-b±√Δ)/(2a)，再代入';
  }

  if (operation?.type === 'state_no_real_solution') {
    return '不再进入分支，直接给出结论';
  }

  if (operation?.type === 'classify_system_result') {
    return operation.classification === 'no_solution' ? '消元后出现矛盾，这个方程组无解' : '消元后恒成立，进入系统结果判断';
  }

  if (operation?.type === 'collect_system_solution') {
    return '把两个变量配成方程组的唯一解';
  }

  if (operation?.type === 'state_no_solution') {
    return '两条方程不能同时成立';
  }

  if (operation?.type === 'state_infinite_solutions') {
    return '两个方程表示同一个条件';
  }

  if (operation?.type === 'flip_inequality_sign') {
    return operation.divisorLatex ? `除以 ${operation.divisorLatex}，不等号改向` : '除以负数，不等号改向';
  }

  if (operation?.type === 'state_domain_restriction') {
    return '先看定义域';
  }

  if (operation?.type === 'find_critical_points') {
    return '先找会改变符号的分界点';
  }

  if (operation?.type === 'analyze_sign_interval') {
    return '按临界点分区间判断符号';
  }

  if (operation?.type === 'intersect_solution_set') {
    return '排除分母为 0 的点，写成最终解集';
  }

  if (operation?.type === 'collect_solution_branches') {
    return (operation.branchesLatex?.length ?? 0) === 1
      ? '两个分支重合，汇总成一个重根'
      : '把两个分支汇总成最终结果';
  }

  return undefined;
};

const getOperationSecondaryHintText = (step: AlgebraStep) => {
  const operation = step.operation;

  if (operation?.type === 'clear_denominator' && operation.denominatorsLatex && operation.denominatorsLatex.length > 1) {
    return `分母 ${operation.denominatorsLatex.join('、')} -> 同乘 ${operation.multiplierLatex ?? ''}`;
  }

  if (operation?.type === 'rewrite_equation_for_substitution' && operation.rewrittenLatex) {
    return `${operation.sourceEquationLatex ?? ''} -> ${operation.rewrittenLatex}`;
  }

  if (operation?.type === 'substitute_expression' && operation.targetEquationLatex && operation.substitutedExpressionLatex) {
    return `${operation.targetEquationLatex} / ${operation.sourceVariableLatex ?? ''} 用 ${operation.substitutedExpressionLatex} 替换`;
  }

  if (operation?.type === 'eliminate_variable' && operation.resultEquationLatex) {
    return `${operation.methodLatex === 'add' ? '相加' : '相减'} -> ${operation.resultEquationLatex}`;
  }

  if (operation?.type === 'factor_quadratic' && operation.factoredLatex) {
    return operation.factoredLatex;
  }

  if (operation?.type === 'split_into_linear_factors' && operation.factorsLatex && operation.factorsLatex.length > 0) {
    return operation.factorsLatex.join(' / ');
  }

  if (
    operation?.type === 'apply_zero_product_rule' &&
    operation.branchEquationsLatex &&
    operation.branchEquationsLatex.length > 0
  ) {
    return operation.branchEquationsLatex.join(' / ');
  }

  if (operation?.type === 'extract_square_root' && operation.branchesLatex && operation.branchesLatex.length > 0) {
    return operation.branchesLatex.join(' / ');
  }

  if (operation?.type === 'compute_discriminant' && operation.discriminantLatex) {
    return `Δ=${operation.discriminantLatex}，再看它和 0 的关系`;
  }

  if (operation?.type === 'classify_root_count') {
    if (operation.classification === 'two_real_roots') {
      return 'Δ>0 -> 两个解';
    }

    if (operation.classification === 'double_root') {
      return 'Δ=0 -> 一个重根，最后只保留一个结果';
    }

    if (operation.classification === 'no_real_root') {
      return 'Δ<0 -> 无实数解';
    }
  }

  if (operation?.type === 'apply_quadratic_formula' && operation.branchesLatex && operation.branchesLatex.length > 0) {
    return operation.branchesLatex.length === 1 ? `${operation.branchesLatex[0]}（重根）` : operation.branchesLatex.join(' / ');
  }

  if (operation?.type === 'state_no_real_solution') {
    return `${operation.conclusionLatex ?? '无实数解'} / 不进入后续分支汇总`;
  }

  if (operation?.type === 'classify_system_result') {
    if (operation.classification === 'no_solution') {
      return `${operation.reasonLatex ?? step.latex} / 矛盾`;
    }

    if (operation.classification === 'infinite_solutions') {
      return `${operation.reasonLatex ?? step.latex} / 恒等式`;
    }
  }

  if (operation?.type === 'solve_single_variable_equation' && operation.resultLatex) {
    return `${operation.resultLatex} / 先拿到一个变量的值`;
  }

  if (operation?.type === 'back_substitute_solution' && operation.resultLatex) {
    return `${operation.knownSolutionLatex ?? ''} -> ${operation.resultLatex}`;
  }

  if (operation?.type === 'collect_system_solution' && operation.solutionPairLatex) {
    return `${operation.solutionPairLatex} / 有序数对`;
  }

  if (operation?.type === 'state_no_solution') {
    return `${operation.conclusionLatex ?? '\\text{无解}'} / 不存在同时满足两式的数对`;
  }

  if (operation?.type === 'state_infinite_solutions') {
    return `${operation.conclusionLatex ?? '\\text{无穷多解}'} / 满足同一条件的数对都成立`;
  }

  if (operation?.type === 'state_domain_restriction' && operation.restrictionLatex) {
    return operation.restrictionLatex;
  }

  if (operation?.type === 'find_critical_points' && operation.pointsLatex && operation.pointsLatex.length > 0) {
    return operation.pointsLatex.join(' / ');
  }

  if (operation?.type === 'analyze_sign_interval' && operation.selectedIntervalsLatex && operation.selectedIntervalsLatex.length > 0) {
    return operation.selectedIntervalsLatex.join('\\cup');
  }

  if (operation?.type === 'intersect_solution_set' && operation.restrictionLatex) {
    return operation.restrictionLatex;
  }

  if (
    operation?.type === 'collect_solution_branches' &&
    operation.branchesLatex &&
    operation.branchesLatex.length > 0
  ) {
    return operation.branchesLatex.length === 1 ? `${operation.branchesLatex[0]}（重根）` : operation.branchesLatex.join('、');
  }

  return undefined;
};

const formatSemanticText = (text: string) => {
  return text
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\cup/g, ' ∪ ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\ne/g, '≠')
    .replace(/\\infty/g, '∞')
    .replace(/\\sqrt\{([^}]*)\}/g, '√$1')
    .replace(/\\\\\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const renderHintBubble = ({
  accent = false,
  opacity,
  patch,
  position,
  text
}: {
  accent?: boolean;
  opacity: number;
  patch: ReturnType<typeof getSemanticTermPatch>;
  position: 'bottom' | 'top';
  text: string;
}) => {
  const scale = interpolate(ramp(position === 'top' ? opacity : opacity * 0.95, 0.08, 0.34), [0, 1], [0.96, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <FadeOverlay
      opacity={opacity}
      style={{
        left: patch.left + patch.width * 0.5,
        top: position === 'top' ? patch.top - 38 : patch.top + patch.height + 16,
        transform: `translateX(-50%) scale(${scale})`,
        padding: position === 'top' ? '7px 13px' : '5px 10px',
        borderRadius: 6,
        border: accent ? '1px solid rgba(255, 243, 194, 0.58)' : '1px solid rgba(126, 221, 184, 0.54)',
        background: 'rgba(9, 31, 22, 0.84)',
        color: accent ? '#fff3c2' : '#7eddb8',
        fontSize: position === 'top' ? 24 : 22,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxShadow: accent ? '0 0 14px rgba(255, 243, 194, 0.12)' : '0 0 12px rgba(126, 221, 184, 0.12)'
      }}
    >
      {formatSemanticText(text)}
    </FadeOverlay>
  );
};

const renderPatch = (key: string, opacity: number, patch: ReturnType<typeof getSemanticTermPatch>, accent = false) => {
  return (
    <FadeOverlay
      key={key}
      opacity={opacity}
      style={{
        left: patch.left - 5,
        top: patch.top - 4,
        width: patch.width + 10,
        height: patch.height + 8,
        borderRadius: 6,
        background: accent ? 'rgba(255, 243, 194, 0.12)' : 'rgba(126, 221, 184, 0.08)',
        border: accent ? '2px solid rgba(255, 243, 194, 0.82)' : '2px solid rgba(126, 221, 184, 0.62)',
        boxShadow: accent ? '0 0 18px rgba(255, 243, 194, 0.24)' : '0 0 14px rgba(126, 221, 184, 0.16)'
      }}
    />
  );
};

export const OperationSemanticOverlay = ({layout, progress, rects, step}: Props) => {
  const operation = step.operation;
  const opacity = Math.min(ramp(progress, 0.08, 0.24), 1 - ramp(progress, 0.76, 0.96));

  if (!operation) {
    return null;
  }

  if (operation.type === 'combine_like_terms') {
    const patches = (operation.groups ?? []).flatMap((group, groupIndex) => {
      const previousPatches = group.termsLatex.slice(0, 3).map((term, termIndex) => {
        const patch = getSemanticTermPatch(layout, rects, {
          fallbackAnchor: {line: 'previous', role: group.category === 'variable' ? 'left_side' : 'moving_term'},
          fallbackRatio: group.category === 'variable' ? 0.22 + termIndex * 0.12 : 0.44 + termIndex * 0.1,
          line: 'previous',
          roles: group.category === 'variable' ? ['left_term', 'moving_term'] : ['moving_term', 'right_value'],
          term
        });

        return renderPatch(`combine-${groupIndex}-term-${termIndex}`, opacity * 0.9, patch);
      });
      const resultPatch = getSemanticTermPatch(layout, rects, {
        fallbackAnchor: {line: 'current', role: group.category === 'variable' ? 'left_side' : 'result_term_slot'},
        fallbackRatio: group.category === 'variable' ? 0.24 : 0.5,
        line: 'current',
        roles: group.category === 'variable' ? ['left_term'] : ['moving_term', 'result_term', 'right_value'],
        term: group.resultLatex
      });

      return [...previousPatches, renderPatch(`combine-${groupIndex}-result`, opacity, resultPatch, true)];
    });

    return <>{patches}</>;
  }

  if (
    operation.type === 'multiply_both_sides' ||
    operation.type === 'divide_both_sides' ||
    operation.type === 'clear_denominator' ||
    operation.type === 'flip_inequality_sign'
  ) {
    const term =
      operation.type === 'multiply_both_sides'
        ? operation.multiplierLatex
        : operation.type === 'divide_both_sides'
          ? operation.divisorLatex
          : operation.type === 'flip_inequality_sign'
            ? operation.divisorLatex
            : operation.multiplierLatex ?? operation.denominatorLatex;
    const hint = getOperationHintText(step);
    const secondaryHint = getOperationSecondaryHintText(step);
    const patch = getSemanticTermPatch(layout, rects, {
      fallbackAnchor: {line: 'current', role: 'right_side'},
      fallbackRatio: 0.62,
      line: 'current',
      roles: operation.type === 'flip_inequality_sign' ? ['result_term', 'right_value'] : ['answer_term', 'right_value'],
      term: operation.type === 'flip_inequality_sign' && term ? `\\div ${term}` : term
    });
    const scale = interpolate(ramp(progress, 0.08, 0.34), [0, 1], [0.96, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    });

    return (
      <>
        {renderPatch('operation-factor', opacity, patch, true)}
        {hint ? (
          <FadeOverlay
            opacity={opacity}
            style={{
              left: patch.left + patch.width * 0.5,
              top: patch.top - 38,
              transform: `translateX(-50%) scale(${scale})`,
              padding: '7px 13px',
              borderRadius: 6,
              border: '1px solid rgba(255, 243, 194, 0.58)',
              background: 'rgba(9, 31, 22, 0.88)',
              color: '#fff3c2',
              fontSize: 24,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 14px rgba(255, 243, 194, 0.12)'
            }}
          >
            {hint}
          </FadeOverlay>
        ) : null}
        {secondaryHint ? (
          <FadeOverlay
            opacity={opacity * 0.95}
            style={{
              left: patch.left + patch.width * 0.5,
              top: patch.top + patch.height + 16,
              transform: 'translateX(-50%)',
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid rgba(126, 221, 184, 0.54)',
              background: 'rgba(9, 31, 22, 0.82)',
              color: '#7eddb8',
              fontSize: 22,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(126, 221, 184, 0.12)'
            }}
          >
            {secondaryHint}
          </FadeOverlay>
        ) : null}
        {operation.type === 'flip_inequality_sign' && operation.fromRelationLatex && operation.toRelationLatex ? (
          <FadeOverlay
            opacity={opacity}
            style={{
              left: patch.left + patch.width * 0.5,
              top: patch.top + patch.height + 16,
              transform: 'translateX(-50%)',
              padding: '5px 10px',
              borderRadius: 6,
              border: '1px solid rgba(126, 221, 184, 0.54)',
              background: 'rgba(9, 31, 22, 0.82)',
              color: '#7eddb8',
              fontSize: 22,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(126, 221, 184, 0.12)'
            }}
          >
            {`${operation.fromRelationLatex} -> ${operation.toRelationLatex}`}
          </FadeOverlay>
        ) : null}
      </>
    );
  }

  if (operation.type === 'state_domain_restriction') {
    const restrictionPatch = getSemanticTermPatch(layout, rects, {
      fallbackAnchor: {line: 'current', role: 'answer_term'},
      fallbackRatio: 0.5,
      line: 'current',
      roles: ['answer_term'],
      term: operation.restrictionLatex ?? step.latex
    });
    const hint = getOperationHintText(step);
    const secondaryHint = getOperationSecondaryHintText(step);

    return (
      <>
        {renderPatch('operation-domain-restriction', opacity, restrictionPatch, true)}
        {hint ? renderHintBubble({accent: true, opacity, patch: restrictionPatch, position: 'top', text: hint}) : null}
        {secondaryHint ? renderHintBubble({opacity: opacity * 0.95, patch: restrictionPatch, position: 'bottom', text: secondaryHint}) : null}
      </>
    );
  }

  if (
    operation.type === 'factor_quadratic' ||
    operation.type === 'split_into_linear_factors' ||
    operation.type === 'apply_zero_product_rule' ||
    operation.type === 'extract_square_root' ||
    operation.type === 'compute_discriminant' ||
    operation.type === 'classify_root_count' ||
    operation.type === 'apply_quadratic_formula' ||
    operation.type === 'classify_system_result' ||
    operation.type === 'rewrite_equation_for_substitution' ||
    operation.type === 'substitute_expression' ||
    operation.type === 'eliminate_variable' ||
    operation.type === 'solve_single_variable_equation' ||
    operation.type === 'back_substitute_solution'
  ) {
    const branchFactorPatches =
      operation.type === 'apply_zero_product_rule'
        ? (operation.factorsLatex ?? []).slice(0, 2).map((factorLatex, factorIndex) =>
            renderPatch(
              `operation-branch-factor-${factorIndex}`,
              opacity * 0.78,
              getSemanticTermPatch(layout, rects, {
                fallbackAnchor: {line: 'previous', role: factorIndex === 0 ? 'left_side' : 'right_side'},
                fallbackRatio: factorIndex === 0 ? 0.28 : 0.54,
                line: 'previous',
                roles: ['left_term', 'right_term'],
                term: factorLatex
              })
            )
          )
        : operation.type === 'extract_square_root'
          ? (operation.branchesLatex ?? []).slice(0, 2).map((branchLatex, branchIndex) =>
              renderPatch(
                `operation-square-root-branch-${branchIndex}`,
                opacity * 0.78,
                getSemanticTermPatch(layout, rects, {
                  fallbackAnchor: {line: 'current', role: 'answer_term'},
                  fallbackRatio: branchIndex === 0 ? 0.36 : 0.64,
                  line: 'current',
                  roles: ['answer_term', 'left_term', 'right_value'],
                  term: branchIndex === 0 ? '\\pm' : branchLatex
                })
              )
            )
        : operation.type === 'apply_quadratic_formula'
          ? (operation.branchesLatex ?? []).slice(0, 2).map((branchLatex, branchIndex) =>
              renderPatch(
                `operation-formula-branch-${branchIndex}`,
                opacity * 0.78,
                getSemanticTermPatch(layout, rects, {
                  fallbackAnchor: {line: 'current', role: 'answer_term'},
                  fallbackRatio: branchIndex === 0 ? 0.34 : 0.66,
                  line: 'current',
                  roles: ['answer_term', 'left_term', 'right_value'],
                  term: branchIndex === 0 ? '\\pm' : branchLatex
                })
              )
            )
        : [];
    const semanticPatch = getSemanticTermPatch(layout, rects, {
      fallbackAnchor: {line: 'current', role: 'answer_term'},
      fallbackRatio: 0.5,
      line: 'current',
      roles: ['answer_term', 'left_term', 'right_term', 'right_value'],
      term: step.latex
    });
    const hint = getOperationHintText(step);
    const secondaryHint = getOperationSecondaryHintText(step);

    return (
      <>
        {branchFactorPatches}
        {renderPatch(`operation-${operation.type}`, opacity, semanticPatch, true)}
        {hint ? renderHintBubble({accent: true, opacity, patch: semanticPatch, position: 'top', text: hint}) : null}
        {secondaryHint ? renderHintBubble({opacity: opacity * 0.95, patch: semanticPatch, position: 'bottom', text: secondaryHint}) : null}
      </>
    );
  }

  if (operation.type === 'find_critical_points' || operation.type === 'analyze_sign_interval') {
    const semanticPatch = getSemanticTermPatch(layout, rects, {
      fallbackAnchor: {line: 'current', role: 'answer_term'},
      fallbackRatio: 0.5,
      line: 'current',
      roles: ['answer_term'],
      term: step.latex
    });
    const hint = getOperationHintText(step);
    const secondaryHint = getOperationSecondaryHintText(step);

    return (
      <>
        {renderPatch(`operation-${operation.type}`, opacity, semanticPatch, true)}
        {hint ? renderHintBubble({accent: true, opacity, patch: semanticPatch, position: 'top', text: hint}) : null}
        {secondaryHint ? renderHintBubble({opacity: opacity * 0.95, patch: semanticPatch, position: 'bottom', text: secondaryHint}) : null}
      </>
    );
  }

  if (
    operation.type === 'collect_solution_branches' ||
    operation.type === 'collect_system_solution' ||
    operation.type === 'final_answer' ||
    operation.type === 'solve_inequality' ||
    operation.type === 'intersect_solution_set' ||
    operation.type === 'state_no_real_solution' ||
    operation.type === 'state_no_solution' ||
    operation.type === 'state_infinite_solutions'
  ) {
    const term =
      operation.type === 'collect_solution_branches'
        ? operation.resultLatex
        : operation.type === 'collect_system_solution'
          ? operation.solutionPairLatex
        : operation.type === 'final_answer'
        ? operation.valueLatex
          ? `${operation.variableLatex}=${operation.valueLatex}`
          : undefined
        : operation.type === 'solve_inequality'
          ? operation.valueLatex
            ? `${operation.variableLatex}${operation.relationLatex}${operation.valueLatex}`
            : undefined
          : operation.type === 'state_no_real_solution'
            ? operation.conclusionLatex
            : operation.type === 'state_no_solution'
              ? operation.conclusionLatex
              : operation.type === 'state_infinite_solutions'
                ? operation.conclusionLatex
                : operation.resultLatex;
    const answerPatch = getSemanticTermPatch(layout, rects, {
      fallbackAnchor: {line: 'current', role: 'answer_term'},
      fallbackRatio: 0.52,
      line: 'current',
      roles: ['answer_term'],
      term
    });
    const hint = getOperationHintText(step);
    const secondaryHint = getOperationSecondaryHintText(step);

    return (
      <>
        {renderPatch('operation-final-answer', opacity, answerPatch, true)}
        {hint ? renderHintBubble({accent: true, opacity, patch: answerPatch, position: 'top', text: hint}) : null}
        {secondaryHint ? renderHintBubble({opacity: opacity * 0.95, patch: answerPatch, position: 'bottom', text: secondaryHint}) : null}
      </>
    );
  }

  return null;
};

import {MathFormula} from './MathFormula';
import type {AlgebraStep} from '../types/algebra';

type Props = {
  prompt: string;
  step: AlgebraStep | null;
};

type ContextDescriptor = {
  activeEquationIndexes: number[];
  detail?: string;
  label: string;
};

const normalizeEquation = (value: string | undefined) => {
  return (value ?? '').replace(/\s+/g, '');
};

const getOriginalSystemEquations = (prompt: string) => {
  return prompt
    .split(',')
    .map((equation) => equation.trim())
    .filter(Boolean)
    .slice(0, 2);
};

const getMatchedEquationIndexes = (equations: string[], candidate: string | undefined) => {
  const normalizedCandidate = normalizeEquation(candidate);

  if (!normalizedCandidate) {
    return [];
  }

  return equations.reduce<number[]>((matchedIndexes, equation, index) => {
    if (normalizeEquation(equation) === normalizedCandidate) {
      matchedIndexes.push(index);
    }

    return matchedIndexes;
  }, []);
};

const getSystemContextDescriptor = (step: AlgebraStep | null, equations: string[]): ContextDescriptor => {
  const operation = step?.operation;

  if (!operation) {
    return {
      activeEquationIndexes: [],
      detail: '固定看住这两条方程，后面每一步都在处理它们之间的关系',
      label: '方程组'
    };
  }

  if (operation.type === 'rewrite_equation_for_substitution') {
    return {
      activeEquationIndexes: getMatchedEquationIndexes(equations, operation.sourceEquationLatex),
      detail: operation.rewrittenLatex ? `把一条方程改写成 ${operation.rewrittenLatex}` : '先把一个变量单独写出来',
      label: '改写'
    };
  }

  if (operation.type === 'substitute_expression') {
    const sourceIndexes = getMatchedEquationIndexes(equations, operation.sourceEquationLatex);
    const targetIndexes = getMatchedEquationIndexes(equations, operation.targetEquationLatex);
    const matchedIndexes = [...new Set([...sourceIndexes, ...targetIndexes])];
    const shouldHighlightBoth = sourceIndexes.length === 0 || targetIndexes.length === 0;

    return {
      activeEquationIndexes:
        shouldHighlightBoth || matchedIndexes.length === 0 ? [0, 1].slice(0, equations.length) : matchedIndexes,
      detail:
        operation.sourceVariableLatex && operation.substitutedExpressionLatex
          ? `用 ${operation.substitutedExpressionLatex} 替换 ${operation.sourceVariableLatex}`
          : '把一条方程代入另一条方程',
      label: '代入'
    };
  }

  if (operation.type === 'eliminate_variable') {
    return {
      activeEquationIndexes: [0, 1].slice(0, equations.length),
      detail: `把两式${operation.methodLatex === 'add' ? '相加' : '相减'}，消去 ${operation.eliminatedVariableLatex ?? '一个变量'}`,
      label: '消元'
    };
  }

  if (operation.type === 'solve_single_variable_equation') {
    return {
      activeEquationIndexes: [],
      detail: operation.resultLatex ? `先解出 ${operation.resultLatex}` : '先解出一个变量',
      label: '单变量求解'
    };
  }

  if (operation.type === 'back_substitute_solution') {
    return {
      activeEquationIndexes: [0, 1].slice(0, equations.length),
      detail:
        operation.knownSolutionLatex && operation.resultLatex
          ? `已知 ${operation.knownSolutionLatex}，回代求得 ${operation.resultLatex}`
          : '把已知变量代回去求另一个变量',
      label: '回代'
    };
  }

  if (operation.type === 'classify_system_result') {
    return {
      activeEquationIndexes: [0, 1].slice(0, equations.length),
      detail:
        operation.classification === 'no_solution'
          ? `${operation.reasonLatex ?? step?.latex ?? ''}，所以方程组无解`
          : `${operation.reasonLatex ?? step?.latex ?? ''}，所以方程组有无穷多解`,
      label: '结果分类'
    };
  }

  if (operation.type === 'collect_system_solution') {
    return {
      activeEquationIndexes: [0, 1].slice(0, equations.length),
      detail: operation.solutionPairLatex ? `把两个变量配成 ${operation.solutionPairLatex}` : '汇总成有序数对',
      label: '唯一解'
    };
  }

  if (operation.type === 'state_no_solution') {
    return {
      activeEquationIndexes: [0, 1].slice(0, equations.length),
      detail: '两条方程互相矛盾，不能同时成立',
      label: '无解'
    };
  }

  if (operation.type === 'state_infinite_solutions') {
    return {
      activeEquationIndexes: [0, 1].slice(0, equations.length),
      detail: '两条方程表示同一个条件，满足条件的数对都成立',
      label: '无穷多解'
    };
  }

  return {
    activeEquationIndexes: [],
    detail: '继续围绕这两条方程推进',
    label: '方程组'
  };
};

export const isLinearSystemPrompt = (prompt: string) => {
  return getOriginalSystemEquations(prompt).length === 2;
};

export const LinearSystemContextPanel = ({prompt, step}: Props) => {
  const equations = getOriginalSystemEquations(prompt);

  if (equations.length !== 2) {
    return null;
  }

  const context = getSystemContextDescriptor(step, equations);

  return (
    <div className="linear-system-context">
      <div className="linear-system-context-top">
        <div className="linear-system-context-title">方程组上下文</div>
        <div className="linear-system-context-relation">
          <span className="linear-system-context-badge">{context.label}</span>
          {context.detail ? <span className="linear-system-context-copy">{context.detail}</span> : null}
        </div>
      </div>
      <div className="linear-system-context-equations">
        {equations.map((equation, index) => {
          const isActive = context.activeEquationIndexes.includes(index);

          return (
            <div
              key={`${equation}-${index}`}
              className={[
                'linear-system-context-equation',
                isActive ? 'linear-system-context-equation-active' : '',
                context.activeEquationIndexes.length > 0 && !isActive ? 'linear-system-context-equation-muted' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="linear-system-context-index">{`方程 ${index + 1}`}</span>
              <MathFormula expression={equation} className="linear-system-context-formula" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

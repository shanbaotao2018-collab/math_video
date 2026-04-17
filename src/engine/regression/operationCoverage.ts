import type {AlgebraOperationTypeV2, AlgebraStepKind} from '../../types/algebra';

export type OperationCoverageEntry = {
  description: string;
  operation: AlgebraOperationTypeV2;
  renderAware: boolean;
  samples: string[];
  templateKind: AlgebraStepKind;
};

export type OperationRegressionCase = {
  description: string;
  equation: string;
  expectedAnswer?: string;
  expectedAnswerLabel?: string;
  expectedNotesByOperation?: Partial<Record<AlgebraOperationTypeV2, string>>;
  expectedNative: boolean;
  expectedOperations: AlgebraOperationTypeV2[];
};

export const OPERATION_COVERAGE_MATRIX: OperationCoverageEntry[] = [
  {
    description: '原题或当前方程展示',
    operation: 'write_equation',
    renderAware: false,
    samples: ['2x+3>7', '(x+1)/2=4'],
    templateKind: 'write'
  },
  {
    description: '把项从一边移到另一边，并记录相反项',
    operation: 'move_term',
    renderAware: true,
    samples: ['2x+3>7', '2(x+3)+3(x-1)=20'],
    templateKind: 'move'
  },
  {
    description: '把方程改写成适合代入的形式',
    operation: 'rewrite_equation_for_substitution',
    renderAware: true,
    samples: ['x+y=5, x-y=1'],
    templateKind: 'transform'
  },
  {
    description: '把一个变量的表达式代入另一条方程',
    operation: 'substitute_expression',
    renderAware: true,
    samples: ['x+y=5, x-y=1'],
    templateKind: 'transform'
  },
  {
    description: '把两条方程相加或相减，消去一个变量',
    operation: 'eliminate_variable',
    renderAware: false,
    samples: ['2x+y=7, 2x-y=1', 'x+y=2, x+y=5'],
    templateKind: 'transform'
  },
  {
    description: '乘法分配律展开一个或多个括号',
    operation: 'expand_brackets',
    renderAware: true,
    samples: ['3(x-1)<=12', '2(x+3)+3(x-1)=20'],
    templateKind: 'expand'
  },
  {
    description: '合并变量项、常数项或分式项',
    operation: 'combine_like_terms',
    renderAware: true,
    samples: ['x/2+x/3=5', '2(x+3)+3(x-1)=20'],
    templateKind: 'transform'
  },
  {
    description: '在方程组里先解出一个变量',
    operation: 'solve_single_variable_equation',
    renderAware: true,
    samples: ['x+y=5, x-y=1'],
    templateKind: 'transform'
  },
  {
    description: '把已知变量代回去求另一个变量',
    operation: 'back_substitute_solution',
    renderAware: true,
    samples: ['x+y=5, x-y=1'],
    templateKind: 'transform'
  },
  {
    description: '根据消元结果判断方程组是唯一解、无解还是无穷多解',
    operation: 'classify_system_result',
    renderAware: true,
    samples: ['x+y=2, x+y=5', 'x+y=2, 2x+2y=4'],
    templateKind: 'transform'
  },
  {
    description: '把二次式分解成乘积形式',
    operation: 'factor_quadratic',
    renderAware: true,
    samples: ['x^2-5x+6=0', 'x^2-4=0'],
    templateKind: 'transform'
  },
  {
    description: '显式列出两个一次因式',
    operation: 'split_into_linear_factors',
    renderAware: true,
    samples: ['x^2-5x+6=0', '(x-2)(x+1)=0'],
    templateKind: 'transform'
  },
  {
    description: '用零积法则拆成多个一次方程',
    operation: 'apply_zero_product_rule',
    renderAware: true,
    samples: ['x^2-4=0', '(x-2)(x+1)=0'],
    templateKind: 'transform'
  },
  {
    description: '两边开平方并得到正负两个分支',
    operation: 'extract_square_root',
    renderAware: true,
    samples: ['x^2=16', '(x-1)^2=9'],
    templateKind: 'transform'
  },
  {
    description: '计算判别式并给出 Δ 的结果',
    operation: 'compute_discriminant',
    renderAware: true,
    samples: ['x^2-2x-1=0', '2x^2+x-1=0'],
    templateKind: 'transform'
  },
  {
    description: '根据判别式判断根的个数',
    operation: 'classify_root_count',
    renderAware: true,
    samples: ['x^2-2x-1=0', '2x^2+x-1=0'],
    templateKind: 'transform'
  },
  {
    description: '把系数代入求根公式并导出两个分支',
    operation: 'apply_quadratic_formula',
    renderAware: true,
    samples: ['x^2-2x-1=0', '2x^2+x-1=0'],
    templateKind: 'transform'
  },
  {
    description: '说明方程在实数范围内无解',
    operation: 'state_no_real_solution',
    renderAware: true,
    samples: ['x^2+2x+5=0'],
    templateKind: 'answer'
  },
  {
    description: '等式两边同乘，用于普通分式去分母后的求解步骤',
    operation: 'multiply_both_sides',
    renderAware: true,
    samples: ['x/2+3=7'],
    templateKind: 'transform'
  },
  {
    description: '等式或不等式两边同除系数',
    operation: 'divide_both_sides',
    renderAware: true,
    samples: ['2x+3>7', 'x/2+x/3=5'],
    templateKind: 'transform'
  },
  {
    description: '普通数值化简或计算',
    operation: 'simplify_expression',
    renderAware: false,
    samples: ['2x+3>7', '(x+1)/2=4'],
    templateKind: 'transform'
  },
  {
    description: '说明定义域或取值范围限制',
    operation: 'state_domain_restriction',
    renderAware: true,
    samples: ['x/2+3>7', '(x+1)/2<=4'],
    templateKind: 'transform'
  },
  {
    description: '找出切分区间的临界点',
    operation: 'find_critical_points',
    renderAware: true,
    samples: ['1/(x-1)>0', '(x-1)/(x+2)>0'],
    templateKind: 'transform'
  },
  {
    description: '按临界点分析区间符号并选出满足条件的区间',
    operation: 'analyze_sign_interval',
    renderAware: true,
    samples: ['1/(x+2)<0', '(x-1)/(x+2)<0'],
    templateKind: 'transform'
  },
  {
    description: '汇总多个分支解为最终解集',
    operation: 'collect_solution_branches',
    renderAware: true,
    samples: ['x^2-5x+6=0', '(x-2)(x+1)=0'],
    templateKind: 'answer'
  },
  {
    description: '把两个变量结果汇总成方程组解',
    operation: 'collect_system_solution',
    renderAware: true,
    samples: ['x+y=5, x-y=1'],
    templateKind: 'answer'
  },
  {
    description: '直接给出方程组无解的系统结论',
    operation: 'state_no_solution',
    renderAware: true,
    samples: ['x+y=2, x+y=5'],
    templateKind: 'answer'
  },
  {
    description: '直接给出方程组有无穷多解的系统结论',
    operation: 'state_infinite_solutions',
    renderAware: true,
    samples: ['x+y=2, 2x+2y=4'],
    templateKind: 'answer'
  },
  {
    description: '方程最终答案',
    operation: 'final_answer',
    renderAware: true,
    samples: ['(x+1)/2=4', '2(x+3)+3(x-1)=20'],
    templateKind: 'answer'
  },
  {
    description: '去分母或两边同乘最小公倍数',
    operation: 'clear_denominator',
    renderAware: true,
    samples: ['(x+1)/2=4', 'x/2+x/3=5'],
    templateKind: 'transform'
  },
  {
    description: '不等式最终解集',
    operation: 'solve_inequality',
    renderAware: true,
    samples: ['2x+3>7', '3(x-1)<=12'],
    templateKind: 'answer'
  },
  {
    description: '乘除负数时不等号方向改变',
    operation: 'flip_inequality_sign',
    renderAware: true,
    samples: ['-2x+3>7'],
    templateKind: 'transform'
  },
  {
    description: '结合取值范围得到最终解集',
    operation: 'intersect_solution_set',
    renderAware: true,
    samples: ['x/2+3>7', '(x+1)/2<=4'],
    templateKind: 'answer'
  }
];

export const OPERATION_REGRESSION_CASES: OperationRegressionCase[] = [
  {
    description: '不等式移项、同除和解集',
    equation: '2x+3>7',
    expectedAnswer: 'x>2',
    expectedNotesByOperation: {
      divide_both_sides: '方向不变',
      solve_inequality: '原不等式的解集为'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'divide_both_sides', 'solve_inequality']
  },
  {
    description: '括号不等式展开后求解',
    equation: '3(x-1)<=12',
    expectedAnswer: 'x\\le5',
    expectedNotesByOperation: {
      divide_both_sides: '方向不变',
      solve_inequality: '原不等式的解集为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'expand_brackets',
      'move_term',
      'simplify_expression',
      'divide_both_sides',
      'solve_inequality'
    ]
  },
  {
    description: '负系数不等式触发变号',
    equation: '-2x+3>7',
    expectedAnswer: 'x<-2',
    expectedNotesByOperation: {
      flip_inequality_sign: '方向改变',
      solve_inequality: '原不等式的解集为'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'flip_inequality_sign', 'solve_inequality']
  },
  {
    description: '分式不等式移项、去分母和解集',
    equation: 'x/2+3>7',
    expectedAnswer: 'x>8',
    expectedNotesByOperation: {
      state_domain_restriction: '无额外取值限制',
      clear_denominator: '不等号方向不变',
      intersect_solution_set: '解集仍为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'move_term',
      'simplify_expression',
      'clear_denominator',
      'simplify_expression',
      'solve_inequality',
      'intersect_solution_set'
    ]
  },
  {
    description: '括号分式不等式去分母后求解',
    equation: '(x+1)/2<=4',
    expectedAnswer: 'x\\le7',
    expectedNotesByOperation: {
      state_domain_restriction: '无额外取值限制',
      clear_denominator: '不等号方向不变',
      intersect_solution_set: '解集仍为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'clear_denominator',
      'simplify_expression',
      'move_term',
      'simplify_expression',
      'solve_inequality',
      'intersect_solution_set'
    ]
  },
  {
    description: '括号分式方程去分母',
    equation: '(x+1)/2=4',
    expectedAnswer: 'x=7',
    expectedNotesByOperation: {
      clear_denominator: '最小公倍数就是 2'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'clear_denominator', 'simplify_expression', 'move_term', 'final_answer']
  },
  {
    description: '两个分式项同乘最小公倍数并合并',
    equation: 'x/2+x/3=5',
    expectedAnswer: 'x=6',
    expectedNotesByOperation: {
      clear_denominator: '最小公倍数是 6',
      divide_both_sides: '去分母后把 x 的系数化成 1'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'clear_denominator', 'combine_like_terms', 'divide_both_sides', 'final_answer']
  },
  {
    description: '多括号展开、合并变量项和常数项',
    equation: '2(x+3)+3(x-1)=20',
    expectedAnswer: 'x=\\frac{17}{5}',
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'expand_brackets',
      'combine_like_terms',
      'move_term',
      'simplify_expression',
      'divide_both_sides',
      'final_answer'
    ]
  },
  {
    description: '方程组消元法可先相加消去一个变量再回代',
    equation: '2x+y=7, 2x-y=1',
    expectedAnswer: '(x,y)=(2,3)',
    expectedAnswerLabel: '方程组唯一解',
    expectedNotesByOperation: {
      eliminate_variable: '消去 y',
      solve_single_variable_equation: '解得 x=2',
      back_substitute_solution: '求出另一个变量',
      collect_system_solution: '方程组的唯一解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'eliminate_variable',
      'simplify_expression',
      'divide_both_sides',
      'solve_single_variable_equation',
      'back_substitute_solution',
      'collect_system_solution'
    ]
  },
  {
    description: '方程组代入法可先改写一条方程再回代求解对',
    equation: 'x+y=5, x-y=1',
    expectedAnswer: '(x,y)=(3,2)',
    expectedAnswerLabel: '方程组唯一解',
    expectedNotesByOperation: {
      rewrite_equation_for_substitution: '就能先只解一个变量',
      substitute_expression: '用一个变量的式子替换原来的字母',
      solve_single_variable_equation: '解得 x=3',
      back_substitute_solution: '再把它代回前面的式子',
      collect_system_solution: '方程组的唯一解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'rewrite_equation_for_substitution',
      'substitute_expression',
      'simplify_expression',
      'move_term',
      'simplify_expression',
      'divide_both_sides',
      'solve_single_variable_equation',
      'back_substitute_solution',
      'collect_system_solution'
    ]
  },
  {
    description: '已解出一个变量的方程组可直接代入另一条方程',
    equation: 'y=2x+1, x+y=5',
    expectedAnswer: '(x,y)=(\\frac{4}{3},\\frac{11}{3})',
    expectedAnswerLabel: '方程组唯一解',
    expectedNotesByOperation: {
      rewrite_equation_for_substitution: '可以直接拿去代入另一条方程',
      substitute_expression: '用一个变量的式子替换原来的字母',
      solve_single_variable_equation: '解得 x=\\frac{4}{3}',
      back_substitute_solution: '再把它代回前面的式子',
      collect_system_solution: '方程组的唯一解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'rewrite_equation_for_substitution',
      'substitute_expression',
      'combine_like_terms',
      'move_term',
      'simplify_expression',
      'divide_both_sides',
      'solve_single_variable_equation',
      'back_substitute_solution',
      'collect_system_solution'
    ]
  },
  {
    description: '方程组消元后出现矛盾时可判断无解',
    equation: 'x+y=2, x+y=5',
    expectedAnswer: '\\text{无解}',
    expectedAnswerLabel: '方程组无解',
    expectedNotesByOperation: {
      eliminate_variable: '只剩下对常数的比较',
      classify_system_result: '这个方程组无解',
      state_no_solution: '方程组无解'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'eliminate_variable',
      'simplify_expression',
      'classify_system_result',
      'state_no_solution'
    ]
  },
  {
    description: '方程组消元后恒成立时可判断有无穷多解',
    equation: 'x+y=2, 2x+2y=4',
    expectedAnswer: '\\text{无穷多解}',
    expectedAnswerLabel: '方程组有无穷多解',
    expectedNotesByOperation: {
      eliminate_variable: '只剩下对常数的比较',
      classify_system_result: '表示同一个条件',
      state_infinite_solutions: '有无穷多组'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'eliminate_variable',
      'simplify_expression',
      'classify_system_result',
      'state_infinite_solutions'
    ]
  },
  {
    description: '标准型二次方程可先分解因式再用零积法则',
    equation: 'x^2-5x+6=0',
    expectedAnswer: 'x=2\\text{ 或 }x=3',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      factor_quadratic: '和为 -5，积为 6',
      split_into_linear_factors: '两个一次因式',
      apply_zero_product_rule: '至少有一个因式等于 0',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'factor_quadratic',
      'split_into_linear_factors',
      'apply_zero_product_rule',
      'collect_solution_branches'
    ]
  },
  {
    description: '平方差型二次方程可因式分解成对称因式',
    equation: 'x^2-4=0',
    expectedAnswer: 'x=-2\\text{ 或 }x=2',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      factor_quadratic: '平方差',
      split_into_linear_factors: '两个一次因式',
      apply_zero_product_rule: '至少有一个因式等于 0',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'factor_quadratic',
      'split_into_linear_factors',
      'apply_zero_product_rule',
      'collect_solution_branches'
    ]
  },
  {
    description: '已成积式的二次方程可直接进入零积法则',
    equation: '(x-2)(x+1)=0',
    expectedAnswer: 'x=-1\\text{ 或 }x=2',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      split_into_linear_factors: '两个一次因式',
      apply_zero_product_rule: '至少有一个因式等于 0',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'split_into_linear_factors',
      'apply_zero_product_rule',
      'collect_solution_branches'
    ]
  },
  {
    description: '开平方型二次方程可直接得到正负两个分支',
    equation: 'x^2=16',
    expectedAnswer: 'x=-4\\text{ 或 }x=4',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      extract_square_root: '开平方',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'extract_square_root', 'collect_solution_branches']
  },
  {
    description: '平移后的平方型方程可开平方后再汇总分支',
    equation: '(x-1)^2=9',
    expectedAnswer: 'x=-2\\text{ 或 }x=4',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      extract_square_root: '开平方',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'extract_square_root', 'collect_solution_branches']
  },
  {
    description: '公式法型二次方程先算判别式，再代入求根公式',
    equation: 'x^2-2x-1=0',
    expectedAnswer: 'x=1-\\sqrt{2}\\text{ 或 }x=1+\\sqrt{2}',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      compute_discriminant: '判断方程有几个实根',
      classify_root_count: '可以继续用求根公式',
      apply_quadratic_formula: 'x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'compute_discriminant',
      'classify_root_count',
      'apply_quadratic_formula',
      'collect_solution_branches'
    ]
  },
  {
    description: '带首项系数的公式法型二次方程也按同一语义链表达',
    equation: '2x^2+x-1=0',
    expectedAnswer: 'x=-1\\text{ 或 }x=\\frac{1}{2}',
    expectedAnswerLabel: '两个解',
    expectedNotesByOperation: {
      compute_discriminant: '判断方程有几个实根',
      classify_root_count: '可以继续用求根公式',
      apply_quadratic_formula: 'x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}',
      collect_solution_branches: '原方程的两个解为'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'compute_discriminant',
      'classify_root_count',
      'apply_quadratic_formula',
      'collect_solution_branches'
    ]
  },
  {
    description: '判别式为 0 时走公式法并收束成一个重根',
    equation: 'x^2-2x+1=0',
    expectedAnswer: 'x=1',
    expectedAnswerLabel: '重根',
    expectedNotesByOperation: {
      compute_discriminant: '判断方程有几个实根',
      classify_root_count: '一个重根',
      apply_quadratic_formula: '\\pm 两个结果重合',
      collect_solution_branches: '重根为 x=1'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'compute_discriminant',
      'classify_root_count',
      'apply_quadratic_formula',
      'collect_solution_branches'
    ]
  },
  {
    description: '判别式小于 0 时在实数范围内无解',
    equation: 'x^2+2x+5=0',
    expectedAnswer: '\\text{无实数解}',
    expectedAnswerLabel: '无实数解',
    expectedNotesByOperation: {
      compute_discriminant: '判断方程有几个实根',
      classify_root_count: '实数范围内无解',
      state_no_real_solution: '原方程无实数解'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'compute_discriminant',
      'classify_root_count',
      'state_no_real_solution'
    ]
  },
  {
    description: '既有分式常数题型仍产出 multiply_both_sides',
    equation: 'x/2+3=7',
    expectedAnswer: 'x=8',
    expectedNotesByOperation: {
      multiply_both_sides: '最小公倍数就是 2'
    },
    expectedNative: true,
    expectedOperations: ['write_equation', 'move_term', 'simplify_expression', 'multiply_both_sides', 'final_answer']
  },
  {
    description: '既有分配律加常数题型仍保持 native v2',
    equation: '2(x+3)+4=18',
    expectedAnswer: 'x=4',
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'expand_brackets',
      'combine_like_terms',
      'move_term',
      'simplify_expression',
      'divide_both_sides',
      'final_answer'
    ]
  },
  {
    description: '变量分母分式不等式先做定义域、临界点和区间分析',
    equation: '1/(x-1)>0',
    expectedAnswer: 'x>1',
    expectedNotesByOperation: {
      state_domain_restriction: 'x=1 不能取',
      find_critical_points: '会让分式无意义或改变符号',
      analyze_sign_interval: '分母为 0 不能取',
      intersect_solution_set: '去掉使分母为 0 的 x=1'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'find_critical_points',
      'analyze_sign_interval',
      'intersect_solution_set'
    ]
  },
  {
    description: '变量分母分式不等式可选出左侧负区间',
    equation: '1/(x+2)<0',
    expectedAnswer: 'x<-2',
    expectedNotesByOperation: {
      state_domain_restriction: 'x=-2 不能取',
      find_critical_points: '会让分式无意义或改变符号',
      analyze_sign_interval: '分母为 0 不能取',
      intersect_solution_set: '去掉使分母为 0 的 x=-2'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'find_critical_points',
      'analyze_sign_interval',
      'intersect_solution_set'
    ]
  },
  {
    description: '双临界点变量分母分式不等式先移项再做区间分析',
    equation: 'x/(x+1)<=2',
    expectedAnswer: '(-\\infty,-2]\\cup(-1,+\\infty)',
    expectedNotesByOperation: {
      state_domain_restriction: 'x=-1 不能取',
      move_term: '方向不变',
      simplify_expression: '同分母分式',
      find_critical_points: '分子为 0 或分母为 0',
      analyze_sign_interval: 'x=-2 使分子为 0，可以取到',
      intersect_solution_set: '把 x=-1 这个使分母为 0 的点排除'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'move_term',
      'simplify_expression',
      'find_critical_points',
      'analyze_sign_interval',
      'intersect_solution_set'
    ]
  },
  {
    description: '标准型分式不等式可直接做双临界点区间分析',
    equation: '(x-1)/(x+2)>0',
    expectedAnswer: '(-\\infty,-2)\\cup(1,+\\infty)',
    expectedNotesByOperation: {
      state_domain_restriction: 'x=-2 不能取',
      find_critical_points: '分子为 0 或分母为 0',
      analyze_sign_interval: 'x=1 使分子为 0，本题不能取到',
      intersect_solution_set: '把 x=-2 这个使分母为 0 的点排除'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'find_critical_points',
      'analyze_sign_interval',
      'intersect_solution_set'
    ]
  },
  {
    description: '标准型分式不等式可选出中间负区间',
    equation: '(x-1)/(x+2)<0',
    expectedAnswer: '(-2,1)',
    expectedNotesByOperation: {
      state_domain_restriction: 'x=-2 不能取',
      find_critical_points: '分子为 0 或分母为 0',
      analyze_sign_interval: 'x=1 使分子为 0，本题不能取到',
      intersect_solution_set: '把 x=-2 这个使分母为 0 的点排除'
    },
    expectedNative: true,
    expectedOperations: [
      'write_equation',
      'state_domain_restriction',
      'find_critical_points',
      'analyze_sign_interval',
      'intersect_solution_set'
    ]
  }
];

export const UNSUPPORTED_REGRESSION_EQUATION = 'x^2=-1';
export const UNSUPPORTED_INEQUALITY_REGRESSION_EQUATION = 'x/(-2)<=4';
export const UNSUPPORTED_FRACTION_REGRESSION_EQUATION = 'x/(-2)+3=7';
export const UNSUPPORTED_COMPLEX_FRACTION_INEQUALITY_REGRESSION_EQUATION = '(x^2-1)/(x+2)>0';

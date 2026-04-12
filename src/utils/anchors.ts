import type {
  AlgebraVisualAction,
  AnchorRef,
  AnchorRole,
  FormulaToken,
  LessonLayout,
  PositionRef,
  TokenRef
} from '../types/algebra';

export type Point = {
  x: number;
  y: number;
};

export type GuideRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ExpandGuideAnchors = {
  source: Point;
  leftTarget: Point;
  rightTarget: Point;
};

export type ExpandGuideRects = {
  current?: GuideRect;
  currentTokenMap?: FormulaToken[];
  next?: GuideRect;
  nextTokenMap?: FormulaToken[];
  previous?: GuideRect;
  previousTokenMap?: FormulaToken[];
  source?: GuideRect;
  target?: GuideRect;
};

export type MoveGuideRects = {
  current?: GuideRect;
  currentExpression?: string;
  currentTokenMap?: FormulaToken[];
  expression?: string;
  next?: GuideRect;
  nextExpression?: string;
  nextTokenMap?: FormulaToken[];
  previous?: GuideRect;
  previousExpression?: string;
  previousTokenMap?: FormulaToken[];
};

export type ArrowAnchors = {
  from: Point;
  to: Point;
};

export type OverlayPatch = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type TokenSlot = {
  rect: GuideRect;
  token: FormulaToken;
};

type AnchorLine = NonNullable<AnchorRef['line']>;

type AnchorRoleRule = {
  line: AnchorLine;
  xRatio: number;
  yRatio: number;
};

export type AnchorContext = {
  current?: GuideRect;
  currentExpression?: string;
  currentTokenMap?: FormulaToken[];
  layout: LessonLayout;
  next?: GuideRect;
  nextExpression?: string;
  nextTokenMap?: FormulaToken[];
  previous?: GuideRect;
  previousExpression?: string;
  previousTokenMap?: FormulaToken[];
  term?: string;
};

export const ANCHOR_ROLE_RULES: Record<AnchorRole, AnchorRoleRule> = {
  equation_center: {
    line: 'current',
    xRatio: 0.5,
    yRatio: 0.52
  },
  left_side: {
    line: 'current',
    xRatio: 0.22,
    yRatio: 0.52
  },
  right_side: {
    line: 'current',
    xRatio: 0.78,
    yRatio: 0.52
  },
  answer_term: {
    line: 'current',
    xRatio: 0.52,
    yRatio: 0.52
  },
  distributor: {
    line: 'previous',
    xRatio: 0.03,
    yRatio: 0.5
  },
  expanded_left_term: {
    line: 'current',
    xRatio: 0.16,
    yRatio: 0.52
  },
  expanded_right_term: {
    line: 'current',
    xRatio: 0.43,
    yRatio: 0.52
  },
  moving_term: {
    line: 'previous',
    xRatio: 0.56,
    yRatio: 0.54
  },
  result_term_slot: {
    line: 'current',
    xRatio: 0.72,
    yRatio: 0.54
  }
};

const SEMANTIC_TERM_ROLES = new Set<AnchorRole>([
  'answer_term',
  'distributor',
  'expanded_left_term',
  'expanded_right_term',
  'moving_term',
  'result_term_slot'
]);

const normalizeLiteralTerm = (term: string | undefined) => {
  if (term && SEMANTIC_TERM_ROLES.has(term as AnchorRole)) {
    return undefined;
  }

  return term;
};

const getRectPoint = (rect: GuideRect, xRatio: number, yRatio: number): Point => {
  return {
    x: rect.left + rect.width * xRatio,
    y: rect.top + rect.height * yRatio
  };
};

const getFallbackLineRect = (layout: LessonLayout, line: AnchorLine): GuideRect => {
  const metrics =
    layout === 'combined-main'
      ? {
          centerX: 960,
          lineHeight: 46,
          previousY: 265,
          currentY: 335,
          nextY: 405,
          width: 300
        }
      : {
          centerX: 1180,
          lineHeight: 36,
          previousY: 332,
          currentY: 382,
          nextY: 432,
          width: 290
        };
  const centerYByLine: Record<AnchorLine, number> = {
    current: metrics.currentY,
    next: metrics.nextY,
    previous: metrics.previousY
  };

  return {
    height: metrics.lineHeight,
    left: metrics.centerX - metrics.width * 0.5,
    top: centerYByLine[line] - metrics.lineHeight * 0.5,
    width: metrics.width
  };
};

const getContextRect = (context: AnchorContext, line: AnchorLine) => {
  return context[line] ?? getFallbackLineRect(context.layout, line);
};

const getContextExpression = (context: AnchorContext, line: AnchorLine) => {
  if (line === 'previous') {
    return context.previousExpression;
  }

  if (line === 'next') {
    return context.nextExpression;
  }

  return context.currentExpression;
};

const getContextTokenMap = (context: AnchorContext, line: AnchorLine) => {
  if (line === 'previous') {
    return context.previousTokenMap;
  }

  if (line === 'next') {
    return context.nextTokenMap;
  }

  return context.currentTokenMap;
};

const getVisibleTokenLength = (text: string) => {
  return Math.max(1, text.replace(/\s+/g, '').length);
};

const tokenHasRole = (token: FormulaToken, role: string) => {
  return (token.role ?? '')
    .split(/[,\s]+/)
    .filter(Boolean)
    .includes(role);
};

export const buildTokenSlots = (lineRect: GuideRect, tokenMap: FormulaToken[]): TokenSlot[] => {
  if (lineRect.width <= 0 || tokenMap.length === 0) {
    return [];
  }

  const weights = tokenMap.map((token) => getVisibleTokenLength(token.text));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = lineRect.left;

  return tokenMap.map((token, index) => {
    const width = lineRect.width * (weights[index] / totalWeight);
    const rect = {
      height: lineRect.height,
      left: cursor,
      top: lineRect.top,
      width
    };

    cursor += width;
    return {
      rect,
      token
    };
  });
};

export const resolveTokenRef = (tokenRef: TokenRef, context: AnchorContext): GuideRect | null => {
  const line = tokenRef.line ?? 'current';
  const tokenMap = getContextTokenMap(context, line);
  const lineRect = context[line];

  if (!tokenMap || !lineRect) {
    return null;
  }

  const tokenSlots = buildTokenSlots(lineRect, tokenMap);
  const slot =
    tokenRef.tokenId
      ? tokenSlots.find(({token}) => token.id === tokenRef.tokenId)
      : tokenRef.role
        ? tokenSlots.find(({token}) => tokenHasRole(token, tokenRef.role ?? ''))
        : undefined;

  return slot?.rect ?? null;
};

const getMoveSourceRatio = (expression: string | undefined, term: string | undefined) => {
  const literalTerm = normalizeLiteralTerm(term);
  const normalizedExpression = expression?.replace(/\s+/g, '') ?? '';
  const normalizedTerm = literalTerm?.replace(/\s+/g, '') ?? '';
  const termIndex = normalizedTerm ? normalizedExpression.indexOf(normalizedTerm) : -1;

  if (termIndex < 0 || normalizedExpression.length === 0) {
    return 0.56;
  }

  const termCenterRatio = (termIndex + normalizedTerm.length * 0.5) / normalizedExpression.length;

  return Math.min(0.72, Math.max(0.25, termCenterRatio));
};

const getMoveTargetRatio = (expression: string | undefined, sourceRatio: number) => {
  const normalizedExpression = expression?.replace(/\s+/g, '') ?? '';
  const equalsIndex = normalizedExpression.indexOf('=');

  if (equalsIndex < 0 || normalizedExpression.length === 0) {
    return Math.min(0.88, sourceRatio + 0.28);
  }

  const rightSideRatio = (equalsIndex + 1.5) / normalizedExpression.length;

  return Math.max(sourceRatio + 0.18, Math.min(0.9, sourceRatio + 0.32, rightSideRatio));
};

const clampRatio = (value: number) => {
  return Math.min(0.94, Math.max(0.06, value));
};

const getTermRatio = (expression: string | undefined, term: string | undefined, fallbackRatio: number) => {
  const literalTerm = normalizeLiteralTerm(term);
  const normalizedExpression = expression?.replace(/\s+/g, '') ?? '';
  const normalizedTerm = literalTerm?.replace(/\s+/g, '') ?? '';
  const termIndex = normalizedTerm ? normalizedExpression.indexOf(normalizedTerm) : -1;

  if (termIndex < 0 || normalizedExpression.length === 0) {
    return fallbackRatio;
  }

  return clampRatio((termIndex + normalizedTerm.length * 0.5) / normalizedExpression.length);
};

const getOppositeSignedTerm = (term: string | undefined) => {
  const normalizedTerm = normalizeLiteralTerm(term)?.replace(/\s+/g, '') ?? '';

  if (normalizedTerm.startsWith('+')) {
    return `-${normalizedTerm.slice(1)}`;
  }

  if (normalizedTerm.startsWith('-')) {
    return `+${normalizedTerm.slice(1)}`;
  }

  return `-${normalizedTerm || '6'}`;
};

const isAnchorRef = (ref: PositionRef | undefined): ref is AnchorRef => {
  return Boolean(ref?.role && ref.role in ANCHOR_ROLE_RULES);
};

const getRectCenter = (rect: GuideRect): Point => {
  return getRectPoint(rect, 0.5, 0.52);
};

export const resolveAnchor = (anchorRef: AnchorRef, context: AnchorContext): Point => {
  const rule = ANCHOR_ROLE_RULES[anchorRef.role];
  const line = anchorRef.line ?? rule.line;
  const rect = getContextRect(context, line);
  const expression = getContextExpression(context, line);
  let xRatio = rule.xRatio;

  if (anchorRef.role === 'moving_term') {
    xRatio = getMoveSourceRatio(expression, context.term);
  }

  if (anchorRef.role === 'result_term_slot') {
    const resultTerm = getOppositeSignedTerm(context.term);

    xRatio = getTermRatio(expression, resultTerm, getMoveTargetRatio(expression, getMoveSourceRatio(expression, context.term)));
  }

  return getRectPoint(rect, clampRatio(xRatio), rule.yRatio);
};

export const resolvePositionRef = (
  positionRef: PositionRef | undefined,
  context: AnchorContext,
  fallbackAnchorRef: AnchorRef
): Point => {
  const tokenRect = positionRef ? resolveTokenRef(positionRef, context) : null;

  if (tokenRect) {
    return getRectCenter(tokenRect);
  }

  if (isAnchorRef(positionRef)) {
    return resolveAnchor(positionRef, context);
  }

  return resolveAnchor(fallbackAnchorRef, context);
};

const getExpandAnchorContext = (layout: LessonLayout, rects?: ExpandGuideRects): AnchorContext => {
  return {
    current: rects?.current ?? rects?.target,
    currentTokenMap: rects?.currentTokenMap,
    layout,
    next: rects?.next,
    nextTokenMap: rects?.nextTokenMap,
    previous: rects?.previous ?? rects?.source,
    previousTokenMap: rects?.previousTokenMap
  };
};

type ExpandActionAnchors = Pick<Extract<AlgebraVisualAction, {type: 'expand'}>, 'source' | 'targets'>;

const DEFAULT_EXPAND_SOURCE: AnchorRef = {
  line: 'previous',
  role: 'distributor'
};

const DEFAULT_EXPAND_TARGETS = {
  left: {
    line: 'current',
    role: 'expanded_left_term'
  },
  right: {
    line: 'current',
    role: 'expanded_right_term'
  }
} satisfies NonNullable<Extract<AlgebraVisualAction, {type: 'expand'}>['targets']>;

export const getExpandGuideAnchors = (
  layout: LessonLayout,
  rects?: ExpandGuideRects,
  action?: ExpandActionAnchors
): ExpandGuideAnchors => {
  const context = getExpandAnchorContext(layout, rects);
  const targets = action?.targets ?? DEFAULT_EXPAND_TARGETS;

  return {
    source: resolvePositionRef(action?.source, context, DEFAULT_EXPAND_SOURCE),
    leftTarget: resolvePositionRef(targets.left, context, DEFAULT_EXPAND_TARGETS.left),
    rightTarget: resolvePositionRef(targets.right, context, DEFAULT_EXPAND_TARGETS.right)
  };
};

const getMoveAnchorContext = (layout: LessonLayout, rects?: MoveGuideRects, term?: string): AnchorContext => {
  return {
    current: rects?.current,
    currentExpression: rects?.currentExpression,
    currentTokenMap: rects?.currentTokenMap,
    layout,
    next: rects?.next,
    nextExpression: rects?.nextExpression,
    nextTokenMap: rects?.nextTokenMap,
    previous: rects?.previous ?? rects?.current,
    previousExpression: rects?.previousExpression ?? rects?.expression,
    previousTokenMap: rects?.previousTokenMap,
    term
  };
};

type MoveActionAnchors = Partial<
  Pick<Extract<AlgebraVisualAction, {type: 'move'}>, 'source' | 'target' | 'targetAnchor' | 'term'>
>;

export const DEFAULT_MOVE_SOURCE: AnchorRef = {
  line: 'previous',
  role: 'moving_term'
};

export const DEFAULT_MOVE_TARGET: AnchorRef = {
  line: 'current',
  role: 'result_term_slot'
};

export const getMoveArrowAnchors = (
  layout: LessonLayout,
  rects?: MoveGuideRects,
  actionOrTerm?: MoveActionAnchors | string
): ArrowAnchors => {
  const action =
    typeof actionOrTerm === 'string'
      ? {
          term: actionOrTerm
        }
      : actionOrTerm;
  const context = getMoveAnchorContext(layout, rects, action?.term);
  const targetFallback = action?.targetAnchor ?? DEFAULT_MOVE_TARGET;

  return {
    from: resolvePositionRef(action?.source, context, DEFAULT_MOVE_SOURCE),
    to: resolvePositionRef(action?.target, context, targetFallback)
  };
};

export const getMoveErasePatch = (point: Point, rect: GuideRect | undefined, term: string | undefined): OverlayPatch => {
  const termLength = normalizeLiteralTerm(term)?.replace(/\s+/g, '').length ?? 2;
  const height = rect ? rect.height * 0.95 : 34;
  const width = Math.max(height * 1.35, termLength * height * 0.54);

  return {
    height,
    left: point.x - width * 0.5,
    top: point.y - height * 0.5,
    width
  };
};

export const getMovePositionPatch = (
  layout: LessonLayout,
  rects: MoveGuideRects | undefined,
  positionRef: PositionRef | undefined,
  fallbackAnchorRef: AnchorRef,
  term: string | undefined
): OverlayPatch => {
  const context = getMoveAnchorContext(layout, rects, term);
  const tokenRect = positionRef ? resolveTokenRef(positionRef, context) : null;

  if (tokenRect) {
    return tokenRect;
  }

  const point = resolvePositionRef(positionRef, context, fallbackAnchorRef);
  const fallbackLine = fallbackAnchorRef.line ?? ANCHOR_ROLE_RULES[fallbackAnchorRef.role].line;

  return getMoveErasePatch(point, getContextRect(context, fallbackLine), term);
};

export const getMovedTermExpression = (term: string | undefined) => {
  return getOppositeSignedTerm(term);
};

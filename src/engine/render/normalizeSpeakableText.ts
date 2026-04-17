const normalizeWhitespace = (value: string) => {
  return value.replace(/\s+/g, ' ').trim();
};

const stripMathWrappers = (value: string) => {
  return value
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/[{}]/g, '');
};

const verbalizeAtom = (value: string): string => {
  const trimmed = normalizeWhitespace(stripMathWrappers(value));

  if (!trimmed) {
    return '';
  }

  let normalized = trimmed
    .replace(/\+∞/g, '正无穷')
    .replace(/-∞/g, '负无穷')
    .replace(/∞/g, '无穷')
    .replace(/≤/g, '小于等于')
    .replace(/≥/g, '大于等于')
    .replace(/≠/g, '不等于')
    .replace(/=/g, '等于')
    .replace(/>/g, '大于')
    .replace(/</g, '小于')
    .replace(/∪/g, '并集')
    .replace(/,/g, ' 逗号 ')
    .replace(/\(/g, ' 括号 ')
    .replace(/\)/g, ' 括号 ')
    .replace(/\[/g, ' 方括号 ')
    .replace(/\]/g, ' 方括号 ');

  normalized = normalizeWhitespace(normalized);

  return normalized;
};

const normalizePowerAndRoot = (value: string) => {
  let normalized = value;

  normalized = normalized.replace(/\\sqrt\{([^{}]+)\}/g, (_match, inner: string) => {
    return `根号 ${verbalizeAtom(inner)}`;
  });
  normalized = normalized.replace(/√\(([^()]+)\)/g, (_match, inner: string) => {
    return `根号 ${verbalizeAtom(inner)}`;
  });
  normalized = normalized.replace(/√([a-zA-Z0-9]+)/g, (_match, inner: string) => {
    return `根号 ${verbalizeAtom(inner)}`;
  });
  normalized = normalized.replace(/\(([^()]+)\)\^2/g, (_match, inner: string) => {
    return `${verbalizeAtom(inner)} 的平方`;
  });
  normalized = normalized.replace(/([a-zA-Z0-9+-]+)\^2/g, (_match, inner: string) => {
    return `${verbalizeAtom(inner)} 的平方`;
  });
  normalized = normalized.replace(/([A-Za-z0-9])²/g, (_match, inner: string) => {
    return `${verbalizeAtom(inner)} 的平方`;
  });

  return normalized;
};

const normalizeDivision = (value: string) => {
  let normalized = value;
  let previous = '';

  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, (_match, left: string, right: string) => {
      return `${verbalizeAtom(left)} 除以 ${verbalizeAtom(right)}`;
    });
    normalized = normalized.replace(/\(([^()]+)\)\/([a-zA-Z0-9+\-]+)/g, (_match, left: string, right: string) => {
      return `${verbalizeAtom(left)} 除以 ${verbalizeAtom(right)}`;
    });
    normalized = normalized.replace(/([a-zA-Z0-9+\-]+)\/\(([^()]+)\)/g, (_match, left: string, right: string) => {
      return `${verbalizeAtom(left)} 除以 ${verbalizeAtom(right)}`;
    });
    normalized = normalized.replace(/([a-zA-Z0-9+\-]+)\/([a-zA-Z0-9+\-]+)/g, (_match, left: string, right: string) => {
      return `${verbalizeAtom(left)} 除以 ${verbalizeAtom(right)}`;
    });
  }

  return normalized;
};

const normalizeInterval = (value: string) => {
  return value.replace(/([\(\[])\s*([^,\]\)]+)\s*,\s*([^,\]\)]+)\s*([\)\]])/g, (_match, left, start, end, right) => {
    const leftBoundary = left === '[' ? '左闭区间' : '左开区间';
    const rightBoundary = right === ']' ? '右闭区间' : '右开区间';
    return `${leftBoundary} ${verbalizeAtom(start)} 到 ${verbalizeAtom(end)} ${rightBoundary}`;
  });
};

const normalizeOrderedPair = (value: string) => {
  let normalized = value;

  normalized = normalized.replace(
    /\(([^(),∞]+),\s*([^(),∞]+)\)\s*=\s*\(([^(),∞]+),\s*([^(),∞]+)\)/g,
    (_match, leftX: string, leftY: string, rightX: string, rightY: string) => {
      return `有序数对 ${verbalizeAtom(leftX)} 逗号 ${verbalizeAtom(leftY)}，等于，${verbalizeAtom(rightX)} 逗号 ${verbalizeAtom(rightY)}`;
    }
  );

  return normalized.replace(/答案是[:：]\s*\(([^(),∞]+),\s*([^(),∞]+)\)/g, (_match, left: string, right: string) => {
    return `答案是有序数对 ${verbalizeAtom(left)} 逗号 ${verbalizeAtom(right)}`;
  });
};

const normalizeOperators = (value: string) => {
  return value
    .replace(/([0-9a-zA-Z)\]])\+([0-9a-zA-Z(\[√])/g, '$1 加 $2')
    .replace(/([0-9a-zA-Z)\]])-([0-9a-zA-Z(\[√])/g, '$1 减 $2')
    .replace(/\\leq?|≤/g, ' 小于等于 ')
    .replace(/\\geq?|≥/g, ' 大于等于 ')
    .replace(/\\neq|\\ne|≠/g, ' 不等于 ')
    .replace(/(?<![<>!])=(?![=])/g, ' 等于 ')
    .replace(/>(?![=])/g, ' 大于 ')
    .replace(/<(?![=])/g, ' 小于 ')
    .replace(/∪|\\cup/g, ' 并集 ')
    .replace(/\\infty/g, ' 无穷 ');
};

const cleanupSpeakableText = (value: string) => {
  return normalizeWhitespace(
    value
      .replace(/[()]/g, ' ')
      .replace(/\s+([，。！？；：])/g, '$1')
      .replace(/([，。！？；：])\s+/g, '$1 ')
      .replace(/\s+/g, ' ')
  );
};

export const normalizeSpeakableText = (
  text: string,
  options?: {
    pauseAfterType?: PauseType;
  }
) => {
  const trimmed = normalizeWhitespace(text);

  if (!trimmed) {
    return '';
  }

  let normalized = stripMathWrappers(trimmed)
    .replace(/\\sqrt/g, '√')
    .replace(/\\cup/g, '∪')
    .replace(/\\infty/g, '∞')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\neq|\\ne/g, '≠');

  normalized = normalizeOrderedPair(normalized);
  normalized = normalizeInterval(normalized);
  normalized = normalizePowerAndRoot(normalized);
  normalized = normalizeDivision(normalized);
  normalized = normalized
    .replace(/\+∞/g, '正无穷')
    .replace(/-∞/g, '负无穷')
    .replace(/∞/g, '无穷');
  normalized = normalizeOperators(normalized);
  let speakableText = cleanupSpeakableText(normalized) || trimmed;

  if (options?.pauseAfterType === 'result' && !/[。！？]$/.test(speakableText)) {
    speakableText += '。';
  }

  if (options?.pauseAfterType === 'thinking' && !/[.…]$/.test(speakableText)) {
    speakableText += '…';
  }

  return speakableText;
};
import type {PauseType} from './voiceCueTypes';

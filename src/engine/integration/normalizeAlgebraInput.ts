export type AlgebraNormalizationResult = {
  changed: boolean;
  input: string;
  normalizedEquation: string;
};

const COMMON_WRAPPER_PREFIXES = [
  '解方程',
  '解不等式',
  '解这个方程',
  '解这个不等式',
  '求解',
  '请解',
  '请计算',
  '方程组',
  '不等式',
  '方程'
];

const normalizeUnicodeRelations = (value: string) => {
  return value
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/＝/g, '=')
    .replace(/＜/g, '<')
    .replace(/＞/g, '>');
};

const normalizePunctuation = (value: string) => {
  return value
    .replace(/[，、；;]/g, ',')
    .replace(/[。！？]/g, ' ')
    .replace(/[：:]/g, ' ');
};

const extractAlgebraCandidate = (value: string) => {
  const candidates = value.match(/[a-zA-Z0-9+\-*/^()=<>,.\s]+/g) ?? [];
  const relationPattern = /(<=|>=|=|<|>)/;
  const candidate =
    candidates
      .map((entry) => entry.trim())
      .filter((entry) => relationPattern.test(entry))
      .sort((left, right) => right.length - left.length)[0] ?? value.trim();

  return candidate;
};

const stripCommonWrappers = (value: string) => {
  let result = value.trim();

  COMMON_WRAPPER_PREFIXES.forEach((prefix) => {
    if (result.startsWith(prefix)) {
      result = result.slice(prefix.length).trim();
    }
  });

  return result;
};

const normalizeSystemSeparatorSpaces = (value: string) => {
  if (/[;,]/.test(value)) {
    return value;
  }

  const relationCount = (value.match(/(<=|>=|=|<|>)/g) ?? []).length;

  if (relationCount < 2) {
    return value;
  }

  return value.replace(
    /((?:<=|>=|=|<|>)\s*-?\d+)\s+(?=[+-]?\d*[xy])/,
    '$1,'
  );
};

const normalizeSpacing = (value: string) => {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*(<=|>=|=|<|>)\s*/g, '$1')
    .replace(/\s*([+\-*/^()])\s*/g, '$1')
    .trim();
};

export const normalizeAlgebraInput = (input: string): AlgebraNormalizationResult => {
  const originalInput = input;
  let normalizedEquation = input.trim();

  normalizedEquation = normalizeUnicodeRelations(normalizedEquation);
  normalizedEquation = normalizePunctuation(normalizedEquation);
  normalizedEquation = stripCommonWrappers(normalizedEquation);
  normalizedEquation = extractAlgebraCandidate(normalizedEquation);
  normalizedEquation = normalizedEquation.toLowerCase();
  normalizedEquation = normalizeSystemSeparatorSpaces(normalizedEquation);
  normalizedEquation = normalizeSpacing(normalizedEquation).replace(/\.+$/g, '').trim();

  return {
    changed: normalizedEquation !== originalInput.trim(),
    input: originalInput,
    normalizedEquation
  };
};

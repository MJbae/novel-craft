export interface AiSmellResult {
  avgSentenceLength: number;
  dialogueRatio: number;
  explanationDensity: number;
  repetitionRate: number;
}

export interface SmellWarning {
  metric: string;
  actual: number;
  expected: string;
  suggestion: string;
}

const SMELL_TARGETS = {
  avgSentenceLength: { min: 15, max: 35 },
  dialogueRatio: { min: 0.40, max: 0.60 },
  explanationDensity: { max: 0.05 },
  repetitionRate: { max: 0.03 },
} as const;

const EXPLANATION_PATTERNS = [
  '것이다',
  '때문이다',
  '할 수 있다',
  '하는 것이',
  '되는 것이',
  '인 것이다',
  '라고 할 수 있다',
  '라는 것이다',
  '것으로 보인다',
  '가능성이 있다',
];

function calcAvgSentenceLength(content: string): number {
  const sentences = content
    .split(/[.!?。]\s*/)
    .filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const totalLength = sentences.reduce(
    (sum, s) => sum + s.replace(/\s/g, '').length,
    0,
  );
  return totalLength / sentences.length;
}

function calcDialogueRatio(content: string): number {
  const contentLength = content.replace(/\s/g, '').length;
  if (contentLength === 0) return 0;
  const doubleQuoteMatches = content.match(/"[^"]*"/g) || [];
  const bracketMatches = content.match(/「[^」]*」/g) || [];
  const dialogueChars =
    doubleQuoteMatches.join('').length + bracketMatches.join('').length;
  return dialogueChars / contentLength;
}

function calcExplanationDensity(content: string): number {
  const sentences = content
    .split(/[.!?。]/)
    .filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const regex = new RegExp(
    EXPLANATION_PATTERNS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'g',
  );
  const matches = content.match(regex) || [];
  return matches.length / sentences.length;
}

function calcRepetitionRate(content: string): number {
  const chars = content.replace(/\s/g, '');
  if (chars.length < 2) return 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < chars.length - 1; i++) {
    const bg = chars.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }
  if (bigrams.size === 0) return 0;
  const repeated = [...bigrams.values()].filter((v) => v > 3).length;
  return repeated / bigrams.size;
}

export function checkAiSmell(content: string): AiSmellResult {
  return {
    avgSentenceLength:
      Math.round(calcAvgSentenceLength(content) * 100) / 100,
    dialogueRatio: Math.round(calcDialogueRatio(content) * 1000) / 1000,
    explanationDensity:
      Math.round(calcExplanationDensity(content) * 1000) / 1000,
    repetitionRate: Math.round(calcRepetitionRate(content) * 1000) / 1000,
  };
}

export function formatSmellWarnings(result: AiSmellResult): SmellWarning[] {
  const warnings: SmellWarning[] = [];

  if (result.avgSentenceLength < SMELL_TARGETS.avgSentenceLength.min) {
    warnings.push({
      metric: '평균 문장 길이',
      actual: result.avgSentenceLength,
      expected: `${SMELL_TARGETS.avgSentenceLength.min}~${SMELL_TARGETS.avgSentenceLength.max}자`,
      suggestion: '짧은 문장을 합치거나 묘사를 추가하세요',
    });
  } else if (result.avgSentenceLength > SMELL_TARGETS.avgSentenceLength.max) {
    warnings.push({
      metric: '평균 문장 길이',
      actual: result.avgSentenceLength,
      expected: `${SMELL_TARGETS.avgSentenceLength.min}~${SMELL_TARGETS.avgSentenceLength.max}자`,
      suggestion: '긴 문장을 나누세요',
    });
  }

  if (result.dialogueRatio < SMELL_TARGETS.dialogueRatio.min) {
    warnings.push({
      metric: '대화 비율',
      actual: result.dialogueRatio,
      expected: `${(SMELL_TARGETS.dialogueRatio.min * 100).toFixed(0)}~${(SMELL_TARGETS.dialogueRatio.max * 100).toFixed(0)}%`,
      suggestion: '대화를 추가하세요',
    });
  } else if (result.dialogueRatio > SMELL_TARGETS.dialogueRatio.max) {
    warnings.push({
      metric: '대화 비율',
      actual: result.dialogueRatio,
      expected: `${(SMELL_TARGETS.dialogueRatio.min * 100).toFixed(0)}~${(SMELL_TARGETS.dialogueRatio.max * 100).toFixed(0)}%`,
      suggestion: '서술/묘사를 추가하세요',
    });
  }

  if (result.explanationDensity > SMELL_TARGETS.explanationDensity.max) {
    warnings.push({
      metric: '설명체 밀도',
      actual: result.explanationDensity,
      expected: `<${(SMELL_TARGETS.explanationDensity.max * 100).toFixed(0)}%`,
      suggestion: '"~것이다" 등 설명조 표현을 제거하세요',
    });
  }

  if (result.repetitionRate > SMELL_TARGETS.repetitionRate.max) {
    warnings.push({
      metric: '반복률',
      actual: result.repetitionRate,
      expected: `<${(SMELL_TARGETS.repetitionRate.max * 100).toFixed(0)}%`,
      suggestion: '반복되는 표현을 다양하게 바꾸세요',
    });
  }

  return warnings;
}

function formatActualValue(metric: string, actual: number): string {
  if (metric === '평균 문장 길이') {
    return `${Math.round(actual)}자`;
  }
  return `${(actual * 100).toFixed(1)}%`;
}

export function formatWarningsAsText(warnings: SmellWarning[]): string {
  if (warnings.length === 0) return '';
  return warnings
    .map(
      (w) =>
        `- ${w.metric}: ${formatActualValue(w.metric, w.actual)} (목표: ${w.expected}) — ${w.suggestion}`,
    )
    .join('\n');
}

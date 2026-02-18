import type { StyleMetrics, ValidationWarning, ValidationResult } from '@/types';
import { checkAiSmell } from './style-check';

const TARGETS = {
  wordCount: { min: 7000, max: 9000 },
  sceneCount: { min: 3 },
  avgSentenceLength: { min: 15, max: 35 },
  dialogueRatio: { min: 0.40, max: 0.60 },
  explanationDensity: { max: 0.05 },
  repetitionRate: { max: 0.03 },
} as const;

const HOOK_KEYWORDS = [
  '그런데', '하지만', '그때', '갑자기', '순간',
  '설마', '아직', '과연', '비밀', '진실',
  '다시', '처음으로', '마지막', '반드시', '결국',
  '그러나', '뜻밖에', '예상치 못한', '알 수 없는', '불길한',
  '떨림', '숨겨진', '감춰진', '위험', '경고',
  '의문', '수상한', '이상한', '낯선', '돌연',
];

const CLIFFHANGER_PATTERN = /[…—]+\s*$|\.{3,}\s*$/;
const SIMPLE_CONCLUSION_PATTERN = /[가-힣]+했다\.\s*$/;
const DIALOGUE_CLOSURE_PATTERN = /["」]\s*[.。]?\s*$/;

export interface EndingHookAnalysis {
  valid: boolean;
  score: number;
  reasons: string[];
}

function checkWordCount(content: string): number {
  return content.replace(/\s/g, '').length;
}

function checkSceneCount(content: string): number {
  return content.split(/^###/m).length;
}

export function analyzeEndingHook(content: string): EndingHookAnalysis {
  const reasons: string[] = [];
  let score = 0;

  if (content.replace(/\s/g, '').length < 500) {
    return {
      valid: false,
      score: 0,
      reasons: ['콘텐츠가 500자 미만으로 엔딩 훅 판정 불가'],
    };
  }

  const lastChars = content.slice(-500);
  const trimmedEnd = lastChars.trimEnd();

  if (DIALOGUE_CLOSURE_PATTERN.test(trimmedEnd)) {
    reasons.push('대화문으로 끝남 — 서술적 훅이 필요합니다');
  } else {
    score += 15;
    reasons.push('대화문으로 끝나지 않음 (양호)');
  }

  const matchedKeywords = HOOK_KEYWORDS.filter((kw) => lastChars.includes(kw));
  if (matchedKeywords.length > 0) {
    const keywordScore = Math.min(matchedKeywords.length * 10, 30);
    score += keywordScore;
    reasons.push(
      `긴장감 키워드 발견: ${matchedKeywords.slice(0, 3).join(', ')}`,
    );
  } else {
    reasons.push('긴장감 키워드 없음');
  }

  const last200 = content.slice(-200);
  if (/[?!？！]/.test(last200)) {
    score += 20;
    reasons.push('마지막 200자 내 물음표/느낌표 존재');
  } else {
    reasons.push('마지막 200자 내 물음표/느낌표 없음');
  }

  if (SIMPLE_CONCLUSION_PATTERN.test(trimmedEnd)) {
    score -= 15;
    reasons.push('단순 서술 종결("~했다.")로 끝남 — 긴장감 부족');
  } else {
    score += 10;
    reasons.push('단순 서술 종결이 아님 (양호)');
  }

  if (CLIFFHANGER_PATTERN.test(trimmedEnd)) {
    score += 25;
    reasons.push('클리프행어 패턴 발견 (말줄임/대시)');
  }

  score = Math.max(0, Math.min(100, score));
  const valid = score >= 30;

  if (valid) {
    reasons.push(`종합 점수 ${score}/100 — 유효한 엔딩 훅`);
  } else {
    reasons.push(`종합 점수 ${score}/100 — 엔딩 훅 보강 필요`);
  }

  return { valid, score, reasons };
}

function checkEndingHook(content: string): boolean {
  return analyzeEndingHook(content).valid;
}

function collectMetrics(content: string): StyleMetrics {
  const smell = checkAiSmell(content);
  return {
    wordCount: checkWordCount(content),
    sceneCount: checkSceneCount(content),
    endingHookValid: checkEndingHook(content),
    avgSentenceLength: smell.avgSentenceLength,
    dialogueRatio: smell.dialogueRatio,
    explanationDensity: smell.explanationDensity,
    repetitionRate: smell.repetitionRate,
  };
}

function generateWarnings(metrics: StyleMetrics): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (metrics.wordCount < TARGETS.wordCount.min) {
    warnings.push({
      metric: 'wordCount',
      actual: metrics.wordCount,
      expected: `${TARGETS.wordCount.min}~${TARGETS.wordCount.max}`,
      severity: 'error',
      suggestion: `분량이 ${TARGETS.wordCount.min - metrics.wordCount}자 부족합니다. 장면 묘사나 대화를 추가하세요.`,
    });
  } else if (metrics.wordCount > TARGETS.wordCount.max) {
    warnings.push({
      metric: 'wordCount',
      actual: metrics.wordCount,
      expected: `${TARGETS.wordCount.min}~${TARGETS.wordCount.max}`,
      severity: 'warning',
      suggestion: `분량이 ${metrics.wordCount - TARGETS.wordCount.max}자 초과했습니다. 불필요한 설명을 줄여보세요.`,
    });
  }

  if (metrics.sceneCount < TARGETS.sceneCount.min) {
    warnings.push({
      metric: 'sceneCount',
      actual: metrics.sceneCount,
      expected: `>= ${TARGETS.sceneCount.min}`,
      severity: 'error',
      suggestion: `장면이 ${TARGETS.sceneCount.min}개 이상 필요합니다. ### 구분자로 장면을 나누세요.`,
    });
  }

  if (!metrics.endingHookValid) {
    warnings.push({
      metric: 'endingHookValid',
      actual: 0,
      expected: '유효한 엔딩 훅',
      severity: 'warning',
      suggestion:
        '엔딩이 대화로 끝나거나 훅이 부족합니다. 반전/질문/긴장감 있는 서술로 마무리하세요.',
    });
  }

  if (metrics.avgSentenceLength < TARGETS.avgSentenceLength.min) {
    warnings.push({
      metric: 'avgSentenceLength',
      actual: metrics.avgSentenceLength,
      expected: `${TARGETS.avgSentenceLength.min}~${TARGETS.avgSentenceLength.max}`,
      severity: 'warning',
      suggestion: '문장이 너무 짧습니다. 묘사를 추가해 문장 길이를 늘려보세요.',
    });
  } else if (metrics.avgSentenceLength > TARGETS.avgSentenceLength.max) {
    warnings.push({
      metric: 'avgSentenceLength',
      actual: metrics.avgSentenceLength,
      expected: `${TARGETS.avgSentenceLength.min}~${TARGETS.avgSentenceLength.max}`,
      severity: 'warning',
      suggestion: '문장이 너무 깁니다. 긴 문장을 나누어 가독성을 높이세요.',
    });
  }

  if (metrics.dialogueRatio < TARGETS.dialogueRatio.min) {
    warnings.push({
      metric: 'dialogueRatio',
      actual: metrics.dialogueRatio,
      expected: `${TARGETS.dialogueRatio.min}~${TARGETS.dialogueRatio.max}`,
      severity: 'warning',
      suggestion: `대화 비율이 ${(metrics.dialogueRatio * 100).toFixed(1)}%로 낮습니다. 대화를 추가하세요.`,
    });
  } else if (metrics.dialogueRatio > TARGETS.dialogueRatio.max) {
    warnings.push({
      metric: 'dialogueRatio',
      actual: metrics.dialogueRatio,
      expected: `${TARGETS.dialogueRatio.min}~${TARGETS.dialogueRatio.max}`,
      severity: 'warning',
      suggestion: `대화 비율이 ${(metrics.dialogueRatio * 100).toFixed(1)}%로 높습니다. 서술/묘사를 추가하세요.`,
    });
  }

  if (metrics.explanationDensity > TARGETS.explanationDensity.max) {
    warnings.push({
      metric: 'explanationDensity',
      actual: metrics.explanationDensity,
      expected: `< ${TARGETS.explanationDensity.max}`,
      severity: 'warning',
      suggestion: `설명체 밀도가 ${(metrics.explanationDensity * 100).toFixed(1)}%입니다. "것이다/때문이다" 등의 표현을 줄이세요.`,
    });
  }

  if (metrics.repetitionRate > TARGETS.repetitionRate.max) {
    warnings.push({
      metric: 'repetitionRate',
      actual: metrics.repetitionRate,
      expected: `< ${TARGETS.repetitionRate.max}`,
      severity: 'warning',
      suggestion: `반복률이 ${(metrics.repetitionRate * 100).toFixed(1)}%입니다. 다양한 표현을 사용하세요.`,
    });
  }

  return warnings;
}

export function validateEpisode(content: string): ValidationResult {
  const metrics = collectMetrics(content);
  const warnings = generateWarnings(metrics);
  const passed = warnings.every((w) => w.severity !== 'error');
  return { metrics, warnings, passed };
}

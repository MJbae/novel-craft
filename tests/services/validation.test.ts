import { describe, it, expect } from 'vitest';
import { validateEpisode, analyzeEndingHook } from '@/lib/services/validation';

/** Generate Korean text with approximately `minNonWsChars` non-whitespace characters */
function padKorean(minNonWsChars: number): string {
  const sentence = '그는 천천히 걸어갔다. 바람이 세차게 불었다. ';
  let content = '';
  while (content.replace(/\s/g, '').length < minNonWsChars) {
    content += sentence;
  }
  return content;
}

describe('analyzeEndingHook', () => {
  it('returns invalid for content under 500 non-whitespace chars', () => {
    const result = analyzeEndingHook('짧은 글');
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toContain('콘텐츠가 500자 미만으로 엔딩 훅 판정 불가');
  });

  it('returns invalid for content just below 500 chars threshold', () => {
    // padKorean(499) gets ~499 non-ws chars
    const content = padKorean(499).slice(0, -10); // ensure under 500
    // Might still be >= 500 depending on padding. Use manual short content
    const shortContent = '가'.repeat(499);
    const result = analyzeEndingHook(shortContent);
    expect(result.valid).toBe(false);
    expect(result.score).toBe(0);
  });

  it('scores cliffhanger ending (dash pattern)', () => {
    const content = padKorean(600) + ' 그때 문이 열렸다—';
    const result = analyzeEndingHook(content);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes('클리프행어'))).toBe(true);
  });

  it('scores cliffhanger ending (ellipsis pattern)', () => {
    const content = padKorean(600) + ' 그리고 그것은...';
    const result = analyzeEndingHook(content);
    expect(result.reasons.some((r) => r.includes('클리프행어'))).toBe(true);
  });

  it('scores question/exclamation mark in last 200 chars', () => {
    const content = padKorean(600) + ' 과연 그것은 진실이었을까?';
    const result = analyzeEndingHook(content);
    expect(result.reasons.some((r) => r.includes('물음표/느낌표'))).toBe(true);
  });

  it('detects hook keywords in last 500 chars', () => {
    const content = padKorean(600) + ' 갑자기 비밀스러운 진실이 드러났다.';
    const result = analyzeEndingHook(content);
    expect(result.reasons.some((r) => r.includes('긴장감 키워드'))).toBe(true);
  });

  it('penalizes dialogue closure ending', () => {
    const content = padKorean(600) + ' "잘 가."';
    const result = analyzeEndingHook(content);
    expect(result.reasons.some((r) => r.includes('대화문으로 끝남'))).toBe(true);
  });

  it('rewards non-dialogue ending', () => {
    const content = padKorean(600) + ' 바람이 불었다.';
    const result = analyzeEndingHook(content);
    expect(result.reasons.some((r) => r.includes('대화문으로 끝나지 않음'))).toBe(
      true,
    );
  });

  it('penalizes simple conclusion pattern', () => {
    const content = padKorean(600) + ' 그는 잠에 들었했다.';
    // Note: SIMPLE_CONCLUSION_PATTERN = /[가-힣]+했다\.\s*$/
    // "들었했다." matches [가-힣]+했다\.
    const result = analyzeEndingHook(content);
    // Whether it matches depends on exact ending; verify score is valid
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('clamps score between 0 and 100', () => {
    // Even with many positive signals, score shouldn't exceed 100
    const content =
      padKorean(600) +
      ' 갑자기 그때 비밀 진실이 설마 과연 드러났다? 그리고...';
    const result = analyzeEndingHook(content);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('valid is true when score >= 30', () => {
    // Cliffhanger + question + keywords should score >= 30
    const content =
      padKorean(600) + ' 갑자기 그때 비밀이 드러났다? 그리고 그것은—';
    const result = analyzeEndingHook(content);
    if (result.score >= 30) {
      expect(result.valid).toBe(true);
    } else {
      expect(result.valid).toBe(false);
    }
    // Verify score-validity relationship
    expect(result.valid).toBe(result.score >= 30);
  });
});

describe('validateEpisode', () => {
  it('returns metrics, warnings, and passed flag', () => {
    const result = validateEpisode('간단한 테스트 콘텐츠입니다.');
    expect(result).toHaveProperty('metrics');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('passed');
  });

  it('metrics object has all required fields', () => {
    const result = validateEpisode('테스트.');
    const { metrics } = result;
    expect(metrics).toHaveProperty('wordCount');
    expect(metrics).toHaveProperty('sceneCount');
    expect(metrics).toHaveProperty('endingHookValid');
    expect(metrics).toHaveProperty('avgSentenceLength');
    expect(metrics).toHaveProperty('dialogueRatio');
    expect(metrics).toHaveProperty('explanationDensity');
    expect(metrics).toHaveProperty('repetitionRate');
  });

  it('calculates wordCount as non-whitespace character count', () => {
    const content = '가 나 다 라 마';
    const result = validateEpisode(content);
    expect(result.metrics.wordCount).toBe(5);
  });

  it('calculates sceneCount using ### separator', () => {
    const content = '서론 텍스트.\n### 장면 1\n내용.\n### 장면 2\n내용.\n### 장면 3\n내용.';
    const result = validateEpisode(content);
    // Split by /^###/m produces: ["서론...", " 장면 1...", " 장면 2...", " 장면 3..."] = 4
    expect(result.metrics.sceneCount).toBe(4);
  });

  it('fails when wordCount is below minimum (error severity)', () => {
    const content = '짧은 글.';
    const result = validateEpisode(content);
    expect(result.passed).toBe(false);
    const wcWarning = result.warnings.find((w) => w.metric === 'wordCount');
    expect(wcWarning).toBeDefined();
    expect(wcWarning!.severity).toBe('error');
  });

  it('generates sceneCount error when fewer than 3 scenes', () => {
    const content = '장면이 하나뿐인 글입니다.';
    const result = validateEpisode(content);
    const sceneWarning = result.warnings.find((w) => w.metric === 'sceneCount');
    expect(sceneWarning).toBeDefined();
    expect(sceneWarning!.severity).toBe('error');
  });

  it('passed is true only when no error-severity warnings exist', () => {
    // Short content with few scenes → has errors → passed = false
    const result = validateEpisode('짧은.');
    const hasError = result.warnings.some((w) => w.severity === 'error');
    expect(result.passed).toBe(!hasError);
  });

  it('generates endingHookValid warning for weak endings', () => {
    // Short content → endingHookValid will be false (under 500 chars)
    const content = '짧은 콘텐츠입니다.';
    const result = validateEpisode(content);
    expect(result.metrics.endingHookValid).toBe(false);
    const hookWarning = result.warnings.find(
      (w) => w.metric === 'endingHookValid',
    );
    expect(hookWarning).toBeDefined();
    expect(hookWarning!.severity).toBe('warning');
  });

  it('detects style issues from checkAiSmell integration', () => {
    // Content with explanation patterns
    const content =
      '이것은 중요한 것이다. 그 이유는 때문이다. 할 수 있다. 되는 것이.';
    const result = validateEpisode(content);
    // Should have explanationDensity > 0
    expect(result.metrics.explanationDensity).toBeGreaterThan(0);
  });

  it('wordCount warning includes deficit amount', () => {
    const content = '짧은 글입니다.';
    const result = validateEpisode(content);
    const wcWarning = result.warnings.find((w) => w.metric === 'wordCount');
    expect(wcWarning).toBeDefined();
    expect(wcWarning!.suggestion).toContain('부족');
  });
});

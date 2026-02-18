import { describe, it, expect } from 'vitest';
import {
  checkAiSmell,
  formatSmellWarnings,
  formatWarningsAsText,
} from '@/lib/services/style-check';
import type { AiSmellResult } from '@/lib/services/style-check';

describe('style-check', () => {
  describe('checkAiSmell', () => {
    it('returns zeros for empty content', () => {
      const result = checkAiSmell('');
      expect(result.avgSentenceLength).toBe(0);
      expect(result.dialogueRatio).toBe(0);
      expect(result.explanationDensity).toBe(0);
      expect(result.repetitionRate).toBe(0);
    });

    it('calculates average sentence length correctly', () => {
      // Two sentences: "가나다라마바사" (7 chars) and "아자차카타파하" (7 chars)
      const content = '가나다라마바사. 아자차카타파하.';
      const result = checkAiSmell(content);
      expect(result.avgSentenceLength).toBe(7);
    });

    it('handles single sentence', () => {
      const content = '가나다라마바사아자차.';
      const result = checkAiSmell(content);
      // 10 chars / 1 sentence = 10
      expect(result.avgSentenceLength).toBe(10);
    });

    it('calculates dialogue ratio with double quotes', () => {
      const result = checkAiSmell('"대화"나머지부분입');
      expect(result.dialogueRatio).toBeGreaterThan(0);
      expect(result.dialogueRatio).toBe(0.4);
    });

    it('calculates dialogue ratio with bracket quotes', () => {
      const result = checkAiSmell('「대화」나머지부분입');
      expect(result.dialogueRatio).toBeGreaterThan(0);
    });

    it('returns zero dialogue ratio for content without quotes', () => {
      const result = checkAiSmell('대화가 없는 서술문입니다.');
      expect(result.dialogueRatio).toBe(0);
    });

    it('detects explanation patterns', () => {
      // 3 sentences, 3 explanation patterns
      const content = '이것은 중요한 것이다. 그 이유는 때문이다. 우리가 할 수 있다.';
      const result = checkAiSmell(content);
      expect(result.explanationDensity).toBeGreaterThan(0);
      // 3 patterns / 3 sentences = 1.0
      expect(result.explanationDensity).toBe(1);
    });

    it('returns zero explanation density for clean prose', () => {
      const content = '바람이 불었다. 나뭇잎이 흩날렸다. 그가 걸어갔다.';
      const result = checkAiSmell(content);
      expect(result.explanationDensity).toBe(0);
    });

    it('returns high repetition rate for repetitive content', () => {
      // "가나" repeated many times → bigram "가나" and "나가" each appear >3 times
      const result = checkAiSmell('가나가나가나가나가나.');
      expect(result.repetitionRate).toBeGreaterThan(0);
    });

    it('returns zero repetition rate for diverse content', () => {
      const result = checkAiSmell('가나다라마바사아자차.');
      expect(result.repetitionRate).toBe(0);
    });

    it('returns zero repetition for single-char content', () => {
      const result = checkAiSmell('가');
      expect(result.repetitionRate).toBe(0);
    });

    it('returns rounded values', () => {
      const content = '이것은 테스트 문장이다. 두 번째 문장.';
      const result = checkAiSmell(content);

      // avgSentenceLength: rounded to 2 decimal places (x100/100)
      const aslStr = result.avgSentenceLength.toString();
      const aslDecimals = aslStr.includes('.') ? aslStr.split('.')[1].length : 0;
      expect(aslDecimals).toBeLessThanOrEqual(2);

      // dialogueRatio: rounded to 3 decimal places (x1000/1000)
      const drStr = result.dialogueRatio.toString();
      const drDecimals = drStr.includes('.') ? drStr.split('.')[1].length : 0;
      expect(drDecimals).toBeLessThanOrEqual(3);
    });
  });

  describe('formatSmellWarnings', () => {
    it('returns no warnings for good metrics', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 25,
        dialogueRatio: 0.5,
        explanationDensity: 0.02,
        repetitionRate: 0.01,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings).toHaveLength(0);
    });

    it('warns when avg sentence length is too short', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 10,
        dialogueRatio: 0.5,
        explanationDensity: 0.02,
        repetitionRate: 0.01,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].metric).toBe('평균 문장 길이');
      expect(warnings[0].suggestion).toContain('합치거나');
    });

    it('warns when avg sentence length is too long', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 40,
        dialogueRatio: 0.5,
        explanationDensity: 0.02,
        repetitionRate: 0.01,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].metric).toBe('평균 문장 길이');
      expect(warnings[0].suggestion).toContain('나누세요');
    });

    it('warns when dialogue ratio is too low', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 25,
        dialogueRatio: 0.2,
        explanationDensity: 0.02,
        repetitionRate: 0.01,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings.some((w) => w.metric === '대화 비율')).toBe(true);
      expect(warnings.find((w) => w.metric === '대화 비율')!.suggestion).toContain(
        '대화를 추가',
      );
    });

    it('warns when dialogue ratio is too high', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 25,
        dialogueRatio: 0.8,
        explanationDensity: 0.02,
        repetitionRate: 0.01,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings.some((w) => w.metric === '대화 비율')).toBe(true);
      expect(warnings.find((w) => w.metric === '대화 비율')!.suggestion).toContain(
        '서술/묘사',
      );
    });

    it('warns when explanation density is too high', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 25,
        dialogueRatio: 0.5,
        explanationDensity: 0.1,
        repetitionRate: 0.01,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings.some((w) => w.metric === '설명체 밀도')).toBe(true);
    });

    it('warns when repetition rate is too high', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 25,
        dialogueRatio: 0.5,
        explanationDensity: 0.02,
        repetitionRate: 0.1,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings.some((w) => w.metric === '반복률')).toBe(true);
    });

    it('returns multiple warnings when multiple metrics are bad', () => {
      const result: AiSmellResult = {
        avgSentenceLength: 10,
        dialogueRatio: 0.2,
        explanationDensity: 0.1,
        repetitionRate: 0.1,
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings.length).toBe(4);
    });

    it('returns warnings at boundary values (exactly at threshold)', () => {
      // At exact min/max, no warning should be generated
      const result: AiSmellResult = {
        avgSentenceLength: 15, // exactly at min → no warning
        dialogueRatio: 0.4, // exactly at min → no warning
        explanationDensity: 0.05, // exactly at max → no warning
        repetitionRate: 0.03, // exactly at max → no warning
      };
      const warnings = formatSmellWarnings(result);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('formatWarningsAsText', () => {
    it('returns empty string for no warnings', () => {
      expect(formatWarningsAsText([])).toBe('');
    });

    it('formats sentence length metric with 자 suffix', () => {
      const warnings = [
        {
          metric: '평균 문장 길이',
          actual: 10,
          expected: '15~35자',
          suggestion: '짧은 문장을 합치거나 묘사를 추가하세요',
        },
      ];
      const text = formatWarningsAsText(warnings);
      expect(text).toContain('- 평균 문장 길이');
      expect(text).toContain('10자');
      expect(text).toContain('15~35자');
      expect(text).toContain('짧은 문장을 합치거나 묘사를 추가하세요');
    });

    it('formats percentage values for non-sentence-length metrics', () => {
      const warnings = [
        {
          metric: '대화 비율',
          actual: 0.2,
          expected: '40~60%',
          suggestion: '대화를 추가하세요',
        },
      ];
      const text = formatWarningsAsText(warnings);
      expect(text).toContain('20.0%');
    });

    it('formats multiple warnings as newline-separated lines', () => {
      const warnings = [
        {
          metric: '평균 문장 길이',
          actual: 10,
          expected: '15~35자',
          suggestion: 'A',
        },
        {
          metric: '대화 비율',
          actual: 0.2,
          expected: '40~60%',
          suggestion: 'B',
        },
      ];
      const text = formatWarningsAsText(warnings);
      const lines = text.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^- 평균 문장 길이/);
      expect(lines[1]).toMatch(/^- 대화 비율/);
    });
  });
});

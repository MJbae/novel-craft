import type { Character } from '@/types';
import { formatVoiceProfile } from './helpers';

export function buildStylePrompt(params: {
  style_warnings: string;
  content: string;
  characters: Character[];
}): string {
  const charactersVoiceProfiles = params.characters
    .map(formatVoiceProfile)
    .join('\n\n');

  return `아래 원고의 문체를 교정해주세요.

## 규칙 (절대 준수)
1. **내용 변경 금지**: 사건, 대화 내용, 캐릭터 행동을 바꾸지 마세요. 문체와 표현만 다듬으세요.
2. AI 설명체 제거: "~것이다", "~때문이다", "~할 수 있다" → 자연스러운 서술체로
3. 캐릭터 말투 강화: 각 캐릭터의 지정된 어미를 더 빈번히 사용
4. 문장 호흡 조절: 너무 긴 문장은 분리, 너무 짧은 문장의 연속은 합치기
5. 반복 표현 제거: 같은 단어/구문이 근접 반복되면 동의어로 교체
6. 감정 직접 서술 → 행동/대사로 교체

## 경고된 메트릭 (이 부분을 집중 교정)
${params.style_warnings}

## 원고
${params.content}

## 캐릭터 말투 참조
${charactersVoiceProfiles}

## 출력
교정된 전체 원고를 출력하세요. 원고 본문만, 메타 코멘트 없이.`;
}

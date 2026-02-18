import type { Character } from '@/types';
import { formatVoiceProfile } from './helpers';

export function buildEpisodePrompt(params: {
  episode_number: number;
  genre: string;
  synopsis: string;
  worldbuilding: string;
  characters: Character[];
  previous_summaries: string;
  active_events: string;
  plot_position: string;
  structured_outline: string;
  tone: string;
  banned_elements: string;
}): string {
  const charactersVoiceProfiles = params.characters
    .map(formatVoiceProfile)
    .join('\n\n');

  return `당신은 한국 웹소설 전문 작가입니다. 아래 설정과 컨텍스트를 기반으로 ${params.episode_number}화를 작성해주세요.

## 작품 설정
- 장르: ${params.genre}
- 시놉시스: ${params.synopsis}
- 세계관: ${params.worldbuilding}

## 등장 캐릭터 (말투 규칙 엄격 준수)
${charactersVoiceProfiles}

## 직전 회차 요약
${params.previous_summaries}

## 진행 중인 이벤트 (모순 방지)
${params.active_events}

## 현재 플롯 위치
${params.plot_position}

## 이번 화 아웃라인
${params.structured_outline}
(각 장면의 goal/conflict/twist를 반드시 반영하세요)

## 작성 규칙 (위반 시 재생성)
1. 분량: 약 8,000자 (7,000~9,000자). 부족하면 장면을 깊게, 넘치면 요약하지 말고 장면을 나누세요.
2. 장면: 아웃라인의 모든 장면을 포함. 장면 전환은 ### 구분.
3. 문체: ${params.tone}. 모바일 가독성을 위해 한 문단 3줄 이내.
4. 대화: 총 분량의 40~60%. 캐릭터별 말투 어미를 반드시 구별하여 사용.
5. 설명체 금지: "~것이다", "~때문이다", "~할 수 있다" 등 AI 특유의 설명체를 최소화 (<5%).
6. 문장 길이: 평균 15~35자. 너무 길거나 짧은 문장 연속 금지.
7. 엔딩: 마지막 500자는 아웃라인의 ending_hook을 구현. 대화 종결이 아닌 서사적 긴장으로 마무리.
8. 감정: 직접 서술("슬펐다", "화가 났다") 최소화. 행동/대사/묘사로 표현.
9. 금지 요소: ${params.banned_elements}

## 출력
원고 본문만 출력하세요. 메타 코멘트 없이 소설 텍스트만.`;
}

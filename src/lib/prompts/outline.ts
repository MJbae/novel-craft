export function buildOutlinePrompt(params: {
  episode_number: number;
  genre: string;
  synopsis: string;
  previous_summaries: string;
  plot_position: string;
  active_events: string;
  additional_instructions: string;
}): string {
  return `당신은 한국 웹소설 전문 작가입니다. ${params.episode_number}화의 장면별 아웃라인을 설계해주세요.

## 작품 정보
- 장르: ${params.genre}
- 시놉시스: ${params.synopsis}

## 직전 흐름
${params.previous_summaries}

## 현재 플롯 위치
${params.plot_position}

## 진행 중인 이벤트
${params.active_events}

## 사용자 지시
${params.additional_instructions}

## 출력 형식 (JSON)
{
  "title": "이 화의 제목 (흥미를 끌 수 있는 짧은 문장, 15자 이내)",
  "scenes": [
    {
      "scene_number": 1,
      "goal": "이 장면에서 달성해야 할 서사적 목표",
      "conflict": "이 장면의 핵심 갈등 또는 긴장",
      "twist": "독자의 예상을 벗어나는 전환 (없으면 null)",
      "characters": ["등장 캐릭터 이름"],
      "emotion_intensity": 7
    }
  ],
  "ending_hook": "마지막 500자에서 구현할 훅 (구체적 상황 서술)",
  "estimated_word_count": 8000
}

## 규칙
- 최소 3개 장면, 최대 5개 장면
- 각 장면에 반드시 goal과 conflict 포함
- ending_hook은 '다음 화가 궁금해지는' 구체적 상황이어야 함
- emotion_intensity는 1~10 (전체적으로 단조롭지 않게 변화를 줄 것)`;
}

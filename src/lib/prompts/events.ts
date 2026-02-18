export function buildEventsPrompt(params: {
  episode_number: number;
  content: string;
}): string {
  return `아래 원고에서 주요 이벤트를 추출해주세요. 향후 일관성 유지를 위한 데이터로 사용됩니다.

## ${params.episode_number}화 원고
${params.content}

## 출력 형식 (JSON)
[
  {
    "event_type": "plot|character_state|relationship|foreshadow",
    "description": "구체적 이벤트 서술 (1~2문장)",
    "characters_involved": ["관련 캐릭터 이름"]
  }
]

## 추출 기준
- plot: 줄거리에 영향을 주는 사건 (전투, 발견, 이동 등)
- character_state: 캐릭터 상태 변화 (부상, 능력 각성, 감정 변화 등)
- relationship: 관계 변화 (동맹, 적대, 화해 등)
- foreshadow: 아직 해결되지 않은 복선, 떡밥

이벤트 수: 3~8개. 사소한 것은 제외하고 중요한 것만.`;
}

export function buildSummaryPrompt(params: {
  episode_number: number;
  content: string;
}): string {
  return `아래 회차의 핵심 내용을 요약해주세요. 다음 회차 작성을 위한 컨텍스트로 사용됩니다.

## ${params.episode_number}화 원고
${params.content}

## 출력 형식 (200자 이내)
- 주요 사건 (1~3개, 구체적으로)
- 캐릭터 상태 변화 (부상, 각성, 감정 등)
- 다음 화로 이어지는 떡밥/상황
- 해결되지 않은 갈등`;
}

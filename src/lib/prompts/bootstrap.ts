export function buildBootstrapPrompt(params: {
  genre: string;
  tone: string;
  protagonist_keywords: string;
  supporting_keywords: string;
  banned_elements: string;
  notes: string;
}): string {
  return `당신은 한국 웹소설 전문 작가이자 작품 기획자입니다.

아래 컨셉을 바탕으로 웹소설의 기초 설정을 생성해주세요.
캐릭터는 반드시 구별 가능한 말투를 가져야 합니다 — 말투만으로 누가 말하는지 알 수 있어야 합니다.

## 컨셉
- 장르: ${params.genre}
- 톤/느낌: ${params.tone}
- 주인공: ${params.protagonist_keywords}
- 조연: ${params.supporting_keywords}
- 금지 요소: ${params.banned_elements}
- 추가 메모: ${params.notes}

## 출력 형식 (JSON)
{
  "synopsis": "300~500자 시놉시스",
  "worldbuilding": "세계관 설정 (기술, 사회, 마법 체계 등)",
  "characters": [
    {
      "name": "이름",
      "role": "main|supporting",
      "personality": "성격 핵심 (3~5단어)",
      "speech_style": {
        "endings": ["자주 쓰는 어미 3~5개"],
        "banned_endings": ["절대 쓰지 않는 어미"],
        "catchphrases": ["입버릇, 감탄사"],
        "formality": "반말_기본|존댓말_기본|상대에_따라",
        "avg_dialogue_length": "15~40자 등 범위",
        "emotion_style": "절제형|격정형|유머형 등"
      },
      "behavioral_rules": {
        "values": ["핵심 가치관 1~3개"],
        "never_does": ["절대 하지 않는 행동"],
        "conflict_style": "직접 대면|회피|계략 등"
      },
      "appearance": "외형 핵심",
      "background": "배경 요약",
      "relationships": "관계"
    }
  ],
  "plot_outline": "50화 분량 플롯 골격 (10화 단위로 주요 사건과 전환점)"
}

## 중요
- 각 캐릭터의 말투 어미가 겹치지 않도록 설계하세요
- endings에 최소 3개, banned_endings에 최소 1개를 포함하세요
- 주인공과 히로인은 반드시 대비되는 말투 스타일을 가져야 합니다`;
}

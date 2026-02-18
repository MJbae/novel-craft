import type { Character } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  main: '주인공',
  supporting: '조연',
  minor: '단역',
};

const FORMALITY_LABEL: Record<string, string> = {
  반말_기본: '반말 기본',
  존댓말_기본: '존댓말 기본',
  상대에_따라: '상대에 따라',
};

const EMOTION_STYLE_DESC: Record<string, string> = {
  절제형: '감정을 직접 서술하지 말고 행동/대사로 표현',
  격정형: '감정을 강하게 직접 드러냄',
  유머형: '감정을 유머와 농담으로 표현',
  냉소형: '감정을 비꼬기나 무관심으로 표현',
  감성형: '감정을 섬세하고 서정적으로 표현',
};

export function formatVoiceProfile(character: Character): string {
  const { speech_style, behavioral_rules } = character;
  const role = ROLE_LABEL[character.role] ?? character.role;
  const formality = FORMALITY_LABEL[speech_style.formality] ?? speech_style.formality;
  const emotionDesc = EMOTION_STYLE_DESC[speech_style.emotion_style] ?? '';
  const emotionLine = emotionDesc
    ? `${speech_style.emotion_style} — ${emotionDesc}`
    : speech_style.emotion_style;

  const lines: string[] = [
    `### ${character.name} (${role})`,
    `- 성격: ${character.personality ?? '미설정'}`,
    `- 말투 어미: ${speech_style.endings.join(', ')} (반드시 대사에 이 어미를 빈번히 사용)`,
    `- 금지 어미: ${speech_style.banned_endings.join(', ')} (절대 사용 금지)`,
    `- 입버릇: ${speech_style.catchphrases.map((c) => `"${c}"`).join(', ')}`,
    `- 존댓말: ${formality}`,
    `- 감정 표현: ${emotionLine}`,
    `- 절대 하지 않는 것: ${behavioral_rules.never_does.join(', ')}`,
    `- 갈등 방식: ${behavioral_rules.conflict_style}`,
  ];

  return lines.join('\n');
}

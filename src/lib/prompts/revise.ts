import type { Character } from '@/types';
import { formatVoiceProfile } from './helpers';

export function buildRevisePrompt(params: {
  current_content: string;
  characters: Character[];
  revision_instruction: string;
}): string {
  const charactersVoiceProfiles = params.characters
    .map(formatVoiceProfile)
    .join('\n\n');

  return `아래 원고의 특정 부분을 수정해주세요.

## 원본 원고
${params.current_content}

## 캐릭터 말투 규칙
${charactersVoiceProfiles}

## 수정 지시
${params.revision_instruction}

## 규칙
- 지시된 부분만 수정하고, 나머지는 최대한 유지
- 전체 분량 7,000~9,000자 유지
- 캐릭터별 말투 어미 일관성 유지 (지정된 endings 사용)
- 금지 어미(banned_endings) 절대 사용 금지

## 출력
수정된 전체 원고를 출력하세요.`;
}

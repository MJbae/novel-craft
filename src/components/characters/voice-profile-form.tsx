'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SpeechStyle } from '@/types';

interface VoiceProfileFormProps {
  value: SpeechStyle;
  onChange: (style: SpeechStyle) => void;
}

function TagInput({
  label,
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
        setInput('');
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function VoiceProfileForm({ value, onChange }: VoiceProfileFormProps) {
  const update = (partial: Partial<SpeechStyle>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="flex flex-col gap-4">
      <TagInput
        label="말투 어미"
        placeholder="예: ~다, ~지, ~거든 (Enter로 추가)"
        tags={value.endings}
        onAdd={(tag) => update({ endings: [...value.endings, tag] })}
        onRemove={(i) => update({ endings: value.endings.filter((_, idx) => idx !== i) })}
      />

      <TagInput
        label="금지 어미"
        placeholder="예: ~습니다, ~요 (Enter로 추가)"
        tags={value.banned_endings}
        onAdd={(tag) => update({ banned_endings: [...value.banned_endings, tag] })}
        onRemove={(i) =>
          update({ banned_endings: value.banned_endings.filter((_, idx) => idx !== i) })
        }
      />

      <TagInput
        label="말버릇 / 캐치프레이즈"
        placeholder="예: 흥, 뭐야 이건 (Enter로 추가)"
        tags={value.catchphrases}
        onAdd={(tag) => update({ catchphrases: [...value.catchphrases, tag] })}
        onRemove={(i) =>
          update({ catchphrases: value.catchphrases.filter((_, idx) => idx !== i) })
        }
      />

      <div className="flex flex-col gap-2">
        <Label>존댓말/반말</Label>
        <Select
          value={value.formality}
          onValueChange={(v) => update({ formality: v as SpeechStyle['formality'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="반말_기본">반말 기본</SelectItem>
            <SelectItem value="존댓말_기본">존댓말 기본</SelectItem>
            <SelectItem value="상대에_따라">상대에 따라</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="vpf-avg-len">평균 대사 길이</Label>
        <Input
          id="vpf-avg-len"
          value={value.avg_dialogue_length}
          onChange={(e) => update({ avg_dialogue_length: e.target.value })}
          placeholder="15~40자"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>감정 표현 스타일</Label>
        <Select
          value={value.emotion_style}
          onValueChange={(v) => update({ emotion_style: v as SpeechStyle['emotion_style'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="절제형">절제형</SelectItem>
            <SelectItem value="격정형">격정형</SelectItem>
            <SelectItem value="유머형">유머형</SelectItem>
            <SelectItem value="냉소형">냉소형</SelectItem>
            <SelectItem value="감성형">감성형</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

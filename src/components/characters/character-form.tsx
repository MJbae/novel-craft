'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceProfileForm } from '@/components/characters/voice-profile-form';
import type { Character, SpeechStyle, BehavioralRules } from '@/types';

interface CharacterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  character?: Character | null;
  onSaved: (char: Character) => void;
}

const DEFAULT_SPEECH_STYLE: SpeechStyle = {
  endings: [],
  banned_endings: [],
  catchphrases: [],
  formality: '반말_기본',
  avg_dialogue_length: '15~40자',
  emotion_style: '절제형',
};

const DEFAULT_BEHAVIORAL_RULES: BehavioralRules = {
  values: [],
  never_does: [],
  conflict_style: '직접 대면',
};

function BehavioralTagInput({
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

export function CharacterForm({
  open,
  onOpenChange,
  projectId,
  character,
  onSaved,
}: CharacterFormProps) {
  const isEditing = !!character;
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [role, setRole] = useState<Character['role']>('main');
  const [personality, setPersonality] = useState('');
  const [appearance, setAppearance] = useState('');
  const [background, setBackground] = useState('');
  const [relationships, setRelationships] = useState('');
  const [notes, setNotes] = useState('');
  const [speechStyle, setSpeechStyle] = useState<SpeechStyle>(DEFAULT_SPEECH_STYLE);
  const [behavioralRules, setBehavioralRules] = useState<BehavioralRules>(DEFAULT_BEHAVIORAL_RULES);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setRole(character.role);
      setPersonality(character.personality ?? '');
      setAppearance(character.appearance ?? '');
      setBackground(character.background ?? '');
      setRelationships(character.relationships ?? '');
      setNotes(character.notes ?? '');
      setSpeechStyle({ ...DEFAULT_SPEECH_STYLE, ...character.speech_style });
      setBehavioralRules({ ...DEFAULT_BEHAVIORAL_RULES, ...character.behavioral_rules });
    } else {
      setName('');
      setRole('main');
      setPersonality('');
      setAppearance('');
      setBackground('');
      setRelationships('');
      setNotes('');
      setSpeechStyle(DEFAULT_SPEECH_STYLE);
      setBehavioralRules(DEFAULT_BEHAVIORAL_RULES);
    }
  }, [character, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        role,
        personality: personality.trim() || undefined,
        speech_style: speechStyle,
        behavioral_rules: behavioralRules,
        appearance: appearance.trim() || undefined,
        background: background.trim() || undefined,
        relationships: relationships.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const url = isEditing
        ? `/api/characters/${character.id}`
        : `/api/projects/${projectId}/characters`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('요청 실패');

      const saved: Character = await res.json();
      onSaved(saved);
      onOpenChange(false);
      toast.success(isEditing ? '캐릭터가 수정되었습니다.' : '캐릭터가 생성되었습니다.');
    } catch {
      toast.error(isEditing ? '캐릭터 수정에 실패했습니다.' : '캐릭터 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateBehavioral = (partial: Partial<BehavioralRules>) => {
    setBehavioralRules((prev) => ({ ...prev, ...partial }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEditing ? '캐릭터 수정' : '새 캐릭터'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? '캐릭터 정보를 수정하세요.'
              : '새 캐릭터의 정보를 입력하세요. 보이스 프로필로 독특한 말투를 설정할 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-10rem)]">
          <form id="character-form" onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 pb-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cf-name">이름 *</Label>
                <Input
                  id="cf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="캐릭터 이름"
                  maxLength={100}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cf-role">역할</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Character['role'])}>
                  <SelectTrigger id="cf-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">주인공</SelectItem>
                    <SelectItem value="supporting">조연</SelectItem>
                    <SelectItem value="minor">단역</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-personality">성격</Label>
              <Textarea
                id="cf-personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="예: 냉정하지만 속정이 깊고, 불의를 참지 못하는 성격"
                className="min-h-20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-appearance">외모</Label>
              <Textarea
                id="cf-appearance"
                value={appearance}
                onChange={(e) => setAppearance(e.target.value)}
                placeholder="예: 날카로운 눈매, 검은 장발, 마른 체형"
                className="min-h-20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-background">배경</Label>
              <Textarea
                id="cf-background"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="예: 몰락한 귀족 가문 출신, 어린 시절 부모를 잃음"
                className="min-h-20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-relationships">관계</Label>
              <Textarea
                id="cf-relationships"
                value={relationships}
                onChange={(e) => setRelationships(e.target.value)}
                placeholder="예: 주인공의 라이벌이자 소꿉친구"
                className="min-h-20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cf-notes">메모</Label>
              <Textarea
                id="cf-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="추가 참고 사항"
                className="min-h-16"
              />
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold">보이스 프로필</h3>
                <p className="text-xs text-muted-foreground">
                  캐릭터의 고유한 말투와 대화 스타일을 설정합니다.
                </p>
              </div>
              <VoiceProfileForm value={speechStyle} onChange={setSpeechStyle} />
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold">행동 규칙</h3>
                <p className="text-xs text-muted-foreground">
                  캐릭터가 중시하는 가치와 절대 하지 않는 행동을 정의합니다.
                </p>
              </div>

              <BehavioralTagInput
                label="가치관"
                placeholder="예: 의리, 정의 (Enter로 추가)"
                tags={behavioralRules.values}
                onAdd={(tag) =>
                  updateBehavioral({ values: [...behavioralRules.values, tag] })
                }
                onRemove={(i) =>
                  updateBehavioral({
                    values: behavioralRules.values.filter((_, idx) => idx !== i),
                  })
                }
              />

              <BehavioralTagInput
                label="절대 하지 않는 것"
                placeholder="예: 약자 괴롭힘, 거짓말 (Enter로 추가)"
                tags={behavioralRules.never_does}
                onAdd={(tag) =>
                  updateBehavioral({ never_does: [...behavioralRules.never_does, tag] })
                }
                onRemove={(i) =>
                  updateBehavioral({
                    never_does: behavioralRules.never_does.filter((_, idx) => idx !== i),
                  })
                }
              />

              <div className="flex flex-col gap-2">
                <Label htmlFor="cf-conflict">갈등 대처 방식</Label>
                <Input
                  id="cf-conflict"
                  value={behavioralRules.conflict_style}
                  onChange={(e) => updateBehavioral({ conflict_style: e.target.value })}
                  placeholder="예: 직접 대면, 회피, 중재"
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="submit"
            form="character-form"
            disabled={!name.trim() || submitting}
          >
            {submitting
              ? isEditing
                ? '수정 중…'
                : '생성 중…'
              : isEditing
                ? '캐릭터 수정'
                : '캐릭터 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

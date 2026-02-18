'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Project } from '@/types';

const GENRE_OPTIONS = [
  '판타지',
  '로맨스',
  '현대판타지',
  '회귀',
  '무협',
  'SF',
  '스릴러',
  '호러',
] as const;

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
}

export function ProjectForm({ open, onOpenChange, onCreated }: ProjectFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [tone, setTone] = useState('');
  const [protagonistKeywords, setProtagonistKeywords] = useState('');
  const [supportingKeywords, setSupportingKeywords] = useState('');
  const [bannedElements, setBannedElements] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName('');
    setGenre('');
    setTone('');
    setProtagonistKeywords('');
    setSupportingKeywords('');
    setBannedElements('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !genre || !protagonistKeywords.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          genre,
          tone: tone.trim() || undefined,
          protagonist_keywords: protagonistKeywords.trim(),
          supporting_keywords: supportingKeywords.trim() || undefined,
          banned_elements: bannedElements.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('생성 실패');

      const project: Project = await res.json();
      onCreated(project);
      resetForm();
      onOpenChange(false);
      router.push(`/projects/${project.id}`);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && genre.length > 0 && protagonistKeywords.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 프로젝트</DialogTitle>
          <DialogDescription>
            웹소설 프로젝트의 기본 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-name">작품명 *</Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="나의 첫 번째 웹소설"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-genre">장르 *</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger id="pf-genre" className="w-full">
                <SelectValue placeholder="장르 선택" />
              </SelectTrigger>
              <SelectContent>
                {GENRE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-tone">톤/분위기</Label>
            <Input
              id="pf-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="예: 긴장감 넘치는, 유쾌한"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-protagonist">주인공 키워드 *</Label>
            <Textarea
              id="pf-protagonist"
              value={protagonistKeywords}
              onChange={(e) => setProtagonistKeywords(e.target.value)}
              placeholder="예: 20대 남성, 회귀자, 냉정하지만 속정 깊음"
              className="min-h-20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-supporting">조연 키워드</Label>
            <Textarea
              id="pf-supporting"
              value={supportingKeywords}
              onChange={(e) => setSupportingKeywords(e.target.value)}
              placeholder="예: 충성스러운 동료, 수상한 길드장"
              className="min-h-20"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-banned">금지 요소</Label>
            <Input
              id="pf-banned"
              value={bannedElements}
              onChange={(e) => setBannedElements(e.target.value)}
              placeholder="예: 하렘, 먹방 묘사"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pf-notes">메모</Label>
            <Textarea
              id="pf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="추가 참고 사항"
              className="min-h-20"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting ? '생성 중…' : '프로젝트 생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

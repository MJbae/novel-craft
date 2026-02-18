'use client';

import { useState } from 'react';
import { BookOpen, Pencil, Check, Zap, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Outline, OutlineScene } from '@/types';

interface OutlinePanelProps {
  outline: Outline | null;
  onChange: (outline: Outline) => void;
}

export function OutlinePanel({ outline, onChange }: OutlinePanelProps) {
  if (!outline) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <BookOpen className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          아웃라인이 없습니다. &apos;아웃라인 생성&apos;을 클릭하세요.
        </p>
      </div>
    );
  }

  const updateScene = (index: number, updated: Partial<OutlineScene>) => {
    const scenes = outline.scenes.map((s, i) =>
      i === index ? { ...s, ...updated } : s
    );
    onChange({ ...outline, scenes });
  };

  const updateEndingHook = (ending_hook: string) => {
    onChange({ ...outline, ending_hook });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {outline.scenes.length}개 장면 &middot; 예상{' '}
          {outline.estimated_word_count.toLocaleString('ko-KR')}자
        </p>
      </div>

      {outline.scenes.map((scene, idx) => (
        <SceneCard
          key={scene.scene_number}
          scene={scene}
          onChange={(updated) => updateScene(idx, updated)}
        />
      ))}

      <Card className="py-4">
        <CardContent className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">엔딩 훅</p>
          <EditableText
            value={outline.ending_hook}
            onChange={updateEndingHook}
            multiline
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SceneCard({
  scene,
  onChange,
}: {
  scene: OutlineScene;
  onChange: (updated: Partial<OutlineScene>) => void;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            장면 {scene.scene_number}
          </span>
          <EmotionBar intensity={scene.emotion_intensity} />
        </div>

        <div className="flex flex-col gap-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">목표</p>
            <EditableText
              value={scene.goal}
              onChange={(goal) => onChange({ goal })}
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">갈등</p>
            <EditableText
              value={scene.conflict}
              onChange={(conflict) => onChange({ conflict })}
            />
          </div>

          {scene.twist !== null && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">반전</p>
              <EditableText
                value={scene.twist}
                onChange={(twist) => onChange({ twist })}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {scene.characters.map((name) => (
              <Badge key={name} variant="secondary" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmotionBar({ intensity }: { intensity: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Zap className="size-3.5 text-amber-500" />
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 w-1.5 rounded-sm',
              i < intensity ? 'bg-amber-500' : 'bg-muted'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{intensity}</span>
    </div>
  );
}

function EditableText({
  value,
  onChange,
  multiline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-start gap-1">
        {multiline ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-12 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        ) : (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        )}
        <Button size="icon-xs" variant="ghost" onClick={commit}>
          <Check className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group flex w-full items-start gap-1 text-left text-sm"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      <span className="flex-1">{value}</span>
      <Pencil className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Character } from '@/types';

interface CharacterListProps {
  characters: Character[];
  projectId: string;
  onEdit: (char: Character) => void;
  onDeleted: (id: string) => void;
}

const ROLE_LABEL: Record<Character['role'], string> = {
  main: '주인공',
  supporting: '조연',
  minor: '단역',
};

const ROLE_VARIANT: Record<Character['role'], 'default' | 'secondary' | 'outline'> = {
  main: 'default',
  supporting: 'secondary',
  minor: 'outline',
};

export function CharacterList({ characters, projectId, onEdit, onDeleted }: CharacterListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (char: Character) => {
    if (!confirm(`"${char.name}" 캐릭터를 삭제하시겠습니까?`)) return;

    setDeletingId(char.id);
    try {
      const res = await fetch(`/api/characters/${char.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      onDeleted(char.id);
      toast.success(`"${char.name}" 캐릭터가 삭제되었습니다.`);
    } catch {
      toast.error('캐릭터 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((char) => (
        <Card
          key={char.id}
          className="group cursor-pointer transition-colors hover:border-primary/30 hover:bg-accent/30"
          onClick={() => onEdit(char)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-1 text-base">{char.name}</CardTitle>
              <Badge variant={ROLE_VARIANT[char.role]}>{ROLE_LABEL[char.role]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {char.personality && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{char.personality}</p>
            )}

            {char.speech_style.endings.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {char.speech_style.endings.slice(0, 5).map((ending, i) => (
                  <Badge key={`${ending}-${i}`} variant="outline" className="text-xs">
                    {ending}
                  </Badge>
                ))}
                {char.speech_style.endings.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{char.speech_style.endings.length - 5}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {char.speech_style.formality.replace(/_/g, ' ')}
              </span>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(char);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 text-destructive hover:text-destructive"
                  disabled={deletingId === char.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(char);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

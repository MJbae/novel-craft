'use client';

import { useEffect, useState, use } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CharacterList } from '@/components/characters/character-list';
import { CharacterForm } from '@/components/characters/character-form';
import type { Character } from '@/types';

export default function CharactersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/characters`)
      .then((r) => r.json())
      .then((data: Character[]) => setCharacters(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleEdit = (char: Character) => {
    setEditingCharacter(char);
    setFormOpen(true);
  };

  const handleSaved = (saved: Character) => {
    setCharacters((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [saved, ...prev];
    });
  };

  const handleDeleted = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingCharacter(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">캐릭터</h1>
        <Button onClick={() => { setEditingCharacter(null); setFormOpen(true); }}>
          <Plus className="size-4" />
          캐릭터 추가
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <Users className="size-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">캐릭터가 없습니다</p>
            <p className="text-sm text-muted-foreground">
              새 캐릭터를 추가하여 소설 속 인물을 만들어 보세요.
            </p>
          </div>
          <Button variant="outline" onClick={() => { setEditingCharacter(null); setFormOpen(true); }}>
            <Plus className="size-4" />
            첫 캐릭터 만들기
          </Button>
        </div>
      ) : (
        <CharacterList
          characters={characters}
          projectId={projectId}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
        />
      )}

      <CharacterForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        projectId={projectId}
        character={editingCharacter}
        onSaved={handleSaved}
      />
    </div>
  );
}

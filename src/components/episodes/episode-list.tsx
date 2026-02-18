'use client';

import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EpisodeCard } from '@/components/episodes/episode-card';
import type { Episode } from '@/types';

interface EpisodeListProps {
  episodes: Episode[];
  projectId: string;
  onCreateFirst?: () => void;
  onDelete?: (id: string) => void;
}

export function EpisodeList({
  episodes,
  projectId,
  onCreateFirst,
  onDelete,
}: EpisodeListProps) {
  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
        <BookOpen className="size-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-medium">아직 회차가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            새 회차를 만들어 웹소설 집필을 시작하세요.
          </p>
        </div>
        <Button variant="outline" onClick={onCreateFirst}>
          <Plus className="size-4" />
          첫 회차 만들기
        </Button>
      </div>
    );
  }

  const sorted = [...episodes].sort(
    (a, b) => a.episode_number - b.episode_number,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((episode) => (
        <EpisodeCard
          key={episode.id}
          episode={episode}
          projectId={projectId}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

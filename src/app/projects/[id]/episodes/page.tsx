'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EpisodeList } from '@/components/episodes/episode-list';
import type { Episode } from '@/types';

export default function EpisodesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/episodes`)
      .then((r) => r.json())
      .then((data: Episode[]) => setEpisodes(data))
      .catch(() => toast.error('회차 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleDeleteEpisode = async (id: string) => {
    try {
      const res = await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setEpisodes((prev) => prev.filter((e) => e.id !== id));
      toast.success('회차가 삭제되었습니다');
    } catch {
      toast.error('삭제에 실패했습니다');
    }
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_number: episodes.length + 1 }),
      });

      if (!res.ok) throw new Error('생성 실패');

      const episode: Episode = await res.json();
      router.push(`/projects/${projectId}/episodes/${episode.id}`);
    } catch {
      toast.error('회차 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">회차 목록</h1>
        <Button onClick={handleCreate} disabled={creating}>
          <Plus className="size-4" />
          {creating ? '생성 중…' : '새 회차'}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : (
        <EpisodeList
          episodes={episodes}
          projectId={projectId}
          onCreateFirst={handleCreate}
          onDelete={handleDeleteEpisode}
        />
      )}
    </div>
  );
}

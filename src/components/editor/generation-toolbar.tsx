'use client';

import { useState } from 'react';
import {
  BookOpen,
  FileText,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useJobStore } from '@/stores/job-store';
import { cn } from '@/lib/utils';

interface GenerationToolbarProps {
  projectId: string;
  episodeId: string;
  episodeNumber: number;
  hasOutline: boolean;
  hasContent: boolean;
  dirty: boolean;
  onSave: () => void;
  onGenerated: () => void;
}

export function GenerationToolbar({
  projectId,
  episodeId,
  episodeNumber,
  hasOutline,
  hasContent,
  dirty,
  onSave,
  onGenerated,
}: GenerationToolbarProps) {
  const { polling, startPolling } = useJobStore();
  const [generating, setGenerating] = useState<string | null>(null);

  const generate = async (
    endpoint: string,
    body: Record<string, unknown>,
    label: string
  ) => {
    setGenerating(label);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('요청 실패');

      const data = await res.json();
      startPolling(data.job_id);
      onGenerated();
      toast.success(`${label} 작업이 시작되었습니다`);
    } catch {
      toast.error(`${label}에 실패했습니다`);
    } finally {
      setGenerating(null);
    }
  };

  const handleOutline = () =>
    generate('/api/generate/outline', {
      project_id: projectId,
      episode_id: episodeId,
      episode_number: episodeNumber,
    }, '아웃라인 생성');

  const handleEpisode = () =>
    generate('/api/generate/episode', {
      project_id: projectId,
      episode_number: episodeNumber,
    }, '원고 생성');

  const busy = polling || generating !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleOutline}
        disabled={busy}
      >
        {generating === '아웃라인 생성' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BookOpen className="size-4" />
        )}
        아웃라인 생성
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleEpisode}
        disabled={busy || !hasOutline}
      >
        {generating === '원고 생성' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <FileText className="size-4" />
        )}
        원고 생성
      </Button>

      <div className="ml-auto">
        <Button size="sm" onClick={onSave} disabled={polling}>
          <Save className="size-4" />
          저장
          {dirty && (
            <span
              className={cn(
                'ml-1 inline-block size-2 rounded-full bg-amber-500'
              )}
            />
          )}
        </Button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Episode, EpisodeStatus } from '@/types';

interface EpisodeCardProps {
  episode: Episode;
  projectId: string;
}

const STATUS_CONFIG: Record<
  EpisodeStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline'; className?: string }
> = {
  draft: { label: '초안', variant: 'secondary' },
  outline: { label: '아웃라인', variant: 'outline' },
  generating: {
    label: '생성 중',
    variant: 'default',
    className: 'animate-pulse',
  },
  generated: { label: '생성 완료', variant: 'default' },
  edited: { label: '편집됨', variant: 'default' },
  final: {
    label: '최종',
    variant: 'default',
    className: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  },
};

function StyleMetricsIndicator({ passed }: { passed: boolean }) {
  if (passed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
        <CheckCircle className="size-3.5" />
        스타일 통과
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
      <AlertCircle className="size-3.5" />
      스타일 경고
    </span>
  );
}

export function EpisodeCard({ episode, projectId }: EpisodeCardProps) {
  const status = STATUS_CONFIG[episode.status];

  const createdDate = new Date(episode.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const metricsPass =
    episode.style_metrics != null
      ? episode.style_metrics.endingHookValid &&
        episode.style_metrics.repetitionRate < 0.15
      : null;

  return (
    <Link href={`/projects/${projectId}/episodes/${episode.id}`}>
      <Card className="group cursor-pointer transition-colors hover:border-primary/30 hover:bg-accent/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-base">
              <span className="mr-1.5 text-muted-foreground">
                {episode.episode_number}화
              </span>
              {episode.title ?? '제목 없음'}
            </CardTitle>
            <Badge
              variant={status.variant}
              className={cn('shrink-0', status.className)}
            >
              {status.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {episode.summary && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {episode.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {episode.word_count.toLocaleString('ko-KR')}자
            </span>

            {episode.outline && (
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3.5" />
                {episode.outline.scenes.length}장면
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {createdDate}
            </span>
          </div>

          {metricsPass != null && <StyleMetricsIndicator passed={metricsPass} />}
        </CardContent>
      </Card>
    </Link>
  );
}

'use client';

import { Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EpisodeEventRow, EventType } from '@/types';

interface EventsPanelProps {
  events: EpisodeEventRow[];
}

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; className: string }
> = {
  plot: {
    label: '줄거리',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  character_state: {
    label: '캐릭터 상태',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  relationship: {
    label: '관계',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  foreshadow: {
    label: '복선',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

export function EventsPanel({ events }: EventsPanelProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Bookmark className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          추출된 이벤트가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {events.length}개 이벤트
      </p>

      {events.map((event) => {
        const config = EVENT_TYPE_CONFIG[event.event_type];

        return (
          <div
            key={event.id}
            className="flex flex-col gap-2 rounded-lg border px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-sm">{event.description}</p>
              <Badge
                variant="secondary"
                className={cn('shrink-0 border-0', config.className)}
              >
                {config.label}
              </Badge>
            </div>

            {event.characters_involved.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.characters_involved.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

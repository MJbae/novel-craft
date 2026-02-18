'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Settings,
  Pencil,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { OutlinePanel } from '@/components/editor/outline-panel';
import { ValidationPanel } from '@/components/editor/validation-panel';
import { EventsPanel } from '@/components/editor/events-panel';
import { GenerationToolbar } from '@/components/editor/generation-toolbar';
import { GenerationProgress } from '@/components/editor/generation-progress';
import { RevisionInput } from '@/components/editor/revision-input';
import { useEditorStore } from '@/stores/editor-store';
import { useJobStore } from '@/stores/job-store';
import { cn } from '@/lib/utils';
import type { Episode, EpisodeEventRow, EpisodeStatus } from '@/types';

const AUTOSAVE_DELAY_MS = 30_000;
const WORD_COUNT_MIN = 7_000;
const WORD_COUNT_MAX = 9_000;

const STATUS_LABELS: Record<EpisodeStatus, string> = {
  draft: '초안',
  outline: '아웃라인',
  generating: '생성 중',
  generated: '생성 완료',
  edited: '편집됨',
  final: '최종',
};

const STATUS_COLORS: Record<EpisodeStatus, string> = {
  draft: '',
  outline: '',
  generating: 'animate-pulse',
  generated: 'bg-emerald-600 text-white hover:bg-emerald-600/90',
  edited: 'bg-blue-600 text-white hover:bg-blue-600/90',
  final: 'bg-emerald-700 text-white hover:bg-emerald-700/90',
};

export default function EpisodeEditorPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id: projectId, episodeId } = use(params);

  const {
    episode,
    events,
    dirty,
    saving,
    setEpisode,
    setEvents,
    updateContent,
    updateOutline,
    save,
  } = useEditorStore();

  const jobStore = useJobStore();

  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const fetchEpisode = useCallback(async () => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}`);
      if (!res.ok) throw new Error('에피소드를 불러올 수 없습니다');
      const data = await res.json();

      const ep: Episode = data.episode ?? data;
      const evts: EpisodeEventRow[] = data.events ?? [];

      setEpisode(ep);
      setEvents(evts);
    } catch {
      toast.error('에피소드를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [episodeId, setEpisode, setEvents]);

  useEffect(() => {
    fetchEpisode();
    return () => {
      jobStore.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEpisode]);

  useEffect(() => {
    if (jobStore.status === 'completed') {
      fetchEpisode();
    }
  }, [jobStore.status, fetchEpisode]);

  // --- Autosave: 30s debounce when dirty ---
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirty || saving) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      return;
    }

    autosaveTimer.current = setTimeout(() => {
      save().then(() => toast.success('자동 저장됨'));
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [dirty, saving, save]);

  // --- Keyboard shortcuts: Ctrl/Cmd+S ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  const handleTitleCommit = async () => {
    if (!episode) return;
    setEpisode({ ...episode, title: titleDraft || null });
    setEditingTitle(false);
    useEditorStore.setState({ dirty: true });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
          <div className="h-7 w-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-96 animate-pulse rounded-xl border bg-muted" />
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">에피소드를 찾을 수 없습니다</p>
        <Link href={`/projects/${projectId}/episodes`}>
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            회차 목록으로
          </Button>
        </Link>
      </div>
    );
  }

  const wordCount = episode.content
    ? episode.content.replace(/<[^>]*>/g, '').length
    : episode.word_count;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-3 sm:gap-3 sm:px-6">
        <Link href={`/projects/${projectId}/episodes`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>

        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-8 w-56 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleCommit();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
              <Button size="icon-xs" variant="ghost" onClick={handleTitleCommit}>
                <Check className="size-3" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="group flex items-center gap-1.5 truncate"
              onClick={() => {
                setTitleDraft(episode.title ?? '');
                setEditingTitle(true);
              }}
            >
              <h1 className="truncate text-base font-semibold">
                <span className="text-muted-foreground">
                  {episode.episode_number}화:
                </span>{' '}
                {episode.title ?? '제목 없음'}
              </h1>
              <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Badge
            variant="secondary"
            className={cn(STATUS_COLORS[episode.status])}
          >
            {STATUS_LABELS[episode.status]}
          </Badge>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <FileText className="size-3.5" />
            {wordCount.toLocaleString('ko-KR')}자
          </span>
          {dirty && (
            <span className="size-2 rounded-full bg-amber-500" title="저장되지 않은 변경" />
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="outline" className="flex h-full flex-col">
          <div className="border-b px-3 sm:px-6">
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="outline">아웃라인</TabsTrigger>
              <TabsTrigger value="content">원고</TabsTrigger>
              <TabsTrigger value="validation">검증</TabsTrigger>
              <TabsTrigger value="events">이벤트</TabsTrigger>
              <TabsTrigger value="settings">설정</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
              <TabsContent value="outline">
                <OutlinePanel
                  outline={episode.outline}
                  onChange={updateOutline}
                />
              </TabsContent>

              <TabsContent value="content">
                <TiptapEditor
                  content={episode.content ?? ''}
                  onChange={updateContent}
                  editable={episode.status !== 'generating'}
                />
              </TabsContent>

              <TabsContent value="validation">
                <ValidationPanel metrics={episode.style_metrics} />
              </TabsContent>

              <TabsContent value="events">
                <EventsPanel events={events} />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsTab episode={episode} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      <footer className="flex flex-col gap-3 border-t px-3 py-3 sm:px-6 sm:py-4">
        <WordCountBar count={wordCount} />

        <GenerationProgress />

        <RevisionInput
          projectId={projectId}
          episodeId={episodeId}
          disabled={!episode.content}
          onRevised={() => {}}
        />

        <Separator />

        <GenerationToolbar
          projectId={projectId}
          episodeId={episodeId}
          episodeNumber={episode.episode_number}
          hasOutline={episode.outline !== null}
          hasContent={!!episode.content}
          dirty={dirty}
          onSave={save}
          onGenerated={() => {}}
        />
      </footer>
    </div>
  );
}

function WordCountBar({ count }: { count: number }) {
  const pct = Math.min((count / WORD_COUNT_MAX) * 100, 100);
  const color =
    count < WORD_COUNT_MIN
      ? 'bg-amber-500'
      : count <= WORD_COUNT_MAX
        ? 'bg-emerald-500'
        : 'bg-red-500';
  const textColor =
    count < WORD_COUNT_MIN
      ? 'text-amber-600 dark:text-amber-400'
      : count <= WORD_COUNT_MAX
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('shrink-0 text-xs font-medium tabular-nums', textColor)}>
        총 {count.toLocaleString('ko-KR')}자 / 목표 {WORD_COUNT_MIN.toLocaleString('ko-KR')}~{WORD_COUNT_MAX.toLocaleString('ko-KR')}자
      </span>
    </div>
  );
}

function SettingsTab({ episode }: { episode: Episode }) {
  const { setEpisode } = useEditorStore();

  const updateNotes = (user_notes: string) => {
    setEpisode({ ...episode, user_notes: user_notes || null });
    useEditorStore.setState({ dirty: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">작성자 메모</label>
        <Textarea
          value={episode.user_notes ?? ''}
          onChange={(e) => updateNotes(e.target.value)}
          placeholder="이 회차에 대한 메모를 남기세요..."
          className="min-h-32"
        />
      </div>

      {episode.summary && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">요약</label>
          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm leading-relaxed">
            {episode.summary}
          </div>
        </div>
      )}

      {episode.generation_prompt && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">생성 프롬프트</label>
          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-xs font-mono leading-relaxed text-muted-foreground">
            {episode.generation_prompt}
          </div>
        </div>
      )}
    </div>
  );
}

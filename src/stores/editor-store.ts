import { create } from 'zustand';
import { toast } from 'sonner';
import type { Episode, EpisodeEventRow, Outline } from '@/types';

interface EditorStore {
  episode: Episode | null;
  events: EpisodeEventRow[];
  dirty: boolean;
  saving: boolean;
  setEpisode: (ep: Episode) => void;
  setEvents: (events: EpisodeEventRow[]) => void;
  updateContent: (content: string) => void;
  updateOutline: (outline: Outline) => void;
  setDirty: (dirty: boolean) => void;
  save: () => Promise<void>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  episode: null,
  events: [],
  dirty: false,
  saving: false,

  setEpisode: (ep) => set({ episode: ep, dirty: false }),

  setEvents: (events) => set({ events }),

  updateContent: (content) => {
    const ep = get().episode;
    if (!ep) return;
    set({
      episode: { ...ep, content, word_count: content.replace(/<[^>]*>/g, '').length },
      dirty: true,
    });
  },

  updateOutline: (outline) => {
    const ep = get().episode;
    if (!ep) return;
    set({ episode: { ...ep, outline }, dirty: true });
  },

  setDirty: (dirty) => set({ dirty }),

  save: async () => {
    const { episode } = get();
    if (!episode) return;

    set({ saving: true });
    try {
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: episode.title,
          status: episode.status,
          outline: episode.outline,
          content: episode.content,
          summary: episode.summary,
          user_notes: episode.user_notes,
        }),
      });

      if (!res.ok) throw new Error('저장 실패');

      const updated: Episode = await res.json();
      set({ episode: updated, dirty: false });
      toast.success('저장되었습니다');
    } catch {
      toast.error('저장에 실패했습니다');
    } finally {
      set({ saving: false });
    }
  },
}));

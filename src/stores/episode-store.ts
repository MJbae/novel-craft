import { create } from 'zustand';
import type { Episode } from '@/types';

interface EpisodeStore {
  episodes: Episode[];
  loading: boolean;
  fetchEpisodes: (projectId: string) => Promise<void>;
}

export const useEpisodeStore = create<EpisodeStore>((set) => ({
  episodes: [],
  loading: false,

  fetchEpisodes: async (projectId) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/episodes`);
      const data = await res.json();
      set({ episodes: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

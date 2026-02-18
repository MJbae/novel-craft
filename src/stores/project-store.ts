import { create } from 'zustand';
import type { Project } from '@/types';

interface ProjectStore {
  projects: Project[];
  currentProjectId: string | null;
  loading: boolean;
  fetchProjects: () => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  getCurrentProject: () => Project | null;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      set({ projects: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setCurrentProject: (id) => set({ currentProjectId: id }),

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) ?? null;
  },
}));

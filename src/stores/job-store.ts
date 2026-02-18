import { create } from 'zustand';

interface JobState {
  jobId: string | null;
  status: string | null;
  step: string | null;
  progress: number;
  result: unknown | null;
  error: string | null;
  polling: boolean;
}

interface JobStore extends JobState {
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
  reset: () => void;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

const initialState: JobState = {
  jobId: null,
  status: null,
  step: null,
  progress: 0,
  result: null,
  error: null,
  polling: false,
};

export const useJobStore = create<JobStore>((set, get) => ({
  ...initialState,

  startPolling: (jobId) => {
    if (pollingInterval) clearInterval(pollingInterval);

    set({ jobId, status: 'queued', polling: true, progress: 0, result: null, error: null });

    pollingInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();

        set({
          status: data.status,
          step: data.step ?? null,
          progress: data.progress ?? 0,
        });

        if (data.status === 'completed') {
          set({ result: data.result, polling: false });
          get().stopPolling();
        } else if (data.status === 'failed') {
          set({ error: data.error, polling: false });
          get().stopPolling();
        }
      } catch {
        set({ error: 'Polling failed', polling: false });
        get().stopPolling();
      }
    }, 2000);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ polling: false });
  },

  reset: () => {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = null;
    set(initialState);
  },
}));

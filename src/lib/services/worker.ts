import { jobQueue } from './job-queue';
import type { GenerationJob } from '@/types';

type JobHandler = (job: GenerationJob) => Promise<string>;

const MAX_CONCURRENT = 2;
let isProcessing = false;
const handlers = new Map<string, JobHandler>();

export const worker = {
  register(jobType: string, handler: JobHandler): void {
    handlers.set(jobType, handler);
  },

  async processNext(): Promise<void> {
    if (isProcessing) return;
    if (jobQueue.getRunningCount() >= MAX_CONCURRENT) return;

    const job = jobQueue.getNextQueued();
    if (!job) return;

    const handler = handlers.get(job.job_type);
    if (!handler) {
      jobQueue.updateStatus(job.id, 'failed', {
        error: `No handler registered for job type: ${job.job_type}`,
      });
      return;
    }

    isProcessing = true;
    jobQueue.updateStatus(job.id, 'running');

    try {
      const output = await handler(job);
      jobQueue.updateStatus(job.id, 'completed', { output, progress: 100 });
    } catch (err) {
      const error = err as Error;
      const currentJob = jobQueue.getById(job.id);
      const failedStep = currentJob?.step ?? null;
      const retryCount = jobQueue.incrementRetry(job.id);
      const maxRetries = job.max_retries;

      if (retryCount < maxRetries) {
        jobQueue.updateStatus(job.id, 'queued', {
          error: `Retry ${retryCount}/${maxRetries} (step: ${failedStep ?? 'unknown'}): ${error.message}`,
          step: null,
          progress: 0,
        });
      } else {
        jobQueue.updateStatus(job.id, 'failed', {
          error: `[step: ${failedStep ?? 'unknown'}] ${error.message}`,
        });
      }
    } finally {
      isProcessing = false;
    }

    setTimeout(() => this.processNext(), 100);
  },

  start(): void {
    setInterval(() => this.processNext(), 2000);
    process.on('unhandledRejection', () => {
      isProcessing = false;
    });
  },
};

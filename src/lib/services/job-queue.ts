import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db/database';
import type { GenerationJob, JobType, JobStatus, JobStep } from '@/types';

function parseJob(row: Record<string, unknown>): GenerationJob {
  return {
    ...row,
    input: typeof row.input === 'string' ? JSON.parse(row.input as string) : row.input,
  } as GenerationJob;
}

export const jobQueue = {
  create(params: {
    projectId: string;
    episodeId?: string;
    jobType: JobType;
    input: Record<string, unknown>;
    maxRetries?: number;
  }): GenerationJob {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO generation_jobs (id, project_id, episode_id, job_type, status, input, max_retries, created_at)
      VALUES (?, ?, ?, ?, 'queued', ?, ?, ?)
    `).run(
      id,
      params.projectId,
      params.episodeId ?? null,
      params.jobType,
      JSON.stringify(params.input),
      params.maxRetries ?? 2,
      now,
    );

    return this.getById(id)!;
  },

  getById(id: string): GenerationJob | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? parseJob(row) : null;
  },

  updateStatus(id: string, status: JobStatus, extra?: {
    step?: JobStep | null;
    progress?: number;
    output?: string;
    error?: string;
  }): void {
    const db = getDb();
    const now = new Date().toISOString();
    const sets: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (status === 'running') {
      sets.push('started_at = ?');
      values.push(now);
    }
    if (status === 'completed' || status === 'failed') {
      sets.push('completed_at = ?');
      values.push(now);
    }
    if (extra?.step !== undefined) {
      sets.push('step = ?');
      values.push(extra.step);
    }
    if (extra?.progress !== undefined) {
      sets.push('progress = ?');
      values.push(extra.progress);
    }
    if (extra?.output !== undefined) {
      sets.push('output = ?');
      values.push(extra.output);
    }
    if (extra?.error !== undefined) {
      sets.push('error = ?');
      values.push(extra.error);
    }

    values.push(id);
    db.prepare(`UPDATE generation_jobs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  getNextQueued(): GenerationJob | null {
    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM generation_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1",
    ).get() as Record<string, unknown> | undefined;
    return row ? parseJob(row) : null;
  },

  incrementRetry(id: string): number {
    const db = getDb();
    db.prepare('UPDATE generation_jobs SET retry_count = retry_count + 1 WHERE id = ?').run(id);
    const job = this.getById(id);
    return job?.retry_count ?? 0;
  },

  cancel(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE generation_jobs SET status = 'failed', error = 'Cancelled by user', completed_at = ? WHERE id = ? AND status IN ('queued', 'running')",
    ).run(now, id);
  },

  cleanupStaleJobs(): number {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(
      "UPDATE generation_jobs SET status = 'failed', error = 'Server restarted while job was running', completed_at = ? WHERE status = 'running'",
    ).run(now);
    return result.changes;
  },

  getRunningCount(): number {
    const db = getDb();
    const row = db.prepare(
      "SELECT COUNT(*) as count FROM generation_jobs WHERE status = 'running'",
    ).get() as { count: number };
    return row.count;
  },
};

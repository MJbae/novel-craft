import { NextRequest } from 'next/server';
import { jobQueue } from '@/lib/services/job-queue';
import { ensureDb, success, error, handleApiError } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const job = jobQueue.getById(id);
    if (!job) return error('Job not found', 404);

    return success({
      job_id: job.id,
      status: job.status,
      job_type: job.job_type,
      step: job.step,
      progress: job.progress,
      result: job.status === 'completed' ? job.output : undefined,
      error: job.status === 'failed' ? job.error : undefined,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const job = jobQueue.getById(id);
    if (!job) return error('Job not found', 404);

    jobQueue.cancel(id);
    return success({ cancelled: true });
  } catch (err) {
    return handleApiError(err);
  }
}

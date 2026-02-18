import { NextRequest } from 'next/server';
import { GenerateBootstrapSchema } from '@/lib/schemas';
import { jobQueue } from '@/lib/services/job-queue';
import { ensureDb, success, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    ensureDb();
    const body = await request.json();
    const data = GenerateBootstrapSchema.parse(body);

    const job = jobQueue.create({
      projectId: data.project_id,
      jobType: 'bootstrap',
      input: { project_id: data.project_id },
    });

    return success({
      job_id: job.id,
      status: job.status,
      estimated_duration: '60~120초',
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

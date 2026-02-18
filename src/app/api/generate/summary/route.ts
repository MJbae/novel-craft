import { NextRequest } from 'next/server';
import { GenerateSummarySchema } from '@/lib/schemas';
import { jobQueue } from '@/lib/services/job-queue';
import { ensureDb, success, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    ensureDb();
    const body = await request.json();
    const data = GenerateSummarySchema.parse(body);

    const job = jobQueue.create({
      projectId: data.project_id,
      episodeId: data.episode_id,
      jobType: 'summary',
      input: {
        project_id: data.project_id,
        episode_id: data.episode_id,
      },
    });

    return success({
      job_id: job.id,
      status: job.status,
      estimated_duration: '30~60초',
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

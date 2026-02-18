import { NextRequest } from 'next/server';
import { GenerateEpisodeSchema } from '@/lib/schemas';
import { jobQueue } from '@/lib/services/job-queue';
import { ensureDb, success, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    ensureDb();
    const body = await request.json();
    const data = GenerateEpisodeSchema.parse(body);

    const job = jobQueue.create({
      projectId: data.project_id,
      jobType: 'episode_pass1',
      input: {
        project_id: data.project_id,
        episode_number: data.episode_number,
        outline: data.outline,
        additional_instructions: data.additional_instructions,
      },
    });

    return success({
      job_id: job.id,
      status: job.status,
      estimated_duration: '120~240초',
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

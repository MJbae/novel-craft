import { NextRequest } from 'next/server';
import { GenerateOutlineSchema } from '@/lib/schemas';
import { jobQueue } from '@/lib/services/job-queue';
import { ensureDb, success, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    ensureDb();
    const body = await request.json();
    const data = GenerateOutlineSchema.parse(body);

    const job = jobQueue.create({
      projectId: data.project_id,
      jobType: 'outline',
      input: {
        project_id: data.project_id,
        episode_number: data.episode_number,
        additional_instructions: data.additional_instructions,
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

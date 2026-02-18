import { NextRequest } from 'next/server';
import { GenerateReviseSchema } from '@/lib/schemas';
import { jobQueue } from '@/lib/services/job-queue';
import { ensureDb, success, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    ensureDb();
    const body = await request.json();
    const data = GenerateReviseSchema.parse(body);

    const job = jobQueue.create({
      projectId: data.project_id,
      episodeId: data.episode_id,
      jobType: 'revise',
      input: {
        project_id: data.project_id,
        episode_id: data.episode_id,
        revision_instruction: data.revision_instruction,
      },
    });

    return success({
      job_id: job.id,
      status: job.status,
      estimated_duration: '60~180초',
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

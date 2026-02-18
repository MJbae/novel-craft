import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { initDb } from '@/lib/db/database';
import { registerAllHandlers } from '@/lib/services/generation';
import { worker } from '@/lib/services/worker';
import { jobQueue } from '@/lib/services/job-queue';

let dbInitialized = false;

export function ensureDb(): void {
  if (!dbInitialized) {
    initDb();
    jobQueue.cleanupStaleJobs();
    registerAllHandlers();
    worker.start();
    dbInitialized = true;
  }
}

export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: err.errors },
      { status: 400 },
    );
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return NextResponse.json({ error: message }, { status: 500 });
}

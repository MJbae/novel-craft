import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db/database';
import { CreateEpisodeSchema } from '@/lib/schemas';
import { ensureDb, success, error, handleApiError } from '@/lib/api-utils';

function parseEpisodeRow(row: Record<string, unknown>) {
  return {
    ...row,
    outline: row.outline ? JSON.parse(row.outline as string) : null,
    style_metrics: row.style_metrics ? JSON.parse(row.style_metrics as string) : null,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id: projectId } = await params;
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM episodes WHERE project_id = ? ORDER BY episode_number ASC',
    ).all(projectId) as Record<string, unknown>[];
    return success(rows.map(parseEpisodeRow));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id: projectId } = await params;
    const body = await request.json();
    const data = CreateEpisodeSchema.parse(body);
    const db = getDb();

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) return error('Project not found', 404);

    const existing = db.prepare(
      'SELECT id FROM episodes WHERE project_id = ? AND episode_number = ?',
    ).get(projectId, data.episode_number);
    if (existing) return error(`Episode ${data.episode_number} already exists`, 409);

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO episodes (id, project_id, episode_number, title, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'draft', ?, ?)
    `).run(id, projectId, data.episode_number, data.title ?? null, now, now);

    const row = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Record<string, unknown>;
    return success(parseEpisodeRow(row), 201);
  } catch (err) {
    return handleApiError(err);
  }
}

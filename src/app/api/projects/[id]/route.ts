import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/database';
import { UpdateProjectSchema } from '@/lib/schemas';
import { ensureDb, success, error, handleApiError } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return error('Project not found', 404);
    return success({
      ...row,
      settings: row.settings ? JSON.parse(row.settings as string) : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const body = await request.json();
    const data = UpdateProjectSchema.parse(body);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!existing) return error('Project not found', 404);

    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [new Date().toISOString()];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(key === 'settings' ? JSON.stringify(value) : value);
      }
    }

    values.push(id);
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>;
    return success({
      ...updated,
      settings: updated.settings ? JSON.parse(updated.settings as string) : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (result.changes === 0) return error('Project not found', 404);
    return success({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}

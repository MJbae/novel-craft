import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/database';
import { UpdateEpisodeSchema } from '@/lib/schemas';
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
    const { id } = await params;
    const db = getDb();

    const row = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return error('Episode not found', 404);

    const events = db.prepare(
      'SELECT * FROM episode_events WHERE episode_id = ? ORDER BY created_at ASC',
    ).all(id) as Record<string, unknown>[];

    const parsedEvents = events.map((e) => ({
      ...e,
      characters_involved: e.characters_involved ? JSON.parse(e.characters_involved as string) : [],
    }));

    return success({
      ...parseEpisodeRow(row),
      events: parsedEvents,
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
    const data = UpdateEpisodeSchema.parse(body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return error('Episode not found', 404);

    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [new Date().toISOString()];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (key === 'content') {
          sets.push('previous_content = content');
          sets.push('content = ?');
          values.push(value);
          sets.push('word_count = ?');
          values.push((value as string).replace(/\s/g, '').length);
        } else if (key === 'outline') {
          sets.push('outline = ?');
          values.push(JSON.stringify(value));
        } else {
          sets.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    values.push(id);
    db.prepare(`UPDATE episodes SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as Record<string, unknown>;
    return success(parseEpisodeRow(updated));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const db = getDb();
    const result = db.prepare('DELETE FROM episodes WHERE id = ?').run(id);
    if (result.changes === 0) return error('Episode not found', 404);
    return success({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}

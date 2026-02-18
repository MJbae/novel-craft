import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/database';
import { UpdateCharacterSchema } from '@/lib/schemas';
import { ensureDb, success, error, handleApiError } from '@/lib/api-utils';

function parseCharacterRow(row: Record<string, unknown>) {
  return {
    ...row,
    speech_style: typeof row.speech_style === 'string' ? JSON.parse(row.speech_style) : row.speech_style,
    behavioral_rules: typeof row.behavioral_rules === 'string' ? JSON.parse(row.behavioral_rules) : row.behavioral_rules,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const body = await request.json();
    const data = UpdateCharacterSchema.parse(body);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM characters WHERE id = ?').get(id);
    if (!existing) return error('Character not found', 404);

    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [new Date().toISOString()];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        const needsJson = key === 'speech_style' || key === 'behavioral_rules';
        values.push(needsJson ? JSON.stringify(value) : value);
      }
    }

    values.push(id);
    db.prepare(`UPDATE characters SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown>;
    return success(parseCharacterRow(row));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const db = getDb();
    const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
    if (result.changes === 0) return error('Character not found', 404);
    return success({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db/database';
import { CreateCharacterSchema } from '@/lib/schemas';
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

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id: projectId } = await params;
    const db = getDb();
    const rows = db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC').all(projectId) as Record<string, unknown>[];
    return success(rows.map(parseCharacterRow));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id: projectId } = await params;
    const body = await request.json();
    const data = CreateCharacterSchema.parse(body);
    const db = getDb();

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) return error('Project not found', 404);

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO characters (id, project_id, name, role, personality, speech_style, behavioral_rules, appearance, background, relationships, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, projectId, data.name, data.role,
      data.personality ?? null,
      JSON.stringify(data.speech_style),
      JSON.stringify(data.behavioral_rules),
      data.appearance ?? null,
      data.background ?? null,
      data.relationships ?? null,
      data.notes ?? null,
      now, now,
    );

    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown>;
    return success(parseCharacterRow(row), 201);
  } catch (err) {
    return handleApiError(err);
  }
}

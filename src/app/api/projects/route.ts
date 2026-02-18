import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db/database';
import { CreateProjectSchema } from '@/lib/schemas';
import { ensureDb, success, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    const projects = rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        ...r,
        settings: r.settings ? JSON.parse(r.settings as string) : null,
      };
    });
    return success(projects);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureDb();
    const body = await request.json();
    const data = CreateProjectSchema.parse(body);
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, name, genre, tone, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.genre,
      data.tone ?? null,
      JSON.stringify({
        protagonist_keywords: data.protagonist_keywords,
        supporting_keywords: data.supporting_keywords,
        reference_works: data.reference_works,
        banned_elements: data.banned_elements,
        notes: data.notes,
      }),
      now,
      now,
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return success(project, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

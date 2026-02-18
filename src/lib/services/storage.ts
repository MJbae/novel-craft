import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db/database';
import type {
  Project,
  Character,
  Episode,
  EpisodeEventRow,
  SpeechStyle,
  BehavioralRules,
  Outline,
  StyleMetrics,
  EventType,
} from '@/types';

function parseProject(row: Record<string, unknown>): Project {
  return {
    ...row,
    settings:
      typeof row.settings === 'string'
        ? JSON.parse(row.settings as string)
        : row.settings,
  } as Project;
}

function parseCharacter(row: Record<string, unknown>): Character {
  return {
    ...row,
    speech_style:
      typeof row.speech_style === 'string'
        ? JSON.parse(row.speech_style as string)
        : row.speech_style,
    behavioral_rules:
      typeof row.behavioral_rules === 'string'
        ? JSON.parse(row.behavioral_rules as string)
        : row.behavioral_rules,
  } as Character;
}

function parseEpisode(row: Record<string, unknown>): Episode {
  return {
    ...row,
    outline:
      typeof row.outline === 'string'
        ? JSON.parse(row.outline as string)
        : row.outline,
    style_metrics:
      typeof row.style_metrics === 'string'
        ? JSON.parse(row.style_metrics as string)
        : row.style_metrics,
  } as Episode;
}

function parseEpisodeEvent(row: Record<string, unknown>): EpisodeEventRow {
  return {
    ...row,
    characters_involved:
      typeof row.characters_involved === 'string'
        ? JSON.parse(row.characters_involved as string)
        : row.characters_involved,
  } as EpisodeEventRow;
}

export const storage = {
  projects: {
    list(): Project[] {
      const db = getDb();
      const rows = db
        .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
        .all() as Record<string, unknown>[];
      return rows.map(parseProject);
    },

    getById(id: string): Project | null {
      const db = getDb();
      const row = db
        .prepare('SELECT * FROM projects WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? parseProject(row) : null;
    },

    create(data: {
      name: string;
      genre: string;
      tone?: string | null;
      synopsis?: string | null;
      worldbuilding?: string | null;
      plot_outline?: string | null;
      settings?: Record<string, unknown> | null;
    }): Project {
      const db = getDb();
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO projects (id, name, genre, tone, synopsis, worldbuilding, plot_outline, settings, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        data.name,
        data.genre,
        data.tone ?? null,
        data.synopsis ?? null,
        data.worldbuilding ?? null,
        data.plot_outline ?? null,
        data.settings ? JSON.stringify(data.settings) : null,
        now,
        now
      );

      return this.getById(id)!;
    },

    update(
      id: string,
      data: {
        name?: string;
        genre?: string;
        tone?: string | null;
        synopsis?: string | null;
        worldbuilding?: string | null;
        plot_outline?: string | null;
        settings?: Record<string, unknown> | null;
      }
    ): Project | null {
      const db = getDb();
      const now = new Date().toISOString();
      const sets: string[] = ['updated_at = ?'];
      const values: unknown[] = [now];

      if (data.name !== undefined) {
        sets.push('name = ?');
        values.push(data.name);
      }
      if (data.genre !== undefined) {
        sets.push('genre = ?');
        values.push(data.genre);
      }
      if (data.tone !== undefined) {
        sets.push('tone = ?');
        values.push(data.tone);
      }
      if (data.synopsis !== undefined) {
        sets.push('synopsis = ?');
        values.push(data.synopsis);
      }
      if (data.worldbuilding !== undefined) {
        sets.push('worldbuilding = ?');
        values.push(data.worldbuilding);
      }
      if (data.plot_outline !== undefined) {
        sets.push('plot_outline = ?');
        values.push(data.plot_outline);
      }
      if (data.settings !== undefined) {
        sets.push('settings = ?');
        values.push(data.settings ? JSON.stringify(data.settings) : null);
      }

      values.push(id);
      db.prepare(
        `UPDATE projects SET ${sets.join(', ')} WHERE id = ?`
      ).run(...values);

      return this.getById(id);
    },

    delete(id: string): boolean {
      const db = getDb();
      const result = db
        .prepare('DELETE FROM projects WHERE id = ?')
        .run(id);
      return result.changes > 0;
    },
  },

  characters: {
    list(projectId: string): Character[] {
      const db = getDb();
      const rows = db
        .prepare(
          'SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC'
        )
        .all(projectId) as Record<string, unknown>[];
      return rows.map(parseCharacter);
    },

    getById(id: string): Character | null {
      const db = getDb();
      const row = db
        .prepare('SELECT * FROM characters WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? parseCharacter(row) : null;
    },

    create(
      projectId: string,
      data: {
        name: string;
        role?: string;
        personality?: string | null;
        speech_style?: SpeechStyle;
        behavioral_rules?: BehavioralRules;
        appearance?: string | null;
        background?: string | null;
        relationships?: string | null;
        notes?: string | null;
      }
    ): Character {
      const db = getDb();
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO characters (id, project_id, name, role, personality, speech_style, behavioral_rules, appearance, background, relationships, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        projectId,
        data.name,
        data.role ?? 'main',
        data.personality ?? null,
        JSON.stringify(data.speech_style ?? {}),
        JSON.stringify(data.behavioral_rules ?? {}),
        data.appearance ?? null,
        data.background ?? null,
        data.relationships ?? null,
        data.notes ?? null,
        now,
        now
      );

      return this.getById(id)!;
    },

    update(
      id: string,
      data: {
        name?: string;
        role?: string;
        personality?: string | null;
        speech_style?: SpeechStyle;
        behavioral_rules?: BehavioralRules;
        appearance?: string | null;
        background?: string | null;
        relationships?: string | null;
        notes?: string | null;
      }
    ): Character | null {
      const db = getDb();
      const now = new Date().toISOString();
      const sets: string[] = ['updated_at = ?'];
      const values: unknown[] = [now];

      if (data.name !== undefined) {
        sets.push('name = ?');
        values.push(data.name);
      }
      if (data.role !== undefined) {
        sets.push('role = ?');
        values.push(data.role);
      }
      if (data.personality !== undefined) {
        sets.push('personality = ?');
        values.push(data.personality);
      }
      if (data.speech_style !== undefined) {
        sets.push('speech_style = ?');
        values.push(JSON.stringify(data.speech_style));
      }
      if (data.behavioral_rules !== undefined) {
        sets.push('behavioral_rules = ?');
        values.push(JSON.stringify(data.behavioral_rules));
      }
      if (data.appearance !== undefined) {
        sets.push('appearance = ?');
        values.push(data.appearance);
      }
      if (data.background !== undefined) {
        sets.push('background = ?');
        values.push(data.background);
      }
      if (data.relationships !== undefined) {
        sets.push('relationships = ?');
        values.push(data.relationships);
      }
      if (data.notes !== undefined) {
        sets.push('notes = ?');
        values.push(data.notes);
      }

      values.push(id);
      db.prepare(
        `UPDATE characters SET ${sets.join(', ')} WHERE id = ?`
      ).run(...values);

      return this.getById(id);
    },

    delete(id: string): boolean {
      const db = getDb();
      const result = db
        .prepare('DELETE FROM characters WHERE id = ?')
        .run(id);
      return result.changes > 0;
    },
  },

  episodes: {
    list(projectId: string): Episode[] {
      const db = getDb();
      const rows = db
        .prepare(
          'SELECT * FROM episodes WHERE project_id = ? ORDER BY episode_number ASC'
        )
        .all(projectId) as Record<string, unknown>[];
      return rows.map(parseEpisode);
    },

    getById(id: string): Episode | null {
      const db = getDb();
      const row = db
        .prepare('SELECT * FROM episodes WHERE id = ?')
        .get(id) as Record<string, unknown> | undefined;
      return row ? parseEpisode(row) : null;
    },

    getByNumber(projectId: string, episodeNumber: number): Episode | null {
      const db = getDb();
      const row = db
        .prepare(
          'SELECT * FROM episodes WHERE project_id = ? AND episode_number = ?'
        )
        .get(projectId, episodeNumber) as Record<string, unknown> | undefined;
      return row ? parseEpisode(row) : null;
    },

    create(
      projectId: string,
      data: {
        episode_number: number;
        title?: string | null;
        status?: string;
        outline?: Outline | null;
        content?: string | null;
        summary?: string | null;
        generation_prompt?: string | null;
        user_notes?: string | null;
      }
    ): Episode {
      const db = getDb();
      const id = uuidv4();
      const now = new Date().toISOString();
      const wordCount = data.content
        ? data.content.replace(/\s/g, '').length
        : 0;

      db.prepare(
        `INSERT INTO episodes (id, project_id, episode_number, title, status, outline, content, summary, word_count, generation_prompt, user_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        projectId,
        data.episode_number,
        data.title ?? null,
        data.status ?? 'draft',
        data.outline ? JSON.stringify(data.outline) : null,
        data.content ?? null,
        data.summary ?? null,
        wordCount,
        data.generation_prompt ?? null,
        data.user_notes ?? null,
        now,
        now
      );

      return this.getById(id)!;
    },

    update(
      id: string,
      data: {
        title?: string | null;
        status?: string;
        outline?: Outline | null;
        content?: string | null;
        summary?: string | null;
        style_metrics?: StyleMetrics | null;
        generation_prompt?: string | null;
        user_notes?: string | null;
      }
    ): Episode | null {
      const db = getDb();
      const now = new Date().toISOString();
      const sets: string[] = ['updated_at = ?'];
      const values: unknown[] = [now];

      if (data.content !== undefined) {
        const existing = this.getById(id);
        if (existing && existing.content) {
          sets.push('previous_content = ?');
          values.push(existing.content);
        }
        sets.push('content = ?');
        values.push(data.content);
        sets.push('word_count = ?');
        values.push(
          data.content ? data.content.replace(/\s/g, '').length : 0
        );
      }

      if (data.title !== undefined) {
        sets.push('title = ?');
        values.push(data.title);
      }
      if (data.status !== undefined) {
        sets.push('status = ?');
        values.push(data.status);
      }
      if (data.outline !== undefined) {
        sets.push('outline = ?');
        values.push(data.outline ? JSON.stringify(data.outline) : null);
      }
      if (data.summary !== undefined) {
        sets.push('summary = ?');
        values.push(data.summary);
      }
      if (data.style_metrics !== undefined) {
        sets.push('style_metrics = ?');
        values.push(
          data.style_metrics ? JSON.stringify(data.style_metrics) : null
        );
      }
      if (data.generation_prompt !== undefined) {
        sets.push('generation_prompt = ?');
        values.push(data.generation_prompt);
      }
      if (data.user_notes !== undefined) {
        sets.push('user_notes = ?');
        values.push(data.user_notes);
      }

      values.push(id);
      db.prepare(
        `UPDATE episodes SET ${sets.join(', ')} WHERE id = ?`
      ).run(...values);

      return this.getById(id);
    },

    delete(id: string): boolean {
      const db = getDb();
      const result = db
        .prepare('DELETE FROM episodes WHERE id = ?')
        .run(id);
      return result.changes > 0;
    },
  },

  episodeEvents: {
    listByEpisode(episodeId: string): EpisodeEventRow[] {
      const db = getDb();
      const rows = db
        .prepare(
          'SELECT * FROM episode_events WHERE episode_id = ? ORDER BY created_at ASC'
        )
        .all(episodeId) as Record<string, unknown>[];
      return rows.map(parseEpisodeEvent);
    },

    listByProject(projectId: string): EpisodeEventRow[] {
      const db = getDb();
      const rows = db
        .prepare(
          'SELECT * FROM episode_events WHERE project_id = ? ORDER BY created_at ASC'
        )
        .all(projectId) as Record<string, unknown>[];
      return rows.map(parseEpisodeEvent);
    },

    create(
      projectId: string,
      episodeId: string,
      data: {
        event_type: EventType;
        description: string;
        characters_involved?: string[];
      }
    ): EpisodeEventRow {
      const db = getDb();
      const now = new Date().toISOString();

      const result = db
        .prepare(
          `INSERT INTO episode_events (project_id, episode_id, event_type, description, characters_involved, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          projectId,
          episodeId,
          data.event_type,
          data.description,
          JSON.stringify(data.characters_involved ?? []),
          now
        );

      const row = db
        .prepare('SELECT * FROM episode_events WHERE id = ?')
        .get(result.lastInsertRowid) as Record<string, unknown>;
      return parseEpisodeEvent(row);
    },

    delete(id: number): boolean {
      const db = getDb();
      const result = db
        .prepare('DELETE FROM episode_events WHERE id = ?')
        .run(id);
      return result.changes > 0;
    },
  },
};

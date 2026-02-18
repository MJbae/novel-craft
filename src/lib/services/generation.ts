import { codexExecWithRetry, parseJsonResponse } from '@/lib/codex';
import { jobQueue } from './job-queue';
import { worker } from './worker';
import { getDb } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import { BootstrapResultSchema, OutlineSchema, EpisodeEventSchema } from '@/lib/schemas';
import type { GenerationJob, Character, Project } from '@/types';
import { z } from 'zod';

function textToHtml(text: string): string {
  if (text.startsWith('<')) return text;
  return text
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

const TIMEOUTS: Record<string, number> = {
  bootstrap: 180_000,
  outline: 180_000,
  episode_pass1: 600_000,
  episode_pass2: 300_000,
  revise: 300_000,
  summary: 120_000,
  event_extract: 120_000,
};

function getProject(projectId: string): Project & { settings: Record<string, string> } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Project ${projectId} not found`);
  return {
    ...row,
    settings: row.settings ? JSON.parse(row.settings as string) : {},
  } as Project & { settings: Record<string, string> };
}

function getCharacters(projectId: string): Character[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM characters WHERE project_id = ?').all(projectId) as Record<string, unknown>[];
  return rows.map((r) => ({
    ...r,
    speech_style: typeof r.speech_style === 'string' ? JSON.parse(r.speech_style as string) : r.speech_style,
    behavioral_rules: typeof r.behavioral_rules === 'string' ? JSON.parse(r.behavioral_rules as string) : r.behavioral_rules,
  })) as Character[];
}

async function handleBootstrap(job: GenerationJob): Promise<string> {
  const project = getProject(job.project_id);
  const settings = project.settings as Record<string, string>;

  const { buildBootstrapPrompt } = await import('@/lib/prompts/bootstrap');
  const prompt = buildBootstrapPrompt({
    genre: project.genre as string,
    tone: (project.tone as string) || '',
    protagonist_keywords: settings.protagonist_keywords || '',
    supporting_keywords: settings.supporting_keywords || '',
    banned_elements: settings.banned_elements || '',
    notes: settings.notes || '',
  });

  jobQueue.updateStatus(job.id, 'running', { step: 'pass1_generating', progress: 10 });

  const result = await codexExecWithRetry(prompt, {
    timeout: TIMEOUTS.bootstrap,
  });

  jobQueue.updateStatus(job.id, 'running', { progress: 70 });

  const parsed = parseJsonResponse<z.infer<typeof BootstrapResultSchema>>(result.content);
  const validated = BootstrapResultSchema.parse(parsed);

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE projects SET synopsis = ?, worldbuilding = ?, plot_outline = ?, updated_at = ?
    WHERE id = ?
  `).run(validated.synopsis, validated.worldbuilding, validated.plot_outline, now, job.project_id);

  for (const char of validated.characters) {
    const charId = uuidv4();
    db.prepare(`
      INSERT INTO characters (id, project_id, name, role, personality, speech_style, behavioral_rules, appearance, background, relationships, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      charId, job.project_id, char.name, char.role,
      char.personality, JSON.stringify(char.speech_style),
      JSON.stringify(char.behavioral_rules),
      char.appearance, char.background, char.relationships,
      now, now,
    );
  }

  return JSON.stringify(validated);
}

async function handleOutline(job: GenerationJob): Promise<string> {
  const project = getProject(job.project_id);
  const input = job.input as { episode_number: number; additional_instructions?: string };

  const db = getDb();
  const recentEpisodes = db.prepare(
    'SELECT summary FROM episodes WHERE project_id = ? AND episode_number < ? ORDER BY episode_number DESC LIMIT 3',
  ).all(job.project_id, input.episode_number) as { summary: string }[];

  const activeEvents = db.prepare(
    'SELECT * FROM episode_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 10',
  ).all(job.project_id) as Record<string, unknown>[];

  const { buildOutlinePrompt } = await import('@/lib/prompts/outline');
  const prompt = buildOutlinePrompt({
    episode_number: input.episode_number,
    genre: project.genre as string,
    synopsis: (project.synopsis as string) || '',
    previous_summaries: recentEpisodes.map((e) => e.summary).filter(Boolean).join('\n\n'),
    plot_position: (project.plot_outline as string) || '',
    active_events: activeEvents.map((e) => `${e.event_type}: ${e.description}`).join('\n'),
    additional_instructions: input.additional_instructions || '',
  });

  jobQueue.updateStatus(job.id, 'running', { step: 'pass1_generating', progress: 20 });

  const result = await codexExecWithRetry(prompt, {
    timeout: TIMEOUTS.outline,
  });

  const parsed = parseJsonResponse<z.infer<typeof OutlineSchema>>(result.content);
  const validated = OutlineSchema.parse(parsed);

  if (job.episode_id) {
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE episodes SET outline = ?, status = 'outline', updated_at = ? WHERE id = ?",
    ).run(JSON.stringify(validated), now, job.episode_id);
  }

  return JSON.stringify(validated);
}

async function handleEpisodePass1(job: GenerationJob): Promise<string> {
  const project = getProject(job.project_id);
  const characters = getCharacters(job.project_id);
  const input = job.input as {
    episode_number: number;
    outline?: Record<string, unknown>;
    additional_instructions?: string;
  };

  const db = getDb();
  const recentEpisodes = db.prepare(
    'SELECT summary FROM episodes WHERE project_id = ? AND episode_number < ? ORDER BY episode_number DESC LIMIT 3',
  ).all(job.project_id, input.episode_number) as { summary: string }[];

  const activeEvents = db.prepare(
    'SELECT * FROM episode_events WHERE project_id = ? ORDER BY created_at DESC LIMIT 10',
  ).all(job.project_id) as Record<string, unknown>[];

  // Step 1: Build context + prompt
  const { buildEpisodePrompt } = await import('@/lib/prompts/episode');
  const prompt = buildEpisodePrompt({
    episode_number: input.episode_number,
    genre: project.genre as string,
    synopsis: (project.synopsis as string) || '',
    worldbuilding: (project.worldbuilding as string) || '',
    tone: (project.tone as string) || '',
    characters,
    previous_summaries: recentEpisodes.map((e) => e.summary).filter(Boolean).join('\n\n'),
    active_events: activeEvents.map((e) => `${e.event_type}: ${e.description}`).join('\n'),
    plot_position: (project.plot_outline as string) || '',
    structured_outline: input.outline ? JSON.stringify(input.outline, null, 2) : '',
    banned_elements: ((project.settings as Record<string, string>)?.banned_elements) || '',
  });

  // Step 2: Pass1 — generate content
  jobQueue.updateStatus(job.id, 'running', { step: 'pass1_generating', progress: 10 });

  const result = await codexExecWithRetry(prompt, {
    timeout: TIMEOUTS.episode_pass1,
  });

  const pass1Content = result.content;
  jobQueue.updateStatus(job.id, 'running', { progress: 40 });

  // Step 3: Validate pass1 output
  jobQueue.updateStatus(job.id, 'running', { step: 'validating', progress: 40 });

  const { validateEpisode } = await import('./validation');
  const pass1Validation = validateEpisode(pass1Content);
  jobQueue.updateStatus(job.id, 'running', { progress: 50 });

  // Step 4: Pass2 — style correction IF warnings exist
  let finalContent = pass1Content;
  let finalValidation = pass1Validation;

  if (pass1Validation.warnings.length > 0) {
    jobQueue.updateStatus(job.id, 'running', { step: 'pass2_correcting', progress: 50 });

    try {
      const { buildStylePrompt } = await import('@/lib/prompts/style');

      const styleWarnings = pass1Validation.warnings
        .map((w) => `- ${w.suggestion} (현재: ${w.actual}, 목표: ${w.expected})`)
        .join('\n');

      const stylePrompt = buildStylePrompt({
        style_warnings: styleWarnings,
        content: pass1Content,
        characters,
      });

      const pass2Result = await codexExecWithRetry(stylePrompt, {
        timeout: TIMEOUTS.episode_pass2,
      });

      finalContent = pass2Result.content;
      jobQueue.updateStatus(job.id, 'running', { progress: 70 });

      // Step 5: Re-validate after pass2
      finalValidation = validateEpisode(finalContent);
      jobQueue.updateStatus(job.id, 'running', { progress: 75 });
    } catch (err) {
      console.warn(`[generation] Pass2 style correction failed, using pass1 content: ${(err as Error).message}`);
      jobQueue.updateStatus(job.id, 'running', { progress: 75 });
    }
  } else {
    jobQueue.updateStatus(job.id, 'running', { progress: 75 });
  }

  // Step 6: Save episode to DB
  const htmlContent = textToHtml(finalContent);
  const episode = db.prepare(
    'SELECT id FROM episodes WHERE project_id = ? AND episode_number = ?',
  ).get(job.project_id, input.episode_number) as { id: string } | undefined;

  const episodeId = episode?.id || uuidv4();
  const now = new Date().toISOString();

  if (!episode) {
    db.prepare(`
      INSERT INTO episodes (id, project_id, episode_number, status, content, word_count, style_metrics, generation_prompt, outline, created_at, updated_at)
      VALUES (?, ?, ?, 'generated', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      episodeId, job.project_id, input.episode_number,
      htmlContent, htmlContent.replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
      JSON.stringify(finalValidation.metrics), prompt,
      input.outline ? JSON.stringify(input.outline) : null,
      now, now,
    );
  } else {
    db.prepare(`
      UPDATE episodes SET status = 'generated', previous_content = content, content = ?, word_count = ?, style_metrics = ?, generation_prompt = ?, outline = ?, updated_at = ?
      WHERE id = ?
    `).run(
      htmlContent, htmlContent.replace(/<[^>]*>/g, '').replace(/\s/g, '').length,
      JSON.stringify(finalValidation.metrics), prompt,
      input.outline ? JSON.stringify(input.outline) : null,
      now, episodeId,
    );
  }

  jobQueue.updateStatus(job.id, 'running', { progress: 80 });

  // Step 7: Extract events via LLM
  let validatedEvents: z.infer<typeof EpisodeEventSchema>[] = [];

  try {
    jobQueue.updateStatus(job.id, 'running', { step: 'extracting_events', progress: 80 });

    const { buildEventsPrompt } = await import('@/lib/prompts/events');
    const eventsPrompt = buildEventsPrompt({
      episode_number: input.episode_number,
      content: finalContent,
    });

    const eventsResult = await codexExecWithRetry(eventsPrompt, {
      timeout: TIMEOUTS.event_extract,
    });

    const parsedEvents = parseJsonResponse<unknown[]>(eventsResult.content);
    validatedEvents = z.array(EpisodeEventSchema).parse(parsedEvents);

    const eventNow = new Date().toISOString();
    const insertEvent = db.prepare(`
      INSERT INTO episode_events (project_id, episode_id, event_type, description, characters_involved, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const event of validatedEvents) {
      insertEvent.run(
        job.project_id,
        episodeId,
        event.event_type,
        event.description,
        JSON.stringify(event.characters_involved),
        eventNow,
      );
    }
  } catch (err) {
    console.warn(`[generation] Event extraction failed: ${(err as Error).message}`);
  }

  jobQueue.updateStatus(job.id, 'running', { progress: 90 });

  // Step 8: Generate summary via LLM
  let summaryText: string | null = null;

  try {
    jobQueue.updateStatus(job.id, 'running', { step: 'summarizing', progress: 90 });

    const { buildSummaryPrompt } = await import('@/lib/prompts/summary');
    const summaryPrompt = buildSummaryPrompt({
      episode_number: input.episode_number,
      content: finalContent,
    });

    const summaryResult = await codexExecWithRetry(summaryPrompt, {
      timeout: TIMEOUTS.summary,
    });

    summaryText = summaryResult.content;
    const summaryNow = new Date().toISOString();
    db.prepare('UPDATE episodes SET summary = ?, updated_at = ? WHERE id = ?').run(
      summaryText,
      summaryNow,
      episodeId,
    );
  } catch (err) {
    console.warn(`[generation] Summary generation failed: ${(err as Error).message}`);
  }

  return JSON.stringify({
    episode_id: episodeId,
    content: finalContent,
    word_count: finalValidation.metrics.wordCount,
    outline: input.outline,
    summary: summaryText,
    style_metrics: finalValidation.metrics,
    events: validatedEvents,
    validation_passed: finalValidation.passed,
    warnings: finalValidation.warnings,
  });
}

async function handleRevise(job: GenerationJob): Promise<string> {
  const input = job.input as { episode_id: string; revision_instruction: string };
  const db = getDb();

  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(input.episode_id) as Record<string, unknown> | undefined;
  if (!episode) throw new Error('Episode not found');

  const characters = getCharacters(job.project_id);

  const { buildRevisePrompt } = await import('@/lib/prompts/revise');
  const prompt = buildRevisePrompt({
    current_content: episode.content as string,
    characters,
    revision_instruction: input.revision_instruction,
  });

  jobQueue.updateStatus(job.id, 'running', { step: 'pass1_generating', progress: 20 });

  const result = await codexExecWithRetry(prompt, { timeout: TIMEOUTS.revise });
  const htmlContent = textToHtml(result.content);
  const wordCount = htmlContent.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE episodes SET previous_content = content, content = ?, word_count = ?, status = 'edited', updated_at = ?
    WHERE id = ?
  `).run(htmlContent, wordCount, now, input.episode_id);

  return JSON.stringify({ episode_id: input.episode_id, content: htmlContent, word_count: wordCount });
}

async function handleSummary(job: GenerationJob): Promise<string> {
  const input = job.input as { episode_id: string };
  const db = getDb();

  const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(input.episode_id) as Record<string, unknown> | undefined;
  if (!episode) throw new Error('Episode not found');

  const { buildSummaryPrompt } = await import('@/lib/prompts/summary');
  const prompt = buildSummaryPrompt({
    episode_number: episode.episode_number as number,
    content: episode.content as string,
  });

  jobQueue.updateStatus(job.id, 'running', { step: 'summarizing', progress: 30 });

  const result = await codexExecWithRetry(prompt, { timeout: TIMEOUTS.summary });
  const summary = result.content;
  const now = new Date().toISOString();

  db.prepare('UPDATE episodes SET summary = ?, updated_at = ? WHERE id = ?').run(summary, now, input.episode_id);

  return JSON.stringify({ episode_id: input.episode_id, summary });
}

export function registerAllHandlers(): void {
  worker.register('bootstrap', handleBootstrap);
  worker.register('outline', handleOutline);
  worker.register('episode_pass1', handleEpisodePass1);
  worker.register('revise', handleRevise);
  worker.register('summary', handleSummary);
}

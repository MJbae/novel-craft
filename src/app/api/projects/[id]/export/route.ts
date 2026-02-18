import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/database';
import { ensureDb, handleApiError } from '@/lib/api-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Settings export helpers ── */

interface CharacterRow {
  name: string;
  role: string;
  personality: string | null;
  background: string | null;
  speech_style: string | null;
  relationships: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  main: '주연',
  supporting: '조연',
  minor: '단역',
};

function buildSettingsMd(
  project: Record<string, unknown>,
  characters: CharacterRow[],
): string {
  const name = project.name as string;
  const parts: string[] = [`# ${name} — 프로젝트 설정`, ''];

  parts.push(`**장르:** ${project.genre as string}`);
  if (project.tone) parts.push(`**톤:** ${project.tone as string}`);
  parts.push('');

  if (project.synopsis) {
    parts.push('## 시놉시스', '', project.synopsis as string, '');
  }
  if (project.worldbuilding) {
    parts.push('## 세계관', '', project.worldbuilding as string, '');
  }
  if (project.plot_outline) {
    parts.push('## 플롯 개요', '', project.plot_outline as string, '');
  }

  if (characters.length > 0) {
    parts.push('## 캐릭터', '');
    for (const c of characters) {
      parts.push(`### ${c.name} (${ROLE_LABELS[c.role] ?? c.role})`);
      if (c.personality) parts.push(`- **성격:** ${c.personality}`);
      if (c.background) parts.push(`- **배경:** ${c.background}`);
      if (c.speech_style) parts.push(`- **말투:** ${c.speech_style}`);
      if (c.relationships) parts.push(`- **관계:** ${c.relationships}`);
      parts.push('');
    }
  }

  return parts.join('\n');
}

function buildSettingsTxt(
  project: Record<string, unknown>,
  characters: CharacterRow[],
): string {
  const name = project.name as string;
  const parts: string[] = [
    `${name} — 프로젝트 설정`,
    `장르: ${project.genre as string}`,
  ];

  if (project.tone) parts.push(`톤: ${project.tone as string}`);
  parts.push('===', '');

  if (project.synopsis) {
    parts.push('[시놉시스]', project.synopsis as string, '');
  }
  if (project.worldbuilding) {
    parts.push('[세계관]', project.worldbuilding as string, '');
  }
  if (project.plot_outline) {
    parts.push('[플롯 개요]', project.plot_outline as string, '');
  }

  if (characters.length > 0) {
    parts.push('[캐릭터]', '');
    for (const c of characters) {
      parts.push(`${c.name} (${ROLE_LABELS[c.role] ?? c.role})`);
      if (c.personality) parts.push(`  성격: ${c.personality}`);
      if (c.background) parts.push(`  배경: ${c.background}`);
      if (c.speech_style) parts.push(`  말투: ${c.speech_style}`);
      if (c.relationships) parts.push(`  관계: ${c.relationships}`);
      parts.push('');
    }
  }

  return parts.join('\n');
}

/* ── Episodes export helpers ── */

function buildEpisodesMd(
  project: Record<string, unknown>,
  episodes: Record<string, unknown>[],
): string {
  const name = project.name as string;
  const parts: string[] = [`# ${name}`, '', `**장르:** ${project.genre as string}`];

  if (project.tone) parts.push(`**톤:** ${project.tone as string}`);
  parts.push('', '---', '');

  for (const ep of episodes) {
    const num = ep.episode_number as number;
    const title = (ep.title as string) || '제목 없음';
    const content = (ep.content as string) || '';
    parts.push(`## ${num}화: ${title}`, '');
    parts.push(htmlToMarkdown(content));
    parts.push('', '---', '');
  }

  return parts.join('\n');
}

function buildEpisodesTxt(
  project: Record<string, unknown>,
  episodes: Record<string, unknown>[],
): string {
  const name = project.name as string;
  const parts: string[] = [name, `장르: ${project.genre as string}`, '===', ''];

  for (const ep of episodes) {
    const num = ep.episode_number as number;
    const title = (ep.title as string) || '제목 없음';
    const content = (ep.content as string) || '';
    parts.push(`${num}화: ${title}`, '---');
    parts.push(stripHtml(content));
    parts.push('');
  }

  return parts.join('\n');
}

/* ── Route handler ── */

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    ensureDb();
    const { id } = await params;
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') === 'md' ? 'md' : 'txt';
    const type = searchParams.get('type') === 'settings' ? 'settings' : 'episodes';
    const projectName = project.name as string;

    let body: string;

    if (type === 'settings') {
      const characters = db
        .prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY role ASC, name ASC')
        .all(id) as CharacterRow[];

      body =
        format === 'md'
          ? buildSettingsMd(project, characters)
          : buildSettingsTxt(project, characters);
    } else {
      const episodes = db
        .prepare('SELECT * FROM episodes WHERE project_id = ? ORDER BY episode_number ASC')
        .all(id) as Record<string, unknown>[];

      body =
        format === 'md'
          ? buildEpisodesMd(project, episodes)
          : buildEpisodesTxt(project, episodes);
    }

    const ext = format === 'md' ? 'md' : 'txt';
    const suffix = type === 'settings' ? '_설정' : '';
    const filename = `${projectName}${suffix}.${ext}`;
    const contentType =
      format === 'md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8';

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

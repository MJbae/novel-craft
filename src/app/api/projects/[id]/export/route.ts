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

    const episodes = db
      .prepare(
        'SELECT * FROM episodes WHERE project_id = ? ORDER BY episode_number ASC',
      )
      .all(id) as Record<string, unknown>[];

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') === 'md' ? 'md' : 'txt';
    const projectName = project.name as string;

    let body: string;
    let contentType: string;

    if (format === 'md') {
      const parts: string[] = [
        `# ${projectName}`,
        '',
        `**장르:** ${project.genre as string}`,
      ];

      if (project.tone) {
        parts.push(`**톤:** ${project.tone as string}`);
      }

      parts.push('', '---', '');

      for (const ep of episodes) {
        const num = ep.episode_number as number;
        const title = (ep.title as string) || '제목 없음';
        const content = (ep.content as string) || '';

        parts.push(`## ${num}화: ${title}`, '');
        parts.push(htmlToMarkdown(content));
        parts.push('', '---', '');
      }

      body = parts.join('\n');
      contentType = 'text/markdown; charset=utf-8';
    } else {
      const parts: string[] = [
        projectName,
        `장르: ${project.genre as string}`,
        '===',
        '',
      ];

      for (const ep of episodes) {
        const num = ep.episode_number as number;
        const title = (ep.title as string) || '제목 없음';
        const content = (ep.content as string) || '';

        parts.push(`${num}화: ${title}`, '---');
        parts.push(stripHtml(content));
        parts.push('');
      }

      body = parts.join('\n');
      contentType = 'text/plain; charset=utf-8';
    }

    const ext = format === 'md' ? 'md' : 'txt';
    const filename = `${projectName}.${ext}`;

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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  exec: vi.fn(),
  pragma: vi.fn(),
}));

vi.mock('@/lib/db/database', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      run: mocks.run,
      get: mocks.get,
      all: mocks.all,
    })),
    exec: mocks.exec,
    pragma: mocks.pragma,
  })),
  initDb: vi.fn(),
  closeDb: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-api'),
}));

// ─── Route imports ──────────────────────────────

import { GET as listProjects, POST as createProject } from '@/app/api/projects/route';
import {
  GET as getProject,
  PUT as updateProject,
  DELETE as deleteProject,
} from '@/app/api/projects/[id]/route';

// ─── Helpers ────────────────────────────────────

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), init as never);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ─── Tests ──────────────────────────────────────

describe('Projects API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.run.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    mocks.get.mockReturnValue(undefined);
    mocks.all.mockReturnValue([]);
  });

  // ─── GET /api/projects ──────────────────────

  describe('GET /api/projects', () => {
    it('returns 200 with list of projects', async () => {
      mocks.all.mockReturnValueOnce([
        {
          id: '1',
          name: 'Project One',
          genre: 'Fantasy',
          settings: '{"key":"val"}',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          name: 'Project Two',
          genre: 'Sci-Fi',
          settings: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]);

      const response = await listProjects();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].settings).toEqual({ key: 'val' });
      expect(data[1].settings).toBeNull();
    });

    it('returns 200 with empty array when no projects', async () => {
      const response = await listProjects();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  // ─── POST /api/projects ─────────────────────

  describe('POST /api/projects', () => {
    it('returns 201 with created project', async () => {
      mocks.get.mockReturnValueOnce({
        id: 'test-uuid-api',
        name: 'New Novel',
        genre: 'Fantasy',
        tone: null,
        settings: '{"protagonist_keywords":"hero"}',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const request = makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Novel',
          genre: 'Fantasy',
          protagonist_keywords: 'hero',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('test-uuid-api');
      expect(data.name).toBe('New Novel');
    });

    it('returns 400 when required fields are missing', async () => {
      const request = makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }), // missing genre + protagonist_keywords
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProject(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('returns 400 when name is empty string', async () => {
      const request = makeRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          genre: 'Fantasy',
          protagonist_keywords: 'hero',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await createProject(request);

      expect(response.status).toBe(400);
    });
  });

  // ─── GET /api/projects/[id] ─────────────────

  describe('GET /api/projects/[id]', () => {
    it('returns 200 with project when found', async () => {
      mocks.get.mockReturnValueOnce({
        id: 'proj-1',
        name: 'My Novel',
        genre: 'Romance',
        settings: '{"theme":"love"}',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const request = makeRequest('/api/projects/proj-1');
      const response = await getProject(request, makeParams('proj-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('proj-1');
      expect(data.settings).toEqual({ theme: 'love' });
    });

    it('returns 404 when project not found', async () => {
      mocks.get.mockReturnValueOnce(undefined);

      const request = makeRequest('/api/projects/nonexistent');
      const response = await getProject(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('handles null settings gracefully', async () => {
      mocks.get.mockReturnValueOnce({
        id: 'proj-1',
        name: 'My Novel',
        genre: 'Romance',
        settings: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const request = makeRequest('/api/projects/proj-1');
      const response = await getProject(request, makeParams('proj-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.settings).toBeNull();
    });
  });

  // ─── PUT /api/projects/[id] ─────────────────

  describe('PUT /api/projects/[id]', () => {
    it('returns 200 with updated project', async () => {
      // First get: check existence
      mocks.get.mockReturnValueOnce({ id: 'proj-1' });
      // Second get: return updated project
      mocks.get.mockReturnValueOnce({
        id: 'proj-1',
        name: 'Updated Name',
        genre: 'Fantasy',
        settings: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      });

      const request = makeRequest('/api/projects/proj-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProject(request, makeParams('proj-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
    });

    it('returns 404 when project does not exist', async () => {
      mocks.get.mockReturnValueOnce(undefined);

      const request = makeRequest('/api/projects/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProject(request, makeParams('nonexistent'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });

    it('returns 400 for invalid field values', async () => {
      const request = makeRequest('/api/projects/proj-1', {
        method: 'PUT',
        body: JSON.stringify({ name: '' }), // name min(1) fails
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await updateProject(request, makeParams('proj-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  // ─── DELETE /api/projects/[id] ──────────────

  describe('DELETE /api/projects/[id]', () => {
    it('returns 200 with deleted confirmation', async () => {
      mocks.run.mockReturnValueOnce({ changes: 1 });

      const request = makeRequest('/api/projects/proj-1', { method: 'DELETE' });
      const response = await deleteProject(request, makeParams('proj-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBe(true);
    });

    it('returns 404 when project does not exist', async () => {
      mocks.run.mockReturnValueOnce({ changes: 0 });

      const request = makeRequest('/api/projects/nonexistent', {
        method: 'DELETE',
      });
      const response = await deleteProject(
        request,
        makeParams('nonexistent'),
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });
  });
});

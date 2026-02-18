import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

vi.mock('@/lib/db/database', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      run: mocks.run,
      get: mocks.get,
      all: mocks.all,
    })),
  })),
}));

import { storage } from '@/lib/services/storage';

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.run.mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    mocks.get.mockReturnValue(undefined);
    mocks.all.mockReturnValue([]);
  });

  // ─── projects ────────────────────────────────────

  describe('projects.list', () => {
    it('returns parsed projects with settings deserialized', () => {
      mocks.all.mockReturnValueOnce([
        {
          id: '1',
          name: 'P1',
          genre: 'Fantasy',
          settings: '{"key":"val"}',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          name: 'P2',
          genre: 'Sci-Fi',
          settings: null,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]);

      const result = storage.projects.list();

      expect(result).toHaveLength(2);
      expect(result[0].settings).toEqual({ key: 'val' });
      expect(result[1].settings).toBeNull();
    });

    it('returns empty array when no projects exist', () => {
      const result = storage.projects.list();
      expect(result).toEqual([]);
    });
  });

  describe('projects.getById', () => {
    it('returns parsed project when found', () => {
      mocks.get.mockReturnValueOnce({
        id: 'abc',
        name: 'Test',
        genre: 'Fantasy',
        settings: '{"a":1}',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const result = storage.projects.getById('abc');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('abc');
      expect(result!.settings).toEqual({ a: 1 });
    });

    it('returns null when project not found', () => {
      const result = storage.projects.getById('nonexistent');
      expect(result).toBeNull();
    });

    it('handles settings that are already an object (no double-parse)', () => {
      mocks.get.mockReturnValueOnce({
        id: 'abc',
        name: 'Test',
        genre: 'Fantasy',
        settings: { already: 'parsed' },
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const result = storage.projects.getById('abc');
      expect(result!.settings).toEqual({ already: 'parsed' });
    });
  });

  describe('projects.create', () => {
    it('inserts project and returns it', () => {
      mocks.get.mockReturnValueOnce({
        id: 'test-uuid-1234',
        name: 'New Project',
        genre: 'Sci-Fi',
        settings: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const result = storage.projects.create({
        name: 'New Project',
        genre: 'Sci-Fi',
      });

      expect(mocks.run).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('test-uuid-1234');
      expect(result.name).toBe('New Project');
    });

    it('passes serialized settings to INSERT', () => {
      mocks.get.mockReturnValueOnce({
        id: 'test-uuid-1234',
        name: 'P',
        genre: 'G',
        settings: '{"key":"val"}',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      storage.projects.create({
        name: 'P',
        genre: 'G',
        settings: { key: 'val' },
      });

      const runArgs = mocks.run.mock.calls[0];
      expect(runArgs).toContain('{"key":"val"}');
    });

    it('passes null for optional fields when not provided', () => {
      mocks.get.mockReturnValueOnce({
        id: 'test-uuid-1234',
        name: 'P',
        genre: 'G',
        tone: null,
        settings: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      storage.projects.create({ name: 'P', genre: 'G' });

      const runArgs = mocks.run.mock.calls[0];
      // tone (index 3), synopsis (4), worldbuilding (5), plot_outline (6), settings (7)
      // should all be null (indices after id=0, name=1, genre=2)
      expect(runArgs[3]).toBeNull(); // tone
      expect(runArgs[4]).toBeNull(); // synopsis
      expect(runArgs[5]).toBeNull(); // worldbuilding
      expect(runArgs[6]).toBeNull(); // plot_outline
      expect(runArgs[7]).toBeNull(); // settings
    });
  });

  describe('projects.update', () => {
    it('updates and returns project', () => {
      mocks.get.mockReturnValueOnce({
        id: 'abc',
        name: 'Updated',
        genre: 'Fantasy',
        settings: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      });

      const result = storage.projects.update('abc', { name: 'Updated' });

      expect(mocks.run).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated');
    });

    it('serializes settings when updating', () => {
      mocks.get.mockReturnValueOnce({
        id: 'abc',
        name: 'P',
        genre: 'G',
        settings: '{"new":"val"}',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      });

      storage.projects.update('abc', { settings: { new: 'val' } });

      const runArgs = mocks.run.mock.calls[0];
      expect(runArgs).toContain('{"new":"val"}');
    });

    it('passes null settings when settings is explicitly null', () => {
      mocks.get.mockReturnValueOnce({
        id: 'abc',
        name: 'P',
        genre: 'G',
        settings: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      });

      storage.projects.update('abc', { settings: null });

      const runArgs = mocks.run.mock.calls[0];
      expect(runArgs).toContain(null);
    });
  });

  describe('projects.delete', () => {
    it('returns true when project is deleted', () => {
      mocks.run.mockReturnValueOnce({ changes: 1 });
      expect(storage.projects.delete('abc')).toBe(true);
    });

    it('returns false when project is not found', () => {
      mocks.run.mockReturnValueOnce({ changes: 0 });
      expect(storage.projects.delete('nonexistent')).toBe(false);
    });
  });

  // ─── characters ──────────────────────────────────

  describe('characters.list', () => {
    it('returns parsed characters with deserialized JSON fields', () => {
      mocks.all.mockReturnValueOnce([
        {
          id: 'c1',
          project_id: 'p1',
          name: 'Hero',
          speech_style: '{"endings":["~야"]}',
          behavioral_rules: '{"values":["정의"]}',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]);

      const result = storage.characters.list('p1');

      expect(result).toHaveLength(1);
      expect(result[0].speech_style).toEqual({ endings: ['~야'] });
      expect(result[0].behavioral_rules).toEqual({ values: ['정의'] });
    });
  });

  describe('characters.getById', () => {
    it('returns null when character not found', () => {
      const result = storage.characters.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('characters.delete', () => {
    it('returns true when character is deleted', () => {
      mocks.run.mockReturnValueOnce({ changes: 1 });
      expect(storage.characters.delete('c1')).toBe(true);
    });

    it('returns false when character not found', () => {
      mocks.run.mockReturnValueOnce({ changes: 0 });
      expect(storage.characters.delete('nonexistent')).toBe(false);
    });
  });

  // ─── episodes ────────────────────────────────────

  describe('episodes.list', () => {
    it('returns parsed episodes with deserialized JSON fields', () => {
      mocks.all.mockReturnValueOnce([
        {
          id: 'e1',
          project_id: 'p1',
          episode_number: 1,
          outline: '{"scenes":[]}',
          style_metrics: '{"wordCount":100}',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ]);

      const result = storage.episodes.list('p1');

      expect(result).toHaveLength(1);
      expect(result[0].outline).toEqual({ scenes: [] });
      expect(result[0].style_metrics).toEqual({ wordCount: 100 });
    });
  });

  describe('episodes.getByNumber', () => {
    it('returns episode when found', () => {
      mocks.get.mockReturnValueOnce({
        id: 'e1',
        project_id: 'p1',
        episode_number: 1,
        outline: null,
        style_metrics: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const result = storage.episodes.getByNumber('p1', 1);

      expect(result).not.toBeNull();
      expect(result!.episode_number).toBe(1);
    });

    it('returns null when not found', () => {
      const result = storage.episodes.getByNumber('p1', 99);
      expect(result).toBeNull();
    });
  });

  describe('episodes.create', () => {
    it('calculates word_count from content', () => {
      mocks.get.mockReturnValueOnce({
        id: 'test-uuid-1234',
        project_id: 'p1',
        episode_number: 1,
        content: '가 나 다',
        word_count: 3,
        outline: null,
        style_metrics: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      storage.episodes.create('p1', {
        episode_number: 1,
        content: '가 나 다',
      });

      const runArgs = mocks.run.mock.calls[0];
      // word_count should be 3 (non-whitespace chars)
      expect(runArgs).toContain(3);
    });
  });

  describe('episodes.delete', () => {
    it('returns true when episode is deleted', () => {
      mocks.run.mockReturnValueOnce({ changes: 1 });
      expect(storage.episodes.delete('e1')).toBe(true);
    });
  });
});

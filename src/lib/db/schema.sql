-- Novel Craft Database Schema (v2: 5 tables)
-- SQLite with WAL mode

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 프로젝트
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  genre TEXT NOT NULL,
  tone TEXT,
  synopsis TEXT,
  worldbuilding TEXT,
  plot_outline TEXT,
  settings JSON,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 캐릭터 (v2: 구조화 보이스 프로파일)
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'main',
  personality TEXT,
  speech_style JSON NOT NULL DEFAULT '{}',
  behavioral_rules JSON NOT NULL DEFAULT '{}',
  appearance TEXT,
  background TEXT,
  relationships TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 에피소드 (회차)
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  outline JSON,
  content TEXT,
  previous_content TEXT,
  summary TEXT,
  word_count INTEGER DEFAULT 0,
  style_metrics JSON,
  generation_prompt TEXT,
  user_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(project_id, episode_number)
);

-- v2: 에피소드 이벤트 로그
CREATE TABLE IF NOT EXISTS episode_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  characters_involved JSON,
  created_at TEXT DEFAULT (datetime('now'))
);

-- v2: 생성 작업 큐
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  episode_id TEXT,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  step TEXT,
  progress INTEGER DEFAULT 0,
  input JSON NOT NULL,
  output TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_number ON episodes(project_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_episode_events_episode ON episode_events(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_events_project ON episode_events(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_project ON generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_episode ON generation_jobs(episode_id);

-- ============================================================
-- Mugiwara Dashboard - SQLite Schema
-- Database: ~/.mugiwara/mugiwara.db
-- ============================================================

-- Agent/skill invocations (mirrors agents.jsonl entries)
CREATE TABLE IF NOT EXISTS invocations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT NOT NULL,
  event             TEXT NOT NULL,
  agent             TEXT,
  tool              TEXT,
  args_preview      TEXT,
  output_summary    TEXT,
  session_id        TEXT,
  is_pipeline       INTEGER DEFAULT 0,
  trigger_file      TEXT,
  exit_code         INTEGER,
  summary           TEXT,
  reason            TEXT,
  pipeline_detected TEXT,
  category          TEXT DEFAULT 'pro',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- Sessions (mirrors sessions.jsonl entries)
CREATE TABLE IF NOT EXISTS sessions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT NOT NULL,
  event             TEXT NOT NULL,
  session_id        TEXT NOT NULL,
  reason            TEXT,
  category          TEXT DEFAULT 'pro',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- Memory entries (mirrors one_piece_memory.md blocks)
CREATE TABLE IF NOT EXISTS memory (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  date              TEXT NOT NULL,
  demande           TEXT NOT NULL,
  route             TEXT,
  route_agent       TEXT,
  confiance         TEXT DEFAULT 'moyenne',
  sujet             TEXT,
  projet            TEXT,
  resultat          TEXT DEFAULT 'en-cours',
  resultat_detail   TEXT,
  contexte          TEXT,
  category          TEXT DEFAULT 'pro',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- Weekly report tracking
CREATE TABLE IF NOT EXISTS weekly_reports (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start        TEXT NOT NULL UNIQUE,
  week_end          TEXT NOT NULL,
  generated_at      TEXT NOT NULL,
  html_path         TEXT,
  draft_id          TEXT,
  status            TEXT DEFAULT 'generated'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inv_timestamp ON invocations(timestamp);
CREATE INDEX IF NOT EXISTS idx_inv_session   ON invocations(session_id);
CREATE INDEX IF NOT EXISTS idx_inv_agent     ON invocations(agent);
CREATE INDEX IF NOT EXISTS idx_inv_category  ON invocations(category);

CREATE INDEX IF NOT EXISTS idx_sess_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sess_timestamp  ON sessions(timestamp);

CREATE INDEX IF NOT EXISTS idx_mem_date     ON memory(date);
CREATE INDEX IF NOT EXISTS idx_mem_category ON memory(category);
CREATE INDEX IF NOT EXISTS idx_mem_projet   ON memory(projet);

-- Unique constraint for idempotent migration
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_dedup
  ON invocations(timestamp, session_id, event, agent);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sess_dedup
  ON sessions(timestamp, session_id, event);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mem_dedup
  ON memory(date, demande);

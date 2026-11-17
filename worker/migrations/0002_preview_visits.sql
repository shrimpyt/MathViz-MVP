-- Review-step timing (anonymous). Safe to run more than once.
-- From worker/:  npx wrangler d1 execute euclid --remote --file=migrations/0002_preview_visits.sql
-- The Worker also creates this table on first use, so this is optional.
CREATE TABLE IF NOT EXISTS preview_visits (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  device TEXT NOT NULL,
  outcome TEXT NOT NULL,
  render_ms INTEGER,
  stay_ms INTEGER NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  rebuilds INTEGER NOT NULL DEFAULT 0,
  preview_failed INTEGER NOT NULL DEFAULT 0,
  gate_hit INTEGER NOT NULL DEFAULT 0,
  doc_type TEXT NOT NULL,
  versions INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_preview_visits_created ON preview_visits(created_at);

-- Saved worksheets (Pro library). Safe to run more than once.
-- From worker/:  npx wrangler d1 execute euclid --remote --file=migrations/0001_saved_worksheets.sql
-- The Worker also creates this table on first use, so the feature works
-- even before this runs; running it just makes the table exist up front.
CREATE TABLE IF NOT EXISTS saved_worksheets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  settings TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_worksheets_user ON saved_worksheets(user_id, updated_at);

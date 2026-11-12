-- Taught shelf: which lessons each teacher has taught, and when. Safe to run more than once.
-- From worker/:  npx wrangler d1 execute euclid --remote --file=migrations/0002_taught_lessons.sql
-- The Worker also creates this table on first use, so the feature works
-- even before this runs; running it just makes the table exist up front.
CREATE TABLE IF NOT EXISTS taught_lessons (
  user_id TEXT NOT NULL REFERENCES users(id),
  topic_id TEXT NOT NULL,
  taught_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, topic_id)
);
CREATE INDEX IF NOT EXISTS idx_taught_lessons_user ON taught_lessons(user_id, last_at);

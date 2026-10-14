-- Euclid API — D1 schema (apply: wrangler d1 execute euclid --file=schema.sql)
-- Teacher emails ONLY. No student accounts, no student data — by design
-- (that constraint is the FERPA selling point).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',           -- free | pro | school
  stripe_customer_id TEXT,
  subscription_status TEXT,                    -- active | trialing | past_due | canceled | ...
  current_period_end INTEGER,                  -- unix seconds
  founders INTEGER NOT NULL DEFAULT 0,         -- 1 = lifetime Pro
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,                    -- sha256 of the emailed token
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,                    -- sha256 of the cookie value
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_counter (
  user_id TEXT NOT NULL REFERENCES users(id),
  month TEXT NOT NULL,                         -- YYYY-MM (UTC)
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- Schema only in v1: School is a parked price-sheet line; seats are
-- provisioned manually if a campus ever buys (see monetization roadmap).
CREATE TABLE IF NOT EXISTS school_licenses (
  license_id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL,
  seats TEXT NOT NULL DEFAULT '[]'             -- JSON array of teacher emails, max 10
);

CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON magic_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_customer ON users(stripe_customer_id);

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

-- Legacy: sign-in tokens before Nov 2026. No longer read or written; kept
-- so re-running this file on an existing database is harmless.
CREATE TABLE IF NOT EXISTS magic_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,                    -- sha256 of the emailed token
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

-- Emailed sign-in links. Keyed by email, not user: the user row is created
-- only when a link is actually used, so asking for a link for someone
-- else's address never creates an account.
CREATE TABLE IF NOT EXISTS signin_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,             -- sha256 of the emailed token
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

-- 6-digit email sign-in codes. Stored hashed with the email; a code dies
-- when used, after 10 minutes, or after 5 wrong guesses. The Worker also
-- creates this table on first use, so deploying before rerunning this file
-- doesn't break sign-in.
CREATE TABLE IF NOT EXISTS signin_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,                     -- sha256 of 'signin-code:<email>:<code>'
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,         -- wrong guesses against this code
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_signin_codes_email ON signin_codes(email, expires_at);

-- Fixed-window counters for sign-in emails and code checks.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,                        -- 'ip:<addr>' or 'email:<sha256>'
  window_start INTEGER NOT NULL,               -- unix seconds, 15-minute windows
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
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

-- Export telemetry for signed-in accounts: one row per PDF export
-- (topics + format + size, never worksheet contents).
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,                          -- 'export'
  topics TEXT NOT NULL DEFAULT '[]',           -- JSON array of registry entry ids
  doc_type TEXT NOT NULL DEFAULT 'worksheet',
  problems INTEGER NOT NULL DEFAULT 0,
  versions INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Saved worksheets (Pro library): a worksheet's generator settings and
-- random seed as JSON, never the PDF. The app rebuilds the same problems and
-- answer key from them. Max 200 per account (enforced by the Worker).
CREATE TABLE IF NOT EXISTS saved_worksheets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,                          -- teacher's label, up to 80 characters
  settings TEXT NOT NULL,                      -- JSON: format, topics, counts, options, seed
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_worksheets_user ON saved_worksheets(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON magic_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_signin_expires ON signin_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_customer ON users(stripe_customer_id);

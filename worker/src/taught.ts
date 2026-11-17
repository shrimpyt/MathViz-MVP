// ── Taught shelf, pure rules ─────────────────────────────────────────────────
// One row per lesson a teacher has taught: when it first went out and when it
// last did. Exports add to it on their own (handleEvent), and the "Mark
// taught" button adds lessons taught without the site. Only lesson ids and
// times are kept, never worksheet contents or anything about students.

/** Most lessons one account's shelf holds. The curriculum has ~340, so this
 *  only bites on junk; past it the lessons taught longest ago drop off. */
export const MAX_TAUGHT_LESSONS = 600;
/** Lessons one mark or remove call may name (same as a saved worksheet). */
export const MAX_TAUGHT_PER_CALL = 60;
/** Shelf writes (mark, remove) per account per 15-minute window. */
export const RATE_LIMIT_TAUGHT_WRITES = 120;
/** Shelf reads per account per 15-minute window. */
export const RATE_LIMIT_TAUGHT_READS = 300;

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export function isLessonId(v: unknown): v is string {
  return typeof v === "string" && SLUG.test(v);
}

/** A mark or remove request's lesson ids: 1 to 60 valid ids, duplicates
 *  folded together. Null when anything is off, so nothing half-applies. */
export function validateTaughtIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TAUGHT_PER_CALL) return null;
  const out: string[] = [];
  for (const id of raw) {
    if (!isLessonId(id)) return null;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** The lesson ids from an export event that belong on the shelf. The event
 *  log is looser (any short string), so this keeps only valid ids. */
export function shelfIdsFromExport(topics: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of topics) if (isLessonId(id) && !out.includes(id)) out.push(id);
  return out.slice(0, MAX_TAUGHT_PER_CALL);
}

export const TAUGHT_LESSONS_DDL = [
  `CREATE TABLE IF NOT EXISTS taught_lessons (
    user_id TEXT NOT NULL REFERENCES users(id),
    topic_id TEXT NOT NULL,
    taught_at INTEGER NOT NULL,
    last_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, topic_id)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_taught_lessons_user ON taught_lessons(user_id, last_at)",
];

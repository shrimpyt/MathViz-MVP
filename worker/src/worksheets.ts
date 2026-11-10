// ── Saved worksheets (Pro library), pure rules ──────────────────────────────
// A saved worksheet is its generator settings plus the random seed, never the
// PDF: the app rebuilds the exact same problems and answer key from them.
// The Worker only checks the shape and size here; the app re-checks topic ids
// against its curriculum when it opens one (src/lib/worksheetSettings.ts).

/** Most worksheets one account can keep. */
export const MAX_SAVED_WORKSHEETS = 200;
/** Largest settings JSON accepted, in bytes. A full 60-topic recipe is ~4 KB. */
export const MAX_SETTINGS_BYTES = 8192;
export const MAX_WORKSHEET_NAME = 80;
export const MAX_SETTINGS_TOPICS = 60;
/** Library writes (save, rename, delete) per account per 15-minute window. */
export const RATE_LIMIT_LIBRARY_WRITES = 60;
/** Library reads per account per 15-minute window. */
export const RATE_LIMIT_LIBRARY_READS = 300;

export interface SavedWorksheetSettings {
  docType: string;
  title: string;
  topicIds: string[];
  seed: number;
  count: number;
  topicCounts: Record<string, number>;
  advancedCounts: boolean;
  framework: string;
  difficulty: 1 | 2 | 3;
  includeAnswerKey: boolean;
  wordProblems: boolean;
  includeDiagrams: boolean;
  /** Optional: recipes saved before problem mixing existed don't have it. */
  keepTopicsGrouped?: boolean;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 25;

/** A display name: trimmed, control characters removed, 1 to 80 characters. */
export function normalizeWorksheetName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  if (name.length === 0 || name.length > MAX_WORKSHEET_NAME) return null;
  return name;
}

export function isWorksheetId(input: unknown): input is string {
  return typeof input === "string" && /^[a-f0-9]{32}$/.test(input);
}

/** Check a settings object and return a copy holding only the known fields
 *  in a fixed order, or null. Strict on purpose: what is stored must be
 *  exactly what rebuilds, so nothing is guessed or clamped here. */
export function validateWorksheetSettings(raw: unknown): SavedWorksheetSettings | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;

  if (typeof s.docType !== "string" || !SLUG.test(s.docType) || s.docType.length > 40) return null;
  if (typeof s.title !== "string" || s.title.length > 120) return null;
  if (!Array.isArray(s.topicIds) || s.topicIds.length === 0 || s.topicIds.length > MAX_SETTINGS_TOPICS) {
    return null;
  }
  const topicIds: string[] = [];
  for (const id of s.topicIds) {
    if (typeof id !== "string" || !SLUG.test(id) || topicIds.includes(id)) return null;
    topicIds.push(id);
  }
  if (typeof s.seed !== "number" || !Number.isSafeInteger(s.seed)) return null;
  if (!isCount(s.count)) return null;
  if (!s.topicCounts || typeof s.topicCounts !== "object" || Array.isArray(s.topicCounts)) return null;
  const topicCounts: Record<string, number> = {};
  for (const [id, v] of Object.entries(s.topicCounts as Record<string, unknown>)) {
    if (!topicIds.includes(id) || !isCount(v)) return null;
    topicCounts[id] = v;
  }
  if (typeof s.framework !== "string" || !SLUG.test(s.framework) || s.framework.length > 20) return null;
  if (s.difficulty !== 1 && s.difficulty !== 2 && s.difficulty !== 3) return null;
  for (const k of ["advancedCounts", "includeAnswerKey", "wordProblems", "includeDiagrams"] as const) {
    if (typeof s[k] !== "boolean") return null;
  }
  if (s.keepTopicsGrouped !== undefined && typeof s.keepTopicsGrouped !== "boolean") return null;

  return {
    docType: s.docType,
    title: s.title,
    topicIds,
    seed: s.seed,
    count: s.count,
    topicCounts,
    advancedCounts: s.advancedCounts as boolean,
    framework: s.framework,
    difficulty: s.difficulty,
    includeAnswerKey: s.includeAnswerKey as boolean,
    wordProblems: s.wordProblems as boolean,
    includeDiagrams: s.includeDiagrams as boolean,
    ...(typeof s.keepTopicsGrouped === "boolean" ? { keepTopicsGrouped: s.keepTopicsGrouped } : {}),
  };
}

/** The settings as stored, or null when they're too big. */
export function serializeWorksheetSettings(s: SavedWorksheetSettings): string | null {
  const json = JSON.stringify(s);
  return new TextEncoder().encode(json).length <= MAX_SETTINGS_BYTES ? json : null;
}

export const SAVED_WORKSHEETS_DDL = [
  `CREATE TABLE IF NOT EXISTS saved_worksheets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    settings TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_saved_worksheets_user ON saved_worksheets(user_id, updated_at)",
];

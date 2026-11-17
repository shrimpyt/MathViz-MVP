// Review-step timing: one row per visit to the Review step, so we can see
// whether the real-PDF preview is slow or makes people leave.
//
// Private by design: no user id, no email, no worksheet contents, no IP.
// The plan (anon / free / pro) is looked up by the Worker from the session,
// never taken from the request. Read a summary with
// worker/queries/preview-summary.sql.

export type PreviewDevice = "phone" | "tablet" | "desktop" | "unknown";
export type PreviewOutcome = "exported" | "back" | "left";

export interface PreviewVisit {
  /** Ms from opening Review until the first pages showed; null if they never did. */
  renderMs: number | null;
  /** Ms spent on Review in this visit. */
  stayMs: number;
  /** Pages in the preview when they left (0 if it never drew). */
  pages: number;
  /** How many times the preview rebuilt after a change (seed, answer key, version). */
  rebuilds: number;
  device: PreviewDevice;
  outcome: PreviewOutcome;
  /** The preview couldn't draw and fell back to the HTML look-alike. */
  previewFailed: boolean;
  /** A Free user pressed Export on a Pro-only worksheet and saw the upgrade note. */
  gateHit: boolean;
  docType: string;
  versions: number;
}

/** Visits per IP per rate window (15 minutes). Generous for a real teacher. */
export const RATE_LIMIT_PREVIEW_VISITS = 60;

const DEVICES: readonly PreviewDevice[] = ["phone", "tablet", "desktop", "unknown"];
const OUTCOMES: readonly PreviewOutcome[] = ["exported", "back", "left"];
const MAX_RENDER_MS = 10 * 60 * 1000; // 10 minutes
const MAX_STAY_MS = 4 * 60 * 60 * 1000; // 4 hours

function int(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n < min ? min : n > max ? max : n;
}

/** The visit, cleaned and clamped, or null when the body isn't one. */
export function validatePreviewVisit(body: unknown): PreviewVisit | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const stayMs = int(b["stayMs"], 0, MAX_STAY_MS);
  if (stayMs === null) return null;
  const outcome = OUTCOMES.find((o) => o === b["outcome"]);
  if (!outcome) return null;
  const device = DEVICES.find((d) => d === b["device"]) ?? "unknown";
  const docType =
    typeof b["docType"] === "string" && /^[a-z0-9-]{1,40}$/.test(b["docType"]) ? b["docType"] : "other";
  return {
    renderMs: b["renderMs"] === null || b["renderMs"] === undefined ? null : int(b["renderMs"], 0, MAX_RENDER_MS),
    stayMs,
    pages: int(b["pages"], 0, 500) ?? 0,
    rebuilds: int(b["rebuilds"], 0, 10_000) ?? 0,
    device,
    outcome,
    previewFailed: b["previewFailed"] === true,
    gateHit: b["gateHit"] === true,
    docType,
    versions: int(b["versions"], 1, 50) ?? 1,
  };
}

export const PREVIEW_VISITS_DDL = [
  `CREATE TABLE IF NOT EXISTS preview_visits (
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
  )`,
  "CREATE INDEX IF NOT EXISTS idx_preview_visits_created ON preview_visits(created_at)",
];

// ── Topic picker helpers: the picks tray's total and the remembered course ──
// The tray shows one total for the whole packet. Under the hood a worksheet
// still stores a count per lesson (advancedCounts + topicCounts), so saved
// worksheets and draft files keep the exact shape they always had and
// rebuild the same problems. These helpers only translate between the two.

import { MAX_COUNT, MIN_COUNT, countForTopic, type WorksheetSettings } from './worksheetSettings';

type Counts = Pick<WorksheetSettings, 'advancedCounts' | 'topicCounts' | 'count'>;

/** Requested problems for the picked lessons, as the tray shows them. */
export function trayTotal(s: Counts, ids: readonly string[]): number {
  return ids.reduce((n, id) => n + countForTopic(s, id), 0);
}

/** Smallest and largest total the tray accepts for this many lessons. */
export function totalRange(lessons: number): { min: number; max: number } {
  return { min: lessons * MIN_COUNT, max: lessons * MAX_COUNT };
}

/** Split a total across lessons as evenly as it goes; the lessons picked
 *  first take the extra one (10 over 3 lessons → 4, 3, 3). The total is
 *  clamped so every lesson gets 1 to 25. */
export function splitTotal(total: number, ids: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (ids.length === 0) return out;
  const { min, max } = totalRange(ids.length);
  const t = Math.min(max, Math.max(min, Math.floor(Number.isFinite(total) ? total : min)));
  const base = Math.floor(t / ids.length);
  const extra = t % ids.length;
  ids.forEach((id, i) => {
    out[id] = base + (i < extra ? 1 : 0);
  });
  return out;
}

// ── Remembered course ────────────────────────────────────────────────────────
// The course chip a teacher last picked, kept in this browser so the picker
// opens on their course next time. Only the chip's name is stored.

export const COURSE_PREF_KEY = 'euclid-picker-course-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** The remembered course if it's still one of the picker's views. */
export function readRememberedCourse(
  storage: StorageLike | null | undefined,
  views: readonly string[],
): string | null {
  if (!storage) return null;
  try {
    const v = storage.getItem(COURSE_PREF_KEY);
    return v && views.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function rememberCourse(storage: StorageLike | null | undefined, view: string): void {
  if (!storage) return;
  try {
    storage.setItem(COURSE_PREF_KEY, view);
  } catch {
    // Storage blocked: the picker still works, it just starts on All.
  }
}

/** localStorage when the browser allows it, otherwise null. */
export function localStore(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

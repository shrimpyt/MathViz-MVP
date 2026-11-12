// ── Taught shelf helpers ─────────────────────────────────────────────────────
// The shelf is the list of lessons a teacher has taught, saved to their
// account (worker/src/taught.ts). These pure helpers keep the app's copy in
// step after an export or a tap, and choose the lessons for the quick starts.

import { splitTotal } from './pickerPrefs';

export interface ShelfLesson {
  topicId: string;
  taughtAt: number; // unix seconds, first time
  lastAt: number; // unix seconds, latest time
}

/** Newest first; lessons taught in the same moment keep a steady order. */
export function sortShelf(shelf: readonly ShelfLesson[]): ShelfLesson[] {
  return [...shelf].sort((a, b) => b.lastAt - a.lastAt || a.topicId.localeCompare(b.topicId));
}

/** The shelf after these lessons were taught at `at`, as the server stores
 *  it: a repeat keeps its first date and moves to the top. */
export function markOnShelf(shelf: readonly ShelfLesson[], ids: readonly string[], at: number): ShelfLesson[] {
  const byId = new Map(shelf.map((l) => [l.topicId, l]));
  for (const id of ids) {
    const had = byId.get(id);
    byId.set(id, { topicId: id, taughtAt: had ? had.taughtAt : at, lastAt: at });
  }
  return sortShelf([...byId.values()]);
}

export function removeFromShelf(shelf: readonly ShelfLesson[], ids: readonly string[]): ShelfLesson[] {
  const drop = new Set(ids);
  return shelf.filter((l) => !drop.has(l.topicId));
}

/** "Again": the lessons taught most recently together (one export or one
 *  Mark taught), in shelf order, keeping only ones the teacher can use. */
export function againLessons(shelf: readonly ShelfLesson[], usable: (id: string) => boolean): string[] {
  const sorted = sortShelf(shelf).filter((l) => usable(l.topicId));
  if (sorted.length === 0) return [];
  const newest = sorted[0].lastAt;
  return sorted.filter((l) => l.lastAt === newest).map((l) => l.topicId);
}

/** Most lessons a quick review mixes. */
export const REVIEW_LESSONS = 5;
/** Problems in a quick review. */
export const REVIEW_PROBLEMS = 10;

/** "Review what I've taught": spiral review leaning on the lessons practised
 *  longest ago. Lessons in the teacher's course come first; the ones just
 *  taught are left for last, since "Again" covers those. */
export function reviewLessons(
  shelf: readonly ShelfLesson[],
  usable: (id: string) => boolean,
  inCourse: (id: string) => boolean = () => true,
  max = REVIEW_LESSONS,
): string[] {
  const candidates = shelf.filter((l) => usable(l.topicId));
  if (candidates.length === 0) return [];
  const course = candidates.filter((l) => inCourse(l.topicId));
  const pool = course.length > 0 ? course : candidates;
  const newest = Math.max(...pool.map((l) => l.lastAt));
  const older = pool.filter((l) => l.lastAt < newest);
  const recent = pool.filter((l) => l.lastAt === newest);
  const stalestFirst = (a: ShelfLesson, b: ShelfLesson) => a.lastAt - b.lastAt || a.topicId.localeCompare(b.topicId);
  return [...older.sort(stalestFirst), ...recent.sort(stalestFirst)].slice(0, max).map((l) => l.topicId);
}

/** Per-lesson counts for a quick review: 10 problems shared evenly. */
export function reviewCounts(ids: readonly string[], total = REVIEW_PROBLEMS): Record<string, number> {
  return splitTotal(Math.max(total, ids.length), ids);
}

/** When a lesson was last taught, in words: "today", "yesterday", "3 days
 *  ago", "2 weeks ago", "4 months ago". Days are counted on the teacher's
 *  calendar, not in 24-hour blocks. */
export function taughtWhen(lastAt: number, nowMs: number = Date.now()): string {
  const day = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  };
  const days = Math.max(0, Math.round(day(nowMs) - day(lastAt * 1000)));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  return months < 24 ? `${months} months ago` : `${Math.floor(days / 365)} years ago`;
}

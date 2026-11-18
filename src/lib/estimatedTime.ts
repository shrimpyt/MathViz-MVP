// ── Estimated time: about how long a typical student needs for a worksheet ──
// Rendering-side only: it reads the finished problem list and never touches
// the factories. Each problem gets a typical number of minutes for an
// on-level student working on their own, from what the problem asks:
//
//   solving   a base for the course level, plus time for each step past two,
//             scaled by the worksheet's difficulty setting
//   reading   the printed prompt at about 100 words a minute (math reading
//             is slower than prose), so word problems cost what they read
//   figures   a little extra to read a drawing, more to draw a graph
//
// A few kinds carry their own clock instead: proofs go by their number of
// rows, SAT questions use the SAT's own pace (about 1.6 minutes each), and
// AP-style multiple choice and free response use AP pacing.
//
// The total is rounded to the nearest 5 minutes. It is a planning guide for
// the teacher, not a timer: real classes vary, and the numbers below are
// meant to be tuned.

import type { MathProblem } from '@/lib/ProblemFactory';
import type { DocumentType } from '@/core/types';
import { problemToQuestion } from '@/core/types';

/** One class period, for the over-a-period note. */
export const CLASS_PERIOD_MINUTES = 45;

/** Solving time for one plain problem at on-level difficulty, by course. */
const BASE_MINUTES: { prefix: string; minutes: number }[] = [
  { prefix: 'MS.6', minutes: 1.5 },
  { prefix: 'MS.7', minutes: 2 },
  { prefix: 'MS.8', minutes: 2 },
  { prefix: 'A2.', minutes: 3 },
  { prefix: 'A.', minutes: 2.5 },
  { prefix: 'GEO.', minutes: 3 },
  { prefix: 'G.', minutes: 3 },
  { prefix: 'PRECALC', minutes: 3.5 },
];
const DEFAULT_BASE = 2.5;

/** Extra minutes for each solution step past the second. */
const PER_EXTRA_STEP = 0.5;
const MAX_STEPS_COUNTED = 8;
/** Reading speed for math prompts, words per minute. */
const READING_WPM = 100;
/** Reading a given drawing or graph. */
const FIGURE_MINUTES = 0.5;
/** Drawing a graph or figure yourself. */
const DRAW_MINUTES = 2;

/** SAT: 22 questions in a 35-minute module. */
const SAT_MINUTES = 1.6;
/** AP-style multiple choice. */
const AP_MCQ_MINUTES = 2.5;
/** AP-style free response, per lettered part. */
const AP_FRQ_PART_MINUTES = 4;

/** Proofs: setting up the Given and Prove, then each row. */
const PROOF_SETUP = 2;
const PROOF_ROW_WRITE = 0.8; // write statement and reason
const PROOF_ROW_REASON = 0.6; // statements given, reason only
const MIN_PROOF_ROWS = 3;

/** Worksheet difficulty scales the solving part. */
const DIFFICULTY_FACTOR: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 1, 3: 1.3 };
/** Guided notes are worked together in class, at the teacher's pace. */
const GUIDED_NOTES_FACTOR = 1.25;
/** Classical Notes: reading the definitions and narrating, per topic. */
const CLASSICAL_SECTION_MINUTES = 4;

export interface EstimateOptions {
  docType: DocumentType;
  difficulty?: 1 | 2 | 3;
  /** Classical Notes: how many topic sections the sheet has. */
  sections?: number;
}

export interface TimeEstimate {
  /** Rounded to the nearest 5 minutes, never below 5. 0 for no problems. */
  minutes: number;
  /** Before rounding, for tests and tuning. */
  exactMinutes: number;
  /** More than one class period. */
  overPeriod: boolean;
}

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function baseFor(type: string): number {
  return BASE_MINUTES.find((b) => type.startsWith(b.prefix))?.minutes ?? DEFAULT_BASE;
}

function hasFigure(p: MathProblem): boolean {
  const r = p as unknown as Record<string, unknown>;
  return !!(r.svgParams || r.graph || r.diagram);
}

/** Prompts that ask the student to draw rather than read a drawing. */
const DRAW_RE = /^(graph|sketch|plot|draw|construct)\b|\b(graph|sketch|plot) (the|each|this|both)\b/i;

/** Typical minutes for one problem, before the worksheet is rounded. */
export function problemMinutes(
  p: MathProblem,
  opts: Pick<EstimateOptions, 'docType' | 'difficulty'>,
): number {
  const r = p as unknown as Record<string, unknown>;
  const type = String(r.type ?? '');
  const scale = DIFFICULTY_FACTOR[opts.difficulty ?? 2] ?? 1;

  if (type === 'SAT') return SAT_MINUTES;
  if (type === 'PRECALC_MCQ' || type === 'CALC_MCQ') return AP_MCQ_MINUTES * scale;
  if (type === 'AP_FRQ') {
    const parts = Array.isArray(r.subparts) ? Math.max(1, r.subparts.length) : 3;
    return parts * AP_FRQ_PART_MINUTES * scale;
  }
  if (type === 'Proof') {
    const rows = Math.max(MIN_PROOF_ROWS, Array.isArray(r.steps) ? r.steps.length : 0);
    const perRow = opts.docType === 'proof-fill-reasons' ? PROOF_ROW_REASON : PROOF_ROW_WRITE;
    return (PROOF_SETUP + rows * perRow) * scale + (hasFigure(p) ? FIGURE_MINUTES : 0);
  }

  const steps = Array.isArray(r.steps) ? Math.min(r.steps.length, MAX_STEPS_COUNTED) : 2;
  const solving = (baseFor(type) + Math.max(0, steps - 2) * PER_EXTRA_STEP) * scale;
  let text = '';
  try {
    text = problemToQuestion(p, 0).text ?? '';
  } catch {
    text = String(r.prompt ?? r.stem ?? '');
  }
  const reading = words(text) / READING_WPM;
  const figure = DRAW_RE.test(text) ? DRAW_MINUTES : hasFigure(p) ? FIGURE_MINUTES : 0;
  return solving + reading + figure;
}

/** Round to the nearest 5 minutes, at least 5. */
export function roundToFive(minutes: number): number {
  if (!(minutes > 0)) return 0;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

/** The whole worksheet: every problem plus any per-section reading. */
export function estimateWorksheet(
  problems: readonly MathProblem[],
  opts: EstimateOptions,
): TimeEstimate {
  if (problems.length === 0) return { minutes: 0, exactMinutes: 0, overPeriod: false };
  let total = problems.reduce((sum, p) => sum + problemMinutes(p, opts), 0);
  if (opts.docType === 'guided-notes') total *= GUIDED_NOTES_FACTOR;
  if (opts.docType === 'classical-notes') total += (opts.sections ?? 1) * CLASSICAL_SECTION_MINUTES;
  const minutes = roundToFive(total);
  return { minutes, exactMinutes: total, overPeriod: minutes > CLASS_PERIOD_MINUTES };
}

// ── Wording ──────────────────────────────────────────────────────────────────

/** "about 25 minutes" (or "about 1 hour 10 minutes" past an hour). */
export function aboutMinutes(minutes: number): string {
  if (minutes < 60) return `about ${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = `${h} hour${h === 1 ? '' : 's'}`;
  return m === 0 ? `about ${hours}` : `about ${hours} ${m} minutes`;
}

/** Short form for the builder's bottom bar: "about 25 min", "about 1 hr 10 min". */
export function aboutMinutesShort(minutes: number): string {
  if (minutes < 60) return `about ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `about ${h} hr` : `about ${h} hr ${m} min`;
}

/** Teacher copy and builder: "Estimated time: about 25 minutes for a typical student". */
export function estimatedTimeLine(minutes: number): string {
  return `Estimated time: ${aboutMinutes(minutes)} for a typical student`;
}

/** Answer key: the builder line, plus the period note when it runs long. */
export function teacherTimeLine(minutes: number): string {
  const line = estimatedTimeLine(minutes);
  return minutes > CLASS_PERIOD_MINUTES
    ? `${line}, longer than one ${CLASS_PERIOD_MINUTES}-minute class period`
    : line;
}

/** Student sheet: "Estimated time: about 25 minutes". */
export function studentTimeLine(minutes: number): string {
  return `Estimated time: ${aboutMinutes(minutes)}`;
}

/** The gentle note when a sheet runs past one class period. */
export function overPeriodNote(minutes: number): string | null {
  return minutes > CLASS_PERIOD_MINUTES
    ? `That runs longer than one ${CLASS_PERIOD_MINUTES}-minute class period.`
    : null;
}

// ── Remembered choice: print the time on the student sheet ───────────────────
// A teacher's habit rather than part of one worksheet, so it is kept in this
// browser and not in saved worksheets or draft files. Off unless turned on.

export const TIME_ON_SHEET_PREF_KEY = 'euclid-time-on-student-sheet-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function readTimeOnSheet(storage: StorageLike | null | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(TIME_ON_SHEET_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberTimeOnSheet(storage: StorageLike | null | undefined, on: boolean): void {
  if (!storage) return;
  try {
    storage.setItem(TIME_ON_SHEET_PREF_KEY, on ? '1' : '0');
  } catch {
    /* private mode or blocked storage: the switch still works this visit */
  }
}

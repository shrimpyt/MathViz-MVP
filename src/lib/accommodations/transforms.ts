// transforms.ts
// Accommodation transforms — pure functions, no side effects.
//
// Pipeline shape (per AGENTS.md generate→render rule):
//   { problems: MathProblem[], presentation: Presentation }
//     → transforms → { problems, presentation } → renderers
//
// Phase 1 transforms are renderer-level: they adjust the Presentation and
// pass MathProblem[] through UNTOUCHED. They must never alter numbers, answers,
// difficulty, problem count, or problem selection — presentation only. The
// invariant "answers before == answers after" is asserted in __tests__.
//
// Phase 2 adds ONE content transform: reduced-count. It subsets the problem
// list (25% reduction, TEKS coverage preserved — see selectReducedProblems)
// and passes Presentation through. It always runs FIRST in the composition
// order, so presentation transforms apply to the already-reduced list.
// Reduced versions get their own answer keys derived from their own subset
// (see versions.ts buildAnswerKey).

import type { MathProblem } from '../types';
import {
  DEFAULT_PRESENTATION,
  type AccommodationFlags,
  type AccommodationId,
  type Presentation,
  activeAccommodationIds,
} from './types';

/** The unit flowing through the transform pipeline. */
export interface VersionInput {
  problems: MathProblem[];
  presentation: Presentation;
}

export type AccommodationTransform = (input: VersionInput) => VersionInput;

function withPresentation(input: VersionInput, presentation: Presentation): VersionInput {
  // New objects throughout — inputs are never mutated.
  return { problems: input.problems, presentation: { ...presentation } };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── The four Phase 1 transforms ───────────────────────────────────────────────

/** Large print: scale diagram/text sizing (default ×1.25). */
export const largePrint: AccommodationTransform = (input) => {
  const p = input.presentation;
  return withPresentation(input, { ...p, fontScale: round2(p.fontScale * 1.25) });
};

/** Sans-serif font: swap the font-family token (renderer registers WorksheetSans). */
export const sansSerif: AccommodationTransform = (input) => {
  const p = input.presentation;
  return withPresentation(input, { ...p, fontFamily: 'sans' });
};

/** Extra spacing: widen margins/padding/line-height and problem-card gaps (×1.5). */
export const extraSpacing: AccommodationTransform = (input) => {
  const p = input.presentation;
  return withPresentation(input, { ...p, spacingScale: round2(p.spacingScale * 1.5) });
};

/**
 * Fewer per page: halve the problems-per-page cap (default 4 → 2).
 * Deterministic pagination; content identical, just chunked smaller.
 */
export const fewerPerPage: AccommodationTransform = (input) => {
  const p = input.presentation;
  return withPresentation(input, {
    ...p,
    maxProblemsPerPage: Math.max(1, Math.ceil(p.maxProblemsPerPage / 2)),
  });
};

// ── Content transform: reduced problem count (Phase 2) ────────────────────────

/**
 * Target size for the reduced version: 75% of the base count, at least 1.
 * Exported for tests and for divider-page copy.
 */
export function reducedCountTarget(baseCount: number): number {
  return Math.max(1, Math.round(baseCount * 0.75));
}

/**
 * TEKS-preserving 25% problem reduction.
 *
 * Every MathProblem carries its TEKS standard in `type` (e.g. "G.9A").
 * HARD CONSTRAINT: every TEKS present in the base list appears at least
 * once in the returned subset. Coverage beats the count: on tiny bases
 * (e.g. 3 problems across 3 TEKS) the subset can exceed the 75% target —
 * we never drop a standard to hit the number.
 *
 * Selection (deterministic — pure function of input order, no randomness):
 *   1. Take the first problem of each TEKS, in base order (the guarantee).
 *   2. Fill remaining slots round-robin across TEKS groups (first-seen TEKS
 *      order), taking each group's next problem in base order.
 *   3. Restore original relative order so numbering reads naturally.
 */
export function selectReducedProblems(problems: MathProblem[]): MathProblem[] {
  const n = problems.length;
  if (n === 0) return [];
  // Group base indices by TEKS, preserving base order within each group.
  const byTeks = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const key = problems[i].type;
    const g = byTeks.get(key);
    if (g) g.push(i);
    else byTeks.set(key, [i]);
  }
  const teksOrder = [...byTeks.keys()]; // first-seen order — deterministic
  const target = reducedCountTarget(n);

  // Phase 1: one per TEKS (the coverage guarantee).
  const picked: number[] = teksOrder.map((k) => byTeks.get(k)![0]);

  // Phase 2: round-robin fill.
  if (picked.length < target) {
    const cursor = new Map<string, number>(teksOrder.map((k) => [k, 1]));
    let remaining = target - picked.length;
    while (remaining > 0) {
      let added = false;
      for (const k of teksOrder) {
        if (remaining === 0) break;
        const g = byTeks.get(k)!;
        const c = cursor.get(k)!;
        if (c < g.length) {
          picked.push(g[c]);
          cursor.set(k, c + 1);
          remaining--;
          added = true;
        }
      }
      if (!added) break; // every group exhausted — picked.length === n
    }
  }

  picked.sort((a, b) => a - b); // restore base relative order
  return picked.map((i) => problems[i]);
}

/**
 * Reduced count: replace the problem list with its TEKS-preserving 25%
 * reduction. Presentation passes through untouched; downstream presentation
 * transforms (large print etc.) compose after this, per composition order.
 * Pure: never mutates the input list.
 */
export const reducedCount: AccommodationTransform = (input) => {
  return { problems: selectReducedProblems(input.problems), presentation: { ...input.presentation } };
};

const TRANSFORM_BY_ID: Record<AccommodationId, AccommodationTransform> = {
  'reduced-count': reducedCount,
  'sans-serif-font': sansSerif,
  'large-print': largePrint,
  'increased-spacing': extraSpacing,
  'fewer-per-page': fewerPerPage,
};

/**
 * Compose a group's transforms in the fixed composition order (see types.ts).
 * Each selected flag applies exactly once. Pure: returns a new VersionInput.
 */
export function applyAccommodations(
  problems: MathProblem[],
  flags: AccommodationFlags,
): VersionInput {
  const ids = activeAccommodationIds(flags);
  let result: VersionInput = { problems, presentation: { ...DEFAULT_PRESENTATION } };
  for (const id of ids) {
    result = TRANSFORM_BY_ID[id](result);
  }
  return result;
}

/** Convenience: presentation-only view of a group's transforms. */
export function presentationForFlags(flags: AccommodationFlags): Presentation {
  return applyAccommodations([], flags).presentation;
}

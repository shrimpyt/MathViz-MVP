// transforms.ts
// Phase 1 accommodation transforms — pure functions, no side effects.
//
// Pipeline shape (per AGENTS.md generate→render rule):
//   { problems: MathProblem[], presentation: Presentation }
//     → transforms → { problems, presentation } → renderers
//
// Phase 1 transforms are all renderer-level: they adjust the Presentation and
// pass MathProblem[] through UNTOUCHED. They must never alter numbers, answers,
// difficulty, problem count, or problem selection — presentation only. The
// invariant "answers before == answers after" is asserted in __tests__.

import type { MathProblem } from '../types';
import {
  DEFAULT_PRESENTATION,
  type AccommodationFlags,
  type Phase1AccommodationId,
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

const TRANSFORM_BY_ID: Record<Phase1AccommodationId, AccommodationTransform> = {
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

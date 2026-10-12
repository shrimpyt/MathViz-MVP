// wordbank.ts
// Word bank derivation for the IEP accommodation generator.
//
// A word bank prints the version's fill-in blank answers at the top of the
// worksheet so students SELECT an answer instead of recalling it cold. The
// bank is derived from the version's own final problem list (after any
// content transforms like reduced-count), exactly like the answer key —
// so a bank can never contain answers to problems the version doesn't have.
//
// Pure function: same problem list → same bank, every time. Terms are
// deduped, then shuffled with a PRNG seeded from the terms themselves
// (deterministic, but not in worksheet order, so the bank isn't a giveaway
// answer key read top-to-bottom).

import type { MathProblem, ProblemStep } from '../types';
import { latexToText } from '../answerKey';
import { mulberry32 } from '../math-utils';

/** Blank answers carried by one problem (problems without steps yield none). */
function blankAnswersOf(problem: MathProblem): string[] {
  const steps = (problem as { steps?: ProblemStep[] }).steps;
  if (!Array.isArray(steps)) return [];
  const out: string[] = [];
  for (const step of steps) {
    for (const blank of step.blanks ?? []) {
      const term = latexToText(blank.answer).trim();
      if (!term) continue;
      out.push(blank.unit && !term.endsWith(blank.unit) ? `${term} ${blank.unit}` : term);
    }
  }
  return out;
}

/** Small stable string hash (FNV-1a) for seeding the shuffle. */
function hashTerms(terms: string[]): number {
  let h = 0x811c9dc5;
  const joined = terms.join('');
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Build the word bank for a problem list: every fill-in blank answer,
 * deduped (first occurrence wins), deterministically shuffled.
 * Returns [] when the list has no blanks — renderers omit the bank box.
 */
export function buildWordBank(problems: MathProblem[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const p of problems) {
    for (const term of blankAnswersOf(p)) {
      if (!seen.has(term)) {
        seen.add(term);
        terms.push(term);
      }
    }
  }
  if (terms.length < 2) return terms;
  const rng = mulberry32(hashTerms(terms));
  const shuffled = [...terms];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

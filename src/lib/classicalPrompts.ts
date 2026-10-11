// classicalPrompts.ts
// Socratic margin-prompt bank for CLASSICAL NOTES mode, plus deterministic
// seeded rotation with no adjacent repeats.
//
// The margin prompt is the dialectic margin made structural: each demonstration
// step gets one printed question "alongside" it. Rotation is seeded
// (mulberry32) so the web preview and the PDF export assign identical prompts
// for the same worksheet seed — reproducibility is part of the contract.

import { mulberry32 } from "./math-utils";

/** The margin-prompt bank. Prompts must be plain text (no LaTeX). */
export const CLASSICAL_MARGIN_PROMPTS: string[] = [
  "Why is this step valid?",
  "What theorem justifies this?",
  "What would break if this step were skipped?",
  "Could this step come earlier? Why or why not?",
  "What is assumed here that hasn't been stated?",
  "What is this step really saying, in plain words?",
  "How could you check that this step is correct?",
];

/**
 * Generic margin prompt used when a step has no `reason` field. The
 * demonstration still renders normally; the margin prompt carries the
 * dialectic weight instead of a blanked reason line.
 */
export const GENERIC_MARGIN_PROMPT =
  "What is this step doing — and what justifies it?";

function shuffled<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Assign one margin prompt per step, deterministically from `seed`.
 * Guarantees: every prompt comes from the bank, no two ADJACENT prompts are
 * equal (including across deck-reshuffle boundaries), and the full bank is
 * cycled through before any prompt repeats (seeded deck shuffle).
 */
export function assignMarginPrompts(seed: number, count: number): string[] {
  const out: string[] = [];
  if (count <= 0) return out;
  const rng = mulberry32(seed >>> 0);
  let deck: string[] = [];
  while (out.length < count) {
    if (deck.length === 0) {
      deck = shuffled(CLASSICAL_MARGIN_PROMPTS, rng);
      const prev = out[out.length - 1];
      if (prev !== undefined && deck[0] === prev) {
        // Swap the leading card with a later non-matching one so the
        // boundary between decks never repeats a prompt.
        const swapIdx = deck.findIndex((p, i) => i > 0 && p !== prev);
        if (swapIdx > 0) {
          [deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]];
        }
      }
    }
    const next = deck.shift();
    if (next === undefined) break; // bank is non-empty; defensive only
    out.push(next);
  }
  return out;
}

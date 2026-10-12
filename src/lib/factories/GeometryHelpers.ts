// GeometryHelpers.ts
// Small pure helpers shared by the Geometry factory files: number/fraction
// formatting, step construction (every step carries a reason — Classical Notes
// and Guided Notes depend on it), and difficulty-tier pool selection.
// Seeded RNG only; no Math.random anywhere in the geometry factories.

import type { RNG } from "../math-utils";
import { randInt } from "../math-utils";
import type { ProblemStep } from "../types";
import type { GeometryProblem } from "./GeometryTypes";

export type Difficulty = 1 | 2 | 3;

/** Trim a number for display: integers stay integers, otherwise round to
 *  `digits` places and strip trailing zeros. */
export function num(n: number, digits = 2): string {
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return Number.isInteger(r) ? String(r) : String(r);
}

/** Round to 2 dp and return as a number (for answers stored numerically). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a === 0 ? 1 : a;
}

/** Reduced fraction string "p/q" (or "p" when q reduces to 1).
 *  The sign is normalized onto the numerator. */
export function frac(p: number, q: number): string {
  const g = gcd(p, q);
  let rp = p / g;
  let rq = q / g;
  if (rq < 0) {
    rp = -rp;
    rq = -rq;
  }
  return rq === 1 ? String(rp) : `${rp}/${rq}`;
}

/** Build one worked step. `reason` is the theorem/postulate/definition name —
 *  required on every step in the geometry factories. */
export function step(
  instruction: string,
  reason: string,
  blanks?: { label: string; answer: string }[]
): ProblemStep {
  return blanks ? { instruction, reason, blanks } : { instruction, reason };
}

/** A maker entry in a factory pool: subtype name + lowest tier that unlocks it. */
export interface MakerEntry {
  subtype: string;
  minTier: Difficulty;
  make: (rng: RNG, difficulty: Difficulty) => GeometryProblem;
}

export function M(
  subtype: string,
  minTier: Difficulty,
  make: (rng: RNG, difficulty: Difficulty) => GeometryProblem
): MakerEntry {
  return { subtype, minTier, make };
}

/** Makers available at a difficulty tier (cumulative unlock). */
export function poolForTier(pool: readonly MakerEntry[], difficulty: Difficulty): MakerEntry[] {
  const out = pool.filter((e) => e.minTier <= difficulty);
  return out.length > 0 ? out : [...pool];
}

/** Sample `n` problems from a maker pool with a shuffle-bag so a worksheet
 *  covers the pool's subtypes before repeating any of them. Deterministic. */
export function sampleFromPool(
  rng: RNG,
  pool: readonly MakerEntry[],
  n: number,
  difficulty: Difficulty
): GeometryProblem[] {
  const allowed = poolForTier(pool, difficulty);
  const out: GeometryProblem[] = [];
  let bag: MakerEntry[] = [];
  while (out.length < n) {
    if (bag.length === 0) {
      bag = [...allowed];
      // Fisher–Yates with the seeded rng
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    out.push(bag.pop()!.make(rng, difficulty));
  }
  return out;
}

/** Weighted bag for chapter tests: each entry contributes `weight` slots to
 *  the bag, so a 10-problem test samples the chapter in realistic proportions.
 *  Deterministic shuffle-bag, same contract as sampleFromPool. */
export function sampleWeighted(
  rng: RNG,
  weighted: readonly { entry: MakerEntry; weight: number }[],
  n: number,
  difficulty: Difficulty
): GeometryProblem[] {
  const bag0: MakerEntry[] = [];
  for (const { entry, weight } of weighted) {
    if (entry.minTier > difficulty) continue;
    for (let i = 0; i < weight; i++) bag0.push(entry);
  }
  const out: GeometryProblem[] = [];
  let bag: MakerEntry[] = [];
  while (out.length < n) {
    if (bag.length === 0) {
      bag = [...bag0];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    if (bag.length === 0) break;
    out.push(bag.pop()!.make(rng, difficulty));
  }
  return out;
}

/** Pick a random integer Pythagorean triple (scaled primitive or primitive)
 *  from a classroom-friendly list. Returns [legA, legB, hyp]. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25],
  [9, 12, 15], [12, 16, 20], [10, 24, 26], [20, 21, 29], [12, 35, 37],
  [15, 20, 25], [9, 40, 41], [11, 60, 61], [16, 30, 34], [21, 28, 35],
];
export function pickTriple(rng: RNG): [number, number, number] {
  return TRIPLES[randInt(rng, 0, TRIPLES.length - 1)];
}

/** Format a coordinate pair, e.g. "(3, -2)". */
export function pt(x: number, y: number): string {
  return `(${x}, ${y})`;
}

/** Format a translation rule in mapping notation: "(x, y) → (x + 4, y − 3)". */
export function ruleStr(a: number, b: number): string {
  const xs = a === 0 ? "x" : a > 0 ? `x + ${a}` : `x − ${-a}`;
  const ys = b === 0 ? "y" : b > 0 ? `y + ${b}` : `y − ${-b}`;
  return `(x, y) → (${xs}, ${ys})`;
}

/** Signed term for algebra strings: 4 → "+ 4", -3 → "− 3". */
export function signedTerm(v: number): string {
  return v >= 0 ? `+ ${v}` : `− ${-v}`;
}

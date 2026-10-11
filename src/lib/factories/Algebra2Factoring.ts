// Algebra2Factoring.ts
// A2.3 — Factoring: rational root theorem (list possible ±p/q, find actual
// roots), factor by grouping, sum/difference of cubes. Polynomials are built
// from their factors so roots are exact by construction; tests verify by
// independent evaluation (P(root) = 0) and re-multiplication.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, randNonZero, polyMul, polyToLatex, linearFactor, selectMakers } from "./Algebra2Helpers";

export type FactoringSubtype = "RationalRootTheorem" | "FactorByGrouping" | "SumDifferenceCubes";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

// ── Rational root theorem ─────────────────────────────────────────────────────

function divisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= Math.abs(n); d++) if (n % d === 0) out.push(d);
  return out;
}

/** Cubic with small integer/rational roots, built from linear factors. */
function makeRationalRootTheorem(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  // Build from linear factors (q_i x - p_i); roots p_i/q_i.
  const nf = 3;
  const factors: [number, number][] = []; // [q, p]
  for (let i = 0; i < nf; i++) {
    const q = hard === 1 ? 1 : pick(rng, [1, 1, 2]);
    let p = randSigned(rng, hard === 1 ? 3 : 4);
    if (q === 2 && p % 2 === 0) p += 1; // keep p/q reduced
    factors.push([q, p]);
  }
  if (hard === 3) {
    // repeated root: duplicate the first factor
    factors[2] = factors[0];
  }
  let poly = [1];
  for (const [q, p] of factors) poly = polyMul(poly, [q, -p]);
  const roots = factors.map(([q, p]) => p / q).sort((a, b) => a - b);
  const uniqRoots = [...new Set(roots)];

  const lead = poly[0];
  const constant = poly[poly.length - 1];
  const possible = possibleRationalRoots(constant, lead);
  const possibleStr = possible.map((v) => `${v}`).join(", ");

  return {
    type: "A2.8",
    subtype: "RationalRootTheorem",
    given: { polynomial: `${polyToLatex(poly)} = 0` },
    find: "all rational roots (rational root theorem)",
    answer: `x = ${uniqRoots.join(" or x = ")}`,
    steps: [
      {
        instruction: `List all possible rational roots ±p/q where p divides ${constant} and q divides ${lead}:`,
        reason: "Rational root theorem",
        blanks: [{ label: "possible ±p/q", answer: possibleStr }],
      },
      {
        instruction: "Test the candidates (synthetic division / substitution) to find the actual roots:",
        reason: "Test candidates",
        blanks: [{ label: "actual roots", answer: `x = ${uniqRoots.join(" or x = ")}` }],
      },
    ],
    verify: { poly, roots: uniqRoots, possible, lead, constant },
  };
}

// ── Factor by grouping: (mx + n)(px^2 + q) ────────────────────────────────────

function makeFactorByGrouping(rng: RNG): Algebra2Problem {
  const m = randNonZero(rng, -3, 3);
  const n = randNonZero(rng, -5, 5);
  const p = randNonZero(rng, -3, 3);
  const q = randNonZero(rng, -5, 5);
  // (mx + n)(px^2 + q) = mpx^3 + npx^2 + mqx + nq
  const poly = [m * p, n * p, m * q, n * q];
  const f1 = m === 1 ? "x" : m === -1 ? "-x" : `${m}x`;
  const g1 = `${f1} ${n < 0 ? "-" : "+"} ${Math.abs(n)}`;
  const g2 = `${p === 1 ? "x^2" : p === -1 ? "-x^2" : `${p}x^2`} ${q < 0 ? "-" : "+"} ${Math.abs(q)}`;
  return {
    type: "A2.8",
    subtype: "FactorByGrouping",
    given: { polynomial: polyToLatex(poly) },
    find: "factored form (factor by grouping)",
    answer: `(${g1})(${g2})`,
    steps: [
      {
        instruction: "Group the terms in pairs and factor out the GCF of each pair:",
        reason: "Factor by grouping",
        blanks: [{ label: "grouped", answer: "see work" }],
      },
      {
        instruction: "Factor out the common binomial factor:",
        reason: "Common binomial factor",
        blanks: [{ label: "factored form", answer: `(${g1})(${g2})` }],
      },
    ],
    verify: { poly, m, n, p, q },
  };
}

// ── Sum / difference of cubes ─────────────────────────────────────────────────

function makeSumDiffCubes(rng: RNG, hard: boolean): Algebra2Problem {
  const k = randInt(rng, 2, 5);
  const isSum = rng() < 0.5;
  const a = hard ? randInt(rng, 2, 3) : 1; // (ax)^3 ± k^3
  const aCubed = a * a * a;
  const kCubed = k * k * k;
  const poly = isSum ? [aCubed, 0, 0, kCubed] : [aCubed, 0, 0, -kCubed];
  const ax = a === 1 ? "x" : `${a}x`;
  const ax2 = a === 1 ? "x^2" : `${a * a}x^2`;
  const akx = a * k === 1 ? "x" : `${a * k}x`;
  const factored = isSum
    ? `(${ax} + ${k})(${ax2} - ${akx} + ${k * k})`
    : `(${ax} - ${k})(${ax2} + ${akx} + ${k * k})`;
  return {
    type: "A2.8",
    subtype: "SumDifferenceCubes",
    given: { polynomial: `${polyToLatex(poly)} = 0` },
    find: isSum ? "factored form (sum of cubes)" : "factored form (difference of cubes)",
    answer: factored,
    steps: [
      {
        instruction: `Recognize ${isSum ? "a sum" : "a difference"} of cubes: A^3 ${isSum ? "+" : "-"} B^3 with A = ${ax}, B = ${k}:`,
        reason: "Sum/difference of cubes pattern",
        blanks: [
          { label: "A", answer: ax },
          { label: "B", answer: `${k}` },
        ],
      },
      {
        instruction: isSum
          ? "Apply A^3 + B^3 = (A + B)(A^2 - AB + B^2):"
          : "Apply A^3 - B^3 = (A - B)(A^2 + AB + B^2):",
        reason: isSum ? "Sum of cubes formula" : "Difference of cubes formula",
        blanks: [{ label: "factored form", answer: factored }],
      },
    ],
    verify: { poly, a, k, isSum },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeRationalRootTheorem(rng, 1) },
  { minDifficulty: 1, make: (rng) => makeSumDiffCubes(rng, false) },
  { minDifficulty: 2, make: (rng) => makeRationalRootTheorem(rng, 2) },
  { minDifficulty: 2, make: makeFactorByGrouping },
  { minDifficulty: 2, make: (rng) => makeSumDiffCubes(rng, true) },
  { minDifficulty: 3, make: (rng) => makeRationalRootTheorem(rng, 3) },
  { minDifficulty: 3, make: makeFactorByGrouping },
];

/** Generate n A2.8 (T8 polynomials) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateFactoringProblems(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  only?: readonly string[]
): Algebra2Problem[] {
  const pool = selectMakers(MAKERS, difficulty, only);
  const out: Algebra2Problem[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60 + 200) {
    const p = pool[Math.floor(rng() * pool.length)].make(rng);
    if (!only || only.includes(p.subtype)) out.push(p);
  }
  return out;
}

export const FACTORING_MAKERS = MAKERS;

/** Possible rational roots ±p/q for a polynomial (constant term c, leading a). Exported for tests. */
export function possibleRationalRoots(constant: number, lead: number): number[] {
  const out: number[] = [];
  for (const pd of divisors(constant))
    for (const qd of divisors(lead)) {
      for (const v of [pd / qd, -pd / qd]) {
        if (!out.some((w) => Math.abs(w - v) < 1e-9)) out.push(v);
      }
    }
  return out.sort((x, y) => x - y);
}

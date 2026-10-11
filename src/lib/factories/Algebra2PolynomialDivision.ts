// Algebra2PolynomialDivision.ts
// A2.2 — Polynomial long division & synthetic division by a linear divisor.
// Dividends are constructed as (x - r)·Q(x) (+ optional remainder) so the
// quotient/remainder are exact by construction; tests re-derive them with an
// independent long-division implementation. Pure, seeded, cumulative 1|2|3.

import type { RNG } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, polyMul, polyAdd, polyToLatex, linearFactor, selectMakers } from "./Algebra2Helpers";

export type DivisionSubtype = "LongDivision" | "SyntheticDivision";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

interface DivisionData {
  /** Descending coefficients of the dividend (cubic). */
  dividend: number[];
  /** Root of the linear divisor x - r. */
  r: number;
  /** Descending coefficients of the quotient (quadratic). */
  quotient: number[];
  remainder: number;
}

/** Build a cubic dividend = (x - r)·Q(x) + rem. */
function buildDivision(rng: RNG, opts: { missingTerm: boolean; remainder: boolean }): DivisionData {
  const r = randSigned(rng, 5);
  // Monic quadratic quotient with small integer coefficients
  const q2 = 1;
  const q1 = randSigned(rng, 6);
  let q0 = randSigned(rng, 8);
  const quotient = [q2, q1, q0];
  let dividend = polyMul([1, -r], quotient); // (x - r)·Q
  if (opts.missingTerm) {
    // Force the x^2 coefficient to zero: q1 - r = 0 → q1 = r
    const q1m = r;
    const qq = [1, q1m, q0];
    dividend = polyMul([1, -r], qq);
    quotient[1] = q1m;
  }
  let remainder = 0;
  if (opts.remainder) {
    remainder = randSigned(rng, 9);
    dividend = polyAdd(dividend, [remainder]);
  }
  return { dividend, r, quotient, remainder };
}

function quotientLatex(quotient: number[], r: number, remainder: number): string {
  const q = polyToLatex(quotient);
  if (remainder === 0) return q;
  const div = linearFactor(r);
  return remainder > 0
    ? `${q} + ${remainder}/${div}`
    : `${q} - ${-remainder}/${div}`;
}

function makeDivisionProblem(rng: RNG, subtype: DivisionSubtype, opts: { missingTerm: boolean; remainder: boolean }): Algebra2Problem {
  const { dividend, r, quotient, remainder } = buildDivision(rng, opts);
  const dividendLatex = polyToLatex(dividend);
  const divisorLatex = linearFactor(r);
  const answerLatex = quotientLatex(quotient, r, remainder);

  const steps: ProblemStep[] =
    subtype === "LongDivision"
      ? [
          {
            instruction: `Divide the leading terms: x^3 ÷ x = x^2. Multiply ${divisorLatex} by x^2 and subtract:`,
            reason: "Long division: divide leading terms",
            blanks: [{ label: "first term of quotient", answer: "x^2" }],
          },
          {
            instruction: "Repeat: divide, multiply, subtract, bring down — until the degree of the remainder is less than 1:",
            reason: "Long division algorithm",
            blanks: [
              { label: "quotient", answer: polyToLatex(quotient) },
              { label: "remainder", answer: `${remainder}` },
            ],
          },
        ]
      : [
          {
            instruction: `Set up the synthetic table with r = ${r} and coefficients ${dividend.map((c) => `${c}`).join(", ")}:`,
            reason: "Synthetic division setup",
            blanks: [{ label: "r", answer: `${r}` }],
          },
          {
            instruction: "Bring down, multiply by r, add — across the row. The last value is the remainder:",
            reason: "Synthetic division algorithm",
            blanks: [
              { label: "quotient coefficients", answer: quotient.join(", ") },
              { label: "remainder", answer: `${remainder}` },
            ],
          },
        ];

  return {
    type: "A2.8",
    subtype,
    given: {
      dividend: dividendLatex,
      divisor: divisorLatex,
    },
    find: subtype === "LongDivision" ? "quotient and remainder (long division)" : "quotient and remainder (synthetic division)",
    answer: answerLatex,
    steps,
    verify: { dividend, r, quotient, remainder },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeDivisionProblem(rng, "LongDivision", { missingTerm: false, remainder: false }) },
  { minDifficulty: 2, make: (rng) => makeDivisionProblem(rng, "LongDivision", { missingTerm: true, remainder: false }) },
  { minDifficulty: 2, make: (rng) => makeDivisionProblem(rng, "SyntheticDivision", { missingTerm: false, remainder: false }) },
  { minDifficulty: 3, make: (rng) => makeDivisionProblem(rng, "LongDivision", { missingTerm: false, remainder: true }) },
  { minDifficulty: 3, make: (rng) => makeDivisionProblem(rng, "SyntheticDivision", { missingTerm: true, remainder: true }) },
];

/** Generate n A2.8 (T8 polynomials) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateDivisionProblems(
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

export const DIVISION_MAKERS = MAKERS;

// Algebra2Sequences.ts
// A2.6 — Sequences & series: explicit arithmetic/geometric formulas, solving
// for n / a1 / d / r, recursive evaluation, finite arithmetic and geometric
// sums. Every value is constructed from chosen parameters so terms are exact;
// tests recompute terms by independent iteration and sums by direct addition.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, randNonZero, selectMakers } from "./Algebra2Helpers";

export type SequenceSubtype =
  | "ArithmeticExplicit"
  | "ArithmeticFindN"
  | "ArithmeticSystem"
  | "GeometricExplicit"
  | "GeometricFindR"
  | "Recursive"
  | "FiniteSum";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

// ── Arithmetic: explicit ──────────────────────────────────────────────────────

function makeArithmeticExplicit(rng: RNG): Algebra2Problem {
  const a1 = randSigned(rng, 12);
  const d = randNonZero(rng, -9, 9);
  const n = randInt(rng, 6, 14);
  const an = a1 + (n - 1) * d;
  return {
    type: "A2.S",
    subtype: "ArithmeticExplicit",
    given: {
      sequence: "arithmetic",
      firstTerm: `${a1}`,
      commonDifference: `${d}`,
    },
    find: `a_${n}`,
    answer: `${an}`,
    steps: [
      {
        instruction: `Use the explicit formula a_n = a_1 + (n - 1)d with n = ${n}:`,
        reason: "Explicit arithmetic formula",
        blanks: [{ label: `a_${n}`, answer: `${an}` }],
      },
    ],
    verify: { kind: "arith", a1, d, n, an },
  };
}

// ── Arithmetic: find n ────────────────────────────────────────────────────────

function makeArithmeticFindN(rng: RNG): Algebra2Problem {
  const a1 = randSigned(rng, 10);
  const d = randNonZero(rng, -8, 8);
  const n = randInt(rng, 5, 20);
  const v = a1 + (n - 1) * d;
  return {
    type: "A2.S",
    subtype: "ArithmeticFindN",
    given: {
      sequence: "arithmetic",
      firstTerm: `${a1}`,
      commonDifference: `${d}`,
      termValue: `${v}`,
    },
    find: "n (which term equals the given value)",
    answer: `n = ${n}`,
    steps: [
      {
        instruction: `Set a_n = ${v} in a_n = a_1 + (n - 1)d and solve for n:`,
        reason: "Solve for n",
        blanks: [
          { label: "equation", answer: `${v} = ${a1} + (n - 1)(${d})` },
          { label: "n", answer: `n = ${n}` },
        ],
      },
    ],
    verify: { kind: "arith", a1, d, n, an: v },
  };
}

// ── Arithmetic: system from two terms ─────────────────────────────────────────

function makeArithmeticSystem(rng: RNG): Algebra2Problem {
  const a1 = randSigned(rng, 10);
  const d = randNonZero(rng, -7, 7);
  const m = randInt(rng, 3, 6);
  let n = randInt(rng, 8, 14);
  if (n === m) n += 3;
  const am = a1 + (m - 1) * d;
  const an = a1 + (n - 1) * d;
  const k = randInt(rng, 15, 22);
  const ak = a1 + (k - 1) * d;
  return {
    type: "A2.S",
    subtype: "ArithmeticSystem",
    given: {
      sequence: "arithmetic",
      [`a_${m}`]: `${am}`,
      [`a_${n}`]: `${an}`,
    },
    find: `a_${k}`,
    answer: `${ak}`,
    steps: [
      {
        instruction: `Subtract: a_${n} - a_${m} = ${an - am} = (${n} - ${m})d, so d =`,
        reason: "Eliminate a_1",
        blanks: [{ label: "d", answer: `${d}` }],
      },
      {
        instruction: `Back-substitute to find a_1, then compute a_${k}:`,
        reason: "Back-substitution",
        blanks: [
          { label: "a_1", answer: `${a1}` },
          { label: `a_${k}`, answer: `${ak}` },
        ],
      },
    ],
    verify: { kind: "arith", a1, d, m, n, am, an, k, ak },
  };
}

// ── Geometric: explicit ───────────────────────────────────────────────────────

function makeGeometricExplicit(rng: RNG, hard: boolean): Algebra2Problem {
  const a1 = randNonZero(rng, -6, 6);
  const r = hard ? pick(rng, [-3, 3, -2]) : pick(rng, [2, 3, -2]);
  const n = hard ? randInt(rng, 5, 7) : randInt(rng, 4, 6);
  const an = a1 * Math.pow(r, n - 1);
  return {
    type: "A2.S",
    subtype: "GeometricExplicit",
    given: {
      sequence: "geometric",
      firstTerm: `${a1}`,
      commonRatio: `${r}`,
    },
    find: `a_${n}`,
    answer: `${an}`,
    steps: [
      {
        instruction: `Use a_n = a_1 · r^(n-1) with n = ${n}:`,
        reason: "Explicit geometric formula",
        blanks: [{ label: `a_${n}`, answer: `${an}` }],
      },
    ],
    verify: { kind: "geom", a1, r, n, an },
  };
}

// ── Geometric: find r from a_1 and a_n ────────────────────────────────────────

function makeGeometricFindR(rng: RNG): Algebra2Problem {
  const a1 = randNonZero(rng, -5, 5);
  const r = pick(rng, [-3, -2, 2, 3]);
  const n = pick(rng, [3, 4]);
  const an = a1 * Math.pow(r, n - 1);
  return {
    type: "A2.S",
    subtype: "GeometricFindR",
    given: {
      sequence: "geometric",
      firstTerm: `${a1}`,
      [`a_${n}`]: `${an}`,
    },
    find: "r (common ratio)",
    answer: `r = ${r}`,
    steps: [
      {
        instruction: `Write a_${n} = a_1 · r^${n - 1}:`,
        reason: "Explicit geometric formula",
        blanks: [{ label: "equation", answer: `${an} = ${a1} · r^${n - 1}` }],
      },
      {
        instruction: `Solve for r (take the ${n - 1}${n - 1 === 2 ? "nd" : "rd"} root):`,
        reason: "Root extraction",
        blanks: [{ label: "r", answer: `r = ${r}` }],
      },
    ],
    verify: { kind: "geom", a1, r, n, an },
  };
}

// ── Recursive evaluation ──────────────────────────────────────────────────────

function makeRecursive(rng: RNG): Algebra2Problem {
  const isArith = rng() < 0.5;
  const a1 = randSigned(rng, 8);
  const target = 5;
  let ruleStr: string;
  let aPrev = a1;
  let stepVal = 0;
  if (isArith) {
    const d = randNonZero(rng, -6, 6);
    stepVal = d;
    ruleStr = `a_n = a_{n-1} + ${d < 0 ? `(${d})` : d}`;
    for (let i = 2; i <= target; i++) aPrev += d;
  } else {
    const r = pick(rng, [2, 3, -2]);
    stepVal = r;
    ruleStr = `a_n = ${r} · a_{n-1}`;
    for (let i = 2; i <= target; i++) aPrev *= r;
  }
  return {
    type: "A2.S",
    subtype: "Recursive",
    given: {
      firstTerm: `a_1 = ${a1}`,
      rule: ruleStr,
    },
    find: `a_${target}`,
    answer: `${aPrev}`,
    steps: [
      {
        instruction: "Apply the recursive rule repeatedly until the target term:",
        reason: "Recursive evaluation",
        blanks: [
          { label: "a_2", answer: "see work" },
          { label: "a_3", answer: "see work" },
          { label: "a_4", answer: "see work" },
          { label: `a_${target}`, answer: `${aPrev}` },
        ],
      },
    ],
    verify: { kind: isArith ? "arithRec" : "geomRec", a1, target, an: aPrev, step: stepVal, rule: ruleStr },
  };
}

// ── Finite sums ───────────────────────────────────────────────────────────────

function makeFiniteSum(rng: RNG, hard: boolean): Algebra2Problem {
  if (!hard) {
    // Arithmetic series sum
    const a1 = randSigned(rng, 9);
    const d = randNonZero(rng, -6, 6);
    const n = randInt(rng, 8, 15);
    const an = a1 + (n - 1) * d;
    const sum = (n * (a1 + an)) / 2;
    return {
      type: "A2.S",
      subtype: "FiniteSum",
      given: {
        series: "arithmetic",
        firstTerm: `${a1}`,
        commonDifference: `${d}`,
        terms: `${n}`,
      },
      find: `S_${n}`,
      answer: `${sum}`,
      steps: [
        {
          instruction: `Find the last term a_${n} = a_1 + (${n} - 1)d:`,
          reason: "Explicit formula",
          blanks: [{ label: `a_${n}`, answer: `${an}` }],
        },
        {
          instruction: `Apply S_n = n/2 · (a_1 + a_n):`,
          reason: "Arithmetic series sum",
          blanks: [{ label: `S_${n}`, answer: `${sum}` }],
        },
      ],
      verify: { kind: "arithSum", a1, d, n, sum },
    };
  }
  // Geometric series sum
  const a1 = randNonZero(rng, -4, 4);
  const r = pick(rng, [2, 3, -2]);
  const n = randInt(rng, 4, 7);
  const sum = (a1 * (1 - Math.pow(r, n))) / (1 - r);
  return {
    type: "A2.S",
    subtype: "FiniteSum",
    given: {
      series: "geometric",
      firstTerm: `${a1}`,
      commonRatio: `${r}`,
      terms: `${n}`,
    },
    find: `S_${n}`,
    answer: `${sum}`,
    steps: [
      {
        instruction: `Apply S_n = a_1(1 - r^n)/(1 - r):`,
        reason: "Geometric series sum",
        blanks: [{ label: `S_${n}`, answer: `${sum}` }],
      },
    ],
    verify: { kind: "geomSum", a1, r, n, sum },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeArithmeticExplicit },
  { minDifficulty: 1, make: (rng) => makeGeometricExplicit(rng, false) },
  { minDifficulty: 1, make: makeRecursive },
  { minDifficulty: 2, make: makeArithmeticFindN },
  { minDifficulty: 2, make: (rng) => makeGeometricExplicit(rng, true) },
  { minDifficulty: 2, make: makeRecursive },
  { minDifficulty: 2, make: (rng) => makeFiniteSum(rng, false) },
  { minDifficulty: 3, make: makeArithmeticSystem },
  { minDifficulty: 3, make: makeGeometricFindR },
  { minDifficulty: 3, make: (rng) => makeFiniteSum(rng, true) },
];

/** Generate n A2.S (sequences, supplementary) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateSequenceProblems(
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

export const SEQUENCE_MAKERS = MAKERS;

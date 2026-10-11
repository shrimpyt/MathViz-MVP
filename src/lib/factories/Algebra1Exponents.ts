// Algebra1Exponents.ts
// TEKS A.11B (exponent properties), A.11A (simplifying radicals).
// Subtypes: ZeroNegativeExponents, MultiplyPowers, PowerOfPower,
//           DivisionProperties, RationalExponents, SimplifyRadicals.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import { fmtFrac } from "./Algebra1Format";

export const EXPONENT_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["ZeroNegativeExponents", "MultiplyPowers"],
  2: ["ZeroNegativeExponents", "MultiplyPowers", "PowerOfPower", "DivisionProperties"],
  3: ["ZeroNegativeExponents", "MultiplyPowers", "PowerOfPower", "DivisionProperties", "RationalExponents", "SimplifyRadicals"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "ZeroNegativeExponents",
  "MultiplyPowers",
  "PowerOfPower",
  "DivisionProperties",
  "RationalExponents",
  "SimplifyRadicals",
];

// ── Zero & negative exponents ───────────────────────────────────────────────

function makeZeroNegativeExponents(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  if (difficulty === 1 && rng() < 0.5) {
    const base = randInt(rng, 2, 9);
    const prompt = `Evaluate: \\(${base}^{0}\\)`;
    return {
      type: "A.11B",
      subtype: "ZeroNegativeExponents",
      prompt,
      answer: "1",
      steps: [
        {
          instruction: "Any nonzero base to the zero power is 1:",
          reason: "Zero exponent rule",
          blanks: [{ label: "answer", answer: "1" }],
        },
      ],
      meta: { kind: "exponentEval", base, exp: 0 },
    };
  }
  const base = pick(rng, [2, 3, 4, 5, 10] as const);
  const exp = pick(rng, [-3, -2, -1] as const);
  const value = Math.pow(base, exp); // 1 / base^|exp|
  const prompt = `Evaluate: \\(${base}^{${exp}}\\)`;
  const answer = fmtFrac(1, Math.pow(base, -exp));
  return {
    type: "A.11B",
    subtype: "ZeroNegativeExponents",
    prompt,
    answer,
    steps: [
      {
        instruction: "A negative exponent means the reciprocal of the positive power:",
        reason: "Negative exponent rule",
        blanks: [{ label: "reciprocal", answer: `\\frac{1}{${base}^{${-exp}}}` }],
      },
      {
        instruction: "Evaluate the power:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "exponentEval", base, exp },
  };
}

// ── Multiplying powers, same base ───────────────────────────────────────────

function makeMultiplyPowers(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const c1 = difficulty === 1 ? 1 : pick(rng, [2, 3, 4] as const);
  const c2 = difficulty === 1 ? 1 : pick(rng, [2, 3, 5] as const);
  const e1 = randInt(rng, 2, 5);
  const e2 = randInt(rng, 2, 5);
  const cText1 = c1 === 1 ? "" : `${c1}`;
  const cText2 = c2 === 1 ? "" : `${c2}`;
  const prompt = `Simplify: \\(${cText1}x^{${e1}} \\cdot ${cText2}x^{${e2}}\\)`;
  const cAns = c1 * c2;
  const answer = `${cAns === 1 ? "" : cAns}x^{${e1 + e2}}`;
  return {
    type: "A.11B",
    subtype: "MultiplyPowers",
    prompt,
    answer,
    steps: [
      {
        instruction: "Multiply coefficients; add exponents of like bases:",
        reason: "Product of powers rule",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "monomial", c1, e1, c2, e2, op: "mul" },
  };
}

// ── Power of a power ────────────────────────────────────────────────────────

function makePowerOfPower(rng: RNG): Algebra1Problem {
  const c = pick(rng, [2, 3] as const);
  const e = randInt(rng, 2, 4);
  const p = pick(rng, [2, 3] as const);
  const prompt = `Simplify: \\((${c}x^{${e}})^{${p}}\\)`;
  const cAns = Math.pow(c, p);
  const answer = `${cAns}x^{${e * p}}`;
  return {
    type: "A.11B",
    subtype: "PowerOfPower",
    prompt,
    answer,
    steps: [
      {
        instruction: "Apply the power to the coefficient and multiply the exponents:",
        reason: "Power of a power rule",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "monomialPow", c, e, p },
  };
}

// ── Division properties ─────────────────────────────────────────────────────

function makeDivisionProperties(rng: RNG): Algebra1Problem {
  const c1 = pick(rng, [4, 6, 8, 12] as const);
  const c2 = pick(rng, [2, 3, 4] as const);
  // Keep the coefficient division clean.
  const cc1 = c1 % c2 === 0 ? c1 : c1 - (c1 % c2) || c2 * 2;
  const e1 = randInt(rng, 4, 7);
  const e2 = randInt(rng, 1, 3);
  const prompt = `Simplify: \\(\\frac{${cc1}x^{${e1}}}{${c2}x^{${e2}}}\\)`;
  const cAns = cc1 / c2;
  const answer = `${cAns === 1 ? "" : cAns}x^{${e1 - e2}}`;
  return {
    type: "A.11B",
    subtype: "DivisionProperties",
    prompt,
    answer,
    steps: [
      {
        instruction: "Divide coefficients; subtract exponents of like bases:",
        reason: "Quotient of powers rule",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "monomial", c1: cc1, e1, c2, e2, op: "div" },
  };
}

// ── Rational exponents ──────────────────────────────────────────────────────

function makeRationalExponents(rng: RNG): Algebra1Problem {
  // Pick from exact cases: base^(num/den) with integer answers.
  const cases = [
    { base: 8, num: 2, den: 3 },   // 4
    { base: 16, num: 3, den: 4 },  // 8
    { base: 27, num: 2, den: 3 },  // 9
    { base: 25, num: 3, den: 2 },  // 125
    { base: 4, num: 3, den: 2 },   // 8
    { base: 32, num: 2, den: 5 },  // 4
  ] as const;
  const { base, num, den } = pick(rng, cases);
  const value = Math.round(Math.pow(base, num / den));
  const prompt = `Evaluate: \\(${base}^{${num}/${den}}\\)`;
  return {
    type: "A.11B",
    subtype: "RationalExponents",
    prompt,
    answer: `${value}`,
    steps: [
      {
        instruction: `A fractional exponent means root then power: \\(a^{m/n} = (\\sqrt[n]{a})^m\\):`,
        reason: "Rational exponent definition",
        blanks: [{ label: "rewrite", answer: `(\\sqrt[${den}]{${base}})^{${num}}` }],
      },
      {
        instruction: "Evaluate:",
        blanks: [{ label: "answer", answer: `${value}` }],
      },
    ],
    meta: { kind: "rationalExp", base, num, den },
  };
}

// ── Simplifying radicals ────────────────────────────────────────────────────

function makeSimplifyRadicals(rng: RNG): Algebra1Problem {
  const s = pick(rng, [2, 3, 4, 5] as const);
  const k = pick(rng, [2, 3, 5, 6, 7, 10] as const); // squarefree
  const n = s * s * k;
  const prompt = `Simplify: \\(\\sqrt{${n}}\\)`;
  const answer = `${s}\\sqrt{${k}}`;
  return {
    type: "A.11A",
    subtype: "SimplifyRadicals",
    prompt,
    answer,
    steps: [
      {
        instruction: "Factor out the largest perfect square:",
        reason: "Product property of square roots",
        blanks: [{ label: "factor", answer: `\\sqrt{${s * s} \\cdot ${k}}` }],
      },
      {
        instruction: "Take the square root of the perfect square:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "radical", n },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  ZeroNegativeExponents: makeZeroNegativeExponents,
  MultiplyPowers: makeMultiplyPowers,
  PowerOfPower: (rng) => makePowerOfPower(rng),
  DivisionProperties: (rng) => makeDivisionProperties(rng),
  RationalExponents: (rng) => makeRationalExponents(rng),
  SimplifyRadicals: (rng) => makeSimplifyRadicals(rng),
};

export function generateExponentProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...EXPONENT_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

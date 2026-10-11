// Algebra1Sequences.ts
// TEKS A.12D — Arithmetic and geometric sequences.
// Subtypes: ArithmeticSequence, GeometricSequence, SequenceWordProblem.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import { fmtFrac, fmtNum } from "./Algebra1Format";

export const SEQUENCE_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["ArithmeticSequence"],
  2: ["ArithmeticSequence", "GeometricSequence", "RecursiveArithmetic"],
  3: ["ArithmeticSequence", "GeometricSequence", "RecursiveArithmetic", "RecursiveGeometric", "SequenceWordProblem"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "ArithmeticSequence",
  "GeometricSequence",
  "RecursiveArithmetic",
  "RecursiveGeometric",
  "SequenceWordProblem",
];

// ── Arithmetic ──────────────────────────────────────────────────────────────

function makeArithmeticSequence(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a1 = randInt(rng, -8, 12);
  const d = pick(rng, [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6] as const);
  const n = randInt(rng, 8, 20);
  const an = a1 + (n - 1) * d;
  const terms = [a1, a1 + d, a1 + 2 * d, a1 + 3 * d].join(", ");
  const dText = d > 0 ? `+ ${d}` : `- ${-d}`;
  const prompt =
    difficulty === 1
      ? `The arithmetic sequence begins ${terms}, … Find the common difference and the ${n}th term.`
      : `The arithmetic sequence begins ${terms}, … Write the nth-term formula and find the ${n}th term.`;
  const answer = `d = ${d}; a_{n} = ${a1} ${dText}(n - 1); a_{${n}} = ${an}`;
  return {
    type: "A.12D",
    subtype: "ArithmeticSequence",
    prompt,
    answer,
    steps: [
      {
        instruction: "The common difference is the change from term to term:",
        reason: "Definition of arithmetic sequence",
        blanks: [{ label: "d", answer: `d = ${d}` }],
      },
      {
        instruction: "Use \\(a_n = a_1 + d(n - 1)\\):",
        blanks: [{ label: "formula", answer: `a_n = ${a1} ${dText}(n - 1)` }],
      },
      {
        instruction: `Substitute n = ${n}:`,
        blanks: [{ label: "answer", answer: `a_{${n}} = ${an}` }],
      },
    ],
    meta: { kind: "sequence", seqKind: "arithmetic", a1, d, r: 0, n },
  };
}

// ── Geometric ───────────────────────────────────────────────────────────────

function makeGeometricSequence(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a1 = pick(rng, [2, 3, 4, 5, 6] as const);
  const r = difficulty >= 3 && rng() < 0.3
    ? pick(rng, [-2, -3] as const)
    : pick(rng, [2, 3] as const);
  const n = randInt(rng, 4, 7); // keep powers small
  const an = a1 * Math.pow(r, n - 1);
  const terms = [0, 1, 2, 3].map((i) => a1 * Math.pow(r, i)).join(", ");
  const prompt = `The geometric sequence begins ${terms}, … Write the nth-term formula and find the ${n}th term.`;
  const answer = `r = ${r}; a_{n} = ${a1}(${r})^{n-1}; a_{${n}} = ${an}`;
  return {
    type: "A.12D",
    subtype: "GeometricSequence",
    prompt,
    answer,
    steps: [
      {
        instruction: "The common ratio is each term divided by the previous term:",
        reason: "Definition of geometric sequence",
        blanks: [{ label: "r", answer: `r = ${r}` }],
      },
      {
        instruction: "Use \\(a_n = a_1 \\cdot r^{n-1}\\):",
        blanks: [{ label: "formula", answer: `a_n = ${a1}(${r})^{n-1}` }],
      },
      {
        instruction: `Substitute n = ${n}:`,
        blanks: [{ label: "answer", answer: `a_{${n}} = ${an}` }],
      },
    ],
    meta: { kind: "sequence", seqKind: "geometric", a1, d: 0, r, n },
  };
}

// ── Recursive formulas (12C) ────────────────────────────────────────────────

function makeRecursiveSequence(rng: RNG, seqKind: "arithmetic" | "geometric"): Algebra1Problem {
  const a1 = randInt(rng, 2, 10);
  const d = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const r = pick(rng, [2, 3] as const);
  const n = randInt(rng, 4, 6);
  const step = seqKind === "arithmetic" ? d : r;
  // Iterate the recursion independently of any closed form.
  let value = a1;
  for (let i = 2; i <= n; i++) value = seqKind === "arithmetic" ? value + d : value * r;
  const rule = seqKind === "arithmetic" ? `f(n) = f(n-1) + ${d}` : `f(n) = f(n-1) \\cdot ${r}`;
  const prompt =
    `A sequence is defined recursively: \\(f(1) = ${a1}\\), \\(${rule}\\). Find \\(f(${n})\\).`;
  return {
    type: "A.12C",
    subtype: seqKind === "arithmetic" ? "RecursiveArithmetic" : "RecursiveGeometric",
    prompt,
    answer: `f(${n}) = ${value}`,
    steps: [
      {
        instruction: "Apply the recursive rule repeatedly from f(1):",
        reason: "Recursive definition",
        blanks: [{ label: "iterate", answer: `f(2), f(3), … up to f(${n})` }],
      },
      {
        instruction: `The ${n}th term is:`,
        blanks: [{ label: "answer", answer: `f(${n}) = ${value}` }],
      },
    ],
    meta: { kind: "recursive", seqKind, a1, d, r, n },
  };
}

// ── Word problem (tier 3) ───────────────────────────────────────────────────

function makeSequenceWordProblem(rng: RNG): Algebra1Problem {
  if (rng() < 0.5) {
    // Arithmetic: theater rows
    const a1 = randInt(rng, 18, 28);
    const d = pick(rng, [2, 3, 4] as const);
    const n = randInt(rng, 10, 15);
    const an = a1 + (n - 1) * d;
    const prompt =
      `A theater's first row has ${a1} seats, and each row after has ${d} more seats than the row before. How many seats are in row ${n}?`;
    return {
      type: "A.12D",
      subtype: "SequenceWordProblem",
      prompt,
      answer: `${an} seats`,
      steps: [
        {
          instruction: "This is arithmetic with \\(a_1\\) and d identified:",
          blanks: [{ label: "identify", answer: `a_1 = ${a1}, d = ${d}` }],
        },
        {
          instruction: `Apply \\(a_n = a_1 + d(n - 1)\\) with n = ${n}:`,
          blanks: [{ label: "answer", answer: `${an} seats` }],
        },
      ],
      meta: { kind: "sequence", seqKind: "arithmetic", a1, d, r: 0, n },
    };
  }
  // Geometric: bouncing ball
  const a1 = pick(rng, [16, 24, 32] as const);
  const n = randInt(rng, 4, 6);
  const an = a1 / Math.pow(2, n - 1);
  const prompt =
    `A ball is dropped from ${a1} feet and bounces to half its previous height each time. How high does it bounce on the ${n}th bounce?`;
  return {
    type: "A.12D",
    subtype: "SequenceWordProblem",
    prompt,
    answer: `${fmtNum(an)} feet`,
    steps: [
      {
        instruction: "This is geometric with ratio \\(r = \\frac{1}{2}\\):",
        blanks: [{ label: "identify", answer: `a_1 = ${a1}, r = \\frac{1}{2}` }],
      },
      {
        instruction: `Apply \\(a_n = a_1 \\cdot r^{n-1}\\) with n = ${n}:`,
        blanks: [{ label: "answer", answer: `${fmtNum(an)} feet` }],
      },
    ],
    meta: { kind: "sequence", seqKind: "geometric", a1, d: 0, r: 0.5, n },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  ArithmeticSequence: makeArithmeticSequence,
  GeometricSequence: makeGeometricSequence,
  RecursiveArithmetic: (rng) => makeRecursiveSequence(rng, "arithmetic"),
  RecursiveGeometric: (rng) => makeRecursiveSequence(rng, "geometric"),
  SequenceWordProblem: (rng) => makeSequenceWordProblem(rng),
};

export function generateSequenceProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...SEQUENCE_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

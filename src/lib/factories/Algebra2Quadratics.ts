// Algebra2Quadratics.ts
// A2.1 — Advanced quadratics: completing the square, vertex form, complex
// solutions, discriminant analysis, quadratic formula, solving by square root.
// Pure, seeded (mulberry32). Difficulty tiers 1|2|3 are cumulative and live
// in this factory. `verify` carries machine-readable params for independent
// test recomputation (substitute roots back into ax^2+bx+c, etc.).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, polyToLatex, complexToLatex, fracToLatex, reduceFrac, selectMakers } from "./Algebra2Helpers";

export type QuadraticSubtype =
  | "CompleteSquare"
  | "VertexFormula"
  | "SolveByRoot"
  | "Discriminant"
  | "ComplexRoots"
  | "QuadraticFormula";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function stdForm(a: number, b: number, c: number): string {
  return `y = ${polyToLatex([a, b, c])}`;
}

// ── D1: complete the square (monic, b even) ───────────────────────────────────

function makeCompleteSquare(rng: RNG): Algebra2Problem {
  const b = randSigned(rng, 5) * 2; // even
  const c = randInt(rng, -9, 15);
  const half = b / 2;
  const k = c - half * half;
  const inner = half === 0 ? "x" : half > 0 ? `(x + ${half})` : `(x - ${-half})`;
  const vertexForm = `${inner}^2 ${k < 0 ? `- ${-k}` : `+ ${k}`}`;
  const steps: ProblemStep[] = [
    {
      instruction: `Identify a, b, c in ${polyToLatex([1, b, c])}:`,
      reason: "Standard form coefficients",
      blanks: [
        { label: "a", answer: `1` },
        { label: "b", answer: `${b}` },
        { label: "c", answer: `${c}` },
      ],
    },
    {
      instruction: `Take half of b and square it: (${b}/2)^2 =`,
      reason: "Completing the square",
      blanks: [{ label: "(b/2)^2", answer: `${half * half}` }],
    },
    {
      instruction: `Add and subtract ${half * half} inside, then factor the perfect-square trinomial:`,
      reason: "Perfect-square trinomial",
      blanks: [{ label: "vertex form", answer: `y = ${vertexForm}` }],
    },
  ];
  return {
    type: "A2.5",
    subtype: "CompleteSquare",
    given: { equation: stdForm(1, b, c) },
    find: "vertex form",
    answer: `y = ${vertexForm}`,
    steps,
    verify: { a: 1, b, c, h: -half, k },
  };
}

// ── D1: vertex via formula ────────────────────────────────────────────────────

function makeVertexFormula(rng: RNG): Algebra2Problem {
  const b = randSigned(rng, 6) * 2;
  const c = randInt(rng, -8, 12);
  const h = -b / 2;
  const k = c - (b / 2) * (b / 2);
  return {
    type: "A2.5",
    subtype: "VertexFormula",
    given: { equation: stdForm(1, b, c) },
    find: "vertex",
    answer: `(${h}, ${k})`,
    steps: [
      {
        instruction: "The x-coordinate of the vertex is h = -b / 2a:",
        reason: "Vertex formula h = -b/2a",
        blanks: [
          { label: "h = -b/2a", answer: `h = ${h}` },
        ],
      },
      {
        instruction: `Evaluate the function at x = ${h} to find k:`,
        reason: "Function evaluation",
        blanks: [{ label: "k", answer: `k = ${k}` }],
      },
    ],
    verify: { a: 1, b, c, h, k },
  };
}

// ── D1/D2: solve (x - h)^2 = k ────────────────────────────────────────────────

function makeSolveByRoot(rng: RNG, allowComplex: boolean): Algebra2Problem {
  const h = randSigned(rng, 6);
  const s = randInt(rng, 2, 6);
  const negative = allowComplex && rng() < 0.5;
  const k = negative ? -s * s : s * s;
  const answer = negative
    ? `x = ${h} \\pm ${s === 1 ? "" : s}i`
    : `x = ${h} \\pm ${s}`;
  return {
    type: "A2.5",
    subtype: "SolveByRoot",
    given: { equation: `(x ${h < 0 ? "+" : "-"} ${Math.abs(h)})^2 = ${k}` },
    find: "x",
    answer,
    steps: [
      {
        instruction: "Take the square root of both sides (remember ±):",
        reason: "Square root property",
        blanks: [
          { label: "x - h = ±√k", answer: `x ${h < 0 ? "+" : "-"} ${Math.abs(h)} = \\pm ${negative ? `${s}i` : `${s}`}` },
        ],
      },
      {
        instruction: `Solve for x:`,
        reason: "Isolate x",
        blanks: [{ label: "solutions", answer }],
      },
    ],
    verify: { h, k, negative },
  };
}

// ── D2: discriminant nature ───────────────────────────────────────────────────

function makeDiscriminant(rng: RNG, hard: boolean): Algebra2Problem {
  // Construct discriminant sign deliberately.
  const kind = pick(rng, ["pos", "zero", "neg"] as const);
  const a = hard ? randSigned(rng, 3) : 1;
  const b = randSigned(rng, 8);
  let c: number;
  if (kind === "zero") {
    // need b^2 = 4ac -> pick a,c with 4ac a perfect square equal b^2; simpler: c = b^2/(4a)
    const bb = b * b;
    const denom = 4 * a;
    c = bb % denom === 0 ? bb / denom : Math.round(bb / denom);
    // recompute actual kind from rounded c (may flip) — then report truthfully
  } else {
    c = randInt(rng, -10, 14);
  }
  const D = b * b - 4 * a * c;
  const nature = D > 0 ? "two real solutions" : D === 0 ? "one real solution" : "two complex solutions";
  return {
    type: "A2.5",
    subtype: "Discriminant",
    given: { equation: `${polyToLatex([a, b, c])} = 0` },
    find: "discriminant and nature of solutions",
    answer: `D = ${D}; ${nature}`,
    steps: [
      {
        instruction: "Compute the discriminant D = b^2 - 4ac:",
        reason: "Discriminant formula",
        blanks: [
          { label: "D", answer: `${D}` },
        ],
      },
      {
        instruction: "Classify: D > 0 → two real; D = 0 → one real; D < 0 → two complex:",
        reason: "Nature of solutions",
        blanks: [{ label: "nature", answer: nature }],
      },
    ],
    verify: { a, b, c, D },
  };
}

// ── D2/D3: complex solutions with clean a±bi ──────────────────────────────────

function makeComplexRoots(rng: RNG): Algebra2Problem {
  const b = randSigned(rng, 5) * 2; // even → integer real part
  const kk = randInt(rng, 1, 5); // imaginary magnitude
  const re = -b / 2;
  // D = b^2 - 4c = -4k^2  →  c = (b^2 + 4k^2)/4
  const c = (b * b + 4 * kk * kk) / 4;
  const answer = `x = ${complexToLatex(re, kk)} or x = ${complexToLatex(re, -kk)}`;
  return {
    type: "A2.5",
    subtype: "ComplexRoots",
    given: { equation: `${polyToLatex([1, b, c])} = 0` },
    find: "x (complex solutions)",
    answer,
    steps: [
      {
        instruction: "Compute the discriminant D = b^2 - 4ac:",
        reason: "Discriminant formula",
        blanks: [{ label: "D", answer: `${-4 * kk * kk}` }],
      },
      {
        instruction: "D < 0, so apply the quadratic formula with √D = √(-4k²) = 2ki:",
        reason: "Quadratic formula (complex case)",
        blanks: [
          { label: "x = (-b ± 2ki)/2", answer },
        ],
      },
    ],
    verify: { a: 1, b, c, re, im: kk },
  };
}

// ── D2/D3: quadratic formula, constructed from integer roots ───────────────────

function makeQuadraticFormula(rng: RNG, hard: boolean): Algebra2Problem {
  const a = hard ? randSigned(rng, 3) : 1;
  let r1 = randSigned(rng, 6);
  let r2 = randSigned(rng, 6);
  if (r1 === r2) r2 = r1 + 3;
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  const lo = Math.min(r1, r2);
  const hi = Math.max(r1, r2);
  return {
    type: "A2.5",
    subtype: "QuadraticFormula",
    given: { equation: `${polyToLatex([a, b, c])} = 0` },
    find: "x",
    answer: `x = ${lo} or x = ${hi}`,
    steps: [
      {
        instruction: "Identify a, b, c and substitute into x = (-b ± √(b²-4ac)) / 2a:",
        reason: "Quadratic formula",
        blanks: [
          { label: "a, b, c", answer: `a = ${a}, b = ${b}, c = ${c}` },
        ],
      },
      {
        instruction: "Simplify the discriminant and the roots:",
        reason: "Simplify radicals",
        blanks: [
          { label: "D", answer: `${b * b - 4 * a * c}` },
          { label: "solutions", answer: `x = ${lo} or x = ${hi}` },
        ],
      },
    ],
    verify: { a, b, c, r1: lo, r2: hi },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeCompleteSquare },
  { minDifficulty: 1, make: makeVertexFormula },
  { minDifficulty: 1, make: (rng) => makeSolveByRoot(rng, false) },
  { minDifficulty: 2, make: (rng) => makeSolveByRoot(rng, true) },
  { minDifficulty: 2, make: (rng) => makeDiscriminant(rng, false) },
  { minDifficulty: 2, make: makeComplexRoots },
  { minDifficulty: 2, make: (rng) => makeQuadraticFormula(rng, false) },
  {
    minDifficulty: 3,
    // leading coefficient 2 or 3, b a multiple of a → clean arithmetic
    make: (rng) => makeCompleteSquareFixed(rng, pick(rng, [2, 3])),
  },
  { minDifficulty: 3, make: (rng) => makeDiscriminant(rng, true) },
  { minDifficulty: 3, make: (rng) => makeQuadraticFormula(rng, true) },
];

/** Fix makeCompleteSquare for leading != 1: b must be a multiple of a. */
function makeCompleteSquareFixed(rng: RNG, a: number): Algebra2Problem {
  const b = randSigned(rng, 4) * a; // multiple of a → clean (b/a)/2
  const c = randInt(rng, -6, 10);
  const p = makeCompleteSquarePatched(a, b, c);
  return p;
}

function makeCompleteSquarePatched(a: number, b: number, c: number): Algebra2Problem {
  // Exact fractions: h = -b/(2a), kk = (4ac - b^2)/(4a). All integer math.
  const [hNum, hDen] = reduceFrac(-b, 2 * a);
  const [kNum, kDen] = reduceFrac(4 * a * c - b * b, 4 * a);
  const hStr = hDen === 1 ? `${hNum}` : `${hNum}/${hDen}`;
  const hAbs = hDen === 1 ? `${Math.abs(hNum)}` : `${Math.abs(hNum)}/${hDen}`;
  const kAbs = kDen === 1 ? `${Math.abs(kNum)}` : `${Math.abs(kNum)}/${kDen}`;
  const inner = hNum === 0 ? "x" : hNum > 0 ? `(x - ${hStr})` : `(x + ${hAbs})`;
  const vertexForm = `${a}${inner}^2 ${kNum < 0 ? `- ${kAbs}` : `+ ${kAbs}`}`;
  return {
    type: "A2.5",
    subtype: "CompleteSquare",
    given: { equation: stdForm(a, b, c) },
    find: "vertex form",
    answer: `y = ${vertexForm}`,
    steps: [
      {
        instruction: `Factor ${a} out of the x-terms: y = ${a}(x^2 ${b < 0 ? "-" : "+"} ${fracToLatex(Math.abs(b), a)}x) + ${c}`,
        reason: "Factor out leading coefficient",
        blanks: [{ label: "factored", answer: `y = ${a}(x^2 ${b < 0 ? "-" : "+"} ${fracToLatex(Math.abs(b), a)}x) + ${c}` }],
      },
      {
        instruction: `Complete the square inside the parentheses:`,
        reason: "Completing the square",
        blanks: [{ label: "vertex form", answer: `y = ${vertexForm}` }],
      },
    ],
    verify: { a, b, c, hNum, hDen, kNum, kDen },
  };
}

/** Generate n A2.5 (T5 quadratics) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateQuadraticProblems(
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

export const QUADRATIC_MAKERS = MAKERS;

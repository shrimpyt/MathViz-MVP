// Algebra1Polynomials.ts
// TEKS A.9A (add/subtract), A.10B (multiply incl. FOIL), A.10E (factoring).
// Subtypes: PolyAddSub, FOIL, PolyMultiply,
//           FactorGCF, FactorTrinomial, FactorDifferenceSquares.
//
// Generation strategy: build the factored/operand forms FIRST, then derive
// the expanded polynomial — so factored forms always multiply out exactly.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import {
  fmtPoly,
  fmtLinear,
  fmtFactored,
  polyAdd,
  polySub,
  polyMul,
} from "./Algebra1Format";

export const POLY_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["PolyAddSub", "FOIL", "FactorTrinomialBasic"],
  2: ["PolyAddSub", "FOIL", "FactorGCF", "FactorTrinomialBasic", "FactorTrinomialAC"],
  3: ["PolyAddSub", "FOIL", "PolyMultiply", "FactorGCF", "FactorTrinomialBasic", "FactorTrinomialAC", "FactorDifferenceSquares", "FactorByGrouping", "SimplifyRationalExpression"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "PolyAddSub",
  "FactorGCF",
  "FOIL",
  "PolyMultiply",
  "FactorTrinomialBasic",
  "FactorTrinomialAC",
  "FactorDifferenceSquares",
  "FactorByGrouping",
  "SimplifyRationalExpression",
];

/** Random nonzero coefficient in a small range. */
function nz(rng: RNG, lo: number, hi: number): number {
  let v = 0;
  while (v === 0) v = randInt(rng, lo, hi);
  return v;
}

// ── Add / subtract polynomials ──────────────────────────────────────────────

function makePolyAddSub(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const degree = difficulty >= 3 && rng() < 0.5 ? 2 : 1;
  const p: number[] = [];
  const q: number[] = [];
  for (let i = 0; i <= degree; i++) {
    p.push(randInt(rng, -5, 5));
    q.push(randInt(rng, -5, 5));
  }
  p[degree] = nz(rng, -4, 4);
  q[degree] = nz(rng, -4, 4);
  const sub = rng() < 0.5;
  const result = sub ? polySub(p, q) : polyAdd(p, q);
  const op = sub ? "-" : "+";
  const prompt = `Simplify: \\((${fmtPoly(p)}) ${op} (${fmtPoly(q)})\\)`;
  const answer = fmtPoly(result);
  // Show the distributed form for subtraction: append −q's terms to p.
  const negQ = q.map((v) => -v);
  const distributed = sub
    ? `${fmtPoly(p)}${appendTerms(negQ)}`
    : fmtPoly(polyAdd(p, q));
  return {
    type: "A.10A",
    subtype: "PolyAddSub",
    prompt,
    answer,
    steps: [
      {
        instruction: sub
          ? "Distribute the negative sign through the second polynomial:"
          : "Remove the parentheses (addition changes nothing):",
        reason: "Distributive Property",
        blanks: [{ label: "combined", answer: distributed }],
      },
      {
        instruction: "Combine like terms:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "poly", p, q, op: sub ? "sub" : "add" },
  };
}

/** Render extra terms to append, e.g. [-1, 4, -5] → " - x^{2} + 4x - 5". */
function appendTerms(coeffs: number[]): string {
  const parts: string[] = [];
  for (let pw = coeffs.length - 1; pw >= 0; pw--) {
    const c = coeffs[pw];
    if (c === 0) continue;
    const abs = Math.abs(c);
    const body = pw === 0 ? `${abs}` : pw === 1 ? (abs === 1 ? "x" : `${abs}x`) : abs === 1 ? `x^{${pw}}` : `${abs}x^{${pw}}`;
    parts.push(c > 0 ? `+ ${body}` : `- ${body}`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

// ── FOIL: (ax + b)(cx + d) ───────────────────────────────────────────────────

function makeFOIL(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a = nz(rng, 1, 4);
  const c = nz(rng, 1, 4);
  const b = difficulty === 1 ? randInt(rng, 1, 6) : randInt(rng, -6, 6);
  const d = difficulty === 1 ? randInt(rng, 1, 6) : randInt(rng, -6, 6);
  const p = [b, a];
  const q = [d, c];
  const product = polyMul(p, q);
  const prompt = `Multiply using FOIL: \\(${fmtFactored([fmtLinear(a, b), fmtLinear(c, d)])}\\)`;
  const answer = fmtPoly(product);
  return {
    type: "A.10B",
    subtype: "FOIL",
    prompt,
    answer,
    steps: [
      {
        instruction: "FOIL — First, Outer, Inner, Last:",
        reason: "Distributive Property (twice)",
        blanks: [
          {
            label: "FOIL",
            answer: `${fmtPoly([0, 0, a * c])} + ${fmtPoly([0, a * d])} + ${fmtPoly([0, b * c])} + ${fmtPoly([b * d])}`,
          },
        ],
      },
      {
        instruction: "Combine like terms:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "poly", p, q, op: "mul" },
  };
}

// ── Multiply binomial × trinomial (tier 3) ───────────────────────────────────

function makePolyMultiply(rng: RNG): Algebra1Problem {
  const p = [randInt(rng, -4, 4), nz(rng, 1, 3)]; // ax + b
  const q = [randInt(rng, -4, 4), randInt(rng, -4, 4), nz(rng, 1, 3)]; // cx² + dx + e
  const product = polyMul(p, q);
  const prompt = `Multiply: \\((${fmtPoly(p)})(${fmtPoly(q)})\\)`;
  const answer = fmtPoly(product);
  return {
    type: "A.10B",
    subtype: "PolyMultiply",
    prompt,
    answer,
    steps: [
      {
        instruction: "Distribute each term of the binomial across the trinomial:",
        reason: "Distributive Property",
        blanks: [{ label: "distributed", answer: fmtPoly(product) }],
      },
      {
        instruction: "Combine like terms:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "poly", p, q, op: "mul" },
  };
}

// ── Factor out the GCF ───────────────────────────────────────────────────────

function makeFactorGCF(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const k = pick(rng, [2, 3, 4, 5] as const);
  const power: number = difficulty >= 2 && rng() < 0.5 ? 2 : 1; // GCF = kx or kx²
  const inner: number[] = [nz(rng, -6, 6), nz(rng, -6, 6)];
  if (difficulty >= 2 && rng() < 0.5) inner.push(nz(rng, -4, 4));
  const gcfCoeffs = new Array(power + 1).fill(0);
  gcfCoeffs[power] = k;
  const poly = polyMul(gcfCoeffs, inner);
  const gcfText = power === 0 ? `${k}` : power === 1 ? `${k}x` : `${k}x^{${power}}`;
  const prompt = `Factor out the greatest common factor: \\(${fmtPoly(poly)}\\)`;
  const answer = `${gcfText}(${fmtPoly(inner)})`;
  return {
    type: "A.10D",
    subtype: "FactorGCF",
    prompt: `Factor out the greatest common factor: \\(${fmtPoly(poly)}\\)`,
    answer,
    steps: [
      {
        instruction: "Identify the GCF of all terms:",
        reason: "Greatest common factor",
        blanks: [{ label: "GCF", answer: gcfText }],
      },
      {
        instruction: "Divide each term by the GCF:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "factored", poly, factors: [gcfCoeffs, inner] },
  };
}

// ── Factor trinomials ────────────────────────────────────────────────────────

function makeFactorTrinomial(rng: RNG, difficulty: DifficultyLevel, ac: boolean): Algebra1Problem {
  const perfectSquare = difficulty >= 3 && rng() < 0.35;
  let f1: number[];
  let f2: number[];
  if (!ac) {
    // x² + bx + c = (x + r1)(x + r2)
    const r1 = randInt(rng, -6, 6) || 2;
    const r2 = randInt(rng, -6, 6) || -3;
    f1 = [r1, 1];
    f2 = [r2, 1];
  } else if (perfectSquare) {
    // (ax + b)²
    const a = nz(rng, 1, 3);
    const b = nz(rng, -5, 5);
    f1 = [b, a];
    f2 = [b, a];
  } else {
    // (a1x + b1)(a2x + b2)
    const a1 = nz(rng, 1, 3);
    const a2 = nz(rng, 1, 3);
    const b1 = nz(rng, -6, 6);
    const b2 = nz(rng, -6, 6);
    f1 = [b1, a1];
    f2 = [b2, a2];
  }
  const poly = polyMul(f1, f2);
  const prompt = `Factor completely: \\(${fmtPoly(poly)}\\)`;
  const answer = fmtFactored([fmtLinear(f1[1], f1[0]), fmtLinear(f2[1], f2[0])]);
  return {
    type: "A.10E",
    subtype: ac ? "FactorTrinomialAC" : "FactorTrinomialBasic",
    prompt,
    answer,
    steps: [
      {
        instruction: "Find two binomials whose product is the trinomial (check: FOIL them):",
        reason: "Factoring reverses multiplication",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "factored", poly, factors: [f1, f2] },
  };
}

// ── Difference of squares ───────────────────────────────────────────────────

function makeFactorDifferenceSquares(rng: RNG): Algebra1Problem {
  const p = pick(rng, [2, 3, 4, 5] as const);
  const q = pick(rng, [1, 2, 3, 4, 5, 6] as const);
  const f1 = [-q, p];
  const f2 = [q, p];
  const poly = polyMul(f1, f2); // p²x² − q²
  const prompt = `Factor completely: \\(${fmtPoly(poly)}\\)`;
  const answer = fmtFactored([fmtLinear(p, -q), fmtLinear(p, q)]);
  return {
    type: "A.10F",
    subtype: "FactorDifferenceSquares",
    prompt,
    answer,
    steps: [
      {
        instruction: "Recognize the difference of two squares: \\(a^2 - b^2 = (a - b)(a + b)\\):",
        reason: "Difference of squares pattern",
        blanks: [
          { label: "squares", answer: `(${fmtPoly([0, p])})^2 - (${q})^2` },
        ],
      },
      {
        instruction: "Apply the pattern:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "factored", poly, factors: [f1, f2] },
  };
}

// ── Factor by grouping: (x² + a)(x + b) = x³ + bx² + ax + ab ───────────────

function makeFactorByGrouping(rng: RNG): Algebra1Problem {
  const a = pick(rng, [2, 3, 4, 5, 6, 8] as const);
  const b = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const f1 = [a, 0, 1]; // x² + a
  const f2 = [b, 1]; // x + b
  const poly = polyMul(f1, f2);
  const prompt = `Factor by grouping: \\(${fmtPoly(poly)}\\)`;
  const answer = fmtFactored([fmtPoly(f1), fmtLinear(1, b)]);
  return {
    type: "A.10B",
    subtype: "FactorByGrouping",
    prompt,
    answer,
    steps: [
      {
        instruction: "Group the terms in pairs and factor each pair:",
        reason: "Factor by grouping",
        blanks: [
          {
            label: "groups",
            answer: `x^2(x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}) + ${a}(x ${b >= 0 ? "+" : "-"} ${Math.abs(b)})`,
          },
        ],
      },
      {
        instruction: "Factor out the common binomial:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "grouping", a, b },
  };
}

// ── Simplify a rational expression ───────────────────────────────────────────

function makeSimplifyRationalExpression(rng: RNG): Algebra1Problem {
  const r1 = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  let r2 = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
  if (r2 === r1) r2 += 2;
  const num = polyMul([-r1, 1], [-r2, 1]); // (x − r1)(x − r2)
  const prompt = `Simplify: \\(\\frac{${fmtPoly(num)}}{${fmtLinear(1, -r1)}}\\), state the restriction.`;
  const answer = `${fmtLinear(1, -r2)}, \\quad x \\neq ${r1}`;
  return {
    type: "A.10D",
    subtype: "SimplifyRationalExpression",
    prompt,
    answer,
    steps: [
      {
        instruction: "Factor the numerator:",
        reason: "Factoring reverses multiplication",
        blanks: [{ label: "factored", answer: `\\frac{${fmtFactored([fmtLinear(1, -r1), fmtLinear(1, -r2)])}}{${fmtLinear(1, -r1)}}` }],
      },
      {
        instruction: "Cancel the common factor (noting where the original is undefined):",
        reason: "Common factors cancel",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "rationalSimplify", r1, r2 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  PolyAddSub: makePolyAddSub,
  FactorGCF: makeFactorGCF,
  FOIL: makeFOIL,
  PolyMultiply: (rng) => makePolyMultiply(rng),
  FactorTrinomialBasic: (rng, difficulty) => makeFactorTrinomial(rng, difficulty, false),
  FactorTrinomialAC: (rng, difficulty) => makeFactorTrinomial(rng, difficulty, true),
  FactorDifferenceSquares: (rng) => makeFactorDifferenceSquares(rng),
  FactorByGrouping: (rng) => makeFactorByGrouping(rng),
  SimplifyRationalExpression: (rng) => makeSimplifyRationalExpression(rng),
};

export function generatePolynomialProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...POLY_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

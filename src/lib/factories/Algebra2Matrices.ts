// Algebra2Matrices.ts
// T4 (TEKS A2.4) — Matrices: addition/subtraction, multiplication,
// determinants & inverses (2x2), solving linear systems with matrices.
// Entries are small integers; inverses are constructed with determinant ±1
// so they stay exact. Tests recompute every result with independent code.

import type { RNG } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, randNonZero, selectMakers } from "./Algebra2Helpers";

export type MatrixSubtype =
  | "MatrixAddSub"
  | "MatrixMultiply"
  | "MatrixDetInverse"
  | "MatrixSolveSystem";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

/** Matrix → "[a, b; c, d]" display. */
function matLatex(m: number[][]): string {
  return `[${m.map((row) => row.join(", ")).join("; ")}]`;
}

function randomMatrix(rng: RNG, rows: number, cols: number, max: number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randSigned(rng, max))
  );
}

function matAddSub(a: number[][], b: number[][], op: 1 | -1): number[][] {
  return a.map((row, i) => row.map((v, j) => v + op * b[i][j]));
}

function matMul(a: number[][], b: number[][]): number[][] {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => {
      let s = 0;
      for (let k = 0; k < inner; k++) s += a[i][k] * b[k][j];
      return s;
    })
  );
}

// ── Add / subtract ────────────────────────────────────────────────────────────

function makeAddSub(rng: RNG, level: 1 | 2 | 3): Algebra2Problem {
  const [rows, cols] = level === 1 ? [2, 2] : level === 2 ? [2, 3] : [3, 3];
  const A = randomMatrix(rng, rows, cols, 5);
  const B = randomMatrix(rng, rows, cols, 5);
  const op = rng() < 0.5 ? 1 : -1;
  const C = matAddSub(A, B, op);
  const opStr = op === 1 ? "+" : "-";
  return {
    type: "A2.4",
    subtype: "MatrixAddSub",
    given: { A: matLatex(A), B: matLatex(B), operation: `A ${opStr} B` },
    find: `A ${opStr} B`,
    answer: matLatex(C),
    steps: [
      {
        instruction: `Add (or subtract) corresponding entries of A and B:`,
        reason: "Matrix addition is entrywise",
        blanks: [{ label: "result", answer: matLatex(C) }],
      },
    ],
    verify: { A: A.flat(), B: B.flat(), op, rows, cols, C: C.flat() },
  };
}

// ── Multiply ──────────────────────────────────────────────────────────────────

function makeMultiply(rng: RNG, level: 1 | 2 | 3): Algebra2Problem {
  const max = level === 1 ? 2 : 3;
  const A = randomMatrix(rng, 2, 2, max);
  const B = randomMatrix(rng, 2, 2, max);
  let Adims: number[][] = A, Bdims: number[][] = B;
  if (level === 3) {
    Adims = randomMatrix(rng, 2, 3, 3);
    Bdims = randomMatrix(rng, 3, 2, 3);
  }
  const C = matMul(Adims, Bdims);
  const dims = level === 3 ? "(2×3)(3×2)" : "(2×2)(2×2)";
  return {
    type: "A2.4",
    subtype: "MatrixMultiply",
    given: { A: matLatex(Adims), B: matLatex(Bdims), operation: "A · B" },
    find: "A · B",
    answer: matLatex(C),
    steps: [
      {
        instruction: `Check dimensions: ${dims} → the product is ${C.length}×${C[0].length}:`,
        reason: "Inner dimensions must match",
        blanks: [{ label: "dimensions", answer: `${C.length}×${C[0].length}` }],
      },
      {
        instruction: "Each entry is the dot product of a row of A with a column of B:",
        reason: "Row-by-column dot products",
        blanks: [{ label: "product", answer: matLatex(C) }],
      },
    ],
    verify: { A: Adims.flat(), B: Bdims.flat(), aRows: Adims.length, aCols: Adims[0].length, bCols: Bdims[0].length, C: C.flat() },
  };
}

// ── Determinant & inverse (2x2) ───────────────────────────────────────────────

function makeDetInverse(rng: RNG, inverse: boolean): Algebra2Problem {
  // det = ad - bc. For inverses, force det = ±1 for exact entries.
  let a = 0, b = 0, c = 0, d = 0, det = 0;
  if (!inverse) {
    a = randSigned(rng, 5); b = randSigned(rng, 5);
    c = randSigned(rng, 5); d = randSigned(rng, 5);
    det = a * d - b * c;
  } else {
    for (let tries = 0; tries < 100; tries++) {
      a = randNonZero(rng, -3, 3); b = randSigned(rng, 3); c = randSigned(rng, 3);
      // need d with a*d - b*c = ±1 → d = (±1 + b*c)/a
      const num = 1 + b * c;
      if (num % a === 0) { d = num / a; det = 1; break; }
      const num2 = -1 + b * c;
      if (num2 % a === 0) { d = num2 / a; det = -1; break; }
    }
    if (det === 0) { a = 2; b = 1; c = 1; d = 1; det = 1; } // fallback
  }
  const M = [[a, b], [c, d]];
  const inv = [[d / det, -b / det], [-c / det, a / det]];
  return {
    type: "A2.4",
    subtype: "MatrixDetInverse",
    given: { M: matLatex(M) },
    find: inverse ? "inverse of M" : "determinant of M",
    answer: inverse ? matLatex(inv) : `${det}`,
    steps: inverse
      ? [
          {
            instruction: `Compute det(M) = ad - bc = (${a})(${d}) - (${b})(${c}):`,
            reason: "2x2 determinant formula",
            blanks: [{ label: "det", answer: `${det}` }],
          },
          {
            instruction: "Apply M^-1 = (1/det) · [d, -b; -c, a]:",
            reason: "2x2 inverse formula",
            blanks: [{ label: "inverse", answer: matLatex(inv) }],
          },
        ]
      : [
          {
            instruction: `Apply det = ad - bc = (${a})(${d}) - (${b})(${c}):`,
            reason: "2x2 determinant formula",
            blanks: [{ label: "determinant", answer: `${det}` }],
          },
        ],
    verify: { M: [a, b, c, d], det, inv: inverse ? inv.flat() : [] },
  };
}

// ── Solve a 2x2 system with matrices ──────────────────────────────────────────

function makeSolveSystem(rng: RNG): Algebra2Problem {
  // A with det ±1, integer solution (x0, y0) → rhs = A·sol.
  let a = 2, b = 1, c = 1, d = 1, det = 1;
  for (let tries = 0; tries < 100; tries++) {
    a = randNonZero(rng, -3, 3); b = randSigned(rng, 3); c = randSigned(rng, 3);
    const num = 1 + b * c;
    if (num % a === 0) { d = num / a; det = 1; break; }
    const num2 = -1 + b * c;
    if (num2 % a === 0) { d = num2 / a; det = -1; break; }
  }
  const x0 = randSigned(rng, 5);
  const y0 = randSigned(rng, 5);
  const r1 = a * x0 + b * y0;
  const r2 = c * x0 + d * y0;
  const eq = (p: number, q: number, r: number) => {
    const xs = p === 1 ? "x" : p === -1 ? "-x" : `${p}x`;
    const ys = q === 0 ? "" : ` ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "y" : `${Math.abs(q)}y`}`;
    return `${xs}${ys} = ${r}`;
  };
  return {
    type: "A2.4",
    subtype: "MatrixSolveSystem",
    given: {
      system: `${eq(a, b, r1)}; ${eq(c, d, r2)}`,
      method: "inverse matrices (X = A^-1 · B)",
    },
    find: "(x, y)",
    answer: `(${x0}, ${y0})`,
    steps: [
      {
        instruction: `Write the system as A·X = B with A = ${matLatex([[a, b], [c, d]])}:`,
        reason: "Coefficient matrix",
        blanks: [{ label: "det(A)", answer: `${det}` }],
      },
      {
        instruction: `Compute X = A^-1 · B = (1/${det})[${d}, ${-b}; ${-c}, ${a}] · [${r1}; ${r2}]:`,
        reason: "Multiply inverse by constant vector",
        blanks: [{ label: "solution", answer: `(${x0}, ${y0})` }],
      },
    ],
    verify: { A: [a, b, c, d], rhs: [r1, r2], sol: [x0, y0], det },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeAddSub(rng, 1) },
  { minDifficulty: 1, make: (rng) => makeMultiply(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeAddSub(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeMultiply(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeDetInverse(rng, false) },
  { minDifficulty: 3, make: (rng) => makeAddSub(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeMultiply(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeDetInverse(rng, true) },
  { minDifficulty: 3, make: makeSolveSystem },
];

/**
 * Generate n matrix problems at the given cumulative difficulty tier.
 * `only` optionally restricts to the named subtypes (lesson wiring).
 */
export function generateMatrixProblems(
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

export const MATRIX_MAKERS = MAKERS;

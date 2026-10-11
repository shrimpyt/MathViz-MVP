// Algebra1Systems.ts
// TEKS A.5C — Systems of two linear equations.
// Subtypes: SystemGraphing, SystemSubstitution, SystemElimination,
//           SystemWordProblem, SystemSpecialCase.
//
// Generation strategy: pick the integer solution FIRST, then choose
// coefficients with a nonzero determinant — consistency is guaranteed.
// Degenerate cases (parallel / coincident) are generated ONLY by
// makeSystemSpecialCase (tier 3) and are keyed in meta.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import { fmtLinear, fmtPoint } from "./Algebra1Format";

export const SYSTEM_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["SystemGraphing"],
  2: ["SystemGraphing", "SystemSubstitution", "LinearInequality"],
  3: ["SystemGraphing", "SystemSubstitution", "SystemElimination", "SystemWordProblem", "SystemSpecialCase", "LinearInequality", "SystemOfInequalities"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "SystemGraphing",
  "SystemSubstitution",
  "SystemElimination",
  "SystemWordProblem",
  "SystemSpecialCase",
  "LinearInequality",
  "SystemOfInequalities",
];

function fmtSysEq(a: number, b: number, c: number): string {
  const lhs = b === 0 ? fmtLinear(a, 0) : `${fmtLinear(a, 0)}${b > 0 ? " + " : " - "}${Math.abs(b)}y`;
  return `${lhs} = ${c}`;
}

interface SysCoeffs {
  a1: number; b1: number; c1: number;
  a2: number; b2: number; c2: number;
}

/** Pick coefficients with a guaranteed nonzero determinant. */
function consistentSystem(rng: RNG, x0: number, y0: number): SysCoeffs {
  for (let attempt = 0; attempt < 50; attempt++) {
    const a1 = randInt(rng, -4, 4);
    const b1 = randInt(rng, -4, 4);
    const a2 = randInt(rng, -4, 4);
    const b2 = randInt(rng, -4, 4);
    if (a1 === 0 && b1 === 0) continue;
    if (a2 === 0 && b2 === 0) continue;
    const det = a1 * b2 - a2 * b1;
    if (det === 0) continue;
    return { a1, b1, c1: a1 * x0 + b1 * y0, a2, b2, c2: a2 * x0 + b2 * y0 };
  }
  // Fallback: a simple known-good system
  return { a1: 1, b1: 1, c1: x0 + y0, a2: 1, b2: -1, c2: x0 - y0 };
}

function systemSteps(method: string, x0: number, y0: number): Algebra1Problem["steps"] {
  return [
    { instruction: `${method}:` },
    {
      instruction: "Solve the resulting one-variable equation, then back-substitute:",
        reason: "Equivalent systems have the same solution",
      blanks: [{ label: "answer", answer: fmtPoint(x0, y0) }],
    },
  ];
}

// ── Graphing ────────────────────────────────────────────────────────────────

function makeSystemGraphing(rng: RNG): Algebra1Problem {
  const x0 = randInt(rng, -5, 5);
  const y0 = randInt(rng, -5, 5);
  // Need b1, b2 ≠ 0 so both lines can be graphed as y = mx + b.
  let s = consistentSystem(rng, x0, y0);
  let guard = 0;
  while ((s.b1 === 0 || s.b2 === 0) && guard++ < 30) s = consistentSystem(rng, x0, y0);
  if (s.b1 === 0) s.b1 = 1, s.c1 = s.a1 * x0 + s.b1 * y0;
  if (s.b2 === 0) s.b2 = -1, s.c2 = s.a2 * x0 + s.b2 * y0;
  const m1 = -s.a1 / s.b1;
  const bb1 = s.c1 / s.b1;
  const m2 = -s.a2 / s.b2;
  const bb2 = s.c2 / s.b2;
  const prompt =
    `Solve by graphing: \\(\\begin{cases} ${fmtSysEq(s.a1, s.b1, s.c1)} \\\\ ${fmtSysEq(s.a2, s.b2, s.c2)} \\end{cases}\\)`;
  return {
    type: "A.3F",
    subtype: "SystemGraphing",
    prompt,
    answer: fmtPoint(x0, y0),
    steps: [
      {
        instruction: "Graph both lines on the same coordinate plane.",
        reason: "The solution satisfies both equations",
      },
      {
        instruction: "The solution is the intersection point:",
        reason: "Intersection point satisfies both equations",
        blanks: [{ label: "answer", answer: fmtPoint(x0,  y0) }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [
        { fn: "line", m: m1, b: bb1, color: "#1d4ed8" },
        { fn: "line", m: m2, b: bb2, color: "#059669" },
      ],
      solution: { x: x0, y: y0 },
      xRange: [x0 - 6, x0 + 6],
    },
    meta: { kind: "system", ...s, degenerate: "none" },
  };
}

// ── Substitution (one equation given solved for y) ──────────────────────────

function makeSystemSubstitution(rng: RNG): Algebra1Problem {
  const x0 = randInt(rng, -5, 5);
  const y0 = randInt(rng, -5, 5);
  const m = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
  const b = y0 - m * x0; // y = mx + b passes through (x0, y0)
  let a2 = randInt(rng, -4, 4);
  let b2 = randInt(rng, -4, 4);
  if (a2 === 0 && b2 === 0) b2 = 2;
  // Avoid a multiple of the first equation's normal (m, -1) → nonzero det
  if (a2 * -1 - b2 * m === 0) a2 += 1;
  const c2 = a2 * x0 + b2 * y0;
  const line1 = `y = ${fmtLinear(m, b)}`;
  const prompt = `Solve by substitution: \\(\\begin{cases} ${line1} \\\\ ${fmtSysEq(a2, b2, c2)} \\end{cases}\\)`;
  return {
    type: "A.5C",
    subtype: "SystemSubstitution",
    prompt,
    answer: fmtPoint(x0, y0),
    steps: systemSteps(
      `Substitute \\(${line1}\\) into the second equation`,
      x0,
      y0
    ),
    meta: { kind: "system", a1: m, b1: -1, c1: -b, a2, b2, c2, degenerate: "none" },
  };
}

// ── Elimination (coefficients set up for clean elimination) ─────────────────

function makeSystemElimination(rng: RNG): Algebra1Problem {
  const x0 = randInt(rng, -5, 5);
  const y0 = randInt(rng, -5, 5);
  const a = pick(rng, [2, 3, 4, 5] as const) * pick(rng, [-1, 1] as const);
  const b1 = randInt(rng, -4, 4) || 2;
  let b2 = randInt(rng, -4, 4) || -3;
  if (b2 === b1) b2 = -b1;
  // Same x-coefficient → subtract to eliminate x.
  const c1 = a * x0 + b1 * y0;
  const c2 = a * x0 + b2 * y0;
  const prompt =
    `Solve by elimination: \\(\\begin{cases} ${fmtSysEq(a, b1, c1)} \\\\ ${fmtSysEq(a, b2, c2)} \\end{cases}\\)`;
  return {
    type: "A.5C",
    subtype: "SystemElimination",
    prompt,
    answer: fmtPoint(x0, y0),
    steps: systemSteps(
      `Both equations have the same x-coefficient (${a}), so subtract to eliminate x`,
      x0,
      y0
    ),
    meta: { kind: "system", a1: a, b1, c1, a2: a, b2, c2, degenerate: "none" },
  };
}

// ── Word problem (tier 3) ───────────────────────────────────────────────────

function makeSystemWordProblem(rng: RNG): Algebra1Problem {
  const small = randInt(rng, 4, 15);
  const big = small + randInt(rng, 3, 10);
  const sum = small + big;
  const diff = big - small;
  const prompt =
    `The sum of two numbers is ${sum} and their difference is ${diff}. Find the two numbers.`;
  return {
    type: "A.2I",
    subtype: "SystemWordProblem",
    prompt,
    answer: `${small} and ${big}`,
    steps: [
      {
        instruction: "Let the numbers be x and y. Write the system:",
        reason: "Translate words into algebra",
        blanks: [
          { label: "system", answer: `x + y = ${sum}; x - y = ${diff}` },
        ],
      },
      {
        instruction: "Solve (adding eliminates y):",
        blanks: [{ label: "answer", answer: `x = ${big}, y = ${small}` }],
      },
    ],
    meta: {
      kind: "system",
      a1: 1, b1: 1, c1: sum,
      a2: 1, b2: -1, c2: diff,
      degenerate: "none",
    },
  };
}

// ── Special cases: parallel (no solution) / coincident (infinite) ───────────
// These are INTENTIONAL and keyed in meta.degenerate. Tier 3 only.

function makeSystemSpecialCase(rng: RNG): Algebra1Problem {
  const parallel = rng() < 0.5;
  const a = pick(rng, [1, 2, 3] as const);
  const b = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
  const c1 = randInt(rng, -8, 8);
  const k = pick(rng, [2, 3, -2] as const);
  const c2 = parallel ? c1 * k + pick(rng, [1, 2, 3] as const) * (c1 >= 0 ? 1 : -1) : c1 * k;
  const prompt =
    `Solve: \\(\\begin{cases} ${fmtSysEq(a, b, c1)} \\\\ ${fmtSysEq(a * k, b * k, c2)} \\end{cases}\\)`;
  const answer = parallel ? "no solution" : "infinitely many solutions";
  return {
    type: "A.5C",
    subtype: "SystemSpecialCase",
    prompt,
    answer,
    steps: [
      {
        instruction: "Compare the two equations — notice the second is a multiple of the first:",
        reason: "Equivalent equations describe the same line",
        blanks: [
          {
            label: "observation",
            answer: parallel
              ? "Same left side ratio, different constant → parallel lines"
              : "The second equation is exactly a multiple of the first → same line",
          },
        ],
      },
      {
        instruction: "Conclusion:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: {
      kind: "system",
      a1: a, b1: b, c1,
      a2: a * k, b2: b * k, c2,
      degenerate: parallel ? "parallel" : "coincident",
    },
  };
}

// ── Linear inequality in two variables: graph y rel mx + b ──────────────────

function makeLinearInequality(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-2, -1, 1, 2] as const);
  const b = randInt(rng, -4, 4);
  const rel = pick(rng, ["<", ">", "<=", ">="] as const);
  const strict = rel === "<" || rel === ">";
  const shadeAbove = rel === ">" || rel === ">=";
  const boundary = strict ? "dashed" : "solid";
  const prompt = `Graph the solution set of \\(y ${rel === "<=" ? "\\leq" : rel === ">=" ? "\\geq" : rel} ${fmtLinear(m, b)}\\).`;
  const answer = `${boundary} boundary line; shade ${shadeAbove ? "above" : "below"} the line`;
  return {
    type: "A.3D",
    subtype: "LinearInequality",
    prompt,
    answer,
    steps: [
      {
        instruction: `Graph the boundary line \\(y = ${fmtLinear(m, b)}\\) (${boundary} — ${strict ? "strict inequality" : "inequality includes equality"}):`,
        reason: "Boundary line separates solution from non-solution",
        blanks: [{ label: "boundary", answer: `${boundary} line` }],
      },
      {
        instruction: "Test (0, 0) in the inequality to decide which side to shade:",
        reason: "A test point reveals the solution half-plane",
        blanks: [{ label: "answer", answer: `shade ${shadeAbove ? "above" : "below"}` }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [
        {
          fn: "line", m, b,
          dashed: strict,
          shade: shadeAbove ? "above" : "below",
          shadeColor: "#3b82f6",
        },
      ],
      xRange: [-8, 8],
    },
    meta: { kind: "linearInequality", m, b, rel },
  };
}

// ── System of inequalities ──────────────────────────────────────────────────

function makeSystemOfInequalities(rng: RNG): Algebra1Problem {
  const m1 = pick(rng, [-2, -1, 1, 2] as const);
  const b1 = randInt(rng, -4, 4);
  const m2 = pick(rng, [-2, -1, 1, 2] as const);
  let b2 = randInt(rng, -4, 4);
  if (m2 === m1 && b2 === b1) b2 += 3; // distinct lines
  const rel1 = pick(rng, ["<", ">"] as const);
  const rel2 = pick(rng, ["<", ">"] as const);
  const prompt =
    `Graph the solution set of the system: \\(\\begin{cases} y ${rel1} ${fmtLinear(m1, b1)} \\\\ y ${rel2} ${fmtLinear(m2, b2)} \\end{cases}\\)`;
  const answer = "the overlapping (doubly-shaded) region";
  return {
    type: "A.3H",
    subtype: "SystemOfInequalities",
    prompt,
    answer,
    steps: [
      {
        instruction: "Graph each inequality's solution set (dashed boundary, shade the correct half-plane):",
        reason: "Each inequality shades a half-plane",
      },
      {
        instruction: "The system's solution is where the shadings overlap:",
        reason: "Solutions must satisfy both inequalities",
        blanks: [{ label: "answer", answer }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [
        { fn: "line", m: m1, b: b1, dashed: true, shade: rel1 === ">" ? "above" : "below", shadeColor: "#3b82f6" },
        { fn: "line", m: m2, b: b2, dashed: true, shade: rel2 === ">" ? "above" : "below", shadeColor: "#10b981" },
      ],
      xRange: [-8, 8],
    },
    meta: { kind: "systemInequalities", m1, b1, rel1, m2, b2, rel2 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  SystemGraphing: (rng) => makeSystemGraphing(rng),
  SystemSubstitution: (rng) => makeSystemSubstitution(rng),
  SystemElimination: (rng) => makeSystemElimination(rng),
  SystemWordProblem: (rng) => makeSystemWordProblem(rng),
  SystemSpecialCase: (rng) => makeSystemSpecialCase(rng),
  LinearInequality: (rng) => makeLinearInequality(rng),
  SystemOfInequalities: (rng) => makeSystemOfInequalities(rng),
};

export function generateSystemProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...SYSTEM_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

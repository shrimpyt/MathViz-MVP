// Algebra1Exponential.ts
// TEKS A.9B (growth/decay), A.9D (graphing exponential functions).
// Subtypes: ExponentialGrowth, ExponentialDecay, ExponentialWordProblem,
//           GraphExponential.
//
// f(x) = a·b^x with integer-friendly parameters so evaluations are exact.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import { fmtNum } from "./Algebra1Format";

export const EXPONENTIAL_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["ExponentialGrowth", "GraphExponential"],
  2: ["ExponentialGrowth", "ExponentialDecay", "GraphExponential"],
  3: ["ExponentialGrowth", "ExponentialDecay", "ExponentialWordProblem", "GraphExponential", "ExponentialModeling"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "ExponentialGrowth",
  "ExponentialDecay",
  "ExponentialWordProblem",
  "GraphExponential",
  "ExponentialModeling",
];

function fmtExp(a: number, b: number): string {
  const bText = Number.isInteger(b) ? `${b}` : `\\frac{1}{${Math.round(1 / b)}}`;
  return `f(x) = ${a}(${bText})^{x}`;
}

// ── Growth: f(x) = a·b^x, b > 1 ────────────────────────────────────────────

function makeExponentialGrowth(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a = pick(rng, [2, 3, 4, 5] as const);
  const b = pick(rng, difficulty === 1 ? [2, 3] as const : [2, 3, 4] as const);
  const x = randInt(rng, 2, 4);
  const value = a * Math.pow(b, x);
  const pct = (b - 1) * 100;
  const prompt = `For \\(${fmtExp(a, b)}\\): (a) Is this growth or decay? (b) What is the growth rate? (c) Find \\(f(${x})\\).`;
  const answer = `growth; ${pct}% per unit; f(${x}) = ${value}`;
  return {
    type: "A.9B",
    subtype: "ExponentialGrowth",
    prompt,
    answer,
    steps: [
      {
        instruction: `In \\(f(x) = ab^x\\), compare b = ${b} to 1:`,
        reason: "b > 1 means growth; 0 < b < 1 means decay",
        blanks: [{ label: "growth or decay", answer: `${b} > 1, so exponential growth` }],
      },
      {
        instruction: "The growth rate is b − 1 as a percent:",
        reason: "Growth rate = b − 1",
        blanks: [{ label: "rate", answer: `${pct}%` }],
      },
      {
        instruction: `Evaluate at x = ${x}:`,
        blanks: [{ label: "answer", answer: `f(${x}) = ${a}(${b})^{${x}} = ${value}` }],
      },
    ],
    meta: { kind: "exponential", a, b, x },
  };
}

// ── Decay: f(x) = a·(1/b)^x ─────────────────────────────────────────────────

function makeExponentialDecay(rng: RNG): Algebra1Problem {
  const a = pick(rng, [8, 12, 16, 24, 36] as const);
  const b = pick(rng, [2, 3] as const); // decay factor 1/b
  const x = randInt(rng, 1, 3);
  const value = a / Math.pow(b, x);
  const prompt = `For \\(f(x) = ${a}(\\frac{1}{${b}})^{x}\\): (a) Is this growth or decay? (b) Find \\(f(${x})\\).`;
  const answer = `decay; f(${x}) = ${fmtNum(value)}`;
  return {
    type: "A.9B",
    subtype: "ExponentialDecay",
    prompt,
    answer,
    steps: [
      {
        instruction: `Compare b = \\(\\frac{1}{${b}}\\) to 1:`,
        blanks: [{ label: "growth or decay", answer: `\\(\\frac{1}{${b}} < 1\\), so exponential decay` }],
      },
      {
        instruction: `Evaluate at x = ${x}:`,
        blanks: [{ label: "answer", answer: `f(${x}) = ${fmtNum(value)}` }],
      },
    ],
    meta: { kind: "exponential", a, b: 1 / b, x },
  };
}

// ── Word problem: compound growth (tier 3) ──────────────────────────────────

function makeExponentialWordProblem(rng: RNG): Algebra1Problem {
  const principal = pick(rng, [100, 200, 500] as const);
  const rate = pick(rng, [5, 10, 20] as const);
  const years = pick(rng, [2, 3] as const);
  const b = 1 + rate / 100;
  const value = principal * Math.pow(b, years);
  const prompt =
    `You deposit $${principal} in an account earning ${rate}% annual interest, compounded yearly. ` +
    `Write the function \\(A(t)\\) and find the balance after ${years} years (round to the nearest cent).`;
  const rounded = Math.round(value * 100) / 100;
  const factorText = rate === 5 ? "1.05" : `1.${rate}`;
  return {
    type: "A.9E",
    subtype: "ExponentialWordProblem",
    prompt,
    answer: `A(t) = ${principal}(${factorText})^{t}; $${rounded.toFixed(2)}`,
    steps: [
      {
        instruction: "The growth factor is 1 + rate:",
        blanks: [{ label: "function", answer: `A(t) = ${principal}(${factorText})^{t}` }],
      },
      {
        instruction: `Substitute t = ${years}:`,
        blanks: [{ label: "answer", answer: `$${rounded.toFixed(2)}` }],
      },
    ],
    meta: { kind: "exponential", a: principal, b, x: years },
  };
}

// ── Graph an exponential ────────────────────────────────────────────────────

function makeGraphExponential(rng: RNG): Algebra1Problem {
  const growth = rng() < 0.5;
  const a = pick(rng, [1, 2, 3] as const);
  const b = growth ? pick(rng, [2, 3] as const) : 1 / pick(rng, [2, 3] as const);
  const prompt = `Graph \\(${fmtExp(a, b)}\\). State the y-intercept and the horizontal asymptote.`;
  const answer = `y-intercept: (0, ${a}); asymptote: y = 0`;
  return {
    type: "A.9A",
    subtype: "GraphExponential",
    prompt,
    answer,
    steps: [
      {
        instruction: "The y-intercept is f(0) = a:",
        reason: "Any nonzero base to the 0 power is 1",
        blanks: [{ label: "y-intercept", answer: `(0, ${a})` }],
      },
      {
        instruction: "As x → −∞, the graph approaches the horizontal asymptote:",
        blanks: [{ label: "asymptote", answer: "y = 0" }],
      },
      {
        instruction: "Plot (0, a) and a few more points, then sketch the curve.",
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "exponential", a, b, label: fmtExp(a, b) }],
      marks: [{ x: 0, y: a, label: `(0, ${a})` }],
      xRange: [-4, 4],
    },
    meta: { kind: "exponential", a, b, x: 0 },
  };
}

// ── Modeling data with an exponential function (A.9E) ───────────────────────

function makeExponentialModeling(rng: RNG): Algebra1Problem {
  const a = pick(rng, [2, 3, 4, 5] as const);
  const b = pick(rng, [2, 3] as const);
  const rows = [0, 1, 2, 3].map((x) => [x, a * Math.pow(b, x)] as [number, number]);
  const table = `\\(\\begin{array}{c|cccc} x & 0 & 1 & 2 & 3 \\\\ \\hline y & ${rows.map((r) => r[1]).join(" & ")} \\end{array}\\)`;
  const predX = 5;
  const pred = a * Math.pow(b, predX);
  const prompt =
    `The table shows data that fits an exponential model. Write the function \\(f(x) = ab^x\\) and use it to predict the value at \\(x = ${predX}\\). ${table}`;
  const answer = `f(x) = ${a}(${b})^{x}; f(${predX}) = ${pred}`;
  return {
    type: "A.9E",
    subtype: "ExponentialModeling",
    prompt,
    answer,
    steps: [
      {
        instruction: "Read a = f(0) from the table, then find b from consecutive ratios:",
        reason: "Exponential model from data",
        blanks: [{ label: "model", answer: `f(x) = ${a}(${b})^{x}` }],
      },
      {
        instruction: `Substitute x = ${predX}:`,
        blanks: [{ label: "answer", answer: `f(${predX}) = ${pred}` }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "exponential", a, b }],
      marks: rows.map(([x, y]) => ({ x, y, label: `(${x}, ${y})` })),
      xRange: [-1, 5],
    },
    meta: { kind: "expModel", a, b },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  ExponentialGrowth: makeExponentialGrowth,
  ExponentialDecay: (rng) => makeExponentialDecay(rng),
  ExponentialWordProblem: (rng) => makeExponentialWordProblem(rng),
  GraphExponential: (rng) => makeGraphExponential(rng),
  ExponentialModeling: (rng) => makeExponentialModeling(rng),
};

export function generateExponentialProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...EXPONENTIAL_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

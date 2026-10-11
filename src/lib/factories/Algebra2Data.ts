// Algebra2Data.ts
// T12 (TEKS A2.12) — Data: analyzing linear/quadratic/exponential data with
// finite differences and ratios, least-squares regression lines, and using
// models to make predictions. Tables are built from exact integer models so
// every value is exact; tests recompute differences, regression coefficients,
// and predictions with independent code.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, randNonZero, selectMakers } from "./Algebra2Helpers";

export type DataSubtype = "DataAnalyze" | "DataRegression" | "DataPredict";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function tableLatex(xs: number[], ys: number[]): string {
  return `x: ${xs.join(", ")}; y: ${ys.join(", ")}`;
}

// ── Identify the model via finite differences / ratios ────────────────────────

function makeDataAnalyze(rng: RNG, model: "linear" | "quadratic" | "exponential"): Algebra2Problem {
  const xs = [0, 1, 2, 3, 4];
  let ys: number[];
  let modelEq = "";
  if (model === "linear") {
    const m = randNonZero(rng, -4, 4);
    const b = randSigned(rng, 8);
    ys = xs.map((x) => m * x + b);
    modelEq = `y = ${m === 1 ? "" : m === -1 ? "-" : m}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
  } else if (model === "quadratic") {
    const a = randNonZero(rng, -2, 2);
    const b = randSigned(rng, 4);
    const c = randSigned(rng, 6);
    ys = xs.map((x) => a * x * x + b * x + c);
    modelEq = `y = ${a}x^2 + ...`;
  } else {
    const a = pick(rng, [1, 2, 3]);
    const r = pick(rng, [2, 3]);
    ys = xs.map((x) => a * Math.pow(r, x));
    modelEq = `y = ${a}(${r})^x`;
  }
  const checkStr =
    model === "linear"
      ? "first differences are constant"
      : model === "quadratic"
        ? "second differences are constant"
        : "ratios of consecutive terms are constant";
  return {
    type: "A2.12",
    subtype: "DataAnalyze",
    given: { table: tableLatex(xs, ys) },
    find: "model type (linear, quadratic, or exponential)",
    answer: `${model} (${checkStr})`,
    steps: [
      {
        instruction: `Compute consecutive ${model === "exponential" ? "ratios y2/y1" : "differences y2 - y1"}:`,
        reason: "Finite differences / ratios reveal the model",
        blanks: [{ label: "pattern", answer: checkStr }],
      },
      {
        instruction: "Classify the data:",
        reason: "Constant first differences → linear; constant second → quadratic; constant ratio → exponential",
        blanks: [{ label: "model", answer: model }],
      },
    ],
    verify: { xs, ys, model },
  };
}

// ── Least-squares regression line (points exactly on y = mx + b) ─────────────

function makeDataRegression(rng: RNG): Algebra2Problem {
  const m = randNonZero(rng, -4, 4);
  const b = randSigned(rng, 9);
  const xs = [1, 2, 3, 4, 5];
  const ys = xs.map((x) => m * x + b);
  const n = xs.length;
  const xBar = xs.reduce((s, x) => s + x, 0) / n;
  const yBar = ys.reduce((s, y) => s + y, 0) / n;
  // slope = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)² ; exact integers here
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xBar) * (ys[i] - yBar);
    den += (xs[i] - xBar) * (xs[i] - xBar);
  }
  const slope = num / den;
  const intercept = yBar - slope * xBar;
  const lineLatex = `y = ${slope === 1 ? "" : slope === -1 ? "-" : slope}x ${intercept < 0 ? "-" : "+"} ${Math.abs(intercept)}`;
  return {
    type: "A2.12",
    subtype: "DataRegression",
    given: { table: tableLatex(xs, ys), method: "least-squares regression" },
    find: "regression line",
    answer: lineLatex,
    steps: [
      {
        instruction: `Compute the means: x̄ = ${xBar}, ȳ = ${yBar}:`,
        reason: "Regression line passes through (x̄, ȳ)",
        blanks: [
          { label: "x̄", answer: `${xBar}` },
          { label: "ȳ", answer: `${yBar}` },
        ],
      },
      {
        instruction: `Slope = Σ(x - x̄)(y - ȳ) / Σ(x - x̄)² = ${num}/${den}:`,
        reason: "Least-squares slope formula",
        blanks: [{ label: "slope", answer: `${slope}` }],
      },
      {
        instruction: `Intercept = ȳ - slope·x̄, then write y = mx + b:`,
        reason: "Point-slope through the mean point",
        blanks: [{ label: "regression line", answer: lineLatex }],
      },
    ],
    verify: { xs, ys, m, b, slope, intercept },
  };
}

// ── Use a model to predict ────────────────────────────────────────────────────

function makeDataPredict(rng: RNG, hard: boolean): Algebra2Problem {
  if (!hard) {
    // Linear data → predict the next value
    const m = randNonZero(rng, -5, 5);
    const b = randSigned(rng, 8);
    const xs = [1, 2, 3, 4];
    const ys = xs.map((x) => m * x + b);
    const pred = m * 6 + b;
    return {
      type: "A2.12",
      subtype: "DataPredict",
      given: { table: tableLatex(xs, ys), model: "linear" },
      find: "predicted y when x = 6",
      answer: `${pred}`,
      steps: [
        {
          instruction: "Identify the linear pattern (constant first differences):",
          reason: "Constant rate of change",
          blanks: [{ label: "pattern", answer: `y increases by ${m} each step` }],
        },
        {
          instruction: "Extend the model to x = 6:",
          reason: "Extrapolate with the model",
          blanks: [{ label: "prediction", answer: `${pred}` }],
        },
      ],
      verify: { kind: "linear", m, b, xs, ys, atX: 6, pred },
    };
  }
  // Exponential model given → predict
  const a = pick(rng, [2, 3, 5]);
  const r = pick(rng, [2, 3]);
  const k = randInt(rng, 4, 6);
  const pred = a * Math.pow(r, k);
  return {
    type: "A2.12",
    subtype: "DataPredict",
    given: { model: `y = ${a}(${r})^x`, context: "population growth model" },
    find: `predicted value when x = ${k}`,
    answer: `${pred}`,
    steps: [
      {
        instruction: `Substitute x = ${k} into y = ${a}(${r})^x:`,
        reason: "Evaluate the model",
        blanks: [{ label: "substituted", answer: `y = ${a}(${r})^${k}` }],
      },
      {
        instruction: "Compute:",
        reason: "Arithmetic",
        blanks: [{ label: "prediction", answer: `${pred}` }],
      },
    ],
    verify: { kind: "exponential", a, r, atX: k, pred },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeDataAnalyze(rng, "linear") },
  { minDifficulty: 1, make: (rng) => makeDataPredict(rng, false) },
  { minDifficulty: 2, make: (rng) => makeDataAnalyze(rng, "quadratic") },
  { minDifficulty: 2, make: makeDataRegression },
  { minDifficulty: 2, make: (rng) => makeDataAnalyze(rng, "linear") },
  { minDifficulty: 3, make: (rng) => makeDataAnalyze(rng, "exponential") },
  { minDifficulty: 3, make: makeDataRegression },
  { minDifficulty: 3, make: (rng) => makeDataPredict(rng, true) },
];

/**
 * Generate n data problems at the given cumulative difficulty tier.
 * `only` optionally restricts to the named subtypes (lesson wiring).
 */
export function generateDataProblems(
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

export const DATA_MAKERS = MAKERS;

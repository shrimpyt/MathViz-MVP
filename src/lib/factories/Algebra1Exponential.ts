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
  1: ["ExponentialGrowth", "GraphExponential", "ExponentialFeatures"],
  2: ["ExponentialGrowth", "ExponentialDecay", "GraphExponential", "ExponentialFeatures", "WriteExponential"],
  3: ["ExponentialGrowth", "ExponentialDecay", "ExponentialWordProblem", "GraphExponential", "ExponentialModeling", "ExponentialFeatures", "WriteExponential"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "ExponentialGrowth",
  "ExponentialDecay",
  "ExponentialWordProblem",
  "GraphExponential",
  "ExponentialModeling",
  "WriteExponential",
  "ExponentialFeatures",
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

// ── Writing an exponential function (A.9C) ────────────────────────────────
// From a constant-ratio table or from a stated percent rate in context.

/** Format the base b the A.9C way: integer, unit fraction, or short decimal. */
function fmtBase(b: number): string {
  if (Number.isInteger(b)) return `${b}`;
  if (b < 1 && Number.isInteger(1 / b)) return `\\frac{1}{${Math.round(1 / b)}}`;
  return `${Math.round(b * 100) / 100}`;
}

function makeWriteExponential(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const style = difficulty === 1 ? "table" : pick(rng, ["table", "context", "context"] as const);
  if (style === "table") {
    const growth = rng() < 0.6;
    const startX = difficulty >= 3 && rng() < 0.5 ? 1 : 0;
    let a: number;
    let b: number;
    if (growth) {
      a = pick(rng, [2, 3, 4, 5, 6] as const);
      b = pick(rng, [2, 3, 4] as const);
    } else {
      const den = pick(rng, [2, 3] as const);
      b = 1 / den;
      // a must keep every table value whole, including the last x shown.
      a = den === 2
        ? startX === 1 ? pick(rng, [16, 32, 48] as const) : pick(rng, [16, 24, 32, 40] as const)
        : startX === 1 ? 81 : pick(rng, [27, 54, 81] as const);
    }
    const xs = [0, 1, 2, 3].map((i) => startX + i);
    const ys = xs.map((x) => Math.round(a * Math.pow(b, x)));
    const table = `\\(\\begin{array}{c|cccc} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}\\)`;
    const kind = growth ? "growth" : "decay";
    const answer = `${kind}; f(x) = ${a}(${fmtBase(b)})^{x}`;
    return {
      type: "A.9C",
      subtype: "WriteExponential",
      prompt:
        `The table shows values of an exponential function. Write the function \\(f(x) = a(b)^x\\) and state whether it shows growth or decay. ${table}`,
      answer,
      steps: [
        {
          instruction: "Consecutive y-values share a constant ratio; that ratio is b. The value at x = 0 is a:",
          reason: "In a table, a is the starting value and b is the ratio",
          blanks: [
            { label: "a", answer: `${a}` },
            { label: "b", answer: fmtBase(b) },
          ],
        },
        {
          instruction: `Since b ${growth ? "> 1" : "< 1"}, the function shows ${kind}:`,
          blanks: [{ label: "answer", answer }],
        },
      ],
      meta: { kind: "writeExp", a, b },
    };
  }

  // Percent-rate context.
  const growth = rng() < 0.55;
  const a = pick(rng, [100, 200, 250, 400, 500, 1000] as const);
  const rate = pick(rng, [3, 5, 8, 10, 20, 25, 50] as const);
  const b = growth ? 1 + rate / 100 : 1 - rate / 100;
  const contexts = growth
    ? [
        `A town's population is ${a} and grows by ${rate}% each year. Let x be the number of years.`,
        `An investment of $${a} earns ${rate}% interest each year, compounded yearly. Let x be the number of years.`,
        `A bacteria culture starts with ${a} cells and grows by ${rate}% each hour. Let x be the number of hours.`,
      ]
    : [
        `A car worth $${a} loses ${rate}% of its value each year. Let x be the number of years.`,
        `A sample of ${a} grams of an isotope decays by ${rate}% each day. Let x be the number of days.`,
        `A laptop worth $${a} depreciates by ${rate}% each year. Let x be the number of years.`,
      ];
  const prompt = `${pick(rng, contexts)} Write the exponential function \\(f(x) = a(b)^x\\) for the situation and state whether it shows growth or decay.`;
  const kind = growth ? "growth" : "decay";
  const answer = `${kind}; f(x) = ${a}(${fmtBase(b)})^{x}`;
  return {
    type: "A.9C",
    subtype: "WriteExponential",
    prompt,
    answer,
    steps: [
      {
        instruction: `The starting value is a = ${a}. The multiplier is 1 ${growth ? "+" : "-"} the rate ${rate}%:`,
        reason: "Growth and decay factors come from the percent rate",
        blanks: [{ label: "b", answer: fmtBase(b) }],
      },
      {
        instruction: `Since b ${growth ? "> 1" : "< 1"}, the function shows ${kind}:`,
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "writeExp", a, b },
  };
}

// ── Key features of an exponential graph (A.9D) ───────────────────────────

function makeExponentialFeatures(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a = pick(rng, [1, 2, 3, 4] as const);
  const growth = rng() < 0.5;
  const b = growth ? pick(rng, [2, 3] as const) : 1 / pick(rng, [2, 3] as const);
  const k = difficulty >= 3 ? pick(rng, [-4, -3, -2, 2, 3, 4] as const) : 0;
  const fnText = k === 0 ? fmtExp(a, b) : `f(x) = ${a}(${fmtBase(b)})^{x} ${k > 0 ? "+" : "-"} ${Math.abs(k)}`;
  const answer = `y-intercept: (0, ${a + k}); asymptote: y = ${k}; domain: all real numbers; range: y > ${k}`;
  return {
    type: "A.9D",
    subtype: "ExponentialFeatures",
    prompt: `For \\(${fnText}\\): state the y-intercept, the horizontal asymptote, the domain, and the range.`,
    answer,
    steps: [
      {
        instruction: `Evaluate at x = 0 for the y-intercept: f(0) = ${a}${k === 0 ? "" : ` ${k > 0 ? "+" : "-"} ${Math.abs(k)}`} = ${a + k}:`,
        reason: "The y-intercept is f(0)",
        blanks: [{ label: "y-intercept", answer: `(0, ${a + k})` }],
      },
      {
        instruction: `The term a(b)^x stays positive and approaches 0, so the graph approaches the horizontal line y = ${k} without reaching it:`,
        reason: "The asymptote bounds the range",
        blanks: [
          { label: "asymptote", answer: `y = ${k}` },
          { label: "answer", answer: `domain: all real numbers; range: y > ${k}` },
        ],
      },
    ],
    ...(k === 0
      ? {
          graph: {
            kind: "FunctionGraph" as const,
            funcs: [{ fn: "exponential" as const, a, b, label: fmtExp(a, b) }],
            marks: [{ x: 0, y: a, label: `(0, ${a})` }],
            xRange: [-4, 4] as [number, number],
          },
        }
      : {}),
    meta: { kind: "expFeatures", a, b, k },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  ExponentialGrowth: makeExponentialGrowth,
  ExponentialDecay: (rng) => makeExponentialDecay(rng),
  ExponentialWordProblem: (rng) => makeExponentialWordProblem(rng),
  GraphExponential: (rng) => makeGraphExponential(rng),
  ExponentialModeling: (rng) => makeExponentialModeling(rng),
  WriteExponential: makeWriteExponential,
  ExponentialFeatures: makeExponentialFeatures,
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

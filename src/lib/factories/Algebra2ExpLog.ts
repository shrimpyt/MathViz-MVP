// Algebra2ExpLog.ts
// A2.5 — Exponentials & logarithms: evaluating logs, expanding/condensing
// logarithmic expressions, solving exponential equations (exact + approximate),
// solving logarithmic equations with domain checks (extraneous roots are
// rejected). Tests substitute solutions back into the ORIGINAL equation and
// verify domain validity independently.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, selectMakers } from "./Algebra2Helpers";

export type ExpLogSubtype =
  | "LogEvaluate"
  | "ExpandLog"
  | "CondenseLog"
  | "SolveExponential"
  | "SolveLogEquation";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function logLatex(base: number, arg: string): string {
  return `\\log_{${base}}(${arg})`;
}

// ── D1: evaluate a logarithm ──────────────────────────────────────────────────

function makeLogEvaluate(rng: RNG): Algebra2Problem {
  const base = pick(rng, [2, 3, 4, 5, 10]);
  const kind = pick(rng, ["power", "one", "base", "negpower"] as const);
  let argStr: string;
  let value: number;
  let argNum: number;
  if (kind === "power") {
    const k = randInt(rng, 2, 4);
    argStr = `${Math.pow(base, k)}`;
    argNum = Math.pow(base, k);
    value = k;
  } else if (kind === "one") {
    argStr = "1";
    argNum = 1;
    value = 0;
  } else if (kind === "base") {
    argStr = `${base}`;
    argNum = base;
    value = 1;
  } else {
    argStr = `1/${base}`;
    argNum = 1 / base;
    value = -1;
  }
  const answer = `${value}`;
  return {
    type: "A2.7",
    subtype: "LogEvaluate",
    given: { expression: `${logLatex(base, argStr)}` },
    find: "exact value",
    answer,
    steps: [
      {
        instruction: `Ask: "${base} raised to what power gives ${argStr}?"`,
        reason: "Definition of logarithm",
        blanks: [{ label: "exponent", answer }],
      },
    ],
    verify: { base, kind, value, arg: argNum },
  };
}

// ── D2/D3: expand / condense ──────────────────────────────────────────────────

function makeExpandLog(rng: RNG, hard: boolean): Algebra2Problem {
  const base = pick(rng, [2, 3, 5, 10]);
  const m = randInt(rng, 2, 3);
  const n = randInt(rng, 1, 3);
  const p = randInt(rng, 1, 3);
  const useRoot = hard && rng() < 0.5;
  // log_b( x^m * y^n / z^p )
  const xm = m === 1 ? "x" : `x^${m}`;
  const yn = n === 1 ? "y" : `y^${n}`;
  const zp = p === 1 ? "z" : `z^${p}`;
  const arg = useRoot ? `\\sqrt{${xm} ${yn}} / ${zp}` : `${xm} ${yn} / ${zp}`;
  const mTerm = m === 1 ? logLatex(base, "x") : `${m} ${logLatex(base, "x")}`;
  const nTerm = n === 1 ? `+ ${logLatex(base, "y")}` : `+ ${n} ${logLatex(base, "y")}`;
  const pTerm = p === 1 ? `- ${logLatex(base, "z")}` : `- ${p} ${logLatex(base, "z")}`;
  const answer = useRoot
    ? `1/2(${mTerm} ${nTerm}) ${pTerm}`
    : `${mTerm} ${nTerm} ${pTerm}`;
  return {
    type: "A2.7",
    subtype: "ExpandLog",
    given: { expression: `${logLatex(base, arg)}` },
    find: "expanded form",
    answer,
    steps: [
      {
        instruction: "Apply the product rule (log of a product = sum of logs):",
        reason: "Product rule for logarithms",
        blanks: [{ label: "product rule", answer: `${logLatex(base, useRoot ? `\\sqrt{${xm} ${yn}}` : `${xm} ${yn}`)} - ${logLatex(base, zp)}` }],
      },
      {
        instruction: "Apply the power rule (log of a power = exponent × log):",
        reason: "Power rule for logarithms",
        blanks: [{ label: "expanded", answer }],
      },
    ],
    verify: { base, m, n, p, useRoot },
  };
}

function makeCondenseLog(rng: RNG): Algebra2Problem {
  const base = pick(rng, [2, 3, 5, 10]);
  const m = randInt(rng, 2, 3);
  const n = randInt(rng, 2, 3);
  const xm = `x^${m}`;
  const yn = `y^${n}`;
  const given = `${m} ${logLatex(base, "x")} + ${n} ${logLatex(base, "y")} - ${logLatex(base, "z")}`;
  const answer = logLatex(base, `${xm} ${yn} / z`);
  return {
    type: "A2.7",
    subtype: "CondenseLog",
    given: { expression: given },
    find: "single logarithm",
    answer,
    steps: [
      {
        instruction: "Apply the power rule in reverse (coefficient → exponent):",
        reason: "Power rule (reverse)",
        blanks: [{ label: "power rule", answer: `${logLatex(base, xm)} + ${logLatex(base, yn)} - ${logLatex(base, "z")}` }],
      },
      {
        instruction: "Apply the product/quotient rules to combine:",
        reason: "Product/quotient rules",
        blanks: [{ label: "condensed", answer }],
      },
    ],
    verify: { base, m, n },
  };
}

// ── D1/D2/D3: solve exponential equations ─────────────────────────────────────

function makeSolveExponential(rng: RNG, level: 1 | 2 | 3): Algebra2Problem {
  const base = pick(rng, [2, 3, 5, 10]);
  if (level === 1) {
    // b^(x + k) = b^m
    const k = randSigned(rng, 5);
    const m = randInt(rng, 1, 5);
    const x = m - k;
    const lhs = k === 0 ? `${base}^x` : `${base}^{x ${k < 0 ? "-" : "+"} ${Math.abs(k)}}`;
    return {
      type: "A2.7",
      subtype: "SolveExponential",
      given: { equation: `${lhs} = ${Math.pow(base, m)}` },
      find: "x",
      answer: `x = ${x}`,
      steps: [
        {
          instruction: `Write ${Math.pow(base, m)} as a power of ${base}:`,
          reason: "Rewrite with same base",
          blanks: [{ label: "same base", answer: `${lhs} = ${base}^${m}` }],
        },
        {
          instruction: "Set the exponents equal and solve:",
          reason: "Equate exponents",
          blanks: [{ label: "solution", answer: `x = ${x}` }],
        },
      ],
      verify: { kind: "samebase", base, k, m, x },
    };
  }
  if (level === 2) {
    // b^(a*x) = b^m  →  x = m/a
    const a = randInt(rng, 2, 4);
    const x = randSigned(rng, 5);
    const m = a * x;
    return {
      type: "A2.7",
      subtype: "SolveExponential",
      given: { equation: `${base}^{${a}x} = ${Math.pow(base, m)}` },
      find: "x",
      answer: `x = ${x}`,
      steps: [
        {
          instruction: `Write ${Math.pow(base, m)} as a power of ${base} and equate exponents:`,
          reason: "Rewrite with same base",
          blanks: [{ label: "exponents", answer: `${a}x = ${m}` }],
        },
        {
          instruction: "Solve:",
          reason: "Isolate x",
          blanks: [{ label: "solution", answer: `x = ${x}` }],
        },
      ],
      verify: { kind: "samebase2", base, a, m, x },
    };
  }
  // level 3: b^x = N (not a clean power) → x = log_b(N), exact + decimal
  const xTarget = randInt(rng, 2, 4);
  const N = Math.pow(base, xTarget) + pick(rng, [1, 2, 3, 5]);
  const exact = `\\log_{${base}} ${N}`;
  const approx = (Math.log(N) / Math.log(base)).toFixed(2);
  return {
    type: "A2.7",
    subtype: "SolveExponential",
    given: { equation: `${base}^x = ${N}` },
    find: "x (exact and to the nearest hundredth)",
    answer: `x = ${exact} ≈ ${approx}`,
    steps: [
      {
        instruction: "Take the logarithm base b of both sides (or convert to log form):",
        reason: "Convert to logarithmic form",
        blanks: [{ label: "log form", answer: `x = ${exact}` }],
      },
      {
        instruction: "Evaluate with the change-of-base formula:",
        reason: "Change-of-base formula",
        blanks: [{ label: "approximate", answer: `x ≈ ${approx}` }],
      },
    ],
    verify: { kind: "approx", base, N, approx: parseFloat(approx) },
  };
}

// ── D2/D3: solve log_b(x) + log_b(x - k) = m ──────────────────────────────────

function makeSolveLogEquation(rng: RNG): Algebra2Problem {
  // Construct: choose base b, exponent m → B = b^m; factor B = s*|t| with
  // s > 0, t < 0; k = s + t. Then x(x - k) = B has roots s (valid) and t
  // (extraneous: t < 0 violates x > 0).
  const base = pick(rng, [2, 3]);
  const mExp = pick(rng, [2, 3]);
  const B = Math.pow(base, mExp);
  const divs: number[] = [];
  for (let d = 1; d <= B; d++) if (B % d === 0) divs.push(d);
  const s = pick(rng, divs.filter((d) => d !== B)); // proper divisor
  const t = -(B / s);
  const k = s + t; // s + t, t negative
  const answer = `x = ${s}`;
  const arg2 = k === 0 ? "x" : k > 0 ? `(x - ${k})` : `(x + ${-k})`;
  const clearedForm = k === 0 ? `x^2 = ${B}` : `x(x ${k < 0 ? "+" : "-"} ${Math.abs(k)}) = ${B}`;
  return {
    type: "A2.7",
    subtype: "SolveLogEquation",
    given: { equation: `${logLatex(base, "x")} + ${logLatex(base, arg2)} = ${mExp}` },
    find: "x",
    answer,
    steps: [
      {
        instruction: "Condense the left side with the product rule, then convert to exponential form:",
        reason: "Product rule, exponential form",
        blanks: [{ label: "exponential form", answer: clearedForm }],
      },
      {
        instruction: `Solve the quadratic and REJECT any root that makes a log argument non-positive:`,
        reason: "Reject extraneous roots",
        blanks: [
          { label: "candidates", answer: `x = ${s} or x = ${t}` },
          { label: "valid solution", answer },
        ],
      },
    ],
    verify: { base, mExp, B, s, t, k },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeLogEvaluate },
  { minDifficulty: 1, make: (rng) => makeSolveExponential(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeExpandLog(rng, false) },
  { minDifficulty: 2, make: makeCondenseLog },
  { minDifficulty: 2, make: (rng) => makeSolveExponential(rng, 2) },
  { minDifficulty: 2, make: makeSolveLogEquation },
  { minDifficulty: 3, make: (rng) => makeExpandLog(rng, true) },
  { minDifficulty: 3, make: makeCondenseLog },
  { minDifficulty: 3, make: (rng) => makeSolveExponential(rng, 3) },
  { minDifficulty: 3, make: makeSolveLogEquation },
];

/** Generate n A2.7 (T7 exponentials & logs) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateExpLogProblems(
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

export const EXPLOG_MAKERS = MAKERS;

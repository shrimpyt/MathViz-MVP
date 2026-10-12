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
import { randSigned, selectMakers, fracToLatex } from "./Algebra2Helpers";

export type ExpLogSubtype =
  | "LogEvaluate"
  | "ExpandLog"
  | "CondenseLog"
  | "SolveExponential"
  | "SolveLogEquation"
  // Topic 7 lessons 7-1..7-5 (attributes, base e, recursive models, natural log)
  | "ExpGrowthDecay"
  | "ExpEvaluate"
  | "ExpAttributes"
  | "ExpTransformWrite"
  | "EEvaluate"
  | "ECompound"
  | "EAttributes"
  | "Recursive"
  | "RecursiveModelWrite"
  | "LogDomain"
  | "LogAttributes"
  | "LogTransformWrite"
  | "LogInversePair"
  | "LnEvaluate"
  | "LnApprox"
  | "LnSolveTime";

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

// ── Lessons 7-1..7-5: attributes, base e, recursive models, natural log ─────
// Same conventions as 7-6/7-7 above: answers computed from the givens, full
// stepped reasons, `verify` carries machine-readable params.

/** "x" / "x + 3" / "x - 3" for v + b. */
function xPlus(b: number, v = "x"): string {
  if (b === 0) return v;
  return b > 0 ? `${v} + ${b}` : `${v} - ${-b}`;
}

/** "" / " + 3" / " - 3" suffix for + k. */
function plusConst(k: number): string {
  if (k === 0) return "";
  return k > 0 ? ` + ${k}` : ` - ${-k}`;
}

/** Leading coefficient prefix for a fraction aNum/aDen: 1 → "", -1 → "-". */
function aPrefixFrac(aNum: number, aDen: number): string {
  if (aDen === 1) {
    if (aNum === 1) return "";
    if (aNum === -1) return "-";
    return `${aNum}`;
  }
  return fracToLatex(aNum, aDen);
}

/** Body of a·b^(x − h) + k. Fractional a is parenthesized ("(1/2) · 2^{x}")
 *  so the plain-text rendering never fuses it with the base ("1/25ˣ"). */
function expBody(aNum: number, aDen: number, b: number, h: number, k: number): string {
  if (aDen !== 1) {
    const frac = fracToLatex(Math.abs(aNum), aDen);
    const prefix = aNum < 0 ? `-(${frac}) \\cdot ` : `(${frac}) \\cdot `;
    return `${prefix}${b}^{${xPlus(-h)}}${plusConst(k)}`;
  }
  return `${aPrefixFrac(aNum, aDen)}${b}^{${xPlus(-h)}}${plusConst(k)}`;
}

/** Body of a·log_b(x − h) + k. */
function logBody(aNum: number, aDen: number, b: number, h: number, k: number): string {
  return `${aPrefixFrac(aNum, aDen)}${logLatex(b, xPlus(-h))}${plusConst(k)}`;
}

// ── 7-1: exponential growth/decay, evaluation, attributes, transformations ────

function makeExpGrowthDecay(rng: RNG): Algebra2Problem {
  const [ctx, A, bNum, bDen] = pick(rng, [
    ["A bacteria culture starts with A0 cells and doubles every hour", 40, 2, 1],
    ["A town's population starts at A0 people and triples every decade", 1200, 3, 1],
    ["A radioactive sample starts with A0 grams and halves every day", 96, 1, 2],
    ["A car's value starts at A0 dollars and drops to a quarter of its value each year", 8000, 1, 4],
  ] as const);
  const growth = bNum > bDen;
  const bStr = fracToLatex(bNum, bDen);
  const context = ctx.replace("A0", `${A}`);
  const answer = `Exponential ${growth ? "growth" : "decay"}; ${growth ? "growth" : "decay"} factor ${bStr}; initial value ${A}`;
  return {
    type: "A2.7",
    subtype: "ExpGrowthDecay",
    given: { context, function: `f(x) = ${A} \\cdot ${bStr}^x` },
    find: "growth or decay, the factor, and the initial value",
    answer,
    steps: [
      {
        instruction: `Compare the base b = ${bStr} with 1:`,
        reason: "b > 1 means growth, 0 < b < 1 means decay",
        blanks: [{ label: "type", answer: growth ? "Exponential growth" : "Exponential decay" }],
      },
      {
        instruction: "The base is the factor by which the quantity is multiplied each period:",
        reason: "Growth/decay factor",
        blanks: [{ label: "factor", answer: bStr }],
      },
      {
        instruction: "The initial value is f(0) — the coefficient in front:",
        reason: "Initial value at x = 0",
        blanks: [{ label: "initial value", answer: `${A}` }],
      },
    ],
    verify: { A, bNum, bDen, growth },
  };
}

function makeExpGrowthDecayPct(rng: RNG): Algebra2Problem {
  const [bStr, rateStr, growth] = pick(rng, [
    ["1.05", "5%", true],
    ["1.08", "8%", true],
    ["1.12", "12%", true],
    ["0.97", "3%", false],
    ["0.92", "8%", false],
    ["0.85", "15%", false],
  ] as const);
  const A = pick(rng, [250, 400, 750, 1000, 2400, 5000]);
  const answer = `Exponential ${growth ? "growth" : "decay"}; ${growth ? "growth" : "decay"} factor ${bStr} (${rateStr} ${growth ? "increase" : "decrease"} per period); initial value ${A}`;
  return {
    type: "A2.7",
    subtype: "ExpGrowthDecay",
    given: { function: `f(x) = ${A}(${bStr})^x` },
    find: "growth or decay, the factor (and percent rate), and the initial value",
    answer,
    steps: [
      {
        instruction: `The base is ${bStr}, which is ${growth ? "greater" : "less"} than 1:`,
        reason: "b > 1 means growth, 0 < b < 1 means decay",
        blanks: [{ label: "type", answer: growth ? "Exponential growth" : "Exponential decay" }],
      },
      {
        instruction: `Write the base as 1 ${growth ? "+" : "-"} r to read off the percent rate:`,
        reason: "Percent rate from the factor",
        blanks: [{ label: "rate", answer: `${rateStr} ${growth ? "increase" : "decrease"} per period` }],
      },
      {
        instruction: "The initial value is f(0):",
        reason: "Initial value at x = 0",
        blanks: [{ label: "initial value", answer: `${A}` }],
      },
    ],
    verify: { A, bStr, rateStr, growth },
  };
}

function makeExpEvaluate(rng: RNG): Algebra2Problem {
  const variant = pick(rng, ["int", "half"] as const);
  let A: number, bStr: string, t: number, valueStr: string, valueNum: number, valueDen: number;
  if (variant === "int") {
    const b = pick(rng, [2, 3, 5, 10]);
    t = randInt(rng, 1, 4);
    A = randInt(rng, 2, 50);
    const val = A * Math.pow(b, t);
    bStr = `${b}`;
    valueStr = `${val}`;
    valueNum = val;
    valueDen = 1;
  } else {
    t = randInt(rng, 1, 4);
    const m = randInt(rng, 1, 20);
    A = m * Math.pow(2, t);
    bStr = "1/2";
    valueStr = fracToLatex(A, Math.pow(2, t));
    valueNum = m;
    valueDen = 1;
  }
  const bDisplay = bStr;
  return {
    type: "A2.7",
    subtype: "ExpEvaluate",
    given: { function: `f(x) = ${A} \\cdot ${bDisplay}^x` },
    find: `f(${t})`,
    answer: `f(${t}) = ${valueStr}`,
    steps: [
      {
        instruction: `Substitute x = ${t}:`,
        reason: "Function evaluation",
        blanks: [{ label: "substituted", answer: `${A} \\cdot ${bDisplay}^{${t}}` }],
      },
      {
        instruction: `Compute the power first, then multiply:`,
        reason: "Order of operations",
        blanks: [{ label: `f(${t})`, answer: valueStr }],
      },
    ],
    verify: { A, b: bStr, t, valueNum, valueDen },
  };
}

function makeExpAttributes(rng: RNG, hard: boolean): Algebra2Problem {
  const b = pick(rng, hard ? [2, 3, 5, 10] : [2, 3, 10]);
  const [aNum, aDen] = hard
    ? pick(rng, [[3, 2], [1, 2], [-3, 2], [-1, 2], [2, 1], [-2, 1]] as const)
    : [pick(rng, [1, 2, -1]), 1] as const;
  const h = randInt(rng, -2, 2);
  const k = randSigned(rng, 5);
  const a = aNum / aDen;
  // y-intercept: a·b^(−h) + k as an exact reduced fraction
  let yNum: number, yDen: number;
  if (h >= 0) {
    yNum = aNum + k * aDen * Math.pow(b, h);
    yDen = aDen * Math.pow(b, h);
  } else {
    yNum = aNum * Math.pow(b, -h) + k * aDen;
    yDen = aDen;
  }
  const yInt = fracToLatex(yNum, yDen);
  const body = expBody(aNum, aDen, b, h, k);
  const range = a > 0 ? `y > ${k}` : `y < ${k}`;
  const answer = `Domain: all real numbers; Range: ${range}; Horizontal asymptote: y = ${k}; y-intercept: (0, ${yInt})`;
  return {
    type: "A2.7",
    subtype: "ExpAttributes",
    given: { function: `g(x) = ${body}` },
    find: "domain, range, horizontal asymptote, and y-intercept",
    answer,
    steps: [
      {
        instruction: "An exponential is defined for every real exponent, so x can be anything:",
        reason: "Domain of an exponential",
        blanks: [{ label: "domain", answer: "all real numbers" }],
      },
      {
        instruction: `${b}^{...} is always positive. With a ${a > 0 ? "> 0" : "< 0"}, the outputs ${a > 0 ? `stay above` : `stay below`} the shifted value k = ${k}:`,
        reason: "Range from the sign of a and the shift k",
        blanks: [{ label: "range", answer: range }],
      },
      {
        instruction: "As x → -∞ (or +∞), the graph levels off at the horizontal shift:",
        reason: "Horizontal asymptote",
        blanks: [{ label: "asymptote", answer: `y = ${k}` }],
      },
      {
        instruction: `Set x = 0 and evaluate ${body.replace("x", "0")}:`,
        reason: "y-intercept",
        blanks: [{ label: "y-intercept", answer: `(0, ${yInt})` }],
      },
    ],
    verify: { aNum, aDen, b, h, k, yIntNum: yNum, yIntDen: yDen },
  };
}

function makeExpTransformWrite(rng: RNG): Algebra2Problem {
  const b = pick(rng, [2, 3, 10]);
  const a = pick(rng, [-3, -2, -1, 2, 3]);
  const h = randSigned(rng, 3);
  const k = randSigned(rng, 5);
  const parts: string[] = [];
  if (a < 0) parts.push("reflect over the x-axis");
  if (Math.abs(a) > 1) parts.push(`vertical stretch by a factor of ${Math.abs(a)}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  const body = expBody(a, 1, b, h, k);
  const answer = `g(x) = ${body}`;
  return {
    type: "A2.7",
    subtype: "ExpTransformWrite",
    given: { parent: `f(x) = ${b}^x`, description: parts.join("; ") },
    find: "equation of the transformed function g",
    answer,
    steps: [
      {
        instruction: "Use the form g(x) = a · b^(x - h) + k. The reflection/stretch words give a:",
        reason: "Vertical transformations come from a",
        blanks: [{ label: "a", answer: `${a}` }],
      },
      {
        instruction: "The shifts give h (inside, with the exponent) and k (outside):",
        reason: "Shifts from h and k",
        blanks: [
          { label: "h", answer: `${h}` },
          { label: "k", answer: `${k}` },
        ],
      },
      {
        instruction: "Assemble g(x). The horizontal asymptote moves from y = 0 to y = k:",
        reason: "Transformed exponential function",
        blanks: [{ label: "g(x)", answer }],
      },
    ],
    verify: { a, b, h, k },
  };
}

// ── 7-2: the number e — evaluation, continuous compounding, attributes ──────

function makeEEvaluate(rng: RNG): Algebra2Problem {
  const form = pick(rng, ["pure", "scaled"] as const);
  let fnStr: string;
  let subStr: string;
  let value: number;
  let x0: number;
  let a = 1;
  let k = 0;
  if (form === "pure") {
    x0 = pick(rng, [-2, -1, 1, 2, 3]);
    fnStr = "f(x) = e^x";
    subStr = `e^{${x0}}`;
    value = Math.exp(x0);
  } else {
    a = pick(rng, [2, 3]);
    k = randSigned(rng, 6);
    x0 = pick(rng, [1, 2]);
    fnStr = `f(x) = ${a}e^x${plusConst(k)}`;
    subStr = `${a}e^{${x0}}${plusConst(k)}`;
    value = a * Math.exp(x0) + k;
  }
  const approx = value.toFixed(2);
  return {
    type: "A2.7",
    subtype: "EEvaluate",
    given: { function: fnStr },
    find: `f(${x0}) to the nearest hundredth`,
    answer: `f(${x0}) \\approx ${approx}`,
    steps: [
      {
        instruction: `Substitute x = ${x0}:`,
        reason: "Function evaluation",
        blanks: [{ label: "substituted", answer: subStr }],
      },
      {
        instruction: "Use e \\approx 2.71828 (the natural base — the limit of (1 + 1/n)^n as n grows) and round to the nearest hundredth:",
        reason: "The number e",
        blanks: [{ label: `f(${x0})`, answer: `\\approx ${approx}` }],
      },
    ],
    verify: { form, x0, a, k, approx },
  };
}

function makeECompound(rng: RNG): Algebra2Problem {
  const P = pick(rng, [400, 500, 1000, 1500, 2500, 5000]);
  const [r, rLabel] = pick(rng, [
    [0.02, "2%"],
    [0.03, "3%"],
    [0.04, "4%"],
    [0.05, "5%"],
    [0.025, "2.5%"],
    [0.045, "4.5%"],
  ] as const);
  const t = randInt(rng, 2, 12);
  const rt = r * t;
  const rtStr = `${parseFloat(rt.toFixed(6))}`;
  const amount = P * Math.exp(rt);
  const amountStr = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    type: "A2.7",
    subtype: "ECompound",
    given: {
      principal: `${P} dollars`,
      rate: `${rLabel} per year, compounded continuously`,
      time: `${t} years`,
      formula: "A = Pe^{rt}",
    },
    find: "amount A in the account (to the nearest cent)",
    answer: amountStr,
    unit: "dollars",
    steps: [
      {
        instruction: "Substitute P, r, and t into A = Pe^{rt} (continuous compounding uses base e):",
        reason: "Continuous compounding formula",
        blanks: [{ label: "substituted", answer: `A = ${P}e^{${r} \\cdot ${t}}` }],
      },
      {
        instruction: `Multiply the exponent: rt = ${rtStr}:`,
        reason: "Simplify the exponent",
        blanks: [{ label: "power of e", answer: `e^{${rtStr}} \\approx ${Math.exp(rt).toFixed(4)}` }],
      },
      {
        instruction: "Multiply and round to the nearest cent:",
        reason: "Evaluate",
        blanks: [{ label: "amount", answer: amountStr }],
      },
    ],
    verify: { P, r, t, amountTimes100: Math.round(amount * 100) },
  };
}

function makeEAttributes(rng: RNG, hard: boolean): Algebra2Problem {
  const a = hard ? pick(rng, [-2, -1, 2]) : 1;
  const h = randInt(rng, -2, 2);
  const k = randSigned(rng, 4);
  const body = `${aPrefixFrac(a, 1)}e^{${xPlus(-h)}}${plusConst(k)}`;
  // y-intercept: a·e^(−h) + k — exact when h = 0, else nearest hundredth
  const yVal = a * Math.exp(-h) + k;
  const yExact = h === 0;
  const yInt = yExact ? `${a + k}` : yVal.toFixed(2);
  const range = a > 0 ? `y > ${k}` : `y < ${k}`;
  const answer = `Domain: all real numbers; Range: ${range}; Horizontal asymptote: y = ${k}; y-intercept: (0, ${yExact ? "" : "\\approx "}${yInt})`;
  return {
    type: "A2.7",
    subtype: "EAttributes",
    given: { function: `g(x) = ${body}` },
    find: "domain, range, horizontal asymptote, and y-intercept",
    answer,
    steps: [
      {
        instruction: "e^x is defined for every real exponent:",
        reason: "Domain of a base-e exponential",
        blanks: [{ label: "domain", answer: "all real numbers" }],
      },
      {
        instruction: `e^(...) is always positive. With a = ${a} ${a > 0 ? "> 0" : "< 0"}, the outputs ${a > 0 ? "stay above" : "stay below"} k = ${k}:`,
        reason: "Range from the sign of a and the shift k",
        blanks: [{ label: "range", answer: range }],
      },
      {
        instruction: "The graph levels off at the horizontal shift:",
        reason: "Horizontal asymptote",
        blanks: [{ label: "asymptote", answer: `y = ${k}` }],
      },
      {
        instruction: `Set x = 0: the y-intercept uses e^{${-h}} ${yExact ? "= 1" : `\\approx ${Math.exp(-h).toFixed(2)}`}:`,
        reason: "y-intercept",
        blanks: [{ label: "y-intercept", answer: `(0, ${yExact ? "" : "\\approx "}${yInt})` }],
      },
    ],
    verify: { a, h, k, yIntApprox: yInt },
  };
}

// ── 7-3: recursive exponential models ────────────────────────────────────────
// Evaluation problems reuse the "Recursive" subtype + verify shape of
// Algebra2Sequences (kind/a1/target/an/step), so the existing independent
// checker chkRecursive validates them unchanged.

function recursiveModelProblem(
  scenario: string,
  a1: number,
  r: number,
  rStr: string,
  target: number
): Algebra2Problem {
  let an = a1;
  const termBlanks: { label: string; answer: string }[] = [];
  for (let i = 2; i <= target; i++) {
    an *= r;
    termBlanks.push({ label: `a_${i}`, answer: `${an}` });
  }
  return {
    type: "A2.7",
    subtype: "Recursive",
    given: {
      scenario,
      firstTerm: `a_1 = ${a1}`,
      rule: `a_n = ${rStr} \\cdot a_{n-1}`,
    },
    find: `a_${target}`,
    answer: `${an}`,
    steps: [
      {
        instruction: "Apply the recursive rule one term at a time — each term is the previous term times the common ratio:",
        reason: "Recursive evaluation",
        blanks: termBlanks,
      },
    ],
    verify: { kind: "geomRec", a1, target, an, step: r },
  };
}

function makeRecursiveModelEval(rng: RNG, variant: "growth" | "decay" | "far"): Algebra2Problem {
  if (variant === "growth") {
    const [scenario, r] = pick(rng, [
      ["A bacteria culture doubles every hour. The starting count is a_1.", 2],
      ["A population of rabbits triples every season. The starting count is a_1.", 3],
      ["A viral post's views quadruple every day. The first day's count is a_1.", 4],
    ] as const);
    const a1 = randInt(rng, 2, 60);
    return recursiveModelProblem(scenario, a1, r, `${r}`, 5);
  }
  if (variant === "decay") {
    const [scenario] = pick(rng, [
      ["A dose of medicine is halved in the body every hour. The starting amount (in mg) is a_1."],
      ["A bouncing ball reaches half its previous height on each bounce. The first height (in cm) is a_1."],
    ] as const);
    const a1 = 16 * randInt(rng, 3, 40);
    return recursiveModelProblem(scenario, a1, 0.5, "1/2", 5);
  }
  // far: push out to a_7..a_10 via the explicit pattern behind the recursion
  const r = pick(rng, [2, 3]);
  const target = r === 2 ? randInt(rng, 7, 10) : randInt(rng, 7, 8);
  const a1 = r === 2 ? randInt(rng, 2, 20) : randInt(rng, 2, 10);
  return recursiveModelProblem(
    "A savings experiment's balance follows the recursive rule below. The starting balance (in dollars) is a_1.",
    a1,
    r,
    `${r}`,
    target
  );
}

function makeRecursiveModelWrite(rng: RNG): Algebra2Problem {
  const [scenario, A, rNum, rDen] = pick(rng, [
    ["A gym's membership grows by the same factor each month.", 120, 2, 1],
    ["A colony of ants triples in size each week.", 45, 3, 1],
    ["A used car's value is halved every 5 years.", 6400, 1, 2],
    ["A savings account's balance doubles every 9 years.", 800, 2, 1],
  ] as const);
  const r = rNum / rDen;
  const rStr = fracToLatex(rNum, rDen);
  const a2 = A * r;
  const a3 = a2 * r;
  const explicitR = rDen === 1 ? `${rStr}^{n-1}` : `(${rStr})^{n-1}`;
  const answer = `a_1 = ${A}, a_n = ${rStr} \\cdot a_{n-1}; explicit: a_n = ${A} \\cdot ${explicitR}`;
  return {
    type: "A2.7",
    subtype: "RecursiveModelWrite",
    given: {
      scenario,
      terms: `a_1 = ${A}, a_2 = ${a2}, a_3 = ${a3}`,
    },
    find: "recursive rule and the explicit formula for a_n",
    answer,
    steps: [
      {
        instruction: "Divide consecutive terms to find the common ratio:",
        reason: "Common ratio of a geometric sequence",
        blanks: [{ label: "ratio", answer: rStr }],
      },
      {
        instruction: "A recursive rule states the first term and how each term comes from the one before:",
        reason: "Recursive definition",
        blanks: [{ label: "recursive rule", answer: `a_1 = ${A}, a_n = ${rStr} \\cdot a_{n-1}` }],
      },
      {
        instruction: "The explicit formula applies the ratio (n - 1) times to the first term — this is exactly an exponential function of n:",
        reason: "Recursive → explicit (exponential)",
        blanks: [{ label: "explicit formula", answer: `a_n = ${A} \\cdot ${explicitR}` }],
      },
    ],
    verify: { A, rNum, rDen, a2, a3 },
  };
}

// ── 7-4: logarithm attributes & transformations (inverses of exponentials) ───

function makeLogDomain(rng: RNG): Algebra2Problem {
  const b = pick(rng, [2, 3, 5, 10]);
  const h = randSigned(rng, 6);
  const k = rng() < 0.5 ? 0 : randSigned(rng, 5);
  return {
    type: "A2.7",
    subtype: "LogDomain",
    given: { function: `f(x) = ${logBody(1, 1, b, h, k)}` },
    find: "domain of f",
    answer: `x > ${h}`,
    steps: [
      {
        instruction: "A logarithm accepts only positive inputs — its argument must be > 0 (this mirrors the range of its inverse, the exponential):",
        reason: "Logarithm argument must be positive",
        blanks: [{ label: "argument condition", answer: `${xPlus(-h)} > 0` }],
      },
      {
        instruction: "Solve the inequality:",
        reason: "Solve for x",
        blanks: [{ label: "domain", answer: `x > ${h}` }],
      },
    ],
    verify: { b, h },
  };
}

function makeLogAttributes(rng: RNG): Algebra2Problem {
  const b = pick(rng, [2, 3, 10]);
  const a = pick(rng, [1, -1, 2]);
  const h = randInt(rng, -3, 4);
  const m = randInt(rng, -2, 2); // log_b(x − h) value at the x-intercept
  const k = -a * m;
  // x-intercept: h + b^m as an exact reduced fraction
  let xiNum: number, xiDen: number;
  if (m >= 0) {
    xiNum = h + Math.pow(b, m);
    xiDen = 1;
  } else {
    xiNum = h * Math.pow(b, -m) + 1;
    xiDen = Math.pow(b, -m);
  }
  const xInt = fracToLatex(xiNum, xiDen);
  const body = logBody(a, 1, b, h, k);
  const answer = `Domain: x > ${h}; Range: all real numbers; Vertical asymptote: x = ${h}; x-intercept: (${xInt}, 0)`;
  return {
    type: "A2.7",
    subtype: "LogAttributes",
    given: { function: `g(x) = ${body}` },
    find: "domain, range, vertical asymptote, and x-intercept",
    answer,
    steps: [
      {
        instruction: "The argument must be positive — the mirror image of the exponential's range:",
        reason: "Domain from the argument",
        blanks: [{ label: "domain", answer: `x > ${h}` }],
      },
      {
        instruction: "A logarithm outputs every real number (the mirror of the exponential's domain):",
        reason: "Range of a logarithm",
        blanks: [{ label: "range", answer: "all real numbers" }],
      },
      {
        instruction: `As x approaches ${h} from the right, the graph ${a > 0 ? "plunges down" : "shoots up"} without bound — the vertical line it hugs is:`,
        reason: "Vertical asymptote",
        blanks: [{ label: "asymptote", answer: `x = ${h}` }],
      },
      {
        instruction: `Set g(x) = 0: then ${logLatex(b, xPlus(-h))} = ${m}, so ${xPlus(-h)} = ${b}^{${m}}:`,
        reason: "x-intercept (solve the log equation)",
        blanks: [{ label: "x-intercept", answer: `(${xInt}, 0)` }],
      },
    ],
    verify: { a, b, h, k, m, xIntNum: xiNum, xIntDen: xiDen },
  };
}

function makeLogTransformWrite(rng: RNG): Algebra2Problem {
  const b = pick(rng, [2, 3, 10]);
  const a = pick(rng, [-2, -1, 2, 3]);
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  const parts: string[] = [];
  if (a < 0) parts.push("reflect over the x-axis");
  if (Math.abs(a) > 1) parts.push(`vertical stretch by a factor of ${Math.abs(a)}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  const body = logBody(a, 1, b, h, k);
  const answer = `g(x) = ${body}`;
  return {
    type: "A2.7",
    subtype: "LogTransformWrite",
    given: { parent: `f(x) = ${logLatex(b, "x")}`, description: parts.join("; ") },
    find: "equation of the transformed function g",
    answer,
    steps: [
      {
        instruction: `Use the form g(x) = a \\cdot ${logLatex(b, "x - h")} + k. The reflection/stretch words give a:`,
        reason: "Vertical transformations come from a",
        blanks: [{ label: "a", answer: `${a}` }],
      },
      {
        instruction: "The shifts give h (inside the argument — it also moves the vertical asymptote to x = h) and k (outside):",
        reason: "Shifts from h and k",
        blanks: [
          { label: "h", answer: `${h}` },
          { label: "k", answer: `${k}` },
        ],
      },
      {
        instruction: "Assemble g(x):",
        reason: "Transformed logarithmic function",
        blanks: [{ label: "g(x)", answer }],
      },
    ],
    verify: { a, b, h, k },
  };
}

function makeLogInversePair(rng: RNG): Algebra2Problem {
  const b = pick(rng, [2, 3, 5, 10]);
  const form = pick(rng, ["vertical", "horizontal"] as const);
  if (form === "vertical") {
    const k = randSigned(rng, 6);
    const inv = logLatex(b, xPlus(-k));
    return {
      type: "A2.7",
      subtype: "LogInversePair",
      given: { function: `f(x) = ${b}^x${plusConst(k)}` },
      find: "inverse function f^{-1} and its domain",
      answer: `f^{-1}(x) = ${inv}; domain: x > ${k}`,
      steps: [
        {
          instruction: "Swap x and y, then isolate the exponential term:",
          reason: "Swap x and y",
          blanks: [{ label: "swapped", answer: `x${plusConst(-k)} = ${b}^y` }],
        },
        {
          instruction: "Rewrite in logarithmic form — the inverse of an exponential is a logarithm:",
          reason: "Definition of logarithm",
          blanks: [{ label: "inverse", answer: `f^{-1}(x) = ${inv}` }],
        },
        {
          instruction: `The domain of f^{-1} is the range of f. Since ${b}^x > 0, f outputs values > ${k}:`,
          reason: "Domain/range swap for inverses",
          blanks: [{ label: "domain of f^{-1}", answer: `x > ${k}` }],
        },
      ],
      verify: { b, shift: k, form },
    };
  }
  const h = randSigned(rng, 5);
  const inv = `${logLatex(b, "x")}${plusConst(h)}`;
  return {
    type: "A2.7",
    subtype: "LogInversePair",
    given: { function: `f(x) = ${b}^{${xPlus(-h)}}` },
    find: "inverse function f^{-1} and its domain",
    answer: `f^{-1}(x) = ${inv}; domain: x > 0`,
    steps: [
      {
        instruction: "Swap x and y:",
        reason: "Swap x and y",
        blanks: [{ label: "swapped", answer: `x = ${b}^{${xPlus(-h, "y")}}` }],
      },
      {
        instruction: "Rewrite in logarithmic form and solve for y — the inverse of an exponential is a logarithm:",
        reason: "Definition of logarithm",
        blanks: [{ label: "inverse", answer: `f^{-1}(x) = ${inv}` }],
      },
      {
        instruction: "The domain of f^{-1} is the range of f, and an exponential outputs only positive values:",
        reason: "Domain/range swap for inverses",
        blanks: [{ label: "domain of f^{-1}", answer: "x > 0" }],
      },
    ],
    verify: { b, shift: h, form },
  };
}

// ── 7-5: natural logarithms ───────────────────────────────────────────────────

function makeLnEvaluate(rng: RNG): Algebra2Problem {
  const kind = pick(rng, ["power", "one", "e", "root", "recip"] as const);
  let expr: string;
  let value: number;
  let valueStr: string;
  let why: string;
  if (kind === "power") {
    const m = pick(rng, [-3, -2, -1, 2, 3, 4, 5]);
    expr = `\\ln(e^{${m}})`;
    value = m;
    valueStr = `${m}`;
    why = "ln and e^x are inverse functions, so ln(e^m) = m";
  } else if (kind === "one") {
    expr = "\\ln(1)";
    value = 0;
    valueStr = "0";
    why = "e^0 = 1, so ln(1) = 0";
  } else if (kind === "e") {
    expr = "\\ln(e)";
    value = 1;
    valueStr = "1";
    why = "e^1 = e, so ln(e) = 1";
  } else if (kind === "root") {
    expr = "\\ln(\\sqrt{e})";
    value = 0.5;
    valueStr = "1/2";
    why = "\\sqrt{e} = e^{1/2}, and ln(e^{1/2}) = 1/2";
  } else {
    const m = pick(rng, [1, 2, 3]);
    expr = `\\ln(1/e^{${m}})`;
    value = -m;
    valueStr = `${-m}`;
    why = `1/e^{${m}} = e^{-${m}}, and ln(e^{-${m}}) = -${m}`;
  }
  return {
    type: "A2.7",
    subtype: "LnEvaluate",
    given: { expression: expr },
    find: "exact value",
    answer: valueStr,
    steps: [
      {
        instruction: `Use the definition of the natural log: \\ln(z) is the power of e that gives z. Here, ${why}:`,
        reason: "Natural log is the inverse of e^x",
        blanks: [{ label: "value", answer: valueStr }],
      },
    ],
    verify: { kind, value },
  };
}

function makeLnApprox(rng: RNG): Algebra2Problem {
  const N = pick(rng, [3, 5, 7, 9, 12, 15, 20, 50]);
  const approx = Math.log(N).toFixed(2);
  return {
    type: "A2.7",
    subtype: "LnApprox",
    given: { expression: `\\ln(${N})` },
    find: "value to the nearest hundredth",
    answer: `\\ln(${N}) \\approx ${approx}`,
    steps: [
      {
        instruction: `\\ln(${N}) asks "e to what power gives ${N}?" — ${N} is not a clean power of e, so evaluate with a calculator:`,
        reason: "Definition of natural log",
        blanks: [{ label: "approximate value", answer: `\\approx ${approx}` }],
      },
      {
        instruction: `Sanity check: e^{${approx}} \\approx ${Math.exp(parseFloat(approx)).toFixed(1)}, close to ${N}:`,
        reason: "Inverse relationship check",
        blanks: [{ label: "check", answer: "✓" }],
      },
    ],
    verify: { N, approx },
  };
}

function makeLnSolveTime(rng: RNG): Algebra2Problem {
  const P = pick(rng, [1000, 2000, 5000]);
  const mult = pick(rng, [2, 3]);
  const A = P * mult;
  const [r, rLabel] = pick(rng, [
    [0.03, "3%"],
    [0.04, "4%"],
    [0.05, "5%"],
    [0.06, "6%"],
  ] as const);
  const tVal = Math.log(A / P) / r;
  const tStr = tVal.toFixed(2);
  return {
    type: "A2.7",
    subtype: "LnSolveTime",
    given: {
      principal: `${P} dollars`,
      rate: `${rLabel} per year, compounded continuously`,
      target: `${A} dollars`,
      model: "A = Pe^{rt}",
    },
    find: "time t needed (to the nearest hundredth of a year)",
    answer: `t \\approx ${tStr}`,
    unit: "years",
    steps: [
      {
        instruction: "Substitute and divide both sides by P to isolate the power of e:",
        reason: "Isolate the exponential",
        blanks: [{ label: "isolated", answer: `e^{${r}t} = ${fracToLatex(A, P)}` }],
      },
      {
        instruction: "Take the natural log of both sides — ln undoes e^(...):",
        reason: "Natural log is the inverse of e^x",
        blanks: [{ label: "after ln", answer: `${r}t = \\ln(${fracToLatex(A, P)})` }],
      },
      {
        instruction: `Divide by ${r} and evaluate:`,
        reason: "Solve for t",
        blanks: [{ label: "time", answer: `t \\approx ${tStr} years` }],
      },
    ],
    verify: { P, A, r, tApprox: tStr },
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
  // 7-1 exponentials: attributes & transformations
  { minDifficulty: 1, make: makeExpGrowthDecay },
  { minDifficulty: 1, make: makeExpEvaluate },
  { minDifficulty: 2, make: makeExpGrowthDecayPct },
  { minDifficulty: 2, make: (rng) => makeExpAttributes(rng, false) },
  { minDifficulty: 2, make: makeExpTransformWrite },
  { minDifficulty: 3, make: (rng) => makeExpAttributes(rng, true) },
  // 7-2 the number e
  { minDifficulty: 1, make: makeEEvaluate },
  { minDifficulty: 2, make: makeECompound },
  { minDifficulty: 2, make: (rng) => makeEAttributes(rng, false) },
  { minDifficulty: 3, make: (rng) => makeEAttributes(rng, true) },
  // 7-3 recursive models
  { minDifficulty: 1, make: (rng) => makeRecursiveModelEval(rng, "growth") },
  { minDifficulty: 2, make: (rng) => makeRecursiveModelEval(rng, "decay") },
  { minDifficulty: 2, make: makeRecursiveModelWrite },
  { minDifficulty: 3, make: (rng) => makeRecursiveModelEval(rng, "far") },
  // 7-4 logarithm attributes & transformations
  { minDifficulty: 1, make: makeLogDomain },
  { minDifficulty: 2, make: makeLogAttributes },
  { minDifficulty: 2, make: makeLogTransformWrite },
  { minDifficulty: 3, make: makeLogInversePair },
  // 7-5 natural logarithms
  { minDifficulty: 1, make: makeLnEvaluate },
  { minDifficulty: 2, make: makeLnApprox },
  { minDifficulty: 3, make: makeLnSolveTime },
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

// CalculusDerivatives.ts
// AP Calculus — Derivative Rules generators (AP Calc AB).
// Power, product, quotient, chain rules and trig derivatives.
//
// Difficulty tiers (cumulative):
//   1: power rule (value + expression), basic trig derivatives at special angles
//   2: + product rule, quotient rule, polynomial chain rule
//   3: + trig/exp chain rule, mixed hard combinations

import type { RNG } from "../math-utils";
import type { CalcFunction, CalcMCQProblem, Maker, DifficultyTier } from "./CalculusUtils";
import {
  randInt, pick,
  fmtNum, polyToText, fnToText, fmtPiMultiple,
  derivCalcFn, evalCalcFn, polyMul,
  makeChoices, numericDistractors,
  generateFromMakers,
} from "./CalculusUtils";

const TOPIC_TAG = "derivative-rules" as const;
const TOPIC_LABEL = "Derivative Rules";

const SUP_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function baseProblem(subtype: CalcMCQProblem["subtype"], calculator = false): Pick<CalcMCQProblem,
  "type" | "subtype" | "topicTag" | "topicLabel" | "calculator"> {
  return { type: "CALC_MCQ", subtype, topicTag: TOPIC_TAG, topicLabel: TOPIC_LABEL, calculator };
}

/** Random polynomial with small integer coefficients, given degree. */
function randPoly(rng: RNG, deg: number): number[] {
  const coeffs: number[] = [];
  for (let i = 0; i <= deg; i++) {
    let c = randInt(rng, -4, 4);
    if (i === 0 && c === 0) c = pick(rng, [-3, -2, 2, 3]);
    coeffs.push(c);
  }
  return coeffs;
}

// ── Tier 1 ────────────────────────────────────────────────────────────────────

function powerRuleValue(rng: RNG): CalcMCQProblem {
  const coeffs = randPoly(rng, pick(rng, [2, 3]));
  const fn: CalcFunction = { kind: "poly", coeffs };
  const dfn = derivCalcFn(fn);
  const x = randInt(rng, -2, 3);
  const v = Math.round(evalCalcFn(dfn, x));
  const { choices, correctIndex } = makeChoices(rng, fmtNum(v), numericDistractors(rng, v));
  return {
    ...baseProblem("PowerRule"),
    prompt: `If f(x) = ${polyToText(coeffs)}, find f′(${x}).`,
    choices, correctIndex,
    answer: fmtNum(v),
    steps: [
      {
        instruction: `Differentiate term by term: f′(x) = ${fnToText(dfn)}.`,
        reason: "Power rule: d/dx[xⁿ] = n·xⁿ⁻¹",
        blanks: [{ label: "f′(x)", answer: fnToText(dfn) }],
      },
      {
        instruction: `Substitute x = ${x}:`,
        blanks: [{ label: "answer", answer: fmtNum(v) }],
      },
    ],
    verify: { kind: "expr", fn: dfn, source: fn },
  };
}

function powerRuleExpr(rng: RNG): CalcMCQProblem {
  const n = randInt(rng, 3, 6);
  const a = pick(rng, [-4, -3, -2, 2, 3, 4]);
  const f: CalcFunction = { kind: "poly", coeffs: [a, ...new Array(n).fill(0)] };
  const df = derivCalcFn(f);
  const correct = fnToText(df);
  const xn = `x${SUP_DIGITS[n]}`;
  const xn1 = `x${SUP_DIGITS[n - 1]}`;
  const aText = a === 1 ? "" : a === -1 ? "−" : fmtNum(a);
  const distractors = [
    `${fmtNum(a * n)}${xn}`, // forgot to drop the power
    `${aText}${xn}`, // forgot to multiply by n
    `${fmtNum(a * (n - 1))}${xn1}`, // dropped to n-1 coefficient
    `${fmtNum(a * n)}${xn1.replace("x", "2x")}`, // nonsense
  ];
  const { choices, correctIndex } = makeChoices(rng, correct, distractors);
  return {
    ...baseProblem("PowerRule"),
    prompt: `If f(x) = ${aText}${xn}, find f′(x).`,
    choices, correctIndex,
    answer: correct,
    steps: [
      {
        instruction: `Apply the power rule to ${aText}${xn}:`,
        reason: "Power rule: d/dx[a·xⁿ] = a·n·xⁿ⁻¹",
        blanks: [{ label: "f′(x)", answer: correct }],
      },
    ],
    verify: { kind: "expr", fn: df, source: f },
  };
}

function trigDerivative(rng: RNG): CalcMCQProblem {
  // d/dx sin = cos, d/dx cos = -sin, evaluated at a special angle
  const base = pick(rng, ["sin", "cos"] as const);
  const k = randInt(rng, 0, 6); // multiple of π/6
  const angle = (k * Math.PI) / 6;
  const angleText = fmtPiMultiple(angle);
  const dfn: CalcFunction = base === "sin"
    ? { kind: "trig", base: "cos", amp: 1, freq: 1, phase: 0, shift: 0 }
    : { kind: "trig", base: "sin", amp: -1, freq: 1, phase: 0, shift: 0 };
  const src: CalcFunction = { kind: "trig", base, amp: 1, freq: 1, phase: 0, shift: 0 };
  const v = evalCalcFn(dfn, angle);
  const ans = fmtNum(v);
  const pool = ["1", "−1", "1/2", "−1/2", "√2/2", "−√2/2", "√3/2", "−√3/2", "0"];
  const distractors = pool.filter((s) => s !== ans);
  const { choices, correctIndex } = makeChoices(rng, ans, distractors);
  return {
    ...baseProblem("TrigDerivative"),
    prompt: `If f(x) = ${base}(x), find f′(${angleText}).`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: base === "sin" ? "f′(x) = cos(x)." : "f′(x) = −sin(x).",
        reason: base === "sin" ? "Derivative of sine is cosine" : "Derivative of cosine is negative sine",
        blanks: [{ label: "f′(x)", answer: base === "sin" ? "cos(x)" : "−sin(x)" }],
      },
      {
        instruction: `Evaluate at x = ${angleText} (no calculator — use the unit circle):`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value: v, tol: 1e-9, source: src, data: { angle } },
  };
}

// ── Tier 2 ────────────────────────────────────────────────────────────────────

function productRule(rng: RNG): CalcMCQProblem {
  // f = (ax+b)(cx^2+dx+e); find f'(k)
  const a = pick(rng, [-2, -1, 1, 2]);
  const b = randInt(rng, -3, 3);
  const c = pick(rng, [-2, -1, 1, 2]);
  const d = randInt(rng, -3, 3);
  const e = randInt(rng, -3, 3);
  const f: CalcFunction = { kind: "poly", coeffs: polyMul([a, b], [c, d, e]) };
  const df = derivCalcFn(f);
  const x = randInt(rng, -2, 2);
  const v = Math.round(evalCalcFn(df, x));
  const { choices, correctIndex } = makeChoices(rng, fmtNum(v), numericDistractors(rng, v));
  return {
    ...baseProblem("ProductRule"),
    prompt: `If f(x) = (${polyToText([a, b])})(${polyToText([c, d, e])}), find f′(${x}).`,
    choices, correctIndex,
    answer: fmtNum(v),
    steps: [
      {
        instruction: "Apply the product rule: (uv)′ = u′v + uv′.",
        reason: "Product rule",
        blanks: [
          { label: "u′v + uv′", answer: `${polyToText([a])}·(${polyToText([c, d, e])}) + (${polyToText([a, b])})·(${polyToText([2 * c, d])})` },
        ],
      },
      {
        instruction: `Simplify and substitute x = ${x}:`,
        blanks: [{ label: "answer", answer: fmtNum(v) }],
      },
    ],
    verify: { kind: "expr", fn: df, source: f },
  };
}

function quotientRule(rng: RNG): CalcMCQProblem {
  // f = (ax+b)/(cx+d); find f'(k), k chosen so denominator != 0
  const a = pick(rng, [-2, -1, 1, 2]);
  const b = randInt(rng, -3, 3);
  const c = pick(rng, [-2, -1, 1, 2]);
  const d = randInt(rng, -3, 3);
  const f: CalcFunction = { kind: "rational", num: [a, b], den: [c, d] };
  let x = randInt(rng, -3, 3);
  while (c * x + d === 0) x += 1;
  const df = derivCalcFn(f);
  const v = evalCalcFn(df, x);
  const ans = fmtNum(v);
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, v));
  return {
    ...baseProblem("QuotientRule"),
    prompt: `If f(x) = (${polyToText([a, b])})/(${polyToText([c, d])}), find f′(${x}).`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: "Apply the quotient rule: (u/v)′ = (u′v − uv′)/v².",
        reason: "Quotient rule",
        blanks: [{ label: "f′(x)", answer: fnToText(df) }],
      },
      {
        instruction: `Substitute x = ${x} and simplify:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "expr", fn: df, source: f },
  };
}

function chainPoly(rng: RNG): CalcMCQProblem {
  // f = (ax+b)^n; find f'(k). Source stored as the expanded polynomial.
  const a = pick(rng, [-2, -1, 1, 2]);
  const b = randInt(rng, -3, 3);
  const n = randInt(rng, 2, 4);
  const x = randInt(rng, -2, 2);
  const innerVal = a * x + b;
  const v = n * a * Math.pow(innerVal, n - 1);
  const ans = fmtNum(v);
  let expanded = [1];
  for (let i = 0; i < n; i++) expanded = polyMul(expanded, [a, b]);
  const source: CalcFunction = { kind: "poly", coeffs: expanded };
  const supN = SUP_DIGITS[n];
  const supN1 = SUP_DIGITS[n - 1];
  const innerText = `(${polyToText([a, b])})`;
  const correctDeriv = `${fmtNum(n * a)}${innerText}${supN1}`;
  const distractors = [
    `${fmtNum(n)}${innerText}${supN1}`,
    `${fmtNum(n * a)}${innerText}${supN}`,
    `${fmtNum(a)}${innerText}${supN1}`,
  ];
  const { choices, correctIndex } = makeChoices(rng, ans, [...distractors, ...numericDistractors(rng, v)]);
  return {
    ...baseProblem("ChainRule"),
    prompt: `If f(x) = ${innerText}${supN}, find f′(${x}).`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: `Chain rule: f′(x) = ${correctDeriv}.`,
        reason: "Chain rule: d/dx[uⁿ] = n·uⁿ⁻¹·u′",
        blanks: [{ label: "f′(x)", answer: correctDeriv }],
      },
      {
        instruction: `Substitute x = ${x}:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value: v, tol: 1e-9, source, data: { x } },
  };
}

// ── Tier 3 ────────────────────────────────────────────────────────────────────

function chainTrig(rng: RNG): CalcMCQProblem {
  // f(x) = sin(ax + p) or cos(ax + p); evaluate f'(0), phase a special angle
  const base = pick(rng, ["sin", "cos"] as const);
  const a = pick(rng, [2, 3]);
  const k = randInt(rng, 1, 5); // phase = k*pi/6
  const phase = (k * Math.PI) / 6;
  const dfn: CalcFunction = base === "sin"
    ? { kind: "trig", base: "cos", amp: a, freq: a, phase, shift: 0 }
    : { kind: "trig", base: "sin", amp: -a, freq: a, phase, shift: 0 };
  const src: CalcFunction = { kind: "trig", base, amp: 1, freq: a, phase, shift: 0 };
  const v = evalCalcFn(dfn, 0);
  const ans = fmtNum(v);
  const pool = ["1", "−1", "2", "−2", "3", "−3", "√2", "−√2", "√3", "−√3", "3/2", "−3/2", "1/2", "−1/2", "0"];
  const distractors = pool.filter((s) => s !== ans);
  const { choices, correctIndex } = makeChoices(rng, ans, distractors);
  return {
    ...baseProblem("ChainTrigExp"),
    prompt: `If f(x) = ${base}(${a}x + ${fmtPiMultiple(phase)}), find f′(0).`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: base === "sin"
          ? `f′(x) = ${a}·cos(${a}x + ${fmtPiMultiple(phase)}).`
          : `f′(x) = −${a}·sin(${a}x + ${fmtPiMultiple(phase)}).`,
        reason: "Chain rule with a trigonometric outer function",
        blanks: [{ label: "f′(x)", answer: fnToText(dfn) }],
      },
      {
        instruction: "Evaluate at x = 0 (no calculator — use the unit circle):",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value: v, tol: 1e-9, source: src, data: { x: 0 } },
  };
}

function chainExp(rng: RNG): CalcMCQProblem {
  // f(x) = e^{kx}: expression form (no calc) or f'(1) to 3 decimals (calc active)
  const k = pick(rng, [-2, -1, 1, 2]);
  const expr = randInt(rng, 0, 1) === 0;
  const f: CalcFunction = { kind: "exp", coeff: 1, rate: k };
  const df = derivCalcFn(f);
  const expo = k === 1 ? "x" : k === -1 ? "−x" : `${fmtNum(k)}x`;
  if (expr) {
    const correct = fnToText(df);
    const rawDistractors = [
      `e^(${expo})`, // forgot the outer k factor
      `${fmtNum(k)}·e^(x)`, // inner function not scaled
      `e^(${expo}) + C`, // stray constant
      `${fmtNum(k * k)}·e^(${expo})`, // k applied twice
      `${fmtNum(-k)}·e^(${expo})`, // sign flip
      `x·e^(${expo})`,
    ];
    const distractors = [...new Set(rawDistractors.filter((d) => d !== correct))];
    const { choices, correctIndex } = makeChoices(rng, correct, distractors);
    return {
      ...baseProblem("ChainTrigExp"),
      prompt: `If f(x) = e^(${expo}), find f′(x).`,
      choices, correctIndex,
      answer: correct,
      steps: [
        {
          instruction: `f′(x) = ${correct}.`,
          reason: "Chain rule: d/dx[eᵘ] = eᵘ·u′",
          blanks: [{ label: "f′(x)", answer: correct }],
        },
      ],
      verify: { kind: "expr", fn: df, source: f },
    };
  }
  const v = k * Math.exp(k);
  const ans = v.toFixed(3);
  // numeric distractors formatted to 3 decimals
  const seen = new Set([ans]);
  const numDistr: string[] = [];
  for (const c of [v + 1, v - 1, v + 2, v - 2, 2 * v, -v, 0, 1]) {
    const s = c.toFixed(3);
    if (!seen.has(s)) {
      seen.add(s);
      numDistr.push(s);
    }
    if (numDistr.length >= 5) break;
  }
  const { choices, correctIndex } = makeChoices(rng, ans, numDistr);
  return {
    ...baseProblem("ChainTrigExp", true),
    prompt: `If f(x) = e^(${expo}), find f′(1). Give your answer to three decimal places.`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: `f′(x) = ${fnToText(df)}, so f′(1) = ${fmtNum(k)}·e^(${fmtNum(k)}) ≈`,
        reason: "Chain rule, then calculator evaluation",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value: v, tol: 5e-4, source: f, data: { x: 1 } },
  };
}

function mixedHard(rng: RNG): CalcMCQProblem {
  // (2x+1)^3 -> 6(2x+1)^2 : verified via expanded polynomial source
  const prompt = "If f(x) = (2x + 1)³, find f′(x).";
  const correct = "6(2x + 1)²";
  // expanded: (2x+1)^3 = 8x^3+12x^2+6x+1 ; derivative 24x^2+24x+6
  const f: CalcFunction = { kind: "poly", coeffs: [8, 12, 6, 1] };
  const df = derivCalcFn(f);
  const distractors = [
    "3(2x + 1)²",
    "6(2x + 1)³",
    "2(2x + 1)²",
    "(2x + 1)²",
  ];
  const { choices, correctIndex } = makeChoices(rng, correct, distractors);
  return {
    ...baseProblem("ChainTrigExp"),
    prompt, choices, correctIndex,
    answer: correct,
    steps: [
      {
        instruction: `Differentiate: f′(x) = ${correct}.`,
        reason: "Chain rule: outer power times derivative of the inner linear function",
        blanks: [{ label: "f′(x)", answer: correct }],
      },
    ],
    verify: { kind: "expr", fn: df, source: f },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const DERIVATIVE_MAKERS: Maker[] = [
  { minDiff: 1, make: powerRuleValue },
  { minDiff: 1, make: powerRuleExpr },
  { minDiff: 1, make: trigDerivative },
  { minDiff: 2, make: productRule },
  { minDiff: 2, make: quotientRule },
  { minDiff: 2, make: chainPoly },
  { minDiff: 3, make: chainTrig },
  { minDiff: 3, make: chainExp },
  { minDiff: 3, make: mixedHard },
];

/** Generate n Derivative Rules MCQ problems at the given difficulty tier. */
export function generateDerivativeProblems(rng: RNG, n: number, difficulty: DifficultyTier): CalcMCQProblem[] {
  return generateFromMakers(rng, n, DERIVATIVE_MAKERS, difficulty);
}

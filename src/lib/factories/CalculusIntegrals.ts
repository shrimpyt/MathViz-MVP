// CalculusIntegrals.ts
// AP Calculus — Integrals generators (AP Calc AB + BC).
// Indefinite & definite integrals, area between curves, FTC, u-substitution,
// and BC-only improper integrals.
//
// Difficulty tiers (cumulative):
//   1: indefinite polynomials, definite polynomials
//   2: + trig/exp indefinite, area between curves, FTC, u-substitution
//   3: + area with crossing curves, definite u-substitution, improper (BC-only)

import type { RNG } from "../math-utils";
import type { CalcFunction, CalcMCQProblem, Maker, DifficultyTier } from "./CalculusUtils";
import {
  randInt, pick,
  fmtNum, polyToText,
  evalCalcFn, polyDeriv, polyMul,
  makeChoices, numericDistractors,
  generateFromMakers,
} from "./CalculusUtils";

const TOPIC_TAG = "integrals" as const;
const TOPIC_LABEL = "Integrals & the Fundamental Theorem";

const SUP_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function baseProblem(
  subtype: CalcMCQProblem["subtype"],
  calculator = false,
  bcOnly = false
): Pick<CalcMCQProblem, "type" | "subtype" | "topicTag" | "topicLabel" | "calculator" | "bcOnly"> {
  return { type: "CALC_MCQ", subtype, topicTag: TOPIC_TAG, topicLabel: TOPIC_LABEL, calculator, bcOnly };
}

/** Antiderivative of a polynomial (constant of integration omitted). */
function antiderivPoly(coeffs: number[]): number[] {
  const deg = coeffs.length - 1;
  return coeffs.map((c, i) => c / (deg - i + 1)).concat([0]);
}

/** Integer power of a polynomial via repeated multiplication. */
function polyPow(p: number[], n: number): number[] {
  let out = [1];
  for (let i = 0; i < n; i++) out = polyMul(out, p);
  return out;
}

// ── Tier 1 ────────────────────────────────────────────────────────────────────

function indefinitePoly(rng: RNG): CalcMCQProblem {
  // Pick antiderivative G with integer coeffs, differentiate to get the integrand.
  const deg = pick(rng, [2, 3]);
  const G: number[] = [];
  for (let i = 0; i <= deg; i++) {
    let c = randInt(rng, -4, 4);
    if (i === 0) c = pick(rng, [-3, -2, 2, 3]);
    G.push(c);
  }
  const g = polyDeriv(G); // integrand coefficients
  const integrand: CalcFunction = { kind: "poly", coeffs: g };
  const anti: CalcFunction = { kind: "poly", coeffs: G };
  const antiText = polyToText(G.slice(0, -1)); // drop G's constant term, add +C
  const correct = `${antiText} + C`;
  // sign-slip distractor: flip one nonzero coefficient (degree differs from the
  // derivative distractors, so it can never collide with them)
  const ac = G.slice(0, -1);
  const flipIdx = ac.length > 1 && ac[1] !== 0 ? 1 : 0;
  const d4 = `${polyToText(ac.map((c, i) => (i === flipIdx ? -c : c)))} + C`;
  const distractors = [
    `${polyToText(g)} + C`, // "integrated" to itself
    `${polyToText(polyDeriv(g))} + C`, // differentiated instead
    antiText, // forgot the constant
    d4, // sign slip on one term
  ];
  const { choices, correctIndex } = makeChoices(rng, correct, distractors);
  return {
    ...baseProblem("IndefiniteIntegral"),
    prompt: `Find ∫(${polyToText(g)}) dx.`,
    choices, correctIndex,
    answer: correct,
    steps: [
      {
        instruction: "Integrate term by term (reverse power rule):",
        reason: "Reverse power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C",
        blanks: [{ label: "antiderivative", answer: correct }],
      },
    ],
    verify: { kind: "expr", fn: anti, source: integrand },
  };
}

function definitePoly(rng: RNG): CalcMCQProblem {
  const deg = pick(rng, [2, 3]);
  const G: number[] = [];
  for (let i = 0; i <= deg; i++) {
    let c = randInt(rng, -3, 3);
    if (i === 0) c = pick(rng, [-2, 2]);
    G.push(c);
  }
  const g = polyDeriv(G);
  const integrand: CalcFunction = { kind: "poly", coeffs: g };
  const Gfn: CalcFunction = { kind: "poly", coeffs: G };
  const a = randInt(rng, -2, 1);
  const b = a + randInt(rng, 1, 3);
  const Gb = evalCalcFn(Gfn, b);
  const Ga = evalCalcFn(Gfn, a);
  const value = Gb - Ga;
  const ans = fmtNum(value);
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, value));
  return {
    ...baseProblem("DefiniteIntegral"),
    prompt: `Evaluate ∫(${polyToText(g)}) dx from ${a} to ${b}.`,
    choices, correctIndex,
    answer: ans,
    graph: {
      kind: "CalcGraph", fn: integrand,
      xMin: a - 2, xMax: b + 2,
      yMin: Math.min(evalCalcFn(integrand, a), evalCalcFn(integrand, b), 0) - 2,
      yMax: Math.max(evalCalcFn(integrand, a), evalCalcFn(integrand, b), 0) + 2,
      shade: { a, b, between: false },
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `An antiderivative is ${polyToText(G)}. By the Fundamental Theorem:`,
        reason: "FTC: ∫ₐᵇ f(x)dx = F(b) − F(a)",
        blanks: [{ label: "F(b) − F(a)", answer: `${fmtNum(Gb)} − ${fmtNum(Ga)}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 1e-9, source: integrand, data: { a, b } },
  };
}

// ── Tier 2 ────────────────────────────────────────────────────────────────────

function indefiniteTrigExp(rng: RNG): CalcMCQProblem {
  const variant = randInt(rng, 0, 3);
  let prompt: string;
  let correct: string;
  let distractors: string[];
  let reason: string;
  if (variant === 0) {
    prompt = "Find ∫sin(x) dx.";
    correct = "−cos(x) + C";
    distractors = ["cos(x) + C", "−sin(x) + C", "cos(x) − C", "−cos(x)"];
    reason = "∫sin(x)dx = −cos(x) + C";
  } else if (variant === 1) {
    prompt = "Find ∫cos(x) dx.";
    correct = "sin(x) + C";
    distractors = ["−sin(x) + C", "cos(x) + C", "−cos(x) + C", "sin(x)"];
    reason = "∫cos(x)dx = sin(x) + C";
  } else if (variant === 2) {
    prompt = "Find ∫e^(2x) dx.";
    correct = "e^(2x)/2 + C";
    distractors = ["e^(2x) + C", "2e^(2x) + C", "e^(2x)/2", "e^(2x)/4 + C"];
    reason = "Reverse chain rule: ∫e^(2x)dx = e^(2x)/2 + C";
  } else {
    prompt = "Find ∫(1/x) dx.";
    correct = "ln|x| + C";
    distractors = ["ln(x) + C", "1/x² + C", "−1/x² + C", "ln|x|"];
    reason = "∫(1/x)dx = ln|x| + C";
  }
  const { choices, correctIndex } = makeChoices(rng, correct, distractors);
  return {
    ...baseProblem("IndefiniteIntegral"),
    prompt, choices, correctIndex,
    answer: correct,
    steps: [
      {
        instruction: `Integrate: ${correct}.`,
        reason,
        blanks: [{ label: "antiderivative", answer: correct }],
      },
    ],
    verify: { kind: "text", text: correct },
  };
}

function areaBetween(rng: RNG): CalcMCQProblem {
  // f(x) = k(x-a)(b-x) >= 0 on [a,b]; area = k(b-a)^3/6, integer by construction
  const [k, d] = pick(rng, [[6, 2], [6, 3], [3, 2]] as [number, number][]);
  const a = randInt(rng, 0, 1);
  const b = a + d;
  const coeffs = [-k, k * (a + b), -k * a * b];
  const f: CalcFunction = { kind: "poly", coeffs };
  const value = (k * d * d * d) / 6;
  const ans = fmtNum(value);
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, value));
  return {
    ...baseProblem("AreaBetweenCurves"),
    prompt: `Find the area of the region enclosed by the graph of y = ${polyToText(coeffs)} and the x-axis.`,
    choices, correctIndex,
    answer: ans,
    graph: {
      kind: "CalcGraph", fn: f,
      xMin: a - 1, xMax: b + 1,
      yMin: -1, yMax: (k * d * d) / 4 + 2,
      shade: { a, b, between: false },
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `The curve meets the x-axis at x = ${a} and x = ${b}. Area = ∫ from ${a} to ${b} of f(x) dx.`,
        reason: "Area between a nonnegative curve and the x-axis is the definite integral",
        blanks: [{ label: "bounds", answer: `${a} to ${b}` }],
      },
      {
        instruction: "Evaluate the integral:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 1e-9, source: f, data: { a, b } },
  };
}

function ftc(rng: RNG): CalcMCQProblem {
  const variant = randInt(rng, 0, 1);
  let prompt: string;
  let ans: string;
  let value: number;
  let reason: string;
  let instr: string;
  let source: CalcFunction;
  let data: Record<string, number | string>;
  if (variant === 0) {
    // F(x) = ∫_L^x (t^2 + c) dt; find F'(x0)
    const c = randInt(rng, 1, 5);
    const L = randInt(rng, 0, 2);
    const x0 = L + randInt(rng, 1, 3);
    value = x0 * x0 + c;
    ans = fmtNum(value);
    prompt = `If F(x) = ∫ from ${L} to x of (t² + ${c}) dt, find F′(${x0}).`;
    reason = "FTC Part 1: d/dx[∫ₐˣ f(t)dt] = f(x)";
    instr = `By FTC Part 1, F′(x) = x² + ${c}, so F′(${x0}) = ${x0}² + ${c} =`;
    source = { kind: "poly", coeffs: [1, 0, c] };
    data = { variant: 0, x0 };
  } else {
    // accumulation: v(t) = 3t^2 - 2, x(1) = 4, find x(3)
    const t0 = 1, t1 = 3, x0 = 4;
    // ∫(3t^2-2) = t^3 - 2t
    value = x0 + (t1 ** 3 - 2 * t1) - (t0 ** 3 - 2 * t0);
    ans = fmtNum(value);
    prompt = `A particle moves with velocity v(t) = 3t² − 2 (m/s). If x(1) = 4, find x(3).`;
    reason = "Net change: x(b) − x(a) = ∫ₐᵇ v(t)dt";
    instr = `x(3) = x(1) + ∫ from 1 to 3 of (3t² − 2) dt = 4 + [t³ − 2t]₁³ =`;
    source = { kind: "poly", coeffs: [3, 0, -2] };
    data = { variant: 1, t0, t1, x0 };
  }
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, value));
  return {
    ...baseProblem("FTC"),
    prompt, choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: instr,
        reason,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 1e-9, source, data },
  };
}

function uSub(rng: RNG): CalcMCQProblem {
  // ∫ x(ax^2+b)^n dx = (ax^2+b)^{n+1} / (2a(n+1)) + C
  const a = pick(rng, [1, 2]);
  const b = randInt(rng, 1, 4);
  const n = pick(rng, [2, 3]);
  const inner = [a, 0, b];
  const innerText = polyToText(inner);
  const denom = 2 * a * (n + 1);
  const correct = `(${innerText})${SUP_DIGITS[n + 1]}/${denom} + C`;
  const distractors = [
    `(${innerText})${SUP_DIGITS[n + 1]}/${n + 1} + C`, // forgot inner derivative factor
    `(${innerText})${SUP_DIGITS[n]}/${denom} + C`, // forgot to raise power
    `x·(${innerText})${SUP_DIGITS[n + 1]}/${denom} + C`, // left the x in
    `(2x)${SUP_DIGITS[n + 1]}/${denom} + C`, // substituted du instead of u
  ];
  const { choices, correctIndex } = makeChoices(rng, correct, distractors);
  // expanded source for independent verification
  const integrandCoeffs = polyMul([0, 1, 0], polyPow(inner, n)); // x*(ax^2+b)^n
  const antiCoeffs = polyPow(inner, n + 1).map((c) => c / denom);
  const f: CalcFunction = { kind: "poly", coeffs: integrandCoeffs };
  const G: CalcFunction = { kind: "poly", coeffs: antiCoeffs };
  return {
    ...baseProblem("USubstitution"),
    prompt: `Find ∫x(${innerText})${SUP_DIGITS[n]} dx.`,
    choices, correctIndex,
    answer: correct,
    steps: [
      {
        instruction: `Let u = ${innerText}. Then du = ${2 * a}x dx, so x dx = du/(${2 * a}).`,
        reason: "u-substitution: choose the inner function as u",
        blanks: [{ label: "u", answer: innerText }],
      },
      {
        instruction: `∫u${SUP_DIGITS[n]}·(du/${2 * a}) = u${SUP_DIGITS[n + 1]}/${denom} + C. Substitute back:`,
        reason: "Integrate in u, then substitute back",
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
    verify: { kind: "expr", fn: G, source: f },
  };
}

// ── Tier 3 ────────────────────────────────────────────────────────────────────

function areaBetweenCross(rng: RNG): CalcMCQProblem {
  // y = k^2 x - x^3 meets the x-axis at -k, 0, k; total area = k^4/2
  const k = pick(rng, [2, 3]);
  const a = k * k;
  const coeffs = [-1, 0, a, 0];
  const f: CalcFunction = { kind: "poly", coeffs };
  const value = (k ** 4) / 2;
  const ans = fmtNum(value);
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, value));
  return {
    ...baseProblem("AreaBetweenCurves"),
    prompt: `Find the total area of the region enclosed by the graph of y = ${polyToText(coeffs)} and the x-axis.`,
    choices, correctIndex,
    answer: ans,
    graph: {
      kind: "CalcGraph", fn: f,
      xMin: -k - 1, xMax: k + 1,
      yMin: -(a * k) - 2, yMax: a * k + 2,
      shade: { a: -k, b: k, between: false },
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `Zeros at x = ${-k}, 0, ${k}. The curve dips below the axis on (${-k}, 0), so split the integral:`,
        reason: "Area is the integral of the absolute value — split where the curve crosses",
        blanks: [{ label: "setup", answer: `|∫_${-k}^0| + |∫_0^${k}|` }],
      },
      {
        instruction: "By symmetry the two pieces are equal; total area =",
        reason: "Odd function: symmetric areas on [−k, 0] and [0, k]",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 1e-9, source: f, data: { k } },
  };
}

function uSubDefinite(rng: RNG): CalcMCQProblem {
  // ∫_0^1 x(x^2+1)^n dx = (2^{n+1}-1)/(2(n+1))
  const n = pick(rng, [2, 3, 4]);
  const value = (2 ** (n + 1) - 1) / (2 * (n + 1));
  const ans = fmtNum(value);
  const inner = [1, 0, 1];
  const integrand: CalcFunction = { kind: "poly", coeffs: polyMul([0, 1, 0], polyPow(inner, n)) };
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, value));
  return {
    ...baseProblem("USubstitution"),
    prompt: `Evaluate ∫ from 0 to 1 of x(x² + 1)${SUP_DIGITS[n]} dx.`,
    choices, correctIndex,
    answer: ans,
    graph: {
      kind: "CalcGraph", fn: integrand,
      xMin: -0.5, xMax: 1.5,
      yMin: -1, yMax: evalCalcFn(integrand, 1) + 2,
      shade: { a: 0, b: 1, between: false },
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `Let u = x² + 1 (du = 2x dx). When x = 0, u = 1; when x = 1, u = 2.`,
        reason: "u-substitution with changed bounds — no need to substitute back",
        blanks: [{ label: "new bounds", answer: "1 to 2" }],
      },
      {
        instruction: `∫ from 1 to 2 of u${SUP_DIGITS[n]}/2 du = [u${SUP_DIGITS[n + 1]}/${2 * (n + 1)}]₁² =`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 1e-9, source: integrand, data: { n } },
  };
}

function improperIntegral(rng: RNG): CalcMCQProblem {
  // BC-only: ∫_1^∞ x^{-p} dx = 1/(p-1), or ∫_0^1 x^{-1/2} dx = 2
  const variant = randInt(rng, 0, 1);
  let prompt: string;
  let ans: string;
  let value: number;
  let data: Record<string, number | string>;
  let stepText: string;
  if (variant === 0) {
    const p = pick(rng, [2, 3, 4]);
    value = 1 / (p - 1);
    ans = fmtNum(value);
    prompt = `Evaluate the improper integral ∫ from 1 to ∞ of x^(−${p}) dx. (BC only)`;
    data = { variant: 0, p };
    stepText = `Write as a limit: lim(b→∞) ∫ from 1 to b of x^(−${p}) dx = lim(b→∞) [x^(${1 - p})/(${1 - p})] from 1 to b =`;
  } else {
    value = 2;
    ans = "2";
    prompt = "Evaluate the improper integral ∫ from 0 to 1 of 1/√x dx. (BC only)";
    data = { variant: 1 };
    stepText = "Write as a limit: lim(a→0⁺) ∫ from a to 1 of x^(−1/2) dx = lim(a→0⁺) [2√x] from a to 1 =";
  }
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, value, [0]));
  return {
    ...baseProblem("ImproperIntegral", false, true),
    prompt, choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: stepText,
        reason: "Improper integrals are defined as limits",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 1e-9, data },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const INTEGRAL_MAKERS: Maker[] = [
  { minDiff: 1, make: indefinitePoly },
  { minDiff: 1, make: definitePoly },
  { minDiff: 2, make: indefiniteTrigExp },
  { minDiff: 2, make: areaBetween },
  { minDiff: 2, make: ftc },
  { minDiff: 2, make: uSub },
  { minDiff: 3, make: areaBetweenCross },
  { minDiff: 3, make: uSubDefinite },
  { minDiff: 3, make: improperIntegral },
];

/** Generate n Integrals MCQ problems at the given difficulty tier. */
export function generateIntegralProblems(rng: RNG, n: number, difficulty: DifficultyTier): CalcMCQProblem[] {
  return generateFromMakers(rng, n, INTEGRAL_MAKERS, difficulty);
}

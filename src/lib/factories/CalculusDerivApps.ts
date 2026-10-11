// CalculusDerivApps.ts
// AP Calculus — Applications of Derivatives generators (AP Calc AB).
// Tangent & normal lines, increasing/decreasing & extrema, curve sketching,
// optimization, related rates.
//
// Difficulty tiers (cumulative):
//   1: tangent lines
//   2: + normal lines, increasing/decreasing, extrema, optimization (integer)
//   3: + curve sketching, related rates, optimization (calculator decimals)

import type { RNG } from "../math-utils";
import type { CalcFunction, CalcMCQProblem, Maker, DifficultyTier } from "./CalculusUtils";
import {
  randInt, pick,
  fmtNum, polyToText,
  derivCalcFn, evalCalcFn,
  makeChoices, numericDistractors,
  generateFromMakers,
} from "./CalculusUtils";

const TOPIC_TAG = "derivative-apps" as const;
const TOPIC_LABEL = "Applications of Derivatives";

function baseProblem(subtype: CalcMCQProblem["subtype"], calculator = false): Pick<CalcMCQProblem,
  "type" | "subtype" | "topicTag" | "topicLabel" | "calculator"> {
  return { type: "CALC_MCQ", subtype, topicTag: TOPIC_TAG, topicLabel: TOPIC_LABEL, calculator };
}

/** Canonical line text: "y = 2x + 3", "y = −x", "y = 5". */
export function lineText(m: number, b: number): string {
  const mT = Math.abs(m - 1) < 1e-12 ? "x" : Math.abs(m + 1) < 1e-12 ? "−x" : `${fmtNum(m)}x`;
  if (Math.abs(m) < 1e-12) return `y = ${fmtNum(b)}`;
  if (Math.abs(b) < 1e-12) return `y = ${mT}`;
  return b > 0 ? `y = ${mT} + ${fmtNum(b)}` : `y = ${mT} − ${fmtNum(-b)}`;
}

/** Rich, deduped distractor pool for line answers (always ≥ 4 distinct). */
function lineDistractors(m: number, b: number, fa: number): string[] {
  const correct = lineText(m, b);
  const cands = [
    lineText(m, fa), // intercept mixup
    lineText(fa, b), // slope mixup
    lineText(-m, b), // sign flip
    lineText(m, b + 1),
    lineText(m, b - 1),
    lineText(m, b + 2),
    lineText(m, b + 3),
    lineText(m + 1, b),
    lineText(m - 1, b),
    lineText(m + 2, b),
    lineText(2 * m, b),
  ];
  const seen = new Set([correct]);
  const out: string[] = [];
  for (const c of cands) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

/** Random quadratic/cubic with small integer coefficients. */
function randPoly(rng: RNG, deg: number): number[] {
  const coeffs: number[] = [];
  for (let i = 0; i <= deg; i++) {
    let c = randInt(rng, -3, 3);
    if (i === 0 && c === 0) c = pick(rng, [-2, 2]);
    coeffs.push(c);
  }
  return coeffs;
}

// ── Tier 1 ────────────────────────────────────────────────────────────────────

function tangentLine(rng: RNG): CalcMCQProblem {
  const coeffs = randPoly(rng, pick(rng, [2, 3]));
  const fn: CalcFunction = { kind: "poly", coeffs };
  const dfn = derivCalcFn(fn);
  const a = randInt(rng, -2, 2);
  const m = evalCalcFn(dfn, a);
  const fa = evalCalcFn(fn, a);
  const b = fa - m * a;
  const ans = lineText(m, b);
  const { choices, correctIndex } = makeChoices(rng, ans, lineDistractors(m, b, fa));
  return {
    ...baseProblem("TangentLine"),
    prompt: `Find an equation of the tangent line to y = ${polyToText(coeffs)} at x = ${a}.`,
    choices, correctIndex,
    answer: ans,
    graph: {
      kind: "CalcGraph", fn,
      xMin: a - 4, xMax: a + 4,
      yMin: Math.min(fa, fa + m * 3) - 3, yMax: Math.max(fa, fa + m * 3) + 3,
      tangentAt: a,
      markers: [{ x: a, y: fa, label: `(${a}, ${fmtNum(fa)})` }],
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `Slope: m = f′(${a}) = ${fmtNum(m)}.`,
        reason: "The derivative gives the slope of the tangent line",
        blanks: [{ label: "m", answer: fmtNum(m) }],
      },
      {
        instruction: `Point: f(${a}) = ${fmtNum(fa)}. Use y = m(x − ${a}) + ${fmtNum(fa)}:`,
        reason: "Point–slope form of a line",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "text", text: ans, source: fn, data: { a, m, b } },
  };
}

// ── Tier 2 ────────────────────────────────────────────────────────────────────

function normalLine(rng: RNG): CalcMCQProblem {
  // (f, a) pairs with clean tangent slopes so the normal slope is a simple fraction
  const pairs: { coeffs: number[]; a: number }[] = [
    { coeffs: [1, 0, 0], a: 1 },   // x^2, m=2 -> -1/2
    { coeffs: [1, 0, 0], a: -1 },  // x^2, m=-2 -> 1/2
    { coeffs: [1, 0, 0], a: 2 },   // x^2, m=4 -> -1/4
    { coeffs: [1, 0, 1], a: 1 },   // x^2+1, m=2 -> -1/2
    { coeffs: [2, 0, 0], a: 1 },   // 2x^2, m=4 -> -1/4
  ];
  const { coeffs, a } = pick(rng, pairs);
  const fn: CalcFunction = { kind: "poly", coeffs };
  const dfn = derivCalcFn(fn);
  const m = evalCalcFn(dfn, a);
  const fa = evalCalcFn(fn, a);
  const mn = -1 / m;
  const bn = fa - mn * a;
  const ans = lineText(mn, bn);
  const { choices, correctIndex } = makeChoices(rng, ans, lineDistractors(mn, bn, fa));
  return {
    ...baseProblem("NormalLine"),
    prompt: `Find an equation of the normal line to y = ${polyToText(coeffs)} at x = ${a}.`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: `Tangent slope: f′(${a}) = ${fmtNum(m)}. Normal slope: m = −1/${fmtNum(m)} = ${fmtNum(mn)}.`,
        reason: "Normal lines are perpendicular: slopes are opposite reciprocals",
        blanks: [{ label: "normal slope", answer: fmtNum(mn) }],
      },
      {
        instruction: `Through (${a}, ${fmtNum(fa)}):`,
        reason: "Point–slope form of a line",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "text", text: ans, source: fn, data: { a, m: mn, b: bn } },
  };
}

function incDec(rng: RNG): CalcMCQProblem {
  // f'(x) = (x - r1)(x - r2), r1 < r2: decreasing on (r1, r2)
  const r1 = randInt(rng, -3, 2);
  const r2 = randInt(rng, r1 + 1, 4);
  const fp: CalcFunction = { kind: "poly", coeffs: [1, -(r1 + r2), r1 * r2] };
  const askDec = randInt(rng, 0, 1) === 1;
  const ans = askDec ? `(${fmtNum(r1)}, ${fmtNum(r2)})` : `(−∞, ${fmtNum(r1)}) ∪ (${fmtNum(r2)}, ∞)`;
  const distractors = askDec
    ? [`(−∞, ${fmtNum(r1)})`, `(${fmtNum(r2)}, ∞)`, `(−∞, ${fmtNum(r1)}) ∪ (${fmtNum(r2)}, ∞)`, "never"]
    : [`(${fmtNum(r1)}, ${fmtNum(r2)})`, `(−∞, ${fmtNum(r2)})`, "always", "never"];
  const { choices, correctIndex } = makeChoices(rng, ans, distractors);
  return {
    ...baseProblem("IncreasingDecreasing"),
    prompt: `Let f′(x) = (x − ${r1})(x − ${r2}). On which interval is f ${askDec ? "decreasing" : "increasing"}?`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: `Critical numbers: f′(x) = 0 at x = ${r1} and x = ${r2}.`,
        reason: "Critical numbers are where the derivative is zero",
        blanks: [{ label: "critical numbers", answer: `${r1}, ${r2}` }],
      },
      {
        instruction: `Sign chart: f′ < 0 on (${fmtNum(r1)}, ${fmtNum(r2)}), f′ > 0 outside. So f is ${askDec ? "decreasing" : "increasing"} on:`,
        reason: "f decreases where f′ < 0 and increases where f′ > 0",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "text", text: ans, source: fp, data: { r1, r2, askDec: askDec ? 1 : 0 } },
  };
}

function extrema(rng: RNG): CalcMCQProblem {
  // f'(x) = 3(x-r1)(x-r2) -> f(x) = x^3 - 1.5(r1+r2)x^2 + 3 r1 r2 x; local max at r1
  const r1 = randInt(rng, -2, 1);
  const r2 = r1 + randInt(rng, 1, 3);
  const s = r1 + r2;
  const p = r1 * r2;
  const coeffs = [1, -1.5 * s, 3 * p, 0];
  const f: CalcFunction = { kind: "poly", coeffs };
  const maxVal = evalCalcFn(f, r1);
  const minVal = evalCalcFn(f, r2);
  const ans = fmtNum(maxVal);
  const { choices, correctIndex } = makeChoices(
    rng, ans, numericDistractors(rng, maxVal, [minVal, -maxVal, r1, r2])
  );
  return {
    ...baseProblem("Extrema"),
    prompt: `Let f(x) = ${polyToText(coeffs)}. What is the local maximum value of f?`,
    choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: `f′(x) = 3(x − ${r1})(x − ${r2}), so critical numbers are x = ${r1} and x = ${r2}.`,
        reason: "Critical numbers are candidates for extrema",
        blanks: [{ label: "critical numbers", answer: `${r1}, ${r2}` }],
      },
      {
        instruction: `f′ changes from + to − at x = ${r1} (first derivative test), so f(${r1}) = ${ans} is the local maximum.`,
        reason: "First derivative test: + to − means a local maximum",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value: maxVal, tol: 1e-9, source: f, data: { r1, r2 } },
  };
}

function optimization(rng: RNG): CalcMCQProblem {
  const variant = randInt(rng, 0, 2);
  let prompt: string;
  let ans: string;
  let value: number;
  let data: Record<string, number | string>;
  let steps: CalcMCQProblem["steps"];
  if (variant === 0) {
    // fixed perimeter -> max area (square)
    const P = pick(rng, [60, 80, 100, 120]);
    prompt = `A farmer has ${P} feet of fencing to enclose a rectangular pen against a straight barn wall (no fence needed along the barn). What is the maximum area that can be enclosed?`;
    // against a barn: A = x(P - 2x), max at x = P/4, A = P^2/8
    value = (P * P) / 8;
    ans = fmtNum(value);
    data = { variant: 0, P };
    steps = [
      {
        instruction: `Let x be the depth. Then width = ${P} − 2x and A(x) = x(${P} − 2x).`,
        reason: "Express the area as a function of one variable",
        blanks: [{ label: "A(x)", answer: `${P}x − 2x²` }],
      },
      {
        instruction: `A′(x) = ${P} − 4x = 0 gives x = ${P / 4}. Maximum area: A(${P / 4}) =`,
        reason: "Critical number of A; endpoints give zero area, so this is the maximum",
        blanks: [{ label: "answer", answer: `${ans} ft²` }],
      },
    ];
  } else if (variant === 1) {
    // open-top box from 12x12 sheet
    value = 128;
    ans = "128";
    prompt = `An open-top box is formed by cutting x-by-x squares from the corners of a 12 in × 12 in sheet and folding up the sides. What value of x maximizes the volume, and what is that maximum volume? (Answer with the maximum volume, in in³.)`;
    data = { variant: 1 };
    steps = [
      {
        instruction: "V(x) = x(12 − 2x)². V′(x) = 0 gives x = 2 (x = 6 gives zero volume).",
        reason: "Critical numbers of the volume function; discard the degenerate one",
        blanks: [{ label: "x", answer: "2" }],
      },
      {
        instruction: "V(2) = 2(8)² =",
        blanks: [{ label: "answer", answer: "128 in³" }],
      },
    ];
  } else {
    // cylindrical can, fixed volume 1000 cm^3, minimize surface area -> calculator
    const V = 1000;
    const r = Math.cbrt(V / (2 * Math.PI));
    value = r;
    ans = r.toFixed(2);
    prompt = `A cylindrical can must hold ${V} cm³. What radius (in cm, to two decimal places) minimizes the surface area? (Calculator active.)`;
    data = { variant: 2, V };
    steps = [
      {
        instruction: `S(r) = 2πr² + 2${V}/r. S′(r) = 4πr − 2${V}/r² = 0 gives r = ∛(${V}/(2π)) ≈`,
        reason: "Minimize surface area: critical number of S(r)",
        blanks: [{ label: "answer", answer: `${ans} cm` }],
      },
    ];
  }
  const calculator = variant === 2;
  const distr = calculator
    ? [value + 1, value - 1, value * 2, value / 2].map((v) => v.toFixed(2))
    : numericDistractors(rng, value);
  const { choices, correctIndex } = makeChoices(rng, ans, distr);
  return {
    ...baseProblem("Optimization", calculator),
    prompt, choices, correctIndex,
    answer: ans,
    steps,
    verify: { kind: "number", value, tol: calculator ? 0.01 : 1e-9, data },
  };
}

// ── Tier 3 ────────────────────────────────────────────────────────────────────

function curveSketching(rng: RNG): CalcMCQProblem {
  // f'(x) = (x-r1)(x-r2) sign chart + inflection at midpoint
  const r1 = randInt(rng, -2, 1);
  const r2 = r1 + pick(rng, [2, 4]); // same parity -> integer midpoint
  const infl = (r1 + r2) / 2;
  const ask = pick(rng, ["max", "min", "infl"] as const);
  let prompt: string;
  let ansVal: number;
  if (ask === "max") {
    prompt = `f′(x) > 0 on (−∞, ${r1}) ∪ (${r2}, ∞) and f′(x) < 0 on (${r1}, ${r2}). At which x-value does f have a relative maximum?`;
    ansVal = r1;
  } else if (ask === "min") {
    prompt = `f′(x) > 0 on (−∞, ${r1}) ∪ (${r2}, ∞) and f′(x) < 0 on (${r1}, ${r2}). At which x-value does f have a relative minimum?`;
    ansVal = r2;
  } else {
    prompt = `f′′(x) > 0 on (${infl}, ∞) and f′′(x) < 0 on (−∞, ${infl}). At which x-value does the graph of f have a point of inflection?`;
    ansVal = infl;
  }
  const ans = fmtNum(ansVal);
  const { choices, correctIndex } = makeChoices(
    rng, ans, numericDistractors(rng, ansVal, [r1, r2, infl])
  );
  return {
    ...baseProblem("CurveSketching"),
    prompt, choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: ask === "infl"
          ? `Concavity changes at x = ${infl}:`
          : `f′ changes sign at x = ${ask === "max" ? r1 : r2}:`,
        reason: ask === "infl"
          ? "An inflection point is where concavity changes (f′′ changes sign)"
          : "First derivative test: + to − is a max, − to + is a min",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "text", text: ans, data: { r1, r2, infl, ask } },
  };
}

function relatedRates(rng: RNG): CalcMCQProblem {
  const variant = randInt(rng, 0, 2);
  let prompt: string;
  let value: number;
  let data: Record<string, number | string>;
  if (variant === 0) {
    // ladder: L=13, dx/dt=2 at x=5 -> dy/dt = -(x/y)(dx/dt) = -5/6
    const L = 13, x = 5, dxdt = 2;
    const y = Math.sqrt(L * L - x * x);
    value = -(x / y) * dxdt;
    prompt = `A 13-ft ladder slides down a wall. The bottom slides away from the wall at 2 ft/s when it is 5 ft from the wall. How fast (in ft/s) is the top sliding down at that moment? Give your answer to three decimal places. (Calculator active.)`;
    data = { variant: 0, L, x, dxdt };
  } else if (variant === 1) {
    // cone: dV/dt=10, r = h/3, find dh/dt at h=6
    // From first principles: V = (1/3)πr²h = (1/3)π(h/3)²h = πh³/27,
    // so dV/dt = (πh²/9)·dh/dt  →  dh/dt = 9·(dV/dt)/(πh²).
    const dVdt = 10, h = 6;
    value = (9 * dVdt) / (Math.PI * h * h);
    prompt = `Water pours into a conical tank (radius = height/3) at 10 cm³/s. How fast (in cm/s) is the water level rising when the water is 6 cm deep? Give your answer to three decimal places. (Calculator active.)`;
    data = { variant: 1, dVdt, h };
  } else {
    // sphere: dV/dt=100 at r=5
    const dVdt = 100, r = 5;
    value = dVdt / (4 * Math.PI * r * r);
    prompt = `Air is pumped into a spherical balloon at 100 cm³/s. How fast (in cm/s) is the radius increasing when the radius is 5 cm? Give your answer to three decimal places. (Calculator active.)`;
    data = { variant: 2, dVdt, r };
  }
  const ans = value.toFixed(3);
  const seen = new Set([ans]);
  const distr: string[] = [];
  for (const c of [value + 0.5, value - 0.5, value * 2, -value, value + 1]) {
    const s = c.toFixed(3);
    if (!seen.has(s)) { seen.add(s); distr.push(s); }
    if (distr.length >= 5) break;
  }
  const { choices, correctIndex } = makeChoices(rng, ans, distr);
  return {
    ...baseProblem("RelatedRates", true),
    prompt, choices, correctIndex,
    answer: ans,
    steps: [
      {
        instruction: "Relate the quantities, differentiate with respect to t, then substitute the known values:",
        reason: "Related rates: differentiate the constraint equation with respect to time",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "number", value, tol: 5e-4, data },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const DERIV_APPS_MAKERS: Maker[] = [
  { minDiff: 1, make: tangentLine },
  { minDiff: 2, make: normalLine },
  { minDiff: 2, make: incDec },
  { minDiff: 2, make: extrema },
  { minDiff: 2, make: optimization },
  { minDiff: 3, make: curveSketching },
  { minDiff: 3, make: relatedRates },
];

/** Generate n Applications of Derivatives MCQ problems at the given difficulty tier. */
export function generateDerivAppsProblems(rng: RNG, n: number, difficulty: DifficultyTier): CalcMCQProblem[] {
  return generateFromMakers(rng, n, DERIV_APPS_MAKERS, difficulty);
}

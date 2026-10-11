// CalculusLimits.ts
// AP Calculus — Limits & Continuity generators (AP Calc AB).
// Graphical, numerical, and algebraic limits, incl. one-sided and infinite.
//
// Every maker is pure + seeded. Difficulty tiers are cumulative:
//   1: graphical removable discontinuity, factor-and-cancel, numerical tables
//   2: + jump discontinuities (one-sided), infinite limits
//   3: + end behavior, difference quotients / rationalizing forms

import type { RNG } from "../math-utils";
import type { CalcFunction, CalcMCQProblem, Maker, DifficultyTier } from "./CalculusUtils";
import {
  randInt, pick,
  fmtNum,
  makeChoices, numericDistractors, infDistractors,
  generateFromMakers,
} from "./CalculusUtils";

const TOPIC_TAG = "limits" as const;
const TOPIC_LABEL = "Limits & Continuity";

/** "x − 3" / "x + 3" helper for display with signed constants. */
function xShift(a: number): string {
  return a >= 0 ? `x − ${fmtNum(a)}` : `x + ${fmtNum(-a)}`;
}

function baseProblem(subtype: CalcMCQProblem["subtype"]): Pick<CalcMCQProblem,
  "type" | "subtype" | "topicTag" | "topicLabel" | "calculator"> {
  return { type: "CALC_MCQ", subtype, topicTag: TOPIC_TAG, topicLabel: TOPIC_LABEL, calculator: false };
}

// ── Tier 1 ────────────────────────────────────────────────────────────────────

function graphicalRemovable(rng: RNG): CalcMCQProblem {
  // f(x) = (x^2 - a^2)/(x - a): removable discontinuity (hole) at (a, 2a)
  const a = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5]);
  const fn: CalcFunction = { kind: "rational", num: [1, 0, -a * a], den: [1, -a] };
  const L = 2 * a;
  const { choices, correctIndex } = makeChoices(rng, fmtNum(L), numericDistractors(rng, L));
  return {
    ...baseProblem("LimitGraphical"),
    prompt: `The graph of y = f(x) is shown. Use the graph to find lim(x→${a}) f(x).`,
    choices, correctIndex,
    answer: fmtNum(L),
    graph: {
      kind: "CalcGraph", fn,
      xMin: a - 4, xMax: a + 4, yMin: L - 4, yMax: L + 4,
      holes: [{ x: a, y: L }],
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `Approach x = ${a} from the left. The y-values approach:`,
        reason: "Read the limit from the graph: the y-values the curve approaches",
        blanks: [{ label: "left limit", answer: fmtNum(L) }],
      },
      {
        instruction: `Approach x = ${a} from the right. The y-values approach:`,
        reason: "Check the other side the same way",
        blanks: [{ label: "right limit", answer: fmtNum(L) }],
      },
      {
        instruction: "Both one-sided limits agree, so the limit is:",
        reason: "A two-sided limit exists exactly when both one-sided limits agree",
        blanks: [{ label: "answer", answer: fmtNum(L) }],
      },
    ],
    verify: { kind: "number", value: L, tol: 1e-9, source: fn, point: a },
  };
}

function algebraicCancel(rng: RNG): CalcMCQProblem {
  // (x^2 - a^2)/(x - a) -> 2a
  const a = pick(rng, [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
  const L = 2 * a;
  const fn: CalcFunction = { kind: "rational", num: [1, 0, -a * a], den: [1, -a] };
  const { choices, correctIndex } = makeChoices(rng, fmtNum(L), numericDistractors(rng, L));
  return {
    ...baseProblem("LimitAlgebraic"),
    prompt: `Find lim(x→${a}) (x² − ${a * a})/(${xShift(a)}).`,
    choices, correctIndex,
    answer: fmtNum(L),
    steps: [
      {
        instruction: `Direct substitution gives 0/0, so factor the numerator: x² − ${a * a} =`,
        reason: "0/0 is an indeterminate form — factor before substituting",
        blanks: [{ label: "factored", answer: `(x − ${a})(x + ${a})` }],
      },
      {
        instruction: `Cancel the common factor (${xShift(a)}): the limit becomes lim(x→${a}) (x + ${a}) =`,
        reason: "Cancel common factors, then direct substitution works",
        blanks: [{ label: "answer", answer: fmtNum(L) }],
      },
    ],
    verify: { kind: "number", value: L, tol: 1e-9, source: fn, point: a },
  };
}

function numericalTable(rng: RNG): CalcMCQProblem {
  // f(x) = (x^2 + x - 6)/(x + 3) = x - 2 for x != -3; estimate lim(x->-3) from table
  const c = -3;
  const L = -5;
  const fn: CalcFunction = { kind: "rational", num: [1, 1, -6], den: [1, 3] };
  const hs = [0.1, 0.01, 0.001];
  const rows: string[][] = [];
  for (const h of hs) rows.push([(c - h).toFixed(3), (L - h).toFixed(3)]);
  for (const h of [...hs].reverse()) rows.push([(c + h).toFixed(3), (L + h).toFixed(3)]);
  const { choices, correctIndex } = makeChoices(rng, fmtNum(L), numericDistractors(rng, L));
  return {
    ...baseProblem("LimitNumerical"),
    prompt: `The table shows values of f(x) for x near −3. Use the table to estimate lim(x→−3) f(x).`,
    choices, correctIndex,
    answer: fmtNum(L),
    table: { headers: ["x", "f(x)"], rows },
    steps: [
      {
        instruction: "As x approaches −3 from the left, f(x) approaches:",
        reason: "A table estimates a limit from values on each side",
        blanks: [{ label: "left", answer: fmtNum(L) }],
      },
      {
        instruction: "As x approaches −3 from the right, f(x) approaches:",
        reason: "Both sides must agree for the limit to exist",
        blanks: [{ label: "right", answer: fmtNum(L) }],
      },
      {
        instruction: "The estimated limit is:",
        blanks: [{ label: "answer", answer: fmtNum(L) }],
      },
    ],
    verify: { kind: "number", value: L, tol: 1e-9, source: fn, point: c },
  };
}

// ── Tier 2 ────────────────────────────────────────────────────────────────────

function oneSidedJump(rng: RNG): CalcMCQProblem {
  // Jump discontinuity: left piece m1*x+b1, right piece m2*x+b2
  const c = randInt(rng, 1, 3);
  const m1 = pick(rng, [1, 2]);
  const b1 = randInt(rng, 0, 3);
  const m2 = pick(rng, [-2, -1]);
  let b2 = randInt(rng, 0, 4);
  const L1 = m1 * c + b1;
  let L2 = m2 * c + b2;
  if (L2 === L1) { b2 += 2; L2 = m2 * c + b2; }
  const left = randInt(rng, 0, 1) === 0;
  const L = left ? L1 : L2;
  const sideSym = left ? "⁻" : "⁺";
  const fn: CalcFunction = { kind: "poly", coeffs: [m1, b1] };
  const fn2: CalcFunction = { kind: "poly", coeffs: [m2, b2] };
  const { choices, correctIndex } = makeChoices(
    rng, fmtNum(L), numericDistractors(rng, L, [L1, L2, (L1 + L2) / 2])
  );
  return {
    ...baseProblem("LimitOneSided"),
    prompt: `The graph of y = f(x) is shown. Find lim(x→${c}${sideSym}) f(x).`,
    choices, correctIndex,
    answer: fmtNum(L),
    graph: {
      kind: "CalcGraph", fn, fn2,
      fnDomain: [c - 4, c], fn2Domain: [c, c + 4],
      xMin: c - 4, xMax: c + 4,
      yMin: Math.min(L1, L2) - 2, yMax: Math.max(L1, L2) + 2,
      holes: [{ x: c, y: L1 }, { x: c, y: L2 }],
      solids: [{ x: c, y: left ? L1 : L2 }],
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `Only consider x-values ${left ? "less than" : "greater than"} ${c}. Trace the graph toward x = ${c} from that side:`,
        reason: "A one-sided limit uses values from only one side of the point",
        blanks: [{ label: "one-sided limit", answer: fmtNum(L) }],
      },
      {
        instruction: `Note the open circle at (${c}, ${fmtNum(left ? L1 : L2)}) — the limit follows the approaching values, giving:`,
        reason: "Open circles are approached but never taken; the limit follows the approach",
        blanks: [{ label: "answer", answer: fmtNum(L) }],
      },
    ],
    verify: { kind: "number", value: L, tol: 1e-9, source: left ? fn : fn2, point: c, side: left ? "left" : "right" },
  };
}

function infiniteLimit(rng: RNG): CalcMCQProblem {
  // k/(x - c) or k/(x - c)^2, one-sided -> +/- infinity
  const c = randInt(rng, 1, 3);
  const k = pick(rng, [1, 2, -1, -2]);
  const squared = randInt(rng, 0, 1) === 1;
  const fn: CalcFunction = squared
    ? { kind: "rational", num: [k], den: [1, -2 * c, c * c] }
    : { kind: "rational", num: [k], den: [1, -c] };
  const side: "left" | "right" = squared ? pick(rng, ["left", "right"]) : (randInt(rng, 0, 1) === 0 ? "left" : "right");
  const sideSym = side === "left" ? "⁻" : "⁺";
  const sgn = squared ? Math.sign(k) : (side === "right" ? Math.sign(k) : -Math.sign(k));
  const ans = sgn > 0 ? "∞" : "-∞";
  const denomText = squared ? `(${xShift(c)})²` : `(${xShift(c)})`;
  const { choices, correctIndex } = makeChoices(rng, ans, infDistractors(ans as "∞" | "-∞"));
  return {
    ...baseProblem("LimitInfinite"),
    prompt: `Find lim(x→${c}${sideSym}) ${fmtNum(k)}/${denomText}.`,
    choices, correctIndex,
    answer: ans,
    graph: {
      kind: "CalcGraph", fn,
      xMin: c - 4, xMax: c + 4, yMin: -8, yMax: 8,
      asymptotes: [c],
      fnLabel: "y = f(x)",
    },
    steps: [
      {
        instruction: `As x → ${c}${sideSym}, the denominator ${denomText} approaches 0${squared ? "" : side === "right" ? "⁺" : "⁻"}. The fraction grows without bound:`,
        reason: "Nonzero numerator over a denominator approaching 0 gives unbounded growth",
        blanks: [{ label: "sign", answer: sgn > 0 ? "positive" : "negative" }],
      },
      {
        instruction: "So the limit is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: { kind: "text", text: ans, source: fn, point: c, side },
  };
}

// ── Tier 3 ────────────────────────────────────────────────────────────────────

function endBehavior(rng: RNG): CalcMCQProblem {
  const variant = randInt(rng, 0, 2);
  let fn: CalcFunction;
  let prompt: string;
  let ans: string;
  let verify: CalcMCQProblem["verify"];
  if (variant === 0) {
    // deg num < deg den -> 0
    fn = { kind: "rational", num: [3, 1], den: [1, 2, 1] };
    prompt = `Find lim(x→∞) (3x + 1)/(x² + 2x + 1).`;
    ans = "0";
    verify = { kind: "number", value: 0, tol: 1e-6, source: fn, atInfinity: "pos" };
  } else if (variant === 1) {
    // equal degrees -> ratio of leading coefficients
    fn = { kind: "rational", num: [4, 0, 3], den: [2, 0, -1] };
    prompt = `Find lim(x→∞) (4x² + 3)/(2x² − 1).`;
    ans = "2";
    verify = { kind: "number", value: 2, tol: 1e-6, source: fn, atInfinity: "pos" };
  } else {
    // deg num > deg den -> infinite; direction depends on sign
    const neg = randInt(rng, 0, 1) === 1;
    fn = { kind: "rational", num: [2, 0, 1], den: [1, -3] };
    prompt = neg ? `Find lim(x→−∞) (2x² + 1)/(x − 3).` : `Find lim(x→∞) (2x² + 1)/(x − 3).`;
    ans = neg ? "-∞" : "∞";
    verify = { kind: "text", text: ans, source: fn, atInfinity: neg ? "neg" : "pos" };
  }
  const distractors = ans === "0"
    ? ["1", "3", "∞", "does not exist"]
    : ans === "2"
      ? ["1/2", "4", "0", "∞"]
      : infDistractors(ans as "∞" | "-∞");
  const { choices, correctIndex } = makeChoices(rng, ans, distractors);
  return {
    ...baseProblem("LimitEndBehavior"),
    prompt, choices, correctIndex, answer: ans,
    steps: [
      {
        instruction: "Compare the degrees of the numerator and denominator:",
        reason: "End behavior of a rational function is decided by comparing degrees",
        blanks: [{ label: "degrees", answer: variant === 0 ? "1 < 2" : variant === 1 ? "2 = 2" : "2 > 1" }],
      },
      {
        instruction: variant === 0
          ? "Denominator grows faster, so the fraction shrinks to:"
          : variant === 1
            ? "The limit is the ratio of leading coefficients, 4/2 ="
            : "The numerator dominates; the sign gives:",
        reason: variant === 0
          ? "Lower-degree numerator over higher-degree denominator → 0"
          : variant === 1
            ? "Equal degrees → ratio of leading coefficients"
            : "Higher-degree numerator → unbounded; the sign decides ±∞",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify,
  };
}

function differenceQuotient(rng: RNG): CalcMCQProblem {
  const variant = randInt(rng, 0, 2);
  let prompt: string;
  let ans: string;
  let ansValue: number;
  let source: CalcFunction | undefined;
  let point: number | undefined;
  let conj = ""; // conjugate hint for the sqrt variant
  if (variant === 0) {
    // lim(h->0) ((c+h)^2 - c^2)/h = 2c
    const c = randInt(rng, 2, 9);
    prompt = `Find lim(h→0) (( ${c} + h)² − ${c * c})/h.`;
    ansValue = 2 * c;
    ans = fmtNum(ansValue);
    source = { kind: "rational", num: [1, 2 * c, 0], den: [1, 0] }; // ((c+h)^2-c^2)/h as fn of h
    point = 0;
  } else if (variant === 1) {
    // (x^3 - a^3)/(x - a) -> 3a^2
    const a = pick(rng, [2, 3]);
    prompt = `Find lim(x→${a}) (x³ − ${a * a * a})/(${xShift(a)}).`;
    ansValue = 3 * a * a;
    ans = fmtNum(ansValue);
    source = { kind: "rational", num: [1, 0, 0, -a * a * a], den: [1, -a] };
    point = a;
  } else {
    // (sqrt(x) - sqrt(a))/(x - a) -> 1/(2 sqrt(a)); a a perfect square
    const r = pick(rng, [2, 3, 4, 5]);
    const a = r * r;
    prompt = `Find lim(x→${a}) (√x − ${r})/(x − ${a}).`;
    ansValue = 1 / (2 * r);
    ans = fmtNum(ansValue);
    conj = `(√x + ${r})`;
    source = undefined; // sqrt is outside the ADT; verified via text match only
    point = undefined;
  }
  const { choices, correctIndex } = makeChoices(rng, ans, numericDistractors(rng, ansValue));
  return {
    ...baseProblem("LimitDifferenceQuotient"),
    prompt, choices, correctIndex, answer: ans,
    steps: [
      {
        instruction: variant === 2
          ? `Rationalize: multiply the top and bottom by the conjugate ${conj}, then cancel the common factor:`
          : "This is a 0/0 form. Expand or factor, then cancel:",
        reason: variant === 0
          ? "This limit is the definition of the derivative of x² at x = c"
          : variant === 1
            ? "Difference of cubes factors: a³ − b³ = (a − b)(a² + ab + b²)"
            : "Rationalizing removes the square roots from the 0/0 form",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    verify: source && point !== undefined
      ? { kind: "number", value: ansValue, tol: 1e-9, source, point }
      : { kind: "text", text: ans },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const LIMIT_MAKERS: Maker[] = [
  { minDiff: 1, make: graphicalRemovable },
  { minDiff: 1, make: algebraicCancel },
  { minDiff: 1, make: numericalTable },
  { minDiff: 2, make: oneSidedJump },
  { minDiff: 2, make: infiniteLimit },
  { minDiff: 3, make: endBehavior },
  { minDiff: 3, make: differenceQuotient },
];

/** Generate n Limits & Continuity MCQ problems at the given difficulty tier. */
export function generateLimitProblems(rng: RNG, n: number, difficulty: DifficultyTier): CalcMCQProblem[] {
  return generateFromMakers(rng, n, LIMIT_MAKERS, difficulty);
}

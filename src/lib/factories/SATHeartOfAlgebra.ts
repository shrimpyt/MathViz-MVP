// SATHeartOfAlgebra.ts
// SAT "Heart of Algebra" makers: linear equations, systems, inequalities,
// linear functions. Difficulty tiers are cumulative: tier d may draw any
// variant from tiers 1..d (1 = direct single-step, 2 = backwards/negatives,
// 3 = multi-step or word problems).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { SATDifficulty, SATProblem } from "../satTypes";
import {
  q,
  qVal,
  qLabel,
  qForms,
  assembleProblem,
  buildMCQ,
  chooseFormat,
  pickDistractors,
  tier,
  randIntAvoid,
  type SATMaker,
  type DistractorSpec,
} from "./SATShared";

// ── small formatters ──────────────────────────────────────────────────────────

/** "2x", "−x", "3y" — sign-aware single term. */
function term(c: number, v: string): string {
  const body = Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`;
  return c < 0 ? `−${body}` : body;
}

/** "2x + 3y", "−x − 4y", "5x" — left side of a linear equation. */
function linLeft(a: number, b: number): string {
  if (b === 0) return term(a, "x");
  const sep = b < 0 ? "−" : "+";
  return `${term(a, "x")} ${sep} ${term(Math.abs(b), "y")}`;
}

function linEq(a: number, b: number, c: number): string {
  return `${linLeft(a, b)} = ${c}`;
}

// ── Maker 1: one-variable linear equations (H.A.1) ─────────────────────────────

function makeLinearEquation1Var(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  let a: number, b: number, x: number, c: number, distributed: boolean;
  if (t === 1) {
    a = randInt(rng, 2, 9);
    x = randInt(rng, 2, 9);
    b = randInt(rng, 1, 9);
    c = a * x + b;
    distributed = false;
  } else if (t === 2) {
    a = pick(rng, [-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]);
    x = randIntAvoid(rng, -9, 9, [0]);
    b = randIntAvoid(rng, -12, 12, [0]);
    c = a * x + b;
    distributed = false;
  } else {
    // a(x + b) = c — must divide before subtracting
    a = randInt(rng, 2, 6);
    x = randInt(rng, 2, 9);
    b = randInt(rng, 1, 6);
    c = a * (x + b);
    distributed = true;
  }

  const xFrac = q(x);
  const stem = distributed
    ? `If ${a}(x + ${b}) = ${c}, what is the value of x?`
    : `If ${term(a, "x")}${b < 0 ? ` − ${Math.abs(b)}` : ` + ${b}`} = ${c}, what is the value of x?`;

  const explanation = distributed
    ? `Divide both sides by ${a}: x + ${b} = ${c / a}. Subtract ${b}: x = ${x}.`
    : `Subtract ${b < 0 ? `(${b})` : b} from both sides: ${term(a, "x")} = ${c - b}. Divide by ${a}: x = ${x}.`;

  const key = { label: qLabel(xFrac), value: qVal(xFrac) };
  const pool: DistractorSpec[] = distributed
    ? [
        {
          label: qLabel(q(c - a - b)),
          value: qVal(q(c - a - b)),
          misconception: "order-of-operations",
          note: "Subtracted a instead of dividing by a first.",
        },
        {
          label: qLabel(q(c + a * b, a)),
          value: qVal(q(c + a * b, a)),
          misconception: "sign-flip",
          note: "Added b to both sides instead of subtracting b.",
        },
        {
          label: qLabel(q(c - b, a)),
          value: qVal(q(c - b, a)),
          misconception: "order-of-operations",
          note: "Distributed incorrectly — treated it as ax + b = c.",
        },
        {
          label: qLabel(q(x - 1)),
          value: qVal(q(x - 1)),
          misconception: "off-by-one",
          note: "Arithmetic slip in the final division step.",
        },
      ]
    : [
        {
          label: qLabel(q(c + b, a)),
          value: qVal(q(c + b, a)),
          misconception: "sign-flip",
          note: "Added b to both sides instead of subtracting b.",
        },
        {
          label: qLabel(q(c - a * b, a)),
          value: qVal(q(c - a * b, a)),
          misconception: "order-of-operations",
          note: "Divided by a before subtracting b.",
        },
        {
          label: qLabel(q(x + 1)),
          value: qVal(q(x + 1)),
          misconception: "off-by-one",
          note: "Arithmetic slip in the final division step.",
        },
        {
          label: qLabel(q(x - 1)),
          value: qVal(q(x - 1)),
          misconception: "off-by-one",
          note: "Arithmetic slip in the final division step.",
        },
      ];

  // Guard: tier-2 negatives can theoretically collide (e.g. x+1 === -x when
  // x = -1/2 — impossible here since x is a nonzero integer; (c+b)/a vs x
  // differ because b ≠ 0). buildMCQ double-checks and throws regardless.
  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT",
      format,
      domain: "HeartOfAlgebra",
      subdomain: "LinearEquation1Var",
      standard: "H.A.1",
      difficulty,
      stem,
      options,
      keyIndex,
      key: key.label,
      keyValue: key.value,
      explanation,
      verify: {
        params: { a, b, c, distributed: distributed ? 1 : 0, x },
        note: "Solve ax+b=c (or a(x+b)=c) for x; check by substitution.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "HeartOfAlgebra",
    subdomain: "LinearEquation1Var",
    standard: "H.A.1",
    difficulty,
    stem,
    key,
    explanation,
    verify: {
      params: { a, b, c, distributed: distributed ? 1 : 0, x },
      note: "Solve ax+b=c (or a(x+b)=c) for x; check by substitution.",
    },
    format,
    gridInForms: qForms(xFrac),
  });
}

// ── Maker 2: systems of two linear equations (H.A.3) ──────────────────────────

function makeSystem2x2(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);
  const askSum = t === 3;

  const lo = t === 1 ? 1 : -6;
  const hi = 6;
  const x0 = randIntAvoid(rng, lo, hi, [0]);
  const y0 = randIntAvoid(rng, lo, hi, [0]);
  let a1 = 1, b1 = 0, a2 = 0, b2 = 1; // replaced by the loop below
  for (let tries = 0; tries < 60; tries++) {
    const cLo = t === 1 ? 1 : -5;
    const ta1 = randInt(rng, cLo, 5);
    const tb1 = randInt(rng, cLo, 5);
    const ta2 = randInt(rng, cLo, 5);
    const tb2 = randInt(rng, cLo, 5);
    if (ta1 === 0 && tb1 === 0) continue;
    if (ta2 === 0 && tb2 === 0) continue;
    if (ta1 * tb2 - ta2 * tb1 === 0) continue;
    a1 = ta1; b1 = tb1; a2 = ta2; b2 = tb2;
    break;
  }
  const c1 = a1 * x0 + b1 * y0;
  const c2 = a2 * x0 + b2 * y0;

  const askX = !askSum && rng() < 0.5;
  const ansVal = askSum ? x0 + y0 : askX ? x0 : y0;
  const ansFrac = q(ansVal);
  const key = { label: qLabel(ansFrac), value: qVal(ansFrac) };

  const stem = askSum
    ? `If ${linEq(a1, b1, c1)} and ${linEq(a2, b2, c2)}, what is the value of x + y?`
    : `If ${linEq(a1, b1, c1)} and ${linEq(a2, b2, c2)}, what is the value of ${askX ? "x" : "y"}?`;

  const explanation = askSum
    ? `Solve the system: x = ${x0}, y = ${y0}. Then x + y = ${x0} + ${y0} = ${ansVal}.`
    : `Solve the system by elimination or substitution: ${askX ? `x` : `y`} = ${ansVal} (with ${askX ? `y` : `x`} = ${askX ? y0 : x0}).`;

  const pool: DistractorSpec[] = askSum
    ? [
        {
          label: qLabel(q(x0 - y0)),
          value: x0 - y0,
          misconception: "wrong-variable",
          note: "Found x − y instead of x + y.",
        },
        {
          label: qLabel(q(-(x0 + y0))),
          value: -(x0 + y0),
          misconception: "sign-flip",
          note: "Sign error when combining the two values.",
        },
        {
          label: qLabel(q(x0 + y0 + 1)),
          value: x0 + y0 + 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final addition.",
        },
        {
          label: qLabel(q(x0 + y0 - 1)),
          value: x0 + y0 - 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final addition.",
        },
      ]
    : [
        {
          label: qLabel(q(askX ? y0 : x0)),
          value: askX ? y0 : x0,
          misconception: "wrong-variable",
          note: `Solved for ${askX ? "y" : "x"} instead of ${askX ? "x" : "y"}.`,
        },
        {
          label: qLabel(q(-ansVal)),
          value: -ansVal,
          misconception: "sign-flip",
          note: "Sign error during elimination.",
        },
        {
          label: qLabel(q(ansVal + 1)),
          value: ansVal + 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final step.",
        },
        {
          label: qLabel(q(ansVal - 1)),
          value: ansVal - 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final step.",
        },
      ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT",
      format,
      domain: "HeartOfAlgebra",
      subdomain: "System2x2",
      standard: "H.A.3",
      difficulty,
      stem,
      options,
      keyIndex,
      key: key.label,
      keyValue: key.value,
      explanation,
      verify: {
        params: { a1: a1, b1: b1, c1, a2: a2, b2: b2, c2, askX: askX ? 1 : 0, askSum: askSum ? 1 : 0 },
        note: "Cramer/ elimination; verify by substituting into both equations.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "HeartOfAlgebra",
    subdomain: "System2x2",
    standard: "H.A.3",
    difficulty,
    stem,
    key,
    explanation,
    verify: {
      params: { a1: a1, b1: b1, c1, a2: a2, b2: b2, c2, askX: askX ? 1 : 0, askSum: askSum ? 1 : 0 },
      note: "Cramer/elimination; verify by substituting into both equations.",
    },
    format,
    gridInForms: qForms(ansFrac),
  });
}

// ── Maker 3: linear inequalities (H.A.2) — MCQ only ────────────────────────────

const INEQUALITY_OPS = ["<", ">", "≤", "≥"] as const;

function flipOp(op: (typeof INEQUALITY_OPS)[number]): (typeof INEQUALITY_OPS)[number] {
  if (op === "<") return ">";
  if (op === ">") return "<";
  if (op === "≤") return "≥";
  return "≤";
}

function makeLinearInequality(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);

  let a: number;
  if (t === 1) {
    a = randInt(rng, 2, 9);
  } else {
    // negative coefficient → the sign must flip (the tested skill)
    a = -randInt(rng, 2, 9);
  }
  const k = randIntAvoid(rng, t === 1 ? 1 : -9, 9, [0]); // boundary
  const b = t === 3 ? randIntAvoid(rng, -12, 12, [0]) : randInt(rng, 1, 9);
  const c = a * k + b;
  const op = pick(rng, INEQUALITY_OPS);
  const correctOp = a < 0 ? flipOp(op) : op;

  const key = { label: `x ${correctOp} ${k}`, value: k };
  const stem =
    `If ${term(a, "x")}${b < 0 ? ` − ${Math.abs(b)}` : ` + ${b}`} ${op} ${c}, ` +
    `which of the following is true?`;

  const explanation =
    `Solve for the boundary: ${term(a, "x")} ${op} ${c - b}, so x ${correctOp} ${k}` +
    (a < 0 ? ` (the sign flips because we divided by ${a}, a negative number).` : ".");

  // Distractors: for a < 0 the classic trap is forgetting the flip; for
  // a > 0 the trap is flipping when no flip is needed. Both are genuine
  // documented errors. String-level distinctness from the key is guaranteed
  // in both cases (verified by the matrix suite).
  const d1 = { label: a < 0 ? `x ${op} ${k}` : `x ${flipOp(correctOp)} ${k}`, value: k + 0.5 };
  const d2 = { label: `x ${correctOp} ${-k}`, value: -k + 0.25 };
  const d3b = k + (k > 0 ? 1 : -1);
  const d3 = { label: `x ${correctOp} ${d3b}`, value: d3b + 0.75 };
  // value offsets (+0.5 etc.) keep numeric collision checks meaningful only
  // as "not equal to the key"; correctness is decided by the full string.
  const pool: DistractorSpec[] = [
    {
      label: d1.label,
      value: d1.value,
      misconception: "inequality-flip-missed",
      note: a < 0
        ? "Forgot to flip the inequality sign when dividing by a negative number."
        : "Flipped the inequality sign even though the coefficient is positive.",
    },
    {
      label: d2.label,
      value: d2.value,
      misconception: "sign-flip",
      note: "Sign error when solving for the boundary value.",
    },
    {
      label: d3.label,
      value: d3.value,
      misconception: "off-by-one",
      note: "Arithmetic slip finding the boundary.",
    },
  ];

  const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
  return {
    type: "SAT",
    format: "MCQ",
    domain: "HeartOfAlgebra",
    subdomain: "LinearInequality",
    standard: "H.A.2",
    difficulty,
    stem,
    options,
    keyIndex,
    key: key.label,
    keyValue: key.value,
    explanation,
    verify: {
      params: { a, b, c, op, boundary: k, correctOp },
      note: "Boundary k=(c-b)/a; flip direction iff a<0. Correctness = exact (boundary, direction) pair.",
    },
  };
}

// ── Maker 4: linear functions (H.A.4) ─────────────────────────────────────────

function makeLinearFunction(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  const m = t === 1 ? randInt(rng, 1, 6) : randIntAvoid(rng, -6, 6, [0]);
  const b = t === 1 ? randInt(rng, 1, 9) : randIntAvoid(rng, -9, 9, [0]);

  if (t === 3) {
    // Word problem: C(g) = rg + base
    const rate = randInt(rng, 2, 9);
    const base = randInt(rng, 10, 40);
    const g = randInt(rng, 3, 12);
    const cost = rate * g + base;
    const costFrac = q(cost);
    const key = { label: qLabel(costFrac), value: qVal(costFrac) };
    const stem =
      `A phone plan charges a $${base} monthly fee plus $${rate} per gigabyte of data. ` +
      `If C(g) = ${rate}g + ${base} gives the monthly cost in dollars for g gigabytes, ` +
      `what is the cost for ${g} gigabytes?`;
    const explanation = `C(${g}) = ${rate}(${g}) + ${base} = ${rate * g} + ${base} = ${cost}.`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(base * g + rate)),
        value: base * g + rate,
        misconception: "order-of-operations",
        note: "Swapped the rate and the flat fee in the formula.",
      },
      {
        label: qLabel(q(rate * (g + base))),
        value: rate * (g + base),
        misconception: "order-of-operations",
        note: "Multiplied the rate by the fee too — added before multiplying.",
      },
      {
        label: qLabel(q(cost + rate)),
        value: cost + rate,
        misconception: "off-by-one",
        note: "Counted one extra gigabyte.",
      },
      {
        label: qLabel(q(cost - rate)),
        value: cost - rate,
        misconception: "off-by-one",
        note: "Counted one gigabyte too few.",
      },
      {
        label: qLabel(q(base + rate)),
        value: base + rate,
        misconception: "added-instead-of-multiplied",
        note: "Added the fee and the rate instead of multiplying the rate by gigabytes.",
      },
      {
        label: qLabel(q(rate * g)),
        value: rate * g,
        misconception: "order-of-operations",
        note: "Forgot to add the flat monthly fee.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "HeartOfAlgebra", subdomain: "LinearFunction",
        standard: "H.A.4", difficulty, stem, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: {
          params: { rate, base, g, word: 1 },
          note: "cost = rate*g + base.",
        },
      };
    }
    return assembleProblem(rng, {
      domain: "HeartOfAlgebra", subdomain: "LinearFunction", standard: "H.A.4",
      difficulty, stem, key, explanation,
      verify: { params: { rate, base, g, word: 1 }, note: "cost = rate*g + base." },
      format, gridInForms: qForms(costFrac),
    });
  }

  const solveForX = t === 2 && rng() < 0.5;
  if (solveForX) {
    const x = randIntAvoid(rng, -9, 9, [0]);
    const v = m * x + b;
    const xFrac = q(x);
    const key = { label: qLabel(xFrac), value: qVal(xFrac) };
    // Single-variable display for f(x) = mx + b.
    const fx = `${term(m, "x")}${b < 0 ? ` − ${Math.abs(b)}` : ` + ${b}`}`;
    const stem = `The function f is defined by f(x) = ${fx}. What value of x satisfies f(x) = ${v}?`;
    const explanation = `${term(m, "x")} = ${v - b}, so x = ${x}.`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(v + b, m)),
        value: qVal(q(v + b, m)),
        misconception: "sign-flip",
        note: "Added b to both sides instead of subtracting b.",
      },
      {
        label: qLabel(q((v - b) * m)),
        value: (v - b) * m,
        misconception: "order-of-operations",
        note: "Multiplied by m instead of dividing by m.",
      },
      {
        label: qLabel(q(x + 1)),
        value: x + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
      {
        label: qLabel(q(x - 1)),
        value: x - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "HeartOfAlgebra", subdomain: "LinearFunction",
        standard: "H.A.4", difficulty, stem, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: {
          params: { m, b, v, solveForX: 1 },
          note: "x = (v-b)/m; check f(x) = v by substitution.",
        },
      };
    }
    return assembleProblem(rng, {
      domain: "HeartOfAlgebra", subdomain: "LinearFunction", standard: "H.A.4",
      difficulty, stem, key, explanation,
      verify: { params: { m, b, v, solveForX: 1 }, note: "x = (v-b)/m; check f(x) = v." },
      format, gridInForms: qForms(xFrac),
    });
  }

  // tier 1–2: evaluate f(k)
  const k = t === 1 ? randInt(rng, 2, 9) : randIntAvoid(rng, -9, 9, [0]);
  const val = m * k + b;
  const valFrac = q(val);
  const key = { label: qLabel(valFrac), value: qVal(valFrac) };
  const fx = `${term(m, "x")}${b < 0 ? ` − ${Math.abs(b)}` : ` + ${b}`}`;
  const stem = `The function f is defined by f(x) = ${fx}. What is the value of f(${k})?`;
  const explanation = `f(${k}) = ${m}(${k}) ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${val}.`;
  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(b * k + m)),
      value: b * k + m,
      misconception: "wrong-variable",
      note: "Swapped the slope and the intercept.",
    },
    {
      label: qLabel(q(-val)),
      value: -val,
      misconception: "dropped-negative",
      note: "Dropped a negative sign while multiplying.",
    },
    {
      label: qLabel(q(m * (k + b))),
      value: m * (k + b),
      misconception: "order-of-operations",
      note: "Added b before multiplying by m.",
    },
    {
      label: qLabel(q(val + 1)),
      value: val + 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
    {
      label: qLabel(q(val - 1)),
      value: val - 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
  ];
  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "HeartOfAlgebra", subdomain: "LinearFunction",
      standard: "H.A.4", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { m, b, k, solveForX: 0 },
        note: "f(k) = m*k + b.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "HeartOfAlgebra", subdomain: "LinearFunction", standard: "H.A.4",
    difficulty, stem, key, explanation,
    verify: { params: { m, b, k, solveForX: 0 }, note: "f(k) = m*k + b." },
    format, gridInForms: qForms(valFrac),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export const SAT_HOA_MAKERS: SATMaker[] = [
  makeLinearEquation1Var,
  makeSystem2x2,
  makeLinearInequality,
  makeLinearFunction,
];

/** Generate n Heart of Algebra problems using the provided RNG. */
export function generateSATHeartOfAlgebraProblems(
  rng: RNG,
  n: number,
  difficulty: SATDifficulty
): SATProblem[] {
  return Array.from({ length: n }, () => {
    const maker = SAT_HOA_MAKERS[Math.floor(rng() * SAT_HOA_MAKERS.length)];
    return maker(rng, difficulty);
  });
}

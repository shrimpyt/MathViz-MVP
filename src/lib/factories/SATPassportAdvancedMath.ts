// SATPassportAdvancedMath.ts
// SAT "Passport to Advanced Math" makers: quadratic equations, equivalent
// expressions, nonlinear functions, radical-form nonlinear equations.
// Difficulty tiers are cumulative: tier d may draw any variant from tiers 1..d.

import type { RNG } from "../math-utils";
import { randInt } from "../math-utils";
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

// ── Maker 1: quadratic equations with integer roots (P.A.2) ───────────────────

function makeQuadraticRoots(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  // Distinct integer roots r1 < r2, both nonzero (a zero root collapses the
  // distractor pools: e.g. r2 = 0 makes -r2 and r2+1 collide with the key).
  const r1 = t === 1 ? randInt(rng, 1, 6) : randIntAvoid(rng, -9, 9, [0]);
  let r2 = t === 1 ? r1 + randInt(rng, 1, 5) : r1 + randInt(rng, 1, 6);
  if (r2 === 0) r2 += 6;
  const b = -(r1 + r2);
  const c = r1 * r2;

  const ask = t === 1 ? "greater" : t === 2 ? "sum" : "product";
  const ansVal = ask === "greater" ? r2 : ask === "sum" ? r1 + r2 : r1 * r2;
  const ansFrac = q(ansVal);
  const key = { label: qLabel(ansFrac), value: qVal(ansFrac) };

  const bStr = b < 0 ? `− ${-b}` : b > 0 ? `+ ${b}` : "";
  const cStr = c < 0 ? `− ${-c}` : `+ ${c}`;
  const eq = `x² ${bStr}x ${cStr} = 0`.replace("x  = ", "x = ").replace(/x \+ 0x/, "x");
  const stem =
    ask === "greater"
      ? `If ${eq}, what is the greater solution for x?`
      : ask === "sum"
      ? `If ${eq}, what is the sum of the solutions for x?`
      : `If ${eq}, what is the product of the solutions for x?`;

  const explanation =
    ask === "greater"
      ? `Factor: (x − ${r1})(x − ${r2}) = 0, so x = ${r1} or x = ${r2}. The greater solution is ${r2}.`
      : ask === "sum"
      ? `Factor: (x − ${r1})(x − ${r2}) = 0, so the solutions are ${r1} and ${r2}; their sum is ${ansVal}.`
      : `Factor: (x − ${r1})(x − ${r2}) = 0, so the solutions are ${r1} and ${r2}; their product is ${ansVal}.`;

  let pool: DistractorSpec[];
  if (ask === "greater") {
    pool = [
      {
        label: qLabel(q(-r2)),
        value: -r2,
        misconception: "root-sign-error",
        note: "Sign error when factoring — negated the root.",
      },
      {
        label: qLabel(q(r1)),
        value: r1,
        misconception: "wrong-variable",
        note: "Chose the lesser solution instead of the greater one.",
      },
      {
        label: qLabel(q(r2 + 1)),
        value: r2 + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
      {
        label: qLabel(q(r2 - 1)),
        value: r2 - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
    ];
  } else if (ask === "sum") {
    pool = [
      {
        label: qLabel(q(r1 * r2)),
        value: r1 * r2,
        misconception: "order-of-operations",
        note: "Found the product of the solutions instead of the sum.",
      },
      {
        label: qLabel(q(-(r1 + r2))),
        value: -(r1 + r2),
        misconception: "sign-flip",
        note: "Sign error combining the two solutions.",
      },
      {
        label: qLabel(q(r2 - r1)),
        value: r2 - r1,
        misconception: "order-of-operations",
        note: "Subtracted the solutions instead of adding them.",
      },
      {
        label: qLabel(q(r1 + r2 + 1)),
        value: r1 + r2 + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip adding the solutions.",
      },
    ];
  } else {
    pool = [
      {
        label: qLabel(q(r1 + r2)),
        value: r1 + r2,
        misconception: "order-of-operations",
        note: "Added the solutions instead of multiplying them.",
      },
      {
        label: qLabel(q(-(r1 * r2))),
        value: -(r1 * r2),
        misconception: "sign-flip",
        note: "Sign error multiplying the two solutions.",
      },
      {
        label: qLabel(q(r1 * r2 + 1)),
        value: r1 * r2 + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
      {
        label: qLabel(q(r1 * r2 - 1)),
        value: r1 * r2 - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
    ];
  }

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "PassportAdvancedMath", subdomain: "QuadraticRoots",
      standard: "P.A.2", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { r1, r2, ask },
        note: "Roots r1,r2 of x²+bx+c; check each root by substitution.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "PassportAdvancedMath", subdomain: "QuadraticRoots", standard: "P.A.2",
    difficulty, stem, key, explanation,
    verify: { params: { r1, r2, ask }, note: "Roots r1,r2; check by substitution." },
    format, gridInForms: qForms(ansFrac),
  });
}

// ── Maker 2: equivalent expressions (P.A.1) ────────────────────────────────────

function makeEquivalentExpressions(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  if (t === 3) {
    // (2x + a)(x + b) = 2x² + (a + 2b)x + ab — ask for the middle coefficient.
    const a = randIntAvoid(rng, -6, 6, [0]);
    const b = randIntAvoid(rng, -6, 6, [0]);
    const mid = a + 2 * b;
    const midFrac = q(mid);
    const key = { label: qLabel(midFrac), value: qVal(midFrac) };
    const aStr = a < 0 ? `− ${-a}` : `+ ${a}`;
    const bStr = b < 0 ? `− ${-b}` : `+ ${b}`;
    const stem =
      `If (2x ${aStr})(x ${bStr}) is written in the form 2x² + kx + m, what is the value of k?`;
    const explanation =
      `(2x ${aStr})(x ${bStr}) = 2x² + ${2 * b}x ${aStr}x ${a < 0 || b < 0 ? "" : "+"} ${a * b} = 2x² + ${mid}x + ${a * b}. So k = ${mid}.`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(a + b)),
        value: a + b,
        misconception: "foil-error",
        note: "Treated it as (x + a)(x + b) — ignored the leading 2.",
      },
      {
        label: qLabel(q(2 * (a + b))),
        value: 2 * (a + b),
        misconception: "order-of-operations",
        note: "Distributed the 2 to both constants instead of just one term.",
      },
      {
        label: qLabel(q(-mid)),
        value: -mid,
        misconception: "sign-flip",
        note: "Sign error combining the middle terms.",
      },
      {
        label: qLabel(q(mid + 1)),
        value: mid + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip combining the middle terms.",
      },
      {
        label: qLabel(q(mid - 1)),
        value: mid - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip combining the middle terms.",
      },
      {
        label: qLabel(q(mid + 2)),
        value: mid + 2,
        misconception: "off-by-one",
        note: "Arithmetic slip combining the middle terms.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "PassportAdvancedMath", subdomain: "EquivalentExpressions",
        standard: "P.A.1", difficulty, stem, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: {
          params: { a, b, lead: 2 },
          note: "(2x+a)(x+b): middle coefficient = a+2b.",
        },
      };
    }
    return assembleProblem(rng, {
      domain: "PassportAdvancedMath", subdomain: "EquivalentExpressions", standard: "P.A.1",
      difficulty, stem, key, explanation,
      verify: { params: { a, b, lead: 2 }, note: "middle = a+2b." },
      format, gridInForms: qForms(midFrac),
    });
  }

  const a = t === 1 ? randInt(rng, 1, 6) : randIntAvoid(rng, -6, 6, [0]);
  const b = t === 1 ? randInt(rng, 1, 6) : randIntAvoid(rng, -6, 6, [0]);
  const askMiddle = rng() < 0.5;
  const ansVal = askMiddle ? a + b : a * b;
  const ansFrac = q(ansVal);
  const key = { label: qLabel(ansFrac), value: qVal(ansFrac) };
  const aStr = a < 0 ? `− ${-a}` : `+ ${a}`;
  const bStr = b < 0 ? `− ${-b}` : `+ ${b}`;
  const stem = askMiddle
    ? `If (x ${aStr})(x ${bStr}) is written as x² + kx + m, what is the value of k?`
    : `If (x ${aStr})(x ${bStr}) is written as x² + kx + m, what is the value of m?`;
  const explanation = askMiddle
    ? `(x ${aStr})(x ${bStr}) = x² + ${a + b}x + ${a * b}. The coefficient of x is ${a} + ${b} = ${ansVal}.`
    : `(x ${aStr})(x ${bStr}) = x² + ${a + b}x + ${a * b}. The constant term is ${a} × ${b} = ${ansVal}.`;

  const pool: DistractorSpec[] = askMiddle
    ? [
        {
          label: qLabel(q(a * b)),
          value: a * b,
          misconception: "foil-error",
          note: "Multiplied the constants for the middle term instead of adding them.",
        },
        {
          label: qLabel(q(-(a + b))),
          value: -(a + b),
          misconception: "sign-flip",
          note: "Sign error combining the middle terms.",
        },
        {
          label: qLabel(q(a + b + 1)),
          value: a + b + 1,
          misconception: "off-by-one",
          note: "Arithmetic slip adding the middle terms.",
        },
        {
          label: qLabel(q(a + b - 1)),
          value: a + b - 1,
          misconception: "off-by-one",
          note: "Arithmetic slip adding the middle terms.",
        },
        {
          label: qLabel(q(a + b + 2)),
          value: a + b + 2,
          misconception: "off-by-one",
          note: "Arithmetic slip adding the middle terms.",
        },
        {
          label: qLabel(q(a + b - 2)),
          value: a + b - 2,
          misconception: "off-by-one",
          note: "Arithmetic slip adding the middle terms.",
        },
      ]
    : [
        {
          label: qLabel(q(a + b)),
          value: a + b,
          misconception: "foil-error",
          note: "Added the constants for the constant term instead of multiplying them.",
        },
        {
          label: qLabel(q(-(a * b))),
          value: -(a * b),
          misconception: "sign-flip",
          note: "Sign error multiplying the constants.",
        },
        {
          label: qLabel(q(a * b + 1)),
          value: a * b + 1,
          misconception: "off-by-one",
          note: "Arithmetic slip multiplying the constants.",
        },
        {
          label: qLabel(q(a * b - 1)),
          value: a * b - 1,
          misconception: "off-by-one",
          note: "Arithmetic slip multiplying the constants.",
        },
        {
          label: qLabel(q(a * b + 2)),
          value: a * b + 2,
          misconception: "off-by-one",
          note: "Arithmetic slip multiplying the constants.",
        },
        {
          label: qLabel(q(a * b - 2)),
          value: a * b - 2,
          misconception: "off-by-one",
          note: "Arithmetic slip multiplying the constants.",
        },
      ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "PassportAdvancedMath", subdomain: "EquivalentExpressions",
      standard: "P.A.1", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { a, b, lead: 1, askMiddle: askMiddle ? 1 : 0 },
        note: "(x+a)(x+b): middle = a+b, constant = a*b.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "PassportAdvancedMath", subdomain: "EquivalentExpressions", standard: "P.A.1",
    difficulty, stem, key, explanation,
    verify: { params: { a, b, lead: 1, askMiddle: askMiddle ? 1 : 0 }, note: "middle = a+b, constant = a*b." },
    format, gridInForms: qForms(ansFrac),
  });
}

// ── Maker 3: nonlinear function evaluation (P.A.4) ─────────────────────────────

function makeNonlinearFunction(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  const a = t === 3 ? pick2(rng, [-2, -1, 2]) : 1;
  const p = t === 1 ? randInt(rng, 0, 6) : randIntAvoid(rng, -6, 6, [0]);
  const q0 = t === 1 ? randInt(rng, 1, 9) : randIntAvoid(rng, -9, 9, [0]);
  const x = t === 1 ? randInt(rng, 1, 6) : randIntAvoid(rng, -5, 6, [0]);
  const val = a * x * x + p * x + q0;
  const valFrac = q(val);
  const key = { label: qLabel(valFrac), value: qVal(valFrac) };

  const aStr = a === 1 ? "" : a === -1 ? "−" : `${a}`;
  const pStr = p === 0 ? "" : p < 0 ? ` − ${-p}x` : ` + ${p}x`;
  const qStr = q0 < 0 ? ` − ${-q0}` : ` + ${q0}`;
  const stem = `The function f is defined by f(x) = ${aStr}x²${pStr}${qStr}. What is the value of f(${x})?`;
  const explanation = `f(${x}) = ${a}(${x})² + ${p}(${x}) + ${q0} = ${a * x * x} + ${p * x} + ${q0} = ${val}.`;

  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(a * 2 * x + p * x + q0)),
      value: a * 2 * x + p * x + q0,
      misconception: "order-of-operations",
      note: "Treated x² as 2x instead of x times x.",
    },
    {
      label: qLabel(q(-val)),
      value: -val,
      misconception: "sign-flip",
      note: "Sign error in the final combination.",
    },
    {
      label: qLabel(q(a * x * x + p * x)),
      value: a * x * x + p * x,
      misconception: "dropped-negative",
      note: "Dropped the constant term when evaluating.",
    },
    {
      label: qLabel(q(val + 1)),
      value: val + 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
    {
      label: qLabel(q(val + 2)),
      value: val + 2,
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
      type: "SAT", format, domain: "PassportAdvancedMath", subdomain: "NonlinearFunction",
      standard: "P.A.4", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { a, p, q: q0, x },
        note: "f(x) = a*x² + p*x + q evaluated directly.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "PassportAdvancedMath", subdomain: "NonlinearFunction", standard: "P.A.4",
    difficulty, stem, key, explanation,
    verify: { params: { a, p, q: q0, x }, note: "f(x) = a*x² + p*x + q." },
    format, gridInForms: qForms(valFrac),
  });
}

function pick2<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Maker 4: nonlinear equations in one variable (P.A.3) ───────────────────────

function makeNonlinearEquation(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  const root = randInt(rng, 2, 12);
  const k = root * root;

  if (t === 1) {
    const rootFrac = q(root);
    const key = { label: qLabel(rootFrac), value: qVal(rootFrac) };
    const stem = `If x² = ${k} and x > 0, what is the value of x?`;
    const explanation = `x = √${k} = ${root} (the positive square root, since x > 0).`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(-root)),
        value: -root,
        misconception: "root-sign-error",
        note: "Gave the negative square root even though x > 0.",
      },
      {
        label: qLabel(q(k, 2)),
        value: qVal(q(k, 2)),
        misconception: "order-of-operations",
        note: "Divided by 2 instead of taking the square root.",
      },
      {
        label: qLabel(q(2 * root)),
        value: 2 * root,
        misconception: "order-of-operations",
        note: "Doubled the root instead of taking the square root once.",
      },
      {
        label: qLabel(q(root + 1)),
        value: root + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
      {
        label: qLabel(q(root - 1)),
        value: root - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
      {
        label: qLabel(q(root + 2)),
        value: root + 2,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "PassportAdvancedMath", subdomain: "NonlinearEquation",
        standard: "P.A.3", difficulty, stem, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: { params: { k, h: 0, c: 0 }, note: "x = √k; check x² = k." },
      };
    }
    return assembleProblem(rng, {
      domain: "PassportAdvancedMath", subdomain: "NonlinearEquation", standard: "P.A.3",
      difficulty, stem, key, explanation,
      verify: { params: { k, h: 0, c: 0 }, note: "x = √k; check x² = k." },
      format, gridInForms: qForms(rootFrac),
    });
  }

  const h = randInt(rng, 1, 9);
  const c = t === 3 ? randInt(rng, 1, 20) : 0;
  // (x − h)² + c = k + c  →  (x − h)² = k  →  x = h ± root.
  // The stem must ask for the GREATEST solution: h − root can also be
  // positive (e.g. h = 7, root = 4 gives 3), so "positive solution" would
  // admit two correct answers. h + root is always the greater of the two.
  const ans = h + root;
  const ansFrac = q(ans);
  const key = { label: qLabel(ansFrac), value: qVal(ansFrac) };
  const stem =
    t === 2
      ? `If (x − ${h})² = ${k}, what is the greater solution for x?`
      : `If (x − ${h})² + ${c} = ${k + c}, what is the greater solution for x?`;
  const explanation =
    t === 2
      ? `x − ${h} = ±√${k} = ±${root}, so x = ${h} ± ${root}; the greater solution is ${h} + ${root} = ${ans}.`
      : `(x − ${h})² = ${k}, so x − ${h} = ±√${k} = ±${root}, and x = ${h} ± ${root}; the greater solution is ${h} + ${root} = ${ans}.`;
  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(h - root)),
      value: h - root,
      misconception: "root-sign-error",
      note: "Took the negative square root branch.",
    },
    {
      label: qLabel(q(root)),
      value: root,
      misconception: "order-of-operations",
      note: "Solved for x − h but forgot to add h back.",
    },
    {
      label: qLabel(q(2 * h + k, 2)),
      value: qVal(q(2 * h + k, 2)),
      misconception: "order-of-operations",
      note: "Divided by 2 instead of taking the square root.",
    },
    {
      label: qLabel(q(ans + 1)),
      value: ans + 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
    {
      label: qLabel(q(ans - 1)),
      value: ans - 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
    {
      label: qLabel(q(ans + 2)),
      value: ans + 2,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
  ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "PassportAdvancedMath", subdomain: "NonlinearEquation",
      standard: "P.A.3", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: { params: { k, h, c }, note: "(x−h)² + c = k + c → x = h ± √k; key is the greater." },
    };
  }
  return assembleProblem(rng, {
    domain: "PassportAdvancedMath", subdomain: "NonlinearEquation", standard: "P.A.3",
    difficulty, stem, key, explanation,
    verify: { params: { k, h, c }, note: "(x−h)² + c = k + c → x = h ± √k; key is the greater." },
    format, gridInForms: qForms(ansFrac),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export const SAT_PAM_MAKERS: SATMaker[] = [
  makeQuadraticRoots,
  makeEquivalentExpressions,
  makeNonlinearFunction,
  makeNonlinearEquation,
];

/** Generate n Passport to Advanced Math problems using the provided RNG. */
export function generateSATPassportAdvancedMathProblems(
  rng: RNG,
  n: number,
  difficulty: SATDifficulty
): SATProblem[] {
  return Array.from({ length: n }, () => {
    const maker = SAT_PAM_MAKERS[Math.floor(rng() * SAT_PAM_MAKERS.length)];
    return maker(rng, difficulty);
  });
}

// MiddleSchoolGrade7.ts
// Grade 7 problem generators, structured on the authoritative scope document
// (CURRICULUM_SCOPE.md — Pearson "7th Grade Math (year at a glance)"):
//
//   T1 Numbers & Operations: rational numbers; opposites & absolute value;
//      +/−/×/÷ rational numbers
//   T2 Expressions/Equations/Relationships: solving simple equations; writing &
//      solving two-step equations; solving simple inequalities; writing
//      problem situations
//   T3 Measurement & Geometry: measuring angles; adjacent/complementary/
//      supplementary/vertical angles; triangle angle sum; center/radius/
//      diameter; circumference & area of circles; semicircles & quarter
//      circles; composite figures; nets; surface area & volume of right
//      prisms; surface area & volume of right pyramids
//   T4 Proportionality: ratios & rates; proportional relationships;
//      representing linear relationships; percents
//   T5 Data: sampling; comparing two populations; probability concepts;
//      compound events
//   T6 Financial Literacy: economic thinking
//   T7 Step-up: percents >100% & <1%, percent error, expanding & factoring
//      expressions, distributive property equations, multi-step inequalities
//
// Each lesson in the doc is a Grade7Subtype; registry entries are one per
// lesson (see src/modules/middle-school.ts). Pure, seeded, deterministic.
// Difficulty tiers 1|2|3 are cumulative and live in this factory.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type {
  Grade7Problem,
  Grade7Subtype,
  MiddleSchoolSVGParams,
  MSNumberLineParams,
} from "./MiddleSchoolTypes";
import {
  gcd,
  makeFrac,
  randFrac,
  fracAdd,
  fracSub,
  fracMul,
  fracDiv,
  fracToString,
  fmt,
  roundTo,
  randNonZero,
  shuffled,
  signStr,
  twoStepEquation,
} from "./MiddleSchoolUtils";

export type Grade7Difficulty = 1 | 2 | 3;

type Maker = (rng: RNG) => Grade7Problem;
interface MakerEntry {
  tier: Grade7Difficulty;
  subtype: Grade7Subtype;
  make: Maker;
}

function build(
  subtype: Grade7Subtype,
  prompt: string,
  find: string,
  answer: number | string,
  steps: Grade7Problem["steps"],
  given: Record<string, number | string>,
  svgParams?: MiddleSchoolSVGParams | null,
  unit?: string
): Grade7Problem {
  return {
    type: "MS.7",
    subtype,
    prompt,
    find,
    answer,
    steps,
    given,
    svgParams: svgParams ?? null,
    ...(unit ? { unit } : {}),
  };
}

function inequalityNumberLine(
  from: number,
  dir: "left" | "right",
  open: boolean,
  min: number,
  max: number
): MSNumberLineParams {
  const marks: number[] = [];
  for (let v = min; v <= max; v++) marks.push(v);
  return {
    kind: "MSNumberLine",
    min,
    max,
    marks,
    highlight: [],
    ray: { from, dir, open },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T1 · NUMBERS & OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Rational Numbers, Opposites & Absolute Value ────────────────────

function makeAbsoluteValue(rng: RNG): Grade7Problem {
  const v = randNonZero(rng, -20, 20);
  const ans = Math.abs(v);
  return build(
    "RationalNumbersAndAbsoluteValue",
    `Find the value of |${v}|.`,
    "the absolute value",
    ans,
    [
      {
        instruction: "The absolute value is the distance from 0 on the number line (always non-negative):",
        blanks: [{ label: `|${v}| =`, answer: String(ans) }],
      },
    ],
    { v }
  );
}

function makeOpposites(rng: RNG): Grade7Problem {
  const kind = pick(rng, ["integer", "decimal", "fraction"] as const);
  let valStr: string;
  let ans: string;
  let given: Record<string, number | string>;
  if (kind === "integer") {
    const v = randNonZero(rng, -15, 15);
    valStr = String(v);
    ans = String(-v);
    given = { v };
  } else if (kind === "decimal") {
    const v = roundTo(randNonZero(rng, -99, 99) / 10, 1);
    valStr = fmt(v);
    ans = fmt(-v);
    given = { v: fmt(v) };
  } else {
    const f = makeFrac(randNonZero(rng, -9, 9), pick(rng, [3, 4, 5, 6, 8]));
    valStr = fracToString(f);
    ans = fracToString(makeFrac(-f.n, f.d));
    given = { n: f.n, d: f.d };
  }
  return build(
    "RationalNumbersAndAbsoluteValue",
    `What is the opposite of ${valStr}?`,
    "the opposite",
    ans,
    [
      {
        instruction: "The opposite of a number is the same distance from 0 on the other side:",
        blanks: [{ label: "opposite", answer: ans }],
      },
    ],
    given
  );
}

// ── Lesson: Adding & Subtracting Rational Numbers ───────────────────────────

function makeAddRational(rng: RNG): Grade7Problem {
  if (rng() < 0.5) {
    const a = roundTo(randInt(rng, -99, 99) / 10, 1);
    const b = roundTo(randInt(rng, -99, 99) / 10, 1);
    const ans = roundTo(a + b, 1);
    return build(
      "AddSubtractRational",
      `Find: ${fmt(a)} + ${fmt(b)}.`,
      "the sum",
      fmt(ans),
      [
        {
          instruction: "Add the decimals, keeping track of the signs:",
          blanks: [{ label: "sum", answer: fmt(ans) }],
        },
      ],
      { a: fmt(a), b: fmt(b), op: "add", form: "decimal" }
    );
  }
  const f1 = makeFrac(randInt(rng, -9, 9) || 1, pick(rng, [4, 5, 6, 8, 10]));
  const f2 = makeFrac(randInt(rng, -9, 9) || 1, f1.d);
  const result = fracAdd(f1, f2);
  const ans = fracToString(result);
  return build(
    "AddSubtractRational",
    `Find: ${fracToString(f1)} + ${fracToString(f2)}. Write the answer in simplest form.`,
    "the sum",
    ans,
    [
      {
        instruction: `Add the numerators over the common denominator ${f1.d}:`,
        blanks: [{ label: "sum", answer: ans }],
      },
    ],
    { n1: f1.n, d1: f1.d, n2: f2.n, d2: f2.d, op: "add", form: "fraction" }
  );
}

function makeSubRational(rng: RNG): Grade7Problem {
  const f1 = randFrac(rng, 8);
  const f2 = randFrac(rng, 8);
  const neg = rng() < 0.5;
  const g1 = neg ? makeFrac(-f1.n, f1.d) : f1;
  const result = fracSub(g1, f2);
  const ans = fracToString(result);
  return build(
    "AddSubtractRational",
    `Find: ${fracToString(g1)} − ${fracToString(f2)}. Write the answer in simplest form.`,
    "the difference",
    ans,
    [
      {
        instruction: "Rewrite with a common denominator, then subtract:",
        blanks: [{ label: "difference", answer: ans }],
      },
    ],
    { n1: g1.n, d1: g1.d, n2: f2.n, d2: f2.d, op: "sub", form: "fraction" }
  );
}

// ── Lesson: Multiplying & Dividing Rational Numbers ─────────────────────────

function makeMulDivRational(rng: RNG): Grade7Problem {
  const f1 = makeFrac(randInt(rng, -9, 9) || 2, pick(rng, [3, 4, 5, 6, 8]));
  const f2 = makeFrac(randInt(rng, -9, 9) || 3, pick(rng, [3, 4, 5, 6, 8]));
  const isMul = rng() < 0.5;
  const result = isMul ? fracMul(f1, f2) : fracDiv(f1, f2);
  const ans = fracToString(result);
  const opSym = isMul ? "×" : "÷";
  return build(
    "MultiplyDivideRational",
    `Find: ${fracToString(f1)} ${opSym} ${fracToString(f2)}. Write the answer in simplest form.`,
    isMul ? "the product" : "the quotient",
    ans,
    [
      {
        instruction: isMul
          ? "Multiply numerators and denominators, then simplify:"
          : `Multiply ${fracToString(f1)} by the reciprocal of ${fracToString(f2)}, then simplify:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { n1: f1.n, d1: f1.d, n2: f2.n, d2: f2.d, op: isMul ? "mul" : "div", form: "fraction" }
  );
}

function makeMixedRational(rng: RNG): Grade7Problem {
  const f1 = makeFrac(randInt(rng, 1, 5), pick(rng, [2, 4]));
  const f2 = makeFrac(randInt(rng, 1, 5), pick(rng, [2, 4]));
  const f3 = makeFrac(randInt(rng, 1, 5), pick(rng, [2, 4]));
  const product = fracMul(f2, f3);
  const result = fracAdd(f1, product);
  const ans = fracToString(result);
  return build(
    "MultiplyDivideRational",
    `Find: ${fracToString(f1)} + ${fracToString(f2)} × ${fracToString(f3)}. Write the answer in simplest form.`,
    "the result",
    ans,
    [
      {
        instruction: `Multiply first (order of operations): ${fracToString(f2)} × ${fracToString(f3)} = ${fracToString(product)}.`,
        blanks: [{ label: "product", answer: fracToString(product) }],
      },
      {
        instruction: `Add ${fracToString(f1)} + ${fracToString(product)}:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { n1: f1.n, d1: f1.d, n2: f2.n, d2: f2.d, n3: f3.n, d3: f3.d, op: "mixed", form: "fraction" }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T2 · EXPRESSIONS, EQUATIONS & RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Solving Simple Equations ────────────────────────────────────────

function makeSimpleEquation7(rng: RNG): Grade7Problem {
  const kind = pick(rng, ["add-dec", "mul-dec"] as const);
  if (kind === "add-dec") {
    const x = roundTo(randInt(rng, 11, 99) / 10, 1);
    const a = roundTo(randInt(rng, 11, 59) / 10, 1);
    const b = roundTo(x + a, 1);
    return build(
      "SolvingSimpleEquations",
      `Solve for x: x + ${fmt(a)} = ${fmt(b)}.`,
      "the value of x",
      fmt(x),
      [
        {
          instruction: `Subtract ${fmt(a)} from both sides:`,
          blanks: [{ label: "x =", answer: fmt(x) }],
        },
      ],
      { a: fmt(a), b: fmt(b), kind: "add-dec" }
    );
  }
  const x = roundTo(randInt(rng, 11, 99) / 10, 1);
  const a = randInt(rng, 2, 6);
  const b = roundTo(a * x, 1);
  return build(
    "SolvingSimpleEquations",
    `Solve for x: ${a}x = ${fmt(b)}.`,
    "the value of x",
    fmt(x),
    [
      {
        instruction: `Divide both sides by ${a}:`,
        blanks: [{ label: "x =", answer: fmt(x) }],
      },
    ],
    { a, b: fmt(b), kind: "mul-dec" }
  );
}

// ── Lesson: Writing & Solving Two-Step Equations ─────────────────────────────

function makeTwoStepEquation(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 9);
  const x = randInt(rng, -9, 9) || 3;
  const b = randNonZero(rng, -12, 12);
  const c = a * x + b;
  return build(
    "TwoStepEquations",
    `Solve for x: ${twoStepEquation(a, b, c)}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Undo the ${b < 0 ? "subtraction" : "addition"} first: ${b < 0 ? "add" : "subtract"} ${Math.abs(b)} from both sides → ${a}x = ${c - b}.`,
        blanks: [{ label: `${a}x =`, answer: String(c - b) }],
      },
      {
        instruction: `Divide both sides by ${a}:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, c, kind: "two-step" }
  );
}

function makeTwoStepRational(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 5);
  const x = randInt(rng, 2, 9);
  const b = roundTo(randInt(rng, 11, 49) / 10, 1);
  const c = roundTo(a * x + b, 1);
  return build(
    "TwoStepEquations",
    `Solve for x: ${a}x + ${fmt(b)} = ${fmt(c)}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Subtract ${fmt(b)} from both sides: ${a}x = ${fmt(c - b)}.`,
        blanks: [{ label: `${a}x =`, answer: fmt(c - b) }],
      },
      {
        instruction: `Divide both sides by ${a}:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b: fmt(b), c: fmt(c), kind: "two-step-rational" }
  );
}

// ── Lesson: Solving Simple Inequalities ──────────────────────────────────────

function makeSimpleInequality(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 9);
  const x = randInt(rng, 3, 14);
  const dir = rng() < 0.5 ? "<" : ">";
  const c = x + a;
  const ans = `x ${dir} ${x}`;
  const lo = Math.max(0, x - 4);
  const hi = x + 4;
  return build(
    "SolvingInequalities",
    `Solve the inequality: x + ${a} ${dir} ${c}. Graph the solution.`,
    "the solution",
    ans,
    [
      {
        instruction: `Subtract ${a} from both sides:`,
        blanks: [{ label: "solution", answer: ans }],
      },
      {
        instruction: "Graph the solution (open circle at the boundary):",
      },
    ],
    { a, c, dir, boundary: x, kind: "simple-inequality" },
    inequalityNumberLine(x, dir === ">" ? "right" : "left", true, lo, hi)
  );
}

function makeInequality(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 6);
  const x = randInt(rng, 2, 10);
  const b = randInt(rng, 1, 8);
  const c = a * x - b;
  const dir = rng() < 0.5 ? ">" : "<";
  const symbol = dir === ">" ? ">" : "<";
  const ans = `x ${symbol} ${x}`;
  const lo = Math.min(x - 4, 0);
  const hi = x + 4;
  return build(
    "SolvingInequalities",
    `Solve and graph the inequality: ${a}x − ${b} ${symbol} ${c}.`,
    "the solution",
    ans,
    [
      {
        instruction: `Add ${b} to both sides: ${a}x ${symbol} ${c + b}.`,
        blanks: [{ label: `${a}x ${symbol}`, answer: String(c + b) }],
      },
      {
        instruction: `Divide both sides by ${a}:`,
        blanks: [{ label: "solution", answer: ans }],
      },
      {
        instruction: "Graph the solution on the number line (open circle at the boundary):",
      },
    ],
    { a, b, c, dir, boundary: x, kind: "inequality" },
    inequalityNumberLine(x, dir === ">" ? "right" : "left", true, lo, hi)
  );
}

// ── Lesson: Writing Problem Situations ───────────────────────────────────────

function makeWriteEquation(rng: RNG): Grade7Problem {
  const kind = pick(rng, ["add", "mul"] as const);
  if (kind === "add") {
    const a = randInt(rng, 3, 15);
    const total = randInt(rng, a + 5, 40);
    return build(
      "WritingProblemSituations",
      `A number increased by ${a} is ${total}. Write an equation to represent this situation (use n for the number). Do not solve.`,
      "the equation",
      `n + ${a} = ${total}`,
      [
        {
          instruction: `"Increased by" means addition:`,
          blanks: [{ label: "equation", answer: `n + ${a} = ${total}` }],
        },
      ],
      { a, total, kind: "write-add" }
    );
  }
  const a = randInt(rng, 2, 6);
  const n = randInt(rng, 3, 12);
  const total = a * n;
  return build(
    "WritingProblemSituations",
    `${a} times a number is ${total}. Write an equation to represent this situation (use n for the number). Do not solve.`,
    "the equation",
    `${a}n = ${total}`,
    [
      {
        instruction: `"Times" means multiplication:`,
        blanks: [{ label: "equation", answer: `${a}n = ${total}` }],
      },
    ],
    { a, total, kind: "write-mul" }
  );
}

function makeEquationWord7(rng: RNG): Grade7Problem {
  const rate = randInt(rng, 5, 15);
  const fee = randInt(rng, 10, 40);
  const months = randInt(rng, 2, 6);
  const total = rate * months + fee;
  return build(
    "WritingProblemSituations",
    `A gym charges a $${fee} sign-up fee plus $${rate} per month. After some months, a member has paid $${total} total. Write and solve an equation to find how many months the member has been enrolled.`,
    "the number of months",
    months,
    [
      {
        instruction: `Let m = months. Write the equation: ${rate}m + ${fee} = ${total}.`,
        blanks: [{ label: "equation", answer: `${rate}m + ${fee} = ${total}` }],
      },
      {
        instruction: `Subtract ${fee}, then divide by ${rate}:`,
        blanks: [{ label: "m =", answer: String(months) }],
      },
    ],
    { rate, fee, total, wordKind: "two-step" }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T3 · MEASUREMENT & GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Measuring Angles ─────────────────────────────────────────────────

function makeClassifyAngle(rng: RNG): Grade7Problem {
  const kind = pick(rng, ["acute", "right", "obtuse"] as const);
  const angle = kind === "acute" ? randInt(rng, 10, 80) : kind === "right" ? 90 : randInt(rng, 100, 170);
  return build(
    "MeasuringAngles",
    `An angle measures ${angle}°. Classify the angle as acute, right, or obtuse.`,
    "the classification",
    kind,
    [
      {
        instruction: "Acute: less than 90°. Right: exactly 90°. Obtuse: between 90° and 180°.",
        blanks: [{ label: "classification", answer: kind }],
      },
    ],
    { angle, kind },
    { kind: "MSGeometryFigure", figure: "angle-single", dims: { angle } }
  );
}

// ── Lesson: Adjacent, Complementary, Supplementary & Vertical Angles ──────────

function makeComplementary(rng: RNG): Grade7Problem {
  const known = randInt(rng, 15, 75);
  const missing = 90 - known;
  return build(
    "AnglePairs",
    `Two angles are complementary. One angle measures ${known}°. What is the measure of the other angle?`,
    "the other angle",
    `${missing}°`,
    [
      {
        instruction: "Complementary angles add up to 90°.",
        blanks: [{ label: "sum", answer: "90°" }],
      },
      {
        instruction: `Other angle = 90° − ${known}°.`,
        blanks: [{ label: "answer", answer: `${missing}°` }],
      },
    ],
    { known, missing, pair: "complementary" },
    { kind: "MSGeometryFigure", figure: "angle-complementary", dims: { angle: known } }
  );
}

function makeSupplementary(rng: RNG): Grade7Problem {
  const known = randInt(rng, 25, 150);
  const missing = 180 - known;
  return build(
    "AnglePairs",
    `Two angles are supplementary. One angle measures ${known}°. What is the measure of the other angle?`,
    "the other angle",
    `${missing}°`,
    [
      {
        instruction: "Supplementary angles add up to 180°.",
        blanks: [{ label: "sum", answer: "180°" }],
      },
      {
        instruction: `Other angle = 180° − ${known}°.`,
        blanks: [{ label: "answer", answer: `${missing}°` }],
      },
    ],
    { known, missing, pair: "supplementary" },
    { kind: "MSGeometryFigure", figure: "angle-supplementary", dims: { angle: known } }
  );
}

function makeVerticalAngles(rng: RNG): Grade7Problem {
  const known = randInt(rng, 25, 150);
  return build(
    "AnglePairs",
    `Two lines intersect, forming vertical angles. One angle measures ${known}°. What is the measure of the angle opposite (vertical to) it?`,
    "the vertical angle",
    `${known}°`,
    [
      {
        instruction: "Vertical angles (opposite each other when two lines cross) are congruent.",
        blanks: [{ label: "property", answer: "vertical angles are equal" }],
      },
      {
        instruction: "The angle opposite it measures:",
        blanks: [{ label: "answer", answer: `${known}°` }],
      },
    ],
    { known, pair: "vertical" },
    { kind: "MSGeometryFigure", figure: "angle-vertical", dims: { angle: known } }
  );
}

// ── Lesson: Triangle Angle Sum ───────────────────────────────────────────────

function makeTriangleAngleSum7(rng: RNG): Grade7Problem {
  const a1 = randInt(rng, 25, 75);
  const a2 = randInt(rng, 25, 100 - a1 - 10);
  const missing = 180 - a1 - a2;
  return build(
    "TriangleAngleSum",
    `Two angles of a triangle measure ${a1}° and ${a2}°. Find the measure of the third angle.`,
    "the third angle",
    `${missing}°`,
    [
      {
        instruction: "The sum of the interior angles of a triangle is 180°.",
        blanks: [{ label: "angle sum", answer: "180°" }],
      },
      {
        instruction: `Third angle = 180° − ${a1}° − ${a2}°.`,
        blanks: [{ label: "answer", answer: `${missing}°` }],
      },
    ],
    { a1, a2, missing },
    { kind: "MSGeometryFigure", figure: "triangle", dims: { base: 10, height: 6 } }
  );
}

// ── Lesson: Center, Radius & Diameter ────────────────────────────────────────

function makeCircleParts(rng: RNG): Grade7Problem {
  const givenRadius = rng() < 0.5;
  const r = randInt(rng, 3, 15);
  if (givenRadius) {
    return build(
      "CircleParts",
      `A circle has a radius of ${r} cm. What is its diameter?`,
      "the diameter",
      `${2 * r} cm`,
      [
        {
          instruction: "The diameter is twice the radius: d = 2r.",
          blanks: [{ label: "d =", answer: `${2 * r} cm` }],
        },
      ],
      { r, asked: "diameter" },
      { kind: "MSGeometryFigure", figure: "circle", dims: { radius: r } }
    );
  }
  const d = randInt(rng, 4, 30);
  const radius = d / 2;
  return build(
    "CircleParts",
    `A circle has a diameter of ${d} cm. What is its radius?`,
    "the radius",
    `${fmt(radius)} cm`,
    [
      {
        instruction: "The radius is half the diameter: r = d ÷ 2.",
        blanks: [{ label: "r =", answer: `${fmt(radius)} cm` }],
      },
    ],
    { d, asked: "radius" },
    { kind: "MSGeometryFigure", figure: "circle", dims: { diameter: d } }
  );
}

// ── Lesson: Circumference & Area of Circles ───────────────────────────────────

function makeCircumference(rng: RNG): Grade7Problem {
  const d = randInt(rng, 4, 20) * 2;
  const r = d / 2;
  const useDiameter = rng() < 0.5;
  const given = useDiameter ? `diameter ${d} cm` : `radius ${r} cm`;
  // NOTE: use 3.14 (not Math.PI) so the answer matches student work with 3.14.
  const ansNum = useDiameter ? 3.14 * d : 2 * 3.14 * r;
  const ans = `${fmt(roundTo(ansNum, 2))} cm`;
  return build(
    "CircumferenceAndArea",
    `Find the circumference of a circle with ${given}. Use 3.14 for π.`,
    "the circumference",
    ans,
    [
      {
        instruction: useDiameter ? "C = πd." : "C = 2πr.",
        blanks: [{ label: "formula", answer: useDiameter ? "C = πd" : "C = 2πr" }],
      },
      {
        instruction: useDiameter ? `Substitute: C = 3.14 × ${d}.` : `Substitute: C = 2 × 3.14 × ${r}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { d, r, useDiameter: useDiameter ? 1 : 0, pi: "3.14" },
    { kind: "MSGeometryFigure", figure: "circle", dims: useDiameter ? { diameter: d } : { radius: r } },
    "cm"
  );
}

function makeCircleArea(rng: RNG): Grade7Problem {
  const r = randInt(rng, 3, 12);
  const ans = `${fmt(roundTo(3.14 * r * r, 2))} cm²`;
  return build(
    "CircumferenceAndArea",
    `Find the area of a circle with radius ${r} cm. Use 3.14 for π.`,
    "the area",
    ans,
    [
      {
        instruction: "A = πr².",
        blanks: [{ label: "formula", answer: "A = πr²" }],
      },
      {
        instruction: `Substitute: A = 3.14 × ${r}² = 3.14 × ${r * r}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { r, pi: "3.14" },
    { kind: "MSGeometryFigure", figure: "circle", dims: { radius: r } },
    "cm²"
  );
}

function makeCircleBackward(rng: RNG): Grade7Problem {
  const r = randInt(rng, 3, 10);
  const C = roundTo(2 * 3.14 * r, 2);
  return build(
    "CircumferenceAndArea",
    `A circle has circumference ${fmt(C)} cm. What is its radius? Use 3.14 for π.`,
    "the radius",
    `${r} cm`,
    [
      {
        instruction: `C = 2πr, so r = C ÷ (2π) = ${fmt(C)} ÷ 6.28.`,
        blanks: [{ label: "r =", answer: String(r) }],
      },
      {
        instruction: "Write the answer with units:",
        blanks: [{ label: "answer", answer: `${r} cm` }],
      },
    ],
    { C: fmt(C), r, pi: "3.14", kind: "backward" },
    { kind: "MSGeometryFigure", figure: "circle", dims: { radius: r } },
    "cm"
  );
}

function makeCircleWord(rng: RNG): Grade7Problem {
  const d = pick(rng, [10, 14, 20, 28]);
  const r = d / 2;
  const ans = `${fmt(roundTo(3.14 * r * r, 2))} square feet`;
  return build(
    "CircumferenceAndArea",
    `A circular garden has a diameter of ${d} feet. What is its area? Use 3.14 for π.`,
    "the area",
    ans,
    [
      {
        instruction: `First find the radius: ${d} ÷ 2 = ${r} ft.`,
        blanks: [{ label: "radius", answer: `${r} ft` }],
      },
      {
        instruction: `A = πr² = 3.14 × ${r}²:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { d, r, pi: "3.14", wordKind: "circle-area" },
    { kind: "MSGeometryFigure", figure: "circle", dims: { diameter: d } },
    "square feet"
  );
}

// ── Lesson: Semicircles & Quarter Circles ────────────────────────────────────

function makeFractionalCircle(rng: RNG): Grade7Problem {
  const half = rng() < 0.5;
  const r = randInt(rng, 4, 12);
  const fraction = half ? "half" : "quarter";
  const fracNum = half ? 1 / 2 : 1 / 4;
  const fullArea = roundTo(3.14 * r * r, 2);
  const ans = `${fmt(roundTo(fullArea * fracNum, 2))} cm²`;
  return build(
    "SemicirclesAndQuarterCircles",
    `Find the area of a ${half ? "semicircle" : "quarter circle"} with radius ${r} cm. Use 3.14 for π.`,
    "the area",
    ans,
    [
      {
        instruction: `Area of a full circle = πr² = 3.14 × ${r}² = ${fmt(fullArea)}.`,
        blanks: [{ label: "full area", answer: fmt(fullArea) }],
      },
      {
        instruction: `Take ${fraction} of it:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { r, fraction, pi: "3.14" },
    { kind: "MSGeometryFigure", figure: "circle", dims: { radius: r } },
    "cm²"
  );
}

// ── Lesson: Composite Figures ─────────────────────────────────────────────────

function makeCompositeArea(rng: RNG): Grade7Problem {
  // L-shape: bottom rectangle w1×h1 with a smaller rectangle w2×h2 on top
  const w1 = randInt(rng, 8, 14);
  const h1 = randInt(rng, 4, 7);
  const w2 = randInt(rng, 4, w1 - 2);
  const h2 = randInt(rng, 3, 6);
  const ans = w1 * h1 + w2 * h2;
  return build(
    "CompositeFigures",
    `Find the area of the composite figure: a rectangle ${w1} m by ${h1} m with a rectangle ${w2} m by ${h2} m on top of it.`,
    "the area",
    `${ans} m²`,
    [
      {
        instruction: `Area of the bottom rectangle: ${w1} × ${h1} = ${w1 * h1}.`,
        blanks: [{ label: "bottom area", answer: String(w1 * h1) }],
      },
      {
        instruction: `Area of the top rectangle: ${w2} × ${h2} = ${w2 * h2}. Add them:`,
        blanks: [{ label: "answer", answer: `${ans} m²` }],
      },
    ],
    { w1, h1, w2, h2 },
    { kind: "MSGeometryFigure", figure: "composite", dims: { w1, h1, w2, h2 } },
    "m²"
  );
}

function makeCompositeWord(rng: RNG): Grade7Problem {
  const w1 = randInt(rng, 10, 16);
  const h1 = randInt(rng, 6, 10);
  const cutW = randInt(rng, 3, 6);
  const cutH = randInt(rng, 2, 4);
  // rectangle with a rectangular hole removed (e.g. a garden with a patio)
  const ans = w1 * h1 - cutW * cutH;
  return build(
    "CompositeFigures",
    `A rectangular garden measures ${w1} ft by ${h1} ft. A rectangular patio ${cutW} ft by ${cutH} ft is built inside it. What is the area of the garden that is still grass?`,
    "the grassy area",
    `${ans} ft²`,
    [
      {
        instruction: `Whole garden: ${w1} × ${h1} = ${w1 * h1} ft². Patio: ${cutW} × ${cutH} = ${cutW * cutH} ft².`,
        blanks: [{ label: "areas", answer: `${w1 * h1} and ${cutW * cutH}` }],
      },
      {
        instruction: "Subtract the patio from the whole:",
        blanks: [{ label: "answer", answer: `${ans} ft²` }],
      },
    ],
    { w1, h1, cutW, cutH, wordKind: "garden" },
    undefined,
    "ft²"
  );
}

// ── Lesson: Nets ─────────────────────────────────────────────────────────────

function makeCubeNetSA(rng: RNG): Grade7Problem {
  const s = randInt(rng, 2, 9);
  const ans = 6 * s * s;
  return build(
    "Nets",
    `The net of a cube is shown. Each square has side length ${s} cm. What is the surface area of the cube?`,
    "the surface area",
    `${ans} cm²`,
    [
      {
        instruction: "A cube's net has 6 identical square faces.",
        blanks: [{ label: "faces", answer: "6" }],
      },
      {
        instruction: `One face: ${s} × ${s} = ${s * s}. Total: 6 × ${s * s}.`,
        blanks: [{ label: "answer", answer: `${ans} cm²` }],
      },
    ],
    { s },
    { kind: "MSGeometryFigure", figure: "net-cube", dims: { side: s } },
    "cm²"
  );
}

// ── Lesson: Surface Area & Volume of Right Prisms ────────────────────────────

function makeTriPrismVolume(rng: RNG): Grade7Problem {
  const base = randInt(rng, 4, 10);
  let height = randInt(rng, 3, 8);
  if ((base * height) % 2 !== 0) height += 1;
  const triArea = (base * height) / 2;
  const length = randInt(rng, 5, 12);
  const ans = triArea * length;
  return build(
    "PrismsSurfaceAreaVolume",
    `A triangular prism has a triangular base with base ${base} cm and height ${height} cm. The length of the prism is ${length} cm. Find its volume.`,
    "the volume",
    `${ans} cm³`,
    [
      {
        instruction: `Area of the triangular base: ½ × ${base} × ${height} = ${triArea}.`,
        blanks: [{ label: "base area", answer: String(triArea) }],
      },
      {
        instruction: `Volume = base area × length = ${triArea} × ${length}.`,
        blanks: [{ label: "answer", answer: `${ans} cm³` }],
      },
    ],
    { base, height, length },
    undefined,
    "cm³"
  );
}

function makePrismWord(rng: RNG): Grade7Problem {
  const l = randInt(rng, 4, 9);
  const w = randInt(rng, 3, 7);
  const h = randInt(rng, 3, 8);
  const ans = 2 * (l * w + l * h + w * h);
  return build(
    "PrismsSurfaceAreaVolume",
    `A gift box is a rectangular prism ${l} in long, ${w} in wide, and ${h} in tall. How much wrapping paper is needed to cover it completely?`,
    "the surface area",
    `${ans} in²`,
    [
      {
        instruction: `SA = 2(lw + lh + wh) = 2(${l}×${w} + ${l}×${h} + ${w}×${h}).`,
        blanks: [{ label: "answer", answer: `${ans} in²` }],
      },
    ],
    { l, w, h, wordKind: "gift-box" },
    { kind: "MSGeometryFigure", figure: "rectangular-prism", dims: { length: l, width: w, height: h } },
    "in²"
  );
}

// ── Lesson: Surface Area & Volume of Right Pyramids ──────────────────────────

function makePyramidVolume(rng: RNG): Grade7Problem {
  const s = randInt(rng, 3, 8);
  const h = pick(rng, [3, 6, 9, 12]);
  const B = s * s;
  const ans = (B * h) / 3;
  return build(
    "PyramidsSurfaceAreaVolume",
    `A square pyramid has a base with side length ${s} m and a height of ${h} m. Find its volume.`,
    "the volume",
    `${fmt(ans)} m³`,
    [
      {
        instruction: `Base area B = ${s} × ${s} = ${B}. Volume = ⅓Bh.`,
        blanks: [{ label: "formula", answer: "V = ⅓Bh" }],
      },
      {
        instruction: `V = ⅓ × ${B} × ${h}.`,
        blanks: [{ label: "answer", answer: `${fmt(ans)} m³` }],
      },
    ],
    { s, h, B },
    undefined,
    "m³"
  );
}

function makePyramidSA(rng: RNG): Grade7Problem {
  const s = randInt(rng, 4, 8);
  const slant = randInt(rng, 5, 10);
  const ans = s * s + 2 * s * slant;
  return build(
    "PyramidsSurfaceAreaVolume",
    `A square pyramid has a base with side length ${s} ft and a slant height of ${slant} ft. Find its surface area. (Do not include the base if the pyramid sits on the ground — include all faces here.)`,
    "the surface area",
    `${ans} ft²`,
    [
      {
        instruction: `Base: ${s} × ${s} = ${s * s}. Each triangular face: ½ × ${s} × ${slant} = ${fmt((s * slant) / 2)}.`,
        blanks: [{ label: "parts", answer: `${s * s} and ${fmt((s * slant) / 2)}` }],
      },
      {
        instruction: `SA = base + 4 faces = ${s * s} + 4 × ${fmt((s * slant) / 2)}.`,
        blanks: [{ label: "answer", answer: `${ans} ft²` }],
      },
    ],
    { s, slant },
    undefined,
    "ft²"
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T4 · PROPORTIONALITY
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Ratios & Rates ───────────────────────────────────────────────────

function makeUnitRate7(rng: RNG): Grade7Problem {
  const priceEach = roundTo(randInt(rng, 15, 95) / 10, 1);
  const qty = randInt(rng, 2, 8);
  const total = roundTo(priceEach * qty, 2);
  return build(
    "RatiosRates7",
    `${qty} pounds of apples cost $${fmt(total)}. What is the unit rate (price per pound)?`,
    "the unit rate",
    `$${fmt(priceEach)} per pound`,
    [
      {
        instruction: `Divide the total cost by the number of pounds: $${fmt(total)} ÷ ${qty}.`,
        blanks: [{ label: "unit rate", answer: fmt(priceEach) }],
      },
      {
        instruction: "Write the unit rate with its units:",
        blanks: [{ label: "answer", answer: `$${fmt(priceEach)} per pound` }],
      },
    ],
    { total: fmt(total), qty, priceEach: fmt(priceEach) }
  );
}

function makeBestBuy(rng: RNG): Grade7Problem {
  const r1 = roundTo(randInt(rng, 120, 200) / 100, 2);
  const r2 = roundTo((r1 * 100 + pick(rng, [-15, -10, 10, 15, 20])) / 100, 2);
  const rate2 = Math.max(0.5, r2);
  const q1 = randInt(rng, 3, 6);
  const q2 = randInt(rng, 3, 6);
  const t1 = roundTo(r1 * q1, 2);
  const t2 = roundTo(rate2 * q2, 2);
  const better = r1 < rate2 ? "the first" : "the second";
  return build(
    "RatiosRates7",
    `Bag 1 holds ${q1} pounds of rice for $${fmt(t1)}. Bag 2 holds ${q2} pounds for $${fmt(t2)}. Which is the better buy?`,
    "the better buy",
    `${better} bag ($${fmt(Math.min(r1, rate2))}/lb)`,
    [
      {
        instruction: `Unit rate bag 1: $${fmt(t1)} ÷ ${q1} = $${fmt(r1)}/lb. Unit rate bag 2: $${fmt(t2)} ÷ ${q2} = $${fmt(rate2)}/lb.`,
        blanks: [{ label: "unit rates", answer: `$${fmt(r1)} and $${fmt(rate2)}` }],
      },
      {
        instruction: "The lower unit rate is the better buy:",
        blanks: [{ label: "answer", answer: `${better} bag` }],
      },
    ],
    { q1, t1: fmt(t1), q2, t2: fmt(t2) }
  );
}

// ── Lesson: Proportional Relationships ───────────────────────────────────────

function makeConstantOfProportionality(rng: RNG): Grade7Problem {
  const k = pick(rng, [2, 3, 4, 5, 1.5, 2.5]);
  const xs = [2, 3, 4, 5];
  const pairs = xs.map((x) => ({ x, y: roundTo(k * x, 2) }));
  const table = pairs.map((p) => `(${p.x}, ${fmt(p.y)})`).join(", ");
  return build(
    "ProportionalRelationships",
    `A proportional relationship passes through the points ${table}. What is the constant of proportionality?`,
    "the constant of proportionality",
    fmt(k),
    [
      {
        instruction: `For a proportional relationship, y = kx. Use the first point: ${fmt(pairs[0].y)} = k(${pairs[0].x}).`,
        blanks: [{ label: "k =", answer: fmt(k) }],
      },
    ],
    { k: fmt(k), points: table }
  );
}

function makeProportionalTable(rng: RNG): Grade7Problem {
  const k = randInt(rng, 2, 6);
  const knownX = randInt(rng, 2, 5);
  const knownY = k * knownX;
  const findX = pick(rng, [6, 7, 8, 9, 10].filter((v) => v !== knownX));
  const ans = k * findX;
  return build(
    "ProportionalRelationships",
    `y is proportional to x. When x = ${knownX}, y = ${knownY}. What is y when x = ${findX}?`,
    "the value of y",
    ans,
    [
      {
        instruction: `Find the constant of proportionality: k = ${knownY} ÷ ${knownX} = ${k}.`,
        blanks: [{ label: "k", answer: String(k) }],
      },
      {
        instruction: `Multiply: y = ${k} × ${findX}.`,
        blanks: [{ label: "y =", answer: String(ans) }],
      },
    ],
    { knownX, knownY, findX, k }
  );
}

function makeProportionalOrNot(rng: RNG): Grade7Problem {
  const proportional = rng() < 0.5;
  const xs = [1, 2, 3, 4];
  let ys: number[];
  let ans: string;
  let reason: string;
  if (proportional) {
    const k = randInt(rng, 2, 5);
    ys = xs.map((x) => k * x);
    ans = "proportional";
    reason = `Every ratio y/x equals ${k}, so the relationship is proportional.`;
  } else {
    const k = randInt(rng, 2, 5);
    ys = xs.map((x) => k * x + randInt(rng, 1, 3));
    ans = "not proportional";
    reason = "The ratios y/x are not all equal, so the relationship is not proportional.";
  }
  const table = xs.map((x, i) => `(${x}, ${ys[i]})`).join(", ");
  return build(
    "ProportionalRelationships",
    `Determine whether the relationship in the table is proportional: ${table}.`,
    "proportional or not",
    ans,
    [
      {
        instruction: "Check whether every ratio y/x is the same:",
        blanks: [{ label: "ratios equal?", answer: proportional ? "yes" : "no" }],
      },
      { instruction: reason, blanks: [{ label: "answer", answer: ans }] },
    ],
    { points: table, proportional: proportional ? 1 : 0 }
  );
}

function makeProportionalWord(rng: RNG): Grade7Problem {
  const perBatch = randInt(rng, 2, 5);
  const batches = randInt(rng, 2, 4);
  const total = perBatch * batches;
  const target = batches + randInt(rng, 1, 3);
  const ans = perBatch * target;
  return build(
    "ProportionalRelationships",
    `A baker uses ${total} eggs to make ${batches} cakes at a constant rate. How many eggs are needed for ${target} cakes?`,
    "the number of eggs",
    ans,
    [
      {
        instruction: `Find eggs per cake: ${total} ÷ ${batches} = ${perBatch}.`,
        blanks: [{ label: "eggs per cake", answer: String(perBatch) }],
      },
      {
        instruction: `Multiply by ${target} cakes:`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { total, batches, target, wordKind: "proportional" }
  );
}

// ── Lesson: Representing Linear Relationships ────────────────────────────────

function makeLinearTable(rng: RNG): Grade7Problem {
  const m = randInt(rng, 2, 5);
  const b = randInt(rng, 1, 8);
  const x = randInt(rng, 4, 9);
  const y = m * x + b;
  return build(
    "RepresentingLinearRelationships",
    `A linear relationship is represented by the equation y = ${m}x + ${b}. Complete the table entry: when x = ${x}, y = ?`,
    "the value of y",
    y,
    [
      {
        instruction: `Substitute ${x} for x: y = ${m}(${x}) + ${b} = ${m * x} + ${b}.`,
        blanks: [{ label: "substituted", answer: `${m * x} + ${b}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "y =", answer: String(y) }],
      },
    ],
    { m, b, x, y }
  );
}

function makeLinearIdentify(rng: RNG): Grade7Problem {
  const m = randInt(rng, 2, 5);
  const b = randInt(rng, 3, 10);
  const choices = shuffled(rng, [
    `y = ${m}x + ${b}`,
    `y = ${m}x − ${b}`,
    `y = ${b}x + ${m}`,
  ]);
  return build(
    "RepresentingLinearRelationships",
    `Which equation represents the statement "y is ${b} more than ${m} times x"?`,
    "the equation",
    `y = ${m}x + ${b}`,
    [
      {
        instruction: `"${m} times x" is ${m}x; "${b} more than" means add ${b}:`,
        blanks: [{ label: "equation", answer: `y = ${m}x + ${b}` }],
      },
    ],
    { m, b, choices: choices.join(" | ") }
  );
}

// ── Lesson: Percents ─────────────────────────────────────────────────────────

function makePercentOf7(rng: RNG): Grade7Problem {
  const pct = pick(rng, [15, 30, 35, 45, 60, 70, 85]);
  const total = pick(rng, [40, 60, 80, 120, 160, 200]);
  const ans = roundTo((pct / 100) * total, 2);
  return build(
    "Percents",
    `Find ${pct}% of ${total}.`,
    "the amount",
    fmt(ans),
    [
      {
        instruction: `Write ${pct}% as a decimal: ${fmt(pct / 100)}.`,
        blanks: [{ label: "decimal", answer: fmt(pct / 100) }],
      },
      {
        instruction: `Multiply: ${fmt(pct / 100)} × ${total}.`,
        blanks: [{ label: "answer", answer: fmt(ans) }],
      },
    ],
    { pct, total }
  );
}

function makePercentDiscount(rng: RNG): Grade7Problem {
  const price = pick(rng, [40, 50, 60, 80, 100, 120]);
  const pct = pick(rng, [10, 15, 20, 25, 30, 40, 50]);
  const discount = roundTo((pct / 100) * price, 2);
  const sale = roundTo(price - discount, 2);
  return build(
    "Percents",
    `A jacket costs $${price}. It is on sale for ${pct}% off. What is the sale price?`,
    "the sale price",
    `$${fmt(sale)}`,
    [
      {
        instruction: `Discount = ${pct}% of $${price} = $${fmt(discount)}.`,
        blanks: [{ label: "discount", answer: `$${fmt(discount)}` }],
      },
      {
        instruction: `Sale price = $${price} − $${fmt(discount)}.`,
        blanks: [{ label: "answer", answer: `$${fmt(sale)}` }],
      },
    ],
    { price, pct, wordKind: "discount" }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T5 · DATA
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Sampling ─────────────────────────────────────────────────────────

function makeSamplePrediction(rng: RNG): Grade7Problem {
  const sampleSize = pick(rng, [20, 25, 40, 50]);
  const sampleCount = randInt(rng, 4, Math.floor(sampleSize / 2));
  const population = pick(rng, [200, 300, 400, 500]);
  const ans = Math.round((sampleCount / sampleSize) * population);
  return build(
    "Sampling",
    `In a random sample of ${sampleSize} students, ${sampleCount} prefer apples. Predict how many of the ${population} students in the school prefer apples.`,
    "the prediction",
    ans,
    [
      {
        instruction: `Sample proportion: ${sampleCount}/${sampleSize} = ${fmt(sampleCount / sampleSize)}.`,
        blanks: [{ label: "proportion", answer: fmt(sampleCount / sampleSize) }],
      },
      {
        instruction: `Multiply by the population: ${fmt(sampleCount / sampleSize)} × ${population}. Round to the nearest whole number:`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { sampleSize, sampleCount, population }
  );
}

// ── Lesson: Comparing Two Populations ────────────────────────────────────────

function makeCompareMeans(rng: RNG): Grade7Problem {
  const meanA = randInt(rng, 70, 90);
  const meanB = meanA + randNonZero(rng, -8, 8);
  const higher = meanA > meanB ? "Class A" : "Class B";
  const diff = Math.abs(meanA - meanB);
  return build(
    "ComparingPopulations",
    `Class A has a mean test score of ${meanA}. Class B has a mean test score of ${meanB}. Which class scored higher on average, and by how much?`,
    "the higher class and difference",
    `${higher} by ${diff} points`,
    [
      {
        instruction: `Compare the means: ${meanA} vs ${meanB}.`,
        blanks: [{ label: "higher", answer: higher }],
      },
      {
        instruction: `Find the difference: ${Math.max(meanA, meanB)} − ${Math.min(meanA, meanB)}.`,
        blanks: [{ label: "answer", answer: `${higher} by ${diff} points` }],
      },
    ],
    { meanA, meanB }
  );
}

// ── Lesson: Probability Concepts ─────────────────────────────────────────────

function makeSimpleProbability(rng: RNG): Grade7Problem {
  const colors = shuffled(rng, ["red", "blue", "green", "yellow"] as const).slice(0, 3);
  const counts = [randInt(rng, 2, 8), randInt(rng, 2, 8), randInt(rng, 2, 8)];
  const total = counts.reduce((s, c) => s + c, 0);
  const idx = randInt(rng, 0, 2);
  const f = makeFrac(counts[idx], total);
  const ans = fracToString(f);
  const desc = colors.map((c, i) => `${counts[i]} ${c}`).join(", ");
  return build(
    "ProbabilityConcepts",
    `A bag contains ${desc} marbles. One marble is drawn at random. What is the probability of drawing a ${colors[idx]} marble? Write the answer as a fraction in simplest form.`,
    "the probability",
    ans,
    [
      {
        instruction: `P = favorable outcomes ÷ total outcomes = ${counts[idx]} ÷ ${total}.`,
        blanks: [{ label: "probability", answer: `${counts[idx]}/${total}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { counts: counts.join(","), colors: colors.join(","), idx, total }
  );
}

const SPINNER_PALETTE = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#f97316"];

function makeSpinnerProbability(rng: RNG): Grade7Problem {
  const n = pick(rng, [4, 5, 6, 8]);
  const labels = ["A", "B", "C", "D", "E", "F", "G", "H"].slice(0, n);
  const target = pick(rng, labels);
  const sectors = labels.map((l) => (rng() < 0.3 ? target : l));
  const favorable = sectors.filter((s) => s === target).length;
  const f = makeFrac(favorable, n);
  const ans = fracToString(f);
  return build(
    "ProbabilityConcepts",
    `A spinner is divided into ${n} equal sectors labeled as shown. What is the probability the spinner lands on "${target}"? Write the answer as a fraction in simplest form.`,
    "the probability",
    ans,
    [
      {
        instruction: `Count the "${target}" sectors: ${favorable} out of ${n} total.`,
        blanks: [{ label: "probability", answer: `${favorable}/${n}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { n, target, favorable, sectors: sectors.join(",") },
    { kind: "MSSpinner", sectors, colors: SPINNER_PALETTE.slice(0, n) }
  );
}

function makeExperimentalProbability(rng: RNG): Grade7Problem {
  const trials = pick(rng, [20, 25, 30, 40, 50]);
  const success = randInt(rng, Math.floor(trials * 0.2), Math.floor(trials * 0.8));
  const f = makeFrac(success, trials);
  const ans = fracToString(f);
  return build(
    "ProbabilityConcepts",
    `In an experiment, a spinner was spun ${trials} times and landed on blue ${success} times. What is the experimental probability of landing on blue? Write the answer as a fraction in simplest form.`,
    "the experimental probability",
    ans,
    [
      {
        instruction: `Experimental P = observed successes ÷ trials = ${success} ÷ ${trials}.`,
        blanks: [{ label: "probability", answer: `${success}/${trials}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { trials, success }
  );
}

function makeProbabilityWord(rng: RNG): Grade7Problem {
  const total = pick(rng, [10, 12, 15, 20]);
  const win = randInt(rng, 2, Math.floor(total / 2));
  const f = makeFrac(win, total);
  const ans = fracToString(f);
  return build(
    "ProbabilityConcepts",
    `A carnival game has ${total} bottles. ${win} of them hide a prize. If you knock down one bottle at random, what is the probability you win a prize? Write the answer as a fraction in simplest form.`,
    "the probability",
    ans,
    [
      {
        instruction: `P(prize) = prize bottles ÷ total bottles = ${win} ÷ ${total}.`,
        blanks: [{ label: "probability", answer: `${win}/${total}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { total, win, wordKind: "probability" }
  );
}

// ── Lesson: Compound Events ──────────────────────────────────────────────────

function makeCompoundProbability(rng: RNG): Grade7Problem {
  const kind = pick(rng, ["coin-die", "marble"] as const);
  if (kind === "coin-die") {
    const dieTarget = randInt(rng, 1, 6);
    const f = makeFrac(1, 12);
    return build(
      "CompoundEvents",
      `A coin is flipped and a number cube is rolled. What is the probability of getting heads AND rolling a ${dieTarget}? Write the answer as a fraction in simplest form.`,
      "the probability",
      fracToString(f),
      [
        {
          instruction: `P(heads) = 1/2 and P(rolling a ${dieTarget}) = 1/6. Multiply for independent events:`,
          blanks: [{ label: "product", answer: "1/2 × 1/6 = 1/12" }],
        },
        {
          instruction: "Simplify:",
          blanks: [{ label: "answer", answer: fracToString(f) }],
        },
      ],
      { kind: "coin-die", dieTarget }
    );
  }
  const r1 = randInt(rng, 2, 5);
  const t1 = r1 + randInt(rng, 2, 5);
  const r2 = randInt(rng, 2, 5);
  const t2 = r2 + randInt(rng, 2, 5);
  const f = makeFrac(r1 * r2, t1 * t2);
  const ans = fracToString(f);
  return build(
    "CompoundEvents",
    `Bag A has ${r1} red marbles out of ${t1} total. Bag B has ${r2} red marbles out of ${t2} total. One marble is drawn from each bag (with replacement). What is P(red and red)? Write the answer as a fraction in simplest form.`,
    "the probability",
    ans,
    [
      {
        instruction: `P(red from A) = ${r1}/${t1}; P(red from B) = ${r2}/${t2}. Multiply:`,
        blanks: [{ label: "product", answer: `${r1 * r2}/${t1 * t2}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "marble", r1, t1, r2, t2 }
  );
}

function makeCompoundWord(rng: RNG): Grade7Problem {
  const red = randInt(rng, 2, 4);
  const blue = randInt(rng, 2, 4);
  const total = red + blue;
  const f = makeFrac(red * blue, total * total);
  const ans = fracToString(f);
  return build(
    "CompoundEvents",
    `A bag contains ${red} red and ${blue} blue marbles. A marble is drawn, replaced, then another is drawn. What is the probability of drawing red first AND blue second? Write the answer as a fraction in simplest form.`,
    "the probability",
    ans,
    [
      {
        instruction: `P(red) = ${red}/${total}; P(blue) = ${blue}/${total}. Multiply for independent events:`,
        blanks: [{ label: "product", answer: `${red * blue}/${total * total}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { red, blue, total, wordKind: "compound-draw" }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T6 · FINANCIAL LITERACY
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Economic Thinking ────────────────────────────────────────────────

function makeSalesTax(rng: RNG): Grade7Problem {
  const price = pick(rng, [24, 36, 48, 60, 75, 96]);
  const rate = pick(rng, [5, 6, 7, 8]);
  const tax = roundTo((price * rate) / 100, 2);
  const total = roundTo(price + tax, 2);
  return build(
    "EconomicThinking",
    `A book costs $${price}. The sales tax rate is ${rate}%. How much is the sales tax, and what is the total cost?`,
    "the tax and total",
    `tax $${fmt(tax)}, total $${fmt(total)}`,
    [
      {
        instruction: `Sales tax = $${price} × ${rate}% = $${fmt(tax)}.`,
        blanks: [{ label: "tax", answer: `$${fmt(tax)}` }],
      },
      {
        instruction: `Total = $${price} + $${fmt(tax)}.`,
        blanks: [{ label: "answer", answer: `tax $${fmt(tax)}, total $${fmt(total)}` }],
      },
    ],
    { price, rate }
  );
}

function makeBudget(rng: RNG): Grade7Problem {
  const income = pick(rng, [1200, 1800, 2400, 3000]);
  const rent = Math.round(income * pick(rng, [0.3, 0.35, 0.4]));
  const food = Math.round(income * 0.15);
  const other = Math.round(income * pick(rng, [0.1, 0.15, 0.2]));
  const expenses = rent + food + other;
  const savings = income - expenses;
  return build(
    "EconomicThinking",
    `A monthly budget shows income of $${income.toLocaleString("en-US")}. Expenses are: rent $${rent}, food $${food}, other $${other}. How much can be saved each month?`,
    "the monthly savings",
    `$${savings.toLocaleString("en-US")}`,
    [
      {
        instruction: `Total expenses: $${rent} + $${food} + $${other} = $${expenses.toLocaleString("en-US")}.`,
        blanks: [{ label: "expenses", answer: `$${expenses.toLocaleString("en-US")}` }],
      },
      {
        instruction: `Savings = income − expenses = $${income.toLocaleString("en-US")} − $${expenses.toLocaleString("en-US")}.`,
        blanks: [{ label: "answer", answer: `$${savings.toLocaleString("en-US")}` }],
      },
    ],
    { income, rent, food, other }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T7 · STEP-UP
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Percents Greater Than 100% & Less Than 1% ────────────────────────

function makePercentOver100(rng: RNG): Grade7Problem {
  const pct = pick(rng, [110, 125, 150, 175, 200, 250]);
  const total = pick(rng, [40, 60, 80, 120]);
  const ans = roundTo((pct / 100) * total, 2);
  return build(
    "PercentsBeyond100",
    `Find ${pct}% of ${total}.`,
    "the amount",
    fmt(ans),
    [
      {
        instruction: `${pct}% = ${fmt(pct / 100)} as a decimal (more than 1 whole).`,
        blanks: [{ label: "decimal", answer: fmt(pct / 100) }],
      },
      {
        instruction: `Multiply: ${fmt(pct / 100)} × ${total}.`,
        blanks: [{ label: "answer", answer: fmt(ans) }],
      },
    ],
    { pct, total }
  );
}

function makePercentUnder1(rng: RNG): Grade7Problem {
  const pct = pick(rng, [0.5, 0.25, 0.8, 0.4]);
  const total = pick(rng, [400, 500, 800, 1000]);
  const ans = roundTo((pct / 100) * total, 2);
  return build(
    "PercentsBeyond100",
    `Find ${pct}% of ${total}.`,
    "the amount",
    fmt(ans),
    [
      {
        instruction: `${pct}% = ${fmt(pct / 100)} as a decimal (less than 1%).`,
        blanks: [{ label: "decimal", answer: fmt(pct / 100) }],
      },
      {
        instruction: `Multiply: ${fmt(pct / 100)} × ${total}.`,
        blanks: [{ label: "answer", answer: fmt(ans) }],
      },
    ],
    { pct, total }
  );
}

// ── Lesson: Percent Error ────────────────────────────────────────────────────

function makePercentError(rng: RNG): Grade7Problem {
  // choose actual + errPct so the error is an exact integer (no rounding drift)
  let actual = 100;
  let errPct = 5;
  for (let i = 0; i < 50; i++) {
    const a = pick(rng, [50, 80, 100, 120, 200]);
    const e = pick(rng, [2, 4, 5, 8, 10]);
    if ((a * e) % 100 === 0) {
      actual = a;
      errPct = e;
      break;
    }
  }
  const measured = actual + (actual * errPct) / 100;
  return build(
    "PercentError",
    `A measurement is recorded as ${measured} units, but the actual value is ${actual} units. What is the percent error?`,
    "the percent error",
    `${errPct}%`,
    [
      {
        instruction: `Amount of error = |${measured} − ${actual}| = ${measured - actual}.`,
        blanks: [{ label: "error", answer: String(measured - actual) }],
      },
      {
        instruction: `Percent error = error ÷ actual × 100 = ${measured - actual} ÷ ${actual} × 100.`,
        blanks: [{ label: "answer", answer: `${errPct}%` }],
      },
    ],
    { measured, actual }
  );
}

// ── Lesson: Expanding & Factoring Expressions ────────────────────────────────

function makeExpand(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 9);
  const c = randInt(rng, 1, 9);
  const neg = rng() < 0.4;
  const inner = neg ? `${b}x − ${c}` : `${b}x + ${c}`;
  const ansOuter = `${a * b}x`;
  const ansConst = a * c;
  const ans = neg ? `${ansOuter} − ${ansConst}` : `${ansOuter} + ${ansConst}`;
  return build(
    "ExpandingAndFactoring",
    `Expand: ${a}(${inner}).`,
    "the expanded expression",
    ans,
    [
      {
        instruction: `Multiply ${a} by each term: ${a} × ${b}x = ${ansOuter}; ${a} × ${c} = ${ansConst}.`,
        blanks: [{ label: "expanded", answer: ans }],
      },
    ],
    { a, b, c, neg: neg ? 1 : 0 }
  );
}

function makeFactor(rng: RNG): Grade7Problem {
  const g = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 9);
  const c = randInt(rng, 2, 9);
  const ans = `${g}(${b}x + ${c})`;
  return build(
    "ExpandingAndFactoring",
    `Factor out the greatest common factor: ${g * b}x + ${g * c}.`,
    "the factored expression",
    ans,
    [
      {
        instruction: `The GCF of ${g * b}x and ${g * c} is ${g}.`,
        blanks: [{ label: "GCF", answer: String(g) }],
      },
      {
        instruction: `Divide each term by ${g}: ${g * b}x ÷ ${g} = ${b}x; ${g * c} ÷ ${g} = ${c}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { g, b, c }
  );
}

// ── Lesson: Distributive Property Equations ──────────────────────────────────

function makeDistributiveEquation(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 5);
  const x = randInt(rng, 2, 9);
  const b = randInt(rng, 1, 6);
  const c = a * (x + b);
  return build(
    "DistributiveEquations",
    `Solve for x: ${a}(x + ${b}) = ${c}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Distribute ${a}: ${a}x + ${a * b} = ${c}.`,
        blanks: [{ label: "distributed", answer: `${a}x + ${a * b} = ${c}` }],
      },
      {
        instruction: `Subtract ${a * b} from both sides, then divide by ${a}:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, c, kind: "distributive" }
  );
}

// ── Lesson: Multi-Step Inequalities ──────────────────────────────────────────

function makeMultiStepInequality(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 5);
  const x = randInt(rng, 3, 10);
  const b = randInt(rng, 2, 9);
  const c = a * x + b;
  const dir = rng() < 0.5 ? ">" : "<";
  const ans = `x ${dir} ${x}`;
  const lo = Math.max(0, x - 4);
  const hi = x + 4;
  return build(
    "MultiStepInequalities",
    `Solve and graph: ${a}x + ${b} ${dir} ${c}.`,
    "the solution",
    ans,
    [
      {
        instruction: `Subtract ${b} from both sides: ${a}x ${dir} ${c - b}.`,
        blanks: [{ label: `${a}x ${dir}`, answer: String(c - b) }],
      },
      {
        instruction: `Divide both sides by ${a}:`,
        blanks: [{ label: "solution", answer: ans }],
      },
      {
        instruction: "Graph the solution (open circle at the boundary):",
      },
    ],
    { a, b, c, dir, boundary: x, kind: "multi-step-inequality" },
    inequalityNumberLine(x, dir === ">" ? "right" : "left", true, lo, hi)
  );
}


// ── Tier-1 direct variants ───────────────────────────────────────────────────

function makePercentSimple(rng: RNG): Grade7Problem {
  const pct = pick(rng, [10, 20, 25, 50]);
  const total = pick(rng, [40, 60, 80, 100, 200]);
  const ans = roundTo((pct / 100) * total, 2);
  return build(
    "Percents",
    `Find ${pct}% of ${total}.`,
    "the amount",
    fmt(ans),
    [
      {
        instruction: `${pct}% = ${fmt(pct / 100)} as a decimal. Multiply:`,
        blanks: [{ label: "answer", answer: fmt(ans) }],
      },
    ],
    { pct, total, simple: 1 }
  );
}

function makeDecimalMul(rng: RNG): Grade7Problem {
  const a = roundTo(randNonZero(rng, -99, 99) / 10, 1);
  const b = randInt(rng, 2, 9);
  const ans = roundTo(a * b, 2);
  return build(
    "MultiplyDivideRational",
    `Find: ${fmt(a)} × ${b}.`,
    "the product",
    fmt(ans),
    [
      {
        instruction: "Multiply, keeping track of the sign (negative × positive = negative):",
        blanks: [{ label: "product", answer: fmt(ans) }],
      },
    ],
    { a: fmt(a), b, op: "mul", form: "decimal" }
  );
}

function makeWriteSimple(rng: RNG): Grade7Problem {
  const a = randInt(rng, 3, 12);
  const total = randInt(rng, a + 4, 30);
  return build(
    "WritingProblemSituations",
    `A number added to ${a} equals ${total}. Write an equation for this situation (use n for the number). Do not solve.`,
    "the equation",
    `n + ${a} = ${total}`,
    [
      {
        instruction: `"Added to" means addition:`,
        blanks: [{ label: "equation", answer: `n + ${a} = ${total}` }],
      },
    ],
    { a, total, kind: "write-simple" }
  );
}

function makeSemicircleHalf(rng: RNG): Grade7Problem {
  const r = randInt(rng, 4, 12);
  const fullArea = roundTo(3.14 * r * r, 2);
  const ans = fullArea / 2; // exact 2-decimal: 3.14·r²/2 = 1.57·r²
  return build(
    "SemicirclesAndQuarterCircles",
    `A full circle with radius ${r} cm has area ${fmt(fullArea)} cm². What is the area of a semicircle with the same radius?`,
    "the area",
    `${fmt(ans)} cm²`,
    [
      {
        instruction: `A semicircle is half of a full circle: ${fmt(fullArea)} ÷ 2.`,
        blanks: [{ label: "answer", answer: `${fmt(ans)} cm²` }],
      },
    ],
    { r, fullArea: fmt(fullArea), half: 1, pi: "3.14" },
    null,
    "cm²"
  );
}

function makeCompositeSimple(rng: RNG): Grade7Problem {
  const w1 = randInt(rng, 3, 8);
  const h1 = randInt(rng, 3, 8);
  const w2 = randInt(rng, 3, 8);
  const h2 = randInt(rng, 3, 8);
  const ans = w1 * h1 + w2 * h2;
  return build(
    "CompositeFigures",
    `A figure is made by joining a ${w1} m by ${h1} m rectangle and a ${w2} m by ${h2} m rectangle. What is the total area?`,
    "the total area",
    `${ans} m²`,
    [
      {
        instruction: `First rectangle: ${w1} × ${h1} = ${w1 * h1}. Second: ${w2} × ${h2} = ${w2 * h2}. Add:`,
        blanks: [{ label: "answer", answer: `${ans} m²` }],
      },
    ],
    { w1, h1, w2, h2, kind: "simple" },
    null,
    "m²"
  );
}

function makeNetCount(rng: RNG): Grade7Problem {
  const s = randInt(rng, 2, 6);
  const ans = 6 * s * s;
  return build(
    "Nets",
    `A cube net is made of 6 identical squares. Each square has side length ${s} cm. What is the total area of the net?`,
    "the total area",
    `${ans} cm²`,
    [
      {
        instruction: `One square: ${s} × ${s} = ${s * s}. Six squares: 6 × ${s * s}.`,
        blanks: [{ label: "answer", answer: `${ans} cm²` }],
      },
    ],
    { s, kind: "count" },
    null,
    "cm²"
  );
}

function makePrismVolumeBH(rng: RNG): Grade7Problem {
  const B = randInt(rng, 10, 40);
  const h = randInt(rng, 3, 12);
  const ans = B * h;
  return build(
    "PrismsSurfaceAreaVolume",
    `A right prism has a base area of ${B} cm² and a height of ${h} cm. What is its volume?`,
    "the volume",
    `${ans} cm³`,
    [
      {
        instruction: `Volume of a prism = base area × height = ${B} × ${h}.`,
        blanks: [{ label: "answer", answer: `${ans} cm³` }],
      },
    ],
    { B, h, kind: "bh" },
    null,
    "cm³"
  );
}

function makePyramidVolumeBH(rng: RNG): Grade7Problem {
  const B = randInt(rng, 12, 36);
  const h = pick(rng, [3, 6, 9, 12]);
  const ans = (B * h) / 3;
  return build(
    "PyramidsSurfaceAreaVolume",
    `A pyramid has a base area of ${B} m² and a height of ${h} m. What is its volume?`,
    "the volume",
    `${fmt(ans)} m³`,
    [
      {
        instruction: `Volume of a pyramid = ⅓ × base area × height = ⅓ × ${B} × ${h}.`,
        blanks: [{ label: "answer", answer: `${fmt(ans)} m³` }],
      },
    ],
    { B, h, kind: "bh" },
    null,
    "m³"
  );
}

function makeLinearRead(rng: RNG): Grade7Problem {
  const m = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 12);
  return build(
    "RepresentingLinearRelationships",
    `A linear relationship is given by y = ${m}x + ${b}. What is the value of y when x = 0?`,
    "the value of y",
    b,
    [
      {
        instruction: `Substitute 0 for x: y = ${m}(0) + ${b} = ${b}.`,
        blanks: [{ label: "y =", answer: String(b) }],
      },
    ],
    { m, b, kind: "read" }
  );
}

function makeSampleFraction(rng: RNG): Grade7Problem {
  const population = pick(rng, [100, 200, 500]);
  const sample = pick(rng, [10, 20, 25, 50].filter((s) => s < population));
  const f = makeFrac(sample, population);
  return build(
    "Sampling",
    `A school has ${population} students. A random sample of ${sample} students is surveyed. What fraction of the school is in the sample? Write in simplest form.`,
    "the fraction",
    fracToString(f),
    [
      {
        instruction: `Sample fraction = ${sample}/${population}. Simplify:`,
        blanks: [{ label: "answer", answer: fracToString(f) }],
      },
    ],
    { sample, population }
  );
}

function makeCompareSimple(rng: RNG): Grade7Problem {
  const meanA = randInt(rng, 70, 92);
  let meanB = randInt(rng, 70, 92);
  while (meanB === meanA) meanB = randInt(rng, 70, 92);
  const higher = meanA > meanB ? "Class A" : "Class B";
  return build(
    "ComparingPopulations",
    `Class A has a mean score of ${meanA} and Class B has a mean score of ${meanB}. Which class has the higher mean?`,
    "the class",
    higher,
    [
      {
        instruction: `Compare ${meanA} and ${meanB}:`,
        blanks: [{ label: "higher", answer: higher }],
      },
    ],
    { meanA, meanB, kind: "simple" }
  );
}

function makeCompoundSimple(rng: RNG): Grade7Problem {
  const d1 = pick(rng, [2, 4]);
  const d2 = pick(rng, [2, 3, 4, 6]);
  const f = makeFrac(1, d1 * d2);
  return build(
    "CompoundEvents",
    `Events A and B are independent. P(A) = 1/${d1} and P(B) = 1/${d2}. What is P(A and B)? Write the answer as a fraction in simplest form.`,
    "the probability",
    fracToString(f),
    [
      {
        instruction: `For independent events, multiply: 1/${d1} × 1/${d2}.`,
        blanks: [{ label: "answer", answer: fracToString(f) }],
      },
    ],
    { d1, d2, kind: "simple" }
  );
}

function makeTaxTotal(rng: RNG): Grade7Problem {
  const price = pick(rng, [20, 35, 50, 80]);
  const tax = roundTo(randInt(rng, 100, 600) / 100, 2);
  const total = roundTo(price + tax, 2);
  return build(
    "EconomicThinking",
    `An item costs $${price} and the sales tax is $${fmt(tax)}. What is the total cost?`,
    "the total cost",
    `$${fmt(total)}`,
    [
      {
        instruction: `Total = price + tax = $${price} + $${fmt(tax)}.`,
        blanks: [{ label: "answer", answer: `$${fmt(total)}` }],
      },
    ],
    { price, tax: fmt(tax) }
  );
}

function makeErrorAmount(rng: RNG): Grade7Problem {
  const actual = pick(rng, [50, 80, 100, 150, 200]);
  const err = randInt(rng, 2, 12);
  const measured = actual + err;
  return build(
    "PercentError",
    `A measurement is recorded as ${measured} units, but the actual value is ${actual} units. What is the amount of error?`,
    "the amount of error",
    `${err} units`,
    [
      {
        instruction: `Amount of error = |measured − actual| = |${measured} − ${actual}|.`,
        blanks: [{ label: "answer", answer: `${err} units` }],
      },
    ],
    { measured, actual, kind: "amount" }
  );
}

function makeExpandSimple(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 2, 9);
  return build(
    "ExpandingAndFactoring",
    `Expand: ${a}(x + ${b}).`,
    "the expanded expression",
    `${a}x + ${a * b}`,
    [
      {
        instruction: `Multiply ${a} by each term: ${a} × x = ${a}x; ${a} × ${b} = ${a * b}.`,
        blanks: [{ label: "expanded", answer: `${a}x + ${a * b}` }],
      },
    ],
    { a, b: 1, c: b, neg: 0, simple: 1 }
  );
}

function makeDistributeFirst(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 1, 6);
  const c = a * (randInt(rng, 2, 9) + b);
  return build(
    "DistributiveEquations",
    `Consider the equation ${a}(x + ${b}) = ${c}. After distributing ${a}, what equation do you get? (Do not solve.)`,
    "the equation",
    `${a}x + ${a * b} = ${c}`,
    [
      {
        instruction: `Distribute ${a}: ${a} × x = ${a}x; ${a} × ${b} = ${a * b}.`,
        blanks: [{ label: "equation", answer: `${a}x + ${a * b} = ${c}` }],
      },
    ],
    { a, b, c, kind: "first-step" }
  );
}

function makeOneStepMultIneq(rng: RNG): Grade7Problem {
  const a = randInt(rng, 2, 9);
  const x = randInt(rng, 2, 10);
  const c = a * x;
  const dir = rng() < 0.5 ? ">" : "<";
  const ans = `x ${dir} ${x}`;
  const lo = Math.max(0, x - 4);
  const hi = x + 4;
  return build(
    "MultiStepInequalities",
    `Solve and graph: ${a}x ${dir} ${c}.`,
    "the solution",
    ans,
    [
      {
        instruction: `Divide both sides by ${a}:`,
        blanks: [{ label: "solution", answer: ans }],
      },
      {
        instruction: "Graph the solution (open circle at the boundary):",
      },
    ],
    { a, c, dir, boundary: x, kind: "one-step" },
    inequalityNumberLine(x, dir === ">" ? "right" : "left", true, lo, hi)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Maker table with difficulty tiers (cumulative)
// ═══════════════════════════════════════════════════════════════════════════

const MAKERS: MakerEntry[] = [
  // T1 · Numbers & Operations
  { tier: 1, subtype: "RationalNumbersAndAbsoluteValue", make: makeAbsoluteValue },
  { tier: 1, subtype: "RationalNumbersAndAbsoluteValue", make: makeOpposites },
  { tier: 1, subtype: "AddSubtractRational", make: makeAddRational },
  { tier: 2, subtype: "AddSubtractRational", make: makeSubRational },
  { tier: 1, subtype: "MultiplyDivideRational", make: makeDecimalMul },
  { tier: 2, subtype: "MultiplyDivideRational", make: makeMulDivRational },
  { tier: 3, subtype: "MultiplyDivideRational", make: makeMixedRational },
  // T2 · Expressions, Equations & Relationships
  { tier: 1, subtype: "SolvingSimpleEquations", make: makeSimpleEquation7 },
  { tier: 1, subtype: "TwoStepEquations", make: makeTwoStepEquation },
  { tier: 2, subtype: "TwoStepEquations", make: makeTwoStepRational },
  { tier: 1, subtype: "SolvingInequalities", make: makeSimpleInequality },
  { tier: 2, subtype: "SolvingInequalities", make: makeInequality },
  { tier: 1, subtype: "WritingProblemSituations", make: makeWriteSimple },
  { tier: 2, subtype: "WritingProblemSituations", make: makeWriteEquation },
  { tier: 3, subtype: "WritingProblemSituations", make: makeEquationWord7 },
  // T3 · Measurement & Geometry
  { tier: 1, subtype: "MeasuringAngles", make: makeClassifyAngle },
  { tier: 1, subtype: "AnglePairs", make: makeComplementary },
  { tier: 1, subtype: "AnglePairs", make: makeSupplementary },
  { tier: 2, subtype: "AnglePairs", make: makeVerticalAngles },
  { tier: 1, subtype: "TriangleAngleSum", make: makeTriangleAngleSum7 },
  { tier: 1, subtype: "CircleParts", make: makeCircleParts },
  { tier: 1, subtype: "CircumferenceAndArea", make: makeCircumference },
  { tier: 1, subtype: "CircumferenceAndArea", make: makeCircleArea },
  { tier: 2, subtype: "CircumferenceAndArea", make: makeCircleBackward },
  { tier: 3, subtype: "CircumferenceAndArea", make: makeCircleWord },
  { tier: 1, subtype: "SemicirclesAndQuarterCircles", make: makeSemicircleHalf },
  { tier: 2, subtype: "SemicirclesAndQuarterCircles", make: makeFractionalCircle },
  { tier: 1, subtype: "CompositeFigures", make: makeCompositeSimple },
  { tier: 2, subtype: "CompositeFigures", make: makeCompositeArea },
  { tier: 3, subtype: "CompositeFigures", make: makeCompositeWord },
  { tier: 1, subtype: "Nets", make: makeNetCount },
  { tier: 2, subtype: "Nets", make: makeCubeNetSA },
  { tier: 1, subtype: "PrismsSurfaceAreaVolume", make: makePrismVolumeBH },
  { tier: 2, subtype: "PrismsSurfaceAreaVolume", make: makeTriPrismVolume },
  { tier: 3, subtype: "PrismsSurfaceAreaVolume", make: makePrismWord },
  { tier: 1, subtype: "PyramidsSurfaceAreaVolume", make: makePyramidVolumeBH },
  { tier: 2, subtype: "PyramidsSurfaceAreaVolume", make: makePyramidVolume },
  { tier: 3, subtype: "PyramidsSurfaceAreaVolume", make: makePyramidSA },
  // T4 · Proportionality
  { tier: 1, subtype: "RatiosRates7", make: makeUnitRate7 },
  { tier: 2, subtype: "RatiosRates7", make: makeBestBuy },
  { tier: 1, subtype: "ProportionalRelationships", make: makeConstantOfProportionality },
  { tier: 2, subtype: "ProportionalRelationships", make: makeProportionalTable },
  { tier: 2, subtype: "ProportionalRelationships", make: makeProportionalOrNot },
  { tier: 3, subtype: "ProportionalRelationships", make: makeProportionalWord },
  { tier: 1, subtype: "RepresentingLinearRelationships", make: makeLinearRead },
  { tier: 2, subtype: "RepresentingLinearRelationships", make: makeLinearTable },
  { tier: 3, subtype: "RepresentingLinearRelationships", make: makeLinearIdentify },
  { tier: 1, subtype: "Percents", make: makePercentSimple },
  { tier: 2, subtype: "Percents", make: makePercentOf7 },
  { tier: 3, subtype: "Percents", make: makePercentDiscount },
  // T5 · Data
  { tier: 1, subtype: "Sampling", make: makeSampleFraction },
  { tier: 2, subtype: "Sampling", make: makeSamplePrediction },
  { tier: 1, subtype: "ComparingPopulations", make: makeCompareSimple },
  { tier: 2, subtype: "ComparingPopulations", make: makeCompareMeans },
  { tier: 1, subtype: "ProbabilityConcepts", make: makeSimpleProbability },
  { tier: 1, subtype: "ProbabilityConcepts", make: makeSpinnerProbability },
  { tier: 2, subtype: "ProbabilityConcepts", make: makeExperimentalProbability },
  { tier: 3, subtype: "ProbabilityConcepts", make: makeProbabilityWord },
  { tier: 1, subtype: "CompoundEvents", make: makeCompoundSimple },
  { tier: 2, subtype: "CompoundEvents", make: makeCompoundProbability },
  { tier: 3, subtype: "CompoundEvents", make: makeCompoundWord },
  // T6 · Financial Literacy
  { tier: 1, subtype: "EconomicThinking", make: makeTaxTotal },
  { tier: 2, subtype: "EconomicThinking", make: makeSalesTax },
  { tier: 3, subtype: "EconomicThinking", make: makeBudget },
  // T7 · Step-up
  { tier: 1, subtype: "PercentsBeyond100", make: makePercentOver100 },
  { tier: 2, subtype: "PercentsBeyond100", make: makePercentUnder1 },
  { tier: 1, subtype: "PercentError", make: makeErrorAmount },
  { tier: 2, subtype: "PercentError", make: makePercentError },
  { tier: 1, subtype: "ExpandingAndFactoring", make: makeExpandSimple },
  { tier: 2, subtype: "ExpandingAndFactoring", make: makeExpand },
  { tier: 3, subtype: "ExpandingAndFactoring", make: makeFactor },
  { tier: 1, subtype: "DistributiveEquations", make: makeDistributeFirst },
  { tier: 2, subtype: "DistributiveEquations", make: makeDistributiveEquation },
  { tier: 1, subtype: "MultiStepInequalities", make: makeOneStepMultIneq },
  { tier: 3, subtype: "MultiStepInequalities", make: makeMultiStepInequality },
];

/** Makers unlocked at the given difficulty tier (cumulative). */
export function grade7MakersFor(difficulty: Grade7Difficulty): Maker[] {
  return MAKERS.filter((m) => m.tier <= difficulty).map((m) => m.make);
}

export const GRADE7_SUBTYPES: Grade7Subtype[] = [
  "RationalNumbersAndAbsoluteValue",
  "AddSubtractRational",
  "MultiplyDivideRational",
  "SolvingSimpleEquations",
  "TwoStepEquations",
  "SolvingInequalities",
  "WritingProblemSituations",
  "MeasuringAngles",
  "AnglePairs",
  "TriangleAngleSum",
  "CircleParts",
  "CircumferenceAndArea",
  "SemicirclesAndQuarterCircles",
  "CompositeFigures",
  "Nets",
  "PrismsSurfaceAreaVolume",
  "PyramidsSurfaceAreaVolume",
  "RatiosRates7",
  "ProportionalRelationships",
  "RepresentingLinearRelationships",
  "Percents",
  "Sampling",
  "ComparingPopulations",
  "ProbabilityConcepts",
  "CompoundEvents",
  "EconomicThinking",
  "PercentsBeyond100",
  "PercentError",
  "ExpandingAndFactoring",
  "DistributiveEquations",
  "MultiStepInequalities",
];

/**
 * Generate n Grade 7 problems using the provided RNG.
 * `subtypes` optionally restricts to certain lessons; `difficulty` filters tiers.
 */
export function generateGrade7Problems(
  rng: RNG,
  n: number,
  difficulty: Grade7Difficulty = 2,
  subtypes?: readonly Grade7Subtype[]
): Grade7Problem[] {
  // Lesson-first, like the registry's filterAllowed: intersect the lesson's own
  // makers with the difficulty filter, falling back to the lesson's full list
  // (so a lesson never generates zero problems).
  const lessonPool =
    subtypes && subtypes.length > 0
      ? MAKERS.filter((m) => subtypes.includes(m.subtype))
      : MAKERS;
  const tierPool = lessonPool.filter((m) => m.tier <= difficulty);
  const finalPool = tierPool.length > 0 ? tierPool : lessonPool;
  return Array.from({ length: n }, () => {
    const entry = pick(rng, finalPool);
    const problem = entry.make(rng);
    problem.tier = entry.tier;
    return problem;
  });
}

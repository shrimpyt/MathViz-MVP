// MiddleSchoolGrade7.ts
// Grade 7 problem generators, structured on the authoritative scope document
// (CURRICULUM_SCOPE.md, Pearson "7th Grade Math (year at a glance)"):
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
//   T8 TEKS Extensions: similar figures & scale drawings; converting between
//      measurement systems; simple & compound interest; net worth; family
//      budgets & wages; reading bar, dot & circle graphs; rational number
//      sets & subsets
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
  fmtFixed,
  roundTo,
  randNonZero,
  shuffled,
  signStr,
  twoStepEquation,
} from "./MiddleSchoolUtils";

export type Grade7Difficulty = 1 | 2 | 3;

type Maker = (rng: RNG, wordProblems?: boolean) => Grade7Problem;
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

function makeClassifyAngle(rng: RNG, word = false): Grade7Problem {
  const kind = pick(rng, ["acute", "right", "obtuse"] as const);
  const angle = kind === "acute" ? randInt(rng, 10, 80) : kind === "right" ? 90 : randInt(rng, 100, 170);
  const prompt = word
    ? pick(rng, [
        `The two sides of a pitched roof form a ${angle}° angle at the peak. Classify the angle as acute, right, or obtuse.`,
        `A door is opened so that it forms a ${angle}° angle with its frame. Classify the angle as acute, right, or obtuse.`,
        `The blades of a pair of scissors form a ${angle}° angle. Classify the angle as acute, right, or obtuse.`,
      ])
    : `An angle measures ${angle}°. Classify the angle as acute, right, or obtuse.`;
  return build(
    "MeasuringAngles",
    prompt,
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

function makeComplementary(rng: RNG, word = false): Grade7Problem {
  const known = randInt(rng, 15, 75);
  const missing = 90 - known;
  const prompt = word
    ? pick(rng, [
        `A picture frame has a square corner, a right angle. A ribbon crosses the corner and splits it into two complementary angles. One angle measures ${known}°. What is the measure of the other angle?`,
        `A carpenter builds a corner brace shaped like a right angle and splits it into two complementary angles. One angle measures ${known}°. What is the measure of the other angle?`,
      ])
    : `Two angles are complementary. One angle measures ${known}°. What is the measure of the other angle?`;
  return build(
    "AnglePairs",
    prompt,
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

function makeSupplementary(rng: RNG, word = false): Grade7Problem {
  const known = randInt(rng, 25, 150);
  const missing = 180 - known;
  const prompt = word
    ? pick(rng, [
        `A straight sidewalk edge is split by a chalk line into two supplementary angles. One angle measures ${known}°. What is the measure of the other angle?`,
        `A fence runs in a straight line. A gate post on the line forms two supplementary angles with the fence. One angle measures ${known}°. What is the measure of the other angle?`,
      ])
    : `Two angles are supplementary. One angle measures ${known}°. What is the measure of the other angle?`;
  return build(
    "AnglePairs",
    prompt,
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

function makeVerticalAngles(rng: RNG, word = false): Grade7Problem {
  const known = randInt(rng, 25, 150);
  const prompt = word
    ? pick(rng, [
        `Two straight roads cross each other, forming vertical angles. One angle at the crossing measures ${known}°. What is the measure of the angle opposite (vertical to) it?`,
        `Two straight wires cross, forming vertical angles. One angle measures ${known}°. What is the measure of the angle opposite (vertical to) it?`,
      ])
    : `Two lines intersect, forming vertical angles. One angle measures ${known}°. What is the measure of the angle opposite (vertical to) it?`;
  return build(
    "AnglePairs",
    prompt,
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
    `A square pyramid has a base with side length ${s} ft and a slant height of ${slant} ft. Find its surface area. (Do not include the base if the pyramid sits on the ground, include all faces here.)`,
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

function makePercentChange(rng: RNG): Grade7Problem {
  const old = pick(rng, [40, 50, 60, 80, 100, 120, 160, 200, 240, 300, 400]);
  const pct = pick(rng, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
  const increase = rng() < 0.5;
  const change = (old * pct) / 100;
  const nw = increase ? old + change : old - change;
  const dir = increase ? "increase" : "decrease";
  const ans = `${pct}% ${dir}`;
  const ctx = pick(rng, ["item", "enrollment", "club"] as const);
  const item = pick(rng, ["backpack", "pair of shoes", "bicycle", "video game", "jacket", "phone case"]);
  const prompt =
    ctx === "item"
      ? `A ${item} was priced at $${old} and is now priced at $${nw}. By what percent did the price change, and was it an increase or a decrease?`
      : ctx === "enrollment"
        ? `A school had ${old} students last year and has ${nw} students this year. By what percent did the enrollment change, and was it an increase or a decrease?`
        : `A club had ${old} members last year and has ${nw} members this year. By what percent did the membership change, and was it an increase or a decrease?`;
  return build(
    "Percents",
    prompt,
    "the percent change and its direction",
    ans,
    [
      {
        instruction: `Amount of change = |${nw} − ${old}| = ${change}.`,
        blanks: [{ label: "change", answer: String(change) }],
      },
      {
        instruction: `Percent change = change ÷ original = ${change} ÷ ${old}. The new value is ${increase ? "larger" : "smaller"}, so it is a ${dir}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "percent-change", old, new: nw }
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

function makeComplementProbability(rng: RNG): Grade7Problem {
  const form = pick(rng, ["frac", "pct"] as const);
  if (form === "pct") {
    const pct = pick(rng, [10, 15, 20, 25, 30, 35, 40, 45, 55, 60, 65, 70, 75, 80, 85, 90]);
    const ans = `${100 - pct}%`;
    const ctx = pick(rng, [
      { event: "rain tomorrow", prompt: `The probability of rain tomorrow is ${pct}%. What is the probability that it will not rain tomorrow?` },
      { event: "snow this weekend", prompt: `A weather report says the probability of snow this weekend is ${pct}%. What is the probability that it will not snow this weekend?` },
      { event: "the bus being on time", prompt: `The probability that the bus is on time is ${pct}%. What is the probability that the bus is not on time?` },
    ]);
    return build(
      "ProbabilityConcepts",
      ctx.prompt,
      "the probability of the complement",
      ans,
      [
        {
          instruction: `An event and its complement always add to 100%. So P(not the event) = 100% − ${pct}%.`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "complement-pct", pct }
    );
  }
  const total = pick(rng, [8, 10, 12, 15, 20, 24, 30]);
  const fav = randInt(rng, 1, total - 1);
  const color = pick(rng, ["red", "blue", "green", "purple"]);
  const f = makeFrac(total - fav, total);
  const ans = fracToString(f);
  return build(
    "ProbabilityConcepts",
    `A bag contains ${total} marbles, and ${fav} of them are ${color}. One marble is drawn at random. What is the probability of NOT drawing a ${color} marble? Write the answer as a fraction in simplest form.`,
    "the probability of the complement",
    ans,
    [
      {
        instruction: `P(${color}) = ${fav}/${total}, so P(not ${color}) = 1 − ${fav}/${total} = ${total - fav}/${total}.`,
        blanks: [{ label: "probability", answer: `${total - fav}/${total}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "complement-frac", fav, total }
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

function makeIncomeTax(rng: RNG): Grade7Problem {
  const gross = pick(rng, [24000, 30000, 36000, 42000, 48000, 54000, 60000]);
  const deduction = pick(rng, [2000, 3000, 5000, 6000, 8000, 10000, 12000]);
  const rate = pick(rng, [10, 12, 15, 20, 22, 25]);
  const taxable = gross - deduction;
  const tax = (taxable * rate) / 100;
  const ans = `$${tax.toLocaleString("en-US")}`;
  return build(
    "EconomicThinking",
    `A worker earns $${gross.toLocaleString("en-US")} in a year. After a deduction of $${deduction.toLocaleString("en-US")}, the rest is taxed at ${rate}%. How much income tax does the worker owe?`,
    "the income tax owed",
    ans,
    [
      {
        instruction: `Taxable income = $${gross.toLocaleString("en-US")} − $${deduction.toLocaleString("en-US")} = $${taxable.toLocaleString("en-US")}.`,
        blanks: [{ label: "taxable income", answer: `$${taxable.toLocaleString("en-US")}` }],
      },
      {
        instruction: `Tax = ${rate}% of $${taxable.toLocaleString("en-US")}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "income-tax", gross, deduction, rate }
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

// ═══════════════════════════════════════════════════════════════════════════
// T8 · TEKS EXTENSIONS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Similar Figures & Scale Drawings (TEKS 7.5A, 7.5C) ──────────────

function makeScaleFactor7(rng: RNG): Grade7Problem {
  const [num, den] = pick(rng, [[2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2], [2, 3], [5, 2], [5, 4]] as const);
  const k = randInt(rng, 2, 9);
  const sideA = den * k;
  const sideB = num * k;
  const ans = fracToString(makeFrac(num, den));
  return build(
    "SimilarFigures7",
    `Figure B is similar to Figure A. A side of Figure A is ${sideA} cm long, and the corresponding side of Figure B is ${sideB} cm long. What is the scale factor from Figure A to Figure B?`,
    "the scale factor",
    ans,
    [
      {
        instruction: `Scale factor = image side ÷ original side = ${sideB} ÷ ${sideA} = ${sideB}/${sideA}.`,
        blanks: [{ label: "ratio", answer: `${sideB}/${sideA}` }],
      },
      {
        instruction: "Simplify the ratio:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "scale-factor", sideA, sideB }
  );
}

function makeSimilarMissingSide(rng: RNG): Grade7Problem {
  const [num, den] = pick(rng, [[2, 1], [3, 1], [1, 2], [3, 2], [2, 3], [5, 2]] as const);
  const k = randInt(rng, 2, 7);
  const known1 = den * k;
  const known2 = num * k;
  const m = randInt(rng, 2, 8);
  const side1 = den * m;
  const side2 = num * m;
  return build(
    "SimilarFigures7",
    `Two triangles are similar. In the first triangle, two sides measure ${known1} in. and ${side1} in. In the second triangle, the side corresponding to the ${known1} in. side measures ${known2} in. Find the length of the side corresponding to the ${side1} in. side.`,
    "the missing side length",
    side2,
    [
      {
        instruction: `Set up a proportion: ${side1}/${known1} = x/${known2}.`,
        blanks: [{ label: "proportion", answer: `${side1}/${known1} = x/${known2}` }],
      },
      {
        instruction: `Cross multiply and solve: x = ${side1} × ${known2} ÷ ${known1}.`,
        blanks: [{ label: "answer", answer: String(side2) }],
      },
    ],
    { kind: "missing-side", known1, known2, side1 },
    null,
    "inches"
  );
}

function makeScaleDrawing(rng: RNG): Grade7Problem {
  const s = pick(rng, [
    { text: "1 inch represents 10 miles", per: 10, mapUnit: "inches", realUnit: "miles" },
    { text: "1 inch represents 25 miles", per: 25, mapUnit: "inches", realUnit: "miles" },
    { text: "1 cm represents 5 km", per: 5, mapUnit: "cm", realUnit: "km" },
    { text: "1 cm represents 2 km", per: 2, mapUnit: "cm", realUnit: "km" },
    { text: "1 inch represents 4 feet", per: 4, mapUnit: "inches", realUnit: "feet" },
  ]);
  const mapDist = pick(rng, [2, 3, 4, 5, 6, 7, 2.5, 3.5, 4.5]);
  const actual = mapDist * s.per;
  const ans = `${fmt(actual)} ${s.realUnit}`;
  return build(
    "SimilarFigures7",
    `On a map, ${s.text}. Two places are ${fmt(mapDist)} ${s.mapUnit} apart on the map. What is the actual distance between the two places?`,
    "the actual distance",
    ans,
    [
      {
        instruction: `Actual distance = map distance × ${s.per} = ${fmt(mapDist)} × ${s.per}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "scale-drawing", map: fmt(mapDist), per: s.per, unit: s.realUnit }
  );
}

function makeSimilarAreaScale(rng: RNG): Grade7Problem {
  const o = pick(rng, [
    { num: 2, den: 1, areas: [12, 15, 20, 24, 30] },
    { num: 3, den: 1, areas: [5, 8, 11, 14] },
    { num: 1, den: 2, areas: [24, 36, 48, 60, 80] },
    { num: 3, den: 2, areas: [8, 12, 16, 20, 24] },
    { num: 2, den: 3, areas: [18, 27, 36, 45] },
  ]);
  const k = randInt(rng, 2, 6);
  const side1 = o.den * k;
  const side2 = o.num * k;
  const area1 = pick(rng, o.areas);
  const area2 = (area1 * o.num * o.num) / (o.den * o.den);
  const kStr = fracToString(makeFrac(o.num, o.den));
  const ans = `${fmt(area2)} cm²`;
  return build(
    "SimilarFigures7",
    `Figure B is similar to Figure A. A side of Figure A is ${side1} cm and the corresponding side of Figure B is ${side2} cm. The area of Figure A is ${area1} cm². Find the area of Figure B.`,
    "the area of Figure B",
    ans,
    [
      {
        instruction: `The scale factor is ${kStr}. Areas scale by the square of the scale factor, (${kStr})².`,
        blanks: [{ label: "area multiplier", answer: fracToString(makeFrac(o.num * o.num, o.den * o.den)) }],
      },
      {
        instruction: `Area of B = ${area1} × (${kStr})².`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "area-scale", side1, side2, area1 },
    null,
    "cm²"
  );
}

// ── Lesson: Converting Between Measurement Systems (TEKS 7.4E) ─────────────

function makeInchCmConvert(rng: RNG): Grade7Problem {
  const toCm = rng() < 0.5;
  if (toCm) {
    const v = pick(rng, [2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
    const ans = `${fmt(roundTo(v * 2.54, 2))} cm`;
    return build(
      "ConversionsBetweenSystems",
      `Convert ${v} inches to centimeters. Use 1 inch = 2.54 centimeters.`,
      "the length in centimeters",
      ans,
      [
        {
          instruction: `Multiply by 2.54: ${v} × 2.54.`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "in-cm", dir: "to-cm", value: v },
      null,
      "cm"
    );
  }
  const inches = pick(rng, [1, 2, 3, 4, 5, 6, 8, 10, 15, 20]);
  const cm = roundTo(inches * 2.54, 2);
  const ans = `${inches} inches`;
  return build(
    "ConversionsBetweenSystems",
    `Convert ${fmt(cm)} centimeters to inches. Use 1 inch = 2.54 centimeters.`,
    "the length in inches",
    ans,
    [
      {
        instruction: `Divide by 2.54: ${fmt(cm)} ÷ 2.54.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "in-cm", dir: "to-in", value: fmt(cm) },
    null,
    "inches"
  );
}

function makeMileKmConvert(rng: RNG): Grade7Problem {
  const toKm = rng() < 0.5;
  if (toKm) {
    const mi = pick(rng, [3, 5, 10, 15, 20, 25, 40, 50, 100]);
    const ans = `about ${fmt(roundTo(mi * 1.61, 2))} km`;
    return build(
      "ConversionsBetweenSystems",
      `A road trip is ${mi} miles long. About how many kilometers is that? Use 1 mile is about 1.61 kilometers.`,
      "the distance in kilometers",
      ans,
      [
        {
          instruction: `Multiply by 1.61: ${mi} × 1.61.`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "mi-km", dir: "to-km", value: mi },
      null,
      "km"
    );
  }
  const mi = pick(rng, [5, 10, 20, 25, 50, 100]);
  const km = roundTo(mi * 1.61, 2);
  const ans = `about ${mi} miles`;
  return build(
    "ConversionsBetweenSystems",
    `A bike route is ${fmt(km)} kilometers long. About how many miles is that? Use 1 mile is about 1.61 kilometers.`,
    "the distance in miles",
    ans,
    [
      {
        instruction: `Divide by 1.61: ${fmt(km)} ÷ 1.61.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "mi-km", dir: "to-mi", value: fmt(km) },
    null,
    "miles"
  );
}

function makeGallonLiterConvert(rng: RNG): Grade7Problem {
  const toL = rng() < 0.5;
  if (toL) {
    const gal = pick(rng, [2, 3, 4, 5, 6, 10, 15, 20]);
    const ans = `about ${fmt(roundTo(gal * 3.79, 2))} liters`;
    return build(
      "ConversionsBetweenSystems",
      `A fish tank holds ${gal} gallons of water. About how many liters is that? Use 1 gallon is about 3.79 liters.`,
      "the capacity in liters",
      ans,
      [
        {
          instruction: `Multiply by 3.79: ${gal} × 3.79.`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "gal-L", dir: "to-L", value: gal },
      null,
      "liters"
    );
  }
  const gal = pick(rng, [2, 3, 4, 5, 10, 20]);
  const liters = roundTo(gal * 3.79, 2);
  const ans = `about ${gal} gallons`;
  return build(
    "ConversionsBetweenSystems",
    `A bottle holds ${fmt(liters)} liters of water. About how many gallons is that? Use 1 gallon is about 3.79 liters.`,
    "the capacity in gallons",
    ans,
    [
      {
        instruction: `Divide by 3.79: ${fmt(liters)} ÷ 3.79.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "gal-L", dir: "to-gal", value: fmt(liters) },
    null,
    "gallons"
  );
}

function makeApproxConvertMix(rng: RNG): Grade7Problem {
  const which = pick(rng, ["lb-kg", "m-yd", "ft-cm"] as const);
  if (which === "lb-kg") {
    const toKg = rng() < 0.5;
    if (toKg) {
      const lb = pick(rng, [10, 20, 30, 40, 50, 60, 80, 100, 150, 200]);
      const ans = `about ${fmt(roundTo(lb * 0.45, 2))} kg`;
      return build(
        "ConversionsBetweenSystems",
        `A dog weighs ${lb} pounds. About how many kilograms does it weigh? Use 1 pound is about 0.45 kilogram.`,
        "the mass in kilograms",
        ans,
        [
          {
            instruction: `Multiply by 0.45: ${lb} × 0.45.`,
            blanks: [{ label: "answer", answer: ans }],
          },
        ],
        { kind: "lb-kg", dir: "to-kg", value: lb },
        null,
        "kg"
      );
    }
    const lb = pick(rng, [10, 20, 40, 60, 100, 200]);
    const kg = roundTo(lb * 0.45, 2);
    const ans = `about ${lb} pounds`;
    return build(
      "ConversionsBetweenSystems",
      `A suitcase has a mass of ${fmt(kg)} kilograms. About how many pounds is that? Use 1 pound is about 0.45 kilogram.`,
      "the mass in pounds",
      ans,
      [
        {
          instruction: `Work backwards from kilograms: divide ${fmt(kg)} by 0.45.`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "lb-kg", dir: "to-lb", value: fmt(kg) },
      null,
      "pounds"
    );
  }
  if (which === "m-yd") {
    const toYd = rng() < 0.5;
    if (toYd) {
      const m = pick(rng, [10, 20, 25, 50, 75, 100, 200]);
      const ans = `about ${fmt(roundTo(m * 1.09, 2))} yards`;
      return build(
        "ConversionsBetweenSystems",
        `A running track straightaway is ${m} meters long. About how many yards is that? Use 1 meter is about 1.09 yards.`,
        "the length in yards",
        ans,
        [
          {
            instruction: `Multiply by 1.09: ${m} × 1.09.`,
            blanks: [{ label: "answer", answer: ans }],
          },
        ],
        { kind: "m-yd", dir: "to-yd", value: m },
        null,
        "yards"
      );
    }
    const m = pick(rng, [10, 20, 50, 100]);
    const yd = roundTo(m * 1.09, 2);
    const ans = `about ${m} meters`;
    return build(
      "ConversionsBetweenSystems",
      `A ribbon is ${fmt(yd)} yards long. About how many meters is that? Use 1 meter is about 1.09 yards.`,
      "the length in meters",
      ans,
      [
        {
          instruction: `Divide by 1.09: ${fmt(yd)} ÷ 1.09.`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "m-yd", dir: "to-m", value: fmt(yd) },
      null,
      "meters"
    );
  }
  const ft = pick(rng, [1, 2, 3, 4, 5, 6]);
  const inches = ft * 12;
  const ans = `${fmt(roundTo(inches * 2.54, 2))} cm`;
  return build(
    "ConversionsBetweenSystems",
    `Convert ${ft} ${ft === 1 ? "foot" : "feet"} to centimeters. First change feet to inches (1 foot = 12 inches), then use 1 inch = 2.54 centimeters.`,
    "the length in centimeters",
    ans,
    [
      {
        instruction: `${ft} ${ft === 1 ? "foot" : "feet"} = ${inches} inches.`,
        blanks: [{ label: "inches", answer: String(inches) }],
      },
      {
        instruction: `Multiply by 2.54: ${inches} × 2.54.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "ft-cm", value: ft },
    null,
    "cm"
  );
}

// ── Lesson: Simple & Compound Interest (TEKS 7.13E) ─────────────────────────

function money7(n: number): string {
  return `$${fmtFixed(n, 2)}`;
}

function makeSimpleInterest7(rng: RNG): Grade7Problem {
  const P = pick(rng, [100, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000]);
  const r = pick(rng, [2, 3, 4, 5, 6]);
  const t = randInt(rng, 1, 5);
  const I = (P * r * t) / 100;
  const ans = money7(I);
  return build(
    "Interest7",
    `You deposit $${P} into an account that pays ${r}% simple interest each year. How much interest will you earn in ${t} year${t === 1 ? "" : "s"}?`,
    "the interest earned",
    ans,
    [
      {
        instruction: `Use I = Prt: I = ${P} × ${fmt(r / 100)} × ${t}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "simple", P, r, t },
    null,
    "dollars"
  );
}

function makeSimpleBalance7(rng: RNG): Grade7Problem {
  const P = pick(rng, [250, 400, 500, 750, 900, 1000, 1600]);
  const r = pick(rng, [2, 3, 4, 5]);
  const t = randInt(rng, 2, 6);
  const A = P + (P * r * t) / 100;
  const ans = money7(A);
  return build(
    "Interest7",
    `A savings account starts with $${P} and earns ${r}% simple interest each year. What is the balance after ${t} years if no money is added or taken out?`,
    "the balance",
    ans,
    [
      {
        instruction: `Interest = ${P} × ${fmt(r / 100)} × ${t} = ${money7((P * r * t) / 100)}. Add the interest to the principal.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "simple-balance", P, r, t },
    null,
    "dollars"
  );
}

function makeCompoundInterest7(rng: RNG): Grade7Problem {
  const P = pick(rng, [200, 400, 500, 800, 1000]);
  const r = pick(rng, [2, 3, 4, 5]);
  const t = randInt(rng, 2, 3);
  const A = P * Math.pow(1 + r / 100, t);
  const ans = money7(A);
  return build(
    "Interest7",
    `You invest $${P} at ${r}% interest compounded yearly. What is the balance after ${t} years? Round to the nearest cent.`,
    "the balance",
    ans,
    [
      {
        instruction: `Each year the balance is multiplied by ${fmt(1 + r / 100)}. After ${t} years, the balance is $${P} multiplied by ${fmt(1 + r / 100)} a total of ${t} times.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "compound", P, r, t },
    null,
    "dollars"
  );
}

function makeCompareSimpleCompound7(rng: RNG): Grade7Problem {
  const P = pick(rng, [400, 500, 1000, 2000]);
  const r = pick(rng, [3, 4, 5, 6, 10]);
  const t = randInt(rng, 2, 3);
  const simpleI = (P * r * t) / 100;
  const A = P * Math.pow(1 + r / 100, t);
  const compoundI = A - P;
  const ans = money7(compoundI - simpleI);
  return build(
    "Interest7",
    `You invest $${P} at ${r}% interest for ${t} years. One account pays simple interest, and a second account pays interest compounded yearly. How much more interest does the compound account earn than the simple account?`,
    "the extra interest from compounding",
    ans,
    [
      {
        instruction: `Simple interest = ${P} × ${fmt(r / 100)} × ${t}.`,
        blanks: [{ label: "simple interest", answer: money7(simpleI) }],
      },
      {
        instruction: `Compound balance = ${money7(A)}, so the compound interest is ${money7(compoundI)}. Subtract the simple interest.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "compare-simple-compound", P, r, t },
    null,
    "dollars"
  );
}

// ── Lesson: Net Worth & Financial Records (TEKS 7.13C) ──────────────────────

const NW_CLASSIFY_POOL: Array<{ item: string; expected: "asset" | "liability" }> = [
  { item: "a house", expected: "asset" },
  { item: "a car", expected: "asset" },
  { item: "money in a savings account", expected: "asset" },
  { item: "a jewelry collection", expected: "asset" },
  { item: "an investment account", expected: "asset" },
  { item: "furniture and electronics", expected: "asset" },
  { item: "a mortgage", expected: "liability" },
  { item: "a credit card balance", expected: "liability" },
  { item: "a student loan", expected: "liability" },
  { item: "a car loan", expected: "liability" },
  { item: "a personal loan", expected: "liability" },
  { item: "money owed on a store credit card", expected: "liability" },
];

function makeClassifyAssetLiability(rng: RNG): Grade7Problem {
  const c = pick(rng, NW_CLASSIFY_POOL);
  return build(
    "NetWorth7",
    `Is ${c.item} an asset or a liability?`,
    "asset or liability",
    c.expected,
    [
      {
        instruction:
          c.expected === "asset"
            ? "An asset is something a person owns that has value."
            : "A liability is money a person owes to someone else.",
        blanks: [{ label: "answer", answer: c.expected }],
      },
    ],
    { kind: "classify", item: c.item, expected: c.expected }
  );
}

function makeNetWorthCompute(rng: RNG): Grade7Problem {
  const family = pick(rng, ["Alvarez", "Johnson", "Nguyen", "Smith", "Garcia", "Kim"]);
  const H = pick(rng, [120000, 150000, 180000, 200000, 240000]);
  const C = pick(rng, [6000, 9000, 12000, 15000, 18000]);
  const S = pick(rng, [1500, 2500, 4000, 6000, 8500]);
  const M = Math.round(H * pick(rng, [0.5, 0.6, 0.7, 0.8]));
  const D = pick(rng, [800, 1200, 2000, 3500, 4200]);
  const assets = H + C + S;
  const liabilities = M + D;
  const net = assets - liabilities;
  const ans = `$${net.toLocaleString("en-US")}`;
  return build(
    "NetWorth7",
    `The ${family} family owns a house worth $${H.toLocaleString("en-US")}, a car worth $${C.toLocaleString("en-US")}, and has $${S.toLocaleString("en-US")} in a savings account. They owe $${M.toLocaleString("en-US")} on their mortgage and $${D.toLocaleString("en-US")} on credit cards. What is the family's net worth?`,
    "the net worth",
    ans,
    [
      {
        instruction: `Total assets = $${H.toLocaleString("en-US")} + $${C.toLocaleString("en-US")} + $${S.toLocaleString("en-US")}.`,
        blanks: [{ label: "assets", answer: `$${assets.toLocaleString("en-US")}` }],
      },
      {
        instruction: `Total liabilities = $${M.toLocaleString("en-US")} + $${D.toLocaleString("en-US")} = $${liabilities.toLocaleString("en-US")}. Net worth = assets − liabilities.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "net-worth", assets: `${H},${C},${S}`, liabilities: `${M},${D}` },
    null,
    "dollars"
  );
}

function makeNetWorthChange(rng: RNG): Grade7Problem {
  const start = pick(rng, [15000, 24000, 32500, 48000, 56000, 72000]);
  const amount = pick(rng, [500, 1000, 1500, 2500, 4000, 5000]);
  const ev = pick(rng, [
    {
      event: "payoff",
      text: `uses a work bonus of $${amount.toLocaleString("en-US")} to pay off part of a loan`,
      why: "The loan (a liability) drops by the amount paid, and the bonus was new money, so net worth rises by that amount.",
    },
    {
      event: "asset-gain",
      text: `sees their house increase in value by $${amount.toLocaleString("en-US")}`,
      why: "An asset grew in value, so net worth rises by that amount.",
    },
    {
      event: "asset-drop",
      text: `sees their car decrease in value by $${amount.toLocaleString("en-US")}`,
      why: "An asset lost value, so net worth falls by that amount.",
    },
    {
      event: "new-debt-spent",
      text: `borrows $${amount.toLocaleString("en-US")} for a vacation and spends all of it`,
      why: "The loan is a new liability and nothing of value was kept, so net worth falls by that amount.",
    },
  ] as const);
  const delta = ev.event === "payoff" || ev.event === "asset-gain" ? amount : -amount;
  const ans = `$${(start + delta).toLocaleString("en-US")}`;
  return build(
    "NetWorth7",
    `A family's net worth is $${start.toLocaleString("en-US")}. Then the family ${ev.text}. What is the family's new net worth?`,
    "the new net worth",
    ans,
    [
      {
        instruction: ev.why,
        blanks: [{ label: "change", answer: `${delta > 0 ? "+" : "−"}$${amount.toLocaleString("en-US")}` }],
      },
      {
        instruction: `New net worth = $${start.toLocaleString("en-US")} ${delta > 0 ? "+" : "−"} $${amount.toLocaleString("en-US")}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "nw-change", start, event: ev.event, amount },
    null,
    "dollars"
  );
}

// ── Lesson: Family Budgets & Wages (TEKS 7.13D) ─────────────────────────────

function budgetCategories(rng: RNG): { rent: number; food: number; utilities: number; transport: number; other: number } {
  return {
    rent: pick(rng, [700, 850, 900, 1000, 1100, 1200, 1250, 1400]),
    food: pick(rng, [300, 350, 400, 450, 500, 600]),
    utilities: pick(rng, [90, 120, 135, 150, 180, 210]),
    transport: pick(rng, [150, 180, 200, 240, 275, 320]),
    other: pick(rng, [80, 100, 125, 160, 200]),
  };
}

function makeMonthlyExpenseTotal(rng: RNG): Grade7Problem {
  const c = budgetCategories(rng);
  const total = c.rent + c.food + c.utilities + c.transport + c.other;
  const ans = `$${total.toLocaleString("en-US")}`;
  return build(
    "FamilyBudgets7",
    `A family's monthly expenses are: rent $${c.rent.toLocaleString("en-US")}, groceries $${c.food}, utilities $${c.utilities}, transportation $${c.transport}, and other $${c.other}. What are the family's total monthly expenses?`,
    "the total monthly expenses",
    ans,
    [
      {
        instruction: `Add all five expenses: ${c.rent} + ${c.food} + ${c.utilities} + ${c.transport} + ${c.other}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "expense-total", ...c },
    null,
    "dollars"
  );
}

function makeMinimumIncome(rng: RNG): Grade7Problem {
  const c = budgetCategories(rng);
  const total = c.rent + c.food + c.utilities + c.transport + c.other;
  const savings = pick(rng, [100, 150, 200, 250, 300]);
  const ans = `$${(total + savings).toLocaleString("en-US")}`;
  return build(
    "FamilyBudgets7",
    `A family's monthly expenses are: rent $${c.rent.toLocaleString("en-US")}, groceries $${c.food}, utilities $${c.utilities}, transportation $${c.transport}, and other $${c.other}. The family also wants to save $${savings} each month. What is the minimum monthly income the family needs?`,
    "the minimum monthly income",
    ans,
    [
      {
        instruction: `Total expenses = $${total.toLocaleString("en-US")}. The income must cover the expenses plus the savings goal.`,
        blanks: [{ label: "expenses", answer: `$${total.toLocaleString("en-US")}` }],
      },
      {
        instruction: `Minimum income = $${total.toLocaleString("en-US")} + $${savings}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "min-income", ...c, savings },
    null,
    "dollars"
  );
}

function makeHourlyWageNeeded(rng: RNG): Grade7Problem {
  const wage = pick(rng, [9, 10, 11, 12, 12.5, 14, 15, 16, 18, 20, 22, 25]);
  const hoursPerWeek = pick(rng, [10, 15, 20, 25, 30, 35, 40]);
  const monthly = wage * 4 * hoursPerWeek;
  const ans = `$${fmt(wage)} per hour`;
  return build(
    "FamilyBudgets7",
    `A family needs $${monthly.toLocaleString("en-US")} of income each month. One parent works ${hoursPerWeek} hours per week. Using 4 weeks in a month, what hourly wage must the parent earn?`,
    "the hourly wage needed",
    ans,
    [
      {
        instruction: `Hours per month = ${hoursPerWeek} × 4 = ${hoursPerWeek * 4}.`,
        blanks: [{ label: "hours per month", answer: String(hoursPerWeek * 4) }],
      },
      {
        instruction: `Wage = monthly income ÷ hours per month = ${monthly} ÷ ${hoursPerWeek * 4}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "hourly-wage", monthly, hoursPerWeek },
    null,
    "dollars per hour"
  );
}

function makeCategoryPercent(rng: RNG): Grade7Problem {
  const income = pick(rng, [2000, 2500, 3000, 3200, 4000, 4500, 5000, 6000]);
  const pct = pick(rng, [5, 10, 15, 20, 25, 30, 35, 40]);
  const cat = pick(rng, ["housing", "groceries", "transportation", "savings", "entertainment"]);
  const amount = (income * pct) / 100;
  const ans = `${pct}%`;
  return build(
    "FamilyBudgets7",
    `A family earns $${income.toLocaleString("en-US")} per month and spends $${amount.toLocaleString("en-US")} on ${cat}. What percent of the family's income is spent on ${cat}?`,
    "the percent of income",
    ans,
    [
      {
        instruction: `Percent = amount ÷ income × 100 = ${amount} ÷ ${income} × 100.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "category-percent", amount, income, category: cat }
  );
}

// ── Lesson: Reading Bar, Dot & Circle Graphs (TEKS 7.6G) ────────────────────

const SURVEY_TOPICS: Array<{ topic: string; cats: string[] }> = [
  { topic: "favorite sport", cats: ["Soccer", "Basketball", "Baseball", "Swimming"] },
  { topic: "favorite pet", cats: ["Dogs", "Cats", "Fish", "Birds"] },
  { topic: "favorite subject", cats: ["Math", "Reading", "Science", "Art"] },
  { topic: "favorite season", cats: ["Spring", "Summer", "Fall", "Winter"] },
];

const SURVEY_PCT_COMBOS: number[][] = [
  [40, 30, 20, 10],
  [50, 25, 15, 10],
  [35, 25, 25, 15],
  [45, 20, 20, 15],
  [30, 30, 25, 15],
  [25, 25, 25, 25],
  [60, 20, 10, 10],
  [45, 30, 15, 10],
];

function surveyData(rng: RNG): { topic: string; cats: string[]; counts: number[]; total: number } {
  const t = pick(rng, SURVEY_TOPICS);
  const pcts = shuffled(rng, pick(rng, SURVEY_PCT_COMBOS));
  const total = pick(rng, [40, 60, 80, 100, 200]);
  const counts = pcts.map((p) => (p * total) / 100);
  return { topic: t.topic, cats: t.cats, counts, total };
}

function surveyText(d: { topic: string; cats: string[]; counts: number[]; total: number }): string {
  const parts = d.cats.map((c, i) => `${c}: ${d.counts[i]} students`).join(", ");
  return `${d.total} students were surveyed about their ${d.topic}. The results were: ${parts}.`;
}

function makeCircleGraphPercent(rng: RNG): Grade7Problem {
  const d = surveyData(rng);
  const idx = randInt(rng, 0, 3);
  const pct = (d.counts[idx] / d.total) * 100;
  const ans = `${Math.round(pct)}%`;
  return build(
    "ReadingGraphs7",
    `${surveyText(d)} A circle graph is made from the data. What percent of the circle graph should be labeled for ${d.cats[idx]}?`,
    "the percent for the category",
    ans,
    [
      {
        instruction: `Percent = category count ÷ total = ${d.counts[idx]} ÷ ${d.total}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "circle-percent", count: d.counts[idx], total: d.total }
  );
}

function makeCircleGraphCount(rng: RNG): Grade7Problem {
  const t = pick(rng, SURVEY_TOPICS);
  const total = pick(rng, [40, 60, 80, 100, 200]);
  const pct = pick(rng, [10, 15, 20, 25, 30, 35, 40, 45, 50, 60]);
  const idx = randInt(rng, 0, 3);
  const count = (pct * total) / 100;
  return build(
    "ReadingGraphs7",
    `A circle graph shows the results of a survey of ${total} students about their ${t.topic}. The section for ${t.cats[idx]} is ${pct}% of the graph. How many students chose ${t.cats[idx]}?`,
    "the number of students",
    count,
    [
      {
        instruction: `Find ${pct}% of ${total}: ${total} × ${fmt(pct / 100)}.`,
        blanks: [{ label: "answer", answer: String(count) }],
      },
    ],
    { kind: "circle-count", pct, total }
  );
}

function makeCompareCategories(rng: RNG): Grade7Problem {
  const d = surveyData(rng);
  const mode = pick(rng, ["diff", "ratio"] as const);
  let i = randInt(rng, 0, 3);
  let j = randInt(rng, 0, 3);
  let guard = 0;
  while ((j === i || (mode === "diff" && d.counts[i] === d.counts[j])) && guard++ < 40) {
    i = randInt(rng, 0, 3);
    j = randInt(rng, 0, 3);
  }
  if (mode === "diff") {
    const hi = d.counts[i] > d.counts[j] ? i : j;
    const lo = hi === i ? j : i;
    const ans = d.counts[hi] - d.counts[lo];
    return build(
      "ReadingGraphs7",
      `${surveyText(d)} How many more students chose ${d.cats[hi]} than chose ${d.cats[lo]}?`,
      "how many more students",
      ans,
      [
        {
          instruction: `Subtract the counts: ${d.counts[hi]} − ${d.counts[lo]}.`,
          blanks: [{ label: "answer", answer: String(ans) }],
        },
      ],
      { kind: "compare-cats", counts: d.counts.join(","), i: hi, j: lo, mode }
    );
  }
  const ans = fracToString(makeFrac(d.counts[i], d.counts[j]));
  return build(
    "ReadingGraphs7",
    `${surveyText(d)} What is the ratio of students who chose ${d.cats[i]} to students who chose ${d.cats[j]}? Write the ratio in simplest form.`,
    "the ratio in simplest form",
    ans,
    [
      {
        instruction: `The ratio is ${d.counts[i]}:${d.counts[j]}. Divide both numbers by their greatest common factor.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "compare-cats", counts: d.counts.join(","), i, j, mode }
  );
}

function makeDotPlotStats(rng: RNG): Grade7Problem {
  const ctx = pick(rng, [
    { name: "number of books read last month", unit: "books" },
    { name: "number of pets owned", unit: "pets" },
    { name: "number of siblings", unit: "siblings" },
  ]);
  const stat = pick(rng, ["median", "mode"] as const);
  let vals: number[] = [];
  let guard = 0;
  while (guard++ < 80) {
    const n = randInt(rng, 7, 11);
    vals = Array.from({ length: n }, () => randInt(rng, 0, 6)).sort((a, b) => a - b);
    if (stat === "mode") {
      const freq = new Map<number, number>();
      for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
      const maxF = Math.max(...freq.values());
      const modes = [...freq.entries()].filter(([, c]) => c === maxF);
      if (modes.length === 1 && maxF >= 2) break;
    } else {
      break;
    }
  }
  const list = vals.join(", ");
  if (stat === "mode") {
    const freq = new Map<number, number>();
    for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
    let modeVal = vals[0];
    let best = 0;
    for (const [v, c] of freq) if (c > best) { best = c; modeVal = v; }
    return build(
      "ReadingGraphs7",
      `A dot plot shows the ${ctx.name} for a class. The values shown by the dots are: ${list}. What is the mode of the data?`,
      "the mode",
      modeVal,
      [
        {
          instruction: `The mode is the value that appears most often. The value ${modeVal} appears ${best} times.`,
          blanks: [{ label: "answer", answer: String(modeVal) }],
        },
      ],
      { kind: "dot-mode", data: list }
    );
  }
  const n = vals.length;
  const median = n % 2 === 1 ? vals[Math.floor(n / 2)] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
  const ans = fmt(median);
  return build(
    "ReadingGraphs7",
    `A dot plot shows the ${ctx.name} for a class. The values shown by the dots are: ${list}. What is the median of the data?`,
    "the median",
    ans,
    [
      {
        instruction:
          n % 2 === 1
            ? `There are ${n} values, so the median is the middle value when the values are in order.`
            : `There are ${n} values, so the median is the average of the two middle values, ${vals[n / 2 - 1]} and ${vals[n / 2]}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "dot-median", data: list }
  );
}

// ── Lesson: Rational Number Sets & Subsets (TEKS 7.2) ───────────────────────

const SET_CLASSIFY_POOL7 = [
  "7", "0", "-4", "3/4", "-5/6", "2.5", "-0.75", "12/3", "-9/3",
  "0.333... (repeating)", "15", "-11", "1/2", "-2.4", "100/10", "0/5",
  "8/4", "-7/1", "0.85", "23",
];

type SetLevel7 = "natural" | "whole" | "integer" | "rational";

function setLevel7(text: string): SetLevel7 {
  if (text.includes("...")) return "rational";
  if (text.includes("/")) {
    const [ns, ds] = text.split("/");
    const n = Number(ns);
    const d = Number(ds);
    if (n % d !== 0) return "rational";
    const v = n / d;
    return v > 0 ? "natural" : v === 0 ? "whole" : "integer";
  }
  if (text.includes(".")) return "rational";
  const v = Number(text);
  return v > 0 ? "natural" : v === 0 ? "whole" : "integer";
}

const SET_LABEL7: Record<SetLevel7, string> = {
  natural: "natural number",
  whole: "whole number",
  integer: "integer",
  rational: "rational number",
};

function makeClassifySet7(rng: RNG): Grade7Problem {
  const text = pick(rng, SET_CLASSIFY_POOL7);
  const ans = SET_LABEL7[setLevel7(text)];
  return build(
    "NumberSets7",
    `What is the most specific set that ${text} belongs to: natural numbers, whole numbers, integers, or rational numbers?`,
    "the most specific set",
    ans,
    [
      {
        instruction: "Natural numbers are the counting numbers 1, 2, 3, and so on. Whole numbers add 0. Integers add the negatives. Rational numbers can be written as a fraction of two integers.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "classify-set", value: text }
  );
}

const SUBSET_STATEMENTS7: Array<{ statement: string; truth: "true" | "false" }> = [
  { statement: "Every integer is a rational number", truth: "true" },
  { statement: "Every rational number is an integer", truth: "false" },
  { statement: "Every whole number is a natural number", truth: "false" },
  { statement: "Every natural number is a whole number", truth: "true" },
  { statement: "Every integer is a whole number", truth: "false" },
  { statement: "Every whole number is an integer", truth: "true" },
  { statement: "Every rational number is a whole number", truth: "false" },
  { statement: "Every natural number is a rational number", truth: "true" },
  { statement: "Every natural number is an integer", truth: "true" },
  { statement: "Every integer is a natural number", truth: "false" },
];

function makeSubsetStatement7(rng: RNG): Grade7Problem {
  const s = pick(rng, SUBSET_STATEMENTS7);
  return build(
    "NumberSets7",
    `True or false: ${s.statement}.`,
    "true or false",
    s.truth,
    [
      {
        instruction: "Each set sits inside the larger ones: natural numbers are inside the whole numbers, which are inside the integers, which are inside the rational numbers. A statement is true only if it works for every number in the first set.",
        blanks: [{ label: "answer", answer: s.truth }],
      },
    ],
    { kind: "subset-statement", statement: s.statement }
  );
}

function makeAllSets7(rng: RNG): Grade7Problem {
  const text = pick(rng, SET_CLASSIFY_POOL7);
  const level = setLevel7(text);
  const sets: Record<SetLevel7, string> = {
    natural: "natural number, whole number, integer, rational number",
    whole: "whole number, integer, rational number",
    integer: "integer, rational number",
    rational: "rational number",
  };
  const ans = sets[level];
  return build(
    "NumberSets7",
    `Name every set that ${text} belongs to, choosing from: natural numbers, whole numbers, integers, rational numbers. List them in that order, separated by commas.`,
    "all the sets it belongs to",
    ans,
    [
      {
        instruction: "The sets are nested: every natural number is also whole, an integer, and rational; every integer is also rational; a fraction or decimal that is not an integer is rational only.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "all-sets", value: text }
  );
}

function makeCountInSet7(rng: RNG): Grade7Problem {
  const set = pick(rng, ["natural numbers", "whole numbers", "integers"] as const);
  let values: string[] = [];
  let count = 0;
  let guard = 0;
  while (guard++ < 80) {
    values = shuffled(rng, SET_CLASSIFY_POOL7).slice(0, 6);
    count = values.filter((v) => {
      const level = setLevel7(v);
      if (set === "natural numbers") return level === "natural";
      if (set === "whole numbers") return level === "natural" || level === "whole";
      return level !== "rational";
    }).length;
    if (count > 0 && count < values.length) break;
  }
  return build(
    "NumberSets7",
    `How many of these numbers are ${set}? ${values.join(", ")}`,
    `the count of ${set}`,
    count,
    [
      {
        instruction: "Check each number: a counting number (1, 2, 3, ...) is natural; 0 is whole but not natural; a negative whole value is an integer; fractions and decimals that are not integers are rational only.",
        blanks: [{ label: "answer", answer: String(count) }],
      },
    ],
    { kind: "count-in-set", values: values.join(","), set }
  );
}

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
  { tier: 2, subtype: "Percents", make: makePercentChange },
  { tier: 3, subtype: "Percents", make: makePercentDiscount },
  // T5 · Data
  { tier: 1, subtype: "Sampling", make: makeSampleFraction },
  { tier: 2, subtype: "Sampling", make: makeSamplePrediction },
  { tier: 1, subtype: "ComparingPopulations", make: makeCompareSimple },
  { tier: 2, subtype: "ComparingPopulations", make: makeCompareMeans },
  { tier: 1, subtype: "ProbabilityConcepts", make: makeSimpleProbability },
  { tier: 1, subtype: "ProbabilityConcepts", make: makeSpinnerProbability },
  { tier: 2, subtype: "ProbabilityConcepts", make: makeExperimentalProbability },
  { tier: 2, subtype: "ProbabilityConcepts", make: makeComplementProbability },
  { tier: 3, subtype: "ProbabilityConcepts", make: makeProbabilityWord },
  { tier: 1, subtype: "CompoundEvents", make: makeCompoundSimple },
  { tier: 2, subtype: "CompoundEvents", make: makeCompoundProbability },
  { tier: 3, subtype: "CompoundEvents", make: makeCompoundWord },
  // T6 · Financial Literacy
  { tier: 1, subtype: "EconomicThinking", make: makeTaxTotal },
  { tier: 2, subtype: "EconomicThinking", make: makeSalesTax },
  { tier: 2, subtype: "EconomicThinking", make: makeIncomeTax },
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
  // T8 · TEKS Extensions
  { tier: 1, subtype: "SimilarFigures7", make: makeScaleFactor7 },
  { tier: 2, subtype: "SimilarFigures7", make: makeSimilarMissingSide },
  { tier: 2, subtype: "SimilarFigures7", make: makeScaleDrawing },
  { tier: 3, subtype: "SimilarFigures7", make: makeSimilarAreaScale },
  { tier: 1, subtype: "ConversionsBetweenSystems", make: makeInchCmConvert },
  { tier: 1, subtype: "ConversionsBetweenSystems", make: makeMileKmConvert },
  { tier: 2, subtype: "ConversionsBetweenSystems", make: makeGallonLiterConvert },
  { tier: 3, subtype: "ConversionsBetweenSystems", make: makeApproxConvertMix },
  { tier: 1, subtype: "Interest7", make: makeSimpleInterest7 },
  { tier: 2, subtype: "Interest7", make: makeSimpleBalance7 },
  { tier: 2, subtype: "Interest7", make: makeCompoundInterest7 },
  { tier: 3, subtype: "Interest7", make: makeCompareSimpleCompound7 },
  { tier: 1, subtype: "NetWorth7", make: makeClassifyAssetLiability },
  { tier: 2, subtype: "NetWorth7", make: makeNetWorthCompute },
  { tier: 3, subtype: "NetWorth7", make: makeNetWorthChange },
  { tier: 1, subtype: "FamilyBudgets7", make: makeMonthlyExpenseTotal },
  { tier: 2, subtype: "FamilyBudgets7", make: makeMinimumIncome },
  { tier: 2, subtype: "FamilyBudgets7", make: makeHourlyWageNeeded },
  { tier: 3, subtype: "FamilyBudgets7", make: makeCategoryPercent },
  { tier: 1, subtype: "ReadingGraphs7", make: makeCircleGraphPercent },
  { tier: 2, subtype: "ReadingGraphs7", make: makeCompareCategories },
  { tier: 2, subtype: "ReadingGraphs7", make: makeDotPlotStats },
  { tier: 3, subtype: "ReadingGraphs7", make: makeCircleGraphCount },
  { tier: 1, subtype: "NumberSets7", make: makeClassifySet7 },
  { tier: 2, subtype: "NumberSets7", make: makeSubsetStatement7 },
  { tier: 2, subtype: "NumberSets7", make: makeAllSets7 },
  { tier: 3, subtype: "NumberSets7", make: makeCountInSet7 },
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
  "SimilarFigures7",
  "ConversionsBetweenSystems",
  "Interest7",
  "NetWorth7",
  "FamilyBudgets7",
  "ReadingGraphs7",
  "NumberSets7",
];

/**
 * Generate n Grade 7 problems using the provided RNG.
 * `subtypes` optionally restricts to certain lessons; `difficulty` filters tiers.
 */
export function generateGrade7Problems(
  rng: RNG,
  n: number,
  difficulty: Grade7Difficulty = 2,
  subtypes?: readonly Grade7Subtype[],
  wordProblems = false
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
    const problem = entry.make(rng, wordProblems);
    problem.tier = entry.tier;
    return problem;
  });
}

// MiddleSchoolGrade6.ts
// Grade 6 problem generators, structured on the authoritative scope document
// (CURRICULUM_SCOPE.md, SAVVAS "6th Grade Math (year at a glance)"):
//
//   T1 Numbers & Operations: multiplying/dividing fractions, fluency w/ decimals
//   T2 Integers & Rational Numbers: integer operations
//   T3 Expressions/Equations/Relationships: variables & expressions →
//      equivalent expressions → equations & inequalities → two-variable rel.
//   T4 Proportionality: ratios, rates, ratio reasoning
//   T5 Geometry: area, volume, triangles & triangle properties
//   T6 Measurement & Data: data displays, measures of center & variation
//   T7 Personal Financial Literacy: banking, credit, paying for college,
//      annual salaries
//   T8 TEKS Extensions: coordinate graphing (6.11), unit conversions (6.4H),
//      number sets and absolute value (6.2A/B), fraction scaling (6.3B),
//      benchmark percents (6.4F), categorical data (6.12D), write the
//      problem (6.9C)
//
// Each lesson in the doc is a Grade6Subtype; registry entries are one per
// lesson (see src/modules/middle-school.ts). Pure, seeded, deterministic.
// Difficulty tiers 1|2|3 are cumulative and live in this factory.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type {
  Grade6Problem,
  Grade6Subtype,
  MiddleSchoolSVGParams,
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
} from "./MiddleSchoolUtils";

export type Grade6Difficulty = 1 | 2 | 3;

type Maker = (rng: RNG, wordProblems?: boolean) => Grade6Problem;
interface MakerEntry {
  tier: Grade6Difficulty;
  subtype: Grade6Subtype;
  make: Maker;
}

// ── Construction helper ─────────────────────────────────────────────────────

function build(
  subtype: Grade6Subtype,
  prompt: string,
  find: string,
  answer: number | string,
  steps: Grade6Problem["steps"],
  given: Record<string, number | string>,
  svgParams?: MiddleSchoolSVGParams | null,
  unit?: string
): Grade6Problem {
  return {
    type: "MS.6",
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

function numberLine(
  min: number,
  max: number,
  highlight: number[],
  openHighlight?: number[]
): MiddleSchoolSVGParams {
  const marks: number[] = [];
  for (let v = min; v <= max; v++) marks.push(v);
  return { kind: "MSNumberLine", min, max, marks, highlight, openHighlight };
}

function coordGrid(
  points: { x: number; y: number; label?: string }[] = [],
  segments: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = []
): MiddleSchoolSVGParams {
  return {
    kind: "MSCoordinateGrid",
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10,
    points,
    segments,
    polygons: [],
    showAxesLabels: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T1 · NUMBERS & OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Multiplying & Dividing Fractions ─────────────────────────────────

function makeFractionTimesWhole(rng: RNG): Grade6Problem {
  const whole = randInt(rng, 2, 6);
  const f = randFrac(rng, 8);
  const result = makeFrac(whole * f.n, f.d);
  const ans = fracToString(result);
  return build(
    "MultiplyingDividingFractions",
    `Find: ${whole} × ${fracToString(f)}. Write the answer in simplest form.`,
    "the product",
    ans,
    [
      {
        instruction: `Write ${whole} as a fraction: ${whole}/1. Multiply numerators and denominators:`,
        blanks: [{ label: "product", answer: `${whole * f.n}/${f.d}` }],
      },
      {
        instruction: "Simplify to lowest terms:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { whole, n: f.n, d: f.d, op: "mul" }
  );
}

function makeFractionAddSub(rng: RNG): Grade6Problem {
  const dens = [2, 3, 4, 5, 6, 8, 10, 12];
  const d1 = pick(rng, dens);
  const d2 = rng() < 0.5 ? d1 : pick(rng, dens.filter((d) => d % d1 === 0 || d1 % d === 0));
  const f1 = makeFrac(randInt(rng, 1, d1 - 1), d1);
  const f2 = makeFrac(randInt(rng, 1, d2 - 1), d2);
  const isAdd = rng() < 0.5;
  const result = isAdd ? fracAdd(f1, f2) : fracSub(f1, f2);
  const ans = fracToString(result);
  return build(
    "MultiplyingDividingFractions",
    isAdd
      ? `Find the sum: ${fracToString(f1)} + ${fracToString(f2)}. Write the answer in simplest form.`
      : `Find the difference: ${fracToString(f1)} − ${fracToString(f2)}. Write the answer in simplest form.`,
    isAdd ? "the sum" : "the difference",
    ans,
    [
      {
        instruction: `Rewrite with a common denominator (${(f1.d * f2.d) / gcd(f1.d, f2.d)}):`,
        blanks: [{ label: "common denominator", answer: `${(f1.d * f2.d) / gcd(f1.d, f2.d)}` }],
      },
      {
        instruction: `${isAdd ? "Add" : "Subtract"} the numerators, then simplify:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { n1: f1.n, d1: f1.d, n2: f2.n, d2: f2.d, op: isAdd ? "add" : "sub" }
  );
}

function makeFractionMulDiv(rng: RNG): Grade6Problem {
  const f1 = randFrac(rng, 10);
  const f2 = randFrac(rng, 10);
  const isMul = rng() < 0.5;
  const result = isMul ? fracMul(f1, f2) : fracDiv(f1, f2);
  const opSym = isMul ? "×" : "÷";
  const ans = fracToString(result);
  return build(
    "MultiplyingDividingFractions",
    isMul
      ? `Find the product: ${fracToString(f1)} × ${fracToString(f2)}. Write the answer in simplest form.`
      : `Find the quotient: ${fracToString(f1)} ÷ ${fracToString(f2)}. Write the answer in simplest form.`,
    isMul ? "the product" : "the quotient",
    ans,
    [
      {
        instruction: isMul
          ? "Multiply the numerators and multiply the denominators:"
          : `Multiply by the reciprocal of ${fracToString(f2)}:`,
        blanks: [
          {
            label: isMul ? "product" : "rewritten",
            answer: isMul ? `${f1.n * f2.n}/${f1.d * f2.d}` : `${fracToString(f1)} × ${f2.d}/${f2.n}`,
          },
        ],
      },
      {
        instruction: "Simplify to lowest terms:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { n1: f1.n, d1: f1.d, n2: f2.n, d2: f2.d, op: isMul ? "mul" : "div" }
  );
}

const FDP_WORDS: { text: string; make: (rng: RNG) => { prompt: string; answer: string | number; given: Record<string, number | string> } }[] = [
  {
    text: "of-class",
    make: (rng) => {
      const total = pick(rng, [20, 24, 28, 30, 32, 36, 40]);
      const f = makeFrac(pick(rng, [1, 2, 3]), pick(rng, [2, 3, 4]));
      const ans = Math.round((f.n / f.d) * total);
      return {
        prompt: `There are ${total} students in a class. ${fracToString(f)} of them ride the bus to school. How many students ride the bus?`,
        answer: ans,
        given: { total, n: f.n, d: f.d },
      };
    },
  },
  {
    text: "percent-of",
    make: (rng) => {
      const total = pick(rng, [50, 60, 80, 100, 120, 200]);
      const pct = pick(rng, [10, 20, 25, 40, 50, 60, 75, 80]);
      const ans = Math.round((pct / 100) * total);
      return {
        prompt: `${pct}% of the ${total} books in the library are mysteries. How many mystery books are there?`,
        answer: ans,
        given: { total, pct },
      };
    },
  },
  {
    text: "recipe",
    make: (rng) => {
      const batches = randInt(rng, 2, 4);
      const perBatch = randFrac(rng, 4);
      const total = fracMul(makeFrac(batches, 1), perBatch);
      return {
        prompt: `A recipe calls for ${fracToString(perBatch)} cup of sugar per batch. How much sugar is needed for ${batches} batches? Write the answer in simplest form.`,
        answer: fracToString(total),
        given: { batches, n: perBatch.n, d: perBatch.d },
      };
    },
  },
];

function makeFDPWord(rng: RNG): Grade6Problem {
  const w = pick(rng, FDP_WORDS);
  const { prompt, answer, given } = w.make(rng);
  return build(
    "MultiplyingDividingFractions",
    prompt,
    "the answer",
    answer,
    [
      { instruction: "Identify the numbers and the operation needed.", blanks: [{ label: "operation", answer: "multiply" }] },
      { instruction: "Compute and simplify:", blanks: [{ label: "answer", answer: String(answer) }] },
    ],
    { wordKind: w.text, ...given }
  );
}

// ── Lesson: Fluency with Decimals ────────────────────────────────────────────

function makeDecimalAddSub(rng: RNG): Grade6Problem {
  const a = roundTo(randInt(rng, 11, 999) / 100, 2);
  const isAdd = rng() < 0.5;
  let b: number;
  let ans: number;
  if (isAdd) {
    b = roundTo(randInt(rng, 11, 999) / 100, 2);
    ans = roundTo(a + b, 2);
  } else {
    b = roundTo(randInt(rng, 11, Math.round(a * 100)) / 100, 2);
    ans = roundTo(a - b, 2);
  }
  const opSym = isAdd ? "+" : "−";
  return build(
    "DecimalFluency",
    `Find: ${fmt(a)} ${opSym} ${fmt(b)}.`,
    "the result",
    fmt(ans),
    [
      {
        instruction: "Line up the decimal points and compute:",
        blanks: [{ label: "result", answer: fmt(ans) }],
      },
    ],
    { a: fmt(a), b: fmt(b), op: isAdd ? "add" : "sub" }
  );
}

function makeDecimalMulDiv(rng: RNG): Grade6Problem {
  const kind = pick(rng, ["mul", "div"] as const);
  if (kind === "mul") {
    const a = roundTo(randInt(rng, 11, 999) / 100, 2);
    const b = roundTo(randInt(rng, 11, 99) / 10, 1);
    const ans = roundTo(a * b, 3);
    return build(
      "DecimalFluency",
      `Find: ${fmt(a)} × ${fmt(b)}.`,
      "the product",
      fmt(ans),
      [
        {
          instruction: "Multiply as whole numbers, then place the decimal point:",
          blanks: [{ label: "product", answer: fmt(ans) }],
        },
      ],
      { a: fmt(a), b: fmt(b), op: "mul" }
    );
  }
  // division with a clean terminating quotient: dividend = divisor × quotient
  const divisor = roundTo(randInt(rng, 11, 99) / 10, 1);
  const quotient = roundTo(randInt(rng, 11, 99) / 10, 1);
  const dividend = roundTo(divisor * quotient, 3);
  return build(
    "DecimalFluency",
    `Find: ${fmt(dividend)} ÷ ${fmt(divisor)}.`,
    "the quotient",
    fmt(quotient),
    [
      {
        instruction: "Move the decimal point in the divisor to make it a whole number, then divide:",
        blanks: [{ label: "quotient", answer: fmt(quotient) }],
      },
    ],
    { dividend: fmt(dividend), divisor: fmt(divisor), op: "div" }
  );
}

function makeDecimalWord(rng: RNG): Grade6Problem {
  const price = roundTo(randInt(rng, 125, 975) / 100, 2);
  const qty = randInt(rng, 2, 6);
  const ans = roundTo(price * qty, 2);
  return build(
    "DecimalFluency",
    `Notebooks cost $${fmt(price)} each. What is the total cost of ${qty} notebooks?`,
    "the total cost",
    `$${fmt(ans)}`,
    [
      { instruction: `Multiply the price by the quantity: $${fmt(price)} × ${qty}.`, blanks: [{ label: "product", answer: fmt(ans) }] },
      { instruction: "Write the answer as money:", blanks: [{ label: "answer", answer: `$${fmt(ans)}` }] },
    ],
    { price: fmt(price), qty, wordKind: "decimal-money" }
  );
}

// ── Lesson: Fraction, Decimal & Percent Conversions ──────────────────────────

function makeFracToDecimal(rng: RNG): Grade6Problem {
  const d = pick(rng, [2, 4, 5, 8, 10, 20, 25, 50]);
  const n = randInt(rng, 1, d - 1);
  const f = makeFrac(n, d);
  const value = f.n / f.d;
  return build(
    "FDPConversions",
    `Write the fraction ${fracToString(f)} as a decimal.`,
    "the decimal",
    fmt(value),
    [
      {
        instruction: `Divide the numerator by the denominator: ${f.n} ÷ ${f.d}.`,
        blanks: [{ label: "quotient", answer: fmt(value) }],
      },
      {
        instruction: `Write ${fracToString(f)} as a decimal:`,
        blanks: [{ label: "decimal", answer: fmt(value) }],
      },
    ],
    { n: f.n, d: f.d }
  );
}

function makeDecimalToPercent(rng: RNG): Grade6Problem {
  const hundredths = randInt(rng, 1, 95);
  const decimal = hundredths / 100;
  const pct = `${hundredths}%`;
  return build(
    "FDPConversions",
    `Write ${fmt(decimal)} as a percent.`,
    "the percent",
    pct,
    [
      {
        instruction: `Multiply the decimal by 100: ${fmt(decimal)} × 100.`,
        blanks: [{ label: "product", answer: String(hundredths) }],
      },
      {
        instruction: "Write the result with a percent sign:",
        blanks: [{ label: "percent", answer: pct }],
      },
    ],
    { hundredths }
  );
}

function makePercentToFraction(rng: RNG): Grade6Problem {
  const pct = pick(rng, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95]);
  const f = makeFrac(pct, 100);
  const fracStr = fracToString(f);
  return build(
    "FDPConversions",
    `Write ${pct}% as a fraction in simplest form.`,
    "the fraction",
    fracStr,
    [
      {
        instruction: `Write the percent as a fraction over 100: ${pct}% = ${pct}/100.`,
        blanks: [{ label: "fraction", answer: `${pct}/100` }],
      },
      {
        instruction: "Simplify by dividing by the GCF:",
        blanks: [{ label: "simplest form", answer: fracStr }],
      },
    ],
    { pct }
  );
}

function makeFractionToPercent(rng: RNG): Grade6Problem {
  const d = pick(rng, [2, 4, 5, 10, 20, 25, 50]);
  const n = randInt(rng, 1, d - 1);
  const f = makeFrac(n, d);
  const pct = Math.round((f.n / f.d) * 100);
  return build(
    "FDPConversions",
    `Write ${fracToString(f)} as a percent.`,
    "the percent",
    `${pct}%`,
    [
      {
        instruction: `First write ${fracToString(f)} as a decimal: ${f.n} ÷ ${f.d} = ${fmt(f.n / f.d)}.`,
        blanks: [{ label: "decimal", answer: fmt(f.n / f.d) }],
      },
      {
        instruction: "Multiply by 100 and add the percent sign:",
        blanks: [{ label: "percent", answer: `${pct}%` }],
      },
    ],
    { n: f.n, d: f.d }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T2 · INTEGERS & RATIONAL NUMBERS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Integer Operations ───────────────────────────────────────────────

function makeCompareIntegers(rng: RNG): Grade6Problem {
  const a = randNonZero(rng, -15, 15);
  let b = randNonZero(rng, -15, 15);
  while (b === a) b = randNonZero(rng, -15, 15);
  const ans = a < b ? "<" : ">";
  const lo = Math.min(a, b) - 2;
  const hi = Math.max(a, b) + 2;
  return build(
    "IntegerOperations",
    `Compare: ${a} ___ ${b}. Write <, >, or =.`,
    "the comparison symbol",
    ans,
    [
      {
        instruction: "Locate both numbers on the number line. The number farther right is greater.",
        blanks: [{ label: "symbol", answer: ans }],
      },
    ],
    { a, b },
    numberLine(lo, hi, [a, b])
  );
}

function makeOrderIntegers(rng: RNG): Grade6Problem {
  const vals = new Set<number>();
  while (vals.size < 4) vals.add(randNonZero(rng, -12, 12));
  const arr = [...vals];
  const sorted = [...arr].sort((x, y) => x - y);
  const ans = sorted.join(", ");
  const lo = Math.min(...arr) - 1;
  const hi = Math.max(...arr) + 1;
  return build(
    "IntegerOperations",
    `Order the integers from least to greatest: ${arr.join(", ")}.`,
    "the ordered list",
    ans,
    [
      {
        instruction: "Plot each integer on the number line, then read left to right:",
        blanks: [{ label: "ordered list", answer: ans }],
      },
    ],
    { values: arr.join(","), order: "asc" },
    numberLine(lo, hi, arr)
  );
}

function makeAddSubtractIntegers(rng: RNG): Grade6Problem {
  const a = randNonZero(rng, -15, 15);
  const b = randNonZero(rng, -15, 15);
  const isAdd = rng() < 0.5;
  const ans = isAdd ? a + b : a - b;
  const cleanExpr = isAdd ? `${a} ${b < 0 ? "−" : "+"} ${Math.abs(b)}` : `${a} − ${b < 0 ? `(${b})` : b}`;
  return build(
    "IntegerOperations",
    `Find: ${cleanExpr}.`,
    "the result",
    ans,
    [
      {
        instruction: isAdd
          ? "Add the integers, keeping track of the signs:"
          : "Subtracting is the same as adding the opposite:",
        blanks: [{ label: "result", answer: String(ans) }],
      },
    ],
    { a, b, op: isAdd ? "add" : "sub" },
    numberLine(Math.min(a, ans) - 2, Math.max(a, ans) + 2, [a, ans])
  );
}

function makeMulDivIntegers(rng: RNG): Grade6Problem {
  const a = randNonZero(rng, -9, 9);
  const b = randNonZero(rng, -9, 9);
  const isMul = rng() < 0.5;
  let prompt: string;
  let result: number;
  if (isMul) {
    result = a * b;
    prompt = `Find: ${a} × (${b}).`;
  } else {
    const product = a * b;
    result = a;
    prompt = `Find: ${product} ÷ (${b}).`;
  }
  return build(
    "IntegerOperations",
    prompt,
    "the result",
    result,
    [
      {
        instruction: isMul
          ? "Multiply. The product is negative only when the signs differ:"
          : "Divide. The quotient is negative only when the signs differ:",
        blanks: [{ label: "result", answer: String(result) }],
      },
    ],
    isMul ? { a, b, op: "mul" } : { product: a * b, b, op: "div" }
  );
}

const INTEGER_WORDS = [
  {
    text: "temperature",
    make: (rng: RNG) => {
      const start = randInt(rng, 5, 20);
      const drop = randInt(rng, 10, 25);
      const ans = start - drop;
      return {
        prompt: `The temperature was ${start}°F in the afternoon. Overnight it dropped ${drop} degrees. What was the morning temperature?`,
        answer: `${ans}°F`,
        given: { start, drop } as Record<string, number | string>,
      };
    },
  },
  {
    text: "elevation",
    make: (rng: RNG) => {
      const start = randInt(rng, 3, 12);
      const down = randInt(rng, 8, 20);
      const ans = start - down;
      return {
        prompt: `A hiker starts at an elevation of ${start} feet above sea level, then descends ${down} feet into a canyon. What is the hiker's new elevation?`,
        answer: `${ans} feet`,
        given: { start, down } as Record<string, number | string>,
      };
    },
  },
  {
    text: "money",
    make: (rng: RNG) => {
      const owed = randInt(rng, 10, 40);
      const paid = randInt(rng, 5, owed + 10);
      const ans = paid - owed;
      return {
        prompt: `Maya owes her brother $${owed}. She pays him $${paid}. Represent her net change as an integer.`,
        answer: `$${ans}`,
        given: { owed, paid } as Record<string, number | string>,
      };
    },
  },
];

function makeIntegerWord(rng: RNG): Grade6Problem {
  const w = pick(rng, INTEGER_WORDS);
  const { prompt, answer, given } = w.make(rng);
  return build(
    "IntegerOperations",
    prompt,
    "the answer",
    answer,
    [
      { instruction: "Write an integer expression for the situation:", blanks: [{ label: "expression", answer: "see work" }] },
      { instruction: "Compute:", blanks: [{ label: "answer", answer: String(answer) }] },
    ],
    { wordKind: w.text, ...given }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T3 · EXPRESSIONS, EQUATIONS & RELATIONSHIPS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Variables & Expressions ──────────────────────────────────────────

function makeEvaluate(rng: RNG): Grade6Problem {
  const a = randNonZero(rng, -6, 6);
  const b = randInt(rng, -10, 10);
  const x = randInt(rng, 2, 9);
  const ans = a * x + b;
  const expr = b === 0 ? `${a === 1 ? "" : a === -1 ? "−" : a}x` : `${a === 1 ? "" : a === -1 ? "−" : a}x ${signStr(b)} ${Math.abs(b)}`;
  return build(
    "VariablesAndExpressions",
    `Evaluate ${expr} when x = ${x}.`,
    "the value",
    ans,
    [
      {
        instruction: `Substitute ${x} for x: ${a}(${x}) ${signStr(b)} ${Math.abs(b)}.`,
        blanks: [{ label: "substituted", answer: `${a * x} ${signStr(b)} ${Math.abs(b)}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { a, b, x }
  );
}

function makeEvaluateTwoVar(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 6);
  const x = randInt(rng, 2, 9);
  const y = randInt(rng, 2, 9);
  const ans = a * x + b * y;
  return build(
    "VariablesAndExpressions",
    `Evaluate ${a}x + ${b}y when x = ${x} and y = ${y}.`,
    "the value",
    ans,
    [
      {
        instruction: `Substitute: ${a}(${x}) + ${b}(${y}) = ${a * x} + ${b * y}.`,
        blanks: [{ label: "substituted", answer: `${a * x} + ${b * y}` }],
      },
      { instruction: "Add:", blanks: [{ label: "answer", answer: String(ans) }] },
    ],
    { a, b, x, y }
  );
}

function makeExpressionWord(rng: RNG): Grade6Problem {
  const price = randInt(rng, 3, 8);
  const fee = randInt(rng, 1, 5);
  return build(
    "VariablesAndExpressions",
    `A club charges $${price} per member plus a $${fee} registration fee. Write an algebraic expression for the total cost for m members.`,
    "the expression",
    `${price}m + ${fee}`,
    [
      {
        instruction: "The variable part is the per-member charge times m:",
        blanks: [{ label: "variable term", answer: `${price}m` }],
      },
      {
        instruction: "Add the one-time fee. Write the full expression:",
        blanks: [{ label: "answer", answer: `${price}m + ${fee}` }],
      },
    ],
    { price, fee, wordKind: "expression" }
  );
}

const PRIME_FACTOR_POOL = [
  12, 16, 18, 20, 24, 27, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 64,
  70, 72, 75, 80, 81, 84, 90, 96,
];

function primeFactorsOf(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p++) {
    while (rest % p === 0) {
      out.push(p);
      rest /= p;
    }
  }
  if (rest > 1) out.push(rest);
  return out;
}

function makeExponentsPrime(rng: RNG): Grade6Problem {
  if (rng() < 0.5) {
    const base = randInt(rng, 2, 9);
    const exp = pick(rng, [2, 2, 3, 3, 4]);
    const sup = exp === 2 ? "²" : exp === 3 ? "³" : "⁴";
    let value = 1;
    for (let i = 0; i < exp; i++) value *= base;
    const expanded = Array.from({ length: exp }, () => String(base)).join(" × ");
    return build(
      "VariablesAndExpressions",
      `Evaluate the power ${base}${sup}.`,
      "the value",
      value,
      [
        {
          instruction: `The exponent tells how many times the base is used as a factor: ${base}${sup} = ${expanded}.`,
          blanks: [{ label: "expanded", answer: expanded }],
        },
        {
          instruction: "Multiply the factors:",
          blanks: [{ label: "answer", answer: String(value) }],
        },
      ],
      { kind: "power", base, exp }
    );
  }
  const n = pick(rng, PRIME_FACTOR_POOL);
  const factors = primeFactorsOf(n);
  const ans = factors.join(" × ");
  const first = factors[0];
  return build(
    "VariablesAndExpressions",
    `Write the prime factorization of ${n}. List the prime factors from least to greatest, joined by multiplication signs.`,
    "the prime factorization",
    ans,
    [
      {
        instruction: `Divide by the smallest prime factor of ${n}, which is ${first}: ${n} ÷ ${first} = ${n / first}. Keep dividing by primes until every factor is prime.`,
        blanks: [{ label: "first quotient", answer: String(n / first) }],
      },
      {
        instruction: "Write the prime factorization:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "prime-factorization", n }
  );
}

function makeCombineLikeTerms(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 9);
  const b = randInt(rng, 2, 9);
  const c = randInt(rng, 1, 12);
  const d = randInt(rng, 1, 12);
  const xCoeff = a + b;
  const constant = c - d;
  const expr = `${a}x + ${b}x + ${c} − ${d}`;
  const ans = constant === 0 ? `${xCoeff}x` : `${xCoeff}x ${signStr(constant)} ${Math.abs(constant)}`;
  return build(
    "EquivalentExpressions",
    `Combine like terms: ${expr}.`,
    "the simplified expression",
    ans,
    [
      {
        instruction: `Combine the x-terms: ${a}x + ${b}x = ${xCoeff}x.`,
        blanks: [{ label: "x-term", answer: `${xCoeff}x` }],
      },
      {
        instruction: `Combine the constants: ${c} − ${d} = ${constant}. Write the simplified expression:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { a, b, c, d }
  );
}

function makeDistributiveExpand(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 9);
  const c = randInt(rng, 1, 9);
  const ans = `${a * b === 1 ? "" : a * b}x + ${a * c}`;
  return build(
    "EquivalentExpressions",
    `Use the distributive property to write an expression equivalent to ${a}(${b}x + ${c}).`,
    "the equivalent expression",
    `${a * b}x + ${a * c}`,
    [
      {
        instruction: `Multiply ${a} by each term inside the parentheses: ${a} × ${b}x = ${a * b}x; ${a} × ${c} = ${a * c}.`,
        blanks: [{ label: "expanded", answer: `${a * b}x + ${a * c}` }],
      },
      {
        instruction: "Write the equivalent expression:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { a, b, c }
  );
}

// ── Lesson: Equations & Inequalities ─────────────────────────────────────────

function makeAddEquation(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 15);
  const x = randInt(rng, 2, 15);
  const b = a + x;
  return build(
    "EquationsAndInequalities",
    `Solve for x: x + ${a} = ${b}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Subtract ${a} from both sides to isolate x:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, kind: "add" }
  );
}

function makeMulEquation(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 9);
  const x = randInt(rng, 2, 12);
  const b = a * x;
  return build(
    "EquationsAndInequalities",
    `Solve for x: ${a}x = ${b}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Divide both sides by ${a} to isolate x:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, kind: "mul" }
  );
}

function makeSubDivEquation(rng: RNG): Grade6Problem {
  if (rng() < 0.5) {
    const a = randInt(rng, 2, 15);
    const x = randInt(rng, a + 1, 25);
    const b = x - a;
    return build(
      "EquationsAndInequalities",
      `Solve for x: x − ${a} = ${b}.`,
      "the value of x",
      x,
      [
        {
          instruction: `Add ${a} to both sides to isolate x:`,
          blanks: [{ label: "x =", answer: String(x) }],
        },
      ],
      { a, b, kind: "sub" }
    );
  }
  const a = randInt(rng, 2, 9);
  const x = randInt(rng, 2, 12);
  const b = a * x;
  return build(
    "EquationsAndInequalities",
    `Solve for x: x ÷ ${a} = ${x}. (That is, x/${a} = ${x}.)`,
    "the value of x",
    b,
    [
      {
        instruction: `Multiply both sides by ${a} to isolate x:`,
        blanks: [{ label: "x =", answer: String(b) }],
      },
    ],
    { a, quotient: x, b, kind: "div" }
  );
}

function makeNegEquation(rng: RNG): Grade6Problem {
  const a = randNonZero(rng, -12, 12);
  const x = randNonZero(rng, -12, 12);
  const b = a + x;
  return build(
    "EquationsAndInequalities",
    `Solve for x: x + (${a}) = ${b}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Add the opposite of ${a} to both sides:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, kind: "neg" }
  );
}

function makeOneStepInequality(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 12);
  const x = randInt(rng, 3, 15);
  const dir = rng() < 0.5 ? ">" : "<";
  // x + a > x + a  →  boundary x
  const c = x + a;
  const ans = `x ${dir} ${x}`;
  const lo = Math.max(0, x - 4);
  const hi = x + 4;
  return build(
    "EquationsAndInequalities",
    `Solve the inequality: x + ${a} ${dir} ${c}. Graph the solution on the number line.`,
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
    { a, c, dir, boundary: x, kind: "inequality" },
    {
      kind: "MSNumberLine",
      min: lo,
      max: hi,
      marks: Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
      highlight: [],
      ray: { from: x, dir: dir === ">" ? "right" : "left", open: true },
    }
  );
}

function makeEquationWord(rng: RNG): Grade6Problem {
  const price = randInt(rng, 3, 9);
  const qty = randInt(rng, 2, 6);
  const total = price * qty;
  return build(
    "EquationsAndInequalities",
    `Liam buys ${qty} identical notebooks for a total of $${total}. Write and solve an equation to find the price of one notebook.`,
    "the price",
    `$${price}`,
    [
      {
        instruction: "Let n = price of one notebook. Write the equation:",
        blanks: [{ label: "equation", answer: `${qty}n = ${total}` }],
      },
      {
        instruction: `Divide both sides by ${qty}:`,
        blanks: [{ label: "n =", answer: `$${price}` }],
      },
    ],
    { price, qty, total, wordKind: "equation" }
  );
}

// ── Lesson: Two-Variable Relationships ───────────────────────────────────────

function makeTwoVarEvaluate(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 1, 10);
  const x = randInt(rng, 3, 12);
  const y = a * x + b;
  return build(
    "TwoVariableRelationships",
    `The relationship between x and y is given by the rule y = ${a}x + ${b}. Find the value of y when x = ${x}.`,
    "the value of y",
    y,
    [
      {
        instruction: `Substitute ${x} for x: y = ${a}(${x}) + ${b} = ${a * x} + ${b}.`,
        blanks: [{ label: "substituted", answer: `${a * x} + ${b}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "y =", answer: String(y) }],
      },
    ],
    { a, b, x, y }
  );
}

function makeTwoVarWord(rng: RNG): Grade6Problem {
  const perMile = randInt(rng, 2, 4);
  const base = randInt(rng, 2, 6);
  const miles = randInt(rng, 5, 15);
  const ans = perMile * miles + base;
  return build(
    "TwoVariableRelationships",
    `A taxi charges a $${base} base fare plus $${perMile} per mile. Write a rule relating the total cost C to miles driven m, then find the cost of a ${miles}-mile ride.`,
    "the cost",
    `$${ans}`,
    [
      {
        instruction: "Write the rule:",
        blanks: [{ label: "rule", answer: `C = ${perMile}m + ${base}` }],
      },
      {
        instruction: `Substitute m = ${miles}: C = ${perMile}(${miles}) + ${base}.`,
        blanks: [{ label: "answer", answer: `$${ans}` }],
      },
    ],
    { perMile, base, miles, wordKind: "two-var" }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T4 · PROPORTIONALITY
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Ratios & Rates ──────────────────────────────────────────────────

function makeSimplifyRatio(rng: RNG): Grade6Problem {
  const g = randInt(rng, 2, 9);
  // Pick coprime a, b so a:b is genuinely in lowest terms.
  let a = randInt(rng, 1, 9);
  let b = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a));
  let guard = 0;
  while (gcd(a, b) !== 1 && guard++ < 50) {
    a = randInt(rng, 1, 9);
    b = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a));
  }
  const A = a * g;
  const B = b * g;
  const ans = `${a}:${b}`;
  return build(
    "RatiosAndRates",
    `Simplify the ratio ${A}:${B} to lowest terms.`,
    "the simplified ratio",
    ans,
    [
      {
        instruction: `Find the greatest common factor of ${A} and ${B}:`,
        blanks: [{ label: "GCF", answer: String(g) }],
      },
      {
        instruction: "Divide both terms by the GCF:",
        blanks: [{ label: "simplified ratio", answer: ans }],
      },
    ],
    { a: A, b: B }
  );
}

function makeEquivalentRatio(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 9);
  const b = randInt(rng, 2, 9);
  const k = randInt(rng, 2, 6);
  const c = b * k;
  const x = a * k;
  return build(
    "RatiosAndRates",
    `Find the missing value: ${a}/${b} = ?/${c}.`,
    "the missing value",
    x,
    [
      {
        instruction: `The denominator was multiplied by ${k} (${b} × ${k} = ${c}). Multiply the numerator by the same factor:`,
        blanks: [{ label: "missing value", answer: String(x) }],
      },
    ],
    { a, b, c, x }
  );
}

function makeUnitRate(rng: RNG): Grade6Problem {
  const kind = pick(rng, ["speed", "price"] as const);
  if (kind === "speed") {
    const mph = randInt(rng, 25, 70);
    const hours = randInt(rng, 2, 5);
    const miles = mph * hours;
    return build(
      "RatiosAndRates",
      `A car travels ${miles} miles in ${hours} hours at a constant speed. What is the unit rate in miles per hour?`,
      "the unit rate",
      `${mph} miles per hour`,
      [
        {
          instruction: `Divide the total miles by the total hours: ${miles} ÷ ${hours}.`,
          blanks: [{ label: "unit rate", answer: `${mph}` }],
        },
        {
          instruction: "Write the unit rate with its units:",
          blanks: [{ label: "answer", answer: `${mph} miles per hour` }],
        },
      ],
      { miles, hours, unitKind: "speed" }
    );
  }
  const priceEach = randInt(rng, 2, 9);
  const qty = randInt(rng, 2, 6);
  const total = priceEach * qty;
  return build(
    "RatiosAndRates",
    `${qty} notebooks cost $${total}. What is the unit rate (price per notebook)?`,
    "the unit rate",
    `$${priceEach} per notebook`,
    [
      {
        instruction: `Divide the total cost by the number of notebooks: $${total} ÷ ${qty}.`,
        blanks: [{ label: "unit rate", answer: `$${priceEach}` }],
      },
      {
        instruction: "Write the unit rate with its units:",
        blanks: [{ label: "answer", answer: `$${priceEach} per notebook` }],
      },
    ],
    { total, qty, unitKind: "price" }
  );
}

// ── Lesson: Ratio Reasoning ──────────────────────────────────────────────────

function makeRatioScale(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 2, 5);
  const k = randInt(rng, 2, 5);
  const given = a * k;
  const ans = b * k;
  const item1 = pick(rng, ["cups of flour", "eggs", "cups of sugar"]);
  const item2 = pick(rng, ["cups of sugar", "cups of milk", "tablespoons of butter"]);
  return build(
    "RatioReasoning",
    `A recipe uses a ratio of ${a}:${b} for ${item1} to ${item2}. If you use ${given} ${item1}, how much ${item2} do you need?`,
    "the amount",
    `${ans}`,
    [
      {
        instruction: `The ${item1} were scaled by ${k} (${a} × ${k} = ${given}). Scale the ${item2} by the same factor:`,
        blanks: [{ label: "amount", answer: `${b} × ${k} = ${ans}` }],
      },
    ],
    { a, b, k, given }
  );
}

function makePercentOfNumber(rng: RNG): Grade6Problem {
  const pct = pick(rng, [10, 20, 25, 50, 75]);
  const total = pick(rng, [40, 60, 80, 100, 120, 200]);
  const ans = Math.round((pct / 100) * total);
  return build(
    "RatioReasoning",
    `Find ${pct}% of ${total}.`,
    "the amount",
    ans,
    [
      {
        instruction: `Write ${pct}% as a fraction: ${pct}/100 = ${pct / gcd(pct, 100)}/${100 / gcd(pct, 100)}.`,
        blanks: [{ label: "fraction", answer: `${pct / gcd(pct, 100)}/${100 / gcd(pct, 100)}` }],
      },
      {
        instruction: `Multiply by ${total}:`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { pct, total }
  );
}

function makeRateWord(rng: RNG): Grade6Problem {
  const batch = pick(rng, [12, 24]);
  const cups = pick(rng, [2, 3, 4]);
  const target = pick(rng, [18, 30, 36, 48].filter((t) => t !== batch && (t * cups) % batch === 0));
  const ans = (target * cups) / batch;
  return build(
    "RatioReasoning",
    `A recipe uses ${cups} cups of flour to make ${batch} cookies. How many cups of flour are needed to make ${target} cookies?`,
    "the cups of flour",
    ans,
    [
      {
        instruction: `Find the unit rate: cups per cookie = ${cups} ÷ ${batch}.`,
        blanks: [{ label: "cups per cookie", answer: fmt(cups / batch) }],
      },
      {
        instruction: `Multiply by ${target} cookies:`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { batch, cups, target }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T5 · GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Area of Polygons ─────────────────────────────────────────────────

function makeAreaParallelogram(rng: RNG): Grade6Problem {
  const base = randInt(rng, 4, 15);
  const height = randInt(rng, 3, 12);
  const ans = base * height;
  return build(
    "AreaOfPolygons",
    `Find the area of a parallelogram with base ${base} cm and height ${height} cm.`,
    "the area",
    ans,
    [
      {
        instruction: "Area of a parallelogram = base × height.",
        blanks: [{ label: "formula", answer: "A = b × h" }],
      },
      {
        instruction: `Substitute: A = ${base} × ${height}.`,
        blanks: [{ label: "answer", answer: `${ans} cm²` }],
      },
    ],
    { base, height, shape: "parallelogram" },
    { kind: "MSGeometryFigure", figure: "parallelogram", dims: { base, height } },
    "cm²"
  );
}

function makeAreaTriangle(rng: RNG): Grade6Problem {
  const base = randInt(rng, 4, 14);
  let height = randInt(rng, 3, 12);
  if ((base * height) % 2 !== 0) height += 1;
  const ans = (base * height) / 2;
  return build(
    "AreaOfPolygons",
    `Find the area of a triangle with base ${base} in and height ${height} in.`,
    "the area",
    ans,
    [
      {
        instruction: "Area of a triangle = ½ × base × height.",
        blanks: [{ label: "formula", answer: "A = ½bh" }],
      },
      {
        instruction: `Substitute: A = ½ × ${base} × ${height}.`,
        blanks: [{ label: "answer", answer: `${ans} in²` }],
      },
    ],
    { base, height, shape: "triangle" },
    { kind: "MSGeometryFigure", figure: "triangle", dims: { base, height } },
    "in²"
  );
}

function makeAreaTrapezoid(rng: RNG): Grade6Problem {
  const b1 = randInt(rng, 4, 12);
  let b2 = randInt(rng, 4, 12);
  if ((b1 + b2) % 2 !== 0) b2 += 1;
  const h = randInt(rng, 3, 10);
  const ans = ((b1 + b2) / 2) * h;
  return build(
    "AreaOfPolygons",
    `Find the area of a trapezoid with bases ${b1} m and ${b2} m and height ${h} m.`,
    "the area",
    ans,
    [
      {
        instruction: "Area of a trapezoid = ½ × (base₁ + base₂) × height.",
        blanks: [{ label: "formula", answer: "A = ½(b₁ + b₂)h" }],
      },
      {
        instruction: `Substitute: A = ½ × (${b1} + ${b2}) × ${h}.`,
        blanks: [{ label: "answer", answer: `${ans} m²` }],
      },
    ],
    { b1, b2, h, shape: "trapezoid" },
    { kind: "MSGeometryFigure", figure: "trapezoid", dims: { base1: b1, base2: b2, height: h } },
    "m²"
  );
}

function makeAreaMissingSide(rng: RNG): Grade6Problem {
  // working backwards: given area, find a missing dimension
  const kind = pick(rng, ["parallelogram", "triangle"] as const);
  if (kind === "parallelogram") {
    const base = randInt(rng, 4, 12);
    const height = randInt(rng, 3, 10);
    const area = base * height;
    return build(
      "AreaOfPolygons",
      `A parallelogram has area ${area} cm² and base ${base} cm. What is its height?`,
      "the height",
      `${height} cm`,
      [
        {
          instruction: `A = b × h, so ${area} = ${base} × h.`,
          blanks: [{ label: "equation", answer: `${area} = ${base} × h` }],
        },
        {
          instruction: `Divide both sides by ${base}:`,
          blanks: [{ label: "answer", answer: `${height} cm` }],
        },
      ],
      { area, base, height, kind: "backward-parallelogram" },
      { kind: "MSGeometryFigure", figure: "parallelogram", dims: { base, height } },
      "cm"
    );
  }
  const base = randInt(rng, 4, 12);
  let height = randInt(rng, 3, 10);
  if ((base * height) % 2 !== 0) height += 1;
  const area = (base * height) / 2;
  return build(
    "AreaOfPolygons",
    `A triangle has area ${area} in² and base ${base} in. What is its height?`,
    "the height",
    `${height} in`,
    [
      {
        instruction: `A = ½bh, so ${area} = ½ × ${base} × h.`,
        blanks: [{ label: "equation", answer: `${area} = ½ × ${base} × h` }],
      },
      {
        instruction: `Solve for h:`,
        blanks: [{ label: "answer", answer: `${height} in` }],
      },
    ],
    { area, base, height, kind: "backward-triangle" },
    { kind: "MSGeometryFigure", figure: "triangle", dims: { base, height } },
    "in"
  );
}

// ── Lesson: Volume & Surface Area of Rectangular Prisms ───────────────────────

function makeVolumePrism(rng: RNG): Grade6Problem {
  const l = randInt(rng, 2, 10);
  const w = randInt(rng, 2, 8);
  const h = randInt(rng, 2, 8);
  const ans = l * w * h;
  return build(
    "VolumeAndSurfaceArea",
    `Find the volume of a rectangular prism with length ${l} cm, width ${w} cm, and height ${h} cm.`,
    "the volume",
    ans,
    [
      {
        instruction: "Volume of a rectangular prism = length × width × height.",
        blanks: [{ label: "formula", answer: "V = lwh" }],
      },
      {
        instruction: `Substitute: V = ${l} × ${w} × ${h}.`,
        blanks: [{ label: "answer", answer: `${ans} cm³` }],
      },
    ],
    { l, w, h, shape: "rectangular-prism" },
    { kind: "MSGeometryFigure", figure: "rectangular-prism", dims: { length: l, width: w, height: h } },
    "cm³"
  );
}

function makeSurfaceAreaPrism(rng: RNG): Grade6Problem {
  const l = randInt(rng, 2, 8);
  const w = randInt(rng, 2, 6);
  const h = randInt(rng, 2, 6);
  const ans = 2 * (l * w + l * h + w * h);
  return build(
    "VolumeAndSurfaceArea",
    `Find the surface area of a rectangular prism with length ${l} ft, width ${w} ft, and height ${h} ft.`,
    "the surface area",
    ans,
    [
      {
        instruction: "Surface area = 2(lw + lh + wh).",
        blanks: [{ label: "formula", answer: "SA = 2(lw + lh + wh)" }],
      },
      {
        instruction: `Substitute: SA = 2(${l}×${w} + ${l}×${h} + ${w}×${h}) = 2(${l * w + l * h + w * h}).`,
        blanks: [{ label: "answer", answer: `${ans} ft²` }],
      },
    ],
    { l, w, h, shape: "rectangular-prism" },
    { kind: "MSGeometryFigure", figure: "rectangular-prism", dims: { length: l, width: w, height: h } },
    "ft²"
  );
}

function makeVolumeWord6(rng: RNG): Grade6Problem {
  const l = randInt(rng, 8, 15);
  const w = randInt(rng, 4, 10);
  const h = randInt(rng, 5, 12);
  const ans = l * w * h;
  return build(
    "VolumeAndSurfaceArea",
    `A fish tank is ${l} inches long, ${w} inches wide, and ${h} inches tall. How many cubic inches of water does it hold when full?`,
    "the volume",
    `${ans} cubic inches`,
    [
      {
        instruction: `V = lwh = ${l} × ${w} × ${h}.`,
        blanks: [{ label: "answer", answer: `${ans} cubic inches` }],
      },
    ],
    { l, w, h, wordKind: "fish-tank" },
    { kind: "MSGeometryFigure", figure: "rectangular-prism", dims: { length: l, width: w, height: h } },
    "cubic inches"
  );
}

// ── Lesson: Triangles & Triangle Properties ──────────────────────────────────

function makeTriangleAngleSum6(rng: RNG): Grade6Problem {
  const a1 = randInt(rng, 30, 80);
  const a2 = randInt(rng, 30, 100 - a1 - 10);
  const missing = 180 - a1 - a2;
  return build(
    "TriangleProperties",
    `Two angles of a triangle measure ${a1}° and ${a2}°. What is the measure of the third angle?`,
    "the third angle",
    `${missing}°`,
    [
      {
        instruction: "The angles of a triangle add up to 180°.",
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

function makeTriangleWord6(rng: RNG): Grade6Problem {
  const a1 = randInt(rng, 40, 70);
  const a2 = a1; // isosceles
  const missing = 180 - 2 * a1;
  return build(
    "TriangleProperties",
    `An isosceles triangle has two equal angles measuring ${a1}° each. What is the measure of the vertex angle?`,
    "the vertex angle",
    `${missing}°`,
    [
      {
        instruction: `The three angles add to 180°: ${a1}° + ${a1}° + v = 180°.`,
        blanks: [{ label: "equation", answer: `${2 * a1}° + v = 180°` }],
      },
      {
        instruction: "Solve for v:",
        blanks: [{ label: "answer", answer: `${missing}°` }],
      },
    ],
    { a1, missing, wordKind: "isosceles" },
    { kind: "MSGeometryFigure", figure: "triangle", dims: { base: 10, height: 6 } }
  );
}

function makeTriangleInequality(rng: RNG): Grade6Problem {
  const a = randInt(rng, 3, 11);
  const b = a + randInt(rng, 1, 6);
  if (rng() < 0.5) {
    const lo = b - a;
    const hi = a + b;
    const valid = rng() < 0.5;
    const c = valid
      ? randInt(rng, lo + 1, hi - 1)
      : pick(rng, [Math.max(1, lo - randInt(rng, 0, 2)), lo, hi, hi + randInt(rng, 1, 3)]);
    const ans = valid ? "yes" : "no";
    return build(
      "TriangleProperties",
      `Can sticks of length ${a} cm, ${b} cm, and ${c} cm be joined to form a triangle? Answer yes or no.`,
      "yes or no",
      ans,
      [
        {
          instruction: `The triangle inequality says the sum of any two sides must be greater than the third side. Check the two shorter sides: ${a} + ${c} and ${a} + ${b} and ${b} + ${c} against the remaining side.`,
          blanks: [{ label: "smallest sum", answer: String(a + Math.min(b, c)) }],
        },
        {
          instruction: valid
            ? "Every pair of sides adds to more than the third side, so a triangle is possible:"
            : "One pair of sides does not add to more than the third side, so a triangle is not possible:",
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { kind: "inequality-check", a, b, c },
      { kind: "MSGeometryFigure", figure: "triangle", dims: { base: 10, height: 6 } }
    );
  }
  const ans = `greater than ${b - a} and less than ${a + b}`;
  return build(
    "TriangleProperties",
    `Two sides of a triangle measure ${a} cm and ${b} cm. Describe the possible lengths of the third side.`,
    "the possible lengths of the third side",
    ans,
    [
      {
        instruction: `The third side must be less than the sum of the two sides: ${a} + ${b} = ${a + b}.`,
        blanks: [{ label: "less than", answer: String(a + b) }],
      },
      {
        instruction: `The third side must be greater than the difference of the two sides: ${b} − ${a} = ${b - a}. So the third side is:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "inequality-range", a, b },
    { kind: "MSGeometryFigure", figure: "triangle", dims: { base: 10, height: 6 } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T6 · MEASUREMENT & DATA
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Data Displays ────────────────────────────────────────────────────

function makeDataTotal(rng: RNG): Grade6Problem {
  const categories = ["dogs", "cats", "birds", "fish"];
  const counts = [randInt(rng, 3, 10), randInt(rng, 3, 10), randInt(rng, 3, 10), randInt(rng, 2, 6)];
  const total = counts.reduce((s, c) => s + c, 0);
  const table = categories.map((c, i) => `${c}: ${counts[i]}`).join(", ");
  return build(
    "DataDisplays",
    `A survey asked students about their pets. The results are: ${table}. How many students were surveyed in total?`,
    "the total",
    total,
    [
      {
        instruction: `Add the counts: ${counts.join(" + ")}.`,
        blanks: [{ label: "total", answer: String(total) }],
      },
    ],
    { counts: counts.join(","), total }
  );
}

function makeDataCompare(rng: RNG): Grade6Problem {
  const a = randInt(rng, 4, 12);
  const b = a * 2;
  const c = randInt(rng, 2, 8);
  const table = `apples: ${a}, bananas: ${b}, oranges: ${c}`;
  return build(
    "DataDisplays",
    `A bar graph shows favorite fruits: ${table}. How many more students chose bananas than apples?`,
    "the difference",
    b - a,
    [
      {
        instruction: `Read the bar heights: bananas = ${b}, apples = ${a}. Subtract: ${b} − ${a}.`,
        blanks: [{ label: "difference", answer: String(b - a) }],
      },
    ],
    { a, b, c }
  );
}

// ── Lesson: Measures of Center & Variation ────────────────────────────────────

function makeMean(rng: RNG): Grade6Problem {
  const count = pick(rng, [4, 5, 6]);
  const mean = randInt(rng, 5, 20);
  const vals: number[] = [];
  for (let i = 0; i < count - 1; i++) vals.push(randInt(rng, 2, 30));
  const last = mean * count - vals.reduce((s, v) => s + v, 0);
  vals.push(last);
  const display = shuffled(rng, vals);
  return build(
    "MeasuresOfCenterAndVariation",
    `Find the mean of the data set: ${display.join(", ")}.`,
    "the mean",
    mean,
    [
      {
        instruction: `Add all ${count} values: ${display.join(" + ")} = ${mean * count}.`,
        blanks: [{ label: "sum", answer: String(mean * count) }],
      },
      {
        instruction: `Divide by the number of values (${count}):`,
        blanks: [{ label: "mean", answer: String(mean) }],
      },
    ],
    { values: display.join(","), count }
  );
}

function makeMode(rng: RNG): Grade6Problem {
  const mode = randInt(rng, 5, 20);
  const others = new Set<number>();
  while (others.size < 3) {
    const v = randInt(rng, 2, 30);
    if (v !== mode) others.add(v);
  }
  const vals = [mode, mode, mode, ...others];
  const display = shuffled(rng, vals);
  return build(
    "MeasuresOfCenterAndVariation",
    `Find the mode of the data set: ${display.join(", ")}.`,
    "the mode",
    mode,
    [
      {
        instruction: "The mode is the value that appears most often:",
        blanks: [{ label: "mode", answer: String(mode) }],
      },
    ],
    { values: display.join(","), mode }
  );
}

function makeMedian(rng: RNG): Grade6Problem {
  const even = rng() < 0.5;
  const count = even ? 6 : 5;
  const vals = new Set<number>();
  while (vals.size < count) vals.add(randInt(rng, 2, 40));
  const arr = [...vals];
  const sorted = [...arr].sort((a, b) => a - b);
  const median = even ? (sorted[2] + sorted[3]) / 2 : sorted[2];
  return build(
    "MeasuresOfCenterAndVariation",
    `Find the median of the data set: ${shuffled(rng, arr).join(", ")}.`,
    "the median",
    fmt(median),
    [
      {
        instruction: `Order the data: ${sorted.join(", ")}.`,
        blanks: [{ label: "ordered", answer: sorted.join(", ") }],
      },
      {
        instruction: even
          ? `With ${count} values, average the two middle values (${sorted[2]} and ${sorted[3]}):`
          : "The middle value is the median:",
        blanks: [{ label: "median", answer: fmt(median) }],
      },
    ],
    { values: arr.join(","), even: even ? 1 : 0 }
  );
}

function makeRange(rng: RNG): Grade6Problem {
  const count = randInt(rng, 5, 8);
  const vals = new Set<number>();
  while (vals.size < count) vals.add(randInt(rng, 2, 50));
  const arr = [...vals];
  const range = Math.max(...arr) - Math.min(...arr);
  return build(
    "MeasuresOfCenterAndVariation",
    `Find the range of the data set: ${shuffled(rng, arr).join(", ")}.`,
    "the range",
    range,
    [
      {
        instruction: `Range = maximum − minimum = ${Math.max(...arr)} − ${Math.min(...arr)}.`,
        blanks: [{ label: "range", answer: String(range) }],
      },
    ],
    { values: arr.join(",") }
  );
}

function makeStatsWord(rng: RNG): Grade6Problem {
  const scores = new Set<number>();
  while (scores.size < 4) scores.add(randInt(rng, 70, 100));
  const arr = [...scores];
  const exactMean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return build(
    "MeasuresOfCenterAndVariation",
    `Elena's quiz scores are ${arr.join(", ")}. What is her mean score? Round to the nearest whole number.`,
    "the mean score",
    Math.round(exactMean),
    [
      {
        instruction: `Add the scores: ${arr.join(" + ")} = ${arr.reduce((s, v) => s + v, 0)}.`,
        blanks: [{ label: "sum", answer: String(arr.reduce((s, v) => s + v, 0)) }],
      },
      {
        instruction: `Divide by ${arr.length} and round:`,
        blanks: [{ label: "mean", answer: String(Math.round(exactMean)) }],
      },
    ],
    { values: arr.join(","), wordKind: "stats" }
  );
}

function makeIQR(rng: RNG): Grade6Problem {
  const count = pick(rng, [7, 9]);
  const vals = new Set<number>();
  while (vals.size < count) vals.add(randInt(rng, 2, 60));
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  const lower = sorted.slice(0, mid);
  const upper = sorted.slice(count - mid);
  const medianOf = (arr: number[]) =>
    arr.length % 2 === 1 ? arr[Math.floor(arr.length / 2)] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
  const q1 = medianOf(lower);
  const q3 = medianOf(upper);
  const iqr = q3 - q1;
  return build(
    "MeasuresOfCenterAndVariation",
    `Find the interquartile range (IQR) of the data set: ${shuffled(rng, sorted).join(", ")}. Use the median-of-halves method: split the ordered data into a lower half and an upper half without the median, then subtract Q1 from Q3.`,
    "the interquartile range",
    fmt(iqr),
    [
      {
        instruction: `Order the data: ${sorted.join(", ")}. The median is ${sorted[mid]}, so the lower half is ${lower.join(", ")} and the upper half is ${upper.join(", ")}.`,
        blanks: [{ label: "ordered", answer: sorted.join(", ") }],
      },
      {
        instruction: `Q1 is the median of the lower half and Q3 is the median of the upper half:`,
        blanks: [
          { label: "Q1", answer: fmt(q1) },
          { label: "Q3", answer: fmt(q3) },
        ],
      },
      {
        instruction: `IQR = Q3 − Q1 = ${fmt(q3)} − ${fmt(q1)}.`,
        blanks: [{ label: "answer", answer: fmt(iqr) }],
      },
    ],
    { values: sorted.join(","), kind: "iqr" }
  );
}

// ── Lesson: Banking & Credit ─────────────────────────────────────────────────

function makeCreditInterest(rng: RNG): Grade6Problem {
  const owed = pick(rng, [200, 300, 400, 500, 600, 800, 1000]);
  const rate = pick(rng, [10, 15, 18, 20, 24]);
  const interest = Math.round((owed * rate) / 100);
  return build(
    "BankingAndCredit",
    `A credit card charges ${rate}% annual interest. If you owe $${owed} for a full year and pay nothing toward the balance, how much interest will you owe?`,
    "the interest",
    `$${interest}`,
    [
      {
        instruction: `Interest = balance × rate = $${owed} × ${rate}%.`,
        blanks: [{ label: "interest", answer: `$${interest}` }],
      },
    ],
    { owed, rate }
  );
}

function makeCheckRegister(rng: RNG): Grade6Problem {
  const start = randInt(rng, 200, 500);
  const deposit = randInt(rng, 50, 200);
  const withdrawal = randInt(rng, 20, 150);
  const end = start + deposit - withdrawal;
  return build(
    "BankingAndCredit",
    `A checking account starts with a balance of $${start}. A deposit of $${deposit} is made, then a check for $${withdrawal} is written. What is the ending balance?`,
    "the ending balance",
    `$${end}`,
    [
      {
        instruction: `Add the deposit: $${start} + $${deposit} = $${start + deposit}.`,
        blanks: [{ label: "after deposit", answer: `$${start + deposit}` }],
      },
      {
        instruction: `Subtract the check: $${start + deposit} − $${withdrawal}.`,
        blanks: [{ label: "answer", answer: `$${end}` }],
      },
    ],
    { start, deposit, withdrawal }
  );
}

// ── Lesson: Paying for College & Annual Salaries ─────────────────────────────

function makeAnnualSalary(rng: RNG): Grade6Problem {
  const hourly = randInt(rng, 12, 25);
  const hoursPerWeek = pick(rng, [30, 35, 40]);
  const weeks = 52;
  const annual = hourly * hoursPerWeek * weeks;
  return build(
    "CollegeAndSalaries",
    `A job pays $${hourly} per hour for ${hoursPerWeek} hours per week, ${weeks} weeks per year. What is the annual salary?`,
    "the annual salary",
    `$${annual.toLocaleString("en-US")}`,
    [
      {
        instruction: `Weekly pay = $${hourly} × ${hoursPerWeek} = $${hourly * hoursPerWeek}.`,
        blanks: [{ label: "weekly pay", answer: `$${hourly * hoursPerWeek}` }],
      },
      {
        instruction: `Annual salary = weekly pay × ${weeks}.`,
        blanks: [{ label: "answer", answer: `$${annual.toLocaleString("en-US")}` }],
      },
    ],
    { hourly, hoursPerWeek, weeks }
  );
}

function makeCollegeCompare(rng: RNG): Grade6Problem {
  const costA = pick(rng, [10000, 12000, 15000]);
  const costB = costA + pick(rng, [3000, 5000, 8000]);
  const scholarship = pick(rng, [8000, 10000, 12000]);
  const totalA = costA * 4;
  const totalB = costB * 4 - scholarship;
  const cheaper = totalA < totalB ? "College A" : "College B";
  return build(
    "CollegeAndSalaries",
    `College A costs $${costA.toLocaleString("en-US")} per year for 4 years. College B costs $${costB.toLocaleString("en-US")} per year for 4 years but offers a $${scholarship.toLocaleString("en-US")} total scholarship. Which college costs less overall, and by how much?`,
    "the cheaper college and difference",
    `${cheaper} by $${Math.abs(totalA - totalB).toLocaleString("en-US")}`,
    [
      {
        instruction: `College A total: $${costA.toLocaleString("en-US")} × 4 = $${totalA.toLocaleString("en-US")}.`,
        blanks: [{ label: "college A", answer: `$${totalA.toLocaleString("en-US")}` }],
      },
      {
        instruction: `College B total: $${costB.toLocaleString("en-US")} × 4 − $${scholarship.toLocaleString("en-US")} = $${totalB.toLocaleString("en-US")}.`,
        blanks: [{ label: "college B", answer: `$${totalB.toLocaleString("en-US")}` }],
      },
      {
        instruction: "Compare and find the difference:",
        blanks: [{ label: "answer", answer: `${cheaper} by $${Math.abs(totalA - totalB).toLocaleString("en-US")}` }],
      },
    ],
    { costA, costB, scholarship, wordKind: "college-compare" }
  );
}


// ── Tier-1 direct variants ───────────────────────────────────────────────────

function makeTwoVarSimple(rng: RNG): Grade6Problem {
  const a = randInt(rng, 2, 9);
  const x = randInt(rng, 2, 12);
  const y = a * x;
  return build(
    "TwoVariableRelationships",
    `The rule is y = ${a}x. Find y when x = ${x}.`,
    "the value of y",
    y,
    [
      {
        instruction: `Substitute ${x} for x: y = ${a}(${x}).`,
        blanks: [{ label: "y =", answer: String(y) }],
      },
    ],
    { a, x, y }
  );
}

function makeRightTriangleAngle(rng: RNG): Grade6Problem {
  const known = randInt(rng, 20, 70);
  const missing = 90 - known;
  return build(
    "TriangleProperties",
    `A right triangle has one acute angle measuring ${known}°. What is the measure of the other acute angle?`,
    "the other acute angle",
    `${missing}°`,
    [
      {
        instruction: "The two acute angles of a right triangle add to 90°.",
        blanks: [{ label: "sum", answer: "90°" }],
      },
      {
        instruction: `Other angle = 90° − ${known}°.`,
        blanks: [{ label: "answer", answer: `${missing}°` }],
      },
    ],
    { known, missing, kind: "right" },
    { kind: "MSGeometryFigure", figure: "triangle", dims: { base: 10, height: 6 } }
  );
}

function makeWeeklyPay(rng: RNG): Grade6Problem {
  const hourly = randInt(rng, 12, 25);
  const hours = pick(rng, [20, 30, 35, 40]);
  const pay = hourly * hours;
  return build(
    "CollegeAndSalaries",
    `A job pays $${hourly} per hour. If you work ${hours} hours in a week, what is your weekly pay?`,
    "the weekly pay",
    `$${pay}`,
    [
      {
        instruction: `Weekly pay = hourly rate × hours = $${hourly} × ${hours}.`,
        blanks: [{ label: "answer", answer: `$${pay}` }],
      },
    ],
    { hourly, hoursPerWeek: hours }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T8 · TEKS EXTENSIONS
// ═══════════════════════════════════════════════════════════════════════════

// ── Lesson: Graphing Points in Four Quadrants (TEKS 6.11) ───────────────────

function makeIdentifyPoint6(rng: RNG): Grade6Problem {
  const x = randNonZero(rng, -9, 9);
  const y = randNonZero(rng, -9, 9);
  const ans = `(${x}, ${y})`;
  return build(
    "CoordinateGraphing6",
    "Point P is plotted on the coordinate plane. What are the coordinates of point P? Give your answer as an ordered pair.",
    "the coordinates of point P",
    ans,
    [
      {
        instruction: "Start at the origin. Count right or left to find the x-coordinate, then count up or down to find the y-coordinate:",
        blanks: [
          { label: "x-coordinate", answer: String(x) },
          { label: "y-coordinate", answer: String(y) },
        ],
      },
      {
        instruction: "Write the ordered pair (x, y):",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "identify-point", x, y },
    coordGrid([{ x, y, label: "P" }])
  );
}

function quadrantName(x: number, y: number): string {
  if (x === 0 && y === 0) return "the origin";
  if (x === 0) return "the y-axis";
  if (y === 0) return "the x-axis";
  if (x > 0 && y > 0) return "Quadrant I";
  if (x < 0 && y > 0) return "Quadrant II";
  if (x < 0 && y < 0) return "Quadrant III";
  return "Quadrant IV";
}

function makeQuadrantAxis6(rng: RNG): Grade6Problem {
  const roll = rng();
  let x: number;
  let y: number;
  if (roll < 0.55) {
    x = randNonZero(rng, -9, 9);
    y = randNonZero(rng, -9, 9);
  } else if (roll < 0.7) {
    x = randNonZero(rng, -9, 9);
    y = 0;
  } else if (roll < 0.85) {
    x = 0;
    y = randNonZero(rng, -9, 9);
  } else {
    x = 0;
    y = 0;
  }
  const ans = quadrantName(x, y);
  return build(
    "CoordinateGraphing6",
    `Point P is at (${x}, ${y}) on the coordinate plane. In which quadrant or on which axis is point P located?`,
    "the quadrant or axis",
    ans,
    [
      {
        instruction: "Look at the signs of the coordinates. If one coordinate is 0, the point is on an axis. If both coordinates are 0, the point is the origin.",
        blanks: [
          { label: "sign of x", answer: x === 0 ? "zero" : x > 0 ? "positive" : "negative" },
          { label: "sign of y", answer: y === 0 ? "zero" : y > 0 ? "positive" : "negative" },
        ],
      },
      {
        instruction: "So point P is located at:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "quadrant", x, y },
    coordGrid([{ x, y, label: "P" }])
  );
}

function makeGridDistance6(rng: RNG): Grade6Problem {
  const vertical = rng() < 0.5;
  let x1: number, y1: number, x2: number, y2: number;
  if (vertical) {
    x1 = randInt(rng, -8, 8);
    x2 = x1;
    y1 = randInt(rng, -9, 4);
    y2 = y1 + randInt(rng, 2, 9);
    if (y2 > 9) y2 = 9;
  } else {
    y1 = randInt(rng, -8, 8);
    y2 = y1;
    x1 = randInt(rng, -9, 4);
    x2 = x1 + randInt(rng, 2, 9);
    if (x2 > 9) x2 = 9;
  }
  const dist = Math.abs(x2 - x1) + Math.abs(y2 - y1);
  return build(
    "CoordinateGraphing6",
    `Point A is at (${x1}, ${y1}) and point B is at (${x2}, ${y2}). The two points share ${vertical ? "an x-coordinate" : "a y-coordinate"}. Find the distance between the two points.`,
    "the distance",
    dist,
    [
      {
        instruction: vertical
          ? `The x-coordinates are the same, so subtract the y-coordinates: |${y2} − (${y1})| or count the units between the points.`
          : `The y-coordinates are the same, so subtract the x-coordinates: |${x2} − (${x1})| or count the units between the points.`,
        blanks: [{ label: "difference", answer: String(dist) }],
      },
      {
        instruction: "The distance is:",
        blanks: [{ label: "answer", answer: String(dist) }],
      },
    ],
    { kind: "grid-distance", x1, y1, x2, y2 },
    coordGrid(
      [
        { x: x1, y: y1, label: "A" },
        { x: x2, y: y2, label: "B" },
      ],
      [{ x1, y1, x2, y2 }]
    )
  );
}

function makeReflectPoint6(rng: RNG): Grade6Problem {
  const x = randNonZero(rng, -9, 9);
  const y = randNonZero(rng, -9, 9);
  const acrossX = rng() < 0.5;
  const rx = acrossX ? x : -x;
  const ry = acrossX ? -y : y;
  const ans = `(${rx}, ${ry})`;
  return build(
    "CoordinateGraphing6",
    `Point P is at (${x}, ${y}). Reflect point P across the ${acrossX ? "x-axis" : "y-axis"}. What are the coordinates of the reflected point?`,
    "the coordinates of the reflected point",
    ans,
    [
      {
        instruction: acrossX
          ? "Reflecting across the x-axis keeps the x-coordinate the same and changes the sign of the y-coordinate."
          : "Reflecting across the y-axis keeps the y-coordinate the same and changes the sign of the x-coordinate.",
        blanks: [{ label: "coordinate that changes sign", answer: acrossX ? "the y-coordinate" : "the x-coordinate" }],
      },
      {
        instruction: "The reflected point is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "reflect", x, y, axis: acrossX ? "x-axis" : "y-axis" },
    coordGrid([{ x, y, label: "P" }])
  );
}

// ── Lesson: Converting Units (TEKS 6.4H) ────────────────────────────────────

const UNIT_PAIRS: { big: string; small: string; per: number }[] = [
  { big: "miles", small: "feet", per: 5280 },
  { big: "yards", small: "feet", per: 3 },
  { big: "yards", small: "inches", per: 36 },
  { big: "feet", small: "inches", per: 12 },
  { big: "kilometers", small: "meters", per: 1000 },
  { big: "meters", small: "centimeters", per: 100 },
  { big: "kilograms", small: "grams", per: 1000 },
  { big: "liters", small: "milliliters", per: 1000 },
  { big: "pounds", small: "ounces", per: 16 },
  { big: "gallons", small: "quarts", per: 4 },
  { big: "quarts", small: "pints", per: 2 },
  { big: "pints", small: "cups", per: 2 },
  { big: "gallons", small: "cups", per: 16 },
];

function makeConvertMultiply(rng: RNG): Grade6Problem {
  const pair = pick(rng, UNIT_PAIRS);
  const amount = pair.per >= 1000 ? randInt(rng, 2, 5) : randInt(rng, 2, 12);
  const result = amount * pair.per;
  const ans = `${result} ${pair.small}`;
  return build(
    "UnitConversion6",
    `Convert: ${amount} ${pair.big} = _____ ${pair.small}.`,
    "the converted measurement",
    ans,
    [
      {
        instruction: `Each single unit of ${pair.big} equals ${pair.per} ${pair.small}, so multiply ${amount} by ${pair.per}.`,
        blanks: [{ label: "multiplication", answer: `${amount} × ${pair.per}` }],
      },
      {
        instruction: "The converted measurement is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "convert", op: "mul", value: amount, per: pair.per, from: pair.big, to: pair.small },
    null,
    pair.small
  );
}

function makeConvertDivide(rng: RNG): Grade6Problem {
  const pair = pick(rng, UNIT_PAIRS);
  const k = pair.per >= 1000 ? randInt(rng, 2, 5) : randInt(rng, 2, 12);
  const value = pair.per * k;
  const ans = `${k} ${pair.big}`;
  return build(
    "UnitConversion6",
    `Convert: ${value} ${pair.small} = _____ ${pair.big}.`,
    "the converted measurement",
    ans,
    [
      {
        instruction: `There are ${pair.per} ${pair.small} in 1 unit of ${pair.big}, so divide ${value} by ${pair.per}.`,
        blanks: [{ label: "division", answer: `${value} ÷ ${pair.per}` }],
      },
      {
        instruction: "The converted measurement is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "convert", op: "div", value, per: pair.per, from: pair.small, to: pair.big },
    null,
    pair.big
  );
}

const UNIT_CHAINS: {
  text: (v: number) => string;
  from: string;
  mid: string;
  to: string;
  per1: number;
  per2: number;
  amounts: number[];
}[] = [
  {
    text: (v) => `A ribbon is ${v} yards long. How many inches long is the ribbon?`,
    from: "yards", mid: "feet", to: "inches", per1: 3, per2: 12, amounts: [2, 3, 4, 5, 6],
  },
  {
    text: (v) => `A hiking trail is ${v} miles long. How many feet long is the trail?`,
    from: "miles", mid: "yards", to: "feet", per1: 1760, per2: 3, amounts: [2, 3],
  },
  {
    text: (v) => `A race course is ${v} kilometers long. How many centimeters long is the course?`,
    from: "kilometers", mid: "meters", to: "centimeters", per1: 1000, per2: 100, amounts: [2, 3, 4, 5],
  },
  {
    text: (v) => `A caterer prepares ${v} gallons of soup. How many cups of soup is that?`,
    from: "gallons", mid: "quarts", to: "cups", per1: 4, per2: 4, amounts: [2, 3, 4, 5, 6],
  },
];

function makeConvertChain(rng: RNG): Grade6Problem {
  const chain = pick(rng, UNIT_CHAINS);
  const value = pick(rng, chain.amounts);
  const midValue = value * chain.per1;
  const result = midValue * chain.per2;
  const ans = `${result} ${chain.to}`;
  return build(
    "UnitConversion6",
    chain.text(value),
    "the converted measurement",
    ans,
    [
      {
        instruction: `First convert ${chain.from} to ${chain.mid}: ${value} × ${chain.per1}.`,
        blanks: [{ label: `in ${chain.mid}`, answer: `${midValue} ${chain.mid}` }],
      },
      {
        instruction: `Then convert ${chain.mid} to ${chain.to}: ${midValue} × ${chain.per2}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "convert-chain", value, per1: chain.per1, per2: chain.per2, to: chain.to },
    null,
    chain.to
  );
}

// ── Lesson: Number Sets, Opposites & Absolute Value (TEKS 6.2A, 6.2B) ───────

const CLASSIFY_SET_POOL = [
  "14", "0", "11", "-9", "-23", "3/5", "-7/8", "5/2", "0.45", "-2.6",
];

function mostSpecificSet(text: string): string {
  if (text.includes("/")) {
    const [ns, ds] = text.split("/");
    const n = Number(ns);
    const d = Number(ds);
    if (n % d === 0) return n / d >= 0 ? "whole number" : "integer";
    return "rational number";
  }
  if (text.includes(".")) return "rational number";
  return Number(text) >= 0 ? "whole number" : "integer";
}

function makeClassifySet6(rng: RNG): Grade6Problem {
  const text = pick(rng, CLASSIFY_SET_POOL);
  const ans = mostSpecificSet(text);
  return build(
    "NumberSets6",
    `What is the most specific number set that ${text} belongs to: whole number, integer, or rational number?`,
    "the most specific number set",
    ans,
    [
      {
        instruction: "Whole numbers are 0 and the counting numbers. Integers also include the negatives of the whole numbers. Rational numbers can be written as a fraction of two integers.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "classify-set", value: text }
  );
}

interface SignedValue {
  form: "int" | "frac" | "dec";
  text: string;
  /** Signed numeric value. */
  value: number;
  /** Reduced numerator and denominator (frac form only). */
  fn: number;
  fd: number;
}

function randomSignedValue(rng: RNG): SignedValue {
  const roll = rng();
  if (roll < 0.4) {
    const v = randNonZero(rng, -15, 15);
    return { form: "int", text: String(v), value: v, fn: v, fd: 1 };
  }
  if (roll < 0.7) {
    const d = randInt(rng, 2, 9);
    const n = randInt(rng, 1, d + 4);
    const sign = rng() < 0.5 ? -1 : 1;
    const f = makeFrac(sign * n, d);
    return { form: "frac", text: fracToString(f), value: f.n / f.d, fn: f.n, fd: f.d };
  }
  const mag = pick(rng, [0.5, 0.75, 1.25, 2.4, 3.6, 4.125, 5.5]);
  const sign = rng() < 0.5 ? -1 : 1;
  const v = sign * mag;
  return { form: "dec", text: fmt(v), value: v, fn: 0, fd: 1 };
}

function negateValueText(v: SignedValue): string {
  if (v.form === "int") return String(-v.value);
  if (v.form === "frac") return fracToString(makeFrac(-v.fn, v.fd));
  return fmt(-v.value);
}

function absValueText(v: SignedValue): string {
  if (v.form === "int") return String(Math.abs(v.value));
  if (v.form === "frac") return fracToString(makeFrac(Math.abs(v.fn), v.fd));
  return fmt(Math.abs(v.value));
}

function makeOpposite6(rng: RNG): Grade6Problem {
  const v = randomSignedValue(rng);
  const ans = negateValueText(v);
  return build(
    "NumberSets6",
    `What is the opposite of ${v.text}?`,
    "the opposite",
    ans,
    [
      {
        instruction: "Opposites are the same distance from 0 on the number line, on opposite sides of 0. Keep the same distance and change the sign.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "opposite", text: v.text }
  );
}

function makeAbsoluteValue6(rng: RNG): Grade6Problem {
  const v = randomSignedValue(rng);
  const ans = absValueText(v);
  return build(
    "NumberSets6",
    `Find the absolute value: |${v.text}|.`,
    "the absolute value",
    ans,
    [
      {
        instruction: "Absolute value is the distance from 0 on the number line. Distance is never negative, so drop the sign if there is one.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "abs", text: v.text }
  );
}

function makeCompareAbs6(rng: RNG): Grade6Problem {
  let a = randomSignedValue(rng);
  let b = randomSignedValue(rng);
  let guard = 0;
  while (Math.abs(a.value) === Math.abs(b.value) && guard++ < 50) {
    b = randomSignedValue(rng);
  }
  const winner = Math.abs(a.value) > Math.abs(b.value) ? a : b;
  const ans = winner.text;
  return build(
    "NumberSets6",
    `Which number has the greater absolute value, ${a.text} or ${b.text}?`,
    "the number with the greater absolute value",
    ans,
    [
      {
        instruction: `|${a.text}| = ${absValueText(a)} and |${b.text}| = ${absValueText(b)}. Compare the two distances from 0.`,
        blanks: [
          { label: `|${a.text}|`, answer: absValueText(a) },
          { label: `|${b.text}|`, answer: absValueText(b) },
        ],
      },
      {
        instruction: "The number with the greater absolute value is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "compare-abs", aText: a.text, bText: b.text }
  );
}

// ── Lesson: Multiplying by a Fraction: Bigger or Smaller? (TEKS 6.3B) ───────

const PREDICT_FRACTIONS: { n: number; d: number }[] = [
  { n: 5, d: 4 }, { n: 4, d: 3 }, { n: 3, d: 2 }, { n: 7, d: 5 }, { n: 5, d: 3 },
  { n: 1, d: 2 }, { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 4, d: 5 }, { n: 5, d: 8 },
  { n: 4, d: 4 }, { n: 6, d: 6 }, { n: 3, d: 3 },
];

function makePredictSize6(rng: RNG): Grade6Problem {
  const start = randInt(rng, 2, 12);
  const f = pick(rng, PREDICT_FRACTIONS);
  const rel = f.n > f.d ? "greater than" : f.n < f.d ? "less than" : "equal to";
  const fracStr = `${f.n}/${f.d}`;
  return build(
    "FractionMultiplyEffect",
    `Without computing, predict: will the product of ${start} × ${fracStr} be greater than, less than, or equal to ${start}?`,
    "the prediction",
    rel,
    [
      {
        instruction: `Compare the fraction ${fracStr} to 1. Its value is:`,
        blanks: [{ label: "compared to 1", answer: f.n > f.d ? "greater than 1" : f.n < f.d ? "less than 1" : "equal to 1" }],
      },
      {
        instruction: `Multiplying by a fraction ${f.n > f.d ? "greater than 1 makes the product larger" : f.n < f.d ? "less than 1 shrinks the product" : "equal to 1 leaves the number unchanged"}. The product will be:`,
        blanks: [{ label: "answer", answer: rel }],
      },
    ],
    { kind: "predict", start, n: f.n, d: f.d }
  );
}

function makePredictCompute6(rng: RNG): Grade6Problem {
  const start = pick(rng, [4, 5, 6, 8, 9, 10, 12]);
  const f = pick(rng, PREDICT_FRACTIONS);
  const rel = f.n > f.d ? "greater than" : f.n < f.d ? "less than" : "equal to";
  const fracStr = `${f.n}/${f.d}`;
  const ans = fracToString(makeFrac(start * f.n, f.d));
  return build(
    "FractionMultiplyEffect",
    `Compute ${start} × ${fracStr}. Write the product in simplest form.`,
    "the product",
    ans,
    [
      {
        instruction: `Predict first: since ${fracStr} is ${f.n > f.d ? "greater than 1" : f.n < f.d ? "less than 1" : "equal to 1"}, the product should be:`,
        blanks: [{ label: "prediction", answer: `${rel} ${start}` }],
      },
      {
        instruction: `Multiply: ${start} × ${fracStr} = ${start * f.n}/${f.d}. Simplify:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "predict-compute", start, n: f.n, d: f.d }
  );
}

function makePredictWord6(rng: RNG): Grade6Problem {
  const start = pick(rng, [6, 8, 9, 10, 12]);
  const f = pick(rng, PREDICT_FRACTIONS.filter((p) => p.n < p.d));
  const fracStr = `${f.n}/${f.d}`;
  const ans = fracToString(makeFrac(start * f.n, f.d));
  return build(
    "FractionMultiplyEffect",
    `A container holds ${start} liters of juice. Maria pours out ${fracStr} of the juice into a pitcher. How many liters of juice does she pour out?`,
    "the amount poured out",
    ans,
    [
      {
        instruction: `Since ${fracStr} is less than 1, the amount poured out should be less than ${start} liters. Find ${fracStr} of ${start}: ${start} × ${fracStr}.`,
        blanks: [{ label: "setup", answer: `${start} × ${fracStr}` }],
      },
      {
        instruction: "Compute and simplify:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "predict-compute", start, n: f.n, d: f.d },
    null,
    "liters"
  );
}

// ── Lesson: Benchmark Percents (TEKS 6.4F) ──────────────────────────────────

function makeBenchmarkOf6(rng: RNG): Grade6Problem {
  const pct = pick(rng, [1, 10, 25, 50, 75]);
  let base: number;
  if (pct === 1) base = pick(rng, [200, 300, 400, 500, 600, 700, 800, 900]);
  else if (pct === 10) base = pick(rng, [30, 60, 90, 120, 150, 240, 360, 480]);
  else if (pct === 50) base = pick(rng, [36, 54, 70, 90, 130, 170, 250, 310]);
  else base = pick(rng, [40, 80, 120, 160, 200, 240, 320, 400]);
  const ans = (base * pct) / 100;
  const hint =
    pct === 1
      ? `1% means 1 out of 100, so divide ${base} by 100.`
      : pct === 10
        ? `10% is 1/10, so divide ${base} by 10.`
        : pct === 25
          ? `25% is 1/4, so divide ${base} by 4.`
          : pct === 50
            ? `50% is 1/2, so divide ${base} by 2.`
            : `75% is 3/4. First find 25% of ${base}, which is ${base / 4}, then multiply by 3.`;
  return build(
    "BenchmarkPercents",
    `Use a benchmark percent to find ${pct}% of ${base}.`,
    "the percent of the number",
    ans,
    [
      {
        instruction: hint,
        blanks: [{ label: "benchmark step", answer: String(pct === 75 ? base / 4 : ans) }],
      },
      {
        instruction: `So ${pct}% of ${base} is:`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { kind: "benchmark", pct, base }
  );
}

const BENCHMARK_COMBOS: { pct: number; parts: number[] }[] = [
  { pct: 15, parts: [10, 5] },
  { pct: 30, parts: [10, 10, 10] },
  { pct: 35, parts: [25, 10] },
  { pct: 45, parts: [25, 10, 10] },
  { pct: 60, parts: [50, 10] },
  { pct: 90, parts: [50, 25, 10, 5] },
];

function makeBenchmarkCombo6(rng: RNG): Grade6Problem {
  const combo = pick(rng, BENCHMARK_COMBOS);
  const base = pick(rng, [100, 200, 300, 400, 500, 600, 800]);
  const partValues = combo.parts.map((p) => (base * p) / 100);
  const ans = (base * combo.pct) / 100;
  return build(
    "BenchmarkPercents",
    `Build ${combo.pct}% out of benchmark percents to find ${combo.pct}% of ${base}.`,
    "the percent of the number",
    ans,
    [
      {
        instruction: `${combo.pct}% can be split into ${combo.parts.map((p) => `${p}%`).join(" + ")}. Find each part of ${base}:`,
        blanks: [
          {
            label: "parts",
            answer: combo.parts.map((p, i) => `${p}% = ${partValues[i]}`).join(", "),
          },
        ],
      },
      {
        instruction: "Add the parts:",
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { kind: "benchmark", pct: combo.pct, base }
  );
}

const BENCHMARK_ESTIMATES: { asked: number; bench: number }[] = [
  { asked: 26, bench: 25 },
  { asked: 24, bench: 25 },
  { asked: 49, bench: 50 },
  { asked: 52, bench: 50 },
  { asked: 11, bench: 10 },
  { asked: 9, bench: 10 },
  { asked: 74, bench: 75 },
];

function makeBenchmarkEstimate6(rng: RNG): Grade6Problem {
  const est = pick(rng, BENCHMARK_ESTIMATES);
  const base =
    est.bench === 10 || est.bench === 50
      ? pick(rng, [60, 80, 120, 160, 240, 320])
      : pick(rng, [80, 120, 160, 240, 320, 400]);
  const ans = (base * est.bench) / 100;
  const skin = rng() < 0.5 ? "discount" : "tip";
  const prompt =
    skin === "discount"
      ? `A jacket costs $${base} and is on sale for ${est.asked}% off. Use a benchmark percent to estimate the discount. About how many dollars is the discount?`
      : `A restaurant bill is $${base}. Use a benchmark percent to estimate a ${est.asked}% tip. About how many dollars is the tip?`;
  return build(
    "BenchmarkPercents",
    prompt,
    "the estimated amount",
    `$${ans}`,
    [
      {
        instruction: `Round ${est.asked}% to the nearest benchmark percent:`,
        blanks: [{ label: "benchmark", answer: `${est.bench}%` }],
      },
      {
        instruction: `Find ${est.bench}% of ${base}:`,
        blanks: [{ label: "answer", answer: `$${ans}` }],
      },
    ],
    { kind: "benchmark-estimate", asked: est.asked, bench: est.bench, base }
  );
}

// ── Lesson: Relative Frequency & Percent Bar Graphs (TEKS 6.12D) ────────────

const SURVEYS6: { topic: string; cats: string[] }[] = [
  { topic: "favorite sport", cats: ["Soccer", "Basketball", "Baseball", "Football"] },
  { topic: "favorite pet", cats: ["Dogs", "Cats", "Fish", "Birds"] },
  { topic: "favorite subject", cats: ["Math", "Science", "Reading", "Art"] },
  { topic: "favorite season", cats: ["Spring", "Summer", "Fall", "Winter"] },
];

const SURVEY_PCTS: number[][] = [
  [40, 25, 20, 15],
  [35, 30, 20, 15],
  [30, 30, 25, 15],
  [45, 25, 20, 10],
  [25, 25, 25, 25],
  [50, 20, 20, 10],
  [35, 25, 25, 15],
  [30, 25, 25, 20],
  [40, 30, 20, 10],
  [55, 20, 15, 10],
];

function buildSurvey(rng: RNG): { topic: string; rows: { cat: string; pct: number; count: number }[]; total: number } {
  const survey = pick(rng, SURVEYS6);
  const pcts = shuffled(rng, pick(rng, SURVEY_PCTS));
  const total = pick(rng, [40, 60, 80, 100]);
  const rows = survey.cats.map((cat, i) => ({ cat, pct: pcts[i], count: (pcts[i] * total) / 100 }));
  return { topic: survey.topic, rows, total };
}

function makeRelativeFrequency6(rng: RNG): Grade6Problem {
  const s = buildSurvey(rng);
  const row = pick(rng, s.rows);
  const table = s.rows.map((r) => `${r.cat}: ${r.count}`).join(", ");
  const ans = `${row.pct}%`;
  return build(
    "CategoricalData6",
    `Students were surveyed about their ${s.topic}. The results were: ${table}. There were ${s.total} students in all. What percent of the students chose ${row.cat}?`,
    "the percent",
    ans,
    [
      {
        instruction: `Write the relative frequency of ${row.cat} as a fraction of all students:`,
        blanks: [{ label: "fraction", answer: `${row.count}/${s.total}` }],
      },
      {
        instruction: "Convert the fraction to a percent:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "rel-freq", count: row.count, total: s.total }
  );
}

function makeCountFromPercent6(rng: RNG): Grade6Problem {
  const s = buildSurvey(rng);
  const row = pick(rng, s.rows);
  const ans = row.count;
  return build(
    "CategoricalData6",
    `A percent bar graph shows the results of a survey of ${s.total} students about their ${s.topic}. The section for ${row.cat} takes up ${row.pct}% of the bar. How many students chose ${row.cat}?`,
    "the number of students",
    ans,
    [
      {
        instruction: `Find ${row.pct}% of ${s.total}: multiply ${s.total} by ${row.pct}%, or use a benchmark and build up.`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { kind: "count-from-pct", pct: row.pct, total: s.total }
  );
}

function makeCompareCategories6(rng: RNG): Grade6Problem {
  let s = buildSurvey(rng);
  let guard = 0;
  while (Math.max(...s.rows.map((r) => r.pct)) === Math.min(...s.rows.map((r) => r.pct)) && guard++ < 50) {
    s = buildSurvey(rng);
  }
  const sortedRows = [...s.rows].sort((x, y) => y.pct - x.pct);
  const top = sortedRows[0];
  const other = pick(rng, sortedRows.slice(1).filter((r) => r.pct < top.pct));
  const ans = `${top.pct - other.pct}%`;
  const table = s.rows.map((r) => `${r.cat}: ${r.count}`).join(", ");
  return build(
    "CategoricalData6",
    `Students were surveyed about their ${s.topic}. The results were: ${table}. There were ${s.total} students in all. What percent more of the students chose ${top.cat} than chose ${other.cat}?`,
    "the percent difference",
    ans,
    [
      {
        instruction: `Find each percent: ${top.cat} is ${top.count}/${s.total} and ${other.cat} is ${other.count}/${s.total}.`,
        blanks: [
          { label: top.cat, answer: `${top.pct}%` },
          { label: other.cat, answer: `${other.pct}%` },
        ],
      },
      {
        instruction: "Subtract the percents:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "rel-freq-diff", countA: top.count, countB: other.count, total: s.total }
  );
}

// ── Lesson: Write the Problem (TEKS 6.9C) ───────────────────────────────────

type OneStepForm = "add" | "sub" | "mul" | "div";

const SKINS6: { name: string; item: string }[] = [
  { name: "Maya", item: "seashells" },
  { name: "Liam", item: "marbles" },
  { name: "Sofia", item: "stickers" },
  { name: "Noah", item: "baseball cards" },
];

function oneStepEquation(form: OneStepForm, a: number, b: number): string {
  if (form === "add") return `x + ${a} = ${b}`;
  if (form === "sub") return `x − ${a} = ${b}`;
  if (form === "mul") return `${a}x = ${b}`;
  return `x/${a} = ${b}`;
}

function oneStepFrame(form: OneStepForm, skin: { name: string; item: string }, a: number, b: number): string {
  const { name, item } = skin;
  if (form === "add") {
    return `${name} had some ${item}. ${name} found ${a} more ${item} and now has ${b} ${item}. How many ${item} did ${name} start with?`;
  }
  if (form === "sub") {
    return `${name} had some ${item}. ${name} gave ${a} ${item} to a friend and now has ${b} ${item}. How many ${item} did ${name} start with?`;
  }
  if (form === "mul") {
    return `${name} arranges ${item} into ${a} equal rows with the same number in each row. There are ${b} ${item} in all. How many ${item} are in each row?`;
  }
  return `${name} shares some ${item} equally among ${a} friends, and each friend gets ${b} ${item}. How many ${item} did ${name} have to start with?`;
}

function oneStepNumbers(rng: RNG, form: OneStepForm): { a: number; b: number } {
  if (form === "add") {
    const a = randInt(rng, 3, 25);
    return { a, b: a + randInt(rng, 4, 40) };
  }
  if (form === "sub") {
    const a = randInt(rng, 3, 25);
    return { a, b: randInt(rng, 4, 40) };
  }
  if (form === "mul") {
    const a = randInt(rng, 2, 12);
    return { a, b: a * randInt(rng, 2, 12) };
  }
  const a = randInt(rng, 2, 9);
  return { a, b: randInt(rng, 2, 12) };
}

function matchOneStepProblem(rng: RNG, forms: OneStepForm[]): Grade6Problem {
  const form = pick(rng, forms);
  const skin = pick(rng, SKINS6);
  const { a, b } = oneStepNumbers(rng, form);
  const allForms: OneStepForm[] = ["add", "sub", "mul", "div"];
  const distractors = shuffled(rng, allForms.filter((f) => f !== form)).slice(0, 2);
  const optionForms = shuffled(rng, [form, ...distractors]);
  const correctIndex = optionForms.indexOf(form);
  const letters = ["A", "B", "C"];
  const letter = letters[correctIndex];
  const eq = oneStepEquation(form, a, b);
  const optionsText = optionForms
    .map((f, i) => `${letters[i]}. ${oneStepFrame(f, skin, a, b)}`)
    .join(" ");
  const opWord = form === "add" ? "addition" : form === "sub" ? "subtraction" : form === "mul" ? "multiplication" : "division";
  return build(
    "WriteProblem6",
    `Which situation can be represented by the equation ${eq}? ${optionsText}`,
    "the matching situation",
    letter,
    [
      {
        instruction: `In the equation ${eq}, x is the unknown starting amount, and the operation used on x is ${opWord} with the number ${a}. Look for the story that uses the same operation and the same numbers.`,
        blanks: [{ label: "operation", answer: opWord }],
      },
      {
        instruction: "The situation that matches the equation is option:",
        blanks: [{ label: "answer", answer: letter }],
      },
    ],
    { kind: "match", form, a, b, options: optionForms.join("|"), correctIndex }
  );
}

function makeMatchAddSub6(rng: RNG): Grade6Problem {
  return matchOneStepProblem(rng, ["add", "sub"]);
}

function makeMatchAllOps6(rng: RNG): Grade6Problem {
  return matchOneStepProblem(rng, ["add", "sub", "mul", "div"]);
}

function makeWriteEquationOneStep6(rng: RNG): Grade6Problem {
  const form = pick(rng, ["add", "sub", "mul", "div"] as OneStepForm[]);
  const skin = pick(rng, SKINS6);
  const { a, b } = oneStepNumbers(rng, form);
  const eq = oneStepEquation(form, a, b);
  return build(
    "WriteProblem6",
    `${oneStepFrame(form, skin, a, b)} Let x stand for the unknown amount. Write an equation that represents this situation.`,
    "the equation",
    eq,
    [
      {
        instruction: `The unknown amount is the ${form === "mul" ? "number in each row" : `starting number of ${skin.item}`}, so let x stand for it. The known numbers in the story are ${a} and ${b}.`,
        blanks: [{ label: "known numbers", answer: `${a} and ${b}` }],
      },
      {
        instruction: "The equation is:",
        blanks: [{ label: "answer", answer: eq }],
      },
    ],
    { kind: "write-eq-one", form, a, b }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Maker table with difficulty tiers (cumulative)
// ═══════════════════════════════════════════════════════════════════════════

const MAKERS: MakerEntry[] = [
  // T1 · Numbers & Operations
  { tier: 1, subtype: "MultiplyingDividingFractions", make: makeFractionTimesWhole },
  { tier: 2, subtype: "MultiplyingDividingFractions", make: makeFractionAddSub },
  { tier: 2, subtype: "MultiplyingDividingFractions", make: makeFractionMulDiv },
  { tier: 3, subtype: "MultiplyingDividingFractions", make: makeFDPWord },
  { tier: 1, subtype: "DecimalFluency", make: makeDecimalAddSub },
  { tier: 2, subtype: "DecimalFluency", make: makeDecimalMulDiv },
  { tier: 3, subtype: "DecimalFluency", make: makeDecimalWord },
  { tier: 1, subtype: "FDPConversions", make: makeFracToDecimal },
  { tier: 1, subtype: "FDPConversions", make: makeDecimalToPercent },
  { tier: 1, subtype: "FDPConversions", make: makePercentToFraction },
  { tier: 2, subtype: "FDPConversions", make: makeFractionToPercent },
  // T2 · Integers & Rational Numbers
  { tier: 1, subtype: "IntegerOperations", make: makeCompareIntegers },
  { tier: 1, subtype: "IntegerOperations", make: makeOrderIntegers },
  { tier: 2, subtype: "IntegerOperations", make: makeAddSubtractIntegers },
  { tier: 2, subtype: "IntegerOperations", make: makeMulDivIntegers },
  { tier: 3, subtype: "IntegerOperations", make: makeIntegerWord },
  // T3 · Expressions, Equations & Relationships
  { tier: 1, subtype: "VariablesAndExpressions", make: makeEvaluate },
  { tier: 2, subtype: "VariablesAndExpressions", make: makeEvaluateTwoVar },
  { tier: 3, subtype: "VariablesAndExpressions", make: makeExpressionWord },
  { tier: 3, subtype: "VariablesAndExpressions", make: makeExponentsPrime },
  { tier: 1, subtype: "EquivalentExpressions", make: makeCombineLikeTerms },
  { tier: 2, subtype: "EquivalentExpressions", make: makeDistributiveExpand },
  { tier: 1, subtype: "EquationsAndInequalities", make: makeAddEquation },
  { tier: 1, subtype: "EquationsAndInequalities", make: makeMulEquation },
  { tier: 2, subtype: "EquationsAndInequalities", make: makeSubDivEquation },
  { tier: 2, subtype: "EquationsAndInequalities", make: makeNegEquation },
  { tier: 2, subtype: "EquationsAndInequalities", make: makeOneStepInequality },
  { tier: 3, subtype: "EquationsAndInequalities", make: makeEquationWord },
  { tier: 1, subtype: "TwoVariableRelationships", make: makeTwoVarSimple },
  { tier: 2, subtype: "TwoVariableRelationships", make: makeTwoVarEvaluate },
  { tier: 3, subtype: "TwoVariableRelationships", make: makeTwoVarWord },
  // T4 · Proportionality
  { tier: 1, subtype: "RatiosAndRates", make: makeSimplifyRatio },
  { tier: 1, subtype: "RatiosAndRates", make: makeEquivalentRatio },
  { tier: 2, subtype: "RatiosAndRates", make: makeUnitRate },
  { tier: 1, subtype: "RatioReasoning", make: makeRatioScale },
  { tier: 2, subtype: "RatioReasoning", make: makePercentOfNumber },
  { tier: 3, subtype: "RatioReasoning", make: makeRateWord },
  // T5 · Geometry
  { tier: 1, subtype: "AreaOfPolygons", make: makeAreaParallelogram },
  { tier: 1, subtype: "AreaOfPolygons", make: makeAreaTriangle },
  { tier: 2, subtype: "AreaOfPolygons", make: makeAreaTrapezoid },
  { tier: 3, subtype: "AreaOfPolygons", make: makeAreaMissingSide },
  { tier: 1, subtype: "VolumeAndSurfaceArea", make: makeVolumePrism },
  { tier: 2, subtype: "VolumeAndSurfaceArea", make: makeSurfaceAreaPrism },
  { tier: 3, subtype: "VolumeAndSurfaceArea", make: makeVolumeWord6 },
  { tier: 1, subtype: "TriangleProperties", make: makeTriangleAngleSum6 },
  { tier: 1, subtype: "TriangleProperties", make: makeRightTriangleAngle },
  { tier: 2, subtype: "TriangleProperties", make: makeTriangleInequality },
  { tier: 3, subtype: "TriangleProperties", make: makeTriangleWord6 },
  // T6 · Measurement & Data
  { tier: 1, subtype: "DataDisplays", make: makeDataTotal },
  { tier: 2, subtype: "DataDisplays", make: makeDataCompare },
  { tier: 1, subtype: "MeasuresOfCenterAndVariation", make: makeMean },
  { tier: 1, subtype: "MeasuresOfCenterAndVariation", make: makeMode },
  { tier: 2, subtype: "MeasuresOfCenterAndVariation", make: makeMedian },
  { tier: 2, subtype: "MeasuresOfCenterAndVariation", make: makeRange },
  { tier: 3, subtype: "MeasuresOfCenterAndVariation", make: makeStatsWord },
  { tier: 3, subtype: "MeasuresOfCenterAndVariation", make: makeIQR },
  // T7 · Personal Financial Literacy
  { tier: 1, subtype: "BankingAndCredit", make: makeCreditInterest },
  { tier: 2, subtype: "BankingAndCredit", make: makeCheckRegister },
  { tier: 1, subtype: "CollegeAndSalaries", make: makeWeeklyPay },
  { tier: 2, subtype: "CollegeAndSalaries", make: makeAnnualSalary },
  { tier: 3, subtype: "CollegeAndSalaries", make: makeCollegeCompare },
  // T8 · TEKS Extensions
  { tier: 1, subtype: "CoordinateGraphing6", make: makeIdentifyPoint6 },
  { tier: 1, subtype: "CoordinateGraphing6", make: makeQuadrantAxis6 },
  { tier: 2, subtype: "CoordinateGraphing6", make: makeGridDistance6 },
  { tier: 3, subtype: "CoordinateGraphing6", make: makeReflectPoint6 },
  { tier: 1, subtype: "UnitConversion6", make: makeConvertMultiply },
  { tier: 2, subtype: "UnitConversion6", make: makeConvertDivide },
  { tier: 3, subtype: "UnitConversion6", make: makeConvertChain },
  { tier: 1, subtype: "NumberSets6", make: makeClassifySet6 },
  { tier: 1, subtype: "NumberSets6", make: makeOpposite6 },
  { tier: 2, subtype: "NumberSets6", make: makeAbsoluteValue6 },
  { tier: 3, subtype: "NumberSets6", make: makeCompareAbs6 },
  { tier: 1, subtype: "FractionMultiplyEffect", make: makePredictSize6 },
  { tier: 2, subtype: "FractionMultiplyEffect", make: makePredictCompute6 },
  { tier: 3, subtype: "FractionMultiplyEffect", make: makePredictWord6 },
  { tier: 1, subtype: "BenchmarkPercents", make: makeBenchmarkOf6 },
  { tier: 2, subtype: "BenchmarkPercents", make: makeBenchmarkCombo6 },
  { tier: 3, subtype: "BenchmarkPercents", make: makeBenchmarkEstimate6 },
  { tier: 1, subtype: "CategoricalData6", make: makeRelativeFrequency6 },
  { tier: 2, subtype: "CategoricalData6", make: makeCountFromPercent6 },
  { tier: 3, subtype: "CategoricalData6", make: makeCompareCategories6 },
  { tier: 1, subtype: "WriteProblem6", make: makeMatchAddSub6 },
  { tier: 2, subtype: "WriteProblem6", make: makeMatchAllOps6 },
  { tier: 3, subtype: "WriteProblem6", make: makeWriteEquationOneStep6 },
];

/** Makers unlocked at the given difficulty tier (cumulative). */
export function grade6MakersFor(difficulty: Grade6Difficulty): Maker[] {
  return MAKERS.filter((m) => m.tier <= difficulty).map((m) => m.make);
}

export const GRADE6_SUBTYPES: Grade6Subtype[] = [
  "MultiplyingDividingFractions",
  "DecimalFluency",
  "FDPConversions",
  "IntegerOperations",
  "VariablesAndExpressions",
  "EquivalentExpressions",
  "EquationsAndInequalities",
  "TwoVariableRelationships",
  "RatiosAndRates",
  "RatioReasoning",
  "AreaOfPolygons",
  "VolumeAndSurfaceArea",
  "TriangleProperties",
  "DataDisplays",
  "MeasuresOfCenterAndVariation",
  "BankingAndCredit",
  "CollegeAndSalaries",
  "CoordinateGraphing6",
  "UnitConversion6",
  "NumberSets6",
  "FractionMultiplyEffect",
  "BenchmarkPercents",
  "CategoricalData6",
  "WriteProblem6",
];

/**
 * Generate n Grade 6 problems using the provided RNG.
 * `subtypes` optionally restricts to certain lessons; `difficulty` filters tiers.
 */
export function generateGrade6Problems(
  rng: RNG,
  n: number,
  difficulty: Grade6Difficulty = 2,
  subtypes?: readonly Grade6Subtype[],
  wordProblems = false
): Grade6Problem[] {
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

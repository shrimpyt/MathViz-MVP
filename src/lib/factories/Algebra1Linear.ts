// Algebra1Linear.ts
// TEKS A.3A (slope), A.3B (writing equations), A.3C (graphing).
// Subtypes: SlopeFromPoints, GraphLine, LinearWordProblem,
//           WriteSlopeIntercept, WritePointSlope, StandardToSlopeIntercept.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import {
  fmtFrac,
  fmtNum,
  fmtLinear,
  fmtLineEq,
  fmtPoint,
} from "./Algebra1Format";

export const LINEAR_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["SlopeFromPoints", "GraphLine", "FunctionNotation", "SlopeEveryForm", "HorizontalVerticalLines"],
  2: ["SlopeFromPoints", "GraphLine", "FunctionNotation", "WriteSlopeIntercept", "DirectVariation", "StandardToSlopeIntercept", "RelationsFunctions", "SlopeEveryForm", "HorizontalVerticalLines", "DomainRangeLinear"],
  3: ["SlopeFromPoints", "GraphLine", "FunctionNotation", "LinearWordProblem", "WriteSlopeIntercept", "DirectVariation", "WritePointSlope", "StandardToSlopeIntercept", "WriteFunctionRule", "RelationsFunctions", "ParallelPerpendicular", "TransformLinear", "SlopeEveryForm", "HorizontalVerticalLines", "DomainRangeLinear"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "SlopeFromPoints",
  "WriteSlopeIntercept",
  "DirectVariation",
  "WritePointSlope",
  "StandardToSlopeIntercept",
  "GraphLine",
  "WriteFunctionRule",
  "RelationsFunctions",
  "FunctionNotation",
  "ParallelPerpendicular",
  "TransformLinear",
  "LinearWordProblem",
  "SlopeEveryForm",
  "HorizontalVerticalLines",
  "DomainRangeLinear",
];

// ── Slope from two points ───────────────────────────────────────────────────

function makeSlopeFromPoints(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const x1 = randInt(rng, -6, 6);
  const y1 = randInt(rng, -6, 6);
  let x2 = randInt(rng, -6, 6);
  if (x2 === x1) x2 = x1 + pick(rng, [-3, -2, -1, 1, 2, 3] as const); // no vertical lines
  const y2 = difficulty === 1 ? y1 + randInt(rng, 1, 5) : randInt(rng, -6, 6);
  const dy = y2 - y1;
  const dx = x2 - x1;
  const prompt = `Find the slope of the line through \\(${fmtPoint(x1, y1)}\\) and \\(${fmtPoint(x2, y2)}\\).`;
  const answer = `m = ${fmtFrac(dy, dx)}`;
  return {
    type: "A.3B",
    subtype: "SlopeFromPoints",
    prompt,
    answer,
    steps: [
      {
        instruction: "Use the slope formula \\(m = \\frac{y_2 - y_1}{x_2 - x_1}\\):",
        reason: "Definition of slope",
        blanks: [{ label: "substitute", answer: `m = \\frac{${y2} - (${y1})}{${x2} - (${x1})}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: `m = ${fmtFrac(dy, dx)}` }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "line", m: dy / dx, b: y1 - (dy / dx) * x1 }],
      marks: [
        { x: x1, y: y1, label: `(${x1}, ${y1})` },
        { x: x2, y: y2, label: `(${x2}, ${y2})` },
      ],
      xRange: [Math.min(x1, x2) - 3, Math.max(x1, x2) + 3],
    },
    meta: { kind: "slope", p1: [x1, y1], p2: [x2, y2] },
  };
}

// ── Graph a line; find intercepts ───────────────────────────────────────────

function makeGraphLine(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const mNum = difficulty === 1 ? pick(rng, [-3, -2, -1, 1, 2, 3] as const) : pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
  const mDen = difficulty >= 2 && rng() < 0.4 ? pick(rng, [2, 3] as const) : 1;
  const m = mNum / mDen;
  const b = randInt(rng, -6, 6);
  const xInt = -b / m; // m ≠ 0 by construction
  const eqText = mDen === 1 ? fmtLineEq(mNum, b) : `y = ${fmtFrac(mNum, mDen)}x${b >= 0 ? ` + ${b}` : ` - ${-b}`}`;
  const answer = `x-intercept: ${fmtPoint(xInt, 0)}; y-intercept: ${fmtPoint(0, b)}`;
  return {
    type: "A.3C",
    subtype: "GraphLine",
    prompt: `Graph \\(${eqText}\\). Then state the x-intercept and y-intercept.`,
    answer,
    steps: [
      {
        instruction: "The y-intercept is where x = 0:",
        reason: "Definition of y-intercept",
        blanks: [{ label: "y-intercept", answer: fmtPoint(0, b) }],
      },
      {
        instruction: "The x-intercept is where y = 0. Solve for x:",
        reason: "Definition of x-intercept",
        blanks: [{ label: "x-intercept", answer: fmtPoint(xInt, 0) }],
      },
      {
        instruction: "Plot both intercepts and draw the line through them.",
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "line", m, b, label: eqText }],
      showIntercepts: true,
      xRange: [Math.min(-8, xInt - 3), Math.max(8, xInt + 3)],
    },
    meta: { kind: "line", m, b },
  };
}

// ── Rate-of-change word problem (tier 3) ────────────────────────────────────

function makeLinearWordProblem(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-5, -3, -2, 2, 3, 5] as const);
  const b = randInt(rng, 5, 20);
  const prompt =
    `A phone plan charges a $${b} monthly fee plus $${Math.abs(m)} per gigabyte of data used. ` +
    `Write the cost equation \\(C(g)\\) and find the cost for 7 gigabytes.`;
  const cost = b + Math.abs(m) * 7;
  return {
    type: "A.3B",
    subtype: "LinearWordProblem",
    prompt,
    answer: `C(g) = ${b} + ${Math.abs(m)}g; $${cost}`,
    steps: [
      {
        instruction: "The rate of change (slope) is the per-gigabyte charge:",
        reason: "Slope as a rate of change",
        blanks: [{ label: "equation", answer: `C(g) = ${b} + ${Math.abs(m)}g` }],
      },
      {
        instruction: "Substitute g = 7:",
        blanks: [{ label: "answer", answer: `$${cost}` }],
      },
    ],
    meta: { kind: "line", m: Math.abs(m), b },
  };
}

// ── Write slope-intercept form ──────────────────────────────────────────────

function makeWriteSlopeIntercept(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const m = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
  const x1 = randInt(rng, -5, 5);
  const y1 = randInt(rng, -5, 5);
  const b = y1 - m * x1;
  const givenTwoPoints = difficulty >= 2 && rng() < 0.5;
  let prompt: string;
  let steps: Algebra1Problem["steps"];
  if (givenTwoPoints) {
    const x2 = x1 + pick(rng, [1, 2, 3] as const);
    const y2 = y1 + m * (x2 - x1);
    prompt = `Write the equation (slope-intercept form) of the line through \\(${fmtPoint(x1, y1)}\\) and \\(${fmtPoint(x2, y2)}\\).`;
    steps = [
      {
        instruction: "First find the slope:",
        reason: "Slope formula",
        blanks: [{ label: "slope", answer: `m = ${m}` }],
      },
      {
        instruction: "Substitute m and one point into y = mx + b to find b:",
        reason: "A point on the line satisfies its equation",
        blanks: [{ label: "b", answer: `b = ${b}` }],
      },
      {
        instruction: "Write the equation:",
        blanks: [{ label: "answer", answer: fmtLineEq(m, b) }],
      },
    ];
  } else {
    prompt = `Write the equation (slope-intercept form) of the line with slope ${m} through \\(${fmtPoint(x1, y1)}\\).`;
    steps = [
      {
        instruction: `Substitute m = ${m} and the point into y = mx + b:`,
        reason: "A point on the line satisfies its equation",
        blanks: [{ label: "solve for b", answer: `${y1} = ${m}(${x1}) + b \\Rightarrow b = ${b}` }],
      },
      {
        instruction: "Write the equation:",
        blanks: [{ label: "answer", answer: fmtLineEq(m, b) }],
      },
    ];
  }
  return {
    type: "A.2B",
    subtype: "WriteSlopeIntercept",
    prompt,
    answer: fmtLineEq(m, b),
    steps,
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "line", m, b }],
      marks: [{ x: x1, y: y1, label: fmtPoint(x1, y1) }],
      xRange: [x1 - 5, x1 + 5],
    },
    meta: { kind: "line", m, b },
  };
}

// ── Write point-slope form ──────────────────────────────────────────────────

function makeWritePointSlope(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
  const x1 = randInt(rng, -5, 5);
  const y1 = randInt(rng, -5, 5);
  const yPart = y1 >= 0 ? `y - ${y1}` : `y + ${-y1}`;
  const xPart = x1 >= 0 ? `x - ${x1}` : `x + ${-x1}`;
  const prompt = `Write the equation (point-slope form) of the line with slope ${m} through \\(${fmtPoint(x1, y1)}\\).`;
  const answer = `${yPart} = ${m}(${xPart})`;
  return {
    type: "A.2B",
    subtype: "WritePointSlope",
    prompt,
    answer,
    steps: [
      {
        instruction: "Point-slope form is \\(y - y_1 = m(x - x_1)\\). Substitute:",
        reason: "Definition of point-slope form",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "pointSlope", x1, y1, m },
  };
}

// ── Standard form → slope-intercept ─────────────────────────────────────────

function makeStandardToSlopeIntercept(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
  const b = randInt(rng, -6, 6);
  const k = pick(rng, [-3, -2, 2, 3] as const);
  // y = mx + b  →  mx − y = −b  →  A = k·m, B = −k, C = −k·b
  const A = k * m;
  const B = -k;
  const C = -k * b;
  const prompt = `Rewrite \\(${fmtLinear(A, 0)}${B >= 0 ? " + " : " - "}${Math.abs(B)}y = ${C}\\) in slope-intercept form.`;
  const answer = fmtLineEq(m, b);
  return {
    type: "A.2B",
    subtype: "StandardToSlopeIntercept",
    prompt,
    answer,
    steps: [
      {
        instruction: "Isolate the y-term:",
        reason: "Subtraction Property of Equality",
        blanks: [{ label: "isolated", answer: `${B}y = ${fmtLinear(-A, C)}` }],
      },
      {
        instruction: `Divide every term by ${B}:`,
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "standard", A, B, C },
  };
}

// ── Direct variation: y = kx ────────────────────────────────────────────────

function makeDirectVariation(rng: RNG): Algebra1Problem {
  const k = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const x1 = pick(rng, [2, 3, 4, 5] as const);
  const y1 = k * x1;
  const x2 = pick(rng, [6, 7, 8, 9, 10] as const);
  const y2 = k * x2;
  const prompt =
    `y varies directly with x. When \\(x = ${x1}\\), \\(y = ${y1}\\). Find the constant of variation k, then find y when \\(x = ${x2}\\).`;
  return {
    type: "A.2D",
    subtype: "DirectVariation",
    prompt,
    answer: `k = ${k}; y = ${y2}`,
    steps: [
      {
        instruction: "Direct variation has the form \\(y = kx\\). Substitute the known values:",
        reason: "Definition of direct variation",
        blanks: [{ label: "k", answer: `${y1} = k(${x1}) \\Rightarrow k = ${k}` }],
      },
      {
        instruction: `Substitute k = ${k} and \\(x = ${x2}\\):`,
        blanks: [{ label: "answer", answer: `y = ${k}(${x2}) = ${y2}` }],
      },
    ],
    meta: { kind: "directVariation", k, x: x2 },
  };
}

// ── Write a function rule from a table ───────────────────────────────────────

function makeWriteFunctionRule(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
  const b = randInt(rng, -6, 6);
  const xs = [0, 1, 2, 3];
  const ys = xs.map((x) => m * x + b);
  const table = `\\(\\begin{array}{c|cccc} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}\\)`;
  const prompt = `Write the function rule for the table: ${table}`;
  const answer = `f(x) = ${fmtLinear(m, b)}`;
  return {
    type: "A.2C",
    subtype: "WriteFunctionRule",
    prompt,
    answer,
    steps: [
      {
        instruction: "Find the rate of change between consecutive rows:",
        reason: "Constant rate of change means linear",
        blanks: [{ label: "slope", answer: `m = ${m}` }],
      },
      {
        instruction: "Read f(0) for the initial value, then write the rule:",
        blanks: [{ label: "answer", answer: `f(x) = ${fmtLinear(m, b)}` }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "line", m, b }],
      marks: xs.map((x, i) => ({ x, y: ys[i], label: `(${x}, ${ys[i]})` })),
      xRange: [-2, 5],
    },
    meta: { kind: "functionRule", m, b },
  };
}

// ── Relations & functions: domain, range, function or not ────────────────────

function makeRelationsFunctions(rng: RNG): Algebra1Problem {
  const isFunction = rng() < 0.5;
  const pairs: Array<[number, number]> = [];
  const xs = new Set<number>();
  if (isFunction) {
    while (pairs.length < 4) {
      const x = randInt(rng, -4, 4);
      if (xs.has(x)) continue;
      xs.add(x);
      pairs.push([x, randInt(rng, -5, 5)]);
    }
  } else {
    const xRep = randInt(rng, -3, 3);
    pairs.push([xRep, randInt(rng, -5, 5)]);
    let y2 = randInt(rng, -5, 5);
    if (y2 === pairs[0][1]) y2 += 2;
    pairs.push([xRep, y2]);
    while (pairs.length < 4) {
      const x = randInt(rng, -4, 4);
      if (x === xRep) continue;
      pairs.push([x, randInt(rng, -5, 5)]);
    }
  }
  const pairText = pairs.map(([x, y]) => `(${x}, ${y})`).join(", ");
  const domain = [...new Set(pairs.map(([x]) => x))].sort((p, q) => p - q).join(", ");
  const range = [...new Set(pairs.map(([, y]) => y))].sort((p, q) => p - q).join(", ");
  const prompt = `For the relation \\(\\{${pairText}\\}\\): (a) Is it a function? (b) State the domain and range.`;
  const answer = `${isFunction ? "Yes" : "No"}; domain: \\{${domain}\\}; range: \\{${range}\\}`;
  return {
    type: "A.12A",
    subtype: "RelationsFunctions",
    prompt,
    answer,
    steps: [
      {
        instruction: "A relation is a function if each domain value pairs with exactly one range value:",
        reason: "Definition of a function",
        blanks: [{ label: "function?", answer: isFunction ? "Yes, no x-value repeats" : "No, an x-value pairs with two y-values" }],
      },
      {
        instruction: "List the domain (x-values) and range (y-values):",
        blanks: [{ label: "answer", answer: `domain: \\{${domain}\\}; range: \\{${range}\\}` }],
      },
    ],
    meta: { kind: "relation", pairs },
  };
}

// ── Function notation: evaluate f(c) ────────────────────────────────────────

function makeFunctionNotation(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
  const b = randInt(rng, -6, 6);
  const c = randInt(rng, -4, 6);
  const value = m * c + b;
  const prompt = `If \\(f(x) = ${fmtLinear(m, b)}\\), find \\(f(${c})\\).`;
  return {
    type: "A.2A",
    subtype: "FunctionNotation",
    prompt,
    answer: `f(${c}) = ${value}`,
    steps: [
      {
        instruction: `Substitute ${c} for x:`,
        reason: "Function notation means evaluate",
        blanks: [{ label: "substitute", answer: `f(${c}) = ${m}(${c}) ${b >= 0 ? "+" : "-"} ${Math.abs(b)}` }],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer: `f(${c}) = ${value}` }],
      },
    ],
    meta: { kind: "functionNotation", m, b, c },
  };
}

// ── Parallel & perpendicular lines ──────────────────────────────────────────

function makeParallelPerpendicular(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-2, -1, 1, 2] as const); // keeps −1/m clean
  const b = randInt(rng, -5, 5);
  const x1 = randInt(rng, -4, 4);
  const y1 = randInt(rng, -4, 4);
  const perp = rng() < 0.5;
  const m2 = perp ? -1 / m : m;
  const b2 = y1 - m2 * x1;
  const kind = perp ? "perpendicular" : "parallel";
  const prompt =
    `Write the equation of the line ${kind} to \\(${fmtLineEq(m, b)}\\) through \\(${fmtPoint(x1, y1)}\\).`;
  const mCoeff = m2 === 1 ? "" : m2 === -1 ? "-" : fmtNum(m2);
  const bPart = b2 === 0 ? "" : b2 > 0 ? ` + ${fmtNum(b2)}` : ` - ${fmtNum(-b2)}`;
  const eqAnswer = `y = ${mCoeff}x${bPart}`;
  return {
    type: "A.2E",
    subtype: "ParallelPerpendicular",
    prompt,
    answer: eqAnswer,
    steps: [
      {
        instruction: perp
          ? "Perpendicular lines have opposite-reciprocal slopes:"
          : "Parallel lines have the same slope:",
        reason: perp ? "Slopes of perpendicular lines" : "Slopes of parallel lines",
        blanks: [{ label: "slope", answer: `m = ${fmtNum(m2)}` }],
      },
      {
        instruction: `Substitute m and \\(${fmtPoint(x1, y1)}\\) into y = mx + b:`,
        blanks: [{ label: "answer", answer: eqAnswer }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [
        { fn: "line", m, b, color: "#64748b" },
        { fn: "line", m: m2, b: b2 },
      ],
      marks: [{ x: x1, y: y1, label: fmtPoint(x1, y1) }],
      xRange: [x1 - 6, x1 + 6],
    },
    meta: { kind: "parallelPerp", m, b, x1, y1, perp },
  };
}

// ── Transformations of linear functions ─────────────────────────────────────

function makeTransformLinear(rng: RNG): Algebra1Problem {
  const m = pick(rng, [-2, -1, 1, 2] as const);
  const b = randInt(rng, -4, 4);
  const vertical = rng() < 0.6;
  const shift = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const fText = `f(x) = ${fmtLinear(m, b)}`;
  let gText: string;
  let description: string;
  if (vertical) {
    const nb = b + shift;
    gText = `g(x) = ${fmtLinear(m, nb)}`;
    description = shift > 0 ? `vertical shift up ${shift}` : `vertical shift down ${-shift}`;
  } else {
    // g(x) = f(x − h): shift right h
    const h = shift;
    const nb = b - m * h;
    gText = `g(x) = ${fmtLinear(m, nb)}`;
    description = h > 0 ? `horizontal shift right ${h}` : `horizontal shift left ${-h}`;
  }
  // A vertical shift of a (non-vertical) line always equals some horizontal
  // shift, so an unconstrained "describe the transformation" stem admits two
  // correct answers. Constrain the stem to one direction to keep the key unique.
  const prompt = `Describe the transformation from \\(${fText}\\) to \\(${gText}\\) as a ${vertical ? "vertical" : "horizontal"} shift.`;
  return {
    type: "A.3E",
    subtype: "TransformLinear",
    prompt,
    answer: description,
    steps: [
      {
        instruction: "Compare the outputs: only the constant term changed, so the slope is preserved:",
        reason: "Adding a constant shifts the graph",
        blanks: [{ label: "answer", answer: description }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [
        { fn: "line", m, b, color: "#64748b", label: "f" },
        { fn: "line", m, b: vertical ? b + shift : b - m * shift, label: "g" },
      ],
      xRange: [-8, 8],
    },
    meta: { kind: "transform", baseM: m, baseB: b, shift, vertical },
  };
}

// ── Slope in every form (A.3A) ────────────────────────────────────────────
// One skill, four costumes: table, two points (or a described graph),
// slope-intercept equation, and standard-form equation (tier 3).
// Every variant stores two points of the line in meta (kind "slope"),
// so the checker recomputes the slope the same way for all of them.

function slopeSteps(p1: [number, number], p2: [number, number]): Algebra1Problem["steps"] {
  const dy = p2[1] - p1[1];
  const dx = p2[0] - p1[0];
  return [
    {
      instruction: "Use the slope formula \\(m = \\frac{y_2 - y_1}{x_2 - x_1}\\) with two points on the line:",
      reason: "Definition of slope",
      blanks: [{ label: "substitute", answer: `m = \\frac{${p2[1]} - (${p1[1]})}{${p2[0]} - (${p1[0]})}` }],
    },
    {
      instruction: "Simplify:",
      blanks: [{ label: "answer", answer: `m = ${fmtFrac(dy, dx)}` }],
    },
  ];
}

function makeSlopeEveryForm(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const variants: string[] = difficulty === 1
    ? ["table", "points"]
    : difficulty === 2
      ? ["table", "points", "graph", "slopeIntercept"]
      : ["table", "points", "graph", "slopeIntercept", "standard"];
  const variant = pick(rng, variants as readonly string[]);

  if (variant === "table") {
    const mNum = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
    const mDen = difficulty >= 2 && rng() < 0.4 ? pick(rng, [2, 3] as const) : 1;
    const b = randInt(rng, -5, 6);
    const xs = [0, mDen, 2 * mDen, 3 * mDen];
    const ys = xs.map((x) => mNum * (x / mDen) + b);
    const table = `\\(\\begin{array}{c|cccc} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}\\)`;
    const p1: [number, number] = [xs[0], ys[0]];
    const p2: [number, number] = [xs[3], ys[3]];
    return {
      type: "A.3A",
      subtype: "SlopeEveryForm",
      prompt: `Find the slope of the linear relationship shown in the table: ${table}`,
      answer: `m = ${fmtFrac(p2[1] - p1[1], p2[0] - p1[0])}`,
      steps: [
        {
          instruction: "Pick two rows of the table as points and use the slope formula:",
          reason: "Slope is the same between any two points of a line",
          blanks: slopeSteps(p1, p2)[0].blanks,
        },
        slopeSteps(p1, p2)[1],
      ],
      meta: { kind: "slope", p1, p2 },
    };
  }

  if (variant === "points" || variant === "graph") {
    const x1 = randInt(rng, -6, 5);
    const y1 = randInt(rng, -6, 6);
    const dx = pick(rng, [1, 2, 3, 4] as const);
    const m = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
    const p1: [number, number] = [x1, y1];
    const p2: [number, number] = [x1 + dx, y1 + m * dx];
    const prompt = variant === "graph"
      ? `A graphed line passes through \\(${fmtPoint(p1[0], p1[1])}\\) and \\(${fmtPoint(p2[0], p2[1])}\\). Find its slope.`
      : `Find the slope of the line through \\(${fmtPoint(p1[0], p1[1])}\\) and \\(${fmtPoint(p2[0], p2[1])}\\).`;
    return {
      type: "A.3A",
      subtype: "SlopeEveryForm",
      prompt,
      answer: `m = ${fmtFrac(p2[1] - p1[1], p2[0] - p1[0])}`,
      steps: slopeSteps(p1, p2),
      graph: {
        kind: "FunctionGraph",
        funcs: [{ fn: "line", m, b: y1 - m * x1 }],
        marks: [
          { x: p1[0], y: p1[1], label: fmtPoint(p1[0], p1[1]) },
          { x: p2[0], y: p2[1], label: fmtPoint(p2[0], p2[1]) },
        ],
        xRange: [Math.min(p1[0], p2[0]) - 3, Math.max(p1[0], p2[0]) + 3],
      },
      meta: { kind: "slope", p1, p2 },
    };
  }

  if (variant === "slopeIntercept") {
    const mNum = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
    const mDen = rng() < 0.5 ? 1 : pick(rng, [2, 3, 4] as const);
    const b = randInt(rng, -7, 7);
    const mText = mDen === 1 ? `${mNum}` : fmtFrac(mNum, mDen);
    const eqText = `y = ${mText === "1" ? "" : mText === "-1" ? "-" : mText}x${b >= 0 ? ` + ${b}` : ` - ${-b}`}`;
    const p1: [number, number] = [0, b];
    const p2: [number, number] = [mDen, mNum + b];
    return {
      type: "A.3A",
      subtype: "SlopeEveryForm",
      prompt: `Find the slope of the line \\(${eqText}\\).`,
      answer: `m = ${fmtFrac(mNum, mDen)}`,
      steps: [
        {
          instruction: "In slope-intercept form \\(y = mx + b\\), the slope is the coefficient of x:",
          reason: "Slope-intercept form",
          blanks: [{ label: "answer", answer: `m = ${fmtFrac(mNum, mDen)}` }],
        },
      ],
      meta: { kind: "slope", p1, p2 },
    };
  }

  // standard form: Ax + By = C with B dividing C, slope = -A/B
  const B = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
  let A = 0;
  while (A === 0) A = randInt(rng, -6, 6);
  const t = randInt(rng, -6, 6);
  const C = B * t;
  const p1: [number, number] = [0, t];
  const p2: [number, number] = [B, t - A];
  const prompt = `Find the slope of the line \\(${fmtLinear(A, 0)}${B >= 0 ? " + " : " - "}${Math.abs(B)}y = ${C}\\).`;
  return {
    type: "A.3A",
    subtype: "SlopeEveryForm",
    prompt,
    answer: `m = ${fmtFrac(-A, B)}`,
    steps: [
      {
        instruction: "Solve the equation for y. The coefficient of x is the slope, \\(m = -\\frac{A}{B}\\):",
        reason: "Slope from standard form",
        blanks: [{ label: "answer", answer: `m = ${fmtFrac(-A, B)}` }],
      },
    ],
    meta: { kind: "slope", p1, p2 },
  };
}

// ── Horizontal & vertical lines (A.2G) ────────────────────────────────────

function makeHorizontalVerticalLines(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const px = randInt(rng, -7, 7);
  const py = randInt(rng, -7, 7);
  const horizontal = rng() < 0.5;
  const orientation = horizontal ? "horizontal" : "vertical";
  const askSlope = difficulty >= 2 && rng() < 0.35;
  if (askSlope) {
    const eqText = horizontal ? `y = ${py}` : `x = ${px}`;
    const answer = horizontal ? "0" : "no slope";
    return {
      type: "A.2G",
      subtype: "HorizontalVerticalLines",
      prompt: `Find the slope of the line \\(${eqText}\\).`,
      answer,
      steps: [
        {
          instruction: horizontal
            ? "A horizontal line never rises, so its slope is:"
            : "A vertical line has no run, and division by zero is undefined, so it has:",
          reason: "Slope of a horizontal or vertical line",
          blanks: [{ label: "answer", answer }],
        },
      ],
      meta: { kind: "hvLine", orientation, px, py, ask: "slope" },
    };
  }
  const answer = horizontal ? `y = ${py}` : `x = ${px}`;
  let prompt: string;
  let reason: string;
  const style = difficulty === 1 ? 0 : randInt(rng, 0, 2);
  if (style === 0) {
    prompt = `Write the equation of the ${orientation} line through \\(${fmtPoint(px, py)}\\).`;
    reason = horizontal ? "Every point of a horizontal line has the same y-value" : "Every point of a vertical line has the same x-value";
  } else if (style === 1) {
    const parallel = rng() < 0.5;
    const axis = horizontal === parallel ? "x-axis" : "y-axis";
    prompt = `Write the equation of the line through \\(${fmtPoint(px, py)}\\) that is ${parallel ? "parallel" : "perpendicular"} to the ${axis}.`;
    reason = parallel
      ? `A line parallel to the ${axis} is ${orientation}`
      : `A line perpendicular to the ${axis} is ${orientation}`;
  } else {
    const parallel = rng() < 0.5;
    const givenHorizontal = parallel === horizontal;
    const c = givenHorizontal ? randInt(rng, -7, 7) : randInt(rng, -7, 7);
    const givenEq = givenHorizontal ? `y = ${c}` : `x = ${c}`;
    prompt = `Write the equation of the line through \\(${fmtPoint(px, py)}\\) that is ${parallel ? "parallel" : "perpendicular"} to the line \\(${givenEq}\\).`;
    reason = parallel
      ? "Parallel lines run in the same direction"
      : `A line perpendicular to a ${givenHorizontal ? "horizontal" : "vertical"} line is ${orientation}`;
  }
  return {
    type: "A.2G",
    subtype: "HorizontalVerticalLines",
    prompt,
    answer,
    steps: [
      {
        instruction: reason + ":",
        reason: "Horizontal and vertical lines",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "hvLine", orientation, px, py, ask: "equation" },
  };
}

// ── Domain & range of linear functions (A.2A) ─────────────────────────────

function makeDomainRangeLinear(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const rangeNote = "The range is the set of y-values the function takes.";
  if (difficulty === 1 || rng() < 0.3) {
    // Unbounded line: from an equation or a graph description.
    const m = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
    const b = randInt(rng, -6, 6);
    const fromGraph = rng() < 0.5;
    const prompt = fromGraph
      ? `The graph of \\(${fmtLineEq(m, b)}\\) is a line that continues without end in both directions. State the domain and range.`
      : `For the linear function \\(${fmtLineEq(m, b)}\\), state the domain and range.`;
    const answer = "domain: all real numbers; range: all real numbers";
    return {
      type: "A.2A",
      subtype: "DomainRangeLinear",
      prompt,
      answer,
      steps: [
        {
          instruction: "The domain is the set of x-values. A line with no endpoints accepts every x-value:",
          reason: "Domain of a linear function",
          blanks: [{ label: "domain", answer: "all real numbers" }],
        },
        {
          instruction: rangeNote,
          blanks: [{ label: "answer", answer: "range: all real numbers" }],
        },
      ],
      meta: { kind: "domainRange", m, b, lo: null, hi: null, discrete: null },
    };
  }

  if (difficulty >= 3 && rng() < 0.4) {
    // Discrete context: only whole-number inputs make sense.
    const price = pick(rng, [3, 4, 5, 6, 8, 10] as const);
    const maxN = randInt(rng, 4, 6);
    const xs = Array.from({ length: maxN }, (_, i) => i + 1);
    const ys = xs.map((x) => price * x);
    const prompt =
      `A carnival ride charges $${price} per ride. Let \\(f(x)\\) be the total cost, in dollars, for x rides, and a ` +
      `visitor buys between 1 and ${maxN} rides. State the domain and range.`;
    const answer = `domain: \\{${xs.join(", ")}\\}; range: \\{${ys.join(", ")}\\}`;
    return {
      type: "A.2A",
      subtype: "DomainRangeLinear",
      prompt,
      answer,
      steps: [
        {
          instruction: "Only whole numbers of rides are possible, so list the x-values and the matching costs:",
          reason: "Discrete domain",
          blanks: [{ label: "answer", answer }],
        },
      ],
      meta: { kind: "domainRange", m: price, b: 0, lo: null, hi: null, discrete: xs },
    };
  }

  if (rng() < 0.5) {
    // Segment with named endpoints.
    const x1 = randInt(rng, -5, 2);
    const dx = pick(rng, [2, 3, 4, 5] as const);
    const m = pick(rng, [-2, -1, 1, 2] as const);
    const y1 = randInt(rng, -5, 5);
    const x2 = x1 + dx;
    const y2 = y1 + m * dx;
    const rlo = Math.min(y1, y2);
    const rhi = Math.max(y1, y2);
    const prompt =
      `The graph of a linear function is the segment with endpoints \\(${fmtPoint(x1, y1)}\\) and \\(${fmtPoint(x2, y2)}\\). ` +
      `State the domain and range in inequality notation.`;
    const answer = `domain: ${x1} \\leq x \\leq ${x2}; range: ${rlo} \\leq y \\leq ${rhi}`;
    return {
      type: "A.2A",
      subtype: "DomainRangeLinear",
      prompt,
      answer,
      steps: [
        {
          instruction: "The domain runs from the smaller endpoint x-value to the larger:",
          reason: "Domain of a segment",
          blanks: [{ label: "domain", answer: `${x1} \\leq x \\leq ${x2}` }],
        },
        {
          instruction: rangeNote,
          blanks: [{ label: "answer", answer: `range: ${rlo} \\leq y \\leq ${rhi}` }],
        },
      ],
      meta: { kind: "domainRange", m, b: y1 - m * x1, lo: x1, hi: x2, discrete: null },
    };
  }

  // Real-world context with a practical (bounded) domain.
  const draining = rng() < 0.5;
  let m: number, b: number, hi: number, prompt: string;
  if (draining) {
    const rate = pick(rng, [2, 4, 5, 10] as const);
    const hours = pick(rng, [4, 5, 6, 8] as const);
    b = rate * hours;
    m = -rate;
    hi = hours;
    prompt =
      `A tank holds ${b} gallons of water and drains at ${rate} gallons per hour. Let y be the gallons ` +
      `remaining after x hours, until the tank is empty. State the domain and range in inequality notation.`;
  } else {
    m = pick(rng, [5, 10, 15, 20] as const);
    b = randInt(rng, 0, 40);
    hi = pick(rng, [6, 8, 10, 12] as const);
    prompt =
      `Mia starts a savings account with $${b} and adds $${m} per week. Let y be her balance after x weeks, ` +
      `for the first ${hi} weeks. State the domain and range in inequality notation.`;
  }
  const rEnd = m * hi + b;
  const rlo = Math.min(b, rEnd);
  const rhi = Math.max(b, rEnd);
  const answer = `domain: 0 \\leq x \\leq ${hi}; range: ${rlo} \\leq y \\leq ${rhi}`;
  return {
    type: "A.2A",
    subtype: "DomainRangeLinear",
    prompt,
    answer,
    steps: [
      {
        instruction: "The situation limits x to the values between the start and the stopping point:",
        reason: "Practical domain",
        blanks: [{ label: "domain", answer: `0 \\leq x \\leq ${hi}` }],
      },
      {
        instruction: "Evaluate the function at both ends to bound the y-values:",
        blanks: [{ label: "answer", answer: `range: ${rlo} \\leq y \\leq ${rhi}` }],
      },
    ],
    meta: { kind: "domainRange", m, b, lo: 0, hi, discrete: null },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  SlopeFromPoints: makeSlopeFromPoints,
  WriteSlopeIntercept: makeWriteSlopeIntercept,
  DirectVariation: (rng) => makeDirectVariation(rng),
  WritePointSlope: (rng) => makeWritePointSlope(rng),
  StandardToSlopeIntercept: (rng) => makeStandardToSlopeIntercept(rng),
  GraphLine: makeGraphLine,
  WriteFunctionRule: (rng) => makeWriteFunctionRule(rng),
  RelationsFunctions: (rng) => makeRelationsFunctions(rng),
  FunctionNotation: (rng) => makeFunctionNotation(rng),
  ParallelPerpendicular: (rng) => makeParallelPerpendicular(rng),
  TransformLinear: (rng) => makeTransformLinear(rng),
  LinearWordProblem: (rng) => makeLinearWordProblem(rng),
  SlopeEveryForm: makeSlopeEveryForm,
  HorizontalVerticalLines: makeHorizontalVerticalLines,
  DomainRangeLinear: makeDomainRangeLinear,
};

export function generateLinearProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...LINEAR_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

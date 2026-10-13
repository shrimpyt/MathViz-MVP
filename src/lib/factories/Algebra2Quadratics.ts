// Algebra2Quadratics.ts
// A2.1, Advanced quadratics: completing the square, vertex form, complex
// solutions, discriminant analysis, quadratic formula, solving by square root.
// Pure, seeded (mulberry32). Difficulty tiers 1|2|3 are cumulative and live
// in this factory. `verify` carries machine-readable params for independent
// test recomputation (substitute roots back into ax^2+bx+c, etc.).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem, Algebra2ConicSVGParams } from "./Algebra2Types";
import { randSigned, polyToLatex, complexToLatex, fracToLatex, reduceFrac, selectMakers, linearFactor } from "./Algebra2Helpers";

export type QuadraticSubtype =
  | "CompleteSquare"
  | "VertexFormula"
  | "SolveByRoot"
  | "Discriminant"
  | "ComplexRoots"
  | "QuadraticFormula"
  // Lessons 5-1 / 5-2 / 5-3 / 5-5 / 5-10 (built out from placeholders)
  | "Transformations"
  | "WriteVertexForm"
  | "StdFormAttributes"
  | "StdFormVertex"
  | "StdFormIntercepts"
  | "ProjectileMax"
  | "ProjectileLand"
  | "AreaMax"
  | "ModelMax"
  | "FactorTrinomial"
  | "FactorGCF"
  | "FactorDiffSquares"
  | "FactorSolve"
  | "QuadInequality"
  | "QuadIneqNoCross"
  // Lesson 5-12 (2A.4A: write a quadratic from three points)
  | "QuadFromThreePoints";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function stdForm(a: number, b: number, c: number): string {
  return `y = ${polyToLatex([a, b, c])}`;
}

// ── D1: complete the square (monic, b even) ───────────────────────────────────

function makeCompleteSquare(rng: RNG): Algebra2Problem {
  const b = randSigned(rng, 5) * 2; // even
  const c = randInt(rng, -9, 15);
  const half = b / 2;
  const k = c - half * half;
  const inner = half === 0 ? "x" : half > 0 ? `(x + ${half})` : `(x - ${-half})`;
  const vertexForm = `${inner}^2 ${k < 0 ? `- ${-k}` : `+ ${k}`}`;
  const steps: ProblemStep[] = [
    {
      instruction: `Identify a, b, c in ${polyToLatex([1, b, c])}:`,
      reason: "Standard form coefficients",
      blanks: [
        { label: "a", answer: `1` },
        { label: "b", answer: `${b}` },
        { label: "c", answer: `${c}` },
      ],
    },
    {
      instruction: `Take half of b and square it: (${b}/2)^2 =`,
      reason: "Completing the square",
      blanks: [{ label: "(b/2)^2", answer: `${half * half}` }],
    },
    {
      instruction: `Add and subtract ${half * half} inside, then factor the perfect-square trinomial:`,
      reason: "Perfect-square trinomial",
      blanks: [{ label: "vertex form", answer: `y = ${vertexForm}` }],
    },
  ];
  return {
    type: "A2.5",
    subtype: "CompleteSquare",
    given: { equation: stdForm(1, b, c) },
    find: "vertex form",
    answer: `y = ${vertexForm}`,
    steps,
    verify: { a: 1, b, c, h: -half, k },
  };
}

// ── D1: vertex via formula ────────────────────────────────────────────────────

function makeVertexFormula(rng: RNG): Algebra2Problem {
  const b = randSigned(rng, 6) * 2;
  const c = randInt(rng, -8, 12);
  const h = -b / 2;
  const k = c - (b / 2) * (b / 2);
  return {
    type: "A2.5",
    subtype: "VertexFormula",
    given: { equation: stdForm(1, b, c) },
    find: "vertex",
    answer: `(${h}, ${k})`,
    steps: [
      {
        instruction: "The x-coordinate of the vertex is h = -b / 2a:",
        reason: "Vertex formula h = -b/2a",
        blanks: [
          { label: "h = -b/2a", answer: `h = ${h}` },
        ],
      },
      {
        instruction: `Evaluate the function at x = ${h} to find k:`,
        reason: "Function evaluation",
        blanks: [{ label: "k", answer: `k = ${k}` }],
      },
    ],
    verify: { a: 1, b, c, h, k },
  };
}

// ── D1/D2: solve (x - h)^2 = k ────────────────────────────────────────────────

function makeSolveByRoot(rng: RNG, allowComplex: boolean): Algebra2Problem {
  const h = randSigned(rng, 6);
  const s = randInt(rng, 2, 6);
  const negative = allowComplex && rng() < 0.5;
  const k = negative ? -s * s : s * s;
  const answer = negative
    ? `x = ${h} \\pm ${s === 1 ? "" : s}i`
    : `x = ${h} \\pm ${s}`;
  return {
    type: "A2.5",
    subtype: "SolveByRoot",
    given: { equation: `(x ${h < 0 ? "+" : "-"} ${Math.abs(h)})^2 = ${k}` },
    find: "x",
    answer,
    steps: [
      {
        instruction: "Take the square root of both sides (remember ±):",
        reason: "Square root property",
        blanks: [
          { label: "x - h = ±√k", answer: `x ${h < 0 ? "+" : "-"} ${Math.abs(h)} = \\pm ${negative ? `${s}i` : `${s}`}` },
        ],
      },
      {
        instruction: `Solve for x:`,
        reason: "Isolate x",
        blanks: [{ label: "solutions", answer }],
      },
    ],
    verify: { h, k, negative },
  };
}

// ── D2: discriminant nature ───────────────────────────────────────────────────

function makeDiscriminant(rng: RNG, hard: boolean): Algebra2Problem {
  // Construct discriminant sign deliberately.
  const kind = pick(rng, ["pos", "zero", "neg"] as const);
  const a = hard ? randSigned(rng, 3) : 1;
  const b = randSigned(rng, 8);
  let c: number;
  if (kind === "zero") {
    // need b^2 = 4ac -> pick a,c with 4ac a perfect square equal b^2; simpler: c = b^2/(4a)
    const bb = b * b;
    const denom = 4 * a;
    c = bb % denom === 0 ? bb / denom : Math.round(bb / denom);
    // recompute actual kind from rounded c (may flip), then report truthfully
  } else {
    c = randInt(rng, -10, 14);
  }
  const D = b * b - 4 * a * c;
  const nature = D > 0 ? "two real solutions" : D === 0 ? "one real solution" : "two complex solutions";
  return {
    type: "A2.5",
    subtype: "Discriminant",
    given: { equation: `${polyToLatex([a, b, c])} = 0` },
    find: "discriminant and nature of solutions",
    answer: `D = ${D}; ${nature}`,
    steps: [
      {
        instruction: "Compute the discriminant D = b^2 - 4ac:",
        reason: "Discriminant formula",
        blanks: [
          { label: "D", answer: `${D}` },
        ],
      },
      {
        instruction: "Classify: D > 0 → two real; D = 0 → one real; D < 0 → two complex:",
        reason: "Nature of solutions",
        blanks: [{ label: "nature", answer: nature }],
      },
    ],
    verify: { a, b, c, D },
  };
}

// ── D2/D3: complex solutions with clean a±bi ──────────────────────────────────

function makeComplexRoots(rng: RNG): Algebra2Problem {
  const b = randSigned(rng, 5) * 2; // even → integer real part
  const kk = randInt(rng, 1, 5); // imaginary magnitude
  const re = -b / 2;
  // D = b^2 - 4c = -4k^2  →  c = (b^2 + 4k^2)/4
  const c = (b * b + 4 * kk * kk) / 4;
  const answer = `x = ${complexToLatex(re, kk)} or x = ${complexToLatex(re, -kk)}`;
  return {
    type: "A2.5",
    subtype: "ComplexRoots",
    given: { equation: `${polyToLatex([1, b, c])} = 0` },
    find: "x (complex solutions)",
    answer,
    steps: [
      {
        instruction: "Compute the discriminant D = b^2 - 4ac:",
        reason: "Discriminant formula",
        blanks: [{ label: "D", answer: `${-4 * kk * kk}` }],
      },
      {
        instruction: "D < 0, so apply the quadratic formula with √D = √(-4k²) = 2ki:",
        reason: "Quadratic formula (complex case)",
        blanks: [
          { label: "x = (-b ± 2ki)/2", answer },
        ],
      },
    ],
    verify: { a: 1, b, c, re, im: kk },
  };
}

// ── D2/D3: quadratic formula, constructed from integer roots ───────────────────

function makeQuadraticFormula(rng: RNG, hard: boolean): Algebra2Problem {
  const a = hard ? randSigned(rng, 3) : 1;
  let r1 = randSigned(rng, 6);
  let r2 = randSigned(rng, 6);
  if (r1 === r2) r2 = r1 + 3;
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  const lo = Math.min(r1, r2);
  const hi = Math.max(r1, r2);
  return {
    type: "A2.5",
    subtype: "QuadraticFormula",
    given: { equation: `${polyToLatex([a, b, c])} = 0` },
    find: "x",
    answer: `x = ${lo} or x = ${hi}`,
    steps: [
      {
        instruction: "Identify a, b, c and substitute into x = (-b ± √(b²-4ac)) / 2a:",
        reason: "Quadratic formula",
        blanks: [
          { label: "a, b, c", answer: `a = ${a}, b = ${b}, c = ${c}` },
        ],
      },
      {
        instruction: "Simplify the discriminant and the roots:",
        reason: "Simplify radicals",
        blanks: [
          { label: "D", answer: `${b * b - 4 * a * c}` },
          { label: "solutions", answer: `x = ${lo} or x = ${hi}` },
        ],
      },
    ],
    verify: { a, b, c, r1: lo, r2: hi },
  };
}

// ── Lessons 5-1 / 5-2 / 5-3 / 5-5 / 5-10 (built out from placeholders) ───────
// Same conventions as above: answers computed from the generated givens, full
// stepped reasons, `verify` carries machine-readable params, parabola graphs
// via ConicGraph svgParams (the pattern Algebra2Conics.ts uses).

function parabolaGraph(h: number, k: number, a: number): Algebra2ConicSVGParams {
  return { kind: "ConicGraph", parabolas: [{ h, k, a }] };
}

/** "a(x - h)^2 + k" body (no leading f(x) =), with clean zero handling. */
function vertexFormBody(aNum: number, aDen: number, h: number, k: number): string {
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  let aPart: string;
  if (aDen === 1) aPart = aNum === 1 ? "" : aNum === -1 ? "-" : `${aNum}`;
  else aPart = fracToLatex(aNum, aDen);
  const kPart = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  return `${aPart}${xPart}${kPart}`;
}

/** Leading-coefficient prefix for factored forms: 1 → "", -1 → "-", else the number. */
function coefPrefix(a: number): string {
  return a === 1 ? "" : a === -1 ? "-" : `${a}`;
}

// ── 5-1: attributes & transformations of quadratics ──────────────────────────

function transformationParts(aNum: number, aDen: number, h: number, k: number): string[] {
  const parts: string[] = [];
  const absA = fracToLatex(Math.abs(aNum), aDen);
  if (aNum < 0) parts.push("reflect over the x-axis");
  if (Math.abs(aNum) > aDen) parts.push(`vertical stretch by ${absA}`);
  else if (Math.abs(aNum) < aDen) parts.push(`vertical shrink by ${absA}`);
  if (h > 0) parts.push(`shift right ${h}`);
  else if (h < 0) parts.push(`shift left ${-h}`);
  if (k > 0) parts.push(`shift up ${k}`);
  else if (k < 0) parts.push(`shift down ${-k}`);
  return parts;
}

function makeTransformations(rng: RNG, tier: "basic" | "full" | "frac"): Algebra2Problem {
  let aNum = 1;
  let aDen = 1;
  let h = 0;
  let k = 0;
  if (tier === "frac") {
    const [n, d] = pick(rng, [[1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [-2, 3], [3, 2], [-3, 2]] as const);
    aNum = n;
    aDen = d;
    h = randSigned(rng, 4);
    k = randSigned(rng, 5);
  } else if (tier === "basic") {
    aNum = pick(rng, [-2, -1, 1, 2]);
    h = randSigned(rng, 3);
    k = randSigned(rng, 4);
  } else {
    aNum = pick(rng, [-3, -2, -1, 1, 2, 3]);
    h = randInt(rng, -4, 4);
    k = randInt(rng, -5, 5);
    if (h === 0 && k === 0) k = 2;
  }
  const body = vertexFormBody(aNum, aDen, h, k);
  const aStr = fracToLatex(aNum, aDen);
  const absStr = fracToLatex(Math.abs(aNum), aDen);
  const parts = transformationParts(aNum, aDen, h, k);
  const widthPhrase = Math.abs(aNum) > aDen
    ? `vertical stretch by ${absStr}`
    : Math.abs(aNum) < aDen
      ? `vertical shrink by ${absStr}`
      : "same width as the parent";
  const widthInstruction = Math.abs(aNum) > aDen
    ? `|a| = ${absStr} > 1, so the graph is narrower than the parent (a vertical stretch):`
    : Math.abs(aNum) < aDen
      ? `|a| = ${absStr} < 1, so the graph is wider than the parent (a vertical shrink):`
      : "|a| = 1, so the graph has the same width as the parent:";
  const dirInstruction = aNum < 0
    ? `a = ${aStr} < 0, so the graph is reflected over the x-axis and opens downward:`
    : `a = ${aStr} > 0, so the graph opens upward (no reflection):`;
  const dirBlank = aNum < 0 ? "reflect over the x-axis; opens down" : "opens up";
  const shiftParts = parts.filter((p) => p.startsWith("shift"));
  const hText = h > 0
    ? `h = ${h} shifts the graph right ${h}`
    : h < 0
      ? `h = ${h} shifts the graph left ${-h}`
      : "h = 0 gives no horizontal shift";
  const kText = k > 0
    ? `k = ${k} shifts the graph up ${k}`
    : k < 0
      ? `k = ${k} shifts the graph down ${-k}`
      : "k = 0 gives no vertical shift";
  const answer = `${parts.join("; ")}; vertex (${h}, ${k}); axis of symmetry x = ${h}`;
  return {
    type: "A2.5",
    subtype: "Transformations",
    given: { function: `g(x) = ${body}`, parent: "f(x) = x^2" },
    find: "transformations from the parent function, vertex, and axis of symmetry",
    answer,
    steps: [
      { instruction: `In vertex form a(x - h)^2 + k, read off the values from g(x) = ${body}:`, reason: "Vertex form", blanks: [
        { label: "a", answer: aStr },
        { label: "h", answer: `${h}` },
        { label: "k", answer: `${k}` },
      ] },
      { instruction: "The vertex is (h, k), and the axis of symmetry is the vertical line x = h:", reason: "Vertex and axis of symmetry", blanks: [
        { label: "vertex", answer: `(${h}, ${k})` },
        { label: "axis of symmetry", answer: `x = ${h}` },
      ] },
      { instruction: widthInstruction, reason: "Effect of |a| on width", blanks: [
        { label: "width", answer: widthPhrase },
      ] },
      { instruction: dirInstruction, reason: "Sign of a gives direction", blanks: [
        { label: "direction", answer: dirBlank },
      ] },
      { instruction: `${hText}; ${kText}:`, reason: "Shifts from h and k", blanks: [
        { label: "shifts", answer: shiftParts.length ? shiftParts.join("; ") : "no shifts" },
      ] },
    ],
    svgParams: parabolaGraph(h, k, aNum / aDen),
    verify: { aNum, aDen, h, k },
  };
}

function makeWriteVertexForm(rng: RNG): Algebra2Problem {
  const a = pick(rng, [-3, -2, -1, 1, 2, 3]);
  const h = randInt(rng, -5, 5);
  const k = randInt(rng, -6, 6);
  const answer = `f(x) = ${vertexFormBody(a, 1, h, k)}`;
  return {
    type: "A2.5",
    subtype: "WriteVertexForm",
    given: { vertex: `(${h}, ${k})`, a: `${a}` },
    find: "equation of the parabola in vertex form",
    answer,
    steps: [
      { instruction: `Vertex form is f(x) = a(x - h)^2 + k. Substitute a = ${a}, h = ${h}, and k = ${k}:`, reason: "Vertex form", blanks: [
        { label: "equation", answer },
      ] },
      { instruction: `Check: with a = ${a} ${a > 0 ? "> 0" : "< 0"} the parabola opens ${a > 0 ? "upward" : "downward"} from its vertex:`, reason: "Sign of a gives direction", blanks: [
        { label: "vertex", answer: `(${h}, ${k})` },
      ] },
    ],
    svgParams: parabolaGraph(h, k, a),
    verify: { a, h, k },
  };
}

// ── 5-2: quadratics in standard form ─────────────────────────────────────────

function makeStdFormAttributes(rng: RNG): Algebra2Problem {
  const a = pick(rng, [-2, -1, 1, 2]);
  const h = randInt(rng, -4, 4);
  const k = randInt(rng, -6, 6);
  const b = -2 * a * h;
  const c = a * h * h + k;
  const dir = a > 0 ? "up" : "down";
  const answer = `opens ${dir}; axis of symmetry x = ${h}; y-intercept (0, ${c})`;
  return {
    type: "A2.5",
    subtype: "StdFormAttributes",
    given: { function: `f(x) = ${polyToLatex([a, b, c])}` },
    find: "opening direction, axis of symmetry, and y-intercept",
    answer,
    steps: [
      { instruction: `The leading coefficient is a = ${a} ${a > 0 ? "> 0" : "< 0"}, so the parabola opens ${dir}:`, reason: "Sign of the leading coefficient", blanks: [
        { label: "direction", answer: dir },
      ] },
      { instruction: `The axis of symmetry is x = -b / (2a) = ${-b} / ${2 * a}:`, reason: "Axis of symmetry formula", blanks: [
        { label: "axis of symmetry", answer: `x = ${h}` },
      ] },
      { instruction: "The y-intercept is the constant term c, the value of the function at x = 0:", reason: "Y-intercept from standard form", blanks: [
        { label: "y-intercept", answer: `(0, ${c})` },
      ] },
    ],
    svgParams: parabolaGraph(h, k, a),
    verify: { a, b, c },
  };
}

function makeStdFormVertex(rng: RNG, hard: boolean): Algebra2Problem {
  const a = hard ? pick(rng, [-3, -2, 2, 3]) : pick(rng, [-2, -1, 1, 2]);
  const h = randInt(rng, hard ? -6 : -5, hard ? 6 : 5);
  const k = randInt(rng, -9, 9);
  const b = -2 * a * h;
  const c = a * h * h + k;
  const extreme = a > 0 ? "minimum" : "maximum";
  const answer = `vertex (${h}, ${k}); ${extreme} value ${k}`;
  return {
    type: "A2.5",
    subtype: "StdFormVertex",
    given: { function: `f(x) = ${polyToLatex([a, b, c])}` },
    find: "vertex and the maximum or minimum value",
    answer,
    steps: [
      { instruction: `The x-coordinate of the vertex is h = -b / (2a) = ${-b} / ${2 * a}:`, reason: "Vertex formula h = -b / (2a)", blanks: [
        { label: "h", answer: `${h}` },
      ] },
      { instruction: `Evaluate the function at x = ${h} to find the y-coordinate k of the vertex:`, reason: "Function evaluation", blanks: [
        { label: "k", answer: `${k}` },
      ] },
      { instruction: `Since a = ${a} ${a > 0 ? "> 0" : "< 0"}, the parabola opens ${a > 0 ? "upward" : "downward"}, so the vertex is its ${extreme} point:`, reason: "Maximum or minimum at the vertex", blanks: [
        { label: "extreme value", answer: `${extreme} value ${k}` },
      ] },
    ],
    svgParams: parabolaGraph(h, k, a),
    verify: { a, b, c, h, k },
  };
}

function makeStdFormIntercepts(rng: RNG, hard: boolean): Algebra2Problem {
  const a = hard ? pick(rng, [-2, -1, 1, 2]) : 1;
  let r1 = randSigned(rng, 6);
  let r2 = randSigned(rng, 6);
  if (r1 === r2) r2 = r1 + 2;
  if (r1 > r2) [r1, r2] = [r2, r1];
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  const h = (r1 + r2) / 2;
  const kv = a * (h - r1) * (h - r2);
  const factored = `${coefPrefix(a)}${linearFactor(r1)}${linearFactor(r2)}`;
  const answer = `x-intercepts (${r1}, 0) and (${r2}, 0); y-intercept (0, ${c})`;
  return {
    type: "A2.5",
    subtype: "StdFormIntercepts",
    given: { function: `f(x) = ${polyToLatex([a, b, c])}` },
    find: "x-intercepts and y-intercept",
    answer,
    steps: [
      { instruction: "Set x = 0: the y-intercept is f(0) = c:", reason: "Y-intercept", blanks: [
        { label: "y-intercept", answer: `(0, ${c})` },
      ] },
      { instruction: "Factor the quadratic to find where the graph crosses the x-axis:", reason: "Factoring", blanks: [
        { label: "factored form", answer: factored },
      ] },
      { instruction: "Set each factor equal to 0 (Zero Product Property) and read off the points:", reason: "Zero Product Property", blanks: [
        { label: "x-intercepts", answer: `(${r1}, 0) and (${r2}, 0)` },
      ] },
    ],
    svgParams: parabolaGraph(h, kv, a),
    verify: { a, b, c, r1, r2 },
  };
}

// ── 5-3: quadratic models ────────────────────────────────────────────────────

function projectileIntro(rng: RNG, h0: number): string {
  const place = h0 === 0 ? "ground level" : `a platform ${h0} feet above the ground`;
  return pick(rng, [
    `A ball is launched from ${place}. Its height in feet after t seconds is modeled by`,
    `A model rocket is launched from ${place}. Its height in feet after t seconds is modeled by`,
    `A stone is thrown from ${place}. Its height in feet after t seconds is modeled by`,
  ]);
}

function makeProjectileMax(rng: RNG, half: boolean): Algebra2Problem {
  const tStar = half ? pick(rng, [0.5, 1.5, 2.5]) : randInt(rng, 1, 3);
  const v0 = 32 * tStar;
  const h0 = pick(rng, [0, 3, 5, 6, 10, 15, 24, 40, 60, 80]);
  const maxH = -16 * tStar * tStar + v0 * tStar + h0;
  const answer = `${maxH} feet at t = ${tStar} seconds`;
  return {
    type: "A2.5",
    subtype: "ProjectileMax",
    given: { scenario: projectileIntro(rng, h0), model: `h(t) = ${polyToLatex([-16, v0, h0], "t")}` },
    find: "maximum height reached and the time at which it occurs",
    answer,
    steps: [
      { instruction: `The maximum height occurs at the vertex: t = -b / (2a) with a = -16 and b = ${v0}:`, reason: "Vertex of the model", blanks: [
        { label: "t", answer: `${tStar}` },
      ] },
      { instruction: `Evaluate h(${tStar}) to find the height at that time:`, reason: "Function evaluation", blanks: [
        { label: "maximum height", answer: `${maxH} feet` },
      ] },
      { instruction: "Interpret the vertex in context:", reason: "Vertex in a model", blanks: [
        { label: "answer", answer },
      ] },
    ],
    verify: { v0, h0, tStar, maxH },
  };
}

function makeProjectileLand(rng: RNG): Algebra2Problem {
  const T = randInt(rng, 3, 6);
  const r = pick(rng, [-2, -1]);
  const v0 = 16 * (T + r);
  const h0 = -16 * T * r;
  const coeffs = [-16, v0, h0];
  const answer = `${T} seconds`;
  return {
    type: "A2.5",
    subtype: "ProjectileLand",
    given: {
      scenario: `An object is launched from a platform ${h0} feet above the ground. Its height in feet after t seconds is modeled by`,
      model: `h(t) = ${polyToLatex(coeffs, "t")}`,
    },
    find: "time at which the object hits the ground",
    answer,
    steps: [
      { instruction: "The object hits the ground when h(t) = 0. Set the model equal to 0:", reason: "Zero in a model", blanks: [
        { label: "equation", answer: `${polyToLatex(coeffs, "t")} = 0` },
      ] },
      { instruction: "Factor the left side:", reason: "Factoring", blanks: [
        { label: "factored form", answer: `-16${linearFactor(T, "t")}${linearFactor(r, "t")}` },
      ] },
      { instruction: "Apply the Zero Product Property. Time cannot be negative, so keep the positive root (the negative root is the moment before launch):", reason: "Zero Product Property", blanks: [
        { label: "time", answer },
      ] },
    ],
    verify: { v0, h0, land: T, otherRoot: r },
  };
}

function makeAreaMax(rng: RNG): Algebra2Problem {
  const F = pick(rng, [40, 60, 80, 100, 120]);
  const wStar = F / 4;
  const aMax = wStar * (F - 2 * wStar);
  const answer = `width ${wStar} feet; maximum area ${aMax} square feet`;
  return {
    type: "A2.5",
    subtype: "AreaMax",
    given: {
      scenario: `A farmer has ${F} feet of fencing to build a rectangular pen against a straight barn wall, so only three sides need fencing. If w is the width of the pen (the side perpendicular to the wall) in feet, its area in square feet is modeled by`,
      model: `A(w) = ${polyToLatex([-2, F, 0], "w")}`,
    },
    find: "width that gives the maximum area, and that maximum area",
    answer,
    steps: [
      { instruction: `The maximum area occurs at the vertex: w = -b / (2a) with a = -2 and b = ${F}:`, reason: "Vertex of the model", blanks: [
        { label: "w", answer: `${wStar}` },
      ] },
      { instruction: `Evaluate A(${wStar}); the side along the wall is ${F} - 2(${wStar}) = ${F - 2 * wStar} feet:`, reason: "Function evaluation", blanks: [
        { label: "maximum area", answer: `${aMax} square feet` },
      ] },
      { instruction: "Interpret the vertex in context:", reason: "Vertex in a model", blanks: [
        { label: "answer", answer },
      ] },
    ],
    verify: { fence: F, wStar, aMax },
  };
}

function makeModelMax(rng: RNG): Algebra2Problem {
  const [aMag, xStar] = pick(rng, [[1, 20], [1, 30], [1, 40], [2, 15], [2, 20], [2, 25], [5, 10], [5, 15], [10, 10]] as const);
  const pMax = pick(rng, [1200, 1500, 1800, 2000, 2400, 2500]);
  const a = -aMag;
  const b = 2 * aMag * xStar;
  const c = pMax - aMag * xStar * xStar;
  const answer = `price ${xStar} dollars; maximum profit ${pMax} dollars`;
  return {
    type: "A2.5",
    subtype: "ModelMax",
    given: {
      scenario: "A community theater's nightly profit P, in dollars, depends on the ticket price x, in dollars, and is modeled by",
      model: `P(x) = ${polyToLatex([a, b, c])}`,
    },
    find: "ticket price that maximizes the profit, and the maximum profit",
    answer,
    steps: [
      { instruction: `The maximum profit occurs at the vertex: x = -b / (2a) with a = ${a} and b = ${b}:`, reason: "Vertex of the model", blanks: [
        { label: "x", answer: `${xStar}` },
      ] },
      { instruction: `Evaluate P(${xStar}) to find the profit at that price:`, reason: "Function evaluation", blanks: [
        { label: "maximum profit", answer: `${pMax} dollars` },
      ] },
      { instruction: "Interpret the vertex in context:", reason: "Vertex in a model", blanks: [
        { label: "answer", answer },
      ] },
    ],
    verify: { a, b, c, xStar, pMax },
  };
}

// ── 5-5: factoring to solve ──────────────────────────────────────────────────

function distinctRootPair(rng: RNG, max: number): [number, number] {
  let r1 = randSigned(rng, max);
  let r2 = randSigned(rng, max);
  if (r1 === r2) r2 = r1 + 2;
  if (r1 > r2) [r1, r2] = [r2, r1];
  return [r1, r2];
}

function makeFactorTrinomial(rng: RNG): Algebra2Problem {
  const [r1, r2] = distinctRootPair(rng, 8);
  const b = -(r1 + r2);
  const c = r1 * r2;
  const m = Math.min(-r1, -r2);
  const n = Math.max(-r1, -r2);
  const factored = `${linearFactor(r1)}${linearFactor(r2)}`;
  return {
    type: "A2.5",
    subtype: "FactorTrinomial",
    given: { expression: polyToLatex([1, b, c]) },
    find: "factored form",
    answer: factored,
    steps: [
      { instruction: `Find two integers whose product is c = ${c} and whose sum is b = ${b}:`, reason: "Factoring a trinomial", blanks: [
        { label: "pair", answer: `${m} and ${n}` },
      ] },
      { instruction: "Write the trinomial as a product of two binomials:", reason: "Factored form", blanks: [
        { label: "factored form", answer: factored },
      ] },
    ],
    verify: { b, c, r1, r2 },
  };
}

function makeFactorGCF(rng: RNG): Algebra2Problem {
  const g = pick(rng, [2, 3, 4, 5, 6]);
  const [r1, r2] = distinctRootPair(rng, 7);
  const b = -(r1 + r2);
  const c = r1 * r2;
  const answer = `${g}${linearFactor(r1)}${linearFactor(r2)}`;
  return {
    type: "A2.5",
    subtype: "FactorGCF",
    given: { expression: polyToLatex([g, g * b, g * c]) },
    find: "factored form (factor completely)",
    answer,
    steps: [
      { instruction: `Every term shares the greatest common factor ${g}. Factor it out:`, reason: "Greatest Common Factor", blanks: [
        { label: "after GCF", answer: `${g}(${polyToLatex([1, b, c])})` },
      ] },
      { instruction: `Factor the remaining trinomial (two integers with product ${c} and sum ${b}):`, reason: "Factoring a trinomial", blanks: [
        { label: "factored form", answer },
      ] },
    ],
    verify: { g, b, c, r1, r2 },
  };
}

function makeFactorDiffSquares(rng: RNG, big: boolean): Algebra2Problem {
  const m = big ? pick(rng, [2, 3, 4, 5]) : 1;
  const s = randInt(rng, 2, 12);
  const mt = m === 1 ? "x" : `${m}x`;
  const answer = `(${mt} - ${s})(${mt} + ${s})`;
  return {
    type: "A2.5",
    subtype: "FactorDiffSquares",
    given: { expression: polyToLatex([m * m, 0, -s * s]) },
    find: "factored form",
    answer,
    steps: [
      { instruction: `Both terms are perfect squares, so the expression has the form a^2 - b^2. Identify a and b:`, reason: "Difference of two squares", blanks: [
        { label: "a", answer: mt },
        { label: "b", answer: `${s}` },
      ] },
      { instruction: "Apply a^2 - b^2 = (a - b)(a + b):", reason: "Difference of two squares", blanks: [
        { label: "factored form", answer },
      ] },
    ],
    verify: { m, s },
  };
}

function makeFactorSolve(rng: RNG, hard: boolean): Algebra2Problem {
  let a = 1;
  let r1: number;
  let r2: number;
  if (hard && rng() < 0.35) {
    r1 = randSigned(rng, 7);
    r2 = r1;
  } else {
    a = hard ? pick(rng, [2, 3]) : 1;
    [r1, r2] = distinctRootPair(rng, 7);
  }
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  const doubleRoot = r1 === r2;
  const factored = doubleRoot
    ? `${linearFactor(r1)}^2`
    : `${coefPrefix(a)}${linearFactor(r1)}${linearFactor(r2)}`;
  const inner = (r: number) => (r === 0 ? "x" : r > 0 ? `x - ${r}` : `x + ${-r}`);
  const answer = doubleRoot ? `x = ${r1}` : `x = ${r1} or x = ${r2}`;
  return {
    type: "A2.5",
    subtype: "FactorSolve",
    given: { equation: `${polyToLatex([a, b, c])} = 0` },
    find: "x (solve by factoring)",
    answer,
    steps: [
      { instruction: "Factor the left side completely:", reason: "Factoring", blanks: [
        { label: "factored form", answer: factored },
      ] },
      { instruction: "Set each factor equal to 0 (Zero Product Property):", reason: "Zero Product Property", blanks: [
        { label: "equations", answer: doubleRoot ? `${inner(r1)} = 0` : `${inner(r1)} = 0 or ${inner(r2)} = 0` },
      ] },
      { instruction: "Solve each equation:", reason: "Solve", blanks: [
        { label: "solutions", answer },
      ] },
    ],
    verify: { a, b, c, r1, r2 },
  };
}

// ── 5-10: quadratic inequalities ─────────────────────────────────────────────

const INEQ_OPS = ["<", "<=", ">", ">="] as const;
type IneqOp = (typeof INEQ_OPS)[number];
const INEQ_DISPLAY: Record<IneqOp, string> = { "<": "<", "<=": "\\leq", ">": ">", ">=": "\\geq" };

function quadIneqAnswer(a: number, r1: number, r2: number, op: IneqOp): string {
  const strict = op === "<" || op === ">";
  // Between the roots the expression has sign -sign(a); outside, sign(a).
  const between = (a > 0) === (op === "<" || op === "<=");
  if (between) return strict ? `${r1} < x < ${r2}` : `${r1} \\leq x \\leq ${r2}`;
  return strict ? `x < ${r1} or x > ${r2}` : `x \\leq ${r1} or x \\geq ${r2}`;
}

function makeQuadInequality(rng: RNG, form: "plain" | "shift" | "scaled"): Algebra2Problem {
  const [r1, r2] = distinctRootPair(rng, 7);
  const op = pick(rng, INEQ_OPS);
  const opDisp = INEQ_DISPLAY[op];
  let a = 1;
  if (form === "scaled") a = pick(rng, [-2, -1, 2, 3]);
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;
  const factored = `${coefPrefix(a)}${linearFactor(r1)}${linearFactor(r2)}`;
  const answer = quadIneqAnswer(a, r1, r2, op);
  const steps: ProblemStep[] = [];
  let ineqStr: string;
  if (form === "shift") {
    const K = randInt(rng, 2, 12);
    ineqStr = `${polyToLatex([a, b, c + K])} ${opDisp} ${K}`;
    steps.push({ instruction: "Move every term to the left side so the inequality is compared with 0:", reason: "Standard form for an inequality", blanks: [
      { label: "compared with 0", answer: `${polyToLatex([a, b, c])} ${opDisp} 0` },
    ] });
    steps.push({ instruction: "Factor the left side to find the critical values:", reason: "Critical values", blanks: [
      { label: "factored form", answer: factored },
    ] });
  } else {
    ineqStr = `${polyToLatex([a, b, c])} ${opDisp} 0`;
    steps.push({ instruction: `Solve the related equation ${polyToLatex([a, b, c])} = 0 by factoring:`, reason: "Critical values", blanks: [
      { label: "factored form", answer: factored },
    ] });
  }
  steps.push({
    instruction: `The critical values split the number line into three intervals. The parabola opens ${a > 0 ? "up" : "down"}, so the expression is ${a > 0 ? "positive outside the roots and negative between them" : "negative outside the roots and positive between them"}:`,
    reason: "Sign analysis",
    blanks: [{ label: "critical values", answer: `${r1} and ${r2}` }],
  });
  steps.push({
    instruction: `Keep the intervals where the inequality ${opDisp} 0 holds:`,
    reason: "Solution set",
    blanks: [{ label: "solution", answer }],
  });
  const h = (r1 + r2) / 2;
  const kv = a * (h - r1) * (h - r2);
  return {
    type: "A2.5",
    subtype: "QuadInequality",
    given: { inequality: ineqStr },
    find: "solution set",
    answer,
    steps,
    svgParams: parabolaGraph(h, kv, a),
    verify: { a, b, c, r1, r2, op },
  };
}

function makeQuadIneqNoCross(rng: RNG): Algebra2Problem {
  const up = rng() < 0.5;
  const a = up ? 1 : -1;
  const h = randInt(rng, -4, 4);
  const m = randInt(rng, 1, 9);
  const b = -2 * a * h;
  const c = a * h * h + (up ? m : -m);
  const op = pick(rng, INEQ_OPS);
  const opDisp = INEQ_DISPLAY[op];
  const D = b * b - 4 * a * c;
  const truth = (op === ">" || op === ">=") === up;
  const answer = truth ? "all real numbers" : "no solution";
  return {
    type: "A2.5",
    subtype: "QuadIneqNoCross",
    given: { inequality: `${polyToLatex([a, b, c])} ${opDisp} 0` },
    find: "solution set",
    answer,
    steps: [
      { instruction: `Compute the discriminant D = b^2 - 4ac of the related equation ${polyToLatex([a, b, c])} = 0:`, reason: "Discriminant", blanks: [
        { label: "D", answer: `${D}` },
      ] },
      { instruction: `D < 0, so the parabola never crosses the x-axis. It opens ${up ? "up" : "down"} with vertex value ${up ? m : -m}, so the expression keeps one sign:`, reason: "Sign analysis", blanks: [
        { label: "sign", answer: `always ${up ? "positive" : "negative"}` },
      ] },
      { instruction: `Compare with the inequality ${opDisp} 0:`, reason: "Solution set", blanks: [
        { label: "solution", answer },
      ] },
    ],
    svgParams: parabolaGraph(h, up ? m : -m, a),
    verify: { a, b, c, op },
  };
}

// ── 5-12: write a quadratic from three points (2A.4A) ────────────────────────

/** "9a + 3b + c = 20" style display for a linear combination of a, b, c. */
function linComboStr(coefs: [number, string][], rhs: number): string {
  const parts: string[] = [];
  for (const [coef, sym] of coefs) {
    if (coef === 0) continue;
    const body = Math.abs(coef) === 1 && sym !== "" ? sym : `${Math.abs(coef)}${sym}`;
    if (parts.length === 0) parts.push(coef < 0 ? `-${body}` : body);
    else parts.push(coef < 0 ? `- ${body}` : `+ ${body}`);
  }
  return `${parts.join(" ") || "0"} = ${rhs}`;
}

function makeQuadFromThreePoints(rng: RNG, level: 1 | 2 | 3): Algebra2Problem {
  const a = level === 1 ? pick(rng, [-2, -1, 1, 2]) : pick(rng, [-3, -2, -1, 1, 2, 3]);
  const b = randInt(rng, -6, 6);
  const c = randInt(rng, -8, 8);
  let xs: number[];
  if (level === 1) {
    // One point is the y-intercept, so c is read off directly and the
    // remaining two points give a 2x2 system in a and b.
    const x1 = pick(rng, [-3, -2, -1, 1, 2, 3]);
    let x2 = pick(rng, [-3, -2, -1, 1, 2, 3]);
    while (x2 === x1) x2 = pick(rng, [-3, -2, -1, 1, 2, 3]);
    xs = [0, x1, x2];
  } else {
    const pool = level === 2 ? [-3, -2, -1, 0, 1, 2, 3, 4] : [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    xs = [];
    while (xs.length < 3) {
      const x = pick(rng, pool);
      if (!xs.includes(x)) xs.push(x);
    }
    xs.sort((m, n) => m - n);
  }
  const ys = xs.map((x) => a * x * x + b * x + c);
  const ptsStr = xs.map((x, i) => `(${x}, ${ys[i]})`).join(", ");
  const answer = `f(x) = ${polyToLatex([a, b, c])}`;
  const eqs = xs.map((x, i) => linComboStr([[x * x, "a"], [x, "b"], [1, "c"]], ys[i]));
  const steps: ProblemStep[] = [
    {
      instruction: "Substitute each point into f(x) = ax^2 + bx + c to build a system of three equations:",
      reason: "Substitute the points",
      blanks: [{ label: "system", answer: eqs.join("; ") }],
    },
  ];
  if (level === 1) {
    const ab1 = linComboStr([[xs[1] * xs[1], "a"], [xs[1], "b"]], ys[1] - c);
    const ab2 = linComboStr([[xs[2] * xs[2], "a"], [xs[2], "b"]], ys[2] - c);
    steps.push({
      instruction: `The first equation gives c at once, since the point (0, ${c}) is the y-intercept. Substitute c into the other two equations and solve the 2x2 system for a and b:`,
      reason: "y-intercept gives c; solve for a and b",
      blanks: [
        { label: "c", answer: `${c}` },
        { label: "2x2 system", answer: `${ab1}; ${ab2}` },
        { label: "a", answer: `${a}` },
        { label: "b", answer: `${b}` },
      ],
    });
  } else {
    const d21 = linComboStr([[xs[1] * xs[1] - xs[0] * xs[0], "a"], [xs[1] - xs[0], "b"]], ys[1] - ys[0]);
    const d31 = linComboStr([[xs[2] * xs[2] - xs[0] * xs[0], "a"], [xs[2] - xs[0], "b"]], ys[2] - ys[0]);
    steps.push({
      instruction: "Eliminate c by subtracting the first equation from each of the others, then solve the 2x2 system for a and b:",
      reason: "Elimination",
      blanks: [
        { label: "2x2 system", answer: `${d21}; ${d31}` },
        { label: "a", answer: `${a}` },
        { label: "b", answer: `${b}` },
      ],
    });
    steps.push({
      instruction: "Back-substitute a and b into the first equation to find c:",
      reason: "Back-substitution",
      blanks: [{ label: "c", answer: `${c}` }],
    });
  }
  steps.push({
    instruction: "Write the quadratic in standard form:",
    reason: "Standard form",
    blanks: [{ label: "f(x)", answer }],
  });
  return {
    type: "A2.5",
    subtype: "QuadFromThreePoints",
    given: { points: ptsStr },
    find: "the quadratic function f(x) = ax^2 + bx + c through the three points",
    answer,
    steps,
    svgParams: parabolaGraph(-b / (2 * a), c - (b * b) / (4 * a), a),
    verify: { a, b, c, points: [xs[0], ys[0], xs[1], ys[1], xs[2], ys[2]] },
  };
}

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeCompleteSquare },
  { minDifficulty: 1, make: makeVertexFormula },
  { minDifficulty: 1, make: (rng) => makeSolveByRoot(rng, false) },
  { minDifficulty: 2, make: (rng) => makeSolveByRoot(rng, true) },
  { minDifficulty: 2, make: (rng) => makeDiscriminant(rng, false) },
  { minDifficulty: 2, make: makeComplexRoots },
  { minDifficulty: 2, make: (rng) => makeQuadraticFormula(rng, false) },
  {
    minDifficulty: 3,
    // leading coefficient 2 or 3, b a multiple of a → clean arithmetic
    make: (rng) => makeCompleteSquareFixed(rng, pick(rng, [2, 3])),
  },
  { minDifficulty: 3, make: (rng) => makeDiscriminant(rng, true) },
  { minDifficulty: 3, make: (rng) => makeQuadraticFormula(rng, true) },
  // 5-1 attributes & transformations
  { minDifficulty: 1, make: (rng) => makeTransformations(rng, "basic") },
  { minDifficulty: 1, make: makeWriteVertexForm },
  { minDifficulty: 2, make: (rng) => makeTransformations(rng, "full") },
  { minDifficulty: 3, make: (rng) => makeTransformations(rng, "frac") },
  // 5-2 standard form
  { minDifficulty: 1, make: makeStdFormAttributes },
  { minDifficulty: 2, make: (rng) => makeStdFormVertex(rng, false) },
  { minDifficulty: 2, make: (rng) => makeStdFormIntercepts(rng, false) },
  { minDifficulty: 3, make: (rng) => makeStdFormVertex(rng, true) },
  { minDifficulty: 3, make: (rng) => makeStdFormIntercepts(rng, true) },
  // 5-3 modeling
  { minDifficulty: 1, make: (rng) => makeProjectileMax(rng, false) },
  { minDifficulty: 2, make: makeProjectileLand },
  { minDifficulty: 2, make: makeAreaMax },
  { minDifficulty: 3, make: (rng) => makeProjectileMax(rng, true) },
  { minDifficulty: 3, make: makeModelMax },
  // 5-5 factoring
  { minDifficulty: 1, make: makeFactorTrinomial },
  { minDifficulty: 1, make: makeFactorGCF },
  { minDifficulty: 2, make: (rng) => makeFactorDiffSquares(rng, false) },
  { minDifficulty: 2, make: (rng) => makeFactorSolve(rng, false) },
  { minDifficulty: 3, make: (rng) => makeFactorDiffSquares(rng, true) },
  { minDifficulty: 3, make: (rng) => makeFactorSolve(rng, true) },
  // 5-10 inequalities
  { minDifficulty: 1, make: (rng) => makeQuadInequality(rng, "plain") },
  { minDifficulty: 2, make: (rng) => makeQuadInequality(rng, "shift") },
  { minDifficulty: 3, make: (rng) => makeQuadInequality(rng, "scaled") },
  { minDifficulty: 3, make: makeQuadIneqNoCross },
  // 5-12 three points
  { minDifficulty: 1, make: (rng) => makeQuadFromThreePoints(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeQuadFromThreePoints(rng, 2) },
  { minDifficulty: 3, make: (rng) => makeQuadFromThreePoints(rng, 3) },
];

/** Fix makeCompleteSquare for leading != 1: b must be a multiple of a. */
function makeCompleteSquareFixed(rng: RNG, a: number): Algebra2Problem {
  const b = randSigned(rng, 4) * a; // multiple of a → clean (b/a)/2
  const c = randInt(rng, -6, 10);
  const p = makeCompleteSquarePatched(a, b, c);
  return p;
}

function makeCompleteSquarePatched(a: number, b: number, c: number): Algebra2Problem {
  // Exact fractions: h = -b/(2a), kk = (4ac - b^2)/(4a). All integer math.
  const [hNum, hDen] = reduceFrac(-b, 2 * a);
  const [kNum, kDen] = reduceFrac(4 * a * c - b * b, 4 * a);
  const hStr = hDen === 1 ? `${hNum}` : `${hNum}/${hDen}`;
  const hAbs = hDen === 1 ? `${Math.abs(hNum)}` : `${Math.abs(hNum)}/${hDen}`;
  const kAbs = kDen === 1 ? `${Math.abs(kNum)}` : `${Math.abs(kNum)}/${kDen}`;
  const inner = hNum === 0 ? "x" : hNum > 0 ? `(x - ${hStr})` : `(x + ${hAbs})`;
  const vertexForm = `${a}${inner}^2 ${kNum < 0 ? `- ${kAbs}` : `+ ${kAbs}`}`;
  return {
    type: "A2.5",
    subtype: "CompleteSquare",
    given: { equation: stdForm(a, b, c) },
    find: "vertex form",
    answer: `y = ${vertexForm}`,
    steps: [
      {
        instruction: `Factor ${a} out of the x-terms: y = ${a}(x^2 ${b < 0 ? "-" : "+"} ${fracToLatex(Math.abs(b), a)}x) + ${c}`,
        reason: "Factor out leading coefficient",
        blanks: [{ label: "factored", answer: `y = ${a}(x^2 ${b < 0 ? "-" : "+"} ${fracToLatex(Math.abs(b), a)}x) + ${c}` }],
      },
      {
        instruction: `Complete the square inside the parentheses:`,
        reason: "Completing the square",
        blanks: [{ label: "vertex form", answer: `y = ${vertexForm}` }],
      },
    ],
    verify: { a, b, c, hNum, hDen, kNum, kDen },
  };
}

/** Generate n A2.5 (T5 quadratics) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateQuadraticProblems(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  only?: readonly string[]
): Algebra2Problem[] {
  const pool = selectMakers(MAKERS, difficulty, only);
  const out: Algebra2Problem[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60 + 200) {
    const p = pool[Math.floor(rng() * pool.length)].make(rng);
    if (!only || only.includes(p.subtype)) out.push(p);
  }
  return out;
}

export const QUADRATIC_MAKERS = MAKERS;

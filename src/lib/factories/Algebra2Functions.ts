// Algebra2Functions.ts
// A2.2 — Topic 2: Relations & Functions and Absolute Value (TEKS A2.2).
// Relations/functions with domain & range in the notations Algebra II uses
// (listing, inequality, set-builder, interval), the vertical line test,
// function-notation evaluation; absolute value treated as distance and as a
// piecewise function, transformations in the a/h/k register, equations solved
// by isolate-then-split, and inequalities via the less-thAND / greatOR
// patterns. Everything is constructed from chosen parameters so answers are
// exact; tests recompute from `verify` independently.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type {
  Algebra2Problem,
  Algebra2FuncGraphParams,
} from "./Algebra2Types";
import {
  randSigned,
  randNonZero,
  reduceFrac,
  fracToLatex,
  polyToLatex,
  selectMakers,
} from "./Algebra2Helpers";

export type FunctionSubtype =
  | "RelationIsFunction"
  | "FunctionEvaluate"
  | "DomainRangeGraph"
  | "VerticalLineTest"
  | "GraphIntercepts"
  | "GraphIncDec"
  | "GraphExtremum"
  | "AbsTransformations"
  | "AbsAttributes"
  | "AbsWriteEquation"
  | "AbsPiecewise"
  | "AbsIneqGraphDesc"
  | "AbsIneqFromGraph"
  | "AbsIneqPointCheck"
  | "AbsEquation"
  | "AbsEquationLinear"
  | "AbsEquationCheck"
  | "AbsEquationSpecial"
  | "AbsIneqAnd"
  | "AbsIneqOr"
  | "AbsIneqLinear"
  | "AbsIneqSpecial";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

type Rel = "lt" | "le" | "gt" | "ge";
const REL_LATEX: Record<Rel, string> = { lt: "<", le: "\\leq", gt: ">", ge: "\\geq" };
const REL_WORD: Record<Rel, string> = {
  lt: "less than",
  le: "less than or equal to",
  gt: "greater than",
  ge: "greater than or equal to",
};

/** Inside of the bars: "x", "x - 3", "x + 2". */
function absInside(h: number, variable = "x"): string {
  if (h === 0) return variable;
  return h > 0 ? `${variable} - ${h}` : `${variable} + ${-h}`;
}

/** Coefficient in front of the bars: "" for 1, "-" for -1, "3" / "1/2" otherwise. */
function absCoeff(aNum: number, aDen: number): string {
  if (aDen === 1 && aNum === 1) return "";
  if (aDen === 1 && aNum === -1) return "-";
  return fracToLatex(aNum, aDen);
}

/** Body of g(x) = a|x - h| + k (no "g(x) =" prefix). */
function absBody(aNum: number, aDen: number, h: number, k: number): string {
  const tail = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  return `${absCoeff(aNum, aDen)}|${absInside(h)}|${tail}`;
}

/** Linear expression a·x + b as text (a ≠ 0). */
function linText(a: number, b: number, variable = "x"): string {
  return polyToLatex([a, b], variable);
}

/** "{-2, 0, 3}" from a list of numbers (sorted, deduped). */
function setText(vals: number[]): string {
  const u = [...new Set(vals)].sort((x, y) => x - y);
  return `{${u.join(", ")}}`;
}

const BOX = 16;

/** Shaded region polygon for y (above/below) a V-graph, within a ±BOX box. */
function absShade(aNum: number, aDen: number, h: number, k: number, side: "above" | "below") {
  const a = aNum / aDen;
  const V = (x: number) => a * Math.abs(x - h) + k;
  const yEdge = side === "above" ? BOX : -BOX;
  return [
    { x: -BOX, y: yEdge },
    { x: BOX, y: yEdge },
    { x: BOX, y: V(BOX) },
    { x: h, y: k },
    { x: -BOX, y: V(-BOX) },
  ];
}

function absGraphParams(
  aNum: number, aDen: number, h: number, k: number,
  extra?: Partial<Algebra2FuncGraphParams>
): Algebra2FuncGraphParams {
  return { kind: "FuncGraph", absGraphs: [{ h, k, aNum, aDen }], ...extra };
}

// ── 2-1: Relations & functions ────────────────────────────────────────────────

function makeRelationIsFunction(rng: RNG, presentation: "pairs" | "table"): Algebra2Problem {
  const isFn = rng() < 0.55;
  const xsPool = [-3, -2, -1, 0, 1, 2, 3, 4];
  // choose 4 distinct x-values, shuffled
  const xs = [...xsPool].sort(() => rng() - 0.5).slice(0, 4);
  const pairs: [number, number][] = xs.map((x) => [x, randInt(rng, -5, 6)]);
  if (!isFn) {
    // repeat one x with a different y
    const i = randInt(rng, 0, 3);
    let y2 = pairs[i][1];
    while (y2 === pairs[i][1]) y2 = randInt(rng, -5, 6);
    pairs.push([pairs[i][0], y2]);
  }
  const domain = pairs.map((p) => p[0]);
  const range = pairs.map((p) => p[1]);
  const dupX = domain.find((x, i) => domain.indexOf(x) !== i);
  const givenText =
    presentation === "pairs"
      ? pairs.map(([x, y]) => `(${x}, ${y})`).join(", ")
      : `x: ${pairs.map((p) => p[0]).join(", ")}; y: ${pairs.map((p) => p[1]).join(", ")}`;
  const verdict = isFn ? "Function" : "Not a function";
  const answer = `${verdict}; domain ${setText(domain)}; range ${setText(range)}`;
  const steps: ProblemStep[] = [
    {
      instruction: isFn
        ? "Check the x-values: each input appears exactly once, so no input has two different outputs:"
        : `Check the x-values: the input x = ${dupX} appears with two different outputs:`,
      reason: "Definition of a function",
      blanks: [{ label: "verdict", answer: verdict }],
    },
    {
      instruction: "The domain is the set of all x-values (inputs):",
      reason: "Domain of a relation",
      blanks: [{ label: "domain", answer: setText(domain) }],
    },
    {
      instruction: "The range is the set of all y-values (outputs):",
      reason: "Range of a relation",
      blanks: [{ label: "range", answer: setText(range) }],
    },
  ];
  return {
    type: "A2.2",
    subtype: "RelationIsFunction",
    given: { relation: givenText },
    find: "whether the relation is a function, and its domain and range",
    answer,
    steps,
    verify: { pairs: pairs.flat(), isFunction: isFn, domain: [...new Set(domain)].sort((a, b) => a - b), range: [...new Set(range)].sort((a, b) => a - b) },
  };
}

function makeFunctionEvaluate(rng: RNG): Algebra2Problem {
  const mode = pick(rng, ["quad", "abs", "solveForInput"] as const);
  if (mode === "quad") {
    const a = randNonZero(rng, -3, 3);
    const b = randSigned(rng, 5);
    const c = randSigned(rng, 6);
    const t = randSigned(rng, 4);
    const val = a * t * t + b * t + c;
    const expr = polyToLatex([a, b, c]);
    return {
      type: "A2.2",
      subtype: "FunctionEvaluate",
      given: { function: `f(x) = ${expr}` },
      find: `f(${t})`,
      answer: `${val}`,
      steps: [
        {
          instruction: `Function notation f(${t}) means: replace every x with ${t} in f(x) = ${expr}:`,
          reason: "Function notation",
          blanks: [{ label: "substituted", answer: `${a}(${t})^2 + (${b})(${t}) + (${c})`.replace(/\+ -/g, "- ") }],
        },
        {
          instruction: "Simplify using the order of operations:",
          reason: "Order of operations",
          blanks: [{ label: `f(${t})`, answer: `${val}` }],
        },
      ],
      verify: { kind: "evalQuad", a, b, c, t, val },
    };
  }
  if (mode === "abs") {
    const aNum = pick(rng, [-2, -1, 1, 2]);
    const h = randSigned(rng, 4);
    const k = randSigned(rng, 5);
    // evaluate on the side of h opposite to sign variety: t = h ± d
    const d = randInt(rng, 1, 4);
    const t = rng() < 0.5 ? h - d : h + d;
    const val = aNum * Math.abs(t - h) + k;
    const body = absBody(aNum, 1, h, k);
    return {
      type: "A2.2",
      subtype: "FunctionEvaluate",
      given: { function: `f(x) = ${body}` },
      find: `f(${t})`,
      answer: `${val}`,
      steps: [
        {
          instruction: `Replace x with ${t}: f(${t}) = ${absCoeff(aNum, 1)}|${t} - (${h})| ${k === 0 ? "" : k > 0 ? `+ ${k}` : `- ${-k}`}:`,
          reason: "Function notation",
          blanks: [{ label: "inside the bars", answer: `${t - h}` }],
        },
        {
          instruction: `The absolute value is the distance from 0, so |${t - h}| = ${Math.abs(t - h)}; then simplify:`,
          reason: "Absolute value as distance",
          blanks: [{ label: `f(${t})`, answer: `${val}` }],
        },
      ],
      verify: { kind: "evalAbs", aNum, aDen: 1, h, k, t, val },
    };
  }
  // solveForInput: f(x) = a|x - h| + k, find x with f(x) = v (two inputs)
  const aNum = pick(rng, [1, 2, 3]);
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  const r = randInt(rng, 1, 4);
  const v = aNum * r + k;
  const body = absBody(aNum, 1, h, k);
  const lo = h - r, hi = h + r;
  return {
    type: "A2.2",
    subtype: "FunctionEvaluate",
    given: { function: `f(x) = ${body}`, output: `${v}` },
    find: "all inputs x with f(x) = output",
    answer: `x = ${lo} or x = ${hi}`,
    steps: [
      {
        instruction: `Set the expression equal to ${v} and isolate the absolute value: |${absInside(h)}| = ${r}:`,
        reason: "Isolate the absolute value",
        blanks: [{ label: "isolated", answer: `|${absInside(h)}| = ${r}` }],
      },
      {
        instruction: `The points at distance ${r} from ${h} on the number line are ${h} - ${r} and ${h} + ${r}:`,
        reason: "Absolute value as distance",
        blanks: [{ label: "inputs", answer: `x = ${lo} or x = ${hi}` }],
      },
    ],
    verify: { kind: "solveAbsInput", aNum, aDen: 1, h, k, v, lo, hi },
  };
}

function makeDomainRangeGraph(rng: RNG, notation: "inequality" | "interval"): Algebra2Problem {
  const useAbs = rng() < 0.5;
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  let svg: Algebra2FuncGraphParams;
  let aSign: number;
  if (useAbs) {
    const aNum = pick(rng, [-2, -1, 1, 2]);
    aSign = Math.sign(aNum);
    svg = absGraphParams(aNum, 1, h, k);
  } else {
    const a = pick(rng, [-2, -1, 1, 2]);
    aSign = Math.sign(a);
    svg = { kind: "FuncGraph", parabolas: [{ h, k, a }] };
  }
  const up = aSign > 0;
  const rangeIneq = up ? `y \\geq ${k}` : `y \\leq ${k}`;
  const rangeInterval = up ? `[${k}, \\infty)` : `(-\\infty, ${k}]`;
  const rangeSetBuilder = up ? `{y | y \\geq ${k}}` : `{y | y \\leq ${k}}`;
  const rangeAnswer = notation === "inequality" ? rangeIneq : `${rangeInterval} (set-builder: ${rangeSetBuilder})`;
  return {
    type: "A2.2",
    subtype: "DomainRangeGraph",
    given: { function: "f (graphed)" },
    find: "domain and range of the function",
    answer: `Domain: all real numbers; Range: ${rangeAnswer}`,
    steps: [
      {
        instruction: "The graph extends without bound to the left and right, so every x-value is used:",
        reason: "Domain from a graph",
        blanks: [{ label: "domain", answer: "all real numbers" }],
      },
      {
        instruction: `The turning point (vertex) is (${h}, ${k}); the graph ${up ? "never goes below" : "never goes above"} y = ${k}:`,
        reason: "Range from the vertex",
        blanks: [{ label: "range", answer: rangeAnswer }],
      },
    ],
    svgParams: svg,
    verify: { kind: useAbs ? "abs" : "parabola", h, k, up },
  };
}

function makeVerticalLineTest(rng: RNG): Algebra2Problem {
  const isFn = rng() < 0.5;
  const pts: { x: number; y: number }[] = [];
  const usedX = new Set<number>();
  const n = randInt(rng, 4, 5);
  for (let i = 0; i < n; i++) {
    let x = randInt(rng, -4, 4);
    if (isFn) { while (usedX.has(x)) x = randInt(rng, -4, 4); }
    usedX.add(x);
    pts.push({ x, y: randInt(rng, -4, 4) });
  }
  if (!isFn) {
    // force a shared x with a different y
    const base = pts[0];
    let y2 = base.y;
    while (y2 === base.y) y2 = randInt(rng, -4, 4);
    pts.push({ x: base.x, y: y2 });
  }
  const actuallyFn = new Set(pts.map((p) => p.x)).size === pts.length;
  const dupX = pts.find((p, i) => pts.some((q, j) => j !== i && q.x === p.x))?.x;
  return {
    type: "A2.2",
    subtype: "VerticalLineTest",
    given: { graph: "plotted points" },
    find: "whether the graph represents y as a function of x",
    answer: actuallyFn
      ? "Yes — every vertical line crosses the graph at most once"
      : `No — the vertical line x = ${dupX} crosses the graph more than once`,
    steps: [
      {
        instruction: "Imagine sweeping a vertical line across the graph and count intersections:",
        reason: "Vertical line test",
        blanks: [{ label: "max intersections", answer: actuallyFn ? "1" : "2 or more" }],
      },
      {
        instruction: actuallyFn
          ? "No x-value has two different y-values, so the graph passes the test:"
          : `The points with x = ${dupX} share an input but have different outputs, so the graph fails the test:`,
        reason: "Definition of a function",
        blanks: [{ label: "verdict", answer: actuallyFn ? "Function" : "Not a function" }],
      },
    ],
    svgParams: { kind: "FuncGraph", points: pts },
    verify: { points: pts.flatMap((p) => [p.x, p.y]), isFunction: actuallyFn },
  };
}

// ── 2-2: Attributes of functions from graphs ─────────────────────────────────

type GraphKind = "line" | "abs" | "parabola";

function interceptsProblem(rng: RNG): Algebra2Problem {
  const kind = pick(rng, ["line", "abs", "parabola"] as const);
  let svg: Algebra2FuncGraphParams;
  let xInts: number[];
  let yInt: number;
  let desc: string;
  if (kind === "line") {
    const p = randNonZero(rng, -6, 6);
    const q = randNonZero(rng, -6, 6);
    const [mNum, mDen] = reduceFrac(-q, p);
    const [bNum, bDen] = reduceFrac(q, 1);
    svg = { kind: "FuncGraph", lines: [{ mNum, mDen, bNum, bDen }] };
    xInts = [p];
    yInt = q;
    desc = "the line";
  } else if (kind === "abs") {
    const a = pick(rng, [1, 2]);
    const r = pick(rng, [2, 3]);
    const h = randInt(rng, -3, 3);
    const k = -a * r;
    svg = absGraphParams(a, 1, h, k);
    xInts = [h - r, h + r];
    yInt = a * Math.abs(h) + k;
    desc = "the V-graph";
  } else {
    const a = pick(rng, [-1, 1, 2]);
    const r = pick(rng, [1, 2]);
    const h = randInt(rng, -3, 3);
    const k = -a * r * r;
    svg = { kind: "FuncGraph", parabolas: [{ h, k, a }] };
    xInts = [h - r, h + r];
    yInt = a * h * h + k;
    desc = "the parabola";
  }
  const xText = xInts.map((x) => `(${x}, 0)`).join(" and ");
  const answer = `x-intercept${xInts.length > 1 ? "s" : ""} ${xText}; y-intercept (0, ${yInt})`;
  return {
    type: "A2.2",
    subtype: "GraphIntercepts",
    given: { graph: desc },
    find: "x-intercept(s) and y-intercept of the graph",
    answer,
    steps: [
      {
        instruction: "An x-intercept is where the graph crosses the x-axis (where y = 0):",
        reason: "Definition of x-intercept",
        blanks: [{ label: "x-intercepts", answer: xText }],
      },
      {
        instruction: "The y-intercept is where the graph crosses the y-axis (where x = 0):",
        reason: "Definition of y-intercept",
        blanks: [{ label: "y-intercept", answer: `(0, ${yInt})` }],
      },
    ],
    svgParams: svg,
    verify: { kind, xInts, yInt },
  };
}

function makeGraphIncDec(rng: RNG): Algebra2Problem {
  const useAbs = rng() < 0.5;
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  let svg: Algebra2FuncGraphParams;
  let up: boolean;
  if (useAbs) {
    const aNum = pick(rng, [-2, -1, 1, 2]);
    up = aNum > 0;
    svg = absGraphParams(aNum, 1, h, k);
  } else {
    const a = pick(rng, [-2, -1, 1, 2]);
    up = a > 0;
    svg = { kind: "FuncGraph", parabolas: [{ h, k, a }] };
  }
  const dec = up ? `(-\\infty, ${h})` : `(${h}, \\infty)`;
  const inc = up ? `(${h}, \\infty)` : `(-\\infty, ${h})`;
  const answer = `Decreasing on ${dec}; increasing on ${inc}`;
  return {
    type: "A2.2",
    subtype: "GraphIncDec",
    given: { function: "f (graphed)" },
    find: "intervals where the function is increasing and where it is decreasing",
    answer,
    steps: [
      {
        instruction: `Read the graph left to right. The turning point is at x = ${h}, which splits the graph into two pieces:`,
        reason: "Vertex splits the behavior",
        blanks: [{ label: "turning point x", answer: `${h}` }],
      },
      {
        instruction: up
          ? `To the left of the vertex the graph falls; to the right it rises:`
          : `To the left of the vertex the graph rises; to the right it falls:`,
        reason: "Increasing/decreasing from a graph",
        blanks: [
          { label: "decreasing", answer: dec },
          { label: "increasing", answer: inc },
        ],
      },
    ],
    svgParams: svg,
    verify: { h, k, up },
  };
}

function makeGraphExtremum(rng: RNG): Algebra2Problem {
  const useAbs = rng() < 0.5;
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 6);
  let svg: Algebra2FuncGraphParams;
  let up: boolean;
  if (useAbs) {
    const aNum = pick(rng, [-2, -1, 1, 2]);
    up = aNum > 0;
    svg = absGraphParams(aNum, 1, h, k);
  } else {
    const a = pick(rng, [-2, -1, 1, 2]);
    up = a > 0;
    svg = { kind: "FuncGraph", parabolas: [{ h, k, a }] };
  }
  const word = up ? "minimum" : "maximum";
  const answer = `${word === "minimum" ? "Minimum" : "Maximum"} value ${k} at x = ${h}`;
  return {
    type: "A2.2",
    subtype: "GraphExtremum",
    given: { function: "f (graphed)" },
    find: `the ${word} value of the function and where it occurs`,
    answer,
    steps: [
      {
        instruction: `The vertex of the graph is the point (${h}, ${k}):`,
        reason: "Vertex of the graph",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: up
          ? "The graph opens upward, so the vertex is the lowest point — its y-value is the minimum:"
          : "The graph opens downward, so the vertex is the highest point — its y-value is the maximum:",
        reason: "Extreme value at the vertex",
        blanks: [{ label: `${word} value`, answer: `${k} at x = ${h}` }],
      },
    ],
    svgParams: svg,
    verify: { h, k, up },
  };
}

// ── 2-3: Absolute value transformations ──────────────────────────────────────

function transformationPartsAbs(aNum: number, aDen: number, h: number, k: number): string[] {
  const parts: string[] = [];
  if (aNum < 0) parts.push("reflect over the x-axis");
  const absA = Math.abs(aNum) / aDen;
  if (absA > 1) parts.push(`vertical stretch by ${fracToLatex(Math.abs(aNum), aDen)}`);
  else if (absA < 1) parts.push(`vertical shrink by ${fracToLatex(Math.abs(aNum), aDen)}`);
  if (h > 0) parts.push(`shift right ${h}`);
  else if (h < 0) parts.push(`shift left ${-h}`);
  if (k > 0) parts.push(`shift up ${k}`);
  else if (k < 0) parts.push(`shift down ${-k}`);
  if (parts.length === 0) parts.push("no transformation (parent function)");
  return parts;
}

function makeAbsTransformations(rng: RNG, tier: "basic" | "frac"): Algebra2Problem {
  let aNum: number, aDen = 1;
  let h: number, k: number;
  if (tier === "frac") {
    const [n, d] = pick(rng, [[1, 2], [-1, 2], [1, 3], [-1, 3], [2, 3], [-2, 3], [3, 2], [-3, 2]] as const);
    aNum = n; aDen = d;
    h = randSigned(rng, 4);
    k = randSigned(rng, 5);
  } else {
    aNum = pick(rng, [-2, -1, 1, 2]);
    h = randSigned(rng, 3);
    k = randSigned(rng, 4);
  }
  const body = absBody(aNum, aDen, h, k);
  const parts = transformationPartsAbs(aNum, aDen, h, k);
  const absA = Math.abs(aNum) / aDen;
  const widthPhrase = absA > 1
    ? `vertical stretch by ${fracToLatex(Math.abs(aNum), aDen)}`
    : absA < 1
      ? `vertical shrink by ${fracToLatex(Math.abs(aNum), aDen)}`
      : "same steepness as the parent";
  const answer = `${parts.join("; ")}; vertex (${h}, ${k})`;
  return {
    type: "A2.2",
    subtype: "AbsTransformations",
    given: { function: `g(x) = ${body}`, parent: "f(x) = |x|" },
    find: "transformations from the parent function, and the vertex",
    answer,
    steps: [
      {
        instruction: `In the form g(x) = a|x - h| + k, read off a, h, and k from g(x) = ${body}:`,
        reason: "Vertex form of an absolute value function",
        blanks: [
          { label: "a", answer: fracToLatex(aNum, aDen) },
          { label: "h", answer: `${h}` },
          { label: "k", answer: `${k}` },
        ],
      },
      {
        instruction: "The vertex of the V is (h, k):",
        reason: "Vertex from h and k",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: absA === 1
          ? "|a| = 1, so the arms keep the parent's steepness (slope ±1):"
          : `|a| = ${fracToLatex(Math.abs(aNum), aDen)} ${absA > 1 ? "> 1, so the arms are steeper" : "< 1, so the arms are flatter"}:`,
        reason: "Effect of |a| on the arms",
        blanks: [{ label: "width", answer: widthPhrase }],
      },
      {
        instruction: aNum < 0
          ? `a = ${fracToLatex(aNum, aDen)} < 0, so the V is reflected over the x-axis and opens downward:`
          : `a = ${fracToLatex(aNum, aDen)} > 0, so the V opens upward:`,
        reason: "Sign of a gives direction",
        blanks: [{ label: "direction", answer: aNum < 0 ? "reflect over x-axis; opens down" : "opens up" }],
      },
      {
        instruction: `h = ${h} and k = ${k} move the vertex from the origin:`,
        reason: "Shifts from h and k",
        blanks: [{ label: "shifts", answer: parts.filter((p) => p.startsWith("shift")).join("; ") || "no shifts" }],
      },
    ],
    svgParams: absGraphParams(aNum, aDen, h, k),
    verify: { aNum, aDen, h, k },
  };
}

function makeAbsAttributes(rng: RNG): Algebra2Problem {
  const aNum = pick(rng, [-3, -2, -1, 1, 2, 3]);
  const h = randSigned(rng, 5);
  const k = randSigned(rng, 6);
  const body = absBody(aNum, 1, h, k);
  const up = aNum > 0;
  const range = up ? `y \\geq ${k}` : `y \\leq ${k}`;
  const answer = `vertex (${h}, ${k}); axis of symmetry x = ${h}; opens ${up ? "up" : "down"}; domain: all real numbers; range: ${range}`;
  return {
    type: "A2.2",
    subtype: "AbsAttributes",
    given: { function: `g(x) = ${body}` },
    find: "vertex, axis of symmetry, opening direction, domain, and range",
    answer,
    steps: [
      {
        instruction: `Read h and k from g(x) = a|x - h| + k form to locate the vertex:`,
        reason: "Vertex form",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: "The axis of symmetry is the vertical line through the vertex:",
        reason: "Axis of symmetry",
        blanks: [{ label: "axis", answer: `x = ${h}` }],
      },
      {
        instruction: `a = ${aNum} is ${up ? "positive, so the V opens up and the vertex is the lowest point" : "negative, so the V opens down and the vertex is the highest point"}:`,
        reason: "Sign of a",
        blanks: [{ label: "range", answer: range }],
      },
      {
        instruction: "The arms extend without bound left and right, so x takes every real value:",
        reason: "Domain of an absolute value function",
        blanks: [{ label: "domain", answer: "all real numbers" }],
      },
    ],
    svgParams: absGraphParams(aNum, 1, h, k),
    verify: { aNum, aDen: 1, h, k, up },
  };
}

function makeAbsWriteEquation(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  const d = randInt(rng, 1, 3); // horizontal distance from vertex to the point
  const px = rng() < 0.5 ? h - d : h + d;
  // choose a as an integer or simple fraction: rise = a * d
  const fracChoice = pick(rng, [[1, 1], [2, 1], [3, 1], [-1, 1], [-2, 1], [1, 2], [-1, 2], [3, 2]] as const);
  const aNum = fracChoice[0];
  const aDen = fracChoice[1];
  const py = k + (aNum * d) / aDen; // aNum*d may not divide by aDen for [3,2], d even only
  const pyInt = Number.isInteger(py) ? py : k + aNum * d; // fallback: treat a as integer aNum
  const effANum = aNum;
  const effADen = Number.isInteger(py) ? aDen : 1;
  const body = absBody(effANum, effADen, h, k);
  const answer = `g(x) = ${body}`;
  return {
    type: "A2.2",
    subtype: "AbsWriteEquation",
    given: { vertex: `(${h}, ${k})`, point: `(${px}, ${pyInt})` },
    find: "equation of the absolute value function in vertex form",
    answer,
    steps: [
      {
        instruction: `Start with vertex form g(x) = a|x - h| + k and substitute the vertex (${h}, ${k}):`,
        reason: "Vertex form",
        blanks: [{ label: "template", answer: `g(x) = a|${absInside(h)}| ${k === 0 ? "" : k > 0 ? `+ ${k}` : `- ${-k}`}`.trim() }],
      },
      {
        instruction: `Substitute the point (${px}, ${pyInt}) and solve for a: a = (${pyInt} - (${k})) / |${px} - (${h})|:`,
        reason: "Solve for a",
        blanks: [{ label: "a", answer: fracToLatex(effANum, effADen) }],
      },
      {
        instruction: "Write the completed equation:",
        reason: "Vertex form",
        blanks: [{ label: "equation", answer }],
      },
    ],
    svgParams: { kind: "FuncGraph", points: [{ x: h, y: k }, { x: px, y: pyInt }] },
    verify: { aNum: effANum, aDen: effADen, h, k, px, py: pyInt },
  };
}

function makeAbsPiecewise(rng: RNG): Algebra2Problem {
  const aNum = pick(rng, [-2, -1, 1, 2, 3]);
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  const body = absBody(aNum, 1, h, k);
  // right branch (x ≥ h): a(x - h) + k = a·x + (k - a·h); left branch: -(a·x) + (k + a·h)... careful: -a(x-h)+k = -a·x + a·h + k
  const right = polyToLatex([aNum, k - aNum * h]);
  const left = polyToLatex([-aNum, k + aNum * h]);
  const answer = `g(x) = ${left} if x < ${h}; g(x) = ${right} if x \\geq ${h}`;
  return {
    type: "A2.2",
    subtype: "AbsPiecewise",
    given: { function: `g(x) = ${body}` },
    find: "piecewise definition of g (one linear piece on each side of the vertex)",
    answer,
    steps: [
      {
        instruction: `By definition, |u| = u when u \\geq 0 and |u| = -u when u < 0. Here u = ${absInside(h)}, which changes sign at x = ${h}:`,
        reason: "Piecewise definition of absolute value",
        blanks: [{ label: "breakpoint", answer: `x = ${h}` }],
      },
      {
        instruction: `For x \\geq ${h}, the bars come off unchanged: g(x) = ${aNum}(${absInside(h)}) ${k === 0 ? "" : k > 0 ? `+ ${k}` : `- ${-k}`}, which simplifies to:`,
        reason: "Right piece (u ≥ 0)",
        blanks: [{ label: "right piece", answer: right }],
      },
      {
        instruction: `For x < ${h}, the bars negate the inside: g(x) = ${absCoeff(-aNum, 1)}(${absInside(h)}) ${k === 0 ? "" : k > 0 ? `+ ${k}` : `- ${-k}`}, which simplifies to:`,
        reason: "Left piece (u < 0)",
        blanks: [{ label: "left piece", answer: left }],
      },
    ],
    svgParams: absGraphParams(aNum, 1, h, k),
    verify: { aNum, aDen: 1, h, k, rightCoeffs: [aNum, k - aNum * h], leftCoeffs: [-aNum, k + aNum * h] },
  };
}

// ── 2-4: Graphing absolute value inequalities ────────────────────────────────

function makeAbsIneqGraphDesc(rng: RNG): Algebra2Problem {
  const aNum = pick(rng, [-2, -1, 1, 2]);
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  const rel = pick(rng, ["lt", "le", "gt", "ge"] as const);
  const body = absBody(aNum, 1, h, k);
  const ineq = `y ${REL_LATEX[rel]} ${body}`;
  const strict = rel === "lt" || rel === "gt";
  const above = rel === "gt" || rel === "ge";
  // test point on the vertex's vertical line, one unit above the vertex
  const testY = k + 1;
  const testTrue = above; // (h, k+1): is k+1 above-relation to f(h)=k? above-rels true, below-rels false
  const answer = `vertex (${h}, ${k}); ${strict ? "dashed" : "solid"} boundary; shade ${above ? "above" : "below"} the V`;
  return {
    type: "A2.2",
    subtype: "AbsIneqGraphDesc",
    given: { inequality: ineq },
    find: "how to graph the inequality: vertex, boundary type, and shading side",
    answer,
    steps: [
      {
        instruction: `Graph the boundary V from its vertex form; the vertex is (${h}, ${k}):`,
        reason: "Vertex form",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: strict
          ? `The symbol ${REL_LATEX[rel]} is strict (no "or equal to"), so points on the V itself are NOT solutions — draw the boundary dashed:`
          : `The symbol ${REL_LATEX[rel]} includes "or equal to", so points on the V itself ARE solutions — draw the boundary solid:`,
        reason: strict ? "Strict inequality: dashed boundary" : "Inclusive inequality: solid boundary",
        blanks: [{ label: "boundary", answer: strict ? "dashed" : "solid" }],
      },
      {
        instruction: `Test the point (${h}, ${testY}), which sits just above the vertex: substituting gives ${testY} ${REL_LATEX[rel]} ${k}, which is ${testTrue}:`,
        reason: "Test point method",
        blanks: [{ label: "test result", answer: testTrue ? "true — shade the side containing the point (above)" : "false — shade the opposite side (below)" }],
      },
    ],
    verify: { aNum, aDen: 1, h, k, rel, strict, above },
  };
}

function makeAbsIneqFromGraph(rng: RNG): Algebra2Problem {
  const choices = [[1, 1], [2, 1], [-1, 1], [-2, 1], [1, 2], [-1, 2]] as const;
  const [aNum, aDen] = pick(rng, choices);
  const h = randSigned(rng, 3);
  const k = randSigned(rng, 4);
  const rel = pick(rng, ["lt", "le", "gt", "ge"] as const);
  const strict = rel === "lt" || rel === "gt";
  const above = rel === "gt" || rel === "ge";
  const body = absBody(aNum, aDen, h, k);
  const answer = `y ${REL_LATEX[rel]} ${body}`;
  const svg: Algebra2FuncGraphParams = {
    kind: "FuncGraph",
    absGraphs: [{ h, k, aNum, aDen, dashed: strict }],
    shade: [absShade(aNum, aDen, h, k, above ? "above" : "below")],
  };
  return {
    type: "A2.2",
    subtype: "AbsIneqFromGraph",
    given: { graph: "shaded absolute value inequality" },
    find: "the inequality represented by the graph",
    answer,
    steps: [
      {
        instruction: `Locate the vertex of the V in the graph:`,
        reason: "Vertex form",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: `From the vertex, the right arm rises ${aNum} for every ${aDen} it runs (sign included), giving a = ${fracToLatex(aNum, aDen)}:`,
        reason: "Slope of the arms",
        blanks: [{ label: "a", answer: fracToLatex(aNum, aDen) }],
      },
      {
        instruction: `The boundary is ${strict ? "dashed, so the inequality is strict" : "solid, so the inequality includes equality"}, and the shading is ${above ? "above" : "below"} the V, so y is ${REL_WORD[rel]} the expression:`,
        reason: "Boundary and shading give the symbol",
        blanks: [{ label: "inequality", answer }],
      },
    ],
    svgParams: svg,
    verify: { aNum, aDen, h, k, rel, strict, above },
  };
}

function makeAbsIneqPointCheck(rng: RNG): Algebra2Problem {
  const aNum = pick(rng, [-2, -1, 1, 2]);
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 5);
  const rel = pick(rng, ["lt", "le", "gt", "ge"] as const);
  const px = h + randInt(rng, -3, 3);
  const fpx = aNum * Math.abs(px - h) + k;
  // candidate point: on, above, or below the boundary
  const delta = pick(rng, [-2, -1, 0, 1, 2]);
  const py = fpx + delta;
  const truth = rel === "lt" ? py < fpx : rel === "le" ? py <= fpx : rel === "gt" ? py > fpx : py >= fpx;
  const body = absBody(aNum, 1, h, k);
  const ineq = `y ${REL_LATEX[rel]} ${body}`;
  return {
    type: "A2.2",
    subtype: "AbsIneqPointCheck",
    given: { inequality: ineq, point: `(${px}, ${py})` },
    find: "whether the point is a solution of the inequality",
    answer: truth ? `Yes — (${px}, ${py}) satisfies the inequality` : `No — (${px}, ${py}) does not satisfy the inequality`,
    steps: [
      {
        instruction: `Substitute x = ${px} into the boundary expression: ${absCoeff(aNum, 1)}|${px} - (${h})| ${k === 0 ? "" : k > 0 ? `+ ${k}` : `- ${-k}`} = ${fpx}:`,
        reason: "Substitution",
        blanks: [{ label: "boundary value", answer: `${fpx}` }],
      },
      {
        instruction: `Compare the point's y-value with the boundary value: ${py} ${REL_LATEX[rel]} ${fpx} is ${truth}:`,
        reason: "Inequality check",
        blanks: [{ label: "is a solution?", answer: truth ? "yes" : "no" }],
      },
    ],
    svgParams: {
      kind: "FuncGraph",
      absGraphs: [{ h, k, aNum, aDen: 1 }],
      points: [{ x: px, y: py }],
    },
    verify: { aNum, aDen: 1, h, k, rel, px, py, truth },
  };
}

// ── 2-5: Absolute value equations ────────────────────────────────────────────

function makeAbsEquation(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 6);
  const c = randInt(rng, 1, 9);
  const lo = h - c, hi = h + c;
  const answer = `x = ${lo} or x = ${hi}`;
  return {
    type: "A2.2",
    subtype: "AbsEquation",
    given: { equation: `|${absInside(h)}| = ${c}` },
    find: "all solutions",
    answer,
    steps: [
      {
        instruction: `|${absInside(h)}| measures the distance from x to ${h} on the number line. The equation says that distance is exactly ${c}:`,
        reason: "Absolute value as distance",
        blanks: [{ label: "distance", answer: `${c}` }],
      },
      {
        instruction: `The numbers at distance ${c} from ${h} are ${h} - ${c} and ${h} + ${c}:`,
        reason: "Distance on both sides",
        blanks: [{ label: "solutions", answer }],
      },
    ],
    verify: { h, c, lo, hi },
  };
}

function makeAbsEquationLinear(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3, 4]);
  const b = randSigned(rng, 8);
  const c = randInt(rng, 1, 9);
  const inside = linText(a, b);
  const [n1, d1] = reduceFrac(-b + c, a);
  const [n2, d2] = reduceFrac(-b - c, a);
  const s1 = fracToLatex(n1, d1);
  const s2 = fracToLatex(n2, d2);
  const answer = `x = ${s2} or x = ${s1}`;
  return {
    type: "A2.2",
    subtype: "AbsEquationLinear",
    given: { equation: `|${inside}| = ${c}` },
    find: "all solutions",
    answer,
    steps: [
      {
        instruction: "The absolute value is already isolated. The inside expression must equal the positive value or its opposite:",
        reason: "Isolate, then split into two cases",
        blanks: [{ label: "two cases", answer: `${inside} = ${c} or ${inside} = ${-c}` }],
      },
      {
        instruction: `Solve the first case: ${inside} = ${c}:`,
        reason: "Solve each case",
        blanks: [{ label: "case 1", answer: `x = ${s1}` }],
      },
      {
        instruction: `Solve the second case: ${inside} = ${-c}:`,
        reason: "Solve each case",
        blanks: [{ label: "case 2", answer: `x = ${s2}` }],
      },
    ],
    verify: { a, b, c, sols: [n1, d1, n2, d2] },
  };
}

function makeAbsEquationSpecial(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3, 4]);
  const b = randSigned(rng, 8);
  const inside = linText(a, b);
  const negative = rng() < 0.5;
  if (negative) {
    const c = randInt(rng, 1, 9);
    return {
      type: "A2.2",
      subtype: "AbsEquationSpecial",
      given: { equation: `|${inside}| = ${-c}` },
      find: "all solutions",
      answer: "No solution",
      steps: [
        {
          instruction: `An absolute value is a distance, so |${inside}| is always greater than or equal to 0 — it can never equal ${-c}:`,
          reason: "Absolute value is never negative",
          blanks: [{ label: "solutions", answer: "no solution" }],
        },
      ],
      verify: { kind: "negativeRhs", a, b, rhs: -c },
    };
  }
  const [n, d] = reduceFrac(-b, a);
  const sol = fracToLatex(n, d);
  return {
    type: "A2.2",
    subtype: "AbsEquationSpecial",
    given: { equation: `|${inside}| = 0` },
    find: "all solutions",
    answer: `x = ${sol}`,
    steps: [
      {
        instruction: "An absolute value equals 0 only when the inside expression itself is 0:",
        reason: "Zero case of absolute value",
        blanks: [{ label: "inside equation", answer: `${inside} = 0` }],
      },
      {
        instruction: "Solve the resulting linear equation:",
        reason: "Solve each case",
        blanks: [{ label: "solution", answer: `x = ${sol}` }],
      },
    ],
    verify: { kind: "zeroRhs", a, b, solNum: n, solDen: d },
  };
}

function makeAbsEquationCheck(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3]);
  const b = randSigned(rng, 6);
  const x1 = randSigned(rng, 4);
  const v = a * x1 + b;
  let c = pick(rng, [1, 2]);
  if (c === a) c = 1;
  const d = Math.abs(v) - c * x1;
  const inside = linText(a, b);
  const rhs = linText(c, d);
  // candidates from the two cases, as reduced fractions [n, dd]
  const cand: [number, number][] = [];
  cand.push(reduceFrac(d - b, a - c));
  cand.push(reduceFrac(-d - b, a + c));
  const uniq = cand.filter((cd, i) => cand.findIndex((o) => o[0] === cd[0] && o[1] === cd[1]) === i);
  const valid = uniq.filter(([xn, xd]) => {
    const lhsNum = Math.abs(a * xn + b * xd);
    const rhsNum = c * xn + d * xd;
    return rhsNum >= 0 && lhsNum === rhsNum;
  });
  const candText = uniq.map(([n, dd]) => `x = ${fracToLatex(n, dd)}`);
  const answer = valid.map(([n, dd]) => `x = ${fracToLatex(n, dd)}`).join(" or ");
  return {
    type: "A2.2",
    subtype: "AbsEquationCheck",
    given: { equation: `|${inside}| = ${rhs}` },
    find: "all solutions (check each candidate in the original equation)",
    answer: answer || "No solution",
    steps: [
      {
        instruction: `Split into two cases: the inside equals the right side, or the inside equals its opposite:`,
        reason: "Isolate, then split into two cases",
        blanks: [{ label: "two cases", answer: `${inside} = ${rhs} or ${inside} = -(${rhs})` }],
      },
      {
        instruction: "Solve each case for x:",
        reason: "Solve each case",
        blanks: [{ label: "candidates", answer: candText.join(" and ") }],
      },
      {
        instruction: valid.length < uniq.length
          ? `Check each candidate in |${inside}| = ${rhs}: a candidate fails when the right side is negative there, since an absolute value cannot equal a negative number. Only ${answer} survives:`
          : `Check each candidate in |${inside}| = ${rhs}: both make the right side nonnegative and satisfy the equation:`,
        reason: "Check for extraneous solutions",
        blanks: [{ label: "solutions", answer: answer || "no solution" }],
      },
    ],
    verify: { a, b, c, d, candidates: uniq.flat(), valid: valid.flat() },
  };
}

// ── 2-6: Absolute value inequalities ─────────────────────────────────────────

function makeAbsIneqAnd(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 6);
  const c = randInt(rng, 1, 9);
  const rel = pick(rng, ["lt", "le"] as const);
  const lo = h - c, hi = h + c;
  const compound = `${lo} ${REL_LATEX[rel]} x ${REL_LATEX[rel]} ${hi}`;
  const interval = rel === "le" ? `[${lo}, ${hi}]` : `(${lo}, ${hi})`;
  const answer = `${compound}; interval: ${interval}`;
  return {
    type: "A2.2",
    subtype: "AbsIneqAnd",
    given: { inequality: `|${absInside(h)}| ${REL_LATEX[rel]} ${c}` },
    find: "solution set (compound inequality and interval notation)",
    answer,
    steps: [
      {
        instruction: `|${absInside(h)}| is the distance from x to ${h}. The inequality says that distance is ${REL_WORD[rel]} ${c}:`,
        reason: "Absolute value as distance",
        blanks: [{ label: "distance condition", answer: `distance ${REL_LATEX[rel]} ${c}` }],
      },
      {
        instruction: `A distance can be small in EITHER direction, so this becomes an AND statement: -${c} ${REL_LATEX[rel]} ${absInside(h)} ${REL_LATEX[rel]} ${c}:`,
        reason: "Less-thAND pattern",
        blanks: [{ label: "compound form", answer: `-${c} ${REL_LATEX[rel]} ${absInside(h)} ${REL_LATEX[rel]} ${c}` }],
      },
      {
        instruction: `Add ${h} to all three parts:`,
        reason: "Solve the compound inequality",
        blanks: [{ label: "solution", answer: compound }],
      },
    ],
    verify: { h, c, rel, lo, hi },
  };
}

function makeAbsIneqOr(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 6);
  const c = randInt(rng, 1, 9);
  const rel = pick(rng, ["gt", "ge"] as const);
  const loRel: Rel = rel === "gt" ? "lt" : "le";
  const lo = h - c, hi = h + c;
  const orText = `x ${REL_LATEX[loRel]} ${lo} or x ${REL_LATEX[rel]} ${hi}`;
  const interval = rel === "ge"
    ? `(-\\infty, ${lo}] or [${hi}, \\infty)`
    : `(-\\infty, ${lo}) or (${hi}, \\infty)`;
  const answer = `${orText}; interval: ${interval}`;
  return {
    type: "A2.2",
    subtype: "AbsIneqOr",
    given: { inequality: `|${absInside(h)}| ${REL_LATEX[rel]} ${c}` },
    find: "solution set (inequality and interval notation)",
    answer,
    steps: [
      {
        instruction: `|${absInside(h)}| is the distance from x to ${h}. The inequality says that distance is ${REL_WORD[rel]} ${c} — far away in either direction:`,
        reason: "Absolute value as distance",
        blanks: [{ label: "distance condition", answer: `distance ${REL_LATEX[rel]} ${c}` }],
      },
      {
        instruction: `Points far from ${h} lie on two separate rays, so this becomes an OR statement: ${absInside(h)} ${REL_LATEX[loRel]} -${c} or ${absInside(h)} ${REL_LATEX[rel]} ${c}:`,
        reason: "GreatOR pattern",
        blanks: [{ label: "or form", answer: `${absInside(h)} ${REL_LATEX[loRel]} -${c} or ${absInside(h)} ${REL_LATEX[rel]} ${c}` }],
      },
      {
        instruction: `Add ${h} in each part:`,
        reason: "Solve each part",
        blanks: [{ label: "solution", answer: orText }],
      },
    ],
    verify: { h, c, rel, lo, hi },
  };
}

function makeAbsIneqLinear(rng: RNG, negativeInside: boolean): Algebra2Problem {
  const a = pick(rng, [2, 3]);
  const bRaw = randSigned(rng, 8);
  const c = randInt(rng, 1, 10);
  const rel = pick(rng, ["lt", "le", "gt", "ge"] as const);
  const insideShown = negativeInside ? linText(-a, bRaw) : linText(a, bRaw);
  // |−a·x + b| = |a·x − b|: work with b = −bRaw after the rewrite
  const b = negativeInside ? -bRaw : bRaw;
  const insideWork = linText(a, b);
  const isAnd = rel === "lt" || rel === "le";
  const [loN, loD] = reduceFrac(-c - b, a);
  const [hiN, hiD] = reduceFrac(c - b, a);
  const loF = fracToLatex(loN, loD);
  const hiF = fracToLatex(hiN, hiD);
  const loRel: Rel = rel === "gt" ? "lt" : rel === "ge" ? "le" : rel;
  const solText = isAnd
    ? `${loF} ${REL_LATEX[rel]} x ${REL_LATEX[rel]} ${hiF}`
    : `x ${REL_LATEX[loRel]} ${loF} or x ${REL_LATEX[rel]} ${hiF}`;
  const steps: ProblemStep[] = [];
  if (negativeInside) {
    steps.push({
      instruction: `Opposites have the same absolute value, so |${insideShown}| = |${insideWork}| — rewrite with a positive leading coefficient:`,
      reason: "|−u| = |u|",
      blanks: [{ label: "rewritten", answer: `|${insideWork}| ${REL_LATEX[rel]} ${c}` }],
    });
  }
  steps.push({
    instruction: isAnd
      ? `Apply the less-thAND pattern: -${c} ${REL_LATEX[rel]} ${insideWork} ${REL_LATEX[rel]} ${c}:`
      : `Apply the greatOR pattern: ${insideWork} ${REL_LATEX[loRel]} -${c} or ${insideWork} ${REL_LATEX[rel]} ${c}:`,
    reason: isAnd ? "Less-thAND pattern" : "GreatOR pattern",
    blanks: [{ label: "pattern form", answer: isAnd ? `-${c} ${REL_LATEX[rel]} ${insideWork} ${REL_LATEX[rel]} ${c}` : `${insideWork} ${REL_LATEX[loRel]} -${c} or ${insideWork} ${REL_LATEX[rel]} ${c}` }],
  });
  steps.push({
    instruction: `Solve for x. Dividing by ${a} (positive) does not change the direction of the inequality:`,
    reason: "Solve the compound inequality",
    blanks: [{ label: "solution", answer: solText }],
  });
  return {
    type: "A2.2",
    subtype: "AbsIneqLinear",
    given: { inequality: `|${insideShown}| ${REL_LATEX[rel]} ${c}` },
    find: "solution set",
    answer: solText,
    steps,
    verify: { a, b, c, rel, lo: [loN, loD], hi: [hiN, hiD], isAnd },
  };
}

function makeAbsIneqSpecial(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3]);
  const b = randSigned(rng, 8);
  const inside = linText(a, b);
  const variant = pick(rng, ["gtNeg", "ltNeg", "gtZero"] as const);
  if (variant === "gtNeg") {
    const c = randInt(rng, 1, 9);
    return {
      type: "A2.2",
      subtype: "AbsIneqSpecial",
      given: { inequality: `|${inside}| > ${-c}` },
      find: "solution set",
      answer: "All real numbers",
      steps: [
        {
          instruction: `An absolute value is always \\geq 0, and 0 is already greater than ${-c} — so the inequality holds for every x:`,
          reason: "Range of absolute value is [0, ∞)",
          blanks: [{ label: "solution set", answer: "all real numbers" }],
        },
      ],
      verify: { kind: "gtNeg", a, b, c },
    };
  }
  if (variant === "ltNeg") {
    const c = randInt(rng, 1, 9);
    return {
      type: "A2.2",
      subtype: "AbsIneqSpecial",
      given: { inequality: `|${inside}| < ${-c}` },
      find: "solution set",
      answer: "No solution",
      steps: [
        {
          instruction: `An absolute value is always \\geq 0, so it can never be less than the negative number ${-c}:`,
          reason: "Range of absolute value is [0, ∞)",
          blanks: [{ label: "solution set", answer: "no solution" }],
        },
      ],
      verify: { kind: "ltNeg", a, b, c },
    };
  }
  const [n, d] = reduceFrac(-b, a);
  const except = fracToLatex(n, d);
  return {
    type: "A2.2",
    subtype: "AbsIneqSpecial",
    given: { inequality: `|${inside}| > 0` },
    find: "solution set",
    answer: `All real numbers except x = ${except}`,
    steps: [
      {
        instruction: `An absolute value is \\geq 0 always; it equals 0 only when the inside is 0. Solve ${inside} = 0 to find the single excluded value:`,
        reason: "Range of absolute value is [0, ∞)",
        blanks: [{ label: "excluded value", answer: `x = ${except}` }],
      },
      {
        instruction: "Every other x makes the inside nonzero, so its absolute value is positive:",
        reason: "All other values work",
        blanks: [{ label: "solution set", answer: `all real numbers except x = ${except}` }],
      },
    ],
    verify: { kind: "gtZero", a, b, exceptNum: n, exceptDen: d },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeRelationIsFunction(rng, "pairs") },
  { minDifficulty: 1, make: (rng) => makeAbsTransformations(rng, "basic") },
  { minDifficulty: 1, make: interceptsProblem },
  { minDifficulty: 1, make: makeAbsIneqGraphDesc },
  { minDifficulty: 1, make: makeAbsEquation },
  { minDifficulty: 1, make: makeAbsIneqAnd },
  { minDifficulty: 1, make: makeAbsIneqOr },
  { minDifficulty: 2, make: (rng) => makeRelationIsFunction(rng, "table") },
  { minDifficulty: 2, make: makeFunctionEvaluate },
  { minDifficulty: 2, make: (rng) => makeDomainRangeGraph(rng, "inequality") },
  { minDifficulty: 2, make: makeGraphIncDec },
  { minDifficulty: 2, make: makeAbsAttributes },
  { minDifficulty: 2, make: makeAbsPiecewise },
  { minDifficulty: 2, make: makeAbsIneqFromGraph },
  { minDifficulty: 2, make: makeAbsEquationLinear },
  { minDifficulty: 2, make: makeAbsEquationSpecial },
  { minDifficulty: 2, make: (rng) => makeAbsIneqLinear(rng, false) },
  { minDifficulty: 3, make: makeFunctionEvaluate },
  { minDifficulty: 3, make: (rng) => makeDomainRangeGraph(rng, "interval") },
  { minDifficulty: 3, make: makeVerticalLineTest },
  { minDifficulty: 3, make: makeGraphExtremum },
  { minDifficulty: 3, make: (rng) => makeAbsTransformations(rng, "frac") },
  { minDifficulty: 3, make: makeAbsWriteEquation },
  { minDifficulty: 3, make: makeAbsIneqPointCheck },
  { minDifficulty: 3, make: makeAbsEquationCheck },
  { minDifficulty: 3, make: (rng) => makeAbsIneqLinear(rng, true) },
  { minDifficulty: 3, make: makeAbsIneqSpecial },
];

/**
 * Generate n A2.2 (Topic 2: functions & absolute value) problems at the
 * given cumulative difficulty tier. `only` restricts to named subtypes.
 */
export function generateFunctionProblems(
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

export const FUNCTION_MAKERS = MAKERS;

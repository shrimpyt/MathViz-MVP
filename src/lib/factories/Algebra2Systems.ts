// Algebra2Systems.ts
// A2.8 — Nonlinear systems: line ∩ parabola (two intersections or tangent),
// line ∩ circle (two intersections or tangent). Systems are constructed from
// chosen solution points so intersections are exact; tests substitute each
// solution into BOTH original equations independently.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type {
  Algebra2Problem,
  Algebra2ConicSVGParams,
  Algebra2FuncGraphParams,
  Algebra2FuncGraphLine,
} from "./Algebra2Types";
import {
  randSigned,
  randNonZero,
  polyToLatex,
  reduceFrac,
  fracToLatex,
  gcd,
  boxPolygon,
  clipHalfPlane,
  selectMakers,
} from "./Algebra2Helpers";

export type SystemSubtype = "LineParabola" | "CircleLine";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function ptStr(x: number, y: number): string {
  return `(${x}, ${y})`;
}

// ── Line ∩ parabola ───────────────────────────────────────────────────────────

function makeLineParabola(rng: RNG, tangent: boolean): Algebra2Problem {
  // Parabola P(x) = x^2 + u*x + v. Choose integer solutions, then fit.
  const u = randSigned(rng, 5);
  let x1 = randSigned(rng, 5);
  let x2 = randSigned(rng, 5);
  if (tangent) {
    x2 = x1; // double root → tangent
  } else {
    if (x1 === x2) x2 = x1 + 2;
  }
  const v = randSigned(rng, 6);
  const P = (x: number) => x * x + u * x + v;
  const y1 = P(x1);
  const y2 = P(x2);
  // Line through (x1,y1),(x2,y2); tangent case: m = P'(x1) = 2x1 + u.
  // Note m = x1 + x2 + u exactly (P(x2)-P(x1))/(x2-x1)), always an integer.
  const m = tangent ? 2 * x1 + u : x1 + x2 + u;
  const b = y1 - m * x1;
  const lineLatex = `y = ${m === 1 ? "" : m === -1 ? "-" : m}x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
  const parabLatex = `y = ${polyToLatex([1, u, v])}`;
  const answer = tangent
    ? ptStr(x1, y1)
    : `${ptStr(Math.min(x1, x2), P(Math.min(x1, x2)))} and ${ptStr(Math.max(x1, x2), P(Math.max(x1, x2)))}`;
  const svg: Algebra2ConicSVGParams = {
    kind: "ConicGraph",
    parabolas: [{ h: -u / 2, k: P(-u / 2), a: 1 }],
  };
  return {
    type: "A2.5",
    subtype: "LineParabola",
    given: { parabola: parabLatex, line: lineLatex },
    find: tangent ? "point of tangency" : "intersection points",
    answer,
    steps: [
      {
        instruction: "Substitute the line into the parabola (set the y's equal):",
        reason: "Substitution method",
        blanks: [{ label: "substituted", answer: `${m === 1 ? "" : m === -1 ? "-" : m}x ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${polyToLatex([1, u, v])}` }],
      },
      {
        instruction: tangent
          ? "The quadratic has discriminant 0 — one (double) solution:"
          : "Solve the quadratic for x, then find each y:",
        reason: tangent ? "Double root (tangent)" : "Solve quadratic, back-substitute",
        blanks: [{ label: "solutions", answer }],
      },
    ],
    svgParams: svg,
    verify: { kind: "lineParabola", u, v, m, b, x1, x2, tangent },
  };
}

// ── Line ∩ circle ─────────────────────────────────────────────────────────────

function makeCircleLine(rng: RNG, tangent: boolean): Algebra2Problem {
  // Circle x^2 + y^2 = r^2. Pick integer lattice points on it.
  const r = pick(rng, [5, 10]);
  const lattice: [number, number][] =
    r === 5
      ? [[3, 4], [4, 3], [5, 0], [0, 5], [-3, 4], [-4, 3], [3, -4], [4, -3]]
      : [[6, 8], [8, 6], [10, 0], [0, 10], [-6, 8], [-8, 6], [6, -8], [8, -6]];
  const i1 = randInt(rng, 0, lattice.length - 1);
  let i2 = randInt(rng, 0, lattice.length - 1);
  if (i2 === i1) i2 = (i1 + 3) % lattice.length;
  const [x1, y1] = lattice[i1];
  const [x2, y2] = lattice[i2];
  let mNum: number; // slope as exact fraction mNum/mDen
  let mDen: number;
  let bNum: number; // intercept as exact fraction bNum/bDen
  let bDen: number;
  let sols: [number, number][];
  let vertical = false;
  if (!tangent) {
    // Line through the two lattice points; avoid a vertical line.
    if (x1 === x2) {
      const alt = lattice.find(([x]) => x !== x1)!;
      sols = [[x1, y1], alt];
    } else {
      sols = [[x1, y1], [x2, y2]];
    }
    const [ax, ay] = sols[0];
    const [bx2, by2] = sols[1];
    [mNum, mDen] = reduceFrac(by2 - ay, bx2 - ax);
    // b = ay - m*ax = (ay*mDen - mNum*ax) / mDen
    [bNum, bDen] = reduceFrac(ay * mDen - mNum * ax, mDen);
  } else {
    // Tangent at (x1, y1): x1*x + y1*y = r^2
    if (y1 === 0) {
      vertical = true;
      mNum = 1; mDen = 0; // sentinel
      bNum = x1; bDen = 1;
      sols = [[x1, y1]];
    } else {
      // y = (-x1/y1) x + r^2/y1
      [mNum, mDen] = reduceFrac(-x1, y1);
      [bNum, bDen] = reduceFrac(r * r, y1);
      sols = [[x1, y1]];
    }
  }
  const mStr = vertical ? "" : fracToLatex(mNum, mDen);
  const mCoeff =
    mStr === "1" ? "" : mStr === "-1" ? "-" : mStr;
  const bVal = bNum / bDen;
  const lineLatex = vertical
    ? `x = ${bNum}`
    : bNum === 0
      ? `y = ${mCoeff}x`
      : `y = ${mCoeff}x ${bVal < 0 ? "-" : "+"} ${fracToLatex(Math.abs(bNum), bDen)}`;
  const answer = sols.map(([x, y]) => ptStr(x, y)).join(" and ");
  return {
    type: "A2.C",
    subtype: "CircleLine",
    given: { circle: `x^2 + y^2 = ${r * r}`, line: lineLatex },
    find: tangent ? "point of tangency" : "intersection points",
    answer,
    steps: [
      {
        instruction: "Substitute the line equation into the circle equation:",
        reason: "Substitution method",
        blanks: [{ label: "substituted", answer: "see work" }],
      },
      {
        instruction: tangent
          ? "The resulting quadratic has discriminant 0 — one solution:"
          : "Solve for x, then find each y:",
        reason: tangent ? "Double root (tangent)" : "Solve quadratic, back-substitute",
        blanks: [{ label: "solutions", answer }],
      },
    ],
    svgParams: { kind: "ConicGraph", circles: [{ h: 0, k: 0, r }] },
    verify: { kind: "circleLine", r, mNum, mDen, bNum, bDen, sols: sols.flat(), tangent, vertical },
  };
}

// ══ Topic 3 (A2.3): linear systems ═══════════════════════════════════════════
// Systems are constructed from a chosen solution point so intersections and
// elimination arithmetic are exact; tests substitute solutions back into the
// original equations from `verify`.

type Rel3 = "lt" | "le" | "gt" | "ge";
const REL3_LATEX: Record<Rel3, string> = { lt: "<", le: "\\leq", gt: ">", ge: "\\geq" };

/** "2x - 3y" / "x + y" / "-x" — left side a·x + b·y (no "= c"). */
function linSide(a: number, b: number, v1 = "x", v2 = "y"): string {
  const t = (coef: number, v: string, first: boolean): string => {
    if (coef === 0) return "";
    const body = Math.abs(coef) === 1 ? v : `${Math.abs(coef)}${v}`;
    if (first) return coef < 0 ? `-${body}` : body;
    return coef < 0 ? ` - ${body}` : ` + ${body}`;
  };
  return t(a, v1, true) + t(b, v2, a === 0) || "0";
}

function stdEq(a: number, b: number, c: number, v1 = "x", v2 = "y"): string {
  return `${linSide(a, b, v1, v2)} = ${c}`;
}

/** Graph params for the line a·x + b·y = c (requires b ≠ 0). */
function graphLine(a: number, b: number, c: number, dashed?: boolean): Algebra2FuncGraphLine {
  const [mNum, mDen] = reduceFrac(-a, b);
  const [bNum, bDen] = reduceFrac(c, b);
  return { mNum, mDen, bNum, bDen, dashed };
}

/** "y = 2x + 3" text for the line a·x + b·y = c (b ≠ 0). */
function slopeInterceptText(a: number, b: number, c: number): string {
  const [mn, md] = reduceFrac(-a, b);
  const [bn, bd] = reduceFrac(c, b);
  if (mn === 0) return `y = ${fracToLatex(bn, bd)}`;
  const mText = md === 1 && mn === 1 ? "" : md === 1 && mn === -1 ? "-" : fracToLatex(mn, md);
  if (bn === 0) return `y = ${mText}x`;
  return `y = ${mText}x ${bn < 0 ? "-" : "+"} ${fracToLatex(Math.abs(bn), bd)}`;
}

function det2(a1: number, b1: number, a2: number, b2: number): number {
  return a1 * b2 - a2 * b1;
}

// ── 3-1: Systems from graphs and tables ──────────────────────────────────────

function makeSystemGraphSolve(rng: RNG): Algebra2Problem {
  const x0 = randInt(rng, -4, 4);
  const y0 = randInt(rng, -4, 4);
  let a1 = 0, b1 = 0, a2 = 0, b2 = 0;
  for (let tries = 0; tries < 200; tries++) {
    a1 = randSigned(rng, 3); b1 = randNonZero(rng, -3, 3);
    a2 = randSigned(rng, 3); b2 = randNonZero(rng, -3, 3);
    if (det2(a1, b1, a2, b2) !== 0) break;
  }
  if (det2(a1, b1, a2, b2) === 0) { a1 = 1; b1 = 1; a2 = 1; b2 = -1; }
  const c1 = a1 * x0 + b1 * y0;
  const c2 = a2 * x0 + b2 * y0;
  const eq1 = stdEq(a1, b1, c1);
  const eq2 = stdEq(a2, b2, c2);
  const svg: Algebra2FuncGraphParams = {
    kind: "FuncGraph",
    lines: [graphLine(a1, b1, c1), graphLine(a2, b2, c2)],
    points: [{ x: x0, y: y0 }],
  };
  return {
    type: "A2.3",
    subtype: "SystemGraphSolve",
    given: { system: `${eq1}; ${eq2}` },
    find: "solution of the system",
    answer: `(${x0}, ${y0})`,
    steps: [
      {
        instruction: "The solution of a system is the point where the two graphs intersect — it is the one point that lies on both lines:",
        reason: "Graphing method",
        blanks: [{ label: "intersection point", answer: `(${x0}, ${y0})` }],
      },
      {
        instruction: `Check by substitution: (${x0}, ${y0}) must satisfy BOTH equations: ${a1}(${x0}) + ${b1}(${y0}) = ${c1} and ${a2}(${x0}) + ${b2}(${y0}) = ${c2}:`,
        reason: "Check by substitution",
        blanks: [{ label: "check", answer: "both equations are true" }],
      },
    ],
    svgParams: svg,
    verify: { a1, b1, c1, a2, b2, c2, x: x0, y: y0 },
  };
}

function makeSystemTableSolve(rng: RNG): Algebra2Problem {
  const m1 = randNonZero(rng, -3, 3);
  let m2 = randNonZero(rng, -3, 3);
  if (m2 === m1) m2 = m1 + 1;
  const x0 = randInt(rng, -2, 2);
  const y0 = randInt(rng, -4, 4);
  const b1 = y0 - m1 * x0;
  const b2 = y0 - m2 * x0;
  const xs = [x0 - 2, x0 - 1, x0, x0 + 1, x0 + 2];
  const fPairs = xs.map((x) => `(${x}, ${m1 * x + b1})`).join(", ");
  const gPairs = xs.map((x) => `(${x}, ${m2 * x + b2})`).join(", ");
  return {
    type: "A2.3",
    subtype: "SystemTableSolve",
    given: { f: fPairs, g: gPairs },
    find: "the input where f and g have the same output, and that output",
    answer: `x = ${x0}; f(${x0}) = g(${x0}) = ${y0}`,
    steps: [
      {
        instruction: "Scan the two tables for an x-value whose outputs match:",
        reason: "Comparing table values",
        blanks: [{ label: "matching input", answer: `x = ${x0}` }],
      },
      {
        instruction: `At x = ${x0} both functions output ${y0} — that shared point solves the system f(x) = g(x):`,
        reason: "Solution of a system",
        blanks: [{ label: "common output", answer: `${y0}` }],
      },
    ],
    verify: { m1, b1, m2, b2, x: x0, y: y0 },
  };
}

function makeSystemClassify(rng: RNG): Algebra2Problem {
  const a = randNonZero(rng, -3, 3);
  const b = randNonZero(rng, -3, 3);
  const x0 = randInt(rng, -3, 3);
  const y0 = randInt(rng, -3, 3);
  const c1 = a * x0 + b * y0;
  const coincident = rng() < 0.5;
  let eq2: string, c2: number, a2 = a, b2 = b;
  let answer: string, verdict: string;
  let svg: Algebra2FuncGraphParams;
  if (coincident) {
    const s = pick(rng, [2, 3, -2]);
    a2 = a * s; b2 = b * s; c2 = c1 * s;
    eq2 = stdEq(a2, b2, c2);
    answer = "Infinitely many solutions — the equations describe the same line (dependent system)";
    verdict = "infinitely many solutions";
    svg = { kind: "FuncGraph", lines: [graphLine(a, b, c1)] };
  } else {
    let cDiff = randSigned(rng, 6);
    if (cDiff === 0) cDiff = 3;
    c2 = c1 + cDiff;
    eq2 = stdEq(a, b, c2);
    answer = "No solution — the lines are parallel and never meet (inconsistent system)";
    verdict = "no solution";
    svg = { kind: "FuncGraph", lines: [graphLine(a, b, c1), graphLine(a, b, c2)] };
  }
  const si1 = slopeInterceptText(a, b, c1);
  const si2 = slopeInterceptText(a2, b2, c2);
  return {
    type: "A2.3",
    subtype: "SystemClassify",
    given: { system: `${stdEq(a, b, c1)}; ${eq2}` },
    find: "number of solutions of the system",
    answer,
    steps: [
      {
        instruction: `Solve each equation for y to compare slopes and intercepts: first gives ${si1}, second gives ${si2}:`,
        reason: "Slope-intercept comparison",
        blanks: [{ label: "slopes", answer: "equal" }],
      },
      {
        instruction: coincident
          ? "Same slope AND same intercept — the two equations are the same line, so every point on the line is a solution:"
          : "Same slope but different intercepts — the lines are parallel and distinct, so they never intersect:",
        reason: coincident ? "Dependent system" : "Inconsistent system",
        blanks: [{ label: "verdict", answer: verdict }],
      },
    ],
    svgParams: svg,
    verify: { a1: a, b1: b, c1, a2, b2, c2, coincident },
  };
}

// ── 3-2: Algebraic methods ───────────────────────────────────────────────────

function makeSystemSubstitution(rng: RNG): Algebra2Problem {
  const m = randNonZero(rng, -3, 3);
  const x0 = randInt(rng, -4, 4);
  const y0 = randInt(rng, -5, 5);
  const b = y0 - m * x0;
  const a = randNonZero(rng, -3, 3);
  const B = pick(rng, [1, 2, -1, -2]);
  const c = a * x0 + B * y0;
  const yExpr = polyToLatex([m, b]);
  const eq2 = stdEq(a, B, c);
  const substituted = `${a === 1 ? "" : a === -1 ? "-" : a}x ${B < 0 ? "-" : "+"} ${Math.abs(B) === 1 ? "" : Math.abs(B)}(${yExpr}) = ${c}`;
  return {
    type: "A2.3",
    subtype: "SystemSubstitution",
    given: { system: `y = ${yExpr}; ${eq2}` },
    find: "solution of the system",
    answer: `(${x0}, ${y0})`,
    steps: [
      {
        instruction: `The first equation already gives y in terms of x. Substitute ${yExpr} for y in the second equation:`,
        reason: "Substitution method",
        blanks: [{ label: "substituted equation", answer: substituted.replace(/\s+/g, " ").trim() }],
      },
      {
        instruction: "Solve the resulting one-variable equation for x:",
        reason: "Solve for x",
        blanks: [{ label: "x", answer: `${x0}` }],
      },
      {
        instruction: `Back-substitute x = ${x0} into y = ${yExpr} to find y:`,
        reason: "Back-substitution",
        blanks: [{ label: "solution", answer: `(${x0}, ${y0})` }],
      },
    ],
    verify: { m, b, a, B, c, x: x0, y: y0 },
  };
}

function makeSystemElimination(rng: RNG): Algebra2Problem {
  let a1 = 0, b1 = 0, a2 = 0, b2 = 0, x0 = 0, y0 = 0;
  for (let tries = 0; tries < 300; tries++) {
    a1 = randNonZero(rng, -4, 4); b1 = randNonZero(rng, -4, 4);
    a2 = randNonZero(rng, -4, 4); b2 = randNonZero(rng, -4, 4);
    x0 = randInt(rng, -4, 4); y0 = randInt(rng, -4, 4);
    if (det2(a1, b1, a2, b2) === 0) continue;
    // require an actual multiplication step for both equations
    if (Math.abs(a1) === Math.abs(a2)) continue;
    break;
  }
  if (det2(a1, b1, a2, b2) === 0 || Math.abs(a1) === Math.abs(a2)) {
    a1 = 2; b1 = 1; a2 = 1; b2 = 3; x0 = 2; y0 = -1;
  }
  const c1 = a1 * x0 + b1 * y0;
  const c2 = a2 * x0 + b2 * y0;
  const g = gcd(a1, a2);
  const m1 = a2 / g; // multiplier for eq1 (keeps sign of a2)
  const m2 = -a1 / g; // multiplier for eq2 → x-coefficients cancel
  const yCoeff = m1 * b1 + m2 * b2;
  const yRhs = m1 * c1 + m2 * c2;
  const scaled1 = stdEq(m1 * a1, m1 * b1, m1 * c1);
  const scaled2 = stdEq(m2 * a2, m2 * b2, m2 * c2);
  const sumEq = `${linSide(0, yCoeff)} = ${yRhs}`;
  return {
    type: "A2.3",
    subtype: "SystemElimination",
    given: { system: `${stdEq(a1, b1, c1)}; ${stdEq(a2, b2, c2)}` },
    find: "solution of the system",
    answer: `(${x0}, ${y0})`,
    steps: [
      {
        instruction: `Multiply the first equation by ${m1} and the second by ${m2} so the x-coefficients become opposites (${m1 * a1} and ${m2 * a2}):`,
        reason: "Elimination: align coefficients",
        blanks: [{ label: "scaled equations", answer: `${scaled1}; ${scaled2}` }],
      },
      {
        instruction: "Add the scaled equations — the x-terms cancel:",
        reason: "Elimination: add the equations",
        blanks: [
          { label: "one-variable equation", answer: sumEq },
          { label: "y", answer: `${y0}` },
        ],
      },
      {
        instruction: `Substitute y = ${y0} into the first original equation and solve for x:`,
        reason: "Back-substitution",
        blanks: [{ label: "solution", answer: `(${x0}, ${y0})` }],
      },
    ],
    verify: { a1, b1, c1, a2, b2, c2, x: x0, y: y0, mult1: m1, mult2: m2 },
  };
}

// ── 3-3: Systems of inequalities ──────────────────────────────────────────────

interface IneqLine { a: number; b: number; c: number; rel: Rel3 }

function ineqText(l: IneqLine): string {
  return `${linSide(l.a, l.b)} ${REL3_LATEX[l.rel]} ${l.c}`;
}

function satisfies(l: IneqLine, x: number, y: number): boolean {
  const v = l.a * x + l.b * y;
  switch (l.rel) {
    case "lt": return v < l.c;
    case "le": return v <= l.c;
    case "gt": return v > l.c;
    case "ge": return v >= l.c;
  }
}

function shadeFor(l1: IneqLine, l2: IneqLine) {
  let poly = boxPolygon(16);
  for (const l of [l1, l2]) {
    poly = clipHalfPlane(poly, l.a, l.b, l.c, l.rel === "lt" || l.rel === "le" ? "le" : "ge");
  }
  return poly;
}

function randomIneqPair(rng: RNG): [IneqLine, IneqLine] {
  // boundaries cross at a small integer point; half-planes chosen so the
  // feasible region is nonempty around it
  const x0 = randInt(rng, -3, 3);
  const y0 = randInt(rng, -3, 3);
  let a1 = 0, b1 = 0, a2 = 0, b2 = 0;
  for (let tries = 0; tries < 200; tries++) {
    a1 = randSigned(rng, 2); b1 = randNonZero(rng, -2, 2);
    a2 = randSigned(rng, 2); b2 = randNonZero(rng, -2, 2);
    if (det2(a1, b1, a2, b2) !== 0) break;
  }
  const mk = (a: number, b: number): IneqLine => ({
    a, b,
    c: a * x0 + b * y0 + pick(rng, [0, 1, 2, 3]),
    rel: pick(rng, ["le", "ge", "lt", "gt"] as const),
  });
  return [mk(a1, b1), mk(a2, b2)];
}

function makeSystemIneqTestPoint(rng: RNG): Algebra2Problem {
  const [l1, l2] = randomIneqPair(rng);
  const wantSolution = rng() < 0.5;
  // find a small integer test point with the desired verdict
  let px = 0, py = 0, found = false;
  outer: for (let x = -6; x <= 6; x++) {
    for (let y = -6; y <= 6; y++) {
      const ok = satisfies(l1, x, y) && satisfies(l2, x, y);
      if (ok === wantSolution) { px = x; py = y; found = true; break outer; }
    }
  }
  if (!found) { px = 0; py = 0; }
  const t1 = satisfies(l1, px, py);
  const t2 = satisfies(l2, px, py);
  const isSol = t1 && t2;
  const stmt = (l: IneqLine) => `${linSide(l.a, l.b)} becomes ${l.a * px + l.b * py} ${REL3_LATEX[l.rel]} ${l.c}`;
  return {
    type: "A2.3",
    subtype: "SystemIneqTestPoint",
    given: { system: `${ineqText(l1)}; ${ineqText(l2)}`, point: `(${px}, ${py})` },
    find: "whether the point is a solution of the system",
    answer: isSol
      ? `Yes — (${px}, ${py}) satisfies both inequalities`
      : `No — (${px}, ${py}) fails ${!t1 && !t2 ? "both inequalities" : !t1 ? "the first inequality" : "the second inequality"}`,
    steps: [
      {
        instruction: `Substitute (${px}, ${py}) into the first inequality: ${stmt(l1)} — this statement is ${t1}:`,
        reason: "Test point method",
        blanks: [{ label: "first inequality", answer: t1 ? "true" : "false" }],
      },
      {
        instruction: `Substitute (${px}, ${py}) into the second inequality: ${stmt(l2)} — this statement is ${t2}:`,
        reason: "Test point method",
        blanks: [{ label: "second inequality", answer: t2 ? "true" : "false" }],
      },
      {
        instruction: "A solution of a SYSTEM must satisfy every inequality at once:",
        reason: "All conditions at once",
        blanks: [{ label: "verdict", answer: isSol ? "yes, it is a solution" : "no, it is not a solution" }],
      },
    ],
    svgParams: {
      kind: "FuncGraph",
      lines: [graphLine(l1.a, l1.b, l1.c, l1.rel === "lt" || l1.rel === "gt"), graphLine(l2.a, l2.b, l2.c, l2.rel === "lt" || l2.rel === "gt")],
      shade: [shadeFor(l1, l2)],
      points: [{ x: px, y: py }],
    },
    verify: { l1: [l1.a, l1.b, l1.c], l2: [l2.a, l2.b, l2.c], rels: [l1.rel, l2.rel], px, py, isSolution: isSol },
  };
}

function makeSystemIneqRead(rng: RNG): Algebra2Problem {
  const [l1, l2] = randomIneqPair(rng);
  const answer = `${ineqText(l1)}; ${ineqText(l2)}`;
  const describe = (l: IneqLine, n: number) => {
    const dashed = l.rel === "lt" || l.rel === "gt";
    return {
      instruction: `Boundary ${n} is the line ${slopeInterceptText(l.a, l.b, l.c)}, drawn ${dashed ? "dashed" : "solid"}; the shading lies on the side where ${linSide(l.a, l.b)} is ${l.rel === "lt" || l.rel === "le" ? "at most" : "at least"} ${l.c}:`,
      reason: "Boundary and shading give the inequality",
      blanks: [{ label: `inequality ${n}`, answer: ineqText(l) }],
    };
  };
  return {
    type: "A2.3",
    subtype: "SystemIneqRead",
    given: { graph: "shaded system of inequalities" },
    find: "the system of inequalities represented by the graph",
    answer,
    steps: [
      describe(l1, 1),
      describe(l2, 2),
      {
        instruction: "The solution set of the system is the overlap — the region shaded by both inequalities:",
        reason: "Intersection of half-planes",
        blanks: [{ label: "system", answer }],
      },
    ],
    svgParams: {
      kind: "FuncGraph",
      lines: [graphLine(l1.a, l1.b, l1.c, l1.rel === "lt" || l1.rel === "gt"), graphLine(l2.a, l2.b, l2.c, l2.rel === "lt" || l2.rel === "gt")],
      shade: [shadeFor(l1, l2)],
    },
    verify: { l1: [l1.a, l1.b, l1.c], l2: [l2.a, l2.b, l2.c], rels: [l1.rel, l2.rel] },
  };
}

function makeSystemIneqCorner(rng: RNG): Algebra2Problem {
  // corner = intersection of the two boundary lines, on both boundaries,
  // with non-strict inequalities so the corner belongs to the region
  const x0 = randInt(rng, -3, 3);
  const y0 = randInt(rng, -3, 3);
  let a1 = 0, b1 = 0, a2 = 0, b2 = 0;
  for (let tries = 0; tries < 200; tries++) {
    a1 = randSigned(rng, 2); b1 = randNonZero(rng, -2, 2);
    a2 = randSigned(rng, 2); b2 = randNonZero(rng, -2, 2);
    if (det2(a1, b1, a2, b2) !== 0) break;
  }
  const l1: IneqLine = { a: a1, b: b1, c: a1 * x0 + b1 * y0, rel: pick(rng, ["le", "ge"] as const) };
  const l2: IneqLine = { a: a2, b: b2, c: a2 * x0 + b2 * y0, rel: pick(rng, ["le", "ge"] as const) };
  return {
    type: "A2.3",
    subtype: "SystemIneqCorner",
    given: { system: `${ineqText(l1)}; ${ineqText(l2)}` },
    find: "corner point of the feasible region (where the two boundary lines meet)",
    answer: `(${x0}, ${y0})`,
    steps: [
      {
        instruction: `The corner lies on both boundary lines, so solve the system of boundary equations ${stdEq(a1, b1, l1.c)} and ${stdEq(a2, b2, l2.c)} (by substitution or elimination):`,
        reason: "Corner = intersection of boundaries",
        blanks: [{ label: "intersection", answer: `(${x0}, ${y0})` }],
      },
      {
        instruction: `Because both inequalities are non-strict (\\leq / \\geq), the corner point itself belongs to the feasible region — it gives equality in both:`,
        reason: "Feasibility check",
        blanks: [{ label: "corner point", answer: `(${x0}, ${y0})` }],
      },
    ],
    svgParams: {
      kind: "FuncGraph",
      lines: [graphLine(l1.a, l1.b, l1.c), graphLine(l2.a, l2.b, l2.c)],
      shade: [shadeFor(l1, l2)],
      points: [{ x: x0, y: y0 }],
    },
    verify: { l1: [l1.a, l1.b, l1.c], l2: [l2.a, l2.b, l2.c], rels: [l1.rel, l2.rel], x: x0, y: y0 },
  };
}

// ── 3-4: Systems in three variables ──────────────────────────────────────────

type Frac = [number, number];
const fNorm = (n: number, d: number): Frac => reduceFrac(n, d);
const fAdd = (p: Frac, q: Frac): Frac => fNorm(p[0] * q[1] + q[0] * p[1], p[1] * q[1]);
const fMul = (p: Frac, q: Frac): Frac => fNorm(p[0] * q[0], p[1] * q[1]);
const fNeg = (p: Frac): Frac => [-p[0], p[1]];
const fEq = (p: Frac, q: Frac) => p[0] === q[0] && p[1] === q[1];
const fStr = (p: Frac) => fracToLatex(p[0], p[1]);

/** Equation text with exact fractional coefficients: "2x - 3/2y + z = 5". */
function fmtEqF(coeffs: Frac[], rhs: Frac, vars: string[]): string {
  let out = "";
  coeffs.forEach((cf, i) => {
    if (cf[0] === 0) return;
    const isOne = Math.abs(cf[0]) === 1 && cf[1] === 1;
    const body = isOne ? vars[i] : `${fStr([Math.abs(cf[0]), cf[1]])}${vars[i]}`;
    if (out === "") out = cf[0] < 0 ? `-${body}` : body;
    else out += cf[0] < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return `${out || "0"} = ${fStr(rhs)}`;
}

interface ThreeVarBuild {
  A: number[][];
  sol: number[];
  /** Rows after eliminating x from eqs 2,3: [eq2', eq3']. */
  afterX: Frac[][];
  /** Final row after eliminating y from eq3': only z remains. */
  finalRow: Frac[];
}

function tryThreeVar(rng: RNG, range: number, solRange: number): ThreeVarBuild | null {
  const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => randInt(rng, -range, range)));
  const sol = [randInt(rng, -solRange, solRange), randInt(rng, -solRange, solRange), randInt(rng, -solRange, solRange)];
  if (A[0][0] === 0) return null;
  const rhs = A.map((row) => row[0] * sol[0] + row[1] * sol[1] + row[2] * sol[2]);
  const M: Frac[][] = A.map((row, i) => [...row.map((v) => fNorm(v, 1)), fNorm(rhs[i], 1)]);
  const elim = (target: number, src: number, col: number) => {
    const factor: Frac = fNorm(
      M[target][col][0] * M[src][col][1],
      M[target][col][1] * M[src][col][0]
    ); // factor = M[target][col] / M[src][col]
    for (let j = col; j < 4; j++) M[target][j] = fAdd(M[target][j], fNeg(fMul(factor, M[src][j])));
  };
  elim(1, 0, 0);
  elim(2, 0, 0);
  if (M[1][1][0] === 0) return null;
  const afterX = [M[1].map((f) => [...f] as Frac), M[2].map((f) => [...f] as Frac)];
  elim(2, 1, 1);
  if (M[2][2][0] === 0) return null;
  // sanity: the eliminated z must reproduce the constructed solution
  const zCheck = fNorm(M[2][3][0] * M[2][2][1], M[2][3][1] * M[2][2][0]);
  if (!fEq(zCheck, fNorm(sol[2], 1))) return null;
  return { A, sol, afterX, finalRow: M[2] };
}

function makeThreeVarSystem(rng: RNG, level: 1 | 2): Algebra2Problem {
  const range = level === 1 ? 2 : 3;
  const solRange = level === 1 ? 2 : 3;
  let build: ThreeVarBuild | null = null;
  for (let tries = 0; tries < 400 && !build; tries++) build = tryThreeVar(rng, range, solRange);
  if (!build) {
    // deterministic fallback: already-triangular system
    const A = [[1, 1, 1], [0, 1, 2], [0, 0, 1]];
    const sol = [1, -1, 2];
    const rhs = [2, 3, 2];
    build = {
      A,
      sol,
      afterX: [
        [fNorm(0, 1), fNorm(1, 1), fNorm(2, 1), fNorm(rhs[1], 1)],
        [fNorm(0, 1), fNorm(0, 1), fNorm(1, 1), fNorm(rhs[2], 1)],
      ],
      finalRow: [fNorm(0, 1), fNorm(0, 1), fNorm(1, 1), fNorm(rhs[2], 1)],
    };
  }
  const { A, sol, afterX, finalRow } = build;
  const rhs = A.map((row) => row[0] * sol[0] + row[1] * sol[1] + row[2] * sol[2]);
  const eqText = A.map((row, i) => stdEq3(row, rhs[i]));
  const eq2p = fmtEqF(afterX[0].slice(0, 3), afterX[0][3], ["x", "y", "z"]);
  const eq3p = fmtEqF(afterX[1].slice(0, 3), afterX[1][3], ["x", "y", "z"]);
  const zEq = fmtEqF(finalRow.slice(0, 3), finalRow[3], ["x", "y", "z"]);
  return {
    type: "A2.3",
    subtype: "ThreeVarSystem",
    given: { system: eqText.join("; ") },
    find: "solution as an ordered triple (x, y, z)",
    answer: `(${sol[0]}, ${sol[1]}, ${sol[2]})`,
    steps: [
      {
        instruction: "Use the first equation to eliminate x from the second equation. The new second equation (in y and z only) is:",
        reason: "Elimination: remove one variable at a time",
        blanks: [{ label: "new equation 2", answer: eq2p }],
      },
      {
        instruction: "Eliminate x from the third equation the same way:",
        reason: "Elimination: remove one variable at a time",
        blanks: [{ label: "new equation 3", answer: eq3p }],
      },
      {
        instruction: `Now eliminate y between the two new equations. The result is ${zEq}; solve it for z:`,
        reason: "Elimination: remove y",
        blanks: [{ label: "z", answer: `${sol[2]}` }],
      },
      {
        instruction: `Back-substitute z = ${sol[2]} into new equation 2 to find y, then back-substitute both into the first original equation to find x. The solution is the ordered triple:`,
        reason: "Back-substitution",
        blanks: [{ label: "ordered triple", answer: `(${sol[0]}, ${sol[1]}, ${sol[2]})` }],
      },
    ],
    verify: { A: A.flat(), rhs, sol },
  };
}

function stdEq3(row: number[], c: number): string {
  const vars = ["x", "y", "z"];
  let out = "";
  row.forEach((coef, i) => {
    if (coef === 0) return;
    const body = Math.abs(coef) === 1 ? vars[i] : `${Math.abs(coef)}${vars[i]}`;
    if (out === "") out = coef < 0 ? `-${body}` : body;
    else out += coef < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return `${out || "0"} = ${c}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeLineParabola(rng, false) },
  { minDifficulty: 1, make: makeSystemGraphSolve },
  { minDifficulty: 1, make: makeSystemTableSolve },
  { minDifficulty: 1, make: makeSystemIneqTestPoint },
  { minDifficulty: 2, make: (rng) => makeLineParabola(rng, false) },
  { minDifficulty: 2, make: (rng) => makeCircleLine(rng, false) },
  { minDifficulty: 2, make: makeSystemClassify },
  { minDifficulty: 2, make: makeSystemSubstitution },
  { minDifficulty: 2, make: makeSystemIneqRead },
  { minDifficulty: 2, make: (rng) => makeThreeVarSystem(rng, 1) },
  { minDifficulty: 3, make: (rng) => makeLineParabola(rng, true) },
  { minDifficulty: 3, make: (rng) => makeCircleLine(rng, true) },
  { minDifficulty: 3, make: (rng) => makeCircleLine(rng, false) },
  { minDifficulty: 3, make: makeSystemElimination },
  { minDifficulty: 3, make: makeSystemIneqCorner },
  { minDifficulty: 3, make: (rng) => makeThreeVarSystem(rng, 2) },
];

/** Generate n A2.5/A2.C (nonlinear systems) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateSystemProblems(
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

export const SYSTEM_MAKERS = MAKERS;

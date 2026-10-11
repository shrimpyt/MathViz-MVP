// Algebra2Systems.ts
// A2.8 — Nonlinear systems: line ∩ parabola (two intersections or tangent),
// line ∩ circle (two intersections or tangent). Systems are constructed from
// chosen solution points so intersections are exact; tests substitute each
// solution into BOTH original equations independently.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem, Algebra2ConicSVGParams } from "./Algebra2Types";
import { randSigned, polyToLatex, reduceFrac, fracToLatex, selectMakers } from "./Algebra2Helpers";

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

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeLineParabola(rng, false) },
  { minDifficulty: 2, make: (rng) => makeLineParabola(rng, false) },
  { minDifficulty: 2, make: (rng) => makeCircleLine(rng, false) },
  { minDifficulty: 3, make: (rng) => makeLineParabola(rng, true) },
  { minDifficulty: 3, make: (rng) => makeCircleLine(rng, true) },
  { minDifficulty: 3, make: (rng) => makeCircleLine(rng, false) },
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

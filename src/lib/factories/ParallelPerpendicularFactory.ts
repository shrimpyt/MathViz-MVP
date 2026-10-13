// ParallelPerpendicularFactory.ts
// Topic 7: Equations of Parallel and Perpendicular Lines (TEKS G.2(C)).
// Lesson ch7-3, beside ch7-1 (distance and midpoint) and ch7-2 (partitioning
// a segment). Parallel lines share a slope; perpendicular lines have slopes
// that are opposite reciprocals. D1: read the required slope off a given
// equation or off a line through two points. D2: write the full equation of
// the parallel or perpendicular line through a given point. D3: the
// horizontal and vertical special cases, where slopes are 0 or undefined and
// equations are y = b or x = a.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, frac, gcd, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

const SLOPES: [number, number][] = [
  [2, 1], [-3, 1], [1, 2], [-3, 4], [4, 5], [-1, 3], [5, 2], [-2, 3], [3, 4], [-5, 3], [1, 4], [-4, 1],
];

function signedB(b: number): string {
  return b >= 0 ? `+ ${b}` : `− ${-b}`;
}

/** Display form of a slope inside an equation: 1 becomes "", -1 becomes "-". */
function slopeDisplay(mStr: string): string {
  return mStr === "1" ? "" : mStr === "-1" ? "-" : mStr;
}

function lineEqAnswer(mNew: number, b: number): string {
  let mStr = "";
  for (let q = 1; q <= 12 && !mStr; q++) {
    const p = mNew * q;
    if (Number.isInteger(p)) mStr = frac(p, q);
  }
  return `y = ${slopeDisplay(mStr)}x ${signedB(b)}`;
}

function makeSlopeFromEquation(rng: RNG): GeometryProblem {
  const [p, q] = pick(rng, SLOPES);
  const b0 = randInt(rng, -6, 6);
  const perp = rng() < 0.5;
  const mStr = frac(p, q);
  const answer = perp ? frac(-q, p) : mStr;
  return {
    type: "GEO.7",
    subtype: "PerpSlopeFromEquation",
    prompt: `Find the slope of a line ${perp ? "perpendicular" : "parallel"} to the line y = ${slopeDisplay(mStr)}x ${signedB(b0)}.`,
    given: { givenLine: `y = ${slopeDisplay(mStr)}x ${signedB(b0)}` },
    find: perp ? "perpendicular slope" : "parallel slope",
    answer,
    steps: [
      step(`The given line is in slope-intercept form, so its slope is ${mStr}.`, "Slope-Intercept Form."),
      step(
        perp
          ? `Perpendicular slopes are opposite reciprocals: flip ${mStr} and change its sign.`
          : "Parallel lines have exactly the same slope.",
        perp ? "Slopes of perpendicular lines." : "Slopes of parallel lines.",
        [{ label: "slope", answer }]
      ),
      step(`The slope is ${answer}.`, "Opposite reciprocal / equal slopes.", [{ label: "answer", answer }]),
    ],
    verify: { kind: "slopePP", p, q, perp },
  };
}

function makeSlopeFromPoints(rng: RNG): GeometryProblem {
  // Choose points on the −8..8 grid whose rise and run reduce to a listed slope.
  let rise = 2, run = 1, x1 = 0, y1 = 0, x2 = 1, y2 = 2;
  for (let tries = 0; tries < 40; tries++) {
    const [sp, sq] = pick(rng, SLOPES);
    const t = randInt(rng, 1, 3);
    const ax = randInt(rng, -6, 2);
    const ay = randInt(rng, -6, 6);
    const bx = ax + sq * t;
    const by = ay + sp * t;
    if (Math.abs(bx) > 7 || Math.abs(by) > 7) continue;
    rise = sp * t; run = sq * t; x1 = ax; y1 = ay; x2 = bx; y2 = by;
    break;
  }
  const g = gcd(rise, run);
  let p = rise / g;
  let q = run / g;
  if (q < 0) { p = -p; q = -q; }
  const perp = rng() < 0.5;
  const answer = perp ? frac(-q, p) : frac(p, q);
  return {
    type: "GEO.7",
    subtype: "PerpSlopeFromPoints",
    prompt: `A line passes through (${x1}, ${y1}) and (${x2}, ${y2}). Find the slope of a line ${perp ? "perpendicular" : "parallel"} to it.`,
    given: { p1: `(${x1}, ${y1})`, p2: `(${x2}, ${y2})` },
    find: perp ? "perpendicular slope" : "parallel slope",
    answer,
    steps: [
      step(`Slope of the given line: m = (${y2} − ${y1}) / (${x2} − ${x1}) = ${rise}/${run} = ${frac(p, q)}.`, "Slope Formula."),
      step(
        perp
          ? `Take the opposite reciprocal of ${frac(p, q)}.`
          : "A parallel line keeps the same slope.",
        perp ? "Slopes of perpendicular lines." : "Slopes of parallel lines.",
        [{ label: "slope", answer }]
      ),
      step(`The slope is ${answer}.`, "Opposite reciprocal / equal slopes.", [{ label: "answer", answer }]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "P", x: x1, y: y1 },
        { label: "Q", x: x2, y: y2 },
      ],
      lines: [{ x1, y1, x2, y2 }],
    },
    verify: { kind: "slopePP", p, q, perp },
  };
}

function makeWriteLineEquation(rng: RNG): GeometryProblem {
  const [p, q] = pick(rng, SLOPES);
  const b0 = randInt(rng, -5, 5);
  const perp = rng() < 0.5;
  const mNew = perp ? -q / p : p / q;
  const den = perp ? Math.abs(p) : Math.abs(q);
  const x0 = den * randInt(rng, -2, 2);
  const bNew = randInt(rng, -6, 6);
  const y0 = mNew * x0 + bNew;
  const mGivenStr = frac(p, q);
  const answer = lineEqAnswer(mNew, bNew);
  return {
    type: "GEO.7",
    subtype: "WriteParallelPerpLine",
    prompt: `Write an equation in slope-intercept form of the line through (${x0}, ${y0}) that is ${perp ? "perpendicular" : "parallel"} to the line y = ${slopeDisplay(mGivenStr)}x ${signedB(b0)}.`,
    given: { point: `(${x0}, ${y0})`, givenSlope: mGivenStr },
    find: "equation of the new line",
    answer,
    steps: [
      step(
        perp
          ? `The new slope is the opposite reciprocal of ${mGivenStr}.`
          : `Parallel lines share the slope ${mGivenStr}.`,
        perp ? "Slopes of perpendicular lines." : "Slopes of parallel lines."
      ),
      step(`Substitute the slope and the point (${x0}, ${y0}) into y = mx + b and solve for b: b = ${bNew}.`, "Slope-Intercept Form.", [
        { label: "b", answer: String(bNew) },
      ]),
      step(`The equation is ${answer}.`, "Slope-Intercept Form.", [{ label: "equation", answer }]),
    ],
    verify: { kind: "lineEq", mNum: mNew, b: bNew },
  };
}

function makeHorizontalVertical(rng: RNG): GeometryProblem {
  const vertical = rng() < 0.5;
  const perp = rng() < 0.5;
  const a = randInt(rng, -6, 6);
  const x0 = randInt(rng, -6, 6);
  const y0 = randInt(rng, -6, 6);
  // Given line: x = a (vertical) or y = a (horizontal). A parallel line has
  // the same orientation; a perpendicular line has the opposite orientation.
  const newVertical = vertical !== perp;
  const axis = newVertical ? "x" : "y";
  const value = newVertical ? x0 : y0;
  const answer = `${axis} = ${value}`;
  const givenDesc = vertical ? `the vertical line x = ${a}` : `the horizontal line y = ${a}`;
  return {
    type: "GEO.7",
    subtype: "HorizontalVerticalLines",
    prompt: `Write the equation of the line through (${x0}, ${y0}) that is ${perp ? "perpendicular" : "parallel"} to ${givenDesc}.`,
    given: { point: `(${x0}, ${y0})`, givenLine: vertical ? `x = ${a}` : `y = ${a}` },
    find: "equation of the new line",
    answer,
    steps: [
      step(
        vertical
          ? "A vertical line has no slope; lines parallel to it are vertical, and lines perpendicular to it are horizontal."
          : "A horizontal line has slope 0; lines parallel to it are horizontal, and lines perpendicular to it are vertical.",
        "Slopes of horizontal and vertical lines."
      ),
      step(
        newVertical
          ? `A vertical line through (${x0}, ${y0}) has every point with x-coordinate ${x0}.`
          : `A horizontal line through (${x0}, ${y0}) has every point with y-coordinate ${y0}.`,
        "Equations of vertical and horizontal lines.",
        [{ label: "equation", answer }]
      ),
      step(`The equation is ${answer}.`, "Vertical and horizontal lines.", [{ label: "answer", answer }]),
    ],
    verify: { kind: "hvLine", axis, value },
  };
}

function makeSpecialSlope(rng: RNG): GeometryProblem {
  const vertical = rng() < 0.5;
  const x = randInt(rng, -6, 6);
  const y1 = randInt(rng, -6, 3);
  const y2 = y1 + randInt(rng, 2, 6);
  const z = randInt(rng, -6, 6);
  const answer = vertical ? "no slope" : "0";
  return {
    type: "GEO.7",
    subtype: "SpecialCaseSlope",
    prompt: vertical
      ? `Find the slope of the line through (${x}, ${y1}) and (${x}, ${y2}).`
      : `Find the slope of the line through (${y1}, ${z}) and (${y2}, ${z}).`,
    given: vertical ? { p1: `(${x}, ${y1})`, p2: `(${x}, ${y2})` } : { p1: `(${y1}, ${z})`, p2: `(${y2}, ${z})` },
    find: "slope",
    answer,
    steps: [
      step(
        vertical
          ? "The two points have the same x-coordinate, so the run in the slope formula is 0."
          : "The two points have the same y-coordinate, so the rise in the slope formula is 0.",
        "Slope Formula."
      ),
      step(
        vertical
          ? "Division by zero is not possible, so a vertical line is said to have no slope."
          : "Zero divided by a nonzero run is 0, so a horizontal line has slope 0.",
        "Slopes of vertical and horizontal lines.",
        [{ label: "slope", answer }]
      ),
      step(
        vertical ? "The line has no slope." : "The slope is 0.",
        "Special slopes.",
        [{ label: "answer", answer }]
      ),
    ],
    verify: { kind: "slopeSpecial", vertical },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const PAR_PERP_LINES_LESSON_POOL: MakerEntry[] = [
  M("PerpSlopeFromEquation", 1, (rng) => makeSlopeFromEquation(rng)),
  M("PerpSlopeFromPoints", 1, (rng) => makeSlopeFromPoints(rng)),
  M("WriteParallelPerpLine", 2, (rng) => makeWriteLineEquation(rng)),
  M("HorizontalVerticalLines", 3, (rng) => makeHorizontalVertical(rng)),
  M("SpecialCaseSlope", 3, (rng) => makeSpecialSlope(rng)),
];

export function generateParPerpLineProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? PAR_PERP_LINES_LESSON_POOL.filter((e) => only.includes(e.subtype)) : PAR_PERP_LINES_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

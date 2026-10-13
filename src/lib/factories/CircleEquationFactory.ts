// CircleEquationFactory.ts
// Topic 12: Equation of a Circle (TEKS G.12(E)).
// Lesson ch12-2. D1: write the standard-form equation from a center and a
// radius. D2: read the center and radius back from an equation. D3: complete
// the square from the general form, and write the equation from the endpoints
// of a diameter (the center is the midpoint, the radius is half the distance).
// Equation strings follow the geometry glyph conventions: superscript ² and
// the minus sign −, matching the Circle theorems lessons.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, pt, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

/** "(x − h)²" part for one variable; a center coordinate of 0 collapses to "x²". */
function varPart(v: "x" | "y", c: number): string {
  if (c === 0) return `${v}²`;
  return c > 0 ? `(${v} − ${c})²` : `(${v} + ${-c})²`;
}

function circleEq(h: number, k: number, r: number): string {
  return `${varPart("x", h)} + ${varPart("y", k)} = ${r * r}`;
}

/** A signed linear term for the general form, e.g. " + 6x" or " − 4y"; "" when 0. */
function linTerm(coef: number, v: "x" | "y"): string {
  if (coef === 0) return "";
  return coef > 0 ? ` + ${coef}${v}` : ` − ${-coef}${v}`;
}

function makeCircleEquationWrite(rng: RNG): GeometryProblem {
  const h = randInt(rng, -6, 6);
  const k = randInt(rng, -6, 6);
  const r = randInt(rng, 2, 9);
  const eq = circleEq(h, k, r);
  return {
    type: "GEO.12",
    subtype: "CircleEquationWrite",
    prompt: `Write the equation of a circle with center ${pt(h, k)} and radius ${r}.`,
    given: { center: pt(h, k), radius: r },
    find: "equation in standard form",
    answer: eq,
    steps: [
      step("The standard form of a circle is (x − h)² + (y − k)² = r², where (h, k) is the center and r is the radius.", "Standard form of a circle."),
      step(`Substitute h = ${h}, k = ${k}, and r = ${r}; the right side is r² = ${r * r}. Watch the signs: the equation subtracts h and k.`, "Substitution.", [
        { label: "equation", answer: eq },
      ]),
    ],
    verify: { kind: "circleEqWrite", h, k, r },
  };
}

function makeCircleEquationRead(rng: RNG): GeometryProblem {
  const h = randInt(rng, -6, 6);
  const k = randInt(rng, -6, 6);
  const r = randInt(rng, 2, 9);
  const eq = circleEq(h, k, r);
  const ans = `center ${pt(h, k)}, radius ${r}`;
  return {
    type: "GEO.12",
    subtype: "CircleEquationRead",
    prompt: `Find the center and radius of the circle with equation ${eq}.`,
    given: { equation: eq },
    find: "center and radius",
    answer: ans,
    steps: [
      step("Compare with the standard form (x − h)² + (y − k)² = r². The signs inside the parentheses are the opposite of the center coordinates.", "Standard form of a circle."),
      step(`The right side is ${r * r} = ${r}², so the radius is ${r}.`, "Radius is the square root of the right side.", [
        { label: "center", answer: pt(h, k) },
        { label: "radius", answer: String(r) },
      ]),
    ],
    verify: { kind: "circleEqRead", h, k, r },
  };
}

function makeCircleEquationGeneral(rng: RNG): GeometryProblem {
  let h = randInt(rng, -5, 5);
  let k = randInt(rng, -5, 5);
  if (h === 0 && k === 0) h = 3; // keep at least one linear term in the general form
  const r = randInt(rng, 2, 7);
  // General form: x² + y² + Dx + Ey + F = 0 with D = −2h, E = −2k, F = h² + k² − r².
  const D = -2 * h;
  const E = -2 * k;
  const F = h * h + k * k - r * r;
  const fTerm = F === 0 ? "" : F > 0 ? ` + ${F}` : ` − ${-F}`;
  const general = `x² + y²${linTerm(D, "x")}${linTerm(E, "y")}${fTerm} = 0`;
  const eq = circleEq(h, k, r);
  return {
    type: "GEO.12",
    subtype: "CircleEquationGeneral",
    prompt: `Write the equation ${general} in standard form by completing the square.`,
    given: { equation: general },
    find: "equation in standard form",
    answer: eq,
    steps: [
      step("Group the x terms and the y terms, move the constant to the right side, and complete the square on each group.", "Completing the square."),
      step(`For x: the coefficient is ${D}, half of it is ${-h}, and its square is ${h * h}. For y: the coefficient is ${E}, half of it is ${-k}, and its square is ${k * k}. Add both squares to the right side as well.`, "Add (b/2)² to both sides.", [
        { label: "x group", answer: varPart("x", h) },
        { label: "y group", answer: varPart("y", k) },
      ]),
      step(`Factored, the equation is ${eq}, a circle with center ${pt(h, k)} and radius ${r}.`, "Standard form of a circle.", [
        { label: "equation", answer: eq },
      ]),
    ],
    verify: { kind: "circleEqGeneral", D, E, F },
  };
}

function makeCircleEquationDiameter(rng: RNG): GeometryProblem {
  const h = randInt(rng, -3, 3);
  const k = randInt(rng, -3, 3);
  const [dx, dy] = pick(rng, [[3, 4], [4, 3], [5, 0], [0, 5], [-3, 4], [4, -3], [-4, -3], [3, -4]] as const);
  const x1 = h - dx, y1 = k - dy;
  const x2 = h + dx, y2 = k + dy;
  const r = Math.round(Math.hypot(2 * dx, 2 * dy) / 2);
  const eq = circleEq(h, k, r);
  return {
    type: "GEO.12",
    subtype: "CircleEquationDiameter",
    prompt: `The endpoints of a diameter of a circle are ${pt(x1, y1)} and ${pt(x2, y2)}. Write the equation of the circle.`,
    given: { endpoint1: pt(x1, y1), endpoint2: pt(x2, y2) },
    find: "equation in standard form",
    answer: eq,
    steps: [
      step("The center of the circle is the midpoint of the diameter, and the radius is half the length of the diameter.", "The center is the midpoint of a diameter."),
      step(`Center: ((${x1} + ${x2})/2, (${y1} + ${y2})/2) = ${pt(h, k)}.`, "Midpoint formula.", [
        { label: "center", answer: pt(h, k) },
      ]),
      step(`Diameter length: √((${2 * dx})² + (${2 * dy})²) = ${2 * r}, so the radius is ${r}. Substitute into the standard form.`, "Distance formula; standard form of a circle.", [
        { label: "equation", answer: eq },
      ]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "A", x: x1, y: y1 },
        { label: "B", x: x2, y: y2 },
        { label: "O", x: h, y: k },
      ],
      lines: [{ x1, y1, x2, y2 }],
    },
    verify: { kind: "circleEqDiameter", x1, y1, x2, y2 },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const CIRCLE_EQUATION_LESSON_POOL: MakerEntry[] = [
  M("CircleEquationWrite", 1, (rng) => makeCircleEquationWrite(rng)),
  M("CircleEquationRead", 2, (rng) => makeCircleEquationRead(rng)),
  M("CircleEquationGeneral", 3, (rng) => makeCircleEquationGeneral(rng)),
  M("CircleEquationDiameter", 3, (rng) => makeCircleEquationDiameter(rng)),
];

export function generateCircleEquationProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? CIRCLE_EQUATION_LESSON_POOL.filter((e) => only.includes(e.subtype)) : CIRCLE_EQUATION_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

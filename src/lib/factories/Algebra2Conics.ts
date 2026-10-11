// Algebra2Conics.ts
// A2.7 — Conic basics: circle equations (standard form ⇄ center/radius,
// completing the square from general form) and parabola equations (vertex
// form, focus/directrix, solving for `a` through a point). Includes ConicGraph
// diagram params (circle + parabola on a coordinate grid) for the
// web/PDF diagram duality.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem, Algebra2ConicSVGParams } from "./Algebra2Types";
import { randSigned, randNonZero, selectMakers } from "./Algebra2Helpers";

export type ConicSubtype =
  | "CircleEquation"
  | "CircleFromGeneral"
  | "ParabolaVertex"
  | "ParabolaFocusDirectrix"
  | "ParabolaFromPoint";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function circleLatex(h: number, k: number, r: number): string {
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  const yPart = k === 0 ? "y^2" : k > 0 ? `(y - ${k})^2` : `(y + ${-k})^2`;
  return `${xPart} + ${yPart} = ${r * r}`;
}

function conicGraph(circles?: { h: number; k: number; r: number }[], parabolas?: { h: number; k: number; a: number }[]): Algebra2ConicSVGParams {
  return { kind: "ConicGraph", circles, parabolas };
}

// ── D1: circle standard form from center & radius ─────────────────────────────

function makeCircleEquation(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 6);
  const k = randSigned(rng, 6);
  const r = randInt(rng, 2, 8);
  return {
    type: "A2.C",
    subtype: "CircleEquation",
    given: { center: `(${h}, ${k})`, radius: `${r}` },
    find: "equation in standard form",
    answer: circleLatex(h, k, r),
    steps: [
      {
        instruction: "Standard form is (x - h)^2 + (y - k)^2 = r^2. Substitute h, k, r:",
        reason: "Circle standard form",
        blanks: [{ label: "equation", answer: circleLatex(h, k, r) }],
      },
    ],
    svgParams: conicGraph([{ h, k, r }]),
    verify: { h, k, r },
  };
}

// ── D2/D3: circle from general form (complete the square) ─────────────────────

function makeCircleFromGeneral(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 6);
  const k = randSigned(rng, 6);
  const r = randInt(rng, 2, 7);
  // x^2 + y^2 + Dx + Ey + F = 0 with D = -2h, E = -2k, F = h^2 + k^2 - r^2
  const D = -2 * h;
  const E = -2 * k;
  const F = h * h + k * k - r * r;
  const terms: string[] = ["x^2 + y^2"];
  if (D !== 0) terms.push(`${D > 0 ? "+" : "-"} ${Math.abs(D)}x`);
  if (E !== 0) terms.push(`${E > 0 ? "+" : "-"} ${Math.abs(E)}y`);
  if (F !== 0) terms.push(`${F > 0 ? "+" : "-"} ${Math.abs(F)}`);
  const general = `${terms.join(" ")} = 0`;
  return {
    type: "A2.C",
    subtype: "CircleFromGeneral",
    given: { equation: general },
    find: "center and radius",
    answer: `center (${h}, ${k}), radius ${r}`,
    steps: [
      {
        instruction: "Group the x-terms and y-terms, then complete the square on each:",
        reason: "Completing the square",
        blanks: [
          { label: "(x - h)^2 form", answer: h === 0 ? "x^2" : `(x ${h > 0 ? "-" : "+"} ${Math.abs(h)})^2` },
          { label: "(y - k)^2 form", answer: k === 0 ? "y^2" : `(y ${k > 0 ? "-" : "+"} ${Math.abs(k)})^2` },
        ],
      },
      {
        instruction: "Read off the center (h, k) and radius r:",
        reason: "Read center and radius",
        blanks: [
          { label: "center", answer: `(${h}, ${k})` },
          { label: "radius", answer: `${r}` },
        ],
      },
    ],
    svgParams: conicGraph([{ h, k, r }]),
    verify: { h, k, r, D, E, F },
  };
}

// ── D1: parabola vertex form → vertex & direction ─────────────────────────────

function makeParabolaVertex(rng: RNG): Algebra2Problem {
  const a = pick(rng, [-2, -1, 1, 2]);
  const h = randSigned(rng, 5);
  const k = randSigned(rng, 5);
  const dir = a > 0 ? "up" : "down";
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  const eq = a === 1 ? `y = ${xPart} ${k < 0 ? "-" : "+"} ${Math.abs(k)}` : a === -1 ? `y = -${xPart} ${k < 0 ? "-" : "+"} ${Math.abs(k)}` : `y = ${a}${xPart} ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
  return {
    type: "A2.5",
    subtype: "ParabolaVertex",
    given: { equation: eq },
    find: "vertex and opening direction",
    answer: `vertex (${h}, ${k}), opens ${dir}`,
    steps: [
      {
        instruction: "Vertex form is y = a(x - h)^2 + k. Identify (h, k):",
        reason: "Vertex form",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: `Since a = ${a} ${a > 0 ? "> 0" : "< 0"}, the parabola opens ${dir}:`,
        reason: "Sign of a gives direction",
        blanks: [{ label: "direction", answer: dir }],
      },
    ],
    svgParams: conicGraph(undefined, [{ h, k, a }]),
    verify: { a, h, k },
  };
}

// ── D2: parabola from vertex & p → focus & directrix ──────────────────────────

function makeParabolaFocusDirectrix(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 4);
  const p = randNonZero(rng, -3, 3);
  const focus = `(${h}, ${k + p})`;
  const directrix = `y = ${k - p}`;
  const aFrac = p % 4 === 0 ? `${p / 4}` : `${p}/4`;
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  const eq = `4(${p})(y ${k < 0 ? "+" : "-"} ${Math.abs(k)}) = ${xPart}`;
  void aFrac;
  return {
    type: "A2.5",
    subtype: "ParabolaFocusDirectrix",
    given: {
      vertex: `(${h}, ${k})`,
      "focal length": `|p| = ${Math.abs(p)}`,
      orientation: "vertical",
      equation: eq,
    },
    find: "focus and directrix",
    answer: `focus ${focus}, directrix ${directrix}`,
    steps: [
      {
        instruction: `For a vertical parabola the focus is (h, k + p) = (${h}, ${k} + ${p}):`,
        reason: "Focus formula",
        blanks: [{ label: "focus", answer: focus }],
      },
      {
        instruction: `The directrix is the horizontal line y = k - p:`,
        reason: "Directrix formula",
        blanks: [{ label: "directrix", answer: directrix }],
      },
    ],
    svgParams: conicGraph(undefined, [{ h, k, a: 1 / (4 * p) }]),
    verify: { h, k, p },
  };
}

// ── D3: parabola through a point → solve for a ────────────────────────────────

function makeParabolaFromPoint(rng: RNG): Algebra2Problem {
  const h = randSigned(rng, 4);
  const k = randSigned(rng, 4);
  const a = pick(rng, [-2, -1, 1, 2]);
  const dx = randNonZero(rng, -3, 3);
  const x0 = h + dx;
  const y0 = k + a * dx * dx;
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  return {
    type: "A2.5",
    subtype: "ParabolaFromPoint",
    given: {
      vertex: `(${h}, ${k})`,
      point: `(${x0}, ${y0})`,
      form: "y = a(x - h)^2 + k",
    },
    find: "value of a and the equation",
    answer: `a = ${a}; y = ${a === 1 ? "" : a === -1 ? "-" : a}${xPart} ${k < 0 ? "-" : "+"} ${Math.abs(k)}`,
    steps: [
      {
        instruction: `Substitute the vertex and the point (${x0}, ${y0}) into y = a(x - h)^2 + k:`,
        reason: "Substitution",
        blanks: [{ label: "substituted", answer: `${y0} = a(${dx})^2 ${k < 0 ? "-" : "+"} ${Math.abs(k)}` }],
      },
      {
        instruction: "Solve for a, then write the equation:",
        reason: "Solve for a",
        blanks: [
          { label: "a", answer: `${a}` },
          { label: "equation", answer: `y = ${a === 1 ? "" : a === -1 ? "-" : a}${xPart} ${k < 0 ? "-" : "+"} ${Math.abs(k)}` },
        ],
      },
    ],
    svgParams: conicGraph(undefined, [{ h, k, a }]),
    verify: { a, h, k, x0, y0 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeCircleEquation },
  { minDifficulty: 1, make: makeParabolaVertex },
  { minDifficulty: 2, make: makeCircleFromGeneral },
  { minDifficulty: 2, make: makeParabolaFocusDirectrix },
  { minDifficulty: 2, make: makeParabolaVertex },
  { minDifficulty: 3, make: makeCircleFromGeneral },
  { minDifficulty: 3, make: makeParabolaFromPoint },
  { minDifficulty: 3, make: makeParabolaFocusDirectrix },
];

/** Generate n A2.5/A2.C (parabolas/circles) problems at the given cumulative difficulty tier.
 *  `only` optionally restricts to the named subtypes (lesson wiring). */
export function generateConicProblems(
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

export const CONIC_MAKERS = MAKERS;

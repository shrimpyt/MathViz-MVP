// Algebra2Cubic.ts
// A2.10, Cubic & cube root functions (10-1..10-3): transformations of
// g(x) = a(x - h)^3 + k and g(x) = a·∛(x - h) + k in the same a/h/k register
// as the other function families, and cube root equations solved by cubing
// both sides. Cubing is one-to-one on the reals, so, unlike squaring for
// square-root equations, it never introduces extraneous solutions, and the
// steps say so. Equations are constructed backwards from a chosen integer
// solution so answers are exact. Pure, seeded, cumulative difficulty 1|2|3.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { randSigned, fracToLatex, selectMakers } from "./Algebra2Helpers";

export type CubicSubtype =
  | "CubicTransformations"
  | "CubicWriteForm"
  | "CubeRootTransformations"
  | "CubeRootWriteForm"
  | "CubeRootEquations";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

// ── Transformation-form display ───────────────────────────────────────────────

/** a as a display prefix: "" for 1, "-" for -1, "3", or "1/2". */
function aPrefix(aNum: number, aDen: number): string {
  if (aDen === 1) return aNum === 1 ? "" : aNum === -1 ? "-" : `${aNum}`;
  return fracToLatex(aNum, aDen);
}

/** g(x) body for a(x - h)^3 + k (no "g(x) =" prefix). */
function cubicBody(aNum: number, aDen: number, h: number, k: number): string {
  const xPart = h === 0 ? "x^3" : h > 0 ? `(x - ${h})^3` : `(x + ${-h})^3`;
  const kPart = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  return `${aPrefix(aNum, aDen)}${xPart}${kPart}`;
}

/** g(x) body for a·∛(x - h) + k (no "g(x) =" prefix). */
function cubeRootBody(aNum: number, aDen: number, h: number, k: number): string {
  const inside = h === 0 ? "x" : h > 0 ? `x - ${h}` : `x + ${-h}`;
  const kPart = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  return `${aPrefix(aNum, aDen)}\\sqrt[3]{${inside}}${kPart}`;
}

/** Transformation phrases, in the same register as the quadratic family. */
function transformParts(aNum: number, aDen: number, h: number, k: number): string[] {
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

function pickA(rng: RNG, hard: 1 | 2 | 3): [number, number] {
  if (hard === 1) return [pick(rng, [1, -1, 2, -2]), 1];
  if (hard === 2)
    return pick(rng, [
      [3, 1],
      [-3, 1],
      [1, 2],
      [-1, 2],
      [2, 1],
      [-2, 1],
    ] as [number, number][]);
  return pick(rng, [
    [1, 3],
    [-1, 3],
    [2, 3],
    [-2, 3],
    [3, 2],
    [-3, 2],
    [1, 2],
    [-1, 2],
  ] as [number, number][]);
}

function pickHK(rng: RNG, hard: 1 | 2 | 3): [number, number] {
  const range = hard === 1 ? 4 : 5;
  let h = randInt(rng, -range, range);
  let k = randInt(rng, -range, range);
  if (h === 0 && k === 0) k = pick(rng, [1, -1, 2]);
  return [h, k];
}

// ── 10-1 / 10-2 Describe the transformations ──────────────────────────────────

function makeDescribe(
  rng: RNG,
  hard: 1 | 2 | 3,
  family: "cubic" | "cuberoot"
): Algebra2Problem {
  let [aNum, aDen] = pickA(rng, hard);
  const [h, k] = pickHK(rng, hard);
  if (aNum === 1 && aDen === 1 && h === 0 && k === 0) aNum = 2; // never the bare parent
  const body = family === "cubic" ? cubicBody(aNum, aDen, h, k) : cubeRootBody(aNum, aDen, h, k);
  const parent = family === "cubic" ? "f(x) = x^3" : "f(x) = \\sqrt[3]{x}";
  const formName =
    family === "cubic" ? "a(x - h)^3 + k" : "a\\sqrt[3]{x - h} + k";
  const parts = transformParts(aNum, aDen, h, k);
  const partsStr = parts.length > 0 ? parts.join("; ") : "no transformations";
  const answer = `${partsStr}; inflection point (${h}, ${k}); domain: all real numbers; range: all real numbers`;
  return {
    type: "A2.10",
    subtype: family === "cubic" ? "CubicTransformations" : "CubeRootTransformations",
    given: { parent, function: `g(x) = ${body}` },
    find: "the transformations from the parent function, the inflection point, and the domain and range",
    answer,
    steps: [
      {
        instruction: `Match g(x) to the transformation form ${formName} and read off a, h, and k:`,
        reason: "Transformation form",
        blanks: [
          { label: "a", answer: fracToLatex(aNum, aDen) },
          { label: "h", answer: `${h}` },
          { label: "k", answer: `${k}` },
        ],
      },
      {
        instruction:
          "The sign and size of a reflect and scale vertically; h and k shift the graph " +
          `(the inflection point of the parent, (0, 0), moves to (h, k)):`,
        reason: "Effects of a, h, and k",
        blanks: [
          { label: "transformations", answer: partsStr },
          { label: "inflection point", answer: `(${h}, ${k})` },
        ],
      },
      {
        instruction:
          family === "cubic"
            ? "A cubic function is defined for every real input and takes every real value:"
            : "Every real number has exactly one real cube root, so this function is defined for every real input and takes every real value:",
        reason:
          family === "cubic"
            ? "Domain and range of cubic functions"
            : "Domain and range of cube root functions",
        blanks: [{ label: "domain and range", answer: "all real numbers" }],
      },
    ],
    verify: { aNum, aDen, h, k },
  };
}

// ── 10-1 / 10-2 Write the equation from a description ─────────────────────────

function makeWriteForm(
  rng: RNG,
  hard: 2 | 3,
  family: "cubic" | "cuberoot"
): Algebra2Problem {
  const [aNum, aDen] = pickA(rng, hard === 2 ? 1 : 3);
  const [h, k] = pickHK(rng, 2);
  const body = family === "cubic" ? cubicBody(aNum, aDen, h, k) : cubeRootBody(aNum, aDen, h, k);
  const parent = family === "cubic" ? "f(x) = x^3" : "f(x) = \\sqrt[3]{x}";
  const description = transformParts(aNum, aDen, h, k).join("; ") || "no transformations";
  const answer = `g(x) = ${body}`;
  return {
    type: "A2.10",
    subtype: family === "cubic" ? "CubicWriteForm" : "CubeRootWriteForm",
    given: { parent, transformations: description },
    find: "the equation of the transformed function g(x) in transformation form",
    answer,
    steps: [
      {
        instruction:
          "Translate each phrase into a parameter: reflection/stretch or shrink gives a, " +
          "the horizontal shift gives h, and the vertical shift gives k:",
        reason: "Transformation parameters",
        blanks: [
          { label: "a", answer: fracToLatex(aNum, aDen) },
          { label: "h", answer: `${h}` },
          { label: "k", answer: `${k}` },
        ],
      },
      {
        instruction: `Substitute into ${family === "cubic" ? "g(x) = a(x - h)^3 + k" : "g(x) = a\\sqrt[3]{x - h} + k"} (remember that shifting left means h is negative, so x - h becomes x + |h|):`,
        reason: "Transformation form",
        blanks: [{ label: "equation", answer }],
      },
    ],
    verify: { aNum, aDen, h, k },
  };
}

// ── 10-3 Cube root equations ──────────────────────────────────────────────────

/** Linear expression ax + b as display text. */
function linearStr(a: number, b: number): string {
  const xPart = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
  if (b === 0) return xPart;
  return `${xPart} ${b > 0 ? "+" : "-"} ${Math.abs(b)}`;
}

function makeCubeRootEquation(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  const kind =
    hard === 1
      ? pick(rng, ["simple", "linear", "power"] as const)
      : hard === 2
        ? pick(rng, ["linear", "twoStep"] as const)
        : pick(rng, ["twoStep", "bothSides"] as const);

  if (kind === "power") {
    const c = randSigned(rng, 6);
    const n = c * c * c;
    return {
      type: "A2.10",
      subtype: "CubeRootEquations",
      given: { equation: `x^3 = ${n}` },
      find: "solution",
      answer: `x = ${c}`,
      steps: [
        {
          instruction: "Take the cube root of both sides; every real number has exactly one real cube root:",
          reason: "Cube root: the inverse of cubing",
          blanks: [{ label: "solution", answer: `x = ${c}` }],
        },
      ],
      verify: { kind: "power", x: c, n },
    };
  }

  if (kind === "simple") {
    const c = randSigned(rng, 6);
    return {
      type: "A2.10",
      subtype: "CubeRootEquations",
      given: { equation: `\\sqrt[3]{x} = ${c}` },
      find: "solution",
      answer: `x = ${c * c * c}`,
      steps: [
        {
          instruction: "Cube both sides to clear the cube root:",
          reason: "Cubing both sides (one-to-one: no extraneous solutions)",
          blanks: [{ label: "solution", answer: `x = ${c * c * c}` }],
        },
      ],
      verify: { kind: "simple", x: c * c * c, c },
    };
  }

  if (kind === "linear") {
    // ∛(ax + b) = c, built backwards from the solution x0.
    const x0 = randInt(rng, -6, 6);
    const a = pick(rng, hard === 1 ? [1, 2] : [1, 2, 3, -2]);
    const c = randSigned(rng, 4);
    const b = c * c * c - a * x0;
    const inside = linearStr(a, b);
    return {
      type: "A2.10",
      subtype: "CubeRootEquations",
      given: { equation: `\\sqrt[3]{${inside}} = ${c}` },
      find: "solution",
      answer: `x = ${x0}`,
      steps: [
        {
          instruction: "Cube both sides to clear the cube root:",
          reason: "Cubing both sides (one-to-one: no extraneous solutions)",
          blanks: [{ label: "cubed equation", answer: `${inside} = ${c * c * c}` }],
        },
        {
          instruction: "Solve the resulting linear equation:",
          reason: "Inverse operations",
          blanks: [{ label: "solution", answer: `x = ${x0}` }],
        },
        {
          instruction:
            "No extraneous-root check is needed: unlike squaring, cubing is one-to-one on the reals, " +
            "so it can never create a solution that was not already there:",
          reason: "Why cubing needs no check",
          blanks: [{ label: "solution set", answer: `x = ${x0}` }],
        },
      ],
      verify: { kind: "linear", x: x0, a, b, c },
    };
  }

  if (kind === "twoStep") {
    // a·∛(x + b) + d = e, built backwards: isolated value t, solution x0 = t^3 - b.
    const t = randSigned(rng, 4);
    const b = randSigned(rng, 9);
    const a = pick(rng, [2, 3, -2]);
    const d = randSigned(rng, 9);
    const e = a * t + d;
    const x0 = t * t * t - b;
    const inside = linearStr(1, b);
    const aPart = a === 1 ? "" : `${a}`;
    const eqStr = `${aPart}\\sqrt[3]{${inside}} ${d > 0 ? "+" : "-"} ${Math.abs(d)} = ${e}`;
    return {
      type: "A2.10",
      subtype: "CubeRootEquations",
      given: { equation: eqStr },
      find: "solution",
      answer: `x = ${x0}`,
      steps: [
        {
          instruction: `Undo the outside operations first: subtract ${d} from both sides, then divide by ${a} to isolate the cube root:`,
          reason: "Isolate the cube root",
          blanks: [{ label: "isolated equation", answer: `\\sqrt[3]{${inside}} = ${t}` }],
        },
        {
          instruction: "Cube both sides to clear the cube root:",
          reason: "Cubing both sides (one-to-one: no extraneous solutions)",
          blanks: [{ label: "cubed equation", answer: `${inside} = ${t * t * t}` }],
        },
        {
          instruction: "Solve the resulting linear equation. No check for extraneous roots is needed, cubing is one-to-one, unlike squaring:",
          reason: "Inverse operations; cubing creates no extraneous solutions",
          blanks: [{ label: "solution", answer: `x = ${x0}` }],
        },
      ],
      verify: { kind: "twoStep", x: x0, a, b, d, e, t },
    };
  }

  // bothSides: ∛(a1x + b1) = ∛(a2x + b2), built backwards from x0.
  const x0 = randInt(rng, -5, 5);
  const a1 = randInt(rng, 1, 4);
  let a2 = randInt(rng, 1, 4);
  if (a2 === a1) a2 = a1 === 4 ? 3 : a1 + 1;
  const b1 = randSigned(rng, 8);
  const b2 = b1 + (a1 - a2) * x0;
  const left = linearStr(a1, b1);
  const right = linearStr(a2, b2);
  return {
    type: "A2.10",
    subtype: "CubeRootEquations",
    given: { equation: `\\sqrt[3]{${left}} = \\sqrt[3]{${right}}` },
    find: "solution",
    answer: `x = ${x0}`,
    steps: [
      {
        instruction: "Cube both sides; the cube roots clear and the radicands must be equal:",
        reason: "Cubing both sides (one-to-one: no extraneous solutions)",
        blanks: [{ label: "cubed equation", answer: `${left} = ${right}` }],
      },
      {
        instruction: "Solve the resulting linear equation:",
        reason: "Inverse operations",
        blanks: [{ label: "solution", answer: `x = ${x0}` }],
      },
    ],
    verify: { kind: "bothSides", x: x0, a: a1, b: b1, c: a2, d: b2 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeDescribe(rng, 1, "cubic") },
  { minDifficulty: 1, make: (rng) => makeDescribe(rng, 1, "cuberoot") },
  { minDifficulty: 1, make: (rng) => makeCubeRootEquation(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeDescribe(rng, 2, "cubic") },
  { minDifficulty: 2, make: (rng) => makeDescribe(rng, 2, "cuberoot") },
  { minDifficulty: 2, make: (rng) => makeWriteForm(rng, 2, "cubic") },
  { minDifficulty: 2, make: (rng) => makeWriteForm(rng, 2, "cuberoot") },
  { minDifficulty: 2, make: (rng) => makeCubeRootEquation(rng, 2) },
  { minDifficulty: 3, make: (rng) => makeDescribe(rng, 3, "cubic") },
  { minDifficulty: 3, make: (rng) => makeDescribe(rng, 3, "cuberoot") },
  { minDifficulty: 3, make: (rng) => makeWriteForm(rng, 3, "cubic") },
  { minDifficulty: 3, make: (rng) => makeWriteForm(rng, 3, "cuberoot") },
  { minDifficulty: 3, make: (rng) => makeCubeRootEquation(rng, 3) },
];

/** Generate n A2.10 (T10 cubic & cube root functions) problems at the given
 *  cumulative difficulty tier. `only` optionally restricts to the named
 *  subtypes (lesson wiring). */
export function generateCubicProblems(
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

export const CUBIC_MAKERS = MAKERS;

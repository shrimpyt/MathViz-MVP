// RegularPolygonAreaFactory.ts
// Topic 13: Area of Regular Polygons (TEKS G.11(A)).
// Lesson ch13-3, beside ch13-1 (area of parallelograms and triangles) and
// ch13-2 (effects of dimensional change). A regular polygon splits into n
// congruent triangles from its center, giving A = (1/2) a P, where a is the
// apothem and P is the perimeter. D1: apply the formula with the apothem
// given, or with the perimeter given. D2: find the apothem first, using the
// central angle and trigonometry (the hexagon and the square, whose
// apothems come from the 30-60-90 and 45-45-90 triangles). D3: composite
// problems, a regular polygon inside a shaded region or two polygons
// combined.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, num, round2, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

const GIVEN_APOTHEM = [
  { n: 5, name: "regular pentagon", s: 8, a: 5.51 },
  { n: 6, name: "regular hexagon", s: 10, a: 8.66 },
  { n: 8, name: "regular octagon", s: 6, a: 7.24 },
  { n: 9, name: "regular nonagon", s: 5, a: 6.87 },
  { n: 10, name: "regular decagon", s: 4, a: 6.16 },
  { n: 12, name: "regular dodecagon", s: 3, a: 5.6 },
] as const;

function makeRegPolyApothemGiven(rng: RNG): GeometryProblem {
  const c = pick(rng, GIVEN_APOTHEM);
  const perim = c.n * c.s;
  const area = round2(0.5 * c.a * perim);
  return {
    type: "GEO.13",
    subtype: "RegPolyApothemGiven",
    prompt: `Find the area of a ${c.name} with side length ${c.s} and apothem ${c.a}. Round to the nearest hundredth.`,
    given: { sides: c.n, sideLength: c.s, apothem: c.a },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("Join the center to the vertices; the polygon splits into n congruent triangles, each with base s and height equal to the apothem.", "Regular polygons decompose into congruent triangles."),
      step(`Perimeter P = ${c.n} × ${c.s} = ${perim}.`, "Perimeter of a regular polygon.", [
        { label: "P", answer: String(perim) },
      ]),
      step(`A = (1/2) × apothem × perimeter = (1/2) × ${c.a} × ${perim} = ${num(area)}.`, "Area of a Regular Polygon (A = (1/2) a P).", [
        { label: "A", answer: num(area) },
      ]),
    ],
    verify: { kind: "regPolyArea", n: c.n, s: c.s, a: c.a },
  };
}

function makeRegPolyPerimeterGiven(rng: RNG): GeometryProblem {
  const n = pick(rng, [5, 6, 7, 8, 9, 10, 12]);
  const s = randInt(rng, 3, 12);
  const P = n * s;
  const aChoices = [3.44, 4.13, 5.51, 6.88, 8.26, 9.64];
  const a = pick(rng, aChoices);
  const area = round2(0.5 * a * P);
  return {
    type: "GEO.13",
    subtype: "RegPolyPerimeterGiven",
    prompt: `A regular polygon with ${n} sides has a perimeter of ${P} and an apothem of ${a}. Find its area. Round to the nearest hundredth.`,
    given: { sides: n, perimeter: P, apothem: a },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("The area of a regular polygon is half the apothem times the perimeter; both values are given, so no side length is needed.", "Area of a Regular Polygon (A = (1/2) a P)."),
      step(`A = (1/2) × ${a} × ${P} = ${num(area)}.`, "Substitution.", [
        { label: "A", answer: num(area) },
      ]),
    ],
    verify: { kind: "regPolyAreaP", a, P },
  };
}

function makeRegPolyHexagonTrig(rng: RNG): GeometryProblem {
  const s = randInt(rng, 2, 12);
  const apothem = round2((s * Math.sqrt(3)) / 2);
  const area = round2(1.5 * Math.sqrt(3) * s * s);
  return {
    type: "GEO.13",
    subtype: "RegPolyHexagonTrig",
    prompt: `Find the area of a regular hexagon with side length ${s}. Use trigonometry to find the apothem first. Round to the nearest hundredth.`,
    given: { sides: 6, sideLength: s },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("The central angle is 360° ÷ 6 = 60°, and half of it is 30°. The apothem, half a side, and a radius form a 30-60-90 triangle.", "Central angle of a regular polygon."),
      step(`In the 30-60-90 triangle, tan(30°) = (s/2) / apothem, so the apothem is (s/2) / tan(30°) = ${s} × √3 / 2 ≈ ${num(apothem)}.`, "Trigonometric ratio for the apothem.", [
        { label: "apothem", answer: num(apothem) },
      ]),
      step(`Perimeter P = 6 × ${s} = ${6 * s}, so A = (1/2) × ${num(apothem)} × ${6 * s} ≈ ${num(area)}.`, "Area of a Regular Polygon (A = (1/2) a P).", [
        { label: "A", answer: num(area) },
      ]),
    ],
    verify: { kind: "regPolyHex", s },
  };
}

function makeRegPolySquareTrig(rng: RNG): GeometryProblem {
  const s = randInt(rng, 3, 16);
  const aStr = num(s / 2);
  const ans = `a = ${aStr}, A = ${s * s}`;
  return {
    type: "GEO.13",
    subtype: "RegPolySquareTrig",
    prompt: `A square has side length ${s}. Use the central angle and trigonometry to find the apothem, then find the area of the square using A = (1/2) a P.`,
    given: { sides: 4, sideLength: s },
    find: "apothem and area",
    answer: ans,
    steps: [
      step("The central angle of a square is 360° ÷ 4 = 90°; half of it is 45°, so the apothem, half a side, and a radius form a 45-45-90 triangle.", "Central angle of a regular polygon."),
      step(`tan(45°) = 1, so the apothem equals half the side: a = ${s} / 2 = ${aStr}.`, "Trigonometric ratio for the apothem.", [
        { label: "a", answer: aStr },
      ]),
      step(`P = 4 × ${s} = ${4 * s}, so A = (1/2) × ${aStr} × ${4 * s} = ${s * s}.`, "Area of a Regular Polygon (A = (1/2) a P).", [
        { label: "A", answer: String(s * s) },
      ]),
    ],
    verify: { kind: "regPolySquare", s },
  };
}

function makeRegPolyShaded(rng: RNG): GeometryProblem {
  const c = pick(rng, GIVEN_APOTHEM);
  const polyArea = round2(0.5 * c.a * c.n * c.s);
  const W = randInt(rng, 24, 34);
  const H = randInt(rng, 20, 30);
  const remaining = round2(W * H - polyArea);
  return {
    type: "GEO.13",
    subtype: "RegPolyShaded",
    prompt: `A rectangular garden measures ${W} by ${H} feet. A flower bed shaped like a ${c.name} with side length ${c.s} feet and apothem ${c.a} feet is planted in the middle. Find the area of the garden that is not part of the flower bed. Round to the nearest hundredth.`,
    given: { W, H, sides: c.n, sideLength: c.s, apothem: c.a },
    find: "area outside the flower bed",
    answer: num(remaining),
    unit: "square units",
    steps: [
      step("Find the area of the whole rectangle, then subtract the area of the polygonal bed.", "Shaded regions: subtract the removed part."),
      step(`Rectangle: ${W} × ${H} = ${W * H}. Polygon: (1/2) × ${c.a} × (${c.n} × ${c.s}) = ${num(polyArea)}.`, "Area formulas for the parts.", [
        { label: "polygon area", answer: num(polyArea) },
      ]),
      step(`Remaining = ${W * H} − ${num(polyArea)} = ${num(remaining)}.`, "Subtraction.", [
        { label: "A", answer: num(remaining) },
      ]),
    ],
    verify: { kind: "regPolyShaded", W, H, n: c.n, s: c.s, a: c.a },
  };
}

function makeRegPolyTwoPolygons(rng: RNG): GeometryProblem {
  const q = randInt(rng, 4, 12);
  const c = pick(rng, GIVEN_APOTHEM);
  const total = round2(q * q + 0.5 * c.a * c.n * c.s);
  return {
    type: "GEO.13",
    subtype: "RegPolyTwoPolygons",
    prompt: `A patio is made of a square section with side length ${q} joined to a ${c.name} section with side length ${c.s} and apothem ${c.a}. Find the total area of the patio. Round to the nearest hundredth.`,
    given: { squareSide: q, sides: c.n, sideLength: c.s, apothem: c.a },
    find: "total area",
    answer: num(total),
    unit: "square units",
    steps: [
      step("Split the composite figure into the square and the regular polygon, and add the areas.", "Composite figures: add the parts."),
      step(`Square: ${q}² = ${q * q}. Polygon: (1/2) × ${c.a} × (${c.n} × ${c.s}) = ${num(round2(0.5 * c.a * c.n * c.s))}.`, "Area formulas for the parts.", [
        { label: "polygon area", answer: num(round2(0.5 * c.a * c.n * c.s)) },
      ]),
      step(`Total = ${q * q} + ${num(round2(0.5 * c.a * c.n * c.s))} = ${num(total)}.`, "Add the parts.", [
        { label: "A", answer: num(total) },
      ]),
    ],
    verify: { kind: "regPolySum", q, n: c.n, s: c.s, a: c.a },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const REGULAR_POLYGON_AREA_LESSON_POOL: MakerEntry[] = [
  M("RegPolyApothemGiven", 1, (rng) => makeRegPolyApothemGiven(rng)),
  M("RegPolyPerimeterGiven", 1, (rng) => makeRegPolyPerimeterGiven(rng)),
  M("RegPolyHexagonTrig", 2, (rng) => makeRegPolyHexagonTrig(rng)),
  M("RegPolySquareTrig", 2, (rng) => makeRegPolySquareTrig(rng)),
  M("RegPolyShaded", 3, (rng) => makeRegPolyShaded(rng)),
  M("RegPolyTwoPolygons", 3, (rng) => makeRegPolyTwoPolygons(rng)),
];

export function generateRegularPolygonAreaProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? REGULAR_POLYGON_AREA_LESSON_POOL.filter((e) => only.includes(e.subtype)) : REGULAR_POLYGON_AREA_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

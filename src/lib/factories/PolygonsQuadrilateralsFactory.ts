// PolygonsQuadrilateralsFactory.ts
// Topic 6: Polygons and Quadrilaterals (TEKS G.5(A), G.6(E)).
//
// Lesson ch6-1: the Polygon Angle-Sum Theorems. The interior sum is always
// DERIVED in the steps (draw the diagonals from one vertex → n − 2 triangles),
// never just quoted. Regular vs irregular is kept sharp: equal-angle shortcuts
// are used only when the problem says "regular"; irregular polygons get
// sum-and-subtract treatment. Exterior sum is always 360°.
// Chapter-test pool: parallelogram properties (opposite sides/angles,
// consecutive angles supplementary, diagonals bisect), rectangle diagonals
// congruent, rhombus diagonals perpendicular + angle-bisecting, trapezoid
// midsegment, kite angles, and classification.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem, GeoPt } from "./GeometryTypes";
import {
  M, step, sampleFromPool, pickTriple,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

const POLY_NAMES: Record<number, string> = {
  5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon",
  10: "decagon", 11: "undecagon", 12: "dodecagon",
};

/** Regular n-gon vertices centered at (100, 104), radius 72, labels A, B, C… */
function regularVertices(n: number): GeoPt[] {
  const pts: GeoPt[] = [];
  for (let i = 0; i < n; i++) {
    const ang = ((-90 + (i * 360) / n) * Math.PI) / 180;
    pts.push({
      label: String.fromCharCode(65 + i),
      x: Math.round(100 + 72 * Math.cos(ang)),
      y: Math.round(104 + 72 * Math.sin(ang)),
    });
  }
  return pts;
}

function diagonalsFromVertex0(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 2; i < n - 1; i++) out.push([0, i]);
  return out;
}

// ── Lesson makers: angle sums ─────────────────────────────────────────────────

function makeInteriorSum(rng: RNG): GeometryProblem {
  const n = randInt(rng, 5, 12);
  const sum = (n - 2) * 180;
  return {
    type: "GEO.6",
    subtype: "InteriorSum",
    prompt: `Find the sum of the measures of the interior angles of a ${POLY_NAMES[n]}.`,
    given: { sides: n },
    find: "sum of interior angles",
    answer: `${sum}°`,
    steps: [
      step(`Draw all diagonals from one vertex. They divide the ${POLY_NAMES[n]} into ${n} − 2 = ${n - 2} triangles.`, "Triangulation of a polygon."),
      step("The angles of each triangle sum to 180°, and those angles exactly fill the interior angles.", "Triangle Angle-Sum Theorem."),
      step(`Sum = (n − 2) × 180° = (${n} − 2) × 180°.`, "Polygon Interior Angle-Sum Theorem.", [
        { label: "(n − 2)", answer: String(n - 2) },
      ]),
      step(`Sum = ${sum}°.`, "Arithmetic.", [{ label: "sum", answer: `${sum}°` }]),
    ],
    svgParams: { kind: "PolygonFigure", vertices: regularVertices(n), diagonals: diagonalsFromVertex0(n) },
    verify: { kind: "interiorSum", n },
  };
}

function makeRegularInterior(rng: RNG): GeometryProblem {
  const choices = [5, 6, 8, 9, 10, 12];
  const n = pick(rng, choices);
  const sum = (n - 2) * 180;
  const each = sum / n;
  return {
    type: "GEO.6",
    subtype: "RegularInteriorAngle",
    prompt: `Find the measure of one interior angle of a regular ${POLY_NAMES[n]}.`,
    given: { sides: n, regular: "regular" },
    find: "one interior angle",
    answer: `${each}°`,
    steps: [
      step(`The interior angles sum to (n − 2) × 180° = ${sum}°.`, "Polygon Interior Angle-Sum Theorem."),
      step("A regular polygon has all angles congruent, so divide the sum equally.", "Definition of regular polygon."),
      step(`${sum}° ÷ ${n} = ${each}°.`, "Division.", [{ label: "each angle", answer: `${each}°` }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: regularVertices(n),
      angleLabels: { A: `${each}°` },
    },
    verify: { kind: "regularInterior", n },
  };
}

function makeExteriorN(rng: RNG): GeometryProblem {
  const pairs: [number, number][] = [
    [90, 4], [60, 6], [45, 8], [40, 9], [36, 10], [30, 12],
    [24, 15], [20, 18], [18, 20], [15, 24], [120, 3], [72, 5],
  ];
  const [ext, n] = pick(rng, pairs);
  const findN = rng() < 0.5;
  if (findN) {
    return {
      type: "GEO.6",
      subtype: "ExteriorFromN",
      prompt: `Each exterior angle of a regular polygon measures ${ext}°. How many sides does the polygon have?`,
      given: { exteriorAngle: ext },
      find: "number of sides",
      answer: String(n),
      steps: [
        step("The sum of the exterior angles of any convex polygon, one at each vertex, is always 360°.", "Polygon Exterior Angle-Sum Theorem."),
        step("In a regular polygon all exterior angles are congruent, so each one is 360° ÷ n.", "Definition of regular polygon."),
        step(`n = 360° ÷ ${ext}° = ${n}.`, "Division.", [{ label: "n", answer: String(n) }]),
      ],
      svgParams: { kind: "PolygonFigure", vertices: regularVertices(n) },
      verify: { kind: "exteriorN", ext },
    };
  }
  return {
    type: "GEO.6",
    subtype: "ExteriorFromN",
    prompt: `Find the measure of one exterior angle of a regular ${POLY_NAMES[n] ?? n + "-gon"} with ${n} sides.`,
    given: { sides: n },
    find: "one exterior angle",
    answer: `${ext}°`,
    steps: [
      step("The exterior angles of any convex polygon sum to 360°.", "Polygon Exterior Angle-Sum Theorem."),
      step("A regular polygon's exterior angles are all congruent.", "Definition of regular polygon."),
      step(`Each exterior angle = 360° ÷ ${n} = ${ext}°.`, "Division.", [{ label: "angle", answer: `${ext}°` }]),
    ],
    svgParams: { kind: "PolygonFigure", vertices: regularVertices(n) },
    verify: { kind: "exteriorEach", n },
  };
}

function makeFindMissingInterior(rng: RNG): GeometryProblem {
  const n = pick(rng, [5, 6]);
  const sum = (n - 2) * 180;
  // Choose the missing angle FIRST, then split the rest among the known
  // angles — constructing it the other way can leave a negative "missing".
  const missing = randInt(rng, 75, 140);
  const known: number[] = [];
  let rest = sum - missing;
  for (let i = 0; i < n - 2; i++) {
    const slotsLeft = n - 2 - i;
    const lo = Math.max(70, rest - 145 * slotsLeft);
    const hi = Math.min(145, rest - 70 * slotsLeft);
    const a = randInt(rng, lo, Math.max(lo, hi));
    known.push(a);
    rest -= a;
  }
  known.push(rest);
  const knownSum = known.reduce((s, v) => s + v, 0);
  return {
    type: "GEO.6",
    subtype: "MissingInteriorAngle",
    prompt: `An irregular ${POLY_NAMES[n]} has interior angles measuring ${known.map((a) => a + "°").join(", ")}, and one unknown angle. Find the measure of the unknown angle.`,
    given: { angles: known.join(", ") },
    find: "the unknown interior angle",
    answer: `${missing}°`,
    steps: [
      step(`First find the total: the interior angles of a ${POLY_NAMES[n]} sum to (n − 2) × 180° = ${sum}°.`, "Polygon Interior Angle-Sum Theorem."),
      step("The polygon is irregular, so the angles are not equal — subtract the known angles from the total.", "Irregular polygon: use the sum, not division."),
      step(`Known angles sum to ${knownSum}°. Unknown = ${sum}° − ${knownSum}° = ${missing}°.`, "Subtraction.", [
        { label: "unknown", answer: `${missing}°` },
      ]),
    ],
    svgParams: { kind: "PolygonFigure", vertices: regularVertices(n), angleLabels: { A: "?" } },
    verify: { kind: "missingInterior", n, known },
  };
}

function makeSidesFromSum(rng: RNG): GeometryProblem {
  const n = randInt(rng, 5, 14);
  const sum = (n - 2) * 180;
  return {
    type: "GEO.6",
    subtype: "SidesFromSum",
    prompt: `The sum of the measures of the interior angles of a convex polygon is ${sum}°. How many sides does the polygon have?`,
    given: { interiorSum: sum },
    find: "number of sides",
    answer: String(n),
    steps: [
      step("The interior angle sum is (n − 2) × 180°.", "Polygon Interior Angle-Sum Theorem."),
      step(`Set up: (n − 2) × 180 = ${sum}.`, "Substitution.", [{ label: "equation", answer: `(n − 2) × 180 = ${sum}` }]),
      step(`n − 2 = ${sum} ÷ 180 = ${n - 2}, so n = ${n}.`, "Division and Addition Properties of Equality.", [
        { label: "n", answer: String(n) },
      ]),
    ],
    svgParams: { kind: "PolygonFigure", vertices: regularVertices(Math.min(n, 12)) },
    verify: { kind: "sidesFromSum", sum },
  };
}

// ── Chapter-test makers: quadrilaterals ───────────────────────────────────────

const PARA_VERTS: GeoPt[] = [
  { label: "A", x: 42, y: 152 },
  { label: "B", x: 72, y: 52 },
  { label: "C", x: 168, y: 52 },
  { label: "D", x: 138, y: 152 },
];

function makeParallelogramSides(rng: RNG, difficulty: Difficulty): GeometryProblem {
  if (difficulty >= 2) {
    const x = randInt(rng, 3, 10);
    const ab = 2 * x + 3;
    const cdExpr = `4x − ${4 * x - ab}`;
    return {
      type: "GEO.6",
      subtype: "ParallelogramSides",
      prompt: `In parallelogram ABCD, AB = 2x + 3 and CD = ${cdExpr}. Find x and AB.`,
      given: { AB: "2x + 3", CD: cdExpr },
      find: "x and AB",
      answer: `x = ${x}, AB = ${ab}`,
      steps: [
        step("Opposite sides of a parallelogram are congruent.", "Parallelogram Opposite Sides Theorem."),
        step(`AB = CD: 2x + 3 = ${cdExpr}.`, "Substitution.", [{ label: "equation", answer: `2x + 3 = ${cdExpr}` }]),
        step(`x = ${x}.`, "Addition/Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`AB = 2(${x}) + 3 = ${ab}.`, "Substitution.", [{ label: "AB", answer: String(ab) }]),
      ],
      svgParams: { kind: "PolygonFigure", vertices: PARA_VERTS, sideLabels: { AB: "2x + 3", CD: cdExpr } },
      verify: { kind: "paraSidesAlg", x },
    };
  }
  const w = randInt(rng, 5, 14);
  const h = randInt(rng, 4, 11);
  return {
    type: "GEO.6",
    subtype: "ParallelogramSides",
    prompt: `A parallelogram has side lengths ${w} and ${h}. Find its perimeter.`,
    given: { side1: w, side2: h },
    find: "perimeter",
    answer: String(2 * (w + h)),
    steps: [
      step("Opposite sides of a parallelogram are congruent, so the side lengths are w, h, w, h.", "Parallelogram Opposite Sides Theorem."),
      step(`Perimeter = 2(${w} + ${h}) = ${2 * (w + h)}.`, "Perimeter formula.", [{ label: "P", answer: String(2 * (w + h)) }]),
    ],
    svgParams: { kind: "PolygonFigure", vertices: PARA_VERTS, sideLabels: { BC: String(w), AB: String(h) } },
    verify: { kind: "paraPerim", w, h },
  };
}

function makeParallelogramAngles(rng: RNG): GeometryProblem {
  const a = randInt(rng, 35, 145);
  const supp = 180 - a;
  const askOpp = rng() < 0.5;
  return {
    type: "GEO.6",
    subtype: "ParallelogramAngles",
    prompt: askOpp
      ? `In parallelogram ABCD, m∠A = ${a}°. Find m∠C and m∠B.`
      : `In parallelogram ABCD, m∠A = ${a}°. Find m∠B and m∠D.`,
    given: { angleA: a },
    find: askOpp ? "m∠C and m∠B" : "m∠B and m∠D",
    answer: askOpp ? `m∠C = ${a}°, m∠B = ${supp}°` : `m∠B = ${supp}°, m∠D = ${supp}°`,
    steps: [
      step("Opposite angles of a parallelogram are congruent; consecutive angles are supplementary.", "Parallelogram Opposite Angles Theorem; Consecutive Angles (same-side interior) are supplementary."),
      step(
        askOpp
          ? `∠C is opposite ∠A, so m∠C = ${a}°. ∠B is consecutive to ∠A, so m∠B = 180° − ${a}°.`
          : `∠B is consecutive to ∠A, so m∠B = 180° − ${a}° = ${supp}°. ∠D is opposite ∠B, so m∠D = m∠B = ${supp}°.`,
        "Apply both angle relationships."
      ),
      step(askOpp ? `m∠C = ${a}° and m∠B = ${supp}°.` : `m∠B = ${supp}° and m∠D = ${supp}°.`, "Subtraction.", [
        { label: "answer", answer: askOpp ? `${a}°, ${supp}°` : `${supp}°, ${supp}°` },
      ]),
    ],
    svgParams: { kind: "PolygonFigure", vertices: PARA_VERTS, angleLabels: { A: `${a}°` } },
    verify: { kind: "paraAngles", a, askOpp },
  };
}

function makeParallelogramDiagonals(rng: RNG): GeometryProblem {
  const half = randInt(rng, 4, 12);
  const whole = 2 * half;
  const askWholeDiag = rng() < 0.5;
  return {
    type: "GEO.6",
    subtype: "ParallelogramDiagonals",
    prompt: askWholeDiag
      ? `In parallelogram ABCD, the diagonals intersect at E. If AE = ${half}, find AC.`
      : `In parallelogram ABCD, the diagonals intersect at E. If AC = ${whole}, find AE.`,
    given: askWholeDiag ? { AE: half } : { AC: whole },
    find: askWholeDiag ? "AC" : "AE",
    answer: askWholeDiag ? String(whole) : String(half),
    steps: [
      step("The diagonals of a parallelogram bisect each other.", "Parallelogram Diagonals Theorem."),
      step(
        askWholeDiag ? `AC = 2 × AE = 2 × ${half}.` : `AE = ½ × AC = ½ × ${whole}.`,
        "The intersection point is the midpoint of each diagonal."
      ),
      step(askWholeDiag ? `AC = ${whole}.` : `AE = ${half}.`, "Arithmetic.", [
        { label: askWholeDiag ? "AC" : "AE", answer: askWholeDiag ? String(whole) : String(half) },
      ]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: PARA_VERTS,
      diagonals: [[0, 2], [1, 3]],
      center: { x: 105, y: 102, label: "E" },
    },
    verify: { kind: "paraDiag", half, askWholeDiag },
  };
}

function makeRectangleDiagonals(rng: RNG): GeometryProblem {
  const x = randInt(rng, 3, 10);
  const len = 3 * x + 1;
  const bdExpr = `5x − ${5 * x - len}`;
  return {
    type: "GEO.6",
    subtype: "RectangleDiagonals",
    prompt: `In rectangle ABCD, AC = 3x + 1 and BD = ${bdExpr}. Find x and the length of each diagonal.`,
    given: { AC: "3x + 1", BD: bdExpr },
    find: "x and diagonal length",
    answer: `x = ${x}, diagonals = ${len}`,
    steps: [
      step("A rectangle is a parallelogram whose diagonals are congruent.", "Rectangle Diagonals Theorem."),
      step(`AC = BD: 3x + 1 = ${bdExpr}.`, "Substitution.", [{ label: "equation", answer: `3x + 1 = ${bdExpr}` }]),
      step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
      step(`AC = 3(${x}) + 1 = ${len}.`, "Substitution.", [{ label: "diagonal", answer: String(len) }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: [
        { label: "A", x: 45, y: 150 }, { label: "B", x: 45, y: 55 },
        { label: "C", x: 165, y: 55 }, { label: "D", x: 165, y: 150 },
      ],
      diagonals: [[0, 2], [1, 3]],
      rightAngles: ["A"],
    },
    verify: { kind: "rectDiag", x },
  };
}

function makeRhombusDiagonals(rng: RNG): GeometryProblem {
  const [a, b, c] = pickTriple(rng); // halves of diagonals a, b → side c
  const d1 = 2 * a;
  const d2 = 2 * b;
  return {
    type: "GEO.6",
    subtype: "RhombusDiagonals",
    prompt: `A rhombus has diagonals of length ${d1} and ${d2}. Find the length of one side of the rhombus.`,
    given: { d1, d2 },
    find: "side length",
    answer: String(c),
    steps: [
      step("The diagonals of a rhombus bisect each other, so the half-diagonals are " + `${d1}/2 = ${a} and ${d2}/2 = ${b}.`, "Rhombus Diagonals Theorem (bisecting)."),
      step("The diagonals of a rhombus are perpendicular, so the half-diagonals and a side form a right triangle.", "Rhombus Diagonals Theorem (perpendicular)."),
      step(`side² = ${a}² + ${b}² = ${a * a + b * b} = ${c * c}.`, "Pythagorean Theorem.", [
        { label: "side²", answer: String(c * c) },
      ]),
      step(`Side = ${c}.`, "Square root.", [{ label: "side", answer: String(c) }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: [
        { label: "A", x: 100, y: 30 }, { label: "B", x: 165, y: 104 },
        { label: "C", x: 100, y: 178 }, { label: "D", x: 35, y: 104 },
      ],
      diagonals: [[0, 2], [1, 3]],
      rightAngles: [],
      center: { x: 100, y: 104, label: "E" },
      sideLabels: { AB: "?" },
    },
    verify: { kind: "rhombusSide", d1, d2 },
  };
}

function makeTrapezoidMidsegment(rng: RNG): GeometryProblem {
  const b1 = randInt(rng, 4, 14);
  const b2 = randInt(rng, 4, 14);
  const mid = (b1 + b2) / 2;
  const inverse = rng() < 0.4;
  if (inverse) {
    return {
      type: "GEO.6",
      subtype: "TrapezoidMidsegment",
      prompt: `The midsegment of a trapezoid has length ${mid}. One base has length ${b1}. Find the length of the other base.`,
      given: { midsegment: mid, base1: b1 },
      find: "the other base",
      answer: String(b2),
      steps: [
        step("The midsegment of a trapezoid is parallel to the bases and its length is half the sum of the bases.", "Trapezoid Midsegment Theorem."),
        step(`${mid} = ½(${b1} + x), so ${b1} + x = ${2 * mid}.`, "Substitution.", [{ label: "equation", answer: `${b1} + x = ${2 * mid}` }]),
        step(`x = ${2 * mid} − ${b1} = ${b2}.`, "Subtraction Property of Equality.", [{ label: "x", answer: String(b2) }]),
      ],
      verify: { kind: "trapMidInv", mid, b1 },
    };
  }
  return {
    type: "GEO.6",
    subtype: "TrapezoidMidsegment",
    prompt: `Find the length of the midsegment of a trapezoid whose bases have lengths ${b1} and ${b2}.`,
    given: { base1: b1, base2: b2 },
    find: "midsegment length",
    answer: String(mid),
    steps: [
      step("The midsegment of a trapezoid connects the midpoints of the legs and is parallel to the bases.", "Definition of trapezoid midsegment."),
      step("Its length is the average of the two bases.", "Trapezoid Midsegment Theorem."),
      step(`Midsegment = ½(${b1} + ${b2}) = ½(${b1 + b2}) = ${mid}.`, "Trapezoid Midsegment Theorem.", [
        { label: "midsegment", answer: String(mid) },
      ]),
    ],
    verify: { kind: "trapMid", b1, b2 },
  };
}

function makeKiteAngles(rng: RNG): GeometryProblem {
  // Kite: one pair of opposite angles congruent (between sides of different length).
  const pair = randInt(rng, 70, 110);
  const other1 = randInt(rng, 60, 110);
  const other2 = 360 - 2 * pair - other1;
  return {
    type: "GEO.6",
    subtype: "KiteAngles",
    prompt: `In kite ABCD, ∠B ≅ ∠D (the angles between the pairs of different-length sides). m∠B = ${pair}° and m∠A = ${other1}°. Find m∠C.`,
    given: { angleB: pair, angleD: pair, angleA: other1 },
    find: "m∠C",
    answer: `${other2}°`,
    steps: [
      step("A kite has exactly one pair of congruent opposite angles — the ones between sides of different lengths.", "Kite angle property."),
      step("The interior angles of any quadrilateral sum to (4 − 2) × 180° = 360°.", "Polygon Interior Angle-Sum Theorem."),
      step(`m∠C = 360° − ${pair}° − ${pair}° − ${other1}° = ${other2}°.`, "Subtraction.", [
        { label: "m∠C", answer: `${other2}°` },
      ]),
    ],
    verify: { kind: "kiteAngles", pair, other1 },
  };
}

function makeClassifyQuad(rng: RNG): GeometryProblem {
  const cases = [
    { desc: "Both pairs of opposite sides are parallel, and all four sides are congruent, but the angles are not right angles.", answer: "Rhombus", why: "Parallel + all sides congruent + not a rectangle." },
    { desc: "Both pairs of opposite sides are parallel, all angles are right angles, and all sides are congruent.", answer: "Square", why: "It is both a rectangle and a rhombus." },
    { desc: "Exactly one pair of opposite sides is parallel.", answer: "Trapezoid", why: "One pair of parallel sides (the bases) only." },
    { desc: "Two pairs of adjacent sides are congruent, with opposite sides not congruent.", answer: "Kite", why: "Adjacent-side congruence defines a kite." },
    { desc: "Both pairs of opposite sides are parallel and the diagonals are congruent, but adjacent sides are not congruent.", answer: "Rectangle", why: "Congruent diagonals + parallelogram, not a rhombus." },
  ] as const;
  const c = pick(rng, cases);
  return {
    type: "GEO.6",
    subtype: "ClassifyQuadrilateral",
    prompt: `Name the most specific quadrilateral described: ${c.desc}`,
    given: { description: c.desc },
    find: "the quadrilateral name",
    answer: c.answer,
    steps: [
      step("Classify by sides (parallel/congruent) and angles, and give the most specific name that fits.", "Quadrilateral classification hierarchy."),
      step(c.why, "Apply the definitions."),
      step(`The quadrilateral is a ${c.answer.toLowerCase()}.`, "Classification.", [{ label: "name", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const POLYGON_LESSON_POOL: MakerEntry[] = [
  M("InteriorSum", 1, (rng) => makeInteriorSum(rng)),
  M("RegularInteriorAngle", 1, (rng) => makeRegularInterior(rng)),
  M("ExteriorFromN", 2, (rng) => makeExteriorN(rng)),
  M("MissingInteriorAngle", 2, (rng) => makeFindMissingInterior(rng)),
  M("SidesFromSum", 3, (rng) => makeSidesFromSum(rng)),
];

export const QUADRILATERAL_TEST_POOL: MakerEntry[] = [
  M("ParallelogramSides", 1, (rng, d) => makeParallelogramSides(rng, d)),
  M("ParallelogramAngles", 1, (rng) => makeParallelogramAngles(rng)),
  M("ParallelogramDiagonals", 2, (rng) => makeParallelogramDiagonals(rng)),
  M("RectangleDiagonals", 2, (rng) => makeRectangleDiagonals(rng)),
  M("RhombusDiagonals", 2, (rng) => makeRhombusDiagonals(rng)),
  M("TrapezoidMidsegment", 2, (rng) => makeTrapezoidMidsegment(rng)),
  M("KiteAngles", 3, (rng) => makeKiteAngles(rng)),
  M("ClassifyQuadrilateral", 3, (rng) => makeClassifyQuad(rng)),
];

export function generatePolygonProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? POLYGON_LESSON_POOL.filter((e) => only.includes(e.subtype)) : POLYGON_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

// TriangleRelationsFactory.ts
// Topic 5: Relationships Within Triangles (TEKS G.5(D), G.6(D)).
//
// Lesson ch5-1: the Triangle Midsegment Theorem stated precisely — the segment
// joining the midpoints of two sides of a triangle is PARALLEL to the third
// side and HALF as long. Both relationships are used (length problems and
// parallel-angle problems), plus coordinate midpoints.
// Chapter-test pool: perpendicular bisector theorem, angle bisector theorem,
// points of concurrency (incenter/circumcenter/centroid/orthocenter) with
// their equidistant properties, centroid 2:1 median split, triangle
// inequality, and the Hinge Theorem — the chapter's actual scope.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, sampleFromPool, pt,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

// Standard triangle sketch: A top, B bottom-left, C bottom-right.
// D = midpoint of AB, E = midpoint of AC.
const TRI_POINTS = [
  { label: "A", x: 100, y: 28 },
  { label: "B", x: 38, y: 152 },
  { label: "C", x: 168, y: 152 },
  { label: "D", x: 69, y: 90 },
  { label: "E", x: 134, y: 90 },
];
const TRI_EDGES: [string, string][] = [["A", "B"], ["B", "C"], ["C", "A"]];

function midsegmentFigure(sideLabels: Record<string, string>) {
  return {
    kind: "TriangleFigure" as const,
    points: TRI_POINTS,
    segments: [...TRI_EDGES, ["D", "E"] as [string, string]],
    sideLabels,
    parallelMarks: ["DE", "BC"],
  };
}

// ── Lesson makers: midsegments ────────────────────────────────────────────────

function makeMidsegmentLength(rng: RNG): GeometryProblem {
  const base = randInt(rng, 4, 20) * 2; // even → whole-number half
  const mid = base / 2;
  const givenBase = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "MidsegmentLength",
    prompt: givenBase
      ? `In △ABC, D is the midpoint of AB and E is the midpoint of AC. BC = ${base}. Find DE.`
      : `In △ABC, D is the midpoint of AB and E is the midpoint of AC. DE = ${mid}. Find BC.`,
    given: givenBase ? { BC: base } : { DE: mid },
    find: givenBase ? "DE" : "BC",
    answer: givenBase ? String(mid) : String(base),
    steps: [
      step("DE joins the midpoints of two sides of the triangle, so DE is a midsegment.", "Definition of midsegment."),
      step("A midsegment is parallel to the third side and half as long as the third side.", "Triangle Midsegment Theorem."),
      step(
        givenBase ? `DE = ½ × BC = ½ × ${base}.` : `BC = 2 × DE = 2 × ${mid}.`,
        "Triangle Midsegment Theorem (half-length relationship).",
        [{ label: givenBase ? "DE" : "BC", answer: givenBase ? String(mid) : String(base) }]
      ),
      step(givenBase ? `DE = ${mid}.` : `BC = ${base}.`, "Arithmetic."),
    ],
    svgParams: midsegmentFigure(givenBase ? { BC: String(base), DE: "?" } : { DE: String(mid), BC: "?" }),
    verify: { kind: "midsegment", base, givenBase },
  };
}

function makeMidsegmentAlgebra(rng: RNG): GeometryProblem {
  const a = randInt(rng, 1, 8);
  const mult = pick(rng, [3, 4]); // BC = mult·x; relation BC = 2·DE
  // DE = x + a and BC = 2·DE = 2x + 2a = mult·x → x = 2a/(mult−2)
  const x = mult === 3 ? 2 * a : a;
  const de = x + a;
  const bc = mult * x;
  return {
    type: "GEO.5",
    subtype: "MidsegmentAlgebra",
    prompt: `In △ABC, D is the midpoint of AB and E is the midpoint of AC. DE = x + ${a} and BC = ${mult}x. Find x and DE.`,
    given: { DE: `x + ${a}`, BC: `${mult}x` },
    find: "x and DE",
    answer: `x = ${x}, DE = ${de}`,
    steps: [
      step("DE is a midsegment, so BC is twice DE.", "Triangle Midsegment Theorem (the midsegment is half the third side)."),
      step(`${mult}x = 2(x + ${a}) = 2x + ${2 * a}.`, "Substitution and Distributive Property.", [
        { label: "equation", answer: `${mult}x = 2x + ${2 * a}` },
      ]),
      step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
      step(`DE = x + ${a} = ${x} + ${a} = ${de}. (Check: BC = ${mult} × ${x} = ${bc} = 2 × ${de}. ✓)`, "Substitution.", [
        { label: "DE", answer: String(de) },
      ]),
    ],
    svgParams: midsegmentFigure({ DE: `x + ${a}`, BC: `${mult}x` }),
    verify: { kind: "midsegmentAlg", a, mult },
  };
}

function makeMedialPerimeter(rng: RNG): GeometryProblem {
  // Pick three sides satisfying the triangle inequality with an even sum.
  let a = 0, b = 0, c = 0;
  do {
    a = randInt(rng, 5, 16);
    b = randInt(rng, 5, 16);
    c = randInt(rng, 5, 16);
  } while (!(a + b > c && a + c > b && b + c > a) || (a + b + c) % 2 !== 0);
  const per = a + b + c;
  return {
    type: "GEO.5",
    subtype: "MedialPerimeter",
    prompt: `The sides of △ABC measure ${a}, ${b}, and ${c}. D, E, and F are the midpoints of the sides. Find the perimeter of the medial triangle DEF formed by the three midsegments.`,
    given: { sides: `${a}, ${b}, ${c}` },
    find: "perimeter of medial triangle",
    answer: String(per / 2),
    steps: [
      step("Each side of the medial triangle is a midsegment of △ABC.", "Definition of midsegment."),
      step("Each midsegment is half the side it parallels.", "Triangle Midsegment Theorem."),
      step(`The midsegments are ${a / 2 === Math.floor(a / 2) ? a / 2 : a + "/2"}, ${b / 2 === Math.floor(b / 2) ? b / 2 : b + "/2"}, and ${c / 2 === Math.floor(c / 2) ? c / 2 : c + "/2"} — their sum is half the perimeter of △ABC.`, "Triangle Midsegment Theorem applied to all three sides."),
      step(`Perimeter of DEF = ½ × (${a} + ${b} + ${c}) = ½ × ${per} = ${per / 2}.`, "Arithmetic.", [
        { label: "perimeter", answer: String(per / 2) },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [...TRI_POINTS, { label: "F", x: 103, y: 152 }],
      segments: [...TRI_EDGES, ["D", "E"] as [string, string], ["E", "F"] as [string, string], ["F", "D"] as [string, string]],
      sideLabels: { BC: String(a), CA: String(c), AB: String(b) },
    },
    verify: { kind: "medialPerim", a, b, c },
  };
}

function makeMidsegmentAngles(rng: RNG): GeometryProblem {
  const ang = randInt(rng, 35, 120);
  const atB = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "MidsegmentAngles",
    prompt: atB
      ? `In △ABC, D is the midpoint of AB and E is the midpoint of AC. If m∠B = ${ang}°, find m∠ADE.`
      : `In △ABC, D is the midpoint of AB and E is the midpoint of AC. If m∠C = ${ang}°, find m∠AED.`,
    given: atB ? { angleB: ang } : { angleC: ang },
    find: atB ? "m∠ADE" : "m∠AED",
    answer: `${ang}°`,
    steps: [
      step("DE is a midsegment of △ABC.", "Definition of midsegment."),
      step("A midsegment is parallel to the third side, so DE ∥ BC.", "Triangle Midsegment Theorem (parallel relationship)."),
      step(
        atB
          ? "∠ADE and ∠B are corresponding angles formed by the parallel lines cut by transversal AB."
          : "∠AED and ∠C are corresponding angles formed by the parallel lines cut by transversal AC.",
        "Corresponding angles (parallel lines)."
      ),
      step(`Corresponding angles are congruent, so the measure is ${ang}°.`, "Corresponding Angles Postulate (converse direction: parallel lines ⇒ congruent corresponding angles).", [
        { label: "answer", answer: `${ang}°` },
      ]),
    ],
    svgParams: {
      ...midsegmentFigure({ BC: "", DE: "" }),
      angleLabels: atB ? { B: `${ang}°`, D: "?" } : { C: `${ang}°`, E: "?" },
    },
    verify: { kind: "midAngle", ang, atB },
  };
}

function makeCoordinateMidsegment(rng: RNG): GeometryProblem {
  // A, B, C with even coordinates; midsegment from midpoint of AB to midpoint of AC.
  const ax = randInt(rng, -2, 1) * 2;
  const ay = randInt(rng, 1, 3) * 2;
  const bx = ax - randInt(rng, 1, 2) * 2;
  const by = 0;
  const cx = ax + randInt(rng, 2, 3) * 2;
  const cy = 0;
  const dx = (ax + bx) / 2;
  const dy = (ay + by) / 2;
  const ex = (ax + cx) / 2;
  const ey = (ay + cy) / 2;
  const baseLen = cx - bx;
  const answer = `D${pt(dx, dy)}, E${pt(ex, ey)}; DE = ${baseLen / 2}`;
  return {
    type: "GEO.5",
    subtype: "CoordinateMidsegment",
    prompt: `△ABC has vertices A${pt(ax, ay)}, B${pt(bx, by)}, and C${pt(cx, cy)}. D is the midpoint of AB and E is the midpoint of AC. Find D, E, and the length DE.`,
    given: { A: pt(ax, ay), B: pt(bx, by), C: pt(cx, cy) },
    find: "midpoints D and E, and DE",
    answer,
    steps: [
      step("Use the Midpoint Formula on AB and AC.", "Midpoint Formula."),
      step(`D = ((${ax} + ${bx})/2, (${ay} + ${by})/2) = ${pt(dx, dy)}; E = ((${ax} + ${cx})/2, (${ay} + ${cy})/2) = ${pt(ex, ey)}.`, "Midpoint Formula.", [
        { label: "D", answer: pt(dx, dy) },
        { label: "E", answer: pt(ex, ey) },
      ]),
      step(`BC is horizontal with length ${baseLen}, and DE is a midsegment, so DE = ½ × BC.`, "Triangle Midsegment Theorem."),
      step(`DE = ½ × ${baseLen} = ${baseLen / 2}.`, "Arithmetic.", [{ label: "DE", answer: String(baseLen / 2) }]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [
        { label: "A", x: ax, y: ay }, { label: "B", x: bx, y: by }, { label: "C", x: cx, y: cy },
      ] }],
      points: [
        { label: "D", x: dx, y: dy }, { label: "E", x: ex, y: ey },
      ],
    },
    verify: { kind: "coordMid", ax, ay, bx, by, cx, cy },
  };
}

// ── Chapter-test makers ───────────────────────────────────────────────────────

function makePerpBisectorTheorem(rng: RNG, difficulty: Difficulty): GeometryProblem {
  if (difficulty >= 2) {
    const x = randInt(rng, 3, 9);
    const pa = 3 * x + 2;
    const pbExpr = `5x − ${5 * x - pa}`;
    return {
      type: "GEO.5",
      subtype: "PerpBisectorTheorem",
      prompt: `Point P lies on the perpendicular bisector of segment AB. PA = 3x + 2 and PB = ${pbExpr}. Find x and PA.`,
      given: { PA: "3x + 2", PB: pbExpr },
      find: "x and PA",
      answer: `x = ${x}, PA = ${pa}`,
      steps: [
        step("A point on the perpendicular bisector of a segment is equidistant from the endpoints.", "Perpendicular Bisector Theorem."),
        step(`PA = PB: 3x + 2 = ${pbExpr}.`, "Substitution.", [{ label: "equation", answer: `3x + 2 = ${pbExpr}` }]),
        step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`PA = 3(${x}) + 2 = ${pa}.`, "Substitution.", [{ label: "PA", answer: String(pa) }]),
      ],
      verify: { kind: "perpBisAlg", x },
    };
  }
  const d = randInt(rng, 5, 18);
  return {
    type: "GEO.5",
    subtype: "PerpBisectorTheorem",
    prompt: `Point P lies on the perpendicular bisector of segment AB. If PA = ${d}, find PB.`,
    given: { PA: d },
    find: "PB",
    answer: String(d),
    steps: [
      step("A point on the perpendicular bisector of a segment is equidistant from the endpoints of the segment.", "Perpendicular Bisector Theorem."),
      step(`PB = PA = ${d}.`, "Perpendicular Bisector Theorem.", [{ label: "PB", answer: String(d) }]),
    ],
    verify: { kind: "perpBis", d },
  };
}

function makeAngleBisectorDistance(rng: RNG): GeometryProblem {
  const d = randInt(rng, 3, 15);
  return {
    type: "GEO.5",
    subtype: "AngleBisectorTheorem",
    prompt: `Point D lies on the bisector of ∠A. The distance from D to one side of the angle is ${d} units. What is the distance from D to the other side of the angle?`,
    given: { distanceToSide: d },
    find: "distance to the other side",
    answer: `${d} units`,
    steps: [
      step("A point on the bisector of an angle is equidistant from the sides of the angle.", "Angle Bisector Theorem."),
      step(`The two distances are equal, so the distance is ${d} units.`, "Angle Bisector Theorem.", [{ label: "distance", answer: String(d) }]),
    ],
    verify: { kind: "angBisDist", d },
  };
}

function makeCentroidMedian(rng: RNG): GeometryProblem {
  const third = randInt(rng, 2, 9);
  const median = third * 3;
  const longPart = third * 2;
  const askWhole = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "CentroidMedian",
    prompt: askWhole
      ? `In △ABC, point P is the centroid on median AD. If AP = ${longPart}, find the length of the whole median AD.`
      : `In △ABC, point P is the centroid on median AD. If AD = ${median}, find AP, the distance from the vertex A to the centroid.`,
    given: askWhole ? { AP: longPart } : { AD: median },
    find: askWhole ? "AD" : "AP",
    answer: askWhole ? String(median) : String(longPart),
    steps: [
      step("The centroid divides each median into two parts with a 2:1 ratio: the vertex-to-centroid part is twice the centroid-to-midpoint part.", "Centroid Theorem (medians of a triangle)."),
      step(
        askWhole
          ? `PD = AP ÷ 2 = ${longPart} ÷ 2 = ${third}, so AD = AP + PD = ${longPart} + ${third}.`
          : `AP = (2/3) × AD = (2/3) × ${median}.`,
        "Centroid Theorem."
      ),
      step(askWhole ? `AD = ${median}.` : `AP = ${longPart}.`, "Arithmetic.", [
        { label: askWhole ? "AD" : "AP", answer: askWhole ? String(median) : String(longPart) },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [...TRI_POINTS, { label: "P", x: 100, y: 120 }, { label: "F", x: 103, y: 152 }],
      segments: [...TRI_EDGES, ["A", "F"] as [string, string]],
      sideLabels: askWhole ? {} : {},
      extraLabels: askWhole ? [] : [],
    },
    verify: { kind: "centroid", median, askWhole },
  };
}

const CENTERS = [
  { name: "Incenter", desc: "the point of concurrency of the angle bisectors of a triangle", prop: "It is equidistant from all three sides of the triangle." },
  { name: "Circumcenter", desc: "the point of concurrency of the perpendicular bisectors of a triangle", prop: "It is equidistant from all three vertices of the triangle." },
  { name: "Centroid", desc: "the point of concurrency of the medians of a triangle", prop: "It is the triangle's center of mass (balance point)." },
  { name: "Orthocenter", desc: "the point of concurrency of the altitudes of a triangle", prop: "Its position depends on the triangle: inside for acute, at the vertex for right, outside for obtuse." },
] as const;

function makeIdentifyCenter(rng: RNG): GeometryProblem {
  const c = pick(rng, CENTERS);
  const byProp = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "IdentifyCenter",
    prompt: byProp
      ? `Which point of concurrency is ${c.desc}?`
      : `A point inside a triangle has this property: ${c.prop} Which point of concurrency is it?`,
    given: { description: c.name },
    find: "the point of concurrency",
    answer: c.name,
    steps: [
      step("Each point of concurrency is formed by a specific set of special segments in a triangle.", "Points of concurrency: bisectors, perpendicular bisectors, medians, altitudes."),
      step(
        byProp ? c.prop : `${c.name} is ${c.desc}.`,
        "Match the description to the center."
      ),
      step(`The point is the ${c.name.toLowerCase()}.`, "Point of concurrency.", [{ label: "center", answer: c.name }]),
    ],
    verify: { kind: "oneOf", options: [c.name] },
  };
}

function makeTriangleInequality(rng: RNG): GeometryProblem {
  const form = pick(rng, ["possible", "range"] as const);
  if (form === "range") {
    const a = randInt(rng, 4, 12);
    const b = a + randInt(rng, 2, 8);
    const lo = b - a;
    const hi = a + b;
    return {
      type: "GEO.5",
      subtype: "TriangleInequality",
      prompt: `Two sides of a triangle measure ${a} and ${b}. Write an inequality that describes the possible lengths of the third side, x.`,
      given: { side1: a, side2: b },
      find: "range for the third side",
      answer: `${lo} < x < ${hi}`,
      steps: [
        step("The sum of the lengths of any two sides of a triangle must be greater than the length of the third side.", "Triangle Inequality Theorem."),
        step(`x + ${a} > ${b} gives x > ${lo}; and ${a} + ${b} > x gives x < ${hi}.`, "Triangle Inequality Theorem applied to each pairing."),
        step(`The third side must satisfy ${lo} < x < ${hi}.`, "Combine the inequalities.", [{ label: "range", answer: `${lo} < x < ${hi}` }]),
      ],
      verify: { kind: "triRange", a, b },
    };
  }
  const valid = rng() < 0.5;
  let a = randInt(rng, 3, 9);
  let b = randInt(rng, 3, 9);
  let c = valid ? randInt(rng, Math.abs(a - b) + 1, a + b - 1) : a + b + randInt(rng, 0, 3);
  if (c <= 0) c = 2;
  return {
    type: "GEO.5",
    subtype: "TriangleInequality",
    prompt: `Can lengths ${a}, ${b}, and ${c} be the sides of a triangle? Answer Yes or No.`,
    given: { sides: `${a}, ${b}, ${c}` },
    find: "yes or no",
    answer: valid ? "Yes" : "No",
    steps: [
      step("The sum of the two shorter sides must be greater than the longest side.", "Triangle Inequality Theorem."),
      step(
        valid
          ? `Check all three: ${a} + ${b} = ${a + b} > ${c} (and the other two sums are clearly larger).`
          : `${a} + ${b} = ${a + b}, which is not greater than ${c}.`,
        "Triangle Inequality Theorem."
      ),
      step(`Answer: ${valid ? "Yes" : "No"}.`, "Apply the theorem.", [{ label: "answer", answer: valid ? "Yes" : "No" }]),
    ],
    verify: { kind: "triPossible", a, b, c },
  };
}

function makeHingeTheorem(rng: RNG): GeometryProblem {
  const angSmall = randInt(rng, 25, 55);
  const angBig = angSmall + randInt(rng, 10, 35);
  const askSide = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "HingeTheorem",
    prompt: askSide
      ? `△ABC and △DEF have AB ≅ DE and AC ≅ DF. m∠A = ${angSmall}° and m∠D = ${angBig}°. Which side is longer, BC or EF?`
      : `△ABC and △DEF have AB ≅ DE and AC ≅ DF, with BC = 9 and EF = 12. Which is larger, ∠A or ∠D?`,
    given: askSide ? { angleA: angSmall, angleD: angBig } : { BC: 9, EF: 12 },
    find: askSide ? "the longer side" : "the larger angle",
    answer: askSide ? "EF" : "∠D",
    steps: [
      step("Two pairs of sides are congruent, so the comparison is decided entirely by the included angles (or, reversed, by the third sides).", "Hinge Theorem and its converse."),
      step(
        askSide
          ? `∠D (${angBig}°) > ∠A (${angSmall}°), so the side opposite ∠D is longer.`
          : "EF (12) > BC (9), so the angle opposite EF is larger.",
        "Hinge Theorem / Converse of the Hinge Theorem."
      ),
      step(askSide ? "EF is longer." : "∠D is larger.", "Hinge Theorem.", [
        { label: "answer", answer: askSide ? "EF" : "∠D" },
      ]),
    ],
    verify: { kind: "oneOf", options: [askSide ? "EF" : "∠D"] },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const MIDSEGMENT_LESSON_POOL: MakerEntry[] = [
  M("MidsegmentLength", 1, (rng) => makeMidsegmentLength(rng)),
  M("MidsegmentAngles", 2, (rng) => makeMidsegmentAngles(rng)),
  M("MedialPerimeter", 2, (rng) => makeMedialPerimeter(rng)),
  M("MidsegmentAlgebra", 2, (rng) => makeMidsegmentAlgebra(rng)),
  M("CoordinateMidsegment", 3, (rng) => makeCoordinateMidsegment(rng)),
];

export const TRIANGLE_RELATIONS_TEST_POOL: MakerEntry[] = [
  M("PerpBisectorTheorem", 1, (rng, d) => makePerpBisectorTheorem(rng, d)),
  M("AngleBisectorTheorem", 1, (rng) => makeAngleBisectorDistance(rng)),
  M("CentroidMedian", 2, (rng) => makeCentroidMedian(rng)),
  M("IdentifyCenter", 2, (rng) => makeIdentifyCenter(rng)),
  M("TriangleInequality", 2, (rng) => makeTriangleInequality(rng)),
  M("HingeTheorem", 3, (rng) => makeHingeTheorem(rng)),
];

export function generateMidsegmentProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? MIDSEGMENT_LESSON_POOL.filter((e) => only.includes(e.subtype)) : MIDSEGMENT_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

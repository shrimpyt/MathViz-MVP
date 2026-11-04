// TriangleRelationsFactory.ts
// Topic 5: Relationships Within Triangles (TEKS G.5(D), G.6(D)).
//
// Lesson ch5-1: the Triangle Midsegment Theorem stated precisely, the segment
// joining the midpoints of two sides of a triangle is PARALLEL to the third
// side and HALF as long. Both relationships are used (length problems and
// parallel-angle problems), plus coordinate midpoints.
// Chapter-test pool: perpendicular bisector theorem, angle bisector theorem,
// points of concurrency (incenter/circumcenter/centroid/orthocenter) with
// their equidistant properties, centroid 2:1 median split, triangle
// inequality, and the Hinge Theorem, the chapter's actual scope.

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
      step(`The midsegments are ${a / 2 === Math.floor(a / 2) ? a / 2 : a + "/2"}, ${b / 2 === Math.floor(b / 2) ? b / 2 : b + "/2"}, and ${c / 2 === Math.floor(c / 2) ? c / 2 : c + "/2"}, their sum is half the perimeter of △ABC.`, "Triangle Midsegment Theorem applied to all three sides."),
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

// ── Lesson makers: bisectors (5-3) ────────────────────────────────────────────

/** Linear expression in x with a signed constant, e.g. "3x − 4". */
function exprX(coef: number, konst: number): string {
  const base = coef === 1 ? "x" : `${coef}x`;
  if (konst > 0) return `${base} + ${konst}`;
  if (konst < 0) return `${base} − ${-konst}`;
  return base;
}

/** Triangle with the bisector from A drawn dashed to point D on BC. */
function bisectorFigure(opts: { angleAtA?: string; partLabel?: string }): GeometryProblem["svgParams"] {
  return {
    kind: "TriangleFigure",
    points: [TRI_POINTS[0], TRI_POINTS[1], TRI_POINTS[2], { label: "D", x: 103, y: 152 }],
    segments: TRI_EDGES,
    dashed: [["A", "D"] as [string, string]],
    angleLabels: opts.angleAtA ? { A: opts.angleAtA } : undefined,
    extraLabels: opts.partLabel ? [{ x: 121, y: 58, text: opts.partLabel }] : undefined,
  };
}

function makeAngleBisectorSplit(rng: RNG): GeometryProblem {
  const half = randInt(rng, 12, 40);
  const askWhole = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "AngleBisectorSplit",
    prompt: askWhole
      ? `AD bisects ∠BAC, with D on BC. If m∠BAD = ${half}°, find m∠BAC.`
      : `AD bisects ∠BAC, with D on BC. If m∠BAC = ${2 * half}°, find m∠BAD.`,
    given: askWhole ? { half } : { whole: 2 * half },
    find: askWhole ? "m∠BAC" : "m∠BAD",
    answer: `${askWhole ? 2 * half : half}°`,
    steps: [
      step("A bisector divides an angle into two congruent angles.", "Definition of angle bisector."),
      step(
        askWhole
          ? `m∠BAC = 2 × m∠BAD = 2 × ${half}°.`
          : `m∠BAD = ½ × m∠BAC = ½ × ${2 * half}°.`,
        "Angle bisector (the two parts are equal)."
      ),
      step(askWhole ? `m∠BAC = ${2 * half}°.` : `m∠BAD = ${half}°.`, "Arithmetic.", [
        { label: "answer", answer: `${askWhole ? 2 * half : half}°` },
      ]),
    ],
    svgParams: bisectorFigure(askWhole ? { partLabel: `${half}°` } : { angleAtA: `${2 * half}°` }),
    verify: { kind: "angBisSplit", half, askWhole },
  };
}

function makeAngleBisectorAlgebra(rng: RNG): GeometryProblem {
  const x = randInt(rng, 5, 12);
  const a = pick(rng, [2, 3]);
  const b = randInt(rng, 2, 9);
  const part = a * x + b;
  const d = part - (a + 1) * x;
  const whole = 2 * part;
  const e1 = exprX(a, b);
  const e2 = exprX(a + 1, d);
  return {
    type: "GEO.5",
    subtype: "AngleBisectorAlgebra",
    prompt: `AD bisects ∠BAC, with D on BC. m∠BAD = ${e1} and m∠DAC = ${e2}. Find x and m∠BAC.`,
    given: { BAD: e1, DAC: e2 },
    find: "x and m∠BAC",
    answer: `x = ${x}, m∠BAC = ${whole}°`,
    steps: [
      step("A bisector divides an angle into two congruent angles, so the two parts have equal measures.", "Definition of angle bisector."),
      step(`${e1} = ${e2}.`, "Set the two parts equal.", [{ label: "equation", answer: `${e1} = ${e2}` }]),
      step(`x = ${x}.`, "Subtraction Properties of Equality.", [{ label: "x", answer: String(x) }]),
      step(`m∠BAD = ${e1} = ${part}° at x = ${x}, and m∠BAC = 2 × ${part}°.`, "Substitution (the whole angle is twice one part).", [
        { label: "m∠BAC", answer: `${whole}°` },
      ]),
    ],
    svgParams: bisectorFigure({}),
    verify: { kind: "angBisAlg", x, whole },
  };
}

function makePerpBisectorCoordinate(rng: RNG): GeometryProblem {
  // Legs stay within the ±8 figure grid; the point may sit below the axis.
  const [h, v] = pick(rng, [[3, 4], [4, 3], [6, 8], [8, 6]] as const);
  const vy = rng() < 0.5 ? v : -v;
  const d = Math.round(Math.hypot(h, v));
  return {
    type: "GEO.5",
    subtype: "PerpBisectorCoordinate",
    prompt: `Segment AB has endpoints A${pt(-h, 0)} and B${pt(h, 0)}. Point P${pt(0, vy)} lies on the perpendicular bisector of AB. Find PA and PB.`,
    given: { A: pt(-h, 0), B: pt(h, 0), P: pt(0, vy) },
    find: "PA and PB",
    answer: `PA = ${d}, PB = ${d}`,
    steps: [
      step(`PA is the distance from ${pt(0, vy)} to ${pt(-h, 0)}: PA = √(${h}² + ${v}²) = √${h * h + v * v}.`, "Distance Formula.", [
        { label: "PA", answer: String(d) },
      ]),
      step("A point on the perpendicular bisector of a segment is equidistant from the endpoints of the segment.", "Perpendicular Bisector Theorem."),
      step(`PB = PA = ${d}.`, "Perpendicular Bisector Theorem.", [{ label: "PB", answer: String(d) }]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [
        { label: "A", x: -h, y: 0 }, { label: "B", x: h, y: 0 }, { label: "P", x: 0, y: vy },
      ] }],
    },
    verify: { kind: "perpBisCoord", h, v, d },
  };
}

// ── Lesson makers: circumcenter and incenter (5-4) ────────────────────────────

/** Triangle with interior point P and dashed segments from P to the vertices. */
function centerFigure(px: number, py: number): GeometryProblem["svgParams"] {
  return {
    kind: "TriangleFigure",
    points: [TRI_POINTS[0], TRI_POINTS[1], TRI_POINTS[2], { label: "P", x: px, y: py }],
    segments: TRI_EDGES,
    dashed: [["A", "P"] as [string, string], ["B", "P"] as [string, string], ["C", "P"] as [string, string]],
  };
}

function makeCircumcenterDistance(rng: RNG): GeometryProblem {
  const d = randInt(rng, 4, 20);
  const target = pick(rng, ["PB", "PC"] as const);
  return {
    type: "GEO.5",
    subtype: "CircumcenterDistance",
    prompt: `P is the circumcenter of △ABC. If PA = ${d}, find ${target}.`,
    given: { PA: d },
    find: target,
    answer: String(d),
    steps: [
      step("The circumcenter is the point of concurrency of the perpendicular bisectors, and it is equidistant from all three vertices of the triangle.", "Circumcenter Theorem."),
      step(`${target} = PA = ${d}.`, "Circumcenter Theorem (equal distances to the vertices).", [
        { label: target, answer: String(d) },
      ]),
    ],
    svgParams: centerFigure(100, 108),
    verify: { kind: "circumDist", d },
  };
}

function makeCircumcenterRightTriangle(rng: RNG): GeometryProblem {
  const [l1, l2, hyp] = pick(rng, [[6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [10, 24, 26], [20, 21, 29]] as const);
  const dist = hyp / 2;
  return {
    type: "GEO.5",
    subtype: "CircumcenterRightTriangle",
    prompt: `△ABC has the right angle at B, with AB = ${l1} and BC = ${l2}. P is the circumcenter of the triangle. Find the distance from P to vertex A.`,
    given: { AB: l1, BC: l2 },
    find: "PA",
    answer: String(dist),
    steps: [
      step(`The hypotenuse is AC = √(${l1}² + ${l2}²) = √${l1 * l1 + l2 * l2} = ${hyp}.`, "Pythagorean Theorem.", [
        { label: "AC", answer: String(hyp) },
      ]),
      step("The circumcenter of a right triangle is the midpoint of the hypotenuse.", "Circumcenter of a right triangle."),
      step(`PA is half the hypotenuse: PA = ${hyp} ÷ 2.`, "The circumcenter is equidistant from all three vertices.", [
        { label: "PA", answer: String(dist) },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [
        { label: "A", x: 50, y: 36 }, { label: "B", x: 50, y: 150 },
        { label: "C", x: 172, y: 150 }, { label: "M", x: 111, y: 93 },
      ],
      segments: [["A", "B"] as [string, string], ["B", "C"] as [string, string], ["C", "A"] as [string, string]],
      dashed: [["B", "M"] as [string, string]],
      sideLabels: { AB: String(l1), BC: String(l2) },
      rightAngles: ["B"],
    },
    verify: { kind: "circumRight", l1, l2 },
  };
}

function makeIncenterDistance(rng: RNG): GeometryProblem {
  const d = randInt(rng, 3, 14);
  const from = pick(rng, ["BC", "CA", "AB"] as const);
  const to = pick(rng, (["BC", "CA", "AB"] as const).filter((s) => s !== from));
  return {
    type: "GEO.5",
    subtype: "IncenterDistance",
    prompt: `P is the incenter of △ABC. The perpendicular distance from P to side ${from} is ${d} units. What is the perpendicular distance from P to side ${to}?`,
    given: { distanceToSide: d },
    find: "distance to the other side",
    answer: `${d} units`,
    steps: [
      step("The incenter is the point of concurrency of the angle bisectors, and it is equidistant from all three sides of the triangle.", "Incenter Theorem."),
      step(`The distances are equal, so the distance is ${d} units.`, "Incenter Theorem.", [
        { label: "distance", answer: String(d) },
      ]),
    ],
    svgParams: centerFigure(100, 108),
    verify: { kind: "incenterDist", d },
  };
}

function makeIncenterBisect(rng: RNG): GeometryProblem {
  const half = randInt(rng, 14, 38);
  const askWhole = rng() < 0.5;
  return {
    type: "GEO.5",
    subtype: "IncenterBisect",
    prompt: askWhole
      ? `P is the incenter of △ABC, so AP bisects ∠A. If m∠BAP = ${half}°, find m∠BAC.`
      : `P is the incenter of △ABC, so AP bisects ∠A. If m∠BAC = ${2 * half}°, find m∠BAP.`,
    given: askWhole ? { half } : { whole: 2 * half },
    find: askWhole ? "m∠BAC" : "m∠BAP",
    answer: `${askWhole ? 2 * half : half}°`,
    steps: [
      step("The incenter is formed by the angle bisectors, so AP divides ∠A into two congruent angles.", "Definition of incenter and angle bisector."),
      step(
        askWhole
          ? `m∠BAC = 2 × m∠BAP = 2 × ${half}°.`
          : `m∠BAP = ½ × m∠BAC = ½ × ${2 * half}°.`,
        "Angle bisector (the two parts are equal)."
      ),
      step(askWhole ? `m∠BAC = ${2 * half}°.` : `m∠BAP = ${half}°.`, "Arithmetic.", [
        { label: "answer", answer: `${askWhole ? 2 * half : half}°` },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [TRI_POINTS[0], TRI_POINTS[1], TRI_POINTS[2], { label: "P", x: 100, y: 105 }],
      segments: TRI_EDGES,
      dashed: [["A", "P"] as [string, string]],
      angleLabels: askWhole ? undefined : { A: `${2 * half}°` },
      extraLabels: askWhole ? [{ x: 121, y: 58, text: `${half}°` }] : undefined,
    },
    verify: { kind: "angBisSplit", half, askWhole },
  };
}

function makeIncenterAngle(rng: RNG): GeometryProblem {
  const a = randInt(rng, 15, 45) * 2;
  const bpc = 90 + a / 2;
  return {
    type: "GEO.5",
    subtype: "IncenterAngle",
    prompt: `P is the incenter of △ABC. If m∠A = ${a}°, find m∠BPC.`,
    given: { angleA: a },
    find: "m∠BPC",
    answer: `${bpc}°`,
    steps: [
      step("BP and CP bisect ∠B and ∠C, so in △BPC the angles at B and C are halves of the angles of △ABC.", "Definition of incenter."),
      step(`m∠PBC + m∠PCB = (${180}° − ${a}°) ÷ 2 = ${90 - a / 2}°.`, "Triangle Angle-Sum Theorem and angle bisectors."),
      step(`m∠BPC = 180° − ${90 - a / 2}°.`, "Triangle Angle-Sum Theorem in △BPC.", [
        { label: "m∠BPC", answer: `${bpc}°` },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [TRI_POINTS[0], TRI_POINTS[1], TRI_POINTS[2], { label: "P", x: 100, y: 108 }],
      segments: TRI_EDGES,
      dashed: [["A", "P"] as [string, string], ["B", "P"] as [string, string], ["C", "P"] as [string, string]],
      angleLabels: { A: `${a}°` },
    },
    verify: { kind: "incenterAngle", a },
  };
}

// ── Lesson makers: medians and altitudes (5-5) ────────────────────────────────

function makeMedianMidpoint(rng: RNG): GeometryProblem {
  const bx = 2 * randInt(rng, -2, 2);
  const by = 2 * randInt(rng, -1, 2);
  let cx = 2 * randInt(rng, 0, 3);
  const cy = 2 * randInt(rng, -1, 2);
  if (bx === cx && by === cy) cx += 2;
  const ax = randInt(rng, -2, 3);
  const ay = randInt(rng, 3, 6);
  const dx = (bx + cx) / 2;
  const dy = (by + cy) / 2;
  return {
    type: "GEO.5",
    subtype: "MedianMidpoint",
    prompt: `In △ABC, A${pt(ax, ay)}, B${pt(bx, by)}, and C${pt(cx, cy)}. Segment AD is a median of the triangle. Find the coordinates of D.`,
    given: { A: pt(ax, ay), B: pt(bx, by), C: pt(cx, cy) },
    find: "coordinates of D",
    answer: pt(dx, dy),
    steps: [
      step("A median runs from a vertex to the midpoint of the opposite side, so D is the midpoint of BC.", "Definition of median."),
      step(`D = ((${bx} + ${cx})/2, (${by} + ${cy})/2).`, "Midpoint Formula.", [
        { label: "D", answer: pt(dx, dy) },
      ]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [
        { label: "A", x: ax, y: ay }, { label: "B", x: bx, y: by }, { label: "C", x: cx, y: cy },
      ] }],
      points: [{ label: "D", x: dx, y: dy }],
    },
    verify: { kind: "midpointPt", bx, by, cx, cy },
  };
}

function makeCentroidCoordinates(rng: RNG): GeometryProblem {
  let ax = 0, ay = 0, bx = 0, by = 0, cx = 0, cy = 0;
  let gx = 0, gy = 0;
  // Draw offsets around the centroid until the vertices form a real triangle.
  for (let tries = 0; tries < 40; tries++) {
    gx = randInt(rng, -1, 2);
    gy = randInt(rng, 0, 2);
    const p = randInt(rng, -3, 3);
    const q = randInt(rng, -2, 2);
    const r = randInt(rng, -3, 3);
    const s = randInt(rng, -2, 2);
    ax = gx + p; ay = gy + q;
    bx = gx + r; by = gy + s;
    cx = gx - p - r; cy = gy - q - s;
    const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (cross !== 0) break;
  }
  return {
    type: "GEO.5",
    subtype: "CentroidCoordinates",
    prompt: `The vertices of △ABC are A${pt(ax, ay)}, B${pt(bx, by)}, and C${pt(cx, cy)}. Find the coordinates of the centroid P.`,
    given: { A: pt(ax, ay), B: pt(bx, by), C: pt(cx, cy) },
    find: "coordinates of the centroid",
    answer: pt(gx, gy),
    steps: [
      step("The centroid is the average of the three vertices: add the x-coordinates and divide by 3, and do the same for the y-coordinates.", "Centroid of a triangle (coordinate form)."),
      step(`P = ((${ax} + ${bx} + ${cx})/3, (${ay} + ${by} + ${cy})/3).`, "Average the coordinates.", [
        { label: "P", answer: pt(gx, gy) },
      ]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [
        { label: "A", x: ax, y: ay }, { label: "B", x: bx, y: by }, { label: "C", x: cx, y: cy },
      ] }],
      points: [{ label: "P", x: gx, y: gy }],
    },
    verify: { kind: "centroidCoord", ax, ay, bx, by, cx, cy },
  };
}

function makeCentroidAlgebra(rng: RNG): GeometryProblem {
  const x = randInt(rng, 5, 11);
  const pv = randInt(rng, x + 2, x + 9);
  const pdExpr = exprX(1, pv - x);
  const apExpr = exprX(3, 2 * pv - 3 * x);
  const ad = 3 * pv;
  return {
    type: "GEO.5",
    subtype: "CentroidAlgebra",
    prompt: `Point P is the centroid of △ABC on median AD. AP = ${apExpr} and PD = ${pdExpr}. Find x and the length of the median AD.`,
    given: { AP: apExpr, PD: pdExpr },
    find: "x and AD",
    answer: `x = ${x}, AD = ${ad}`,
    steps: [
      step("The centroid divides each median in a 2:1 ratio, so AP is twice PD.", "Centroid Theorem (medians of a triangle)."),
      step(`${apExpr} = 2(${pdExpr}).`, "Set AP equal to twice PD.", [
        { label: "equation", answer: `${apExpr} = 2(${pdExpr})` },
      ]),
      step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
      step(`PD = ${pv} at x = ${x}, so AD = AP + PD = 2 × ${pv} + ${pv}.`, "Segment Addition Postulate and the 2:1 ratio.", [
        { label: "AD", answer: String(ad) },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [...TRI_POINTS.slice(0, 3), { label: "P", x: 100, y: 120 }, { label: "F", x: 103, y: 152 }],
      segments: [...TRI_EDGES, ["A", "F"] as [string, string]],
      extraLabels: [
        { x: 58, y: 74, text: apExpr },
        { x: 112, y: 140, text: pdExpr },
      ],
    },
    verify: { kind: "centroidAlg", x, ad },
  };
}

function makeOrthocenterLocation(rng: RNG): GeometryProblem {
  const form = pick(rng, ["acute", "right", "obtuse"] as const);
  const vertex = pick(rng, ["A", "B", "C"] as const);
  let angles: [number, number, number] = [60, 60, 60];
  let answer = "Inside the triangle";
  let why = "";
  if (form === "acute") {
    let a1 = 0, a2 = 0, a3 = 0;
    do {
      a1 = randInt(rng, 45, 70);
      a2 = randInt(rng, 40, 70);
      a3 = 180 - a1 - a2;
    } while (a3 < 25 || a3 >= 90);
    angles = [a1, a2, a3];
    answer = "Inside the triangle";
    why = "All three angles are acute, so each altitude falls inside the triangle and the altitudes meet inside.";
  } else if (form === "right") {
    const p = randInt(rng, 25, 65);
    const base: [number, number, number] = [90, p, 90 - p];
    angles = (["A", "B", "C"] as const).map((v) =>
      v === vertex ? 90 : base[(["A", "B", "C"] as const).filter((u) => u !== vertex).indexOf(v) + 1]
    ) as [number, number, number];
    answer = `At vertex ${vertex}`;
    why = `The angle at ${vertex} is a right angle, so the two sides through ${vertex} are themselves altitudes, and the altitudes meet at ${vertex}.`;
  } else {
    const o = randInt(rng, 95, 135);
    const rest = 180 - o;
    const p = randInt(rng, 12, rest - 12);
    const others: [number, number] = [p, rest - p];
    let i = 0;
    angles = (["A", "B", "C"] as const).map((v) => (v === vertex ? o : others[i++])) as [number, number, number];
    answer = "Outside the triangle";
    why = `The angle at ${vertex} is obtuse, so the altitudes from the other two vertices fall outside the triangle and the altitudes meet outside.`;
  }
  return {
    type: "GEO.5",
    subtype: "OrthocenterLocation",
    prompt: `The angles of △ABC measure ${angles[0]}°, ${angles[1]}°, and ${angles[2]}°. Where is the orthocenter of △ABC located?`,
    given: { angles: `${angles[0]}, ${angles[1]}, ${angles[2]}` },
    find: "location of the orthocenter",
    answer,
    steps: [
      step("The orthocenter is the point of concurrency of the altitudes of a triangle.", "Definition of orthocenter."),
      step(why, "Location of the orthocenter (acute, right, and obtuse cases)."),
      step(`The orthocenter is located: ${answer.toLowerCase()}.`, "Apply the location rule.", [
        { label: "location", answer },
      ]),
    ],
    verify: { kind: "oneOf", options: [answer] },
  };
}

function makeAltitudeArea(rng: RNG): GeometryProblem {
  const b = randInt(rng, 4, 10) * 2;
  const h = randInt(rng, 4, 14);
  const area = (b * h) / 2;
  return {
    type: "GEO.5",
    subtype: "AltitudeArea",
    prompt: `A triangle has a base of ${b} units and an area of ${area} square units. Find the length of the altitude drawn to that base.`,
    given: { base: b, area },
    find: "altitude length",
    answer: String(h),
    steps: [
      step("The area of a triangle is half the base times the altitude to that base: A = ½bh.", "Area of a Triangle."),
      step(`${area} = ½ × ${b} × h, so h = (2 × ${area}) ÷ ${b}.`, "Substitution and rearrangement.", [
        { label: "h", answer: String(h) },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [...TRI_POINTS.slice(0, 3), { label: "F", x: 100, y: 152 }],
      segments: TRI_EDGES,
      dashed: [["A", "F"] as [string, string]],
      sideLabels: { BC: String(b) },
      rightAngles: ["F"],
      extraLabels: [{ x: 110, y: 96, text: "?" }],
    },
    verify: { kind: "altitudeArea", area, base: b },
  };
}

function makeAltitudeCoordinate(rng: RNG): GeometryProblem {
  const bx = randInt(rng, -6, -2);
  const cx = randInt(rng, 2, 7);
  const ax = randInt(rng, bx + 1, cx - 1);
  const ay = randInt(rng, 4, 8);
  return {
    type: "GEO.5",
    subtype: "AltitudeCoordinate",
    prompt: `△ABC has vertices A${pt(ax, ay)}, B${pt(bx, 0)}, and C${pt(cx, 0)}. Find the length of the altitude from A to side BC.`,
    given: { A: pt(ax, ay), B: pt(bx, 0), C: pt(cx, 0) },
    find: "altitude length",
    answer: String(ay),
    steps: [
      step("An altitude is perpendicular to the side it meets. BC lies on the x-axis, so the altitude from A is a vertical segment.", "Definition of altitude."),
      step(`The foot of the altitude is ${pt(ax, 0)}, straight below A.`, "Perpendicular to a horizontal line is vertical."),
      step(`The length is the vertical distance from y = ${ay} to y = 0.`, "Distance on a vertical line.", [
        { label: "altitude", answer: String(ay) },
      ]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [
        { label: "A", x: ax, y: ay }, { label: "B", x: bx, y: 0 }, { label: "C", x: cx, y: 0 },
      ] }],
      points: [{ label: "F", x: ax, y: 0 }],
    },
    verify: { kind: "altitudeCoord", h: ay },
  };
}

// ── Lesson makers: inequalities in one triangle (5-6) ─────────────────────────

function makeOrderSidesAngles(rng: RNG): GeometryProblem {
  let s: [number, number, number] = [0, 0, 0];
  do {
    s = [randInt(rng, 4, 15), randInt(rng, 4, 15), randInt(rng, 4, 15)];
  } while (
    new Set(s).size !== 3 ||
    !(s[0] + s[1] > s[2] && s[0] + s[2] > s[1] && s[1] + s[2] > s[0])
  );
  // Randomly assign the three lengths to BC, CA, AB.
  const pool = [...s];
  const bc = pool.splice(randInt(rng, 0, pool.length - 1), 1)[0];
  const ca = pool.splice(randInt(rng, 0, pool.length - 1), 1)[0];
  const ab = pool[0];
  const ordered = ([[bc, "A"], [ca, "B"], [ab, "C"]] as [number, string][])
    .sort((p, q) => p[0] - q[0])
    .map(([, v]) => `∠${v}`)
    .join(", ");
  return {
    type: "GEO.5",
    subtype: "OrderSidesAngles",
    prompt: `In △ABC, BC = ${bc}, CA = ${ca}, and AB = ${ab}. List the angles of the triangle in order from smallest to largest.`,
    given: { BC: bc, CA: ca, AB: ab },
    find: "angles smallest to largest",
    answer: ordered,
    steps: [
      step("In any triangle, the smallest angle lies opposite the shortest side, and the largest angle lies opposite the longest side.", "Side and angle relationship in a triangle."),
      step(`The sides in order are ${Math.min(bc, ca, ab)} (opposite ∠${[[bc, "A"], [ca, "B"], [ab, "C"]].find(([n]) => n === Math.min(bc, ca, ab))![1]}), then ${[...s].sort((m, n) => m - n)[1]}, then ${Math.max(bc, ca, ab)}.`, "Sort the side lengths and match each to the angle opposite it."),
      step(`Smallest to largest: ${ordered}.`, "Match each side to the angle opposite it.", [
        { label: "order", answer: ordered },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: TRI_POINTS.slice(0, 3),
      segments: TRI_EDGES,
      sideLabels: { BC: String(bc), CA: String(ca), AB: String(ab) },
    },
    verify: { kind: "orderBySides", bc, ca, ab },
  };
}

function makeOrderAnglesSides(rng: RNG): GeometryProblem {
  let A = 0, B = 0, C = 0;
  do {
    A = randInt(rng, 25, 75);
    B = randInt(rng, 25, 85);
    C = 180 - A - B;
  } while (C < 15 || C > 110 || new Set([A, B, C]).size !== 3);
  const ordered = ([[A, "BC"], [B, "CA"], [C, "AB"]] as [number, string][])
    .sort((p, q) => p[0] - q[0])
    .map(([, s]) => s)
    .join(", ");
  return {
    type: "GEO.5",
    subtype: "OrderAnglesSides",
    prompt: `In △ABC, m∠A = ${A}°, m∠B = ${B}°, and m∠C = ${C}°. List the sides of the triangle in order from shortest to longest.`,
    given: { angleA: A, angleB: B, angleC: C },
    find: "sides shortest to longest",
    answer: ordered,
    steps: [
      step("In any triangle, the shortest side lies opposite the smallest angle, and the longest side lies opposite the largest angle.", "Side and angle relationship in a triangle."),
      step(`The angles in order are ${Math.min(A, B, C)}°, ${[A, B, C].sort((m, n) => m - n)[1]}°, ${Math.max(A, B, C)}°.`, "Sort the angle measures."),
      step(`Shortest to longest: ${ordered}.`, "Match each angle to the side opposite it.", [
        { label: "order", answer: ordered },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: TRI_POINTS.slice(0, 3),
      segments: TRI_EDGES,
      angleLabels: { A: `${A}°`, B: `${B}°`, C: `${C}°` },
    },
    verify: { kind: "orderByAngles", A, B, C },
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

export const BISECTORS_LESSON_POOL: MakerEntry[] = [
  M("PerpBisectorTheorem", 1, (rng, d) => makePerpBisectorTheorem(rng, d)),
  M("AngleBisectorTheorem", 1, (rng) => makeAngleBisectorDistance(rng)),
  M("AngleBisectorSplit", 2, (rng) => makeAngleBisectorSplit(rng)),
  M("AngleBisectorAlgebra", 2, (rng) => makeAngleBisectorAlgebra(rng)),
  M("PerpBisectorCoordinate", 3, (rng) => makePerpBisectorCoordinate(rng)),
];

export function generateBisectorProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? BISECTORS_LESSON_POOL.filter((e) => only.includes(e.subtype)) : BISECTORS_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

export const CENTERS_LESSON_POOL: MakerEntry[] = [
  M("CircumcenterDistance", 1, (rng) => makeCircumcenterDistance(rng)),
  M("IncenterDistance", 1, (rng) => makeIncenterDistance(rng)),
  M("IdentifyCenter", 2, (rng) => makeIdentifyCenter(rng)),
  M("IncenterBisect", 2, (rng) => makeIncenterBisect(rng)),
  M("CircumcenterRightTriangle", 2, (rng) => makeCircumcenterRightTriangle(rng)),
  M("IncenterAngle", 3, (rng) => makeIncenterAngle(rng)),
];

export function generateConcurrencyProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? CENTERS_LESSON_POOL.filter((e) => only.includes(e.subtype)) : CENTERS_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

export const MEDIANS_ALTITUDES_LESSON_POOL: MakerEntry[] = [
  M("MedianMidpoint", 1, (rng) => makeMedianMidpoint(rng)),
  M("CentroidMedian", 2, (rng) => makeCentroidMedian(rng)),
  M("OrthocenterLocation", 2, (rng) => makeOrthocenterLocation(rng)),
  M("AltitudeArea", 2, (rng) => makeAltitudeArea(rng)),
  M("CentroidCoordinates", 3, (rng) => makeCentroidCoordinates(rng)),
  M("CentroidAlgebra", 3, (rng) => makeCentroidAlgebra(rng)),
  M("AltitudeCoordinate", 3, (rng) => makeAltitudeCoordinate(rng)),
];

export function generateMediansAltitudesProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? MEDIANS_ALTITUDES_LESSON_POOL.filter((e) => only.includes(e.subtype)) : MEDIANS_ALTITUDES_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

export const INEQUALITIES_ONE_TRIANGLE_POOL: MakerEntry[] = [
  M("OrderSidesAngles", 1, (rng) => makeOrderSidesAngles(rng)),
  M("OrderAnglesSides", 2, (rng) => makeOrderAnglesSides(rng)),
  M("HingeTheorem", 3, (rng) => makeHingeTheorem(rng)),
];

export function generateInequalitiesOneTriangleProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? INEQUALITIES_ONE_TRIANGLE_POOL.filter((e) => only.includes(e.subtype)) : INEQUALITIES_ONE_TRIANGLE_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

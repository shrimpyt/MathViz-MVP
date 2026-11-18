// SpecialQuadrilateralsFactory.ts
// Classifying quadrilaterals (TEKS G.6(E), G.2(B)).
//
// Lesson "Classifying Parallelograms, Rectangles, Rhombuses & Squares"
// (marked diagrams, no coordinates):
//   ClassifyMostSpecific  the most specific name the markings prove
//   ClassifyAllNames      every name (parallelogram/rectangle/rhombus/square)
//                         the markings prove
//   ParallelogramTest     do the markings prove a parallelogram? which theorem?
//   WhatMoreNeeded        one more fact that would make it a rectangle,
//                         rhombus or square
//
// Lesson "Classifying Quadrilaterals with Coordinates" (kept separate so a
// teacher who has not taught coordinates can leave it out):
//   CoordClassify         classify from four vertices using slope and distance
//   CoordMissingVertex    the fourth vertex that makes a parallelogram
//   LetterMidpoint        midpoint with variable coordinates
//   CoordProofDiagonals   coordinate proof that a parallelogram's diagonals
//                         bisect each other (variable coordinates)
//
// Every mark on a diagram is TRUE of the figure as drawn (the shape is drawn
// as what it is), and the classification is decided only by what the marks
// state. tests/geometry/verify.ts re-derives the classification from the
// marks and re-measures every mark against the drawing coordinates.
// Pure and seeded.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem, GeoPt, PolygonFigureParams } from "./GeometryTypes";
import { M, step, frac, type MakerEntry, sampleFromPool, type Difficulty } from "./GeometryHelpers";

// ── Shapes in drawing coordinates (200×200, y down), vertices in order ──────

type ShapeName = "parallelogram" | "rectangle" | "rhombus" | "square" | "isoTrapezoid" | "kite";

const RH = Math.sqrt(95 * 95 - 55 * 55);
const SHAPES: Record<ShapeName, { x: number; y: number }[]> = {
  parallelogram: [{ x: 30, y: 150 }, { x: 140, y: 150 }, { x: 170, y: 65 }, { x: 60, y: 65 }],
  rectangle: [{ x: 35, y: 145 }, { x: 165, y: 145 }, { x: 165, y: 65 }, { x: 35, y: 65 }],
  rhombus: [{ x: 25, y: 150 }, { x: 120, y: 150 }, { x: 175, y: 150 - RH }, { x: 80, y: 150 - RH }],
  square: [{ x: 50, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 50 }, { x: 50, y: 50 }],
  isoTrapezoid: [{ x: 25, y: 150 }, { x: 175, y: 150 }, { x: 130, y: 70 }, { x: 70, y: 70 }],
  kite: [{ x: 100, y: 35 }, { x: 150, y: 85 }, { x: 100, y: 170 }, { x: 50, y: 85 }],
};

const LETTER_SETS = ["ABCD", "PQRS", "WXYZ", "JKLM", "FGHI"] as const;
function centerLetter(letters: string): string {
  for (const c of ["E", "T", "N", "O"]) if (!letters.includes(c)) return c;
  return "E";
}

/** Intersection of segments p0p2 and p1p3 (the diagonals). */
function diagIntersection(V: { x: number; y: number }[]): { x: number; y: number } {
  const [a, b, c, d] = V;
  const r = { x: c.x - a.x, y: c.y - a.y };
  const s = { x: d.x - b.x, y: d.y - b.y };
  const den = r.x * s.y - r.y * s.x;
  const t = ((b.x - a.x) * s.y - (b.y - a.y) * s.x) / den;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

/** Rotate/mirror a shape and fit it to the frame, keeping it accurate. */
function placeShape(rng: RNG, shape: ShapeName): { x: number; y: number }[] {
  const base = SHAPES[shape];
  const deg = pick(rng, [0, 0, 0, 12, -12, 90] as const);
  const mirror = rng() < 0.4;
  const th = (deg * Math.PI) / 180;
  const cx = base.reduce((s, p) => s + p.x, 0) / 4;
  const cy = base.reduce((s, p) => s + p.y, 0) / 4;
  let pts = base.map((p) => {
    const x0 = (mirror ? -(p.x - cx) : p.x - cx);
    const y0 = p.y - cy;
    return { x: x0 * Math.cos(th) - y0 * Math.sin(th), y: x0 * Math.sin(th) + y0 * Math.cos(th) };
  });
  // mirroring reverses the winding; keep the vertex order going around
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  const sc = Math.min(140 / w, 130 / h, 1.2);
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const my = (Math.max(...ys) + Math.min(...ys)) / 2;
  pts = pts.map((p) => ({ x: Math.round((100 + (p.x - mx) * sc) * 10) / 10, y: Math.round((102 + (p.y - my) * sc) * 10) / 10 }));
  return pts;
}

// ── Marked cases ─────────────────────────────────────────────────────────────
// Keys use vertex positions 0–3 and "E" for the diagonal intersection.

type Kind = "quadrilateral" | "parallelogram" | "rectangle" | "rhombus" | "square";

interface MarkCase {
  id: string;
  shape: ShapeName;
  diagonals?: boolean;
  ticks?: Record<string, number>;
  parallel?: Record<string, number>;
  arcs?: Record<string, number>;
  right?: number[];
  rightCenter?: boolean;
  kind: Kind;
  /** Why, in words, with letters filled in (L = names keyed "0".."3","E"). */
  why: (L: (k: string) => string) => string;
  /** The theorem / definition that makes it a parallelogram (parallelogram
   *  cases only), or why it is not one. */
  paraReason: string;
}

const seg = (L: (k: string) => string, k: string) => L(k[0]) + L(k[1]);
const OPP_SIDES_THM = "If both pairs of opposite sides of a quadrilateral are congruent, then it is a parallelogram.";
const DEF_PARA = "Definition of a parallelogram: both pairs of opposite sides are parallel.";
const DIAG_THM = "If the diagonals of a quadrilateral bisect each other, then it is a parallelogram.";
const OPP_ANG_THM = "If both pairs of opposite angles of a quadrilateral are congruent, then it is a parallelogram.";
const ONE_PAIR_THM = "If one pair of opposite sides of a quadrilateral is both congruent and parallel, then it is a parallelogram.";

const CASES: MarkCase[] = [
  {
    id: "P_OPP_SIDES", shape: "parallelogram", kind: "parallelogram",
    ticks: { "01": 1, "23": 1, "12": 2, "30": 2 },
    why: (L) => `both pairs of opposite sides are congruent (${seg(L, "01")} ≅ ${seg(L, "23")}, ${seg(L, "12")} ≅ ${seg(L, "30")})`,
    paraReason: OPP_SIDES_THM,
  },
  {
    id: "P_PARALLEL", shape: "parallelogram", kind: "parallelogram",
    parallel: { "01": 1, "32": 1, "03": 2, "12": 2 },
    why: (L) => `both pairs of opposite sides are parallel (${seg(L, "01")} ∥ ${seg(L, "32")}, ${seg(L, "03")} ∥ ${seg(L, "12")})`,
    paraReason: DEF_PARA,
  },
  {
    id: "P_DIAG", shape: "parallelogram", kind: "parallelogram", diagonals: true,
    ticks: { "0E": 1, "E2": 1, "1E": 2, "E3": 2 },
    why: (L) => `the diagonals bisect each other (${seg(L, "0E")} ≅ ${seg(L, "E2")}, ${seg(L, "1E")} ≅ ${seg(L, "E3")})`,
    paraReason: DIAG_THM,
  },
  {
    id: "P_ANGLES", shape: "parallelogram", kind: "parallelogram",
    arcs: { "0": 1, "2": 1, "1": 2, "3": 2 },
    why: (L) => `both pairs of opposite angles are congruent (∠${L("0")} ≅ ∠${L("2")}, ∠${L("1")} ≅ ∠${L("3")})`,
    paraReason: OPP_ANG_THM,
  },
  {
    id: "P_ONEPAIR", shape: "parallelogram", kind: "parallelogram",
    ticks: { "01": 1, "32": 1 }, parallel: { "01": 1, "32": 1 },
    why: (L) => `one pair of opposite sides is both congruent and parallel (${seg(L, "01")} ≅ ${seg(L, "32")} and ${seg(L, "01")} ∥ ${seg(L, "32")})`,
    paraReason: ONE_PAIR_THM,
  },
  {
    id: "R_PAR_RIGHT", shape: "rectangle", kind: "rectangle",
    parallel: { "01": 1, "32": 1, "03": 2, "12": 2 }, right: [0],
    why: (L) => `both pairs of opposite sides are parallel, so it is a parallelogram, and ∠${L("0")} is a right angle`,
    paraReason: DEF_PARA,
  },
  {
    id: "R_FOUR_RIGHT", shape: "rectangle", kind: "rectangle",
    right: [0, 1, 2, 3],
    why: () => "all four angles are right angles",
    paraReason: OPP_ANG_THM,
  },
  {
    id: "R_DIAG", shape: "rectangle", kind: "rectangle", diagonals: true,
    ticks: { "0E": 1, "E2": 1, "1E": 1, "E3": 1 },
    why: (L) => `the diagonals bisect each other, so it is a parallelogram, and they are congruent (${seg(L, "02")} ≅ ${seg(L, "13")})`,
    paraReason: DIAG_THM,
  },
  {
    id: "R_SIDES_RIGHT", shape: "rectangle", kind: "rectangle",
    ticks: { "01": 1, "23": 1, "12": 2, "30": 2 }, right: [1],
    why: (L) => `both pairs of opposite sides are congruent, so it is a parallelogram, and ∠${L("1")} is a right angle`,
    paraReason: OPP_SIDES_THM,
  },
  {
    id: "H_FOUR_SIDES", shape: "rhombus", kind: "rhombus",
    ticks: { "01": 1, "12": 1, "23": 1, "30": 1 },
    why: () => "all four sides are congruent",
    paraReason: OPP_SIDES_THM,
  },
  {
    id: "H_DIAG_PERP", shape: "rhombus", kind: "rhombus", diagonals: true,
    ticks: { "0E": 1, "E2": 1, "1E": 2, "E3": 2 }, rightCenter: true,
    why: (L) => `the diagonals bisect each other, so it is a parallelogram, and they are perpendicular (${seg(L, "02")} ⊥ ${seg(L, "13")})`,
    paraReason: DIAG_THM,
  },
  {
    id: "H_PAR_CONSEC", shape: "rhombus", kind: "rhombus",
    parallel: { "01": 1, "32": 1, "03": 2, "12": 2 }, ticks: { "01": 1, "12": 1 },
    why: (L) => `both pairs of opposite sides are parallel, so it is a parallelogram, and two consecutive sides are congruent (${seg(L, "01")} ≅ ${seg(L, "12")})`,
    paraReason: DEF_PARA,
  },
  {
    id: "S_SIDES_RIGHT", shape: "square", kind: "square",
    ticks: { "01": 1, "12": 1, "23": 1, "30": 1 }, right: [0],
    why: (L) => `all four sides are congruent (a rhombus) and ∠${L("0")} is a right angle (a rectangle)`,
    paraReason: OPP_SIDES_THM,
  },
  {
    id: "S_RIGHT_CONSEC", shape: "square", kind: "square",
    right: [0, 1, 2, 3], ticks: { "01": 1, "12": 1 },
    why: (L) => `all four angles are right angles (a rectangle) and two consecutive sides are congruent, ${seg(L, "01")} ≅ ${seg(L, "12")} (a rhombus)`,
    paraReason: OPP_ANG_THM,
  },
  {
    id: "S_DIAG", shape: "square", kind: "square", diagonals: true,
    ticks: { "0E": 1, "E2": 1, "1E": 1, "E3": 1 }, rightCenter: true,
    why: () => "the diagonals bisect each other, are congruent (a rectangle) and are perpendicular (a rhombus)",
    paraReason: DIAG_THM,
  },
  {
    id: "Q_LEGS", shape: "isoTrapezoid", kind: "quadrilateral",
    ticks: { "12": 1, "30": 1 },
    why: (L) => `only one pair of opposite sides is marked congruent (${seg(L, "12")} ≅ ${seg(L, "30")}); an isosceles trapezoid has that too, so it need not be a parallelogram`,
    paraReason: "one pair of congruent opposite sides is not enough; an isosceles trapezoid also has one.",
  },
  {
    id: "Q_PAR_LEGS", shape: "isoTrapezoid", kind: "quadrilateral",
    parallel: { "01": 1, "32": 1 }, ticks: { "12": 1, "30": 1 },
    why: (L) => `one pair of sides is parallel (${seg(L, "01")} ∥ ${seg(L, "32")}) and the OTHER pair is congruent; an isosceles trapezoid fits these marks, so it need not be a parallelogram`,
    paraReason: "the congruent pair and the parallel pair are different pairs; an isosceles trapezoid fits these marks.",
  },
  {
    id: "Q_ONE_ANGLE_PAIR", shape: "kite", kind: "quadrilateral",
    arcs: { "1": 1, "3": 1 },
    why: (L) => `only one pair of opposite angles is marked congruent (∠${L("1")} ≅ ∠${L("3")}); a kite has that too, so it need not be a parallelogram`,
    paraReason: "one pair of congruent opposite angles is not enough; a kite also has one.",
  },
  {
    id: "Q_DIAG_ONE", shape: "kite", kind: "quadrilateral", diagonals: true,
    ticks: { "1E": 1, "E3": 1 }, rightCenter: true,
    why: (L) => `only one diagonal is bisected (${seg(L, "1E")} ≅ ${seg(L, "E3")}); a kite's diagonals are perpendicular and one bisects the other, so it need not be a parallelogram`,
    paraReason: "only one diagonal is bisected; both must bisect each other.",
  },
];

const CASE_BY_ID = new Map(CASES.map((c) => [c.id, c]));

function buildFigure(rng: RNG, c: MarkCase, letters: string, opts?: { forceDiagonals?: boolean }): {
  params: PolygonFigureParams;
  L: (k: string) => string;
} {
  const pts = placeShape(rng, c.shape);
  const E = centerLetter(letters);
  const L = (k: string) => (k === "E" ? E : letters[Number(k)]);
  const vertices: GeoPt[] = pts.map((p, i) => ({ label: letters[i], x: p.x, y: p.y }));
  const keyed = (r?: Record<string, number>) =>
    r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k.split("").map(L).join(""), v])) : undefined;
  const showDiag = !!c.diagonals || !!opts?.forceDiagonals;
  const ctr = diagIntersection(pts);
  const params: PolygonFigureParams = {
    kind: "PolygonFigure",
    vertices,
    ...(showDiag ? { diagonals: [[0, 2], [1, 3]] as [number, number][] } : {}),
    ...(showDiag ? { center: { x: Math.round(ctr.x * 10) / 10, y: Math.round(ctr.y * 10) / 10, label: E } } : {}),
    ...(c.ticks ? { ticks: keyed(c.ticks) } : {}),
    ...(c.parallel ? { parallelMarks: keyed(c.parallel) } : {}),
    ...(c.arcs ? { angleArcs: keyed(c.arcs) } : {}),
    ...(c.right ? { rightAngles: c.right.map((i) => letters[i]) } : {}),
    ...(c.rightCenter ? { rightAngleMarks: [{ at: E, from: letters[0], to: letters[1] }] } : {}),
  };
  return { params, L };
}

const KIND_NAMES: Record<Kind, string> = {
  quadrilateral: "Quadrilateral",
  parallelogram: "Parallelogram",
  rectangle: "Rectangle",
  rhombus: "Rhombus",
  square: "Square",
};
/** Every name the kind carries, in hierarchy order (without "quadrilateral"). */
function allNames(k: Kind): string[] {
  switch (k) {
    case "square": return ["parallelogram", "rectangle", "rhombus", "square"];
    case "rectangle": return ["parallelogram", "rectangle"];
    case "rhombus": return ["parallelogram", "rhombus"];
    case "parallelogram": return ["parallelogram"];
    default: return [];
  }
}

function pickCase(rng: RNG, difficulty: Difficulty, filter?: (c: MarkCase) => boolean): MarkCase {
  // Easy: the plainest marks (sides, right angles, parallel arrows).
  const easy = new Set(["P_OPP_SIDES", "P_PARALLEL", "R_FOUR_RIGHT", "R_PAR_RIGHT", "H_FOUR_SIDES", "S_SIDES_RIGHT", "S_RIGHT_CONSEC", "Q_LEGS"]);
  let pool = CASES.filter((c) => (difficulty === 1 ? easy.has(c.id) : true));
  if (filter) pool = pool.filter(filter);
  return pick(rng, pool);
}

const NAME_LIST = "quadrilateral, parallelogram, rectangle, rhombus, or square";

function makeClassifyMostSpecific(rng: RNG, difficulty: Difficulty): GeometryProblem {
  const c = pickCase(rng, difficulty);
  const letters = pick(rng, LETTER_SETS);
  const { params, L } = buildFigure(rng, c, letters);
  const name = KIND_NAMES[c.kind];
  const why = c.why(L);
  const steps = [
    step("List only what the marks state: tick marks (congruent segments), arrows (parallel sides), arcs (congruent angles), squares (right angles).", "Read the diagram; do not assume from how it looks."),
    step(
      c.kind === "quadrilateral"
        ? `The marks are not enough for any parallelogram test: ${c.paraReason}`
        : `Parallelogram test: ${c.paraReason}`,
      c.kind === "quadrilateral" ? "No parallelogram condition is met." : "Parallelogram theorems.",
    ),
    step(`Most specific name: ${name.toLowerCase()}, because ${why}.`, "Rectangle: parallelogram with a right angle or congruent diagonals. Rhombus: parallelogram with congruent consecutive sides or perpendicular diagonals. Square: both.", [
      { label: "name", answer: name },
    ]),
  ];
  return {
    type: "GEO.6",
    subtype: "ClassifyMostSpecific",
    prompt: `Using only the markings, give the most specific name that ${letters} must have: ${NAME_LIST}. Explain which marks you used.`,
    given: { figure: letters, marks: "see diagram" },
    find: "the most specific name",
    answer: `${name}: ${why}`,
    steps,
    svgParams: params,
    verify: { kind: "quadMarks", form: "most", caseId: c.id },
  };
}

function makeClassifyAllNames(rng: RNG, difficulty: Difficulty): GeometryProblem {
  const c = pickCase(rng, difficulty);
  const letters = pick(rng, LETTER_SETS);
  const { params, L } = buildFigure(rng, c, letters);
  const names = allNames(c.kind);
  const list = names.length ? names.map((n, i) => (i === 0 ? n[0].toUpperCase() + n.slice(1) : n)).join(", ") : "None";
  const answer = names.length ? `${list}: ${c.why(L)}` : `None; it is only a quadrilateral: ${c.why(L)}`;
  return {
    type: "GEO.6",
    subtype: "ClassifyAllNames",
    prompt: `Using only the markings, list every name that ${letters} must have: parallelogram, rectangle, rhombus, square. If none must apply, write "none".`,
    given: { figure: letters, marks: "see diagram" },
    find: "every name that must apply",
    answer,
    steps: [
      step("Decide first whether the marks prove a parallelogram.", c.kind === "quadrilateral" ? c.paraReason : "Parallelogram theorems."),
      step("A rectangle and a rhombus are both parallelograms; a square is both a rectangle and a rhombus.", "Quadrilateral hierarchy."),
      step(names.length ? `${letters} is a ${names[names.length - 1]}, so it is also every name above it: ${names.join(", ")}.` : "No name beyond quadrilateral is proved.", "Classification.", [
        { label: "names", answer: names.length ? names.join(", ") : "none" },
      ]),
    ],
    svgParams: params,
    verify: { kind: "quadMarks", form: "all", caseId: c.id },
  };
}

function makeParallelogramTest(rng: RNG, difficulty: Difficulty): GeometryProblem {
  const c = pickCase(rng, difficulty, (x) => x.id.startsWith("P_") || x.id.startsWith("Q_"));
  const letters = pick(rng, LETTER_SETS);
  const { params, L } = buildFigure(rng, c, letters);
  const yes = c.kind !== "quadrilateral";
  const answer = yes ? `Yes. ${c.paraReason}` : `No: ${c.paraReason}`;
  return {
    type: "GEO.6",
    subtype: "ParallelogramTest",
    prompt: `Do the markings prove that ${letters} is a parallelogram? If yes, name the theorem or definition. If no, explain why not.`,
    given: { figure: letters, marks: "see diagram" },
    find: "yes or no, with the reason",
    answer,
    steps: [
      step(`The marks state: ${c.why(L)}.`, "Read the diagram."),
      step(
        "A quadrilateral is a parallelogram when both pairs of opposite sides are parallel, both pairs of opposite sides are congruent, both pairs of opposite angles are congruent, the diagonals bisect each other, or one pair of opposite sides is both congruent and parallel.",
        "Parallelogram tests.",
      ),
      step(yes ? `Yes: ${c.paraReason}` : `No: ${c.paraReason}`, yes ? "A parallelogram test is met." : "No test is met.", [
        { label: "parallelogram?", answer: yes ? "Yes" : "No" },
      ]),
    ],
    svgParams: params,
    verify: { kind: "quadMarks", form: "para", caseId: c.id },
  };
}

// ── What more is needed ──────────────────────────────────────────────────────

type About = "angles" | "sides" | "diagonals";
interface NeedCase {
  start: "parallelogram" | "rectangle" | "rhombus";
  target: "rectangle" | "rhombus" | "square";
  about: About;
  fact: (L: (k: string) => string) => string;
  reason: string;
}
const NEEDS: NeedCase[] = [
  { start: "parallelogram", target: "rectangle", about: "angles", fact: (L) => `one right angle, such as m∠${L("0")} = 90°`, reason: "A parallelogram with one right angle is a rectangle." },
  { start: "parallelogram", target: "rectangle", about: "diagonals", fact: (L) => `congruent diagonals: ${seg(L, "02")} ≅ ${seg(L, "13")}`, reason: "A parallelogram with congruent diagonals is a rectangle." },
  { start: "parallelogram", target: "rhombus", about: "sides", fact: (L) => `two consecutive sides congruent, such as ${seg(L, "01")} ≅ ${seg(L, "12")}`, reason: "A parallelogram with two consecutive sides congruent is a rhombus." },
  { start: "parallelogram", target: "rhombus", about: "diagonals", fact: (L) => `perpendicular diagonals: ${seg(L, "02")} ⊥ ${seg(L, "13")}`, reason: "A parallelogram with perpendicular diagonals is a rhombus." },
  { start: "rectangle", target: "square", about: "sides", fact: (L) => `two consecutive sides congruent, such as ${seg(L, "01")} ≅ ${seg(L, "12")}`, reason: "A rectangle with two consecutive sides congruent is a rhombus too, so it is a square." },
  { start: "rectangle", target: "square", about: "diagonals", fact: (L) => `perpendicular diagonals: ${seg(L, "02")} ⊥ ${seg(L, "13")}`, reason: "A rectangle with perpendicular diagonals is a rhombus too, so it is a square." },
  { start: "rhombus", target: "square", about: "angles", fact: (L) => `one right angle, such as m∠${L("0")} = 90°`, reason: "A rhombus with a right angle is a rectangle too, so it is a square." },
  { start: "rhombus", target: "square", about: "diagonals", fact: (L) => `congruent diagonals: ${seg(L, "02")} ≅ ${seg(L, "13")}`, reason: "A rhombus with congruent diagonals is a rectangle too, so it is a square." },
];
const START_CASE: Record<NeedCase["start"], string> = {
  parallelogram: "P_PARALLEL",
  rectangle: "R_FOUR_RIGHT",
  rhombus: "H_FOUR_SIDES",
};

function makeWhatMoreNeeded(rng: RNG): GeometryProblem {
  const n = pick(rng, NEEDS);
  const letters = pick(rng, LETTER_SETS);
  const c = CASE_BY_ID.get(START_CASE[n.start])!;
  const { params, L } = buildFigure(rng, c, letters, { forceDiagonals: n.about === "diagonals" });
  const fact = n.fact(L);
  return {
    type: "GEO.6",
    subtype: "WhatMoreNeeded",
    prompt: `${letters} is a ${n.start}. What one more fact about its ${n.about} would prove that ${letters} is a ${n.target}?`,
    given: { figure: letters, is: n.start },
    find: `a fact about the ${n.about}`,
    answer: `${fact[0].toUpperCase()}${fact.slice(1)}. ${n.reason}`,
    steps: [
      step(`Start from what a ${n.start} already has, then add what a ${n.target} needs.`, "Quadrilateral hierarchy."),
      step(n.reason, `Conditions for a ${n.target}.`),
      step(`The fact needed: ${fact}.`, "Apply the condition.", [{ label: "fact", answer: fact }]),
    ],
    svgParams: params,
    verify: { kind: "quadNeed", start: n.start, target: n.target, about: n.about, letters },
  };
}

// ── Coordinates (separate lesson) ────────────────────────────────────────────

type CKind = "square" | "rectangle" | "rhombus" | "parallelogram" | "trapezoid" | "kite";

function slopeStr(dx: number, dy: number): string {
  if (dx === 0) return "undefined";
  return frac(dy, dx);
}
function lenStr(d2: number): string {
  const r = Math.round(Math.sqrt(d2));
  if (r * r === d2) return String(r);
  // simplify √d2
  let out = 1;
  let rest = d2;
  for (let k = Math.floor(Math.sqrt(d2)); k >= 2; k--) {
    if (rest % (k * k) === 0) {
      out = k;
      rest = rest / (k * k);
      break;
    }
  }
  return out === 1 ? `√${rest}` : `${out}√${rest}`;
}

function coordVectors(rng: RNG, kind: CKind): { u: [number, number]; v: [number, number]; trap?: [number, number] } {
  const nz = (lo: number, hi: number) => {
    let x = 0;
    while (x === 0) x = randInt(rng, lo, hi);
    return x;
  };
  switch (kind) {
    case "square": {
      const p = randInt(rng, 1, 4);
      const q = randInt(rng, 0, 3);
      return { u: [p, q], v: [-q, p] };
    }
    case "rectangle": {
      const [p, q] = pick(rng, [[1, 1], [2, 1], [1, 2], [3, 1], [2, 0], [3, 0], [1, 0]] as [number, number][]);
      const k = pick(rng, [2, 3] as const);
      return rng() < 0.5 ? { u: [p * k, q * k], v: [-q, p] } : { u: [p, q], v: [-q * k, p * k] };
    }
    case "rhombus": {
      const opts: [[number, number], [number, number]][] = [
        [[5, 0], [3, 4]], [[5, 0], [4, 3]], [[3, 1], [1, 3]], [[4, 1], [1, 4]], [[2, 1], [1, 2]],
        [[3, 2], [2, 3]], [[3, 1], [3, -1]], [[4, 2], [2, 4]], [[0, 5], [3, 4]], [[4, 3], [0, 5]],
      ];
      const [u, v] = pick(rng, opts);
      return { u, v };
    }
    case "parallelogram": {
      for (;;) {
        const u: [number, number] = [randInt(rng, 2, 6), randInt(rng, -1, 2)];
        const v: [number, number] = [randInt(rng, -2, 3), nz(2, 5)];
        const cross = u[0] * v[1] - u[1] * v[0];
        const dot = u[0] * v[0] + u[1] * v[1];
        const l1 = u[0] ** 2 + u[1] ** 2;
        const l2 = v[0] ** 2 + v[1] ** 2;
        if (cross !== 0 && dot !== 0 && l1 !== l2) return { u, v };
      }
    }
    case "trapezoid": {
      // A, B = A + u, C = D + k·u (k ≠ 1), D = A + v
      for (;;) {
        const u: [number, number] = pick(rng, [[2, 0], [3, 0], [2, 1], [1, 1], [3, 1]] as [number, number][]);
        const v: [number, number] = [randInt(rng, -1, 2), randInt(rng, 3, 5)];
        if (u[0] * v[1] - u[1] * v[0] !== 0) return { u, v, trap: [u[0] * 2, u[1] * 2] };
      }
    }
    case "kite": {
      // symmetric about the axis through A and C
      const a = randInt(rng, 2, 3);
      const b = randInt(rng, 2, 4);
      const c = randInt(rng, 4, 6);
      return { u: [a, b], v: [c, b] };
    }
  }
}

interface CoordQuad { kind: CKind; pts: [number, number][] }

function makeCoordQuad(rng: RNG, kind: CKind): CoordQuad {
  const { u, v, trap } = coordVectors(rng, kind);
  let pts: [number, number][];
  if (kind === "kite") {
    // A top, B right, C bottom, D left around a vertical axis x = 0
    const [a, b] = u;
    const [c] = v;
    pts = [[0, b], [a, 0], [0, -c], [-a, 0]];
  } else if (kind === "trapezoid") {
    // A, B = A + w (long base), C = D + u (short base), D = A + v, w = 2u
    const w = trap!;
    pts = [[0, 0], [w[0], w[1]], [v[0] + u[0], v[1] + u[1]], [v[0], v[1]]];
  } else {
    pts = [[0, 0], [u[0], u[1]], [u[0] + v[0], u[1] + v[1]], [v[0], v[1]]];
  }
  // make the vertex order counterclockwise in math coordinates
  const area2 = pts.reduce((s, p, i) => {
    const q = pts[(i + 1) % 4];
    return s + p[0] * q[1] - q[0] * p[1];
  }, 0);
  if (area2 < 0) pts = [pts[0], pts[3], pts[2], pts[1]];
  // shift into the window around the origin
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const sx = -Math.round((Math.max(...xs) + Math.min(...xs)) / 2) + randInt(rng, -2, 2);
  const sy = -Math.round((Math.max(...ys) + Math.min(...ys)) / 2) + randInt(rng, -2, 2);
  void span;
  pts = pts.map(([x, y]) => [x + sx, y + sy]);
  return { kind, pts };
}

const CK_NAME: Record<CKind, string> = {
  square: "Square", rectangle: "Rectangle", rhombus: "Rhombus", parallelogram: "Parallelogram", trapezoid: "Trapezoid", kite: "Kite",
};

function makeCoordClassify(rng: RNG, difficulty: Difficulty): GeometryProblem {
  const kinds: CKind[] = difficulty === 1 ? ["square", "rectangle", "rhombus", "parallelogram"] : ["square", "rectangle", "rhombus", "parallelogram", "trapezoid", "kite"];
  const q = makeCoordQuad(rng, pick(rng, kinds));
  const N = "ABCD";
  const P = q.pts;
  const sides = [0, 1, 2, 3].map((i) => {
    const a = P[i];
    const b = P[(i + 1) % 4];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return { name: N[i] + N[(i + 1) % 4], dx, dy, slope: slopeStr(dx, dy), d2: dx * dx + dy * dy };
  });
  const coordList = P.map((p, i) => `${N[i]}(${p[0]}, ${p[1]})`).join(", ");
  const slopeLine = sides.map((s) => `slope ${s.name} = ${s.slope}`).join("; ");
  const lenLine = sides.map((s) => `${s.name} = ${lenStr(s.d2)}`).join("; ");
  const why: Record<CKind, string> = {
    square: "opposite sides parallel, consecutive sides perpendicular, all four sides equal",
    rectangle: "opposite sides parallel, consecutive sides perpendicular, consecutive sides not equal",
    rhombus: "opposite sides parallel, all four sides equal, consecutive sides not perpendicular",
    parallelogram: "both pairs of opposite sides parallel, no right angles, consecutive sides not equal",
    trapezoid: "exactly one pair of opposite sides parallel",
    kite: "two pairs of consecutive sides equal, opposite sides not parallel",
  };
  const name = CK_NAME[q.kind];
  return {
    type: "GEO.6",
    subtype: "CoordClassify",
    prompt: `Quadrilateral ABCD has vertices ${coordList}. Use slope and distance to classify ABCD as precisely as you can (parallelogram, rectangle, rhombus, square, trapezoid, or kite). Show your work.`,
    given: { vertices: coordList },
    find: "the most specific name",
    answer: `${name}: ${why[q.kind]}`,
    steps: [
      step(`Slopes: ${slopeLine}.`, "Slope formula m = (y₂ − y₁)/(x₂ − x₁). Equal slopes mean parallel; slopes with product −1 (or horizontal with vertical) mean perpendicular."),
      step(`Lengths: ${lenLine}.`, "Distance formula d = √((x₂ − x₁)² + (y₂ − y₁)²)."),
      step(`${name}: ${why[q.kind]}.`, "Definitions of the special quadrilaterals.", [{ label: "name", answer: name }]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: P.map((p, i) => ({ label: N[i], x: p[0], y: p[1] })) }],
    },
    verify: { kind: "quadCoord", xs: P.map((p) => p[0]), ys: P.map((p) => p[1]) },
  };
}

function makeCoordMissingVertex(rng: RNG): GeometryProblem {
  const q = makeCoordQuad(rng, pick(rng, ["parallelogram", "rectangle", "rhombus"] as CKind[]));
  const [A, B, C, D] = q.pts;
  const coordList = `A(${A[0]}, ${A[1]}), B(${B[0]}, ${B[1]}), C(${C[0]}, ${C[1]})`;
  const dx = C[0] - B[0];
  const dy = C[1] - B[1];
  return {
    type: "GEO.6",
    subtype: "CoordMissingVertex",
    prompt: `Three vertices of parallelogram ABCD are ${coordList}. Find the coordinates of D.`,
    given: { vertices: coordList },
    find: "D",
    answer: `D(${D[0]}, ${D[1]})`,
    steps: [
      step("In parallelogram ABCD, AD is parallel and congruent to BC, so moving from A to D is the same move as from B to C.", "Opposite sides of a parallelogram are parallel and congruent."),
      step(`B to C: (${dx >= 0 ? "+" : "−"}${Math.abs(dx)}, ${dy >= 0 ? "+" : "−"}${Math.abs(dy)}).`, "Change in x and y.", [{ label: "move", answer: `(${dx}, ${dy})` }]),
      step(`D = (${A[0]} + ${dx}, ${A[1]} + ${dy}) = (${D[0]}, ${D[1]}). Check: the midpoints of AC and BD are both (${(A[0] + C[0]) / 2}, ${(A[1] + C[1]) / 2}).`, "The diagonals of a parallelogram bisect each other.", [
        { label: "D", answer: `(${D[0]}, ${D[1]})` },
      ]),
    ],
    svgParams: {
      kind: "GridFigure",
      // the finished parallelogram shows in the key only; its corners are
      // labeled by the points below, so the polygon carries no labels
      polygons: [{ points: [A, B, C, D].map((p) => ({ label: "", x: p[0], y: p[1] })), dashed: true, answer: true }],
      points: [
        ...[A, B, C].map((p, i) => ({ label: "ABC"[i], x: p[0], y: p[1] })),
        { label: "D", x: D[0], y: D[1], answer: true },
      ],
      lines: [
        { x1: A[0], y1: A[1], x2: B[0], y2: B[1] },
        { x1: B[0], y1: B[1], x2: C[0], y2: C[1] },
      ],
    },
    verify: { kind: "quadMissingD", ax: A[0], ay: A[1], bx: B[0], by: B[1], cx: C[0], cy: C[1] },
  };
}

/** "2a + 2b" style sums of variable terms, in a fixed variable order. */
function linTerm(coef: Record<string, number>): string {
  const parts: string[] = [];
  for (const v of ["a", "b", "c", "d"]) {
    const k = coef[v] ?? 0;
    if (k === 0) continue;
    const mag = Math.abs(k) === 1 ? v : `${Math.abs(k)}${v}`;
    if (parts.length === 0) parts.push(k < 0 ? `−${mag}` : mag);
    else parts.push(k < 0 ? `− ${mag}` : `+ ${mag}`);
  }
  return parts.length ? parts.join(" ") : "0";
}
function addC(p: Record<string, number>, q: Record<string, number>, s = 1): Record<string, number> {
  const out: Record<string, number> = { ...p };
  for (const [k, v] of Object.entries(q)) out[k] = (out[k] ?? 0) + s * v;
  return out;
}
function halfC(p: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v / 2]));
}

function makeLetterMidpoint(rng: RNG): GeometryProblem {
  // endpoints with even coefficients so the midpoint stays whole
  const forms: { p: [Record<string, number>, Record<string, number>]; q: [Record<string, number>, Record<string, number>] }[] = [
    { p: [{ a: 2 }, {}], q: [{ b: 2 }, { c: 2 }] },
    { p: [{}, {}], q: [{ a: 2 }, { b: 2 }] },
    { p: [{ a: 2 }, { b: 2 }], q: [{ c: 2 }, {}] },
    { p: [{ a: -2 }, {}], q: [{ a: 2 }, { b: 2 }] },
    { p: [{ a: 2, b: 2 }, { c: 2 }], q: [{}, {}] },
    { p: [{ a: 2 }, { b: 2 }], q: [{ a: 2, c: 2 }, { b: 2 }] },
    { p: [{ a: 4 }, {}], q: [{ b: 2 }, { c: 4 }] },
  ];
  const f = pick(rng, forms);
  const names = pick(rng, [["P", "Q"], ["A", "C"], ["B", "D"], ["R", "S"]] as const);
  const mx = halfC(addC(f.p[0], f.q[0]));
  const my = halfC(addC(f.p[1], f.q[1]));
  const P = `${names[0]}(${linTerm(f.p[0])}, ${linTerm(f.p[1])})`;
  const Q = `${names[1]}(${linTerm(f.q[0])}, ${linTerm(f.q[1])})`;
  const ans = `(${linTerm(mx)}, ${linTerm(my)})`;
  return {
    type: "GEO.6",
    subtype: "LetterMidpoint",
    prompt: `Find the midpoint of ${names[0]}${names[1]} for ${P} and ${Q}.`,
    given: { P, Q },
    find: "the midpoint",
    answer: ans,
    steps: [
      step("Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2), with variables treated like numbers.", "Midpoint Formula."),
      step(`x: (${linTerm(f.p[0])} + ${linTerm(f.q[0])})/2 = ${linTerm(mx)}; y: (${linTerm(f.p[1])} + ${linTerm(f.q[1])})/2 = ${linTerm(my)}.`, "Combine like terms, then divide by 2.", [
        { label: "midpoint", answer: ans },
      ]),
    ],
    verify: { kind: "letterMid", p: JSON.stringify(f.p), q: JSON.stringify(f.q) },
  };
}

function makeCoordProofDiagonals(rng: RNG): GeometryProblem {
  // Parallelogram O(0,0), A(2a,0), B(2a+2b, 2c), C(2b, 2c) and variants
  const form = pick(rng, ["general", "rectangle", "rhombusLike"] as const);
  if (form === "rectangle") {
    return {
      type: "GEO.6",
      subtype: "CoordProofDiagonals",
      prompt: "Rectangle ORST has vertices O(0, 0), R(2a, 0), S(2a, 2b), and T(0, 2b). Use the Distance Formula to show its diagonals OS and RT are congruent, and the Midpoint Formula to show they bisect each other.",
      given: { O: "(0, 0)", R: "(2a, 0)", S: "(2a, 2b)", T: "(0, 2b)" },
      find: "the diagonal lengths and midpoints",
      answer: "OS = RT = √(4a² + 4b²) = 2√(a² + b²); both midpoints are (a, b)",
      steps: [
        step("OS = √((2a − 0)² + (2b − 0)²) = √(4a² + 4b²).", "Distance Formula."),
        step("RT = √((0 − 2a)² + (2b − 0)²) = √(4a² + 4b²), so OS = RT.", "Distance Formula.", [{ label: "OS = RT", answer: "√(4a² + 4b²)" }]),
        step("Midpoint of OS = (a, b); midpoint of RT = ((2a + 0)/2, (0 + 2b)/2) = (a, b).", "Midpoint Formula.", [{ label: "midpoint", answer: "(a, b)" }]),
        step("Same midpoint, so the diagonals bisect each other; equal lengths, so they are congruent.", "Definition of bisect; definition of congruent segments."),
      ],
      svgParams: {
        kind: "GridFigure",
        polygons: [{ points: [{ label: "O", x: 0, y: 0 }, { label: "R", x: 6, y: 0 }, { label: "S", x: 6, y: 4 }, { label: "T", x: 0, y: 4 }] }],
        lines: [{ x1: 0, y1: 0, x2: 6, y2: 4, dashed: true }, { x1: 6, y1: 0, x2: 0, y2: 4, dashed: true }],
      },
      verify: { kind: "letterProof", form },
    };
  }
  const B = form === "general" ? "(2a + 2b, 2c)" : "(2a + 2b, 2c)";
  return {
    type: "GEO.6",
    subtype: "CoordProofDiagonals",
    prompt: `Parallelogram OABC has vertices O(0, 0), A(2a, 0), B${B}, and C(2b, 2c). Use the Midpoint Formula to show that the diagonals OB and AC bisect each other.`,
    given: { O: "(0, 0)", A: "(2a, 0)", B, C: "(2b, 2c)" },
    find: "the midpoints of both diagonals",
    answer: "Both midpoints are (a + b, c), so the diagonals bisect each other",
    steps: [
      step("Midpoint of OB = ((0 + 2a + 2b)/2, (0 + 2c)/2) = (a + b, c).", "Midpoint Formula.", [{ label: "midpoint OB", answer: "(a + b, c)" }]),
      step("Midpoint of AC = ((2a + 2b)/2, (0 + 2c)/2) = (a + b, c).", "Midpoint Formula.", [{ label: "midpoint AC", answer: "(a + b, c)" }]),
      step("The diagonals share the same midpoint, so each one cuts the other in half.", "Definition of segment bisector."),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [{ label: "O", x: 0, y: 0 }, { label: "A", x: 6, y: 0 }, { label: "B", x: 8, y: 4 }, { label: "C", x: 2, y: 4 }] }],
      lines: [{ x1: 0, y1: 0, x2: 8, y2: 4, dashed: true }, { x1: 6, y1: 0, x2: 2, y2: 4, dashed: true }],
    },
    verify: { kind: "letterProof", form: "general" },
  };
}

// ── Pools + public generators ────────────────────────────────────────────────

export const CLASSIFY_QUADS_POOL: MakerEntry[] = [
  M("ClassifyMostSpecific", 1, (rng, d) => makeClassifyMostSpecific(rng, d)),
  M("ParallelogramTest", 1, (rng, d) => makeParallelogramTest(rng, d)),
  M("ClassifyAllNames", 2, (rng, d) => makeClassifyAllNames(rng, d)),
  M("WhatMoreNeeded", 2, (rng) => makeWhatMoreNeeded(rng)),
];

export const COORD_QUADS_POOL: MakerEntry[] = [
  M("CoordClassify", 1, (rng, d) => makeCoordClassify(rng, d)),
  M("CoordMissingVertex", 1, (rng) => makeCoordMissingVertex(rng)),
  M("LetterMidpoint", 2, (rng) => makeLetterMidpoint(rng)),
  M("CoordProofDiagonals", 3, (rng) => makeCoordProofDiagonals(rng)),
];

export function generateClassifyQuadProblems(rng: RNG, n: number, difficulty: Difficulty, only?: readonly string[]): GeometryProblem[] {
  const pool = only ? CLASSIFY_QUADS_POOL.filter((e) => only.includes(e.subtype)) : CLASSIFY_QUADS_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

export function generateCoordQuadProblems(rng: RNG, n: number, difficulty: Difficulty, only?: readonly string[]): GeometryProblem[] {
  const pool = only ? COORD_QUADS_POOL.filter((e) => only.includes(e.subtype)) : COORD_QUADS_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

/** For tests: the drawing shapes, so marks can be re-measured. */
export const __QUAD_CASE_IDS = CASES.map((c) => c.id);

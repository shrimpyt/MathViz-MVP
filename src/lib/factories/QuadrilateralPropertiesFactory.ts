// QuadrilateralPropertiesFactory.ts
// Properties of quadrilaterals with algebra (TEKS G.6(E)).
//
// Three lesson pools, each mixing the chapter-test kinds that already exist
// in PolygonsQuadrilateralsFactory with new algebra kinds:
//   PARALLELOGRAM_PROPS_POOL  opposite sides/angles, consecutive angles,
//                             diagonals bisect each other
//   SPECIAL_PROPS_POOL        rectangle, rhombus and square diagonals/angles
//   KITE_TRAP_POOL            trapezoid midsegment, isosceles trapezoid,
//                             kite angles and sides
//
// Diagrams draw each shape as what it is, so every mark is true; numbers and
// expressions are labels (not to scale). Pure and seeded.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem, PolygonFigureParams } from "./GeometryTypes";
import { M, step, sampleFromPool, type Difficulty, type MakerEntry } from "./GeometryHelpers";
import { QUADRILATERAL_TEST_POOL, kiteFigure } from "./PolygonsQuadrilateralsFactory";

/** "3x + 5", "x − 4", "2x" for the expression p·x + r. */
export function lin(p: number, r: number): string {
  const head = p === 1 ? "x" : p === -1 ? "−x" : `${p}x`;
  if (r === 0) return head;
  return r > 0 ? `${head} + ${r}` : `${head} − ${-r}`;
}

function fromTest(subtype: string): MakerEntry {
  const e = QUADRILATERAL_TEST_POOL.find((x) => x.subtype === subtype);
  if (!e) throw new Error(`QuadrilateralPropertiesFactory: missing ${subtype}`);
  return e;
}

// ── Figures (accurate shapes; labels are not to scale) ───────────────────────

const PARA = [
  { label: "A", x: 32, y: 150 }, { label: "B", x: 142, y: 150 },
  { label: "C", x: 172, y: 62 }, { label: "D", x: 62, y: 62 },
];
const RECT = [
  { label: "A", x: 35, y: 148 }, { label: "B", x: 165, y: 148 },
  { label: "C", x: 165, y: 62 }, { label: "D", x: 35, y: 62 },
];
const RH = Math.sqrt(95 * 95 - 58 * 58);
const RHOMBUS = [
  { label: "A", x: 25, y: 150 }, { label: "B", x: 120, y: 150 },
  { label: "C", x: 178, y: 150 - RH }, { label: "D", x: 83, y: 150 - RH },
];
const SQUARE = [
  { label: "A", x: 52, y: 150 }, { label: "B", x: 150, y: 150 },
  { label: "C", x: 150, y: 52 }, { label: "D", x: 52, y: 52 },
];
const ISO_TRAP = [
  { label: "A", x: 25, y: 150 }, { label: "B", x: 175, y: 150 },
  { label: "C", x: 132, y: 68 }, { label: "D", x: 68, y: 68 },
];

function center(V: { x: number; y: number }[]): { x: number; y: number } {
  const [a, b, c, d] = V;
  const r = { x: c.x - a.x, y: c.y - a.y };
  const s = { x: d.x - b.x, y: d.y - b.y };
  const den = r.x * s.y - r.y * s.x;
  const t = ((b.x - a.x) * s.y - (b.y - a.y) * s.x) / den;
  return { x: Math.round((a.x + t * r.x) * 10) / 10, y: Math.round((a.y + t * r.y) * 10) / 10 };
}

const PARALLEL_BOTH = { AB: 1, DC: 1, AD: 2, BC: 2 };

function withDiagonals(V: typeof PARA, extra: Partial<PolygonFigureParams>): PolygonFigureParams {
  return {
    kind: "PolygonFigure",
    vertices: V,
    diagonals: [[0, 2], [1, 3]],
    center: { ...center(V), label: "E" },
    ...extra,
  };
}

// ── Parallelogram properties ─────────────────────────────────────────────────

function makeParaOppAnglesAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 6, 20);
    const p = randInt(rng, 2, 6);
    const q = randInt(rng, 2, 6);
    if (p === q) continue;
    const A = randInt(rng, 45, 135);
    if (A === 90) continue;
    const r = A - p * x;
    const s = A - q * x;
    const eA = `(${lin(p, r)})°`;
    const eC = `(${lin(q, s)})°`;
    const B = 180 - A;
    return {
      type: "GEO.6",
      subtype: "ParaOppAnglesAlg",
      prompt: `In parallelogram ABCD, m∠A = ${eA} and m∠C = ${eC}. Find x, m∠A, and m∠B.`,
      given: { angleA: eA, angleC: eC },
      find: "x, m∠A, m∠B",
      answer: `x = ${x}, m∠A = ${A}°, m∠B = ${B}°`,
      steps: [
        step("∠A and ∠C are opposite angles, so they are congruent.", "Opposite angles of a parallelogram are congruent.", [
          { label: "equation", answer: `${lin(p, r)} = ${lin(q, s)}` },
        ]),
        step(`${p - q > 0 ? `${p - q}x = ${s - r}` : `${q - p}x = ${r - s}`}, so x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`m∠A = ${p}(${x}) ${r >= 0 ? "+" : "−"} ${Math.abs(r)} = ${A}°.`, "Substitution.", [{ label: "m∠A", answer: `${A}°` }]),
        step(`m∠B = 180° − ${A}° = ${B}°.`, "Consecutive angles of a parallelogram are supplementary.", [{ label: "m∠B", answer: `${B}°` }]),
      ],
      svgParams: { kind: "PolygonFigure", vertices: PARA, parallelMarks: PARALLEL_BOTH, angleLabels: { A: eA, C: eC } },
      verify: { kind: "paraOppAlg", p, r, q, s },
    };
  }
}

function makeParaConsecAnglesAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 5, 18);
    const p = randInt(rng, 2, 6);
    const q = randInt(rng, 1, 5);
    const A = randInt(rng, 50, 130);
    if (A === 90) continue;
    const B = 180 - A;
    const r = A - p * x;
    const s = B - q * x;
    if (Math.abs(r) > 60 || Math.abs(s) > 60) continue;
    const eA = `(${lin(p, r)})°`;
    const eB = `(${lin(q, s)})°`;
    return {
      type: "GEO.6",
      subtype: "ParaConsecAnglesAlg",
      prompt: `In parallelogram ABCD, m∠A = ${eA} and m∠B = ${eB}. Find x, m∠A, and m∠B.`,
      given: { angleA: eA, angleB: eB },
      find: "x, m∠A, m∠B",
      answer: `x = ${x}, m∠A = ${A}°, m∠B = ${B}°`,
      steps: [
        step("∠A and ∠B are consecutive angles, so they are supplementary.", "Consecutive angles of a parallelogram are supplementary.", [
          { label: "equation", answer: `${lin(p, r)} + ${lin(q, s)} = 180` },
        ]),
        step(`${p + q}x ${r + s >= 0 ? "+" : "−"} ${Math.abs(r + s)} = 180, so x = ${x}.`, "Combine like terms; Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`m∠A = ${A}° and m∠B = ${B}°.`, "Substitution.", [{ label: "angles", answer: `${A}°, ${B}°` }]),
      ],
      svgParams: { kind: "PolygonFigure", vertices: PARA, parallelMarks: PARALLEL_BOTH, angleLabels: { A: eA, B: eB } },
      verify: { kind: "paraConsecAlg", p, r, q, s },
    };
  }
}

function makeParaDiagAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 2, 12);
    const p = randInt(rng, 1, 4);
    const q = randInt(rng, 2, 6);
    if (p === q) continue;
    const half = randInt(rng, 8, 30);
    const r = half - p * x;
    const s = half - q * x;
    if (Math.abs(r) > 25 || Math.abs(s) > 25) continue;
    const e1 = lin(p, r);
    const e2 = lin(q, s);
    return {
      type: "GEO.6",
      subtype: "ParaDiagAlg",
      prompt: `The diagonals of parallelogram ABCD meet at E. AE = ${e1} and EC = ${e2}. Find x and AC.`,
      given: { AE: e1, EC: e2 },
      find: "x and AC",
      answer: `x = ${x}, AC = ${2 * half}`,
      steps: [
        step("E is the midpoint of AC, so AE = EC.", "The diagonals of a parallelogram bisect each other.", [{ label: "equation", answer: `${e1} = ${e2}` }]),
        step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`AE = ${half}, so AC = 2 × ${half} = ${2 * half}.`, "Substitution; Segment Addition.", [{ label: "AC", answer: String(2 * half) }]),
      ],
      svgParams: withDiagonals(PARA, { parallelMarks: PARALLEL_BOTH, sideLabels: { AE: e1, EC: e2 } }),
      verify: { kind: "paraDiagAlg", p, r, q, s },
    };
  }
}

// ── Rectangles, rhombuses, squares ───────────────────────────────────────────

function makeRectHalvesAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 2, 12);
    const p = randInt(rng, 1, 4);
    const q = randInt(rng, 1, 7);
    if (q === 2 * p) continue;
    const half = randInt(rng, 6, 25);
    const r = half - p * x;
    const s = 2 * half - q * x;
    if (Math.abs(r) > 25 || Math.abs(s) > 30) continue;
    const eAE = lin(p, r);
    const eBD = lin(q, s);
    return {
      type: "GEO.6",
      subtype: "RectHalvesAlg",
      prompt: `The diagonals of rectangle ABCD meet at E. AE = ${eAE} and BD = ${eBD}. Find x and BD.`,
      given: { AE: eAE, BD: eBD },
      find: "x and BD",
      answer: `x = ${x}, BD = ${2 * half}`,
      steps: [
        step("The diagonals of a rectangle are congruent and bisect each other, so BD = AC = 2 · AE.", "Diagonals of a rectangle are congruent; diagonals of a parallelogram bisect each other.", [
          { label: "equation", answer: `2(${eAE}) = ${eBD}` },
        ]),
        step(`x = ${x}.`, "Distributive Property; Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`BD = ${q}(${x}) ${s >= 0 ? "+" : "−"} ${Math.abs(s)} = ${2 * half}.`, "Substitution.", [{ label: "BD", answer: String(2 * half) }]),
      ],
      svgParams: withDiagonals(RECT, { rightAngles: ["A", "B", "C", "D"], sideLabels: { AE: eAE } }),
      verify: { kind: "rectHalvesAlg", p, r, q, s },
    };
  }
}

function makeRhombusAngles(rng: RNG): GeometryProblem {
  let theta = 2 * randInt(rng, 25, 65);
  if (theta === 90) theta = 100;
  return {
    type: "GEO.6",
    subtype: "RhombusAngles",
    prompt: `In rhombus ABCD, the diagonals meet at E and m∠ABC = ${theta}°. Find m∠ABD and m∠BAC.`,
    given: { angleABC: theta },
    find: "m∠ABD and m∠BAC",
    answer: `m∠ABD = ${theta / 2}°, m∠BAC = ${90 - theta / 2}°`,
    steps: [
      step(`Diagonal BD bisects ∠ABC, so m∠ABD = ${theta}° ÷ 2 = ${theta / 2}°.`, "Each diagonal of a rhombus bisects a pair of opposite angles.", [{ label: "m∠ABD", answer: `${theta / 2}°` }]),
      step("The diagonals are perpendicular, so m∠AEB = 90°.", "The diagonals of a rhombus are perpendicular."),
      step(`In △ABE, m∠BAC = 180° − 90° − ${theta / 2}° = ${90 - theta / 2}°.`, "Triangle Angle-Sum Theorem.", [{ label: "m∠BAC", answer: `${90 - theta / 2}°` }]),
    ],
    svgParams: withDiagonals(RHOMBUS, {
      ticks: { AB: 1, BC: 1, CD: 1, DA: 1 },
      rightAngleMarks: [{ at: "E", from: "A", to: "B" }],
      angleLabels: { B: `${theta}°` },
    }),
    verify: { kind: "rhombusAngles", theta },
  };
}

function makeRhombusPerpAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 5, 25);
    const p = randInt(rng, 2, 6);
    const r = 90 - p * x;
    if (Math.abs(r) > 40 || r === 0) continue;
    const e = `(${lin(p, r)})°`;
    return {
      type: "GEO.6",
      subtype: "RhombusPerpAlg",
      prompt: `The diagonals of rhombus ABCD meet at E, and m∠AEB = ${e}. Find x.`,
      given: { angleAEB: e },
      find: "x",
      answer: `x = ${x}`,
      steps: [
        step("The diagonals of a rhombus are perpendicular, so m∠AEB = 90°.", "The diagonals of a rhombus are perpendicular.", [{ label: "equation", answer: `${lin(p, r)} = 90` }]),
        step(`${p}x = ${90 - r}, so x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
      ],
      svgParams: withDiagonals(RHOMBUS, { ticks: { AB: 1, BC: 1, CD: 1, DA: 1 } }),
      verify: { kind: "rhombusPerpAlg", p, r },
    };
  }
}

function makeSquareDiagAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 2, 12);
    const p = randInt(rng, 1, 5);
    const q = randInt(rng, 1, 5);
    if (p === q) continue;
    const half = randInt(rng, 5, 24);
    const r = half - p * x;
    const s = half - q * x;
    if (Math.abs(r) > 25 || Math.abs(s) > 25) continue;
    const e1 = lin(p, r);
    const e2 = lin(q, s);
    return {
      type: "GEO.6",
      subtype: "SquareDiagAlg",
      prompt: `The diagonals of square ABCD meet at E. AE = ${e1} and BE = ${e2}. Find x and AC.`,
      given: { AE: e1, BE: e2 },
      find: "x and AC",
      answer: `x = ${x}, AC = ${2 * half}`,
      steps: [
        step("A square is a rectangle, so its diagonals are congruent and bisect each other; that makes all four halves congruent, so AE = BE.", "Diagonals of a rectangle are congruent and bisect each other.", [
          { label: "equation", answer: `${e1} = ${e2}` },
        ]),
        step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`AE = ${half}, so AC = ${2 * half}.`, "Substitution; Segment Addition.", [{ label: "AC", answer: String(2 * half) }]),
      ],
      svgParams: withDiagonals(SQUARE, {
        ticks: { AB: 1, BC: 1, CD: 1, DA: 1 },
        rightAngles: ["A", "B", "C", "D"],
        sideLabels: { AE: e1, BE: e2 },
      }),
      verify: { kind: "squareDiagAlg", p, r, q, s },
    };
  }
}

// ── Kites and trapezoids ─────────────────────────────────────────────────────

function makeTrapMidAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 2, 10);
    const short = randInt(rng, 4, 16);
    const long = short + 2 * randInt(rng, 2, 8); // keeps the midsegment whole
    const mid = (short + long) / 2;
    const p = randInt(rng, 1, 4);
    const q = randInt(rng, 2, 6);
    if (q === 2 * p) continue;
    const r = mid - p * x;
    const s = long - q * x;
    if (Math.abs(r) > 25 || Math.abs(s) > 30) continue;
    const eMN = lin(p, r);
    const eAB = lin(q, s);
    return {
      type: "GEO.6",
      subtype: "TrapMidAlg",
      prompt: `MN is the midsegment of trapezoid ABCD with bases AB and DC. AB = ${eAB}, DC = ${short}, and MN = ${eMN}. Find x and MN.`,
      given: { AB: eAB, DC: short, MN: eMN },
      find: "x and MN",
      answer: `x = ${x}, MN = ${mid}`,
      steps: [
        step("The midsegment is half the sum of the bases: MN = ½(AB + DC).", "Trapezoid Midsegment Theorem.", [
          { label: "equation", answer: `${eMN} = ½(${eAB} + ${short})` },
        ]),
        step(`Multiply by 2: ${lin(2 * p, 2 * r)} = ${lin(q, s + short)}, so x = ${x}.`, "Multiplication, Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`MN = ${p}(${x}) ${r >= 0 ? "+" : "−"} ${Math.abs(r)} = ${mid}. Check: AB = ${long}, and ½(${long} + ${short}) = ${mid}.`, "Substitution.", [{ label: "MN", answer: String(mid) }]),
      ],
      svgParams: trapFigure({ AB: eAB, DC: String(short), MN: eMN }),
      verify: { kind: "trapMidAlg", p, r, q, s, t: short },
    };
  }
}

function trapFigure(labels: Record<string, string>): PolygonFigureParams {
  const A = { label: "A", x: 25, y: 150 };
  const B = { label: "B", x: 175, y: 150 };
  const C = { label: "C", x: 140, y: 60 };
  const D = { label: "D", x: 62, y: 60 };
  const M_ = { label: "M", x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 };
  const N = { label: "N", x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
  return {
    kind: "PolygonFigure",
    vertices: [A, B, C, D],
    extraPoints: [M_, N],
    segments: [["M", "N"]],
    ticks: { AM: 1, MD: 1, BN: 2, NC: 2 },
    parallelMarks: { AB: 1, DC: 1 },
    sideLabels: labels,
  };
}

function makeIsoTrapAngles(rng: RNG): GeometryProblem {
  const theta = randInt(rng, 48, 82);
  return {
    type: "GEO.6",
    subtype: "IsoTrapAngles",
    prompt: `ABCD is an isosceles trapezoid with bases AB and DC and legs AD ≅ BC. If m∠A = ${theta}°, find m∠B, m∠C, and m∠D.`,
    given: { angleA: theta },
    find: "m∠B, m∠C, m∠D",
    answer: `m∠B = ${theta}°, m∠C = ${180 - theta}°, m∠D = ${180 - theta}°`,
    steps: [
      step(`∠A and ∠B are base angles, so m∠B = ${theta}°.`, "Base angles of an isosceles trapezoid are congruent.", [{ label: "m∠B", answer: `${theta}°` }]),
      step(`AB ∥ DC, so ∠A and ∠D are same-side interior angles: m∠D = 180° − ${theta}° = ${180 - theta}°.`, "Same-Side Interior Angles Theorem.", [{ label: "m∠D", answer: `${180 - theta}°` }]),
      step(`∠C and ∠D are the other pair of base angles, so m∠C = ${180 - theta}°.`, "Base angles of an isosceles trapezoid are congruent.", [{ label: "m∠C", answer: `${180 - theta}°` }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: ISO_TRAP,
      ticks: { BC: 1, DA: 1 },
      parallelMarks: { AB: 1, DC: 1 },
      angleLabels: { A: `${theta}°` },
    },
    verify: { kind: "isoTrapAngles", theta },
  };
}

function makeIsoTrapDiagAlg(rng: RNG): GeometryProblem {
  for (;;) {
    const x = randInt(rng, 2, 12);
    const p = randInt(rng, 1, 5);
    const q = randInt(rng, 1, 5);
    if (p === q) continue;
    const d = randInt(rng, 10, 40);
    const r = d - p * x;
    const s = d - q * x;
    if (Math.abs(r) > 30 || Math.abs(s) > 30) continue;
    const e1 = lin(p, r);
    const e2 = lin(q, s);
    return {
      type: "GEO.6",
      subtype: "IsoTrapDiagAlg",
      prompt: `ABCD is an isosceles trapezoid with legs AD ≅ BC. Diagonal AC = ${e1} and diagonal BD = ${e2}. Find x and AC.`,
      given: { AC: e1, BD: e2 },
      find: "x and AC",
      answer: `x = ${x}, AC = ${d}`,
      steps: [
        step("The diagonals of an isosceles trapezoid are congruent, so AC = BD.", "Diagonals of an isosceles trapezoid are congruent.", [{ label: "equation", answer: `${e1} = ${e2}` }]),
        step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`AC = ${p}(${x}) ${r >= 0 ? "+" : "−"} ${Math.abs(r)} = ${d}.`, "Substitution.", [{ label: "AC", answer: String(d) }]),
      ],
      svgParams: {
        kind: "PolygonFigure",
        vertices: ISO_TRAP,
        diagonals: [[0, 2], [1, 3]],
        ticks: { BC: 1, DA: 1 },
        parallelMarks: { AB: 1, DC: 1 },
      },
      verify: { kind: "isoTrapDiagAlg", p, r, q, s },
    };
  }
}

// Pythagorean triples sharing a leg: leg → other legs
const SHARED_LEG: Record<number, number[]> = {
  8: [6, 15],
  12: [5, 9, 16],
  15: [8, 20],
  20: [15, 21],
  24: [7, 10, 18],
};

function makeKiteSides(rng: RNG): GeometryProblem {
  const a = pick(rng, [8, 12, 15, 20, 24] as const);
  const others = SHARED_LEG[a];
  const b = pick(rng, others);
  let c = pick(rng, others);
  if (c === b) c = others[(others.indexOf(b) + 1) % others.length];
  const AB = Math.round(Math.sqrt(a * a + b * b));
  const BC = Math.round(Math.sqrt(a * a + c * c));
  const per = 2 * (AB + BC);
  return {
    type: "GEO.6",
    subtype: "KiteSides",
    prompt: `In kite ABCD, AB ≅ AD and CB ≅ CD. The diagonals meet at E with BE = ${a}, AE = ${b}, and CE = ${c}. Find AB, BC, and the perimeter of ABCD.`,
    given: { BE: a, AE: b, CE: c },
    find: "AB, BC, perimeter",
    answer: `AB = ${AB}, BC = ${BC}, perimeter = ${per}`,
    steps: [
      step("The diagonals of a kite are perpendicular, so △ABE and △CBE are right triangles.", "The diagonals of a kite are perpendicular."),
      step(`AB = √(${b}² + ${a}²) = √${a * a + b * b} = ${AB}; BC = √(${c}² + ${a}²) = √${a * a + c * c} = ${BC}.`, "Pythagorean Theorem.", [
        { label: "AB", answer: String(AB) },
        { label: "BC", answer: String(BC) },
      ]),
      step(`Perimeter = 2(${AB}) + 2(${BC}) = ${per}.`, "AD = AB and CD = CB (definition of a kite).", [{ label: "perimeter", answer: String(per) }]),
    ],
    svgParams: {
      ...kiteFigure({}),
      angleArcs: undefined,
      diagonals: [[0, 2], [1, 3]],
      center: { x: 100, y: 88, label: "E" },
      rightAngleMarks: [{ at: "E", from: "A", to: "B" }],
      sideLabels: { BE: String(a), AE: String(b), EC: String(c) },
    },
    verify: { kind: "kiteSides", a, b, c },
  };
}

// ── Pools ────────────────────────────────────────────────────────────────────

export const PARALLELOGRAM_PROPS_POOL: MakerEntry[] = [
  fromTest("ParallelogramSides"),
  fromTest("ParallelogramAngles"),
  fromTest("ParallelogramDiagonals"),
  M("ParaOppAnglesAlg", 2, (rng) => makeParaOppAnglesAlg(rng)),
  M("ParaConsecAnglesAlg", 2, (rng) => makeParaConsecAnglesAlg(rng)),
  M("ParaDiagAlg", 2, (rng) => makeParaDiagAlg(rng)),
];

export const SPECIAL_PROPS_POOL: MakerEntry[] = [
  fromTest("RectangleDiagonals"),
  fromTest("RhombusDiagonals"),
  M("RhombusAngles", 1, (rng) => makeRhombusAngles(rng)),
  M("RhombusPerpAlg", 1, (rng) => makeRhombusPerpAlg(rng)),
  M("RectHalvesAlg", 2, (rng) => makeRectHalvesAlg(rng)),
  M("SquareDiagAlg", 2, (rng) => makeSquareDiagAlg(rng)),
];

export const KITE_TRAP_POOL: MakerEntry[] = [
  fromTest("TrapezoidMidsegment"),
  fromTest("KiteAngles"),
  M("IsoTrapAngles", 1, (rng) => makeIsoTrapAngles(rng)),
  M("TrapMidAlg", 2, (rng) => makeTrapMidAlg(rng)),
  M("IsoTrapDiagAlg", 2, (rng) => makeIsoTrapDiagAlg(rng)),
  M("KiteSides", 2, (rng) => makeKiteSides(rng)),
];

function gen(pool: MakerEntry[]) {
  return (rng: RNG, n: number, difficulty: Difficulty, only?: readonly string[]): GeometryProblem[] => {
    const p = only ? pool.filter((e) => only.includes(e.subtype)) : pool;
    return sampleFromPool(rng, p, n, difficulty);
  };
}

export const generateParallelogramPropsProblems = gen(PARALLELOGRAM_PROPS_POOL);
export const generateSpecialPropsProblems = gen(SPECIAL_PROPS_POOL);
export const generateKiteTrapProblems = gen(KITE_TRAP_POOL);

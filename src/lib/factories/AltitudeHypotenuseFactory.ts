// AltitudeHypotenuseFactory.ts
// Topic 10: The Altitude to the Hypotenuse (TEKS G.8(B)).
// Lesson ch10-1. The altitude from the right angle to the hypotenuse splits
// the hypotenuse into segments p (AD, next to leg AB) and q (DC, next to leg
// BC), and the geometric mean relations hold: altitude² = p·q, leg² = (its
// segment)·(whole hypotenuse), altitude = (leg · leg) / hypotenuse.
// D1: altitude length, from the legs or from the two segments. D2: one
// segment from the altitude and the other segment, or a leg from its segment
// and the hypotenuse. D3: all three unknowns from the two legs. Numbers are
// built from Pythagorean triples, so every answer is a whole number or a
// one-decimal value.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, num, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

/** The shared figure: right triangle ABC, right angle at B, altitude BD. */
function altitudeFigure(sideLabels: Record<string, string>) {
  return {
    kind: "TriangleFigure" as const,
    points: [
      { label: "A", x: 40, y: 140 },
      { label: "B", x: 105, y: 45 },
      { label: "C", x: 175, y: 140 },
      { label: "D", x: 105, y: 140 },
    ],
    segments: [["A", "B"], ["B", "C"], ["C", "A"], ["B", "D"]] as [string, string][],
    dashed: [] as [string, string][],
    rightAngles: ["B", "D"],
    sideLabels,
  };
}

function makeAltitudeFromLegs(rng: RNG): GeometryProblem {
  const k = randInt(rng, 1, 5);
  const a = 3 * k; // leg AB
  const b = 4 * k; // leg BC
  const c = 5 * k; // hypotenuse AC
  const h = (a * b) / c; // 12k/5: 2.4, 4.8, 7.2, 9.6, or 12
  return {
    type: "GEO.10",
    subtype: "AltitudeFromLegs",
    prompt: `A right triangle has legs ${a} and ${b} and hypotenuse ${c}. Find the length of the altitude drawn to the hypotenuse.`,
    given: { leg1: a, leg2: b, hypotenuse: c },
    find: "altitude to the hypotenuse",
    answer: num(h),
    steps: [
      step("The legs and the hypotenuse with its altitude enclose the same triangle, so the two ways of computing the area agree: ½·leg·leg = ½·hypotenuse·altitude.", "Area of a right triangle, computed two ways."),
      step(`Altitude = (leg × leg) ÷ hypotenuse = (${a} × ${b}) ÷ ${c} = ${a * b} ÷ ${c}.`, "Solve the area equation for the altitude.", [
        { label: "altitude", answer: num(h) },
      ]),
    ],
    svgParams: altitudeFigure({ AB: String(a), BC: String(b), AC: String(c), BD: "?" }),
    verify: { kind: "altLegs", a, b, c },
  };
}

function makeAltitudeFromSegments(rng: RNG): GeometryProblem {
  const pairs: [number, number][] = [
    [4, 9], [9, 4], [2, 8], [8, 2], [4, 16], [16, 4],
    [9, 16], [16, 9], [3, 12], [12, 3], [2, 18], [18, 2],
    [8, 18], [18, 8], [6, 24], [24, 6],
  ];
  const [p, q] = pick(rng, pairs);
  const h = Math.sqrt(p * q);
  return {
    type: "GEO.10",
    subtype: "AltitudeFromSegments",
    prompt: `The altitude to the hypotenuse of a right triangle divides the hypotenuse into segments of length ${p} and ${q}. Find the length of the altitude.`,
    given: { segment1: p, segment2: q },
    find: "altitude length",
    answer: String(h),
    steps: [
      step("The altitude to the hypotenuse is the geometric mean of the two segments of the hypotenuse.", "Right Triangle Similarity Theorem (geometric mean)."),
      step(`h² = ${p} × ${q} = ${p * q}.`, "Set the proportion segment/h = h/segment.", [
        { label: "h²", answer: String(p * q) },
      ]),
      step(`h = √${p * q} = ${h}.`, "Take the positive square root.", [{ label: "h", answer: String(h) }]),
    ],
    svgParams: altitudeFigure({ AD: String(p), DC: String(q), BD: "h" }),
    verify: { kind: "geoMean", p, q },
  };
}

function makeHypotenuseSegment(rng: RNG): GeometryProblem {
  const form = pick(rng, ["otherSegment", "leg"] as const);
  if (form === "otherSegment") {
    const options: [number, number][] = [
      [6, 2], [6, 3], [6, 4], [6, 9], [12, 8], [12, 9], [12, 16], [12, 18],
    ];
    const [h, p] = pick(rng, options);
    const q = (h * h) / p;
    return {
      type: "GEO.10",
      subtype: "HypotenuseSegment",
      prompt: `The altitude to the hypotenuse of a right triangle has length ${h} and divides the hypotenuse into two segments. One segment has length ${p}. Find the length of the other segment.`,
      given: { altitude: h, segment1: p },
      find: "other segment length",
      answer: String(q),
      steps: [
        step("The altitude is the geometric mean of the two segments, so altitude² = (one segment) × (other segment).", "Right Triangle Similarity Theorem (geometric mean)."),
        step(`${h}² = ${p} × q, so q = ${h * h} ÷ ${p} = ${q}.`, "Solve the geometric mean equation.", [
          { label: "q", answer: String(q) },
        ]),
      ],
      svgParams: altitudeFigure({ AD: String(p), DC: "?", BD: String(h) }),
      verify: { kind: "hypSegOther", h, p },
    };
  }
  // Leg from its adjacent segment and the whole hypotenuse (15-20-25 family).
  const options: [number, number, number][] = [
    [9, 25, 15], [16, 25, 20], [18, 50, 30], [32, 50, 40],
  ];
  const [seg, c, leg] = pick(rng, options);
  return {
    type: "GEO.10",
    subtype: "HypotenuseSegment",
    prompt: `In a right triangle, the hypotenuse has length ${c} and the altitude to the hypotenuse divides it into two segments. The segment adjacent to a leg has length ${seg}. Find the length of that leg.`,
    given: { segment: seg, hypotenuse: c },
    find: "leg length",
    answer: String(leg),
    steps: [
      step("Each leg is the geometric mean of the hypotenuse and the segment of the hypotenuse adjacent to that leg.", "Geometric Mean (Leg) Theorem."),
      step(`leg² = ${seg} × ${c} = ${seg * c}.`, "Set the proportion hypotenuse/leg = leg/segment.", [
        { label: "leg²", answer: String(seg * c) },
      ]),
      step(`leg = √${seg * c} = ${leg}.`, "Take the positive square root.", [{ label: "leg", answer: String(leg) }]),
    ],
    svgParams: altitudeFigure({ AD: String(seg), AC: String(c), AB: "?" }),
    verify: { kind: "hypSegLeg", seg, c },
  };
}

function makeAltitudeCombined(rng: RNG): GeometryProblem {
  const k = randInt(rng, 1, 4);
  const a = 3 * k; // leg AB
  const b = 4 * k; // leg BC
  const c = 5 * k; // hypotenuse AC
  const p = (a * a) / c; // AD = 9k/5
  const q = (b * b) / c; // DC = 16k/5
  const h = (a * b) / c; // BD = 12k/5
  const ans = `AD = ${num(p)}, DC = ${num(q)}, BD = ${num(h)}`;
  return {
    type: "GEO.10",
    subtype: "AltitudeCombined",
    prompt: `In right triangle ABC, the right angle is at B, AB = ${a}, and BC = ${b}, so the hypotenuse AC = ${c}. The altitude from B meets AC at D. Find AD, DC, and BD.`,
    given: { AB: a, BC: b, AC: c },
    find: "AD, DC, and the altitude BD",
    answer: ans,
    steps: [
      step("Each leg is the geometric mean of the hypotenuse and its adjacent segment: leg² = (segment) × (hypotenuse).", "Geometric Mean (Leg) Theorem."),
      step(`AD = AB² ÷ AC = ${a * a} ÷ ${c} = ${num(p)}, and DC = BC² ÷ AC = ${b * b} ÷ ${c} = ${num(q)}. Check: ${num(p)} + ${num(q)} = ${c}.`, "Apply the leg theorem to both legs.", [
        { label: "AD", answer: num(p) },
        { label: "DC", answer: num(q) },
      ]),
      step(`The altitude is the geometric mean of the two segments: BD = √(${num(p)} × ${num(q)}) = ${num(h)}.`, "Geometric Mean (Altitude) Theorem.", [
        { label: "BD", answer: num(h) },
      ]),
    ],
    svgParams: altitudeFigure({ AB: String(a), BC: String(b), BD: "?" }),
    verify: { kind: "altCombined", a, b, c },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const ALTITUDE_LESSON_POOL: MakerEntry[] = [
  M("AltitudeFromLegs", 1, (rng) => makeAltitudeFromLegs(rng)),
  M("AltitudeFromSegments", 1, (rng) => makeAltitudeFromSegments(rng)),
  M("HypotenuseSegment", 2, (rng) => makeHypotenuseSegment(rng)),
  M("AltitudeCombined", 3, (rng) => makeAltitudeCombined(rng)),
];

export function generateAltitudeProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? ALTITUDE_LESSON_POOL.filter((e) => only.includes(e.subtype)) : ALTITUDE_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

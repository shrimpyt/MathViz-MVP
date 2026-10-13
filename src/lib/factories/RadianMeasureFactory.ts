// RadianMeasureFactory.ts
// Topic 11: Radian Measure (TEKS G.12(D)).
// Lesson ch11-2, beside ch11-1 (circumference and arc length in degrees).
// A radian is the central angle that cuts off an arc equal to the radius, so
// π radians = 180°, arc length is s = rθ, and sector area is A = (1/2)r²θ.
// D1: convert between degrees and radians for the standard angles, answers
// in terms of π. D2: arc length from a radian measure. D3: sector area with
// radians, and recovering θ from an arc length and a radius.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, gcd, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

/** Format (num/den)·π in lowest terms: "π", "4π", "π/6", "2π/3". */
function piFrac(numerator: number, denominator: number): string {
  const g = gcd(numerator, denominator);
  const n = numerator / g;
  const d = denominator / g;
  if (n === 0) return "0";
  if (d === 1) return n === 1 ? "π" : `${n}π`;
  return n === 1 ? `π/${d}` : `${n}π/${d}`;
}

/** Standard radian measures as (numerator, denominator) of π, with degrees. */
const STANDARD: [number, number, number][] = [
  [1, 6, 30], [1, 4, 45], [1, 3, 60], [1, 2, 90], [2, 3, 120],
  [3, 4, 135], [5, 6, 150], [1, 1, 180], [7, 6, 210], [5, 4, 225],
  [4, 3, 240], [3, 2, 270], [5, 3, 300], [7, 4, 315], [11, 6, 330],
];

function makeDegreesToRadians(rng: RNG): GeometryProblem {
  const [, , deg] = pick(rng, STANDARD);
  const ans = piFrac(deg, 180);
  return {
    type: "GEO.11",
    subtype: "DegreesToRadians",
    prompt: `Convert ${deg}° to radians. Give the answer in terms of π.`,
    given: { degrees: deg },
    find: "radian measure",
    answer: ans,
    steps: [
      step("To convert degrees to radians, multiply by π/180, since 180° and π radians name the same angle.", "Degrees to radians: multiply by π/180."),
      step(`${deg}° × (π/180) = ${deg}π/180, which reduces to ${ans}.`, "Reduce the fraction.", [
        { label: "radians", answer: ans },
      ]),
    ],
    verify: { kind: "degToRad", deg },
  };
}

function makeRadiansToDegrees(rng: RNG): GeometryProblem {
  const [n, d, deg] = pick(rng, STANDARD);
  const rad = piFrac(n, d);
  return {
    type: "GEO.11",
    subtype: "RadiansToDegrees",
    prompt: `Convert ${rad} radians to degrees.`,
    given: { radians: rad },
    find: "degree measure",
    answer: `${deg}°`,
    steps: [
      step("To convert radians to degrees, multiply by 180/π, since π radians and 180° name the same angle.", "Radians to degrees: multiply by 180/π."),
      step(`${rad} × (180/π) = ${deg}°. The π factors cancel.`, "Cancel π and compute.", [
        { label: "degrees", answer: `${deg}°` },
      ]),
    ],
    verify: { kind: "radToDeg", num: n, den: d },
  };
}

function makeArcLengthRadians(rng: RNG): GeometryProblem {
  const choices: [number, number][] = [
    [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [5, 6], [1, 6], [3, 2], [4, 3],
  ];
  const [n, d] = pick(rng, choices);
  const r = randInt(rng, 3, 14);
  const theta = piFrac(n, d);
  const ans = piFrac(r * n, d); // s = rθ, kept in terms of π
  const deg = (n * 180) / d;
  return {
    type: "GEO.11",
    subtype: "ArcLengthRadians",
    prompt: `Find the length of an arc of a circle with radius ${r} cut by a central angle of ${theta} radians. Give the answer in terms of π.`,
    given: { r, theta },
    find: "arc length",
    answer: ans,
    steps: [
      step("With the angle in radians, the arc length is the radius times the angle: s = rθ. No degree conversion is needed.", "Arc length formula, radian form."),
      step(`s = ${r} × ${theta} = ${ans}.`, "Substitution.", [{ label: "s", answer: ans }]),
    ],
    svgParams: { kind: "ShadedSector", sectorAngle: deg },
    verify: { kind: "arcRad", r, num: n, den: d },
  };
}

function makeSectorAreaRadians(rng: RNG): GeometryProblem {
  const choices: [number, number][] = [
    [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [5, 6], [1, 6], [3, 2],
  ];
  const [n, d] = pick(rng, choices);
  const r = randInt(rng, 3, 12);
  const theta = piFrac(n, d);
  const ans = piFrac(r * r * n, 2 * d); // A = (1/2)r²θ, in terms of π
  const deg = (n * 180) / d;
  return {
    type: "GEO.11",
    subtype: "SectorAreaRadians",
    prompt: `Find the area of a sector of a circle with radius ${r} cut by a central angle of ${theta} radians. Give the answer in terms of π.`,
    given: { r, theta },
    find: "sector area",
    answer: ans,
    steps: [
      step("With the angle in radians, the sector area is half the radius squared times the angle: A = (1/2)r²θ.", "Sector area formula, radian form."),
      step(`A = (1/2) × ${r}² × ${theta} = ${ans}.`, "Substitution.", [{ label: "A", answer: ans }]),
    ],
    svgParams: { kind: "ShadedSector", sectorAngle: deg },
    verify: { kind: "sectorRad", r, num: n, den: d },
  };
}

function makeRadiansFromArc(rng: RNG): GeometryProblem {
  const choices: [number, number][] = [
    [1, 2], [1, 3], [2, 3], [3, 4], [5, 6], [3, 2], [4, 3],
  ];
  const [n, d] = pick(rng, choices);
  const r = randInt(rng, 3, 12);
  // Build the arc length from θ so that θ = s/r comes out a standard measure.
  const g = gcd(r * n, d);
  const sNum = (r * n) / g;
  const sDen = d / g;
  const arc = piFrac(sNum, sDen);
  const ans = piFrac(n, d);
  return {
    type: "GEO.11",
    subtype: "RadiansFromArc",
    prompt: `An arc of a circle with radius ${r} has length ${arc}. Find the measure of its central angle in radians.`,
    given: { r, arcLength: arc },
    find: "central angle in radians",
    answer: ans,
    steps: [
      step("Arc length is s = rθ, so the angle is the arc length divided by the radius: θ = s/r.", "Solve the arc length formula for θ."),
      step(`θ = ${arc} ÷ ${r} = ${ans} radians.`, "Substitution.", [{ label: "θ", answer: ans }]),
    ],
    verify: { kind: "radFromArc", sNum, sDen, r },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const RADIAN_MEASURE_LESSON_POOL: MakerEntry[] = [
  M("DegreesToRadians", 1, (rng) => makeDegreesToRadians(rng)),
  M("RadiansToDegrees", 1, (rng) => makeRadiansToDegrees(rng)),
  M("ArcLengthRadians", 2, (rng) => makeArcLengthRadians(rng)),
  M("SectorAreaRadians", 3, (rng) => makeSectorAreaRadians(rng)),
  M("RadiansFromArc", 3, (rng) => makeRadiansFromArc(rng)),
];

export function generateRadianProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? RADIAN_MEASURE_LESSON_POOL.filter((e) => only.includes(e.subtype)) : RADIAN_MEASURE_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

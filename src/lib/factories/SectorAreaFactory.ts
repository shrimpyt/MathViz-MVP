// SectorAreaFactory.ts
// Topic 11: Area of a Sector (TEKS G.12(C)).
// Lesson ch11-3, beside ch11-1 (circumference and arc length) and ch11-2
// (radian measure). A sector is the fraction angle/360 of the whole circle,
// so its area is that fraction of pi r squared. D1: degrees, direct
// substitution, answers in decimal form rounded to two places, matching
// ch11-1's pi conventions. D2: the angle given as a decimal number of
// radians, using A = (1/2) r^2 theta. D3: word problems and shaded regions
// (the rest of the circle, or the ring sector between two concentric
// circles).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, num, round2, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

const DEGREE_ANGLES = [30, 40, 45, 60, 72, 80, 90, 100, 120, 135, 150, 180, 200, 240, 270, 300];

function makeSectorDegrees(rng: RNG): GeometryProblem {
  const r = randInt(rng, 3, 14);
  const angle = pick(rng, DEGREE_ANGLES);
  const area = round2((angle / 360) * Math.PI * r * r);
  return {
    type: "GEO.11",
    subtype: "SectorDegrees",
    prompt: `Find the area of a sector of a circle with radius ${r} and a central angle of ${angle}°. Round to the nearest hundredth.`,
    given: { r, angle },
    find: "sector area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("A sector is the fraction angle/360 of the circle, so its area is that fraction of the full area pi r squared.", "Sector Area Formula."),
      step(`A = (${angle}/360) × π × ${r}² = (${angle}/360) × ${num(round2(Math.PI * r * r))}.`, "Substitution.", [
        { label: "circle area", answer: num(round2(Math.PI * r * r)) },
      ]),
      step(`A ≈ ${num(area)} square units.`, "Arithmetic.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: { kind: "ShadedSector", sectorAngle: angle },
    verify: { kind: "sectorDeg", r, angle },
  };
}

function makeSectorRadiansDecimal(rng: RNG): GeometryProblem {
  const [tNum, tDen] = pick(rng, [
    [1, 2], [4, 5], [1, 1], [6, 5], [3, 2], [9, 5], [2, 1], [5, 2], [3, 1],
  ] as [number, number][]);
  const theta = tNum / tDen;
  const r = randInt(rng, 2, 12);
  const area = round2(0.5 * r * r * theta);
  return {
    type: "GEO.11",
    subtype: "SectorRadians",
    prompt: `Find the area of a sector of a circle with radius ${r} and a central angle of ${num(theta)} radians. Round to the nearest hundredth.`,
    given: { r, theta: num(theta) },
    find: "sector area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("With the angle in radians, the sector area is half the radius squared times the angle: A = (1/2) r²θ.", "Sector Area Formula, radian form."),
      step(`A = (1/2) × ${r}² × ${num(theta)} = (1/2) × ${r * r} × ${num(theta)}.`, "Substitution.", [
        { label: "r²", answer: String(r * r) },
      ]),
      step(`A ≈ ${num(area)} square units.`, "Arithmetic.", [{ label: "A", answer: num(area) }]),
    ],
    verify: { kind: "sectorRadDec", r, tNum, tDen },
  };
}

const SECTOR_CONTEXTS = [
  { item: "A rotating sprinkler", unit: "ft", verb: "waters a sector of a lawn", ask: "area watered, in square feet" },
  { item: "A pizza", unit: "in", verb: "is cut so that one slice has the given central angle", ask: "area of the slice, in square inches" },
  { item: "A ceiling fan", unit: "ft", verb: "sweeps out a sector as one blade turns through the given angle", ask: "area swept, in square feet" },
] as const;

function makeSectorWord(rng: RNG): GeometryProblem {
  const c = pick(rng, SECTOR_CONTEXTS);
  const r = randInt(rng, 4, 15);
  const angle = pick(rng, DEGREE_ANGLES);
  const area = round2((angle / 360) * Math.PI * r * r);
  return {
    type: "GEO.11",
    subtype: "SectorWordProblem",
    prompt: `${c.item} with radius ${r} ${c.unit} ${c.verb}. The central angle is ${angle}°. Find the ${c.ask}. Round to the nearest hundredth.`,
    given: { r, angle },
    find: c.ask,
    answer: num(area),
    unit: "square units",
    steps: [
      step("Model the region as a sector and use A = (angle/360) × π r².", "Sector Area Formula."),
      step(`A = (${angle}/360) × π × ${r}².`, "Substitution.", [
        { label: "fraction", answer: `${angle}/360` },
      ]),
      step(`A ≈ ${num(area)} square units.`, "Arithmetic.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: { kind: "ShadedSector", sectorAngle: angle },
    verify: { kind: "sectorDeg", r, angle },
  };
}

function makeSectorShaded(rng: RNG): GeometryProblem {
  const form = pick(rng, ["remainder", "ring"] as const);
  const angle = pick(rng, [45, 60, 90, 120, 150, 180, 240, 270]);
  if (form === "remainder") {
    const r = randInt(rng, 4, 14);
    const area = round2(Math.PI * r * r * (1 - angle / 360));
    return {
      type: "GEO.11",
      subtype: "SectorShaded",
      prompt: `A circle has radius ${r}. A sector with central angle ${angle}° is removed from the circle. Find the area of the part of the circle that remains. Round to the nearest hundredth.`,
      given: { r, angle },
      find: "remaining area",
      answer: num(area),
      unit: "square units",
      steps: [
        step("The remaining region is the whole circle minus the sector, so subtract the sector area from the circle area.", "Shaded regions: subtract the removed part."),
        step(`Circle: π × ${r}² = ${num(round2(Math.PI * r * r))}. Sector: (${angle}/360) × π × ${r}² = ${num(round2((angle / 360) * Math.PI * r * r))}.`, "Area of a circle; Sector Area Formula.", [
          { label: "sector", answer: num(round2((angle / 360) * Math.PI * r * r)) },
        ]),
        step(`Remaining area ≈ ${num(area)} square units.`, "Subtraction.", [{ label: "A", answer: num(area) }]),
      ],
      svgParams: { kind: "ShadedSector", sectorAngle: angle },
      verify: { kind: "sectorRemainder", r, angle },
    };
  }
  const rIn = randInt(rng, 2, 8);
  const rOut = rIn + randInt(rng, 2, 6);
  const area = round2((angle / 360) * Math.PI * (rOut * rOut - rIn * rIn));
  return {
    type: "GEO.11",
    subtype: "SectorShaded",
    prompt: `Two concentric circles have radii ${rIn} and ${rOut}. A sector with central angle ${angle}° is marked on both circles. Find the area of the part of the larger sector that lies outside the smaller circle. Round to the nearest hundredth.`,
    given: { rIn, rOut, angle },
    find: "ring sector area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("The region is the larger sector minus the smaller sector; both sectors share the same central angle.", "Shaded regions: subtract the inner part."),
      step(`A = (${angle}/360) × π × (${rOut}² − ${rIn}²) = (${angle}/360) × π × ${rOut * rOut - rIn * rIn}.`, "Sector Area Formula applied twice.", [
        { label: "difference of squares", answer: String(rOut * rOut - rIn * rIn) },
      ]),
      step(`A ≈ ${num(area)} square units.`, "Arithmetic.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: { kind: "ShadedSector", sectorAngle: angle },
    verify: { kind: "sectorRing", R: rOut, r: rIn, angle },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const SECTOR_AREA_LESSON_POOL: MakerEntry[] = [
  M("SectorDegrees", 1, (rng) => makeSectorDegrees(rng)),
  M("SectorRadians", 2, (rng) => makeSectorRadiansDecimal(rng)),
  M("SectorWordProblem", 3, (rng) => makeSectorWord(rng)),
  M("SectorShaded", 3, (rng) => makeSectorShaded(rng)),
];

export function generateSectorAreaProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? SECTOR_AREA_LESSON_POOL.filter((e) => only.includes(e.subtype)) : SECTOR_AREA_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

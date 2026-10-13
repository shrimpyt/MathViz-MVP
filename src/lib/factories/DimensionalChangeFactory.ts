// DimensionalChangeFactory.ts
// Topic 13: Effects of Dimensional Change (TEKS G.10(B)).
// Lesson ch13-2. When every dimension of a figure is multiplied by a scale
// factor k, lengths and perimeters multiply by k, areas by k squared, and
// volumes by k cubed. D1: perimeter and circumference scale by k. D2: area
// and volume scale by k squared and k cubed. D3: work backwards from an
// area or volume ratio to the scale factor, and compare two similar solids.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, num, round2, frac, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

const FACTORS: [number, number][] = [
  [2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2], [5, 2], [2, 3],
];

function kStr(kNum: number, kDen: number): string {
  return frac(kNum, kDen);
}

function makeScalePerimeter(rng: RNG): GeometryProblem {
  const [kNum, kDen] = pick(rng, FACTORS);
  const t = randInt(rng, 2, 9);
  const perim = kDen * t * randInt(rng, 2, 6);
  const newPerim = (perim * kNum) / kDen;
  const shape = pick(rng, ["rectangle", "triangle", "regular hexagon", "square"] as const);
  return {
    type: "GEO.13",
    subtype: "ScalePerimeter",
    prompt: `A ${shape} has a perimeter of ${perim}. The figure is enlarged or reduced so that every dimension is multiplied by a scale factor of ${kStr(kNum, kDen)}. Find the perimeter of the new figure.`,
    given: { perimeter: perim, k: kStr(kNum, kDen) },
    find: "new perimeter",
    answer: num(newPerim),
    steps: [
      step("Perimeter is a length, and lengths scale by the scale factor itself.", "Dimensional change: lengths scale by k."),
      step(`New perimeter = ${perim} × ${kStr(kNum, kDen)} = ${num(newPerim)}.`, "Multiply by k.", [
        { label: "new perimeter", answer: num(newPerim) },
      ]),
    ],
    verify: { kind: "scalePerim", perim, kNum, kDen },
  };
}

function makeScaleCircumference(rng: RNG): GeometryProblem {
  const [kNum, kDen] = pick(rng, FACTORS);
  const r = randInt(rng, 2, 12);
  const oldC = round2(2 * Math.PI * r);
  const newC = round2(2 * Math.PI * r * (kNum / kDen));
  return {
    type: "GEO.13",
    subtype: "ScaleCircumference",
    prompt: `A circle has radius ${r} and circumference about ${num(oldC)}. The circle is scaled by a factor of ${kStr(kNum, kDen)}. Find the circumference of the new circle. Round to the nearest hundredth.`,
    given: { r, k: kStr(kNum, kDen) },
    find: "new circumference",
    answer: num(newC),
    steps: [
      step("Circumference is a length, so it scales by k, just as the radius does.", "Dimensional change: lengths scale by k."),
      step(`New radius = ${r} × ${kStr(kNum, kDen)} = ${num((r * kNum) / kDen)}, so the new circumference is 2π × ${num((r * kNum) / kDen)} ≈ ${num(newC)}.`, "Circumference formula on the scaled radius.", [
        { label: "new circumference", answer: num(newC) },
      ]),
    ],
    verify: { kind: "scaleCirc", r, kNum, kDen },
  };
}

function makeScaleAreaVolume(rng: RNG): GeometryProblem {
  const volume = rng() < 0.5;
  const [kNum, kDen] = pick(rng, FACTORS);
  const power = volume ? 3 : 2;
  const base = randInt(rng, 2, 8);
  const start = base * kDen ** power * randInt(rng, 1, 4);
  const result = start * (kNum ** power) / (kDen ** power);
  const solid = pick(rng, ["cube", "rectangular prism", "cylinder", "sphere"] as const);
  const shape2d = pick(rng, ["square", "circle", "triangle", "rectangle"] as const);
  return {
    type: "GEO.13",
    subtype: volume ? "ScaleVolume" : "ScaleArea",
    prompt: volume
      ? `A ${solid} has a volume of ${start} cubic units. Every dimension of the ${solid} is multiplied by a scale factor of ${kStr(kNum, kDen)}. Find the volume of the new ${solid}.`
      : `A ${shape2d} has an area of ${start} square units. Every dimension of the ${shape2d} is multiplied by a scale factor of ${kStr(kNum, kDen)}. Find the area of the new ${shape2d}.`,
    given: volume ? { volume: start, k: kStr(kNum, kDen) } : { area: start, k: kStr(kNum, kDen) },
    find: volume ? "new volume" : "new area",
    answer: num(result),
    unit: volume ? "cubic units" : "square units",
    steps: [
      step(
        volume
          ? "Volume is built from three lengths, so it scales by k cubed."
          : "Area is built from two lengths, so it scales by k squared.",
        volume ? "Dimensional change: volumes scale by k cubed." : "Dimensional change: areas scale by k squared."
      ),
      step(
        volume
          ? `k cubed = (${kStr(kNum, kDen)})³ = ${frac(kNum ** 3, kDen ** 3)}. New volume = ${start} × ${frac(kNum ** 3, kDen ** 3)} = ${num(result)}.`
          : `k squared = (${kStr(kNum, kDen)})² = ${frac(kNum ** 2, kDen ** 2)}. New area = ${start} × ${frac(kNum ** 2, kDen ** 2)} = ${num(result)}.`,
        "Apply the power of the scale factor.",
        [{ label: volume ? "new volume" : "new area", answer: num(result) }]
      ),
    ],
    verify: volume
      ? { kind: "scaleVolume", vol: start, kNum, kDen }
      : { kind: "scaleArea", area: start, kNum, kDen },
  };
}

function makeScaleFindK(rng: RNG): GeometryProblem {
  const volume = rng() < 0.5;
  const a = randInt(rng, 1, 3);
  const b = a + randInt(rng, 1, 3);
  const u = randInt(rng, 1, 6);
  const power = volume ? 3 : 2;
  const oldM = u * a ** power;
  const newM = u * b ** power;
  const ans = frac(b, a);
  return {
    type: "GEO.13",
    subtype: "ScaleFindK",
    prompt: volume
      ? `Two similar solids have volumes ${oldM} and ${newM} cubic units. Find the scale factor from the smaller solid to the larger solid.`
      : `Two similar figures have areas ${oldM} and ${newM} square units. Find the scale factor from the smaller figure to the larger figure.`,
    given: volume ? { smallVolume: oldM, largeVolume: newM } : { smallArea: oldM, largeArea: newM },
    find: "scale factor",
    answer: ans,
    steps: [
      step(
        volume
          ? "The volume ratio is the cube of the scale factor, so take the cube root of the volume ratio."
          : "The area ratio is the square of the scale factor, so take the square root of the area ratio.",
        volume ? "Dimensional change: volumes scale by k cubed." : "Dimensional change: areas scale by k squared."
      ),
      step(
        volume
          ? `Volume ratio = ${newM}/${oldM} = ${frac(newM, oldM)} = (${ans})³, so k = ${ans}.`
          : `Area ratio = ${newM}/${oldM} = ${frac(newM, oldM)} = (${ans})², so k = ${ans}.`,
        "Recover k from the ratio.",
        [{ label: "k", answer: ans }]
      ),
    ],
    verify: volume
      ? { kind: "scaleKFromVolumes", u, a, b }
      : { kind: "scaleKFromAreas", u, a, b },
  };
}

function makeScaleCompareSolids(rng: RNG): GeometryProblem {
  const a = randInt(rng, 1, 3);
  const b = a + randInt(rng, 1, 3);
  const u = randInt(rng, 1, 5);
  const smallVol = u * a ** 3;
  const bigVol = u * b ** 3;
  return {
    type: "GEO.13",
    subtype: "ScaleCompareSolids",
    prompt: `Two similar cylinders have radii in the ratio ${a}:${b}. The smaller cylinder has a volume of ${smallVol} cubic units. Find the volume of the larger cylinder.`,
    given: { linearRatio: `${a}:${b}`, smallVolume: smallVol },
    find: "volume of the larger cylinder",
    answer: num(bigVol),
    unit: "cubic units",
    steps: [
      step("The solids are similar, so the volume ratio is the cube of the linear ratio.", "Dimensional change: volumes scale by k cubed."),
      step(`Volume ratio = ${a}³:${b}³ = ${a ** 3}:${b ** 3}. Set up the proportion x/${smallVol} = ${b ** 3}/${a ** 3}.`, "Proportion from the volume ratio.", [
        { label: "volume ratio", answer: `${a ** 3}:${b ** 3}` },
      ]),
      step(`x = ${smallVol} × ${b ** 3} ÷ ${a ** 3} = ${bigVol}.`, "Cross-multiply and simplify.", [
        { label: "x", answer: num(bigVol) },
      ]),
    ],
    verify: { kind: "scaleVolFromRatio", a, b, smallVol },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const DIMENSIONAL_CHANGE_LESSON_POOL: MakerEntry[] = [
  M("ScalePerimeter", 1, (rng) => makeScalePerimeter(rng)),
  M("ScaleCircumference", 1, (rng) => makeScaleCircumference(rng)),
  M("ScaleArea", 2, (rng) => makeScaleAreaVolume(rng)),
  M("ScaleVolume", 2, (rng) => makeScaleAreaVolume(rng)),
  M("ScaleFindK", 3, (rng) => makeScaleFindK(rng)),
  M("ScaleCompareSolids", 3, (rng) => makeScaleCompareSolids(rng)),
];

export function generateDimensionalChangeProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? DIMENSIONAL_CHANGE_LESSON_POOL.filter((e) => only.includes(e.subtype)) : DIMENSIONAL_CHANGE_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

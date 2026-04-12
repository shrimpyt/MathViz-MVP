// MeasurementFactory.ts
// G.12(B) Circle Measurement problem generators

import type { MeasurementProblem, MeasurementSVGParams } from "../types";
import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";

// ── Individual makers ─────────────────────────────────────────────────────────

function makeCircumferenceProblem(rng: RNG): MeasurementProblem {
  const radius = randInt(rng, 2, 10);
  const answer = (2 * Math.PI * radius).toFixed(2);

  return {
    type: "G.12B",
    subtype: "Circumference",
    radius,
    find: "circumference of the circle",
    answer,
    unit: "units",
    steps: [
      {
        instruction: "Use the Circumference formula:",
        blanks: [{ label: "C = 2πr", answer: `2 × π × ${radius}` }],
      },
      {
        instruction: `Calculate the result:`,
        blanks: [{ label: "answer", answer }],
      },
    ],
    svgParams: {
      kind: "CircleMeasurement",
      radius,
      showArc: false,
    },
  };
}

function makeArcLengthProblem(rng: RNG): MeasurementProblem {
  const radius = randInt(rng, 5, 15);
  const angle = randInt(rng, 3, 15) * 10; // 30° to 150°
  const arcLen = ( (angle / 360) * 2 * Math.PI * radius ).toFixed(2);

  return {
    type: "G.12B",
    subtype: "ArcLength",
    radius,
    angle,
    find: `length of an arc with a central angle of ${angle}°`,
    answer: arcLen,
    unit: "units",
    steps: [
      {
        instruction: "Use the Arc Length formula:",
        blanks: [{ label: "L = (θ/360) × 2πr", answer: `(${angle}/360) × 2π × ${radius}` }],
      },
      {
        instruction: `Calculate the final length:`,
        blanks: [{ label: "answer", answer: arcLen }],
      },
    ],
    svgParams: {
      kind: "CircleMeasurement",
      radius,
      angle,
      showArc: true,
    },
  };
}

function makeSectorAreaProblem(rng: RNG): MeasurementProblem {
  const radius = randInt(rng, 4, 12);
  const angle = randInt(rng, 4, 18) * 10;
  const area = ( (angle / 360) * Math.PI * radius * radius ).toFixed(2);

  return {
    type: "G.12B",
    subtype: "SectorArea",
    radius,
    angle,
    find: `area of a sector with a central angle of ${angle}°`,
    answer: area,
    unit: "sq units",
    steps: [
      {
        instruction: "Use the Sector Area formula:",
        blanks: [{ label: "A = (θ/360) × πr²", answer: `(${angle}/360) × π × ${radius}²` }],
      },
      {
        instruction: `Calculate the final area:`,
        blanks: [{ label: "answer", answer: area }],
      },
    ],
    svgParams: {
      kind: "CircleMeasurement",
      radius,
      angle,
      showSector: true,
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const MEASUREMENT_MAKERS = [
  makeCircumferenceProblem,
  makeArcLengthProblem,
  makeSectorAreaProblem,
];

export function generateMeasurementProblems(rng: RNG, n: number): MeasurementProblem[] {
  return Array.from({ length: n }, () => pick(rng, MEASUREMENT_MAKERS)(rng));
}

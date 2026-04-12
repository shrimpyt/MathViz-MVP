// CoordinateFactory.ts
// G.2(B) Coordinate Geometry problem generators

import type { CoordinateProblem, CoordinateSVGParams } from "../types";
import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";

// ── Individual makers ─────────────────────────────────────────────────────────

function makeDistanceProblem(rng: RNG): CoordinateProblem {
  // Use small integers for cleaner results (-5 to 5)
  const x1 = randInt(rng, -5, 5);
  const y1 = randInt(rng, -5, 5);
  // Ensure p2 is not p1
  let x2 = randInt(rng, -5, 5);
  let y2 = randInt(rng, -5, 5);
  if (x1 === x2 && y1 === y2) { x2 += 2; }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const answer = Math.sqrt(distSq).toFixed(2);

  return {
    type: "G.2B",
    subtype: "Distance",
    p1: { x: x1, y: y1, label: "A" },
    p2: { x: x2, y: y2, label: "B" },
    find: "distance between points A and B",
    answer,
    steps: [
      {
        instruction: "Use the Distance Formula:",
        blanks: [{ label: "d = √((x₂-x₁)² + (y₂-y₁)²)", answer: `√(${x2}-${x1})² + (${y2}-${y1})²` }],
      },
      {
        instruction: "Simplify the squared differences:",
        blanks: [{ label: "√(Δx² + Δy²)", answer: `√(${dx}² + ${dy}²)` }],
      },
      {
        instruction: `The distance is √${distSq}:`,
        blanks: [{ label: "answer", answer }],
      },
    ],
    svgParams: {
      kind: "CoordinateGrid",
      p1: { x: x1, y: y1, label: "A" },
      p2: { x: x2, y: y2, label: "B" },
    },
  };
}

function makeMidpointProblem(rng: RNG): CoordinateProblem {
  const x1 = randInt(rng, -5, 5);
  const y1 = randInt(rng, -5, 5);
  const x2 = randInt(rng, -5, 5);
  const y2 = randInt(rng, -5, 5);

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const answer = `(${mx}, ${my})`;

  return {
    type: "G.2B",
    subtype: "Midpoint",
    p1: { x: x1, y: y1, label: "A" },
    p2: { x: x2, y: y2, label: "B" },
    find: "midpoint of segment AB",
    answer,
    steps: [
      {
        instruction: "Use the Midpoint Formula:",
        blanks: [{ label: "M = ((x₁+x₂)/2, (y₁+y₂)/2)", answer: `((${x1}+${x2})/2, (${y1}+${y2})/2)` }],
      },
      {
        instruction: "Calculate the coordinates:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    svgParams: {
      kind: "CoordinateGrid",
      p1: { x: x1, y: y1, label: "A" },
      p2: { x: x2, y: y2, label: "B" },
    },
  };
}

function makeSlopeProblem(rng: RNG): CoordinateProblem {
  const x1 = randInt(rng, -5, 5);
  const y1 = randInt(rng, -5, 5);
  let x2 = randInt(rng, -5, 5);
  if (x1 === x2) x2 += 1; // Avoid undefined slope
  const y2 = randInt(rng, -5, 5);

  const riser = y2 - y1;
  const runner = x2 - x1;
  const answer = (riser / runner).toFixed(2);

  return {
    type: "G.2B",
    subtype: "Slope",
    p1: { x: x1, y: y1, label: "A" },
    p2: { x: x2, y: y2, label: "B" },
    find: "slope of the line passing through A and B",
    answer,
    steps: [
      {
        instruction: "Use the Slope Formula (m = rise/run):",
        blanks: [{ label: "m = (y₂-y₁)/(x₂-x₁)", answer: `(${y2}-${y1})/(${x2}-${x1})` }],
      },
      {
        instruction: `The slope is ${riser}/${runner}:`,
        blanks: [{ label: "answer", answer }],
      },
    ],
    svgParams: {
      kind: "CoordinateGrid",
      p1: { x: x1, y: y1, label: "A" },
      p2: { x: x2, y: y2, label: "B" },
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const COORDINATE_MAKERS = [
  makeDistanceProblem,
  makeMidpointProblem,
  makeSlopeProblem,
];

export function generateCoordinateProblems(rng: RNG, n: number): CoordinateProblem[] {
  return Array.from({ length: n }, () => pick(rng, COORDINATE_MAKERS)(rng));
}

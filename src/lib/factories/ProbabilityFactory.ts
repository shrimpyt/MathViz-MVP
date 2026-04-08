// ProbabilityFactory.ts
// G.13(B) Area-Based Probability problem generators

import type { ProbabilityProblem } from "../types";
import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";

// ── Individual makers ─────────────────────────────────────────────────────────

function makeConcentricProblem(rng: RNG): ProbabilityProblem {
  const innerR = randInt(rng, 2, 6);
  const outerR = innerR + randInt(rng, 2, 6);
  const prob = parseFloat(((innerR ** 2) / (outerR ** 2)).toFixed(4));
  const pct = (prob * 100).toFixed(1) + "%";
  return {
    type: "G.13B",
    subtype: "ConcentricCircles",
    outerR,
    innerR,
    answer: prob,
    answerPct: pct,
    steps: [
      {
        instruction: "Probability = (favorable area) ÷ (total area):",
        blanks: [
          { label: "formula", answer: "P = π·r² / π·R²  =  r² / R²" },
        ],
      },
      {
        instruction: `Substitute inner radius r = ${innerR}, outer radius R = ${outerR}:`,
        blanks: [
          { label: "r²", answer: `${innerR}² = ${innerR ** 2}` },
          { label: "R²", answer: `${outerR}² = ${outerR ** 2}` },
          { label: "P", answer: `${innerR ** 2}/${outerR ** 2} ≈ ${pct}` },
        ],
      },
    ],
    svgParams: { kind: "ConcentricCircles", outerR, innerR },
  };
}

function makeSectorProblem(rng: RNG): ProbabilityProblem {
  const sectorAngle = randInt(rng, 1, 11) * 30; // 30, 60, …, 330
  const prob = parseFloat((sectorAngle / 360).toFixed(4));
  const pct = (prob * 100).toFixed(1) + "%";
  const radius = randInt(rng, 4, 10);
  return {
    type: "G.13B",
    subtype: "ShadedSector",
    outerR: radius,
    sectorAngle,
    answer: prob,
    answerPct: pct,
    steps: [
      {
        instruction: "Sector area = (θ/360°) × πr². Probability = sector area ÷ circle area:",
        blanks: [
          { label: "formula", answer: "P = θ / 360°" },
        ],
      },
      {
        instruction: `Substitute sector angle θ = ${sectorAngle}°:`,
        blanks: [
          { label: "θ / 360", answer: `${sectorAngle}° / 360°` },
          { label: "P", answer: `≈ ${pct}` },
        ],
      },
    ],
    svgParams: { kind: "ShadedSector", sectorAngle },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const PROB_MAKERS = [makeConcentricProblem, makeSectorProblem];

/** Generate n G.13(B) area-based probability problems using the provided RNG. */
export function generateProbabilityProblems(rng: RNG, n: number): ProbabilityProblem[] {
  return Array.from({ length: n }, () => pick(rng, PROB_MAKERS)(rng));
}

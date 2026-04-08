// CircleFactory.ts
// G.12(A) Circle Theorem problem generators

import type { CircleProblem, InscribedAngleSVGParams } from "../types";
import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";

// ── Individual makers ─────────────────────────────────────────────────────────

function makeInscribedAngleProblem(rng: RNG): CircleProblem {
  // Inscribed angle = half the intercepted arc
  const arc = randInt(rng, 4, 17) * 10; // multiples of 10: 40–170
  const angle = arc / 2;
  return {
    type: "G.12A",
    subtype: "InscribedAngle",
    given: { interceptedArc: arc },
    find: "inscribed angle",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "Recall the Inscribed Angle Theorem:",
        blanks: [
          {
            label: "formula",
            answer: "Inscribed Angle = ½ × Intercepted Arc",
          },
        ],
      },
      {
        instruction: `Substitute the intercepted arc measure of ${arc}°:`,
        blanks: [
          { label: "½ × ?", answer: `½ × ${arc}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: {
      kind: "InscribedAngle",
      interceptedArc: arc,
      inscribedAngle: angle,
    },
  };
}

function makeCentralAngleProblem(rng: RNG): CircleProblem {
  // Central angle = intercepted arc
  const arc = randInt(rng, 3, 17) * 10;
  return {
    type: "G.12A",
    subtype: "CentralAngle",
    given: { interceptedArc: arc },
    find: "central angle",
    answer: arc,
    unit: "°",
    steps: [
      {
        instruction: "Recall the Central Angle Theorem:",
        blanks: [{ label: "formula", answer: "Central Angle = Intercepted Arc" }],
      },
      {
        instruction: `The central angle equals the intercepted arc of ${arc}°:`,
        blanks: [{ label: "answer", answer: `${arc}°` }],
      },
    ],
    svgParams: {
      kind: "CentralAngle",
      interceptedArc: arc,
      centralAngle: arc,
    },
  };
}

function makeTangentProblem(rng: RNG): CircleProblem {
  // Angle formed by tangent-chord = half intercepted arc
  const arc = randInt(rng, 4, 17) * 10;
  const angle = arc / 2;
  return {
    type: "G.12A",
    subtype: "Tangent",
    given: { interceptedArc: arc },
    find: "tangent-chord angle",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "An angle formed by a tangent and a chord equals half the intercepted arc:",
        blanks: [{ label: "formula", answer: "Tangent-Chord Angle = ½ × Intercepted Arc" }],
      },
      {
        instruction: `Substitute ${arc}°:`,
        blanks: [
          { label: "½ × ?", answer: `½ × ${arc}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: { kind: "Tangent", tangentAngle: angle },
  };
}

function makeTwoChordsProblem(rng: RNG): CircleProblem {
  // Angle = ½(arc1 + arc2), arc1 + arc2 must be even and both ≥ 20
  const arc1 = randInt(rng, 2, 8) * 20;
  const arc2 = randInt(rng, 2, 8) * 20;
  const angle = (arc1 + arc2) / 2;
  return {
    type: "G.12A",
    subtype: "TwoChords",
    given: { arc1, arc2 },
    find: "angle formed by two chords",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "Two chords intersect inside a circle. The angle equals half the sum of intercepted arcs:",
        blanks: [{ label: "formula", answer: "Angle = ½(arc₁ + arc₂)" }],
      },
      {
        instruction: `Substitute arc₁ = ${arc1}° and arc₂ = ${arc2}°:`,
        blanks: [
          { label: "½(? + ?)", answer: `½(${arc1}° + ${arc2}°)` },
          { label: "½ × ?", answer: `½ × ${arc1 + arc2}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: { kind: "TwoChords", arc1, arc2 },
  };
}

function makeTwoSecantsProblem(rng: RNG): CircleProblem {
  // Angle = ½|farArc - nearArc|, both even, farArc > nearArc
  const nearArc = randInt(rng, 1, 5) * 20;
  const farArc = nearArc + randInt(rng, 2, 7) * 20;
  const angle = (farArc - nearArc) / 2;
  return {
    type: "G.12A",
    subtype: "TwoSecants",
    given: { farArc, nearArc },
    find: "angle formed by two secants",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "Two secants drawn from an external point. The angle equals half the difference of intercepted arcs:",
        blanks: [{ label: "formula", answer: "Angle = ½(far arc − near arc)" }],
      },
      {
        instruction: `Substitute far arc = ${farArc}°, near arc = ${nearArc}°:`,
        blanks: [
          { label: "½(? − ?)", answer: `½(${farArc}° − ${nearArc}°)` },
          { label: "½ × ?", answer: `½ × ${farArc - nearArc}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: {
      kind: "TwoSecants",
      interceptedArc: farArc,
    } as InscribedAngleSVGParams,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const CIRCLE_MAKERS = [
  makeInscribedAngleProblem,
  makeCentralAngleProblem,
  makeTangentProblem,
  makeTwoChordsProblem,
  makeTwoSecantsProblem,
];

/** Generate n G.12(A) circle-theorem problems using the provided RNG. */
export function generateCircleProblems(rng: RNG, n: number): CircleProblem[] {
  return Array.from({ length: n }, () => pick(rng, CIRCLE_MAKERS)(rng));
}

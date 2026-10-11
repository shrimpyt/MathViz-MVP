// ProofSimilarityFactory.ts
// Parameterized two-column AA similarity proofs: △ABC ~ △DEF.
//
// Difficulty:
//   1: two angle pairs given as measures → Definition of congruent angles → AA.
//   2: one pair are right angles (∠B, ∠E) → Right Angles Congruence Theorem.
//   3: one pair derived from angle bisectors (Angle Addition Postulate).
//
// The triangles are concrete: difficulty 2 uses a genuine right triangle at
// B/E (randomRightTriangleAtB); the AA conclusion only needs the angle facts,
// which are always exactly what the steps establish. Pure, seeded.

import type { RNG } from "../math-utils";
import { randInt } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode } from "../proofDiagrams";
import {
  R,
  randomAngleTriple,
  randomRightTriangleAtB,
  applyStudentMode,
} from "./ProofFactoryShared";

export type SimilarityFamily = "AA";

function givenStep(s: string): ProofStep {
  return { statement: s, reason: R.given };
}

function angCongSteps(ang1: string, ang2: string, deg: number): ProofStep[] {
  return [
    givenStep(`m${ang1} = ${deg}°, m${ang2} = ${deg}°`),
    { statement: `${ang1} ≅ ${ang2}`, reason: R.defCongAng },
  ];
}

/** Derive "∠ABC ≅ ∠DEF" from bisectors, halves h°. (Shared pattern.) */
function bisectorSteps(h: number): { given: string[]; steps: ProofStep[] } {
  return {
    given: [
      "ray BQ bisects ∠ABC",
      "ray ER bisects ∠DEF",
      `m∠ABQ = m∠DER = ${h}°`,
    ],
    steps: [
      givenStep("ray BQ bisects ∠ABC"),
      { statement: "∠ABQ ≅ ∠QBC", reason: R.defAngleBisector },
      givenStep("ray ER bisects ∠DEF"),
      { statement: "∠DER ≅ ∠REF", reason: R.defAngleBisector },
      givenStep(`m∠ABQ = m∠DER = ${h}°`),
      {
        statement: `m∠ABC = m∠ABQ + m∠QBC = 2(${h}°) = ${2 * h}°`,
        reason: R.angAddition,
      },
      {
        statement: `m∠DEF = m∠DER + m∠REF = 2(${h}°) = ${2 * h}°`,
        reason: R.angAddition,
      },
      { statement: "∠ABC ≅ ∠DEF", reason: R.defCongAng },
    ],
  };
}

export function makeSimilarityProof(
  rng: RNG,
  difficulty: 1 | 2 | 3,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const prove = "△ABC ~ △DEF";
  let given: string[];
  let steps: ProofStep[];

  if (difficulty === 1) {
    const [a, b] = randomAngleTriple(rng);
    given = [`m∠A = ${a}°, m∠D = ${a}°`, `m∠B = ${b}°, m∠E = ${b}°`];
    steps = [
      ...angCongSteps("∠A", "∠D", a),
      ...angCongSteps("∠B", "∠E", b),
      { statement: prove, reason: R.AA },
    ];
  } else if (difficulty === 2) {
    const t = randomRightTriangleAtB(rng);
    const a = t.angA;
    given = [
      "∠B and ∠E are right angles",
      `m∠A = ${a}°, m∠D = ${a}°`,
    ];
    steps = [
      givenStep("∠B and ∠E are right angles"),
      { statement: "∠B ≅ ∠E", reason: R.rightAnglesCong },
      ...angCongSteps("∠A", "∠D", a),
      { statement: prove, reason: R.AA },
    ];
  } else {
    const [, b] = randomAngleTriple(rng);
    const [a] = randomAngleTriple(rng);
    const h = Math.max(1, Math.round(b / 2));
    const d = bisectorSteps(h);
    given = [`m∠A = ${a}°, m∠D = ${a}°`, ...d.given];
    steps = [
      ...angCongSteps("∠A", "∠D", a),
      ...d.steps,
      { statement: prove, reason: R.AA },
    ];
  }

  return {
    type: "Proof",
    domain: "geometry",
    family: "Similarity:AA",
    given,
    prove,
    steps: applyStudentMode(steps, studentMode),
    svgParams: {
      kind: "ProofSimilarity",
      angleMarks: [true, true, false],
    },
    teks: "G.7(A)",
    studentMode,
    presentation: "two-column",
  };
}

/**
 * Generate n AA similarity proofs. `difficulty` is cumulative: each problem
 * draws a tier uniformly from 1..difficulty.
 */
export function generateSimilarityProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete"
): ProofProblem[] {
  return Array.from({ length: n }, () => {
    const tier = randInt(rng, 1, difficulty) as 1 | 2 | 3;
    return makeSimilarityProof(rng, tier, studentMode);
  });
}

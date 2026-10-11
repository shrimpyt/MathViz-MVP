// ProofCircleTheoremsFactory.ts
// Parameterized two-column circle-theorem proofs: inscribed angles and
// tangent-chord angles.
//
// Each proof is anchored in one seed arc measure (always even, so halving is
// exact) and applies the Inscribed Angle Theorem or the Tangent-Chord Angle
// Theorem. Difficulty:
//   1: direct theorem application from a given arc.
//   2: the intercepted arc is derived first (Arc Addition, or minor arc =
//      360° − major arc).
//   3: two angles sharing one intercepted arc are proved congruent via the
//      common half-measure.
//
// Pure, seeded. No JSX, no AI.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode } from "../proofDiagrams";
import { R, applyStudentMode } from "./ProofFactoryShared";

export type CircleTheoremFamily = "InscribedAngle" | "TangentChord";

export const CIRCLE_THEOREM_FAMILIES: readonly CircleTheoremFamily[] = [
  "InscribedAngle",
  "TangentChord",
];

const FAMILY_LABEL: Record<CircleTheoremFamily, string> = {
  InscribedAngle: "Inscribed Angle Theorem",
  TangentChord: "Tangent-Chord Angle Theorem",
};

function givenStep(s: string): ProofStep {
  return { statement: s, reason: R.given };
}

// ── Inscribed angle proofs ───────────────────────────────────────────────────

function inscribedD1(rng: RNG): { given: string[]; steps: ProofStep[]; prove: string; arc: number; angle: number } {
  const angle = randInt(rng, 20, 80);
  const arc = 2 * angle;
  return {
    given: [
      "∠ABC is an inscribed angle of ⊙O intercepting arc AC",
      `m(arc AC) = ${arc}°`,
    ],
    steps: [
      givenStep("∠ABC is an inscribed angle of ⊙O intercepting arc AC"),
      givenStep(`m(arc AC) = ${arc}°`),
      {
        statement: "m∠ABC = ½ · m(arc AC)",
        reason: R.inscribedAngleThm,
      },
      { statement: `m∠ABC = ½(${arc}°)`, reason: R.substitution },
      { statement: `m∠ABC = ${angle}°`, reason: R.simplify },
    ],
    prove: `m∠ABC = ${angle}°`,
    arc,
    angle,
  };
}

function inscribedD2(rng: RNG): { given: string[]; steps: ProofStep[]; prove: string; arc: number; angle: number } {
  const a = 2 * randInt(rng, 10, 40);
  const c = 2 * randInt(rng, 10, 40);
  const arc = a + c;
  const angle = arc / 2;
  return {
    given: [
      "∠ABC is an inscribed angle of ⊙O intercepting arc AC",
      `m(arc AB) = ${a}°`,
      `m(arc BC) = ${c}°`,
    ],
    steps: [
      givenStep("∠ABC is an inscribed angle of ⊙O intercepting arc AC"),
      givenStep(`m(arc AB) = ${a}°`),
      givenStep(`m(arc BC) = ${c}°`),
      {
        statement: `m(arc AC) = m(arc AB) + m(arc BC) = ${a}° + ${c}° = ${arc}°`,
        reason: R.arcAddition,
      },
      {
        statement: "m∠ABC = ½ · m(arc AC)",
        reason: R.inscribedAngleThm,
      },
      { statement: `m∠ABC = ½(${arc}°)`, reason: R.substitution },
      { statement: `m∠ABC = ${angle}°`, reason: R.simplify },
    ],
    prove: `m∠ABC = ${angle}°`,
    arc,
    angle,
  };
}

function inscribedD3(rng: RNG): { given: string[]; steps: ProofStep[]; prove: string; arc: number; angle: number } {
  const angle = randInt(rng, 20, 80);
  const arc = 2 * angle;
  return {
    given: [
      "∠ABC and ∠ADC are inscribed angles of ⊙O, both intercepting arc AC",
      `m(arc AC) = ${arc}°`,
    ],
    steps: [
      givenStep("∠ABC and ∠ADC are inscribed angles of ⊙O, both intercepting arc AC"),
      givenStep(`m(arc AC) = ${arc}°`),
      {
        statement: `m∠ABC = ½ · m(arc AC) = ½(${arc}°)`,
        reason: R.inscribedAngleThm,
      },
      { statement: `m∠ABC = ${angle}°`, reason: R.simplify },
      {
        statement: `m∠ADC = ½ · m(arc AC) = ½(${arc}°)`,
        reason: R.inscribedAngleThm,
      },
      { statement: `m∠ADC = ${angle}°`, reason: R.simplify },
      { statement: "∠ABC ≅ ∠ADC", reason: R.defCongAng },
    ],
    prove: "∠ABC ≅ ∠ADC",
    arc,
    angle,
  };
}

// ── Tangent-chord proofs ─────────────────────────────────────────────────────

function tangentD1(rng: RNG): { given: string[]; steps: ProofStep[]; prove: string; arc: number; angle: number } {
  const angle = randInt(rng, 20, 80);
  const arc = 2 * angle;
  return {
    given: [
      "line t is tangent to ⊙O at A",
      "AB is a chord of ⊙O",
      `m(arc AB) = ${arc}°`,
    ],
    steps: [
      givenStep("line t is tangent to ⊙O at A"),
      givenStep("AB is a chord of ⊙O"),
      givenStep(`m(arc AB) = ${arc}°`),
      {
        statement: "m∠TAB = ½ · m(arc AB)",
        reason: R.tangentChordThm,
      },
      { statement: `m∠TAB = ½(${arc}°)`, reason: R.substitution },
      { statement: `m∠TAB = ${angle}°`, reason: R.simplify },
    ],
    prove: `m∠TAB = ${angle}°`,
    arc,
    angle,
  };
}

function tangentD2(rng: RNG): { given: string[]; steps: ProofStep[]; prove: string; arc: number; angle: number } {
  const major = 2 * randInt(rng, 100, 160); // even, 200–320
  const arc = 360 - major; // even minor arc
  const angle = arc / 2;
  return {
    given: [
      "line t is tangent to ⊙O at A",
      "AB is a chord of ⊙O",
      `m(major arc AB) = ${major}°`,
    ],
    steps: [
      givenStep("line t is tangent to ⊙O at A"),
      givenStep("AB is a chord of ⊙O"),
      givenStep(`m(major arc AB) = ${major}°`),
      {
        statement: `m(minor arc AB) = 360° − ${major}° = ${arc}°`,
        reason: R.substitution,
      },
      {
        statement: "m∠TAB = ½ · m(minor arc AB)",
        reason: R.tangentChordThm,
      },
      { statement: `m∠TAB = ½(${arc}°)`, reason: R.substitution },
      { statement: `m∠TAB = ${angle}°`, reason: R.simplify },
    ],
    prove: `m∠TAB = ${angle}°`,
    arc,
    angle,
  };
}

function tangentD3(rng: RNG): { given: string[]; steps: ProofStep[]; prove: string; arc: number; angle: number } {
  const angle = randInt(rng, 20, 80);
  const arc = 2 * angle;
  return {
    given: [
      "line t is tangent to ⊙O at A",
      "AB is a chord of ⊙O",
      "∠ACB is an inscribed angle of ⊙O intercepting arc AB",
      `m(arc AB) = ${arc}°`,
    ],
    steps: [
      givenStep("line t is tangent to ⊙O at A"),
      givenStep("AB is a chord of ⊙O"),
      givenStep("∠ACB is an inscribed angle of ⊙O intercepting arc AB"),
      givenStep(`m(arc AB) = ${arc}°`),
      {
        statement: `m∠TAB = ½ · m(arc AB) = ½(${arc}°)`,
        reason: R.tangentChordThm,
      },
      { statement: `m∠TAB = ${angle}°`, reason: R.simplify },
      {
        statement: `m∠ACB = ½ · m(arc AB) = ½(${arc}°)`,
        reason: R.inscribedAngleThm,
      },
      { statement: `m∠ACB = ${angle}°`, reason: R.simplify },
      { statement: "∠TAB ≅ ∠ACB", reason: R.defCongAng },
    ],
    prove: "∠TAB ≅ ∠ACB",
    arc,
    angle,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function makeCircleTheoremProof(
  rng: RNG,
  family: CircleTheoremFamily,
  difficulty: 1 | 2 | 3,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const builder =
    family === "InscribedAngle"
      ? pick(rng, [inscribedD1, inscribedD2, inscribedD3].slice(0, difficulty))
      : pick(rng, [tangentD1, tangentD2, tangentD3].slice(0, difficulty));
  const proof = builder(rng);
  return {
    type: "Proof",
    domain: "geometry",
    family: `CircleTheorem:${FAMILY_LABEL[family]}`,
    given: proof.given,
    prove: proof.prove,
    steps: applyStudentMode(proof.steps, studentMode),
    svgParams: {
      kind: "ProofCircle",
      figure: family === "InscribedAngle" ? "inscribed" : "tangent",
      arc: proof.arc,
      angle: proof.angle,
    },
    teks: "G.12(A)",
    studentMode,
    presentation: "two-column",
  };
}

/**
 * Generate n circle-theorem proofs. `difficulty` is cumulative: each problem
 * draws a tier uniformly from 1..difficulty and a family uniformly from
 * `families` (default: both).
 */
export function generateCircleTheoremProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete",
  families: readonly CircleTheoremFamily[] = CIRCLE_THEOREM_FAMILIES
): ProofProblem[] {
  return Array.from({ length: n }, () => {
    const family = families[randInt(rng, 0, families.length - 1)];
    const tier = randInt(rng, 1, difficulty) as 1 | 2 | 3;
    return makeCircleTheoremProof(rng, family, tier, studentMode);
  });
}

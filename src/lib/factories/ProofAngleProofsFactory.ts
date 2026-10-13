// ProofAngleProofsFactory.ts
// Parameterized two-column angle proofs (TEKS G.6(A)).
//
// Variants:
//   VerticalAngles (tier 1): lines AB and CD intersect at E; the two
//     linear-pair equations sharing the middle angle are set equal, the
//     shared angle is subtracted, and the vertical angles are congruent.
//     Either vertical pair (AEC/DEB or AED/BEC) may be the target.
//   PerpendicularBisector (tier 2): M is the midpoint of AB and PM is
//     perpendicular to AB; prove PA ≅ PB by SAS on △PMA and △PMB
//     (midpoint, right angles, reflexive side), then CPCTC. This is the
//     Perpendicular Bisector Theorem.
//   PerpendicularBisectorConverse (tier 3): PA ≅ PB is given; take M as
//     the midpoint of AB (construction), prove △PMA ≅ △PMB by SSS, get
//     the two angles at M congruent, note they form a linear pair, so
//     each is 90°, PM is perpendicular to AB at its midpoint, and P lies
//     on the perpendicular bisector of AB.
//
// Pure, seeded. No JSX, no AI.

import type { RNG } from "../math-utils";
import { pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode } from "../proofDiagrams";
import { R, applyStudentMode } from "./ProofFactoryShared";

export type AngleProofVariant =
  | "VerticalAngles"
  | "PerpendicularBisector"
  | "PerpendicularBisectorConverse";

export const ANGLE_PROOF_VARIANTS: readonly AngleProofVariant[] = [
  "VerticalAngles",
  "PerpendicularBisector",
  "PerpendicularBisectorConverse",
];

const VARIANT_TIER: Record<AngleProofVariant, 1 | 2 | 3> = {
  VerticalAngles: 1,
  PerpendicularBisector: 2,
  PerpendicularBisectorConverse: 3,
};

const SUBTRACTION_PROPERTY = "Subtraction Property of Equality";
const DIVISION_PROPERTY = "Division Property of Equality";
const DEF_PERP_BISECTOR = "Definition of perpendicular bisector";

function givenStep(s: string): ProofStep {
  return { statement: s, reason: R.given };
}

interface AngleProof {
  given: string[];
  prove: string;
  steps: ProofStep[];
  svgParams: ProofProblem["svgParams"];
}

function buildVerticalAngles(rng: RNG): AngleProof {
  const pair = pick(rng, [0, 1] as const);
  // Pair 0: prove AEC ≅ DEB sharing AED. Pair 1: prove AED ≅ BEC sharing AEC.
  const [first, shared, second] =
    pair === 0 ? ["AEC", "AED", "DEB"] : ["AED", "AEC", "BEC"];
  const prove = `∠${first} ≅ ∠${second}`;
  const steps: ProofStep[] = [
    givenStep("Lines AB and CD intersect at E"),
    {
      statement: `m∠${first} + m∠${shared} = 180°`,
      reason: R.linearPair,
    },
    {
      statement: `m∠${shared} + m∠${second} = 180°`,
      reason: R.linearPair,
    },
    {
      statement: `m∠${first} + m∠${shared} = m∠${shared} + m∠${second}`,
      reason: R.substitution,
    },
    {
      statement: `m∠${first} = m∠${second}`,
      reason: SUBTRACTION_PROPERTY,
    },
    { statement: prove, reason: R.defCongAng },
  ];
  return {
    given: ["Lines AB and CD intersect at E"],
    prove,
    steps,
    svgParams: { kind: "ProofAngleFigure", figure: "vertical", markPair: pair },
  };
}

function buildPerpendicularBisector(): AngleProof {
  const prove = "PA ≅ PB";
  const steps: ProofStep[] = [
    givenStep("M is the midpoint of AB"),
    givenStep("PM ⊥ AB"),
    { statement: "AM ≅ MB", reason: R.defMidpoint },
    {
      statement: "∠PMA and ∠PMB are right angles",
      reason: R.defPerp,
    },
    { statement: "∠PMA ≅ ∠PMB", reason: R.rightAnglesCong },
    { statement: "PM ≅ PM", reason: R.reflexive },
    { statement: "△PMA ≅ △PMB", reason: R.SAS },
    { statement: prove, reason: R.cpctc },
  ];
  return {
    given: ["M is the midpoint of AB", "PM ⊥ AB"],
    prove,
    steps,
    svgParams: {
      kind: "ProofAngleFigure",
      figure: "perpBisector",
      markMidpoint: true,
      markSlants: false,
    },
  };
}

function buildPerpendicularBisectorConverse(): AngleProof {
  const prove = "P lies on the perpendicular bisector of AB";
  const steps: ProofStep[] = [
    givenStep("PA ≅ PB"),
    { statement: "Let M be the midpoint of AB", reason: R.construction },
    { statement: "AM ≅ MB", reason: R.defMidpoint },
    { statement: "PM ≅ PM", reason: R.reflexive },
    { statement: "△PMA ≅ △PMB", reason: R.SSS },
    { statement: "∠PMA ≅ ∠PMB", reason: R.cpctc },
    { statement: "m∠PMA = m∠PMB", reason: R.defCongAng },
    {
      statement: "m∠PMA + m∠PMB = 180°",
      reason: R.linearPair,
    },
    { statement: "2 · m∠PMA = 180°", reason: R.substitution },
    { statement: "m∠PMA = 90°", reason: DIVISION_PROPERTY },
    { statement: "PM ⊥ AB", reason: R.defPerp },
    { statement: prove, reason: DEF_PERP_BISECTOR },
  ];
  return {
    given: ["PA ≅ PB"],
    prove,
    steps,
    svgParams: {
      kind: "ProofAngleFigure",
      figure: "perpBisector",
      markMidpoint: true,
      markSlants: true,
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function makeAngleProof(
  rng: RNG,
  variant: AngleProofVariant,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const proof =
    variant === "VerticalAngles"
      ? buildVerticalAngles(rng)
      : variant === "PerpendicularBisector"
        ? buildPerpendicularBisector()
        : buildPerpendicularBisectorConverse();
  return {
    type: "Proof",
    domain: "geometry",
    family: `AngleProofs:${variant}`,
    given: proof.given,
    prove: proof.prove,
    steps: applyStudentMode(proof.steps, studentMode),
    svgParams: proof.svgParams,
    teks: "G.6(A)",
    studentMode,
    presentation: "two-column",
  };
}

/**
 * Generate n angle proofs. `difficulty` cumulatively unlocks variants
 * (tier 1 VerticalAngles, tier 2 adds PerpendicularBisector, tier 3 adds
 * the converse) among the caller supplied variants.
 */
export function generateAngleProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete",
  variants?: readonly AngleProofVariant[]
): ProofProblem[] {
  const supplied = variants ?? ANGLE_PROOF_VARIANTS;
  const unlocked = supplied.filter((v) => VARIANT_TIER[v] <= difficulty);
  const pool = unlocked.length > 0 ? unlocked : supplied;
  return Array.from({ length: n }, () =>
    makeAngleProof(rng, pick(rng, [...pool]), studentMode)
  );
}

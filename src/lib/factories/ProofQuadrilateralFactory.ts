// ProofQuadrilateralFactory.ts
// Parameterized two-column proofs that a quadrilateral is a parallelogram
// (TEKS G.6(E)). Quadrilateral ABCD is taken in order, so the opposite
// side pairs are AB with CD and BC with AD, and the diagonals AC and BD
// meet at M.
//
// Families (the standard sufficient conditions):
//   OnePairBoth (tier 1): one pair of opposite sides is given both
//     congruent and parallel; the diagonal gives SAS, CPCTC gives the
//     other pair of opposite sides, and the opposite-sides theorem ends it.
//   OppositeSidesCongruent (tier 2): both pairs of opposite sides are
//     congruent; diagonal AC gives SSS, CPCTC gives two pairs of alternate
//     interior angles, both pairs of sides are parallel, and the
//     definition of parallelogram ends it.
//   DiagonalsBisect (tier 3): the diagonals bisect each other; vertical
//     angles give SAS on △AMB and △CMD, CPCTC gives one pair of opposite
//     sides both congruent and (through alternate interior angles)
//     parallel, and the one-pair theorem ends it.
//
// Diagram marks are computed from the GIVEN facts only, the same facts
// the test checker recomputes from the parsed givens. Pure, seeded.

import type { RNG } from "../math-utils";
import { pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode } from "../proofDiagrams";
import { R, applyStudentMode } from "./ProofFactoryShared";

export type QuadrilateralFamily =
  | "OnePairBoth"
  | "OppositeSidesCongruent"
  | "DiagonalsBisect";

export const QUADRILATERAL_FAMILIES: readonly QuadrilateralFamily[] = [
  "OnePairBoth",
  "OppositeSidesCongruent",
  "DiagonalsBisect",
];

const FAMILY_TIER: Record<QuadrilateralFamily, 1 | 2 | 3> = {
  OnePairBoth: 1,
  OppositeSidesCongruent: 2,
  DiagonalsBisect: 3,
};

const DEF_PARALLELOGRAM = "Definition of parallelogram";
const OPP_SIDES_THM = "Opposite Sides Congruent Parallelogram Theorem";
const ONE_PAIR_THM = "One Pair Congruent and Parallel Parallelogram Theorem";

const PROVE = "ABCD is a parallelogram";

function givenStep(s: string): ProofStep {
  return { statement: s, reason: R.given };
}

interface QuadProof {
  given: string[];
  steps: ProofStep[];
  svgParams: ProofProblem["svgParams"];
}

function buildOnePairBoth(): QuadProof {
  const given = ["AB ≅ CD", "AB ∥ CD"];
  const steps: ProofStep[] = [
    givenStep("AB ≅ CD"),
    givenStep("AB ∥ CD"),
    { statement: "Draw diagonal AC", reason: R.construction },
    { statement: "∠BAC ≅ ∠DCA", reason: R.altIntAngles },
    { statement: "AC ≅ AC", reason: R.reflexive },
    { statement: "△ABC ≅ △CDA", reason: R.SAS },
    { statement: "BC ≅ AD", reason: R.cpctc },
    { statement: PROVE, reason: OPP_SIDES_THM },
  ];
  return {
    given,
    steps,
    svgParams: {
      kind: "ProofQuadrilateral",
      diagonal: "AC",
      sideMarks: [1, 0, 1, 0],
      parallelMarks: ["AB", "CD"],
      diagMarks: [0, 0],
    },
  };
}

function buildOppositeSidesCongruent(): QuadProof {
  const given = ["AB ≅ CD", "BC ≅ AD"];
  const steps: ProofStep[] = [
    givenStep("AB ≅ CD"),
    givenStep("BC ≅ AD"),
    { statement: "Draw diagonal AC", reason: R.construction },
    { statement: "AC ≅ AC", reason: R.reflexive },
    { statement: "△ABC ≅ △CDA", reason: R.SSS },
    { statement: "∠BAC ≅ ∠DCA", reason: R.cpctc },
    { statement: "AB ∥ CD", reason: R.altIntAnglesConverse },
    { statement: "∠BCA ≅ ∠DAC", reason: R.cpctc },
    { statement: "BC ∥ AD", reason: R.altIntAnglesConverse },
    { statement: PROVE, reason: DEF_PARALLELOGRAM },
  ];
  return {
    given,
    steps,
    svgParams: {
      kind: "ProofQuadrilateral",
      diagonal: "AC",
      sideMarks: [1, 2, 1, 2],
      parallelMarks: [],
      diagMarks: [0, 0],
    },
  };
}

function buildDiagonalsBisect(): QuadProof {
  const given = ["AC and BD intersect at M", "AM ≅ MC", "BM ≅ MD"];
  const steps: ProofStep[] = [
    givenStep("AC and BD intersect at M"),
    givenStep("AM ≅ MC"),
    givenStep("BM ≅ MD"),
    { statement: "∠AMB ≅ ∠CMD", reason: R.verticalAngles },
    { statement: "△AMB ≅ △CMD", reason: R.SAS },
    { statement: "AB ≅ CD", reason: R.cpctc },
    { statement: "∠BAM ≅ ∠DCM", reason: R.cpctc },
    { statement: "AB ∥ CD", reason: R.altIntAnglesConverse },
    { statement: PROVE, reason: ONE_PAIR_THM },
  ];
  return {
    given,
    steps,
    svgParams: {
      kind: "ProofQuadrilateral",
      diagonal: "both",
      sideMarks: [0, 0, 0, 0],
      parallelMarks: [],
      diagMarks: [1, 2],
    },
  };
}

const BUILDERS: Record<QuadrilateralFamily, () => QuadProof> = {
  OnePairBoth: buildOnePairBoth,
  OppositeSidesCongruent: buildOppositeSidesCongruent,
  DiagonalsBisect: buildDiagonalsBisect,
};

// ── Public API ────────────────────────────────────────────────────────────────

export function makeQuadrilateralProof(
  family: QuadrilateralFamily,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const proof = BUILDERS[family]();
  return {
    type: "Proof",
    domain: "geometry",
    family: `Quadrilateral:${family}`,
    given: proof.given,
    prove: PROVE,
    steps: applyStudentMode(proof.steps, studentMode),
    svgParams: proof.svgParams,
    teks: "G.6(E)",
    studentMode,
    presentation: "two-column",
  };
}

/**
 * Generate n quadrilateral proofs. `difficulty` cumulatively unlocks the
 * families (tier 1 OnePairBoth, tier 2 adds OppositeSidesCongruent,
 * tier 3 adds DiagonalsBisect) among the caller supplied families.
 */
export function generateQuadrilateralProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete",
  families?: readonly QuadrilateralFamily[]
): ProofProblem[] {
  const supplied = families ?? QUADRILATERAL_FAMILIES;
  const unlocked = supplied.filter((f) => FAMILY_TIER[f] <= difficulty);
  const pool = unlocked.length > 0 ? unlocked : supplied;
  return Array.from({ length: n }, () =>
    makeQuadrilateralProof(pick(rng, [...pool]), studentMode)
  );
}

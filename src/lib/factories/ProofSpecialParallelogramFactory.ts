// ProofSpecialParallelogramFactory.ts
// Two-column proofs that a quadrilateral is a rectangle, rhombus or square
// (TEKS G.6(E)). ABCD is taken in order (opposite sides AB/CD and BC/AD);
// the diagonals AC and BD meet at M.
//
// Families:
//   RhombusFromConsecutiveSides (tier 1): parallelogram + AB ≅ BC.
//   RectangleFromRightAngle     (tier 1): parallelogram + ∠A right.
//   SquareFromRectangle         (tier 2): rectangle + AB ≅ BC.
//   RectangleFromDiagonals      (tier 3): parallelogram + AC ≅ BD
//                                         (SSS, CPCTC, consecutive angles).
//   RhombusFromPerpDiagonals    (tier 3): parallelogram + AC ⊥ BD
//                                         (diagonals bisect, SAS, CPCTC).
//
// The figure is drawn as the shape the proof concludes, so every mark is
// true; marks come from the GIVEN facts only (the checker recomputes them).
// Pure, seeded.

import type { RNG } from "../math-utils";
import { pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode, ProofQuadrilateralSVGParams } from "../proofDiagrams";
import { R, applyStudentMode } from "./ProofFactoryShared";

export type SpecialParallelogramFamily =
  | "RhombusFromConsecutiveSides"
  | "RectangleFromRightAngle"
  | "SquareFromRectangle"
  | "RectangleFromDiagonals"
  | "RhombusFromPerpDiagonals";

export const SPECIAL_PARALLELOGRAM_FAMILIES: readonly SpecialParallelogramFamily[] = [
  "RhombusFromConsecutiveSides",
  "RectangleFromRightAngle",
  "SquareFromRectangle",
  "RectangleFromDiagonals",
  "RhombusFromPerpDiagonals",
];

const FAMILY_TIER: Record<SpecialParallelogramFamily, 1 | 2 | 3> = {
  RhombusFromConsecutiveSides: 1,
  RectangleFromRightAngle: 1,
  SquareFromRectangle: 2,
  RectangleFromDiagonals: 3,
  RhombusFromPerpDiagonals: 3,
};

/** Reasons used here beyond the shared vocabulary (the checker relies on these). */
export const RS = {
  oppSides: "Opposite sides of a parallelogram are congruent",
  oppAngles: "Opposite angles of a parallelogram are congruent",
  consecAngles: "Consecutive angles of a parallelogram are supplementary",
  diagsBisect: "Diagonals of a parallelogram bisect each other",
  transitive: "Transitive Property of Congruence",
  defRightAngle: "Definition of right angle",
  defRectangle: "Definition of rectangle",
  defRhombus: "Definition of rhombus",
  defSquare: "Definition of square",
  subtraction: "Subtraction Property of Equality",
  division: "Division Property of Equality",
  oneRightAngleRect: "A parallelogram with one right angle is a rectangle",
} as const;

const PARA = "ABCD is a parallelogram";
const BOTH_PAIRS = { parallelMarks: ["AB", "CD"], parallelMarks2: ["BC", "AD"] };

interface Built {
  given: string[];
  prove: string;
  steps: ProofStep[];
  svgParams: ProofQuadrilateralSVGParams;
}

const G = (s: string): ProofStep => ({ statement: s, reason: R.given });
const S = (statement: string, reason: string): ProofStep => ({ statement, reason });

function rhombusFromConsecutiveSides(): Built {
  return {
    given: [PARA, "AB ≅ BC"],
    prove: "ABCD is a rhombus",
    steps: [
      G(PARA),
      G("AB ≅ BC"),
      S("AB ≅ CD", RS.oppSides),
      S("BC ≅ AD", RS.oppSides),
      S("AB ≅ BC ≅ CD ≅ AD", RS.transitive),
      S("ABCD is a rhombus", RS.defRhombus),
    ],
    svgParams: { kind: "ProofQuadrilateral", shape: "rhombus", diagonal: "none", sideMarks: [1, 1, 0, 0], diagMarks: [0, 0], ...BOTH_PAIRS },
  };
}

function rectangleFromRightAngle(): Built {
  return {
    given: [PARA, "∠A is a right angle"],
    prove: "ABCD is a rectangle",
    steps: [
      G(PARA),
      G("∠A is a right angle"),
      S("m∠A = 90°", RS.defRightAngle),
      S("m∠A + m∠B = 180°", RS.consecAngles),
      S("90° + m∠B = 180°", R.substitution),
      S("m∠B = 90°", RS.subtraction),
      S("∠C ≅ ∠A and ∠D ≅ ∠B", RS.oppAngles),
      S("m∠C = 90° and m∠D = 90°", R.defCongAng),
      S("∠A, ∠B, ∠C, and ∠D are right angles", RS.defRightAngle),
      S("ABCD is a rectangle", RS.defRectangle),
    ],
    svgParams: { kind: "ProofQuadrilateral", shape: "rectangle", diagonal: "none", sideMarks: [0, 0, 0, 0], diagMarks: [0, 0], rightAngles: ["A"], ...BOTH_PAIRS },
  };
}

function squareFromRectangle(): Built {
  return {
    given: ["ABCD is a rectangle", "AB ≅ BC"],
    prove: "ABCD is a square",
    steps: [
      G("ABCD is a rectangle"),
      G("AB ≅ BC"),
      S(PARA, RS.defRectangle),
      S("AB ≅ CD", RS.oppSides),
      S("BC ≅ AD", RS.oppSides),
      S("AB ≅ BC ≅ CD ≅ AD", RS.transitive),
      S("ABCD is a rhombus", RS.defRhombus),
      S("ABCD is a square", RS.defSquare),
    ],
    svgParams: { kind: "ProofQuadrilateral", shape: "square", diagonal: "none", sideMarks: [1, 1, 0, 0], parallelMarks: [], diagMarks: [0, 0], rightAngles: ["A", "B", "C", "D"] },
  };
}

function rectangleFromDiagonals(): Built {
  return {
    given: [PARA, "AC ≅ BD"],
    prove: "ABCD is a rectangle",
    steps: [
      G(PARA),
      G("AC ≅ BD"),
      S("AB ≅ DC", RS.oppSides),
      S("BC ≅ CB", R.reflexive),
      S("△ABC ≅ △DCB", R.SSS),
      S("∠ABC ≅ ∠DCB", R.cpctc),
      S("m∠ABC = m∠DCB", R.defCongAng),
      S("m∠ABC + m∠DCB = 180°", RS.consecAngles),
      S("2 · m∠ABC = 180°", R.substitution),
      S("m∠ABC = 90°", RS.division),
      S("∠ABC is a right angle", RS.defRightAngle),
      S("ABCD is a rectangle", RS.oneRightAngleRect),
    ],
    svgParams: { kind: "ProofQuadrilateral", shape: "rectangle", diagonal: "both", sideMarks: [0, 0, 0, 0], diagMarks: [0, 0], ...BOTH_PAIRS },
  };
}

function rhombusFromPerpDiagonals(): Built {
  return {
    given: [PARA, "AC and BD intersect at M", "AC ⊥ BD"],
    prove: "ABCD is a rhombus",
    steps: [
      G(PARA),
      G("AC and BD intersect at M"),
      G("AC ⊥ BD"),
      S("AM ≅ CM", RS.diagsBisect),
      S("∠AMB and ∠CMB are right angles", R.defPerp),
      S("∠AMB ≅ ∠CMB", R.rightAnglesCong),
      S("BM ≅ BM", R.reflexive),
      S("△AMB ≅ △CMB", R.SAS),
      S("AB ≅ CB", R.cpctc),
      S("AB ≅ CD", RS.oppSides),
      S("BC ≅ AD", RS.oppSides),
      S("AB ≅ BC ≅ CD ≅ AD", RS.transitive),
      S("ABCD is a rhombus", RS.defRhombus),
    ],
    svgParams: { kind: "ProofQuadrilateral", shape: "rhombus", diagonal: "both", sideMarks: [0, 0, 0, 0], diagMarks: [0, 0], rightAngles: ["M"], ...BOTH_PAIRS },
  };
}

const BUILDERS: Record<SpecialParallelogramFamily, () => Built> = {
  RhombusFromConsecutiveSides: rhombusFromConsecutiveSides,
  RectangleFromRightAngle: rectangleFromRightAngle,
  SquareFromRectangle: squareFromRectangle,
  RectangleFromDiagonals: rectangleFromDiagonals,
  RhombusFromPerpDiagonals: rhombusFromPerpDiagonals,
};

export function makeSpecialParallelogramProof(
  family: SpecialParallelogramFamily,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const b = BUILDERS[family]();
  return {
    type: "Proof",
    domain: "geometry",
    family: `SpecialParallelogram:${family}`,
    given: b.given,
    prove: b.prove,
    steps: applyStudentMode(b.steps, studentMode),
    svgParams: b.svgParams,
    teks: "G.6(E)",
    studentMode,
    presentation: "two-column",
  };
}

/** n proofs; difficulty unlocks families cumulatively among those supplied.
 *  Cycles through the unlocked families before repeating one. */
export function generateSpecialParallelogramProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete",
  families?: readonly SpecialParallelogramFamily[]
): ProofProblem[] {
  const supplied = families ?? SPECIAL_PARALLELOGRAM_FAMILIES;
  const unlocked = supplied.filter((f) => FAMILY_TIER[f] <= difficulty);
  const pool = unlocked.length > 0 ? unlocked : [...supplied];
  const out: ProofProblem[] = [];
  let bag: SpecialParallelogramFamily[] = [];
  while (out.length < n) {
    if (bag.length === 0) bag = [...pool];
    const f = pick(rng, bag);
    bag = bag.filter((x) => x !== f);
    out.push(makeSpecialParallelogramProof(f, studentMode));
  }
  return out;
}

// ProofParallelLinesFactory.ts
// Parameterized two-column parallel-line / transversal proofs.
//
// Figure convention (shared with the diagram renderers): lines l (top) and m
// (bottom) cut by transversal t. Angles at the top intersection (l ∩ t):
//   ∠1 upper-left, ∠2 upper-right, ∠3 lower-right, ∠4 lower-left.
// Angles at the bottom intersection (m ∩ t):
//   ∠5 upper-left, ∠6 upper-right, ∠7 lower-right, ∠8 lower-left.
// Then corresponding = (1,5) (2,6) (3,7) (4,8); alternate interior = (3,6)
// (4,5); alternate exterior = (1,8) (2,7); same-side interior = (3,5) (4,6);
// vertical = (1,3) (2,4) (5,7) (6,8); linear pairs share a side.
//
// Difficulty:
//   1: one theorem application (corresponding / alternate / vertical /
//      same-side interior) from a numeric given.
//   2: a two-theorem chain (e.g. corresponding, then linear pair).
//   3: prove the lines parallel via a converse, from numeric angle data.
//
// Every numeric claim is computed from a single seed angle θ, so the
// arithmetic in the steps is always exact. Pure, seeded. No JSX, no AI.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode } from "../proofDiagrams";
import { R, applyStudentMode } from "./ProofFactoryShared";

export type ParallelVariant =
  | "corresponding"
  | "alternate-interior"
  | "alternate-exterior"
  | "same-side-interior"
  | "vertical";

export const PARALLEL_VARIANTS: readonly ParallelVariant[] = [
  "corresponding",
  "alternate-interior",
  "alternate-exterior",
  "same-side-interior",
  "vertical",
];

const PAIRS: Record<ParallelVariant, [number, number][]> = {
  corresponding: [[1, 5], [2, 6], [3, 7], [4, 8]],
  "alternate-interior": [[3, 6], [4, 5]],
  "alternate-exterior": [[1, 8], [2, 7]],
  "same-side-interior": [[3, 5], [4, 6]],
  vertical: [[1, 3], [2, 4], [5, 7], [6, 8]],
};

const THEOREM: Record<ParallelVariant, string> = {
  corresponding: R.corrAngles,
  "alternate-interior": R.altIntAngles,
  "alternate-exterior": R.altExtAngles,
  "same-side-interior": R.sameSideInt,
  vertical: R.verticalAngles,
};

const VARIANT_LABEL: Record<ParallelVariant, string> = {
  corresponding: "Corresponding Angles",
  "alternate-interior": "Alternate Interior Angles",
  "alternate-exterior": "Alternate Exterior Angles",
  "same-side-interior": "Same-Side Interior Angles",
  vertical: "Vertical Angles",
};

interface ParallelProof {
  given: string[];
  steps: ProofStep[];
  prove: string;
  markedAngles: [number, number];
  /** False when parallelism is what is being proved. */
  parallel: boolean;
  givenAngle?: number;
  givenAngleIndex?: number;
}

function givenStep(s: string): ProofStep {
  return { statement: s, reason: R.given };
}

/** Difficulty 1: one theorem application from a numeric given. */
function buildDirect(rng: RNG, variant: ParallelVariant): ParallelProof {
  const [i, j] = pick(rng, PAIRS[variant]);
  const theta = randInt(rng, 35, 145);
  const parallel = variant !== "vertical";
  const steps: ProofStep[] = [];
  const given: string[] = [];
  if (parallel) {
    given.push("l ∥ m");
    steps.push(givenStep("l ∥ m"));
  } else {
    given.push("lines l and t intersect");
    steps.push(givenStep("lines l and t intersect"));
  }
  given.push(`m∠${i} = ${theta}°`);
  steps.push(givenStep(`m∠${i} = ${theta}°`));

  let prove: string;
  if (variant === "same-side-interior") {
    steps.push({
      statement: `m∠${i} + m∠${j} = 180°`,
      reason: THEOREM[variant],
    });
    steps.push({
      statement: `m∠${j} = 180° − ${theta}°`,
      reason: R.substitution,
    });
    steps.push({
      statement: `m∠${j} = ${180 - theta}°`,
      reason: R.simplify,
    });
    prove = `m∠${j} = ${180 - theta}°`;
  } else {
    steps.push({ statement: `∠${i} ≅ ∠${j}`, reason: THEOREM[variant] });
    steps.push({
      statement: `m∠${j} = ${theta}°`,
      reason: R.defCongAng,
    });
    prove = `m∠${j} = ${theta}°`;
  }
  return {
    given,
    steps,
    prove,
    markedAngles: [i, j],
    parallel,
    givenAngle: theta,
    givenAngleIndex: i,
  };
}

/**
 * Difficulty 2: two-theorem chains.
 *  chain A: corresponding ∠2→∠6, then linear pair ∠6→∠7.
 *  chain B: alternate interior ∠4→∠5, then vertical ∠5→∠7.
 *  chain C: vertical ∠1→∠3, then corresponding ∠3→∠7.
 */
function buildChain(rng: RNG): ParallelProof {
  const theta = randInt(rng, 35, 145);
  const chain = pick(rng, ["A", "B", "C"] as const);
  let mid: number;
  let end: number;
  let start: number;
  let firstReason: string;
  let secondReason: string;
  if (chain === "A") {
    [start, mid, end] = [2, 6, 7];
    firstReason = R.corrAngles;
    secondReason = R.linearPair;
  } else if (chain === "B") {
    [start, mid, end] = [4, 5, 7];
    firstReason = R.altIntAngles;
    secondReason = R.verticalAngles;
  } else {
    [start, mid, end] = [1, 3, 7];
    firstReason = R.verticalAngles;
    secondReason = R.corrAngles;
  }

  const steps: ProofStep[] = [
    givenStep("l ∥ m"),
    givenStep(`m∠${start} = ${theta}°`),
    { statement: `∠${start} ≅ ∠${mid}`, reason: firstReason },
    { statement: `m∠${mid} = ${theta}°`, reason: R.defCongAng },
  ];
  let prove: string;
  if (secondReason === R.linearPair) {
    steps.push({
      statement: `m∠${mid} + m∠${end} = 180°`,
      reason: R.linearPair,
    });
    steps.push({
      statement: `m∠${end} = 180° − ${theta}°`,
      reason: R.substitution,
    });
    steps.push({
      statement: `m∠${end} = ${180 - theta}°`,
      reason: R.simplify,
    });
    prove = `m∠${end} = ${180 - theta}°`;
  } else {
    steps.push({ statement: `∠${mid} ≅ ∠${end}`, reason: secondReason });
    steps.push({ statement: `m∠${end} = ${theta}°`, reason: R.defCongAng });
    prove = `m∠${end} = ${theta}°`;
  }
  return {
    given: ["l ∥ m", `m∠${start} = ${theta}°`],
    steps,
    prove,
    markedAngles: [start, end],
    parallel: true,
    givenAngle: theta,
    givenAngleIndex: start,
  };
}

/** Difficulty 3: prove l ∥ m from numeric angle data via a converse. */
function buildConverse(rng: RNG): ParallelProof {
  const variant = pick(rng, [
    "corresponding",
    "alternate-interior",
    "same-side-interior",
  ] as const);
  const [i, j] = pick(rng, PAIRS[variant]);
  const theta = randInt(rng, 35, 145);
  const steps: ProofStep[] = [];
  const given: string[] = [];
  let converseReason: string;
  if (variant === "same-side-interior") {
    given.push(`m∠${i} = ${theta}°`, `m∠${j} = ${180 - theta}°`);
    steps.push(givenStep(`m∠${i} = ${theta}°`));
    steps.push(givenStep(`m∠${j} = ${180 - theta}°`));
    steps.push({
      statement: `m∠${i} + m∠${j} = ${theta}° + ${180 - theta}° = 180°`,
      reason: R.substitution,
    });
    converseReason = R.sameSideIntConverse;
  } else {
    given.push(`m∠${i} = ${theta}°`, `m∠${j} = ${theta}°`);
    steps.push(givenStep(`m∠${i} = ${theta}°`));
    steps.push(givenStep(`m∠${j} = ${theta}°`));
    steps.push({ statement: `∠${i} ≅ ∠${j}`, reason: R.defCongAng });
    converseReason =
      variant === "corresponding" ? R.corrAnglesConverse : R.altIntAnglesConverse;
  }
  steps.push({ statement: "l ∥ m", reason: converseReason });
  return {
    given,
    steps,
    prove: "l ∥ m",
    markedAngles: [i, j],
    parallel: false,
    givenAngle: theta,
    givenAngleIndex: i,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function makeParallelLineProof(
  rng: RNG,
  difficulty: 1 | 2 | 3,
  studentMode: ProofStudentMode = "complete",
  variant?: ParallelVariant
): ProofProblem {
  let proof: ParallelProof;
  let label: string;
  if (difficulty === 1) {
    const v = variant ?? pick(rng, PARALLEL_VARIANTS);
    proof = buildDirect(rng, v);
    label = VARIANT_LABEL[v];
  } else if (difficulty === 2) {
    proof = buildChain(rng);
    label = "Two-Step Angle Chase";
  } else {
    proof = buildConverse(rng);
    label = "Proving Lines Parallel";
  }
  return {
    type: "Proof",
    domain: "geometry",
    family: `ParallelLines:${label}`,
    given: proof.given,
    prove: proof.prove,
    steps: applyStudentMode(proof.steps, studentMode),
    svgParams: {
      kind: "ProofParallelLines",
      markedAngles: proof.markedAngles,
      parallel: proof.parallel,
      givenAngle: proof.givenAngle,
      givenAngleIndex: proof.givenAngleIndex,
    },
    teks: "G.5(A)",
    studentMode,
    presentation: "two-column",
  };
}

/**
 * Generate n parallel-line proofs. `difficulty` is cumulative: each problem
 * draws a tier uniformly from `tiers` (default: 1..difficulty).
 */
export function generateParallelLineProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete",
  tiers?: readonly (1 | 2 | 3)[]
): ProofProblem[] {
  const allowed = tiers ?? ([1, 2, 3].slice(0, difficulty) as (1 | 2 | 3)[]);
  return Array.from({ length: n }, () => {
    const tier = allowed[randInt(rng, 0, allowed.length - 1)];
    return makeParallelLineProof(rng, tier, studentMode);
  });
}

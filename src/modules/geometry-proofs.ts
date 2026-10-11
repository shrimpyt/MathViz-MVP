// geometry-proofs.ts
// Module wiring for the Geometry Proofs topic group: thin adapters from the
// CurriculumRegistry calling convention
//   generate(mode: OutputMode, seed: number, options?: { count?; difficulty? })
// to the proof factories in src/lib/factories/Proof*Factory.ts.
//
// OutputMode → student blanking mode:
//   GuidedNote → "guided" (mixed scaffolding)
//   Review     → "complete" (full proof shown)
//   Classical  → "complete" (contract: treat exactly like Review)
//   Test       → "supply-reasons" (students supply the reasons)
//
// NOTE (coordinator): these return ProofProblem[]. Once ProofProblem is added
// to the MathProblem union (see tests/proofs/WIRING.md), the casts in the
// registry snippet can be dropped.

import { mulberry32 } from "@/lib/math-utils";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { ProofProblem, ProofStudentMode } from "@/lib/proofDiagrams";
import {
  generateTriangleCongruenceProofs,
  generateCPCTCProofs,
  generateIsoscelesProofs,
  type CongruenceFamily,
} from "@/lib/factories/ProofTriangleCongruenceFactory";
import { generateParallelLineProofs } from "@/lib/factories/ProofParallelLinesFactory";
import {
  generateCircleTheoremProofs,
  type CircleTheoremFamily,
} from "@/lib/factories/ProofCircleTheoremsFactory";
import { generateSimilarityProofs } from "@/lib/factories/ProofSimilarityFactory";
import { generateElementsProofs } from "@/lib/factories/ProofElementsFactory";

export type ProofDifficulty = 1 | 2 | 3;

export interface ProofGenerateOptions {
  count?: number;
  difficulty?: ProofDifficulty;
}

export function proofDifficultyOf(options?: ProofGenerateOptions): ProofDifficulty {
  return options?.difficulty ?? 2;
}

export function proofStudentModeOf(mode: OutputMode): ProofStudentMode {
  switch (mode) {
    case "GuidedNote":
      return "guided";
    case "Review":
      return "complete";
    case "Classical":
      return "complete"; // contract: Classical emits full steps, like Review
    case "Test":
      return "supply-reasons";
  }
}

function proofCountOf(mode: OutputMode, options: ProofGenerateOptions | undefined, base: number): number {
  if (options?.count !== undefined) return options.count;
  return mode === "Review" || mode === "Classical" ? base * 3 : base;
}

// ── T4: Congruent Triangles ──────────────────────────────────────────────────

/** 4-2 / 4-3 / 4-6 — two-column congruence proofs for the given families. */
export function proofCongruenceProblems(
  families: readonly CongruenceFamily[],
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateTriangleCongruenceProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode),
    families
  );
}

/** 4-4 — CPCTC proofs. */
export function proofCPCTCProblems(
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateCPCTCProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode)
  );
}

/** 4-5 — isosceles / equilateral triangle proofs. */
export function proofIsoscelesProblems(
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateIsoscelesProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode)
  );
}

// ── T3: Parallel & Perpendicular Lines ───────────────────────────────────────

/** 3-2 (tiers 1–2) and 3-3 (tier 3) — parallel-line proofs. */
export function proofParallelLineProblems(
  tiers: readonly (1 | 2 | 3)[],
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateParallelLineProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode),
    tiers
  );
}

// ── T9: Similarity ───────────────────────────────────────────────────────────

/** 9-3 — AA similarity proofs. */
export function proofSimilarityProblems(
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateSimilarityProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode)
  );
}

// ── T12: Circle Theorems ─────────────────────────────────────────────────────

/** 12-1 / 12-3 — inscribed-angle and tangent-chord proofs. */
export function proofCircleTheoremProblems(
  families: readonly CircleTheoremFamily[],
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateCircleTheoremProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode),
    families
  );
}

// ── T2: Reasoning & Proof ────────────────────────────────────────────────────

/** 2-4 — Euclid's Elements flagship propositions. */
export function proofElementsProblems(
  mode: OutputMode,
  seed: number,
  options?: ProofGenerateOptions
): ProofProblem[] {
  const rng = mulberry32(seed);
  return generateElementsProofs(
    rng,
    proofCountOf(mode, options, 2),
    proofDifficultyOf(options),
    proofStudentModeOf(mode)
  );
}

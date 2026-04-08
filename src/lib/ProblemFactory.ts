// ProblemFactory.ts
// Thin orchestrator — re-exports all types and delegates to domain factories.
// All existing `import { … } from '@/lib/ProblemFactory'` continue to work.

// ── Re-export every type so consumers don't need to change their imports ──────
export type {
  TEKSStandard,
  OutputMode,
  BlankField,
  ProblemStep,
  CircleProblem,
  ProbabilityProblem,
  CongruenceProblem,
  CongruenceSubtype,
  CongruenceSVGParams,
  MathProblem,
  InscribedAngleSVGParams,
  TangentSVGParams,
  ChordSVGParams,
  ConcentricSVGParams,
  SectorSVGParams,
} from "./types";

import type { OutputMode, MathProblem } from "./types";
import { mulberry32, pick } from "./math-utils";
import { generateCircleProblems } from "./factories/CircleFactory";
import { generateProbabilityProblems } from "./factories/ProbabilityFactory";
import { generateTrigProblems } from "./factories/TrigonometryFactory";

// ── Public API ────────────────────────────────────────────────────────────────

export class ProblemFactory {
  private rng: () => number;

  constructor(seed?: number) {
    this.rng = mulberry32(seed ?? Date.now());
  }

  /** Generate n problems for G.12(A) */
  generateCircle(n: number) {
    return generateCircleProblems(this.rng, n);
  }

  /** Generate n problems for G.13(B) */
  generateProbability(n: number) {
    return generateProbabilityProblems(this.rng, n);
  }

  /** Generate n problems for G.9(A) Trigonometry */
  generateTrigonometry(n: number) {
    return generateTrigProblems(this.rng, n);
  }

  /** Generate a full set sized for the given output mode */
  generateForMode(mode: OutputMode): MathProblem[] {
    const multiplier = mode === "Review" ? 3 : 1;
    const circleCount = 3 * multiplier;
    const probCount = 2 * multiplier;
    const trigCount = 2 * multiplier; // Added 2 trig problems per standard worksheet
    return [
      ...this.generateCircle(circleCount),
      ...this.generateProbability(probCount),
      ...this.generateTrigonometry(trigCount),
    ];
  }
}

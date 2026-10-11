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
  CoordinateProblem,
  MeasurementProblem,
  TrigProblem,
  SpecialTriangleProblem,
  TrigSubtype,
  SpecialTriangleSubtype,
  CongruenceSubtype,
  MathProblem,
  InscribedAngleSVGParams,
  TangentSVGParams,
  ChordSVGParams,
  ConcentricSVGParams,
  SectorSVGParams,
  CongruenceSVGParams,
  CoordinateSVGParams,
  MeasurementSVGParams,
  TrigSVGParams,
} from "./types";

// ── Re-export new-area problem types (added by area workers) ────────────────
export type { ProofProblem, ProofStudentMode, ProofSVGParams } from "./proofDiagrams";
export type { BaseProofProblem, ProofStep } from "./proofTypes";
export type {
  Algebra1Problem,
  Algebra1Subtype,
  Algebra1TEKS,
  Algebra1Meta,
  Algebra1GraphParams,
  FunctionGraphSVGParams,
  ScatterPlotSVGParams,
  NumberLineSVGParams,
  TwoWayTableSVGParams,
} from "./factories/Algebra1Types";
export type {
  Algebra2Problem,
  Algebra2ProofProblem,
  Algebra2MathProblem,
} from "./factories/Algebra2Types";
export type {
  Grade6Problem,
  Grade7Problem,
  Grade8Problem,
  MiddleSchoolProblem,
  MiddleSchoolSVGParams,
} from "./factories/MiddleSchoolTypes";
export type { SATProblem, SATDomain, SATFormat } from "./satTypes";
export type { PrecalcMCQ, PrecalcFRQ, PrecalcProblem } from "./factories/PrecalcTypes";
export type {
  CalcMCQProblem,
  CalcFunction,
  CalcGraphParams,
  CalcTopicTag,
} from "./factories/CalculusUtils";
export type { BaseFRQProblem, APStimulus, FRQSubpart, APSubject } from "./apTypes";

import type { OutputMode, MathProblem } from "./types";
import { mulberry32 } from "./math-utils";
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

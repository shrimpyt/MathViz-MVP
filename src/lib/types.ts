// types.ts
// All shared domain types for Euclid problem generation.
// Single source of truth, imported by factories, renderers, and the public API.

// ── Output & TEKS ─────────────────────────────────────────────────────────────

import type { Algebra1TEKS } from "./factories/Algebra1Types";

export type TEKSStandard =
  | "G.12A" | "G.13B" | "G.9A" | "G.9B" | "G.2B" | "G.12B"
  | Algebra1TEKS;
export type OutputMode = "GuidedNote" | "Review" | "Test" | "Classical";

// ── Shared building blocks ────────────────────────────────────────────────────

export interface BlankField {
  label: string;       // hint shown in GuidedNote blanks, hidden in Test
  answer: string;      // the correct value (numeric or symbolic)
  unit?: string;
}

export interface ProblemStep {
  instruction: string;
  blanks?: BlankField[];
  /**
   * Optional justification for the step (e.g. "Inscribed Angle Theorem").
   * The Classical Notes renderer shows the instruction and blanks this
   * reason for the student to fill in. Other modes ignore it.
   */
  reason?: string;
}

// ── G.12(A): Circle problems (Theorems) ───────────────────────────────────────

export interface CircleProblem {
  type: "G.12A";
  subtype: "InscribedAngle" | "CentralAngle" | "Tangent" | "TwoChords" | "TwoSecants";
  given: Record<string, number>;   // named angle/arc values
  find: string;                    // what to solve for
  answer: number;                  // degrees
  unit: string;
  steps: ProblemStep[];
  svgParams: InscribedAngleSVGParams | TangentSVGParams | ChordSVGParams;
}

// ── G.13(B): Probability problems ─────────────────────────────────────────────

export interface ProbabilityProblem {
  type: "G.13B";
  subtype: "ConcentricCircles" | "ShadedSector";
  outerR: number;       // outer radius (arbitrary units)
  innerR?: number;      // for concentric circles
  sectorAngle?: number; // degrees, for shaded sector
  answer: number;       // probability as decimal, rounded to 4 places
  answerPct: string;    // "xx.x%"
  steps: ProblemStep[];
  svgParams: ConcentricSVGParams | SectorSVGParams;
}

// ── G.6(B): Triangle Congruence ───────────────────────────────────────────────

export type CongruenceSubtype = "SSS" | "SAS" | "ASA" | "AAS" | "HL";

export interface CongruenceProblem {
  type: "G.6B";
  subtype: CongruenceSubtype;
  /** Human-readable list of given congruences (e.g. "AB ≅ DE (8 units)") */
  given: string[];
  find: string;
  /** The theorem name as the answer ("SSS", "SAS", etc.) */
  answer: string;
  steps: ProblemStep[];
  svgParams: CongruenceSVGParams;
}

// ── G.9(A): Right Triangles & Trigonometry ────────────────────────────────────

export type TrigSubtype = "IdentifyRatio" | "SolveForSide" | "SolveForAngle" | "ElevationDepression";

export interface TrigProblem {
  type: "G.9A";
  subtype: TrigSubtype;
  ratioType: "sin" | "cos" | "tan";
  /** Which sides are given values (or variable expressions) */
  given: Record<string, string | number>; 
  find: string;
  answer: number | string;
  steps: ProblemStep[];
  svgParams: TrigSVGParams;
}

export type SpecialTriangleSubtype = "45-45-90" | "30-60-90";

export interface SpecialTriangleProblem {
  type: "G.9B";
  subtype: SpecialTriangleSubtype;
  given: Record<string, string | number>;
  find: string;
  answer: string | number;
  steps: ProblemStep[];
  svgParams: TrigSVGParams;
}

// ── G.2(B): Coordinate Geometry ───────────────────────────────────────────────

export type CoordinateSubtype = "Distance" | "Midpoint" | "Slope";

export interface CoordinateProblem {
  type: "G.2B";
  subtype: CoordinateSubtype;
  p1: { x: number; y: number; label: string };
  p2: { x: number; y: number; label: string };
  find: string;
  answer: number | string;
  steps: ProblemStep[];
  svgParams: CoordinateSVGParams;
}

// ── G.12(B): Circle Measurement ───────────────────────────────────────────────

export type MeasurementSubtype = "Circumference" | "ArcLength" | "SectorArea";

export interface MeasurementProblem {
  type: "G.12B";
  subtype: MeasurementSubtype;
  radius: number;
  angle?: number;
  find: string;
  answer: number | string;
  unit: string;
  steps: ProblemStep[];
  svgParams: MeasurementSVGParams;
}

// ── SVG parameter types ───────────────────────────────────────────────────────

export interface TrigSVGParams {
  kind: "RightTriangle";
  /** Seeded presentation variant (0-7): draw scale/position jitter. */
  variant?: number;
  /** The abstract lengths (not drawn to scale perfectly, but proportionally) */
  opposite: number;
  adjacent: number;
  hypotenuse: number;
  /** Labels shown on the corresponding edges */
  labels: {
    opposite: string | number;
    adjacent: string | number;
    hypotenuse: string | number;
  };
  /** Where the reference angle (theta) is located. 'top' vs 'base' */
  referenceAnglePos: "top" | "base";
  /** Label for reference angle (e.g. θ, or "30°") */
  referenceAngleLabel: string;
  /** Which orientation the triangle faces (left/right) */
  orientation: "left" | "right";
}

export interface CongruenceSVGParams {
  kind: "Congruence";
  /** Seeded presentation variant (0-7): mirror layout. */
  variant?: number;
  subtype: CongruenceSubtype;
  sideA: number;
  sideB: number;
  sideC: number;
  /**
   * Tick count (1, 2, or 3) for each side of triangle 1: [AB, BC, CA].
   * 0 means no tick mark on that side.
   */
  sideMarks: [number, number, number];
  /** Whether each vertex of triangle 1 gets an angle-congruence arc: [A, B, C] */
  angleMarks: [boolean, boolean, boolean];
  /** Index of the right-angle vertex in triangle 1 (0=A,1=B,2=C), -1 if none */
  rightAngleAt: number;
}

export interface InscribedAngleSVGParams {
  kind: "InscribedAngle" | "CentralAngle" | "TwoChords" | "TwoSecants";
  /** Seeded presentation variant (0-7): rotation of the configuration on the circle. */
  variant?: number;
  interceptedArc: number;   // degrees
  inscribedAngle?: number;
  centralAngle?: number;
}

export interface TangentSVGParams {
  kind: "Tangent";
  /** Seeded presentation variant (0-7): rotation of the configuration on the circle. */
  variant?: number;
  tangentAngle: number;
}

export interface ChordSVGParams {
  kind: "TwoChords";
  /** Seeded presentation variant (0-7): rotation of the configuration on the circle. */
  variant?: number;
  arc1: number;
  arc2: number;
}

export interface ConcentricSVGParams {
  kind: "ConcentricCircles";
  /** Seeded presentation variant (0-7): radius-line angle. */
  variant?: number;
  outerR: number;
  innerR: number;
}

export interface SectorSVGParams {
  kind: "ShadedSector";
  /** Seeded presentation variant (0-7): rotation of the sector start angle. */
  variant?: number;
  sectorAngle: number;
}

export interface CoordinateSVGParams {
  kind: "CoordinateGrid";
  /** Seeded presentation variant (0-7): marker style, dash pattern. */
  variant?: number;
  p1: { x: number; y: number; label: string };
  p2: { x: number; y: number; label: string };
  showRuler?: boolean;
}

export interface MeasurementSVGParams {
  kind: "CircleMeasurement";
  /** Seeded presentation variant (0-7): rotation of radius/angle configuration. */
  variant?: number;
  radius: number;
  angle?: number;
  showArc?: boolean;
  showSector?: boolean;
}

// ── Union type ────────────────────────────────────────────────────────────────

import type { ProofProblem } from "./proofDiagrams";
import type { Algebra1Problem } from "./factories/Algebra1Types";
import type { Algebra2Problem, Algebra2ProofProblem } from "./factories/Algebra2Types";
import type {
  Grade6Problem,
  Grade7Problem,
  Grade8Problem,
} from "./factories/MiddleSchoolTypes";
import type { SATProblem } from "./satTypes";
import type { PrecalcMCQ, PrecalcFRQ } from "./factories/PrecalcTypes";
import type { CalcMCQProblem } from "./factories/CalculusUtils";
import type { BaseFRQProblem } from "./apTypes";
import type { GeometryProblem } from "./factories/GeometryTypes";

export type MathProblem = 
  | CircleProblem 
  | ProbabilityProblem 
  | CongruenceProblem 
  | TrigProblem 
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | ProofProblem
  | Algebra1Problem
  | Algebra2Problem
  | Algebra2ProofProblem
  | Grade6Problem
  | Grade7Problem
  | Grade8Problem
  | SATProblem
  | PrecalcMCQ
  | PrecalcFRQ
  | CalcMCQProblem
  | BaseFRQProblem
  | GeometryProblem;

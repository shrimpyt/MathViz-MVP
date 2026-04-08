// types.ts
// All shared domain types for Euclid problem generation.
// Single source of truth — imported by factories, renderers, and the public API.

// ── Output & TEKS ─────────────────────────────────────────────────────────────

export type TEKSStandard = "G.12A" | "G.13B" | "G.9A";
export type OutputMode = "GuidedNote" | "Review" | "Test";

// ── Shared building blocks ────────────────────────────────────────────────────

export interface BlankField {
  label: string;       // hint shown in GuidedNote blanks, hidden in Test
  answer: string;      // the correct value (numeric or symbolic)
  unit?: string;
}

export interface ProblemStep {
  instruction: string;
  blanks?: BlankField[];
}

// ── G.12(A): Circle problems ──────────────────────────────────────────────────

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

export type TrigSubtype = "IdentifyRatio" | "SolveForSide" | "SolveForAngle";

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

export interface TrigSVGParams {
  kind: "RightTriangle";
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

// ── Union type ────────────────────────────────────────────────────────────────

export type MathProblem = CircleProblem | ProbabilityProblem | CongruenceProblem | TrigProblem;

// ── SVG parameter types ───────────────────────────────────────────────────────

export interface InscribedAngleSVGParams {
  kind: "InscribedAngle" | "CentralAngle" | "TwoChords" | "TwoSecants";
  interceptedArc: number;   // degrees
  inscribedAngle?: number;
  centralAngle?: number;
}

export interface TangentSVGParams {
  kind: "Tangent";
  tangentAngle: number;
}

export interface ChordSVGParams {
  kind: "TwoChords";
  arc1: number;
  arc2: number;
}

export interface ConcentricSVGParams {
  kind: "ConcentricCircles";
  outerR: number;
  innerR: number;
}

export interface SectorSVGParams {
  kind: "ShadedSector";
  sectorAngle: number;
}

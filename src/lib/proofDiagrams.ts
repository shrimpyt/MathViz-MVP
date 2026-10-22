// proofDiagrams.ts
// Parameter types for geometry-proof diagrams, plus the ProofProblem shape.
//
// Pure data, no JSX. Web rendering lives in
// src/components/diagrams/ProofDiagrams.tsx; PDF rendering lives in
// src/components/diagrams/PdfProofSVG.tsx. Both dispatch on the `kind`
// discriminant, mirroring the GeometrySVG / PdfGeometrySVG duality.
//
// All display strings follow the proofTypes.ts conventions: plain unicode
// text (≅ in statements, the PDF renderer maps it to ≃ via pdfSafeText).

import type { BaseProofProblem, ProofPresentation } from "./proofTypes";

/** Which blanking pattern the student sees (set by the factory). */
export type ProofStudentMode =
  | "complete" // everything filled in (review / answer key)
  | "fill-statements" // statements blanked for the student to fill in
  | "supply-reasons" // reasons blanked for the student to supply
  | "guided"; // mixed scaffolding

/** Triangle congruence proof figure: two marked triangles ABC and DEF. */
export interface ProofCongruenceSVGParams {
  kind: "ProofCongruence";
  subtype: "SSS" | "SAS" | "ASA" | "AAS" | "HL";
  /** Tick counts for sides AB, BC, CA (0 = unmarked). */
  sideMarks: [number, number, number];
  /** Angle arcs at vertices A, B, C. */
  angleMarks: [boolean, boolean, boolean];
  /** Right-angle vertex index (0=A, 1=B, 2=C), -1 when none. */
  rightAngleAt: number;
  /** Vertices (A, B, C) whose angle is bisected by a ray to point Q
   *  (R in triangle 2), drawn with equal half-angle arcs. Set when the
   *  proof's givens use angle bisectors (see bisectorAngle). */
  bisectors?: [boolean, boolean, boolean];
  /** Sides (0=AB, 1=BC, 2=CA) whose midpoint is named in the givens
   *  (T in triangle 1, S in triangle 2); drawn as a labeled dot. */
  midpoints?: number[];
}

/** Isosceles-triangle proof figure: single triangle ABC with AB = AC. */
export interface ProofIsoscelesSVGParams {
  kind: "ProofIsosceles";
  /** Draw congruence ticks on the equal legs AB and AC. */
  markEqualLegs: boolean;
  /** Draw angle arcs at the base angles B and C. */
  markBaseAngles: boolean;
}

/** Parallel-lines figure: lines l and m cut by transversal t, angles 1–8. */
export interface ProofParallelLinesSVGParams {
  kind: "ProofParallelLines";
  /** The related angle pair, as 1-based angle numbers (1–8). */
  markedAngles: [number, number];
  /** Draw parallel tick-marks on l and m (false when parallelism is the prove). */
  parallel: boolean;
  /** Measure labeled on the given angle, when the proof gives one. */
  givenAngle?: number;
  /** 1-based index of the angle carrying givenAngle. */
  givenAngleIndex?: number;
}

/** Similarity proof figure: two triangles with marked angles, "~" between. */
export interface ProofSimilaritySVGParams {
  kind: "ProofSimilarity";
  /** Angle arcs at vertices A, B, C. */
  angleMarks: [boolean, boolean, boolean];
  /** Same convention as ProofCongruenceSVGParams.bisectors. */
  bisectors?: [boolean, boolean, boolean];
  /** Right-angle vertex index (0=A, 1=B, 2=C), drawn as a square in both
   *  triangles; omit or -1 when the proof has no right-angle given. */
  rightAngleAt?: number;
}

/** Euclid's Elements flagship propositions. */
export type ElementsProposition =
  | "I.1"
  | "I.4"
  | "I.5"
  | "I.8"
  | "I.29"
  | "I.32"
  | "I.47"
  | "I.48";

/** Classical construction figure for an Elements proposition. */
export interface ProofElementsSVGParams {
  kind: "ProofElements";
  prop: ElementsProposition;
  /** Figure dimensions (e.g. the two legs for I.47). Interpretation is per-prop. */
  a?: number;
  b?: number;
}

/** Circle-theorem proof figure (inscribed angle or tangent-chord). */
export interface ProofCircleSVGParams {
  kind: "ProofCircle";
  figure: "inscribed" | "tangent";
  /** Intercepted arc measure, degrees. */
  arc: number;
  /** The angle being proved, degrees. */
  angle: number;
}

/** Quadrilateral proof figure: parallelogram ABCD (A bottom-left, B
 *  bottom-right, C top-right, D top-left) with optional diagonals. */
export interface ProofQuadrilateralSVGParams {
  kind: "ProofQuadrilateral";
  /** Which diagonals are drawn. */
  diagonal: "AC" | "BD" | "both" | "none";
  /** Tick counts for sides AB, BC, CD, DA (0 = unmarked). */
  sideMarks: [number, number, number, number];
  /** Sides carrying parallel arrow marks, as side names. */
  parallelMarks: string[];
  /** Tick counts for the diagonal halves: [AC halves AM/MC, BD halves BM/MD]. */
  diagMarks: [number, number];
}

/** Angle-proof figure: vertical angles at an intersection, or a point on
 *  the perpendicular bisector of a segment. */
export interface ProofAngleFigureSVGParams {
  kind: "ProofAngleFigure";
  figure: "vertical" | "perpBisector";
  /** Vertical only: the marked vertical pair, 0 = AEC/DEB, 1 = AED/BEC. */
  markPair?: 0 | 1;
  /** Perp bisector only: tick the midpoint halves AM and MB. */
  markMidpoint?: boolean;
  /** Perp bisector only: tick PA and PB (shown when given congruent). */
  markSlants?: boolean;
}

export type ProofSVGParams =
  | ProofCongruenceSVGParams
  | ProofIsoscelesSVGParams
  | ProofParallelLinesSVGParams
  | ProofSimilaritySVGParams
  | ProofElementsSVGParams
  | ProofCircleSVGParams
  | ProofQuadrilateralSVGParams
  | ProofAngleFigureSVGParams;

/**
 * A generated geometry proof problem. Extends BaseProofProblem with the
 * diagram params, TEKS code, student blanking mode, and optional Elements
 * presentation hint.
 *
 * NOTE (coordinator): add `ProofProblem` to the MathProblem union in
 * src/lib/types.ts (see tests/proofs/WIRING.md).
 */
export interface ProofProblem extends BaseProofProblem {
  type: "Proof";
  svgParams: ProofSVGParams;
  /** TEKS code, e.g. "G.6(B)". */
  teks: string;
  studentMode: ProofStudentMode;
  presentation?: ProofPresentation;
}

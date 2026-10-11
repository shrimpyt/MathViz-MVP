// MiddleSchoolTypes.ts
// Problem + SVG-param types for the middle school (grades 6/7/8) area.
// These are designed to slot into the MathProblem union in src/lib/types.ts
// as three new members: "MS.6", "MS.7", "MS.8". The shared-file changes
// needed are documented in tests/middle-school/WIRING.md.

import type { ProblemStep } from "../types";

// ── Problem interfaces ────────────────────────────────────────────────────────

export interface MiddleSchoolProblemBase {
  given: Record<string, number | string>;
  find: string;
  /** Final answer; number when exact-numeric, string for fractions, ratios,
   *  ordered lists, comparisons, percentages, and special values. */
  answer: number | string;
  unit?: string;
  steps: ProblemStep[];
  /** Full question text the cards render. */
  prompt: string;
  svgParams?: MiddleSchoolSVGParams | null;
  /**
   * Difficulty tier of the maker that produced this problem (1|2|3).
   * Stamped by the grade generators; lets tests and future accommodations
   * verify/filter by tier without re-running makers.
   */
  tier?: 1 | 2 | 3;
}

export type Grade6Subtype =
  | "MultiplyingDividingFractions"
  | "DecimalFluency"
  | "FDPConversions"
  | "IntegerOperations"
  | "VariablesAndExpressions"
  | "EquivalentExpressions"
  | "EquationsAndInequalities"
  | "TwoVariableRelationships"
  | "RatiosAndRates"
  | "RatioReasoning"
  | "AreaOfPolygons"
  | "VolumeAndSurfaceArea"
  | "TriangleProperties"
  | "DataDisplays"
  | "MeasuresOfCenterAndVariation"
  | "BankingAndCredit"
  | "CollegeAndSalaries";

export interface Grade6Problem extends MiddleSchoolProblemBase {
  type: "MS.6";
  subtype: Grade6Subtype;
}

export type Grade7Subtype =
  | "RationalNumbersAndAbsoluteValue"
  | "AddSubtractRational"
  | "MultiplyDivideRational"
  | "SolvingSimpleEquations"
  | "TwoStepEquations"
  | "SolvingInequalities"
  | "WritingProblemSituations"
  | "MeasuringAngles"
  | "AnglePairs"
  | "TriangleAngleSum"
  | "CircleParts"
  | "CircumferenceAndArea"
  | "SemicirclesAndQuarterCircles"
  | "CompositeFigures"
  | "Nets"
  | "PrismsSurfaceAreaVolume"
  | "PyramidsSurfaceAreaVolume"
  | "RatiosRates7"
  | "ProportionalRelationships"
  | "RepresentingLinearRelationships"
  | "Percents"
  | "Sampling"
  | "ComparingPopulations"
  | "ProbabilityConcepts"
  | "CompoundEvents"
  | "EconomicThinking"
  | "PercentsBeyond100"
  | "PercentError"
  | "ExpandingAndFactoring"
  | "DistributiveEquations"
  | "MultiStepInequalities";

export interface Grade7Problem extends MiddleSchoolProblemBase {
  type: "MS.7";
  subtype: Grade7Subtype;
}

export type Grade8Subtype =
  | "LinearEquations"
  | "Functions"
  | "SystemsOfEquations"
  | "PythagoreanTheorem"
  | "Transformations"
  | "ScientificNotation"
  | "Volume3D"
  | "ScatterPlots";

export interface Grade8Problem extends MiddleSchoolProblemBase {
  type: "MS.8";
  subtype: Grade8Subtype;
}

/** Every middle-school problem the factories can emit. */
export type MiddleSchoolProblem = Grade6Problem | Grade7Problem | Grade8Problem;

// ── SVG diagram parameter types (shared by the web + PDF renderers) ───────────

export interface MSNumberLineParams {
  kind: "MSNumberLine";
  min: number;
  max: number;
  /** Tick labels drawn on the line. */
  marks: number[];
  /** Solid dots drawn at these values. */
  highlight: number[];
  /** Hollow dots drawn at these values. */
  openHighlight?: number[];
  /** Ray from `from` in `dir` (for inequalities); dot is open/closed per `open`. */
  ray?: { from: number; dir: "left" | "right"; open: boolean } | null;
}

export interface MSPoint {
  x: number;
  y: number;
  label?: string;
  filled?: boolean;
}

export interface MSSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed?: boolean;
}

export interface MSPolygon {
  points: MSPoint[];
  label?: string;
  dashed?: boolean;
}

export interface MSCoordinateGridParams {
  kind: "MSCoordinateGrid";
  /** Seeded presentation variant (0-7): marker style, dash pattern, label placement. */
  variant?: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  points?: MSPoint[];
  segments?: MSSegment[];
  polygons?: MSPolygon[];
  showAxesLabels?: boolean;
}

export interface MSSpinnerParams {
  kind: "MSSpinner";
  /** Seeded presentation variant (0-7): rotation offset of the sectors. */
  variant?: number;
  /** Equal-size sectors, labeled clockwise from the top. */
  sectors: string[];
  /** Optional color key; defaults to a rotating palette. */
  colors?: string[];
}

export interface MSGeometryFigureParams {
  kind: "MSGeometryFigure";
  /** Seeded presentation variant (0-7): orientation, skew, scale, rotation. Never changes dims. */
  variant?: number;
  figure:
    | "parallelogram"
    | "triangle"
    | "trapezoid"
    | "rectangle"
    | "rectangular-prism"
    | "cylinder"
    | "cone"
    | "sphere"
    | "circle"
    | "angle-single"
    | "angle-complementary"
    | "angle-supplementary"
    | "angle-vertical"
    | "composite"
    | "net-cube";
  /** Named dimensions, e.g. { base: 8, height: 5 }. */
  dims: Record<string, number>;
}

export interface MSScatterPlotParams {
  kind: "MSScatterPlot";
  points: MSPoint[];
  maxX: number;
  maxY: number;
  xLabel: string;
  yLabel: string;
  trendline?: { x1: number; y1: number; x2: number; y2: number } | null;
}

export type MiddleSchoolSVGParams =
  | MSNumberLineParams
  | MSCoordinateGridParams
  | MSSpinnerParams
  | MSGeometryFigureParams
  | MSScatterPlotParams;

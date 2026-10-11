// Algebra1Types.ts
// Shared domain types for the Algebra 1 worksheet area.
//
// TEKS codes follow the authoritative scope doc
// (~/workspace/euclid-worksheet/CURRICULUM_SCOPE.md, "Algebra I — Topics 1–9"),
// with the "A." subject prefix per repo convention (doc lists "5A" → "A.5A").
//
// NOTE FOR WIRING (parent/integrator):
//   These types are new and live here on purpose — src/lib/types.ts and
//   src/lib/ProblemFactory.ts must NOT be edited by this worker.
//   To wire Algebra 1 into the app:
//     1. Add the Algebra1TEKS codes to the TEKSStandard union in src/lib/types.ts.
//     2. Add `Algebra1Problem` to the MathProblem union in src/lib/types.ts.
//     3. Re-export the new types from src/lib/ProblemFactory.ts.
//   See tests/algebra-1/WIRING.md for the exact diffs.

import type { ProblemStep } from "../types";

// ── TEKS Algebra I standard codes used as the `type` field ───────────────────
// Mirrors the existing pattern where `type` is a TEKS code ("G.12A", ...).

export type Algebra1TEKS =
  | "A.5A" // solve linear equations in one variable
  | "A.5B" // solve linear inequalities in one variable
  | "A.12E" // solve literal equations
  | "A.3B" // rate of change / slope
  | "A.2B" // write equations of lines
  | "A.2D" // direct variation
  | "A.3C" // graph linear functions
  | "A.2C" // write function rules
  | "A.12A" // relations & functions
  | "A.2A" // function notation
  | "A.2E" // parallel & perpendicular lines
  | "A.3E" // transformations of linear functions
  | "A.4C" // scatter plots & trend lines
  | "A.4B" // two-way tables (mission statistics basics)
  | "A.3F" // graph systems of equations
  | "A.5C" // solve systems algebraically
  | "A.2I" // systems applications
  | "A.3D" // linear inequalities in two variables
  | "A.3H" // systems of inequalities
  | "A.11B" // exponent properties
  | "A.11A" // simplifying radicals
  | "A.12D" // arithmetic & geometric sequences (explicit formula)
  | "A.12C" // recursive sequences
  | "A.10A" // add/subtract polynomials
  | "A.10D" // multiply & factor polynomials; rational expressions
  | "A.10B" // multiply binomials; factoring by grouping
  | "A.10E" // factor trinomials
  | "A.10F" // special factoring cases (difference of squares)
  | "A.6A" // graphs & properties of quadratics
  | "A.7A" // quadratic functions & key attributes
  | "A.7C" // transformations of quadratics
  | "A.6B" // vertex form
  | "A.8A" // solve quadratics (factoring, CTS, formula, discriminant)
  | "A.6C" // write quadratic functions
  | "A.9A" // exponential functions
  | "A.9B" // exponential growth & decay
  | "A.9E"; // exponential modeling

// ── Subtypes ────────────────────────────────────────────────────────────────

export type Algebra1Subtype =
  // T1: Solving equations & inequalities
  | "MultiStepEquation"
  | "VariablesBothSides"
  | "LiteralEquation"
  | "Proportion"
  | "EquationWordProblem"
  | "Inequality"
  | "CompoundInequality"
  | "AbsoluteValue"
  // T2/T3: Functions & linear functions (taught mixed)
  | "SlopeFromPoints"
  | "WriteSlopeIntercept"
  | "DirectVariation"
  | "WritePointSlope"
  | "StandardToSlopeIntercept"
  | "GraphLine"
  | "WriteFunctionRule"
  | "RelationsFunctions"
  | "FunctionNotation"
  | "ParallelPerpendicular"
  | "TransformLinear"
  | "LineOfBestFit"
  | "LinearWordProblem"
  | "TwoWayTable"
  // T4: Systems
  | "SystemGraphing"
  | "SystemSubstitution"
  | "SystemElimination"
  | "SystemWordProblem"
  | "SystemSpecialCase"
  | "LinearInequality"
  | "SystemOfInequalities"
  // T5: Exponents & radicals
  | "ZeroNegativeExponents"
  | "MultiplyPowers"
  | "PowerOfPower"
  | "DivisionProperties"
  | "RationalExponents"
  | "SimplifyRadicals"
  // T6: Sequences
  | "ArithmeticSequence"
  | "GeometricSequence"
  | "RecursiveArithmetic"
  | "RecursiveGeometric"
  | "SequenceWordProblem"
  // T7: Polynomials & factoring
  | "PolyAddSub"
  | "FactorGCF"
  | "FOIL"
  | "PolyMultiply"
  | "FactorTrinomialBasic"
  | "FactorTrinomialAC"
  | "FactorDifferenceSquares"
  | "FactorByGrouping"
  | "SimplifyRationalExpression"
  // T8: Quadratics
  | "QuadraticAttributes"
  | "GraphQuadratic"
  | "QuadraticTransformations"
  | "VertexForm"
  | "QuadraticFactoring"
  | "QuadraticFormula"
  | "QuadraticDiscriminant"
  | "CompleteSquare"
  | "WriteQuadratic"
  // T9: Exponentials
  | "GraphExponential"
  | "ExponentialGrowth"
  | "ExponentialDecay"
  | "ExponentialWordProblem"
  | "ExponentialModeling";

export type IneqRel = "<" | ">" | "<=" | ">=";
export type Pt2 = [number, number];

/**
 * Structural facts about a problem, used by the test harness to
 * independently recompute answers (a separate code path from the makers).
 * Every maker must fill the variant that matches its subtype.
 */
export type Algebra1Meta =
  | { kind: "equation"; a: number; b: number; c: number; d: number; word?: "consecutive" | "perimeter" } // a·x+b = c·x+d
  | { kind: "inequality"; a: number; b: number; c: number; rel: IneqRel } // a·x+b rel c
  | { kind: "compound"; a: number; b: number; lo: number; hi: number } // c1 < a·x+b < c2
  | { kind: "absolute"; b: number; c: number } // |x+b| = c, c > 0
  | { kind: "literal"; a: number; b: number; c: number; target: "x" | "y" } // a·x+b·y = c
  | { kind: "proportion"; a: number; b: number; c: number } // a/b = c/x
  | { kind: "slope"; p1: Pt2; p2: Pt2 }
  | { kind: "line"; m: number; b: number } // y = m·x+b
  | { kind: "pointSlope"; x1: number; y1: number; m: number } // y−y1 = m(x−x1)
  | { kind: "standard"; A: number; B: number; C: number } // A·x+B·y = C, B ≠ 0
  | { kind: "directVariation"; k: number; x: number } // y = k·x, evaluate at x
  | { kind: "functionRule"; m: number; b: number } // table of y = m·x+b
  | { kind: "relation"; pairs: Pt2[] }
  | { kind: "functionNotation"; m: number; b: number; c: number } // f(x) = m·x+b, find f(c)
  | { kind: "parallelPerp"; m: number; b: number; x1: number; y1: number; perp: boolean }
  | { kind: "transform"; baseM: number; baseB: number; shift: number; vertical: boolean }
  | {
      kind: "system";
      a1: number; b1: number; c1: number;
      a2: number; b2: number; c2: number;
      degenerate: "none" | "parallel" | "coincident";
    }
  | { kind: "linearInequality"; m: number; b: number; rel: IneqRel } // y rel m·x+b
  | {
      kind: "systemInequalities";
      m1: number; b1: number; rel1: IneqRel;
      m2: number; b2: number; rel2: IneqRel;
    }
  | { kind: "exponentEval"; base: number; exp: number } // base^exp
  | { kind: "monomial"; c1: number; e1: number; c2: number; e2: number; op: "mul" | "div" }
  | { kind: "monomialPow"; c: number; e: number; p: number } // (c·x^e)^p
  | { kind: "rationalExp"; base: number; num: number; den: number } // base^(num/den)
  | { kind: "radical"; n: number } // simplify √n
  | { kind: "poly"; p: number[]; q: number[]; op: "add" | "sub" | "mul" } // index = power
  | { kind: "factored"; poly: number[]; factors: number[][] } // factors multiply out to poly
  | { kind: "grouping"; a: number; b: number } // (x²+a)(x+b)
  | { kind: "rationalSimplify"; r1: number; r2: number } // (x−r1)(x−r2)/(x−r1)
  | { kind: "quadratic"; a: number; b: number; c: number } // a·x²+b·x+c = 0, a ≠ 0
  | { kind: "quadAttributes"; a: number; b: number; c: number }
  | { kind: "quadTransform"; a: number; h: number; k: number } // vs f(x) = x²
  | { kind: "vertex"; a: number; h: number; k: number } // f(x) = a(x−h)²+k, a ≠ 0
  | { kind: "writeQuad"; r1: number; r2: number } // roots → f(x) = (x−r1)(x−r2)
  | { kind: "completeSquare"; b: number; c: number } // x²+b·x+c = 0, b even
  | { kind: "exponential"; a: number; b: number; x: number } // f(x) = a·b^x, evaluate at x
  | { kind: "expModel"; a: number; b: number } // table of a·b^x
  | {
      kind: "sequence";
      seqKind: "arithmetic" | "geometric";
      a1: number; d: number; r: number; n: number; // d for arithmetic, r for geometric
    }
  | { kind: "recursive"; seqKind: "arithmetic" | "geometric"; a1: number; d: number; r: number; n: number }
  | { kind: "twoway"; rowLabels: string[]; colLabels: string[]; data: number[][] }
  | { kind: "regression"; points: Pt2[]; predictX: number };

export interface Algebra1Problem {
  type: Algebra1TEKS;
  subtype: Algebra1Subtype;
  /** Full question text, LaTeX-flavoured (rendered via latexToText). */
  prompt: string;
  /** Printable answer, LaTeX-flavoured. */
  answer: string;
  steps: ProblemStep[];
  /** Diagram parameters; absent when the problem needs no diagram. */
  graph?: Algebra1GraphParams;
  /** Structural facts for independent answer verification. */
  meta: Algebra1Meta;
}

// ── Diagram parameter types ─────────────────────────────────────────────────
// Every renderer (web + PDF) recomputes plotted points from these
// coefficients. Nothing is hardcoded: sample y = f(x) from the params.

export interface LineFuncDef {
  fn: "line";
  m: number;
  b: number;
  label?: string;
  color?: string;
  /** Dashed boundary line (strict inequalities). */
  dashed?: boolean;
  /** Shade the half-plane above/below the line (inequalities). */
  shade?: "above" | "below";
  shadeColor?: string;
}

export interface ParabolaFuncDef {
  fn: "parabola";
  a: number; h: number; k: number;
  label?: string;
  color?: string;
}

export interface ExponentialFuncDef {
  fn: "exponential";
  a: number; b: number;
  label?: string;
  color?: string;
}

export interface FunctionGraphSVGParams {
  kind: "FunctionGraph";
  funcs: Array<LineFuncDef | ParabolaFuncDef | ExponentialFuncDef>;
  /** Points to mark with dots, e.g. intercepts or vertices. */
  marks?: Array<{ x: number; y: number; label?: string }>;
  /** Solution point (systems): drawn larger in red. */
  solution?: { x: number; y: number };
  /** When true, compute x/y intercepts of the first function and mark them. */
  showIntercepts?: boolean;
  xRange?: [number, number];
  yRange?: [number, number];
}

export interface ScatterPlotSVGParams {
  kind: "ScatterPlot";
  points: Pt2[];
  line: { m: number; b: number; label?: string };
  xLabel?: string;
  yLabel?: string;
}

export interface NumberLineSVGParams {
  kind: "NumberLine";
  value: number;
  rel: IneqRel;
  min?: number;
  max?: number;
}

export interface TwoWayTableSVGParams {
  kind: "TwoWayTable";
  rowLabels: string[];
  colLabels: string[];
  data: number[][];
  title?: string;
}

export type Algebra1GraphParams =
  | FunctionGraphSVGParams
  | ScatterPlotSVGParams
  | NumberLineSVGParams
  | TwoWayTableSVGParams;

/** Union addition for the MathProblem union (documented; applied by wiring). */
export type Algebra1ProblemUnionAddition = Algebra1Problem;

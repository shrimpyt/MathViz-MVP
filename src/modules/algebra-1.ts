// algebra-1.ts
// Algebra 1 module — delegates to the domain factories in
// src/lib/factories/Algebra1*.ts and exposes registry-style generator
// functions (mode, seed, options) for the CurriculumRegistry snippet.
//
// Lesson granularity follows the authoritative scope doc
// (~/workspace/euclid-worksheet/CURRICULUM_SCOPE.md, "Algebra I — Topics 1–9"):
// one route per lesson row. TEKS codes are the doc's codes with the "A."
// subject prefix per repo convention.
//
// NOTE: this file is new. The CurriculumRegistry.ts entries that call these
// functions are documented in tests/algebra-1/REGISTRY_SNIPPET.md (the
// registry itself must be edited by the integrator — see WIRING.md).

import { mulberry32 } from "@/lib/math-utils";
import type { RNG } from "@/lib/math-utils";
import type { DifficultyLevel, GenerateOptions } from "@/modules/CurriculumRegistry";
import type { OutputMode } from "@/lib/types";
import type {
  Algebra1Problem,
  Algebra1Subtype,
} from "@/lib/factories/Algebra1Types";
import { latexToText } from "@/lib/answerKey";
import { generateEquationProblems, EQUATION_BY_DIFFICULTY } from "@/lib/factories/Algebra1Equations";
import { generateLinearProblems, LINEAR_BY_DIFFICULTY } from "@/lib/factories/Algebra1Linear";
import { generateSystemProblems, SYSTEM_BY_DIFFICULTY } from "@/lib/factories/Algebra1Systems";
import { generateExponentProblems, EXPONENT_BY_DIFFICULTY } from "@/lib/factories/Algebra1Exponents";
import { generatePolynomialProblems, POLY_BY_DIFFICULTY } from "@/lib/factories/Algebra1Polynomials";
import { generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY } from "@/lib/factories/Algebra1Quadratics";
import { generateExponentialProblems, EXPONENTIAL_BY_DIFFICULTY } from "@/lib/factories/Algebra1Exponential";
import { generateSequenceProblems, SEQUENCE_BY_DIFFICULTY } from "@/lib/factories/Algebra1Sequences";
import { generateStatisticsProblems, STATS_BY_DIFFICULTY } from "@/lib/factories/Algebra1Statistics";

// ── Lesson → factory routing ─────────────────────────────────────────────────
// Each lesson owns a slice of the subtype space. Difficulty tiers are
// cumulative inside each factory's *_BY_DIFFICULTY map; filterAllowed
// intersects the lesson slice with the tier (falling back to the slice).

interface LessonRoute {
  subtypes: readonly Algebra1Subtype[];
  generate: (rng: RNG, n: number, difficulty: DifficultyLevel, allowed: readonly Algebra1Subtype[]) => Algebra1Problem[];
  byDifficulty: Record<DifficultyLevel, readonly Algebra1Subtype[]>;
}

function R(
  subtypes: readonly Algebra1Subtype[],
  generate: LessonRoute["generate"],
  byDifficulty: LessonRoute["byDifficulty"]
): LessonRoute {
  return { subtypes, generate, byDifficulty };
}

const ROUTES = {
  // ── T1: Solving Equations & Inequalities ──────────────────────────────────
  t1MultiStep: R(["MultiStepEquation", "EquationWordProblem"], generateEquationProblems, EQUATION_BY_DIFFICULTY),
  t1BothSides: R(["VariablesBothSides"], generateEquationProblems, EQUATION_BY_DIFFICULTY),
  t1Literal: R(["LiteralEquation"], generateEquationProblems, EQUATION_BY_DIFFICULTY),
  t1Proportions: R(["Proportion"], generateEquationProblems, EQUATION_BY_DIFFICULTY),
  t1Inequalities: R(["Inequality"], generateEquationProblems, EQUATION_BY_DIFFICULTY),
  t1Compound: R(["CompoundInequality"], generateEquationProblems, EQUATION_BY_DIFFICULTY),
  t1AbsoluteValue: R(["AbsoluteValue"], generateEquationProblems, EQUATION_BY_DIFFICULTY), // mission extension
  // ── T2/T3: Functions & Linear Functions (taught mixed) ────────────────────
  t23Slope: R(["SlopeFromPoints"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23SlopeIntercept: R(["WriteSlopeIntercept", "LinearWordProblem"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23DirectVariation: R(["DirectVariation"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23PointSlope: R(["WritePointSlope"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23Standard: R(["StandardToSlopeIntercept"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23Graphing: R(["GraphLine"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23WriteRule: R(["WriteFunctionRule"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23Relations: R(["RelationsFunctions"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23Notation: R(["FunctionNotation"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23ParallelPerp: R(["ParallelPerpendicular"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23Transform: R(["TransformLinear"], generateLinearProblems, LINEAR_BY_DIFFICULTY),
  t23Scatter: R(["LineOfBestFit"], generateStatisticsProblems, STATS_BY_DIFFICULTY),
  t23TwoWay: R(["TwoWayTable"], generateStatisticsProblems, STATS_BY_DIFFICULTY), // mission extension
  // ── T4: Systems ───────────────────────────────────────────────────────────
  t4Graphing: R(["SystemGraphing", "SystemSpecialCase"], generateSystemProblems, SYSTEM_BY_DIFFICULTY),
  t4Substitution: R(["SystemSubstitution"], generateSystemProblems, SYSTEM_BY_DIFFICULTY),
  t4Elimination: R(["SystemElimination"], generateSystemProblems, SYSTEM_BY_DIFFICULTY),
  t4Applications: R(["SystemWordProblem"], generateSystemProblems, SYSTEM_BY_DIFFICULTY),
  t4LinIneq: R(["LinearInequality"], generateSystemProblems, SYSTEM_BY_DIFFICULTY),
  t4SysIneq: R(["SystemOfInequalities"], generateSystemProblems, SYSTEM_BY_DIFFICULTY),
  // ── T5: Exponents & Radicals ──────────────────────────────────────────────
  t5ZeroNeg: R(["ZeroNegativeExponents"], generateExponentProblems, EXPONENT_BY_DIFFICULTY),
  t5Multiply: R(["MultiplyPowers"], generateExponentProblems, EXPONENT_BY_DIFFICULTY),
  t5PowerOfPower: R(["PowerOfPower"], generateExponentProblems, EXPONENT_BY_DIFFICULTY),
  t5Division: R(["DivisionProperties"], generateExponentProblems, EXPONENT_BY_DIFFICULTY),
  t5Rational: R(["RationalExponents"], generateExponentProblems, EXPONENT_BY_DIFFICULTY),
  t5Radicals: R(["SimplifyRadicals"], generateExponentProblems, EXPONENT_BY_DIFFICULTY),
  // ── T6: Sequences ─────────────────────────────────────────────────────────
  t6Explicit: R(["ArithmeticSequence", "GeometricSequence", "SequenceWordProblem"], generateSequenceProblems, SEQUENCE_BY_DIFFICULTY),
  t6RecursiveArith: R(["RecursiveArithmetic"], generateSequenceProblems, SEQUENCE_BY_DIFFICULTY),
  t6RecursiveGeo: R(["RecursiveGeometric"], generateSequenceProblems, SEQUENCE_BY_DIFFICULTY),
  // ── T7: Polynomials & Factoring ───────────────────────────────────────────
  t7AddSub: R(["PolyAddSub"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7MultiplyFactor: R(["FactorGCF"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7Binomials: R(["FOIL", "PolyMultiply"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7FactorBasic: R(["FactorTrinomialBasic"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7FactorAC: R(["FactorTrinomialAC"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7Special: R(["FactorDifferenceSquares"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7Grouping: R(["FactorByGrouping"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  t7Rational: R(["SimplifyRationalExpression"], generatePolynomialProblems, POLY_BY_DIFFICULTY),
  // ── T8: Quadratics ────────────────────────────────────────────────────────
  t8Graphs: R(["QuadraticAttributes"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8Functions: R(["GraphQuadratic"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8Transform: R(["QuadraticTransformations"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8Vertex: R(["VertexForm"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8Solving: R(["QuadraticFactoring", "CompleteSquare", "QuadraticFormula"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8FactorSolve: R(["QuadraticFactoring"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8Writing: R(["WriteQuadratic"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8CTS: R(["CompleteSquare"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  t8Formula: R(["QuadraticFormula", "QuadraticDiscriminant"], generateQuadraticProblems, QUADRATIC_BY_DIFFICULTY),
  // ── T9: Exponentials ──────────────────────────────────────────────────────
  t9Functions: R(["GraphExponential", "ExponentialGrowth"], generateExponentialProblems, EXPONENTIAL_BY_DIFFICULTY),
  t9GrowthDecay: R(["ExponentialGrowth", "ExponentialDecay"], generateExponentialProblems, EXPONENTIAL_BY_DIFFICULTY),
  t9Modeling: R(["ExponentialWordProblem", "ExponentialModeling"], generateExponentialProblems, EXPONENTIAL_BY_DIFFICULTY),
};

export type Algebra1LessonKey = keyof typeof ROUTES;
export const ALGEBRA1_LESSON_KEYS = Object.keys(ROUTES) as Algebra1LessonKey[];

function difficultyOf(options?: GenerateOptions): DifficultyLevel {
  return options?.difficulty ?? 2;
}

/** Intersect a lesson's subtypes with the difficulty tier (cumulative). */
function filterAllowed(
  lesson: readonly Algebra1Subtype[],
  byDifficulty: readonly Algebra1Subtype[]
): readonly Algebra1Subtype[] {
  const inter = lesson.filter((s) => byDifficulty.includes(s));
  return inter.length > 0 ? inter : lesson;
}

function lessonProblems(
  key: Algebra1LessonKey,
  mode: OutputMode,
  seed: number,
  options?: GenerateOptions
): Algebra1Problem[] {
  const route = ROUTES[key];
  const rng = mulberry32(seed);
  // Classical Notes behaves like Review: full steps shown.
  const count = options?.count ?? (mode === "Review" || mode === "Classical" ? 9 : 3);
  const allowed = filterAllowed(route.subtypes, route.byDifficulty[difficultyOf(options)]);
  return route.generate(rng, count, difficultyOf(options), allowed);
}

/** Generate problems for a single lesson key (used by tests and the registry). */
export function generateAlgebra1Lesson(
  key: Algebra1LessonKey,
  mode: OutputMode,
  seed: number,
  options?: GenerateOptions
): Algebra1Problem[] {
  return lessonProblems(key, mode, seed, options);
}

/** Mixed review across the whole Algebra 1 area. */
export function generateAlgebra1Mixed(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 3,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const generators = [
    generateEquationProblems,
    generateLinearProblems,
    generateSystemProblems,
    generateExponentProblems,
    generatePolynomialProblems,
    generateQuadraticProblems,
    generateExponentialProblems,
    generateSequenceProblems,
    generateStatisticsProblems,
  ];
  const out: Algebra1Problem[] = [];
  let gi = Math.floor(rng() * generators.length);
  while (out.length < n) {
    const batch = generators[gi % generators.length](rng, 1, difficulty, allowed);
    out.push(...batch);
    gi++;
  }
  return out.slice(0, n);
}

// ── Answer key ────────────────────────────────────────────────────────────────

/**
 * One-line printable answer for an Algebra 1 problem.
 * Wire into formatAnswer() in src/lib/answerKey.ts for the new TEKS types.
 */
export function formatAlgebra1Answer(p: Algebra1Problem): string {
  return latexToText(p.answer);
}

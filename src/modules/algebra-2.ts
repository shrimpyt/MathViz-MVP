// algebra-2.ts
// Algebra II module — lesson-level generators aligned to CURRICULUM_SCOPE.md
// ("Algebra II — Topics 2–12"). Each exported function wires one lesson row
// to the appropriate factory with a subtype/family filter; lessons with no
// generator yet use placeholderLesson (underConstruction in the registry).
//
// Counts: Review and Classical default to 3× (9 problems), otherwise 3.
// Classical is treated exactly like Review: factories always emit full steps.

import { mulberry32 } from "@/lib/math-utils";
import type { RNG } from "@/lib/math-utils";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Algebra2Problem, Algebra2ProofProblem } from "@/lib/factories/Algebra2Types";
import { generateFunctionProblems } from "@/lib/factories/Algebra2Functions";
import { generateQuadraticProblems } from "@/lib/factories/Algebra2Quadratics";
import { generateDivisionProblems } from "@/lib/factories/Algebra2PolynomialDivision";
import { generateFactoringProblems } from "@/lib/factories/Algebra2Factoring";
import { generateRationalProblems } from "@/lib/factories/Algebra2Rational";
import { generateExpLogProblems } from "@/lib/factories/Algebra2ExpLog";
import { generateRadicalProblems } from "@/lib/factories/Algebra2Radicals";
import { generateSequenceProblems } from "@/lib/factories/Algebra2Sequences";
import { generateConicProblems } from "@/lib/factories/Algebra2Conics";
import { generateSystemProblems } from "@/lib/factories/Algebra2Systems";
import { generateMatrixProblems } from "@/lib/factories/Algebra2Matrices";
import { generateDataProblems } from "@/lib/factories/Algebra2Data";
import { generateProofProblems } from "@/lib/factories/Algebra2Proofs";
import { generatePolynomialProblems } from "@/lib/factories/Algebra2Polynomials";
import { generateRadicalExpressionProblems } from "@/lib/factories/Algebra2RadicalExpressions";
import { generateCubicProblems } from "@/lib/factories/Algebra2Cubic";

/** Structural twin of CurriculumRegistry's GenerateOptions (avoids a cycle). */
export interface Algebra2Options {
  count?: number;
  difficulty?: 1 | 2 | 3;
}

type Gen = (
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3,
  only?: readonly string[]
) => Algebra2Problem[];

function lesson(gen: Gen, only?: readonly string[]) {
  return (mode: OutputMode, seed: number, options?: Algebra2Options): Algebra2Problem[] => {
    const rng = mulberry32(seed);
    // Classical Notes behaves like Review: full steps, 3× count.
    const count = options?.count ?? (mode === "Review" || mode === "Classical" ? 9 : 3);
    return gen(rng, count, options?.difficulty ?? 2, only);
  };
}

/** Placeholder for lessons with no generator yet (registry marks underConstruction). */
export function placeholderLesson(
  _mode: OutputMode,
  _seed: number,
  _options?: Algebra2Options
): Algebra2Problem[] {
  return [
    {
      type: "A2.5",
      subtype: "Placeholder",
      given: {},
      find: "TBD",
      answer: "",
      steps: [{ instruction: "This lesson is currently under construction." }],
    },
  ];
}

// ── T2 Relations, functions & absolute value (TEKS A2.2) ─────────────────────

export const a2_2_1_relationsFunctions = lesson(generateFunctionProblems, [
  "RelationIsFunction",
  "FunctionEvaluate",
  "DomainRangeGraph",
  "VerticalLineTest",
]);
export const a2_2_2_attributesFunctions = lesson(generateFunctionProblems, [
  "GraphIntercepts",
  "GraphIncDec",
  "GraphExtremum",
]);
export const a2_2_3_absTransformations = lesson(generateFunctionProblems, [
  "AbsTransformations",
  "AbsAttributes",
  "AbsWriteEquation",
  "AbsPiecewise",
]);
export const a2_2_4_absIneqGraph = lesson(generateFunctionProblems, [
  "AbsIneqGraphDesc",
  "AbsIneqFromGraph",
  "AbsIneqPointCheck",
]);
export const a2_2_5_absEquations = lesson(generateFunctionProblems, [
  "AbsEquation",
  "AbsEquationLinear",
  "AbsEquationCheck",
  "AbsEquationSpecial",
]);
export const a2_2_6_absInequalities = lesson(generateFunctionProblems, [
  "AbsIneqAnd",
  "AbsIneqOr",
  "AbsIneqLinear",
  "AbsIneqSpecial",
]);

// ── T3 Systems (TEKS A2.3) ────────────────────────────────────────────────────

export const a2_3_1_systemsGraphs = lesson(generateSystemProblems, [
  "SystemGraphSolve",
  "SystemTableSolve",
  "SystemClassify",
]);
export const a2_3_2_systemsAlgebraic = lesson(generateSystemProblems, [
  "SystemSubstitution",
  "SystemElimination",
]);
export const a2_3_3_systemsInequalities = lesson(generateSystemProblems, [
  "SystemIneqTestPoint",
  "SystemIneqRead",
  "SystemIneqCorner",
]);
export const a2_3_4_threeVariables = lesson(generateSystemProblems, ["ThreeVarSystem"]);
export const a2_3_5_matricesSystems = lesson(generateMatrixProblems, ["MatrixSystemIntro"]);

// ── T4 Matrices (TEKS A2.4) ───────────────────────────────────────────────────

export const a2_4_1_addSubtract = lesson(generateMatrixProblems, ["MatrixAddSub"]);
export const a2_4_2_multiply = lesson(generateMatrixProblems, ["MatrixMultiply"]);
export const a2_4_3_detInverse = lesson(generateMatrixProblems, ["MatrixDetInverse"]);
export const a2_4_4_systemsMatrices = lesson(generateMatrixProblems, ["MatrixSolveSystem"]);

// ── T5 Quadratics & nonlinear systems (TEKS A2.5) ─────────────────────────────

export const a2_5_1_quadAttributes = lesson(generateQuadraticProblems, [
  "Transformations",
  "WriteVertexForm",
]);
export const a2_5_2_quadStandard = lesson(generateQuadraticProblems, [
  "StdFormAttributes",
  "StdFormVertex",
  "StdFormIntercepts",
]);
export const a2_5_3_quadModeling = lesson(generateQuadraticProblems, [
  "ProjectileMax",
  "ProjectileLand",
  "AreaMax",
  "ModelMax",
]);
export const a2_5_4_focusDirectrix = lesson(generateConicProblems, [
  "ParabolaFocusDirectrix",
  "ParabolaVertex",
]);
export const a2_5_5_quadFactoring = lesson(generateQuadraticProblems, [
  "FactorTrinomial",
  "FactorGCF",
  "FactorDiffSquares",
  "FactorSolve",
]);
export const a2_5_6_quadEquations = lesson(generateQuadraticProblems, [
  "QuadraticFormula",
  "SolveByRoot",
]);
export const a2_5_7_completingSquare = lesson(generateQuadraticProblems, ["CompleteSquare"]);
export const a2_5_8_quadFormula = lesson(generateQuadraticProblems, [
  "QuadraticFormula",
  "Discriminant",
]);
export const a2_5_9_complexNumbers = lesson(generateQuadraticProblems, ["ComplexRoots"]);
export const a2_5_10_quadInequalities = lesson(generateQuadraticProblems, [
  "QuadInequality",
  "QuadIneqNoCross",
]);
export const a2_5_11_linQuadSystems = lesson(generateSystemProblems, ["LineParabola"]);

// ── T6 Square root functions, inverses, function operations (TEKS A2.6) ──────

export const a2_6_1_functionOperations = lesson(generateRadicalProblems, [
  "FuncEvalOps",
  "FuncProduct",
  "FuncCompose",
  "FuncComposeEval",
]);
export const a2_6_2_inverseFunctions = lesson(generateRadicalProblems, [
  "InversePoint",
  "InverseLinear",
  "InverseVerify",
  "InverseQuadratic",
]);
export const a2_6_3_sqrtTransformations = lesson(generateRadicalProblems, [
  "SqrtAttributes",
  "SqrtTransformWrite",
]);
export const a2_6_4_sqrtAsInverses = lesson(generateRadicalProblems, [
  "SqrtInverseOfSqrt",
  "SqrtRestrictInverse",
  "SqrtSwapDomainRange",
]);
export const a2_6_5_sqrtEquationsIntro = lesson(generateRadicalProblems, [
  "RadicalBasic",
  "RadicalIsolate",
  "RadicalLinear",
]);
export const a2_6_6_sqrtEquationsSolving = lesson(generateRadicalProblems, [
  "RadicalExtraneous",
  "RadicalTwoRadicals",
  "RadicalNoSolution",
]);

// ── T7 Exponentials & logarithms (TEKS A2.7) ──────────────────────────────────

export const a2_7_1_expAttributes = lesson(generateExpLogProblems, [
  "ExpGrowthDecay",
  "ExpEvaluate",
  "ExpAttributes",
  "ExpTransformWrite",
]);
export const a2_7_2_eToX = lesson(generateExpLogProblems, [
  "EEvaluate",
  "ECompound",
  "EAttributes",
]);
export const a2_7_3_recursiveModels = lesson(generateExpLogProblems, [
  "Recursive",
  "RecursiveModelWrite",
]);
export const a2_7_4_logAttributes = lesson(generateExpLogProblems, [
  "LogDomain",
  "LogAttributes",
  "LogTransformWrite",
  "LogInversePair",
]);
export const a2_7_5_naturalLog = lesson(generateExpLogProblems, [
  "LnEvaluate",
  "LnApprox",
  "LnSolveTime",
]);
export const a2_7_6_logProperties = lesson(generateExpLogProblems, [
  "LogEvaluate",
  "ExpandLog",
  "CondenseLog",
]);
export const a2_7_7_expLogEquations = lesson(generateExpLogProblems, [
  "SolveExponential",
  "SolveLogEquation",
]);

// ── T8 Polynomials (TEKS A2.8) ────────────────────────────────────────────────

export const a2_8_1_polyAttributes = lesson(generatePolynomialProblems, [
  "PolyAttributes",
  "PolyAttributesEndBehavior",
  "PolyAttributesFactored",
]);
export const a2_8_2_linearFactorsZeros = lesson(generateFactoringProblems, [
  "RationalRootTheorem",
  "FactorByGrouping",
  "SumDifferenceCubes",
]);
export const a2_8_3_polyAddSubMul = lesson(generatePolynomialProblems, [
  "PolyAddSub",
  "PolyMultiply",
]);
export const a2_8_4_polySolve = lesson(generateFactoringProblems, ["RationalRootTheorem"]);
export const a2_8_5_polyDivide = lesson(generateDivisionProblems, [
  "LongDivision",
  "SyntheticDivision",
]);
export const a2_8_6_rootTheorems = lesson(generateFactoringProblems, ["RationalRootTheorem"]);
export const a2_8_7_fta = lesson(generatePolynomialProblems, [
  "FTACountZeros",
  "FTAWritePoly",
]);

// ── T9 Radical expressions & rational exponents (TEKS A2.9) ───────────────────

export const a2_9_1_rootsRadicals = lesson(generateRadicalExpressionProblems, ["SimplifyRadical"]);
export const a2_9_2_radicalMultDiv = lesson(generateRadicalExpressionProblems, [
  "RadicalMultiply",
  "RadicalDivide",
]);
export const a2_9_3_binomialRadicals = lesson(generateRadicalExpressionProblems, [
  "BinomialRadicals",
  "RationalizeBinomial",
]);
export const a2_9_4_rationalExponents = lesson(generateRadicalExpressionProblems, [
  "RationalExponents",
]);

// ── T10 Cubic & cube root functions (TEKS A2.10) ──────────────────────────────

export const a2_10_1_cubicTransformations = lesson(generateCubicProblems, [
  "CubicTransformations",
  "CubicWriteForm",
]);
export const a2_10_2_cuberootTransformations = lesson(generateCubicProblems, [
  "CubeRootTransformations",
  "CubeRootWriteForm",
]);
export const a2_10_3_cuberootEquations = lesson(generateCubicProblems, ["CubeRootEquations"]);

// ── T11 Rational functions & equations (TEKS A2.11) ───────────────────────────

export const a2_11_1_simplify = lesson(generateRationalProblems, ["SimplifyRational"]);
export const a2_11_2_multDiv = lesson(generateRationalProblems, ["MultiplyDivideRational"]);
export const a2_11_3_asymptotesHoles = lesson(generateRationalProblems, ["Asymptotes", "Holes"]);
export const a2_11_4_solveRational = lesson(generateRationalProblems, ["SolveRationalEquation"]);
export const a2_11_5_addSubtract = lesson(generateRationalProblems, ["AddSubtractRational"]);

// ── T12 Data & regression (TEKS A2.12) ────────────────────────────────────────

export const a2_12_1_analyzingData = lesson(generateDataProblems, ["DataAnalyze"]);
export const a2_12_2_regression = lesson(generateDataProblems, ["DataRegression"]);
export const a2_12_3_usingModels = lesson(generateDataProblems, ["DataPredict"]);

// ── Algebra 2 Proofs (A2.P) ───────────────────────────────────────────────────

function proofLesson(group: "trig" | "log" | "poly") {
  return (mode: OutputMode, seed: number, options?: Algebra2Options): Algebra2ProofProblem[] => {
    const rng = mulberry32(seed);
    const count = options?.count ?? (mode === "Review" || mode === "Classical" ? 9 : 3);
    return generateProofProblems(rng, count, options?.difficulty ?? 2, [group]);
  };
}

export const a2_p_trigIdentities = proofLesson("trig");
export const a2_p_logExpProofs = proofLesson("log");
export const a2_p_polyIdentities = proofLesson("poly");

// ── Supplementary (not in the scope doc) ──────────────────────────────────────

export const a2x_sequences = lesson(generateSequenceProblems);
export const a2x_circleEquations = lesson(generateConicProblems, [
  "CircleEquation",
  "CircleFromGeneral",
]);
export const a2x_circleLineSystems = lesson(generateSystemProblems, ["CircleLine"]);

// ── Lesson table for tests: every wired lesson × its subtypes ─────────────────

export interface WiredLesson {
  id: string;
  generate: (mode: OutputMode, seed: number, options?: Algebra2Options) => Algebra2Problem[] | Algebra2ProofProblem[];
  subtypes: readonly string[];
  proofs?: boolean;
}

export const WIRED_LESSONS: WiredLesson[] = [
  { id: "a2-2-1", generate: a2_2_1_relationsFunctions, subtypes: ["RelationIsFunction", "FunctionEvaluate", "DomainRangeGraph", "VerticalLineTest"] },
  { id: "a2-2-2", generate: a2_2_2_attributesFunctions, subtypes: ["GraphIntercepts", "GraphIncDec", "GraphExtremum"] },
  { id: "a2-2-3", generate: a2_2_3_absTransformations, subtypes: ["AbsTransformations", "AbsAttributes", "AbsWriteEquation", "AbsPiecewise"] },
  { id: "a2-2-4", generate: a2_2_4_absIneqGraph, subtypes: ["AbsIneqGraphDesc", "AbsIneqFromGraph", "AbsIneqPointCheck"] },
  { id: "a2-2-5", generate: a2_2_5_absEquations, subtypes: ["AbsEquation", "AbsEquationLinear", "AbsEquationCheck", "AbsEquationSpecial"] },
  { id: "a2-2-6", generate: a2_2_6_absInequalities, subtypes: ["AbsIneqAnd", "AbsIneqOr", "AbsIneqLinear", "AbsIneqSpecial"] },
  { id: "a2-3-1", generate: a2_3_1_systemsGraphs, subtypes: ["SystemGraphSolve", "SystemTableSolve", "SystemClassify"] },
  { id: "a2-3-2", generate: a2_3_2_systemsAlgebraic, subtypes: ["SystemSubstitution", "SystemElimination"] },
  { id: "a2-3-3", generate: a2_3_3_systemsInequalities, subtypes: ["SystemIneqTestPoint", "SystemIneqRead", "SystemIneqCorner"] },
  { id: "a2-3-4", generate: a2_3_4_threeVariables, subtypes: ["ThreeVarSystem"] },
  { id: "a2-3-5", generate: a2_3_5_matricesSystems, subtypes: ["MatrixSystemIntro"] },
  { id: "a2-4-1", generate: a2_4_1_addSubtract, subtypes: ["MatrixAddSub"] },
  { id: "a2-4-2", generate: a2_4_2_multiply, subtypes: ["MatrixMultiply"] },
  { id: "a2-4-3", generate: a2_4_3_detInverse, subtypes: ["MatrixDetInverse"] },
  { id: "a2-4-4", generate: a2_4_4_systemsMatrices, subtypes: ["MatrixSolveSystem"] },
  { id: "a2-5-1", generate: a2_5_1_quadAttributes, subtypes: ["Transformations", "WriteVertexForm"] },
  { id: "a2-5-2", generate: a2_5_2_quadStandard, subtypes: ["StdFormAttributes", "StdFormVertex", "StdFormIntercepts"] },
  { id: "a2-5-3", generate: a2_5_3_quadModeling, subtypes: ["ProjectileMax", "ProjectileLand", "AreaMax", "ModelMax"] },
  { id: "a2-5-4", generate: a2_5_4_focusDirectrix, subtypes: ["ParabolaFocusDirectrix", "ParabolaVertex"] },
  { id: "a2-5-5", generate: a2_5_5_quadFactoring, subtypes: ["FactorTrinomial", "FactorGCF", "FactorDiffSquares", "FactorSolve"] },
  { id: "a2-5-6", generate: a2_5_6_quadEquations, subtypes: ["QuadraticFormula", "SolveByRoot"] },
  { id: "a2-5-7", generate: a2_5_7_completingSquare, subtypes: ["CompleteSquare"] },
  { id: "a2-5-8", generate: a2_5_8_quadFormula, subtypes: ["QuadraticFormula", "Discriminant"] },
  { id: "a2-5-9", generate: a2_5_9_complexNumbers, subtypes: ["ComplexRoots"] },
  { id: "a2-5-10", generate: a2_5_10_quadInequalities, subtypes: ["QuadInequality", "QuadIneqNoCross"] },
  { id: "a2-5-11", generate: a2_5_11_linQuadSystems, subtypes: ["LineParabola"] },
  { id: "a2-6-1", generate: a2_6_1_functionOperations, subtypes: ["FuncEvalOps", "FuncProduct", "FuncCompose", "FuncComposeEval"] },
  { id: "a2-6-2", generate: a2_6_2_inverseFunctions, subtypes: ["InversePoint", "InverseLinear", "InverseVerify", "InverseQuadratic"] },
  { id: "a2-6-3", generate: a2_6_3_sqrtTransformations, subtypes: ["SqrtAttributes", "SqrtTransformWrite"] },
  { id: "a2-6-4", generate: a2_6_4_sqrtAsInverses, subtypes: ["SqrtInverseOfSqrt", "SqrtRestrictInverse", "SqrtSwapDomainRange"] },
  { id: "a2-6-5", generate: a2_6_5_sqrtEquationsIntro, subtypes: ["RadicalBasic", "RadicalIsolate", "RadicalLinear"] },
  { id: "a2-6-6", generate: a2_6_6_sqrtEquationsSolving, subtypes: ["RadicalExtraneous", "RadicalTwoRadicals", "RadicalNoSolution"] },
  { id: "a2-7-1", generate: a2_7_1_expAttributes, subtypes: ["ExpGrowthDecay", "ExpEvaluate", "ExpAttributes", "ExpTransformWrite"] },
  { id: "a2-7-2", generate: a2_7_2_eToX, subtypes: ["EEvaluate", "ECompound", "EAttributes"] },
  { id: "a2-7-3", generate: a2_7_3_recursiveModels, subtypes: ["Recursive", "RecursiveModelWrite"] },
  { id: "a2-7-4", generate: a2_7_4_logAttributes, subtypes: ["LogDomain", "LogAttributes", "LogTransformWrite", "LogInversePair"] },
  { id: "a2-7-5", generate: a2_7_5_naturalLog, subtypes: ["LnEvaluate", "LnApprox", "LnSolveTime"] },
  { id: "a2-7-6", generate: a2_7_6_logProperties, subtypes: ["LogEvaluate", "ExpandLog", "CondenseLog"] },
  { id: "a2-7-7", generate: a2_7_7_expLogEquations, subtypes: ["SolveExponential", "SolveLogEquation"] },
  { id: "a2-8-1", generate: a2_8_1_polyAttributes, subtypes: ["PolyAttributes", "PolyAttributesEndBehavior", "PolyAttributesFactored"] },
  { id: "a2-8-2", generate: a2_8_2_linearFactorsZeros, subtypes: ["RationalRootTheorem", "FactorByGrouping", "SumDifferenceCubes"] },
  { id: "a2-8-3", generate: a2_8_3_polyAddSubMul, subtypes: ["PolyAddSub", "PolyMultiply"] },
  { id: "a2-8-4", generate: a2_8_4_polySolve, subtypes: ["RationalRootTheorem"] },
  { id: "a2-8-5", generate: a2_8_5_polyDivide, subtypes: ["LongDivision", "SyntheticDivision"] },
  { id: "a2-8-6", generate: a2_8_6_rootTheorems, subtypes: ["RationalRootTheorem"] },
  { id: "a2-8-7", generate: a2_8_7_fta, subtypes: ["FTACountZeros", "FTAWritePoly"] },
  { id: "a2-9-1", generate: a2_9_1_rootsRadicals, subtypes: ["SimplifyRadical"] },
  { id: "a2-9-2", generate: a2_9_2_radicalMultDiv, subtypes: ["RadicalMultiply", "RadicalDivide"] },
  { id: "a2-9-3", generate: a2_9_3_binomialRadicals, subtypes: ["BinomialRadicals", "RationalizeBinomial"] },
  { id: "a2-9-4", generate: a2_9_4_rationalExponents, subtypes: ["RationalExponents"] },
  { id: "a2-10-1", generate: a2_10_1_cubicTransformations, subtypes: ["CubicTransformations", "CubicWriteForm"] },
  { id: "a2-10-2", generate: a2_10_2_cuberootTransformations, subtypes: ["CubeRootTransformations", "CubeRootWriteForm"] },
  { id: "a2-10-3", generate: a2_10_3_cuberootEquations, subtypes: ["CubeRootEquations"] },
  { id: "a2-11-1", generate: a2_11_1_simplify, subtypes: ["SimplifyRational"] },
  { id: "a2-11-2", generate: a2_11_2_multDiv, subtypes: ["MultiplyDivideRational"] },
  { id: "a2-11-5", generate: a2_11_5_addSubtract, subtypes: ["AddSubtractRational"] },
  { id: "a2-11-3", generate: a2_11_3_asymptotesHoles, subtypes: ["Asymptotes", "Holes"] },
  { id: "a2-11-4", generate: a2_11_4_solveRational, subtypes: ["SolveRationalEquation"] },
  { id: "a2-12-1", generate: a2_12_1_analyzingData, subtypes: ["DataAnalyze"] },
  { id: "a2-12-2", generate: a2_12_2_regression, subtypes: ["DataRegression"] },
  { id: "a2-12-3", generate: a2_12_3_usingModels, subtypes: ["DataPredict"] },
  { id: "a2-p-trig", generate: a2_p_trigIdentities, subtypes: ["trig"], proofs: true },
  { id: "a2-p-log", generate: a2_p_logExpProofs, subtypes: ["log"], proofs: true },
  { id: "a2-p-poly", generate: a2_p_polyIdentities, subtypes: ["poly"], proofs: true },
  { id: "a2x-sequences", generate: a2x_sequences, subtypes: [] },
  { id: "a2x-circles", generate: a2x_circleEquations, subtypes: ["CircleEquation", "CircleFromGeneral"] },
  { id: "a2x-circle-systems", generate: a2x_circleLineSystems, subtypes: ["CircleLine"] },
];

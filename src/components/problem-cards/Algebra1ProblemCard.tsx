"use client";
// Algebra1ProblemCard.tsx
// Renders a single Algebra 1 problem (any subtype).
// NOTE: this card is new and not yet routed — see tests/algebra-1/WIRING.md
// for the EuclidEngine / index.ts changes that mount it.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Algebra1Problem } from "@/lib/factories/Algebra1Types";
import { AlgebraGraphSVG } from "@/components/diagrams/AlgebraGraphs";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface Algebra1ProblemCardProps {
  problem: Algebra1Problem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

const SUBTYPE_LABELS: Record<Algebra1Problem["subtype"], string> = {
  MultiStepEquation: "Multi-Step Equations",
  VariablesBothSides: "Variables on Both Sides",
  LiteralEquation: "Literal Equations",
  Proportion: "Proportions",
  EquationWordProblem: "Equation Word Problems",
  Inequality: "Linear Inequalities",
  CompoundInequality: "Compound Inequalities",
  AbsoluteValue: "Absolute Value Equations",
  SlopeFromPoints: "Rate of Change & Slope",
  WriteSlopeIntercept: "Slope-Intercept Form",
  DirectVariation: "Direct Variation",
  WritePointSlope: "Point-Slope Form",
  StandardToSlopeIntercept: "Standard Form",
  GraphLine: "Graphing a Function Rule",
  WriteFunctionRule: "Writing a Function Rule",
  RelationsFunctions: "Relations & Functions",
  FunctionNotation: "Function Notation",
  ParallelPerpendicular: "Parallel & Perpendicular Lines",
  TransformLinear: "Transformations of Linear Functions",
  LineOfBestFit: "Scatter Plots & Trend Lines",
  LinearWordProblem: "Linear Models",
  TwoWayTable: "Two-Way Tables",
  SystemGraphing: "Systems by Graphing",
  SystemSubstitution: "Systems by Substitution",
  SystemElimination: "Systems by Elimination",
  SystemWordProblem: "Systems Applications",
  SystemSpecialCase: "Special Systems",
  LinearInequality: "Linear Inequalities in Two Variables",
  SystemOfInequalities: "Systems of Inequalities",
  ZeroNegativeExponents: "Zero & Negative Exponents",
  MultiplyPowers: "Multiplying Powers",
  PowerOfPower: "Power of a Power",
  DivisionProperties: "Division Properties of Exponents",
  RationalExponents: "Rational Exponents",
  SimplifyRadicals: "Simplifying Radicals",
  ArithmeticSequence: "Arithmetic Sequences",
  GeometricSequence: "Geometric Sequences",
  RecursiveArithmetic: "Arithmetic Recursive Formulas",
  RecursiveGeometric: "Geometric Recursive Formulas",
  SequenceWordProblem: "Sequence Word Problems",
  PolyAddSub: "Adding & Subtracting Polynomials",
  FactorGCF: "GCF & Factoring Polynomials",
  FOIL: "Multiplying Binomials (FOIL)",
  PolyMultiply: "Multiplying Polynomials",
  FactorTrinomialBasic: "Factoring x² + bx + c",
  FactorTrinomialAC: "Factoring ax² + bx + c",
  FactorDifferenceSquares: "Difference of Squares",
  FactorByGrouping: "Factoring by Grouping",
  SimplifyRationalExpression: "Simplifying Rational Expressions",
  QuadraticAttributes: "Graphs & Properties of Quadratics",
  GraphQuadratic: "Quadratic Functions",
  QuadraticTransformations: "Transformations of Quadratics",
  VertexForm: "Vertex Form",
  QuadraticFactoring: "Solving Quadratics by Factoring",
  QuadraticFormula: "The Quadratic Formula",
  QuadraticDiscriminant: "Discriminant",
  CompleteSquare: "Completing the Square",
  WriteQuadratic: "Writing Quadratic Functions",
  GraphExponential: "Exponential Functions",
  ExponentialGrowth: "Exponential Growth",
  ExponentialDecay: "Exponential Decay",
  ExponentialWordProblem: "Exponential Growth & Decay Models",
  ExponentialModeling: "Modeling Data with Exponentials",
};

export function Algebra1ProblemCard({
  problem,
  index,
  mode,
  revealed,
}: Algebra1ProblemCardProps) {
  return (
    <div className="flex bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
        <span className="font-serif text-xl font-bold text-[#0F172A]">
          {index + 1}
        </span>
      </div>
      <div className="p-6 flex-1 flex flex-row items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <TEKSBadge standard={problem.type} />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {SUBTYPE_LABELS[problem.subtype]}
            </span>
          </div>
          <p className="font-serif text-[1.1rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
            {latexToText(problem.prompt)}
          </p>
          <div className="space-y-3">
            {problem.steps.map((s, i) => (
              <StepBlock
                key={i}
                step={s}
                stepIndex={i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </div>
          {mode === "Test" && (
            <p className="font-serif text-sm mt-4 pt-4 border-t border-slate-100">
              <span className="font-semibold">Answer: </span>
              <span className="inline-block border-b-2 border-slate-900 min-w-[120px]">
                &nbsp;
              </span>
            </p>
          )}
        </div>
        {problem.graph && (
          <DiagramBox>
            <AlgebraGraphSVG params={problem.graph} />
          </DiagramBox>
        )}
      </div>
    </div>
  );
}

"use client";
// MiddleSchoolGrade7Card.tsx
// Renders a single Grade 7 ("MS.7") problem.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Grade7Problem } from "@/lib/factories/MiddleSchoolTypes";
import { MiddleSchoolDiagram } from "@/components/diagrams/MiddleSchoolDiagrams";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface MiddleSchoolGrade7CardProps {
  problem: Grade7Problem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

const SUBTYPE_LABEL: Record<Grade7Problem["subtype"], string> = {
  RationalNumbersAndAbsoluteValue: "Rational Numbers & Absolute Value",
  AddSubtractRational: "Adding & Subtracting Rational Numbers",
  MultiplyDivideRational: "Multiplying & Dividing Rational Numbers",
  SolvingSimpleEquations: "Solving Simple Equations",
  TwoStepEquations: "Writing & Solving Two-Step Equations",
  SolvingInequalities: "Solving Simple Inequalities",
  WritingProblemSituations: "Writing Problem Situations",
  MeasuringAngles: "Measuring Angles",
  AnglePairs: "Angle Pairs",
  TriangleAngleSum: "Triangle Angle Sum",
  CircleParts: "Center, Radius & Diameter",
  CircumferenceAndArea: "Circumference & Area of Circles",
  SemicirclesAndQuarterCircles: "Semicircles & Quarter Circles",
  CompositeFigures: "Composite Figures",
  Nets: "Nets",
  PrismsSurfaceAreaVolume: "Surface Area & Volume of Right Prisms",
  PyramidsSurfaceAreaVolume: "Surface Area & Volume of Right Pyramids",
  RatiosRates7: "Ratios & Rates",
  ProportionalRelationships: "Proportional Relationships",
  RepresentingLinearRelationships: "Representing Linear Relationships",
  Percents: "Percents",
  Sampling: "Sampling",
  ComparingPopulations: "Comparing Two Populations",
  ProbabilityConcepts: "Probability Concepts",
  CompoundEvents: "Compound Events",
  EconomicThinking: "Economic Thinking",
  PercentsBeyond100: "Percents Beyond 100% & Below 1%",
  PercentError: "Percent Error",
  ExpandingAndFactoring: "Expanding & Factoring Expressions",
  DistributiveEquations: "Distributive Property Equations",
  MultiStepInequalities: "Multi-Step Inequalities",
};

export function MiddleSchoolGrade7Card({
  problem,
  index,
  mode,
  revealed,
}: MiddleSchoolGrade7CardProps) {
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
            <TEKSBadge standard="7th Grade" />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {SUBTYPE_LABEL[problem.subtype]}
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
        {problem.svgParams && (
          <DiagramBox>
            <MiddleSchoolDiagram params={problem.svgParams} />
          </DiagramBox>
        )}
      </div>
    </div>
  );
}

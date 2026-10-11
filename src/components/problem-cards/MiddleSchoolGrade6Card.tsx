"use client";
// MiddleSchoolGrade6Card.tsx
// Renders a single Grade 6 ("MS.6") problem.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Grade6Problem } from "@/lib/factories/MiddleSchoolTypes";
import { MiddleSchoolDiagram } from "@/components/diagrams/MiddleSchoolDiagrams";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface MiddleSchoolGrade6CardProps {
  problem: Grade6Problem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

const SUBTYPE_LABEL: Record<Grade6Problem["subtype"], string> = {
  MultiplyingDividingFractions: "Multiplying & Dividing Fractions",
  DecimalFluency: "Fluency with Decimals",
  FDPConversions: "Fraction, Decimal & Percent Conversions",
  IntegerOperations: "Integer Operations",
  VariablesAndExpressions: "Variables & Expressions",
  EquivalentExpressions: "Equivalent Expressions",
  EquationsAndInequalities: "Equations & Inequalities",
  TwoVariableRelationships: "Two-Variable Relationships",
  RatiosAndRates: "Ratios & Rates",
  RatioReasoning: "Ratio Reasoning",
  AreaOfPolygons: "Area of Polygons",
  VolumeAndSurfaceArea: "Volume & Surface Area",
  TriangleProperties: "Triangles & Triangle Properties",
  DataDisplays: "Data Displays",
  MeasuresOfCenterAndVariation: "Measures of Center & Variation",
  BankingAndCredit: "Banking & Credit",
  CollegeAndSalaries: "Paying for College & Annual Salaries",
};

export function MiddleSchoolGrade6Card({
  problem,
  index,
  mode,
  revealed,
}: MiddleSchoolGrade6CardProps) {
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
            <TEKSBadge standard="6th Grade" />
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

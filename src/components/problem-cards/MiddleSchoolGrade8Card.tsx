"use client";
// MiddleSchoolGrade8Card.tsx
// Renders a single Grade 8 ("MS.8") problem.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Grade8Problem } from "@/lib/factories/MiddleSchoolTypes";
import { MiddleSchoolDiagram } from "@/components/diagrams/MiddleSchoolDiagrams";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface MiddleSchoolGrade8CardProps {
  problem: Grade8Problem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

const SUBTYPE_LABEL: Record<Grade8Problem["subtype"], string> = {
  LinearEquations: "Linear Equations",
  Functions: "Functions",
  SystemsOfEquations: "Systems of Equations",
  PythagoreanTheorem: "Pythagorean Theorem",
  Transformations: "Transformations",
  ScientificNotation: "Scientific Notation",
  Volume3D: "Volume of Cylinders, Cones & Spheres",
  ScatterPlots: "Scatter Plots",
};

export function MiddleSchoolGrade8Card({
  problem,
  index,
  mode,
  revealed,
}: MiddleSchoolGrade8CardProps) {
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
            <TEKSBadge standard="8th Grade" />
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

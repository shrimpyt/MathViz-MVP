"use client";
// GeometryProblemCard.tsx
// Renders a single Geometry lesson/test problem (GeometryProblem, GEO.*).
// Follows the Algebra1ProblemCard pattern: prompt is authoritative, steps go
// through the shared StepBlock atoms (reasons blank correctly in Guided /
// Classical modes), and the figure renders via the GeometryFigureSVG
// dispatcher, except "ShadedSector", which the dispatcher intentionally
// leaves to the established sector renderer (GeometrySVG).

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { GeometryProblem } from "@/lib/factories/GeometryTypes";
import { GEOMETRY_TOPIC_LABELS } from "@/lib/factories/GeometryTypes";
import { GeometryFigureSVG } from "@/components/diagrams/GeometryDiagrams";
import { GeometrySVG } from "@/components/GeometrySVG";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface GeometryProblemCardProps {
  problem: GeometryProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

export function GeometryProblemCard({
  problem,
  index,
  mode,
  revealed,
}: GeometryProblemCardProps) {
  const sp = problem.svgParams;
  return (
    <div className="flex break-inside-avoid mb-8">
      <div className="pr-4 flex flex-col items-start justify-start w-10 shrink-0">
        <span className="font-serif text-lg font-bold text-[#111]">
          {index + 1}
        </span>
      </div>
      <div className="p-6 flex-1 flex flex-row items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <TEKSBadge standard={problem.type} />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {GEOMETRY_TOPIC_LABELS[problem.type]}
            </span>
          </div>
          <p className="font-serif text-[1.1rem] text-[#111] mb-4 leading-relaxed font-medium">
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
        {sp &&
          (sp.kind === "ShadedSector" ? (
            <DiagramBox>
              <GeometrySVG
                params={sp as unknown as Parameters<typeof GeometrySVG>[0]["params"]}
              />
            </DiagramBox>
          ) : (
            <DiagramBox>
              <GeometryFigureSVG params={sp} />
            </DiagramBox>
          ))}
      </div>
    </div>
  );
}

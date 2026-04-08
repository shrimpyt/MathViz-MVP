"use client";
// CongruenceProblemCard.tsx
// Renders a single G.6(B) Triangle Congruence problem.

import React from "react";
import type { CongruenceProblem, OutputMode } from "@/lib/ProblemFactory";
import { GeometrySVG } from "@/components/GeometrySVG";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";

interface CongruenceProblemCardProps {
  problem: CongruenceProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

export function CongruenceProblemCard({
  problem,
  index,
  mode,
  revealed,
}: CongruenceProblemCardProps) {
  const theoremName: Record<CongruenceProblem["subtype"], string> = {
    SSS: "Side-Side-Side",
    SAS: "Side-Angle-Side",
    ASA: "Angle-Side-Angle",
    AAS: "Angle-Angle-Side",
    HL: "Hypotenuse-Leg",
  };

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
            <TEKSBadge standard="G.6(B)" />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {theoremName[problem.subtype]}
            </span>
          </div>

          <div className="font-serif text-[1.1rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
            <span className="font-bold">Given: </span>
            {problem.given.map((g, i) => (
              <span key={i}>
                {g}
                {i < problem.given.length - 1 ? "; " : ""}
              </span>
            ))}
            {". "}
            <span className="italic">{problem.find}</span>.
          </div>

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
              <span className="font-semibold">Theorem: </span>
              <span className="inline-block border-b-2 border-slate-900 min-w-[140px]">
                &nbsp;
              </span>
            </p>
          )}
        </div>

        <DiagramBox>
          <GeometrySVG
            params={
              problem.svgParams as Parameters<typeof GeometrySVG>[0]["params"]
            }
          />
        </DiagramBox>
      </div>
    </div>
  );
}

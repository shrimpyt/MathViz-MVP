"use client";
// ProbabilityProblemCard.tsx
// Renders a single G.13(B) Area-Based Probability problem.

import React from "react";
import type { ProbabilityProblem, OutputMode } from "@/lib/ProblemFactory";
import { GeometrySVG } from "@/components/GeometrySVG";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";

interface ProbabilityProblemCardProps {
  problem: ProbabilityProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

export function ProbabilityProblemCard({
  problem,
  index,
  mode,
  revealed,
}: ProbabilityProblemCardProps) {
  const subtypeLabel: Record<ProbabilityProblem["subtype"], string> = {
    ConcentricCircles: "Concentric Circles",
    ShadedSector: "Shaded Sector",
  };
  const scenario =
    problem.subtype === "ConcentricCircles"
      ? `A dart is thrown randomly at a target. The outer circle has radius R = ${problem.outerR} and the inner circle has radius r = ${problem.innerR!}. Find the probability the dart lands in the inner circle.`
      : `A spinner has a shaded sector of ${problem.sectorAngle}°. Find the probability the spinner lands on the shaded region.`;

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
            <TEKSBadge standard="G.13(B)" />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {subtypeLabel[problem.subtype]}
            </span>
          </div>
          <p className="font-serif text-[1.1rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
            {scenario}
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
              <span className="font-semibold">Probability: </span>
              <span className="inline-block border-b-2 border-slate-900 min-w-[120px]">
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

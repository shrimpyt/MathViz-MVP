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
    <div className="break-inside-avoid mb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-serif font-bold text-base text-slate-800 mr-2">
              {index + 1}.
            </span>
            <TEKSBadge standard="G.13(B)" />
            <span className="text-xs text-slate-500 italic">
              {subtypeLabel[problem.subtype]}
            </span>
          </div>
          <p className="font-serif text-sm text-slate-700 mb-2">{scenario}</p>
          <div className="pl-3 border-l-2 border-emerald-200">
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
            <p className="font-serif text-sm mt-2">
              <span className="font-semibold">Probability: </span>
              <span className="inline-block border-b-2 border-slate-700 min-w-[80px]">
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

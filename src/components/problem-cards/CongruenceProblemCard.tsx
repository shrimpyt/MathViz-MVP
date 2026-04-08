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
    <div className="break-inside-avoid mb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-serif font-bold text-base text-slate-800 mr-2">
              {index + 1}.
            </span>
            <TEKSBadge standard="G.6(B)" />
            <span className="text-xs text-slate-500 italic">
              {theoremName[problem.subtype]}
            </span>
          </div>

          {/* Given list */}
          <div className="font-serif text-sm text-slate-700 mb-2">
            <span className="font-semibold">Given: </span>
            {problem.given.map((g, i) => (
              <span key={i}>
                {g}
                {i < problem.given.length - 1 ? "; " : ""}
              </span>
            ))}
            {". "}
            <span className="italic">{problem.find}</span>.
          </div>

          {/* Proof steps */}
          <div className="pl-3 border-l-2 border-violet-200">
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
              <span className="font-semibold">Theorem: </span>
              <span className="inline-block border-b-2 border-slate-700 min-w-[120px]">
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

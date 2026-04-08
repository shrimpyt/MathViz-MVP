"use client";
// CircleProblemCard.tsx
// Renders a single G.12(A) Circle Theorem problem.

import React from "react";
import type { CircleProblem, OutputMode } from "@/lib/ProblemFactory";
import { GeometrySVG } from "@/components/GeometrySVG";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";

interface CircleProblemCardProps {
  problem: CircleProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

export function CircleProblemCard({
  problem,
  index,
  mode,
  revealed,
}: CircleProblemCardProps) {
  const subtypeLabel: Record<CircleProblem["subtype"], string> = {
    InscribedAngle: "Inscribed Angle Theorem",
    CentralAngle: "Central Angle Theorem",
    Tangent: "Tangent-Chord Angle",
    TwoChords: "Intersecting Chords",
    TwoSecants: "Two Secants from External Point",
  };
  const givenEntries = Object.entries(problem.given);

  return (
    <div className="break-inside-avoid mb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-serif font-bold text-base text-slate-800 mr-2">
              {index + 1}.
            </span>
            <TEKSBadge standard="G.12(A)" />
            <span className="text-xs text-slate-500 italic">
              {subtypeLabel[problem.subtype]}
            </span>
          </div>
          <p className="font-serif text-sm text-slate-700 mb-2">
            <span className="font-semibold">Given: </span>
            {givenEntries.map(([k, v], i) => (
              <span key={k}>
                {k.replace(/([A-Z])/g, " $1").toLowerCase()} = {v}°
                {i < givenEntries.length - 1 ? ", " : ""}
              </span>
            ))}
            . Find the <span className="italic">{problem.find}</span>.
          </p>
          <div className="pl-3 border-l-2 border-blue-200">
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
              <span className="font-semibold">Answer: </span>
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

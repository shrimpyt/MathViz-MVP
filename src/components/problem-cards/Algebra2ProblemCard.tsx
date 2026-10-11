"use client";
// Algebra2ProblemCard.tsx
// Generic card for Algebra 2 computational problems (all A2.* types).

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Algebra2Problem } from "@/lib/factories/Algebra2Types";
import { ALGEBRA2_TOPIC_LABELS } from "@/lib/factories/Algebra2Types";
import { Algebra2WebSVG } from "@/components/diagrams/Algebra2Diagrams";
import { TEKSBadge, StepBlock, DiagramBox } from "./SharedAtoms";
import { givenKeyName, latexToText } from "@/lib/answerKey";

interface Algebra2ProblemCardProps {
  problem: Algebra2Problem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

function prettySubtype(s: string): string {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function Algebra2ProblemCard({
  problem,
  index,
  mode,
  revealed,
}: Algebra2ProblemCardProps) {
  // Classical Notes shows full steps like Review (renderer blanks reasons).
  const displayMode: OutputMode = mode === "Classical" ? "Review" : mode;
  const givenEntries = Object.entries(problem.given);

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
              {ALGEBRA2_TOPIC_LABELS[problem.type]} · {prettySubtype(problem.subtype)}
            </span>
          </div>
          <p className="font-serif text-[1.1rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
            {givenEntries.length > 0 && (
              <>
                <span className="font-bold">Given: </span>
                {givenEntries.map(([k, v], i) => (
                  <span key={k}>
                    {givenKeyName(k)}: {latexToText(v)}
                    {i < givenEntries.length - 1 ? "; " : ""}
                  </span>
                ))}
                {". "}
              </>
            )}
            Find the <span className="italic">{latexToText(problem.find)}</span>.
          </p>
          <div className="space-y-3">
            {problem.steps.map((s, i) => (
              <StepBlock
                key={i}
                step={s}
                stepIndex={i}
                mode={displayMode}
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
            <Algebra2WebSVG params={problem.svgParams} />
          </DiagramBox>
        )}
      </div>
    </div>
  );
}

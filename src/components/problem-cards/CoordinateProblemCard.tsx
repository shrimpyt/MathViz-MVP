"use client";
import React from "react";
import type { CoordinateProblem, OutputMode } from "@/lib/types";
import { StepBlock, TEKSBadge, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";
import { baselineY } from "@/lib/labelPlacement";
import { coordinatePairLabels } from "@/lib/geometryDiagramLayout";

interface Props {
  problem: CoordinateProblem;
  index: number;
  mode: OutputMode;
  revealed?: boolean;
}

export function CoordinateProblemCard({ problem, index, mode, revealed }: Props) {
  return (
    <div className="mb-10 break-inside-avoid">
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-3">
          <span className="font-bold text-slate-800">{index + 1}.</span>
          <p className="text-[13px] leading-relaxed text-slate-700 max-w-[480px]">
            Points <strong>{problem.p1.label}({problem.p1.x}, {problem.p1.y})</strong> and 
            <strong> {problem.p2.label}({problem.p2.x}, {problem.p2.y})</strong> are shown on the coordinate plane. 
            Find the {latexToText(problem.find)}.
          </p>
        </div>
        <TEKSBadge standard="G.2B" />
      </div>

      <div className="flex gap-6 mt-4">
        <div className="flex-1">
          {problem.steps.map((step, i) => (
            <StepBlock
              key={i}
              stepIndex={i}
              step={step}
              mode={mode}
              revealed={revealed ?? false}
            />
          ))}
        </div>
        
        <DiagramBox>
          {/* Same frame as the PDF: 16 grid steps, origin at the center, so
              points out to ±8 stay on the grid. */}
          <svg width="140" height="140" viewBox="10 10 180 180">
            {Array.from({ length: 17 }, (_, i) => 20 + i * 10).map((q) => (
              <g key={q}>
                <line x1={q} y1={20} x2={q} y2={180} stroke="#e2e8f0" strokeWidth="0.5" />
                <line x1={20} y1={q} x2={180} y2={q} stroke="#e2e8f0" strokeWidth="0.5" />
              </g>
            ))}
            <line x1="20" y1="100" x2="180" y2="100" stroke="#94a3b8" strokeWidth="1" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="#94a3b8" strokeWidth="1" />
            <line
              x1={100 + problem.p1.x * 10} y1={100 - problem.p1.y * 10}
              x2={100 + problem.p2.x * 10} y2={100 - problem.p2.y * 10}
              stroke="#111" strokeWidth="1.5" strokeDasharray="4 2"
            />
            <circle cx={100 + problem.p1.x * 10} cy={100 - problem.p1.y * 10} r="3" fill="#111111" />
            <circle cx={100 + problem.p2.x * 10} cy={100 - problem.p2.y * 10} r="3" fill="#111111" />
            {coordinatePairLabels(problem.p1, problem.p2, 1.15).map((l) => (
              <text key={l.text} x={l.center.x} y={baselineY(l.center.y, 9)} textAnchor="middle" fontSize="9" fontWeight="bold">
                {l.text}
              </text>
            ))}
          </svg>
        </DiagramBox>
      </div>
    </div>
  );
}

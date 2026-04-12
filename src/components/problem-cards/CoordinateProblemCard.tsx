"use client";
import React from "react";
import type { CoordinateProblem, OutputMode } from "@/lib/types";
import { StepBlock, TEKSBadge, DiagramBox } from "./SharedAtoms";

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
            Find the {problem.find}.
          </p>
        </div>
        <TEKSBadge code="G.2B" />
      </div>

      <div className="flex gap-6 mt-4">
        <div className="flex-1">
          {problem.steps.map((step, i) => (
            <StepBlock
              key={i}
              step={step}
              mode={mode}
              revealed={revealed}
            />
          ))}
        </div>
        
        <DiagramBox>
          <svg width="140" height="140" viewBox="-10 -10 120 120">
            {/* Simple Grid Placeholder */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#94a3b8" strokeWidth="1" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#94a3b8" strokeWidth="1" />
            
            {/* Scale points to grid (0,0 is 50,50) */}
            <circle cx={50 + problem.p1.x * 10} cy={50 - problem.p1.y * 10} r="2" fill="#1e293b" />
            <text x={53 + problem.p1.x * 10} y={47 - problem.p1.y * 10} fontSize="8" fontWeight="bold">{problem.p1.label}</text>
            
            <circle cx={50 + problem.p2.x * 10} cy={50 - problem.p2.y * 10} r="2" fill="#1e293b" />
            <text x={53 + problem.p2.x * 10} y={47 - problem.p2.y * 10} fontSize="8" fontWeight="bold">{problem.p2.label}</text>
            
            {/* Line segment */}
            <line 
              x1={50 + problem.p1.x * 10} y1={50 - problem.p1.y * 10} 
              x2={50 + problem.p2.x * 10} y2={50 - problem.p2.y * 10} 
              stroke="#d9a720" strokeWidth="1.5" strokeDasharray="2"
            />
          </svg>
        </DiagramBox>
      </div>
    </div>
  );
}

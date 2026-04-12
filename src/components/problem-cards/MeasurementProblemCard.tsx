"use client";
import React from "react";
import type { MeasurementProblem, OutputMode } from "@/lib/types";
import { StepBlock, TEKSBadge, DiagramBox } from "./SharedAtoms";

interface Props {
  problem: MeasurementProblem;
  index: number;
  mode: OutputMode;
  revealed?: boolean;
}

export function MeasurementProblemCard({ problem, index, mode, revealed }: Props) {
  const angle = problem.angle || 0;
  const radius = problem.radius;

  return (
    <div className="mb-10 break-inside-avoid">
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-3">
          <span className="font-bold text-slate-800">{index + 1}.</span>
          <p className="text-[13px] leading-relaxed text-slate-700 max-w-[480px]">
            A circle has a radius of <strong>{radius} {problem.unit === "sq units" ? "units" : problem.unit}</strong>. 
            Find the <strong>{problem.find}</strong>. 
            {angle > 0 && ` The central angle is ${angle}°.`}
          </p>
        </div>
        <TEKSBadge code="G.12B" />
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
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="50" stroke="#1e293b" strokeWidth="1.5" fill="none" />
            <circle cx="70" cy="70" r="2" fill="#1e293b" />
            
            {/* Radius line */}
            <line x1="70" y1="70" x2="120" y2="70" stroke="#1e293b" strokeWidth="1" />
            <text x="90" y="65" fontSize="10" fontWeight="bold">r={radius}</text>

            {/* Arc / Sector if applicable */}
            {angle > 0 && (
              <>
                <path 
                  d={`M 120 70 A 50 50 0 ${angle > 180 ? 1 : 0} 0 ${70 + 50 * Math.cos(angle * Math.PI / 180)} ${70 - 50 * Math.sin(angle * Math.PI / 180)}`}
                  stroke="#d9a720" strokeWidth={problem.subtype === "ArcLength" ? 2.5 : 1}
                  fill={problem.subtype === "SectorArea" ? "rgba(217, 167, 32, 0.2)" : "none"}
                />
                <line 
                  x1="70" y1="70" 
                  x2={70 + 50 * Math.cos(angle * Math.PI / 180)} 
                  y2={70 - 50 * Math.sin(angle * Math.PI / 180)} 
                  stroke="#1e293b" strokeWidth="1" 
                />
                <text x="60" y="85" fontSize="8" fill="#64748b">{angle}°</text>
              </>
            )}
          </svg>
        </DiagramBox>
      </div>
    </div>
  );
}

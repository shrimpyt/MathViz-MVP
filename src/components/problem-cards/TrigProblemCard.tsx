import React from "react";
import type { TrigProblem, TrigSVGParams } from "@/lib/types";
import { StepBlock, DiagramBox } from "./SharedAtoms";

function RightTriangleSVG({ params }: { params: TrigSVGParams }) {
  // We draw a right triangle.
  // By default, base is adjacent, vertical is opposite. Let's normalize it to fit a 100x100 SVG.
  // We'll scale it to fit within defined padding.
  
  const width = 100;
  const height = 100;
  const pad = 15;
  const effW = width - 2 * pad;
  const effH = height - 2 * pad;

  // Let's decide which is base and which is vertical based on referenceAnglePos.
  // If referenceAnglePos is 'base', then reference angle is at one of the base vertices (not the right angle).
  // Standard triangle: Right angle at bottom-right. Base is bottom, vertical is right side.
  // Then the 'base' angle is bottom-left, 'top' angle is top-right.

  // The actual ratios
  const maxSide = Math.max(params.opposite, params.adjacent);
  let baseLength = 0;
  let vertLength = 0;

  if (params.referenceAnglePos === "base") {
    // Reference is bottom-left.
    // So adjacent is the base, opposite is the vertical.
    baseLength = (params.adjacent / maxSide) * effW;
    vertLength = (params.opposite / maxSide) * effH;
  } else {
    // Reference is top-right.
    // So opposite is the base, adjacent is the vertical.
    baseLength = (params.opposite / maxSide) * effW;
    vertLength = (params.adjacent / maxSide) * effH;
  }

  // Calculate coordinates
  // A right triangle: Right angle at (x_right, y_bottom)
  const xLeft = pad + (effW - baseLength) / 2;
  const xRight = xLeft + baseLength;
  const yBottom = height - pad - (effH - vertLength) / 2;
  const yTop = yBottom - vertLength;

  let pts = "";
  let baseLblPos = { x: 0, y: 0 };
  let vertLblPos = { x: 0, y: 0 };
  let hypLblPos = { x: 0, y: 0 };
  let arcD = "";
  let refLblPos = { x: 0, y: 0 };

  if (params.orientation === "right") {
    // Right angle is at bottom-right
    pts = `${xLeft},${yBottom} ${xRight},${yBottom} ${xRight},${yTop}`;
    baseLblPos = { x: (xLeft + xRight) / 2, y: yBottom + 12 };
    vertLblPos = { x: xRight + 12, y: (yTop + yBottom) / 2 };
    hypLblPos = { x: (xLeft + xRight) / 2 - 10, y: (yTop + yBottom) / 2 - 10 };
    
    if (params.referenceAnglePos === "base") {
      // Angle at bottom-left
      arcD = `M ${xLeft + 10} ${yBottom} A 10 10 0 0 0 ${xLeft + 8} ${yBottom - 3}`; // approximation
      // just draw a simple arc
      const angle = Math.atan2(vertLength, baseLength);
      const arcLx = xLeft + 15 * Math.cos(angle);
      const arcLy = yBottom - 15 * Math.sin(angle);
      arcD = `M ${xLeft + 15} ${yBottom} A 15 15 0 0 0 ${arcLx} ${arcLy}`;
      refLblPos = { x: xLeft + 25, y: yBottom - 5 };
    } else {
      // Angle at top-right
      const angle = Math.atan2(baseLength, vertLength); // relative to vertical
      const arcLx = xRight - 15 * Math.sin(angle);
      const arcLy = yTop + 15 * Math.cos(angle);
      arcD = `M ${xRight} ${yTop + 15} A 15 15 0 0 1 ${arcLx} ${arcLy}`;
      refLblPos = { x: xRight - 12, y: yTop + 25 };
    }
  } else {
    // Right angle is at bottom-left
    pts = `${xRight},${yBottom} ${xLeft},${yBottom} ${xLeft},${yTop}`;
    baseLblPos = { x: (xLeft + xRight) / 2, y: yBottom + 12 };
    vertLblPos = { x: xLeft - 12, y: (yTop + yBottom) / 2 };
    hypLblPos = { x: (xLeft + xRight) / 2 + 10, y: (yTop + yBottom) / 2 - 10 };

    if (params.referenceAnglePos === "base") {
      // Angle at bottom-right
      const angle = Math.atan2(vertLength, baseLength);
      const arcLx = xRight - 15 * Math.cos(angle);
      const arcLy = yBottom - 15 * Math.sin(angle);
      arcD = `M ${xRight - 15} ${yBottom} A 15 15 0 0 1 ${arcLx} ${arcLy}`;
      refLblPos = { x: xRight - 25, y: yBottom - 5 };
    } else {
      // Angle at top-left
      const angle = Math.atan2(baseLength, vertLength); 
      const arcLx = xLeft + 15 * Math.sin(angle);
      const arcLy = yTop + 15 * Math.cos(angle);
      arcD = `M ${xLeft} ${yTop + 15} A 15 15 0 0 0 ${arcLx} ${arcLy}`;
      refLblPos = { x: xLeft + 12, y: yTop + 25 };
    }
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <polygon points={pts} fill="#f8fafc" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Right angle square */}
      {params.orientation === "right" ? (
        <path d={`M ${xRight - 8} ${yBottom} L ${xRight - 8} ${yBottom - 8} L ${xRight} ${yBottom - 8}`} fill="none" stroke="#64748b" strokeWidth="1.5" />
      ) : (
        <path d={`M ${xLeft + 8} ${yBottom} L ${xLeft + 8} ${yBottom - 8} L ${xLeft} ${yBottom - 8}`} fill="none" stroke="#64748b" strokeWidth="1.5" />
      )}

      {/* Reference Angle Arc */}
      <path d={arcD} fill="none" stroke="#0284c7" strokeWidth="2" />
      <text x={refLblPos.x} y={refLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#0369a1" fontWeight="bold">
        {params.referenceAngleLabel}
      </text>

      {/* Side Labels */}
      {/* Map visual base/vertical back to adj/opp via reference angle position */}
      {params.referenceAnglePos === "base" ? (
        <>
          <text x={baseLblPos.x} y={baseLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#334155">{params.labels.adjacent}</text>
          <text x={vertLblPos.x} y={vertLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#334155">{params.labels.opposite}</text>
        </>
      ) : (
        <>
          <text x={baseLblPos.x} y={baseLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#334155">{params.labels.opposite}</text>
          <text x={vertLblPos.x} y={vertLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#334155">{params.labels.adjacent}</text>
        </>
      )}
      <text x={hypLblPos.x} y={hypLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#334155">{params.labels.hypotenuse}</text>
    </svg>
  );
}

export function TrigProblemCard({
  problem,
  idx,
  mode,
  revealed,
}: {
  problem: TrigProblem;
  idx: number;
  mode: "GuidedNote" | "Review" | "Test";
  revealed?: boolean;
}) {
  const p = problem;
  
  let pretext = "";
  if (p.subtype === "IdentifyRatio") {
    pretext = `Identify the ratio for ${p.ratioType}(θ) given the right triangle.`;
  } else if (p.subtype === "SolveForSide") {
    pretext = `Using trigonometric ratios and the reference angle, solve for ${p.find}.`;
  } else {
    pretext = `Apply the inverse trigonometric function to solve for angle x.`;
  }

  return (
    <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden break-inside-avoid">
      <div className="bg-slate-50 border-r border-slate-200 px-4 py-4 flex flex-col items-center justify-start w-16 shrink-0">
        <span className="font-serif text-lg font-bold text-slate-400">
          {idx + 1}
        </span>
      </div>
      <div className="p-5 flex-1">
        <p className="font-serif text-lg text-slate-800 mb-6 leading-relaxed">
          {pretext}
        </p>
        
        <div className="flex gap-8 items-start mb-6 w-full">
          {p.svgParams && (
            <DiagramBox>
              <RightTriangleSVG params={p.svgParams} />
            </DiagramBox>
          )}
          
          <div className="flex flex-col gap-4 flex-1">
            {p.steps.map((step, i) => (
              <StepBlock key={i} step={step} stepIndex={i} mode={mode} revealed={revealed || false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

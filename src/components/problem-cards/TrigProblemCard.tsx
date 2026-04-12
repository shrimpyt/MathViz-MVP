import React from "react";
import type { TrigProblem, TrigSVGParams, SpecialTriangleProblem } from "@/lib/types";
import { StepBlock, DiagramBox } from "./SharedAtoms";

function RightTriangleSVG({ params }: { params: TrigSVGParams }) {
  const width = 100;
  const height = 100;
  const pad = 15;
  const effW = width - 2 * pad;
  const effH = height - 2 * pad;

  const maxSide = Math.max(params.opposite, params.adjacent);
  let baseLength = 0;
  let vertLength = 0;

  if (params.referenceAnglePos === "base") {
    baseLength = (params.adjacent / maxSide) * effW;
    vertLength = (params.opposite / maxSide) * effH;
  } else {
    baseLength = (params.opposite / maxSide) * effW;
    vertLength = (params.adjacent / maxSide) * effH;
  }

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
    pts = `${xLeft},${yBottom} ${xRight},${yBottom} ${xRight},${yTop}`;
    baseLblPos = { x: (xLeft + xRight) / 2, y: yBottom + 12 };
    vertLblPos = { x: xRight + 12, y: (yTop + yBottom) / 2 };
    hypLblPos = { x: (xLeft + xRight) / 2 - 10, y: (yTop + yBottom) / 2 - 10 };
    
    if (params.referenceAnglePos === "base") {
      const angle = Math.atan2(vertLength, baseLength);
      const arcLx = xLeft + 15 * Math.cos(angle);
      const arcLy = yBottom - 15 * Math.sin(angle);
      arcD = `M ${xLeft + 15} ${yBottom} A 15 15 0 0 0 ${arcLx} ${arcLy}`;
      refLblPos = { x: xLeft + 25, y: yBottom - 5 };
    } else {
      const angle = Math.atan2(baseLength, vertLength);
      const arcLx = xRight - 15 * Math.sin(angle);
      const arcLy = yTop + 15 * Math.cos(angle);
      arcD = `M ${xRight} ${yTop + 15} A 15 15 0 0 1 ${arcLx} ${arcLy}`;
      refLblPos = { x: xRight - 12, y: yTop + 25 };
    }
  } else {
    pts = `${xRight},${yBottom} ${xLeft},${yBottom} ${xLeft},${yTop}`;
    baseLblPos = { x: (xLeft + xRight) / 2, y: yBottom + 12 };
    vertLblPos = { x: xLeft - 12, y: (yTop + yBottom) / 2 };
    hypLblPos = { x: (xLeft + xRight) / 2 + 10, y: (yTop + yBottom) / 2 - 10 };

    if (params.referenceAnglePos === "base") {
      const angle = Math.atan2(vertLength, baseLength);
      const arcLx = xRight - 15 * Math.cos(angle);
      const arcLy = yBottom - 15 * Math.sin(angle);
      arcD = `M ${xRight - 15} ${yBottom} A 15 15 0 0 1 ${arcLx} ${arcLy}`;
      refLblPos = { x: xRight - 25, y: yBottom - 5 };
    } else {
      const angle = Math.atan2(baseLength, vertLength); 
      const arcLx = xLeft + 15 * Math.sin(angle);
      const arcLy = yTop + 15 * Math.cos(angle);
      arcD = `M ${xLeft} ${yTop + 15} A 15 15 0 0 0 ${arcLx} ${arcLy}`;
      refLblPos = { x: xLeft + 12, y: yTop + 25 };
    }
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <polygon points={pts} fill="none" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Right angle square */}
      {params.orientation === "right" ? (
        <path d={`M ${xRight - 8} ${yBottom} L ${xRight - 8} ${yBottom - 8} L ${xRight} ${yBottom - 8}`} fill="none" stroke="#0F172A" strokeWidth="1.2" />
      ) : (
        <path d={`M ${xLeft + 8} ${yBottom} L ${xLeft + 8} ${yBottom - 8} L ${xLeft} ${yBottom - 8}`} fill="none" stroke="#0F172A" strokeWidth="1.2" />
      )}

      {/* Reference Angle Arc */}
      <path d={arcD} fill="none" stroke="#D9A720" strokeWidth="2" />
      <text x={refLblPos.x} y={refLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#B48A18" fontWeight="bold">
        {params.referenceAngleLabel}
      </text>

      {/* Side Labels */}
      {params.referenceAnglePos === "base" ? (
        <>
          <text x={baseLblPos.x} y={baseLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#0F172A" fontWeight="bold">{params.labels.adjacent}</text>
          <text x={vertLblPos.x} y={vertLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#0F172A" fontWeight="bold">{params.labels.opposite}</text>
        </>
      ) : (
        <>
          <text x={baseLblPos.x} y={baseLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#0F172A" fontWeight="bold">{params.labels.opposite}</text>
          <text x={vertLblPos.x} y={vertLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#0F172A" fontWeight="bold">{params.labels.adjacent}</text>
        </>
      )}
      <text x={hypLblPos.x} y={hypLblPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#0F172A" fontWeight="bold">{params.labels.hypotenuse}</text>
    </svg>
  );
}

export function TrigProblemCard({
  problem,
  idx,
  mode,
  revealed,
}: {
  problem: TrigProblem | SpecialTriangleProblem;
  idx: number;
  mode: "GuidedNote" | "Review" | "Test";
  revealed: boolean;
}) {
  const p = problem;
  
  let pretext = "";
  if (p.subtype === "IdentifyRatio") {
    // Standard trig ratio (G.9A)
    const pt = p as TrigProblem;
    pretext = `Identify the ratio for ${pt.ratioType}(θ) given the right triangle.`;
  } else if (p.subtype === "SolveForSide") {
    pretext = `Using trigonometric ratios and the reference angle, solve for ${p.find}.`;
  } else if (p.subtype === "45-45-90" || p.subtype === "30-60-90") {
    // Special Right Triangle (G.9B)
    pretext = `Apply the properties of ${p.subtype} triangles to find the unknown length: ${p.find}.`;
  } else {
    pretext = `Apply the inverse trigonometric function to solve for angle x.`;
  }

  return (
    <div className="flex bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
        <span className="font-serif text-xl font-bold text-[#0F172A]">
          {idx + 1}
        </span>
      </div>
      <div className="p-6 flex-1">
        <p className="font-serif text-[1.1rem] text-[#0F172A] mb-8 leading-relaxed font-medium">
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

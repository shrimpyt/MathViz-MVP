import React from "react";
import type { TrigProblem, TrigSVGParams, SpecialTriangleProblem, OutputMode } from "@/lib/types";
import { StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";
import { layoutRightTriangle, baselineY } from "@/lib/labelPlacement";

function RightTriangleSVG({ params }: { params: TrigSVGParams }) {
  const width = 100;
  const height = 100;
  const FONT = 10;
  // Same layout as the PDF; serif bold on screen runs a little wider.
  const lay = layoutRightTriangle(
    params,
    { width, height, pad: 15 },
    { fontSize: FONT, widthScale: 1.15, arcR: 15, markSize: 8 },
  );
  const [R, B, T] = lay.points;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <polygon points={`${R.x},${R.y} ${B.x},${B.y} ${T.x},${T.y}`} fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
      <path d={lay.rightMark} fill="none" stroke="#111" strokeWidth="1.2" />
      {lay.arcs.map((d, i) => <path key={`arc${i}`} d={d} fill="none" stroke="#111" strokeWidth="2" />)}
      {lay.leaders.map(([a, b], i) => (
        <line key={`ld${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#111" strokeWidth="0.6" />
      ))}
      {lay.labels.map((l, i) => (
        <text key={i} x={l.center.x} y={baselineY(l.center.y, FONT)} textAnchor="middle" fontSize={FONT} fill="#111" fontWeight="bold">
          {l.text}
        </text>
      ))}
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
  mode: OutputMode;
  revealed: boolean;
}) {
  const p = problem;
  
  let pretext = "";
  if (p.subtype === "IdentifyRatio") {
    // Standard trig ratio (G.9A)
    const pt = p as TrigProblem;
    pretext = `Identify the ratio for ${pt.ratioType}(θ) given the right triangle.`;
  } else if (p.subtype === "ElevationDepression" && (p as TrigProblem).scenario) {
    pretext = `${(p as TrigProblem).scenario} Round to the nearest tenth.`;
  } else if (p.subtype === "SolveForSide") {
    pretext = `Using trigonometric ratios and the reference angle, solve for ${latexToText(p.find)}.`;
  } else if (p.subtype === "45-45-90" || p.subtype === "30-60-90") {
    // Special Right Triangle (G.9B)
    pretext = `Apply the properties of ${p.subtype} triangles to find the unknown length: ${latexToText(p.find)}.`;
  } else {
    pretext = `Apply the inverse trigonometric function to solve for angle x.`;
  }

  return (
    <div className="flex break-inside-avoid">
      <div className="pr-4 flex flex-col items-start justify-start w-10 shrink-0">
        <span className="font-serif text-lg font-bold text-[#111]">
          {idx + 1}
        </span>
      </div>
      <div className="flex-1">
        <p className="font-serif text-[1.1rem] text-[#111] mb-8 leading-relaxed font-medium">
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

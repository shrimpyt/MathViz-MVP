"use client";
// Algebra2Diagrams.tsx
// Web (plain SVG) diagrams for Algebra 2 problems: conic graphs (circles and
// parabolas on a coordinate grid) and rational-function graphs (dashed
// asymptotes, hyperbola branches, open-circle holes). The PDF twin lives in
// Algebra2PdfDiagrams.tsx; both share plotMath.ts.

import React from "react";
import type {
  Algebra2DiagramParams,
  Algebra2ConicSVGParams,
  Algebra2RationalSVGParams,
} from "@/lib/factories/Algebra2Types";
import {
  conicView,
  rationalView,
  sampleParabola,
  sampleRational,
  gridLines,
  makeProjector,
} from "./plotMath";

const INK = "#0F172A";
const BLUE = "#1d4ed8";
const RED = "#e11d48";

function Grid({ view }: { view: { minX: number; maxX: number; minY: number; maxY: number } }) {
  const p = makeProjector(view);
  const { vertical, horizontal } = gridLines(view);
  return (
    <g>
      {vertical.map((x) => {
        const a = p(x, view.minY), b = p(x, view.maxY);
        const isAxis = x === 0;
        return (
          <line key={`v${x}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.6} />
        );
      })}
      {horizontal.map((y) => {
        const a = p(view.minX, y), b = p(view.maxX, y);
        const isAxis = y === 0;
        return (
          <line key={`h${y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.6} />
        );
      })}
    </g>
  );
}

function ConicGraphSVG(params: Algebra2ConicSVGParams) {
  const view = conicView(params);
  const p = makeProjector(view);
  const w = view.maxX - view.minX || 1;
  const h = view.maxY - view.minY || 1;
  const rx = 200 / w; // px per unit
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Conic graph">
      <Grid view={view} />
      {(params.circles ?? []).map((c, i) => {
        const ctr = p(c.h, c.k);
        return (
          <circle key={`c${i}`} cx={ctr.x} cy={ctr.y} r={c.r * rx}
            fill="none" stroke={BLUE} strokeWidth={2} />
        );
      })}
      {(params.parabolas ?? []).map((pb, i) => {
        const pts = sampleParabola(pb.h, pb.k, pb.a, view.minX, view.maxX, view.minY, view.maxY);
        const d = pts.map((pt, j) => {
          const s = p(pt.x, pt.y);
          return `${j === 0 ? "M" : "L"} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
        }).join(" ");
        const v = p(pb.h, pb.k);
        return (
          <g key={`p${i}`}>
            <path d={d} fill="none" stroke={RED} strokeWidth={2} />
            <circle cx={v.x} cy={v.y} r={3} fill={RED} />
          </g>
        );
      })}
    </svg>
  );
}

function RationalGraphSVG(params: Algebra2RationalSVGParams) {
  const view = rationalView(params);
  const p = makeProjector(view);
  const segs = sampleRational(params.num, params.den, view.minX, view.maxX, view.minY, view.maxY, params.vAsm);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Rational function graph">
      <Grid view={view} />
      {params.vAsm.map((a, i) => {
        const t1 = p(a, view.minY), t2 = p(a, view.maxY);
        return (
          <line key={`va${i}`} x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="5,4" />
        );
      })}
      {params.hAsm !== null && (() => {
        const t1 = p(view.minX, params.hAsm), t2 = p(view.maxX, params.hAsm);
        return (
          <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="5,4" />
        );
      })()}
      {segs.map((seg, i) => {
        const d = seg.map((pt, j) => {
          const s = p(pt.x, pt.y);
          return `${j === 0 ? "M" : "L"} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
        }).join(" ");
        return <path key={`s${i}`} d={d} fill="none" stroke={BLUE} strokeWidth={2} />;
      })}
      {params.hole && (() => {
        const s = p(params.hole.x, params.hole.y);
        return <circle cx={s.x} cy={s.y} r={4} fill="#fff" stroke={RED} strokeWidth={2} />;
      })()}
    </svg>
  );
}

export function Algebra2WebSVG({ params }: { params: Algebra2DiagramParams }) {
  if (!params) return null;
  switch (params.kind) {
    case "ConicGraph":
      return <ConicGraphSVG {...params} />;
    case "RationalGraph":
      return <RationalGraphSVG {...params} />;
    default:
      return null;
  }
}

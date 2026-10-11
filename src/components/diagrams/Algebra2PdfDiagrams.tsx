// Algebra2PdfDiagrams.tsx
// PDF (@react-pdf/renderer) twins of the Algebra 2 web diagrams. Same plot
// math (plotMath.ts), react-pdf primitives. Wiring: PdfDocument's diagram
// switch needs `case` branches for the "ConicGraph"/"RationalGraph" kinds —
// see tests/algebra-2/WIRING.md.

import React from "react";
import { Svg, Line, Circle, Path } from "@react-pdf/renderer";
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

type V = { minX: number; maxX: number; minY: number; maxY: number };

function PdfGrid({ view }: { view: V }) {
  const p = makeProjector(view);
  const { vertical, horizontal } = gridLines(view);
  return (
    <>
      {vertical.map((x) => {
        const a = p(x, view.minY), b = p(x, view.maxY);
        const isAxis = x === 0;
        return (
          <Line key={`v${x}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.6} />
        );
      })}
      {horizontal.map((y) => {
        const a = p(view.minX, y), b = p(view.maxX, y);
        const isAxis = y === 0;
        return (
          <Line key={`h${y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.6} />
        );
      })}
    </>
  );
}

export function PdfConicGraphSVG(params: Algebra2ConicSVGParams) {
  const view = conicView(params);
  const p = makeProjector(view);
  const w = view.maxX - view.minX || 1;
  const rx = 200 / w;
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <PdfGrid view={view} />
      {(params.circles ?? []).map((c, i) => {
        const ctr = p(c.h, c.k);
        return (
          <Circle key={`c${i}`} cx={ctr.x} cy={ctr.y} r={c.r * rx}
            fill="none" stroke="#1d4ed8" strokeWidth={2} />
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
          <React.Fragment key={`p${i}`}>
            <Path d={d} fill="none" stroke="#e11d48" strokeWidth={2} />
            <Circle cx={v.x} cy={v.y} r={3} fill="#e11d48" />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function PdfRationalGraphSVG(params: Algebra2RationalSVGParams) {
  const view = rationalView(params);
  const p = makeProjector(view);
  const segs = sampleRational(params.num, params.den, view.minX, view.maxX, view.minY, view.maxY, params.vAsm);
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <PdfGrid view={view} />
      {params.vAsm.map((a, i) => {
        const t1 = p(a, view.minY), t2 = p(a, view.maxY);
        return (
          <Line key={`va${i}`} x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="5,4" />
        );
      })}
      {params.hAsm !== null && (() => {
        const t1 = p(view.minX, params.hAsm), t2 = p(view.maxX, params.hAsm);
        return (
          <Line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="5,4" />
        );
      })()}
      {segs.map((seg, i) => {
        const d = seg.map((pt, j) => {
          const s = p(pt.x, pt.y);
          return `${j === 0 ? "M" : "L"} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
        }).join(" ");
        return <Path key={`s${i}`} d={d} fill="none" stroke="#1d4ed8" strokeWidth={2} />;
      })}
      {params.hole && (() => {
        const s = p(params.hole.x, params.hole.y);
        return <Circle cx={s.x} cy={s.y} r={4} fill="#ffffff" stroke="#e11d48" strokeWidth={2} />;
      })()}
    </Svg>
  );
}

export function Algebra2PdfSVG({ params }: { params: Algebra2DiagramParams }) {
  if (!params) return null;
  switch (params.kind) {
    case "ConicGraph":
      return <PdfConicGraphSVG {...params} />;
    case "RationalGraph":
      return <PdfRationalGraphSVG {...params} />;
    default:
      return null;
  }
}

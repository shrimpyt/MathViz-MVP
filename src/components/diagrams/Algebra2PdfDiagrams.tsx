// Algebra2PdfDiagrams.tsx
// PDF (@react-pdf/renderer) twins of the Algebra 2 web diagrams. Same plot
// math (plotMath.ts), react-pdf primitives. Wiring: PdfDocument's diagram
// switch needs `case` branches for the "ConicGraph"/"RationalGraph" kinds,
// see tests/algebra-2/WIRING.md.

import React from "react";
import { Svg, Line, Circle, Path } from "@react-pdf/renderer";
import type {
  Algebra2DiagramParams,
  Algebra2ConicSVGParams,
  Algebra2RationalSVGParams,
  Algebra2FuncGraphParams,
} from "@/lib/factories/Algebra2Types";
import {
  conicView,
  rationalView,
  funcGraphView,
  sampleParabola,
  sampleRational,
  sampleFunction,
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

const PDF_GRAPH_COLORS = ["#1d4ed8", "#e11d48", "#059669", "#9333ea"];

export function PdfFuncGraphSVG(params: Algebra2FuncGraphParams) {
  const view = funcGraphView(params);
  const p = makeProjector(view);
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((pt, j) => {
      const s = p(pt.x, pt.y);
      return `${j === 0 ? "M" : "L"} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
    }).join(" ");
  let colorIdx = 0;
  const nextColor = () => PDF_GRAPH_COLORS[colorIdx++ % PDF_GRAPH_COLORS.length];
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <PdfGrid view={view} />
      {(params.shade ?? []).map((poly, i) => (
        <Path key={`sh${i}`} d={`${toPath(poly)} Z`} fill="#1d4ed8" fillOpacity={0.13} stroke="none" />
      ))}
      {(params.lines ?? []).map((ln, i) => {
        const m = ln.mNum / ln.mDen;
        const b = ln.bNum / ln.bDen;
        const segs = sampleFunction((x) => m * x + b, view.minX, view.maxX, view.minY, view.maxY);
        const color = nextColor();
        return segs.map((seg, j) => (
          <Path key={`ln${i}-${j}`} d={toPath(seg)} fill="none" stroke={color} strokeWidth={2}
            strokeDasharray={ln.dashed ? "5,4" : undefined} />
        ));
      })}
      {(params.verticalLines ?? []).map((v, i) => {
        const t1 = p(v.x, view.minY), t2 = p(v.x, view.maxY);
        return (
          <Line key={`vl${i}`} x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y}
            stroke={nextColor()} strokeWidth={2} strokeDasharray={v.dashed ? "5,4" : undefined} />
        );
      })}
      {(params.absGraphs ?? []).map((g, i) => {
        const a = g.aNum / g.aDen;
        const segs = sampleFunction((x) => a * Math.abs(x - g.h) + g.k, view.minX, view.maxX, view.minY, view.maxY);
        const color = nextColor();
        return segs.map((seg, j) => (
          <Path key={`ag${i}-${j}`} d={toPath(seg)} fill="none" stroke={color} strokeWidth={2}
            strokeDasharray={g.dashed ? "5,4" : undefined} />
        ));
      })}
      {(params.parabolas ?? []).map((pb, i) => {
        const pts = sampleParabola(pb.h, pb.k, pb.a, view.minX, view.maxX, view.minY, view.maxY);
        return <Path key={`pb${i}`} d={toPath(pts)} fill="none" stroke={nextColor()} strokeWidth={2} />;
      })}
      {(params.points ?? []).map((pt, i) => {
        const s = p(pt.x, pt.y);
        return pt.open
          ? <Circle key={`pt${i}`} cx={s.x} cy={s.y} r={4} fill="#ffffff" stroke="#111111" strokeWidth={2} />
          : <Circle key={`pt${i}`} cx={s.x} cy={s.y} r={3.2} fill="#111111" />;
      })}
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
    case "FuncGraph":
      return <PdfFuncGraphSVG {...params} />;
    default:
      return null;
  }
}

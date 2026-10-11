"use client";
// CalculusGraphs.tsx
// Function-graph renderers for the calculus area — web SVG + PDF SVG duality.
//
// Both renderers sample the SAME CalcGraphParams (the problem's own function
// data: coefficients, domains, holes, asymptotes, shading, tangent points,
// Riemann rectangles). Shapes are never hardcoded.
//
// Shared geometry (projection, sampling, path building) lives in plain
// functions below; CalcGraphWeb uses DOM SVG elements and CalcGraphPdf uses
// @react-pdf/renderer primitives.

import React from "react";
import {
  Svg,
  Path as PdfPath,
  Line as PdfLine,
  Circle as PdfCircle,
  Rect as PdfRect,
  Polygon as PdfPolygon,
  Text as PdfText,
  View as PdfView,
} from "@react-pdf/renderer";
import type { CalcFunction, CalcGraphParams } from "@/lib/factories/CalculusUtils";
import { evalCalcFn } from "@/lib/factories/CalculusUtils";

// ── Shared geometry ───────────────────────────────────────────────────────────

const W = 200;
const H = 200;
const PAD = 16;

interface Pt {
  x: number;
  y: number;
}

function makeProjector(p: CalcGraphParams): (x: number, y: number) => Pt {
  const sx = (W - 2 * PAD) / (p.xMax - p.xMin);
  const sy = (H - 2 * PAD) / (p.yMax - p.yMin);
  return (x, y) => {
    let px = PAD + (x - p.xMin) * sx;
    let py = H - PAD - (y - p.yMin) * sy;
    // clamp so steep curves don't shoot to infinity (viewport clips the rest)
    if (py < -60) py = -60;
    if (py > H + 60) py = H + 60;
    if (px < -60) px = -60;
    if (px > W + 60) px = W + 60;
    return { x: px, y: py };
  };
}

/**
 * Sample a function into subpaths, splitting at undefined points and at
 * vertical-asymptote blowups (|y| far outside the plot range).
 */
function sampleSubpaths(
  fn: CalcFunction,
  x0: number,
  x1: number,
  p: CalcGraphParams,
  proj: (x: number, y: number) => Pt
): Pt[][] {
  const paths: Pt[][] = [];
  let cur: Pt[] = [];
  const yr = p.yMax - p.yMin;
  const n = 240;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = evalCalcFn(fn, x);
    if (!isFinite(y) || y < p.yMin - 2.5 * yr || y > p.yMax + 2.5 * yr) {
      if (cur.length > 1) paths.push(cur);
      cur = [];
      continue;
    }
    cur.push(proj(x, y));
  }
  if (cur.length > 1) paths.push(cur);
  return paths;
}

const r1 = (v: number): number => Math.round(v * 10) / 10;

function pathFromPoints(pts: Pt[]): string {
  return pts.map((pt, i) => `${i === 0 ? "M" : "L"}${r1(pt.x)},${r1(pt.y)}`).join(" ");
}

function polygonFromPoints(pts: Pt[]): string {
  return pts.map((pt) => `${r1(pt.x)},${r1(pt.y)}`).join(" ");
}

/** Tangent-line segment (in px) for fn at x = at, clipped to the plot box. */
function tangentSegment(
  fn: CalcFunction,
  at: number,
  p: CalcGraphParams,
  proj: (x: number, y: number) => Pt
): [Pt, Pt] | null {
  const h = 1e-4;
  const y0 = evalCalcFn(fn, at);
  if (!isFinite(y0)) return null;
  const m = (evalCalcFn(fn, at + h) - evalCalcFn(fn, at - h)) / (2 * h);
  if (!isFinite(m)) return null;
  // param: (x, y) = (at, y0) + t*(1, m); intersect t with the data rect
  let tMin = p.xMin - at;
  let tMax = p.xMax - at;
  const mrg = (p.yMax - p.yMin) * 0.02;
  if (Math.abs(m) > 1e-12) {
    const t1 = (p.yMin - mrg - y0) / m;
    const t2 = (p.yMax + mrg - y0) / m;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (tMax <= tMin) return null;
  return [proj(at + tMin, y0 + m * tMin), proj(at + tMax, y0 + m * tMax)];
}

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
}

function riemannBars(
  p: CalcGraphParams,
  proj: (x: number, y: number) => Pt
): Bar[] {
  const rm = p.riemann;
  if (!rm || !p.fn) return [];
  const y0 = Math.max(p.yMin, Math.min(p.yMax, 0));
  const dx = (rm.b - rm.a) / rm.n;
  const bars: Bar[] = [];
  for (let i = 0; i < rm.n; i++) {
    const xs =
      rm.mode === "left" ? rm.a + i * dx : rm.mode === "right" ? rm.a + (i + 1) * dx : rm.a + (i + 0.5) * dx;
    const hgt = evalCalcFn(p.fn, xs);
    if (!isFinite(hgt)) continue;
    const c0 = proj(rm.a + i * dx, y0);
    const c1 = proj(rm.a + i * dx, hgt);
    const c2 = proj(rm.a + (i + 1) * dx, y0);
    bars.push({ x: c0.x, y: Math.min(c0.y, c1.y), w: Math.max(0.5, c2.x - c0.x), h: Math.abs(c1.y - c0.y) });
  }
  return bars;
}

function shadePoints(
  p: CalcGraphParams,
  proj: (x: number, y: number) => Pt
): Pt[] {
  const s = p.shade;
  if (!s || !p.fn) return [];
  const n = 120;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = s.a + ((s.b - s.a) * i) / n;
    const y = evalCalcFn(p.fn, x);
    pts.push(proj(x, isFinite(y) ? y : 0));
  }
  if (s.between && p.fn2) {
    for (let i = n; i >= 0; i--) {
      const x = s.a + ((s.b - s.a) * i) / n;
      const y = evalCalcFn(p.fn2, x);
      pts.push(proj(x, isFinite(y) ? y : 0));
    }
  } else {
    const y0 = Math.max(p.yMin, Math.min(p.yMax, 0));
    pts.push(proj(s.b, y0), proj(s.a, y0));
  }
  return pts;
}

/** Integer tick positions, thinned when the range is wide. */
function ticks(min: number, max: number): number[] {
  const range = max - min;
  const step = range > 24 ? 5 : range > 12 ? 2 : 1;
  const out: number[] = [];
  for (let v = Math.ceil(min); v <= max; v += step) out.push(v);
  return out;
}

// ── Element model (shared by web + PDF) ───────────────────────────────────────

interface GraphModel {
  gridLines: { x1: number; y1: number; x2: number; y2: number; axis: boolean }[];
  tickLabels: { x: number; y: number; text: string }[];
  shade: string;
  bars: Bar[];
  curves: string[];
  curve2: string[];
  asymptotes: { x1: number; y1: number; x2: number; y2: number }[];
  tangent: [Pt, Pt] | null;
  holes: Pt[];
  solids: Pt[];
  markers: { pt: Pt; label?: string }[];
  fnLabel?: { x: number; y: number; text: string };
}

function buildModel(p: CalcGraphParams): GraphModel {
  const proj = makeProjector(p);
  const gridLines: GraphModel["gridLines"] = [];
  const tickLabels: GraphModel["tickLabels"] = [];

  for (const gx of ticks(p.xMin, p.xMax)) {
    const a = proj(gx, p.yMin);
    const b = proj(gx, p.yMax);
    const isAxis = Math.abs(gx) < 1e-9;
    gridLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, axis: isAxis });
    tickLabels.push({ x: a.x, y: proj(0, 0).y + 11, text: String(gx) });
  }
  for (const gy of ticks(p.yMin, p.yMax)) {
    if (Math.abs(gy) < 1e-9) continue;
    const a = proj(p.xMin, gy);
    const b = proj(p.xMax, gy);
    gridLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, axis: false });
    tickLabels.push({ x: proj(0, 0).x - 5, y: a.y + 2.5, text: String(gy) });
  }
  // axis labels x / y are conveyed by the tick labels; no extra elements needed

  const curves: string[] = [];
  if (p.fn) {
    const [dx0, dx1] = p.fnDomain ?? [p.xMin, p.xMax];
    for (const sp of sampleSubpaths(p.fn, Math.max(dx0, p.xMin), Math.min(dx1, p.xMax), p, proj))
      curves.push(pathFromPoints(sp));
  }
  const curve2: string[] = [];
  if (p.fn2) {
    const [dx0, dx1] = p.fn2Domain ?? [p.xMin, p.xMax];
    for (const sp of sampleSubpaths(p.fn2, Math.max(dx0, p.xMin), Math.min(dx1, p.xMax), p, proj))
      curve2.push(pathFromPoints(sp));
  }

  const asymptotes = (p.asymptotes ?? [])
    .filter((ax) => ax >= p.xMin && ax <= p.xMax)
    .map((ax) => {
      const a = proj(ax, p.yMin);
      const b = proj(ax, p.yMax);
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    });

  const holes = (p.holes ?? []).map((pt) => proj(pt.x, pt.y));
  const solids = (p.solids ?? []).map((pt) => proj(pt.x, pt.y));
  const markers = (p.markers ?? []).map((m) => ({ pt: proj(m.x, m.y), label: m.label }));

  let fnLabel: GraphModel["fnLabel"];
  if (p.fnLabel && p.fn) {
    const xe = p.fnDomain ? p.fnDomain[1] : p.xMax;
    const ye = evalCalcFn(p.fn, Math.min(xe, p.xMax));
    const lp = proj(Math.min(xe, p.xMax), isFinite(ye) ? ye : p.yMax);
    fnLabel = { x: Math.min(lp.x + 4, W - 30), y: Math.max(lp.y - 6, 8), text: p.fnLabel };
  }

  return {
    gridLines,
    tickLabels,
    shade: p.shade ? polygonFromPoints(shadePoints(p, proj)) : "",
    bars: riemannBars(p, proj),
    curves,
    curve2,
    asymptotes,
    tangent: p.tangentAt !== undefined && p.fn ? tangentSegment(p.fn, p.tangentAt, p, proj) : null,
    holes,
    solids,
    markers,
    fnLabel,
  };
}

// ── Web renderer (DOM SVG) ────────────────────────────────────────────────────

export function CalcGraphWeb({ params }: { params: CalcGraphParams }) {
  const m = buildModel(params);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label="Function graph">
      {m.shade !== "" && <polygon points={m.shade} fill="#bfdbfe" opacity={0.65} />}
      {m.bars.map((b, i) => (
        <rect
          key={`bar${i}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="#dbeafe"
          stroke="#3b82f6"
          strokeWidth={0.8}
        />
      ))}
      {m.gridLines.map((g, i) => (
        <line
          key={`g${i}`}
          x1={g.x1}
          y1={g.y1}
          x2={g.x2}
          y2={g.y2}
          stroke={g.axis ? "#0F172A" : "#e2e8f0"}
          strokeWidth={g.axis ? 1.2 : 0.6}
        />
      ))}
      {m.asymptotes.map((a, i) => (
        <line
          key={`a${i}`}
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4,3"
        />
      ))}
      {m.tangent && (
        <line
          x1={m.tangent[0].x}
          y1={m.tangent[0].y}
          x2={m.tangent[1].x}
          y2={m.tangent[1].y}
          stroke="#16a34a"
          strokeWidth={1.4}
          strokeDasharray="5,2"
        />
      )}
      {m.curve2.map((d, i) => (
        <path key={`c2-${i}`} d={d} fill="none" stroke="#8b5cf6" strokeWidth={1.8} />
      ))}
      {m.curves.map((d, i) => (
        <path key={`c1-${i}`} d={d} fill="none" stroke="#0F172A" strokeWidth={1.8} />
      ))}
      {m.holes.map((pt, i) => (
        <circle key={`h${i}`} cx={pt.x} cy={pt.y} r={4} fill="#ffffff" stroke="#0F172A" strokeWidth={1.6} />
      ))}
      {m.solids.map((pt, i) => (
        <circle key={`s${i}`} cx={pt.x} cy={pt.y} r={3.4} fill="#0F172A" />
      ))}
      {m.markers.map((mk, i) => (
        <g key={`m${i}`}>
          <circle cx={mk.pt.x} cy={mk.pt.y} r={3} fill="#dc2626" />
          {mk.label && (
            <text x={mk.pt.x + 6} y={mk.pt.y - 6} fontSize={7.5} fontFamily="Georgia, serif" fill="#0F172A">
              {mk.label}
            </text>
          )}
        </g>
      ))}
      {m.tickLabels.map((t, i) => (
        <text
          key={`t${i}`}
          x={t.x}
          y={t.y}
          fontSize={6}
          fontFamily="Georgia, serif"
          textAnchor="middle"
          fill="#64748b"
        >
          {t.text}
        </text>
      ))}
      {m.fnLabel && (
        <text x={m.fnLabel.x} y={m.fnLabel.y} fontSize={8} fontStyle="italic" fontFamily="Georgia, serif" fill="#0F172A">
          {m.fnLabel.text}
        </text>
      )}
    </svg>
  );
}

// ── PDF renderer (@react-pdf/renderer primitives) ─────────────────────────────

export function CalcGraphPdf({ params }: { params: CalcGraphParams }) {
  const m = buildModel(params);
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="130" height="130">
      {m.shade !== "" && <PdfPolygon points={m.shade} fill="#bfdbfe" opacity={0.65} />}
      {m.bars.map((b, i) => (
        <PdfRect
          key={`bar${i}`}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="#dbeafe"
          stroke="#3b82f6"
          strokeWidth={0.8}
        />
      ))}
      {m.gridLines.map((g, i) => (
        <PdfLine
          key={`g${i}`}
          x1={g.x1}
          y1={g.y1}
          x2={g.x2}
          y2={g.y2}
          stroke={g.axis ? "#0F172A" : "#e2e8f0"}
          strokeWidth={g.axis ? 1.2 : 0.6}
        />
      ))}
      {m.asymptotes.map((a, i) => (
        <PdfLine
          key={`a${i}`}
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4,3"
        />
      ))}
      {m.tangent && (
        <PdfLine
          x1={m.tangent[0].x}
          y1={m.tangent[0].y}
          x2={m.tangent[1].x}
          y2={m.tangent[1].y}
          stroke="#16a34a"
          strokeWidth={1.4}
          strokeDasharray="5,2"
        />
      )}
      {m.curve2.map((d, i) => (
        <PdfPath key={`c2-${i}`} d={d} fill="none" stroke="#8b5cf6" strokeWidth={1.8} />
      ))}
      {m.curves.map((d, i) => (
        <PdfPath key={`c1-${i}`} d={d} fill="none" stroke="#0F172A" strokeWidth={1.8} />
      ))}
      {m.holes.map((pt, i) => (
        <PdfCircle key={`h${i}`} cx={pt.x} cy={pt.y} r={4} fill="#ffffff" stroke="#0F172A" strokeWidth={1.6} />
      ))}
      {m.solids.map((pt, i) => (
        <PdfCircle key={`s${i}`} cx={pt.x} cy={pt.y} r={3.4} fill="#0F172A" />
      ))}
      {m.markers.map((mk, i) => (
        <React.Fragment key={`m${i}`}>
          <PdfCircle cx={mk.pt.x} cy={mk.pt.y} r={3} fill="#dc2626" />
          {mk.label && (
            <PdfText x={mk.pt.x + 6} y={mk.pt.y - 2} style={{ fontSize: 7.5, fontFamily: "Times-Roman" }}>
              {mk.label}
            </PdfText>
          )}
        </React.Fragment>
      ))}
      {m.tickLabels.map((t, i) => (
        <PdfText
          key={`t${i}`}
          x={t.x - 4}
          y={t.y}
          style={{ fontSize: 6, fontFamily: "Times-Roman", color: "#64748b" }}
        >
          {t.text}
        </PdfText>
      ))}
      {m.fnLabel && (
        <PdfText x={m.fnLabel.x} y={m.fnLabel.y} style={{ fontSize: 8, fontFamily: "Times-Italic" }}>
          {m.fnLabel.text}
        </PdfText>
      )}
    </Svg>
  );
}

export function CalcTablePdf({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: string[][];
  caption?: string;
}) {
  const colW = `${100 / headers.length}%`;
  const cell = {
    width: colW,
    padding: 4,
    borderRight: "0.5pt solid #0F172A",
    fontSize: 8,
    fontFamily: "Times-Roman",
    textAlign: "center" as const,
  };
  return (
    <PdfView style={{ marginVertical: 6, border: "1pt solid #0F172A", maxWidth: 320 }}>
      <PdfView style={{ flexDirection: "row", backgroundColor: "#f1f5f9", borderBottom: "1pt solid #0F172A" }}>
        {headers.map((h, i) => (
          <PdfText key={i} style={{ ...cell, fontFamily: "Times-Bold", borderRight: i === headers.length - 1 ? "none" : cell.borderRight }}>
            {h}
          </PdfText>
        ))}
      </PdfView>
      {rows.map((row, ri) => (
        <PdfView
          key={ri}
          style={{
            flexDirection: "row",
            borderBottom: ri === rows.length - 1 ? "none" : "0.5pt solid #cbd5e1",
            backgroundColor: ri % 2 === 0 ? "#ffffff" : "#f8fafc",
          }}
        >
          {row.map((c, ci) => (
            <PdfText key={ci} style={{ ...cell, borderRight: ci === row.length - 1 ? "none" : cell.borderRight }}>
              {c}
            </PdfText>
          ))}
        </PdfView>
      ))}
      {caption && (
        <PdfText style={{ fontSize: 7, fontFamily: "Times-Italic", padding: 4, textAlign: "center" }}>
          {caption}
        </PdfText>
      )}
    </PdfView>
  );
}

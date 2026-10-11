// PrecalcDiagrams.tsx
// Web (plain SVG) + PDF (@react-pdf/renderer) diagrams for the AP Precalculus
// generators: unit circle, vectors, trig graphs, conics, polar grid,
// limit graphs, and the complex plane.
//
// The two renderers share the same JSON-serializable params
// (PrecalcDiagramParams) and the same pure geometry helpers below.

import React from "react";
import { Svg, Circle, Ellipse, Line, Path, Text, Polygon } from "@react-pdf/renderer";
import type { PrecalcDiagramParams } from "@/lib/factories/PrecalcTypes";

// -- Pure geometry helpers (shared) --------------------------------------------

const NAVY = "#0F172A";
const BLUE = "#3b82f6";
const RED = "#e11d48";
const GOLD = "#D9A720";
const GRID = "#e2e8f0";
const AXIS = "#94a3b8";

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Math point (x right, y up) -> SVG point in a 200x200 box. */
function svgXY(
  x: number, y: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
  pad = 14
): { sx: number; sy: number } {
  const W = 200 - 2 * pad;
  const H = 200 - 2 * pad;
  return {
    sx: pad + ((x - xMin) / (xMax - xMin)) * W,
    sy: pad + (1 - (y - yMin) / (yMax - yMin)) * H,
  };
}

function polyline(pts: { sx: number; sy: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(" ");
}

/** "π/2", "3π/4", "2π", "-π" ... for multiples of π/2. */
function piTickLabel(k: number): string {
  // k counts quarter-π units: label = k·π/2
  if (k === 0) return "0";
  const sign = k < 0 ? "-" : "";
  const a = Math.abs(k);
  if (a === 2) return `${sign}π`;
  if (a === 4) return `${sign}2π`;
  if (a % 2 === 0) return `${sign}${a / 2}π`;
  return `${sign}${a}π/2`;
}

function arrowHead(tipX: number, tipY: number, angRad: number, size = 7): string {
  // angRad: direction of the arrow in SVG coords (y down)
  const a1 = angRad + Math.PI - 0.42;
  const a2 = angRad + Math.PI + 0.42;
  const x1 = tipX + size * Math.cos(a1);
  const y1 = tipY + size * Math.sin(a1);
  const x2 = tipX + size * Math.cos(a2);
  const y2 = tipY + size * Math.sin(a2);
  return `${tipX},${tipY} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

const ARROW_COLORS: Record<string, string> = { navy: NAVY, blue: BLUE, red: RED };

// -- Web SVG renderers (plain <svg>) --------------------------------------------

function WebUnitCircle({ angleDeg, radianLabel, cosText, sinText }: Extract<PrecalcDiagramParams, { kind: "unit-circle" }>) {
  const C = 100, R = 74;
  const rad = toRad(angleDeg);
  const px = C + R * Math.cos(rad);
  const py = C - R * Math.sin(rad);
  const large = angleDeg > 180;
  const arcD = `M ${C + 26} ${C} A 26 26 0 ${large ? 1 : 0} ${angleDeg <= 180 ? 0 : 1} ${C + 26 * Math.cos(rad)} ${C - 26 * Math.sin(rad)}`;
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Unit circle">
      <line x1={14} y1={C} x2={186} y2={C} stroke={AXIS} strokeWidth={1} />
      <line x1={C} y1={186} x2={C} y2={14} stroke={AXIS} strokeWidth={1} />
      <circle cx={C} cy={C} r={R} fill="none" stroke={NAVY} strokeWidth={1.5} />
      <path d={arcD} fill="none" stroke={GOLD} strokeWidth={1.6} />
      <line x1={C} y1={C} x2={px} y2={py} stroke={BLUE} strokeWidth={1.6} />
      <line x1={px} y1={py} x2={px} y2={C} stroke={BLUE} strokeWidth={1} strokeDasharray="4,2" />
      <line x1={C} y1={C} x2={px} y2={C} stroke={BLUE} strokeWidth={1} />
      <circle cx={px} cy={py} r={3} fill={RED} />
      <text x={C + 32} y={C - 8} fontSize={9} fill={NAVY}>{radianLabel}</text>
      <text x={(C + px) / 2 - 12} y={C + 14} fontSize={8} fill={NAVY}>{cosText}</text>
      <text x={px + 6} y={(C + py) / 2} fontSize={8} fill={NAVY}>{sinText}</text>
      <text x={188} y={C - 4} fontSize={9} fill={NAVY}>x</text>
      <text x={C + 4} y={12} fontSize={9} fill={NAVY}>y</text>
    </svg>
  );
}

function WebVectors({ arrows, range }: Extract<PrecalcDiagramParams, { kind: "vectors" }>) {
  const R = Math.max(range, 1);
  const map = (x: number, y: number) => svgXY(x, y, -R, R, -R, R);
  const o = map(0, 0);
  const gridLines = [];
  for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
    const gx = map(g, 0), gy = map(0, g);
    gridLines.push(<line key={`v${g}`} x1={gx.sx} y1={14} x2={gx.sx} y2={186} stroke={GRID} strokeWidth={0.5} />);
    gridLines.push(<line key={`h${g}`} x1={14} y1={gy.sy} x2={186} y2={gy.sy} stroke={GRID} strokeWidth={0.5} />);
  }
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Vectors">
      {gridLines}
      <line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={AXIS} strokeWidth={1} />
      <line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={AXIS} strokeWidth={1} />
      {arrows.map((a, i) => {
        const tip = map(a.dx, a.dy);
        const ang = Math.atan2(tip.sy - o.sy, tip.sx - o.sx);
        const color = ARROW_COLORS[a.color] ?? NAVY;
        return (
          <g key={i}>
            <line x1={o.sx} y1={o.sy} x2={tip.sx} y2={tip.sy} stroke={color} strokeWidth={1.8}
              strokeDasharray={a.dashed ? "5,3" : undefined} />
            <polygon points={arrowHead(tip.sx, tip.sy, ang)} fill={color} />
            <text x={tip.sx + 5} y={tip.sy - 4} fontSize={10} fill={color} fontStyle="italic">{a.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WebTrigGraph({ fnType, a, b, c, d, xMin, xMax }: Extract<PrecalcDiagramParams, { kind: "trig-graph" }>) {
  const yMin = d - Math.abs(a) - 1;
  const yMax = d + Math.abs(a) + 1;
  const map = (x: number, y: number) => svgXY(x, y, xMin, xMax, yMin, yMax);
  const pts: { sx: number; sy: number }[] = [];
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = a * (fnType === "sin" ? Math.sin(b * (x - c)) : Math.cos(b * (x - c))) + d;
    pts.push(map(x, y));
  }
  const ticks = [];
  for (let k = Math.ceil((xMin / Math.PI) * 2); k <= Math.floor((xMax / Math.PI) * 2); k++) {
    const x = (k * Math.PI) / 2;
    const s = map(x, 0);
    ticks.push(
      <g key={k}>
        <line x1={s.sx} y1={map(0, yMin).sy} x2={s.sx} y2={map(0, yMax).sy} stroke={GRID} strokeWidth={0.5} />
        <text x={s.sx - 6} y={map(0, 0).sy + 12} fontSize={7} fill={NAVY}>{piTickLabel(k)}</text>
      </g>
    );
  }
  const mid = map(0, d);
  const yAxis = xMin <= 0 && 0 <= xMax ? map(0, 0).sx : null;
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Trig graph">
      {ticks}
      <line x1={14} y1={map(0, 0).sy} x2={186} y2={map(0, 0).sy} stroke={AXIS} strokeWidth={1} />
      {yAxis !== null && <line x1={yAxis} y1={14} x2={yAxis} y2={186} stroke={AXIS} strokeWidth={1} />}
      <line x1={14} y1={mid.sy} x2={186} y2={mid.sy} stroke={GOLD} strokeWidth={1} strokeDasharray="5,3" />
      <path d={polyline(pts)} fill="none" stroke={BLUE} strokeWidth={1.8} />
    </svg>
  );
}

function WebConic(p: Extract<PrecalcDiagramParams, { kind: "conic" }>) {
  const R = Math.max(p.range, 1);
  const map = (x: number, y: number) => svgXY(x, y, -R, R, -R, R);
  const o = map(0, 0);
  const gridLines = [];
  for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
    const gx = map(g, 0), gy = map(0, g);
    gridLines.push(<line key={`v${g}`} x1={gx.sx} y1={14} x2={gx.sx} y2={186} stroke={GRID} strokeWidth={0.5} />);
    gridLines.push(<line key={`h${g}`} x1={14} y1={gy.sy} x2={186} y2={gy.sy} stroke={GRID} strokeWidth={0.5} />);
  }
  let curve: React.ReactNode = null;
  const { cx, cy, a, b } = p;
  if (p.conicType === "circle") {
    const c = map(cx, cy);
    const edge = map(cx + a, cy);
    curve = <circle cx={c.sx} cy={c.sy} r={Math.abs(edge.sx - c.sx)} fill="none" stroke={BLUE} strokeWidth={1.8} />;
  } else if (p.conicType === "ellipse") {
    const c = map(cx, cy);
    const ex = map(cx + a, cy), ey = map(cx, cy + b);
    curve = <ellipse cx={c.sx} cy={c.sy} rx={Math.abs(ex.sx - c.sx)} ry={Math.abs(ey.sy - c.sy)} fill="none" stroke={BLUE} strokeWidth={1.8} />;
  } else if (p.conicType === "parabola") {
    const fp = p.p ?? 1;
    const orient = p.orientation ?? "up";
    // Split into contiguous runs so clipping doesn't draw straight lines.
    const runs: { sx: number; sy: number }[][] = [];
    let cur: { sx: number; sy: number }[] = [];
    const N = 120;
    const step = (2 * R) / N;
    let prevT = -Infinity;
    for (let i = 0; i <= N; i++) {
      const t = -R + step * i;
      let ok = false, pt = { sx: 0, sy: 0 };
      if (orient === "up" || orient === "down") {
        const y = ((t - cx) * (t - cx)) / (4 * fp) + cy;
        ok = y >= -R && y <= R;
        pt = map(t, y);
      } else {
        const x = ((t - cy) * (t - cy)) / (4 * fp) + cx;
        ok = x >= -R && x <= R;
        pt = map(x, t);
      }
      if (ok && (cur.length === 0 || Math.abs(t - prevT - step) < 1e-9)) cur.push(pt);
      else {
        if (cur.length > 1) runs.push(cur);
        cur = ok ? [pt] : [];
      }
      if (ok) prevT = t;
    }
    if (cur.length > 1) runs.push(cur);
    curve = <g>{runs.map((r, i) => <path key={i} d={polyline(r)} fill="none" stroke={BLUE} strokeWidth={1.8} />)}</g>;
  } else {
    // hyperbola: (x-cx)^2/a^2 - (y-cy)^2/b^2 = 1, horizontal transverse axis
    const runs: { sx: number; sy: number }[][] = [[], []];
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const y = -R + (2 * R * i) / N;
      const q = 1 + ((y - cy) / b) * ((y - cy) / b);
      const dx = a * Math.sqrt(q);
      runs[0].push(map(cx + dx, y));
      runs[1].push(map(cx - dx, y));
    }
    curve = <g>{runs.map((r, i) => <path key={i} d={polyline(r)} fill="none" stroke={BLUE} strokeWidth={1.8} />)}</g>;
  }
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Conic graph">
      {gridLines}
      <line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={AXIS} strokeWidth={1} />
      <line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={AXIS} strokeWidth={1} />
      {curve}
      {(p.marks ?? []).map((m, i) => {
        const s = map(m.x, m.y);
        return (
          <g key={i}>
            <circle cx={s.sx} cy={s.sy} r={3} fill={RED} />
            <text x={s.sx + 5} y={s.sy - 4} fontSize={9} fill={RED}>{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WebPolarGrid({ points, rMax, curve }: Extract<PrecalcDiagramParams, { kind: "polar-grid" }>) {
  const C = 100;
  const scale = 80 / Math.max(rMax, 1);
  const toXY = (r: number, thetaDeg: number) => {
    const t = toRad(thetaDeg);
    return { x: C + r * scale * Math.cos(t), y: C - r * scale * Math.sin(t) };
  };
  const circles = [];
  for (let k = 1; k <= Math.floor(rMax); k++) {
    circles.push(<circle key={k} cx={C} cy={C} r={k * scale} fill="none" stroke={GRID} strokeWidth={0.6} />);
  }
  const spokes = [];
  for (let dgr = 0; dgr < 360; dgr += 30) {
    const e = toXY(rMax, dgr);
    spokes.push(<line key={dgr} x1={C} y1={C} x2={e.x} y2={e.y} stroke={GRID} strokeWidth={0.6} />);
  }
  let curvePath: string | null = null;
  if (curve) {
    const pts: { x: number; y: number }[] = [];
    for (let dgr = 0; dgr <= 360; dgr += 2) {
      const t = toRad(dgr);
      let r: number;
      if (curve.curveType === "circle") r = curve.a * Math.cos(t);
      else r = curve.a + curve.b * Math.cos(t);
      const p = toXY(r, dgr);
      pts.push(p);
    }
    curvePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  }
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Polar grid">
      {circles}
      {spokes}
      <line x1={14} y1={C} x2={186} y2={C} stroke={AXIS} strokeWidth={1} />
      <line x1={C} y1={186} x2={C} y2={14} stroke={AXIS} strokeWidth={1} />
      {curvePath && <path d={curvePath} fill="none" stroke={BLUE} strokeWidth={1.8} />}
      {points.map((pt, i) => {
        const s = toXY(pt.r, pt.thetaDeg);
        return (
          <g key={i}>
            <circle cx={s.x} cy={s.y} r={3.5} fill={RED} />
            <text x={s.x + 6} y={s.y - 4} fontSize={10} fill={RED}>{pt.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WebLimitGraph({ segments, holes, dots, xRange, yRange }: Extract<PrecalcDiagramParams, { kind: "limit-graph" }>) {
  const map = (x: number, y: number) => svgXY(x, y, xRange[0], xRange[1], yRange[0], yRange[1]);
  const o = map(0, 0);
  const showXAxis = yRange[0] <= 0 && 0 <= yRange[1];
  const showYAxis = xRange[0] <= 0 && 0 <= xRange[1];
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Limit graph">
      {showXAxis && <line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={AXIS} strokeWidth={1} />}
      {showYAxis && <line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={AXIS} strokeWidth={1} />}
      {segments.map((s, i) => {
        const p1 = map(s.x1, s.y1), p2 = map(s.x2, s.y2);
        return <line key={i} x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} stroke={BLUE} strokeWidth={2} />;
      })}
      {holes.map((h, i) => {
        const p = map(h.x, h.y);
        return <circle key={`h${i}`} cx={p.sx} cy={p.sy} r={4} fill="#fff" stroke={BLUE} strokeWidth={2} />;
      })}
      {dots.map((dt, i) => {
        const p = map(dt.x, dt.y);
        return <circle key={`d${i}`} cx={p.sx} cy={p.sy} r={4} fill={BLUE} />;
      })}
    </svg>
  );
}

function WebComplexPlane({ points, range }: Extract<PrecalcDiagramParams, { kind: "complex-plane" }>) {
  const R = Math.max(range, 1);
  const map = (x: number, y: number) => svgXY(x, y, -R, R, -R, R);
  const o = map(0, 0);
  const gridLines = [];
  for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
    const gx = map(g, 0), gy = map(0, g);
    gridLines.push(<line key={`v${g}`} x1={gx.sx} y1={14} x2={gx.sx} y2={186} stroke={GRID} strokeWidth={0.5} />);
    gridLines.push(<line key={`h${g}`} x1={14} y1={gy.sy} x2={186} y2={gy.sy} stroke={GRID} strokeWidth={0.5} />);
  }
  return (
    <svg viewBox="0 0 200 200" width="130" height="130" role="img" aria-label="Complex plane">
      {gridLines}
      <line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={NAVY} strokeWidth={1.2} />
      <line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={NAVY} strokeWidth={1.2} />
      <text x={182} y={o.sy - 4} fontSize={9} fill={NAVY} fontStyle="italic">Re</text>
      <text x={o.sx + 4} y={12} fontSize={9} fill={NAVY} fontStyle="italic">Im</text>
      {points.map((pt, i) => {
        const s = map(pt.re, pt.im);
        return (
          <g key={i}>
            <circle cx={s.sx} cy={s.sy} r={3.5} fill={RED} />
            <text x={s.sx + 6} y={s.sy - 4} fontSize={10} fill={RED} fontStyle="italic">{pt.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Web renderer: switch on diagram kind. */
export function PrecalcWebSVG({ params }: { params: PrecalcDiagramParams }) {
  switch (params.kind) {
    case "unit-circle": return <WebUnitCircle {...params} />;
    case "vectors": return <WebVectors {...params} />;
    case "trig-graph": return <WebTrigGraph {...params} />;
    case "conic": return <WebConic {...params} />;
    case "polar-grid": return <WebPolarGrid {...params} />;
    case "limit-graph": return <WebLimitGraph {...params} />;
    case "complex-plane": return <WebComplexPlane {...params} />;
    default: return null;
  }
}

// -- PDF renderers (@react-pdf/renderer) ----------------------------------------

function PLabel({ x, y, text, size = 8, fill = NAVY }: { x: number; y: number; text: string; size?: number; fill?: string }) {
  return (
    <Text x={x - 3} y={y + 3} style={{ fontSize: size, fontFamily: "Times-Roman", color: fill }}>
      {text}
    </Text>
  );
}

function PdfUnitCircle({ angleDeg, radianLabel, cosText, sinText }: Extract<PrecalcDiagramParams, { kind: "unit-circle" }>) {
  const C = 100, R = 74;
  const rad = toRad(angleDeg);
  const px = C + R * Math.cos(rad);
  const py = C - R * Math.sin(rad);
  const large = angleDeg > 180 ? 1 : 0;
  const sweep = angleDeg <= 180 ? 0 : 1;
  const arcD = `M ${C + 26} ${C} A 26 26 0 ${large} ${sweep} ${C + 26 * Math.cos(rad)} ${C - 26 * Math.sin(rad)}`;
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Line x1={14} y1={C} x2={186} y2={C} stroke={AXIS} strokeWidth={1} />
      <Line x1={C} y1={186} x2={C} y2={14} stroke={AXIS} strokeWidth={1} />
      <Circle cx={C} cy={C} r={R} fill="none" stroke={NAVY} strokeWidth={1.5} />
      <Path d={arcD} fill="none" stroke={GOLD} strokeWidth={1.6} />
      <Line x1={C} y1={C} x2={px} y2={py} stroke={BLUE} strokeWidth={1.6} />
      <Line x1={px} y1={py} x2={px} y2={C} stroke={BLUE} strokeWidth={1} strokeDasharray="4,2" />
      <Line x1={C} y1={C} x2={px} y2={C} stroke={BLUE} strokeWidth={1} />
      <Circle cx={px} cy={py} r={3} fill={RED} />
      <PLabel x={C + 32} y={C - 8} text={radianLabel} size={9} />
      <PLabel x={(C + px) / 2 - 12} y={C + 14} text={cosText} />
      <PLabel x={px + 6} y={(C + py) / 2} text={sinText} />
    </Svg>
  );
}

function PdfVectors({ arrows, range }: Extract<PrecalcDiagramParams, { kind: "vectors" }>) {
  const R = Math.max(range, 1);
  const map = (x: number, y: number) => svgXY(x, y, -R, R, -R, R);
  const o = map(0, 0);
  const grid = [];
  for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
    const gx = map(g, 0), gy = map(0, g);
    grid.push(<Line key={`v${g}`} x1={gx.sx} y1={14} x2={gx.sx} y2={186} stroke={GRID} strokeWidth={0.5} />);
    grid.push(<Line key={`h${g}`} x1={14} y1={gy.sy} x2={186} y2={gy.sy} stroke={GRID} strokeWidth={0.5} />);
  }
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {grid}
      <Line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={AXIS} strokeWidth={1} />
      <Line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={AXIS} strokeWidth={1} />
      {arrows.map((a, i) => {
        const tip = map(a.dx, a.dy);
        const ang = Math.atan2(tip.sy - o.sy, tip.sx - o.sx);
        const color = ARROW_COLORS[a.color] ?? NAVY;
        return (
          <React.Fragment key={i}>
            <Line x1={o.sx} y1={o.sy} x2={tip.sx} y2={tip.sy} stroke={color} strokeWidth={1.8}
              strokeDasharray={a.dashed ? "5,3" : undefined} />
            <Polygon points={arrowHead(tip.sx, tip.sy, ang)} fill={color} />
            <PLabel x={tip.sx + 5} y={tip.sy - 4} text={a.label} size={10} fill={color} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function PdfTrigGraph({ fnType, a, b, c, d, xMin, xMax }: Extract<PrecalcDiagramParams, { kind: "trig-graph" }>) {
  const yMin = d - Math.abs(a) - 1;
  const yMax = d + Math.abs(a) + 1;
  const map = (x: number, y: number) => svgXY(x, y, xMin, xMax, yMin, yMax);
  const pts: { sx: number; sy: number }[] = [];
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = a * (fnType === "sin" ? Math.sin(b * (x - c)) : Math.cos(b * (x - c))) + d;
    pts.push(map(x, y));
  }
  const ticks = [];
  for (let k = Math.ceil((xMin / Math.PI) * 2); k <= Math.floor((xMax / Math.PI) * 2); k++) {
    const x = (k * Math.PI) / 2;
    const s = map(x, 0);
    ticks.push(
      <React.Fragment key={k}>
        <Line x1={s.sx} y1={map(0, yMin).sy} x2={s.sx} y2={map(0, yMax).sy} stroke={GRID} strokeWidth={0.5} />
        <PLabel x={s.sx - 6} y={map(0, 0).sy + 12} text={piTickLabel(k)} size={7} />
      </React.Fragment>
    );
  }
  const mid = map(0, d);
  const yAxis = xMin <= 0 && 0 <= xMax ? map(0, 0).sx : null;
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {ticks}
      <Line x1={14} y1={map(0, 0).sy} x2={186} y2={map(0, 0).sy} stroke={AXIS} strokeWidth={1} />
      {yAxis !== null && <Line x1={yAxis} y1={14} x2={yAxis} y2={186} stroke={AXIS} strokeWidth={1} />}
      <Line x1={14} y1={mid.sy} x2={186} y2={mid.sy} stroke={GOLD} strokeWidth={1} strokeDasharray="5,3" />
      <Path d={polyline(pts)} fill="none" stroke={BLUE} strokeWidth={1.8} />
    </Svg>
  );
}

function PdfConic(p: Extract<PrecalcDiagramParams, { kind: "conic" }>) {
  const R = Math.max(p.range, 1);
  const map = (x: number, y: number) => svgXY(x, y, -R, R, -R, R);
  const o = map(0, 0);
  const grid = [];
  for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
    const gx = map(g, 0), gy = map(0, g);
    grid.push(<Line key={`v${g}`} x1={gx.sx} y1={14} x2={gx.sx} y2={186} stroke={GRID} strokeWidth={0.5} />);
    grid.push(<Line key={`h${g}`} x1={14} y1={gy.sy} x2={186} y2={gy.sy} stroke={GRID} strokeWidth={0.5} />);
  }
  const { cx, cy, a, b } = p;
  let curve: React.ReactNode = null;
  if (p.conicType === "circle") {
    const c = map(cx, cy);
    const edge = map(cx + a, cy);
    curve = <Circle cx={c.sx} cy={c.sy} r={Math.abs(edge.sx - c.sx)} fill="none" stroke={BLUE} strokeWidth={1.8} />;
  } else if (p.conicType === "ellipse") {
    const c = map(cx, cy);
    const ex = map(cx + a, cy), ey = map(cx, cy + b);
    curve = <Ellipse cx={c.sx} cy={c.sy} rx={Math.abs(ex.sx - c.sx)} ry={Math.abs(ey.sy - c.sy)} fill="none" stroke={BLUE} strokeWidth={1.8} />;
  } else if (p.conicType === "parabola") {
    const fp = p.p ?? 1;
    const orient = p.orientation ?? "up";
    const runs: { sx: number; sy: number }[][] = [];
    let cur: { sx: number; sy: number }[] = [];
    const N = 120;
    const step = (2 * R) / N;
    let prevT = -Infinity;
    for (let i = 0; i <= N; i++) {
      const t = -R + step * i;
      let ok = false, pt = { sx: 0, sy: 0 };
      if (orient === "up" || orient === "down") {
        const y = ((t - cx) * (t - cx)) / (4 * fp) + cy;
        ok = y >= -R && y <= R;
        pt = map(t, y);
      } else {
        const x = ((t - cy) * (t - cy)) / (4 * fp) + cx;
        ok = x >= -R && x <= R;
        pt = map(x, t);
      }
      if (ok && (cur.length === 0 || Math.abs(t - prevT - step) < 1e-9)) cur.push(pt);
      else {
        if (cur.length > 1) runs.push(cur);
        cur = ok ? [pt] : [];
      }
      if (ok) prevT = t;
    }
    if (cur.length > 1) runs.push(cur);
    curve = <>{runs.map((r, i) => <Path key={i} d={polyline(r)} fill="none" stroke={BLUE} strokeWidth={1.8} />)}</>;
  } else {
    const runs: { sx: number; sy: number }[][] = [[], []];
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const y = -R + (2 * R * i) / N;
      const q = 1 + ((y - cy) / b) * ((y - cy) / b);
      const dx = a * Math.sqrt(q);
      runs[0].push(map(cx + dx, y));
      runs[1].push(map(cx - dx, y));
    }
    curve = <>{runs.map((r, i) => <Path key={i} d={polyline(r)} fill="none" stroke={BLUE} strokeWidth={1.8} />)}</>;
  }
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {grid}
      <Line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={AXIS} strokeWidth={1} />
      <Line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={AXIS} strokeWidth={1} />
      {curve}
      {(p.marks ?? []).map((m, i) => {
        const s = map(m.x, m.y);
        return (
          <React.Fragment key={i}>
            <Circle cx={s.sx} cy={s.sy} r={3} fill={RED} />
            <PLabel x={s.sx + 5} y={s.sy - 4} text={m.label} size={9} fill={RED} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function PdfPolarGrid({ points, rMax, curve }: Extract<PrecalcDiagramParams, { kind: "polar-grid" }>) {
  const C = 100;
  const scale = 80 / Math.max(rMax, 1);
  const toXY = (r: number, thetaDeg: number) => {
    const t = toRad(thetaDeg);
    return { x: C + r * scale * Math.cos(t), y: C - r * scale * Math.sin(t) };
  };
  const circles = [];
  for (let k = 1; k <= Math.floor(rMax); k++) {
    circles.push(<Circle key={k} cx={C} cy={C} r={k * scale} fill="none" stroke={GRID} strokeWidth={0.6} />);
  }
  const spokes = [];
  for (let dgr = 0; dgr < 360; dgr += 30) {
    const e = toXY(rMax, dgr);
    spokes.push(<Line key={dgr} x1={C} y1={C} x2={e.x} y2={e.y} stroke={GRID} strokeWidth={0.6} />);
  }
  let curvePath: string | null = null;
  if (curve) {
    const pts: string[] = [];
    for (let dgr = 0; dgr <= 360; dgr += 2) {
      const t = toRad(dgr);
      const r = curve.curveType === "circle" ? curve.a * Math.cos(t) : curve.a + curve.b * Math.cos(t);
      const q = toXY(r, dgr);
      pts.push(`${dgr === 0 ? "M" : "L"} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`);
    }
    curvePath = pts.join(" ");
  }
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {circles}
      {spokes}
      <Line x1={14} y1={C} x2={186} y2={C} stroke={AXIS} strokeWidth={1} />
      <Line x1={C} y1={186} x2={C} y2={14} stroke={AXIS} strokeWidth={1} />
      {curvePath && <Path d={curvePath} fill="none" stroke={BLUE} strokeWidth={1.8} />}
      {points.map((pt, i) => {
        const s = toXY(pt.r, pt.thetaDeg);
        return (
          <React.Fragment key={i}>
            <Circle cx={s.x} cy={s.y} r={3.5} fill={RED} />
            <PLabel x={s.x + 6} y={s.y - 4} text={pt.label} size={10} fill={RED} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function PdfLimitGraph({ segments, holes, dots, xRange, yRange }: Extract<PrecalcDiagramParams, { kind: "limit-graph" }>) {
  const map = (x: number, y: number) => svgXY(x, y, xRange[0], xRange[1], yRange[0], yRange[1]);
  const o = map(0, 0);
  const showXAxis = yRange[0] <= 0 && 0 <= yRange[1];
  const showYAxis = xRange[0] <= 0 && 0 <= xRange[1];
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {showXAxis && <Line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={AXIS} strokeWidth={1} />}
      {showYAxis && <Line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={AXIS} strokeWidth={1} />}
      {segments.map((s, i) => {
        const p1 = map(s.x1, s.y1), p2 = map(s.x2, s.y2);
        return <Line key={i} x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} stroke={BLUE} strokeWidth={2} />;
      })}
      {holes.map((h, i) => {
        const p = map(h.x, h.y);
        return <Circle key={`h${i}`} cx={p.sx} cy={p.sy} r={4} fill="#ffffff" stroke={BLUE} strokeWidth={2} />;
      })}
      {dots.map((dt, i) => {
        const p = map(dt.x, dt.y);
        return <Circle key={`d${i}`} cx={p.sx} cy={p.sy} r={4} fill={BLUE} />;
      })}
    </Svg>
  );
}

function PdfComplexPlane({ points, range }: Extract<PrecalcDiagramParams, { kind: "complex-plane" }>) {
  const R = Math.max(range, 1);
  const map = (x: number, y: number) => svgXY(x, y, -R, R, -R, R);
  const o = map(0, 0);
  const grid = [];
  for (let g = -Math.floor(R); g <= Math.floor(R); g++) {
    const gx = map(g, 0), gy = map(0, g);
    grid.push(<Line key={`v${g}`} x1={gx.sx} y1={14} x2={gx.sx} y2={186} stroke={GRID} strokeWidth={0.5} />);
    grid.push(<Line key={`h${g}`} x1={14} y1={gy.sy} x2={186} y2={gy.sy} stroke={GRID} strokeWidth={0.5} />);
  }
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {grid}
      <Line x1={14} y1={o.sy} x2={186} y2={o.sy} stroke={NAVY} strokeWidth={1.2} />
      <Line x1={o.sx} y1={186} x2={o.sx} y2={14} stroke={NAVY} strokeWidth={1.2} />
      <PLabel x={182} y={o.sy - 4} text="Re" size={9} />
      <PLabel x={o.sx + 4} y={12} text="Im" size={9} />
      {points.map((pt, i) => {
        const s = map(pt.re, pt.im);
        return (
          <React.Fragment key={i}>
            <Circle cx={s.sx} cy={s.sy} r={3.5} fill={RED} />
            <PLabel x={s.sx + 6} y={s.sy - 4} text={pt.label} size={10} fill={RED} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** PDF renderer: switch on diagram kind. */
export function PrecalcPdfSVG({ params }: { params: PrecalcDiagramParams }) {
  switch (params.kind) {
    case "unit-circle": return <PdfUnitCircle {...params} />;
    case "vectors": return <PdfVectors {...params} />;
    case "trig-graph": return <PdfTrigGraph {...params} />;
    case "conic": return <PdfConic {...params} />;
    case "polar-grid": return <PdfPolarGrid {...params} />;
    case "limit-graph": return <PdfLimitGraph {...params} />;
    case "complex-plane": return <PdfComplexPlane {...params} />;
    default: return null;
  }
}

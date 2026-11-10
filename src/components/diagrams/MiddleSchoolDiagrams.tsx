"use client";
// MiddleSchoolDiagrams.tsx
// Web (HTML/SVG) diagram renderers for the middle-school area: number lines,
// coordinate grids, spinners, geometric figures, and scatter plots.
// Every kind here has a matching PDF renderer in PdfMiddleSchoolDiagrams.tsx.

import React from "react";
import { layoutGridPointLabels, polygonEdges, baselineY, layoutRightTriangle, rightTriangleFromDims, type Seg } from "@/lib/labelPlacement";
import type {
  MiddleSchoolSVGParams,
  MSNumberLineParams,
  MSCoordinateGridParams,
  MSSpinnerParams,
  MSGeometryFigureParams,
  MSScatterPlotParams,
  MSBarModelParams,
} from "@/lib/factories/MiddleSchoolTypes";

const INK = "#111111";
const ACCENT = "#2563eb";
const RED = "#e11d48";

// ── Number line ───────────────────────────────────────────────────────────────

function MSNumberLineSVG(p: MSNumberLineParams) {
  const W = 200;
  const H = 64;
  const pad = 14;
  const span = p.max - p.min || 1;
  const x = (v: number) => pad + ((v - p.min) / span) * (W - 2 * pad);
  const yMid = 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="200" height="64" role="img" aria-label="number line">
      <line x1={pad - 6} y1={yMid} x2={W - pad + 6} y2={yMid} stroke={INK} strokeWidth={1.5} />
      <polygon points={`${pad - 6},${yMid - 4} ${pad - 6},${yMid + 4} ${pad - 12},${yMid}`} fill={INK} />
      <polygon points={`${W - pad + 6},${yMid - 4} ${W - pad + 6},${yMid + 4} ${W - pad + 12},${yMid}`} fill={INK} />
      {p.marks.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={yMid - 5} x2={x(v)} y2={yMid + 5} stroke={INK} strokeWidth={1} />
          <text x={x(v)} y={yMid + 18} textAnchor="middle" fontSize={9} fill={INK} fontFamily="serif">
            {v}
          </text>
        </g>
      ))}
      {p.highlight.map((v) => (
        <circle key={`h${v}`} cx={x(v)} cy={yMid} r={4} fill={RED} />
      ))}
      {(p.openHighlight ?? []).map((v) => (
        <circle key={`o${v}`} cx={x(v)} cy={yMid} r={4} fill="#fff" stroke={RED} strokeWidth={2} />
      ))}
      {p.ray && (
        <g>
          <line
            x1={x(p.ray.from)}
            y1={yMid}
            x2={p.ray.dir === "right" ? W - pad + 2 : pad - 2}
            y2={yMid}
            stroke={ACCENT}
            strokeWidth={3}
          />
          <circle
            cx={x(p.ray.from)}
            cy={yMid}
            r={4.5}
            fill={p.ray.open ? "#fff" : ACCENT}
            stroke={ACCENT}
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  );
}

// ── Coordinate grid ───────────────────────────────────────────────────────────

function MSCoordinateGridSVG(p: MSCoordinateGridParams) {
  const W = 200;
  const H = 200;
  const pad = 16;
  // Seeded presentation variant (0-7): marker style, dash pattern, polygon
  // label placement. Coordinates, labels, and segments are never altered.
  const v = p.variant ?? 0;
  const markerStyle = v % 3; // 0: filled disc, 1: ring, 2: square
  const DASHES = ["5,3", "3,3", "8,3", "2,2"];
  const dashFor = (dashed: boolean | undefined, salt = 0) =>
    dashed ? DASHES[(v + salt) % DASHES.length] : undefined;
  const polyLabelPos = v % 3;
  const spanX = p.maxX - p.minX || 1;
  const spanY = p.maxY - p.minY || 1;
  const X = (v: number) => pad + ((v - p.minX) / spanX) * (W - 2 * pad);
  const Y = (v: number) => H - pad - ((v - p.minY) / spanY) * (H - 2 * pad);
  const vLines = [];
  for (let gx = Math.ceil(p.minX); gx <= p.maxX; gx++) {
    vLines.push(
      <line key={`v${gx}`} x1={X(gx)} y1={pad} x2={X(gx)} y2={H - pad}
        stroke={gx === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={gx === 0 ? 1.2 : 0.6} />
    );
  }
  const hLines = [];
  for (let gy = Math.ceil(p.minY); gy <= p.maxY; gy++) {
    hLines.push(
      <line key={`h${gy}`} x1={pad} y1={Y(gy)} x2={W - pad} y2={Y(gy)}
        stroke={gy === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={gy === 0 ? 1.2 : 0.6} />
    );
  }
  // Point labels go where they touch no segment, edge, axis or other label.
  const ptLabels = layoutGridPointLabels({
    points: (p.points ?? []).map((pt) => ({ at: { x: X(pt.x), y: Y(pt.y) }, text: pt.label ?? "" })),
    lines: [
      ...(p.segments ?? []).map((sg) => [{ x: X(sg.x1), y: Y(sg.y1) }, { x: X(sg.x2), y: Y(sg.y2) }] as Seg),
      ...(p.polygons ?? []).flatMap((poly) =>
        polygonEdges(poly.points.map((q) => ({ x: X(q.x), y: Y(q.y) })))),
    ],
    axes: [
      ...(p.minX <= 0 && p.maxX >= 0 ? [[{ x: X(0), y: pad }, { x: X(0), y: H - pad }] as Seg] : []),
      ...(p.minY <= 0 && p.maxY >= 0 ? [[{ x: pad, y: Y(0) }, { x: W - pad, y: Y(0) }] as Seg] : []),
    ],
    bounds: { x0: 0, y0: 0, x1: W, y1: H },
    fontSize: 10,
    widthScale: 1.15,
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="200" height="200" role="img" aria-label="coordinate grid">
      {vLines}
      {hLines}
      {(p.polygons ?? []).map((poly, i) => (
        <g key={`poly${i}`}>
          <polygon
            points={poly.points.map((pt) => `${X(pt.x)},${Y(pt.y)}`).join(" ")}
            fill="rgba(37,99,235,0.12)"
            stroke={poly.dashed ? RED : ACCENT}
            strokeWidth={1.5}
            strokeDasharray={dashFor(poly.dashed, 1)}
          />
          {poly.label && (
            <text
              x={X(poly.points[0].x) + (polyLabelPos === 1 ? 8 : 0)}
              y={Y(poly.points[0].y) + (polyLabelPos === 0 ? -6 : polyLabelPos === 2 ? 14 : 3)}
              fontSize={10} fill={INK} fontFamily="serif" fontWeight="bold">
              {poly.label}
            </text>
          )}
        </g>
      ))}
      {(p.segments ?? []).map((sg, i) => (
        <line key={`seg${i}`} x1={X(sg.x1)} y1={Y(sg.y1)} x2={X(sg.x2)} y2={Y(sg.y2)}
          stroke="#b45309" strokeWidth={1.6} strokeDasharray={dashFor(sg.dashed, 2)} />
      ))}
      {(p.points ?? []).map((pt, i) => (
        <g key={`pt${i}`}>
          {markerStyle === 2 ? (
            <rect x={X(pt.x) - 3.5} y={Y(pt.y) - 3.5} width={7} height={7}
              fill={pt.filled === false ? "#fff" : INK} stroke={INK} strokeWidth={1.5} />
          ) : (
            <circle cx={X(pt.x)} cy={Y(pt.y)} r={4}
              fill={markerStyle === 1 || pt.filled === false ? "#fff" : INK}
              stroke={INK} strokeWidth={markerStyle === 1 ? 2.2 : 1.5} />
          )}
          {pt.label && ptLabels[i] && (
            <text x={ptLabels[i]!.x} y={baselineY(ptLabels[i]!.y, 10)} textAnchor="middle" fontSize={10} fill={INK} fontFamily="serif" fontWeight="bold">
              {pt.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

const SPINNER_DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#f97316", "#14b8a6", "#f43f5e"];

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function MSSpinnerSVG(p: MSSpinnerParams) {
  const C = 100;
  const R = 78;
  const n = p.sectors.length;
  const colors = p.colors && p.colors.length >= n ? p.colors : SPINNER_DEFAULT_COLORS;
  const step = 360 / n;
  // Seeded presentation variant (0-7): rigid rotation; probabilities unchanged.
  const rot = ((p.variant ?? 0) % 8) * (step / 8);
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="spinner">
      {p.sectors.map((label, i) => {
        const a0 = i * step + rot;
        const a1 = (i + 1) * step + rot;
        const s = polar(C, C, R, a0);
        const e = polar(C, C, R, a1);
        const large = step > 180 ? 1 : 0;
        const mid = polar(C, C, R * 0.62, (a0 + a1) / 2);
        return (
          <g key={i}>
            <path
              d={`M ${C} ${C} L ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} Z`}
              fill={colors[i % colors.length]}
              fillOpacity={0.75}
              stroke={INK}
              strokeWidth={1.2}
            />
            <text x={mid.x} y={mid.y + 4} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#fff"
              fontFamily="serif" stroke={INK} strokeWidth={0.4}>
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={7} fill={INK} />
      <circle cx={C} cy={C} r={2.5} fill="#fff" />
    </svg>
  );
}

// ── Geometric figures ─────────────────────────────────────────────────────────

function MSGeometryFigureSVG(p: MSGeometryFigureParams) {
  const W = 200;
  const H = 170;
  const d = p.dims;
  const label = (x: number, y: number, text: string, anchor: "middle" | "start" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} fontSize={11} fill={INK} fontFamily="serif" fontWeight="bold">
      {text}
    </text>
  );
  // Seeded presentation variant (0-7). Changes ONLY how the figure is drawn
  // (orientation, skew, scale, rotation, layout), dims and math are untouched.
  const v = p.variant ?? 0;
  // Rotate a screen-space offset vector by k quarter-turns (clockwise visually).
  const rot2 = (dx: number, dy: number, k: number) => {
    const q = ((k % 4) + 4) % 4;
    const c = [1, 0, -1, 0][q];
    const sn = [0, 1, 0, -1][q];
    return { x: dx * c - dy * sn, y: dx * sn + dy * c };
  };

  switch (p.figure) {
    case "parallelogram": {
      const base = d.base ?? 8;
      const height = d.height ?? 5;
      // Variant: lean direction (left/right) and skew amount (shallow/steep).
      const skewDir = v % 2 === 0 ? 1 : -1;
      const skew = (v % 4 < 2 ? 28 : 46) * skewDir;
      const y1 = 120, y0 = y1 - (v % 8 < 4 ? 80 : 64);
      // Shift/shrink so all four corners stay inside the 200-wide frame.
      const x0 = skew >= 0 ? 40 : 40 - skew;
      const x1 = x0 + 120 + (skew < 0 ? skew : 0);
      const altX = skew >= 0 ? x0 + skew : x1 + skew;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0 + skew},${y0} ${x1 + skew},${y0} ${x1},${y1} ${x0},${y1}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={altX} y1={y0} x2={altX} y2={y1} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label((x0 + x1) / 2 + skew / 2, y1 + 14, `${base}`)}
          {label(14, 22, `base = ${base}, height = ${height}`, "start")}
          {label(altX + (skew >= 0 ? -10 : 4), (y0 + y1) / 2, `${height}`, "start")}
        </svg>
      );
    }
    case "triangle": {
      const base = d.base ?? 8;
      const height = d.height ?? 5;
      // Variant: apex slides along the top (6 positions).
      const apexX = 60 + (v % 6) * 16;
      const x0 = 40, x1 = 160, yb = 130, yt = 50;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0},${yb} ${x1},${yb} ${apexX},${yt}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={apexX} y1={yt} x2={apexX} y2={yb} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label((x0 + x1) / 2, yb + 14, `${base}`)}
          {label(apexX + 8, (yt + yb) / 2, `${height}`)}
        </svg>
      );
    }
    case "right-triangle": {
      const FONT = 11;
      const lay = layoutRightTriangle(rightTriangleFromDims(d, v), { width: W, height: H, pad: 34 }, { fontSize: FONT, widthScale: 1.15, arcR: 20, markSize: 11 });
      const [R, B, T] = lay.points;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label="right triangle">
          <polygon points={`${R.x},${R.y} ${B.x},${B.y} ${T.x},${T.y}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <path d={lay.rightMark} fill="none" stroke={INK} strokeWidth={1.2} />
          {lay.arcs.map((a, i) => <path key={`arc${i}`} d={a} fill="none" stroke={INK} strokeWidth={1.2} />)}
          {lay.leaders.map(([a, b], i) => <line key={`ld${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={0.6} />)}
          {lay.labels.map((l, i) => (
            <text key={i} x={l.center.x} y={baselineY(l.center.y, FONT)} textAnchor="middle" fontSize={FONT} fill={INK} fontFamily="serif" fontWeight="bold">
              {l.text}
            </text>
          ))}
        </svg>
      );
    }
    case "trapezoid": {
      const b1 = d.base1 ?? 10;
      const b2 = d.base2 ?? 6;
      const h = d.height ?? 4;
      const cx = 100, yb = 130, yt = 55;
      const w1 = 65, w2 = 38;
      // Variant: isosceles (0), right trapezoid with vertical left leg (1),
      // right trapezoid with vertical right leg (2). Area formula unchanged.
      const t = v % 3;
      const pts =
        t === 1
          ? `${cx - w2},${yt} ${cx + w2},${yt} ${cx + w1},${yb} ${cx - w2},${yb}`
          : t === 2
            ? `${cx - w2},${yt} ${cx + w2},${yt} ${cx + w2},${yb} ${cx - w1},${yb}`
            : `${cx - w2},${yt} ${cx + w2},${yt} ${cx + w1},${yb} ${cx - w1},${yb}`;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={pts}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={cx + w2 + 6} y1={yt} x2={cx + w2 + 6} y2={yb} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label(cx, yb + 14, `${b1}`)}
          {label(cx, yt - 10, `${b2}`)}
          {label(cx + w2 + 12, (yt + yb) / 2, `${h}`)}
        </svg>
      );
    }
    case "rectangle": {
      const l = d.length ?? d.base ?? 8;
      const w = d.width ?? d.height ?? 5;
      // Variant: 4 drawn shapes (landscape, portrait, wide, tall).
      const r4 = v % 4;
      const rd = [
        { x: 45, y: 45, w: 110, h: 80 },
        { x: 60, y: 30, w: 80, h: 110 },
        { x: 35, y: 52, w: 130, h: 65 },
        { x: 67, y: 20, w: 65, h: 130 },
      ][r4];
      const rx = rd.x, ry = rd.y, rw = rd.w, rh = rd.h;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <rect x={rx} y={ry} width={rw} height={rh} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(rx + rw / 2, ry + rh + 15, `${l}`)}
          {label(rx + rw + 8, ry + rh / 2, `${w}`)}
        </svg>
      );
    }
    case "rectangular-prism": {
      const l = d.length ?? 5;
      const w = d.width ?? 4;
      const h = d.height ?? 3;
      // Variant: 24 states, depth dir (2) x proportions (3) x height (2) x depth len (2).
      const pi = v % 24;
      const dir = pi % 2 === 0 ? 1 : -1;
      const sz = Math.floor(pi / 2) % 3;
      const fw = [80, 95, 68][sz], fh = [55, 48, 62][sz];
      const y0 = Math.floor(pi / 6) % 2 === 0 ? 120 : 106;
      const dep = (Math.floor(pi / 12) % 2 === 0 ? 26 : 17) * dir;
      const x0 = dir > 0 ? 55 : 75;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0},${y0} ${x0 + fw},${y0} ${x0 + fw},${y0 - fh} ${x0},${y0 - fh}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${x0 + fw},${y0} ${x0 + fw + dep},${y0 - dep} ${x0 + fw + dep},${y0 - dep - fh} ${x0 + fw},${y0 - fh}`}
            fill={ACCENT} fillOpacity={0.05} stroke={INK} strokeWidth={1.2} />
          <polygon points={`${x0},${y0 - fh} ${x0 + fw},${y0 - fh} ${x0 + fw + dep},${y0 - dep - fh} ${x0 + dep},${y0 - dep - fh}`}
            fill={ACCENT} fillOpacity={0.05} stroke={INK} strokeWidth={1.2} />
          {label(x0 + fw / 2, y0 + 14, `${l}`)}
          {label(x0 + fw + dep + (dir > 0 ? 2 : -10), y0 - dep / 2, `${w}`)}
          {label(x0 - 14, y0 - fh / 2, `${h}`)}
        </svg>
      );
    }
    case "cylinder": {
      const r = d.radius ?? 3;
      const h = d.height ?? 6;
      // Variant: 8 states, scale (2) x horizontal pos (2) x height (2).
      const c8 = v % 8;
      const s = c8 % 2 === 0 ? 1 : 0.8;
      const cx = c8 % 4 < 2 ? 100 : 88, ry = 14 * s, hw = 55 * s;
      const yTop = 45, yBot = yTop + (c8 < 4 ? 80 : 64);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <path d={`M ${cx - hw} ${yTop} L ${cx - hw} ${yBot} A ${hw} ${ry} 0 0 0 ${cx + hw} ${yBot} L ${cx + hw} ${yTop}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <ellipse cx={cx} cy={yTop} rx={hw} ry={ry} fill={ACCENT} fillOpacity={0.16} stroke={INK} strokeWidth={1.6} />
          {label(cx + hw + 5, (yTop + yBot) / 2, `${h}`)}
          {label(cx, yTop - 22, `r = ${r}`)}
        </svg>
      );
    }
    case "cone": {
      const r = d.radius ?? 3;
      const h = d.height ?? 6;
      // Variant: 8 states, scale (2) x horizontal pos (2) x height (2).
      const c8 = v % 8;
      const s = c8 % 2 === 0 ? 1 : 0.8;
      const cx = c8 % 4 < 2 ? 100 : 88, apexY = 35, ry = 12 * s, hw = 55 * s;
      const baseY = apexY + (c8 < 4 ? 90 : 72);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${cx},${apexY} ${cx - hw},${baseY} ${cx + hw},${baseY}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <ellipse cx={cx} cy={baseY} rx={hw} ry={ry} fill={ACCENT} fillOpacity={0.16} stroke={INK} strokeWidth={1.4} />
          <line x1={cx} y1={apexY} x2={cx} y2={baseY} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label(cx + 6, (apexY + baseY) / 2, `${h}`)}
          {label(cx, baseY + 24, `r = ${r}`)}
        </svg>
      );
    }
    case "sphere": {
      const r = d.radius ?? 4;
      const cx = 100, cy = 85, R = 55;
      // Variant: radius indicator drawn at 8 different angles.
      const a = ((v % 8) * 45 * Math.PI) / 180;
      const ex = cx + R * 0.7 * Math.cos(a), ey = cy - R * 0.7 * Math.sin(a);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <circle cx={cx} cy={cy} r={R} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.32} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4,2" />
          <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={INK} strokeWidth={1.2} />
          {label((cx + ex) / 2, (cy + ey) / 2 - 10, `r = ${r}`)}
        </svg>
      );
    }
    case "circle": {
      // Variant: 16 states, radius indicator angle (8) x drawn size (2).
      const R = v % 2 === 0 ? 58 : 48;
      const cx = 100, cy = 85;
      const a = ((Math.floor(v / 2) % 8) * 45 * Math.PI) / 180;
      const ex = cx + R * Math.cos(a), ey = cy - R * Math.sin(a);
      const mx = (cx + ex) / 2, my = (cy + ey) / 2;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <circle cx={cx} cy={cy} r={R} fill={ACCENT} fillOpacity={0.08} stroke={INK} strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={2.5} fill={INK} />
          <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={INK} strokeWidth={1.2} />
          {d.radius !== undefined && label(mx, my - 10, `r = ${d.radius}`)}
          {d.diameter !== undefined && label(cx, cy + 10, `d = ${d.diameter}`)}
        </svg>
      );
    }
    case "angle-single": {
      const ang = d.angle ?? 60;
      const vx = 100, vy = 85, len = 68;
      // Variant: rotate the whole diagram by quarter turns around the vertex.
      const k = v % 4;
      const r1 = rot2(len, 0, k);
      const aRad = ((360 - ang) * Math.PI) / 180;
      const r2 = rot2(len * Math.cos(aRad), len * Math.sin(aRad), k);
      // Print polish: rays as one joined path (clean vertex), ink marks only,
      // a square mark instead of an arc for a right angle, and the measure
      // label riding the angle bisector (arc grows for narrow angles).
      const arcR = ang < 30 ? 34 : 26;
      const arc1 = rot2(arcR, 0, k);
      const arc2 = rot2(arcR * Math.cos(aRad), arcR * Math.sin(aRad), k);
      const half = (ang / 2) * (Math.PI / 180);
      // Narrow angles cannot fit the label inside the wedge, so it sits
      // just outside the second ray. Wider angles ride the bisector.
      const out = ((ang + 24) * Math.PI) / 180;
      const lp = ang < 30
        ? rot2(46 * Math.cos(out), -46 * Math.sin(out), k)
        : rot2(48 * Math.cos(half), -48 * Math.sin(half), k);
      const sq1 = rot2(14, 0, k), sq2 = rot2(14, -14, k), sq3 = rot2(0, -14, k);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <path d={`M ${vx + r1.x} ${vy + r1.y} L ${vx} ${vy} L ${vx + r2.x} ${vy + r2.y}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          {ang === 90 ? (
            <path d={`M ${vx + sq1.x} ${vy + sq1.y} L ${vx + sq2.x} ${vy + sq2.y} L ${vx + sq3.x} ${vy + sq3.y}`} fill="none" stroke={INK} strokeWidth={1.3} />
          ) : (
            <path d={`M ${vx + arc1.x} ${vy + arc1.y} A ${arcR} ${arcR} 0 0 0 ${vx + arc2.x} ${vy + arc2.y}`} fill="none" stroke={INK} strokeWidth={1.3} />
          )}
          {label(vx + lp.x, vy + lp.y, `${ang}°`)}
        </svg>
      );
    }
    case "angle-complementary": {
      const known = d.angle ?? 35;
      const vx = 100, vy = 85;
      const k = v % 4;
      const rBase = rot2(68, 0, k);
      const rVert = rot2(0, -68, k);
      const kRad = ((360 - known) * Math.PI) / 180;
      const rKnown = rot2(64 * Math.cos(kRad), 64 * Math.sin(kRad), k);
      // Labels ride the bisector of each sub-angle; divider ray is ink like
      // every other ray (no accent color in print figures).
      const b1 = (known / 2) * (Math.PI / 180);
      const l1 = rot2(44 * Math.cos(b1), -44 * Math.sin(b1), k);
      const m2 = ((known + 90) / 2) * (Math.PI / 180);
      const l2 = rot2(44 * Math.cos(m2), -44 * Math.sin(m2), k);
      const sq1 = rot2(12, 0, k), sq2 = rot2(12, -12, k), sq3 = rot2(0, -12, k);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <path d={`M ${vx + rBase.x} ${vy + rBase.y} L ${vx} ${vy} L ${vx + rVert.x} ${vy + rVert.y}`} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <line x1={vx} y1={vy} x2={vx + rKnown.x} y2={vy + rKnown.y} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          <path d={`M ${vx + sq1.x} ${vy + sq1.y} L ${vx + sq2.x} ${vy + sq2.y} L ${vx + sq3.x} ${vy + sq3.y}`} fill="none" stroke={INK} strokeWidth={1.2} />
          {label(vx + l1.x, vy + l1.y, `${known}°`)}
          {label(vx + l2.x, vy + l2.y, "?")}
        </svg>
      );
    }
    case "angle-supplementary": {
      const known = d.angle ?? 120;
      const vx = 100, vy = 85;
      const k = v % 4;
      const rL = rot2(-68, 0, k);
      const rR = rot2(68, 0, k);
      const kRad = ((180 - known) * Math.PI) / 180;
      const rK = rot2(64 * Math.cos(kRad), -64 * Math.sin(kRad), k);
      // Labels ride the bisector of each region (known on the left of the
      // divider, unknown on the right); divider ray is ink, not accent.
      const nrm = (x: number, y: number) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
      const du = { x: Math.cos(kRad), y: -Math.sin(kRad) };
      const bk = nrm(du.x - 1, du.y);
      const bu = nrm(du.x + 1, du.y);
      const l1 = rot2(46 * bk.x, 46 * bk.y, k);
      const l2 = rot2(46 * bu.x, 46 * bu.y, k);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <line x1={vx + rL.x} y1={vy + rL.y} x2={vx + rR.x} y2={vy + rR.y} stroke={INK} strokeWidth={1.6} />
          <line x1={vx} y1={vy} x2={vx + rK.x} y2={vy + rK.y} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          {label(vx + l1.x, vy + l1.y, `${known}°`)}
          {label(vx + l2.x, vy + l2.y, "?")}
        </svg>
      );
    }
    case "angle-vertical": {
      const known = d.angle ?? 60;
      const cx = 100, cy = 90, len = 70;
      const k = v % 4;
      const rad = ((known / 2) * Math.PI) / 180;
      const d1 = rot2(len * Math.cos(rad), len * Math.sin(rad), k);
      const d2 = rot2(len * Math.cos(rad), -len * Math.sin(rad), k);
      // Labels centered on the bisector of each vertical region, clear of
      // the lines (farther out when the known wedge is narrow).
      const lr = known < 40 ? 54 : 46;
      const l1 = rot2(lr, 0, k);
      const l2 = rot2(-lr, 0, k);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <line x1={cx - d1.x} y1={cy - d1.y} x2={cx + d1.x} y2={cy + d1.y} stroke={INK} strokeWidth={1.6} />
          <line x1={cx - d2.x} y1={cy - d2.y} x2={cx + d2.x} y2={cy + d2.y} stroke={INK} strokeWidth={1.6} />
          {label(cx + l1.x, cy + l1.y, `${known}°`)}
          {label(cx + l2.x, cy + l2.y, "?")}
        </svg>
      );
    }
    case "composite": {
      const w1 = d.w1 ?? 10, h1 = d.h1 ?? 5, w2 = d.w2 ?? 5, h2 = d.h2 ?? 4;
      const s = Math.min(120 / w1, 60 / h1, 100 / w2, 50 / h2);
      const bw = w1 * s, bh = h1 * s, tw = w2 * s, th = h2 * s;
      // Variant: 4 states, mirror (2) x vertical position (2).
      const mirror = v % 2 === 1;
      const mx = (x: number) => (mirror ? 200 - x : x);
      const x0 = (200 - bw) / 2, yb = v % 4 < 2 ? 135 : 122;
      const tx0 = x0 + (bw - tw) / 2;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <rect x={Math.min(mx(x0), mx(x0 + bw))} y={yb - bh} width={bw} height={bh} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <rect x={Math.min(mx(tx0), mx(tx0 + tw))} y={yb - bh - th} width={tw} height={th} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(mx(x0 + bw / 2), yb + 13, `${w1}`)}
          {label(mx(x0) + (mirror ? 12 : -12), yb - bh / 2, `${h1}`)}
          {label(mx(tx0 + tw / 2), yb - bh - th - 9, `${w2}`)}
          {label(mx(tx0 + tw) + (mirror ? -4 : 4), yb - bh - th / 2, `${h2}`)}
        </svg>
      );
    }
    case "composite-stack": {
      const w = d.w ?? 8, triH = d.triH ?? 5, rectH = d.rectH ?? 6, trapH = d.trapH ?? 4, trapB = d.trapB ?? 12;
      const s = Math.min(118 / trapB, 108 / (triH + rectH + trapH));
      const cx = 100, yb = 152;
      const tw = w * s, bw = trapB * s, thp = trapH * s, rhp = rectH * s, trhp = triH * s;
      const yTrapTop = yb - thp, yRectTop = yTrapTop - rhp, yApex = yRectTop - trhp;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${cx - bw / 2},${yb} ${cx + bw / 2},${yb} ${cx + tw / 2},${yTrapTop} ${cx - tw / 2},${yTrapTop}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <rect x={cx - tw / 2} y={yRectTop} width={tw} height={rhp} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${cx - tw / 2},${yRectTop} ${cx + tw / 2},${yRectTop} ${cx},${yApex}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={cx - tw / 2} y1={yTrapTop} x2={cx + tw / 2} y2={yTrapTop} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          <line x1={cx - tw / 2} y1={yRectTop} x2={cx + tw / 2} y2={yRectTop} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(cx, yRectTop + 12, `${w}`)}
          {label(cx - tw / 2 - 8, (yRectTop + yApex) / 2 + 3, `${triH}`)}
          {label(cx + tw / 2 + 9, (yTrapTop + yRectTop) / 2 + 3, `${rectH}`)}
          {label(cx + bw / 2 + 9, (yb + yTrapTop) / 2 + 3, `${trapH}`)}
          {label(cx, yb + 13, `${trapB}`)}
        </svg>
      );
    }
    case "composite-medallion": {
      const w = d.w ?? 6, h = d.h ?? 4, tv = d.tv ?? 3, th = d.th ?? 3;
      const s = Math.min(118 / (w + 2 * th), 106 / (h + 2 * tv));
      const cx = 100, cy = 86;
      const rw = w * s, rh = h * s, rx = cx - rw / 2, ry = cy - rh / 2;
      const tvp = tv * s, thp = th * s;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <rect x={rx} y={ry} width={rw} height={rh} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${rx},${ry} ${rx + rw},${ry} ${cx},${ry - tvp}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${rx},${ry + rh} ${rx + rw},${ry + rh} ${cx},${ry + rh + tvp}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${rx},${ry} ${rx},${ry + rh} ${rx - thp},${cy}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${rx + rw},${ry} ${rx + rw},${ry + rh} ${rx + rw + thp},${cy}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(cx, ry + 12, `${w}`)}
          {label(rx + 10, cy + 3, `${h}`)}
          {label(cx, ry - tvp - 5, `${tv}`)}
          {label(rx - thp - 3, cy + 3, `${th}`)}
        </svg>
      );
    }
    case "composite-flag": {
      const w = d.w ?? 10, h = d.h ?? 6, bite = d.bite ?? 3;
      const s = Math.min(120 / w, 100 / h);
      const ws = w * s, hs = h * s;
      const x0 = (200 - ws) / 2, yt = (170 - hs) / 2 - 6, mid = yt + hs / 2;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0},${yt} ${x0 + ws},${yt} ${x0 + ws - bite * s},${mid} ${x0 + ws},${yt + hs} ${x0},${yt + hs}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={x0 + ws - bite * s} y1={mid} x2={x0 + ws} y2={mid} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(100, yt + hs + 13, `${w}`)}
          {label(x0 - 10, mid + 3, `${h}`)}
          {label(x0 + ws - (bite * s) / 2, mid - 7, `${bite}`)}
        </svg>
      );
    }
    case "composite-corner-circle": {
      const w = d.w ?? 12, h = d.h ?? 10, r = d.r ?? 4;
      const s = Math.min(120 / w, 100 / h);
      const ws = w * s, hs = h * s;
      const x0 = (200 - ws) / 2, yt = (170 - hs) / 2 - 6;
      const rp = r * s, xr = x0 + ws, yb2 = yt + hs;
      const dAttr = `M ${x0} ${yb2} L ${x0} ${yt} L ${xr - rp} ${yt} A ${rp} ${rp} 0 0 0 ${xr} ${yt + rp} L ${xr} ${yb2} Z`;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <path d={dAttr} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={xr} y1={yt} x2={xr - rp} y2={yt} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          <line x1={xr} y1={yt} x2={xr} y2={yt + rp} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(100, yb2 + 13, `${w}`)}
          {label(x0 - 10, yt + hs / 2 + 3, `${h}`)}
          {label(xr - rp - 4, yt + rp + 11, `${r}`)}
        </svg>
      );
    }
    case "composite-house": {
      const w = d.w ?? 8, wallH = d.wallH ?? 4, roofH = d.roofH ?? 3;
      const s = Math.min(120 / w, 105 / (wallH + roofH));
      const cx = 100, yb = 150;
      const ws = w * s, whp = wallH * s, rhp = roofH * s;
      const yWallTop = yb - whp, yApex = yWallTop - rhp;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <rect x={cx - ws / 2} y={yWallTop} width={ws} height={whp} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${cx - ws / 2},${yWallTop} ${cx + ws / 2},${yWallTop} ${cx},${yApex}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={cx - ws / 2} y1={yWallTop} x2={cx + ws / 2} y2={yWallTop} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(cx, yb + 13, `${w}`)}
          {label(cx + ws / 2 + 9, (yWallTop + yb) / 2 + 3, `${wallH}`)}
          {label(cx - ws / 2 - 8, (yWallTop + yApex) / 2 + 3, `${roofH}`)}
        </svg>
      );
    }
    case "composite-kite": {
      const b = d.b ?? 8, h1 = d.h1 ?? 4, h2 = d.h2 ?? 3;
      const s = Math.min(118 / b, 106 / (h1 + h2));
      const cx = 100, totalH = (h1 + h2) * s;
      const yTop = (170 - totalH) / 2, yBase = yTop + h1 * s;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${cx - (b * s) / 2},${yBase} ${cx},${yTop} ${cx + (b * s) / 2},${yBase} ${cx},${yTop + totalH}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={cx - (b * s) / 2} y1={yBase} x2={cx + (b * s) / 2} y2={yBase} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(cx, yBase + 13, `${b}`)}
          {label(cx - (b * s) / 4 - 6, (yTop + yBase) / 2 + 3, `${h1}`)}
          {label(cx - (b * s) / 4 - 6, (yBase + yTop + totalH) / 2 + 3, `${h2}`)}
        </svg>
      );
    }
    case "composite-arrow": {
      const shaftL = d.shaftL ?? 8, shaftH = d.shaftH ?? 3, headBase = d.headBase ?? 7, headLen = d.headLen ?? 4;
      const L = shaftL + headLen;
      const s = Math.min(128 / L, 100 / headBase);
      const cy = 84, x0 = (200 - L * s) / 2;
      const shP = shaftH * s, hbP = headBase * s, slP = shaftL * s, hlP = headLen * s;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0},${cy - shP / 2} ${x0 + slP},${cy - shP / 2} ${x0 + slP},${cy - hbP / 2} ${x0 + L * s},${cy} ${x0 + slP},${cy + hbP / 2} ${x0 + slP},${cy + shP / 2} ${x0},${cy + shP / 2}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={x0 + slP} y1={cy - hbP / 2} x2={x0 + slP} y2={cy + hbP / 2} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(x0 + slP / 2, cy + shP / 2 + 13, `${shaftL}`)}
          {label(x0 - 8, cy + 3, `${shaftH}`)}
          {label(x0 + slP, cy - hbP / 2 - 6, `${headBase}`)}
          {label(x0 + slP + hlP / 2, cy + hbP / 2 + 13, `${headLen}`)}
        </svg>
      );
    }
    case "composite-stairs": {
      const a = d.a ?? 3, h = d.h ?? 2;
      const s = Math.min(120 / (3 * a), 105 / (3 * h));
      const x0 = (200 - 3 * a * s) / 2, yb = 148;
      const ap = a * s, hp = h * s;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0},${yb} ${x0 + 3 * ap},${yb} ${x0 + 3 * ap},${yb - hp} ${x0 + 2 * ap},${yb - hp} ${x0 + 2 * ap},${yb - 2 * hp} ${x0 + ap},${yb - 2 * hp} ${x0 + ap},${yb - 3 * hp} ${x0},${yb - 3 * hp}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={x0 + ap} y1={yb - 2 * hp} x2={x0 + ap} y2={yb} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          <line x1={x0 + 2 * ap} y1={yb - hp} x2={x0 + 2 * ap} y2={yb} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(x0 + 2.5 * ap, yb + 13, `${a}`)}
          {label(x0 + 3 * ap + 8, yb - hp / 2 + 3, `${h}`)}
        </svg>
      );
    }
    case "composite-ring": {
      const R = d.R ?? 7, r = d.r ?? 4;
      const s = 53 / R;
      const cx = 100, cy = 85;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <circle cx={cx} cy={cy} r={R * s} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={r * s} fill="#ffffff" stroke={INK} strokeWidth={1.6} />
          <line x1={cx} y1={cy} x2={cx + R * s} y2={cy} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          <line x1={cx} y1={cy} x2={cx - r * s} y2={cy} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(cx + ((R + r) * s) / 2, cy - 5, `${R}`)}
          {label(cx - (r * s) / 2, cy + 12, `${r}`)}
        </svg>
      );
    }
    case "composite-sailboat": {
      const hullTop = d.hullTop ?? 10, hullBot = d.hullBot ?? 7, hullH = d.hullH ?? 3, sailBase = d.sailBase ?? 5, sailH = d.sailH ?? 7;
      const s = Math.min(120 / hullTop, 104 / (hullH + sailH));
      const cx = 100, yb = (170 + (hullH + sailH) * s) / 2;
      const hullTopY = yb - hullH * s, apexY = hullTopY - sailH * s;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${cx - (hullTop * s) / 2},${hullTopY} ${cx + (hullTop * s) / 2},${hullTopY} ${cx + (hullBot * s) / 2},${yb} ${cx - (hullBot * s) / 2},${yb}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <polygon points={`${cx - (sailBase * s) / 2},${hullTopY} ${cx + (sailBase * s) / 2},${hullTopY} ${cx},${apexY}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(cx - (sailBase * s) / 2 - 8, (hullTopY + apexY) / 2 + 3, `${sailH}`)}
          {label(cx, hullTopY + 12, `${sailBase}`)}
          {label(cx + (hullTop * s) / 2 + 9, (hullTopY + yb) / 2 + 3, `${hullH}`)}
          {label(cx, yb + 13, `${hullBot}`)}
        </svg>
      );
    }
    case "composite-plus": {
      const arm = d.arm ?? 3, vH = d.vH ?? 9, hW = d.hW ?? 9;
      const s = Math.min(110 / hW, 110 / vH);
      const cx = 100, cy = 85;
      const a = arm * s, v = vH * s, hw = hW * s;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${cx - a / 2},${cy - v / 2} ${cx + a / 2},${cy - v / 2} ${cx + a / 2},${cy - a / 2} ${cx + hw / 2},${cy - a / 2} ${cx + hw / 2},${cy + a / 2} ${cx + a / 2},${cy + a / 2} ${cx + a / 2},${cy + v / 2} ${cx - a / 2},${cy + v / 2} ${cx - a / 2},${cy + a / 2} ${cx - hw / 2},${cy + a / 2} ${cx - hw / 2},${cy - a / 2} ${cx - a / 2},${cy - a / 2}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(cx, cy + 3, `${arm}`)}
          {label(cx - a / 2 - 8, cy - v / 4 + 3, `${vH}`)}
          {label(cx + (a + hw) / 4, cy + a / 2 + 13, `${hW}`)}
        </svg>
      );
    }
    case "composite-frame": {
      const Wd = d.W ?? 12, Hd = d.H ?? 10, b = d.b ?? 2;
      const s = Math.min(125 / Wd, 108 / Hd);
      const ws = Wd * s, hs = Hd * s, bp = b * s;
      const x0 = (200 - ws) / 2, yt = (170 - hs) / 2 - 4;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <rect x={x0} y={yt} width={ws} height={hs} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <rect x={x0 + bp} y={yt + bp} width={ws - 2 * bp} height={hs - 2 * bp} fill="#ffffff" stroke={INK} strokeWidth={1.6} />
          {label(100, yt + hs + 13, `${Wd}`)}
          {label(x0 - 10, yt + hs / 2 + 3, `${Hd}`)}
          {label(100, yt + Math.max(bp / 2, 6) + 3, `${b}`)}
        </svg>
      );
    }
    case "composite-arch": {
      const w = d.w ?? 6, h = d.h ?? 4, r = w / 2;
      const s = Math.min(115 / w, 108 / (h + r));
      const ws = w * s, rp = r * s, hp = h * s;
      const x0 = (200 - ws) / 2, yTop = (170 - (hp + rp)) / 2, yt = yTop + rp, yb = yt + hp;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <path d={`M ${x0} ${yb} L ${x0} ${yt} A ${rp} ${rp} 0 0 1 ${x0 + ws} ${yt} L ${x0 + ws} ${yb} Z`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={x0} y1={yt} x2={x0 + ws} y2={yt} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(100, yb + 13, `${w}`)}
          {label(x0 + ws + 9, (yt + yb) / 2 + 3, `${h}`)}
          {label(x0 + ws / 4, yt - 6, `${r}`)}
        </svg>
      );
    }
    case "composite-hole": {
      const side = d.side ?? 12, r = d.r ?? 3;
      const s = 110 / side;
      const cx = 100, cy = 82, half = (side * s) / 2;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <rect x={cx - half} y={cy - half} width={side * s} height={side * s} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={r * s} fill="#ffffff" stroke={INK} strokeWidth={1.6} />
          <line x1={cx} y1={cy} x2={cx + r * s} y2={cy} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(100, cy + half + 13, `${side}`)}
          {label(cx + (r * s) / 2, cy - 5, `${r}`)}
        </svg>
      );
    }
    case "composite-stadium": {
      const w = d.w ?? 9, h = d.h ?? 6, r = h / 2;
      const s = Math.min(128 / (w + h), 100 / h);
      const rp = r * s, wp = w * s, hp = h * s;
      const x0 = (200 - (wp + 2 * rp)) / 2, yt = (170 - hp) / 2 - 4, yb = yt + hp;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <path d={`M ${x0 + rp} ${yt} L ${x0 + rp + wp} ${yt} A ${rp} ${rp} 0 0 1 ${x0 + rp + wp} ${yb} L ${x0 + rp} ${yb} A ${rp} ${rp} 0 0 1 ${x0 + rp} ${yt} Z`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <line x1={x0 + rp} y1={yt} x2={x0 + rp} y2={yb} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          <line x1={x0 + rp + wp} y1={yt} x2={x0 + rp + wp} y2={yb} stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(x0 + rp + wp / 2, yt - 6, `${w}`)}
          {label(x0 + rp / 2, yb + 13, `${h}`)}
        </svg>
      );
    }
    case "composite-octagon": {
      const Wd = d.W ?? 12, Hd = d.H ?? 12, c = d.c ?? 3;
      const s = Math.min(122 / Wd, 106 / Hd);
      const ws = Wd * s, hs = Hd * s, cp = c * s;
      const x0 = (200 - ws) / 2, yt = (170 - hs) / 2 - 4;
      const corner = `M ${x0 + cp} ${yt} L ${x0} ${yt} L ${x0} ${yt + cp} M ${x0 + ws - cp} ${yt} L ${x0 + ws} ${yt} L ${x0 + ws} ${yt + cp} M ${x0 + cp} ${yt + hs} L ${x0} ${yt + hs} L ${x0} ${yt + hs - cp} M ${x0 + ws - cp} ${yt + hs} L ${x0 + ws} ${yt + hs} L ${x0 + ws} ${yt + hs - cp}`;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          <polygon points={`${x0 + cp},${yt} ${x0 + ws - cp},${yt} ${x0 + ws},${yt + cp} ${x0 + ws},${yt + hs - cp} ${x0 + ws - cp},${yt + hs} ${x0 + cp},${yt + hs} ${x0},${yt + hs - cp} ${x0},${yt + cp}`} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <path d={corner} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4 3" />
          {label(100, yt + hs + 13, `${Wd}`)}
          {label(x0 - 10, yt + hs / 2 + 3, `${Hd}`)}
          {label(x0 + cp / 2 + 2, yt + cp + 11, `${c}`)}
        </svg>
      );
    }
    case "net-cube": {
      const s = d.side ?? 4;
      const q = 34;
      // Variant: 4 different valid cube nets (all fold to a cube; area math unchanged).
      const layouts: [number, number][][] = [
        [[0, 0], [1, 0], [2, 0], [3, 0], [1, -1], [1, 1]],       // cross
        [[0, 0], [1, 0], [2, 0], [3, 0], [1, -1], [2, 1]],       // 1-4-1 offset
        [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1], [2, 1]],      // 2-3-1
        [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [3, 1]],        // 3-3 staircase
      ];
      const cells = layouts[v % 4];
      const minC = Math.min(...cells.map((c) => c[0]));
      const maxC = Math.max(...cells.map((c) => c[0]));
      const minR = Math.min(...cells.map((c) => c[1]));
      const maxR = Math.max(...cells.map((c) => c[1]));
      const x0 = (200 - (maxC - minC + 1) * q) / 2 - minC * q;
      const y0 = (170 - (maxR - minR + 1) * q) / 2 - minR * q + 10;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="200" height="170" role="img" aria-label={p.figure}>
          {cells.map(([cc, rr], i) => (
            <rect key={i} x={x0 + cc * q} y={y0 + rr * q} width={q} height={q}
              fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.4} />
          ))}
          {label(x0 + minC * q + q / 2, y0 + (maxR + 1) * q + 14, `side = ${s}`)}
        </svg>
      );
    }
    default:
      return null;
  }
}

function MSScatterPlotSVG(p: MSScatterPlotParams) {
  const W = 200;
  const H = 190;
  const padL = 30, padB = 30, padT = 12, padR = 12;
  const pw = W - padL - padR;
  const ph = H - padT - padB;
  const X = (v: number) => padL + (v / p.maxX) * pw;
  const Y = (v: number) => padT + ph - (v / p.maxY) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="200" height="190" role="img" aria-label="scatter plot">
      <rect x={padL} y={padT} width={pw} height={ph} fill="#ffffff" stroke={INK} strokeWidth={1.2} />
      {p.trendline && (
        <line x1={X(p.trendline.x1)} y1={Y(p.trendline.y1)} x2={X(p.trendline.x2)} y2={Y(p.trendline.y2)}
          stroke={RED} strokeWidth={1.6} />
      )}
      {p.points.map((pt, i) => (
        <circle key={i}
          cx={X(Math.min(p.maxX, Math.max(0, pt.x)))}
          cy={Y(Math.min(p.maxY, Math.max(0, pt.y)))}
          r={3} fill={ACCENT} />
      ))}
      <text x={padL + pw / 2 - 20} y={H - 6} fontSize={9} fontFamily="serif" fill={INK}>
        {p.xLabel}
      </text>
      <text x={4} y={padT + ph / 2 + 20} fontSize={9} fontFamily="serif" fill={INK}>
        {p.yLabel}
      </text>
    </svg>
  );
}

function MSBarModelSVG(p: MSBarModelParams) {
  const W = 200;
  const BAR_H = 20;
  const hasCaption = p.rows.some((r) => r.caption);
  const barX = hasCaption ? 42 : 6;
  const barW = W - barX - 6;
  let y = 2;
  const model = p.rows.map((row) => {
    const labelH = row.totalLabel ? 12 : 2;
    const barY = y + labelH;
    const totalShare = row.segments.reduce((s, seg) => s + seg.share, 0) || 1;
    let sx = barX;
    const segments = row.segments.map((seg) => {
      const w = (seg.share / totalShare) * barW;
      const x0 = sx;
      sx += w;
      return { label: seg.label, x: x0, w };
    });
    const out = { row, barY, segments };
    y = barY + BAR_H + 12;
    return out;
  });
  const H = y - 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="200" height={H} role="img" aria-label="bar diagram">
      {model.map(({ row, barY, segments }, ri) => (
        <g key={ri}>
          {row.totalLabel && (
            <text x={barX + barW / 2} y={barY - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill={INK} fontFamily="serif">
              {row.totalLabel}
            </text>
          )}
          {row.caption && (
            <text x={2} y={barY + BAR_H / 2 + 3} fontSize={9} fontWeight={700} fill={INK} fontFamily="serif">
              {row.caption}
            </text>
          )}
          {segments.map((seg, si) => (
            <g key={si}>
              <rect x={seg.x} y={barY} width={seg.w} height={BAR_H} fill="#fff" stroke={INK} strokeWidth={1.2} />
              <text x={seg.x + seg.w / 2} y={barY + BAR_H / 2 + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill={INK} fontFamily="serif">
                {seg.label}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function MiddleSchoolDiagram({ params }: { params: MiddleSchoolSVGParams | null | undefined }) {
  if (!params) return null;
  switch (params.kind) {
    case "MSNumberLine":
      return <MSNumberLineSVG {...params} />;
    case "MSCoordinateGrid":
      return <MSCoordinateGridSVG {...params} />;
    case "MSSpinner":
      return <MSSpinnerSVG {...params} />;
    case "MSGeometryFigure":
      return <MSGeometryFigureSVG {...params} />;
    case "MSScatterPlot":
      return <MSScatterPlotSVG {...params} />;
    case "MSBarModel":
      return <MSBarModelSVG {...params} />;
    default:
      return null;
  }
}

// PdfMiddleSchoolDiagrams.tsx
// @react-pdf/renderer diagram renderers for the middle-school area — the PDF
// twin of MiddleSchoolDiagrams.tsx. Every kind in the web renderer has a
// matching exporter here; keep them in sync.

import React from "react";
import { Svg, Circle, Line, Path, Text, Polygon, Rect, Ellipse } from "@react-pdf/renderer";
import type {
  MiddleSchoolSVGParams,
  MSNumberLineParams,
  MSCoordinateGridParams,
  MSSpinnerParams,
  MSGeometryFigureParams,
  MSScatterPlotParams,
} from "@/lib/factories/MiddleSchoolTypes";

const INK = "#111111";
const ACCENT = "#2563eb";
const RED = "#e11d48";
const SERIF = "Times-Roman";
const SERIF_BOLD = "Times-Bold";

function PdfLabel({ x, y, text, anchor = "middle", size = 9 }: {
  x: number; y: number; text: string; anchor?: "middle" | "start"; size?: number;
}) {
  return (
    <Text
      x={anchor === "middle" ? x - 3 : x}
      y={y + 3}
      style={{ fontSize: size, fontFamily: SERIF_BOLD, color: INK }}
    >
      {text}
    </Text>
  );
}

// ── Number line ───────────────────────────────────────────────────────────────

export function PdfMSNumberLineSVG(p: MSNumberLineParams) {
  const W = 200;
  const H = 64;
  const pad = 14;
  const span = p.max - p.min || 1;
  const x = (v: number) => pad + ((v - p.min) / span) * (W - 2 * pad);
  const yMid = 30;
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="64">
      <Line x1={pad - 6} y1={yMid} x2={W - pad + 6} y2={yMid} stroke={INK} strokeWidth={1.5} />
      {p.marks.map((v) => (
        <React.Fragment key={v}>
          <Line x1={x(v)} y1={yMid - 5} x2={x(v)} y2={yMid + 5} stroke={INK} strokeWidth={1} />
          <Text x={x(v) - 3} y={yMid + 19} style={{ fontSize: 9, fontFamily: SERIF, color: INK }}>
            {String(v)}
          </Text>
        </React.Fragment>
      ))}
      {p.highlight.map((v) => (
        <Circle key={`h${v}`} cx={x(v)} cy={yMid} r={4} fill={RED} />
      ))}
      {(p.openHighlight ?? []).map((v) => (
        <Circle key={`o${v}`} cx={x(v)} cy={yMid} r={4} fill="#ffffff" stroke={RED} strokeWidth={2} />
      ))}
      {p.ray && (
        <React.Fragment>
          <Line
            x1={x(p.ray.from)}
            y1={yMid}
            x2={p.ray.dir === "right" ? W - pad + 2 : pad - 2}
            y2={yMid}
            stroke={ACCENT}
            strokeWidth={3}
          />
          <Circle
            cx={x(p.ray.from)}
            cy={yMid}
            r={4.5}
            fill={p.ray.open ? "#ffffff" : ACCENT}
            stroke={ACCENT}
            strokeWidth={2}
          />
        </React.Fragment>
      )}
    </Svg>
  );
}

// ── Coordinate grid ───────────────────────────────────────────────────────────

export function PdfMSCoordinateGridSVG(p: MSCoordinateGridParams) {
  const W = 200;
  const H = 200;
  const pad = 16;
  // Seeded presentation variant (0-7). Point coordinates, labels, and segments
  // are the math and are never altered — only marker style, dash pattern,
  // and polygon label placement change.
  const v = p.variant ?? 0;
  const markerStyle = v % 3; // 0: filled disc, 1: ring, 2: square
  const DASHES = ["5,3", "3,3", "8,3", "2,2"];
  const dashFor = (dashed: boolean | undefined, salt = 0) =>
    dashed ? DASHES[(v + salt) % DASHES.length] : undefined;
  const polyLabelPos = v % 3; // 0: above first vertex, 1: right of it, 2: below
  const spanX = p.maxX - p.minX || 1;
  const spanY = p.maxY - p.minY || 1;
  const X = (v: number) => pad + ((v - p.minX) / spanX) * (W - 2 * pad);
  const Y = (v: number) => H - pad - ((v - p.minY) / spanY) * (H - 2 * pad);
  const lines: React.ReactNode[] = [];
  for (let gx = Math.ceil(p.minX); gx <= p.maxX; gx++) {
    lines.push(
      <Line key={`v${gx}`} x1={X(gx)} y1={pad} x2={X(gx)} y2={H - pad}
        stroke={gx === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={gx === 0 ? 1.2 : 0.6} />
    );
  }
  for (let gy = Math.ceil(p.minY); gy <= p.maxY; gy++) {
    lines.push(
      <Line key={`h${gy}`} x1={pad} y1={Y(gy)} x2={W - pad} y2={Y(gy)}
        stroke={gy === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={gy === 0 ? 1.2 : 0.6} />
    );
  }
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="200">
      {lines}
      {(p.polygons ?? []).map((poly, i) => (
        <React.Fragment key={`poly${i}`}>
          <Polygon
            points={poly.points.map((pt) => `${X(pt.x)},${Y(pt.y)}`).join(" ")}
            fill={ACCENT}
            fillOpacity={0.12}
            stroke={poly.dashed ? RED : ACCENT}
            strokeWidth={1.5}
            strokeDasharray={dashFor(poly.dashed, 1)}
          />
          {poly.label && (
            <Text
              x={X(poly.points[0].x) + (polyLabelPos === 1 ? 8 : 0)}
              y={Y(poly.points[0].y) + (polyLabelPos === 0 ? -8 : polyLabelPos === 2 ? 16 : 3)}
              style={{ fontSize: 10, fontFamily: SERIF_BOLD, color: INK }}>
              {poly.label}
            </Text>
          )}
        </React.Fragment>
      ))}
      {(p.segments ?? []).map((sg, i) => (
        <Line key={`seg${i}`} x1={X(sg.x1)} y1={Y(sg.y1)} x2={X(sg.x2)} y2={Y(sg.y2)}
          stroke="#b45309" strokeWidth={1.6} strokeDasharray={dashFor(sg.dashed, 2)} />
      ))}
      {(p.points ?? []).map((pt, i) => (
        <React.Fragment key={`pt${i}`}>
          {markerStyle === 2 ? (
            <Rect x={X(pt.x) - 3.5} y={Y(pt.y) - 3.5} width={7} height={7}
              fill={pt.filled === false ? "#ffffff" : INK} stroke={INK} strokeWidth={1.5} />
          ) : (
            <Circle cx={X(pt.x)} cy={Y(pt.y)} r={4}
              fill={markerStyle === 1 || pt.filled === false ? "#ffffff" : INK}
              stroke={INK} strokeWidth={markerStyle === 1 ? 2.2 : 1.5} />
          )}
          {pt.label && (
            <Text x={X(pt.x) + 6} y={Y(pt.y) - 2}
              style={{ fontSize: 10, fontFamily: SERIF_BOLD, color: INK }}>
              {pt.label}
            </Text>
          )}
        </React.Fragment>
      ))}
    </Svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

const SPINNER_DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#f97316", "#14b8a6", "#f43f5e"];

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function PdfMSSpinnerSVG(p: MSSpinnerParams) {
  const C = 100;
  const R = 78;
  const n = p.sectors.length;
  const colors = p.colors && p.colors.length >= n ? p.colors : SPINNER_DEFAULT_COLORS;
  const step = 360 / n;
  // Seeded presentation variant (0-7): rigid rotation of the whole spinner.
  // Sector sizes and label order are unchanged, so probabilities are identical.
  const rot = ((p.variant ?? 0) % 8) * (step / 8);
  return (
    <Svg viewBox="0 0 200 200" width="200" height="200">
      {p.sectors.map((label, i) => {
        const a0 = i * step + rot;
        const a1 = (i + 1) * step + rot;
        const s = polar(C, C, R, a0);
        const e = polar(C, C, R, a1);
        const large = step > 180 ? 1 : 0;
        const mid = polar(C, C, R * 0.62, (a0 + a1) / 2);
        return (
          <React.Fragment key={i}>
            <Path
              d={`M ${C} ${C} L ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} Z`}
              fill={colors[i % colors.length]}
              fillOpacity={0.75}
              stroke={INK}
              strokeWidth={1.2}
            />
            <Text x={mid.x - 4} y={mid.y + 4}
              style={{ fontSize: 13, fontFamily: SERIF_BOLD, color: "#ffffff" }}>
              {label}
            </Text>
          </React.Fragment>
        );
      })}
      <Circle cx={C} cy={C} r={7} fill={INK} />
      <Circle cx={C} cy={C} r={2.5} fill="#ffffff" />
    </Svg>
  );
}

// ── Geometric figures ─────────────────────────────────────────────────────────

export function PdfMSGeometryFigureSVG(p: MSGeometryFigureParams) {
  const W = 200;
  const H = 170;
  const d = p.dims;
  // Seeded presentation variant (0-7). Changes ONLY how the figure is drawn
  // (orientation, skew, scale, rotation, layout) — dims and math are untouched.
  const v = p.variant ?? 0;
  const label = (x: number, y: number, text: string) => (
    <PdfLabel x={x} y={y} text={text} />
  );
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
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Polygon points={`${x0 + skew},${y0} ${x1 + skew},${y0} ${x1},${y1} ${x0},${y1}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Line x1={altX} y1={y0} x2={altX} y2={y1} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label((x0 + x1) / 2 + skew / 2, y1 + 14, `${base}`)}
          {label(altX + (skew >= 0 ? -14 : 14), (y0 + y1) / 2, `${height}`)}
        </Svg>
      );
    }
    case "triangle": {
      const base = d.base ?? 8;
      const height = d.height ?? 5;
      // Variant: apex slides along the top (6 positions).
      const apexX = 60 + (v % 6) * 16;
      const x0 = 40, x1 = 160, yb = 130, yt = 50;
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Polygon points={`${x0},${yb} ${x1},${yb} ${apexX},${yt}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Line x1={apexX} y1={yt} x2={apexX} y2={yb} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label((x0 + x1) / 2, yb + 14, `${base}`)}
          {label(apexX + 8, (yt + yb) / 2, `${height}`)}
        </Svg>
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
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Polygon points={pts}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Line x1={cx + w2 + 6} y1={yt} x2={cx + w2 + 6} y2={yb} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label(cx, yb + 14, `${b1}`)}
          {label(cx, yt - 10, `${b2}`)}
          {label(cx + w2 + 12, (yt + yb) / 2, `${h}`)}
        </Svg>
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
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Rect x={rx} y={ry} width={rw} height={rh} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(rx + rw / 2, ry + rh + 15, `${l}`)}
          {label(rx + rw + 8, ry + rh / 2, `${w}`)}
        </Svg>
      );
    }
    case "rectangular-prism": {
      const l = d.length ?? 5;
      const w = d.width ?? 4;
      const h = d.height ?? 3;
      // Variant: 24 states — depth dir (2) x proportions (3) x height (2) x depth len (2).
      const pi = v % 24;
      const dir = pi % 2 === 0 ? 1 : -1;
      const sz = Math.floor(pi / 2) % 3;
      const fw = [80, 95, 68][sz], fh = [55, 48, 62][sz];
      const y0 = Math.floor(pi / 6) % 2 === 0 ? 120 : 106;
      const dep = (Math.floor(pi / 12) % 2 === 0 ? 26 : 17) * dir;
      const x0 = dir > 0 ? 55 : 75;
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Polygon points={`${x0},${y0} ${x0 + fw},${y0} ${x0 + fw},${y0 - fh} ${x0},${y0 - fh}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Polygon points={`${x0 + fw},${y0} ${x0 + fw + dep},${y0 - dep} ${x0 + fw + dep},${y0 - dep - fh} ${x0 + fw},${y0 - fh}`}
            fill={ACCENT} fillOpacity={0.05} stroke={INK} strokeWidth={1.2} />
          <Polygon points={`${x0},${y0 - fh} ${x0 + fw},${y0 - fh} ${x0 + fw + dep},${y0 - dep - fh} ${x0 + dep},${y0 - dep - fh}`}
            fill={ACCENT} fillOpacity={0.05} stroke={INK} strokeWidth={1.2} />
          {label(x0 + fw / 2, y0 + 14, `${l}`)}
          {label(x0 + fw + dep + (dir > 0 ? 2 : -10), y0 - dep / 2, `${w}`)}
          {label(x0 - 14, y0 - fh / 2, `${h}`)}
        </Svg>
      );
    }
    case "cylinder": {
      const r = d.radius ?? 3;
      const h = d.height ?? 6;
      // Variant: 8 states — scale (2) x horizontal pos (2) x height (2).
      const c8 = v % 8;
      const s = c8 % 2 === 0 ? 1 : 0.8;
      const cx = c8 % 4 < 2 ? 100 : 88, ry = 14 * s, hw = 55 * s;
      const yTop = 45, yBot = yTop + (c8 < 4 ? 80 : 64);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Path d={`M ${cx - hw} ${yTop} L ${cx - hw} ${yBot} A ${hw} ${ry} 0 0 0 ${cx + hw} ${yBot} L ${cx + hw} ${yTop}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Ellipse cx={cx} cy={yTop} rx={hw} ry={ry} fill={ACCENT} fillOpacity={0.16} stroke={INK} strokeWidth={1.6} />
          {label(cx + hw + 5, (yTop + yBot) / 2, `${h}`)}
          {label(cx, yTop - 22, `r = ${r}`)}
        </Svg>
      );
    }
    case "cone": {
      const r = d.radius ?? 3;
      const h = d.height ?? 6;
      // Variant: 8 states — scale (2) x horizontal pos (2) x height (2).
      const c8 = v % 8;
      const s = c8 % 2 === 0 ? 1 : 0.8;
      const cx = c8 % 4 < 2 ? 100 : 88, apexY = 35, ry = 12 * s, hw = 55 * s;
      const baseY = apexY + (c8 < 4 ? 90 : 72);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Polygon points={`${cx},${apexY} ${cx - hw},${baseY} ${cx + hw},${baseY}`}
            fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Ellipse cx={cx} cy={baseY} rx={hw} ry={ry} fill={ACCENT} fillOpacity={0.16} stroke={INK} strokeWidth={1.4} />
          <Line x1={cx} y1={apexY} x2={cx} y2={baseY} stroke={RED} strokeWidth={1.2} strokeDasharray="4,2" />
          {label(cx + 6, (apexY + baseY) / 2, `${h}`)}
          {label(cx, baseY + 24, `r = ${r}`)}
        </Svg>
      );
    }
    case "sphere": {
      const r = d.radius ?? 4;
      const cx = 100, cy = 85, R = 55;
      // Variant: radius indicator drawn at 8 different angles.
      const a = ((v % 8) * 45 * Math.PI) / 180;
      const ex = cx + R * 0.7 * Math.cos(a), ey = cy - R * 0.7 * Math.sin(a);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Circle cx={cx} cy={cy} r={R} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Ellipse cx={cx} cy={cy} rx={R} ry={R * 0.32} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="4,2" />
          <Line x1={cx} y1={cy} x2={ex} y2={ey} stroke={INK} strokeWidth={1.2} />
          {label((cx + ex) / 2, (cy + ey) / 2 - 10, `r = ${r}`)}
        </Svg>
      );
    }
    case "circle": {
      // Variant: 16 states — radius indicator angle (8) x drawn size (2).
      const R = v % 2 === 0 ? 58 : 48;
      const cx = 100, cy = 85;
      const a = ((Math.floor(v / 2) % 8) * 45 * Math.PI) / 180;
      const ex = cx + R * Math.cos(a), ey = cy - R * Math.sin(a);
      const mx = (cx + ex) / 2, my = (cy + ey) / 2;
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Circle cx={cx} cy={cy} r={R} fill={ACCENT} fillOpacity={0.08} stroke={INK} strokeWidth={1.6} />
          <Circle cx={cx} cy={cy} r={2.5} fill={INK} />
          <Line x1={cx} y1={cy} x2={ex} y2={ey} stroke={INK} strokeWidth={1.2} />
          {d.radius !== undefined && label(mx, my - 10, `r = ${d.radius}`)}
          {d.diameter !== undefined && label(cx, cy + 10, `d = ${d.diameter}`)}
        </Svg>
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
      const arc1 = rot2(26, 0, k);
      const arc2 = rot2(26 * Math.cos(aRad), 26 * Math.sin(aRad), k);
      const lp = rot2(44, -16, k);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Line x1={vx} y1={vy} x2={vx + r1.x} y2={vy + r1.y} stroke={INK} strokeWidth={1.6} />
          <Line x1={vx} y1={vy} x2={vx + r2.x} y2={vy + r2.y} stroke={INK} strokeWidth={1.6} />
          <Path d={`M ${vx + arc1.x} ${vy + arc1.y} A 26 26 0 0 0 ${vx + arc2.x} ${vy + arc2.y}`} fill="none" stroke={ACCENT} strokeWidth={1.6} />
          {label(vx + lp.x, vy + lp.y, `${ang}°`)}
        </Svg>
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
      const l1 = rot2(34, -12, k);
      const l2 = rot2(10, -56, k);
      const sq1 = rot2(12, 0, k), sq2 = rot2(12, -12, k), sq3 = rot2(0, -12, k);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Line x1={vx} y1={vy} x2={vx + rBase.x} y2={vy + rBase.y} stroke={INK} strokeWidth={1.6} />
          <Line x1={vx} y1={vy} x2={vx + rVert.x} y2={vy + rVert.y} stroke={INK} strokeWidth={1.6} />
          <Line x1={vx} y1={vy} x2={vx + rKnown.x} y2={vy + rKnown.y} stroke={ACCENT} strokeWidth={1.6} />
          <Path d={`M ${vx + sq1.x} ${vy + sq1.y} L ${vx + sq2.x} ${vy + sq2.y} L ${vx + sq3.x} ${vy + sq3.y}`} fill="none" stroke={INK} strokeWidth={1.2} />
          {label(vx + l1.x, vy + l1.y, `${known}°`)}
          {label(vx + l2.x, vy + l2.y, "?")}
        </Svg>
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
      const l1 = rot2(-46, -16, k);
      const l2 = rot2(40, -16, k);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Line x1={vx + rL.x} y1={vy + rL.y} x2={vx + rR.x} y2={vy + rR.y} stroke={INK} strokeWidth={1.6} />
          <Line x1={vx} y1={vy} x2={vx + rK.x} y2={vy + rK.y} stroke={ACCENT} strokeWidth={1.6} />
          {label(vx + l1.x, vy + l1.y, `${known}°`)}
          {label(vx + l2.x, vy + l2.y, "?")}
        </Svg>
      );
    }
    case "angle-vertical": {
      const known = d.angle ?? 60;
      const cx = 100, cy = 90, len = 70;
      const k = v % 4;
      const rad = ((known / 2) * Math.PI) / 180;
      const d1 = rot2(len * Math.cos(rad), len * Math.sin(rad), k);
      const d2 = rot2(len * Math.cos(rad), -len * Math.sin(rad), k);
      const l1 = rot2(70 * Math.cos(rad) * 0.45, -70 * Math.sin(rad) * 0.45 - 10, k);
      const l2 = rot2(-70 * Math.cos(rad) * 0.45, 70 * Math.sin(rad) * 0.45 + 14, k);
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Line x1={cx - d1.x} y1={cy - d1.y} x2={cx + d1.x} y2={cy + d1.y} stroke={INK} strokeWidth={1.6} />
          <Line x1={cx - d2.x} y1={cy - d2.y} x2={cx + d2.x} y2={cy + d2.y} stroke={INK} strokeWidth={1.6} />
          {label(cx + l1.x, cy + l1.y, `${known}°`)}
          {label(cx + l2.x, cy + l2.y, "?")}
        </Svg>
      );
    }
    case "composite": {
      const w1 = d.w1 ?? 10, h1 = d.h1 ?? 5, w2 = d.w2 ?? 5, h2 = d.h2 ?? 4;
      const s = Math.min(120 / w1, 60 / h1, 100 / w2, 50 / h2);
      const bw = w1 * s, bh = h1 * s, tw = w2 * s, th = h2 * s;
      // Variant: 4 states — mirror (2) x vertical position (2).
      const mirror = v % 2 === 1;
      const mx = (x: number) => (mirror ? 200 - x : x);
      const x0 = (200 - bw) / 2, yb = v % 4 < 2 ? 135 : 122;
      const tx0 = x0 + (bw - tw) / 2;
      return (
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          <Rect x={Math.min(mx(x0), mx(x0 + bw))} y={yb - bh} width={bw} height={bh} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          <Rect x={Math.min(mx(tx0), mx(tx0 + tw))} y={yb - bh - th} width={tw} height={th} fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.6} />
          {label(mx(x0 + bw / 2), yb + 13, `${w1}`)}
          {label(mx(x0) + (mirror ? 12 : -12), yb - bh / 2, `${h1}`)}
          {label(mx(tx0 + tw / 2), yb - bh - th - 9, `${w2}`)}
          {label(mx(tx0 + tw) + (mirror ? -4 : 4), yb - bh - th / 2, `${h2}`)}
        </Svg>
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
        <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="170">
          {cells.map(([cc, rr], i) => (
            <Rect key={i} x={x0 + cc * q} y={y0 + rr * q} width={q} height={q}
              fill={ACCENT} fillOpacity={0.1} stroke={INK} strokeWidth={1.4} />
          ))}
          {label(x0 + minC * q + q / 2, y0 + (maxR + 1) * q + 14, `side = ${s}`)}
        </Svg>
      );
    }
    default:
      return null;
  }
}

// ── Scatter plot ──────────────────────────────────────────────────────────────

export function PdfMSScatterPlotSVG(p: MSScatterPlotParams) {
  const W = 200;
  const H = 190;
  const padL = 30, padB = 30, padT = 12, padR = 12;
  const pw = W - padL - padR;
  const ph = H - padT - padB;
  const X = (v: number) => padL + (v / p.maxX) * pw;
  const Y = (v: number) => padT + ph - (v / p.maxY) * ph;
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="200" height="190">
      <Rect x={padL} y={padT} width={pw} height={ph} fill="#ffffff" stroke={INK} strokeWidth={1.2} />
      {p.trendline && (
        <Line x1={X(p.trendline.x1)} y1={Y(p.trendline.y1)} x2={X(p.trendline.x2)} y2={Y(p.trendline.y2)}
          stroke={RED} strokeWidth={1.6} />
      )}
      {p.points.map((pt, i) => (
        <Circle key={i}
          cx={X(Math.min(p.maxX, Math.max(0, pt.x)))}
          cy={Y(Math.min(p.maxY, Math.max(0, pt.y)))}
          r={3} fill={ACCENT} />
      ))}
      <Text x={padL + pw / 2 - 20} y={H - 6} style={{ fontSize: 9, fontFamily: SERIF, color: INK }}>
        {p.xLabel}
      </Text>
      <Text x={4} y={padT + ph / 2 + 20} style={{ fontSize: 9, fontFamily: SERIF, color: INK }}>
        {p.yLabel}
      </Text>
    </Svg>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

/** PDF SVG renderer for middle-school diagram params. Returns null when absent. */
export function PdfMiddleSchoolDiagram({ params }: { params: MiddleSchoolSVGParams | null | undefined }) {
  if (!params) return null;
  switch (params.kind) {
    case "MSNumberLine":
      return <PdfMSNumberLineSVG {...params} />;
    case "MSCoordinateGrid":
      return <PdfMSCoordinateGridSVG {...params} />;
    case "MSSpinner":
      return <PdfMSSpinnerSVG {...params} />;
    case "MSGeometryFigure":
      return <PdfMSGeometryFigureSVG {...params} />;
    case "MSScatterPlot":
      return <PdfMSScatterPlotSVG {...params} />;
    default:
      return null;
  }
}

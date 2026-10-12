// GeometryDiagrams.tsx
// Web (SVG) renderers for the GeometryDiagramParams kinds introduced with the
// Topic 1/2/3/5/6/8/9/12/13/14/15 generators (see
// src/lib/factories/GeometryTypes.ts). PDF twins live in GeometryPdfDiagrams.tsx.
// Figure kinds draw in a 200×200 viewBox from factory-computed drawing
// coordinates; GridFigure uses math coordinates (−8..8), matching the
// existing CoordinateGrid convention.

import React from "react";
import type {
  GeometryDiagramParams,
  TriangleFigureParams,
  PolygonFigureParams,
  GridFigureParams,
  TransversalFigureParams,
  TangentFigureParams,
  SolidFigureParams,
  NetFigureParams,
  SketchFigureParams,
  AngleFigureParams,
  PatternFigureParams,
  GeoPt,
} from "@/lib/factories/GeometryTypes";

const INK = "#111111";
const FAINT = "#94a3b8";
const GRID = "#e2e8f0";

function Lab({ x, y, text, size = 10, anchor = "middle" }: { x: number; y: number; text: string; size?: number; anchor?: string }) {
  return (
    <text x={x} y={y} fontSize={size} fill={INK} textAnchor={anchor as "middle"} fontFamily="inherit">
      {text}
    </text>
  );
}

function byLabel(points: GeoPt[]): Map<string, GeoPt> {
  return new Map(points.map((p) => [p.label, p]));
}

function mid(a: GeoPt, b: GeoPt) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function ticksAt(a: GeoPt, b: GeoPt, count: number, parallel: boolean) {
  const m = mid(a, b);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const out = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 5;
    const cx = m.x + ux * off;
    const cy = m.y + uy * off;
    if (parallel) {
      out.push(
        <path key={i} d={`M ${cx - ux * 4 - px * 3} ${cy - uy * 4 - py * 3} L ${cx + px * 1} ${cy + py * 1} L ${cx - ux * 4 + px * 3} ${cy - uy * 4 + py * 3}`} fill="none" stroke={INK} strokeWidth={1.1} />
      );
    } else {
      out.push(
        <line key={i} x1={cx - px * 4} y1={cy - py * 4} x2={cx + px * 4} y2={cy + py * 4} stroke={INK} strokeWidth={1.1} />
      );
    }
  }
  return out;
}

type PtLike = { x: number; y: number };
function rightAngleAt(v: PtLike, p1: PtLike, p2: PtLike) {
  const s = 11;
  const u1 = { x: (p1.x - v.x) / (Math.hypot(p1.x - v.x, p1.y - v.y) || 1), y: (p1.y - v.y) / (Math.hypot(p1.x - v.x, p1.y - v.y) || 1) };
  const u2 = { x: (p2.x - v.x) / (Math.hypot(p2.x - v.x, p2.y - v.y) || 1), y: (p2.y - v.y) / (Math.hypot(p2.x - v.x, p2.y - v.y) || 1) };
  const a = { x: v.x + u1.x * s, y: v.y + u1.y * s };
  const b = { x: a.x + u2.x * s, y: a.y + u2.y * s };
  const c = { x: v.x + u2.x * s, y: v.y + u2.y * s };
  return <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`} fill="none" stroke={INK} strokeWidth={1} />;
}

// ── TriangleFigure ────────────────────────────────────────────────────────────

export function TriangleFigureSVG({ params }: { params: TriangleFigureParams }) {
  const P = byLabel(params.points);
  const seg = (pair: [string, string], dashed = false, key = "") => {
    const a = P.get(pair[0]);
    const b = P.get(pair[1]);
    if (!a || !b) return null;
    return <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={1.4} strokeDasharray={dashed ? "4,3" : undefined} />;
  };
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      {params.segments.map((s, i) => seg(s, false, `s${i}`))}
      {(params.dashed ?? []).map((s, i) => seg(s, true, `d${i}`))}
      {Object.entries(params.ticks ?? {}).map(([k, c]) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        return a && b ? <g key={k}>{ticksAt(a, b, c, false)}</g> : null;
      })}
      {(params.parallelMarks ?? []).map((k) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        return a && b ? <g key={k}>{ticksAt(a, b, 1, true)}</g> : null;
      })}
      {(params.rightAngles ?? []).map((v) => {
        const vp = P.get(v);
        if (!vp) return null;
        const nbrs = params.segments.filter((s) => s.includes(v)).map((s) => P.get(s[0] === v ? s[1] : s[0])!);
        return nbrs.length >= 2 ? <g key={v}>{rightAngleAt(vp, nbrs[0], nbrs[1])}</g> : null;
      })}
      {Object.entries(params.sideLabels ?? {}).map(([k, text]) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        if (!a || !b || !text) return null;
        const m = mid(a, b);
        return <Lab key={k} x={m.x} y={m.y - 5} text={text} size={9} />;
      })}
      {Object.entries(params.angleLabels ?? {}).map(([k, text]) => {
        const v = P.get(k);
        if (!v || !text) return null;
        return <Lab key={k} x={v.x + 10} y={v.y + 12} text={text} size={9} />;
      })}
      {params.points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={2.4} fill={INK} />
          <Lab x={p.x + 7} y={p.y - 5} text={p.label} size={10} anchor="start" />
        </g>
      ))}
      {(params.extraLabels ?? []).map((l, i) => (
        <Lab key={i} x={l.x} y={l.y} text={l.text} size={9} />
      ))}
    </svg>
  );
}

// ── PolygonFigure ─────────────────────────────────────────────────────────────

export function PolygonFigureSVG({ params }: { params: PolygonFigureParams }) {
  const V = params.vertices;
  const pts = V.map((p) => `${p.x},${p.y}`).join(" ");
  const P = byLabel(V);
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      <polygon points={pts} fill="none" stroke={INK} strokeWidth={1.4} />
      {(params.diagonals ?? []).map(([i, j], k) => (
        <line key={k} x1={V[i].x} y1={V[i].y} x2={V[j].x} y2={V[j].y} stroke={INK} strokeWidth={1} strokeDasharray="4,3" />
      ))}
      {(params.dashedSegments ?? []).map((s, i) => (
        <g key={i}>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={INK} strokeWidth={1} strokeDasharray="4,3" />
          {s.label ? <Lab x={(s.x1 + s.x2) / 2 + 6} y={(s.y1 + s.y2) / 2} text={s.label} size={9} anchor="start" /> : null}
        </g>
      ))}
      {Object.entries(params.ticks ?? {}).map(([k, c]) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        return a && b ? <g key={k}>{ticksAt(a, b, c, false)}</g> : null;
      })}
      {Object.entries(params.sideLabels ?? {}).map(([k, text]) => {
        if (!text) return null;
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        if (!a || !b) return null;
        const m = mid(a, b);
        return <Lab key={k} x={m.x} y={m.y - 5} text={text} size={9} />;
      })}
      {Object.entries(params.angleLabels ?? {}).map(([k, text]) => {
        const v = P.get(k);
        if (!v || !text) return null;
        // pull label toward the centroid (100, 104)
        const x = v.x + (100 - v.x) * 0.22;
        const y = v.y + (104 - v.y) * 0.22;
        return <Lab key={k} x={x} y={y} text={text} size={9} />;
      })}
      {(params.rightAngles ?? []).map((v) => {
        const idx = V.findIndex((p) => p.label === v);
        if (idx < 0) return null;
        const prev = V[(idx + V.length - 1) % V.length];
        const next = V[(idx + 1) % V.length];
        return <g key={v}>{rightAngleAt(V[idx], prev, next)}</g>;
      })}
      {params.center ? (
        <g>
          <circle cx={params.center.x} cy={params.center.y} r={2.2} fill={INK} />
          {params.center.label ? <Lab x={params.center.x + 6} y={params.center.y - 4} text={params.center.label} size={9} anchor="start" /> : null}
        </g>
      ) : null}
      {V.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={2.2} fill={INK} />
          <Lab x={p.x + (p.x >= 100 ? 6 : -6)} y={p.y - 4} text={p.label} size={10} anchor={p.x >= 100 ? "start" : "end"} />
        </g>
      ))}
    </svg>
  );
}

// ── GridFigure ────────────────────────────────────────────────────────────────

const GC = 100;
const GS = 10;
const gx = (x: number) => GC + x * GS;
const gy = (y: number) => GC - y * GS;

export function GridFigureSVG({ params }: { params: GridFigureParams }) {
  const lines = [];
  for (let i = 0; i <= 16; i++) {
    const p = 20 + i * 10;
    lines.push(<line key={`v${i}`} x1={p} y1={20} x2={p} y2={180} stroke={GRID} strokeWidth={0.5} />);
    lines.push(<line key={`h${i}`} x1={20} y1={p} x2={180} y2={p} stroke={GRID} strokeWidth={0.5} />);
  }
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      {lines}
      <line x1={20} y1={GC} x2={180} y2={GC} stroke={FAINT} strokeWidth={1} />
      <line x1={GC} y1={20} x2={GC} y2={180} stroke={FAINT} strokeWidth={1} />
      {(params.lines ?? []).map((l, i) => (
        <line key={i} x1={gx(l.x1)} y1={gy(l.y1)} x2={gx(l.x2)} y2={gy(l.y2)} stroke={INK} strokeWidth={1.1} strokeDasharray={l.dashed ? "4,3" : undefined} />
      ))}
      {(params.polygons ?? []).map((poly, i) => (
        <polygon
          key={i}
          points={poly.points.map((p) => `${gx(p.x)},${gy(p.y)}`).join(" ")}
          fill="none"
          stroke={INK}
          strokeWidth={1.4}
          strokeDasharray={poly.dashed ? "5,3" : undefined}
        />
      ))}
      {(params.polygons ?? []).flatMap((poly, i) =>
        poly.points.map((p, j) => (
          <g key={`${i}-${j}`}>
            <circle cx={gx(p.x)} cy={gy(p.y)} r={2.4} fill={INK} />
            <Lab x={gx(p.x) + 6} y={gy(p.y) - 4} text={p.label} size={9} anchor="start" />
          </g>
        ))
      )}
      {(params.points ?? []).map((p, i) => (
        <g key={i}>
          <circle cx={gx(p.x)} cy={gy(p.y)} r={2.6} fill={INK} />
          <Lab x={gx(p.x) + 6} y={gy(p.y) - 4} text={p.label} size={9} anchor="start" />
        </g>
      ))}
    </svg>
  );
}

// ── TransversalFigure ─────────────────────────────────────────────────────────

export function TransversalFigureSVG({ params }: { params: TransversalFigureParams }) {
  // Intersections: top line y=72 at T=(86,72); bottom line y=140 at B=(122,140).
  const T = { x: 86, y: 72 };
  const B = { x: 122, y: 140 };
  const pos = [
    { x: T.x - 14, y: T.y - 8 }, { x: T.x + 14, y: T.y - 8 },
    { x: T.x - 14, y: T.y + 14 }, { x: T.x + 16, y: T.y + 14 },
    { x: B.x - 14, y: B.y - 8 }, { x: B.x + 14, y: B.y - 8 },
    { x: B.x - 14, y: B.y + 14 }, { x: B.x + 16, y: B.y + 14 },
  ];
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      <line x1={22} y1={72} x2={188} y2={72} stroke={INK} strokeWidth={1.4} />
      <line x1={22} y1={140} x2={188} y2={140} stroke={INK} strokeWidth={1.4} />
      <line x1={64} y1={26} x2={146} y2={182} stroke={INK} strokeWidth={1.4} />
      {params.parallel ? (
        <g stroke={INK} strokeWidth={1.2} fill="none">
          <path d="M 100 67 L 106 72 L 100 77" />
          <path d="M 108 67 L 114 72 L 108 77" transform="translate(-2,68)" />
        </g>
      ) : null}
      <Lab x={28} y={66} text="l" size={11} anchor="start" />
      <Lab x={28} y={134} text="m" size={11} anchor="start" />
      {params.labels.map((text, i) =>
        text ? <Lab key={i} x={pos[i].x} y={pos[i].y} text={text} size={9} /> : null
      )}
      {params.labels.map((_, i) => (
        <Lab key={`n${i}`} x={pos[i].x} y={pos[i].y + 11} text={String(i + 1)} size={7} />
      ))}
    </svg>
  );
}

// ── TangentFigure ─────────────────────────────────────────────────────────────

export function TangentFigureSVG({ params }: { params: TangentFigureParams }) {
  const O = { x: 82, y: 104 };
  const R = 54;
  const P = { x: 178, y: 104 };
  const d = P.x - O.x;
  const base = (R * R) / d;
  const off = (R * Math.sqrt(d * d - R * R)) / d;
  const T1 = { x: O.x + base, y: O.y - off };
  const T2 = { x: O.x + base, y: O.y + off };
  const ra = { x: (O.x + T1.x) / 2, y: (O.y + T1.y) / 2 };
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      <circle cx={O.x} cy={O.y} r={R} fill="none" stroke={INK} strokeWidth={1.4} />
      <line x1={O.x} y1={O.y} x2={P.x} y2={P.y} stroke={FAINT} strokeWidth={1} strokeDasharray="4,3" />
      <line x1={O.x} y1={O.y} x2={T1.x} y2={T1.y} stroke={INK} strokeWidth={1.2} />
      <line x1={T1.x} y1={T1.y} x2={P.x} y2={P.y} stroke={INK} strokeWidth={1.4} />
      {params.twoTangents ? (
        <g>
          <line x1={O.x} y1={O.y} x2={T2.x} y2={T2.y} stroke={INK} strokeWidth={1.2} />
          <line x1={T2.x} y1={T2.y} x2={P.x} y2={P.y} stroke={INK} strokeWidth={1.4} />
        </g>
      ) : null}
      {params.showRightAngle ? rightAngleAt(T1, O, P) : null}
      <circle cx={O.x} cy={O.y} r={2.4} fill={INK} />
      <circle cx={P.x} cy={P.y} r={2.4} fill={INK} />
      <Lab x={O.x - 4} y={O.y + 14} text="O" size={10} anchor="end" />
      <Lab x={P.x + 3} y={P.y - 5} text="P" size={10} anchor="start" />
      <Lab x={T1.x + 4} y={T1.y - 4} text={params.twoTangents ? "A" : "T"} size={10} anchor="start" />
      {params.twoTangents ? <Lab x={T2.x + 4} y={T2.y + 12} text="B" size={10} anchor="start" /> : null}
      {params.radiusLabel ? <Lab x={ra.x - 4} y={ra.y} text={params.radiusLabel} size={9} anchor="end" /> : null}
      {params.tangentLabel ? <Lab x={(T1.x + P.x) / 2} y={(T1.y + P.y) / 2 - 6} text={params.tangentLabel} size={9} /> : null}
      {params.extLabel ? <Lab x={(O.x + P.x) / 2} y={O.y + 13} text={params.extLabel} size={9} /> : null}
      {params.angleP ? <Lab x={P.x - 16} y={P.y - 8} text={params.angleP} size={9} anchor="end" /> : null}
    </svg>
  );
}

// ── SolidFigure ───────────────────────────────────────────────────────────────

function dimsCaption(dims: Record<string, string>): string {
  return Object.entries(dims).map(([k, v]) => `${k} = ${v}`).join(",  ");
}

export function SolidFigureSVG({ params }: { params: SolidFigureParams }) {
  const d = params.dims;
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      {params.solid === "rectPrism" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <rect x={55} y={85} width={95} height={62} />
          <rect x={83} y={57} width={95} height={62} />
          <line x1={55} y1={85} x2={83} y2={57} />
          <line x1={150} y1={85} x2={178} y2={57} />
          <line x1={55} y1={147} x2={83} y2={119} />
          <line x1={150} y1={147} x2={178} y2={119} />
          {d.l ? <Lab x={102} y={162} text={d.l} size={10} /> : null}
          {d.h ? <Lab x={160} y={120} text={d.h} size={10} anchor="start" /> : null}
          {d.w ? <Lab x={66} y={76} text={d.w} size={10} /> : null}
        </g>
      )}
      {params.solid === "cylinder" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <ellipse cx={105} cy={62} rx={46} ry={12} />
          <line x1={59} y1={62} x2={59} y2={148} />
          <line x1={151} y1={62} x2={151} y2={148} />
          <path d="M 59 148 A 46 12 0 0 0 151 148" />
          <line x1={105} y1={62} x2={151} y2={62} strokeDasharray="3,3" />
          {d.r ? <Lab x={128} y={56} text={`r = ${d.r}`} size={9} /> : null}
          {d.h ? <Lab x={160} y={108} text={d.h} size={10} anchor="start" /> : null}
        </g>
      )}
      {params.solid === "triPrism" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <polygon points="45,140 45,70 105,140" />
          <line x1={45} y1={70} x2={125} y2={70} />
          <line x1={105} y1={140} x2={185} y2={140} />
          <line x1={125} y1={70} x2={185} y2={140} />
          <line x1={45} y1={140} x2={125} y2={140} strokeDasharray="3,3" />
          {d.base ? <Lab x={75} y={156} text={d.base} size={10} /> : null}
          {d.height ? <Lab x={36} y={108} text={d.height} size={10} anchor="end" /> : null}
          {d.length ? <Lab x={150} y={130} text={d.length} size={10} /> : null}
        </g>
      )}
      {params.solid === "pyramid" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <polygon points="100,38 55,152 148,152" />
          <line x1={100} y1={38} x2={172} y2={126} />
          <line x1={55} y1={152} x2={80} y2={126} strokeDasharray="3,3" />
          <line x1={80} y1={126} x2={172} y2={126} strokeDasharray="3,3" />
          <line x1={100} y1={38} x2={124} y2={152} strokeDasharray="3,3" />
          {d.base ? <Lab x={101} y={166} text={d.base} size={10} /> : null}
          {d.slant ? <Lab x={140} y={100} text={d.slant} size={10} /> : null}
          {d.height ? <Lab x={94} y={100} text={d.height} size={9} anchor="end" /> : null}
        </g>
      )}
      {params.solid === "cone" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <line x1={100} y1={40} x2={52} y2={148} />
          <line x1={100} y1={40} x2={148} y2={148} />
          <ellipse cx={100} cy={148} rx={48} ry={11} />
          <line x1={100} y1={40} x2={100} y2={148} strokeDasharray="3,3" />
          <line x1={100} y1={148} x2={148} y2={148} strokeDasharray="3,3" />
          {d.slant ? <Lab x={132} y={92} text={d.slant} size={10} /> : null}
          {d.r ? <Lab x={124} y={142} text={d.r} size={9} /> : null}
          {d.height ? <Lab x={94} y={100} text={d.height} size={9} anchor="end" /> : null}
        </g>
      )}
      {params.solid === "sphere" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <circle cx={100} cy={100} r={56} />
          <ellipse cx={100} cy={100} rx={56} ry={15} />
          <line x1={100} y1={100} x2={140} y2={72} />
          {d.r ? <Lab x={126} y={66} text={`r = ${d.r}`} size={10} /> : null}
        </g>
      )}
      <Lab x={100} y={192} text={dimsCaption(d)} size={8} />
    </svg>
  );
}

// ── NetFigure ─────────────────────────────────────────────────────────────────

export function NetFigureSVG({ params }: { params: NetFigureParams }) {
  const u = 30;
  const sq = (x: number, y: number, w: number, h: number, key: number) => (
    <rect key={key} x={x} y={y} width={w} height={h} fill="none" stroke={INK} strokeWidth={1.3} />
  );
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      {params.solid === "cube" && (
        <g>
          {sq(70, 20, u, u, 0)}
          {sq(40, 50, u, u, 1)}{sq(70, 50, u, u, 2)}{sq(100, 50, u, u, 3)}{sq(130, 50, u, u, 4)}
          {sq(70, 80, u, u, 5)}
        </g>
      )}
      {params.solid === "rectPrism" && (
        <g>
          {sq(60, 26, 40, 26, 0)}
          {sq(20, 52, 40, 52, 1)}{sq(60, 52, 40, 52, 2)}{sq(100, 52, 40, 52, 3)}{sq(140, 52, 40, 52, 4)}
          {sq(60, 104, 40, 26, 5)}
        </g>
      )}
      {params.solid === "triPrism" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <rect x={30} y={70} width={45} height={55} />
          <rect x={75} y={70} width={45} height={55} />
          <rect x={120} y={70} width={45} height={55} />
          <polygon points="75,70 120,70 97.5,35" />
          <polygon points="75,125 120,125 97.5,160" />
        </g>
      )}
      {params.solid === "sqPyramid" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <rect x={72} y={72} width={52} height={52} />
          <polygon points="72,72 124,72 98,28" />
          <polygon points="72,124 124,124 98,168" />
          <polygon points="72,72 72,124 28,98" />
          <polygon points="124,72 124,124 168,98" />
        </g>
      )}
      {params.solid === "cylinder" && (
        <g stroke={INK} strokeWidth={1.3} fill="none">
          <circle cx={100} cy={42} r={24} />
          <rect x={52} y={66} width={96} height={64} />
          <circle cx={100} cy={154} r={24} />
        </g>
      )}
      {params.edgeLabel ? <Lab x={100} y={192} text={params.edgeLabel} size={9} /> : null}
    </svg>
  );
}

// ── SketchFigure ──────────────────────────────────────────────────────────────

export function SketchFigureSVG({ params }: { params: SketchFigureParams }) {
  return (
    <svg viewBox="0 0 200 200" width={190} height={190} role="img">
      <polygon points="30,100 138,72 182,128 74,156" fill="#f1f5f9" stroke={INK} strokeWidth={1.2} />
      {params.planeLabel ? <Lab x={168} y={140} text={params.planeLabel} size={11} anchor="start" /> : null}
      {(params.lines ?? []).map((l, i) => (
        <g key={i}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={INK} strokeWidth={1.3} strokeDasharray={l.dashed ? "4,3" : undefined} />
          {l.label ? <Lab x={l.x2 + 4} y={l.y2} text={l.label} size={10} anchor="start" /> : null}
        </g>
      ))}
      {params.points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={2.6} fill={INK} />
          <Lab x={p.x + 5} y={p.y - 5} text={p.label} size={10} anchor="start" />
        </g>
      ))}
    </svg>
  );
}

// ── AngleFigure ───────────────────────────────────────────────────────────────

export function AngleFigureSVG({ params }: { params: AngleFigureParams }) {
  const [l0, l1, l2] = [params.labels[0] ?? null, params.labels[1] ?? null, params.labels[2] ?? null];
  return (
    <svg viewBox="0 0 200 200" width={170} height={170} role="img">
      {params.form === "complementary" && (
        <g stroke={INK} strokeWidth={1.4} fill="none">
          <line x1={50} y1={150} x2={160} y2={150} />
          <line x1={50} y1={150} x2={50} y2={45} />
          <line x1={50} y1={150} x2={125} y2={75} />
          {rightAngleAt({ x: 50, y: 150 }, { x: 160, y: 150 }, { x: 50, y: 45 })}
          {l0 ? <Lab x={92} y={140} text={l0} size={9} /> : null}
          {l1 ? <Lab x={62} y={92} text={l1} size={9} /> : null}
        </g>
      )}
      {params.form === "supplementary" && (
        <g stroke={INK} strokeWidth={1.4} fill="none">
          <line x1={30} y1={130} x2={175} y2={130} />
          <line x1={100} y1={130} x2={155} y2={60} />
          {l0 ? <Lab x={66} y={120} text={l0} size={9} /> : null}
          {l1 ? <Lab x={138} y={112} text={l1} size={9} /> : null}
        </g>
      )}
      {params.form === "vertical" && (
        <g stroke={INK} strokeWidth={1.4} fill="none">
          <line x1={45} y1={45} x2={160} y2={155} />
          <line x1={160} y1={45} x2={45} y2={155} />
          {params.labels[0] ? <Lab x={102} y={62} text={params.labels[0]} size={9} /> : null}
          {params.labels[1] ? <Lab x={138} y={104} text={params.labels[1]} size={9} /> : null}
          {params.labels[2] ? <Lab x={102} y={146} text={params.labels[2]} size={9} /> : null}
          {params.labels[3] ? <Lab x={66} y={104} text={params.labels[3]} size={9} /> : null}
        </g>
      )}
      {params.form === "bisector" && (
        <g stroke={INK} strokeWidth={1.4} fill="none">
          <line x1={45} y1={150} x2={165} y2={150} />
          <line x1={45} y1={150} x2={120} y2={55} />
          <line x1={45} y1={150} x2={140} y2={92} strokeDasharray="4,3" />
          {l0 ? <Lab x={104} y={140} text={l0} size={9} /> : null}
          {l1 ? <Lab x={98} y={100} text={l1} size={9} /> : null}
          {l2 ? <Lab x={70} y={80} text={l2} size={9} /> : null}
        </g>
      )}
    </svg>
  );
}

// ── PatternFigure ─────────────────────────────────────────────────────────────

export function PatternFigureSVG({ params }: { params: PatternFigureParams }) {
  // Draw each figure as triangular rows of dots (row r has r dots), truncated
  // if a count is not triangular (fill rows greedily).
  const figW = 200 / Math.max(params.counts.length, 1);
  return (
    <svg viewBox="0 0 200 120" width={220} height={130} role="img">
      {params.counts.map((count, fi) => {
        const dots = [];
        let remaining = count;
        let row = 1;
        let placed = 0;
        const cx0 = fi * figW + figW / 2;
        while (remaining > 0) {
          const inRow = Math.min(row, remaining);
          for (let i = 0; i < inRow; i++) {
            dots.push(
              <circle key={`${row}-${i}`} cx={cx0 + (i - (row - 1) / 2) * 11} cy={18 + (row - 1) * 12} r={3} fill={INK} />
            );
            placed++;
          }
          remaining -= inRow;
          row++;
        }
        void placed;
        return (
          <g key={fi}>
            {dots}
            <Lab x={cx0} y={112} text={`Figure ${fi + 1}`} size={8} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function GeometryFigureSVG({ params }: { params: GeometryDiagramParams }) {
  switch (params.kind) {
    case "TriangleFigure": return <TriangleFigureSVG params={params} />;
    case "PolygonFigure": return <PolygonFigureSVG params={params} />;
    case "GridFigure": return <GridFigureSVG params={params} />;
    case "TransversalFigure": return <TransversalFigureSVG params={params} />;
    case "TangentFigure": return <TangentFigureSVG params={params} />;
    case "SolidFigure": return <SolidFigureSVG params={params} />;
    case "NetFigure": return <NetFigureSVG params={params} />;
    case "SketchFigure": return <SketchFigureSVG params={params} />;
    case "AngleFigure": return <AngleFigureSVG params={params} />;
    case "PatternFigure": return <PatternFigureSVG params={params} />;
    case "ShadedSector": return null; // handled by the existing sector renderer
  }
}

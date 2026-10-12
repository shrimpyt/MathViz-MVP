// GeometryPdfDiagrams.tsx
// PDF (@react-pdf/renderer) twins of GeometryDiagrams.tsx for the geometry
// diagram kinds introduced with the Topic 1/2/3/5/6/8/9/12/13/14/15
// generators. Same layouts and labels as the web renderers; text uses the
// WorksheetSerif (DejaVu) family registered by PdfDocument so math glyphs
// (∠, △, √, π, ⁻…) survive in print.

import React from "react";
import { Svg, Circle, Line, Path, Text, Polygon, Rect, Ellipse } from "@react-pdf/renderer";
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
const FONT = "WorksheetSerif";

function Lab({ x, y, text, size = 8 }: { x: number; y: number; text: string; size?: number }) {
  return (
    <Text x={x - 3} y={y + 3} style={{ fontSize: size, fontFamily: FONT, color: INK }}>
      {text}
    </Text>
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
        <Path key={i} d={`M ${cx - ux * 4 - px * 3} ${cy - uy * 4 - py * 3} L ${cx + px} ${cy + py} L ${cx - ux * 4 + px * 3} ${cy - uy * 4 + py * 3}`} stroke={INK} strokeWidth={1} fill="none" />
      );
    } else {
      out.push(
        <Line key={i} x1={cx - px * 4} y1={cy - py * 4} x2={cx + px * 4} y2={cy + py * 4} stroke={INK} strokeWidth={1} />
      );
    }
  }
  return out;
}

type PtLike = { x: number; y: number };
function rightAngleAt(v: PtLike, p1: PtLike, p2: PtLike) {
  const s = 11;
  const n1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
  const n2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
  const u1 = { x: (p1.x - v.x) / n1, y: (p1.y - v.y) / n1 };
  const u2 = { x: (p2.x - v.x) / n2, y: (p2.y - v.y) / n2 };
  const a = { x: v.x + u1.x * s, y: v.y + u1.y * s };
  const b = { x: a.x + u2.x * s, y: a.y + u2.y * s };
  const c = { x: v.x + u2.x * s, y: v.y + u2.y * s };
  return <Path d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`} stroke={INK} strokeWidth={0.9} fill="none" />;
}

// ── TriangleFigure ────────────────────────────────────────────────────────────

export function PdfTriangleFigureSVG({ params }: { params: TriangleFigureParams }) {
  const P = byLabel(params.points);
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      {params.segments.map((s, i) => {
        const a = P.get(s[0]);
        const b = P.get(s[1]);
        return a && b ? <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={1.2} /> : null;
      })}
      {(params.dashed ?? []).map((s, i) => {
        const a = P.get(s[0]);
        const b = P.get(s[1]);
        return a && b ? <Line key={`d${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} strokeWidth={1} strokeDasharray="4,3" /> : null;
      })}
      {Object.entries(params.ticks ?? {}).map(([k, c]) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        return a && b ? <React.Fragment key={k}>{ticksAt(a, b, c, false)}</React.Fragment> : null;
      })}
      {(params.parallelMarks ?? []).map((k) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        return a && b ? <React.Fragment key={k}>{ticksAt(a, b, 1, true)}</React.Fragment> : null;
      })}
      {(params.rightAngles ?? []).map((v) => {
        const vp = P.get(v);
        if (!vp) return null;
        const nbrs = params.segments.filter((s) => s.includes(v)).map((s) => P.get(s[0] === v ? s[1] : s[0])!);
        return nbrs.length >= 2 ? <React.Fragment key={v}>{rightAngleAt(vp, nbrs[0], nbrs[1])}</React.Fragment> : null;
      })}
      {Object.entries(params.sideLabels ?? {}).map(([k, text]) => {
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        if (!a || !b || !text) return null;
        const m = mid(a, b);
        return <Lab key={k} x={m.x} y={m.y - 5} text={text} />;
      })}
      {Object.entries(params.angleLabels ?? {}).map(([k, text]) => {
        const v = P.get(k);
        return v && text ? <Lab key={k} x={v.x + 10} y={v.y + 12} text={text} /> : null;
      })}
      {params.points.map((p) => (
        <React.Fragment key={p.label}>
          <Circle cx={p.x} cy={p.y} r={2.2} fill={INK} />
          <Lab x={p.x + 7} y={p.y - 5} text={p.label} size={9} />
        </React.Fragment>
      ))}
      {(params.extraLabels ?? []).map((l, i) => (
        <Lab key={i} x={l.x} y={l.y} text={l.text} />
      ))}
    </Svg>
  );
}

// ── PolygonFigure ─────────────────────────────────────────────────────────────

export function PdfPolygonFigureSVG({ params }: { params: PolygonFigureParams }) {
  const V = params.vertices;
  const P = byLabel(V);
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      <Polygon points={V.map((p) => `${p.x},${p.y}`).join(" ")} stroke={INK} strokeWidth={1.2} fill="none" />
      {(params.diagonals ?? []).map(([i, j], k) => (
        <Line key={k} x1={V[i].x} y1={V[i].y} x2={V[j].x} y2={V[j].y} stroke={INK} strokeWidth={0.9} strokeDasharray="4,3" />
      ))}
      {(params.dashedSegments ?? []).map((s, i) => (
        <React.Fragment key={i}>
          <Line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={INK} strokeWidth={0.9} strokeDasharray="4,3" />
          {s.label ? <Lab x={(s.x1 + s.x2) / 2 + 5} y={(s.y1 + s.y2) / 2} text={s.label} /> : null}
        </React.Fragment>
      ))}
      {Object.entries(params.sideLabels ?? {}).map(([k, text]) => {
        if (!text) return null;
        const a = P.get(k[0]);
        const b = P.get(k[1]);
        if (!a || !b) return null;
        const m = mid(a, b);
        return <Lab key={k} x={m.x} y={m.y - 5} text={text} />;
      })}
      {Object.entries(params.angleLabels ?? {}).map(([k, text]) => {
        const v = P.get(k);
        if (!v || !text) return null;
        const x = v.x + (100 - v.x) * 0.22;
        const y = v.y + (104 - v.y) * 0.22;
        return <Lab key={k} x={x} y={y} text={text} />;
      })}
      {(params.rightAngles ?? []).map((v) => {
        const idx = V.findIndex((p) => p.label === v);
        if (idx < 0) return null;
        const prev = V[(idx + V.length - 1) % V.length];
        const next = V[(idx + 1) % V.length];
        return <React.Fragment key={v}>{rightAngleAt(V[idx], prev, next)}</React.Fragment>;
      })}
      {params.center ? (
        <React.Fragment>
          <Circle cx={params.center.x} cy={params.center.y} r={2} fill={INK} />
          {params.center.label ? <Lab x={params.center.x + 6} y={params.center.y - 4} text={params.center.label} /> : null}
        </React.Fragment>
      ) : null}
      {V.map((p) => (
        <React.Fragment key={p.label}>
          <Circle cx={p.x} cy={p.y} r={2} fill={INK} />
          <Lab x={p.x + 5} y={p.y - 4} text={p.label} size={9} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

// ── GridFigure ────────────────────────────────────────────────────────────────

const GC = 100;
const GS = 10;
const gx = (x: number) => GC + x * GS;
const gy = (y: number) => GC - y * GS;

export function PdfGridFigureSVG({ params }: { params: GridFigureParams }) {
  const gridLines = [];
  for (let i = 0; i <= 16; i++) {
    const p = 20 + i * 10;
    gridLines.push(<Line key={`v${i}`} x1={p} y1={20} x2={p} y2={180} stroke={GRID} strokeWidth={0.5} />);
    gridLines.push(<Line key={`h${i}`} x1={20} y1={p} x2={180} y2={p} stroke={GRID} strokeWidth={0.5} />);
  }
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      {gridLines}
      <Line x1={20} y1={GC} x2={180} y2={GC} stroke={FAINT} strokeWidth={1} />
      <Line x1={GC} y1={20} x2={GC} y2={180} stroke={FAINT} strokeWidth={1} />
      {(params.lines ?? []).map((l, i) => (
        <Line key={i} x1={gx(l.x1)} y1={gy(l.y1)} x2={gx(l.x2)} y2={gy(l.y2)} stroke={INK} strokeWidth={1} strokeDasharray={l.dashed ? "4,3" : undefined} />
      ))}
      {(params.polygons ?? []).map((poly, i) => (
        <Polygon
          key={i}
          points={poly.points.map((p) => `${gx(p.x)},${gy(p.y)}`).join(" ")}
          stroke={INK}
          strokeWidth={1.2}
          fill="none"
          strokeDasharray={poly.dashed ? "5,3" : undefined}
        />
      ))}
      {(params.polygons ?? []).flatMap((poly, i) =>
        poly.points.map((p, j) => (
          <React.Fragment key={`${i}-${j}`}>
            <Circle cx={gx(p.x)} cy={gy(p.y)} r={2.2} fill={INK} />
            <Lab x={gx(p.x) + 5} y={gy(p.y) - 4} text={p.label} />
          </React.Fragment>
        ))
      )}
      {(params.points ?? []).map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={gx(p.x)} cy={gy(p.y)} r={2.4} fill={INK} />
          <Lab x={gx(p.x) + 5} y={gy(p.y) - 4} text={p.label} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

// ── TransversalFigure ─────────────────────────────────────────────────────────

export function PdfTransversalFigureSVG({ params }: { params: TransversalFigureParams }) {
  const T = { x: 86, y: 72 };
  const B = { x: 122, y: 140 };
  const pos = [
    { x: T.x - 14, y: T.y - 8 }, { x: T.x + 14, y: T.y - 8 },
    { x: T.x - 14, y: T.y + 14 }, { x: T.x + 16, y: T.y + 14 },
    { x: B.x - 14, y: B.y - 8 }, { x: B.x + 14, y: B.y - 8 },
    { x: B.x - 14, y: B.y + 14 }, { x: B.x + 16, y: B.y + 14 },
  ];
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      <Line x1={22} y1={72} x2={188} y2={72} stroke={INK} strokeWidth={1.2} />
      <Line x1={22} y1={140} x2={188} y2={140} stroke={INK} strokeWidth={1.2} />
      <Line x1={64} y1={26} x2={146} y2={182} stroke={INK} strokeWidth={1.2} />
      {params.parallel ? (
        <React.Fragment>
          <Path d="M 100 67 L 106 72 L 100 77" stroke={INK} strokeWidth={1} fill="none" />
          <Path d="M 106 135 L 112 140 L 106 145" stroke={INK} strokeWidth={1} fill="none" />
        </React.Fragment>
      ) : null}
      <Lab x={28} y={64} text="l" size={10} />
      <Lab x={28} y={132} text="m" size={10} />
      {params.labels.map((text, i) => (text ? <Lab key={i} x={pos[i].x} y={pos[i].y} text={text} /> : null))}
    </Svg>
  );
}

// ── TangentFigure ─────────────────────────────────────────────────────────────

export function PdfTangentFigureSVG({ params }: { params: TangentFigureParams }) {
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
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      <Circle cx={O.x} cy={O.y} r={R} stroke={INK} strokeWidth={1.2} fill="none" />
      <Line x1={O.x} y1={O.y} x2={P.x} y2={P.y} stroke={FAINT} strokeWidth={0.9} strokeDasharray="4,3" />
      <Line x1={O.x} y1={O.y} x2={T1.x} y2={T1.y} stroke={INK} strokeWidth={1.1} />
      <Line x1={T1.x} y1={T1.y} x2={P.x} y2={P.y} stroke={INK} strokeWidth={1.2} />
      {params.twoTangents ? (
        <React.Fragment>
          <Line x1={O.x} y1={O.y} x2={T2.x} y2={T2.y} stroke={INK} strokeWidth={1.1} />
          <Line x1={T2.x} y1={T2.y} x2={P.x} y2={P.y} stroke={INK} strokeWidth={1.2} />
        </React.Fragment>
      ) : null}
      {params.showRightAngle ? rightAngleAt(T1, O, P) : null}
      <Circle cx={O.x} cy={O.y} r={2.2} fill={INK} />
      <Circle cx={P.x} cy={P.y} r={2.2} fill={INK} />
      <Lab x={O.x - 8} y={O.y + 13} text="O" size={9} />
      <Lab x={P.x + 3} y={P.y - 5} text="P" size={9} />
      <Lab x={T1.x + 4} y={T1.y - 4} text={params.twoTangents ? "A" : "T"} size={9} />
      {params.twoTangents ? <Lab x={T2.x + 4} y={T2.y + 11} text="B" size={9} /> : null}
      {params.radiusLabel ? <Lab x={ra.x - 8} y={ra.y} text={params.radiusLabel} /> : null}
      {params.tangentLabel ? <Lab x={(T1.x + P.x) / 2} y={(T1.y + P.y) / 2 - 6} text={params.tangentLabel} /> : null}
      {params.extLabel ? <Lab x={(O.x + P.x) / 2} y={O.y + 12} text={params.extLabel} /> : null}
      {params.angleP ? <Lab x={P.x - 18} y={P.y - 8} text={params.angleP} /> : null}
    </Svg>
  );
}

// ── SolidFigure ───────────────────────────────────────────────────────────────

export function PdfSolidFigureSVG({ params }: { params: SolidFigureParams }) {
  const d = params.dims;
  const caption = Object.entries(d).map(([k, v]) => `${k} = ${v}`).join(",  ");
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      {params.solid === "rectPrism" && (
        <React.Fragment>
          <Rect x={55} y={85} width={95} height={62} stroke={INK} strokeWidth={1.1} fill="none" />
          <Rect x={83} y={57} width={95} height={62} stroke={INK} strokeWidth={1.1} fill="none" />
          <Line x1={55} y1={85} x2={83} y2={57} stroke={INK} strokeWidth={1.1} />
          <Line x1={150} y1={85} x2={178} y2={57} stroke={INK} strokeWidth={1.1} />
          <Line x1={55} y1={147} x2={83} y2={119} stroke={INK} strokeWidth={1.1} />
          <Line x1={150} y1={147} x2={178} y2={119} stroke={INK} strokeWidth={1.1} />
          {d.l ? <Lab x={102} y={160} text={d.l} size={9} /> : null}
          {d.h ? <Lab x={158} y={118} text={d.h} size={9} /> : null}
          {d.w ? <Lab x={64} y={74} text={d.w} size={9} /> : null}
        </React.Fragment>
      )}
      {params.solid === "cylinder" && (
        <React.Fragment>
          <Ellipse cx={105} cy={62} rx={46} ry={12} stroke={INK} strokeWidth={1.1} fill="none" />
          <Line x1={59} y1={62} x2={59} y2={148} stroke={INK} strokeWidth={1.1} />
          <Line x1={151} y1={62} x2={151} y2={148} stroke={INK} strokeWidth={1.1} />
          <Path d="M 59 148 A 46 12 0 0 0 151 148" stroke={INK} strokeWidth={1.1} fill="none" />
          <Line x1={105} y1={62} x2={151} y2={62} stroke={INK} strokeWidth={0.8} strokeDasharray="3,3" />
          {d.r ? <Lab x={126} y={55} text={`r = ${d.r}`} /> : null}
          {d.h ? <Lab x={158} y={106} text={d.h} size={9} /> : null}
        </React.Fragment>
      )}
      {params.solid === "triPrism" && (
        <React.Fragment>
          <Polygon points="45,140 45,70 105,140" stroke={INK} strokeWidth={1.1} fill="none" />
          <Line x1={45} y1={70} x2={125} y2={70} stroke={INK} strokeWidth={1.1} />
          <Line x1={105} y1={140} x2={185} y2={140} stroke={INK} strokeWidth={1.1} />
          <Line x1={125} y1={70} x2={185} y2={140} stroke={INK} strokeWidth={1.1} />
          {d.base ? <Lab x={75} y={154} text={d.base} size={9} /> : null}
          {d.length ? <Lab x={148} y={128} text={d.length} size={9} /> : null}
        </React.Fragment>
      )}
      {params.solid === "pyramid" && (
        <React.Fragment>
          <Polygon points="100,38 55,152 148,152" stroke={INK} strokeWidth={1.1} fill="none" />
          <Line x1={100} y1={38} x2={172} y2={126} stroke={INK} strokeWidth={1.1} />
          <Line x1={100} y1={38} x2={124} y2={152} stroke={INK} strokeWidth={0.8} strokeDasharray="3,3" />
          {d.base ? <Lab x={101} y={164} text={d.base} size={9} /> : null}
          {d.slant ? <Lab x={138} y={98} text={d.slant} size={9} /> : null}
          {d.height ? <Lab x={92} y={98} text={d.height} /> : null}
        </React.Fragment>
      )}
      {params.solid === "cone" && (
        <React.Fragment>
          <Line x1={100} y1={40} x2={52} y2={148} stroke={INK} strokeWidth={1.1} />
          <Line x1={100} y1={40} x2={148} y2={148} stroke={INK} strokeWidth={1.1} />
          <Ellipse cx={100} cy={148} rx={48} ry={11} stroke={INK} strokeWidth={1.1} fill="none" />
          <Line x1={100} y1={40} x2={100} y2={148} stroke={INK} strokeWidth={0.8} strokeDasharray="3,3" />
          {d.slant ? <Lab x={130} y={90} text={d.slant} size={9} /> : null}
          {d.r ? <Lab x={122} y={140} text={d.r} /> : null}
          {d.height ? <Lab x={92} y={98} text={d.height} /> : null}
        </React.Fragment>
      )}
      {params.solid === "sphere" && (
        <React.Fragment>
          <Circle cx={100} cy={100} r={56} stroke={INK} strokeWidth={1.1} fill="none" />
          <Ellipse cx={100} cy={100} rx={56} ry={15} stroke={INK} strokeWidth={1} fill="none" />
          <Line x1={100} y1={100} x2={140} y2={72} stroke={INK} strokeWidth={1} />
          {d.r ? <Lab x={124} y={64} text={`r = ${d.r}`} size={9} /> : null}
        </React.Fragment>
      )}
      <Lab x={70} y={190} text={caption} size={7} />
    </Svg>
  );
}

// ── NetFigure ─────────────────────────────────────────────────────────────────

export function PdfNetFigureSVG({ params }: { params: NetFigureParams }) {
  const u = 30;
  const sq = (x: number, y: number, w: number, h: number, key: number) => (
    <Rect key={key} x={x} y={y} width={w} height={h} stroke={INK} strokeWidth={1.1} fill="none" />
  );
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      {params.solid === "cube" && (
        <React.Fragment>
          {sq(70, 20, u, u, 0)}
          {sq(40, 50, u, u, 1)}{sq(70, 50, u, u, 2)}{sq(100, 50, u, u, 3)}{sq(130, 50, u, u, 4)}
          {sq(70, 80, u, u, 5)}
        </React.Fragment>
      )}
      {params.solid === "rectPrism" && (
        <React.Fragment>
          {sq(60, 26, 40, 26, 0)}
          {sq(20, 52, 40, 52, 1)}{sq(60, 52, 40, 52, 2)}{sq(100, 52, 40, 52, 3)}{sq(140, 52, 40, 52, 4)}
          {sq(60, 104, 40, 26, 5)}
        </React.Fragment>
      )}
      {params.solid === "triPrism" && (
        <React.Fragment>
          <Rect x={30} y={70} width={45} height={55} stroke={INK} strokeWidth={1.1} fill="none" />
          <Rect x={75} y={70} width={45} height={55} stroke={INK} strokeWidth={1.1} fill="none" />
          <Rect x={120} y={70} width={45} height={55} stroke={INK} strokeWidth={1.1} fill="none" />
          <Polygon points="75,70 120,70 97.5,35" stroke={INK} strokeWidth={1.1} fill="none" />
          <Polygon points="75,125 120,125 97.5,160" stroke={INK} strokeWidth={1.1} fill="none" />
        </React.Fragment>
      )}
      {params.solid === "sqPyramid" && (
        <React.Fragment>
          <Rect x={72} y={72} width={52} height={52} stroke={INK} strokeWidth={1.1} fill="none" />
          <Polygon points="72,72 124,72 98,28" stroke={INK} strokeWidth={1.1} fill="none" />
          <Polygon points="72,124 124,124 98,168" stroke={INK} strokeWidth={1.1} fill="none" />
          <Polygon points="72,72 72,124 28,98" stroke={INK} strokeWidth={1.1} fill="none" />
          <Polygon points="124,72 124,124 168,98" stroke={INK} strokeWidth={1.1} fill="none" />
        </React.Fragment>
      )}
      {params.solid === "cylinder" && (
        <React.Fragment>
          <Circle cx={100} cy={42} r={24} stroke={INK} strokeWidth={1.1} fill="none" />
          <Rect x={52} y={66} width={96} height={64} stroke={INK} strokeWidth={1.1} fill="none" />
          <Circle cx={100} cy={154} r={24} stroke={INK} strokeWidth={1.1} fill="none" />
        </React.Fragment>
      )}
      {params.edgeLabel ? <Lab x={85} y={190} text={params.edgeLabel} /> : null}
    </Svg>
  );
}

// ── SketchFigure ──────────────────────────────────────────────────────────────

export function PdfSketchFigureSVG({ params }: { params: SketchFigureParams }) {
  return (
    <Svg viewBox="0 0 200 200" width={150} height={150}>
      <Polygon points="30,100 138,72 182,128 74,156" stroke={INK} strokeWidth={1.1} fill="none" />
      {params.planeLabel ? <Lab x={164} y={138} text={params.planeLabel} size={10} /> : null}
      {(params.lines ?? []).map((l, i) => (
        <React.Fragment key={i}>
          <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={INK} strokeWidth={1.1} strokeDasharray={l.dashed ? "4,3" : undefined} />
          {l.label ? <Lab x={l.x2 + 4} y={l.y2} text={l.label} size={9} /> : null}
        </React.Fragment>
      ))}
      {params.points.map((p) => (
        <React.Fragment key={p.label}>
          <Circle cx={p.x} cy={p.y} r={2.4} fill={INK} />
          <Lab x={p.x + 5} y={p.y - 5} text={p.label} size={9} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

// ── AngleFigure ───────────────────────────────────────────────────────────────

export function PdfAngleFigureSVG({ params }: { params: AngleFigureParams }) {
  const L = params.labels;
  return (
    <Svg viewBox="0 0 200 200" width={140} height={140}>
      {params.form === "complementary" && (
        <React.Fragment>
          <Line x1={50} y1={150} x2={160} y2={150} stroke={INK} strokeWidth={1.2} />
          <Line x1={50} y1={150} x2={50} y2={45} stroke={INK} strokeWidth={1.2} />
          <Line x1={50} y1={150} x2={125} y2={75} stroke={INK} strokeWidth={1.2} />
          {rightAngleAt({ x: 50, y: 150 }, { x: 160, y: 150 }, { x: 50, y: 45 })}
          {L[0] ? <Lab x={92} y={140} text={L[0]} /> : null}
          {L[1] ? <Lab x={62} y={92} text={L[1]} /> : null}
        </React.Fragment>
      )}
      {params.form === "supplementary" && (
        <React.Fragment>
          <Line x1={30} y1={130} x2={175} y2={130} stroke={INK} strokeWidth={1.2} />
          <Line x1={100} y1={130} x2={155} y2={60} stroke={INK} strokeWidth={1.2} />
          {L[0] ? <Lab x={66} y={120} text={L[0]} /> : null}
          {L[1] ? <Lab x={136} y={112} text={L[1]} /> : null}
        </React.Fragment>
      )}
      {params.form === "vertical" && (
        <React.Fragment>
          <Line x1={45} y1={45} x2={160} y2={155} stroke={INK} strokeWidth={1.2} />
          <Line x1={160} y1={45} x2={45} y2={155} stroke={INK} strokeWidth={1.2} />
          {L[0] ? <Lab x={100} y={60} text={L[0]} /> : null}
          {L[1] ? <Lab x={134} y={102} text={L[1]} /> : null}
          {L[2] ? <Lab x={100} y={144} text={L[2]} /> : null}
          {L[3] ? <Lab x={62} y={102} text={L[3]} /> : null}
        </React.Fragment>
      )}
      {params.form === "bisector" && (
        <React.Fragment>
          <Line x1={45} y1={150} x2={165} y2={150} stroke={INK} strokeWidth={1.2} />
          <Line x1={45} y1={150} x2={120} y2={55} stroke={INK} strokeWidth={1.2} />
          <Line x1={45} y1={150} x2={140} y2={92} stroke={INK} strokeWidth={1} strokeDasharray="4,3" />
          {L[0] ? <Lab x={102} y={140} text={L[0]} /> : null}
          {L[1] ? <Lab x={96} y={100} text={L[1]} /> : null}
        </React.Fragment>
      )}
    </Svg>
  );
}

// ── PatternFigure ─────────────────────────────────────────────────────────────

export function PdfPatternFigureSVG({ params }: { params: PatternFigureParams }) {
  const figW = 200 / Math.max(params.counts.length, 1);
  return (
    <Svg viewBox="0 0 200 120" width={170} height={100}>
      {params.counts.map((count, fi) => {
        const dots = [];
        let remaining = count;
        let row = 1;
        const cx0 = fi * figW + figW / 2;
        while (remaining > 0) {
          const inRow = Math.min(row, remaining);
          for (let i = 0; i < inRow; i++) {
            dots.push(<Circle key={`${row}-${i}`} cx={cx0 + (i - (row - 1) / 2) * 11} cy={18 + (row - 1) * 12} r={3} fill={INK} />);
          }
          remaining -= inRow;
          row++;
        }
        return (
          <React.Fragment key={fi}>
            {dots}
            <Lab x={cx0 - 12} y={108} text={`Figure ${fi + 1}`} size={7} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function PdfGeometryFigureSVG({ params }: { params: GeometryDiagramParams }) {
  switch (params.kind) {
    case "TriangleFigure": return <PdfTriangleFigureSVG params={params} />;
    case "PolygonFigure": return <PdfPolygonFigureSVG params={params} />;
    case "GridFigure": return <PdfGridFigureSVG params={params} />;
    case "TransversalFigure": return <PdfTransversalFigureSVG params={params} />;
    case "TangentFigure": return <PdfTangentFigureSVG params={params} />;
    case "SolidFigure": return <PdfSolidFigureSVG params={params} />;
    case "NetFigure": return <PdfNetFigureSVG params={params} />;
    case "SketchFigure": return <PdfSketchFigureSVG params={params} />;
    case "AngleFigure": return <PdfAngleFigureSVG params={params} />;
    case "PatternFigure": return <PdfPatternFigureSVG params={params} />;
    case "ShadedSector": return null; // use the existing PdfShadedSectorSVG
  }
}

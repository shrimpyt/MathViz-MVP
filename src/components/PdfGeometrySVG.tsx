import React from 'react';
import { Svg, Circle, Line, Path, Text, Polygon, Rect, Ellipse } from '@react-pdf/renderer';
import type {
  InscribedAngleSVGParams,
  TangentSVGParams,
  ChordSVGParams,
  ConcentricSVGParams,
  SectorSVGParams,
  CongruenceSVGParams,
  TrigSVGParams,
  CoordinateSVGParams,
  MeasurementSVGParams,
} from "@/lib/ProblemFactory";
import type { GeometryDiagramParams } from "@/lib/ProblemFactory";
import { PdfGeometryFigureSVG } from "./diagrams/GeometryPdfDiagrams";
import {
  layoutRightTriangle,
  baselineY,
  angleArcPath,
  placePointLabel,
  textBox,
} from "@/lib/labelPlacement";
import { inscribedLabels, tangentLayout, VERTEX_ARC_R, coordinatePairLabels } from "@/lib/geometryDiagramLayout";

const CX = 100;
const CY = 100;
const R = 70;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const a = toRad(angleDeg - 90);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  large = false
) {
  const s = polarToCart(cx, cy, r, startDeg);
  const e = polarToCart(cx, cy, r, endDeg);
  const sweep = endDeg > startDeg ? 1 : 0;
  const largeArc = large ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x} ${e.y}`;
}

function Label({
  x,
  y,
  text,
  offset = { x: 0, y: -6 },
}: {
  x: number;
  y: number;
  text: string;
  offset?: { x: number; y: number };
}) {
  return (
    <Text
      x={x + offset.x - 3}
      y={y + offset.y + 3}
      style={{ fontSize: 8, fontFamily: "Times-Roman", color: "#111111" }}
    >
      {text}
    </Text>
  );
}

// Label drawn centered on (x, y), placed by labelPlacement.
function CLabel({ c, text, size = 8 }: { c: { x: number; y: number }; text: string; size?: number }) {
  return (
    <Text
      x={c.x}
      y={baselineY(c.y, size)}
      textAnchor="middle"
      style={{ fontSize: size, fontFamily: "Times-Roman", color: "#111111" }}
    >
      {text}
    </Text>
  );
}

function CircleBase() {
  return (
    <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#111111" strokeWidth={1.5} />
  );
}

export function PdfInscribedAngleSVG({
  interceptedArc,
  variant,
}: InscribedAngleSVGParams) {
  // Variant: rigid rotation of the whole configuration (8 positions).
  // Arc measures and the angle are unchanged, pure presentation.
  const arcStart = 30 + ((variant ?? 0) % 8) * 45;
  const arcEnd = arcStart + interceptedArc;
  const vertexAngle = arcStart + interceptedArc + 60;

  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const V = polarToCart(CX, CY, R, vertexAngle);
  const largeArc = interceptedArc > 180;
  const L = inscribedLabels(A, B, V, interceptedArc, arcStart);

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Path
        d={arcPath(CX, CY, R, arcStart, arcEnd, largeArc)}
        fill="none"
        stroke="#111111"
        strokeWidth={3}
      />
      <Line x1={V.x} y1={V.y} x2={A.x} y2={A.y} stroke="#111111" strokeWidth={1.2} />
      <Line x1={V.x} y1={V.y} x2={B.x} y2={B.y} stroke="#111111" strokeWidth={1.2} />
      <Path d={angleArcPath(V, A, B, VERTEX_ARC_R)} fill="none" stroke="#111111" strokeWidth={1} />
      {[A, B, V].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#111111" />
      ))}
      {L.map((l) => <CLabel key={l.text} c={l.center} text={l.text} />)}
      {L.filter((l) => l.leader).map((l) => (
        <Line key={`ld-${l.text}`} x1={l.leader![0].x} y1={l.leader![0].y} x2={l.leader![1].x} y2={l.leader![1].y} stroke="#111111" strokeWidth={0.6} />
      ))}
    </Svg>
  );
}

// Similar conversion for CentralAngleSVG, TangentSVG, TwoChordsSVG, TwoSecantsSVG, ConcentricCirclesSVG, ShadedSectorSVG, CongruenceSVG
// Let's implement them properly

export function PdfCentralAngleSVG({ interceptedArc, variant }: { interceptedArc: number; variant?: number }) {
  const arcStart = 30 + ((variant ?? 0) % 8) * 45;
  const arcEnd = arcStart + interceptedArc;
  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const largeArc = interceptedArc > 180;

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Path
        d={arcPath(CX, CY, R, arcStart, arcEnd, largeArc)}
        fill="none"
        stroke="#111111"
        strokeWidth={3}
      />
      <Line x1={CX} y1={CY} x2={A.x} y2={A.y} stroke="#111111" strokeWidth={1.2} />
      <Line x1={CX} y1={CY} x2={B.x} y2={B.y} stroke="#111111" strokeWidth={1.2} />
      <Circle cx={CX} cy={CY} r={2.5} fill="#111111" />
      {[A, B].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#111111" />
      ))}
      <Label x={A.x} y={A.y} text="A" offset={{ x: -7, y: 0 }} />
      <Label x={B.x} y={B.y} text="B" offset={{ x: 7, y: 0 }} />
      <Label x={CX} y={CY} text="O" offset={{ x: -8, y: 0 }} />
      {(() => {
        const mid = polarToCart(CX, CY, R + 12, arcStart + interceptedArc / 2);
        return <Label x={mid.x} y={mid.y} text={`${interceptedArc}°`} offset={{ x: 0, y: 3 }} />;
      })()}
    </Svg>
  );
}

export function PdfTangentSVG({ tangentAngle, variant }: TangentSVGParams) {
  const chordStart = 70 + ((variant ?? 0) % 8) * 45;
  const chordEnd = chordStart + tangentAngle * 2;
  const A = polarToCart(CX, CY, R, chordStart);
  const B = polarToCart(CX, CY, R, chordEnd);
  const T = tangentLayout(A, B, tangentAngle, chordStart);

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Line
        x1={T.t1.x} y1={T.t1.y} x2={T.t2.x} y2={T.t2.y}
        stroke="#6b7280"
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />
      <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#111111" strokeWidth={1.2} />
      <Path
        d={arcPath(CX, CY, R, chordStart, chordEnd)}
        fill="none"
        stroke="#111111"
        strokeWidth={3}
      />
      <Path d={angleArcPath(A, T.t2, B, VERTEX_ARC_R)} fill="none" stroke="#111111" strokeWidth={1} />
      {[A, B].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#111111" />
      ))}
      {T.labels.map((l) => <CLabel key={l.text} c={l.center} text={l.text} />)}
      {T.labels.filter((l) => l.leader).map((l) => (
        <Line key={`ld-${l.text}`} x1={l.leader![0].x} y1={l.leader![0].y} x2={l.leader![1].x} y2={l.leader![1].y} stroke="#111111" strokeWidth={0.6} />
      ))}
    </Svg>
  );
}

export function PdfTwoChordsSVG({ arc1, arc2, variant }: ChordSVGParams) {
  const a0 = 20 + ((variant ?? 0) % 8) * 45, a1 = a0 + arc1, a2 = a1 + 60, a3 = a2 + arc2;
  const A = polarToCart(CX, CY, R, a0);
  const B = polarToCart(CX, CY, R, a1);
  const C = polarToCart(CX, CY, R, a2);
  const D = polarToCart(CX, CY, R, a3);

  function lineIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-6) return { x: CX, y: CY };
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
  }
  const P = lineIntersect(A.x, A.y, C.x, C.y, B.x, B.y, D.x, D.y);

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Path d={arcPath(CX, CY, R, a0, a1)} fill="none" stroke="#111111" strokeWidth={3} />
      <Path d={arcPath(CX, CY, R, a2, a3)} fill="none" stroke="#6b7280" strokeWidth={3} />
      <Line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#111111" strokeWidth={1.2} />
      <Line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#111111" strokeWidth={1.2} />
      <Circle cx={P.x} cy={P.y} r={2.5} fill="#111111" />
      {[A, B, C, D].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#111111" />
      ))}
      {[
        { pt: A, lbl: "A", off: { x: -7, y: 0 } },
        { pt: B, lbl: "B", off: { x: 7, y: 0 } },
        { pt: C, lbl: "C", off: { x: 7, y: 0 } },
        { pt: D, lbl: "D", off: { x: -7, y: 0 } },
      ].map(({ pt, lbl, off }) => (
        <Label key={lbl} x={pt.x} y={pt.y} text={lbl} offset={off} />
      ))}
      {(() => {
        const m1 = polarToCart(CX, CY, R + 12, a0 + arc1 / 2);
        const m2 = polarToCart(CX, CY, R + 12, a2 + arc2 / 2);
        return (
          <>
            <Label x={m1.x} y={m1.y} text={`${arc1}°`} offset={{ x: 0, y: 3 }} />
            <Label x={m2.x} y={m2.y} text={`${arc2}°`} offset={{ x: 0, y: 3 }} />
          </>
        );
      })()}
      <CLabel
        c={placePointLabel(P, textBox("?", 8), {
          obstacles: [[A, C], [B, D]],
          gap: 4,
        })}
        text="?"
      />
    </Svg>
  );
}

export function PdfTwoSecantsSVG({ interceptedArc, variant }: { interceptedArc: number; variant?: number }) {
  const near = 40;
  // Variant: small rotation (-40/0/+40 deg) keeps the arcs opposite the external point.
  const arcStart = 200 + (((variant ?? 0) % 3) - 1) * 40, arcEnd = arcStart + interceptedArc;
  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const C = polarToCart(CX, CY, R, arcStart - near);
  const D = polarToCart(CX, CY, R, arcEnd + near);
  const EX = CX + R + 40, EY = CY;

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Path d={arcPath(CX, CY, R, arcStart, arcEnd)} fill="none" stroke="#111111" strokeWidth={3} />
      <Path
        d={arcPath(CX, CY, R, arcStart - near, arcEnd + near)}
        fill="none"
        stroke="#6b7280"
        strokeWidth={3}
      />
      <Line x1={EX} y1={EY} x2={A.x} y2={A.y} stroke="#111111" strokeWidth={1.2} />
      <Line x1={EX} y1={EY} x2={B.x} y2={B.y} stroke="#111111" strokeWidth={1.2} />
      {[A, B, C, D].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#111111" />
      ))}
      <Circle cx={EX} cy={EY} r={2.5} fill="#111111" />
      <Label x={EX} y={EY} text="P" offset={{ x: 8, y: 0 }} />
      <Label x={EX} y={EY} text="?" offset={{ x: 8, y: 10 }} />
    </Svg>
  );
}

export function PdfConcentricCirclesSVG({ outerR, innerR, variant }: ConcentricSVGParams) {
  const scale = 70 / outerR;
  const scaledOuter = outerR * scale;
  const scaledInner = innerR * scale;

  const ang45 = toRad(((variant ?? 0) % 8) * 45 - 90);
  const oxEnd = CX + scaledOuter * Math.cos(ang45);
  const oyEnd = CY + scaledOuter * Math.sin(ang45);
  const rMidX = CX + (scaledOuter / 2) * Math.cos(ang45);
  const rMidY = CY + (scaledOuter / 2) * Math.sin(ang45);

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Circle cx={CX} cy={CY} r={scaledOuter} fill="#f1f5f9" stroke="#111111" strokeWidth={1.5} />
      <Circle
        cx={CX} cy={CY} r={scaledInner}
        fill="#111111" fillOpacity={0.12}
        stroke="#111111" strokeWidth={1.5}
      />
      <Line
        x1={CX} y1={CY} x2={CX + scaledInner} y2={CY}
        stroke="#111111" strokeWidth={1} strokeDasharray="3,2"
      />
      <Line
        x1={CX} y1={CY} x2={oxEnd} y2={oyEnd}
        stroke="#64748b" strokeWidth={1} strokeDasharray="3,2"
      />
      <Label x={CX + scaledInner / 2} y={CY} text={`r=${innerR}`} offset={{ x: 0, y: -5 }} />
      <Label x={rMidX} y={rMidY} text={`R=${outerR}`} offset={{ x: 6, y: -5 }} />
      <Label
        x={CX} y={CY + scaledOuter + 12}
        text="Shaded = favorable region"
        offset={{ x: -40, y: 0 }}
      />
    </Svg>
  );
}

export function PdfRightTriangleSVG({
  opposite, adjacent, orientation, referenceAnglePos, labels, referenceAngleLabel, variant
}: TrigSVGParams) {
  const width = 130;
  const height = 130;
  // Variant: draw scale and center offset, pure presentation; side ratios,
  // labels, and the reference angle are untouched.
  const v = variant ?? 0;
  const FONT = 10;
  const lay = layoutRightTriangle(
    { opposite, adjacent, orientation, referenceAnglePos, labels, referenceAngleLabel },
    {
      width, height, pad: 20,
      scale: [1, 0.9, 1.06, 0.94, 0.84, 1.12][v % 6],
      offX: [0, 5, -5, 3, -4, 6][v % 6],
      offY: [0, -4, 4, 5, 3, -6][v % 6],
    },
    { fontSize: FONT, arcR: 18, markSize: 10 },
  );
  const [R, B, T] = lay.points;

  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width="130" height="130">
      <Polygon points={`${R.x},${R.y} ${B.x},${B.y} ${T.x},${T.y}`} fill="none" stroke="#111111" strokeWidth={1.5} />
      <Path d={lay.rightMark} fill="none" stroke="#111111" strokeWidth={1.2} />
      {lay.arcs.map((d, i) => <Path key={`arc${i}`} d={d} fill="none" stroke="#111111" strokeWidth={1.5} />)}
      {lay.leaders.map(([a, b], i) => (
        <Line key={`ld${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#111111" strokeWidth={0.6} />
      ))}
      {lay.labels.map((l, i) => (
        <Text
          key={i}
          x={l.center.x}
          y={baselineY(l.center.y, FONT)}
          textAnchor="middle"
          style={{ fontSize: FONT, fontFamily: "Times-Bold", color: "#111111" }}
        >
          {l.text}
        </Text>
      ))}
    </Svg>
  );
}

export function PdfShadedSectorSVG({ sectorAngle, variant }: SectorSVGParams) {
  const startDeg = -90 + ((variant ?? 0) % 8) * 45;
  const endDeg = startDeg + sectorAngle;
  const S = polarToCart(CX, CY, R, startDeg + 90);
  const E = polarToCart(CX, CY, R, endDeg + 90);
  const largeArc = sectorAngle > 180 ? 1 : 0;

  const pathD = [
    `M ${CX} ${CY}`,
    `L ${S.x} ${S.y}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${E.x} ${E.y}`,
    "Z",
  ].join(" ");

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Circle cx={CX} cy={CY} r={R} fill="#f1f5f9" stroke="#111111" strokeWidth={1.5} />
      <Path d={pathD} fill="#111111" fillOpacity={0.12} stroke="#111111" strokeWidth={1.2} />
      {(() => {
        const mid = polarToCart(CX, CY, R * 0.5, startDeg + 90 + sectorAngle / 2);
        return (
          <Text
            x={mid.x - 5} y={mid.y + 3}
            style={{ fontSize: 9, fontFamily: "Times-Roman", color: "#111111" }}
          >
            {sectorAngle}°
          </Text>
        );
      })()}
      <Label x={CX} y={CY + R + 12} text="Shaded = favorable region" offset={{ x: -40, y: 0 }} />
    </Svg>
  );
}

type Pt = { x: number; y: number };

const VERTS_T1: [Pt, Pt, Pt] = [
  { x: 50, y: 38 },
  { x: 18, y: 148 },
  { x: 88, y: 148 },
];
const VERTS_T2: [Pt, Pt, Pt] = [
  { x: 150, y: 38 },
  { x: 182, y: 148 },
  { x: 112, y: 148 },
];

function TickMarks({
  p1, p2, count, color = "#334155",
}: {
  p1: Pt; p2: Pt; count: number; color?: string;
}) {
  if (count === 0) return null;
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tickLen = 5;
  const spacing = 5;
  const totalSpan = (count - 1) * spacing;
  const startT = -totalSpan / 2;

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = startT + i * spacing;
        const cx = mx + ux * t;
        const cy = my + uy * t;
        return (
          <Line
            key={i}
            x1={cx - px * tickLen} y1={cy - py * tickLen}
            x2={cx + px * tickLen} y2={cy + py * tickLen}
            stroke={color} strokeWidth={1.4}
          />
        );
      })}
    </>
  );
}

function AngleArc({ v, p1, p2 }: { v: Pt; p1: Pt; p2: Pt }) {
  const r = 11;
  const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
  const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
  const x1 = v.x + r * Math.cos(a1);
  const y1 = v.y + r * Math.sin(a1);
  const x2 = v.x + r * Math.cos(a2);
  const y2 = v.y + r * Math.sin(a2);
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const sweepFlag = diff > 0 ? 1 : 0;
  return (
    <Path
      d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${x2} ${y2}`}
      fill="none"
      stroke="#111111"
      strokeWidth={1.2}
    />
  );
}

function RightAngleMark({ v, p1, p2 }: { v: Pt; p1: Pt; p2: Pt }) {
  const s = 9;
  const len1 = Math.hypot(p1.x - v.x, p1.y - v.y) || 1;
  const len2 = Math.hypot(p2.x - v.x, p2.y - v.y) || 1;
  const u1 = { x: (p1.x - v.x) / len1, y: (p1.y - v.y) / len1 };
  const u2 = { x: (p2.x - v.x) / len2, y: (p2.y - v.y) / len2 };
  const q1 = { x: v.x + u1.x * s, y: v.y + u1.y * s };
  const q2 = { x: v.x + u2.x * s, y: v.y + u2.y * s };
  const corner = { x: q1.x + u2.x * s, y: q1.y + u2.y * s };
  return (
    <Path
      d={`M ${q1.x} ${q1.y} L ${corner.x} ${corner.y} L ${q2.x} ${q2.y}`}
      fill="none"
      stroke="#111111"
      strokeWidth={1.2}
    />
  );
}

export function PdfCongruenceSVG({
  sideMarks,
  angleMarks,
  rightAngleAt,
  variant,
}: CongruenceSVGParams) {
  // Variant: mirror the pair horizontally (triangles swap sides).
  // Marks, labels, and the congruence relationship are unchanged.
  const mirror = (variant ?? 0) % 2 === 1;
  const M = (pt: Pt): Pt => (mirror ? { x: 200 - pt.x, y: pt.y } : pt);
  const [A, B, C] = VERTS_T1.map(M);
  const [D, E, F] = VERTS_T2.map(M);

  const sides1: [Pt, Pt][] = [[A, B], [B, C], [C, A]];
  const sides2: [Pt, Pt][] = [[D, E], [E, F], [F, D]];
  const verts1 = [A, B, C];
  const verts2 = [D, E, F];
  const neighbors1: [Pt, Pt][] = [[C, B], [A, C], [B, A]];
  const neighbors2: [Pt, Pt][] = [[F, E], [D, F], [E, D]];

  const labels1 = ["A", "B", "C"];
  const labels2 = ["D", "E", "F"];
  const labelOffsets1 = mirror
    ? [{ x: 0, y: -7 }, { x: 8, y: 6 }, { x: -8, y: 6 }]
    : [{ x: 0, y: -7 }, { x: -8, y: 6 }, { x: 8, y: 6 }];
  const labelOffsets2 = mirror
    ? [{ x: 0, y: -7 }, { x: -8, y: 6 }, { x: 8, y: 6 }]
    : [{ x: 0, y: -7 }, { x: 8, y: 6 }, { x: -8, y: 6 }];

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="none"
        stroke="#111111"
        strokeWidth={1.5}
      />
      <Polygon
        points={`${D.x},${D.y} ${E.x},${E.y} ${F.x},${F.y}`}
        fill="none"
        stroke="#111111"
        strokeWidth={1.5}
      />

      {sideMarks.map((count, i) =>
        count > 0 ? (
          <React.Fragment key={i}>
            <TickMarks p1={sides1[i][0]} p2={sides1[i][1]} count={count} color="#111111" />
            <TickMarks p1={sides2[i][0]} p2={sides2[i][1]} count={count} color="#111111" />
          </React.Fragment>
        ) : null
      )}

      {angleMarks.map((marked, i) =>
        marked ? (
          <React.Fragment key={i}>
            <AngleArc v={verts1[i]} p1={neighbors1[i][0]} p2={neighbors1[i][1]} />
            <AngleArc v={verts2[i]} p1={neighbors2[i][0]} p2={neighbors2[i][1]} />
          </React.Fragment>
        ) : null
      )}

      {rightAngleAt >= 0 && (
        <>
          <RightAngleMark
            v={verts1[rightAngleAt]}
            p1={neighbors1[rightAngleAt][0]}
            p2={neighbors1[rightAngleAt][1]}
          />
          <RightAngleMark
            v={verts2[rightAngleAt]}
            p1={neighbors2[rightAngleAt][0]}
            p2={neighbors2[rightAngleAt][1]}
          />
        </>
      )}

      {verts1.map((v, i) => (
        <Label key={labels1[i]} x={v.x} y={v.y} text={labels1[i]} offset={labelOffsets1[i]} />
      ))}
      {verts2.map((v, i) => (
        <Label key={labels2[i]} x={v.x} y={v.y} text={labels2[i]} offset={labelOffsets2[i]} />
      ))}

      <Text
        x={95} y={105}
        style={{ fontSize: 12, fontFamily: "Times-Roman", color: "#64748b" }}
      >
        ~
      </Text>
    </Svg>
  );
}

export function PdfCoordinateGridSVG({
  p1,
  p2,
  variant,
}: CoordinateSVGParams) {
  // Variant: point marker style and segment dash pattern.
  // Coordinates and labels are the math and are never altered.
  const v = variant ?? 0;
  const marker = v % 3; // 0: disc, 1: ring, 2: square
  const dash = ["4,2", "3,3", "8,3", "2,2"][v % 4];
  // 200x200 viewBox, grid from 20..180 (16 cells of 10px), center at 100,100.
  // 1 math unit = 10px. Points may range roughly -8..8.
  const C = 100;
  const S = 10;
  const toX = (x: number) => C + x * S;
  const toY = (y: number) => C - y * S;
  const gridLines = [];
  for (let i = 0; i <= 16; i++) {
    const p = 20 + i * 10;
    gridLines.push(
      <Line key={`v${i}`} x1={p} y1={20} x2={p} y2={180} stroke="#e2e8f0" strokeWidth={0.5} />,
      <Line key={`h${i}`} x1={20} y1={p} x2={180} y2={p} stroke="#e2e8f0" strokeWidth={0.5} />
    );
  }
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      {gridLines}
      {/* Axes */}
      <Line x1={20} y1={C} x2={180} y2={C} stroke="#94a3b8" strokeWidth={1} />
      <Line x1={C} y1={20} x2={C} y2={180} stroke="#94a3b8" strokeWidth={1} />
      {/* Segment between points */}
      <Line
        x1={toX(p1.x)} y1={toY(p1.y)} x2={toX(p2.x)} y2={toY(p2.y)}
        stroke="#111111" strokeWidth={1.5} strokeDasharray={dash}
      />
      {/* Points */}
      {[p1, p2].map((pp, i) =>
        marker === 2 ? (
          <Rect key={i} x={toX(pp.x) - 3} y={toY(pp.y) - 3} width={6} height={6} fill="#111111" />
        ) : (
          <Circle key={i} cx={toX(pp.x)} cy={toY(pp.y)} r={3}
            fill={marker === 1 ? "#ffffff" : "#111111"} stroke="#111111" strokeWidth={marker === 1 ? 1.8 : 0} />
        )
      )}
      {coordinatePairLabels(p1, p2, 1).map((l, i) => (
        <Text key={`l${i}`} x={l.center.x} y={baselineY(l.center.y, 9)} textAnchor="middle"
          style={{ fontSize: 9, fontFamily: "Times-Bold", color: "#111111" }}>
          {l.text}
        </Text>
      ))}
    </Svg>
  );
}

export function PdfCircleMeasurementSVG({
  radius,
  angle,
  showArc,
  showSector,
  variant,
}: MeasurementSVGParams) {
  const C = 100;
  const R = 70;
  // Variant: rigid rotation of the radius/angle configuration (8 positions).
  // The radius value and angle measure are unchanged, pure presentation.
  const rot = ((variant ?? 0) % 8) * 45;
  const p0 = { x: C + R * Math.cos(toRad(rot)), y: C - R * Math.sin(toRad(rot)) };
  const showAngle = typeof angle === "number" && angle > 0;
  const end = showAngle
    ? { x: C + R * Math.cos(toRad(rot + angle!)), y: C - R * Math.sin(toRad(rot + angle!)) }
    : null;
  const largeArc = showAngle && angle! > 180 ? 1 : 0;
  const midA = toRad(rot + (angle ?? 0) / 2);
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Circle cx={C} cy={C} r={R} fill="none" stroke="#111111" strokeWidth={1.5} />
      <Circle cx={C} cy={C} r={2.5} fill="#111111" />
      {/* Radius line */}
      <Line x1={C} y1={C} x2={p0.x} y2={p0.y} stroke="#111111" strokeWidth={1} />
      <Text x={(C + p0.x) / 2 - 8} y={(C + p0.y) / 2 - 6} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#111111" }}>
        r={radius}
      </Text>
      {showAngle && end && (
        <>
          {showSector && (
            <Path
              d={`M ${C} ${C} L ${p0.x} ${p0.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y} Z`}
              fill="#111111" fillOpacity={0.25}
              stroke="#111111" strokeWidth={1}
            />
          )}
          {showArc && !showSector && (
            <Path
              d={`M ${p0.x} ${p0.y} A ${R} ${R} 0 ${largeArc} 0 ${end.x} ${end.y}`}
              fill="none"
              stroke="#111111" strokeWidth={2.5}
            />
          )}
          <Line x1={C} y1={C} x2={end.x} y2={end.y} stroke="#111111" strokeWidth={1} />
          <Text x={C + (R + 14) * Math.cos(midA) - 6} y={C - (R + 14) * Math.sin(midA) + 3}
            style={{ fontSize: 9, fontFamily: "Times-Roman", color: "#64748b" }}>
            {angle}°
          </Text>
        </>
      )}
    </Svg>
  );
}

type SVGParams =
  | (InscribedAngleSVGParams & { inscribedAngle?: number; centralAngle?: number })
  | (TangentSVGParams & { kind: "Tangent" })
  | (ChordSVGParams & { kind: "TwoChords" })
  | (ConcentricSVGParams & { kind: "ConcentricCircles" })
  | (SectorSVGParams & { kind: "ShadedSector" })
  | (CongruenceSVGParams & { kind: "Congruence" })
  | (TrigSVGParams & { kind: "RightTriangle" })
  | (CoordinateSVGParams & { kind: "CoordinateGrid" })
  | (MeasurementSVGParams & { kind: "CircleMeasurement" });


export function PdfGeometrySVG({ params }: { params: SVGParams }) {
  if (!params) return null;

  // New Geometry lesson/test figures (GeometryProblem svgParams) dispatch to
  // their own PDF renderer. "ShadedSector" is NOT routed here, it keeps the
  // existing PdfShadedSectorSVG case below.
  const gkind = (params as { kind?: string }).kind;
  if (
    gkind === "TriangleFigure" || gkind === "PolygonFigure" || gkind === "GridFigure" ||
    gkind === "TransversalFigure" || gkind === "TangentFigure" || gkind === "SolidFigure" ||
    gkind === "NetFigure" || gkind === "SketchFigure" || gkind === "AngleFigure" ||
    gkind === "PatternFigure"
  ) {
    return <PdfGeometryFigureSVG params={params as unknown as GeometryDiagramParams} />;
  }

  switch (params.kind) {
    case "InscribedAngle":
      return <PdfInscribedAngleSVG {...(params as InscribedAngleSVGParams)} />;
    case "CentralAngle":
      return <PdfCentralAngleSVG {...(params as InscribedAngleSVGParams)} />;
    case "Tangent":
      return <PdfTangentSVG {...(params as TangentSVGParams)} />;
    case "TwoChords":
      return <PdfTwoChordsSVG {...(params as ChordSVGParams)} />;
    case "TwoSecants":
      return <PdfTwoSecantsSVG {...(params as InscribedAngleSVGParams)} />;
    case "ConcentricCircles":
      return <PdfConcentricCirclesSVG {...(params as ConcentricSVGParams)} />;
    case "ShadedSector":
      return <PdfShadedSectorSVG {...(params as SectorSVGParams)} />;
    case "Congruence":
      return <PdfCongruenceSVG {...(params as CongruenceSVGParams)} />;
    case "RightTriangle":
      return <PdfRightTriangleSVG {...(params as TrigSVGParams)} />;
    case "CoordinateGrid":
      return <PdfCoordinateGridSVG {...(params as CoordinateSVGParams)} />;
    case "CircleMeasurement":
      return <PdfCircleMeasurementSVG {...(params as MeasurementSVGParams)} />;
    default:
      return null;
  }
}

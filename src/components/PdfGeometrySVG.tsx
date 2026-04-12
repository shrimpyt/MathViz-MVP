import React from 'react';
import { Svg, Circle, Line, Path, Text, Polygon } from '@react-pdf/renderer';
import type {
  InscribedAngleSVGParams,
  TangentSVGParams,
  ChordSVGParams,
  ConcentricSVGParams,
  SectorSVGParams,
  CongruenceSVGParams,
  TrigSVGParams,
} from "@/lib/ProblemFactory";

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
      style={{ fontSize: 8, fontFamily: "Times-Roman", color: "#1e293b" }}
    >
      {text}
    </Text>
  );
}

function CircleBase() {
  return (
    <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#0F172A" strokeWidth={1.5} />
  );
}

export function PdfInscribedAngleSVG({
  interceptedArc,
  inscribedAngle,
}: InscribedAngleSVGParams) {
  const arcStart = 30;
  const arcEnd = arcStart + interceptedArc;
  const vertexAngle = arcStart + interceptedArc + 60;

  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const V = polarToCart(CX, CY, R, vertexAngle);
  const largeArc = interceptedArc > 180;

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Path
        d={arcPath(CX, CY, R, arcStart, arcEnd, largeArc)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={3}
      />
      <Line x1={V.x} y1={V.y} x2={A.x} y2={A.y} stroke="#0F172A" strokeWidth={1.2} />
      <Line x1={V.x} y1={V.y} x2={B.x} y2={B.y} stroke="#0F172A" strokeWidth={1.2} />
      {[A, B, V].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
      ))}
      <Label x={A.x} y={A.y} text="A" offset={{ x: -7, y: 0 }} />
      <Label x={B.x} y={B.y} text="B" offset={{ x: 7, y: 0 }} />
      <Label x={V.x} y={V.y} text="V" offset={{ x: 0, y: 9 }} />
      {(() => {
        const mid = polarToCart(CX, CY, R + 12, arcStart + interceptedArc / 2);
        return <Label x={mid.x} y={mid.y} text={`${interceptedArc}°`} offset={{ x: 0, y: 3 }} />;
      })()}
      <Label x={V.x} y={V.y} text={`${inscribedAngle}°?`} offset={{ x: 0, y: 20 }} />
    </Svg>
  );
}

// Similar conversion for CentralAngleSVG, TangentSVG, TwoChordsSVG, TwoSecantsSVG, ConcentricCirclesSVG, ShadedSectorSVG, CongruenceSVG
// Let's implement them properly

export function PdfCentralAngleSVG({ interceptedArc }: { interceptedArc: number }) {
  const arcStart = 30;
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
        stroke="#3b82f6"
        strokeWidth={3}
      />
      <Line x1={CX} y1={CY} x2={A.x} y2={A.y} stroke="#0F172A" strokeWidth={1.2} />
      <Line x1={CX} y1={CY} x2={B.x} y2={B.y} stroke="#0F172A" strokeWidth={1.2} />
      <Circle cx={CX} cy={CY} r={2.5} fill="#0F172A" />
      {[A, B].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
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

export function PdfTangentSVG({ tangentAngle }: TangentSVGParams) {
  const chordStart = 70;
  const chordEnd = chordStart + tangentAngle * 2;
  const A = polarToCart(CX, CY, R, chordStart);
  const B = polarToCart(CX, CY, R, chordEnd);
  const tx1 = A.x - 40;
  const tx2 = A.x + 40;

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Line
        x1={tx1} y1={A.y} x2={tx2} y2={A.y}
        stroke="#7c3aed"
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />
      <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#0F172A" strokeWidth={1.2} />
      <Path
        d={arcPath(CX, CY, R, chordStart, chordEnd)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={3}
      />
      {[A, B].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
      ))}
      <Label x={A.x} y={A.y} text="A" offset={{ x: -7, y: -5 }} />
      <Label x={B.x} y={B.y} text="B" offset={{ x: 7, y: 0 }} />
      <Label x={tx2 - 5} y={A.y} text="t" offset={{ x: 0, y: -5 }} />
      {(() => {
        const mid = polarToCart(CX, CY, R + 13, chordStart + tangentAngle);
        return <Label x={mid.x} y={mid.y} text={`${tangentAngle * 2}°`} offset={{ x: 0, y: 3 }} />;
      })()}
      <Label x={A.x + 15} y={A.y} text={`${tangentAngle}°?`} offset={{ x: 0, y: -8 }} />
    </Svg>
  );
}

export function PdfTwoChordsSVG({ arc1, arc2 }: ChordSVGParams) {
  const a0 = 20, a1 = a0 + arc1, a2 = a1 + 60, a3 = a2 + arc2;
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
      <Path d={arcPath(CX, CY, R, a0, a1)} fill="none" stroke="#3b82f6" strokeWidth={3} />
      <Path d={arcPath(CX, CY, R, a2, a3)} fill="none" stroke="#10b981" strokeWidth={3} />
      <Line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#0F172A" strokeWidth={1.2} />
      <Line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#0F172A" strokeWidth={1.2} />
      <Circle cx={P.x} cy={P.y} r={2.5} fill="#e11d48" />
      {[A, B, C, D].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
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
      <Label x={P.x} y={P.y} text="?" offset={{ x: 8, y: -5 }} />
    </Svg>
  );
}

export function PdfTwoSecantsSVG({ interceptedArc }: { interceptedArc: number }) {
  const near = 40;
  const arcStart = 200, arcEnd = arcStart + interceptedArc;
  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const C = polarToCart(CX, CY, R, arcStart - near);
  const D = polarToCart(CX, CY, R, arcEnd + near);
  const EX = CX + R + 40, EY = CY;

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <CircleBase />
      <Path d={arcPath(CX, CY, R, arcStart, arcEnd)} fill="none" stroke="#3b82f6" strokeWidth={3} />
      <Path
        d={arcPath(CX, CY, R, arcStart - near, arcEnd + near)}
        fill="none"
        stroke="#10b981"
        strokeWidth={3}
      />
      <Line x1={EX} y1={EY} x2={A.x} y2={A.y} stroke="#0F172A" strokeWidth={1.2} />
      <Line x1={EX} y1={EY} x2={B.x} y2={B.y} stroke="#0F172A" strokeWidth={1.2} />
      {[A, B, C, D].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
      ))}
      <Circle cx={EX} cy={EY} r={2.5} fill="#e11d48" />
      <Label x={EX} y={EY} text="P" offset={{ x: 8, y: 0 }} />
      <Label x={EX} y={EY} text="?" offset={{ x: 8, y: 10 }} />
    </Svg>
  );
}

export function PdfConcentricCirclesSVG({ outerR, innerR }: ConcentricSVGParams) {
  const scale = 70 / outerR;
  const scaledOuter = outerR * scale;
  const scaledInner = innerR * scale;

  const ang45 = toRad(45 - 90);
  const oxEnd = CX + scaledOuter * Math.cos(ang45);
  const oyEnd = CY + scaledOuter * Math.sin(ang45);
  const rMidX = CX + (scaledOuter / 2) * Math.cos(ang45);
  const rMidY = CY + (scaledOuter / 2) * Math.sin(ang45);

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Circle cx={CX} cy={CY} r={scaledOuter} fill="#dbeafe" stroke="#0F172A" strokeWidth={1.5} />
      <Circle
        cx={CX} cy={CY} r={scaledInner}
        fill="#3b82f6" fillOpacity={0.55}
        stroke="#1d4ed8" strokeWidth={1.5}
      />
      <Line
        x1={CX} y1={CY} x2={CX + scaledInner} y2={CY}
        stroke="#1d4ed8" strokeWidth={1} strokeDasharray="3,2"
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
  opposite, adjacent, orientation, referenceAnglePos, labels, referenceAngleLabel
}: TrigSVGParams) {
  const width = 130;
  const height = 130;
  const pad = 20;
  const effW = width - 2 * pad;
  const effH = height - 2 * pad;

  const maxSide = Math.max(opposite, adjacent);
  let baseLength = 0;
  let vertLength = 0;

  if (referenceAnglePos === "base") {
    baseLength = (adjacent / maxSide) * effW;
    vertLength = (opposite / maxSide) * effH;
  } else {
    baseLength = (opposite / maxSide) * effW;
    vertLength = (adjacent / maxSide) * effH;
  }

  const xLeft = pad + (effW - baseLength) / 2;
  const xRight = xLeft + baseLength;
  const yBottom = height - pad - (effH - vertLength) / 2;
  const yTop = yBottom - vertLength;

  let pts = "";
  let baseLblPos = { x: 0, y: 0 };
  let vertLblPos = { x: 0, y: 0 };
  let hypLblPos = { x: 0, y: 0 };
  let arcD = "";
  let refLblPos = { x: 0, y: 0 };

  if (orientation === "right") {
    pts = `${xLeft},${yBottom} ${xRight},${yBottom} ${xRight},${yTop}`;
    baseLblPos = { x: (xLeft + xRight) / 2, y: yBottom + 8 };
    vertLblPos = { x: xRight + 8, y: (yTop + yBottom) / 2 };
    hypLblPos = { x: (xLeft + xRight) / 2 - 15, y: (yTop + yBottom) / 2 - 10 };
    
    if (referenceAnglePos === "base") {
      const angle = Math.atan2(vertLength, baseLength);
      const arcLx = xLeft + 18 * Math.cos(angle);
      const arcLy = yBottom - 18 * Math.sin(angle);
      arcD = `M ${xLeft + 18} ${yBottom} A 18 18 0 0 0 ${arcLx} ${arcLy}`;
      refLblPos = { x: xLeft + 25, y: yBottom - 2 };
    } else {
      const angle = Math.atan2(baseLength, vertLength);
      const arcLx = xRight - 18 * Math.sin(angle);
      const arcLy = yTop + 18 * Math.cos(angle);
      arcD = `M ${xRight} ${yTop + 18} A 18 18 0 0 1 ${arcLx} ${arcLy}`;
      refLblPos = { x: xRight - 20, y: yTop + 18 };
    }
  } else {
    pts = `${xRight},${yBottom} ${xLeft},${yBottom} ${xLeft},${yTop}`;
    baseLblPos = { x: (xLeft + xRight) / 2, y: yBottom + 8 };
    vertLblPos = { x: xLeft - 22, y: (yTop + yBottom) / 2 };
    hypLblPos = { x: (xLeft + xRight) / 2 + 10, y: (yTop + yBottom) / 2 - 10 };

    if (referenceAnglePos === "base") {
      const angle = Math.atan2(vertLength, baseLength);
      const arcLx = xRight - 18 * Math.cos(angle);
      const arcLy = yBottom - 18 * Math.sin(angle);
      arcD = `M ${xRight - 18} ${yBottom} A 18 18 0 0 1 ${arcLx} ${arcLy}`;
      refLblPos = { x: xRight - 25, y: yBottom - 2 };
    } else {
      const angle = Math.atan2(baseLength, vertLength); 
      const arcLx = xLeft + 18 * Math.sin(angle);
      const arcLy = yTop + 18 * Math.cos(angle);
      arcD = `M ${xLeft} ${yTop + 18} A 18 18 0 0 0 ${arcLx} ${arcLy}`;
      refLblPos = { x: xLeft + 2, y: yTop + 18 };
    }
  }

  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width="130" height="130">
      <Polygon points={pts} fill="none" stroke="#0F172A" strokeWidth={1.5} />
      
      {orientation === "right" ? (
        <Path d={`M ${xRight - 10} ${yBottom} L ${xRight - 10} ${yBottom - 10} L ${xRight} ${yBottom - 10}`} fill="none" stroke="#0F172A" strokeWidth={1.2} />
      ) : (
        <Path d={`M ${xLeft + 10} ${yBottom} L ${xLeft + 10} ${yBottom - 10} L ${xLeft} ${yBottom - 10}`} fill="none" stroke="#0F172A" strokeWidth={1.2} />
      )}

      <Path d={arcD} fill="none" stroke="#D9A720" strokeWidth={1.5} />
      <Text x={refLblPos.x} y={refLblPos.y} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#B48A18" }}>
        {referenceAngleLabel}
      </Text>

      {referenceAnglePos === "base" ? (
        <>
          <Text x={baseLblPos.x - 5} y={baseLblPos.y} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#0F172A" }}>{String(labels.adjacent)}</Text>
          <Text x={vertLblPos.x} y={vertLblPos.y} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#0F172A" }}>{String(labels.opposite)}</Text>
        </>
      ) : (
        <>
          <Text x={baseLblPos.x - 5} y={baseLblPos.y} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#0F172A" }}>{String(labels.opposite)}</Text>
          <Text x={vertLblPos.x} y={vertLblPos.y} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#0F172A" }}>{String(labels.adjacent)}</Text>
        </>
      )}
      <Text x={hypLblPos.x} y={hypLblPos.y} style={{ fontSize: 10, fontFamily: "Times-Bold", color: "#0F172A" }}>{String(labels.hypotenuse)}</Text>
    </Svg>
  );
}

export function PdfShadedSectorSVG({ sectorAngle }: SectorSVGParams) {
  const startDeg = -90;
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
      <Circle cx={CX} cy={CY} r={R} fill="#f1f5f9" stroke="#0F172A" strokeWidth={1.5} />
      <Path d={pathD} fill="#3b82f6" fillOpacity={0.55} stroke="#1d4ed8" strokeWidth={1.2} />
      {(() => {
        const mid = polarToCart(CX, CY, R * 0.5, startDeg + 90 + sectorAngle / 2);
        return (
          <Text
            x={mid.x - 5} y={mid.y + 3}
            style={{ fontSize: 9, fontFamily: "Times-Roman", color: "#1e293b" }}
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
      stroke="#e11d48"
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
      stroke="#0F172A"
      strokeWidth={1.2}
    />
  );
}

export function PdfCongruenceSVG({
  sideMarks,
  angleMarks,
  rightAngleAt,
}: CongruenceSVGParams) {
  const [A, B, C] = VERTS_T1;
  const [D, E, F] = VERTS_T2;

  const sides1: [Pt, Pt][] = [[A, B], [B, C], [C, A]];
  const sides2: [Pt, Pt][] = [[D, E], [E, F], [F, D]];
  const verts1 = [A, B, C];
  const verts2 = [D, E, F];
  const neighbors1: [Pt, Pt][] = [[C, B], [A, C], [B, A]];
  const neighbors2: [Pt, Pt][] = [[F, E], [D, F], [E, D]];

  const labels1 = ["A", "B", "C"];
  const labels2 = ["D", "E", "F"];
  const labelOffsets1 = [{ x: 0, y: -7 }, { x: -8, y: 6 }, { x: 8, y: 6 }];
  const labelOffsets2 = [{ x: 0, y: -7 }, { x: 8, y: 6 }, { x: -8, y: 6 }];

  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="none"
        stroke="#0F172A"
        strokeWidth={1.5}
      />
      <Polygon
        points={`${D.x},${D.y} ${E.x},${E.y} ${F.x},${F.y}`}
        fill="none"
        stroke="#0F172A"
        strokeWidth={1.5}
      />

      {sideMarks.map((count, i) =>
        count > 0 ? (
          <React.Fragment key={i}>
            <TickMarks p1={sides1[i][0]} p2={sides1[i][1]} count={count} color="#1d4ed8" />
            <TickMarks p1={sides2[i][0]} p2={sides2[i][1]} count={count} color="#1d4ed8" />
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

type SVGParams =
  | (InscribedAngleSVGParams & { inscribedAngle?: number; centralAngle?: number })
  | (TangentSVGParams & { kind: "Tangent" })
  | (ChordSVGParams & { kind: "TwoChords" })
  | (ConcentricSVGParams & { kind: "ConcentricCircles" })
  | (SectorSVGParams & { kind: "ShadedSector" })
  | (CongruenceSVGParams & { kind: "Congruence" })
  | (TrigSVGParams & { kind: "RightTriangle" });


export function PdfGeometrySVG({ params }: { params: SVGParams }) {
  if (!params) return null;

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
    default:
      return null;
  }
}

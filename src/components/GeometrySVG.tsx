"use client";
// GeometrySVG.tsx — coordinate-accurate SVG renderers for circle theorems,
// area-based probability diagrams, and triangle congruence proofs.

import React from "react";
import type {
  InscribedAngleSVGParams,
  TangentSVGParams,
  ChordSVGParams,
  ConcentricSVGParams,
  SectorSVGParams,
  CongruenceSVGParams,
} from "@/lib/ProblemFactory";

const CX = 100; // viewBox center x
const CY = 100; // viewBox center y
const R = 70;   // main circle radius

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const a = toRad(angleDeg - 90); // 0° = top of circle
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

// Label near a point
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
    <text
      x={x + offset.x}
      y={y + offset.y}
      fontSize={8}
      fontFamily="Georgia, serif"
      textAnchor="middle"
      fill="#1e293b"
    >
      {text}
    </text>
  );
}

// ── Circle base ───────────────────────────────────────────────────────────────

function CircleBase() {
  return (
    <circle cx={CX} cy={CY} r={R} fill="none" stroke="#334155" strokeWidth={1.5} />
  );
}

// ── Inscribed Angle SVG ───────────────────────────────────────────────────────

export function InscribedAngleSVG({
  interceptedArc,
  inscribedAngle,
}: InscribedAngleSVGParams & {
  kind: "InscribedAngle" | "CentralAngle" | "TwoChords" | "TwoSecants";
}) {
  const arcStart = 30;
  const arcEnd = arcStart + interceptedArc;
  const vertexAngle = arcStart + interceptedArc + 60;

  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const V = polarToCart(CX, CY, R, vertexAngle);
  const largeArc = interceptedArc > 180;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Inscribed angle diagram">
      <CircleBase />
      <path
        d={arcPath(CX, CY, R, arcStart, arcEnd, largeArc)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line x1={V.x} y1={V.y} x2={A.x} y2={A.y} stroke="#334155" strokeWidth={1.2} />
      <line x1={V.x} y1={V.y} x2={B.x} y2={B.y} stroke="#334155" strokeWidth={1.2} />
      {[A, B, V].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#334155" />
      ))}
      <Label x={A.x} y={A.y} text="A" offset={{ x: -7, y: 0 }} />
      <Label x={B.x} y={B.y} text="B" offset={{ x: 7, y: 0 }} />
      <Label x={V.x} y={V.y} text="V" offset={{ x: 0, y: 9 }} />
      {(() => {
        const mid = polarToCart(CX, CY, R + 12, arcStart + interceptedArc / 2);
        return <Label x={mid.x} y={mid.y} text={`${interceptedArc}°`} offset={{ x: 0, y: 3 }} />;
      })()}
      <Label x={V.x} y={V.y} text={`${inscribedAngle}°?`} offset={{ x: 0, y: 20 }} />
    </svg>
  );
}

// ── Central Angle SVG ─────────────────────────────────────────────────────────

export function CentralAngleSVG({ interceptedArc }: { interceptedArc: number }) {
  const arcStart = 30;
  const arcEnd = arcStart + interceptedArc;
  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const largeArc = interceptedArc > 180;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Central angle diagram">
      <CircleBase />
      <path
        d={arcPath(CX, CY, R, arcStart, arcEnd, largeArc)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line x1={CX} y1={CY} x2={A.x} y2={A.y} stroke="#334155" strokeWidth={1.2} />
      <line x1={CX} y1={CY} x2={B.x} y2={B.y} stroke="#334155" strokeWidth={1.2} />
      <circle cx={CX} cy={CY} r={2.5} fill="#334155" />
      {[A, B].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#334155" />
      ))}
      <Label x={A.x} y={A.y} text="A" offset={{ x: -7, y: 0 }} />
      <Label x={B.x} y={B.y} text="B" offset={{ x: 7, y: 0 }} />
      <Label x={CX} y={CY} text="O" offset={{ x: -8, y: 0 }} />
      {(() => {
        const mid = polarToCart(CX, CY, R + 12, arcStart + interceptedArc / 2);
        return <Label x={mid.x} y={mid.y} text={`${interceptedArc}°`} offset={{ x: 0, y: 3 }} />;
      })()}
    </svg>
  );
}

// ── Tangent-Chord SVG ─────────────────────────────────────────────────────────

export function TangentSVG({ tangentAngle }: TangentSVGParams & { kind: "Tangent" }) {
  const chordStart = 70;
  const chordEnd = chordStart + tangentAngle * 2; // arc = 2 × angle
  const A = polarToCart(CX, CY, R, chordStart);
  const B = polarToCart(CX, CY, R, chordEnd);
  const tx1 = A.x - 40;
  const tx2 = A.x + 40;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Tangent-chord diagram">
      <CircleBase />
      <line
        x1={tx1} y1={A.y} x2={tx2} y2={A.y}
        stroke="#7c3aed"
        strokeWidth={1.5}
        strokeDasharray="4 2"
      />
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#334155" strokeWidth={1.2} />
      <path
        d={arcPath(CX, CY, R, chordStart, chordEnd)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {[A, B].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#334155" />
      ))}
      <Label x={A.x} y={A.y} text="A" offset={{ x: -7, y: -5 }} />
      <Label x={B.x} y={B.y} text="B" offset={{ x: 7, y: 0 }} />
      <Label x={tx2 - 5} y={A.y} text="t" offset={{ x: 0, y: -5 }} />
      {(() => {
        const mid = polarToCart(CX, CY, R + 13, chordStart + tangentAngle);
        return <Label x={mid.x} y={mid.y} text={`${tangentAngle * 2}°`} offset={{ x: 0, y: 3 }} />;
      })()}
      <Label x={A.x + 15} y={A.y} text={`${tangentAngle}°?`} offset={{ x: 0, y: -8 }} />
    </svg>
  );
}

// ── Two-Chords SVG ────────────────────────────────────────────────────────────

export function TwoChordsSVG({ arc1, arc2 }: ChordSVGParams & { kind: "TwoChords" }) {
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
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Two chords diagram">
      <CircleBase />
      <path d={arcPath(CX, CY, R, a0, a1)} fill="none" stroke="#3b82f6" strokeWidth={3} />
      <path d={arcPath(CX, CY, R, a2, a3)} fill="none" stroke="#10b981" strokeWidth={3} />
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#334155" strokeWidth={1.2} />
      <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#334155" strokeWidth={1.2} />
      <circle cx={P.x} cy={P.y} r={2.5} fill="#e11d48" />
      {[A, B, C, D].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#334155" />
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
    </svg>
  );
}

// ── Two-Secants SVG ───────────────────────────────────────────────────────────

export function TwoSecantsSVG({ interceptedArc }: { interceptedArc: number }) {
  const near = 40;
  const arcStart = 200, arcEnd = arcStart + interceptedArc;
  const A = polarToCart(CX, CY, R, arcStart);
  const B = polarToCart(CX, CY, R, arcEnd);
  const C = polarToCart(CX, CY, R, arcStart - near);
  const D = polarToCart(CX, CY, R, arcEnd + near);
  const EX = CX + R + 40, EY = CY;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Two secants diagram">
      <CircleBase />
      <path d={arcPath(CX, CY, R, arcStart, arcEnd)} fill="none" stroke="#3b82f6" strokeWidth={3} />
      <path
        d={arcPath(CX, CY, R, arcStart - near, arcEnd + near)}
        fill="none"
        stroke="#10b981"
        strokeWidth={3}
      />
      <line x1={EX} y1={EY} x2={A.x} y2={A.y} stroke="#334155" strokeWidth={1.2} />
      <line x1={EX} y1={EY} x2={B.x} y2={B.y} stroke="#334155" strokeWidth={1.2} />
      {[A, B, C, D].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#334155" />
      ))}
      <circle cx={EX} cy={EY} r={2.5} fill="#e11d48" />
      <Label x={EX} y={EY} text="P" offset={{ x: 8, y: 0 }} />
      <Label x={EX} y={EY} text="?" offset={{ x: 8, y: 10 }} />
    </svg>
  );
}

// ── Concentric Circles SVG (Target Zone bullseye) ─────────────────────────────
// SVG coordinate logic verification:
//   scale  = SVG_R / outerR           — normalise outer to 70px
//   scaledOuter = outerR × scale = 70 — always fills viewBox
//   scaledInner = innerR × scale      — proportional to innerR/outerR
//   On-screen area ratio = scaledInner²/70² = innerR²/outerR² = P ✓
//
// Labels use two different angles to prevent text collision:
//   r label: horizontal line at 0° (rightward)
//   R label: diagonal line at 45° (northeast)

export function ConcentricCirclesSVG({
  outerR,
  innerR,
}: ConcentricSVGParams & { kind: "ConcentricCircles" }) {
  const scale = 70 / outerR;
  const scaledOuter = outerR * scale; // = 70
  const scaledInner = innerR * scale;

  // Outer radius line at 45° to separate labels
  const ang45 = toRad(45 - 90); // polarToCart convention: -90 offset
  const oxEnd = CX + scaledOuter * Math.cos(ang45);
  const oyEnd = CY + scaledOuter * Math.sin(ang45);
  const rMidX = CX + (scaledOuter / 2) * Math.cos(ang45);
  const rMidY = CY + (scaledOuter / 2) * Math.sin(ang45);

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Concentric circles probability diagram">
      {/* Outer circle */}
      <circle cx={CX} cy={CY} r={scaledOuter} fill="#dbeafe" stroke="#334155" strokeWidth={1.5} />
      {/* Inner (favorable) circle */}
      <circle
        cx={CX} cy={CY} r={scaledInner}
        fill="#3b82f6" fillOpacity={0.55}
        stroke="#1d4ed8" strokeWidth={1.5}
      />
      {/* Inner radius line — horizontal, 0° */}
      <line
        x1={CX} y1={CY} x2={CX + scaledInner} y2={CY}
        stroke="#1d4ed8" strokeWidth={1} strokeDasharray="3 2"
      />
      {/* Outer radius line — diagonal, 45° */}
      <line
        x1={CX} y1={CY} x2={oxEnd} y2={oyEnd}
        stroke="#64748b" strokeWidth={1} strokeDasharray="3 2"
      />
      {/* r label at midpoint of inner line */}
      <Label x={CX + scaledInner / 2} y={CY} text={`r=${innerR}`} offset={{ x: 0, y: -5 }} />
      {/* R label at midpoint of outer diagonal line */}
      <Label x={rMidX} y={rMidY} text={`R=${outerR}`} offset={{ x: 6, y: -5 }} />
      <Label
        x={CX} y={CY + scaledOuter + 12}
        text="Shaded = favorable region"
        offset={{ x: 0, y: 0 }}
      />
    </svg>
  );
}

// ── Shaded Sector SVG ─────────────────────────────────────────────────────────

export function ShadedSectorSVG({
  sectorAngle,
}: SectorSVGParams & { kind: "ShadedSector" }) {
  const startDeg = -90; // top of circle
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
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Shaded sector probability diagram">
      <circle cx={CX} cy={CY} r={R} fill="#f1f5f9" stroke="#334155" strokeWidth={1.5} />
      <path d={pathD} fill="#3b82f6" fillOpacity={0.55} stroke="#1d4ed8" strokeWidth={1.2} />
      {(() => {
        const mid = polarToCart(CX, CY, R * 0.5, startDeg + 90 + sectorAngle / 2);
        return (
          <text
            x={mid.x} y={mid.y}
            fontSize={9} fontFamily="Georgia, serif"
            textAnchor="middle" fill="#1e293b"
          >
            {sectorAngle}°
          </text>
        );
      })()}
      <Label x={CX} y={CY + R + 12} text="Shaded = favorable region" offset={{ x: 0, y: 0 }} />
    </svg>
  );
}

// ── Congruence SVG (Triangle Proofs) ─────────────────────────────────────────
// Two triangles are drawn side-by-side. Triangle 1 (ΔABC) is on the left;
// Triangle 2 (ΔDEF) is horizontally mirrored on the right to show the
// congruence is non-trivial (different orientation, same shape).
//
// Tick marks: short perpendicular lines at the midpoint of each side.
// Angle marks: small arcs at the matching vertices.
// Right-angle marks: a small square at the right-angle vertex.

type Pt = { x: number; y: number };

// Fixed vertex positions in 200×200 viewBox
const VERTS_T1: [Pt, Pt, Pt] = [
  { x: 50, y: 38 },   // A
  { x: 18, y: 148 },  // B
  { x: 88, y: 148 },  // C
];
const VERTS_T2: [Pt, Pt, Pt] = [
  { x: 150, y: 38 },  // D (corresponds to A)
  { x: 182, y: 148 }, // E (corresponds to B)
  { x: 112, y: 148 }, // F (corresponds to C)
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
  // Unit vector along the line
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular unit vector
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
          <line
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
  // Choose the smaller angular sweep
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const sweepFlag = diff > 0 ? 1 : 0;
  return (
    <path
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
    <path
      d={`M ${q1.x} ${q1.y} L ${corner.x} ${corner.y} L ${q2.x} ${q2.y}`}
      fill="none"
      stroke="#334155"
      strokeWidth={1.2}
    />
  );
}

export function CongruenceSVG({
  sideMarks,
  angleMarks,
  rightAngleAt,
}: CongruenceSVGParams & { kind: "Congruence" }) {
  const [A, B, C] = VERTS_T1;
  const [D, E, F] = VERTS_T2;

  // Sides of triangle 1: AB, BC, CA
  const sides1: [Pt, Pt][] = [[A, B], [B, C], [C, A]];
  // Corresponding sides of triangle 2: DE, EF, FD
  const sides2: [Pt, Pt][] = [[D, E], [E, F], [F, D]];
  // Vertices for angle marks: A/D, B/E, C/F
  const verts1 = [A, B, C];
  const verts2 = [D, E, F];
  // Neighbors for angle arc: [prev, next] in winding order
  const neighbors1: [Pt, Pt][] = [[C, B], [A, C], [B, A]];
  const neighbors2: [Pt, Pt][] = [[F, E], [D, F], [E, D]];

  const labels1 = ["A", "B", "C"];
  const labels2 = ["D", "E", "F"];
  // Label offsets push outward from triangle centroid
  const labelOffsets1 = [{ x: 0, y: -7 }, { x: -8, y: 6 }, { x: 8, y: 6 }];
  const labelOffsets2 = [{ x: 0, y: -7 }, { x: 8, y: 6 }, { x: -8, y: 6 }];

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Triangle congruence diagram">
      {/* Triangle 1 */}
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="none"
        stroke="#334155"
        strokeWidth={1.5}
      />
      {/* Triangle 2 */}
      <polygon
        points={`${D.x},${D.y} ${E.x},${E.y} ${F.x},${F.y}`}
        fill="none"
        stroke="#334155"
        strokeWidth={1.5}
      />

      {/* Tick marks on both triangles */}
      {sideMarks.map((count, i) =>
        count > 0 ? (
          <React.Fragment key={i}>
            <TickMarks p1={sides1[i][0]} p2={sides1[i][1]} count={count} color="#1d4ed8" />
            <TickMarks p1={sides2[i][0]} p2={sides2[i][1]} count={count} color="#1d4ed8" />
          </React.Fragment>
        ) : null
      )}

      {/* Angle marks */}
      {angleMarks.map((marked, i) =>
        marked ? (
          <React.Fragment key={i}>
            <AngleArc v={verts1[i]} p1={neighbors1[i][0]} p2={neighbors1[i][1]} />
            <AngleArc v={verts2[i]} p1={neighbors2[i][0]} p2={neighbors2[i][1]} />
          </React.Fragment>
        ) : null
      )}

      {/* Right angle marks (HL) */}
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

      {/* Vertex labels */}
      {verts1.map((v, i) => (
        <text
          key={labels1[i]}
          x={v.x + labelOffsets1[i].x}
          y={v.y + labelOffsets1[i].y}
          fontSize={8}
          fontFamily="Georgia, serif"
          textAnchor="middle"
          fill="#1e293b"
        >
          {labels1[i]}
        </text>
      ))}
      {verts2.map((v, i) => (
        <text
          key={labels2[i]}
          x={v.x + labelOffsets2[i].x}
          y={v.y + labelOffsets2[i].y}
          fontSize={8}
          fontFamily="Georgia, serif"
          textAnchor="middle"
          fill="#1e293b"
        >
          {labels2[i]}
        </text>
      ))}

      {/* "≅" symbol between the triangles */}
      <text
        x={100} y={100}
        fontSize={12} fontFamily="Georgia, serif"
        textAnchor="middle" fill="#64748b"
      >
        ≅
      </text>
    </svg>
  );
}

// ── Dispatch component ────────────────────────────────────────────────────────

type SVGParams =
  | (InscribedAngleSVGParams & { inscribedAngle?: number; centralAngle?: number })
  | (TangentSVGParams & { kind: "Tangent" })
  | (ChordSVGParams & { kind: "TwoChords" })
  | (ConcentricSVGParams & { kind: "ConcentricCircles" })
  | (SectorSVGParams & { kind: "ShadedSector" })
  | (CongruenceSVGParams & { kind: "Congruence" });

export function GeometrySVG({ params }: { params: SVGParams }) {
  switch (params.kind) {
    case "InscribedAngle":
      return (
        <InscribedAngleSVG
          kind="InscribedAngle"
          interceptedArc={(params as InscribedAngleSVGParams).interceptedArc}
          inscribedAngle={(params as InscribedAngleSVGParams).inscribedAngle}
        />
      );
    case "CentralAngle":
      return <CentralAngleSVG interceptedArc={(params as InscribedAngleSVGParams).interceptedArc} />;
    case "Tangent":
      return <TangentSVG kind="Tangent" tangentAngle={(params as TangentSVGParams).tangentAngle} />;
    case "TwoChords":
      return (
        <TwoChordsSVG
          kind="TwoChords"
          arc1={(params as ChordSVGParams).arc1}
          arc2={(params as ChordSVGParams).arc2}
        />
      );
    case "TwoSecants":
      return <TwoSecantsSVG interceptedArc={(params as InscribedAngleSVGParams).interceptedArc} />;
    case "ConcentricCircles":
      return (
        <ConcentricCirclesSVG
          kind="ConcentricCircles"
          outerR={(params as ConcentricSVGParams).outerR}
          innerR={(params as ConcentricSVGParams).innerR}
        />
      );
    case "ShadedSector":
      return <ShadedSectorSVG kind="ShadedSector" sectorAngle={(params as SectorSVGParams).sectorAngle} />;
    case "Congruence": {
      const p = params as CongruenceSVGParams;
      return (
        <CongruenceSVG
          kind="Congruence"
          subtype={p.subtype}
          sideA={p.sideA}
          sideB={p.sideB}
          sideC={p.sideC}
          sideMarks={p.sideMarks}
          angleMarks={p.angleMarks}
          rightAngleAt={p.rightAngleAt}
        />
      );
    }
    default:
      return null;
  }
}

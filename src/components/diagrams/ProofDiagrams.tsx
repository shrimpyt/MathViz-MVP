"use client";
// ProofDiagrams.tsx
// Web SVG renderers for geometry-proof diagrams. Dispatches on the `kind`
// discriminant of ProofSVGParams (see src/lib/proofDiagrams.ts).
//
// The PDF mirror lives in ./PdfProofSVG.tsx — keep the two in sync
// (same viewBox, same geometry, same labels; PDF maps ≅ → ≃).

import React from "react";
import type {
  ProofSVGParams,
  ProofCongruenceSVGParams,
  ProofIsoscelesSVGParams,
  ProofParallelLinesSVGParams,
  ProofSimilaritySVGParams,
  ProofElementsSVGParams,
  ProofCircleSVGParams,
  ElementsProposition,
} from "@/lib/proofDiagrams";

type Pt = { x: number; y: number };

// ── Shared mark helpers ──────────────────────────────────────────────────────

function TickMarks({ p1, p2, count, color = "#1d4ed8" }: { p1: Pt; p2: Pt; count: number; color?: string }) {
  if (count <= 0) return null;
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
  const startT = -((count - 1) * spacing) / 2;
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

function AngleArc({ v, p1, p2, color = "#e11d48", r = 11 }: { v: Pt; p1: Pt; p2: Pt; color?: string; r?: number }) {
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
    <path
      d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${x2} ${y2}`}
      fill="none" stroke={color} strokeWidth={1.2}
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
      fill="none" stroke="#0F172A" strokeWidth={1.2}
    />
  );
}

function VertexLabel({ pt, text, dx = 0, dy = 0 }: { pt: Pt; text: string; dx?: number; dy?: number }) {
  return (
    <text
      x={pt.x + dx} y={pt.y + dy}
      fontSize={9} fontFamily="Georgia, serif" textAnchor="middle" fill="#1e293b"
    >
      {text}
    </text>
  );
}

// ── Two marked triangles (congruence / similarity) ───────────────────────────

const T1: [Pt, Pt, Pt] = [{ x: 50, y: 38 }, { x: 18, y: 148 }, { x: 88, y: 148 }];
const T2: [Pt, Pt, Pt] = [{ x: 150, y: 38 }, { x: 182, y: 148 }, { x: 112, y: 148 }];

function TwoTrianglesSVG({
  sideMarks,
  angleMarks,
  rightAngleAt,
  centerSymbol,
  labels1 = ["A", "B", "C"],
  labels2 = ["D", "E", "F"],
}: {
  sideMarks: [number, number, number];
  angleMarks: [boolean, boolean, boolean];
  rightAngleAt: number;
  centerSymbol: string;
  labels1?: [string, string, string];
  labels2?: [string, string, string];
}) {
  const [A, B, C] = T1;
  const [D, E, F] = T2;
  const sides1: [Pt, Pt][] = [[A, B], [B, C], [C, A]];
  const sides2: [Pt, Pt][] = [[D, E], [E, F], [F, D]];
  const verts1 = [A, B, C];
  const verts2 = [D, E, F];
  const neighbors1: [Pt, Pt][] = [[C, B], [A, C], [B, A]];
  const neighbors2: [Pt, Pt][] = [[F, E], [D, F], [E, D]];
  const off1 = [{ x: 0, y: -7 }, { x: -8, y: 7 }, { x: 8, y: 7 }];
  const off2 = [{ x: 0, y: -7 }, { x: 8, y: 7 }, { x: -8, y: 7 }];
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Triangle diagram">
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke="#0F172A" strokeWidth={1.5} />
      <polygon points={`${D.x},${D.y} ${E.x},${E.y} ${F.x},${F.y}`} fill="none" stroke="#0F172A" strokeWidth={1.5} />
      {sideMarks.map((count, i) =>
        count > 0 ? (
          <React.Fragment key={i}>
            <TickMarks p1={sides1[i][0]} p2={sides1[i][1]} count={count} />
            <TickMarks p1={sides2[i][0]} p2={sides2[i][1]} count={count} />
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
          <RightAngleMark v={verts1[rightAngleAt]} p1={neighbors1[rightAngleAt][0]} p2={neighbors1[rightAngleAt][1]} />
          <RightAngleMark v={verts2[rightAngleAt]} p1={neighbors2[rightAngleAt][0]} p2={neighbors2[rightAngleAt][1]} />
        </>
      )}
      {verts1.map((v, i) => (
        <VertexLabel key={i} pt={v} text={labels1[i]} dx={off1[i].x} dy={off1[i].y} />
      ))}
      {verts2.map((v, i) => (
        <VertexLabel key={i} pt={v} text={labels2[i]} dx={off2[i].x} dy={off2[i].y} />
      ))}
      <text x={100} y={104} fontSize={13} fontFamily="Georgia, serif" textAnchor="middle" fill="#64748b">
        {centerSymbol}
      </text>
    </svg>
  );
}

export function ProofCongruenceSVG(p: ProofCongruenceSVGParams) {
  return (
    <TwoTrianglesSVG
      sideMarks={p.sideMarks}
      angleMarks={p.angleMarks}
      rightAngleAt={p.rightAngleAt}
      centerSymbol="≅"
    />
  );
}

export function ProofSimilaritySVG(p: ProofSimilaritySVGParams) {
  return (
    <TwoTrianglesSVG
      sideMarks={[0, 0, 0]}
      angleMarks={p.angleMarks}
      rightAngleAt={-1}
      centerSymbol="~"
    />
  );
}

// ── Isosceles triangle (single figure) ──────────────────────────────────────

export function ProofIsoscelesSVG(p: ProofIsoscelesSVGParams) {
  const A: Pt = { x: 100, y: 42 };
  const B: Pt = { x: 52, y: 152 };
  const C: Pt = { x: 148, y: 152 };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Isosceles triangle diagram">
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke="#0F172A" strokeWidth={1.5} />
      {p.markEqualLegs && (
        <>
          <TickMarks p1={A} p2={B} count={1} />
          <TickMarks p1={A} p2={C} count={1} />
        </>
      )}
      {p.markBaseAngles && (
        <>
          <AngleArc v={B} p1={A} p2={C} />
          <AngleArc v={C} p1={B} p2={A} />
        </>
      )}
      <VertexLabel pt={A} text="A" dy={-8} />
      <VertexLabel pt={B} text="B" dx={-9} dy={7} />
      <VertexLabel pt={C} text="C" dx={9} dy={7} />
    </svg>
  );
}

// ── Parallel lines cut by a transversal ──────────────────────────────────────

const PL = {
  lY: 70, mY: 140, x0: 20, x1: 180,
  tTop: { x: 60, y: 10 }, tBot: { x: 140, y: 190 },
};

function transversalX(y: number): number {
  const { tTop, tBot } = PL;
  return tTop.x + ((tBot.x - tTop.x) * (y - tTop.y)) / (tBot.y - tTop.y);
}

/**
 * Angle slots: at P1 (top) angles 1..4, at P2 (bottom) angles 5..8.
 * Ray directions in screen coords (y down), degrees: L=180, R=0, U≈246, D≈66.
 */
const ANGLE_SLOTS: Record<number, { v: Pt; a1: number; a2: number }> = (() => {
  const P1 = { x: transversalX(PL.lY), y: PL.lY };
  const P2 = { x: transversalX(PL.mY), y: PL.mY };
  const mk = (v: Pt, a1: number, a2: number) => ({ v, a1, a2 });
  return {
    1: mk(P1, 180, 246), 2: mk(P1, 246, 360), 3: mk(P1, 0, 66), 4: mk(P1, 66, 180),
    5: mk(P2, 180, 246), 6: mk(P2, 246, 360), 7: mk(P2, 0, 66), 8: mk(P2, 66, 180),
  };
})();

function SlotArc({ n, marked }: { n: number; marked: boolean }) {
  const { v, a1, a2 } = ANGLE_SLOTS[n];
  const r = marked ? 16 : 12;
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = v.x + r * Math.cos(rad(a1));
  const y1 = v.y + r * Math.sin(rad(a1));
  const x2 = v.x + r * Math.cos(rad(a2));
  const y2 = v.y + r * Math.sin(rad(a2));
  const mid = (a1 + a2) / 2;
  const lx = v.x + (r + 12) * Math.cos(rad(mid));
  const ly = v.y + (r + 12) * Math.sin(rad(mid));
  return (
    <>
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        fill="none"
        stroke={marked ? "#e11d48" : "#94a3b8"}
        strokeWidth={marked ? 2 : 1}
      />
      <text
        x={lx} y={ly + 3}
        fontSize={marked ? 10 : 8.5} fontFamily="Georgia, serif" textAnchor="middle"
        fill={marked ? "#e11d48" : "#64748b"}
        fontWeight={marked ? "bold" : "normal"}
      >
        {n}
      </text>
    </>
  );
}

function ParallelTicks({ y }: { y: number }) {
  // small arrowheads ">" on the line, pointing right
  return (
    <>
      {[70, 130].map((x) => (
        <path
          key={x}
          d={`M ${x - 4} ${y - 4} L ${x + 3} ${y} L ${x - 4} ${y + 4}`}
          fill="none" stroke="#1d4ed8" strokeWidth={1.4}
        />
      ))}
    </>
  );
}

export function ProofParallelLinesSVG(p: ProofParallelLinesSVGParams) {
  const { lY, mY, x0, x1, tTop, tBot } = PL;
  const [m1, m2] = p.markedAngles;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Parallel lines diagram">
      <line x1={x0} y1={lY} x2={x1} y2={lY} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={x0} y1={mY} x2={x1} y2={mY} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={tTop.x} y1={tTop.y} x2={tBot.x} y2={tBot.y} stroke="#0F172A" strokeWidth={1.2} />
      {p.parallel && (
        <>
          <ParallelTicks y={lY} />
          <ParallelTicks y={mY} />
        </>
      )}
      <text x={x0 - 8} y={lY - 4} fontSize={10} fontFamily="Georgia, serif" fontStyle="italic" fill="#1e293b">l</text>
      <text x={x0 - 8} y={mY - 4} fontSize={10} fontFamily="Georgia, serif" fontStyle="italic" fill="#1e293b">m</text>
      <text x={tBot.x + 6} y={tBot.y - 2} fontSize={10} fontFamily="Georgia, serif" fontStyle="italic" fill="#1e293b">t</text>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <SlotArc key={n} n={n} marked={n === m1 || n === m2} />
      ))}
      {p.givenAngle !== undefined && p.givenAngleIndex !== undefined && (
        <text
          x={ANGLE_SLOTS[p.givenAngleIndex].v.x - 26}
          y={ANGLE_SLOTS[p.givenAngleIndex].v.y - 16}
          fontSize={9} fontFamily="Georgia, serif" fill="#1d4ed8" fontWeight="bold"
        >
          {p.givenAngle}°
        </text>
      )}
    </svg>
  );
}

// ── Circle-theorem figures ───────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function ProofCircleSVG(p: ProofCircleSVGParams) {
  const CX = 100, CY = 100, R = 62;
  if (p.figure === "inscribed") {
    const A = polar(CX, CY, R, 150);
    const C = polar(CX, CY, R, 150 + p.arc);
    const B = polar(CX, CY, R, 285);
    const mid = polar(CX, CY, R + 14, 150 + p.arc / 2);
    return (
      <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Inscribed angle diagram">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#0F172A" strokeWidth={1.5} />
        <path
          d={`M ${A.x} ${A.y} A ${R} ${R} 0 0 1 ${C.x} ${C.y}`}
          fill="none" stroke="#3b82f6" strokeWidth={3}
        />
        <line x1={B.x} y1={B.y} x2={A.x} y2={A.y} stroke="#0F172A" strokeWidth={1.2} />
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="#0F172A" strokeWidth={1.2} />
        {[A, B, C].map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
        ))}
        <VertexLabel pt={A} text="A" dx={-9} dy={2} />
        <VertexLabel pt={C} text="C" dx={9} dy={2} />
        <VertexLabel pt={B} text="B" dy={12} />
        <AngleArc v={B} p1={A} p2={C} r={14} />
        <text x={mid.x} y={mid.y + 3} fontSize={9} fontFamily="Georgia, serif" textAnchor="middle" fill="#1d4ed8" fontWeight="bold">
          {p.arc}°
        </text>
        <text x={B.x} y={B.y - 18} fontSize={9} fontFamily="Georgia, serif" textAnchor="middle" fill="#e11d48" fontWeight="bold">
          {p.angle}°
        </text>
      </svg>
    );
  }
  // tangent-chord
  const A = polar(CX, CY, R, 90);
  const Bp = polar(CX, CY, R, 90 + p.arc);
  const mid = polar(CX, CY, R + 14, 90 + p.arc / 2);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Tangent chord diagram">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#0F172A" strokeWidth={1.5} />
      <path
        d={`M ${A.x} ${A.y} A ${R} ${R} 0 0 1 ${Bp.x} ${Bp.y}`}
        fill="none" stroke="#3b82f6" strokeWidth={3}
      />
      <line x1={A.x - 55} y1={A.y} x2={A.x + 55} y2={A.y} stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5,3" />
      <line x1={A.x} y1={A.y} x2={Bp.x} y2={Bp.y} stroke="#0F172A" strokeWidth={1.2} />
      {[A, Bp].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
      ))}
      <VertexLabel pt={A} text="A" dx={-9} dy={-6} />
      <VertexLabel pt={Bp} text="B" dx={9} dy={2} />
      <text x={A.x + 48} y={A.y - 6} fontSize={10} fontFamily="Georgia, serif" fontStyle="italic" fill="#1e293b">t</text>
      <text x={mid.x} y={mid.y + 3} fontSize={9} fontFamily="Georgia, serif" textAnchor="middle" fill="#1d4ed8" fontWeight="bold">
        {p.arc}°
      </text>
      <text x={A.x + 20} y={A.y + 16} fontSize={9} fontFamily="Georgia, serif" textAnchor="middle" fill="#e11d48" fontWeight="bold">
        {p.angle}°
      </text>
    </svg>
  );
}

// ── Euclid's Elements figures ────────────────────────────────────────────────

function ElementsI1({ a = 7 }: { a?: number }) {
  const A: Pt = { x: 55, y: 140 };
  const B: Pt = { x: 145, y: 140 };
  const r = B.x - A.x;
  const C: Pt = { x: (A.x + B.x) / 2, y: A.y - r * Math.sqrt(3) / 2 };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Elements I.1 construction">
      <circle cx={A.x} cy={A.y} r={r} fill="none" stroke="#94a3b8" strokeWidth={1} />
      <circle cx={B.x} cy={B.y} r={r} fill="none" stroke="#94a3b8" strokeWidth={1} />
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#0F172A" strokeWidth={2} />
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="#0F172A" strokeWidth={1.5} />
      {[A, B, C].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill="#0F172A" />
      ))}
      <VertexLabel pt={A} text="A" dx={-9} dy={8} />
      <VertexLabel pt={B} text="B" dx={9} dy={8} />
      <VertexLabel pt={C} text="C" dy={-8} />
    </svg>
  );
}

function ElementsSAS({ marks, angles }: { marks: [number, number, number]; angles: [boolean, boolean, boolean] }) {
  return (
    <TwoTrianglesSVG sideMarks={marks} angleMarks={angles} rightAngleAt={-1} centerSymbol="≅" />
  );
}

function ElementsI5({ a = 8 }: { a?: number }) {
  const A: Pt = { x: 100, y: 40 };
  const B: Pt = { x: 58, y: 148 };
  const C: Pt = { x: 142, y: 148 };
  const D: Pt = { x: B.x + (B.x - A.x) * 0.32, y: B.y + (B.y - A.y) * 0.32 };
  const E: Pt = { x: C.x + (C.x - A.x) * 0.32, y: C.y + (C.y - A.y) * 0.32 };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Elements I.5 isosceles figure">
      <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke="#0F172A" strokeWidth={1.2} strokeDasharray="5,3" />
      <line x1={A.x} y1={A.y} x2={E.x} y2={E.y} stroke="#0F172A" strokeWidth={1.2} strokeDasharray="5,3" />
      <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="#0F172A" strokeWidth={1.5} />
      <TickMarks p1={A} p2={B} count={1} />
      <TickMarks p1={A} p2={C} count={1} />
      <VertexLabel pt={A} text="A" dy={-8} />
      <VertexLabel pt={B} text="B" dx={-9} dy={4} />
      <VertexLabel pt={C} text="C" dx={9} dy={4} />
      <VertexLabel pt={D} text="D" dx={-9} dy={6} />
      <VertexLabel pt={E} text="E" dx={9} dy={6} />
    </svg>
  );
}

function ElementsI29() {
  const y1 = 70, y2 = 130;
  const G: Pt = { x: transversalX(y1), y: y1 };
  const H: Pt = { x: transversalX(y2), y: y2 };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Elements I.29 parallel lines">
      <line x1={20} y1={y1} x2={180} y2={y1} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={20} y1={y2} x2={180} y2={y2} stroke="#0F172A" strokeWidth={1.5} />
      <line x1={PL.tTop.x} y1={PL.tTop.y} x2={PL.tBot.x} y2={PL.tBot.y} stroke="#0F172A" strokeWidth={1.2} />
      <ParallelTicks y={y1} />
      <ParallelTicks y={y2} />
      <AngleArc v={G} p1={{ x: 20, y: y1 }} p2={PL.tTop} r={14} />
      <AngleArc v={H} p1={{ x: 180, y: y2 }} p2={PL.tBot} r={14} />
      <VertexLabel pt={{ x: 20, y: y1 }} text="A" dx={-9} dy={-4} />
      <VertexLabel pt={{ x: 180, y: y1 }} text="B" dx={9} dy={-4} />
      <VertexLabel pt={{ x: 20, y: y2 }} text="C" dx={-9} dy={10} />
      <VertexLabel pt={{ x: 180, y: y2 }} text="D" dx={9} dy={10} />
      <VertexLabel pt={PL.tTop} text="E" dy={-4} />
      <VertexLabel pt={PL.tBot} text="F" dy={12} />
      <VertexLabel pt={G} text="G" dx={10} dy={-8} />
      <VertexLabel pt={H} text="H" dx={-10} dy={10} />
    </svg>
  );
}

function ElementsI32() {
  const A: Pt = { x: 100, y: 45 };
  const B: Pt = { x: 50, y: 140 };
  const C: Pt = { x: 150, y: 140 };
  const D: Pt = { x: 188, y: 140 };
  const dir = { x: A.x - B.x, y: A.y - B.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const E: Pt = { x: C.x + (dir.x / len) * 46, y: C.y + (dir.y / len) * 46 };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Elements I.32 angle sum figure">
      <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="#0F172A" strokeWidth={1.5} />
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke="#0F172A" strokeWidth={1.5} />
      <line x1={C.x} y1={C.y} x2={E.x} y2={E.y} stroke="#1d4ed8" strokeWidth={1.2} strokeDasharray="5,3" />
      <AngleArc v={C} p1={D} p2={A} r={16} />
      <VertexLabel pt={A} text="A" dy={-8} />
      <VertexLabel pt={B} text="B" dx={-9} dy={6} />
      <VertexLabel pt={C} text="C" dy={12} />
      <VertexLabel pt={D} text="D" dx={9} dy={-2} />
      <VertexLabel pt={E} text="E" dx={9} dy={-4} />
    </svg>
  );
}

function ElementsI47({ a = 6, b = 8 }: { a?: number; b?: number }) {
  // Right angle at A; squares on AB, AC, and hypotenuse BC (outward).
  const u = 5;
  const A: Pt = { x: 78, y: 118 };
  const B: Pt = { x: 78, y: 118 - a * u };
  const C: Pt = { x: 78 + b * u, y: 118 };
  // Square on AB (outward = left of AB).
  const B2: Pt = { x: B.x - a * u, y: B.y };
  const A2: Pt = { x: A.x - a * u, y: A.y };
  // Square on AC (outward = below AC).
  const C2: Pt = { x: C.x, y: C.y + b * u };
  const A3: Pt = { x: A.x, y: A.y + b * u };
  // Square on BC: outward normal away from A.
  const dx = C.x - B.x, dy = C.y - B.y;
  const hyp = Math.hypot(dx, dy) || 1;
  // normal candidates: (-dy, dx) / hyp — pick the one pointing away from A
  let nx = -dy / hyp, ny = dx / hyp;
  const midBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
  const toA = { x: A.x - midBC.x, y: A.y - midBC.y };
  if (nx * toA.x + ny * toA.y > 0) { nx = -nx; ny = -ny; }
  const B3: Pt = { x: B.x + nx * hyp, y: B.y + ny * hyp };
  const C3: Pt = { x: C.x + nx * hyp, y: C.y + ny * hyp };

  const pts = [A, B, C, B2, A2, C2, A3, B3, C3];
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min(180 / Math.max(1, maxX - minX), 180 / Math.max(1, maxY - minY));
  const ox = 100 - ((minX + maxX) / 2) * s;
  const oy = 100 - ((minY + maxY) / 2) * s;
  const T = (p: Pt): Pt => ({ x: p.x * s + ox, y: p.y * s + oy });
  const poly = (list: Pt[]) => list.map((p) => { const q = T(p); return `${q.x},${q.y}`; }).join(" ");
  const dot = (p: Pt, label: string, dxl = 0, dyl = 0) => {
    const q = T(p);
    return (
      <React.Fragment key={label}>
        <circle cx={q.x} cy={q.y} r={2.2} fill="#0F172A" />
        <text x={q.x + dxl} y={q.y + dyl} fontSize={9} fontFamily="Georgia, serif" textAnchor="middle" fill="#1e293b">
          {label}
        </text>
      </React.Fragment>
    );
  };
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Elements I.47 Pythagoras figure">
      <polygon points={poly([B, B2, A2, A])} fill="#dbeafe" stroke="#0F172A" strokeWidth={1.2} />
      <polygon points={poly([A, C, C2, A3])} fill="#dbeafe" stroke="#0F172A" strokeWidth={1.2} />
      <polygon points={poly([B, C, C3, B3])} fill="#e0e7ff" stroke="#0F172A" strokeWidth={1.2} />
      <polygon points={poly([A, B, C])} fill="#ffffff" stroke="#0F172A" strokeWidth={1.8} />
      {dot(A, "A", -8, 8)} {dot(B, "B", -8, -4)} {dot(C, "C", 8, 8)}
    </svg>
  );
}

function ElementsI48({ a = 3, b = 4 }: { a?: number; b?: number }) {
  const u = 9;
  const A: Pt = { x: 80, y: 105 };
  const C: Pt = { x: 80 + b * u, y: 105 };
  const B: Pt = { x: 80, y: 105 - a * u };
  const D: Pt = { x: 80, y: 105 + a * u }; // AD ⊥ AC, AD = AB
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Elements I.48 converse figure">
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke="#0F172A" strokeWidth={1.8} />
      <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke="#1d4ed8" strokeWidth={1.2} strokeDasharray="5,3" />
      <line x1={D.x} y1={D.y} x2={B.x} y2={B.y} stroke="#1d4ed8" strokeWidth={1.2} strokeDasharray="5,3" />
      <RightAngleMark v={A} p1={D} p2={C} />
      <VertexLabel pt={A} text="A" dx={-9} dy={2} />
      <VertexLabel pt={B} text="B" dx={-8} dy={-4} />
      <VertexLabel pt={C} text="C" dx={9} dy={4} />
      <VertexLabel pt={D} text="D" dx={-9} dy={8} />
    </svg>
  );
}

export function ProofElementsSVG(p: ProofElementsSVGParams) {
  const prop: ElementsProposition = p.prop;
  switch (prop) {
    case "I.1": return <ElementsI1 a={p.a} />;
    case "I.4": return <ElementsSAS marks={[1, 2, 0]} angles={[true, false, false]} />;
    case "I.5": return <ElementsI5 a={p.a} />;
    case "I.8": return <ElementsSAS marks={[1, 2, 3]} angles={[false, false, false]} />;
    case "I.29": return <ElementsI29 />;
    case "I.32": return <ElementsI32 />;
    case "I.47": return <ElementsI47 a={p.a} b={p.b} />;
    case "I.48": return <ElementsI48 a={p.a} b={p.b} />;
    default: return null;
  }
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function ProofGeometrySVG({ params }: { params: ProofSVGParams }) {
  switch (params.kind) {
    case "ProofCongruence":
      return <ProofCongruenceSVG {...(params as ProofCongruenceSVGParams)} />;
    case "ProofIsosceles":
      return <ProofIsoscelesSVG {...(params as ProofIsoscelesSVGParams)} />;
    case "ProofParallelLines":
      return <ProofParallelLinesSVG {...(params as ProofParallelLinesSVGParams)} />;
    case "ProofSimilarity":
      return <ProofSimilaritySVG {...(params as ProofSimilaritySVGParams)} />;
    case "ProofElements":
      return <ProofElementsSVG {...(params as ProofElementsSVGParams)} />;
    case "ProofCircle":
      return <ProofCircleSVG {...(params as ProofCircleSVGParams)} />;
    default:
      return null;
  }
}

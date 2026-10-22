// PdfProofSVG.tsx
// PDF renderers for geometry-proof diagrams (@react-pdf/renderer primitives).
// Mirrors ./ProofDiagrams.tsx, same viewBox (0 0 200 200), same geometry,
// same labels. Web shows ≅; PDF uses ≃ (DejaVu Serif lacks U+2245).

import React from "react";
import { Svg, Circle, Line, Path, Text, Polygon, Font } from "@react-pdf/renderer";

// The two-triangle center symbol needs ≃ (U+2243), which Times-Roman (the
// label font below) does not have: it silently renders as a stray "C".
// Register the document serif in THIS module so the figure is
// self-contained; standalone renders (test harnesses) never import
// PdfDocument, where the family is also registered with identical files.
function proofFontSrc(file: string): string {
  if (typeof window === "undefined") {
    return `${process.cwd()}/public/fonts/${file}`;
  }
  return `/fonts/${file}`;
}
Font.register({
  family: "WorksheetSerif",
  fonts: [
    { src: proofFontSrc("DejaVuSerif.ttf"), fontWeight: 400 },
    { src: proofFontSrc("DejaVuSerif-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
  ],
});
import { pdfSafeText } from "@/lib/answerKey";
import type {
  ProofSVGParams,
  ProofCongruenceSVGParams,
  ProofIsoscelesSVGParams,
  ProofParallelLinesSVGParams,
  ProofSimilaritySVGParams,
  ProofElementsSVGParams,
  ProofCircleSVGParams,
  ProofQuadrilateralSVGParams,
  ProofAngleFigureSVGParams,
  ElementsProposition,
} from "@/lib/proofDiagrams";

type Pt = { x: number; y: number };
const FONT = "Times-Roman";
const INK = "#111111";

// ── Shared mark helpers ──────────────────────────────────────────────────────

function PdfTickMarks({ p1, p2, count, color = "#111111" }: { p1: Pt; p2: Pt; count: number; color?: string }) {
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

function PdfAngleArc({ v, p1, p2, color = "#111111", r = 11 }: { v: Pt; p1: Pt; p2: Pt; color?: string; r?: number }) {
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
      fill="none" stroke={color} strokeWidth={1.2}
    />
  );
}

function PdfRightAngleMark({ v, p1, p2 }: { v: Pt; p1: Pt; p2: Pt }) {
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
      fill="none" stroke={INK} strokeWidth={1.2}
    />
  );
}

function PdfLabel({ pt, text, dx = 0, dy = 0, size = 9, color = "#111111", bold = false }: {
  pt: Pt; text: string; dx?: number; dy?: number; size?: number; color?: string; bold?: boolean;
}) {
  return (
    <Text
      x={pt.x + dx - 3} y={pt.y + dy + 3}
      style={{ fontSize: size, fontFamily: bold ? "Times-Bold" : FONT, color }}
    >
      {text}
    </Text>
  );
}

// ── Two marked triangles ─────────────────────────────────────────────────────

const T1: [Pt, Pt, Pt] = [{ x: 50, y: 38 }, { x: 18, y: 148 }, { x: 88, y: 148 }];
const T2: [Pt, Pt, Pt] = [{ x: 150, y: 38 }, { x: 182, y: 148 }, { x: 112, y: 148 }];

function PdfTwoTrianglesSVG({
  sideMarks, angleMarks, rightAngleAt, centerSymbol, bisectors, midpoints,
  labels1 = ["A", "B", "C"], labels2 = ["D", "E", "F"],
}: {
  sideMarks: [number, number, number];
  angleMarks: [boolean, boolean, boolean];
  bisectors?: [boolean, boolean, boolean];
  midpoints?: number[];
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
  const off1 = [{ x: 0, y: -7 }, { x: -8, y: 7 }, { x: 1, y: 11 }];
  const off2 = [{ x: 0, y: -7 }, { x: 8, y: 7 }, { x: -1, y: 11 }];
  // Angle bisectors: rays from each bisected vertex to a shared interior
  // point (Q in triangle 1, R in triangle 2; the midpoint of the opposite
  // side when only one vertex is bisected), with equal half-angle arcs.
  const bisectorFigure = (verts: Pt[], neighbors: [Pt, Pt][], label: string) => {
    if (!bisectors) return null;
    const idxs = [0, 1, 2].filter((i) => bisectors[i]);
    if (idxs.length === 0) return null;
    let q: Pt;
    if (idxs.length >= 2) {
      q = {
        x: (verts[0].x + verts[1].x + verts[2].x) / 3,
        y: (verts[0].y + verts[1].y + verts[2].y) / 3,
      };
    } else {
      const [j, k] = [0, 1, 2].filter((i) => i !== idxs[0]);
      q = { x: (verts[j].x + verts[k].x) / 2, y: (verts[j].y + verts[k].y) / 2 };
    }
    return (
      <React.Fragment>
        {idxs.map((i) => (
          <React.Fragment key={i}>
            <Line x1={verts[i].x} y1={verts[i].y} x2={q.x} y2={q.y} stroke={INK} strokeWidth={1.2} />
            <PdfAngleArc v={verts[i]} p1={neighbors[i][0]} p2={q} />
            <PdfAngleArc v={verts[i]} p1={q} p2={neighbors[i][1]} />
          </React.Fragment>
        ))}
        <Circle cx={q.x} cy={q.y} r={1.8} fill={INK} />
        <PdfLabel pt={q} text={label} dx={5} dy={-4} />
      </React.Fragment>
    );
  };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={INK} strokeWidth={1.5} />
      <Polygon points={`${D.x},${D.y} ${E.x},${E.y} ${F.x},${F.y}`} fill="none" stroke={INK} strokeWidth={1.5} />
      {sideMarks.map((count, i) =>
        count > 0 ? (
          <React.Fragment key={i}>
            <PdfTickMarks p1={sides1[i][0]} p2={sides1[i][1]} count={count} />
            <PdfTickMarks p1={sides2[i][0]} p2={sides2[i][1]} count={count} />
          </React.Fragment>
        ) : null
      )}
      {angleMarks.map((marked, i) =>
        marked && !bisectors?.[i] ? (
          <React.Fragment key={i}>
            <PdfAngleArc v={verts1[i]} p1={neighbors1[i][0]} p2={neighbors1[i][1]} />
            <PdfAngleArc v={verts2[i]} p1={neighbors2[i][0]} p2={neighbors2[i][1]} />
          </React.Fragment>
        ) : null
      )}
      {bisectorFigure(verts1, neighbors1, "Q")}
      {bisectorFigure(verts2, neighbors2, "R")}
      {rightAngleAt >= 0 && (
        <>
          <PdfRightAngleMark v={verts1[rightAngleAt]} p1={neighbors1[rightAngleAt][0]} p2={neighbors1[rightAngleAt][1]} />
          <PdfRightAngleMark v={verts2[rightAngleAt]} p1={neighbors2[rightAngleAt][0]} p2={neighbors2[rightAngleAt][1]} />
        </>
      )}
      {midpoints && midpoints.length > 0 && midpoints.map((si) => {
        const renderMid = (verts: Pt[], sides: [Pt, Pt][], label: string) => {
          const [p1, p2] = sides[si];
          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          const c = { x: (verts[0].x + verts[1].x + verts[2].x) / 3, y: (verts[0].y + verts[1].y + verts[2].y) / 3 };
          const dx = mid.x - c.x, dy = mid.y - c.y;
          const len = Math.hypot(dx, dy) || 1;
          return (
            <React.Fragment key={label}>
              <Circle cx={mid.x} cy={mid.y} r={1.8} fill={INK} />
              <Text x={mid.x + (dx / len) * 10 - 3} y={mid.y + (dy / len) * 10 + 3} style={{ fontSize: 9, fontFamily: FONT, color: "#111111" }}>
                {label}
              </Text>
            </React.Fragment>
          );
        };
        return (
          <React.Fragment key={si}>
            {renderMid(verts1, sides1, "T")}
            {renderMid(verts2, sides2, "S")}
          </React.Fragment>
        );
      })}
      {verts1.map((v, i) => (
        <PdfLabel key={i} pt={v} text={labels1[i]} dx={off1[i].x} dy={off1[i].y} />
      ))}
      {verts2.map((v, i) => (
        <PdfLabel key={i} pt={v} text={labels2[i]} dx={off2[i].x} dy={off2[i].y} />
      ))}
      <Text x={96} y={104} style={{ fontSize: 13, fontFamily: "WorksheetSerif", color: "#64748b" }}>
        {pdfSafeText(centerSymbol)}
      </Text>
    </Svg>
  );
}

export function PdfProofCongruenceSVG(p: ProofCongruenceSVGParams) {
  return (
    <PdfTwoTrianglesSVG
      sideMarks={p.sideMarks} angleMarks={p.angleMarks}
      rightAngleAt={p.rightAngleAt} centerSymbol="≅" bisectors={p.bisectors} midpoints={p.midpoints}
    />
  );
}

export function PdfProofSimilaritySVG(p: ProofSimilaritySVGParams) {
  return (
    <PdfTwoTrianglesSVG
      sideMarks={[0, 0, 0]} angleMarks={p.angleMarks}
      rightAngleAt={p.rightAngleAt ?? -1} centerSymbol="~" bisectors={p.bisectors}
    />
  );
}

// ── Isosceles triangle ───────────────────────────────────────────────────────

export function PdfProofIsoscelesSVG(p: ProofIsoscelesSVGParams) {
  const A: Pt = { x: 100, y: 42 };
  const B: Pt = { x: 52, y: 152 };
  const C: Pt = { x: 148, y: 152 };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={INK} strokeWidth={1.5} />
      {p.markEqualLegs && (
        <>
          <PdfTickMarks p1={A} p2={B} count={1} />
          <PdfTickMarks p1={A} p2={C} count={1} />
        </>
      )}
      {p.markBaseAngles && (
        <>
          <PdfAngleArc v={B} p1={A} p2={C} />
          <PdfAngleArc v={C} p1={B} p2={A} />
        </>
      )}
      <PdfLabel pt={A} text="A" dy={-8} />
      <PdfLabel pt={B} text="B" dx={-9} dy={7} />
      <PdfLabel pt={C} text="C" dx={9} dy={7} />
    </Svg>
  );
}

// ── Parallel lines ───────────────────────────────────────────────────────────

const PL = { lY: 70, mY: 140, x0: 20, x1: 180, tTop: { x: 60, y: 10 }, tBot: { x: 140, y: 190 } };

function transversalX(y: number): number {
  return PL.tTop.x + ((PL.tBot.x - PL.tTop.x) * (y - PL.tTop.y)) / (PL.tBot.y - PL.tTop.y);
}

const ANGLE_SLOTS: Record<number, { v: Pt; a1: number; a2: number }> = (() => {
  const P1 = { x: transversalX(PL.lY), y: PL.lY };
  const P2 = { x: transversalX(PL.mY), y: PL.mY };
  const mk = (v: Pt, a1: number, a2: number) => ({ v, a1, a2 });
  return {
    1: mk(P1, 180, 246), 2: mk(P1, 246, 360), 3: mk(P1, 0, 66), 4: mk(P1, 66, 180),
    5: mk(P2, 180, 246), 6: mk(P2, 246, 360), 7: mk(P2, 0, 66), 8: mk(P2, 66, 180),
  };
})();

function PdfSlotArc({ n, marked, givenAngle }: { n: number; marked: boolean; givenAngle?: number }) {
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
      <Path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        fill="none"
        stroke={marked ? "#111111" : "#94a3b8"}
        strokeWidth={marked ? 2 : 1}
      />
      <Text
        x={givenAngle !== undefined ? lx - 10 : lx - 3} y={ly + 3}
        style={{ fontSize: givenAngle !== undefined ? 9.5 : marked ? 10 : 8.5, fontFamily: marked || givenAngle !== undefined ? "Times-Bold" : FONT, color: marked || givenAngle !== undefined ? "#111111" : "#64748b" }}
      >
        {givenAngle !== undefined ? `${givenAngle}°` : String(n)}
      </Text>
    </>
  );
}

function PdfParallelTicks({ y }: { y: number }) {
  return (
    <>
      {[70, 130].map((x) => (
        <Path
          key={x}
          d={`M ${x - 4} ${y - 4} L ${x + 3} ${y} L ${x - 4} ${y + 4}`}
          fill="none" stroke="#111111" strokeWidth={1.4}
        />
      ))}
    </>
  );
}

export function PdfProofParallelLinesSVG(p: ProofParallelLinesSVGParams) {
  const { lY, mY, x0, x1, tTop, tBot } = PL;
  const [m1, m2] = p.markedAngles;
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Line x1={x0} y1={lY} x2={x1} y2={lY} stroke={INK} strokeWidth={1.5} />
      <Line x1={x0} y1={mY} x2={x1} y2={mY} stroke={INK} strokeWidth={1.5} />
      <Line x1={tTop.x} y1={tTop.y} x2={tBot.x} y2={tBot.y} stroke={INK} strokeWidth={1.2} />
      {p.parallel && (
        <>
          <PdfParallelTicks y={lY} />
          <PdfParallelTicks y={mY} />
        </>
      )}
      <PdfLabel pt={{ x: x0, y: lY }} text="l" dx={-8} dy={-4} size={10} />
      <PdfLabel pt={{ x: x0, y: mY }} text="m" dx={-8} dy={-4} size={10} />
      <PdfLabel pt={tBot} text="t" dx={6} dy={-2} size={10} />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <PdfSlotArc key={n} n={n} marked={n === m1 || n === m2} givenAngle={n === p.givenAngleIndex ? p.givenAngle : undefined} />
      ))}
    </Svg>
  );
}

// ── Circle figures ───────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function PdfProofCircleSVG(p: ProofCircleSVGParams) {
  const CX = 100, CY = 100, R = 62;
  if (p.figure === "inscribed") {
    const A = polar(CX, CY, R, 150);
    const C = polar(CX, CY, R, 150 + p.arc);
    const B = polar(CX, CY, R, 285);
    const mid = polar(CX, CY, R + 14, 150 + p.arc / 2);
    return (
      <Svg viewBox="0 0 200 200" width="130" height="130">
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={INK} strokeWidth={1.5} />
        <Path d={`M ${A.x} ${A.y} A ${R} ${R} 0 0 1 ${C.x} ${C.y}`} fill="none" stroke="#111111" strokeWidth={3} />
        <Line x1={B.x} y1={B.y} x2={A.x} y2={A.y} stroke={INK} strokeWidth={1.2} />
        <Line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={INK} strokeWidth={1.2} />
        {[A, B, C].map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={INK} />
        ))}
        <PdfLabel pt={A} text="A" dx={-9} dy={2} />
        <PdfLabel pt={C} text="C" dx={9} dy={2} />
        <PdfLabel pt={B} text="B" dy={12} />
        <PdfAngleArc v={B} p1={A} p2={C} r={14} />
        <Text x={mid.x - 8} y={mid.y + 3} style={{ fontSize: 9, fontFamily: "Times-Bold", color: "#111111" }}>
          {`${p.arc}°`}
        </Text>
        <Text x={B.x - 8} y={B.y - 15} style={{ fontSize: 9, fontFamily: "Times-Bold", color: "#111111" }}>
          {`${p.angle}°`}
        </Text>
      </Svg>
    );
  }
  const A = polar(CX, CY, R, 90);
  const Bp = polar(CX, CY, R, 90 + p.arc);
  const mid = polar(CX, CY, R + 14, 90 + p.arc / 2);
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Circle cx={CX} cy={CY} r={R} fill="none" stroke={INK} strokeWidth={1.5} />
      <Path d={`M ${A.x} ${A.y} A ${R} ${R} 0 0 1 ${Bp.x} ${Bp.y}`} fill="none" stroke="#111111" strokeWidth={3} />
      <Line x1={A.x - 55} y1={A.y} x2={A.x + 55} y2={A.y} stroke="#6b7280" strokeWidth={1.5} strokeDasharray="5,3" />
      <Line x1={A.x} y1={A.y} x2={Bp.x} y2={Bp.y} stroke={INK} strokeWidth={1.2} />
      {[A, Bp].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={INK} />
      ))}
      <PdfLabel pt={A} text="A" dx={-9} dy={-6} />
      <PdfLabel pt={Bp} text="B" dx={9} dy={2} />
      <PdfLabel pt={{ x: A.x + 48, y: A.y }} text="t" dy={-6} size={10} />
      <Text x={mid.x - 8} y={mid.y + 3} style={{ fontSize: 9, fontFamily: "Times-Bold", color: "#111111" }}>
        {`${p.arc}°`}
      </Text>
      <Text x={A.x + 12} y={A.y + 19} style={{ fontSize: 9, fontFamily: "Times-Bold", color: "#111111" }}>
        {`${p.angle}°`}
      </Text>
    </Svg>
  );
}

// ── Elements figures ─────────────────────────────────────────────────────────

function PdfElementsI1() {
  const A: Pt = { x: 55, y: 140 };
  const B: Pt = { x: 145, y: 140 };
  const r = B.x - A.x;
  const C: Pt = { x: (A.x + B.x) / 2, y: A.y - (r * Math.sqrt(3)) / 2 };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Circle cx={A.x} cy={A.y} r={r} fill="none" stroke="#94a3b8" strokeWidth={1} />
      <Circle cx={B.x} cy={B.y} r={r} fill="none" stroke="#94a3b8" strokeWidth={1} />
      <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={INK} strokeWidth={2} />
      <Line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke={INK} strokeWidth={1.5} />
      <Line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={INK} strokeWidth={1.5} />
      {[A, B, C].map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={INK} />
      ))}
      <PdfLabel pt={A} text="A" dx={-9} dy={8} />
      <PdfLabel pt={B} text="B" dx={9} dy={8} />
      <PdfLabel pt={C} text="C" dy={-8} />
    </Svg>
  );
}

function PdfElementsI5() {
  const A: Pt = { x: 100, y: 40 };
  const B: Pt = { x: 58, y: 148 };
  const C: Pt = { x: 142, y: 148 };
  const D: Pt = { x: B.x + (B.x - A.x) * 0.32, y: B.y + (B.y - A.y) * 0.32 };
  const E: Pt = { x: C.x + (C.x - A.x) * 0.32, y: C.y + (C.y - A.y) * 0.32 };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke={INK} strokeWidth={1.2} strokeDasharray="5,3" />
      <Line x1={A.x} y1={A.y} x2={E.x} y2={E.y} stroke={INK} strokeWidth={1.2} strokeDasharray="5,3" />
      <Line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke={INK} strokeWidth={1.5} />
      <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={INK} strokeWidth={1.5} />
      <Line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke={INK} strokeWidth={1.5} />
      <PdfTickMarks p1={A} p2={B} count={1} />
      <PdfTickMarks p1={A} p2={C} count={1} />
      <PdfLabel pt={A} text="A" dy={-8} />
      <PdfLabel pt={B} text="B" dx={-9} dy={4} />
      <PdfLabel pt={C} text="C" dx={9} dy={4} />
      <PdfLabel pt={D} text="D" dx={-9} dy={6} />
      <PdfLabel pt={E} text="E" dx={9} dy={6} />
    </Svg>
  );
}

function PdfElementsI29() {
  const y1 = 70, y2 = 130;
  const G: Pt = { x: transversalX(y1), y: y1 };
  const H: Pt = { x: transversalX(y2), y: y2 };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Line x1={20} y1={y1} x2={180} y2={y1} stroke={INK} strokeWidth={1.5} />
      <Line x1={20} y1={y2} x2={180} y2={y2} stroke={INK} strokeWidth={1.5} />
      <Line x1={PL.tTop.x} y1={PL.tTop.y} x2={PL.tBot.x} y2={PL.tBot.y} stroke={INK} strokeWidth={1.2} />
      <PdfParallelTicks y={y1} />
      <PdfParallelTicks y={y2} />
      <PdfAngleArc v={G} p1={{ x: 20, y: y1 }} p2={PL.tTop} r={14} />
      <PdfAngleArc v={H} p1={{ x: 180, y: y2 }} p2={PL.tBot} r={14} />
      <PdfLabel pt={{ x: 20, y: y1 }} text="A" dx={-9} dy={-4} />
      <PdfLabel pt={{ x: 180, y: y1 }} text="B" dx={9} dy={-4} />
      <PdfLabel pt={{ x: 20, y: y2 }} text="C" dx={-9} dy={10} />
      <PdfLabel pt={{ x: 180, y: y2 }} text="D" dx={9} dy={10} />
      <PdfLabel pt={PL.tTop} text="E" dy={-4} />
      <PdfLabel pt={PL.tBot} text="F" dy={12} />
      <PdfLabel pt={G} text="G" dx={10} dy={-8} />
      <PdfLabel pt={H} text="H" dx={-10} dy={10} />
    </Svg>
  );
}

function PdfElementsI32() {
  const A: Pt = { x: 100, y: 45 };
  const B: Pt = { x: 50, y: 140 };
  const C: Pt = { x: 150, y: 140 };
  const D: Pt = { x: 188, y: 140 };
  const dir = { x: A.x - B.x, y: A.y - B.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const E: Pt = { x: C.x + (dir.x / len) * 46, y: C.y + (dir.y / len) * 46 };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke={INK} strokeWidth={1.5} />
      <Polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={INK} strokeWidth={1.5} />
      <Line x1={C.x} y1={C.y} x2={E.x} y2={E.y} stroke="#6b7280" strokeWidth={1.2} strokeDasharray="5,3" />
      <PdfAngleArc v={C} p1={D} p2={A} r={16} />
      <PdfLabel pt={A} text="A" dy={-8} />
      <PdfLabel pt={B} text="B" dx={-9} dy={6} />
      <PdfLabel pt={C} text="C" dy={12} />
      <PdfLabel pt={D} text="D" dx={9} dy={-2} />
      <PdfLabel pt={E} text="E" dx={9} dy={-4} />
    </Svg>
  );
}

function PdfElementsI47({ a = 6, b = 8 }: { a?: number; b?: number }) {
  const u = 5;
  const A: Pt = { x: 78, y: 118 };
  const B: Pt = { x: 78, y: 118 - a * u };
  const C: Pt = { x: 78 + b * u, y: 118 };
  const B2: Pt = { x: B.x - a * u, y: B.y };
  const A2: Pt = { x: A.x - a * u, y: A.y };
  const C2: Pt = { x: C.x, y: C.y + b * u };
  const A3: Pt = { x: A.x, y: A.y + b * u };
  const dx = C.x - B.x, dy = C.y - B.y;
  const hyp = Math.hypot(dx, dy) || 1;
  let nx = -dy / hyp, ny = dx / hyp;
  const midBC = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
  if (nx * (A.x - midBC.x) + ny * (A.y - midBC.y) > 0) { nx = -nx; ny = -ny; }
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
        <Circle cx={q.x} cy={q.y} r={2.2} fill={INK} />
        <Text x={q.x + dxl - 3} y={q.y + dyl + 3} style={{ fontSize: 9, fontFamily: FONT, color: "#111111" }}>
          {label}
        </Text>
      </React.Fragment>
    );
  };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon points={poly([B, B2, A2, A])} fill="#e2e8f0" stroke={INK} strokeWidth={1.2} />
      <Polygon points={poly([A, C, C2, A3])} fill="#e2e8f0" stroke={INK} strokeWidth={1.2} />
      <Polygon points={poly([B, C, C3, B3])} fill="#f1f5f9" stroke={INK} strokeWidth={1.2} />
      <Polygon points={poly([A, B, C])} fill="#ffffff" stroke={INK} strokeWidth={1.8} />
      {dot(A, "A", -8, 8)}
      {dot(B, "B", -8, -4)}
      {dot(C, "C", 8, 8)}
    </Svg>
  );
}

function PdfElementsI48({ a = 3, b = 4 }: { a?: number; b?: number }) {
  const u = 9;
  const A: Pt = { x: 80, y: 105 };
  const C: Pt = { x: 80 + b * u, y: 105 };
  const B: Pt = { x: 80, y: 105 - a * u };
  const D: Pt = { x: 80, y: 105 + a * u };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke={INK} strokeWidth={1.8} />
      <Line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke="#6b7280" strokeWidth={1.2} strokeDasharray="5,3" />
      <Line x1={D.x} y1={D.y} x2={B.x} y2={B.y} stroke="#6b7280" strokeWidth={1.2} strokeDasharray="5,3" />
      <PdfRightAngleMark v={A} p1={D} p2={C} />
      <PdfLabel pt={A} text="A" dx={-9} dy={2} />
      <PdfLabel pt={B} text="B" dx={-8} dy={-4} />
      <PdfLabel pt={C} text="C" dx={9} dy={4} />
      <PdfLabel pt={D} text="D" dx={-9} dy={8} />
    </Svg>
  );
}

export function PdfProofElementsSVG(p: ProofElementsSVGParams) {
  const prop: ElementsProposition = p.prop;
  switch (prop) {
    case "I.1": return <PdfElementsI1 />;
    case "I.4":
      return <PdfTwoTrianglesSVG sideMarks={[1, 2, 0]} angleMarks={[true, false, false]} rightAngleAt={-1} centerSymbol="≅" />;
    case "I.5": return <PdfElementsI5 />;
    case "I.8":
      return <PdfTwoTrianglesSVG sideMarks={[1, 2, 3]} angleMarks={[false, false, false]} rightAngleAt={-1} centerSymbol="≅" />;
    case "I.29": return <PdfElementsI29 />;
    case "I.32": return <PdfElementsI32 />;
    case "I.47": return <PdfElementsI47 a={p.a} b={p.b} />;
    case "I.48": return <PdfElementsI48 a={p.a} b={p.b} />;
    default: return null;
  }
}

// ── Quadrilateral (parallelogram) figure ─────────────────────────────────────

const QUAD: Record<string, Pt> = {
  A: { x: 45, y: 150 },
  B: { x: 155, y: 150 },
  C: { x: 175, y: 55 },
  D: { x: 65, y: 55 },
};
const QUAD_M: Pt = { x: 110, y: 102.5 };
const QUAD_SIDES: [string, string][] = [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]];

function PdfSideChevron({ p1, p2 }: { p1: Pt; p2: Pt }) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const ux = (p2.x - p1.x) / len;
  const uy = (p2.y - p1.y) / len;
  const px = -uy;
  const py = ux;
  return (
    <Path
      d={`M ${mx - ux * 4 + px * 4} ${my - uy * 4 + py * 4} L ${mx + ux * 3} ${my + uy * 3} L ${mx - ux * 4 - px * 4} ${my - uy * 4 - py * 4}`}
      fill="none" stroke="#111111" strokeWidth={1.4}
    />
  );
}

export function PdfProofQuadrilateralSVG(p: ProofQuadrilateralSVGParams) {
  const { A, B, C, D } = QUAD;
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`} fill="none" stroke={INK} strokeWidth={1.5} />
      {(p.diagonal === "AC" || p.diagonal === "both") && (
        <Line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke={INK} strokeWidth={1.1} />
      )}
      {(p.diagonal === "BD" || p.diagonal === "both") && (
        <Line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke={INK} strokeWidth={1.1} />
      )}
      {p.diagonal === "both" && (
        <>
          <Circle cx={QUAD_M.x} cy={QUAD_M.y} r={2.2} fill={INK} />
          <PdfLabel pt={QUAD_M} text="M" dx={9} dy={-4} />
        </>
      )}
      {QUAD_SIDES.map(([s1, s2], i) =>
        p.sideMarks[i] > 0 ? (
          <PdfTickMarks key={i} p1={QUAD[s1]} p2={QUAD[s2]} count={p.sideMarks[i]} />
        ) : null
      )}
      {p.parallelMarks.map((side) => {
        const found = QUAD_SIDES.find(([a, b]) => a + b === side) ?? QUAD_SIDES[0];
        return <PdfSideChevron key={side} p1={QUAD[found[0]]} p2={QUAD[found[1]]} />;
      })}
      {p.diagMarks[0] > 0 && (
        <>
          <PdfTickMarks p1={A} p2={QUAD_M} count={p.diagMarks[0]} />
          <PdfTickMarks p1={QUAD_M} p2={C} count={p.diagMarks[0]} />
        </>
      )}
      {p.diagMarks[1] > 0 && (
        <>
          <PdfTickMarks p1={B} p2={QUAD_M} count={p.diagMarks[1]} />
          <PdfTickMarks p1={QUAD_M} p2={D} count={p.diagMarks[1]} />
        </>
      )}
      <PdfLabel pt={A} text="A" dx={-8} dy={8} />
      <PdfLabel pt={B} text="B" dx={8} dy={8} />
      <PdfLabel pt={C} text="C" dx={8} dy={-4} />
      <PdfLabel pt={D} text="D" dx={-8} dy={-4} />
    </Svg>
  );
}

// ── Angle-proof figures ──────────────────────────────────────────────────────

export function PdfProofAngleFigureSVG(p: ProofAngleFigureSVGParams) {
  if (p.figure === "vertical") {
    const A: Pt = { x: 30, y: 55 };
    const B: Pt = { x: 170, y: 145 };
    const C: Pt = { x: 155, y: 50 };
    const D: Pt = { x: 45, y: 150 };
    const E: Pt = { x: 100, y: 100 };
    const pair = p.markPair ?? 0;
    return (
      <Svg viewBox="0 0 200 200" width="130" height="130">
        <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={INK} strokeWidth={1.5} />
        <Line x1={C.x} y1={C.y} x2={D.x} y2={D.y} stroke={INK} strokeWidth={1.5} />
        {pair === 0 ? (
          <>
            <PdfAngleArc v={E} p1={A} p2={C} r={17} />
            <PdfAngleArc v={E} p1={D} p2={B} r={17} />
          </>
        ) : (
          <>
            <PdfAngleArc v={E} p1={A} p2={D} r={17} />
            <PdfAngleArc v={E} p1={B} p2={C} r={17} />
          </>
        )}
        <PdfLabel pt={A} text="A" dx={-8} dy={-2} />
        <PdfLabel pt={B} text="B" dx={8} dy={6} />
        <PdfLabel pt={C} text="C" dx={8} dy={-2} />
        <PdfLabel pt={D} text="D" dx={-8} dy={8} />
        <PdfLabel pt={E} text="E" dx={0} dy={-10} />
      </Svg>
    );
  }
  const A: Pt = { x: 35, y: 150 };
  const B: Pt = { x: 165, y: 150 };
  const M: Pt = { x: 100, y: 150 };
  const P: Pt = { x: 100, y: 45 };
  return (
    <Svg viewBox="0 0 200 200" width="130" height="130">
      <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={INK} strokeWidth={1.5} />
      <Line x1={100} y1={168} x2={100} y2={30} stroke={INK} strokeWidth={1.2} />
      <Line x1={P.x} y1={P.y} x2={A.x} y2={A.y} stroke={INK} strokeWidth={1.2} />
      <Line x1={P.x} y1={P.y} x2={B.x} y2={B.y} stroke={INK} strokeWidth={1.2} />
      <PdfRightAngleMark v={M} p1={A} p2={P} />
      {p.markMidpoint && (
        <>
          <PdfTickMarks p1={A} p2={M} count={1} />
          <PdfTickMarks p1={M} p2={B} count={1} />
        </>
      )}
      {p.markSlants && (
        <>
          <PdfTickMarks p1={P} p2={A} count={2} />
          <PdfTickMarks p1={P} p2={B} count={2} />
        </>
      )}
      <Circle cx={P.x} cy={P.y} r={2.2} fill={INK} />
      <Circle cx={M.x} cy={M.y} r={2.2} fill={INK} />
      <PdfLabel pt={A} text="A" dx={-8} dy={8} />
      <PdfLabel pt={B} text="B" dx={8} dy={8} />
      <PdfLabel pt={M} text="M" dx={0} dy={14} />
      <PdfLabel pt={P} text="P" dx={9} dy={0} />
    </Svg>
  );
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function PdfProofSVG({ params }: { params: ProofSVGParams }) {
  if (!params) return null;
  switch (params.kind) {
    case "ProofCongruence":
      return <PdfProofCongruenceSVG {...(params as ProofCongruenceSVGParams)} />;
    case "ProofIsosceles":
      return <PdfProofIsoscelesSVG {...(params as ProofIsoscelesSVGParams)} />;
    case "ProofParallelLines":
      return <PdfProofParallelLinesSVG {...(params as ProofParallelLinesSVGParams)} />;
    case "ProofSimilarity":
      return <PdfProofSimilaritySVG {...(params as ProofSimilaritySVGParams)} />;
    case "ProofElements":
      return <PdfProofElementsSVG {...(params as ProofElementsSVGParams)} />;
    case "ProofCircle":
      return <PdfProofCircleSVG {...(params as ProofCircleSVGParams)} />;
    case "ProofQuadrilateral":
      return <PdfProofQuadrilateralSVG {...(params as ProofQuadrilateralSVGParams)} />;
    case "ProofAngleFigure":
      return <PdfProofAngleFigureSVG {...(params as ProofAngleFigureSVGParams)} />;
    default:
      return null;
  }
}

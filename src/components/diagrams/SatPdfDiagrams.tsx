// SatPdfDiagrams.tsx
// @react-pdf/renderer counterparts of SatWebDiagrams.tsx.
// The two files must stay visually parallel: same geometry, same labels.
// Uses Times-Roman (always available) rather than the embedded DejaVu Serif,
// matching the existing PdfGeometrySVG conventions.

import React from "react";
import { Svg, Line, Path, Text, Polygon, Circle } from "@react-pdf/renderer";
import type { SATDiagramParams } from "@/lib/satTypes";

const INK = "#0F172A";
const GOLD = "#B48A18";

function SatPdfTable({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: string[][];
  caption?: string;
}) {
  // @react-pdf has no <table>; emulate with positioned Text + Lines.
  const cols = headers.length;
  const colW = 62;
  const rowH = 16;
  const x0 = 100 - (cols * colW) / 2;
  const tableH = (rows.length + 1) * rowH;
  const y0 = 60 - tableH / 2;
  const lines = [];
  for (let r = 0; r <= rows.length + 1; r++) {
    lines.push(
      <Line
        key={`h${r}`}
        x1={x0}
        y1={y0 + r * rowH}
        x2={x0 + cols * colW}
        y2={y0 + r * rowH}
        stroke={INK}
        strokeWidth={0.8}
      />
    );
  }
  for (let c = 0; c <= cols; c++) {
    lines.push(
      <Line
        key={`v${c}`}
        x1={x0 + c * colW}
        y1={y0}
        x2={x0 + c * colW}
        y2={y0 + tableH}
        stroke={INK}
        strokeWidth={0.8}
      />
    );
  }
  return (
    <Svg viewBox="0 0 200 130" width="190" height="124">
      {lines}
      {headers.map((h, i) => (
        <Text
          key={`h${i}`}
          x={x0 + i * colW + colW / 2 - h.length * 2.4}
          y={y0 + 11}
          style={{ fontSize: 9, fontFamily: "Times-Bold", color: INK }}
        >
          {h}
        </Text>
      ))}
      {rows.map((row, r) =>
        row.map((cell, c) => (
          <Text
            key={`c${r}-${c}`}
            x={x0 + c * colW + colW / 2 - cell.length * 2.4}
            y={y0 + (r + 1) * rowH + 11}
            style={{ fontSize: 9, fontFamily: "Times-Roman", color: INK }}
          >
            {cell}
          </Text>
        ))
      )}
      {caption && (
        <Text
          x={100 - caption.length * 2.2}
          y={y0 + tableH + 14}
          style={{ fontSize: 8, fontFamily: "Times-Roman", color: "#64748b" }}
        >
          {caption}
        </Text>
      )}
    </Svg>
  );
}

function SatPdfRightTriangle({
  adj,
  opp,
  labels,
  angleLabel,
}: {
  adj: number;
  opp: number;
  hyp: number;
  labels: { adj: string; opp: string; hyp: string };
  angleLabel: string;
}) {
  const W = 200;
  const H = 170;
  const pad = 34;
  const maxLeg = Math.max(adj, opp);
  const s = Math.min((W - 2 * pad) / maxLeg, (H - 2 * pad) / maxLeg);
  const ax = pad;
  const ay = H - pad;
  const bx = ax + adj * s;
  const by = ay;
  const cx = bx;
  const cy = ay - opp * s;

  const ang = Math.atan2(opp, adj);
  const rArc = 22;
  const arcEndX = bx - rArc * Math.cos(ang);
  const arcEndY = by - rArc * Math.sin(ang);

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="190" height="162">
      <Polygon
        points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
        fill="none"
        stroke={INK}
        strokeWidth={2}
      />
      <Path
        d={`M ${ax + 10} ${ay} L ${ax + 10} ${ay - 10} L ${ax} ${ay - 10}`}
        fill="none"
        stroke={INK}
        strokeWidth={1.5}
      />
      <Path
        d={`M ${bx - rArc} ${by} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke={GOLD}
        strokeWidth={1.8}
      />
      <Text
        x={bx - rArc - 16}
        y={by - 2}
        style={{ fontSize: 12, fontFamily: "Times-Roman", color: INK }}
      >
        {angleLabel}
      </Text>
      <Text
        x={(ax + bx) / 2 - 4}
        y={ay + 16}
        style={{ fontSize: 11, fontFamily: "Times-Roman", color: INK }}
      >
        {labels.adj}
      </Text>
      <Text
        x={bx + 8}
        y={(by + cy) / 2 + 4}
        style={{ fontSize: 11, fontFamily: "Times-Roman", color: INK }}
      >
        {labels.opp}
      </Text>
      <Text
        x={(ax + cx) / 2 - 12}
        y={(ay + cy) / 2 - 4}
        style={{ fontSize: 11, fontFamily: "Times-Roman", color: INK }}
      >
        {labels.hyp}
      </Text>
    </Svg>
  );
}

function SatPdfTriangle({
  vertices,
  angleLabels,
}: {
  vertices: [string, string, string];
  angleLabels: [string, string, string];
}) {
  const W = 200;
  const H = 170;
  const A = { x: 100, y: 18 };
  const B = { x: 30, y: 140 };
  const C = { x: 170, y: 140 };
  const inner = [
    { x: 100, y: 52 },
    { x: 62, y: 118 },
    { x: 138, y: 118 },
  ];
  const vOff = [
    { x: 0, y: -6 },
    { x: -12, y: 14 },
    { x: 12, y: 14 },
  ];
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="190" height="162">
      <Polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="none"
        stroke={INK}
        strokeWidth={2}
      />
      {[A, B, C].map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={2.5} fill={INK} />
          <Text
            x={p.x + vOff[i].x - 3}
            y={p.y + vOff[i].y + 3}
            style={{ fontSize: 12, fontFamily: "Times-Bold", color: INK }}
          >
            {vertices[i]}
          </Text>
          <Text
            x={inner[i].x - angleLabels[i].length * 2.4}
            y={inner[i].y + 3}
            style={{ fontSize: 11, fontFamily: "Times-Roman", color: "#334155" }}
          >
            {angleLabels[i]}
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
}

export function SatPdfDiagram({ params }: { params: SATDiagramParams }) {
  switch (params.kind) {
    case "SatTable":
      return (
        <SatPdfTable
          headers={params.headers}
          rows={params.rows}
          caption={params.caption}
        />
      );
    case "SatRightTriangle":
      return (
        <SatPdfRightTriangle
          adj={params.adj}
          opp={params.opp}
          hyp={params.hyp}
          labels={params.labels}
          angleLabel={params.angleLabel}
        />
      );
    case "SatTriangle":
      return (
        <SatPdfTriangle vertices={params.vertices} angleLabels={params.angleLabels} />
      );
    default:
      return null;
  }
}

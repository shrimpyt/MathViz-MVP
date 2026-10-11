"use client";
// SatWebDiagrams.tsx
// Web (SVG/HTML) diagrams for SAT problems. PDF counterparts live in
// SatPdfDiagrams.tsx — the two must stay visually parallel.

import React from "react";
import type { SATDiagramParams } from "@/lib/satTypes";

function SatTableWeb({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: string[][];
  caption?: string;
}) {
  return (
    <figure className="my-2">
      <table className="border-collapse text-sm font-serif mx-auto">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="border border-slate-700 px-3 py-1 bg-slate-100 font-semibold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`border border-slate-700 px-3 py-1 text-center ${
                    j === 0 ? "font-semibold bg-slate-50" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && (
        <figcaption className="text-center text-xs text-slate-500 italic mt-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function SatRightTriangleWeb({
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
  // Fixed viewBox; scale legs to fit while preserving proportion.
  const W = 200;
  const H = 170;
  const pad = 34;
  const maxLeg = Math.max(adj, opp);
  const sx = (W - 2 * pad) / maxLeg;
  const sy = (H - 2 * pad) / maxLeg;
  const s = Math.min(sx, sy);
  const ax = pad; // right angle at bottom-left
  const ay = H - pad;
  const bx = ax + adj * s; // adjacent along the base
  const by = ay;
  const cx = bx; // opposite leg vertical at the far end
  const cy = ay - opp * s;

  const ang = Math.atan2(opp, adj);
  const rArc = 22;
  const arcEndX = bx - rArc * Math.cos(ang);
  const arcEndY = by - rArc * Math.sin(ang);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="190" height="162" role="img">
      <polygon
        points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
        fill="none"
        stroke="#0F172A"
        strokeWidth={2}
      />
      {/* right-angle mark at the bottom-left */}
      <path
        d={`M ${ax + 10} ${ay} L ${ax + 10} ${ay - 10} L ${ax} ${ay - 10}`}
        fill="none"
        stroke="#0F172A"
        strokeWidth={1.5}
      />
      {/* reference angle arc at the base vertex */}
      <path
        d={`M ${bx - rArc} ${by} A ${rArc} ${rArc} 0 0 0 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke="#B48A18"
        strokeWidth={1.8}
      />
      <text
        x={bx - rArc - 12}
        y={by - 4}
        fontSize={13}
        fontStyle="italic"
        fill="#0F172A"
        textAnchor="middle"
      >
        {angleLabel}
      </text>
      <text x={(ax + bx) / 2} y={ay + 18} fontSize={12} textAnchor="middle" fill="#0F172A">
        {labels.adj}
      </text>
      <text x={bx + 14} y={(by + cy) / 2 + 4} fontSize={12} textAnchor="middle" fill="#0F172A">
        {labels.opp}
      </text>
      <text
        x={(ax + cx) / 2 - 8}
        y={(ay + cy) / 2 - 6}
        fontSize={12}
        textAnchor="middle"
        fill="#0F172A"
      >
        {labels.hyp}
      </text>
    </svg>
  );
}

function SatTriangleWeb({
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
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="190" height="162" role="img">
      <polygon
        points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
        fill="none"
        stroke="#0F172A"
        strokeWidth={2}
      />
      {[A, B, C].map((p, i) => (
        <React.Fragment key={i}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#0F172A" />
          <text
            x={p.x + (i === 0 ? 0 : i === 1 ? -14 : 14)}
            y={p.y + (i === 0 ? -8 : 16)}
            fontSize={13}
            fontWeight="bold"
            textAnchor="middle"
            fill="#0F172A"
          >
            {vertices[i]}
          </text>
          <text
            x={inner[i].x}
            y={inner[i].y}
            fontSize={12}
            fontStyle="italic"
            textAnchor="middle"
            fill="#334155"
          >
            {angleLabels[i]}
          </text>
        </React.Fragment>
      ))}
    </svg>
  );
}

export function SatWebDiagram({ params }: { params: SATDiagramParams }) {
  switch (params.kind) {
    case "SatTable":
      return (
        <SatTableWeb
          headers={params.headers}
          rows={params.rows}
          caption={params.caption}
        />
      );
    case "SatRightTriangle":
      return (
        <SatRightTriangleWeb
          adj={params.adj}
          opp={params.opp}
          hyp={params.hyp}
          labels={params.labels}
          angleLabel={params.angleLabel}
        />
      );
    case "SatTriangle":
      return (
        <SatTriangleWeb vertices={params.vertices} angleLabels={params.angleLabels} />
      );
    default:
      return null;
  }
}

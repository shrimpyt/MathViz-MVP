// AlgebraGraphs.tsx
// SVG diagram renderers for the Algebra 1 area: function graphs (lines,
// parabolas, exponentials plotted from the problem's own coefficients),
// scatter plots with a line of best fit, inequality number lines, and
// two-way frequency tables.
//
// Web + PDF duality: every diagram kind has BOTH a web renderer
// (lowercase <svg> elements) and a PDF renderer (react-pdf primitives),
// exported as AlgebraGraphSVG and PdfAlgebraGraphSVG.
//
// Plotting is always recomputed from params — nothing is hardcoded.

import React from "react";
import { Svg, Line as PdfLine, Path as PdfPath, Circle as PdfCircle, Text as PdfText, Rect as PdfRect } from "@react-pdf/renderer";
import type {
  Algebra1GraphParams,
  FunctionGraphSVGParams,
  ScatterPlotSVGParams,
  NumberLineSVGParams,
  TwoWayTableSVGParams,
} from "@/lib/factories/Algebra1Types";

type FuncDef = FunctionGraphSVGParams["funcs"][number];

// ── Shared math (no JSX) ─────────────────────────────────────────────────────

/** Evaluate a function definition at x. */
export function evalFuncDef(fn: FuncDef, x: number): number {
  switch (fn.fn) {
    case "line":
      return fn.m * x + fn.b;
    case "parabola":
      return fn.a * (x - fn.h) * (x - fn.h) + fn.k;
    case "exponential":
      return fn.a * Math.pow(fn.b, x);
  }
}

/** Sample y = f(x) across [x0, x1]; returns segments split where y leaves range. */
export function sampleSegments(
  fn: FuncDef,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  n = 80
): Array<Array<[number, number]>> {
  const segments: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = evalFuncDef(fn, x);
    if (!Number.isFinite(y) || y < y0 - 0.5 || y > y1 + 0.5) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }
    current.push([x, y]);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/** Build a shading polygon path for a line's half-plane. */
export function shadePath(
  fn: { m: number; b: number },
  dir: "above" | "below",
  xRange: [number, number],
  yRange: [number, number],
  X: (x: number) => number,
  Y: (y: number) => number
): string {
  const n = 40;
  const edge = dir === "above" ? yRange[1] : yRange[0];
  const pts: string[] = [];
  if (dir === "above") {
    pts.push(`${X(xRange[0]).toFixed(1)} ${Y(edge).toFixed(1)}`);
  } else {
    pts.push(`${X(xRange[0]).toFixed(1)} ${Y(edge).toFixed(1)}`);
  }
  for (let i = 0; i <= n; i++) {
    const x = xRange[0] + ((xRange[1] - xRange[0]) * i) / n;
    const y = Math.max(yRange[0], Math.min(yRange[1], fn.m * x + fn.b));
    pts.push(`${X(x).toFixed(1)} ${Y(y).toFixed(1)}`);
  }
  pts.push(`${X(xRange[1]).toFixed(1)} ${Y(edge).toFixed(1)}`);
  return "M " + pts.join(" L ") + " Z";
}

/** Compute x/y ranges from the plotted content when not given explicitly. */
export function autoRanges(params: FunctionGraphSVGParams): {
  xRange: [number, number];
  yRange: [number, number];
} {
  let xRange = params.xRange;
  let yRange = params.yRange;
  if (!xRange || !yRange) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const fn of params.funcs) {
      if (fn.fn === "line") {
        const xa = params.xRange?.[0] ?? -8;
        const xb = params.xRange?.[1] ?? 8;
        xs.push(xa, xb);
        ys.push(evalFuncDef(fn, xa), evalFuncDef(fn, xb));
      } else if (fn.fn === "parabola") {
        xs.push(fn.h - 5, fn.h + 5);
        ys.push(fn.k, evalFuncDef(fn, fn.h - 5), evalFuncDef(fn, fn.h + 5));
      } else {
        xs.push(-4, 4);
        ys.push(evalFuncDef(fn, -4), evalFuncDef(fn, 4), fn.a);
      }
    }
    for (const mk of params.marks ?? []) {
      xs.push(mk.x);
      ys.push(mk.y);
    }
    if (params.solution) {
      xs.push(params.solution.x);
      ys.push(params.solution.y);
    }
    const finite = (v: number) => Number.isFinite(v);
    const fxs = xs.filter(finite);
    const fys = ys.filter(finite);
    const x0 = Math.min(...fxs, -2);
    const x1 = Math.max(...fxs, 2);
    const y0 = Math.min(...fys, -2);
    const y1 = Math.max(...fys, 2);
    const pad = (lo: number, hi: number) => {
      const span = Math.max(hi - lo, 4);
      return [Math.floor(lo - span * 0.12), Math.ceil(hi + span * 0.12)] as [number, number];
    };
    if (!xRange) xRange = pad(x0, x1);
    if (!yRange) yRange = pad(y0, y1);
  }
  return { xRange, yRange };
}

/** Intercepts of the first function (for showIntercepts). */
export function functionIntercepts(fn: FuncDef): Array<{ x: number; y: number; label: string }> {
  const out: Array<{ x: number; y: number; label: string }> = [];
  if (fn.fn === "line") {
    out.push({ x: 0, y: fn.b, label: `(0, ${trimNum(fn.b)})` });
    if (fn.m !== 0) {
      const xi = -fn.b / fn.m;
      out.push({ x: xi, y: 0, label: `(${trimNum(xi)}, 0)` });
    }
  } else if (fn.fn === "parabola") {
    out.push({ x: fn.h, y: fn.k, label: `(${trimNum(fn.h)}, ${trimNum(fn.k)})` });
    out.push({ x: 0, y: fn.a * fn.h * fn.h + fn.k, label: "" });
    const disc = -fn.k / fn.a;
    if (disc > 1e-9) {
      const s = Math.sqrt(disc);
      out.push({ x: fn.h - s, y: 0, label: "" });
      out.push({ x: fn.h + s, y: 0, label: "" });
    } else if (Math.abs(disc) <= 1e-9) {
      out.push({ x: fn.h, y: 0, label: "" });
    }
  } else {
    out.push({ x: 0, y: fn.a, label: `(0, ${trimNum(fn.a)})` });
  }
  return out;
}

function trimNum(n: number): string {
  if (!Number.isFinite(n)) return "";
  const r = Math.round(n * 100) / 100;
  return `${r}`;
}

const PALETTE = ["#1d4ed8", "#059669", "#7c3aed", "#d97706"];

// ── Web renderers ────────────────────────────────────────────────────────────

const VW = 200;
const VH = 200;
const PAD = 16;

function makeMapper(xRange: [number, number], yRange: [number, number]) {
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;
  const sx = (VW - 2 * PAD) / (x1 - x0);
  const sy = (VH - 2 * PAD) / (y1 - y0);
  return {
    X: (x: number) => PAD + (x - x0) * sx,
    Y: (y: number) => VH - PAD - (y - y0) * sy,
  };
}

function WebGrid({ xRange, yRange }: { xRange: [number, number]; yRange: [number, number] }) {
  const { X, Y } = makeMapper(xRange, yRange);
  const vLines: React.ReactNode[] = [];
  const hLines: React.ReactNode[] = [];
  for (let gx = Math.ceil(xRange[0]); gx <= xRange[1]; gx++) {
    const isAxis = gx === 0;
    vLines.push(
      <line key={`v${gx}`} x1={X(gx)} y1={PAD} x2={X(gx)} y2={VH - PAD}
        stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.5} />
    );
    if (gx !== 0 || true) {
      vLines.push(
        <text key={`vl${gx}`} x={X(gx)} y={VH - PAD + 10} fontSize={6.5} textAnchor="middle" fill="#94a3b8" fontFamily="Georgia, serif">
          {gx}
        </text>
      );
    }
  }
  for (let gy = Math.ceil(yRange[0]); gy <= yRange[1]; gy++) {
    const isAxis = gy === 0;
    hLines.push(
      <line key={`h${gy}`} x1={PAD} y1={Y(gy)} x2={VW - PAD} y2={Y(gy)}
        stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.5} />
    );
    if (gy !== 0) {
      hLines.push(
        <text key={`hl${gy}`} x={PAD - 4} y={Y(gy) + 2.5} fontSize={6.5} textAnchor="end" fill="#94a3b8" fontFamily="Georgia, serif">
          {gy}
        </text>
      );
    }
  }
  return <g>{vLines}{hLines}</g>;
}

export function FunctionGraphSVG({ params }: { params: FunctionGraphSVGParams }) {
  const { xRange, yRange } = autoRanges(params);
  const { X, Y } = makeMapper(xRange, yRange);
  const marks = [...(params.marks ?? [])];
  if (params.showIntercepts && params.funcs.length > 0) {
    for (const it of functionIntercepts(params.funcs[0])) {
      if (it.x >= xRange[0] && it.x <= xRange[1] && it.y >= yRange[0] && it.y <= yRange[1]) {
        marks.push(it);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full" aria-label="Function graph">
      <rect x={0} y={0} width={VW} height={VH} fill="#ffffff" />
      <WebGrid xRange={xRange} yRange={yRange} />
      {params.funcs.map((fn, i) => {
        const color = fn.color ?? PALETTE[i % PALETTE.length];
        const d = sampleSegments(fn, xRange[0], xRange[1], yRange[0], yRange[1])
          .map((seg) => "M " + seg.map(([x, y]) => `${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(" L "))
          .join(" ");
        const isLine = fn.fn === "line";
        const shade = isLine ? (fn as { shade?: "above" | "below" }).shade : undefined;
        const shadeColor = isLine ? ((fn as { shadeColor?: string }).shadeColor ?? "#3b82f6") : "#3b82f6";
        const dashed = isLine ? (fn as { dashed?: boolean }).dashed : false;
        return (
          <g key={i}>
            {shade && (
              <path d={shadePath({ m: (fn as { m: number }).m, b: (fn as { b: number }).b }, shade, xRange, yRange, X, Y)}
                fill={shadeColor} fillOpacity={0.18} stroke="none" />
            )}
            <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray={dashed ? "6 3" : undefined} />
          </g>
        );
      })}
      {marks.map((mk, i) => (
        <g key={i}>
          <circle cx={X(mk.x)} cy={Y(mk.y)} r={3} fill="#0F172A" />
          {mk.label ? (
            <text x={X(mk.x) + 5} y={Y(mk.y) - 5} fontSize={7.5} fill="#0F172A" fontFamily="Georgia, serif">
              {mk.label}
            </text>
          ) : null}
        </g>
      ))}
      {params.solution && (
        <g>
          <circle cx={X(params.solution.x)} cy={Y(params.solution.y)} r={4.5} fill="#e11d48" stroke="#ffffff" strokeWidth={1.5} />
          <text x={X(params.solution.x) + 7} y={Y(params.solution.y) + 4} fontSize={8} fontWeight="bold" fill="#e11d48" fontFamily="Georgia, serif">
            ({trimNum(params.solution.x)}, {trimNum(params.solution.y)})
          </text>
        </g>
      )}
    </svg>
  );
}

export function ScatterPlotSVG({ params }: { params: ScatterPlotSVGParams }) {
  const xs = params.points.map((p) => p[0]);
  const ys = params.points.map((p) => p[1]);
  const xRange: [number, number] = [0, Math.max(...xs) + 2];
  const yRange: [number, number] = [0, Math.max(...ys) + 5];
  const { X, Y } = makeMapper(xRange, yRange);
  const lx0 = xRange[0];
  const lx1 = xRange[1];
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full" aria-label="Scatter plot with line of best fit">
      <rect x={0} y={0} width={VW} height={VH} fill="#ffffff" />
      <WebGrid xRange={xRange} yRange={yRange} />
      <line
        x1={X(lx0)} y1={Y(params.line.m * lx0 + params.line.b)}
        x2={X(lx1)} y2={Y(params.line.m * lx1 + params.line.b)}
        stroke="#e11d48" strokeWidth={1.8}
      />
      {params.points.map(([x, y], i) => (
        <circle key={i} cx={X(x)} cy={Y(y)} r={3} fill="#1d4ed8" />
      ))}
      {params.xLabel && (
        <text x={VW / 2} y={VH - 2} fontSize={7.5} textAnchor="middle" fill="#475569" fontFamily="Georgia, serif" fontStyle="italic">
          {params.xLabel}
        </text>
      )}
      {params.yLabel && (
        <text x={6} y={VH / 2} fontSize={7.5} textAnchor="middle" fill="#475569" fontFamily="Georgia, serif" fontStyle="italic"
          transform={`rotate(-90 6 ${VH / 2})`}>
          {params.yLabel}
        </text>
      )}
    </svg>
  );
}

export function NumberLineSVG({ params }: { params: NumberLineSVGParams }) {
  const min = params.min ?? params.value - 6;
  const max = params.max ?? params.value + 6;
  const W = 200;
  const H = 60;
  const padX = 14;
  const X = (v: number) => padX + ((v - min) / (max - min)) * (W - 2 * padX);
  const midY = 26;
  const open = params.rel === "<" || params.rel === ">";
  const rayLeft = params.rel === "<" || params.rel === "<=";
  const rayStart = rayLeft ? X(min) : X(params.value);
  const rayEnd = rayLeft ? X(params.value) : X(max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" aria-label="Number line">
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      <line x1={padX - 6} y1={midY} x2={W - padX + 6} y2={midY} stroke="#0F172A" strokeWidth={1.5} />
      <polygon points={`${padX - 6},${midY} ${padX + 1},${midY - 3.5} ${padX + 1},${midY + 3.5}`} fill="#0F172A" />
      <polygon points={`${W - padX + 6},${midY} ${W - padX - 1},${midY - 3.5} ${W - padX - 1},${midY + 3.5}`} fill="#0F172A" />
      {Array.from({ length: max - min + 1 }, (_, i) => {
        const v = min + i;
        return (
          <g key={v}>
            <line x1={X(v)} y1={midY - 4} x2={X(v)} y2={midY + 4} stroke="#0F172A" strokeWidth={1} />
            <text x={X(v)} y={midY + 16} fontSize={7.5} textAnchor="middle" fill="#475569" fontFamily="Georgia, serif">
              {v}
            </text>
          </g>
        );
      })}
      <line x1={rayStart} y1={midY} x2={rayEnd} y2={midY} stroke="#1d4ed8" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={X(params.value)} cy={midY} r={4.5} fill={open ? "#ffffff" : "#1d4ed8"} stroke="#1d4ed8" strokeWidth={2.5} />
    </svg>
  );
}

export function TwoWayTableSVG({ params }: { params: TwoWayTableSVGParams }) {
  const nCols = params.colLabels.length;
  const labelW = 62;
  const cellW = 34;
  const totalW = 34;
  const rowH = 24;
  const W = labelW + nCols * cellW + totalW;
  const nRows = params.rowLabels.length;
  const H = (nRows + 2) * rowH + 18;
  const colTotals = params.colLabels.map((_, j) => params.data.reduce((s, r) => s + r[j], 0));
  const rowTotals = params.data.map((r) => r.reduce((s, v) => s + v, 0));
  const grand = rowTotals.reduce((s, v) => s + v, 0);
  const titleY = 12;
  const top = 18;
  const cell = (x: number, y: number, w: number, h: number, text: string, bold = false, shade = false) => (
    <g key={`${x}-${y}-${text}`}>
      <rect x={x} y={y} width={w} height={h} fill={shade ? "#f1f5f9" : "#ffffff"} stroke="#0F172A" strokeWidth={1} />
      <text x={x + w / 2} y={y + h / 2 + 3} fontSize={7.5} textAnchor="middle" fill="#0F172A"
        fontFamily="Georgia, serif" fontWeight={bold ? "bold" : "normal"}>
        {text}
      </text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" aria-label="Two-way table">
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />
      {params.title && (
        <text x={W / 2} y={titleY} fontSize={8.5} textAnchor="middle" fill="#0F172A" fontFamily="Georgia, serif" fontStyle="italic">
          {params.title}
        </text>
      )}
      {/* header row */}
      {cell(0, top, labelW, rowH, "", false, true)}
      {params.colLabels.map((c, j) => cell(labelW + j * cellW, top, cellW, rowH, c, true, true))}
      {cell(labelW + nCols * cellW, top, totalW, rowH, "Total", true, true)}
      {/* data rows */}
      {params.rowLabels.map((r, i) => (
        <g key={r}>
          {cell(0, top + (i + 1) * rowH, labelW, rowH, r, true, true)}
          {params.data[i].map((v, j) => cell(labelW + j * cellW, top + (i + 1) * rowH, cellW, rowH, `${v}`))}
          {cell(labelW + nCols * cellW, top + (i + 1) * rowH, totalW, rowH, `${rowTotals[i]}`, true, true)}
        </g>
      ))}
      {/* total row */}
      <g>
        {cell(0, top + (nRows + 1) * rowH, labelW, rowH, "Total", true, true)}
        {colTotals.map((v, j) => cell(labelW + j * cellW, top + (nRows + 1) * rowH, cellW, rowH, `${v}`, true, true))}
        {cell(labelW + nCols * cellW, top + (nRows + 1) * rowH, totalW, rowH, `${grand}`, true, true)}
      </g>
    </svg>
  );
}

/** Web dispatch: renders the right diagram for the problem's graph params. */
export function AlgebraGraphSVG({ params }: { params: Algebra1GraphParams }) {
  if (!params) return null;
  switch (params.kind) {
    case "FunctionGraph":
      return <FunctionGraphSVG params={params} />;
    case "ScatterPlot":
      return <ScatterPlotSVG params={params} />;
    case "NumberLine":
      return <NumberLineSVG params={params} />;
    case "TwoWayTable":
      return <TwoWayTableSVG params={params} />;
    default:
      return null;
  }
}

// ── PDF renderers (react-pdf primitives) ─────────────────────────────────────

const PDF_FONT = "Times-Roman";

function PdfGrid({ xRange, yRange }: { xRange: [number, number]; yRange: [number, number] }) {
  const { X, Y } = makeMapper(xRange, yRange);
  const els: React.ReactNode[] = [];
  for (let gx = Math.ceil(xRange[0]); gx <= xRange[1]; gx++) {
    const isAxis = gx === 0;
    els.push(
      <PdfLine key={`v${gx}`} x1={X(gx)} y1={PAD} x2={X(gx)} y2={VH - PAD}
        stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.5} />
    );
    els.push(
      <PdfText key={`vl${gx}`} x={X(gx) - 3} y={VH - PAD + 9} style={{ fontSize: 6.5, fontFamily: PDF_FONT, color: "#94a3b8" }}>
        {`${gx}`}
      </PdfText>
    );
  }
  for (let gy = Math.ceil(yRange[0]); gy <= yRange[1]; gy++) {
    const isAxis = gy === 0;
    els.push(
      <PdfLine key={`h${gy}`} x1={PAD} y1={Y(gy)} x2={VW - PAD} y2={Y(gy)}
        stroke={isAxis ? "#64748b" : "#e2e8f0"} strokeWidth={isAxis ? 1.2 : 0.5} />
    );
    if (gy !== 0) {
      els.push(
        <PdfText key={`hl${gy}`} x={PAD - 9} y={Y(gy) + 2.5} style={{ fontSize: 6.5, fontFamily: PDF_FONT, color: "#94a3b8" }}>
          {`${gy}`}
        </PdfText>
      );
    }
  }
  return <>{els}</>;
}

export function PdfFunctionGraphSVG({ params }: { params: FunctionGraphSVGParams }) {
  const { xRange, yRange } = autoRanges(params);
  const { X, Y } = makeMapper(xRange, yRange);
  const marks = [...(params.marks ?? [])];
  if (params.showIntercepts && params.funcs.length > 0) {
    for (const it of functionIntercepts(params.funcs[0])) {
      if (it.x >= xRange[0] && it.x <= xRange[1] && it.y >= yRange[0] && it.y <= yRange[1]) {
        marks.push(it);
      }
    }
  }
  return (
    <Svg viewBox={`0 0 ${VW} ${VH}`} width="130" height="130">
      <PdfRect x={0} y={0} width={VW} height={VH} fill="#ffffff" />
      <PdfGrid xRange={xRange} yRange={yRange} />
      {params.funcs.map((fn, i) => {
        const color = fn.color ?? PALETTE[i % PALETTE.length];
        const d = sampleSegments(fn, xRange[0], xRange[1], yRange[0], yRange[1])
          .map((seg) => "M " + seg.map(([x, y]) => `${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(" L "))
          .join(" ");
        const isLine = fn.fn === "line";
        const shade = isLine ? (fn as { shade?: "above" | "below" }).shade : undefined;
        const shadeColor = isLine ? ((fn as { shadeColor?: string }).shadeColor ?? "#3b82f6") : "#3b82f6";
        const dashed = isLine ? (fn as { dashed?: boolean }).dashed : false;
        return (
          <React.Fragment key={i}>
            {shade && (
              <PdfPath d={shadePath({ m: (fn as { m: number }).m, b: (fn as { b: number }).b }, shade, xRange, yRange, X, Y)}
                fill={shadeColor} fillOpacity={0.18} stroke="none" />
            )}
            <PdfPath d={d} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray={dashed ? "6,3" : undefined} />
          </React.Fragment>
        );
      })}
      {marks.map((mk, i) => (
        <React.Fragment key={i}>
          <PdfCircle cx={X(mk.x)} cy={Y(mk.y)} r={3} fill="#0F172A" />
          {mk.label ? (
            <PdfText x={X(mk.x) + 5} y={Y(mk.y) - 1} style={{ fontSize: 7.5, fontFamily: PDF_FONT, color: "#0F172A" }}>
              {mk.label}
            </PdfText>
          ) : null}
        </React.Fragment>
      ))}
      {params.solution && (
        <React.Fragment>
          <PdfCircle cx={X(params.solution.x)} cy={Y(params.solution.y)} r={4.5} fill="#e11d48" />
          <PdfText x={X(params.solution.x) + 7} y={Y(params.solution.y) + 4}
            style={{ fontSize: 8, fontFamily: "Times-Bold", color: "#e11d48" }}>
            ({trimNum(params.solution.x)}, {trimNum(params.solution.y)})
          </PdfText>
        </React.Fragment>
      )}
    </Svg>
  );
}

export function PdfScatterPlotSVG({ params }: { params: ScatterPlotSVGParams }) {
  const xs = params.points.map((p) => p[0]);
  const ys = params.points.map((p) => p[1]);
  const xRange: [number, number] = [0, Math.max(...xs) + 2];
  const yRange: [number, number] = [0, Math.max(...ys) + 5];
  const { X, Y } = makeMapper(xRange, yRange);
  return (
    <Svg viewBox={`0 0 ${VW} ${VH}`} width="130" height="130">
      <PdfRect x={0} y={0} width={VW} height={VH} fill="#ffffff" />
      <PdfGrid xRange={xRange} yRange={yRange} />
      <PdfLine
        x1={X(xRange[0])} y1={Y(params.line.m * xRange[0] + params.line.b)}
        x2={X(xRange[1])} y2={Y(params.line.m * xRange[1] + params.line.b)}
        stroke="#e11d48" strokeWidth={1.8}
      />
      {params.points.map(([x, y], i) => (
        <PdfCircle key={i} cx={X(x)} cy={Y(y)} r={3} fill="#1d4ed8" />
      ))}
    </Svg>
  );
}

export function PdfNumberLineSVG({ params }: { params: NumberLineSVGParams }) {
  const min = params.min ?? params.value - 6;
  const max = params.max ?? params.value + 6;
  const W = 200;
  const H = 60;
  const padX = 14;
  const X = (v: number) => padX + ((v - min) / (max - min)) * (W - 2 * padX);
  const midY = 26;
  const open = params.rel === "<" || params.rel === ">";
  const rayLeft = params.rel === "<" || params.rel === "<=";
  const rayStart = rayLeft ? X(min) : X(params.value);
  const rayEnd = rayLeft ? X(params.value) : X(max);
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="130" height="39">
      <PdfLine x1={padX - 6} y1={midY} x2={W - padX + 6} y2={midY} stroke="#0F172A" strokeWidth={1.5} />
      {Array.from({ length: max - min + 1 }, (_, i) => {
        const v = min + i;
        return (
          <React.Fragment key={v}>
            <PdfLine x1={X(v)} y1={midY - 4} x2={X(v)} y2={midY + 4} stroke="#0F172A" strokeWidth={1} />
            <PdfText x={X(v) - 3} y={midY + 15} style={{ fontSize: 7.5, fontFamily: PDF_FONT, color: "#475569" }}>
              {`${v}`}
            </PdfText>
          </React.Fragment>
        );
      })}
      <PdfLine x1={rayStart} y1={midY} x2={rayEnd} y2={midY} stroke="#1d4ed8" strokeWidth={3.5} />
      <PdfCircle cx={X(params.value)} cy={midY} r={4.5} fill={open ? "#ffffff" : "#1d4ed8"} stroke="#1d4ed8" strokeWidth={2.5} />
    </Svg>
  );
}

export function PdfTwoWayTableSVG({ params }: { params: TwoWayTableSVGParams }) {
  const nCols = params.colLabels.length;
  const labelW = 62;
  const cellW = 34;
  const totalW = 34;
  const rowH = 24;
  const W = labelW + nCols * cellW + totalW;
  const nRows = params.rowLabels.length;
  const H = (nRows + 2) * rowH + 18;
  const colTotals = params.colLabels.map((_, j) => params.data.reduce((s, r) => s + r[j], 0));
  const rowTotals = params.data.map((r) => r.reduce((s, v) => s + v, 0));
  const grand = rowTotals.reduce((s, v) => s + v, 0);
  const top = 18;
  const cell = (x: number, y: number, w: number, h: number, text: string, bold = false) => (
    <React.Fragment key={`${x}-${y}-${text}`}>
      <PdfRect x={x} y={y} width={w} height={h} fill="#ffffff" stroke="#0F172A" strokeWidth={1} />
      <PdfText x={x + w / 2 - text.length * 2} y={y + h / 2 + 3}
        style={{ fontSize: 7.5, fontFamily: bold ? "Times-Bold" : PDF_FONT, color: "#0F172A" }}>
        {text}
      </PdfText>
    </React.Fragment>
  );
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={String(Math.min(W, 150))} height={String(Math.min(H, 130))}>
      {params.title && (
        <PdfText x={W / 2 - params.title.length * 2.2} y={12} style={{ fontSize: 8.5, fontFamily: PDF_FONT, color: "#0F172A" }}>
          {params.title}
        </PdfText>
      )}
      {cell(0, top, labelW, rowH, "", true)}
      {params.colLabels.map((c, j) => cell(labelW + j * cellW, top, cellW, rowH, c, true))}
      {cell(labelW + nCols * cellW, top, totalW, rowH, "Total", true)}
      {params.rowLabels.map((r, i) => (
        <React.Fragment key={r}>
          {cell(0, top + (i + 1) * rowH, labelW, rowH, r, true)}
          {params.data[i].map((v, j) => cell(labelW + j * cellW, top + (i + 1) * rowH, cellW, rowH, `${v}`))}
          {cell(labelW + nCols * cellW, top + (i + 1) * rowH, totalW, rowH, `${rowTotals[i]}`, true)}
        </React.Fragment>
      ))}
      {cell(0, top + (nRows + 1) * rowH, labelW, rowH, "Total", true)}
      {colTotals.map((v, j) => cell(labelW + j * cellW, top + (nRows + 1) * rowH, cellW, rowH, `${v}`, true))}
      {cell(labelW + nCols * cellW, top + (nRows + 1) * rowH, totalW, rowH, `${grand}`, true)}
    </Svg>
  );
}

/** PDF dispatch: renders the right diagram for the problem's graph params. */
export function PdfAlgebraGraphSVG({ params }: { params: Algebra1GraphParams }) {
  if (!params) return null;
  switch (params.kind) {
    case "FunctionGraph":
      return <PdfFunctionGraphSVG params={params} />;
    case "ScatterPlot":
      return <PdfScatterPlotSVG params={params} />;
    case "NumberLine":
      return <PdfNumberLineSVG params={params} />;
    case "TwoWayTable":
      return <PdfTwoWayTableSVG params={params} />;
    default:
      return null;
  }
}

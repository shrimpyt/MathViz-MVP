// plotMath.ts
// Pure plot math shared by the web and PDF Algebra 2 diagram components.
// Computes integer-snapped view windows, grid lines, and sampled curves for
// conic graphs (circles/parabolas) and rational-function graphs.

import type {
  Algebra2ConicSVGParams,
  Algebra2RationalSVGParams,
  Algebra2FuncGraphParams,
} from "@/lib/factories/Algebra2Types";

export interface View {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Evaluate a descending-coefficient polynomial. */
export function evalPoly(coeffs: number[], x: number): number {
  let acc = 0;
  for (const c of coeffs) acc = acc * x + c;
  return acc;
}

function snap(v: number, pad: number): [number, number] {
  return [Math.floor(v - pad), Math.ceil(v + pad)];
}

/** View window fitting all circles/parabolas, snapped to integers. */
export function conicView(params: Algebra2ConicSVGParams): View {
  let loX = Infinity, hiX = -Infinity, loY = Infinity, hiY = -Infinity;
  for (const c of params.circles ?? []) {
    loX = Math.min(loX, c.h - c.r); hiX = Math.max(hiX, c.h + c.r);
    loY = Math.min(loY, c.k - c.r); hiY = Math.max(hiY, c.k + c.r);
  }
  for (const p of params.parabolas ?? []) {
    // sample the parabola over a span around the vertex
    const span = Math.max(4, Math.ceil(3 / Math.max(Math.abs(p.a), 0.2)));
    for (let x = p.h - span; x <= p.h + span; x += 0.5) {
      const y = p.a * (x - p.h) * (x - p.h) + p.k;
      loX = Math.min(loX, x); hiX = Math.max(hiX, x);
      loY = Math.min(loY, y); hiY = Math.max(hiY, y);
    }
  }
  if (!isFinite(loX)) { loX = -5; hiX = 5; loY = -5; hiY = 5; }
  const minX = Math.floor(loX - 1.5);
  const maxX = Math.ceil(hiX + 1.5);
  const minY = Math.floor(loY - 1.5);
  const maxY = Math.ceil(hiY + 1.5);
  // keep aspect reasonable: expand the smaller range
  const w = maxX - minX, h = maxY - minY;
  if (w > h * 1.6) {
    const extra = Math.ceil((w - h) / 2);
    return { minX, maxX, minY: minY - extra, maxY: maxY + extra };
  }
  if (h > w * 1.6) {
    const extra = Math.ceil((h - w) / 2);
    return { minX: minX - extra, maxX: maxX + extra, minY, maxY };
  }
  return { minX, maxX, minY, maxY };
}

/** View window for a rational function graph. */
export function rationalView(params: Algebra2RationalSVGParams): View {
  const span = 8;
  let loY = Infinity, hiY = -Infinity;
  for (let x = -span; x <= span; x += 0.25) {
    if (params.vAsm.some((a) => Math.abs(x - a) < 0.3)) continue;
    const d = evalPoly(params.den, x);
    if (Math.abs(d) < 1e-9) continue;
    const y = evalPoly(params.num, x) / d;
    if (Math.abs(y) < 40) {
      loY = Math.min(loY, y);
      hiY = Math.max(hiY, y);
    }
  }
  if (params.hAsm !== null) {
    loY = Math.min(loY, params.hAsm - 3);
    hiY = Math.max(hiY, params.hAsm + 3);
  }
  if (params.hole) {
    loY = Math.min(loY, params.hole.y - 2);
    hiY = Math.max(hiY, params.hole.y + 2);
  }
  if (!isFinite(loY)) { loY = -6; hiY = 6; }
  const [minY, maxY] = snap(loY, 1.5);
  return { minX: -span, maxX: span, minY, maxY };
}

/** Sampled polyline points for a parabola (vertex form). */
export function sampleParabola(
  h: number, k: number, a: number,
  minX: number, maxX: number, minY: number, maxY: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const x = minX + ((maxX - minX) * i) / n;
    const y = a * (x - h) * (x - h) + k;
    if (y >= minY - 2 && y <= maxY + 2) pts.push({ x, y });
  }
  return pts;
}

/**
 * Sampled segments for a rational function. Breaks the polyline near
 * vertical asymptotes / poles so branches don't connect across them.
 */
export function sampleRational(
  num: number[], den: number[],
  minX: number, maxX: number, minY: number, maxY: number,
  vAsm: number[]
): { x: number; y: number }[][] {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  const n = 400;
  const yLim = (maxY - minY) * 1.5;
  const midY = (maxY + minY) / 2;
  for (let i = 0; i <= n; i++) {
    const x = minX + ((maxX - minX) * i) / n;
    if (vAsm.some((a) => Math.abs(x - a) < (maxX - minX) / n * 1.5)) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
      continue;
    }
    const d = evalPoly(den, x);
    if (Math.abs(d) < 1e-9) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
      continue;
    }
    const y = evalPoly(num, x) / d;
    if (Math.abs(y - midY) > yLim) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
      continue;
    }
    cur.push({ x, y });
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}

/** View window fitting a general function graph (lines, V-graphs, parabolas, points). */
export function funcGraphView(params: Algebra2FuncGraphParams): View {
  let loX = Infinity, hiX = -Infinity, loY = Infinity, hiY = -Infinity;
  const eat = (x: number, y: number) => {
    if (!isFinite(x) || !isFinite(y)) return;
    loX = Math.min(loX, x); hiX = Math.max(hiX, x);
    loY = Math.min(loY, Math.max(-16, Math.min(16, y))); hiY = Math.max(hiY, Math.max(-16, Math.min(16, y)));
  };
  for (const pt of params.points ?? []) eat(pt.x, pt.y);
  for (const v of params.verticalLines ?? []) { loX = Math.min(loX, v.x); hiX = Math.max(hiX, v.x); }
  for (const g of params.absGraphs ?? []) {
    eat(g.h, g.k);
    const a = g.aNum / g.aDen;
    eat(g.h - 4, g.k + Math.abs(a) * 4);
    eat(g.h + 4, g.k + Math.abs(a) * 4);
    if (a < 0) { eat(g.h - 4, g.k - Math.abs(a) * 4); eat(g.h + 4, g.k - Math.abs(a) * 4); }
  }
  for (const pb of params.parabolas ?? []) {
    eat(pb.h, pb.k);
    const span = Math.max(3, Math.ceil(2.5 / Math.max(Math.abs(pb.a), 0.25)));
    eat(pb.h - span, pb.k + pb.a * span * span);
    eat(pb.h + span, pb.k + pb.a * span * span);
  }
  for (const ln of params.lines ?? []) {
    const m = ln.mNum / ln.mDen;
    const b = ln.bNum / ln.bDen;
    eat(0, b);
    eat(-5, m * -5 + b);
    eat(5, m * 5 + b);
    if (m !== 0) eat(-b / m, 0);
  }
  if (!isFinite(loX)) { loX = -6; hiX = 6; loY = -6; hiY = 6; }
  // always include the origin so axes read naturally
  loX = Math.min(loX, -2); hiX = Math.max(hiX, 2);
  loY = Math.min(loY, -2); hiY = Math.max(hiY, 2);
  let minX = Math.max(-14, Math.floor(loX - 1.5));
  let maxX = Math.min(14, Math.ceil(hiX + 1.5));
  let minY = Math.max(-14, Math.floor(loY - 1.5));
  let maxY = Math.min(14, Math.ceil(hiY + 1.5));
  if (maxX - minX < 8) { const e = Math.ceil((8 - (maxX - minX)) / 2); minX -= e; maxX += e; }
  if (maxY - minY < 8) { const e = Math.ceil((8 - (maxY - minY)) / 2); minY -= e; maxY += e; }
  const w = maxX - minX, h = maxY - minY;
  if (w > h * 1.6) { const extra = Math.ceil((w - h) / 2); minY -= extra; maxY += extra; }
  if (h > w * 1.6) { const extra = Math.ceil((h - w) / 2); minX -= extra; maxX += extra; }
  return { minX, maxX, minY, maxY };
}

/**
 * Sample a function y = f(x) into polyline segments, keeping only points
 * inside the view (with a small margin). Contiguous in-range runs stay
 * joined; for lines and V-graphs the in-range run is always contiguous.
 */
export function sampleFunction(
  f: (x: number) => number,
  minX: number, maxX: number, minY: number, maxY: number
): { x: number; y: number }[][] {
  const segs: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  const n = 160;
  for (let i = 0; i <= n; i++) {
    const x = minX + ((maxX - minX) * i) / n;
    const y = f(x);
    if (isFinite(y) && y >= minY - 0.5 && y <= maxY + 0.5) {
      cur.push({ x, y });
    } else {
      if (cur.length > 1) segs.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}

/** Integer grid lines inside the view. */
export function gridLines(view: View): { vertical: number[]; horizontal: number[] } {
  const vertical: number[] = [];
  const horizontal: number[] = [];
  for (let x = Math.ceil(view.minX); x <= view.maxX; x++) vertical.push(x);
  for (let y = Math.ceil(view.minY); y <= view.maxY; y++) horizontal.push(y);
  return { vertical, horizontal };
}

/** Map math coords → 200×200 viewBox coords. */
export function makeProjector(view: View): (x: number, y: number) => { x: number; y: number } {
  const w = view.maxX - view.minX || 1;
  const h = view.maxY - view.minY || 1;
  return (x, y) => ({
    x: ((x - view.minX) / w) * 200,
    y: 200 - ((y - view.minY) / h) * 200,
  });
}

// polygonMarks.ts
// Pure layout for the marks on a PolygonFigure: congruence ticks, parallel
// arrows, congruent-angle arcs, right-angle squares, side/segment labels and
// angle labels. Both renderers (web GeometryDiagrams.tsx and PDF
// GeometryPdfDiagrams.tsx) draw the primitives this returns, so the screen
// and the printed page always carry the same marks in the same places.
//
// Labels sit OUTSIDE the figure: a side label is pushed along the side's
// outward normal (away from the vertex centroid), a vertex label away from
// the centroid, and an angle label toward the centroid (inside the angle).

import type { PolygonFigureParams, GeoPt } from "./factories/GeometryTypes";

export interface MarkStroke {
  d: string;
  width: number;
}
export interface MarkLabel {
  x: number;
  /** Baseline y. */
  y: number;
  text: string;
  anchor: "start" | "middle" | "end";
  size: number;
}
export interface PolygonMarks {
  strokes: MarkStroke[];
  labels: MarkLabel[];
  /** Points to draw as dots (vertices + center + extra points). */
  dots: { x: number; y: number }[];
}

type Pt = { x: number; y: number };

const f = (n: number) => Math.round(n * 100) / 100;

/** Rough text width in viewBox units for the worksheet sans. */
export function textWidth(text: string, size: number): number {
  return text.length * size * 0.56;
}

/** Left x for text that should be anchored at x (for renderers without
 *  text-anchor support, i.e. react-pdf). */
export function anchoredLeft(l: MarkLabel): number {
  const w = textWidth(l.text, l.size);
  if (l.anchor === "middle") return l.x - w / 2;
  if (l.anchor === "end") return l.x - w;
  return l.x;
}

function unit(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Place a label around point p, pushed in direction dir by dist. The anchor
 *  is chosen so the text grows away from p. */
function labelAway(p: Pt, dir: Pt, dist: number, text: string, size: number): MarkLabel {
  const x = p.x + dir.x * dist;
  const y = p.y + dir.y * dist;
  const anchor: MarkLabel["anchor"] = dir.x > 0.35 ? "start" : dir.x < -0.35 ? "end" : "middle";
  // Baseline: text extends upward from y, so push the baseline down when the
  // label goes below p and keep vertical centering otherwise.
  const yb = dir.y > 0.35 ? y + size * 0.75 : dir.y < -0.35 ? y : y + size * 0.35;
  return { x: f(x), y: f(yb), text, anchor, size };
}

export function polygonCentroid(V: readonly Pt[]): Pt {
  const n = V.length || 1;
  return { x: V.reduce((s, p) => s + p.x, 0) / n, y: V.reduce((s, p) => s + p.y, 0) / n };
}

function tickStrokes(a: Pt, b: Pt, count: number, at = 0.5): MarkStroke[] {
  const m = { x: a.x + (b.x - a.x) * at, y: a.y + (b.y - a.y) * at };
  const u = unit(a, b);
  const n = { x: -u.y, y: u.x };
  const out: MarkStroke[] = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 4;
    const c = { x: m.x + u.x * off, y: m.y + u.y * off };
    out.push({ d: `M ${f(c.x - n.x * 5)} ${f(c.y - n.y * 5)} L ${f(c.x + n.x * 5)} ${f(c.y + n.y * 5)}`, width: 1.1 });
  }
  return out;
}

function arrowStrokes(a: Pt, b: Pt, count: number): MarkStroke[] {
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const u = unit(a, b);
  const n = { x: -u.y, y: u.x };
  const out: MarkStroke[] = [];
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * 5;
    const tip = { x: m.x + u.x * (off + 3), y: m.y + u.y * (off + 3) };
    const b1 = { x: tip.x - u.x * 6 + n.x * 4, y: tip.y - u.y * 6 + n.y * 4 };
    const b2 = { x: tip.x - u.x * 6 - n.x * 4, y: tip.y - u.y * 6 - n.y * 4 };
    out.push({ d: `M ${f(b1.x)} ${f(b1.y)} L ${f(tip.x)} ${f(tip.y)} L ${f(b2.x)} ${f(b2.y)}`, width: 1.1 });
  }
  return out;
}

function arcStrokes(v: Pt, p1: Pt, p2: Pt, count: number): MarkStroke[] {
  const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
  let a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
  // sweep the interior (smaller) angle
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  a2 = a1 + d;
  const out: MarkStroke[] = [];
  for (let i = 0; i < count; i++) {
    const r = 12 + i * 4;
    const s = { x: v.x + r * Math.cos(a1), y: v.y + r * Math.sin(a1) };
    const e = { x: v.x + r * Math.cos(a2), y: v.y + r * Math.sin(a2) };
    const sweep = d > 0 ? 1 : 0;
    out.push({ d: `M ${f(s.x)} ${f(s.y)} A ${r} ${r} 0 0 ${sweep} ${f(e.x)} ${f(e.y)}`, width: 1 });
  }
  return out;
}

function rightAngleStroke(v: Pt, p1: Pt, p2: Pt): MarkStroke {
  const s = 10;
  const u1 = unit(v, p1);
  const u2 = unit(v, p2);
  const a = { x: v.x + u1.x * s, y: v.y + u1.y * s };
  const b = { x: a.x + u2.x * s, y: a.y + u2.y * s };
  const c = { x: v.x + u2.x * s, y: v.y + u2.y * s };
  return { d: `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)} L ${f(c.x)} ${f(c.y)}`, width: 1 };
}

/** Every mark of a PolygonFigure as drawing primitives. */
export function polygonMarks(params: PolygonFigureParams, opts?: { sideSize?: number; vertexSize?: number }): PolygonMarks {
  const sideSize = opts?.sideSize ?? 9;
  const vertexSize = opts?.vertexSize ?? 10;
  const V = params.vertices;
  const C = polygonCentroid(V);
  const P = new Map<string, GeoPt>(V.map((p) => [p.label, p]));
  if (params.center) P.set(params.center.label, { label: params.center.label, x: params.center.x, y: params.center.y });
  for (const e of params.extraPoints ?? []) P.set(e.label, e);
  const strokes: MarkStroke[] = [];
  const labels: MarkLabel[] = [];
  const seg = (k: string): [GeoPt, GeoPt] | null => {
    const a = P.get(k[0]);
    const b = P.get(k.slice(1));
    return a && b ? [a, b] : null;
  };
  const vIdx = (lab: string) => V.findIndex((p) => p.label === lab);

  for (const [a0, b0] of params.segments ?? []) {
    const a = P.get(a0);
    const b = P.get(b0);
    if (a && b) strokes.push({ d: `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`, width: 1.2 });
  }
  // A side carrying both ticks and arrows gets its ticks moved off the
  // midpoint (toward its first end), so the two marks don't sit on top of
  // each other.
  const arrowed = new Set(
    Object.entries(params.parallelMarks ?? {})
      .filter(([, c]) => c > 0)
      .flatMap(([k]) => [k, k[1] + k[0]])
  );
  for (const [k, c] of Object.entries(params.ticks ?? {})) {
    const s = seg(k);
    if (!s || c <= 0) continue;
    const len = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) || 1;
    const at = k.length === 2 && arrowed.has(k) ? Math.max(0.2, 0.5 - 14 / len) : 0.5;
    strokes.push(...tickStrokes(s[0], s[1], c, at));
  }
  for (const [k, c] of Object.entries(params.parallelMarks ?? {})) {
    const s = seg(k);
    if (s && c > 0) strokes.push(...arrowStrokes(s[0], s[1], c));
  }
  for (const [k, c] of Object.entries(params.angleArcs ?? {})) {
    const i = vIdx(k);
    if (i < 0 || c <= 0) continue;
    strokes.push(...arcStrokes(V[i], V[(i + V.length - 1) % V.length], V[(i + 1) % V.length], c));
  }
  for (const v of params.rightAngles ?? []) {
    const i = vIdx(v);
    if (i < 0) continue;
    strokes.push(rightAngleStroke(V[i], V[(i + V.length - 1) % V.length], V[(i + 1) % V.length]));
  }
  for (const r of params.rightAngleMarks ?? []) {
    const v = P.get(r.at);
    const a = P.get(r.from);
    const b = P.get(r.to);
    if (v && a && b) strokes.push(rightAngleStroke(v, a, b));
  }

  for (const [k, text] of Object.entries(params.sideLabels ?? {})) {
    const s = seg(k);
    if (!s || !text) continue;
    const m = { x: (s[0].x + s[1].x) / 2, y: (s[0].y + s[1].y) / 2 };
    const u = unit(s[0], s[1]);
    let n = { x: -u.y, y: u.x };
    // outward: away from the centroid. A diagonal half runs through the
    // centroid (dot ~0), so there the label goes below the segment (or to
    // its right when it is upright), which keeps it inside the figure.
    const dot = n.x * (m.x - C.x) + n.y * (m.y - C.y);
    if (Math.abs(dot) < 1) {
      if (n.y + 0.3 * n.x < 0) n = { x: -n.x, y: -n.y };
      // Centred on the offset point, so the text doesn't run into a side.
      labels.push({ x: f(m.x + n.x * 9), y: f(m.y + n.y * 9 + sideSize * 0.35), text, anchor: "middle", size: sideSize });
      continue;
    }
    if (dot < 0) n = { x: -n.x, y: -n.y };
    labels.push(labelAway(m, n, 7, text, sideSize));
  }
  for (const [k, text] of Object.entries(params.angleLabels ?? {})) {
    const v = P.get(k);
    if (!v || !text) continue;
    const i = vIdx(k);
    let dir: Pt;
    if (i >= 0) {
      // along the angle bisector, into the polygon
      const u1 = unit(v, V[(i + V.length - 1) % V.length]);
      const u2 = unit(v, V[(i + 1) % V.length]);
      dir = { x: u1.x + u2.x, y: u1.y + u2.y };
      const dl = Math.hypot(dir.x, dir.y);
      dir = dl < 1e-6 ? unit(v, C) : { x: dir.x / dl, y: dir.y / dl };
      if (dir.x * (C.x - v.x) + dir.y * (C.y - v.y) < 0) dir = { x: -dir.x, y: -dir.y };
      // A diagonal along the bisector (a rhombus) would run through the
      // label: draw an arc across the whole angle and set the label to one
      // side of the diagonal, inside the arc's sweep.
      const along = (params.diagonals ?? []).some(([p, q]) => {
        const o = p === i ? q : q === i ? p : -1;
        if (o < 0) return false;
        const w = unit(v, V[o]);
        return w.x * dir.x + w.y * dir.y > 0.985;
      });
      if (along) {
        strokes.push(...arcStrokes(v, V[(i + V.length - 1) % V.length], V[(i + 1) % V.length], 1));
        const t = { x: dir.x * 0.9 + u1.x * 0.45, y: dir.y * 0.9 + u1.y * 0.45 };
        const tl = Math.hypot(t.x, t.y);
        dir = { x: t.x / tl, y: t.y / tl };
      }
    } else {
      dir = unit(v, C);
    }
    const dist = 20 + Math.max(0, textWidth(text, sideSize) - 14) * 0.5;
    const x = v.x + dir.x * dist;
    const y = v.y + dir.y * dist;
    labels.push({ x: f(x), y: f(y + sideSize * 0.35), text, anchor: "middle", size: sideSize });
  }

  const dots: Pt[] = V.map((p) => ({ x: p.x, y: p.y }));
  if (params.center) dots.push({ x: params.center.x, y: params.center.y });
  for (const e of params.extraPoints ?? []) if (!e.hidden) dots.push({ x: e.x, y: e.y });
  for (const p of V) labels.push(labelAway(p, unit(C, p), 7, p.label, vertexSize));
  if (params.center?.label) {
    // beside the center, in the widest gap between the rays out of it
    const c = params.center;
    let best: Pt = { x: 0.7, y: -0.7 };
    const rays = (params.diagonals ?? []).flatMap(([i, j]) => [unit(c, V[i]), unit(c, V[j])]);
    // directions already holding a right-angle square at the center
    const squares = (params.rightAngleMarks ?? [])
      .filter((r) => r.at === c.label && P.get(r.from) && P.get(r.to))
      .map((r) => {
        const a = unit(c, P.get(r.from)!);
        const b = unit(c, P.get(r.to)!);
        const l = Math.hypot(a.x + b.x, a.y + b.y) || 1;
        return { x: (a.x + b.x) / l, y: (a.y + b.y) / l };
      });
    if (rays.length >= 2) {
      const angs = rays.map((r) => Math.atan2(r.y, r.x)).sort((a, b) => a - b);
      let gap = -1;
      for (let i = 0; i < angs.length; i++) {
        const a = angs[i];
        const b = i + 1 < angs.length ? angs[i + 1] : angs[0] + 2 * Math.PI;
        const m = (a + b) / 2;
        const dir = { x: Math.cos(m), y: Math.sin(m) };
        if (squares.some((q) => q.x * dir.x + q.y * dir.y > 0.8)) continue;
        if (b - a > gap + 1e-6) {
          gap = b - a;
          best = dir;
        }
      }
    }
    labels.push(labelAway(c, best, 9, c.label, vertexSize));
  }
  for (const e of params.extraPoints ?? []) if (!e.hidden) labels.push(labelAway(e, unit(C, e), 7, e.label, vertexSize));
  return { strokes, labels, dots };
}

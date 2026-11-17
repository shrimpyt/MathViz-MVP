// msFigureLayout.ts
// Pure layouts for the middle-school figures that show two shapes or angle
// marks: similar figures, the exterior angle of a triangle, AA similarity and
// the effect of a dilation on area. Shared by the PDF renderer
// (PdfMiddleSchoolDiagrams) and the web renderer (MiddleSchoolDiagrams), so
// both draw the same picture, and by tests/ms-figures.ts, which checks every
// label sits clear of the lines and that no label prints the answer.
// No React in here. Coordinates are SVG user units, y pointing down.

import {
  type Pt,
  type Rect,
  type Seg,
  angleArcPath,
  placeAngleLabel,
  placePointLabel,
  placeSideLabel,
  polygonEdges,
  rectAround,
  textBox,
} from "./labelPlacement";
import type { MSGeometryFigureParams } from "./factories/MiddleSchoolTypes";

export const MS_FIG_W = 220;
export const MS_FIG_H = 170;
export const MS_FIG_FONT = 10;
export const MS_FIG_CAPTION_FONT = 9;

export type MSFigLabel = {
  text: string;
  center: Pt;
  size: number;
  /** Captions ("Figure A") print regular; measurements print bold. */
  bold: boolean;
};

export type MSFigLayout = {
  width: number;
  height: number;
  /** Filled shapes (solid outline) and image shapes (dashed outline). */
  polygons: { points: Pt[]; dashed?: boolean }[];
  /** Extra lines: an extended side, a dashed height. */
  lines: { a: Pt; b: Pt; dashed?: boolean }[];
  /** Angle arcs as SVG path data. */
  arcs: string[];
  /** Short leader lines from an angle label to its arc. */
  leaders: Seg[];
  labels: MSFigLabel[];
};

/** The figure names this module lays out. */
export const MS_PAIR_FIGURES = ["similar-triangles", "exterior-angle", "aa-similarity", "dilation-area"] as const;
export type MSPairFigure = (typeof MS_PAIR_FIGURES)[number];

export function isPairFigure(figure: string): figure is MSPairFigure {
  return (MS_PAIR_FIGURES as readonly string[]).includes(figure);
}

// ── Small geometry helpers ───────────────────────────────────────────────────

const rad = (deg: number) => (deg * Math.PI) / 180;
const centroid = (pts: Pt[]): Pt => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

/** Triangle with angle `a` at A (left), angle `b` at B (right) and the third
 *  vertex C above the base. Base length 1, A at the origin. */
function triangleFromAngles(a: number, b: number): [Pt, Pt, Pt] {
  const c = 180 - a - b;
  const ac = Math.sin(rad(b)) / Math.sin(rad(c)); // law of sines, AB = 1
  return [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: ac * Math.cos(rad(a)), y: -ac * Math.sin(rad(a)) }];
}

/** Uniform scale + translate that fits every point into the frame, less the
 *  given padding on each side. */
function fitter(groups: Pt[][], frame: Rect) {
  const all = groups.flat();
  const x0 = Math.min(...all.map((p) => p.x));
  const x1 = Math.max(...all.map((p) => p.x));
  const y0 = Math.min(...all.map((p) => p.y));
  const y1 = Math.max(...all.map((p) => p.y));
  const s = Math.min((frame.x1 - frame.x0) / (x1 - x0 || 1), (frame.y1 - frame.y0) / (y1 - y0 || 1));
  const ox = frame.x0 + ((frame.x1 - frame.x0) - (x1 - x0) * s) / 2 - x0 * s;
  const oy = frame.y0 + ((frame.y1 - frame.y0) - (y1 - y0) * s) / 2 - y0 * s;
  return (p: Pt): Pt => ({ x: ox + p.x * s, y: oy + p.y * s });
}

const BOUNDS: Rect = { x0: 2, y0: 2, x1: MS_FIG_W - 2, y1: MS_FIG_H - 2 };

class LabelSet {
  labels: MSFigLabel[] = [];
  taken: Rect[] = [];
  add(text: string, center: Pt, size = MS_FIG_FONT, bold = true) {
    this.labels.push({ text, center, size, bold });
    this.taken.push(rectAround(center, textBox(text, size), 1));
  }
}

/** Angle arc + label at `v` for the angle p1-v-p2. */
function markAngle(
  out: MSFigLayout,
  ls: LabelSet,
  obstacles: Seg[],
  v: Pt,
  p1: Pt,
  p2: Pt,
  text: string,
  arcR: number,
) {
  out.arcs.push(angleArcPath(v, p1, p2, arcR));
  const box = textBox(text, MS_FIG_FONT);
  const res = placeAngleLabel(v, p1, p2, box, { arcR, obstacles, bounds: BOUNDS, avoid: ls.taken, gap: 1.5, maxBeyondArc: 8 });
  ls.add(text, res.center);
  if (res.leader) out.leaders.push(res.leader);
}

function sideLabel(ls: LabelSet, obstacles: Seg[], a: Pt, b: Pt, interior: Pt, text: string) {
  const box = textBox(text, MS_FIG_FONT);
  const c = placeSideLabel(a, b, interior, box, 3);
  ls.add(text, c);
  void obstacles;
}

function caption(ls: LabelSet, x: number, y: number, text: string) {
  ls.add(text, { x, y }, MS_FIG_CAPTION_FONT, false);
}

function emptyLayout(): MSFigLayout {
  return { width: MS_FIG_W, height: MS_FIG_H, polygons: [], lines: [], arcs: [], leaders: [], labels: [] };
}

const withUnit = (n: number, unit?: string) => (unit ? `${n} ${unit}` : `${n}`);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Scalene shapes for the similar-figure pairs (angles at A and B).
const PAIR_SHAPES: [number, number][] = [[58, 66], [52, 74], [64, 54], [48, 70]];

// ── Similar triangles (scale factor, missing side, area scale) ───────────────
// dims: base1, base2 (corresponding bases), optional side1 (left side of the
// first figure; the second figure's left side then prints side2 or "x"),
// optional area1 (area of the first figure; the second prints "?").

function layoutSimilarTriangles(p: MSGeometryFigureParams): MSFigLayout {
  const d = p.dims;
  const v = p.variant ?? 0;
  const out = emptyLayout();
  const ls = new LabelSet();
  const [ang1, ang2] = PAIR_SHAPES[v % PAIR_SHAPES.length];
  let base = triangleFromAngles(ang1, ang2);
  if (d.side1 !== undefined) {
    // Both sides are labeled, so draw the left side in proportion to the base
    // (kept between 0.55x and 1.9x so the triangle stays readable).
    const L = clamp(d.side1 / d.base1, 0.55, 1.9);
    const t = rad([62, 70, 56, 66][v % 4]);
    base = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: L * Math.cos(t), y: -L * Math.sin(t) }];
  }
  // Draw the second figure at the true ratio, kept between 0.55x and 1.8x so
  // both stay readable.
  const r = clamp((d.base2 ?? 1) / (d.base1 ?? 1), 0.55, 1.8);
  const gap = 0.45 * Math.max(1, r);
  const t1 = base;
  const t2 = base.map((q) => ({ x: 1 + gap + q.x * r, y: q.y * r }));
  const area = d.area1 !== undefined;
  const capLines = area ? 2 : 1;
  const fit = fitter([t1, t2], { x0: 26, y0: 12, x1: MS_FIG_W - 26, y1: MS_FIG_H - 20 - capLines * 11 });
  const T1 = t1.map(fit);
  const T2 = t2.map(fit);
  out.polygons.push({ points: T1 }, { points: T2 });
  const obstacles = [...polygonEdges(T1), ...polygonEdges(T2)];

  const u = p.unit;
  sideLabel(ls, obstacles, T1[0], T1[1], centroid(T1), withUnit(d.base1, u));
  sideLabel(ls, obstacles, T2[0], T2[1], centroid(T2), withUnit(d.base2, u));
  if (d.side1 !== undefined) {
    sideLabel(ls, obstacles, T1[0], T1[2], centroid(T1), withUnit(d.side1, u));
    sideLabel(ls, obstacles, T2[0], T2[2], centroid(T2), d.side2 !== undefined ? withUnit(d.side2, u) : "x");
  }

  const names = p.captions ?? ["Figure A", "Figure B"];
  const capY = Math.max(...ls.labels.map((l) => l.center.y)) + 14;
  const cx1 = centroid(T1).x;
  const cx2 = centroid(T2).x;
  caption(ls, cx1, capY, names[0]);
  caption(ls, cx2, capY, names[1]);
  if (area) {
    caption(ls, cx1, capY + 11, `Area = ${withUnit(d.area1, u ? `${u}²` : undefined)}`);
    caption(ls, cx2, capY + 11, "Area = ?");
  }
  out.labels = ls.labels;
  return out;
}

// ── Exterior angle of a triangle ─────────────────────────────────────────────
// dims: r1, r2 (the two remote interior angles). The exterior angle is "?".

function layoutExteriorAngle(p: MSGeometryFigureParams): MSFigLayout {
  const { r1, r2 } = p.dims;
  const v = p.variant ?? 0;
  const out = emptyLayout();
  const ls = new LabelSet();
  const atB = 180 - r1 - r2;
  let [A, B, C] = triangleFromAngles(r1, atB);
  let D: Pt = { x: 1.55, y: 0 };
  if (v % 2 === 1) {
    // Mirror: the extended side runs off to the left.
    const m = (q: Pt) => ({ x: -q.x, y: q.y });
    [A, B, C, D] = [m(A), m(B), m(C), m(D)];
  }
  const fit = fitter([[A, B, C, D]], { x0: 18, y0: 24, x1: MS_FIG_W - 18, y1: MS_FIG_H - 26 });
  [A, B, C, D] = [A, B, C, D].map(fit);
  out.polygons.push({ points: [A, B, C] });
  out.lines.push({ a: B, b: D });
  const obstacles: Seg[] = [...polygonEdges([A, B, C]), [B, D]];
  markAngle(out, ls, obstacles, A, B, C, `${r1}°`, 16);
  markAngle(out, ls, obstacles, C, A, B, `${r2}°`, 14);
  markAngle(out, ls, obstacles, B, D, C, "?", 15);
  out.labels = ls.labels;
  return out;
}

// ── AA similarity ────────────────────────────────────────────────────────────
// dims: a, b (the two given angles, at A/D and at B/E). The third angle is
// "?" in both triangles.

function layoutAASimilarity(p: MSGeometryFigureParams): MSFigLayout {
  const { a, b } = p.dims;
  const v = p.variant ?? 0;
  const out = emptyLayout();
  const ls = new LabelSet();
  const t1 = triangleFromAngles(a, b);
  // The second triangle is a smaller or larger copy (presentation only).
  const k = v % 2 === 0 ? 0.72 : 1.3;
  const frame = { x0: 16, y0: 20, x1: MS_FIG_W - 16, y1: MS_FIG_H - 20 };
  // Side by side, or one above the other when the triangles are flat (a wide
  // third angle): whichever draws them larger.
  const top = Math.min(...t1.map((q) => q.y));
  const beside = t1.map((q) => ({ x: 1 + 0.45 * Math.max(1, k) + q.x * k, y: q.y * k }));
  const below = t1.map((q) => ({ x: q.x * k, y: -top + 0.5 + (q.y - top) * k + top }));
  const sizeOf = (t2: Pt[]) => {
    const all = [...t1, ...t2];
    const w = Math.max(...all.map((q) => q.x)) - Math.min(...all.map((q) => q.x));
    const h = Math.max(...all.map((q) => q.y)) - Math.min(...all.map((q) => q.y));
    return Math.min((frame.x1 - frame.x0) / w, (frame.y1 - frame.y0) / h);
  };
  const t2 = sizeOf(below) > sizeOf(beside) * 1.15 ? below : beside;
  const fit = fitter([t1, t2], frame);
  const T1 = t1.map(fit);
  const T2 = t2.map(fit);
  out.polygons.push({ points: T1 }, { points: T2 });
  const obstacles = [...polygonEdges(T1), ...polygonEdges(T2)];
  const arc = (P: Pt[]) => clamp(Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y) * 0.16, 9, 15);
  for (const [T, names] of [[T1, ["A", "B", "C"]], [T2, ["D", "E", "F"]]] as const) {
    const r = arc(T);
    markAngle(out, ls, obstacles, T[0], T[1], T[2], `${a}°`, r);
    markAngle(out, ls, obstacles, T[1], T[2], T[0], `${b}°`, r);
    markAngle(out, ls, obstacles, T[2], T[0], T[1], "?", r * 0.85);
    const g = centroid(T);
    T.forEach((q, i) => {
      const dir = { x: q.x - g.x, y: q.y - g.y };
      const c = placePointLabel(q, textBox(names[i], MS_FIG_FONT), {
        obstacles,
        bounds: BOUNDS,
        avoid: ls.taken,
        gap: 2,
        prefer: [dir],
      });
      ls.add(names[i], c);
    });
  }
  out.labels = ls.labels;
  return out;
}

// ── Effect of a dilation on area ─────────────────────────────────────────────
// dims: w, h (rectangle) or b, h (triangle, with tri = 1), and k (scale
// factor). The original is labeled; the image is dashed and unlabeled, so
// the picture never gives away the image's dimensions.

function layoutDilationArea(p: MSGeometryFigureParams): MSFigLayout {
  const d = p.dims;
  const out = emptyLayout();
  const ls = new LabelSet();
  const tri = d.tri === 1;
  const wv = tri ? d.b : d.w;
  const hv = d.h;
  const k = d.k;
  // Proportions kept between 1:2 and 2:1 so thin shapes stay drawable.
  const aspect = clamp(hv / wv, 0.5, 2);
  const shape = (s: number, x0: number): Pt[] =>
    tri
      ? [{ x: x0, y: 0 }, { x: x0 + s, y: 0 }, { x: x0 + s * 0.35, y: -s * aspect }]
      : [{ x: x0, y: 0 }, { x: x0 + s, y: 0 }, { x: x0 + s, y: -s * aspect }, { x: x0, y: -s * aspect }];
  const s1 = shape(1, 0);
  const s2 = shape(k, 1 + 0.4 * Math.max(1, k * 0.6));
  const fit = fitter([s1, s2], { x0: 30, y0: 12, x1: MS_FIG_W - 14, y1: MS_FIG_H - 40 });
  const S1 = s1.map(fit);
  const S2 = s2.map(fit);
  out.polygons.push({ points: S1 }, { points: S2, dashed: true });
  const obstacles = [...polygonEdges(S1), ...polygonEdges(S2)];
  const u = p.unit;
  sideLabel(ls, obstacles, S1[0], S1[1], centroid(S1), withUnit(wv, u));
  if (tri) {
    const foot = { x: S1[2].x, y: S1[0].y };
    out.lines.push({ a: S1[2], b: foot, dashed: true });
    const hb = textBox(withUnit(hv, u), MS_FIG_FONT);
    // Height label just left of the dashed height, at mid-height.
    ls.add(withUnit(hv, u), { x: S1[0].x - hb.w / 2 - 4, y: (S1[2].y + foot.y) / 2 });
  } else {
    sideLabel(ls, obstacles, S1[3], S1[0], centroid(S1), withUnit(hv, u));
  }
  const capY = Math.max(S1[0].y, S2[0].y, ...ls.labels.map((l) => l.center.y)) + 14;
  caption(ls, centroid(S1).x, capY, "Original");
  caption(ls, centroid(S2).x, capY, "Image");
  caption(ls, centroid(S2).x, capY + 11, `scale factor ${k}`);
  out.labels = ls.labels;
  return out;
}

export function layoutPairFigure(p: MSGeometryFigureParams): MSFigLayout {
  switch (p.figure as MSPairFigure) {
    case "similar-triangles":
      return layoutSimilarTriangles(p);
    case "exterior-angle":
      return layoutExteriorAngle(p);
    case "aa-similarity":
      return layoutAASimilarity(p);
    case "dilation-area":
      return layoutDilationArea(p);
  }
}

/** Every segment drawn in a layout (polygon edges, extra lines, leaders). */
export function layoutSegments(l: MSFigLayout): Seg[] {
  return [
    ...l.polygons.flatMap((p) => polygonEdges(p.points)),
    ...l.lines.map((x) => [x.a, x.b] as Seg),
  ];
}

// labelPlacement.ts
// Pure helpers that place diagram labels so they don't sit on lines.
// Shared by the PDF renderers (@react-pdf) and the web SVG renderers, so the
// same geometry decides where a label goes in both. No React in here.
//
// Coordinates are SVG user units with y pointing down. A label is placed by
// its center; renderers draw it with textAnchor="middle" and a baseline from
// `baselineY`.

export type Pt = { x: number; y: number };
export type Seg = [Pt, Pt];
export type Box = { w: number; h: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

// ── Text metrics ─────────────────────────────────────────────────────────────

// Advance widths in ems for Times-Bold, which the PDF diagrams use. Close
// enough for the serif faces the web diagrams use too (pass widthScale > 1).
function charEm(ch: string): number {
  if (/[0-9]/.test(ch)) return 0.5;
  if (ch === "°") return 0.4;
  if (ch === "." || ch === "," || ch === ":" || ch === "'") return 0.25;
  if (ch === " ") return 0.25;
  if (ch === "(" || ch === ")") return 0.33;
  if (ch === "-" || ch === "−") return 0.5;
  if (ch === "=" || ch === "+" || ch === "√") return 0.57;
  if (/[A-Z]/.test(ch)) return 0.7;
  return 0.5;
}

/** Approximate box of a one-line label: width from glyph advances, height
 *  from cap height (digits and capitals), which is what can collide. */
export function textBox(text: string, fontSize: number, widthScale = 1): Box {
  let em = 0;
  for (const ch of String(text)) em += charEm(ch);
  return { w: em * fontSize * widthScale, h: fontSize * 0.7 };
}

/** Baseline y that vertically centers a label of `fontSize` on `cy`. */
export function baselineY(cy: number, fontSize: number): number {
  return cy + fontSize * 0.35;
}

// ── Geometry primitives ──────────────────────────────────────────────────────

export function rectAround(c: Pt, box: Box, pad = 0): Rect {
  return {
    x0: c.x - box.w / 2 - pad,
    y0: c.y - box.h / 2 - pad,
    x1: c.x + box.w / 2 + pad,
    y1: c.y + box.h / 2 + pad,
  };
}

/** Liang–Barsky: does segment ab touch rect r? */
export function segHitsRect([a, b]: Seg, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: [number, number][] = [
    [-dx, a.x - r.x0],
    [dx, r.x1 - a.x],
    [-dy, a.y - r.y0],
    [dy, r.y1 - a.y],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

export function rectHitsAny(r: Rect, segs: Seg[]): boolean {
  return segs.some((s) => segHitsRect(s, r));
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export function rectInside(r: Rect, bounds: Rect): boolean {
  return r.x0 >= bounds.x0 && r.y0 >= bounds.y0 && r.x1 <= bounds.x1 && r.y1 <= bounds.y1;
}

/** Shortest distance from point p to rect r (0 if inside). */
export function distToRect(p: Pt, r: Rect): number {
  const dx = Math.max(r.x0 - p.x, 0, p.x - r.x1);
  const dy = Math.max(r.y0 - p.y, 0, p.y - r.y1);
  return Math.hypot(dx, dy);
}

/** Farthest distance from point p to any corner of rect r. */
function maxDistToRect(p: Pt, r: Rect): number {
  return Math.max(
    Math.hypot(r.x0 - p.x, r.y0 - p.y),
    Math.hypot(r.x1 - p.x, r.y0 - p.y),
    Math.hypot(r.x0 - p.x, r.y1 - p.y),
    Math.hypot(r.x1 - p.x, r.y1 - p.y),
  );
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonEdges(poly: Pt[]): Seg[] {
  return poly.map((p, i) => [p, poly[(i + 1) % poly.length]] as Seg);
}

function unit(v: Pt): Pt {
  const m = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / m, y: v.y / m };
}

/** Does a circle arc (center c, radius r) cross rect? Sampled; arcs here are
 *  short and drawn thin, so 2° steps are plenty. Angles in radians, SVG frame. */
function arcHitsRect(c: Pt, r: number, a0: number, a1: number, rect: Rect): boolean {
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  for (let a = lo; a <= hi + 1e-9; a += Math.PI / 90) {
    const x = c.x + r * Math.cos(a);
    const y = c.y + r * Math.sin(a);
    if (x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1) return true;
  }
  return false;
}

// ── Side labels ──────────────────────────────────────────────────────────────

/** Center for a label on segment ab, pushed outward (away from `interior`)
 *  just far enough that its box clears the segment by `gap`. */
export function placeSideLabel(a: Pt, b: Pt, interior: Pt, box: Box, gap = 3): Pt {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let n = unit({ x: -(b.y - a.y), y: b.x - a.x });
  if (n.x * (interior.x - mid.x) + n.y * (interior.y - mid.y) > 0) n = { x: -n.x, y: -n.y };
  // Half-extent of the box measured along the normal.
  const ext = Math.abs(n.x) * (box.w / 2) + Math.abs(n.y) * (box.h / 2);
  const d = gap + ext;
  return { x: mid.x + n.x * d, y: mid.y + n.y * d };
}

// ── Angle labels ─────────────────────────────────────────────────────────────

export type AngleLabelOpts = {
  /** Radius of the arc drawn in the angle; the label must clear it. */
  arcR: number;
  /** Every line on the diagram the label must not touch. */
  obstacles: Seg[];
  /** Region the label must stay inside (the viewBox, less a margin). */
  bounds?: Rect;
  /** Clearance between label and lines. */
  gap?: number;
  /** How far past the arc an inside label may sit before going outside. */
  maxBeyondArc?: number;
  /** Rects already taken by other labels. */
  avoid?: Rect[];
  /** If set, a label that can't fit inside goes at least this far past the
   *  arc, as a callout with a leader line, instead of tucked beside it.
   *  For figures where "beside the arc" is crowded by other lines. */
  callout?: number;
};

export type AngleLabelResult = {
  center: Pt;
  inside: boolean;
  /** When the label had to sit away from its arc, a short line from the
   *  label to the arc so it is clear which angle it names. */
  leader?: Seg;
};

/** Leader from the edge of a label's box to a target point, or undefined
 *  when the label already sits right beside it. */
export function leaderTo(center: Pt, box: Box, target: Pt, minGap = 5): Seg | undefined {
  const r = rectAround(center, box, 1.5);
  if (distToRect(target, r) <= minGap) return undefined;
  // Point where the ray center→target leaves the box.
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const tx = dx === 0 ? Infinity : (dx > 0 ? r.x1 - center.x : r.x0 - center.x) / dx;
  const ty = dy === 0 ? Infinity : (dy > 0 ? r.y1 - center.y : r.y0 - center.y) / dy;
  const t = Math.min(tx, ty);
  return [{ x: center.x + dx * t, y: center.y + dy * t }, target];
}

/**
 * Center for the label of angle p1-vertex-p2. Prefers the bisector just past
 * the arc, inside the angle. When the angle is too narrow for the label to
 * fit there without touching a side, it goes outside, next to the arc, at the
 * clear spot nearest the arc's midpoint.
 */
export function placeAngleLabel(vertex: Pt, p1: Pt, p2: Pt, box: Box, opts: AngleLabelOpts): AngleLabelResult {
  const gap = opts.gap ?? 1.5;
  const maxBeyond = opts.maxBeyondArc ?? 10;
  const avoid = opts.avoid ?? [];
  const u1 = unit({ x: p1.x - vertex.x, y: p1.y - vertex.y });
  const u2 = unit({ x: p2.x - vertex.x, y: p2.y - vertex.y });
  const bis = unit({ x: u1.x + u2.x, y: u1.y + u2.y });
  const a1 = Math.atan2(u1.y, u1.x);
  let a2 = Math.atan2(u2.y, u2.x);
  // Arc from a1 to a2 the short way round.
  let da = a2 - a1;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  a2 = a1 + da;

  const clear = (c: Pt) => {
    const r = rectAround(c, box, gap);
    if (rectHitsAny(r, opts.obstacles)) return false;
    if (opts.bounds && !rectInside(rectAround(c, box), opts.bounds)) return false;
    if (avoid.some((o) => rectsOverlap(r, o))) return false;
    if (arcHitsRect(vertex, opts.arcR, a1, a2, r)) return false;
    return true;
  };

  // 1. Inside, along the bisector, hugging the arc.
  const wedge = [vertex, { x: vertex.x + u1.x * 1e3, y: vertex.y + u1.y * 1e3 }, { x: vertex.x + u2.x * 1e3, y: vertex.y + u2.y * 1e3 }];
  for (let d = opts.arcR * 0.5; d <= opts.arcR + maxBeyond + Math.max(box.w, box.h); d += 0.5) {
    const c = { x: vertex.x + bis.x * d, y: vertex.y + bis.y * d };
    const r = rectAround(c, box);
    if (distToRect(vertex, r) < opts.arcR + gap) continue; // must sit past the arc
    if (distToRect(vertex, r) > opts.arcR + maxBeyond) break; // drifted away from the arc
    if (!pointInPolygon(c, wedge)) continue;
    if (clear(c)) return { center: c, inside: true };
  }

  // 2. Outside: try directions all round the vertex, keep the clear spot
  //    closest to the arc's midpoint.
  const arcMid = { x: vertex.x + bis.x * opts.arcR, y: vertex.y + bis.y * opts.arcR };
  let best: Pt | null = null;
  let bestScore = Infinity;
  for (let deg = 0; deg < 360; deg += 5) {
    const t = (deg * Math.PI) / 180;
    const dir = { x: Math.cos(t), y: Math.sin(t) };
    const d0 = opts.callout ? opts.arcR + opts.callout : 2;
    for (let d = d0; d <= opts.arcR + 40 + (opts.callout ?? 0); d += 0.5) {
      const c = { x: vertex.x + dir.x * d, y: vertex.y + dir.y * d };
      if (pointInPolygon(c, wedge)) break; // that's the inside case, already tried
      if (!clear(c)) continue;
      const score = Math.hypot(c.x - arcMid.x, c.y - arcMid.y);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
      break; // nearest clear spot along this direction
    }
  }
  if (best) return { center: best, inside: false, leader: leaderTo(best, box, arcMid, opts.callout ? 0 : 5) };

  // 3. Nothing clear (tiny diagram): fall back to the bisector past the arc.
  const d = opts.arcR + gap + maxDistToRect({ x: 0, y: 0 }, rectAround({ x: 0, y: 0 }, box));
  return { center: { x: vertex.x + bis.x * d, y: vertex.y + bis.y * d }, inside: true };
}

// ── Point labels ─────────────────────────────────────────────────────────────

const DIRS: Pt[] = [
  { x: 1, y: -1 }, // NE (the old default)
  { x: -1, y: -1 }, // NW
  { x: 1, y: 1 }, // SE
  { x: -1, y: 1 }, // SW
  { x: 0, y: -1 }, // N
  { x: 0, y: 1 }, // S
  { x: 1, y: 0 }, // E
  { x: -1, y: 0 }, // W
].map(unit);

export type PointLabelOpts = {
  obstacles: Seg[];
  bounds?: Rect;
  avoid?: Rect[];
  /** Clearance from the point itself (covers the dot). */
  gap?: number;
  /** Directions to try first, as unit-ish vectors. */
  prefer?: Pt[];
};

/**
 * Center for the label of a point. Tries eight directions round the point
 * and takes the first whose box touches no line, no other label and stays in
 * bounds; if none is clear, the one touching the fewest.
 */
export function placePointLabel(pt: Pt, box: Box, opts: PointLabelOpts): Pt {
  const gap = opts.gap ?? 3;
  const avoid = opts.avoid ?? [];
  const dirs = [...(opts.prefer ?? []).map(unit), ...DIRS];
  let best: Pt | null = null;
  let bestHits = Infinity;
  for (const dir of dirs) {
    const ext = Math.abs(dir.x) * (box.w / 2) + Math.abs(dir.y) * (box.h / 2);
    const d = gap + ext;
    const c = { x: pt.x + dir.x * d, y: pt.y + dir.y * d };
    const r = rectAround(c, box, 1);
    let hits = opts.obstacles.filter((s) => segHitsRect(s, r)).length;
    hits += avoid.filter((o) => rectsOverlap(r, o)).length;
    if (opts.bounds && !rectInside(rectAround(c, box), opts.bounds)) hits += 10;
    if (hits === 0) return c;
    if (hits < bestHits) {
      bestHits = hits;
      best = c;
    }
  }
  return best ?? { x: pt.x + 6, y: pt.y - 6 };
}

// ── Right triangle layout ────────────────────────────────────────────────────

export type RightTriangleInput = {
  opposite: number;
  adjacent: number;
  orientation: "left" | "right";
  referenceAnglePos: "base" | "top";
  labels: { opposite: string | number; adjacent: string | number; hypotenuse: string | number };
  /** Label for the reference angle; "" draws no arc there. */
  referenceAngleLabel: string;
  /** Optional label for the other acute angle (e.g. "?"); "" or absent draws none. */
  otherAngleLabel?: string;
};

export type RightTriangleLayout = {
  points: [Pt, Pt, Pt]; // right-angle vertex, base vertex, top vertex
  rightMark: string; // path d
  /** Path d of each angle arc drawn (reference first, then the other). */
  arcs: string[];
  labels: { text: string; center: Pt }[];
  leaders: Seg[];
};

/**
 * Lays out the trig / special-right-triangle diagram: triangle, right-angle
 * box, reference arc, and the four labels placed clear of every side.
 */
type TriFrame = { width: number; height: number; pad: number; scale?: number; offX?: number; offY?: number };
type TriStyle = { fontSize: number; widthScale?: number; arcR: number; markSize: number };

export function layoutRightTriangle(p: RightTriangleInput, frame: TriFrame, style: TriStyle): RightTriangleLayout {
  // The variant's scale and offset can push outside labels off the edge;
  // when they do, draw a little smaller and nearer the middle until all fit.
  let f = { ...frame };
  let lay = layoutRightTriangleOnce(p, f, style);
  const bounds = { x0: 0, y0: 0, x1: frame.width, y1: frame.height };
  const fits = (l: RightTriangleLayout) =>
    l.labels.every((x) => rectInside(rectAround(x.center, textBox(x.text, style.fontSize, style.widthScale ?? 1)), bounds));
  for (let i = 0; i < 8 && !fits(lay); i++) {
    f = { ...f, scale: (f.scale ?? 1) * 0.92, offX: (f.offX ?? 0) * 0.5, offY: (f.offY ?? 0) * 0.5 };
    lay = layoutRightTriangleOnce(p, f, style);
  }
  return lay;
}

function layoutRightTriangleOnce(p: RightTriangleInput, frame: TriFrame, style: TriStyle): RightTriangleLayout {
  const { width, height, pad } = frame;
  const scale = frame.scale ?? 1;
  const effW = (width - 2 * pad) * scale;
  const effH = (height - 2 * pad) * scale;
  const maxSide = Math.max(p.opposite, p.adjacent);
  const baseSide = p.referenceAnglePos === "base" ? p.adjacent : p.opposite;
  const vertSide = p.referenceAnglePos === "base" ? p.opposite : p.adjacent;
  const baseLength = (baseSide / maxSide) * effW;
  const vertLength = (vertSide / maxSide) * effH;

  const xLeft = pad + (width - 2 * pad - baseLength) / 2 + (frame.offX ?? 0);
  const xRight = xLeft + baseLength;
  const yBottom = height - pad - (height - 2 * pad - vertLength) / 2 + (frame.offY ?? 0);
  const yTop = yBottom - vertLength;

  // R = right angle, B = other base vertex, T = top vertex.
  const R: Pt = p.orientation === "right" ? { x: xRight, y: yBottom } : { x: xLeft, y: yBottom };
  const B: Pt = p.orientation === "right" ? { x: xLeft, y: yBottom } : { x: xRight, y: yBottom };
  const T: Pt = { x: R.x, y: yTop };
  const tri: Pt[] = [R, B, T];
  const edges = polygonEdges(tri);
  const centroid = { x: (R.x + B.x + T.x) / 3, y: (R.y + B.y + T.y) / 3 };

  const baseLen = Math.abs(B.x - R.x);
  const vertLen = Math.abs(T.y - R.y);
  // Keep the right-angle box and the arc small enough for very thin triangles.
  const m = Math.min(style.markSize, 0.35 * Math.min(baseLen, vertLen));
  const sx = B.x > R.x ? 1 : -1;
  const rightMark = `M ${R.x + sx * m} ${R.y} L ${R.x + sx * m} ${R.y - m} L ${R.x} ${R.y - m}`;

  // Reference angle at B ("base") or T ("top"); the other acute angle at the
  // remaining vertex. Each has sides to R (a leg) and to the third vertex.
  const angleAt = (V: Pt, W: Pt) => {
    const arcR = Math.max(6, Math.min(style.arcR, 0.45 * Math.min(Math.hypot(R.x - V.x, R.y - V.y), Math.hypot(W.x - V.x, W.y - V.y))));
    const legU = unit({ x: R.x - V.x, y: R.y - V.y });
    const hypU = unit({ x: W.x - V.x, y: W.y - V.y });
    const s0 = { x: V.x + legU.x * arcR, y: V.y + legU.y * arcR };
    const e0 = { x: V.x + hypU.x * arcR, y: V.y + hypU.y * arcR };
    const sweep = legU.x * hypU.y - legU.y * hypU.x > 0 ? 1 : 0;
    return { V, W, arcR, d: `M ${s0.x} ${s0.y} A ${arcR} ${arcR} 0 0 ${sweep} ${e0.x} ${e0.y}` };
  };
  const ref = p.referenceAnglePos === "base" ? angleAt(B, T) : angleAt(T, B);
  const oth = p.referenceAnglePos === "base" ? angleAt(T, B) : angleAt(B, T);
  const arcs: string[] = [];
  if (p.referenceAngleLabel) arcs.push(ref.d);
  if (p.otherAngleLabel) arcs.push(oth.d);

  const fs = style.fontSize;
  const ws = style.widthScale ?? 1;
  const baseText = String(p.referenceAnglePos === "base" ? p.labels.adjacent : p.labels.opposite);
  const vertText = String(p.referenceAnglePos === "base" ? p.labels.opposite : p.labels.adjacent);
  const hypText = String(p.labels.hypotenuse);

  const out: { text: string; center: Pt }[] = [];
  const leaders: Seg[] = [];
  const taken: Rect[] = [];
  const add = (text: string, center: Pt) => {
    if (!text) return;
    out.push({ text, center });
    taken.push(rectAround(center, textBox(text, fs, ws), 1));
  };
  add(baseText, placeSideLabel(R, B, centroid, textBox(baseText, fs, ws), 3));
  add(vertText, placeSideLabel(R, T, centroid, textBox(vertText, fs, ws), 3));
  add(hypText, placeSideLabel(B, T, centroid, textBox(hypText, fs, ws), 3));

  for (const [text, a] of [[p.referenceAngleLabel, ref], [p.otherAngleLabel ?? "", oth]] as const) {
    if (!text) continue;
    const { center, leader } = placeAngleLabel(a.V, R, a.W, textBox(text, fs, ws), {
      arcR: a.arcR,
      obstacles: edges,
      bounds: { x0: 1, y0: 1, x1: width - 1, y1: height - 1 },
      avoid: taken,
    });
    add(text, center);
    if (leader) leaders.push(leader);
  }

  return { points: [R, B, T], rightMark, arcs, labels: out, leaders };
}

// ── Circle helpers ───────────────────────────────────────────────────────────

/** A circle as short chords, so it can be an obstacle. */
export function circleSegments(c: Pt, r: number, n = 72): Seg[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    pts.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });
  }
  return polygonEdges(pts);
}

/** Path for a small arc marking angle p1-v-p2 (the short way round). */
export function angleArcPath(v: Pt, p1: Pt, p2: Pt, r: number): string {
  const u1 = unit({ x: p1.x - v.x, y: p1.y - v.y });
  const u2 = unit({ x: p2.x - v.x, y: p2.y - v.y });
  const s = { x: v.x + u1.x * r, y: v.y + u1.y * r };
  const e = { x: v.x + u2.x * r, y: v.y + u2.y * r };
  const sweep = u1.x * u2.y - u1.y * u2.x > 0 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 ${sweep} ${e.x} ${e.y}`;
}

/** Label center just outside a circle, on the ray from its center through pt. */
export function radialLabel(center: Pt, pt: Pt, box: Box, gap = 4): Pt {
  const u = unit({ x: pt.x - center.x, y: pt.y - center.y });
  const ext = Math.abs(u.x) * (box.w / 2) + Math.abs(u.y) * (box.h / 2);
  return { x: pt.x + u.x * (gap + ext), y: pt.y + u.y * (gap + ext) };
}

/** Unit tangent to a circle at pt, pointing the way polar angle increases
 *  (clockwise on screen). */
export function circleTangentAt(center: Pt, pt: Pt): Pt {
  const u = unit({ x: pt.x - center.x, y: pt.y - center.y });
  return { x: -u.y, y: u.x };
}

/**
 * Nudge a preferred label center until its box touches no line and no taken
 * rect: tries the spot itself, then rings of growing radius around it. Used
 * for arc-measure labels, which should stay beside their arc.
 */
export function nudgeClear(pref: Pt, box: Box, opts: { obstacles: Seg[]; avoid?: Rect[]; bounds?: Rect; away?: Pt }): Pt {
  const avoid = opts.avoid ?? [];
  const ok = (c: Pt) => {
    const r = rectAround(c, box, 1);
    if (rectHitsAny(r, opts.obstacles)) return false;
    if (avoid.some((o) => rectsOverlap(r, o))) return false;
    if (opts.bounds && !rectInside(rectAround(c, box), opts.bounds)) return false;
    return true;
  };
  if (ok(pref)) return pref;
  for (let rad = 2; rad <= 30; rad += 2) {
    let best: Pt | null = null;
    let bestScore = -Infinity;
    for (let deg = 0; deg < 360; deg += 15) {
      const t = (deg * Math.PI) / 180;
      const c = { x: pref.x + rad * Math.cos(t), y: pref.y + rad * Math.sin(t) };
      if (!ok(c)) continue;
      // Prefer moving away from `away` (e.g. the circle center) over toward it.
      const score = opts.away ? Math.hypot(c.x - opts.away.x, c.y - opts.away.y) : 0;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best) return best;
  }
  return pref;
}

// ── Coordinate-grid point labels ─────────────────────────────────────────────

export type GridLabelInput = {
  /** Points in screen coordinates, with their labels ("" for none). */
  points: { at: Pt; text: string }[];
  /** Segments and polygon edges drawn on the grid, in screen coordinates. */
  lines: Seg[];
  /** The x- and y-axes, avoided when possible. */
  axes: Seg[];
  bounds: Rect;
  fontSize: number;
  widthScale?: number;
  /** Half-size of the point markers. */
  marker?: number;
};

/** Centers for every point label on a coordinate grid, each clear of drawn
 *  segments, polygon edges, the axes, other markers and other labels. */
export function layoutGridPointLabels(g: GridLabelInput): (Pt | null)[] {
  const ws = g.widthScale ?? 1;
  const mk = g.marker ?? 4;
  const markers: Rect[] = g.points.map((p) => ({ x0: p.at.x - mk, y0: p.at.y - mk, x1: p.at.x + mk, y1: p.at.y + mk }));
  const taken: Rect[] = [];
  // Labels read best on the outside of the figure: try first the direction
  // away from the middle of all the points (then the diagonals beside it).
  const n = g.points.length;
  const mid = {
    x: g.points.reduce((t, p) => t + p.at.x, 0) / (n || 1),
    y: g.points.reduce((t, p) => t + p.at.y, 0) / (n || 1),
  };
  return g.points.map((p, i) => {
    if (!p.text) return null;
    const box = textBox(p.text, g.fontSize, ws);
    const others = markers.filter((_, j) => j !== i);
    const away = { x: p.at.x - mid.x, y: p.at.y - mid.y };
    const prefer: Pt[] = [];
    if (n > 1 && Math.hypot(away.x, away.y) > 1e-6) {
      const u = unit(away);
      // Snap to the nearest of the eight directions, then its neighbours.
      const k = Math.round(Math.atan2(u.y, u.x) / (Math.PI / 4));
      for (const dk of [0, -1, 1]) {
        const t = ((k + dk) * Math.PI) / 4;
        prefer.push({ x: Math.cos(t), y: Math.sin(t) });
      }
    }
    const c = placePointLabel(p.at, box, {
      obstacles: [...g.lines, ...g.axes],
      avoid: [...others, ...taken],
      bounds: g.bounds,
      gap: mk + 2,
      prefer,
    });
    taken.push(rectAround(c, box, 1));
    return c;
  });
}

// ── Middle-school right triangle ─────────────────────────────────────────────

/**
 * The middle-school "right-triangle" figure, from its numeric dims:
 *  - sides:  { leg1, leg2, hyp, unknown }  unknown 1 = leg2 is the unknown
 *            (labeled "b"), 2 = the hypotenuse is (labeled "c"), 0 = none.
 *  - angles: { angle }  one acute angle is shown; the other is labeled "?".
 * leg1 is drawn along the base and leg2 upright. The variant only mirrors the
 * figure; the sides and their labels never change.
 */
export function rightTriangleFromDims(dims: Record<string, number>, variant = 0): RightTriangleInput {
  const orientation = variant % 2 === 0 ? "left" : "right";
  if (dims.angle) {
    const t = (dims.angle * Math.PI) / 180;
    return {
      adjacent: Math.cos(t),
      opposite: Math.sin(t),
      orientation,
      referenceAnglePos: "base",
      labels: { adjacent: "", opposite: "", hypotenuse: "" },
      referenceAngleLabel: `${dims.angle}°`,
      otherAngleLabel: "?",
    };
  }
  const unknown = dims.unknown ?? 0;
  return {
    adjacent: dims.leg1,
    opposite: dims.leg2,
    orientation,
    referenceAnglePos: "base",
    labels: {
      adjacent: String(dims.leg1),
      opposite: unknown === 1 ? "b" : String(dims.leg2),
      hypotenuse: unknown === 2 ? "c" : String(dims.hyp),
    },
    referenceAngleLabel: "",
  };
}

// diagram-labels.ts, checks that diagram labels sit clear of the lines they
// label, and that circle diagrams never print the answer.
//
// Teachers reported angle labels cut by the hypotenuse (28°, 23°, 30°), a
// circle answer printed on the student copy ("20°?", "55°?"), a point label
// on a dashed segment, and Pre-Algebra right-triangle problems with no
// diagram. Every check here runs the same layout code the PDF and web
// renderers use, over every diagram the registry generates.
//
// Run: npx tsx tests/diagram-labels.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import {
  type Pt,
  type Rect,
  type Seg,
  layoutRightTriangle,
  layoutGridPointLabels,
  polygonEdges,
  rectAround,
  rectHitsAny,
  rectInside,
  rectsOverlap,
  rightTriangleFromDims,
  textBox,
  circleSegments,
  segHitsRect,
} from "../src/lib/labelPlacement";
import { inscribedLabels, tangentLayout, coordinatePairLabels, CIRCLE_CENTER, CIRCLE_R } from "../src/lib/geometryDiagramLayout";

let checks = 0;
const failures: string[] = [];
function ok(cond: boolean, msg: string) {
  checks++;
  if (!cond) failures.push(msg);
}

function polar(r: number, d: number): Pt {
  const a = ((d - 90) * Math.PI) / 180;
  return { x: CIRCLE_CENTER.x + r * Math.cos(a), y: CIRCLE_CENTER.y + r * Math.sin(a) };
}

// ── Collect every diagram the registry generates ─────────────────────────────

const byKind = new Map<string, { sp: any; src: string; p: any }[]>();
for (const e of CURRICULUM_REGISTRY) {
  for (const mode of ["Test", "Review"] as const) {
    for (const seed of [1, 7, 42, 1234]) {
      for (const difficulty of [1, 2, 3]) {
        let ps: any[] = [];
        try {
          ps = e.generate(mode, seed, { count: 8, difficulty } as any) as any[];
        } catch {
          continue;
        }
        for (const p of ps) {
          const sp = p?.svgParams;
          if (!sp || typeof sp !== "object") continue;
          const k = sp.kind === "MSGeometryFigure" ? `MSGeometryFigure:${sp.figure}` : sp.kind;
          if (!byKind.has(k)) byKind.set(k, []);
          byKind.get(k)!.push({ sp, src: `${e.id} seed ${seed} d${difficulty}`, p });
        }
      }
    }
  }
}

// ── Right triangles (trig, special right triangles), PDF and web frames ──────

function checkTriangle(lay: ReturnType<typeof layoutRightTriangle>, fs: number, ws: number, w: number, h: number, where: string) {
  const [R, B, T] = lay.points;
  const edges = polygonEdges([R, B, T]);
  const rects: Rect[] = [];
  for (const l of lay.labels) {
    const r = rectAround(l.center, textBox(l.text, fs, ws));
    ok(!rectHitsAny(r, edges), `${where}: label "${l.text}" touches a side`);
    ok(rectInside(r, { x0: -1, y0: -1, x1: w + 1, y1: h + 1 }), `${where}: label "${l.text}" leaves the diagram`);
    for (const o of rects) ok(!rectsOverlap(r, o), `${where}: label "${l.text}" overlaps another label`);
    rects.push(r);
  }
}

const trig = byKind.get("RightTriangle") ?? [];
ok(trig.length > 50, `expected many RightTriangle diagrams, got ${trig.length}`);
for (const { sp, src } of trig) {
  for (let v = 0; v < 6; v++) {
    const pdf = layoutRightTriangle(sp, {
      width: 130, height: 130, pad: 20,
      scale: [1, 0.9, 1.06, 0.94, 0.84, 1.12][v],
      offX: [0, 5, -5, 3, -4, 6][v],
      offY: [0, -4, 4, 5, 3, -6][v],
    }, { fontSize: 10, arcR: 18, markSize: 10 });
    checkTriangle(pdf, 10, 1, 130, 130, `PDF ${src} v${v} (${sp.referenceAngleLabel})`);
  }
  const web = layoutRightTriangle(sp, { width: 100, height: 100, pad: 15 }, { fontSize: 10, widthScale: 1.15, arcR: 15, markSize: 8 });
  checkTriangle(web, 10, 1.15, 100, 100, `web ${src} (${sp.referenceAngleLabel})`);
}

// The exact sample-PDF cases Kai reported.
for (const [opp, adj, o, pos, a] of [
  [28, 51, "left", "base", "28°"],
  [23, 39, "right", "top", "23°"],
  [1, 1.732, "left", "base", "30°"],
] as const) {
  const sp = { opposite: opp, adjacent: adj, orientation: o, referenceAnglePos: pos, referenceAngleLabel: a, labels: { opposite: "x", adjacent: "51", hypotenuse: "39" } };
  const lay = layoutRightTriangle(sp as any, { width: 130, height: 130, pad: 20 }, { fontSize: 10, arcR: 18, markSize: 10 });
  checkTriangle(lay, 10, 1, 130, 130, `reported ${a}`);
}

// ── Circle diagrams: no answer printed, "?" clear of every line ──────────────

const circle = circleSegments(CIRCLE_CENTER, CIRCLE_R);
const ins = byKind.get("InscribedAngle") ?? [];
ok(ins.length > 10, `expected InscribedAngle diagrams, got ${ins.length}`);
for (const { sp, src, p } of ins) {
  for (let v = 0; v < 8; v++) {
    const arcStart = 30 + v * 45;
    const A = polar(CIRCLE_R, arcStart);
    const B = polar(CIRCLE_R, arcStart + sp.interceptedArc);
    const V = polar(CIRCLE_R, arcStart + sp.interceptedArc + 60);
    const L = inscribedLabels(A, B, V, sp.interceptedArc, arcStart);
    const texts = L.map((l) => l.text);
    ok(!texts.some((t) => t.includes(`${p.answer}°`) && t !== `${sp.interceptedArc}°`), `${src} v${v}: inscribed diagram prints the answer ${p.answer}°`);
    ok(!texts.some((t) => t.endsWith("°?")), `${src} v${v}: a "N°?" label is back`);
    ok(texts.includes("?"), `${src} v${v}: unknown angle not marked`);
    const q = L.find((l) => l.text === "?")!;
    const r = rectAround(q.center, textBox("?", 8));
    ok(!rectHitsAny(r, [[V, A], [V, B], ...circle] as Seg[]), `${src} v${v}: "?" touches a line`);
    for (const l of L) ok(rectInside(rectAround(l.center, textBox(l.text, 8)), { x0: 0, y0: 0, x1: 200, y1: 200 }), `${src} v${v}: "${l.text}" leaves the diagram`);
  }
}

const tan = byKind.get("Tangent") ?? [];
ok(tan.length > 10, `expected Tangent diagrams, got ${tan.length}`);
for (const { sp, src, p } of tan) {
  for (let v = 0; v < 8; v++) {
    const cs = 70 + v * 45;
    const A = polar(CIRCLE_R, cs);
    const B = polar(CIRCLE_R, cs + sp.tangentAngle * 2);
    const T = tangentLayout(A, B, sp.tangentAngle, cs);
    // Tangent really is tangent: perpendicular to the radius at A.
    const oa = { x: A.x - CIRCLE_CENTER.x, y: A.y - CIRCLE_CENTER.y };
    const tt = { x: T.t2.x - T.t1.x, y: T.t2.y - T.t1.y };
    ok(Math.abs(oa.x * tt.x + oa.y * tt.y) / (Math.hypot(oa.x, oa.y) * Math.hypot(tt.x, tt.y)) < 1e-9, `${src} v${v}: tangent line not perpendicular to OA`);
    // t2 is on the arc's side, so the marked angle is the one asked about.
    const toB = { x: B.x - A.x, y: B.y - A.y };
    const t2 = { x: T.t2.x - A.x, y: T.t2.y - A.y };
    const ang = (Math.acos((toB.x * t2.x + toB.y * t2.y) / (Math.hypot(toB.x, toB.y) * Math.hypot(t2.x, t2.y))) * 180) / Math.PI;
    ok(Math.abs(ang - sp.tangentAngle) < 1e-6, `${src} v${v}: marked angle ${ang.toFixed(2)}° is not the ${sp.tangentAngle}° asked about`);
    const texts = T.labels.map((l) => l.text);
    ok(!texts.includes(`${p.answer}°`) && !texts.some((t) => t.endsWith("°?")), `${src} v${v}: tangent diagram prints the answer`);
    const q = T.labels.find((l) => l.text === "?")!;
    ok(!rectHitsAny(rectAround(q.center, textBox("?", 8)), [[T.t1, T.t2], [A, B], ...circle] as Seg[]), `${src} v${v}: "?" touches a line`);
    for (const l of T.labels) {
      if (l.text === "?") continue;
      ok(!rectHitsAny(rectAround(l.center, textBox(l.text, 8)), [[T.t1, T.t2], [A, B]]), `${src} v${v}: "${l.text}" touches the tangent or chord`);
    }
  }
}

// ── Coordinate grids: point labels clear of segments and polygon edges ───────

let gridLabels = 0;
const grids = [...(byKind.get("MSCoordinateGrid") ?? [])];
for (const { sp, src } of grids) {
  const W = 200, H = 200, pad = 16;
  const spanX = sp.maxX - sp.minX || 1;
  const spanY = sp.maxY - sp.minY || 1;
  const X = (v: number) => pad + ((v - sp.minX) / spanX) * (W - 2 * pad);
  const Y = (v: number) => H - pad - ((v - sp.minY) / spanY) * (H - 2 * pad);
  const lines: Seg[] = [
    ...(sp.segments ?? []).map((s: any) => [{ x: X(s.x1), y: Y(s.y1) }, { x: X(s.x2), y: Y(s.y2) }] as Seg),
    ...(sp.polygons ?? []).flatMap((poly: any) => polygonEdges(poly.points.map((q: any) => ({ x: X(q.x), y: Y(q.y) })))),
  ];
  const pts = (sp.points ?? []).map((pt: any) => ({ at: { x: X(pt.x), y: Y(pt.y) }, text: pt.label ?? "" }));
  const centers = layoutGridPointLabels({ points: pts, lines, axes: [], bounds: { x0: 0, y0: 0, x1: W, y1: H }, fontSize: 10 });
  const placed: Rect[] = [];
  centers.forEach((c, i) => {
    if (!c) return;
    gridLabels++;
    const r = rectAround(c, textBox(pts[i].text, 10));
    ok(!lines.some((s) => segHitsRect(s, r)), `${src}: point label "${pts[i].text}" touches a segment`);
    for (const o of placed) ok(!rectsOverlap(r, o), `${src}: point label "${pts[i].text}" overlaps another label`);
    placed.push(r);
  });
}
ok(gridLabels > 100, `expected many grid point labels, got ${gridLabels}`);

// Geometry two-point grids (G.2(B)); Kai's sample problem 3 had "A" on the segment.
const pairs = byKind.get("CoordinateGrid") ?? [];
ok(pairs.length > 20, `expected CoordinateGrid diagrams, got ${pairs.length}`);
for (const { sp, src } of [...pairs, { sp: { p1: { x: -5, y: 2, label: "A" }, p2: { x: -4, y: 3, label: "B" } }, src: "sample problem 3" }]) {
  for (const ws of [1, 1.15]) {
    const a = { x: 100 + sp.p1.x * 10, y: 100 - sp.p1.y * 10 };
    const b = { x: 100 + sp.p2.x * 10, y: 100 - sp.p2.y * 10 };
    const L = coordinatePairLabels(sp.p1, sp.p2, ws);
    ok(L.length === 2, `${src}: both points labeled`);
    const rs = L.map((l) => rectAround(l.center, textBox(l.text, 9, ws)));
    for (const [i, r] of rs.entries()) {
      ok(!segHitsRect([a, b], r), `${src}: point label "${L[i].text}" touches the segment`);
      for (const q of [a, b]) ok(!(q.x > r.x0 - 3 && q.x < r.x1 + 3 && q.y > r.y0 - 3 && q.y < r.y1 + 3), `${src}: point label "${L[i].text}" covers a point`);
    }
    ok(!rectsOverlap(rs[0], rs[1]), `${src}: the two point labels overlap`);
  }
}

// ── Middle-school right triangles ────────────────────────────────────────────

const msRight = byKind.get("MSGeometryFigure:right-triangle") ?? [];
const pyth = msRight.filter((d) => d.p.subtype === "PythagoreanTheorem");
const g6 = msRight.filter((d) => d.p.subtype === "TriangleProperties");
ok(pyth.length > 5, `Pre-Algebra Pythagorean problems should have a diagram, got ${pyth.length}`);
ok(g6.length > 2, `Grade 6 right-triangle angle problems should draw a right triangle, got ${g6.length}`);
for (const { sp, src, p } of msRight) {
  for (let v = 0; v < 2; v++) {
    const input = rightTriangleFromDims(sp.dims, v);
    const lay = layoutRightTriangle(input, { width: 200, height: 170, pad: 34 }, { fontSize: 11, widthScale: 1.15, arcR: 20, markSize: 11 });
    checkTriangle(lay, 11, 1.15, 200, 170, `${src} v${v}`);
    const texts = lay.labels.map((l) => l.text);
    if (sp.dims.unknown === 2) ok(texts.includes("c") && !texts.includes(String(p.answer)), `${src}: hypotenuse should read "c", not the answer`);
    if (sp.dims.unknown === 1) ok(texts.includes("b") && !texts.includes(String(p.answer)), `${src}: missing leg should read "b", not the answer`);
    if (sp.dims.angle) ok(texts.includes("?") && texts.includes(`${sp.dims.angle}°`) && !texts.includes(String(p.answer)), `${src}: angle figure should show the known angle and "?"`);
  }
}

console.log(`diagram-labels: ${checks} checks, ${failures.length} failures`);
console.log(`  right triangles ${trig.length}, inscribed ${ins.length}, tangent ${tan.length}, grids ${grids.length} (${gridLabels} labels), MS right triangles ${msRight.length}`);
if (failures.length) {
  const kinds = new Map<string, number>();
  for (const f of failures) {
    const k = f.replace(/^[^:]*: /, "").replace(/"[^"]*"/g, "…");
    kinds.set(k, (kinds.get(k) ?? 0) + 1);
  }
  for (const [k, n] of kinds) console.log(`  ${n} x ${k}`);
  for (const f of failures.slice(0, 15)) console.log("  FAIL " + f);
  process.exit(1);
}

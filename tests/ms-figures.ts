// ms-figures.ts, checks the middle-school two-shape and angle-mark figures
// (similar figures, exterior angle, AA similarity, dilation area).
//
// These four problem types printed with no diagram until Nov 2026. For every
// one the registry generates, this checks that:
//   • the problem carries a figure,
//   • every label sits inside the frame, clear of every drawn line and of
//     every other label,
//   • the labels print exactly the given measurements plus "?" or "x" for the
//     unknown, so the answer is never on the student copy.
//
// Run: npx tsx tests/ms-figures.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { rectAround, rectInside, rectsOverlap, segHitsRect, textBox } from "../src/lib/labelPlacement";
import { MS_FIG_H, MS_FIG_W, isPairFigure, layoutPairFigure, layoutSegments } from "../src/lib/msFigureLayout";
import type { MSGeometryFigureParams } from "../src/lib/factories/MiddleSchoolTypes";

let checks = 0;
const failures: string[] = [];
function ok(cond: boolean, msg: string) {
  checks++;
  if (!cond && failures.length < 400) failures.push(msg);
}

// Prompt fragments that identify each of the four problem types.
const TYPES: { name: string; match: RegExp; figure: string }[] = [
  { name: "scale factor", match: /What is the scale factor from Figure A to Figure B/, figure: "similar-triangles" },
  { name: "similar missing side", match: /Two triangles are similar\. In the first triangle/, figure: "similar-triangles" },
  { name: "similar area", match: /The area of Figure A is/, figure: "similar-triangles" },
  { name: "exterior angle", match: /remote interior angles for one exterior angle/, figure: "exterior-angle" },
  { name: "AA similarity", match: /similar by the AA criterion/, figure: "aa-similarity" },
  { name: "dilation area", match: /is dilated by a scale factor of \d+\. What is the area of the image/, figure: "dilation-area" },
];
const seen = new Map<string, number>();

/** The label texts a figure should print, given its dims. */
function expectedLabels(sp: MSGeometryFigureParams): string[] {
  const d = sp.dims;
  const u = (n: number) => (sp.unit ? `${n} ${sp.unit}` : `${n}`);
  switch (sp.figure) {
    case "similar-triangles": {
      const out = [u(d.base1), u(d.base2)];
      if (d.side1 !== undefined) out.push(u(d.side1), d.side2 !== undefined ? u(d.side2) : "x");
      out.push(...(sp.captions ?? ["Figure A", "Figure B"]));
      if (d.area1 !== undefined) out.push(`Area = ${d.area1} ${sp.unit}²`, "Area = ?");
      return out;
    }
    case "exterior-angle":
      return [`${d.r1}°`, `${d.r2}°`, "?"];
    case "aa-similarity":
      return [`${d.a}°`, `${d.b}°`, "?", "A", "B", "C", `${d.a}°`, `${d.b}°`, "?", "D", "E", "F"];
    case "dilation-area":
      return [u(d.tri === 1 ? d.b : d.w), u(d.h), "Original", "Image", `scale factor ${d.k}`];
    default:
      return [];
  }
}

const frame = { x0: 0, y0: 0, x1: MS_FIG_W, y1: MS_FIG_H };
let figures = 0;

for (const e of CURRICULUM_REGISTRY) {
  for (const mode of ["Test", "Review"] as const) {
    for (const seed of [1, 7, 42, 1234, 9001]) {
      for (const difficulty of [1, 2, 3]) {
        let ps: any[] = [];
        try {
          ps = e.generate(mode, seed, { count: 12, difficulty } as any) as any[];
        } catch {
          continue;
        }
        for (const p of ps) {
          const text = String(p?.prompt ?? p?.question ?? "");
          const type = TYPES.find((t) => t.match.test(text));
          if (!type) continue;
          const tag = `${e.id} ${type.name} seed ${seed}: ${text.slice(0, 60)}`;
          const sp = p.svgParams as MSGeometryFigureParams | null;
          ok(!!sp && sp.kind === "MSGeometryFigure" && sp.figure === type.figure, `${tag}: no ${type.figure} figure`);
          if (!sp || sp.kind !== "MSGeometryFigure" || !isPairFigure(sp.figure)) continue;
          seen.set(type.name, (seen.get(type.name) ?? 0) + 1);
          figures++;

          const lay = layoutPairFigure(sp);
          const segs = layoutSegments(lay);
          // Exactly the expected labels, so the answer is never printed.
          const got = lay.labels.map((l) => l.text).sort();
          const want = expectedLabels(sp).sort();
          ok(JSON.stringify(got) === JSON.stringify(want), `${tag}: labels ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
          const rects = lay.labels.map((l) => rectAround(l.center, textBox(l.text, l.size)));
          lay.labels.forEach((l, i) => {
            ok(rectInside(rects[i], frame), `${tag}: label "${l.text}" outside the frame`);
            const hit = segs.find((s) => segHitsRect(s, rects[i]));
            ok(!hit, `${tag}: label "${l.text}" touches a line`);
            for (let j = i + 1; j < rects.length; j++) {
              ok(!rectsOverlap(rects[i], rects[j]), `${tag}: labels "${l.text}" and "${lay.labels[j].text}" overlap`);
            }
          });
          // Shapes stay inside the frame.
          for (const poly of lay.polygons) {
            for (const q of poly.points) ok(q.x >= 0 && q.x <= MS_FIG_W && q.y >= 0 && q.y <= MS_FIG_H, `${tag}: vertex outside the frame`);
          }
        }
      }
    }
  }
}

// Every value the generators can draw, in every presentation variant, laid out
// directly (the registry sweep above only reaches the seeds it tries).
function checkLayout(sp: MSGeometryFigureParams, tag: string) {
  const lay = layoutPairFigure(sp);
  const segs = layoutSegments(lay);
  const got = lay.labels.map((l) => l.text).sort();
  const want = expectedLabels(sp).sort();
  ok(JSON.stringify(got) === JSON.stringify(want), `${tag}: labels ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
  const rects = lay.labels.map((l) => rectAround(l.center, textBox(l.text, l.size)));
  lay.labels.forEach((l, i) => {
    ok(rectInside(rects[i], frame), `${tag}: label "${l.text}" outside the frame`);
    ok(!segs.some((s) => segHitsRect(s, rects[i])), `${tag}: label "${l.text}" touches a line`);
    for (let j = i + 1; j < rects.length; j++) {
      ok(!rectsOverlap(rects[i], rects[j]), `${tag}: labels "${l.text}" and "${lay.labels[j].text}" overlap`);
    }
  });
}
let swept = 0;
const fig = (figure: string, dims: Record<string, number>, extra: Partial<MSGeometryFigureParams> = {}) => {
  for (let variant = 0; variant < 8; variant++) {
    swept++;
    checkLayout({ kind: "MSGeometryFigure", figure: figure as any, dims, variant, ...extra }, `${figure} ${JSON.stringify(dims)} v${variant}`);
  }
};
for (const r1 of [25, 30, 35, 40, 45, 50, 55, 60, 65, 70]) {
  for (const r2 of [25, 30, 35, 40, 45, 50, 55, 60, 70, 80]) fig("exterior-angle", { r1, r2: r1 + r2 >= 175 ? 30 : r2 });
}
for (const a of [30, 35, 40, 45, 50, 55, 60, 65]) {
  for (const b of [40, 45, 50, 55, 60, 70, 75, 80]) fig("aa-similarity", { a, b: a + b >= 150 ? 40 : b });
}
for (const k of [2, 3]) {
  for (let w = 2; w <= 9; w++) for (let h = 2; h <= 9; h++) fig("dilation-area", { w, h, k }, { unit: "cm" });
  for (const b of [4, 6, 8, 10, 12]) for (let h = 3; h <= 9; h++) fig("dilation-area", { b, h, k, tri: 1 }, { unit: "cm" });
}
const RATIOS = [[2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2], [2, 3], [5, 2], [5, 4]];
for (const [num, den] of RATIOS) {
  for (let m = 2; m <= 9; m++) {
    fig("similar-triangles", { base1: den * m, base2: num * m }, { unit: "cm", captions: ["Figure A", "Figure B"] });
    fig("similar-triangles", { base1: den * m, base2: num * m, side1: den * (m + 1) }, { unit: "in.", captions: ["First triangle", "Second triangle"] });
    fig("similar-triangles", { base1: den * m, base2: num * m, area1: 48 }, { unit: "cm", captions: ["Figure A", "Figure B"] });
  }
}

for (const t of TYPES) ok((seen.get(t.name) ?? 0) > 0, `no ${t.name} problems generated`);

console.log(`ms-figures: ${checks} checks, ${failures.length} failures`);
console.log(`  ${swept} swept layouts; ${figures} generated figures: ${TYPES.map((t) => `${t.name} ${seen.get(t.name) ?? 0}`).join(", ")}`);
if (failures.length) {
  for (const f of failures.slice(0, 40)) console.log("  FAIL " + f);
  process.exit(1);
}

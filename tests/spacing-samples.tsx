// spacing-samples.tsx, prints sample worksheets with best-fit spacing so the
// page fitting can be looked at page by page (and compared with --plain).
//
// Run: npx tsx tests/spacing-samples.tsx [outdir] [--plain]
//   --plain   skip fitDocument() (the old flow layout), for before/after
// Then: pdftoppm -r 60 -png <file>.pdf <prefix>

import React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import PdfDocument from "../src/components/PdfDocument";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";
import { DEFAULT_PRESENTATION } from "../src/lib/accommodations";

const args = process.argv.slice(2);
const plain = args.includes("--plain");
const OUT = args.find((a) => !a.startsWith("--")) ?? "/tmp/euclid-spacing";
mkdirSync(OUT, { recursive: true });

/* eslint-disable @typescript-eslint/no-explicit-any */
const entry = (id: string) => {
  const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
  if (!e) throw new Error(`no registry entry ${id}`);
  return e;
};
function problems(ids: [string, number][], seed: number, difficulty = 2) {
  return ids.flatMap(([id, count], i) =>
    entry(id).generate("Test", seed + i * 101, { count, difficulty: difficulty as any }) as any[]);
}
/** One problem: entry, seed, difficulty, index in that batch. */
const pick = (id: string, seed: number, difficulty: number, i: number) =>
  (entry(id).generate("Test", seed, { count: 4, difficulty: difficulty as any }) as any[])[i];

export const SAMPLES: {
  file: string; title: string; docType: string; standard: string;
  problems: () => any[]; mixedOrder?: boolean; presentation?: any;
}[] = [
  {
    // Rebuilt from the teacher's own unit test: proof, markings question,
    // proof, then three short problems, one list with no headings.
    file: "too-hip-to-be-square", title: "Too Hip to be Square", docType: "test",
    standard: "G.6(E) · G.5(A)", mixedOrder: true,
    problems: () => [
      pick("proofs-6-2-parallelograms", 0, 1, 0),
      pick("ch6-classify-quadrilaterals", 0, 1, 0),
      pick("proofs-6-special-parallelograms", 0, 3, 3),
      pick("ch6-special-parallelogram-properties", 1548, 2, 1),
      pick("ch6-1-polygons", 13, 2, 3),
      pick("ch6-parallelogram-properties", 58, 2, 1),
    ],
  },
  {
    file: "geometry-proofs-diagrams", title: "Right Triangles, Circles and Proofs", docType: "worksheet",
    standard: "Geometry  ·  G.9(A), G.9(B), G.12(A), G.6(B)",
    problems: () => problems([["trig-2-sides", 2], ["special-right-triangles", 2], ["anatomy-of-a-circle", 2], ["proofs-4-2-sss-sas", 2]], 7),
  },
  {
    file: "algebra-2-mixed", title: "Algebra II Mixed Review", docType: "worksheet",
    standard: "Algebra II", mixedOrder: true,
    problems: () => problems([["a2-9-4-rational-exponents", 2], ["a2-5-6-quad-equations", 2], ["a2-11-7-rational-word-problems", 2], ["a2-11-3-asymptotes-holes", 2], ["a2-2-4-abs-inequalities-graph", 2]], 7),
  },
  {
    file: "middle-school", title: "Integers, Equations and Figures", docType: "worksheet",
    standard: "Grade 6 and Pre-Algebra",
    problems: () => problems([["ms6-2-2-adding-subtracting-integers", 4], ["ms6-2-4-integer-word-add-subtract", 2], ["ms7-2-2-two-step-equations", 2], ["ms7-3-7-composite-figures", 2], ["ms7-8-1-similar-figures", 2]], 7),
  },
  {
    file: "quick-practice", title: "Order of Operations and Decimals", docType: "worksheet",
    standard: "Grade 6 Math  ·  6.7(A), 6.3(E)",
    problems: () => problems([["ms6-3-7-order-of-operations", 8], ["ms6-1-2-decimal-fluency", 8]], 7),
  },
  {
    file: "large-print", title: "Right Triangles (Large Print)", docType: "worksheet",
    standard: "Geometry  ·  G.9(A), G.9(B)",
    problems: () => problems([["trig-2-sides", 3], ["special-right-triangles", 3]], 7),
    presentation: { ...DEFAULT_PRESENTATION, fontScale: 1.25 },
  },
];

async function main() {
  const fit = plain ? null : (await import("../src/components/pdfFit")).fitDocument;
  for (const s of SAMPLES) {
    const ps = s.problems();
    let el: React.ReactElement = React.createElement(PdfDocument, {
      title: s.title,
      questions: ps.map((p, i) => problemToQuestion(p, i)),
      advancedProblems: ps,
      docType: s.docType,
      standard: s.standard,
      includeAnswerKey: true,
      seed: 7,
      presentation: s.presentation,
      mixedOrder: s.mixedOrder,
    } as any);
    if (fit) el = await fit(el);
    const bytes = await renderToBuffer(el as any);
    writeFileSync(`${OUT}/${s.file}.pdf`, bytes);
    console.log(`${s.file}.pdf  ${ps.length} problems`);
  }
}
if (process.argv[1]?.includes("spacing-samples")) main().catch((e) => { console.error(e); process.exit(1); });

// render-samples.tsx, prints a few real worksheets through PdfDocument so the
// design can be looked at page by page.
//
// Run: npx tsx tests/render-samples.tsx [outdir]   (default /tmp/euclid-samples)
// Then, to look at them: pdftoppm -r 80 -png <file>.pdf <prefix>

import React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import PdfDocument from "../src/components/PdfDocument";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";
import type { OutputMode } from "../src/lib/ProblemFactory";
import { DEFAULT_PRESENTATION } from "../src/lib/accommodations";

const OUT = process.argv[2] ?? "/tmp/euclid-samples";
mkdirSync(OUT, { recursive: true });

/* eslint-disable @typescript-eslint/no-explicit-any */
function problems(ids: [string, number][], mode: OutputMode, seed: number, difficulty = 2) {
  const out: any[] = [];
  ids.forEach(([id, count], i) => {
    const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
    if (!e) throw new Error(`no registry entry ${id}`);
    out.push(...(e.generate(mode, seed + i * 101, { count, difficulty: difficulty as any }) as any[]));
  });
  return out;
}

const SAMPLES: {
  file: string; title: string; docType: string; mode: OutputMode; standard: string;
  ids: [string, number][]; presentation?: any;
}[] = [
  {
    file: "engine-1-geometry-worksheet", title: "Right Triangles and Circles", docType: "worksheet", mode: "Test",
    standard: "Geometry  ·  G.9(A), G.9(B), G.12(A)",
    ids: [["trig-2-sides", 2], ["special-right-triangles", 2], ["anatomy-of-a-circle", 2], ["ch7-1-distance-midpoint", 2]],
  },
  {
    file: "engine-2-algebra-2-test", title: "Rational and Radical Expressions", docType: "test", mode: "Test",
    standard: "Algebra II  ·  2A.7(F), 2A.7(G), 2A.6(I)",
    ids: [["a2-11-1-simplify", 2], ["a2-11-2-mult-div", 2], ["a2-9-1-roots-radicals", 2], ["a2-9-4-rational-exponents", 2], ["a2-6-7-radical-extraneous", 2]],
  },
  {
    file: "engine-3-proofs", title: "Triangle Congruence Proofs", docType: "proof-fill-reasons", mode: "Test",
    standard: "Geometry  ·  G.6(B)",
    ids: [["proofs-4-2-sss-sas", 3]],
  },
  {
    file: "engine-4-precalc-and-sat", title: "Multiple Choice Practice", docType: "test", mode: "Test",
    standard: "AP Precalculus  ·  SAT Math",
    ids: [["precalc-trig", 4], ["sat-pam-quadratics", 4]],
  },
  {
    file: "engine-5-large-print", title: "Right Triangles (Large Print)", docType: "worksheet", mode: "Test",
    standard: "Geometry  ·  G.9(A)",
    ids: [["trig-2-sides", 3], ["special-right-triangles", 2]],
    presentation: { ...DEFAULT_PRESENTATION, fontScale: 1.25, maxProblemsPerPage: 2 },
  },
];

async function main() {
  for (const s of SAMPLES) {
    const ps = problems(s.ids, s.mode, 7);
    const el = React.createElement(PdfDocument, {
      title: s.title,
      questions: ps.map((p, i) => problemToQuestion(p, i)),
      advancedProblems: ps,
      docType: s.docType,
      standard: s.standard,
      includeAnswerKey: true,
      seed: 7,
      presentation: s.presentation,
    } as any);
    const bytes = await renderToBuffer(el as any);
    writeFileSync(`${OUT}/${s.file}.pdf`, bytes);
    console.log(`${s.file}.pdf  ${bytes.length} bytes, ${ps.length} problems`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

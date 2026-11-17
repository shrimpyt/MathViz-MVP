// pdf-preview.tsx, checks the Review step's PDF preview pipeline.
//
// The preview builds the worksheet with @react-pdf (the same element Export
// downloads) and draws each page with pdf.js. This runs that same pipeline
// in Node on a few real worksheets, including the middle-school figures that
// the old HTML preview cut off, and checks that:
//   • pdf.js reads every file and draws every page at US Letter size,
//   • each drawn page has ink on it (no blank pages),
//   • the page count the preview shows equals the file's own page count.
// With an outdir it also saves the drawn pages, which are exactly what the
// preview shows on screen.
//
// Run: npx tsx tests/pdf-preview.tsx [outdir]

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { mkdirSync, writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import PdfDocument from "../src/components/PdfDocument";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";

const OUT = process.argv[2];
if (OUT) mkdirSync(OUT, { recursive: true });

let checks = 0;
const failures: string[] = [];
const ok = (cond: boolean, msg: string) => {
  checks++;
  if (!cond) failures.push(msg);
};

function problems(ids: [string, number][], mode: any, seed: number) {
  const out: any[] = [];
  ids.forEach(([id, count], i) => {
    const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
    if (!e) throw new Error(`no registry entry ${id}`);
    out.push(...(e.generate(mode, seed + i * 101, { count, difficulty: 2 } as any) as any[]));
  });
  return out;
}

const SHEETS: { name: string; title: string; docType: string; mode: string; ids: [string, number][]; key: boolean; watermark: boolean }[] = [
  { name: "grade8-angles", title: "Angle Relationships & Similar Triangles, Practice", docType: "review", mode: "Review",
    ids: [["ms8-14-angle-relationships", 12]], key: false, watermark: true },
  { name: "similar-figures-dilations", title: "Similar Figures and Dilations", docType: "worksheet", mode: "Test",
    ids: [["ms7-8-1-similar-figures", 6], ["ms8-15-dilations", 6]], key: true, watermark: false },
  { name: "geometry-mixed", title: "Right Triangles and Circles", docType: "worksheet", mode: "Test",
    ids: [["trig-2-sides", 2], ["special-right-triangles", 2], ["anatomy-of-a-circle", 2], ["ch7-1-distance-midpoint", 2]], key: true, watermark: false },
];

const RENDER_SCALE = 2; // same as src/components/PdfPagePreview.tsx
const LETTER = { w: 612 * RENDER_SCALE, h: 792 * RENDER_SCALE };

async function main() {
  for (const s of SHEETS) {
    const ps = problems(s.ids, s.mode, 42);
    const el = React.createElement(PdfDocument, {
      title: s.title,
      questions: ps.map((p, i) => problemToQuestion(p, i)),
      advancedProblems: ps,
      docType: s.docType,
      standard: "Sample",
      includeAnswerKey: s.key,
      seed: 42,
      watermark: s.watermark,
    } as any);
    const t0 = Date.now();
    const bytes = await renderToBuffer(el as any);
    const buildMs = Date.now() - t0;
    const fileText = Buffer.from(bytes).toString("latin1");
    const filePages = (fileText.match(/\/Type\s*\/Page[^s]/g) ?? []).length;

    const t1 = Date.now();
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes), disableWorker: true } as any);
    const doc = await task.promise;
    ok(doc.numPages === filePages, `${s.name}: preview shows ${doc.numPages} pages, file has ${filePages}`);
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas: canvas as any, canvasContext: ctx as any, viewport }).promise;
      ok(canvas.width === LETTER.w && canvas.height === LETTER.h, `${s.name} p${n}: ${canvas.width}x${canvas.height}, not Letter`);
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < px.length; i += 16) if (px[i] < 200 || px[i + 1] < 200 || px[i + 2] < 200) ink++;
      ok(ink > 500, `${s.name} p${n}: page looks blank (${ink} inked samples)`);
      if (OUT) writeFileSync(`${OUT}/${s.name}-page-${n}.png`, canvas.toBuffer("image/png"));
    }
    const drawMs = Date.now() - t1;
    await task.destroy();
    if (OUT) writeFileSync(`${OUT}/${s.name}.pdf`, bytes);
    console.log(`  ${s.name}: ${doc.numPages} pages, build ${buildMs} ms, draw ${drawMs} ms`);
  }
  console.log(`pdf-preview: ${checks} checks, ${failures.length} failures`);
  if (failures.length) {
    failures.forEach((f) => console.log("  FAIL " + f));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

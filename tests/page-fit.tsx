// page-fit.tsx, checks for best-fit worksheet spacing.
//   1. workSpaceFor() sizes room by problem kind.
//   2. planPages() packs rows: never over a page, only moves a problem when
//      that saves a page, never across sections, spreads leftover space.
//   3. Real PDFs: fitDocument() prints exactly the planned pages, every
//      problem once, numbered in order, with the answer key in the same order.
//
// Run: npx tsx tests/page-fit.tsx

import React from "react";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document, pdf, renderToBuffer } from "@react-pdf/renderer";
import PdfDocument, { PdfVersionPages } from "../src/components/PdfDocument";
import { FitContext, fitDocument, inputsFromLayout, planDocument } from "../src/components/pdfFit";
import { planPages, SAFETY, STRETCH_MAX, type FitInput } from "../src/lib/pageFit";
import { workSpaceFor } from "../src/lib/workSpace";
import { problemToQuestion } from "../src/core/types";
import { DEFAULT_PRESENTATION } from "../src/lib/accommodations";
import { SAMPLES } from "./spacing-samples";

/* eslint-disable @typescript-eslint/no-explicit-any */
let pass = 0;
const fails: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fails.push(`${name}${detail ? `: ${detail}` : ""}`);
}

// ── 1. Work space by kind ───────────────────────────────────────────────────
{
  const std = (steps: number, text = "Find x.", extra: any = {}) =>
    workSpaceFor({ problem: { type: "A2.5", steps: Array(steps).fill({}) } as any, text, hasDiagram: false, docType: "worksheet", ...extra });
  check("proof has its own table", workSpaceFor({ problem: { type: "Proof" } as any, text: "", hasDiagram: true, docType: "worksheet" }).room === 0);
  check("FRQ has its own lines", workSpaceFor({ problem: { type: "AP_FRQ" } as any, text: "", hasDiagram: false, docType: "test" }).room === 0);
  const mcq = workSpaceFor({ problem: { type: "PRECALC_MCQ" } as any, text: "x", hasDiagram: false, docType: "test" }).room;
  check("multiple choice gets a little room", mcq > 0 && mcq < std(1).room);
  check("more steps, more room", std(1).room < std(2).room && std(2).room < std(3).room && std(3).room < std(5).room);
  check("word problem gets more", std(2, "x".repeat(200)).room > std(2).room);
  check("graph with no grid gets room to sketch", std(2, "Graph y = 2x + 1.").room > std(2).room + 40);
  const withFig = std(3, "Find x.", { hasDiagram: true });
  check("diagram problem needs less room under it", withFig.room < std(3).room && withFig.room > 0);
  check("diagram beside text: room is beside it", std(3, "Find x.", { hasDiagram: true, diagramBeside: true }).room === 0);
  check("diagram problem still grows into spare space", withFig.grow === std(3).room);
}

// ── 2. Planner ──────────────────────────────────────────────────────────────
const H = (h: number, sec = 0, ws = 0) => ({ h, ws, full: false, sec });
const F = (h: number, sec = 0, ws = 0) => ({ h, ws, full: true, sec });
const base = (items: any[], extra: Partial<FitInput> = {}): FitInput => ({
  capacity: 694.8, first: 110, headings: [0, 30, 30], rule: 0.6, grid: true, items, ...extra,
});
const fills = (inp: FitInput, plan: ReturnType<typeof planPages>) => {
  const out: number[] = [];
  let page = -1;
  for (const row of plan.rows) {
    if (row.breakBefore || page < 0) { page++; out.push(page === 0 ? inp.first : 0); }
    out[page] += row.body + row.extra + (row.firstInSection ? inp.headings[row.sec] ?? 0 : inp.rule);
  }
  return out;
};
const order = (plan: ReturnType<typeof planPages>) => plan.rows.flatMap((r) => r.items);

{
  // The teacher's case: proof, tall half, proof, three halves. The old layout
  // left the half alone in its row and took 4 pages.
  const inp = base([F(410), H(300), F(500), H(260), H(250), H(250)]);
  const plan = planPages(inp);
  check("teacher case: 3 pages", plan.pages === 3, `got ${plan.pages}`);
  check("teacher case: reordered", plan.reordered);
  check("teacher case: half problems pair up", plan.rows.every((r) => r.items.length === 2 || inp.items[r.items[0]].full));
  check("teacher case: every problem once", order(plan).slice().sort().join() === "0,1,2,3,4,5");
  const f = fills(inp, plan);
  check("teacher case: no page over", f.every((x) => x <= inp.capacity - SAFETY + 0.01), f.join(","));
}
{
  // Nothing to gain: order stays exactly as generated.
  const inp = base([H(100, 0, 40), H(100, 0, 40), H(100, 0, 40), H(100, 0, 40)]);
  const plan = planPages(inp);
  check("no gain, no move", !plan.reordered && order(plan).join() === "0,1,2,3");
  check("one page", plan.pages === 1);
  check("spare space becomes work room", plan.rows.every((r) => r.extra > 0));
  check("work room stretch is capped", plan.rows.every((r) => r.extra <= Math.min(40 * 1.5, STRETCH_MAX)));
}
{
  // Problems never move between sections.
  const items = [F(400, 1), H(250, 1), F(450, 1), H(250, 1), H(300, 2), H(120, 2), F(300, 2), H(120, 2)];
  const plan = planPages(base(items));
  const secs = plan.rows.map((r) => r.sec);
  check("sections stay in order", secs.every((s, i) => i === 0 || s >= secs[i - 1]), secs.join());
  check("rows keep one section", plan.rows.every((r) => r.items.every((i) => items[i].sec === r.sec)));
  check("one heading per section", plan.rows.filter((r) => r.firstInSection).length === 2);
  const f = fills(base(items), plan);
  check("sections: no page over", f.every((x) => x <= 694.8 - SAFETY + 0.01), f.join(","));
}
{
  // A light last page: spreading evens out the pages.
  const items = Array.from({ length: 14 }, () => H(80, 0, 66));
  const inp = base(items);
  const plan = planPages(inp);
  const f = fills(inp, plan).map((x, p) => x / (inp.capacity - SAFETY - (p === 0 ? inp.first : 0)));
  check("no nearly empty last page", f[f.length - 1] > 0.5, f.map((x) => x.toFixed(2)).join(","));
}
{
  // Fewer-per-page accommodation: exactly K problems a page, never moved.
  const inp = base([F(200), F(150), F(200), F(150), F(200)], { grid: false, perPage: 2 });
  const plan = planPages(inp);
  check("fewer per page: 3 pages", plan.pages === 3);
  check("fewer per page: order kept", !plan.reordered);
  check("fewer per page: breaks every 2", plan.rows.map((r) => r.breakBefore).join() === "false,false,true,false,true");
}
{
  // Fewer-per-page is a most-per-page: when 3 don't fit, start a page sooner
  // instead of letting the third spill onto a page alone.
  const inp = base([F(260), F(260), F(260), F(260), F(260), F(260)], { grid: false, perPage: 3 });
  const plan = planPages(inp);
  const f = fills(inp, plan);
  check("most per page: no page over", f.every((x) => x <= inp.capacity - SAFETY + 0.01), f.join(","));
  check("most per page: 2 a page when 3 won't fit", plan.pages === 3, String(plan.pages));
}
{
  // A row taller than a page gets a page of its own; nothing else breaks.
  const inp = base([F(900), H(100), H(100)]);
  const plan = planPages(inp);
  check("oversized row alone", plan.rows[1].breakBefore && plan.pages === 2);
}

// ── 3. Real PDFs ────────────────────────────────────────────────────────────
function pdfText(bytes: Uint8Array): string[] | null {
  try {
    const dir = mkdtempSync(join(tmpdir(), "fit-"));
    const f = join(dir, "x.pdf");
    writeFileSync(f, bytes);
    return execFileSync("pdftotext", ["-raw", f, "-"], { encoding: "utf8" }).split("\f");
  } catch {
    return null; // pdftotext not installed: page counts are still checked
  }
}

async function layoutPages(el: React.ReactElement): Promise<number> {
  let layout: any = null;
  const inst = pdf(el as any);
  const node = (inst as any).container.document;
  node.props = { ...node.props, onRender: (p: any) => (layout = p._INTERNAL__LAYOUT__DATA_) };
  await inst.toBuffer();
  return layout?.children?.length ?? -1;
}

async function main() {
  for (const s of SAMPLES) {
    const ps = s.problems();
    const props = {
      title: s.title, questions: ps.map((p: any, i: number) => problemToQuestion(p, i)), advancedProblems: ps,
      docType: s.docType, standard: s.standard, includeAnswerKey: true, seed: 7,
      presentation: s.presentation, mixedOrder: s.mixedOrder,
    } as any;
    const doc = React.createElement(PdfDocument, props);
    const plans = await planDocument(doc);
    check(`${s.file}: planned`, !!plans && plans.size === 1);
    if (!plans) continue;
    const plan = [...plans.values()][0];
    const fitted = await fitDocument(doc);
    const plainPages = await layoutPages(doc);
    const fitPages = await layoutPages(fitted);
    // Problem pages are the planned ones; the key follows on its own page(s).
    const keyPages = plainPages - (await layoutPages(React.createElement(PdfDocument, { ...props, includeAnswerKey: false })));
    check(`${s.file}: prints the planned pages`, fitPages === plan.pages + keyPages, `layout ${fitPages}, plan ${plan.pages} + key ${keyPages}`);
    check(`${s.file}: never more pages than before`, fitPages <= plainPages, `${fitPages} > ${plainPages}`);
    if (s.file === "too-hip-to-be-square") {
      // The teacher's own test: problem 2 sat alone on a page; best fit moves
      // a later half-width problem up beside it and saves a page.
      check("too hip: reordered", plan.reordered);
      check("too hip: one page fewer", fitPages === plainPages - 1, `${plainPages} -> ${fitPages}`);
    }

    const text = pdfText(await renderToBuffer(fitted as any));
    if (text) {
      const n = ps.length;
      const keyStart = text.findIndex((t) => t.includes("ANSWER KEY"));
      const body = text.slice(0, keyStart).join("\n");
      // Walk the text for "1.", "2.", ... in turn (a wrapped line of problem
      // text can also start with a number, so only the next one counts).
      let next = 1;
      for (const m of body.matchAll(/^(\d{1,2})\.\s/gm)) if (Number(m[1]) === next) next++;
      check(`${s.file}: problems print 1..${n} in order`, next === n + 1, `stopped at ${next}`);
      // The key follows the printed order: answer k in the fitted key is the
      // answer the plain key gave the problem that now prints as number k.
      const plainText = pdfText(await renderToBuffer(doc as any));
      const keyOf = (pages: string[]) => {
        const t = pages.slice(pages.findIndex((x) => x.includes("ANSWER KEY"))).join("\n");
        const out: string[] = [];
        let k = 1;
        for (const m of t.matchAll(/^(\d{1,2})\.\s(.*)$/gm)) if (Number(m[1]) === k) { out.push(m[2].trim()); k++; }
        return out;
      };
      const fitKey = keyOf(text);
      const plainKey = plainText ? keyOf(plainText) : [];
      const printed = plan.rows.flatMap((r) => r.items);
      check(`${s.file}: key numbered 1..${n}`, fitKey.length === n, String(fitKey.length));
      check(`${s.file}: key follows print order`, plainKey.length === n && printed.every((orig, k) => fitKey[k] === plainKey[orig]),
        printed.map((orig, k) => `${k + 1}:${fitKey[k]}|${plainKey[orig]}`).filter((x) => x.split(":")[1].split("|")[0] !== x.split("|")[1]).join("; "));
    }
  }

  // Accommodated export: two versions in one document each get their own plan.
  {
    const s = SAMPLES.find((x) => x.file === "middle-school")!;
    const ps = s.problems();
    const common = { questions: ps.map((p: any, i: number) => problemToQuestion(p, i)), advancedProblems: ps, docType: s.docType, standard: s.standard, includeAnswerKey: true };
    const doc = (
      <Document>
        <PdfVersionPages {...common} title="Base" />
        <PdfVersionPages {...common} title="Base, Group A" presentation={{ ...DEFAULT_PRESENTATION, fontScale: 1.25, maxProblemsPerPage: 2 }} />
      </Document>
    );
    const plans = await planDocument(doc);
    check("two versions, two plans", plans?.size === 2, String(plans?.size));
    const capped = [...(plans?.values() ?? [])].find((p) => p.rows.length === ps.length && p.rows.some((r) => r.breakBefore));
    const perPage: number[] = [];
    capped?.rows.forEach((r, k) => { if (k === 0 || r.breakBefore) perPage.push(0); perPage[perPage.length - 1] += r.items.length; });
    check("fewer-per-page version: at most 2 a page", !!capped && perPage.every((c) => c <= 2) && capped.pages >= Math.ceil(ps.length / 2), perPage.join());
  }

  // The measuring pass reads every problem.
  {
    const s = SAMPLES[0];
    const ps = s.problems();
    let layout: any = null;
    const el = (
      <FitContext.Provider value={{ mode: "measure" }}>
        {React.createElement(PdfDocument, { title: s.title, questions: ps.map((p: any, i: number) => problemToQuestion(p, i)), advancedProblems: ps, docType: s.docType, mixedOrder: true } as any)}
      </FitContext.Provider>
    );
    const inst = pdf(el as any);
    const node = (inst as any).container.document;
    node.props = { ...node.props, onRender: (p: any) => (layout = p._INTERNAL__LAYOUT__DATA_) };
    await inst.toBuffer();
    const inp = [...inputsFromLayout(layout).values()][0];
    check("measured every problem", !!inp && inp.items.length === ps.length && inp.items.every((it) => it.h > 20), inp?.items.map((x) => x.h.toFixed(0)).join());
    check("measured the header", !!inp && inp.first > 50);
  }

  console.log(`page-fit: ${pass} passed, ${fails.length} failed`);
  for (const f of fails) console.log("  FAIL " + f);
  process.exit(fails.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });

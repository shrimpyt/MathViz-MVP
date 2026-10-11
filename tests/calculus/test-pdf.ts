// test-pdf.ts
// PDF byte verification for the calculus diagram duality.
//
// Renders real PDF bytes through @react-pdf/renderer using ONLY the new
// calculus components (CalcGraphPdf, CalcTablePdf) with graph params sampled
// from actual generated problems — never hand-built shapes. Asserts the
// buffer is a plausible PDF (%PDF header, non-trivial size). Also asserts
// pdfSafeText output never contains ≅ (the one glyph DejaVu Serif lacks).

import React from "react";
import { renderToBuffer, Document, Page, Text } from "@react-pdf/renderer";
import { mulberry32 } from "@/lib/math-utils";
import { CALCULUS_ENTRIES } from "@/modules/calculus";
import type { CalcGraphParams, CalcMCQProblem, CalculusProblem } from "@/lib/factories/CalculusUtils";
import { CalcGraphPdf, CalcTablePdf } from "@/components/diagrams/CalculusGraphs";
import { pdfSafeText } from "@/lib/answerKey";
import { reset, check, stats } from "./harness";

function collectStrings(p: CalcMCQProblem, out: string[]): void {
  out.push(p.prompt, p.answer, ...p.choices);
  for (const s of p.steps ?? []) {
    out.push(s.instruction);
    for (const b of s.blanks ?? []) out.push(b.label, b.answer);
  }
  if (p.table) {
    out.push(...p.table.headers);
    for (const r of p.table.rows) out.push(...r);
  }
}

export function runPdf(): Promise<void> {
  reset();
  const graphs: CalcGraphParams[] = [];
  const strings: string[] = [];
  let tableSample: { headers: string[]; rows: string[][]; caption?: string } | null = null;

  for (const entry of CALCULUS_ENTRIES) {
    const problems = entry.generate("Review", 4242, { count: 12, difficulty: 3 }) as unknown as CalculusProblem[];
    for (const p of problems) {
      if (p.type === "CALC_MCQ") {
        if (p.graph && graphs.length < 24) graphs.push(p.graph);
        collectStrings(p, strings);
      } else {
        const st = p.stimulus;
        if (st.kind === "table" && !tableSample) {
          tableSample = { headers: st.headers, rows: st.rows, caption: st.caption };
        }
      }
    }
  }
  check(graphs.length > 0, `pdf: collected ${graphs.length} graph params from real problems`);

  // every user-facing string survives pdfSafeText without the missing glyph
  for (const s of strings) {
    const safe = pdfSafeText(s);
    check(!safe.includes("≅"), `pdf: no ≅ in "${s.slice(0, 40)}"`);
  }

  // render each graph to real PDF bytes
  const renderOne = async (g: CalcGraphParams, i: number): Promise<void> => {
    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "LETTER", style: { padding: 24 } },
        React.createElement(Text, { style: { fontSize: 10 } }, `calc-graph-${i}`),
        React.createElement(CalcGraphPdf, { params: g })
      )
    );
    const bytes = new Uint8Array(await renderToBuffer(doc));
    check(bytes.length > 800, `pdf: graph ${i} buffer size ${bytes.length}`);
    check(Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "%PDF", `pdf: graph ${i} has %PDF header`);
  };

  const jobs: Promise<void>[] = graphs.map((g, i) => renderOne(g, i));
  if (tableSample) {
    const ts = tableSample;
    jobs.push(
      (async () => {
        const doc = React.createElement(
          Document,
          null,
          React.createElement(
            Page,
            { size: "LETTER", style: { padding: 24 } },
            React.createElement(CalcTablePdf, { headers: ts.headers, rows: ts.rows, caption: ts.caption })
          )
        );
        const bytes = new Uint8Array(await renderToBuffer(doc));
        check(bytes.length > 800, `pdf: table buffer size ${bytes.length}`);
        check(Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "%PDF", "pdf: table has %PDF header");
      })()
    );
  }
  return Promise.all(jobs).then(() => undefined);
}

// standalone
if (require.main === module) {
  runPdf()
    .then(() => {
      const s = stats();
      console.log(`pdf: ${s.checks} checks, ${s.failures.length} failures`);
      for (const f of s.failures.slice(0, 20)) console.log("  FAIL:", f);
      process.exit(s.failures.length > 0 ? 1 : 0);
    })
    .catch((e) => {
      console.log("pdf: FATAL", (e as Error).message);
      process.exit(1);
    });
}

// run-pdf.ts
// PDF byte verification: render a standalone @react-pdf document containing
// one of each Algebra 2 diagram kind plus PDF-safe answer text. Asserts the
// output is non-trivially sized and byte-deterministic across runs, and that
// every lesson's sample answers survive pdfSafeText.

import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { WIRED_LESSONS } from "../../src/modules/algebra-2";
import type { Algebra2Problem } from "../../src/lib/factories/Algebra2Types";
import { pdfSafeText, latexToText } from "../../src/lib/answerKey";
import { Algebra2PdfSVG } from "../../src/components/diagrams/Algebra2PdfDiagrams";
import { check, section, report } from "./harness";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Times-Roman" },
  title: { fontSize: 16, marginBottom: 12 },
  line: { fontSize: 10, marginBottom: 6 },
  row: { flexDirection: "row", marginBottom: 10 },
});

function SampleDoc({ items }: { items: { label: string; params?: Algebra2Problem["svgParams"]; answer: string }[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Algebra 2 diagram samples"),
      ...items.map((it, i) =>
        React.createElement(
          View,
          { key: i, style: styles.row },
          it.params ? React.createElement(Algebra2PdfSVG, { params: it.params }) : null,
          React.createElement(Text, { style: styles.line }, `${it.label}: ${it.answer}`)
        )
      )
    )
  );
}

async function main() {
  section("pdf/diagrams");
  const items: { label: string; params?: Algebra2Problem["svgParams"]; answer: string }[] = [];
  const seenKinds = new Set<string>();
  // one sample per diagram kind + a spread of answer strings
  for (const lesson of WIRED_LESSONS.filter((l) => !l.proofs)) {
    const set = lesson.generate("Review", 31337, { count: 6, difficulty: 3 }) as Algebra2Problem[];
    for (const p of set) {
      if (p.svgParams && !seenKinds.has(p.svgParams.kind)) {
        seenKinds.add(p.svgParams.kind);
        items.push({ label: `${lesson.id}/${p.subtype}`, params: p.svgParams, answer: pdfSafeText(p.answer) });
      }
      // pdf-safety on every sample answer
      try {
        const safe = pdfSafeText(p.answer);
        check(!safe.includes("≅"), `${lesson.id}/${p.subtype}: no missing glyphs`);
        check(latexToText(p.answer).length > 0 || p.answer === "", `${lesson.id}/${p.subtype}: text converts`);
      } catch (e) {
        check(false, `${lesson.id}/${p.subtype}: pdfSafeText threw`);
      }
    }
  }
  check(seenKinds.has("ConicGraph"), "ConicGraph diagram sampled");
  check(seenKinds.has("RationalGraph"), "RationalGraph diagram sampled");

  section("pdf/bytes");
  const doc = React.createElement(SampleDoc, { items }) as unknown as never;
  const toBytes = async (element: unknown): Promise<Buffer> => {
    // @react-pdf/renderer v4: toBuffer() resolves to a readable file stream
    const stream = (await pdf(element as never).toBuffer()) as unknown as AsyncIterable<Uint8Array>;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  };
  const b1 = await toBytes(doc);
  const b2 = await toBytes(React.createElement(SampleDoc, { items }));
  check(b1.length > 3000, `pdf bytes non-trivial (${b1.length})`);
  // PDFs embed a CreationDate timestamp and a random trailer ID; normalize both.
  const norm = (b: Buffer) =>
    b.toString("latin1")
      .replace(/\(D:\d{14}Z\)/g, "(D:TS)")
      .replace(/\/ID\s*\[<[0-9a-f]+>\s*<[0-9a-f]+>\]/g, "/ID [<ID> <ID>]");
  check(norm(b1) === norm(b2), "pdf bytes deterministic across runs (modulo timestamp/ID)");
  check(b1.subarray(0, 5).toString() === "%PDF-", "pdf magic header");

  report("run-pdf");
}

main().catch((e) => {
  console.error("run-pdf crashed:", e);
  process.exit(1);
});

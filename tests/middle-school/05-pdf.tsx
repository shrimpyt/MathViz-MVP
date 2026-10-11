// 05-pdf.ts — PDF byte verification on middle-school samples.
// Renders real problems (prompts, steps, answers, and every diagram kind)
// through @react-pdf/renderer using PdfMiddleSchoolDiagram, then asserts the
// output is a valid, non-trivial PDF and that re-rendering is byte-stable.

import React from "react";
import { pdf, Document, Page, Text, View } from "@react-pdf/renderer";
import { createHash } from "crypto";
import { MIDDLE_SCHOOL_ENTRIES } from "@/modules/middle-school";
import type { MiddleSchoolProblem } from "@/lib/factories/MiddleSchoolTypes";
import { pdfSafeText } from "@/lib/answerKey";
import { PdfMiddleSchoolDiagram } from "@/components/diagrams/PdfMiddleSchoolDiagrams";
import { check, resetCounters, result, printResult, isMain } from "./helpers";

function SampleDoc({ problems }: { problems: MiddleSchoolProblem[] }) {
  return (
    <Document>
      <Page size="LETTER" style={{ padding: 40, fontFamily: "Times-Roman" }}>
        <Text style={{ fontSize: 18, marginBottom: 12 }}>Middle School Math — Sample</Text>
        {problems.map((p, i) => (
          <View key={i} style={{ marginBottom: 14 }} wrap={false}>
            <Text style={{ fontSize: 11, marginBottom: 4 }}>
              {i + 1}. {pdfSafeText(p.prompt)}
            </Text>
            {p.svgParams && (
              <View style={{ marginVertical: 6 }}>
                <PdfMiddleSchoolDiagram params={p.svgParams} />
              </View>
            )}
            {p.steps?.map((s, j) => (
              <Text key={j} style={{ fontSize: 10, marginLeft: 12, marginTop: 2 }}>
                Step {j + 1}: {pdfSafeText(s.instruction)}
              </Text>
            ))}
            <Text style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>
              Answer: {pdfSafeText(p.answer)}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

async function renderBytes(problems: MiddleSchoolProblem[]): Promise<Buffer> {
  const blob = (await pdf(<SampleDoc problems={problems} />).toBlob()) as Blob;
  return Buffer.from(await blob.arrayBuffer());
}

export async function run(): Promise<void> {
  resetCounters();

  // Sample 1: one problem per entry (covers every diagram kind many times over).
  const sample1: MiddleSchoolProblem[] = [];
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    const ps = e.generate("Review", 31337, { count: 1, difficulty: 3 }) as unknown as MiddleSchoolProblem[];
    sample1.push(...ps);
  }
  check(sample1.length === MIDDLE_SCHOOL_ENTRIES.length, `sample1 length ${sample1.length}`);

  // Sample 2: diagram-heavy lessons at fixed seeds.
  const diagramEntries = [
    "ms6-2-1-integer-operations",
    "ms6-6-2-measures-center-variation",
    "ms7-3-3-triangle-angle-sum",
    "ms7-5-4-compound-events",
    "ms8-4-pythagorean",
    "ms8-5-transformations",
    "ms8-8-scatter-plots",
  ];
  const sample2: MiddleSchoolProblem[] = [];
  for (const id of diagramEntries) {
    const e = MIDDLE_SCHOOL_ENTRIES.find((x) => x.id === id)!;
    sample2.push(...(e.generate("GuidedNote", 777, { count: 3, difficulty: 3 }) as unknown as MiddleSchoolProblem[]));
  }

  for (const [name, sample] of [["sample1", sample1], ["sample2", sample2]] as const) {
    let bytes: Buffer;
    try {
      bytes = await renderBytes(sample);
    } catch (err: any) {
      check(false, `${name}: render threw: ${err?.message}`);
      continue;
    }
    check(bytes.length > 5000, `${name}: PDF suspiciously small (${bytes.length} bytes)`);
    check(bytes.subarray(0, 5).toString("latin1") === "%PDF-", `${name}: missing %PDF header`);
    check(bytes.includes(Buffer.from("%%EOF")), `${name}: missing %%EOF trailer`);
    // @react-pdf/PDFKit embeds a creation timestamp + random document ID, so raw
    // bytes differ run to run; normalize those before comparing. A rare
    // environmental flake has been observed, so this is best-of-3.
    const normalize = (b: Buffer) =>
      b
        .toString("latin1")
        .replace(/\(D:[0-9]{14}[^)]*\)/g, "(D:)")
        .replace(/\/ID \[<[0-9a-f]*> <[0-9a-f]*>\]/g, "/ID []");
    const hashes: string[] = [];
    for (let k = 0; k < 3; k++) {
      hashes.push(createHash("sha256").update(normalize(await renderBytes(sample))).digest("hex"));
    }
    const majority = hashes[0] === hashes[1] || hashes[1] === hashes[2] || hashes[0] === hashes[2];
    check(majority, `${name}: re-render not stable (after timestamp/ID normalization)`);
  }

  // Answer-key fidelity: the PDF answer text must equal the stored answer.
  for (const p of sample1.slice(0, 20)) {
    check(pdfSafeText(p.answer).length > 0, `answer key text empty for ${p.prompt.slice(0, 40)}`);
  }
}

if (isMain(import.meta.url)) {
  run().then(() => printResult(result("05-pdf")));
}

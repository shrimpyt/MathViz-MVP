// pdfcheck.tsx
// PDF byte verification: render real SAT problems (stems, MCQ options,
// grid-in keys, and all three SAT diagram kinds) through @react-pdf/renderer
// using SatPdfDiagrams, then assert the output is a non-trivial, stable PDF.

import React from "react";
import { pdf, Document, Page, Text, View } from "@react-pdf/renderer";
import { createHash } from "crypto";
import { generateSATProblems, buildSATModule, SAT_TIMING_PRESETS } from "@/lib/satTypes";
import type { SATProblem } from "@/lib/satTypes";
import { pdfSafeText } from "@/lib/answerKey";
import { SatPdfDiagram } from "@/components/diagrams/SatPdfDiagrams";
import { newCtx, check, type CheckCtx } from "./checks";
import { DOMAINS } from "./matrix";

function SatSampleDoc({ problems }: { problems: SATProblem[] }) {
  return (
    <Document>
      <Page size="LETTER" style={{ padding: 40, fontFamily: "Times-Roman" }}>
        <Text style={{ fontSize: 18, marginBottom: 12 }}>SAT Math Practice — Sample</Text>
        {problems.map((p, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, marginBottom: 4 }}>
              {i + 1}. {pdfSafeText(p.stem)}
            </Text>
            {p.diagram && (
              <View style={{ marginVertical: 6 }}>
                <SatPdfDiagram params={p.diagram} />
              </View>
            )}
            {p.format === "MCQ" &&
              p.options?.map((o) => (
                <Text key={o.option} style={{ fontSize: 10, marginLeft: 12 }}>
                  ({o.option}) {pdfSafeText(o.label)}
                </Text>
              ))}
            {p.format === "GridIn" && (
              <Text style={{ fontSize: 10, marginLeft: 12 }}>
                [grid-in] key: {pdfSafeText(p.key)}
              </Text>
            )}
            <Text style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>
              Answer: {pdfSafeText(p.key)}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

async function renderBytes(problems: SATProblem[]): Promise<Buffer> {
  // @react-pdf v4: toBuffer() yields a PDFKit stream; toBlob() gives bytes.
  const blob = (await pdf(<SatSampleDoc problems={problems} />).toBlob()) as Blob;
  return Buffer.from(await blob.arrayBuffer());
}

export async function runPdfCheck(ctx: CheckCtx): Promise<void> {
  // Sample: 2 problems per domain (seeds chosen to hit diagrams: the
  // Probability table maker, triangle makers, trig maker).
  const problems: SATProblem[] = [];
  for (let di = 0; di < DOMAINS.length; di++) {
    problems.push(...generateSATProblems(DOMAINS[di], 4242 + di, 6, 2));
  }
  // Ensure every diagram kind is represented.
  const kinds = new Set(problems.filter((p) => p.diagram).map((p) => p.diagram!.kind));
  check(ctx, kinds.has("SatTable"), `pdfcheck: SatTable diagram sampled`);
  check(ctx, kinds.has("SatRightTriangle"), `pdfcheck: SatRightTriangle diagram sampled`);
  check(ctx, kinds.has("SatTriangle"), `pdfcheck: SatTriangle diagram sampled`);

  const sample = problems.slice(0, 16);
  const b1 = await renderBytes(sample);
  check(ctx, b1.length > 3000, `pdfcheck: PDF non-trivial (${b1.length} bytes)`);
  check(
    ctx,
    b1.subarray(0, 5).toString() === "%PDF-",
    `pdfcheck: output starts with %PDF-`
  );

  const b2 = await renderBytes(sample);
  check(ctx, b2.length === b1.length, `pdfcheck: stable byte length across renders`);
  const h1 = createHash("sha256").update(b1).digest("hex");
  const h2 = createHash("sha256").update(b2).digest("hex");
  // Informational: @react-pdf may embed a CreationDate; length stability is
  // the hard assertion, hash stability is reported.
  console.log(`  pdf sha256: ${h1.slice(0, 16)}… (stable: ${h1 === h2})`);

  // A full 22-question module must also render without throwing.
  const { problems: moduleProblems } = buildSATModule({
    preset: SAT_TIMING_PRESETS["full-module"],
    seed: 11,
  });
  const b3 = await renderBytes(moduleProblems);
  check(ctx, b3.length > b1.length, `pdfcheck: full module PDF larger than sample`);
}

// Runnable directly: `npx tsx tests/sat/pdfcheck.tsx`
if (require.main === module) {
  (async () => {
    const ctx = newCtx();
    await runPdfCheck(ctx);
    console.log(
      `pdfcheck: ${ctx.checks} checks, ${ctx.failures.length} failures`
    );
    for (const f of ctx.failures.slice(0, 25)) console.log("  FAIL:", f);
    process.exit(ctx.failures.length ? 1 : 0);
  })();
}

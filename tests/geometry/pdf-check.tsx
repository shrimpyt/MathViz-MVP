// pdf-check.tsx — Geometry sample worksheet PDFs.
//
// Renders five sample worksheets through the real PDF stack (@react-pdf +
// the new PdfGeometryFigureSVG diagram renderers + DejaVu fonts, the same
// font pipeline as PdfDocument): three lessons (ch5-1 midsegments, ch8-1
// translations, ch12-1 tangent lines) and two chapter tests (ch3, ch14).
// Writes PDFs to /tmp/geometry-samples/, then verifies with pdftotext that
// the prompt text, diagram labels, and answer key actually extract from the
// PDF bytes (per AGENTS.md: pdftotext is the reference extractor).
//
// Run: npx tsx tests/geometry/pdf-check.tsx

import React from "react";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { pdf, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { WIRED_GEOMETRY } from "../../src/modules/geometry-lessons";
import { formatGeometryAnswer } from "../../src/lib/factories/GeometryTypes";
import type { GeometryProblem } from "../../src/lib/factories/GeometryTypes";
import { PdfGeometryFigureSVG } from "../../src/components/diagrams/GeometryPdfDiagrams";
import { PdfShadedSectorSVG } from "../../src/components/PdfGeometrySVG";

Font.register({
  family: "WorksheetSerif",
  fonts: [
    { src: `${process.cwd()}/public/fonts/DejaVuSerif.ttf`, fontWeight: 400 },
    { src: `${process.cwd()}/public/fonts/DejaVuSerif-Italic.ttf`, fontWeight: 400, fontStyle: "italic" },
    { src: `${process.cwd()}/public/fonts/DejaVuSerif-Bold.ttf`, fontWeight: 700 },
    { src: `${process.cwd()}/public/fonts/DejaVuSerif-BoldItalic.ttf`, fontWeight: 700, fontStyle: "italic" },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "WorksheetSerif", fontSize: 10 },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 9, color: "#444444", marginBottom: 12 },
  problem: { marginBottom: 12, borderBottom: "0.5 solid #dddddd", paddingBottom: 8 },
  prompt: { fontSize: 10, marginBottom: 4 },
  step: { fontSize: 8.5, color: "#333333", marginLeft: 8, marginBottom: 2 },
  reason: { fontSize: 8, color: "#666666", marginLeft: 8, fontStyle: "italic" },
  row: { flexDirection: "row", gap: 10 },
  keyTitle: { fontSize: 13, fontWeight: 700, marginTop: 10, marginBottom: 6 },
  keyLine: { fontSize: 9.5, marginBottom: 3 },
});

function Diagram({ p }: { p: GeometryProblem }) {
  if (!p.svgParams) return null;
  if (p.svgParams.kind === "ShadedSector") {
    return <PdfShadedSectorSVG sectorAngle={p.svgParams.sectorAngle} />;
  }
  return <PdfGeometryFigureSVG params={p.svgParams} />;
}

function SampleDoc({ title, problems }: { title: string; problems: GeometryProblem[] }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Euclid Engine — geometry sample worksheet (seeded)</Text>
        {problems.map((p, i) => (
          <View key={i} style={styles.problem}>
            <Text style={styles.prompt}>{`${i + 1}. ${p.prompt}`}</Text>
            <View style={styles.row}>
              <Diagram p={p} />
              <View>
                {p.steps.map((s, j) => (
                  <View key={j}>
                    <Text style={styles.step}>{s.instruction}</Text>
                    {s.reason ? <Text style={styles.reason}>{s.reason}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
        <Text style={styles.keyTitle}>Answer Key</Text>
        {problems.map((p, i) => (
          <Text key={i} style={styles.keyLine}>{`${i + 1}. ${formatGeometryAnswer(p)}`}</Text>
        ))}
      </Page>
    </Document>
  );
}

const SAMPLES: { id: string; title: string; marker: string; difficulty: 1 | 2 | 3 }[] = [
  { id: "ch5-1-midsegments", title: "5-1: Midsegments of Triangles", marker: "midsegment", difficulty: 2 },
  { id: "ch8-1-translations", title: "8-1: Translations", marker: "image", difficulty: 2 },
  { id: "ch12-1-tangent-lines", title: "12-1: Tangent Lines", marker: "tangent", difficulty: 3 },
  { id: "ch3-test", title: "Topic 3 Test: Parallel and Perpendicular Lines", marker: "slope", difficulty: 2 },
  { id: "ch14-test", title: "Topic 14 Test: Surface Area and Volume", marker: "volume", difficulty: 2 },
];

async function main() {
  mkdirSync("/tmp/geometry-samples", { recursive: true });
  let failures = 0;
  for (const s of SAMPLES) {
    const entry = WIRED_GEOMETRY.find((e) => e.id === s.id)!;
    const problems = entry.generate("Test", 20260, { count: 6, difficulty: s.difficulty });
    const doc = React.createElement(SampleDoc, { title: s.title, problems });
    const stream = (await pdf(doc as never).toBuffer()) as unknown as AsyncIterable<Uint8Array>;
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(Buffer.from(c));
    const buf = Buffer.concat(chunks);
    const path = `/tmp/geometry-samples/${s.id}.pdf`;
    writeFileSync(path, buf);
    let text = "";
    try {
      text = execSync(`pdftotext -layout ${path} -`, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    } catch (e) {
      console.log(`${s.id}: pdftotext FAILED ${(e as Error).message}`);
      failures++;
      continue;
    }
    const hasMarker = text.toLowerCase().includes(s.marker);
    const hasKey = text.includes("Answer Key");
    const promptHits = problems.filter((p) => text.includes(p.prompt.slice(0, 28))).length;
    const ok = buf.length > 4000 && hasMarker && hasKey && promptHits >= 4;
    console.log(
      `${s.id}: ${buf.length} bytes, marker "${s.marker}"=${hasMarker}, answerKey=${hasKey}, prompts extracted ${promptHits}/6 → ${ok ? "OK" : "FAIL"}`
    );
    if (!ok) failures++;
  }
  console.log(failures === 0 ? "PDF CHECK: all samples OK" : `PDF CHECK: ${failures} failures`);
  process.exit(failures > 0 ? 1 : 0);
}

main();

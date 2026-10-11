// pdf-check.ts
// PDF byte verification: render sample PDFs with react-pdf using the
// Algebra 1 PDF diagram components and verify the bytes are a valid PDF.
// Run: npx tsx tests/algebra-1/pdf-check.ts

import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PdfAlgebraGraphSVG } from "../../src/components/diagrams/AlgebraGraphs";
import type { Algebra1GraphParams } from "../../src/lib/factories/Algebra1Types";
import { generateAlgebra1Mixed } from "../../src/modules/algebra-1";
import { mulberry32 } from "../../src/lib/math-utils";
import { pdfSafeText } from "../../src/lib/answerKey";

const SAMPLES: Array<{ name: string; params: Algebra1GraphParams }> = [
  {
    name: "line",
    params: { kind: "FunctionGraph", funcs: [{ fn: "line", m: 2, b: -3 }], showIntercepts: true, xRange: [-8, 8] },
  },
  {
    name: "parabola",
    params: {
      kind: "FunctionGraph",
      funcs: [{ fn: "parabola", a: 1, h: 2, k: -3 }],
      marks: [{ x: 2, y: -3, label: "(2, -3)" }],
      xRange: [-4, 8],
    },
  },
  {
    name: "exponential",
    params: { kind: "FunctionGraph", funcs: [{ fn: "exponential", a: 2, b: 3 }], xRange: [-3, 3] },
  },
  {
    name: "system-solution",
    params: {
      kind: "FunctionGraph",
      funcs: [
        { fn: "line", m: 1, b: 1, color: "#1d4ed8" },
        { fn: "line", m: -2, b: 7, color: "#059669" },
      ],
      solution: { x: 2, y: 3 },
      xRange: [-4, 8],
    },
  },
  {
    name: "inequality-shade",
    params: {
      kind: "FunctionGraph",
      funcs: [{ fn: "line", m: 2, b: -1, dashed: true, shade: "above", shadeColor: "#3b82f6" }],
      xRange: [-8, 8],
    },
  },
  {
    name: "scatter",
    params: {
      kind: "ScatterPlot",
      points: [[1, 4], [2, 6], [3, 9], [4, 11], [5, 14]],
      line: { m: 2.5, b: 1.5 },
      xLabel: "x",
      yLabel: "y",
    },
  },
  {
    name: "numberline",
    params: { kind: "NumberLine", value: -3, rel: ">=", min: -9, max: 3 },
  },
  {
    name: "twoway",
    params: {
      kind: "TwoWayTable",
      rowLabels: ["Plays sports", "No sports"],
      colLabels: ["Likes math", "Dislikes math"],
      data: [[12, 5], [7, 9]],
      title: "students surveyed",
    },
  },
];

async function main(): Promise<void> {
  let checks = 0;
  const failures: string[] = [];

  // 1. Static samples: one PDF page per diagram kind.
  for (const s of SAMPLES) {
    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "LETTER", style: { padding: 40 } },
        React.createElement(Text, { style: { fontSize: 14, marginBottom: 12 } }, `Sample: ${s.name}`),
        React.createElement(View, null, React.createElement(PdfAlgebraGraphSVG, { params: s.params }))
      )
    );
    const buf = await renderToBuffer(doc);
    checks += 3;
    if (buf.subarray(0, 4).toString() !== "%PDF") failures.push(`${s.name}: missing %PDF header`);
    if (buf.length < 1500) failures.push(`${s.name}: suspiciously small PDF (${buf.length} bytes)`);
    if (!buf.includes(Buffer.from("%%EOF"))) failures.push(`${s.name}: missing %%EOF marker`);
    console.log(`pdf sample ${s.name}: ${buf.length} bytes`);
  }

  // 2. Generated problems: diagrams straight from the factories.
  const problems = generateAlgebra1Mixed(mulberry32(424242), 25, 3);
  const withGraph = problems.filter((p) => p.graph);
  console.log(`generated problems with diagrams: ${withGraph.length}/${problems.length}`);
  const pages = withGraph.slice(0, 10).map((p, i) =>
    React.createElement(
      View,
      { key: i, style: { marginBottom: 20 } },
      React.createElement(Text, { style: { fontSize: 10, marginBottom: 6 } }, pdfSafeText(p.prompt).slice(0, 120)),
      p.graph ? React.createElement(PdfAlgebraGraphSVG, { params: p.graph }) : null
    )
  );
  const doc2 = React.createElement(
    Document,
    null,
    React.createElement(Page, { size: "LETTER", style: { padding: 40 } }, ...pages)
  );
  const buf2 = await renderToBuffer(doc2);
  checks += 2;
  if (buf2.subarray(0, 4).toString() !== "%PDF") failures.push("generated: missing %PDF header");
  if (buf2.length < 3000) failures.push(`generated: suspiciously small PDF (${buf2.length} bytes)`);
  console.log(`pdf generated-problems doc: ${buf2.length} bytes`);

  console.log("=== PDF ===");
  console.log(`checks: ${checks}`);
  console.log(`failures: ${failures.length}`);
  for (const f of failures) console.log("FAIL:", f);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("PDF render crashed:", e);
  process.exit(1);
});

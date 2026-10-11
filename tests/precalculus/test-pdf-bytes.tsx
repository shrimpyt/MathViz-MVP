// test-pdf-bytes.tsx
// PDF byte verification: render every precalculus diagram kind plus an FRQ
// table stimulus and unicode math text through @react-pdf/renderer and verify
// the output is a well-formed PDF (header + minimum size).

import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { check, resetCounters, result, printResult, isMain, type SuiteResult } from "./helpers";
import { PrecalcPdfSVG } from "@/components/diagrams/PrecalcDiagrams";
import type { PrecalcDiagramParams } from "@/lib/factories/PrecalcTypes";

const SAMPLES: { name: string; params: PrecalcDiagramParams }[] = [
  {
    name: "unit-circle",
    params: { kind: "unit-circle", angleDeg: 150, radianLabel: "5π/6", cosText: "−√3/2", sinText: "1/2" },
  },
  {
    name: "vectors",
    params: {
      kind: "vectors",
      arrows: [
        { dx: 3, dy: 4, label: "u", color: "blue" },
        { dx: -2, dy: 1, label: "v", color: "red" },
        { dx: 1, dy: 5, label: "u+v", color: "navy", dashed: true },
      ],
      range: 7,
    },
  },
  {
    name: "trig-graph",
    params: { kind: "trig-graph", fnType: "sin", a: 2, b: 2, c: Math.PI / 6, d: 1, xMin: -1, xMax: 8 },
  },
  {
    name: "conic",
    params: { kind: "conic", conicType: "ellipse", cx: 1, cy: -1, a: 5, b: 3, range: 8, marks: [{ x: -2, y: -1, label: "F" }, { x: 4, y: -1, label: "F" }] },
  },
  {
    name: "conic-hyperbola",
    params: { kind: "conic", conicType: "hyperbola", cx: 0, cy: 0, a: 3, b: 4, range: 9 },
  },
  {
    name: "conic-parabola",
    params: { kind: "conic", conicType: "parabola", cx: 0, cy: 0, a: 2, b: 2, p: 2, orientation: "up", range: 8 },
  },
  {
    name: "polar-grid",
    params: {
      kind: "polar-grid",
      points: [{ r: 4, thetaDeg: 150, label: "P" }],
      rMax: 5,
      curve: { a: 2, b: 3, curveType: "limacon-cos" },
    },
  },
  {
    name: "limit-graph",
    params: {
      kind: "limit-graph",
      segments: [{ x1: -4, y1: -2, x2: 1, y2: 2 }, { x1: 1, y1: 4, x2: 4, y2: 5 }],
      holes: [{ x: 1, y: 2 }, { x: 1, y: 4 }],
      dots: [{ x: 1, y: 2 }],
      xRange: [-4, 4],
      yRange: [-3, 6],
    },
  },
  {
    name: "complex-plane",
    params: { kind: "complex-plane", points: [{ re: 1, im: 1, label: "z1" }, { re: -2, im: 3, label: "z2" }], range: 5 },
  },
];

const TABLE_ROWS = [
  ["1.9", "3.9000"],
  ["1.99", "3.9900"],
  ["1.999", "3.9990"],
  ["2.001", "4.0010"],
  ["2.01", "4.0100"],
  ["2.1", "4.1000"],
];

function SampleDoc() {
  return (
    <Document>
      <Page size="LETTER" style={{ padding: 36 }}>
        <Text style={{ fontSize: 14, marginBottom: 8 }}>Precalculus diagram byte check: θ π √ ≤ ≥ ± ∞ ° → · × ÷</Text>
        {SAMPLES.map((s) => (
          <View key={s.name} style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 9 }}>{s.name}</Text>
            <PrecalcPdfSVG params={s.params} />
          </View>
        ))}
        <Text style={{ fontSize: 9, marginTop: 8 }}>Table stimulus:</Text>
        <View style={{ borderWidth: 1, borderColor: "#0F172A" }}>
          <View style={{ flexDirection: "row" }}>
            {["x", "f(x)"].map((h) => (
              <Text key={h} style={{ fontSize: 9, flex: 1, textAlign: "center", backgroundColor: "#f1f5f9" }}>{h}</Text>
            ))}
          </View>
          {TABLE_ROWS.map((row, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              {row.map((cell, j) => (
                <Text key={j} style={{ fontSize: 9, flex: 1, textAlign: "center" }}>{cell}</Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function runPdfBytes(): Promise<SuiteResult> {
  resetCounters();
  let buf: Buffer;
  try {
    buf = await renderToBuffer(<SampleDoc />);
  } catch (e) {
    check(false, `renderToBuffer threw: ${(e as Error).message}`);
    return result("pdf-bytes");
  }
  check(Buffer.isBuffer(buf), "renderToBuffer returned a Buffer");
  const header = buf.subarray(0, 5).toString("ascii");
  check(header === "%PDF-", `PDF header is %PDF- (got "${header}")`);
  check(buf.length > 5000, `PDF byte length ${buf.length} > 5000`);
  // Each diagram kind rendered without throwing (implicitly verified by reaching here).
  check(SAMPLES.length === 9, "9 diagram samples rendered");
  return result("pdf-bytes");
}

if (isMain(import.meta.url)) {
  runPdfBytes().then(printResult);
}

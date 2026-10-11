// PdfDocument.tsx
// PDF export engine — Classical Academy style.
// Enforces US Letter (8.5" × 11") via @react-pdf/renderer `size="LETTER"`.
// Typography: DejaVu Serif embedded from public/fonts/ (covers math glyphs
// like √ θ π ∠ that the PDF standard 14 fonts would render as wrong glyphs).
// Layout guarantees:
//   • Header box with double-rule border, centered title, Name/Date/Period slots.
//   • Each problem container uses `wrap={false}` so a diagram and its answer
//     table never split across page breaks.

import React from 'react';
import {
  Font,
  Image,
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Svg,
  Circle,
  Line,
  Ellipse,

} from '@react-pdf/renderer';
import { Question, problemToQuestion } from '../core/types';
import { PdfGeometrySVG, PdfRightTriangleSVG } from "./PdfGeometrySVG";
import { PdfProofSVG } from "./diagrams/PdfProofSVG";
import { PdfMiddleSchoolDiagram } from "./diagrams/PdfMiddleSchoolDiagrams";
import { PdfAlgebraGraphSVG } from "./diagrams/AlgebraGraphs";
import { PrecalcPdfSVG } from "./diagrams/PrecalcDiagrams";
import { Algebra2PdfSVG } from "./diagrams/Algebra2PdfDiagrams";
import { SatPdfDiagram } from "./diagrams/SatPdfDiagrams";
import { CalcGraphPdf, CalcTablePdf } from "./diagrams/CalculusGraphs";
import {
  ClassicalNotesPdfSection,
  formatClassicalKeyLine,
} from "./ClassicalNotesPdf";
import type { MathProblem } from "@/lib/ProblemFactory";
import type { ProofSVGParams } from "@/lib/proofDiagrams";
import type { MiddleSchoolSVGParams } from "@/lib/factories/MiddleSchoolTypes";
import type { Algebra1GraphParams } from "@/lib/factories/Algebra1Types";
import type { PrecalcDiagramParams } from "@/lib/factories/PrecalcTypes";
import type { Algebra2DiagramParams } from "@/lib/factories/Algebra2Types";
import type { SATDiagramParams } from "@/lib/satTypes";
import type { CalcGraphParams } from "@/lib/factories/CalculusUtils";
import type { ClassicalGroup } from "./EuclidEngine";
import { TrigSVGParams } from "@/lib/types";
import { latexToText, formatAnswer, pdfSafeText } from "@/lib/answerKey";

// ── Embedded serif font ───────────────────────────────────────────────────────
// The PDF's standard 14 fonts only cover WinAnsi, so math glyphs (√ θ π ∠ —)
// would print as wrong characters. We embed DejaVu Serif (bundled in
// public/fonts/) instead. In the browser the font loads from the public URL;
// in Node (tests / prerender) it loads from the repo's public directory.
function fontSrc(file: string): string {
  if (typeof window === "undefined") {
    return `${process.cwd()}/public/fonts/${file}`;
  }
  return `/fonts/${file}`;
}

Font.register({
  family: "WorksheetSerif",
  fonts: [{ src: fontSrc("DejaVuSerif.ttf"), fontWeight: 400 }],
});

Font.register({
  family: "WorksheetSerifBold",
  fonts: [{ src: fontSrc("DejaVuSerif-Bold.ttf"), fontWeight: 700 }],
});

// ── Section grouping (mirrors EuclidEngine's preview order) ──────────────────
// Matcher-based so two problem kinds sharing one `type` discriminator
// (geometry proofs vs algebra-2 proofs, precalc vs calc FRQs) land in
// separate sections.

interface SectionDef {
  label: string;
  match: (p: MathProblem) => boolean;
}

const SECTION_DEFS: SectionDef[] = [
  { label: "G.12(A) — Circle Relationships", match: (p) => p.type === "G.12A" },
  { label: "G.12(B) — Circle Measurement", match: (p) => p.type === "G.12B" },
  { label: "G.13(B) — Geometric Probability", match: (p) => p.type === "G.13B" },
  { label: "G.6(B) — Triangle Congruence", match: (p) => p.type === "G.6B" },
  { label: "G.2(B) — Coordinate Geometry", match: (p) => p.type === "G.2B" },
  { label: "G.9(A) — Right Triangles & Trigonometry", match: (p) => p.type === "G.9A" },
  { label: "G.9(B) — Special Right Triangles", match: (p) => p.type === "G.9B" },
  {
    label: "Geometry Proofs",
    match: (p) => p.type === "Proof" && (p as { domain?: string }).domain === "geometry",
  },
  {
    label: "Algebra 2 — Proofs",
    match: (p) => p.type === "Proof" && (p as { domain?: string }).domain === "algebra2",
  },
  { label: "Algebra 1", match: (p) => (p as { type: string }).type.startsWith("A.") },
  { label: "Algebra 2", match: (p) => (p as { type: string }).type.startsWith("A2.") },
  { label: "Grade 6 Math", match: (p) => p.type === "MS.6" },
  { label: "Grade 7 Math", match: (p) => p.type === "MS.7" },
  { label: "Grade 8 Math", match: (p) => p.type === "MS.8" },
  { label: "SAT Math Practice", match: (p) => p.type === "SAT" },
  { label: "AP Precalculus — Multiple Choice", match: (p) => p.type === "PRECALC_MCQ" },
  {
    label: "AP Precalculus — Free Response",
    match: (p) => p.type === "AP_FRQ" && (p as { subject?: string }).subject === "precalc",
  },
  { label: "AP Calculus — Multiple Choice", match: (p) => p.type === "CALC_MCQ" },
  {
    label: "AP Calculus — Free Response",
    match: (p) => p.type === "AP_FRQ" && (p as { subject?: string }).subject === "calc",
  },
];


// ── StyleSheet ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Page: strict US Letter, 0.65in margins
  page: {
    size: 'LETTER',
    paddingTop: '0.65in',
    paddingBottom: '0.65in',
    paddingLeft: '0.75in',
    paddingRight: '0.75in',
    backgroundColor: '#ffffff',
    fontFamily: 'WorksheetSerif',
  },

  // ── Classical Academy header ──
  headerWrapper: {
    marginBottom: 14,
  },
  headerTopRule: {
    borderTopWidth: 3,
    borderTopColor: '#0F172A',
    borderTopStyle: 'solid',
    paddingTop: 5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
    borderBottomStyle: 'solid',
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 20,
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  modeLabel: {
    fontFamily: 'WorksheetSerif',
    fontSize: 9,
    textAlign: 'center',
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Name / Date / Period row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    marginBottom: 6,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  infoRight: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontFamily: 'WorksheetSerif',
    fontSize: 11,
    color: '#334155',
  },
  infoBlank: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    borderBottomStyle: 'solid',
    height: 14,
  },

  // Directions box
  directionsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
    padding: 6,
    marginBottom: 10,
  },
  directionsText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#475569',
  },
  directionsBold: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 10,
    color: '#334155',
  },

  // ── Section divider ──
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: '#94a3b8',
  },
  sectionLabel: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 8,
    color: '#64748b',
    marginHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Problem container — wrap:false enforces unbreakable ──
  problemRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  problemNumber: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 12,
    width: 22,
    color: '#172336',
  },
  problemContent: {
    flex: 1,
  },
  questionText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 11,
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 1.4,
  },

  // Diagram placeholder box
  diagramBox: {
    marginTop: 6,
    marginBottom: 6,
    alignSelf: 'flex-end',
  },

  // Scaffolding steps
  scaffoldBox: {
    marginTop: 6,
    marginLeft: 8,
    paddingLeft: 8,
    paddingVertical: 6,
    paddingRight: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#d9a720',
    borderLeftStyle: 'solid',
    backgroundColor: '#f8fafc',
  },
  scaffoldStep: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  scaffoldText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#334155',
  },
  blank: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    borderBottomStyle: 'solid',
    height: 14,
    marginLeft: 4,
  },

  // Answer line for test mode
  answerLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  answerLabel: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 11,
    color: '#172336',
    marginRight: 4,
  },
  answerBlank: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    borderBottomStyle: 'solid',
    width: 80,
    height: 14,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: '0.4in',
    left: '0.75in',
    right: '0.75in',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  footerText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 8,
    color: '#94a3b8',
  },

  // ── Answer key ──
  keyTitle: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 20,
    textAlign: 'center',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  keyWarning: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 10,
    textAlign: 'center',
    color: '#b91c1c',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  keyRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  keyNumber: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 12,
    width: 26,
    color: '#172336',
  },
  keyAnswer: {
    fontFamily: 'WorksheetSerif',
    fontSize: 12,
    color: '#1e293b',
    flex: 1,
  },
  keyAnswerSm: {
    fontFamily: 'WorksheetSerif',
    fontSize: 11,
    color: '#1e293b',
  },
  keyJust: {
    fontFamily: 'WorksheetSerif',
    fontSize: 9,
    color: '#475569',
    marginTop: 2,
  },

  // ── Proof tables ──
  proofTable: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#0F172A',
    borderStyle: 'solid',
  },
  proofRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  proofHeadRow: {
    backgroundColor: '#f1f5f9',
  },
  proofCell: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#1e293b',
    padding: 4,
  },
  proofNum: {
    width: 24,
    textAlign: 'center',
  },
  proofStmt: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
    borderLeftStyle: 'solid',
  },
  proofReason: {
    width: '34%',
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
    borderLeftStyle: 'solid',
  },
  proofHead: {
    fontFamily: 'WorksheetSerifBold',
    fontStyle: 'normal',
  },
  givenText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#334155',
    marginBottom: 4,
  },
  elementsEnunc: {
    fontFamily: 'WorksheetSerif',
    fontSize: 11,
    color: '#0F172A',
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#d9a720',
    borderLeftStyle: 'solid',
  },
  elementsStep: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  elementsReason: {
    color: '#64748b',
    fontSize: 9,
  },
  qed: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
    letterSpacing: 2,
  },

  // ── MCQ choices / SAT grid-in ──
  choiceList: {
    marginTop: 6,
    marginBottom: 4,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  choiceLetter: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 11,
    color: '#0F172A',
    width: 28,
  },
  choiceKey: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 11,
    color: '#15803d',
    width: 28,
  },
  choiceText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 11,
    color: '#1e293b',
    flex: 1,
  },
  gridInRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
  },
  gridInBox: {
    width: 30,
    height: 34,
    borderWidth: 1,
    borderColor: '#0F172A',
    borderStyle: 'solid',
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInText: {
    fontFamily: 'WorksheetSerifBold',
    fontSize: 14,
    color: '#0F172A',
  },

  // ── FRQ stimulus / subparts ──
  stimulusText: {
    fontFamily: 'WorksheetSerif',
    fontSize: 11,
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 1.4,
    backgroundColor: '#f8fafc',
    padding: 6,
  },
  frqTable: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#0F172A',
    borderStyle: 'solid',
  },
  tableCaption: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#475569',
    marginBottom: 4,
  },
  frqTableRow: {
    flexDirection: 'row',
  },
  frqCell: {
    fontFamily: 'WorksheetSerif',
    fontSize: 10,
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
    padding: 4,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
  },
  frqCellHead: {
    fontFamily: 'WorksheetSerifBold',
    backgroundColor: '#f1f5f9',
  },
  subpart: {
    marginTop: 8,
  },
  workspaceLines: {
    marginTop: 6,
  },
  workspaceLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    borderBottomStyle: 'solid',
    height: 18,
    marginBottom: 2,
  },
});

// ── Diagram primitives ────────────────────────────────────────────────────────

const PdfDiagram = ({ type, data }: { type: string; data?: import('../core/types').DiagramData }) => {
  if (type === 'circle') {
    return (
      <Svg width="150" height="150" viewBox="0 0 150 150">
        <Circle cx="75" cy="75" r="50" stroke="black" strokeWidth="2" fill="none" />
        <Circle cx="75" cy="75" r="2" fill="black" />
        <Text x="70" y="95" style={{ fontSize: 12 }}>O</Text>

        <Line x1="75" y1="75" x2="25" y2="75" stroke="black" strokeWidth="1" />
        <Line x1="75" y1="75" x2="110" y2="40" stroke="black" strokeWidth="1" />
        <Line x1="25" y1="75" x2="110" y2="40" stroke="black" strokeWidth="1" />
        <Line x1="25" y1="75" x2="110" y2="110" stroke="black" strokeWidth="1" />
        <Line x1="110" y1="40" x2="110" y2="110" stroke="black" strokeWidth="1" />

        <Text x="15" y="80" style={{ fontSize: 12 }}>B</Text>
        <Text x="115" y="35" style={{ fontSize: 12 }}>A</Text>
        <Text x="115" y="125" style={{ fontSize: 12 }}>C</Text>

        {data?.angle ? <Text x="35" y="70" style={{ fontSize: 10 }}>{String(data.angle)}</Text> : null}
      </Svg>
    );
  }
  if (type === 'surface-area') {
    return (
      <Svg width="150" height="150" viewBox="0 0 150 150">
        <Ellipse cx="75" cy="30" rx="40" ry="15" stroke="black" strokeWidth="2" fill="none" />
        <Ellipse cx="75" cy="120" rx="40" ry="15" stroke="black" strokeWidth="2" fill="none" />
        <Line x1="35" y1="30" x2="35" y2="120" stroke="black" strokeWidth="2" />
        <Line x1="115" y1="30" x2="115" y2="120" stroke="black" strokeWidth="2" />
        <Line x1="75" y1="30" x2="115" y2="30" stroke="black" strokeWidth="1" strokeDasharray="4" />
        {data?.radius ? <Text x="85" y="25" style={{ fontSize: 12 }}>r={String(data.radius)}</Text> : null}
        {data?.height ? <Text x="125" y="75" style={{ fontSize: 12 }}>h={String(data.height)}</Text> : null}
      </Svg>
    );
  }
  if (type === 'angle') {
    return (
      <Svg width="150" height="150" viewBox="0 0 150 150">
        <Line x1="20" y1="50" x2="130" y2="50" stroke="black" strokeWidth="2" />
        <Line x1="20" y1="100" x2="130" y2="100" stroke="black" strokeWidth="2" />
        <Line x1="40" y1="20" x2="110" y2="130" stroke="black" strokeWidth="2" />
        <Text x="10" y="45" style={{ fontSize: 12 }}>L1</Text>
        <Text x="10" y="105" style={{ fontSize: 12 }}>L2</Text>
        <Text x="60" y="45" style={{ fontSize: 12 }}>1</Text>
        {data?.angleValue ? <Text x="75" y="45" style={{ fontSize: 10 }}>{String(data.angleValue)}</Text> : null}
      </Svg>
    );
  }
    if (type === 'right-triangle') {
    return <PdfRightTriangleSVG {...data as unknown as TrigSVGParams} kind="RightTriangle" />;
  }
  return null;
};

// ── Section divider component ─────────────────────────────────────────────────

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PdfDocumentProps {
  title: string;
  questions: Question[];
  advancedProblems?: MathProblem[];
  /** 'worksheet' | 'guided-notes' | 'review' | 'test' | 'classical-notes' | ... */
  docType?: string;
  /** Standard(s) covered, shown in footer */
  standard?: string;
  /** Append an answer-key page. Defaults to true. */
  includeAnswerKey?: boolean;
  /** Optional logo image src for the header (e.g. "/logo_light.png"). */
  logoSrc?: string;
  /** Per-entry problem groups for Classical Notes mode (built by WorksheetGenerator). */
  classicalGroups?: ClassicalGroup[];
  /** Worksheet seed — drives deterministic margin-prompt rotation in Classical mode. */
  seed?: number;
}

// ── Document ──────────────────────────────────────────────────────────────────

interface PdfItem {
  problem?: MathProblem;
  question: Question;
}

export default function PdfDocument({
  title,
  questions,
  advancedProblems,
  docType = 'worksheet',
  standard = 'Texas TEKS Geometry',
  includeAnswerKey = true,
  logoSrc,
  classicalGroups,
  seed = 1,
}: PdfDocumentProps) {
  const modeLabel =
    docType === 'guided-notes'
      ? 'Guided Notes'
      : docType === 'test'
      ? 'Assessment'
      : docType === 'review'
      ? 'Review Practice'
      : docType === 'classical-notes'
      ? 'Classical Notes'
      : docType === 'proof-two-column'
      ? 'Two-Column Proofs'
      : docType === 'proof-fill-reasons'
      ? 'Proof Practice'
      : docType === 'proof-elements'
      ? "Euclid's Elements"
      : docType === 'sat-practice'
      ? 'SAT Practice'
      : 'Practice Worksheet';

  const showScaffold = docType === 'guided-notes' || docType === 'review';
  const showAnswerLine = docType === 'test' || docType === 'worksheet';
  const isClassicalDoc = docType === 'classical-notes' && !!classicalGroups && classicalGroups.length > 0;

  // Pair each problem with its question text, grouped by section in the
  // same order EuclidEngine uses for the on-screen preview. Each problem
  // lands in the first matching section only.
  const sections: { label: string | null; items: PdfItem[] }[] = [];
  if (advancedProblems && advancedProblems.length > 0) {
    let n = 0;
    const remaining = [...advancedProblems];
    for (const def of SECTION_DEFS) {
      const matched = remaining.filter(def.match);
      if (matched.length > 0) {
        sections.push({
          label: def.label,
          items: matched.map((p) => ({ problem: p, question: problemToQuestion(p, n++) })),
        });
        for (const p of matched) remaining.splice(remaining.indexOf(p), 1);
      }
    }
    // Any unexpected types (shouldn't happen) go last, unlabeled.
    if (remaining.length > 0) {
      sections.push({
        label: null,
        items: remaining.map((p) => ({ problem: p, question: problemToQuestion(p, n++) })),
      });
    }
  } else {
    sections.push({
      label: null,
      items: questions.map((q) => ({ question: q })),
    });
  }

  // Flat numbered list for the answer key, in worksheet order. Classical
  // Notes mode keys off the per-entry groups (same numbering as the
  // ClassicalNotesPdfSection blocks above).
  const keyedItems: { n: number; problem: MathProblem }[] = [];
  if (isClassicalDoc) {
    for (const g of classicalGroups!) {
      g.problems.forEach((problem, i) =>
        keyedItems.push({ n: g.startIndex + i + 1, problem })
      );
    }
  } else {
    let n = 1;
    for (const sec of sections) {
      for (const item of sec.items) {
        if (item.problem) keyedItems.push({ n: n++, problem: item.problem });
      }
    }
  }
  const showKey = includeAnswerKey && keyedItems.length > 0;

  // Numbered sections, computed once per render.
  const numberedSections = (() => {
    let n = 0;
    return sections.map((sec) => ({
      label: sec.label,
      items: sec.items.map((item) => ({ item, n: ++n })),
    }));
  })();

  // ── Diagram dispatch ──────────────────────────────────────────────────────
  // Routes each worker's diagram params to its own PDF renderer.

  const renderPdfDiagram = (item: PdfItem) => {
    const p = item.problem;
    const q = item.question;
    const svgParams =
      p && 'svgParams' in p
        ? (p.svgParams as { kind?: unknown } | null | undefined)
        : undefined;
    if (svgParams && typeof svgParams.kind === 'string') {
      const kind = svgParams.kind;
      if (kind.startsWith('Proof')) {
        return <PdfProofSVG params={svgParams as unknown as ProofSVGParams} />;
      }
      if (p && (p.type === 'MS.6' || p.type === 'MS.7' || p.type === 'MS.8')) {
        return <PdfMiddleSchoolDiagram params={svgParams as unknown as MiddleSchoolSVGParams} />;
      }
      if (
        kind === 'FunctionGraph' ||
        kind === 'ScatterPlot' ||
        kind === 'NumberLine' ||
        kind === 'TwoWayTable'
      ) {
        return <PdfAlgebraGraphSVG params={svgParams as unknown as Algebra1GraphParams} />;
      }
      if (
        kind === 'unit-circle' || kind === 'vectors' || kind === 'trig-graph' ||
        kind === 'conic' || kind === 'polar-grid' || kind === 'limit-graph' ||
        kind === 'complex-plane'
      ) {
        return <PrecalcPdfSVG params={svgParams as unknown as PrecalcDiagramParams} />;
      }
      if (kind === 'ConicGraph' || kind === 'RationalGraph') {
        return <Algebra2PdfSVG params={svgParams as unknown as Algebra2DiagramParams} />;
      }
      return <PdfGeometrySVG params={svgParams as unknown as Parameters<typeof PdfGeometrySVG>[0]['params']} />;
    }
    // Diagram types carried on the Question (SAT, calc, FRQ).
    const dt = q.diagramType;
    const dd = q.diagramData as Record<string, unknown> | undefined;
    if (dt === 'sat-diagram' && dd) {
      return <SatPdfDiagram params={dd as unknown as SATDiagramParams} />;
    }
    if (dt === 'calc-graph' && dd) {
      return <CalcGraphPdf params={dd as unknown as CalcGraphParams} />;
    }
    if (dt && dt !== '') {
      return <PdfDiagram type={dt} data={q.diagramData} />;
    }
    return null;
  };

  // ── FRQ stimulus (shared by precalc + calc) ───────────────────────────────

  const renderFRQStimulus = (p: {
    subject: string;
    stimulus: {
      kind: string;
      text?: string;
      headers?: string[];
      rows?: string[][];
      caption?: string;
      params?: Record<string, unknown>;
    };
  }) => {
    const stim = p.stimulus;
    if (stim.kind === 'scenario') {
      return (
        <Text style={styles.stimulusText}>{pdfSafeText(stim.text ?? '')}</Text>
      );
    }
    if (stim.kind === 'table') {
      const headers = stim.headers ?? [];
      const rows = stim.rows ?? [];
      return (
        <View style={styles.frqTable} wrap={false}>
          {stim.caption ? (
            <Text style={styles.tableCaption}>{pdfSafeText(stim.caption)}</Text>
          ) : null}
          <View style={styles.frqTableRow}>
            {headers.map((h, i) => (
              <Text key={i} style={[styles.frqCell, styles.frqCellHead]}>
                {pdfSafeText(h)}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.frqTableRow}>
              {row.map((c, j) => (
                <Text key={j} style={styles.frqCell}>{pdfSafeText(c)}</Text>
              ))}
            </View>
          ))}
        </View>
      );
    }
    // graph — subject discriminates the renderer (decision: AP_FRQ routes on subject)
    if (p.subject === 'precalc') {
      return <PrecalcPdfSVG params={stim.params as unknown as PrecalcDiagramParams} />;
    }
    return <CalcGraphPdf params={stim.params as unknown as CalcGraphParams} />;
  };

  // ── Problem renderers ─────────────────────────────────────────────────────

  const renderStandardProblem = (item: PdfItem, n: number) => (
    // wrap={false} — diagram + answer table never split across pages
    <View key={n} style={styles.problemRow} wrap={false}>
      <Text style={styles.problemNumber}>{n}.</Text>

      <View style={styles.problemContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.questionText}>{pdfSafeText(item.question.text)}</Text>

            {/* Scaffolding (guided-notes / review mode) */}
            {showScaffold && item.question.scaffolding && (
              <View style={styles.scaffoldBox}>
                {item.question.scaffolding.map((step, idx) => (
                  <View key={idx} style={styles.scaffoldStep}>
                    <Text style={styles.scaffoldText}>{pdfSafeText(step.text)}</Text>
                    {step.blankLength && (
                      <View
                        style={[
                          styles.blank,
                          { width: step.blankLength * 5 },
                        ]}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Answer line (worksheet / test mode) */}
            {showAnswerLine && (
              <View style={styles.answerLine}>
                <Text style={styles.answerLabel}>Answer:</Text>
                <View style={styles.answerBlank} />
              </View>
            )}
          </View>

          {/* Diagram */}
          <View style={styles.diagramBox}>{renderPdfDiagram(item)}</View>
        </View>
      </View>
    </View>
  );

  /** Geometry + Algebra-2 proofs: two-column table or Elements exposition. */
  const renderProofProblem = (item: PdfItem, n: number) => {
    const p = item.problem as unknown as {
      given: string[];
      prove: string;
      steps: {
        statement: string;
        reason: string;
        blankStatement?: boolean;
        blankReason?: boolean;
      }[];
      elementsProposition?: string;
      elementsEnunciation?: string;
      svgParams?: { kind: string };
    };
    // Mirrors EuclidEngine: proof-elements mode shows the Elements
    // exposition for Elements problems; every other mode is two-column.
    const useElements = docType === 'proof-elements' && !!p.elementsProposition;
    const showAll = docType === 'review' || docType === 'classical-notes';
    return (
      <View key={n} style={styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {p.elementsProposition && useElements ? (
                <Text style={styles.questionText}>
                  Proposition {pdfSafeText(p.elementsProposition)}
                </Text>
              ) : (
                <View>
                  <Text style={styles.questionText}>
                    <Text style={styles.answerLabel}>Prove: </Text>
                    {pdfSafeText(p.prove)}
                  </Text>
                  <Text style={styles.givenText}>
                    <Text style={styles.answerLabel}>Given: </Text>
                    {p.given.map((g) => pdfSafeText(g)).join('; ')}
                  </Text>
                </View>
              )}

              {useElements ? (
                <View style={{ marginTop: 6 }}>
                  {p.elementsEnunciation ? (
                    <Text style={styles.elementsEnunc}>
                      {pdfSafeText(p.elementsEnunciation)}
                    </Text>
                  ) : null}
                  {p.steps.map((s, i) =>
                    s.statement === 'Q.E.D.' ? (
                      <Text key={i} style={styles.qed}>Q.E.D.</Text>
                    ) : (
                      <Text key={i} style={styles.elementsStep}>
                        {i + 1}. {pdfSafeText(s.statement)}{' '}
                        <Text style={styles.elementsReason}>
                          [{showAll || !s.blankReason ? pdfSafeText(s.reason) : '________'}]
                        </Text>
                      </Text>
                    )
                  )}
                </View>
              ) : (
                <View style={styles.proofTable}>
                  <View style={[styles.proofRow, styles.proofHeadRow]}>
                    <Text style={[styles.proofCell, styles.proofNum, styles.proofHead]}>#</Text>
                    <Text style={[styles.proofCell, styles.proofStmt, styles.proofHead]}>Statement</Text>
                    <Text style={[styles.proofCell, styles.proofReason, styles.proofHead]}>Reason</Text>
                  </View>
                  {p.steps.map((s, i) => (
                    <View key={i} style={styles.proofRow}>
                      <Text style={[styles.proofCell, styles.proofNum]}>{i + 1}</Text>
                      <Text style={[styles.proofCell, styles.proofStmt]}>
                        {showAll || !s.blankStatement ? pdfSafeText(s.statement) : '_______________'}
                      </Text>
                      <Text style={[styles.proofCell, styles.proofReason]}>
                        {showAll || !s.blankReason ? pdfSafeText(s.reason) : '_______________'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.diagramBox}>{renderPdfDiagram(item)}</View>
          </View>
        </View>
      </View>
    );
  };

  /** SAT: stem + MCQ options or grid-in boxes. */
  const renderSATProblem = (item: PdfItem, n: number) => {
    const p = item.problem as unknown as {
      stem: string;
      format: 'MCQ' | 'GridIn';
      options?: { option: string; label: string; isKey: boolean }[];
      key: string;
      diagram?: SATDiagramParams;
    };
    const showKey = docType === 'review' || docType === 'classical-notes';
    return (
      <View key={n} style={styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          <Text style={styles.questionText}>{pdfSafeText(p.stem)}</Text>
          {p.format === 'MCQ' ? (
            <View style={styles.choiceList}>
              {(p.options ?? []).map((o) => (
                <View key={o.option} style={styles.choiceRow}>
                  <Text style={showKey && o.isKey ? styles.choiceKey : styles.choiceLetter}>
                    ({o.option})
                  </Text>
                  <Text style={styles.choiceText}>{pdfSafeText(o.label)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.gridInRow}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={styles.gridInBox}>
                  {showKey ? (
                    <Text style={styles.gridInText}>{pdfSafeText(p.key[i] ?? '')}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {p.diagram ? (
            <View style={styles.diagramBox}>
              <SatPdfDiagram params={p.diagram} />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  /** AP multiple choice (precalc A–D / calc A–E): stem + choices + diagram. */
  const renderMCQProblem = (item: PdfItem, n: number) => {
    const p = item.problem as unknown as {
      type: string;
      stem?: string;
      prompt?: string;
      choices: string[];
      correctIndex: number;
      steps?: { instruction: string }[];
      table?: { headers: string[]; rows: string[][] };
    };
    const showKey = docType === 'review' || docType === 'classical-notes';
    const letters = ['A', 'B', 'C', 'D', 'E'];
    return (
      <View key={n} style={styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.questionText}>
                {pdfSafeText(p.type === 'PRECALC_MCQ' ? p.stem ?? '' : p.prompt ?? '')}
              </Text>
              {p.table ? (
                <CalcTablePdf headers={p.table.headers} rows={p.table.rows} />
              ) : null}
              <View style={styles.choiceList}>
                {p.choices.map((c, i) => (
                  <View key={i} style={styles.choiceRow}>
                    <Text style={showKey && i === p.correctIndex ? styles.choiceKey : styles.choiceLetter}>
                      ({letters[i]})
                    </Text>
                    <Text style={styles.choiceText}>{pdfSafeText(c)}</Text>
                  </View>
                ))}
              </View>
              {showScaffold && p.steps && p.steps.length > 0 && (
                <View style={styles.scaffoldBox}>
                  {p.steps.map((s, idx) => (
                    <View key={idx} style={styles.scaffoldStep}>
                      <Text style={styles.scaffoldText}>{pdfSafeText(s.instruction)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {showAnswerLine && (
                <View style={styles.answerLine}>
                  <Text style={styles.answerLabel}>Answer:</Text>
                  <View style={styles.answerBlank} />
                </View>
              )}
            </View>
            <View style={styles.diagramBox}>{renderPdfDiagram(item)}</View>
          </View>
        </View>
      </View>
    );
  };

  /** AP free response (precalc + calc): stimulus + lettered subparts. */
  const renderFRQProblem = (item: PdfItem, n: number) => {
    const p = item.problem as unknown as {
      subject: string;
      stimulus: {
        kind: string;
        text?: string;
        headers?: string[];
        rows?: string[][];
        caption?: string;
        params?: Record<string, unknown>;
      };
      subparts: {
        label: string;
        prompt: string;
        answer: string;
        justification?: string;
      }[];
    };
    const showKey = docType === 'review' || docType === 'classical-notes';
    return (
      <View key={n} style={styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          {renderFRQStimulus(p)}
          {p.subparts.map((s) => (
            <View key={s.label} style={styles.subpart}>
              <Text style={styles.questionText}>
                ({s.label}) {pdfSafeText(s.prompt)}
              </Text>
              {showKey ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.keyAnswerSm}>{pdfSafeText(s.answer)}</Text>
                  {s.justification ? (
                    <Text style={styles.keyJust}>{pdfSafeText(s.justification)}</Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.workspaceLines}>
                  <View style={styles.workspaceLine} />
                  <View style={styles.workspaceLine} />
                  <View style={styles.workspaceLine} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderProblem = (item: PdfItem, n: number) => {
    const t = item.problem?.type;
    if (t === 'SAT') return renderSATProblem(item, n);
    if (t === 'Proof') return renderProofProblem(item, n);
    if (t === 'AP_FRQ') return renderFRQProblem(item, n);
    if (t === 'PRECALC_MCQ' || t === 'CALC_MCQ') return renderMCQProblem(item, n);
    return renderStandardProblem(item, n);
  };

  /** Answer-key row: classical mode reveals reasons; FRQ/SAT add justifications. */
  const renderKeyAnswer = (problem: MathProblem) => {
    if (isClassicalDoc) {
      return (
        <Text style={styles.keyAnswer}>{pdfSafeText(formatClassicalKeyLine(problem))}</Text>
      );
    }
    if (problem.type === 'AP_FRQ') {
      const justs = problem.subparts
        .map((s) => s.justification)
        .filter((j): j is string => !!j);
      return (
        <View style={{ flex: 1 }}>
          <Text style={styles.keyAnswer}>{pdfSafeText(formatAnswer(problem))}</Text>
          {justs.map((j, i) => (
            <Text key={i} style={styles.keyJust}>{pdfSafeText(j)}</Text>
          ))}
        </View>
      );
    }
    if (problem.type === 'SAT') {
      return (
        <View style={{ flex: 1 }}>
          <Text style={styles.keyAnswer}>{pdfSafeText(formatAnswer(problem))}</Text>
          {problem.explanation ? (
            <Text style={styles.keyJust}>{pdfSafeText(problem.explanation)}</Text>
          ) : null}
        </View>
      );
    }
    return (
      <Text style={styles.keyAnswer}>{pdfSafeText(formatAnswer(problem))}</Text>
    );
  };

  const renderHeader = (heading: string, sub: string) => (
    <View style={styles.headerWrapper}>
      <View style={styles.headerTopRule}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          {logoSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image
              src={logoSrc}
              style={{ width: 30, height: 30, marginRight: 10 }}
            />
          ) : null}
          <Text style={styles.title}>{pdfSafeText(heading)}</Text>
        </View>
        <Text style={styles.modeLabel}>{sub}</Text>
      </View>

      {/* Name / Date / Period */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Text style={styles.infoLabel}>Name: </Text>
          <View style={[styles.infoBlank, { width: 160 }]} />
        </View>
        <View style={styles.infoRight}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.infoLabel}>Date: </Text>
            <View style={[styles.infoBlank, { width: 70 }]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.infoLabel}>Period: </Text>
            <View style={[styles.infoBlank, { width: 35 }]} />
          </View>
        </View>
      </View>

      {/* Directions */}
      {docType === 'guided-notes' && (
        <View style={styles.directionsBox}>
          <Text>
            <Text style={styles.directionsBold}>Directions: </Text>
            <Text style={styles.directionsText}>
              Fill in each blank as we work through the problems together. Use the diagrams to guide your thinking.
            </Text>
          </Text>
        </View>
      )}
      {docType === 'test' && (
        <View style={styles.directionsBox}>
          <Text>
            <Text style={styles.directionsBold}>Directions: </Text>
            <Text style={styles.directionsText}>
              Show all work. Write your final answer on each answer line. Partial credit may be awarded for correct steps.
            </Text>
          </Text>
        </View>
      )}
      {docType === 'classical-notes' && (
        <View style={styles.directionsBox}>
          <Text>
            <Text style={styles.directionsBold}>Directions: </Text>
            <Text style={styles.directionsText}>
              Study each demonstration step. Write the missing reason on each ruled
              line, answer the margin questions, then narrate the idea in your own
              words.
            </Text>
          </Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{standard}</Text>
      <Text style={styles.footerText}>
        Euclid Engine — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>
    </View>
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ── Classical Academy Header ── */}
        {renderHeader(title, modeLabel)}

        {/* ── Problems: classical-notes gets per-entry sections; otherwise
            the standard grouped rendering ── */}
        {isClassicalDoc ? (
          <View>
            {classicalGroups!.map((g) => (
              <ClassicalNotesPdfSection
                key={g.entryId}
                entryId={g.entryId}
                problems={g.problems}
                seed={seed}
                startIndex={g.startIndex}
                sectionLabel={g.title}
                teksBadge={g.teks}
              />
            ))}
          </View>
        ) : (
          <View>
            {numberedSections.map((sec, si) => (
              <View key={si}>
                {sec.label && (
                  <View style={styles.sectionDivider}>
                    <View style={styles.sectionRule} />
                    <Text style={styles.sectionLabel}>{sec.label}</Text>
                    <View style={styles.sectionRule} />
                  </View>
                )}
                {sec.items.map(({ item, n }) => renderProblem(item, n))}
              </View>
            ))}
          </View>
        )}

        {renderFooter()}
      </Page>

      {/* ── Answer key ── */}
      {showKey && (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.headerWrapper}>
            <View style={styles.headerTopRule}>
              <Text style={styles.keyTitle}>ANSWER KEY</Text>
              <Text style={styles.keyWarning}>Do not distribute — teacher use only</Text>
              <Text style={styles.modeLabel}>{title}</Text>
            </View>
          </View>

          <View>
            {keyedItems.map(({ n, problem }) => (
              <View key={n} style={styles.keyRow} wrap={false}>
                <Text style={styles.keyNumber}>{n}.</Text>
                {renderKeyAnswer(problem)}
              </View>
            ))}
          </View>

          {renderFooter()}
        </Page>
      )}
    </Document>
  );
}

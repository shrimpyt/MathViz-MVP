// PdfDocument.tsx
// PDF export engine, "Open Classic" design.
// Enforces US Letter (8.5" × 11") via @react-pdf/renderer `size="LETTER"`.
// Typography: Euclid Sans (FreeSans with a tightened °) embedded from
// public/fonts/, registered in pdfFonts.ts. Covers ≅ ∠ △ √ π; DejaVu Sans
// backs it up for anything it lacks.
// Layout:
//   • Centered title and subtitle, Name/Date/Period, a double rule, then
//     one line of italic directions.
//   • Problems in two columns with a center rule and a hairline between
//     rows. Each cell leaves room to work and ends in an "Answer" line.
//     Proofs and AP free-response run the full page width. Accommodated
//     versions (large print, fewer per page) keep one problem per row.
//   • Each row uses `wrap={false}` so a diagram and its answer line never
//     split across page breaks.

import React from 'react';
import {
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
import type { Presentation } from "../lib/accommodations";
import { DEFAULT_PRESENTATION } from "../lib/accommodations";
import { pdfFamily } from "./pdfFonts";
import { PdfMathText } from "./PdfMathText";

// ── Fonts ────────────────────────────────────────────────────────────────────
// Registered once in pdfFonts.ts (Euclid Sans, DejaVu Serif, DejaVu Sans
// fallback). pdfFamily() swaps serif tokens to sans for the default
// presentation and returns font stacks so no glyph prints as a box.

// ── Section grouping (mirrors EuclidEngine's preview order) ──────────────────
// Matcher-based so two problem kinds sharing one `type` discriminator
// (geometry proofs vs algebra-2 proofs, precalc vs calc FRQs) land in
// separate sections.

interface SectionDef {
  label: string;
  match: (p: MathProblem) => boolean;
}

const SECTION_DEFS: SectionDef[] = [
  { label: "G.12(A), Circle Relationships", match: (p) => p.type === "G.12A" },
  { label: "G.12(B), Circle Measurement", match: (p) => p.type === "G.12B" },
  { label: "G.13(B), Geometric Probability", match: (p) => p.type === "G.13B" },
  { label: "G.6(B), Triangle Congruence", match: (p) => p.type === "G.6B" },
  { label: "G.2(B), Coordinate Geometry", match: (p) => p.type === "G.2B" },
  { label: "G.9(A), Right Triangles & Trigonometry", match: (p) => p.type === "G.9A" },
  { label: "G.9(B), Special Right Triangles", match: (p) => p.type === "G.9B" },
  {
    label: "Geometry Proofs",
    match: (p) => p.type === "Proof" && (p as { domain?: string }).domain === "geometry",
  },
  {
    label: "Algebra 2, Proofs",
    match: (p) => p.type === "Proof" && (p as { domain?: string }).domain === "algebra2",
  },
  { label: "Algebra 1", match: (p) => (p as { type: string }).type.startsWith("A.") },
  { label: "Algebra 2", match: (p) => (p as { type: string }).type.startsWith("A2.") },
  { label: "Grade 6 Math", match: (p) => p.type === "MS.6" },
  { label: "Pre-Algebra", match: (p) => p.type === "MS.7" || p.type === "MS.8" },
  { label: "SAT Math Practice", match: (p) => p.type === "SAT" },
  { label: "AP Precalculus, Multiple Choice", match: (p) => p.type === "PRECALC_MCQ" },
  {
    label: "AP Precalculus, Free Response",
    match: (p) => p.type === "AP_FRQ" && (p as { subject?: string }).subject === "precalc",
  },
  { label: "AP Calculus, Multiple Choice", match: (p) => p.type === "CALC_MCQ" },
  {
    label: "AP Calculus, Free Response",
    match: (p) => p.type === "AP_FRQ" && (p as { subject?: string }).subject === "calc",
  },
];


// ── StyleSheet ────────────────────────────────────────────────────────────────

// ── Presentation-aware stylesheet ─────────────────────────────────────────────
// Accommodations (IEP generator) scale the presentation without touching math.
// getStyles() memoizes per distinct presentation so the default path
// (fontScale 1 / serif / spacing 1) renders byte-identical output to before.

function createStyles(presentation: Presentation) {
  const fs = (n: number) => Math.round(n * presentation.fontScale * 10) / 10;
  const sp = (n: number) => Math.round(n * presentation.spacingScale * 10) / 10;
  // Family swap for sans mode: returns a spreadable style fragment. Bold serif
  // maps to the sans bold weight so headings stay bold in sans mode.
  const fam = (f: 'WorksheetSerif' | 'WorksheetSerifBold') =>
    pdfFamily(presentation.fontFamily, f);

  return StyleSheet.create({
  // Page: strict US Letter, 0.6in margins (0.75in at the bottom for the footer)
  page: {
    size: 'LETTER',
    paddingTop: '0.6in',
    paddingBottom: '0.75in',
    paddingLeft: '0.6in',
    paddingRight: '0.6in',
    backgroundColor: '#ffffff',
    ...fam('WorksheetSerif'),
  },

  // ── Header: centered title, subtitle, Name/Date/Period, double rule ──
  headerWrapper: {
    marginBottom: sp(10),
  },
  headerTopRule: {
    marginBottom: sp(14),
    alignItems: 'center',
  },
  title: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(16),
    textAlign: 'center',
    color: '#111111',
  },
  modeLabel: {
    ...fam('WorksheetSerif'),
    fontSize: fs(9.5),
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#666666',
    marginTop: sp(3),
  },

  // Name / Date / Period row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: sp(9),
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    marginRight: 18,
  },
  infoRight: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-end',
  },
  infoLabel: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#111111',
    marginRight: 6,
  },
  infoBlank: {
    borderBottomWidth: 0.8,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    height: 12,
  },
  doubleRuleThick: {
    borderTopWidth: 1.2,
    borderTopColor: '#111111',
    borderTopStyle: 'solid',
    height: 2.5,
  },
  doubleRuleThin: {
    borderTopWidth: 0.5,
    borderTopColor: '#111111',
    borderTopStyle: 'solid',
  },

  // Word bank, plain bordered box under the header (IEP option)
  wordBankBox: {
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'solid',
    padding: sp(8),
    marginBottom: sp(12),
  },
  wordBankLabel: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(11),
    color: '#111111',
    marginBottom: sp(4),
  },
  wordBankTerms: {
    ...fam('WorksheetSerif'),
    fontSize: fs(11),
    color: '#111111',
    lineHeight: 1.5,
  },

  // Directions, one italic gray line under the double rule
  directionsBox: {
    marginTop: sp(9),
  },
  directionsText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(9),
    fontStyle: 'italic',
    color: '#666666',
  },

  // ── Section heading (5.1 h2.sec style) ──
  sectionDivider: {
    marginTop: sp(12),
    marginBottom: sp(2),
    borderBottomWidth: 0.6,
    borderBottomColor: '#999999',
    borderBottomStyle: 'solid',
    paddingBottom: sp(3),
  },
  sectionRule: {
    display: 'none',
  },
  sectionLabel: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(10.5),
    color: '#111111',
  },

  // ── Problem container, wrap:false enforces unbreakable ──
  problemRow: {
    flexDirection: 'row',
    marginBottom: sp(18),
  },
  problemNumber: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(11),
    // 22pt gutter: a two-digit number ("10.") measures ~16pt at this size.
    width: 22,
    color: '#111111',
  },
  problemContent: {
    flex: 1,
  },
  questionText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10.3),
    color: '#111111',
    marginBottom: sp(6),
    lineHeight: 1.32,
  },

  // ── Two-column grid ──
  gridRow: {
    flexDirection: 'row',
  },
  gridRowRule: {
    borderTopWidth: 0.6,
    borderTopColor: '#c8c8c8',
    borderTopStyle: 'solid',
  },
  gridCellLeft: {
    width: '50%',
    paddingRight: 9,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  gridCellRight: {
    width: '50%',
    paddingLeft: 9,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: 'space-between',
    borderLeftWidth: 0.6,
    borderLeftColor: '#c8c8c8',
    borderLeftStyle: 'solid',
  },
  gridCellFull: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 10,
  },
  cellAnswer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginTop: sp(6),
  },
  cellAnswerLabel: {
    ...fam('WorksheetSerif'),
    fontSize: fs(8.5),
    color: '#666666',
    marginRight: 8,
  },
  cellAnswerBlank: {
    borderBottomWidth: 0.8,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    width: 96,
    height: 12,
  },

  // Diagram placeholder box
  diagramBox: {
    marginTop: sp(6),
    marginBottom: sp(6),
    alignSelf: 'flex-end',
  },

  // Scaffolding steps, plain, no accents
  scaffoldBox: {
    marginTop: sp(6),
    marginLeft: sp(8),
    paddingLeft: sp(8),
    paddingVertical: sp(4),
    paddingRight: sp(6),
  },
  scaffoldStep: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: sp(6),
  },
  scaffoldText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#444444',
  },
  blank: {
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
    borderBottomStyle: 'solid',
    height: 14,
    marginLeft: sp(4),
  },

  // Answer line for test mode
  answerLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: sp(8),
  },
  answerLabel: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(11),
    color: '#111111',
    marginRight: sp(4),
  },
  answerBlank: {
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    width: 80,
    height: 14,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: '0.4in',
    left: '0.6in',
    right: '0.6in',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.6,
    borderTopColor: '#c8c8c8',
    borderTopStyle: 'solid',
    paddingTop: sp(4),
  },
  footerText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(8),
    color: '#666666',
  },

  // ── Answer key ──
  keyTitle: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(20),
    textAlign: 'center',
    color: '#111111',
    letterSpacing: 0.5,
  },
  keyWarning: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(10),
    textAlign: 'center',
    color: '#b91c1c',
    marginTop: sp(4),
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  keyRow: {
    flexDirection: 'row',
    marginBottom: sp(7),
  },
  keyNumber: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(12),
    width: 26,
    color: '#111111',
  },
  keyAnswer: {
    ...fam('WorksheetSerif'),
    fontSize: fs(12),
    color: '#111111',
    flex: 1,
  },
  keyAnswerSm: {
    ...fam('WorksheetSerif'),
    fontSize: fs(11),
    color: '#111111',
  },
  keyJust: {
    ...fam('WorksheetSerif'),
    fontSize: fs(9),
    color: '#555555',
    marginTop: sp(2),
  },

  // ── Proof tables ──
  proofWorkspace: { borderWidth: 1.2, borderColor: '#8a8a8a', minHeight: 300, marginTop: 6 },
  proofTable: {
    marginTop: sp(6),
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'solid',
  },
  proofRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: '#999999',
    borderBottomStyle: 'solid',
  },
  proofHeadRow: {
    borderBottomColor: '#111111',
  },
  proofCell: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#111111',
    padding: sp(5),
    minHeight: sp(22),
  },
  proofCellBox: {
    padding: sp(5),
    minHeight: sp(24),
    justifyContent: 'center',
  },
  proofCellText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#111111',
    lineHeight: 1.25,
  },
  proofNum: {
    width: 24,
    textAlign: 'center',
  },
  proofStmt: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#999999',
    borderLeftStyle: 'solid',
  },
  proofReason: {
    width: '42%',
    borderLeftWidth: 1,
    borderLeftColor: '#999999',
    borderLeftStyle: 'solid',
  },
  proofHead: {
    ...fam('WorksheetSerifBold'),
    fontStyle: 'normal',
  },
  givenText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#444444',
    marginBottom: sp(4),
  },
  elementsEnunc: {
    ...fam('WorksheetSerif'),
    fontSize: fs(11),
    color: '#111111',
    marginBottom: sp(6),
    paddingLeft: sp(8),

  },
  elementsStep: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#111111',
    marginBottom: sp(4),
    lineHeight: 1.4,
  },
  elementsReason: {
    color: '#555555',
    fontSize: fs(9),
  },
  qed: {
    ...fam('WorksheetSerif'),
    fontStyle: 'italic',
    fontSize: fs(11),
    textAlign: 'right',
    color: '#444444',
    marginTop: sp(10),
  },

  // ── MCQ choices / SAT grid-in ──
  choiceList: {
    marginTop: sp(6),
    marginBottom: sp(4),
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(5),
  },
  choiceLetter: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(11),
    color: '#111111',
    width: 28,
  },
  choiceKey: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(11),
    color: '#15803d',
    width: 28,
  },
  choiceCircle: {
    width: fs(12.5),
    height: fs(12.5),
    borderRadius: fs(6.25),
    borderWidth: 0.7,
    borderColor: '#111111',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  choiceCircleKey: {
    backgroundColor: '#111111',
  },
  choiceCircleText: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(7.5),
    color: '#111111',
  },
  choiceCircleTextKey: {
    color: '#ffffff',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: sp(4),
  },
  choiceHalf: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp(6),
  },
  choiceText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10.3),
    color: '#111111',
    flex: 1,
  },
  gridInRow: {
    flexDirection: 'row',
    marginTop: sp(8),
    marginBottom: sp(4),
  },
  gridInBox: {
    width: 30,
    height: 34,
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'solid',
    marginRight: sp(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInText: {
    ...fam('WorksheetSerifBold'),
    fontSize: fs(14),
    color: '#111111',
  },

  // ── FRQ stimulus / subparts ──
  stimulusText: {
    ...fam('WorksheetSerif'),
    fontSize: fs(11),
    color: '#111111',
    marginBottom: sp(8),
    lineHeight: 1.4,
  },
  frqTable: {
    marginBottom: sp(8),
    borderWidth: 1,
    borderColor: '#111111',
    borderStyle: 'solid',
  },
  tableCaption: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#555555',
    marginBottom: sp(4),
  },
  frqTableRow: {
    flexDirection: 'row',
  },
  frqCell: {
    ...fam('WorksheetSerif'),
    fontSize: fs(10),
    color: '#111111',
    flex: 1,
    textAlign: 'center',
    padding: sp(4),
    borderWidth: 0.5,
    borderColor: '#999999',
    borderStyle: 'solid',
  },
  frqCellHead: {
    ...fam('WorksheetSerifBold'),
    backgroundColor: '#eeeeee',
  },
  subpart: {
    marginTop: sp(8),
  },
  workspaceLines: {
    marginTop: sp(6),
  },
  workspaceLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    borderBottomStyle: 'solid',
    height: 18,
    marginBottom: sp(2),
  },
  });
}

type StylesType = ReturnType<typeof createStyles>;
const stylesCache = new Map<string, StylesType>();
function getStyles(presentation: Presentation): StylesType {
  const key = `${presentation.fontScale}|${presentation.fontFamily}|${presentation.spacingScale}|${presentation.maxProblemsPerPage}`;
  let s = stylesCache.get(key);
  if (!s) {
    s = createStyles(presentation);
    stylesCache.set(key, s);
  }
  return s;
}

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
  /** Per-entry problem groups for Classical Notes mode (built by WorksheetGenerator). */
  classicalGroups?: ClassicalGroup[];
  /** Worksheet seed, drives deterministic margin-prompt rotation in Classical mode. */
  seed?: number;
  /** Presentation overrides from the IEP accommodation generator. Presentation
      only, never changes math. Defaults to the standard presentation. */
  presentation?: Presentation;
  /** Heading for the answer-key page. Defaults to 'ANSWER KEY'. Per-version
      keys pass their own label (e.g. 'Answer Key, Group A'). */
  keyHeading?: string;
  /** Word bank terms for accommodated versions (IEP word-bank option).
      Rendered in a plain bank box under the header when non-empty. */
  wordBank?: string[];
  /** Free-tier exports carry a plain "Made with Euclid Engine Free" footer
      line (the Free watermark). Pro exports omit it. */
  watermark?: boolean;
}

// ── Document ──────────────────────────────────────────────────────────────────
// PdfVersionPages renders one worksheet version's pages (worksheet + its own
// answer key) as a fragment, so the combined accommodated export can render
// several versions, with divider pages between, inside a single <Document>.
// The default PdfDocument export preserves the original single-version API.

interface PdfItem {
  problem?: MathProblem;
  question: Question;
}

export function PdfVersionPages({
  title,
  questions,
  advancedProblems,
  docType = 'worksheet',
  standard = 'Texas TEKS Geometry',
  includeAnswerKey = true,
  classicalGroups,
  seed = 1,
  presentation = DEFAULT_PRESENTATION,
  keyHeading = 'ANSWER KEY',
  wordBank,
  watermark = false,
}: PdfDocumentProps) {
  const styles = getStyles(presentation);
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
      : docType === 'proof-blank'
      ? 'Proof Workspace'
      : docType === 'sat-practice'
      ? 'SAT Practice'
      : 'Practice Worksheet';

  const showScaffold = docType === 'guided-notes' || docType === 'review';
  const showAnswerLine = docType === 'test' || docType === 'worksheet';
  const isClassicalDoc = docType === 'classical-notes' && !!classicalGroups && classicalGroups.length > 0;
  // Fewer-per-page accommodation: the cap only binds when an accommodation
  // actually lowered it below the default.
  const capActive =
    presentation.maxProblemsPerPage < DEFAULT_PRESENTATION.maxProblemsPerPage;
  // Two-column grid for the standard presentation. Large print and the
  // fewer-per-page accommodation keep one problem per row.
  const grid = !isClassicalDoc && presentation.fontScale === 1 && !capActive;
  // Height of each grid row: the space a student works in.
  const workRoom =
    docType === 'test' || docType === 'worksheet' ? 150 : docType === 'sat-practice' ? 120 : 112;

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

  // ── Diagram scaling for the large-print accommodation ─────────────────────
  // Diagram components render at fixed intrinsic sizes (largest observed:
  // 200×200). Scale the drawing visually and reserve the scaled box in layout
  // so enlarged diagrams never overlap neighboring content.
  const renderScaledDiagram = (item: PdfItem) => {
    const diagram = renderPdfDiagram(item);
    if (!diagram) return null;
    const s = presentation.fontScale;
    if (s === 1) return <View style={styles.diagramBox}>{diagram}</View>;
    const W = 220;
    const H = 200;
    return (
      <View style={[styles.diagramBox, { width: W * s, height: H * s }]}>
        <View
          style={{
            width: W,
            height: H,
            transform: `scale(${s})`,
            transformOrigin: 'top left',
          }}
        >
          {diagram}
        </View>
      </View>
    );
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
    // graph, subject discriminates the renderer (decision: AP_FRQ routes on subject)
    if (p.subject === 'precalc') {
      return <PrecalcPdfSVG params={stim.params as unknown as PrecalcDiagramParams} />;
    }
    return <CalcGraphPdf params={stim.params as unknown as CalcGraphParams} />;
  };

  // ── Problem renderers ─────────────────────────────────────────────────────
  // In the two-column grid (`grid`), a problem renders only its number,
  // text, choices and diagram; the grid cell adds the work room and the
  // "Answer" line. In single-column mode (accommodations) each problem
  // carries its own answer line and bottom margin.

  const answerLine = (
    <View style={styles.cellAnswer}>
      <Text style={styles.cellAnswerLabel}>Answer</Text>
      <View style={styles.cellAnswerBlank} />
    </View>
  );

  /** Circled-letter choices: two per line when every choice is short. */
  const renderChoices = (
    choices: { letter: string; text: string; isKey: boolean }[],
    revealKey: boolean,
  ) => {
    const short = choices.every((c) => pdfSafeText(c.text).length <= 16);
    const one = (c: { letter: string; text: string; isKey: boolean }, i: number) => {
      const key = revealKey && c.isKey;
      return (
        <View key={i} style={short ? styles.choiceHalf : styles.choiceRow}>
          <View style={key ? [styles.choiceCircle, styles.choiceCircleKey] : styles.choiceCircle}>
            <Text style={key ? [styles.choiceCircleText, styles.choiceCircleTextKey] : styles.choiceCircleText}>
              {c.letter}
            </Text>
          </View>
          <PdfMathText text={c.text} style={styles.choiceText} />
        </View>
      );
    };
    return short ? (
      <View style={styles.choiceGrid}>{choices.map(one)}</View>
    ) : (
      <View style={styles.choiceList}>{choices.map(one)}</View>
    );
  };

  const renderStandardProblem = (item: PdfItem, n: number) => {
    const scaffold = showScaffold && item.question.scaffolding && (
      <View style={styles.scaffoldBox}>
        {item.question.scaffolding.map((step, idx) => (
          <View key={idx} style={styles.scaffoldStep}>
            <Text style={styles.scaffoldText}>{pdfSafeText(step.text)}</Text>
            {step.blankLength && (
              <View style={[styles.blank, { width: step.blankLength * 5 }]} />
            )}
          </View>
        ))}
      </View>
    );
    if (grid) {
      // Text on top, diagram under it at the right, answer line from the cell.
      return (
        <View key={n} style={{ flexDirection: 'row' }}>
          <Text style={styles.problemNumber}>{n}.</Text>
          <View style={styles.problemContent}>
            <PdfMathText text={item.question.text} style={styles.questionText} />
            {scaffold}
            {renderScaledDiagram(item)}
          </View>
        </View>
      );
    }
    return (
      // wrap={false}, diagram + answer line never split across pages
      <View key={n} style={styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <PdfMathText text={item.question.text} style={styles.questionText} />
              {scaffold}
              {showAnswerLine && answerLine}
            </View>
            {renderScaledDiagram(item)}
          </View>
        </View>
      </View>
    );
  };

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
    const givenProve = (
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={[styles.questionText, { marginBottom: 0, width: 42 }]}>Given:</Text>
          <View style={{ flex: 1 }}>
            {p.given.map((g, i) => (
              <PdfMathText key={i} text={g} style={[styles.questionText, { marginBottom: 1 }]} />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Text style={[styles.questionText, { width: 42 }]}>Prove:</Text>
          <View style={{ flex: 1 }}>
            <PdfMathText text={p.prove} style={styles.questionText} />
          </View>
        </View>
      </View>
    );
    // Blank Workspace format: Given/Prove + diagram, then one big open
    // space spanning the full width. No table, no steps shown.
    if (docType === 'proof-blank') {
      return (
        <View key={n} style={styles.problemRow} wrap={false}>
          <Text style={styles.problemNumber}>{n}.</Text>
          <View style={styles.problemContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>{givenProve}</View>
              {renderScaledDiagram(item)}
            </View>
            <View style={styles.proofWorkspace} />
          </View>
        </View>
      );
    }
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
                givenProve
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
              ) : null}
            </View>
            {renderScaledDiagram(item)}
          </View>

          {/* Two-column table runs the full width under the figure. Blank
              cells are left open to write in. */}
          {!useElements ? (
            <View style={styles.proofTable}>
              <View style={[styles.proofRow, styles.proofHeadRow]}>
                <Text style={[styles.proofCell, styles.proofNum, styles.proofHead]}> </Text>
                <Text style={[styles.proofCell, styles.proofStmt, styles.proofHead, { textAlign: 'center' }]}>Statements</Text>
                <Text style={[styles.proofCell, styles.proofReason, styles.proofHead, { textAlign: 'center' }]}>Reasons</Text>
              </View>
              {p.steps.map((s, i) => (
                <View key={i} style={styles.proofRow} wrap={false}>
                  <Text style={[styles.proofCell, styles.proofNum, { color: '#666666' }]}>{i + 1}</Text>
                  <View style={[styles.proofCellBox, styles.proofStmt]}>
                    {showAll || !s.blankStatement ? (
                      <PdfMathText text={s.statement} style={styles.proofCellText} />
                    ) : null}
                  </View>
                  <View style={[styles.proofCellBox, styles.proofReason]}>
                    {showAll || !s.blankReason ? (
                      <PdfMathText text={s.reason} style={styles.proofCellText} />
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
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
      <View key={n} style={grid ? { flexDirection: 'row' } : styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          <PdfMathText text={p.stem} style={styles.questionText} />
          {p.format === 'MCQ' ? (
            renderChoices(
              (p.options ?? []).map((o) => ({ letter: o.option, text: o.label, isKey: o.isKey })),
              showKey,
            )
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
    const body = (
      <>
        <PdfMathText
          text={p.type === 'PRECALC_MCQ' ? p.stem ?? '' : p.prompt ?? ''}
          style={styles.questionText}
        />
        {p.table ? (
          <CalcTablePdf headers={p.table.headers} rows={p.table.rows} />
        ) : null}
        {renderChoices(
          p.choices.map((c, i) => ({ letter: letters[i], text: c, isKey: i === p.correctIndex })),
          showKey,
        )}
        {showScaffold && p.steps && p.steps.length > 0 && (
          <View style={styles.scaffoldBox}>
            {p.steps.map((s, idx) => (
              <View key={idx} style={styles.scaffoldStep}>
                <Text style={styles.scaffoldText}>{pdfSafeText(s.instruction)}</Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
    if (grid) {
      return (
        <View key={n} style={{ flexDirection: 'row' }}>
          <Text style={styles.problemNumber}>{n}.</Text>
          <View style={styles.problemContent}>
            {body}
            {renderScaledDiagram(item)}
          </View>
        </View>
      );
    }
    return (
      <View key={n} style={styles.problemRow} wrap={false}>
        <Text style={styles.problemNumber}>{n}.</Text>
        <View style={styles.problemContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>{body}</View>
            {renderScaledDiagram(item)}
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
              <View style={{ flexDirection: 'row' }}>
                <Text style={[styles.questionText, { width: 20 }]}>({s.label})</Text>
                <View style={{ flex: 1 }}>
                  <PdfMathText text={s.prompt} style={styles.questionText} />
                </View>
              </View>
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

  const isFullWidth = (item: PdfItem) =>
    item.problem?.type === 'Proof' || item.problem?.type === 'AP_FRQ';
  const isChoiceProblem = (item: PdfItem) => {
    const t = item.problem?.type;
    return t === 'SAT' || t === 'PRECALC_MCQ' || t === 'CALC_MCQ';
  };

  const renderProblem = (item: PdfItem, n: number) => {
    const t = item.problem?.type;
    if (t === 'SAT') return renderSATProblem(item, n);
    if (t === 'Proof') return renderProofProblem(item, n);
    if (t === 'AP_FRQ') return renderFRQProblem(item, n);
    if (t === 'PRECALC_MCQ' || t === 'CALC_MCQ') return renderMCQProblem(item, n);
    return renderStandardProblem(item, n);
  };

  /** Pair half-width problems into two-column rows; proofs and FRQs span the page. */
  const renderGridRows = (
    items: { item: PdfItem; n: number }[],
    label: string | null,
  ) => {
    const rows: { item: PdfItem; n: number }[][] = [];
    let pending: { item: PdfItem; n: number } | null = null;
    for (const it of items) {
      if (isFullWidth(it.item)) {
        if (pending) rows.push([pending]);
        pending = null;
        rows.push([it]);
      } else if (pending) {
        rows.push([pending, it]);
        pending = null;
      } else {
        pending = it;
      }
    }
    if (pending) rows.push([pending]);

    const cell = (it: { item: PdfItem; n: number } | undefined, side: 'left' | 'right') => (
      <View style={side === 'left' ? styles.gridCellLeft : styles.gridCellRight}>
        {it ? renderProblem(it.item, it.n) : null}
        {it && showAnswerLine && !isChoiceProblem(it.item) ? answerLine : null}
      </View>
    );

    // A section heading travels with its first row so it never sits alone
    // at the foot of a page. The heading's own rule stands in for that
    // row's top hairline.
    const heading = label ? (
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
    ) : null;

    return rows.map((row, ri) => {
      const ruled = ri > 0;
      const body =
        row.length === 1 && isFullWidth(row[0].item) ? (
          <View style={ruled ? [styles.gridRow, styles.gridRowRule] : styles.gridRow}>
            <View style={styles.gridCellFull}>{renderProblem(row[0].item, row[0].n)}</View>
          </View>
        ) : (
          <View style={[styles.gridRow, ruled ? styles.gridRowRule : {}, { minHeight: workRoom }]}>
            {cell(row[0], 'left')}
            {cell(row[1], 'right')}
          </View>
        );
      return (
        <View key={row[0].n} wrap={false}>
          {ri === 0 ? heading : null}
          {body}
        </View>
      );
    });
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

  const directions =
    docType === 'guided-notes'
      ? 'Fill in each blank as we work through the problems together. Use the diagrams to guide your thinking.'
      : docType === 'test'
      ? 'Show all work. Write your final answer on each answer line. Partial credit may be awarded for correct steps.'
      : docType === 'worksheet'
      ? 'Show your work under each problem. Write your final answer on the line.'
      : docType === 'review'
      ? 'Show your work under each problem.'
      : docType === 'classical-notes'
      ? 'Study each demonstration step. Write the missing reason on each ruled line, answer the margin questions, then narrate the idea in your own words.'
      : docType === 'proof-two-column' || docType === 'proof-fill-reasons'
      ? 'Complete each proof. Give a reason for every statement.'
      : docType === 'proof-blank'
      ? 'Write a complete proof in the space under each problem.'
      : docType === 'sat-practice'
      ? 'Circle the best answer, or write your answer in the boxes.'
      : null;

  const renderHeader = (heading: string, sub: string) => (
    <View style={styles.headerWrapper}>
      <View style={styles.headerTopRule}>
        <Text style={styles.title}>{pdfSafeText(heading)}</Text>
        <Text style={styles.modeLabel}>{sub}</Text>
      </View>

      {/* Name / Date / Period */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Text style={styles.infoLabel}>Name</Text>
          <View style={[styles.infoBlank, { flex: 1 }]} />
        </View>
        <View style={styles.infoRight}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.infoLabel}>Date</Text>
            <View style={[styles.infoBlank, { width: 88 }]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.infoLabel}>Period</Text>
            <View style={[styles.infoBlank, { width: 64 }]} />
          </View>
        </View>
      </View>
      <View style={styles.doubleRuleThick} />
      <View style={styles.doubleRuleThin} />

      {directions ? (
        <View style={styles.directionsBox}>
          <Text style={styles.directionsText}>{directions}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{standard}</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber }) =>
          `${watermark ? 'Made with Euclid Engine Free  ·  ' : 'Euclid Engine  ·  '}Page ${pageNumber}`
        }
      />
    </View>
  );

  return (
    <>
      <Page size="LETTER" style={styles.page}>
        {/* ── Plain handout header ── */}
        {renderHeader(title, modeLabel)}

        {/* ── Word bank (IEP option, accommodated versions only) ── */}
        {wordBank && wordBank.length > 0 ? (
          <View style={styles.wordBankBox}>
            <Text style={styles.wordBankLabel}>Word Bank</Text>
            <Text style={styles.wordBankTerms}>
              {wordBank.map((t) => pdfSafeText(t)).join('  ·  ')}
            </Text>
          </View>
        ) : null}

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
                presentation={presentation}
              />
            ))}
          </View>
        ) : (
          <View>
            {numberedSections.map((sec, si) => (
              <View key={si}>
                {sec.label && !grid && (
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionLabel}>{sec.label}</Text>
                  </View>
                )}
                {grid
                  ? renderGridRows(sec.items, sec.label)
                  : sec.items.map(({ item, n }) => {
                      const el = renderProblem(item, n);
                      // Fewer-per-page accommodation: force a page break every
                      // K problems. The standard worksheet flows naturally and
                      // fills each page. (Classical-notes entry sections keep
                      // natural flow.)
                      const needsBreak =
                        capActive &&
                        n > 1 &&
                        (n - 1) % presentation.maxProblemsPerPage === 0;
                      return needsBreak ? React.cloneElement(el, { break: true }) : el;
                    })}
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
              <Text style={styles.keyTitle}>{keyHeading}</Text>
              <Text style={styles.keyWarning}>Do not distribute, teacher use only</Text>
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
    </>
  );
}

// ── Single-version document (original public API, unchanged behavior) ─────────

export default function PdfDocument(props: PdfDocumentProps) {
  return (
    <Document>
      <PdfVersionPages {...props} />
    </Document>
  );
}

// ── Accommodation divider page ────────────────────────────────────────────────
// Separates versions in the combined accommodated export. Carries the version's
// dividerText (e.g. "Group A, Large print · 3 students · print 3 copies").

// Divider pages carry no version of their own, so they follow the default
// presentation's font (sans), same fam() swap as createStyles above.
const dividerFam = (f: 'WorksheetSerif' | 'WorksheetSerifBold') =>
  pdfFamily(DEFAULT_PRESENTATION.fontFamily, f);

const dividerStyles = StyleSheet.create({
  page: {
    size: 'LETTER',
    backgroundColor: '#ffffff',
    ...dividerFam('WorksheetSerif'),
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: '0.75in',
  },
  dividerTitle: {
    ...dividerFam('WorksheetSerifBold'),
    fontSize: 16,
    textAlign: 'center',
    color: '#111111',
    marginBottom: 10,
  },
  dividerSub: {
    ...dividerFam('WorksheetSerif'),
    fontSize: 10,
    textAlign: 'center',
    color: '#555555',
  },
});

export function AccommodationDividerPage({ text }: { text: string }) {
  return (
    <Page size="LETTER" style={dividerStyles.page}>
      <View style={dividerStyles.centerBox}>
        <Text style={dividerStyles.dividerTitle}>{text}</Text>
        <Text style={dividerStyles.dividerSub}>
          Euclid Engine · accommodated version
        </Text>
      </View>
    </Page>
  );
}

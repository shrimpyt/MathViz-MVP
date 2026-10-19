// ClassicalNotesPdf.tsx
// PDF renderer for CLASSICAL NOTES document mode (own file, the coordinator
// routes `classical-notes` docType here from PdfDocument.tsx).
//
// Mirrors ClassicalNotesCard's four elements for print:
//   1. DEFINITIONS block (full text, omitted gracefully when none exist),
//   2. DEMONSTRATION steps shown with each reason blanked as a ruled line,
//   3. Socratic margin prompts alongside steps (seeded rotation, no adjacent
//      repeats, identical to the web preview for the same seed),
//   4. NARRATION box + error log once per section.
//
// All text goes through pdfSafeText (DejaVu fonts are embedded; the PDF
// standard 14 fonts would mangle math glyphs). See answerKey.ts.
// Typography follows the version's Presentation: sans (DejaVu Sans) is the
// default; 'serif' renders the Classical Notes 5.1 theme (DejaVu Serif).

import React from 'react';
import {
  Font,
  Page,
  Text,
  View,
  Document,
  StyleSheet,
} from '@react-pdf/renderer';
import { PdfGeometrySVG } from './PdfGeometrySVG';
import { PdfProofSVG } from './diagrams/PdfProofSVG';
import type { ProofSVGParams } from '@/lib/proofDiagrams';
import { problemToQuestion } from '../core/types';
import type { MathProblem, ProblemStep } from '@/lib/ProblemFactory';
import { getClassicalDefinitions } from '@/lib/classicalDefinitions';
import {
  assignMarginPrompts,
  GENERIC_MARGIN_PROMPT,
} from '@/lib/classicalPrompts';
import { formatAnswer, latexToText, pdfSafeText } from '@/lib/answerKey';
import {
  DEFAULT_PRESENTATION,
  type Presentation,
} from '@/lib/accommodations';

// ── Step/diagram normalization ──────────────────────────────────────────────
// The classical renderer was built when every MathProblem carried steps +
// geometry svgParams. New areas differ: SAT/FRQ problems have no steps,
// proof steps use { statement, reason } instead of { instruction, ... }.
// Normalize here so the section still renders.

type ProofStepLike = { statement?: string; reason?: string };

/** Steps as the classical step renderer expects them (instruction-based). */
function classicalSteps(p: MathProblem): ProblemStep[] {
  if (!('steps' in p) || !Array.isArray(p.steps)) return [];
  return (p.steps as (ProblemStep | ProofStepLike)[]).map((s) =>
    'instruction' in s && typeof (s as ProblemStep).instruction === 'string'
      ? (s as ProblemStep)
      : {
          instruction:
            'statement' in s && typeof (s as ProofStepLike).statement === 'string'
              ? ((s as ProofStepLike).statement as string)
              : '',
          ...((s as ProofStepLike).reason
            ? { reason: (s as ProofStepLike).reason as string }
            : {}),
        }
  );
}

/**
 * Diagram params the classical section can draw: geometry kinds go to
 * PdfGeometrySVG, proof kinds to PdfProofSVG. Other areas' diagrams are
 * rendered by their own cards/sections, not the classical section.
 */
function classicalDiagram(p: MathProblem): { kind: string } | undefined {
  if (!('svgParams' in p)) return undefined;
  const sp = p.svgParams as { kind?: unknown } | null | undefined;
  if (!sp || typeof sp.kind !== 'string') return undefined;
  return sp as { kind: string };
}

// ── Font registration (idempotent; also registered by PdfDocument.tsx) ────────
// In the browser the font loads from the public URL; in Node (tests /
// prerender) it loads from the repo's public directory.
function fontSrc(file: string): string {
  if (typeof window === 'undefined') {
    return `${process.cwd()}/public/fonts/${file}`;
  }
  return `/fonts/${file}`;
}

Font.register({
  family: 'WorksheetSerif',
  fonts: [
    { src: fontSrc('DejaVuSerif.ttf'), fontWeight: 400 },
    { src: fontSrc('DejaVuSerif-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'WorksheetSerifBold',
  fonts: [
    { src: fontSrc('DejaVuSerif-Bold.ttf'), fontWeight: 700 },
    { src: fontSrc('DejaVuSerif-BoldItalic.ttf'), fontWeight: 700, fontStyle: 'italic' },
  ],
});

// Sans family (the default presentation font; also registered by PdfDocument).
Font.register({
  family: 'WorksheetSans',
  fonts: [
    { src: fontSrc('DejaVuSans.ttf'), fontWeight: 400 },
    { src: fontSrc('DejaVuSans-Bold.ttf'), fontWeight: 700 },
    { src: fontSrc('DejaVuSans-Oblique.ttf'), fontWeight: 400, fontStyle: 'italic' },
    { src: fontSrc('DejaVuSans-BoldOblique.ttf'), fontWeight: 700, fontStyle: 'italic' },
  ],
});

// ── Styles ────────────────────────────────────────────────────────────────────

// Presentation-aware stylesheet (mirrors PdfDocument's createStyles): the
// serif tokens swap to WorksheetSans when the presentation font is 'sans'.
function createStyles(fontFamily: 'serif' | 'sans') {
  const fam = (
    f: 'WorksheetSerif' | 'WorksheetSerifBold',
  ): { fontFamily: string; fontWeight?: number } =>
    fontFamily === 'sans'
      ? f === 'WorksheetSerifBold'
        ? { fontFamily: 'WorksheetSans', fontWeight: 700 }
        : { fontFamily: 'WorksheetSans' }
      : { fontFamily: f };

  return StyleSheet.create({
  page: {
    size: 'LETTER',
    paddingTop: '0.65in',
    paddingBottom: '0.65in',
    paddingLeft: '0.75in',
    paddingRight: '0.75in',
    backgroundColor: '#ffffff',
    ...fam('WorksheetSerif'),
  },
  headerWrapper: { marginBottom: 12 },
  headerRule: {
    paddingTop: 2,
    paddingBottom: 2,
    marginBottom: 8,
    alignItems: 'center',
  },
  title: {
    ...fam('WorksheetSerifBold'),
    fontSize: 20,
    textAlign: 'center',
    color: '#111111',
  },
  modeLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#555555',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    marginBottom: 6,
  },
  infoLabel: { fontSize: 11, color: '#444444' },
  infoBlank: {
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
    borderBottomStyle: 'solid',
    height: 14,
  },
  directionsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#999999',
    borderStyle: 'solid',
    padding: 6,
    marginBottom: 10,
  },
  directionsText: { fontSize: 10, color: '#555555' },
  directionsBold: { ...fam('WorksheetSerifBold'), fontSize: 10, color: '#444444' },

  // Section heading
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  sectionRule: { flex: 1, height: 1, backgroundColor: '#999999' },
  sectionLabel: {
    ...fam('WorksheetSerifBold'),
    fontSize: 8,
    color: '#555555',
    marginHorizontal: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Definitions block
  definitionsBox: {
    borderWidth: 2,
    borderColor: '#111111',
    borderStyle: 'solid',
    backgroundColor: '#fffdf5',
    padding: 10,
    marginBottom: 12,
  },
  blockTitle: {
    ...fam('WorksheetSerifBold'),
    fontSize: 12,
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  blockSub: { fontSize: 9, color: '#555555', marginBottom: 8 },
  definitionText: { fontSize: 10, color: '#111111', lineHeight: 1.4, marginBottom: 2 },
  definitionNum: { ...fam('WorksheetSerifBold'), fontSize: 10 },
  copyLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    borderBottomStyle: 'solid',
    height: 16,
    marginBottom: 6,
    marginLeft: 12,
  },

  // Demonstration
  problemBlock: { marginBottom: 14 },
  problemHead: { flexDirection: 'row', marginBottom: 6 },
  problemNumber: {
    ...fam('WorksheetSerifBold'),
    fontSize: 12,
    width: 22,
    color: '#111111',
  },
  questionText: { fontSize: 11, color: '#111111', lineHeight: 1.4, flex: 1 },
  stepRow: { flexDirection: 'row', marginBottom: 8 },
  stepMain: { flex: 1, paddingRight: 8 },
  stepText: { fontSize: 10, color: '#444444', lineHeight: 1.4 },
  stepNum: { ...fam('WorksheetSerifBold'), fontSize: 10, color: '#555555' },
  blankChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderStyle: 'solid',
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 9,
    color: '#1e3a8a',
  },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 3 },
  reasonLabel: { ...fam('WorksheetSerifBold'), fontSize: 10, color: '#555555', marginRight: 4 },
  reasonBlank: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    height: 14,
    flex: 1,
  },
  genericPrompt: { fontSize: 9, color: '#555555', marginTop: 3 },
  marginCol: {
    width: 110,
    borderLeftWidth: 2,
    borderLeftColor: '#111111',
    borderLeftStyle: 'solid',
    paddingLeft: 5,
  },
  marginPrompt: { fontSize: 8, color: '#555555', lineHeight: 1.3 },
  answerLine: { flexDirection: 'row', marginTop: 4 },
  answerLabel: { ...fam('WorksheetSerifBold'), fontSize: 10, color: '#111111', marginRight: 4 },
  answerText: { fontSize: 10, color: '#444444' },
  diagramBox: { marginTop: 6, alignSelf: 'flex-start' },

  // Narration + error log
  narrationBox: {
    borderWidth: 2,
    borderColor: '#111111',
    borderStyle: 'solid',
    padding: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  writeLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#999999',
    borderBottomStyle: 'solid',
    height: 18,
    marginBottom: 4,
  },
  errorLogBox: {
    borderWidth: 1,
    borderColor: '#999999',
    borderStyle: 'solid',
    padding: 8,
  },
  errorCols: { flexDirection: 'row', gap: 12 },
  errorCol: { flex: 1 },
  errorHead: { ...fam('WorksheetSerifBold'), fontSize: 9, color: '#555555', marginBottom: 2 },

  // Footer / answer key
  footer: {
    position: 'absolute',
    bottom: '0.4in',
    left: '0.75in',
    right: '0.75in',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#999999',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  footerText: { fontSize: 8, color: '#999999' },
  keyTitle: {
    ...fam('WorksheetSerifBold'),
    fontSize: 20,
    textAlign: 'center',
    color: '#111111',
  },
  keyWarning: {
    ...fam('WorksheetSerifBold'),
    fontSize: 10,
    textAlign: 'center',
    color: '#b91c1c',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  keyRow: { flexDirection: 'row', marginBottom: 7 },
  keyNumber: { ...fam('WorksheetSerifBold'), fontSize: 11, width: 26, color: '#111111' },
  keyAnswer: { fontSize: 11, color: '#111111', flex: 1, lineHeight: 1.4 },
  });
}

type ClassicalStyles = ReturnType<typeof createStyles>;
const classicalStylesCache = new Map<string, ClassicalStyles>();
function getClassicalStyles(fontFamily: 'serif' | 'sans'): ClassicalStyles {
  let s = classicalStylesCache.get(fontFamily);
  if (!s) {
    s = createStyles(fontFamily);
    classicalStylesCache.set(fontFamily, s);
  }
  return s;
}

// ── One demonstration step ────────────────────────────────────────────────────

function PdfClassicalStep({
  step,
  stepIndex,
  marginPrompt,
  styles,
}: {
  step: ProblemStep;
  stepIndex: number;
  marginPrompt: string;
  styles: ClassicalStyles;
}) {
  return (
    <View style={styles.stepRow} wrap={false}>
      <View style={styles.stepMain}>
        <Text style={styles.stepText}>
          <Text style={styles.stepNum}>Step {stepIndex + 1}. </Text>
          {pdfSafeText(step.instruction)}
          {step.blanks?.map((b, i) => (
            // Classical mode is Review-like: answers shown, reasoning blanked.
            <Text key={i} style={styles.blankChip}>
              {' '}{pdfSafeText(b.answer)}{' '}
            </Text>
          ))}
        </Text>
        {step.reason ? (
          <View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <View style={styles.reasonBlank} />
          </View>
        ) : (
          <Text style={styles.genericPrompt}>{pdfSafeText(GENERIC_MARGIN_PROMPT)}</Text>
        )}
      </View>
      <View style={styles.marginCol}>
        <Text style={styles.marginPrompt}>{pdfSafeText(marginPrompt)}</Text>
      </View>
    </View>
  );
}

// ── Answer-key line (reasons revealed, teacher use only) ─────────────────────

/**
 * One-line printable answer for the classical-notes answer key. Unlike the
 * student worksheet, the key reveals each step's reason.
 */
export function formatClassicalKeyLine(p: MathProblem): string {
  const reasons = classicalSteps(p)
    .map((s, i) => (s.reason ? `Step ${i + 1}: ${s.reason}` : null))
    .filter((r): r is string => r !== null);
  const base = formatAnswer(p);
  return reasons.length > 0
    ? `${base}, Reasons: ${reasons.join('; ')}`
    : base;
}

// ── Section (embeddable in PdfDocument.tsx) ───────────────────────────────────

export interface ClassicalNotesPdfSectionProps {
  entryId: string;
  problems: MathProblem[];
  seed?: number;
  startIndex?: number;
  sectionLabel?: string;
  teksBadge?: string;
  /** Version presentation; only the font token is consumed here. Defaults to DEFAULT_PRESENTATION (sans). */
  presentation?: Presentation;
}

export function ClassicalNotesPdfSection({
  entryId,
  problems,
  seed = 1,
  startIndex = 0,
  sectionLabel,
  teksBadge,
  presentation = DEFAULT_PRESENTATION,
}: ClassicalNotesPdfSectionProps) {
  const styles = getClassicalStyles(presentation.fontFamily);
  const definitions = getClassicalDefinitions(entryId);
  const stepLists = problems.map(classicalSteps);
  const totalSteps = stepLists.reduce((n, steps) => n + steps.length, 0);
  const marginPrompts = assignMarginPrompts(seed, totalSteps);
  let promptCursor = 0;
  const promptsFor = (count: number) => {
    const slice = marginPrompts.slice(promptCursor, promptCursor + count);
    promptCursor += count;
    return slice;
  };

  return (
    <View>
      {/* Section heading */}
      {(sectionLabel || teksBadge) && (
        <View style={styles.sectionHead}>
          <View style={styles.sectionRule} />
          <Text style={styles.sectionLabel}>
            {pdfSafeText(teksBadge ? `${teksBadge}, ${sectionLabel ?? 'Classical Notes'}` : sectionLabel ?? 'Classical Notes')}
          </Text>
          <View style={styles.sectionRule} />
        </View>
      )}

      {/* 1. DEFINITIONS block */}
      {definitions && definitions.length > 0 && (
        <View style={styles.definitionsBox}>
          <Text style={styles.blockTitle}>Definitions</Text>
          <Text style={styles.blockSub}>Copy each definition exactly as written.</Text>
          {definitions.map((d, i) => (
            <View key={i} wrap={false}>
              <Text style={styles.definitionText}>
                <Text style={styles.definitionNum}>{i + 1}. </Text>
                {pdfSafeText(d)}
              </Text>
              <View style={styles.copyLine} />
              <View style={styles.copyLine} />
            </View>
          ))}
        </View>
      )}

      {/* 2 + 3. DEMONSTRATION with margin prompts */}
      {problems.map((p, pi) => {
        const q = problemToQuestion(p, startIndex + pi);
        const steps = stepLists[pi];
        const stepPrompts = promptsFor(steps.length);
        const diagram = classicalDiagram(p);
        return (
          <View key={pi} style={styles.problemBlock}>
            <View style={styles.problemHead} wrap={false}>
              <Text style={styles.problemNumber}>{startIndex + pi + 1}.</Text>
              <Text style={styles.questionText}>{pdfSafeText(q.text)}</Text>
            </View>
            {steps.map((s, si) => (
              <PdfClassicalStep
                key={si}
                step={s}
                stepIndex={si}
                marginPrompt={stepPrompts[si] ?? GENERIC_MARGIN_PROMPT}
                styles={styles}
              />
            ))}
            <View style={styles.answerLine} wrap={false}>
              <Text style={styles.answerLabel}>Answer:</Text>
              <Text style={styles.answerText}>{pdfSafeText(formatAnswer(p))}</Text>
            </View>
            {diagram && (
              <View style={styles.diagramBox} wrap={false}>
                {diagram.kind.startsWith('Proof') ? (
                  <PdfProofSVG params={diagram as unknown as ProofSVGParams} />
                ) : (
                  <PdfGeometrySVG params={diagram as unknown as Parameters<typeof PdfGeometrySVG>[0]['params']} />
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* 4. NARRATION box + error log */}
      <View style={styles.narrationBox} wrap={false}>
        <Text style={styles.blockTitle}>Narration</Text>
        <Text style={styles.blockSub}>Explain this idea in your own words.</Text>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.writeLine} />
        ))}
      </View>
      <View style={styles.errorLogBox} wrap={false}>
        <Text style={styles.blockTitle}>Error log</Text>
        <View style={styles.errorCols}>
          <View style={styles.errorCol}>
            <Text style={styles.errorHead}>My mistake</Text>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.writeLine} />
            ))}
          </View>
          <View style={styles.errorCol}>
            <Text style={styles.errorHead}>My correction</Text>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.writeLine} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Standalone document (tests, direct use) ───────────────────────────────────

export interface ClassicalNotesPdfDocumentProps {
  title: string;
  entryId: string;
  problems: MathProblem[];
  seed?: number;
  sectionLabel?: string;
  teksBadge?: string;
  standard?: string;
  includeAnswerKey?: boolean;
  /** Version presentation; defaults to DEFAULT_PRESENTATION (sans). */
  presentation?: Presentation;
}

export default function ClassicalNotesPdfDocument({
  title,
  entryId,
  problems,
  seed = 1,
  sectionLabel,
  teksBadge,
  standard = 'Texas TEKS Geometry',
  includeAnswerKey = false,
  presentation = DEFAULT_PRESENTATION,
}: ClassicalNotesPdfDocumentProps) {
  const styles = getClassicalStyles(presentation.fontFamily);
  const renderFooter = () => (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{standard}</Text>
      <Text style={styles.footerText}>
        Euclid Engine, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </Text>
    </View>
  );

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerWrapper}>
          <View style={styles.headerRule}>
            <Text style={styles.title}>{pdfSafeText(title)}</Text>
            <Text style={styles.modeLabel}>Classical Notes</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>Name: </Text>
              <View style={[styles.infoBlank, { width: 160 }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
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
          <View style={styles.directionsBox}>
            <Text>
              <Text style={styles.directionsBold}>Directions: </Text>
              <Text style={styles.directionsText}>
                Study each demonstration step. Write the missing reason on each ruled line, answer the margin questions, then narrate the idea in your own words.
              </Text>
            </Text>
          </View>
        </View>

        <ClassicalNotesPdfSection
          entryId={entryId}
          problems={problems}
          seed={seed}
          sectionLabel={sectionLabel}
          teksBadge={teksBadge}
          presentation={presentation}
        />

        {renderFooter()}
      </Page>

      {includeAnswerKey && (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.headerWrapper}>
            <View style={styles.headerRule}>
              <Text style={styles.keyTitle}>ANSWER KEY</Text>
              <Text style={styles.keyWarning}>Do not distribute, teacher use only</Text>
              <Text style={styles.modeLabel}>{pdfSafeText(title)}</Text>
            </View>
          </View>
          <View>
            {problems.map((p, i) => (
              <View key={i} style={styles.keyRow} wrap={false}>
                <Text style={styles.keyNumber}>{i + 1}.</Text>
                <Text style={styles.keyAnswer}>{pdfSafeText(formatClassicalKeyLine(p))}</Text>
              </View>
            ))}
          </View>
          {renderFooter()}
        </Page>
      )}
    </Document>
  );
}

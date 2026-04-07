// PdfDocument.tsx
// PDF export engine — Classical Academy style.
// Enforces US Letter (8.5" × 11") via @react-pdf/renderer `size="LETTER"`.
// Typography: Times-Roman (built-in PDF serif that approximates Times New Roman).
// Layout guarantees:
//   • Header box with double-rule border, centered title, Name/Date/Period slots.
//   • Each problem container uses `wrap={false}` so a diagram and its answer
//     table never split across page breaks.

import React from 'react';
import {
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
import { Question } from '../core/types';

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
    fontFamily: 'Times-Roman',
  },

  // ── Classical Academy header ──
  headerWrapper: {
    marginBottom: 14,
  },
  headerTopRule: {
    borderTopWidth: 3,
    borderTopColor: '#1e293b',
    borderTopStyle: 'solid',
    paddingTop: 5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    borderBottomStyle: 'solid',
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    textAlign: 'center',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  modeLabel: {
    fontFamily: 'Times-Roman',
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
    fontFamily: 'Times-Roman',
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
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#475569',
  },
  directionsBold: {
    fontFamily: 'Times-Bold',
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
    fontFamily: 'Times-Bold',
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
    fontFamily: 'Times-Bold',
    fontSize: 12,
    width: 22,
    color: '#0f172a',
  },
  problemContent: {
    flex: 1,
  },
  questionText: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 1.5,
  },

  // Diagram placeholder box
  diagramBox: {
    marginTop: 6,
    marginBottom: 6,
    height: 90,
    width: 90,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
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
    borderLeftColor: '#66d9cc',
    borderLeftStyle: 'solid',
    backgroundColor: '#f8fafc',
  },
  scaffoldStep: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  scaffoldText: {
    fontFamily: 'Times-Roman',
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
    fontFamily: 'Times-Bold',
    fontSize: 11,
    color: '#0f172a',
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
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#94a3b8',
  },
});

// ── Diagram primitives ────────────────────────────────────────────────────────

const PdfDiagram = ({ type }: { type: string }) => {
  if (type === 'circle') {
    return (
      <Svg width="80" height="80" viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="40" stroke="#334155" strokeWidth="2" fill="none" />
        <Line x1="50" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="1.5" />
        <Circle cx="50" cy="50" r="2.5" fill="#334155" />
      </Svg>
    );
  }
  if (type === 'surface-area') {
    return (
      <Svg width="80" height="80" viewBox="0 0 100 100">
        <Ellipse cx="50" cy="20" rx="30" ry="10" stroke="#334155" strokeWidth="2" fill="none" />
        <Ellipse cx="50" cy="80" rx="30" ry="10" stroke="#334155" strokeWidth="2" fill="none" />
        <Line x1="20" y1="20" x2="20" y2="80" stroke="#334155" strokeWidth="2" />
        <Line x1="80" y1="20" x2="80" y2="80" stroke="#334155" strokeWidth="2" />
      </Svg>
    );
  }
  if (type === 'angle') {
    return (
      <Svg width="80" height="80" viewBox="0 0 100 100">
        <Line x1="10" y1="30" x2="90" y2="30" stroke="#334155" strokeWidth="2" />
        <Line x1="10" y1="70" x2="90" y2="70" stroke="#334155" strokeWidth="2" />
        <Line x1="30" y1="10" x2="70" y2="90" stroke="#334155" strokeWidth="2" />
      </Svg>
    );
  }
  return null;
};

// ── Section divider component ─────────────────────────────────────────────────

const SectionDivider = ({ label }: { label: string }) => (
  <View style={styles.sectionDivider}>
    <View style={styles.sectionRule} />
    <Text style={styles.sectionLabel}>{label}</Text>
    <View style={styles.sectionRule} />
  </View>
);

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PdfDocumentProps {
  title: string;
  questions: Question[];
  /** 'worksheet' | 'guided-notes' | 'review' | 'test' */
  docType?: string;
  /** Standard(s) covered, shown in footer */
  standard?: string;
}

// ── Document ──────────────────────────────────────────────────────────────────

export default function PdfDocument({
  title,
  questions,
  docType = 'worksheet',
  standard = 'Texas TEKS Geometry',
}: PdfDocumentProps) {
  const modeLabel =
    docType === 'guided-notes'
      ? 'Guided Notes'
      : docType === 'test'
      ? 'Assessment'
      : docType === 'review'
      ? 'Review Practice'
      : 'Practice Worksheet';

  const showScaffold = docType === 'guided-notes' || docType === 'review';
  const showAnswerLine = docType === 'test' || docType === 'worksheet';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>

        {/* ── Classical Academy Header ── */}
        <View style={styles.headerWrapper}>
          {/* Double-rule title block */}
          <View style={styles.headerTopRule}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.modeLabel}>{modeLabel}</Text>
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
        </View>

        {/* ── Problems ── */}
        <View>
          {questions.map((q) => (
            // wrap={false} — diagram + answer table never split across pages
            <View key={q.id} style={styles.problemRow} wrap={false}>
              <Text style={styles.problemNumber}>{q.id}.</Text>

              <View style={styles.problemContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.questionText}>{q.text}</Text>

                    {/* Scaffolding (guided-notes / review mode) */}
                    {showScaffold && q.scaffolding && (
                      <View style={styles.scaffoldBox}>
                        {q.scaffolding.map((step, idx) => (
                          <View key={idx} style={styles.scaffoldStep}>
                            <Text style={styles.scaffoldText}>{step.text}</Text>
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
                  <View style={styles.diagramBox}>
                    <PdfDiagram type={q.diagramType || ''} />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{standard}</Text>
          <Text style={styles.footerText}>
            MathViz — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

      </Page>
    </Document>
  );
}

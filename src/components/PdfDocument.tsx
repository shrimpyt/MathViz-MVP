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
import { PdfGeometrySVG } from "./PdfGeometrySVG";
import { MathProblem } from "@/lib/ProblemFactory";


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
    borderTopColor: '#172336',
    borderTopStyle: 'solid',
    paddingTop: 5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#172336',
    borderBottomStyle: 'solid',
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 20,
    textAlign: 'center',
    color: '#172336',
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
    color: '#172336',
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
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#94a3b8',
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
  return null;
};

// ── Section divider component ─────────────────────────────────────────────────

// ── Props ─────────────────────────────────────────────────────────────────────

export interface PdfDocumentProps {
  title: string;
  questions: Question[];
  advancedProblems?: MathProblem[];
  /** 'worksheet' | 'guided-notes' | 'review' | 'test' */
  docType?: string;
  /** Standard(s) covered, shown in footer */
  standard?: string;
}

// ── Document ──────────────────────────────────────────────────────────────────

export default function PdfDocument({
  title,
  questions,
  advancedProblems,
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
                  {q.diagramType && (
                    <View style={styles.diagramBox}>
                      {advancedProblems && advancedProblems[q.id - 1] ? (
                        <PdfGeometrySVG params={advancedProblems[q.id - 1].svgParams} />
                      ) : (
                        <PdfDiagram type={q.diagramType} data={q.diagramData} />
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{standard}</Text>
          <Text style={styles.footerText}>
            Euclid Engine — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

      </Page>
    </Document>
  );
}

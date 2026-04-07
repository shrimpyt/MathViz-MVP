import React from 'react';
import { Page, Text, View, Document, StyleSheet, Svg, Circle, Line, Ellipse } from '@react-pdf/renderer';
import { Question } from '../core/types';

const styles = StyleSheet.create({
  page: {
    padding: '0.5in',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
    fontSize: 12,
  },
  questionsContainer: {
    flexDirection: 'column',
  },
  questionRow: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 25,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 12,
    marginBottom: 8,
  },
  scaffoldBox: {
    marginTop: 10,
    marginLeft: 10,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#66d9cc',
    backgroundColor: '#f8f9fa',
  },
  scaffoldStep: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'baseline',
  },
  scaffoldText: {
    fontSize: 11,
    color: '#333333',
  },
  blankLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginLeft: 5,
    marginTop: 10,
  },
  workSpace: {
    height: 100,
  }
});

interface PdfDocumentProps {
  title: string;
  questions: Question[];
}

const PdfDiagram = ({ type }: { type: string }) => {
  if (type === 'circle') {
    return (
      <Svg width="100" height="100" viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="40" stroke="black" strokeWidth="2" fill="none" />
        <Line x1="50" y1="50" x2="90" y2="50" stroke="black" strokeWidth="2" />
        <Circle cx="50" cy="50" r="2" fill="black" />
      </Svg>
    );
  }
  if (type === 'surface-area') {
    return (
      <Svg width="100" height="100" viewBox="0 0 100 100">
        <Ellipse cx="50" cy="20" rx="30" ry="10" stroke="black" strokeWidth="2" fill="none" />
        <Ellipse cx="50" cy="80" rx="30" ry="10" stroke="black" strokeWidth="2" fill="none" />
        <Line x1="20" y1="20" x2="20" y2="80" stroke="black" strokeWidth="2" />
        <Line x1="80" y1="20" x2="80" y2="80" stroke="black" strokeWidth="2" />
      </Svg>
    );
  }
  if (type === 'angle') {
    return (
      <Svg width="100" height="100" viewBox="0 0 100 100">
        <Line x1="10" y1="30" x2="90" y2="30" stroke="black" strokeWidth="2" />
        <Line x1="10" y1="70" x2="90" y2="70" stroke="black" strokeWidth="2" />
        <Line x1="30" y1="10" x2="70" y2="90" stroke="black" strokeWidth="2" />
      </Svg>
    );
  }
  return null;
};

export default function PdfDocument({ title, questions }: PdfDocumentProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Name: ______________________</Text>
            <Text style={styles.infoText}>Date: ________</Text>
          </View>
        </View>
        <View style={styles.questionsContainer}>
          {questions.map((q) => (
            <View key={q.id} style={styles.questionRow} wrap={false}>
              <Text style={styles.questionNumber}>{q.id}.</Text>
              <View style={styles.questionContent}>
                <Text style={styles.questionText}>{q.text}</Text>

                {q.scaffolding && (
                    <View style={styles.scaffoldBox}>
                        {q.scaffolding.map((step, idx) => (
                            <View key={idx} style={styles.scaffoldStep}>
                                <Text style={styles.scaffoldText}>{step.text}</Text>
                                {step.blankLength && (
                                    <View style={[styles.blankLine, { width: step.blankLength * 5 }]} />
                                )}
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ marginTop: 10, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PdfDiagram type={q.diagramType || ''} />
                </View>

                {!q.scaffolding && (
                    <View style={styles.workSpace} />
                )}
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

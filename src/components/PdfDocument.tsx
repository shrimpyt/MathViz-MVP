import React from 'react';
import { Page, Text, View, Document, StyleSheet, Svg, Circle, Line, Ellipse } from '@react-pdf/renderer';

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
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 20,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 12,
  },
  diagramPlaceholder: {
    marginTop: 10,
    height: 100,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderStyle: 'dashed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#666666',
  }
});

interface Question {
  id: number;
  text: string;
  points: number;
  diagramType?: string;
}

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
                <View style={{ marginTop: 10, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PdfDiagram type={q.diagramType || ''} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

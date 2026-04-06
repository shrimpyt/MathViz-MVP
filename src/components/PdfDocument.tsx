import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

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
}

interface PdfDocumentProps {
  title: string;
  questions: Question[];
}

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
                <View style={styles.diagramPlaceholder}>
                    <Text style={styles.placeholderText}>[ Diagram Placeholder ]</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

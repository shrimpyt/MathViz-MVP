import React from 'react';
import { DiagramData } from './WorksheetGenerator';
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
  diagramData?: DiagramData;
}


interface PdfDocumentProps {
  title: string;
  questions: Question[];
}



const PdfDiagram = ({ type, data }: { type: string, data?: DiagramData }) => {
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
                    <PdfDiagram type={q.diagramType || ''} data={q.diagramData} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

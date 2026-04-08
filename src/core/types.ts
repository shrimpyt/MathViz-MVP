import type { MathProblem, OutputMode } from '@/lib/ProblemFactory';

/** Basic document type for the simple Question-based preview */
export type DocumentType = 'worksheet' | 'guided-notes' | 'review' | 'test';

export interface ScaffoldingStep {
  text: string;
  blankLength?: number;
}


export type DiagramData = {
  angle?: number;
  radius?: number;
  height?: number;
  angleValue?: number;
};

export interface Question {
  id: number;
  text: string;
  points: number;
  diagramType?: string;
  diagramData?: DiagramData;
  scaffolding?: ScaffoldingStep[];
}


export interface Lesson {
  id: string;
  title: string;
  standard: string;
  generateQuestions: (count: number, docType: DocumentType) => Question[];
  /**
   * Advanced generator: returns MathProblem[] for use with EuclidEngine.
   * When present, the WorksheetGenerator uses EuclidEngine for the preview.
   */
  generateProblems?: (mode: OutputMode, seed: number) => MathProblem[];
}

export interface StoryModule {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Curriculum {
  modules: StoryModule[];
}

export function problemToQuestion(p: MathProblem, idx: number): Question {
  if (p.type === 'G.12A') {
    const entries = Object.entries(p.given);
    const givenStr = entries.map(([k, v]) => `${k} = ${v}°`).join(', ');
    return {
      id: idx + 1,
      text: `Given ${givenStr}. Find the ${p.find}.`,
      points: 10,
      diagramType: 'circle',
      scaffolding: p.steps.map(s => ({ text: s.instruction })),
    };
  }
  if (p.type === 'G.13B') {
    return {
      id: idx + 1,
      text:
        p.subtype === 'ConcentricCircles'
          ? `A dart lands randomly on a target. Outer radius R = ${p.outerR}, inner radius r = ${p.innerR}. Find P(inner circle).`
          : `A spinner has a shaded sector of ${p.sectorAngle}°. Find P(shaded).`,
      points: 10,
      diagramType: 'circle',
      scaffolding: p.steps.map(s => ({ text: s.instruction })),
    };
  }
  // G.6B
  if (p.type === 'G.6B') {
    return {
      id: idx + 1,
      text: `Given: ${p.given.join('; ')}. ${p.find}.`,
      points: 10,
      diagramType: 'angle',
      scaffolding: p.steps.map(s => ({ text: s.instruction })),
    };
  }
  return {
    id: idx + 1,
    text: `Problem`,
    points: 10
  }
}

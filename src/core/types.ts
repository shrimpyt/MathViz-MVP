export type DocumentType = 'worksheet' | 'guided-notes';

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

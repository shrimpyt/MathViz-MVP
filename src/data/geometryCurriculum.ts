import { Curriculum, DocumentType, Question } from '../core/types';

// Helper for consistent pseudo-random generation to avoid React hydration issues
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const geometryCurriculum: Curriculum = {
  modules: [
    {
      id: 'mod-1',
      title: 'StoryModule 1: Foundations of Geometry',
      description: 'Basic undefined terms, angles, and introductory reasoning.',
      lessons: [
        {
          id: 'topic-1-1',
          title: 'Angle Relationships',
          standard: 'G.6(A) TEKS',
          generateQuestions: (count: number, docType: DocumentType) => {
            const qs: Question[] = [];
            for (let i = 0; i < count; i++) {
              const angle = Math.floor(pseudoRandom(i * 10) * 60) + 40;
              const q: Question = {
                id: i + 1,
                text: `Lines L1 and L2 are parallel. If m∠1 = ${angle}°, find the measure of the alternate interior angle.`,
                points: 10,
                diagramType: 'angle',
              };

              if (docType === 'guided-notes') {
                q.scaffolding = [
                  { text: '1. Identify the relationship between the two angles: Alternate Interior.' },
                  { text: '2. Theorem: Alternate interior angles are ', blankLength: 20 },
                  { text: `3. Therefore, m∠2 = m∠1 = ${angle}°` }
                ];
              }
              qs.push(q);
            }
            return qs;
          }
        }
      ]
    },
    {
      id: 'mod-2',
      title: 'StoryModule 2: Circles',
      description: 'Properties of circles, chords, secants, tangents, and angle theorems.',
      lessons: [
        {
          id: 'topic-2-1',
          title: 'Circle Theorems',
          standard: 'G.12(A) TEKS',
          generateQuestions: (count: number, docType: DocumentType) => {
            const qs: Question[] = [];
            for (let i = 0; i < count; i++) {
              const inscribed = Math.floor(pseudoRandom(i * 20) * 40) + 30;
              const q: Question = {
                id: i + 1,
                text: `In circle O, m∠ABC = ${inscribed}°. Find m∠AOC.`,
                points: 10,
                diagramType: 'circle',
              };

              if (docType === 'guided-notes') {
                q.scaffolding = [
                  { text: '1. Identify the inscribed angle: ', blankLength: 10 },
                  { text: '2. Identify the central angle intercepting the same arc: ', blankLength: 10 },
                  { text: '3. Rule: Central Angle = 2 × Inscribed Angle' },
                  { text: `4. m∠AOC = 2 × `, blankLength: 10 },
                  { text: '5. Result: ', blankLength: 10 }
                ];
              }
              qs.push(q);
            }
            return qs;
          }
        }
      ]
    },
    {
      id: 'mod-3',
      title: 'StoryModule 3: Surface Area & Volume',
      description: 'Calculations for 3D solids.',
      lessons: [
        {
          id: 'topic-3-1',
          title: 'Cylinders',
          standard: 'G.11(B) TEKS',
          generateQuestions: (count: number, docType: DocumentType) => {
            const qs: Question[] = [];
            for (let i = 0; i < count; i++) {
              const radius = Math.floor(pseudoRandom(i * 30) * 8) + 2;
              const height = Math.floor(pseudoRandom(i * 40) * 10) + 5;
              const q: Question = {
                id: i + 1,
                text: `Find the surface area of a cylinder with radius ${radius} cm and height ${height} cm.`,
                points: 10,
                diagramType: 'surface-area',
              };

              if (docType === 'guided-notes') {
                q.scaffolding = [
                  { text: '1. Formula for Surface Area: SA = 2πr² + 2πrh' },
                  { text: `2. Substitute r = ${radius} and h = ${height}` },
                  { text: `3. Base Area (2πr²) = 2 × π × (${radius})² = `, blankLength: 15 },
                  { text: `4. Lateral Area (2πrh) = 2 × π × ${radius} × ${height} = `, blankLength: 15 },
                  { text: '5. Total SA = ', blankLength: 20 }
                ];
              }
              qs.push(q);
            }
            return qs;
          }
        }
      ]
    }
  ]
};

import { Curriculum, DocumentType, Question } from '../core/types';
import { AnatomyOfACircle } from '../modules/anatomy-of-a-circle';
import { TargetZone } from '../modules/target-zone';
import { LogicOfCongruence } from '../modules/logic-of-congruence';
import { generateTrigProblems } from '@/lib/factories/TrigonometryFactory';
import type { MathProblem, OutputMode } from '@/lib/ProblemFactory';

// Seeded PRNG — imported from canonical source
import { mulberry32 } from '@/lib/math-utils';

// Helper for consistent pseudo-random generation to avoid React hydration issues
const pseudoRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// ── Helper: convert a CircleProblem/ProbabilityProblem to the basic Question type
// so EuclidEngine-backed lessons can still serve the basic preview fallback.
function problemToQuestion(p: MathProblem, idx: number): Question {
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
  if (p.type === 'G.9A') {
    return {
      id: idx + 1,
      text: p.subtype === 'IdentifyRatio' 
        ? `Identify the ratio for ${p.ratioType}(θ) given the right triangle.` 
        : `Using trigonometric ratios and the reference angle, solve for ${p.find}.`,
      points: 10,
      diagramType: 'right-triangle',
      scaffolding: p.steps.map(s => ({ text: s.instruction })),
    };
  }
  if (p.type === 'G.9B') {
    const entries = Object.entries(p.given);
    const givenStr = entries.map(([k, v]) => `${k} = ${v}`).join(', ');
    return {
      id: idx + 1,
      text: `Given ${givenStr}. Solve for ${p.find}.`,
      points: 10,
      diagramType: 'right-triangle',
      scaffolding: p.steps.map(s => ({ text: s.instruction })),
    };
  }
  // G.6B: Triangle Congruence
  if (p.type === 'G.6B') {
    return {
      id: idx + 1,
      text: `Given: ${p.given.join('; ')}. ${p.find}.`,
      points: 10,
      diagramType: 'angle',
      scaffolding: p.steps.map(s => ({ text: s.instruction })),
    };
  }
  
  // Final fallback
  return {
    id: idx + 1,
    text: "Solve the given geometry problem.",
    points: 10,
    diagramType: 'angle',
    scaffolding: [],
  };
}

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
                diagramData: { angleValue: angle },
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
                diagramData: { angle: inscribed },
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
                diagramData: { radius, height },
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
    },
    // ── Story: Anatomy of a Circle ──────────────────────────────────────────
    {
      id: 'mod-circle-theorems',
      title: 'Anatomy of a Circle',
      description:
        'Master inscribed angles, central angles, tangent-chord angles, intersecting chords, and two-secant angles.',
      lessons: [
        {
          id: 'lesson-g12a',
          title: 'Circle Theorems — Full Survey',
          standard: 'G.12(A) TEKS',
          generateProblems: (mode: OutputMode, seed: number): MathProblem[] => {
            const rng = mulberry32(seed);
            const count = mode === 'Review' ? 9 : 3;
            return AnatomyOfACircle.generateMany(count, rng);
          },
          generateQuestions: (count: number, docType: DocumentType): Question[] => {
            const rng = mulberry32(1234);
            const problems = AnatomyOfACircle.generateMany(count, rng);
            return problems.map((p, i) => problemToQuestion(p, i));
          },
        },
      ],
    },

    // ── Story: Target Zone ──────────────────────────────────────────────────
    {
      id: 'mod-target-zone',
      title: 'Target Zone',
      description:
        'Calculate the probability a dart hits the bullseye — or a spinner lands on the shaded region.',
      lessons: [
        {
          id: 'lesson-g13b',
          title: 'Area-Based Probability',
          standard: 'G.13(B) TEKS',
          generateProblems: (mode: OutputMode, seed: number): MathProblem[] => {
            const rng = mulberry32(seed);
            const count = mode === 'Review' ? 6 : 2;
            return TargetZone.generateMany(count, rng);
          },
          generateQuestions: (count: number, docType: DocumentType): Question[] => {
            const rng = mulberry32(5678);
            const problems = TargetZone.generateMany(count, rng);
            return problems.map((p, i) => problemToQuestion(p, i));
          },
        },
      ],
    },

    // ── Story: Logic of Congruence ──────────────────────────────────────────
    {
      id: 'mod-congruence',
      title: 'Logic of Congruence',
      description:
        'Prove two triangles are congruent using SSS, SAS, ASA, AAS, or HL in structured two-column proofs.',
      lessons: [
        {
          id: 'lesson-g6b',
          title: 'Triangle Congruence Proofs',
          standard: 'G.6(B) TEKS',
          generateProblems: (mode: OutputMode, seed: number): MathProblem[] => {
            const rng = mulberry32(seed);
            const count = mode === 'Review' ? 6 : 2;
            return LogicOfCongruence.generateMany(count, rng);
          },
          generateQuestions: (count: number, docType: DocumentType): Question[] => {
            const rng = mulberry32(9012);
            const problems = LogicOfCongruence.generateMany(count, rng);
            return problems.map((p, i) => problemToQuestion(p, i));
          },
        },
      ],
    },

    // ── Story: SOH CAH TOA ──────────────────────────────────────────────────
    {
      id: 'mod-trig',
      title: 'Right Triangles & Trigonometry',
      description:
        'Master the fundamental trigonometric ratios: Sine, Cosine, and Tangent.',
      lessons: [
        {
          id: 'lesson-g9a-ratios',
          title: 'Introduction to Trig Ratios',
          standard: 'G.9(A) TEKS',
          generateProblems: (mode: OutputMode, seed: number): MathProblem[] => {
            const rng = mulberry32(seed);
            const count = mode === 'Review' ? 6 : 3;
            return generateTrigProblems(rng, count, ["IdentifyRatio"]);
          },
          generateQuestions: (count: number, docType: DocumentType): Question[] => {
            const rng = mulberry32(9013);
            const problems = generateTrigProblems(rng, count, ["IdentifyRatio"]);
            return problems.map((p, i) => problemToQuestion(p, i));
          },
        },
        {
          id: 'lesson-g9a-sides',
          title: 'Solving for Missing Sides',
          standard: 'G.9(A) TEKS',
          generateProblems: (mode: OutputMode, seed: number): MathProblem[] => {
            const rng = mulberry32(seed);
            const count = mode === 'Review' ? 6 : 3;
            return generateTrigProblems(rng, count, ["SolveForSide"]);
          },
          generateQuestions: (count: number, docType: DocumentType): Question[] => {
            const rng = mulberry32(9014);
            const problems = generateTrigProblems(rng, count, ["SolveForSide"]);
            return problems.map((p: MathProblem, i: number) => problemToQuestion(p, i));
          },
        },
        {
          id: 'lesson-g9a-angles',
          title: 'Solving for Missing Angles',
          standard: 'G.9(A) TEKS',
          generateProblems: (mode: OutputMode, seed: number): MathProblem[] => {
            const rng = mulberry32(seed);
            const count = mode === 'Review' ? 6 : 3;
            return generateTrigProblems(rng, count, ["SolveForAngle"]);
          },
          generateQuestions: (count: number, docType: DocumentType): Question[] => {
            const rng = mulberry32(9015);
            const problems = generateTrigProblems(rng, count, ["SolveForAngle"]);
            return problems.map((p: MathProblem, i: number) => problemToQuestion(p, i));
          },
        },
      ],
    },
  ]
};

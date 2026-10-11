import type { MathProblem, OutputMode } from '@/lib/ProblemFactory';
import { latexToText, givenKeyName } from '@/lib/answerKey';

/** Basic document type for the simple Question-based preview */
export type DocumentType =
  | 'worksheet' | 'guided-notes' | 'review' | 'test' | 'classical-notes'
  | 'proof-two-column'   // full two-column proofs (answers per answer-key toggle)
  | 'proof-fill-reasons' // statements given, reasons blanked for the student
  | 'proof-elements'     // classical Elements exposition (enunciation → Q.E.D.)
  | 'sat-practice';      // timed SAT-style practice module

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
    const givenStr = entries.map(([k, v]) => `${givenKeyName(k)} = ${v}°`).join(', ');
    return {
      id: idx + 1,
      text: `Given ${givenStr}. Find the ${p.find}.`,
      points: 10,
      diagramType: 'circle',
      scaffolding: p.steps.map(s => ({ text: latexToText(s.instruction) })),
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
      scaffolding: p.steps.map(s => ({ text: latexToText(s.instruction) })),
    };
  }
  // G.6B
  if (p.type === 'G.6B') {
    return {
      id: idx + 1,
      text: `Given: ${p.given.join('; ')}. ${p.find}.`,
      points: 10,
      diagramType: 'angle',
      scaffolding: p.steps.map(s => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'G.9A' || p.type === 'G.9B') {
    return {
      id: idx + 1,
      text: p.type === 'G.9B' 
        ? `Solve for the missing side in the ${p.subtype} triangle.`
        : p.subtype === 'IdentifyRatio' 
        ? `Find the value of ${p.ratioType} θ in the triangle below.`
        : p.subtype === 'SolveForSide'
        ? `Find the value of ${p.find} to the nearest tenth.`
        : `Find the measure of angle ${p.find} to the nearest degree.`,
      points: 10,
      diagramType: 'right-triangle',
      diagramData: p.svgParams as unknown as Record<string, unknown>,
      scaffolding: p.steps.map(s => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'G.2B') {
    return {
      id: idx + 1,
      text: `Given points ${p.p1.label}(${p.p1.x}, ${p.p1.y}) and ${p.p2.label}(${p.p2.x}, ${p.p2.y}). Find the ${p.find}.`,
      points: 10,
      diagramType: 'coordinate',
      scaffolding: p.steps.map(s => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'G.12B') {
    return {
      id: idx + 1,
      text: `A circle has a radius of ${p.radius}. Find the ${p.find}.`,
      points: 10,
      diagramType: 'circle',
      scaffolding: p.steps.map(s => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'Proof') {
    return {
      id: idx + 1,
      text: p.elementsProposition
        ? `Euclid's Elements, Proposition ${p.elementsProposition}.`
        : `Given: ${p.given.join('; ')}. Prove: ${p.prove}.`,
      points: 10,
      diagramType: 'proof',
      scaffolding: p.steps.map((s) => ({ text: latexToText(s.statement) })),
    };
  }
  if ((p as { type: string }).type.startsWith('A.')) {
    const ap = p as import('@/lib/factories/Algebra1Types').Algebra1Problem;
    return {
      id: idx + 1,
      text: ap.prompt,
      points: 10,
      diagramType: ap.graph ? `algebra-${ap.graph.kind}` : undefined,
      scaffolding: ap.steps.map((s) => ({ text: latexToText(s.instruction) })),
    };
  }
  if (
    p.type === 'A2.4' || p.type === 'A2.5' || p.type === 'A2.7' ||
    p.type === 'A2.8' || p.type === 'A2.11' || p.type === 'A2.12' ||
    p.type === 'A2.S' || p.type === 'A2.C'
  ) {
    const givenEntries = Object.entries(p.given);
    const givenStr = givenEntries.map(([k, v]) => `${givenKeyName(k)} = ${v}`).join(', ');
    return {
      id: idx + 1,
      text: `Given ${givenStr}. Find the ${p.find}.`,
      points: 10,
      scaffolding: p.steps.map((s) => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'MS.6' || p.type === 'MS.7' || p.type === 'MS.8') {
    return {
      id: idx + 1,
      text: p.prompt,
      points: 10,
      scaffolding: p.steps.map((s) => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'SAT') {
    return {
      id: idx + 1,
      text: p.stem,
      points: 10,
      diagramType: p.diagram ? 'sat-diagram' : undefined,
      diagramData: p.diagram as unknown as Record<string, unknown>,
      scaffolding:
        p.format === 'MCQ'
          ? p.options!.map((o) => ({ text: `(${o.option}) ${latexToText(o.label)}` }))
          : [{ text: '[Student-produced response — grid-in]' }],
    };
  }
  if (p.type === 'PRECALC_MCQ') {
    return {
      id: idx + 1,
      text: p.stem,
      points: 10,
      diagramType: p.svgParams?.kind ?? '',
      diagramData: p.svgParams as unknown as Record<string, unknown>,
      scaffolding: p.steps.map((s) => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'CALC_MCQ') {
    return {
      id: idx + 1,
      text: p.prompt,
      points: 10,
      diagramType: 'calc-graph',
      diagramData: p.graph as unknown as Record<string, unknown>,
      scaffolding: (p.steps ?? []).map((s) => ({ text: latexToText(s.instruction) })),
    };
  }
  if (p.type === 'AP_FRQ') {
    const stim = p.stimulus;
    const stimText =
      stim.kind === 'scenario' ? stim.text :
      stim.kind === 'table' ? (stim.caption ?? 'Use the table.') :
      (stim.caption ?? 'Use the graph.');
    const isPrecalc = p.subject === 'precalc';
    return {
      id: idx + 1,
      text: `${stimText} ${p.subparts.map((s) => `(${s.label}) ${s.prompt}`).join(' ')}`,
      points: p.subparts.reduce((t, s) => t + (s.points ?? 0), 0),
      diagramType: isPrecalc
        ? (stim.kind === 'graph' ? stim.graphKind : stim.kind)
        : (stim.kind === 'graph' ? 'calc-graph' : stim.kind === 'table' ? 'calc-table' : undefined),
      diagramData: isPrecalc
        ? ({ stimulus: stim, subparts: p.subparts } as unknown as Record<string, unknown>)
        : (stim.kind === 'graph' ? (stim.params as unknown as Record<string, unknown>) : undefined),
      scaffolding: p.subparts.map((s) => ({ text: latexToText(s.prompt) })),
    };
  }
  return {
    id: idx + 1,
    text: `Problem ${idx + 1}`,
    points: 10
  };
}

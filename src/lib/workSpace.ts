// workSpace.ts, how much blank room a printed problem gets to work in.
//
// The PDF used to give every problem the same box (about two inches),
// whether it was "-14 - 15" or a three-step word problem. This sizes the
// room by the kind of problem instead. It is a renderer decision, so it
// reads the finished problem (its worked steps, its printed text, whether
// it carries a diagram) and never reaches into a factory.
//
// The numbers are points of blank space between the problem and its answer
// line, before any page-fitting stretch (see pageFit.ts) and before the
// accommodation multipliers (increased spacing, large print).

import type { MathProblem } from './ProblemFactory';

/** Blank room by the number of worked steps behind the answer. */
const BY_STEPS = [42, 42, 66, 90, 108, 124];

/** Choice items: a little scratch room, the circled letter is the answer. */
export const CHOICE_ROOM = 36;
/** SAT grid-in: scratch room above the answer boxes. */
export const GRID_IN_ROOM = 48;
/** A word problem reads longer and needs a line or two more. */
export const WORD_PROBLEM_BONUS = 16;
/** "Graph y = ..." with no printed grid: room to sketch one. */
export const GRAPH_BONUS = 60;
/** Share of the room a diagram problem still needs under its figure... */
export const DIAGRAM_SHARE = 0.4;
/** ...but never less than this. */
export const DIAGRAM_MIN_ROOM = 24;
/** Text longer than this counts as a word problem. */
export const WORD_PROBLEM_CHARS = 120;

export interface WorkSpaceInput {
  problem?: MathProblem;
  /** The printed question text. */
  text: string;
  /** The problem prints a diagram (work fits beside it, so a bit less room). */
  hasDiagram: boolean;
  /** Document type ('worksheet', 'test', 'guided-notes', ...). */
  docType: string;
  /** Guided notes print the steps as fill-in blanks. */
  hasScaffold?: boolean;
  /** The diagram prints beside the text (single-column layouts), leaving a
   *  full-height open area next to it to work in. */
  diagramBeside?: boolean;
}

export interface WorkSpace {
  /** Blank room in points under the problem, before its answer line. */
  room: number;
  /** How much this problem gains from extra room when a page has space to
   *  spare (pageFit.ts shares leftover space by this weight). 0 for problems
   *  with their own place to write. */
  grow: number;
}

/** Work room for one problem, by kind. Room 0 means the problem carries
 *  its own place to write (a proof table, AP free-response lines) or works
 *  beside its diagram. */
export function workSpaceFor({
  problem,
  text,
  hasDiagram,
  docType,
  hasScaffold,
  diagramBeside,
}: WorkSpaceInput): WorkSpace {
  const t = problem?.type as string | undefined;
  if (t === 'Proof' || t === 'AP_FRQ') return { room: 0, grow: 0 };
  if (t === 'PRECALC_MCQ' || t === 'CALC_MCQ') return { room: CHOICE_ROOM, grow: CHOICE_ROOM };
  if (t === 'SAT') {
    const r = (problem as { format?: string }).format === 'GridIn' ? GRID_IN_ROOM : CHOICE_ROOM;
    return { room: r, grow: r };
  }

  const steps = (problem as { steps?: unknown[] } | undefined)?.steps;
  const n = Array.isArray(steps) ? steps.length : 2;
  let room = BY_STEPS[Math.min(Math.max(n, 0), BY_STEPS.length - 1)];
  if (text.length > WORD_PROBLEM_CHARS) room += WORD_PROBLEM_BONUS;
  if (/^\s*(graph|sketch|plot)\b/i.test(text) && !hasDiagram) room += GRAPH_BONUS;
  // Guided notes print every step as a blank, the blanks are the work.
  if (docType === 'guided-notes' && hasScaffold) room *= 0.6;
  const grow = room;
  // Most of the work fits in the open space beside a diagram, so a diagram
  // problem only needs a strip more under it, or none when the diagram
  // stands beside the text.
  if (hasDiagram) room = diagramBeside ? 0 : Math.max(DIAGRAM_MIN_ROOM, room * DIAGRAM_SHARE);
  return { room: Math.round(room), grow: Math.round(grow) };
}

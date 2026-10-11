// PrecalcTypes.ts
// Shared types, diagram schemas, and deterministic helpers for the
// AP Precalculus generators (vectors, complex, conics, trig, limits,
// parametric/polar). Pure + seeded; no JSX.
//
// CONVENTIONS (same as the rest of the codebase):
// - All display strings are PDF-safe plain text (unicode math like θ π √ ≤
//   is fine — DejaVu Serif covers it). No raw LaTeX commands; latexToText()
//   is still applied at render time as a safety net.
// - Difficulty tiers 1|2|3 are cumulative and live in the factories.

import type { RNG } from "../math-utils";
import type { ProblemStep } from "../types";
import type { BaseFRQProblem } from "../apTypes";
import { randInt, pick } from "../math-utils";

// ── Topics & difficulty ───────────────────────────────────────────────────────

export type PrecalcDifficulty = 1 | 2 | 3;

export type PrecalcTopicTag =
  | "vectors"
  | "complex"
  | "conics"
  | "trig"
  | "limits"
  | "parametric-polar";

export const PRECALC_TOPIC_LABELS: Record<PrecalcTopicTag, string> = {
  vectors: "Vectors",
  complex: "Complex Numbers",
  conics: "Conic Sections",
  trig: "Trigonometry & Trig Functions",
  limits: "Introduction to Limits",
  "parametric-polar": "Parametric & Polar",
};

/** Subtypes unlocked at each difficulty tier (cumulative). Factories intersect
 *  their own subtype list with this via allowedSubtypes(). */
export function allowedSubtypes<T extends string>(
  all: readonly T[],
  byTier: Record<PrecalcDifficulty, readonly T[]>,
  difficulty: PrecalcDifficulty
): readonly T[] {
  const unlocked = new Set<T>();
  for (let d = 1 as PrecalcDifficulty; d <= difficulty; d = (d + 1) as PrecalcDifficulty) {
    for (const s of byTier[d]) unlocked.add(s);
  }
  const inter = all.filter((s) => unlocked.has(s));
  return inter.length > 0 ? inter : all;
}

// ── AP multiple-choice problem ────────────────────────────────────────────────

export interface PrecalcMCQ {
  type: "PRECALC_MCQ";
  /** AP flavor: true = calculator-active section, false = no-calculator. */
  calculator: boolean;
  topicTag: PrecalcTopicTag;
  topicLabel: string;
  /** Machine tag for the subtype, e.g. "AddComponents". Used by tests to
   *  independently recompute the answer. */
  subtype: string;
  /** The question stem. PDF-safe plain text. */
  stem: string;
  /** Numeric inputs keyed by name — the independent verification path
   *  recomputes the answer from these alone. */
  givens: Record<string, number>;
  /** Four answer choices, rendered A–D. */
  choices: string[];
  /** Index into choices of the correct answer. */
  correctIndex: number;
  /** "A" | "B" | "C" | "D". */
  answerLetter: string;
  /** Exact text of the correct choice (== choices[correctIndex]). */
  expected: string;
  steps: ProblemStep[];
  svgParams?: PrecalcDiagramParams;
}

// ── AP free-response problem (precalculus subject) ────────────────────────────

export interface PrecalcFRQVerify {
  kind:
    | "trig-graph"
    | "limits-table"
    | "vector-scenario"
    | "polar-graph"
    | "conic-scenario"
    | "complex-plane"
    | "parametric-scenario";
  /** Numeric inputs for independent recomputation of every subpart. */
  inputs: Record<string, number>;
}

/** A BaseFRQProblem (subject "precalc") plus machine-checkable inputs so
 *  tests can independently recompute every subpart answer. Still assignable
 *  to BaseFRQProblem for rendering. */
export interface PrecalcFRQ extends BaseFRQProblem {
  verify: PrecalcFRQVerify;
}

export type PrecalcProblem = PrecalcMCQ | PrecalcFRQ;

// ── Diagram params (JSON-serializable; web + PDF renderers switch on kind) ────

export interface UnitCircleDiagram {
  kind: "unit-circle";
  angleDeg: number;
  radianLabel: string;
  cosText: string;
  sinText: string;
}

export interface VectorArrow {
  dx: number;
  dy: number;
  label: string;
  color: "navy" | "blue" | "red";
  dashed?: boolean;
}

export interface VectorsDiagram {
  kind: "vectors";
  arrows: VectorArrow[];
  /** Half-width of the coordinate range shown. */
  range: number;
}

export interface TrigGraphDiagram {
  kind: "trig-graph";
  fnType: "sin" | "cos";
  a: number;
  b: number;
  /** Phase shift C in the form a·fn(b(x − c)) + d, in radians. */
  c: number;
  d: number;
  xMin: number;
  xMax: number;
}

export interface ConicDiagram {
  kind: "conic";
  conicType: "circle" | "parabola" | "ellipse" | "hyperbola";
  cx: number;
  cy: number;
  a: number;
  b: number;
  /** For parabolas: focal length p (signed). */
  p?: number;
  /** Parabola orientation. */
  orientation?: "up" | "down" | "left" | "right";
  range: number;
  marks?: { x: number; y: number; label: string }[];
}

export interface PolarDiagram {
  kind: "polar-grid";
  points: { r: number; thetaDeg: number; label: string }[];
  rMax: number;
  curve?: { a: number; b: number; curveType: "cardioid-cos" | "limacon-cos" | "circle" };
}

export interface LimitGraphDiagram {
  kind: "limit-graph";
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  /** Open circles (holes). */
  holes: { x: number; y: number }[];
  /** Filled dots. */
  dots: { x: number; y: number }[];
  xRange: [number, number];
  yRange: [number, number];
}

export interface ComplexPlaneDiagram {
  kind: "complex-plane";
  points: { re: number; im: number; label: string }[];
  range: number;
}

export type PrecalcDiagramParams =
  | UnitCircleDiagram
  | VectorsDiagram
  | TrigGraphDiagram
  | ConicDiagram
  | PolarDiagram
  | LimitGraphDiagram
  | ComplexPlaneDiagram;

// ── Number helpers ────────────────────────────────────────────────────────────

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** Reduce a fraction; returns [num, den] with den > 0. */
export function reduceFrac(num: number, den: number): [number, number] {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return [num / g, den / g];
}

export function fracStr(num: number, den: number): string {
  const [n, d] = reduceFrac(num, den);
  if (d === 1) return String(n);
  if (n === 0) return "0";
  return `${n}/${d}`;
}

/** Format a decimal, trimming trailing zeros. Returns "undefined" for
 *  non-finite input (never emitted by factories; defensive only). */
export function fmt(n: number, digits = 3): string {
  if (!isFinite(n)) return "undefined";
  const rounded = Number(n.toFixed(digits));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** Shuffle a copy of arr with the seeded rng. */
export function shuffle<T>(rng: RNG, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Format a complex number a+bi with clean sign handling. */
export function fmtComplex(re: number, im: number): string {
  const reS = fmt(re);
  if (im === 0) return reS;
  const imAbs = Math.abs(im);
  const imPart = imAbs === 1 ? "i" : `${fmt(imAbs)}i`;
  if (re === 0) return im < 0 ? `−${imPart}` : imPart;
  return im < 0 ? `${reS}−${imPart}` : `${reS}+${imPart}`;
}

/** "(x−h)²" style factor for conic equations. varName is "x" or "y". */
export function shiftFactor(varName: "x" | "y", h: number): string {
  if (h === 0) return `${varName}²`;
  const a = Math.abs(h);
  return h > 0 ? `(${varName}−${a})²` : `(${varName}+${a})²`;
}

/** "π/6", "3π/4", "2π", "−π/2" … for a rational multiple num/den of π. */
export function piLabel(num: number, den: number): string {
  const [n, d] = reduceFrac(num, den);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const body = d === 1 ? (abs === 1 ? "π" : `${abs}π`) : abs === 1 ? `π/${d}` : `${abs}π/${d}`;
  return n < 0 ? `−${body}` : body;
}

// ── Exact trig values at standard angles ──────────────────────────────────────

export interface ExactTrig {
  deg: number;
  radNum: number; // numerator of (radNum/radDen)·π
  radDen: number;
  cos: string;
  sin: string;
  tan: string | null; // null at 90°/270° (undefined)
  cosN: number;
  sinN: number;
}

const SQRT2_2 = "√2/2";
const SQRT3_2 = "√3/2";
const SQRT3_3 = "√3/3";

export const EXACT_TRIG: ExactTrig[] = [
  { deg: 0, radNum: 0, radDen: 1, cos: "1", sin: "0", tan: "0", cosN: 1, sinN: 0 },
  { deg: 30, radNum: 1, radDen: 6, cos: SQRT3_2, sin: "1/2", tan: SQRT3_3, cosN: Math.sqrt(3) / 2, sinN: 1 / 2 },
  { deg: 45, radNum: 1, radDen: 4, cos: SQRT2_2, sin: SQRT2_2, tan: "1", cosN: Math.SQRT1_2, sinN: Math.SQRT1_2 },
  { deg: 60, radNum: 1, radDen: 3, cos: "1/2", sin: SQRT3_2, tan: "√3", cosN: 1 / 2, sinN: Math.sqrt(3) / 2 },
  { deg: 90, radNum: 1, radDen: 2, cos: "0", sin: "1", tan: null, cosN: 0, sinN: 1 },
  { deg: 120, radNum: 2, radDen: 3, cos: "−1/2", sin: SQRT3_2, tan: "−√3", cosN: -1 / 2, sinN: Math.sqrt(3) / 2 },
  { deg: 135, radNum: 3, radDen: 4, cos: `−${SQRT2_2}`, sin: SQRT2_2, tan: "−1", cosN: -Math.SQRT1_2, sinN: Math.SQRT1_2 },
  { deg: 150, radNum: 5, radDen: 6, cos: `−${SQRT3_2}`, sin: "1/2", tan: `−${SQRT3_3}`, cosN: -Math.sqrt(3) / 2, sinN: 1 / 2 },
  { deg: 180, radNum: 1, radDen: 1, cos: "−1", sin: "0", tan: "0", cosN: -1, sinN: 0 },
  { deg: 210, radNum: 7, radDen: 6, cos: `−${SQRT3_2}`, sin: "−1/2", tan: SQRT3_3, cosN: -Math.sqrt(3) / 2, sinN: -1 / 2 },
  { deg: 225, radNum: 5, radDen: 4, cos: `−${SQRT2_2}`, sin: `−${SQRT2_2}`, tan: "1", cosN: -Math.SQRT1_2, sinN: -Math.SQRT1_2 },
  { deg: 240, radNum: 4, radDen: 3, cos: "−1/2", sin: `−${SQRT3_2}`, tan: "√3", cosN: -1 / 2, sinN: -Math.sqrt(3) / 2 },
  { deg: 270, radNum: 3, radDen: 2, cos: "0", sin: "−1", tan: null, cosN: 0, sinN: -1 },
  { deg: 300, radNum: 5, radDen: 3, cos: "1/2", sin: `−${SQRT3_2}`, tan: "−√3", cosN: 1 / 2, sinN: -Math.sqrt(3) / 2 },
  { deg: 315, radNum: 7, radDen: 4, cos: SQRT2_2, sin: `−${SQRT2_2}`, tan: "−1", cosN: Math.SQRT1_2, sinN: -Math.SQRT1_2 },
  { deg: 330, radNum: 11, radDen: 6, cos: SQRT3_2, sin: "−1/2", tan: `−${SQRT3_3}`, cosN: Math.sqrt(3) / 2, sinN: -1 / 2 },
];

export function exactTrig(deg: number): ExactTrig {
  const e = EXACT_TRIG.find((t) => t.deg === deg);
  if (!e) throw new Error(`exactTrig: no entry for ${deg}°`);
  return e;
}

export function radLabelOf(e: ExactTrig): string {
  return piLabel(e.radNum, e.radDen);
}

// ── MCQ assembly ──────────────────────────────────────────────────────────────

export interface MCQSpec {
  calculator: boolean;
  topicTag: PrecalcTopicTag;
  subtype: string;
  stem: string;
  givens: Record<string, number>;
  /** Exact text of the correct choice. */
  correct: string;
  /** Distractor pool: factories supply ≥4 distinct entries, none equal to
   *  `correct`. Assembly picks 3. */
  wrongPool: string[];
  steps: ProblemStep[];
  svgParams?: PrecalcDiagramParams;
}

/**
 * Build a PrecalcMCQ: dedupe + filter the distractor pool, pick 3 with the
 * seeded rng, shuffle the 4 choices, and record correctIndex/answerLetter.
 * Throws loudly (never silently) if the pool cannot supply 3 distinct
 * distractors — the fuzz tests treat that as a factory bug.
 */
export function assembleMCQ(rng: RNG, spec: MCQSpec): PrecalcMCQ {
  const seen = new Set<string>([spec.correct]);
  const pool: string[] = [];
  for (const w of spec.wrongPool) {
    if (!seen.has(w)) {
      seen.add(w);
      pool.push(w);
    }
  }
  if (pool.length < 3) {
    throw new Error(
      `assembleMCQ(${spec.subtype}): only ${pool.length} distinct distractors for correct="${spec.correct}"`
    );
  }
  const picked = shuffle(rng, pool).slice(0, 3);
  const ordered = shuffle(rng, [spec.correct, ...picked]);
  const correctIndex = ordered.indexOf(spec.correct);
  return {
    type: "PRECALC_MCQ",
    calculator: spec.calculator,
    topicTag: spec.topicTag,
    topicLabel: PRECALC_TOPIC_LABELS[spec.topicTag],
    subtype: spec.subtype,
    stem: spec.stem,
    givens: spec.givens,
    choices: ordered,
    correctIndex,
    answerLetter: "ABCD"[correctIndex],
    expected: spec.correct,
    steps: spec.steps,
    svgParams: spec.svgParams,
  };
}

/** All-distinct exact trig value strings — handy distractor pool. */
export function trigValuePool(): string[] {
  const s = new Set<string>();
  for (const e of EXACT_TRIG) {
    s.add(e.sin);
    s.add(e.cos);
    if (e.tan !== null) s.add(e.tan);
  }
  return [...s];
}

// ── Answer-key formatting ─────────────────────────────────────────────────────

/**
 * One-line printable answer for a precalculus problem (used by the answer
 * key; wire into formatAnswer() in answerKey.ts per WIRING.md).
 */
export function formatPrecalcAnswer(p: PrecalcMCQ | PrecalcFRQ): string {
  if (p.type === "PRECALC_MCQ") return `${p.answerLetter}. ${p.expected}`;
  return p.subparts.map((s) => `(${s.label}) ${s.answer}`).join("  ");
}

// ── Re-export rng helpers used by factories ───────────────────────────────────

export { randInt, pick };
export type { RNG };

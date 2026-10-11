// CalculusUtils.ts
// Shared foundation for the AP Calculus generators (limits, derivative rules,
// applications of derivatives, integrals, AP-style FRQs).
//
// Contents:
//   - CalcFunction: a JSON-serializable function ADT (polynomial, rational,
//     trig, exponential, piecewise-linear). Graphs are SAMPLED from this data
//     by the renderers — shapes are never hardcoded.
//   - evalCalcFn / derivCalcFn: evaluation and symbolic differentiation.
//   - fmtNum / polyToText / fnToText: PDF-safe display formatting.
//   - CalcGraphParams: JSON-serializable graph description (web + PDF duality).
//   - CalcMCQProblem: AP-style multiple-choice problem shape with a
//     machine-checkable `verify` payload for independent test verification.
//   - Choice-shuffling and difficulty-filter helpers.
//
// Generation stays pure + seeded (mulberry32). No JSX here, no AI.

import type { BaseFRQProblem } from "../apTypes";
import type { ProblemStep } from "../types";
import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";

// ── Function ADT ──────────────────────────────────────────────────────────────

/** JSON-serializable function representation. Renderers sample this. */
export type CalcFunction =
  | { kind: "poly"; coeffs: number[] } // highest-degree first, e.g. [3,0,-2] = 3x^2-2
  | { kind: "rational"; num: number[]; den: number[] } // polys, highest-degree first
  | { kind: "trig"; base: "sin" | "cos" | "tan"; amp: number; freq: number; phase: number; shift: number } // amp*base(freq*x+phase)+shift
  | { kind: "exp"; coeff: number; rate: number } // coeff*e^{rate*x}
  | { kind: "piecewiseLinear"; points: { x: number; y: number }[] }; // polyline, sorted by x

/** Horner evaluation of a highest-degree-first coefficient list. */
export function evalPoly(coeffs: number[], x: number): number {
  let acc = 0;
  for (const c of coeffs) acc = acc * x + c;
  return acc;
}

/** Evaluate a CalcFunction at x. Returns NaN where the function is undefined. */
export function evalCalcFn(fn: CalcFunction, x: number): number {
  switch (fn.kind) {
    case "poly":
      return evalPoly(fn.coeffs, x);
    case "rational": {
      const d = evalPoly(fn.den, x);
      if (d === 0) return NaN;
      return evalPoly(fn.num, x) / d;
    }
    case "trig": {
      const t = fn.freq * x + fn.phase;
      const b =
        fn.base === "sin" ? Math.sin(t) : fn.base === "cos" ? Math.cos(t) : Math.tan(t);
      return fn.amp * b + fn.shift;
    }
    case "exp":
      return fn.coeff * Math.exp(fn.rate * x);
    case "piecewiseLinear": {
      const pts = fn.points;
      if (pts.length === 0) return NaN;
      if (x < pts[0].x || x > pts[pts.length - 1].x) return NaN;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        if (x >= a.x && x <= b.x) {
          if (b.x === a.x) return a.y;
          const t = (x - a.x) / (b.x - a.x);
          return a.y + t * (b.y - a.y);
        }
      }
      return NaN;
    }
  }
}

// ── Polynomial arithmetic (highest-degree-first) ───────────────────────────────

function stripLeadingZeros(c: number[]): number[] {
  let i = 0;
  while (i < c.length - 1 && Math.abs(c[i]) < 1e-12) i++;
  return c.slice(i);
}

export function polyAdd(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] =
      (i < n - a.length ? 0 : a[i - (n - a.length)]) +
      (i < n - b.length ? 0 : b[i - (n - b.length)]);
  }
  return stripLeadingZeros(out);
}

export function polySub(a: number[], b: number[]): number[] {
  return polyAdd(a, b.map((c) => -c));
}

export function polyMul(a: number[], b: number[]): number[] {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return stripLeadingZeros(out);
}

export function polyDeriv(coeffs: number[]): number[] {
  const deg = coeffs.length - 1;
  if (deg <= 0) return [0];
  return stripLeadingZeros(coeffs.slice(0, -1).map((c, i) => c * (deg - i)));
}

/** Symbolic derivative. Supports poly, rational (poly/poly), trig (sin/cos),
 *  exp, and piecewiseLinear. Throws for tan (sec^2 is outside the ADT). */
export function derivCalcFn(fn: CalcFunction): CalcFunction {
  switch (fn.kind) {
    case "poly":
      return { kind: "poly", coeffs: polyDeriv(fn.coeffs) };
    case "rational": {
      const dNum = polyDeriv(fn.num);
      const dDen = polyDeriv(fn.den);
      return {
        kind: "rational",
        num: polySub(polyMul(dNum, fn.den), polyMul(fn.num, dDen)),
        den: polyMul(fn.den, fn.den),
      };
    }
    case "trig": {
      if (fn.base === "tan") throw new Error("derivCalcFn: tan derivative is outside the CalcFunction ADT");
      const base = fn.base === "sin" ? "cos" : "sin";
      const amp = fn.base === "sin" ? fn.amp * fn.freq : -fn.amp * fn.freq;
      return { kind: "trig", base, amp, freq: fn.freq, phase: fn.phase, shift: 0 };
    }
    case "exp":
      return { kind: "exp", coeff: fn.coeff * fn.rate, rate: fn.rate };
    case "piecewiseLinear": {
      const pts = fn.points;
      const dPts: { x: number; y: number }[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const slope = b.x === a.x ? NaN : (b.y - a.y) / (b.x - a.x);
        dPts.push({ x: a.x, y: slope }, { x: b.x, y: slope });
      }
      return { kind: "piecewiseLinear", points: dPts };
    }
  }
}

// ── Number / expression formatting (PDF-safe plain text) ──────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b > 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** Format a number: integers plain, simple rationals as p/q, else trimmed decimal.
 *  Negative signs use U+2212 (−) for typographic consistency (DejaVu-safe). */
export function fmtNum(x: number): string {
  if (!isFinite(x)) return x > 0 ? "∞" : x < 0 ? "-∞" : "undefined";
  const neg = x < 0 ? "−" : "";
  const ax = Math.abs(x);
  if (Math.abs(ax - Math.round(ax)) < 1e-9) return `${neg}${Math.round(ax)}`;
  for (let q = 2; q <= 12; q++) {
    const p = Math.round(ax * q);
    if (Math.abs(ax - p / q) < 1e-9) {
      const g = gcd(p, q);
      return `${neg}${p / g}/${q / g}`;
    }
  }
  let s = ax.toFixed(4).replace(/\.?0+$/, "");
  if (s === "0") return "0";
  return `${neg}${s}`;
}

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};
const sup = (n: number): string =>
  String(n).split("").map((d) => SUP[d] ?? d).join("");

/** "3x^2 - 2x + 5" as unicode: 3x² − 2x + 5. Variable name is configurable. */
export function polyToText(coeffs: number[], variable = "x"): string {
  const deg = coeffs.length - 1;
  let out = "";
  coeffs.forEach((c, i) => {
    const p = deg - i;
    if (Math.abs(c) < 1e-12) return;
    const a = Math.abs(c);
    const mag = fmtNum(a);
    let term: string;
    if (p === 0) term = mag;
    else if (p === 1) term = a === 1 ? variable : `${mag}${variable}`;
    else term = a === 1 ? `${variable}${sup(p)}` : `${mag}${variable}${sup(p)}`;
    if (out === "") out = (c < 0 ? "−" : "") + term;
    else out += c < 0 ? ` − ${term}` : ` + ${term}`;
  });
  return out === "" ? "0" : out;
}

/** Format a multiple of π, e.g. 0.5236 -> "π/6", 3.1416 -> "π". */
export function fmtPiMultiple(x: number): string {
  for (let k = -24; k <= 24; k++) {
    if (Math.abs(x - (k * Math.PI) / 12) < 1e-9) {
      if (k === 0) return "0";
      const neg = k < 0 ? "−" : "";
      const a = Math.abs(k);
      if (a === 12) return `${neg}π`;
      if (a % 12 === 0) return `${neg}${a / 12}π`;
      const g = gcd(a, 12);
      const num = a / g;
      const den = 12 / g;
      return den === 1 ? `${neg}${num}π` : `${neg}${num}π/${den}`;
    }
  }
  return fmtNum(x);
}

function fmtTrigInner(freq: number, phase: number): string {
  const fPart = freq === 1 ? "x" : freq === -1 ? "−x" : `${fmtNum(freq)}x`;
  if (Math.abs(phase) < 1e-9) return fPart;
  const pPart = fmtPiMultiple(phase);
  return phase > 0 ? `${fPart} + ${pPart}` : `${fPart} − ${pPart.replace(/^−/, "")}`;
}

/** PDF-safe display string for any CalcFunction. */
export function fnToText(fn: CalcFunction): string {
  switch (fn.kind) {
    case "poly":
      return polyToText(fn.coeffs);
    case "rational":
      return `(${polyToText(fn.num)})/(${polyToText(fn.den)})`;
    case "trig": {
      const amp = fn.amp === 1 ? "" : fn.amp === -1 ? "−" : `${fmtNum(fn.amp)}·`;
      const inner = fmtTrigInner(fn.freq, fn.phase);
      const base = `${amp}${fn.base}(${inner})`;
      if (Math.abs(fn.shift) < 1e-12) return base;
      return fn.shift > 0 ? `${base} + ${fmtNum(fn.shift)}` : `${base} − ${fmtNum(-fn.shift)}`;
    }
    case "exp": {
      const coeff = fn.coeff === 1 ? "" : fn.coeff === -1 ? "−" : `${fmtNum(fn.coeff)}·`;
      const expo = fn.rate === 1 ? "x" : fn.rate === -1 ? "−x" : `${fmtNum(fn.rate)}x`;
      return `${coeff}e^(${expo})`;
    }
    case "piecewiseLinear":
      return `piecewise linear through ${fn.points.map((p) => `(${fmtNum(p.x)}, ${fmtNum(p.y)})`).join(", ")}`;
  }
}

// ── Graph params (JSON-serializable; sampled by web + PDF renderers) ───────────

export interface CalcGraphParams {
  kind: "CalcGraph";
  fn?: CalcFunction;
  fn2?: CalcFunction;
  /** Optional per-function x-domain restrictions (for piecewise graphs). */
  fnDomain?: [number, number];
  fn2Domain?: [number, number];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  holes?: { x: number; y: number }[];
  solids?: { x: number; y: number }[];
  /** Vertical asymptotes (dashed lines). */
  asymptotes?: number[];
  /** Shade area under fn (or between fn and fn2) over [a, b]. */
  shade?: { a: number; b: number; between: boolean };
  /** Draw the tangent line to fn at x = tangentAt. */
  tangentAt?: number;
  riemann?: { a: number; b: number; n: number; mode: "left" | "right" | "mid" };
  markers?: { x: number; y: number; label?: string }[];
  fnLabel?: string;
  fn2Label?: string;
  caption?: string;
}

// ── MCQ problem shape ─────────────────────────────────────────────────────────

export type CalcTopicTag =
  | "limits"
  | "derivative-rules"
  | "derivative-apps"
  | "integrals"
  | "ap-frq";

export type CalcSubtype =
  | "LimitGraphical" | "LimitAlgebraic" | "LimitNumerical" | "LimitOneSided"
  | "LimitInfinite" | "LimitEndBehavior" | "LimitDifferenceQuotient"
  | "PowerRule" | "TrigDerivative" | "ProductRule" | "QuotientRule"
  | "ChainRule" | "ChainTrigExp"
  | "TangentLine" | "NormalLine" | "IncreasingDecreasing" | "Extrema"
  | "CurveSketching" | "Optimization" | "RelatedRates"
  | "IndefiniteIntegral" | "DefiniteIntegral" | "AreaBetweenCurves"
  | "FTC" | "USubstitution" | "ImproperIntegral";

/**
 * Machine-checkable verification payload (never displayed). Tests recompute
 * the answer from `source` with INDEPENDENT code paths (their own numeric
 * differentiation / integration / limit routines) and compare against this.
 */
export interface CalcVerify {
  kind: "number" | "expr" | "text";
  /** Expected numeric value (kind "number"). */
  value?: number;
  tol?: number;
  /** Claimed answer function (kind "expr"): test samples it against an
   *  independent numeric derivative/antiderivative of `source`. */
  fn?: CalcFunction;
  /** Original function the question was built from. */
  source?: CalcFunction;
  /** Exact expected string (kind "text"). */
  text?: string;
  /** For limit problems: where the limit is taken (independent probing). */
  point?: number;
  side?: "left" | "right";
  atInfinity?: "pos" | "neg";
  /** Extra machine data for scenario problems (test recomputes from this). */
  data?: Record<string, number | string>;
}

export interface CalcMCQProblem {
  type: "CALC_MCQ";
  subtype: CalcSubtype;
  topicTag: CalcTopicTag;
  topicLabel: string;
  /** PDF-safe prompt text (unicode math ok, no LaTeX needed). */
  prompt: string;
  /** Five choices in display order (A–E). */
  choices: string[];
  /** Index of the correct choice. */
  correctIndex: number;
  /** Exact answer text; always equals choices[correctIndex]. */
  answer: string;
  /** Calculator-active vs no-calculator AP section flavor. */
  calculator: boolean;
  /** True for BC-only topics (improper integrals). */
  bcOnly?: boolean;
  steps?: ProblemStep[];
  graph?: CalcGraphParams;
  /** Optional small data table rendered with the prompt. */
  table?: { headers: string[]; rows: string[][] };
  verify: CalcVerify;
}

/** Everything the calculus area generates (MCQ drills + AP FRQs). */
export type CalculusProblem = CalcMCQProblem | BaseFRQProblem;

// ── Choice building ───────────────────────────────────────────────────────────

function shuffleInPlace<T>(rng: RNG, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build 5 AP-style choices (A–E) from the correct answer and distractors.
 * Dedupes; throws if fewer than 5 distinct options survive (a factory bug).
 */
export function makeChoices(
  rng: RNG,
  correct: string,
  distractors: string[]
): { choices: string[]; correctIndex: number } {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const s of [correct, ...distractors]) {
    if (!seen.has(s)) {
      seen.add(s);
      pool.push(s);
    }
  }
  if (pool.length < 5)
    throw new Error(`makeChoices: only ${pool.length} distinct choices for "${correct}"`);
  const chosen = pool.slice(0, 5);
  shuffleInPlace(rng, chosen);
  return { choices: chosen, correctIndex: chosen.indexOf(correct) };
}

/** Numeric distractors around v: offsets that stay distinct from v and each other. */
export function numericDistractors(rng: RNG, v: number, extra: number[] = []): string[] {
  const cands = [v + 1, v - 1, v + 2, v - 2, 2 * v, -v, v + 0.5, 0, 1, -1, ...extra];
  const out: string[] = [];
  const seen = new Set<string>([fmtNum(v)]);
  for (const c of shuffleInPlace(rng, cands)) {
    const s = fmtNum(c);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
    if (out.length >= 6) break;
  }
  return out;
}

/** Infinite-limit distractor set. */
export function infDistractors(answer: "∞" | "-∞"): string[] {
  return answer === "∞" ? ["-∞", "0", "1", "does not exist"] : ["∞", "0", "-1", "does not exist"];
}

// ── Difficulty filtering (cumulative tiers, like the rest of the codebase) ────

export type DifficultyTier = 1 | 2 | 3;

export interface Maker {
  minDiff: DifficultyTier;
  make: (rng: RNG) => CalcMCQProblem;
}

/** Makers whose minDiff <= difficulty (cumulative). */
export function makersForDifficulty(makers: Maker[], difficulty: DifficultyTier): Maker[] {
  const allowed = makers.filter((m) => m.minDiff <= difficulty);
  if (allowed.length === 0) throw new Error("makersForDifficulty: empty tier");
  return allowed;
}

/** Generate n problems, cycling through the difficulty-allowed makers. */
export function generateFromMakers(
  rng: RNG,
  n: number,
  makers: Maker[],
  difficulty: DifficultyTier
): CalcMCQProblem[] {
  const allowed = makersForDifficulty(makers, difficulty);
  const out: CalcMCQProblem[] = [];
  for (let i = 0; i < n; i++) out.push(pick(rng, allowed).make(rng));
  return out;
}

// ── Answer key ────────────────────────────────────────────────────────────────

/** One-line printable answer for the answer key. */
export function formatCalculusAnswer(p: CalculusProblem): string {
  if (p.type === "AP_FRQ") {
    return p.subparts.map((s) => `(${s.label}) ${s.answer}`).join("  ");
  }
  return p.answer;
}

/** Re-exported for factories. */
export { randInt, pick };
export type { RNG };

// Algebra2Types.ts
// Shared types for the Algebra 2 area of the Euclid Engine.
// These mirror the existing MathProblem shape so wiring them into the
// MathProblem union / renderers is mechanical (see tests/algebra-2/WIRING.md).
// Generation stays pure + seeded; all text is LaTeX-flavoured and rendered
// through latexToText/pdfSafeText on the presentation side.

import type { ProblemStep } from "../types";
import type { BaseProofProblem } from "../proofTypes";
import { latexToText } from "../answerKey";

// ── Topic codes ───────────────────────────────────────────────────────────────
// Aligned to CURRICULUM_SCOPE.md ("Algebra II — Topics 2–12"): the code is the
// TEKS-by-topic code, so registry entries, cards, and problems agree.

export type Algebra2Type =
  | "A2.4" // T4 Matrices
  | "A2.5" // T5 Quadratics, parabolas, nonlinear systems
  | "A2.7" // T7 Exponentials & logarithms
  | "A2.8" // T8 Polynomials (division, factoring, roots)
  | "A2.11" // T11 Rational functions & equations
  | "A2.12" // T12 Data & regression
  | "A2.S" // Sequences & series (supplementary — not in scope doc)
  | "A2.C"; // Circle equations & circle-line systems (supplementary)

export type Algebra2ProofType = "A2.P";

// ── Diagram params (web + PDF duality lives in components/diagrams/) ──────────

export interface Algebra2ConicSVGParams {
  kind: "ConicGraph";
  circles?: { h: number; k: number; r: number }[];
  parabolas?: { h: number; k: number; a: number }[];
}

export interface Algebra2RationalSVGParams {
  kind: "RationalGraph";
  /** Descending coefficients. */
  num: number[];
  den: number[];
  vAsm: number[];
  hAsm: number | null;
  hole: { x: number; y: number } | null;
}

export type Algebra2DiagramParams = Algebra2ConicSVGParams | Algebra2RationalSVGParams;

// ── Computational problem ─────────────────────────────────────────────────────

export interface Algebra2Problem {
  type: Algebra2Type;
  /** Maker family, e.g. "CompleteSquare", "SyntheticDivision", "LogEvaluate". */
  subtype: string;
  /** Human-readable givens for the card. */
  given: Record<string, string | number>;
  /** What to solve for, e.g. "vertex form". */
  find: string;
  /** One-line display answer (LaTeX-flavoured). */
  answer: string;
  unit?: string;
  steps: ProblemStep[];
  svgParams?: Algebra2DiagramParams;
  /**
   * Machine-readable parameters for INDEPENDENT test verification.
   * Renderers ignore this field.
   */
  verify?: Record<string, number | number[] | string | string[] | boolean>;
}

// ── Proof problem ─────────────────────────────────────────────────────────────

export type Algebra2ProofProblem = BaseProofProblem & {
  domain: "algebra2";
  type: "Proof";
  /**
   * Machine-readable parameters for independent test verification
   * (e.g. { base: 2, k: 3 }). Renderers ignore this field.
   */
  verify?: Record<string, number | number[] | string | string[] | boolean>;
};

// ── Union consumed by the registry module ─────────────────────────────────────

export type Algebra2MathProblem = Algebra2Problem | Algebra2ProofProblem;

// ── Answer key ────────────────────────────────────────────────────────────────

/**
 * One-line printable answer for the answer key.
 * (Wiring: add `case` branches in formatAnswer() in src/lib/answerKey.ts
 * that delegate here — see tests/algebra-2/WIRING.md.)
 */
export function formatAlgebra2Answer(p: Algebra2MathProblem): string {
  if (p.type === "Proof") return latexToText(p.prove);
  const a = latexToText(p.answer);
  return p.unit ? `${a} ${p.unit}` : a;
}

/** Human-readable topic label for section dividers / cards. */
export const ALGEBRA2_TOPIC_LABELS: Record<Algebra2Type | Algebra2ProofType, string> = {
  "A2.4": "Matrices",
  "A2.5": "Quadratics & Nonlinear Systems",
  "A2.7": "Exponentials & Logarithms",
  "A2.8": "Polynomial Division & Factoring",
  "A2.11": "Rational Functions & Equations",
  "A2.12": "Data & Regression",
  "A2.S": "Sequences & Series",
  "A2.C": "Circles & Circle Systems",
  "A2.P": "Algebra 2 Proofs",
};

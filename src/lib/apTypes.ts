// apTypes.ts
// Shared AP-style problem shapes for AP Precalculus and AP Calculus generators.
// Used by the precalculus and calculus factories. Rendering (web preview + PDF)
// is handled by dedicated AP renderers added at integration time.
//
// CONVENTIONS (same as the rest of the codebase):
// - All display strings must be PDF-safe plain text: run user-facing math
//   through latexToText()/pdfSafeText() from "@/lib/answerKey.ts".
//   DejaVu Serif is the embedded PDF font; it lacks U+2245 (≅ → use ≃).
// - Generation is pure + seeded (mulberry32). No JSX here, no AI.

import type { ProblemStep } from "./types";

export type APSubject = "precalc" | "calc";
export type APStimulusKind = "graph" | "table" | "scenario";

export interface APTableStimulus {
  kind: "table";
  /** Column headers, e.g. ["x", "f(x)", "f'(x)"]. PDF-safe strings. */
  headers: string[];
  /** String cells, already formatted and PDF-safe. Every row same length as headers. */
  rows: string[][];
  caption?: string;
}

export interface APGraphStimulus {
  kind: "graph";
  /**
   * Discriminator the renderer switches on to draw the stimulus,
   * e.g. "function", "derivative-graph", "polar", "area-between-curves".
   * The concrete params type is defined by the subject factory; keep this
   * record JSON-serializable so it can cross the generate→render seam.
   */
  graphKind: string;
  params: Record<string, unknown>;
  caption?: string;
}

export interface APScenarioStimulus {
  kind: "scenario";
  /** Verbal scenario. PDF-safe plain text, no LaTeX. */
  text: string;
}

export type APStimulus = APTableStimulus | APGraphStimulus | APScenarioStimulus;

export interface FRQSubpart {
  label: "a" | "b" | "c" | "d";
  /** The subpart prompt. PDF-safe plain text. */
  prompt: string;
  /** Exact expected answer, PDF-safe (used by the answer key). */
  answer: string;
  /** AP-style justification language for the key, e.g. "f' changes from
   *  negative to positive at x = 2, so f has a relative minimum there." */
  justification?: string;
  steps?: ProblemStep[];
  /** Suggested AP-style point value. */
  points?: number;
}

export interface BaseFRQProblem {
  type: "AP_FRQ";
  subject: APSubject;
  /** Calculator-active vs no-calculator section flavor. */
  calculator: boolean;
  stimulus: APStimulus;
  /** 2–4 subparts. Every subpart MUST be answerable from the stimulus alone. */
  subparts: FRQSubpart[];
  /** Machine tag for the topic, e.g. "derivative-applications". */
  topicTag: string;
  /** Human topic label for the UI, e.g. "Applications of Derivatives". */
  topicLabel: string;
}

/** Validate stimulus/subpart consistency. Factories should call this in tests:
 *  - table: every row matches headers length
 *  - subparts: 2–4, labels sequential from "a"
 *  - every subpart has a non-empty answer
 */
export function validateFRQ(p: BaseFRQProblem): string[] {
  const errors: string[] = [];
  if (p.subparts.length < 2 || p.subparts.length > 4)
    errors.push(`expected 2-4 subparts, got ${p.subparts.length}`);
  p.subparts.forEach((s, i) => {
    const want = "abcd"[i];
    if (s.label !== want) errors.push(`subpart ${i} label ${s.label}, want ${want}`);
    if (!s.answer || !s.answer.trim()) errors.push(`subpart ${s.label} has empty answer`);
    if (!s.prompt || !s.prompt.trim()) errors.push(`subpart ${s.label} has empty prompt`);
  });
  const stim = p.stimulus;
  if (stim.kind === "table") {
    stim.rows.forEach((r, i) => {
      if (r.length !== stim.headers.length)
        errors.push(`table row ${i} has ${r.length} cells, want ${stim.headers.length}`);
    });
  }
  return errors;
}

// proofTypes.ts
// Shared proof-problem shapes for geometry proofs and algebra 2 proofs.
// Both domains produce ordered, logically valid step lists; rendering
// (modern two-column vs Euclid's Elements classical style) is a
// presentation choice made by the renderer, never by the generator.
//
// CONVENTIONS:
// - steps[] must be logically valid AS LISTED: each statement follows from
//   the givens + previous steps, and each reason must actually justify its
//   statement. A wrong proof is worse than no proof — test this.
// - All strings PDF-safe plain text (see "@/lib/answerKey.ts").
// - Generation pure + seeded (mulberry32). No JSX, no AI.

export type ProofDomain = "geometry" | "algebra2";

/** One line of a two-column proof. */
export interface ProofStep {
  /** The statement, e.g. "AB ≅ DE" (use ≃ in PDF contexts — see README). */
  statement: string;
  /** The reason, e.g. "Given", "SSS", "Substitution", "Distributive Property". */
  reason: string;
  /** Renderer blanks the statement cell for the student to fill in. */
  blankStatement?: boolean;
  /** Renderer blanks the reason cell for the student to fill in. */
  blankReason?: boolean;
}

export type ProofPresentation = "two-column" | "elements";

export interface BaseProofProblem {
  type: "Proof";
  domain: ProofDomain;
  /** Theorem/identity family, e.g. "SSS", "ParallelLines", "TrigIdentity". */
  family: string;
  /** Givens as display strings, e.g. ["AB ≃ DE", "∠A ≃ ∠D"]. */
  given: string[];
  /** The "Prove:" line, e.g. "△ABC ≃ △DEF". */
  prove: string;
  /** Ordered steps. Must be logically valid as listed. */
  steps: ProofStep[];
  /**
   * Euclid's Elements rendering (geometry flagship propositions):
   * proposition number + classical enunciation, e.g.
   *   elementsProposition: "I.47"
   *   elementsEnunciation: "In right-angled triangles the square on the side
   *     subtending the right angle is equal to the squares on the sides
   *     containing the right angle."
   * When present, the Elements renderer may present this problem in classical
   * style (enunciation → construction → proof → Q.E.D.).
   */
  elementsProposition?: string;
  elementsEnunciation?: string;
}

/** Structural validation for a proof problem. Factories should call this in
 *  tests. Checks shape, not deep logical validity (that needs per-family
 *  checkers — write those in your tests).
 */
export function validateProofShape(p: BaseProofProblem): string[] {
  const errors: string[] = [];
  if (p.steps.length === 0) errors.push("proof has no steps");
  if (!p.prove || !p.prove.trim()) errors.push("missing prove statement");
  p.steps.forEach((s, i) => {
    if (!s.statement || !s.statement.trim()) errors.push(`step ${i + 1}: empty statement`);
    if (!s.reason || !s.reason.trim()) errors.push(`step ${i + 1}: empty reason`);
  });
  const last = p.steps[p.steps.length - 1];
  if (last && !last.blankStatement && !last.blankReason) {
    // The final statement should match what was to be proved (modulo blanks).
    const norm = (t: string) => t.replace(/\s+/g, " ").trim();
    if (norm(last.statement) !== norm(p.prove))
      errors.push(`final step "${last.statement}" does not match prove "${p.prove}"`);
  }
  return errors;
}

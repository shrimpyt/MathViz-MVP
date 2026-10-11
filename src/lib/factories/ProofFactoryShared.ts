// ProofFactoryShared.ts
// Shared helpers for the geometry-proof factories: seeded triangle geometry,
// student-mode blanking, and reason-name constants.
//
// Pure, seeded (mulberry32 via @/lib/math-utils). No JSX, no AI.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofStudentMode } from "../proofDiagrams";

// ── Reason vocabulary (kept in one place so checkers can rely on it) ─────────

export const R = {
  given: "Given",
  defCongSeg: "Definition of congruent segments",
  defCongAng: "Definition of congruent angles",
  defMidpoint: "Definition of midpoint",
  defPerp: "Definition of perpendicular lines",
  defAngleBisector: "Definition of angle bisector",
  defRightTriangle: "Definition of right triangle",
  segAddition: "Segment Addition Postulate",
  angAddition: "Angle Addition Postulate",
  arcAddition: "Arc Addition Postulate",
  linearPair: "Linear Pair Postulate",
  rightAnglesCong: "Right Angles Congruence Theorem",
  thirdAngles: "Third Angles Theorem",
  verticalAngles: "Vertical Angles Theorem",
  corrAngles: "Corresponding Angles Theorem",
  altIntAngles: "Alternate Interior Angles Theorem",
  altExtAngles: "Alternate Exterior Angles Theorem",
  sameSideInt: "Same-Side Interior Angles Theorem",
  corrAnglesConverse: "Corresponding Angles Converse",
  altIntAnglesConverse: "Alternate Interior Angles Converse",
  sameSideIntConverse: "Same-Side Interior Angles Converse",
  inscribedAngleThm: "Inscribed Angle Theorem",
  tangentChordThm: "Tangent-Chord Angle Theorem",
  substitution: "Substitution",
  simplify: "Simplify",
  construction: "Construction",
  reflexive: "Reflexive Property",
  cpctc: "CPCTC",
  SSS: "SSS",
  SAS: "SAS",
  ASA: "ASA",
  AAS: "AAS",
  HL: "HL",
  AA: "AA Similarity",
} as const;

// ── Seeded triangle geometry ─────────────────────────────────────────────────

export interface TriangleDims {
  /** Side lengths: AB, BC, CA. */
  sAB: number;
  sBC: number;
  sCA: number;
  /** Integer angles at A, B, C (sum exactly 180). */
  angA: number;
  angB: number;
  angC: number;
}

const DEG = 180 / Math.PI;

/**
 * Pick side lengths satisfying the strict triangle inequality, then derive
 * the angles via the Law of Cosines (rounded; C adjusted so A+B+C = 180).
 * Retries a few times to avoid degenerate rounded angles.
 */
export function randomTriangle(
  rng: RNG,
  opts?: { evenAB?: boolean; evenBC?: boolean }
): TriangleDims {
  for (let attempt = 0; attempt < 25; attempt++) {
    const sAB = opts?.evenAB ? 2 * randInt(rng, 3, 6) : randInt(rng, 5, 12);
    const sBC = opts?.evenBC ? 2 * randInt(rng, 2, 5) : randInt(rng, 4, 12);
    const lo = Math.abs(sAB - sBC) + 1;
    const hi = sAB + sBC - 1;
    if (lo > hi) continue;
    const sCA = randInt(rng, lo, hi);
    // Law of Cosines: angle at A is opposite side BC (= sBC), etc.
    const cosA = (sAB ** 2 + sCA ** 2 - sBC ** 2) / (2 * sAB * sCA);
    const cosB = (sAB ** 2 + sBC ** 2 - sCA ** 2) / (2 * sAB * sBC);
    if (Math.abs(cosA) >= 1 || Math.abs(cosB) >= 1) continue;
    const angA = Math.round(Math.acos(cosA) * DEG);
    const angB = Math.round(Math.acos(cosB) * DEG);
    const angC = 180 - angA - angB;
    if (angA < 5 || angB < 5 || angC < 5) continue;
    if (angA > 175 || angB > 175 || angC > 175) continue;
    return { sAB, sBC, sCA, angA, angB, angC };
  }
  // Deterministic fallback: a 5-6-7 triangle (always valid).
  return { sAB: 5, sBC: 6, sCA: 7, angA: 55, angB: 78, angC: 47 };
}

/** Right triangle with the right angle at B; legs sAB, sBC. */
export function randomRightTriangleAtB(rng: RNG): TriangleDims {
  const sAB = randInt(rng, 5, 10);
  const sBC = randInt(rng, 4, 10);
  const angA = Math.round(Math.atan2(sBC, sAB) * DEG);
  return { sAB, sBC, sCA: 0, angA, angB: 90, angC: 90 - angA };
}

export interface PythagoreanTriple {
  legA: number;
  legB: number; // the even leg (used for midpoint derivations)
  hyp: number;
}

const TRIPLES: PythagoreanTriple[] = [
  { legA: 3, legB: 4, hyp: 5 },
  { legA: 6, legB: 8, hyp: 10 },
  { legA: 5, legB: 12, hyp: 13 },
  { legA: 9, legB: 12, hyp: 15 },
];

/** Right triangle for HL: right angle at C, hypotenuse AB, leg BC even. */
export function randomHLTriangle(rng: RNG): PythagoreanTriple {
  return pick(rng, TRIPLES);
}

/** Valid angle triple (degrees) summing to 180, each >= 25. */
export function randomAngleTriple(rng: RNG): [number, number, number] {
  for (let attempt = 0; attempt < 25; attempt++) {
    const a = randInt(rng, 25, 100);
    const b = randInt(rng, 25, 150 - a);
    const c = 180 - a - b;
    if (c >= 25) return [a, b, c];
  }
  return [60, 70, 50];
}

// ── Student-mode blanking ────────────────────────────────────────────────────

/**
 * Apply a student mode to a finished step list by setting blankStatement /
 * blankReason flags. "Given" rows and the terminal Q.E.D. are never blanked.
 *
 * Mode presentation must NOT consume the generation RNG: identical seeds must
 * yield identical underlying problems across output modes, so the "guided"
 * pattern is a deterministic per-step-index alternation rather than a coin
 * flip. (A previous rng() < 0.5 here shifted the shared stream and made
 * GuidedNote diverge from Test/Classical for the same seed.)
 */
export function applyStudentMode(
  steps: ProofStep[],
  mode: ProofStudentMode
): ProofStep[] {
  if (mode === "complete") return steps.map((s) => ({ ...s }));
  let alt = 0;
  return steps.map((s, i) => {
    const out = { ...s };
    if (s.reason === R.given) return out;
    if (s.statement === "Q.E.D.") return out;
    const isFinal = i === steps.length - 1;
    switch (mode) {
      case "fill-statements":
        // Students supply the statements; the final conclusion is always blanked.
        out.blankStatement = true;
        break;
      case "supply-reasons":
        // Students supply the reasons; the final theorem name is always blanked.
        out.blankReason = true;
        break;
      case "guided": {
        // Alternating scaffolding; the final step asks for the reason (theorem).
        if (isFinal) {
          out.blankReason = true;
        } else if (alt++ % 2 === 0) {
          out.blankReason = true;
        } else {
          out.blankStatement = true;
        }
        break;
      }
    }
    return out;
  });
}

/** True when every display string is plain-text PDF-safe (no LaTeX). */
export function stringsArePlainText(strs: string[]): boolean {
  return strs.every((s) => !s.includes("\\") && !s.includes("$"));
}

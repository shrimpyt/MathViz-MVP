// CurriculumRegistry.ts
// Central registry mapping human-readable "Story" names to TEKS standards
// and their associated module generators.
//
// Each entry is a CurriculumEntry — import this registry in UI components
// so the control panel always reflects the current module catalogue.

import { AnatomyOfACircle } from "./anatomy-of-a-circle";
import { TargetZone } from "./target-zone";
import { LogicOfCongruence } from "./logic-of-congruence";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Registry shape ────────────────────────────────────────────────────────────

export interface CurriculumEntry {
  /** Unique key used in URL params / state */
  id: string;
  /** Human-friendly story title shown in the UI */
  title: string;
  /** One-sentence story framing shown as a sub-label */
  story: string;
  /** TEKS standard code(s) covered */
  teks: string;
  /** Short description for tooltips */
  description: string;
  /**
   * Generate problems for the given mode and seed.
   * Base counts: GuidedNote = 1×, Review = 3×, Test = 1× (but clean blanks).
   */
  generate(mode: OutputMode, seed: number): MathProblem[];
}

// ── Module generators ─────────────────────────────────────────────────────────

function circleProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 9 : 3;
  return AnatomyOfACircle.generateMany(count, rng);
}

function probabilityProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 2;
  return TargetZone.generateMany(count, rng);
}

function congruenceProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 2;
  return LogicOfCongruence.generateMany(count, rng);
}

function mixedProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const multiplier = mode === "Review" ? 3 : 1;
  return [
    ...AnatomyOfACircle.generateMany(3 * multiplier, rng),
    ...TargetZone.generateMany(2 * multiplier, rng),
  ];
}

// ── The registry ──────────────────────────────────────────────────────────────

export const CURRICULUM_REGISTRY: CurriculumEntry[] = [
  {
    id: "anatomy-of-a-circle",
    title: "Anatomy of a Circle",
    story: "Master inscribed angles, central angles, tangents, chords, and secants.",
    teks: "G.12(A)",
    description:
      "Problems on Inscribed Angle Theorem, Central Angle Theorem, Tangent-Chord angles, intersecting chords, and two-secant angles.",
    generate: circleProblems,
  },
  {
    id: "target-zone",
    title: "Target Zone",
    story: "Calculate the probability a dart hits the bullseye — or a spinner lands on the shaded region.",
    teks: "G.13(B)",
    description:
      "Area-based geometric probability using concentric circle (bullseye) and shaded sector (spinner) models.",
    generate: probabilityProblems,
  },
  {
    id: "logic-of-congruence",
    title: "Logic of Congruence",
    story: "Prove two triangles are congruent using SSS, SAS, ASA, AAS, or HL.",
    teks: "G.6(B)",
    description:
      "Structured two-column proofs applying the five triangle congruence theorems.",
    generate: congruenceProblems,
  },
  {
    id: "circles-and-probability",
    title: "Circles & Probability",
    story: "A combined review covering both circle theorems and area-based probability.",
    teks: "G.12(A) · G.13(B)",
    description:
      "Mixed problem set spanning circle theorems and geometric probability — ideal for end-of-unit review.",
    generate: mixedProblems,
  },
];

/** Look up a registry entry by id. Returns undefined if not found. */
export function getModule(id: string): CurriculumEntry | undefined {
  return CURRICULUM_REGISTRY.find((e) => e.id === id);
}

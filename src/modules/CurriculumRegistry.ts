// CurriculumRegistry.ts
// Central registry mapping human-readable "Story" names to TEKS standards
// and their associated module generators.
//
// Each entry is a CurriculumEntry — import this registry in UI components
// so the control panel always reflects the current module catalogue.

import { AnatomyOfACircle } from "./anatomy-of-a-circle";
import { TargetZone } from "./target-zone";
import { LogicOfCongruence } from "./logic-of-congruence";
import { generateTrigProblems } from "@/lib/factories/TrigonometryFactory";
import { generateSpecialTriangleProblems } from "@/lib/factories/SpecialTrianglesFactory";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";

// ── Seeded PRNG — imported from canonical source ──────────────────────────────

import { mulberry32 } from "@/lib/math-utils";

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

function trigIntroProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateTrigProblems(rng, count, ["IdentifyRatio"]);
}

function trigSideProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateTrigProblems(rng, count, ["SolveForSide"]);
}

function trigAngleProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateTrigProblems(rng, count, ["SolveForAngle"]);
}

function specialTriangleProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateSpecialTriangleProblems(rng, count);
}

function elevationDepressionProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateTrigProblems(rng, count, ["ElevationDepression"]);
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
    id: "trig-1-ratios",
    title: "Trigonometry: Introduction to Ratios",
    story: "Identify sine, cosine, and tangent fractions for a reference angle.",
    teks: "G.9(A)",
    description: "Identify the SOH CAH TOA fractions given all three sides of a right triangle.",
    generate: trigIntroProblems,
  },
  {
    id: "trig-2-sides",
    title: "Trigonometry: Solving for Sides",
    story: "Use trigonometric ratios to find missing side lengths.",
    teks: "G.9(A)",
    description: "Set up and solve sine, cosine, and tangent equations to find missing sides.",
    generate: trigSideProblems,
  },
  {
    id: "trig-3-angles",
    title: "Trigonometry: Solving for Angles",
    story: "Use inverse trigonometric functions to find missing angles.",
    teks: "G.9(A)",
    description: "Apply inverse sine, inverse cosine, and inverse tangent to solve for a reference angle.",
    generate: trigAngleProblems,
  },
  {
    id: "special-right-triangles",
    title: "Special Right Triangles",
    story: "Apply the exact ratios for 45-45-90 and 30-60-90 triangles.",
    teks: "G.9(B)",
    description: "Use simplified radical relationships (x, x, x√2 and x, x√3, 2x) to solve for missing sides.",
    generate: specialTriangleProblems,
  },
  {
    id: "elevation-depression",
    title: "Angles of Elevation & Depression",
    story: "Solve real-world trigonometry problems using surveyor and lighthouse scenarios.",
    teks: "G.9(A)",
    description: "Translate descriptive word problems into trigonometric equations and solve for unknown measures.",
    generate: elevationDepressionProblems,
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

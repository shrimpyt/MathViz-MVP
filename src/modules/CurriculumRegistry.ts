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
  /** Chapter number in the textbook */
  chapter: number;
  /** Human-friendly chapter title */
  chapterTitle: string;
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

function placeholderGenerator(mode: OutputMode, seed: number): MathProblem[] {
  return [{
    type: "G.12A" as any, // Placeholder type
    subtype: "TBD" as any,
    given: {},
    find: "Coming Soon",
    answer: "Check back later",
    steps: [{ instruction: "This lesson is currently under construction." }],
    svgParams: { kind: "Circle" as any }
  }] as any;
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
  // ── Chapter 1: Tools of Geometry ───────────────────────────────────────────
  {
    id: "ch1-test",
    chapter: 1,
    chapterTitle: "Chapter 1: Tools of Geometry",
    title: "Chapter 1 Test",
    story: "Comprehensive assessment of geometric foundations.",
    teks: "G.2(B) · G.5(C)",
    description: "Points, lines, planes, segments, and basic constructions.",
    generate: placeholderGenerator,
  },
  // ── Chapter 2: Reasoning and Proof ────────────────────────────────────────
  {
    id: "ch2-test",
    chapter: 2,
    chapterTitle: "Chapter 2: Reasoning and Proof",
    title: "Chapter 2 Test",
    story: "Logic and formal proof structures.",
    teks: "G.4(A) · G.4(B)",
    description: "Conditional statements, deductive reasoning, and segment/angle proofs.",
    generate: placeholderGenerator,
  },
  // ── Chapter 3: Parallel & Perpendicular Lines ─────────────────────────────
  {
    id: "ch3-test",
    chapter: 3,
    chapterTitle: "Chapter 3: Parallel & Perpendicular Lines",
    title: "Chapter 3 Test",
    story: "Angles created by transversals and parallel lines.",
    teks: "G.5(A) · G.5(B)",
    description: "Parallel lines, slope, and equations of lines.",
    generate: placeholderGenerator,
  },
  // ── Chapter 4: Congruent Triangles ────────────────────────────────────────
  {
    id: "logic-of-congruence",
    chapter: 4,
    chapterTitle: "Chapter 4: Congruent Triangles",
    title: "Logic of Congruence",
    story: "Prove two triangles are congruent using SSS, SAS, ASA, AAS, or HL.",
    teks: "G.6(B)",
    description: "Structured two-column proofs applying the five triangle congruence theorems.",
    generate: congruenceProblems,
  },
  {
    id: "ch4-test",
    chapter: 4,
    chapterTitle: "Chapter 4: Congruent Triangles",
    title: "Chapter 4 Test",
    story: "Assessment of triangle congruence and classification.",
    teks: "G.6(B)",
    description: "Comprehensive test on SSS, SAS, ASA, AAS, and HL postulates.",
    generate: placeholderGenerator,
  },
  // ── Chapter 5: Relationships Within Triangles ─────────────────────────────
  {
    id: "ch5-test",
    chapter: 5,
    chapterTitle: "Chapter 5: Relationships Within Triangles",
    title: "Chapter 5 Test",
    story: "Bisectors, medians, altitudes, and triangle inequalities.",
    teks: "G.5(D) · G.6(D)",
    description: "Incenter, circumcenter, centroid, and orthocenter properties.",
    generate: placeholderGenerator,
  },
  // ── Chapter 6: Polygons and Quadrilaterals ────────────────────────────────
  {
    id: "ch6-test",
    chapter: 6,
    chapterTitle: "Chapter 6: Polygons and Quadrilaterals",
    title: "Chapter 6 Test",
    story: "Properties of parallelograms and special quadrilaterals.",
    teks: "G.6(E)",
    description: "Rhombuses, rectangles, squares, trapezoids, and kites.",
    generate: placeholderGenerator,
  },
  // ── Chapter 7: Similarity ──────────────────────────────────────────────────
  {
    id: "ch7-test",
    chapter: 7,
    chapterTitle: "Chapter 7: Similarity",
    title: "Chapter 7 Test",
    story: "Ratios, proportions, and similar figures.",
    teks: "G.7(A) · G.7(B)",
    description: "Triangle similarity theorems (AA~, SAS~, SSS~) and dilations.",
    generate: placeholderGenerator,
  },
  // ── Chapter 8: Right Triangles and Trigonometry ───────────────────────────
  {
    id: "trig-1-ratios",
    chapter: 8,
    chapterTitle: "Chapter 8: Right Triangles and Trigonometry",
    title: "Trigonometry: Introduction to Ratios",
    story: "Identify sine, cosine, and tangent fractions for a reference angle.",
    teks: "G.9(A)",
    description: "Identify the SOH CAH TOA fractions given all three sides of a right triangle.",
    generate: trigIntroProblems,
  },
  {
    id: "trig-2-sides",
    chapter: 8,
    chapterTitle: "Chapter 8: Right Triangles and Trigonometry",
    title: "Trigonometry: Solving for Sides",
    story: "Use trigonometric ratios to find missing side lengths.",
    teks: "G.9(A)",
    description: "Set up and solve sine, cosine, and tangent equations to find missing sides.",
    generate: trigSideProblems,
  },
  {
    id: "trig-3-angles",
    chapter: 8,
    chapterTitle: "Chapter 8: Right Triangles and Trigonometry",
    title: "Trigonometry: Solving for Angles",
    story: "Use inverse trigonometric functions to find missing angles.",
    teks: "G.9(A)",
    description: "Apply inverse sine, inverse cosine, and inverse tangent to solve for a reference angle.",
    generate: trigAngleProblems,
  },
  {
    id: "special-right-triangles",
    chapter: 8,
    chapterTitle: "Chapter 8: Right Triangles and Trigonometry",
    title: "Special Right Triangles",
    story: "Apply the exact ratios for 45-45-90 and 30-60-90 triangles.",
    teks: "G.9(B)",
    description: "Use simplified radical relationships (x, x, x√2 and x, x√3, 2x) to solve for missing sides.",
    generate: specialTriangleProblems,
  },
  {
    id: "elevation-depression",
    chapter: 8,
    chapterTitle: "Chapter 8: Right Triangles and Trigonometry",
    title: "Angles of Elevation & Depression",
    story: "Solve real-world trigonometry problems using surveyor and lighthouse scenarios.",
    teks: "G.9(A)",
    description: "Translate descriptive word problems into trigonometric equations and solve for unknown measures.",
    generate: elevationDepressionProblems,
  },
  {
    id: "ch8-test",
    chapter: 8,
    chapterTitle: "Chapter 8: Right Triangles and Trigonometry",
    title: "Chapter 8 Test",
    story: "Comprehensive assessment of Right Triangles and Trigonometry.",
    teks: "G.8(A) · G.9(A) · G.9(B)",
    description: "Pythagorean theorem, special right triangles, and SOH CAH TOA.",
    generate: placeholderGenerator,
  },
  // ── Chapter 9: Transformations ────────────────────────────────────────────
  {
    id: "ch9-test",
    chapter: 9,
    chapterTitle: "Chapter 9: Transformations",
    title: "Chapter 9 Test",
    story: "Reflections, translations, rotations, and symmetry.",
    teks: "G.3(A) · G.3(B) · G.3(C)",
    description: "Rigid motions and composition of transformations.",
    generate: placeholderGenerator,
  },
  // ── Chapter 10: Area ──────────────────────────────────────────────────────
  {
    id: "ch10-test",
    chapter: 10,
    chapterTitle: "Chapter 10: Area",
    title: "Chapter 10 Test",
    story: "Area of polygons and composite figures.",
    teks: "G.11(B)",
    description: "Calculating area for triangles, quadrilaterals, and regular polygons.",
    generate: placeholderGenerator,
  },
  // ── Chapter 11: Surface Area and Volume ──────────────────────────────────
  {
    id: "ch11-test",
    chapter: 11,
    chapterTitle: "Chapter 11: Surface Area and Volume",
    title: "Chapter 11 Test",
    story: "3D geometry, prisms, cylinders, pyramids, and spheres.",
    teks: "G.11(C)",
    description: "Surface area and volume of three-dimensional solids.",
    generate: placeholderGenerator,
  },
  // ── Chapter 12: Circles ───────────────────────────────────────────────────
  {
    id: "anatomy-of-a-circle",
    chapter: 12,
    chapterTitle: "Chapter 12: Circles",
    title: "Anatomy of a Circle",
    story: "Master inscribed angles, central angles, tangents, chords, and secants.",
    teks: "G.12(A)",
    description: "Problems on Inscribed Angle Theorem, Central Angle Theorem, Tangent-Chord angles, intersecting chords, and two-secant angles.",
    generate: circleProblems,
  },
  {
    id: "ch12-test",
    chapter: 12,
    chapterTitle: "Chapter 12: Circles",
    title: "Chapter 12 Test",
    story: "Comprehensive assessment of circle theorems.",
    teks: "G.12(A)",
    description: "Tangents, chords, arcs, and angles in circles.",
    generate: placeholderGenerator,
  },
  // ── Chapter 13: Probability ────────────────────────────────────────────────
  {
    id: "target-zone",
    chapter: 13,
    chapterTitle: "Chapter 13: Probability",
    title: "Target Zone",
    story: "Calculate the probability a dart hits the bullseye — or a spinner lands on the shaded region.",
    teks: "G.13(B)",
    description: "Area-based geometric probability using concentric circle (bullseye) and shaded sector (spinner) models.",
    generate: probabilityProblems,
  },
  {
    id: "ch13-test",
    chapter: 13,
    chapterTitle: "Chapter 13: Probability",
    title: "Chapter 13 Test",
    story: "Geometric probability and permutations.",
    teks: "G.13(B) · G.13(C)",
    description: "Area probability, sample space, and simple probability events.",
    generate: placeholderGenerator,
  },
];

/** Look up a registry entry by id. Returns undefined if not found. */
export function getModule(id: string): CurriculumEntry | undefined {
  return CURRICULUM_REGISTRY.find((e) => e.id === id);
}

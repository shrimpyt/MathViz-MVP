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
import { generateCoordinateProblems } from "@/lib/factories/CoordinateFactory";
import { generateMeasurementProblems } from "@/lib/factories/MeasurementFactory";
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

function coordinateProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateCoordinateProblems(rng, count);
}

function measurementProblems(mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  const count = mode === "Review" ? 6 : 3;
  return generateMeasurementProblems(rng, count);
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

/** 
 * Comprehensive test generator for each topic number.
 * Picks a representative mix from all sub-generators in that topic.
 */
function topicTestGenerator(topic: number, mode: OutputMode, seed: number): MathProblem[] {
  const rng = mulberry32(seed);
  // Tests are typically 10 mixed problems, reviews might be 15
  const count = mode === "Review" ? 15 : 10;
  
  switch(topic) {
    case 4: // Topic 4: Congruent Triangles
      return LogicOfCongruence.generateMany(count, rng);
    case 7: // Topic 7: Coordinate Geometry
      return generateCoordinateProblems(rng, count);
    case 10: // Topic 10: Trig
      return generateTrigProblems(rng, count, ["IdentifyRatio", "SolveForSide", "SolveForAngle", "ElevationDepression"]);
    case 11: // Topic 11: Circle Measurement
      return generateMeasurementProblems(rng, count);
    case 12: // Topic 12: Circle Theorems
      return AnatomyOfACircle.generateMany(count, rng);
    case 15: // Topic 15: Probability
      return TargetZone.generateMany(count, rng);
    default:
      return placeholderGenerator(mode, seed);
  }
}

// ── The registry ──────────────────────────────────────────────────────────────

export const CURRICULUM_REGISTRY: CurriculumEntry[] = [
  // ── Topic 1: Tools of Geometry ─────────────────────────────────────────────
  {
    id: "ch1-1-points-lines",
    chapter: 1,
    chapterTitle: "Topic 1: Tools of Geometry",
    title: "1-1: Nets and Drawings",
    story: "Visualizing 3D objects in 2D space.",
    teks: "G.1(A) · G.4(D)",
    description: "Identify nets and orthographic drawings of geometric solids.",
    generate: placeholderGenerator,
  },
  {
    id: "ch1-test",
    chapter: 1,
    chapterTitle: "Topic 1: Tools of Geometry",
    title: "Topic 1 Test",
    story: "Comprehensive assessment of geometric foundations.",
    teks: "G.2(B) · G.5(C)",
    description: "Points, lines, planes, segments, and basic constructions.",
    generate: (m, s) => topicTestGenerator(1, m, s),
  },
  // ── Topic 2: Reasoning and Proof ──────────────────────────────────────────
  {
    id: "ch2-1-inductive-reasoning",
    chapter: 2,
    chapterTitle: "Topic 2: Reasoning and Proof",
    title: "2-1: Inductive Reasoning",
    story: "Find patterns and make conjectures.",
    teks: "G.4(A)",
    description: "Using patterns to find individual cases and making predictions.",
    generate: placeholderGenerator,
  },
  {
    id: "ch2-test",
    chapter: 2,
    chapterTitle: "Topic 2: Reasoning and Proof",
    title: "Topic 2 Test",
    story: "Logic and formal proof structures.",
    teks: "G.4(A) · G.4(B)",
    description: "Conditional statements, deductive reasoning, and segment/angle proofs.",
    generate: (m, s) => topicTestGenerator(2, m, s),
  },
  // ── Topic 3: Parallel and Perpendicular Lines ─────────────────────────────
  {
    id: "ch3-1-lines-angles",
    chapter: 3,
    chapterTitle: "Topic 3: Parallel and Perpendicular Lines",
    title: "3-1: Lines and Angles",
    story: "Identify relationships between lines and angles.",
    teks: "G.5(A)",
    description: "Identify parallel, skew, and perpendicular lines, and transversal angles.",
    generate: placeholderGenerator,
  },
  {
    id: "ch3-test",
    chapter: 3,
    chapterTitle: "Topic 3: Parallel and Perpendicular Lines",
    title: "Topic 3 Test",
    story: "Angles created by transversals and parallel lines.",
    teks: "G.5(A) · G.5(B)",
    description: "Parallel lines, slope, and equations of lines.",
    generate: (m, s) => topicTestGenerator(3, m, s),
  },
  // ── Topic 4: Congruent Triangles ──────────────────────────────────────────
  {
    id: "logic-of-congruence",
    chapter: 4,
    chapterTitle: "Topic 4: Congruent Triangles",
    title: "Logic of Congruence",
    story: "Prove two triangles are congruent using SSS, SAS, ASA, AAS, or HL.",
    teks: "G.6(B)",
    description: "Structured two-column proofs applying the five triangle congruence theorems.",
    generate: congruenceProblems,
  },
  {
    id: "ch4-test",
    chapter: 4,
    chapterTitle: "Topic 4: Congruent Triangles",
    title: "Topic 4 Test",
    story: "Assessment of triangle congruence and classification.",
    teks: "G.6(B)",
    description: "Comprehensive test on SSS, SAS, ASA, AAS, and HL postulates.",
    generate: (m, s) => topicTestGenerator(4, m, s),
  },
  // ── Topic 5: Relationships Within Triangles ───────────────────────────────
  {
    id: "ch5-1-midsegments",
    chapter: 5,
    chapterTitle: "Topic 5: Relationships Within Triangles",
    title: "5-1: Midsegments of Triangles",
    story: "Connecting midpoints to find hidden lengths.",
    teks: "G.5(D)",
    description: "Using the Triangle Midsegment Theorem to solve for segments and angles.",
    generate: placeholderGenerator,
  },
  {
    id: "ch5-test",
    chapter: 5,
    chapterTitle: "Topic 5: Relationships Within Triangles",
    title: "Topic 5 Test",
    story: "Bisectors, medians, altitudes, and triangle inequalities.",
    teks: "G.5(D) · G.6(D)",
    description: "Incenter, circumcenter, centroid, and orthocenter properties.",
    generate: (m, s) => topicTestGenerator(5, m, s),
  },
  // ── Topic 6: Polygons and Quadrilaterals ──────────────────────────────────
  {
    id: "ch6-1-polygons",
    chapter: 6,
    chapterTitle: "Topic 6: Polygons and Quadrilaterals",
    title: "6-1: The Polygon Angle-Sum Theorems",
    story: "Interior and exterior angles of multi-sided shapes.",
    teks: "G.5(A)",
    description: "Calculate the sum of interior angles and measures of individual exterior angles.",
    generate: placeholderGenerator,
  },
  {
    id: "ch6-test",
    chapter: 6,
    chapterTitle: "Topic 6: Polygons and Quadrilaterals",
    title: "Topic 6 Test",
    story: "Properties of parallelograms and special quadrilaterals.",
    teks: "G.6(E)",
    description: "Rhombuses, rectangles, squares, trapezoids, and kites.",
    generate: (m, s) => topicTestGenerator(6, m, s),
  },
  // ── Topic 7: Coordinate Geometry ──────────────────────────────────────────
  {
    id: "ch7-1-distance-midpoint",
    chapter: 7,
    chapterTitle: "Topic 7: Coordinate Geometry",
    title: "7-1: Distance and Midpoint",
    story: "Navigating the xy-plane with precision.",
    teks: "G.2(B)",
    description: "Use coordinate geometry to find distances and midpoints between points.",
    generate: coordinateProblems,
  },
  {
    id: "ch7-test",
    chapter: 7,
    chapterTitle: "Topic 7: Coordinate Geometry",
    title: "Topic 7 Test",
    story: "Analytic geometry of points and lines.",
    teks: "G.2(B) · G.2(C)",
    description: "Slope, parallel/perpendicular lines, and coordinate proofs.",
    generate: (m, s) => topicTestGenerator(7, m, s),
  },
  // ── Topic 8: Transformational Geometry ────────────────────────────────────
  {
    id: "ch8-1-translations",
    chapter: 8,
    chapterTitle: "Topic 8: Transformational Geometry",
    title: "8-1: Translations",
    story: "Sliding figures across the coordinate plane.",
    teks: "G.3(A)",
    description: "Represent translations as vectors and solve for new coordinates.",
    generate: placeholderGenerator,
  },
  {
    id: "ch8-test",
    chapter: 8,
    chapterTitle: "Topic 8: Transformational Geometry",
    title: "Topic 8 Test",
    story: "Reflections, translations, rotations, and symmetry.",
    teks: "G.3(A) · G.3(B) · G.3(C)",
    description: "Rigid motions and composition of transformations.",
    generate: (m, s) => topicTestGenerator(8, m, s),
  },
  // ── Topic 9: Similarity ────────────────────────────────────────────────────
  {
    id: "ch9-2-similar-polygons",
    chapter: 9,
    chapterTitle: "Topic 9: Similarity",
    title: "9-2: Similar Polygons",
    story: "Scaling shapes while preserving their form.",
    teks: "G.7(A)",
    description: "Using scale factors to solve for missing side lengths in similar figures.",
    generate: placeholderGenerator,
  },
  {
    id: "ch9-test",
    chapter: 9,
    chapterTitle: "Topic 9: Similarity",
    title: "Topic 9 Test",
    story: "Ratios, proportions, and similar figures.",
    teks: "G.7(A) · G.7(B)",
    description: "Triangle similarity theorems (AA~, SAS~, SSS~) and dilations.",
    generate: (m, s) => topicTestGenerator(9, m, s),
  },
  // ── Topic 10: Right Triangles and Trigonometry ─────────────────────────────
  {
    id: "trig-1-ratios",
    chapter: 10,
    chapterTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Trigonometry: Introduction to Ratios",
    story: "Identify sine, cosine, and tangent fractions for a reference angle.",
    teks: "G.9(A)",
    description: "Identify the SOH CAH TOA fractions given all three sides of a right triangle.",
    generate: trigIntroProblems,
  },
  {
    id: "trig-2-sides",
    chapter: 10,
    chapterTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Trigonometry: Solving for Sides",
    story: "Use trigonometric ratios to find missing side lengths.",
    teks: "G.9(A)",
    description: "Set up and solve sine, cosine, and tangent equations to find missing sides.",
    generate: trigSideProblems,
  },
  {
    id: "trig-3-angles",
    chapter: 10,
    chapterTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Trigonometry: Solving for Angles",
    story: "Use inverse trigonometric functions to find missing angles.",
    teks: "G.9(A)",
    description: "Apply inverse sine, inverse cosine, and inverse tangent to solve for a reference angle.",
    generate: trigAngleProblems,
  },
  {
    id: "special-right-triangles",
    chapter: 10,
    chapterTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Special Right Triangles",
    story: "Apply the exact ratios for 45-45-90 and 30-60-90 triangles.",
    teks: "G.9(B)",
    description: "Use simplified radical relationships (x, x, x√2 and x, x√3, 2x) to solve for missing sides.",
    generate: specialTriangleProblems,
  },
  {
    id: "elevation-depression",
    chapter: 10,
    chapterTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Angles of Elevation & Depression",
    story: "Solve real-world trigonometry problems using surveyor and lighthouse scenarios.",
    teks: "G.9(A)",
    description: "Translate descriptive word problems into trigonometric equations and solve for unknown measures.",
    generate: elevationDepressionProblems,
  },
  {
    id: "ch10-test",
    chapter: 10,
    chapterTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Topic 10 Test",
    story: "Comprehensive assessment of Right Triangles and Trigonometry.",
    teks: "G.8(A) · G.9(A) · G.9(B)",
    description: "Pythagorean theorem, special right triangles, and SOH CAH TOA.",
    generate: (m, s) => topicTestGenerator(10, m, s),
  },
  // ── Topic 11: Circle Measurement ──────────────────────────────────────────
  {
    id: "ch11-1-circumference",
    chapter: 11,
    chapterTitle: "Topic 11: Circle Measurement",
    title: "11-1: Circumference and Arc Length",
    story: "Measuring the curves of the world.",
    teks: "G.12(B)",
    description: "Calculate circumference and the length of specific arcs using radius and angle.",
    generate: measurementProblems,
  },
  {
    id: "ch11-test",
    chapter: 11,
    chapterTitle: "Topic 11: Circle Measurement",
    title: "Topic 11 Test",
    story: "Angles and measurement in circles.",
    teks: "G.12(B) · G.12(C)",
    description: "Circumference, area of a circle, arc length, and sector area.",
    generate: (m, s) => topicTestGenerator(11, m, s),
  },
  // ── Topic 12: Theorems About Circles ──────────────────────────────────────
  {
    id: "anatomy-of-a-circle",
    chapter: 12,
    chapterTitle: "Topic 12: Theorems About Circles",
    title: "Anatomy of a Circle",
    story: "Master inscribed angles, central angles, tangents, chords, and secants.",
    teks: "G.12(A)",
    description: "Problems on Inscribed Angle Theorem, Central Angle Theorem, Tangent-Chord angles, intersecting chords, and two-secant angles.",
    generate: circleProblems,
  },
  {
    id: "ch12-1-tangent-lines",
    chapter: 12,
    chapterTitle: "Topic 12: Theorems About Circles",
    title: "12-1: Tangent Lines",
    story: "Understanding lines that skim the edge of a circle.",
    teks: "G.12(A)",
    description: "Properties of tangents and their relationship to radii.",
    generate: placeholderGenerator,
  },
  {
    id: "ch12-test",
    chapter: 12,
    chapterTitle: "Topic 12: Theorems About Circles",
    title: "Topic 12 Test",
    story: "Comprehensive assessment of circle theorems.",
    teks: "G.12(A)",
    description: "Tangents, chords, arcs, and angles in circles.",
    generate: (m, s) => topicTestGenerator(12, m, s),
  },
  // ── Topic 13: Area ────────────────────────────────────────────────────────
  {
    id: "ch13-1-area-polygons",
    chapter: 13,
    chapterTitle: "Topic 13: Area",
    title: "13-1: Area of Parallelograms and Triangles",
    story: "Calculating flat space for standard shapes.",
    teks: "G.11(B)",
    description: "Find the area given base and height, including coordinate geometry scenarios.",
    generate: placeholderGenerator,
  },
  {
    id: "ch13-test",
    chapter: 13,
    chapterTitle: "Topic 13: Area",
    title: "Topic 13 Test",
    story: "Area of polygons and composite figures.",
    teks: "G.11(B)",
    description: "Calculating area for triangles, quadrilaterals, and regular polygons.",
    generate: (m, s) => topicTestGenerator(13, m, s),
  },
  // ── Topic 14: Surface Area and Volume ─────────────────────────────────────
  {
    id: "ch14-2-surface-area",
    chapter: 14,
    chapterTitle: "Topic 14: Surface Area and Volume",
    title: "14-2: Surface Area of Prisms and Cylinders",
    story: "Wrapping 3D shapes in logic.",
    teks: "G.11(C)",
    description: "Solve for lateral and total surface area using formulas.",
    generate: placeholderGenerator,
  },
  {
    id: "ch14-test",
    chapter: 14,
    chapterTitle: "Topic 14: Surface Area and Volume",
    title: "Topic 14 Test",
    story: "3D geometry, prisms, cylinders, pyramids, and spheres.",
    teks: "G.11(C)",
    description: "Surface area and volume of three-dimensional solids.",
    generate: (m, s) => topicTestGenerator(14, m, s),
  },
  // ── Topic 15: Probability ──────────────────────────────────────────────────
  {
    id: "target-zone",
    chapter: 15,
    chapterTitle: "Topic 15: Probability",
    title: "Target Zone",
    story: "Calculate the probability a dart hits the bullseye — or a spinner lands on the shaded region.",
    teks: "G.13(B)",
    description: "Area-based geometric probability using concentric circle (bullseye) and shaded sector (spinner) models.",
    generate: probabilityProblems,
  },
  {
    id: "ch15-1-experimental-theoretical",
    chapter: 15,
    chapterTitle: "Topic 15: Probability",
    title: "15-1: Experimental and Theoretical Probability",
    story: "Comparing what should happen to what actually happens.",
    teks: "G.13(B)",
    description: "Calculate frequencies and theoretical outcomes for geometric events.",
    generate: placeholderGenerator,
  },
  {
    id: "ch15-test",
    chapter: 15,
    chapterTitle: "Topic 15: Probability",
    title: "Topic 15 Test",
    story: "Geometric probability and permutations.",
    teks: "G.13(B) · G.13(C)",
    description: "Area probability, sample space, and simple probability events.",
    generate: (m, s) => topicTestGenerator(15, m, s),
  },
];

/** Look up a registry entry by id. Returns undefined if not found. */
export function getModule(id: string): CurriculumEntry | undefined {
  return CURRICULUM_REGISTRY.find((e) => e.id === id);
}

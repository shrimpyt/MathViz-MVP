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
import type { SpecialTriangleKnown } from "@/lib/factories/SpecialTrianglesFactory";
import { generateCoordinateProblems } from "@/lib/factories/CoordinateFactory";
import { generateMeasurementProblems } from "@/lib/factories/MeasurementFactory";
import type { MathProblem, OutputMode, TrigSubtype } from "@/lib/ProblemFactory";
import {
  proofCongruenceProblems,
  proofCPCTCProblems,
  proofIsoscelesProblems,
  proofParallelLineProblems,
  proofSimilarityProblems,
  proofCircleTheoremProblems,
  proofElementsProblems,
} from "./geometry-proofs";
import { generateAlgebra1Lesson } from "./algebra-1";
import {
  a2_4_1_addSubtract,
  a2_4_2_multiply,
  a2_4_3_detInverse,
  a2_4_4_systemsMatrices,
  a2_5_1_quadAttributes,
  a2_5_2_quadStandard,
  a2_5_3_quadModeling,
  a2_5_4_focusDirectrix,
  a2_5_5_quadFactoring,
  a2_5_6_quadEquations,
  a2_5_7_completingSquare,
  a2_5_8_quadFormula,
  a2_5_9_complexNumbers,
  a2_5_10_quadInequalities,
  a2_5_11_linQuadSystems,
  a2_7_6_logProperties,
  a2_7_7_expLogEquations,
  a2_8_2_linearFactorsZeros,
  a2_8_4_polySolve,
  a2_8_5_polyDivide,
  a2_8_6_rootTheorems,
  a2_11_1_simplify,
  a2_11_2_multDiv,
  a2_11_3_asymptotesHoles,
  a2_11_4_solveRational,
  a2_12_1_analyzingData,
  a2_12_2_regression,
  a2_12_3_usingModels,
  a2_p_trigIdentities,
  a2_p_logExpProofs,
  a2_p_polyIdentities,
  a2x_sequences,
  a2x_circleEquations,
  a2_2_1_relationsFunctions,
  a2_2_2_attributesFunctions,
  a2_2_3_absTransformations,
  a2_2_4_absIneqGraph,
  a2_2_5_absEquations,
  a2_2_6_absInequalities,
  a2_3_1_systemsGraphs,
  a2_3_2_systemsAlgebraic,
  a2_3_3_systemsInequalities,
  a2_3_4_threeVariables,
  a2_3_5_matricesSystems,
  a2_6_1_functionOperations,
  a2_6_2_inverseFunctions,
  a2_6_3_sqrtTransformations,
  a2_6_4_sqrtAsInverses,
  a2_6_5_sqrtEquationsIntro,
  a2_6_6_sqrtEquationsSolving,
  a2_7_1_expAttributes,
  a2_7_2_eToX,
  a2_7_3_recursiveModels,
  a2_7_4_logAttributes,
  a2_7_5_naturalLog,
  a2_8_1_polyAttributes,
  a2_8_3_polyAddSubMul,
  a2_8_7_fta,
  a2_9_1_rootsRadicals,
  a2_9_2_radicalMultDiv,
  a2_9_3_binomialRadicals,
  a2_9_4_rationalExponents,
  a2_10_1_cubicTransformations,
  a2_10_2_cuberootTransformations,
  a2_10_3_cuberootEquations,
  a2x_circleLineSystems,
} from "./algebra-2";
import {
  geo_1_1_foundations,
  geo_2_1_inductive,
  geo_5_1_midsegments,
  geo_6_1_polygons,
  geo_8_1_translations,
  geo_12_1_tangentLines,
  geo_13_1_area,
  geo_14_2_surfaceArea,
  geo_15_1_probability,
  geoTopicTest,
} from "./geometry-lessons";
import { MIDDLE_SCHOOL_ENTRIES } from "./middle-school";
import { SAT_MATH_REGISTRY } from "./sat-math";
import { PRECALCULUS_ENTRIES } from "./precalculus";
import { CALCULUS_ENTRIES } from "./calculus";

// ── Seeded PRNG — imported from canonical source ──────────────────────────────

import { mulberry32 } from "@/lib/math-utils";
import { assignDiagramVariants } from "@/lib/diagramVariants";

// ── Registry shape ────────────────────────────────────────────────────────────

export interface CurriculumEntry {
  /** Unique key used in URL params / state */
  id: string;
  /** Topic number in the curriculum */
  topic: number;
  /** Human-friendly topic title (e.g. "Topic 1: ...") */
  topicTitle: string;
  /** Human-friendly story title shown in the UI */
  title: string;
  /** One-sentence story framing shown as a sub-label */
  story: string;
  /** TEKS standard code(s) covered */
  teks: string;
  /** Short description for tooltips */
  description: string;
  /** True when this lesson has no real generator yet (shows "under construction"). */
  underConstruction?: boolean;
  /**
   * Generate problems for the given mode and seed.
   * Base counts: GuidedNote = 1×, Review = 3×, Test = 1× (but clean blanks).
   * `options.count` overrides the count; `options.difficulty` filters subtypes.
   */
  generate(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[];
}

// ── Generation options ────────────────────────────────────────────────────────

/**
 * Difficulty tier applied as a filter over each lesson's own subtypes.
 *   1 (Easy):   direct, single-step application
 *   2 (Medium): + working backwards / multi-step
 *   3 (Hard):   everything the lesson covers
 * Lessons with a single concept (circle theorems, probability, …) ignore it.
 */
export type DifficultyLevel = 1 | 2 | 3;

export interface GenerateOptions {
  /** Problems to generate for this entry. Defaults to the mode-based counts. */
  count?: number;
  /** Difficulty tier filter. Defaults to 2 (Medium). */
  difficulty?: DifficultyLevel;
}

/** Trig subtypes unlocked at each difficulty tier (cumulative). */
const TRIG_BY_DIFFICULTY: Record<DifficultyLevel, readonly TrigSubtype[]> = {
  1: ["IdentifyRatio"],
  2: ["IdentifyRatio", "SolveForSide"],
  3: ["IdentifyRatio", "SolveForSide", "SolveForAngle", "ElevationDepression"],
};

/** Special-triangle "given" sides unlocked at each difficulty tier (cumulative). */
const SPECIAL_KNOWN_BY_DIFFICULTY: Record<DifficultyLevel, readonly SpecialTriangleKnown[]> = {
  1: ["leg", "shortLeg"],
  2: ["leg", "shortLeg", "hypotenuse"],
  3: ["leg", "shortLeg", "hypotenuse", "longLeg"],
};

/**
 * Intersect a lesson's own allowed subtypes with the difficulty filter.
 * Falls back to the lesson's list when the intersection is empty (so a
 * single-concept lesson never generates zero problems).
 */
function filterAllowed<T>(lesson: readonly T[], byDifficulty: readonly T[]): readonly T[] {
  const inter = lesson.filter((s) => byDifficulty.includes(s));
  return inter.length > 0 ? inter : lesson;
}

function difficultyOf(options?: GenerateOptions): DifficultyLevel {
  return options?.difficulty ?? 2;
}

// ── Module generators ─────────────────────────────────────────────────────────

function circleProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 9 : 3);
  return assignDiagramVariants(AnatomyOfACircle.generateMany(count, rng), rng);
}

function probabilityProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 6 : 2);
  return assignDiagramVariants(TargetZone.generateMany(count, rng), rng);
}

function congruenceProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 6 : 2);
  return assignDiagramVariants(LogicOfCongruence.generateMany(count, rng), rng);
}

function trigProblems(
  lesson: readonly TrigSubtype[],
  mode: OutputMode,
  seed: number,
  options?: GenerateOptions
): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 6 : 3);
  const subtypes = filterAllowed(lesson, TRIG_BY_DIFFICULTY[difficultyOf(options)]);
  return assignDiagramVariants(generateTrigProblems(rng, count, subtypes), rng);
}

const trigIntroProblems = (m: OutputMode, s: number, o?: GenerateOptions) =>
  trigProblems(["IdentifyRatio"], m, s, o);
const trigSideProblems = (m: OutputMode, s: number, o?: GenerateOptions) =>
  trigProblems(["SolveForSide"], m, s, o);
const trigAngleProblems = (m: OutputMode, s: number, o?: GenerateOptions) =>
  trigProblems(["SolveForAngle"], m, s, o);
const elevationDepressionProblems = (m: OutputMode, s: number, o?: GenerateOptions) =>
  trigProblems(["ElevationDepression"], m, s, o);

function specialTriangleProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 6 : 3);
  return assignDiagramVariants(
    generateSpecialTriangleProblems(
      rng,
      count,
      SPECIAL_KNOWN_BY_DIFFICULTY[difficultyOf(options)]
    ),
    rng
  );
}

function coordinateProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 6 : 3);
  return assignDiagramVariants(generateCoordinateProblems(rng, count), rng);
}

function measurementProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 6 : 3);
  return assignDiagramVariants(generateMeasurementProblems(rng, count), rng);
}

function placeholderGenerator(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  return [{
    type: "G.12A",
    subtype: "InscribedAngle",
    given: {},
    find: "TBD",
    answer: 0,
    unit: "°",
    steps: [{ instruction: "This lesson is currently under construction." }],
    svgParams: { 
      kind: "InscribedAngle",
      interceptedArc: 60,
      inscribedAngle: 30
    }
  }];
}

/** 
 * Comprehensive test generator for each topic number.
 * Picks a representative mix from all sub-generators in that topic.
 */
function topicTestGenerator(topic: number, mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  // Tests are typically 10 mixed problems, reviews might be 15
  const count = options?.count ?? (mode === "Review" ? 15 : 10);
  const difficulty = difficultyOf(options);
  
  switch(topic) {
    case 4: // Topic 4: Congruent Triangles
      return LogicOfCongruence.generateMany(count, rng);
    case 7: // Topic 7: Coordinate Geometry
      return generateCoordinateProblems(rng, count);
    case 10: // Topic 10: Trig
      return generateTrigProblems(
        rng,
        count,
        filterAllowed(
          ["IdentifyRatio", "SolveForSide", "SolveForAngle", "ElevationDepression"] as const,
          TRIG_BY_DIFFICULTY[difficulty]
        )
      );
    case 11: // Topic 11: Circle Measurement
      return generateMeasurementProblems(rng, count);
    case 12: // Topic 12: Circle Theorems
      return AnatomyOfACircle.generateMany(count, rng);
    case 15: // Topic 15: Probability
      return TargetZone.generateMany(count, rng);
    default:
      return placeholderGenerator(mode, seed, options);
  }
}

// ── The registry ──────────────────────────────────────────────────────────────

const REGISTRY_ENTRIES: CurriculumEntry[] = [
  // ── Topic 1: Tools of Geometry ─────────────────────────────────────────────
  {
    id: "ch1-1-points-lines",
    topic: 1,
    topicTitle: "Topic 1: Tools of Geometry",
    title: "1-1: Points, Lines, Planes & Nets",
    story: "Visualizing 3D objects in 2D space.",
    teks: "G.1(A) · G.4(D)",
    description: "Points, lines, and planes fundamentals (naming, collinear and coplanar points, intersections, segment and angle measures) together with nets and orthographic drawings of solids.",
    generate: geo_1_1_foundations,
  },
  {
    id: "ch1-test",
    topic: 1,
    topicTitle: "Topic 1: Tools of Geometry",
    title: "Topic 1 Test",
    story: "Comprehensive assessment of geometric foundations.",
    teks: "G.2(B) · G.5(C)",
    description: "Points, lines, planes, segments, and basic constructions.",
    generate: (m, s, o) => geoTopicTest(1, m, s, o),
  },
  // ── Topic 2: Reasoning and Proof ──────────────────────────────────────────
  {
    id: "ch2-1-inductive-reasoning",
    topic: 2,
    topicTitle: "Topic 2: Reasoning and Proof",
    title: "2-1: Inductive Reasoning",
    story: "Find patterns and make conjectures.",
    teks: "G.4(A)",
    description: "Using patterns to find individual cases and making predictions.",
    generate: geo_2_1_inductive,
  },
  {
    id: "ch2-test",
    topic: 2,
    topicTitle: "Topic 2: Reasoning and Proof",
    title: "Topic 2 Test",
    story: "Logic and formal proof structures.",
    teks: "G.4(A) · G.4(B)",
    description: "Conditional statements, deductive reasoning, and segment/angle proofs.",
    generate: (m, s, o) => geoTopicTest(2, m, s, o),
  },
  // ── Topic 3: Parallel and Perpendicular Lines ─────────────────────────────
  {
    id: "ch3-test",
    topic: 3,
    topicTitle: "Topic 3: Parallel and Perpendicular Lines",
    title: "Topic 3 Test",
    story: "Angles created by transversals and parallel lines.",
    teks: "G.5(A) · G.5(B)",
    description: "Parallel lines, slope, and equations of lines.",
    generate: (m, s, o) => geoTopicTest(3, m, s, o),
  },
  // ── Topic 4: Congruent Triangles ──────────────────────────────────────────
  {
    id: "logic-of-congruence",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "Logic of Congruence",
    story: "Prove two triangles are congruent using SSS, SAS, ASA, AAS, or HL.",
    teks: "G.6(B)",
    description: "Structured two-column proofs applying the five triangle congruence theorems.",
    generate: congruenceProblems,
  },
  {
    id: "ch4-test",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "Topic 4 Test",
    story: "Assessment of triangle congruence and classification.",
    teks: "G.6(B)",
    description: "Comprehensive test on SSS, SAS, ASA, AAS, and HL postulates.",
    generate: (m, s, o) => topicTestGenerator(4, m, s, o),
  },
  // ── Topic 5: Relationships Within Triangles ───────────────────────────────
  {
    id: "ch5-1-midsegments",
    topic: 5,
    topicTitle: "Topic 5: Relationships Within Triangles",
    title: "5-1: Midsegments of Triangles",
    story: "Connecting midpoints to find hidden lengths.",
    teks: "G.5(D)",
    description: "Using the Triangle Midsegment Theorem to solve for segments and angles.",
    generate: geo_5_1_midsegments,
  },
  {
    id: "ch5-test",
    topic: 5,
    topicTitle: "Topic 5: Relationships Within Triangles",
    title: "Topic 5 Test",
    story: "Bisectors, medians, altitudes, and triangle inequalities.",
    teks: "G.5(D) · G.6(D)",
    description: "Incenter, circumcenter, centroid, and orthocenter properties.",
    generate: (m, s, o) => geoTopicTest(5, m, s, o),
  },
  // ── Topic 6: Polygons and Quadrilaterals ──────────────────────────────────
  {
    id: "ch6-1-polygons",
    topic: 6,
    topicTitle: "Topic 6: Polygons and Quadrilaterals",
    title: "6-1: The Polygon Angle-Sum Theorems",
    story: "Interior and exterior angles of multi-sided shapes.",
    teks: "G.5(A)",
    description: "Calculate the sum of interior angles and measures of individual exterior angles.",
    generate: geo_6_1_polygons,
  },
  {
    id: "ch6-test",
    topic: 6,
    topicTitle: "Topic 6: Polygons and Quadrilaterals",
    title: "Topic 6 Test",
    story: "Properties of parallelograms and special quadrilaterals.",
    teks: "G.6(E)",
    description: "Rhombuses, rectangles, squares, trapezoids, and kites.",
    generate: (m, s, o) => geoTopicTest(6, m, s, o),
  },
  // ── Topic 7: Coordinate Geometry ──────────────────────────────────────────
  {
    id: "ch7-1-distance-midpoint",
    topic: 7,
    topicTitle: "Topic 7: Coordinate Geometry",
    title: "7-1: Distance and Midpoint",
    story: "Navigating the xy-plane with precision.",
    teks: "G.2(B)",
    description: "Use coordinate geometry to find distances and midpoints between points.",
    generate: coordinateProblems,
  },
  {
    id: "ch7-test",
    topic: 7,
    topicTitle: "Topic 7: Coordinate Geometry",
    title: "Topic 7 Test",
    story: "Analytic geometry of points and lines.",
    teks: "G.2(B) · G.2(C)",
    description: "Slope, parallel/perpendicular lines, and coordinate proofs.",
    generate: (m, s, o) => topicTestGenerator(7, m, s, o),
  },
  // ── Topic 8: Transformational Geometry ────────────────────────────────────
  {
    id: "ch8-1-translations",
    topic: 8,
    topicTitle: "Topic 8: Transformational Geometry",
    title: "8-1: Translations",
    story: "Sliding figures across the coordinate plane.",
    teks: "G.3(A)",
    description: "Represent translations as vectors and solve for new coordinates.",
    generate: geo_8_1_translations,
  },
  {
    id: "ch8-test",
    topic: 8,
    topicTitle: "Topic 8: Transformational Geometry",
    title: "Topic 8 Test",
    story: "Reflections, translations, rotations, and symmetry.",
    teks: "G.3(A) · G.3(B) · G.3(C)",
    description: "Rigid motions and composition of transformations.",
    generate: (m, s, o) => geoTopicTest(8, m, s, o),
  },
  // ── Topic 9: Similarity ────────────────────────────────────────────────────
  {
    id: "ch9-test",
    topic: 9,
    topicTitle: "Topic 9: Similarity",
    title: "Topic 9 Test",
    story: "Ratios, proportions, and similar figures.",
    teks: "G.7(A) · G.7(B)",
    description: "Triangle similarity theorems (AA~, SAS~, SSS~) and dilations.",
    generate: (m, s, o) => geoTopicTest(9, m, s, o),
  },
  // ── Topic 10: Right Triangles and Trigonometry ─────────────────────────────
  {
    id: "trig-1-ratios",
    topic: 10,
    topicTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Trigonometry: Introduction to Ratios",
    story: "Identify sine, cosine, and tangent fractions for a reference angle.",
    teks: "G.9(A)",
    description: "Identify the SOH CAH TOA fractions given all three sides of a right triangle.",
    generate: trigIntroProblems,
  },
  {
    id: "trig-2-sides",
    topic: 10,
    topicTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Trigonometry: Solving for Sides",
    story: "Use trigonometric ratios to find missing side lengths.",
    teks: "G.9(A)",
    description: "Set up and solve sine, cosine, and tangent equations to find missing sides.",
    generate: trigSideProblems,
  },
  {
    id: "trig-3-angles",
    topic: 10,
    topicTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Trigonometry: Solving for Angles",
    story: "Use inverse trigonometric functions to find missing angles.",
    teks: "G.9(A)",
    description: "Apply inverse sine, inverse cosine, and inverse tangent to solve for a reference angle.",
    generate: trigAngleProblems,
  },
  {
    id: "special-right-triangles",
    topic: 10,
    topicTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Special Right Triangles",
    story: "Apply the exact ratios for 45-45-90 and 30-60-90 triangles.",
    teks: "G.9(B)",
    description: "Use simplified radical relationships (x, x, x√2 and x, x√3, 2x) to solve for missing sides.",
    generate: specialTriangleProblems,
  },
  {
    id: "elevation-depression",
    topic: 10,
    topicTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Angles of Elevation & Depression",
    story: "Solve real-world trigonometry problems using surveyor and lighthouse scenarios.",
    teks: "G.9(A)",
    description: "Translate descriptive word problems into trigonometric equations and solve for unknown measures.",
    generate: elevationDepressionProblems,
  },
  {
    id: "ch10-test",
    topic: 10,
    topicTitle: "Topic 10: Right Triangles and Trigonometry",
    title: "Topic 10 Test",
    story: "Comprehensive assessment of Right Triangles and Trigonometry.",
    teks: "G.8(A) · G.9(A) · G.9(B)",
    description: "Pythagorean theorem, special right triangles, and SOH CAH TOA.",
    generate: (m, s, o) => topicTestGenerator(10, m, s, o),
  },
  // ── Topic 11: Circle Measurement ──────────────────────────────────────────
  {
    id: "ch11-1-circumference",
    topic: 11,
    topicTitle: "Topic 11: Circle Measurement",
    title: "11-1: Circumference and Arc Length",
    story: "Measuring the curves of the world.",
    teks: "G.12(B)",
    description: "Calculate circumference and the length of specific arcs using radius and angle.",
    generate: measurementProblems,
  },
  {
    id: "ch11-test",
    topic: 11,
    topicTitle: "Topic 11: Circle Measurement",
    title: "Topic 11 Test",
    story: "Angles and measurement in circles.",
    teks: "G.12(B) · G.12(C)",
    description: "Circumference, area of a circle, arc length, and sector area.",
    generate: (m, s, o) => topicTestGenerator(11, m, s, o),
  },
  // ── Topic 12: Theorems About Circles ──────────────────────────────────────
  {
    id: "anatomy-of-a-circle",
    topic: 12,
    topicTitle: "Topic 12: Theorems About Circles",
    title: "Anatomy of a Circle",
    story: "Master inscribed angles, central angles, tangents, chords, and secants.",
    teks: "G.12(A)",
    description: "Problems on Inscribed Angle Theorem, Central Angle Theorem, Tangent-Chord angles, intersecting chords, and two-secant angles.",
    generate: circleProblems,
  },
  {
    id: "ch12-1-tangent-lines",
    topic: 12,
    topicTitle: "Topic 12: Theorems About Circles",
    title: "12-1: Tangent Lines",
    story: "Understanding lines that skim the edge of a circle.",
    teks: "G.12(A)",
    description: "Properties of tangents and their relationship to radii.",
    generate: geo_12_1_tangentLines,
  },
  {
    id: "ch12-test",
    topic: 12,
    topicTitle: "Topic 12: Theorems About Circles",
    title: "Topic 12 Test",
    story: "Comprehensive assessment of circle theorems.",
    teks: "G.12(A)",
    description: "Tangents, chords, arcs, and angles in circles.",
    generate: (m, s, o) => topicTestGenerator(12, m, s, o),
  },
  // ── Topic 13: Area ────────────────────────────────────────────────────────
  {
    id: "ch13-1-area-polygons",
    topic: 13,
    topicTitle: "Topic 13: Area",
    title: "13-1: Area of Parallelograms and Triangles",
    story: "Calculating flat space for standard shapes.",
    teks: "G.11(B)",
    description: "Find the area given base and height, including coordinate geometry scenarios.",
    generate: geo_13_1_area,
  },
  {
    id: "ch13-test",
    topic: 13,
    topicTitle: "Topic 13: Area",
    title: "Topic 13 Test",
    story: "Area of polygons and composite figures.",
    teks: "G.11(B)",
    description: "Calculating area for triangles, quadrilaterals, and regular polygons.",
    generate: (m, s, o) => geoTopicTest(13, m, s, o),
  },
  // ── Topic 14: Surface Area and Volume ─────────────────────────────────────
  {
    id: "ch14-2-surface-area",
    topic: 14,
    topicTitle: "Topic 14: Surface Area and Volume",
    title: "14-2: Surface Area of Prisms and Cylinders",
    story: "Wrapping 3D shapes in logic.",
    teks: "G.11(C)",
    description: "Solve for lateral and total surface area using formulas.",
    generate: geo_14_2_surfaceArea,
  },
  {
    id: "ch14-test",
    topic: 14,
    topicTitle: "Topic 14: Surface Area and Volume",
    title: "Topic 14 Test",
    story: "3D geometry, prisms, cylinders, pyramids, and spheres.",
    teks: "G.11(C)",
    description: "Surface area and volume of three-dimensional solids.",
    generate: (m, s, o) => geoTopicTest(14, m, s, o),
  },
  // ── Topic 15: Probability ──────────────────────────────────────────────────
  {
    id: "target-zone",
    topic: 15,
    topicTitle: "Topic 15: Probability",
    title: "Target Zone",
    story: "Calculate the probability a dart hits the bullseye — or a spinner lands on the shaded region.",
    teks: "G.13(B)",
    description: "Area-based geometric probability using concentric circle (bullseye) and shaded sector (spinner) models.",
    generate: probabilityProblems,
  },
  {
    id: "ch15-1-experimental-theoretical",
    topic: 15,
    topicTitle: "Topic 15: Probability",
    title: "15-1: Experimental and Theoretical Probability",
    story: "Comparing what should happen to what actually happens.",
    teks: "G.13(B)",
    description: "Calculate frequencies and theoretical outcomes for geometric events.",
    generate: geo_15_1_probability,
  },
  {
    id: "ch15-test",
    topic: 15,
    topicTitle: "Topic 15: Probability",
    title: "Topic 15 Test",
    story: "Geometric probability and permutations.",
    teks: "G.13(B) · G.13(C)",
    description: "Area probability, sample space, and simple probability events.",
    generate: (m, s, o) => topicTestGenerator(15, m, s, o),
  },
  // ── Geometry Proofs (Topics 2, 3, 4, 9, 12) ───────────────────────────────
  {
    id: "proofs-2-4-elements",
    topic: 2,
    topicTitle: "Topic 2: Reasoning and Proof",
    title: "2-4: Deductive Reasoning — Euclid's Elements",
    story: "Prove the great theorems the way Euclid did — I.47 and friends, in classical style.",
    teks: "G.4(B)",
    description:
      "Eight flagship propositions (I.1, I.4, I.5, I.8, I.29, I.32, I.47, I.48) with classical enunciation, construction diagrams, demonstration, and Q.E.D.",
    generate: (m, s, o) => proofElementsProblems(m, s, o),
  },
  {
    id: "proofs-3-2-parallel-properties",
    topic: 3,
    topicTitle: "Topic 3: Parallel and Perpendicular Lines",
    title: "3-2: Properties of Parallel Lines — Proofs",
    story: "Corresponding, alternate interior, and same-side angles — proved, not just stated.",
    teks: "G.5(A)",
    description:
      "Two-column transversal proofs: one-theorem applications and two-step angle chases, with marked 8-angle diagrams.",
    generate: (m, s, o) => proofParallelLineProblems([1, 2], m, s, o),
  },
  {
    id: "proofs-3-3-proving-parallel",
    topic: 3,
    topicTitle: "Topic 3: Parallel and Perpendicular Lines",
    title: "3-3: Proving Lines Parallel — Proofs",
    story: "Turn angle data into a parallelism proof via the converses.",
    teks: "G.5(A)",
    description:
      "Two-column proofs that conclude l ∥ m from congruent or supplementary angle pairs (Corresponding / Alternate Interior / Same-Side Interior converses).",
    generate: (m, s, o) => proofParallelLineProblems([3], m, s, o),
  },
  {
    id: "proofs-4-2-sss-sas",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "4-2: Triangle Congruence by SSS and SAS — Proofs",
    story: "Three sides, or two sides and the included angle — build the proof.",
    teks: "G.6(B)",
    description:
      "Parameterized two-column SSS/SAS proofs with randomized side lengths and marked diagrams. Harder tiers derive facts from midpoints, bisectors, and perpendiculars.",
    generate: (m, s, o) => proofCongruenceProblems(["SSS", "SAS"], m, s, o),
  },
  {
    id: "proofs-4-3-asa-aas",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "4-3: Triangle Congruence by ASA and AAS — Proofs",
    story: "Two angles and a side — included or not — build the proof.",
    teks: "G.6(B)",
    description:
      "Parameterized two-column ASA/AAS proofs with randomized angle measures and marked diagrams.",
    generate: (m, s, o) => proofCongruenceProblems(["ASA", "AAS"], m, s, o),
  },
  {
    id: "proofs-4-4-cpctc",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "4-4: Corresponding Parts (CPCTC) — Proofs",
    story: "The triangles are congruent — now prove the part you weren't given.",
    teks: "G.6(B)",
    description:
      "Establish △ABC ≅ △DEF via SSS/SAS/ASA/AAS/HL, then conclude a non-given corresponding part by CPCTC.",
    generate: (m, s, o) => proofCPCTCProblems(m, s, o),
  },
  {
    id: "proofs-4-5-isosceles",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "4-5: Isosceles and Equilateral Triangles — Proofs",
    story: "Equal legs, equal base angles — prove it with a bisector, a median, or the converse.",
    teks: "G.6(B)",
    description:
      "Two-column proofs of the isosceles base-angles theorem (bisector+SAS or median+SSS, then CPCTC) and its converse (AAS).",
    generate: (m, s, o) => proofIsoscelesProblems(m, s, o),
  },
  {
    id: "proofs-4-6-hl",
    topic: 4,
    topicTitle: "Topic 4: Congruent Triangles",
    title: "4-6: Triangle Congruence by HL — Proofs",
    story: "Right triangles, hypotenuse and leg — build the proof.",
    teks: "G.6(B)",
    description:
      "Parameterized two-column HL proofs on genuine Pythagorean triples, with right-angle marks and ticked hypotenuse/leg.",
    generate: (m, s, o) => proofCongruenceProblems(["HL"], m, s, o),
  },
  {
    id: "proofs-9-3-similarity",
    topic: 9,
    topicTitle: "Topic 9: Similarity",
    title: "9-3: Proving Triangles Similar — Proofs",
    story: "Two angles match — the triangles are similar. Prove it.",
    teks: "G.7(A)",
    description:
      "Parameterized two-column AA similarity proofs with marked angle pairs.",
    generate: (m, s, o) => proofSimilarityProblems(m, s, o),
  },
  {
    id: "proofs-12-1-tangent-lines",
    topic: 12,
    topicTitle: "Topic 12: Circle Theorems",
    title: "12-1: Tangent Lines — Proofs",
    story: "A tangent meets a chord — prove the angle is half the intercepted arc.",
    teks: "G.12(A)",
    description:
      "Two-column tangent-chord angle proofs, including minor-arc derivation (360° − major arc) and tangent/inscribed comparison.",
    generate: (m, s, o) => proofCircleTheoremProblems(["TangentChord"], m, s, o),
  },
  {
    id: "proofs-12-3-inscribed-angles",
    topic: 12,
    topicTitle: "Topic 12: Circle Theorems",
    title: "12-3: Inscribed Angles — Proofs",
    story: "An inscribed angle is half its intercepted arc — prove it.",
    teks: "G.12(A)",
    description:
      "Two-column inscribed-angle proofs, including arc-addition derivations and two-angles-one-arc congruence.",
    generate: (m, s, o) => proofCircleTheoremProblems(["InscribedAngle"], m, s, o),
  },

  // ── Algebra I — Topics 101–109 ───────────────────────────────────────────
  // ── Algebra I — Topic 1: Solving Equations & Inequalities (doc T1) ──────────
  {
    id: "a1-1-1-multi-step-equations",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-1: Solving Multi-Step Equations",
    story: "Undo operations in reverse order to isolate the variable.",
    teks: "A.5A",
    description: "Solve multi-step linear equations, including distributive-property cases.",
    generate: (m, s, o) => generateAlgebra1Lesson("t1MultiStep", m, s, o),
  },
  {
    id: "a1-1-2-variables-both-sides",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-2: Variables on Both Sides",
    story: "Collect the variable terms before solving.",
    teks: "A.5A",
    description: "Solve equations with variables on both sides of the equal sign.",
    generate: (m, s, o) => generateAlgebra1Lesson("t1BothSides", m, s, o),
  },
  {
    id: "a1-1-3-literal-equations",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-3: Literal Equations",
    story: "Solve a formula for the variable you need.",
    teks: "A.12E",
    description: "Solve literal equations for a specified variable.",
    generate: (m, s, o) => generateAlgebra1Lesson("t1Literal", m, s, o),
  },
  {
    id: "a1-1-4-proportions",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-4: Proportions",
    story: "Cross-multiply to unlock the missing value.",
    teks: "A.5A",
    description: "Solve proportions using cross multiplication.",
    generate: (m, s, o) => generateAlgebra1Lesson("t1Proportions", m, s, o),
  },
  {
    id: "a1-1-5-multi-step-inequalities",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-5: Multi-Step Inequalities",
    story: "Same moves as equations — but watch the sign flip.",
    teks: "A.5B",
    description: "Solve multi-step linear inequalities, including sign-flip cases.",
    generate: (m, s, o) => generateAlgebra1Lesson("t1Inequalities", m, s, o),
  },
  {
    id: "a1-1-6-compound-inequalities",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-6: Compound Inequalities",
    story: "Two inequalities joined into one statement.",
    teks: "A.5B",
    description: "Solve compound inequalities of the form c₁ < ax + b < c₂.",
    generate: (m, s, o) => generateAlgebra1Lesson("t1Compound", m, s, o),
  },
  {
    id: "a1-1-7-absolute-value",
    topic: 101,
    topicTitle: "Algebra I — Topic 1: Solving Equations & Inequalities",
    title: "1-7: Absolute Value Equations",
    story: "Split into two cases and solve each.",
    teks: "A.5A",
    description: "Solve absolute value equations of the form |x + b| = c. (Mission extension: the scope doc places absolute value in Algebra II.)",
    generate: (m, s, o) => generateAlgebra1Lesson("t1AbsoluteValue", m, s, o),
  },
  // ── Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed) ─────
  {
    id: "a1-23-1-rate-of-change",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-1: Rate of Change & Slope",
    story: "Rise over run tells the story of the line.",
    teks: "A.3B",
    description: "Calculate slope from two points.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Slope", m, s, o),
  },
  {
    id: "a1-23-2-slope-intercept",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-2: Slope-Intercept Form",
    story: "y = mx + b: the most useful form in algebra.",
    teks: "A.2B",
    description: "Write equations in slope-intercept form from a slope and a point or two points.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23SlopeIntercept", m, s, o),
  },
  {
    id: "a1-23-3-direct-variation",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-3: Direct Variation",
    story: "When y is a pure multiple of x.",
    teks: "A.2D",
    description: "Find the constant of variation and solve direct-variation problems.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23DirectVariation", m, s, o),
  },
  {
    id: "a1-23-4-point-slope",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-4: Point-Slope Form",
    story: "A point and a slope are all you need.",
    teks: "A.2B",
    description: "Write equations in point-slope form.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23PointSlope", m, s, o),
  },
  {
    id: "a1-23-5-standard-form",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-5: Standard Form",
    story: "Ax + By = C, converted to slope-intercept.",
    teks: "A.2B",
    description: "Rewrite standard-form equations in slope-intercept form.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Standard", m, s, o),
  },
  {
    id: "a1-23-6-graphing-function-rule",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-6: Graphing a Function Rule",
    story: "Two intercepts draw the whole line.",
    teks: "A.3C",
    description: "Graph linear functions and identify x- and y-intercepts.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Graphing", m, s, o),
  },
  {
    id: "a1-23-7-writing-function-rule",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-7: Writing a Function Rule",
    story: "Read the pattern out of a table.",
    teks: "A.2C",
    description: "Write a function rule from a table of values.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23WriteRule", m, s, o),
  },
  {
    id: "a1-23-8-relations-functions",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-8: Relations & Functions",
    story: "Every x gets exactly one y — or it is not a function.",
    teks: "A.12A",
    description: "Decide whether a relation is a function; state domain and range.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Relations", m, s, o),
  },
  {
    id: "a1-23-9-function-notation",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-9: Function Notation",
    story: "f(3) is just a substitution instruction.",
    teks: "A.2A",
    description: "Evaluate functions given in function notation.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Notation", m, s, o),
  },
  {
    id: "a1-23-10-parallel-perpendicular",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-10: Parallel & Perpendicular Lines",
    story: "Same slope, or opposite reciprocal.",
    teks: "A.2E · A.2F",
    description: "Write equations of lines parallel or perpendicular to a given line.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23ParallelPerp", m, s, o),
  },
  {
    id: "a1-23-11-transform-linear",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-11: Transformations of Linear Functions",
    story: "Shift the line without changing its slant.",
    teks: "A.3E",
    description: "Describe vertical and horizontal shifts of linear functions.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Transform", m, s, o),
  },
  {
    id: "a1-23-12-scatter-trend",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-12: Scatter Plots & Trend Lines",
    story: "Let the data pick the line.",
    teks: "A.4C",
    description: "Write the least-squares line of best fit and use it to predict.",
    generate: (m, s, o) => generateAlgebra1Lesson("t23Scatter", m, s, o),
  },
  {
    id: "a1-23-13-two-way-tables",
    topic: 102,
    topicTitle: "Algebra I — Topics 2/3: Functions & Linear Functions (taught mixed)",
    title: "2/3-13: Two-Way Tables",
    story: "Read joint and marginal frequencies.",
    teks: "A.4B",
    description: "Interpret two-way frequency tables. (Mission extension: statistics basics.)",
    generate: (m, s, o) => generateAlgebra1Lesson("t23TwoWay", m, s, o),
  },
  // ── Algebra I — Topic 4: Systems (doc T4) ────────────────────────────────────
  {
    id: "a1-4-1-systems-graphing",
    topic: 104,
    topicTitle: "Algebra I — Topic 4: Systems",
    title: "4-1: Solving Systems by Graphing",
    story: "The intersection point solves both equations.",
    teks: "A.3F",
    description: "Solve systems by graphing both lines.",
    generate: (m, s, o) => generateAlgebra1Lesson("t4Graphing", m, s, o),
  },
  {
    id: "a1-4-2-substitution",
    topic: 104,
    topicTitle: "Algebra I — Topic 4: Systems",
    title: "4-2: Solving Systems by Substitution",
    story: "Replace y and solve one equation.",
    teks: "A.5C",
    description: "Solve systems by substitution.",
    generate: (m, s, o) => generateAlgebra1Lesson("t4Substitution", m, s, o),
  },
  {
    id: "a1-4-3-elimination",
    topic: 104,
    topicTitle: "Algebra I — Topic 4: Systems",
    title: "4-3: Solving Systems by Elimination",
    story: "Add the equations to cancel a variable.",
    teks: "A.5C",
    description: "Solve systems by elimination.",
    generate: (m, s, o) => generateAlgebra1Lesson("t4Elimination", m, s, o),
  },
  {
    id: "a1-4-4-applications",
    topic: 104,
    topicTitle: "Algebra I — Topic 4: Systems",
    title: "4-4: Systems Applications",
    story: "Two unknowns, two relationships.",
    teks: "A.2I",
    description: "Solve real-world problems with systems of equations.",
    generate: (m, s, o) => generateAlgebra1Lesson("t4Applications", m, s, o),
  },
  {
    id: "a1-4-5-linear-inequalities",
    topic: 104,
    topicTitle: "Algebra I — Topic 4: Systems",
    title: "4-5: Linear Inequalities in Two Variables",
    story: "Shade the half-plane that works.",
    teks: "A.3D",
    description: "Graph the solution set of a linear inequality in two variables.",
    generate: (m, s, o) => generateAlgebra1Lesson("t4LinIneq", m, s, o),
  },
  {
    id: "a1-4-6-systems-inequalities",
    topic: 104,
    topicTitle: "Algebra I — Topic 4: Systems",
    title: "4-6: Systems of Inequalities",
    story: "The overlap is the solution.",
    teks: "A.3H",
    description: "Graph the solution set of a system of linear inequalities.",
    generate: (m, s, o) => generateAlgebra1Lesson("t4SysIneq", m, s, o),
  },
  // ── Algebra I — Topic 5: Exponents & Radicals (doc T5) ───────────────────────
  {
    id: "a1-5-1-zero-negative-exponents",
    topic: 105,
    topicTitle: "Algebra I — Topic 5: Exponents & Radicals",
    title: "5-1: Zero & Negative Exponents",
    story: "Flip the base, flip the sign.",
    teks: "A.11B",
    description: "Evaluate expressions with zero and negative exponents.",
    generate: (m, s, o) => generateAlgebra1Lesson("t5ZeroNeg", m, s, o),
  },
  {
    id: "a1-5-2-multiplying-powers",
    topic: 105,
    topicTitle: "Algebra I — Topic 5: Exponents & Radicals",
    title: "5-2: Multiplying Powers",
    story: "Same base? Add the exponents.",
    teks: "A.11B",
    description: "Multiply monomials using the product of powers rule.",
    generate: (m, s, o) => generateAlgebra1Lesson("t5Multiply", m, s, o),
  },
  {
    id: "a1-5-3-power-of-power",
    topic: 105,
    topicTitle: "Algebra I — Topic 5: Exponents & Radicals",
    title: "5-3: More Multiplication Properties",
    story: "A power of a power multiplies exponents.",
    teks: "A.11B",
    description: "Simplify powers of monomials.",
    generate: (m, s, o) => generateAlgebra1Lesson("t5PowerOfPower", m, s, o),
  },
  {
    id: "a1-5-4-division-properties",
    topic: 105,
    topicTitle: "Algebra I — Topic 5: Exponents & Radicals",
    title: "5-4: Division Properties of Exponents",
    story: "Same base? Subtract the exponents.",
    teks: "A.11B",
    description: "Divide monomials using the quotient of powers rule.",
    generate: (m, s, o) => generateAlgebra1Lesson("t5Division", m, s, o),
  },
  {
    id: "a1-5-5-rational-exponents",
    topic: 105,
    topicTitle: "Algebra I — Topic 5: Exponents & Radicals",
    title: "5-5: Rational Exponents & Radicals",
    story: "Fractional exponents are roots in disguise.",
    teks: "A.11B",
    description: "Evaluate expressions with rational exponents.",
    generate: (m, s, o) => generateAlgebra1Lesson("t5Rational", m, s, o),
  },
  {
    id: "a1-5-6-simplifying-radicals",
    topic: 105,
    topicTitle: "Algebra I — Topic 5: Exponents & Radicals",
    title: "5-6: Simplifying Radicals",
    story: "Pull out the perfect squares.",
    teks: "A.11A",
    description: "Simplify square roots to simplest radical form.",
    generate: (m, s, o) => generateAlgebra1Lesson("t5Radicals", m, s, o),
  },
  // ── Algebra I — Topic 6: Sequences (doc T6) ──────────────────────────────────
  {
    id: "a1-6-1-explicit-sequences",
    topic: 106,
    topicTitle: "Algebra I — Topic 6: Sequences",
    title: "6-1: Arithmetic & Geometric Sequences",
    story: "Find the pattern, jump to any term.",
    teks: "A.12D",
    description: "Write explicit formulas and find the nth term of arithmetic and geometric sequences.",
    generate: (m, s, o) => generateAlgebra1Lesson("t6Explicit", m, s, o),
  },
  {
    id: "a1-6-2-recursive-arithmetic",
    topic: 106,
    topicTitle: "Algebra I — Topic 6: Sequences",
    title: "6-2: Arithmetic Recursive Formulas",
    story: "Each term builds on the one before.",
    teks: "A.12C",
    description: "Evaluate arithmetic sequences defined recursively.",
    generate: (m, s, o) => generateAlgebra1Lesson("t6RecursiveArith", m, s, o),
  },
  {
    id: "a1-6-3-recursive-geometric",
    topic: 106,
    topicTitle: "Algebra I — Topic 6: Sequences",
    title: "6-3: Geometric Recursive Formulas",
    story: "Multiply your way forward.",
    teks: "A.12C",
    description: "Evaluate geometric sequences defined recursively.",
    generate: (m, s, o) => generateAlgebra1Lesson("t6RecursiveGeo", m, s, o),
  },
  // ── Algebra I — Topic 7: Polynomials & Factoring (doc T7) ────────────────────
  {
    id: "a1-7-1-add-subtract-poly",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-1: Adding & Subtracting Polynomials",
    story: "Combine what matches.",
    teks: "A.10A",
    description: "Add and subtract polynomials of degree one and two.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7AddSub", m, s, o),
  },
  {
    id: "a1-7-2-multiply-factor",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-2: Multiplying & Factoring Polynomials",
    story: "Pull out what every term shares.",
    teks: "A.10D",
    description: "Factor out the greatest common factor.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7MultiplyFactor", m, s, o),
  },
  {
    id: "a1-7-3-multiplying-binomials",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-3: Multiplying Binomials",
    story: "FOIL: First, Outer, Inner, Last.",
    teks: "A.10B",
    description: "Multiply binomials and binomial-by-trinomial products.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7Binomials", m, s, o),
  },
  {
    id: "a1-7-4-factor-x2bxc",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-4: Factoring x²+bx+c",
    story: "Find the two numbers that multiply to c and add to b.",
    teks: "A.10E",
    description: "Factor monic trinomials.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7FactorBasic", m, s, o),
  },
  {
    id: "a1-7-5-factor-ax2bxc",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-5: Factoring ax²+bx+c",
    story: "The leading coefficient joins the hunt.",
    teks: "A.10E",
    description: "Factor non-monic trinomials, including perfect square trinomials.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7FactorAC", m, s, o),
  },
  {
    id: "a1-7-6-special-cases",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-6: Special Factoring Cases",
    story: "Spot the pattern, skip the guesswork.",
    teks: "A.10B · A.10F",
    description: "Factor differences of squares.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7Special", m, s, o),
  },
  {
    id: "a1-7-7-grouping",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-7: Factoring by Grouping",
    story: "Pairs with a common binomial factor.",
    teks: "A.10B",
    description: "Factor four-term polynomials by grouping.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7Grouping", m, s, o),
  },
  {
    id: "a1-7-8-rational-expressions",
    topic: 107,
    topicTitle: "Algebra I — Topic 7: Polynomials & Factoring",
    title: "7-8: Simplifying Rational Expressions",
    story: "Cancel what is common — and note what is forbidden.",
    teks: "A.10D",
    description: "Simplify rational expressions and state restrictions.",
    generate: (m, s, o) => generateAlgebra1Lesson("t7Rational", m, s, o),
  },
  // ── Algebra I — Topic 8: Quadratics (doc T8) ─────────────────────────────────
  {
    id: "a1-8-1-graphs-properties",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-1: Graphs & Properties of Quadratics",
    story: "Axis, vertex, and range from standard form.",
    teks: "A.6A",
    description: "Identify key attributes of quadratics from standard form.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Graphs", m, s, o),
  },
  {
    id: "a1-8-2-quadratic-functions",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-2: Quadratic Functions",
    story: "Graph the parabola, mark what matters.",
    teks: "A.7A",
    description: "Graph quadratic functions and identify vertex, axis, and intercepts.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Functions", m, s, o),
  },
  {
    id: "a1-8-3-transformations",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-3: Transformations of Quadratics",
    story: "Shift, stretch, and reflect the parent parabola.",
    teks: "A.7C",
    description: "Describe transformations of f(x) = x².",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Transform", m, s, o),
  },
  {
    id: "a1-8-4-vertex-form",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-4: Vertex Form",
    story: "f(x) = a(x − h)² + k wears its vertex on its sleeve.",
    teks: "A.6B",
    description: "Write quadratics in vertex form.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Vertex", m, s, o),
  },
  {
    id: "a1-8-5-solving",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-5: Solving Quadratic Equations",
    story: "Pick the right tool for the equation.",
    teks: "A.8A",
    description: "Solve quadratics by factoring, completing the square, or the quadratic formula.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Solving", m, s, o),
  },
  {
    id: "a1-8-6-factoring-solve",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-6: Factoring to Solve",
    story: "Zero product property does the heavy lifting.",
    teks: "A.8A",
    description: "Solve quadratic equations by factoring.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8FactorSolve", m, s, o),
  },
  {
    id: "a1-8-7-writing",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-7: Writing Quadratic Functions",
    story: "Zeros become factors become equations.",
    teks: "A.6C",
    description: "Write quadratic functions given their zeros.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Writing", m, s, o),
  },
  {
    id: "a1-8-8-completing-square",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-8: Completing the Square",
    story: "Build the perfect square, then take roots.",
    teks: "A.8A",
    description: "Solve quadratics by completing the square.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8CTS", m, s, o),
  },
  {
    id: "a1-8-9-formula-discriminant",
    topic: 108,
    topicTitle: "Algebra I — Topic 8: Quadratics",
    title: "8-9: Quadratic Formula & Discriminant",
    story: "The discriminant predicts before you solve.",
    teks: "A.8A",
    description: "Solve with the quadratic formula; use the discriminant to count real solutions.",
    generate: (m, s, o) => generateAlgebra1Lesson("t8Formula", m, s, o),
  },
  // ── Algebra I — Topic 9: Exponentials (doc T9) ───────────────────────────────
  {
    id: "a1-9-1-exponential-functions",
    topic: 109,
    topicTitle: "Algebra I — Topic 9: Exponentials",
    title: "9-1: Exponential Functions",
    story: "f(x) = abˣ: intercept, asymptote, curve.",
    teks: "A.9A",
    description: "Graph exponential functions and identify key features.",
    generate: (m, s, o) => generateAlgebra1Lesson("t9Functions", m, s, o),
  },
  {
    id: "a1-9-2-growth-decay",
    topic: 109,
    topicTitle: "Algebra I — Topic 9: Exponentials",
    title: "9-2: Exponential Growth & Decay",
    story: "b > 1 grows; b < 1 decays.",
    teks: "A.9B",
    description: "Classify growth vs. decay, find rates, and evaluate.",
    generate: (m, s, o) => generateAlgebra1Lesson("t9GrowthDecay", m, s, o),
  },
  {
    id: "a1-9-3-modeling",
    topic: 109,
    topicTitle: "Algebra I — Topic 9: Exponentials",
    title: "9-3: Modeling Data with Exponentials",
    story: "Fit the curve, then predict.",
    teks: "A.9E",
    description: "Write exponential models from data and make predictions.",
    generate: (m, s, o) => generateAlgebra1Lesson("t9Modeling", m, s, o),
  },

  // ── Algebra II — Topics 201–214 ──────────────────────────────────────────
  {
    id: "a2-2-1-relations-functions",
    topic: 202,
    topicTitle: "Topic 2: Absolute Value",
    title: "2-1: Relations & Functions",
    story: "Decide whether a relation is a function.",
    teks: "A2.2",
    description: "Domain, range, and the vertical line test.",
    generate: (m, s, o) => a2_2_1_relationsFunctions(m, s, o),
  },
  {
    id: "a2-2-2-attributes-functions",
    topic: 202,
    topicTitle: "Topic 2: Absolute Value",
    title: "2-2: Attributes of Functions",
    story: "Intercepts, intervals of increase/decrease, and extrema.",
    teks: "A2.2",
    description: "Read key attributes directly from graphs and tables.",
    generate: (m, s, o) => a2_2_2_attributesFunctions(m, s, o),
  },
  {
    id: "a2-2-3-abs-transformations",
    topic: 202,
    topicTitle: "Topic 2: Absolute Value",
    title: "2-3: Absolute Value Transformations",
    story: "Shift, stretch, and reflect the V-shape.",
    teks: "A2.2",
    description: "Attributes and transformations of absolute value functions.",
    generate: (m, s, o) => a2_2_3_absTransformations(m, s, o),
  },
  {
    id: "a2-2-4-abs-inequalities-graph",
    topic: 202,
    topicTitle: "Topic 2: Absolute Value",
    title: "2-4: Graphing Absolute Value Inequalities",
    story: "Shade the region that satisfies the inequality.",
    teks: "A2.2",
    description: "Graph absolute value inequalities in two variables.",
    generate: (m, s, o) => a2_2_4_absIneqGraph(m, s, o),
  },
  {
    id: "a2-2-5-abs-equations",
    topic: 202,
    topicTitle: "Topic 2: Absolute Value",
    title: "2-5: Absolute Value Equations",
    story: "Split into two cases and check for extraneous roots.",
    teks: "A2.2",
    description: "Solve absolute value equations algebraically.",
    generate: (m, s, o) => a2_2_5_absEquations(m, s, o),
  },
  {
    id: "a2-2-6-abs-inequalities",
    topic: 202,
    topicTitle: "Topic 2: Absolute Value",
    title: "2-6: Absolute Value Inequalities",
    story: "And-bound versus or-bound solution sets.",
    teks: "A2.2",
    description: "Solve absolute value inequalities algebraically.",
    generate: (m, s, o) => a2_2_6_absInequalities(m, s, o),
  },
  {
    id: "a2-3-1-systems-graphs",
    topic: 203,
    topicTitle: "Topic 3: Systems",
    title: "3-1: Systems from Tables & Graphs",
    story: "Read the solution where the graphs cross.",
    teks: "A2.3",
    description: "Solve systems by interpreting tables and graphs.",
    generate: (m, s, o) => a2_3_1_systemsGraphs(m, s, o),
  },
  {
    id: "a2-3-2-systems-algebraic",
    topic: 203,
    topicTitle: "Topic 3: Systems",
    title: "3-2: Algebraic Methods",
    story: "Substitution and elimination, step by step.",
    teks: "A2.3",
    description: "Solve linear systems by substitution and elimination.",
    generate: (m, s, o) => a2_3_2_systemsAlgebraic(m, s, o),
  },
  {
    id: "a2-3-3-systems-inequalities",
    topic: 203,
    topicTitle: "Topic 3: Systems",
    title: "3-3: Systems of Inequalities",
    story: "Overlap the half-planes to find the feasible region.",
    teks: "A2.3",
    description: "Graph systems of linear inequalities.",
    generate: (m, s, o) => a2_3_3_systemsInequalities(m, s, o),
  },
  {
    id: "a2-3-4-three-variables",
    topic: 203,
    topicTitle: "Topic 3: Systems",
    title: "3-4: Systems in Three Variables",
    story: "Eliminate one variable at a time.",
    teks: "A2.3",
    description: "Solve 3×3 linear systems algebraically.",
    generate: (m, s, o) => a2_3_4_threeVariables(m, s, o),
  },
  {
    id: "a2-3-5-matrices-systems",
    topic: 203,
    topicTitle: "Topic 3: Systems",
    title: "3-5: Matrices in Systems",
    story: "First look at matrices as an organizing tool.",
    teks: "A2.3",
    description: "Introduce matrices in the context of linear systems.",
    generate: (m, s, o) => a2_3_5_matricesSystems(m, s, o),
  },
  {
    id: "a2-4-1-matrix-add-subtract",
    topic: 204,
    topicTitle: "Topic 4: Matrices",
    title: "4-1: Add & Subtract Matrices",
    story: "Combine matrices entry by entry.",
    teks: "A2.4",
    description: "Add and subtract matrices of matching dimensions.",
    generate: (m, s, o) => a2_4_1_addSubtract(m, s, o),
  },
  {
    id: "a2-4-2-matrix-multiply",
    topic: 204,
    topicTitle: "Topic 4: Matrices",
    title: "4-2: Matrix Multiplication",
    story: "Rows times columns — dimension discipline matters.",
    teks: "A2.4",
    description: "Multiply matrices with compatible inner dimensions.",
    generate: (m, s, o) => a2_4_2_multiply(m, s, o),
  },
  {
    id: "a2-4-3-det-inverse",
    topic: 204,
    topicTitle: "Topic 4: Matrices",
    title: "4-3: Determinants & Inverses",
    story: "The 2×2 determinant decides invertibility.",
    teks: "A2.4",
    description: "Compute 2×2 determinants and inverses (det ±1).",
    generate: (m, s, o) => a2_4_3_detInverse(m, s, o),
  },
  {
    id: "a2-4-4-systems-matrices",
    topic: 204,
    topicTitle: "Topic 4: Matrices",
    title: "4-4: Systems & Matrices",
    story: "Solve 2×2 systems with X = A⁻¹B.",
    teks: "A2.4",
    description: "Solve linear systems using inverse matrices.",
    generate: (m, s, o) => a2_4_4_systemsMatrices(m, s, o),
  },
  {
    id: "a2-5-1-quad-attributes",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-1: Attributes & Transformations",
    story: "How a, h, k reshape the parabola.",
    teks: "A2.5",
    description: "Attributes and transformations of quadratic functions.",
    generate: (m, s, o) => a2_5_1_quadAttributes(m, s, o),
  },
  {
    id: "a2-5-2-quad-standard",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-2: Standard Form",
    story: "Read direction, width, and the y-intercept from ax²+bx+c.",
    teks: "A2.5",
    description: "Work with quadratics in standard form.",
    generate: (m, s, o) => a2_5_2_quadStandard(m, s, o),
  },
  {
    id: "a2-5-3-quad-modeling",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-3: Modeling with Quadratics",
    story: "Fit a parabola to projectile and area situations.",
    teks: "A2.5",
    description: "Model real situations with quadratic functions.",
    generate: (m, s, o) => a2_5_3_quadModeling(m, s, o),
  },
  {
    id: "a2-5-4-focus-directrix",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-4: Focus & Directrix",
    story: "The geometric definition of a parabola.",
    teks: "A2.5",
    description: "Find the focus and directrix of a vertical parabola; read vertex and direction from vertex form.",
    generate: (m, s, o) => a2_5_4_focusDirectrix(m, s, o),
  },
  {
    id: "a2-5-5-quad-factoring",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-5: Factoring Quadratics",
    story: "Undo the multiplication to find the zeros.",
    teks: "A2.5",
    description: "Factor quadratics over the integers.",
    generate: (m, s, o) => a2_5_5_quadFactoring(m, s, o),
  },
  {
    id: "a2-5-6-quad-equations",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-6: Solving Quadratic Equations",
    story: "Square roots and the quadratic formula in action.",
    teks: "A2.5",
    description: "Solve quadratics by square roots and the quadratic formula.",
    generate: (m, s, o) => a2_5_6_quadEquations(m, s, o),
  },
  {
    id: "a2-5-7-completing-square",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-7: Completing the Square",
    story: "Build the perfect-square trinomial to reveal the vertex.",
    teks: "A2.5",
    description: "Rewrite quadratics in vertex form by completing the square (including non-monic leading coefficients).",
    generate: (m, s, o) => a2_5_7_completingSquare(m, s, o),
  },
  {
    id: "a2-5-8-quad-formula",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-8: Quadratic Formula & Discriminant",
    story: "The discriminant predicts the solution story.",
    teks: "A2.5",
    description: "Apply the quadratic formula; use the discriminant to classify solutions.",
    generate: (m, s, o) => a2_5_8_quadFormula(m, s, o),
  },
  {
    id: "a2-5-9-complex-numbers",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-9: Complex Numbers",
    story: "When the discriminant goes negative, i saves the day.",
    teks: "A2.5",
    description: "Solve quadratics with complex (non-real) solutions in a±bi form.",
    generate: (m, s, o) => a2_5_9_complexNumbers(m, s, o),
  },
  {
    id: "a2-5-10-quad-inequalities",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-10: Quadratic Inequalities",
    story: "Sign charts turn parabolas into interval answers.",
    teks: "A2.5",
    description: "Solve quadratic inequalities algebraically and graphically.",
    generate: (m, s, o) => a2_5_10_quadInequalities(m, s, o),
  },
  {
    id: "a2-5-11-lin-quad-systems",
    topic: 205,
    topicTitle: "Topic 5: Quadratics",
    title: "5-11: Linear-Quadratic Systems",
    story: "Where does the line meet the parabola?",
    teks: "A2.5",
    description: "Solve line–parabola systems by substitution (two intersections or tangent).",
    generate: (m, s, o) => a2_5_11_linQuadSystems(m, s, o),
  },
  {
    id: "a2-6-1-function-operations",
    topic: 206,
    topicTitle: "Topic 6: Square Root Functions",
    title: "6-1: Function Operations & Composition",
    story: "Add, multiply, and chain functions together.",
    teks: "A2.6",
    description: "Operations on functions and composition (f∘g)(x).",
    generate: (m, s, o) => a2_6_1_functionOperations(m, s, o),
  },
  {
    id: "a2-6-2-inverse-functions",
    topic: 206,
    topicTitle: "Topic 6: Square Root Functions",
    title: "6-2: Inverse Functions",
    story: "Undo a function by swapping x and y.",
    teks: "A2.6",
    description: "Find and verify inverse functions.",
    generate: (m, s, o) => a2_6_2_inverseFunctions(m, s, o),
  },
  {
    id: "a2-6-3-sqrt-transformations",
    topic: 206,
    topicTitle: "Topic 6: Square Root Functions",
    title: "6-3: Attributes & Transformations",
    story: "The square root curve, shifted and stretched.",
    teks: "A2.6",
    description: "Attributes and transformations of square root functions.",
    generate: (m, s, o) => a2_6_3_sqrtTransformations(m, s, o),
  },
  {
    id: "a2-6-4-sqrt-as-inverses",
    topic: 206,
    topicTitle: "Topic 6: Square Root Functions",
    title: "6-4: Square Roots as Inverses",
    story: "Square roots undo squaring — with a domain catch.",
    teks: "A2.6",
    description: "Connect square root functions to inverse quadratic relationships.",
    generate: (m, s, o) => a2_6_4_sqrtAsInverses(m, s, o),
  },
  {
    id: "a2-6-5-sqrt-equations-intro",
    topic: 206,
    topicTitle: "Topic 6: Square Root Functions",
    title: "6-5: Intro to Radical Equations",
    story: "Isolate the radical before you square.",
    teks: "A2.6",
    description: "First steps solving equations with radicals.",
    generate: (m, s, o) => a2_6_5_sqrtEquationsIntro(m, s, o),
  },
  {
    id: "a2-6-6-sqrt-equations-solving",
    topic: 206,
    topicTitle: "Topic 6: Square Root Functions",
    title: "6-6: Solving Radical Equations",
    story: "Square both sides — then check every candidate.",
    teks: "A2.6",
    description: "Solve radical equations and reject extraneous roots.",
    generate: (m, s, o) => a2_6_6_sqrtEquationsSolving(m, s, o),
  },
  {
    id: "a2-7-1-exp-attributes",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-1: Exponentials: Attributes & Transformations",
    story: "Growth curves and their horizontal asymptote.",
    teks: "A2.7",
    description: "Attributes and transformations of exponential functions.",
    generate: (m, s, o) => a2_7_1_expAttributes(m, s, o),
  },
  {
    id: "a2-7-2-e-to-x",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-2: The Number e and e^x",
    story: "Continuous growth has its own base.",
    teks: "A2.7",
    description: "Evaluate and graph functions with base e.",
    generate: (m, s, o) => a2_7_2_eToX(m, s, o),
  },
  {
    id: "a2-7-3-recursive-models",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-3: Recursive Models",
    story: "Each term builds on the last.",
    teks: "A2.7",
    description: "Write and evaluate recursive exponential models.",
    generate: (m, s, o) => a2_7_3_recursiveModels(m, s, o),
  },
  {
    id: "a2-7-4-log-attributes",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-4: Logarithms: Attributes & Transformations",
    story: "The exponential curve, reflected.",
    teks: "A2.7",
    description: "Attributes and transformations of logarithmic functions.",
    generate: (m, s, o) => a2_7_4_logAttributes(m, s, o),
  },
  {
    id: "a2-7-5-natural-log",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-5: Natural Logarithms",
    story: "Base e gets its own button: ln.",
    teks: "A2.7",
    description: "Evaluate and apply natural logarithms.",
    generate: (m, s, o) => a2_7_5_naturalLog(m, s, o),
  },
  {
    id: "a2-7-6-log-properties",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-6: Properties of Logarithms",
    story: "Product, quotient, and power rules unlock every log.",
    teks: "A2.7",
    description: "Evaluate logs; expand and condense logarithmic expressions.",
    generate: (m, s, o) => a2_7_6_logProperties(m, s, o),
  },
  {
    id: "a2-7-7-exp-log-equations",
    topic: 207,
    topicTitle: "Topic 7: Exponential & Logarithmic Functions",
    title: "7-7: Exponential & Logarithmic Equations",
    story: "Same base, or take a log — and always check the domain.",
    teks: "A2.7",
    description: "Solve exponential equations (exact and approximate) and logarithmic equations with extraneous-root checks.",
    generate: (m, s, o) => a2_7_7_expLogEquations(m, s, o),
  },
  {
    id: "a2-8-1-poly-attributes",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-1: Attributes of Polynomials",
    story: "End behavior and turning points from degree and leading coefficient.",
    teks: "A2.8",
    description: "Describe polynomial attributes from equations and graphs.",
    generate: (m, s, o) => a2_8_1_polyAttributes(m, s, o),
  },
  {
    id: "a2-8-2-linear-factors-zeros",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-2: Linear Factors & Zeros",
    story: "Zeros become factors; factors reveal zeros.",
    teks: "A2.8",
    description: "Find rational zeros with the rational root theorem; factor by grouping and sum/difference of cubes.",
    generate: (m, s, o) => a2_8_2_linearFactorsZeros(m, s, o),
  },
  {
    id: "a2-8-3-poly-add-sub-mul",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-3: Add, Subtract & Multiply Polynomials",
    story: "Polynomial arithmetic, term by term.",
    teks: "A2.8",
    description: "Add, subtract, and multiply polynomials.",
    generate: (m, s, o) => a2_8_3_polyAddSubMul(m, s, o),
  },
  {
    id: "a2-8-4-poly-solve",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-4: Solving Polynomial Equations",
    story: "Find every zero the rational root theorem allows.",
    teks: "A2.8",
    description: "Solve polynomial equations by finding all rational zeros.",
    generate: (m, s, o) => a2_8_4_polySolve(m, s, o),
  },
  {
    id: "a2-8-5-poly-divide",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-5: Dividing Polynomials",
    story: "Long division and synthetic division, side by side.",
    teks: "A2.8",
    description: "Divide polynomials by linear divisors with long and synthetic division (including remainders).",
    generate: (m, s, o) => a2_8_5_polyDivide(m, s, o),
  },
  {
    id: "a2-8-6-root-theorems",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-6: Root Theorems",
    story: "List every possible rational zero before testing.",
    teks: "A2.8",
    description: "Apply the rational root theorem: list ±p/q candidates, then find actual zeros.",
    generate: (m, s, o) => a2_8_6_rootTheorems(m, s, o),
  },
  {
    id: "a2-8-7-fta",
    topic: 208,
    topicTitle: "Topic 8: Polynomials",
    title: "8-7: Fundamental Theorem of Algebra",
    story: "A degree-n polynomial has exactly n complex zeros.",
    teks: "A2.8",
    description: "Use the Fundamental Theorem of Algebra to count zeros.",
    generate: (m, s, o) => a2_8_7_fta(m, s, o),
  },
  {
    id: "a2-9-1-roots-radicals",
    topic: 209,
    topicTitle: "Topic 9: Radical Expressions",
    title: "9-1: Roots & Radicals",
    story: "Simplify radicals to their cleanest form.",
    teks: "A2.9",
    description: "Simplify radical expressions.",
    generate: (m, s, o) => a2_9_1_rootsRadicals(m, s, o),
  },
  {
    id: "a2-9-2-radical-mult-div",
    topic: 209,
    topicTitle: "Topic 9: Radical Expressions",
    title: "9-2: Multiplying & Dividing Radicals",
    story: "Combine radicals, then rationalize.",
    teks: "A2.9",
    description: "Multiply and divide radical expressions.",
    generate: (m, s, o) => a2_9_2_radicalMultDiv(m, s, o),
  },
  {
    id: "a2-9-3-binomial-radicals",
    topic: 209,
    topicTitle: "Topic 9: Radical Expressions",
    title: "9-3: Binomial Radicals",
    story: "Conjugates clear the denominator.",
    teks: "A2.9",
    description: "Operate with binomial radical expressions and rationalize denominators.",
    generate: (m, s, o) => a2_9_3_binomialRadicals(m, s, o),
  },
  {
    id: "a2-9-4-rational-exponents",
    topic: 209,
    topicTitle: "Topic 9: Radical Expressions",
    title: "9-4: Rational Exponents",
    story: "Fractional exponents are radicals in disguise.",
    teks: "A2.9",
    description: "Convert between radical and rational-exponent forms; simplify.",
    generate: (m, s, o) => a2_9_4_rationalExponents(m, s, o),
  },
  {
    id: "a2-10-1-cubic-transformations",
    topic: 210,
    topicTitle: "Topic 10: Cubic & Cube Root Functions",
    title: "10-1: Cubics: Attributes & Transformations",
    story: "The S-curve and its inflection point.",
    teks: "A2.10",
    description: "Attributes and transformations of cubic functions.",
    generate: (m, s, o) => a2_10_1_cubicTransformations(m, s, o),
  },
  {
    id: "a2-10-2-cuberoot-transformations",
    topic: 210,
    topicTitle: "Topic 10: Cubic & Cube Root Functions",
    title: "10-2: Cube Roots: Attributes & Transformations",
    story: "Cube roots keep their sign — and their shape.",
    teks: "A2.10",
    description: "Attributes and transformations of cube root functions.",
    generate: (m, s, o) => a2_10_2_cuberootTransformations(m, s, o),
  },
  {
    id: "a2-10-3-cuberoot-equations",
    topic: 210,
    topicTitle: "Topic 10: Cubic & Cube Root Functions",
    title: "10-3: Cube Root Equations",
    story: "Cube both sides — no extraneous roots this time.",
    teks: "A2.10",
    description: "Solve cube root equations.",
    generate: (m, s, o) => a2_10_3_cuberootEquations(m, s, o),
  },
  {
    id: "a2-11-1-simplify",
    topic: 211,
    topicTitle: "Topic 11: Rational Functions & Equations",
    title: "11-1: Simplifying Rational Expressions",
    story: "Factor first, cancel second, restrict always.",
    teks: "A2.11",
    description: "Simplify rational expressions and state domain restrictions.",
    generate: (m, s, o) => a2_11_1_simplify(m, s, o),
  },
  {
    id: "a2-11-2-mult-div",
    topic: 211,
    topicTitle: "Topic 11: Rational Functions & Equations",
    title: "11-2: Multiplying & Dividing",
    story: "Factor everything before you cancel anything.",
    teks: "A2.11",
    description: "Multiply and divide rational expressions.",
    generate: (m, s, o) => a2_11_2_multDiv(m, s, o),
  },
  {
    id: "a2-11-3-asymptotes-holes",
    topic: 211,
    topicTitle: "Topic 11: Rational Functions & Equations",
    title: "11-3: Asymptotes & Holes",
    story: "Zeros of the denominator draw the graph's guardrails.",
    teks: "A2.11",
    description: "Find vertical/horizontal asymptotes and removable discontinuities (with graphs).",
    generate: (m, s, o) => a2_11_3_asymptotesHoles(m, s, o),
  },
  {
    id: "a2-11-4-solve-rational",
    topic: 211,
    topicTitle: "Topic 11: Rational Functions & Equations",
    title: "11-4: Solving Rational Equations",
    story: "Clear denominators — then interrogate every candidate.",
    teks: "A2.11",
    description: "Solve rational equations, including extraneous-root (no-solution) cases.",
    generate: (m, s, o) => a2_11_4_solveRational(m, s, o),
  },
  {
    id: "a2-12-1-analyzing-data",
    topic: 212,
    topicTitle: "Topic 12: Data & Regression",
    title: "12-1: Analyzing Data",
    story: "Differences and ratios reveal the hidden model.",
    teks: "A2.12",
    description: "Classify data as linear, quadratic, or exponential with finite differences and ratios.",
    generate: (m, s, o) => a2_12_1_analyzingData(m, s, o),
  },
  {
    id: "a2-12-2-regression",
    topic: 212,
    topicTitle: "Topic 12: Data & Regression",
    title: "12-2: Regression & Model Choice",
    story: "Least squares finds the line of best fit.",
    teks: "A2.12",
    description: "Compute least-squares regression lines from data tables.",
    generate: (m, s, o) => a2_12_2_regression(m, s, o),
  },
  {
    id: "a2-12-3-using-models",
    topic: 212,
    topicTitle: "Topic 12: Data & Regression",
    title: "12-3: Using Models for Decisions",
    story: "Extend the model to predict what comes next.",
    teks: "A2.12",
    description: "Use linear and exponential models to make predictions.",
    generate: (m, s, o) => a2_12_3_usingModels(m, s, o),
  },
  {
    id: "a2-p-trig-identities",
    topic: 213,
    topicTitle: "Algebra 2 Proofs",
    title: "Trig Identity Proofs",
    story: "Prove identities step by step: Pythagorean, sum formulas, double-angle.",
    teks: "A2.P",
    description: "Step-scaffolded two-column proofs of trigonometric identities (parameterized templates).",
    generate: (m, s, o) => a2_p_trigIdentities(m, s, o),
  },
  {
    id: "a2-p-log-exp-proofs",
    topic: 213,
    topicTitle: "Algebra 2 Proofs",
    title: "Logarithm & Exponent Proofs",
    story: "Prove the product, quotient, and power rules from the definition.",
    teks: "A2.P",
    description: "Step-scaffolded two-column proofs of logarithm and exponent properties (parameterized templates).",
    generate: (m, s, o) => a2_p_logExpProofs(m, s, o),
  },
  {
    id: "a2-p-poly-identities",
    topic: 213,
    topicTitle: "Algebra 2 Proofs",
    title: "Polynomial Identity Proofs",
    story: "Prove (x+k)², difference of squares, sum of cubes, and (x+k)³.",
    teks: "A2.P",
    description: "Step-scaffolded two-column proofs of polynomial identities (parameterized templates).",
    generate: (m, s, o) => a2_p_polyIdentities(m, s, o),
  },
  {
    id: "a2x-sequences",
    topic: 214,
    topicTitle: "Supplementary Topics",
    title: "Sequences & Series",
    story: "Explicit and recursive formulas, finite sums.",
    teks: "A2.S",
    description: "Arithmetic/geometric sequences (explicit, recursive) and finite series sums. Supplementary: not in the scope doc.",
    generate: (m, s, o) => a2x_sequences(m, s, o),
  },
  {
    id: "a2x-circle-equations",
    topic: 214,
    topicTitle: "Supplementary Topics",
    title: "Circle Equations",
    story: "Center-radius form and completing the square.",
    teks: "A2.C",
    description: "Write circle equations from center/radius; complete the square from general form (with graphs). Supplementary: not in the scope doc.",
    generate: (m, s, o) => a2x_circleEquations(m, s, o),
  },
  {
    id: "a2x-circle-line-systems",
    topic: 214,
    topicTitle: "Supplementary Topics",
    title: "Circle-Line Systems",
    story: "Where does the line cut the circle?",
    teks: "A2.C",
    description: "Solve circle-line systems by substitution (two intersections or tangent). Supplementary: not in the scope doc.",
    generate: (m, s, o) => a2x_circleLineSystems(m, s, o),
  },
  // ── Middle School — Topics 30/31/32 (Grade 6/7/8) ───────────────────────────
  ...MIDDLE_SCHOOL_ENTRIES,
  // ── SAT Math — Topic 401 (renumbered: worker used 20–24, collided with Calculus 21)
  ...SAT_MATH_REGISTRY.map((e) => ({ ...e, topic: 401 })),
  // ── Precalculus (AP Style) — Topic 16 ─────────────────────────────────────
  ...PRECALCULUS_ENTRIES,
  // ── AP Calculus — Topic 21 ────────────────────────────────────────────────
  ...CALCULUS_ENTRIES,
];

/**
 * Central hostile-input clamp. Every entry's generate() is wrapped below, so
 * this is the one place that sanitizes caller-supplied options — factories
 * never see hostile values.
 * - difficulty: clamped to 1–3 (0, 4, 99, NaN, "2" can no longer throw or
 *   index undefined subtype lists).
 * - count: clamped to [0, MAX_GENERATE_COUNT]; Infinity / 1e12 / NaN can no
 *   longer OOM. The cap is 100_000 (not smaller) because the in-process
 *   contract still honors exact finite counts up to that size.
 */
export const MAX_GENERATE_COUNT = 100_000;

function sanitizeOptions(options?: GenerateOptions): GenerateOptions | undefined {
  if (!options) return options;
  const out: GenerateOptions = { ...options };
  if (typeof out.count === "number") {
    if (!Number.isFinite(out.count)) out.count = out.count > 0 ? MAX_GENERATE_COUNT : 0;
    else out.count = Math.min(MAX_GENERATE_COUNT, Math.max(0, Math.floor(out.count)));
  }
  if (out.difficulty != null) {
    const n = typeof out.difficulty === "number" ? out.difficulty : Number(out.difficulty);
    out.difficulty = (Number.isFinite(n)
      ? Math.min(3, Math.max(1, Math.round(n)))
      : 2) as DifficultyLevel;
  }
  return out;
}

export const CURRICULUM_REGISTRY: CurriculumEntry[] = REGISTRY_ENTRIES.map((e) => ({
  ...e,
  generate: (mode, seed, options) => e.generate(mode, seed, sanitizeOptions(options)),
}));

/** Look up a registry entry by id. Returns undefined if not found. */
export function getModule(id: string): CurriculumEntry | undefined {
  return CURRICULUM_REGISTRY.find((e) => e.id === id);
}

// geometry-lessons.ts
// Geometry module — registry-style generators for the 18 placeholder entries
// in CurriculumRegistry: the 9 lessons (ch1-1, ch2-1, ch5-1, ch6-1, ch8-1,
// ch12-1, ch13-1, ch14-2, ch15-1) and the 9 chapter tests (ch1, ch2, ch3, ch5,
// ch6, ch8, ch9, ch13, ch14 tests). The registry edits that point entries at
// these functions are paste-ready in tests/geometry/REGISTRY_SNIPPET.md; the
// integrator applies them centrally (this worker does not edit the registry).
//
// Counts mirror the established geometry wrappers: lessons default to 3
// (9 in Review/Classical); tests default to 10 (15 in Review), matching
// topicTestGenerator. Chapter tests are weighted shuffle-bags over the
// chapter's lesson makers + test-only makers, weighted toward the chapter's
// core theorems — the sampling a real course test uses.

import { mulberry32 } from "@/lib/math-utils";
import type { RNG } from "@/lib/math-utils";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { GeometryProblem } from "@/lib/factories/GeometryTypes";
import {
  sampleWeighted,
  type Difficulty,
  type MakerEntry,
} from "@/lib/factories/GeometryHelpers";
import {
  generateFoundationsProblems,
  FOUNDATIONS_LESSON_POOL,
  FOUNDATIONS_TEST_POOL,
} from "@/lib/factories/GeometryFoundationsFactory";
import {
  generateReasoningProblems,
  REASONING_LESSON_POOL,
  REASONING_TEST_POOL,
} from "@/lib/factories/GeometryReasoningFactory";
import {
  generateMidsegmentProblems,
  MIDSEGMENT_LESSON_POOL,
  TRIANGLE_RELATIONS_TEST_POOL,
} from "@/lib/factories/TriangleRelationsFactory";
import {
  generatePolygonProblems,
  POLYGON_LESSON_POOL,
  QUADRILATERAL_TEST_POOL,
} from "@/lib/factories/PolygonsQuadrilateralsFactory";
import { PARALLEL_LINES_TEST_POOL } from "@/lib/factories/ParallelLinesFactory";
import {
  generateTranslationProblems,
  TRANSLATION_LESSON_POOL,
  TRANSFORMATIONS_TEST_POOL,
} from "@/lib/factories/TransformationsFactory";
import { SIMILARITY_TEST_POOL } from "@/lib/factories/SimilarityFactory";
import { generateTangentProblems } from "@/lib/factories/TangentLinesFactory";
import {
  generateAreaProblems,
  AREA_LESSON_POOL,
  AREA_TEST_POOL,
} from "@/lib/factories/AreaFactory";
import {
  generateSurfaceAreaProblems,
  SURFACE_AREA_LESSON_POOL,
  VOLUME_TEST_POOL,
} from "@/lib/factories/SurfaceAreaVolumeFactory";
import { generateProbabilityConceptsProblems } from "@/lib/factories/ProbabilityConceptsFactory";

/** Structural twin of CurriculumRegistry's GenerateOptions (avoids a cycle). */
export interface GeometryOptions {
  count?: number;
  difficulty?: Difficulty;
}

type LessonGen = (
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
) => GeometryProblem[];

function lesson(gen: LessonGen, only?: readonly string[]) {
  return (mode: OutputMode, seed: number, options?: GeometryOptions): GeometryProblem[] => {
    const rng = mulberry32(seed);
    const count = options?.count ?? (mode === "Review" || mode === "Classical" ? 9 : 3);
    return gen(rng, count, options?.difficulty ?? 2, only);
  };
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export const geo_1_1_foundations = lesson(generateFoundationsProblems);
export const geo_2_1_inductive = lesson(generateReasoningProblems);
export const geo_5_1_midsegments = lesson(generateMidsegmentProblems);
export const geo_6_1_polygons = lesson(generatePolygonProblems);
export const geo_8_1_translations = lesson(generateTranslationProblems);
export const geo_12_1_tangentLines = lesson(generateTangentProblems);
export const geo_13_1_area = lesson(generateAreaProblems);
export const geo_14_2_surfaceArea = lesson(generateSurfaceAreaProblems);
export const geo_15_1_probability = lesson(generateProbabilityConceptsProblems);

// ── Chapter tests: weighted mixes over the chapter's actual scope ─────────────

function from(pool: readonly MakerEntry[], subtype: string): MakerEntry {
  const e = pool.find((x) => x.subtype === subtype);
  if (!e) throw new Error(`geometry test mix: subtype ${subtype} not in pool`);
  return e;
}
const W = (entry: MakerEntry, weight: number) => ({ entry, weight });

const TEST_MIXES: Record<number, { entry: MakerEntry; weight: number }[]> = {
  // Topic 1: points/lines/planes + measuring segments & angles + constructions
  1: [
    W(from(FOUNDATIONS_TEST_POOL, "SegmentAddition"), 3),
    W(from(FOUNDATIONS_TEST_POOL, "NumberLineMeasure"), 2),
    W(from(FOUNDATIONS_TEST_POOL, "AngleAddition"), 2),
    W(from(FOUNDATIONS_TEST_POOL, "CompSuppAngles"), 2),
    W(from(FOUNDATIONS_TEST_POOL, "VerticalLinearPair"), 2),
    W(from(FOUNDATIONS_TEST_POOL, "AngleBisector"), 2),
    W(from(FOUNDATIONS_TEST_POOL, "ConstructionIdentify"), 1),
    W(from(FOUNDATIONS_LESSON_POOL, "CollinearCoplanar"), 1),
    W(from(FOUNDATIONS_LESSON_POOL, "NetToSolid"), 1),
    W(from(FOUNDATIONS_LESSON_POOL, "PostulateIdentify"), 1),
  ],
  // Topic 2: patterns & counterexamples under, conditionals/deductive on top
  2: [
    W(from(REASONING_TEST_POOL, "ConditionalParts"), 2),
    W(from(REASONING_TEST_POOL, "ConditionalForms"), 3),
    W(from(REASONING_TEST_POOL, "ConverseTruth"), 1),
    W(from(REASONING_TEST_POOL, "Biconditional"), 1),
    W(from(REASONING_TEST_POOL, "LawOfDetachment"), 2),
    W(from(REASONING_TEST_POOL, "LawOfSyllogism"), 2),
    W(from(REASONING_TEST_POOL, "InductiveVsDeductive"), 1),
    W(from(REASONING_TEST_POOL, "AlgebraicReasoning"), 2),
    W(from(REASONING_LESSON_POOL, "NumberPattern"), 2),
    W(from(REASONING_LESSON_POOL, "Counterexample"), 2),
  ],
  // Topic 3: transversal angle work is the core; coordinate lines second
  3: [
    W(from(PARALLEL_LINES_TEST_POOL, "TransversalAngleFind"), 3),
    W(from(PARALLEL_LINES_TEST_POOL, "TransversalAlgebra"), 2),
    W(from(PARALLEL_LINES_TEST_POOL, "ProveLinesParallel"), 2),
    W(from(PARALLEL_LINES_TEST_POOL, "SlopeOfLine"), 2),
    W(from(PARALLEL_LINES_TEST_POOL, "ParallelPerpSlope"), 2),
    W(from(PARALLEL_LINES_TEST_POOL, "ClassifyLines"), 1),
    W(from(PARALLEL_LINES_TEST_POOL, "EquationOfLine"), 2),
  ],
  // Topic 5: midsegments + bisectors/centers + inequalities
  5: [
    W(from(MIDSEGMENT_LESSON_POOL, "MidsegmentLength"), 2),
    W(from(MIDSEGMENT_LESSON_POOL, "MidsegmentAlgebra"), 1),
    W(from(MIDSEGMENT_LESSON_POOL, "MidsegmentAngles"), 1),
    W(from(TRIANGLE_RELATIONS_TEST_POOL, "PerpBisectorTheorem"), 2),
    W(from(TRIANGLE_RELATIONS_TEST_POOL, "AngleBisectorTheorem"), 1),
    W(from(TRIANGLE_RELATIONS_TEST_POOL, "CentroidMedian"), 2),
    W(from(TRIANGLE_RELATIONS_TEST_POOL, "IdentifyCenter"), 1),
    W(from(TRIANGLE_RELATIONS_TEST_POOL, "TriangleInequality"), 2),
    W(from(TRIANGLE_RELATIONS_TEST_POOL, "HingeTheorem"), 1),
  ],
  // Topic 6: angle sums underneath, parallelogram properties on top
  6: [
    W(from(POLYGON_LESSON_POOL, "InteriorSum"), 1),
    W(from(POLYGON_LESSON_POOL, "RegularInteriorAngle"), 1),
    W(from(POLYGON_LESSON_POOL, "ExteriorFromN"), 1),
    W(from(POLYGON_LESSON_POOL, "MissingInteriorAngle"), 1),
    W(from(QUADRILATERAL_TEST_POOL, "ParallelogramSides"), 2),
    W(from(QUADRILATERAL_TEST_POOL, "ParallelogramAngles"), 2),
    W(from(QUADRILATERAL_TEST_POOL, "ParallelogramDiagonals"), 1),
    W(from(QUADRILATERAL_TEST_POOL, "RectangleDiagonals"), 1),
    W(from(QUADRILATERAL_TEST_POOL, "RhombusDiagonals"), 1),
    W(from(QUADRILATERAL_TEST_POOL, "TrapezoidMidsegment"), 1),
    W(from(QUADRILATERAL_TEST_POOL, "KiteAngles"), 1),
    W(from(QUADRILATERAL_TEST_POOL, "ClassifyQuadrilateral"), 1),
  ],
  // Topic 8: translations underneath, all rigid motions + symmetry on top
  8: [
    W(from(TRANSLATION_LESSON_POOL, "TranslatePoint"), 1),
    W(from(TRANSLATION_LESSON_POOL, "TranslateFigure"), 1),
    W(from(TRANSLATION_LESSON_POOL, "TranslationRule"), 1),
    W(from(TRANSFORMATIONS_TEST_POOL, "ReflectionImage"), 3),
    W(from(TRANSFORMATIONS_TEST_POOL, "RotationImage"), 2),
    W(from(TRANSFORMATIONS_TEST_POOL, "Symmetry"), 2),
    W(from(TRANSFORMATIONS_TEST_POOL, "CompositionTransform"), 1),
    W(from(TRANSFORMATIONS_TEST_POOL, "RigidMotionIdentify"), 1),
  ],
  // Topic 9: similar-figure proportions are the core
  9: [
    W(from(SIMILARITY_TEST_POOL, "SolveProportion"), 1),
    W(from(SIMILARITY_TEST_POOL, "SimilarFigureSide"), 3),
    W(from(SIMILARITY_TEST_POOL, "SimilarityTheoremId"), 1),
    W(from(SIMILARITY_TEST_POOL, "TriangleProportionality"), 2),
    W(from(SIMILARITY_TEST_POOL, "DilationImage"), 1),
    W(from(SIMILARITY_TEST_POOL, "DilationScaleFactor"), 1),
    W(from(SIMILARITY_TEST_POOL, "IndirectMeasurement"), 1),
    W(from(SIMILARITY_TEST_POOL, "GeometricMeanAltitude"), 1),
  ],
  // Topic 13: parallelograms/triangles underneath, full area toolkit on top
  13: [
    W(from(AREA_LESSON_POOL, "ParallelogramArea"), 1),
    W(from(AREA_LESSON_POOL, "TriangleArea"), 1),
    W(from(AREA_LESSON_POOL, "AreaMissingDimension"), 1),
    W(from(AREA_TEST_POOL, "TrapezoidArea"), 2),
    W(from(AREA_TEST_POOL, "DiagonalArea"), 1),
    W(from(AREA_TEST_POOL, "RegularPolygonArea"), 2),
    W(from(AREA_TEST_POOL, "CompositeArea"), 2),
    W(from(AREA_TEST_POOL, "SimilarAreaRatio"), 1),
  ],
  // Topic 14: prism/cylinder SA underneath, all solids + volumes on top
  14: [
    W(from(SURFACE_AREA_LESSON_POOL, "RectPrismSurfaceArea"), 2),
    W(from(SURFACE_AREA_LESSON_POOL, "CylinderSurfaceArea"), 2),
    W(from(SURFACE_AREA_LESSON_POOL, "CylinderLateralArea"), 1),
    W(from(SURFACE_AREA_LESSON_POOL, "TriPrismSurfaceArea"), 1),
    W(from(SURFACE_AREA_LESSON_POOL, "LateralSurfaceArea"), 1),
    W(from(VOLUME_TEST_POOL, "Volume"), 3),
    W(from(VOLUME_TEST_POOL, "PyramidSurfaceArea"), 1),
    W(from(VOLUME_TEST_POOL, "ConeSurfaceArea"), 1),
    W(from(VOLUME_TEST_POOL, "SphereSurfaceArea"), 1),
    W(from(VOLUME_TEST_POOL, "CrossSection"), 1),
  ],
};

export type GeometryTestTopic = keyof typeof TEST_MIXES;

/** Chapter-test generator, signature-compatible with the registry's
 *  topicTestGenerator(topic, mode, seed, options). */
export function geoTopicTest(
  topic: number,
  mode: OutputMode,
  seed: number,
  options?: GeometryOptions
): GeometryProblem[] {
  const mix = TEST_MIXES[topic];
  if (!mix) throw new Error(`geoTopicTest: no mix for topic ${topic}`);
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" ? 15 : 10);
  return sampleWeighted(rng, mix, count, options?.difficulty ?? 2);
}

// ── Entry table for tests (mirrors algebra-2's WIRED_LESSONS) ─────────────────

export interface WiredGeometryEntry {
  id: string;
  generate: (mode: OutputMode, seed: number, options?: GeometryOptions) => GeometryProblem[];
  subtypes: readonly string[];
}

export const WIRED_GEOMETRY: WiredGeometryEntry[] = [
  { id: "ch1-1-points-lines", generate: geo_1_1_foundations, subtypes: FOUNDATIONS_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch2-1-inductive-reasoning", generate: geo_2_1_inductive, subtypes: REASONING_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch5-1-midsegments", generate: geo_5_1_midsegments, subtypes: MIDSEGMENT_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch6-1-polygons", generate: geo_6_1_polygons, subtypes: POLYGON_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch8-1-translations", generate: geo_8_1_translations, subtypes: TRANSLATION_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch12-1-tangent-lines", generate: geo_12_1_tangentLines, subtypes: ["TangentLength", "TwoTangentSegments", "TangentCentralAngle", "IsTangent", "CircumscribedPerimeter"] },
  { id: "ch13-1-area-polygons", generate: geo_13_1_area, subtypes: AREA_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch14-2-surface-area", generate: geo_14_2_surfaceArea, subtypes: SURFACE_AREA_LESSON_POOL.map((e) => e.subtype) },
  { id: "ch15-1-experimental-theoretical", generate: geo_15_1_probability, subtypes: ["TheoreticalProbability", "ExperimentalProbability", "PredictFromData", "CompareProbabilities"] },
  { id: "ch1-test", generate: (m, s, o) => geoTopicTest(1, m, s, o), subtypes: TEST_MIXES[1].map((w) => w.entry.subtype) },
  { id: "ch2-test", generate: (m, s, o) => geoTopicTest(2, m, s, o), subtypes: TEST_MIXES[2].map((w) => w.entry.subtype) },
  { id: "ch3-test", generate: (m, s, o) => geoTopicTest(3, m, s, o), subtypes: TEST_MIXES[3].map((w) => w.entry.subtype) },
  { id: "ch5-test", generate: (m, s, o) => geoTopicTest(5, m, s, o), subtypes: TEST_MIXES[5].map((w) => w.entry.subtype) },
  { id: "ch6-test", generate: (m, s, o) => geoTopicTest(6, m, s, o), subtypes: TEST_MIXES[6].map((w) => w.entry.subtype) },
  { id: "ch8-test", generate: (m, s, o) => geoTopicTest(8, m, s, o), subtypes: TEST_MIXES[8].map((w) => w.entry.subtype) },
  { id: "ch9-test", generate: (m, s, o) => geoTopicTest(9, m, s, o), subtypes: TEST_MIXES[9].map((w) => w.entry.subtype) },
  { id: "ch13-test", generate: (m, s, o) => geoTopicTest(13, m, s, o), subtypes: TEST_MIXES[13].map((w) => w.entry.subtype) },
  { id: "ch14-test", generate: (m, s, o) => geoTopicTest(14, m, s, o), subtypes: TEST_MIXES[14].map((w) => w.entry.subtype) },
];

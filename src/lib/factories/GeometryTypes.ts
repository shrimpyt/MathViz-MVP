// GeometryTypes.ts
// Shared types for the Geometry lesson/test generators built out from the
// placeholder entries in CurriculumRegistry (Topics 1, 2, 3, 5, 6, 8, 9, 12,
// 13, 14, 15 — the lessons and chapter tests that previously returned
// placeholderGenerator output).
//
// Shape mirrors Algebra2Problem (the repo's established pattern for newer
// curricula): a full `prompt` string carries the question text, `given`/`find`
// feed card-style renderers, `steps` always carry a `reason` (Guided Notes and
// Classical Notes blank the reasons), and `verify` holds the raw generated
// givens so tests can recompute answers independently. Generation is pure and
// seeded (mulberry32); all text cleanup lives on the render side.

import type { ProblemStep } from "../types";
import { latexToText } from "../answerKey";

// ── Topic codes (the `type` field; TEKS lives on the registry entry) ────────

export type GeometryType =
  | "GEO.1" // Tools of Geometry
  | "GEO.2" // Reasoning and Proof
  | "GEO.3" // Parallel and Perpendicular Lines
  | "GEO.5" // Relationships Within Triangles
  | "GEO.6" // Polygons and Quadrilaterals
  | "GEO.8" // Transformational Geometry
  | "GEO.9" // Similarity
  | "GEO.12" // Theorems About Circles (tangent lines)
  | "GEO.13" // Area
  | "GEO.14" // Surface Area and Volume
  | "GEO.15"; // Probability

// ── Diagram params ────────────────────────────────────────────────────────────
// Figure kinds draw in a 200×200 viewBox using raw drawing coordinates
// (factories compute the layout so renderers stay dumb). GridFigure is the
// exception: it uses math coordinates on a −8..8 grid, matching the existing
// CoordinateGrid convention (center 100, 10px per unit).

export interface GeoPt {
  label: string;
  x: number;
  y: number;
}

/** Triangle (or triangle-with-interior-points) figure: midsegments, bisectors,
 *  medians, altitudes, tangent right triangles drawn as triangles, etc. */
export interface TriangleFigureParams {
  kind: "TriangleFigure";
  variant?: number;
  /** All labeled points (vertices first, then interior/on-side points). */
  points: GeoPt[];
  /** Solid segments as label pairs, e.g. ["A","B"]. */
  segments: [string, string][];
  /** Dashed auxiliary segments as label pairs (midsegment, altitude, …). */
  dashed?: [string, string][];
  /** Edge label text keyed by label pair, e.g. { "BC": "14" }. */
  sideLabels?: Record<string, string>;
  /** Angle label text keyed by vertex label, e.g. { "A": "50°" }. */
  angleLabels?: Record<string, string>;
  /** Congruence tick counts keyed by label pair. */
  ticks?: Record<string, number>;
  /** Edges carrying a single parallel arrow mark (label pairs). */
  parallelMarks?: string[];
  /** Vertex labels that get a right-angle square. */
  rightAngles?: string[];
  /** Free-floating labels (e.g. a length written beside a dashed segment). */
  extraLabels?: { x: number; y: number; text: string }[];
}

/** General polygon figure: angle sums, parallelograms, quadrilaterals, area. */
export interface PolygonFigureParams {
  kind: "PolygonFigure";
  variant?: number;
  vertices: GeoPt[];
  /** Interior diagonals as vertex-index pairs (dashed). */
  diagonals?: [number, number][];
  /** Dashed segments in raw drawing coords (heights, apothems). */
  dashedSegments?: { x1: number; y1: number; x2: number; y2: number; label?: string }[];
  sideLabels?: Record<string, string>;
  angleLabels?: Record<string, string>;
  /** Congruence tick counts keyed by label pair. */
  ticks?: Record<string, number>;
  /** Center point (regular polygons), drawn when present. */
  center?: { x: number; y: number; label: string };
  rightAngles?: string[];
}

/** Coordinate-plane figure: transformations, dilations, coordinate area. */
export interface GridFigureParams {
  kind: "GridFigure";
  variant?: number;
  polygons?: { points: GeoPt[]; dashed?: boolean }[];
  points?: GeoPt[];
  /** Lines in math coords (reflection lines, etc.). */
  lines?: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[];
}

/** Two (possibly parallel) lines cut by a transversal; 8 angle slots.
 *  Slots are numbered in reading order: top line 1 2 / 3 4, bottom 5 6 / 7 8. */
export interface TransversalFigureParams {
  kind: "TransversalFigure";
  variant?: number;
  labels: (string | null)[];
  parallel: boolean;
}

/** Circle with an external point and one or two tangent segments. */
export interface TangentFigureParams {
  kind: "TangentFigure";
  variant?: number;
  radiusLabel: string;
  tangentLabel?: string;
  /** Label on the segment from center to external point. */
  extLabel?: string;
  /** Angle label at the external point. */
  angleP?: string;
  twoTangents?: boolean;
  showRightAngle?: boolean;
}

/** Schematic 3-D solid with dimension labels. */
export interface SolidFigureParams {
  kind: "SolidFigure";
  variant?: number;
  solid: "rectPrism" | "triPrism" | "cylinder" | "pyramid" | "cone" | "sphere";
  /** Dimension label strings by role: l, w, h, r, slant, base, height … */
  dims: Record<string, string>;
}

/** Net of a solid (folded-flat layout). */
export interface NetFigureParams {
  kind: "NetFigure";
  variant?: number;
  solid: "cube" | "rectPrism" | "triPrism" | "sqPyramid" | "cylinder";
  edgeLabel?: string;
}

/** Points/lines/planes sketch: a plane parallelogram with points and lines. */
export interface SketchFigureParams {
  kind: "SketchFigure";
  variant?: number;
  planeLabel?: string;
  points: GeoPt[];
  lines?: { x1: number; y1: number; x2: number; y2: number; label?: string; dashed?: boolean }[];
}

/** Angle-relationship figure for Topic 1/2 angle pairs. */
export interface AngleFigureParams {
  kind: "AngleFigure";
  variant?: number;
  form: "complementary" | "supplementary" | "vertical" | "bisector";
  /** Angle measure labels in slot order (form-dependent; null hides a slot). */
  labels: (string | null)[];
}

/** Dot pattern for inductive-reasoning figure sequences (counts per figure). */
export interface PatternFigureParams {
  kind: "PatternFigure";
  variant?: number;
  counts: number[];
}

/** Spinner with a shaded sector (reuses the established sector geometry). */
export interface SpinnerFigureParams {
  kind: "ShadedSector";
  variant?: number;
  sectorAngle: number;
}

export type GeometryDiagramParams =
  | TriangleFigureParams
  | PolygonFigureParams
  | GridFigureParams
  | TransversalFigureParams
  | TangentFigureParams
  | SolidFigureParams
  | NetFigureParams
  | SketchFigureParams
  | AngleFigureParams
  | PatternFigureParams
  | SpinnerFigureParams;

// ── The problem ───────────────────────────────────────────────────────────────

export interface GeometryProblem {
  type: GeometryType;
  /** Maker family, e.g. "MidsegmentLength", "InteriorSum", "TranslateFigure". */
  subtype: string;
  /** Full question text (authoritative; renderers display this). */
  prompt: string;
  /** Human-readable givens for card-style renderers. */
  given: Record<string, string | number>;
  /** What to solve for. */
  find: string;
  /** One-line display answer (LaTeX-flavoured plain text). */
  answer: string;
  unit?: string;
  steps: ProblemStep[];
  svgParams?: GeometryDiagramParams;
  /**
   * Machine-readable raw givens for INDEPENDENT test verification.
   * Renderers ignore this field.
   */
  verify?: Record<string, number | string | boolean | number[] | string[]>;
}

// ── Answer key ────────────────────────────────────────────────────────────────

/** One-line printable answer for the answer key. */
export function formatGeometryAnswer(p: GeometryProblem): string {
  const a = latexToText(p.answer);
  return p.unit ? `${a} ${p.unit}` : a;
}

/** Human-readable topic label for section dividers / cards. */
export const GEOMETRY_TOPIC_LABELS: Record<GeometryType, string> = {
  "GEO.1": "Tools of Geometry",
  "GEO.2": "Reasoning and Proof",
  "GEO.3": "Parallel and Perpendicular Lines",
  "GEO.5": "Relationships Within Triangles",
  "GEO.6": "Polygons and Quadrilaterals",
  "GEO.8": "Transformational Geometry",
  "GEO.9": "Similarity",
  "GEO.12": "Tangent Lines",
  "GEO.13": "Area",
  "GEO.14": "Surface Area and Volume",
  "GEO.15": "Probability",
};

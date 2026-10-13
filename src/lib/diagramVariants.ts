// diagramVariants.ts
// Per-diagram visual variety + per-worksheet de-duplication guard.
//
// The factories produce mathematically-correct diagram params; the renderers
// in src/components/diagrams/* and src/components/PdfGeometrySVG.tsx were
// drawing every figure with identical hardcoded geometry (same skew, same
// apex, same arc start angles), so worksheets looked repetitive.
//
// This module stamps a seeded `variant` (0..DIAGRAM_VARIANT_COUNT-1) onto each
// problem's svgParams AFTER generation. Renderers read `variant` to pick
// among presentation alternatives (rotation, mirror, skew direction, scale,
// label placement). The variant NEVER changes the math: dims, coordinates,
// arc measures, and answers are untouched, only how the figure is drawn.
//
// De-dup: within one generation run we track visual signatures
// (`kind:figure:variant`) and re-roll the variant (cap MAX_REROLLS) when a
// duplicate would appear, so one worksheet doesn't show two identical-looking
// diagrams. Deterministic: same seed → same variants.

import type { RNG } from "./math-utils";
import type { MathProblem } from "./types";

// 24 = LCM-friendly: covers every effective-variant modulus in use
// (2, 3, 4, 6, 8, 16, 24), so all visual states are reachable.
export const DIAGRAM_VARIANT_COUNT = 24;

/** Visual identity of a diagram ignoring its variant: two problems with the
 *  same signature would look identical on the page. Includes the data that
 *  actually changes the drawing (arc measures, marks, ratios); excludes data
 *  that only changes labels (dims on MS figures are label text, the drawn
 *  shape is fixed, so dims are deliberately NOT part of the signature). */
/** Exported for verification tooling. */
export function diagramSignature(sp: Record<string, unknown>): string | null {
  return signatureBase(sp);
}

/** The variant value the renderer actually distinguishes. Two problems with
 *  the same base signature AND the same effective variant look identical;
 *  different raw variants that a renderer maps to the same drawing (e.g.
 *  rectangular-prism only uses v%2) share an effective variant. Must stay in
 *  sync with the renderers' `v % N` usage. */
export function effectiveVariant(sp: Record<string, unknown>, variant: number): number {
  const kind = sp["kind"] as string;
  if (kind === "MSGeometryFigure") {
    switch (sp["figure"] as string) {
      case "parallelogram":
      case "cylinder":
      case "cone":
        return variant % 8;
      case "triangle":
        return variant % 6;
      case "angle-single":
      case "angle-complementary":
      case "angle-supplementary":
      case "angle-vertical":
      case "net-cube":
      case "rectangle":
      case "composite":
        return variant % 4;
      case "trapezoid":
        return variant % 3;
      case "rectangular-prism":
        return variant % 24;
      default:
        // sphere: v%8 (8 radius angles); circle: v%16 (8 angles x 2 sizes)
        return sp["figure"] === "circle" ? variant % 16 : variant % 8;
    }
  }
  if (kind === "TwoSecants") return variant % 3;
  if (kind === "Congruence") return variant % 2;
  if (kind === "RightTriangle") return variant % 6;
  return variant % 8;
}

function signatureBase(sp: Record<string, unknown>): string | null {
  const kind = sp["kind"] as string;
  switch (kind) {
    case "MSGeometryFigure":
      return `MSGeometryFigure:${sp["figure"] ?? "?"}`;
    case "MSCoordinateGrid": {
      // Point/segment/polygon coordinates ARE the drawing here.
      const pts = JSON.stringify([sp["points"], sp["segments"], sp["polygons"]]);
      let h = 0;
      for (let i = 0; i < pts.length; i++) h = (h * 31 + pts.charCodeAt(i)) >>> 0;
      return `MSCoordinateGrid:${h.toString(36)}`;
    }
    case "MSSpinner":
      return `MSSpinner:${JSON.stringify(sp["sectors"])}`;
    case "InscribedAngle":
    case "CentralAngle":
    case "TwoSecants":
      return `Circle:${kind}:${sp["interceptedArc"]}`;
    case "Tangent":
      return `Circle:Tangent:${sp["tangentAngle"]}`;
    case "TwoChords":
      return `Circle:TwoChords:${sp["arc1"]}:${sp["arc2"]}`;
    case "ShadedSector":
      return `ShadedSector:${sp["sectorAngle"]}`;
    case "ConcentricCircles": {
      const o = Number(sp["outerR"]) || 1;
      return `ConcentricCircles:${(Number(sp["innerR"]) / o).toFixed(3)}`;
    }
    case "CircleMeasurement":
      return `CircleMeasurement:${sp["angle"] ?? 0}:${sp["showSector"] ? "s" : ""}:${sp["showArc"] ? "a" : ""}`;
    case "CoordinateGrid":
      return `CoordinateGrid:${JSON.stringify([sp["p1"], sp["p2"]])}`;
    case "Congruence":
      return `Congruence:${sp["subtype"]}:${JSON.stringify(sp["sideMarks"])}:${JSON.stringify(sp["angleMarks"])}:${sp["rightAngleAt"]}`;
    case "RightTriangle":
      return `RightTriangle:${sp["orientation"]}:${sp["referenceAnglePos"]}`;
    default:
      return null;
  }
}

function getSvgParams(p: MathProblem): Record<string, unknown> | null {
  const sp = (p as unknown as { svgParams?: unknown }).svgParams;
  if (!sp || typeof sp !== "object") return null;
  return sp as Record<string, unknown>;
}

/**
 * Stamp a `variant` onto every diagram-supporting svgParams in the list,
 * de-duplicating visual signatures within this run. Returns a new array;
 * problems without supported svgParams (or with a preset variant) pass
 * through untouched.
 */
export function assignDiagramVariants(problems: MathProblem[], rng: RNG): MathProblem[] {
  const used = new Set<string>();
  return problems.map((p) => {
    const sp = getSvgParams(p);
    if (!sp || sp["variant"] !== undefined) return p;
    const base = signatureBase(sp);
    if (!base) return p;
    // De-duplicate on the EFFECTIVE visual variant (what the renderer
    // actually distinguishes), not the raw 0-23 value.
    let variant = Math.floor(rng() * DIAGRAM_VARIANT_COUNT);
    let key = `${base}:e${effectiveVariant(sp, variant)}`;
    if (used.has(key)) {
      // Deterministic walk over all raw values: guarantees a free visual
      // state is found when one exists (a duplicate is only accepted at the
      // true pigeonhole limit, more problems than visual states).
      for (let t = 1; t < DIAGRAM_VARIANT_COUNT && used.has(key); t++) {
        variant = (variant + 1) % DIAGRAM_VARIANT_COUNT;
        key = `${base}:e${effectiveVariant(sp, variant)}`;
      }
    }
    used.add(key);
    return { ...p, svgParams: { ...sp, variant } } as MathProblem;
  });
}

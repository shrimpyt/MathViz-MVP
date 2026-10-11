// classicalDefinitions.ts
// Seed definition sets for CLASSICAL NOTES mode, keyed by registry entry id.
//
// Classical Notes is the middle of the worksheet spectrum:
//   guided notes (fill blanks) -> classical notes (structure given,
//   reasoning student's) -> blank.
// The DEFINITIONS block prints each term/theorem IN FULL because the grammar
// stage needs exact text for students to copy. Renderers OMIT the block
// gracefully when an entry id has no definitions here.
//
// Conventions:
// - Pure data + a lookup. No JSX, no styling (generation/rendering seam).
// - Plain-text unicode only (no LaTeX commands): renderers run definitions
//   through latexToText (web) / pdfSafeText (PDF), which pass plain text
//   through unchanged. Glyphs are limited to what the embedded DejaVu Serif
//   covers (√ θ π ∠ ° · ½ ₁ ₂ ⁻¹ × −).
// - Keyed by registry entry id on purpose: definitions live in this data file
//   so CurriculumRegistry.ts needs NO change (see tests/classical-notes).

/** Shared definition sets, reused by related entry ids. */
const CIRCLE_THEOREMS: string[] = [
  "Inscribed Angle Theorem: The measure of an angle formed by two chords in a circle with its vertex on the circle is half the measure of its intercepted arc.",
  "Central Angle Theorem: The measure of a central angle is equal to the measure of its intercepted arc.",
  "Tangent-Chord Angle Theorem: The measure of an angle formed by a tangent and a chord drawn to the point of tangency is half the measure of the intercepted arc.",
  "Intersecting Chords Theorem: If two chords intersect inside a circle, then the measure of the angle formed is half the sum of the measures of the intercepted arcs.",
  "Two Secants Theorem: If two secants are drawn from an external point to a circle, then the measure of the angle formed is half the difference of the measures of the intercepted arcs.",
];

const CONGRUENCE_THEOREMS: string[] = [
  "SSS (Side-Side-Side): If three sides of one triangle are congruent to three sides of another triangle, then the triangles are congruent.",
  "SAS (Side-Angle-Side): If two sides and the included angle of one triangle are congruent to two sides and the included angle of another triangle, then the triangles are congruent.",
  "ASA (Angle-Side-Angle): If two angles and the included side of one triangle are congruent to two angles and the included side of another triangle, then the triangles are congruent.",
  "AAS (Angle-Angle-Side): If two angles and a non-included side of one triangle are congruent to the corresponding parts of another triangle, then the triangles are congruent.",
  "HL (Hypotenuse-Leg): If the hypotenuse and a leg of one right triangle are congruent to the hypotenuse and a leg of another right triangle, then the triangles are congruent.",
];

const COORDINATE_FORMULAS: string[] = [
  "Distance Formula: The distance d between points (x₁, y₁) and (x₂, y₂) is d = √((x₂ − x₁)² + (y₂ − y₁)²).",
  "Midpoint Formula: The midpoint of the segment joining (x₁, y₁) and (x₂, y₂) is ((x₁ + x₂)/2, (y₁ + y₂)/2).",
  "Slope Formula: The slope m of the line through (x₁, y₁) and (x₂, y₂) is m = (y₂ − y₁)/(x₂ − x₁).",
];

const TRIG_RATIOS: string[] = [
  "Sine: In a right triangle, sin θ = opposite/hypotenuse.",
  "Cosine: In a right triangle, cos θ = adjacent/hypotenuse.",
  "Tangent: In a right triangle, tan θ = opposite/adjacent.",
  "SOH CAH TOA: A memory device — Sine is Opposite over Hypotenuse, Cosine is Adjacent over Hypotenuse, Tangent is Opposite over Adjacent.",
];

const INVERSE_TRIG: string[] = [
  ...TRIG_RATIOS,
  "Inverse Trigonometric Functions: If sin θ = x, then θ = sin⁻¹(x). Inverse cosine and inverse tangent work the same way, returning the angle measure.",
];

const ELEVATION_DEPRESSION: string[] = [
  ...TRIG_RATIOS,
  "Angle of Elevation: The angle formed by a horizontal line and the line of sight when looking upward.",
  "Angle of Depression: The angle formed by a horizontal line and the line of sight when looking downward.",
];

const SPECIAL_TRIANGLES: string[] = [
  "45-45-90 Triangle: The sides are in the ratio 1 : 1 : √2 — the legs are equal, and the hypotenuse is leg × √2.",
  "30-60-90 Triangle: The sides are in the ratio 1 : √3 : 2 — the short leg is opposite the 30° angle, the long leg is short leg × √3, and the hypotenuse is twice the short leg.",
];

const TRIG_MIXED: string[] = [...TRIG_RATIOS, ...SPECIAL_TRIANGLES];

const CIRCLE_MEASUREMENT: string[] = [
  "Circumference: The distance around a circle is C = 2πr, where r is the radius.",
  "Arc Length: The length of an arc with central angle θ (in degrees) in a circle of radius r is (θ/360) × 2πr.",
  "Sector Area: The area of a sector with central angle θ (in degrees) in a circle of radius r is (θ/360) × πr².",
];

const GEOMETRIC_PROBABILITY: string[] = [
  "Geometric Probability: For equally likely outcomes spread over a region, P(event) = (area of the favorable region) / (area of the total region).",
  "Bullseye Probability: The probability a dart lands in the inner circle is (area of inner circle) / (area of outer circle) = r²/R².",
  "Spinner Probability: The probability a spinner lands in a sector is (sector angle)/360°.",
];

/**
 * Definitions per registry entry id. Entries with no real generator
 * (under-construction lessons) intentionally have NO key — renderers must
 * omit the definitions block gracefully for them.
 */
export const CLASSICAL_DEFINITIONS: Record<string, string[]> = {
  // Topic 12 — circle theorems
  "anatomy-of-a-circle": CIRCLE_THEOREMS,
  "ch12-test": CIRCLE_THEOREMS,
  // Topic 4 — triangle congruence
  "logic-of-congruence": CONGRUENCE_THEOREMS,
  "ch4-test": CONGRUENCE_THEOREMS,
  // Topic 7 — coordinate geometry
  "ch7-1-distance-midpoint": COORDINATE_FORMULAS,
  "ch7-test": COORDINATE_FORMULAS,
  // Topic 10 — trigonometry
  "trig-1-ratios": TRIG_RATIOS,
  "trig-2-sides": TRIG_RATIOS,
  "trig-3-angles": INVERSE_TRIG,
  "elevation-depression": ELEVATION_DEPRESSION,
  "special-right-triangles": SPECIAL_TRIANGLES,
  "ch10-test": TRIG_MIXED,
  // Topic 11 — circle measurement
  "ch11-1-circumference": CIRCLE_MEASUREMENT,
  "ch11-test": CIRCLE_MEASUREMENT,
  // Topic 15 — geometric probability
  "target-zone": GEOMETRIC_PROBABILITY,
  "ch15-test": GEOMETRIC_PROBABILITY,
};

/**
 * Look up the definition set for a registry entry id.
 * Returns undefined when the entry has no seeded definitions — the renderer
 * then omits the DEFINITIONS block (no empty box, no crash).
 */
export function getClassicalDefinitions(entryId: string): string[] | undefined {
  return CLASSICAL_DEFINITIONS[entryId];
}

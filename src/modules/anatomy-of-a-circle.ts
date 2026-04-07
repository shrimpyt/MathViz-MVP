// anatomy-of-a-circle.ts
// TEKS G.12(A) — Inscribed Angles, Central Angles, Tangents, Chords, Secants
//
// Mathematical Truth Layer:
//   • Seed variable: the circle's radius R (integer, 3–12 abstract units).
//   • All arc angles are derived deterministically from R so every "Given"
//     in a problem is internally consistent.
//   • Arc values are multiples of 10° — clean classroom arithmetic.

import { BaseGeometryModule, CartesianPoint } from "./BaseGeometryModule";
import type {
  CircleProblem,
  InscribedAngleSVGParams,
  TangentSVGParams,
  ChordSVGParams,
} from "@/lib/ProblemFactory";

export type CircleSubtype =
  | "InscribedAngle"
  | "CentralAngle"
  | "Tangent"
  | "TwoChords"
  | "TwoSecants";

const SUBTYPES: CircleSubtype[] = [
  "InscribedAngle",
  "CentralAngle",
  "Tangent",
  "TwoChords",
  "TwoSecants",
];

/** Rendering radius in the 200×200 SVG viewBox */
const SVG_R = 70;

export class AnatomyOfACircle extends BaseGeometryModule {
  /** Seed: circle radius in abstract units (3–12) */
  readonly radius: number;
  readonly subtype: CircleSubtype;

  /** Primary intercepted arc in degrees (multiple of 10, 40–170) */
  readonly arcAngle: number;
  /** Secondary arc for TwoChords (multiple of 20, 40–160) */
  readonly arc2Angle: number;
  /** Near arc for TwoSecants (multiple of 20, 20–100) */
  readonly nearArc: number;

  constructor(radius: number, subtypeIndex: number) {
    super(100, 100);
    this.radius = radius;
    this.subtype = SUBTYPES[subtypeIndex % SUBTYPES.length];

    // Derive arc from seed so all givens stay internally consistent.
    // Map radius (3-12) + subtypeIndex → multiples of 10 in range 40-170.
    const arcStep = ((radius * 7 + subtypeIndex * 11) % 14) + 4; // 4..17
    this.arcAngle = arcStep * 10;

    // Secondary arc for TwoChords: multiple of 20 in range 40-180
    const arc2Step = ((radius * 3 + subtypeIndex * 5) % 8) + 2; // 2..9
    this.arc2Angle = arc2Step * 20;

    // Near arc for TwoSecants: must be less than arcAngle
    const nearStep = ((radius * 5 + subtypeIndex * 3) % 5) + 1; // 1..5
    this.nearArc = nearStep * 20; // 20–100
  }

  validate(): boolean {
    if (this.arcAngle <= 0 || this.arcAngle > 170) return false;
    if (this.subtype === "TwoChords") {
      return this.arc2Angle > 0 && this.arcAngle + this.arc2Angle <= 320;
    }
    if (this.subtype === "TwoSecants") {
      return this.arcAngle > this.nearArc;
    }
    return true;
  }

  /** Key circle points as SVG Cartesian coordinates (polar → Cartesian) */
  calculateCoordinates(): CartesianPoint[] {
    const arcStart = 30;
    return [
      this.polarToCart(SVG_R, arcStart),
      this.polarToCart(SVG_R, arcStart + this.arcAngle),
    ];
  }

  toProblem(): CircleProblem {
    const arc = this.arcAngle;

    switch (this.subtype) {
      case "InscribedAngle": {
        const angle = arc / 2;
        return {
          type: "G.12A",
          subtype: "InscribedAngle",
          given: { interceptedArc: arc },
          find: "inscribed angle",
          answer: angle,
          unit: "°",
          steps: [
            {
              instruction: "Recall the Inscribed Angle Theorem:",
              blanks: [
                {
                  label: "formula",
                  answer: "Inscribed Angle = ½ × Intercepted Arc",
                },
              ],
            },
            {
              instruction: `Substitute the intercepted arc measure of ${arc}°:`,
              blanks: [
                { label: "½ × ?", answer: `½ × ${arc}°` },
                { label: "answer", answer: `${angle}°` },
              ],
            },
          ],
          svgParams: {
            kind: "InscribedAngle",
            interceptedArc: arc,
            inscribedAngle: angle,
          } as InscribedAngleSVGParams,
        };
      }

      case "CentralAngle": {
        return {
          type: "G.12A",
          subtype: "CentralAngle",
          given: { interceptedArc: arc },
          find: "central angle",
          answer: arc,
          unit: "°",
          steps: [
            {
              instruction: "Recall the Central Angle Theorem:",
              blanks: [
                {
                  label: "formula",
                  answer: "Central Angle = Intercepted Arc",
                },
              ],
            },
            {
              instruction: `The central angle equals the intercepted arc of ${arc}°:`,
              blanks: [{ label: "answer", answer: `${arc}°` }],
            },
          ],
          svgParams: {
            kind: "CentralAngle",
            interceptedArc: arc,
            centralAngle: arc,
          } as InscribedAngleSVGParams,
        };
      }

      case "Tangent": {
        const angle = arc / 2;
        return {
          type: "G.12A",
          subtype: "Tangent",
          given: { interceptedArc: arc },
          find: "tangent-chord angle",
          answer: angle,
          unit: "°",
          steps: [
            {
              instruction:
                "An angle formed by a tangent and a chord equals half the intercepted arc:",
              blanks: [
                {
                  label: "formula",
                  answer: "Tangent-Chord Angle = ½ × Intercepted Arc",
                },
              ],
            },
            {
              instruction: `Substitute ${arc}°:`,
              blanks: [
                { label: "½ × ?", answer: `½ × ${arc}°` },
                { label: "answer", answer: `${angle}°` },
              ],
            },
          ],
          svgParams: {
            kind: "Tangent",
            tangentAngle: angle,
          } as TangentSVGParams,
        };
      }

      case "TwoChords": {
        const arc1 = this.arcAngle;
        const arc2 = this.arc2Angle;
        const angle = (arc1 + arc2) / 2;
        return {
          type: "G.12A",
          subtype: "TwoChords",
          given: { arc1, arc2 },
          find: "angle formed by two chords",
          answer: angle,
          unit: "°",
          steps: [
            {
              instruction:
                "Two chords intersect inside a circle. The angle equals half the sum of intercepted arcs:",
              blanks: [
                { label: "formula", answer: "Angle = ½(arc₁ + arc₂)" },
              ],
            },
            {
              instruction: `Substitute arc₁ = ${arc1}° and arc₂ = ${arc2}°:`,
              blanks: [
                {
                  label: "½(? + ?)",
                  answer: `½(${arc1}° + ${arc2}°)`,
                },
                { label: "½ × ?", answer: `½ × ${arc1 + arc2}°` },
                { label: "answer", answer: `${angle}°` },
              ],
            },
          ],
          svgParams: {
            kind: "TwoChords",
            arc1,
            arc2,
          } as ChordSVGParams,
        };
      }

      case "TwoSecants": {
        const farArc = this.arcAngle;
        const nearArc = this.nearArc;
        const angle = (farArc - nearArc) / 2;
        return {
          type: "G.12A",
          subtype: "TwoSecants",
          given: { farArc, nearArc },
          find: "angle formed by two secants",
          answer: angle,
          unit: "°",
          steps: [
            {
              instruction:
                "Two secants drawn from an external point. The angle equals half the difference of intercepted arcs:",
              blanks: [
                {
                  label: "formula",
                  answer: "Angle = ½(far arc − near arc)",
                },
              ],
            },
            {
              instruction: `Substitute far arc = ${farArc}°, near arc = ${nearArc}°:`,
              blanks: [
                {
                  label: "½(? − ?)",
                  answer: `½(${farArc}° − ${nearArc}°)`,
                },
                {
                  label: "½ × ?",
                  answer: `½ × ${farArc - nearArc}°`,
                },
                { label: "answer", answer: `${angle}°` },
              ],
            },
          ],
          svgParams: {
            kind: "TwoSecants",
            interceptedArc: farArc,
          } as InscribedAngleSVGParams,
        };
      }
    }
  }

  /**
   * Generate n G.12(A) problems using a seeded RNG.
   * The radius seed ensures all givens are derived from a single source.
   */
  static generateMany(n: number, rng: () => number): CircleProblem[] {
    return Array.from({ length: n }, () => {
      const radius = Math.floor(rng() * 10) + 3; // 3–12
      const subtypeIdx = Math.floor(rng() * SUBTYPES.length);
      const mod = new AnatomyOfACircle(radius, subtypeIdx);
      // Fall back to InscribedAngle (always valid) if validation fails
      const safe = mod.validate()
        ? mod
        : new AnatomyOfACircle(radius, 0);
      return safe.toProblem();
    });
  }
}

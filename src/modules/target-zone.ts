// target-zone.ts
// TEKS G.13(B) — Area-Based Probability: Concentric Circles & Sector Spinners
//
// Mathematical Truth Layer:
//   • Seed variable: the outer circle's radius R (integer, 5–12 abstract units).
//   • Inner radius r is derived from R via a deterministic fraction, then
//     rounded to the nearest integer for clean classroom arithmetic.
//   • Sector angle is a multiple of 30° derived from R.
//   • validate() enforces: r < R and sector angle ∈ (0°, 360°).
//
// SVG verification — bullseye (ConcentricCircles) coordinate logic:
//   scale = SVG_R / R  (normalises outer radius to 70 SVG units)
//   scaledOuter = R × scale = SVG_R  ← always fills the viewBox correctly
//   scaledInner = r × scale          ← proportional to r/R (the real ratio)
//   Probability = (πr²) / (πR²) = r²/R² = scaledInner²/scaledOuter² ✓
//   The inner shaded area is geometrically proportional on-screen.

import { BaseGeometryModule, CartesianPoint } from "./BaseGeometryModule";
import type {
  ProbabilityProblem,
  ConcentricSVGParams,
  SectorSVGParams,
} from "@/lib/ProblemFactory";

export type TargetSubtype = "ConcentricCircles" | "ShadedSector";

export class TargetZone extends BaseGeometryModule {
  /** Seed: outer radius in abstract units (5–12) */
  readonly outerRadius: number;
  readonly subtype: TargetSubtype;

  /** Inner radius (integer), derived from outerRadius */
  readonly innerRadius: number;
  /** Sector angle in degrees (multiple of 30°), derived from outerRadius */
  readonly sectorAngle: number;

  constructor(outerRadius: number, subtypeIndex: number) {
    super(100, 100);
    this.outerRadius = outerRadius;
    this.subtype = subtypeIndex % 2 === 0 ? "ConcentricCircles" : "ShadedSector";

    // Derive inner radius: fraction 0.35–0.70 of outerRadius, rounded to int
    const fracStep = ((outerRadius * 7 + subtypeIndex * 3) % 8); // 0..7
    const fraction = 0.35 + fracStep * 0.05; // 0.35, 0.40, …, 0.70
    this.innerRadius = BaseGeometryModule.roundToInt(outerRadius * fraction);

    // Derive sector angle: multiple of 30° in range 30°–330°
    const sectorStep = ((outerRadius * 3 + subtypeIndex * 7) % 11) + 1; // 1..11
    this.sectorAngle = sectorStep * 30;
  }

  validate(): boolean {
    if (this.outerRadius <= 0) return false;
    if (this.subtype === "ConcentricCircles") {
      return this.innerRadius > 0 && this.innerRadius < this.outerRadius;
    }
    return this.sectorAngle > 0 && this.sectorAngle < 360;
  }

  /**
   * Key SVG points using polar coordinates (r, θ).
   * For ConcentricCircles: the inner-edge point and outer-edge point along 0°.
   * For ShadedSector: the arc start and end points.
   */
  calculateCoordinates(): CartesianPoint[] {
    const SVG_R = 70;
    const scale = SVG_R / this.outerRadius;
    if (this.subtype === "ConcentricCircles") {
      return [
        // Inner circle edge at 0° (right side, for labelling)
        { x: this.cx + this.innerRadius * scale, y: this.cy },
        // Outer circle edge at 0°
        { x: this.cx + SVG_R, y: this.cy },
      ];
    }
    // Sector start (top) and end points
    return [
      this.polarToCart(SVG_R, 0),
      this.polarToCart(SVG_R, this.sectorAngle),
    ];
  }

  toProblem(): ProbabilityProblem {
    if (this.subtype === "ConcentricCircles") {
      const R = this.outerRadius;
      const r = this.innerRadius;
      const prob = parseFloat(((r ** 2) / (R ** 2)).toFixed(4));
      const pct = (prob * 100).toFixed(1) + "%";
      return {
        type: "G.13B",
        subtype: "ConcentricCircles",
        outerR: R,
        innerR: r,
        answer: prob,
        answerPct: pct,
        steps: [
          {
            instruction: "Probability = (favorable area) ÷ (total area):",
            blanks: [
              {
                label: "formula",
                answer: "P = π·r² / π·R²  =  r² / R²",
              },
            ],
          },
          {
            instruction: `Substitute inner radius r = ${r}, outer radius R = ${R}:`,
            blanks: [
              { label: "r²", answer: `${r}² = ${r ** 2}` },
              { label: "R²", answer: `${R}² = ${R ** 2}` },
              { label: "P", answer: `${r ** 2}/${R ** 2} ≈ ${pct}` },
            ],
          },
        ],
        svgParams: {
          kind: "ConcentricCircles",
          outerR: R,
          innerR: r,
        } as ConcentricSVGParams,
      };
    }

    // ShadedSector
    const θ = this.sectorAngle;
    const prob = parseFloat((θ / 360).toFixed(4));
    const pct = (prob * 100).toFixed(1) + "%";
    return {
      type: "G.13B",
      subtype: "ShadedSector",
      outerR: this.outerRadius,
      sectorAngle: θ,
      answer: prob,
      answerPct: pct,
      steps: [
        {
          instruction:
            "Sector area = (θ/360°) × πr². Probability = sector area ÷ circle area:",
          blanks: [{ label: "formula", answer: "P = θ / 360°" }],
        },
        {
          instruction: `Substitute sector angle θ = ${θ}°:`,
          blanks: [
            { label: "θ / 360", answer: `${θ}° / 360°` },
            { label: "P", answer: `≈ ${pct}` },
          ],
        },
      ],
      svgParams: {
        kind: "ShadedSector",
        sectorAngle: θ,
      } as SectorSVGParams,
    };
  }

  /** Generate n G.13(B) problems using a seeded RNG. */
  static generateMany(n: number, rng: () => number): ProbabilityProblem[] {
    return Array.from({ length: n }, () => {
      const outerR = Math.floor(rng() * 8) + 5; // 5–12
      const subtypeIdx = Math.floor(rng() * 2);
      const mod = new TargetZone(outerR, subtypeIdx);
      if (!mod.validate()) return new TargetZone(8, 0).toProblem();
      return mod.toProblem();
    });
  }
}

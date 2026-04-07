// logic-of-congruence.ts
// TEKS G.6(B) — Triangle Congruence Proofs: SSS, SAS, ASA, AAS, HL
//
// Mathematical Truth Layer:
//   • Seed variable: base side length a (integer, 5–12 abstract units).
//   • Second side b = roundToHalf(a × 1.25) — longer side.
//   • Third side c = roundToHalf(a × 0.80) — shorter side.
//   • Angles derived via Law of Cosines so they are geometrically real:
//       cos(B) = (a² + c² − b²) / (2ac)
//       cos(C) = (a² + b² − c²) / (2ab)
//   • For HL the included right angle is given; only hypotenuse and one leg
//     need be stated as congruent.
//   • validate() enforces the triangle inequality: a+b>c, a+c>b, b+c>a.
//
// Proof pedagogy:
//   • Each proof is a minimal 2-column structure (Statement | Reason).
//   • GuidedNote mode: Theorem name is a fill-in-the-blank.
//   • Test mode: Students write all statements and reasons.

import { BaseGeometryModule, CartesianPoint } from "./BaseGeometryModule";
import type { CongruenceProblem, CongruenceSVGParams } from "@/lib/ProblemFactory";

export type CongruenceSubtype = "SSS" | "SAS" | "ASA" | "AAS" | "HL";

const SUBTYPES: CongruenceSubtype[] = ["SSS", "SAS", "ASA", "AAS", "HL"];

/** Fixed SVG triangle 1 vertex positions (left half of 200×200 viewBox) */
const T1 = {
  A: { x: 50, y: 38 },
  B: { x: 18, y: 148 },
  C: { x: 88, y: 148 },
};

/** Fixed SVG triangle 2 vertex positions (right half — horizontally mirrored) */
const T2 = {
  D: { x: 150, y: 38 },
  E: { x: 182, y: 148 },
  F: { x: 112, y: 148 },
};

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

export class LogicOfCongruence extends BaseGeometryModule {
  /** Seed: base side length a in abstract units (5–12) */
  readonly sideA: number;
  readonly sideB: number;
  readonly sideC: number;
  readonly subtype: CongruenceSubtype;

  /** Angle at vertex B (between sides a and c) in degrees */
  readonly angleB: number;
  /** Angle at vertex C (between sides a and b) in degrees */
  readonly angleC: number;
  /** Angle at vertex A (= 180 − B − C) in degrees */
  readonly angleA: number;

  constructor(sideA: number, subtypeIndex: number) {
    super(100, 100);
    this.sideA = sideA;
    this.subtype = SUBTYPES[subtypeIndex % SUBTYPES.length];

    if (this.subtype === "HL") {
      // Right triangle: C = 90°. Derive a and b from the seed.
      // Hypotenuse = sideA (seed), leg b = roundToHalf(sideA × 0.75)
      this.sideB = BaseGeometryModule.roundToHalf(sideA * 0.75);
      // Third side via Pythagorean theorem
      this.sideC = BaseGeometryModule.roundToHalf(
        Math.sqrt(sideA ** 2 - this.sideB ** 2)
      );
      this.angleC = 90;
      this.angleB = BaseGeometryModule.roundToInt(
        toDeg(Math.asin(this.sideB / sideA))
      );
      this.angleA = 90 - this.angleB;
    } else {
      // General triangle derived from seed a
      this.sideB = BaseGeometryModule.roundToHalf(sideA * 1.25);
      this.sideC = BaseGeometryModule.roundToHalf(sideA * 0.8);
      // Law of Cosines → angles (rounded to nearest integer for clean values)
      const cosB =
        (sideA ** 2 + this.sideC ** 2 - this.sideB ** 2) /
        (2 * sideA * this.sideC);
      const cosC =
        (sideA ** 2 + this.sideB ** 2 - this.sideC ** 2) /
        (2 * sideA * this.sideB);
      this.angleB = BaseGeometryModule.roundToInt(toDeg(Math.acos(cosB)));
      this.angleC = BaseGeometryModule.roundToInt(toDeg(Math.acos(cosC)));
      this.angleA = 180 - this.angleB - this.angleC;
    }
  }

  validate(): boolean {
    const { sideA: a, sideB: b, sideC: c } = this;
    if (a <= 0 || b <= 0 || c <= 0) return false;
    if (!(a + b > c && a + c > b && b + c > a)) return false;
    if (this.subtype === "HL") return this.angleC === 90;
    return this.angleA > 0 && this.angleB > 0 && this.angleC > 0;
  }

  /**
   * Return the six triangle vertices as SVG Cartesian points.
   * (These are the fixed display coordinates, not scaled from side lengths —
   *  the labels carry the true measurements.)
   */
  calculateCoordinates(): CartesianPoint[] {
    return [T1.A, T1.B, T1.C, T2.D, T2.E, T2.F];
  }

  toProblem(): CongruenceProblem {
    const { sideA: a, sideB: b, sideC: c, angleA, angleB, angleC } = this;

    const svgBase: Omit<CongruenceSVGParams, "sideMarks" | "angleMarks" | "rightAngleAt"> = {
      kind: "Congruence",
      subtype: this.subtype,
      sideA: a,
      sideB: b,
      sideC: c,
    };

    switch (this.subtype) {
      case "SSS": {
        return {
          type: "G.6B",
          subtype: "SSS",
          given: [
            `AB ≅ DE  (${a} units)`,
            `BC ≅ EF  (${a} units)`,
            `CA ≅ FD  (${b} units)`,
          ],
          find: "the congruence theorem that proves △ABC ≅ △DEF",
          answer: "SSS",
          steps: [
            {
              instruction: "List all three pairs of congruent sides:",
              blanks: [
                { label: "sides", answer: "AB ≅ DE,  BC ≅ EF,  CA ≅ FD" },
              ],
            },
            {
              instruction:
                "When three pairs of corresponding sides are congruent, we apply:",
              blanks: [
                {
                  label: "theorem",
                  answer: "SSS Congruence Theorem",
                },
              ],
            },
            {
              instruction: "Conclusion:",
              blanks: [
                { label: "statement", answer: "△ABC ≅ △DEF  [SSS]" },
              ],
            },
          ],
          svgParams: {
            ...svgBase,
            sideMarks: [1, 2, 3],
            angleMarks: [false, false, false],
            rightAngleAt: -1,
          },
        };
      }

      case "SAS": {
        return {
          type: "G.6B",
          subtype: "SAS",
          given: [
            `AB ≅ DE  (${a} units)`,
            `∠B ≅ ∠E  (${angleB}°)`,
            `BC ≅ EF  (${a} units)`,
          ],
          find: "the congruence theorem that proves △ABC ≅ △DEF",
          answer: "SAS",
          steps: [
            {
              instruction: "Identify the two congruent sides and the included angle:",
              blanks: [
                {
                  label: "sides + angle",
                  answer: "AB ≅ DE,  ∠B ≅ ∠E,  BC ≅ EF",
                },
              ],
            },
            {
              instruction:
                "When two sides and the included angle are congruent, we apply:",
              blanks: [{ label: "theorem", answer: "SAS Congruence Theorem" }],
            },
            {
              instruction: "Conclusion:",
              blanks: [
                { label: "statement", answer: "△ABC ≅ △DEF  [SAS]" },
              ],
            },
          ],
          svgParams: {
            ...svgBase,
            sideMarks: [1, 2, 0],
            angleMarks: [false, true, false],
            rightAngleAt: -1,
          },
        };
      }

      case "ASA": {
        return {
          type: "G.6B",
          subtype: "ASA",
          given: [
            `∠A ≅ ∠D  (${angleA}°)`,
            `AB ≅ DE  (${a} units)`,
            `∠B ≅ ∠E  (${angleB}°)`,
          ],
          find: "the congruence theorem that proves △ABC ≅ △DEF",
          answer: "ASA",
          steps: [
            {
              instruction:
                "Identify the two congruent angles and the included side:",
              blanks: [
                {
                  label: "angles + side",
                  answer: "∠A ≅ ∠D,  AB ≅ DE,  ∠B ≅ ∠E",
                },
              ],
            },
            {
              instruction:
                "When two angles and the included side are congruent, we apply:",
              blanks: [{ label: "theorem", answer: "ASA Congruence Theorem" }],
            },
            {
              instruction: "Conclusion:",
              blanks: [
                { label: "statement", answer: "△ABC ≅ △DEF  [ASA]" },
              ],
            },
          ],
          svgParams: {
            ...svgBase,
            sideMarks: [1, 0, 0],
            angleMarks: [true, true, false],
            rightAngleAt: -1,
          },
        };
      }

      case "AAS": {
        return {
          type: "G.6B",
          subtype: "AAS",
          given: [
            `∠A ≅ ∠D  (${angleA}°)`,
            `∠B ≅ ∠E  (${angleB}°)`,
            `BC ≅ EF  (${a} units)`,
          ],
          find: "the congruence theorem that proves △ABC ≅ △DEF",
          answer: "AAS",
          steps: [
            {
              instruction:
                "Identify the two congruent angles and the non-included side:",
              blanks: [
                {
                  label: "angles + side",
                  answer: "∠A ≅ ∠D,  ∠B ≅ ∠E,  BC ≅ EF  (non-included)",
                },
              ],
            },
            {
              instruction:
                "When two angles and a non-included side are congruent, we apply:",
              blanks: [{ label: "theorem", answer: "AAS Congruence Theorem" }],
            },
            {
              instruction: "Conclusion:",
              blanks: [
                { label: "statement", answer: "△ABC ≅ △DEF  [AAS]" },
              ],
            },
          ],
          svgParams: {
            ...svgBase,
            sideMarks: [0, 1, 0],
            angleMarks: [true, true, false],
            rightAngleAt: -1,
          },
        };
      }

      case "HL": {
        // a is the hypotenuse, b is the given leg
        return {
          type: "G.6B",
          subtype: "HL",
          given: [
            "△ABC and △DEF are right triangles (right angle at C and F)",
            `Hypotenuse AB ≅ DE  (${a} units)`,
            `Leg BC ≅ EF  (${b} units)`,
          ],
          find: "the congruence theorem that proves △ABC ≅ △DEF",
          answer: "HL",
          steps: [
            {
              instruction:
                "Confirm both triangles are right triangles with congruent hypotenuses and one congruent leg:",
              blanks: [
                {
                  label: "given",
                  answer: "Right △s, AB ≅ DE (hyp.), BC ≅ EF (leg)",
                },
              ],
            },
            {
              instruction:
                "For right triangles with congruent hypotenuse and leg, we apply:",
              blanks: [
                { label: "theorem", answer: "Hypotenuse-Leg (HL) Theorem" },
              ],
            },
            {
              instruction: "Conclusion:",
              blanks: [
                { label: "statement", answer: "△ABC ≅ △DEF  [HL]" },
              ],
            },
          ],
          svgParams: {
            ...svgBase,
            sideMarks: [1, 2, 0],
            angleMarks: [false, false, false],
            rightAngleAt: 2, // vertex C index
          },
        };
      }
    }
  }

  /** Generate n G.6(B) problems using a seeded RNG. */
  static generateMany(n: number, rng: () => number): CongruenceProblem[] {
    return Array.from({ length: n }, () => {
      const sideA = Math.floor(rng() * 8) + 5; // 5–12
      const subtypeIdx = Math.floor(rng() * SUBTYPES.length);
      const mod = new LogicOfCongruence(sideA, subtypeIdx);
      if (!mod.validate()) return new LogicOfCongruence(8, 0).toProblem();
      return mod.toProblem();
    });
  }
}

// right-triangles.ts
// TEKS G.9(A) — Right Triangles & Trigonometry
//
// Mathematical Truth Layer:
//  - Generates seeded right triangles using Pythagorean triples (scaled) or random 
//    side lengths with calculated angles.
//  - Derives Sine, Cosine, and Tangent problem structures based on subtypes.
//  - Emits problems for "IdentifyRatio", "SolveForSide", and "SolveForAngle".

import { BaseGeometryModule, CartesianPoint } from "./BaseGeometryModule";
import type { TrigProblem, TrigSVGParams, TrigSubtype } from "@/lib/types";

// Seeded PRNG utilities
import { pick, randInt } from "@/lib/math-utils";

export class RightTriangles extends BaseGeometryModule {
  readonly opposite: number;
  readonly adjacent: number;
  readonly hypotenuse: number;
  readonly referenceAnglePos: "top" | "base";
  readonly orientation: "left" | "right";
  
  // Real angle in degrees (helper)
  readonly thetaReal: number;

  constructor(
    o: number, 
    a: number, 
    h: number, 
    pos: "top" | "base", 
    ori: "left" | "right"
  ) {
    super(100, 100);
    this.opposite = o;
    this.adjacent = a;
    this.hypotenuse = h;
    this.referenceAnglePos = pos;
    this.orientation = ori;

    // SOH -> sin(theta) = opp / hyp -> theta = asin(opp/hyp)
    this.thetaReal = Math.round(Math.asin(o / h) * (180 / Math.PI));
  }

  // Not strictly used for right triangles since we use SVG polygons, but good for validation
  validate(): boolean {
    return this.opposite > 0 && this.adjacent > 0 && this.hypotenuse > 0;
  }

  calculateCoordinates(): CartesianPoint[] {
    return [];
  }

  toProblem(subtype: TrigSubtype, ratioTarget: "sin" | "cos" | "tan", rng: () => number): TrigProblem {
    const opp = this.opposite;
    const adj = this.adjacent;
    const hyp = this.hypotenuse;
    const theta = this.thetaReal;

    const ratioMap = {
      sin: { num: opp, den: hyp, label: "Opposite", labelDen: "Hypotenuse" },
      cos: { num: adj, den: hyp, label: "Adjacent", labelDen: "Hypotenuse" },
      tan: { num: opp, den: adj, label: "Opposite", labelDen: "Adjacent" },
    };

    const target = ratioMap[ratioTarget];

    // Build the specific SVG config
    const svgLabels: { opposite: string | number; adjacent: string | number; hypotenuse: string | number } = {
      opposite: opp,
      adjacent: adj,
      hypotenuse: hyp,
    };
    
    let answer: string | number = 0;
    const steps: any[] = [];
    let givenData: any = {};
    let findData = "";
    let refLabel = `${theta}°`;

    if (subtype === "IdentifyRatio") {
      // Show all sides, ask for the fraction
      givenData = { opp, adj, hyp };
      findData = `${ratioTarget}(θ)`;
      refLabel = "θ"; // Don't give away the degrees, just evaluate the fraction
      answer = `${target.num}/${target.den}`;
      
      steps.push({
        instruction: `Find the ratio for ${ratioTarget}(θ) using SOH CAH TOA.`,
        blanks: [
          { label: "Formula", answer: `${ratioTarget}(θ) = ${target.label} / ${target.labelDen}` }
        ]
      });
      steps.push({
        instruction: `Substitute the known values relative to θ.`,
        blanks: [
          { label: "Num", answer: target.num.toString() },
          { label: "Den", answer: target.den.toString() },
          { label: "Ratio", answer: answer }
        ]
      });
    } 
    else if (subtype === "SolveForSide") {
      // Give the angle and one side, find the other side using the ratio
      refLabel = `${theta}°`;
      const isFindingNumerator = randInt(rng, 0, 1) === 0;

      if (isFindingNumerator) {
        // e.g. finding Opposite given Hypotenuse (sin)
        givenData = { angle: theta, denominator: target.den };
        findData = target.label;
        answer = target.num;
        
        // Hide numerator in SVG
        if (target.label === "Opposite") svgLabels.opposite = "x";
        if (target.label === "Adjacent") svgLabels.adjacent = "x";
        if (target.label === "Hypotenuse") svgLabels.hypotenuse = "x"; // won't happen here since hyp is never num in our basic 3
        
        // Hide the unused side completely
        if (ratioTarget === "sin") svgLabels.adjacent = "";
        if (ratioTarget === "cos") svgLabels.opposite = "";
        if (ratioTarget === "tan") svgLabels.hypotenuse = "";

        steps.push({
          instruction: `Set up the ratio equation relative to the ${theta}° angle.`,
          blanks: [
            { label: "Eq", answer: `${ratioTarget}(${theta}°) = x / ${target.den}` }
          ]
        });
        steps.push({
          instruction: `Solve for x by multiplying both sides by ${target.den}.`,
          blanks: [
            { label: "x", answer: `${target.den} · ${ratioTarget}(${theta}°) = ${answer}` }
          ]
        });
      } else {
        // e.g. finding Hypotenuse given Opposite (sin)
        givenData = { angle: theta, numerator: target.num };
        findData = target.labelDen;
        answer = target.den;

        if (target.labelDen === "Opposite") svgLabels.opposite = "x";
        if (target.labelDen === "Adjacent") svgLabels.adjacent = "x";
        if (target.labelDen === "Hypotenuse") svgLabels.hypotenuse = "x";

        if (ratioTarget === "sin") svgLabels.adjacent = "";
        if (ratioTarget === "cos") svgLabels.opposite = "";
        if (ratioTarget === "tan") svgLabels.hypotenuse = "";

        steps.push({
          instruction: `Set up the ratio equation relative to the ${theta}° angle.`,
          blanks: [
            { label: "Eq", answer: `${ratioTarget}(${theta}°) = ${target.num} / x` }
          ]
        });
        steps.push({
          instruction: `Solve for x by isolating it.`,
          blanks: [
            { label: "x", answer: `${target.num} / ${ratioTarget}(${theta}°) = ${answer}` }
          ]
        });
      }
    }
    else if (subtype === "SolveForAngle") {
      // Find the angle given two sides
      refLabel = `x°`;
      givenData = { numSide: target.num, denSide: target.den };
      findData = "angle x";
      answer = theta;

      // Hide unused side
      if (ratioTarget === "sin") svgLabels.adjacent = "";
      if (ratioTarget === "cos") svgLabels.opposite = "";
      if (ratioTarget === "tan") svgLabels.hypotenuse = "";

      steps.push({
        instruction: `Identify the known sides relative to the angle x.`,
        blanks: [
          { label: "Rel", answer: `${target.label} and ${target.labelDen}` }
        ]
      });
      steps.push({
        instruction: `Use the inverse trigonometric function to solve for x.`,
        blanks: [
          { label: "Eq", answer: `x = ${ratioTarget}⁻¹(${target.num} / ${target.den})` },
          { label: "x", answer: `${answer}°` }
        ]
      });
    }

    return {
      type: "G.9A",
      subtype,
      ratioType: ratioTarget,
      given: givenData,
      find: findData,
      answer,
      steps,
      svgParams: {
        kind: "RightTriangle",
        opposite: opp,
        adjacent: adj,
        hypotenuse: hyp,
        labels: svgLabels,
        referenceAnglePos: this.referenceAnglePos,
        referenceAngleLabel: refLabel,
        orientation: this.orientation,
      } as TrigSVGParams,
    };
  }

  // ── Generator ───────────────────────────────────────────────────────────────

  static generateMany(
    n: number, 
    rng: () => number, 
    allowedSubtypes: TrigSubtype[]
  ): TrigProblem[] {
    const triples = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
    ];

    const ratios = ["sin", "cos", "tan"] as const;

    return Array.from({ length: n }, () => {
      // Pick a random Pythagorean triple
      const baseTriple = pick(rng, triples);
      
      // Randomly scale it (1x to 4x)
      const scale = randInt(rng, 1, 4);
      let o = baseTriple[0] * scale;
      let a = baseTriple[1] * scale;
      const h = baseTriple[2] * scale;

      // 50% chance to swap opposite and adjacent to vary the triangle shape
      if (rng() > 0.5) {
        const temp = o;
        o = a;
        a = temp;
      }

      const pos = rng() > 0.5 ? "top" : "base";
      const ori = rng() > 0.5 ? "left" : "right";

      const mod = new RightTriangles(o, a, h, pos, ori);

      const targetSubtype = pick(rng, allowedSubtypes);
      const targetRatio = pick(rng, ratios as unknown as ("sin"|"cos"|"tan")[]);

      return mod.toProblem(targetSubtype, targetRatio, rng);
    });
  }
}

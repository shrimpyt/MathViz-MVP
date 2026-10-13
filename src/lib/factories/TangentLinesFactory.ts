// TangentLinesFactory.ts
// Lesson ch12-1: Tangent Lines (TEKS G.12(A)).
// Built on the one fact everything else follows from: a radius drawn to the
// point of tangency is PERPENDICULAR to the tangent line. That perpendicularity
// is USED in the steps, it creates the right triangle for the Pythagorean
// tangent-length problems, the two right angles that make the external-angle /
// central-angle quadrilateral sum work, and (with its converse) the
// "is it tangent?" test. Two tangents from one external point are congruent;
// tangent segments explain circumscribed-polygon perimeters.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, sampleFromPool, pickTriple,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

function makeTangentLength(rng: RNG): GeometryProblem {
  const [legA, legB, hyp] = pickTriple(rng);
  // radius = one leg, tangent = other leg, center-to-point = hypotenuse
  const swap = rng() < 0.5;
  const radius = swap ? legB : legA;
  const tangent = swap ? legA : legB;
  return {
    type: "GEO.12",
    subtype: "TangentLength",
    prompt: `Line PT is tangent to circle O at point T. The radius OT is ${radius} and the distance from the center O to the external point P is ${hyp}. Find the length of the tangent segment PT.`,
    given: { radius, OP: hyp },
    find: "PT",
    answer: String(tangent),
    steps: [
      step("Draw the radius OT to the point of tangency T.", "A radius to a point of tangency sets up the key right angle."),
      step("OT is perpendicular to the tangent line PT, so △OTP is a right triangle with right angle at T.", "Radius-to-Tangent Perpendicularity Theorem."),
      step(`PT² + OT² = OP² → PT² + ${radius}² = ${hyp}² → PT² = ${hyp * hyp} − ${radius * radius} = ${tangent * tangent}.`, "Pythagorean Theorem.", [
        { label: "PT²", answer: String(tangent * tangent) },
      ]),
      step(`PT = ${tangent}.`, "Take the positive square root.", [{ label: "PT", answer: String(tangent) }]),
    ],
    svgParams: {
      kind: "TangentFigure",
      radiusLabel: String(radius),
      tangentLabel: "?",
      extLabel: String(hyp),
      showRightAngle: true,
    },
    verify: { kind: "tangentLen", radius, hyp },
  };
}

function makeTwoTangentSegments(rng: RNG, difficulty: Difficulty): GeometryProblem {
  if (difficulty >= 2) {
    const x = randInt(rng, 2, 8);
    const len = 2 * x + 3;
    const pbExpr = `4x − ${4 * x - len}`;
    return {
      type: "GEO.12",
      subtype: "TwoTangentSegments",
      prompt: `From external point P, two tangent segments PA and PB are drawn to a circle. PA = 2x + 3 and PB = ${pbExpr}. Find x and the length of each tangent segment.`,
      given: { PA: "2x + 3", PB: pbExpr },
      find: "x and tangent length",
      answer: `x = ${x}, length = ${len}`,
      steps: [
        step("Two tangent segments drawn from the same external point to a circle are congruent.", "Two-Tangent Theorem."),
        step(`PA = PB: 2x + 3 = ${pbExpr}.`, "Substitution.", [{ label: "equation", answer: `2x + 3 = ${pbExpr}` }]),
        step(`x = ${x}.`, "Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
        step(`PA = 2(${x}) + 3 = ${len}.`, "Substitution.", [{ label: "length", answer: String(len) }]),
      ],
      svgParams: { kind: "TangentFigure", radiusLabel: "", twoTangents: true },
      verify: { kind: "twoTangentAlg", x },
    };
  }
  const len = randInt(rng, 5, 20);
  return {
    type: "GEO.12",
    subtype: "TwoTangentSegments",
    prompt: `From external point P, two tangent segments PA and PB are drawn to a circle. If PA = ${len}, find PB.`,
    given: { PA: len },
    find: "PB",
    answer: String(len),
    steps: [
      step("Two tangent segments from a common external point to a circle are congruent.", "Two-Tangent Theorem."),
      step(`PB = PA = ${len}.`, "Two-Tangent Theorem.", [{ label: "PB", answer: String(len) }]),
    ],
    svgParams: { kind: "TangentFigure", radiusLabel: "", tangentLabel: String(len), twoTangents: true },
    verify: { kind: "twoTangent", len },
  };
}

function makeTangentCentralAngle(rng: RNG): GeometryProblem {
  const angP = randInt(rng, 25, 75);
  const central = 180 - angP;
  return {
    type: "GEO.12",
    subtype: "TangentCentralAngle",
    prompt: `Two tangents from point P touch circle O at A and B. The angle at P between the two tangents measures ${angP}°. Find the measure of the central angle ∠AOB.`,
    given: { angleP: angP },
    find: "m∠AOB",
    answer: `${central}°`,
    steps: [
      step("Draw radii OA and OB to the points of tangency.", "Radii to points of tangency."),
      step("Each radius is perpendicular to its tangent, so ∠OAP and ∠OBP are right angles (90° each).", "Radius-to-Tangent Perpendicularity Theorem."),
      step("OAPB is a quadrilateral, so its interior angles sum to 360°.", "Polygon Interior Angle-Sum Theorem (n = 4)."),
      step(`m∠AOB = 360° − 90° − 90° − ${angP}° = ${central}°. (The central angle and the angle at P are supplementary.)`, "Subtraction.", [
        { label: "m∠AOB", answer: `${central}°` },
      ]),
    ],
    svgParams: { kind: "TangentFigure", radiusLabel: "", angleP: `${angP}°`, twoTangents: true, showRightAngle: true },
    verify: { kind: "tangentAngle", angP },
  };
}

function makeIsTangent(rng: RNG): GeometryProblem {
  const [a, b, c] = pickTriple(rng);
  const isT = rng() < 0.5;
  const hyp = isT ? c : c + randInt(rng, 1, 3);
  return {
    type: "GEO.12",
    subtype: "IsTangent",
    prompt: `A line touches a circle of radius ${a} at point T. The center O is ${hyp} units from the external point P on the line's extension, and the segment from P to the point of tangency is ${b}. Is the line tangent to the circle? Answer Yes or No.`,
    given: { radius: a, tangentSeg: b, OP: hyp },
    find: "yes or no",
    answer: isT ? "Yes" : "No",
    steps: [
      step("The line is tangent exactly when the radius to the point of contact is perpendicular to it, that is, when OT² + PT² = OP².", "Converse of the Radius-to-Tangent Perpendicularity (via the Converse of the Pythagorean Theorem)."),
      step(`OT² + PT² = ${a}² + ${b}² = ${a * a + b * b}; OP² = ${hyp}² = ${hyp * hyp}.`, "Pythagorean check.", [
        { label: "sum", answer: String(a * a + b * b) },
      ]),
      step(
        isT
          ? `The sums are equal, so the radius is perpendicular to the line at T, the line is tangent.`
          : `The sums are not equal, so the radius is not perpendicular to the line at T, the line is not tangent.`,
        "Converse of the Pythagorean Theorem."
      ),
      step(`Answer: ${isT ? "Yes" : "No"}.`, "Tangent test.", [{ label: "answer", answer: isT ? "Yes" : "No" }]),
    ],
    svgParams: { kind: "TangentFigure", radiusLabel: String(a), tangentLabel: String(b), extLabel: String(hyp), showRightAngle: isT },
    verify: { kind: "isTangent", r: a, t: b, d: hyp },
  };
}

function makeCircumscribedPerimeter(rng: RNG): GeometryProblem {
  const p = randInt(rng, 2, 9);
  const q = randInt(rng, 2, 9);
  const r = randInt(rng, 2, 9);
  const per = 2 * (p + q + r);
  return {
    type: "GEO.12",
    subtype: "CircumscribedPerimeter",
    prompt: `△ABC is circumscribed about a circle (each side is tangent to the circle). The tangent segments from vertex A each measure ${p}, from vertex B each measure ${q}, and from vertex C each measure ${r}. Find the perimeter of △ABC.`,
    given: { fromA: p, fromB: q, fromC: r },
    find: "perimeter of △ABC",
    answer: String(per),
    steps: [
      step("From each vertex, the two tangent segments to the circle are congruent.", "Two-Tangent Theorem."),
      step(`The three sides of the triangle are ${p} + ${q}, ${q} + ${r}, and ${r} + ${p}.`, "Each side is the sum of two tangent segments."),
      step(`Perimeter = (${p} + ${q}) + (${q} + ${r}) + (${r} + ${p}) = 2(${p} + ${q} + ${r}) = ${per}.`, "Addition.", [
        { label: "perimeter", answer: String(per) },
      ]),
    ],
    verify: { kind: "circumPerim", p, q, r },
  };
}

export const TANGENT_LESSON_POOL: MakerEntry[] = [
  M("TangentLength", 1, (rng) => makeTangentLength(rng)),
  M("TwoTangentSegments", 1, (rng, d) => makeTwoTangentSegments(rng, d)),
  M("TangentCentralAngle", 2, (rng) => makeTangentCentralAngle(rng)),
  M("IsTangent", 3, (rng) => makeIsTangent(rng)),
  M("CircumscribedPerimeter", 3, (rng) => makeCircumscribedPerimeter(rng)),
];

export function generateTangentProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? TANGENT_LESSON_POOL.filter((e) => only.includes(e.subtype)) : TANGENT_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

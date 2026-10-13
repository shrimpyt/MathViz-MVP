// CrossSectionsRevolutionFactory.ts
// Topic 14: Cross-Sections and Solids of Revolution (TEKS G.10(A)).
// Lesson ch14-4, beside ch14-2 (surface area) and ch14-3 (volume). A cross
// section is the two-dimensional face exposed when a plane slices a solid;
// a solid of revolution is the three-dimensional figure swept out when a
// plane figure rotates about a line. D1 and D2 are identification items:
// name the cross-section shape, or name the solid a rotation produces. D3
// goes further and asks for the dimensions of the cross section, computed
// from the dimensions of the solid.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

interface IdCase {
  id: string;
  q: string;
  answer: string;
  why: string;
}

const SECTION_CASES: IdCase[] = [
  { id: "cyl-parallel", q: "A cylinder is sliced by a plane parallel to its bases. What is the shape of the cross section?", answer: "Circle", why: "The cutting plane is parallel to the circular bases, so the section is congruent to a base." },
  { id: "cyl-axis", q: "A cylinder is sliced by a plane that passes through its axis, perpendicular to its bases. What is the shape of the cross section?", answer: "Rectangle", why: "The plane cuts the top and bottom bases along diameters and the curved side along two heights, forming a rectangle." },
  { id: "cyl-oblique", q: "A cylinder is sliced by a plane tilted at an angle to its bases, cutting through the curved side only. What is the shape of the cross section?", answer: "Ellipse", why: "A slanted cut through a cylinder stretches the circular section into an ellipse." },
  { id: "cone-parallel", q: "A cone is sliced by a plane parallel to its base. What is the shape of the cross section?", answer: "Circle", why: "The plane is parallel to the circular base, so every such section is a circle, smaller than the base." },
  { id: "cone-apex", q: "A cone is sliced by a plane through its apex, perpendicular to its base. What is the shape of the cross section?", answer: "Triangle", why: "The plane passes through the apex and a diameter of the base, so the section has the apex and the diameter as its boundaries." },
  { id: "cone-oblique", q: "A cone is sliced by a slanted plane that does not pass through the apex and is not parallel to the base. What is the shape of the cross section?", answer: "Ellipse", why: "A slanted cut through the side of a cone, missing the apex, produces an ellipse." },
  { id: "sphere-plane", q: "A sphere is sliced by a plane. What is the shape of the cross section?", answer: "Circle", why: "Every plane section of a sphere is a circle; only the radius changes with the position of the plane." },
  { id: "prism-parallel", q: "A rectangular prism is sliced by a plane parallel to its front face. What is the shape of the cross section?", answer: "Rectangle", why: "The plane is parallel to a rectangular face, so the section is a congruent rectangle." },
  { id: "pyramid-parallel", q: "A square pyramid is sliced by a plane parallel to its base. What is the shape of the cross section?", answer: "Square", why: "The plane is parallel to the square base, so the section is a smaller, similar square." },
  { id: "pyramid-apex", q: "A square pyramid is sliced by a plane through its apex and perpendicular to its base, passing through the midpoints of two opposite base edges. What is the shape of the cross section?", answer: "Triangle", why: "The plane passes through the apex and a segment of the base, and cuts two triangular faces along their edges." },
  { id: "triprism-parallel", q: "A triangular prism is sliced by a plane parallel to its triangular bases. What is the shape of the cross section?", answer: "Triangle", why: "The plane is parallel to the triangular bases, so the section is congruent to a base." },
  { id: "triprism-lengthwise", q: "A triangular prism is sliced lengthwise by a plane parallel to one of its rectangular faces. What is the shape of the cross section?", answer: "Rectangle", why: "The cut runs along the length of the prism parallel to a rectangular face, so the section is a rectangle." },
];

const REVOLUTION_CASES: IdCase[] = [
  { id: "rev-rectangle", q: "A rectangle is rotated about one of its edges. What solid is formed?", answer: "Cylinder", why: "The edge becomes the axis, the opposite edge sweeps a curved surface, and the two edges perpendicular to the axis sweep circular bases." },
  { id: "rev-square", q: "A square is rotated about one of its sides. What solid is formed?", answer: "Cylinder", why: "Rotating about a side gives a cylinder whose height and radius both equal the side of the square." },
  { id: "rev-righttri", q: "A right triangle is rotated about one of its legs. What solid is formed?", answer: "Cone", why: "The leg on the axis stays fixed, the hypotenuse sweeps the slanted surface, and the other leg sweeps the circular base." },
  { id: "rev-isotri", q: "An isosceles triangle is rotated about its axis of symmetry. What solid is formed?", answer: "Cone", why: "The two equal sides sweep the same slanted surface and the base sweeps the circular base of a cone." },
  { id: "rev-semicircle", q: "A semicircle is rotated about its diameter. What solid is formed?", answer: "Sphere", why: "Every point of the curved edge stays the same distance from the center, sweeping the surface of a sphere." },
  { id: "rev-circle", q: "A circle is rotated about a line in its plane that does not touch the circle. What solid is formed?", answer: "Torus", why: "The circle sweeps a ring shape with a hole in the middle, the shape of a donut." },
];

function makeIdProblem(subtype: string, c: IdCase, find: string, reason: string): GeometryProblem {
  return {
    type: "GEO.14",
    subtype,
    prompt: c.q,
    given: { item: c.id },
    find,
    answer: c.answer,
    steps: [
      step("Picture the described cut or rotation and identify the boundary of the new face or surface.", reason),
      step(c.why, "Visualize the plane or the rotation."),
      step(`The answer is: ${c.answer}.`, reason, [{ label: "answer", answer: c.answer }]),
    ],
    verify: { kind: "csId", id: c.id },
  };
}

function makeCrossSectionShape(rng: RNG): GeometryProblem {
  return makeIdProblem("CrossSectionShape", pick(rng, SECTION_CASES), "the cross-section shape", "Definition of cross section.");
}

function makeSolidOfRevolution(rng: RNG): GeometryProblem {
  return makeIdProblem("SolidOfRevolution", pick(rng, REVOLUTION_CASES), "the solid formed", "Solids of revolution.");
}

function makeCrossSectionDimensions(rng: RNG): GeometryProblem {
  const form = pick(rng, ["cylinder", "prism", "sphere"] as const);
  if (form === "cylinder") {
    const r = randInt(rng, 2, 10);
    const h = randInt(rng, 3, 14);
    const ans = `Rectangle, ${2 * r} by ${h}`;
    return {
      type: "GEO.14",
      subtype: "CrossSectionDimensions",
      prompt: `A cylinder has radius ${r} and height ${h}. It is sliced by a plane through its axis, perpendicular to its bases. Give the shape of the cross section and its dimensions.`,
      given: { r, h },
      find: "shape and dimensions of the cross section",
      answer: ans,
      steps: [
        step("An axial cut produces a rectangle: its width is a diameter of the base and its height is the height of the cylinder.", "Cross sections of a cylinder."),
        step(`Diameter = 2 × ${r} = ${2 * r}, and the height is ${h}.`, "Diameter of a circle.", [
          { label: "width", answer: String(2 * r) },
        ]),
        step(`The cross section is: ${ans}.`, "Cross section dimensions.", [{ label: "answer", answer: ans }]),
      ],
      verify: { kind: "csDimsCyl", r, h },
    };
  }
  if (form === "prism") {
    const l = randInt(rng, 3, 12);
    const w = randInt(rng, 3, 12);
    const h = randInt(rng, 3, 12);
    const ans = `Rectangle, ${l} by ${h}`;
    return {
      type: "GEO.14",
      subtype: "CrossSectionDimensions",
      prompt: `A rectangular prism has length ${l}, width ${w}, and height ${h}. It is sliced by a plane parallel to its front face, which measures ${l} by ${h}. Give the shape of the cross section and its dimensions.`,
      given: { l, w, h },
      find: "shape and dimensions of the cross section",
      answer: ans,
      steps: [
        step("A cut parallel to a face produces a cross section congruent to that face.", "Cross sections of a prism."),
        step(`The front face measures ${l} by ${h}, so the section does too.`, "Congruent cross sections.", [
          { label: "dimensions", answer: `${l} by ${h}` },
        ]),
        step(`The cross section is: ${ans}.`, "Cross section dimensions.", [{ label: "answer", answer: ans }]),
      ],
      verify: { kind: "csDimsRect", d1: l, d2: h },
    };
  }
  const r = randInt(rng, 2, 12);
  const ans = `Circle, radius ${r}`;
  return {
    type: "GEO.14",
    subtype: "CrossSectionDimensions",
    prompt: `A sphere has radius ${r}. It is sliced by a plane through its center. Give the shape of the cross section and its radius.`,
    given: { r },
    find: "shape and radius of the cross section",
    answer: ans,
    steps: [
      step("Every plane section of a sphere is a circle, and a section through the center is the largest possible one, with the same radius as the sphere.", "Cross sections of a sphere (great circle)."),
      step(`The radius of the section is ${r}.`, "Great circle.", [{ label: "radius", answer: String(r) }]),
      step(`The cross section is: ${ans}.`, "Cross section dimensions.", [{ label: "answer", answer: ans }]),
    ],
    verify: { kind: "csDimsSphere", r },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const CROSS_SECTIONS_LESSON_POOL: MakerEntry[] = [
  M("CrossSectionShape", 1, (rng) => makeCrossSectionShape(rng)),
  M("SolidOfRevolution", 2, (rng) => makeSolidOfRevolution(rng)),
  M("CrossSectionDimensions", 3, (rng) => makeCrossSectionDimensions(rng)),
];

export function generateCrossSectionProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? CROSS_SECTIONS_LESSON_POOL.filter((e) => only.includes(e.subtype)) : CROSS_SECTIONS_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

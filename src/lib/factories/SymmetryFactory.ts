// SymmetryFactory.ts
// Topic 8: Symmetry of Figures (TEKS G.3(D)).
// Lesson ch8-2, beside ch8-1 (translations). A figure has line symmetry
// when a line divides it into mirror-image halves, and rotational symmetry
// when a rotation of less than 360 degrees about its center maps it onto
// itself. D1: count lines of symmetry for regular polygons and for named
// quadrilaterals and triangles. D2: rotational symmetry, the order and the
// smallest angle of rotation. D3: the same questions for a polygon given by
// its vertices on a coordinate grid, kept to regular cases with clean
// answers: squares, rectangles, and isosceles triangles.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, pt, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

const SHAPE_NAMES: Record<string, string> = {
  square: "square",
  rectangle: "rectangle (not a square)",
  rhombus: "rhombus (not a square)",
  kite: "kite",
  isoscelesTrapezoid: "isosceles trapezoid",
  parallelogram: "parallelogram (not a rectangle or rhombus)",
  equilateralTriangle: "equilateral triangle",
  isoscelesTriangle: "isosceles triangle (not equilateral)",
  scaleneTriangle: "scalene triangle",
  circle: "circle",
};
const LINE_SHAPES = Object.keys(SHAPE_NAMES);
const ROT_SHAPES = ["square", "rectangle", "rhombus", "parallelogram", "equilateralTriangle", "kite", "isoscelesTrapezoid", "isoscelesTriangle"];

/** Lines of symmetry for the named shapes (factory side). */
const LINE_COUNTS: Record<string, string> = {
  square: "4",
  rectangle: "2",
  rhombus: "2",
  kite: "1",
  isoscelesTrapezoid: "1",
  parallelogram: "0",
  equilateralTriangle: "3",
  isoscelesTriangle: "1",
  scaleneTriangle: "0",
  circle: "infinitely many",
};

/** Rotational symmetry for the named shapes (factory side). */
const ROT_ANSWERS: Record<string, string> = {
  square: "order 4, angle 90°",
  rectangle: "order 2, angle 180°",
  rhombus: "order 2, angle 180°",
  parallelogram: "order 2, angle 180°",
  equilateralTriangle: "order 3, angle 120°",
  kite: "no rotational symmetry",
  isoscelesTrapezoid: "no rotational symmetry",
  isoscelesTriangle: "no rotational symmetry",
};

/** Grid-figure answers by shape and question (factory side). */
const GRID_ANSWERS: Record<string, Record<string, string>> = {
  square: { lines: "4", angle: "90°" },
  rectangle: { lines: "2", angle: "180°" },
  isoscelesTriangle: { lines: "1", angle: "none" },
};

const REGULAR_NAMES: Record<number, string> = {
  3: "equilateral triangle", 4: "square", 5: "regular pentagon", 6: "regular hexagon",
  7: "regular heptagon", 8: "regular octagon", 9: "regular nonagon", 10: "regular decagon", 12: "regular dodecagon",
};

function makeSymmetryLinesRegular(rng: RNG): GeometryProblem {
  const n = pick(rng, [3, 4, 5, 6, 7, 8, 9, 10, 12]);
  return {
    type: "GEO.8",
    subtype: "SymmetryLinesRegular",
    prompt: `How many lines of symmetry does a ${REGULAR_NAMES[n]} have?`,
    given: { figure: REGULAR_NAMES[n] },
    find: "number of lines of symmetry",
    answer: String(n),
    steps: [
      step("A regular n-gon has a line of symmetry through each vertex and the midpoint of the opposite side, or through each pair of opposite side midpoints.", "Line symmetry of regular polygons."),
      step(`The figure has ${n} sides, so it has exactly ${n} lines of symmetry.`, "A regular n-gon has n lines of symmetry.", [
        { label: "lines", answer: String(n) },
      ]),
    ],
    verify: { kind: "symLines", n },
  };
}

function makeSymmetryLinesShape(rng: RNG): GeometryProblem {
  const shape = pick(rng, LINE_SHAPES);
  const name = SHAPE_NAMES[shape];
  const ans = LINE_COUNTS[shape];
  return {
    type: "GEO.8",
    subtype: "SymmetryLinesShape",
    prompt: shape === "circle"
      ? "How many lines of symmetry does a circle have?"
      : `How many lines of symmetry does a ${name} have?`,
    given: { shape },
    find: "number of lines of symmetry",
    answer: ans,
    steps: [
      step("A line of symmetry folds the figure so that the two halves coincide exactly.", "Definition of line symmetry."),
      step("Test each candidate fold line: through opposite vertices, through midpoints of opposite sides, or through a vertex and a side midpoint.", "Testing fold lines."),
      step(`The number of lines of symmetry is ${ans}.`, "Line symmetry.", [{ label: "lines", answer: ans }]),
    ],
    verify: { kind: "symShapeLines", shape },
  };
}

function makeSymmetryRotationRegular(rng: RNG): GeometryProblem {
  const n = pick(rng, [3, 4, 5, 6, 8, 9, 10, 12]);
  const angle = 360 / n;
  const ans = `order ${n}, angle ${angle}°`;
  return {
    type: "GEO.8",
    subtype: "SymmetryRotationRegular",
    prompt: `State the order of rotational symmetry of a ${REGULAR_NAMES[n]} and the smallest angle of rotation that maps it onto itself. Give the answer in the form: order n, angle a°.`,
    given: { figure: REGULAR_NAMES[n] },
    find: "order and smallest angle of rotational symmetry",
    answer: ans,
    steps: [
      step("A regular n-gon maps onto itself under rotations about its center by multiples of 360° divided by n, so its order is n.", "Rotational symmetry of regular polygons."),
      step(`360° ÷ ${n} = ${angle}°.`, "Division.", [{ label: "angle", answer: `${angle}°` }]),
      step(`Order ${n}, smallest angle ${angle}°.`, "Rotational symmetry.", [{ label: "answer", answer: ans }]),
    ],
    verify: { kind: "symRotOrder", n },
  };
}

function makeSymmetryRotationShape(rng: RNG): GeometryProblem {
  const shape = pick(rng, ROT_SHAPES);
  const name = SHAPE_NAMES[shape];
  const ans = ROT_ANSWERS[shape];
  const has = ans !== "no rotational symmetry";
  return {
    type: "GEO.8",
    subtype: "SymmetryRotationShape",
    prompt: `Does a ${name} have rotational symmetry? If it does, give the answer in the form: order n, angle a°. If it does not, answer: no rotational symmetry.`,
    given: { shape },
    find: "rotational symmetry, if any",
    answer: ans,
    steps: [
      step("A figure has rotational symmetry when a rotation of less than 360 degrees about its center maps it onto itself.", "Definition of rotational symmetry."),
      step(
        has
          ? "Rotating about the center, the figure coincides with itself more than once in a full turn."
          : "Rotating about the center, no position short of a full 360 degree turn makes the figure coincide with itself.",
        "Testing rotations."
      ),
      step(`Answer: ${ans}.`, "Rotational symmetry.", [{ label: "answer", answer: ans }]),
    ],
    verify: { kind: "symShapeRot", shape },
  };
}

function makeSymmetryGrid(rng: RNG): GeometryProblem {
  const shape = pick(rng, ["square", "rectangle", "isoscelesTriangle"] as const);
  const askLines = rng() < 0.5;
  const x0 = randInt(rng, -6, 0);
  const y0 = randInt(rng, -5, 1);
  let verts: { label: string; x: number; y: number }[] = [];
  let desc = "";
  if (shape === "square") {
    const s = randInt(rng, 3, 5);
    verts = [
      { label: "A", x: x0, y: y0 }, { label: "B", x: x0 + s, y: y0 },
      { label: "C", x: x0 + s, y: y0 + s }, { label: "D", x: x0, y: y0 + s },
    ];
    desc = "a square";
  } else if (shape === "rectangle") {
    const w = randInt(rng, 4, 6);
    const h = randInt(rng, 2, 3);
    verts = [
      { label: "A", x: x0, y: y0 }, { label: "B", x: x0 + w, y: y0 },
      { label: "C", x: x0 + w, y: y0 + h }, { label: "D", x: x0, y: y0 + h },
    ];
    desc = "a rectangle";
  } else {
    const w = pick(rng, [4, 6]);
    const h = randInt(rng, 3, 5);
    verts = [
      { label: "A", x: x0, y: y0 }, { label: "B", x: x0 + w, y: y0 },
      { label: "C", x: x0 + w / 2, y: y0 + h },
    ];
    desc = "an isosceles triangle";
  }
  const list = verts.map((v) => `${v.label}${pt(v.x, v.y)}`).join(", ");
  const ans = GRID_ANSWERS[shape][askLines ? "lines" : "angle"];
  return {
    type: "GEO.8",
    subtype: "SymmetryGridFigure",
    prompt: askLines
      ? `A polygon on the coordinate grid has vertices ${list}. The polygon is ${desc}. How many lines of symmetry does it have?`
      : `A polygon on the coordinate grid has vertices ${list}. The polygon is ${desc}. What is the smallest angle of rotation about its center that maps it onto itself? If there is none, answer: none.`,
    given: { shape, vertices: list },
    find: askLines ? "number of lines of symmetry" : "smallest angle of rotational symmetry",
    answer: ans,
    steps: [
      step("Plot the vertices and identify the figure before counting symmetry lines or rotations.", "Use the coordinates to identify the figure."),
      step(
        askLines
          ? "Fold lines must pair up vertices and sides exactly; count each direction: through opposite vertices and through midpoints of opposite sides."
          : "Rotate the figure about its center; the smallest positive angle that returns it to itself is 360° divided by the order.",
        askLines ? "Line symmetry." : "Rotational symmetry."
      ),
      step(`The answer is ${ans}.`, "Symmetry.", [{ label: "answer", answer: ans }]),
    ],
    svgParams: { kind: "GridFigure", polygons: [{ points: verts }] },
    verify: { kind: "symGrid", shape, ask: askLines ? "lines" : "angle" },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const SYMMETRY_LESSON_POOL: MakerEntry[] = [
  M("SymmetryLinesRegular", 1, (rng) => makeSymmetryLinesRegular(rng)),
  M("SymmetryLinesShape", 1, (rng) => makeSymmetryLinesShape(rng)),
  M("SymmetryRotationRegular", 2, (rng) => makeSymmetryRotationRegular(rng)),
  M("SymmetryRotationShape", 2, (rng) => makeSymmetryRotationShape(rng)),
  M("SymmetryGridFigure", 3, (rng) => makeSymmetryGrid(rng)),
];

export function generateSymmetryProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? SYMMETRY_LESSON_POOL.filter((e) => only.includes(e.subtype)) : SYMMETRY_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

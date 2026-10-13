// AreaFactory.ts
// Topic 13: Area (TEKS G.11(B)).
// Lesson ch13-1: area of parallelograms and triangles, including the classic
// trap (the slanted side is NOT the height) and coordinate-geometry scenarios
// from the registry description. Working backwards (area → missing dimension)
// is tier 2.
// Chapter-test pool: trapezoids, rhombi/kites via diagonals, regular polygons
// via APOTHEM × PERIMETER (A = ½aP), composite figures, shaded regions, and
// areas of similar figures (ratio squared).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, round2, num, pickTriple, sampleFromPool,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

// ── Lesson makers ─────────────────────────────────────────────────────────────

function paraVerts() {
  return [
    { label: "A", x: 40, y: 150 }, { label: "B", x: 70, y: 60 },
    { label: "C", x: 165, y: 60 }, { label: "D", x: 135, y: 150 },
  ];
}

function makeParallelogramArea(rng: RNG): GeometryProblem {
  const b = randInt(rng, 5, 16);
  const h = randInt(rng, 4, 12);
  const slant = h + randInt(rng, 1, 5); // the trap: slanted side ≠ height
  const area = b * h;
  return {
    type: "GEO.13",
    subtype: "ParallelogramArea",
    prompt: `Find the area of a parallelogram with base ${b}, height ${h}, and slanted side ${slant}.`,
    given: { base: b, height: h, slantSide: slant },
    find: "area",
    answer: String(area),
    unit: "square units",
    steps: [
      step("Area of a parallelogram is base times the VERTICAL height: A = b·h.", "Area of a Parallelogram Theorem."),
      step(`Use the height ${h}, not the slanted side ${slant}, the height must be perpendicular to the base.`, "The height is measured perpendicular to the base."),
      step(`A = ${b} × ${h} = ${area}.`, "Substitution.", [{ label: "A", answer: String(area) }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: paraVerts(),
      dashedSegments: [{ x1: 135, y1: 150, x2: 135, y2: 60, label: String(h) }],
      sideLabels: { CD: String(b), BC: String(slant) },
      rightAngles: ["D"],
    },
    verify: { kind: "paraArea", b, h },
  };
}

function makeTriangleArea(rng: RNG): GeometryProblem {
  const b = randInt(rng, 4, 18);
  const h = randInt(rng, 3, 14);
  const area = (b * h) / 2;
  return {
    type: "GEO.13",
    subtype: "TriangleArea",
    prompt: `Find the area of a triangle with base ${b} and height ${h}.`,
    given: { base: b, height: h },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("A triangle is half of a parallelogram with the same base and height: A = ½·b·h.", "Area of a Triangle Theorem."),
      step(`A = ½ × ${b} × ${h} = ${num(area)}.`, "Substitution.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [
        { label: "A", x: 45, y: 150 }, { label: "B", x: 160, y: 150 }, { label: "C", x: 95, y: 55 },
        { label: "D", x: 95, y: 150 },
      ],
      segments: [["A", "B"], ["B", "C"], ["C", "A"]],
      dashed: [["C", "D"]],
      sideLabels: { AB: String(b) },
      rightAngles: ["D"],
      extraLabels: [{ x: 100, y: 105, text: String(h) }],
    },
    verify: { kind: "triArea", b, h },
  };
}

function makeAreaMissingDim(rng: RNG): GeometryProblem {
  const isTri = rng() < 0.5;
  const dim = randInt(rng, 4, 15);
  const other = randInt(rng, 3, 12);
  const area = isTri ? (dim * other) / 2 : dim * other;
  return {
    type: "GEO.13",
    subtype: "AreaMissingDimension",
    prompt: isTri
      ? `A triangle has area ${num(area)} square units and base ${dim}. Find its height.`
      : `A parallelogram has area ${num(area)} square units and base ${dim}. Find its height.`,
    given: { area: num(area), base: dim },
    find: "height",
    answer: num(other),
    steps: [
      step(isTri ? "Use A = ½·b·h and solve for h." : "Use A = b·h and solve for h.", isTri ? "Area of a Triangle Theorem." : "Area of a Parallelogram Theorem."),
      step(
        isTri ? `${num(area)} = ½ × ${dim} × h, so ${num(area)} = ${num(dim / 2)}h.` : `${num(area)} = ${dim} × h.`,
        "Substitution."
      ),
      step(`h = ${num(other)}.`, "Division Property of Equality.", [{ label: "h", answer: num(other) }]),
    ],
    verify: { kind: "areaMissing", area, dim, isTri },
  };
}

function makeCoordinateArea(rng: RNG): GeometryProblem {
  // Right triangle on a grid: legs along horizontal/vertical directions.
  const [la, lb] = [randInt(rng, 3, 7), randInt(rng, 3, 6)];
  const x0 = randInt(rng, -6, -1);
  const y0 = randInt(rng, -4, 0);
  const area = (la * lb) / 2;
  return {
    type: "GEO.13",
    subtype: "CoordinateArea",
    prompt: `Find the area of △ABC with vertices A(${x0}, ${y0}), B(${x0 + la}, ${y0}), and C(${x0}, ${y0 + lb}).`,
    given: { vertices: `A(${x0}, ${y0}), B(${x0 + la}, ${y0}), C(${x0}, ${y0 + lb})` },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("From the coordinates, AB is horizontal with length " + `${la} and AC is vertical with length ${lb}.`, "Distance between points sharing a coordinate."),
      step("AB ⊥ AC, so use them as base and height.", "Perpendicular legs serve as base and height."),
      step(`A = ½ × ${la} × ${lb} = ${num(area)}.`, "Area of a Triangle Theorem.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: [
        { label: "A", x: x0, y: y0 },
        { label: "B", x: x0 + la, y: y0 },
        { label: "C", x: x0, y: y0 + lb },
      ] }],
    },
    verify: { kind: "coordArea", la, lb },
  };
}

function makeRightTriangleArea(rng: RNG): GeometryProblem {
  const [a, b, c] = pickTriple(rng);
  const area = (a * b) / 2;
  return {
    type: "GEO.13",
    subtype: "RightTriangleArea",
    prompt: `A right triangle has legs of length ${a} and ${b} and a hypotenuse of length ${c}. Find its area.`,
    given: { leg1: a, leg2: b, hypotenuse: c },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("In a right triangle the legs are perpendicular, so one leg is the base and the other is the height. The hypotenuse is never the height.", "Base and height must be perpendicular."),
      step(`A = ½ × ${a} × ${b} = ${num(area)}.`, "Area of a Triangle Theorem.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [
        { label: "A", x: 50, y: 150 }, { label: "B", x: 160, y: 150 }, { label: "C", x: 50, y: 55 },
      ],
      segments: [["A", "B"], ["B", "C"], ["C", "A"]],
      sideLabels: { AB: String(b), CA: String(a), BC: String(c) },
      rightAngles: ["A"],
    },
    verify: { kind: "triArea", b: a, h: b },
  };
}

// ── Chapter-test makers ───────────────────────────────────────────────────────

function makeTrapezoidArea(rng: RNG): GeometryProblem {
  const b1 = randInt(rng, 4, 12);
  const b2 = randInt(rng, 5, 15);
  const h = randInt(rng, 3, 10);
  const area = ((b1 + b2) / 2) * h;
  return {
    type: "GEO.13",
    subtype: "TrapezoidArea",
    prompt: `Find the area of a trapezoid with bases ${b1} and ${b2} and height ${h}.`,
    given: { base1: b1, base2: b2, height: h },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("Area of a trapezoid: A = ½·h·(b₁ + b₂), the height times the average of the bases.", "Area of a Trapezoid Theorem."),
      step(`A = ½ × ${h} × (${b1} + ${b2}) = ${num(area)}.`, "Substitution.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: [
        { label: "A", x: 45, y: 150 }, { label: "B", x: 70, y: 65 },
        { label: "C", x: 150, y: 65 }, { label: "D", x: 170, y: 150 },
      ],
      dashedSegments: [{ x1: 70, y1: 65, x2: 70, y2: 150, label: String(h) }],
      sideLabels: { BC: String(b2), AD: String(b1) },
    },
    verify: { kind: "trapArea", b1, b2, h },
  };
}

function makeRhombusKiteArea(rng: RNG): GeometryProblem {
  const d1 = randInt(rng, 3, 12) * 2;
  const d2 = randInt(rng, 3, 10) * 2;
  const shape = rng() < 0.5 ? "rhombus" : "kite";
  const area = (d1 * d2) / 2;
  return {
    type: "GEO.13",
    subtype: "DiagonalArea",
    prompt: `Find the area of a ${shape} whose diagonals have lengths ${d1} and ${d2}.`,
    given: { d1, d2 },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step(`The diagonals of a ${shape} are perpendicular and split it into four right triangles (or two pairs), giving A = ½·d₁·d₂.`, "Area of a Rhombus/Kite Theorem."),
      step(`A = ½ × ${d1} × ${d2} = ${num(area)}.`, "Substitution.", [{ label: "A", answer: num(area) }]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: [
        { label: "A", x: 100, y: 32 }, { label: "B", x: 162, y: 104 },
        { label: "C", x: 100, y: 176 }, { label: "D", x: 38, y: 104 },
      ],
      diagonals: [[0, 2], [1, 3]],
      center: { x: 100, y: 104, label: "" },
    },
    verify: { kind: "diagArea", d1, d2 },
  };
}

function makeRegularPolygonArea(rng: RNG): GeometryProblem {
  const choices = [
    { n: 4, name: "square", s: 10, a: 5 },
    { n: 5, name: "regular pentagon", s: 6, a: 4.13 },
    { n: 6, name: "regular hexagon", s: 5, a: 4.33 },
    { n: 8, name: "regular octagon", s: 4, a: 4.83 },
    { n: 6, name: "regular hexagon", s: 8, a: 6.93 },
    { n: 5, name: "regular pentagon", s: 10, a: 6.88 },
  ] as const;
  const c = pick(rng, choices);
  const perim = c.n * c.s;
  const area = round2(0.5 * c.a * perim);
  return {
    type: "GEO.13",
    subtype: "RegularPolygonArea",
    prompt: `Find the area of a ${c.name} with side length ${c.s} and apothem ${c.a}.`,
    given: { sides: c.n, sideLength: c.s, apothem: c.a },
    find: "area",
    answer: num(area),
    unit: "square units",
    steps: [
      step("Divide the regular polygon into n congruent triangles from the center; each has base = side length and height = apothem.", "Regular polygons decompose into congruent triangles."),
      step(`Perimeter P = n × s = ${c.n} × ${c.s} = ${perim}.`, "Perimeter of a regular polygon."),
      step(`A = ½ × apothem × perimeter = ½ × ${c.a} × ${perim} = ${num(area)}.`, "Area of a Regular Polygon Theorem (A = ½aP).", [
        { label: "A", answer: num(area) },
      ]),
    ],
    svgParams: {
      kind: "PolygonFigure",
      vertices: (() => {
        const pts = [];
        for (let i = 0; i < c.n; i++) {
          const ang = ((-90 + (i * 360) / c.n) * Math.PI) / 180;
          pts.push({ label: String.fromCharCode(65 + i), x: Math.round(100 + 70 * Math.cos(ang)), y: Math.round(104 + 70 * Math.sin(ang)) });
        }
        return pts;
      })(),
      center: { x: 100, y: 104, label: "O" },
      dashedSegments: [{ x1: 100, y1: 104, x2: 100, y2: 174, label: String(c.a) }],
    },
    verify: { kind: "regPolyArea", n: c.n, s: c.s, a: c.a },
  };
}

function makeCompositeArea(rng: RNG): GeometryProblem {
  const form = pick(rng, ["add", "subtract"] as const);
  if (form === "add") {
    const w = randInt(rng, 6, 14);
    const h = randInt(rng, 4, 10);
    const tb = w; // triangle sits on top of the rectangle with the same base
    const th = randInt(rng, 3, 8);
    const total = w * h + (tb * th) / 2;
    return {
      type: "GEO.13", subtype: "CompositeArea",
      prompt: `A figure is made of a rectangle ${w} by ${h} with a triangle of base ${tb} and height ${th} attached along the rectangle's ${w}-unit side. Find the total area.`,
      given: { rect: `${w} by ${h}`, triBase: tb, triHeight: th },
      find: "total area",
      answer: num(total),
      unit: "square units",
      steps: [
        step("Split the composite figure into a rectangle and a triangle, and add the areas.", "Composite figures: add (or subtract) the parts."),
        step(`Rectangle: ${w} × ${h} = ${w * h}. Triangle: ½ × ${tb} × ${th} = ${num((tb * th) / 2)}.`, "Area formulas for the parts."),
        step(`Total = ${w * h} + ${num((tb * th) / 2)} = ${num(total)}.`, "Add the parts.", [{ label: "A", answer: num(total) }]),
      ],
      verify: { kind: "compositeAdd", w, h, tb, th },
    };
  }
  const W = randInt(rng, 10, 16);
  const H = randInt(rng, 8, 14);
  const w = randInt(rng, 3, 6);
  const h = randInt(rng, 3, 6);
  const total = W * H - w * h;
  return {
    type: "GEO.13", subtype: "CompositeArea",
    prompt: `A rectangular garden measures ${W} by ${H}. A rectangular ${w} by ${h} patio is removed from one corner. Find the area that remains.`,
    given: { outer: `${W} by ${H}`, cut: `${w} by ${h}` },
    find: "remaining area",
    answer: num(total),
    unit: "square units",
    steps: [
      step("Find the area of the whole rectangle, then subtract the removed part.", "Composite figures: subtract the cut-out part."),
      step(`Whole: ${W} × ${H} = ${W * H}. Removed: ${w} × ${h} = ${w * h}.`, "Area of a rectangle."),
      step(`Remaining = ${W * H} − ${w * h} = ${total}.`, "Subtraction.", [{ label: "A", answer: String(total) }]),
    ],
    verify: { kind: "compositeSub", W, H, w, h },
  };
}

function makeSimilarAreaRatio(rng: RNG): GeometryProblem {
  const form = pick(rng, ["ratioFromLinear", "areaFromRatio"] as const);
  const a = randInt(rng, 1, 4);
  const b = a + randInt(rng, 1, 4);
  if (form === "ratioFromLinear") {
    return {
      type: "GEO.13", subtype: "SimilarAreaRatio",
      prompt: `Two similar polygons have corresponding side lengths in the ratio ${a}:${b}. What is the ratio of their areas?`,
      given: { linearRatio: `${a}:${b}` },
      find: "area ratio",
      answer: `${a * a}:${b * b}`,
      steps: [
        step("Areas of similar figures scale with the SQUARE of the linear ratio.", "Perimeter and Area Ratios of Similar Figures."),
        step(`(${a}/${b})² = ${a * a}/${b * b}.`, "Square both terms of the ratio.", [
          { label: "ratio", answer: `${a * a}:${b * b}` },
        ]),
      ],
      verify: { kind: "areaRatioLin", a, b },
    };
  }
  // smaller area = unit × a² so the larger area = unit × b² exactly.
  const unit = randInt(rng, 2, 9);
  const smallArea = unit * a * a;
  const bigArea = unit * b * b;
  return {
    type: "GEO.13", subtype: "SimilarAreaRatio",
    prompt: `Two similar triangles have corresponding sides in the ratio ${a}:${b}. The smaller triangle has area ${smallArea} square units. Find the area of the larger triangle.`,
    given: { linearRatio: `${a}:${b}`, smallArea },
    find: "larger area",
    answer: num(bigArea),
    unit: "square units",
    steps: [
      step("The area ratio is the square of the linear ratio.", "Area Ratios of Similar Figures."),
      step(`Area ratio = ${a * a}:${b * b}. Set up the proportion x/${smallArea} = ${b * b}/${a * a}.`, "Proportion from the area ratio.", [
        { label: "ratio", answer: `${a * a}:${b * b}` },
      ]),
      step(`x = ${smallArea} × ${b * b} ÷ ${a * a} = ${bigArea}.`, "Cross-multiply and simplify.", [
        { label: "x", answer: num(bigArea) },
      ]),
    ],
    verify: { kind: "areaFromRatio", a, b, smallArea },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const AREA_LESSON_POOL: MakerEntry[] = [
  M("ParallelogramArea", 1, (rng) => makeParallelogramArea(rng)),
  M("TriangleArea", 1, (rng) => makeTriangleArea(rng)),
  M("AreaMissingDimension", 2, (rng) => makeAreaMissingDim(rng)),
  M("RightTriangleArea", 2, (rng) => makeRightTriangleArea(rng)),
  M("CoordinateArea", 3, (rng) => makeCoordinateArea(rng)),
];

export const AREA_TEST_POOL: MakerEntry[] = [
  M("TrapezoidArea", 1, (rng) => makeTrapezoidArea(rng)),
  M("DiagonalArea", 2, (rng) => makeRhombusKiteArea(rng)),
  M("RegularPolygonArea", 2, (rng) => makeRegularPolygonArea(rng)),
  M("CompositeArea", 2, (rng) => makeCompositeArea(rng)),
  M("SimilarAreaRatio", 3, (rng) => makeSimilarAreaRatio(rng)),
];

export function generateAreaProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? AREA_LESSON_POOL.filter((e) => only.includes(e.subtype)) : AREA_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

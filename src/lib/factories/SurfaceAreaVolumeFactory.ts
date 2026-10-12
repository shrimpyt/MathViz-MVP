// SurfaceAreaVolumeFactory.ts
// Topic 14: Surface Area and Volume (TEKS G.11(C)).
// Lesson ch14-2: surface area of prisms and cylinders. The steps consistently
// decompose the total into LATERAL area + bases — nets thinking — so lateral
// vs total surface area is a distinction students compute, not just name.
// Chapter-test pool adds pyramids, cones, and spheres, all the chapter's
// volumes (prisms/cylinders Bh, pyramids/cones ⅓Bh, sphere 4⁄3πr³), and
// cross sections. π answers: exact form shown in the steps, decimal (2 dp)
// as the final answer, matching MeasurementFactory's convention.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, num, round2, sampleFromPool, pickTriple,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

const PI = Math.PI;
const pi2 = (v: number) => num(round2(v));

// ── Lesson makers: prisms & cylinders surface area ────────────────────────────

function makeRectPrismSA(rng: RNG): GeometryProblem {
  const l = randInt(rng, 3, 12);
  const w = randInt(rng, 3, 10);
  const h = randInt(rng, 2, 9);
  const total = 2 * (l * w + l * h + w * h);
  return {
    type: "GEO.14",
    subtype: "RectPrismSurfaceArea",
    prompt: `Find the total surface area of a rectangular prism with length ${l}, width ${w}, and height ${h}.`,
    given: { l, w, h },
    find: "total surface area",
    answer: String(total),
    unit: "square units",
    steps: [
      step("Unfold the prism into a net: three pairs of congruent rectangular faces.", "Surface area is the total area of the net."),
      step(`Face pairs: lw = ${l}×${w} = ${l * w}, lh = ${l}×${h} = ${l * h}, wh = ${w}×${h} = ${w * h}.`, "Area of each rectangular face."),
      step(`SA = 2(${l * w} + ${l * h} + ${w * h}) = ${total}.`, "Surface Area of a Rectangular Prism.", [
        { label: "SA", answer: String(total) },
      ]),
    ],
    svgParams: { kind: "SolidFigure", solid: "rectPrism", dims: { l: String(l), w: String(w), h: String(h) } },
    verify: { kind: "rectPrismSA", l, w, h },
  };
}

function makeRectPrismLateral(rng: RNG): GeometryProblem {
  const l = randInt(rng, 3, 11);
  const w = randInt(rng, 3, 9);
  const h = randInt(rng, 3, 10);
  const lateral = 2 * (l + w) * h;
  const total = lateral + 2 * l * w;
  return {
    type: "GEO.14",
    subtype: "LateralSurfaceArea",
    prompt: `An open-top box (a rectangular prism with no top) has length ${l}, width ${w}, and height ${h}. How much cardboard is needed to make the box — that is, what is its surface area including the bottom but no top?`,
    given: { l, w, h },
    find: "surface area without a top",
    answer: String(lateral + l * w),
    unit: "square units",
    steps: [
      step("The lateral surface area wraps the sides only: LSA = (perimeter of base) × height. The total surface area would add BOTH bases.", "Lateral vs total surface area."),
      step(`Base perimeter = 2(${l} + ${w}) = ${2 * (l + w)}, so LSA = ${2 * (l + w)} × ${h} = ${lateral}.`, "Lateral Surface Area of a Prism."),
      step(`Add the single bottom (there is no top): ${lateral} + ${l}×${w} = ${lateral} + ${l * w} = ${lateral + l * w}. (A closed box would need ${total}.)`, "Add only the faces that exist.", [
        { label: "SA", answer: String(lateral + l * w) },
      ]),
    ],
    svgParams: { kind: "NetFigure", solid: "rectPrism", edgeLabel: "" },
    verify: { kind: "openBox", l, w, h },
  };
}

function makeTriPrismSA(rng: RNG): GeometryProblem {
  const [t1, t2, t3] = pickTriple(rng); // triangular face sides; t1,t2 legs
  const L = randInt(rng, 4, 12); // prism length
  const triArea = (t1 * t2) / 2;
  const total = 2 * triArea + L * (t1 + t2 + t3);
  return {
    type: "GEO.14",
    subtype: "TriPrismSurfaceArea",
    prompt: `Find the total surface area of a triangular prism whose triangular bases are right triangles with legs ${t1} and ${t2} and hypotenuse ${t3}, and whose length is ${L}.`,
    given: { leg1: t1, leg2: t2, hyp: t3, length: L },
    find: "total surface area",
    answer: num(total),
    unit: "square units",
    steps: [
      step("The surface is two triangular bases plus a lateral 'wrap' of three rectangles (the perimeter of the triangle times the length).", "Surface area = bases + lateral area."),
      step(`Bases: 2 × ½ × ${t1} × ${t2} = ${num(2 * triArea)}.`, "Area of a triangle."),
      step(`Lateral: (${t1} + ${t2} + ${t3}) × ${L} = ${t1 + t2 + t3} × ${L} = ${L * (t1 + t2 + t3)}.`, "Lateral Surface Area of a Prism (base perimeter × length)."),
      step(`SA = ${num(2 * triArea)} + ${L * (t1 + t2 + t3)} = ${num(total)}.`, "Add bases and lateral area.", [
        { label: "SA", answer: num(total) },
      ]),
    ],
    svgParams: { kind: "SolidFigure", solid: "triPrism", dims: { base: String(t1), height: String(t2), length: String(L) } },
    verify: { kind: "triPrismSA", t1, t2, t3, L },
  };
}

function makeCylinderSA(rng: RNG, lateralOnly = false): GeometryProblem {
  const r = randInt(rng, 2, 9);
  const h = randInt(rng, 3, 12);
  const lateral = 2 * PI * r * h;
  const bases = 2 * PI * r * r;
  const total = lateral + bases;
  if (lateralOnly) {
    return {
      type: "GEO.14",
      subtype: "CylinderLateralArea",
      prompt: `Find the lateral surface area of a cylinder with radius ${r} and height ${h}. (The lateral area is the curved surface only — no bases.) Round to two decimal places.`,
      given: { r, h },
      find: "lateral surface area",
      answer: pi2(lateral),
      unit: "square units",
      steps: [
        step("Unrolled, the curved surface is a rectangle whose width is the circumference 2πr and whose height is h.", "Net of a cylinder."),
        step(`LSA = 2πr·h = 2π × ${r} × ${h} = ${pi2(lateral)}.`, "Lateral Surface Area of a Cylinder.", [
          { label: "LSA", answer: pi2(lateral) },
        ]),
      ],
      svgParams: { kind: "SolidFigure", solid: "cylinder", dims: { r: String(r), h: String(h) } },
      verify: { kind: "cylLateral", r, h },
    };
  }
  return {
    type: "GEO.14",
    subtype: "CylinderSurfaceArea",
    prompt: `Find the total surface area of a cylinder with radius ${r} and height ${h}. Round to two decimal places.`,
    given: { r, h },
    find: "total surface area",
    answer: pi2(total),
    unit: "square units",
    steps: [
      step("Total surface area = lateral area + the two circular bases.", "Surface Area of a Cylinder."),
      step(`Lateral area = 2πr·h = 2π × ${r} × ${h} ≈ ${pi2(lateral)}. Bases = 2πr² = 2π × ${r}² ≈ ${pi2(bases)}.`, "Lateral area and area of a circle."),
      step(`SA ≈ ${pi2(lateral)} + ${pi2(bases)} = ${pi2(total)}.`, "Add lateral area and bases.", [
        { label: "SA", answer: pi2(total) },
      ]),
    ],
    svgParams: { kind: "SolidFigure", solid: "cylinder", dims: { r: String(r), h: String(h) } },
    verify: { kind: "cylSA", r, h },
  };
}

function makeNetSA(rng: RNG): GeometryProblem {
  const l = randInt(rng, 3, 9);
  const w = randInt(rng, 2, 8);
  const h = randInt(rng, 2, 7);
  const total = 2 * (l * w + l * h + w * h);
  return {
    type: "GEO.14",
    subtype: "NetSurfaceArea",
    prompt: `The diagram shows the net of a rectangular prism with length ${l}, width ${w}, and height ${h}. Find the surface area of the prism.`,
    given: { l, w, h },
    find: "surface area from the net",
    answer: String(total),
    unit: "square units",
    steps: [
      step("The surface area of a solid is exactly the area of its net — add the areas of all the faces shown.", "Surface area is the area of the net."),
      step(`The net has three pairs of rectangles: ${l}×${w} (twice), ${l}×${h} (twice), ${w}×${h} (twice).`, "Congruent opposite faces."),
      step(`SA = 2(${l * w} + ${l * h} + ${w * h}) = ${total}.`, "Add all six faces.", [{ label: "SA", answer: String(total) }]),
    ],
    svgParams: { kind: "NetFigure", solid: "rectPrism", edgeLabel: "" },
    verify: { kind: "rectPrismSA", l, w, h },
  };
}

// ── Chapter-test makers: other solids, volumes, cross sections ───────────────

function makePyramidSA(rng: RNG): GeometryProblem {
  const s = randInt(rng, 4, 12);
  const slant = randInt(rng, 5, 13);
  const base = s * s;
  const lateral = 0.5 * (4 * s) * slant;
  const total = base + lateral;
  return {
    type: "GEO.14",
    subtype: "PyramidSurfaceArea",
    prompt: `Find the total surface area of a square pyramid with base side ${s} and slant height ${slant}.`,
    given: { baseSide: s, slantHeight: slant },
    find: "total surface area",
    answer: num(total),
    unit: "square units",
    steps: [
      step("Total SA = area of the square base + lateral area. The lateral faces are 4 congruent triangles, totaling ½ × (perimeter of base) × (slant height).", "Surface Area of a Regular Pyramid."),
      step(`Base: ${s}² = ${base}. Lateral: ½ × ${4 * s} × ${slant} = ${num(lateral)}.`, "Base area and lateral area."),
      step(`SA = ${base} + ${num(lateral)} = ${num(total)}.`, "Add base and lateral area.", [{ label: "SA", answer: num(total) }]),
    ],
    svgParams: { kind: "SolidFigure", solid: "pyramid", dims: { base: String(s), slant: String(slant) } },
    verify: { kind: "pyramidSA", s, slant },
  };
}

function makeConeSA(rng: RNG): GeometryProblem {
  const [legA, legB, hyp] = pickTriple(rng);
  const r = legA;
  const slant = hyp;
  const total = PI * r * r + PI * r * slant;
  return {
    type: "GEO.14",
    subtype: "ConeSurfaceArea",
    prompt: `Find the total surface area of a cone with radius ${r} and slant height ${slant}. Round to two decimal places.`,
    given: { r, slant },
    find: "total surface area",
    answer: pi2(total),
    unit: "square units",
    steps: [
      step("Total SA = area of the circular base + lateral area πrℓ, where ℓ is the slant height (not the vertical height).", "Surface Area of a Cone."),
      step(`Base: π × ${r}² ≈ ${pi2(PI * r * r)}. Lateral: π × ${r} × ${slant} ≈ ${pi2(PI * r * slant)}.`, "Area of a circle; lateral area of a cone."),
      step(`SA ≈ ${pi2(total)}.`, "Add base and lateral area.", [{ label: "SA", answer: pi2(total) }]),
    ],
    svgParams: { kind: "SolidFigure", solid: "cone", dims: { r: String(r), slant: String(slant), height: String(legB) } },
    verify: { kind: "coneSA", r, slant },
  };
}

function makeSphereSA(rng: RNG): GeometryProblem {
  const r = randInt(rng, 2, 10);
  const sa = 4 * PI * r * r;
  return {
    type: "GEO.14",
    subtype: "SphereSurfaceArea",
    prompt: `Find the surface area of a sphere with radius ${r}. Round to two decimal places.`,
    given: { r },
    find: "surface area",
    answer: pi2(sa),
    unit: "square units",
    steps: [
      step("SA = 4πr² for a sphere.", "Surface Area of a Sphere."),
      step(`SA = 4π × ${r}² = ${pi2(sa)}.`, "Substitution.", [{ label: "SA", answer: pi2(sa) }]),
    ],
    svgParams: { kind: "SolidFigure", solid: "sphere", dims: { r: String(r) } },
    verify: { kind: "sphereSA", r },
  };
}

function makeVolume(rng: RNG): GeometryProblem {
  const form = pick(rng, ["rectPrism", "cylinder", "pyramid", "cone", "sphere"] as const);
  switch (form) {
    case "rectPrism": {
      const l = randInt(rng, 3, 12), w = randInt(rng, 3, 10), h = randInt(rng, 2, 9);
      const v = l * w * h;
      return {
        type: "GEO.14", subtype: "Volume",
        prompt: `Find the volume of a rectangular prism with length ${l}, width ${w}, and height ${h}.`,
        given: { l, w, h }, find: "volume", answer: String(v), unit: "cubic units",
        steps: [
          step("Volume of a prism is the area of the base times the height: V = B·h.", "Volume of a Prism."),
          step(`V = (${l} × ${w}) × ${h} = ${v}.`, "Substitution.", [{ label: "V", answer: String(v) }]),
        ],
        svgParams: { kind: "SolidFigure", solid: "rectPrism", dims: { l: String(l), w: String(w), h: String(h) } },
        verify: { kind: "volRectPrism", l, w, h },
      };
    }
    case "cylinder": {
      const r = randInt(rng, 2, 8), h = randInt(rng, 3, 12);
      const v = PI * r * r * h;
      return {
        type: "GEO.14", subtype: "Volume",
        prompt: `Find the volume of a cylinder with radius ${r} and height ${h}. Round to two decimal places.`,
        given: { r, h }, find: "volume", answer: pi2(v), unit: "cubic units",
        steps: [
          step("V = πr²h: the base is a circle of area πr².", "Volume of a Cylinder."),
          step(`V = π × ${r}² × ${h} ≈ ${pi2(v)}.`, "Substitution.", [{ label: "V", answer: pi2(v) }]),
        ],
        svgParams: { kind: "SolidFigure", solid: "cylinder", dims: { r: String(r), h: String(h) } },
        verify: { kind: "volCylinder", r, h },
      };
    }
    case "pyramid": {
      const s = randInt(rng, 3, 12), h = randInt(rng, 3, 12);
      const v = (s * s * h) / 3;
      return {
        type: "GEO.14", subtype: "Volume",
        prompt: `Find the volume of a square pyramid with base side ${s} and height ${h}.`,
        given: { baseSide: s, h }, find: "volume", answer: num(v), unit: "cubic units",
        steps: [
          step("A pyramid holds exactly one-third of the prism with the same base and height: V = ⅓·B·h.", "Volume of a Pyramid."),
          step(`V = ⅓ × ${s}² × ${h} = ${num(v)}.`, "Substitution.", [{ label: "V", answer: num(v) }]),
        ],
        svgParams: { kind: "SolidFigure", solid: "pyramid", dims: { base: String(s), height: String(h) } },
        verify: { kind: "volPyramid", s, h },
      };
    }
    case "cone": {
      const r = randInt(rng, 2, 9), h = randInt(rng, 3, 12);
      const v = (PI * r * r * h) / 3;
      return {
        type: "GEO.14", subtype: "Volume",
        prompt: `Find the volume of a cone with radius ${r} and height ${h}. Round to two decimal places.`,
        given: { r, h }, find: "volume", answer: pi2(v), unit: "cubic units",
        steps: [
          step("V = ⅓πr²h — one-third of the matching cylinder.", "Volume of a Cone."),
          step(`V = ⅓ × π × ${r}² × ${h} ≈ ${pi2(v)}.`, "Substitution.", [{ label: "V", answer: pi2(v) }]),
        ],
        svgParams: { kind: "SolidFigure", solid: "cone", dims: { r: String(r), height: String(h) } },
        verify: { kind: "volCone", r, h },
      };
    }
    case "sphere": {
      const r = randInt(rng, 2, 9);
      const v = (4 / 3) * PI * r ** 3;
      return {
        type: "GEO.14", subtype: "Volume",
        prompt: `Find the volume of a sphere with radius ${r}. Round to two decimal places.`,
        given: { r }, find: "volume", answer: pi2(v), unit: "cubic units",
        steps: [
          step("V = (4/3)πr³ for a sphere.", "Volume of a Sphere."),
          step(`V = (4/3) × π × ${r}³ ≈ ${pi2(v)}.`, "Substitution.", [{ label: "V", answer: pi2(v) }]),
        ],
        svgParams: { kind: "SolidFigure", solid: "sphere", dims: { r: String(r) } },
        verify: { kind: "volSphere", r },
      };
    }
  }
}

function makeCrossSection(rng: RNG): GeometryProblem {
  const cases = [
    { q: "A cylinder is sliced by a plane parallel to its bases. What is the shape of the cross section?", answer: "Circle", why: "The cut is parallel to the circular bases, so the slice is congruent to a base." },
    { q: "A cone is sliced by a plane through its apex, perpendicular to the base. What is the shape of the cross section?", answer: "Triangle", why: "The plane passes through the apex and a diameter, cutting two slant edges and the diameter." },
    { q: "A sphere is sliced by any plane. What is the shape of the cross section?", answer: "Circle", why: "Every plane section of a sphere is a circle." },
    { q: "A rectangular prism is sliced by a plane parallel to its front face. What is the shape of the cross section?", answer: "Rectangle", why: "The cut is parallel to a rectangular face, so it is a congruent rectangle." },
  ] as const;
  const c = pick(rng, cases);
  return {
    type: "GEO.14",
    subtype: "CrossSection",
    prompt: c.q,
    given: { slice: "plane section" },
    find: "the cross-section shape",
    answer: c.answer,
    steps: [
      step("A cross section is the two-dimensional shape where a plane intersects a solid.", "Definition of cross section."),
      step(c.why, "Visualize the slicing plane."),
      step(`The cross section is a ${c.answer.toLowerCase()}.`, "Cross section.", [{ label: "shape", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const SURFACE_AREA_LESSON_POOL: MakerEntry[] = [
  M("RectPrismSurfaceArea", 1, (rng) => makeRectPrismSA(rng)),
  M("CylinderSurfaceArea", 1, (rng) => makeCylinderSA(rng, false)),
  M("CylinderLateralArea", 2, (rng) => makeCylinderSA(rng, true)),
  M("TriPrismSurfaceArea", 2, (rng) => makeTriPrismSA(rng)),
  M("LateralSurfaceArea", 2, (rng) => makeRectPrismLateral(rng)),
  M("NetSurfaceArea", 3, (rng) => makeNetSA(rng)),
];

export const VOLUME_TEST_POOL: MakerEntry[] = [
  M("Volume", 1, (rng) => makeVolume(rng)),
  M("PyramidSurfaceArea", 2, (rng) => makePyramidSA(rng)),
  M("ConeSurfaceArea", 2, (rng) => makeConeSA(rng)),
  M("SphereSurfaceArea", 2, (rng) => makeSphereSA(rng)),
  M("CrossSection", 3, (rng) => makeCrossSection(rng)),
];

export function generateSurfaceAreaProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? SURFACE_AREA_LESSON_POOL.filter((e) => only.includes(e.subtype)) : SURFACE_AREA_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

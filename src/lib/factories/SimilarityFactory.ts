// SimilarityFactory.ts
// Topic 9: Similarity (TEKS G.7(A), G.7(B)) — chapter-test pool (Topic 9 has
// no separate placeholder lesson). Weighted toward the chapter's core:
// proportions in similar figures, AA/SAS/SSS similarity used computationally,
// the Triangle Proportionality Theorem, geometric mean in right triangles,
// and dilations. Includes the classic indirect-measurement (shadow) problem.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, pt, type MakerEntry,
} from "./GeometryHelpers";

function makeSolveProportion(rng: RNG): GeometryProblem {
  // p/q = r/x with integer x
  const x = randInt(rng, 3, 15);
  const q = randInt(rng, 2, 9);
  const r = randInt(rng, 2, 9);
  const pTimesX = q * r;
  // choose p dividing q*r
  const divisors = [];
  for (let d = 1; d <= pTimesX; d++) if (pTimesX % d === 0 && d >= 2 && d <= 12) divisors.push(d);
  const p = divisors.length > 0 ? pick(rng, divisors) : 2;
  const xx = (q * r) / p;
  return {
    type: "GEO.9",
    subtype: "SolveProportion",
    prompt: `Solve the proportion: ${p}/${q} = ${r}/x. Find x.`,
    given: { proportion: `${p}/${q} = ${r}/x` },
    find: "x",
    answer: String(xx),
    steps: [
      step("In a proportion, the cross products are equal.", "Means-Extremes Property of Proportions."),
      step(`${p} · x = ${q} · ${r} = ${q * r}.`, "Cross-multiply.", [{ label: "equation", answer: `${p}x = ${q * r}` }]),
      step(`x = ${q * r} ÷ ${p} = ${xx}.`, "Division Property of Equality.", [{ label: "x", answer: String(xx) }]),
    ],
    verify: { kind: "proportion", p, q, r },
  };
}

function makeSimilarSide(rng: RNG): GeometryProblem {
  const k = pick(rng, [2, 3]);
  const small = randInt(rng, 3, 12);
  const big = small * k;
  // Two pairs known: small side s1 ↔ big side s1*k; small side s2 ↔ ?
  const s2 = randInt(rng, 3, 12);
  const answer = s2 * k;
  const findBig = rng() < 0.6;
  const target = findBig ? answer : s2 * k;
  return {
    type: "GEO.9",
    subtype: "SimilarFigureSide",
    prompt: findBig
      ? `△ABC ~ △DEF. AB = ${small}, DE = ${big}, and BC = ${s2}. Find EF.`
      : `△ABC ~ △DEF. DE = ${s2} corresponds to AB, and the scale factor from DEF to ABC is ${k} (each side of ABC is ${k} times the corresponding side of DEF). Find AB.`,
    given: { scaleFactor: k },
    find: findBig ? "EF" : "AB",
    answer: String(target),
    steps: [
      step("Corresponding sides of similar figures are proportional, with the scale factor.", "Definition of similar figures."),
      step(
        findBig
          ? `The scale factor from ABC to DEF is ${big} ÷ ${small} = ${k}, so EF = ${k} × BC = ${k} × ${s2}.`
          : `AB corresponds to DE, so AB = ${k} × DE = ${k} × ${s2}.`,
        "Apply the scale factor to the corresponding side."
      ),
      step(`The missing side is ${target}.`, "Multiplication.", [
        { label: "side", answer: String(target) },
      ]),
    ],
    verify: { kind: "similarSide", k, s2, findBig },
  };
}

function makeTriangleProportionality(rng: RNG): GeometryProblem {
  // DE ∥ BC in △ABC: AD/DB = AE/EC. Use a 2-part ratio p:q with scale t.
  const p = randInt(rng, 1, 4);
  const q = randInt(rng, 1, 4);
  const t = randInt(rng, 2, 4);
  const AD = p * t, DB = q * t;
  const AE = p * randInt(rng, 2, 4);
  const EC = (AE / p) * q;
  const askEC = rng() < 0.5;
  return {
    type: "GEO.9",
    subtype: "TriangleProportionality",
    prompt: askEC
      ? `In △ABC, DE ∥ BC with D on AB and E on AC. AD = ${AD}, DB = ${DB}, and AE = ${AE}. Find EC.`
      : `In △ABC, DE ∥ BC with D on AB and E on AC. AD = ${AD}, DB = ${DB}, and EC = ${EC}. Find AE.`,
    given: { AD, DB, known: askEC ? AE : EC },
    find: askEC ? "EC" : "AE",
    answer: String(askEC ? EC : AE),
    steps: [
      step("A line parallel to one side of a triangle divides the other two sides proportionally.", "Triangle Proportionality Theorem."),
      step(`AD/DB = ${askEC ? "AE/EC" : "AE/EC"}: ${AD}/${DB} = ${askEC ? `${AE}/EC` : `AE/${EC}`}.`, "Set up the proportion.", [
        { label: "proportion", answer: `${AD}/${DB}` },
      ]),
      step(`Solve by cross-multiplying: the missing length is ${askEC ? EC : AE}.`, "Means-Extremes Property of Proportions.", [
        { label: "answer", answer: String(askEC ? EC : AE) },
      ]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [
        { label: "A", x: 100, y: 28 }, { label: "B", x: 38, y: 152 }, { label: "C", x: 168, y: 152 },
        { label: "D", x: 69, y: 90 }, { label: "E", x: 134, y: 90 },
      ],
      segments: [["A", "B"], ["B", "C"], ["C", "A"], ["D", "E"]],
      parallelMarks: ["DE", "BC"],
      sideLabels: { AD: String(AD), DB: String(DB) },
    },
    verify: { kind: "triProp", AD, DB, AE, EC, askEC },
  };
}

function makeGeometricMean(rng: RNG): GeometryProblem {
  const pairs: [number, number][] = [[4, 9], [2, 8], [3, 12], [9, 16], [5, 20], [4, 25], [8, 18], [6, 24]];
  const [p, q] = pick(rng, pairs);
  const h = Math.round(Math.sqrt(p * q));
  return {
    type: "GEO.9",
    subtype: "GeometricMeanAltitude",
    prompt: `The altitude to the hypotenuse of a right triangle divides the hypotenuse into segments of length ${p} and ${q}. Find the length of the altitude.`,
    given: { segment1: p, segment2: q },
    find: "altitude length",
    answer: String(h),
    steps: [
      step("The altitude to the hypotenuse is the geometric mean of the two segments of the hypotenuse.", "Right Triangle Similarity Theorem (geometric mean)."),
      step(`h² = ${p} × ${q} = ${p * q}.`, "Set the proportion segment/h = h/segment.", [
        { label: "h²", answer: String(p * q) },
      ]),
      step(`h = √${p * q} = ${h}.`, "Take the positive square root.", [{ label: "h", answer: String(h) }]),
    ],
    svgParams: {
      kind: "TriangleFigure",
      points: [
        { label: "A", x: 40, y: 140 }, { label: "B", x: 105, y: 45 }, { label: "C", x: 175, y: 140 },
        { label: "D", x: 105, y: 140 },
      ],
      segments: [["A", "B"], ["B", "C"], ["C", "A"], ["B", "D"]],
      dashed: [],
      rightAngles: ["B", "D"],
      sideLabels: { AD: String(p), DC: String(q), BD: "h" },
    },
    verify: { kind: "geoMean", p, q },
  };
}

function makeDilation(rng: RNG): GeometryProblem {
  const form = pick(rng, ["int", "half", "findK"] as const);
  if (form === "findK") {
    const k = pick(rng, [2, 3, 4]);
    const x = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]); // nonzero so the ratio is checkable
    const y = randInt(rng, -4, 4);
    return {
      type: "GEO.9", subtype: "DilationScaleFactor",
      prompt: `A dilation with center at the origin maps P${pt(x, y)} to P′${pt(k * x, k * y)}. What is the scale factor of the dilation, and is it an enlargement or a reduction?`,
      given: { preimage: pt(x, y), image: pt(k * x, k * y) },
      find: "scale factor",
      answer: `${k} (enlargement)`,
      steps: [
        step("The scale factor is the ratio image coordinate ÷ preimage coordinate.", "Definition of dilation scale factor."),
        step(`k = ${k * x} ÷ ${x} = ${k} (the y-coordinates give the same ratio).`, "Divide corresponding coordinates.", [
          { label: "k", answer: String(k) },
        ]),
        step("k > 1, so the dilation is an enlargement.", "Enlargement when k > 1; reduction when 0 < k < 1."),
      ],
      verify: { kind: "dilationK", k },
    };
  }
  const k = form === "int" ? pick(rng, [2, 3]) : 0.5;
  // Small preimage coords so even a k=3 image stays on the −8..8 grid.
  const tri = [
    { label: "A", x: randInt(rng, -2, 0), y: randInt(rng, 1, 2) },
    { label: "B", x: randInt(rng, 1, 2), y: randInt(rng, 0, 2) },
    { label: "C", x: randInt(rng, 0, 2), y: randInt(rng, 1, 2) },
  ];
  if (form === "half") {
    for (const p of tri) { p.x *= 2; p.y *= 2; } // keep halves integral
  }
  const img = tri.map((p) => ({ label: p.label + "′", x: p.x * k, y: p.y * k }));
  const answer = img.map((p) => `${p.label}${pt(p.x, p.y)}`).join(", ");
  return {
    type: "GEO.9",
    subtype: "DilationImage",
    prompt: `Dilate △ABC with vertices ${tri.map((p) => `${p.label}${pt(p.x, p.y)}`).join(", ")} by a scale factor of ${form === "int" ? k : "1/2"} with center at the origin. Give the image vertices.`,
    given: { scaleFactor: form === "int" ? k : "1/2" },
    find: "image vertices",
    answer,
    steps: [
      step(`Multiply both coordinates of every vertex by the scale factor ${form === "int" ? k : "1/2"}.`, "Dilation with center at the origin: (x, y) → (kx, ky)."),
      step(`Image vertices: ${answer}.`, "Apply the rule to each vertex.", [{ label: "image", answer }]),
      step(form === "int" ? "k > 1, so this is an enlargement." : "0 < k < 1, so this is a reduction.", "Enlargement vs reduction."),
    ],
    svgParams: { kind: "GridFigure", polygons: [{ points: tri }, { points: img, dashed: true }] },
    verify: { kind: "dilationImg", pts: tri.map((p) => [p.x, p.y]).flat(), kNum: form === "int" ? k : 1, kDen: form === "int" ? 1 : 2 },
  };
}

function makeShadowProblem(rng: RNG): GeometryProblem {
  const personH = pick(rng, [5, 5.5, 6]);
  const personShadow = pick(rng, [3, 4, 6, 8]);
  const treeShadow = personShadow * randInt(rng, 3, 6);
  const treeH = (personH * treeShadow) / personShadow;
  return {
    type: "GEO.9",
    subtype: "IndirectMeasurement",
    prompt: `A person who is ${personH} ft tall casts a shadow ${personShadow} ft long. At the same time, a tree casts a shadow ${treeShadow} ft long. How tall is the tree?`,
    given: { personHeight: personH, personShadow, treeShadow },
    find: "tree height",
    answer: `${treeH} ft`,
    steps: [
      step("The person and the tree form similar right triangles with their shadows (same sun angle).", "AA Similarity (the sun's rays make congruent angles)."),
      step(`Set up the proportion: height/shadow = height/shadow → h/${treeShadow} = ${personH}/${personShadow}.`, "Corresponding sides of similar triangles are proportional.", [
        { label: "proportion", answer: `h/${treeShadow} = ${personH}/${personShadow}` },
      ]),
      step(`h = ${personH} × ${treeShadow} ÷ ${personShadow} = ${treeH} ft.`, "Cross-multiply and divide.", [
        { label: "h", answer: String(treeH) },
      ]),
    ],
    verify: { kind: "shadow", personH, personShadow, treeShadow },
  };
}

function makeSimilarityStatement(rng: RNG): GeometryProblem {
  const cases = [
    {
      q: "Two triangles have two pairs of congruent angles. Which theorem proves the triangles similar?",
      answer: "AA Similarity Theorem",
      why: "Two pairs of congruent angles are enough — the third pair is forced by the angle sum.",
    },
    {
      q: "Two triangles have two pairs of proportional sides with the included angles congruent. Which theorem proves the triangles similar?",
      answer: "SAS Similarity Theorem",
      why: "Proportional sides about a congruent included angle mirror the SAS congruence pattern.",
    },
    {
      q: "All three pairs of corresponding sides of two triangles are proportional. Which theorem proves the triangles similar?",
      answer: "SSS Similarity Theorem",
      why: "Proportionality of all three side pairs forces the angles to match.",
    },
  ] as const;
  const c = pick(rng, cases);
  return {
    type: "GEO.9",
    subtype: "SimilarityTheoremId",
    prompt: c.q,
    given: { scenario: "similarity" },
    find: "the similarity theorem",
    answer: c.answer,
    steps: [
      step("Match the given information to the similarity criteria: AA (angles), SAS~ (sides around an angle), SSS~ (all sides).", "Triangle similarity theorems."),
      step(c.why, "Apply the matching criterion."),
      step(`The theorem is the ${c.answer}.`, "Similarity theorem.", [{ label: "theorem", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

export const SIMILARITY_TEST_POOL: MakerEntry[] = [
  M("SolveProportion", 1, (rng) => makeSolveProportion(rng)),
  M("SimilarFigureSide", 1, (rng) => makeSimilarSide(rng)),
  M("SimilarityTheoremId", 1, (rng) => makeSimilarityStatement(rng)),
  M("TriangleProportionality", 2, (rng) => makeTriangleProportionality(rng)),
  M("DilationImage", 2, (rng) => makeDilation(rng)),
  M("DilationScaleFactor", 2, (rng) => makeDilation(rng)),
  M("IndirectMeasurement", 2, (rng) => makeShadowProblem(rng)),
  M("GeometricMeanAltitude", 3, (rng) => makeGeometricMean(rng)),
];

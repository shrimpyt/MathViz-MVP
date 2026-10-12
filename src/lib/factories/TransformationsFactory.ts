// TransformationsFactory.ts
// Topic 8: Transformational Geometry (TEKS G.3(A), G.3(B), G.3(C)).
//
// Lesson ch8-1: translations on the coordinate plane, always in proper
// mapping notation (x, y) → (x + a, y + b) AND as vectors ⟨a, b⟩ — the two
// descriptions are kept side by side so students connect them.
// Chapter-test pool: reflections (coordinate rules), rotations about the
// origin, line/rotational symmetry, compositions of rigid motions, and
// identifying rigid motions vs dilations.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem, GeoPt } from "./GeometryTypes";
import {
  M, step, pt, ruleStr, sampleFromPool,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

// ── Lesson makers: translations ───────────────────────────────────────────────

function randShift(rng: RNG): [number, number] {
  let a = 0, b = 0;
  do {
    a = randInt(rng, -6, 6);
    b = randInt(rng, -5, 5);
  } while (a === 0 && b === 0);
  return [a, b];
}

function wordsFor(a: number, b: number): string {
  const parts: string[] = [];
  if (a !== 0) parts.push(`${Math.abs(a)} units ${a > 0 ? "right" : "left"}`);
  if (b !== 0) parts.push(`${Math.abs(b)} units ${b > 0 ? "up" : "down"}`);
  return parts.join(" and ");
}

function makeTranslatePoint(rng: RNG): GeometryProblem {
  const x = randInt(rng, -4, 4);
  const y = randInt(rng, -4, 4);
  let a = 0, b = 0;
  do {
    a = randInt(rng, -4, 4);
    b = randInt(rng, -4, 4);
  } while (a === 0 && b === 0);
  const nx = x + a, ny = y + b;
  return {
    type: "GEO.8",
    subtype: "TranslatePoint",
    prompt: `Translate the point ${pt(x, y)} using the rule ${ruleStr(a, b)}. Give the coordinates of the image.`,
    given: { point: pt(x, y), rule: ruleStr(a, b) },
    find: "image point",
    answer: pt(nx, ny),
    steps: [
      step(`The rule ${ruleStr(a, b)} moves every point ${wordsFor(a, b)} (vector ⟨${a}, ${b}⟩).`, "Translation in mapping notation."),
      step(`Add the changes: (${x} + ${a}, ${y} + ${b}).`, "Apply the mapping to each coordinate."),
      step(`The image is ${pt(nx, ny)}.`, "Translation.", [{ label: "image", answer: pt(nx, ny) }]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "P", x, y },
        { label: "P′", x: nx, y: ny },
      ],
      lines: [{ x1: x, y1: y, x2: nx, y2: ny, dashed: true }],
    },
    verify: { kind: "translate", x, y, a, b },
  };
}

function randTriangle(rng: RNG): GeoPt[] {
  const x = randInt(rng, -6, 0);
  const y = randInt(rng, -4, 1);
  return [
    { label: "A", x, y: y + randInt(rng, 2, 4) },
    { label: "B", x: x + randInt(rng, 2, 4), y },
    { label: "C", x: x + randInt(rng, 3, 5), y: y + randInt(rng, 2, 4) },
  ];
}

function makeTranslateFigure(rng: RNG): GeometryProblem {
  const tri = randTriangle(rng);
  // Bound the shift so the image stays on the −8..8 grid.
  const minX = Math.min(...tri.map((p) => p.x));
  const maxX = Math.max(...tri.map((p) => p.x));
  const minY = Math.min(...tri.map((p) => p.y));
  const maxY = Math.max(...tri.map((p) => p.y));
  let a = 0, b = 0;
  do {
    a = randInt(rng, Math.max(-6, -8 - minX), Math.min(6, 8 - maxX));
    b = randInt(rng, Math.max(-5, -8 - minY), Math.min(5, 8 - maxY));
  } while (a === 0 && b === 0);
  const img = tri.map((p) => ({ label: p.label + "′", x: p.x + a, y: p.y + b }));
  const answer = img.map((p) => `${p.label}${pt(p.x, p.y)}`).join(", ");
  return {
    type: "GEO.8",
    subtype: "TranslateFigure",
    prompt: `△ABC has vertices ${tri.map((p) => `${p.label}${pt(p.x, p.y)}`).join(", ")}. Translate the triangle by the vector ⟨${a}, ${b}⟩. Give the vertices of the image △A′B′C′.`,
    given: { vertices: tri.map((p) => pt(p.x, p.y)).join(" "), vector: `⟨${a}, ${b}⟩` },
    find: "image vertices",
    answer,
    steps: [
      step(`The vector ⟨${a}, ${b}⟩ gives the rule ${ruleStr(a, b)}: ${wordsFor(a, b)}.`, "Translation vector ↔ mapping notation."),
      step("Apply the rule to every vertex — a translation moves all points by the same vector.", "Translations are rigid motions (isometries)."),
      step(`Image vertices: ${answer}.`, "Apply the mapping.", [{ label: "image", answer }]),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [
        { points: tri },
        { points: img, dashed: true },
      ],
    },
    verify: { kind: "translateFigure", pts: tri.map((p) => [p.x, p.y]).flat(), a, b },
  };
}

function makeFindRule(rng: RNG): GeometryProblem {
  const x = randInt(rng, -5, 5);
  const y = randInt(rng, -5, 5);
  const [a, b] = randShift(rng);
  return {
    type: "GEO.8",
    subtype: "TranslationRule",
    prompt: `A translation maps P${pt(x, y)} to P′${pt(x + a, y + b)}. Write the translation rule in mapping notation and give the translation vector.`,
    given: { preimage: pt(x, y), image: pt(x + a, y + b) },
    find: "the translation rule",
    answer: `${ruleStr(a, b)}; vector ⟨${a}, ${b}⟩`,
    steps: [
      step("Compare coordinates: the change in x and the change in y are the components of the translation.", "A translation is determined by one point and its image."),
      step(`Δx = ${x + a} − ${x} = ${a}; Δy = ${y + b} − ${y} = ${b}.`, "Subtract preimage coordinates from image coordinates."),
      step(`Rule: ${ruleStr(a, b)}; vector ⟨${a}, ${b}⟩.`, "Mapping notation.", [{ label: "rule", answer: ruleStr(a, b) }]),
    ],
    verify: { kind: "findRule", x, y, a, b },
  };
}

function makeFindPreimage(rng: RNG): GeometryProblem {
  const x = randInt(rng, -5, 5);
  const y = randInt(rng, -5, 5);
  const [a, b] = randShift(rng);
  const ix = x - a, iy = y - b; // preimage such that image = (x, y)
  return {
    type: "GEO.8",
    subtype: "FindPreimage",
    prompt: `Under the translation ${ruleStr(a, b)}, the image of a point is ${pt(x, y)}. Find the preimage point.`,
    given: { image: pt(x, y), rule: ruleStr(a, b) },
    find: "preimage point",
    answer: pt(ix, iy),
    steps: [
      step("Work backwards: undo the translation by applying the opposite shift.", "Inverse of a translation."),
      step(`Preimage x: ${x} − ${a} = ${ix}; preimage y: ${y} − ${b} = ${iy}.`, "Subtract the translation components."),
      step(`The preimage is ${pt(ix, iy)}. Check: ${ruleStr(a, b)} sends it to ${pt(x, y)}. ✓`, "Verify with the mapping.", [
        { label: "preimage", answer: pt(ix, iy) },
      ]),
    ],
    verify: { kind: "preimage", x, y, a, b },
  };
}

// ── Chapter-test makers ───────────────────────────────────────────────────────

type ReflectKind = "xAxis" | "yAxis" | "yEqX" | "xEqK" | "yEqK";
function reflectPoint(kind: ReflectKind, x: number, y: number, k: number): [number, number] {
  switch (kind) {
    case "xAxis": return [x, -y];
    case "yAxis": return [-x, y];
    case "yEqX": return [y, x];
    case "xEqK": return [2 * k - x, y];
    case "yEqK": return [x, 2 * k - y];
  }
}
const REFLECT_NAMES: Record<ReflectKind, string> = {
  xAxis: "the x-axis",
  yAxis: "the y-axis",
  yEqX: "the line y = x",
  xEqK: "vertical line",
  yEqK: "horizontal line",
};

function makeReflectionImage(rng: RNG): GeometryProblem {
  const kind = pick(rng, ["xAxis", "yAxis", "yEqX", "xEqK", "yEqK"] as ReflectKind[]);
  const k = randInt(rng, -2, 2);
  const x = randInt(rng, -4, 4);
  const y = randInt(rng, -4, 4);
  const [nx, ny] = reflectPoint(kind, x, y, k);
  const lineName = kind === "xEqK" ? `the line x = ${k}` : kind === "yEqK" ? `the line y = ${k}` : REFLECT_NAMES[kind];
  const ruleText =
    kind === "xAxis" ? "(x, y) → (x, −y)"
    : kind === "yAxis" ? "(x, y) → (−x, y)"
    : kind === "yEqX" ? "(x, y) → (y, x)"
    : kind === "xEqK" ? `(x, y) → (${2 * k} − x, y)`
    : `(x, y) → (x, ${2 * k} − y)`;
  return {
    type: "GEO.8",
    subtype: "ReflectionImage",
    prompt: `Reflect the point ${pt(x, y)} over ${lineName}. Give the coordinates of the image.`,
    given: { point: pt(x, y), mirror: lineName },
    find: "image point",
    answer: pt(nx, ny),
    steps: [
      step(`The coordinate rule for reflection over ${lineName} is ${ruleText}.`, "Coordinate rules for reflections."),
      step(`Apply the rule to ${pt(x, y)}.`, "Substitution."),
      step(`The image is ${pt(nx, ny)}.`, "Reflection.", [{ label: "image", answer: pt(nx, ny) }]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "P", x, y },
        { label: "P′", x: nx, y: ny },
      ],
    },
    verify: { kind: "reflect", rk: kind, x, y, k },
  };
}

function makeRotationImage(rng: RNG): GeometryProblem {
  const rot = pick(rng, [90, 180, 270] as const); // degrees counterclockwise about origin
  const x = randInt(rng, -6, 6);
  const y = randInt(rng, -6, 6);
  const [nx, ny] = rot === 90 ? [-y, x] : rot === 180 ? [-x, -y] : [y, -x];
  const rule = rot === 90 ? "(x, y) → (−y, x)" : rot === 180 ? "(x, y) → (−x, −y)" : "(x, y) → (y, −x)";
  return {
    type: "GEO.8",
    subtype: "RotationImage",
    prompt: `Rotate the point ${pt(x, y)} ${rot}° counterclockwise about the origin. Give the coordinates of the image.`,
    given: { point: pt(x, y), rotation: `${rot}° CCW about origin` },
    find: "image point",
    answer: pt(nx, ny),
    steps: [
      step(`For a ${rot}° counterclockwise rotation about the origin, the rule is ${rule}.`, "Coordinate rules for rotations about the origin."),
      step(`Apply the rule to ${pt(x, y)}.`, "Substitution."),
      step(`The image is ${pt(nx, ny)}.`, "Rotation.", [{ label: "image", answer: pt(nx, ny) }]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "P", x, y },
        { label: "P′", x: nx, y: ny },
      ],
    },
    verify: { kind: "rotate", rot, x, y },
  };
}

function makeSymmetry(rng: RNG): GeometryProblem {
  const form = pick(rng, ["lines", "rotational", "letter"] as const);
  if (form === "lines") {
    const n = pick(rng, [3, 4, 5, 6, 8, 10]);
    const names: Record<number, string> = { 3: "equilateral triangle", 4: "square", 5: "regular pentagon", 6: "regular hexagon", 8: "regular octagon", 10: "regular decagon" };
    return {
      type: "GEO.8", subtype: "Symmetry",
      prompt: `How many lines of symmetry does a ${names[n]} have?`,
      given: { figure: names[n] },
      find: "number of lines of symmetry",
      answer: String(n),
      steps: [
        step("A regular n-gon has a line of symmetry through each vertex and each side midpoint pairing.", "Line symmetry of regular polygons."),
        step(`A regular ${n}-gon has exactly ${n} lines of symmetry.`, "n lines for a regular n-gon.", [{ label: "lines", answer: String(n) }]),
      ],
      verify: { kind: "symLines", n },
    };
  }
  if (form === "rotational") {
    const n = pick(rng, [3, 4, 5, 6, 8, 9, 10, 12]);
    const angle = 360 / n;
    return {
      type: "GEO.8", subtype: "Symmetry",
      prompt: `What is the smallest angle of rotation that maps a regular ${n}-gon onto itself?`,
      given: { sides: n },
      find: "angle of rotational symmetry",
      answer: `${angle}°`,
      steps: [
        step("A regular n-gon maps onto itself by rotations that are multiples of 360° ÷ n.", "Rotational symmetry."),
        step(`360° ÷ ${n} = ${angle}°.`, "Division.", [{ label: "angle", answer: `${angle}°` }]),
      ],
      verify: { kind: "symRot", n },
    };
  }
  const letters: Record<string, number> = { A: 1, B: 1, E: 1, H: 2, M: 1, T: 1, W: 1, X: 2, Y: 1 };
  const letter = pick(rng, Object.keys(letters));
  return {
    type: "GEO.8", subtype: "Symmetry",
    prompt: `How many lines of symmetry does the capital letter ${letter} have? (Block lettering.)`,
    given: { letter },
    find: "number of lines of symmetry",
    answer: String(letters[letter]),
    steps: [
      step("A line of symmetry divides a figure into two mirror-image halves.", "Definition of line symmetry."),
      step(`Folding the letter ${letter} along its symmetry line(s) makes the halves coincide.`, "Test candidate fold lines."),
      step(`The letter ${letter} has ${letters[letter]} line(s) of symmetry.`, "Line symmetry.", [{ label: "lines", answer: String(letters[letter]) }]),
    ],
    verify: { kind: "oneOf", options: [String(letters[letter])] },
  };
}

function makeComposition(rng: RNG): GeometryProblem {
  const x = randInt(rng, -5, 5);
  const y = randInt(rng, -5, 5);
  const [a, b] = randShift(rng);
  const mirror = pick(rng, ["xAxis", "yAxis"] as const);
  const tx = x + a, ty = y + b;
  const [fx, fy] = mirror === "xAxis" ? [tx, -ty] : [-tx, ty];
  return {
    type: "GEO.8",
    subtype: "CompositionTransform",
    prompt: `Apply the composition to P${pt(x, y)}: first translate by ${ruleStr(a, b)}, then reflect over the ${mirror === "xAxis" ? "x-axis" : "y-axis"}. Give the final image coordinates.`,
    given: { point: pt(x, y), steps: `translate then reflect over ${mirror}` },
    find: "final image",
    answer: pt(fx, fy),
    steps: [
      step(`Translate first: ${pt(x, y)} → ${pt(tx, ty)}.`, "Apply the first transformation in the composition."),
      step(`Then reflect over the ${mirror === "xAxis" ? "x-axis" : "y-axis"}: ${mirror === "xAxis" ? "(x, y) → (x, −y)" : "(x, y) → (−x, y)"}.`, "Coordinate rule for the reflection."),
      step(`Final image: ${pt(fx, fy)}. A composition of rigid motions is a rigid motion.`, "Composition of isometries.", [
        { label: "image", answer: pt(fx, fy) },
      ]),
    ],
    verify: { kind: "compose", x, y, a, b, mirror },
  };
}

function makeRigidMotionIdentify(rng: RNG): GeometryProblem {
  const cases = [
    { q: "Which of these transformations is NOT a rigid motion: translation, reflection, rotation, or dilation with scale factor 2?", answer: "Dilation with scale factor 2", why: "A dilation changes size, so distances are not preserved." },
    { q: "A transformation maps △ABC to △A′B′C′ with AB = A′B′, BC = B′C′, and CA = C′A′. Must the transformation be a rigid motion?", answer: "Yes", why: "All distances (and therefore angles) are preserved, which is the definition of a rigid motion (isometry)." },
    { q: "Which transformation always produces an image congruent to the preimage: a dilation with scale factor ½, or a glide reflection?", answer: "Glide reflection", why: "A glide reflection (translation + reflection) is a rigid motion; a dilation changes size." },
  ] as const;
  const c = pick(rng, cases);
  return {
    type: "GEO.8",
    subtype: "RigidMotionIdentify",
    prompt: c.q,
    given: { question: "rigid motions" },
    find: "the correct choice",
    answer: c.answer,
    steps: [
      step("A rigid motion (isometry) preserves distances and angle measures, so the image is congruent to the preimage.", "Definition of rigid motion."),
      step(c.why, "Apply the definition."),
      step(`Answer: ${c.answer}.`, "Rigid motion.", [{ label: "answer", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const TRANSLATION_LESSON_POOL: MakerEntry[] = [
  M("TranslatePoint", 1, (rng) => makeTranslatePoint(rng)),
  M("TranslateFigure", 1, (rng) => makeTranslateFigure(rng)),
  M("TranslationRule", 2, (rng) => makeFindRule(rng)),
  M("FindPreimage", 3, (rng) => makeFindPreimage(rng)),
];

export const TRANSFORMATIONS_TEST_POOL: MakerEntry[] = [
  M("ReflectionImage", 1, (rng) => makeReflectionImage(rng)),
  M("RotationImage", 2, (rng) => makeRotationImage(rng)),
  M("Symmetry", 2, (rng) => makeSymmetry(rng)),
  M("CompositionTransform", 3, (rng) => makeComposition(rng)),
  M("RigidMotionIdentify", 3, (rng) => makeRigidMotionIdentify(rng)),
];

export function generateTranslationProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? TRANSLATION_LESSON_POOL.filter((e) => only.includes(e.subtype)) : TRANSLATION_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

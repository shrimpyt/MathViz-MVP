// RigidMotionsFactory.ts
// Lesson ch8-3: Congruence Through Rigid Motions (TEKS G.6(C)).
// The definition of congruence used here: two figures are congruent
// exactly when a sequence of rigid motions (translations, reflections,
// rotations) maps one onto the other. D1 applies one described motion to
// a vertex of a coordinate triangle. D2 names the single reflection or
// rotation that maps a point to its image. D3 composes two motions and
// closes with the congruence conclusion: corresponding parts of the
// preimage and the final image are congruent.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, pt, ruleStr, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

export type MotionKey =
  | "translate" | "reflectX" | "reflectY" | "reflectYX"
  | "rot90" | "rot180" | "rot270";

export function applyMotion(m: MotionKey, x: number, y: number, a = 0, b = 0): [number, number] {
  switch (m) {
    case "translate": return [x + a, y + b];
    case "reflectX": return [x, -y];
    case "reflectY": return [-x, y];
    case "reflectYX": return [y, x];
    case "rot90": return [-y, x];
    case "rot180": return [-x, -y];
    case "rot270": return [y, -x];
  }
}

export function describeMotion(m: MotionKey, a = 0, b = 0): string {
  switch (m) {
    case "translate": return `translation by the rule ${ruleStr(a, b)}`;
    case "reflectX": return "reflection over the x-axis";
    case "reflectY": return "reflection over the y-axis";
    case "reflectYX": return "reflection over the line y = x";
    case "rot90": return "rotation of 90° counterclockwise about the origin";
    case "rot180": return "rotation of 180° about the origin";
    case "rot270": return "rotation of 270° counterclockwise about the origin";
  }
}

const RULE_TEXT: Record<Exclude<MotionKey, "translate">, string> = {
  reflectX: "(x, y) → (x, −y)",
  reflectY: "(x, y) → (−x, y)",
  reflectYX: "(x, y) → (y, x)",
  rot90: "(x, y) → (−y, x)",
  rot180: "(x, y) → (−x, −y)",
  rot270: "(x, y) → (y, −x)",
};

const ALL_MOTIONS: MotionKey[] = ["translate", "reflectX", "reflectY", "reflectYX", "rot90", "rot180", "rot270"];
const NAMED_MOTIONS: MotionKey[] = ["reflectX", "reflectY", "reflectYX", "rot90", "rot180", "rot270"];

interface TriVerts { label: string; x: number; y: number }

function randomTriangle(rng: RNG): TriVerts[] {
  const labels = ["A", "B", "C"];
  const used = new Set<string>();
  return labels.map((label) => {
    let x = 0;
    let y = 0;
    do {
      x = randInt(rng, -4, 4);
      y = randInt(rng, -4, 4);
    } while (used.has(`${x},${y}`));
    used.add(`${x},${y}`);
    return { label, x, y };
  });
}

function triText(verts: TriVerts[]): string {
  return verts.map((v) => `${v.label}${pt(v.x, v.y)}`).join(", ");
}

function makeImage(rng: RNG): GeometryProblem {
  const verts = randomTriangle(rng);
  const target = pick(rng, verts);
  const motion = pick(rng, ALL_MOTIONS);
  let a = 0;
  let b = 0;
  if (motion === "translate") {
    do {
      a = randInt(rng, -3, 3);
      b = randInt(rng, -3, 3);
    } while (a === 0 && b === 0);
  }
  const [ix, iy] = applyMotion(motion, target.x, target.y, a, b);
  const ans = pt(ix, iy);
  const ruleText = motion === "translate" ? ruleStr(a, b) : RULE_TEXT[motion as Exclude<MotionKey, "translate">];
  const verify: GeometryProblem["verify"] =
    motion === "translate"
      ? { kind: "translate", x: target.x, y: target.y, a, b }
      : motion === "reflectX"
        ? { kind: "reflect", rk: "xAxis", x: target.x, y: target.y, k: 0 }
        : motion === "reflectY"
          ? { kind: "reflect", rk: "yAxis", x: target.x, y: target.y, k: 0 }
          : motion === "reflectYX"
            ? { kind: "reflect", rk: "yEqX", x: target.x, y: target.y, k: 0 }
            : { kind: "rotate", rot: motion === "rot90" ? 90 : motion === "rot180" ? 180 : 270, x: target.x, y: target.y };
  return {
    type: "GEO.8", subtype: "RigidMotionImage",
    prompt: `Triangle ABC has vertices ${triText(verts)}. The triangle is mapped by a ${describeMotion(motion, a, b)}. Give the coordinates of the image of vertex ${target.label}.`,
    given: { triangle: triText(verts), motion: describeMotion(motion, a, b) },
    find: `image of ${target.label}`,
    answer: ans,
    steps: [
      step(`The coordinate rule for this motion is ${ruleText}.`, "Coordinate rule for the rigid motion."),
      step(`Apply the rule to ${target.label}${pt(target.x, target.y)}: the image is ${target.label}′${ans}.`, "Apply the rule to the named vertex.", [
        { label: `${target.label}′`, answer: ans },
      ]),
      step("The motion is rigid, so it preserves distances and angle measures and the image triangle is congruent to the preimage.", "Rigid motions preserve distance and angle measure."),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: verts }],
      points: [{ label: `${target.label}′`, x: ix, y: iy }],
    },
    verify,
  };
}

function makeName(rng: RNG): GeometryProblem {
  let x = 0;
  let y = 0;
  do {
    x = randInt(rng, -5, 5);
    y = randInt(rng, -5, 5);
  } while (x === 0 || y === 0 || Math.abs(x) === Math.abs(y));
  const motion = pick(rng, NAMED_MOTIONS);
  const [ix, iy] = applyMotion(motion, x, y);
  const ans = describeMotion(motion);
  const ruleText = RULE_TEXT[motion as Exclude<MotionKey, "translate">];
  return {
    type: "GEO.8", subtype: "RigidMotionName",
    prompt: `A single rigid motion, either a reflection or a rotation about the origin, maps P${pt(x, y)} to P′${pt(ix, iy)}. Name the motion.`,
    given: { preimage: pt(x, y), image: pt(ix, iy) },
    find: "the rigid motion",
    answer: ans,
    steps: [
      step(`Compare the coordinates: P is ${pt(x, y)} and P′ is ${pt(ix, iy)}.`, "Compare preimage and image coordinates."),
      step(`The coordinate change matches the rule ${ruleText}, which is the ${ans}.`, "Coordinate rules for reflections and rotations.", [
        { label: "motion", answer: ans },
      ]),
      step("Naming the motion identifies exactly how the preimage is carried onto the image, so the two figures are congruent.", "Congruence through rigid motions."),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "P", x, y },
        { label: "P′", x: ix, y: iy },
      ],
    },
    verify: { kind: "motionName", motion, x, y, ix, iy },
  };
}

function makeSequence(rng: RNG): GeometryProblem {
  const verts = randomTriangle(rng);
  const target = pick(rng, verts);
  const firstPool: MotionKey[] = ["reflectX", "reflectY", "rot90", "rot180", "translate"];
  const m1 = pick(rng, firstPool);
  const secondPool = NAMED_MOTIONS.concat(["translate"]).filter((m) => m !== m1 && !(m1 === "translate" && m === "translate"));
  const m2 = pick(rng, secondPool);
  let a1 = 0;
  let b1 = 0;
  let a2 = 0;
  let b2 = 0;
  if (m1 === "translate") {
    do {
      a1 = randInt(rng, -2, 2);
      b1 = randInt(rng, -2, 2);
    } while (a1 === 0 && b1 === 0);
  }
  if (m2 === "translate") {
    do {
      a2 = randInt(rng, -2, 2);
      b2 = randInt(rng, -2, 2);
    } while (a2 === 0 && b2 === 0);
  }
  const [mx, my] = applyMotion(m1, target.x, target.y, a1, b1);
  const [fx, fy] = applyMotion(m2, mx, my, a2, b2);
  const ans = pt(fx, fy);
  return {
    type: "GEO.8", subtype: "RigidMotionSequence",
    prompt: `Triangle ABC has vertices ${triText(verts)}. Apply the sequence of rigid motions to the triangle: first a ${describeMotion(m1, a1, b1)}, then a ${describeMotion(m2, a2, b2)}. Give the coordinates of the final image of vertex ${target.label}.`,
    given: { triangle: triText(verts), first: describeMotion(m1, a1, b1), second: describeMotion(m2, a2, b2) },
    find: `final image of ${target.label}`,
    answer: ans,
    steps: [
      step(`After the first motion (a ${describeMotion(m1, a1, b1)}), ${target.label}${pt(target.x, target.y)} moves to ${pt(mx, my)}.`, "Apply the first motion of the composition."),
      step(`After the second motion (a ${describeMotion(m2, a2, b2)}), the point moves to ${ans}.`, "Apply the second motion of the composition.", [
        { label: "final image", answer: ans },
      ]),
      step(`Each motion is rigid, so the composition is a rigid motion: the final image is congruent to triangle ABC, and ${target.label} corresponds to its final image, so the corresponding sides and angles through ${target.label} are congruent.`, "A composition of rigid motions is a rigid motion."),
    ],
    svgParams: {
      kind: "GridFigure",
      polygons: [{ points: verts }],
      points: [{ label: `${target.label}″`, x: fx, y: fy }],
    },
    verify: { kind: "motionSeq", x: target.x, y: target.y, m1, a1, b1, m2, a2, b2 },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const RIGID_MOTIONS_LESSON_POOL: MakerEntry[] = [
  M("RigidMotionImage", 1, (rng) => makeImage(rng)),
  M("RigidMotionName", 2, (rng) => makeName(rng)),
  M("RigidMotionSequence", 3, (rng) => makeSequence(rng)),
];

export function generateRigidMotionsProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only
    ? RIGID_MOTIONS_LESSON_POOL.filter((e) => only.includes(e.subtype))
    : RIGID_MOTIONS_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

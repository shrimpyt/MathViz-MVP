// ParallelLinesFactory.ts
// Topic 3: Parallel and Perpendicular Lines (TEKS G.5(A), G.5(B)) — chapter
// test pool (Topic 3 has no separate placeholder lesson in the registry).
// Core of a real Topic 3 test: angle pairs formed by a transversal (find the
// measure — equal for corresponding/alternate/vertical, supplementary for
// same-side), algebra with those relationships, proving lines parallel with
// the CONVERSES, and the coordinate half of the chapter: slopes, parallel /
// perpendicular slope relationships, and equations of lines.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, frac, type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

// Transversal slots (reading order): top intersection 1 2 / 3 4, bottom 5 6 / 7 8.
type Rel = "corresponding" | "altInterior" | "altExterior" | "sameSideInterior" | "vertical";
const EQUAL_RELS: Rel[] = ["corresponding", "altInterior", "altExterior", "vertical"];

// Given a starting slot and a relationship, the partner slot.
function partnerSlot(slot: number, rel: Rel): number {
  const corr: Record<number, number> = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 1, 6: 2, 7: 3, 8: 4 };
  const vert: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 8, 6: 7, 7: 6, 8: 5 };
  const altInt: Record<number, number> = { 3: 6, 6: 3, 4: 5, 5: 4 };
  const altExt: Record<number, number> = { 1: 8, 8: 1, 2: 7, 7: 2 };
  const ssi: Record<number, number> = { 3: 5, 5: 3, 4: 6, 6: 4 };
  switch (rel) {
    case "corresponding": return corr[slot];
    case "vertical": return vert[slot];
    case "altInterior": return altInt[slot] ?? slot;
    case "altExterior": return altExt[slot] ?? slot;
    case "sameSideInterior": return ssi[slot] ?? slot;
  }
}
const REL_NAMES: Record<Rel, string> = {
  corresponding: "corresponding angles",
  altInterior: "alternate interior angles",
  altExterior: "alternate exterior angles",
  sameSideInterior: "same-side interior angles",
  vertical: "vertical angles",
};
const START_SLOTS: Record<Rel, number[]> = {
  corresponding: [1, 2, 3, 4],
  altInterior: [3, 4],
  altExterior: [1, 2],
  sameSideInterior: [3, 4],
  vertical: [1, 2, 5, 6],
};

function makeTransversalFind(rng: RNG): GeometryProblem {
  const rel = pick(rng, ["corresponding", "altInterior", "altExterior", "sameSideInterior", "vertical"] as Rel[]);
  const given = pick(rng, START_SLOTS[rel]);
  const target = partnerSlot(given, rel);
  const val = randInt(rng, 25, 155);
  const equal = EQUAL_RELS.includes(rel);
  const answer = equal ? val : 180 - val;
  const labels: (string | null)[] = Array(8).fill(null);
  labels[given - 1] = `${val}°`;
  labels[target - 1] = "?";
  return {
    type: "GEO.3",
    subtype: "TransversalAngleFind",
    prompt: `Lines l and m are parallel, cut by a transversal. The angle in position ${given} measures ${val}°. Angles ${given} and ${target} are ${REL_NAMES[rel]}. Find the measure of angle ${target}.`,
    given: { angle: val, relationship: rel },
    find: `measure of angle ${target}`,
    answer: `${answer}°`,
    steps: [
      step(`Angles ${given} and ${target} are ${REL_NAMES[rel]} formed by parallel lines.`, "Angle pairs formed by a transversal."),
      step(
        equal
          ? "When lines are parallel, these angle pairs are congruent."
          : "When lines are parallel, same-side interior angles are supplementary.",
        equal ? "Parallel lines ⇒ congruent angle pairs (Corresponding / Alternate Interior / Alternate Exterior / Vertical Angles)." : "Same-Side Interior Angles Theorem."
      ),
      step(
        equal ? `m∠${target} = ${val}°.` : `m∠${target} = 180° − ${val}° = ${answer}°.`,
        equal ? "Congruent angles have equal measure." : "Supplementary angles sum to 180°.",
        [{ label: `m∠${target}`, answer: `${answer}°` }]
      ),
    ],
    svgParams: { kind: "TransversalFigure", labels, parallel: true },
    verify: { kind: "transversal", val, rel },
  };
}

function makeTransversalAlgebra(rng: RNG): GeometryProblem {
  const equal = rng() < 0.5;
  const x = randInt(rng, 4, 15);
  const a = randInt(rng, 2, 5);
  let b = randInt(rng, 0, 10);
  const v = a * x + b; // measure of angle 1
  // angle 2: cx + d, consistent with the relationship. Avoid degenerate
  // identities (a === c in the equal case) and keep d classroom-sized.
  let c = a;
  let d = 0;
  let target = v;
  for (let attempt = 0; attempt < 30; attempt++) {
    c = randInt(rng, 2, 6);
    if (equal && c === a) continue;
    d = equal ? v - c * x : 180 - v - c * x;
    if (Math.abs(d) <= 40) break;
  }
  if (equal && c === a) { c = a === 6 ? 5 : a + 1; d = v - c * x; }
  target = equal ? v : 180 - v;
  const expr = (coef: number, con: number) => `${coef}x ${con >= 0 ? "+ " + con : "− " + -con}`;
  return {
    type: "GEO.3",
    subtype: "TransversalAlgebra",
    prompt: `Lines l and m are parallel. Two ${equal ? "corresponding" : "same-side interior"} angles measure (${expr(a, b)})° and (${expr(c, d)})°. Find x and the measure of each angle.`,
    given: { angle1: expr(a, b), angle2: expr(c, d), relationship: equal ? "congruent" : "supplementary" },
    find: "x and both angle measures",
    answer: `x = ${x}; angles are ${v}° and ${target}°`,
    steps: [
      step(
        equal
          ? "Corresponding angles formed by parallel lines are congruent, so their measures are equal."
          : "Same-side interior angles formed by parallel lines are supplementary, so their measures sum to 180°.",
        equal ? "Corresponding Angles Theorem." : "Same-Side Interior Angles Theorem."
      ),
      step(
        equal ? `${expr(a, b)} = ${expr(c, d)}.` : `(${expr(a, b)}) + (${expr(c, d)}) = 180.`,
        "Set up the equation from the angle relationship.",
        [{ label: "equation", answer: equal ? `${expr(a, b)} = ${expr(c, d)}` : `${expr(a, b)} + ${expr(c, d)} = 180` }]
      ),
      step(`x = ${x}.`, "Addition/Subtraction and Division Properties of Equality.", [{ label: "x", answer: String(x) }]),
      step(`First angle: ${a}(${x}) ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${v}°. Second angle: ${target}°.`, "Substitution.", [
        { label: "angles", answer: `${v}° and ${target}°` },
      ]),
    ],
    verify: { kind: "transAlg", a, b, c, d, equal },
  };
}

function makeProveParallel(rng: RNG): GeometryProblem {
  const cases = [
    {
      fact: "∠3 and ∠6 are alternate interior angles, and m∠3 = m∠6 = 112°.",
      answer: "Alternate Interior Angles Converse",
      why: "Congruent alternate interior angles force the lines to be parallel.",
    },
    {
      fact: "∠1 and ∠5 are corresponding angles, and m∠1 = m∠5 = 98°.",
      answer: "Corresponding Angles Converse",
      why: "Congruent corresponding angles force the lines to be parallel.",
    },
    {
      fact: "∠4 and ∠6 are same-side interior angles, with m∠4 = 75° and m∠6 = 105°.",
      answer: "Same-Side Interior Angles Converse",
      why: "75° + 105° = 180°: supplementary same-side interior angles force the lines to be parallel.",
    },
    {
      fact: "∠2 and ∠7 are alternate exterior angles, and m∠2 = m∠7 = 131°.",
      answer: "Alternate Exterior Angles Converse",
      why: "Congruent alternate exterior angles force the lines to be parallel.",
    },
  ] as const;
  const notParallel = rng() < 0.25;
  if (notParallel) {
    return {
      type: "GEO.3",
      subtype: "ProveLinesParallel",
      prompt: "A transversal cuts lines l and m. Corresponding angles measure 110° and 115°. Can you conclude l ∥ m? Answer Yes or No, naming why in the steps.",
      given: { corresponding: "110° and 115°" },
      find: "whether l ∥ m follows",
      answer: "No",
      steps: [
        step("The Corresponding Angles Converse requires the corresponding angles to be congruent.", "Corresponding Angles Converse."),
        step("110° ≠ 115°, so the hypothesis of the converse is not met.", "Compare the measures."),
        step("No conclusion: the lines are not parallel (in Euclidean geometry).", "Converse fails when its hypothesis fails.", [
          { label: "answer", answer: "No" },
        ]),
      ],
      svgParams: { kind: "TransversalFigure", labels: ["110°", null, null, null, "115°", null, null, null], parallel: false },
      verify: { kind: "oneOf", options: ["No"] },
    };
  }
  const c = pick(rng, cases);
  return {
    type: "GEO.3",
    subtype: "ProveLinesParallel",
    prompt: `A transversal cuts lines l and m. Given: ${c.fact} Which theorem or postulate proves l ∥ m? Name it.`,
    given: { fact: c.fact },
    find: "the converse theorem",
    answer: c.answer,
    steps: [
      step("To prove lines parallel, use the converse of a parallel-lines angle theorem.", "Converses of the parallel angle theorems."),
      step(c.why, "Match the angle pair and the condition."),
      step(`The justification is the ${c.answer}.`, "Converse theorem.", [{ label: "theorem", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

function makeSlope(rng: RNG): GeometryProblem {
  let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  do {
    x1 = randInt(rng, -5, 1);
    y1 = randInt(rng, -5, 5);
    x2 = x1 + randInt(rng, 1, 6);
    y2 = randInt(rng, -5, 5);
  } while (y2 === y1 && rng() < 0.5); // allow horizontal sometimes
  const rise = y2 - y1;
  const run = x2 - x1;
  const answer = frac(rise, run);
  if (run === 0) throw new Error("unreachable");
  return {
    type: "GEO.3",
    subtype: "SlopeOfLine",
    prompt: `Find the slope of the line through the points (${x1}, ${y1}) and (${x2}, ${y2}).`,
    given: { p1: `(${x1}, ${y1})`, p2: `(${x2}, ${y2})` },
    find: "slope",
    answer,
    steps: [
      step("Slope is rise over run: m = (y₂ − y₁) / (x₂ − x₁).", "Slope Formula."),
      step(`m = (${y2} − ${y1}) / (${x2} − ${x1}) = ${rise}/${run}.`, "Substitution.", [
        { label: "m", answer: `${rise}/${run}` },
      ]),
      step(`m = ${answer}.`, "Simplify the fraction.", [{ label: "m", answer }]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "P", x: x1, y: y1 },
        { label: "Q", x: x2, y: y2 },
      ],
      lines: [{ x1, y1, x2, y2 }],
    },
    verify: { kind: "slope", x1, y1, x2, y2 },
  };
}

const SLOPE_CHOICES: [number, number][] = [[2, 1], [-3, 1], [1, 2], [-3, 4], [4, 5], [-1, 3], [5, 2], [-2, 3]];

function makeParallelPerpSlope(rng: RNG, difficulty: Difficulty, classify = false): GeometryProblem {
  const [p, q] = pick(rng, SLOPE_CHOICES);
  const mStr = frac(p, q);
  if (classify) {
    // classify two lines by their slopes; the answer is DERIVED from the
    // generated slopes, never assumed from the intended mode.
    const mode = pick(rng, ["parallel", "perpendicular", "neither"] as const);
    let p2 = p, q2 = q;
    if (mode === "perpendicular") { p2 = -q; q2 = p; }
    if (mode === "neither") { p2 = p + 1; q2 = q; if (p2 === 0) p2 = 1; }
    const m2Str = frac(p2, q2);
    const answer =
      p * q2 === p2 * q ? "Parallel"
      : p * p2 + q * q2 === 0 ? "Perpendicular"
      : "Neither";
    return {
      type: "GEO.3",
      subtype: "ClassifyLines",
      prompt: `Line 1 has slope ${mStr} and line 2 has slope ${m2Str}. Are the lines parallel, perpendicular, or neither?`,
      given: { m1: mStr, m2: m2Str },
      find: "parallel, perpendicular, or neither",
      answer,
      steps: [
        step("Parallel lines have equal slopes; perpendicular lines have slopes whose product is −1; otherwise the lines are neither.", "Slopes of parallel and perpendicular lines."),
        step(
          mode === "parallel"
            ? `The slopes are equal (${mStr} = ${m2Str}).`
            : mode === "perpendicular"
              ? `(${mStr}) × (${m2Str}) = −1.`
              : `The slopes are not equal and their product is not −1.`,
          "Compare the slopes."
        ),
        step(`The lines are ${answer.toLowerCase()}.`, "Slope relationships.", [{ label: "answer", answer }]),
      ],
      verify: { kind: "slopeRelation", p1: p, q1: q, p2, q2 },
    };
  }
  const perp = rng() < 0.5;
  const answer = perp ? frac(-q, p) : mStr;
  return {
    type: "GEO.3",
    subtype: "ParallelPerpSlope",
    prompt: `A line has slope ${mStr}. Find the slope of a line ${perp ? "perpendicular" : "parallel"} to it.`,
    given: { slope: mStr },
    find: perp ? "perpendicular slope" : "parallel slope",
    answer,
    steps: [
      step(
        perp
          ? "Perpendicular lines have slopes that are opposite reciprocals (their product is −1)."
          : "Parallel lines have the same slope.",
        perp ? "Slopes of perpendicular lines." : "Slopes of parallel lines."
      ),
      step(
        perp ? `Flip ${mStr} and change the sign: ${answer}.` : `The slope stays ${mStr}.`,
        perp ? "Opposite reciprocal." : "Equal slopes.",
        [{ label: "slope", answer }]
      ),
    ],
    verify: { kind: "slopePP", p, q, perp },
  };
}

function makeEquationOfLine(rng: RNG): GeometryProblem {
  const [p, q] = pick(rng, SLOPE_CHOICES);
  const m = p / q;
  const x0 = randInt(rng, -4, 4);
  // y-intercept of the given line (integer when q | p·x0 adjustments needed)
  const b0 = randInt(rng, -5, 5);
  const perp = rng() < 0.5;
  const mNew = perp ? -q / p : m;
  // Choose y0 so the new intercept is an integer: y0 = mNew·x0 + bNew → pick bNew, derive y0 if integral
  let bNew = randInt(rng, -6, 6);
  let y0 = mNew * x0 + bNew;
  if (!Number.isInteger(y0)) {
    // adjust x0 to a multiple of the denominator
    const den = perp ? Math.abs(p) : Math.abs(q);
    const xAdj = Math.round(x0 / den) * den;
    y0 = mNew * xAdj + bNew;
    return finishLineEq(rng, p, q, b0, perp, mNew, xAdj, y0, bNew);
  }
  return finishLineEq(rng, p, q, b0, perp, mNew, x0, y0, bNew);
}

function finishLineEq(
  rng: RNG, p: number, q: number, b0: number, perp: boolean,
  mNew: number, x0: number, y0: number, bNew: number
): GeometryProblem {
  void rng;
  const mGivenStr = frac(p, q);
  const mNewStr = slopeString(mNew);
  const bStr = (v: number) => (v >= 0 ? `+ ${v}` : `− ${-v}`);
  const answer = `y = ${mNewStr === "1" ? "" : mNewStr === "-1" ? "-" : mNewStr}x ${bStr(bNew)}`;
  return {
    type: "GEO.3",
    subtype: "EquationOfLine",
    prompt: `Write an equation in slope-intercept form of the line through (${x0}, ${y0}) that is ${perp ? "perpendicular" : "parallel"} to the line y = ${mGivenStr}x ${bStr(b0)}.`,
    given: { point: `(${x0}, ${y0})`, givenSlope: mGivenStr },
    find: "equation of the new line",
    answer,
    steps: [
      step(
        perp
          ? `The new slope is the opposite reciprocal of ${mGivenStr}: m = ${mNewStr}.`
          : `Parallel lines share the slope: m = ${mGivenStr}.`,
        perp ? "Slopes of perpendicular lines." : "Slopes of parallel lines."
      ),
      step(`Use point-slope form with (${x0}, ${y0}): y − ${y0} = ${mNewStr}(x − ${x0}).`, "Point-Slope Form."),
      step(`Solve for y: ${answer}.`, "Slope-Intercept Form.", [{ label: "equation", answer }]),
    ],
    verify: { kind: "lineEq", mNum: mNew, b: bNew },
  };
}

function slopeString(m: number): string {
  // m is a ratio of small ints; recover the fraction
  for (let q = 1; q <= 12; q++) {
    const p = m * q;
    if (Number.isInteger(p)) return frac(p, q);
  }
  return String(Math.round(m * 100) / 100);
}

export const PARALLEL_LINES_TEST_POOL: MakerEntry[] = [
  M("TransversalAngleFind", 1, (rng) => makeTransversalFind(rng)),
  M("TransversalAlgebra", 2, (rng) => makeTransversalAlgebra(rng)),
  M("ProveLinesParallel", 2, (rng) => makeProveParallel(rng)),
  M("SlopeOfLine", 1, (rng) => makeSlope(rng)),
  M("ParallelPerpSlope", 2, (rng, d) => makeParallelPerpSlope(rng, d, false)),
  M("ClassifyLines", 2, (rng, d) => makeParallelPerpSlope(rng, d, true)),
  M("EquationOfLine", 3, (rng) => makeEquationOfLine(rng)),
];

// TriangleProportionalityFactory.ts
// Topic 10: Triangle Proportionality (TEKS G.8(A)).
// Lesson ch10-2, beside ch10-1 (the altitude to the hypotenuse). A line
// parallel to one side of a triangle divides the other two sides
// proportionally, and the converse also holds. D1: solve a proportion for
// the missing segment. D2: use the converse, deciding from four segment
// lengths whether the line is parallel. D3: the midsegment as the special
// case where the ratio is 1:1, and three parallel lines cutting two
// transversals proportionally.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

const TRI_FIGURE = {
  kind: "TriangleFigure" as const,
  points: [
    { label: "A", x: 100, y: 28 }, { label: "B", x: 38, y: 152 }, { label: "C", x: 168, y: 152 },
    { label: "D", x: 69, y: 90 }, { label: "E", x: 134, y: 90 },
  ],
  segments: [["A", "B"], ["B", "C"], ["C", "A"], ["D", "E"]] as [string, string][],
  parallelMarks: ["DE", "BC"],
};

function makeTriPropSegment(rng: RNG): GeometryProblem {
  const p = randInt(rng, 1, 4);
  const q = randInt(rng, 1, 4);
  const t = randInt(rng, 2, 4);
  const s = randInt(rng, 2, 4);
  const AD = p * t, DB = q * t;
  const AE = p * s, EC = q * s;
  const askEC = rng() < 0.5;
  return {
    type: "GEO.10",
    subtype: "TriPropSegment",
    prompt: askEC
      ? `In △ABC, DE ∥ BC with D on AB and E on AC. AD = ${AD}, DB = ${DB}, and AE = ${AE}. Find EC.`
      : `In △ABC, DE ∥ BC with D on AB and E on AC. AD = ${AD}, DB = ${DB}, and EC = ${EC}. Find AE.`,
    given: { AD, DB, known: askEC ? AE : EC },
    find: askEC ? "EC" : "AE",
    answer: String(askEC ? EC : AE),
    steps: [
      step("A line parallel to one side of a triangle divides the other two sides proportionally.", "Triangle Proportionality Theorem."),
      step(`AD/DB = AE/EC gives ${AD}/${DB} = ${askEC ? `${AE}/EC` : `AE/${EC}`}.`, "Set up the proportion.", [
        { label: "proportion", answer: `${AD}/${DB}` },
      ]),
      step(`Cross-multiply and solve: the missing segment is ${askEC ? EC : AE}.`, "Means-Extremes Property of Proportions.", [
        { label: "answer", answer: String(askEC ? EC : AE) },
      ]),
    ],
    svgParams: { ...TRI_FIGURE, sideLabels: { AD: String(AD), DB: String(DB) } },
    verify: { kind: "triProp", AD, DB, AE, EC, askEC },
  };
}

function makeTriPropConverse(rng: RNG): GeometryProblem {
  const p = randInt(rng, 1, 4);
  const q = randInt(rng, 1, 4);
  const t = randInt(rng, 2, 4);
  const s = randInt(rng, 2, 4);
  const AD = p * t, DB = q * t;
  const AE = p * s;
  let EC = q * s;
  const parallel = rng() < 0.5;
  if (!parallel) {
    EC += pick(rng, [1, 2, 3, -1]);
    if (EC <= 0) EC = q * s + 2;
  }
  const ans = parallel ? "Yes" : "No";
  return {
    type: "GEO.10",
    subtype: "TriPropConverse",
    prompt: `In △ABC, point D lies on AB and point E lies on AC, with AD = ${AD}, DB = ${DB}, AE = ${AE}, and EC = ${EC}. Is DE ∥ BC? Answer Yes or No.`,
    given: { AD, DB, AE, EC },
    find: "whether DE is parallel to BC",
    answer: ans,
    steps: [
      step("By the converse of the Triangle Proportionality Theorem, DE ∥ BC exactly when AD/DB = AE/EC.", "Converse of the Triangle Proportionality Theorem."),
      step(`AD/DB = ${AD}/${DB} and AE/EC = ${AE}/${EC}. Cross products: ${AD} × ${EC} = ${AD * EC} and ${DB} × ${AE} = ${DB * AE}.`, "Compare the ratios by cross-multiplying.", [
        { label: "AD × EC", answer: String(AD * EC) },
        { label: "DB × AE", answer: String(DB * AE) },
      ]),
      step(
        parallel
          ? "The cross products are equal, so the segments are proportional and DE ∥ BC. Answer: Yes."
          : "The cross products differ, so the segments are not proportional and DE is not parallel to BC. Answer: No.",
        "Converse of the Triangle Proportionality Theorem.",
        [{ label: "answer", answer: ans }]
      ),
    ],
    svgParams: { ...TRI_FIGURE, sideLabels: { AD: String(AD), DB: String(DB) } },
    verify: { kind: "triPropParallel", AD, DB, AE, EC },
  };
}

function makeTriPropMidsegmentLink(rng: RNG): GeometryProblem {
  const a = randInt(rng, 3, 14);
  const b = randInt(rng, 3, 14);
  const ans = `AB = ${2 * a}, AC = ${2 * b}`;
  return {
    type: "GEO.10",
    subtype: "TriPropMidsegment",
    prompt: `In △ABC, D is the midpoint of AB and E is the midpoint of AC, so DE ∥ BC by the midsegment theorem. If AD = ${a} and AE = ${b}, find AB and AC.`,
    given: { AD: a, AE: b },
    find: "AB and AC",
    answer: ans,
    steps: [
      step("D divides AB in the ratio AD:DB = 1:1, the special case of triangle proportionality where the parallel line cuts each side in half.", "Triangle Proportionality Theorem, ratio 1:1."),
      step(`AB = AD + DB = ${a} + ${a} = ${2 * a}, and AC = AE + EC = ${b} + ${b} = ${2 * b}.`, "Midpoint divides a segment into two equal parts.", [
        { label: "AB", answer: String(2 * a) },
        { label: "AC", answer: String(2 * b) },
      ]),
      step(ans + ".", "Segment Addition Postulate.", [{ label: "answer", answer: ans }]),
    ],
    svgParams: { ...TRI_FIGURE, sideLabels: { AD: String(a) } },
    verify: { kind: "triPropMid", a, b },
  };
}

function makeThreeParallelLines(rng: RNG): GeometryProblem {
  const a = randInt(rng, 2, 6);
  const t = randInt(rng, 2, 4);
  const b = a * t;
  const c = randInt(rng, 2, 9);
  const d = c * t;
  return {
    type: "GEO.10",
    subtype: "ThreeParallelLines",
    prompt: `Three parallel lines cut two transversals. On the first transversal the segments between the parallel lines measure ${a} and ${b}. On the second transversal the first segment measures ${c}. Find the second segment on the second transversal.`,
    given: { firstA: a, firstB: b, secondA: c },
    find: "second segment on the second transversal",
    answer: String(d),
    steps: [
      step("Three or more parallel lines divide any two transversals proportionally.", "Three Parallel Lines Theorem."),
      step(`${a}/${b} = ${c}/x. The ratio ${a}/${b} simplifies to 1/${t}, so x = ${t} × ${c}.`, "Set up the proportion and simplify.", [
        { label: "ratio", answer: `1/${t}` },
      ]),
      step(`x = ${d}.`, "Means-Extremes Property of Proportions.", [{ label: "answer", answer: String(d) }]),
    ],
    verify: { kind: "threeParallel", a, b, c },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const TRIANGLE_PROPORTIONALITY_LESSON_POOL: MakerEntry[] = [
  M("TriPropSegment", 1, (rng) => makeTriPropSegment(rng)),
  M("TriPropConverse", 2, (rng) => makeTriPropConverse(rng)),
  M("TriPropMidsegment", 3, (rng) => makeTriPropMidsegmentLink(rng)),
  M("ThreeParallelLines", 3, (rng) => makeThreeParallelLines(rng)),
];

export function generateTriangleProportionalityProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? TRIANGLE_PROPORTIONALITY_LESSON_POOL.filter((e) => only.includes(e.subtype)) : TRIANGLE_PROPORTIONALITY_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

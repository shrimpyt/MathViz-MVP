// TriangleInequalityFactory.ts
// Topic 5: The Triangle Inequality Theorem (TEKS G.5(D)).
// Lesson ch5-2, beside ch5-1 (midsegments). The sum of the lengths of any
// two sides of a triangle must be greater than the length of the third
// side. D1: decide whether three given lengths can form a triangle. D2:
// describe the possible lengths of a third side, in words. D3: word
// problems and choosing the one length, from a list, that can complete a
// triangle. Until this lesson was built, the theorem appeared only in the
// chapter test pool; the midsegments lesson it was tagged on teaches a
// different theorem (the midsegment theorem, G.6(D)).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

function makeInequalityCheck(rng: RNG): GeometryProblem {
  const valid = rng() < 0.5;
  const a = randInt(rng, 3, 10);
  const b = randInt(rng, 3, 10);
  const c = valid
    ? randInt(rng, Math.abs(a - b) + 1, a + b - 1)
    : a + b + randInt(rng, 0, 3);
  const ans = valid ? "Yes" : "No";
  return {
    type: "GEO.5",
    subtype: "TriangleInequalityCheck",
    prompt: `Can lengths ${a}, ${b}, and ${c} be the side lengths of a triangle? Answer Yes or No.`,
    given: { sides: `${a}, ${b}, ${c}` },
    find: "yes or no",
    answer: ans,
    steps: [
      step("The sum of the lengths of any two sides of a triangle must be greater than the length of the third side.", "Triangle Inequality Theorem."),
      step(
        valid
          ? `Check the two shorter sides against the longest: ${a} + ${b} = ${a + b}, which is greater than ${c}, and the other pairings are larger still.`
          : `Check the two shorter sides against the longest: ${a} + ${b} = ${a + b}, which is not greater than ${c}.`,
        "Triangle Inequality Theorem applied to the shortest pair."
      ),
      step(`Answer: ${ans}.`, "Apply the theorem.", [{ label: "answer", answer: ans }]),
    ],
    verify: { kind: "triPossible", a, b, c },
  };
}

function rangeAnswer(lo: number, hi: number, unit: string): string {
  return `greater than ${lo}${unit} and less than ${hi}${unit}`;
}

function makeInequalityRange(rng: RNG): GeometryProblem {
  const a = randInt(rng, 3, 11);
  const b = a + randInt(rng, 1, 9);
  const lo = b - a;
  const hi = a + b;
  const ans = rangeAnswer(lo, hi, "");
  return {
    type: "GEO.5",
    subtype: "TriangleInequalityRange",
    prompt: `Two sides of a triangle measure ${a} and ${b}. Describe the possible lengths of the third side, x, in words, in the form: greater than p and less than q.`,
    given: { side1: a, side2: b },
    find: "possible lengths of the third side, in words",
    answer: ans,
    steps: [
      step("The third side must be shorter than the sum of the two given sides, and longer than their difference.", "Triangle Inequality Theorem."),
      step(`x < ${a} + ${b} = ${hi}, and x > ${b} − ${a} = ${lo}.`, "Apply the theorem in both directions.", [
        { label: "lower bound", answer: String(lo) },
        { label: "upper bound", answer: String(hi) },
      ]),
      step(`The third side must be ${ans}.`, "Combine the two bounds.", [{ label: "range", answer: ans }]),
    ],
    verify: { kind: "triRangeWords", a, b, unit: "" },
  };
}

const WORD_CONTEXTS = [
  { thing: "a triangular garden plot", unitWord: "feet", unit: " feet" },
  { thing: "a triangular pennant flag", unitWord: "inches", unit: " inches" },
  { thing: "a triangular shelf bracket", unitWord: "centimeters", unit: " centimeters" },
] as const;

function makeInequalityWord(rng: RNG): GeometryProblem {
  const c = pick(rng, WORD_CONTEXTS);
  const a = randInt(rng, 4, 15);
  const b = a + randInt(rng, 2, 10);
  const lo = b - a;
  const hi = a + b;
  const ans = rangeAnswer(lo, hi, c.unit);
  return {
    type: "GEO.5",
    subtype: "TriangleInequalityWord",
    prompt: `Two sides of ${c.thing} measure ${a} ${c.unitWord} and ${b} ${c.unitWord}. Describe the possible lengths of the third side in words, in the form: greater than p ${c.unitWord} and less than q ${c.unitWord}.`,
    given: { side1: a, side2: b, unit: c.unitWord },
    find: "possible lengths of the third side, in words",
    answer: ans,
    steps: [
      step("The third side of a triangle must be shorter than the sum of the other two sides and longer than their difference.", "Triangle Inequality Theorem."),
      step(`Sum: ${a} + ${b} = ${hi}. Difference: ${b} − ${a} = ${lo}.`, "Apply the theorem in both directions.", [
        { label: "lower bound", answer: `${lo}${c.unit}` },
        { label: "upper bound", answer: `${hi}${c.unit}` },
      ]),
      step(`The third side must be ${ans}.`, "Combine the two bounds.", [{ label: "range", answer: ans }]),
    ],
    verify: { kind: "triRangeWords", a, b, unit: c.unit },
  };
}

function makeInequalityChoose(rng: RNG): GeometryProblem {
  const a = randInt(rng, 4, 10);
  const b = a + randInt(rng, 2, 7);
  const lo = b - a;
  const hi = a + b;
  const chosen = randInt(rng, lo + 1, hi - 1);
  const options = [chosen, hi, lo, hi + randInt(rng, 2, 5)];
  // Shuffle the option list in the prompt.
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return {
    type: "GEO.5",
    subtype: "TriangleInequalityChoose",
    prompt: `Two sides of a triangle measure ${a} and ${b}. Which of these lengths can be the length of the third side: ${shuffled.join(", ")}?`,
    given: { side1: a, side2: b, options: shuffled.join(", ") },
    find: "the possible third side",
    answer: String(chosen),
    steps: [
      step(`The third side x must satisfy ${lo} < x < ${hi}: longer than the difference of the given sides, shorter than their sum.`, "Triangle Inequality Theorem."),
      step(`Equality at either bound flattens the triangle into a segment, and anything at or beyond ${hi} fails the sum test. Only ${chosen} lies strictly between ${lo} and ${hi}.`, "Test each option against both bounds.", [
        { label: "bounds", answer: `${lo} < x < ${hi}` },
      ]),
      step(`The third side can be ${chosen}.`, "Apply the theorem.", [{ label: "answer", answer: String(chosen) }]),
    ],
    verify: { kind: "triChoose", a, b, chosen },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const TRIANGLE_INEQUALITY_LESSON_POOL: MakerEntry[] = [
  M("TriangleInequalityCheck", 1, (rng) => makeInequalityCheck(rng)),
  M("TriangleInequalityRange", 2, (rng) => makeInequalityRange(rng)),
  M("TriangleInequalityWord", 3, (rng) => makeInequalityWord(rng)),
  M("TriangleInequalityChoose", 3, (rng) => makeInequalityChoose(rng)),
];

export function generateTriangleInequalityProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? TRIANGLE_INEQUALITY_LESSON_POOL.filter((e) => only.includes(e.subtype)) : TRIANGLE_INEQUALITY_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

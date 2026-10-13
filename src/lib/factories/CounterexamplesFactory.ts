// CounterexamplesFactory.ts
// Lesson ch2-2: Counterexamples (TEKS G.4(C)).
// A counterexample is a single case that satisfies the hypothesis of a
// conjecture but fails its conclusion, and one is enough to disprove the
// conjecture. D1 judges a stated candidate: it may be a genuine
// counterexample, a case where the conclusion happens to hold, or a case
// that fails the hypothesis (and so can disprove nothing). D2 asks for
// the one counterexample among three described cases. D3 constructs
// counterexamples from patterns: n = 41 breaks n² + n + 41, consecutive
// squares miss being a square, and an even product needs only one even
// factor. Every witness is checked arithmetically by the test harness.

import type { RNG } from "../math-utils";
import { pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, num, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

type JudgeClass = "counter" | "satisfies" | "hypothesisFails";

const VERDICT = (cls: JudgeClass) => (cls === "counter" ? "counterexample" : "not a counterexample");

function judgeSteps(conjectureNote: string, cls: JudgeClass, hypCheck: string, conclCheck: string): GeometryProblem["steps"] {
  const verdict = VERDICT(cls);
  return [
    step("A counterexample must satisfy the hypothesis of the conjecture but fail its conclusion.", "Definition of counterexample."),
    step(hypCheck, conjectureNote),
    step(conclCheck, cls === "counter" ? "The conclusion fails for this case." : "Reading the candidate against the conclusion."),
    step(`So the candidate is ${verdict === "counterexample" ? "a counterexample, and the conjecture is disproved" : "not a counterexample"}.`, "One counterexample disproves a conjecture; a case that fails the hypothesis, or satisfies the conclusion, disproves nothing.", [
      { label: "verdict", answer: verdict },
    ]),
  ];
}

function judgeShell(
  subtype: string,
  conjecture: string,
  candidate: string,
  cls: JudgeClass,
  note: string,
  hypCheck: string,
  conclCheck: string,
  verify: Record<string, number | string | number[]>
): GeometryProblem {
  return {
    type: "GEO.2", subtype,
    prompt: `Conjecture: ${conjecture} Candidate case: ${candidate}. Is the candidate a counterexample to the conjecture? Answer: counterexample, or: not a counterexample.`,
    given: { conjecture, candidate },
    find: "counterexample or not",
    answer: VERDICT(cls),
    steps: judgeSteps(note, cls, hypCheck, conclCheck),
    verify,
  };
}

function makeJudge(rng: RNG): GeometryProblem {
  const template = pick(rng, ["product", "acute", "rhombus", "mult8"] as const);
  const cls = pick(rng, ["counter", "counter", "satisfies", "hypothesisFails"] as const);
  if (template === "product") {
    const conjecture = "The product of two positive numbers is greater than either of the two numbers.";
    const cases: Record<JudgeClass, [number, number][]> = {
      counter: [[2, 0.5], [3, 1], [0.5, 0.5], [4, 0.25], [1, 7], [5, 0.5]],
      satisfies: [[2, 3], [3, 4], [1.5, 2], [2.5, 3], [4, 5]],
      hypothesisFails: [[0, 5], [-2, 3], [0, 0.5]],
    };
    const [a, b] = pick(rng, cases[cls]);
    const prod = a * b;
    return judgeShell(
      "CounterexampleJudge", conjecture,
      `the numbers ${num(a)} and ${num(b)}`, cls,
      "Check the hypothesis, then the product.",
      cls === "hypothesisFails"
        ? `${num(a)} and ${num(b)} are not both positive, so the hypothesis is not even satisfied.`
        : `${num(a)} and ${num(b)} are both positive, so the hypothesis is satisfied.`,
      cls === "counter"
        ? `The product is ${num(a)} × ${num(b)} = ${num(prod)}, which is not greater than ${num(Math.max(a, b))}.`
        : cls === "satisfies"
          ? `The product is ${num(a)} × ${num(b)} = ${num(prod)}, which is greater than both numbers, so the conclusion holds here.`
          : `Because the hypothesis fails, this case says nothing about the conjecture, no matter what the product is.`,
      { kind: "counterJudge", template, a, b }
    );
  }
  if (template === "acute") {
    const conjecture = "Any two acute angles are complementary.";
    const cases: Record<JudgeClass, [number, number][]> = {
      counter: [[30, 40], [55, 20], [80, 30], [45, 60], [35, 35]],
      satisfies: [[30, 60], [45, 45], [25, 65], [80, 10]],
      hypothesisFails: [[100, 30], [90, 40], [120, 55]],
    };
    const [x, y] = pick(rng, cases[cls]);
    return judgeShell(
      "CounterexampleJudge", conjecture,
      `two angles measuring ${x}° and ${y}°`, cls,
      "Acute means less than 90°; complementary means the measures sum to 90°.",
      cls === "hypothesisFails"
        ? `One of the angles is not acute (${x}° or ${y}° is 90° or more), so the hypothesis is not satisfied.`
        : `Both ${x}° and ${y}° are less than 90°, so both angles are acute and the hypothesis is satisfied.`,
      cls === "counter"
        ? `${x}° + ${y}° = ${x + y}°, which is not 90°, so the angles are not complementary.`
        : cls === "satisfies"
          ? `${x}° + ${y}° = 90°, so the angles are complementary and the conclusion holds here.`
          : `Because the hypothesis fails, this case cannot disprove the conjecture.`,
      { kind: "counterJudge", template, x, y }
    );
  }
  if (template === "rhombus") {
    const conjecture = "Every quadrilateral with four congruent sides is a square.";
    const cases: Record<JudgeClass, number[]> = {
      counter: [50, 60, 70, 110, 120],
      satisfies: [90],
      hypothesisFails: [],
    };
    const useCls: JudgeClass = cls === "hypothesisFails" ? "satisfies" : cls;
    const theta = pick(rng, cases[useCls]);
    return judgeShell(
      "CounterexampleJudge", conjecture,
      `a rhombus with four congruent sides and a vertex angle of ${theta}°`, useCls,
      "A rhombus has four congruent sides; it is a square only when its angles are right angles.",
      "The rhombus has four congruent sides, so the hypothesis is satisfied.",
      useCls === "counter"
        ? `Its vertex angle is ${theta}°, not 90°, so it is not a square.`
        : `Its vertex angle is 90°, so this rhombus is in fact a square, and the conclusion holds here.`,
      { kind: "counterJudge", template, angle: theta }
    );
  }
  const conjecture = "Every multiple of 4 is also a multiple of 8.";
  const cases: Record<JudgeClass, number[]> = {
    counter: [12, 20, 28, 36, 44],
    satisfies: [16, 24, 40, 48],
    hypothesisFails: [6, 10, 18, 26],
  };
  const n = pick(rng, cases[cls]);
  return judgeShell(
    "CounterexampleJudge", conjecture,
    `the number ${n}`, cls,
    "Check divisibility by 4 first, then by 8.",
    cls === "hypothesisFails"
      ? `${n} is not a multiple of 4, so the hypothesis is not satisfied.`
      : `${n} = 4 × ${n / 4}, so ${n} is a multiple of 4 and the hypothesis is satisfied.`,
    cls === "counter"
      ? `${n} divided by 8 is not a whole number, so ${n} is not a multiple of 8.`
      : cls === "satisfies"
        ? `${n} = 8 × ${n / 8}, so ${n} is a multiple of 8 and the conclusion holds here.`
        : `Because the hypothesis fails, this case cannot disprove the conjecture.`,
    { kind: "counterJudge", template, n }
  );
}

function makeChoose(rng: RNG): GeometryProblem {
  const template = pick(rng, ["mult8", "oddProduct", "formPrime"] as const);
  if (template === "mult8") {
    const bad = pick(rng, [12, 20, 28, 36, 44]);
    const good1 = pick(rng, [16, 24, 40, 48]);
    const good2 = pick(rng, [6, 10, 18, 26, 32]);
    const cases = shuffle3(rng, [bad, good1, good2]);
    const correct = cases.indexOf(bad);
    const list = cases.map((n, i) => `Case ${i + 1}: the number ${n}`).join(". ");
    return chooseShell(
      "Every multiple of 4 is also a multiple of 8.",
      `${list}.`,
      correct,
      "Only one case is a multiple of 4 that is not a multiple of 8.",
      { kind: "counterChoose", template, cases, correct }
    );
  }
  if (template === "oddProduct") {
    const badPair: [number, number] = [pick(rng, [3, 5, 7, 9]), pick(rng, [3, 5, 7, 9, 11])];
    const goodPairs: [number, number][] = [
      [pick(rng, [2, 4, 6, 8]), pick(rng, [3, 5, 7])],
      [pick(rng, [3, 5, 7]), pick(rng, [2, 4, 6, 10])],
    ];
    const pairs = shuffle3(rng, [badPair, goodPairs[0], goodPairs[1]]);
    const correct = pairs.indexOf(badPair);
    const flat = pairs.flatMap(([a, b]) => [a, b]);
    const list = pairs.map(([a, b], i) => `Case ${i + 1}: the numbers ${a} and ${b}`).join(". ");
    return chooseShell(
      "The product of two odd numbers is always even.",
      `${list}.`,
      correct,
      "A case disproves the conjecture only when both numbers are odd, making the product odd.",
      { kind: "counterChoose", template, cases: flat, correct }
    );
  }
  const badX = pick(rng, [4, 7, 10, 13]);
  const good = [pick(rng, [1, 2, 5]), pick(rng, [6, 8, 11])];
  const cases = shuffle3(rng, [badX, good[0], good[1]]);
  const correct = cases.indexOf(badX);
  const list = cases.map((x, i) => `Case ${i + 1}: x = ${x}, giving 2x + 1 = ${2 * x + 1}`).join(". ");
  return chooseShell(
    "For every whole number x, the expression 2x + 1 gives a prime number.",
    `${list}.`,
    correct,
    "Only one case makes 2x + 1 composite.",
    { kind: "counterChoose", template, cases, correct }
  );
}

function shuffle3<T>(rng: RNG, arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function chooseShell(
  conjecture: string,
  caseList: string,
  correct: number,
  note: string,
  verify: Record<string, number | string | number[]>
): GeometryProblem {
  const ans = `Case ${correct + 1}`;
  return {
    type: "GEO.2", subtype: "CounterexampleChoose",
    prompt: `Conjecture: ${conjecture} Three candidate cases follow. Exactly one of them is a counterexample. ${caseList} Which case is the counterexample? Answer: Case 1, Case 2, or Case 3.`,
    given: { conjecture },
    find: "the counterexample case",
    answer: ans,
    steps: [
      step("A counterexample must satisfy the hypothesis and fail the conclusion; test each case against both parts.", "Definition of counterexample."),
      step(note, "Apply the definition to each case."),
      step(`The counterexample is ${ans}.`, "Only one case meets both requirements.", [{ label: "case", answer: ans }]),
    ],
    verify,
  };
}

function makeBuild(rng: RNG): GeometryProblem {
  const template = pick(rng, ["euler", "sumSquares", "productEven"] as const);
  if (template === "euler") {
    const x = pick(rng, [40, 41]);
    const v = x * x + x + 41;
    const f = smallestFactor(v);
    const answer = `x = ${x} gives ${v} = ${f} × ${v / f}, which is composite`;
    return {
      type: "GEO.2", subtype: "CounterexampleBuild",
      prompt: "Conjecture: For every whole number x, the expression x² + x + 41 gives a prime number. (It works for x = 0, 1, 2, and many more.) Construct a counterexample that disproves the conjecture.",
      given: { conjecture: "x² + x + 41 is always prime" },
      find: "a counterexample",
      answer,
      steps: [
        step("Look for an x that forces a common factor. When x = 41, every term of x² + x + 41 contains 41; the value x = 40 works as well, giving 41².", "Search for a pattern that breaks the conjecture."),
        step(`For x = ${x}: x² + x + 41 = ${v}.`, "Substitution."),
        step(`${v} = ${f} × ${v / f}, so ${v} has a factor other than 1 and itself and is not prime.`, "Definition of prime number.", [
          { label: "counterexample", answer },
        ]),
        step("One counterexample is enough to disprove the conjecture.", "A conjecture is false if a single counterexample exists."),
      ],
      verify: { kind: "counterBuild", template, x },
    };
  }
  if (template === "sumSquares") {
    const pairs: [number, number][] = [[2, 3], [4, 5], [5, 6], [3, 5], [2, 4], [4, 6], [3, 6], [2, 5]];
    const [a, b] = pick(rng, pairs);
    const s = a * a + b * b;
    const answer = `${a}² + ${b}² = ${s}, which is not a perfect square`;
    return {
      type: "GEO.2", subtype: "CounterexampleBuild",
      prompt: "Conjecture: The sum of the squares of two whole numbers is always a perfect square. Construct a counterexample that disproves the conjecture.",
      given: { conjecture: "a² + b² is always a perfect square" },
      find: "a counterexample",
      answer,
      steps: [
        step("Try small whole numbers and compute the sum of their squares; most sums fall strictly between two consecutive perfect squares.", "Test small cases against the conjecture."),
        step(`${a}² + ${b}² = ${a * a} + ${b * b} = ${s}.`, "Substitution."),
        step(`${s} lies between ${Math.floor(Math.sqrt(s))}² = ${Math.floor(Math.sqrt(s)) ** 2} and ${Math.floor(Math.sqrt(s)) + 1}² = ${(Math.floor(Math.sqrt(s)) + 1) ** 2}, so ${s} is not a perfect square.`, "A perfect square is the square of a whole number.", [
          { label: "counterexample", answer },
        ]),
        step("One counterexample is enough to disprove the conjecture.", "A conjecture is false if a single counterexample exists."),
      ],
      verify: { kind: "counterBuild", template, a, b },
    };
  }
  const a = pick(rng, [4, 6, 8, 10, 12]);
  const b = pick(rng, [3, 5, 7, 9]);
  const answer = `${a} × ${b} = ${a * b} is even, but ${b} is odd`;
  return {
    type: "GEO.2", subtype: "CounterexampleBuild",
    prompt: "Conjecture: If the product of two whole numbers is even, then both of the numbers are even. Construct a counterexample that disproves the conjecture.",
    given: { conjecture: "an even product forces both factors even" },
    find: "a counterexample",
    answer,
    steps: [
      step("A product is even as soon as one factor is even, so pair an even number with an odd number.", "Use the structure of even products."),
      step(`${a} × ${b} = ${a * b}.`, "Substitution."),
      step(`The product ${a * b} is even, so the hypothesis holds, but ${b} is odd, so the conclusion fails.`, "Check the hypothesis and the conclusion.", [
        { label: "counterexample", answer },
      ]),
      step("One counterexample is enough to disprove the conjecture.", "A conjecture is false if a single counterexample exists."),
    ],
    verify: { kind: "counterBuild", template, a, b },
  };
}

function smallestFactor(v: number): number {
  for (let f = 2; f < v; f++) if (v % f === 0) return f;
  return v;
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const COUNTEREXAMPLES_LESSON_POOL: MakerEntry[] = [
  M("CounterexampleJudge", 1, (rng) => makeJudge(rng)),
  M("CounterexampleChoose", 2, (rng) => makeChoose(rng)),
  M("CounterexampleBuild", 3, (rng) => makeBuild(rng)),
];

export function generateCounterexamplesProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only
    ? COUNTEREXAMPLES_LESSON_POOL.filter((e) => only.includes(e.subtype))
    : COUNTEREXAMPLES_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

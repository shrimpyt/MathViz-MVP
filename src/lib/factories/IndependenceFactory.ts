// IndependenceFactory.ts
// Lesson ch15-4: Independent Events in Context (TEKS G.13(E)).
// Events A and B are independent exactly when P(A and B) = P(A) × P(B).
// D1 tests that equation with stated probabilities (fractions or
// percents). D2 uses independence to compute a joint probability in a
// concrete setting (spinner and coin, two dice, a draw with
// replacement). D3 contrasts the same two draws made with and without
// replacement, where only the replaced version has independent draws.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, frac, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

interface FracVal { n: number; d: number }

const FRAC_POOL: FracVal[] = [
  { n: 1, d: 2 }, { n: 1, d: 3 }, { n: 2, d: 3 }, { n: 1, d: 4 }, { n: 3, d: 4 },
  { n: 1, d: 5 }, { n: 2, d: 5 }, { n: 3, d: 5 }, { n: 4, d: 5 }, { n: 1, d: 6 },
  { n: 5, d: 6 }, { n: 3, d: 10 }, { n: 7, d: 10 },
];

function makeIndependenceTest(rng: RNG): GeometryProblem {
  if (rng() < 0.5) {
    // Percent form.
    const pairs: [number, number][] = [
      [40, 50], [20, 50], [60, 50], [30, 40], [25, 40], [70, 30], [80, 25], [45, 20], [35, 20], [90, 30],
    ];
    const [pa, pb] = pick(rng, pairs);
    const product = (pa * pb) / 100; // always an integer for these pairs
    let independent = rng() < 0.5;
    let pab = product;
    if (!independent) {
      // Perturb the joint value, keeping it a legal joint probability:
      // positive, at most min(P(A), P(B)), at least P(A) + P(B) − 100.
      const legal = (v: number) => v > 0 && v <= Math.min(pa, pb) && v >= pa + pb - 100 && v !== product;
      const cand = [5, -5, 10, -10, 3, -3, 15, -15].map((d) => product + d).find(legal);
      if (cand === undefined) independent = true;
      else pab = cand;
    }
    const ans = independent ? "independent" : "dependent";
    return {
      type: "GEO.15", subtype: "IndependenceTest",
      prompt: `For two events from a survey, P(A) = ${pa}%, P(B) = ${pb}%, and P(A and B) = ${pab}%. Are the events independent or dependent? Answer with one word.`,
      given: { "P(A)": `${pa}%`, "P(B)": `${pb}%`, "P(A and B)": `${pab}%` },
      find: "independent or dependent",
      answer: ans,
      steps: [
        step("Events are independent exactly when P(A and B) equals P(A) × P(B).", "Definition of independent events."),
        step(`P(A) × P(B) = ${pa}% × ${pb}% = ${product}%.`, "Multiply the separate probabilities (as percents, divide by 100 once)."),
        step(
          independent
            ? `P(A and B) = ${pab}% matches the product, so the events are independent.`
            : `P(A and B) = ${pab}% does not match the product ${product}%, so the events are dependent.`,
          "Compare with the stated joint probability.",
          [{ label: "answer", answer: ans }]
        ),
      ],
      verify: { kind: "indepTestPct", pa, pb, pab },
    };
  }
  // Fraction form.
  const pa = pick(rng, FRAC_POOL);
  const pb = pick(rng, FRAC_POOL);
  const prodN = pa.n * pb.n;
  const prodD = pa.d * pb.d;
  let independent = rng() < 0.5;
  let pabN = prodN;
  if (!independent) {
    // Keep P(A and B) a legal joint probability: positive, at most
    // min(P(A), P(B)), and at least P(A) + P(B) − 1 (all over prodD).
    const lowerN = pa.n * pb.d + pb.n * pa.d - pa.d * pb.d;
    const legal = (num: number) =>
      num > 0 && num >= lowerN && num * pa.d <= pa.n * prodD && num * pb.d <= pb.n * prodD && num !== prodN;
    const cand = [1, -1, 2, -2, 3, -3, 4, -4].map((d) => prodN + d).find(legal);
    if (cand === undefined) independent = true;
    else pabN = cand;
  }
  const pabD = prodD;
  const ans = independent ? "independent" : "dependent";
  const prodStr = frac(prodN, prodD);
  const pabStr = frac(pabN, pabD);
  return {
    type: "GEO.15", subtype: "IndependenceTest",
    prompt: `For two events from a survey, P(A) = ${frac(pa.n, pa.d)}, P(B) = ${frac(pb.n, pb.d)}, and P(A and B) = ${pabStr}. Are the events independent or dependent? Answer with one word.`,
    given: { "P(A)": frac(pa.n, pa.d), "P(B)": frac(pb.n, pb.d), "P(A and B)": pabStr },
    find: "independent or dependent",
    answer: ans,
    steps: [
      step("Events are independent exactly when P(A and B) equals P(A) × P(B).", "Definition of independent events."),
      step(`P(A) × P(B) = ${frac(pa.n, pa.d)} × ${frac(pb.n, pb.d)} = ${prodStr}.`, "Multiply the separate probabilities."),
      step(
        independent
          ? `P(A and B) = ${pabStr} matches the product, so the events are independent.`
          : `P(A and B) = ${pabStr} does not match the product ${prodStr}, so the events are dependent.`,
        "Compare with the stated joint probability.",
        [{ label: "answer", answer: ans }]
      ),
    ],
    verify: { kind: "indepTest", paN: pa.n, paD: pa.d, pbN: pb.n, pbD: pb.d, pabN, pabD },
  };
}

function makeIndependentJoint(rng: RNG): GeometryProblem {
  const form = pick(rng, ["spinnerCoin", "twoDice", "drawReplace"] as const);
  if (form === "spinnerCoin") {
    const sections = pick(rng, [4, 6, 8]);
    const blue = randInt(rng, 1, sections - 1);
    const ans = frac(blue, sections * 2);
    return {
      type: "GEO.15", subtype: "IndependentJoint",
      prompt: `A spinner has ${sections} equal sections, ${blue} of them blue. The spinner is spun once and a fair coin is flipped once. Find the probability of landing on blue and flipping heads. Give the answer as a reduced fraction.`,
      given: { sections, blue },
      find: "P(blue and heads)",
      answer: ans,
      steps: [
        step("The spin and the flip do not affect each other, so the events are independent and their probabilities multiply.", "Independent events multiply."),
        step(`P(blue) = ${frac(blue, sections)} and P(heads) = 1/2.`, "Separate probabilities."),
        step(`P(blue and heads) = ${frac(blue, sections)} × 1/2 = ${ans}.`, "Multiply and reduce.", [{ label: "P", answer: ans }]),
      ],
      verify: { kind: "jointProb", f1: blue, t1: sections, f2: 1, t2: 2 },
    };
  }
  if (form === "twoDice") {
    const events = [
      { name: "a 3", fav: 1 },
      { name: "an even number", fav: 3 },
      { name: "a number greater than 4", fav: 2 },
      { name: "a prime number", fav: 3 },
    ] as const;
    const e1 = pick(rng, events);
    const e2 = pick(rng, events);
    const ans = frac(e1.fav * e2.fav, 36);
    return {
      type: "GEO.15", subtype: "IndependentJoint",
      prompt: `Two fair six-sided dice are rolled. Find the probability that the first die shows ${e1.name} and the second die shows ${e2.name}. Give the answer as a reduced fraction.`,
      given: { first: e1.name, second: e2.name },
      find: "joint probability",
      answer: ans,
      steps: [
        step("The two dice do not affect each other, so the events are independent and their probabilities multiply.", "Independent events multiply."),
        step(`P(first) = ${frac(e1.fav, 6)} and P(second) = ${frac(e2.fav, 6)}.`, "Separate probabilities."),
        step(`P(both) = ${frac(e1.fav, 6)} × ${frac(e2.fav, 6)} = ${ans}.`, "Multiply and reduce.", [{ label: "P", answer: ans }]),
      ],
      verify: { kind: "jointProb", f1: e1.fav, t1: 6, f2: e2.fav, t2: 6 },
    };
  }
  const red = randInt(rng, 2, 8);
  const blue = randInt(rng, 2, 8);
  const total = red + blue;
  const ans = frac(red * red, total * total);
  return {
    type: "GEO.15", subtype: "IndependentJoint",
    prompt: `A bag contains ${red} red and ${blue} blue marbles. A marble is drawn, replaced, and then a second marble is drawn. Find the probability that both marbles are red. Give the answer as a reduced fraction.`,
    given: { red, blue },
    find: "P(red and red)",
    answer: ans,
    steps: [
      step("Replacing the first marble restores the bag, so the two draws are independent and their probabilities multiply.", "Independent events multiply."),
      step(`Each draw has P(red) = ${frac(red, total)}.`, "Probability of one draw."),
      step(`P(red and red) = ${frac(red, total)} × ${frac(red, total)} = ${ans}.`, "Multiply and reduce.", [{ label: "P", answer: ans }]),
    ],
    verify: { kind: "jointProb", f1: red, t1: total, f2: red, t2: total },
  };
}

function makeReplacementContrast(rng: RNG): GeometryProblem {
  const red = randInt(rng, 2, 7);
  const blue = randInt(rng, 2, 7);
  const total = red + blue;
  const withStr = frac(red * red, total * total);
  const withoutStr = frac(red * (red - 1), total * (total - 1));
  const answer = `with replacement ${withStr}, without replacement ${withoutStr}`;
  return {
    type: "GEO.15", subtype: "ReplacementContrast",
    prompt: `A bag contains ${red} red and ${blue} blue marbles. Two marbles are drawn, and you want the probability that both are red. Compute it two ways and give the answer in the form: with replacement p, without replacement q. (a) The first marble is replaced before the second draw. (b) The first marble is not replaced.`,
    given: { red, blue },
    find: "P(both red), both ways",
    answer,
    steps: [
      step(`With replacement, the bag is restored, so the draws are independent: P = ${frac(red, total)} × ${frac(red, total)} = ${withStr}.`, "Independent draws multiply."),
      step(`Without replacement, the first red marble is gone: P = ${frac(red, total)} × ${frac(red - 1, total - 1)} = ${withoutStr}.`, "The second probability is conditional on the first draw."),
      step(`The two answers differ because replacement keeps the draws independent, while drawing without replacement makes the second draw depend on the first. Answers: ${answer}.`, "Compare the two models.", [{ label: "answer", answer }]),
    ],
    verify: { kind: "replacementContrast", r: red, total },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const INDEPENDENCE_LESSON_POOL: MakerEntry[] = [
  M("IndependenceTest", 1, (rng) => makeIndependenceTest(rng)),
  M("IndependentJoint", 2, (rng) => makeIndependentJoint(rng)),
  M("ReplacementContrast", 3, (rng) => makeReplacementContrast(rng)),
];

export function generateIndependenceProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only
    ? INDEPENDENCE_LESSON_POOL.filter((e) => only.includes(e.subtype))
    : INDEPENDENCE_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

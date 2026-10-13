// ProbabilityConceptsFactory.ts
// Lesson ch15-1: Experimental and Theoretical Probability (TEKS G.13(B)).
// The two ideas are kept strictly separate, the way a teacher has to:
// THEORETICAL probability comes from counting equally likely outcomes in the
// sample space (no experiment performed); EXPERIMENTAL probability comes from
// past trials (relative frequency). Comparison problems name both, and
// prediction problems say which one is being used as the estimate.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, frac, num, sampleFromPool,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

function makeTheoretical(rng: RNG, difficulty: Difficulty): GeometryProblem {
  const form = pick(rng, ["marbles", "die", "cards", "spinner"] as const);
  if (form === "marbles") {
    const red = randInt(rng, 2, 7);
    const blue = randInt(rng, 2, 7);
    const green = randInt(rng, 1, 6);
    const total = red + blue + green;
    const color = pick(rng, ["red", "blue"] as const);
    const fav = color === "red" ? red : blue;
    return {
      type: "GEO.15", subtype: "TheoreticalProbability",
      prompt: `A bag contains ${red} red, ${blue} blue, and ${green} green marbles. One marble is drawn at random. Find the theoretical probability of drawing a ${color} marble. Give the answer as a reduced fraction.`,
      given: { red, blue, green },
      find: `P(${color})`,
      answer: frac(fav, total),
      steps: [
        step("Theoretical probability = (number of favorable outcomes) ÷ (total number of equally likely outcomes).", "Definition of theoretical probability."),
        step(`There are ${fav} ${color} marbles out of ${total} total marbles.`, "Count the sample space and the favorable outcomes."),
        step(`P(${color}) = ${fav}/${total} = ${frac(fav, total)}.`, "Reduce the fraction.", [
          { label: "P", answer: frac(fav, total) },
        ]),
      ],
      verify: { kind: "theoretical", fav, total },
    };
  }
  if (form === "die") {
    const events = [
      { name: "an even number", fav: 3 },
      { name: "a number greater than 4", fav: 2 },
      { name: "a prime number (2, 3, or 5)", fav: 3 },
      { name: "a 1", fav: 1 },
      { name: "a number less than 5", fav: 4 },
    ] as const;
    const e = pick(rng, events);
    return {
      type: "GEO.15", subtype: "TheoreticalProbability",
      prompt: `A fair six-sided die is rolled once. Find the theoretical probability of rolling ${e.name}. Give the answer as a reduced fraction.`,
      given: { outcomes: 6 },
      find: "probability",
      answer: frac(e.fav, 6),
      steps: [
        step("A fair die has 6 equally likely outcomes: 1, 2, 3, 4, 5, 6.", "Sample space of a fair die."),
        step(`${e.fav} of the outcomes match the event.`, "Count favorable outcomes."),
        step(`P = ${e.fav}/6 = ${frac(e.fav, 6)}.`, "Theoretical probability.", [{ label: "P", answer: frac(e.fav, 6) }]),
      ],
      verify: { kind: "theoretical", fav: e.fav, total: 6 },
    };
  }
  if (form === "cards") {
    const events = [
      { name: "a red card", fav: 26 },
      { name: "a king", fav: 4 },
      { name: "a heart", fav: 13 },
      { name: "a face card (jack, queen, or king)", fav: 12 },
    ] as const;
    const e = pick(rng, events);
    return {
      type: "GEO.15", subtype: "TheoreticalProbability",
      prompt: `One card is drawn at random from a standard 52-card deck. Find the theoretical probability of drawing ${e.name}. Give the answer as a reduced fraction.`,
      given: { deck: 52 },
      find: "probability",
      answer: frac(e.fav, 52),
      steps: [
        step("Every card is equally likely, so use favorable ÷ 52.", "Definition of theoretical probability."),
        step(`There are ${e.fav} favorable cards in the deck.`, "Count favorable outcomes."),
        step(`P = ${e.fav}/52 = ${frac(e.fav, 52)}.`, "Reduce the fraction.", [{ label: "P", answer: frac(e.fav, 52) }]),
      ],
      verify: { kind: "theoretical", fav: e.fav, total: 52 },
    };
  }
  // spinner with equal sections, one color occupying s sections
  const sections = pick(rng, [6, 8, 10, 12]);
  const fav = randInt(rng, 1, sections - 2);
  const sectorAngle = Math.round((fav / sections) * 360);
  if (difficulty >= 2) {
    const pct = (fav / sections) * 100;
    return {
      type: "GEO.15", subtype: "TheoreticalProbability",
      prompt: `A spinner is divided into ${sections} equal sections. ${fav} of the sections are blue. Find the theoretical probability of landing on blue, as a percent.`,
      given: { sections, blue: fav },
      find: "P(blue) as a percent",
      answer: `${num(pct)}%`,
      steps: [
        step("Equal sections mean equally likely outcomes.", "Theoretical probability with a fair spinner."),
        step(`P(blue) = ${fav}/${sections} = ${frac(fav, sections)}.`, "Favorable over total."),
        step(`As a percent: ${num(pct)}%.`, "Convert the fraction to a percent.", [{ label: "P", answer: `${num(pct)}%` }]),
      ],
      svgParams: { kind: "ShadedSector", sectorAngle },
      verify: { kind: "theoreticalPct", fav, total: sections },
    };
  }
  return {
    type: "GEO.15", subtype: "TheoreticalProbability",
    prompt: `A spinner is divided into ${sections} equal sections. ${fav} of the sections are blue. Find the theoretical probability of landing on blue as a reduced fraction.`,
    given: { sections, blue: fav },
    find: "P(blue)",
    answer: frac(fav, sections),
    steps: [
      step("Equal sections mean equally likely outcomes.", "Theoretical probability with a fair spinner."),
      step(`P(blue) = ${fav}/${sections} = ${frac(fav, sections)}.`, "Favorable over total, reduced.", [
        { label: "P", answer: frac(fav, sections) },
      ]),
    ],
    svgParams: { kind: "ShadedSector", sectorAngle },
    verify: { kind: "theoretical", fav, total: sections },
  };
}

function makeExperimental(rng: RNG): GeometryProblem {
  const trials = pick(rng, [40, 50, 60, 80, 100]);
  const hits = randInt(rng, 5, trials - 10);
  const ctx = pick(rng, [
    { event: "red", setup: `A spinner was spun ${trials} times and landed on red ${hits} times.` },
    { event: "heads", setup: `A coin was flipped ${trials} times and landed on heads ${hits} times.` },
    { event: "a 6", setup: `A die was rolled ${trials} times and showed a 6 exactly ${hits} times.` },
  ] as const);
  return {
    type: "GEO.15", subtype: "ExperimentalProbability",
    prompt: `${ctx.setup} Based on this experiment, what is the experimental probability of the outcome "${ctx.event}"? Give the answer as a reduced fraction.`,
    given: { trials, hits },
    find: "experimental probability",
    answer: frac(hits, trials),
    steps: [
      step("Experimental probability = (times the event occurred) ÷ (total trials), it comes from data, not from counting a sample space.", "Definition of experimental (relative-frequency) probability."),
      step(`P ≈ ${hits}/${trials}.`, "Substitute the trial data."),
      step(`P ≈ ${frac(hits, trials)}.`, "Reduce the fraction.", [{ label: "P", answer: frac(hits, trials) }]),
    ],
    verify: { kind: "experimental", hits, trials },
  };
}

function makePredict(rng: RNG): GeometryProblem {
  // Predict future outcomes using an experimental probability.
  const base = pick(rng, [
    { trials: 50, hits: 12, event: "the basketball player making a free throw", who: "the player" },
    { trials: 80, hits: 30, event: "a bus arriving on time", who: "the bus" },
    { trials: 40, hits: 10, event: "a raffle ticket winning a prize", who: "a ticket" },
    { trials: 60, hits: 45, event: "a seed germinating", who: "a seed" },
  ] as const);
  const futureMult = randInt(rng, 2, 5);
  const future = base.trials * futureMult;
  const predicted = base.hits * futureMult;
  return {
    type: "GEO.15", subtype: "PredictFromData",
    prompt: `In the last ${base.trials} trials, the event "${base.event}" happened ${base.hits} times. Use the experimental probability to predict how many times it will happen in the next ${future} trials.`,
    given: { trials: base.trials, hits: base.hits, future },
    find: "predicted count",
    answer: String(predicted),
    steps: [
      step("First find the experimental probability from the past data.", "Experimental probability = successes ÷ trials."),
      step(`P ≈ ${base.hits}/${base.trials} = ${frac(base.hits, base.trials)}.`, "Reduce."),
      step(`Predicted count = P × ${future} = ${frac(base.hits, base.trials)} × ${future} = ${predicted}.`, "Use the experimental probability as the estimate for future trials.", [
        { label: "predicted", answer: String(predicted) },
      ]),
    ],
    verify: { kind: "predict", hits: base.hits, trials: base.trials, future },
  };
}

function makeCompare(rng: RNG): GeometryProblem {
  // Theoretical blue = 1/4 on an 8-section spinner (2 blue). Experiment given.
  const trials = pick(rng, [40, 80, 120]);
  const expected = trials / 4;
  const hits = expected + pick(rng, [-6, -4, -3, 3, 4, 5, 7]);
  return {
    type: "GEO.15", subtype: "CompareProbabilities",
    prompt: `A spinner has 8 equal sections, 2 of which are blue. The spinner was spun ${trials} times and landed on blue ${hits} times. What is the EXPERIMENTAL probability of landing on blue (reduced fraction)? The theoretical probability is 1/4, your answer should come from the data.`,
    given: { trials, hits, theoretical: "1/4" },
    find: "experimental probability",
    answer: frac(hits, trials),
    steps: [
      step("Theoretical probability (1/4) comes from the equally likely sections. Experimental probability comes only from the trials performed.", "Theoretical vs experimental probability."),
      step(`Experimental P(blue) = ${hits}/${trials} = ${frac(hits, trials)}.`, "Relative frequency from data.", [
        { label: "P", answer: frac(hits, trials) },
      ]),
      step("With more trials, the experimental probability usually gets closer to 1/4.", "Law of Large Numbers."),
    ],
    verify: { kind: "experimental", hits, trials },
  };
}

export const PROBABILITY_LESSON_POOL: MakerEntry[] = [
  M("TheoreticalProbability", 1, (rng, d) => makeTheoretical(rng, d)),
  M("ExperimentalProbability", 1, (rng) => makeExperimental(rng)),
  M("PredictFromData", 2, (rng) => makePredict(rng)),
  M("CompareProbabilities", 3, (rng) => makeCompare(rng)),
];

export function generateProbabilityConceptsProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? PROBABILITY_LESSON_POOL.filter((e) => only.includes(e.subtype)) : PROBABILITY_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

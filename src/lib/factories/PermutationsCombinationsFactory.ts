// PermutationsCombinationsFactory.ts
// Lesson ch15-2: Permutations & Combinations (TEKS G.13(A)).
// The teaching point is the fork between the two counts: a PERMUTATION
// arranges objects in order (order matters), a COMBINATION selects objects
// (order does not matter). D1 computes nPr and nCr directly. D2 states a
// situation and the answer names the method AND the count. D3 mixes
// real contexts (committees, lineups, codes) and two-stage counts handled
// with the Fundamental Counting Principle. All counts are kept small and
// exact; factorials are expanded in the steps so students see the
// cancellation in combinations.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

function perm(n: number, r: number): number {
  let out = 1;
  for (let i = 0; i < r; i++) out *= n - i;
  return out;
}

function comb(n: number, r: number): number {
  let out = 1;
  for (let i = 0; i < r; i++) out = (out * (n - i)) / (i + 1);
  return out;
}

function fallingStr(n: number, r: number): string {
  const parts: string[] = [];
  for (let i = 0; i < r; i++) parts.push(String(n - i));
  return parts.join(" × ");
}

function makePermutationCompute(rng: RNG): GeometryProblem {
  const n = randInt(rng, 4, 9);
  const r = randInt(rng, 2, Math.min(3, n - 1));
  const value = perm(n, r);
  return {
    type: "GEO.15", subtype: "PermutationCompute",
    prompt: `Evaluate the permutation ${n}P${r}: the number of ways to arrange ${r} objects chosen from ${n} different objects, in order.`,
    given: { n, r },
    find: `${n}P${r}`,
    answer: String(value),
    steps: [
      step(`A permutation counts arrangements, so use ${n}P${r} = ${n}! / (${n} − ${r})!.`, "Permutation formula."),
      step(`${n}P${r} = ${fallingStr(n, r)} (the factors ${n} down to ${n - r + 1}).`, "Expand the factorials and cancel."),
      step(`${n}P${r} = ${value}.`, "Multiply.", [{ label: "value", answer: String(value) }]),
    ],
    verify: { kind: "perm", n, r },
  };
}

function makeCombinationCompute(rng: RNG): GeometryProblem {
  const n = randInt(rng, 5, 10);
  const r = randInt(rng, 2, Math.min(4, n - 2));
  const value = comb(n, r);
  return {
    type: "GEO.15", subtype: "CombinationCompute",
    prompt: `Evaluate the combination ${n}C${r}: the number of ways to choose ${r} objects from ${n} different objects, where order does not matter.`,
    given: { n, r },
    find: `${n}C${r}`,
    answer: String(value),
    steps: [
      step(`A combination counts selections, so use ${n}C${r} = ${n}! / (${r}! (${n} − ${r})!).`, "Combination formula."),
      step(`${n}C${r} = (${fallingStr(n, r)}) / (${r}!) = ${perm(n, r)} / ${perm(r, r)}.`, "Expand the numerator and divide by the arrangements of the chosen objects."),
      step(`${n}C${r} = ${value}.`, "Divide.", [{ label: "value", answer: String(value) }]),
    ],
    verify: { kind: "comb", n, r },
  };
}

interface Situation {
  text: (n: number, r: number) => string;
  method: "permutation" | "combination";
  why: string;
}

const SITUATIONS: Situation[] = [
  {
    text: (n, r) => `A club with ${n} members elects a president, a vice-president, and a treasurer (${r} different offices in all). How many different slates of officers are possible?`,
    method: "permutation",
    why: "The offices are different, so the same members in a different order give a different slate: order matters.",
  },
  {
    text: (n, r) => `A teacher chooses ${r} students from a class of ${n} to serve on a clean-up crew. How many different crews are possible?`,
    method: "combination",
    why: "A crew is the same no matter the order in which its members were picked: order does not matter.",
  },
  {
    text: (n, r) => `How many ways can ${r} books be arranged in a row on a shelf, choosing the books from ${n} different books?`,
    method: "permutation",
    why: "Positions on the shelf are different, so rearranging the same books gives a new arrangement: order matters.",
  },
  {
    text: (n, r) => `A pizzeria offers ${n} toppings. How many different pizzas can be made by choosing ${r} of the toppings?`,
    method: "combination",
    why: "The toppings on a pizza are the same set no matter the order they were chosen in: order does not matter.",
  },
  {
    text: (n, r) => `In a race with ${n} runners, gold, silver, and bronze medals (${r} places) are awarded. How many different medal finishes are possible?`,
    method: "permutation",
    why: "First, second, and third place are different, so order matters.",
  },
  {
    text: (n, r) => `A lottery draw selects ${r} winning balls from ${n} numbered balls, and the order drawn does not matter. How many different draws are possible?`,
    method: "combination",
    why: "Only the set of balls matters, not the order drawn: order does not matter.",
  },
];

function makeDecide(rng: RNG): GeometryProblem {
  const s = pick(rng, SITUATIONS);
  const isPerm = s.method === "permutation";
  const n = randInt(rng, 6, 10);
  const r = 3;
  const value = isPerm ? perm(n, r) : comb(n, r);
  const answer = `${s.method}, ${value}`;
  return {
    type: "GEO.15", subtype: "PermutationOrCombination",
    prompt: `${s.text(n, r)} First decide which counting method applies, then give the count. Answer in the form: method, count.`,
    given: { situation: s.text(n, r) },
    find: "method and count",
    answer,
    steps: [
      step(s.why, "Decide whether order matters."),
      step(`So the count is a ${s.method}: ${isPerm ? `${n}P${r}` : `${n}C${r}`}.`, isPerm ? "Permutation formula." : "Combination formula."),
      step(`The count is ${value}.`, "Evaluate.", [{ label: "answer", answer }]),
    ],
    verify: { kind: "permDecide", method: s.method, n, r },
  };
}

function makeCountingContext(rng: RNG): GeometryProblem {
  const form = pick(rng, ["committee", "lineup", "podium"] as const);
  if (form === "committee") {
    const n = randInt(rng, 8, 12);
    const r = pick(rng, [3, 4]);
    const value = comb(n, r);
    return {
      type: "GEO.15", subtype: "CountingContexts",
      prompt: `A committee of ${r} people is to be chosen from ${n} volunteers. How many different committees are possible?`,
      given: { volunteers: n, chosen: r },
      find: "number of committees",
      answer: String(value),
      steps: [
        step("A committee is a set of people, the order of choosing does not matter, so this is a combination.", "Combination: order does not matter."),
        step(`${n}C${r} = (${fallingStr(n, r)}) / ${r}! = ${perm(n, r)} / ${perm(r, r)}.`, "Combination formula."),
        step(`There are ${value} different committees.`, "Divide.", [{ label: "committees", answer: String(value) }]),
      ],
      verify: { kind: "comb", n, r },
    };
  }
  if (form === "lineup") {
    const n = randInt(rng, 7, 11);
    const r = pick(rng, [3, 4]);
    const value = perm(n, r);
    return {
      type: "GEO.15", subtype: "CountingContexts",
      prompt: `${n} finalists stand in a row for a photo, but only the first ${r} positions are filled from the full group one finalist at a time: in how many different orders can ${r} of the ${n} finalists be lined up?`,
      given: { finalists: n, positions: r },
      find: "number of lineups",
      answer: String(value),
      steps: [
        step("Positions in the row are different, so order matters and this is a permutation.", "Permutation: order matters."),
        step(`${n}P${r} = ${fallingStr(n, r)}.`, "Permutation formula."),
        step(`There are ${value} different lineups.`, "Multiply.", [{ label: "lineups", answer: String(value) }]),
      ],
      verify: { kind: "perm", n, r },
    };
  }
  const n = randInt(rng, 6, 9);
  const r = 3;
  const value = perm(n, r);
  return {
    type: "GEO.15", subtype: "CountingContexts",
    prompt: `${n} athletes compete in a final. How many different ways can the first, second, and third place finishes occur?`,
    given: { athletes: n, places: r },
    find: "number of finishes",
    answer: String(value),
    steps: [
      step("The three places are different awards, so order matters and this is a permutation.", "Permutation: order matters."),
      step(`${n}P${r} = ${fallingStr(n, r)}.`, "Permutation formula."),
      step(`There are ${value} different finishes.`, "Multiply.", [{ label: "finishes", answer: String(value) }]),
    ],
    verify: { kind: "perm", n, r },
  };
}

function makeTwoStage(rng: RNG): GeometryProblem {
  const form = pick(rng, ["code", "outfit", "menu"] as const);
  if (form === "code") {
    const letters = pick(rng, [4, 5, 6]);
    const digits = 10;
    const total = letters * letters * digits;
    return {
      type: "GEO.15", subtype: "TwoStageCount",
      prompt: `A code consists of 2 letters chosen from the ${letters} letters A through ${String.fromCharCode(64 + letters)} (letters may repeat), followed by 1 digit from 0 to 9. How many different codes are possible?`,
      given: { letters, digits },
      find: "number of codes",
      answer: String(total),
      steps: [
        step(`Stage 1 (first letter): ${letters} choices. Stage 2 (second letter): ${letters} choices, since repeats are allowed. Stage 3 (digit): ${digits} choices.`, "Count the choices at each stage."),
        step(`By the Fundamental Counting Principle, multiply: ${letters} × ${letters} × ${digits}.`, "Fundamental Counting Principle."),
        step(`There are ${total} different codes.`, "Multiply.", [{ label: "codes", answer: String(total) }]),
      ],
      verify: { kind: "productCount", factors: [letters, letters, digits] },
    };
  }
  if (form === "outfit") {
    const shirts = randInt(rng, 3, 6);
    const pants = randInt(rng, 2, 5);
    const hats = randInt(rng, 2, 4);
    const total = shirts * pants * hats;
    return {
      type: "GEO.15", subtype: "TwoStageCount",
      prompt: `A student packs ${shirts} shirts, ${pants} pairs of pants, and ${hats} hats. An outfit is one shirt, one pair of pants, and one hat. How many different outfits are possible?`,
      given: { shirts, pants, hats },
      find: "number of outfits",
      answer: String(total),
      steps: [
        step(`The choices are independent stages: ${shirts} shirts, then ${pants} pants, then ${hats} hats.`, "Count the choices at each stage."),
        step(`Multiply the stage counts: ${shirts} × ${pants} × ${hats}.`, "Fundamental Counting Principle."),
        step(`There are ${total} different outfits.`, "Multiply.", [{ label: "outfits", answer: String(total) }]),
      ],
      verify: { kind: "productCount", factors: [shirts, pants, hats] },
    };
  }
  const mains = randInt(rng, 3, 5);
  const sides = randInt(rng, 4, 7);
  const drinks = randInt(rng, 2, 4);
  const total = mains * sides * drinks;
  return {
    type: "GEO.15", subtype: "TwoStageCount",
    prompt: `A lunch special lets you choose 1 of ${mains} main dishes, 1 of ${sides} side dishes, and 1 of ${drinks} drinks. How many different lunches are possible?`,
    given: { mains, sides, drinks },
    find: "number of lunches",
    answer: String(total),
    steps: [
      step(`Three independent stages with ${mains}, ${sides}, and ${drinks} choices.`, "Count the choices at each stage."),
      step(`Multiply: ${mains} × ${sides} × ${drinks}.`, "Fundamental Counting Principle."),
      step(`There are ${total} different lunches.`, "Multiply.", [{ label: "lunches", answer: String(total) }]),
    ],
    verify: { kind: "productCount", factors: [mains, sides, drinks] },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const PERMUTATIONS_COMBINATIONS_LESSON_POOL: MakerEntry[] = [
  M("PermutationCompute", 1, (rng) => makePermutationCompute(rng)),
  M("CombinationCompute", 1, (rng) => makeCombinationCompute(rng)),
  M("PermutationOrCombination", 2, (rng) => makeDecide(rng)),
  M("CountingContexts", 3, (rng) => makeCountingContext(rng)),
  M("TwoStageCount", 3, (rng) => makeTwoStage(rng)),
];

export function generatePermutationsCombinationsProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only
    ? PERMUTATIONS_COMBINATIONS_LESSON_POOL.filter((e) => only.includes(e.subtype))
    : PERMUTATIONS_COMBINATIONS_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

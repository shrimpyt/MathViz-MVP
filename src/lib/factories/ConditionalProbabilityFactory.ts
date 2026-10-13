// ConditionalProbabilityFactory.ts
// Lesson ch15-3: Conditional Probability (TEKS G.13(D)).
// The core idea: "given B" shrinks the sample space to the B cases only,
// so P(A given B) = (count of A within B) / (count of B). D1 reads the
// counts off a small two-way table stated in the prompt. D2 uses draws
// without replacement, where the condition (the first draw) changes both
// counts. D3 compares two conditional probabilities from one table, and
// finds a conditional probability through the complement inside the
// condition. Every answer is a reduced fraction.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, frac, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

interface TableSkin {
  groups: [string, string];
  event: string; // plural form, e.g. "ride the bus"
  event1: string; // singular form, e.g. "rides the bus"
  notEvent: string; // plural form, e.g. "do not ride the bus"
  notEvent1: string; // singular form, e.g. "does not ride the bus"
  subject: string; // e.g. "students"
}

const SKINS: TableSkin[] = [
  { groups: ["juniors", "seniors"], event: "ride the bus", event1: "rides the bus", notEvent: "do not ride the bus", notEvent1: "does not ride the bus", subject: "students" },
  { groups: ["freshmen", "sophomores"], event: "play a sport", event1: "plays a sport", notEvent: "do not play a sport", notEvent1: "does not play a sport", subject: "students" },
  { groups: ["boys", "girls"], event: "chose art", event1: "chose art", notEvent: "did not choose art", notEvent1: "did not choose art", subject: "students" },
];

interface TableData {
  skin: TableSkin;
  totals: [number, number];
  events: [number, number];
}

function makeTable(rng: RNG): TableData {
  const skin = pick(rng, SKINS);
  const t1 = randInt(rng, 24, 60);
  const t2 = randInt(rng, 24, 60);
  const e1 = randInt(rng, 4, t1 - 4);
  const e2 = randInt(rng, 4, t2 - 4);
  return { skin, totals: [t1, t2], events: [e1, e2] };
}

function tableText(d: TableData): string {
  const { skin, totals, events } = d;
  const line = (i: 0 | 1) =>
    `${cap(skin.groups[i])}: ${totals[i]} ${skin.subject}, of whom ${events[i]} ${skin.event} and ${totals[i] - events[i]} ${skin.notEvent}.`;
  return `A survey gave these results. ${line(0)} ${line(1)}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function makeConditionalTable(rng: RNG): GeometryProblem {
  const d = makeTable(rng);
  const gi = pick(rng, [0, 1] as const);
  const wantEvent = rng() < 0.5;
  const total = d.totals[gi];
  const fav = wantEvent ? d.events[gi] : total - d.events[gi];
  const outcome = wantEvent ? d.skin.event : d.skin.notEvent;
  const outcome1 = wantEvent ? d.skin.event1 : d.skin.notEvent1;
  const ans = frac(fav, total);
  return {
    type: "GEO.15", subtype: "ConditionalTable",
    prompt: `${tableText(d)} A student is chosen at random from the ${d.skin.groups[gi]}. Find the probability that the student ${outcome1}, given that the student is one of the ${d.skin.groups[gi]}. Give the answer as a reduced fraction.`,
    given: { group: d.skin.groups[gi], favorable: fav, groupTotal: total },
    find: `P(${outcome} | ${d.skin.groups[gi]})`,
    answer: ans,
    steps: [
      step("A conditional probability restricts the sample space to the group named after the word given.", "Definition of conditional probability."),
      step(`Only the ${total} ${d.skin.groups[gi]} count now. Of those, ${fav} ${outcome}.`, "Restrict to the given condition."),
      step(`P = ${fav}/${total} = ${ans}.`, "Favorable over the restricted total, reduced.", [{ label: "P", answer: ans }]),
    ],
    verify: { kind: "condFrac", fav, cond: total },
  };
}

function makeConditionalDraw(rng: RNG): GeometryProblem {
  const form = pick(rng, ["marbles", "marbles", "deck"] as const);
  if (form === "deck") {
    const scenarios = [
      { first: "a heart", second: "a heart", fav: 12, cond: 51, explain: "One heart is gone, so 12 hearts remain out of 51 cards." },
      { first: "a king", second: "another king", fav: 3, cond: 51, explain: "One king is gone, so 3 kings remain out of 51 cards." },
      { first: "a red card", second: "another red card", fav: 25, cond: 51, explain: "One red card is gone, so 25 red cards remain out of 51 cards." },
    ] as const;
    const s = pick(rng, scenarios);
    const ans = frac(s.fav, s.cond);
    return {
      type: "GEO.15", subtype: "ConditionalDraw",
      prompt: `Two cards are drawn from a standard 52-card deck without replacement. Given that the first card drawn was ${s.first}, find the probability that the second card is ${s.second}. Give the answer as a reduced fraction.`,
      given: { first: s.first },
      find: "conditional probability",
      answer: ans,
      steps: [
        step("The given condition fixes the first draw, so the sample space for the second draw is the 51 remaining cards.", "Definition of conditional probability."),
        step(s.explain, "Count within the restricted sample space."),
        step(`P = ${s.fav}/${s.cond} = ${ans}.`, "Reduce the fraction.", [{ label: "P", answer: ans }]),
      ],
      verify: { kind: "condFrac", fav: s.fav, cond: s.cond },
    };
  }
  const red = randInt(rng, 3, 9);
  const blue = randInt(rng, 3, 9);
  const total = red + blue;
  const variant = pick(rng, ["redThenRed", "blueThenBlue", "redThenBlue"] as const);
  const first = variant === "blueThenBlue" ? "blue" : "red";
  const second = variant === "redThenBlue" ? "blue" : first;
  const fav = variant === "redThenRed" ? red - 1 : variant === "blueThenBlue" ? blue - 1 : blue;
  const cond = total - 1;
  const ans = frac(fav, cond);
  const firstCount = first === "red" ? red : blue;
  return {
    type: "GEO.15", subtype: "ConditionalDraw",
    prompt: `A bag contains ${red} red and ${blue} blue marbles. Two marbles are drawn without replacement. Given that the first marble drawn was ${first}, find the probability that the second marble is ${second}. Give the answer as a reduced fraction.`,
    given: { red, blue, first, second },
    find: "conditional probability",
    answer: ans,
    steps: [
      step(`The first draw is known to be ${first}, so ${firstCount} ${first} marbles were in the bag and one is gone: ${cond} marbles remain.`, "Restrict to the given condition."),
      step(`Of the remaining marbles, ${fav} are ${second}.`, "Count the favorable outcomes in the restricted sample space."),
      step(`P = ${fav}/${cond} = ${ans}.`, "Reduce the fraction.", [{ label: "P", answer: ans }]),
    ],
    verify: { kind: "condFrac", fav, cond },
  };
}

function makeConditionalCompare(rng: RNG): GeometryProblem {
  let d = makeTable(rng);
  // Ensure the two conditional probabilities actually differ.
  for (let tries = 0; tries < 12 && d.events[0] * d.totals[1] === d.events[1] * d.totals[0]; tries++) {
    d = makeTable(rng);
  }
  const [e1, e2] = d.events;
  const [t1, t2] = d.totals;
  const greaterFirst = e1 * t2 > e2 * t1;
  const gf = greaterFirst ? e1 : e2;
  const gt = greaterFirst ? t1 : t2;
  const ans = frac(gf, gt);
  return {
    type: "GEO.15", subtype: "ConditionalCompare",
    prompt: `${tableText(d)} Compute P(${d.skin.event} | ${d.skin.groups[0]}) and P(${d.skin.event} | ${d.skin.groups[1]}). Which conditional probability is greater? Give the greater value as a reduced fraction.`,
    given: { group1: d.skin.groups[0], group2: d.skin.groups[1] },
    find: "the greater conditional probability",
    answer: ans,
    steps: [
      step(`P(${d.skin.event} | ${d.skin.groups[0]}) = ${e1}/${t1} = ${frac(e1, t1)}.`, "Restrict to the first group."),
      step(`P(${d.skin.event} | ${d.skin.groups[1]}) = ${e2}/${t2} = ${frac(e2, t2)}.`, "Restrict to the second group."),
      step(`Comparing the two, the greater value is ${ans}.`, "Compare the reduced fractions.", [{ label: "greater", answer: ans }]),
    ],
    verify: { kind: "condCompare", f1: e1, c1: t1, f2: e2, c2: t2 },
  };
}

function makeConditionalComplement(rng: RNG): GeometryProblem {
  const d = makeTable(rng);
  const gi = pick(rng, [0, 1] as const);
  const total = d.totals[gi];
  const ev = d.events[gi];
  const ans = frac(total - ev, total);
  return {
    type: "GEO.15", subtype: "ConditionalComplement",
    prompt: `${tableText(d)} A student is chosen at random from the ${d.skin.groups[gi]}. Find the probability that the student ${d.skin.notEvent1}, given that the student is one of the ${d.skin.groups[gi]}. Give the answer as a reduced fraction.`,
    given: { group: d.skin.groups[gi], eventCount: ev, groupTotal: total },
    find: `P(${d.skin.notEvent} | ${d.skin.groups[gi]})`,
    answer: ans,
    steps: [
      step(`Within the ${d.skin.groups[gi]}, ${ev} of the ${total} students ${d.skin.event}, so the rest, ${total} − ${ev} = ${total - ev}, ${d.skin.notEvent}.`, "Complement inside the restricted sample space."),
      step(`P = ${total - ev}/${total} = ${ans}.`, "Favorable over the restricted total, reduced.", [{ label: "P", answer: ans }]),
    ],
    verify: { kind: "condComplement", fav: ev, cond: total },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const CONDITIONAL_PROBABILITY_LESSON_POOL: MakerEntry[] = [
  M("ConditionalTable", 1, (rng) => makeConditionalTable(rng)),
  M("ConditionalDraw", 2, (rng) => makeConditionalDraw(rng)),
  M("ConditionalCompare", 3, (rng) => makeConditionalCompare(rng)),
  M("ConditionalComplement", 3, (rng) => makeConditionalComplement(rng)),
];

export function generateConditionalProbabilityProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only
    ? CONDITIONAL_PROBABILITY_LESSON_POOL.filter((e) => only.includes(e.subtype))
    : CONDITIONAL_PROBABILITY_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

// SATProblemSolvingData.ts
// SAT "Problem Solving & Data Analysis" makers: percent change, ratios and
// proportions, one-variable statistics, probability. Difficulty tiers are
// cumulative: tier d may draw any variant from tiers 1..d.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { SATDifficulty, SATProblem, SATDiagramParams } from "../satTypes";
import {
  q,
  qVal,
  qLabel,
  qForms,
  gcd,
  assembleProblem,
  buildMCQ,
  chooseFormat,
  pickDistractors,
  tier,
  randIntAvoid,
  type SATMaker,
  type DistractorSpec,
} from "./SATShared";

// ── Maker 1: percent increase / decrease (P.D.1) ──────────────────────────────

function makePercentChange(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);
  const increase = t === 1 ? true : t === 2 ? false : rng() < 0.5;

  const pct = pick(rng, [10, 15, 20, 25, 30, 40, 50]);
  const step = 100 / gcd(pct, 100); // ensures N is an integer
  const old = randInt(rng, 2, 9) * step;
  const nw = increase ? old + (old * pct) / 100 : old - (old * pct) / 100;

  const pctFrac = q(increase ? pct : -pct);
  const key = { label: qLabel(pctFrac), value: qVal(pctFrac) };
  const item = pick(rng, [
    ["price of a backpack", "$"],
    ["price of a pair of sneakers", "$"],
    ["rent for an apartment", "$"],
    ["number of students in a club", ""],
    ["population of a town", ""],
  ]);
  const stem =
    `The ${item[0]} was ${item[1]}${old}. ` +
    (increase
      ? `It is now ${item[1]}${nw}. What is the percent increase?`
      : `It is now ${item[1]}${nw}. What is the percent decrease?`);

  // The key is signed (decrease → negative), so the explanation must show the
  // signed change, not the absolute percent.
  const explanation =
    increase
      ? `Change = ${item[1]}${nw - old}. Percent increase = ${nw - old}/${old} × 100% = ${pct}%.`
      : `Change = ${item[1]}${old - nw}. Percent change = ${nw - old}/${old} × 100% = ${-pct}%.`;

  const baseErr = Math.round(((nw - old) / nw) * 100); // wrong base
  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(increase ? baseErr : -baseErr)),
      value: increase ? baseErr : -baseErr,
      misconception: "percent-base-error",
      note: "Divided by the new value instead of the original value.",
    },
    {
      label: qLabel(q(increase ? 100 + pct : 100 - pct)),
      value: increase ? 100 + pct : 100 - pct,
      misconception: "percent-base-error",
      note: "Reported the new amount as a percent of the old instead of the change.",
    },
    {
      label: qLabel(q(increase ? -pct : pct)),
      value: increase ? -pct : pct,
      misconception: "sign-flip",
      note: increase
        ? "Reported a decrease instead of an increase."
        : "Reported an increase instead of a decrease.",
    },
    {
      label: qLabel(q(increase ? 2 * pct : -2 * pct)),
      value: increase ? 2 * pct : -2 * pct,
      misconception: "order-of-operations",
      note: "Doubled the percent change — arithmetic slip.",
    },
  ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "ProblemSolvingData", subdomain: "PercentChange",
      standard: "P.D.1", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { old, nw, pct: increase ? pct : -pct },
        note: "pct = (new-old)/old*100; check old*(1+pct/100) = new.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "ProblemSolvingData", subdomain: "PercentChange", standard: "P.D.1",
    difficulty, stem, key, explanation,
    verify: { params: { old, nw, pct: increase ? pct : -pct }, note: "pct = (new-old)/old*100." },
    format, gridInForms: qForms(pctFrac),
  });
}

// ── Maker 2: ratios and proportions (P.D.2) ───────────────────────────────────

function makeRatioProportion(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  const a = randInt(rng, 2, 9);
  const k = randInt(rng, 2, t === 3 ? 15 : 9);
  const c = a * k;
  const b = randIntAvoid(rng, 2, 12, [a, c]);
  const x = b * k; // a/b = c/x
  const xFrac = q(x);
  const key = { label: qLabel(xFrac), value: qVal(xFrac) };

  let stem: string;
  let explanation: string;
  if (t === 1) {
    stem = `If ${a}/${b} = ${c}/x, what is the value of x?`;
    explanation = `Cross-multiply: ${a}x = ${b} × ${c} = ${b * c}, so x = ${b * c}/${a} = ${x}.`;
  } else if (t === 2) {
    const unit = pick(rng, ["cups of flour", "miles", "dollars", "minutes"]);
    stem =
      `A recipe uses ${a} ${unit} for every ${b} servings. ` +
      `How many ${unit} are needed for ${c} servings?`;
    explanation = `Set up the proportion ${a}/${b} = x/${c}; cross-multiplying gives ${b}x = ${a * c}, so x = ${x}.`;
  } else {
    // Avoid from = b², which would make the "inverted ratio" distractor
    // numerically equal to the key (buildMCQ would throw — see fuzz).
    const from = randIntAvoid(rng, 2, 6, [b * b]);
    stem =
      `On a map, ${from} centimeters represents ${b * from} kilometers. ` +
      `If two cities are ${c * from} centimeters apart on the map, what is the actual distance, in kilometers?`;
    // scale: from cm : b*from km → 1 cm : b km; map dist c*from cm → b*c*from... keep numbers consistent:
    // actual = (c*from / from) * b = c*b = x*? — recompute cleanly below.
    const mapCm = c * from;
    const actual = mapCm * b; // 1 cm : b km, so mapCm cm → b·mapCm km
    const aFrac = q(actual);
    const aKey = { label: qLabel(aFrac), value: qVal(aFrac) };
    const aExp = `The scale is ${from} cm : ${b * from} km, or 1 cm : ${b} km. ${mapCm} cm × ${b} km/cm = ${actual} km.`;
    const aPool: DistractorSpec[] = [
      {
        label: qLabel(q(c * from * from, b)),
        value: qVal(q(c * from * from, b)),
        misconception: "inverted-ratio",
        note: "Inverted the scale ratio.",
      },
      {
        label: qLabel(q(mapCm + b)),
        value: mapCm + b,
        misconception: "added-instead-of-multiplied",
        note: "Added instead of scaling proportionally.",
      },
      {
        label: qLabel(q(actual + b)),
        value: actual + b,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
      {
        label: qLabel(q(actual - b)),
        value: actual - b,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, aKey, pickDistractors(rng, aKey.value, aPool));
      return {
        type: "SAT", format, domain: "ProblemSolvingData", subdomain: "RatioProportion",
        standard: "P.D.2", difficulty, stem, options, keyIndex,
        key: aKey.label, keyValue: aKey.value, explanation: aExp,
        verify: {
          params: { from, perCm: b, mapCm, scaleMode: 1 },
          note: "actual = mapCm * (km per cm).",
        },
      };
    }
    return assembleProblem(rng, {
      domain: "ProblemSolvingData", subdomain: "RatioProportion", standard: "P.D.2",
      difficulty, stem, key: aKey, explanation: aExp,
      verify: { params: { from, perCm: b, mapCm, scaleMode: 1 }, note: "actual = mapCm * (km per cm)." },
      format, gridInForms: qForms(aFrac),
    });
  }

  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(a * c, b)),
      value: qVal(q(a * c, b)),
      misconception: "inverted-ratio",
      note: "Inverted one of the ratios when cross-multiplying.",
    },
    {
      label: qLabel(q(a * b, c)),
      value: qVal(q(a * b, c)),
      misconception: "inverted-ratio",
      note: "Multiplied the wrong pair — set up the proportion backwards.",
    },
    {
      label: qLabel(q(b)),
      value: b,
      misconception: "wrong-variable",
      note: "Answered with the known corresponding value instead of solving.",
    },
    {
      label: qLabel(q(x + 1)),
      value: x + 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final step.",
    },
  ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "ProblemSolvingData", subdomain: "RatioProportion",
      standard: "P.D.2", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { a, b, c, scaleMode: 0 },
        note: "a/b = c/x → x = b*c/a; check a*x = b*c.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "ProblemSolvingData", subdomain: "RatioProportion", standard: "P.D.2",
    difficulty, stem, key, explanation,
    verify: { params: { a, b, c, scaleMode: 0 }, note: "x = b*c/a; check a*x = b*c." },
    format, gridInForms: qForms(xFrac),
  });
}

// ── Maker 3: one-variable statistics (P.D.5) ───────────────────────────────────

function makeOneVarStats(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  const n = t === 1 ? 5 : pick(rng, [5, 6, 7]);
  const data: number[] = [];
  for (let i = 0; i < n; i++) data.push(randInt(rng, 2, 30));
  const sorted = [...data].sort((p, q2) => p - q2);
  const stat = t === 1 ? "median" : pick(rng, ["mean", "median", "range"]);

  let ans: number;
  let ansFrac;
  let explanation: string;
  let pool: DistractorSpec[];
  const mid = Math.floor(n / 2);

  if (stat === "median") {
    if (n % 2 === 1) {
      ans = sorted[mid];
      ansFrac = q(ans);
      explanation = `Order the data: ${sorted.join(", ")}. The middle value is ${ans}.`;
    } else {
      ans = (sorted[mid - 1] + sorted[mid]) / 2;
      ansFrac = q(sorted[mid - 1] + sorted[mid], 2);
      explanation =
        `Order the data: ${sorted.join(", ")}. The two middle values are ` +
        `${sorted[mid - 1]} and ${sorted[mid]}; their mean is ${qLabel(ansFrac)}.`;
    }
    const unsortedMidFrac =
      n % 2 === 1 ? q(data[mid]) : q(data[mid - 1] + data[mid], 2);
    const sumAll = data.reduce((s, v) => s + v, 0);
    const meanFrac = q(sumAll, n);
    pool = [
      {
        label: qLabel(unsortedMidFrac),
        value: qVal(unsortedMidFrac),
        misconception: "unsorted-data",
        note: "Took the middle of the unordered list without sorting first.",
      },
      {
        label: qLabel(meanFrac),
        value: qVal(meanFrac),
        misconception: "mean-median-confusion",
        note: "Computed the mean instead of the median.",
      },
      {
        label: qLabel(q(ansFrac.num + ansFrac.den, ansFrac.den)),
        value: qVal(ansFrac) + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip reading the ordered list.",
      },
      {
        label: qLabel(q(sorted[n - 1])),
        value: sorted[n - 1],
        misconception: "wrong-variable",
        note: "Reported the maximum instead of the median.",
      },
      {
        label: qLabel(q(sorted[0])),
        value: sorted[0],
        misconception: "wrong-variable",
        note: "Reported the minimum instead of the median.",
      },
    ];
  } else if (stat === "mean") {
    const sum = data.reduce((s, v) => s + v, 0);
    ansFrac = q(sum, n);
    ans = sum / n;
    explanation = `Mean = (${data.join(" + ")})/${n} = ${sum}/${n} = ${qLabel(ansFrac)}.`;
    const medianFrac =
      n % 2 === 1 ? q(sorted[mid]) : q(sorted[mid - 1] + sorted[mid], 2);
    pool = [
      {
        label: qLabel(q(sum)),
        value: sum,
        misconception: "order-of-operations",
        note: "Added the values but forgot to divide by how many there are.",
      },
      {
        label: qLabel(medianFrac),
        value: qVal(medianFrac),
        misconception: "mean-median-confusion",
        note: "Found the median instead of the mean.",
      },
      {
        label: qLabel(q(sum, n + 1)),
        value: qVal(q(sum, n + 1)),
        misconception: "off-by-one",
        note: "Divided by one too many values.",
      },
      {
        label: qLabel(q(sum, n - 1)),
        value: qVal(q(sum, n - 1)),
        misconception: "off-by-one",
        note: "Divided by one too few values.",
      },
      {
        label: qLabel(q(sorted[n - 1])),
        value: sorted[n - 1],
        misconception: "wrong-variable",
        note: "Reported the maximum instead of the mean.",
      },
    ];
  } else {
    ans = sorted[n - 1] - sorted[0];
    ansFrac = q(ans);
    explanation = `Range = max − min = ${sorted[n - 1]} − ${sorted[0]} = ${ans}.`;
    pool = [
      {
        label: qLabel(q(sorted[n - 1])),
        value: sorted[n - 1],
        misconception: "range-error",
        note: "Reported the maximum without subtracting the minimum.",
      },
      {
        label: qLabel(q(sorted[0])),
        value: sorted[0],
        misconception: "range-error",
        note: "Reported the minimum instead of max − min.",
      },
      {
        label: qLabel(q(ans + 1)),
        value: ans + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the subtraction.",
      },
      {
        label: qLabel(q(ans - 1)),
        value: ans - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the subtraction.",
      },
    ];
  }

  const key = { label: qLabel(ansFrac!), value: qVal(ansFrac!) };
  const stem =
    `The data set ${data.join(", ")} has ${stat === "mean" ? "a mean" : stat === "median" ? "a median" : "a range"} ` +
    `of what value?`;

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "ProblemSolvingData", subdomain: "OneVarStats",
      standard: "P.D.5", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { data, stat },
        note: "Recompute mean/median/range directly from the data list.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "ProblemSolvingData", subdomain: "OneVarStats", standard: "P.D.5",
    difficulty, stem, key, explanation,
    verify: { params: { data, stat }, note: "Recompute directly from the data list." },
    format, gridInForms: qForms(ansFrac!),
  });
}

// ── Maker 4: probability (P.D.4) ──────────────────────────────────────────────

const MARBLE_COLORS: [string, string][] = [
  ["red", "blue"],
  ["green", "yellow"],
  ["black", "white"],
];

function makeProbability(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  if (t === 1) {
    const [c1, c2] = pick(rng, MARBLE_COLORS);
    const n1 = randInt(rng, 3, 10);
    const n2 = randInt(rng, 3, 10);
    const total = n1 + n2;
    const pFrac = q(n1, total);
    const key = { label: qLabel(pFrac), value: qVal(pFrac) };
    const stem =
      `A bag contains ${n1} ${c1} marbles and ${n2} ${c2} marbles. ` +
      `If one marble is chosen at random, what is the probability it is ${c1}?`;
    const explanation = `P(${c1}) = favorable/total = ${n1}/${total} = ${qLabel(pFrac)}.`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(total, n1)),
        value: total / n1,
        misconception: "inverted-ratio",
        note: "Flipped favorable and total outcomes.",
      },
      {
        label: qLabel(q(n2, total)),
        value: n2 / total,
        misconception: "complement-error",
        note: "Found P(not chosen color) — the complement.",
      },
      {
        label: qLabel(q(n1, total + 1)),
        value: n1 / (total + 1),
        misconception: "off-by-one",
        note: "Miscounted the total by one.",
      },
      {
        label: qLabel(q(n1 + 1, total)),
        value: (n1 + 1) / total,
        misconception: "off-by-one",
        note: "Miscounted the favorable outcomes by one.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "ProblemSolvingData", subdomain: "Probability",
        standard: "P.D.4", difficulty, stem, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: {
          params: { fav: n1, total, tableMode: 0 },
          note: "p = fav/total.",
        },
      };
    }
    return assembleProblem(rng, {
      domain: "ProblemSolvingData", subdomain: "Probability", standard: "P.D.4",
      difficulty, stem, key, explanation,
      verify: { params: { fav: n1, total, tableMode: 0 }, note: "p = fav/total." },
      format, gridInForms: qForms(pFrac),
    });
  }

  // tiers 2–3: two-way table
  const a = randInt(rng, 8, 30); // row1 col1
  const b = randInt(rng, 8, 30); // row1 col2
  const c = randInt(rng, 8, 30); // row2 col1
  const d = randInt(rng, 8, 30); // row2 col2
  const total = a + b + c + d;
  const [row1, row2] = pick(rng, [
    ["9th graders", "10th graders"],
    ["boys", "girls"],
    ["freshmen", "sophomores"],
  ]);
  const [col1, col2] = pick(rng, [
    ["walk", "take the bus"],
    ["play a sport", "do not play a sport"],
  ]);
  const cell = pick(rng, [
    [a, `${row1} who ${col1}`],
    [b, `${row1} who ${col2}`],
    [c, `${row2} who ${col1}`],
    [d, `${row2} who ${col2}`],
  ]) as [number, string];
  const complement = t === 3 && rng() < 0.5;

  const pFrac = complement ? q(total - cell[0], total) : q(cell[0], total);
  const key = { label: qLabel(pFrac), value: qVal(pFrac) };
  const diagram: SATDiagramParams = {
    kind: "SatTable",
    headers: ["", col1, col2],
    rows: [
      [row1, String(a), String(b)],
      [row2, String(c), String(d)],
    ],
    caption: "Number of students",
  };
  const cellWho = cell[1].replace(
    /^(9th graders|10th graders|boys|girls|freshmen|sophomores) who /,
    "a $1 who "
  );
  const stem = complement
    ? `A student is chosen at random from the table. What is the probability the student is not ${cellWho}?`
    : `A student is chosen at random from the table. What is the probability the student is ${cell[1]}?`;

  const explanation = complement
    ? `P(not ${cell[1]}) = 1 − ${cell[0]}/${total} = ${qLabel(pFrac)}.`
    : `P = ${cell[0]}/${total} = ${qLabel(pFrac)}.`;

  const directFrac = q(cell[0], total);
  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(total, cell[0])),
      value: total / cell[0],
      misconception: "inverted-ratio",
      note: "Flipped favorable and total outcomes.",
    },
    complement
      ? {
          label: qLabel(directFrac),
          value: qVal(directFrac),
          misconception: "complement-error",
          note: "Found the probability of the event instead of its complement.",
        }
      : {
          label: qLabel(q(total - cell[0], total)),
          value: (total - cell[0]) / total,
          misconception: "complement-error",
          note: "Found the complement instead of the requested probability.",
        },
    {
      label: qLabel(q(cell[0], total + 1)),
      value: cell[0] / (total + 1),
      misconception: "off-by-one",
      note: "Miscounted the total by one.",
    },
    {
      label: qLabel(q(cell[0] + 1, total)),
      value: (cell[0] + 1) / total,
      misconception: "off-by-one",
      note: "Miscounted the favorable outcomes by one.",
    },
  ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "ProblemSolvingData", subdomain: "Probability",
      standard: "P.D.4", difficulty, stem, diagram, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { a, b, c, d, cell: cell[0], complement: complement ? 1 : 0, tableMode: 1 },
        note: "p = cell/total (or 1 − cell/total for complement).",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "ProblemSolvingData", subdomain: "Probability", standard: "P.D.4",
    difficulty, stem, diagram, key, explanation,
    verify: { params: { a, b, c, d, cell: cell[0], complement: complement ? 1 : 0, tableMode: 1 }, note: "p = cell/total." },
    format, gridInForms: qForms(pFrac),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export const SAT_PSDA_MAKERS: SATMaker[] = [
  makePercentChange,
  makeRatioProportion,
  makeOneVarStats,
  makeProbability,
];

/** Generate n Problem Solving & Data Analysis problems using the provided RNG. */
export function generateSATProblemSolvingDataProblems(
  rng: RNG,
  n: number,
  difficulty: SATDifficulty
): SATProblem[] {
  return Array.from({ length: n }, () => {
    const maker = SAT_PSDA_MAKERS[Math.floor(rng() * SAT_PSDA_MAKERS.length)];
    return maker(rng, difficulty);
  });
}

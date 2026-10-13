// Algebra1Statistics.ts
// TEKS A.4B (two-way tables: association) and A.4C (line of best fit).
// Subtypes: TwoWayTable, LineOfBestFit.
//
// Two-way tables are generated cell-first with consistent marginal totals.
// Lines of best fit use the closed-form least-squares solution on seeded
// data points, so the regression line is exact, not fitted by guesswork.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype, Pt2 } from "./Algebra1Types";
import { fmtNum } from "./Algebra1Format";

export const STATS_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["TwoWayTable", "AssociationCausation"],
  2: ["TwoWayTable", "LineOfBestFit", "Correlation", "AssociationCausation"],
  3: ["TwoWayTable", "LineOfBestFit", "Correlation", "AssociationCausation"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = ["TwoWayTable", "LineOfBestFit", "Correlation", "AssociationCausation"];

// ── Two-way frequency table ─────────────────────────────────────────────────

const TABLE_CONTEXTS = [
  { rows: ["Plays sports", "Does not play sports"], cols: ["Likes math", "Dislikes math"], unit: "students" },
  { rows: ["Has a pet", "No pet"], cols: ["Walks to school", "Rides to school"], unit: "students" },
  { rows: ["Breakfast", "No breakfast"], cols: ["On time", "Late"], unit: "students" },
] as const;

function makeTwoWayTable(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const ctx = pick(rng, TABLE_CONTEXTS);
  // Cell counts first; totals are derived so they are always consistent.
  const a = randInt(rng, 4, 18);
  const b = randInt(rng, 4, 18);
  const c = randInt(rng, 4, 18);
  const d = randInt(rng, 4, 18);
  const data = [
    [a, b],
    [c, d],
  ];
  const rowTotals = [a + b, c + d];
  const colTotals = [a + c, b + d];
  const grand = a + b + c + d;
  const askJoint = difficulty >= 2 && rng() < 0.5;
  const prompt = askJoint
    ? `In the two-way table, what percent of ${ctx.unit} both "${ctx.rows[0].toLowerCase()}" and "${ctx.cols[0].toLowerCase()}"? Round to the nearest whole percent.`
    : `In the two-way table, how many ${ctx.unit} ${ctx.rows[0].toLowerCase()} in total?`;
  const jointPct = Math.round((a / grand) * 100);
  const answer = askJoint ? `${jointPct}%` : `${rowTotals[0]}`;
  return {
    type: "A.4B",
    subtype: "TwoWayTable",
    prompt,
    answer,
    steps: [
      {
        instruction: "Read the marginal totals (row and column sums):",
        reason: "Marginal totals summarize each category",
        blanks: [
          {
            label: "totals",
            answer: `row totals: ${rowTotals[0]}, ${rowTotals[1]}; column totals: ${colTotals[0]}, ${colTotals[1]}; grand total: ${grand}`,
          },
        ],
      },
      {
        instruction: askJoint
          ? "Divide the joint cell by the grand total:"
          : "Read the row total:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    graph: {
      kind: "TwoWayTable",
      rowLabels: [...ctx.rows],
      colLabels: [...ctx.cols],
      data,
      title: `${ctx.unit} surveyed`,
    },
    meta: {
      kind: "twoway",
      rowLabels: [...ctx.rows],
      colLabels: [...ctx.cols],
      data,
    },
  };
}

// ── Line of best fit (least squares) ─────────────────────────────────────────

function leastSquares(points: Pt2[]): { m: number; b: number } {
  const n = points.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) {
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  const m = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b };
}

function makeLineOfBestFit(rng: RNG): Algebra1Problem {
  // Seed a true line, then jitter points around it.
  const trueM = pick(rng, [1.5, 2, 2.5, 3] as const);
  const trueB = randInt(rng, 2, 10);
  const count = randInt(rng, 5, 8);
  const points: Pt2[] = [];
  for (let i = 0; i < count; i++) {
    const x = i + 1;
    const jitter = randInt(rng, -2, 2);
    points.push([x, Math.round(trueM * x + trueB + jitter)]);
  }
  const { m, b } = leastSquares(points);
  const mR = Math.round(m * 100) / 100;
  const bR = Math.round(b * 100) / 100;
  const predictX = count + 2;
  const prediction = Math.round((mR * predictX + bR) * 10) / 10;
  const prompt =
    `The scatter plot shows study hours (x) vs. test score (y) for ${count} students. ` +
    `Write the equation of the line of best fit (round to two decimals) and predict the score for ${predictX} study hours.`;
  const eqText = `y = ${fmtNum(mR)}x + ${fmtNum(bR)}`;
  const answer = `${eqText}; about ${fmtNum(prediction)}`;
  return {
    type: "A.4C",
    subtype: "LineOfBestFit",
    prompt,
    answer,
    steps: [
      {
        instruction: "The least-squares line of best fit (computed) is:",
        reason: "Least-squares regression",
        blanks: [{ label: "line", answer: eqText }],
      },
      {
        instruction: `Substitute x = ${predictX} to predict:`,
        blanks: [{ label: "answer", answer: `about ${fmtNum(prediction)}` }],
      },
    ],
    graph: {
      kind: "ScatterPlot",
      points,
      line: { m: mR, b: bR, label: eqText },
      xLabel: "study hours",
      yLabel: "test score",
    },
    meta: { kind: "regression", points, predictX },
  };
}

// ── Correlation: strength & direction (A.4A) ─────────────────────────────

function pearson(points: Pt2[]): number {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) * (x - mx);
    syy += (y - my) * (y - my);
  }
  return syy === 0 || sxx === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

function correlationStrength(r: number): string {
  const a = Math.abs(r);
  return a >= 0.75 ? "strong" : a >= 0.45 ? "moderate" : "weak";
}

function makeCorrelation(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const amp = difficulty === 1 ? 1 : difficulty === 2 ? 3 : 5;
  let points: Pt2[] = [];
  let r = 0;
  for (let attempt = 0; attempt < 500; attempt++) {
    const sign = rng() < 0.5 ? 1 : -1;
    const slope = pick(rng, [1, 2] as const);
    const base = sign > 0 ? randInt(rng, 2, 8) : randInt(rng, 14, 22);
    points = [];
    for (let x = 1; x <= 6; x++) {
      const jitter = randInt(rng, -amp, amp);
      points.push([x, Math.max(1, base + sign * slope * x + jitter)]);
    }
    r = pearson(points);
    if (Math.abs(r) >= 0.25 && Math.abs(r) <= 0.995) break;
    if (attempt === 499) {
      // Deterministic fallback: a clean strong positive set.
      points = [[1, 3], [2, 5], [3, 6], [4, 9], [5, 11], [6, 13]];
      r = pearson(points);
    }
  }
  const best = Math.round(r * 10) / 10;
  const flipped = -best;
  const toward = Math.round((best > 0 ? best - 0.6 : best + 0.6) * 10) / 10;
  const rawCandidates = [best, flipped, toward];
  const candidates = rawCandidates.filter((c, i) => rawCandidates.indexOf(c) === i);
  while (candidates.length < 3) candidates.push(candidates[0] > 0 ? -0.2 : 0.2);
  const order = [0, 1, 2].sort(() => (rng() < 0.5 ? -1 : 1));
  const shown = order.map((i) => candidates[i]);
  const strength = correlationStrength(r);
  const direction = r > 0 ? "positive" : "negative";
  const answer = `r \\approx ${fmtNum(best)}; ${strength} ${direction} correlation`;
  const { m, b } = leastSquares(points);
  const pointText = points.map(([x, y]) => `(${x}, ${y})`).join(", ");
  return {
    type: "A.4A",
    subtype: "Correlation",
    prompt:
      `Data: ${pointText}. Which of these values is closest to the correlation coefficient r: ` +
      `${shown.map((c) => fmtNum(c)).join(", ")}? State the value and describe the strength and direction of the correlation.`,
    answer,
    steps: [
      {
        instruction: "The correlation coefficient r measures how tightly the points follow a line, and its sign gives the direction:",
        reason: "Correlation coefficient",
        blanks: [{ label: "closest r", answer: `${fmtNum(best)}` }],
      },
      {
        instruction: "Classify by the size of |r| (near 1 is strong, near 0 is weak):",
        blanks: [{ label: "answer", answer: `${strength} ${direction} correlation` }],
      },
    ],
    graph: {
      kind: "ScatterPlot",
      points,
      line: { m: Math.round(m * 100) / 100, b: Math.round(b * 100) / 100 },
      xLabel: "x",
      yLabel: "y",
    },
    meta: { kind: "correlation", points, candidates: shown },
  };
}

// ── Association vs. causation (A.4B) ─────────────────────────────────────
// Fixed scenario templates. Seeded swaps change names and numbers only,
// never the classification, which the checker keys by scenario id.

interface CausationScenario {
  id: string;
  answer: "association only" | "possible causation" | "neither";
  reason: string;
  text: (rng: RNG) => string;
}

const CAUSATION_SCENARIOS: CausationScenario[] = [
  {
    id: "ice-cream-drowning",
    answer: "association only",
    reason: "Hot weather is a lurking variable that raises both ice cream sales and swimming",
    text: (rng) => {
      const town = pick(rng, ["Seaside", "Bayview", "Coral Bay", "Portside"]);
      return `In the town of ${town}, lifeguards notice that on days when ice cream sales at the beach stand are high, the number of drowning rescues is also high. A reporter writes that eating ice cream causes drowning rescues.`;
    },
  },
  {
    id: "shoe-size-reading",
    answer: "association only",
    reason: "Age is a lurking variable: older children have both bigger feet and better reading skills",
    text: () =>
      `A study of elementary school students finds that students with larger shoe sizes tend to earn higher reading scores. The study's author claims that bigger feet make children read better.`,
  },
  {
    id: "firefighters-damage",
    answer: "association only",
    reason: "Bigger fires both need more firefighters and cause more damage; fire size is the lurking variable",
    text: (rng) => {
      const city = pick(rng, ["Denver", "Austin", "Fresno", "Akron"]);
      return `Fire records in ${city} show that fires attended by more firefighters tend to cost more in property damage. A blogger concludes that calling more firefighters causes more damage.`;
    },
  },
  {
    id: "coffee-sleep",
    answer: "association only",
    reason: "It is an observational survey, so other differences between the groups could explain the pattern",
    text: (rng) => {
      const n = pick(rng, [120, 200, 250, 300] as const);
      return `A survey of ${n} students finds that students who drink more coffee tend to sleep fewer hours each night. The survey team says coffee is proven to reduce sleep.`;
    },
  },
  {
    id: "study-app-trial",
    answer: "possible causation",
    reason: "Students were randomly assigned, so the app is the one systematic difference between the groups",
    text: (rng) => {
      const n = pick(rng, [40, 60, 80, 100] as const);
      return `Researchers randomly assigned ${n} students to study with a new app or with paper notes for a month. The app group scored higher on the final quiz, on average. The researchers say the app may have caused the higher scores.`;
    },
  },
  {
    id: "fertilizer-trial",
    answer: "possible causation",
    reason: "Random assignment was used, so the fertilizer can be credited with the difference",
    text: (rng) => {
      const n = pick(rng, [24, 30, 36, 48] as const);
      return `A gardener randomly assigned ${n} tomato plants to two groups. Only one group received a new fertilizer, and that group produced more tomatoes on average. The gardener says the fertilizer may have caused the extra tomatoes.`;
    },
  },
  {
    id: "vitamin-trial",
    answer: "possible causation",
    reason: "It was a controlled experiment with random assignment and a placebo group",
    text: (rng) => {
      const n = pick(rng, [80, 100, 120, 150] as const);
      return `In a controlled experiment, ${n} volunteers were randomly assigned to take a vitamin or an identical-looking placebo. The vitamin group reported fewer colds over the winter. The researchers say the vitamin may have caused the difference.`;
    },
  },
  {
    id: "name-letters-birthday",
    answer: "neither",
    reason: "There is no plausible link between the two quantities at all",
    text: () =>
      `A student wonders whether the number of letters in a person's first name is related to the day of the month on which the person was born.`,
  },
  {
    id: "phone-digit-height",
    answer: "neither",
    reason: "A phone number digit cannot influence height, and no link is expected",
    text: () =>
      `A survey asks whether the last digit of a student's phone number is related to the student's height.`,
  },
  {
    id: "wall-color-pencils",
    answer: "neither",
    reason: "The two quantities have no plausible connection",
    text: (rng) => {
      const color = pick(rng, ["green", "blue", "gray", "yellow"]);
      return `A teacher wonders whether painting classroom walls ${color} is related to how many pencils students in the room own.`;
    },
  },
];

function makeAssociationCausation(rng: RNG): Algebra1Problem {
  const sc = pick(rng, CAUSATION_SCENARIOS);
  const prompt = `${sc.text(rng)} Which best describes the relationship claimed: association only, possible causation, or neither?`;
  return {
    type: "A.4B",
    subtype: "AssociationCausation",
    prompt,
    answer: sc.answer,
    steps: [
      {
        instruction: "Ask: was there random assignment to groups, a lurking variable, or no plausible link at all?",
        reason: sc.reason,
        blanks: [{ label: "answer", answer: sc.answer }],
      },
    ],
    meta: { kind: "causation", scenarioId: sc.id },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  TwoWayTable: makeTwoWayTable,
  LineOfBestFit: (rng) => makeLineOfBestFit(rng),
  Correlation: makeCorrelation,
  AssociationCausation: (rng) => makeAssociationCausation(rng),
};

export function generateStatisticsProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...STATS_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

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
  1: ["TwoWayTable"],
  2: ["TwoWayTable", "LineOfBestFit"],
  3: ["TwoWayTable", "LineOfBestFit"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = ["TwoWayTable", "LineOfBestFit"];

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

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  TwoWayTable: makeTwoWayTable,
  LineOfBestFit: (rng) => makeLineOfBestFit(rng),
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

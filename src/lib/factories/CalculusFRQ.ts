// CalculusFRQ.ts
// AP Calculus — stimulus-based AP-style Free-Response Questions (AB/BC).
//
// Each FRQ is built around ONE stimulus (graph, table, or verbal scenario),
// exactly like the AP exam, with subparts (a)–(d). Uses BaseFRQProblem from
// @/lib/apTypes with subject "calc".
//
// Templates:
//   1. Graph stimulus: the graph of f' (piecewise linear) — no calculator.
//   2. Table stimulus: water flow rates into a tank — calculator active.
//   3. Scenario stimulus: particle motion with v(t) — calculator active.
//
// Stimulus consistency is structural: table cells are formatted evaluations of
// the underlying function, graph areas are trapezoid sums of the stored points,
// and every subpart is answerable from the stimulus alone. Tests recompute all
// of this independently via the `verify` payload.

import type { RNG } from "../math-utils";
import type { BaseFRQProblem, FRQSubpart } from "../apTypes";
import { validateFRQ } from "../apTypes";
import type { CalcFunction, CalcGraphParams } from "./CalculusUtils";
import { randInt, pick, fmtNum, polyToText, evalCalcFn } from "./CalculusUtils";

export interface FRQVerify {
  kind: "frq-graph" | "frq-table" | "frq-scenario";
  /** Piecewise-linear f' points (graph template). */
  points?: { x: number; y: number }[];
  /** Underlying function (table template: the rate function). */
  fn?: CalcFunction;
  /** Table stimulus: sample times and exact (unrounded) values. */
  t?: number[];
  vals?: number[];
  /** Scenario template: v(t) = -(t-r1)(t-r2), x(0) = x0. */
  data?: Record<string, number | string>;
}

export interface FRQBuild {
  frq: BaseFRQProblem;
  verify: FRQVerify;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Trapezoid-rule net area of a polyline between x = a and x = b. */
function netArea(points: { x: number; y: number }[], a: number, b: number): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    const l = Math.max(p.x, a);
    const r = Math.min(q.x, b);
    if (r <= l) continue;
    const yl = p.y + ((q.y - p.y) * (l - p.x)) / (q.x - p.x);
    const yr = p.y + ((q.y - p.y) * (r - p.x)) / (q.x - p.x);
    total += ((yl + yr) / 2) * (r - l);
  }
  return total;
}

/** Where the polyline crosses from + to - or - to + (sign changes of f'). */
function signChanges(points: { x: number; y: number }[]): { x: number; dir: "+to-" | "-to+" }[] {
  const out: { x: number; dir: "+to-" | "-to+" }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    if (p.y === 0 || q.y === 0) {
      const zx = p.y === 0 ? p.x : q.x;
      const before = i > 0 ? points[i - 1].y : p.y;
      const after = i + 1 < points.length - 1 ? points[i + 2].y : q.y;
      if (before > 0 && after < 0) out.push({ x: zx, dir: "+to-" });
      else if (before < 0 && after > 0) out.push({ x: zx, dir: "-to+" });
    } else if ((p.y > 0) !== (q.y > 0)) {
      const t = p.y / (p.y - q.y);
      const zx = p.x + t * (q.x - p.x);
      out.push({ x: zx, dir: p.y > 0 ? "+to-" : "-to+" });
    }
  }
  return out;
}

/** Intervals where the polyline is strictly increasing (f concave up). */
function increasingIntervals(points: { x: number; y: number }[]): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    if (q.y > p.y) {
      if (start === null) start = p.x;
    } else {
      if (start !== null) {
        out.push([start, p.x]);
        start = null;
      }
    }
  }
  if (start !== null) out.push([start, points[points.length - 1].x]);
  return out;
}

function intervalText(iv: [number, number]): string {
  return `(${fmtNum(iv[0])}, ${fmtNum(iv[1])})`;
}

// ── Template 1: graph of f' (no calculator) ───────────────────────────────────

const FPRIME_SHAPES: { x: number; y: number }[][] = [
  // A: rel max at x=4, concave up on (-3,-1)
  [{ x: -3, y: 0 }, { x: -1, y: 4 }, { x: 2, y: 4 }, { x: 4, y: 0 }, { x: 6, y: -3 }],
  // B: rel max at x=5, concave up on (-2,0)
  [{ x: -2, y: 0 }, { x: 0, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 0 }, { x: 7, y: -2 }],
  // C: rel min at x=3, concave up on (1,5)
  [{ x: -4, y: 0 }, { x: -2, y: -3 }, { x: 1, y: -3 }, { x: 3, y: 0 }, { x: 5, y: 2 }],
];

function buildFPrimeGraphFRQ(rng: RNG): FRQBuild {
  const points = pick(rng, FPRIME_SHAPES);
  const x0 = points[0].x;
  const xN = points[points.length - 1].x;

  // (a): pick two interior breakpoints; net change between them
  const i1 = randInt(rng, 1, points.length - 3);
  const i2 = i1 + randInt(rng, 1, 2);
  const pa = points[i1];
  const pb = points[i2];
  const netAB = netArea(points, pa.x, pb.x);

  // (b): relative extremum from sign change
  const changes = signChanges(points);
  const ext = changes[0];
  const extKind = ext.dir === "+to-" ? "maximum" : "minimum";

  // (c): concave-up intervals
  const up = increasingIntervals(points);

  // (d): accumulation from a given value
  const f0 = randInt(rng, 2, 6);
  const t0 = points[randInt(rng, 0, 1)].x; // a left breakpoint
  const t1 = points[points.length - 1].x;
  const netT = netArea(points, t0, t1);
  const fT = f0 + netT;

  const subparts: FRQSubpart[] = [
    {
      label: "a",
      prompt: `Find the value of f(${fmtNum(pb.x)}) − f(${fmtNum(pa.x)}). Show the setup that leads to your answer.`,
      answer: fmtNum(netAB),
      justification: `By the Fundamental Theorem of Calculus, f(${fmtNum(pb.x)}) − f(${fmtNum(pa.x)}) = ∫ from ${fmtNum(pa.x)} to ${fmtNum(pb.x)} of f′(x) dx, the net area under the graph of f′.`,
      points: 3,
    },
    {
      label: "b",
      prompt: `At what x-value does f attain a relative ${extKind} on [${fmtNum(x0)}, ${fmtNum(xN)}]? Justify your answer.`,
      answer: `x = ${fmtNum(ext.x)}`,
      justification: `f′ changes from ${ext.dir === "+to-" ? "positive to negative" : "negative to positive"} at x = ${fmtNum(ext.x)}, so f has a relative ${extKind} there by the First Derivative Test.`,
      points: 2,
    },
    {
      label: "c",
      prompt: "On what interval(s) is the graph of f concave up? Justify your answer.",
      answer: up.map(intervalText).join(" and "),
      justification: "f is concave up where f′ is increasing, which is on " + up.map(intervalText).join(" and ") + ".",
      points: 2,
    },
    {
      label: "d",
      prompt: `If f(${fmtNum(t0)}) = ${f0}, find f(${fmtNum(t1)}).`,
      answer: fmtNum(fT),
      justification: `f(${fmtNum(t1)}) = f(${fmtNum(t0)}) + ∫ from ${fmtNum(t0)} to ${fmtNum(t1)} of f′(x) dx = ${f0} + ${fmtNum(netT)}.`,
      points: 2,
    },
  ];

  const graphParams: CalcGraphParams = {
    kind: "CalcGraph",
    fn: { kind: "piecewiseLinear", points },
    xMin: x0 - 1, xMax: xN + 1,
    yMin: Math.min(...points.map((p) => p.y)) - 1,
    yMax: Math.max(...points.map((p) => p.y)) + 1,
    fnLabel: "y = f′(x)",
    caption: "The graph of f′, the derivative of f, is shown.",
  };

  const frq: BaseFRQProblem = {
    type: "AP_FRQ",
    subject: "calc",
    calculator: false,
    stimulus: { kind: "graph", graphKind: "derivative-graph", params: graphParams as unknown as Record<string, unknown>, caption: graphParams.caption },
    subparts,
    topicTag: "ap-frq",
    topicLabel: "AP-Style Free Response",
  };
  const errors = validateFRQ(frq);
  if (errors.length > 0) throw new Error(`FRQ validation failed: ${errors.join("; ")}`);
  return { frq, verify: { kind: "frq-graph", points } };
}

// ── Template 2: tank flow table (calculator active) ───────────────────────────

function buildTankTableFRQ(rng: RNG): FRQBuild {
  // R(t) = A + B t + C t^2, strictly increasing on [0, 12]
  const A = randInt(rng, 8, 14);
  const B = 1 + rng() * 1.5;
  const C = 0.05 + rng() * 0.08;
  const fn: CalcFunction = { kind: "poly", coeffs: [C, B, A] };
  const times = [0, 3, 6, 9, 12];
  const exact = times.map((t) => evalCalcFn(fn, t));
  const shown = exact.map((v) => Math.round(v * 10) / 10);
  const rows = times.map((t, i) => [String(t), shown[i].toFixed(1)]);

  // (a) left Riemann sum from the DISPLAYED table values
  const left = 3 * (shown[0] + shown[1] + shown[2] + shown[3]);
  // (c) average rate of change from the table
  const avgRate = (shown[4] - shown[0]) / 12;
  // (d) constant drain
  const drain = randInt(rng, 12, 18);
  const net = left - 12 * drain;

  const subparts: FRQSubpart[] = [
    {
      label: "a",
      prompt: "Use the data in the table to estimate the total gallons of water that flowed into the tank during the 12 minutes. Use a left Riemann sum with 4 subintervals. Show the computations that lead to your answer.",
      answer: `${left.toFixed(1)} gallons`,
      justification: "Left Riemann sum: 3·(R(0) + R(3) + R(6) + R(9)).",
      points: 3,
    },
    {
      label: "b",
      prompt: "Is your estimate in part (a) an overestimate or an underestimate? Justify your answer.",
      answer: "Underestimate",
      justification: "The table values increase, so R is increasing on [0, 12]; each left-endpoint rectangle lies below the graph, giving an underestimate.",
      points: 2,
    },
    {
      label: "c",
      prompt: "Find the average rate of change of R over the interval 0 ≤ t ≤ 12. Indicate units.",
      answer: `${avgRate.toFixed(3)} gallons/min per minute`,
      justification: "(R(12) − R(0))/12 from the table values.",
      points: 2,
    },
    {
      label: "d",
      prompt: `Water also drains from the tank at a constant rate of ${drain} gallons per minute. Using your answer from part (a), estimate the net change in the gallons of water in the tank during the 12 minutes.`,
      answer: `${net.toFixed(1)} gallons`,
      justification: `Net change ≈ (left Riemann sum) − 12·${drain}.`,
      points: 2,
    },
  ];

  const frq: BaseFRQProblem = {
    type: "AP_FRQ",
    subject: "calc",
    calculator: true,
    stimulus: {
      kind: "table",
      headers: ["t (minutes)", "R(t) (gallons per minute)"],
      rows,
      caption: "Water flows into a tank at a rate R(t). The table gives R(t) at selected times.",
    },
    subparts,
    topicTag: "ap-frq",
    topicLabel: "AP-Style Free Response",
  };
  const errors = validateFRQ(frq);
  if (errors.length > 0) throw new Error(`FRQ validation failed: ${errors.join("; ")}`);
  return { frq, verify: { kind: "frq-table", fn, t: times, vals: exact } };
}

// ── Template 3: particle motion scenario (calculator active) ──────────────────

function buildParticleFRQ(rng: RNG): FRQBuild {
  // v(t) = -(t - r1)(t - r2), integer roots in (0, 6)
  const [r1, r2] = pick(rng, [[1, 5], [2, 4], [1, 4], [2, 5]] as [number, number][]);
  const x0 = randInt(rng, 0, 5);
  const s = r1 + r2;
  const p = r1 * r2;
  const vText = polyToText([-1, s, -p], "t");
  const aText = polyToText([-2, s], "t");
  // Antiderivative F(t) = -t^3/3 + s t^2/2 - p t
  const F = (t: number) => -(t ** 3) / 3 + (s * t * t) / 2 - p * t;

  const x3 = x0 + (F(3) - F(0));
  const d1 = Math.abs(F(r1) - F(0));
  const d2 = Math.abs(F(r2) - F(r1));
  const d3 = Math.abs(F(6) - F(r2));
  const total = d1 + d2 + d3;

  const subparts: FRQSubpart[] = [
    {
      label: "a",
      prompt: "Find the acceleration a(t) of the particle.",
      answer: `a(t) = ${aText}`,
      justification: "Acceleration is the derivative of velocity.",
      points: 2,
    },
    {
      label: "b",
      prompt: "For 0 < t < 6, find all values of t at which the particle is at rest. Justify your answer.",
      answer: `t = ${r1} and t = ${r2}`,
      justification: `The particle is at rest when v(t) = 0; v(t) = −(t − ${r1})(t − ${r2}) = 0 at t = ${r1} and t = ${r2}.`,
      points: 2,
    },
    {
      label: "c",
      prompt: "Find x(3), the position of the particle at time t = 3.",
      answer: fmtNum(x3),
      justification: `By net change, x(3) = x(0) + ∫ from 0 to 3 of v(t) dt = ${x0} + ${fmtNum(F(3) - F(0))}.`,
      points: 3,
    },
    {
      label: "d",
      prompt: "Find the total distance traveled by the particle for 0 ≤ t ≤ 6.",
      answer: `${fmtNum(total)} (≈ ${total.toFixed(3)})`,
      justification: `Distance is ∫ from 0 to 6 of |v(t)| dt; split at the zeros t = ${r1} and t = ${r2} where v changes sign.`,
      points: 2,
    },
  ];

  const frq: BaseFRQProblem = {
    type: "AP_FRQ",
    subject: "calc",
    calculator: true,
    stimulus: {
      kind: "scenario",
      text: `A particle moves along the x-axis with velocity v(t) = ${vText} meters per second for 0 ≤ t ≤ 6. The position of the particle at time t = 0 is x(0) = ${x0} meters.`,
    },
    subparts,
    topicTag: "ap-frq",
    topicLabel: "AP-Style Free Response",
  };
  const errors = validateFRQ(frq);
  if (errors.length > 0) throw new Error(`FRQ validation failed: ${errors.join("; ")}`);
  return { frq, verify: { kind: "frq-scenario", data: { r1, r2, x0 } } };
}

// ── Public API ────────────────────────────────────────────────────────────────

const FRQ_BUILDERS = [buildFPrimeGraphFRQ, buildTankTableFRQ, buildParticleFRQ];

/** Build one FRQ (template chosen by rng) with its verification payload. */
export function buildCalculusFRQ(rng: RNG): FRQBuild {
  return pick(rng, FRQ_BUILDERS)(rng);
}

/** Generate n AP-style FRQs (BaseFRQProblem, subject "calc"). */
export function generateCalculusFRQs(rng: RNG, n: number): BaseFRQProblem[] {
  return Array.from({ length: n }, () => buildCalculusFRQ(rng).frq);
}

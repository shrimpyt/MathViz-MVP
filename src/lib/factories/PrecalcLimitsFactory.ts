// PrecalcLimitsFactory.ts
// AP Precalculus: introduction to limits - numerical estimation from tables,
// graphical limits (including one-sided and DNE), direct substitution,
// removable discontinuities (factor and cancel), piecewise one-sided limits,
// limit laws. Pure + seeded (mulberry32). Difficulty tiers 1|2|3 cumulative.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  fmt,
  assembleMCQ,
  allowedSubtypes,
  type PrecalcMCQ,
  type PrecalcDifficulty,
  type LimitGraphDiagram,
} from "./PrecalcTypes";

export type LimitSubtype =
  | "DirectSubstitution"
  | "LimitFromTable"
  | "SimplifyRational"
  | "LimitFromGraph"
  | "LimitLaws"
  | "OneSidedPiecewise";

const LIMIT_TIERS: Record<PrecalcDifficulty, readonly LimitSubtype[]> = {
  1: ["DirectSubstitution", "LimitFromTable"],
  2: ["SimplifyRational", "LimitFromGraph"],
  3: ["LimitLaws", "OneSidedPiecewise"],
};

const ALL_LIMIT_SUBTYPES = Object.values(LIMIT_TIERS).flat();

// -- Makers ---------------------------------------------------------------

function makeDirectSubstitution(rng: RNG): PrecalcMCQ {
  const a = randInt(rng, -4, 4);
  const p = randInt(rng, -5, 5), q = randInt(rng, -5, 5), r = randInt(rng, -5, 5);
  const val = p * a * a + q * a + r;
  const correct = String(val);
  const wrongPool = [
    String(val + 1), String(val - 1), String(val + 2), String(val - 2),
    String(p * a + q), String(2 * p * a + q),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "limits",
    subtype: "DirectSubstitution",
    stem: `Evaluate the limit: lim(x->${a}) (${p}x^2 ${q >= 0 ? "+" : "-"} ${Math.abs(q)}x ${r >= 0 ? "+" : "-"} ${Math.abs(r)}).`,
    givens: { a, p, q, r },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Polynomials are continuous everywhere, so substitute directly:",
        blanks: [{ label: "substitute", answer: `${p}(${a})^2 ${q >= 0 ? "+" : "-"} ${Math.abs(q)}(${a}) ${r >= 0 ? "+" : "-"} ${Math.abs(r)}` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeLimitFromTable(rng: RNG): PrecalcMCQ {
  // f(x) = (x^2 - a^2)/(x - a), hole at x = a, limit = 2a
  const a = randInt(rng, 2, 6) * pick(rng, [1, -1] as const);
  const denomStr = a > 0 ? `(x − ${a})` : `(x + ${-a})`;
  const offs = [0.1, 0.01, 0.001];
  const left = offs.map((o) => fmt(2 * a - o, 4));
  const right = offs.map((o) => fmt(2 * a + o, 4));
  const tableStr =
    `x: ${offs.map((o) => fmt(a - o, 3)).join(", ")} | f(x): ${left.join(", ")}; ` +
    `x: ${offs.map((o) => fmt(a + o, 3)).join(", ")} | f(x): ${right.join(", ")}`;
  const correct = String(2 * a);
  const wrongPool = [
    String(2 * a + 1), String(2 * a - 1), String(a), String(a * a),
    "Does not exist", String(2 * a + 0.1),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "limits",
    subtype: "LimitFromTable",
    stem: `The table shows values of f(x) = (x^2 − ${a * a})/${denomStr} near x = ${a}. ${tableStr}. Estimate lim(x→${a}) f(x). Justify using the one-sided values.`,
    givens: { a },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "As x approaches from the left, f(x) approaches 2a; from the right, f(x) approaches 2a:",
        blanks: [
          { label: "left limit", answer: `${fmt(2 * a - 0.001, 4)} ≈ ${2 * a}` },
          { label: "right limit", answer: `${fmt(2 * a + 0.001, 4)} ≈ ${2 * a}` },
        ],
      },
      {
        instruction: "Both one-sided limits agree, so the limit exists:",
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
  });
}

function makeSimplifyRational(rng: RNG): PrecalcMCQ {
  const a = randInt(rng, 2, 6);
  const correct = String(2 * a);
  const wrongPool = [
    String(a), String(a * a), String(2 * a + 1), String(2 * a - 1),
    "Does not exist", "0",
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "limits",
    subtype: "SimplifyRational",
    stem: `Evaluate: lim(x->${a}) (x^2 - ${a * a})/(x - ${a}).`,
    givens: { a },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Direct substitution gives 0/0 (indeterminate). Factor and cancel the common factor (x - ${a}):`,
        blanks: [{ label: "factored", answer: `lim(x->${a}) (x - ${a})(x + ${a})/(x - ${a})` }],
      },
      {
        instruction: `Cancel and substitute: lim(x->${a}) (x + ${a}):`,
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
  });
}

function makeLimitFromGraph(rng: RNG): PrecalcMCQ {
  // Three graph scenarios: hole (limit exists, differs from f(a)),
  // jump (one-sided disagree -> DNE), continuous point.
  const scenario = pick(rng, ["hole", "jump", "value"] as const);
  const a = randInt(rng, -2, 2);
  const L = randInt(rng, -3, 3);
  let svg: LimitGraphDiagram;
  let correct: string;
  let stem: string;
  let givens: Record<string, number>;
  if (scenario === "hole") {
    const fA = L + pick(rng, [1, 2, -1, -2] as const);
    svg = {
      kind: "limit-graph",
      segments: [
        { x1: a - 4, y1: L - 2, x2: a, y2: L },
        { x1: a, y1: L, x2: a + 4, y2: L + 2 },
      ],
      holes: [{ x: a, y: L }],
      dots: [{ x: a, y: fA }],
      xRange: [a - 4, a + 4],
      yRange: [Math.min(L, fA) - 2, Math.max(L, fA) + 2],
    };
    correct = String(L);
    stem = `Use the graph to find lim(x->${a}) f(x). Justify: the limit depends on nearby values, not f(${a}).`;
    givens = { a, L, fA, scenario: 0 };
  } else if (scenario === "jump") {
    const L2 = L + pick(rng, [2, 3] as const);
    svg = {
      kind: "limit-graph",
      segments: [
        { x1: a - 4, y1: L - 1, x2: a, y2: L },
        { x1: a, y1: L2, x2: a + 4, y2: L2 + 1 },
      ],
      holes: [{ x: a, y: L }, { x: a, y: L2 }],
      dots: [{ x: a, y: L }],
      xRange: [a - 4, a + 4],
      yRange: [Math.min(L, L2) - 2, Math.max(L, L2) + 2],
    };
    correct = "Does not exist";
    stem = `Use the graph to find lim(x->${a}) f(x). Justify using the one-sided limits.`;
    givens = { a, L, L2, scenario: 1 };
  } else {
    svg = {
      kind: "limit-graph",
      segments: [{ x1: a - 4, y1: L - 2, x2: a + 4, y2: L + 2 }],
      holes: [],
      dots: [{ x: a, y: L }],
      xRange: [a - 4, a + 4],
      yRange: [L - 3, L + 3],
    };
    correct = String(L);
    stem = `Use the graph to find lim(x->${a}) f(x).`;
    givens = { a, L, scenario: 2 };
  }
  const wrongPool = scenario === "jump"
    ? [String(L), `(${L} + ${L + 2})/2`, "0", "Infinity"]
    : ["Does not exist", String(L + 1), String(L - 1), "0", String(2 * L)];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "limits",
    subtype: "LimitFromGraph",
    stem,
    givens,
    correct,
    wrongPool,
    steps: [
      {
        instruction: scenario === "jump"
          ? `Left-hand limit is ${L} but right-hand limit is ${L + 2} (or ${L + 3}); they disagree.`
          : `Trace the graph toward x = ${a} from both sides: both approach ${L}.`,
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
    svgParams: svg,
  });
}

function makeLimitLaws(rng: RNG): PrecalcMCQ {
  const L = randInt(rng, -6, 6);
  let M = randInt(rng, -6, 6);
  if (M === 0) M = 2;
  const kind = pick(rng, ["sum", "product", "quotient", "combo"] as const);
  let expr: string;
  let val: number;
  if (kind === "sum") {
    expr = "f(x) + 2g(x)";
    val = L + 2 * M;
  } else if (kind === "product") {
    expr = "f(x)*g(x)";
    val = L * M;
  } else if (kind === "quotient") {
    expr = "f(x)/g(x)";
    val = L / M;
  } else {
    expr = "3f(x) - g(x)";
    val = 3 * L - M;
  }
  const correct = kind === "quotient" ? fmt(val) : String(val);
  const wrongPool = [
    kind === "quotient" ? fmt(val + 0.5) : String(val + 1),
    kind === "quotient" ? fmt(val - 0.5) : String(val - 1),
    String(L + M),
    String(L * M + 1),
    "Does not exist",
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "limits",
    subtype: "LimitLaws",
    stem: `Suppose lim(x->4) f(x) = ${L} and lim(x->4) g(x) = ${M}. Evaluate lim(x->4) [${expr}]. Justify using the limit laws.`,
    givens: { L, M, kindCode: kind === "sum" ? 0 : kind === "product" ? 1 : kind === "quotient" ? 2 : 3 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Apply the limit laws (sum/difference, constant multiple, product, quotient):",
        blanks: [{ label: "limit", answer: correct }],
      },
    ],
  });
}

function makeOneSidedPiecewise(rng: RNG): PrecalcMCQ {
  // f(x) = { p*x + q, x < a ; r*x + s, x >= a }; choose values so that
  // left and right limits are sometimes equal, sometimes not.
  const a = randInt(rng, -3, 3);
  const p = pick(rng, [1, 2, -1, -2] as const);
  const r = pick(rng, [1, 2, -1, -2] as const);
  const agree = rng() < 0.5;
  const leftVal = p * a + randInt(rng, -4, 4);
  const q = leftVal - p * a;
  const rightVal = agree ? leftVal : leftVal + pick(rng, [1, 2, -1, -2] as const);
  const s = rightVal - r * a;
  const qStr = q >= 0 ? `+ ${q}` : `- ${-q}`;
  const sStr = s >= 0 ? `+ ${s}` : `- ${-s}`;
  const correct = agree
    ? `Yes; both one-sided limits equal ${leftVal}`
    : `No; left limit ${leftVal} != right limit ${rightVal}`;
  const wrongPool = [
    agree ? `No; left limit ${leftVal} != right limit ${rightVal}` : `Yes; both one-sided limits equal ${leftVal}`,
    `Yes; f(${a}) is defined`,
    agree ? `No; the function has a jump` : `Yes; the pieces meet`,
    `No; lim(x->${a}) f(x) = 0`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "limits",
    subtype: "OneSidedPiecewise",
    stem: `Let f(x) = ${p}x ${qStr} for x < ${a}, and f(x) = ${r}x ${sStr} for x >= ${a}. Is f continuous at x = ${a}? Justify using one-sided limits.`,
    givens: { a, p, q, r, s, agree: agree ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Compute lim(x->${a}-) f(x) = ${p}(${a}) ${qStr} and lim(x->${a}+) f(x) = ${r}(${a}) ${sStr}:`,
        blanks: [
          { label: "left", answer: String(leftVal) },
          { label: "right", answer: String(rightVal) },
        ],
      },
      {
        instruction: agree
          ? "The one-sided limits agree, so the (two-sided) limit exists and equals f(a): continuous."
          : "The one-sided limits disagree, so the limit does not exist: not continuous.",
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
  });
}

// -- Registry ---------------------------------------------------------------

export const LIMIT_MAKERS: Record<LimitSubtype, (rng: RNG) => PrecalcMCQ> = {
  DirectSubstitution: makeDirectSubstitution,
  LimitFromTable: makeLimitFromTable,
  SimplifyRational: makeSimplifyRational,
  LimitFromGraph: makeLimitFromGraph,
  LimitLaws: makeLimitLaws,
  OneSidedPiecewise: makeOneSidedPiecewise,
};

/** Generate n limit MCQs at the given cumulative difficulty tier. */
export function generateLimitProblems(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcMCQ[] {
  const subtypes = allowedSubtypes(ALL_LIMIT_SUBTYPES, LIMIT_TIERS, difficulty);
  return Array.from({ length: n }, () => LIMIT_MAKERS[pick(rng, subtypes)](rng));
}
export const LIMIT_DIFFICULTY_TIERS: Record<PrecalcDifficulty, readonly LimitSubtype[]> = LIMIT_TIERS;

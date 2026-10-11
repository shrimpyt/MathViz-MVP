// PrecalcTrigFactory.ts
// AP Precalculus: trigonometry beyond right triangles - unit circle exact
// values, graphs of trig functions (amplitude/period/midline/phase shift),
// inverse trig evaluation, trig equations, calculator-active evaluation.
// Pure + seeded (mulberry32). Difficulty tiers 1|2|3 cumulative.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  fmt,
  fracStr,
  exactTrig,
  radLabelOf,
  trigValuePool,
  assembleMCQ,
  allowedSubtypes,
  type PrecalcMCQ,
  type PrecalcDifficulty,
  type TrigGraphDiagram,
} from "./PrecalcTypes";

export type TrigSubtype =
  | "UnitCircleValue"
  | "AmplitudePeriod"
  | "InverseTrig"
  | "TrigEquation"
  | "PhaseShift"
  | "CalculatorEval"
  | "GraphToEquation"
  | "TrigEquationCalc"
  | "PythagoreanIdentity";

const TRIG_TIERS: Record<PrecalcDifficulty, readonly TrigSubtype[]> = {
  1: ["UnitCircleValue", "AmplitudePeriod"],
  2: ["InverseTrig", "TrigEquation", "PhaseShift", "CalculatorEval"],
  3: ["GraphToEquation", "TrigEquationCalc", "PythagoreanIdentity"],
};

const ALL_TRIG_SUBTYPES = Object.values(TRIG_TIERS).flat();

function unitCircleDiagram(deg: number): TrigGraphDiagram | { kind: "unit-circle"; angleDeg: number; radianLabel: string; cosText: string; sinText: string } {
  const e = exactTrig(deg);
  return {
    kind: "unit-circle",
    angleDeg: deg,
    radianLabel: radLabelOf(e),
    cosText: e.cos,
    sinText: e.sin,
  };
}

function trigGraph(a: number, b: number, c: number, d: number, fnType: "sin" | "cos"): TrigGraphDiagram {
  const period = (2 * Math.PI) / b;
  return {
    kind: "trig-graph",
    fnType, a, b, c, d,
    xMin: -0.6 * period,
    xMax: 2.6 * period,
  };
}

// -- Makers ---------------------------------------------------------------

function makeUnitCircleValue(rng: RNG): PrecalcMCQ {
  const deg = pick(rng, [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330] as const);
  const fn = pick(rng, ["sin", "cos"] as const);
  const e = exactTrig(deg);
  const correct = fn === "sin" ? e.sin : e.cos;
  const pool = trigValuePool();
  const wrongPool = pool.filter((v) => v !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "UnitCircleValue",
    stem: `What is the exact value of ${fn} ${deg} degrees? (No calculator.)`,
    givens: { deg, fn: fn === "sin" ? 0 : 1 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Locate ${deg} degrees on the unit circle. The ${fn === "sin" ? "y" : "x"}-coordinate of the point is ${fn} ${deg} degrees:`,
        blanks: [{ label: `${fn} ${deg} deg`, answer: correct }],
      },
    ],
    svgParams: unitCircleDiagram(deg),
  });
}

function makeAmplitudePeriod(rng: RNG): PrecalcMCQ {
  const A = randInt(rng, 1, 4) * pick(rng, [1, -1] as const);
  const B = pick(rng, [1, 2, 3] as const);
  const fnType = pick(rng, ["sin", "cos"] as const);
  const askAmp = rng() < 0.5;
  const periodStr = B === 1 ? "2pi" : B === 2 ? "pi" : "2pi/3";
  const correct = askAmp ? String(Math.abs(A)) : periodStr;
  const wrongPool = askAmp
    ? [String(Math.abs(A) + 1), String(Math.abs(A) + 2), "1/2", String(Math.abs(A) + 3)]
    : ["2pi", "pi", "2pi/3", "pi/2", "4pi", "pi/3"].filter((v) => v !== periodStr);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "AmplitudePeriod",
    stem: askAmp
      ? `What is the amplitude of y = ${A} ${fnType}(${B}x)?`
      : `What is the period of y = ${A} ${fnType}(${B}x)? (Use "pi" for the symbol.)`,
    givens: { A, B, fn: fnType === "sin" ? 0 : 1, askAmp: askAmp ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: askAmp
          ? "Amplitude = |A|:"
          : "Period = 2pi/|B|:",
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
    svgParams: trigGraph(A, B, 0, 0, fnType),
  });
}

function makeInverseTrig(rng: RNG): PrecalcMCQ {
  const opts = [
    { fn: "arcsin", val: "1/2", ans: "pi/6", num: 1, den: 6 },
    { fn: "arcsin", val: "sqrt(3)/2", ans: "pi/3", num: 1, den: 3 },
    { fn: "arcsin", val: "sqrt(2)/2", ans: "pi/4", num: 1, den: 4 },
    { fn: "arccos", val: "1/2", ans: "pi/3", num: 1, den: 3 },
    { fn: "arccos", val: "sqrt(2)/2", ans: "pi/4", num: 1, den: 4 },
    { fn: "arccos", val: "0", ans: "pi/2", num: 1, den: 2 },
    { fn: "arctan", val: "1", ans: "pi/4", num: 1, den: 4 },
    { fn: "arctan", val: "sqrt(3)", ans: "pi/3", num: 1, den: 3 },
    { fn: "arctan", val: "sqrt(3)/3", ans: "pi/6", num: 1, den: 6 },
  ];
  const o = pick(rng, opts);
  const correct = o.ans;
  const wrongPool = ["pi/6", "pi/4", "pi/3", "pi/2", "2pi/3", "3pi/4", "0"].filter((v) => v !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "InverseTrig",
    stem: `Evaluate ${o.fn}(${o.val}). Give the exact value in radians (use "pi"). No calculator.`,
    givens: { num: o.num, den: o.den, fnCode: o.fn === "arcsin" ? 0 : o.fn === "arccos" ? 1 : 2 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Find the angle in the principal range whose ${o.fn.slice(3)} equals ${o.val}:`,
        blanks: [{ label: "angle", answer: correct }],
      },
    ],
  });
}

function makeTrigEquation(rng: RNG): PrecalcMCQ {
  const opts = [
    { fn: "sin", val: "1/2", sols: ["pi/6", "5pi/6"], v1: [1, 6], v2: [5, 6] },
    { fn: "sin", val: "sqrt(3)/2", sols: ["pi/3", "2pi/3"], v1: [1, 3], v2: [2, 3] },
    { fn: "cos", val: "1/2", sols: ["pi/3", "5pi/3"], v1: [1, 3], v2: [5, 3] },
    { fn: "cos", val: "-sqrt(3)/2", sols: ["5pi/6", "7pi/6"], v1: [5, 6], v2: [7, 6] },
    { fn: "sin", val: "sqrt(2)/2", sols: ["pi/4", "3pi/4"], v1: [1, 4], v2: [3, 4] },
    { fn: "cos", val: "sqrt(2)/2", sols: ["pi/4", "7pi/4"], v1: [1, 4], v2: [7, 4] },
  ];
  const o = pick(rng, opts);
  const correct = `x = ${o.sols[0]}, ${o.sols[1]}`;
  const wrongPool = [
    `x = ${o.sols[0]}`,
    `x = ${o.sols[1]}`,
    `x = ${o.sols[1]}, ${o.sols[0]} + 2pi`,
    `x = pi/6, 5pi/6`,
    `x = pi/4, 3pi/4`,
    `x = pi/3, 2pi/3`,
  ].filter((w) => w !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "TrigEquation",
    stem: `Solve ${o.fn} x = ${o.val} for x in [0, 2pi). Give all solutions (use "pi"). No calculator.`,
    givens: { v1n: o.v1[0], v1d: o.v1[1], v2n: o.v2[0], v2d: o.v2[1], fn: o.fn === "sin" ? 0 : 1 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Find the reference angle, then use the signs of ${o.fn} to locate both solutions in [0, 2pi):`,
        blanks: [{ label: "solutions", answer: correct }],
      },
    ],
  });
}

function makePhaseShift(rng: RNG): PrecalcMCQ {
  const A = randInt(rng, 1, 3);
  const B = pick(rng, [1, 2] as const);
  const shifts = [
    { num: 1, den: 6 }, { num: 1, den: 4 }, { num: 1, den: 3 },
    { num: 1, den: 2 }, { num: 1, den: 1 },
  ];
  const s = pick(rng, shifts);
  const shiftStr = `pi/${s.den}`.replace("pi/1", "pi");
  const D = randInt(rng, -2, 2);
  const fnType = pick(rng, ["sin", "cos"] as const);
  const eq = `y = ${A} ${fnType}(${B === 1 ? "" : B}(x - ${shiftStr})) ${D >= 0 ? "+" : "-"} ${Math.abs(D)}`;
  const correct = `${shiftStr} to the right`;
  const wrongPool = [
    `${shiftStr} to the left`,
    `${s.num === 1 && s.den === 1 ? "2pi" : `2${shiftStr}`} to the right`,
    `${shiftStr} to the right (vertical shift ${D})`,
    `${B === 1 ? shiftStr : `${B}*${shiftStr}`} to the left`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "PhaseShift",
    stem: `What is the phase shift of ${eq}?`,
    givens: { A, B, sn: s.num, sd: s.den, D, fn: fnType === "sin" ? 0 : 1 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "The graph is in the form a*fn(b(x - c)) + d, so the phase shift is c:",
        blanks: [{ label: "phase shift", answer: correct }],
      },
    ],
    svgParams: trigGraph(A, B, (s.num / s.den) * Math.PI, D, fnType),
  });
}

function makeCalculatorEval(rng: RNG): PrecalcMCQ {
  const fn = pick(rng, ["sin", "cos", "tan"] as const);
  // Loop (bounded) instead of recursing, to stay clear of tan asymptotes.
  let x = 0;
  let val = NaN;
  for (let tries = 0; tries < 50; tries++) {
    x = Math.round(rng() * 628) / 100; // 0.00..6.28
    val = fn === "sin" ? Math.sin(x) : fn === "cos" ? Math.cos(x) : Math.tan(x);
    if (isFinite(val) && Math.abs(val) <= 50) break;
    val = NaN;
  }
  if (!isFinite(val)) {
    x = 1.0;
    val = fn === "sin" ? Math.sin(x) : fn === "cos" ? Math.cos(x) : Math.tan(x);
  }
  const correct = fmt(val);
  const wrongPool = [
    fmt(val + 0.1), fmt(val - 0.1), fmt(val + 0.5), fmt(val - 0.5),
    fmt(-val), fmt(val + 1),
  ];
  return assembleMCQ(rng, {
    calculator: true,
    topicTag: "trig",
    subtype: "CalculatorEval",
    stem: `Use a calculator (radian mode) to evaluate ${fn}(${fmt(x, 2)}), rounded to three decimal places.`,
    givens: { x: Math.round(x * 100) / 100, fn: fn === "sin" ? 0 : fn === "cos" ? 1 : 2 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Make sure the calculator is in radian mode, then evaluate:",
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
  });
}

function makeGraphToEquation(rng: RNG): PrecalcMCQ {
  const A = randInt(rng, 1, 3);
  const B = pick(rng, [1, 2] as const);
  const fnType = pick(rng, ["sin", "cos"] as const);
  const D = pick(rng, [-1, 0, 1, 2] as const);
  const bStr = B === 1 ? "" : String(B);
  const dStr = D === 0 ? "" : D > 0 ? ` + ${D}` : ` - ${-D}`;
  const correct = `y = ${A} ${fnType}(${bStr}x)${dStr}`;
  const wrongPool = [
    `y = ${A + 1} ${fnType}(${bStr}x)${dStr}`,
    `y = ${A} ${fnType === "sin" ? "cos" : "sin"}(${bStr}x)${dStr}`,
    `y = ${A} ${fnType}(${B === 1 ? "2" : ""}x)${dStr}`,
    D === 0 ? `y = ${A} ${fnType}(${bStr}x) + 1` : `y = ${A} ${fnType}(${bStr}x)`,
    `y = ${A} ${fnType}(${bStr}x)${dStr === "" ? " + 1" : ""}`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "GraphToEquation",
    stem: "Which equation matches the graph shown? Justify by identifying the amplitude, period, and midline from the graph.",
    givens: { A, B, D, fn: fnType === "sin" ? 0 : 1 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Read the amplitude (${A}), period (${B === 1 ? "2pi" : "pi"}), and midline (y = ${D}) from the graph:`,
        blanks: [{ label: "equation", answer: correct }],
      },
    ],
    svgParams: trigGraph(A, B, 0, D, fnType),
  });
}

function makeTrigEquationCalc(rng: RNG): PrecalcMCQ {
  // Solve p*sin(x) + q = k on [0, 2pi) numerically -> two solutions, 3 decimals
  const p = pick(rng, [2, 3] as const);
  const target = Math.round((rng() * 1.2 + 0.2) * 100) / 100; // sin x = target in (0.2, 1.4)*? keep in (-1,1)
  const t = Math.min(0.9, Math.max(-0.9, (Math.round((rng() * 1.6 - 0.8) * 100) / 100)));
  const s1 = Math.asin(t);
  const s2 = Math.PI - s1;
  const sols = [s1, s2].map((s) => ((s % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((x, y) => x - y);
  const correct = `x = ${fmt(sols[0])}, ${fmt(sols[1])}`;
  const wrongPool = [
    `x = ${fmt(sols[0])}`,
    `x = ${fmt(sols[1])}`,
    `x = ${fmt(sols[0] + 0.1)}, ${fmt(sols[1])}`,
    `x = ${fmt(sols[0])}, ${fmt(sols[1] + 0.1)}`,
    `x = ${fmt(sols[0] - 0.2)}, ${fmt(sols[1] - 0.2)}`,
  ];
  void target;
  void p;
  return assembleMCQ(rng, {
    calculator: true,
    topicTag: "trig",
    subtype: "TrigEquationCalc",
    stem: `Use a calculator to solve sin x = ${fmt(t, 2)} for x in [0, 2pi). Round each solution to three decimal places.`,
    givens: { t: Math.round(t * 100) / 100 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use inverse sine for the first-quadrant solution, then pi minus that for the second:",
        blanks: [{ label: "solutions", answer: correct }],
      },
    ],
  });
}

function makePythagoreanIdentity(rng: RNG): PrecalcMCQ {
  // [opposite, hypotenuse] pairs; adjacent leg is exact by Pythagoras.
  const triples: [number, number][] = [[3, 5], [5, 13], [8, 17], [6, 10]];
  const [n, m] = pick(rng, triples);
  const quad = pick(rng, [2, 3] as const); // sin positive/negative combos
  const sinVal = quad === 2 ? n / m : -n / m;
  // cos sign: QII negative, QIII negative
  const cosN = -Math.round(Math.sqrt(m * m - n * n));
  const correct = fracStr(cosN, m);
  const wrongPool = [
    fracStr(-cosN, m), // wrong sign
    fracStr(cosN + 1, m), // arithmetic slips (different rationals: always distinct)
    fracStr(cosN - 1, m),
    fracStr(cosN, m + 2),
    fracStr(n, m), // confused sin for cos
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "trig",
    subtype: "PythagoreanIdentity",
    stem: `If sin(theta) = ${fmt(sinVal)} and theta is in Quadrant ${quad === 2 ? "II" : "III"}, what is cos(theta)? Give the exact value.`,
    givens: { sinN: Math.round(sinVal * m), m, quad },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Use sin^2 + cos^2 = 1: cos^2 = 1 - (${fmt(sinVal)})^2:`,
        blanks: [{ label: "cos^2", answer: `${m * m - n * n}/${m * m}` }],
      },
      {
        instruction: `Cosine is negative in Quadrant ${quad === 2 ? "II" : "III"}:`,
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
  });
}

// -- Registry ---------------------------------------------------------------

export const TRIG_MAKERS: Record<TrigSubtype, (rng: RNG) => PrecalcMCQ> = {
  UnitCircleValue: makeUnitCircleValue,
  AmplitudePeriod: makeAmplitudePeriod,
  InverseTrig: makeInverseTrig,
  TrigEquation: makeTrigEquation,
  PhaseShift: makePhaseShift,
  CalculatorEval: makeCalculatorEval,
  GraphToEquation: makeGraphToEquation,
  TrigEquationCalc: makeTrigEquationCalc,
  PythagoreanIdentity: makePythagoreanIdentity,
};

/** Generate n trig MCQs at the given cumulative difficulty tier. */
export function generateTrigProblems(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcMCQ[] {
  const subtypes = allowedSubtypes(ALL_TRIG_SUBTYPES, TRIG_TIERS, difficulty);
  return Array.from({ length: n }, () => TRIG_MAKERS[pick(rng, subtypes)](rng));
}
export const TRIG_DIFFICULTY_TIERS: Record<PrecalcDifficulty, readonly TrigSubtype[]> = TRIG_TIERS;

// PrecalcParamPolarFactory.ts
// AP Precalculus: parametric & polar basics - evaluating parametric points,
// eliminating the parameter, polar <-> rectangular conversion, plotting polar
// points, identifying polar curves, symmetry tests.
// Pure + seeded (mulberry32). Difficulty tiers 1|2|3 cumulative.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  fmt,
  exactTrig,
  assembleMCQ,
  allowedSubtypes,
  type PrecalcMCQ,
  type PrecalcDifficulty,
  type PolarDiagram,
} from "./PrecalcTypes";

export type ParamPolarSubtype =
  | "ParametricEvaluate"
  | "PolarToRect"
  | "EliminateParameter"
  | "RectToPolar"
  | "PlotPolarPoint"
  | "PolarCurveIdentify"
  | "PolarSymmetry"
  | "ParamTrigEliminate";

const PARAMPOLAR_TIERS: Record<PrecalcDifficulty, readonly ParamPolarSubtype[]> = {
  1: ["ParametricEvaluate", "PolarToRect"],
  2: ["EliminateParameter", "RectToPolar", "PlotPolarPoint"],
  3: ["PolarCurveIdentify", "PolarSymmetry", "ParamTrigEliminate"],
};

const ALL_SUBTYPES = Object.values(PARAMPOLAR_TIERS).flat();

const STD_DEG = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330] as const;

function polarDiagram(r: number, deg: number, label: string, rMax: number): PolarDiagram {
  return { kind: "polar-grid", points: [{ r, thetaDeg: deg, label }], rMax };
}

// -- Makers ---------------------------------------------------------------

function makeParametricEvaluate(rng: RNG): PrecalcMCQ {
  const a = pick(rng, [2, 3, -2] as const);
  const b = randInt(rng, -3, 3);
  const c = pick(rng, [1, 2, -1] as const);
  const d = randInt(rng, -4, 4);
  const t = randInt(rng, -2, 3);
  const x = a * t + b;
  const y = c * t * t + d;
  const correct = `(${x}, ${y})`;
  const wrongPool = [
    `(${x + 1}, ${y})`,
    `(${x}, ${y + 1})`,
    `(${x - 1}, ${y})`,
    `(${x}, ${y - 1})`,
    `(${x + 1}, ${y + 1})`,
    `(${x + 2}, ${y})`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "ParametricEvaluate",
    stem: `A curve is defined parametrically by x = ${a}t ${b >= 0 ? "+" : "-"} ${Math.abs(b)}, y = ${c}t^2 ${d >= 0 ? "+" : "-"} ${Math.abs(d)}. What point (x, y) corresponds to t = ${t}?`,
    givens: { a, b, c, d, t },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Substitute t = ${t} into each equation:`,
        blanks: [
          { label: "x", answer: `${a}(${t}) ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = ${x}` },
          { label: "y", answer: `${c}(${t})^2 ${d >= 0 ? "+" : "-"} ${Math.abs(d)} = ${y}` },
        ],
      },
      { instruction: "Answer:", blanks: [{ label: "point", answer: correct }] },
    ],
  });
}

function makePolarToRect(rng: RNG): PrecalcMCQ {
  const r = pick(rng, [2, 4, 6] as const);
  const deg = pick(rng, STD_DEG);
  const e = exactTrig(deg);
  const x = r * e.cosN;
  const y = r * e.sinN;
  const correct = `(${fmt(x)}, ${fmt(y)})`;
  const wrongPool = [
    `(${fmt(y)}, ${fmt(x)})`,
    `(${fmt(-x)}, ${fmt(y)})`,
    `(${fmt(x)}, ${fmt(-y)})`,
    `(${fmt(x + 1)}, ${fmt(y)})`,
    `(${fmt(2 * x)}, ${fmt(2 * y)})`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "PolarToRect",
    stem: `Convert the polar point (r, theta) = (${r}, ${deg} deg) to rectangular coordinates (x, y). Give exact values.`,
    givens: { r, deg },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use x = r cos(theta), y = r sin(theta):",
        blanks: [
          { label: "x", answer: `${r} cos ${deg} deg = ${fmt(x)}` },
          { label: "y", answer: `${r} sin ${deg} deg = ${fmt(y)}` },
        ],
      },
      { instruction: "Answer:", blanks: [{ label: "point", answer: correct }] },
    ],
    svgParams: polarDiagram(r, deg, "P", r + 1),
  });
}

function makeEliminateParameter(rng: RNG): PrecalcMCQ {
  const kind = pick(rng, ["linear", "quadratic"] as const);
  let correct: string;
  let stem: string;
  let givens: Record<string, number>;
  if (kind === "linear") {
    const m = pick(rng, [2, 3, -2] as const);
    const b = randInt(rng, -5, 5);
    const h = randInt(rng, -3, 3);
    // x = t + h, y = m*t + b  ->  y = m(x - h) + b
    const c = b - m * h;
    correct = `y = ${m}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}`;
    stem = `Eliminate the parameter: x = t ${h >= 0 ? "+" : "-"} ${Math.abs(h)}, y = ${m}t ${b >= 0 ? "+" : "-"} ${Math.abs(b)}.`;
    givens = { m, b, h, kindCode: 0 };
  } else {
    const a = pick(rng, [2, 3] as const);
    // x = a*t, y = t^2  ->  y = x^2 / a^2
    correct = `y = x^2/${a * a}`;
    stem = `Eliminate the parameter: x = ${a}t, y = t^2.`;
    givens = { a, kindCode: 1 };
  }
  const m = givens.m as number;
  const b = givens.b as number;
  const h = givens.h as number;
  const c = b - m * h;
  const cSign = c >= 0 ? "+" : "-";
  const wrongPool = kind === "linear"
    ? [
        `y = ${m}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`,
        `y = ${m}x ${cSign} ${Math.abs(c) + 1}`,
        `x = ${m}y ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`,
        `y = ${-m}x ${cSign} ${Math.abs(c)}`,
      ]
    : [`y = x^2/${givens.a}`, `y = ${givens.a}x^2`, `x = y^2/${givens.a * givens.a}`, `y = x^2`];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "EliminateParameter",
    stem,
    givens,
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Solve one equation for t, then substitute into the other:",
        blanks: [{ label: "cartesian", answer: correct }],
      },
    ],
  });
}

function makeRectToPolar(rng: RNG): PrecalcMCQ {
  // Nice points: axis points and 45-degree multiples
  const opts = [
    { x: 3, y: 0, r: "3", deg: 0 },
    { x: 0, y: 4, r: "4", deg: 90 },
    { x: 2, y: 2, r: "2sqrt(2)", deg: 45 },
    { x: -3, y: 3, r: "3sqrt(2)", deg: 135 },
    { x: 1, y: -1, r: "sqrt(2)", deg: 315 },
    { x: 5, y: 0, r: "5", deg: 0 },
  ];
  const o = pick(rng, opts);
  const correct = `(r, theta) = (${o.r}, ${o.deg} deg)`;
  const wrongPool = [
    `(r, theta) = (${o.r}, ${(o.deg + 180) % 360} deg)`,
    `(r, theta) = (${o.r === "3" ? "sqrt(3)" : "3"}, ${o.deg} deg)`,
    `(r, theta) = (${o.r}, ${(o.deg + 90) % 360} deg)`,
    `(r, theta) = (${o.r}, ${(o.deg + 270) % 360} deg)`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "RectToPolar",
    stem: `Convert (${o.x}, ${o.y}) to polar coordinates (r, theta) with r > 0 and theta in [0, 360) degrees.`,
    givens: { x: o.x, y: o.y },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use r = sqrt(x^2 + y^2) and theta = arctan(y/x), adjusted to the correct quadrant:",
        blanks: [
          { label: "r", answer: o.r },
          { label: "theta", answer: `${o.deg} deg` },
        ],
      },
    ],
  });
}

function makePlotPolarPoint(rng: RNG): PrecalcMCQ {
  const r = pick(rng, [2, 3, 4, -2, -3] as const);
  const deg = pick(rng, [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330] as const);
  // Effective standard angle after handling negative r
  const eff = ((deg + (r < 0 ? 180 : 0)) % 360 + 360) % 360;
  const quad = eff === 0 || eff === 90 || eff === 180 || eff === 270
    ? "on an axis"
    : eff < 90 ? "Quadrant I" : eff < 180 ? "Quadrant II" : eff < 270 ? "Quadrant III" : "Quadrant IV";
  const correct = `${quad}; distance ${Math.abs(r)} from the pole`;
  const wrongPool = [
    `${quad === "Quadrant I" ? "Quadrant III" : "Quadrant I"}; distance ${Math.abs(r)} from the pole`,
    `${quad}; distance ${Math.abs(r) + 1} from the pole`,
    `Quadrant II; distance ${Math.abs(r)} from the pole`,
    `Quadrant IV; distance ${Math.abs(r)} from the pole`,
  ].filter((w) => w !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "PlotPolarPoint",
    stem: `The polar point (${r}, ${deg} deg) is plotted. Which description is correct? (Recall: negative r flips to the opposite direction.)`,
    givens: { r, deg },
    correct,
    wrongPool,
    steps: [
      {
        instruction: r < 0
          ? `r is negative, so plot in the opposite direction of ${deg} deg (effective angle ${eff} deg):`
          : `Plot angle ${deg} deg at distance ${r} from the pole:`,
        blanks: [{ label: "location", answer: correct }],
      },
    ],
    svgParams: polarDiagram(r, deg, "P", Math.abs(r) + 1),
  });
}

function makePolarCurveIdentify(rng: RNG): PrecalcMCQ {
  const kind = pick(rng, ["cardioid", "circle", "rose", "limacon"] as const);
  let eq: string;
  let correct: string;
  if (kind === "cardioid") {
    const a = pick(rng, [2, 3] as const);
    eq = `r = ${a} + ${a} cos(theta)`;
    correct = "Cardioid (heart-shaped)";
  } else if (kind === "circle") {
    const a = pick(rng, [2, 4, 6] as const);
    eq = `r = ${a} cos(theta)`;
    correct = "Circle";
  } else if (kind === "rose") {
    const k = pick(rng, [2, 3] as const);
    eq = `r = ${pick(rng, [3, 4] as const)} sin(${k}theta)`;
    correct = `Rose with ${2 * k} petals`;
  } else {
    const a = pick(rng, [1, 2] as const);
    const b = a + pick(rng, [1, 2] as const);
    eq = `r = ${a} + ${b} sin(theta)`;
    correct = "Limacon (dimpled/looped)";
  }
  const wrongPool = [
    "Cardioid (heart-shaped)",
    "Circle",
    "Rose with 4 petals",
    "Limacon (dimpled/looped)",
    "Rose with 6 petals",
    "Line",
  ].filter((w) => w !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "PolarCurveIdentify",
    stem: `Which best describes the graph of the polar equation ${eq}?`,
    givens: { kindCode: kind === "cardioid" ? 0 : kind === "circle" ? 1 : kind === "rose" ? 2 : 3 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Match the form: r = a (circle through pole), r = a +- a cos/sin (cardioid), r = a cos(k theta) (rose), r = a +- b trig (limacon):",
        blanks: [{ label: "curve", answer: correct }],
      },
    ],
  });
}

function makePolarSymmetry(rng: RNG): PrecalcMCQ {
  // r = a + b sin(theta): symmetric about theta = pi/2 (the y-axis)
  // r = a + b cos(theta): symmetric about the polar axis
  const useSin = rng() < 0.5;
  const a = pick(rng, [1, 2] as const);
  const b = a + pick(rng, [1, 2] as const);
  const trig = useSin ? "sin" : "cos";
  const eq = `r = ${a} + ${b} ${trig}(theta)`;
  const correct = useSin
    ? "Symmetric about theta = pi/2 (the vertical axis)"
    : "Symmetric about the polar axis (theta = 0)";
  const wrongPool = [
    useSin ? "Symmetric about the polar axis (theta = 0)" : "Symmetric about theta = pi/2 (the vertical axis)",
    "Symmetric about the pole only",
    "No symmetry",
    "Symmetric about theta = pi/4",
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "PolarSymmetry",
    stem: `Use a symmetry test to determine the symmetry of ${eq}. Justify your answer.`,
    givens: { a, b, useSin: useSin ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: useSin
          ? "Test r(-theta): sin is odd, but here test (r, pi - theta): r = a + b sin(pi - theta) = a + b sin(theta). Unchanged, so symmetric about theta = pi/2."
          : "Test (r, -theta): cos(-theta) = cos(theta), so the equation is unchanged: symmetric about the polar axis.",
        blanks: [{ label: "symmetry", answer: correct }],
      },
    ],
  });
}

function makeParamTrigEliminate(rng: RNG): PrecalcMCQ {
  const kind = pick(rng, ["circle", "shifted"] as const);
  let correct: string;
  let stem: string;
  let givens: Record<string, number>;
  if (kind === "circle") {
    const r = pick(rng, [2, 3, 4, 5] as const);
    correct = `x^2 + y^2 = ${r * r}`;
    stem = `Eliminate the parameter: x = ${r} cos(t), y = ${r} sin(t).`;
    givens = { r, kindCode: 0 };
  } else {
    const a = pick(rng, [2, 3] as const);
    // x = t^2 + 1, y = 2t  ->  t = y/2  ->  x = y^2/4 + 1
    correct = `x = y^2/4 + ${a}`;
    stem = `Eliminate the parameter: x = t^2 + ${a}, y = 2t.`;
    givens = { a, kindCode: 1 };
  }
  const wrongPool = kind === "circle"
    ? [
        `x^2 + y^2 = ${givens.r}`,
        `x^2 - y^2 = ${givens.r * givens.r}`,
        `(x - ${givens.r})^2 + y^2 = ${givens.r * givens.r}`,
        `y = x^2`,
      ]
    : [
        `x = y^2/4`,
        `x = y^2 + ${givens.a}`,
        `y = x^2/4 + ${givens.a}`,
        `x = y^2/2 + ${givens.a}`,
      ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "parametric-polar",
    subtype: "ParamTrigEliminate",
    stem,
    givens,
    correct,
    wrongPool,
    steps: [
      {
        instruction: kind === "circle"
          ? "Use cos^2(t) + sin^2(t) = 1: square both equations and add."
          : "Solve y = 2t for t = y/2, then substitute into x.",
        blanks: [{ label: "cartesian", answer: correct }],
      },
    ],
  });
}

// -- Registry ---------------------------------------------------------------

export const PARAMPOLAR_MAKERS: Record<ParamPolarSubtype, (rng: RNG) => PrecalcMCQ> = {
  ParametricEvaluate: makeParametricEvaluate,
  PolarToRect: makePolarToRect,
  EliminateParameter: makeEliminateParameter,
  RectToPolar: makeRectToPolar,
  PlotPolarPoint: makePlotPolarPoint,
  PolarCurveIdentify: makePolarCurveIdentify,
  PolarSymmetry: makePolarSymmetry,
  ParamTrigEliminate: makeParamTrigEliminate,
};

/** Generate n parametric/polar MCQs at the given cumulative difficulty tier. */
export function generateParamPolarProblems(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcMCQ[] {
  const subtypes = allowedSubtypes(ALL_SUBTYPES, PARAMPOLAR_TIERS, difficulty);
  return Array.from({ length: n }, () => PARAMPOLAR_MAKERS[pick(rng, subtypes)](rng));
}
export const PARAMPOLAR_DIFFICULTY_TIERS: Record<PrecalcDifficulty, readonly ParamPolarSubtype[]> = PARAMPOLAR_TIERS;

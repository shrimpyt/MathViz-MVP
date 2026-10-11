// PrecalcConicsFactory.ts
// AP Precalculus: conic sections - identifying conics, circles (center/radius,
// equations, completing the square), parabolas (vertex, focus, directrix),
// ellipses and hyperbolas (features from standard form, equations from features).
// Pure + seeded (mulberry32). Difficulty tiers 1|2|3 cumulative.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  shiftFactor,
  assembleMCQ,
  allowedSubtypes,
  type PrecalcMCQ,
  type PrecalcDifficulty,
  type ConicDiagram,
} from "./PrecalcTypes";

export type ConicSubtype =
  | "IdentifyConic"
  | "CircleCenterRadius"
  | "CircleEquation"
  | "ParabolaVertex"
  | "EllipseFeatures"
  | "HyperbolaFeatures"
  | "ParabolaFocus"
  | "CompleteSquare"
  | "EllipseFromFeatures"
  | "HyperbolaFromFeatures";

const CONIC_TIERS: Record<PrecalcDifficulty, readonly ConicSubtype[]> = {
  1: ["IdentifyConic", "CircleCenterRadius", "CircleEquation"],
  2: ["ParabolaVertex", "EllipseFeatures", "HyperbolaFeatures"],
  3: ["ParabolaFocus", "CompleteSquare", "EllipseFromFeatures", "HyperbolaFromFeatures"],
};

const ALL_CONIC_SUBTYPES = Object.values(CONIC_TIERS).flat();

function circleEq(h: number, k: number, r: number): string {
  return `${shiftFactor("x", h)} + ${shiftFactor("y", k)} = ${r * r}`;
}

function conicDiagramBase(
  conicType: ConicDiagram["conicType"],
  cx: number, cy: number, a: number, b: number,
  extra?: Partial<ConicDiagram>
): ConicDiagram {
  return {
    kind: "conic",
    conicType, cx, cy, a, b,
    range: Math.max(Math.abs(cx) + a, Math.abs(cy) + b, 5) + 1,
    ...extra,
  };
}

/** "(x-3)" style linear factor (no square) for vertex-form parabolas. */
function linFactor(v: "x" | "y", h: number): string {
  if (h === 0) return v;
  return h > 0 ? `(${v}-${h})` : `(${v}+${-h})`;
}

// -- Makers ---------------------------------------------------------------

function makeIdentifyConic(rng: RNG): PrecalcMCQ {
  const kind = pick(rng, ["parabola", "circle", "ellipse", "hyperbola"] as const);
  let eq: string;
  let givens: Record<string, number>;
  if (kind === "parabola") {
    const a = pick(rng, [1, 2, -1, -2] as const);
    const h = randInt(rng, -3, 3), k = randInt(rng, -3, 3);
    eq = `y = ${a}${linFactor("x", h)}^2 ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`;
    givens = { a, h, k };
  } else if (kind === "circle") {
    const h = randInt(rng, -3, 3), k = randInt(rng, -3, 3), r = randInt(rng, 2, 6);
    eq = circleEq(h, k, r);
    givens = { h, k, r };
  } else if (kind === "ellipse") {
    const a = randInt(rng, 3, 6), b = randInt(rng, 2, a - 1);
    eq = `x^2/${a * a} + y^2/${b * b} = 1`;
    givens = { a, b };
  } else {
    const a = randInt(rng, 2, 5), b = randInt(rng, 2, 5);
    eq = `x^2/${a * a} − y^2/${b * b} = 1`;
    givens = { a, b };
  }
  const correct = kind[0].toUpperCase() + kind.slice(1);
  const wrongPool = ["Parabola", "Circle", "Ellipse", "Hyperbola"].filter((w) => w !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "IdentifyConic",
    stem: `Which type of conic section does the equation ${eq} describe?`,
    givens,
    correct,
    wrongPool,
    steps: [
      {
        instruction: "One squared term -> parabola; x^2+y^2 same coefficient -> circle; same sign, different denominators -> ellipse; opposite signs -> hyperbola.",
        blanks: [{ label: "type", answer: correct }],
      },
    ],
  });
}

function makeCircleCenterRadius(rng: RNG): PrecalcMCQ {
  const h = randInt(rng, -5, 5), k = randInt(rng, -5, 5), r = randInt(rng, 2, 9);
  const correct = `Center (${h}, ${k}), radius ${r}`;
  const wrongPool = [
    `Center (${-h}, ${-k}), radius ${r}`,
    `Center (${h}, ${k}), radius ${r * r}`,
    `Center (${k}, ${h}), radius ${r}`,
    `Center (${h}, ${k}), radius sqrt(${r})`,
    `Center (${h + 1}, ${k}), radius ${r}`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "CircleCenterRadius",
    stem: `What are the center and radius of the circle ${circleEq(h, k, r)}?`,
    givens: { h, k, r },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Match (x-h)^2 + (y-k)^2 = r^2. Read h, k, and r:",
        blanks: [{ label: "center", answer: `(${h}, ${k})` }, { label: "radius", answer: `${r}` }],
      },
    ],
    svgParams: conicDiagramBase("circle", h, k, r, r, {
      marks: [{ x: h, y: k, label: "C" }],
    }),
  });
}

function makeCircleEquation(rng: RNG): PrecalcMCQ {
  const h = randInt(rng, -5, 5), k = randInt(rng, -5, 5), r = randInt(rng, 2, 8);
  const correct = circleEq(h, k, r);
  const wrongPool = [
    `${shiftFactor("x", -h)} + ${shiftFactor("y", -k)} = ${r * r}`,
    `${shiftFactor("x", h)} + ${shiftFactor("y", k)} = ${r}`,
    `(x-${h})^2 - (y-${k})^2 = ${r * r}`,
    `(x-${h})^2 + (y-${k})^2 = ${2 * r}`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "CircleEquation",
    stem: `What is the equation of the circle with center (${h}, ${k}) and radius ${r}?`,
    givens: { h, k, r },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Substitute into (x-h)^2 + (y-k)^2 = r^2:",
        blanks: [{ label: "equation", answer: correct }],
      },
    ],
  });
}

function makeParabolaVertex(rng: RNG): PrecalcMCQ {
  const vertical = rng() < 0.6;
  const a = pick(rng, [1, 2, -1, -2, 3] as const);
  const h = randInt(rng, -4, 4), k = randInt(rng, -4, 4);
  let eq: string;
  let opens: string;
  if (vertical) {
    eq = `y = ${a}${linFactor("x", h)}^2 ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`;
    opens = a > 0 ? "upward" : "downward";
  } else {
    eq = `x = ${a}${linFactor("y", k)}^2 ${h >= 0 ? "+" : "-"} ${Math.abs(h)}`;
    opens = a > 0 ? "rightward" : "leftward";
  }
  const correct = `Vertex (${h}, ${k}); opens ${opens}`;
  const wrongOpens = a > 0 ? (vertical ? "downward" : "leftward") : vertical ? "upward" : "rightward";
  const wrongPool = [
    `Vertex (${h}, ${k}); opens ${wrongOpens}`,
    `Vertex (${-h}, ${-k}); opens ${wrongOpens}`,
    `Vertex (${h - 1}, ${k + 1}); opens ${opens}`,
    `Vertex (${h + 1}, ${k - 1}); opens ${opens}`,
    `Vertex (${h + 2}, ${k}); opens ${opens}`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "ParabolaVertex",
    stem: `What are the vertex and direction of opening of the parabola ${eq}?`,
    givens: { a, h, k, vertical: vertical ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Vertex form y = a(x-h)^2 + k has vertex (h, k); the sign of a gives the direction:",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }, { label: "opens", answer: opens }],
      },
    ],
    svgParams: conicDiagramBase("parabola", h, k, 2, 2, {
      p: 1 / (4 * a),
      orientation: vertical ? (a > 0 ? "up" : "down") : a > 0 ? "right" : "left",
      marks: [{ x: h, y: k, label: "V" }],
    }),
  });
}

function makeEllipseFeatures(rng: RNG): PrecalcMCQ {
  const opts = [
    { a: 5, b: 4, c: 3 }, { a: 13, b: 5, c: 12 }, { a: 10, b: 6, c: 8 },
    { a: 5, b: 3, c: 4 },
  ];
  const o = pick(rng, opts);
  const h = rng() < 0.5 ? 0 : randInt(rng, -3, 3);
  const k = rng() < 0.5 ? 0 : randInt(rng, -3, 3);
  const eq = `${shiftFactor("x", h)}/${o.a * o.a} + ${shiftFactor("y", k)}/${o.b * o.b} = 1`;
  const correct = `Foci (${h - o.c}, ${k}) and (${h + o.c}, ${k})`;
  const wrongPool = [
    `Foci (${h - o.a}, ${k}) and (${h + o.a}, ${k})`,
    `Foci (${h}, ${k - o.c}) and (${h}, ${k + o.c})`,
    `Foci (${h - o.b}, ${k}) and (${h + o.b}, ${k})`,
    `Foci (${h - o.c + 1}, ${k}) and (${h + o.c}, ${k})`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "EllipseFeatures",
    stem: `What are the foci of the ellipse ${eq}?`,
    givens: { a: o.a, b: o.b, c: o.c, h, k },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Use c^2 = a^2 - b^2 = ${o.a * o.a} - ${o.b * o.b}, so c = ${o.c}. Foci lie on the major (x) axis:`,
        blanks: [{ label: "foci", answer: correct }],
      },
    ],
    svgParams: conicDiagramBase("ellipse", h, k, o.a, o.b, {
      marks: [
        { x: h - o.c, y: k, label: "F" },
        { x: h + o.c, y: k, label: "F" },
        { x: h, y: k, label: "C" },
      ],
    }),
  });
}

function makeHyperbolaFeatures(rng: RNG): PrecalcMCQ {
  const opts = [
    { a: 3, b: 4, c: 5 }, { a: 5, b: 12, c: 13 }, { a: 8, b: 15, c: 17 },
    { a: 6, b: 8, c: 10 },
  ];
  const o = pick(rng, opts);
  const askFoci = rng() < 0.5;
  const eq = `x^2/${o.a * o.a} − y^2/${o.b * o.b} = 1`;
  const correct = askFoci
    ? `Foci (−${o.c}, 0) and (${o.c}, 0)`
    : `Vertices (−${o.a}, 0) and (${o.a}, 0)`;
  const wrongPool = askFoci
    ? [
        `Foci (−${o.a}, 0) and (${o.a}, 0)`,
        `Foci (0, −${o.c}) and (0, ${o.c})`,
        `Foci (−${o.b}, 0) and (${o.b}, 0)`,
        `Foci (−${o.c + 1}, 0) and (${o.c + 1}, 0)`,
      ]
    : [
        `Vertices (−${o.b}, 0) and (${o.b}, 0)`,
        `Vertices (0, −${o.a}) and (0, ${o.a})`,
        `Vertices (−${o.c}, 0) and (${o.c}, 0)`,
        `Vertices (−${o.a + 1}, 0) and (${o.a + 1}, 0)`,
      ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "HyperbolaFeatures",
    stem: askFoci
      ? `What are the foci of the hyperbola ${eq}?`
      : `What are the vertices of the hyperbola ${eq}?`,
    givens: { a: o.a, b: o.b, c: o.c, askFoci: askFoci ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      askFoci
        ? {
            instruction: `Use c^2 = a^2 + b^2 = ${o.a * o.a} + ${o.b * o.b}, so c = ${o.c}:`,
            blanks: [{ label: "foci", answer: correct }],
          }
        : {
            instruction: "The transverse axis is horizontal; vertices are (+-a, 0):",
            blanks: [{ label: "vertices", answer: correct }],
          },
    ],
    svgParams: conicDiagramBase("hyperbola", 0, 0, o.a, o.b, {
      marks: askFoci
        ? [{ x: -o.c, y: 0, label: "F" }, { x: o.c, y: 0, label: "F" }]
        : [{ x: -o.a, y: 0, label: "V" }, { x: o.a, y: 0, label: "V" }],
    }),
  });
}

function makeParabolaFocus(rng: RNG): PrecalcMCQ {
  const vertical = rng() < 0.7;
  const p = pick(rng, [1, 2, 3, -1, -2] as const);
  const h = randInt(rng, -3, 3), k = randInt(rng, -3, 3);
  const denom = 4 * p;
  const eq = vertical
    ? `y = ${linFactor("x", h)}^2/${denom} ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`
    : `x = ${linFactor("y", k)}^2/${denom} ${h >= 0 ? "+" : "-"} ${Math.abs(h)}`;
  const focus = vertical ? `(${h}, ${k + p})` : `(${h + p}, ${k})`;
  const directrix = vertical ? `y = ${k - p}` : `x = ${h - p}`;
  const askFocus = rng() < 0.5;
  const correct = askFocus ? `Focus ${focus}` : `Directrix: ${directrix}`;
  const wrongPool = askFocus
    ? [
        `Focus (${h}, ${k - p})`,
        vertical ? `Focus (${h + p}, ${k})` : `Focus (${h}, ${k + p})`,
        `Focus (${h}, ${k + 2 * p})`,
        `Focus (${h + 1}, ${k + p})`,
      ]
    : [
        vertical ? `Directrix: y = ${k + p}` : `Directrix: x = ${h + p}`,
        vertical ? `Directrix: x = ${h - p}` : `Directrix: y = ${k - p}`,
        vertical ? `Directrix: y = ${k - 2 * p}` : `Directrix: x = ${h - 2 * p}`,
        vertical ? `Directrix: y = ${k - p + 1}` : `Directrix: x = ${h - p + 1}`,
      ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "ParabolaFocus",
    stem: askFocus
      ? `What is the focus of the parabola ${eq}?`
      : `What is the directrix of the parabola ${eq}?`,
    givens: { p, h, k, vertical: vertical ? 1 : 0, askFocus: askFocus ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Match (distance)^2 = 4p(directed distance): 4p = ${denom}, so p = ${p}.`,
        blanks: [{ label: "p", answer: String(p) }],
      },
      {
        instruction: askFocus
          ? "The focus is p units from the vertex toward the opening:"
          : "The directrix is p units from the vertex, opposite the opening:",
        blanks: [{ label: "answer", answer: correct }],
      },
    ],
  });
}

function makeCompleteSquare(rng: RNG): PrecalcMCQ {
  const h = randInt(rng, -4, 4), k = randInt(rng, -4, 4);
  const r = pick(rng, [3, 4, 5, 6] as const);
  const D = -2 * h, E = -2 * k, F = h * h + k * k - r * r;
  const ds = D === 0 ? "" : D > 0 ? ` + ${D}x` : ` - ${-D}x`;
  const es = E === 0 ? "" : E > 0 ? ` + ${E}y` : ` - ${-E}y`;
  const fs = F === 0 ? "" : F > 0 ? ` + ${F}` : ` - ${-F}`;
  const eq = `x^2 + y^2${ds}${es}${fs} = 0`;
  const correct = `Center (${h}, ${k}), radius ${r}`;
  const wrongPool = [
    `Center (${-h}, ${-k}), radius ${r}`,
    `Center (${h}, ${k}), radius ${r * r}`,
    `Center (${h + 1}, ${k}), radius ${r}`,
    `Center (${h}, ${k + 1}), radius ${r}`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "CompleteSquare",
    stem: `Complete the square to find the center and radius of ${eq}.`,
    givens: { h, k, r, D, E, F },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Group x-terms and y-terms, then complete each square:",
        blanks: [
          { label: "(x-h)^2", answer: linFactor("x", h) + "^2" },
          { label: "(y-k)^2", answer: linFactor("y", k) + "^2" },
        ],
      },
      { instruction: "Read the center and radius:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeEllipseFromFeatures(rng: RNG): PrecalcMCQ {
  const opts = [
    { a: 5, c: 3, b: 4 }, { a: 13, c: 12, b: 5 }, { a: 10, c: 8, b: 6 },
  ];
  const o = pick(rng, opts);
  const correct = `x^2/${o.a * o.a} + y^2/${o.b * o.b} = 1`;
  const wrongPool = [
    `x^2/${o.a * o.a} + y^2/${o.c * o.c} = 1`,
    `x^2/${o.b * o.b} + y^2/${o.a * o.a} = 1`,
    `x^2/${o.a * o.a} − y^2/${o.b * o.b} = 1`,
    `x^2/${(o.a + 1) * (o.a + 1)} + y^2/${o.b * o.b} = 1`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "EllipseFromFeatures",
    stem: `An ellipse centered at the origin has vertices (±${o.a}, 0) and foci (±${o.c}, 0). What is its equation?`,
    givens: { a: o.a, b: o.b, c: o.c },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Use b^2 = a^2 - c^2 = ${o.a * o.a} - ${o.c * o.c} = ${o.b * o.b}:`,
        blanks: [{ label: "b^2", answer: String(o.b * o.b) }],
      },
      { instruction: "Write x^2/a^2 + y^2/b^2 = 1:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeHyperbolaFromFeatures(rng: RNG): PrecalcMCQ {
  const opts = [
    { a: 3, b: 4 }, { a: 5, b: 12 }, { a: 2, b: 3 },
  ];
  const o = pick(rng, opts);
  const correct = `x^2/${o.a * o.a} − y^2/${o.b * o.b} = 1`;
  const wrongPool = [
    `x^2/${o.b * o.b} − y^2/${o.a * o.a} = 1`,
    `x^2/${o.a * o.a} + y^2/${o.b * o.b} = 1`,
    `y^2/${o.b * o.b} − x^2/${o.a * o.a} = 1`,
    `x^2/${o.a * o.a} − y^2/${(o.b + 1) * (o.b + 1)} = 1`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "conics",
    subtype: "HyperbolaFromFeatures",
    stem: `A hyperbola centered at the origin has vertices (±${o.a}, 0) and asymptotes y = ±(${o.b}/${o.a})x. What is its equation?`,
    givens: { a: o.a, b: o.b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Vertices (+-a, 0) give a; asymptotes y = +-(b/a)x give b:",
        blanks: [{ label: "a, b", answer: `a = ${o.a}, b = ${o.b}` }],
      },
      { instruction: "Write x^2/a^2 - y^2/b^2 = 1:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

// -- Registry ---------------------------------------------------------------

export const CONIC_MAKERS: Record<ConicSubtype, (rng: RNG) => PrecalcMCQ> = {
  IdentifyConic: makeIdentifyConic,
  CircleCenterRadius: makeCircleCenterRadius,
  CircleEquation: makeCircleEquation,
  ParabolaVertex: makeParabolaVertex,
  EllipseFeatures: makeEllipseFeatures,
  HyperbolaFeatures: makeHyperbolaFeatures,
  ParabolaFocus: makeParabolaFocus,
  CompleteSquare: makeCompleteSquare,
  EllipseFromFeatures: makeEllipseFromFeatures,
  HyperbolaFromFeatures: makeHyperbolaFromFeatures,
};

/** Generate n conic-section MCQs at the given cumulative difficulty tier. */
export function generateConicProblems(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcMCQ[] {
  const subtypes = allowedSubtypes(ALL_CONIC_SUBTYPES, CONIC_TIERS, difficulty);
  return Array.from({ length: n }, () => CONIC_MAKERS[pick(rng, subtypes)](rng));
}
export const CONIC_DIFFICULTY_TIERS: Record<PrecalcDifficulty, readonly ConicSubtype[]> = CONIC_TIERS;

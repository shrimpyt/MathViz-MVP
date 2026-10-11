// PrecalcVectorsFactory.ts
// AP Precalculus: vectors — component operations, magnitude, dot product,
// unit vectors, orthogonality/parallelism, angle between vectors.
// Pure + seeded (mulberry32). Difficulty tiers 1|2|3 cumulative.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  shuffle,
  fmt,
  fracStr,
  assembleMCQ,
  allowedSubtypes,
  type PrecalcMCQ,
  type PrecalcDifficulty,
  type MCQSpec,
  type VectorsDiagram,
} from "./PrecalcTypes";

export type VectorSubtype =
  | "AddComponents"
  | "SubtractComponents"
  | "ScalarMultiple"
  | "Magnitude"
  | "DotProduct"
  | "VectorFromPoints"
  | "UnitVector"
  | "OrthogonalCheck"
  | "MagnitudeApprox"
  | "AngleBetween"
  | "LinearCombination"
  | "ParallelCheck";

const VECTOR_TIERS: Record<PrecalcDifficulty, readonly VectorSubtype[]> = {
  1: ["AddComponents", "SubtractComponents", "ScalarMultiple", "Magnitude"],
  2: ["DotProduct", "VectorFromPoints", "UnitVector", "OrthogonalCheck", "MagnitudeApprox"],
  3: ["AngleBetween", "LinearCombination", "ParallelCheck"],
};

const ALL_VECTOR_SUBTYPES = Object.values(VECTOR_TIERS).flat();

/** Pythagorean-friendly (a, b, magnitude). */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [6, 8, 10],
  [8, 15, 17],
  [7, 24, 25],
  [9, 12, 15],
  [20, 21, 29],
];

/** Random nonzero-ish small integer component in [-9, 9]. */
function comp(rng: RNG): number {
  return randInt(rng, -9, 9);
}

function vecStr(x: number, y: number): string {
  return `(${x}, ${y})`;
}

function arrowsFor(
  vecs: { dx: number; dy: number; label: string; color: "navy" | "blue" | "red"; dashed?: boolean }[],
  range: number
): VectorsDiagram {
  return { kind: "vectors", arrows: vecs.map((v) => ({ ...v })), range };
}

// ── Makers ────────────────────────────────────────────────────────────────────

function makeAddComponents(rng: RNG): PrecalcMCQ {
  let a = comp(rng), b = comp(rng), c = comp(rng), d = comp(rng);
  // Keep every drawn arrow non-degenerate.
  if (a === 0 && b === 0) a = 2;
  if (c === 0 && d === 0) c = -3;
  if (a + c === 0 && b + d === 0) c += 1;
  const correct = vecStr(a + c, b + d);
  const wrongPool = [
    vecStr(a + c, b - d),
    vecStr(a - c, b + d),
    vecStr(a * c, b * d),
    vecStr(a + d, b + c),
    vecStr(a + c + 1, b + d),
    vecStr(a + c, b + d + 1),
    vecStr(a + c + 2, b + d),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "AddComponents",
    stem: `Let u = ${vecStr(a, b)} and v = ${vecStr(c, d)}. What is u + v?`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Add vectors component by component:",
        blanks: [{ label: "u + v = (a+c, b+d)", answer: `(${a}+${c}, ${b}+${d})` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
    svgParams: arrowsFor(
      [
        { dx: a, dy: b, label: "u", color: "blue" },
        { dx: c, dy: d, label: "v", color: "red" },
        { dx: a + c, dy: b + d, label: "u+v", color: "navy", dashed: true },
      ],
      Math.max(Math.abs(a) + Math.abs(c), Math.abs(b) + Math.abs(d), 4) + 2
    ),
  });
}

function makeSubtractComponents(rng: RNG): PrecalcMCQ {
  const a = comp(rng), b = comp(rng), c = comp(rng), d = comp(rng);
  const correct = vecStr(a - c, b - d);
  const wrongPool = [
    vecStr(a + c, b + d),
    vecStr(c - a, d - b),
    vecStr(a - c + 1, b - d),
    vecStr(a - c, b - d + 1),
    vecStr(a - c - 1, b - d - 1),
    vecStr(a - c + 2, b - d),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "SubtractComponents",
    stem: `Let u = ${vecStr(a, b)} and v = ${vecStr(c, d)}. What is u − v?`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Subtract component by component (u − v = (a−c, b−d)):",
        blanks: [{ label: "u − v", answer: `(${a}−(${c}), ${b}−(${d}))` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeScalarMultiple(rng: RNG): PrecalcMCQ {
  const k = pick(rng, [-3, -2, 2, 3, 4] as const);
  let a = comp(rng), b = comp(rng);
  if (a === 0 && b === 0) a = 2; // keep the drawn arrow non-degenerate
  const correct = vecStr(k * a, k * b);
  const wrongPool = [
    vecStr(k + a, k + b),
    vecStr(k * a + 1, k * b),
    vecStr(k * a, k * b + 1),
    vecStr(-k * a, -k * b),
    vecStr(k * b, k * a),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "ScalarMultiple",
    stem: `Let u = ${vecStr(a, b)}. What is ${k}u?`,
    givens: { k, a, b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Multiply each component by the scalar:",
        blanks: [{ label: `${k}u`, answer: `(${k}·${a}, ${k}·${b})` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
    svgParams: arrowsFor(
      [
        { dx: a, dy: b, label: "u", color: "blue" },
        { dx: k * a, dy: k * b, label: `${k}u`, color: "navy", dashed: true },
      ],
      Math.max(Math.abs(k * a), Math.abs(k * b), Math.abs(a), Math.abs(b), 4) + 2
    ),
  });
}

function makeMagnitude(rng: RNG): PrecalcMCQ {
  const [ta, tb, m] = pick(rng, TRIPLES);
  const sx = pick(rng, [1, -1] as const);
  const sy = pick(rng, [1, -1] as const);
  const a = ta * sx, b = tb * sy;
  const correct = String(m);
  const wrongPool = [
    String(m + 1), String(m - 1), String(m + 2), String(ta + tb),
    String(Math.abs(a) + Math.abs(b)), String(2 * m),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "Magnitude",
    stem: `What is the magnitude |u| of u = ${vecStr(a, b)}?`,
    givens: { a, b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use |u| = √(a² + b²):",
        blanks: [{ label: "|u|", answer: `√(${a}² + ${b}²) = √${a * a + b * b}` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
    svgParams: arrowsFor([{ dx: a, dy: b, label: "u", color: "navy" }], m + 2),
  });
}

function makeDotProduct(rng: RNG): PrecalcMCQ {
  const a = comp(rng), b = comp(rng), c = comp(rng), d = comp(rng);
  const dot = a * c + b * d;
  const correct = String(dot);
  const wrongPool = [
    String(dot + 1), String(dot - 1), String(dot + 2), String(dot - 2),
    String(a * c - b * d), String(a * d + b * c),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "DotProduct",
    stem: `Let u = ${vecStr(a, b)} and v = ${vecStr(c, d)}. What is the dot product u · v?`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use u · v = a·c + b·d:",
        blanks: [{ label: "u · v", answer: `${a}·${c} + ${b}·${d}` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeVectorFromPoints(rng: RNG): PrecalcMCQ {
  const x1 = randInt(rng, -6, 6), y1 = randInt(rng, -6, 6);
  let x2 = randInt(rng, -6, 6), y2 = randInt(rng, -6, 6);
  if (x1 === x2 && y1 === y2) x2 += 3;
  const correct = vecStr(x2 - x1, y2 - y1);
  const wrongPool = [
    vecStr(x1 - x2, y1 - y2),
    vecStr(x2 - x1 + 1, y2 - y1),
    vecStr(x2 - x1, y2 - y1 + 1),
    vecStr(x2 - x1 - 1, y2 - y1),
    vecStr(x2 + x1, y2 + y1),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "VectorFromPoints",
    stem: `What is the component form of the vector from P(${x1}, ${y1}) to Q(${x2}, ${y2})?`,
    givens: { x1, y1, x2, y2 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Terminal minus initial: PQ = (x₂−x₁, y₂−y₁):",
        blanks: [{ label: "PQ", answer: `(${x2}−${x1}, ${y2}−${y1})` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeUnitVector(rng: RNG): PrecalcMCQ {
  const [ta, tb, m] = pick(rng, TRIPLES);
  const sx = pick(rng, [1, -1] as const);
  const sy = pick(rng, [1, -1] as const);
  const a = ta * sx, b = tb * sy;
  const correct = `(${fracStr(a, m)}, ${fracStr(b, m)})`;
  const wrongPool = [
    `(${fracStr(b, m)}, ${fracStr(a, m)})`,
    `(${fracStr(-a, m)}, ${fracStr(-b, m)})`,
    `(${a}, ${b})`,
    `(${fracStr(m, a === 0 ? 1 : a)}, ${fracStr(m, b === 0 ? 1 : b)})`,
    `(${fracStr(a, m + 1)}, ${fracStr(b, m + 1)})`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "UnitVector",
    stem: `What is the unit vector in the direction of u = ${vecStr(a, b)}?`,
    givens: { a, b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `First find |u| = √(${a}² + ${b}²) = ${m}. Then divide each component by |u|:`,
        blanks: [{ label: "û", answer: `(${a}/${m}, ${b}/${m})` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeOrthogonalCheck(rng: RNG): PrecalcMCQ {
  const isOrth = rng() < 0.5;
  const a = randInt(rng, 1, 6) * pick(rng, [1, -1] as const);
  const b = randInt(rng, 1, 6) * pick(rng, [1, -1] as const);
  let c: number, d: number;
  if (isOrth) {
    const k = pick(rng, [1, 2, 3] as const);
    c = -b * k;
    d = a * k;
  } else {
    c = randInt(rng, -6, 6);
    d = randInt(rng, -6, 6);
    if (a * c + b * d === 0) d += 1; // force non-orthogonal
  }
  const dot = a * c + b * d;
  const correct = isOrth ? `Yes; u · v = 0` : `No; u · v = ${dot}`;
  const wrongPool = [
    isOrth ? `No; u · v = ${dot}` : `Yes; u · v = 0`,
    `Yes; |u| = |v|`,
    `No; the vectors are parallel`,
    isOrth ? `Yes; u · v = ${dot + 2}` : `No; u · v = ${dot + 2}`,
    `Yes; u + v = (0, 0)`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "OrthogonalCheck",
    stem: `Let u = ${vecStr(a, b)} and v = ${vecStr(c, d)}. Are u and v orthogonal? Justify your answer.`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Two vectors are orthogonal exactly when their dot product is 0. Compute u · v:",
        blanks: [{ label: "u · v", answer: `${a}·${c} + ${b}·${d} = ${dot}` }],
      },
      { instruction: "Conclude:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeMagnitudeApprox(rng: RNG): PrecalcMCQ {
  // Non-triple vector → calculator-active decimal
  let a = randInt(rng, 2, 9) * pick(rng, [1, -1] as const);
  let b = randInt(rng, 2, 9) * pick(rng, [1, -1] as const);
  if (TRIPLES.some(([ta, tb]) => Math.abs(a) === ta && Math.abs(b) === tb)) {
    a += 1;
  }
  const mag = Math.hypot(a, b);
  const correct = fmt(mag);
  const wrongPool = [
    fmt(mag + 0.5), fmt(mag - 0.5), fmt(mag + 1), fmt(mag - 1),
    fmt(Math.abs(a) + Math.abs(b)), fmt((Math.abs(a) + Math.abs(b)) / 2),
  ];
  return assembleMCQ(rng, {
    calculator: true,
    topicTag: "vectors",
    subtype: "MagnitudeApprox",
    stem: `Use a calculator to find |u| for u = ${vecStr(a, b)}, rounded to three decimal places.`,
    givens: { a, b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Compute |u| = √(a² + b²) with a calculator:",
        blanks: [{ label: "|u|", answer: `√(${a * a + b * b}) ≈ ${correct}` }],
      },
    ],
  });
}

function makeAngleBetween(rng: RNG): PrecalcMCQ {
  // u = (1,0), v at a standard angle → exact degree answer, no calculator
  const angles = [30, 45, 60, 120, 135, 150];
  const deg = pick(rng, angles);
  const rad = (deg * Math.PI) / 180;
  const vx = Math.cos(rad), vy = Math.sin(rad);
  const correct = `${deg}°`;
  const wrongPool = [
    `${180 - deg}°`, `${deg + 10}°`, `${Math.max(deg - 10, 5)}°`,
    `${2 * deg}°`, `${Math.round(deg / 2)}°`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "AngleBetween",
    stem: `Let u = (1, 0) and v = (${fmt(vx, 4)}, ${fmt(vy, 4)}). What is the measure of the angle between u and v?`,
    givens: { vx, vy, deg },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use cos θ = (u · v) / (|u||v|):",
        blanks: [{ label: "cos θ", answer: `${fmt(vx, 4)}` }],
      },
      { instruction: "Recognize the value and solve for θ:", blanks: [{ label: "answer", answer: correct }] },
    ],
    svgParams: arrowsFor(
      [
        { dx: 4, dy: 0, label: "u", color: "blue" },
        { dx: 4 * vx, dy: 4 * vy, label: "v", color: "red" },
      ],
      6
    ),
  });
}

function makeLinearCombination(rng: RNG): PrecalcMCQ {
  const p = pick(rng, [2, 3] as const);
  const q = pick(rng, [2, 3] as const);
  const a = comp(rng), b = comp(rng), c = comp(rng), d = comp(rng);
  const px = p * a - q * c, py = p * b - q * d;
  const correct = vecStr(px, py);
  const wrongPool = [
    vecStr(p * a + q * c, p * b + q * d),
    vecStr(px, py + 2), // sign-slip variants
    vecStr(px + 1, py),
    vecStr(px, py - 1),
    vecStr(px + 2, py + 1), // arithmetic slips (always distinct from correct)
    vecStr(q * a - p * c, q * b - p * d),
    vecStr(p * (a - c), p * (b - d)),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "LinearCombination",
    stem: `Let u = ${vecStr(a, b)} and v = ${vecStr(c, d)}. What is ${p}u − ${q}v?`,
    givens: { p, q, a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Distribute the scalars, then combine:",
        blanks: [{ label: `${p}u − ${q}v`, answer: `(${p * a}−${q * c}, ${p * b}−${q * d})` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeParallelCheck(rng: RNG): PrecalcMCQ {
  const isPar = rng() < 0.5;
  const a = randInt(rng, 1, 6) * pick(rng, [1, -1] as const);
  const b = randInt(rng, 1, 6) * pick(rng, [1, -1] as const);
  let c: number, d: number, kUsed: number | null = null;
  if (isPar) {
    const k = pick(rng, [2, 3, -2] as const);
    kUsed = k;
    c = a * k;
    d = b * k;
  } else {
    c = randInt(rng, -6, 6);
    d = randInt(rng, -6, 6);
    if (a * d === b * c) d += 2; // force non-parallel
  }
  const correct = isPar ? `Yes; v = ${kUsed}u` : `No; v is not a scalar multiple of u`;
  const wrongPool = [
    isPar ? `No; v is not a scalar multiple of u` : `Yes; v = 2u`,
    `Yes; u · v = 0`,
    `No; u · v = 0`,
    `Yes; |u| = |v|`,
    isPar ? `Yes; v = ${kUsed === 2 ? 3 : 2}u` : `No; the vectors are orthogonal`,
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "vectors",
    subtype: "ParallelCheck",
    stem: `Let u = ${vecStr(a, b)} and v = ${vecStr(c, d)}. Are u and v parallel? Justify your answer.`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Vectors are parallel exactly when one is a scalar multiple of the other. Check:",
        blanks: [{ label: "test", answer: isPar ? `v = ${kUsed}·u` : `${a}·${d} ≠ ${b}·${c}` }],
      },
      { instruction: "Conclude:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const VECTOR_MAKERS: Record<VectorSubtype, (rng: RNG) => PrecalcMCQ> = {
  AddComponents: makeAddComponents,
  SubtractComponents: makeSubtractComponents,
  ScalarMultiple: makeScalarMultiple,
  Magnitude: makeMagnitude,
  DotProduct: makeDotProduct,
  VectorFromPoints: makeVectorFromPoints,
  UnitVector: makeUnitVector,
  OrthogonalCheck: makeOrthogonalCheck,
  MagnitudeApprox: makeMagnitudeApprox,
  AngleBetween: makeAngleBetween,
  LinearCombination: makeLinearCombination,
  ParallelCheck: makeParallelCheck,
};

/** Generate n vector MCQs at the given cumulative difficulty tier. */
export function generateVectorProblems(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcMCQ[] {
  const subtypes = allowedSubtypes(ALL_VECTOR_SUBTYPES, VECTOR_TIERS, difficulty);
  return Array.from({ length: n }, () => VECTOR_MAKERS[pick(rng, subtypes)](rng));
}
export const VECTOR_DIFFICULTY_TIERS: Record<PrecalcDifficulty, readonly VectorSubtype[]> = VECTOR_TIERS;

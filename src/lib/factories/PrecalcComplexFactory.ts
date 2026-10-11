// PrecalcComplexFactory.ts
// AP Precalculus: complex numbers — operations, modulus, conjugate,
// powers of i, rectangular ↔ polar form, De Moivre.
// Pure + seeded (mulberry32). Difficulty tiers 1|2|3 cumulative.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  fmt,
  fmtComplex,
  assembleMCQ,
  allowedSubtypes,
  type PrecalcMCQ,
  type PrecalcDifficulty,
} from "./PrecalcTypes";

export type ComplexSubtype =
  | "AddSub"
  | "Multiply"
  | "Conjugate"
  | "Modulus"
  | "PowersOfI"
  | "Divide"
  | "RectToPolar"
  | "PolarToRect"
  | "RectToPolarQ2"
  | "DeMoivre"
  | "PolarMultiply";

const COMPLEX_TIERS: Record<PrecalcDifficulty, readonly ComplexSubtype[]> = {
  1: ["AddSub", "Multiply", "Conjugate", "Modulus"],
  2: ["PowersOfI", "Divide", "RectToPolar", "PolarToRect"],
  3: ["RectToPolarQ2", "DeMoivre", "PolarMultiply"],
};

const ALL_COMPLEX_SUBTYPES = Object.values(COMPLEX_TIERS).flat();

function small(rng: RNG, lo = -6, hi = 6): number {
  const v = randInt(rng, lo, hi);
  return v === 0 ? 1 : v; // avoid zeros for operands
}

// ── Makers ────────────────────────────────────────────────────────────────────

function makeAddSub(rng: RNG): PrecalcMCQ {
  const a = small(rng), b = small(rng), c = small(rng), d = small(rng);
  const plus = rng() < 0.5;
  const re = plus ? a + c : a - c;
  const im = plus ? b + d : b - d;
  const op = plus ? "+" : "−";
  const correct = fmtComplex(re, im);
  const wrongOp = plus ? fmtComplex(a - c, b - d) : fmtComplex(a + c, b + d);
  const wrongPool = [
    wrongOp, // used the wrong operation
    fmtComplex(re, -im), // dropped a sign
    fmtComplex(re + 1, im), // arithmetic slips (always distinct)
    fmtComplex(re - 1, im),
    fmtComplex(re, im + 2),
    fmtComplex(re + 2, im - 1),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "AddSub",
    stem: `What is (${fmtComplex(a, b)}) ${op} (${fmtComplex(c, d)})?`,
    givens: { a, b, c, d, plus: plus ? 1 : 0 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Combine real parts and imaginary parts separately:`,
        blanks: [{ label: "result", answer: `(${a}${plus ? "+" : "−"}${c}) + (${b}${plus ? "+" : "−"}${d})i` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeMultiply(rng: RNG): PrecalcMCQ {
  const a = small(rng, -4, 4), b = small(rng, -4, 4);
  const c = small(rng, -4, 4), d = small(rng, -4, 4);
  const re = a * c - b * d;
  const im = a * d + b * c;
  const correct = fmtComplex(re, im);
  const wrongPool = [
    fmtComplex(a * c + b * d, im), // forgot i² = −1
    fmtComplex(re, a * d - b * c),
    fmtComplex(a * c, b * d),
    fmtComplex(re + 2, im),
    fmtComplex(re, im - 2),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "Multiply",
    stem: `What is (${fmtComplex(a, b)})(${fmtComplex(c, d)})?`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "FOIL, remembering that i² = −1:",
        blanks: [{ label: "expand", answer: `${a * c} + ${a * d}i + ${b * c}i + ${b * d}i²` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeConjugate(rng: RNG): PrecalcMCQ {
  const a = small(rng), b = small(rng);
  const correct = fmtComplex(a, -b);
  const wrongPool = [
    fmtComplex(-a, b),
    fmtComplex(-a, -b),
    fmtComplex(a, b),
    fmtComplex(b, a),
    fmtComplex(a, -b === 0 ? 1 : -b + 1),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "Conjugate",
    stem: `What is the complex conjugate of ${fmtComplex(a, b)}?`,
    givens: { a, b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "The conjugate changes the sign of the imaginary part:",
        blanks: [{ label: "conjugate", answer: correct }],
      },
    ],
  });
}

function makeModulus(rng: RNG): PrecalcMCQ {
  const triples: [number, number, number][] = [
    [3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17],
  ];
  const [ta, tb, m] = pick(rng, triples);
  const a = ta * pick(rng, [1, -1] as const);
  const b = tb * pick(rng, [1, -1] as const);
  const correct = String(m);
  const wrongPool = [String(m + 1), String(m - 1), String(m + 2), String(ta + tb), `√${m}`];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "Modulus",
    stem: `What is the modulus |${fmtComplex(a, b)}|?`,
    givens: { a, b },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Use |a+bi| = √(a² + b²):",
        blanks: [{ label: "modulus", answer: `√(${a * a}+${b * b}) = √${m * m}` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makePowersOfI(rng: RNG): PrecalcMCQ {
  const n = randInt(rng, 5, 60);
  const r = n % 4;
  const correct = ["1", "i", "−1", "−i"][r];
  const wrongPool = ["1", "i", "−1", "−i", "0"].filter((w) => w !== correct);
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "PowersOfI",
    stem: `What is i^${n}? (Use exact form.)`,
    givens: { n },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Powers of i cycle every 4. Divide ${n} by 4:`,
        blanks: [{ label: `remainder`, answer: `${n} = 4·${Math.floor(n / 4)} + ${r}` }],
      },
      { instruction: `So i^${n} = i^${r}:`, blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeDivide(rng: RNG): PrecalcMCQ {
  // Choose quotient q = p+qi and divisor d = c+di, then dividend = q·d.
  const p = small(rng, -4, 4), q = small(rng, -4, 4);
  const c = small(rng, -3, 3), d = small(rng, -3, 3);
  const a = p * c - q * d;
  const b = p * d + q * c;
  const correct = fmtComplex(p, q);
  const wrongPool = [
    fmtComplex(p, -q),
    fmtComplex(q, p),
    fmtComplex(p + 1, q),
    fmtComplex(p, q + 1),
    fmtComplex(-p, -q),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "Divide",
    stem: `What is (${fmtComplex(a, b)}) ÷ (${fmtComplex(c, d)})? Write your answer in a+bi form.`,
    givens: { a, b, c, d },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Multiply numerator and denominator by the conjugate ${fmtComplex(c, -d)}:`,
        blanks: [{ label: "denominator", answer: `${c}² + ${d}² = ${c * c + d * d}` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

/** (re, im, r-string, theta-degrees) with exact polar form. */
const POLAR_FRIENDLY: { re: number; im: number; r: string; deg: number }[] = [
  { re: 1, im: 1, r: "√2", deg: 45 },
  { re: 1, im: -1, r: "√2", deg: 315 },
  { re: -1, im: 1, r: "√2", deg: 135 },
  { re: 1, im: 0, r: "1", deg: 0 },
  { re: 0, im: 1, r: "1", deg: 90 },
  { re: 2, im: 0, r: "2", deg: 0 },
  { re: 0, im: 2, r: "2", deg: 90 },
  { re: 2, im: 2, r: "2√2", deg: 45 },
  { re: 3, im: 0, r: "3", deg: 0 },
];

const POLAR_FRIENDLY_Q1: { re: number; im: number; r: string; deg: number }[] = [
  { re: 1, im: 1, r: "√2", deg: 45 },
  { re: 2, im: 2, r: "2√2", deg: 45 },
  { re: 1, im: 0, r: "1", deg: 0 },
  { re: 0, im: 1, r: "1", deg: 90 },
  { re: 2, im: 0, r: "2", deg: 0 },
  { re: 3, im: 0, r: "3", deg: 0 },
];

function polarStr(r: string, deg: number): string {
  return `${r}(cos ${deg}° + i sin ${deg}°)`;
}

function makeRectToPolar(rng: RNG, quadrant1Only: boolean, subtype: "RectToPolar" | "RectToPolarQ2"): PrecalcMCQ {
  const e = pick(rng, quadrant1Only ? POLAR_FRIENDLY_Q1 : POLAR_FRIENDLY);
  const correct = polarStr(e.r, e.deg);
  // Reflection across the x-axis is a classic error; for 0° it coincides
  // with the correct angle, so use 180° there instead (deduped if repeated).
  const refl = e.deg === 0 ? 180 : (360 - e.deg) % 360;
  const wrongPool = [
    polarStr(e.r, (e.deg + 180) % 360),
    polarStr(e.r, refl),
    polarStr(e.r === "√2" ? "2" : "√2", e.deg),
    polarStr(e.r, (e.deg + 90) % 360),
    polarStr(e.r, (e.deg + 270) % 360),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype,
    stem: `Write ${fmtComplex(e.re, e.im)} in polar form r(cos θ + i sin θ).`,
    givens: { re: e.re, im: e.im },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Find r = √(re² + im²) = ${e.r}, then θ = arctan(im/re) adjusted for quadrant:`,
        blanks: [{ label: "θ", answer: `${e.deg}°` }],
      },
      { instruction: "Write the polar form:", blanks: [{ label: "answer", answer: correct }] },
    ],
    svgParams: {
      kind: "complex-plane",
      points: [{ re: e.re, im: e.im, label: "z" }],
      range: Math.max(Math.abs(e.re), Math.abs(e.im), 2) + 1,
    },
  });
}

function makePolarToRect(rng: RNG): PrecalcMCQ {
  const e = pick(rng, POLAR_FRIENDLY);
  const correct = fmtComplex(e.re, e.im);
  const wrongPool = [
    fmtComplex(e.im, e.re),
    fmtComplex(-e.re, e.im),
    fmtComplex(e.re, -e.im),
    fmtComplex(e.re + 1, e.im),
    fmtComplex(e.re, e.im + 1),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "PolarToRect",
    stem: `Write ${polarStr(e.r, e.deg)} in a+bi form.`,
    givens: { rStr: 0, deg: e.deg, re: e.re, im: e.im },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Evaluate: a = r·cos θ, b = r·sin θ:`,
        blanks: [{ label: "a+bi", answer: `${e.r}·cos ${e.deg}° + ${e.r}·sin ${e.deg}°·i` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makeDeMoivre(rng: RNG): PrecalcMCQ {
  // (r cis θ)^n with clean numbers
  const opts = [
    { r: "2", rN: 2, deg: 30, n: 3, rPow: "8", finalDeg: 90 },
    { r: "2", rN: 2, deg: 45, n: 2, rPow: "4", finalDeg: 90 },
    { r: "√2", rN: 0, deg: 45, n: 4, rPow: "4", finalDeg: 180 },
    { r: "2", rN: 2, deg: 60, n: 3, rPow: "8", finalDeg: 180 },
    { r: "3", rN: 3, deg: 20, n: 3, rPow: "27", finalDeg: 60 },
  ];
  const o = pick(rng, opts);
  const correct = polarStr(o.rPow, o.finalDeg);
  const wrongPool = [
    polarStr(o.r, o.finalDeg),
    polarStr(o.rPow, o.deg),
    polarStr(o.rPow, (o.finalDeg + 180) % 360),
    polarStr(String(Number(o.rPow) * 2), o.finalDeg),
    polarStr(o.rPow, (o.finalDeg + 90) % 360),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "DeMoivre",
    stem: `Use De Moivre's Theorem to evaluate (${polarStr(o.r, o.deg)})^${o.n}. Write the answer in polar form.`,
    givens: { rN: o.rN, deg: o.deg, n: o.n },
    correct,
    wrongPool,
    steps: [
      {
        instruction: `Raise the modulus to the ${o.n} and multiply the angle by ${o.n}:`,
        blanks: [{ label: "power", answer: `${o.r}^${o.n}(cos ${o.n}·${o.deg}° + i sin ${o.n}·${o.deg}°)` }],
      },
      { instruction: "Simplify:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

function makePolarMultiply(rng: RNG): PrecalcMCQ {
  const r1 = pick(rng, [2, 3, 4] as const);
  const r2 = pick(rng, [2, 3] as const);
  const t1 = pick(rng, [30, 45, 60] as const);
  const t2 = pick(rng, [30, 45, 60] as const);
  const sum = t1 + t2;
  const correct = polarStr(String(r1 * r2), sum);
  const wrongPool = [
    polarStr(String(r1 + r2), sum),
    polarStr(String(r1 * r2), Math.abs(t1 - t2)),
    polarStr(String(r1 * r2), sum + 180 > 360 ? sum - 180 : sum + 180),
    polarStr(`${r1}√${r2}`, sum),
  ];
  return assembleMCQ(rng, {
    calculator: false,
    topicTag: "complex",
    subtype: "PolarMultiply",
    stem: `Multiply ${polarStr(String(r1), t1)} by ${polarStr(String(r2), t2)}. Write the answer in polar form.`,
    givens: { r1, r2, t1, t2 },
    correct,
    wrongPool,
    steps: [
      {
        instruction: "Multiply the moduli and add the arguments:",
        blanks: [{ label: "product", answer: `${r1 * r2}(cos ${sum}° + i sin ${sum}°)` }],
      },
      { instruction: "Answer:", blanks: [{ label: "answer", answer: correct }] },
    ],
  });
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const COMPLEX_MAKERS: Record<ComplexSubtype, (rng: RNG) => PrecalcMCQ> = {
  AddSub: makeAddSub,
  Multiply: makeMultiply,
  Conjugate: makeConjugate,
  Modulus: makeModulus,
  PowersOfI: makePowersOfI,
  Divide: makeDivide,
  RectToPolar: (rng) => makeRectToPolar(rng, true, "RectToPolar"),
  PolarToRect: makePolarToRect,
  RectToPolarQ2: (rng) => makeRectToPolar(rng, false, "RectToPolarQ2"),
  DeMoivre: makeDeMoivre,
  PolarMultiply: makePolarMultiply,
};

/** Generate n complex-number MCQs at the given cumulative difficulty tier. */
export function generateComplexProblems(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcMCQ[] {
  const subtypes = allowedSubtypes(ALL_COMPLEX_SUBTYPES, COMPLEX_TIERS, difficulty);
  return Array.from({ length: n }, () => COMPLEX_MAKERS[pick(rng, subtypes)](rng));
}
export const COMPLEX_DIFFICULTY_TIERS: Record<PrecalcDifficulty, readonly ComplexSubtype[]> = COMPLEX_TIERS;

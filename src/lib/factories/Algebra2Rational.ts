// Algebra2Rational.ts
// A2.4 — Rational functions & equations: vertical/horizontal asymptotes,
// holes (removable discontinuities), solving rational equations (including
// extraneous/no-solution cases). Denominators are guarded against being
// identically zero and against hidden common factors except in the Holes
// family. Tests recompute asymptotes/holes independently and substitute
// solutions into the ORIGINAL equation.

import type { RNG } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem, Algebra2RationalSVGParams } from "./Algebra2Types";
import { randSigned, randNonZero, reduceFrac, fracToLatex, selectMakers } from "./Algebra2Helpers";

export type RationalSubtype = "SimplifyRational" | "MultiplyDivideRational" | "Asymptotes" | "Holes" | "SolveRationalEquation";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function linLatex(a: number, b: number, variable = "x"): string {
  // a*x + b
  if (a === 0) return `${b}`;
  const ax = a === 1 ? variable : a === -1 ? `-${variable}` : `${a}${variable}`;
  if (b === 0) return ax;
  return `${ax} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
}

function fracLatex(a: number, b: number, c: number, d: number): string {
  return `(${linLatex(a, b)})/(${linLatex(c, d)})`;
}

// ── Asymptotes of (ax+b)/(cx+d) ───────────────────────────────────────────────

function makeAsymptotes(rng: RNG): Algebra2Problem {
  // Integer vertical asymptote: choose c != 0, d multiple of c.
  const c = randNonZero(rng, -3, 3);
  const v = randSigned(rng, 6); // vertical asymptote x = v → d = -c*v
  const d = -c * v;
  const a = randNonZero(rng, -4, 4);
  let b = randSigned(rng, 8);
  // No hole: numerator must not vanish at x = v
  if (a * v + b === 0) b += 1;
  const [hn, hd] = reduceFrac(a, c);
  const hStr = hd === 1 ? `${hn}` : `${hn}/${hd}`;
  const svg: Algebra2RationalSVGParams = {
    kind: "RationalGraph",
    num: [a, b],
    den: [c, d],
    vAsm: [v],
    hAsm: hn / hd,
    hole: null,
  };
  return {
    type: "A2.11",
    subtype: "Asymptotes",
    given: { function: `f(x) = ${fracLatex(a, b, c, d)}` },
    find: "vertical and horizontal asymptotes",
    answer: `x = ${v}, y = ${hStr}`,
    steps: [
      {
        instruction: "Vertical asymptote: set the denominator equal to zero (and check it is not a hole):",
        reason: "Vertical asymptote",
        blanks: [
          { label: "denominator = 0", answer: `${linLatex(c, d)} = 0` },
          { label: "vertical asymptote", answer: `x = ${v}` },
        ],
      },
      {
        instruction: "Horizontal asymptote: degrees are equal, so y = (leading coefficient ratio):",
        reason: "Horizontal asymptote (equal degrees)",
        blanks: [{ label: "horizontal asymptote", answer: `y = ${hStr}` }],
      },
    ],
    svgParams: svg,
    verify: { a, b, c, d, vAsm: v, hNum: hn, hDen: hd },
  };
}

// ── Holes: f(x) = (x - r)(x + s) / ((x - r)(x + t)) ────────────────────────────

function makeHoles(rng: RNG): Algebra2Problem {
  let r = randSigned(rng, 5);
  let s = randSigned(rng, 5);
  let t = randSigned(rng, 5);
  while (s === r) s = randSigned(rng, 5);
  // t distinct from r and s, and r + t != 0 (hole y-value must be defined)
  while (t === r || t === s || r + t === 0) t = randSigned(rng, 5);
  // hole at x = r, y = (r + s)/(r + t)
  const [yn, yd] = reduceFrac(r + s, r + t);
  const yStr = fracToLatex(yn, yd);
  // expanded forms for display
  const numExp = [1, s - r, -r * s];
  const denExp = [1, t - r, -r * t];
  const polyStr = (p: number[]) =>
    p
      .map((cf, i) => {
        const pw = p.length - 1 - i;
        if (cf === 0) return "";
        const body = pw === 0 ? `${Math.abs(cf)}` : pw === 1 ? (Math.abs(cf) === 1 ? "x" : `${Math.abs(cf)}x`) : Math.abs(cf) === 1 ? `x^${pw}` : `${Math.abs(cf)}x^${pw}`;
        return `${cf < 0 ? "-" : "+"}${body}`;
      })
      .join("")
      .replace(/^\+/, "");
  const svg: Algebra2RationalSVGParams = {
    kind: "RationalGraph",
    num: numExp,
    den: denExp,
    vAsm: [-t],
    hAsm: 1,
    hole: { x: r, y: yn / yd },
  };
  return {
    type: "A2.11",
    subtype: "Holes",
    given: { function: `f(x) = (${polyStr(numExp)})/(${polyStr(denExp)})` },
    find: "hole (removable discontinuity) and vertical asymptote",
    answer: `hole at (${r}, ${yStr}); vertical asymptote x = ${-t}`,
    steps: [
      {
        instruction: "Factor and cancel the common factor to find the hole's x-coordinate:",
        reason: "Removable discontinuity",
        blanks: [
          { label: "common factor", answer: `(x ${r > 0 ? "-" : "+"} ${Math.abs(r)})` },
          { label: "hole x", answer: `x = ${r}` },
        ],
      },
      {
        instruction: `Substitute x = ${r} into the simplified function (x ${s > 0 ? "+" : "-"} ${Math.abs(s)})/(x ${t > 0 ? "+" : "-"} ${Math.abs(t)}):`,
        reason: "Evaluate simplified function",
        blanks: [
          { label: "hole y", answer: `y = ${yStr}` },
          { label: "vertical asymptote", answer: `x = ${-t}` },
        ],
      },
    ],
    svgParams: svg,
    verify: { r, s, t, holeYNum: yn, holeYDen: yd, vAsm: -t },
  };
}

// ── Simplify a rational expression ────────────────────────────────────────────

function makeSimplifyRational(rng: RNG): Algebra2Problem {
  const form = rng() < 0.5 ? "diffSquares" : "commonFactor";
  if (form === "diffSquares") {
    const k = randNonZero(rng, -5, 5);
    const denInner = k < 0 ? `(x + ${-k})` : `(x - ${k})`;
    const simpInner = k < 0 ? `(x - ${-k})` : `(x + ${k})`;
    const expr = `(x^2 - ${k * k})/${denInner}`;
    const simplified = k < 0 ? `x - ${-k}` : `x + ${k}`;
    return {
      type: "A2.11",
      subtype: "SimplifyRational",
      given: { expression: expr },
      find: "simplified form (state any restrictions)",
      answer: `${simplified}, x ≠ ${k}`,
      steps: [
        {
          instruction: "Factor the numerator as a difference of squares:",
          reason: "a² - b² = (a - b)(a + b)",
          blanks: [{ label: "factored", answer: `${denInner}${simpInner}/${denInner}` }],
        },
        {
          instruction: "Cancel the common factor and record the restriction:",
          reason: "Cancel common factors; denominator ≠ 0",
          blanks: [{ label: "simplified", answer: `${simplified}, x ≠ ${k}` }],
        },
      ],
      verify: { form, k },
    };
  }
  const b = randNonZero(rng, -6, 6);
  return {
    type: "A2.11",
    subtype: "SimplifyRational",
    given: { expression: `(x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x)/x` },
    find: "simplified form (state any restrictions)",
    answer: `x ${b < 0 ? "-" : "+"} ${Math.abs(b)}, x ≠ 0`,
    steps: [
      {
        instruction: "Factor x out of the numerator:",
        reason: "GCF factoring",
        blanks: [{ label: "factored", answer: `x(x ${b < 0 ? "-" : "+"} ${Math.abs(b)})/x` }],
      },
      {
        instruction: "Cancel x and record the restriction:",
        reason: "Cancel common factors; denominator ≠ 0",
        blanks: [{ label: "simplified", answer: `x ${b < 0 ? "-" : "+"} ${Math.abs(b)}, x ≠ 0` }],
      },
    ],
    verify: { form, b },
  };
}

// ── Multiply / divide rational expressions ────────────────────────────────────

function makeMultiplyDivideRational(rng: RNG): Algebra2Problem {
  const a = randNonZero(rng, -5, 5);
  let b = randNonZero(rng, -5, 5);
  if (b === a || b === -a) b += 2;
  const multiply = rng() < 0.5;
  const f1 = `(x^2 - ${a * a})/(x ${b < 0 ? "+" : "-"} ${Math.abs(b)})`;
  const f2 = multiply
    ? `(x ${b < 0 ? "+" : "-"} ${Math.abs(b)})/(x ${a < 0 ? "+" : "-"} ${Math.abs(a)})`
    : `(x ${a < 0 ? "+" : "-"} ${Math.abs(a)})/(x ${b < 0 ? "+" : "-"} ${Math.abs(b)})`;
  const op = multiply ? "·" : "÷";
  const answer = `x ${a < 0 ? "+" : "-"} ${Math.abs(a)}`;
  return {
    type: "A2.11",
    subtype: "MultiplyDivideRational",
    given: { expression: `${f1} ${op} ${f2}` },
    find: "simplified product/quotient",
    answer,
    steps: [
      {
        instruction: multiply
          ? "Factor every numerator and denominator first:"
          : "Flip the second fraction (multiply by the reciprocal), then factor everything:",
        reason: multiply ? "Factor before multiplying" : "Dividing = multiplying by reciprocal",
        blanks: [{ label: "factored", answer: "see work" }],
      },
      {
        instruction: "Cancel the common factors:",
        reason: "Cancel common factors",
        blanks: [{ label: "simplified", answer }],
      },
    ],
    verify: { a, b, multiply },
  };
}

// ── Solving rational equations ────────────────────────────────────────────────

function makeSolveRational(rng: RNG, level: 1 | 2 | 3): Algebra2Problem {
  if (level === 1) {
    // a/x = b  →  x = a/b (integer)
    const b = randNonZero(rng, -6, 6);
    const x = randNonZero(rng, -8, 8);
    const a = b * x;
    return {
      type: "A2.11",
      subtype: "SolveRationalEquation",
      given: { equation: `${a}/x = ${b}` },
      find: "x",
      answer: `x = ${x}`,
      steps: [
        {
          instruction: "Multiply both sides by x to clear the denominator:",
          reason: "Clear denominators",
          blanks: [{ label: "cleared", answer: `${a} = ${b}x` }],
        },
        {
          instruction: "Solve and check that the denominator is nonzero:",
          reason: "Check domain",
          blanks: [{ label: "solution", answer: `x = ${x}` }],
        },
      ],
      verify: { kind: "simple", a, b, x },
    };
  }
  if (level === 2) {
    // (x - A)/(x - B) = C  →  x = (A - C*B)/(1 - C), constructed integral
    let A = randSigned(rng, 7);
    let B = randSigned(rng, 7);
    if (A === B) B += 2;
    // pick solution s != B, then C = (s - A)/(s - B) must be a nonzero integer != 1
    let s = 0, C = 0, ok = false;
    for (let tries = 0; tries < 60 && !ok; tries++) {
      s = randSigned(rng, 8);
      if (s === B) continue;
      const num = s - A;
      const den = s - B;
      if (num % den !== 0) continue;
      C = num / den;
      if (C === 0 || C === 1) continue;
      ok = true;
    }
    if (!ok) {
      // deterministic fallback: A=1, B=4, s=7 → C=(6)/(3)=2
      A = 1; B = 4; s = 7; C = 2;
    }
    return {
      type: "A2.11",
      subtype: "SolveRationalEquation",
      given: { equation: `(x ${A < 0 ? "+" : "-"} ${Math.abs(A)})/(x ${B < 0 ? "+" : "-"} ${Math.abs(B)}) = ${C}` },
      find: "x",
      answer: `x = ${s}`,
      steps: [
        {
          instruction: `Multiply both sides by (x ${B < 0 ? "+" : "-"} ${Math.abs(B)}):`,
          reason: "Clear denominators",
          blanks: [{ label: "cleared", answer: `x ${A < 0 ? "+" : "-"} ${Math.abs(A)} = ${C}(x ${B < 0 ? "+" : "-"} ${Math.abs(B)})` }],
        },
        {
          instruction: `Solve the linear equation and verify x ≠ ${B}:`,
          reason: "Check domain",
          blanks: [{ label: "solution", answer: `x = ${s}` }],
        },
      ],
      verify: { kind: "linear", A, B, C, x: s },
    };
  }
  // level 3: extraneous root → no solution.  P/(x - r) = Q/(x - r), P != Q.
  const r = randSigned(rng, 6);
  const P = randNonZero(rng, -8, 8);
  let Q = randNonZero(rng, -8, 8);
  if (Q === P) Q += 3;
  return {
    type: "A2.11",
    subtype: "SolveRationalEquation",
    given: { equation: `${P}/(x ${r < 0 ? "+" : "-"} ${Math.abs(r)}) = ${Q}/(x ${r < 0 ? "+" : "-"} ${Math.abs(r)})` },
    find: "x",
    answer: "no solution",
    steps: [
      {
        instruction: `Multiply both sides by (x ${r < 0 ? "+" : "-"} ${Math.abs(r)}):`,
        reason: "Clear denominators",
        blanks: [{ label: "cleared", answer: `${P} = ${Q}` }],
      },
      {
        instruction: "The resulting statement is false, so the equation has no solution. (Any candidate would make the denominator zero anyway.)",
        reason: "Contradiction gives no solution",
        blanks: [{ label: "solution", answer: "no solution" }],
      },
    ],
    verify: { kind: "extraneous", P, Q, r },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeSimplifyRational },
  { minDifficulty: 1, make: makeAsymptotes },
  { minDifficulty: 1, make: (rng) => makeSolveRational(rng, 1) },
  { minDifficulty: 2, make: makeSimplifyRational },
  { minDifficulty: 2, make: makeMultiplyDivideRational },
  { minDifficulty: 2, make: makeHoles },
  { minDifficulty: 2, make: (rng) => makeSolveRational(rng, 2) },
  { minDifficulty: 3, make: makeAsymptotes },
  { minDifficulty: 3, make: makeHoles },
  { minDifficulty: 3, make: makeMultiplyDivideRational },
  { minDifficulty: 3, make: (rng) => makeSolveRational(rng, 3) },
];

/**
 * Generate n A2.11 problems at the given cumulative difficulty tier.
 * `only` optionally restricts to the named subtypes (lesson wiring).
 */
export function generateRationalProblems(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  only?: readonly string[]
): Algebra2Problem[] {
  const pool = selectMakers(MAKERS, difficulty, only);
  const out: Algebra2Problem[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 60 + 200) {
    const p = pool[Math.floor(rng() * pool.length)].make(rng);
    if (!only || only.includes(p.subtype)) out.push(p);
  }
  return out;
}

export const RATIONAL_MAKERS = MAKERS;

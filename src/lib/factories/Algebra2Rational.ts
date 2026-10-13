// Algebra2Rational.ts
// A2.4, Rational functions & equations: vertical/horizontal asymptotes,
// holes (removable discontinuities), solving rational equations (including
// extraneous/no-solution cases). Denominators are guarded against being
// identically zero and against hidden common factors except in the Holes
// family. Tests recompute asymptotes/holes independently and substitute
// solutions into the ORIGINAL equation.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem, Algebra2RationalSVGParams } from "./Algebra2Types";
import { randSigned, randNonZero, reduceFrac, fracToLatex, polyToLatex, linearFactor, selectMakers } from "./Algebra2Helpers";

export type RationalSubtype = "SimplifyRational" | "MultiplyDivideRational" | "AddSubtractRational" | "Asymptotes" | "Holes" | "SolveRationalEquation" | "InverseVariation" | "RationalWordProblem";

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

// ── Add / subtract rational expressions ──────────────────────────────────────
// Constructive families by tier (spec: topic-11-add-subtract-spec.md).
// Except for likeCancel, where canceling is the point of the problem,
// every family builds its combined numerator so it does NOT vanish at a
// pole, so no factor cancels and the answer is exactly
// (combined numerator)/(common denominator):
//  - like (D1):        N(r) is guarded nonzero before the problem returns.
//  - likeCancel (D1):  combined numerator is exactly M(x - r); answer is M.
//  - unlikeSimple (D2): N(r) = ±A(r - s), N(s) = ±B(s - r); A, B ≠ 0, r ≠ s.
//  - unlikeShared (D2): denominators differ by one factor; N(r) guarded.
//  - unlikePoly (D3):  N(r) = (ar + b)(r - s), ar + b guarded; N(s) = ±C(s - r).
//  - factorFirst (D3): x^2 - k^2 denominator; N(-k) = A ≠ 0, N(k) guarded.
//  - opposite (D3):    (r - x) = -(x - r); the pair collapses to one fraction.
// Answers display the numerator in parentheses when it has more than one
// term; unlike-denominator answers use the expanded quadratic denominator.

function fracAnswer(num: number[], denDisplay: string): string {
  const terms = num.filter((c) => c !== 0).length;
  const numStr = polyToLatex(num);
  return `${terms > 1 ? `(${numStr})` : numStr}/${denDisplay}`;
}

function makeAddSubtractLike(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const r = randSigned(rng, 6);
  const a = randNonZero(rng, -3, 3);
  const c = randNonZero(rng, -3, 3);
  const b = randSigned(rng, 6);
  let d = randSigned(rng, 6);
  const combined = (): [number, number] => [a + sgn * c, b + sgn * d];
  let guard = 0;
  while (guard++ < 24) {
    const [na, nb] = combined();
    if (!(na === 0 && nb === 0) && na * r + nb !== 0) break;
    d = randSigned(rng, 6);
  }
  {
    const [na, nb] = combined();
    if ((na === 0 && nb === 0) || na * r + nb === 0) {
      // Deterministic fallback: force the combined numerator's value at
      // x = r to be exactly 1 by choosing d to make nb = 1 - na*r.
      const target = 1 - na * r;
      d = sgn === 1 ? target - b : b - target;
    }
  }
  const [na, nb] = combined();
  const num: number[] = [na, nb];
  const den = linearFactor(r);
  const answer = fracAnswer(num, den);
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `(${linLatex(a, b)})/${den} ${sgn === 1 ? "+" : "-"} (${linLatex(c, d)})/${den}` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: `The denominators are already the same, so ${op === "add" ? "add" : "subtract"} the numerators over the common denominator ${den}${op === "sub" ? " (the minus applies to the whole second numerator)" : ""}:`,
        reason: "Common denominator",
        blanks: [{ label: "combined numerator", answer: polyToLatex(num) }],
      },
      {
        instruction: `Simplify the numerator and keep the restriction x cannot equal ${r}:`,
        reason: "Simplify; the denominator cannot be zero",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "like", a, b, c, d, r, op },
  };
}

function makeAddSubtractUnlikeSimple(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const A = randNonZero(rng, 2, 7);
  const B = randNonZero(rng, 2, 7);
  const r = randSigned(rng, 6);
  let s = randSigned(rng, 6);
  while (s === r) s = randSigned(rng, 6);
  // N(x) = A(x - s) ± B(x - r)
  const num: number[] = [A + sgn * B, -A * s - sgn * B * r];
  const denPoly: number[] = [1, -(r + s), r * s];
  const answer = fracAnswer(num, `(${polyToLatex(denPoly)})`);
  const lcd = `${linearFactor(r)}${linearFactor(s)}`;
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `${A}/${linearFactor(r)} ${sgn === 1 ? "+" : "-"} ${B}/${linearFactor(s)}` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: "Find the least common denominator of the two denominators:",
        reason: "LCD of distinct linear factors is their product (the LCD rewrites fractions; it never clears them, clearing is a move for equations)",
        blanks: [{ label: "LCD", answer: lcd }],
      },
      {
        instruction: `Rewrite each fraction with the LCD, then ${op === "add" ? "add" : "subtract"} the numerators and expand the denominator:`,
        reason: "Combine over the LCD",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "unlikeSimple", A, B, r, s, op },
  };
}

function makeAddSubtractUnlikePoly(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const a = randNonZero(rng, -3, 3);
  let b = randSigned(rng, 6);
  const r = randSigned(rng, 6);
  let s = randSigned(rng, 6);
  while (s === r) s = randSigned(rng, 6);
  if (a * r + b === 0) b = 1 - a * r;
  const C = randNonZero(rng, 2, 7);
  // N(x) = (ax + b)(x - s) ± C(x - r) = a x^2 + (b - a s ± C) x + (-b s ∓ C r)
  const num: number[] = [a, b - a * s + sgn * C, -b * s - sgn * C * r];
  const denPoly: number[] = [1, -(r + s), r * s];
  const answer = fracAnswer(num, `(${polyToLatex(denPoly)})`);
  const lcd = `${linearFactor(r)}${linearFactor(s)}`;
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `(${linLatex(a, b)})/${linearFactor(r)} ${sgn === 1 ? "+" : "-"} ${C}/${linearFactor(s)}` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: "Find the least common denominator of the two denominators:",
        reason: "LCD of distinct linear factors is their product",
        blanks: [{ label: "LCD", answer: lcd }],
      },
      {
        instruction: `Multiply the first numerator by ${linearFactor(s)} and the second by ${linearFactor(r)}, then ${op === "add" ? "add" : "subtract"} and expand:`,
        reason: "Combine over the LCD",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "unlikePoly", a, b, C, r, s, op },
  };
}

// Like denominators where the combined numerator is exactly M(x - r), so
// the final step cancels the denominator factor and the answer is the
// constant M (the "light final cancel" case).
function makeAddSubtractLikeCancel(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const r = randSigned(rng, 5);
  const M = randNonZero(rng, -3, 3);
  const a = randNonZero(rng, -3, 3);
  const b = randSigned(rng, 5);
  // add: c = M - a, d = -M r - b.  sub: c = a - M, d = b + M r.
  const c = sgn === 1 ? M - a : a - M;
  const d = sgn === 1 ? -M * r - b : b + M * r;
  const den = linearFactor(r);
  const answer = `${M}`;
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `(${linLatex(a, b)})/${den} ${sgn === 1 ? "+" : "-"} (${linLatex(c, d)})/${den}` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: `The denominators are already the same, so ${op === "add" ? "add" : "subtract"} the numerators over the common denominator ${den}${op === "sub" ? " (the minus applies to the whole second numerator)" : ""}:`,
        reason: "Common denominator",
        blanks: [{ label: "combined numerator", answer: polyToLatex([M, -M * r]) }],
      },
      {
        instruction: `The combined numerator factors as ${M}${den}; cancel that factor with the denominator, keeping the restriction x cannot equal ${r}:`,
        reason: "Factor and cancel; the denominator cannot be zero",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "likeCancel", a, b, c, d, r, op, M },
  };
}

// Unlike denominators differing by one factor: A/(x - r) and
// B/((x - r)(x - s)) (second denominator displayed expanded). The LCD is
// (x - r)(x - s); only the first fraction needs a new factor.
function makeAddSubtractUnlikeShared(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const A = randNonZero(rng, 2, 7);
  let B = randNonZero(rng, 2, 7);
  const r = randSigned(rng, 6);
  let s = randSigned(rng, 6);
  while (s === r) s = randSigned(rng, 6);
  // N(x) = A(x - s) ± B; N(r) = A(r - s) ± B must be nonzero (no cancel).
  let guard = 0;
  while (guard++ < 24 && A * (r - s) + sgn * B === 0) B = randNonZero(rng, 2, 7);
  if (A * (r - s) + sgn * B === 0) B = B === 7 ? 5 : B + 2;
  const num: number[] = [A, -A * s + sgn * B];
  const denPoly: number[] = [1, -(r + s), r * s];
  const denExpanded = `(${polyToLatex(denPoly)})`;
  const answer = fracAnswer(num, denExpanded);
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `${A}/${linearFactor(r)} ${sgn === 1 ? "+" : "-"} ${B}/${denExpanded}` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: `The second denominator factors as ${linearFactor(r)}${linearFactor(s)}, so the LCD is ${linearFactor(r)}${linearFactor(s)}, the first fraction is missing the factor ${linearFactor(s)}:`,
        reason: "Build the LCD from the factored denominators (the LCD rewrites fractions; it never clears them, clearing is a move for equations)",
        blanks: [{ label: "LCD", answer: `${linearFactor(r)}${linearFactor(s)}` }],
      },
      {
        instruction: `Multiply the first numerator by ${linearFactor(s)}, then ${op === "add" ? "add" : "subtract"} the numerators and expand the denominator:`,
        reason: "Combine over the LCD",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "unlikeShared", A, B, r, s, op },
  };
}

// Factor-first: A/(x^2 - k^2) ± B/(x - k). The first denominator must be
// factored before the LCD (x - k)(x + k) is visible.
function makeAddSubtractFactorFirst(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const k = randNonZero(rng, 2, 6);
  const A = randNonZero(rng, 2, 8);
  let B = randNonZero(rng, 2, 7);
  // N(x) = A ± B(x + k); N(-k) = A ≠ 0, N(k) = A ± 2Bk must be nonzero.
  let guard = 0;
  while (guard++ < 24 && A + sgn * 2 * B * k === 0) B = randNonZero(rng, 2, 7);
  if (A + sgn * 2 * B * k === 0) B = B === 7 ? 5 : B + 1;
  const num: number[] = [sgn * B, A + sgn * B * k];
  const denPoly: number[] = [1, 0, -k * k];
  const answer = fracAnswer(num, `(${polyToLatex(denPoly)})`);
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `${A}/(x^2 - ${k * k}) ${sgn === 1 ? "+" : "-"} ${B}/${linearFactor(k)}` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: `Factor the first denominator as a difference of squares, (x^2 - ${k * k}) = ${linearFactor(k)}${linearFactor(-k)}, so the LCD is ${linearFactor(k)}${linearFactor(-k)}:`,
        reason: "Factor first, then build the LCD",
        blanks: [{ label: "LCD", answer: `${linearFactor(k)}${linearFactor(-k)}` }],
      },
      {
        instruction: `Multiply the second numerator by ${linearFactor(-k)}, then ${op === "add" ? "add" : "subtract"} the numerators:`,
        reason: "Combine over the LCD",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "factorFirst", A, B, k, op },
  };
}

// Opposite factors: A/(x - r) ± B/(r - x), with r > 0 so the second
// denominator displays as (r - x). Since (r - x) = -(x - r), the pair
// combines over a single linear denominator.
function makeAddSubtractOpposite(rng: RNG): Algebra2Problem {
  const op = rng() < 0.5 ? "add" : "sub";
  const sgn = op === "add" ? 1 : -1;
  const r = randNonZero(rng, 2, 6);
  const A = randNonZero(rng, 2, 8);
  let B = randNonZero(rng, 2, 8);
  if (sgn === 1) while (B === A) B = randNonZero(rng, 2, 8);
  // B/(r - x) = -B/(x - r): add gives (A - B)/(x - r), sub gives (A + B)/(x - r).
  const M = sgn === 1 ? A - B : A + B;
  const den = linearFactor(r);
  const answer = fracAnswer([M], den);
  return {
    type: "A2.11",
    subtype: "AddSubtractRational",
    given: { expression: `${A}/${den} ${sgn === 1 ? "+" : "-"} ${B}/(${r} - x)` },
    find: op === "add" ? "sum, in simplified form" : "difference, in simplified form",
    answer,
    steps: [
      {
        instruction: `The factors ${den} and (${r} - x) are opposites: (${r} - x) = -${den}, so the second fraction equals ${-B}/${den}:`,
        reason: "Opposite factors differ by a sign of -1",
        blanks: [{ label: "rewritten second numerator", answer: `${-B}` }],
      },
      {
        instruction: `Now the denominators match, so combine the numerators, keeping the restriction x cannot equal ${r}:`,
        reason: "Common denominator",
        blanks: [{ label: op === "add" ? "sum" : "difference", answer }],
      },
    ],
    verify: { kind: "opposite", A, B, r, op },
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

// ── 11-6: inverse variation (2A.6L) ──────────────────────────────────────────
// y = k/x formulated from a context pair; find k, predict values, read a
// table; at level 3, y varies inversely as the SQUARE of x.

interface InvCtx { yv: string; xv: string; phrase: string }

const INV_CTX: InvCtx[] = [
  { yv: "y", xv: "x", phrase: "y varies inversely as x" },
  { yv: "P", xv: "V", phrase: "The pressure P of a fixed amount of gas varies inversely as its volume V" },
  { yv: "t", xv: "n", phrase: "The time t needed to finish a job varies inversely as the number of workers n" },
  { yv: "I", xv: "R", phrase: "The current I in a circuit varies inversely as the resistance R" },
  { yv: "s", xv: "t", phrase: "For a trip of fixed distance, the average speed s varies inversely as the travel time t" },
];

function makeInverseVariationFindK(rng: RNG): Algebra2Problem {
  const ctx = pick(rng, INV_CTX);
  const x0 = randInt(rng, 2, 9);
  const y0 = randInt(rng, 2, 12);
  const k = x0 * y0;
  const answer = `k = ${k}; ${ctx.yv} = ${k}/${ctx.xv}`;
  return {
    type: "A2.11",
    subtype: "InverseVariation",
    given: { relationship: ctx.phrase, pair: `when ${ctx.xv} = ${x0}, ${ctx.yv} = ${y0}` },
    find: "the constant of variation k and the inverse variation equation",
    answer,
    steps: [
      {
        instruction: `Inverse variation means ${ctx.yv}${ctx.xv} = k. Substitute the known pair ${ctx.xv} = ${x0}, ${ctx.yv} = ${y0}:`,
        reason: "Inverse variation model xy = k",
        blanks: [{ label: "k", answer: `${k}` }],
      },
      {
        instruction: "Write the equation with this value of k:",
        reason: "Inverse variation equation",
        blanks: [{ label: "equation", answer: `${ctx.yv} = ${k}/${ctx.xv}` }],
      },
    ],
    verify: { kind: "findK", x0, y0, k, yv: ctx.yv, xv: ctx.xv },
  };
}

function divisorsOf(k: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let d = lo; d <= hi; d++) if (k % d === 0) out.push(d);
  return out;
}

function makeInverseVariationPredict(rng: RNG): Algebra2Problem {
  const ctx = pick(rng, INV_CTX);
  const k = pick(rng, [24, 36, 48, 60, 72, 96, 120]);
  const divs = divisorsOf(k, 2, 12);
  const x0 = pick(rng, divs);
  const y0 = k / x0;
  const askY = rng() < 0.5;
  let at: number;
  if (rng() < 0.5) {
    const options = divs.filter((d) => d !== (askY ? x0 : y0));
    at = options.length > 0 ? pick(rng, options) : x0 + 1;
  } else {
    at = randInt(rng, 2, 16);
  }
  const [an, ad] = reduceFrac(k, at);
  const ansVal = fracToLatex(k, at);
  const answer = askY ? `${ctx.yv} = ${ansVal}` : `${ctx.xv} = ${ansVal}`;
  return {
    type: "A2.11",
    subtype: "InverseVariation",
    given: {
      relationship: ctx.phrase,
      pair: `when ${ctx.xv} = ${x0}, ${ctx.yv} = ${y0}`,
      query: askY ? `${ctx.xv} = ${at}` : `${ctx.yv} = ${at}`,
    },
    find: askY ? `${ctx.yv} when ${ctx.xv} = ${at}` : `${ctx.xv} when ${ctx.yv} = ${at}`,
    answer,
    steps: [
      {
        instruction: `First find k from the known pair: k = ${ctx.xv}${ctx.yv} = ${x0}(${y0}):`,
        reason: "Constant of variation",
        blanks: [{ label: "k", answer: `${k}` }],
      },
      {
        instruction: askY
          ? `Use ${ctx.yv} = k/${ctx.xv} with ${ctx.xv} = ${at}:`
          : `Use ${ctx.xv} = k/${ctx.yv} with ${ctx.yv} = ${at}:`,
        reason: "Predict with the model",
        blanks: [{ label: "prediction", answer }],
      },
    ],
    verify: { kind: "predict", k, ask: askY ? "y" : "x", at, ansNum: an, ansDen: ad, yv: ctx.yv, xv: ctx.xv },
  };
}

function makeInverseVariationTable(rng: RNG): Algebra2Problem {
  const k = pick(rng, [12, 18, 20, 24, 30, 36, 40, 48, 60]);
  const divs = divisorsOf(k, 2, 12);
  const xs = [...divs].sort((m, n) => m - n).slice(0, 4);
  const ys = xs.map((x) => k / x);
  const hideIdx = randInt(rng, 1, xs.length - 1);
  const yText = ys.map((y, i) => (i === hideIdx ? "?" : `${y}`)).join(", ");
  const firstComplete = hideIdx === 0 ? 1 : 0;
  return {
    type: "A2.11",
    subtype: "InverseVariation",
    given: { relationship: "y varies inversely as x", table: `x: ${xs.join(", ")}; y: ${yText}` },
    find: "the missing value in the table",
    answer: `${ys[hideIdx]}`,
    steps: [
      {
        instruction: `Every complete pair in the table has the same product xy. Using x = ${xs[firstComplete]}, y = ${ys[firstComplete]}:`,
        reason: "Constant product xy = k",
        blanks: [{ label: "k", answer: `${k}` }],
      },
      {
        instruction: `At x = ${xs[hideIdx]}, y = k/x = ${k}/${xs[hideIdx]}:`,
        reason: "Solve for the missing value",
        blanks: [{ label: "missing y", answer: `${ys[hideIdx]}` }],
      },
    ],
    verify: { kind: "table", k, xs, ys, hideIdx },
  };
}

const INV_SQ_TRIPLES: [number, number, number][] = [
  // (d0, y0, d1): k = y0 * d0^2; predicted y1 = k / d1^2 stays clean
  [2, 60, 4], [3, 40, 6], [2, 90, 3], [4, 45, 6], [5, 12, 10],
  [3, 200, 5], [4, 30, 8], [6, 25, 3], [2, 150, 5], [5, 32, 10],
];

const INV_SQ_CTX: InvCtx[] = [
  { yv: "I", xv: "d", phrase: "The intensity I of a light varies inversely as the square of the distance d from the source" },
  { yv: "F", xv: "d", phrase: "The gravitational force F between two objects varies inversely as the square of the distance d between them" },
  { yv: "L", xv: "d", phrase: "The loudness L of a sound varies inversely as the square of the distance d from the speaker" },
];

function makeInverseVariationSquare(rng: RNG): Algebra2Problem {
  const ctx = pick(rng, INV_SQ_CTX);
  const [d0, y0, d1] = pick(rng, INV_SQ_TRIPLES);
  const k = y0 * d0 * d0;
  const [an, ad] = reduceFrac(k, d1 * d1);
  const answer = `${ctx.yv} = ${fracToLatex(k, d1 * d1)}`;
  return {
    type: "A2.11",
    subtype: "InverseVariation",
    given: {
      relationship: ctx.phrase,
      pair: `when ${ctx.xv} = ${d0}, ${ctx.yv} = ${y0}`,
      query: `${ctx.xv} = ${d1}`,
    },
    find: `${ctx.yv} when ${ctx.xv} = ${d1}`,
    answer,
    steps: [
      {
        instruction: `Inverse-square variation means ${ctx.yv}${ctx.xv}^2 = k. Substitute the known pair: k = ${y0}(${d0})^2:`,
        reason: "Inverse-square model yx^2 = k",
        blanks: [{ label: "k", answer: `${k}` }],
      },
      {
        instruction: `Use ${ctx.yv} = k/${ctx.xv}^2 with ${ctx.xv} = ${d1}:`,
        reason: "Predict with the model",
        blanks: [{ label: "prediction", answer }],
      },
    ],
    verify: { kind: "square", d0, y0, k, d1, ansNum: an, ansDen: ad, yv: ctx.yv },
  };
}

// ── 11-7: rational equation word problems (2A.6H, 2A.6J) ─────────────────────
// Combined work and cost-sharing contexts. Steps formulate the rational
// equation, solve it, and explicitly reject the excluded or non-physical
// candidate where one exists.

function makeWorkTogether(rng: RNG): Algebra2Problem {
  const [a, b] = pick(rng, [[3, 6], [4, 12], [6, 12], [2, 6], [4, 6], [6, 10], [8, 12], [3, 12], [5, 5], [6, 6]] as [number, number][]);
  const who = pick(rng, [
    { n1: "Mia", n2: "Noah", job: "paint a room" },
    { n1: "Pipe A", n2: "Pipe B", job: "fill a tank" },
    { n1: "Machine A", n2: "Machine B", job: "finish an order" },
    { n1: "Lena", n2: "Omar", job: "rake a yard" },
  ]);
  const T = fracToLatex(a * b, a + b);
  const answer = `${T} hours`;
  return {
    type: "A2.11",
    subtype: "RationalWordProblem",
    given: { scenario: `${who.n1} can ${who.job} alone in ${a} hours, and ${who.n2} can ${who.job} alone in ${b} hours.` },
    find: "how long it takes working together",
    answer,
    steps: [
      {
        instruction: `In one hour ${who.n1} completes 1/${a} of the job and ${who.n2} completes 1/${b}. If together they take T hours, the rate equation is:`,
        reason: "Work rates add",
        blanks: [{ label: "equation", answer: `1/${a} + 1/${b} = 1/T` }],
      },
      {
        instruction: `Add the rates: 1/${a} + 1/${b} = ${fracToLatex(a + b, a * b)}, so 1/T = ${fracToLatex(a + b, a * b)} and T is the reciprocal:`,
        reason: "Solve the rational equation",
        blanks: [{ label: "T", answer }],
      },
      {
        instruction: `Check reasonableness: ${T} hours is positive and less than either solo time (${a} and ${b} hours), as a combined time must be, and T = 0 is excluded because 1/T would be undefined:`,
        reason: "Check excluded and non-physical values",
        blanks: [{ label: "verdict", answer: "reasonable, no rejection needed" }],
      },
    ],
    verify: { kind: "workTogether", a, b },
  };
}

function makeWorkFindOther(rng: RNG): Algebra2Problem {
  const [a, T, b] = pick(rng, [[6, 2, 3], [12, 3, 4], [12, 4, 6], [20, 4, 5], [30, 5, 6], [24, 6, 8], [18, 6, 9]] as [number, number, number][]);
  const who = pick(rng, [
    { n1: "A gardener", n2: "a helper", job: "landscape a yard" },
    { n1: "One hose", n2: "a second hose", job: "fill a pool" },
    { n1: "A printer", n2: "a second printer", job: "print a yearbook run" },
  ]);
  const answer = `${b} hours`;
  return {
    type: "A2.11",
    subtype: "RationalWordProblem",
    given: { scenario: `${who.n1} can ${who.job} alone in ${a} hours. Working with ${who.n2}, the job takes ${T} hours.` },
    find: `how long ${who.n2} takes alone`,
    answer,
    steps: [
      {
        instruction: `Let t be the solo time for ${who.n2}. The rate equation is:`,
        reason: "Work rates add",
        blanks: [{ label: "equation", answer: `1/${a} + 1/t = 1/${T}` }],
      },
      {
        instruction: `Subtract 1/${a}: 1/t = 1/${T} - 1/${a} = ${fracToLatex(a - T, a * T)}, then take the reciprocal:`,
        reason: "Solve the rational equation",
        blanks: [{ label: "t", answer }],
      },
      {
        instruction: `The value t = 0 is excluded (1/t is undefined there), and the solution is positive, so it is a physically possible time:`,
        reason: "Check excluded and non-physical values",
        blanks: [{ label: "verdict", answer: "accepted" }],
      },
    ],
    verify: { kind: "workFindOther", a, T, b },
  };
}

function makeVanShare(rng: RNG): Algebra2Problem {
  let n = 20, e = 4, d = 2;
  for (let tries = 0; tries < 200; tries++) {
    n = pick(rng, [10, 12, 15, 16, 20, 24, 30]);
    e = pick(rng, [2, 3, 4, 5, 6, 8]);
    d = randInt(rng, 1, 5);
    const C = (d * n * (n + e)) / e;
    if (Number.isInteger(C) && C >= 100 && C <= 2000) break;
  }
  if (!Number.isInteger((d * n * (n + e)) / e) || (d * n * (n + e)) / e < 100 || (d * n * (n + e)) / e > 2000) {
    n = 12; e = 3; d = 2; // C = 120 exactly
  }
  const C = (d * n * (n + e)) / e;
  const other = -(n + e);
  const answer = `${n} students`;
  return {
    type: "A2.11",
    subtype: "RationalWordProblem",
    given: { scenario: `A class rents a bus for a field trip at a total cost of $${C}. If ${e} more students had signed up, each student would have paid $${d} less.` },
    find: "how many students signed up",
    answer,
    steps: [
      {
        instruction: `Let n be the number of students. The cost per student is C/n now and C/(n + ${e}) with the extra students, and the drop is $${d}:`,
        reason: "Formulate the rational equation",
        blanks: [{ label: "equation", answer: `${C}/n - ${C}/(n + ${e}) = ${d}` }],
      },
      {
        instruction: `Clear denominators and simplify to a quadratic: n^2 + ${e}n - ${n * (n + e)} = 0, which factors as (n - ${n})(n + ${n + e}) = 0, giving two algebraic candidates:`,
        reason: "Solve; note both candidates",
        blanks: [
          { label: "candidate 1", answer: `${n}` },
          { label: "candidate 2", answer: `${other}` },
        ],
      },
      {
        instruction: `The candidate n = ${other} would mean a negative number of students, which is impossible in this context, so it is rejected even though it satisfies the equation (note n = 0 and n = ${-e} are excluded values of the original equation):`,
        reason: "Reject the non-physical solution",
        blanks: [{ label: "rejected", answer: `${other}` }],
      },
      {
        instruction: "State the answer:",
        reason: "Interpret the solution",
        blanks: [{ label: "answer", answer }],
      },
    ],
    verify: { kind: "vanShare", n, e, d, C },
  };
}

function makeWorkDifference(rng: RNG): Algebra2Problem {
  const [u, v] = pick(rng, [[3, 6], [4, 12], [6, 12], [5, 20], [8, 24], [10, 15], [12, 24]] as [number, number][]);
  const d = v - u;
  const T = fracToLatex(u * v, u + v);
  // second root of u^2 + (d - 2T)u - Td = 0, always a negative integer here
  const negRoot = -(v * d) / (u + v);
  const answer = `${u} hours and ${v} hours`;
  const who = pick(rng, [
    { n1: "One painter", n2: "another painter", job: "paint a house" },
    { n1: "One pump", n2: "another pump", job: "drain a pond" },
  ]);
  return {
    type: "A2.11",
    subtype: "RationalWordProblem",
    given: { scenario: `Working together, ${who.n1} and ${who.n2} can ${who.job} in ${T} hours. Alone, ${who.n2} takes ${d} hours longer than ${who.n1}.` },
    find: "each solo time",
    answer,
    steps: [
      {
        instruction: `Let u be the faster solo time; the slower time is u + ${d}. The rate equation is:`,
        reason: "Work rates add",
        blanks: [{ label: "equation", answer: `1/u + 1/(u + ${d}) = ${fracToLatex(u + v, u * v)}` }],
      },
      {
        instruction: "Clearing denominators gives a quadratic with two algebraic candidates, one positive and one negative:",
        reason: "Solve the rational equation",
        blanks: [
          { label: "candidate 1", answer: `${u}` },
          { label: "candidate 2", answer: `${negRoot}` },
        ],
      },
      {
        instruction: `A negative time is not physically possible (and u = 0 and u = ${-d} are excluded values of the original equation), so the candidate u = ${negRoot} is rejected:`,
        reason: "Reject the non-physical solution",
        blanks: [{ label: "u", answer: `${u}` }],
      },
      {
        instruction: `Then the slower time is u + ${d} = ${v}:`,
        reason: "Interpret the solution",
        blanks: [{ label: "answer", answer }],
      },
    ],
    verify: { kind: "workDifference", u, v, d, tNum: u * v, tDen: u + v },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: makeSimplifyRational },
  { minDifficulty: 1, make: makeAsymptotes },
  { minDifficulty: 1, make: makeAddSubtractLike },
  { minDifficulty: 1, make: makeAddSubtractLikeCancel },
  { minDifficulty: 1, make: (rng) => makeSolveRational(rng, 1) },
  { minDifficulty: 2, make: makeSimplifyRational },
  { minDifficulty: 2, make: makeMultiplyDivideRational },
  { minDifficulty: 2, make: makeAddSubtractLike },
  { minDifficulty: 2, make: makeAddSubtractUnlikeSimple },
  { minDifficulty: 2, make: makeAddSubtractUnlikeShared },
  { minDifficulty: 2, make: makeHoles },
  { minDifficulty: 2, make: (rng) => makeSolveRational(rng, 2) },
  { minDifficulty: 3, make: makeAsymptotes },
  { minDifficulty: 3, make: makeHoles },
  { minDifficulty: 3, make: makeMultiplyDivideRational },
  { minDifficulty: 3, make: makeAddSubtractUnlikeSimple },
  { minDifficulty: 3, make: makeAddSubtractUnlikeShared },
  { minDifficulty: 3, make: makeAddSubtractUnlikePoly },
  { minDifficulty: 3, make: makeAddSubtractFactorFirst },
  { minDifficulty: 3, make: makeAddSubtractOpposite },
  { minDifficulty: 3, make: (rng) => makeSolveRational(rng, 3) },
  // 11-6 inverse variation (2A.6L)
  { minDifficulty: 1, make: makeInverseVariationFindK },
  { minDifficulty: 2, make: makeInverseVariationPredict },
  { minDifficulty: 2, make: makeInverseVariationTable },
  { minDifficulty: 3, make: makeInverseVariationSquare },
  // 11-7 rational word problems (2A.6H, 2A.6J)
  { minDifficulty: 1, make: makeWorkTogether },
  { minDifficulty: 2, make: makeWorkFindOther },
  { minDifficulty: 2, make: makeVanShare },
  { minDifficulty: 3, make: makeWorkDifference },
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

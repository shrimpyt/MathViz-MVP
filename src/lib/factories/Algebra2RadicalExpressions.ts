// Algebra2RadicalExpressions.ts
// A2.9, Radical expressions & rational exponents (9-1..9-4): simplifying
// nth roots, multiplying/dividing radicals with rationalized denominators,
// binomial radical expressions (including conjugates), and rational exponents
// as a second notation for roots. Every answer is computed from the generated
// givens: radicands are split into (outside)^index · inside by construction,
// quotients are rationalized symbolically, and exponent answers are reduced
// fractions. Pure, seeded, cumulative difficulty 1|2|3.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import { gcd, reduceFrac, fracToLatex, selectMakers } from "./Algebra2Helpers";

export type RadicalExpressionSubtype =
  | "SimplifyRadical"
  | "RadicalMultiply"
  | "RadicalDivide"
  | "BinomialRadicals"
  | "RationalizeBinomial"
  | "RationalExponents";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** LaTeX for the radical sign alone: √{x} or √[n]{x}. */
function radicalSign(inside: string, index: number): string {
  return index === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${index}]{${inside}}`;
}

/** c·(index-th root of inside), simplified display; inside may be text. */
function radicalLatex(coef: number, inside: number | string, index: number): string {
  if (coef === 0) return "0";
  if (typeof inside === "number" && inside === 1) return `${coef}`;
  if (inside === "" || inside === 0) return `${coef}`;
  const body = radicalSign(`${inside}`, index);
  if (coef === 1) return body;
  if (coef === -1) return `-${body}`;
  return `${coef}${body}`;
}

/** Split n = s^index · k with s maximal (k has no index-th-power factor > 1). */
function rootSplit(n: number, index: number): [number, number] {
  let best = 1;
  for (let s = 2; Math.pow(s, index) <= n; s++) {
    if (n % Math.pow(s, index) === 0) best = s;
  }
  return [best, n / Math.pow(best, index)];
}

/** Variable part string from (var, exp) pairs: "x^2y" style. */
function varString(pairs: [string, number][]): string {
  return pairs
    .filter(([, e]) => e > 0)
    .map(([v, e]) => (e === 1 ? v : `${v}^${e}`))
    .join("");
}

/** Binomial a ± b√m as display text (b > 0; sign selects + or -). */
function binomialLatex(a: number, b: number, m: number, sign: 1 | -1): string {
  const rad = b === 1 ? `\\sqrt{${m}}` : `${b}\\sqrt{${m}}`;
  if (a === 0) return sign > 0 ? rad : `-${rad}`;
  return `${a} ${sign > 0 ? "+" : "-"} ${rad}`;
}

/** (rat + coef·√m) normalized answer: coef may be negative or zero. */
function binomAnswer(rat: number, coef: number, m: number): string {
  if (coef === 0) return `${rat}`;
  const radAbs = Math.abs(coef) === 1 ? `\\sqrt{${m}}` : `${Math.abs(coef)}\\sqrt{${m}}`;
  if (rat === 0) return coef > 0 ? radAbs : `-${radAbs}`;
  return `${rat} ${coef > 0 ? "+" : "-"} ${radAbs}`;
}

// ── 9-1 Simplify radicals ─────────────────────────────────────────────────────

function makeSimplifyNumeric(rng: RNG, index: 2 | 3 | 4): Algebra2Problem {
  const s =
    index === 2 ? randInt(rng, 2, 8) : index === 3 ? randInt(rng, 2, 5) : randInt(rng, 2, 3);
  const kPool =
    index === 2
      ? [1, 2, 3, 5, 6, 7, 10, 11, 13, 14, 15]
      : index === 3
        ? [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 15, 20]
        : [1, 2, 3, 5, 6, 7, 10, 11, 13, 15];
  const k = pick(rng, kPool);
  const n = Math.pow(s, index) * k;
  const answer = radicalLatex(s, k, index);
  const rootName = index === 2 ? "square" : index === 3 ? "cube" : "fourth";
  const factorKind = index === 2 ? "perfect square" : `perfect ${rootName} power`;
  return {
    type: "A2.9",
    subtype: "SimplifyRadical",
    given: { expression: radicalSign(`${n}`, index) },
    find: "simplified form",
    answer,
    steps: [
      {
        instruction: `Factor out the largest ${factorKind}: ${n} = ${Math.pow(s, index)} · ${k}:`,
        reason: `${index === 2 ? "Perfect-square" : "Perfect-power"} factor`,
        blanks: [{ label: "factorization", answer: `${n} = ${Math.pow(s, index)} · ${k}` }],
      },
      {
        instruction: `The ${rootName} root of ${Math.pow(s, index)} is ${s}; it comes out of the radical, and the root of ${k} stays inside:`,
        reason: "Product property of radicals",
        blanks: [{ label: "simplified", answer }],
      },
    ],
    verify: { kind: "numeric", n, index, outside: s, inside: k },
  };
}

function makeSimplifyCoefficient(rng: RNG): Algebra2Problem {
  const c = randInt(rng, 2, 6);
  const s = randInt(rng, 2, 6);
  const k = pick(rng, [2, 3, 5, 6, 7, 10, 11, 13]);
  const n = s * s * k;
  const answer = radicalLatex(c * s, k, 2);
  return {
    type: "A2.9",
    subtype: "SimplifyRadical",
    given: { expression: `${c}\\sqrt{${n}}` },
    find: "simplified form",
    answer,
    steps: [
      {
        instruction: `Simplify the radical first: \\sqrt{${n}} = \\sqrt{${s * s} · ${k}} = ${s}\\sqrt{${k}}:`,
        reason: "Perfect-square factor",
        blanks: [{ label: "simplified radical", answer: `${s}\\sqrt{${k}}` }],
      },
      {
        instruction: "Multiply the coefficients outside the radical:",
        reason: "Multiply coefficients",
        blanks: [{ label: "simplified", answer }],
      },
    ],
    verify: { kind: "coef", n, coef: c, index: 2, outside: c * s, inside: k },
  };
}

function makeSimplifyVariables(rng: RNG): Algebra2Problem {
  const s = randInt(rng, 2, 6);
  const k = pick(rng, [2, 3, 5, 6, 7, 10]);
  const n = s * s * k;
  const vars: [string, number][] = [
    ["x", randInt(rng, 2, 7)],
    ["y", randInt(rng, 1, 5)],
  ];
  const radicand = `${n}${varString(vars)}`;
  const outPairs = vars.map(([v, e]) => [v, Math.floor(e / 2)] as [string, number]);
  const inPairs = vars.map(([v, e]) => [v, e % 2] as [string, number]);
  const outsideStr = `${s}${varString(outPairs)}`;
  const insideStr = `${k}${varString(inPairs)}`;
  const answer = `${outsideStr}\\sqrt{${insideStr}}`;
  return {
    type: "A2.9",
    subtype: "SimplifyRadical",
    given: { expression: `\\sqrt{${radicand}}` },
    find: "simplified form (variables represent positive numbers)",
    answer,
    steps: [
      {
        instruction:
          "Split the radicand into a perfect-square part and what remains: " +
          `\\sqrt{${n}} = ${s}\\sqrt{${k}}, and each variable's exponent splits into pairs and a leftover:`,
        reason: "Perfect-square factors, including variable powers",
        blanks: [{ label: "outside the radical", answer: outsideStr }],
      },
      {
        instruction: "One of each pair of variable factors comes out; a single leftover factor stays inside:",
        reason: "Product property of radicals",
        blanks: [{ label: "simplified", answer }],
      },
    ],
    verify: {
      kind: "vars",
      n,
      index: 2,
      coefOut: s,
      insideNum: k,
      vars: "xy",
      exps: vars.map(([, e]) => e),
    },
  };
}

// ── 9-2 Multiply radicals ─────────────────────────────────────────────────────

function makeRadicalMultiply(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  if (hard === 3) {
    // √(mx^p) · √(nx^q) with a shared variable
    const m = randInt(rng, 2, 9);
    const n2 = randInt(rng, 2, 9);
    const p = randInt(rng, 1, 3);
    const q = randInt(rng, 1, 3);
    const [s, k] = rootSplit(m * n2, 2);
    const expSum = p + q;
    const outExp = Math.floor(expSum / 2);
    const inExp = expSum % 2;
    const outStr = `${s === 1 ? "" : s}${outExp === 0 ? "" : outExp === 1 ? "x" : `x^${outExp}`}`;
    const insideStr = `${k === 1 ? "" : k}${inExp === 1 ? "x" : ""}`;
    const answer =
      insideStr === "" ? (outStr === "" ? "1" : outStr) : `${outStr}\\sqrt{${insideStr}}`;
    return {
      type: "A2.9",
      subtype: "RadicalMultiply",
      given: {
        expression: `\\sqrt{${m}${p === 1 ? "x" : `x^${p}`}} \\cdot \\sqrt{${n2}${q === 1 ? "x" : `x^${q}`}}`,
      },
      find: "product, in simplified form (x > 0)",
      answer,
      steps: [
        {
          instruction: "Multiply the radicands under one radical (product property, used in reverse):",
          reason: "Product property of radicals",
          blanks: [
            {
              label: "combined radicand",
              answer: `${m * n2}${expSum === 1 ? "x" : `x^${expSum}`}`,
            },
          ],
        },
        {
          instruction: "Pull out the perfect-square factors, including pairs of x:",
          reason: "Simplify the radical",
          blanks: [{ label: "product", answer }],
        },
      ],
      verify: { kind: "vars", a: m, b: n2, p, q, index: 2 },
    };
  }
  const withCoef = hard === 2;
  const a = pick(rng, [2, 3, 5, 6, 7, 8, 10, 12, 14, 15]);
  const b = pick(rng, [2, 3, 5, 6, 7, 8, 10, 12, 14, 15]);
  const c = withCoef ? randInt(rng, 2, 5) : 1;
  const d = withCoef ? randInt(rng, 2, 5) : 1;
  const [s, k] = rootSplit(a * b, 2);
  const answer = radicalLatex(c * d * s, k, 2);
  const expr = `${withCoef ? `${c}` : ""}\\sqrt{${a}} \\cdot ${withCoef ? `${d}` : ""}\\sqrt{${b}}`;
  const simplifyNote =
    k === 1
      ? `Simplify: \\sqrt{${a * b}} = ${s} exactly:`
      : `Simplify: \\sqrt{${a * b}} = ${s}\\sqrt{${k}}:`;
  return {
    type: "A2.9",
    subtype: "RadicalMultiply",
    given: { expression: expr },
    find: "product, in simplified form",
    answer,
    steps: [
      {
        instruction: `Multiply the radicands (and the outside coefficients): the radicand becomes ${a} · ${b} = ${a * b}:`,
        reason: "Product property of radicals",
        blanks: [{ label: "combined radicand", answer: `${a * b}` }],
      },
      {
        instruction: simplifyNote,
        reason: "Simplify the radical",
        blanks: [{ label: "product", answer }],
      },
    ],
    verify: { kind: "numeric", a, b, c, d, index: 2 },
  };
}

// ── 9-2 Divide radicals (rationalize) ─────────────────────────────────────────

function makeRadicalDivide(rng: RNG, hard: 2 | 3): Algebra2Problem {
  if (hard === 3) {
    // (c√a)/(d√b), full rationalization with coefficient reduction
    const c = randInt(rng, 2, 6);
    const d = randInt(rng, 1, 4);
    const a = pick(rng, [2, 3, 5, 6, 7, 10]);
    const b = pick(rng, [2, 3, 5, 6, 7, 10]);
    const [s, k] = rootSplit(a * b, 2);
    let numCoef = c * s;
    let den = d * b;
    const g = gcd(numCoef, den);
    numCoef /= g;
    den /= g;
    const answer = den === 1 ? radicalLatex(numCoef, k, 2) : `${radicalLatex(numCoef, k, 2)}/${den}`;
    return {
      type: "A2.9",
      subtype: "RadicalDivide",
      given: { expression: `${c}\\sqrt{${a}} / ${d === 1 ? "" : d}\\sqrt{${b}}` },
      find: "quotient with a rationalized denominator, in simplified form",
      answer,
      steps: [
        {
          instruction: `Multiply numerator and denominator by \\sqrt{${b}} so the denominator becomes ${d === 1 ? "" : `${d} · `}${b} = ${d * b}:`,
          reason: "Rationalizing the denominator",
          blanks: [{ label: "new denominator", answer: `${d * b}` }],
        },
        {
          instruction: `The numerator becomes ${c}\\sqrt{${a} · ${b}} = ${c}\\sqrt{${a * b}}; simplify the radical and reduce the coefficient fraction:`,
          reason: "Simplify and reduce",
          blanks: [{ label: "quotient", answer }],
        },
      ],
      verify: { kind: "coefQuotient", a, b, c, d, index: 2 },
    };
  }
  // √a/√b or n/√b
  const monomial = rng() < 0.5;
  if (monomial) {
    const num = randInt(rng, 2, 9);
    const b = pick(rng, [2, 3, 5, 6, 7, 8, 10]);
    const [s, k] = rootSplit(b, 2);
    // num/√b = num·√b / b -> simplify √b part: num·s√k / b, reduce by gcd(num·s, b)
    let numCoef = num * s;
    let den = b;
    const g = gcd(numCoef, den);
    numCoef /= g;
    den /= g;
    const answer = den === 1 ? radicalLatex(numCoef, k, 2) : `${radicalLatex(numCoef, k, 2)}/${den}`;
    return {
      type: "A2.9",
      subtype: "RadicalDivide",
      given: { expression: `${num}/\\sqrt{${b}}` },
      find: "quotient with a rationalized denominator, in simplified form",
      answer,
      steps: [
        {
          instruction: `Multiply numerator and denominator by \\sqrt{${b}}; the denominator becomes \\sqrt{${b}} · \\sqrt{${b}} = ${b}:`,
          reason: "Rationalizing the denominator",
          blanks: [{ label: "new denominator", answer: `${b}` }],
        },
        {
          instruction: "Simplify the radical in the numerator and reduce:",
          reason: "Simplify and reduce",
          blanks: [{ label: "quotient", answer }],
        },
      ],
      verify: { kind: "monomial", a: 1, b, c: num, d: 1, index: 2 },
    };
  }
  let bp = randInt(rng, 2, 9); // reduced denominator
  let ap = randInt(rng, 1, 12); // reduced numerator radicand
  const gRed = gcd(ap, bp);
  ap /= gRed;
  bp /= gRed;
  const g0 = pick(rng, [1, 1, 2, 3]);
  const a = ap * g0;
  const b = bp * g0;
  // Simplify √(ap/bp) properly: root the numerator and denominator separately,
  // then rationalize whatever radical remains in the denominator.
  const [s1, k1] = rootSplit(ap, 2);
  const [s2, k2] = rootSplit(bp, 2);
  let answer: string;
  let rationalizeNote: string;
  if (k1 === k2) {
    // radicals cancel: rational value s1/s2
    const [rn, rd] = reduceFrac(s1, s2);
    answer = rd === 1 ? `${rn}` : `${rn}/${rd}`;
    rationalizeNote = `the radicals are the same and cancel, leaving the rational number ${answer}`;
  } else {
    const [s3, k3] = rootSplit(k1 * k2, 2);
    let numCoef = s1 * s3;
    let den = s2 * k2;
    const g = gcd(numCoef, den);
    numCoef /= g;
    den /= g;
    answer = den === 1 ? radicalLatex(numCoef, k3, 2) : `${radicalLatex(numCoef, k3, 2)}/${den}`;
    rationalizeNote =
      k2 === 1
        ? `the denominator's root is exact (\\sqrt{${bp}} = ${s2}), so only the fraction needs reducing`
        : `multiply numerator and denominator by \\sqrt{${k2}} to clear the denominator's radical, then reduce`;
  }
  return {
    type: "A2.9",
    subtype: "RadicalDivide",
    given: { expression: `\\sqrt{${a}}/\\sqrt{${b}}` },
    find: "quotient with a rationalized denominator, in simplified form",
    answer,
    steps: [
      {
        instruction: `Combine into one radical and reduce inside: \\sqrt{${a}/${b}} = \\sqrt{${ap}/${bp}}:`,
        reason: "Quotient property of radicals",
        blanks: [{ label: "reduced radicand", answer: `${ap}/${bp}` }],
      },
      {
        instruction: `Take the root of the numerator and denominator separately, \\sqrt{${ap}}/\\sqrt{${bp}} = ${radicalLatex(s1, k1, 2)}/${radicalLatex(s2, k2, 2)}; then ${rationalizeNote}:`,
        reason: "Rationalizing the denominator",
        blanks: [{ label: "quotient", answer }],
      },
    ],
    verify: { kind: "quotient", a, b, c: 1, d: 1, index: 2 },
  };
}

// ── 9-3 Binomial radicals ─────────────────────────────────────────────────────

function makeBinomialRadicals(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  const m = pick(rng, [2, 3, 5, 6, 7]);
  if (hard === 1) {
    // add / subtract like-radical binomials; one radicand may need simplifying
    const a1 = randInt(rng, 1, 8);
    const b1 = randInt(rng, 1, 5);
    const a2 = randInt(rng, 1, 8);
    const b2 = randInt(rng, 1, 4);
    const subtract = rng() < 0.5;
    const simplifySecond = rng() < 0.5;
    const s2 = simplifySecond ? randInt(rng, 2, 3) : 1;
    const secondRadicand = s2 * s2 * m;
    const effB2 = b2 * s2;
    const rat = subtract ? a1 - a2 : a1 + a2;
    const coef = subtract ? b1 - effB2 : b1 + effB2;
    const answer = binomAnswer(rat, coef, m);
    const expr =
      `(${binomialLatex(a1, b1, m, 1)}) ${subtract ? "-" : "+"} ` +
      `(${binomialLatex(a2, b2, secondRadicand, 1)})`;
    return {
      type: "A2.9",
      subtype: "BinomialRadicals",
      given: { expression: expr },
      find: subtract ? "difference, in simplified form" : "sum, in simplified form",
      answer,
      steps: [
        ...(simplifySecond
          ? [
              {
                instruction: `First simplify \\sqrt{${secondRadicand}} = ${s2}\\sqrt{${m}} so both binomials use like radicals:`,
                reason: "Simplify radicals before combining",
                blanks: [{ label: "simplified term", answer: `${effB2}\\sqrt{${m}}` }],
              } as ProblemStep,
            ]
          : []),
        {
          instruction: "Combine the rational parts and the radical parts separately (like radicals combine like like terms):",
          reason: "Combine like terms and like radicals",
          blanks: [{ label: "result", answer }],
        },
      ],
      verify: {
        kind: "addSub",
        a: a1,
        b: b1,
        m,
        c: a2,
        d: effB2,
        op: subtract ? "sub" : "add",
        secondRadicand,
      },
    };
  }
  const conjugate = hard === 3 ? rng() < 0.5 : rng() < 0.35;
  const a = randInt(rng, 2, 7);
  const b = randInt(rng, 1, 4);
  if (conjugate) {
    const value = a * a - b * b * m;
    if (value === 0) return makeBinomialRadicals(rng, hard);
    const answer = `${value}`;
    return {
      type: "A2.9",
      subtype: "BinomialRadicals",
      given: { expression: `(${binomialLatex(a, b, m, 1)})(${binomialLatex(a, b, m, -1)})` },
      find: "product (the factors are conjugates)",
      answer,
      steps: [
        {
          instruction: "The factors are conjugates, so the middle terms cancel: (u + v)(u - v) = u^2 - v^2:",
          reason: "Conjugate product: difference of squares",
          blanks: [
            { label: "u^2", answer: `${a * a}` },
            { label: "v^2", answer: `${b * b * m}` },
          ],
        },
        {
          instruction: "Subtract; the result is a rational number (this is why conjugates rationalize denominators):",
          reason: "Difference of squares",
          blanks: [{ label: "product", answer }],
        },
      ],
      verify: { kind: "conjugate", a, b, m, c: a, d: -b },
    };
  }
  // multiply two same-radicand binomials
  const c = randInt(rng, 1, 7);
  const d = randInt(rng, 1, 4);
  const sign2: 1 | -1 = rng() < 0.5 ? 1 : -1;
  const rat = a * c + b * (sign2 * d) * m;
  const coef = a * (sign2 * d) + b * c;
  const answer = binomAnswer(rat, coef, m);
  return {
    type: "A2.9",
    subtype: "BinomialRadicals",
    given: { expression: `(${binomialLatex(a, b, m, 1)})(${binomialLatex(c, d, m, sign2)})` },
    find: "product, in simplified form",
    answer,
    steps: [
      {
        instruction: "Use FOIL; the two radical terms are like radicals and the product of the last terms is rational (√m · √m = m):",
        reason: "FOIL with radical terms",
        blanks: [
          { label: "rational part", answer: `${rat}` },
          { label: "radical coefficient", answer: `${coef}` },
        ],
      },
      {
        instruction: "Combine into a single binomial radical expression:",
        reason: "Combine like terms and like radicals",
        blanks: [{ label: "product", answer }],
      },
    ],
    verify: { kind: "multiply", a, b, m, c, d: sign2 * d },
  };
}

// ── 9-3 Rationalize a binomial denominator ────────────────────────────────────

function makeRationalizeBinomial(rng: RNG, hard: 2 | 3): Algebra2Problem {
  const m = pick(rng, [2, 3, 5, 6, 7]);
  let a = randInt(rng, 1, 6);
  let b = randInt(rng, 1, 3);
  let den = a * a - b * b * m;
  let guard = 0;
  while ((den === 0 || Math.abs(den) > 14) && guard++ < 60) {
    a = randInt(rng, 1, 6);
    b = randInt(rng, 1, 3);
    den = a * a - b * b * m;
  }
  if (den === 0) {
    // deterministic fallback with m = 2: 3^2 - 1^2·2 = 7
    a = 3;
    b = 1;
    den = 9 - m;
  }
  const sign: 1 | -1 = rng() < 0.5 ? 1 : -1;
  const num = hard === 3 ? pick(rng, [2, 3, 4, 6]) : 1;
  // num/(a + sign·b√m) × conjugate (a - sign·b√m) = num·(a - sign·b√m) / (a² - b²m)
  let numRat = num * a;
  let numCoef = -sign * num * b;
  let denN = den;
  if (denN < 0) {
    denN = -denN;
    numRat = -numRat;
    numCoef = -numCoef;
  }
  const g = gcd(gcd(Math.abs(numRat), Math.abs(numCoef)), denN);
  numRat /= g;
  numCoef /= g;
  denN /= g;
  const numStr = binomAnswer(numRat, numCoef, m);
  const answer = denN === 1 ? numStr : `(${numStr})/${denN}`;
  const conjStr = binomialLatex(a, b, m, sign === 1 ? -1 : 1);
  const denStr = binomialLatex(a, b, m, sign);
  return {
    type: "A2.9",
    subtype: "RationalizeBinomial",
    given: { expression: `${num}/(${denStr})` },
    find: "equivalent expression with a rationalized denominator",
    answer,
    steps: [
      {
        instruction: `Multiply numerator and denominator by the conjugate of the denominator, ${conjStr}:`,
        reason: "Rationalizing with the conjugate",
        blanks: [{ label: "conjugate", answer: conjStr }],
      },
      {
        instruction: `The denominator becomes a difference of squares: ${a}^2 - (${b}\\sqrt{${m}})^2 = ${a * a} - ${b * b * m} = ${den}:`,
        reason: "Conjugate product is rational",
        blanks: [{ label: "new denominator", answer: `${den}` }],
      },
      {
        instruction: "Distribute the numerator and reduce if possible:",
        reason: "Simplify",
        blanks: [{ label: "result", answer }],
      },
    ],
    verify: { kind: "binomialDenominator", n: num, a, b, m, sign },
  };
}

// ── 9-4 Rational exponents ────────────────────────────────────────────────────

function expString(base: string, num: number, den: number): string {
  const [rn, rd] = reduceFrac(num, den);
  if (rd === 1) return rn === 1 ? base : `${base}^{${rn}}`;
  return `${base}^{${rn}/${rd}}`;
}

function makeRationalExponents(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  const kind =
    hard === 1
      ? pick(rng, ["toExponent", "toRadical"] as const)
      : hard === 2
        ? pick(rng, ["toExponent", "toRadical", "evaluate"] as const)
        : pick(rng, ["evaluate", "simplify", "simplify"] as const);
  const base = pick(rng, ["x", "y"]);

  if (kind === "toExponent") {
    const n = randInt(rng, 2, 4);
    let m = randInt(rng, 1, 6);
    if (m === n) m += 1;
    const answer = expString(base, m, n);
    const radicand = m === 1 ? base : `${base}^${m}`;
    return {
      type: "A2.9",
      subtype: "RationalExponents",
      given: { expression: radicalSign(radicand, n) },
      find: "the same expression using a rational exponent",
      answer,
      steps: [
        {
          instruction: `By definition, a rational exponent m/n means the nth root of the mth power; the index of the root becomes the denominator of the exponent:`,
          reason: "Definition of a rational exponent: a^(m/n) is the nth root of a^m",
          blanks: [{ label: "exponent", answer: fracToLatex(m, n) }],
        },
        {
          instruction: "Reduce the exponent fraction if possible:",
          reason: "Reduce the exponent",
          blanks: [{ label: "result", answer }],
        },
      ],
      verify: { kind: "toExponent", base, m, n },
    };
  }

  if (kind === "toRadical") {
    const n = randInt(rng, 2, 5);
    let m = randInt(rng, 1, n - 1);
    while (gcd(m, n) !== 1) m = randInt(rng, 1, n - 1);
    const answer = radicalSign(m === 1 ? base : `${base}^${m}`, n);
    return {
      type: "A2.9",
      subtype: "RationalExponents",
      given: { expression: `${base}^{${m}/${n}}` },
      find: "the same expression in radical form",
      answer,
      steps: [
        {
          instruction: "The denominator of the exponent is the index of the root; the numerator stays as the power inside:",
          reason: "Definition of a rational exponent: a^(m/n) is the nth root of a^m",
          blanks: [
            { label: "index", answer: `${n}` },
            { label: "radical form", answer },
          ],
        },
      ],
      verify: { kind: "toRadical", base, m, n },
    };
  }

  if (kind === "evaluate") {
    const r = randInt(rng, 2, 5);
    const n = randInt(rng, 2, 4);
    const m = randInt(rng, 1, 3);
    const bigBase = Math.pow(r, n);
    const negative = hard === 3 && rng() < 0.4;
    const value = Math.pow(r, m);
    const answer = negative ? `1/${value}` : `${value}`;
    const rootWord = n === 2 ? "square" : n === 3 ? "cube" : "fourth";
    return {
      type: "A2.9",
      subtype: "RationalExponents",
      given: { expression: `${bigBase}^{${negative ? "-" : ""}${m}/${n}}` },
      find: "exact value",
      answer,
      steps: [
        {
          instruction: `Read the exponent as root-then-power: ${bigBase} is a perfect ${n === 2 ? "square" : n === 3 ? "cube" : "fourth power"} (${bigBase} = ${r}^${n}), so its ${rootWord} root is ${r}:`,
          reason: "Rational exponent as root-then-power",
          blanks: [{ label: "root", answer: `${r}` }],
        },
        {
          instruction: negative
            ? `Raise the root to the power ${m}, then take the reciprocal (a negative exponent means 1 over the positive power):`
            : `Raise the root to the numerator power ${m}:`,
          reason: negative ? "Negative exponent: reciprocal" : "Root-then-power",
          blanks: [{ label: "value", answer }],
        },
      ],
      verify: { kind: "evaluate", base: bigBase, m: negative ? -m : m, n, root: r },
    };
  }

  // simplify: product / quotient / power of rational powers of one variable
  const form = pick(rng, ["product", "power", "quotient"] as const);
  if (form === "product") {
    const a1 = randInt(rng, 1, 3);
    const b1 = pick(rng, [2, 3, 4, 6]);
    const a2 = randInt(rng, 1, 3);
    const b2 = pick(rng, [2, 3, 4, 6]);
    const [sn, sd] = reduceFrac(a1 * b2 + a2 * b1, b1 * b2);
    const answer = expString(base, sn, sd);
    return {
      type: "A2.9",
      subtype: "RationalExponents",
      given: { expression: `${base}^{${a1}/${b1}} \\cdot ${base}^{${a2}/${b2}}` },
      find: "simplified form (positive exponents)",
      answer,
      steps: [
        {
          instruction: "Same base: add the exponents (product of powers):",
          reason: "Product of powers property",
          blanks: [{ label: "sum of exponents", answer: fracToLatex(sn, sd) }],
        },
        {
          instruction: "Write the result as a single power:",
          reason: "Single power",
          blanks: [{ label: "result", answer }],
        },
      ],
      verify: { kind: "product", base, m: sn, n: sd },
    };
  }
  if (form === "power") {
    const a1 = randInt(rng, 1, 3);
    const b1 = pick(rng, [2, 3, 4]);
    const k = randInt(rng, 2, 3);
    const [sn, sd] = reduceFrac(a1 * k, b1);
    const answer = expString(base, sn, sd);
    return {
      type: "A2.9",
      subtype: "RationalExponents",
      given: { expression: `(${base}^{${a1}/${b1}})^{${k}}` },
      find: "simplified form (positive exponents)",
      answer,
      steps: [
        {
          instruction: "Multiply the exponents (power of a power):",
          reason: "Power of a power property",
          blanks: [{ label: "new exponent", answer: fracToLatex(sn, sd) }],
        },
        {
          instruction: "Write the result as a single power:",
          reason: "Single power",
          blanks: [{ label: "result", answer }],
        },
      ],
      verify: { kind: "power", base, m: sn, n: sd },
    };
  }
  // quotient, possibly landing on a negative exponent
  const a1 = randInt(rng, 1, 4);
  const b1 = pick(rng, [2, 3, 4, 6]);
  const a2 = randInt(rng, 1, 4);
  const b2 = pick(rng, [2, 3, 4, 6]);
  const [sn, sd] = reduceFrac(a1 * b2 - a2 * b1, b1 * b2);
  const answer =
    sn === 0 ? "1" : sn < 0 ? `1/${expString(base, -sn, sd)}` : expString(base, sn, sd);
  return {
    type: "A2.9",
    subtype: "RationalExponents",
    given: { expression: `${base}^{${a1}/${b1}} / ${base}^{${a2}/${b2}}` },
    find: "simplified form (positive exponents)",
    answer,
    steps: [
      {
        instruction: "Same base: subtract the exponents (quotient of powers):",
        reason: "Quotient of powers property",
        blanks: [{ label: "difference of exponents", answer: fracToLatex(sn, sd) }],
      },
      {
        instruction:
          sn < 0
            ? "A negative exponent is written as the reciprocal with a positive exponent:"
            : "Write the result as a single power:",
        reason: sn < 0 ? "Negative exponent: reciprocal" : "Single power",
        blanks: [{ label: "result", answer }],
      },
    ],
    verify: { kind: "quotient", base, m: sn, n: sd },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makeSimplifyNumeric(rng, 2) },
  { minDifficulty: 1, make: (rng) => makeRationalExponents(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeSimplifyNumeric(rng, 3) },
  { minDifficulty: 2, make: makeSimplifyCoefficient },
  { minDifficulty: 2, make: (rng) => makeRadicalMultiply(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeRadicalMultiply(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeRadicalDivide(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeBinomialRadicals(rng, 1) },
  { minDifficulty: 2, make: (rng) => makeRationalizeBinomial(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeRationalExponents(rng, 2) },
  { minDifficulty: 3, make: (rng) => makeSimplifyNumeric(rng, 4) },
  { minDifficulty: 3, make: makeSimplifyVariables },
  { minDifficulty: 3, make: (rng) => makeRadicalMultiply(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeRadicalDivide(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeBinomialRadicals(rng, 2) },
  { minDifficulty: 3, make: (rng) => makeBinomialRadicals(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeRationalizeBinomial(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeRationalExponents(rng, 3) },
];

/** Generate n A2.9 (T9 radical expressions & rational exponents) problems at
 *  the given cumulative difficulty tier. `only` optionally restricts to the
 *  named subtypes (lesson wiring). */
export function generateRadicalExpressionProblems(
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

export const RADICAL_EXPRESSION_MAKERS = MAKERS;

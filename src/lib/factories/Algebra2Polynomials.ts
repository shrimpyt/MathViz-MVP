// Algebra2Polynomials.ts
// A2.8 — Polynomial attributes (8-1), polynomial arithmetic (8-3), and the
// Fundamental Theorem of Algebra (8-7). Attributes are read straight from the
// generated coefficients; arithmetic answers come from the shared polynomial
// operations; FTA problems are built from chosen zeros/factors so counts are
// exact by construction. Pure, seeded, cumulative difficulty 1|2|3.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProblemStep } from "../types";
import type { Algebra2Problem } from "./Algebra2Types";
import {
  randSigned,
  randNonZero,
  polyAdd,
  polyMul,
  polyToLatex,
  selectMakers,
} from "./Algebra2Helpers";

export type PolynomialSubtype =
  | "PolyAttributes"
  | "PolyAttributesEndBehavior"
  | "PolyAttributesFactored"
  | "PolyAddSub"
  | "PolyMultiply"
  | "FTACountZeros"
  | "FTAWritePoly";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

function polySub(a: number[], b: number[]): number[] {
  return polyAdd(a, b.map((c) => -c));
}

/** End behavior of a polynomial from degree parity + leading-coefficient sign. */
function endBehavior(degree: number, lead: number): { left: string; right: string } {
  const right = lead > 0 ? "∞" : "-∞";
  const left = degree % 2 === 0 ? right : lead > 0 ? "-∞" : "∞";
  return { left, right };
}

function endBehaviorText(degree: number, lead: number): string {
  const { left, right } = endBehavior(degree, lead);
  return `as x → -∞, f(x) → ${left}; as x → ∞, f(x) → ${right}`;
}

// ── 8-1 Attributes from an equation ───────────────────────────────────────────

function makePolyAttributes(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  const degree = hard === 1 ? randInt(rng, 2, 3) : hard === 2 ? randInt(rng, 3, 4) : randInt(rng, 4, 5);
  const lead = hard === 1 ? randNonZero(rng, -3, 3) : randSigned(rng, hard === 2 ? 5 : 6);
  const poly: number[] = [lead];
  for (let i = 1; i < degree; i++) poly.push(randInt(rng, -6, 6));
  poly.push(randInt(rng, -8, 8));
  const eb = endBehaviorText(degree, lead);
  const answer =
    `degree ${degree}; leading coefficient ${lead}; ${eb}; ` +
    `at most ${degree - 1} turning points`;
  const steps: ProblemStep[] = [
    {
      instruction:
        "The degree is the greatest exponent of the variable; the leading coefficient is the coefficient of that term:",
      reason: "Degree and leading coefficient",
      blanks: [
        { label: "degree", answer: `${degree}` },
        { label: "leading coefficient", answer: `${lead}` },
      ],
    },
    {
      instruction: `A ${degree % 2 === 0 ? "even" : "odd"}-degree polynomial with a ` +
        `${lead > 0 ? "positive" : "negative"} leading coefficient has end behavior:`,
      reason: "End behavior from degree parity and leading-coefficient sign",
      blanks: [{ label: "end behavior", answer: eb }],
    },
    {
      instruction: "The graph of a degree-n polynomial turns at most n - 1 times:",
      reason: "Turning points: at most degree - 1",
      blanks: [{ label: "maximum turning points", answer: `${degree - 1}` }],
    },
  ];
  return {
    type: "A2.8",
    subtype: "PolyAttributes",
    given: { function: `f(x) = ${polyToLatex(poly)}` },
    find: "degree, leading coefficient, end behavior, and maximum number of turning points",
    answer,
    steps,
    verify: { poly, degree, lead },
  };
}

// ── 8-1 Attributes from a graph's end behavior (inverse) ─────────────────────

function makePolyAttributesEndBehavior(rng: RNG): Algebra2Problem {
  const combos: { left: string; right: string; parity: "even" | "odd"; sign: 1 | -1 }[] = [
    { left: "∞", right: "∞", parity: "even", sign: 1 },
    { left: "-∞", right: "-∞", parity: "even", sign: -1 },
    { left: "-∞", right: "∞", parity: "odd", sign: 1 },
    { left: "∞", right: "-∞", parity: "odd", sign: -1 },
  ];
  const combo = pick(rng, combos);
  const turning = randInt(rng, 0, 4);
  // Smallest degree with the required parity that can have `turning` turning points:
  // degree >= turning + 1 and turning ≡ degree - 1 (mod 2).
  let minDegree = turning + 1;
  if ((minDegree % 2 === 0) !== (combo.parity === "even")) minDegree += 1;
  const ebText = `as x → -∞, f(x) → ${combo.left}; as x → ∞, f(x) → ${combo.right}`;
  const answer =
    `${combo.parity} degree; ${combo.sign > 0 ? "positive" : "negative"} leading coefficient; ` +
    `minimum degree ${minDegree}`;
  return {
    type: "A2.8",
    subtype: "PolyAttributesEndBehavior",
    given: { graphEndBehavior: ebText, turningPoints: `${turning}` },
    find: "whether the degree is even or odd, the sign of the leading coefficient, and the minimum possible degree",
    answer,
    steps: [
      {
        instruction:
          "The right end of the graph follows the leading term: the graph " +
          `${combo.right === "∞" ? "rises" : "falls"} to the right, so the leading coefficient is:`,
        reason: "Right end behavior gives the leading-coefficient sign",
        blanks: [{ label: "leading coefficient sign", answer: combo.sign > 0 ? "positive" : "negative" }],
      },
      {
        instruction:
          `The two ends go in ${combo.left === combo.right ? "the same" : "opposite"} directions, ` +
          "so the degree is:",
        reason: "Same ends: even degree; opposite ends: odd degree",
        blanks: [{ label: "degree parity", answer: combo.parity }],
      },
      {
        instruction:
          `A degree-n polynomial has at most n - 1 turning points, and the number of turning points ` +
          `has the same parity as n - 1. With ${turning} turning points, the smallest possible degree is:`,
        reason: "Turning points bound the degree from below",
        blanks: [{ label: "minimum degree", answer: `${minDegree}` }],
      },
    ],
    verify: { parity: combo.parity, leadSign: combo.sign, turning, minDegree },
  };
}

// ── 8-1 Attributes from factored form ────────────────────────────────────────

function factorString(r: number, m: number): string {
  const base = r === 0 ? "x" : r > 0 ? `(x - ${r})` : `(x + ${-r})`;
  return m === 1 ? base : `${base}^${m}`;
}

function makePolyAttributesFactored(rng: RNG): Algebra2Problem {
  const lead = pick(rng, [1, 1, -1, 2, -2, 3]);
  const nf = pick(rng, [2, 2, 3]);
  const roots: number[] = [];
  while (roots.length < nf) {
    const r = randInt(rng, -4, 4);
    if (!roots.includes(r)) roots.push(r);
  }
  const mults = roots.map(() => randInt(rng, 1, 3));
  const degree = mults.reduce((s, m) => s + m, 0);
  const aStr = lead === 1 ? "" : lead === -1 ? "-" : `${lead}`;
  const factored = `${aStr}${roots.map((r, i) => factorString(r, mults[i])).join("")}`;
  const eb = endBehaviorText(degree, lead);
  const pairs = roots
    .map((r, i) => [r, mults[i]] as [number, number])
    .sort((x, y) => x[0] - y[0]);
  const zerosStr = pairs.map(([r, m]) => `x = ${r} (multiplicity ${m})`).join(", ");
  const answer =
    `degree ${degree}; leading coefficient ${lead}; ${eb}; zeros: ${zerosStr}`;
  return {
    type: "A2.8",
    subtype: "PolyAttributesFactored",
    given: { function: `f(x) = ${factored}` },
    find: "degree, leading coefficient, end behavior, and the zeros with their multiplicities",
    answer,
    steps: [
      {
        instruction:
          "When the factors are multiplied out, the leading term is the product of the leading term " +
          "of every factor, so the degree is the sum of the exponents (multiplicities):",
        reason: "Degree from factored form",
        blanks: [{ label: "degree", answer: `${degree}` }],
      },
      {
        instruction: "The constant multiplier in front is the leading coefficient; use it with the degree:",
        reason: "Leading coefficient and end behavior",
        blanks: [
          { label: "leading coefficient", answer: `${lead}` },
          { label: "end behavior", answer: eb },
        ],
      },
      {
        instruction:
          "Each factor set to zero gives a zero; its exponent is the multiplicity " +
          "(the graph crosses the x-axis at odd multiplicity, touches at even multiplicity):",
        reason: "Zeros and multiplicity from factors",
        blanks: [{ label: "zeros", answer: zerosStr }],
      },
    ],
    verify: { degree, lead, roots, mults },
  };
}

// ── 8-3 Add / subtract ────────────────────────────────────────────────────────

function randomPoly(rng: RNG, degree: number, maxCoef: number, allowZeroInside = true): number[] {
  const p: number[] = [randNonZero(rng, -maxCoef, maxCoef)];
  for (let i = 1; i <= degree; i++) {
    let c = randInt(rng, -maxCoef, maxCoef);
    if (!allowZeroInside && c === 0) c = 1;
    p.push(c);
  }
  return p;
}

function makePolyAddSub(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  const subtract = hard === 1 ? rng() < 0.5 : rng() < 0.65;
  const degP = hard === 1 ? 2 : hard === 2 ? 3 : randInt(rng, 4, 5);
  const degQ = hard === 3 ? randInt(rng, 3, degP) : degP;
  const maxCoef = hard === 1 ? 5 : hard === 2 ? 7 : 9;
  const P = randomPoly(rng, degP, maxCoef);
  let Q = randomPoly(rng, degQ, maxCoef);
  if (hard === 2) {
    // one missing term in Q for place-value alignment practice
    const idx = randInt(rng, 1, degQ - 1);
    Q = [...Q];
    Q[idx] = 0;
  }
  const result = subtract ? polySub(P, Q) : polyAdd(P, Q);
  const answer = polyToLatex(result);
  const opWord = subtract ? "P(x) - Q(x)" : "P(x) + Q(x)";
  const steps: ProblemStep[] = subtract
    ? [
        {
          instruction:
            "Subtracting a polynomial means adding its opposite: change the sign of every term of Q(x):",
          reason: "Subtraction: distribute the negative sign",
          blanks: [{ label: "-Q(x)", answer: polyToLatex(Q.map((c) => -c)) }],
        },
        {
          instruction: "Now combine like terms (terms with the same degree):",
          reason: "Combine like terms",
          blanks: [{ label: "difference", answer }],
        },
      ]
    : [
        {
          instruction: "Align like terms (same degree) and add their coefficients:",
          reason: "Combine like terms",
          blanks: [{ label: "sum", answer }],
        },
      ];
  return {
    type: "A2.8",
    subtype: "PolyAddSub",
    given: { p: `P(x) = ${polyToLatex(P)}`, q: `Q(x) = ${polyToLatex(Q)}` },
    find: opWord,
    answer,
    steps,
    verify: { p: P, q: Q, op: subtract ? "sub" : "add", result },
  };
}

// ── 8-3 Multiply (incl. special products) ────────────────────────────────────

function makePolyMultiply(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  let f1: number[];
  let f2: number[];
  let find: string;
  let firstStep: ProblemStep;
  if (hard === 1) {
    // binomial × binomial
    f1 = [pick(rng, [1, 1, 2]), randSigned(rng, 6)];
    f2 = [1, randSigned(rng, 6)];
    find = "product, in standard form";
    firstStep = {
      instruction: "Use FOIL: multiply the First, Outer, Inner, and Last terms:",
      reason: "FOIL (distributive property)",
      blanks: [{ label: "expanded", answer: "" }], // filled below
    };
  } else if (hard === 2) {
    const form = pick(rng, ["binTimesTri", "diffSquares", "perfectSquare"] as const);
    if (form === "diffSquares") {
      const a = pick(rng, [1, 2, 3]);
      const b = randInt(rng, 2, 9);
      f1 = [a, b];
      f2 = [a, -b];
      find = "product, in standard form (special product)";
      firstStep = {
        instruction: "This is a difference of squares: (u + v)(u - v) = u^2 - v^2:",
        reason: "Difference of squares pattern",
        blanks: [{ label: "expanded", answer: "" }],
      };
    } else if (form === "perfectSquare") {
      const a = pick(rng, [1, 2]);
      const b = randSigned(rng, 8);
      f1 = [a, b];
      f2 = [a, b];
      find = "product, in standard form (special product)";
      firstStep = {
        instruction: "Square the binomial: (u + v)^2 = u^2 + 2uv + v^2:",
        reason: "Perfect square trinomial pattern",
        blanks: [{ label: "expanded", answer: "" }],
      };
    } else {
      f1 = [pick(rng, [1, 2]), randSigned(rng, 5)];
      f2 = [pick(rng, [1, 2]), randInt(rng, -5, 5), randSigned(rng, 6)];
      find = "product, in standard form";
      firstStep = {
        instruction: "Distribute each term of the binomial across the trinomial:",
        reason: "Distributive property",
        blanks: [{ label: "expanded", answer: "" }],
      };
    }
  } else {
    const form = pick(rng, ["triTimesTri", "binCube", "sumDiffCubesProduct"] as const);
    if (form === "binCube") {
      const b = randSigned(rng, 5);
      f1 = [1, b];
      f2 = polyMul(f1, f1);
      find = "product, in standard form (special product)";
      firstStep = {
        instruction: "Cube the binomial: (u + v)^3 = u^3 + 3u^2v + 3uv^2 + v^3:",
        reason: "Binomial cube pattern",
        blanks: [{ label: "expanded", answer: "" }],
      };
      const product = polyMul(f1, f2);
      const answer = polyToLatex(product);
      firstStep.blanks = [{ label: "expanded", answer }];
      return {
        type: "A2.8",
        subtype: "PolyMultiply",
        given: { factors: `(${polyToLatex(f1)})^3` },
        find,
        answer,
        steps: [
          firstStep,
          {
            instruction: "Write the result in standard form (descending powers):",
            reason: "Standard form",
            blanks: [{ label: "product", answer }],
          },
        ],
        verify: { f1, f2, product, form: "binCube" },
      };
    } else if (form === "sumDiffCubesProduct") {
      const b = randInt(rng, 2, 5);
      const isSum = rng() < 0.5;
      f1 = [1, isSum ? b : -b];
      f2 = [1, isSum ? -b : b, b * b];
      find = "product, in standard form (special product)";
      firstStep = {
        instruction: isSum
          ? "This matches the sum of cubes pattern: (u + v)(u^2 - uv + v^2) = u^3 + v^3:"
          : "This matches the difference of cubes pattern: (u - v)(u^2 + uv + v^2) = u^3 - v^3:",
        reason: isSum ? "Sum of cubes pattern" : "Difference of cubes pattern",
        blanks: [{ label: "expanded", answer: "" }],
      };
    } else {
      f1 = [1, randInt(rng, -4, 4), randSigned(rng, 5)];
      f2 = [1, randInt(rng, -4, 4), randSigned(rng, 5)];
      find = "product, in standard form";
      firstStep = {
        instruction: "Distribute each term of the first trinomial across the second, keeping columns of like degree aligned:",
        reason: "Distributive property",
        blanks: [{ label: "expanded", answer: "" }],
      };
    }
  }
  const product = polyMul(f1, f2);
  const answer = polyToLatex(product);
  firstStep.blanks = [{ label: "expanded", answer }];
  return {
    type: "A2.8",
    subtype: "PolyMultiply",
    given: { factors: `(${polyToLatex(f1)})(${polyToLatex(f2)})` },
    find,
    answer,
    steps: [
      firstStep,
      {
        instruction: "Combine like terms and write in standard form (descending powers):",
        reason: "Combine like terms; standard form",
        blanks: [{ label: "product", answer }],
      },
    ],
    verify: { f1, f2, product },
  };
}

// ── 8-7 Fundamental Theorem of Algebra: count zeros ──────────────────────────

function makeFTACountZeros(rng: RNG, hard: 1 | 2 | 3): Algebra2Problem {
  if (hard === 3) {
    // Factored form with an irreducible quadratic factor -> complex pair.
    const r1 = randNonZero(rng, -3, 3);
    const m1 = pick(rng, [1, 2]);
    const s = randInt(rng, 2, 4);
    const extra = rng() < 0.5 ? randNonZero(rng, -3, 3) : null;
    if (extra === r1) {
      // fold into multiplicity instead of a repeated factor
      return makeFTACountZerosSimple(rng, m1 + 2 + 1);
    }
    const degree = m1 + 2 + (extra !== null ? 1 : 0);
    const factored =
      `${factorString(r1, m1)}(x^2 + ${s * s})` + (extra !== null ? factorString(extra, 1) : "");
    const zerosList = [
      `x = ${r1}${m1 > 1 ? ` (multiplicity ${m1})` : ""}`,
      ...(extra !== null ? [`x = ${extra}`] : []),
      `x = ${s}i`,
      `x = -${s}i`,
    ];
    const answer = `${degree} zeros counting multiplicity: ${zerosList.join(", ")}`;
    return {
      type: "A2.8",
      subtype: "FTACountZeros",
      given: { function: `f(x) = ${factored}` },
      find: "number of zeros counting multiplicity, and the zeros themselves",
      answer,
      steps: [
        {
          instruction:
            "Add the degrees of the factors (the quadratic factor has degree 2): the total degree is:",
          reason: "Degree from factored form",
          blanks: [{ label: "degree", answer: `${degree}` }],
        },
        {
          instruction:
            "By the Fundamental Theorem of Algebra, a degree-n polynomial has exactly n complex zeros, " +
            "counting multiplicity — the theorem counts complex zeros; it does not promise rational or real zeros:",
          reason: "Fundamental Theorem of Algebra",
          blanks: [{ label: "number of zeros", answer: `${degree}` }],
        },
        {
          instruction: `The factor x^2 + ${s * s} has no real zeros; solving x^2 + ${s * s} = 0 gives a complex-conjugate pair:`,
          reason: "Irreducible quadratic factor: complex-conjugate pair",
          blanks: [{ label: "complex zeros", answer: `x = ${s}i, x = -${s}i` }],
        },
      ],
      verify: { kind: "complexPair", degree, total: degree, realRoot: r1, mult: m1, imag: s },
    };
  }
  if (hard === 2) {
    // Factored form with multiplicities: total vs distinct.
    const nf = pick(rng, [2, 3]);
    const roots: number[] = [];
    while (roots.length < nf) {
      const r = randInt(rng, -4, 4);
      if (!roots.includes(r)) roots.push(r);
    }
    const mults = roots.map(() => randInt(rng, 1, 3));
    const total = mults.reduce((s2, m) => s2 + m, 0);
    const factored = roots.map((r, i) => factorString(r, mults[i])).join("");
    const answer = `${total} zeros counting multiplicity; ${nf} distinct zeros`;
    return {
      type: "A2.8",
      subtype: "FTACountZeros",
      given: { function: `f(x) = ${factored}` },
      find: "number of zeros counting multiplicity, and the number of distinct zeros",
      answer,
      steps: [
        {
          instruction: "The degree is the sum of the multiplicities of the factors:",
          reason: "Degree from factored form",
          blanks: [{ label: "degree", answer: `${total}` }],
        },
        {
          instruction:
            "By the Fundamental Theorem of Algebra, a degree-n polynomial has exactly n complex zeros, " +
            "counting multiplicity (zeros may be irrational or nonreal — the theorem never promises rational zeros):",
          reason: "Fundamental Theorem of Algebra",
          blanks: [{ label: "zeros counting multiplicity", answer: `${total}` }],
        },
        {
          instruction: "Count each different zero only once for the number of distinct zeros:",
          reason: "Distinct zeros vs multiplicity",
          blanks: [{ label: "distinct zeros", answer: `${nf}` }],
        },
      ],
      verify: { kind: "factored", degree: total, total, distinct: nf, roots, mults },
    };
  }
  return makeFTACountZerosSimple(rng, randInt(rng, 3, 4));
}

function makeFTACountZerosSimple(rng: RNG, degree: number): Algebra2Problem {
  const poly = randomPoly(rng, degree, 5);
  const answer = `exactly ${degree} complex zeros, counting multiplicity`;
  return {
    type: "A2.8",
    subtype: "FTACountZeros",
    given: { function: `f(x) = ${polyToLatex(poly)}` },
    find: "number of zeros, counting multiplicity",
    answer,
    steps: [
      {
        instruction: "The degree is the greatest exponent of the variable:",
        reason: "Degree of a polynomial",
        blanks: [{ label: "degree", answer: `${degree}` }],
      },
      {
        instruction:
          "By the Fundamental Theorem of Algebra, every polynomial of degree n has exactly n zeros " +
          "in the complex numbers, counting multiplicity:",
        reason: "Fundamental Theorem of Algebra",
        blanks: [{ label: "number of zeros", answer: `${degree}` }],
      },
      {
        instruction:
          "The theorem guarantees the count only: the zeros may be real or nonreal, rational or irrational:",
        reason: "FTA counts complex zeros — no promise of rational roots",
        blanks: [{ label: "kind of zeros guaranteed", answer: "complex" }],
      },
    ],
    verify: { kind: "expanded", degree, total: degree, poly },
  };
}

// ── 8-7 Fundamental Theorem of Algebra: write a polynomial from its zeros ────

function makeFTAWritePoly(rng: RNG, hard: 2 | 3): Algebra2Problem {
  const lead = hard === 3 ? pick(rng, [1, 1, 2, -1]) : 1;
  const aStr = lead === 1 ? "" : lead === -1 ? "-" : `${lead}`;
  const withComplex = hard === 3 && rng() < 0.5;
  if (withComplex) {
    const r = randNonZero(rng, -3, 3);
    const s = randInt(rng, 2, 3);
    const factored = `${aStr}${factorString(r, 1)}(x^2 + ${s * s})`;
    const answer = `f(x) = ${factored}`;
    return {
      type: "A2.8",
      subtype: "FTAWritePoly",
      given: { zeros: `x = ${r}, x = ${s}i, x = -${s}i`, leadingCoefficient: `${lead}` },
      find: "a polynomial of least degree with the given zeros (factored form)",
      answer,
      steps: [
        {
          instruction: "Each zero r gives a factor (x - r) by the factor theorem:",
          reason: "Factor theorem",
          blanks: [{ label: "real factor", answer: factorString(r, 1) }],
        },
        {
          instruction:
            `The complex zeros ${s}i and -${s}i are conjugates; their factors multiply to a real quadratic, x^2 + ${s * s}:`,
          reason: "Complex zeros come in conjugate pairs",
          blanks: [{ label: "quadratic factor", answer: `(x^2 + ${s * s})` }],
        },
        {
          instruction: "Multiply the factors and attach the leading coefficient:",
          reason: "Build the polynomial from its zeros",
          blanks: [{ label: "polynomial", answer }],
        },
      ],
      verify: { kind: "complexPair", lead, roots: [r], mults: [1], imag: s },
    };
  }
  const nf = pick(rng, [2, 3]);
  const roots: number[] = [];
  while (roots.length < nf) {
    const r = randInt(rng, -4, 4);
    if (!roots.includes(r)) roots.push(r);
  }
  const mults = roots.map(() => (hard === 3 ? randInt(rng, 1, 2) : 1));
  const factored = `${aStr}${roots.map((r, i) => factorString(r, mults[i])).join("")}`;
  const answer = `f(x) = ${factored}`;
  const zerosDesc = roots
    .map((r, i) => `x = ${r}${mults[i] > 1 ? ` (multiplicity ${mults[i]})` : ""}`)
    .join(", ");
  return {
    type: "A2.8",
    subtype: "FTAWritePoly",
    given: { zeros: zerosDesc, leadingCoefficient: `${lead}` },
    find: "a polynomial of least degree with the given zeros (factored form)",
    answer,
    steps: [
      {
        instruction: "Each zero r gives a factor (x - r) by the factor theorem:",
        reason: "Factor theorem",
        blanks: [{ label: "factors", answer: roots.map((r, i) => factorString(r, mults[i])).join("") }],
      },
      {
        instruction:
          "A zero of multiplicity m appears as the factor (x - r)^m; attach the leading coefficient " +
          "and multiply:",
        reason: "Multiplicity becomes the factor's exponent",
        blanks: [{ label: "polynomial", answer }],
      },
      {
        instruction:
          "The degree equals the number of listed zeros counting multiplicity, as the Fundamental " +
          "Theorem of Algebra requires:",
        reason: "Fundamental Theorem of Algebra (count check)",
        blanks: [{ label: "degree", answer: `${mults.reduce((s2, m) => s2 + m, 0)}` }],
      },
    ],
    verify: { kind: "real", lead, roots, mults, imag: 0 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  { minDifficulty: 1, make: (rng) => makePolyAttributes(rng, 1) },
  { minDifficulty: 1, make: (rng) => makePolyAddSub(rng, 1) },
  { minDifficulty: 1, make: (rng) => makePolyMultiply(rng, 1) },
  { minDifficulty: 1, make: (rng) => makeFTACountZeros(rng, 1) },
  { minDifficulty: 2, make: (rng) => makePolyAttributes(rng, 2) },
  { minDifficulty: 2, make: makePolyAttributesEndBehavior },
  { minDifficulty: 2, make: (rng) => makePolyAddSub(rng, 2) },
  { minDifficulty: 2, make: (rng) => makePolyMultiply(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeFTACountZeros(rng, 2) },
  { minDifficulty: 2, make: (rng) => makeFTAWritePoly(rng, 2) },
  { minDifficulty: 3, make: (rng) => makePolyAttributes(rng, 3) },
  { minDifficulty: 3, make: makePolyAttributesFactored },
  { minDifficulty: 3, make: (rng) => makePolyAddSub(rng, 3) },
  { minDifficulty: 3, make: (rng) => makePolyMultiply(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeFTACountZeros(rng, 3) },
  { minDifficulty: 3, make: (rng) => makeFTAWritePoly(rng, 3) },
];

/** Generate n A2.8 (T8 polynomials: attributes, arithmetic, FTA) problems at
 *  the given cumulative difficulty tier. `only` optionally restricts to the
 *  named subtypes (lesson wiring). */
export function generatePolynomialProblems(
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

export const POLYNOMIAL_MAKERS = MAKERS;

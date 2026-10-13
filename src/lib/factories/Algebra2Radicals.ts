// Algebra2Radicals.ts
// A2.6, Topic 6: function operations & composition, inverse functions
// (one-to-one, horizontal line test, domain restriction), square root
// functions (attributes & transformations WITH domain/range restrictions),
// and radical equations (isolate → square → CHECK for extraneous roots).
// Pure seeded generation; answers are always computed from the generated
// givens, and every `verify` payload carries the machine-readable params.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { Algebra2Problem } from "./Algebra2Types";
import {
  randSigned,
  selectMakers,
  polyToLatex,
  polyAdd,
  polyMul,
  polyEval,
  polyNorm,
  fracToLatex,
  linearFactor,
  type Poly,
} from "./Algebra2Helpers";

export type RadicalSubtype =
  | "FuncEvalOps"
  | "FuncProduct"
  | "FuncCompose"
  | "FuncComposeEval"
  | "InversePoint"
  | "InverseLinear"
  | "InverseVerify"
  | "InverseQuadratic"
  | "SqrtAttributes"
  | "SqrtTransformWrite"
  | "SqrtInverseOfSqrt"
  | "SqrtRestrictInverse"
  | "SqrtSwapDomainRange"
  | "RadicalBasic"
  | "RadicalIsolate"
  | "RadicalLinear"
  | "RadicalExtraneous"
  | "RadicalTwoRadicals"
  | "RadicalNoSolution"
  // Lesson 6-7 (2A.4G: extraneous solutions focus)
  | "RadicalCandidateCheck"
  | "RadicalExtraneousSolve"
  | "RadicalExtraneousNoSolution";

interface Maker {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2Problem;
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** "x" / "x + 3" / "x - 3" for x + b. */
function xPlus(b: number, v = "x"): string {
  if (b === 0) return v;
  return b > 0 ? `${v} + ${b}` : `${v} - ${-b}`;
}

/** "" / " + 3" / " - 3" suffix for + k. */
function plusConst(k: number): string {
  if (k === 0) return "";
  return k > 0 ? ` + ${k}` : ` - ${-k}`;
}

/** Leading coefficient prefix for a fraction aNum/aDen: 1 → "", -1 → "-". */
function aPrefixFrac(aNum: number, aDen: number): string {
  if (aDen === 1) {
    if (aNum === 1) return "";
    if (aNum === -1) return "-";
    return `${aNum}`;
  }
  return fracToLatex(aNum, aDen);
}

/** Body of a√(x − h) + k (s = 1) or a√(h − x) + k (s = −1, needs h ≥ 1). */
function sqrtBody(aNum: number, aDen: number, h: number, k: number, s: 1 | -1): string {
  const rad = s === 1 ? xPlus(-h) : `${h} - x`;
  return `${aPrefixFrac(aNum, aDen)}\\sqrt{${rad}}${plusConst(k)}`;
}

/** Body of (x − h)^2 + k in variable v. */
function quadVertexBody(h: number, k: number, v = "x"): string {
  const xPart = h === 0 ? `${v}^2` : h > 0 ? `(${v} - ${h})^2` : `(${v} + ${-h})^2`;
  return `${xPart}${plusConst(k)}`;
}

/** Polynomial composition p(q(x)) via Horner with polynomial arithmetic. */
function composePoly(p: Poly, q: Poly): Poly {
  let result: Poly = [0];
  for (const c of p) result = polyAdd(polyMul(result, q), [c]);
  return polyNorm(result);
}

/** f with g substituted: "a(g)^2 + b(g) + c" display string. */
function substStr(f: Poly, gInner: string): string {
  const q = polyNorm(f);
  const deg = q.length - 1;
  let out = "";
  q.forEach((c, i) => {
    if (c === 0) return;
    const p = deg - i;
    const abs = Math.abs(c);
    let body: string;
    if (p === 0) body = `${abs}`;
    else if (p === 1) body = `${abs === 1 ? "" : abs}(${gInner})`;
    else body = `${abs === 1 ? "" : abs}(${gInner})^${p}`;
    out = out === "" ? (c < 0 ? "-" : "") + body : out + (c < 0 ? ` - ${body}` : ` + ${body}`);
  });
  return out === "" ? "0" : out;
}

// ── 6-1: function operations ─────────────────────────────────────────────────

function makeFuncEvalOps(rng: RNG): Algebra2Problem {
  const f: Poly = [randSigned(rng, 4), randSigned(rng, 9)];
  const g: Poly =
    rng() < 0.5
      ? [randSigned(rng, 4), randSigned(rng, 9)]
      : [pick(rng, [1, -1, 2]), randSigned(rng, 5), randSigned(rng, 8)];
  const op = pick(rng, ["add", "sub", "mul"] as const);
  const opSym = op === "add" ? "+" : op === "sub" ? "-" : "·";
  const x0 = randInt(rng, -3, 3);
  const fVal = polyEval(f, x0);
  const gVal = polyEval(g, x0);
  const result = op === "add" ? fVal + gVal : op === "sub" ? fVal - gVal : fVal * gVal;
  return {
    type: "A2.6",
    subtype: "FuncEvalOps",
    given: { f: `f(x) = ${polyToLatex(f)}`, g: `g(x) = ${polyToLatex(g)}` },
    find: `(f ${opSym} g)(${x0})`,
    answer: `${result}`,
    steps: [
      {
        instruction: `Evaluate f at x = ${x0}:`,
        reason: "Function evaluation",
        blanks: [{ label: `f(${x0})`, answer: `${fVal}` }],
      },
      {
        instruction: `Evaluate g at x = ${x0}:`,
        reason: "Function evaluation",
        blanks: [{ label: `g(${x0})`, answer: `${gVal}` }],
      },
      {
        instruction: `(f ${opSym} g)(${x0}) means f(${x0}) ${opSym} g(${x0}), combine the two values:`,
        reason: "Operation on functions (pointwise)",
        blanks: [{ label: `(f ${opSym} g)(${x0})`, answer: `${result}` }],
      },
    ],
    verify: { fCoeffs: f, gCoeffs: g, op, x0, fVal, gVal, result },
  };
}

function makeFuncProduct(rng: RNG): Algebra2Problem {
  const f: Poly = [pick(rng, [1, 2, 3, -1, -2]), randSigned(rng, 6)];
  const g: Poly = [pick(rng, [1, 2, -1, -2]), randSigned(rng, 6)];
  const prod = polyMul(f, g);
  const answer = polyToLatex(prod);
  return {
    type: "A2.6",
    subtype: "FuncProduct",
    given: { f: `f(x) = ${polyToLatex(f)}`, g: `g(x) = ${polyToLatex(g)}` },
    find: "(f · g)(x), expanded in standard form",
    answer,
    steps: [
      {
        instruction: `(f · g)(x) = f(x) · g(x). Multiply the binomials with the distributive property (FOIL) and collect the coefficients:`,
        reason: "Distributive property (FOIL)",
        blanks: [
          { label: "x^2 coefficient", answer: `${prod[0]}` },
          { label: "x coefficient", answer: `${prod[1]}` },
          { label: "constant term", answer: `${prod[2]}` },
        ],
      },
      {
        instruction: "Write the product in standard form (descending powers of x):",
        reason: "Standard form",
        blanks: [{ label: "(f · g)(x)", answer }],
      },
    ],
    verify: { fCoeffs: f, gCoeffs: g, productCoeffs: prod },
  };
}

function makeFuncCompose(rng: RNG): Algebra2Problem {
  const g: Poly = [pick(rng, [1, 2, 3, -1, -2]), randSigned(rng, 6)];
  const f: Poly = [pick(rng, [1, -1, 2]), pick(rng, [0, 0, 2, -2, 3]), randSigned(rng, 8)];
  const composed = composePoly(f, g);
  const answer = polyToLatex(composed);
  const gStr = polyToLatex(g);
  return {
    type: "A2.6",
    subtype: "FuncCompose",
    given: { f: `f(x) = ${polyToLatex(f)}`, g: `g(x) = ${gStr}` },
    find: "(f∘g)(x), expanded in standard form",
    answer,
    steps: [
      {
        instruction: `(f∘g)(x) = f(g(x)): substitute g(x) = ${gStr} into every x of f:`,
        reason: "Definition of composition",
        blanks: [{ label: "substituted", answer: substStr(f, gStr) }],
      },
      {
        instruction: "Expand the powers and combine like terms:",
        reason: "Expand and simplify",
        blanks: [{ label: "(f∘g)(x)", answer }],
      },
    ],
    verify: { fCoeffs: f, gCoeffs: g, composedCoeffs: composed },
  };
}

function makeFuncComposeEval(rng: RNG): Algebra2Problem {
  const g: Poly = [pick(rng, [1, 2, -1, -2]), randSigned(rng, 5)];
  const f: Poly = [pick(rng, [1, -1, 2]), pick(rng, [0, 1, -2, 3]), randSigned(rng, 6)];
  const x0 = randInt(rng, -2, 3);
  const inner = polyEval(g, x0);
  const result = polyEval(f, inner);
  const contrast = polyEval(g, polyEval(f, x0));
  return {
    type: "A2.6",
    subtype: "FuncComposeEval",
    given: { f: `f(x) = ${polyToLatex(f)}`, g: `g(x) = ${polyToLatex(g)}` },
    find: `(f∘g)(${x0})`,
    answer: `${result}`,
    steps: [
      {
        instruction: `Work from the inside out: first evaluate the inner function g(${x0}):`,
        reason: "Composition evaluates inside-out",
        blanks: [{ label: `g(${x0})`, answer: `${inner}` }],
      },
      {
        instruction: `Now evaluate f at that result, f(${inner}):`,
        reason: "Function evaluation",
        blanks: [{ label: `(f∘g)(${x0})`, answer: `${result}` }],
      },
      {
        instruction: `Order matters: (g∘f)(${x0}) evaluates f first and gives a different value:`,
        reason: "Composition is not commutative",
        blanks: [{ label: `(g∘f)(${x0})`, answer: `${contrast}` }],
      },
    ],
    verify: { fCoeffs: f, gCoeffs: g, x0, inner, result, contrast },
  };
}

// ── 6-2: inverse functions ────────────────────────────────────────────────────

/** Display for (1/a)x + c/a-style linear functions from fraction coefficients. */
function fracLinearBody(xNum: number, xDen: number, cNum: number, cDen: number, v = "x"): string {
  const xc = fracToLatex(xNum, xDen);
  const xTerm = xc === "1" ? v : xc === "-1" ? `-${v}` : `${xc}${v}`;
  const cc = fracToLatex(cNum, cDen);
  if (cc === "0") return xTerm;
  return cc.startsWith("-") ? `${xTerm} - ${cc.slice(1)}` : `${xTerm} + ${cc}`;
}

function makeInversePoint(rng: RNG): Algebra2Problem {
  const a = randInt(rng, 2, 9);
  const b = randSigned(rng, 12);
  if (rng() < 0.5) {
    return {
      type: "A2.6",
      subtype: "InversePoint",
      given: { functionValue: `f(${a}) = ${b}` },
      find: `f^{-1}(${b})`,
      answer: `${a}`,
      steps: [
        {
          instruction: "An inverse function swaps inputs and outputs: if f sends a to b, then f^{-1} sends b back to a:",
          reason: "Definition of inverse (swap input/output)",
          blanks: [{ label: `f^{-1}(${b})`, answer: `${a}` }],
        },
      ],
      verify: { a, b, form: "value" },
    };
  }
  return {
    type: "A2.6",
    subtype: "InversePoint",
    given: { pointOnF: `(${a}, ${b})` },
    find: "corresponding point on the graph of f^{-1}",
    answer: `(${b}, ${a})`,
    steps: [
      {
        instruction: "The graph of f^{-1} is the graph of f reflected across the line y = x, so every point (x, y) becomes (y, x):",
        reason: "Inverse graphs swap coordinates",
        blanks: [{ label: "point on f^{-1}", answer: `(${b}, ${a})` }],
      },
    ],
    verify: { a, b, form: "point" },
  };
}

function makeInverseLinear(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3, 4, 5, -2, -3, -4]);
  const b = randSigned(rng, 9);
  const invBody = fracLinearBody(1, a, -b, a);
  const answer = `f^{-1}(x) = ${invBody}`;
  return {
    type: "A2.6",
    subtype: "InverseLinear",
    given: { function: `f(x) = ${polyToLatex([a, b])}` },
    find: "inverse function f^{-1}(x)",
    answer,
    steps: [
      {
        instruction: `Replace f(x) with y, then swap x and y:`,
        reason: "Swap x and y",
        blanks: [{ label: "swapped equation", answer: `x = ${polyToLatex([a, b], "y")}` }],
      },
      {
        instruction: `Solve the swapped equation for y (undo + ${b} and × ${a} in reverse order):`,
        reason: "Solve for y",
        blanks: [{ label: "inverse", answer }],
      },
      {
        instruction: "Check by composition: f(f^{-1}(x)) must simplify to x:",
        reason: "Verify with composition",
        blanks: [{ label: "f(f^{-1}(x))", answer: "x" }],
      },
    ],
    verify: { a, b },
  };
}

function makeInverseVerify(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3, 4, -2, -3]);
  const b = randSigned(rng, 8);
  const isInverse = rng() < 0.5;
  // True inverse: (1/a)x − b/a. Near-miss: (1/a)x + b/a (sign slip on b).
  const gBody = fracLinearBody(1, a, isInverse ? -b : b, a);
  const compResult = isInverse ? "x" : polyToLatex([1, 2 * b]);
  const answer = isInverse
    ? "Yes, f and g are inverses of each other"
    : `No: f(g(x)) = ${compResult}, not x, so f and g are not inverses`;
  const steps: Algebra2Problem["steps"] = [
    {
      instruction: "Compose f(g(x)): substitute g into f and simplify:",
      reason: "Composition test for inverses",
      blanks: [{ label: "f(g(x))", answer: compResult }],
    },
  ];
  if (isInverse) {
    steps.push({
      instruction: "Also compose g(f(x)): substitute f into g and simplify:",
      reason: "Both compositions must give x",
      blanks: [{ label: "g(f(x))", answer: "x" }],
    });
    steps.push({
      instruction: "Both compositions simplify to x, so each function undoes the other:",
      reason: "Definition of inverse functions",
      blanks: [{ label: "inverses?", answer: "Yes" }],
    });
  } else {
    steps.push({
      instruction: `f(g(x)) simplifies to ${compResult} instead of x, so g does not undo f:`,
      reason: "Inverses must compose to x",
      blanks: [{ label: "inverses?", answer: "No" }],
    });
  }
  return {
    type: "A2.6",
    subtype: "InverseVerify",
    given: { f: `f(x) = ${polyToLatex([a, b])}`, g: `g(x) = ${gBody}` },
    find: "inverse relationship of f and g",
    answer,
    steps,
    verify: { a, b, isInverse },
  };
}

function makeInverseQuadratic(rng: RNG): Algebra2Problem {
  const h = randInt(rng, -4, 5);
  const k = randInt(rng, -6, 6);
  const invBody = `\\sqrt{${xPlus(-k)}}${plusConst(h)}`;
  const answer = `f^{-1}(x) = ${invBody}; domain: x \\geq ${k}`;
  return {
    type: "A2.6",
    subtype: "InverseQuadratic",
    given: {
      function: `f(x) = ${quadVertexBody(h, k)}`,
      domain: `x \\geq ${h}`,
    },
    find: "inverse function and its domain",
    answer,
    steps: [
      {
        instruction: "The restriction x \\geq h keeps f one-to-one (it passes the horizontal line test), so an inverse exists. Swap x and y:",
        reason: "One-to-one functions have inverses",
        blanks: [{ label: "swapped equation", answer: `x = ${quadVertexBody(h, k, "y")}` }],
      },
      {
        instruction: "Isolate the square: subtract k from both sides:",
        reason: "Isolate the squared term",
        blanks: [{ label: "isolated", answer: `x${plusConst(-k)} = ${quadVertexBody(h, 0, "y")}` }],
      },
      {
        instruction: `Take the square root of both sides. Because the restriction gives y \\geq ${h}, choose the + root, then solve for y:`,
        reason: "Choose the branch matching the restriction",
        blanks: [{ label: "inverse", answer: `f^{-1}(x) = ${invBody}` }],
      },
      {
        instruction: "The domain of f^{-1} is the range of f. Since (x - h)^2 \\geq 0, f outputs values \\geq k:",
        reason: "Domain/range swap for inverses",
        blanks: [{ label: "domain of f^{-1}", answer: `x \\geq ${k}` }],
      },
    ],
    svgParams: { kind: "ConicGraph", parabolas: [{ h, k, a: 1 }] },
    verify: { h, k },
  };
}

// ── 6-3: square root attributes & transformations ────────────────────────────

function makeSqrtAttributes(rng: RNG, level: "basic" | "full"): Algebra2Problem {
  let a = 1;
  let s: 1 | -1 = 1;
  let h = randInt(rng, -4, 5);
  const k = randInt(rng, -4, 4);
  if (level === "basic") {
    a = pick(rng, [1, 1, 2]);
  } else {
    const variant = pick(rng, ["negA", "reflect", "both"] as const);
    if (variant === "negA") {
      a = pick(rng, [-1, -2]);
    } else if (variant === "reflect") {
      a = pick(rng, [1, 2]);
      s = -1;
      h = randInt(rng, 1, 5);
    } else {
      a = -1;
      s = -1;
      h = randInt(rng, 1, 5);
    }
  }
  const body = sqrtBody(a, 1, h, k, s);
  const domain = s === 1 ? `x \\geq ${h}` : `x \\leq ${h}`;
  const range = a > 0 ? `y \\geq ${k}` : `y \\leq ${k}`;
  const answer = `Domain: ${domain}; Range: ${range}; Endpoint: (${h}, ${k})`;
  const radicand = s === 1 ? xPlus(-h) : `${h} - x`;
  return {
    type: "A2.6",
    subtype: "SqrtAttributes",
    given: { function: `g(x) = ${body}` },
    find: "domain, range, and endpoint (starting point)",
    answer,
    steps: [
      {
        instruction: `The radicand must be \\geq 0 (no real square root of a negative). Solve ${radicand} \\geq 0:`,
        reason: "Domain from the radicand",
        blanks: [{ label: "domain", answer: domain }],
      },
      {
        instruction: `The principal square root is always \\geq 0. With a = ${a} ${a > 0 ? "> 0" : "< 0"}, the outputs of g start at k = ${k} and ${a > 0 ? "increase" : "decrease"} from there:`,
        reason: "Range from the square root's outputs",
        blanks: [{ label: "range", answer: range }],
      },
      {
        instruction: "The endpoint is where the radicand equals 0, the graph starts there:",
        reason: "Endpoint (starting point)",
        blanks: [{ label: "endpoint", answer: `(${h}, ${k})` }],
      },
    ],
    verify: { a, h, k, s },
  };
}

function makeSqrtTransformWrite(rng: RNG): Algebra2Problem {
  const [aNum, aDen] = pick(rng, [[1, 1], [2, 1], [3, 1], [1, 2], [-1, 1], [-2, 1]] as const);
  const h = randSigned(rng, 5);
  const k = randSigned(rng, 5);
  const parts: string[] = [];
  if (aNum < 0) parts.push("reflect over the x-axis");
  const absA = fracToLatex(Math.abs(aNum), aDen);
  if (Math.abs(aNum) > aDen) parts.push(`vertical stretch by a factor of ${absA}`);
  else if (Math.abs(aNum) < aDen) parts.push(`vertical shrink by a factor of ${absA}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  const body = sqrtBody(aNum, aDen, h, k, 1);
  const answer = `g(x) = ${body}`;
  const aStr = fracToLatex(aNum, aDen);
  return {
    type: "A2.6",
    subtype: "SqrtTransformWrite",
    given: { parent: "f(x) = \\sqrt{x}", description: parts.join("; ") },
    find: "equation of the transformed function g",
    answer,
    steps: [
      {
        instruction: "Use the form g(x) = a\\sqrt{x - h} + k. The reflection/stretch words give a:",
        reason: "Vertical transformations come from a",
        blanks: [{ label: "a", answer: aStr }],
      },
      {
        instruction: `The shifts give h and k (remember: x - h shifts RIGHT when h > 0):`,
        reason: "Shifts from h and k",
        blanks: [
          { label: "h", answer: `${h}` },
          { label: "k", answer: `${k}` },
        ],
      },
      {
        instruction: "Assemble g(x). The endpoint of the graph moves from (0, 0) to (h, k):",
        reason: "Transformed square root function",
        blanks: [{ label: "g(x)", answer }],
      },
    ],
    verify: { aNum, aDen, h, k },
  };
}

// ── 6-4: square roots as inverses of quadratics ──────────────────────────────

function makeSqrtInverseOfSqrt(rng: RNG): Algebra2Problem {
  const h = randInt(rng, -4, 5);
  const k = randInt(rng, -5, 5);
  const invBody = quadVertexBody(k, h);
  const answer = `g^{-1}(x) = ${invBody}; domain: x \\geq ${k}`;
  return {
    type: "A2.6",
    subtype: "SqrtInverseOfSqrt",
    given: { function: `g(x) = ${sqrtBody(1, 1, h, k, 1)}` },
    find: "inverse function and its domain",
    answer,
    steps: [
      {
        instruction: "Swap x and y:",
        reason: "Swap x and y",
        blanks: [{ label: "swapped equation", answer: `x = \\sqrt{${xPlus(-h, "y")}}${plusConst(k)}` }],
      },
      {
        instruction: `Isolate the radical (subtract ${k} from both sides), then square both sides:`,
        reason: "Isolate, then square",
        blanks: [{ label: "squared equation", answer: `${quadVertexBody(k, 0)} = ${xPlus(-h, "y")}` }],
      },
      {
        instruction: "Solve for y, the inverse of a square root function is a quadratic:",
        reason: "Inverse of square root is quadratic",
        blanks: [{ label: "inverse", answer: `g^{-1}(x) = ${invBody}` }],
      },
      {
        instruction: `The domain of the inverse is the range of g. Since g outputs values \\geq ${k}:`,
        reason: "Domain/range swap for inverses",
        blanks: [{ label: "domain of inverse", answer: `x \\geq ${k}` }],
      },
    ],
    verify: { h, k },
  };
}

function makeSqrtRestrictInverse(rng: RNG): Algebra2Problem {
  const h = randInt(rng, -4, 5);
  const k = randInt(rng, -6, 6);
  const invBody = `\\sqrt{${xPlus(-k)}}${plusConst(h)}`;
  const answer = `Restrict the domain to x \\geq ${h}; f^{-1}(x) = ${invBody}`;
  return {
    type: "A2.6",
    subtype: "SqrtRestrictInverse",
    given: { function: `f(x) = ${quadVertexBody(h, k)}` },
    find: "domain restriction that makes f one-to-one, and the inverse on that restriction",
    answer,
    steps: [
      {
        instruction: "As written, the parabola fails the horizontal line test, most outputs come from two different inputs:",
        reason: "Horizontal line test",
        blanks: [{ label: "one-to-one as written?", answer: "No" }],
      },
      {
        instruction: `Restrict the domain to the right branch of the parabola, starting at the vertex:`,
        reason: "Restrict to one branch",
        blanks: [{ label: "restriction", answer: `x \\geq ${h}` }],
      },
      {
        instruction: "Now swap x and y and solve, choosing the + square root so the inverse matches the restricted branch:",
        reason: "Inverse of the restricted quadratic",
        blanks: [{ label: "inverse", answer: `f^{-1}(x) = ${invBody}` }],
      },
    ],
    svgParams: { kind: "ConicGraph", parabolas: [{ h, k, a: 1 }] },
    verify: { h, k },
  };
}

function makeSqrtSwapDomainRange(rng: RNG): Algebra2Problem {
  const a = pick(rng, [1, 2, -1]);
  const h = randInt(rng, -3, 5);
  const k = randInt(rng, -4, 5);
  const origD = `x \\geq ${h}`;
  const origR = a > 0 ? `y \\geq ${k}` : `y \\leq ${k}`;
  const invD = a > 0 ? `x \\geq ${k}` : `x \\leq ${k}`;
  const invR = `y \\geq ${h}`;
  const answer = `Domain of f^{-1}: ${invD}; Range of f^{-1}: ${invR}`;
  return {
    type: "A2.6",
    subtype: "SqrtSwapDomainRange",
    given: {
      function: `f(x) = ${sqrtBody(a, 1, h, k, 1)}`,
      domainOfF: origD,
      rangeOfF: origR,
    },
    find: "domain and range of the inverse function f^{-1} (without finding f^{-1} itself)",
    answer,
    steps: [
      {
        instruction: "Inverses swap domain and range: the domain of f^{-1} is the range of f (rewrite it as a condition on x):",
        reason: "Domain/range swap for inverses",
        blanks: [{ label: "domain of f^{-1}", answer: invD }],
      },
      {
        instruction: "Likewise, the range of f^{-1} is the domain of f (rewrite it as a condition on y):",
        reason: "Domain/range swap for inverses",
        blanks: [{ label: "range of f^{-1}", answer: invR }],
      },
    ],
    verify: { a, h, k },
  };
}

// ── 6-5: intro to radical equations ──────────────────────────────────────────

function makeRadicalBasic(rng: RNG): Algebra2Problem {
  const c = randInt(rng, 2, 9);
  const b = randInt(rng, -8, Math.min(9, c * c - 1));
  const x = c * c - b;
  return {
    type: "A2.6",
    subtype: "RadicalBasic",
    given: { equation: `\\sqrt{${xPlus(b)}} = ${c}` },
    find: "x",
    answer: `x = ${x}`,
    steps: [
      {
        instruction: "Square both sides to remove the square root:",
        reason: "Squaring undoes the square root",
        blanks: [{ label: "squared equation", answer: `${xPlus(b)} = ${c * c}` }],
      },
      {
        instruction: "Solve for x:",
        reason: "Isolate x",
        blanks: [{ label: "solution", answer: `x = ${x}` }],
      },
      {
        instruction: `Check: substitute x = ${x} into the original equation, the radicand becomes ${x + b} and its square root must equal ${c}:`,
        reason: "Check the solution",
        blanks: [{ label: "check", answer: `\\sqrt{${x + b}} = ${c} ✓` }],
      },
    ],
    verify: { b, c, x },
  };
}

function makeRadicalIsolate(rng: RNG): Algebra2Problem {
  const form = pick(rng, ["add", "coef"] as const);
  if (form === "add") {
    const c = randInt(rng, 2, 8); // value of the isolated radical
    const d = randInt(rng, 1, 5);
    const e = c + d;
    const b = randInt(rng, -8, Math.min(9, c * c - 1));
    const x = c * c - b;
    return {
      type: "A2.6",
      subtype: "RadicalIsolate",
      given: { equation: `\\sqrt{${xPlus(b)}} + ${d} = ${e}` },
      find: "x",
      answer: `x = ${x}`,
      steps: [
        {
          instruction: `FIRST isolate the radical: subtract ${d} from both sides (squaring now would keep a radical in the result):`,
          reason: "Isolate the radical before squaring",
          blanks: [{ label: "isolated", answer: `\\sqrt{${xPlus(b)}} = ${c}` }],
        },
        {
          instruction: "Square both sides and solve:",
          reason: "Square, then solve",
          blanks: [{ label: "solution", answer: `x = ${x}` }],
        },
        {
          instruction: `Check in the ORIGINAL equation: \\sqrt{${x + b}} + ${d} must equal ${e}:`,
          reason: "Check the solution",
          blanks: [{ label: "check", answer: `${c} + ${d} = ${e} ✓` }],
        },
      ],
      verify: { form, b, isolated: c, x },
    };
  }
  const a = pick(rng, [2, 3]);
  const q = randInt(rng, 2, 6); // value of the isolated radical
  const e = a * q;
  const b = randInt(rng, -8, Math.min(9, q * q - 1));
  const x = q * q - b;
  return {
    type: "A2.6",
    subtype: "RadicalIsolate",
    given: { equation: `${a}\\sqrt{${xPlus(b)}} = ${e}` },
    find: "x",
    answer: `x = ${x}`,
    steps: [
      {
        instruction: `FIRST isolate the radical: divide both sides by ${a}:`,
        reason: "Isolate the radical before squaring",
        blanks: [{ label: "isolated", answer: `\\sqrt{${xPlus(b)}} = ${q}` }],
      },
      {
        instruction: "Square both sides and solve:",
        reason: "Square, then solve",
        blanks: [{ label: "solution", answer: `x = ${x}` }],
      },
      {
        instruction: `Check in the ORIGINAL equation: ${a} \\cdot \\sqrt{${x + b}} must equal ${e}:`,
        reason: "Check the solution",
        blanks: [{ label: "check", answer: `${a} \\cdot ${q} = ${e} ✓` }],
      },
    ],
    verify: { form, b, isolated: q, x },
  };
}

function makeRadicalLinear(rng: RNG): Algebra2Problem {
  const a = pick(rng, [2, 3, 4]);
  const x0 = randInt(rng, 3, 12);
  const squares = [25, 36, 49, 64, 81, 100].filter((S) => Math.abs(S - a * x0) <= 30);
  const S = pick(rng, squares);
  const b = S - a * x0;
  const c = Math.sqrt(S);
  const radicand = `${a}x${plusConst(b)}`;
  return {
    type: "A2.6",
    subtype: "RadicalLinear",
    given: { equation: `\\sqrt{${radicand}} = ${c}` },
    find: "x",
    answer: `x = ${x0}`,
    steps: [
      {
        instruction: "The radical is already isolated. Square both sides:",
        reason: "Squaring undoes the square root",
        blanks: [{ label: "squared equation", answer: `${radicand} = ${S}` }],
      },
      {
        instruction: "Solve the linear equation:",
        reason: "Isolate x",
        blanks: [{ label: "solution", answer: `x = ${x0}` }],
      },
      {
        instruction: `Check: at x = ${x0} the radicand is ${a}(${x0})${plusConst(b)} = ${S}, and \\sqrt{${S}} = ${c}:`,
        reason: "Check the solution",
        blanks: [{ label: "check", answer: "✓" }],
      },
    ],
    verify: { a, b, c, x: x0 },
  };
}

// ── 6-6: radical equations with extraneous roots ─────────────────────────────

function makeRadicalExtraneous(rng: RNG, hard: boolean): Algebra2Problem {
  const b = hard ? pick(rng, [3, 4]) : pick(rng, [2, 3]);
  // Roots of the squared quadratic sum to 2b + 1. Choose the extraneous root
  // r2 < b (it makes x − b negative, so it cannot satisfy the original
  // equation); the valid root is r = 2b + 1 − r2, and a = b² − r·r2 makes
  // √(x + a) = x − b hold exactly at x = r.
  const r2 = randInt(rng, 0, b - 1);
  const r = 2 * b + 1 - r2;
  const a = b * b - r * r2;
  const factored = `${linearFactor(r2)}${linearFactor(r)}`;
  const sqrtAtR2 = b - r2; // √(r2 + a) = |r2 − b| = b − r2
  return {
    type: "A2.6",
    subtype: "RadicalExtraneous",
    given: { equation: `\\sqrt{${xPlus(a)}} = x - ${b}` },
    find: "x, checking every candidate for extraneous solutions",
    answer: `x = ${r}`,
    steps: [
      {
        instruction: "Square both sides (this can introduce extraneous solutions, which is why the check at the end is mandatory):",
        reason: "Square both sides",
        blanks: [
          { label: "squared equation", answer: `${xPlus(a)} = ${polyToLatex([1, -2 * b, b * b])}` },
        ],
      },
      {
        instruction: "Move everything to one side and factor:",
        reason: "Factor the quadratic",
        blanks: [
          { label: "factored form", answer: `${factored} = 0` },
          { label: "candidates", answer: `x = ${r2} or x = ${r}` },
        ],
      },
      {
        instruction: `CHECK x = ${r2} in the ORIGINAL equation: the left side is \\sqrt{${r2 + a}} = ${sqrtAtR2}, but the right side is ${r2} - ${b} = ${r2 - b}. A square root can never equal a negative number:`,
        reason: "Reject the extraneous root",
        blanks: [{ label: `x = ${r2}`, answer: `${sqrtAtR2} \\neq ${r2 - b}, reject` }],
      },
      {
        instruction: `CHECK x = ${r}: the left side is \\sqrt{${r + a}} = ${r - b} and the right side is ${r} - ${b} = ${r - b}. It checks:`,
        reason: "Keep the valid root",
        blanks: [{ label: "solution", answer: `x = ${r}` }],
      },
    ],
    verify: { a, b, validRoot: r, extraneousRoot: r2 },
  };
}

function makeRadicalTwoRadicals(rng: RNG): Algebra2Problem {
  // √(x + a) = √(x + b) + d, built backwards from a solution x0 whose two
  // radicands are perfect squares p² and q² with p = q + d.
  const q = randInt(rng, 2, 5);
  const d = randInt(rng, 1, 3);
  const p = q + d;
  const x0 = randInt(rng, 6, 40);
  const a = p * p - x0;
  const b = q * q - x0;
  return {
    type: "A2.6",
    subtype: "RadicalTwoRadicals",
    given: { equation: `\\sqrt{${xPlus(a)}} = \\sqrt{${xPlus(b)}} + ${d}` },
    find: "x, checking the candidate in the original equation",
    answer: `x = ${x0}`,
    steps: [
      {
        instruction: "Square both sides. The right side is a binomial, square it fully, keeping the middle term with the remaining radical:",
        reason: "Square both sides (binomial)",
        blanks: [
          {
            label: "squared equation",
            answer: `${xPlus(a)} = ${xPlus(b)} + ${2 * d}\\sqrt{${xPlus(b)}} + ${d * d}`,
          },
        ],
      },
      {
        instruction: "Isolate the remaining radical, then simplify:",
        reason: "Isolate the radical again",
        blanks: [{ label: "isolated", answer: `\\sqrt{${xPlus(b)}} = ${q}` }],
      },
      {
        instruction: "Square once more and solve:",
        reason: "Square, then solve",
        blanks: [{ label: "solution", answer: `x = ${x0}` }],
      },
      {
        instruction: `CHECK in the original equation: \\sqrt{${x0 + a}} = ${p} and \\sqrt{${x0 + b}} + ${d} = ${q} + ${d} = ${p}. It checks:`,
        reason: "Check the solution",
        blanks: [{ label: "check", answer: "✓" }],
      },
    ],
    verify: { a, b, d, x: x0, p, q },
  };
}

function makeRadicalNoSolution(rng: RNG): Algebra2Problem {
  const c = randInt(rng, 1, 4); // isolated radical equals −c
  const d = randInt(rng, 2, 6);
  const e = d - c;
  const b = randInt(rng, -5, 9);
  return {
    type: "A2.6",
    subtype: "RadicalNoSolution",
    given: { equation: `\\sqrt{${xPlus(b)}} + ${d} = ${e}` },
    find: "x",
    answer: "No solution",
    steps: [
      {
        instruction: `Isolate the radical: subtract ${d} from both sides:`,
        reason: "Isolate the radical before squaring",
        blanks: [{ label: "isolated", answer: `\\sqrt{${xPlus(b)}} = -${c}` }],
      },
      {
        instruction: "STOP before squaring: the principal square root of a real number is never negative, so no x can make this true. (Squaring anyway would manufacture a candidate that fails the check.)",
        reason: "Square roots are nonnegative",
        blanks: [{ label: "solution set", answer: "No solution" }],
      },
    ],
    verify: { b, d, e, kind: "negativeRhs" },
  };
}

// ── 6-7: extraneous solutions of radical equations (2A.4G) ───────────────────
// The family sqrt(x + a) = x - b is built backwards from two roots of the
// squared equation: r2 < b fails the check (its right side is negative) and
// r = 2b + 1 - r2 is the true solution. D1 tests one candidate, D2 solves
// and states the solution set, D3 covers the two no-solution mechanisms.

function extraneousFamily(rng: RNG, bMax: number): { a: number; b: number; r: number; r2: number } {
  const b = pick(rng, [2, 3, 4].filter((v) => v <= bMax));
  const r2 = randInt(rng, 0, b - 1);
  const r = 2 * b + 1 - r2;
  const a = b * b - r * r2;
  return { a, b, r, r2 };
}

function makeRadicalCandidateCheck(rng: RNG): Algebra2Problem {
  const { a, b, r, r2 } = extraneousFamily(rng, 3);
  const cand = rng() < 0.5 ? r : r2;
  const isValid = cand === r;
  const sqrtVal = isValid ? r - b : b - r2;
  const answer = `x = ${cand} is ${isValid ? "a solution" : "extraneous"}`;
  return {
    type: "A2.6",
    subtype: "RadicalCandidateCheck",
    given: { equation: `\\sqrt{${xPlus(a)}} = x - ${b}`, candidate: `x = ${cand}` },
    find: "whether the candidate is a solution of the equation or an extraneous solution",
    answer,
    steps: [
      {
        instruction: `Substitute x = ${cand} into the ORIGINAL equation and evaluate each side separately:`,
        reason: "Check in the original equation",
        blanks: [
          { label: "left side", answer: `${sqrtVal}` },
          { label: "right side", answer: `${cand - b}` },
        ],
      },
      {
        instruction: isValid
          ? "The two sides are equal, so the candidate checks:"
          : "The two sides are NOT equal (a square root is never negative, but the right side is), so the candidate does not check:",
        reason: isValid ? "The candidate is a true solution" : "Extraneous: fails the check",
        blanks: [{ label: "verdict", answer }],
      },
    ],
    verify: { kind: "candidate", a, b, cand },
  };
}

function makeRadicalExtraneousSolve(rng: RNG): Algebra2Problem {
  const { a, b, r, r2 } = extraneousFamily(rng, 4);
  const answer = `{${r}}`;
  return {
    type: "A2.6",
    subtype: "RadicalExtraneousSolve",
    given: { equation: `\\sqrt{${xPlus(a)}} = x - ${b}` },
    find: "the solution set, checking every candidate for extraneous solutions",
    answer,
    steps: [
      {
        instruction: "Square both sides (squaring can introduce extraneous solutions, so the final check is mandatory):",
        reason: "Square both sides",
        blanks: [{ label: "squared equation", answer: `${xPlus(a)} = ${polyToLatex([1, -2 * b, b * b])}` }],
      },
      {
        instruction: "Move everything to one side and factor:",
        reason: "Factor the quadratic",
        blanks: [
          { label: "factored form", answer: `${linearFactor(r2)}${linearFactor(r)} = 0` },
          { label: "candidates", answer: `x = ${r2} or x = ${r}` },
        ],
      },
      {
        instruction: `CHECK x = ${r2} in the original equation: the left side is \\sqrt{${r2 + a}} = ${b - r2}, but the right side is ${r2 - b}, which is negative. A square root can never equal a negative number:`,
        reason: "Reject the extraneous root",
        blanks: [{ label: `x = ${r2}`, answer: `${b - r2} \\neq ${r2 - b}, extraneous` }],
      },
      {
        instruction: `CHECK x = ${r}: the left side is \\sqrt{${r + a}} = ${r - b} and the right side is ${r - b}. It checks, so the solution set is:`,
        reason: "State the true solution set",
        blanks: [{ label: "solution set", answer }],
      },
    ],
    verify: { kind: "solve", a, b, validRoot: r, extraneousRoot: r2 },
  };
}

function makeRadicalExtraneousNoSolution(rng: RNG): Algebra2Problem {
  if (rng() < 0.5) {
    // Squared equation has a negative discriminant: no candidates at all.
    const b = pick(rng, [2, 3, 4]);
    const a = -(b + 1) - randInt(rng, 0, 3);
    const disc = 4 * b + 1 + 4 * a;
    return {
      type: "A2.6",
      subtype: "RadicalExtraneousNoSolution",
      given: { equation: `\\sqrt{${xPlus(a)}} = x - ${b}` },
      find: "the solution set, checking for extraneous solutions",
      answer: "no solution",
      steps: [
        {
          instruction: "Square both sides and move everything to one side:",
          reason: "Square both sides",
          blanks: [{ label: "squared equation", answer: `${polyToLatex([1, -(2 * b + 1), b * b - a])} = 0` }],
        },
        {
          instruction: "Compute the discriminant of the squared equation, (2b + 1)^2 - 4(1)(b^2 - a) with these values:",
          reason: "Discriminant test",
          blanks: [{ label: "discriminant", answer: `${disc}` }],
        },
        {
          instruction: "The discriminant is negative, so even the squared equation has no real roots. There are no candidates to check, and the original equation has an empty solution set:",
          reason: "No candidates survive",
          blanks: [{ label: "solution set", answer: "no solution" }],
        },
      ],
      verify: { kind: "negDisc", a, b },
    };
  }
  // sqrt(x + a) = sqrt(x + b2) with a != b2 can never hold.
  let a = randInt(rng, -4, 8);
  let b2 = randInt(rng, -4, 8);
  if (b2 === a) b2 = a + 3;
  return {
    type: "A2.6",
    subtype: "RadicalExtraneousNoSolution",
    given: { equation: `\\sqrt{${xPlus(a)}} = \\sqrt{${xPlus(b2)}}` },
    find: "the solution set, checking for extraneous solutions",
    answer: "no solution",
    steps: [
      {
        instruction: "Square both sides:",
        reason: "Square both sides",
        blanks: [{ label: "squared equation", answer: `${xPlus(a)} = ${xPlus(b2)}` }],
      },
      {
        instruction: `Simplifying the squared equation gives ${a} = ${b2}, which is false. The squared equation has no solution, so the original equation cannot have one either (squaring never removes solutions, it can only add them):`,
        reason: "False statement after squaring",
        blanks: [{ label: "solution set", answer: "no solution" }],
      },
    ],
    verify: { kind: "equalRadicals", a, b2 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Maker[] = [
  // difficulty 1
  { minDifficulty: 1, make: makeFuncEvalOps },
  { minDifficulty: 1, make: makeInversePoint },
  { minDifficulty: 1, make: makeInverseLinear },
  { minDifficulty: 1, make: (rng) => makeSqrtAttributes(rng, "basic") },
  { minDifficulty: 1, make: makeSqrtInverseOfSqrt },
  { minDifficulty: 1, make: makeRadicalBasic },
  // difficulty 2
  { minDifficulty: 2, make: makeFuncProduct },
  { minDifficulty: 2, make: makeFuncCompose },
  { minDifficulty: 2, make: makeInverseVerify },
  { minDifficulty: 2, make: makeSqrtTransformWrite },
  { minDifficulty: 2, make: makeSqrtRestrictInverse },
  { minDifficulty: 2, make: makeRadicalIsolate },
  { minDifficulty: 2, make: (rng) => makeRadicalExtraneous(rng, false) },
  // difficulty 3
  { minDifficulty: 3, make: makeFuncComposeEval },
  { minDifficulty: 3, make: makeInverseQuadratic },
  { minDifficulty: 3, make: (rng) => makeSqrtAttributes(rng, "full") },
  { minDifficulty: 3, make: makeSqrtSwapDomainRange },
  { minDifficulty: 3, make: makeRadicalLinear },
  { minDifficulty: 3, make: (rng) => makeRadicalExtraneous(rng, true) },
  { minDifficulty: 3, make: makeRadicalTwoRadicals },
  { minDifficulty: 3, make: makeRadicalNoSolution },
  // 6-7 extraneous solutions focus (2A.4G)
  { minDifficulty: 1, make: makeRadicalCandidateCheck },
  { minDifficulty: 2, make: makeRadicalExtraneousSolve },
  { minDifficulty: 3, make: makeRadicalExtraneousNoSolution },
];

/** Generate n A2.6 (T6 function operations, inverses, square roots, radical
 *  equations) problems at the given cumulative difficulty tier. `only`
 *  optionally restricts to the named subtypes (lesson wiring). */
export function generateRadicalProblems(
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

export const RADICAL_MAKERS = MAKERS;

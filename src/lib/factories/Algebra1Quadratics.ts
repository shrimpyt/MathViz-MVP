// Algebra1Quadratics.ts
// TEKS A.8A (solve by factoring & quadratic formula),
//      A.7A (graphing), A.6B (vertex form).
// Subtypes: QuadraticFactoring, QuadraticFormula, GraphQuadratic, VertexForm.
//
// Generation strategy: choose the roots (or vertex) FIRST, then expand —
// so discriminants are never accidentally negative and factored forms
// always multiply out exactly.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type { Algebra1Problem, Algebra1Subtype } from "./Algebra1Types";
import {
  fmtFrac,
  fmtNum,
  fmtPoly,
  fmtLinear,
  fmtFactored,
  polyMul,
  gcd,
} from "./Algebra1Format";

export const QUADRATIC_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["QuadraticFactoring", "QuadraticAttributes"],
  2: ["QuadraticFactoring", "QuadraticAttributes", "GraphQuadratic", "QuadraticDiscriminant"],
  3: ["QuadraticFactoring", "QuadraticAttributes", "GraphQuadratic", "QuadraticTransformations", "VertexForm", "QuadraticFormula", "QuadraticDiscriminant", "CompleteSquare", "WriteQuadratic"],
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "QuadraticAttributes",
  "GraphQuadratic",
  "QuadraticTransformations",
  "VertexForm",
  "QuadraticFactoring",
  "QuadraticFormula",
  "QuadraticDiscriminant",
  "CompleteSquare",
  "WriteQuadratic",
];

function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

// ── Solve by factoring ──────────────────────────────────────────────────────

function makeQuadraticFactoring(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a = difficulty === 1 ? 1 : pick(rng, [1, 1, 2, 3] as const);
  const r1 = randInt(rng, -6, 6);
  let r2 = randInt(rng, -6, 6);
  if (r2 === r1 && rng() < 0.7) r2 = r1 + pick(rng, [-3, -1, 1, 3] as const); // usually distinct
  const f1 = [-a * r1, a];
  const f2 = [-r2, 1];
  const poly = polyMul(f1, f2); // a·x² + b·x + c, roots r1 and r2
  const [s1, s2] = r1 <= r2 ? [r1, r2] : [r2, r1];
  const prompt = `Solve by factoring: \\(${fmtPoly(poly)} = 0\\)`;
  const answer = `x = ${s1} \\text{ or } x = ${s2}`;
  return {
    type: "A.8A",
    subtype: "QuadraticFactoring",
    prompt,
    answer,
    steps: [
      {
        instruction: "Factor the quadratic (check with FOIL):",
        blanks: [
          { label: "factored", answer: `${fmtFactored([fmtLinear(a, -a * r1), fmtLinear(1, -r2)])} = 0` },
        ],
      },
      {
        instruction: "Set each factor equal to zero (zero product property):",
        reason: "Zero Product Property",
        blanks: [{ label: "answer", answer: `x = ${s1} or x = ${s2}` }],
      },
    ],
    meta: { kind: "quadratic", a: poly[2], b: poly[1], c: poly[0] },
  };
}

// ── Quadratic formula ───────────────────────────────────────────────────────

function makeQuadraticFormula(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  // Build from roots so the discriminant is controlled.
  // Tiers 1–2: perfect-square discriminants (integer roots).
  // Tier 3: sometimes a non-perfect-square discriminant → exact radical form.
  const allowRadical = difficulty >= 3 && rng() < 0.4;
  let a = 1;
  let b = 0;
  let c = 0;
  let D = 0;
  if (allowRadical) {
    a = pick(rng, [1, 2] as const);
    b = randInt(rng, -5, 5);
    // Choose c so D = b² − 4ac is positive but NOT a perfect square.
    for (let attempt = 0; attempt < 60; attempt++) {
      c = randInt(rng, -6, 6);
      D = b * b - 4 * a * c;
      if (D > 0 && !isPerfectSquare(D)) break;
    }
    D = b * b - 4 * a * c;
    if (D <= 0 || isPerfectSquare(D)) {
      // Fall back to a clean integer-root case.
      a = 1; b = -3; c = -10; D = 49;
    }
  } else {
    const r1 = randInt(rng, -6, 6);
    let r2 = randInt(rng, -6, 6);
    if (r2 === r1) r2 += 2;
    a = pick(rng, [1, 1, 2] as const);
    const f1 = [-a * r1, a];
    const f2 = [-r2, 1];
    const poly = polyMul(f1, f2);
    a = poly[2]; b = poly[1]; c = poly[0];
    D = b * b - 4 * a * c;
  }
  const prompt = `Solve using the quadratic formula: \\(${fmtPoly([c, b, a])} = 0\\)`;
  let answer: string;
  if (isPerfectSquare(D)) {
    const s = Math.sqrt(D);
    const x1 = (-b + s) / (2 * a);
    const x2 = (-b - s) / (2 * a);
    const [lo, hi] = x1 <= x2 ? [x1, x2] : [x2, x1];
    answer = `x = ${fmtNum(lo)} \\text{ or } x = ${fmtNum(hi)}`;
  } else {
    // Exact form (-b ± √D) / 2a, reduced by gcd where possible.
    const g = gcd(gcd(Math.abs(b), D), Math.abs(2 * a));
    const nb = -b / g;
    const dd = D / g;
    const da = (2 * a) / g;
    answer = `x = \\frac{${nb} \\pm \\sqrt{${dd}}}{${da}}`;
  }
  return {
    type: "A.8A",
    subtype: "QuadraticFormula",
    prompt,
    answer,
    steps: [
      {
        instruction: "Identify a, b, c and substitute into \\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\):",
        reason: "Quadratic formula",
        blanks: [
          { label: "a, b, c", answer: `a = ${a}, b = ${b}, c = ${c}` },
          { label: "discriminant", answer: `D = ${b}^2 - 4(${a})(${c}) = ${D}` },
        ],
      },
      {
        instruction: "Simplify:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "quadratic", a, b, c },
  };
}

// ── Graph a quadratic ───────────────────────────────────────────────────────

function makeGraphQuadratic(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const a = pick(rng, [-2, -1, 1, 2] as const);
  const h = randInt(rng, -4, 4);
  const k = randInt(rng, -5, 5);
  // f(x) = a(x − h)² + k = a(x² −2hx + h²) + k
  const A = a;
  const B = -2 * a * h;
  const C = a * h * h + k;
  const useVertexForm = difficulty === 1 || rng() < 0.5;
  const eqText = useVertexForm
    ? `f(x) = ${a === 1 ? "" : a === -1 ? "-" : a}(x ${h >= 0 ? "-" : "+"} ${Math.abs(h)})^{2} ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`
    : `f(x) = ${fmtPoly([C, B, A])}`;
  const axis = `x = ${h}`;
  const yInt = C;
  const prompt = `Graph \\(${eqText}\\). State the vertex, axis of symmetry, and y-intercept.`;
  const answer = `vertex: (${h}, ${k}); axis: ${axis}; y-intercept: (0, ${yInt})`;
  return {
    type: "A.7A",
    subtype: "GraphQuadratic",
    prompt,
    answer,
    steps: [
      {
        instruction: "The vertex form reveals the vertex (h, k):",
        reason: "Vertex form \(f(x) = a(x-h)^2+k\)",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: "The axis of symmetry is the vertical line through the vertex:",
        reason: "Parabolas are symmetric about x = h",
        blanks: [{ label: "axis", answer: axis }],
      },
      {
        instruction: "The y-intercept is f(0). Plot the vertex and intercept, then sketch:",
        blanks: [{ label: "y-intercept", answer: `(0, ${yInt})` }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "parabola", a, h, k, label: eqText }],
      marks: [
        { x: h, y: k, label: `vertex (${h}, ${k})` },
        { x: 0, y: yInt, label: `(0, ${yInt})` },
      ],
      xRange: [h - 6, h + 6],
    },
    meta: { kind: "vertex", a, h, k },
  };
}

// ── Vertex form ─────────────────────────────────────────────────────────────

function makeVertexForm(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  if (rng() < 0.5 || difficulty < 3) {
    // Given vertex + a, write the equation.
    const a = pick(rng, [-2, -1, 1, 2] as const);
    const h = randInt(rng, -4, 4);
    const k = randInt(rng, -5, 5);
    const prompt = `Write the equation of the parabola with vertex \\((${h}, ${k})\\) and \\(a = ${a}\\) in vertex form.`;
    const aText = a === 1 ? "" : a === -1 ? "-" : `${a}`;
    const answer = `f(x) = ${aText}(x ${h >= 0 ? "-" : "+"} ${Math.abs(h)})^{2} ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`;
    return {
      type: "A.6B",
      subtype: "VertexForm",
      prompt,
      answer,
      steps: [
        {
          instruction: "Vertex form is \\(f(x) = a(x - h)^2 + k\\). Substitute the vertex and a:",
        reason: "Definition of vertex form",
          blanks: [{ label: "answer", answer }],
        },
      ],
      graph: {
        kind: "FunctionGraph",
        funcs: [{ fn: "parabola", a, h, k }],
        marks: [{ x: h, y: k, label: `(${h}, ${k})` }],
        xRange: [h - 6, h + 6],
      },
      meta: { kind: "vertex", a, h, k },
    };
  }
  // Complete the square: f(x) = x² + bx + c → vertex form (b even keeps integers).
  const h = randInt(rng, -5, 5);
  const k = randInt(rng, -6, 6);
  const b = 2 * h;
  const c = h * h + k;
  const prompt = `Rewrite \\(f(x) = ${fmtPoly([c, b, 1])}\\) in vertex form by completing the square.`;
  const answer = `f(x) = (x ${h >= 0 ? "-" : "+"} ${Math.abs(h)})^{2} ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`;
  return {
    type: "A.6B",
    subtype: "VertexForm",
    prompt,
    answer,
    steps: [
      {
        instruction: `Take half of ${b} and square it: \\((\\frac{${b}}{2})^2 = ${h * h}\\):`,
        blanks: [{ label: "complete", answer: `f(x) = (x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x + ${h * h}) ${c >= h * h ? "+" : "-"} ${Math.abs(c - h * h)}` }],
      },
      {
        instruction: "Write as a perfect square:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "vertex", a: 1, h, k },
  };
}

// ── Key attributes from standard form (A.6A) ─────────────────────────────────
// Axis of symmetry x = −b/2a, vertex, y-intercept, max/min, domain & range.

function makeQuadraticAttributes(rng: RNG): Algebra1Problem {
  const a = pick(rng, [-2, -1, 1, 2] as const);
  const h = randInt(rng, -4, 4);
  const k = randInt(rng, -5, 5);
  // Build from vertex form so the vertex is exact: a(x−h)² + k.
  const A = a;
  const B = -2 * a * h;
  const C = a * h * h + k;
  const eqText = `f(x) = ${fmtPoly([C, B, A])}`;
  const minMax = a > 0 ? `minimum ${k}` : `maximum ${k}`;
  const range = a > 0 ? `y \\geq ${k}` : `y \\leq ${k}`;
  const prompt = `For \\(${eqText}\\): state the axis of symmetry, vertex, y-intercept, ${a > 0 ? "minimum" : "maximum"} value, and range.`;
  const answer = `axis: x = ${h}; vertex: (${h}, ${k}); y-intercept: (0, ${C}); ${minMax}; range: ${range}`;
  return {
    type: "A.6A",
    subtype: "QuadraticAttributes",
    prompt,
    answer,
    steps: [
      {
        instruction: "The axis of symmetry is \\(x = -\\frac{b}{2a}\\):",
        reason: "Axis of symmetry formula",
        blanks: [{ label: "axis", answer: `x = ${h}` }],
      },
      {
        instruction: "The vertex lies on the axis; evaluate f at x = h:",
        reason: "Vertex is on the axis of symmetry",
        blanks: [{ label: "vertex", answer: `(${h}, ${k})` }],
      },
      {
        instruction: `Since a = ${a} ${a > 0 ? "> 0 (opens up)" : "< 0 (opens down)"}, the vertex gives the ${a > 0 ? "minimum" : "maximum"}:`,
        blanks: [{ label: "answer", answer: `${minMax}; range: ${range}` }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [{ fn: "parabola", a, h, k }],
      marks: [
        { x: h, y: k, label: `(${h}, ${k})` },
        { x: 0, y: C, label: `(0, ${C})` },
      ],
      xRange: [h - 6, h + 6],
    },
    meta: { kind: "quadAttributes", a: A, b: B, c: C },
  };
}

// ── Transformations of f(x) = x² (A.7C) ─────────────────────────────────────

function makeQuadraticTransformations(rng: RNG): Algebra1Problem {
  const a = pick(rng, [-2, -1, 1, 2] as const);
  const h = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
  const k = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const parts: string[] = [];
  if (a === -1) parts.push("reflect over the x-axis");
  else if (a !== 1) parts.push(a > 1 ? `vertical stretch by ${a}` : `vertical shrink by ${fmtFrac(1, Math.abs(a))}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  const description = parts.join("; ");
  const aText = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  const gText = `g(x) = ${aText}(x ${h > 0 ? "-" : "+"} ${Math.abs(h)})^{2} ${k > 0 ? "+" : "-"} ${Math.abs(k)}`;
  const prompt = `Describe the transformation(s) of \\(f(x) = x^2\\) that produce \\(${gText}\\).`;
  return {
    type: "A.7C",
    subtype: "QuadraticTransformations",
    prompt,
    answer: description,
    steps: [
      {
        instruction: "Read the transformation from vertex form \\(g(x) = a(x-h)^2+k\\):",
        reason: "Vertex form reveals transformations",
        blanks: [{ label: "answer", answer: description }],
      },
    ],
    graph: {
      kind: "FunctionGraph",
      funcs: [
        { fn: "parabola", a: 1, h: 0, k: 0, color: "#64748b", label: "f" },
        { fn: "parabola", a, h, k, label: "g" },
      ],
      xRange: [-8, 8],
    },
    meta: { kind: "quadTransform", a, h, k },
  };
}

// ── Discriminant: number of real solutions (A.8A) ───────────────────────────

function makeQuadraticDiscriminant(rng: RNG): Algebra1Problem {
  const outcome = pick(rng, ["two", "one", "none"] as const);
  let a: number, b: number, c: number, D: number;
  if (outcome === "two") {
    a = pick(rng, [1, 2] as const);
    b = randInt(rng, -5, 5);
    c = randInt(rng, -6, 0);
    D = b * b - 4 * a * c;
    if (D <= 0) { a = 1; b = 0; c = -4; D = 16; }
  } else if (outcome === "one") {
    const r = randInt(rng, -4, 4);
    a = pick(rng, [1, 2] as const);
    b = -2 * a * r;
    c = a * r * r;
    D = 0;
  } else {
    a = pick(rng, [1, 2] as const);
    b = randInt(rng, -3, 3);
    c = randInt(rng, 5, 10);
    D = b * b - 4 * a * c;
    if (D >= 0) { a = 1; b = 0; c = 5; D = -20; }
  }
  const prompt = `Find the discriminant of \\(${fmtPoly([c, b, a])} = 0\\) and state how many real solutions it has.`;
  const answer = `D = ${D}; ${outcome === "two" ? "two real solutions" : outcome === "one" ? "one real solution" : "no real solutions"}`;
  return {
    type: "A.8A",
    subtype: "QuadraticDiscriminant",
    prompt,
    answer,
    steps: [
      {
        instruction: "Compute \\(D = b^2 - 4ac\\):",
        reason: "Discriminant formula",
        blanks: [{ label: "D", answer: `D = ${D}` }],
      },
      {
        instruction: "D > 0 → two real solutions; D = 0 → one; D < 0 → none:",
        blanks: [{ label: "answer", answer: outcome === "two" ? "two real solutions" : outcome === "one" ? "one real solution" : "no real solutions" }],
      },
    ],
    meta: { kind: "quadratic", a, b, c },
  };
}

// ── Solve by completing the square (A.8A) ────────────────────────────────────

function makeCompleteSquare(rng: RNG): Algebra1Problem {
  const half = pick(rng, [-4, -3, -2, 2, 3, 4] as const); // b/2
  const b = 2 * half;
  const r = pick(rng, [1, 2, 3] as const); // (x + half)² = r²
  const c = half * half - r * r;
  const s1 = -half - r;
  const s2 = -half + r;
  const [lo, hi] = s1 <= s2 ? [s1, s2] : [s2, s1];
  const prompt = `Solve by completing the square: \\(${fmtPoly([c, b, 1])} = 0\\)`;
  const answer = `x = ${lo} \\text{ or } x = ${hi}`;
  return {
    type: "A.8A",
    subtype: "CompleteSquare",
    prompt,
    answer,
    steps: [
      {
        instruction: `Move the constant, then add \\((\\frac{${b}}{2})^2 = ${half * half}\\) to both sides:`,
        reason: "Completing the square",
        blanks: [{ label: "square", answer: `(x ${half >= 0 ? "+" : "-"} ${Math.abs(half)})^2 = ${r * r}` }],
      },
      {
        instruction: "Take the square root of both sides and solve:",
        blanks: [{ label: "answer", answer: `x = ${lo} or x = ${hi}` }],
      },
    ],
    meta: { kind: "completeSquare", b, c },
  };
}

// ── Write a quadratic given roots (A.6C) ─────────────────────────────────────

function makeWriteQuadratic(rng: RNG): Algebra1Problem {
  const r1 = randInt(rng, -5, 5);
  let r2 = randInt(rng, -5, 5);
  if (r2 === r1) r2 += 3;
  const poly = polyMul([-r1, 1], [-r2, 1]);
  const prompt = `Write a quadratic function with zeros at \\(x = ${r1}\\) and \\(x = ${r2}\\).`;
  const answer = `f(x) = ${fmtPoly(poly)}`;
  return {
    type: "A.6C",
    subtype: "WriteQuadratic",
    prompt,
    answer,
    steps: [
      {
        instruction: "Zeros at r₁, r₂ give factors (x − r₁)(x − r₂):",
        reason: "Factor theorem",
        blanks: [{ label: "factored", answer: `f(x) = ${fmtFactored([fmtLinear(1, -r1), fmtLinear(1, -r2)])}` }],
      },
      {
        instruction: "Multiply out:",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "writeQuad", r1, r2 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  QuadraticAttributes: (rng) => makeQuadraticAttributes(rng),
  GraphQuadratic: makeGraphQuadratic,
  QuadraticTransformations: (rng) => makeQuadraticTransformations(rng),
  VertexForm: makeVertexForm,
  QuadraticFactoring: makeQuadraticFactoring,
  QuadraticFormula: makeQuadraticFormula,
  QuadraticDiscriminant: (rng) => makeQuadraticDiscriminant(rng),
  CompleteSquare: (rng) => makeCompleteSquare(rng),
  WriteQuadratic: (rng) => makeWriteQuadratic(rng),
};

export function generateQuadraticProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...QUADRATIC_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

// Algebra1Equations.ts
// TEKS A.5A — Solving multi-step equations & inequalities.
// Subtypes: MultiStepEquation, VariablesBothSides, EquationWordProblem,
//           Inequality, AbsoluteValue.
//
// Generation strategy: pick the solution FIRST, then derive the constants,
// so every problem has a clean, intentional answer.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { DifficultyLevel } from "@/modules/CurriculumRegistry";
import type {
  Algebra1Problem,
  Algebra1Subtype,
  IneqRel,
} from "./Algebra1Types";
import {
  fmtFrac,
  fmtLinear,
  fmtEquation,
  fmtRel,
  flipRel,
} from "./Algebra1Format";

/** Difficulty tiers are cumulative and live in the factory. */
export const EQUATION_BY_DIFFICULTY: Record<DifficultyLevel, readonly Algebra1Subtype[]> = {
  1: ["MultiStepEquation", "Proportion"],
  2: ["MultiStepEquation", "Proportion", "VariablesBothSides", "Inequality", "LiteralEquation"],
  3: ["MultiStepEquation", "Proportion", "VariablesBothSides", "EquationWordProblem", "Inequality", "CompoundInequality", "LiteralEquation", "AbsoluteValue"],
};

function stepsForEquation(work: { line1: string; line2: string; answer: string }): Algebra1Problem["steps"] {
  return [
    {
      instruction: "Isolate the variable term (undo addition/subtraction):",
      reason: "Subtraction Property of Equality",
      blanks: [{ label: "simplified", answer: work.line1 }],
    },
    {
      instruction: "Isolate the variable (undo multiplication/division):",
      reason: "Division Property of Equality",
      blanks: [{ label: "answer", answer: work.answer }],
    },
  ];
}

// ── ax + b = c (tier 1) ─────────────────────────────────────────────────────

function makeMultiStepEquation(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const x0 = randInt(rng, -9, 9);
  // Tier 2+: sometimes wrap one side in the distributive property: k(x + b) = c
  const useDistributive = difficulty >= 2 && rng() < 0.45;

  if (useDistributive) {
    const k = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
    const b = randInt(rng, -6, 6);
    const c = k * (x0 + b);
    const prompt = `Solve: \\(${k}(x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}) = ${c}\\)`;
    const answer = `x = ${fmtFrac(x0, 1)}`;
    return {
      type: "A.5A",
      subtype: "MultiStepEquation",
      prompt,
      answer,
      steps: [
        {
          instruction: "Distribute on the left side:",
          reason: "Distributive Property",
          blanks: [{ label: "expanded", answer: `${fmtLinear(k, k * b)} = ${c}` }],
        },
        {
          instruction: "Isolate the variable term, then divide:",
          reason: "Properties of Equality",
          blanks: [{ label: "answer", answer: `x = ${x0}` }],
        },
      ],
      meta: { kind: "equation", a: k, b: k * b, c: 0, d: c },
    };
  }

  const a = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
  const b = randInt(rng, -9, 9);
  const c = a * x0 + b;
  const prompt = `Solve: \\(${fmtEquation(a, b, 0, c)}\\)`;
  const answer = `x = ${x0}`;
  return {
    type: "A.5A",
    subtype: "MultiStepEquation",
    prompt,
    answer,
    steps: stepsForEquation({
      line1: `${fmtLinear(a, 0)} = ${c - b}`,
      line2: "",
      answer: `x = ${x0}`,
    }),
    meta: { kind: "equation", a, b, c: 0, d: c },
  };
}

// ── ax + b = cx + d (tier 2+) ────────────────────────────────────────────────

function makeVariablesBothSides(rng: RNG): Algebra1Problem {
  const x0 = randInt(rng, -8, 8);
  let a: number = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
  let c: number = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
  if (c === a) c = a > 0 ? a - 3 : a + 3; // guarantee a ≠ c
  const b = randInt(rng, -9, 9);
  const d = (a - c) * x0 + b;
  const prompt = `Solve: \\(${fmtEquation(a, b, c, d)}\\)`;
  const net = a - c;
  return {
    type: "A.5A",
    subtype: "VariablesBothSides",
    prompt,
    answer: `x = ${x0}`,
    steps: [
      {
        instruction: `Collect variable terms on the left (subtract ${fmtLinear(c, 0)} from both sides):`,
        reason: "Subtraction Property of Equality",
        blanks: [{ label: "collected", answer: `${fmtEquation(net, b, 0, d)}` }],
      },
      {
        instruction: "Solve the resulting two-step equation:",
        reason: "Properties of Equality",
        blanks: [{ label: "answer", answer: `x = ${x0}` }],
      },
    ],
    meta: { kind: "equation", a, b, c, d },
  };
}

// ── Word problems (tier 3) ──────────────────────────────────────────────────

function makeEquationWordProblem(rng: RNG): Algebra1Problem {
  const variant = randInt(rng, 0, 1);
  if (variant === 0) {
    // Consecutive integers
    const n = randInt(rng, -8, 12);
    const sum = 3 * n + 3;
    const prompt =
      `The sum of three consecutive integers is ${sum}. Find the three integers.`;
    const answer = `${n}, ${n + 1}, ${n + 2}`;
    return {
      type: "A.5A",
      subtype: "EquationWordProblem",
      prompt,
      answer,
      steps: [
        {
          instruction: "Let the integers be n, n + 1, n + 2. Write the equation:",
          reason: "Translate words into algebra",
          blanks: [{ label: "equation", answer: `n + (n + 1) + (n + 2) = ${sum}` }],
        },
        {
          instruction: "Solve for n, then list the three integers:",
          blanks: [{ label: "answer", answer }],
        },
      ],
      // a·x+b = c·x+d with the integers as the "solution triple"
      meta: { kind: "equation", a: 3, b: 3, c: 0, d: sum, word: "consecutive" },
    };
  }
  // Perimeter word problem
  const w = randInt(rng, 3, 12);
  const extra = randInt(rng, 2, 8);
  const p = 4 * w + 2 * extra;
  const prompt =
    `A rectangle's length is ${extra} more than its width. Its perimeter is ${p}. Find the width.`;
  return {
    type: "A.5A",
    subtype: "EquationWordProblem",
    prompt,
    answer: `${w}`,
    steps: [
      {
        instruction: "Let w be the width. Write the perimeter equation:",
        blanks: [{ label: "equation", answer: `2w + 2(w + ${extra}) = ${p}` }],
      },
      {
        instruction: "Solve for w:",
        blanks: [{ label: "answer", answer: `w = ${w}` }],
      },
    ],
    meta: { kind: "equation", a: 4, b: 2 * extra, c: 0, d: p, word: "perimeter" },
  };
}

// ── Inequalities (tier 2+) ──────────────────────────────────────────────────

function makeInequality(rng: RNG, difficulty: DifficultyLevel): Algebra1Problem {
  const bound = randInt(rng, -8, 8);
  const a = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
  const b = randInt(rng, -9, 9);
  const c = a * bound + b;
  const rel = pick(rng, ["<", ">", "<=", ">="] as const);
  // Flipping rule: dividing by negative a reverses the relation.
  const answerRel: IneqRel = a < 0 ? flipRel(rel) : rel;
  const prompt = `Solve: \\(${fmtLinear(a, b)} ${fmtRel(rel)} ${c}\\)`;
  const answer = `x ${fmtRel(answerRel)} ${bound}`;
  const tier3Word = difficulty >= 3 && rng() < 0.3;
  const wordPrompt = tier3Word
    ? `You need at least ${c} points to pass. You already have ${b} points and each bonus question is worth ${a} points. How many bonus questions (x) do you need? Write and solve an inequality.`
    : null;
  const steps: Algebra1Problem["steps"] = [
    {
      instruction: `Isolate the variable term (subtract ${b >= 0 ? b : `(${b})`} from both sides):`,
      reason: "Subtraction Property of Inequality",
      blanks: [{ label: "isolated", answer: `${fmtLinear(a, 0)} ${fmtRel(rel)} ${c - b}` }],
    },
    {
      instruction:
        a < 0
          ? `Divide by ${a} — dividing by a negative FLIPS the inequality sign:`
          : `Divide both sides by ${a}:`,
      reason: "Division Property of Inequality",
      blanks: [{ label: "answer", answer: `x ${fmtRel(answerRel)} ${bound}` }],
    },
  ];
  return {
    type: "A.5B",
    subtype: "Inequality",
    prompt: wordPrompt ?? prompt,
    answer,
    steps,
    graph: {
      kind: "NumberLine",
      value: bound,
      rel: answerRel,
      min: bound - 6,
      max: bound + 6,
    },
    meta: { kind: "inequality", a, b, c, rel },
  };
}

// ── Absolute value basics (tier 3) ──────────────────────────────────────────

function makeAbsoluteValue(rng: RNG): Algebra1Problem {
  const b = randInt(rng, -7, 7);
  const c = randInt(rng, 1, 9); // c > 0 so two real solutions exist
  const s1 = c - b;
  const s2 = -c - b;
  const [lo, hi] = s1 < s2 ? [s1, s2] : [s2, s1];
  const inner = b >= 0 ? `x + ${b}` : `x - ${Math.abs(b)}`;
  const prompt = `Solve: \\(|${inner}| = ${c}\\)`;
  const answer = `x = ${lo} \\text{ or } x = ${hi}`;
  return {
    type: "A.5A",
    subtype: "AbsoluteValue",
    prompt,
    answer,
    steps: [
      {
        instruction: "An absolute value equation splits into two cases:",
        reason: "Definition of absolute value",
        blanks: [
          { label: "case 1", answer: `${inner} = ${c}` },
          { label: "case 2", answer: `${inner} = ${-c}` },
        ],
      },
      {
        instruction: "Solve each case:",
        blanks: [{ label: "answer", answer: `x = ${lo} or x = ${hi}` }],
      },
    ],
    meta: { kind: "absolute", b, c },
  };
}

// ── Literal equations (tier 2+): solve ax + by = c for the target variable ──

function makeLiteralEquation(rng: RNG): Algebra1Problem {
  const target = rng() < 0.5 ? ("y" as const) : ("x" as const);
  const a = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const b = pick(rng, [-4, -3, -2, 2, 3, 4] as const);
  const c = randInt(rng, -10, 10);
  // Solve for y: y = (−a/b)x + c/b. Solve for x: x = (−b/a)y + c/a.
  const p = target === "y" ? b : a; // coefficient of the target
  const q = target === "y" ? a : b; // coefficient of the other variable
  const other = target === "y" ? "x" : "y";
  const slopeT = fmtFrac(-q, p);
  const constT = fmtFrac(c, p);
  const constPart = c === 0 ? "" : constT.startsWith("-") ? ` - ${constT.slice(1)}` : ` + ${constT}`;
  const answer = `${target} = ${slopeT}${other}${constPart}`;
  const xTerm = fmtLinear(a, 0);
  const yTerm = b >= 0 ? `+ ${b}y` : `- ${-b}y`;
  const prompt = `Solve \\(${xTerm} ${yTerm} = ${c}\\) for \\(${target}\\).`;
  // Isolated form: p·target = (−q)·other + c
  const otherTerm = fmtLinear(-q, 0).replace(/x$/, other);
  const isolated = `${p}${target} = ${otherTerm}${c === 0 ? "" : c > 0 ? ` + ${c}` : ` - ${-c}`}`;
  return {
    type: "A.12E",
    subtype: "LiteralEquation",
    prompt,
    answer,
    steps: [
      {
        instruction: `Isolate the ${target}-term:`,
        reason: "Subtraction Property of Equality",
        blanks: [{ label: "isolated", answer: isolated }],
      },
      {
        instruction: `Divide every term by ${p}:`,
        reason: "Division Property of Equality",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "literal", a, b, c, target },
  };
}

// ── Proportions (tier 1+): a/b = c/x ────────────────────────────────────────

function makeProportion(rng: RNG): Algebra1Problem {
  const x0 = pick(rng, [2, 3, 4, 5, 6, 8, 9, 10, 12] as const);
  const b = pick(rng, [2, 3, 4, 5, 6] as const);
  const s = pick(rng, [2, 3, 4] as const);
  const a = b * s;
  const c = s * x0; // a/b = c/x0  →  x0 = b·c/a
  const prompt = `Solve the proportion: \\(\\frac{${a}}{${b}} = \\frac{${c}}{x}\\)`;
  return {
    type: "A.5A",
    subtype: "Proportion",
    prompt,
    answer: `x = ${x0}`,
    steps: [
      {
        instruction: "Cross-multiply:",
        reason: "Cross Multiplication Property",
        blanks: [{ label: "cross", answer: `${a}x = ${b * c}` }],
      },
      {
        instruction: `Divide both sides by ${a}:`,
        reason: "Division Property of Equality",
        blanks: [{ label: "answer", answer: `x = ${x0}` }],
      },
    ],
    meta: { kind: "proportion", a, b, c },
  };
}

// ── Compound inequalities (tier 3): c1 < ax + b < c2 ────────────────────────

function makeCompoundInequality(rng: RNG): Algebra1Problem {
  const a = pick(rng, [2, 3, 4] as const);
  const b = randInt(rng, -6, 6);
  const lo = randInt(rng, -5, 2);
  const hi = lo + randInt(rng, 2, 6);
  const c1 = a * lo + b;
  const c2 = a * hi + b;
  const prompt = `Solve: \\(${c1} < ${fmtLinear(a, b)} < ${c2}\\)`;
  const answer = `${lo} < x < ${hi}`;
  return {
    type: "A.5B",
    subtype: "CompoundInequality",
    prompt,
    answer,
    steps: [
      {
        instruction: "A compound inequality is two inequalities at once. Undo addition/subtraction everywhere:",
        reason: "Subtraction Property of Inequality",
        blanks: [{ label: "step 1", answer: `${c1 - b} < ${a}x < ${c2 - b}` }],
      },
      {
        instruction: `Divide all three parts by ${a}:`,
        reason: "Division Property of Inequality",
        blanks: [{ label: "answer", answer }],
      },
    ],
    meta: { kind: "compound", a, b, lo, hi },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const MAKERS: Record<string, (rng: RNG, difficulty: DifficultyLevel) => Algebra1Problem> = {
  MultiStepEquation: makeMultiStepEquation,
  VariablesBothSides: (rng) => makeVariablesBothSides(rng),
  LiteralEquation: (rng) => makeLiteralEquation(rng),
  Proportion: (rng) => makeProportion(rng),
  EquationWordProblem: (rng) => makeEquationWordProblem(rng),
  Inequality: makeInequality,
  CompoundInequality: (rng) => makeCompoundInequality(rng),
  AbsoluteValue: (rng) => makeAbsoluteValue(rng),
};

const OWN_SUBTYPES: readonly Algebra1Subtype[] = [
  "MultiStepEquation",
  "VariablesBothSides",
  "LiteralEquation",
  "Proportion",
  "EquationWordProblem",
  "Inequality",
  "CompoundInequality",
  "AbsoluteValue",
];

/**
 * Generate n equation/inequality problems using the provided RNG.
 * `allowed` intersects the difficulty list (falls back to the full list).
 */
export function generateEquationProblems(
  rng: RNG,
  n: number,
  difficulty: DifficultyLevel = 2,
  allowed?: readonly Algebra1Subtype[]
): Algebra1Problem[] {
  const pool = (allowed ?? []).filter((s): s is Algebra1Subtype => (OWN_SUBTYPES as readonly string[]).includes(s));
  const list = pool.length > 0 ? pool : [...EQUATION_BY_DIFFICULTY[difficulty]];
  return Array.from({ length: n }, () => {
    const subtype = pick(rng, list);
    return MAKERS[subtype](rng, difficulty);
  });
}

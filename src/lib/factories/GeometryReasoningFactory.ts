// GeometryReasoningFactory.ts
// Topic 2: Reasoning and Proof (TEKS G.4(A), G.4(B)).
//
// Lesson ch2-1 (Inductive Reasoning): conjectures from number/figure
// patterns, and counterexamples that genuinely disprove a conjecture — every
// counterexample maker computes its witness and the witness really does
// falsify the statement (the test checkers re-verify this independently).
// Chapter-test pool: conditional statements and their forms, biconditionals,
// Laws of Detachment and Syllogism (including the classic invalid-conclusion
// traps), and algebraic reasoning with named properties of equality.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, sampleFromPool,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

// ── Lesson makers: patterns ───────────────────────────────────────────────────

function makeArithmeticPattern(rng: RNG, difficulty: Difficulty): GeometryProblem {
  const a1 = randInt(rng, -4, 12);
  const d = pick(rng, [2, 3, 4, 5, 6, -2, -3, 7]);
  const terms = [0, 1, 2, 3, 4].map((i) => a1 + i * d);
  if (difficulty >= 3) {
    const n = randInt(rng, 8, 15);
    const an = a1 + (n - 1) * d;
    return {
      type: "GEO.2",
      subtype: "NumberPattern",
      prompt: `Use inductive reasoning: ${terms.join(", ")}, … Find the ${n}th term of the pattern.`,
      given: { firstTerm: a1, difference: d },
      find: `term ${n}`,
      answer: String(an),
      steps: [
        step(`Each term increases by a constant difference: ${terms[1]} − ${terms[0]} = ${d}.`, "Look for a pattern in the differences."),
        step("Make a conjecture: each new term adds the same difference.", "Inductive reasoning — a conjecture based on observed cases."),
        step(`Term n is a₁ + (n − 1)d = ${a1} + (${n} − 1)(${d}).`, "Pattern rule for an arithmetic sequence."),
        step(`The ${n}th term is ${an}.`, "Arithmetic.", [{ label: "answer", answer: String(an) }]),
      ],
      verify: { kind: "arithPattern", a1, d, n },
    };
  }
  const next1 = a1 + 5 * d;
  const next2 = a1 + 6 * d;
  return {
    type: "GEO.2",
    subtype: "NumberPattern",
    prompt: `Use inductive reasoning to find the next two numbers in the pattern: ${terms.join(", ")}, …`,
    given: { firstTerm: a1, difference: d },
    find: "next two terms",
    answer: `${next1}, ${next2}`,
    steps: [
      step(`Each term changes by the same amount: ${terms[1]} − ${terms[0]} = ${d}.`, "Look for a pattern in the differences."),
      step("Conjecture: keep adding the same difference to get the next term.", "Inductive reasoning — a conjecture based on observed cases."),
      step(`${terms[4]} + (${d}) = ${next1}, and ${next1} + (${d}) = ${next2}.`, "Apply the pattern rule.", [
        { label: "next", answer: `${next1}, ${next2}` },
      ]),
    ],
    verify: { kind: "arithNext", a1, d },
  };
}

function makeGeometricPattern(rng: RNG): GeometryProblem {
  const a1 = pick(rng, [1, 2, 3, 5]);
  const r = pick(rng, [2, 3, -2]);
  const terms = [0, 1, 2, 3, 4].map((i) => a1 * r ** i);
  const next1 = a1 * r ** 5;
  const next2 = a1 * r ** 6;
  return {
    type: "GEO.2",
    subtype: "NumberPattern",
    prompt: `Use inductive reasoning to find the next two numbers in the pattern: ${terms.join(", ")}, …`,
    given: { firstTerm: a1, ratio: r },
    find: "next two terms",
    answer: `${next1}, ${next2}`,
    steps: [
      step(`Each term is the previous term multiplied by ${r}: ${terms[1]} ÷ ${terms[0]} = ${r}.`, "Look for a pattern in the ratios."),
      step("Conjecture: keep multiplying by the same ratio.", "Inductive reasoning — a conjecture based on observed cases."),
      step(`${terms[4]} × ${r} = ${next1}, and ${next1} × ${r} = ${next2}.`, "Apply the pattern rule.", [
        { label: "next", answer: `${next1}, ${next2}` },
      ]),
    ],
    verify: { kind: "geoNext", a1, r },
  };
}

function makeFigurePattern(rng: RNG, difficulty: Difficulty): GeometryProblem {
  // Triangular numbers: figure n has 1, 3, 6, 10, 15, … dots.
  const shown = [1, 3, 6, 10];
  if (difficulty >= 2) {
    const n = pick(rng, [5, 6, 8, 10]);
    const total = (n * (n + 1)) / 2;
    return {
      type: "GEO.2",
      subtype: "FigurePattern",
      prompt: `The diagrams show figures made of dots. Figure 1 has 1 dot, Figure 2 has 3 dots, Figure 3 has 6 dots, and Figure 4 has 10 dots. Make a conjecture for the number of dots in Figure ${n}, and find that number.`,
      given: { counts: "1, 3, 6, 10" },
      find: `dots in Figure ${n}`,
      answer: `${total} dots`,
      steps: [
        step("The counts grow by 2, then 3, then 4: each new figure adds one more dot than the last figure did.", "Look for a pattern in the counts."),
        step("Conjecture: Figure n has 1 + 2 + … + n = n(n + 1)/2 dots.", "Inductive reasoning — a conjecture based on observed cases."),
        step(`Figure ${n}: ${n} × ${n + 1} / 2 = ${total}.`, "Apply the conjecture.", [{ label: "dots", answer: String(total) }]),
      ],
      svgParams: { kind: "PatternFigure", counts: shown },
      verify: { kind: "triangular", n },
    };
  }
  return {
    type: "GEO.2",
    subtype: "FigurePattern",
    prompt: "The diagrams show figures made of dots. Figure 1 has 1 dot, Figure 2 has 3 dots, Figure 3 has 6 dots, and Figure 4 has 10 dots. How many dots are in Figure 5?",
    given: { counts: "1, 3, 6, 10" },
    find: "dots in Figure 5",
    answer: "15 dots",
    steps: [
      step("From figure to figure the count grows by 2, then 3, then 4.", "Look for a pattern in the counts."),
      step("Conjecture: the next increase is 5.", "Inductive reasoning — a conjecture based on observed cases."),
      step("Figure 5 has 10 + 5 = 15 dots.", "Apply the conjecture.", [{ label: "dots", answer: "15" }]),
    ],
    svgParams: { kind: "PatternFigure", counts: shown },
    verify: { kind: "triangular", n: 5 },
  };
}

function makeOddSumConjecture(rng: RNG): GeometryProblem {
  const n = randInt(rng, 9, 15);
  return {
    type: "GEO.2",
    subtype: "ConjectureSum",
    prompt: `Observe: 1 = 1, 1 + 3 = 4, 1 + 3 + 5 = 9, 1 + 3 + 5 + 7 = 16. Make a conjecture about the sum of the first n odd numbers, then use it to find the sum of the first ${n} odd numbers.`,
    given: { pattern: "sums are 1, 4, 9, 16" },
    find: `sum of first ${n} odd numbers`,
    answer: String(n * n),
    steps: [
      step("The sums 1, 4, 9, 16 are the squares 1², 2², 3², 4².", "Look for a pattern in the results."),
      step("Conjecture: the sum of the first n odd numbers is n².", "Inductive reasoning — a conjecture based on observed cases."),
      step(`The sum of the first ${n} odd numbers is ${n}² = ${n * n}.`, "Apply the conjecture.", [{ label: "sum", answer: String(n * n) }]),
    ],
    verify: { kind: "oddSum", n },
  };
}

// ── Lesson makers: counterexamples (each witness truly falsifies) ────────────

function makeCounterexample(rng: RNG): GeometryProblem {
  const which = pick(rng, ["sumOdd", "divisible", "square", "primeForm", "rectSquare", "adjacent"] as const);
  switch (which) {
    case "sumOdd": {
      const a = 2 * randInt(rng, 1, 9) + 1;
      const b = 2 * randInt(rng, 1, 9) + 1;
      return {
        type: "GEO.2", subtype: "Counterexample",
        prompt: "Conjecture: The sum of two odd numbers is always odd. Give a counterexample that disproves the conjecture.",
        given: { conjecture: "sum of two odds is odd" },
        find: "a counterexample",
        answer: `${a} + ${b} = ${a + b}`,
        steps: [
          step("A counterexample is one specific case where the hypothesis is true but the conclusion is false.", "Definition of counterexample."),
          step(`${a} and ${b} are both odd, so the hypothesis is satisfied.`, "Check the hypothesis."),
          step(`But ${a} + ${b} = ${a + b}, which is even, not odd.`, "The conclusion fails.", [{ label: "sum", answer: String(a + b) }]),
          step("One counterexample is enough to disprove a conjecture.", "A conjecture is false if a single counterexample exists."),
        ],
        verify: { kind: "counterSumOdd", a, b },
      };
    }
    case "divisible": {
      const n = 3 * (2 * randInt(rng, 1, 6) + 1); // odd multiple of 3: 9, 15, 21, 27, 33, 39
      return {
        type: "GEO.2", subtype: "Counterexample",
        prompt: "Conjecture: If a number is divisible by 3, then it is divisible by 6. Give a counterexample that disproves the conjecture.",
        given: { conjecture: "divisible by 3 → divisible by 6" },
        find: "a counterexample",
        answer: `${n}`,
        steps: [
          step("A counterexample needs a number that satisfies the hypothesis (divisible by 3) but not the conclusion (divisible by 6).", "Definition of counterexample."),
          step(`${n} ÷ 3 = ${n / 3}, so ${n} is divisible by 3.`, "Check the hypothesis."),
          step(`${n} ÷ 6 = ${(n / 6).toFixed(1)}, not a whole number, so ${n} is not divisible by 6.`, "The conclusion fails.", [{ label: "number", answer: String(n) }]),
          step("One counterexample disproves the conjecture.", "A conjecture is false if a single counterexample exists."),
        ],
        verify: { kind: "counterDivisible", n },
      };
    }
    case "square": {
      const x = pick(rng, [0, 1]);
      return {
        type: "GEO.2", subtype: "Counterexample",
        prompt: "Conjecture: For every number x, x² > x. Give a counterexample that disproves the conjecture.",
        given: { conjecture: "x² > x for all x" },
        find: "a counterexample",
        answer: `x = ${x}`,
        steps: [
          step("A counterexample is a single value of x for which the statement is false.", "Definition of counterexample."),
          step(`Try x = ${x}: x² = ${x * x} and x = ${x}.`, "Substitute a test value."),
          step(`${x * x} is not greater than ${x}, so the statement fails.`, "The conclusion fails.", [{ label: "x", answer: String(x) }]),
          step("One counterexample disproves the conjecture.", "A conjecture is false if a single counterexample exists."),
        ],
        verify: { kind: "counterSquare", x },
      };
    }
    case "primeForm": {
      const x = pick(rng, [4, 7, 10, 13]);
      const v = 2 * x + 1; // 9, 15, 21, 27 — all composite
      return {
        type: "GEO.2", subtype: "Counterexample",
        prompt: "Conjecture: If x is a whole number, then 2x + 1 is a prime number. Give a counterexample that disproves the conjecture.",
        given: { conjecture: "2x + 1 is prime" },
        find: "a counterexample",
        answer: `x = ${x} gives 2x + 1 = ${v}, which is composite`,
        steps: [
          step("A counterexample is one whole number x that makes 2x + 1 composite.", "Definition of counterexample."),
          step(`For x = ${x}: 2(${x}) + 1 = ${v}.`, "Substitution."),
          step(`${v} = 3 × ${v / 3}, so ${v} has factors other than 1 and itself — it is not prime.`, "Definition of prime number.", [{ label: "value", answer: String(v) }]),
          step("One counterexample disproves the conjecture.", "A conjecture is false if a single counterexample exists."),
        ],
        verify: { kind: "counterPrimeForm", x },
      };
    }
    case "rectSquare": {
      const l = randInt(rng, 4, 9);
      const w = randInt(rng, 2, l - 1);
      return {
        type: "GEO.2", subtype: "Counterexample",
        prompt: "Conjecture: All rectangles are squares. Give a counterexample that disproves the conjecture.",
        given: { conjecture: "all rectangles are squares" },
        find: "a counterexample",
        answer: `A rectangle ${l} units by ${w} units`,
        steps: [
          step("A counterexample is a rectangle that is not a square.", "Definition of counterexample."),
          step(`A ${l}-by-${w} rectangle has four right angles, so it is a rectangle.`, "Definition of rectangle."),
          step(`Its length ${l} ≠ width ${w}, so its sides are not all congruent — it is not a square.`, "Definition of square.", [{ label: "dims", answer: `${l} by ${w}` }]),
          step("One counterexample disproves the conjecture.", "A conjecture is false if a single counterexample exists."),
        ],
        verify: { kind: "counterRect", l, w },
      };
    }
    case "adjacent": {
      const a = randInt(rng, 25, 60);
      const b = randInt(rng, 20, 55);
      return {
        type: "GEO.2", subtype: "Counterexample",
        prompt: "Conjecture: Adjacent angles are always supplementary. Give a counterexample (two angle measures) that disproves the conjecture.",
        given: { conjecture: "adjacent angles are supplementary" },
        find: "a counterexample",
        answer: `${a}° and ${b}° (sum ${a + b}°)`,
        steps: [
          step("Supplementary angles must sum to exactly 180°; adjacent angles only need to share a vertex and a side.", "Definitions of adjacent and supplementary angles."),
          step(`Two angles of ${a}° and ${b}° can share a vertex and a side, so they can be adjacent.`, "Check the hypothesis."),
          step(`${a}° + ${b}° = ${a + b}° ≠ 180°, so they are not supplementary.`, "The conclusion fails.", [{ label: "sum", answer: `${a + b}°` }]),
          step("One counterexample disproves the conjecture.", "A conjecture is false if a single counterexample exists."),
        ],
        verify: { kind: "counterAdjacent", a, b },
      };
    }
  }
}

// ── Chapter-test makers: conditionals and deductive reasoning ────────────────

interface CondBank {
  hyp: string;
  concl: string;
  negHyp: string;
  negConcl: string;
  converseTrue: boolean;
  why?: string;
}
const CONDITIONALS: CondBank[] = [
  {
    hyp: "a figure is a square", concl: "it is a rectangle",
    negHyp: "a figure is not a square", negConcl: "it is not a rectangle",
    converseTrue: false, why: "A rectangle with sides 6 and 4 is not a square.",
  },
  {
    hyp: "two angles are vertical angles", concl: "they are congruent",
    negHyp: "two angles are not vertical angles", negConcl: "they are not congruent",
    converseTrue: false, why: "Two base angles of an isosceles triangle are congruent but are not vertical angles.",
  },
  {
    hyp: "a number ends in 0", concl: "the number is divisible by 5",
    negHyp: "a number does not end in 0", negConcl: "the number is not divisible by 5",
    converseTrue: false, why: "25 is divisible by 5 but does not end in 0.",
  },
  {
    hyp: "two angles are complementary", concl: "the sum of their measures is 90°",
    negHyp: "two angles are not complementary", negConcl: "the sum of their measures is not 90°",
    converseTrue: true,
  },
  {
    hyp: "a triangle is equilateral", concl: "the triangle is equiangular",
    negHyp: "a triangle is not equilateral", negConcl: "the triangle is not equiangular",
    converseTrue: true,
  },
];

function ifThen(h: string, c: string): string {
  return `If ${h}, then ${c}.`;
}

function makeConditionalParts(rng: RNG): GeometryProblem {
  const s = pick(rng, CONDITIONALS);
  const askHyp = rng() < 0.5;
  const answer = askHyp ? s.hyp : s.concl;
  return {
    type: "GEO.2",
    subtype: "ConditionalParts",
    prompt: `For the conditional statement "${ifThen(s.hyp, s.concl)}" — identify the ${askHyp ? "hypothesis" : "conclusion"}.`,
    given: { statement: ifThen(s.hyp, s.concl) },
    find: askHyp ? "hypothesis" : "conclusion",
    answer,
    steps: [
      step("In an if-then statement, the part after 'if' is the hypothesis and the part after 'then' is the conclusion.", "Definition of hypothesis and conclusion."),
      step(`The ${askHyp ? "hypothesis" : "conclusion"} is: ${answer}.`, "Identify the requested part.", [{ label: askHyp ? "hypothesis" : "conclusion", answer }]),
    ],
    verify: { kind: "oneOf", options: [answer] },
  };
}

function makeConverseTruth(rng: RNG): GeometryProblem {
  const falseConverse = CONDITIONALS.filter((c) => !c.converseTrue);
  const s = pick(rng, falseConverse);
  const stmt = ifThen(s.concl, s.hyp);
  return {
    type: "GEO.2",
    subtype: "ConverseTruth",
    prompt: `Write the converse of "${ifThen(s.hyp, s.concl)}" Then tell whether the converse is true or false. If it is false, the answer is False.`,
    given: { statement: ifThen(s.hyp, s.concl) },
    find: "converse and its truth value",
    answer: "False",
    steps: [
      step("The converse switches the hypothesis and the conclusion.", "Definition of converse."),
      step(`Converse: ${stmt}`, "Switch hypothesis and conclusion."),
      step(s.why ?? "The converse does not follow.", "A counterexample disproves the converse."),
      step("The converse is False.", "Counterexample.", [{ label: "truth", answer: "False" }]),
    ],
    verify: { kind: "oneOf", options: ["False"] },
  };
}

function makeConditionalForms(rng: RNG): GeometryProblem {
  const s = pick(rng, CONDITIONALS);
  const form = pick(rng, ["converse", "inverse", "contrapositive"] as const);
  const stmt =
    form === "converse" ? ifThen(s.concl, s.hyp)
    : form === "inverse" ? ifThen(s.negHyp, s.negConcl)
    : ifThen(s.negConcl, s.negHyp);
  return {
    type: "GEO.2",
    subtype: "ConditionalForms",
    prompt: `Write the ${form} of the conditional statement: "${ifThen(s.hyp, s.concl)}"`,
    given: { statement: ifThen(s.hyp, s.concl) },
    find: `the ${form}`,
    answer: stmt,
    steps: [
      step(
        form === "converse"
          ? "The converse switches the hypothesis and the conclusion."
          : form === "inverse"
            ? "The inverse negates the hypothesis and the conclusion."
            : "The contrapositive switches and negates the hypothesis and the conclusion; it is always equivalent to the original statement.",
        form === "converse" ? "Definition of converse." : form === "inverse" ? "Definition of inverse." : "Definition of contrapositive."
      ),
      step(`The ${form} is: ${stmt}`, `Form the ${form}.`, [{ label: form, answer: stmt }]),
    ],
    verify: { kind: "oneOf", options: [stmt] },
  };
}

function makeBiconditional(rng: RNG): GeometryProblem {
  const defs = [
    {
      iff: "Two angles are complementary if and only if the sum of their measures is 90°.",
      fwd: "If two angles are complementary, then the sum of their measures is 90°.",
      rev: "If the sum of two angles' measures is 90°, then the angles are complementary.",
    },
    {
      iff: "A point is on the perpendicular bisector of a segment if and only if it is equidistant from the segment's endpoints.",
      fwd: "If a point is on the perpendicular bisector of a segment, then it is equidistant from the endpoints.",
      rev: "If a point is equidistant from the endpoints of a segment, then it is on the perpendicular bisector.",
    },
    {
      iff: "Two lines are perpendicular if and only if they intersect to form right angles.",
      fwd: "If two lines are perpendicular, then they intersect to form right angles.",
      rev: "If two lines intersect to form right angles, then they are perpendicular.",
    },
  ] as const;
  const d = pick(rng, defs);
  return {
    type: "GEO.2",
    subtype: "Biconditional",
    prompt: `A definition can be written as a biconditional. Rewrite this definition using "if and only if": "${d.fwd}" (Its converse is also true.)`,
    given: { conditional: d.fwd, converse: d.rev },
    find: "the biconditional statement",
    answer: d.iff,
    steps: [
      step("When a conditional and its converse are both true, they combine into a biconditional with 'if and only if'.", "Definition of biconditional statement."),
      step(`The biconditional is: ${d.iff}`, "Combine the conditional and its converse.", [{ label: "biconditional", answer: d.iff }]),
    ],
    verify: { kind: "oneOf", options: [d.iff] },
  };
}

function makeDeductiveLaws(rng: RNG, difficulty: Difficulty, which: "detachment" | "syllogism"): GeometryProblem {
  const trap = difficulty >= 3 && rng() < 0.4;
  if (which === "detachment") {
    if (trap) {
      return {
        type: "GEO.2", subtype: "LawOfDetachment",
        prompt:
          'Use the Law of Detachment to make a valid conclusion, or state that no valid conclusion is possible: "If a number is divisible by 6, then it is divisible by 3." Given: 15 is divisible by 3.',
        given: { conditional: "div by 6 → div by 3", fact: "15 is divisible by 3" },
        find: "a valid conclusion",
        answer: "No valid conclusion",
        steps: [
          step("The Law of Detachment requires the hypothesis to be satisfied; here we are given the conclusion instead.", "Law of Detachment."),
          step("Knowing a number is divisible by 3 does not tell us it is divisible by 6 (15 is not).", "Affirming the conclusion is a logical error."),
          step("No valid conclusion is possible.", "Law of Detachment does not apply.", [{ label: "conclusion", answer: "No valid conclusion" }]),
        ],
        verify: { kind: "oneOf", options: ["No valid conclusion"] },
      };
    }
    const k = randInt(rng, 2, 9);
    const n = 12 * k;
    return {
      type: "GEO.2", subtype: "LawOfDetachment",
      prompt:
        `Use the Law of Detachment to make a valid conclusion: "If a number is divisible by 12, then it is divisible by 4." Given: ${n} is divisible by 12. What can you conclude about ${n}?`,
      given: { conditional: "div by 12 → div by 4", fact: `${n} is divisible by 12` },
      find: "the conclusion",
      answer: `${n} is divisible by 4`,
      steps: [
        step("The given fact satisfies the hypothesis of the conditional.", "Law of Detachment."),
        step(`Therefore the conclusion must hold for ${n}: ${n} is divisible by 4 (indeed ${n} ÷ 4 = ${n / 4}).`, "Law of Detachment.", [
          { label: "conclusion", answer: `${n} is divisible by 4` },
        ]),
      ],
      verify: { kind: "oneOf", options: [`${n} is divisible by 4`] },
    };
  }
  // Syllogism
  const chain = pick(rng, [
    {
      s1: "If a figure is a square, then it is a rectangle.",
      s2: "If a figure is a rectangle, then it is a parallelogram.",
      answer: "If a figure is a square, then it is a parallelogram.",
    },
    {
      s1: "If a number is divisible by 12, then it is divisible by 6.",
      s2: "If a number is divisible by 6, then it is divisible by 3.",
      answer: "If a number is divisible by 12, then it is divisible by 3.",
    },
    {
      s1: "If two angles are complementary to the same angle, then the angles are congruent.",
      s2: "If two angles are congruent, then their measures are equal.",
      answer: "If two angles are complementary to the same angle, then their measures are equal.",
    },
  ] as const);
  return {
    type: "GEO.2", subtype: "LawOfSyllogism",
    prompt: `Use the Law of Syllogism to write a new conditional that follows from the pair: (1) ${chain.s1} (2) ${chain.s2}`,
    given: { statements: "two conditionals" },
    find: "the combined conditional",
    answer: chain.answer,
    steps: [
      step("The conclusion of the first statement is the hypothesis of the second, so the two can be chained.", "Law of Syllogism."),
      step(`Combined: ${chain.answer}`, "Law of Syllogism.", [{ label: "combined", answer: chain.answer }]),
    ],
    verify: { kind: "oneOf", options: [chain.answer] },
  };
}

function makeInductiveDeductive(rng: RNG): GeometryProblem {
  const cases = [
    { text: "Maria notices that the sum of the angles in every triangle she has measured is 180°, so she concludes all triangles have angle sum 180°.", answer: "Inductive reasoning", why: "She generalizes from specific observed cases." },
    { text: "Using the Triangle Angle-Sum Theorem, Jamal proves the angles of a specific triangle sum to 180°.", answer: "Deductive reasoning", why: "He starts from a proven general rule and applies it to a specific case." },
    { text: "Each time it rains, the practice field floods. The coach concludes the field will flood after today's rain.", answer: "Inductive reasoning", why: "The prediction is based on a pattern of past cases." },
    { text: "All squares are rectangles. ABCD is a square, so ABCD is a rectangle.", answer: "Deductive reasoning", why: "The conclusion follows logically from accepted statements." },
  ] as const;
  const c = pick(rng, cases);
  return {
    type: "GEO.2",
    subtype: "InductiveVsDeductive",
    prompt: `Tell whether the reasoning is inductive or deductive: ${c.text}`,
    given: { scenario: c.text },
    find: "the type of reasoning",
    answer: c.answer,
    steps: [
      step("Inductive reasoning reaches a conclusion from observed patterns or cases; deductive reasoning applies general rules to reach a certain conclusion.", "Definitions of inductive and deductive reasoning."),
      step(c.why, "Match the scenario to the definition."),
      step(`This is ${c.answer.toLowerCase()}.`, "Classify the reasoning.", [{ label: "type", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

function makeAlgebraicReasoning(rng: RNG): GeometryProblem {
  const a = randInt(rng, 2, 6);
  const x = randInt(rng, 2, 11);
  const b = randInt(rng, 1, 12);
  const c = a * x + b;
  return {
    type: "GEO.2",
    subtype: "AlgebraicReasoning",
    prompt: `Solve the equation and name the property used in the key step: ${a}x + ${b} = ${c}. Find x.`,
    given: { equation: `${a}x + ${b} = ${c}` },
    find: "x",
    answer: `x = ${x}`,
    steps: [
      step(`Subtract ${b} from both sides: ${a}x = ${c - b}.`, "Subtraction Property of Equality.", [
        { label: `${a}x`, answer: String(c - b) },
      ]),
      step(`Divide both sides by ${a}: x = ${x}.`, "Division Property of Equality.", [{ label: "x", answer: String(x) }]),
      step(`Check: ${a}(${x}) + ${b} = ${c}. ✓`, "Substitution (check)."),
    ],
    verify: { kind: "linearEq", a, b, c },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const REASONING_LESSON_POOL: MakerEntry[] = [
  M("NumberPattern", 1, (rng, d) => (rng() < 0.6 ? makeArithmeticPattern(rng, d) : makeGeometricPattern(rng))),
  M("FigurePattern", 1, (rng, d) => makeFigurePattern(rng, d)),
  M("Counterexample", 2, (rng) => makeCounterexample(rng)),
  M("ConjectureSum", 2, (rng) => makeOddSumConjecture(rng)),
];

export const REASONING_TEST_POOL: MakerEntry[] = [
  M("ConditionalParts", 1, (rng) => makeConditionalParts(rng)),
  M("ConditionalForms", 1, (rng) => makeConditionalForms(rng)),
  M("ConverseTruth", 3, (rng) => makeConverseTruth(rng)),
  M("Biconditional", 2, (rng) => makeBiconditional(rng)),
  M("LawOfDetachment", 2, (rng, d) => makeDeductiveLaws(rng, d, "detachment")),
  M("LawOfSyllogism", 2, (rng, d) => makeDeductiveLaws(rng, d, "syllogism")),
  M("InductiveVsDeductive", 2, (rng) => makeInductiveDeductive(rng)),
  M("AlgebraicReasoning", 2, (rng) => makeAlgebraicReasoning(rng)),
];

export function generateReasoningProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? REASONING_LESSON_POOL.filter((e) => only.includes(e.subtype)) : REASONING_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}

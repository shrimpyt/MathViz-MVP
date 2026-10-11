// calculus.ts
// AP Calculus AB/BC — module wiring for the Euclid Engine.
//
// Each entry follows the CurriculumEntry shape from CurriculumRegistry.ts.
// Generators are pure + seeded (mulberry32); difficulty tiers are cumulative
// and live in the factories. "Classical" mode is treated exactly like
// "Review": full worked steps are always emitted by the factories, and the
// default counts match Review.
//
// NOTE (wiring): the MathProblem union in src/lib/types.ts does not yet
// include the calculus problem shapes ("CALC_MCQ" / AP_FRQ with subject
// "calc"), so generate functions cast through `asMathProblems` for now.
// See tests/calculus/WIRING.md for the integration steps; after the union is
// extended the casts can be dropped.

import type { CurriculumEntry, GenerateOptions, DifficultyLevel } from "./CurriculumRegistry";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";
import type { RNG } from "@/lib/math-utils";
import { mulberry32 } from "@/lib/math-utils";
import type { CalculusProblem } from "@/lib/factories/CalculusUtils";
import { generateLimitProblems } from "@/lib/factories/CalculusLimits";
import { generateDerivativeProblems } from "@/lib/factories/CalculusDerivatives";
import { generateDerivAppsProblems } from "@/lib/factories/CalculusDerivApps";
import { generateIntegralProblems } from "@/lib/factories/CalculusIntegrals";
import { generateCalculusFRQs } from "@/lib/factories/CalculusFRQ";

function difficultyOf(options?: GenerateOptions): DifficultyLevel {
  return options?.difficulty ?? 2;
}

/** "Classical" (Classical Notes) gets Review treatment: full steps, Review counts. */
function drillCount(mode: OutputMode, options?: GenerateOptions): number {
  return options?.count ?? (mode === "Review" || mode === "Classical" ? 9 : 3);
}

function drillEntry(
  gen: (rng: RNG, n: number, d: DifficultyLevel) => CalculusProblem[]
): CurriculumEntry["generate"] {
  return (mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] => {
    const rng = mulberry32(seed);
    return gen(rng, drillCount(mode, options), difficultyOf(options));
  };
}

function frqProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = options?.count ?? (mode === "Review" || mode === "Classical" ? 3 : 2);
  return generateCalculusFRQs(rng, count);
}

function mixedProblems(mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  const count = drillCount(mode, options);
  const difficulty = difficultyOf(options);
  const gens = [
    generateLimitProblems,
    generateDerivativeProblems,
    generateDerivAppsProblems,
    generateIntegralProblems,
  ];
  const out: CalculusProblem[] = [];
  for (let i = 0; i < count; i++) out.push(gens[i % gens.length](rng, 1, difficulty)[0]);
  return out;
}

/**
 * Calculus entries for the curriculum registry (Topic 21: AP Calculus).
 * The registry snippet in tests/calculus/REGISTRY_SNIPPET.md shows how these
 * are spliced into CURRICULUM_REGISTRY. No placeholder ids are replaced —
 * all six entries are new.
 */
export const CALCULUS_ENTRIES: CurriculumEntry[] = [
  {
    id: "calc-limits",
    topic: 21,
    topicTitle: "Topic 21: AP Calculus AB",
    title: "Limits & Continuity",
    story: "Read limits from graphs, tables, and algebra — including one-sided and infinite limits.",
    teks: "AP Calculus AB",
    description: "Graphical, numerical, and algebraic limits: removable and jump discontinuities, one-sided limits, infinite limits, end behavior, and difference quotients.",
    generate: drillEntry(generateLimitProblems),
  },
  {
    id: "calc-derivative-rules",
    topic: 21,
    topicTitle: "Topic 21: AP Calculus AB",
    title: "Derivative Rules",
    story: "Differentiate anything the AP exam throws at you: power, product, quotient, chain, and trig.",
    teks: "AP Calculus AB",
    description: "Power rule, product and quotient rules, chain rule (polynomial, trig, exponential), and trig derivatives at special angles. Calculator-active and no-calculator flavors.",
    generate: drillEntry(generateDerivativeProblems),
  },
  {
    id: "calc-derivative-apps",
    topic: 21,
    topicTitle: "Topic 21: AP Calculus AB",
    title: "Applications of Derivatives",
    story: "Tangent lines, curve analysis, optimization, and related rates.",
    teks: "AP Calculus AB",
    description: "Tangent and normal lines, increasing/decreasing intervals, extrema, curve sketching, optimization, and related rates with AP justification language.",
    generate: drillEntry(generateDerivAppsProblems),
  },
  {
    id: "calc-integrals",
    topic: 21,
    topicTitle: "Topic 21: AP Calculus AB · BC",
    title: "Integrals & the Fundamental Theorem",
    story: "Accumulate: antiderivatives, definite integrals, area, FTC, u-substitution.",
    teks: "AP Calculus AB · BC",
    description: "Indefinite and definite integrals, area between curves, the Fundamental Theorem of Calculus, u-substitution, and BC-only improper integrals.",
    generate: drillEntry(generateIntegralProblems),
  },
  {
    id: "calc-frq",
    topic: 21,
    topicTitle: "Topic 21: AP Calculus AB · BC",
    title: "AP-Style Free Response",
    story: "Full AP-style FRQs built around one stimulus: a graph, a table, or a scenario.",
    teks: "AP Calculus AB · BC",
    description: "Stimulus-based multi-part FRQs with AP justification language: f′ graphs (no calculator), rate tables (calculator active), and particle-motion scenarios.",
    generate: frqProblems,
  },
  {
    id: "calc-mcq-mixed",
    topic: 21,
    topicTitle: "Topic 21: AP Calculus AB · BC",
    title: "AP-Style Multiple Choice: Mixed Review",
    story: "Mixed AP-style multiple choice across every calculus topic.",
    teks: "AP Calculus AB · BC",
    description: "Five-choice AP-style questions cycling through limits, derivative rules, applications, and integrals, with calculator-active and no-calculator flavors flagged per question.",
    generate: mixedProblems,
  },
];

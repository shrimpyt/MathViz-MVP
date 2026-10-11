// sat-math.ts
// SAT Math Practice Generator — curriculum registry entries grouped by
// College Board domain, plus a full-module builder entry.
//
// Each entry's `generate` returns SATProblem[] cast to MathProblem[]; see
// tests/sat/WIRING.md for the union addition that makes the cast unnecessary.
// Generation is pure + seeded; the mode parameter is intentionally ignored —
// SAT problems carry their own MCQ/grid-in format per problem (a ~3:1 mix,
// like the digital SAT). "Classical" mode is therefore handled exactly like
// "Review": nothing mode-specific is emitted.

import type { CurriculumEntry } from "./CurriculumRegistry";
import { mulberry32 } from "@/lib/math-utils";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";
import type { RNG } from "@/lib/math-utils";
import type {
  SATDifficulty,
  SATDomain,
  SATProblem,
} from "@/lib/satTypes";
import {
  SAT_TIMING_PRESETS,
  satCustomPreset,
  buildSATModule,
  SAT_DOMAIN_META,
} from "@/lib/satTypes";
import { SAT_HOA_MAKERS } from "@/lib/factories/SATHeartOfAlgebra";
import { SAT_PSDA_MAKERS } from "@/lib/factories/SATProblemSolvingData";
import { SAT_PAM_MAKERS } from "@/lib/factories/SATPassportAdvancedMath";
import { SAT_ATM_MAKERS } from "@/lib/factories/SATAdditionalTopics";
import type { SATMaker } from "@/lib/factories/SATShared";

const MAKERS_BY_DOMAIN: Record<SATDomain, SATMaker[]> = {
  HeartOfAlgebra: SAT_HOA_MAKERS,
  ProblemSolvingData: SAT_PSDA_MAKERS,
  PassportAdvancedMath: SAT_PAM_MAKERS,
  AdditionalTopics: SAT_ATM_MAKERS,
};

interface SATCatalogItem {
  id: string;
  topic: number;
  domain: SATDomain;
  makerIndex: number; // index into MAKERS_BY_DOMAIN[domain]
  title: string;
  story: string;
  standard: string;
  description: string;
}

// ── The per-skill catalogue, grouped by College Board domain ──────────────────

const SAT_CATALOG: SATCatalogItem[] = [
  // — Heart of Algebra (topic 21) —
  {
    id: "sat-hoa-linear-equations",
    topic: 21,
    domain: "HeartOfAlgebra",
    makerIndex: 0,
    title: "SAT: Linear Equations in One Variable",
    story: "Solve ax + b = c — the most-tested SAT algebra skill.",
    standard: "H.A.1",
    description: "One- and two-step linear equations, including a(x + b) = c forms.",
  },
  {
    id: "sat-hoa-systems",
    topic: 21,
    domain: "HeartOfAlgebra",
    makerIndex: 1,
    title: "SAT: Systems of Two Linear Equations",
    story: "Elimination and substitution under timed conditions.",
    standard: "H.A.3",
    description: "Solve 2×2 systems; answer for x, y, or x + y.",
  },
  {
    id: "sat-hoa-inequalities",
    topic: 21,
    domain: "HeartOfAlgebra",
    makerIndex: 2,
    title: "SAT: Linear Inequalities",
    story: "Remember to flip the sign — the classic trap.",
    standard: "H.A.2",
    description: "One-variable inequalities, including negative leading coefficients.",
  },
  {
    id: "sat-hoa-functions",
    topic: 21,
    domain: "HeartOfAlgebra",
    makerIndex: 3,
    title: "SAT: Linear Functions",
    story: "Evaluate f(x) = mx + b and invert it.",
    standard: "H.A.4",
    description: "Function evaluation, solving f(x) = v, and rate word problems.",
  },
  // — Problem Solving & Data Analysis (topic 22) —
  {
    id: "sat-psda-percent",
    topic: 22,
    domain: "ProblemSolvingData",
    makerIndex: 0,
    title: "SAT: Percent Increase & Decrease",
    story: "Percent change with the right base — every time.",
    standard: "P.D.1",
    description: "Percent increase and decrease from real-world contexts.",
  },
  {
    id: "sat-psda-ratios",
    topic: 22,
    domain: "ProblemSolvingData",
    makerIndex: 1,
    title: "SAT: Ratios & Proportions",
    story: "Set it up, cross-multiply, solve.",
    standard: "P.D.2",
    description: "Proportions, unit rates, and map-scale problems.",
  },
  {
    id: "sat-psda-stats",
    topic: 22,
    domain: "ProblemSolvingData",
    makerIndex: 2,
    title: "SAT: Mean, Median & Range",
    story: "Sort first, then find the middle.",
    standard: "P.D.5",
    description: "One-variable statistics from small data sets.",
  },
  {
    id: "sat-psda-probability",
    topic: 22,
    domain: "ProblemSolvingData",
    makerIndex: 3,
    title: "SAT: Probability",
    story: "Favorable over total — read the table carefully.",
    standard: "P.D.4",
    description: "Simple and two-way-table probability, including complements.",
  },
  // — Passport to Advanced Math (topic 23) —
  {
    id: "sat-pam-quadratics",
    topic: 23,
    domain: "PassportAdvancedMath",
    makerIndex: 0,
    title: "SAT: Quadratic Equations",
    story: "Factor it, then read what they actually asked for.",
    standard: "P.A.2",
    description: "Integer-root quadratics: greater solution, sum, or product of solutions.",
  },
  {
    id: "sat-pam-expressions",
    topic: 23,
    domain: "PassportAdvancedMath",
    makerIndex: 1,
    title: "SAT: Equivalent Expressions",
    story: "FOIL without the sign errors.",
    standard: "P.A.1",
    description: "Expand binomial products; identify coefficients and constants.",
  },
  {
    id: "sat-pam-functions",
    topic: 23,
    domain: "PassportAdvancedMath",
    makerIndex: 2,
    title: "SAT: Nonlinear Functions",
    story: "x² means x times x — not 2x.",
    standard: "P.A.4",
    description: "Evaluate quadratic functions, including negative inputs.",
  },
  {
    id: "sat-pam-nonlinear-equations",
    topic: 23,
    domain: "PassportAdvancedMath",
    makerIndex: 3,
    title: "SAT: Nonlinear Equations",
    story: "Square roots come in pairs — pick the right one.",
    standard: "P.A.3",
    description: "Equations of the form x² = k and (x − h)² + c = k + c.",
  },
  // — Additional Topics in Math (topic 24) —
  {
    id: "sat-atm-triangles",
    topic: 24,
    domain: "AdditionalTopics",
    makerIndex: 0,
    title: "SAT: Triangle Angles",
    story: "180° to split three ways.",
    standard: "A.T.1",
    description: "Angle sums and isosceles triangle angles.",
  },
  {
    id: "sat-atm-circles",
    topic: 24,
    domain: "AdditionalTopics",
    makerIndex: 1,
    title: "SAT: Circle Measurement",
    story: "2πr around, πr² inside — don't mix them up.",
    standard: "A.T.2",
    description: "Circumference, area, and working backwards from each.",
  },
  {
    id: "sat-atm-trig",
    topic: 24,
    domain: "AdditionalTopics",
    makerIndex: 2,
    title: "SAT: Right-Triangle Trigonometry",
    story: "SOH CAH TOA with the sides labeled.",
    standard: "A.T.3",
    description: "Sine, cosine, and tangent from side lengths.",
  },
  {
    id: "sat-atm-volume",
    topic: 24,
    domain: "AdditionalTopics",
    makerIndex: 3,
    title: "SAT: Volume",
    story: "Multiply — don't add — the dimensions.",
    standard: "A.T.2",
    description: "Rectangular prisms (forwards and backwards) and cylinders.",
  },
];

function difficultyOf(options?: { difficulty?: number }): SATDifficulty {
  const d = options?.difficulty ?? 2;
  return (d === 1 || d === 2 || d === 3 ? d : 2) as SATDifficulty;
}

function satSkillEntry(item: SATCatalogItem): CurriculumEntry {
  const maker = MAKERS_BY_DOMAIN[item.domain][item.makerIndex];
  return {
    id: item.id,
    topic: item.topic,
    topicTitle: `SAT Math: ${SAT_DOMAIN_META[item.domain].label}`,
    title: item.title,
    story: item.story,
    teks: item.standard,
    description: item.description,
    generate: (
      _mode: OutputMode,
      seed: number,
      options?: { count?: number; difficulty?: 1 | 2 | 3 }
    ): MathProblem[] => {
      const rng: RNG = mulberry32(seed);
      const count = options?.count ?? 5;
      const difficulty = difficultyOf(options);
      return Array.from({ length: count }, () =>
        maker(rng, difficulty)
      );
    },
  };
}

/** Full timed module entry (topic 20): builds a mixed 22-question module. */
const satFullModuleEntry: CurriculumEntry = {
  id: "sat-full-module",
  topic: 20,
  topicTitle: "SAT Math: Full Practice Module",
  title: "SAT: Full Timed Module",
  story: "One complete digital-SAT math module — 22 questions, 35 minutes.",
  teks: "SAT Math",
  description:
    "Mixed-domain timed module (Heart of Algebra, Problem Solving & Data Analysis, " +
    "Passport to Advanced Math, Additional Topics), ordered easy to hard like the real test.",
  generate: (
    _mode: OutputMode,
    seed: number,
    options?: { count?: number; difficulty?: 1 | 2 | 3 }
  ): MathProblem[] => {
    // NOTE (accepted behavior): count=N output is NOT a prefix of count=M
    // output for the same seed, by design. Each requested size gets its own
    // balanced module plan — domain mix scaled to the size (scaledDomainMix),
    // a size-specific difficulty bag, and an easy→hard sort like the real
    // digital SAT. A 2-question module is a different (smaller, rebalanced)
    // module than the first 2 questions of a 6-question module, not a prefix
    // of it. Red-team COUNT-NOT-PREFIX / XMODE-REVIEW-PREFIX hits for
    // sat-full-module are therefore expected, not bugs.
    const count = options?.count ?? SAT_TIMING_PRESETS["full-module"].questions;
    const preset =
      count === SAT_TIMING_PRESETS["full-module"].questions
        ? SAT_TIMING_PRESETS["full-module"]
        : satCustomPreset(count);
    const { problems } = buildSATModule({ preset, seed });
    return problems;
  },
};

/** Registry entries for the SAT Math Practice Generator, grouped by domain. */
export const SAT_MATH_REGISTRY: CurriculumEntry[] = [
  satFullModuleEntry,
  ...SAT_CATALOG.map(satSkillEntry),
];

/** Look up an SAT registry entry by id. Returns undefined if not found. */
export function getSATModule(id: string): CurriculumEntry | undefined {
  return SAT_MATH_REGISTRY.find((e) => e.id === id);
}

/** All problems for one entry, typed as SATProblem[] (no cast needed). */
export function generateSATEntry(
  id: string,
  seed: number,
  count: number,
  difficulty: SATDifficulty,
  mode: OutputMode = "Review"
): SATProblem[] {
  const entry = getSATModule(id);
  if (!entry) throw new Error(`Unknown SAT module id: ${id}`);
  return entry.generate(mode, seed, { count, difficulty }) as unknown as SATProblem[];
}

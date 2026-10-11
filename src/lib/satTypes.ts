// satTypes.ts
// SAT Math Practice Generator — problem types, timing presets, module builder.
//
// College Board digital-SAT domain taxonomy:
//   HeartOfAlgebra            — linear equations, inequalities, functions, systems
//   ProblemSolvingData        — ratios, percents, statistics, probability
//   PassportAdvancedMath      — quadratics, equivalent expressions, nonlinear functions
//   AdditionalTopics          — geometry, trigonometry, area/volume
//
// Generation stays pure + seeded (mulberry32). Rendering decisions
// (latexToText, pdfSafeText) live on the render side per AGENTS.md.

import { mulberry32 } from "./math-utils";
import type { RNG } from "./math-utils";
// Static imports are safe: the factories import this module with
// `import type` only, so there is no runtime import cycle.
import { SAT_HOA_MAKERS } from "./factories/SATHeartOfAlgebra";
import { SAT_PSDA_MAKERS } from "./factories/SATProblemSolvingData";
import { SAT_PAM_MAKERS } from "./factories/SATPassportAdvancedMath";
import { SAT_ATM_MAKERS } from "./factories/SATAdditionalTopics";

// ── Domains & formats ─────────────────────────────────────────────────────────

export type SATDomain =
  | "HeartOfAlgebra"
  | "ProblemSolvingData"
  | "PassportAdvancedMath"
  | "AdditionalTopics";

export type SATFormat = "MCQ" | "GridIn";

/** 1 = easy, 2 = medium, 3 = hard — mirrors the SAT's own difficulty ordering. */
export type SATDifficulty = 1 | 2 | 3;

export const SAT_DOMAIN_META: Record<
  SATDomain,
  { label: string; short: string; badge: string }
> = {
  HeartOfAlgebra: {
    label: "Heart of Algebra",
    short: "HOA",
    badge: "#2563eb",
  },
  ProblemSolvingData: {
    label: "Problem Solving & Data Analysis",
    short: "PSDA",
    badge: "#059669",
  },
  PassportAdvancedMath: {
    label: "Passport to Advanced Math",
    short: "PAM",
    badge: "#7c3aed",
  },
  AdditionalTopics: {
    label: "Additional Topics in Math",
    short: "ATM",
    badge: "#d97706",
  },
};

// ── Documented misconceptions (distractor error taxonomy) ─────────────────────
// Every MCQ distractor records one of these, plus a teacher-facing note.
// The data is stored on the problem so a future "misconception" view can
// display it without regenerating anything.

export type SATMisconception =
  | "sign-flip"
  | "off-by-one"
  | "order-of-operations"
  | "wrong-variable"
  | "dropped-negative"
  | "inverted-ratio"
  | "percent-base-error"
  | "mean-median-confusion"
  | "unsorted-data"
  | "inequality-flip-missed"
  | "area-circumference-confusion"
  | "diameter-as-radius"
  | "trig-ratio-swap"
  | "added-instead-of-multiplied"
  | "foil-error"
  | "root-sign-error"
  | "angle-sum-error"
  | "complement-error"
  | "range-error";

export interface SATDistractor {
  /** Display letter after shuffling (A–D in render order). */
  option: "A" | "B" | "C" | "D";
  /** Display text (LaTeX-flavoured, e.g. "-3/2", "36π", "x < 5"). */
  label: string;
  /** Numeric value of this option (for verification; π answers use coef·π). */
  value: number;
  /**
   * Documented common student error this option captures.
   * Present on every distractor; ABSENT on the keyed (correct) option.
   */
  misconception?: SATMisconception;
  /** Teacher-facing one-line description of the error (distractors only). */
  misconceptionNote?: string;
  /** True for the keyed answer; false for the three distractors. */
  isKey: boolean;
}

// ── Diagrams (optional; web + PDF renderers live in components/diagrams/) ────

export type SATDiagramParams =
  | {
      kind: "SatTable";
      headers: string[];
      rows: string[][];
      caption?: string;
    }
  | {
      kind: "SatRightTriangle";
      /** Leg adjacent to the marked angle, opposite leg, hypotenuse. */
      adj: number;
      opp: number;
      hyp: number;
      labels: { adj: string; opp: string; hyp: string };
      angleLabel: string;
    }
  | {
      kind: "SatTriangle";
      vertices: [string, string, string];
      angleLabels: [string, string, string];
    };

// ── The problem ───────────────────────────────────────────────────────────────

export interface SATProblem {
  /** Discriminator for the future MathProblem union addition (see WIRING.md). */
  type: "SAT";
  format: SATFormat;
  domain: SATDomain;
  /** Maker key, e.g. "LinearEquation1Var". Stable across seeds. */
  subdomain: string;
  /** College Board style standard code, e.g. "H.A.1". */
  standard: string;
  difficulty: SATDifficulty;
  /** Question stem (LaTeX-flavoured). */
  stem: string;
  diagram?: SATDiagramParams;
  /** MCQ only: exactly 4 options in A–D display order. */
  options?: [SATDistractor, SATDistractor, SATDistractor, SATDistractor];
  /** MCQ only: index of the keyed answer in `options`. */
  keyIndex?: 0 | 1 | 2 | 3;
  /** Grid-in only: every acceptable exact form (e.g. ["1/2", "0.5"]). */
  acceptedForms?: string[];
  /** Canonical correct display value. */
  key: string;
  /** Numeric value of the correct answer. */
  keyValue: number;
  /** Short worked solution for the answer key. */
  explanation: string;
  /**
   * Raw generation parameters for INDEPENDENT verification.
   * tests/sat/solvers.ts recomputes the answer from these via a separate
   * code path (never imports the factories).
   */
  verify: {
    params: Record<string, number | string | number[]>;
    note: string;
  };
}

// ── Timing presets (digital SAT: 22 questions / 35 minutes) ───────────────────

export interface SATTimingPreset {
  id: string;
  label: string;
  questions: number;
  minutes: number;
  blurb: string;
}

/** ~1.59 min/question, matching the digital SAT math module pacing. */
const MIN_PER_Q = 35 / 22;

export const SAT_TIMING_PRESETS: Record<string, SATTimingPreset> = {
  "full-module": {
    id: "full-module",
    label: "Full Module",
    questions: 22,
    minutes: 35,
    blurb: "One full digital-SAT math module: 22 questions, 35 minutes.",
  },
  "half-module": {
    id: "half-module",
    label: "Half Module",
    questions: 11,
    minutes: 18,
    blurb: "Half a module: 11 questions, 18 minutes.",
  },
  "quick-drill": {
    id: "quick-drill",
    label: "Quick Drill",
    questions: 6,
    minutes: 10,
    blurb: "Short timed drill: 6 questions, 10 minutes.",
  },
};

/** Build a custom preset: minutes scale from the official 35/22 pacing. */
export function satCustomPreset(questions: number): SATTimingPreset {
  const q = Math.max(1, Math.min(44, Math.round(questions)));
  return {
    id: "custom",
    label: `Custom (${q} Q)`,
    questions: q,
    minutes: Math.max(2, Math.ceil(q * MIN_PER_Q)),
    blurb: `${q} questions at official SAT pacing (~1.6 min/question).`,
  };
}

export interface SATModuleConfig {
  preset: SATTimingPreset;
  seed: number;
  /**
   * Per-domain question counts. Defaults to the digital-SAT weighting:
   * HOA 8, PSDA 5, PAM 6, ATM 3 (= 22).
   */
  domainMix?: Record<SATDomain, number>;
  /** Per-difficulty counts; defaults to easy→hard ordering like the real test. */
  difficultyMix?: Record<SATDifficulty, number>;
}

const DEFAULT_DOMAIN_MIX: Record<SATDomain, number> = {
  HeartOfAlgebra: 8,
  ProblemSolvingData: 5,
  PassportAdvancedMath: 6,
  AdditionalTopics: 3,
};

const DOMAIN_ORDER: SATDomain[] = [
  "HeartOfAlgebra",
  "ProblemSolvingData",
  "PassportAdvancedMath",
  "AdditionalTopics",
];

/** Scale the default domain weighting to any question total (largest remainder). */
function scaledDomainMix(total: number): Record<SATDomain, number> {
  const weights = DOMAIN_ORDER.map((d) => DEFAULT_DOMAIN_MIX[d]);
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const base = raw.map(Math.floor);
  const rem = total - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => r - base[i])
    .map((f, i) => [f, i] as const)
    .sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) base[order[k][1]]++;
  return Object.fromEntries(DOMAIN_ORDER.map((d, i) => [d, base[i]])) as Record<
    SATDomain,
    number
  >;
}

function defaultDifficultyMix(total: number): Record<SATDifficulty, number> {
  // Mirrors the SAT's own ordering: easy first, hard last.
  const e = Math.round(total * 0.32);
  const h = Math.round(total * 0.27);
  return { 1: e, 2: total - e - h, 3: h };
}

// Lazy imports avoid a module-evaluation cycle: factories import satTypes
// with `import type` only, so this runtime import is one-directional.
function makersFor(domain: SATDomain): readonly unknown[] {
  return domain === "HeartOfAlgebra"
    ? SAT_HOA_MAKERS
    : domain === "ProblemSolvingData"
    ? SAT_PSDA_MAKERS
    : domain === "PassportAdvancedMath"
    ? SAT_PAM_MAKERS
    : SAT_ATM_MAKERS;
}

function pickMakers<T>(
  rng: RNG,
  makers: readonly T[],
  count: number
): T[] {
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(makers[Math.floor(rng() * makers.length)]);
  }
  return out;
}

function difficultiesFor(
  rng: RNG,
  mix: Record<SATDifficulty, number>
): SATDifficulty[] {
  const bag: SATDifficulty[] = [];
  for (const d of [1, 2, 3] as SATDifficulty[]) {
    for (let i = 0; i < mix[d]; i++) bag.push(d);
  }
  // Shuffle, then the module is re-sorted easy→hard at the end.
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/**
 * Build a full SAT practice module.
 *
 * Problems are ordered easy → hard within the module, mirroring the digital
 * SAT's difficulty ordering. ~3:1 MCQ to grid-in ratio like the real test.
 */
export function buildSATModule(
  config: SATModuleConfig
): { problems: SATProblem[]; minutes: number; questions: number } {
  const rng = mulberry32(config.seed);
  const total = config.preset.questions;
  const mix = config.domainMix ?? scaledDomainMix(total);
  const diffMix = config.difficultyMix ?? defaultDifficultyMix(total);

  const plan: { maker: unknown; difficulty: SATDifficulty }[] = [];
  const diffs = difficultiesFor(rng, diffMix);
  let di = 0;
  for (const domain of DOMAIN_ORDER) {
    const count = mix[domain] ?? 0;
    const chosen = pickMakers(rng, makersFor(domain), count);
    for (const maker of chosen) {
      plan.push({
        maker,
        difficulty: diffs[di++ % diffs.length],
      });
    }
  }

  const problems: SATProblem[] = plan.map(({ maker, difficulty }) =>
    (maker as (rng: RNG, d: SATDifficulty) => SATProblem)(rng, difficulty)
  );

  // Easy → hard ordering, like the real SAT module.
  problems.sort((a, b) => a.difficulty - b.difficulty);
  return {
    problems,
    minutes: config.preset.minutes,
    questions: total,
  };
}

/**
 * Synchronous single-domain generation used by the curriculum registry.
 * Each maker assigns its own MCQ/grid-in format (~3:1 mix per maker).
 */
export function generateSATProblems(
  domain: SATDomain,
  seed: number,
  count: number,
  difficulty: SATDifficulty
): SATProblem[] {
  const rng = mulberry32(seed);
  const list = makersFor(domain);
  return pickMakers(rng, list, count).map((m) =>
    (m as (rng: RNG, d: SATDifficulty) => SATProblem)(rng, difficulty)
  );
}

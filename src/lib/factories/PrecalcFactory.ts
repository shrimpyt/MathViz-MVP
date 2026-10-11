// PrecalcFactory.ts
// Unified entry point for the AP Precalculus generators.
// Routes a topic tag to the right domain factory; pure + seeded.

import type { RNG } from "./PrecalcTypes";
import type { PrecalcDifficulty, PrecalcProblem, PrecalcTopicTag } from "./PrecalcTypes";
import { generateVectorProblems } from "./PrecalcVectorsFactory";
import { generateComplexProblems } from "./PrecalcComplexFactory";
import { generateConicProblems } from "./PrecalcConicsFactory";
import { generateTrigProblems } from "./PrecalcTrigFactory";
import { generateLimitProblems } from "./PrecalcLimitsFactory";
import { generateParamPolarProblems } from "./PrecalcParamPolarFactory";
import { generatePrecalcFRQs } from "./PrecalcFRQFactory";

export type PrecalcGenTopic = PrecalcTopicTag | "frq";

export const PRECALC_GEN_TOPICS: readonly PrecalcGenTopic[] = [
  "vectors",
  "complex",
  "conics",
  "trig",
  "limits",
  "parametric-polar",
  "frq",
];

/**
 * Generate n precalculus problems for a topic at the given cumulative
 * difficulty tier (1|2|3). "frq" yields stimulus-based multi-part FRQs;
 * every other topic yields AP-style multiple choice.
 */
export function generatePrecalcProblems(
  rng: RNG,
  topic: PrecalcGenTopic,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcProblem[] {
  switch (topic) {
    case "vectors":
      return generateVectorProblems(rng, n, difficulty);
    case "complex":
      return generateComplexProblems(rng, n, difficulty);
    case "conics":
      return generateConicProblems(rng, n, difficulty);
    case "trig":
      return generateTrigProblems(rng, n, difficulty);
    case "limits":
      return generateLimitProblems(rng, n, difficulty);
    case "parametric-polar":
      return generateParamPolarProblems(rng, n, difficulty);
    case "frq":
      return generatePrecalcFRQs(rng, n, difficulty);
  }
}

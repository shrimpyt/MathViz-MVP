// precalculus.ts
// AP Precalculus curriculum entries: six multiple-choice topics plus one
// stimulus-based FRQ practice entry. Each entry generates seeded,
// deterministic problems via the precalculus factories.
//
// WIRING: append PRECALCULUS_ENTRIES to CURRICULUM_REGISTRY in
// CurriculumRegistry.ts (see tests/precalculus/WIRING.md).

import type { CurriculumEntry, GenerateOptions } from "./CurriculumRegistry";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";
import { mulberry32 } from "@/lib/math-utils";
import {
  generatePrecalcProblems,
  type PrecalcGenTopic,
} from "@/lib/factories/PrecalcFactory";
import type { DifficultyLevel } from "./CurriculumRegistry";

const PRECALC_TOPIC = 16;
const PRECALC_TOPIC_TITLE = "Topic 16: Precalculus (AP Style)";

function precalcEntry(
  id: string,
  title: string,
  story: string,
  topicTag: PrecalcGenTopic,
  description: string
): CurriculumEntry {
  const generate = (
    mode: OutputMode,
    seed: number,
    options?: GenerateOptions
  ): MathProblem[] => {
    const rng = mulberry32(seed);
    const count = options?.count ?? (mode === "Review" ? 9 : 3);
    const difficulty = (options?.difficulty ?? 2) as DifficultyLevel;
    return generatePrecalcProblems(
      rng,
      topicTag,
      count,
      difficulty
    );
  };
  return {
    id,
    topic: PRECALC_TOPIC,
    topicTitle: PRECALC_TOPIC_TITLE,
    title,
    story,
    teks: "AP Precalculus",
    description,
    generate,
  };
}

/** The seven Precalculus entries, in curriculum order. */
export const PRECALCULUS_ENTRIES: CurriculumEntry[] = [
  precalcEntry(
    "precalc-vectors",
    "Vectors",
    "Add, scale, and dot vectors — magnitude, direction, and orthogonality.",
    "vectors",
    "AP-style multiple choice on vector operations, magnitude, dot product, unit vectors, and the angle between vectors. Calculator-active items are flagged."
  ),
  precalcEntry(
    "precalc-complex",
    "Complex Numbers",
    "Operate in a+bi and convert to polar form with De Moivre.",
    "complex",
    "AP-style multiple choice on complex arithmetic, modulus, conjugates, powers of i, rectangular-polar conversion, and De Moivre's theorem."
  ),
  precalcEntry(
    "precalc-conics",
    "Conic Sections",
    "Read centers, foci, and vertices straight from standard form.",
    "conics",
    "AP-style multiple choice identifying conics and finding centers, radii, vertices, foci, and directrices — including completing the square."
  ),
  precalcEntry(
    "precalc-trig",
    "Trigonometry & Trig Functions",
    "Unit circle exact values, trig graphs, inverses, and equations.",
    "trig",
    "AP-style multiple choice on unit-circle values, amplitude/period/phase shift, inverse trig, trig equations, and calculator-active evaluation."
  ),
  precalcEntry(
    "precalc-limits",
    "Introduction to Limits",
    "Estimate from tables and graphs; evaluate with limit laws.",
    "limits",
    "AP-style multiple choice on numerical and graphical limits, one-sided limits, removable discontinuities, and limit laws."
  ),
  precalcEntry(
    "precalc-param-polar",
    "Parametric & Polar",
    "Plot polar points, convert coordinates, eliminate parameters.",
    "parametric-polar",
    "AP-style multiple choice on parametric evaluation, eliminating the parameter, polar-rectangular conversion, and polar curves/symmetry."
  ),
  precalcEntry(
    "precalc-frq",
    "AP FRQ Practice",
    "Stimulus-based free response: one graph, table, or scenario per question.",
    "frq",
    "Multi-part free-response questions (a)-(d) built around a single stimulus — graph, table, or verbal scenario — with AP-style justifications in the key."
  ),
];

/** Look up a precalculus entry by id. */
export function getPrecalcModule(id: string): CurriculumEntry | undefined {
  return PRECALCULUS_ENTRIES.find((e) => e.id === id);
}

// test-matrix.ts
// Full generation matrix: every topic x mode x difficulty x count {1,3,12,25}.
// Checks: counts, shape invariants, difficulty-tier filtering, PDF-safe
// strings, seed reproducibility, mode invariance of generation.

import { check, resetCounters, result, printResult, isMain, type SuiteResult } from "./helpers";
import { PRECALCULUS_ENTRIES } from "@/modules/precalculus";
import type { PrecalcDifficulty, PrecalcMCQ, PrecalcFRQ } from "@/lib/factories/PrecalcTypes";
import { validateFRQ } from "@/lib/apTypes";
import { VECTOR_DIFFICULTY_TIERS } from "@/lib/factories/PrecalcVectorsFactory";
import { COMPLEX_DIFFICULTY_TIERS } from "@/lib/factories/PrecalcComplexFactory";
import { CONIC_DIFFICULTY_TIERS } from "@/lib/factories/PrecalcConicsFactory";
import { TRIG_DIFFICULTY_TIERS } from "@/lib/factories/PrecalcTrigFactory";
import { LIMIT_DIFFICULTY_TIERS } from "@/lib/factories/PrecalcLimitsFactory";
import { PARAMPOLAR_DIFFICULTY_TIERS } from "@/lib/factories/PrecalcParamPolarFactory";
import type { OutputMode } from "@/lib/ProblemFactory";

const TOPIC_TAGS = ["vectors", "complex", "conics", "trig", "limits", "parametric-polar", "frq"] as const;

const TIER_MAP: Record<string, Record<PrecalcDifficulty, readonly string[]>> = {
  vectors: VECTOR_DIFFICULTY_TIERS,
  complex: COMPLEX_DIFFICULTY_TIERS,
  conics: CONIC_DIFFICULTY_TIERS,
  trig: TRIG_DIFFICULTY_TIERS,
  limits: LIMIT_DIFFICULTY_TIERS,
  "parametric-polar": PARAMPOLAR_DIFFICULTY_TIERS,
};

const DIAGRAM_KINDS = new Set([
  "unit-circle", "vectors", "trig-graph", "conic", "polar-grid", "limit-graph", "complex-plane",
]);

const PDF_UNSAFE = /\\[a-zA-Z]/; // raw LaTeX command left in a display string

function unlockedSubtypes(topic: string, difficulty: PrecalcDifficulty): Set<string> {
  const tiers = TIER_MAP[topic];
  const s = new Set<string>();
  for (let d = 1 as PrecalcDifficulty; d <= difficulty; d = (d + 1) as PrecalcDifficulty) {
    for (const st of tiers[d]) s.add(st);
  }
  return s;
}

function checkMCQ(p: PrecalcMCQ, topic: string, difficulty: PrecalcDifficulty, where: string): void {
  check(p.type === "PRECALC_MCQ", `${where}: type is PRECALC_MCQ`);
  check(p.topicTag === topic, `${where}: topicTag ${p.topicTag} === ${topic}`);
  check(typeof p.calculator === "boolean", `${where}: calculator is boolean`);
  check(p.stem.length > 5, `${where}: stem non-empty`);
  check(!PDF_UNSAFE.test(p.stem), `${where}: stem has no raw LaTeX (${p.stem.slice(0, 60)})`);
  check(p.choices.length === 4, `${where}: 4 choices`);
  check(p.choices.every((c) => typeof c === "string" && c.length > 0), `${where}: choices non-empty`);
  check(new Set(p.choices).size === 4, `${where}: choices distinct (${p.choices.join(" | ")})`);
  check(p.choices.every((c) => !PDF_UNSAFE.test(c)), `${where}: choices PDF-safe`);
  check(Number.isInteger(p.correctIndex) && p.correctIndex >= 0 && p.correctIndex < 4, `${where}: correctIndex in range`);
  check(p.choices[p.correctIndex] === p.expected, `${where}: choices[correctIndex] === expected`);
  check(p.answerLetter === "ABCD"[p.correctIndex], `${where}: answerLetter matches`);
  check(
    Object.values(p.givens).every((v) => typeof v === "number" && isFinite(v)),
    `${where}: givens all finite numbers`
  );
  check(p.steps.length > 0, `${where}: has steps`);
  check(p.steps.every((s) => s.instruction.length > 0), `${where}: step instructions non-empty`);
  if (p.svgParams) {
    check(DIAGRAM_KINDS.has(p.svgParams.kind), `${where}: svgParams kind valid (${p.svgParams.kind})`);
  }
  const unlocked = unlockedSubtypes(topic, difficulty);
  check(unlocked.has(p.subtype), `${where}: subtype ${p.subtype} unlocked at difficulty ${difficulty}`);
}

function checkFRQ(p: PrecalcFRQ, difficulty: PrecalcDifficulty, where: string): void {
  check(p.type === "AP_FRQ", `${where}: type is AP_FRQ`);
  check(p.subject === "precalc", `${where}: subject is precalc`);
  const errs = validateFRQ(p);
  check(errs.length === 0, `${where}: validateFRQ clean (${errs.join("; ")})`);
  const wantParts = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 4;
  check(p.subparts.length === wantParts, `${where}: ${p.subparts.length} subparts, want ${wantParts}`);
  check(p.subparts.every((s) => (s.justification ?? "").length > 0), `${where}: every subpart has justification`);
  check(p.subparts.every((s) => !PDF_UNSAFE.test(s.prompt + s.answer), `${where}: subpart strings PDF-safe`));
  check(typeof p.calculator === "boolean", `${where}: calculator is boolean`);
  check(!!p.verify && !!p.verify.inputs, `${where}: verify inputs present`);
  if (p.stimulus.kind === "table") {
    check(p.stimulus.rows.length > 0, `${where}: table has rows`);
  }
}

export function runMatrix(): SuiteResult {
  resetCounters();
  const modes: OutputMode[] = ["GuidedNote", "Review", "Test"];
  const difficulties: PrecalcDifficulty[] = [1, 2, 3];
  const counts = [1, 3, 12, 25];

  check(PRECALCULUS_ENTRIES.length === 7, `7 precalculus entries (got ${PRECALCULUS_ENTRIES.length})`);
  const ids = PRECALCULUS_ENTRIES.map((e) => e.id);
  check(new Set(ids).size === 7, "entry ids unique");

  TOPIC_TAGS.forEach((topic, ti) => {
    const entry = PRECALCULUS_ENTRIES[ti];
    check(entry.topic === 16, `${topic}: topic number 16`);
    for (const mode of modes) {
      for (const difficulty of difficulties) {
        for (const count of counts) {
          const seed = 1000 + ti * 100000 + modes.indexOf(mode) * 10000 + difficulty * 100 + count;
          const where = `${topic}/${mode}/d${difficulty}/n${count}/seed${seed}`;
          const problems = entry.generate(mode, seed, { count, difficulty });
          check(problems.length === count, `${where}: generated ${problems.length}, want ${count}`);
          for (const p of problems) {
            if (p.type === "PRECALC_MCQ") checkMCQ(p as unknown as PrecalcMCQ, topic, difficulty, where);
            else if (p.type === "AP_FRQ") checkFRQ(p as unknown as PrecalcFRQ, difficulty, where);
            else check(false, `${where}: unknown problem type ${(p as { type: string }).type}`);
          }
          // Seed reproducibility: same inputs -> byte-identical output.
          const again = entry.generate(mode, seed, { count, difficulty });
          check(
            JSON.stringify(problems) === JSON.stringify(again),
            `${where}: seed reproducibility`
          );
        }
      }
    }
  });

  // Mode invariance: generation must not depend on the render mode
  // (mode only changes counts at the registry default level).
  for (let ti = 0; ti < TOPIC_TAGS.length; ti++) {
    for (const difficulty of difficulties) {
      for (const count of [3, 12]) {
        const seed = 777000 + ti * 1000 + difficulty * 10 + count;
        const a = PRECALCULUS_ENTRIES[ti].generate("GuidedNote", seed, { count, difficulty });
        const b = PRECALCULUS_ENTRIES[ti].generate("Test", seed, { count, difficulty });
        const c = PRECALCULUS_ENTRIES[ti].generate("Review", seed, { count, difficulty });
        check(
          JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(b) === JSON.stringify(c),
          `mode-invariance ${TOPIC_TAGS[ti]}/d${difficulty}/n${count}`
        );
      }
    }
  }

  return result("matrix");
}

if (isMain(import.meta.url)) {
  printResult(runMatrix());
}

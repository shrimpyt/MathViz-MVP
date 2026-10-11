// 02-recompute.ts — independent answer recomputation across the full matrix.
// Every problem's answer is recomputed from its `given` bundle by a separate
// code path (recompute.ts, which does not share the generators' arithmetic)
// and asserted equal to the generated answer.

import { MIDDLE_SCHOOL_ENTRIES } from "@/modules/middle-school";
import type { OutputMode } from "@/lib/types";
import { recomputeAnswer } from "./recompute";
import { check, resetCounters, result, printResult, isMain, answersEqual } from "./helpers";

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];
const DIFFS = [1, 2, 3] as const;
const SEEDS = [7, 42, 2026];

export function run(): void {
  resetCounters();
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    for (const d of DIFFS) {
      for (const seed of SEEDS) {
        for (const mode of MODES) {
          const problems = e.generate(mode, seed, { count: 4, difficulty: d }) as any[];
          check(problems.length === 4, `${e.id} d${d} ${mode} seed ${seed}: expected 4 problems, got ${problems.length}`);
          for (const p of problems) {
            let expected: string | number;
            try {
              expected = recomputeAnswer(p);
            } catch (err: any) {
              check(false, `${e.id} d${d} ${mode}: recompute threw: ${err?.message} :: ${String(p?.prompt ?? p).slice(0, 90)}`);
              continue;
            }
            check(
              answersEqual(expected, p.answer),
              `${e.id} d${d} ${mode}: expected=${expected} actual=${p.answer} :: ${String(p.prompt).slice(0, 90)}`
            );
          }
        }
      }
    }
  }
}

if (isMain(import.meta.url)) {
  run();
  printResult(result("02-recompute"));
}

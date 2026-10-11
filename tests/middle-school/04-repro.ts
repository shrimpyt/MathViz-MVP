// 04-repro.ts — seed reproducibility: same seed → byte-identical output.
// Every entry × mode × difficulty is generated twice with the same seed and
// compared via JSON serialization; a second pass uses different counts.

import { MIDDLE_SCHOOL_ENTRIES } from "@/modules/middle-school";
import type { OutputMode } from "@/lib/types";
import { check, resetCounters, result, printResult, isMain } from "./helpers";

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];

export function run(): void {
  resetCounters();
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    for (const d of [1, 2, 3] as const) {
      for (const mode of MODES) {
        for (const count of [1, 7]) {
          const a = JSON.stringify(e.generate(mode, 424242, { count, difficulty: d }));
          const b = JSON.stringify(e.generate(mode, 424242, { count, difficulty: d }));
          check(a === b, `${e.id} d${d} ${mode} count${count}: same seed produced different output`);
        }
        // Different seeds should (almost surely) produce different output.
        const c = JSON.stringify(e.generate(mode, 111, { count: 5, difficulty: d }));
        const dd = JSON.stringify(e.generate(mode, 999, { count: 5, difficulty: d }));
        check(c !== dd, `${e.id} d${d} ${mode}: different seeds produced identical output (suspicious)`);
      }
    }
  }
}

if (isMain(import.meta.url)) {
  run();
  printResult(result("04-repro"));
}

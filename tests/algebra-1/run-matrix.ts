// run-matrix.ts
// Full coverage matrix: every lesson × doc mode × difficulty 1–3 × count {1,3,12,25}.
// (Classical is excluded per contract — the coordinator verifies it at integration.)
// Every problem is independently verified via verify.ts.
//
// Run: npx tsx tests/algebra-1/run-matrix.ts

import { generateAlgebra1Lesson, ALGEBRA1_LESSON_KEYS, formatAlgebra1Answer } from "../../src/modules/algebra-1";
import type { OutputMode } from "../../src/lib/types";
import { verifyProblem } from "./verify";
import { latexToText } from "../../src/lib/answerKey";

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test"];
const DIFFICULTIES = [1, 2, 3] as const;
const COUNTS = [1, 3, 12, 25] as const;

let totalChecks = 0;
let totalProblems = 0;
let failures: string[] = [];
const subtypeSeen = new Set<string>();
const typeSeen = new Set<string>();

const SEED_BASE = 20261010;

for (const lesson of ALGEBRA1_LESSON_KEYS) {
  for (const mode of MODES) {
    for (const difficulty of DIFFICULTIES) {
      for (const count of COUNTS) {
        const seed = SEED_BASE + ALGEBRA1_LESSON_KEYS.indexOf(lesson) * 1000 + difficulty * 37 + count;
        const problems = generateAlgebra1Lesson(lesson, mode, seed, { count, difficulty });
        if (problems.length !== count) {
          failures.push(`${lesson}/${mode}/d${difficulty}/n${count}: got ${problems.length} problems, want ${count}`);
        }
        // Mode contract: Review/Test/GuidedNote all emit full steps at generation time
        // (renderers decide what to show). Classical is handled by the coordinator.
        for (let i = 0; i < problems.length; i++) {
          const p = problems[i];
          totalProblems++;
          subtypeSeen.add(p.subtype);
          typeSeen.add(p.type);
          const id = `${lesson}/${mode}/d${difficulty}/n${count}#${i}[${p.subtype}]`;
          const r = verifyProblem(p, id);
          totalChecks += r.checks;
          failures.push(...r.failures);
          // Answer-key exactness: formatAlgebra1Answer must equal the emitted answer.
          totalChecks++;
          if (formatAlgebra1Answer(p) !== latexToText(p.answer)) {
            failures.push(`${id}: formatAlgebra1Answer mismatch`);
          }
        }
        // Seed reproducibility: same inputs → identical output.
        const again = generateAlgebra1Lesson(lesson, mode, seed, { count, difficulty });
        totalChecks++;
        if (JSON.stringify(again) !== JSON.stringify(problems)) {
          failures.push(`${lesson}/${mode}/d${difficulty}/n${count}: not seed-reproducible`);
        }
      }
    }
  }
}

console.log("=== MATRIX ===");
console.log(`lessons: ${ALGEBRA1_LESSON_KEYS.length}`);
console.log(`problems generated: ${totalProblems}`);
console.log(`subtypes seen: ${subtypeSeen.size}`);
console.log(`TEKS types seen: ${[...typeSeen].sort().join(", ")}`);
console.log(`checks: ${totalChecks}`);
console.log(`failures: ${failures.length}`);
for (const f of failures.slice(0, 40)) console.log("FAIL:", f);
if (failures.length > 40) console.log(`... and ${failures.length - 40} more`);
process.exit(failures.length > 0 ? 1 : 0);

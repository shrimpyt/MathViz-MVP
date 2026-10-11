// answerkey-check.ts
// Answer-key exactness: formatAlgebra1Answer must return the exact emitted
// answer for every problem, across difficulties, multi-topic mixes, and seeds.
// Also verifies the answer key is stable (same seed → same key) and that
// multi-topic documents interleave factories without collisions.
//
// Run: npx tsx tests/algebra-1/answerkey-check.ts

import { mulberry32 } from "../../src/lib/math-utils";
import {
  generateAlgebra1Mixed,
  generateAlgebra1Lesson,
  formatAlgebra1Answer,
  ALGEBRA1_LESSON_KEYS,
} from "../../src/modules/algebra-1";
import { latexToText } from "../../src/lib/answerKey";
import type { DifficultyLevel } from "../../src/modules/CurriculumRegistry";

let checks = 0;
const failures: string[] = [];

// 1. Per-lesson, per-difficulty, many seeds: key == emitted answer.
for (const lesson of ALGEBRA1_LESSON_KEYS) {
  for (const difficulty of [1, 2, 3] as DifficultyLevel[]) {
    for (let s = 0; s < 12; s++) {
      const seed = 9000 + s * 101 + difficulty;
      const problems = generateAlgebra1Lesson(lesson, "Test", seed, { count: 4, difficulty });
      for (const p of problems) {
        checks++;
        const key = formatAlgebra1Answer(p);
        if (key !== latexToText(p.answer)) {
          failures.push(`${lesson}/d${difficulty}/seed${seed}: key "${key}" != answer "${latexToText(p.answer)}"`);
        }
        checks++;
        if (key.length === 0) failures.push(`${lesson}/d${difficulty}/seed${seed}: empty answer key`);
      }
    }
  }
}

// 2. Multi-topic mixed documents: key stability + exactness.
for (let s = 0; s < 40; s++) {
  const seed = 31337 + s * 17;
  const doc = generateAlgebra1Mixed(mulberry32(seed), 25, 3);
  const key1 = doc.map(formatAlgebra1Answer);
  const doc2 = generateAlgebra1Mixed(mulberry32(seed), 25, 3);
  const key2 = doc2.map(formatAlgebra1Answer);
  checks++;
  if (JSON.stringify(key1) !== JSON.stringify(key2)) {
    failures.push(`mixed seed ${seed}: answer key not stable`);
  }
  for (let i = 0; i < doc.length; i++) {
    checks++;
    if (key1[i] !== latexToText(doc[i].answer)) {
      failures.push(`mixed seed ${seed} #${i}: key mismatch`);
    }
  }
  // Multi-topic coverage: a 25-problem mixed doc should span several subtypes.
  const subtypes = new Set(doc.map((p) => p.subtype));
  checks++;
  if (subtypes.size < 5) failures.push(`mixed seed ${seed}: only ${subtypes.size} subtypes in 25 problems`);
}

console.log("=== ANSWER KEY ===");
console.log(`lessons: ${ALGEBRA1_LESSON_KEYS.length}`);
console.log(`checks: ${checks}`);
console.log(`failures: ${failures.length}`);
for (const f of failures.slice(0, 20)) console.log("FAIL:", f);
process.exit(failures.length > 0 ? 1 : 0);

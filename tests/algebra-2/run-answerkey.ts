// run-answerkey.ts
// Answer-key exactness: formatAlgebra2Answer is non-empty, fully converted
// (no raw LaTeX left), PDF-safe, and STABLE (identical across repeated
// generation) for every lesson × difficulty × seed; multi-topic sets format
// cleanly; spot-checks pin exact latexToText conversions.

import { WIRED_LESSONS } from "../../src/modules/algebra-2";
import type { Algebra2Problem } from "../../src/lib/factories/Algebra2Types";
import { formatAlgebra2Answer } from "../../src/lib/factories/Algebra2Types";
import { latexToText, pdfSafeText } from "../../src/lib/answerKey";
import { check, section, report } from "./harness";

const lessons = WIRED_LESSONS.filter((l) => !l.proofs);
let keys = 0;

for (const lesson of lessons) {
  section(`answerkey/${lesson.id}`);
  for (const d of [1, 2, 3] as const) {
    for (const seed of [7, 42]) {
      const set = lesson.generate("Test", seed, { count: 5, difficulty: d }) as Algebra2Problem[];
      const set2 = lesson.generate("Test", seed, { count: 5, difficulty: d }) as Algebra2Problem[];
      for (let i = 0; i < set.length; i++) {
        const p = set[i];
        keys++;
        const key = formatAlgebra2Answer(p);
        check(key.length > 0, `${lesson.id} d${d} seed${seed}#${i}: key non-empty`);
        check(!key.includes("\\"), `${lesson.id}: key has no raw latex`);
        check(key === formatAlgebra2Answer(set2[i]), `${lesson.id}: key stable across runs`);
        try {
          pdfSafeText(key);
          check(true, `${lesson.id}: key pdf-safe`);
        } catch {
          check(false, `${lesson.id}: pdfSafeText threw`);
        }
      }
    }
  }
}

// multi-topic: mixed set formats cleanly, one key per problem
section("answerkey/multi-topic");
{
  const ids = ["a2-5-7", "a2-7-6", "a2-11-3", "a2-4-2"];
  const mixed: Algebra2Problem[] = [];
  for (const id of ids) {
    const lesson = WIRED_LESSONS.find((l) => l.id === id)!;
    mixed.push(...(lesson.generate("Review", 99, { count: 4, difficulty: 2 }) as Algebra2Problem[]));
  }
  check(mixed.length === 16, `mixed set has 16 problems`);
  const keyLines = mixed.map((p) => formatAlgebra2Answer(p));
  check(keyLines.every((k) => k.length > 0), "all mixed keys non-empty");
  check(keyLines.every((k) => !k.includes("\\")), "all mixed keys converted");
  const keyPage = keyLines.map((k, i) => `${i + 1}. ${k}`).join("\n");
  check(keyPage.split("\n").length === 16, "key page has 16 lines");
}

// spot-check exact conversions
section("answerkey/spots");
const spots: [string, string][] = [
  ["(x + 3)^2 - 7", "(x + 3)² - 7"],
  ["x = 1 \\pm 6i", "x = 1 ± 6i"],
  ["\\log_{2}(8)", "log₂(8)"],
  ["a_{n}", "aₙ"],
  ["x^2 + 2x + 1 = 0", "x² + 2x + 1 = 0"],
  ["\\sqrt{16}", "√16"],
  ["\\frac{a}{b}", "a/b"],
];
for (const [input, want] of spots) {
  check(latexToText(input) === want, `latexToText(${JSON.stringify(input)}) === ${JSON.stringify(want)}`);
}
check(pdfSafeText("x ≅ y") === "x ≃ y", "pdfSafeText maps ≅ → ≃");

console.log(`answer keys checked: ${keys}`);
report("run-answerkey");

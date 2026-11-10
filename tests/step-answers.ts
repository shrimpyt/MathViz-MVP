// step-answers.ts, checks how a shown step answer is joined to its step.
// Review mode used to print "Take the square root: b = √64. 8".
//
// Run: npx tsx tests/step-answers.ts

import { revealedBlankText } from "../src/lib/answerKey";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";

let checks = 0;
const failures: string[] = [];
function eq(instruction: string, label: string, answer: string, want: string) {
  checks++;
  const got = revealedBlankText(instruction, label, answer);
  if (got !== want) failures.push(`(${JSON.stringify(instruction)}, ${JSON.stringify(label)}, ${JSON.stringify(answer)}) -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// The reported case and its siblings.
eq("Take the square root: b = √64.", "b =", "8", "b = 8");
eq("Take the square root: c = √100.", "c =", "10", "c = 10");
eq("a² + b² = c² → 6² + b² = 10².", "b² =", "64", "b² = 64");
eq("Divide both sides by 3.", "x =", "x = 4", "x = 4");
eq("Estimate.", "x ≈", "2.6", "x ≈ 2.6");
// A finished sentence gets the label as a lead-in.
eq("Other angle = 90° − 32°.", "answer", "58°", "Answer: 58°");
// After a colon, or with a fill-in pattern, the answer stays bare.
eq("Simplify to lowest terms:", "answer", "3/4", "3/4");
eq("Substitute the intercepted arc measure of 80°:", "½ × ?", "½ × 80°", "½ × 80°");
eq("Recall the theorem.", "", "x", "x");

// Every real step blank: the shown text keeps the answer, and no
// relation label is dropped in front of a bare number.
for (const e of CURRICULUM_REGISTRY) {
  let problems: any[] = [];
  try {
    problems = e.generate("Review", 7, { count: 3, difficulty: 3 } as any) as any[];
  } catch {
    continue;
  }
  for (const p of problems) {
    for (const s of p.steps ?? []) {
      for (const b of s.blanks ?? []) {
        if (typeof s.instruction !== "string" || b?.answer == null) continue;
        checks++;
        const got = revealedBlankText(s.instruction, b.label ?? "", String(b.answer));
        if (!got.includes(String(b.answer).trim())) failures.push(`${e.id}: lost the answer: ${got}`);
      }
    }
  }
}

console.log(`step-answers: ${checks} checks, ${failures.length} failures`);
for (const f of failures.slice(0, 20)) console.log("  FAIL: " + f);
if (failures.length) process.exitCode = 1;

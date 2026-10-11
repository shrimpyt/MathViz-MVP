// smoke.ts — integration smoke test for the Euclid Engine expansion.
// Imports the registry, generates 2 problems per entry in Test/Review/Classical
// modes, and asserts: non-empty output, answers present (formatAnswer),
// problemToQuestion produces text, and no generator throws.
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";
import { formatAnswer } from "../src/lib/answerKey";
import type { OutputMode } from "../src/lib/ProblemFactory";

const MODES: OutputMode[] = ["Test", "Review", "Classical"];
const failures: string[] = [];
let checked = 0;
let generated = 0;

for (const entry of CURRICULUM_REGISTRY) {
  for (const mode of MODES) {
    checked++;
    let problems;
    try {
      problems = entry.generate(mode, 42, { count: 2, difficulty: 2 });
    } catch (e) {
      failures.push(`${entry.id} [${mode}]: threw ${e instanceof Error ? e.message : e}`);
      continue;
    }
    if (!Array.isArray(problems) || problems.length === 0) {
      failures.push(`${entry.id} [${mode}]: generated 0 problems`);
      continue;
    }
    for (const p of problems) {
      generated++;
      if (!p || typeof p.type !== "string") {
        failures.push(`${entry.id} [${mode}]: problem missing type discriminator`);
        continue;
      }
      let ans = "";
      try {
        ans = formatAnswer(p);
      } catch (e) {
        failures.push(`${entry.id} [${mode}]: formatAnswer threw: ${e instanceof Error ? e.message : e}`);
      }
      if (!ans || ans.trim() === "") {
        failures.push(`${entry.id} [${mode}]: empty answer for type ${p.type}`);
      }
      try {
        const q = problemToQuestion(p, 0);
        if (!q.text || q.text.trim() === "" || q.text.startsWith("Problem ")) {
          failures.push(`${entry.id} [${mode}]: problemToQuestion fallback/empty for type ${p.type}`);
        }
      } catch (e) {
        failures.push(`${entry.id} [${mode}]: problemToQuestion threw: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
}

// Renumbering checks (coordinator decision 1)
const byId = new Map(CURRICULUM_REGISTRY.map((e) => [e.id, e]));
const expect: [string, number][] = [
  ["proofs-4-2-sss-sas", 4],
  ["a2-2-5-abs-equations", 202],
  ["a2-12-3-using-models", 212],
  ["a2-p-trig-identities", 213],
  ["a2x-sequences", 214],
  ["sat-hoa-linear-equations", 401],
  ["sat-full-module", 401],
  ["precalc-vectors", 16],
  ["calc-limits", 21],
  ["ms6-1-1-multiplying-dividing-fractions", 30],
  ["a1-1-1-multi-step-equations", 101],
];
for (const [id, topic] of expect) {
  const e = byId.get(id);
  if (!e) failures.push(`missing entry ${id}`);
  else if (e.topic !== topic) failures.push(`${id}: topic ${e.topic}, expected ${topic}`);
}
for (const dead of ["ch3-1-lines-angles", "ch9-2-similar-polygons"]) {
  if (byId.has(dead)) failures.push(`placeholder not deleted: ${dead}`);
}

console.log(`entries: ${CURRICULUM_REGISTRY.length}, mode-runs: ${checked}, problems: ${generated}`);
if (failures.length === 0) {
  console.log("SMOKE PASS");
} else {
  console.log(`SMOKE FAIL (${failures.length}):`);
  const seen = new Set<string>();
  for (const f of failures) {
    const key = f.replace(/\[\w+\]/, "[mode]");
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(" -", f);
    if (seen.size > 30) { console.log("  ... (truncated)"); break; }
  }
  process.exit(1);
}

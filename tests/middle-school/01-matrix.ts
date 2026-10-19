// 01-matrix.ts
// Full generation matrix: every lesson × doc mode × difficulty 1–3 × counts {1,3,12,25}.
// Checks: exact counts, shape invariants, subtype filtering, tier compliance,
// PDF-safe strings, non-empty steps/blanks.

import { check, resetCounters, result, printResult, isMain } from "./helpers";
import { MIDDLE_SCHOOL_ENTRIES, getMiddleSchoolSubtypes } from "@/modules/middle-school";
import type { OutputMode } from "@/lib/ProblemFactory";
import type {
  MiddleSchoolProblem,
  Grade6Subtype,
  Grade7Subtype,
  Grade8Subtype,
} from "@/lib/factories/MiddleSchoolTypes";
import { GRADE6_SUBTYPES } from "@/lib/factories/MiddleSchoolGrade6";
import { GRADE7_SUBTYPES } from "@/lib/factories/MiddleSchoolGrade7";
import { GRADE8_SUBTYPES } from "@/lib/factories/MiddleSchoolGrade8";
import { pdfSafeText } from "@/lib/answerKey";

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];
const DIFFS = [1, 2, 3] as const;
const COUNTS = [1, 3, 12, 25];

function lessonSubtypes(entryId: string): string[] {
  // The lesson's declared subtype list from the module (a lesson may draw
  // from several subtypes; sampling one problem only ever sees one of them).
  return getMiddleSchoolSubtypes(entryId) ?? [];
}

export function run(): void {
  resetCounters();

  // sanity: 80 entries, ids unique, grouped by grade
  const ids = MIDDLE_SCHOOL_ENTRIES.map((e) => e.id);
  check(MIDDLE_SCHOOL_ENTRIES.length === 81, `expected 81 entries, got ${MIDDLE_SCHOOL_ENTRIES.length}`);
  check(new Set(ids).size === ids.length, "entry ids are unique");
  check(MIDDLE_SCHOOL_ENTRIES.filter((e) => e.topic === 30).length === 24, "24 grade-6 entries");
  check(MIDDLE_SCHOOL_ENTRIES.filter((e) => e.topic === 31).length === 57, "57 Pre-Algebra entries");
  check(MIDDLE_SCHOOL_ENTRIES.filter((e) => e.topic === 32).length === 0, "0 entries left in the retired grade-8 bucket");

  // every subtype in the unions is covered by at least one entry
  const covered = new Set<string>();
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    for (const s of lessonSubtypes(e.id)) covered.add(s);
  }
  for (const s of [...GRADE6_SUBTYPES, ...GRADE7_SUBTYPES, ...GRADE8_SUBTYPES]) {
    check(covered.has(s), `subtype ${s} covered by a registry entry`);
  }

  let seed = 1000;
  for (const entry of MIDDLE_SCHOOL_ENTRIES) {
    const entrySubtypes = new Set(lessonSubtypes(entry.id));
    for (const mode of MODES) {
      for (const diff of DIFFS) {
        for (const count of COUNTS) {
          seed += 1;
          const problems = entry.generate(mode, seed, { count, difficulty: diff }) as unknown as MiddleSchoolProblem[];
          check(problems.length === count, `${entry.id} ${mode} d${diff} n=${count}: got ${problems.length}`);
          for (const p of problems) {
            check(entrySubtypes.has(p.subtype), `${entry.id}: subtype ${p.subtype} within lesson`);
            check(typeof p.prompt === "string" && p.prompt.length > 5, `${entry.id}: prompt present`);
            check(p.answer !== undefined && p.answer !== null && String(p.answer).length > 0, `${entry.id}: answer present`);
            check(Array.isArray(p.steps) && p.steps.length > 0, `${entry.id}: steps non-empty`);
            check(typeof p.given === "object" && p.given !== null, `${entry.id}: given is object`);
            check(typeof p.find === "string" && p.find.length > 0, `${entry.id}: find present`);
            for (const s of p.steps) {
              check(typeof s.instruction === "string" && s.instruction.length > 0, `${entry.id}: step instruction present`);
              for (const b of s.blanks ?? []) {
                check(typeof b.answer === "string" && b.answer.length > 0, `${entry.id}: blank answer present`);
                check(typeof b.label === "string", `${entry.id}: blank label present`);
              }
            }
            // PDF-safe: no unconvertible glyphs in prompt/steps/answers
            const texts = [p.prompt, String(p.answer), ...p.steps.flatMap((s) => [s.instruction, ...(s.blanks ?? []).map((b) => b.answer)])];
            for (const t of texts) {
              const safe = pdfSafeText(t);
              check(!safe.includes("�"), `${entry.id}: pdfSafeText clean`);
            }
            // tier compliance: the stamped maker tier must not exceed the
            // requested difficulty (tiers are cumulative in the factories)
            check(
              p.tier !== undefined && p.tier <= diff,
              `${entry.id}: maker tier ${p.tier} ≤ difficulty ${diff} (subtype ${p.subtype})`
            );
          }
        }
      }
    }
  }

  // Classical ≡ Review counts
  for (const entry of MIDDLE_SCHOOL_ENTRIES.slice(0, 8)) {
    const r = entry.generate("Review", 42, {});
    const c = entry.generate("Classical", 42, {});
    check(r.length === c.length, `${entry.id}: Classical count equals Review count`);
    check(r.length === 9, `${entry.id}: Review/Classical default count is 9`);
    const g = entry.generate("GuidedNote", 42, {});
    const t = entry.generate("Test", 42, {});
    check(g.length === 3 && t.length === 3, `${entry.id}: GuidedNote/Test default count is 3`);
  }
}

if (isMain(import.meta.url)) {
  run();
  printResult(result("01-matrix"));
}

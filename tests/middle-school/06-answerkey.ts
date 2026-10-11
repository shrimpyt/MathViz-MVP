// 06-answerkey.ts — answer-key behavior for middle-school problems.
// Verifies: formatAnswer() renders every problem type without throwing;
// difficulty filtering keeps only tiers ≤ the requested difficulty;
// multi-topic mixing (several entries on one sheet) keeps answers aligned
// with their problems across seeds.

import { MIDDLE_SCHOOL_ENTRIES } from "@/modules/middle-school";
import type { OutputMode } from "@/lib/types";
import { formatAnswer } from "@/lib/answerKey";
import { pdfSafeText } from "@/lib/answerKey";
import { recomputeAnswer } from "./recompute";
import { check, resetCounters, result, printResult, isMain, answersEqual } from "./helpers";

export function run(): void {
  resetCounters();

  // 1) Answer rendering on every entry × difficulty × mode.
  // NOTE: formatAnswer() has no MS.6/MS.7/MS.8 case yet (coordinator wiring);
  // it currently returns "" — we assert it doesn't throw and verify the real
  // answer-key path, pdfSafeText(p.answer), instead.
  const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    for (const d of [1, 2, 3] as const) {
      for (const mode of MODES) {
        const problems = e.generate(mode, 90210, { count: 3, difficulty: d }) as any[];
        for (const p of problems) {
          try {
            formatAnswer(p);
          } catch (err: any) {
            check(false, `${e.id} d${d} ${mode}: formatAnswer threw: ${err?.message}`);
          }
          let keyText: string;
          try {
            keyText = pdfSafeText(p.answer);
          } catch (err: any) {
            check(false, `${e.id} d${d} ${mode}: pdfSafeText(answer) threw: ${err?.message}`);
            continue;
          }
          check(keyText.length > 0, `${e.id} d${d} ${mode}: answer-key text empty`);
          check(!/undefined|NaN/.test(keyText), `${e.id} d${d} ${mode}: answer-key text dirty: ${keyText.slice(0, 60)}`);
          // pdfSafeText strips "$" (shared latexToText treats it as a math
          // delimiter) and upgrades "^2" to "²" — both documented shared
          // behavior. The value must survive; normalize both before comparing.
          const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
          const desuper = (s: string) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => "^" + SUPER.indexOf(c));
          const canon = (s: string | number) => desuper(String(s).replace(/\$/g, ""));
          check(
            answersEqual(canon(keyText), canon(p.answer)),
            `${e.id} d${d} ${mode}: key text != answer: ${keyText} vs ${p.answer}`
          );
        }
      }
    }
  }

  // 2) Difficulty filtering: at difficulty d, every emitted tier ≤ d.
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    for (const d of [1, 2, 3] as const) {
      const problems = e.generate("GuidedNote", 31337, { count: 12, difficulty: d }) as any[];
      for (const p of problems) {
        check(p.tier <= d, `${e.id}: difficulty ${d} emitted tier-${p.tier} problem`);
      }
    }
  }

  // 3) Multi-topic mixing: three entries from different grades on one sheet;
  //    answers stay aligned with problems across seeds.
  const mixIds = ["ms6-1-3-fdp-conversions", "ms7-3-5-circumference-area-circles", "ms8-4-pythagorean"];
  for (const seed of [1, 2, 3, 4, 5]) {
    const sheet: any[] = [];
    for (const id of mixIds) {
      const e = MIDDLE_SCHOOL_ENTRIES.find((x) => x.id === id)!;
      sheet.push(...(e.generate("Test", seed * 1000 + 7, { count: 4, difficulty: 2 }) as any[]));
    }
    check(sheet.length === 12, `mixed sheet seed ${seed}: expected 12, got ${sheet.length}`);
    for (const p of sheet) {
      const expected = recomputeAnswer(p);
      check(answersEqual(expected, p.answer), `mixed sheet seed ${seed}: answer mismatch expected=${expected} got=${p.answer}`);
      try {
        formatAnswer(p); // no MS case yet (coordinator wiring) — must not throw
      } catch (err: any) {
        check(false, `mixed sheet seed ${seed}: formatAnswer threw: ${err?.message}`);
      }
      check(pdfSafeText(p.answer).length > 0, `mixed sheet seed ${seed}: answer-key text empty`);
    }
  }
}

if (isMain(import.meta.url)) {
  run();
  printResult(result("06-answerkey"));
}

// test-answers.ts
// Answer-key exactness:
//   - formatCalculusAnswer is deterministic across repeated generation
//     (per difficulty, per seed, and for multi-topic mixes)
//   - difficulty tiers are cumulative and correct: a problem generated at
//     difficulty d only ever uses makers with minDiff <= d
//   - BC-only problems appear only at difficulty 3 and carry the bcOnly flag

import { mulberry32 } from "@/lib/math-utils";
import { CALCULUS_ENTRIES } from "@/modules/calculus";
import type { CalcMCQProblem, CalculusProblem, Maker, DifficultyTier } from "@/lib/factories/CalculusUtils";
import { formatCalculusAnswer } from "@/lib/factories/CalculusUtils";
import { LIMIT_MAKERS } from "@/lib/factories/CalculusLimits";
import { DERIVATIVE_MAKERS } from "@/lib/factories/CalculusDerivatives";
import { DERIV_APPS_MAKERS } from "@/lib/factories/CalculusDerivApps";
import { INTEGRAL_MAKERS } from "@/lib/factories/CalculusIntegrals";
import { reset, check, checkEqual, stats } from "./harness";

function subtypesFor(makers: Maker[], diff: DifficultyTier): Set<string> {
  const s = new Set<string>();
  for (const m of makers) {
    if (m.minDiff <= diff) {
      // learn the subtype by building one throwaway problem
      s.add(m.make(mulberry32(999)).subtype);
    }
  }
  return s;
}

const DRILL_MAKERS: Record<string, Maker[]> = {
  "calc-limits": LIMIT_MAKERS,
  "calc-derivative-rules": DERIVATIVE_MAKERS,
  "calc-derivative-apps": DERIV_APPS_MAKERS,
  "calc-integrals": INTEGRAL_MAKERS,
};

export function runAnswers(): void {
  reset();

  // 1. answer-key exactness: same seed -> identical formatted answers
  for (const entry of CALCULUS_ENTRIES) {
    for (const diff of [1, 2, 3] as const) {
      const a = entry.generate("Review", 31337, { count: 10, difficulty: diff }) as unknown as CalculusProblem[];
      const b = entry.generate("Review", 31337, { count: 10, difficulty: diff }) as unknown as CalculusProblem[];
      const ka = a.map(formatCalculusAnswer);
      const kb = b.map(formatCalculusAnswer);
      checkEqual(JSON.stringify(ka), JSON.stringify(kb), `${entry.id} d${diff}: answer keys identical`);
      check(ka.every((k) => k.trim().length > 0), `${entry.id} d${diff}: all keys non-empty`);
    }
  }

  // 2. multi-topic mix is stable
  {
    const mix1 = [
      ...(CALCULUS_ENTRIES[0].generate("Test", 555, { count: 5, difficulty: 2 }) as unknown as CalculusProblem[]),
      ...(CALCULUS_ENTRIES[3].generate("Test", 555, { count: 5, difficulty: 2 }) as unknown as CalculusProblem[]),
    ].map(formatCalculusAnswer);
    const mix2 = [
      ...(CALCULUS_ENTRIES[0].generate("Test", 555, { count: 5, difficulty: 2 }) as unknown as CalculusProblem[]),
      ...(CALCULUS_ENTRIES[3].generate("Test", 555, { count: 5, difficulty: 2 }) as unknown as CalculusProblem[]),
    ].map(formatCalculusAnswer);
    checkEqual(JSON.stringify(mix1), JSON.stringify(mix2), "multi-topic: answer keys stable");
  }

  // 3. difficulty tiers are cumulative and exact
  for (const [id, makers] of Object.entries(DRILL_MAKERS)) {
    const entry = CALCULUS_ENTRIES.find((e) => e.id === id)!;
    for (const diff of [1, 2, 3] as const) {
      const allowed = subtypesFor(makers, diff);
      const problems = entry.generate("Test", 20240 + diff, { count: 60, difficulty: diff }) as unknown as CalcMCQProblem[];
      // note: count is explicit, so mode only affects nothing here
      for (const p of problems) {
        check(allowed.has(p.subtype), `${id} d${diff}: subtype ${p.subtype} allowed at tier`);
      }
      // higher tiers are supersets
      if (diff < 3) {
        const next = subtypesFor(makers, (diff + 1) as DifficultyTier);
        for (const s of allowed) check(next.has(s), `${id}: tier ${diff + 1} includes ${s}`);
      }
    }
  }

  // 4. BC-only flag discipline
  {
    const entry = CALCULUS_ENTRIES.find((e) => e.id === "calc-integrals")!;
    for (const diff of [1, 2] as const) {
      const problems = entry.generate("Review", 808, { count: 40, difficulty: diff }) as unknown as CalcMCQProblem[];
      check(problems.every((p) => !p.bcOnly), `calc-integrals d${diff}: no BC-only problems`);
    }
    const hard = entry.generate("Review", 808, { count: 120, difficulty: 3 }) as unknown as CalcMCQProblem[];
    const bc = hard.filter((p) => p.bcOnly);
    check(bc.length > 0, "calc-integrals d3: BC-only problems exist");
    check(bc.every((p) => p.subtype === "ImproperIntegral"), "calc-integrals d3: BC-only ⇒ ImproperIntegral");
  }
}

// standalone
if (require.main === module) {
  runAnswers();
  const s = stats();
  console.log(`answers: ${s.checks} checks, ${s.failures.length} failures`);
  for (const f of s.failures.slice(0, 20)) console.log("  FAIL:", f);
  process.exit(s.failures.length > 0 ? 1 : 0);
}

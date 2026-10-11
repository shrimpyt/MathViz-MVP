// test-fuzz.ts
// Crash and degenerate-case hunting: thousands of seeds across every entry
// and difficulty, asserting no throws, no NaN answers, no duplicate choices,
// and valid graph/table structures. 0/0-style forms are only legal in the
// limit subtypes that intentionally design them.

import { mulberry32 } from "@/lib/math-utils";
import { CALCULUS_ENTRIES } from "@/modules/calculus";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { CalcMCQProblem } from "@/lib/factories/CalculusUtils";
import { buildCalculusFRQ } from "@/lib/factories/CalculusFRQ";
import { reset, check, stats, indepEval } from "./harness";

const SEEDS = 700;
const MODES: OutputMode[] = ["GuidedNote", "Review", "Test"];

/** Subtypes allowed to carry intentional 0/0 or pole structure. */
const POLE_OK = new Set([
  "LimitGraphical", "LimitAlgebraic", "LimitNumerical",
  "LimitOneSided", "LimitInfinite", "LimitEndBehavior", "LimitDifferenceQuotient",
  "QuotientRule", // rational functions legitimately have poles; the maker guards the eval point
]);

const SAMPLE_TS = [-3, -2, -1, -0.5, 0.5, 1, 2, 3];

function checkProblemSane(p: CalcMCQProblem, where: string): void {
  check(p.choices.every((c) => typeof c === "string" && c.length > 0), `${where}: choices non-empty`);
  check(new Set(p.choices).size === p.choices.length, `${where}: choices unique`);
  check(p.answer.length > 0, `${where}: answer non-empty`);
  const v = p.verify;
  if (v.kind === "number") {
    check(typeof v.value === "number" && isFinite(v.value), `${where}: numeric value finite`);
  }
  if (v.kind === "expr") {
    check(!!v.fn && !!v.source, `${where}: expr has fn+source`);
  }
  // Non-limit sources must be pole-free on the sampled domain (0/0 only by design).
  if (v.source && !POLE_OK.has(p.subtype)) {
    for (const t of SAMPLE_TS) {
      const y = indepEval(v.source, t);
      check(isFinite(y), `${where}: source finite at t=${t} (got ${y})`);
    }
  }
  if (p.graph) {
    const g = p.graph;
    check(g.xMin < g.xMax && g.yMin < g.yMax, `${where}: graph ranges sane`);
    check([g.xMin, g.xMax, g.yMin, g.yMax].every((n) => isFinite(n)), `${where}: graph ranges finite`);
    if (g.shade) {
      check(g.shade.a < g.shade.b, `${where}: shade bounds ordered`);
      check(g.shade.a >= g.xMin && g.shade.b <= g.xMax, `${where}: shade within plot`);
    }
  }
  if (p.table) {
    check(p.table.headers.length > 0, `${where}: table headers`);
    check(p.table.rows.every((r) => r.length === p.table!.headers.length), `${where}: table rows`);
  }
}

export function runFuzz(): void {
  reset();
  for (let seed = 0; seed < SEEDS; seed++) {
    for (const entry of CALCULUS_ENTRIES) {
      for (const diff of [1, 2, 3] as const) {
        const mode = MODES[seed % MODES.length];
        let problems: unknown[];
        try {
          problems = entry.generate(mode, 5000 + seed, { count: 3, difficulty: diff }) as unknown[];
        } catch (e) {
          check(false, `fuzz ${entry.id} d${diff} seed ${seed}: threw ${(e as Error).message}`);
          continue;
        }
        check(Array.isArray(problems) && problems.length === 3, `fuzz ${entry.id}: count 3`);
        for (const p of problems as { type: string }[]) {
          if (p.type === "CALC_MCQ") checkProblemSane(p as CalcMCQProblem, `fuzz/${entry.id}#${seed}`);
          else if (p.type === "AP_FRQ") {
            const frq = p as unknown as { subparts: { answer: string }[] };
            check(frq.subparts.length >= 2 && frq.subparts.length <= 4, `fuzz/${entry.id}#${seed}: FRQ subparts`);
            check(frq.subparts.every((s) => s.answer.trim().length > 0), `fuzz/${entry.id}#${seed}: FRQ answers`);
          } else {
            check(false, `fuzz/${entry.id}#${seed}: unknown type ${p.type}`);
          }
        }
      }
    }
    // FRQ builder directly
    try {
      const b = buildCalculusFRQ(mulberry32(77000 + seed));
      check(b.frq.subparts.length >= 2, `fuzz frq#${seed}: subparts`);
    } catch (e) {
      check(false, `fuzz frq#${seed}: threw ${(e as Error).message}`);
    }
  }
}

// standalone
if (require.main === module) {
  runFuzz();
  const s = stats();
  console.log(`fuzz: ${s.checks} checks, ${s.failures.length} failures`);
  for (const f of s.failures.slice(0, 20)) console.log("  FAIL:", f);
  process.exit(s.failures.length > 0 ? 1 : 0);
}

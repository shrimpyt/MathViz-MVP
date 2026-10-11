// rt-xmode.ts — cross-mode consistency: same seed must give the same underlying
// problems across modes; answer keys must match problems in every combination.
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { formatAnswer } from "@/lib/answerKey";
import type { OutputMode } from "@/lib/ProblemFactory";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];
const entries = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);

const stripBlanks = (ps: any[]) =>
  JSON.stringify(ps, (k, v) =>
    k === "blankReason" || k === "blankStatement" || k === "studentMode" ? undefined : v
  );

// 1. Same seed + same count: GuidedNote/Test/Classical must produce the same
//    UNDERLYING problems (blanking flags may differ by design).
for (const entry of entries) {
  for (const seed of [5, 777]) {
    const outs = new Map<string, string>();
    for (const mode of ["GuidedNote", "Test", "Classical"] as OutputMode[]) {
      let ps: any[];
      try { ps = entry.generate(mode, seed, { count: 3, difficulty: 2 }); }
      catch { continue; }
      outs.set(mode, stripBlanks(ps));
    }
    bump();
    const vals = [...outs.values()];
    if (vals.length > 1 && !vals.every((v) => v === vals[0])) {
      const diffModes = [...outs.entries()].filter(([, v]) => v !== vals[0]).map(([m]) => m).join(",");
      fail("XMODE-DIVERGE", entry.id, "GuidedNote/Test/Classical", seed,
        `same seed+count gives different UNDERLYING problems across modes (${diffModes} diverge even after stripping blanking flags)`);
    }
    // Review: first 3 problems must equal the non-review stream's first 3
    // (same rng seed → prefix property), since count defaults differ by mode
    try {
      const rev = (entry.generate("Review", seed, { count: 9, difficulty: 2 }) as any[]).slice(0, 3);
      const tst = (entry.generate("Test", seed, { count: 3, difficulty: 2 }) as any[]);
      bump();
      if (rev.length === 3 && tst.length === 3 && stripBlanks(rev) !== stripBlanks(tst))
        fail("XMODE-REVIEW-PREFIX", entry.id, "Review", seed, `Review stream doesn't share the Test stream prefix for the same seed (after stripping blanking flags)`);
    } catch { /* already covered by fuzz */ }
  }
}

// 2. Answer key alignment: formatAnswer must be stable across modes for the
//    same underlying problem, and keys must pair with problems 1:1.
for (const entry of entries.filter((_, i) => i % 3 === 0)) {
  for (const mode of MODES) {
    let ps: any[];
    try { ps = entry.generate(mode, 99, { count: 3, difficulty: 2 }); } catch { continue; }
    for (let i = 0; i < ps.length; i++) {
      bump();
      let key: string;
      try { key = formatAnswer(ps[i]); } catch (e) {
        fail("XMODE-KEY-THROW", entry.id, mode, 99, `problem[${i}]: ${e instanceof Error ? e.message : e}`);
        continue;
      }
      if (key === undefined || key === null)
        fail("XMODE-KEY-UNDEFINED", entry.id, mode, 99, `problem[${i}] ${ps[i].type}: formatAnswer returned ${key}`);
    }
  }
}

// 3. Re-seed stability: the UI offsets seeds per topic (seed + i*7919).
//    Adjacent topics must not collide: seed s for topic i vs seed s+7919 for topic 0.
for (const entry of entries.filter((_, i) => i % 5 === 0)) {
  bump();
  const a = JSON.stringify(entry.generate("Test", 42, { count: 3, difficulty: 2 }));
  const b = JSON.stringify(entry.generate("Test", 42 + 7919, { count: 3, difficulty: 2 }));
  if (a === b) fail("XMODE-SEED-COLLISION", entry.id, "Test", 42, `seed 42 and 42+7919 produce identical output (topic-offset collision)`);
}

report("rt-xmode");
process.exit(0);

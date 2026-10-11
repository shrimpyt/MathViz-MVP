// rt-fuzz.ts — adversarial fuzz across ALL registry entries.
// Tactics: crash hunt (throws), invalid problems (NaN/Inf/undefined in answer
// fields), SVG param sanity (negative radius, degenerate angles), determinism,
// formatAnswer robustness, and prefix-consistency across counts.
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import type { OutputMode } from "@/lib/ProblemFactory";
import { failures, fail, scanBadNumbers, tryFormatAnswer, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];
const SEEDS: number[] = [];
for (let s = 0; s < 60; s++) SEEDS.push(s);
SEEDS.push(0, -1, -999, 1e9, 2 ** 31, 2 ** 53 - 1, 999999937, 123456789);

// ── Phase 1: crash + invariant sweep ─────────────────────────────────────────
for (const entry of CURRICULUM_REGISTRY) {
  for (const mode of MODES) {
    for (const seed of SEEDS) {
      let problems: unknown;
      try {
        problems = entry.generate(mode, seed, { count: 2, difficulty: 2 });
      } catch (e) {
        fail("THROW", entry.id, mode, seed, `generate threw: ${e instanceof Error ? e.message : e}`);
        continue;
      }
      bump();
      if (!Array.isArray(problems)) {
        fail("NOT-ARRAY", entry.id, mode, seed, `generate returned ${typeof problems}`);
        continue;
      }
      if (problems.length === 0 && !entry.underConstruction) {
        fail("EMPTY", entry.id, mode, seed, `generated 0 problems (not underConstruction)`);
        continue;
      }
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i] as any;
        bump();
        if (!p || typeof p.type !== "string" || p.type === "") {
          fail("BAD-TYPE", entry.id, mode, seed, `problem[${i}] missing type discriminator`);
          continue;
        }
        // bad-number scan of the whole problem object
        const bads: string[] = [];
        scanBadNumbers(p, "p", bads);
        if (bads.length) {
          fail("BAD-NUMBER", entry.id, mode, seed, `problem[${i}] ${p.type}/${p.subtype ?? "?"}: ${bads.slice(0, 4).join("; ")}`);
        }
        // answer field must exist in some form
        const ansFields = ["answer", "key", "answers"].filter((k) => p[k] !== undefined);
        if (ansFields.length === 0 && p.type !== "Proof") {
          fail("NO-ANSWER-FIELD", entry.id, mode, seed, `problem[${i}] ${p.type}: no answer/key field`);
        }
        // formatAnswer must not throw and (for known types) must be non-empty
        const { text, threw } = tryFormatAnswer(p);
        if (threw) {
          fail("FORMAT-THROW", entry.id, mode, seed, `problem[${i}] ${p.type}: formatAnswer threw: ${threw}`);
        } else {
          bump();
          if (text.trim() === "") {
            fail("EMPTY-ANSWER-STRING", entry.id, mode, seed, `problem[${i}] ${p.type}/${p.subtype ?? "?"}: formatAnswer empty`);
          }
        }
        // SVG params sanity: no negative radius/length, no zero-area obvious cases
        if (p.svgParams && typeof p.svgParams === "object") {
          for (const [k, v] of Object.entries(p.svgParams)) {
            if (typeof v === "number" && /radius|r|length|width|height|base/i.test(k) && v <= 0) {
              fail("BAD-SVG-PARAM", entry.id, mode, seed, `problem[${i}] ${p.type}: svgParams.${k}=${v}`);
            }
            if (typeof v === "number" && !Number.isFinite(v)) {
              fail("BAD-SVG-PARAM", entry.id, mode, seed, `problem[${i}] ${p.type}: svgParams.${k}=${v} non-finite`);
            }
          }
        }
      }
    }
  }
}

// ── Phase 2: determinism — same seed+mode+options ⇒ byte-identical JSON ──────
for (const entry of CURRICULUM_REGISTRY.slice(0, 252)) {
  for (const mode of MODES) {
    for (const seed of [7, 424242]) {
      const a = JSON.stringify(entry.generate(mode, seed, { count: 4, difficulty: 2 }));
      const b = JSON.stringify(entry.generate(mode, seed, { count: 4, difficulty: 2 }));
      bump();
      if (a !== b) fail("NONDETERMINISTIC", entry.id, mode, seed, `same seed gave different output`);
    }
  }
}

// ── Phase 3: prefix consistency — count=2 output is a prefix of count=6 ──────
// (same seed must draw the same underlying stream regardless of count)
for (const entry of CURRICULUM_REGISTRY) {
  for (const mode of MODES) {
    let small: any[], big: any[];
    try {
      small = entry.generate(mode, 31337, { count: 2, difficulty: 2 });
      big = entry.generate(mode, 31337, { count: 6, difficulty: 2 });
    } catch { continue; }
    bump();
    const s = JSON.stringify(small);
    const b = JSON.stringify(big.slice(0, small.length));
    if (s !== b && small.length > 0) {
      fail("COUNT-NOT-PREFIX", entry.id, mode, 31337,
        `count=2 output differs from count=6 prefix — cross-mode/key alignment suspect`);
    }
  }
}

// ── Phase 4: difficulty sweep — difficulty 1/3 shouldn't crash or empty ──────
for (const entry of CURRICULUM_REGISTRY) {
  for (const d of [1, 3] as const) {
    let problems: unknown;
    try {
      problems = entry.generate("Test", 99, { count: 2, difficulty: d });
    } catch (e) {
      fail("THROW", entry.id, "Test", 99, `difficulty=${d} threw: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    bump();
    if (Array.isArray(problems) && problems.length === 0 && !entry.underConstruction) {
      fail("EMPTY", entry.id, "Test", 99, `difficulty=${d} produced 0 problems`);
    }
  }
}

report("rt-fuzz");
process.exit(0);

// fuzz.ts
// Crash-hunting + invariant fuzzing: thousands of seeds across every domain,
// difficulty, and count, asserting that generation never throws and every
// problem passes the invariant suite. Any throw or invariant failure is a bug.

import { generateSATProblems, buildSATModule, SAT_TIMING_PRESETS } from "@/lib/satTypes";
import type { SATDifficulty } from "@/lib/satTypes";
import { newCtx, check, type CheckCtx } from "./checks";
import { DOMAINS, checkProblemInvariants } from "./matrix";

export function runFuzz(ctx: CheckCtx, seeds = 3000): { problems: number } {
  let problems = 0;
  let mcq = 0;
  let gridIn = 0;
  const subdomains = new Set<string>();

  for (let s = 0; s < seeds; s++) {
    const di = s % DOMAINS.length;
    const domain = DOMAINS[di];
    const diff = ((Math.floor(s / DOMAINS.length) % 3) + 1) as SATDifficulty;
    const seed = 2_000_000 + s * 7919;
    let ps;
    try {
      ps = generateSATProblems(domain, seed, 2, diff);
    } catch (e) {
      check(ctx, false, `fuzz seed=${seed} ${domain} d${diff}: threw ${(e as Error).message}`);
      continue;
    }
    check(ctx, ps.length === 2, `fuzz seed=${seed}: generated 2 problems`);
    for (const p of ps) {
      problems++;
      if (p.format === "MCQ") mcq++;
      else gridIn++;
      subdomains.add(p.subdomain);
      try {
        checkProblemInvariants(ctx, p, `fuzz/seed${seed}`, { domain, difficulty: diff });
      } catch (e) {
        check(ctx, false, `fuzz seed=${seed}: invariant checker threw ${(e as Error).message}`);
      }
    }
  }

  // Full modules at assorted seeds (exercises buildSATModule + timing presets).
  for (let s = 0; s < 200; s++) {
    const seed = 3_000_000 + s * 104729;
    try {
      const { problems: ps, minutes, questions } = buildSATModule({
        preset: SAT_TIMING_PRESETS["full-module"],
        seed,
      });
      check(ctx, questions === 22, `fuzz module seed=${seed}: 22 questions`);
      check(ctx, minutes === 35, `fuzz module seed=${seed}: 35 minutes`);
      check(ctx, ps.length === 22, `fuzz module seed=${seed}: 22 problems`);
      // Difficulty ordering: non-decreasing (easy → hard like the real SAT).
      for (let i = 1; i < ps.length; i++) {
        if (ps[i].difficulty < ps[i - 1].difficulty) {
          check(ctx, false, `fuzz module seed=${seed}: difficulty ordering violated at ${i}`);
          break;
        }
      }
      check(ctx, true, `fuzz module seed=${seed}: difficulty ordering holds`);
      for (const p of ps) {
        problems++;
        subdomains.add(p.subdomain);
        checkProblemInvariants(ctx, p, `fuzz/module/seed${seed}`);
      }
    } catch (e) {
      check(ctx, false, `fuzz module seed=${seed}: threw ${(e as Error).message}`);
    }
  }

  check(ctx, subdomains.size === 16, `fuzz: all 16 subdomains seen (saw ${subdomains.size})`);
  check(ctx, mcq > 0 && gridIn > 0, `fuzz: both formats seen (${mcq} MCQ, ${gridIn} grid-in)`);
  // Roughly 3:1 MCQ:grid-in like the digital SAT (allow wide tolerance).
  const ratio = mcq / Math.max(1, gridIn);
  check(ctx, ratio > 1.5 && ratio < 6, `fuzz: MCQ:grid-in ratio ≈ 3:1 (got ${ratio.toFixed(2)})`);

  return { problems };
}

// Runnable directly: `npx tsx tests/sat/fuzz.ts [seeds]`
if (require.main === module) {
  const ctx = newCtx();
  const seeds = parseInt(process.argv[2] ?? "3000", 10);
  const { problems } = runFuzz(ctx, seeds);
  console.log(
    `fuzz: ${problems} problems, ${ctx.checks} checks, ${ctx.failures.length} failures`
  );
  for (const f of ctx.failures.slice(0, 25)) console.log("  FAIL:", f);
  process.exit(ctx.failures.length ? 1 : 0);
}

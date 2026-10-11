// verify.ts
// HUNT WRONG ANSWERS.
// For EVERY generated MCQ: independently recompute the keyed answer via the
// solvers (a separate code path from the generators) and prove the key is
// correct. Then try to prove each distractor ACCIDENTALLY CORRECT — any hit
// is a generator bug and fails the run.
// For grid-ins: verify every accepted form parses to the key value exactly,
// and reject ambiguous (unparseable) forms.

import { generateSATProblems, buildSATModule, SAT_TIMING_PRESETS } from "@/lib/satTypes";
import type { SATDomain, SATProblem, SATDifficulty } from "@/lib/satTypes";
import { solveIndependent, parseGridForm } from "./solvers";
import { newCtx, check, type CheckCtx } from "./checks";
import { DOMAINS } from "./matrix";

function verifyProblem(ctx: CheckCtx, p: SATProblem, tag: string): void {
  const t = `${tag} [${p.domain}/${p.subdomain}]`;
  let solved;
  try {
    solved = solveIndependent(p.subdomain, p.verify.params);
  } catch (e) {
    check(ctx, false, `${t}: solver crashed: ${(e as Error).message}`);
    return;
  }
  check(ctx, true, `${t}: solver ran`); // counts the attempt

  // 1. The keyed answer must be correct.
  check(ctx, solved.display === p.key, `${t}: key label matches solver (${p.key} vs ${solved.display})`);
  check(
    ctx,
    Math.abs(solved.value - p.keyValue) < 1e-9,
    `${t}: keyValue matches solver (${p.keyValue} vs ${solved.value})`
  );

  if (p.format === "MCQ" && p.options && p.keyIndex !== undefined) {
    const keyed = p.options[p.keyIndex];
    check(ctx, keyed.isKey, `${t}: keyIndex marks the key`);
    check(ctx, keyed.label === p.key, `${t}: keyed option label === key`);

    // 2. HUNT: try to prove a distractor accidentally correct.
    for (const o of p.options) {
      if (o.isKey) continue;
      const labelHit = o.label === solved.display;
      const valueHit = Math.abs(o.value - solved.value) < 1e-9;
      check(
        ctx,
        !labelHit && !valueHit,
        `${t}: distractor ${o.option} (${o.label}) is NOT accidentally correct`
      );
      // Distractor must also disagree with the problem's own keyed data.
      check(ctx, o.label !== p.key, `${t}: distractor ${o.option} label ≠ key`);
      check(
        ctx,
        Math.abs(o.value - p.keyValue) >= 1e-9,
        `${t}: distractor ${o.option} value ≠ keyValue`
      );
    }
    // 3. Option values are pairwise distinct.
    const vals = p.options.map((o) => o.value);
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        check(
          ctx,
          Math.abs(vals[i] - vals[j]) >= 1e-9,
          `${t}: options ${i},${j} pairwise distinct`
        );
      }
    }
  } else if (p.format === "GridIn" && p.acceptedForms) {
    // 4. Every accepted form must be exact and unambiguous.
    for (const form of p.acceptedForms) {
      const v = parseGridForm(form);
      check(ctx, Number.isFinite(v), `${t}: form "${form}" parses (not ambiguous)`);
      if (Number.isFinite(v)) {
        check(
          ctx,
          Math.abs(v - solved.value) < 1e-9,
          `${t}: form "${form}" === solver value`
        );
        check(
          ctx,
          Math.abs(v - p.keyValue) < 1e-9,
          `${t}: form "${form}" === keyValue`
        );
      }
    }
  } else {
    check(ctx, false, `${t}: problem has neither MCQ options nor grid-in forms`);
  }
}

export function runVerify(ctx: CheckCtx, seedsPerMaker = 400): { problems: number } {
  let problems = 0;
  // Per-domain sweep: many seeds × all difficulties, both formats arise naturally.
  for (let di = 0; di < DOMAINS.length; di++) {
    const domain: SATDomain = DOMAINS[di];
    for (const diff of [1, 2, 3] as SATDifficulty[]) {
      for (let s = 0; s < seedsPerMaker; s++) {
        const seed = 500_000 + di * 100_000 + diff * 10_000 + s;
        let ps;
        try {
          ps = generateSATProblems(domain, seed, 2, diff);
        } catch (e) {
          check(ctx, false, `verify/${domain}/d${diff}/seed${seed}: generation threw ${(e as Error).message}`);
          continue;
        }
        for (const p of ps) {
          verifyProblem(ctx, p, `verify/${domain}/d${diff}/seed${seed}`);
          problems++;
        }
      }
    }
  }
  // Full timed modules: verify mixed-domain output too.
  for (let s = 0; s < 60; s++) {
    let ps;
    try {
      ({ problems: ps } = buildSATModule({
        preset: SAT_TIMING_PRESETS["full-module"],
        seed: 900_000 + s,
      }));
    } catch (e) {
      check(ctx, false, `verify/module/seed${900_000 + s}: generation threw ${(e as Error).message}`);
      continue;
    }
    for (const p of ps) {
      verifyProblem(ctx, p, `verify/module/seed${900_000 + s}`);
      problems++;
    }
  }
  return { problems };
}

// Runnable directly: `npx tsx tests/sat/verify.ts`
if (require.main === module) {
  const ctx = newCtx();
  const perMaker = parseInt(process.argv[2] ?? "400", 10);
  const { problems } = runVerify(ctx, perMaker);
  console.log(
    `verify: ${problems} problems, ${ctx.checks} checks, ${ctx.failures.length} failures`
  );
  for (const f of ctx.failures.slice(0, 25)) console.log("  FAIL:", f);
  process.exit(ctx.failures.length ? 1 : 0);
}

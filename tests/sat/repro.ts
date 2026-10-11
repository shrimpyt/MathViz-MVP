// repro.ts
// Seed reproducibility + answer-key exactness:
//  - Same seed → byte-identical problem JSON (across repeated runs in-process).
//  - Different seeds → different output (the seed actually matters).
//  - Answer-key rendering (latexToText/pdfSafeText over key + explanation)
//    is deterministic across difficulties and seeds.
//  - Per-seed key-position distribution: the keyed MCQ option is spread over
//    A–D (a shuffle that always parked the key at A would be a bug).

import { generateSATProblems } from "@/lib/satTypes";
import type { SATDifficulty } from "@/lib/satTypes";
import { latexToText, pdfSafeText } from "@/lib/answerKey";
import { newCtx, check, type CheckCtx } from "./checks";
import { DOMAINS } from "./matrix";

export function runRepro(ctx: CheckCtx): void {
  for (let di = 0; di < DOMAINS.length; di++) {
    const domain = DOMAINS[di];
    for (const diff of [1, 2, 3] as SATDifficulty[]) {
      for (const seed of [1, 42, 123456]) {
        const a = JSON.stringify(generateSATProblems(domain, seed, 5, diff));
        const b = JSON.stringify(generateSATProblems(domain, seed, 5, diff));
        check(ctx, a === b, `repro ${domain} d${diff} seed=${seed}: identical output`);
        const c = JSON.stringify(generateSATProblems(domain, seed + 1, 5, diff));
        check(ctx, a !== c, `repro ${domain} d${diff}: seed changes output`);
      }
    }

    // Answer-key exactness: render key + explanation through the same
    // text pipeline the renderers use; must be stable and non-empty.
    for (const diff of [1, 2, 3] as SATDifficulty[]) {
      const ps = generateSATProblems(domain, 777, 10, diff);
      for (const p of ps) {
        const keyText = pdfSafeText(p.key);
        const expText = latexToText(p.explanation);
        check(ctx, keyText.length > 0, `repro ${domain} d${diff}: key renders non-empty`);
        check(ctx, expText.length > 0, `repro ${domain} d${diff}: explanation renders non-empty`);
        check(
          ctx,
          pdfSafeText(p.key) === keyText,
          `repro ${domain} d${diff}: key rendering deterministic`
        );
        if (p.format === "MCQ" && p.options) {
          for (const o of p.options) {
            const t = pdfSafeText(o.label);
            check(ctx, t.length > 0, `repro ${domain} d${diff}: option ${o.option} renders`);
          }
        }
        if (p.format === "GridIn" && p.acceptedForms) {
          for (const f of p.acceptedForms) {
            check(
              ctx,
              pdfSafeText(f).length > 0,
              `repro ${domain} d${diff}: accepted form renders`
            );
          }
        }
      }
    }

    // Key-position spread over A–D across 400 MCQs.
    const pos = [0, 0, 0, 0];
    let mcqCount = 0;
    for (let s = 0; s < 400; s++) {
      const ps = generateSATProblems(domain, 50_000 + s, 3, 2);
      for (const p of ps) {
        if (p.format === "MCQ" && p.keyIndex !== undefined) {
          pos[p.keyIndex]++;
          mcqCount++;
        }
      }
    }
    check(ctx, mcqCount > 200, `repro ${domain}: enough MCQs sampled (${mcqCount})`);
    for (let i = 0; i < 4; i++) {
      check(
        ctx,
        pos[i] > mcqCount * 0.1,
        `repro ${domain}: key lands on ${"ABCD"[i]} reasonably often (${pos[i]}/${mcqCount})`
      );
    }
  }
}

// Runnable directly: `npx tsx tests/sat/repro.ts`
if (require.main === module) {
  const ctx = newCtx();
  runRepro(ctx);
  console.log(`repro: ${ctx.checks} checks, ${ctx.failures.length} failures`);
  for (const f of ctx.failures.slice(0, 25)) console.log("  FAIL:", f);
  process.exit(ctx.failures.length ? 1 : 0);
}

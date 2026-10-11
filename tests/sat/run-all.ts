// run-all.ts
// SAT test orchestrator: runs every suite headless, aggregates check counts,
// and writes tests/sat/TEST_REPORT.md. Usage: `npx tsx tests/sat/run-all.ts`

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { newCtx, type CheckCtx } from "./checks";
import { runMatrix } from "./matrix";
import { runVerify } from "./verify";
import { runFuzz } from "./fuzz";
import { runRepro } from "./repro";
import { runPdfCheck } from "./pdfcheck";

const here = dirname(fileURLToPath(import.meta.url));

interface SuiteResult {
  name: string;
  problems: number;
  checks: number;
  failures: number;
  ms: number;
  sampleFailures: string[];
}

async function main(): Promise<void> {
  const suites: SuiteResult[] = [];

  async function runSuite(
    name: string,
    fn: (ctx: CheckCtx) => { problems: number } | void | Promise<void>
  ): Promise<void> {
    const ctx = newCtx();
    const t0 = Date.now();
    let problems = 0;
    const r = await fn(ctx);
    if (r && typeof r.problems === "number") problems = r.problems;
    suites.push({
      name,
      problems,
      checks: ctx.checks,
      failures: ctx.failures.length,
      ms: Date.now() - t0,
      sampleFailures: ctx.failures.slice(0, 10),
    });
    console.log(
      `${name}: ${problems} problems, ${ctx.checks} checks, ${ctx.failures.length} failures (${Date.now() - t0}ms)`
    );
  }

  await runSuite("matrix", (ctx) => runMatrix(ctx));
  await runSuite("verify", (ctx) => runVerify(ctx, 400));
  await runSuite("fuzz", (ctx) => runFuzz(ctx, 3000));
  await runSuite("repro", (ctx) => {
    runRepro(ctx);
  });
  await runSuite("pdfcheck", (ctx) => runPdfCheck(ctx));

  const totalChecks = suites.reduce((a, s) => a + s.checks, 0);
  const totalFailures = suites.reduce((a, s) => a + s.failures, 0);
  const totalProblems = suites.reduce((a, s) => a + s.problems, 0);
  const stamp = new Date().toISOString();

  const lines = [
    "# SAT Math Practice Generator — Test Report",
    "",
    `Generated: ${stamp}`,
    `Suites: ${suites.map((s) => s.name).join(", ")}`,
    "",
    "## Totals",
    "",
    `- Problems generated: ${totalProblems.toLocaleString()}`,
    `- Headless checks: ${totalChecks.toLocaleString()}`,
    `- Failures: ${totalFailures}`,
    `- Verdict: ${totalFailures === 0 ? "PASS — zero failures" : "FAIL"}`,
    "",
    "## Suites",
    "",
    "| Suite | Problems | Checks | Failures | Time |",
    "| ----- | -------- | ------ | -------- | ---- |",
    ...suites.map(
      (s) =>
        `| ${s.name} | ${s.problems.toLocaleString()} | ${s.checks.toLocaleString()} | ${s.failures} | ${(s.ms / 1000).toFixed(1)}s |`
    ),
    "",
    "## What each suite proves",
    "",
    "- **matrix**: full domain × mode × difficulty(1–3) × count{1,3,12,25} generation; schema invariants per problem (4 options A–D, exactly one key, documented misconception + teacher note per distractor, grid-in accepted forms, diagram validity); registry entries mode-independent.",
    "- **verify**: INDEPENDENT answer recomputation via tests/sat/solvers.ts (separate code path, never imports factories) including substitution/property checks; hunts accidentally-correct distractors (any hit = bug); grid-in forms must all parse exactly to the key value; ambiguous forms rejected.",
    "- **fuzz**: 3,000 seeded generations + 200 full timed modules; no throws; all invariants hold; all 16 subdomains and both formats observed; MCQ:grid-in ratio ≈ 3:1; module difficulty ordering easy→hard.",
    "- **repro**: same seed → byte-identical JSON; different seeds → different output; answer-key text pipeline (latexToText/pdfSafeText) deterministic and non-empty; keyed MCQ option spread across A–D.",
    "- **pdfcheck**: real @react-pdf render of stems, options, grid-in keys, and all three SAT diagram kinds (SatTable, SatRightTriangle, SatTriangle); non-trivial %PDF- output; stable byte length across renders; full 22-question module renders.",
    "",
  ];
  if (totalFailures > 0) {
    lines.push("## Failures", "");
    for (const s of suites) {
      if (s.failures > 0) {
        lines.push(`### ${s.name} (${s.failures})`, "");
        for (const f of s.sampleFailures) lines.push(`- ${f}`);
        lines.push("");
      }
    }
  } else {
    lines.push(
      "## Notes",
      "",
      "- Distractor pools use graceful filtering (pickDistractors): candidates colliding with the key or each other are dropped; generation throws only if fewer than 3 documented-error distractors survive — the fuzz run proves this never happens across 3,000 seeds.",
      "- Inequality correctness is decided by the full (boundary, direction) string, not the numeric boundary alone; the flipped-direction distractor is intentionally boundary-equal.",
      "- Classical-notes contract: SAT generators are mode-agnostic (no steps emitted), so 'Classical' is handled exactly like 'Review'; not in the matrix per coordinator instruction.",
      ""
    );
  }

  const reportPath = join(here, "TEST_REPORT.md");
  writeFileSync(reportPath, lines.join("\n"));
  console.log(`\nWrote ${reportPath}`);
  console.log(`TOTAL: ${totalChecks.toLocaleString()} checks, ${totalFailures} failures`);
  process.exit(totalFailures ? 1 : 0);
}

main();

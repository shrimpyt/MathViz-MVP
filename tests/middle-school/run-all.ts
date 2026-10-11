// run-all.ts — runs the full middle-school headless suite and totals the checks.
// Usage: npx tsx tests/middle-school/run-all.ts

import { run as runMatrix } from "./01-matrix";
import { run as runRecompute } from "./02-recompute";
import { run as runFuzz } from "./03-fuzz";
import { run as runRepro } from "./04-repro";
import { run as runPdf } from "./05-pdf";
import { run as runAnswerKey } from "./06-answerkey";
import { result, printResult, resetCounters, isMain } from "./helpers";

async function main(): Promise<void> {
  const totals = { checks: 0, failures: 0 };

  const suites: Array<[string, () => void | Promise<void>]> = [
    ["01-matrix", runMatrix],
    ["02-recompute", runRecompute],
    ["03-fuzz", runFuzz],
    ["04-repro", runRepro],
    ["05-pdf", runPdf],
    ["06-answerkey", runAnswerKey],
  ];

  for (const [name, fn] of suites) {
    resetCounters();
    await fn();
    const r = result(name);
    printResult(r);
    totals.checks += r.checks;
    totals.failures += r.failures.length;
  }

  console.log(`\nTOTAL: ${totals.checks} checks, ${totals.failures} failures`);
  if (totals.failures > 0) process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  main();
}

// run-all.ts
// Master runner for the precalculus test suites.
// Usage: npx tsx tests/precalculus/run-all.ts

import { printResult, type SuiteResult } from "./helpers";
import { runMatrix } from "./test-matrix";
import { runAnswers } from "./test-answers";
import { runFRQConsistency } from "./test-frq-consistency";
import { runFuzz } from "./test-fuzz";
import { runPdfBytes } from "./test-pdf-bytes";

async function main(): Promise<void> {
  const t0 = Date.now();
  const results: SuiteResult[] = [];
  results.push(runMatrix());
  results.push(runAnswers());
  results.push(runFRQConsistency());
  results.push(runFuzz());
  results.push(await runPdfBytes());

  let totalChecks = 0;
  let totalFailures = 0;
  for (const r of results) {
    printResult(r);
    totalChecks += r.checks;
    totalFailures += r.failures.length;
  }
  console.log(`\nTOTAL: ${totalChecks} checks, ${totalFailures} failures in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (totalFailures > 0) process.exit(1);
}

main();

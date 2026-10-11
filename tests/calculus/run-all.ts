// run-all.ts
// Runs every calculus test suite and prints the grand totals.
// Each suite calls reset() first, so stats() after a suite = that suite.
// Usage: npx tsx tests/calculus/run-all.ts

import { runMatrix } from "./test-matrix";
import { runVerify } from "./test-verify";
import { runFRQ } from "./test-frq";
import { runFuzz } from "./test-fuzz";
import { runPdf } from "./test-pdf";
import { runAnswers } from "./test-answers";
import { stats } from "./harness";

async function main(): Promise<void> {
  const suites: { name: string; run: () => void | Promise<void> }[] = [
    { name: "matrix", run: runMatrix },
    { name: "verify", run: runVerify },
    { name: "frq", run: runFRQ },
    { name: "fuzz", run: runFuzz },
    { name: "pdf", run: runPdf },
    { name: "answers", run: runAnswers },
  ];
  let grandChecks = 0;
  let grandFailures = 0;
  const failedSuites: string[] = [];
  for (const s of suites) {
    const t0 = Date.now();
    await s.run();
    const st = stats();
    grandChecks += st.checks;
    grandFailures += st.failures.length;
    const status = st.failures.length === 0 ? "PASS" : "FAIL";
    if (status === "FAIL") failedSuites.push(s.name);
    console.log(`[${status}] ${s.name}: ${st.checks} checks, ${st.failures.length} failures (${Date.now() - t0}ms)`);
    for (const f of st.failures.slice(0, 10)) console.log(`    FAIL: ${f}`);
  }
  console.log(`\nTOTAL: ${grandChecks} checks, ${grandFailures} failures`);
  if (failedSuites.length > 0) {
    console.log(`failed suites: ${failedSuites.join(", ")}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL", (e as Error).stack ?? (e as Error).message);
  process.exit(1);
});

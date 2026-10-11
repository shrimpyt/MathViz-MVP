// harness.ts
// Minimal headless test harness: check counting, failure collection,
// deep equality, and report writing. Every check() call counts as one
// "headless check" in TEST_REPORT.md.

export let checks = 0;
export const failures: string[] = [];
let context = "";

export function section(name: string) {
  context = name;
}

export function check(cond: boolean, detail: string): void {
  checks++;
  if (!cond) failures.push(`[${context}] ${detail}`);
}

/** Structural deep equality via canonical JSON. */
export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function summary(): { checks: number; failures: number } {
  return { checks, failures: failures.length };
}

export function report(name: string): void {
  const s = summary();
  console.log(`— ${name}: ${s.checks} checks, ${s.failures} failures`);
  if (s.failures > 0) {
    console.log("FAILURES (first 30):");
    for (const f of failures.slice(0, 30)) console.log("  ✗ " + f);
    process.exitCode = 1;
  }
}

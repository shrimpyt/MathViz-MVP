// helpers.ts — shared harness for the precalculus test suites.
// Every check() call counts as one headless check.

export interface SuiteResult {
  name: string;
  checks: number;
  failures: string[];
}

let CHECKS = 0;
const FAILURES: string[] = [];

export function resetCounters(): void {
  CHECKS = 0;
  FAILURES.length = 0;
}

export function check(cond: boolean, msg: string): void {
  CHECKS++;
  if (!cond) FAILURES.push(msg);
}

export function approx(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol;
}

/** Extract all decimal numbers (incl. unicode minus) from a string. */
export function extractNumbers(s: string): number[] {
  const norm = s.replace(/−/g, "-").replace(/,/g, " ");
  const matches = norm.match(/-?\d+(\.\d+)?/g) ?? [];
  return matches.map(Number).filter((n) => isFinite(n));
}

export function result(name: string): SuiteResult {
  return { name, checks: CHECKS, failures: [...FAILURES] };
}

export function printResult(r: SuiteResult): void {
  console.log(
    `${r.name}: ${r.checks} checks, ${r.failures.length} failures`
  );
  for (const f of r.failures.slice(0, 20)) console.log(`  FAIL: ${f}`);
  if (r.failures.length > 20) console.log(`  ... and ${r.failures.length - 20} more`);
}

/** True when run directly via `npx tsx <this-file>` (not imported). */
export function isMain(fileUrl: string): boolean {
  const arg = process.argv[1] ?? "";
  const base = fileUrl.split("/").pop() ?? "";
  return arg.endsWith(base);
}

// helpers.ts — shared harness for the middle-school test suites.
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

export function result(name: string): SuiteResult {
  return { name, checks: CHECKS, failures: [...FAILURES] };
}

export function printResult(r: SuiteResult): void {
  console.log(`${r.name}: ${r.checks} checks, ${r.failures.length} failures`);
  for (const f of r.failures.slice(0, 25)) console.log(`  FAIL: ${f}`);
  if (r.failures.length > 25) console.log(`  ... and ${r.failures.length - 25} more`);
}

/** True when run directly via `npx tsx <this-file>` (not imported). */
export function isMain(fileUrl: string): boolean {
  const arg = process.argv[1] ?? "";
  const base = fileUrl.split("/").pop() ?? "";
  return arg.endsWith(base);
}

/** Normalize an answer for comparison: numbers → trimmed numeric string. */
export function normAnswer(a: string | number): string {
  if (typeof a === "number") {
    if (!isFinite(a)) return String(a);
    return String(Math.round(a * 1e10) / 1e10);
  }
  return a.trim().replace(/\s+/g, " ");
}

/** True when expected and actual answers agree (numeric tolerance or exact). */
export function answersEqual(expected: string | number, actual: string | number): boolean {
  const e = normAnswer(expected);
  const a = normAnswer(actual);
  if (e === a) return true;
  const en = Number(e.replace(/,/g, ""));
  const an = Number(a.replace(/,/g, ""));
  if (isFinite(en) && isFinite(an)) return approx(en, an, 1e-9);
  return false;
}

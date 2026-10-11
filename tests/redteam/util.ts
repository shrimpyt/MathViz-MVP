// util.ts — redteam shared helpers (NOT a test itself)
import { formatAnswer, latexToText, pdfSafeText } from "@/lib/answerKey";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";

export interface Failure {
  kind: string;
  seed: number;
  entryId: string;
  mode: string;
  detail: string;
}

export const failures: Failure[] = [];
export const counter = { checks: 0 };

export function fail(kind: string, entryId: string, mode: string, seed: number, detail: string) {
  failures.push({ kind, entryId, mode, seed, detail });
}

export function isBadNum(x: unknown): boolean {
  return typeof x === "number" && (!Number.isFinite(x) || Number.isNaN(x));
}

/** Recursively scan an object for NaN / ±Infinity / undefined inside required-ish fields */
export function scanBadNumbers(obj: unknown, path: string, out: string[]): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === "number") {
    if (isBadNum(obj)) out.push(`${path} = ${obj}`);
    return;
  }
  if (typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v === undefined && !k.startsWith("_")) {
      // undefined is common in sparse objects; only flag inside answer/steps
      if (/answer|given|find/i.test(path + "." + k)) out.push(`${path}.${k} = undefined`);
    } else scanBadNumbers(v, `${path}.${k}`, out);
  }
}

export function tryFormatAnswer(p: MathProblem): { text: string; threw: string | null } {
  try {
    const t = formatAnswer(p);
    return { text: t ?? "", threw: null };
  } catch (e) {
    return { text: "", threw: e instanceof Error ? e.message : String(e) };
  }
}

export { formatAnswer, latexToText, pdfSafeText };
export type { MathProblem, OutputMode };

export function report(title: string): number {
  console.log(`\n===== ${title} =====`);
  console.log(`checks: ${counter.checks}, failures: ${failures.length}`);
  const byKind = new Map<string, number>();
  for (const f of failures) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
  for (const [k, n] of [...byKind.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`  [${k}] ${n}`);
  // print first few distinct failures per kind
  const shown = new Set<string>();
  for (const f of failures) {
    const key = f.kind + "|" + f.entryId + "|" + f.detail.slice(0, 90);
    if (shown.has(key)) continue;
    shown.add(key);
    console.log(`  FAIL ${f.kind} ${f.entryId} [${f.mode}] seed=${f.seed}: ${f.detail.slice(0, 220)}`);
    if (shown.size > 60) { console.log("  ... (truncated)"); break; }
  }
  return failures.length;
}

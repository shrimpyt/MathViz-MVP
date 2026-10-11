// checks.ts
// Shared assertion-counting context for the SAT test scripts.
// Every check() call counts as one headless check; failures accumulate
// with messages instead of throwing, so one run reports everything.

export interface CheckCtx {
  checks: number;
  failures: string[];
}

export function newCtx(): CheckCtx {
  return { checks: 0, failures: [] };
}

export function check(ctx: CheckCtx, cond: boolean, msg: string): void {
  ctx.checks++;
  if (!cond) ctx.failures.push(msg);
}

export function mergeCtx(into: CheckCtx, from: CheckCtx): void {
  into.checks += from.checks;
  into.failures.push(...from.failures);
}

export function summarize(ctx: CheckCtx): string {
  return `${ctx.checks} checks, ${ctx.failures.length} failures`;
}

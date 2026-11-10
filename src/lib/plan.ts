// ── Plan / pay-gate rules (client side) ─────────────────────────────────────
// Mirrors auth-workers-spec.md. This is a SOFT gate by design (Sterling's
// flag, adopted): Free limits are enforced server-side by the Worker when
// an account exists; anonymous use falls back to a local monthly counter.
// The spec says "soft gate" in writing rather than pretending otherwise.

export type PlanTier = "free" | "pro";

/** Monthly PDF-export generations allowed on Free. */
export const FREE_GENERATION_LIMIT = 5;

/** Free topics: Algebra I + all middle school (Ada default, Oct 13, 2026,
 *  escalated for Trystan's approval; accommodations are never in Free). */
export function isFreeTopic(entryId: string): boolean {
  return (
    entryId.startsWith("a1-") ||
    entryId.startsWith("ms6-") ||
    entryId.startsWith("ms7-") ||
    entryId.startsWith("ms8-")
  );
}

export interface AccountState {
  /** "signed-in" only when the Worker confirmed a session. */
  status: "anon" | "signed-in";
  email: string | null;
  plan: PlanTier;
  /** Generations used this month (Worker count when signed in, local
   *  counter when anonymous). */
  used: number;
  limit: number | null; // null = unlimited (Pro)
}

export const ANON_ACCOUNT: AccountState = {
  status: "anon",
  email: null,
  plan: "free",
  used: 0,
  limit: FREE_GENERATION_LIMIT,
};

// ── Local (anonymous) monthly counter ────────────────────────────────────────
const LOCAL_KEY = "euclid-gen-count-v1";

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function readLocalUsage(now = new Date()): number {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { month?: string; count?: number };
    return parsed.month === currentMonthKey(now) ? (parsed.count ?? 0) : 0;
  } catch {
    return 0;
  }
}

export function bumpLocalUsage(now = new Date()): number {
  const next = readLocalUsage(now) + 1;
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ month: currentMonthKey(now), count: next }),
    );
  } catch {
    /* storage unavailable, soft gate stays soft */
  }
  return next;
}

/** Whether a lesson can be picked on this plan right now: built, and either
 *  Free or the account is Pro. The topic list's "Available only" filter uses
 *  this, so it never lists a lesson that would only show the Pro notice. */
export function isTopicAvailable(
  entry: { id: string; underConstruction?: boolean },
  isPro: boolean,
): boolean {
  if (entry.underConstruction) return false;
  return isPro || isFreeTopic(entry.id);
}

export type ExportGateReason = "accommodations" | "limit";

/** What the Export button explains when Free can't export this worksheet,
 *  instead of jumping to /pricing without a word. */
export function exportGateCopy(
  reason: ExportGateReason,
  opts: { signedIn: boolean; limit: number },
): { title: string; body: string[] } {
  const body: string[] = [];
  if (reason === "accommodations") {
    body.push(
      "This worksheet includes accommodated versions for your IEP groups, and exporting those is part of Pro.",
      "To export just the base worksheet on Free, remove the groups in step 3, Accommodations.",
    );
  } else {
    body.push(
      `You've used all ${opts.limit} free exports for this month. They reset at the start of next month, and Pro is unlimited.`,
    );
  }
  if (!opts.signedIn) body.push("Already have Pro? Sign in and export from here.");
  return {
    title: reason === "accommodations" ? "Accommodated versions need Pro" : "Free exports used up for this month",
    body,
  };
}

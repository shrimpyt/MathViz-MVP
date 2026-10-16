// ── Account API client ───────────────────────────────────────────────────────
// Talks to the Euclid API Worker (worker/ in this repo). Every call fails
// SOFT: if the API is unreachable (not deployed yet, offline, etc.) the app
// behaves as anonymous Free with the local counter from plan.ts. The gate
// must never break worksheet generation for a classroom user.

import { FREE_GENERATION_LIMIT, type AccountState, type PlanTier } from "./plan";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://euclidengine.tech/api";

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface MeResponse {
  email: string;
  plan: PlanTier;
  used: number;
}

/** Current session + plan + this month's usage, or null when anonymous /
 *  the API is unavailable. */
export async function fetchAccount(): Promise<AccountState | null> {
  const me = await api<MeResponse>("/me");
  if (!me) return null;
  return {
    status: "signed-in",
    email: me.email,
    plan: me.plan,
    used: me.used,
    limit: me.plan === "pro" ? null : FREE_GENERATION_LIMIT,
  };
}

/** Ask the Worker to email a magic sign-in link. Returns false only when
 *  the API is unreachable, the UI says so honestly rather than pretending
 *  an email was sent. */
export async function requestSignInLink(email: string): Promise<boolean> {
  const res = await api<{ ok: boolean }>("/auth/request-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res?.ok === true;
}

export async function signOut(): Promise<void> {
  await api("/auth/signout", { method: "POST" });
}

export type CheckoutKind = "monthly" | "annual" | "school" | "founders";

/** Create a Stripe Checkout session and return its URL, or null. */
export async function createCheckoutUrl(
  kind: CheckoutKind,
): Promise<string | null> {
  const res = await api<{ url: string }>("/checkout", {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
  return res?.url ?? null;
}

/** Stripe Billing portal URL (self-serve upgrade/cancel/card), or null. */
export async function createPortalUrl(): Promise<string | null> {
  const res = await api<{ url: string }>("/portal", { method: "POST" });
  return res?.url ?? null;
}

export interface GenerationVerdict {
  allowed: boolean;
  used: number;
  limit: number | null;
}

/** One PDF export by a signed-in account: which topics and format, never
 *  worksheet contents. Fire-and-forget telemetry so we can see which
 *  lessons teachers actually run; fails soft like every call here. */
export interface ExportEventPayload {
  topics: string[];
  docType: string;
  problems: number;
  versions: number;
}

export async function logExportEvent(payload: ExportEventPayload): Promise<void> {
  await api("/event", {
    method: "POST",
    body: JSON.stringify({ type: "export", ...payload }),
  });
}

/** Record one generation against the signed-in account. Null when the API
 *  is unreachable, the caller falls back to the local counter. */
export async function recordGeneration(): Promise<GenerationVerdict | null> {
  return api<GenerationVerdict>("/count", { method: "POST" });
}

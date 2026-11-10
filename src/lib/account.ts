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

export type SignInLinkResult = "sent" | "rate_limited" | "unavailable";

/** Ask the Worker to email a magic sign-in link (the older flow; the page
 *  now uses requestSignInCode, kept for compatibility). "unavailable" when the API
 *  is unreachable or email isn't configured, so the UI says so honestly
 *  rather than pretending an email was sent; "rate_limited" after too many
 *  requests for one address or network in 15 minutes. */
export async function requestSignInLink(email: string): Promise<SignInLinkResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/request-link`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) return "rate_limited";
    if (!res.ok) return "unavailable";
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true ? "sent" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export type SignInCodeRequest = "sent" | "rate_limited" | "invalid_email" | "unavailable";

/** Ask the Worker to email a 6-digit sign-in code. */
export async function requestSignInCode(email: string): Promise<SignInCodeRequest> {
  try {
    const res = await fetch(`${API_BASE}/auth/request-code`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) return "rate_limited";
    if (res.status === 400) return "invalid_email";
    if (!res.ok) return "unavailable";
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true ? "sent" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export type SignInCodeCheck =
  | "ok"
  | "wrong_code"
  | "expired"
  | "too_many_attempts"
  | "rate_limited"
  | "unavailable";

/** Check a typed code. On "ok" the Worker has set the session cookie, so
 *  fetchAccount() returns the signed-in account. */
export async function verifySignInCode(email: string, code: string): Promise<SignInCodeCheck> {
  try {
    const res = await fetch(`${API_BASE}/auth/verify-code`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (res.status === 429) return "rate_limited";
    const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res.ok && body?.ok === true) return "ok";
    const err = body?.error;
    if (err === "wrong_code" || err === "expired" || err === "too_many_attempts") return err;
    if (err === "invalid") return "wrong_code";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

export interface SignInMethods {
  google: boolean;
}

/** Which sign-in buttons to show. Google stays hidden until it is set up
 *  on the Worker, and whenever the API can't be reached. */
export async function fetchSignInMethods(): Promise<SignInMethods> {
  const m = await api<{ google?: boolean }>("/auth/methods");
  return { google: m?.google === true };
}

/** Where the "Continue with Google" button points (a full-page navigation). */
export const GOOGLE_SIGNIN_URL = `${API_BASE}/auth/google/start`;

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

// ── Saved worksheets (Pro library) ───────────────────────────────────────────
// Each saved worksheet is its settings and seed, never the PDF; the app
// rebuilds it with generateFromSettings() in lib/worksheetSettings.ts.

export interface SavedWorksheet {
  id: string;
  name: string;
  /** Raw stored settings; run through sanitizeSettings() before use. */
  settings: unknown;
  createdAt: number; // unix seconds
  updatedAt: number;
}

export type SavedLibrary =
  | { status: "ok"; pro: boolean; limit: number; items: SavedWorksheet[] }
  | { status: "signed-out" | "rate_limited" | "unavailable" };

/** The signed-in teacher's saved worksheets, newest first. */
export async function listSavedWorksheets(): Promise<SavedLibrary> {
  try {
    const res = await fetch(`${API_BASE}/worksheets`, { credentials: "include" });
    if (res.status === 401) return { status: "signed-out" };
    if (res.status === 429) return { status: "rate_limited" };
    if (!res.ok) return { status: "unavailable" };
    const body = (await res.json()) as { pro?: boolean; limit?: number; items?: SavedWorksheet[] };
    return {
      status: "ok",
      pro: body.pro === true,
      limit: typeof body.limit === "number" ? body.limit : 0,
      items: Array.isArray(body.items) ? body.items : [],
    };
  } catch {
    return { status: "unavailable" };
  }
}

export type LibraryWriteError =
  | "signed-out"
  | "pro_required"
  | "library_full"
  | "invalid"
  | "not_found"
  | "rate_limited"
  | "unavailable";

export type LibraryWrite<T> = { ok: true; value: T } | { ok: false; error: LibraryWriteError };

async function libraryPost<T>(path: string, payload: unknown, pick: (b: Record<string, unknown>) => T): Promise<LibraryWrite<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (res.ok && body.ok === true) return { ok: true, value: pick(body) };
    if (res.status === 401) return { ok: false, error: "signed-out" };
    if (res.status === 429) return { ok: false, error: "rate_limited" };
    if (res.status === 404) return { ok: false, error: "not_found" };
    const err = body.error;
    if (err === "pro_required" || err === "library_full") return { ok: false, error: err };
    if (res.status === 400 || res.status === 413) return { ok: false, error: "invalid" };
    return { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** Save the current worksheet's settings (Pro only). */
export function saveWorksheet(name: string, settings: unknown): Promise<LibraryWrite<SavedWorksheet>> {
  return libraryPost("/worksheets/save", { name, settings }, (b) => b.item as SavedWorksheet);
}

export function renameSavedWorksheet(id: string, name: string): Promise<LibraryWrite<string>> {
  return libraryPost("/worksheets/rename", { id, name }, (b) => String(b.name ?? name));
}

export function deleteSavedWorksheet(id: string): Promise<LibraryWrite<true>> {
  return libraryPost("/worksheets/delete", { id }, () => true as const);
}

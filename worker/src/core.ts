// ── Euclid API Worker, pure core logic ──────────────────────────────────────
// Framework-free and importable from Node (tests/paygate), everything here
// uses WebCrypto + plain functions only. The D1/Stripe/Resend plumbing lives
// in index.ts; decisions live here so they can be unit-tested.

export type Plan = "free" | "pro";

export const FREE_GENERATION_LIMIT = 5;
export const MAGIC_LINK_TTL_SEC = 15 * 60;
export const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomTokenHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Counter month key. The Worker counts in UTC; the client's anonymous
 *  local counter uses local time. A boundary-hour mismatch is acceptable
 *  for a soft gate and is documented as such. */
export function monthKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface UserPlanRow {
  plan: string; // 'free' | 'pro' | 'school'
  subscriptionStatus: string | null;
  currentPeriodEnd: number | null; // unix seconds
  founders: boolean;
}

/** The one place that decides what a user actually gets. Founders keep Pro
 *  forever; subscription plans count while active/trialing, and during
 *  past_due only until the paid period runs out (grace). */
export function effectivePlan(u: UserPlanRow, nowSec: number): Plan {
  if (u.founders) return "pro";
  if (u.plan === "pro" || u.plan === "school") {
    if (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing")
      return "pro";
    if (
      u.subscriptionStatus === "past_due" &&
      u.currentPeriodEnd !== null &&
      u.currentPeriodEnd > nowSec
    )
      return "pro";
  }
  return "free";
}

export function generationAllowed(plan: Plan, usedThisMonth: number): boolean {
  return plan === "pro" || usedThisMonth < FREE_GENERATION_LIMIT;
}

// ── Export telemetry ─────────────────────────────────────────────────────────
// Signed-in clients report each PDF export (topics + format + size) so the
// product can see which lessons teachers actually run. Worksheet contents
// are never sent. Validation is strict about shape and caps every field;
// anything unrecognized returns null and the caller answers 400.

export interface ExportEvent {
  topics: string[];
  docType: string;
  problems: number;
  versions: number;
}

function clampIntField(v: unknown, lo: number, hi: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, Math.floor(v)));
}

export function validateExportEvent(body: unknown): ExportEvent | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b["type"] !== "export") return null;
  if (!Array.isArray(b["topics"])) return null;
  const topics = b["topics"]
    .filter((t): t is string => typeof t === "string" && t.length > 0 && t.length <= 80)
    .slice(0, 24);
  const docType =
    typeof b["docType"] === "string" && b["docType"].length > 0 && b["docType"].length <= 40
      ? b["docType"]
      : "worksheet";
  return {
    topics,
    docType,
    problems: clampIntField(b["problems"], 0, 100_000, 0),
    versions: clampIntField(b["versions"], 1, 50, 1),
  };
}

// ── Stripe webhook signature verification ────────────────────────────────────
// Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256 (hex) using the
// endpoint secret; the header looks like `t=123,v1=abc,v1=def`.

export function parseStripeSignatureHeader(
  header: string,
): { timestamp: number; signatures: string[] } | null {
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = Number(v);
    if (k === "v1" && v) signatures.push(v);
  }
  if (timestamp === null || !Number.isFinite(timestamp) || signatures.length === 0)
    return null;
  return { timestamp, signatures };
}

export async function hmacSha256Hex(
  secret: string,
  payload: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
  nowSec: number,
  toleranceSec = 300,
): Promise<boolean> {
  const parsed = parseStripeSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSec - parsed.timestamp) > toleranceSec) return false;
  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${rawBody}`);
  return parsed.signatures.some((s) => timingSafeEqual(s, expected));
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Stripe event → user update reducer ───────────────────────────────────────

export interface UserUpdate {
  plan?: string;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: number | null;
  stripeCustomerId?: string;
  founders?: boolean;
}

export type StripeEventLike = {
  type: string;
  data: { object: Record<string, unknown> };
};

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function subscriptionPeriodEnd(obj: Record<string, unknown>): number | null {
  const direct = numOrNull(obj["current_period_end"]);
  if (direct !== null) return direct;
  const items = obj["items"] as { data?: Record<string, unknown>[] } | undefined;
  const first = items?.data?.[0];
  return first ? numOrNull(first["current_period_end"]) : null;
}

/** Pure mapping from a Stripe event to the user-row update it implies.
 *  Returns null for events we don't act on. Lookup keys tell index.ts which
 *  user to apply it to (checkout carries our user id; subscription events
 *  are matched by Stripe customer id). */
export function planUpdateFromStripeEvent(
  evt: StripeEventLike,
): { by: "userId" | "customerId"; key: string; update: UserUpdate } | null {
  const obj = evt.data.object;
  switch (evt.type) {
    case "checkout.session.completed": {
      const userId =
        (obj["client_reference_id"] as string) ||
        ((obj["metadata"] as Record<string, unknown> | undefined)?.["user_id"] as string);
      if (!userId) return null;
      const kind = (obj["metadata"] as Record<string, unknown> | undefined)?.["kind"] as
        | string
        | undefined;
      const customer = obj["customer"] as string | undefined;
      const update: UserUpdate = {};
      if (customer) update.stripeCustomerId = customer;
      if (kind === "founders") {
        update.founders = true;
        update.plan = "pro";
        update.subscriptionStatus = "active";
      } else if (kind === "school") {
        update.plan = "school";
        update.subscriptionStatus = "active";
      } else {
        update.plan = "pro";
        update.subscriptionStatus = "active";
      }
      return { by: "userId", key: userId, update };
    }
    case "customer.subscription.updated": {
      const customer = obj["customer"] as string | undefined;
      if (!customer) return null;
      return {
        by: "customerId",
        key: customer,
        update: {
          subscriptionStatus: (obj["status"] as string) ?? null,
          currentPeriodEnd: subscriptionPeriodEnd(obj),
        },
      };
    }
    case "customer.subscription.deleted": {
      const customer = obj["customer"] as string | undefined;
      if (!customer) return null;
      return {
        by: "customerId",
        key: customer,
        update: { subscriptionStatus: "canceled", plan: "free" },
      };
    }
    case "invoice.payment_failed": {
      const customer = obj["customer"] as string | undefined;
      if (!customer) return null;
      return {
        by: "customerId",
        key: customer,
        update: { subscriptionStatus: "past_due" },
      };
    }
    default:
      return null;
  }
}

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
    .slice(0, 60); // a worksheet holds at most 60 lessons; all of them go on the taught shelf
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

/** True when a Checkout Session's money has actually been collected (or
 *  none was due). "unpaid" sessions wait for async_payment_succeeded. */
export function checkoutPaymentCleared(obj: Record<string, unknown>): boolean {
  const status = obj["payment_status"];
  return status === "paid" || status === "no_payment_required";
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
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
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
      // A completed checkout is not a cleared payment: delayed methods (bank
      // debits, some wallets) finish the session as "unpaid" and settle
      // later with checkout.session.async_payment_succeeded. Grant only when
      // the money is in (or nothing was owed, e.g. a free trial).
      if (!checkoutPaymentCleared(obj)) {
        return update.stripeCustomerId ? { by: "userId", key: userId, update } : null;
      }
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

// ── Request guards ──────────────────────────────────────────────────────────

/** Origins allowed to call the API from a browser. localhost is allowed only
 *  when the Worker itself is running locally (APP_URL on localhost), so a
 *  production deploy never trusts a developer machine. */
export function allowedOrigins(appUrl: string): Set<string> {
  const set = new Set(["https://euclidengine.tech", "https://euclid-engine.pages.dev"]);
  if (isLocalAppUrl(appUrl)) {
    set.add("http://localhost:3000");
    set.add(appUrl.replace(/\/$/, ""));
  }
  return set;
}

export function isLocalAppUrl(appUrl: string): boolean {
  try {
    const host = new URL(appUrl).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** DEV_AUTH hands out sign-in links in the API response, which would let
 *  anyone sign in as anyone. It only ever counts on a local Worker. */
export function devAuthEnabled(devAuth: string | undefined, appUrl: string): boolean {
  return devAuth === "1" && isLocalAppUrl(appUrl);
}

/** State-changing browser calls must come from our own pages. Browsers
 *  always send Origin on POST, so a missing or foreign Origin is refused.
 *  (The Stripe webhook is server-to-server and is checked by signature.) */
export function originAllowed(origin: string | null, appUrl: string): boolean {
  return origin !== null && allowedOrigins(appUrl).has(origin);
}

// ── Sign-in email rate limits ───────────────────────────────────────────────

export const RATE_WINDOW_SEC = 15 * 60;
export const RATE_LIMIT_PER_EMAIL = 3;
export const RATE_LIMIT_PER_IP = 10;

/** Fixed-window bucket start for a timestamp. */
export function rateWindowStart(nowSec: number, windowSec = RATE_WINDOW_SEC): number {
  return nowSec - (nowSec % windowSec);
}

/** True when one more request fits under the limit. `countSoFar` is the
 *  number already recorded in the current window. */
export function underRateLimit(countSoFar: number, limit: number): boolean {
  return countSoFar < limit;
}

// ── Sign-in confirmation page ───────────────────────────────────────────────
// Opening the emailed link only shows this page; the token is spent by the
// button's POST. School mail filters (e.g. Microsoft Safe Links) open every
// link in an email to scan it, and a GET that spent the token meant the
// teacher's own click always failed.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function signInPageHtml(token: string, actionPath: string): string {
  const t = escapeHtml(token);
  const a = escapeHtml(actionPath);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sign in to Euclid Engine</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #14161f; color: #f2f3fa; font-family: system-ui, -apple-system, sans-serif; }
  main { max-width: 420px; padding: 32px 24px; text-align: center; }
  h1 { font-size: 1.4rem; margin: 0 0 12px; }
  p { color: #c6c9da; line-height: 1.5; margin: 0 0 24px; }
  button { font: inherit; font-weight: 700; font-size: 1rem; padding: 12px 28px; border: 0;
           border-radius: 12px; background: #f59e42; color: #14161f; cursor: pointer; }
  button:focus-visible { outline: 3px solid #818cf8; outline-offset: 3px; }
</style>
</head>
<body>
<main>
  <h1>Sign in to Euclid Engine</h1>
  <p>Press the button to finish signing in on this device. The link works once and expires 15 minutes after it was sent.</p>
  <form method="post" action="${a}">
    <input type="hidden" name="token" value="${t}">
    <button type="submit">Sign in</button>
  </form>
</main>
</body>
</html>`;
}

// ── Email sign-in codes ─────────────────────────────────────────────────────
// A 6-digit code the teacher types back into the page they are already on.
// Nothing to click, so school mail filters that open links can't spend it,
// and it works when the email is read on a phone but the site is open on a
// laptop.

export const SIGNIN_CODE_TTL_SEC = 10 * 60;
/** Wrong guesses allowed across all of one email's live codes. */
export const SIGNIN_CODE_MAX_ATTEMPTS = 5;
/** Code checks allowed per IP per window, across all emails. Generous because
 *  a whole school can share one IP; the per-code guess limit is what stops
 *  guessing. */
export const RATE_LIMIT_CODE_CHECKS_PER_IP = 60;

/** Uniform 6-digit code ("000000" to "999999") from the CSPRNG. Values at or
 *  above the largest multiple of 1,000,000 are redrawn so no code is likelier. */
export function generateSigninCode(): string {
  const limit = 4_294_000_000; // 4294 × 1,000,000, just under 2^32
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return String(buf[0] % 1_000_000).padStart(6, "0");
  }
}

/** Accepts "123456", "123 456" or "123-456"; returns the 6 digits or null. */
export function normalizeSigninCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Codes are stored hashed with their email, so one leaked row can't be
 *  replayed against another address. */
export function signinCodeHash(email: string, code: string): Promise<string> {
  return sha256Hex(`signin-code:${email}:${code}`);
}

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return email;
}

export function signinEmailText(code: string, link: string | null): string {
  const lines = [
    `Your Euclid Engine sign-in code is ${code}`,
    "",
    "Type it on the sign-in screen. It works once and expires in 10 minutes.",
  ];
  if (link) lines.push("", "Or open this link on the device you want to sign in on:", link);
  lines.push("", "If you didn't ask to sign in, you can ignore this email.");
  return lines.join("\n");
}

// ── Sign in with Google (OpenID Connect, authorization code + PKCE) ─────────

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_COOKIE = "euclid_oauth";
export const OAUTH_COOKIE_TTL_SEC = 10 * 60;

export function googleRedirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PKCE S256 challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlFromBytes(new Uint8Array(digest));
}

export function googleAuthUrl(p: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: "openid email",
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${q.toString()}`;
}

/** The short-lived cookie that ties Google's redirect back to the browser
 *  that started it: "<state>.<pkce verifier>", both hex. */
export function oauthCookieValue(state: string, verifier: string): string {
  return `${state}.${verifier}`;
}

export function parseOauthCookie(cookieHeader: string | null): { state: string; verifier: string } | null {
  const m = new RegExp(`(?:^|;\\s*)${OAUTH_COOKIE}=([a-f0-9]{64})\\.([a-f0-9]{64})(?:;|$)`).exec(cookieHeader ?? "");
  return m ? { state: m[1], verifier: m[2] } : null;
}

/** Payload of a JWT, without checking its signature. Only for an ID token
 *  received straight from Google's token endpoint over TLS, which OpenID
 *  Connect Core 3.1.3.7 allows to be trusted on that basis. */
export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The verified email from Google ID token claims, or null when the token
 *  isn't from Google, isn't for this app, has expired, or the address isn't
 *  verified. */
export function googleEmailFromClaims(
  claims: Record<string, unknown> | null,
  clientId: string,
  nowSec: number,
): string | null {
  if (!claims) return null;
  const iss = claims["iss"];
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") return null;
  const aud = claims["aud"];
  if (Array.isArray(aud) ? !aud.includes(clientId) : aud !== clientId) return null;
  const exp = Number(claims["exp"]);
  if (!Number.isFinite(exp) || exp <= nowSec - 60) return null;
  const verified = claims["email_verified"];
  if (verified !== true && verified !== "true") return null;
  return normalizeEmail(claims["email"]);
}

// ── Summer pause for monthly Pro ────────────────────────────────────────────
// Teachers don't use the tool in June and July, so monthly Pro stops
// charging for those two months instead of inviting a cancellation. A daily
// cron (index.ts `scheduled`) pauses payment collection on every active
// monthly subscription during the window, resuming August 1. The
// subscription stays `active`, so the teacher keeps Pro all summer.
// Dates are UTC midnight (June 1 starts, August 1 ends): close enough for a
// billing pause, and the same every year.

/** Unix seconds when collection resumes (August 1, 00:00 UTC) if `nowSec`
 *  falls inside this year's summer window [June 1, August 1); else null. */
export function summerPauseResumesAt(nowSec: number): number | null {
  const year = new Date(nowSec * 1000).getUTCFullYear();
  const start = Date.UTC(year, 5, 1) / 1000;
  const end = Date.UTC(year, 7, 1) / 1000;
  return nowSec >= start && nowSec < end ? end : null;
}

export interface SubscriptionLike {
  id: string;
  status?: string;
  cancel_at_period_end?: boolean;
  pause_collection?: unknown;
  metadata?: Record<string, string> | null;
  items?: { data?: { price?: { id?: string } | null }[] } | null;
}

/** Metadata key set on a subscription when the cron pauses it, valued with
 *  the year. If someone resumes it by hand that summer, the cron leaves it
 *  alone. Set it to "off" to opt a subscription out for good. */
export const SUMMER_PAUSE_META = "summer_pause";

/** Should the cron pause this subscription's collection right now? Only
 *  active monthly Pro subscriptions that aren't already paused, aren't
 *  ending, and weren't already handled (or opted out) this year. */
export function shouldPauseForSummer(
  sub: SubscriptionLike,
  monthlyPriceId: string,
  nowSec: number,
): boolean {
  if (summerPauseResumesAt(nowSec) === null) return false;
  if (sub.status !== "active") return false;
  if (sub.cancel_at_period_end) return false;
  if (sub.pause_collection) return false;
  const mark = sub.metadata?.[SUMMER_PAUSE_META];
  const year = String(new Date(nowSec * 1000).getUTCFullYear());
  if (mark === "off" || mark === year) return false;
  return (sub.items?.data ?? []).some((it) => it.price?.id === monthlyPriceId);
}

// ── Founders offer ──────────────────────────────────────────────────────────
// Lifetime Pro for a one-time $150, for the first 50 teachers, until the
// end of January 31, 2027 (US Central). After either limit the checkout
// refuses it and the pricing page hides it.

export const FOUNDERS_CAP = 50;
/** 2027-02-01 06:00 UTC = midnight at the end of Jan 31, 2027, US Central. */
export const FOUNDERS_CLOSES_AT_SEC = Date.UTC(2027, 1, 1, 6, 0, 0) / 1000;

export interface FoundersStatus {
  open: boolean;
  remaining: number;
  closesAt: number;
}

export function foundersStatus(sold: number, nowSec: number): FoundersStatus {
  const remaining = Math.max(0, FOUNDERS_CAP - Math.max(0, Math.floor(sold)));
  return {
    open: remaining > 0 && nowSec < FOUNDERS_CLOSES_AT_SEC,
    remaining,
    closesAt: FOUNDERS_CLOSES_AT_SEC,
  };
}

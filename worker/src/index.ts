// ── Euclid API Worker ────────────────────────────────────────────────────────
// Auth (emailed 6-digit code, Sign in with Google, legacy magic link), plan entitlement, Free generation counter, and Stripe
// checkout/portal/webhooks for euclidengine.tech. The marketing/app site
// stays a static Pages export; this Worker is the only server-shaped piece.
// Spec: ~/workspace/goals/euclid-engine-deployment/files/auth-workers-spec.md
//
// Secrets (Worker env, never in repo): STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, PRICE_* ids, and optionally
// GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET. See worker/README.md.

import {
  FREE_GENERATION_LIMIT,
  MAGIC_LINK_TTL_SEC,
  OAUTH_COOKIE,
  OAUTH_COOKIE_TTL_SEC,
  RATE_LIMIT_CODE_CHECKS_PER_IP,
  SIGNIN_CODE_MAX_ATTEMPTS,
  SIGNIN_CODE_TTL_SEC,
  GOOGLE_TOKEN_URL,
  decodeJwtPayload,
  generateSigninCode,
  googleAuthUrl,
  googleEmailFromClaims,
  googleRedirectUri,
  normalizeEmail,
  normalizeSigninCode,
  oauthCookieValue,
  parseOauthCookie,
  pkceChallenge,
  signinCodeHash,
  signinEmailText,
  timingSafeEqual,
  RATE_LIMIT_PER_EMAIL,
  RATE_LIMIT_PER_IP,
  RATE_WINDOW_SEC,
  SESSION_TTL_SEC,
  effectivePlan,
  generationAllowed,
  monthKeyUTC,
  planUpdateFromStripeEvent,
  SUMMER_PAUSE_META,
  foundersStatus,
  shouldPauseForSummer,
  summerPauseResumesAt,
  type SubscriptionLike,
  allowedOrigins,
  devAuthEnabled,
  originAllowed,
  randomTokenHex,
  rateWindowStart,
  sha256Hex,
  signInPageHtml,
  underRateLimit,
  validateExportEvent,
  verifyStripeSignature,
  type Plan,
  type StripeEventLike,
} from "./core";
import {
  MAX_SAVED_WORKSHEETS,
  RATE_LIMIT_LIBRARY_READS,
  RATE_LIMIT_LIBRARY_WRITES,
  SAVED_WORKSHEETS_DDL,
  isWorksheetId,
  normalizeWorksheetName,
  serializeWorksheetSettings,
  validateWorksheetSettings,
} from "./worksheets";
import {
  MAX_TAUGHT_LESSONS,
  RATE_LIMIT_TAUGHT_READS,
  RATE_LIMIT_TAUGHT_WRITES,
  TAUGHT_LESSONS_DDL,
  shelfIdsFromExport,
  validateTaughtIds,
} from "./taught";

const SESSION_COOKIE = "euclid_session";

// APP_URL is a per-deployment constant, so caching it for the module (set at
// the top of every fetch) is safe and keeps json() free of an env argument.
let currentAppUrl = "https://euclidengine.tech";

function appUrl(env: Env): string {
  return env.APP_URL ?? "https://euclidengine.tech";
}

/** Headers on every API response: no sniffing, no framing, no caching of
 *  account data, and no Referer leak of a sign-in token in the URL. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  if (!allowedOrigins(currentAppUrl).has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(
  req: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...SECURITY_HEADERS,
      ...corsHeaders(req),
      ...extra,
    },
  });
}

function redirect(location: string, extra: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: location, ...SECURITY_HEADERS, ...extra },
  });
}

interface UserRow {
  id: string;
  email: string;
  plan: string;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  current_period_end: number | null;
  founders: number;
}

async function getUserById(env: Env, id: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

async function getUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();
}

async function getUserByCustomer(env: Env, customerId: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE stripe_customer_id = ?")
    .bind(customerId)
    .first<UserRow>();
}

function planOf(user: UserRow): Plan {
  return effectivePlan(
    {
      plan: user.plan,
      subscriptionStatus: user.subscription_status,
      currentPeriodEnd: user.current_period_end,
      founders: user.founders === 1,
    },
    Math.floor(Date.now() / 1000),
  );
}

async function usageThisMonth(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT count FROM generation_counter WHERE user_id = ? AND month = ?",
  )
    .bind(userId, monthKeyUTC(new Date()))
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function sessionUser(env: Env, req: Request): Promise<UserRow | null> {
  const cookie = req.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([a-f0-9]{64})`));
  if (!match) return null;
  const tokenHash = await sha256Hex(match[1]);
  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(tokenHash, Math.floor(Date.now() / 1000))
    .first<UserRow>();
  return row;
}

function sessionCookie(token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// ── Email (Resend) ───────────────────────────────────────────────────────────

async function sendEmail(env: Env, to: string, subject: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Euclid Engine <noreply@euclidengine.tech>",
      to: [to],
      subject,
      text,
    }),
  });
  return res.ok;
}

function sendMagicLink(env: Env, email: string, link: string): Promise<boolean> {
  return sendEmail(
    env,
    email,
    "Your Euclid Engine sign-in link",
    `Sign in to Euclid Engine:\n\n${link}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
  );
}

// ── Stripe API (form-encoded REST, no SDK) ──────────────────────────────────

function formEncode(obj: Record<string, string>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function stripePost(
  env: Env,
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formEncode(params),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Stripe ${path} failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function stripeGet(
  env: Env,
  path: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}?${qs}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Stripe GET ${path} failed: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

/** Count one hit against a rate-limit bucket in the current window.
 *  Returns false (and records nothing) when the bucket is already full. */
async function takeRateToken(
  env: Env,
  bucket: string,
  limit: number,
  now: number,
): Promise<boolean> {
  const windowStart = rateWindowStart(now);
  const row = await env.DB.prepare(
    "SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?",
  )
    .bind(bucket, windowStart)
    .first<{ count: number }>();
  if (!underRateLimit(row?.count ?? 0, limit)) return false;
  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1`,
  )
    .bind(bucket, windowStart)
    .run();
  return true;
}

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "unknown";
}

function rateLimited(req: Request): Response {
  return json(req, { ok: false, error: "rate_limited" }, 429, {
    "Retry-After": String(RATE_WINDOW_SEC),
  });
}

/** Sign-in emails (links and codes alike) share one budget: per IP and per
 *  address, so nobody can flood an inbox whichever button they press. */
async function takeSignInEmailToken(env: Env, req: Request, email: string, now: number): Promise<boolean> {
  const ipOk = await takeRateToken(env, `ip:${clientIp(req)}`, RATE_LIMIT_PER_IP, now);
  const emailOk =
    ipOk && (await takeRateToken(env, `email:${await sha256Hex(email)}`, RATE_LIMIT_PER_EMAIL, now));
  if (!ipOk || !emailOk) return false;
  // Old windows are never read again; sweep them while we're here.
  await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(now - 2 * RATE_WINDOW_SEC)
    .run();
  return true;
}

/** Find or create the account for a verified address and start a session.
 *  Returns the Set-Cookie value, or null if the user row can't be read. */
async function startSession(env: Env, email: string, now: number): Promise<string | null> {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (id, email, plan, founders, created_at) VALUES (?, ?, 'free', 0, ?)",
  )
    .bind(randomTokenHex(16), email, now)
    .run();
  const user = await getUserByEmail(env, email);
  if (!user) return null;

  const session = randomTokenHex(32);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(randomTokenHex(16), user.id, await sha256Hex(session), now + SESSION_TTL_SEC, now)
    .run();

  // Housekeeping: expired sessions and old sign-in tokens and codes.
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
  await env.DB.prepare("DELETE FROM signin_tokens WHERE expires_at < ?").bind(now - 86400).run();
  await ensureSigninCodesTable(env);
  await env.DB.prepare("DELETE FROM signin_codes WHERE expires_at < ?").bind(now - 86400).run();

  return sessionCookie(session, SESSION_TTL_SEC);
}

// The signin_codes table is also in schema.sql. Creating it here too means a
// deploy that lands before schema.sql is rerun still works.
let signinCodesTableReady = false;
async function ensureSigninCodesTable(env: Env): Promise<void> {
  if (signinCodesTableReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS signin_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_signin_codes_email ON signin_codes(email, expires_at)",
  ).run();
  signinCodesTableReady = true;
}

/** Which sign-in methods this deployment offers, so the page only shows a
 *  Google button when Google is set up. */
function handleMethods(env: Env, req: Request): Response {
  return json(req, { code: true, google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) });
}

/** Email a 6-digit code. The account is created only when the code is used. */
async function handleRequestCode(env: Env, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) return json(req, { ok: false, error: "valid email required" }, 400);

  const now = Math.floor(Date.now() / 1000);
  if (!(await takeSignInEmailToken(env, req, email, now))) return rateLimited(req);

  await ensureSigninCodesTable(env);
  const code = generateSigninCode();
  await env.DB.prepare(
    "INSERT INTO signin_codes (id, email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, 0, ?)",
  )
    .bind(randomTokenHex(16), email, await signinCodeHash(email, code), now + SIGNIN_CODE_TTL_SEC, now)
    .run();

  const dev = devAuthEnabled(env.DEV_AUTH, appUrl(env));
  const sent = await sendEmail(env, email, `${code} is your Euclid Engine sign-in code`, signinEmailText(code, null));
  if (!sent && !dev) {
    return json(req, { ok: false, error: "email provider not configured" }, 503);
  }
  return json(req, dev ? { ok: true, devCode: code } : { ok: true });
}

/** Check a typed code. Right code: spend it, start a session, set the
 *  cookie. Wrong code: count the guess against every live code for that
 *  address, so five wrong guesses use them all up. */
async function handleVerifyCode(env: Env, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const code = normalizeSigninCode(body?.code);
  if (!email || !code) return json(req, { ok: false, error: "invalid" }, 400);

  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `code-ip:${clientIp(req)}`, RATE_LIMIT_CODE_CHECKS_PER_IP, now))) {
    return rateLimited(req);
  }

  await ensureSigninCodesTable(env);
  // One statement checks and spends, so a double submit can't sign in twice.
  const spent = await env.DB.prepare(
    `UPDATE signin_codes SET used_at = ?
     WHERE email = ? AND code_hash = ? AND used_at IS NULL AND expires_at > ? AND attempts < ?`,
  )
    .bind(now, email, await signinCodeHash(email, code), now, SIGNIN_CODE_MAX_ATTEMPTS)
    .run();

  if ((spent.meta?.changes ?? 0) >= 1) {
    // Any other code still waiting for this address is no longer needed.
    await env.DB.prepare(
      "UPDATE signin_codes SET used_at = ? WHERE email = ? AND used_at IS NULL",
    )
      .bind(now, email)
      .run();
    const cookie = await startSession(env, email, now);
    if (!cookie) return json(req, { ok: false, error: "internal error" }, 500);
    return json(req, { ok: true }, 200, { "Set-Cookie": cookie });
  }

  await env.DB.prepare(
    `UPDATE signin_codes SET attempts = attempts + 1
     WHERE email = ? AND used_at IS NULL AND expires_at > ? AND attempts < ?`,
  )
    .bind(email, now, SIGNIN_CODE_MAX_ATTEMPTS)
    .run();
  const live = await env.DB.prepare(
    `SELECT COUNT(*) AS n,
            SUM(CASE WHEN attempts < ? THEN 1 ELSE 0 END) AS usable
     FROM signin_codes WHERE email = ? AND used_at IS NULL AND expires_at > ?`,
  )
    .bind(SIGNIN_CODE_MAX_ATTEMPTS, email, now)
    .first<{ n: number; usable: number | null }>();
  const error = !live || live.n === 0 ? "expired" : (live.usable ?? 0) === 0 ? "too_many_attempts" : "wrong_code";
  return json(req, { ok: false, error }, 400);
}

function oauthCookie(value: string, maxAge: number): string {
  return `${OAUTH_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/** Start Sign in with Google: remember a random state and PKCE verifier in
 *  a short-lived cookie, then send the browser to Google. */
async function handleGoogleStart(env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return redirect(`${appUrl(env)}/?signin=failed`);
  }
  const state = randomTokenHex(32);
  const verifier = randomTokenHex(32);
  const location = googleAuthUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: googleRedirectUri(appUrl(env)),
    state,
    codeChallenge: await pkceChallenge(verifier),
  });
  return redirect(location, {
    "Set-Cookie": oauthCookie(oauthCookieValue(state, verifier), OAUTH_COOKIE_TTL_SEC),
  });
}

/** Google sends the browser back here with ?code and ?state. Check the state
 *  against the cookie, trade the code for an ID token, and sign in as the
 *  verified email on it. */
async function handleGoogleCallback(env: Env, req: Request): Promise<Response> {
  const finish = (outcome: "ok" | "failed", session?: string) => {
    const headers = new Headers({ Location: `${appUrl(env)}/?signin=${outcome}`, ...SECURITY_HEADERS });
    headers.append("Set-Cookie", oauthCookie("", 0));
    if (session) headers.append("Set-Cookie", session);
    return new Response(null, { status: 303, headers });
  };
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return finish("failed");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const saved = parseOauthCookie(req.headers.get("Cookie"));
  if (!code || !saved || !timingSafeEqual(state, saved.state)) return finish("failed");

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formEncode({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(appUrl(env)),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
  });
  if (!tokenRes.ok) {
    console.error(`Google token exchange failed: ${tokenRes.status}`);
    return finish("failed");
  }
  const tokens = (await tokenRes.json().catch(() => null)) as { id_token?: unknown } | null;
  const idToken = typeof tokens?.id_token === "string" ? tokens.id_token : "";
  const now = Math.floor(Date.now() / 1000);
  const email = googleEmailFromClaims(decodeJwtPayload(idToken), env.GOOGLE_CLIENT_ID, now);
  if (!email) return finish("failed");

  const session = await startSession(env, email, now);
  return session ? finish("ok", session) : finish("failed");
}

async function handleRequestLink(env: Env, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) return json(req, { ok: false, error: "valid email required" }, 400);

  const now = Math.floor(Date.now() / 1000);
  if (!(await takeSignInEmailToken(env, req, email, now))) return rateLimited(req);

  // No user row yet: the account is created when the link is actually
  // used, so typing someone else's address never creates an account.
  const token = randomTokenHex(32);
  await env.DB.prepare(
    "INSERT INTO signin_tokens (id, email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(randomTokenHex(16), email, await sha256Hex(token), now + MAGIC_LINK_TTL_SEC, now)
    .run();

  const link = `${appUrl(env)}/api/auth/verify?token=${token}`;
  const dev = devAuthEnabled(env.DEV_AUTH, appUrl(env));
  const sent = await sendMagicLink(env, email, link);
  if (!sent && !dev) {
    // Email provider not configured yet, say so instead of pretending.
    return json(req, { ok: false, error: "email provider not configured" }, 503);
  }
  return json(req, dev ? { ok: true, devLink: link } : { ok: true });
}

/** GET of the emailed link: show a confirm page, spend nothing. Mail
 *  scanners that open the link therefore can't use it up. */
function handleVerifyPage(req: Request): Response {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) return redirect(`${currentAppUrl}/?signin=failed`);
  return new Response(signInPageHtml(token, url.pathname), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...SECURITY_HEADERS,
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  });
}

/** POST from the confirm page's button: spend the token exactly once and
 *  start a session. */
async function handleVerify(env: Env, req: Request): Promise<Response> {
  const fail = () => redirect(`${appUrl(env)}/?signin=failed`);
  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) return fail();
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);

  // One statement both checks and spends the token, so two quick clicks
  // can't both get through.
  const spent = await env.DB.prepare(
    "UPDATE signin_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
  )
    .bind(now, tokenHash, now)
    .run();
  if ((spent.meta?.changes ?? 0) !== 1) return fail();

  const row = await env.DB.prepare("SELECT email FROM signin_tokens WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ email: string }>();
  if (!row) return fail();

  const cookie = await startSession(env, row.email, now);
  if (!cookie) return fail();
  return redirect(`${appUrl(env)}/?signin=ok`, { "Set-Cookie": cookie });
}

async function handleSignOut(env: Env, req: Request): Promise<Response> {
  const cookie = req.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([a-f0-9]{64})`));
  if (match) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256Hex(match[1]))
      .run();
  }
  return json(req, { ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function handleMe(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  return json(req, {
    email: user.email,
    plan: planOf(user),
    used: await usageThisMonth(env, user.id),
  });
}

// ── Saved worksheets (Pro library) ─────────────────────────────────────────
// Each row is a worksheet's generator settings and seed (never the PDF), so
// the app can rebuild the exact same worksheet and answer key. Saving is Pro
// only; listing, renaming and deleting stay open to the owner on any plan,
// so a teacher whose Pro lapses can still see and tidy what they saved.

// The table is also in schema.sql and worker/migrations. Creating it here
// too means a deploy that lands before either is run still works.
let savedWorksheetsTableReady = false;
async function ensureSavedWorksheetsTable(env: Env): Promise<void> {
  if (savedWorksheetsTableReady) return;
  for (const sql of SAVED_WORKSHEETS_DDL) await env.DB.prepare(sql).run();
  savedWorksheetsTableReady = true;
}

interface SavedWorksheetRow {
  id: string;
  name: string;
  settings: string;
  created_at: number;
  updated_at: number;
}

function savedWorksheetJson(row: SavedWorksheetRow) {
  let settings: unknown = null;
  try {
    settings = JSON.parse(row.settings);
  } catch {
    settings = null;
  }
  return {
    id: row.id,
    name: row.name,
    settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handleListWorksheets(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `lib-read:${user.id}`, RATE_LIMIT_LIBRARY_READS, now))) {
    return rateLimited(req);
  }
  await ensureSavedWorksheetsTable(env);
  const { results } = await env.DB.prepare(
    `SELECT id, name, settings, created_at, updated_at FROM saved_worksheets
     WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT ?`,
  )
    .bind(user.id, MAX_SAVED_WORKSHEETS)
    .all<SavedWorksheetRow>();
  return json(req, {
    pro: planOf(user) === "pro",
    limit: MAX_SAVED_WORKSHEETS,
    items: results.map(savedWorksheetJson),
  });
}

async function handleSaveWorksheet(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  if (planOf(user) !== "pro") return json(req, { error: "pro_required" }, 403);
  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `lib-write:${user.id}`, RATE_LIMIT_LIBRARY_WRITES, now))) {
    return rateLimited(req);
  }
  const body = (await req.json().catch(() => null)) as { name?: unknown; settings?: unknown } | null;
  const name = normalizeWorksheetName(body?.name);
  if (!name) return json(req, { error: "invalid_name" }, 400);
  const settings = validateWorksheetSettings(body?.settings);
  if (!settings) return json(req, { error: "invalid_settings" }, 400);
  const stored = serializeWorksheetSettings(settings);
  if (!stored) return json(req, { error: "too_large" }, 413);

  await ensureSavedWorksheetsTable(env);
  const id = randomTokenHex(16);
  // One statement checks the cap and inserts, so two quick saves can't both
  // squeeze past the limit.
  const inserted = await env.DB.prepare(
    `INSERT INTO saved_worksheets (id, user_id, name, settings, created_at, updated_at)
     SELECT ?, ?, ?, ?, ?, ?
     WHERE (SELECT COUNT(*) FROM saved_worksheets WHERE user_id = ?) < ?`,
  )
    .bind(id, user.id, name, stored, now, now, user.id, MAX_SAVED_WORKSHEETS)
    .run();
  if ((inserted.meta?.changes ?? 0) !== 1) {
    return json(req, { error: "library_full", limit: MAX_SAVED_WORKSHEETS }, 409);
  }
  return json(req, {
    ok: true,
    item: savedWorksheetJson({ id, name, settings: stored, created_at: now, updated_at: now }),
  });
}

async function handleRenameWorksheet(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `lib-write:${user.id}`, RATE_LIMIT_LIBRARY_WRITES, now))) {
    return rateLimited(req);
  }
  const body = (await req.json().catch(() => null)) as { id?: unknown; name?: unknown } | null;
  if (!isWorksheetId(body?.id)) return json(req, { error: "not_found" }, 404);
  const name = normalizeWorksheetName(body?.name);
  if (!name) return json(req, { error: "invalid_name" }, 400);
  await ensureSavedWorksheetsTable(env);
  const res = await env.DB.prepare(
    "UPDATE saved_worksheets SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  )
    .bind(name, now, body!.id, user.id)
    .run();
  if ((res.meta?.changes ?? 0) !== 1) return json(req, { error: "not_found" }, 404);
  return json(req, { ok: true, name });
}

async function handleDeleteWorksheet(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `lib-write:${user.id}`, RATE_LIMIT_LIBRARY_WRITES, now))) {
    return rateLimited(req);
  }
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (!isWorksheetId(body?.id)) return json(req, { error: "not_found" }, 404);
  await ensureSavedWorksheetsTable(env);
  const res = await env.DB.prepare("DELETE FROM saved_worksheets WHERE id = ? AND user_id = ?")
    .bind(body!.id, user.id)
    .run();
  if ((res.meta?.changes ?? 0) !== 1) return json(req, { error: "not_found" }, 404);
  return json(req, { ok: true });
}

// ── Taught shelf ─────────────────────────────────────────────────────────────
// Which lessons a teacher has taught and when, so the picker can offer them
// again and build spiral review. Exports add to it on their own; "Mark
// taught" covers lessons taught without the site. Open to every plan: a Pro
// lesson on a Free teacher's shelf keeps its lock in the app.

let taughtTableReady = false;
async function ensureTaughtTable(env: Env): Promise<void> {
  if (taughtTableReady) return;
  for (const sql of TAUGHT_LESSONS_DDL) await env.DB.prepare(sql).run();
  taughtTableReady = true;
}

/** Put lessons on the shelf as taught now. A lesson already there keeps its
 *  first date and moves to the top. Past the cap, the lessons taught longest
 *  ago drop off. */
async function markTaught(env: Env, userId: string, ids: string[], now: number): Promise<void> {
  if (ids.length === 0) return;
  await ensureTaughtTable(env);
  await env.DB.prepare(
    `INSERT INTO taught_lessons (user_id, topic_id, taught_at, last_at)
     SELECT ?, value, ?, ? FROM json_each(?) WHERE true
     ON CONFLICT(user_id, topic_id) DO UPDATE SET last_at = excluded.last_at`,
  )
    .bind(userId, now, now, JSON.stringify(ids))
    .run();
  await env.DB.prepare(
    `DELETE FROM taught_lessons WHERE user_id = ? AND topic_id NOT IN (
       SELECT topic_id FROM taught_lessons WHERE user_id = ?
       ORDER BY last_at DESC, topic_id LIMIT ?)`,
  )
    .bind(userId, userId, MAX_TAUGHT_LESSONS)
    .run();
}

async function handleListTaught(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `taught-read:${user.id}`, RATE_LIMIT_TAUGHT_READS, now))) {
    return rateLimited(req);
  }
  await ensureTaughtTable(env);
  const { results } = await env.DB.prepare(
    `SELECT topic_id, taught_at, last_at FROM taught_lessons
     WHERE user_id = ? ORDER BY last_at DESC, topic_id LIMIT ?`,
  )
    .bind(user.id, MAX_TAUGHT_LESSONS)
    .all<{ topic_id: string; taught_at: number; last_at: number }>();
  return json(req, {
    items: results.map((r) => ({ topicId: r.topic_id, taughtAt: r.taught_at, lastAt: r.last_at })),
  });
}

async function handleTaughtWrite(env: Env, req: Request, kind: "mark" | "remove"): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const now = Math.floor(Date.now() / 1000);
  if (!(await takeRateToken(env, `taught-write:${user.id}`, RATE_LIMIT_TAUGHT_WRITES, now))) {
    return rateLimited(req);
  }
  const body = (await req.json().catch(() => null)) as { topicIds?: unknown } | null;
  const ids = validateTaughtIds(body?.topicIds);
  if (!ids) return json(req, { error: "invalid" }, 400);
  if (kind === "mark") {
    await markTaught(env, user.id, ids, now);
    return json(req, { ok: true, at: now });
  }
  await ensureTaughtTable(env);
  await env.DB.prepare(
    "DELETE FROM taught_lessons WHERE user_id = ? AND topic_id IN (SELECT value FROM json_each(?))",
  )
    .bind(user.id, JSON.stringify(ids))
    .run();
  return json(req, { ok: true });
}

async function handleCount(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const plan = planOf(user);
  const used = await usageThisMonth(env, user.id);
  if (!generationAllowed(plan, used)) {
    return json(req, {
      allowed: false,
      used,
      limit: FREE_GENERATION_LIMIT,
    });
  }
  await env.DB.prepare(
    `INSERT INTO generation_counter (user_id, month, count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, month) DO UPDATE SET count = count + 1`,
  )
    .bind(user.id, monthKeyUTC(new Date()))
    .run();
  return json(req, {
    allowed: true,
    used: used + 1,
    limit: plan === "pro" ? null : FREE_GENERATION_LIMIT,
  });
}

async function handleEvent(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  const body = await req.json().catch(() => null);
  const event = validateExportEvent(body);
  if (!event) return json(req, { error: "invalid event" }, 400);
  await env.DB.prepare(
    "INSERT INTO events (id, user_id, type, topics, doc_type, problems, versions, created_at) VALUES (?, ?, 'export', ?, ?, ?, ?, ?)",
  )
    .bind(
      randomTokenHex(16),
      user.id,
      JSON.stringify(event.topics),
      event.docType,
      event.problems,
      event.versions,
      Math.floor(Date.now() / 1000),
    )
    .run();
  // Every export puts its lessons on the teacher's taught shelf. The event is
  // already logged, so a shelf hiccup is logged and never fails the call.
  try {
    await markTaught(env, user.id, shelfIdsFromExport(event.topics), Math.floor(Date.now() / 1000));
  } catch (err) {
    console.error(err);
  }
  return json(req, { ok: true });
}

/** Founders sold so far (accounts holding lifetime Pro) against the cap and
 *  close date. Two checkouts racing for the last seat can both go through;
 *  at 50 seats that overshoot is acceptable. */
async function currentFoundersStatus(env: Env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE founders = 1").first<{
    n: number;
  }>();
  return foundersStatus(row?.n ?? 0, Math.floor(Date.now() / 1000));
}

async function handleFounders(env: Env, req: Request): Promise<Response> {
  return json(req, await currentFoundersStatus(env));
}

/** Daily cron: during June and July, pause payment collection on active
 *  monthly Pro subscriptions until August 1. Invoices in the pause are
 *  voided, so nothing is owed for the summer, and the subscription stays
 *  active, so the teacher keeps Pro. Returns how many it paused. */
async function runSummerPause(env: Env, nowSec: number): Promise<number> {
  const resumesAt = summerPauseResumesAt(nowSec);
  const monthly = env.PRICE_PRO_MONTHLY;
  if (resumesAt === null || !env.STRIPE_SECRET_KEY || !monthly) return 0;
  const year = String(new Date(nowSec * 1000).getUTCFullYear());
  let paused = 0;
  let startingAfter: string | undefined;
  for (let page = 0; page < 100; page++) {
    const params: Record<string, string> = { price: monthly, status: "active", limit: "100" };
    if (startingAfter) params["starting_after"] = startingAfter;
    const list = await stripeGet(env, "/subscriptions", params);
    const subs = (list["data"] as SubscriptionLike[] | undefined) ?? [];
    for (const sub of subs) {
      if (!shouldPauseForSummer(sub, monthly, nowSec)) continue;
      await stripePost(env, `/subscriptions/${encodeURIComponent(sub.id)}`, {
        "pause_collection[behavior]": "void",
        "pause_collection[resumes_at]": String(resumesAt),
        [`metadata[${SUMMER_PAUSE_META}]`]: year,
      });
      paused++;
    }
    if (list["has_more"] !== true || subs.length === 0) break;
    startingAfter = subs[subs.length - 1].id;
  }
  console.log(`summer pause: paused ${paused} monthly subscription(s) until ${resumesAt}`);
  return paused;
}

const CHECKOUT_KINDS: Record<
  string,
  { priceEnv: keyof Env; mode: "subscription" | "payment" }
> = {
  monthly: { priceEnv: "PRICE_PRO_MONTHLY", mode: "subscription" },
  annual: { priceEnv: "PRICE_PRO_ANNUAL", mode: "subscription" },
  school: { priceEnv: "PRICE_SCHOOL", mode: "subscription" },
  founders: { priceEnv: "PRICE_FOUNDERS", mode: "payment" },
};

async function handleCheckout(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  if (!env.STRIPE_SECRET_KEY) {
    return json(req, { error: "payments not configured" }, 503);
  }
  const body = (await req.json().catch(() => null)) as { kind?: string } | null;
  const spec = body?.kind ? CHECKOUT_KINDS[body.kind] : undefined;
  const priceId = spec ? (env[spec.priceEnv] as string | undefined) : undefined;
  if (!spec || !priceId) {
    return json(req, { error: "unknown or unconfigured price" }, 400);
  }

  if (body!.kind === "founders") {
    const status = await currentFoundersStatus(env);
    if (!status.open) return json(req, { error: "founders_closed" }, 410);
  }

  // Already Pro: a second checkout would start a second subscription, and
  // cancelling either one would drop the account to Free. Send them to the
  // billing portal instead (the pricing page follows whatever URL we return).
  if (planOf(user) === "pro") {
    if (!user.stripe_customer_id) {
      return json(req, { error: "already_pro" }, 409);
    }
    const portal = await stripePost(env, "/billing_portal/sessions", {
      customer: user.stripe_customer_id,
      return_url: `${appUrl(env)}/`,
    });
    return json(req, { url: portal["url"], portal: true });
  }

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripePost(env, "/customers", {
      email: user.email,
      "metadata[user_id]": user.id,
    });
    customerId = customer["id"] as string;
    await env.DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
      .bind(customerId, user.id)
      .run();
  }

  const session = await stripePost(env, "/checkout/sessions", {
    mode: spec.mode,
    customer: customerId,
    client_reference_id: user.id,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl(env)}/?checkout=success`,
    cancel_url: `${appUrl(env)}/pricing?checkout=cancelled`,
    "metadata[user_id]": user.id,
    "metadata[kind]": body!.kind!,
  });
  return json(req, { url: session["url"] });
}

async function handlePortal(env: Env, req: Request): Promise<Response> {
  const user = await sessionUser(env, req);
  if (!user) return json(req, { error: "not signed in" }, 401);
  if (!env.STRIPE_SECRET_KEY || !user.stripe_customer_id) {
    return json(req, { error: "no billing account" }, 400);
  }
  const session = await stripePost(env, "/billing_portal/sessions", {
    customer: user.stripe_customer_id,
    return_url: `${appUrl(env)}/`,
  });
  return json(req, { url: session["url"] });
}

async function handleWebhook(env: Env, req: Request): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response("webhook not configured", { status: 503 });
  }
  const raw = await req.text();
  const signature = req.headers.get("Stripe-Signature") ?? "";
  const ok = await verifyStripeSignature(
    raw,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
    Math.floor(Date.now() / 1000),
  );
  if (!ok) return new Response("bad signature", { status: 400 });

  const evt = JSON.parse(raw) as StripeEventLike;
  const action = planUpdateFromStripeEvent(evt);
  if (action) {
    const user =
      action.by === "userId"
        ? await getUserById(env, action.key)
        : await getUserByCustomer(env, action.key);
    if (user) {
      const u = action.update;
      await env.DB.prepare(
        `UPDATE users SET
           plan = COALESCE(?, plan),
           subscription_status = CASE WHEN ? IS NULL THEN subscription_status ELSE ? END,
           current_period_end = CASE WHEN ? IS NULL THEN current_period_end ELSE ? END,
           stripe_customer_id = COALESCE(?, stripe_customer_id),
           founders = CASE WHEN ? = 1 THEN 1 ELSE founders END
         WHERE id = ?`,
      )
        .bind(
          u.plan ?? null,
          u.subscriptionStatus === undefined ? null : 1,
          u.subscriptionStatus ?? null,
          u.currentPeriodEnd === undefined ? null : 1,
          u.currentPeriodEnd ?? null,
          u.stripeCustomerId ?? null,
          u.founders ? 1 : 0,
          user.id,
        )
        .run();
    }
  }
  return json(req, { received: true });
}

// ── Router ───────────────────────────────────────────────────────────────────
// The Worker is mounted at api.euclidengine.tech AND serves the app's /api/*
// paths via a route on the main domain, so magic links land on the app domain
// (cookies are first-party there). Paths are matched by suffix.

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    currentAppUrl = appUrl(env);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...corsHeaders(req) } });
    }
    const { pathname } = new URL(req.url);
    try {
      // Stripe calls the webhook server-to-server; it is checked by signature.
      if (req.method === "POST" && pathname.endsWith("/stripe/webhook"))
        return await handleWebhook(env, req);

      if (req.method === "GET" && pathname.endsWith("/auth/verify"))
        return handleVerifyPage(req);
      if (req.method === "GET" && pathname.endsWith("/me"))
        return await handleMe(env, req);
      if (req.method === "GET" && pathname.endsWith("/worksheets"))
        return await handleListWorksheets(env, req);
      if (req.method === "GET" && pathname.endsWith("/taught"))
        return await handleListTaught(env, req);
      if (req.method === "GET" && pathname.endsWith("/auth/methods"))
        return handleMethods(env, req);
      if (req.method === "GET" && pathname.endsWith("/founders"))
        return await handleFounders(env, req);
      // Google sign-in is a pair of top-level navigations; the state cookie
      // and PKCE verifier tie them together, not the Origin header.
      if (req.method === "GET" && pathname.endsWith("/auth/google/start"))
        return await handleGoogleStart(env);
      if (req.method === "GET" && pathname.endsWith("/auth/google/callback"))
        return await handleGoogleCallback(env, req);

      // Every other route changes state, so it must come from our own pages.
      if (req.method === "POST" && !originAllowed(req.headers.get("Origin"), currentAppUrl)) {
        if (pathname.endsWith("/auth/verify")) return redirect(`${currentAppUrl}/?signin=failed`);
        return json(req, { error: "forbidden origin" }, 403);
      }
      if (req.method === "POST" && pathname.endsWith("/auth/request-code"))
        return await handleRequestCode(env, req);
      if (req.method === "POST" && pathname.endsWith("/auth/verify-code"))
        return await handleVerifyCode(env, req);
      if (req.method === "POST" && pathname.endsWith("/auth/request-link"))
        return await handleRequestLink(env, req);
      if (req.method === "POST" && pathname.endsWith("/auth/verify"))
        return await handleVerify(env, req);
      if (req.method === "POST" && pathname.endsWith("/auth/signout"))
        return await handleSignOut(env, req);
      if (req.method === "POST" && pathname.endsWith("/worksheets/save"))
        return await handleSaveWorksheet(env, req);
      if (req.method === "POST" && pathname.endsWith("/worksheets/rename"))
        return await handleRenameWorksheet(env, req);
      if (req.method === "POST" && pathname.endsWith("/worksheets/delete"))
        return await handleDeleteWorksheet(env, req);
      if (req.method === "POST" && pathname.endsWith("/taught/mark"))
        return await handleTaughtWrite(env, req, "mark");
      if (req.method === "POST" && pathname.endsWith("/taught/remove"))
        return await handleTaughtWrite(env, req, "remove");
      if (req.method === "POST" && pathname.endsWith("/count"))
        return await handleCount(env, req);
      if (req.method === "POST" && pathname.endsWith("/event"))
        return await handleEvent(env, req);
      if (req.method === "POST" && pathname.endsWith("/checkout"))
        return await handleCheckout(env, req);
      if (req.method === "POST" && pathname.endsWith("/portal"))
        return await handlePortal(env, req);
      return json(req, { error: "not found" }, 404);
    } catch (err) {
      // Details (including Stripe's error text) go to the Worker log only.
      console.error(err);
      return json(req, { error: "internal error" }, 500);
    }
  },

  /** Cron trigger (wrangler.toml [triggers]): runs daily; only acts in
   *  June and July. */
  async scheduled(
    _controller: unknown,
    env: Env,
    ctx: { waitUntil(p: Promise<unknown>): void },
  ): Promise<void> {
    ctx.waitUntil(runSummerPause(env, Math.floor(Date.now() / 1000)));
  },
};

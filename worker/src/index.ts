// ── Euclid API Worker ────────────────────────────────────────────────────────
// Auth (magic link), plan entitlement, Free generation counter, and Stripe
// checkout/portal/webhooks for euclidengine.tech. The marketing/app site
// stays a static Pages export; this Worker is the only server-shaped piece.
// Spec: ~/workspace/goals/euclid-engine-deployment/files/auth-workers-spec.md
//
// Secrets (Worker env, never in repo): STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, PRICE_* ids. See worker/README.md.

import {
  FREE_GENERATION_LIMIT,
  MAGIC_LINK_TTL_SEC,
  RATE_LIMIT_PER_EMAIL,
  RATE_LIMIT_PER_IP,
  RATE_WINDOW_SEC,
  SESSION_TTL_SEC,
  effectivePlan,
  generationAllowed,
  monthKeyUTC,
  planUpdateFromStripeEvent,
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

async function sendMagicLink(env: Env, email: string, link: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Euclid Engine <noreply@euclidengine.tech>",
      to: [email],
      subject: "Your Euclid Engine sign-in link",
      text: `Sign in to Euclid Engine:\n\n${link}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
    }),
  });
  return res.ok;
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

async function handleRequestLink(env: Env, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(req, { ok: false, error: "valid email required" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipOk = await takeRateToken(env, `ip:${ip}`, RATE_LIMIT_PER_IP, now);
  const emailOk =
    ipOk && (await takeRateToken(env, `email:${await sha256Hex(email)}`, RATE_LIMIT_PER_EMAIL, now));
  if (!ipOk || !emailOk) {
    return json(
      req,
      { ok: false, error: "rate_limited" },
      429,
      { "Retry-After": String(RATE_WINDOW_SEC) },
    );
  }
  // Old windows are never read again; sweep them while we're here.
  await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(now - 2 * RATE_WINDOW_SEC)
    .run();

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

  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (id, email, plan, founders, created_at) VALUES (?, ?, 'free', 0, ?)",
  )
    .bind(randomTokenHex(16), row.email, now)
    .run();
  const user = await getUserByEmail(env, row.email);
  if (!user) return fail();

  const session = randomTokenHex(32);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(randomTokenHex(16), user.id, await sha256Hex(session), now + SESSION_TTL_SEC, now)
    .run();

  // Housekeeping: expired sessions and spent or expired sign-in tokens.
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now).run();
  await env.DB.prepare("DELETE FROM signin_tokens WHERE expires_at < ?").bind(now - 86400).run();

  return redirect(`${appUrl(env)}/?signin=ok`, {
    "Set-Cookie": sessionCookie(session, SESSION_TTL_SEC),
  });
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
  return json(req, { ok: true });
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

      // Every other route changes state, so it must come from our own pages.
      if (req.method === "POST" && !originAllowed(req.headers.get("Origin"), currentAppUrl)) {
        if (pathname.endsWith("/auth/verify")) return redirect(`${currentAppUrl}/?signin=failed`);
        return json(req, { error: "forbidden origin" }, 403);
      }
      if (req.method === "POST" && pathname.endsWith("/auth/request-link"))
        return await handleRequestLink(env, req);
      if (req.method === "POST" && pathname.endsWith("/auth/verify"))
        return await handleVerify(env, req);
      if (req.method === "POST" && pathname.endsWith("/auth/signout"))
        return await handleSignOut(env, req);
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
};

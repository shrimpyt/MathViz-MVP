// Worker request-flow tests: runs worker/src/index.ts against an in-memory
// SQLite database shaped like D1 (node:sqlite, built into Node 22+), with
// Resend and Stripe replaced by fakes. Covers sign-in (request → confirm
// page → POST), rate limits, origin checks, and the already-Pro checkout.
// Run: npx tsx tests/paygate/run-worker-flow.ts

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../../worker/src/index";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}

// ── D1 shim ──────────────────────────────────────────────────────────────────
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../worker/schema.sql", import.meta.url), "utf8"));
  const prepare = (sql: string) => {
    let args: unknown[] = [];
    const stmt = {
      bind(...v: unknown[]) {
        args = v;
        return stmt;
      },
      async first<T>() {
        return (db.prepare(sql).get(...(args as never[])) as T) ?? null;
      },
      async run() {
        const r = db.prepare(sql).run(...(args as never[]));
        return { success: true, meta: { changes: Number(r.changes) } };
      },
      async all<T>() {
        return { results: db.prepare(sql).all(...(args as never[])) as T[] };
      },
    };
    return stmt;
  };
  return { raw: db, d1: { prepare } };
}

// ── fake outbound services ──────────────────────────────────────────────────
const sentLinks: string[] = [];
let stripeCalls: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith("https://api.resend.com/")) {
    const body = JSON.parse(String(init?.body));
    const m = /https:\/\/\S+/.exec(body.text);
    if (m) sentLinks.push(m[0]);
    return new Response("{}", { status: 200 });
  }
  if (url.startsWith("https://api.stripe.com/")) {
    stripeCalls.push(url.replace("https://api.stripe.com/v1", ""));
    if (url.endsWith("/billing_portal/sessions"))
      return new Response(JSON.stringify({ url: "https://billing.example/portal" }), { status: 200 });
    if (url.endsWith("/checkout/sessions"))
      return new Response(JSON.stringify({ url: "https://checkout.example/s" }), { status: 200 });
    if (url.endsWith("/customers"))
      return new Response(JSON.stringify({ id: "cus_new" }), { status: 200 });
  }
  throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;
console.error = () => {}; // the worker logs 500s; keep test output clean

const APP = "https://euclidengine.tech";
const { raw, d1 } = makeDb();
const env = {
  DB: d1,
  APP_URL: APP,
  RESEND_API_KEY: "test",
  STRIPE_SECRET_KEY: "test",
  PRICE_PRO_MONTHLY: "price_m",
} as unknown as Env;

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return worker.fetch(
    new Request(`${APP}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP, "CF-Connecting-IP": "1.2.3.4", ...headers },
      body: JSON.stringify(body),
    }),
    env,
  );
}

async function signIn(email: string, ip = "9.9.9.9"): Promise<string> {
  await post("/auth/request-link", { email }, { "CF-Connecting-IP": ip });
  const link = sentLinks[sentLinks.length - 1];
  const token = new URL(link).searchParams.get("token")!;
  const res = await worker.fetch(
    new Request(`${APP}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: APP },
      body: `token=${token}`,
    }),
    env,
  );
  const cookie = res.headers.get("Set-Cookie") ?? "";
  return /euclid_session=([a-f0-9]{64})/.exec(cookie)?.[1] ?? "";
}

async function main() {
  // ── request a link: no user row yet ──
  let res = await post("/auth/request-link", { email: "Teacher@School.org" });
  ck("request-link ok", res.status === 200);
  ck("email sent", sentLinks.length === 1);
  ck("no user row before the link is used", raw.prepare("SELECT COUNT(*) n FROM users").get()!.n === 0);
  ck("api responses carry nosniff", res.headers.get("X-Content-Type-Options") === "nosniff");

  // ── GET (what a mail scanner does) shows a page and spends nothing ──
  const link = sentLinks[0];
  const token = new URL(link).searchParams.get("token")!;
  res = await worker.fetch(new Request(link), env);
  const html = await res.text();
  ck("GET verify returns the confirm page", res.status === 200 && html.includes("<form") && html.includes(token));
  ck("confirm page is not frameable", (res.headers.get("Content-Security-Policy") ?? "").includes("frame-ancestors 'none'"));
  ck("confirm page sends no referrer", res.headers.get("Referrer-Policy") === "no-referrer");
  await worker.fetch(new Request(link), env); // scanner opens it twice
  ck(
    "token unspent after GETs",
    raw.prepare("SELECT used_at FROM signin_tokens").get()!.used_at === null,
  );

  // ── POST from another site is refused ──
  const formPost = (origin: string | null) =>
    worker.fetch(
      new Request(`${APP}/api/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(origin ? { Origin: origin } : {}),
        },
        body: `token=${token}`,
      }),
      env,
    );
  res = await formPost("https://evil.example");
  ck("foreign-origin verify fails", (res.headers.get("Location") ?? "").endsWith("signin=failed"));

  // ── the teacher's click signs in, once ──
  res = await formPost(APP);
  ck("verify POST redirects ok", res.status === 303 && (res.headers.get("Location") ?? "").endsWith("signin=ok"));
  const cookie = res.headers.get("Set-Cookie") ?? "";
  ck("session cookie is HttpOnly Secure SameSite", /HttpOnly; Secure; SameSite=Lax/.test(cookie));
  ck("user row created on sign-in, lowercased", raw.prepare("SELECT email FROM users").get()!.email === "teacher@school.org");
  res = await formPost(APP);
  ck("second click fails (single use)", (res.headers.get("Location") ?? "").endsWith("signin=failed"));
  ck("only one session made", raw.prepare("SELECT COUNT(*) n FROM sessions").get()!.n === 1);

  // ── /me works with the cookie ──
  const session = /euclid_session=([a-f0-9]{64})/.exec(cookie)![1];
  res = await worker.fetch(
    new Request(`${APP}/api/me`, { headers: { Cookie: `euclid_session=${session}` } }),
    env,
  );
  const me = (await res.json()) as { email: string; plan: string };
  ck("/me returns the account", me.email === "teacher@school.org" && me.plan === "free");

  // ── expired token fails ──
  await post("/auth/request-link", { email: "late@school.org" }, { "CF-Connecting-IP": "5.5.5.5" });
  const lateTok = new URL(sentLinks[sentLinks.length - 1]).searchParams.get("token")!;
  raw.prepare("UPDATE signin_tokens SET expires_at = 1 WHERE email = 'late@school.org'").run();
  res = await worker.fetch(
    new Request(`${APP}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: APP },
      body: `token=${lateTok}`,
    }),
    env,
  );
  ck("expired token fails", (res.headers.get("Location") ?? "").endsWith("signin=failed"));

  // ── rate limits ──
  const before = sentLinks.length;
  const statuses: number[] = [];
  for (let i = 0; i < 5; i++)
    statuses.push((await post("/auth/request-link", { email: "spam@target.org" }, { "CF-Connecting-IP": `7.7.7.${i}` })).status);
  ck("3 per email, then 429", JSON.stringify(statuses) === JSON.stringify([200, 200, 200, 429, 429]));
  ck("only 3 emails went out", sentLinks.length - before === 3);
  const ipStatuses: number[] = [];
  for (let i = 0; i < 12; i++)
    ipStatuses.push((await post("/auth/request-link", { email: `t${i}@school.org` }, { "CF-Connecting-IP": "8.8.8.8" })).status);
  ck("10 per IP, then 429", ipStatuses.filter((s) => s === 200).length === 10 && ipStatuses[10] === 429);

  // ── origin checks on POST ──
  res = await post("/auth/request-link", { email: "x@y.org" }, { Origin: "https://evil.example" });
  ck("request-link from another site refused", res.status === 403);
  res = await worker.fetch(
    new Request(`${APP}/api/auth/request-link`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "CF-Connecting-IP": "6.6.6.6" },
      body: JSON.stringify({ email: "x@y.org" }),
    }),
    env,
  );
  ck("request-link with no Origin refused", res.status === 403);
  res = await post("/auth/request-link", { email: "x@y.org" }, { Origin: "http://localhost:3000" });
  ck("localhost refused in production", res.status === 403);
  ck("no CORS grant for localhost in production", res.headers.get("Access-Control-Allow-Origin") === null);

  // ── checkout: already-Pro goes to the portal, not a second subscription ──
  const proSession = await signIn("pro@school.org");
  raw
    .prepare("UPDATE users SET plan='pro', subscription_status='active', stripe_customer_id='cus_pro' WHERE email='pro@school.org'")
    .run();
  stripeCalls = [];
  res = await post("/checkout", { kind: "monthly" }, { Cookie: `euclid_session=${proSession}` });
  const body = (await res.json()) as { url?: string; portal?: boolean };
  ck("pro checkout returns the portal", body.portal === true && body.url === "https://billing.example/portal");
  ck("no new checkout session for pro", !stripeCalls.includes("/checkout/sessions"));

  const freeSession = await signIn("free@school.org");
  stripeCalls = [];
  res = await post("/checkout", { kind: "monthly" }, { Cookie: `euclid_session=${freeSession}` });
  const freeBody = (await res.json()) as { url?: string };
  ck("free user gets a checkout", freeBody.url === "https://checkout.example/s" && stripeCalls.includes("/checkout/sessions"));

  // ── errors don't leak internals ──
  const brokenEnv = { ...env, DB: { prepare: () => { throw new Error("SECRET internal detail"); } } } as unknown as Env;
  res = await worker.fetch(
    new Request(`${APP}/api/auth/request-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP },
      body: JSON.stringify({ email: "a@b.org" }),
    }),
    brokenEnv,
  );
  const errText = await res.text();
  ck("500 hides the error message", res.status === 500 && !errText.includes("SECRET"));

  // ── DEV_AUTH can't leak links in production ──
  const devEnv = { ...env, DEV_AUTH: "1", RESEND_API_KEY: undefined } as unknown as Env;
  res = await worker.fetch(
    new Request(`${APP}/api/auth/request-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP, "CF-Connecting-IP": "4.4.4.4" },
      body: JSON.stringify({ email: "dev@x.org" }),
    }),
    devEnv,
  );
  const devBody = await res.text();
  ck("DEV_AUTH in production returns no link", !devBody.includes("devLink") && res.status === 503);

  console.log(`run-worker-flow: ${checks} checks, ${failures} failures`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});

// Sign-in tests: the emailed 6-digit code and Sign in with Google. Runs
// worker/src/index.ts against an in-memory SQLite database shaped like D1
// (node:sqlite, Node 22+), with Resend and Google's token endpoint faked.
// Run: npx tsx tests/paygate/run-worker-signin.ts

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../../worker/src/index";
import {
  SIGNIN_CODE_MAX_ATTEMPTS,
  decodeJwtPayload,
  generateSigninCode,
  googleAuthUrl,
  googleEmailFromClaims,
  googleRedirectUri,
  normalizeEmail,
  normalizeSigninCode,
  parseOauthCookie,
  pkceChallenge,
  signinCodeHash,
  signinEmailText,
} from "../../worker/src/core";

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
const mails: { to: string; subject: string; text: string }[] = [];
let googleCalls: URLSearchParams[] = [];
let googleReply: { status: number; body: unknown } = { status: 200, body: {} };

function fakeJwt(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}.sig`;
}

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith("https://api.resend.com/")) {
    const body = JSON.parse(String(init?.body));
    mails.push({ to: body.to[0], subject: body.subject, text: body.text });
    return new Response("{}", { status: 200 });
  }
  if (url === "https://oauth2.googleapis.com/token") {
    googleCalls.push(new URLSearchParams(String(init?.body)));
    return new Response(JSON.stringify(googleReply.body), { status: googleReply.status });
  }
  throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;
console.error = () => {}; // the worker logs failures; keep test output clean

const APP = "https://euclidengine.tech";
const CLIENT_ID = "test-client.apps.googleusercontent.com";
const { raw, d1 } = makeDb();
const env = {
  DB: d1,
  APP_URL: APP,
  RESEND_API_KEY: "test",
  GOOGLE_CLIENT_ID: CLIENT_ID,
  GOOGLE_CLIENT_SECRET: "test-secret",
} as unknown as Env;

function post(path: string, body: unknown, headers: Record<string, string> = {}, e: Env = env) {
  return worker.fetch(
    new Request(`${APP}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP, "CF-Connecting-IP": "1.2.3.4", ...headers },
      body: JSON.stringify(body),
    }),
    e,
  );
}
const get = (path: string, headers: Record<string, string> = {}, e: Env = env) =>
  worker.fetch(new Request(`${APP}/api${path}`, { headers }), e);

const lastCode = () => /sign-in code is (\d{6})/.exec(mails[mails.length - 1]?.text ?? "")?.[1] ?? "";
const sessionFrom = (res: Response) =>
  /euclid_session=([a-f0-9]{64})/.exec(res.headers.get("Set-Cookie") ?? "")?.[1] ?? "";
const count = (sql: string) => Number((raw.prepare(sql).get() as { n: number }).n);

async function meEmail(session: string): Promise<string | null> {
  const res = await get("/me", { Cookie: `euclid_session=${session}` });
  if (res.status !== 200) return null;
  return ((await res.json()) as { email: string }).email;
}

function unitTests() {
  const codes = new Set<string>();
  for (let i = 0; i < 2000; i++) codes.add(generateSigninCode());
  ck("codes are 6 digits", [...codes].every((c) => /^\d{6}$/.test(c)));
  ck("codes vary", codes.size > 1990);
  ck("code normalizer accepts spaces and dashes", normalizeSigninCode(" 123 456 ") === "123456" && normalizeSigninCode("123-456") === "123456");
  ck("code normalizer rejects junk", normalizeSigninCode("12345") === null && normalizeSigninCode("12345a") === null && normalizeSigninCode(123456) === null);
  ck("email normalizer lowercases", normalizeEmail("  Ms.Smith@School.ORG ") === "ms.smith@school.org");
  ck("email normalizer rejects junk", normalizeEmail("nope") === null && normalizeEmail(42) === null);
  ck("email text has the code and expiry", /123456/.test(signinEmailText("123456", null)) && /10 minutes/.test(signinEmailText("123456", null)));
  ck("email text has no link when none given", !/https:/.test(signinEmailText("123456", null)));

  ck("redirect URI", googleRedirectUri(`${APP}/`) === `${APP}/api/auth/google/callback`);
  const u = new URL(googleAuthUrl({ clientId: "c", redirectUri: "r", state: "s", codeChallenge: "x" }));
  ck(
    "auth URL asks for openid email with PKCE S256",
    u.origin === "https://accounts.google.com" &&
      u.searchParams.get("scope") === "openid email" &&
      u.searchParams.get("code_challenge_method") === "S256" &&
      u.searchParams.get("response_type") === "code",
  );
  const a = "a".repeat(64), b = "b".repeat(64);
  ck("oauth cookie parses", JSON.stringify(parseOauthCookie(`x=1; euclid_oauth=${a}.${b}; y=2`)) === JSON.stringify({ state: a, verifier: b }));
  ck("oauth cookie rejects junk", parseOauthCookie("euclid_oauth=zz.zz") === null && parseOauthCookie(null) === null);
  ck("jwt payload decodes", decodeJwtPayload(fakeJwt({ email: "a@b.co" }))?.email === "a@b.co");
  ck("jwt garbage is null", decodeJwtPayload("not.a.jwt!") === null && decodeJwtPayload("x") === null);

  const now = 1_800_000_000;
  const good = { iss: "https://accounts.google.com", aud: CLIENT_ID, exp: now + 300, email: "T@School.org", email_verified: true };
  ck("valid claims give the email", googleEmailFromClaims(good, CLIENT_ID, now) === "t@school.org");
  ck("wrong issuer refused", googleEmailFromClaims({ ...good, iss: "https://evil.example" }, CLIENT_ID, now) === null);
  ck("wrong audience refused", googleEmailFromClaims({ ...good, aud: "someone-else" }, CLIENT_ID, now) === null);
  ck("expired token refused", googleEmailFromClaims({ ...good, exp: now - 3600 }, CLIENT_ID, now) === null);
  ck("unverified email refused", googleEmailFromClaims({ ...good, email_verified: false }, CLIENT_ID, now) === null);
  ck("missing email refused", googleEmailFromClaims({ ...good, email: undefined }, CLIENT_ID, now) === null);
}

async function codeTests() {
  // The table is created on first use, so a deploy before schema.sql is rerun still works.
  raw.exec("DROP TABLE signin_codes");

  let res = await post("/auth/request-code", { email: "Teacher@School.org" });
  ck("request-code ok", res.status === 200 && ((await res.json()) as { ok: boolean }).ok === true);
  ck("signin_codes created on first use", count("SELECT COUNT(*) n FROM signin_codes") === 1);
  ck("one email, to the lowercased address", mails.length === 1 && mails[0].to === "teacher@school.org");
  const code = lastCode();
  ck("email carries a 6-digit code", /^\d{6}$/.test(code));
  ck("subject leads with the code", mails[0].subject.startsWith(code));
  ck("email has no link to scan", !/https?:\/\//.test(mails[0].text));
  ck("code is stored hashed, not plain", count(`SELECT COUNT(*) n FROM signin_codes WHERE code_hash = '${code}'`) === 0);
  ck(
    "stored hash matches",
    count(`SELECT COUNT(*) n FROM signin_codes WHERE code_hash = '${await signinCodeHash("teacher@school.org", code)}'`) === 1,
  );
  ck("no user row before the code is used", count("SELECT COUNT(*) n FROM users") === 0);

  // Wrong code, then the right one typed with a space.
  const wrong = code === "000000" ? "000001" : "000000";
  res = await post("/auth/verify-code", { email: "teacher@school.org", code: wrong });
  ck("wrong code refused", res.status === 400 && ((await res.json()) as { error: string }).error === "wrong_code");
  ck("wrong code sets no cookie", !res.headers.get("Set-Cookie"));
  res = await post("/auth/verify-code", { email: " TEACHER@school.org", code: `${code.slice(0, 3)} ${code.slice(3)}` });
  const session = sessionFrom(res);
  ck("right code signs in", res.status === 200 && session.length === 64);
  ck("session cookie is HttpOnly Secure SameSite", /HttpOnly; Secure; SameSite=Lax/.test(res.headers.get("Set-Cookie") ?? ""));
  ck("account created at sign-in", count("SELECT COUNT(*) n FROM users WHERE email = 'teacher@school.org'") === 1);
  ck("/me works with the new session", (await meEmail(session)) === "teacher@school.org");

  res = await post("/auth/verify-code", { email: "teacher@school.org", code });
  ck("a code works once", res.status === 400 && ((await res.json()) as { error: string }).error === "expired");

  // Signing in again later reuses the same account.
  await post("/auth/request-code", { email: "teacher@school.org" }, { "CF-Connecting-IP": "2.2.2.2" });
  res = await post("/auth/verify-code", { email: "teacher@school.org", code: lastCode() });
  ck("second sign-in, same account", res.status === 200 && count("SELECT COUNT(*) n FROM users") === 1);

  // A code is tied to its address.
  await post("/auth/request-code", { email: "a@school.org" }, { "CF-Connecting-IP": "3.3.3.3" });
  const aCode = lastCode();
  res = await post("/auth/verify-code", { email: "b@school.org", code: aCode });
  ck("another address's code refused", res.status === 400 && !res.headers.get("Set-Cookie"));

  // Five wrong guesses use up the code, even the right one after that.
  const bad = aCode === "111111" ? "222222" : "111111";
  const errors: string[] = [];
  for (let i = 0; i < SIGNIN_CODE_MAX_ATTEMPTS; i++) {
    res = await post("/auth/verify-code", { email: "a@school.org", code: bad });
    errors.push(((await res.json()) as { error: string }).error);
  }
  ck("fifth wrong guess says too many", errors[errors.length - 1] === "too_many_attempts" && errors[0] === "wrong_code");
  res = await post("/auth/verify-code", { email: "a@school.org", code: aCode });
  ck("right code refused after 5 wrong guesses", res.status === 400 && !sessionFrom(res));
  // A fresh code works again.
  await post("/auth/request-code", { email: "a@school.org" }, { "CF-Connecting-IP": "3.3.3.4" });
  res = await post("/auth/verify-code", { email: "a@school.org", code: lastCode() });
  ck("a new code works after a lockout", res.status === 200 && sessionFrom(res).length === 64);

  // Expiry.
  await post("/auth/request-code", { email: "late@school.org" }, { "CF-Connecting-IP": "4.4.4.4" });
  const lateCode = lastCode();
  raw.prepare("UPDATE signin_codes SET expires_at = 1 WHERE email = 'late@school.org'").run();
  res = await post("/auth/verify-code", { email: "late@school.org", code: lateCode });
  ck("expired code refused", res.status === 400 && ((await res.json()) as { error: string }).error === "expired");

  // Rate limits: codes and links share the 3-per-address budget.
  const before = mails.length;
  const statuses: number[] = [];
  statuses.push((await post("/auth/request-link", { email: "spam@target.org" }, { "CF-Connecting-IP": "7.7.7.1" })).status);
  for (let i = 2; i <= 4; i++)
    statuses.push((await post("/auth/request-code", { email: "spam@target.org" }, { "CF-Connecting-IP": `7.7.7.${i}` })).status);
  ck("3 sign-in emails per address, then 429", JSON.stringify(statuses) === "[200,200,200,429]");
  ck("only 3 emails went out", mails.length - before === 3);

  const ipStatuses: number[] = [];
  for (let i = 0; i < 70; i++)
    ipStatuses.push((await post("/auth/verify-code", { email: `g${i}@school.org`, code: "123456" }, { "CF-Connecting-IP": "9.9.9.9" })).status);
  ck("code checks per IP are capped", ipStatuses.filter((s) => s === 429).length === 10);

  // Bad input and foreign origins.
  res = await post("/auth/verify-code", { email: "teacher@school.org", code: "12ab56" });
  ck("non-digit code is a 400", res.status === 400);
  res = await post("/auth/request-code", { email: "not-an-email" });
  ck("bad email is a 400", res.status === 400);
  res = await post("/auth/request-code", { email: "x@y.org" }, { Origin: "https://evil.example" });
  ck("request-code from another site refused", res.status === 403);
  res = await post("/auth/verify-code", { email: "x@y.org", code: "123456" }, { Origin: "https://evil.example" });
  ck("verify-code from another site refused", res.status === 403);

  // No email provider: say so rather than pretend.
  const noMail = { ...env, RESEND_API_KEY: undefined } as unknown as Env;
  res = await post("/auth/request-code", { email: "nomail@school.org" }, { "CF-Connecting-IP": "10.0.0.1" }, noMail);
  ck("no email provider gives 503", res.status === 503);
}

async function googleTests() {
  let res = await get("/auth/methods");
  ck("methods lists google when configured", ((await res.json()) as { google: boolean }).google === true);
  const off = { ...env, GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined } as unknown as Env;
  res = await get("/auth/methods", {}, off);
  ck("methods hides google when not configured", ((await res.json()) as { google: boolean }).google === false);
  res = await get("/auth/google/start", {}, off);
  ck("start without config fails softly", (res.headers.get("Location") ?? "").endsWith("/?signin=failed"));

  // Start: redirect to Google with state + PKCE, cookie holds both.
  res = await get("/auth/google/start");
  const loc = new URL(res.headers.get("Location") ?? "");
  const setCookie = res.headers.get("Set-Cookie") ?? "";
  const saved = parseOauthCookie(setCookie.split(";")[0]);
  ck("start redirects to Google", res.status === 303 && loc.origin === "https://accounts.google.com");
  ck("start sends our client id and redirect URI", loc.searchParams.get("client_id") === CLIENT_ID && loc.searchParams.get("redirect_uri") === `${APP}/api/auth/google/callback`);
  ck("state cookie is HttpOnly Secure Lax and short-lived", /HttpOnly; Secure; SameSite=Lax; Max-Age=600/.test(setCookie));
  ck("state in URL matches cookie", !!saved && loc.searchParams.get("state") === saved.state);
  ck("challenge matches verifier", !!saved && loc.searchParams.get("code_challenge") === (await pkceChallenge(saved!.verifier)));

  const cookie = `euclid_oauth=${saved!.state}.${saved!.verifier}`;
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: "https://accounts.google.com", aud: CLIENT_ID, exp: now + 3600, email: "Teacher@School.org", email_verified: true };
  const callback = (state: string, c = cookie, code = "auth-code") =>
    get(`/auth/google/callback?code=${code}&state=${state}`, { Cookie: c });

  // State mismatch and missing cookie never reach Google.
  googleCalls = [];
  res = await callback("f".repeat(64));
  ck("wrong state fails", (res.headers.get("Location") ?? "").endsWith("signin=failed"));
  res = await callback(saved!.state, "");
  ck("missing state cookie fails", (res.headers.get("Location") ?? "").endsWith("signin=failed"));
  ck("no token exchange on a bad state", googleCalls.length === 0);

  // Google says no, or sends an unverified or foreign token.
  googleReply = { status: 400, body: { error: "invalid_grant" } };
  res = await callback(saved!.state);
  ck("token exchange error fails", (res.headers.get("Location") ?? "").endsWith("signin=failed"));
  googleReply = { status: 200, body: { id_token: fakeJwt({ ...claims, email_verified: false }) } };
  res = await callback(saved!.state);
  ck("unverified Google email fails", (res.headers.get("Location") ?? "").endsWith("signin=failed") && !sessionFrom(res));
  googleReply = { status: 200, body: { id_token: fakeJwt({ ...claims, aud: "other-app" }) } };
  res = await callback(saved!.state);
  ck("token for another app fails", !sessionFrom(res));

  // Happy path: same account as the code sign-in for that address.
  googleCalls = [];
  googleReply = { status: 200, body: { id_token: fakeJwt(claims) } };
  const usersBefore = count("SELECT COUNT(*) n FROM users");
  res = await callback(saved!.state);
  const sent = googleCalls[0];
  ck(
    "token exchange sends code, verifier, secret and redirect URI",
    !!sent &&
      sent.get("code") === "auth-code" &&
      sent.get("code_verifier") === saved!.verifier &&
      sent.get("client_secret") === "test-secret" &&
      sent.get("grant_type") === "authorization_code" &&
      sent.get("redirect_uri") === `${APP}/api/auth/google/callback`,
  );
  ck("Google sign-in redirects ok", res.status === 303 && (res.headers.get("Location") ?? "").endsWith("/?signin=ok"));
  const session = sessionFrom(res);
  ck("Google sign-in sets a session", session.length === 64);
  ck("state cookie is cleared", /euclid_oauth=; .*Max-Age=0/.test(res.headers.get("Set-Cookie") ?? ""));
  ck("same email, same account", count("SELECT COUNT(*) n FROM users") === usersBefore);
  ck("/me works after Google sign-in", (await meEmail(session)) === "teacher@school.org");

  // A brand new teacher gets an account.
  googleReply = { status: 200, body: { id_token: fakeJwt({ ...claims, email: "new@school.org" }) } };
  res = await callback(saved!.state);
  ck("new Google user gets an account", count("SELECT COUNT(*) n FROM users WHERE email = 'new@school.org'") === 1 && !!sessionFrom(res));
}

async function main() {
  unitTests();
  await codeTests();
  await googleTests();
  console.log(`worker sign-in: ${checks} checks, ${failures} failures`);
  process.exit(failures ? 1 : 0);
}
main();

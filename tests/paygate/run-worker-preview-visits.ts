// Review-step timing tests. Covers the app-side visit tracker (when a visit
// opens and closes, what it measures), that sending can never throw, and
// the Worker endpoint against an in-memory SQLite database shaped like D1:
// table made on first use, plan looked up from the session, nothing that
// identifies the visitor stored, validation, the Origin check, the per-IP
// rate limit, and the summary query in worker/queries/preview-summary.sql.
// Run: npx tsx tests/paygate/run-worker-preview-visits.ts

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../../worker/src/index";
import { sha256Hex } from "../../worker/src/core";
import { RATE_LIMIT_PREVIEW_VISITS } from "../../worker/src/previewVisits";
import {
  PreviewVisitTracker,
  sendPreviewVisit,
  type PreviewVisitRecord,
} from "../../src/lib/previewVisit";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}

// ── Tracker ──────────────────────────────────────────────────────────────────
function trackerTests() {
  let t = 1000;
  const sent: PreviewVisitRecord[] = [];
  const tr = new PreviewVisitTracker(
    () => t,
    (r) => sent.push(r),
    () => ({ device: "phone", docType: "worksheet", versions: 1 }),
  );

  // Open Review, pages show 1.8 s later, a seed change redraws, then export.
  tr.start();
  t += 1800;
  tr.rendered(3, false);
  t += 4000;
  tr.rendered(4, false);
  t += 2000;
  tr.finish("exported");
  ck("one record on export", sent.length === 1);
  const a = sent[0];
  ck("render time is open → first pages", a.renderMs === 1800);
  ck("stay time is the whole visit", a.stayMs === 7800);
  ck("pages are the latest count", a.pages === 4);
  ck("one rebuild counted", a.rebuilds === 1);
  ck("outcome exported", a.outcome === "exported");
  ck("device and format carried", a.device === "phone" && a.docType === "worksheet");
  ck("no failure, no gate", !a.previewFailed && !a.gateHit);
  ck("record has no identifying fields", !Object.keys(a).some((k) => /email|user|name|ip/i.test(k)));

  // Staying after export opens a new visit with pages already showing.
  tr.start();
  t += 500;
  tr.finish("back");
  ck("second visit after export", sent.length === 2 && sent[1].outcome === "back");
  ck("pages already showing: render 0", sent[1].renderMs === 0 && sent[1].pages === 4);

  // finish twice sends once; finish with nothing open sends nothing.
  tr.finish("left");
  ck("no visit open, nothing sent", sent.length === 2);

  // Tab hidden before the preview ever drew.
  const sent2: PreviewVisitRecord[] = [];
  let t2 = 0;
  const tr2 = new PreviewVisitTracker(
    () => t2,
    (r) => sent2.push(r),
    () => ({ device: "desktop", docType: "test", versions: 3 }),
  );
  tr2.start();
  t2 += 9000;
  tr2.gateHit();
  tr2.finish("left");
  ck("never drew: render null", sent2[0].renderMs === null && sent2[0].pages === 0);
  ck("gate hit recorded", sent2[0].gateHit === true);
  ck("versions carried", sent2[0].versions === 3);

  // A failed preview is flagged and doesn't count as drawn.
  tr2.start();
  t2 += 300;
  tr2.rendered(0, true);
  tr2.finish("back");
  ck("failed preview flagged", sent2[1].previewFailed === true && sent2[1].renderMs === null);

  // A render arriving with no visit open is remembered for the next one.
  tr2.rendered(2, false);
  tr2.start();
  tr2.finish("back");
  ck("pages remembered between visits", sent2[2].pages === 2 && sent2[2].renderMs === 0);
}

// ── Sending never throws ─────────────────────────────────────────────────────
async function sendTests() {
  const original = globalThis.fetch;
  const rec: PreviewVisitRecord = {
    renderMs: 1,
    stayMs: 2,
    pages: 1,
    rebuilds: 0,
    device: "desktop",
    outcome: "left",
    previewFailed: false,
    gateHit: false,
    docType: "worksheet",
    versions: 1,
  };
  let threw = false;
  globalThis.fetch = (() => {
    throw new Error("offline");
  }) as typeof fetch;
  try {
    sendPreviewVisit(rec);
  } catch {
    threw = true;
  }
  ck("fetch throwing is swallowed", !threw);
  let unhandled = false;
  const onUnhandled = () => {
    unhandled = true;
  };
  process.on("unhandledRejection", onUnhandled);
  globalThis.fetch = (() => Promise.reject(new Error("500"))) as typeof fetch;
  sendPreviewVisit(rec);
  await new Promise((r) => setTimeout(r, 20));
  process.off("unhandledRejection", onUnhandled);
  ck("fetch rejecting is swallowed", !unhandled);
  let init: RequestInit | undefined;
  globalThis.fetch = ((_u: unknown, i?: RequestInit) => {
    init = i;
    return Promise.resolve(new Response("{}"));
  }) as typeof fetch;
  sendPreviewVisit(rec);
  ck("sent with keepalive so it survives closing the tab", init?.keepalive === true && init?.method === "POST");
  globalThis.fetch = original;
}

// ── Worker endpoint ──────────────────────────────────────────────────────────
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../worker/schema.sql", import.meta.url), "utf8"));
  // Start like production today: no preview_visits table until first use.
  db.exec("DROP TABLE preview_visits");
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

const APP = "https://euclidengine.tech";

async function workerTests() {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    throw new Error(`unexpected fetch ${String(input)}`);
  }) as typeof fetch;
  const quietError = console.error;
  console.error = () => {};
  const { raw, d1 } = makeDb();
  const env = { DB: d1, APP_URL: APP } as unknown as Env;
  const now = Math.floor(Date.now() / 1000);

  raw
    .prepare("INSERT INTO users (id, email, plan, founders, created_at) VALUES (?, ?, 'free', 0, ?)")
    .run("u1", "teacher@school.org", now);
  const token = "ab".repeat(32);
  raw
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run("s1", "u1", await sha256Hex(token), now + 3600, now);

  const post = (body: unknown, opts: { cookie?: string; origin?: string; ip?: string } = {}) =>
    worker.fetch(
      new Request(`${APP}/api/preview-visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: opts.origin ?? APP,
          Cookie: opts.cookie ?? "",
          "CF-Connecting-IP": opts.ip ?? "1.2.3.4",
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      env,
    );
  const visit = (over: Partial<PreviewVisitRecord> = {}): PreviewVisitRecord => ({
    renderMs: 2100,
    stayMs: 45000,
    pages: 3,
    rebuilds: 1,
    device: "desktop",
    outcome: "exported",
    previewFailed: false,
    gateHit: false,
    docType: "worksheet",
    versions: 1,
    ...over,
  });

  ck("signed out works", (await post(visit())).status === 200);
  ck("table made on first use", !!raw.prepare("SELECT name FROM sqlite_master WHERE name='preview_visits'").get());
  ck("signed in works", (await post(visit({ device: "phone", outcome: "left" }), { cookie: `euclid_session=${token}` })).status === 200);
  const rows = raw.prepare("SELECT * FROM preview_visits ORDER BY rowid").all() as Record<string, unknown>[];
  ck("two rows", rows.length === 2);
  ck("signed-out plan is anon", rows[0].plan === "anon");
  ck("signed-in plan looked up (free)", rows[1].plan === "free");
  const cols = Object.keys(rows[0]);
  ck("no user, email or IP column", !cols.some((c) => /user|email|ip|name/i.test(c)));
  ck(
    "no stored value matches the email, user id or IP",
    !rows.some((r) => Object.values(r).some((v) => v === "u1" || v === "teacher@school.org" || v === "1.2.3.4")),
  );
  ck("values stored", rows[0].render_ms === 2100 && rows[0].stay_ms === 45000 && rows[0].pages === 3);

  // Validation and clamping.
  ck("bad JSON rejected", (await post("{nope")).status === 400);
  ck("missing outcome rejected", (await post({ ...visit(), outcome: "maybe" })).status === 400);
  ck("missing stay rejected", (await post({ ...visit(), stayMs: "long" })).status === 400);
  await post(visit({ stayMs: 99 * 3600_000, renderMs: -5, device: "toaster" as never, docType: "<script>" }));
  const last = raw.prepare("SELECT * FROM preview_visits ORDER BY rowid DESC LIMIT 1").get() as Record<string, unknown>;
  ck("stay clamped to 4 hours", last.stay_ms === 4 * 3600_000);
  ck("render clamped at 0", last.render_ms === 0);
  ck("unknown device stored as unknown", last.device === "unknown");
  ck("odd format name not stored", last.doc_type === "other");
  await post({ ...visit(), renderMs: null });
  const nul = raw.prepare("SELECT render_ms FROM preview_visits ORDER BY rowid DESC LIMIT 1").get() as { render_ms: unknown };
  ck("never-drew render kept as NULL", nul.render_ms === null);

  // Origin check.
  ck("other sites refused", (await post(visit(), { origin: "https://evil.example" })).status === 403);

  // Rate limit per IP (the IP is only ever stored hashed, in rate_limits).
  let limited = false;
  for (let i = 0; i < RATE_LIMIT_PREVIEW_VISITS + 2; i++) {
    const r = await post(visit(), { ip: "9.9.9.9" });
    if (r.status === 429) limited = true;
  }
  ck("rate limited per IP", limited);
  ck("another IP still fine", (await post(visit(), { ip: "8.8.8.8" })).status === 200);
  const buckets = raw.prepare("SELECT bucket FROM rate_limits").all() as { bucket: string }[];
  ck("rate-limit buckets don't hold raw IPs", !buckets.some((b) => b.bucket.includes("9.9.9.9")));

  // Summary query.
  raw.exec("DELETE FROM preview_visits");
  const ins = raw.prepare(
    "INSERT INTO preview_visits (id, plan, device, outcome, render_ms, stay_ms, pages, rebuilds, preview_failed, gate_hit, doc_type, versions, created_at) VALUES (?, 'free', ?, ?, ?, ?, 2, 0, ?, 0, 'worksheet', 1, ?)",
  );
  ins.run("a", "phone", "exported", 6000, 20000, 0, now);
  ins.run("b", "phone", "left", null, 8000, 0, now);
  ins.run("c", "desktop", "exported", 1000, 30000, 0, now);
  ins.run("d", "desktop", "back", 2000, 10000, 1, now);
  ins.run("old", "desktop", "left", 1000, 1000, 0, now - 40 * 86400); // outside 30 days
  const summary = raw
    .prepare(readFileSync(new URL("../../worker/queries/preview-summary.sql", import.meta.url), "utf8"))
    .all() as Record<string, number | string>[];
  const by = (d: string) => summary.find((r) => r.device === d)!;
  ck("summary has phone, desktop, all", !!by("phone") && !!by("desktop") && !!by("all"));
  ck("old visits left out", by("all").visits === 4);
  ck("phone exported 50%", by("phone").exported_pct === 50);
  ck("phone render average skips never-drew", by("phone").render_avg_s === 6);
  ck("slow renders counted", by("all").render_slow === 1);
  ck("never-drew counted", by("all").never_drew === 1);
  ck("failures counted", by("all").failed === 1);
  ck("stay average in seconds", by("desktop").stay_avg_s === 20);
  console.error = quietError;
}

async function main() {
  trackerTests();
  await sendTests();
  await workerTests();
  console.log(`preview-visits: ${checks} checks, ${failures} failures`);
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

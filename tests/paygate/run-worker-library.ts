// Saved worksheets (Pro library) endpoint tests. Runs worker/src/index.ts
// against an in-memory SQLite database shaped like D1 (node:sqlite, Node
// 22+). Covers: sign-in required, Pro-only saving, owner-only rename and
// delete, validation and size limits, the 200-worksheet cap, rate limits,
// the Origin check, the table being created on first use, and a saved
// worksheet rebuilding byte-identical after the round trip.
// Run: npx tsx tests/paygate/run-worker-library.ts

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../../worker/src/index";
import { sha256Hex } from "../../worker/src/core";
import {
  MAX_SAVED_WORKSHEETS,
  RATE_LIMIT_LIBRARY_WRITES,
} from "../../worker/src/worksheets";
import { CURRICULUM_REGISTRY } from "../../src/modules/CurriculumRegistry";
import {
  generateFromSettings,
  sanitizeSettings,
  settingsForSave,
  DEFAULT_SETTINGS,
  type WorksheetSettings,
} from "../../src/lib/worksheetSettings";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}

// ── D1 shim (same as the other worker suites) ────────────────────────────────
function makeDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../../worker/schema.sql", import.meta.url), "utf8"));
  // Start like production today: no saved_worksheets table until first use.
  db.exec("DROP TABLE saved_worksheets");
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

globalThis.fetch = (async (input: RequestInfo | URL) => {
  throw new Error(`unexpected fetch ${String(input)}`);
}) as typeof fetch;
console.error = () => {};

const APP = "https://euclidengine.tech";
const { raw, d1 } = makeDb();
const env = { DB: d1, APP_URL: APP } as unknown as Env;
const now = Math.floor(Date.now() / 1000);

let n = 0;
async function makeUser(email: string, opts: { pro?: boolean; founders?: boolean } = {}): Promise<{ id: string; cookie: string }> {
  n++;
  const id = `u${String(n).padStart(31, "0")}`;
  raw
    .prepare(
      "INSERT INTO users (id, email, plan, subscription_status, current_period_end, founders, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(id, email, opts.pro ? "pro" : "free", opts.pro ? "active" : null, opts.pro ? now + 86400 : null, opts.founders ? 1 : 0, now);
  const token = String(n).padStart(2, "0").repeat(32);
  raw
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(`s${n}`, id, await sha256Hex(token), now + 3600, now);
  return { id, cookie: `euclid_session=${token}` };
}

const post = (path: string, body: unknown, cookie = "", origin = APP) =>
  worker.fetch(
    new Request(`${APP}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie, "CF-Connecting-IP": "1.2.3.4" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    env,
  );
const list = (cookie = "") => worker.fetch(new Request(`${APP}/api/worksheets`, { headers: { Cookie: cookie } }), env);
const rows = (userId: string) =>
  Number((raw.prepare("SELECT COUNT(*) n FROM saved_worksheets WHERE user_id = ?").get(userId) as { n: number }).n);

interface Item {
  id: string;
  name: string;
  settings: unknown;
  createdAt: number;
  updatedAt: number;
}

const topics = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);
const geometry = topics.find((e) => e.id.startsWith("g-") || e.id.startsWith("ch"))!.id;
const algebra = topics.find((e) => e.id.startsWith("a2-"))!.id;
const recipe: WorksheetSettings = settingsForSave({
  ...DEFAULT_SETTINGS,
  docType: "test",
  title: "Unit 4 test, period 3",
  topicIds: [geometry, algebra],
  seed: 73519,
  count: 5,
  advancedCounts: true,
  topicCounts: { [algebra]: 8 },
  difficulty: 3,
  wordProblems: true,
});

async function main() {
  const pro = await makeUser("pro@school.org", { pro: true });
  const founder = await makeUser("founder@school.org", { founders: true });
  const free = await makeUser("free@school.org");
  const other = await makeUser("other@school.org", { pro: true });

  // ── Sign-in required ──
  ck("list needs sign-in", (await list()).status === 401);
  ck("save needs sign-in", (await post("/worksheets/save", { name: "x", settings: recipe })).status === 401);
  ck("rename needs sign-in", (await post("/worksheets/rename", { id: "a".repeat(32), name: "x" })).status === 401);
  ck("delete needs sign-in", (await post("/worksheets/delete", { id: "a".repeat(32) })).status === 401);

  // ── Table is created on first use ──
  let res = await list(pro.cookie);
  let body = (await res.json()) as { pro: boolean; limit: number; items: Item[] };
  ck("empty library lists with 200", res.status === 200 && body.items.length === 0);
  ck("list says Pro and the cap", body.pro === true && body.limit === MAX_SAVED_WORKSHEETS);
  ck("table now exists", !!raw.prepare("SELECT name FROM sqlite_master WHERE name = 'saved_worksheets'").get());

  // ── Free can't save; Pro and Founders can ──
  res = await post("/worksheets/save", { name: "Mine", settings: recipe }, free.cookie);
  ck("Free save is 403 pro_required", res.status === 403 && ((await res.json()) as { error: string }).error === "pro_required");
  ck("Free save stores nothing", rows(free.id) === 0);
  res = await list(free.cookie);
  body = (await res.json()) as typeof body;
  ck("Free can still list (pro: false)", res.status === 200 && body.pro === false);

  res = await post("/worksheets/save", { name: "  Unit 4\ttest  ", settings: recipe }, pro.cookie);
  const saved = (await res.json()) as { ok: boolean; item: Item };
  ck("Pro save is 200", res.status === 200 && saved.ok === true);
  ck("id is 32 hex", /^[a-f0-9]{32}$/.test(saved.item.id));
  ck("name is tidied", saved.item.name === "Unit 4 test");
  ck("Founders can save", (await post("/worksheets/save", { name: "F", settings: recipe }, founder.cookie)).status === 200);

  // ── What's stored is settings only, and rebuilds identically ──
  const stored = raw.prepare("SELECT settings FROM saved_worksheets WHERE id = ?").get(saved.item.id) as { settings: string };
  ck("stored settings are small JSON, no PDF", stored.settings.length < 1000 && stored.settings.startsWith("{"));
  res = await list(pro.cookie);
  body = (await res.json()) as typeof body;
  const back = body.items.find((i) => i.id === saved.item.id);
  const reloaded = back ? sanitizeSettings(back.settings) : null;
  ck("listed settings equal what was saved", JSON.stringify(reloaded) === JSON.stringify(recipe));
  ck(
    "rebuilt problems and answers are byte-identical",
    !!reloaded && JSON.stringify(generateFromSettings(reloaded)) === JSON.stringify(generateFromSettings(recipe)),
  );
  ck("rebuild has the per-topic count", !!reloaded && generateFromSettings(reloaded)[1].length > 0);

  // ── Owner only ──
  ck("other user doesn't see it", ((await (await list(other.cookie)).json()) as typeof body).items.length === 0);
  res = await post("/worksheets/rename", { id: saved.item.id, name: "Hijacked" }, other.cookie);
  ck("other user can't rename (404)", res.status === 404);
  res = await post("/worksheets/delete", { id: saved.item.id }, other.cookie);
  ck("other user can't delete (404)", res.status === 404 && rows(pro.id) === 1);

  // ── Rename ──
  res = await post("/worksheets/rename", { id: saved.item.id, name: "Unit 4 test (2026)" }, pro.cookie);
  ck("owner renames", res.status === 200 && ((await res.json()) as { name: string }).name === "Unit 4 test (2026)");
  ck("rename leaves settings alone", (raw.prepare("SELECT settings FROM saved_worksheets WHERE id = ?").get(saved.item.id) as { settings: string }).settings === stored.settings);
  ck("blank name refused", (await post("/worksheets/rename", { id: saved.item.id, name: "   " }, pro.cookie)).status === 400);
  ck("81-character name refused", (await post("/worksheets/rename", { id: saved.item.id, name: "x".repeat(81) }, pro.cookie)).status === 400);
  ck("bad id is 404", (await post("/worksheets/rename", { id: "../etc", name: "x" }, pro.cookie)).status === 404);

  // ── Validation and size ──
  ck("no settings refused", (await post("/worksheets/save", { name: "x" }, pro.cookie)).status === 400);
  ck("empty topics refused", (await post("/worksheets/save", { name: "x", settings: { ...recipe, topicIds: [], topicCounts: {} } }, pro.cookie)).status === 400);
  ck("fractional seed refused", (await post("/worksheets/save", { name: "x", settings: { ...recipe, seed: 0.5 } }, pro.cookie)).status === 400);
  ck("not JSON refused", (await post("/worksheets/save", "not json", pro.cookie)).status === 400);
  ck("missing name refused", (await post("/worksheets/save", { settings: recipe }, pro.cookie)).status === 400);
  const bigIds = Array.from({ length: 60 }, (_, i) => `topic-${i}-${"x".repeat(70)}`);
  res = await post("/worksheets/save", { name: "Huge", settings: { ...recipe, topicIds: bigIds, topicCounts: Object.fromEntries(bigIds.map((id) => [id, 25])) } }, pro.cookie);
  ck("oversized settings refused with 413", res.status === 413);
  const unknownKeys = await post("/worksheets/save", { name: "Extra", settings: { ...recipe, pdf: "JVBERi0", students: ["Ann"] } }, pro.cookie);
  const extraItem = ((await unknownKeys.json()) as { item: Item }).item;
  ck("unknown fields are dropped before storing", !!extraItem && !("pdf" in (extraItem.settings as object)) && !("students" in (extraItem.settings as object)));

  // ── Origin check on writes ──
  res = await post("/worksheets/save", { name: "x", settings: recipe }, pro.cookie, "https://evil.example");
  ck("cross-site save is 403", res.status === 403);
  res = await post("/worksheets/delete", { id: saved.item.id }, pro.cookie, "https://evil.example");
  ck("cross-site delete is 403 and deletes nothing", res.status === 403 && rows(pro.id) >= 1);

  // ── Delete ──
  res = await post("/worksheets/delete", { id: extraItem.id }, pro.cookie);
  ck("owner deletes", res.status === 200 && !raw.prepare("SELECT 1 FROM saved_worksheets WHERE id = ?").get(extraItem.id));
  ck("deleting again is 404", (await post("/worksheets/delete", { id: extraItem.id }, pro.cookie)).status === 404);

  // ── Lapsed Pro keeps their list and can tidy, but can't save ──
  raw.prepare("UPDATE users SET subscription_status = 'canceled' WHERE id = ?").run(pro.id);
  body = (await (await list(pro.cookie)).json()) as typeof body;
  ck("lapsed Pro still lists (pro: false)", body.pro === false && body.items.length === 1);
  ck("lapsed Pro can rename", (await post("/worksheets/rename", { id: saved.item.id, name: "Keep" }, pro.cookie)).status === 200);
  ck("lapsed Pro can't save", (await post("/worksheets/save", { name: "x", settings: recipe }, pro.cookie)).status === 403);
  raw.prepare("UPDATE users SET subscription_status = 'active' WHERE id = ?").run(pro.id);

  // ── 200-worksheet cap ──
  const fill = raw.prepare(
    "INSERT INTO saved_worksheets (id, user_id, name, settings, created_at, updated_at) VALUES (?, ?, 'f', '{}', ?, ?)",
  );
  for (let i = rows(other.id); i < MAX_SAVED_WORKSHEETS - 1; i++) fill.run(`f${String(i).padStart(31, "0")}`, other.id, now, now);
  res = await post("/worksheets/save", { name: "Last one", settings: recipe }, other.cookie);
  ck("save number 200 works", res.status === 200 && rows(other.id) === MAX_SAVED_WORKSHEETS);
  res = await post("/worksheets/save", { name: "One too many", settings: recipe }, other.cookie);
  ck("save number 201 is 409 library_full", res.status === 409 && ((await res.json()) as { error: string }).error === "library_full");
  ck("cap holds", rows(other.id) === MAX_SAVED_WORKSHEETS);
  body = (await (await list(other.cookie)).json()) as typeof body;
  ck("list returns all 200", body.items.length === MAX_SAVED_WORKSHEETS);

  // ── Rate limit on writes ──
  const rl = await makeUser("busy@school.org", { pro: true });
  let lastOk = 0;
  let limited: Response | null = null;
  for (let i = 0; i < RATE_LIMIT_LIBRARY_WRITES + 1; i++) {
    const r = await post("/worksheets/save", { name: `n${i}`, settings: recipe }, rl.cookie);
    if (r.status === 200) lastOk++;
    else {
      limited = r;
      break;
    }
  }
  ck(`${RATE_LIMIT_LIBRARY_WRITES} writes allowed per window`, lastOk === RATE_LIMIT_LIBRARY_WRITES);
  ck("next write is 429 with Retry-After", limited?.status === 429 && !!limited.headers.get("Retry-After"));
  ck("other accounts are unaffected", (await post("/worksheets/rename", { id: saved.item.id, name: "Still fine" }, pro.cookie)).status === 200);

  console.log(`worker library: ${checks} checks, ${failures} failures`);
  process.exit(failures ? 1 : 0);
}
main();

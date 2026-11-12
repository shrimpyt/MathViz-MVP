// Taught shelf endpoint tests. Runs worker/src/index.ts against an in-memory
// SQLite database shaped like D1 (node:sqlite, Node 22+). Covers: sign-in
// required, the table being created on first use, mark/list/remove, newest
// first, first date kept on a repeat, owner only, validation, exports
// filling the shelf on their own (and never failing over it), the cap
// dropping the oldest, rate limits and the Origin check.
// Run: npx tsx tests/paygate/run-worker-taught.ts

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../../worker/src/index";
import { sha256Hex } from "../../worker/src/core";
import {
  MAX_TAUGHT_LESSONS,
  MAX_TAUGHT_PER_CALL,
  RATE_LIMIT_TAUGHT_WRITES,
  validateTaughtIds,
  shelfIdsFromExport,
} from "../../worker/src/taught";

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
  // Start like production today: no taught_lessons table until first use.
  db.exec("DROP TABLE taught_lessons");
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
const list = (cookie = "") => worker.fetch(new Request(`${APP}/api/taught`, { headers: { Cookie: cookie } }), env);
interface Item {
  topicId: string;
  taughtAt: number;
  lastAt: number;
}
const items = async (cookie: string) => ((await (await list(cookie)).json()) as { items: Item[] }).items;
const rows = (userId: string) =>
  Number((raw.prepare("SELECT COUNT(*) n FROM taught_lessons WHERE user_id = ?").get(userId) as { n: number }).n);
const age = (userId: string, topic: string, secondsAgo: number) =>
  raw.prepare("UPDATE taught_lessons SET taught_at = taught_at - ?, last_at = last_at - ? WHERE user_id = ? AND topic_id = ?").run(secondsAgo, secondsAgo, userId, topic);

async function main() {
  // ── Pure rules ──
  ck("ids: dedupe", JSON.stringify(validateTaughtIds(["a-1", "a-1", "b"])) === '["a-1","b"]');
  ck("ids: empty refused", validateTaughtIds([]) === null);
  ck("ids: not a list refused", validateTaughtIds("a-1") === null);
  ck("ids: bad id refuses all", validateTaughtIds(["a-1", "../x"]) === null);
  ck("ids: uppercase refused", validateTaughtIds(["A-1"]) === null);
  ck("ids: 60 ok", validateTaughtIds(Array.from({ length: MAX_TAUGHT_PER_CALL }, (_, i) => `t-${i}`))?.length === 60);
  ck("ids: 61 refused", validateTaughtIds(Array.from({ length: MAX_TAUGHT_PER_CALL + 1 }, (_, i) => `t-${i}`)) === null);
  ck("export ids keep only valid", JSON.stringify(shelfIdsFromExport(["g-1", "Bad Id", "g-1", "a2-3"])) === '["g-1","a2-3"]');

  const teacher = await makeUser("t@school.org");
  const other = await makeUser("o@school.org", { pro: true });

  // ── Sign-in required ──
  ck("list needs sign-in", (await list()).status === 401);
  ck("mark needs sign-in", (await post("/taught/mark", { topicIds: ["g-1"] })).status === 401);
  ck("remove needs sign-in", (await post("/taught/remove", { topicIds: ["g-1"] })).status === 401);

  // ── First use creates the table ──
  let res = await list(teacher.cookie);
  ck("empty shelf lists with 200", res.status === 200 && ((await res.json()) as { items: Item[] }).items.length === 0);
  ck("table now exists", !!raw.prepare("SELECT name FROM sqlite_master WHERE name = 'taught_lessons'").get());

  // ── Mark, newest first, Free works ──
  res = await post("/taught/mark", { topicIds: ["g-angles", "g-lines"] }, teacher.cookie);
  ck("Free teacher can mark", res.status === 200 && ((await res.json()) as { ok: boolean }).ok === true);
  age(teacher.id, "g-angles", 3 * 86400);
  age(teacher.id, "g-lines", 3 * 86400);
  const firstTaught = (raw.prepare("SELECT taught_at FROM taught_lessons WHERE user_id = ? AND topic_id = 'g-angles'").get(teacher.id) as { taught_at: number }).taught_at;
  await post("/taught/mark", { topicIds: ["a2-logs"] }, teacher.cookie);
  let shelf = await items(teacher.cookie);
  ck("three on the shelf", shelf.length === 3);
  ck("newest first", shelf[0].topicId === "a2-logs");
  age(teacher.id, "a2-logs", 86400);
  await post("/taught/mark", { topicIds: ["g-angles"] }, teacher.cookie);
  shelf = await items(teacher.cookie);
  ck("repeat moves it to the top", shelf[0].topicId === "g-angles");
  ck("repeat keeps the first date", shelf[0].taughtAt === firstTaught && shelf[0].lastAt > firstTaught);
  ck("repeat adds no row", rows(teacher.id) === 3);

  // ── Owner only ──
  ck("other user sees an empty shelf", (await items(other.cookie)).length === 0);
  await post("/taught/remove", { topicIds: ["g-angles"] }, other.cookie);
  ck("other user can't remove mine", rows(teacher.id) === 3);

  // ── Remove ──
  res = await post("/taught/remove", { topicIds: ["g-lines", "not-there"] }, teacher.cookie);
  ck("remove is 200", res.status === 200);
  shelf = await items(teacher.cookie);
  ck("removed lesson is gone", shelf.length === 2 && !shelf.some((i) => i.topicId === "g-lines"));

  // ── Validation ──
  ck("no ids refused", (await post("/taught/mark", {}, teacher.cookie)).status === 400);
  ck("bad id refused", (await post("/taught/mark", { topicIds: ["DROP TABLE"] }, teacher.cookie)).status === 400);
  ck("not JSON refused", (await post("/taught/mark", "nope", teacher.cookie)).status === 400);
  ck("bad request stores nothing", rows(teacher.id) === 2);

  // ── Origin check ──
  ck("mark from another site refused", (await post("/taught/mark", { topicIds: ["g-x"] }, teacher.cookie, "https://evil.example")).status === 403);
  ck("remove from another site refused", (await post("/taught/remove", { topicIds: ["a2-logs"] }, teacher.cookie, "https://evil.example")).status === 403);
  ck("refused calls change nothing", rows(teacher.id) === 2);

  // ── Exports fill the shelf ──
  res = await post("/event", { type: "export", topics: ["p-ratios", "Weird Topic!", "a2-logs"], docType: "worksheet", problems: 10, versions: 1 }, teacher.cookie);
  ck("export logs fine", res.status === 200);
  shelf = await items(teacher.cookie);
  ck("export adds its lessons", shelf.some((i) => i.topicId === "p-ratios"));
  ck("export skips invalid ids", !shelf.some((i) => i.topicId.includes(" ")));
  ck("export moves a repeat to the top", shelf.slice(0, 2).some((i) => i.topicId === "a2-logs"));
  ck("export also logged the event", Number((raw.prepare("SELECT COUNT(*) n FROM events WHERE user_id = ?").get(teacher.id) as { n: number }).n) === 1);
  const many = Array.from({ length: 30 }, (_, i) => `m-${i}`);
  await post("/event", { type: "export", topics: many, docType: "review", problems: 30, versions: 1 }, teacher.cookie);
  shelf = await items(teacher.cookie);
  ck("a 30-lesson export shelves all 30", many.every((id) => shelf.some((i) => i.topicId === id)));
  // A shelf failure never breaks the event call.
  raw.exec("ALTER TABLE taught_lessons RENAME TO taught_lessons_off");
  res = await post("/event", { type: "export", topics: ["g-1"], docType: "test", problems: 5, versions: 1 }, teacher.cookie);
  ck("export still 200 when the shelf fails", res.status === 200);
  raw.exec("ALTER TABLE taught_lessons_off RENAME TO taught_lessons");
  ck("event logged even then", Number((raw.prepare("SELECT COUNT(*) n FROM events WHERE user_id = ?").get(teacher.id) as { n: number }).n) === 3);

  // ── Cap drops the oldest ──
  const big = await makeUser("big@school.org", { pro: true });
  const fill = Array.from({ length: MAX_TAUGHT_LESSONS }, (_, i) => `x-${String(i).padStart(4, "0")}`);
  const ins = raw.prepare("INSERT INTO taught_lessons (user_id, topic_id, taught_at, last_at) VALUES (?, ?, ?, ?)");
  fill.forEach((id, i) => ins.run(big.id, id, now - 100000 + i, now - 100000 + i));
  await post("/taught/mark", { topicIds: ["new-1", "new-2"] }, big.cookie);
  ck("cap holds", rows(big.id) === MAX_TAUGHT_LESSONS);
  const bigShelf = await items(big.cookie);
  ck("newest kept", bigShelf.slice(0, 2).every((i) => i.topicId.startsWith("new-")));
  ck("oldest two dropped", !bigShelf.some((i) => i.topicId === "x-0000" || i.topicId === "x-0001") && bigShelf.some((i) => i.topicId === "x-0002"));

  // ── Rate limit ──
  const busy = await makeUser("busy@school.org");
  let last = 200;
  for (let i = 0; i < RATE_LIMIT_TAUGHT_WRITES; i++) last = (await post("/taught/mark", { topicIds: [`r-${i % 5}`] }, busy.cookie)).status;
  ck("writes up to the limit pass", last === 200);
  ck("one more is 429", (await post("/taught/mark", { topicIds: ["r-9"] }, busy.cookie)).status === 429);
  ck("reads still work while writes are limited", (await list(busy.cookie)).status === 200);

  console.log(failures === 0 ? `taught shelf: ${checks} checks passed` : `taught shelf: ${failures} of ${checks} checks FAILED`);
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});

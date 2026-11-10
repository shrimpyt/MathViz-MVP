// signed-out.tsx, checks the fixes for the signed-out dead ends:
//  - the "Available only" filter hides Pro lessons on Free,
//  - the gated Export button explains itself instead of jumping to /pricing,
//  - the builder survives a trip to Pricing and back (sessionStorage),
//  - /login exists and hands off to the sign-in menu,
//  - the header Sign in works before the page has finished loading,
//  - save/load draft say what happened, and the Pro notice clears on a pick.
//
// Run: npx tsx tests/signed-out.tsx

import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { exportGateCopy, isFreeTopic, isTopicAvailable } from "../src/lib/plan";
import {
  BUILDER_SESSION_KEY,
  clampStep,
  readBuilderSession,
  writeBuilderSession,
} from "../src/lib/builderSession";
import { DEFAULT_SETTINGS } from "../src/lib/worksheetSettings";
import LoginPage from "../src/app/login/page";

let checks = 0;
const failures: string[] = [];
function ok(cond: unknown, msg: string) {
  checks++;
  if (!cond) failures.push(msg);
}

// ── "Available only" honors the plan ──
const built = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);
const freeList = CURRICULUM_REGISTRY.filter((e) => isTopicAvailable(e, false));
const proList = CURRICULUM_REGISTRY.filter((e) => isTopicAvailable(e, true));
ok(freeList.length > 0, "Free sees some lessons");
ok(freeList.every((e) => isFreeTopic(e.id)), "Free never lists a Pro lesson");
ok(freeList.length === built.filter((e) => isFreeTopic(e.id)).length, "Free lists every built Free lesson");
ok(proList.length === built.length, "Pro lists every built lesson");
ok(built.some((e) => !isFreeTopic(e.id)), "the registry has Pro lessons to hide");
ok(!isTopicAvailable({ id: "a1-x", underConstruction: true }, true), "unbuilt lessons stay hidden");

// ── Export explanation ──
for (const reason of ["accommodations", "limit"] as const) {
  for (const signedIn of [false, true]) {
    const c = exportGateCopy(reason, { signedIn, limit: 5 });
    ok(c.title.length > 0 && c.body.length > 0, `${reason}/${signedIn}: has a title and body`);
    const text = c.body.join(" ");
    ok(/Sign in/.test(text) === !signedIn, `${reason}/${signedIn}: sign-in line only when signed out`);
    ok(!/pricing/i.test(text), `${reason}/${signedIn}: no raw /pricing in the copy`);
  }
}
ok(/remove the groups/.test(exportGateCopy("accommodations", { signedIn: true, limit: 5 }).body.join(" ")),
  "accommodations copy says how to export on Free");
ok(/all 5 free exports/.test(exportGateCopy("limit", { signedIn: true, limit: 5 }).body.join(" ")),
  "limit copy names the limit");

// ── Builder survives navigation ──
class MemStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
}
const pick = built.filter((e) => isFreeTopic(e.id)).slice(0, 3).map((e) => e.id);
const settings = { ...DEFAULT_SETTINGS, docType: "test" as const, title: "Unit 4 quiz", topicIds: pick, seed: 913, count: 7 };
const store = new MemStore();
writeBuilderSession(store, { settings, step: 3 });
const back = readBuilderSession(store);
ok(back !== null, "session round-trips");
ok(back?.step === 3, "step restored");
ok(JSON.stringify(back?.settings.topicIds) === JSON.stringify(pick), "topics restored in order");
ok(back?.settings.seed === 913 && back?.settings.count === 7, "seed and count restored (same problems)");
ok(back?.settings.docType === "test" && back?.settings.title === "Unit 4 quiz", "format and title restored");

ok(readBuilderSession(new MemStore()) === null, "empty storage restores nothing");
ok(readBuilderSession(null) === null, "no storage restores nothing");
const junk = new MemStore();
junk.setItem(BUILDER_SESSION_KEY, "{not json");
ok(readBuilderSession(junk) === null, "corrupt entry is ignored");
junk.setItem(BUILDER_SESSION_KEY, JSON.stringify({ v: 2, step: 1, settings }));
ok(readBuilderSession(junk) === null, "unknown version is ignored");
junk.setItem(BUILDER_SESSION_KEY, JSON.stringify({ v: 1, step: 3, settings: { ...settings, topicIds: ["retired-lesson", pick[0]] } }));
ok(JSON.stringify(readBuilderSession(junk)?.settings.topicIds) === JSON.stringify([pick[0]]), "retired topics dropped on restore");
junk.setItem(BUILDER_SESSION_KEY, JSON.stringify({ v: 1, step: 3, settings: { ...settings, topicIds: [] } }));
ok(readBuilderSession(junk)?.step === 1, "Review with no topics lands on Topics");
ok(clampStep(9, 2) === 3 && clampStep(-4, 0) === 0 && clampStep("x", 3) === 0, "step clamps to 0..3");
const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
writeBuilderSession(throwing, { settings, step: 1 });
ok(readBuilderSession(throwing) === null, "blocked storage never throws");

// ── /login ──
const login = renderToStaticMarkup(<LoginPage />);
ok(/http-equiv="refresh" content="0; url=\/\?signin=open"/.test(login), "/login redirects to the sign-in menu without JS");
ok(/href="\/\?signin=open"/.test(login), "/login has a fallback link");

// ── Wiring in the builder (source checks; there's no browser here) ──
const src = fs.readFileSync(path.join(__dirname, "../src/components/WorksheetGenerator.tsx"), "utf8");
const exportGated = src.slice(src.indexOf("gateReason ? (\n          <Button"), src.indexOf("Export PDF 🎉"));
ok(exportGated.includes("onClick={onGatedExport}") && !exportGated.includes('href="/pricing"'),
  "gated Export opens the explanation instead of linking to /pricing");
const signIn = src.slice(src.indexOf('href="/login"') - 200, src.indexOf('href="/login"') + 300);
ok(signIn.includes("e.preventDefault()") && signIn.includes("setOpen((o) => !o)"),
  "Sign in is a real /login link that opens the menu in place once loaded");
ok(/params\.get\('signin'\) !== 'open'/.test(src), "?signin=open opens the menu");
const toggle = src.slice(src.indexOf("const toggleTopic"), src.indexOf("const clearTopics"));
ok(/setGateMsg\(null\);\s*setSelectedTopicIds/.test(toggle), "a successful pick clears the Pro notice");
ok(/isTopicAvailable\(e, isPro\)/.test(src), "filter uses the plan check");
ok(/setDraftNotice\(draftSavedText/.test(src) && /setDraftNotice\(draftLoadedText/.test(src),
  "save and load draft confirm what happened");
ok(/writeBuilderSession\(sessionStore\(\)/.test(src) && /readBuilderSession\(sessionStore\(\)\)/.test(src),
  "builder state is written and restored");

console.log(`signed-out: ${checks} checks, ${failures.length} failed`);
for (const f of failures) console.log("  FAIL " + f);
if (failures.length) process.exit(1);

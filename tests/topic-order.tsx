// Mixed-topic order. A worksheet with two or more topics prints its problems
// mixed together in one seeded order unless "Keep topics grouped" is on.
// The order has to be the same everywhere the worksheet appears: the student
// sheet, its answer key, accommodated versions, a saved worksheet reopened
// later, and the PDF. This checks all of those, then renders a real
// mixed-topic PDF and reads it back to confirm the sheet and key line up.
//
// Run: npx tsx tests/topic-order.tsx [pdf-out-dir]

import React from "react";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import PdfDocument from "../src/components/PdfDocument";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";
import { formatAnswer, pdfSafeText } from "../src/lib/answerKey";
import type { MathProblem } from "../src/lib/ProblemFactory";
import { EMPTY_FLAGS, planVersions } from "../src/lib/accommodations";
import type { ClassAccommodationList } from "../src/lib/accommodations/types";
import {
  DEFAULT_SETTINGS,
  generateFromSettings,
  interleaveProblemSets,
  mixesTopics,
  orderProblemSets,
  sanitizeSettings,
  settingsForSave,
  type WorksheetSettings,
} from "../src/lib/worksheetSettings";
import { serializeWorksheetSettings, validateWorksheetSettings } from "../worker/src/worksheets";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}

const PROPERTIES = "ms6-3-11-properties-of-operations";
const DISTRIBUTIVE = "ms7-7-4-distributive-equations";
for (const id of [PROPERTIES, DISTRIBUTIVE]) {
  if (!CURRICULUM_REGISTRY.some((e) => e.id === id)) throw new Error(`missing registry entry ${id}`);
}

/** The worksheet Trystan sent: Grade 6 properties + Pre-Algebra distributing. */
const mixed: WorksheetSettings = settingsForSave({
  ...DEFAULT_SETTINGS,
  docType: "worksheet",
  title: "Hippity Hoppity This is Now My Property",
  topicIds: [PROPERTIES, DISTRIBUTIVE],
  seed: 4242,
  count: 10,
});

const ordered = (s: WorksheetSettings): MathProblem[] => orderProblemSets(generateFromSettings(s), s);
const ids = (ps: MathProblem[]) => JSON.stringify(ps);

// ── 1. The interleave itself ────────────────────────────────────────────────
{
  const a = Array.from({ length: 10 }, (_, i) => `a${i}`);
  const b = Array.from({ length: 10 }, (_, i) => `b${i}`);
  const c = ["c0", "c1", "c2"];
  const once = interleaveProblemSets([a, b, c], 77);
  ck("same seed, same order", JSON.stringify(once) === JSON.stringify(interleaveProblemSets([a, b, c], 77)));
  ck("every problem appears exactly once", [...once].sort().join() === [...a, ...b, ...c].sort().join());
  for (const [name, set] of [["a", a], ["b", b], ["c", c]] as const) {
    ck(`topic ${name} keeps its own order`, JSON.stringify(once.filter((x) => x.startsWith(name))) === JSON.stringify(set));
  }
  ck("topics are actually mixed", once.slice(0, 10).join() !== a.join() && once.slice(0, 10).some((x) => x.startsWith("b")));
  const orders = new Set(Array.from({ length: 20 }, (_, s) => interleaveProblemSets([a, b], s).join()));
  ck(`different seeds give different orders (${orders.size} of 20 distinct)`, orders.size >= 15);
  ck("empty topics are fine", interleaveProblemSets([[], ["x"], []], 1).join() === "x");
  // Long runs of one topic would make "mixed" look grouped; check they're rare.
  let worst = 0;
  for (let s = 0; s < 200; s++) {
    const o = interleaveProblemSets([a, b], s);
    let run = 1;
    for (let i = 1; i < o.length; i++) {
      run = o[i][0] === o[i - 1][0] ? run + 1 : 1;
      worst = Math.max(worst, run);
    }
  }
  ck(`no seed puts a whole topic in one run (longest run ${worst})`, worst < 10);
}

// ── 2. When mixing applies ──────────────────────────────────────────────────
{
  const sets = generateFromSettings(mixed);
  ck("two topics mix by default", mixesTopics(mixed, sets));
  ck("Keep topics grouped prints topic by topic", ids(ordered({ ...mixed, keepTopicsGrouped: true })) === ids(sets.flat()));
  ck("Classical Notes stays grouped", !mixesTopics({ ...mixed, docType: "classical-notes" }, sets));
  const single = { ...mixed, topicIds: [PROPERTIES] };
  ck("one topic is unchanged", ids(ordered(single)) === ids(generateFromSettings(single).flat()));
  ck("one topic never counts as mixed", !mixesTopics(single, generateFromSettings(single)));
  const m = ordered(mixed);
  ck("mixed sheet has every problem", m.length === sets.flat().length && m.length === 20);
  ck("mixed order differs from grouped", ids(m) !== ids(sets.flat()));
  ck("mixing changes the order only, not the problems", JSON.stringify(m.map((p) => JSON.stringify(p)).sort()) === JSON.stringify(sets.flat().map((p) => JSON.stringify(p)).sort()));
  ck("a new seed gives a new order", ids(ordered({ ...mixed, seed: 4243 })) !== ids(m));
}

// ── 3. Student sheet and answer key share one order ─────────────────────────
{
  const m = ordered(mixed);
  const again = ordered(mixed);
  ck("rebuilding gives the same order", ids(m) === ids(again));
  const sheet = m.map((p, i) => `${i + 1}. ${problemToQuestion(p, i).text}`);
  const key = again.map((p, i) => `${i + 1}. ${formatAnswer(p)}`);
  ck("key line n answers sheet problem n", sheet.every((_, i) => key[i] === `${i + 1}. ${formatAnswer(m[i])}`));
}

// ── 4. Accommodated versions follow the base order ──────────────────────────
{
  const base = ordered(mixed);
  const list: ClassAccommodationList = {
    id: "list",
    classLabel: "Period 3",
    updatedAt: "2026-11-10T00:00:00Z",
    groups: [
      { id: "g1", label: "Group A", studentCount: 2, flags: { ...EMPTY_FLAGS, reducedCount: true, largePrint: true } },
      { id: "g2", label: "Group B", studentCount: 1, flags: { ...EMPTY_FLAGS, wordBank: true } },
    ],
  };
  const plan = planVersions(base, list);
  ck("base version is the mixed order", ids(plan.base.problems) === ids(base));
  for (const v of plan.groups) {
    const pos = v.problems.map((p) => base.indexOf(p));
    ck(`${v.versionId}: every problem comes from the base sheet`, pos.every((i) => i >= 0));
    ck(`${v.versionId}: same relative order as the base sheet`, pos.every((i, k) => k === 0 || i > pos[k - 1]));
  }
  ck("accommodations planned", plan.groups.length === 2);
}

// ── 5. Saved worksheets: the switch is stored and the order rebuilds ────────
function roundTrip(s: WorksheetSettings): WorksheetSettings | null {
  const validated = validateWorksheetSettings(JSON.parse(JSON.stringify(settingsForSave(s))));
  if (!validated) return null;
  const stored = serializeWorksheetSettings(validated);
  return stored ? sanitizeSettings(JSON.parse(stored)) : null;
}
for (const keep of [false, true]) {
  const s = { ...mixed, keepTopicsGrouped: keep };
  const back = roundTrip(s);
  ck(`saved (grouped ${keep}): switch survives save and Open`, back?.keepTopicsGrouped === keep);
  ck(`saved (grouped ${keep}): reopened worksheet prints the same order`, !!back && ids(ordered(back)) === ids(ordered(s)));
}
{
  // A worksheet saved before this change has no field: it was grouped then,
  // so it must rebuild grouped now.
  const { keepTopicsGrouped: _omit, ...legacy } = settingsForSave(mixed);
  void _omit;
  const v = validateWorksheetSettings(legacy);
  ck("Worker still accepts recipes without the switch", !!v && !("keepTopicsGrouped" in v));
  const back = v ? sanitizeSettings(JSON.parse(serializeWorksheetSettings(v)!)) : null;
  ck("an older saved worksheet reopens grouped, as it was saved", back?.keepTopicsGrouped === true);
  ck("Worker rejects a non-boolean switch", validateWorksheetSettings({ ...settingsForSave(mixed), keepTopicsGrouped: "yes" }) === null);
  ck("new worksheets mix by default", DEFAULT_SETTINGS.keepTopicsGrouped === false);
}

// ── 6. The PDF: render it, read it back, compare sheet and key ──────────────
const flat = (t: string) => t.replace(/\s+/g, " ").trim();

async function renderAndRead(s: WorksheetSettings, name: string, outDir: string) {
  const problems = ordered(s);
  const sets = generateFromSettings(s);
  const doc = (
    <PdfDocument
      title={s.title}
      questions={problems.map((p, i) => problemToQuestion(p, i))}
      advancedProblems={problems}
      docType={s.docType}
      standard="TEKS 6.7D · TEKS 7.11A"
      includeAnswerKey
      seed={s.seed}
      mixedOrder={mixesTopics(s, sets)}
    />
  );
  const buf = await renderToBuffer(doc);
  const file = join(outDir, `${name}.pdf`);
  writeFileSync(file, buf);
  const text = flat(execFileSync("pdftotext", ["-raw", file, "-"], { encoding: "utf8" }));
  return { problems, text, file };
}

async function main() {
  const outDir = process.argv[2] ?? "/tmp/euclid-topic-order";
  mkdirSync(outDir, { recursive: true });

  const { problems, text, file } = await renderAndRead(mixed, "mixed-topics", outDir);
  const keyAt = text.indexOf("ANSWER KEY");
  ck("PDF has an answer key", keyAt > 0);
  const sheet = text.slice(0, keyAt);
  const key = text.slice(keyAt);
  ck("mixed PDF drops the Grade 6 Math heading", !sheet.includes("Grade 6 Math"));
  ck("mixed PDF drops the Pre-Algebra heading", !sheet.includes("Pre-Algebra"));

  // Sheet: each problem's opening words, in order.
  let at = 0;
  let sheetOk = true;
  problems.forEach((p, i) => {
    const words = flat(pdfSafeText(problemToQuestion(p, i).text)).slice(0, 18);
    const found = sheet.indexOf(words, at);
    if (found < 0) {
      sheetOk = false;
      console.log(`    sheet: problem ${i + 1} "${words}" not found in order`);
    } else at = found + words.length;
  });
  ck("PDF sheet prints problems in the mixed order", sheetOk);

  // Key: numbered answers, in the same order.
  at = 0;
  let keyOk = true;
  problems.forEach((p, i) => {
    const ans = flat(pdfSafeText(formatAnswer(p))).slice(0, 18);
    const num = key.indexOf(`${i + 1}.`, at);
    const found = num < 0 ? -1 : key.indexOf(ans, num);
    if (found < 0) {
      keyOk = false;
      console.log(`    key: ${i + 1}. "${ans}" not found in order`);
    } else at = found + ans.length;
  });
  ck("PDF key answers line up with the sheet's numbers", keyOk);

  // Same settings render the same order twice.
  const again = await renderAndRead(mixed, "mixed-topics-again", outDir);
  ck("rendering twice gives the same sheet and key text", again.text === text);

  // Grouped switch on: the old layout, headings back.
  const grouped = await renderAndRead({ ...mixed, keepTopicsGrouped: true }, "grouped-topics", outDir);
  ck("grouped PDF keeps the Grade 6 Math heading", grouped.text.includes("Grade 6 Math"));
  ck("grouped PDF keeps the Pre-Algebra heading", grouped.text.includes("Pre-Algebra"));

  console.log(`PDFs: ${file}, ${grouped.file}`);
  console.log(`topic order: ${checks} checks, ${failures} failures`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

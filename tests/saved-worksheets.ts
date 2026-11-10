// Saved worksheets regenerate exactly. A saved worksheet is its settings and
// seed, so the promise "same problems and same answer key next year" holds
// only if: (1) the settings survive the trip through the Worker's validator
// and JSON storage unchanged, (2) rebuilding from them gives byte-identical
// problems and answer-key text, (3) nothing depends on Math.random, the
// clock, or process state (checked by rebuilding in a second process), and
// (4) the shared generation path matches the generator's original formula.
// Run: npx tsx tests/saved-worksheets.ts

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import type { CurriculumEntry, DifficultyLevel } from "../src/modules/CurriculumRegistry";
import { problemToQuestion, type DocumentType } from "../src/core/types";
import { formatAnswer } from "../src/lib/answerKey";
import {
  DOCUMENT_TYPES,
  entriesForSettings,
  generateFromSettings,
  orderProblemSets,
  sanitizeSettings,
  settingsForSave,
  toOutputMode,
  type WorksheetSettings,
} from "../src/lib/worksheetSettings";
import { toOutputMode as generatorToOutputMode } from "../src/components/WorksheetGenerator";
import { serializeWorksheetSettings, validateWorksheetSettings } from "../worker/src/worksheets";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    if (failures <= 25) console.log(`  ✗ ${label}`);
  }
}

const live = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);

/** Everything a teacher prints: the problems and the answer-key lines. */
function fingerprint(s: WorksheetSettings): string {
  const sets = generateFromSettings(s);
  // Print order (mixed topics are shuffled by the seed), as the generator uses.
  const flat = orderProblemSets(sets, s);
  const key = flat.map((p, i) => {
    const q = problemToQuestion(p, i);
    return `${formatAnswer(p)}|${JSON.stringify(q)}`;
  });
  return JSON.stringify(sets) + "\n" + key.join("\n");
}

const digest = (text: string) => createHash("sha256").update(text).digest("hex");

/** Save → store → load, the way the library does it. */
function roundTrip(s: WorksheetSettings): WorksheetSettings | null {
  const sent = JSON.parse(JSON.stringify(settingsForSave(s)));
  const validated = validateWorksheetSettings(sent);
  if (!validated) return null;
  const stored = serializeWorksheetSettings(validated);
  if (!stored) return null;
  return sanitizeSettings(JSON.parse(stored));
}

function settings(over: Partial<WorksheetSettings>): WorksheetSettings {
  return {
    docType: "worksheet",
    title: "",
    topicIds: [],
    seed: 42,
    count: 3,
    topicCounts: {},
    advancedCounts: false,
    framework: "teks",
    difficulty: 2,
    includeAnswerKey: true,
    wordProblems: false,
    includeDiagrams: true,
    keepTopicsGrouped: false,
    ...over,
  };
}

// The cases every run checks: every live topic alone, in rotating formats,
// difficulties and seeds, plus multi-topic packets with per-topic counts.
function cases(): WorksheetSettings[] {
  const out: WorksheetSettings[] = [];
  const seeds = [0, 1, 42, 2026, 99999, -7, 2147483647, 9007199254740991];
  live.forEach((entry, i) => {
    out.push(
      settings({
        docType: DOCUMENT_TYPES[i % DOCUMENT_TYPES.length],
        topicIds: [entry.id],
        seed: seeds[i % seeds.length],
        count: 1 + (i % 6),
        difficulty: ((i % 3) + 1) as DifficultyLevel,
        wordProblems: i % 4 === 0,
        includeDiagrams: i % 5 !== 0,
      }),
    );
  });
  for (let k = 0; k < 12; k++) {
    const ids = [0, 1, 2, 3].map((j) => live[(k * 37 + j * 53) % live.length].id);
    const unique = [...new Set(ids)];
    out.push(
      settings({
        docType: (["test", "review", "guided-notes", "classical-notes"] as DocumentType[])[k % 4],
        title: k % 2 ? `Unit ${k} quiz` : "",
        topicIds: unique,
        seed: 1000 + k * 17,
        count: 4,
        advancedCounts: k % 2 === 0,
        topicCounts: k % 2 === 0 ? { [unique[0]]: 7, [unique[unique.length - 1]]: 2 } : {},
        difficulty: ((k % 3) + 1) as DifficultyLevel,
        keepTopicsGrouped: k % 3 === 0,
      }),
    );
  }
  return out;
}

// Child mode: print one digest of every case, for the cross-process check.
if (process.argv[2] === "--digest") {
  console.log(digest(cases().map(fingerprint).join("\n#\n")));
  process.exit(0);
}

// ── 1. Settings survive the save/load trip unchanged ────────────────────────
const all = cases();
for (const s of all) {
  const back = roundTrip(s);
  const label = `${s.topicIds.join("+")} [${s.docType}, seed ${s.seed}]`;
  ck(`${label}: Worker accepts the settings`, back !== null);
  if (!back) continue;
  ck(`${label}: settings come back identical`, JSON.stringify(back) === JSON.stringify(settingsForSave(s)));

  // ── 2. Rebuilt worksheet and key are identical ───────────────────────────
  let original = "";
  let rebuilt = "";
  try {
    original = fingerprint(s);
    rebuilt = fingerprint(back);
  } catch (e) {
    ck(`${label}: generates without throwing (${e instanceof Error ? e.message : e})`, false);
    continue;
  }
  ck(`${label}: has problems`, generateFromSettings(back).flat().length > 0);
  ck(`${label}: problems and answer key rebuild byte-identical`, original === rebuilt);
}

// ── 4. Shared path == the generator's original per-topic formula ────────────
function legacy(s: WorksheetSettings): string {
  const clamp = (n: number) => Math.min(25, Math.max(1, Math.floor(n)));
  const mods = s.topicIds
    .map((id) => CURRICULUM_REGISTRY.find((t) => t.id === id))
    .filter((m): m is CurriculumEntry => !!m);
  return JSON.stringify(
    mods.map((mod, i) =>
      mod.generate(toOutputMode(s.docType), s.seed + i * 7919, {
        count: s.advancedCounts ? clamp(s.topicCounts[mod.id] ?? s.count) : s.count,
        difficulty: s.difficulty,
        wordProblems: s.wordProblems,
      }),
    ),
  );
}
for (const s of all.slice(-12)) {
  ck(`packet ${s.topicIds.join("+")}: matches the generator's original formula`, legacy(s) === JSON.stringify(generateFromSettings(s)));
}
ck("generator re-exports the same toOutputMode", generatorToOutputMode === toOutputMode);

// ── Seeds matter (the test would be empty if every seed gave the same set) ──
{
  const id = live.find((e) => e.id.startsWith("a1-"))?.id ?? live[0].id;
  const a = JSON.stringify(generateFromSettings(settings({ topicIds: [id], seed: 1, count: 5 })));
  const b = JSON.stringify(generateFromSettings(settings({ topicIds: [id], seed: 2, count: 5 })));
  ck("different seeds give different problems", a !== b);
}

// ── Loading is forgiving the way draft files always were ─────────────────────
{
  const id = live[0].id;
  const s = sanitizeSettings({ docType: "test", topicIds: [id, "retired-topic", id], seed: 12.9, count: 99, difficulty: 3 });
  ck("unknown and repeated topics are dropped", JSON.stringify(s?.topicIds) === JSON.stringify([id]));
  ck("seed floors and count clamps", s?.seed === 12 && s?.count === 25);
  ck("missing fields take defaults", s?.includeAnswerKey === true && s?.framework === "teks");
  ck("non-settings are rejected", sanitizeSettings(null) === null && sanitizeSettings([1]) === null);
  ck("entriesForSettings skips unknown ids", entriesForSettings({ topicIds: ["nope", id] }).length === 1);
}

// ── The Worker refuses what wouldn't rebuild exactly ────────────────────────
{
  const good = settingsForSave(settings({ topicIds: [live[0].id] }));
  const bad = (patch: Record<string, unknown>) => validateWorksheetSettings({ ...good, ...patch }) === null;
  ck("rejects no topics", bad({ topicIds: [] }));
  ck("rejects a fractional seed", bad({ seed: 1.5 }));
  ck("rejects an unsafe seed", bad({ seed: 2 ** 60 }));
  ck("rejects count 0 and 26", bad({ count: 0 }) && bad({ count: 26 }));
  ck("rejects difficulty 4", bad({ difficulty: 4 }));
  ck("rejects a count for an unselected topic", bad({ topicCounts: { "x-1": 3 } }));
  ck("rejects odd topic ids", bad({ topicIds: ["<script>"] }));
  ck("rejects duplicate topics", bad({ topicIds: [live[0].id, live[0].id] }));
  ck("rejects a missing flag", bad({ includeDiagrams: undefined }));
  ck("rejects a 121-character title", bad({ title: "x".repeat(121) }));
  const extra = validateWorksheetSettings({ ...good, pdf: "AAAA", studentNames: ["A"] });
  ck("drops unknown fields", !!extra && !("pdf" in extra) && !("studentNames" in extra));
}

// ── 3. A second process rebuilds the same bytes ──────────────────────────────
{
  const here = digest(all.map(fingerprint).join("\n#\n"));
  const self = fileURLToPath(import.meta.url);
  let there = "";
  try {
    there = execFileSync("npx", ["tsx", self, "--digest"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    there = `failed: ${e instanceof Error ? e.message : e}`;
  }
  ck(`a fresh process rebuilds the same worksheets (${here.slice(0, 12)} vs ${there.slice(0, 12)})`, here === there);
}

console.log(`saved worksheets: ${all.length} saved recipes, ${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);

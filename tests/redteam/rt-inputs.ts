// rt-inputs.ts — hostile input attacks (OOM-safe: dangerous counts run in a
// sandboxed child process with timeout + memory cap).
import { spawnSync } from "child_process";
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { formatAnswer, latexToText, pdfSafeText, givenKeyName } from "@/lib/answerKey";
import { problemToQuestion } from "@/core/types";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
const entries = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);
const sample = entries.filter((_, i) => i % 7 === 0);

// ── 1a. dangerous counts in a sandboxed child ────────────────────────────────
// NOTE: tsx is not a project dependency (npx provides it), so the child runs
// via `npx tsx -e` instead of require("tsx/cjs").
function probeCount(entryId: string, countSrc: string): { ok: boolean; note: string } {
  const code = `
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
const e = CURRICULUM_REGISTRY.find(x => x.id === ${JSON.stringify(entryId)})!;
const ps = (e as any).generate("Test", 42, { count: (${countSrc}), difficulty: 2 });
console.log("LEN=" + ps.length);
`;
  const r = spawnSync("npx", ["tsx", "-e", code], {
    timeout: 15000,
    maxBuffer: 1024 * 1024,
    cwd: "/home/hatch/workspace/euclid-worksheet",
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=512" },
  });
  const out = (r.stdout?.toString() ?? "") + (r.stderr?.toString() ?? "");
  if (r.error && (r.error as any).code === "ETIMEDOUT") return { ok: false, note: "HANG: timed out after 15s (infinite loop)" };
  if (/heap out of memory|Allocation failed/i.test(out)) return { ok: false, note: "OOM: heap exhausted" };
  if (r.status !== 0) return { ok: false, note: `crashed status=${r.status}: ${out.slice(0, 120)}` };
  return { ok: true, note: out.trim().slice(0, 60) };
}
for (const entry of sample.slice(0, 6)) {
  for (const cs of ["Infinity", "1e12", "1e9"]) {
    bump();
    const r = probeCount(entry.id, cs);
    if (!r.ok) fail("INPUT-COUNT-HANG", entry.id, "Test", 42, `count=${cs}: ${r.note}`);
  }
}

// ── 1b. hostile-but-finite counts in-process ─────────────────────────────────
const evilCounts: any[] = [0, -1, -100, 1.5, NaN, -Infinity, "3", null, undefined, 100000];
for (const entry of sample) {
  for (const count of evilCounts) {
    bump();
    const t0 = Date.now();
    let problems: any;
    try {
      problems = (entry.generate as any)("Test", 42, { count, difficulty: 2 });
    } catch (e) {
      fail("INPUT-COUNT-THROW", entry.id, "Test", 42, `count=${String(count)} threw: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    const dt = Date.now() - t0;
    if (dt > 10000) fail("INPUT-COUNT-SLOW", entry.id, "Test", 42, `count=${String(count)} took ${dt}ms`);
    if (!Array.isArray(problems)) fail("INPUT-COUNT-SHAPE", entry.id, "Test", 42, `count=${String(count)} returned ${typeof problems}`);
    else if (typeof count === "number" && Number.isFinite(count) && count >= 0 && problems.length !== Math.floor(count) && count !== 1.5)
      fail("INPUT-COUNT-MISMATCH", entry.id, "Test", 42, `count=${count} produced ${problems.length}`);
  }
}

// ── 2. hostile seeds ─────────────────────────────────────────────────────────
const evilSeeds: any[] = [0, -1, -999999, 2 ** 53 - 1, 2 ** 53, NaN, -Infinity, 1.5, "42", null];
for (const entry of sample) {
  for (const seed of evilSeeds) {
    bump();
    try {
      const problems = (entry.generate as any)("Test", seed, { count: 2, difficulty: 2 });
      if (!Array.isArray(problems)) fail("INPUT-SEED-SHAPE", entry.id, "Test", 0, `seed=${String(seed)} returned ${typeof problems}`);
    } catch (e) {
      fail("INPUT-SEED-THROW", entry.id, "Test", 0, `seed=${String(seed)} threw: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// ── 3. hostile difficulty ─────────────────────────────────────────────────────
const evilDiff: any[] = [0, 4, -1, 99, NaN, "2", null, undefined, 2.5];
for (const entry of sample) {
  for (const difficulty of evilDiff) {
    bump();
    try {
      const problems = (entry.generate as any)("Test", 42, { count: 2, difficulty });
      if (!Array.isArray(problems)) fail("INPUT-DIFF-SHAPE", entry.id, "Test", 42, `difficulty=${String(difficulty)} returned ${typeof problems}`);
    } catch (e) {
      fail("INPUT-DIFF-THROW", entry.id, "Test", 42, `difficulty=${String(difficulty)} threw: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// ── 4. hostile modes ─────────────────────────────────────────────────────────
for (const entry of sample.slice(0, 10)) {
  for (const mode of ["worksheet", "TEST", "", null, undefined, 123] as any[]) {
    bump();
    try {
      (entry.generate as any)(mode, 42, { count: 2, difficulty: 2 });
    } catch (e) {
      fail("INPUT-MODE-THROW", entry.id, String(mode), 42, `threw: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// ── 5. text pipeline vs hostile strings ──────────────────────────────────────
const hostileStrings: any[] = [
  null, undefined, 0, 42, -3.5, NaN, Infinity,
  "", "   ", "\n\t",
  "\\frac{1}{2} \\sqrt{3} \\theta \\pi \\angle \\cong x_{1}^{2}",
  "emoji 🎉🔥💯 ∑∏∫ √ θ π ∠ ≃ ≅ ² ³",
  "a".repeat(10000),
  "\\".repeat(500),
  "$".repeat(200),
  "\u0000\u0001\u0002 null bytes",
  "lone surrogate \uD800 here",
  "<script>alert(1)</script>",
  "100% & < > \" ' `",
  "−5 −3 −1 unicode minus",
  "\\begin{array}{c} x \\\\ y \\end{array}",
];
for (const s of hostileStrings) {
  bump();
  let a = "", b = "";
  try { a = latexToText(s as any); } catch (e) { fail("TEXT-LATEX-THROW", "latexToText", "-", 0, `input ${JSON.stringify(String(s)).slice(0, 40)} threw: ${e instanceof Error ? e.message : e}`); }
  try { b = pdfSafeText(s as any); } catch (e) { fail("TEXT-PDF-THROW", "pdfSafeText", "-", 0, `threw: ${e instanceof Error ? e.message : e}`); }
  bump();
  if (typeof s === "string" && s.includes("≅") && b.includes("≅"))
    fail("TEXT-PDF-GLYPH", "pdfSafeText", "-", 0, `≅ not substituted`);
  bump();
  if (/(\\frac|\\sqrt|\\begin)\{/.test(a))
    fail("TEXT-LATEX-LEAK", "latexToText", "-", 0, `raw LaTeX leaked: ${a.slice(0, 60)}`);
}

// ── 6. malformed problem objects through the render seam ─────────────────────
const malformed: any[] = [
  null, undefined, {}, { type: "" }, { type: "BOGUS" },
  { type: "G.12A" },
  { type: "G.12A", subtype: "InscribedAngle", given: null, find: null, answer: NaN, steps: null },
  { type: "SAT", format: "MCQ", options: null, keyIndex: 99 },
  { type: "Proof", steps: "not-an-array" },
  { type: "MS.7", answer: undefined },
  { type: "A.5A", answer: { evil: "object" } },
];
for (const mp of malformed) {
  for (const fn of [["formatAnswer", formatAnswer], ["problemToQuestion", (p: any) => problemToQuestion(p, 0)]] as const) {
    bump();
    try {
      const r = (fn[1] as any)(mp);
      if (fn[0] === "problemToQuestion" && r && typeof r.text === "string" && /undefined|NaN/.test(r.text))
        fail("SEAM-LEAK", fn[0], "-", 0, `malformed ${JSON.stringify(mp)?.slice(0, 50)} produced text with undefined/NaN: ${r.text.slice(0, 80)}`);
    } catch (e) {
      fail("SEAM-THROW", fn[0], "-", 0, `malformed ${JSON.stringify(mp)?.slice(0, 60)} threw: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// ── 7. givenKeyName with hostile keys ────────────────────────────────────────
for (const k of ["", "__proto__", "constructor", "a".repeat(500), "camelCaseKey", null as any]) {
  bump();
  try { givenKeyName(k); } catch (e) { fail("TEXT-KEY-THROW", "givenKeyName", "-", 0, `threw: ${e instanceof Error ? e.message : e}`); }
}

console.log(`\nchecked ${counter.checks} hostile inputs across ${sample.length} entries`);
report("rt-inputs");
process.exit(0);

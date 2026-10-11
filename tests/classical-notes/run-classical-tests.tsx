// run-classical-tests.tsx
// Test harness for the CLASSICAL NOTES document mode.
// Run: npx tsx tests/classical-notes/run-classical-tests.tsx
// Writes: tests/classical-notes/TEST_REPORT.md
//
// Covers the full testing bar:
//  - every registry entry x difficulties 1-3 x counts {1,3,12} in "Classical" mode
//  - Classical generation treated like Review (identical output, same seed)
//  - definitions block present iff seeded for the entry id
//  - web render: steps shown, reasons blanked (never leaked), margin prompts
//    rotated with no adjacent repeats, narration + error log once per section
//  - graceful handling: unknown entry ids, missing reasons, empty worksheets
//  - no LaTeX leaks in rendered output
//  - PDF byte verification (%PDF) across all 7 problem types
//  - PDF structural checks via element-tree walk (reasons absent, prompts sane)
//  - fuzz seeds for crashes + seed reproducibility

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderToBuffer, Text as PdfText } from "@react-pdf/renderer";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  CURRICULUM_REGISTRY,
  type DifficultyLevel,
  type CurriculumEntry,
} from "@/modules/CurriculumRegistry";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";
import {
  CLASSICAL_DEFINITIONS,
  getClassicalDefinitions,
} from "@/lib/classicalDefinitions";
import {
  CLASSICAL_MARGIN_PROMPTS,
  assignMarginPrompts,
} from "@/lib/classicalPrompts";
import { ClassicalNotesCard } from "@/components/problem-cards/ClassicalNotesCard";
import ClassicalNotesPdfDocument, {
  ClassicalNotesPdfSection,
  formatClassicalKeyLine,
} from "@/components/ClassicalNotesPdf";
import { problemToQuestion } from "@/core/types";
import { latexToText } from "@/lib/answerKey";

// ── Check harness ─────────────────────────────────────────────────────────────

interface GroupTally {
  name: string;
  passed: number;
  failed: number;
}

const groups: GroupTally[] = [];
let current: GroupTally | null = null;
const failures: string[] = [];

function group(name: string): void {
  current = { name, passed: 0, failed: 0 };
  groups.push(current);
}

function check(label: string, cond: boolean): void {
  if (!current) group("ungrouped");
  if (cond) {
    current!.passed++;
  } else {
    current!.failed++;
    failures.push(`[${current!.name}] ${label}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const REAL_IDS = new Set(Object.keys(CLASSICAL_DEFINITIONS));
const DIFFICULTIES: DifficultyLevel[] = [1, 2, 3];
const COUNTS = [1, 3, 12];

/** One entry per problem type, for PDF + Review-equivalence sampling. */
const TYPE_ENTRIES: { type: string; id: string }[] = [
  { type: "G.12A", id: "anatomy-of-a-circle" },
  { type: "G.12B", id: "ch11-1-circumference" },
  { type: "G.13B", id: "target-zone" },
  { type: "G.6B", id: "logic-of-congruence" },
  { type: "G.2B", id: "ch7-1-distance-midpoint" },
  { type: "G.9A", id: "trig-2-sides" },
  { type: "G.9B", id: "special-right-triangles" },
];

function getEntry(id: string): CurriculumEntry {
  const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
  if (!e) throw new Error(`registry entry missing: ${id}`);
  return e;
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

function extractMarginPrompts(html: string): string[] {
  const out: string[] = [];
  const re = /data-testid="margin-prompt"[^>]*>([^<]*)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(unescapeHtml(m[1]));
  return out;
}

function totalSteps(ps: MathProblem[]): number {
  return ps.reduce((n, p) => n + p.steps.length, 0);
}

function stepsWithReason(ps: MathProblem[]): number {
  return ps.reduce((n, p) => n + p.steps.filter((s) => s.reason).length, 0);
}

/** Clone problems, stamping synthetic reasons on even-indexed steps. */
function withSyntheticReasons(ps: MathProblem[]): {
  problems: MathProblem[];
  withReason: number;
} {
  let withReason = 0;
  const problems = ps.map((p, pi) => ({
    ...p,
    steps: p.steps.map((s, si) => {
      if (si % 2 === 0) {
        withReason++;
        return { ...s, reason: `SYNTH_REASON_${pi}_${si}_zzq` };
      }
      return { ...s };
    }),
  }));
  return { problems, withReason };
}

function renderCard(entryId: string, ps: MathProblem[], seed: number): string {
  const entry = CURRICULUM_REGISTRY.find((e) => e.id === entryId);
  return renderToStaticMarkup(
    <ClassicalNotesCard
      entryId={entryId}
      problems={ps}
      mode={"Classical" as OutputMode}
      seed={seed}
      startIndex={0}
      sectionLabel={entry?.title ?? "Classical Notes"}
      teksBadge={entry ? entry.teks.split(" · ")[0] : undefined}
    />
  );
}

// ── PDF element-tree walk (no react-pdf renderer needed) ──────────────────────
// Walks the React element tree, invoking custom function components, and
// collects: all string leaves (in order) + the full text of each
// @react-pdf <Text> node (for ordered margin-prompt extraction).

interface PdfWalk {
  strings: string[];
  textNodes: string[];
}

function gatherStrings(node: unknown, out: string[]): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const c of node) gatherStrings(c, out);
    return;
  }
  if (typeof node === "object") {
    const props = (node as { props?: { children?: unknown } }).props;
    if (props && "children" in props) gatherStrings(props.children, out);
  }
}

function walkPdfTree(node: unknown, walk: PdfWalk, depth = 0): void {
  if (depth > 80) return;
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    walk.strings.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const c of node) walkPdfTree(c, walk, depth + 1);
    return;
  }
  if (typeof node === "object") {
    const el = node as { type?: unknown; props?: unknown };
    if (el.type === PdfText) {
      // Leaf text container: record its full content as one node.
      const parts: string[] = [];
      gatherStrings((el.props as { children?: unknown })?.children, parts);
      walk.textNodes.push(parts.join(""));
      walk.strings.push(parts.join(""));
      return;
    }
    if (typeof el.type === "function") {
      const rendered = (el.type as (p: unknown) => unknown)(el.props);
      walkPdfTree(rendered, walk, depth + 1);
      return;
    }
    const props = el.props as { children?: unknown } | undefined;
    if (props && "children" in props) walkPdfTree(props.children, walk, depth + 1);
  }
}

function pdfPromptsInOrder(sectionEl: React.ReactElement): string[] {
  const walk: PdfWalk = { strings: [], textNodes: [] };
  walkPdfTree(sectionEl, walk);
  return walk.textNodes.filter((t) => CLASSICAL_MARGIN_PROMPTS.includes(t));
}

// ── Group A: generation sweep ─────────────────────────────────────────────────

function groupAGeneration(): void {
  group("A — generation sweep (all entries x difficulties x counts)");
  for (const entry of CURRICULUM_REGISTRY) {
    for (const difficulty of DIFFICULTIES) {
      for (const count of COUNTS) {
        const seed = 1000 + entry.id.length * 97 + difficulty * 13 + count;
        const label = `${entry.id} d${difficulty} c${count}`;
        let ps: MathProblem[];
        try {
          ps = entry.generate("Classical" as OutputMode, seed, {
            count,
            difficulty,
          });
          check(`${label}: generates without throwing`, true);
        } catch {
          check(`${label}: generates without throwing`, false);
          continue;
        }
        const expectExact = !entry.underConstruction;
        check(
          `${label}: problem count ${expectExact ? `=== ${count}` : "> 0"}`,
          expectExact ? ps.length === count : ps.length > 0
        );
        check(
          `${label}: every problem has >= 1 step`,
          ps.length > 0 &&
            ps.every((p) => Array.isArray(p.steps) && p.steps.length > 0)
        );
        check(
          `${label}: step fields valid (instruction non-empty; reason optional non-empty)`,
          ps.every((p) =>
            p.steps.every(
              (s) =>
                typeof s.instruction === "string" &&
                s.instruction.length > 0 &&
                (s.reason === undefined ||
                  (typeof s.reason === "string" && s.reason.length > 0))
            )
          )
        );
      }
    }
  }
}

// ── Group B: Classical treated like Review ────────────────────────────────────

function groupBReviewEquivalence(): void {
  group("B — Classical generation treated like Review (same seed => identical)");
  for (const { id } of TYPE_ENTRIES) {
    const entry = getEntry(id);
    for (const difficulty of DIFFICULTIES) {
      for (const count of COUNTS) {
        const seed = 4242;
        const a = entry.generate("Classical" as OutputMode, seed, {
          count,
          difficulty,
        });
        const b = entry.generate("Review" as OutputMode, seed, {
          count,
          difficulty,
        });
        check(
          `${id} d${difficulty} c${count}: Classical === Review`,
          JSON.stringify(a) === JSON.stringify(b)
        );
      }
    }
  }
}

// ── Group C: definitions keyed by entry id ────────────────────────────────────

const DEJAVU_EXTRA = new Set(
  ["√", "θ", "π", "×", "°", "·", "₁", "₂", "⁻", "¹", "²", "−", "—", "–"]
);

function groupCDefinitions(): void {
  group("C — definitions keyed by entry id");
  for (const entry of CURRICULUM_REGISTRY) {
    const defs = getClassicalDefinitions(entry.id);
    if (REAL_IDS.has(entry.id)) {
      check(
        `${entry.id}: definitions seeded`,
        Array.isArray(defs) && defs!.length > 0
      );
      if (defs) {
        check(
          `${entry.id}: all definitions non-empty strings`,
          defs.every((d) => typeof d === "string" && d.trim().length > 0)
        );
        check(
          `${entry.id}: no LaTeX commands in definitions`,
          defs.every((d) => !/\\[a-zA-Z]+/.test(d))
        );
        check(
          `${entry.id}: all glyphs DejaVu-safe`,
          defs.every((d) =>
            [...d].every(
              (ch) => ch.charCodeAt(0) < 128 || DEJAVU_EXTRA.has(ch)
            )
          )
        );
      }
    } else {
      check(
        `${entry.id}: no definitions (block must be omitted)`,
        defs === undefined
      );
    }
  }
}

// ── Group D: web rendering per real entry ─────────────────────────────────────

function groupDWebRender(): void {
  group("D — web render (ClassicalNotesCard) per real entry");
  let i = 0;
  for (const id of REAL_IDS) {
    i++;
    const entry = getEntry(id);
    const label = id;
    let ps: MathProblem[];
    try {
      ps = entry.generate("Classical" as OutputMode, 7000 + i, {
        count: 3,
        difficulty: 2,
      });
    } catch {
      check(`${label}: generates for render test`, false);
      continue;
    }
    let html: string;
    try {
      html = renderCard(id, ps, 7);
      check(`${label}: renders without throwing`, true);
    } catch {
      check(`${label}: renders without throwing`, false);
      continue;
    }
    const defs = getClassicalDefinitions(id)!;
    const text = unescapeHtml(stripTags(html));
    const tSteps = totalSteps(ps);
    const nWithReason = stepsWithReason(ps);

    check(`${label}: definitions block present`, html.includes('data-testid="definitions-block"'));
    check(
      `${label}: all definition texts present in full`,
      defs.every((d) => unescapeHtml(html).includes(d))
    );
    check(
      `${label}: narration box present exactly once`,
      countOccurrences(html, 'data-testid="narration-box"') === 1
    );
    check(
      `${label}: error log present exactly once`,
      countOccurrences(html, 'data-testid="error-log"') === 1
    );
    check(
      `${label}: narration prompt text present`,
      text.includes("Explain this idea in your own words.")
    );
    check(
      `${label}: error log headers present`,
      text.includes("My mistake") && text.includes("My correction")
    );

    const prompts = extractMarginPrompts(html);
    check(
      `${label}: one margin prompt per step (${prompts.length}/${tSteps})`,
      prompts.length === tSteps
    );
    check(
      `${label}: all margin prompts from the bank`,
      prompts.every((p) => CLASSICAL_MARGIN_PROMPTS.includes(p))
    );
    check(
      `${label}: no adjacent margin-prompt repeats`,
      prompts.every((p, idx) => idx === 0 || p !== prompts[idx - 1])
    );
    check(
      `${label}: reason blanks == steps with reason (${nWithReason})`,
      countOccurrences(html, 'data-testid="reason-blank"') === nWithReason
    );
    check(
      `${label}: generic prompts == steps without reason`,
      countOccurrences(html, 'data-testid="generic-margin-prompt"') ===
        tSteps - nWithReason
    );
    check(`${label}: no LaTeX leaks in output`, !/\\[a-zA-Z]+/.test(text));
    check(
      `${label}: first problem statement rendered`,
      text.includes(latexToText(problemToQuestion(ps[0], 0).text).slice(0, 30))
    );
  }
}

// ── Group E: reason blanking with synthetic reasons ───────────────────────────

function groupEReasonBlanking(): MathProblem[] {
  group("E — reason blanking (synthetic reasons)");
  const entry = getEntry("anatomy-of-a-circle");
  const ps = entry.generate("Classical" as OutputMode, 99, {
    count: 3,
    difficulty: 2,
  });
  const { problems, withReason } = withSyntheticReasons(ps);
  const html = renderCard("anatomy-of-a-circle", problems, 11);
  const tSteps = totalSteps(problems);

  check("reason text NEVER appears in rendered HTML", !html.includes("SYNTH_REASON"));
  check(
    `reason blanks == steps with reason (${withReason})`,
    countOccurrences(html, 'data-testid="reason-blank"') === withReason
  );
  check(
    "generic prompts == steps without reason",
    countOccurrences(html, 'data-testid="generic-margin-prompt"') ===
      tSteps - withReason
  );
  const prompts = extractMarginPrompts(html);
  check(
    "margin prompts: one per step, from bank, no adjacent repeats",
    prompts.length === tSteps &&
      prompts.every((p) => CLASSICAL_MARGIN_PROMPTS.includes(p)) &&
      prompts.every((p, idx) => idx === 0 || p !== prompts[idx - 1])
  );
  check(
    "narration + error log still exactly once",
    countOccurrences(html, 'data-testid="narration-box"') === 1 &&
      countOccurrences(html, 'data-testid="error-log"') === 1
  );
  check(
    "answer key helper REVEALS reasons (teacher use)",
    formatClassicalKeyLine(problems[0]).includes("SYNTH_REASON_0_0_zzq")
  );
  return problems;
}

// ── Group F: graceful degradation ─────────────────────────────────────────────

function groupFGraceful(): void {
  group("F — graceful handling (unknown ids, empty worksheets)");
  // Unknown entry id with real problems: no definitions block, no crash.
  const entry = getEntry("target-zone");
  const ps = entry.generate("Classical" as OutputMode, 5, { count: 2 });
  let html = renderCard("no-such-entry", ps, 3);
  check("unknown entry id: renders", html.length > 0);
  check(
    "unknown entry id: definitions block omitted",
    !html.includes('data-testid="definitions-block"')
  );
  check(
    "unknown entry id: problems still render",
    countOccurrences(html, 'data-testid="classical-problem"') === 2
  );
  check(
    "unknown entry id: narration still present",
    html.includes('data-testid="narration-box"')
  );

  // Empty worksheet.
  html = renderCard("no-such-entry", [], 3);
  check("empty worksheet: renders", html.length > 0);
  check(
    "empty worksheet: no definitions block, narration present",
    !html.includes('data-testid="definitions-block"') &&
      html.includes('data-testid="narration-box"')
  );

  // Under-construction entry (placeholder problem): no crash, no definitions.
  const uc = getEntry("ch1-1-points-lines");
  const placeholder = uc.generate("Classical" as OutputMode, 5, { count: 3 });
  html = renderCard("ch1-1-points-lines", placeholder, 3);
  check("under-construction entry: renders", html.length > 0);
  check(
    "under-construction entry: definitions block omitted",
    !html.includes('data-testid="definitions-block"')
  );
}

// ── Group G: PDF byte verification ────────────────────────────────────────────

async function groupGPdfBytes(): Promise<void> {
  group("G — PDF byte verification (%PDF) across all problem types");
  for (const { type, id } of TYPE_ENTRIES) {
    const entry = getEntry(id);
    const ps = entry.generate("Classical" as OutputMode, 4242, {
      count: 2,
      difficulty: 2,
    });
    let buf: Buffer;
    try {
      buf = await renderToBuffer(
        <ClassicalNotesPdfDocument
          title="Classical Notes Test"
          entryId={id}
          problems={ps}
          seed={5}
          sectionLabel={entry.title}
          teksBadge={entry.teks.split(" · ")[0]}
          includeAnswerKey
        />
      );
      check(`${type} (${id}): PDF renders without throwing`, true);
    } catch {
      check(`${type} (${id}): PDF renders without throwing`, false);
      continue;
    }
    check(
      `${type} (${id}): valid %PDF bytes (${buf.length} bytes)`,
      buf.length > 2000 && buf.subarray(0, 4).toString("ascii") === "%PDF"
    );
  }
}

// ── Group H: PDF structural checks (element-tree walk) ─────────────────────────

function groupHPdfStructure(synthProblems: MathProblem[]): void {
  group("H — PDF structure (tree walk: reasons absent, prompts sane)");
  const sectionEl = ClassicalNotesPdfSection({
    entryId: "anatomy-of-a-circle",
    problems: synthProblems,
    seed: 11,
    sectionLabel: "Anatomy of a Circle",
    teksBadge: "G.12(A)",
  });
  const walk: PdfWalk = { strings: [], textNodes: [] };
  walkPdfTree(sectionEl, walk);
  const joined = walk.strings.join("\n");
  const defs = getClassicalDefinitions("anatomy-of-a-circle")!;

  check("pdf: reason text NEVER appears", !joined.includes("SYNTH_REASON"));
  check(
    "pdf: definition text present",
    defs.every((d) => joined.includes(d.slice(0, 40)))
  );
  check(
    "pdf: narration prompt present",
    joined.includes("Explain this idea in your own words.")
  );
  check(
    "pdf: error log headers present",
    joined.includes("My mistake") && joined.includes("My correction")
  );
  check("pdf: Reason labels present (blanked lines)", joined.includes("Reason:"));

  const prompts = pdfPromptsInOrder(sectionEl);
  const tSteps = totalSteps(synthProblems);
  check(`pdf: one margin prompt per step (${prompts.length}/${tSteps})`, prompts.length === tSteps);
  check(
    "pdf: no adjacent margin-prompt repeats",
    prompts.every((p, idx) => idx === 0 || p !== prompts[idx - 1])
  );

  // Web/PDF prompt agreement for the same seed.
  const webHtml = renderCard("anatomy-of-a-circle", synthProblems, 11);
  const webPrompts = extractMarginPrompts(webHtml);
  check(
    "web and PDF assign identical margin prompts for the same seed",
    JSON.stringify(webPrompts) === JSON.stringify(prompts)
  );
}

// ── Group I: prompt-bank unit tests ───────────────────────────────────────────

function groupIPrompts(): void {
  group("I — margin-prompt rotation unit tests");
  const a = assignMarginPrompts(123, 50);
  const b = assignMarginPrompts(123, 50);
  check("deterministic for the same seed", JSON.stringify(a) === JSON.stringify(b));
  check("empty count -> empty array", assignMarginPrompts(7, 0).length === 0);

  let ok = true;
  for (let seed = 0; seed < 200; seed++) {
    for (const count of [1, 2, 5, 7, 8, 13, 50]) {
      const ps = assignMarginPrompts(seed, count);
      if (ps.length !== count) ok = false;
      if (!ps.every((p) => CLASSICAL_MARGIN_PROMPTS.includes(p))) ok = false;
      if (!ps.every((p, idx) => idx === 0 || p !== ps[idx - 1])) ok = false;
    }
  }
  check("200 seeds x 7 counts: length, bank membership, no adjacent repeats", ok);

  // Full bank cycled before repeats: with count == bank size, all distinct.
  const full = assignMarginPrompts(9, CLASSICAL_MARGIN_PROMPTS.length);
  check(
    "full deck has no repeats within one cycle",
    new Set(full).size === CLASSICAL_MARGIN_PROMPTS.length
  );
}

// ── Group J: fuzz + reproducibility ───────────────────────────────────────────

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groupJFuzz(): void {
  group("J — fuzz (30 random seeds: generate + web render + pdf walk)");
  const realIds = [...REAL_IDS];
  const rng = mulberry(20261010);
  for (let i = 0; i < 30; i++) {
    const id = realIds[Math.floor(rng() * realIds.length)];
    const seed = 1 + Math.floor(rng() * 1e9);
    const difficulty = (1 + Math.floor(rng() * 3)) as DifficultyLevel;
    const count = COUNTS[Math.floor(rng() * COUNTS.length)];
    const entry = getEntry(id);
    let ps: MathProblem[];
    try {
      ps = entry.generate("Classical" as OutputMode, seed, { count, difficulty });
      check(`fuzz ${i} (${id} s${seed} d${difficulty} c${count}): generate ok`, true);
    } catch {
      check(`fuzz ${i} (${id}): generate ok`, false);
      continue;
    }
    try {
      const html = renderCard(id, ps, seed);
      check(`fuzz ${i}: web render ok`, html.length > 0);
    } catch {
      check(`fuzz ${i}: web render ok`, false);
    }
    try {
      const sectionEl = ClassicalNotesPdfSection({
        entryId: id,
        problems: ps,
        seed,
        sectionLabel: entry.title,
      });
      const walk: PdfWalk = { strings: [], textNodes: [] };
      walkPdfTree(sectionEl, walk);
      check(`fuzz ${i}: pdf tree walk ok`, walk.strings.length > 0);
    } catch {
      check(`fuzz ${i}: pdf tree walk ok`, false);
    }
  }

  group("K — seed reproducibility");
  const entry = getEntry("target-zone");
  const p1 = entry.generate("Classical" as OutputMode, 555, { count: 3, difficulty: 2 });
  const p2 = entry.generate("Classical" as OutputMode, 555, { count: 3, difficulty: 2 });
  check("same seed -> identical problems", JSON.stringify(p1) === JSON.stringify(p2));
  const h1 = renderCard("target-zone", p1, 555);
  const h2 = renderCard("target-zone", p2, 555);
  check("same seed -> identical web HTML", h1 === h2);
  const pr1 = assignMarginPrompts(555, totalSteps(p1));
  const pr2 = assignMarginPrompts(555, totalSteps(p2));
  check("same seed -> identical margin prompts", JSON.stringify(pr1) === JSON.stringify(pr2));
}

// ── Report ────────────────────────────────────────────────────────────────────

function writeReport(): void {
  const totalPassed = groups.reduce((n, g) => n + g.passed, 0);
  const totalFailed = groups.reduce((n, g) => n + g.failed, 0);
  const total = totalPassed + totalFailed;
  const lines: string[] = [
    "# Classical Notes — Test Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Runner: \`npx tsx tests/classical-notes/run-classical-tests.tsx\``,
    "",
    "## Summary",
    "",
    `**${total} checks, ${totalPassed} passed, ${totalFailed} failed.**`,
    "",
    "## Groups",
    "",
    "| Group | Passed | Failed |",
    "| ----- | ------ | ------ |",
  ];
  for (const g of groups) {
    lines.push(`| ${g.name} | ${g.passed} | ${g.failed} |`);
  }
  lines.push("", "## Coverage", "");
  lines.push(
    `- Registry entries: ${CURRICULUM_REGISTRY.length} (all), difficulties 1-3, counts {1, 3, 12}, mode "Classical".`
  );
  lines.push(
    `- Entries with seeded definitions: ${REAL_IDS.size} (${[...REAL_IDS].join(", ")}).`
  );
  lines.push(
    "- PDF byte verification: one sample per problem type (G.12A, G.12B, G.13B, G.6B, G.2B, G.9A, G.9B), answer key included."
  );
  lines.push("- Fuzz: 30 random (entry, seed, difficulty, count) combos; generate + web render + PDF tree walk.");
  lines.push("", "## Failures", "");
  if (failures.length === 0) {
    lines.push("None — all checks passed.");
  } else {
    for (const f of failures) lines.push(`- ${f}`);
  }
  lines.push("");
  const outPath = path.join(
    process.cwd(),
    "tests",
    "classical-notes",
    "TEST_REPORT.md"
  );
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`\nTOTAL: ${total} checks — ${totalPassed} passed, ${totalFailed} failed.`);
  console.log(`Report: ${outPath}`);
  if (failures.length > 0) {
    console.log("\nFAILURES:");
    for (const f of failures) console.log(`  ${f}`);
    process.exitCode = 1;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  groupAGeneration();
  groupBReviewEquivalence();
  groupCDefinitions();
  groupDWebRender();
  const synthProblems = groupEReasonBlanking();
  groupFGraceful();
  await groupGPdfBytes();
  groupHPdfStructure(synthProblems);
  groupIPrompts();
  groupJFuzz();
  writeReport();
}

main().catch((e) => {
  console.error("Harness crashed:", e);
  process.exitCode = 2;
});

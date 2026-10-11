// test-matrix.ts
// Full generation matrix: every entry × mode × difficulty × count.
// Modes: GuidedNote | Review | Test (Classical is verified at integration;
// it is intentionally NOT part of this matrix).
// Checks: structural validity, PDF-safety, seed reproducibility, and light
// verify-payload consistency. Deep independent verification lives in
// test-verify.ts.

import { CALCULUS_ENTRIES } from "@/modules/calculus";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { CalcMCQProblem, CalculusProblem } from "@/lib/factories/CalculusUtils";
import type { BaseFRQProblem } from "@/lib/apTypes";
import { validateFRQ } from "@/lib/apTypes";
import { pdfSafeText } from "@/lib/answerKey";
import {
  reset, check, checkEqual, checkClose, stats, parseAnswerNumber, checkPdfSafe,
} from "./harness";

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test"];
const DIFFS = [1, 2, 3] as const;
const COUNTS = [1, 3, 12, 25];
const TOPIC_TAGS = new Set(["limits", "derivative-rules", "derivative-apps", "integrals", "ap-frq"]);

function checkMCQ(p: CalcMCQProblem, where: string): void {
  check(p.type === "CALC_MCQ", `${where}: type is CALC_MCQ`);
  check(typeof p.prompt === "string" && p.prompt.trim().length > 0, `${where}: prompt non-empty`);
  check(Array.isArray(p.choices) && p.choices.length === 5, `${where}: exactly 5 choices`);
  check(
    Number.isInteger(p.correctIndex) && p.correctIndex >= 0 && p.correctIndex < 5,
    `${where}: correctIndex in range`
  );
  checkEqual(p.answer, p.choices[p.correctIndex], `${where}: answer === choices[correctIndex]`);
  check(new Set(p.choices).size === 5, `${where}: choices distinct`);
  check(TOPIC_TAGS.has(p.topicTag), `${where}: topicTag valid`);
  check(typeof p.calculator === "boolean", `${where}: calculator flag boolean`);
  check(!!p.verify && ["number", "expr", "text"].includes(p.verify.kind), `${where}: verify payload present`);
  check(typeof p.subtype === "string" && p.subtype.length > 0, `${where}: subtype non-empty`);

  // PDF-safe strings (also run through the real pdfSafeText path)
  checkPdfSafe(p.prompt, `${where} prompt`);
  checkPdfSafe(pdfSafeText(p.prompt), `${where} prompt (pdfSafeText)`);
  for (const c of p.choices) checkPdfSafe(c, `${where} choice`);
  checkPdfSafe(p.answer, `${where} answer`);
  for (const s of p.steps ?? []) {
    check(typeof s.instruction === "string" && s.instruction.length > 0, `${where}: step instruction`);
    checkPdfSafe(s.instruction, `${where} step`);
    for (const b of s.blanks ?? []) {
      check(b.label.length > 0 && b.answer.length > 0, `${where}: blank label+answer`);
      checkPdfSafe(b.answer, `${where} blank`);
    }
  }

  if (p.graph) {
    const g = p.graph;
    check(g.xMin < g.xMax && g.yMin < g.yMax, `${where}: graph ranges valid`);
    check([g.xMin, g.xMax, g.yMin, g.yMax].every(isFinite), `${where}: graph ranges finite`);
    for (const h of g.holes ?? []) check([h.x, h.y].every(isFinite), `${where}: hole finite`);
  }
  if (p.table) {
    for (const row of p.table.rows)
      checkEqual(row.length, p.table.headers.length, `${where}: table row width`);
    for (const h of p.table.headers) checkPdfSafe(h, `${where} table header`);
    for (const row of p.table.rows) for (const c of row) checkPdfSafe(c, `${where} table cell`);
  }

  // Light verify-payload consistency (display rounding: fmtNum trims to 4 decimals)
  const v = p.verify;
  if (v.kind === "number" && v.value !== undefined) {
    const parsed = parseAnswerNumber(p.answer);
    check(!isNaN(parsed), `${where}: numeric answer parses`);
    if (!isNaN(parsed)) checkClose(parsed, v.value, Math.max(v.tol ?? 1e-6, 1e-4), `${where}: answer ≈ verify.value`);
  } else if (v.kind === "text" && v.text !== undefined) {
    checkEqual(p.answer, v.text, `${where}: answer === verify.text`);
  } else if (v.kind === "expr") {
    check(!!v.fn && !!v.source, `${where}: expr verify has fn+source`);
  }
}

function checkFRQ(p: BaseFRQProblem, where: string): void {
  check(p.type === "AP_FRQ", `${where}: type is AP_FRQ`);
  checkEqual(p.subject, "calc", `${where}: subject calc`);
  const errs = validateFRQ(p);
  check(errs.length === 0, `${where}: validateFRQ clean (${errs.join("; ")})`);
  check(typeof p.calculator === "boolean", `${where}: calculator flag boolean`);
  check(["graph", "table", "scenario"].includes(p.stimulus.kind), `${where}: stimulus kind valid`);
  checkPdfSafe(p.topicLabel, `${where} topicLabel`);
  for (const s of p.subparts) {
    checkPdfSafe(s.prompt, `${where} subpart ${s.label} prompt`);
    checkPdfSafe(s.answer, `${where} subpart ${s.label} answer`);
    if (s.justification) check(s.justification.trim().length > 0, `${where}: subpart ${s.label} justification non-empty`);
  }
  const st = p.stimulus;
  if (st.kind === "table") {
    for (const row of st.rows) checkEqual(row.length, st.headers.length, `${where}: FRQ table row width`);
  }
  if (st.kind === "graph") {
    check(typeof st.graphKind === "string" && st.graphKind.length > 0, `${where}: graphKind set`);
    check(!!st.params && typeof st.params === "object", `${where}: graph params object`);
    // JSON-serializable across the generate→render seam
    checkEqual(JSON.stringify(st.params), JSON.stringify(JSON.parse(JSON.stringify(st.params))), `${where}: params JSON-stable`);
  }
}

export function runMatrix(): void {
  reset();
  let cell = 0;
  for (const entry of CALCULUS_ENTRIES) {
    for (const mode of MODES) {
      for (const diff of DIFFS) {
        for (const count of COUNTS) {
          cell++;
          const seed = 7000 + cell * 131;
          const opts = { count, difficulty: diff as 1 | 2 | 3 };
          let first: CalculusProblem[];
          let second: CalculusProblem[];
          try {
            first = entry.generate(mode, seed, opts) as unknown as CalculusProblem[];
            second = entry.generate(mode, seed, opts) as unknown as CalculusProblem[];
          } catch (e) {
            check(false, `${entry.id} ${mode} d${diff} n${count}: threw ${(e as Error).message}`);
            continue;
          }
          const where = `${entry.id}/${mode}/d${diff}/n${count}`;
          checkEqual(first.length, count, `${where}: count`);
          checkEqual(
            JSON.stringify(first),
            JSON.stringify(second),
            `${where}: seed reproducibility`
          );
          first.forEach((p, i) => {
            if (p.type === "CALC_MCQ") checkMCQ(p, `${where}#${i}`);
            else if ((p as BaseFRQProblem).type === "AP_FRQ") checkFRQ(p as BaseFRQProblem, `${where}#${i}`);
            else check(false, `${where}#${i}: unknown problem type ${(p as { type: string }).type}`);
          });
        }
      }
    }
  }
}

// standalone
if (require.main === module) {
  runMatrix();
  const s = stats();
  console.log(`matrix: ${s.checks} checks, ${s.failures.length} failures`);
  for (const f of s.failures.slice(0, 20)) console.log("  FAIL:", f);
  process.exit(s.failures.length > 0 ? 1 : 0);
}

// Estimated time. Every worksheet gets "about N minutes for a typical
// student", built from the problems themselves (lib/estimatedTime.ts). This
// checks the model behaves sensibly across every lesson, format and
// difficulty, then renders three real PDFs (a short Geometry sheet, a mixed
// Algebra II sheet, and a long sheet past one class period) and reads them
// back: the answer key always carries the time, the student sheet only when
// the switch is on.
//
// Run: npx tsx tests/estimated-time.tsx [pdf-out-dir]

import React from "react";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import PdfDocument from "../src/components/PdfDocument";
import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";
import type { MathProblem } from "../src/lib/ProblemFactory";
import {
  CLASS_PERIOD_MINUTES,
  TIME_ON_SHEET_PREF_KEY,
  aboutMinutes,
  estimateWorksheet,
  estimatedTimeLine,
  overPeriodNote,
  problemMinutes,
  readTimeOnSheet,
  rememberTimeOnSheet,
  roundToFive,
  studentTimeLine,
  teacherTimeLine,
} from "../src/lib/estimatedTime";
import {
  DEFAULT_SETTINGS,
  DOCUMENT_TYPES,
  generateFromSettings,
  mixesTopics,
  orderProblemSets,
  toOutputMode,
  type WorksheetSettings,
} from "../src/lib/worksheetSettings";

let passed = 0;
const failures: string[] = [];
function ck(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Rounding and wording ─────────────────────────────────────────────────────
ck("no problems → no estimate", estimateWorksheet([], { docType: "worksheet" }).minutes === 0);
ck("rounds 22 to 20", roundToFive(22) === 20);
ck("rounds 22.5 to 25", roundToFive(22.5) === 25);
ck("a tiny sheet still says 5", roundToFive(1.2) === 5);
ck("wording", estimatedTimeLine(25) === "Estimated time: about 25 minutes for a typical student");
ck("student wording", studentTimeLine(25) === "Estimated time: about 25 minutes");
ck("hours wording", aboutMinutes(70) === "about 1 hour 10 minutes" && aboutMinutes(120) === "about 2 hours");
ck("45 is one period, no note", overPeriodNote(45) === null && teacherTimeLine(45) === estimatedTimeLine(45));
ck("50 gets the period note", overPeriodNote(50) === "That runs longer than one 45-minute class period.");
ck("key line names the period", teacherTimeLine(50).endsWith("longer than one 45-minute class period"));
ck("period is 45 minutes", CLASS_PERIOD_MINUTES === 45);

// ── Remembered switch (browser storage) ──────────────────────────────────────
const mem = new Map<string, string>();
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
ck("switch is off with nothing stored", readTimeOnSheet(store) === false && readTimeOnSheet(null) === false);
rememberTimeOnSheet(store, true);
ck("switch remembers on", readTimeOnSheet(store) === true && mem.get(TIME_ON_SHEET_PREF_KEY) === "1");
rememberTimeOnSheet(store, false);
ck("switch remembers off", readTimeOnSheet(store) === false);
const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
ck("blocked storage reads off", readTimeOnSheet(broken) === false);
let threw = false;
try { rememberTimeOnSheet(broken, true); } catch { threw = true; }
ck("blocked storage doesn't throw on write", !threw);

// ── Every lesson, format and difficulty gives a sane number ─────────────────
const live = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);
let perProblemChecks = 0;
for (const docType of DOCUMENT_TYPES) {
  for (const difficulty of [1, 2, 3] as const) {
    for (const e of live) {
      const ps = e.generate(toOutputMode(docType), 17, { count: 3, difficulty } as any) as MathProblem[];
      for (const p of ps) {
        const m = problemMinutes(p, { docType, difficulty });
        perProblemChecks++;
        if (!(Number.isFinite(m) && m >= 1 && m <= 25)) {
          ck(`${e.id} ${docType} d${difficulty} problem minutes in 1..25`, false, `got ${m}`);
        }
      }
    }
  }
}
ck(`per-problem minutes checked (${perProblemChecks})`, perProblemChecks > 5000);

// Typical medians by course stay in a teacher-believable band.
const median = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
const byCourse = new Map<string, number[]>();
for (const e of live) {
  for (const p of e.generate("Worksheet", 5, { count: 3, difficulty: 2 } as any) as MathProblem[]) {
    const a = byCourse.get(e.course) ?? [];
    a.push(problemMinutes(p, { docType: "worksheet", difficulty: 2 }));
    byCourse.set(e.course, a);
  }
}
const bands: Record<string, [number, number]> = {
  "Grade 6": [1, 3], "Pre-Algebra": [1.5, 3.5], "Algebra I": [2, 4],
  Geometry: [3, 6], "Algebra II": [2.5, 5], "SAT Math": [1.5, 1.7],
};
for (const [course, [lo, hi]] of Object.entries(bands)) {
  const m = median(byCourse.get(course) ?? [0]);
  ck(`${course} median per problem ${lo}..${hi} min`, m >= lo && m <= hi, `got ${m.toFixed(2)}`);
}

// ── Shape of the model ──────────────────────────────────────────────────────
const entry = (id: string) => {
  const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
  if (!e) throw new Error(`no registry entry ${id}`);
  return e;
};
const gen = (id: string, count: number, difficulty: 1 | 2 | 3 = 2, mode: any = "Worksheet") =>
  entry(id).generate(mode, 9, { count, difficulty } as any) as MathProblem[];

const geo5 = gen("ch7-1-distance-midpoint", 5);
const geo10 = gen("ch7-1-distance-midpoint", 10);
ck("more problems take longer",
  estimateWorksheet(geo10, { docType: "worksheet" }).exactMinutes > estimateWorksheet(geo5, { docType: "worksheet" }).exactMinutes);
const sameProblems = gen("a2-5-8-quad-formula", 6);
const at = (d: 1 | 2 | 3) => estimateWorksheet(sameProblems, { docType: "worksheet", difficulty: d }).exactMinutes;
ck("harder setting takes longer", at(1) < at(2) && at(2) < at(3));
ck("guided notes run slower than a worksheet",
  estimateWorksheet(sameProblems, { docType: "guided-notes" }).exactMinutes > estimateWorksheet(sameProblems, { docType: "worksheet" }).exactMinutes);

const proofs = gen("proofs-4-2-sss-sas", 3, 2, "Test");
ck("filling in reasons is quicker than writing whole proofs",
  estimateWorksheet(proofs, { docType: "proof-fill-reasons" }).exactMinutes <
    estimateWorksheet(proofs, { docType: "proof-two-column" }).exactMinutes);
const proofRows = (proofs[0] as any).steps.length;
const oneProof = problemMinutes(proofs[0], { docType: "proof-two-column", difficulty: 2 });
ck("a proof goes by its rows", oneProof > 2 + proofRows * 0.5 && oneProof < 2 + proofRows * 1.2 + 1, `${proofRows} rows, ${oneProof}`);

const satEntry = live.find((e) => e.course === "SAT Math");
if (!satEntry) throw new Error("no SAT entry");
const satProblems = satEntry.generate("Test", 3, { count: 22 } as any) as MathProblem[];
ck("22 SAT questions ≈ one 35-minute module",
  estimateWorksheet(satProblems.slice(0, 22), { docType: "sat-practice" }).minutes === 35,
  `got ${estimateWorksheet(satProblems.slice(0, 22), { docType: "sat-practice" }).minutes}`);

// Reading time: the same problem with a longer prompt costs more.
const base = gen("a2-5-8-quad-formula", 1)[0] as any;
const plain = { ...base, given: {}, find: "x" };
const wordy = {
  ...plain,
  find: "x, where a ball is thrown upward from a balcony and its height in feet after t seconds is modeled by the equation so that it lands on the ground below the balcony",
};
ck("a long word problem costs reading time",
  problemMinutes(wordy, { docType: "worksheet" }) > problemMinutes(plain, { docType: "worksheet" }) + 0.2);

ck("classical notes add time per topic",
  estimateWorksheet(geo5, { docType: "classical-notes", sections: 2 }).exactMinutes >
    estimateWorksheet(geo5, { docType: "classical-notes", sections: 1 }).exactMinutes);

// ── Real PDFs, read back ─────────────────────────────────────────────────────
function flat(s: string) {
  return s.replace(/\s+/g, " ");
}

async function renderSample(
  name: string,
  s: WorksheetSettings,
  outDir: string,
  timeOnStudentSheet: boolean,
) {
  const sets = generateFromSettings(s);
  const problems = orderProblemSets(sets, s);
  const est = estimateWorksheet(problems, { docType: s.docType, difficulty: s.difficulty, sections: sets.length });
  const doc = (
    <PdfDocument
      title={s.title}
      questions={problems.map((p, i) => problemToQuestion(p, i))}
      advancedProblems={problems}
      docType={s.docType}
      standard="Sample"
      includeAnswerKey
      seed={s.seed}
      mixedOrder={mixesTopics(s, sets)}
      estimatedMinutes={est.minutes}
      timeOnStudentSheet={timeOnStudentSheet}
    />
  );
  const buf = await renderToBuffer(doc as any);
  const file = join(outDir, `${name}.pdf`);
  writeFileSync(file, buf);
  const text = flat(execFileSync("pdftotext", ["-raw", file, "-"], { encoding: "utf8" }));
  const keyAt = text.indexOf("ANSWER KEY");
  return { est, problems, sheet: text.slice(0, keyAt), key: text.slice(keyAt), file };
}

const settings = (over: Partial<WorksheetSettings>): WorksheetSettings => ({
  ...DEFAULT_SETTINGS,
  topicCounts: {},
  ...over,
});

async function main() {
  const outDir = process.argv[2] ?? "/tmp/euclid-estimated-time";
  mkdirSync(outDir, { recursive: true });

  const short = await renderSample(
    "short-geometry-worksheet",
    settings({ docType: "worksheet", title: "Distance and Midpoint", topicIds: ["ch7-1-distance-midpoint"], count: 6, seed: 4 }),
    outDir,
    false,
  );
  ck("short sheet is under one period", short.est.minutes > 0 && !short.est.overPeriod, `${short.est.minutes}`);
  ck("short key prints the time", short.key.includes(flat(estimatedTimeLine(short.est.minutes))));
  ck("short student sheet has no time by default", !short.sheet.includes("Estimated time"));

  const mixed = await renderSample(
    "mixed-algebra-2-worksheet",
    settings({
      docType: "worksheet",
      title: "Algebra II Mixed Review",
      topicIds: ["a2-5-8-quad-formula", "a2-7-6-log-properties", "a2-11-4-solve-rational"],
      count: 4,
      seed: 12,
    }),
    outDir,
    true,
  );
  ck("mixed sheet prints the time on the student sheet when on",
    mixed.sheet.includes(flat(studentTimeLine(mixed.est.minutes))) && !mixed.sheet.includes("typical student"));
  ck("mixed key prints the teacher line", mixed.key.includes(flat(teacherTimeLine(mixed.est.minutes))));

  const long = await renderSample(
    "long-geometry-worksheet-over-a-period",
    settings({
      docType: "worksheet",
      title: "Triangles, Circles and Area",
      topicIds: ["ch5-3-bisectors", "trig-2-sides", "ch11-3-sector-area", "ch13-1-area-polygons"],
      count: 4,
      seed: 21,
    }),
    outDir,
    false,
  );
  ck("long sheet runs past one period", long.est.overPeriod, `${long.est.minutes}`);
  ck("long key says it runs past a period", long.key.includes("longer than one 45-minute class period"));

  console.log(
    `estimated-time: short ${short.est.minutes} min (${short.problems.length} problems), ` +
      `mixed ${mixed.est.minutes} min (${mixed.problems.length}), long ${long.est.minutes} min (${long.problems.length}); PDFs in ${outDir}`,
  );
  if (failures.length) {
    console.log(`FAILED ${failures.length} of ${passed + failures.length} checks`);
    for (const f of failures) console.log("  ✗ " + f);
    process.exit(1);
  }
  console.log(`All ${passed} estimated-time checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

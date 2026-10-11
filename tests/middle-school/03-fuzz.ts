// 03-fuzz.ts — validity hunting over thousands of seeds.
// Checks every generated problem for invalid output: NaN/undefined answers,
// degenerate diagrams, negative lengths, dirty text, JSON-serializability,
// and tier compliance. Both the lesson-filtered path (registry entries) and
// the unfiltered factory path (whole grade) are fuzzed.

import { MIDDLE_SCHOOL_ENTRIES } from "@/modules/middle-school";
import { generateGrade6Problems } from "@/lib/factories/MiddleSchoolGrade6";
import { generateGrade7Problems } from "@/lib/factories/MiddleSchoolGrade7";
import { generateGrade8Problems } from "@/lib/factories/MiddleSchoolGrade8";
import { mulberry32 } from "@/lib/math-utils";
import type { OutputMode } from "@/lib/types";
import type { MiddleSchoolSVGParams } from "@/lib/factories/MiddleSchoolTypes";
import { pdfSafeText } from "@/lib/answerKey";
import { check, resetCounters, result, printResult, isMain } from "./helpers";

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];

function textClean(s: string, tag: string): void {
  check(typeof s === "string" && s.length > 0, `${tag}: empty/non-string text`);
  check(!/undefined|NaN/.test(s), `${tag}: contains undefined/NaN: ${s.slice(0, 80)}`);
}

function checkDiagram(params: MiddleSchoolSVGParams | null | undefined, tag: string): void {
  if (params == null) return;
  check(typeof params.kind === "string", `${tag}: diagram missing kind`);
  switch (params.kind) {
    case "MSNumberLine": {
      check(params.min < params.max, `${tag}: number line min>=max (${params.min},${params.max})`);
      for (const v of [...params.marks, ...params.highlight]) {
        check(v >= params.min && v <= params.max, `${tag}: number line mark ${v} out of [${params.min},${params.max}]`);
      }
      if (params.ray) {
        check(params.ray.from >= params.min && params.ray.from <= params.max, `${tag}: ray origin out of range`);
      }
      break;
    }
    case "MSCoordinateGrid": {
      check(params.minX < params.maxX && params.minY < params.maxY, `${tag}: grid degenerate`);
      const inX = (x: number) => x >= params.minX && x <= params.maxX;
      const inY = (y: number) => y >= params.minY && y <= params.maxY;
      for (const pt of params.points ?? []) {
        check(inX(pt.x) && inY(pt.y), `${tag}: grid point (${pt.x},${pt.y}) out of bounds`);
      }
      for (const s of params.segments ?? []) {
        check(inX(s.x1) && inY(s.y1) && inX(s.x2) && inY(s.y2), `${tag}: segment endpoint out of bounds`);
      }
      for (const poly of params.polygons ?? []) {
        for (const pt of poly.points) {
          check(inX(pt.x) && inY(pt.y), `${tag}: polygon point (${pt.x},${pt.y}) out of bounds`);
        }
      }
      break;
    }
    case "MSSpinner": {
      check(params.sectors.length >= 2, `${tag}: spinner has <2 sectors`);
      break;
    }
    case "MSGeometryFigure": {
      for (const [k, v] of Object.entries(params.dims)) {
        check(typeof v === "number" && isFinite(v), `${tag}: dim ${k} not finite`);
        check(v > 0, `${tag}: dim ${k}=${v} not positive`);
      }
      break;
    }
    case "MSScatterPlot": {
      check(params.maxX > 0 && params.maxY > 0, `${tag}: scatter plot degenerate axes`);
      check(params.points.length >= 3, `${tag}: scatter plot has <3 points`);
      for (const pt of params.points) {
        check(pt.x >= 0 && pt.x <= params.maxX && pt.y >= 0 && pt.y <= params.maxY, `${tag}: scatter point out of bounds`);
      }
      break;
    }
    default:
      check(false, `${tag}: unknown diagram kind ${(params as any).kind}`);
  }
}

function checkProblem(p: any, tag: string, maxTier: number): void {
  check(p != null && typeof p === "object", `${tag}: not an object`);
  if (p == null || typeof p !== "object") return;
  // JSON-serializable (catches undefined leaks, circular refs, functions)
  try {
    JSON.parse(JSON.stringify(p));
  } catch (err: any) {
    check(false, `${tag}: not JSON-serializable: ${err?.message}`);
  }
  check(["MS.6", "MS.7", "MS.8"].includes(p.type), `${tag}: bad type ${p.type}`);
  textClean(String(p.prompt ?? ""), `${tag} prompt`);
  if (typeof p.answer === "number") {
    check(isFinite(p.answer), `${tag}: numeric answer not finite: ${p.answer}`);
  } else {
    textClean(String(p.answer ?? ""), `${tag} answer`);
  }
  check(typeof p.tier === "number" && p.tier >= 1 && p.tier <= 3, `${tag}: bad tier ${p.tier}`);
  check(p.tier <= maxTier, `${tag}: tier ${p.tier} exceeds difficulty ${maxTier}`);
  check(p.given != null && typeof p.given === "object", `${tag}: given missing`);
  check(Array.isArray(p.steps), `${tag}: steps not an array`);
  for (const s of p.steps ?? []) {
    textClean(String(s?.instruction ?? ""), `${tag} step instruction`);
    for (const b of s?.blanks ?? []) textClean(String(b?.answer ?? ""), `${tag} step blank`);
  }
  // No division-by-zero phrasing in any rendered text
  const allText = [p.prompt, ...(p.steps ?? []).map((s: any) => s.instruction)].join(" ");
  check(!/÷\s*0(\D|$)|[/／]\s*0(\D|$)/.test(allText), `${tag}: possible division by zero in text`);
  checkDiagram(p.svgParams as MiddleSchoolSVGParams | null | undefined, `${tag} diagram`);
  // pdfSafeText must not throw and must not leak "undefined"
  try {
    const safe = pdfSafeText(p.answer);
    check(!/undefined/.test(safe), `${tag}: pdfSafeText leaked undefined`);
    check(safe.length > 0, `${tag}: pdfSafeText empty`);
  } catch (err: any) {
    check(false, `${tag}: pdfSafeText threw: ${err?.message}`);
  }
}

export function run(): void {
  resetCounters();
  const SEED_COUNT = 60; // seeds per (entry, difficulty) — thousands of problems total

  // 1) Lesson-filtered path: every registry entry × difficulty × seed.
  for (const e of MIDDLE_SCHOOL_ENTRIES) {
    for (const d of [1, 2, 3] as const) {
      for (let s = 0; s < SEED_COUNT; s++) {
        const seed = 1000 + s * 37;
        const mode = MODES[s % MODES.length];
        const problems = e.generate(mode, seed, { count: 3, difficulty: d }) as any[];
        check(problems.length === 3, `${e.id} d${d}: expected 3 problems`);
        for (let i = 0; i < problems.length; i++) {
          checkProblem(problems[i], `${e.id} d${d} seed${seed}#${i}`, d);
        }
      }
    }
  }

  // 2) Unfiltered factory path (whole grade, no subtype filter).
  const gradeFns = [
    { name: "g6", fn: generateGrade6Problems },
    { name: "g7", fn: generateGrade7Problems },
    { name: "g8", fn: generateGrade8Problems },
  ];
  for (const { name, fn } of gradeFns) {
    for (const d of [1, 2, 3] as const) {
      for (let s = 0; s < 120; s++) {
        const seed = 555 + s * 13;
        const mode = MODES[s % MODES.length];
        void mode; // factories are mode-agnostic; mode affects only the registry wrapper
        const problems = (fn as any)(mulberry32(seed), 4, d) as any[];
        check(problems.length === 4, `${name} d${d}: expected 4 problems`);
        for (let i = 0; i < problems.length; i++) {
          checkProblem(problems[i], `${name} d${d} seed${seed}#${i}`, d);
        }
      }
    }
  }
}

if (isMain(import.meta.url)) {
  run();
  printResult(result("03-fuzz"));
}

// fuzz.ts — Geometry generation fuzz.
// 300 seeds × every entry × difficulty 3 (all branches unlocked): generation
// must never throw, must return the requested count, and every problem must
// keep the structural contract (prompt, answer, steps with reasons, blanks).
// Also sweeps diagram params: any coordinate on a GridFigure must lie in the
// −8..8 grid, and numeric answers must be finite.
//
// Run: npx tsx tests/geometry/fuzz.ts

import { WIRED_GEOMETRY } from "../../src/modules/geometry-lessons";
import type { GeometryProblem } from "../../src/lib/factories/GeometryTypes";

let problems = 0;
let bad = 0;

function bad_(msg: string) {
  bad++;
  if (bad <= 20) console.log("BAD:", msg);
}

function walkCoords(o: unknown, path: string, p: GeometryProblem) {
  if (!o || typeof o !== "object") return;
  if (Array.isArray(o)) {
    o.forEach((v, i) => walkCoords(v, `${path}[${i}]`, p));
    return;
  }
  const rec = o as Record<string, unknown>;
  if (typeof rec.x === "number" && typeof rec.y === "number") {
    if (Math.abs(rec.x) > 8 || Math.abs(rec.y) > 8) {
      bad_(`${p.subtype}: grid coord out of range at ${path}: (${rec.x}, ${rec.y})`);
    }
  }
  for (const [k, v] of Object.entries(rec)) walkCoords(v, `${path}.${k}`, p);
}

for (const entry of WIRED_GEOMETRY) {
  for (let seed = 1; seed <= 300; seed++) {
    let out: GeometryProblem[] = [];
    try {
      out = entry.generate("Test", seed * 7919, { count: 14, difficulty: 3 });
    } catch (e) {
      bad_(`${entry.id} seed ${seed}: threw ${(e as Error).message}`);
      continue;
    }
    if (out.length !== 14) bad_(`${entry.id} seed ${seed}: count ${out.length} ≠ 14`);
    for (const p of out) {
      problems++;
      if (!p.prompt || p.prompt.length < 10) bad_(`${entry.id}/${p.subtype}: weak prompt`);
      if (!p.answer) bad_(`${entry.id}/${p.subtype}: empty answer`);
      if (!p.steps?.length || p.steps.some((s) => !s.reason)) bad_(`${entry.id}/${p.subtype}: step missing reason`);
      if (p.svgParams?.kind === "GridFigure") walkCoords(p.svgParams, "grid", p);
      // answers that start with a number must be finite
      const m = p.answer.match(/-?\d+(\.\d+)?/);
      if (m && !Number.isFinite(parseFloat(m[0]))) bad_(`${entry.id}/${p.subtype}: non-finite answer`);
      if (/NaN|undefined|Infinity/.test(p.prompt) || /NaN|undefined/.test(p.answer)) {
        bad_(`${entry.id}/${p.subtype}: NaN/undefined leaked into text: "${p.prompt.slice(0, 60)}" / "${p.answer}"`);
      }
    }
  }
}

console.log(`fuzz: ${problems} problems, ${bad} bad`);
process.exit(bad > 0 ? 1 : 0);

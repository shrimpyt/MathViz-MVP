// printed-keys.ts, checks answer keys against what is PRINTED.
//
// The other suites recompute answers from each generator's own `verify` /
// `meta` data, so a key that is printed wrong (or a question that is printed
// differently from what the generator meant) still passes there. This suite
// reads only what a student or teacher sees: the question text from
// problemToQuestion(), the figure's printed labels, and the key from
// formatAnswer() (or the printed MCQ key). It re-solves each problem from
// that text alone and compares.
//
// It also checks that no coordinate-grid figure draws the answer point on the
// student worksheet.
//
// Run: npx tsx tests/printed-keys.ts

import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { problemToQuestion } from "../src/core/types";
import { formatAnswer } from "../src/lib/answerKey";
import type { OutputMode } from "../src/lib/ProblemFactory";
import { worksheetGrid, type GridFigureParams } from "../src/lib/factories/GeometryTypes";

const SEEDS = Number(process.env.SEEDS ?? 150);
const MODES: OutputMode[] = ["Test", "Review"];
const DIFFS = [1, 2, 3] as const;

let checks = 0;
const failures: string[] = [];
const failCount = new Map<string, number>();
let failTotal = 0;
function fail(where: string, msg: string) {
  failTotal++;
  const id = where.split(" ")[0];
  failCount.set(id, (failCount.get(id) ?? 0) + 1);
  // keep the first few examples per entry so every broken entry is visible
  if ((failCount.get(id) ?? 0) <= 3) failures.push(`${where}: ${msg}`);
}
function check(where: string, ok: boolean, msg: string) {
  checks++;
  if (!ok) fail(where, msg);
}
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = any;

function* problemsFor(id: string): Generator<[P, string]> {
  const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
  if (!e) throw new Error(`registry entry ${id} not found`);
  for (const mode of MODES)
    for (const d of DIFFS)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const ps = e.generate(mode, seed, { count: 6, difficulty: d });
        for (let i = 0; i < ps.length; i++) yield [ps[i], `${id} ${mode} d${d} seed ${seed} #${i + 1}`];
      }
}

// ── A tiny parser for printed algebra (x only) ──────────────────────────────
// Handles unicode minus, superscripts, ^{…}, implicit multiplication,
// \frac{a}{b}, \sqrt{n}, \cdot, ·.
const SUP: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
function toJs(expr: string): string {
  let s = expr
    .replace(/−/g, "-")
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot|·|×/g, "*")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => SUP[c]).join(""));
  // \frac{a}{b} → ((a)/(b)) (non-nested is enough for these generators)
  for (let k = 0; k < 4; k++) {
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, "Math.sqrt($1)");
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))");
  }
  s = s.replace(/\^\{([^{}]*)\}/g, "^($1)");
  s = s.replace(/\s+/g, "");
  // implicit multiplication: 2x, 2(, )(, )x, x(
  s = s.replace(/(\d)(x|\(|M)/g, "$1*$2").replace(/\)(\(|x|\d|M)/g, ")*$1").replace(/x(\(|\d)/g, "x*$1");
  s = s.replace(/\^/g, "**");
  // unary minus binds looser than ^ in printed math: -3^x means -(3^x)
  s = s.replace(/(^|[(*/+\-])-(?=[\dxM(])/g, "$1(-1)*");
  return s;
}
function evalAt(expr: string, x: number): number {
  const js = toJs(expr);
  if (!/^[\d.x+\-*/()Mathsqrt]+$/.test(js)) throw new Error(`unparsed: ${expr} → ${js}`);
  return Function("x", `return ${js};`)(x) as number;
}

// ── 1. Algebra II: multiply / divide rational expressions ──────────────────
for (const [p, where] of problemsFor("a2-11-2-mult-div")) {
  if (p.subtype !== "MultiplyDivideRational") continue;
  const q = problemToQuestion(p, 0).text;
  const m = q.match(/= (.+?) ([·÷]) (.+?)\. Find/);
  if (!m) { check(where, false, `could not read question: ${q}`); continue; }
  const key = formatAnswer(p);
  for (const x0 of [9.5, -8.5, 13.25]) {
    const f1 = evalAt(m[1], x0), f2 = evalAt(m[3], x0);
    const want = m[2] === "·" ? f1 * f2 : f1 / f2;
    check(where, close(evalAt(key, x0), want), `key "${key}" ≠ ${m[1]} ${m[2]} ${m[3]} at x=${x0}`);
  }
}

// ── 2. Calculus: indefinite integrals of polynomials ────────────────────────
for (const [p, where] of problemsFor("calc-integrals")) {
  if (p.subtype !== "IndefiniteIntegral") continue;
  const q = problemToQuestion(p, 0).text;
  const m = q.match(/∫\((.+)\) dx\.$/);
  const key = String(p.answer).replace(/ \+ C$/, "");
  if (!m || !/^[\dx²³⁴ +−-]+$/.test(m[1]) || !/^[\dx²³⁴⁵ +−-]+$/.test(key)) continue; // polynomial items only
  // F' = f, checked with a central difference at a few points
  for (const x0 of [-1.7, 0.6, 2.3]) {
    const h = 1e-4;
    const dF = (evalAt(key, x0 + h) - evalAt(key, x0 - h)) / (2 * h);
    check(where, close(dF, evalAt(m[1], x0), 1e-4), `d/dx(${key}) ≠ ${m[1]}`);
  }
}

// ── 3. Geometry trig: solve for a side (and elevation/depression) ───────────
for (const id of ["trig-2-sides", "ch10-test"]) {
  if (!CURRICULUM_REGISTRY.some((e) => e.id === id)) continue;
  for (const [p, where] of problemsFor(id)) {
    if (p.type !== "G.9A" || (p.subtype !== "SolveForSide" && p.subtype !== "ElevationDepression")) continue;
    const q = problemToQuestion(p, 0).text;
    check(where, /nearest tenth/.test(q), `a side-length key needs a rounding instruction: "${q}"`);
    check(where, !/measure of angle/.test(q), `question asks for an angle but the key is a side: "${q}"`);
    // Read the figure as printed: one angle in degrees, one side number, one x.
    const sp = p.svgParams;
    const ang = Number(String(sp.referenceAngleLabel).replace("°", "")) * Math.PI / 180;
    const L = sp.labels as Record<string, string>;
    const given = Object.entries(L).find(([, v]) => v !== "" && v !== "x");
    const unknown = Object.entries(L).find(([, v]) => v === "x");
    if (!given || !unknown) { check(where, false, "figure labels unreadable"); continue; }
    const g = Number(given[1]);
    const rel = `${unknown[0]}/${given[0]}`;
    const ratio: Record<string, number> = {
      "opposite/hypotenuse": Math.sin(ang), "adjacent/hypotenuse": Math.cos(ang),
      "opposite/adjacent": Math.tan(ang), "adjacent/opposite": 1 / Math.tan(ang),
      "hypotenuse/opposite": 1 / Math.sin(ang), "hypotenuse/adjacent": 1 / Math.cos(ang),
    };
    const want = Math.round(g * ratio[rel] * 10) / 10;
    const got = Number(formatAnswer(p));
    check(where, close(got, want, 1e-9), `key ${got}, but ${unknown[0]} = ${g}·(${rel}) at ${sp.referenceAngleLabel} = ${want}`);
  }
}

// ── 4. SAT: ratios, percent change, ladder trig ─────────────────────────────
const satKey = (p: P) => Number(String(p.key).includes("/") ? eval(String(p.key)) : p.key);
for (const [p, where] of problemsFor("sat-psda-ratios")) {
  const s: string = p.stem;
  let m: RegExpMatchArray | null;
  let want: number | null = null;
  if ((m = s.match(/^If (\d+)\/(\d+) = (\d+)\/x/))) want = (+m[2] * +m[3]) / +m[1];
  else if ((m = s.match(/uses (\d+) (.+?) for every (\d+) servings\. How many servings can be made with (\d+) /))) want = (+m[3] * +m[4]) / +m[1];
  else if ((m = s.match(/uses (\d+) (.+?) for every (\d+) servings\. How many .+ for (\d+) servings/))) want = (+m[1] * +m[4]) / +m[3];
  else if ((m = s.match(/On a map, (\d+) centimeters represents (\d+) kilometers\. If two cities are (\d+) centimeters/))) want = (+m[3] * +m[2]) / +m[1];
  if (want === null) { check(where, false, `unread stem: ${s}`); continue; }
  check(where, close(satKey(p), want), `key ${p.key}, stem gives ${want}: ${s}`);
}
for (const [p, where] of problemsFor("sat-psda-percent")) {
  const m = (p.stem as string).match(/was \$?(\d+)\. It is now \$?(\d+)\. What is the percent (increase|decrease)\?/);
  if (!m) { check(where, false, `unread stem: ${p.stem}`); continue; }
  const [o, n] = [+m[1], +m[2]];
  const want = (Math.abs(n - o) / o) * 100; // percent increase/decrease is a size
  check(where, (m[3] === "increase") === n > o, `stem says ${m[3]} for ${o} → ${n}`);
  check(where, close(satKey(p), want), `key ${p.key}, but percent ${m[3]} is ${want}`);
}
for (const [p, where] of problemsFor("sat-atm-trig")) {
  const m = (p.stem as string).match(/A (\d+)-foot ladder .* reaching (\d+) feet up the wall\. What is (sin|cos|tan)\(θ\)/);
  if (!m) continue; // diagram items are covered by the SAT suite
  const [hyp, opp] = [+m[1], +m[2]];
  const adj = Math.sqrt(hyp * hyp - opp * opp);
  const want = m[3] === "sin" ? opp / hyp : m[3] === "cos" ? adj / hyp : opp / adj;
  check(where, close(satKey(p), want), `key ${p.key}, but ${m[3]}(θ) = ${want}`);
}
for (const [p, where] of problemsFor("sat-pam-quadratics")) {
  const m = (p.stem as string).match(/If (.+) = 0,/);
  if (m) check(where, /^x² ([+−] \d*x )?[+−] \d+$/.test(m[1]), `malformed equation "${m[1]}"`);
}

// ── 5. Algebra 1: quadratic formula, transformations, factoring, decay ──────
for (const [p, where] of problemsFor("a1-8-5-solving")) {
  if (p.subtype !== "QuadraticFormula") continue;
  const poly = String(p.prompt).match(/\\\((.+) = 0\\\)/)?.[1];
  if (!poly) { check(where, false, `unread prompt ${p.prompt}`); continue; }
  const ans = String(p.answer).replace(/^x = /, "");
  const roots = ans.includes("\\pm")
    ? [ans.replace(/\\pm/, "-"), ans.replace(/\\pm/, "+")]
    : ans.split(" \\text{ or } x = ");
  for (const r of roots) {
    const v = evalAt(r, 0);
    check(where, Math.abs(evalAt(poly, v)) < 1e-6, `root ${r} = ${v} does not satisfy ${poly} = 0`);
  }
}
for (const [p, where] of problemsFor("a1-8-3-transformations")) {
  if (p.subtype !== "QuadraticTransformations") continue;
  const g = String(p.prompt).match(/g\(x\) = (-?\d*)\(x/)?.[1] ?? "";
  const a = g === "" ? 1 : g === "-" ? -1 : Number(g);
  const key = formatAnswer(p);
  check(where, /reflect/.test(key) === a < 0, `a = ${a} but key "${key}"`);
  if (Math.abs(a) > 1) check(where, key.includes(`vertical stretch by ${Math.abs(a)}`), `|a| = ${Math.abs(a)} but key "${key}"`);
  if (Math.abs(a) === 1) check(where, !/stretch|shrink/.test(key), `|a| = 1 but key "${key}"`);
}
for (const id of ["a1-7-2-multiply-factor", "a1-7-4-factor-x2bxc", "a1-7-5-factor-ax2bxc", "a1-7-6-special-cases"]) {
  for (const [p, where] of problemsFor(id)) {
    if (!/^Factor/.test(String(p.subtype))) continue;
    const poly = String(p.prompt).match(/\\\((.+)\\\)/)?.[1];
    if (!poly) { check(where, false, `could not read prompt ${p.prompt}`); continue; }
    const key = String(p.answer);
    for (const x0 of [1.5, -2.25, 3.75]) check(where, close(evalAt(key, x0), evalAt(poly, x0)), `key ${key} does not multiply out to ${poly}`);
    // "completely": no parenthesized factor keeps a common whole-number factor
    for (const f of key.match(/\(([^()]+)\)/g) ?? []) {
      // coefficient of each term; a bare x term has coefficient 1
      const terms = f.slice(1, -1).replace(/\^\{\d+\}/g, "").split(/[+-]/).map((t) => t.trim()).filter(Boolean);
      const coeffs = terms.map((t) => Number(t.match(/^\d+/)?.[0] ?? 1));
      const g0 = coeffs.reduce((g, n) => { let a = g, b = n; while (b) [a, b] = [b, a % b]; return a; }, 0);
      check(where, g0 === 1, `factor ${f} in "${key}" still has common factor ${g0}`);
    }
  }
}
for (const [p, where] of problemsFor("a1-9-2-growth-decay")) {
  if (p.subtype !== "ExponentialDecay") continue;
  const m = String(p.prompt).match(/f\(x\) = (\d+)\(\\frac\{1\}\{(\d+)\}\)\^\{x\}.*Find \\\(f\((\d+)\)/);
  if (!m) { check(where, false, `unread prompt ${p.prompt}`); continue; }
  const want = +m[1] / Math.pow(+m[2], +m[3]);
  const val = String(p.answer).split("= ")[1];
  check(where, close(evalAt(val, 0), want, 1e-12), `key ${val} but f(${m[3]}) = ${want} exactly`);
}

// ── 6. Algebra II exponentials: y-intercept matches the printed function ────
for (const [p, where] of problemsFor("a2-7-1-exp-attributes")) {
  if (p.subtype !== "ExpAttributes") continue;
  const q = problemToQuestion(p, 0).text;
  const f = q.match(/[fg]\(x\) = (.+?)\. Find/)?.[1];
  const yi = formatAnswer(p).match(/y-intercept: \(0, ([^)]+)\)/)?.[1];
  if (!f || !yi) { check(where, false, `unread ${q}`); continue; }
  if (/log/.test(f)) continue;
  check(where, close(evalAt(f, 0), evalAt(yi, 0)), `printed ${f} has y-intercept ${evalAt(f, 0)}, key says ${yi}`);
}

// ── 7. No answer drawn on a coordinate-grid figure ──────────────────────────
const pairRe = /\((-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)\)/g;
for (const e of CURRICULUM_REGISTRY) {
  for (let seed = 1; seed <= Math.min(SEEDS, 40); seed++) {
    for (const d of DIFFS) {
      let ps: P[];
      try { ps = e.generate("Test", seed, { count: 6, difficulty: d }); } catch { continue; }
      ps.forEach((p, i) => {
        const sp = p?.svgParams;
        if (!sp || sp.kind !== "GridFigure") return;
        const where = `${e.id} Test d${d} seed ${seed} #${i + 1} (${p.subtype})`;
        const key = formatAnswer(p);
        const q = problemToQuestion(p, 0).text;
        const given = new Set([...q.matchAll(pairRe)].map((m) => `${+m[1]},${+m[2]}`));
        const answers = [...key.matchAll(pairRe)].map((m) => `${+m[1]},${+m[2]}`).filter((k) => !given.has(k));
        if (answers.length === 0) return;
        const shown = worksheetGrid(sp as GridFigureParams);
        const drawn = new Set<string>([
          ...(shown.points ?? []).map((pt) => `${pt.x},${pt.y}`),
          ...(shown.polygons ?? []).flatMap((poly) => poly.points.map((pt) => `${pt.x},${pt.y}`)),
          ...(shown.lines ?? []).flatMap((l) => [`${l.x1},${l.y1}`, `${l.x2},${l.y2}`]),
        ]);
        const leaked = answers.filter((k) => drawn.has(k));
        check(where, leaked.length === 0, `figure draws answer point(s) ${leaked.join("; ")}`);
      });
    }
  }
}

console.log(`printed-keys: ${checks} checks, ${failTotal} failures`);
if (failTotal) {
  for (const [id, n] of failCount) console.log(`  ${id}: ${n} failing`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}

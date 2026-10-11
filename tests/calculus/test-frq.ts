// test-frq.ts
// FRQ stimulus consistency: validateFRQ on every FRQ, plus the hard checks:
//   - table cells match the underlying function via INDEPENDENT re-evaluation
//   - graph features (areas, sign changes, monotonicity) match independent
//     recomputation from the stored points
//   - every subpart answer is recomputed from the STIMULUS ALONE (points,
//     table cells, or scenario parameters) — hunting contradictions
//   - justifications are present (AP justification language for the key)

import { mulberry32 } from "@/lib/math-utils";
import type { BaseFRQProblem } from "@/lib/apTypes";
import { validateFRQ } from "@/lib/apTypes";
import { buildCalculusFRQ, type FRQBuild } from "@/lib/factories/CalculusFRQ";
import {
  reset, check, checkEqual, checkClose, stats, indepEval, parseAnswerNumber,
} from "./harness";

const SEEDS = 450;

// ── Independent geometry on polylines (reimplemented for the tests) ──────────

function indepNetArea(pts: { x: number; y: number }[], a: number, b: number): number {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const l = Math.max(p.x, a);
    const r = Math.min(q.x, b);
    if (r <= l) continue;
    const yl = p.y + ((q.y - p.y) * (l - p.x)) / (q.x - p.x);
    const yr = p.y + ((q.y - p.y) * (r - p.x)) / (q.x - p.x);
    total += ((yl + yr) / 2) * (r - l);
  }
  return total;
}

function indepSignChanges(pts: { x: number; y: number }[]): { x: number; dir: string }[] {
  const out: { x: number; dir: string }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    if (p.y === 0 || q.y === 0) {
      const zx = p.y === 0 ? p.x : q.x;
      const before = i > 0 ? pts[i - 1].y : p.y;
      const after = i + 1 < pts.length - 1 ? pts[i + 2].y : q.y;
      if (before > 0 && after < 0) out.push({ x: zx, dir: "+to-" });
      else if (before < 0 && after > 0) out.push({ x: zx, dir: "-to+" });
    } else if ((p.y > 0) !== (q.y > 0)) {
      const t = p.y / (p.y - q.y);
      out.push({ x: p.x + t * (q.x - p.x), dir: p.y > 0 ? "+to-" : "-to+" });
    }
  }
  return out;
}

function indepIncreasing(pts: { x: number; y: number }[]): [number, number][] {
  const out: [number, number][] = [];
  let start: number | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pts[i + 1].y > pts[i].y) {
      if (start === null) start = pts[i].x;
    } else if (start !== null) {
      out.push([start, pts[i].x]);
      start = null;
    }
  }
  if (start !== null) out.push([start, pts[pts.length - 1].x]);
  return out;
}

function parseFrac(s: string): number {
  const t = s.replace(/−/g, "-");
  const m = t.match(/^(-?[\d.]+)(?:\/(-?[\d.]+))?$/);
  if (!m) return NaN;
  return m[2] ? parseFloat(m[1]) / parseFloat(m[2]) : parseFloat(m[1]);
}

/** Number pattern accepting ASCII or unicode minus, with optional fraction. */
const NUM = "[−-]?[\\d./]+";

// ── Per-template checks ───────────────────────────────────────────────────────

function checkGraphFRQ(b: FRQBuild, where: string): void {
  const { frq, verify } = b;
  const pts = verify.points!;
  check(pts.length >= 4, `${where}: enough f' points`);

  // stimulus params carry the same points (graphKind + JSON-serializable)
  const st = frq.stimulus;
  check(st.kind === "graph", `${where}: stimulus is graph`);
  if (st.kind === "graph") {
    checkEqual(st.graphKind, "derivative-graph", `${where}: graphKind`);
    const fn = (st.params as Record<string, unknown>).fn as { kind: string; points: { x: number; y: number }[] };
    checkEqual(fn.kind, "piecewiseLinear", `${where}: params fn kind`);
    checkEqual(JSON.stringify(fn.points), JSON.stringify(pts), `${where}: params points match`);
  }

  const sub = (label: string) => frq.subparts.find((s) => s.label === label)!;

  // (a) f(pb) − f(pa), parsed from the prompt, recomputed from points alone
  {
    const m = sub("a").prompt.match(new RegExp(`f\\((${NUM})\\) − f\\((${NUM})\\)`));
    check(!!m, `${where}(a): prompt parses`);
    if (m) {
      const val = indepNetArea(pts, parseFrac(m[2]), parseFrac(m[1]));
      checkClose(parseAnswerNumber(sub("a").answer), val, 1e-9, `${where}(a): net area from points`);
    }
  }
  // (b) relative extremum from the sign change
  {
    const changes = indepSignChanges(pts);
    check(changes.length >= 1, `${where}(b): sign change exists`);
    if (changes.length >= 1) {
      const wantMax = sub("b").prompt.includes("maximum");
      checkEqual(changes[0].dir, wantMax ? "+to-" : "-to+", `${where}(b): extremum direction`);
      const m = sub("b").answer.match(new RegExp(`x = (${NUM})`));
      check(!!m, `${where}(b): answer parses`);
      if (m) checkClose(parseFrac(m[1]), changes[0].x, 1e-9, `${where}(b): extremum x from points`);
    }
  }
  // (c) concave-up intervals from increasing runs
  {
    const up = indepIncreasing(pts);
    const uni = (s: string) => s.replace(/-/g, "−");
    const want = up.map(([a, c]) => uni(`(${a}, ${c})`)).join(" and ");
    checkEqual(sub("c").answer, want, `${where}(c): concave-up intervals`);
  }
  // (d) accumulation from the given value, parsed from prompt
  {
    const m = sub("d").prompt.match(new RegExp(`f\\((${NUM})\\) = (${NUM}).*find f\\((${NUM})\\)`));
    check(!!m, `${where}(d): prompt parses`);
    if (m) {
      const val = parseFrac(m[2]) + indepNetArea(pts, parseFrac(m[1]), parseFrac(m[3]));
      checkClose(parseAnswerNumber(sub("d").answer), val, 1e-9, `${where}(d): accumulation from points`);
    }
  }
}

function checkTableFRQ(b: FRQBuild, where: string): void {
  const { frq, verify } = b;
  const st = frq.stimulus;
  check(st.kind === "table", `${where}: stimulus is table`);
  if (st.kind !== "table") return;
  const times = verify.t!;
  const shown: number[] = st.rows.map((r) => parseFloat(r[1]));

  // cells match the function via independent re-evaluation
  times.forEach((t, i) => {
    const recomputed = indepEval(verify.fn!, t);
    checkEqual(shown[i].toFixed(1), recomputed.toFixed(1), `${where}: table cell t=${t}`);
  });

  const sub = (label: string) => frq.subparts.find((s) => s.label === label)!;
  // (a) left Riemann sum from the DISPLAYED cells alone
  checkClose(parseAnswerNumber(sub("a").answer), 3 * (shown[0] + shown[1] + shown[2] + shown[3]), 1e-9, `${where}(a): left sum from cells`);
  // (b) monotonicity visible in the table alone
  const increasing = shown.every((v, i) => i === 0 || v > shown[i - 1]);
  check(increasing, `${where}(b): table strictly increasing`);
  checkEqual(sub("b").answer, "Underestimate", `${where}(b): underestimate`);
  // (c) average rate of change from the cells alone
  checkClose(parseAnswerNumber(sub("c").answer), (shown[4] - shown[0]) / 12, 5e-4, `${where}(c): avg rate from cells`);
  // (d) net change from (a) and the drain rate in the prompt
  {
    const m = sub("d").prompt.match(/constant rate of (\d+) gallons/);
    check(!!m, `${where}(d): drain rate parses`);
    if (m) {
      const left = 3 * (shown[0] + shown[1] + shown[2] + shown[3]);
      checkClose(parseAnswerNumber(sub("d").answer), left - 12 * parseInt(m[1], 10), 1e-9, `${where}(d): net from cells`);
    }
  }
}

function checkScenarioFRQ(b: FRQBuild, where: string): void {
  const { frq, verify } = b;
  const d = verify.data!;
  const r1 = d.r1 as number;
  const r2 = d.r2 as number;
  const x0 = d.x0 as number;
  const s = r1 + r2;
  const p = r1 * r2;
  const st = frq.stimulus;
  check(st.kind === "scenario", `${where}: stimulus is scenario`);
  if (st.kind === "scenario") {
    check(st.text.includes(`x(0) = ${x0}`), `${where}: stimulus gives x(0)`);
    check(st.text.includes("v(t)"), `${where}: stimulus gives v(t)`);
  }
  // independent antiderivative of v(t) = -(t-r1)(t-r2)
  const F = (t: number) => -(t ** 3) / 3 + (s * t * t) / 2 - p * t;
  const sub = (label: string) => frq.subparts.find((s2) => s2.label === label)!;
  // (a) a(t) = -2t + s
  checkEqual(sub("a").answer, `a(t) = ${s > 0 ? `−2t + ${s}` : `−2t − ${-s}`}`, `${where}(a): acceleration`);
  // (b) at rest at the roots
  checkEqual(sub("b").answer, `t = ${r1} and t = ${r2}`, `${where}(b): rest times`);
  // (c) x(3) from net change
  checkClose(parseAnswerNumber(sub("c").answer), x0 + (F(3) - F(0)), 1e-9, `${where}(c): position`);
  // (d) total distance = integral of |v|
  const total = Math.abs(F(r1) - F(0)) + Math.abs(F(r2) - F(r1)) + Math.abs(F(6) - F(r2));
  checkClose(parseAnswerNumber(sub("d").answer), total, 1e-3, `${where}(d): total distance`);
}

export function runFRQ(): void {
  reset();
  const counts = { graph: 0, table: 0, scenario: 0 };
  for (let seed = 0; seed < SEEDS; seed++) {
    const rng = mulberry32(31000 + seed * 17);
    let b: FRQBuild;
    try {
      b = buildCalculusFRQ(rng);
    } catch (e) {
      check(false, `frq#${seed}: threw ${(e as Error).message}`);
      continue;
    }
    const where = `frq#${seed}`;
    const errs = validateFRQ(b.frq);
    check(errs.length === 0, `${where}: validateFRQ clean (${errs.join("; ")})`);
    checkEqual(b.frq.subject, "calc", `${where}: subject calc`);
    check(b.frq.subparts.length >= 2 && b.frq.subparts.length <= 4, `${where}: 2-4 subparts`);
    for (const sp of b.frq.subparts) {
      check(!!sp.justification && sp.justification.trim().length > 0, `${where}(${sp.label}): justification present`);
      check(sp.prompt.trim().length > 0 && sp.answer.trim().length > 0, `${where}(${sp.label}): prompt+answer non-empty`);
    }
    // reproducibility: same seed -> identical FRQ
    const b2 = buildCalculusFRQ(mulberry32(31000 + seed * 17));
    checkEqual(JSON.stringify(b.frq), JSON.stringify(b2.frq), `${where}: reproducible`);

    if (b.verify.kind === "frq-graph") { counts.graph++; checkGraphFRQ(b, where); }
    else if (b.verify.kind === "frq-table") { counts.table++; checkTableFRQ(b, where); }
    else { counts.scenario++; checkScenarioFRQ(b, where); }
  }
  check(counts.graph > 50 && counts.table > 50 && counts.scenario > 50,
    `all three templates covered: ${JSON.stringify(counts)}`);
}

// standalone
if (require.main === module) {
  runFRQ();
  const s = stats();
  console.log(`frq: ${s.checks} checks, ${s.failures.length} failures`);
  for (const f of s.failures.slice(0, 20)) console.log("  FAIL:", f);
  process.exit(s.failures.length > 0 ? 1 : 0);
}

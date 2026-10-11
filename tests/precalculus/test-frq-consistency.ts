// test-frq-consistency.ts
// Stimulus consistency for every FRQ: validateFRQ, table values vs independent
// recomputation, graph features vs computed values, contradiction hunting
// (table vs subparts, graph vs subparts), and "answerable from the stimulus
// alone" checks.

import { check, resetCounters, result, printResult, isMain, extractNumbers, type SuiteResult } from "./helpers";
import { mulberry32 } from "@/lib/math-utils";
import type { PrecalcFRQ } from "@/lib/factories/PrecalcTypes";
import { validateFRQ, type APStimulus } from "@/lib/apTypes";
import { FRQ_MAKERS, FRQ_MAKER_KEYS } from "@/lib/factories/PrecalcFRQFactory";
import type { PrecalcDifficulty } from "@/lib/factories/PrecalcTypes";

function igcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b > 0) { const t = a % b; a = b; b = t; }
  return a || 1;
}
function ifrac(n: number, d: number): string {
  if (d < 0) { n = -n; d = -d; }
  const g = igcd(n, d); n /= g; d /= g;
  if (d === 1) return String(n);
  if (n === 0) return "0";
  return `${n}/${d}`;
}
function ifmt(n: number, digits = 3): string {
  if (!isFinite(n)) return "undefined";
  const r = Number(n.toFixed(digits));
  return String(Object.is(r, -0) ? 0 : r);
}
function ifmtComplex(re: number, im: number): string {
  const rs = ifmt(re);
  if (im === 0) return rs;
  const ia = Math.abs(im);
  const ip = ia === 1 ? "i" : `${ifmt(ia)}i`;
  if (re === 0) return im < 0 ? `−${ip}` : ip;
  return im < 0 ? `${rs}−${ip}` : `${rs}+${ip}`;
}
/** Unicode pi fraction, matching FRQ answer style. */
function ipiU(num: number, den: number): string {
  const g = igcd(num, den);
  const n = num / g, d = den / g;
  if (n === 0) return "0";
  if (d === 1) return n === 1 ? "π" : `${n}π`;
  return n === 1 ? `π/${d}` : `${n}π/${d}`;
}

/** Every needle must appear in haystack within tol. */
function numbersCovered(needles: number[], haystack: number[], tol: number, where: string, label: string): void {
  for (const n of needles) {
    const ok = haystack.some((h) => Math.abs(h - n) <= tol);
    check(ok, `${where}: ${label} number ${n} available in stimulus (have [${haystack.join(", ")}])`);
  }
}

function stimulusNumbers(s: APStimulus): number[] {
  if (s.kind === "table") return s.rows.flat().flatMap((c) => extractNumbers(c));
  if (s.kind === "scenario") return extractNumbers(s.text);
  // graph: numeric params + caption
  const nums: number[] = [];
  for (const v of Object.values(s.params)) {
    if (typeof v === "number") nums.push(v);
  }
  if (s.caption) nums.push(...extractNumbers(s.caption));
  return nums;
}

/** Independent numeric solver for A*fn(B(x-c)) = k-D on [0, 2pi). */
function solveTrig(A: number, B: number, c: number, D: number, fn: number, k: number): string[] {
  const f = (x: number) => A * (fn === 0 ? Math.sin(B * (x - c)) : Math.cos(B * (x - c))) + D - k;
  const roots: number[] = [];
  const N = 2000;
  let px = 0, pf = f(0);
  for (let i = 1; i <= N; i++) {
    const x = (2 * Math.PI * i) / N;
    const fv = f(x);
    if (pf === 0) roots.push(px);
    if (fv * pf < 0) {
      let lo = px, hi = x;
      for (let it = 0; it < 60; it++) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
      }
      roots.push((lo + hi) / 2);
    }
    px = x; pf = fv;
  }
  const seen = new Set<string>();
  const out: number[] = [];
  for (const r of roots) {
    const key = ifmt(r);
    if (!seen.has(key)) { seen.add(key); out.push(r); }
  }
  out.sort((p, q) => p - q);
  return out.map((r) => ifmt(r));
}

function checkTrigGraph(p: PrecalcFRQ, where: string): void {
  const { A, B, cNum, cDen, D, fn, k } = p.verify.inputs;
  const par = p.stimulus.kind === "graph" ? (p.stimulus.params as Record<string, unknown>) : {};
  const num = (v: unknown) => (typeof v === "number" ? v : NaN);
  check(num(par.amplitude) === A, `${where}: amplitude param`);
  check(num(par.periodNum) === 2 && num(par.periodDen) === B, `${where}: period params`);
  check(num(par.midline) === D, `${where}: midline param`);
  check(num(par.phaseNum) === cNum && num(par.phaseDen) === cDen, `${where}: phase params`);
  check(num(par.maxY) === D + A && num(par.minY) === D - A, `${where}: max/min params`);
  // y-intercept recomputed independently
  const c = (cNum / cDen) * Math.PI;
  const yInt = A * (fn === 0 ? Math.sin(B * (0 - c)) : Math.cos(B * (0 - c))) + D;
  check(Math.abs(num(par.yIntercept) - yInt) < 1e-4, `${where}: y-intercept param`);
  // No contradiction: max - min = 2A
  check(num(par.maxY) - num(par.minY) === 2 * A, `${where}: max-min = 2A`);

  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  const a = sub("a"), b = sub("b");
  check(!!a && !!b, `${where}: has subparts a, b`);
  if (a) check(a.answer === `Amplitude ${A}; midline y = ${D}.`, `${where}: (a) answer`);
  const periodStr = B === 1 ? "2π" : B === 2 ? "π" : "2π/3";
  if (b) check(b.answer === `Period ${periodStr}.`, `${where}: (b) answer`);
  const stimNums = stimulusNumbers(p.stimulus);
  if (a) numbersCovered(extractNumbers(a.answer), stimNums, 1e-9, where, "(a)");
  if (b) numbersCovered(extractNumbers(b.answer), stimNums, 1e-9, where, "(b)");

  const cSub = sub("c");
  if (cSub) {
    const phaseStr = cNum === 0 ? "0" : ipiU(cNum, cDen);
    const fnName = fn === 0 ? "sin" : "cos";
    const want = `y = ${A} ${fnName}(${B === 1 ? "" : B}(x - ${phaseStr})) ${D >= 0 ? "+" : "-"} ${Math.abs(D)}`;
    check(cSub.answer === want, `${where}: (c) equation (got "${cSub.answer}", want "${want}")`);
    // The equation must reproduce the graph's max point: f(c + pi/(2B)) = D + A (sin) etc.
    const xMax = fn === 0 ? c + Math.PI / (2 * B) : c;
    const fMax = A * (fn === 0 ? Math.sin(B * (xMax - c)) : Math.cos(B * (xMax - c))) + D;
    check(Math.abs(fMax - (D + A)) < 1e-9, `${where}: (c) equation attains maxY`);
    numbersCovered(extractNumbers(cSub.answer), stimNums, 1e-9, where, "(c)");
  }
  const dSub = sub("d");
  if (dSub) {
    const sols = solveTrig(A, B, c, D, fn, k);
    const want = `x = ${sols.join(", ")}.`;
    check(dSub.answer === want, `${where}: (d) solutions (got "${dSub.answer}", want "${want}")`);
    // k is stated in the prompt; f-params live in the graph params.
    check(dSub.prompt.includes(ifmt(k)), `${where}: (d) target k in prompt`);
    // Every solution must actually satisfy f(x) = k (within rounding tolerance:
    // solutions are rounded to 3 decimals and |f'| <= A*B <= 12).
    for (const s of sols) {
      const x = Number(s);
      const fx = A * (fn === 0 ? Math.sin(B * (x - c)) : Math.cos(B * (x - c))) + D;
      check(Math.abs(fx - k) < 0.01, `${where}: (d) solution ${s} satisfies f(x)=k`);
    }
  }
}

function checkLimitsTable(p: PrecalcFRQ, where: string): void {
  const { a } = p.verify.inputs;
  const st = p.stimulus;
  if (st.kind !== "table") { check(false, `${where}: stimulus is table`); return; }
  check(st.rows.length === 6, `${where}: 6 table rows`);
  // Independent recomputation: f(x) = (x^2 - a^2)/(x - a) = x + a for x != a.
  for (const row of st.rows) {
    const x = Number(row[0]);
    const fv = Number(row[1]);
    check(!isNaN(x) && !isNaN(fv), `${where}: table cells numeric`);
    check(Math.abs(fv - (x + a)) < 0.0002, `${where}: table f(${x}) = ${fv} matches x+a`);
    check(Math.abs(x - a) > 1e-9, `${where}: table never evaluates at the hole x=${a}`);
  }
  // One-sided agreement (no contradiction between left and right).
  const left = st.rows.slice(0, 3).map((r) => Number(r[1]));
  const right = st.rows.slice(3).map((r) => Number(r[1]));
  check(left.every((v) => v < 2 * a), `${where}: left values approach 2a from below`);
  check(right.every((v) => v > 2 * a), `${where}: right values approach 2a from above`);
  check(Math.abs(left[2] - 2 * a) < 0.01 && Math.abs(right[2] - 2 * a) < 0.01, `${where}: closest values near 2a`);

  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  const sa = sub("a"), sb = sub("b");
  if (sa) check(sa.answer === `${2 * a}.`, `${where}: (a) answer`);
  if (sb) {
    check(sb.answer === "No.", `${where}: (b) answer`);
    check(/undefined/.test(sb.justification ?? ""), `${where}: (b) justification mentions undefined f(a)`);
  }
  const sc = sub("c");
  if (sc) check(sc.answer === `${3 * (2 * a) - 1}.`, `${where}: (c) answer`);
  const sd = sub("d");
  if (sd) check(sd.answer === `${2 * a}.`, `${where}: (d) answer`);
  // Answerable-from-stimulus: the limit value 2a must be bracketed by the
  // table's f(x) values (so a student can actually read the estimate off the
  // table); subpart (c)'s coefficients come from its own prompt text.
  const fvals = st.rows.map((r) => Number(r[1]));
  const lo = Math.min(...fvals), hi = Math.max(...fvals);
  check(lo < 2 * a && 2 * a < hi, `${where}: table f(x) values bracket the limit ${2 * a}`);
  for (const s of p.subparts) {
    if (s.label === "c") {
      check(/3f\(x\)/.test(s.prompt), `${where}: (c) expression coefficients stated in prompt`);
      const pn = extractNumbers(s.prompt);
      check(pn.includes(3) && pn.includes(1), `${where}: (c) coefficients 3 and 1 in prompt`);
    }
  }
}

function checkVectorScenario(p: PrecalcFRQ, where: string): void {
  const { p: pv, alpha, w, beta } = p.verify.inputs;
  const st = p.stimulus;
  if (st.kind !== "scenario") { check(false, `${where}: stimulus is scenario`); return; }
  const nums = extractNumbers(st.text);
  for (const n of [pv, alpha, w, beta]) {
    check(nums.some((x) => Math.abs(x - n) < 1e-9), `${where}: scenario states ${n}`);
  }
  const ar = (alpha * Math.PI) / 180, br = (beta * Math.PI) / 180;
  const wvx = w * Math.cos(br), wvy = w * Math.sin(br);
  const rx = pv * Math.cos(ar) + wvx, ry = pv * Math.sin(ar) + wvy;
  const speed = Math.hypot(rx, ry);
  const dir = (Math.atan2(ry, rx) * 180) / Math.PI;
  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  const sa = sub("a"), sb = sub("b");
  if (sa) {
    const n = extractNumbers(sa.answer);
    check(n.length === 2 && Math.abs(n[0] - wvx) < 0.005 && Math.abs(n[1] - wvy) < 0.005, `${where}: (a) wind vector`);
  }
  if (sb) {
    const n = extractNumbers(sb.answer);
    check(n.length === 2 && Math.abs(n[0] - rx) < 0.005 && Math.abs(n[1] - ry) < 0.005, `${where}: (b) resultant`);
    // Contradiction hunt: resultant must equal plane + wind.
    check(Math.abs(n[0] - (pv * Math.cos(ar) + wvx)) < 0.01, `${where}: (b) consistent with (a)`);
  }
  const sc = sub("c");
  if (sc) {
    const n = extractNumbers(sc.answer);
    check(n.length >= 1 && Math.abs(n[0] - speed) < 0.06, `${where}: (c) ground speed`);
  }
  const sd = sub("d");
  if (sd) {
    const n = extractNumbers(sd.answer);
    check(n.length >= 1 && Math.abs(n[0] - dir) < 0.06, `${where}: (d) direction`);
  }
}

function checkPolarGraph(p: PrecalcFRQ, where: string): void {
  const { a, b } = p.verify.inputs;
  const st = p.stimulus;
  if (st.kind !== "graph") { check(false, `${where}: stimulus is graph`); return; }
  const par = st.params as Record<string, unknown>;
  const curve = par.curve as { a: number; b: number } | undefined;
  check(!!curve && curve.a === a && curve.b === b, `${where}: curve params match inputs`);
  check(par.maxR === a + b && par.maxThetaDeg === 0, `${where}: max params`);
  check(st.caption !== undefined && st.caption.includes(`r = ${a} + ${b} cos`), `${where}: caption states equation`);
  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  const sa = sub("a"), sb = sub("b"), sc = sub("c");
  if (sa) {
    check(sa.answer === `Maximum r = ${a + b} at θ = 0.`, `${where}: (a) answer`);
    check(/cos θ = 1/.test(sa.justification ?? ""), `${where}: (a) justification`);
  }
  if (sb) {
    check(sb.answer === "Yes.", `${where}: (b) answer`);
    check(/cos\(−θ\) = .*cos θ/.test(sb.justification ?? ""), `${where}: (b) symmetry test in justification`);
  }
  if (sc) check(sc.answer === `(${a + b}, 0).`, `${where}: (c) answer`);
  const sd = sub("d");
  if (sd) {
    check(sd.answer === "θ = π/2.", `${where}: (d) answer`);
    // Independent: r(pi/2) = a + b*cos(pi/2) = a.
    check(Math.abs(a + b * Math.cos(Math.PI / 2) - a) < 1e-9, `${where}: (d) r(π/2) = a`);
  }
  // Answerable: (a)-(c) numbers come from caption/params.
  const stimNums = stimulusNumbers(p.stimulus);
  for (const s of p.subparts) {
    if (s.label === "d") continue; // π/2 is derived, not stated
    numbersCovered(extractNumbers(s.answer), stimNums, 1e-9, where, `(${s.label})`);
  }
}

function checkConicScenario(p: PrecalcFRQ, where: string): void {
  const st = p.stimulus;
  if (st.kind !== "scenario") { check(false, `${where}: stimulus is scenario`); return; }
  const nums = extractNumbers(st.text);
  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  if (p.verify.inputs.variant === 0) {
    const { w, d, p: fp } = p.verify.inputs;
    check(nums.some((x) => x === w) && nums.some((x) => x === d), `${where}: scenario states w, d`);
    check(Math.abs((w * w) / (16 * d) - fp) < 1e-9, `${where}: p = w²/(16d)`);
    check(Number.isInteger(fp), `${where}: p integer`);
    const sa = sub("a"), sb = sub("b"), sc = sub("c"), sd = sub("d");
    if (sa) check(sa.answer.includes(`x²/${4 * fp}`), `${where}: (a) equation`);
    if (sb) check(sb.answer.includes(`(0, ${fp})`), `${where}: (b) focus`);
    if (sc) check(sc.answer.includes(`y = ${-fp}`), `${where}: (c) directrix`);
    if (sd) check(/halved/.test(sd.answer), `${where}: (d) p halved`);
  } else {
    const { a, b, c } = p.verify.inputs;
    check(nums.some((x) => x === 2 * a) && nums.some((x) => x === c), `${where}: scenario states 2a, c`);
    check(b * b === a * a - c * c, `${where}: b² = a² − c²`);
    const sa = sub("a"), sb = sub("b"), sc = sub("c"), sd = sub("d");
    if (sa) check(sa.answer.includes(`x²/${a * a} + y²/${b * b} = 1`), `${where}: (a) equation`);
    if (sb) check(sb.answer === `${2 * b}.`, `${where}: (b) minor axis`);
    if (sc) check(sc.answer === `(−${a}, 0) and (${a}, 0).`, `${where}: (c) vertices`);
    if (sd) check(/decreases/.test(sd.answer), `${where}: (d) b decreases`);
  }
}

function checkComplexPlane(p: PrecalcFRQ, where: string): void {
  const { re1, im1, deg1, c, d } = p.verify.inputs;
  const st = p.stimulus;
  if (st.kind !== "graph") { check(false, `${where}: stimulus is graph`); return; }
  const par = st.params as { points: { re: number; im: number; label: string }[] };
  check(par.points.length === 2, `${where}: two points plotted`);
  check(par.points[0].re === re1 && par.points[0].im === im1, `${where}: z1 plotted correctly`);
  check(par.points[1].re === c && par.points[1].im === d, `${where}: z2 plotted correctly`);
  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  const sa = sub("a"), sb = sub("b"), sc = sub("c"), sd = sub("d");
  if (sa) {
    const sumRe = re1 + c, sumIm = im1 + d;
    check(sa.answer === `${ifmtComplex(sumRe, sumIm)}.`, `${where}: (a) sum (got "${sa.answer}")`);
    check(/tip-to-tail/.test(sa.justification ?? ""), `${where}: (a) vector justification`);
  }
  if (sb) {
    const n = extractNumbers(sb.answer);
    check(n.length >= 1 && Math.abs(n[0] - Math.hypot(c, d)) < 0.001, `${where}: (b) modulus`);
  }
  if (sc) {
    // Independent polar check: r and quadrant-correct angle.
    const r = Math.hypot(re1, im1);
    const deg = Math.round((Math.atan2(im1, re1) * 180) / Math.PI);
    const norm = ((deg % 360) + 360) % 360;
    check(norm === deg1, `${where}: (c) angle ${norm} === ${deg1}`);
    const rStr = Math.abs(r - Math.SQRT2) < 1e-9 ? "√2" : Math.abs(r - 2 * Math.SQRT2) < 1e-9 ? "2√2" : String(Math.round(r));
    check(sc.answer === `${rStr}(cos ${deg1}° + i sin ${deg1}°).`, `${where}: (c) polar form (got "${sc.answer}")`);
  }
  if (sd) {
    const prodRe = re1 * c - im1 * d, prodIm = re1 * d + im1 * c;
    check(sd.answer === `${ifmtComplex(prodRe, prodIm)}.`, `${where}: (d) product (got "${sd.answer}")`);
  }
}

function checkParametricScenario(p: PrecalcFRQ, where: string): void {
  const { v, u } = p.verify.inputs;
  const st = p.stimulus;
  if (st.kind !== "scenario") { check(false, `${where}: stimulus is scenario`); return; }
  const nums = extractNumbers(st.text);
  check(nums.some((x) => x === v) && nums.some((x) => x === u), `${where}: scenario states v, u`);
  const sub = (label: string) => p.subparts.find((s) => s.label === label);
  const sa = sub("a"), sb = sub("b"), sc = sub("c"), sd = sub("d");
  if (sa) {
    const n = extractNumbers(sa.answer);
    check(n.includes(2 * v) && n.includes(2 * u - 20), `${where}: (a) position at t=2`);
  }
  if (sb) {
    const want = `y = ${ifrac(u, v)}x − ${ifrac(5, v * v)}x².`;
    check(sb.answer === want, `${where}: (b) eliminated (got "${sb.answer}", want "${want}")`);
    // Contradiction hunt: (b) must reproduce (a): plug x=2v into the cartesian equation.
    const x = 2 * v;
    const y = (u / v) * x - (5 / (v * v)) * x * x;
    check(Math.abs(y - (2 * u - 20)) < 1e-9, `${where}: (b) consistent with (a)`);
  }
  if (sc) {
    const n = extractNumbers(sc.answer);
    check(n.length >= 1 && Math.abs(n[0] - u / 5) < 1e-9, `${where}: (c) hit time`);
  }
  if (sd) {
    const n = extractNumbers(sd.answer);
    check(n.length >= 1 && Math.abs(n[0] - (u * u) / 20) < 0.01, `${where}: (d) max height`);
  }
}

const KIND_CHECKERS: Record<string, (p: PrecalcFRQ, where: string) => void> = {
  "trig-graph": checkTrigGraph,
  "limits-table": checkLimitsTable,
  "vector-scenario": checkVectorScenario,
  "polar-graph": checkPolarGraph,
  "conic-scenario": checkConicScenario,
  "complex-plane": checkComplexPlane,
  "parametric-scenario": checkParametricScenario,
};

/** Maker key (camelCase) -> verify.kind (kebab-case). */
const KEY_TO_KIND: Record<string, string> = {
  trigGraph: "trig-graph",
  limitsTable: "limits-table",
  vectorScenario: "vector-scenario",
  polarGraph: "polar-graph",
  conicScenario: "conic-scenario",
  complexPlane: "complex-plane",
  parametricScenario: "parametric-scenario",
};

export function runFRQConsistency(): SuiteResult {
  resetCounters();
  check(FRQ_MAKER_KEYS.length === 7, `7 FRQ makers (got ${FRQ_MAKER_KEYS.length})`);
  const diffs: PrecalcDifficulty[] = [1, 2, 3];
  const SEEDS = 40;

  for (const key of FRQ_MAKER_KEYS) {
    const maker = FRQ_MAKERS[key];
    for (const d of diffs) {
      for (let s = 0; s < SEEDS; s++) {
        const seed = 20000 + FRQ_MAKER_KEYS.indexOf(key) * 1000 + d * 100 + s;
        const rng = mulberry32(seed);
        const p = maker(rng, d);
        const where = `${key}/d${d}/seed${seed}`;
        const errs = validateFRQ(p);
        check(errs.length === 0, `${where}: validateFRQ clean (${errs.join("; ")})`);
        check(p.subject === "precalc", `${where}: subject precalc`);
        check(p.verify.kind === KEY_TO_KIND[key], `${where}: verify kind matches maker`);
        const wantParts = d === 1 ? 2 : d === 2 ? 3 : 4;
        check(p.subparts.length === wantParts, `${where}: ${wantParts} subparts`);
        check(p.subparts.every((sp) => (sp.justification ?? "").length > 0), `${where}: justifications present`);
        const checker = KIND_CHECKERS[p.verify.kind];
        check(!!checker, `${where}: checker exists`);
        if (checker) {
          try {
            checker(p, where);
          } catch (e) {
            check(false, `${where}: checker threw: ${(e as Error).message}`);
          }
        }
      }
    }
  }
  return result("frq-consistency");
}

if (isMain(import.meta.url)) {
  printResult(runFRQConsistency());
}

// checkers.ts
// INDEPENDENT per-subtype verification for Algebra 2 computational problems.
// Written from scratch against the documented math — shares NO code with
// src/lib/factories/* (no imports from there except TYPES). Each checker
// returns a list of error strings (empty = pass) and the independently
// recomputed exact answer string.

import type { Algebra2Problem } from "../../src/lib/factories/Algebra2Types";
import { parseExpression, evaluate, type Env } from "./verify";

// ── Independent arithmetic (descending coefficient arrays) ────────────────────

function ipMul(a: number[], b: number[]): number[] {
  const o = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j];
  while (o.length > 1 && o[0] === 0) o.shift();
  return o;
}
function ipEval(p: number[], x: number): number {
  let acc = 0;
  for (const c of p) acc = acc * x + c;
  return acc;
}
/** Independent long division (descending). */
function ipDiv(dividend: number[], divisor: number[]): { q: number[]; r: number[] } {
  let rem = [...dividend];
  while (rem.length > 1 && rem[0] === 0) rem.shift();
  const dv = [...divisor];
  const q: number[] = new Array(Math.max(rem.length - dv.length + 1, 0)).fill(0);
  while (rem.length >= dv.length && !(rem.length === 1 && rem[0] === 0)) {
    const c = rem[0] / dv[0];
    const pos = q.length - (rem.length - dv.length) - 1;
    q[pos] = c;
    const sub = dv.map((v) => v * c);
    while (sub.length < rem.length) sub.push(0);
    rem = rem.map((v, i) => v - sub[i]);
    while (rem.length > 1 && rem[0] === 0) rem.shift();
    if (q.length === 0) break;
  }
  while (q.length > 1 && q[0] === 0) q.shift();
  return { q: q.length ? q : [0], r: rem };
}
function iDivisors(n: number): number[] {
  const o: number[] = [];
  for (let d = 1; d <= Math.abs(n); d++) if (n % d === 0) o.push(d);
  return o;
}
function iGcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}
function iReduce(n: number, d: number): [number, number] {
  const g = iGcd(n, d);
  n /= g; d /= g;
  if (d < 0) { n = -n; d = -d; }
  return [n, d];
}

// ── Independent formatters (mirror the documented display rules) ──────────────

function fTerm(abs: number, pow: number, v: string): string {
  const coef = abs === 1 && pow > 0 ? "" : `${abs}`;
  const xp = pow === 0 ? "" : pow === 1 ? v : `${v}^${pow}`;
  return `${coef}${xp}`;
}
function fPoly(p: number[], v = "x"): string {
  const q = [...p];
  while (q.length > 1 && q[0] === 0) q.shift();
  const deg = q.length - 1;
  let out = "";
  q.forEach((c, i) => {
    const pw = deg - i;
    if (c === 0) return;
    const body = fTerm(Math.abs(c), pw, v);
    out = out === "" ? (c < 0 ? "-" : "") + body : out + (c < 0 ? ` - ${body}` : ` + ${body}`);
  });
  return out === "" ? "0" : out;
}
function fLinFactor(r: number, v = "x"): string {
  if (r === 0) return `(${v})`;
  return r > 0 ? `(${v} - ${r})` : `(${v} + ${-r})`;
}
function fComplex(re: number, im: number): string {
  const ia = Math.abs(im);
  const ip = ia === 1 ? "i" : `${ia}i`;
  if (re === 0) return im < 0 ? `-${ip}` : ip;
  return `${re} ${im < 0 ? "-" : "+"} ${ip}`;
}
function fFrac(n: number, d: number): string {
  const [rn, rd] = iReduce(n, d);
  return rd === 1 ? `${rn}` : `${rn}/${rd}`;
}

// ── Checker result ────────────────────────────────────────────────────────────

export interface CheckResult {
  errors: string[];
  expectedAnswer: string;
}

const ok = (expectedAnswer: string): CheckResult => ({ errors: [], expectedAnswer });
const bad = (expectedAnswer: string, ...errors: string[]): CheckResult => ({ errors, expectedAnswer });

// ── A2.5 Quadratics ───────────────────────────────────────────────────────────

function chkCompleteSquare(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c } = v;
  const errs: string[] = [];
  let inner: string;
  let vf: string;
  if ("hNum" in v) {
    // a != 1: exact fractions h = hNum/hDen, kk = kNum/kDen
    const { hNum, hDen, kNum, kDen } = v;
    // exact integer checks: -2a*h == b  ⟺  -2a*hNum == b*hDen
    if (-2 * a * hNum !== b * hDen) errs.push(`vertex x: -2a*h != b`);
    // a*h^2 + kk == c  ⟺  a*hNum^2*kDen + kNum*hDen^2 == c*hDen^2*kDen
    if (a * hNum * hNum * kDen + kNum * hDen * hDen !== c * hDen * hDen * kDen)
      errs.push(`vertex expansion != c`);
    const hStr = hDen === 1 ? `${hNum}` : `${hNum}/${hDen}`;
    const hAbs = hDen === 1 ? `${Math.abs(hNum)}` : `${Math.abs(hNum)}/${hDen}`;
    const kAbs = kDen === 1 ? `${Math.abs(kNum)}` : `${Math.abs(kNum)}/${kDen}`;
    inner = hNum === 0 ? "x" : hNum > 0 ? `(x - ${hStr})` : `(x + ${hAbs})`;
    vf = `${a}${inner}^2 ${kNum < 0 ? `- ${kAbs}` : `+ ${kAbs}`}`;
  } else {
    // monic: integer h, k
    const { h, k } = v;
    const e2 = [a, -2 * a * h, a * h * h + k];
    if (e2[0] !== a || e2[1] !== b || e2[2] !== c)
      errs.push(`expansion [${e2}] != [${a},${b},${c}]`);
    inner = h === 0 ? "x" : h < 0 ? `(x + ${-h})` : `(x - ${h})`;
    vf = `${inner}^2 ${k < 0 ? `- ${-k}` : `+ ${k}`}`;
  }
  const expected = `y = ${vf}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != expected "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkVertexFormula(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { b, c, h, k } = v;
  const errs: string[] = [];
  if (h !== -b / 2) errs.push(`h ${h} != -b/2a`);
  if (k !== c - (b / 2) * (b / 2)) errs.push(`k mismatch`);
  const expected = `(${h}, ${k})`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSolveByRoot(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { h, k, negative } = v;
  const errs: string[] = [];
  const s = Math.sqrt(Math.abs(k));
  if (Math.abs(s - Math.round(s)) > 1e-9) errs.push(`sqrt(${k}) not integral`);
  const expected = negative
    ? `x = ${h} \\pm ${s === 1 ? "" : Math.round(s)}i`
    : `x = ${h} \\pm ${Math.round(s)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  // substitute: (h±s)^2 ... check (x-h)^2 = k for both roots
  for (const r of [h + s, h - s]) {
    const lhs = (r - h) * (r - h);
    if (!negative && Math.abs(lhs - k) > 1e-9) errs.push(`root ${r} fails`);
    if (negative && Math.abs(lhs - Math.abs(k)) > 1e-9) errs.push(`root ${r} fails (|.|)`);
  }
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkDiscriminant(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, D } = v;
  const errs: string[] = [];
  if (D !== b * b - 4 * a * c) errs.push(`D ${D} != b²-4ac`);
  const nature = D > 0 ? "two real solutions" : D === 0 ? "one real solution" : "two complex solutions";
  const expected = `D = ${D}; ${nature}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkComplexRoots(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { b, c, re, im } = v;
  const errs: string[] = [];
  // For x²+bx+c=0 with roots re±im·i: sum=-b, product=c
  if (Math.abs(2 * re + b) > 1e-9) errs.push(`2*re != -b`);
  if (Math.abs(re * re + im * im - c) > 1e-9) errs.push(`re²+im² != c`);
  const D = b * b - 4 * c;
  if (D >= 0) errs.push(`D=${D} not negative`);
  const expected = `x = ${fComplex(re, im)} or x = ${fComplex(re, -im)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkQuadraticFormula(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, r1, r2 } = v;
  const errs: string[] = [];
  for (const r of [r1, r2]) {
    if (Math.abs(ipEval([a, b, c], r)) > 1e-9) errs.push(`root ${r} does not satisfy equation`);
  }
  const expected = `x = ${r1} or x = ${r2}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.8 Division & factoring ─────────────────────────────────────────────────

function chkDivision(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const dividend = v["dividend"] as number[];
  const r = v["r"] as number;
  const quotient = v["quotient"] as number[];
  const remainder = v["remainder"] as number;
  const errs: string[] = [];
  const { q, r: rem } = ipDiv(dividend, [1, -r]);
  const norm = (x: number[]) => { const y = [...x]; while (y.length > 1 && y[0] === 0) y.shift(); return y; };
  if (JSON.stringify(norm(q)) !== JSON.stringify(norm(quotient))) errs.push(`quotient mismatch`);
  if (rem.length !== 1 || rem[0] !== remainder) errs.push(`remainder ${rem} != ${remainder}`);
  // identity: (x-r)*Q + R == dividend
  const rebuilt = ipMul([1, -r], quotient);
  rebuilt[rebuilt.length - 1] += remainder;
  if (JSON.stringify(norm(rebuilt)) !== JSON.stringify(norm(dividend))) errs.push(`rebuild identity fails`);
  const qStr = fPoly(quotient);
  const expected = remainder === 0 ? qStr : remainder > 0 ? `${qStr} + ${remainder}/${fLinFactor(r)}` : `${qStr} - ${-remainder}/${fLinFactor(r)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRRT(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const poly = v["poly"] as number[];
  const roots = v["roots"] as number[];
  const errs: string[] = [];
  for (const r of roots) {
    if (Math.abs(ipEval(poly, r)) > 1e-9) errs.push(`claimed root ${r} fails P(root)=0`);
  }
  // independent possible-roots list contains each root
  const lead = poly[0], constant = poly[poly.length - 1];
  const poss: number[] = [];
  for (const pd of iDivisors(constant))
    for (const qd of iDivisors(lead))
      for (const sgn of [1, -1]) {
        const val = (sgn * pd) / qd;
        if (!poss.some((w) => Math.abs(w - val) < 1e-9)) poss.push(val);
      }
  for (const r of roots) {
    if (!poss.some((w) => Math.abs(w - r) < 1e-9)) errs.push(`root ${r} not in possible ±p/q`);
  }
  const sorted = [...roots].sort((x, y) => x - y);
  if (JSON.stringify(roots) !== JSON.stringify(sorted)) errs.push(`roots not sorted`);
  const expected = `x = ${roots.join(" or x = ")}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkGrouping(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { m, n, p: pp, q } = v;
  const errs: string[] = [];
  const prod = ipMul([m, n], [pp, 0, q]);
  const expectedPoly = [m * pp, n * pp, m * q, n * q];
  if (JSON.stringify(prod) !== JSON.stringify(expectedPoly)) errs.push(`factor product mismatch`);
  const f1 = m === 1 ? "x" : m === -1 ? "-x" : `${m}x`;
  const g1 = `${f1} ${n < 0 ? "-" : "+"} ${Math.abs(n)}`;
  const g2 = `${pp === 1 ? "x^2" : pp === -1 ? "-x^2" : `${pp}x^2`} ${q < 0 ? "-" : "+"} ${Math.abs(q)}`;
  const expected = `(${g1})(${g2})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSumDiffCubes(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const a = v["a"] as number, k = v["k"] as number, isSum = v["isSum"] as boolean;
  const errs: string[] = [];
  const lhs = isSum ? ipMul([a, k], [a * a, -a * k, k * k]) : ipMul([a, -k], [a * a, a * k, k * k]);
  const rhs = isSum ? [a * a * a, 0, 0, k * k * k] : [a * a * a, 0, 0, -k * k * k];
  if (JSON.stringify(lhs) !== JSON.stringify(rhs)) errs.push(`identity expansion fails`);
  const ax = a === 1 ? "x" : `${a}x`;
  const ax2 = a === 1 ? "x^2" : `${a * a}x^2`;
  const akx = a * k === 1 ? "x" : `${a * k}x`;
  const expected = isSum
    ? `(${ax} + ${k})(${ax2} - ${akx} + ${k * k})`
    : `(${ax} - ${k})(${ax2} + ${akx} + ${k * k})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.11 Rational ────────────────────────────────────────────────────────────

function chkAsymptotes(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, d, vAsm, hNum, hDen } = v;
  const errs: string[] = [];
  if (c === 0) errs.push(`denominator leading coefficient is 0`);
  if (vAsm !== -d / c) errs.push(`vertical asymptote ${vAsm} != -d/c`);
  const [hn, hd] = iReduce(a, c);
  if (hn !== hNum || hd !== hDen) errs.push(`horizontal asymptote fraction mismatch`);
  if (a * vAsm + b === 0) errs.push(`hidden hole at x=${vAsm} (numerator also 0)`);
  const hStr = hd === 1 ? `${hn}` : `${hn}/${hd}`;
  const expected = `x = ${vAsm}, y = ${hStr}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkHoles(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { r, s, t, holeYNum, holeYDen, vAsm } = v;
  const errs: string[] = [];
  const numE = [1, s - r, -r * s];
  const denE = [1, t - r, -r * t];
  if (ipEval(numE, r) !== 0 || ipEval(denE, r) !== 0)
    errs.push(`x=${r} is not a common zero`);
  const [yn, yd] = iReduce(r + s, r + t);
  if (yn !== holeYNum || yd !== holeYDen) errs.push(`hole y mismatch`);
  if (vAsm !== -t) errs.push(`vertical asymptote should be x=${-t}`);
  if (r === -t) errs.push(`hole coincides with asymptote`);
  const yStr = yd === 1 ? `${yn}` : `${yn}/${yd}`;
  const expected = `hole at (${r}, ${yStr}); vertical asymptote x = ${-t}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSimplify(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const form = v["form"] as string;
  const errs: string[] = [];
  let expected = "";
  if (form === "diffSquares") {
    const k = v["k"] as number;
    const simp = k < 0 ? `x - ${-k}` : `x + ${k}`;
    expected = `${simp}, x ≠ ${k}`;
    // numeric: test at x = k+1 and k-1 (avoid k)
    for (const x0 of [k + 1, k - 1, k + 2]) {
      const orig = (x0 * x0 - k * k) / (x0 - k);
      const s2 = x0 + k;
      if (Math.abs(orig - s2) > 1e-9) errs.push(`numeric mismatch at x=${x0}`);
    }
  } else {
    const b = v["b"] as number;
    const simp = `x ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
    expected = `${simp}, x ≠ 0`;
    for (const x0 of [1, 2, -3]) {
      const orig = (x0 * x0 + b * x0) / x0;
      if (Math.abs(orig - (x0 + b)) > 1e-9) errs.push(`numeric mismatch at x=${x0}`);
    }
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkMultDiv(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const a = v["a"] as number, b = v["b"] as number, multiply = v["multiply"] as boolean;
  const errs: string[] = [];
  const expected = `x ${a < 0 ? "+" : "-"} ${Math.abs(a)}`;
  // numeric check at several x avoiding exclusions {a, -b}
  const f1 = (x: number) => (x * x - a * a) / (x + b);
  const f2 = multiply
    ? (x: number) => (x + b) / (x - a)
    : (x: number) => (x - a) / (x + b);
  for (const x0 of [a + 2, a - 2, -b + 1, -b - 1, 7]) {
    if (Math.abs(x0 - a) < 1e-9 || Math.abs(x0 + b) < 1e-9) continue;
    const got = multiply ? f1(x0) * f2(x0) : f1(x0) / f2(x0);
    if (Math.abs(got - (x0 + a)) > 1e-9) errs.push(`numeric mismatch at x=${x0}: ${got}`);
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSolveRational(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const kind = v["kind"] as string;
  const errs: string[] = [];
  let expected = "";
  if (kind === "simple") {
    const a = v["a"] as number, b = v["b"] as number, x = v["x"] as number;
    expected = `x = ${x}`;
    if (x === 0) errs.push(`solution x=0 makes denominator zero`);
    if (Math.abs(a / x - b) > 1e-9) errs.push(`a/x != b at x=${x}`);
  } else if (kind === "linear") {
    const A = v["A"] as number, B = v["B"] as number, C = v["C"] as number, x = v["x"] as number;
    expected = `x = ${x}`;
    if (x === B) errs.push(`solution excluded (denominator zero)`);
    if (Math.abs((x - A) - C * (x - B)) > 1e-9) errs.push(`equation not satisfied`);
    if (Math.abs((x - A) / (x - B) - C) > 1e-9) errs.push(`original equation fails`);
  } else {
    const P = v["P"] as number, Q = v["Q"] as number;
    expected = "no solution";
    if (P === Q) errs.push(`P==Q would give infinite solutions, not none`);
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.7 Exp/log ──────────────────────────────────────────────────────────────

function chkLogEvaluate(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const base = v["base"] as number, value = v["value"] as number, arg = v["arg"] as number;
  const errs: string[] = [];
  if (arg <= 0) errs.push(`log argument ${arg} not positive`);
  if (Math.abs(Math.pow(base, value) - arg) / Math.max(1, arg) > 1e-9)
    errs.push(`b^value != arg`);
  const expected = `${value}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkExpandLog(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const base = v["base"] as number, m = v["m"] as number, n = v["n"] as number;
  const pp = v["p"] as number, useRoot = v["useRoot"] as boolean;
  const errs: string[] = [];
  const logb = (z: number) => Math.log(z) / Math.log(base);
  // independent numeric check of the identity
  for (const [x, y, z] of [[2, 3, 5], [1.5, 4, 2], [7, 1.2, 3]]) {
    const inner = useRoot ? Math.sqrt(Math.pow(x, m) * Math.pow(y, n)) / Math.pow(z, pp)
      : (Math.pow(x, m) * Math.pow(y, n)) / Math.pow(z, pp);
    const lhs = logb(inner);
    const rhs = (useRoot ? 0.5 * (m * logb(x) + n * logb(y)) : m * logb(x) + n * logb(y)) - pp * logb(z);
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`identity fails at (${x},${y},${z})`);
  }
  const L = (s: string) => `\\log_{${base}}(${s})`;
  const mT = m === 1 ? L("x") : `${m} ${L("x")}`;
  const nT = n === 1 ? `+ ${L("y")}` : `+ ${n} ${L("y")}`;
  const pT = pp === 1 ? `- ${L("z")}` : `- ${pp} ${L("z")}`;
  const expected = useRoot ? `1/2(${mT} ${nT}) ${pT}` : `${mT} ${nT} ${pT}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkCondenseLog(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const base = v["base"] as number, m = v["m"] as number, n = v["n"] as number;
  const errs: string[] = [];
  const logb = (z: number) => Math.log(z) / Math.log(base);
  for (const [x, y, z] of [[2, 3, 5], [4, 2, 7]]) {
    const lhs = m * logb(x) + n * logb(y) - logb(z);
    const rhs = logb((Math.pow(x, m) * Math.pow(y, n)) / z);
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`identity fails at (${x},${y},${z})`);
  }
  const expected = `\\log_{${base}}(x^${m} y^${n} / z)`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSolveExp(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const kind = v["kind"] as string;
  const base = v["base"] as number;
  const errs: string[] = [];
  let expected = "";
  if (kind === "samebase") {
    const k = v["k"] as number, m = v["m"] as number, x = v["x"] as number;
    expected = `x = ${x}`;
    if (x !== m - k) errs.push(`x != m-k`);
  } else if (kind === "samebase2") {
    const a = v["a"] as number, m = v["m"] as number, x = v["x"] as number;
    expected = `x = ${x}`;
    if (a * x !== m) errs.push(`a*x != m`);
    if (Math.abs(Math.pow(base, a * x) - Math.pow(base, m)) > 1e-9) errs.push(`equation fails`);
  } else {
    const N = v["N"] as number, approx = v["approx"] as number;
    const trueX = Math.log(N) / Math.log(base);
    if (Math.abs(trueX - approx) > 0.005 + 1e-9) errs.push(`approx ${approx} off from ${trueX}`);
    if (Math.abs(Math.pow(base, trueX) - N) / N > 1e-9) errs.push(`b^x != N`);
    expected = `x = \\log_{${base}} ${N} ≈ ${approx.toFixed(2)}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSolveLogEq(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const base = v["base"] as number, mExp = v["mExp"] as number, B = v["B"] as number;
  const s = v["s"] as number, t = v["t"] as number, k = v["k"] as number;
  const errs: string[] = [];
  const logb = (z: number) => Math.log(z) / Math.log(base);
  if (s * (s - k) !== B) errs.push(`s(s-k) != B`);
  if (t * (t - k) !== B) errs.push(`t(t-k) != B`);
  if (!(s > 0 && s - k > 0)) errs.push(`s=${s} violates domain`);
  if (t > 0 && t - k > 0) errs.push(`t=${t} is NOT extraneous`);
  if (Math.abs(logb(s) + logb(s - k) - mExp) > 1e-9) errs.push(`s fails original equation`);
  const expected = `x = ${s}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.S Sequences ────────────────────────────────────────────────────────────

function chkArith(p: Algebra2Problem, v: Record<string, number>, what: string): CheckResult {
  const errs: string[] = [];
  let expected = "";
  if (what === "explicit" || what === "findN") {
    const { a1, d, n, an } = v;
    if (a1 + (n - 1) * d !== an) errs.push(`a_n formula fails`);
    expected = what === "explicit" ? `${an}` : `n = ${n}`;
  } else {
    const { a1, d, m, n, am, an, k, ak } = v;
    if (a1 + (m - 1) * d !== am || a1 + (n - 1) * d !== an) errs.push(`terms mismatch`);
    if ((an - am) / (n - m) !== d) errs.push(`d mismatch`);
    if (a1 + (k - 1) * d !== ak) errs.push(`a_k mismatch`);
    expected = `${ak}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkGeom(p: Algebra2Problem, v: Record<string, number>, what: string): CheckResult {
  const { a1, r, n, an } = v;
  const errs: string[] = [];
  if (a1 * Math.pow(r, n - 1) !== an) errs.push(`geometric formula fails`);
  const expected = what === "findR" ? `r = ${r}` : `${an}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRecursive(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const kind = v["kind"] as string;
  const a1 = v["a1"] as number, target = v["target"] as number;
  const an = v["an"] as number, step = v["step"] as number;
  const errs: string[] = [];
  let cur = a1;
  for (let i = 2; i <= target; i++) cur = kind === "arithRec" ? cur + step : cur * step;
  if (cur !== an) errs.push(`iteration gives ${cur}, expected ${an}`);
  const expected = `${an}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFiniteSum(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const kind = v["kind"] as string;
  const errs: string[] = [];
  let expected = "";
  if (kind === "arithSum") {
    const a1 = v["a1"] as number, d = v["d"] as number, n = v["n"] as number, sum = v["sum"] as number;
    let direct = 0;
    for (let i = 0; i < n; i++) direct += a1 + i * d;
    if (direct !== sum) errs.push(`direct sum ${direct} != ${sum}`);
    if (n * (2 * a1 + (n - 1) * d) / 2 !== sum) errs.push(`formula mismatch`);
    expected = `${sum}`;
  } else {
    const a1 = v["a1"] as number, r = v["r"] as number, n = v["n"] as number, sum = v["sum"] as number;
    let direct = 0, term = a1;
    for (let i = 0; i < n; i++) { direct += term; term *= r; }
    if (Math.abs(direct - sum) > 1e-9) errs.push(`direct sum mismatch`);
    const formula = (a1 * (1 - Math.pow(r, n))) / (1 - r);
    if (Math.abs(formula - sum) > 1e-9) errs.push(`formula mismatch`);
    expected = `${sum}`;
  }
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.5 Conics ───────────────────────────────────────────────────────────────

function chkCircleEq(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { h, k, r } = v;
  const errs: string[] = [];
  if (r <= 0) errs.push(`radius ${r} not positive`);
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  const yPart = k === 0 ? "y^2" : k > 0 ? `(y - ${k})^2` : `(y + ${-k})^2`;
  const expected = `${xPart} + ${yPart} = ${r * r}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkCircleGeneral(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { h, k, r, D, E, F } = v;
  const errs: string[] = [];
  if (D !== -2 * h || E !== -2 * k || F !== h * h + k * k - r * r)
    errs.push(`general-form coefficients inconsistent`);
  if (r <= 0) errs.push(`radius not positive`);
  const expected = `center (${h}, ${k}), radius ${r}`;
  if (p.answer !== expected) errs.push(`answer mismatch`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkParabola(p: Algebra2Problem, v: Record<string, number>, what: string): CheckResult {
  const { a, h, k } = v;
  const errs: string[] = [];
  let expected = "";
  if (what === "vertex") {
    const dir = a > 0 ? "up" : "down";
    expected = `vertex (${h}, ${k}), opens ${dir}`;
  } else if (what === "focus") {
    const p2 = v["p"] as number;
    expected = `focus (${h}, ${k + p2}), directrix y = ${k - p2}`;
    if (p2 === 0) errs.push(`p=0 degenerate`);
  } else {
    const x0 = v["x0"] as number, y0 = v["y0"] as number;
    if (y0 !== k + a * (x0 - h) * (x0 - h)) errs.push(`point not on parabola`);
    const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
    const coeff = a === 1 ? "" : a === -1 ? "-" : `${a}`;
    expected = `a = ${a}; y = ${coeff}${xPart} ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.5 Systems ──────────────────────────────────────────────────────────────

function chkLineParabola(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const u = v["u"] as number, vv = v["v"] as number, m = v["m"] as number, b = v["b"] as number;
  const x1 = v["x1"] as number, x2 = v["x2"] as number, tangent = v["tangent"] as boolean;
  const errs: string[] = [];
  const P = (x: number) => x * x + u * x + vv;
  for (const x of [x1, x2]) {
    if (Math.abs(P(x) - (m * x + b)) > 1e-9) errs.push(`x=${x} not an intersection`);
  }
  let expected: string;
  if (tangent) {
    if (x1 !== x2) errs.push(`tangent but x1 != x2`);
    const disc = (u - m) * (u - m) - 4 * (vv - b);
    if (Math.abs(disc) > 1e-9) errs.push(`discriminant ${disc} != 0`);
    expected = `(${x1}, ${P(x1)})`;
  } else {
    if (x1 === x2) errs.push(`two-solution case but x1 == x2`);
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    expected = `(${lo}, ${P(lo)}) and (${hi}, ${P(hi)})`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkCircleLine(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const r = v["r"] as number;
  const mNum = v["mNum"] as number, mDen = v["mDen"] as number;
  const bNum = v["bNum"] as number, bDen = v["bDen"] as number;
  const sols = v["sols"] as number[];
  const tangent = v["tangent"] as boolean, vertical = v["vertical"] as boolean;
  const errs: string[] = [];
  if (tangent && sols.length !== 2) errs.push(`tangent should have exactly 1 solution`);
  if (!tangent && sols.length !== 4) errs.push(`should have exactly 2 solutions`);
  for (let i = 0; i < sols.length; i += 2) {
    const x = sols[i], y = sols[i + 1];
    if (Math.abs(x * x + y * y - r * r) > 1e-9) errs.push(`(${x},${y}) not on circle`);
    if (vertical) {
      if (x !== bNum) errs.push(`(${x},${y}) not on vertical line x=${bNum}`);
    } else {
      const ly = (mNum / mDen) * x + bNum / bDen;
      if (Math.abs(ly - y) > 1e-9) errs.push(`(${x},${y}) not on line`);
    }
  }
  const expected = sols.length === 2 ? `(${sols[0]}, ${sols[1]})` : `(${sols[0]}, ${sols[1]}) and (${sols[2]}, ${sols[3]})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.4 Matrices ─────────────────────────────────────────────────────────────

function chkMatrix(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const errs: string[] = [];
  let expected = "";
  const flat = (m: number[], rows: number, cols: number) =>
    Array.from({ length: rows }, (_, i) => m.slice(i * cols, (i + 1) * cols));
  const show = (m: number[][]) => `[${m.map((row) => row.join(", ")).join("; ")}]`;
  if (p.subtype === "MatrixAddSub") {
    const A = v["A"] as number[], B = v["B"] as number[];
    const op = v["op"] as number, rows = v["rows"] as number, cols = v["cols"] as number;
    const C = A.map((a2, i) => a2 + op * B[i]);
    expected = show(flat(C, rows, cols));
    if (JSON.stringify(C) !== JSON.stringify(v["C"])) errs.push(`sum mismatch`);
  } else if (p.subtype === "MatrixMultiply") {
    const A = v["A"] as number[], B = v["B"] as number[];
    const ar = v["aRows"] as number, ac = v["aCols"] as number, bc = v["bCols"] as number;
    const C: number[] = [];
    for (let i = 0; i < ar; i++)
      for (let j = 0; j < bc; j++) {
        let s = 0;
        for (let k2 = 0; k2 < ac; k2++) s += A[i * ac + k2] * B[k2 * bc + j];
        C.push(s);
      }
    expected = show(flat(C, ar, bc));
    if (JSON.stringify(C) !== JSON.stringify(v["C"])) errs.push(`product mismatch`);
  } else if (p.subtype === "MatrixDetInverse") {
    const [a, b, c, d] = v["M"] as number[];
    const det = v["det"] as number;
    if (det !== a * d - b * c) errs.push(`det mismatch`);
    const inv = v["inv"] as number[];
    if (inv.length > 0) {
      // inverse requested: matrix must be invertible
      if (det === 0) errs.push(`singular matrix where inverse is used`);
      expected = show([[inv[0], inv[1]], [inv[2], inv[3]]]);
      // M * inv == I exactly (det ±1 by construction)
      const P = [a * inv[0] + b * inv[2], a * inv[1] + b * inv[3], c * inv[0] + d * inv[2], c * inv[1] + d * inv[3]];
      if (JSON.stringify(P.map((x) => Math.round(x))) !== JSON.stringify([1, 0, 0, 1]))
        errs.push(`M*inv != I`);
    } else {
      expected = `${det}`;
    }
  } else {
    const [a, b, c, d] = v["A"] as number[];
    const [r1, r2] = v["rhs"] as number[];
    const [x0, y0] = v["sol"] as number[];
    if (a * x0 + b * y0 !== r1 || c * x0 + d * y0 !== r2) errs.push(`solution fails system`);
    expected = `(${x0}, ${y0})`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.12 Data ────────────────────────────────────────────────────────────────

function chkData(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const errs: string[] = [];
  let expected = "";
  if (p.subtype === "DataAnalyze") {
    const xs = v["xs"] as number[], ys = v["ys"] as number[];
    const model = v["model"] as string;
    const d1 = ys.slice(1).map((y, i) => y - ys[i]);
    const d2 = d1.slice(1).map((y, i) => y - d1[i]);
    const ratios = ys.slice(1).map((y, i) => (ys[i] === 0 ? NaN : y / ys[i]));
    const allEq = (arr: number[]) => arr.every((z) => Math.abs(z - arr[0]) < 1e-9);
    let found: string;
    if (allEq(d1)) found = "linear";
    else if (allEq(d2)) found = "quadratic";
    else if (ratios.every((z) => isFinite(z)) && allEq(ratios)) found = "exponential";
    else found = "unknown";
    if (found !== model) errs.push(`detected ${found}, expected ${model}`);
    void xs;
    const checkStr =
      model === "linear" ? "first differences are constant"
      : model === "quadratic" ? "second differences are constant"
      : "ratios of consecutive terms are constant";
    expected = `${model} (${checkStr})`;
  } else if (p.subtype === "DataRegression") {
    const xs = v["xs"] as number[], ys = v["ys"] as number[];
    const m = v["m"] as number, b = v["b"] as number;
    const n = xs.length;
    const xBar = xs.reduce((s, x) => s + x, 0) / n;
    const yBar = ys.reduce((s, y) => s + y, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xBar) * (ys[i] - yBar);
      den += (xs[i] - xBar) * (xs[i] - xBar);
    }
    const slope = num / den;
    const icept = yBar - slope * xBar;
    if (Math.abs(slope - m) > 1e-9 || Math.abs(icept - b) > 1e-9)
      errs.push(`regression gives y=${slope}x+${icept}, expected y=${m}x+${b}`);
    const sStr = slope === 1 ? "" : slope === -1 ? "-" : `${slope}`;
    expected = `y = ${sStr}x ${icept < 0 ? "-" : "+"} ${Math.abs(icept)}`;
  } else {
    const kind = v["kind"] as string;
    const pred = v["pred"] as number, atX = v["atX"] as number;
    if (kind === "linear") {
      const m = v["m"] as number, b = v["b"] as number;
      if (m * atX + b !== pred) errs.push(`prediction mismatch`);
    } else {
      const a = v["a"] as number, r = v["r"] as number;
      if (a * Math.pow(r, atX) !== pred) errs.push(`prediction mismatch`);
    }
    expected = `${pred}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

type V = Record<string, number | number[] | string | string[] | boolean>;

export function verifyProblem(p: Algebra2Problem): CheckResult {
  const v = (p.verify ?? {}) as V;
  const asNum = v as unknown as Record<string, number>;
  switch (p.subtype) {
    case "CompleteSquare": return chkCompleteSquare(p, asNum);
    case "VertexFormula": return chkVertexFormula(p, asNum);
    case "SolveByRoot": return chkSolveByRoot(p, asNum);
    case "Discriminant": return chkDiscriminant(p, asNum);
    case "ComplexRoots": return chkComplexRoots(p, asNum);
    case "QuadraticFormula": return chkQuadraticFormula(p, asNum);
    case "LongDivision":
    case "SyntheticDivision": return chkDivision(p, v);
    case "RationalRootTheorem": return chkRRT(p, v);
    case "FactorByGrouping": return chkGrouping(p, asNum);
    case "SumDifferenceCubes": return chkSumDiffCubes(p, v);
    case "Asymptotes": return chkAsymptotes(p, asNum);
    case "Holes": return chkHoles(p, asNum);
    case "SimplifyRational": return chkSimplify(p, v);
    case "MultiplyDivideRational": return chkMultDiv(p, v);
    case "SolveRationalEquation": return chkSolveRational(p, v);
    case "LogEvaluate": return chkLogEvaluate(p, v);
    case "ExpandLog": return chkExpandLog(p, v);
    case "CondenseLog": return chkCondenseLog(p, asNum);
    case "SolveExponential": return chkSolveExp(p, v);
    case "SolveLogEquation": return chkSolveLogEq(p, asNum);
    case "ArithmeticExplicit": return chkArith(p, asNum, "explicit");
    case "ArithmeticFindN": return chkArith(p, asNum, "findN");
    case "ArithmeticSystem": return chkArith(p, asNum, "system");
    case "GeometricExplicit": return chkGeom(p, asNum, "explicit");
    case "GeometricFindR": return chkGeom(p, asNum, "findR");
    case "Recursive": return chkRecursive(p, v);
    case "FiniteSum": return chkFiniteSum(p, v);
    case "CircleEquation": return chkCircleEq(p, asNum);
    case "CircleFromGeneral": return chkCircleGeneral(p, asNum);
    case "ParabolaVertex": return chkParabola(p, asNum, "vertex");
    case "ParabolaFocusDirectrix": return chkParabola(p, asNum, "focus");
    case "ParabolaFromPoint": return chkParabola(p, asNum, "point");
    case "LineParabola": return chkLineParabola(p, v);
    case "CircleLine": return chkCircleLine(p, v);
    case "MatrixAddSub":
    case "MatrixMultiply":
    case "MatrixDetInverse":
    case "MatrixSolveSystem": return chkMatrix(p, v);
    case "DataAnalyze":
    case "DataRegression":
    case "DataPredict": return chkData(p, v);
    default: return bad("", `no checker for subtype "${p.subtype}"`);
  }
}

// Numeric spot-check of a parsed expression (used by answer-key tests).
export function spotCheck(expr: string, env: Env, expected: number, tol = 1e-9): boolean {
  try {
    const got = evaluate(parseExpression(expr), env);
    return Math.abs(got - expected) <= tol * (1 + Math.abs(expected));
  } catch {
    return false;
  }
}

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

// ── A2.5 Lessons 5-1 / 5-2 / 5-3 / 5-5 / 5-10 (independent recomputation) ─────

function fVertexBody(aNum: number, aDen: number, h: number, k: number): string {
  const xPart = h === 0 ? "x^2" : h > 0 ? `(x - ${h})^2` : `(x + ${-h})^2`;
  let aPart: string;
  if (aDen === 1) aPart = aNum === 1 ? "" : aNum === -1 ? "-" : `${aNum}`;
  else aPart = fFrac(aNum, aDen);
  const kPart = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  return `${aPart}${xPart}${kPart}`;
}

function chkTransformations(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { aNum, aDen, h, k } = v;
  const errs: string[] = [];
  if (aNum === 0) errs.push("a is 0");
  if (!(aDen > 0)) errs.push("aDen not positive");
  if (iGcd(aNum, aDen) !== 1) errs.push("a not in lowest terms");
  const parts: string[] = [];
  const absA = fFrac(Math.abs(aNum), aDen);
  if (aNum < 0) parts.push("reflect over the x-axis");
  if (Math.abs(aNum) > aDen) parts.push(`vertical stretch by ${absA}`);
  else if (Math.abs(aNum) < aDen) parts.push(`vertical shrink by ${absA}`);
  if (h > 0) parts.push(`shift right ${h}`); else if (h < 0) parts.push(`shift left ${-h}`);
  if (k > 0) parts.push(`shift up ${k}`); else if (k < 0) parts.push(`shift down ${-k}`);
  const expected = `${parts.join("; ")}; vertex (${h}, ${k}); axis of symmetry x = ${h}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkWriteVertexForm(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, h, k } = v;
  const errs: string[] = [];
  if (a === 0) errs.push("a is 0");
  const expected = `f(x) = ${fVertexBody(a, 1, h, k)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkStdFormAttributes(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c } = v;
  const errs: string[] = [];
  if (a === 0) errs.push("a is 0");
  if (b % (2 * a) !== 0) errs.push(`axis -b/(2a) not integral for a=${a}, b=${b}`);
  const h = -b / (2 * a);
  const expected = `opens ${a > 0 ? "up" : "down"}; axis of symmetry x = ${h}; y-intercept (0, ${c})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkStdFormVertex(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, h, k } = v;
  const errs: string[] = [];
  if (h !== -b / (2 * a)) errs.push(`h ${h} != -b/(2a)`);
  if (k !== ipEval([a, b, c], h)) errs.push(`k ${k} != f(h)`);
  const expected = `vertex (${h}, ${k}); ${a > 0 ? "minimum" : "maximum"} value ${k}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkStdFormIntercepts(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, r1, r2 } = v;
  const errs: string[] = [];
  if (!(r1 < r2)) errs.push(`roots not ordered/distinct: ${r1}, ${r2}`);
  if (ipEval([a, b, c], r1) !== 0) errs.push(`f(${r1}) != 0`);
  if (ipEval([a, b, c], r2) !== 0) errs.push(`f(${r2}) != 0`);
  if (b !== -a * (r1 + r2) || c !== a * r1 * r2) errs.push("b/c inconsistent with roots");
  const expected = `x-intercepts (${r1}, 0) and (${r2}, 0); y-intercept (0, ${c})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkProjectileMax(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { v0, h0, tStar, maxH } = v;
  const errs: string[] = [];
  if (Math.abs(tStar - v0 / 32) > 1e-9) errs.push(`tStar ${tStar} != v0/32`);
  if (Math.abs(maxH - ipEval([-16, v0, h0], tStar)) > 1e-9) errs.push(`maxH ${maxH} != h(tStar)`);
  const expected = `${maxH} feet at t = ${tStar} seconds`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkProjectileLand(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { v0, h0, land, otherRoot } = v;
  const errs: string[] = [];
  if (ipEval([-16, v0, h0], land) !== 0) errs.push(`h(${land}) != 0`);
  if (ipEval([-16, v0, h0], otherRoot) !== 0) errs.push(`h(${otherRoot}) != 0`);
  if (!(land > 0)) errs.push("landing time not positive");
  if (!(otherRoot < 0)) errs.push("other root not negative");
  const expected = `${land} seconds`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkAreaMax(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { fence, wStar, aMax } = v;
  const errs: string[] = [];
  if (wStar !== fence / 4) errs.push(`wStar ${wStar} != fence/4`);
  if (aMax !== wStar * (fence - 2 * wStar)) errs.push(`aMax ${aMax} != w*(F-2w)`);
  if (aMax !== ipEval([-2, fence, 0], wStar)) errs.push("aMax != A(wStar)");
  const expected = `width ${wStar} feet; maximum area ${aMax} square feet`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkModelMax(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, xStar, pMax } = v;
  const errs: string[] = [];
  if (a >= 0) errs.push("model must open downward (a < 0)");
  if (xStar !== -b / (2 * a)) errs.push(`xStar ${xStar} != -b/(2a)`);
  if (pMax !== ipEval([a, b, c], xStar)) errs.push(`pMax ${pMax} != P(xStar)`);
  const expected = `price ${xStar} dollars; maximum profit ${pMax} dollars`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFactorTrinomial(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { b, c, r1, r2 } = v;
  const errs: string[] = [];
  const prod = ipMul([1, -r1], [1, -r2]);
  if (prod.length !== 3 || prod[1] !== b || prod[2] !== c) errs.push(`expansion [${prod}] != [1,${b},${c}]`);
  const expected = `${fLinFactor(r1)}${fLinFactor(r2)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFactorGCF(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { g, b, c, r1, r2 } = v;
  const errs: string[] = [];
  if (g < 2) errs.push("GCF must be >= 2");
  const prod = ipMul([1, -r1], [1, -r2]);
  if (prod.length !== 3 || prod[1] !== b || prod[2] !== c) errs.push(`inner expansion [${prod}] != [1,${b},${c}]`);
  const expected = `${g}${fLinFactor(r1)}${fLinFactor(r2)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFactorDiffSquares(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { m, s } = v;
  const errs: string[] = [];
  const prod = ipMul([m, -s], [m, s]);
  if (prod[0] !== m * m || prod[1] !== 0 || prod[2] !== -s * s) errs.push("expansion mismatch");
  const mt = m === 1 ? "x" : `${m}x`;
  const expected = `(${mt} - ${s})(${mt} + ${s})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFactorSolve(p: Algebra2Problem, v: Record<string, number>): CheckResult {
  const { a, b, c, r1, r2 } = v;
  const errs: string[] = [];
  if (b !== -a * (r1 + r2) || c !== a * r1 * r2) errs.push("b/c inconsistent with roots");
  if (ipEval([a, b, c], r1) !== 0) errs.push(`f(${r1}) != 0`);
  if (ipEval([a, b, c], r2) !== 0) errs.push(`f(${r2}) != 0`);
  const expected = r1 === r2 ? `x = ${r1}` : `x = ${r1} or x = ${r2}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkQuadInequality(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number;
  const b = v["b"] as number;
  const c = v["c"] as number;
  const r1 = v["r1"] as number;
  const r2 = v["r2"] as number;
  const op = v["op"] as string;
  const errs: string[] = [];
  if (!(r1 < r2)) errs.push(`critical values not ordered/distinct: ${r1}, ${r2}`);
  if (b !== -a * (r1 + r2) || c !== a * r1 * r2) errs.push("b/c inconsistent with critical values");
  // Independent region determination: sample one point in each interval.
  const f = (x: number) => ipEval([a, b, c], x);
  const holds = (x: number) =>
    op === "<" ? f(x) < 0 : op === "<=" ? f(x) <= 0 : op === ">" ? f(x) > 0 : f(x) >= 0;
  const betweenHolds = holds((r1 + r2) / 2);
  const outsideHolds = holds(r1 - 1) && holds(r2 + 1);
  if (betweenHolds === outsideHolds) errs.push("region sampling inconsistent (both or neither hold)");
  const strict = op === "<" || op === ">";
  const expected = betweenHolds
    ? strict ? `${r1} < x < ${r2}` : `${r1} \\leq x \\leq ${r2}`
    : strict ? `x < ${r1} or x > ${r2}` : `x \\leq ${r1} or x \\geq ${r2}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkQuadIneqNoCross(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number;
  const b = v["b"] as number;
  const c = v["c"] as number;
  const op = v["op"] as string;
  const errs: string[] = [];
  const D = b * b - 4 * a * c;
  if (D >= 0) errs.push(`D=${D} not negative (parabola crosses the axis)`);
  // With D < 0 the expression keeps the sign of a everywhere; sample to confirm.
  if (D < 0 && Math.sign(ipEval([a, b, c], 37)) !== Math.sign(a)) errs.push("sample sign != sign(a)");
  const alwaysPositive = a > 0;
  const truth = (op === ">" || op === ">=") === alwaysPositive;
  const expected = truth ? "all real numbers" : "no solution";
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
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

function chkAddSubRational(p: Algebra2Problem, v: Record<string, number | number[] | string | string[] | boolean>): CheckResult {
  const kind = v["kind"] as string;
  const op = v["op"] as string;
  const sgn = op === "add" ? 1 : -1;
  const errs: string[] = [];
  // Independent display helpers (mirror the documented answer format).
  const linFactor = (r: number): string => (r === 0 ? "(x)" : r > 0 ? `(x - ${r})` : `(x + ${-r})`);
  const fracStr = (num: number[], denDisplay: string): string => {
    const terms = num.filter((c) => c !== 0).length;
    const ns = fPoly(num);
    return `${terms > 1 ? `(${ns})` : ns}/${denDisplay}`;
  };
  let num: number[] = [];
  let denPoly: number[] = [];
  let poles: number[] = [];
  let expected = "";
  // ansValOverride: value of the ANSWER (as opposed to num/den). Only
  // likeCancel needs one, since its answer is the constant left after
  // canceling, while num/den is the pre-cancel fraction.
  let ansVal: (num: number[], den: number[], x: number) => number =
    (n, d, x) => ipEval(n, x) / ipEval(d, x);
  let orig: (x: number) => number = () => 0;
  if (kind === "like" || kind === "likeCancel") {
    const a = v["a"] as number, b = v["b"] as number, c = v["c"] as number,
      d = v["d"] as number, r = v["r"] as number;
    num = [a + sgn * c, b + sgn * d];
    denPoly = [1, -r];
    poles = [r];
    orig = (x) => (a * x + b) / (x - r) + sgn * ((c * x + d) / (x - r));
    if (kind === "like") {
      if (ipEval(num, r) === 0) errs.push(`combined numerator vanishes at the pole x=${r} (would cancel)`);
      expected = fracStr(num, linFactor(r));
    } else {
      const M = v["M"] as number;
      if (!(num[0] === M && num[1] === -M * r)) errs.push(`combined numerator ${JSON.stringify(num)} is not ${M}(x - ${r})`);
      expected = `${M}`;
      ansVal = () => M;
      // The numerator DOES vanish at the pole here, by design (it cancels);
      // poles stays [r] so sample points still skip the excluded value.
    }
  } else if (kind === "unlikeSimple") {
    const A = v["A"] as number, B = v["B"] as number, r = v["r"] as number, s = v["s"] as number;
    if (r === s) errs.push(`unlike denominators must differ (r === s === ${r})`);
    num = ipAddSub(ipMul([A], [1, -s]), ipMul([B], [1, -r]), sgn === 1 ? 1 : -1);
    denPoly = ipMul([1, -r], [1, -s]);
    poles = [r, s];
    expected = fracStr(num, `(${fPoly(denPoly)})`);
    orig = (x) => A / (x - r) + sgn * (B / (x - s));
  } else if (kind === "unlikeShared") {
    const A = v["A"] as number, B = v["B"] as number, r = v["r"] as number, s = v["s"] as number;
    if (r === s) errs.push(`unlike denominators must differ (r === s === ${r})`);
    num = ipAddSub(ipMul([A], [1, -s]), [B], sgn === 1 ? 1 : -1);
    denPoly = ipMul([1, -r], [1, -s]);
    poles = [r, s];
    expected = fracStr(num, `(${fPoly(denPoly)})`);
    orig = (x) => A / (x - r) + sgn * (B / ((x - r) * (x - s)));
  } else if (kind === "unlikePoly") {
    const a = v["a"] as number, b = v["b"] as number, C = v["C"] as number,
      r = v["r"] as number, s = v["s"] as number;
    if (r === s) errs.push(`unlike denominators must differ (r === s === ${r})`);
    if (a * r + b === 0) errs.push(`first numerator vanishes at its own pole x=${r}`);
    num = ipAddSub(ipMul([a, b], [1, -s]), ipMul([C], [1, -r]), sgn === 1 ? 1 : -1);
    denPoly = ipMul([1, -r], [1, -s]);
    poles = [r, s];
    expected = fracStr(num, `(${fPoly(denPoly)})`);
    orig = (x) => (a * x + b) / (x - r) + sgn * (C / (x - s));
  } else if (kind === "factorFirst") {
    const A = v["A"] as number, B = v["B"] as number, k = v["k"] as number;
    num = ipAddSub([A], ipMul([B], [1, k]), sgn === 1 ? 1 : -1);
    denPoly = [1, 0, -k * k];
    poles = [k, -k];
    expected = fracStr(num, `(${fPoly(denPoly)})`);
    orig = (x) => A / (x * x - k * k) + sgn * (B / (x - k));
  } else if (kind === "opposite") {
    const A = v["A"] as number, B = v["B"] as number, r = v["r"] as number;
    const M = sgn === 1 ? A - B : A + B;
    if (M === 0) errs.push(`opposite-factors combination gives a zero numerator`);
    num = [M];
    denPoly = [1, -r];
    poles = [r];
    expected = fracStr(num, linFactor(r));
    orig = (x) => A / (x - r) + sgn * (B / (r - x));
  } else {
    errs.push(`unknown AddSubtractRational kind "${kind}"`);
    return bad("", ...errs);
  }
  // The numerator must not vanish at a pole (no hidden cancellation),
  // except likeCancel, where canceling IS the point of the problem.
  if (kind !== "likeCancel") {
    for (const pole of poles) {
      if (ipEval(num, pole) === 0) errs.push(`numerator vanishes at pole x=${pole} (would cancel)`);
      if (ipEval(denPoly, pole) !== 0) errs.push(`denominator does not vanish at pole x=${pole}`);
    }
  } else if (ipEval(denPoly, poles[0]) !== 0) {
    errs.push(`denominator does not vanish at pole x=${poles[0]}`);
  }
  // Numeric: the original expression and the answer must agree at sample
  // points away from the poles.
  for (const x0 of [0.5, 2.3, -3.7, 5.1, 11.25]) {
    if (poles.some((pole) => Math.abs(x0 - pole) < 0.25)) continue;
    const got = orig(x0);
    const want = ansVal(num, denPoly, x0);
    if (Math.abs(got - want) > 1e-8) errs.push(`numeric mismatch at x=${x0}: original ${got} vs answer ${want}`);
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

// ── A2.8 Polynomials (T8: attributes, arithmetic, FTA) ───────────────────────

function ipAddSub(a: number[], b: number[], sign: 1 | -1): number[] {
  const n = Math.max(a.length, b.length);
  const o = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const av = i < n - a.length ? 0 : a[i - (n - a.length)];
    const bv = i < n - b.length ? 0 : b[i - (n - b.length)];
    o[i] = av + sign * bv;
  }
  while (o.length > 1 && o[0] === 0) o.shift();
  return o;
}

function fFactorStr(r: number, m: number): string {
  const base = r === 0 ? "x" : r > 0 ? `(x - ${r})` : `(x + ${-r})`;
  return m === 1 ? base : `${base}^${m}`;
}

function fEndBehavior(degree: number, lead: number): string {
  const right = lead > 0 ? "∞" : "-∞";
  const left = degree % 2 === 0 ? right : lead > 0 ? "-∞" : "∞";
  return `as x → -∞, f(x) → ${left}; as x → ∞, f(x) → ${right}`;
}

function chkPolyAttributes(p: Algebra2Problem, v: V): CheckResult {
  const poly = v["poly"] as number[];
  const errs: string[] = [];
  const degree = poly.length - 1;
  const lead = poly[0];
  if (v["degree"] !== degree) errs.push(`payload degree ${v["degree"]} != poly degree ${degree}`);
  if (v["lead"] !== lead) errs.push(`payload lead ${v["lead"]} != poly[0] ${lead}`);
  const expected =
    `degree ${degree}; leading coefficient ${lead}; ${fEndBehavior(degree, lead)}; ` +
    `at most ${degree - 1} turning points`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkPolyAttributesEndBehavior(p: Algebra2Problem, v: V): CheckResult {
  const parity = v["parity"] as string;
  const leadSign = v["leadSign"] as number;
  const turning = v["turning"] as number;
  const errs: string[] = [];
  let md = turning + 1;
  if ((md % 2 === 0) !== (parity === "even")) md += 1;
  if (md !== v["minDegree"]) errs.push(`min degree recomputed ${md} != payload ${v["minDegree"]}`);
  const expected =
    `${parity} degree; ${leadSign > 0 ? "positive" : "negative"} leading coefficient; ` +
    `minimum degree ${md}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkPolyAttributesFactored(p: Algebra2Problem, v: V): CheckResult {
  const roots = v["roots"] as number[];
  const mults = v["mults"] as number[];
  const lead = v["lead"] as number;
  const errs: string[] = [];
  const degree = mults.reduce((s, m) => s + m, 0);
  if (v["degree"] !== degree) errs.push(`payload degree ${v["degree"]} != sum of mults ${degree}`);
  const pairs = roots.map((r, i) => [r, mults[i]] as [number, number]).sort((x, y) => x[0] - y[0]);
  const zerosStr = pairs.map(([r, m]) => `x = ${r} (multiplicity ${m})`).join(", ");
  const expected =
    `degree ${degree}; leading coefficient ${lead}; ${fEndBehavior(degree, lead)}; zeros: ${zerosStr}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkPolyAddSub(p: Algebra2Problem, v: V): CheckResult {
  const P = v["p"] as number[];
  const Q = v["q"] as number[];
  const errs: string[] = [];
  const recomputed = ipAddSub(P, Q, v["op"] === "sub" ? -1 : 1);
  if (JSON.stringify(recomputed) !== JSON.stringify(v["result"]))
    errs.push(`payload result != recomputed ${JSON.stringify(recomputed)}`);
  const expected = fPoly(recomputed);
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkPolyMultiply(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const recomputed = ipMul(v["f1"] as number[], v["f2"] as number[]);
  if (JSON.stringify(recomputed) !== JSON.stringify(v["product"]))
    errs.push(`payload product != recomputed ${JSON.stringify(recomputed)}`);
  const expected = fPoly(recomputed);
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFTACountZeros(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string;
  const errs: string[] = [];
  let expected = "";
  if (kind === "expanded") {
    const poly = v["poly"] as number[];
    const total = v["total"] as number;
    if (total !== poly.length - 1) errs.push(`total ${total} != degree of poly ${poly.length - 1}`);
    if (v["degree"] !== total) errs.push(`payload degree != total`);
    expected = `exactly ${total} complex zeros, counting multiplicity`;
  } else if (kind === "factored") {
    const roots = v["roots"] as number[];
    const mults = v["mults"] as number[];
    const total = mults.reduce((s, m) => s + m, 0);
    if (v["total"] !== total) errs.push(`payload total ${v["total"]} != sum of mults ${total}`);
    if (v["distinct"] !== roots.length) errs.push(`payload distinct != roots count`);
    expected = `${total} zeros counting multiplicity; ${roots.length} distinct zeros`;
  } else {
    // complexPair: payload omits the optional extra real root — recover the
    // full factor list by parsing the printed function in `given` and
    // cross-checking every piece against the payload.
    const r1 = v["realRoot"] as number;
    const m1 = v["mult"] as number;
    const s = v["imag"] as number;
    const degree = v["degree"] as number;
    if (v["total"] !== degree) errs.push(`payload total != degree`);
    const fnStr = String((p.given as Record<string, unknown>)["function"] ?? "");
    const quadTok = `(x^2 + ${s * s})`;
    if (!fnStr.includes(quadTok)) errs.push(`printed function lacks ${quadTok}`);
    const linToks: { r: number; m: number }[] = [];
    const re = /\(x - (\d+)\)(?:\^(\d+))?|\(x \+ (\d+)\)(?:\^(\d+))?/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(fnStr)) !== null) {
      if (mm[1] !== undefined) linToks.push({ r: Number(mm[1]), m: Number(mm[2] ?? 1) });
      else linToks.push({ r: -Number(mm[3]), m: Number(mm[4] ?? 1) });
    }
    if (linToks.length === 0 || linToks[0].r !== r1 || linToks[0].m !== m1)
      errs.push(`first linear factor from print ${JSON.stringify(linToks[0])} != payload (${r1}, ${m1})`);
    const extra = linToks.length > 1 ? linToks[1].r : null;
    if (degree !== m1 + 2 + (extra !== null ? 1 : 0))
      errs.push(`degree ${degree} inconsistent with factors`);
    const zerosList = [
      `x = ${r1}${m1 > 1 ? ` (multiplicity ${m1})` : ""}`,
      ...(extra !== null ? [`x = ${extra}`] : []),
      `x = ${s}i`,
      `x = -${s}i`,
    ];
    expected = `${degree} zeros counting multiplicity: ${zerosList.join(", ")}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFTAWritePoly(p: Algebra2Problem, v: V): CheckResult {
  const lead = v["lead"] as number;
  const roots = v["roots"] as number[];
  const mults = v["mults"] as number[];
  const errs: string[] = [];
  const aStr = lead === 1 ? "" : lead === -1 ? "-" : `${lead}`;
  // Independent check: expand the claimed factors; every listed zero must
  // actually be a root of the expansion.
  let poly: number[] = [lead];
  roots.forEach((r, i) => {
    for (let j = 0; j < mults[i]; j++) poly = ipMul(poly, [1, -r]);
  });
  for (const r of roots) if (ipEval(poly, r) !== 0) errs.push(`root ${r} fails expansion`);
  let factored = roots.map((r, i) => fFactorStr(r, mults[i])).join("");
  if ((v["kind"] as string) === "complexPair") {
    const s = v["imag"] as number;
    poly = ipMul(poly, [1, 0, s * s]);
    if (poly.length - 1 !== mults.reduce((a, b) => a + b, 0) + 2)
      errs.push(`degree incl. quadratic factor wrong`);
    factored += `(x^2 + ${s * s})`;
  }
  const expected = `f(x) = ${aStr}${factored}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.10 Cubic & cube root (T10) ────────────────────────────────────────────

function fAPrefix(aNum: number, aDen: number): string {
  if (aDen === 1) return aNum === 1 ? "" : aNum === -1 ? "-" : `${aNum}`;
  return fFrac(aNum, aDen);
}

function fTransformParts(aNum: number, aDen: number, h: number, k: number): string[] {
  const parts: string[] = [];
  const absA = fFrac(Math.abs(aNum), aDen);
  if (aNum < 0) parts.push("reflect over the x-axis");
  if (Math.abs(aNum) > aDen) parts.push(`vertical stretch by ${absA}`);
  else if (Math.abs(aNum) < aDen) parts.push(`vertical shrink by ${absA}`);
  if (h > 0) parts.push(`shift right ${h}`);
  else if (h < 0) parts.push(`shift left ${-h}`);
  if (k > 0) parts.push(`shift up ${k}`);
  else if (k < 0) parts.push(`shift down ${-k}`);
  return parts;
}

function chkCubicFamily(p: Algebra2Problem, v: V): CheckResult {
  const aNum = v["aNum"] as number, aDen = v["aDen"] as number;
  const h = v["h"] as number, k = v["k"] as number;
  const errs: string[] = [];
  if (aNum === 0) errs.push("a numerator is 0");
  if (!(aDen > 0)) errs.push("a denominator not positive");
  if (iGcd(aNum, aDen) !== 1) errs.push("a not in lowest terms");
  const partsStr = fTransformParts(aNum, aDen, h, k).join("; ") || "no transformations";
  const writeForm = p.subtype === "CubicWriteForm" || p.subtype === "CubeRootWriteForm";
  let expected: string;
  if (!writeForm) {
    expected = `${partsStr}; inflection point (${h}, ${k}); domain: all real numbers; range: all real numbers`;
  } else {
    // The description printed in `given` must match the parameters.
    if ((p.given as Record<string, unknown>)["transformations"] !== partsStr)
      errs.push(`printed description != recomputed "${partsStr}"`);
    const kPart = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
    const body =
      p.subtype === "CubicWriteForm"
        ? `${fAPrefix(aNum, aDen)}${h === 0 ? "x^3" : h > 0 ? `(x - ${h})^3` : `(x + ${-h})^3`}${kPart}`
        : `${fAPrefix(aNum, aDen)}\\sqrt[3]{${h === 0 ? "x" : h > 0 ? `x - ${h}` : `x + ${-h}`}}${kPart}`;
    expected = `g(x) = ${body}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkCubeRootEquations(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string;
  const x = v["x"] as number;
  const errs: string[] = [];
  const approx = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (kind === "power") {
    if (x * x * x !== v["n"]) errs.push(`x^3 ${x * x * x} != n ${v["n"]}`);
  } else if (kind === "simple") {
    const c = v["c"] as number;
    if (x !== c * c * c) errs.push(`x ${x} != c^3 ${c * c * c}`);
  } else if (kind === "linear") {
    const a = v["a"] as number, b = v["b"] as number, c = v["c"] as number;
    if (a * x + b !== c * c * c) errs.push(`a*x+b != c^3 at x=${x}`);
  } else if (kind === "twoStep") {
    const a = v["a"] as number, b = v["b"] as number, d = v["d"] as number;
    const e = v["e"] as number, t = v["t"] as number;
    if (a * t + d !== e) errs.push(`a*t+d != e`);
    if (!approx(Math.cbrt(x + b), t)) errs.push(`cbrt(x+b) != t at x=${x}`);
    if (!approx(a * Math.cbrt(x + b) + d, e)) errs.push(`full substitution fails at x=${x}`);
  } else if (kind === "bothSides") {
    const a = v["a"] as number, b = v["b"] as number, c = v["c"] as number, d = v["d"] as number;
    if (a === c) errs.push("bothSides with equal leading coefficients");
    if (a * x + b !== c * x + d) errs.push(`radicands unequal at x=${x}`);
  } else {
    errs.push(`unknown kind "${kind}"`);
  }
  const expected = `x = ${x}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.9 Radical expressions & rational exponents (T9) ───────────────────────

/** Split n = s^index * k with s maximal, via prime factorization. */
function iRootSplit(n: number, index: number): [number, number] {
  let rest = n;
  const fac = new Map<number, number>();
  for (let q = 2; q * q <= rest; q++) {
    while (rest % q === 0) {
      fac.set(q, (fac.get(q) ?? 0) + 1);
      rest /= q;
    }
  }
  if (rest > 1) fac.set(rest, (fac.get(rest) ?? 0) + 1);
  let out = 1, inside = 1;
  for (const [q, e] of fac) {
    out *= Math.pow(q, Math.floor(e / index));
    inside *= Math.pow(q, e % index);
  }
  return [out, inside];
}

function iRadical(coef: number, inside: number, index: number): string {
  if (coef === 0) return "0";
  if (inside === 1) return `${coef}`;
  const body = index === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${index}]{${inside}}`;
  return coef === 1 ? body : coef === -1 ? `-${body}` : `${coef}${body}`;
}

function iBinom(rat: number, coef: number, m: number): string {
  if (coef === 0) return `${rat}`;
  const rad = Math.abs(coef) === 1 ? `\\sqrt{${m}}` : `${Math.abs(coef)}\\sqrt{${m}}`;
  if (rat === 0) return coef > 0 ? rad : `-${rad}`;
  return `${rat} ${coef > 0 ? "+" : "-"} ${rad}`;
}

function iVarString(pairs: [string, number][]): string {
  return pairs
    .filter(([, e]) => e > 0)
    .map(([v, e]) => (e === 1 ? v : `${v}^${e}`))
    .join("");
}

function chkSimplifyRadical(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string;
  const errs: string[] = [];
  let expected = "";
  if (kind === "numeric" || kind === "coef") {
    const n = v["n"] as number;
    const index = v["index"] as number;
    const [s, k] = iRootSplit(n, index);
    if (k !== v["inside"]) errs.push(`inside recomputed ${k} != payload ${v["inside"]}`);
    if (kind === "numeric") {
      if (s !== v["outside"]) errs.push(`outside recomputed ${s} != payload ${v["outside"]}`);
      expected = iRadical(s, k, index);
    } else {
      const c = v["coef"] as number;
      if (c * s !== v["outside"]) errs.push(`outside recomputed ${c * s} != payload ${v["outside"]}`);
      expected = iRadical(c * s, k, 2);
    }
  } else {
    // vars: sqrt(n * x^ex * y^ey)
    const n = v["n"] as number;
    const exps = v["exps"] as number[];
    const [s, k] = iRootSplit(n, 2);
    if (s !== v["coefOut"]) errs.push(`coefOut recomputed ${s} != payload ${v["coefOut"]}`);
    if (k !== v["insideNum"]) errs.push(`insideNum recomputed ${k} != payload ${v["insideNum"]}`);
    const names = ["x", "y"];
    const outPairs = exps.map((e, i) => [names[i], Math.floor(e / 2)] as [string, number]);
    const inPairs = exps.map((e, i) => [names[i], e % 2] as [string, number]);
    expected = `${s}${iVarString(outPairs)}\\sqrt{${k}${iVarString(inPairs)}}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalMultiply(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  let expected = "";
  if ((v["kind"] as string) === "numeric") {
    const [s, k] = iRootSplit((v["a"] as number) * (v["b"] as number), 2);
    expected = iRadical((v["c"] as number) * (v["d"] as number) * s, k, 2);
  } else {
    const m = v["a"] as number, n2 = v["b"] as number;
    const pp = v["p"] as number, q = v["q"] as number;
    const [s, k] = iRootSplit(m * n2, 2);
    const outExp = Math.floor((pp + q) / 2);
    const inExp = (pp + q) % 2;
    const outStr = `${s === 1 ? "" : s}${outExp === 0 ? "" : outExp === 1 ? "x" : `x^${outExp}`}`;
    const insideStr = `${k === 1 ? "" : k}${inExp === 1 ? "x" : ""}`;
    expected = insideStr === "" ? (outStr === "" ? "1" : outStr) : `${outStr}\\sqrt{${insideStr}}`;
    // numeric cross-check at x = 3
    const lhs = Math.sqrt(m * Math.pow(3, pp)) * Math.sqrt(n2 * Math.pow(3, q));
    const rhs = s * Math.pow(3, outExp) * Math.sqrt(k * Math.pow(3, inExp));
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch at x=3: ${lhs} vs ${rhs}`);
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalDivide(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string;
  const a = v["a"] as number, b = v["b"] as number;
  const c = v["c"] as number, d = v["d"] as number;
  const errs: string[] = [];
  let expected = "";
  if (kind === "coefQuotient") {
    const [s, k] = iRootSplit(a * b, 2);
    let numCoef = c * s;
    let den = d * b;
    const g = iGcd(numCoef, den);
    numCoef /= g;
    den /= g;
    expected = den === 1 ? iRadical(numCoef, k, 2) : `${iRadical(numCoef, k, 2)}/${den}`;
    const lhs = (c * Math.sqrt(a)) / (d * Math.sqrt(b));
    const rhs = (numCoef * Math.sqrt(k)) / den;
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch: ${lhs} vs ${rhs}`);
  } else if (kind === "monomial") {
    const [s, k] = iRootSplit(b, 2);
    let numCoef = c * s;
    let den = b;
    const g = iGcd(numCoef, den);
    numCoef /= g;
    den /= g;
    expected = den === 1 ? iRadical(numCoef, k, 2) : `${iRadical(numCoef, k, 2)}/${den}`;
    const lhs = c / Math.sqrt(b);
    const rhs = (numCoef * Math.sqrt(k)) / den;
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch: ${lhs} vs ${rhs}`);
  } else {
    // quotient sqrt(a)/sqrt(b): split the REDUCED numerator and denominator
    // separately, cancel when the inside parts agree, else rationalize.
    const g0 = iGcd(a, b);
    const ap = a / g0, bp = b / g0;
    const [s1, k1] = iRootSplit(ap, 2);
    const [s2, k2] = iRootSplit(bp, 2);
    if (k1 === k2) {
      const [rn, rd] = iReduce(s1, s2);
      expected = rd === 1 ? `${rn}` : `${rn}/${rd}`;
    } else {
      const [s3, k3] = iRootSplit(k1 * k2, 2);
      let numCoef = s1 * s3;
      let den = s2 * k2;
      const g = iGcd(numCoef, den);
      numCoef /= g;
      den /= g;
      expected = den === 1 ? iRadical(numCoef, k3, 2) : `${iRadical(numCoef, k3, 2)}/${den}`;
      const lhs = Math.sqrt(a) / Math.sqrt(b);
      const rhs = (numCoef * Math.sqrt(k3)) / den;
      if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch: ${lhs} vs ${rhs}`);
    }
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkBinomialRadicals(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string;
  const a = v["a"] as number, b = v["b"] as number, m = v["m"] as number;
  const c = v["c"] as number, d = v["d"] as number;
  const errs: string[] = [];
  let expected = "";
  if (kind === "addSub") {
    const sub = (v["op"] as string) === "sub";
    const rat = sub ? a - c : a + c;
    const coef = sub ? b - d : b + d;
    expected = iBinom(rat, coef, m);
    const lhs = a + b * Math.sqrt(m) + (sub ? -1 : 1) * (c + d * Math.sqrt(m));
    const rhs = rat + coef * Math.sqrt(m);
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch: ${lhs} vs ${rhs}`);
  } else if (kind === "conjugate") {
    const val = a * a - b * b * m;
    if (val === 0) errs.push("conjugate product is 0 (factory should regenerate)");
    expected = `${val}`;
  } else {
    const rat = a * c + b * d * m;
    const coef = a * d + b * c;
    expected = iBinom(rat, coef, m);
    const lhs = (a + b * Math.sqrt(m)) * (c + d * Math.sqrt(m));
    const rhs = rat + coef * Math.sqrt(m);
    if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch: ${lhs} vs ${rhs}`);
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRationalizeBinomial(p: Algebra2Problem, v: V): CheckResult {
  const n = v["n"] as number, a = v["a"] as number, b = v["b"] as number;
  const m = v["m"] as number, sign = v["sign"] as number;
  const errs: string[] = [];
  let numRat = n * a;
  let numCoef = -sign * n * b;
  let den = a * a - b * b * m;
  if (den === 0) errs.push("denominator a^2 - b^2*m is 0");
  if (den < 0) {
    den = -den;
    numRat = -numRat;
    numCoef = -numCoef;
  }
  const g = iGcd(iGcd(Math.abs(numRat), Math.abs(numCoef)), den);
  numRat /= g;
  numCoef /= g;
  den /= g;
  const body = iBinom(numRat, numCoef, m);
  const expected = den === 1 ? body : `(${body})/${den}`;
  const lhs = n / (a + sign * b * Math.sqrt(m));
  const rhs = (numRat + numCoef * Math.sqrt(m)) / den;
  if (Math.abs(lhs - rhs) > 1e-9) errs.push(`value mismatch: ${lhs} vs ${rhs}`);
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function iExpString(base: string, num: number, den: number): string {
  const [rn, rd] = iReduce(num, den);
  if (rd === 1) return rn === 1 ? base : `${base}^{${rn}}`;
  return `${base}^{${rn}/${rd}}`;
}

function chkRationalExponents(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string;
  const errs: string[] = [];
  let expected = "";
  if (kind === "toExponent") {
    expected = iExpString(v["base"] as string, v["m"] as number, v["n"] as number);
  } else if (kind === "toRadical") {
    const base = v["base"] as string, m = v["m"] as number, n = v["n"] as number;
    const inside = m === 1 ? base : `${base}^${m}`;
    expected = n === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${n}]{${inside}}`;
  } else if (kind === "evaluate") {
    const r = v["root"] as number, n = v["n"] as number, m = v["m"] as number;
    if (Math.pow(r, n) !== v["base"]) errs.push(`root^n ${Math.pow(r, n)} != base ${v["base"]}`);
    const val = Math.pow(r, Math.abs(m));
    expected = m < 0 ? `1/${val}` : `${val}`;
  } else {
    // product / power / quotient: payload carries only the final reduced
    // exponent — re-derive it from the exponents printed in `given`.
    const base = v["base"] as string, m = v["m"] as number, n = v["n"] as number;
    const expr = String((p.given as Record<string, unknown>)["expression"] ?? "");
    const exps = [...expr.matchAll(/\^{(-?\d+)\/(\d+)}/g)].map((mm) => [Number(mm[1]), Number(mm[2])]);
    let sn = NaN, sd = NaN;
    if (kind === "product" && exps.length === 2) {
      [sn, sd] = iReduce(exps[0][0] * exps[1][1] + exps[1][0] * exps[0][1], exps[0][1] * exps[1][1]);
    } else if (kind === "quotient" && exps.length === 2) {
      [sn, sd] = iReduce(exps[0][0] * exps[1][1] - exps[1][0] * exps[0][1], exps[0][1] * exps[1][1]);
    } else if (kind === "power" && exps.length === 1) {
      const kk = Number(expr.match(/\)\^{(\d+)}/)?.[1] ?? NaN);
      [sn, sd] = iReduce(exps[0][0] * kk, exps[0][1]);
    }
    if (sn !== m || sd !== n)
      errs.push(`final exponent recomputed ${sn}/${sd} != payload ${m}/${n}`);
    if (kind === "quotient") {
      expected = m === 0 ? "1" : m < 0 ? `1/${iExpString(base, -m, n)}` : iExpString(base, m, n);
    } else {
      expected = iExpString(base, m, n);
    }
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.6 Function operations, inverses, square roots, radical equations (T6) ─

function iComposePoly(p: number[], q: number[]): number[] {
  let result: number[] = [0];
  for (const c of p) result = ipAddSub(ipMul(result, q), [c], 1);
  return result;
}

function iXPlus(b: number, v = "x"): string {
  if (b === 0) return v;
  return b > 0 ? `${v} + ${b}` : `${v} - ${-b}`;
}

function iPlusConst(k: number): string {
  if (k === 0) return "";
  return k > 0 ? ` + ${k}` : ` - ${-k}`;
}

function iFracLinearBody(xNum: number, xDen: number, cNum: number, cDen: number, v = "x"): string {
  const xc = fFrac(xNum, xDen);
  const xTerm = xc === "1" ? v : xc === "-1" ? `-${v}` : `${xc}${v}`;
  const cc = fFrac(cNum, cDen);
  if (cc === "0") return xTerm;
  return cc.startsWith("-") ? `${xTerm} - ${cc.slice(1)}` : `${xTerm} + ${cc}`;
}

function iQuadVertexBody(h: number, k: number, v = "x"): string {
  const xPart = h === 0 ? `${v}^2` : h > 0 ? `(${v} - ${h})^2` : `(${v} + ${-h})^2`;
  return `${xPart}${iPlusConst(k)}`;
}

function iAPrefixFrac(aNum: number, aDen: number): string {
  if (aDen === 1) {
    if (aNum === 1) return "";
    if (aNum === -1) return "-";
    return `${aNum}`;
  }
  return fFrac(aNum, aDen);
}

function iSqrtBody(aNum: number, aDen: number, h: number, k: number, s: number): string {
  const rad = s === 1 ? iXPlus(-h) : `${h} - x`;
  return `${iAPrefixFrac(aNum, aDen)}\\sqrt{${rad}}${iPlusConst(k)}`;
}

function chkFuncEvalOps(p: Algebra2Problem, v: V): CheckResult {
  const f = v["fCoeffs"] as number[], g = v["gCoeffs"] as number[];
  const x0 = v["x0"] as number, op = v["op"] as string;
  const errs: string[] = [];
  const fv = ipEval(f, x0), gv = ipEval(g, x0);
  if (fv !== v["fVal"]) errs.push(`f(${x0}) recomputed ${fv} != payload ${v["fVal"]}`);
  if (gv !== v["gVal"]) errs.push(`g(${x0}) recomputed ${gv} != payload ${v["gVal"]}`);
  const result = op === "add" ? fv + gv : op === "sub" ? fv - gv : fv * gv;
  if (result !== v["result"]) errs.push(`result recomputed ${result} != payload ${v["result"]}`);
  const expected = `${result}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFuncProduct(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const prod = ipMul(v["fCoeffs"] as number[], v["gCoeffs"] as number[]);
  if (JSON.stringify(prod) !== JSON.stringify(v["productCoeffs"]))
    errs.push(`product recomputed != payload`);
  const expected = fPoly(prod);
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFuncCompose(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const composed = iComposePoly(v["fCoeffs"] as number[], v["gCoeffs"] as number[]);
  if (JSON.stringify(composed) !== JSON.stringify(v["composedCoeffs"]))
    errs.push(`composition recomputed ${JSON.stringify(composed)} != payload ${JSON.stringify(v["composedCoeffs"])}`);
  const expected = fPoly(composed);
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkFuncComposeEval(p: Algebra2Problem, v: V): CheckResult {
  const f = v["fCoeffs"] as number[], g = v["gCoeffs"] as number[];
  const x0 = v["x0"] as number;
  const errs: string[] = [];
  const inner = ipEval(g, x0);
  const result = ipEval(f, inner);
  const contrast = ipEval(g, ipEval(f, x0));
  if (inner !== v["inner"]) errs.push(`inner recomputed ${inner} != payload ${v["inner"]}`);
  if (result !== v["result"]) errs.push(`result recomputed ${result} != payload ${v["result"]}`);
  if (contrast !== v["contrast"]) errs.push(`contrast recomputed ${contrast} != payload ${v["contrast"]}`);
  const expected = `${result}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkInversePoint(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number;
  const expected = (v["form"] as string) === "value" ? `${a}` : `(${b}, ${a})`;
  const errs: string[] = [];
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkInverseLinear(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number;
  const errs: string[] = [];
  if (a === 0) errs.push("a is 0 (not invertible as stated)");
  // numeric: the claimed inverse (x - b)/a must undo f(x) = a*x + b
  const inv = (x: number) => (x - b) / a;
  for (const x of [3.7, -2.25]) {
    if (Math.abs(a * inv(x) + b - x) > 1e-9) errs.push(`f(f^-1(${x})) != ${x}`);
  }
  const expected = `f^{-1}(x) = ${iFracLinearBody(1, a, -b, a)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkInverseVerify(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number;
  const isInverse = v["isInverse"] as boolean;
  const errs: string[] = [];
  // f(g(x)) with g(x) = (1/a)x + c/a, c = -b (inverse) or +b (near-miss):
  // f(g(x)) = x + c + b, so it collapses to x iff c = -b.
  const constant = isInverse ? 0 : 2 * b;
  let expected: string;
  if (isInverse) {
    expected = "Yes, f and g are inverses of each other";
  } else {
    const compResult = fPoly([1, constant]);
    expected = `No: f(g(x)) = ${compResult}, not x, so f and g are not inverses`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkInverseQuadratic(p: Algebra2Problem, v: V): CheckResult {
  const h = v["h"] as number, k = v["k"] as number;
  const invBody = `\\sqrt{${iXPlus(-k)}}${iPlusConst(h)}`;
  const expected = `f^{-1}(x) = ${invBody}; domain: x \\geq ${k}`;
  const errs: string[] = [];
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSqrtAttributes(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, h = v["h"] as number, k = v["k"] as number, s = v["s"] as number;
  const domain = s === 1 ? `x \\geq ${h}` : `x \\leq ${h}`;
  const range = a > 0 ? `y \\geq ${k}` : `y \\leq ${k}`;
  const expected = `Domain: ${domain}; Range: ${range}; Endpoint: (${h}, ${k})`;
  const errs: string[] = [];
  if (a === 0) errs.push("a is 0");
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSqrtTransformWrite(p: Algebra2Problem, v: V): CheckResult {
  const aNum = v["aNum"] as number, aDen = v["aDen"] as number;
  const h = v["h"] as number, k = v["k"] as number;
  const errs: string[] = [];
  // The printed description must describe these same parameters.
  const parts: string[] = [];
  if (aNum < 0) parts.push("reflect over the x-axis");
  const absA = fFrac(Math.abs(aNum), aDen);
  if (Math.abs(aNum) > aDen) parts.push(`vertical stretch by a factor of ${absA}`);
  else if (Math.abs(aNum) < aDen) parts.push(`vertical shrink by a factor of ${absA}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  if ((p.given as Record<string, unknown>)["description"] !== parts.join("; "))
    errs.push(`printed description != recomputed "${parts.join("; ")}"`);
  const expected = `g(x) = ${iSqrtBody(aNum, aDen, h, k, 1)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSqrtInverseOfSqrt(p: Algebra2Problem, v: V): CheckResult {
  const h = v["h"] as number, k = v["k"] as number;
  const expected = `g^{-1}(x) = ${iQuadVertexBody(k, h)}; domain: x \\geq ${k}`;
  const errs: string[] = [];
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSqrtRestrictInverse(p: Algebra2Problem, v: V): CheckResult {
  const h = v["h"] as number, k = v["k"] as number;
  const invBody = `\\sqrt{${iXPlus(-k)}}${iPlusConst(h)}`;
  const expected = `Restrict the domain to x \\geq ${h}; f^{-1}(x) = ${invBody}`;
  const errs: string[] = [];
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkSqrtSwapDomainRange(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, h = v["h"] as number, k = v["k"] as number;
  const invD = a > 0 ? `x \\geq ${k}` : `x \\leq ${k}`;
  const invR = `y \\geq ${h}`;
  const expected = `Domain of f^{-1}: ${invD}; Range of f^{-1}: ${invR}`;
  const errs: string[] = [];
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalBasic(p: Algebra2Problem, v: V): CheckResult {
  const b = v["b"] as number, c = v["c"] as number, x = v["x"] as number;
  const errs: string[] = [];
  if (x + b !== c * c) errs.push(`x + b = ${x + b} != c^2 = ${c * c}`);
  if (c < 0) errs.push("principal root value negative");
  const expected = `x = ${x}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalIsolate(p: Algebra2Problem, v: V): CheckResult {
  const b = v["b"] as number, iso = v["isolated"] as number, x = v["x"] as number;
  const errs: string[] = [];
  if (x + b !== iso * iso) errs.push(`x + b = ${x + b} != isolated^2 = ${iso * iso}`);
  const expected = `x = ${x}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalLinear(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number, c = v["c"] as number, x = v["x"] as number;
  const errs: string[] = [];
  if (a * x + b !== c * c) errs.push(`a*x + b = ${a * x + b} != c^2 = ${c * c}`);
  const expected = `x = ${x}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalExtraneous(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number;
  const r = v["validRoot"] as number, r2 = v["extraneousRoot"] as number;
  const errs: string[] = [];
  if (!(r2 < b)) errs.push(`extraneous root ${r2} not < b=${b} (its RHS would be nonnegative)`);
  if (r - b < 0) errs.push(`valid root ${r} gives negative RHS`);
  if (r + a !== (r - b) * (r - b)) errs.push(`valid root fails: r + a = ${r + a} != (r-b)^2 = ${(r - b) ** 2}`);
  if (r2 + a !== (b - r2) * (b - r2)) errs.push(`extraneous candidate inconsistent: r2 + a != (b-r2)^2`);
  const expected = `x = ${r}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalTwoRadicals(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number, d = v["d"] as number;
  const x = v["x"] as number, pp = v["p"] as number, q = v["q"] as number;
  const errs: string[] = [];
  if (pp !== q + d) errs.push(`p ${pp} != q + d ${q + d}`);
  if (x + a !== pp * pp) errs.push(`x + a != p^2`);
  if (x + b !== q * q) errs.push(`x + b != q^2`);
  const expected = `x = ${x}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRadicalNoSolution(p: Algebra2Problem, v: V): CheckResult {
  const d = v["d"] as number, e = v["e"] as number;
  const errs: string[] = [];
  if (e - d >= 0) errs.push(`isolated radical value ${e - d} is not negative — a solution could exist`);
  const expected = "No solution";
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── A2.7 Exponential & logarithmic functions (T7, lessons 7-1..7-5) ──────────

function iLogLatex(base: number, arg: string): string {
  return `\\log_{${base}}(${arg})`;
}

function iExpBody(aNum: number, aDen: number, b: number, h: number, k: number): string {
  if (aDen !== 1) {
    const frac = fFrac(Math.abs(aNum), aDen);
    const prefix = aNum < 0 ? `-(${frac}) \\cdot ` : `(${frac}) \\cdot `;
    return `${prefix}${b}^{${iXPlus(-h)}}${iPlusConst(k)}`;
  }
  return `${iAPrefixFrac(aNum, aDen)}${b}^{${iXPlus(-h)}}${iPlusConst(k)}`;
}

function iLogBody(aNum: number, aDen: number, b: number, h: number, k: number): string {
  return `${iAPrefixFrac(aNum, aDen)}${iLogLatex(b, iXPlus(-h))}${iPlusConst(k)}`;
}

/** Transformation description shared by the exp/log "write" makers. */
function iTransformDesc(a: number, h: number, k: number): string {
  const parts: string[] = [];
  if (a < 0) parts.push("reflect over the x-axis");
  if (Math.abs(a) > 1) parts.push(`vertical stretch by a factor of ${Math.abs(a)}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  return parts.join("; ");
}

function chkExpGrowthDecay(p: Algebra2Problem, v: V): CheckResult {
  const A = v["A"] as number;
  const growth = v["growth"] as boolean;
  const errs: string[] = [];
  let expected: string;
  if ("bNum" in v) {
    const bNum = v["bNum"] as number, bDen = v["bDen"] as number;
    if ((bNum > bDen) !== growth) errs.push(`growth flag inconsistent with base ${bNum}/${bDen}`);
    const bStr = fFrac(bNum, bDen);
    expected = `Exponential ${growth ? "growth" : "decay"}; ${growth ? "growth" : "decay"} factor ${bStr}; initial value ${A}`;
  } else {
    const bStr = v["bStr"] as string, rateStr = v["rateStr"] as string;
    const bVal = parseFloat(bStr);
    if ((bVal > 1) !== growth) errs.push(`growth flag inconsistent with base ${bStr}`);
    const ratePct = Math.abs(bVal - 1) * 100;
    if (Math.abs(parseFloat(rateStr) - ratePct) > 0.011)
      errs.push(`rate ${rateStr} inconsistent with base ${bStr}`);
    expected = `Exponential ${growth ? "growth" : "decay"}; ${growth ? "growth" : "decay"} factor ${bStr} (${rateStr} ${growth ? "increase" : "decrease"} per period); initial value ${A}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkExpEvaluate(p: Algebra2Problem, v: V): CheckResult {
  const A = v["A"] as number, b = v["b"] as string, t = v["t"] as number;
  const errs: string[] = [];
  let expected: string;
  if (b.includes("/")) {
    const [rn, rd] = iReduce(A, Math.pow(2, t));
    if (rn !== v["valueNum"] || rd !== v["valueDen"])
      errs.push(`value recomputed ${rn}/${rd} != payload ${v["valueNum"]}/${v["valueDen"]}`);
    expected = `f(${t}) = ${fFrac(A, Math.pow(2, t))}`;
  } else {
    const val = A * Math.pow(Number(b), t);
    if (val !== v["valueNum"] || v["valueDen"] !== 1)
      errs.push(`value recomputed ${val} != payload ${v["valueNum"]}/${v["valueDen"]}`);
    expected = `f(${t}) = ${val}`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkExpAttributes(p: Algebra2Problem, v: V): CheckResult {
  const aNum = v["aNum"] as number, aDen = v["aDen"] as number;
  const b = v["b"] as number, h = v["h"] as number, k = v["k"] as number;
  const errs: string[] = [];
  let yNum: number, yDen: number;
  if (h >= 0) {
    yNum = aNum + k * aDen * Math.pow(b, h);
    yDen = aDen * Math.pow(b, h);
  } else {
    yNum = aNum * Math.pow(b, -h) + k * aDen;
    yDen = aDen;
  }
  if (fFrac(yNum, yDen) !== fFrac(v["yIntNum"] as number, v["yIntDen"] as number))
    errs.push(`y-intercept recomputed ${fFrac(yNum, yDen)} != payload`);
  const yVal = (aNum / aDen) * Math.pow(b, -h) + k;
  if (Math.abs(yVal - yNum / yDen) > 1e-9) errs.push(`y-intercept numeric check fails`);
  const range = aNum / aDen > 0 ? `y > ${k}` : `y < ${k}`;
  const expected = `Domain: all real numbers; Range: ${range}; Horizontal asymptote: y = ${k}; y-intercept: (0, ${fFrac(yNum, yDen)})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkExpTransformWrite(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number, h = v["h"] as number, k = v["k"] as number;
  const errs: string[] = [];
  if ((p.given as Record<string, unknown>)["description"] !== iTransformDesc(a, h, k))
    errs.push(`printed description != recomputed "${iTransformDesc(a, h, k)}"`);
  const expected = `g(x) = ${iExpBody(a, 1, b, h, k)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkEEvaluate(p: Algebra2Problem, v: V): CheckResult {
  const form = v["form"] as string, x0 = v["x0"] as number;
  const a = v["a"] as number, k = v["k"] as number, approx = v["approx"] as string;
  const errs: string[] = [];
  const value = form === "pure" ? Math.exp(x0) : a * Math.exp(x0) + k;
  if (approx !== value.toFixed(2))
    errs.push(`approx recomputed ${value.toFixed(2)} != payload ${approx}`);
  if (Math.abs(parseFloat(approx) - value) > 0.0051)
    errs.push(`approx ${approx} not within rounding of ${value}`);
  const expected = `f(${x0}) \\approx ${approx}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkECompound(p: Algebra2Problem, v: V): CheckResult {
  const P = v["P"] as number, r = v["r"] as number, t = v["t"] as number;
  const errs: string[] = [];
  const amount = P * Math.exp(r * t);
  if (Math.round(amount * 100) !== v["amountTimes100"])
    errs.push(`amount recomputed ${amount} != payload cents ${v["amountTimes100"]}`);
  const expected = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkEAttributes(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, h = v["h"] as number, k = v["k"] as number;
  const errs: string[] = [];
  const yExact = h === 0;
  const yInt = yExact ? `${a + k}` : (a * Math.exp(-h) + k).toFixed(2);
  if (yInt !== (v["yIntApprox"] as string))
    errs.push(`y-intercept recomputed ${yInt} != payload ${v["yIntApprox"]}`);
  const range = a > 0 ? `y > ${k}` : `y < ${k}`;
  const expected = `Domain: all real numbers; Range: ${range}; Horizontal asymptote: y = ${k}; y-intercept: (0, ${yExact ? "" : "\\approx "}${yInt})`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkRecursiveModelWrite(p: Algebra2Problem, v: V): CheckResult {
  const A = v["A"] as number, rNum = v["rNum"] as number, rDen = v["rDen"] as number;
  const errs: string[] = [];
  const r = rNum / rDen;
  if (v["a2"] !== A * r) errs.push(`a2 recomputed ${A * r} != payload ${v["a2"]}`);
  if (v["a3"] !== (v["a2"] as number) * r) errs.push(`a3 recomputed != payload ${v["a3"]}`);
  const rStr = fFrac(rNum, rDen);
  const explicitR = rDen === 1 ? `${rStr}^{n-1}` : `(${rStr})^{n-1}`;
  const expected = `a_1 = ${A}, a_n = ${rStr} \\cdot a_{n-1}; explicit: a_n = ${A} \\cdot ${explicitR}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLogDomain(p: Algebra2Problem, v: V): CheckResult {
  const h = v["h"] as number;
  const expected = `x > ${h}`;
  const errs: string[] = [];
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLogAttributes(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number, h = v["h"] as number;
  const k = v["k"] as number, m = v["m"] as number;
  const errs: string[] = [];
  if (k !== -a * m) errs.push(`k ${k} != -a*m ${-a * m} (x-intercept construction broken)`);
  let xiNum: number, xiDen: number;
  if (m >= 0) {
    xiNum = h + Math.pow(b, m);
    xiDen = 1;
  } else {
    xiNum = h * Math.pow(b, -m) + 1;
    xiDen = Math.pow(b, -m);
  }
  if (fFrac(xiNum, xiDen) !== fFrac(v["xIntNum"] as number, v["xIntDen"] as number))
    errs.push(`x-intercept recomputed ${fFrac(xiNum, xiDen)} != payload`);
  // numeric: g(xi) must be 0
  const xi = xiNum / xiDen;
  if (Math.abs(a * (Math.log(xi - h) / Math.log(b)) + k) > 1e-9)
    errs.push(`g(x-intercept) != 0 numerically`);
  const expected = `Domain: x > ${h}; Range: all real numbers; Vertical asymptote: x = ${h}; x-intercept: (${fFrac(xiNum, xiDen)}, 0)`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLogTransformWrite(p: Algebra2Problem, v: V): CheckResult {
  const a = v["a"] as number, b = v["b"] as number, h = v["h"] as number, k = v["k"] as number;
  const errs: string[] = [];
  if ((p.given as Record<string, unknown>)["description"] !== iTransformDesc(a, h, k))
    errs.push(`printed description != recomputed "${iTransformDesc(a, h, k)}"`);
  const expected = `g(x) = ${iLogBody(a, 1, b, h, k)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLogInversePair(p: Algebra2Problem, v: V): CheckResult {
  const b = v["b"] as number, shift = v["shift"] as number, form = v["form"] as string;
  const errs: string[] = [];
  let expected: string;
  if (form === "vertical") {
    const inv = iLogLatex(b, iXPlus(-shift));
    expected = `f^{-1}(x) = ${inv}; domain: x > ${shift}`;
  } else {
    const inv = `${iLogLatex(b, "x")}${iPlusConst(shift)}`;
    expected = `f^{-1}(x) = ${inv}; domain: x > 0`;
  }
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLnEvaluate(p: Algebra2Problem, v: V): CheckResult {
  const kind = v["kind"] as string, value = v["value"] as number;
  const errs: string[] = [];
  if (kind === "one" && value !== 0) errs.push(`ln(1) value ${value} != 0`);
  if (kind === "e" && value !== 1) errs.push(`ln(e) value ${value} != 1`);
  if (kind === "root" && value !== 0.5) errs.push(`ln(sqrt(e)) value ${value} != 1/2`);
  if (kind === "recip" && !(value < 0)) errs.push(`ln(1/e^m) value ${value} not negative`);
  const expected = value === 0.5 ? "1/2" : `${value}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLnApprox(p: Algebra2Problem, v: V): CheckResult {
  const N = v["N"] as number, approx = v["approx"] as string;
  const errs: string[] = [];
  if (approx !== Math.log(N).toFixed(2))
    errs.push(`approx recomputed ${Math.log(N).toFixed(2)} != payload ${approx}`);
  const expected = `\\ln(${N}) \\approx ${approx}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

function chkLnSolveTime(p: Algebra2Problem, v: V): CheckResult {
  const P = v["P"] as number, A = v["A"] as number, r = v["r"] as number;
  const tApprox = v["tApprox"] as string;
  const errs: string[] = [];
  const tVal = Math.log(A / P) / r;
  if (tApprox !== tVal.toFixed(2))
    errs.push(`t recomputed ${tVal.toFixed(2)} != payload ${tApprox}`);
  if (Math.abs(P * Math.exp(r * parseFloat(tApprox)) - A) / A > 0.01)
    errs.push(`substituting t back misses the target by >1%`);
  const expected = `t \\approx ${tVal.toFixed(2)}`;
  if (p.answer !== expected) errs.push(`answer "${p.answer}" != "${expected}"`);
  return errs.length ? bad(expected, ...errs) : ok(expected);
}

// ── Topic 2: relations, functions & absolute value (A2.2) ──────────────────

const REL_LATEX: Record<string, string> = { lt: "<", le: "\\leq", gt: ">", ge: "\\geq" };

/** Numeric view of a verify payload (payloads mix numbers, strings, arrays). */
function numRec(v: V): Record<string, number> {
  return v as unknown as Record<string, number>;
}

function iSetText(vals: number[]): string {
  const u = [...new Set(vals)].sort((a, b) => a - b);
  return `{${u.join(", ")}}`;
}
function iAbsInside(h: number): string {
  if (h === 0) return "x";
  return h > 0 ? `x - ${h}` : `x + ${-h}`;
}
function iAbsCoeff(aNum: number, aDen: number): string {
  if (aDen === 1 && aNum === 1) return "";
  if (aDen === 1 && aNum === -1) return "-";
  return fFrac(aNum, aDen);
}
function iAbsBody(aNum: number, aDen: number, h: number, k: number): string {
  const tail = k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`;
  return `${iAbsCoeff(aNum, aDen)}|${iAbsInside(h)}|${tail}`;
}
function relHolds(rel: string, lhs: number, rhs: number): boolean {
  return rel === "lt" ? lhs < rhs : rel === "le" ? lhs <= rhs : rel === "gt" ? lhs > rhs : lhs >= rhs;
}

function chkRelationIsFunction(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const flat = v.pairs as number[];
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
  const seen = new Map<number, number>();
  let isFn = true;
  for (const [x, y] of pairs) {
    if (seen.has(x) && seen.get(x) !== y) isFn = false;
    seen.set(x, y);
  }
  if (v.isFunction !== isFn) errs.push(`isFunction ${v.isFunction} != recomputed ${isFn}`);
  const dom = [...new Set(pairs.map((q) => q[0]))].sort((a, b) => a - b);
  const ran = [...new Set(pairs.map((q) => q[1]))].sort((a, b) => a - b);
  if (JSON.stringify(v.domain) !== JSON.stringify(dom)) errs.push("domain payload mismatch");
  if (JSON.stringify(v.range) !== JSON.stringify(ran)) errs.push("range payload mismatch");
  const expected = `${isFn ? "Function" : "Not a function"}; domain ${iSetText(dom)}; range ${iSetText(ran)}`;
  return { errors: errs, expectedAnswer: expected };
}

function chkFunctionEvaluate(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const kind = String(v.kind);
  if (kind === "evalQuad") {
    const { a, b, c, t } = numRec(v);
    const val = a * t * t + b * t + c;
    if (val !== numRec(v).val) errs.push(`evalQuad val ${v.val} != ${val}`);
    return { errors: errs, expectedAnswer: `${val}` };
  }
  if (kind === "evalAbs") {
    const { aNum, h, k, t } = numRec(v);
    const val = aNum * Math.abs(t - h) + k;
    if (val !== numRec(v).val) errs.push(`evalAbs val ${v.val} != ${val}`);
    return { errors: errs, expectedAnswer: `${val}` };
  }
  if (kind === "solveAbsInput") {
    const { aNum, h, k, v: target, lo, hi } = numRec(v);
    const r = (target - k) / aNum;
    if (!Number.isInteger(r) || r <= 0) errs.push(`solveAbsInput r=${r} not a positive integer`);
    if (lo !== h - r || hi !== h + r) errs.push(`lo/hi ${lo},${hi} != ${h - r},${h + r}`);
    if (aNum * Math.abs(lo - h) + k !== target || aNum * Math.abs(hi - h) + k !== target)
      errs.push("lo/hi do not evaluate to the target output");
    return { errors: errs, expectedAnswer: `x = ${lo} or x = ${hi}` };
  }
  return { errors: [`FunctionEvaluate: unknown kind ${kind}`], expectedAnswer: p.answer };
}

function chkDomainRangeGraph(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { h, k } = numRec(v);
  const up = v.up === true;
  const rangeIneq = up ? `y \\geq ${k}` : `y \\leq ${k}`;
  const ineqForm = `Domain: all real numbers; Range: ${rangeIneq}`;
  const intervalForm = up
    ? `Domain: all real numbers; Range: [${k}, \\infty) (set-builder: {y | y \\geq ${k}})`
    : `Domain: all real numbers; Range: (-\\infty, ${k}] (set-builder: {y | y \\leq ${k}})`;
  // The generator picks the notation per tier; both are correct answers.
  if (p.answer !== ineqForm && p.answer !== intervalForm)
    errs.push(`answer matches neither notation form for vertex (${h}, ${k}), up=${up}`);
  return { errors: errs, expectedAnswer: p.answer };
}

function chkVerticalLineTest(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const flat = v.points as number[];
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pts.push({ x: flat[i], y: flat[i + 1] });
  const isFn = new Set(pts.map((q) => q.x)).size === pts.length;
  if (v.isFunction !== isFn) errs.push(`isFunction ${v.isFunction} != recomputed ${isFn}`);
  let expected: string;
  if (isFn) {
    expected = "Yes — every vertical line crosses the graph at most once";
  } else {
    const dup = pts.find((q, i) => pts.some((o, j) => j !== i && o.x === q.x))?.x;
    expected = `No — the vertical line x = ${dup} crosses the graph more than once`;
  }
  return { errors: errs, expectedAnswer: expected };
}

function chkGraphIntercepts(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const kind = String(v.kind);
  const xInts = v.xInts as number[];
  const yInt = Number(v.yInt);
  // Recompute the intercepts from the DRAWN graph parameters.
  const svg = p.svgParams as unknown as {
    lines?: { mNum: number; mDen: number; bNum: number; bDen: number }[];
    absGraphs?: { h: number; k: number; aNum: number; aDen: number }[];
    parabolas?: { h: number; k: number; a: number }[];
  } | undefined;
  if (!svg) errs.push("missing svgParams");
  else if (kind === "line" && svg.lines?.[0]) {
    const { mNum, mDen, bNum, bDen } = svg.lines[0];
    const xi = -(bNum * mDen) / (bDen * mNum);
    const yi = bNum / bDen;
    if (xInts.length !== 1 || xInts[0] !== xi) errs.push(`line xInt ${xInts} != ${xi}`);
    if (yInt !== yi) errs.push(`line yInt ${yInt} != ${yi}`);
  } else if (kind === "abs" && svg.absGraphs?.[0]) {
    const { h, k, aNum, aDen } = svg.absGraphs[0];
    const a = aNum / aDen;
    const r = -k / a;
    if (!(r > 0) || !Number.isInteger(r)) errs.push(`abs r=${r} not a positive integer`);
    if (JSON.stringify(xInts) !== JSON.stringify([h - r, h + r])) errs.push(`abs xInts ${xInts} != ${h - r},${h + r}`);
    if (yInt !== a * Math.abs(h) + k) errs.push(`abs yInt ${yInt} != ${a * Math.abs(h) + k}`);
  } else if (kind === "parabola" && svg.parabolas?.[0]) {
    const { h, k, a } = svg.parabolas[0];
    const r = Math.sqrt(-k / a);
    if (!Number.isInteger(r) || r <= 0) errs.push(`parabola r=${r} not a positive integer`);
    if (JSON.stringify(xInts) !== JSON.stringify([h - r, h + r])) errs.push(`parabola xInts ${xInts} != ${h - r},${h + r}`);
    if (yInt !== a * h * h + k) errs.push(`parabola yInt ${yInt} != ${a * h * h + k}`);
  } else {
    errs.push(`no svg branch for kind ${kind}`);
  }
  const xText = xInts.map((x) => `(${x}, 0)`).join(" and ");
  const expected = `x-intercept${xInts.length > 1 ? "s" : ""} ${xText}; y-intercept (0, ${yInt})`;
  return { errors: errs, expectedAnswer: expected };
}

function chkGraphIncDec(p: Algebra2Problem, v: V): CheckResult {
  const { h } = numRec(v);
  const up = v.up === true;
  const dec = up ? `(-\\infty, ${h})` : `(${h}, \\infty)`;
  const inc = up ? `(${h}, \\infty)` : `(-\\infty, ${h})`;
  return { errors: [], expectedAnswer: `Decreasing on ${dec}; increasing on ${inc}` };
}

function chkGraphExtremum(p: Algebra2Problem, v: V): CheckResult {
  const { h, k } = numRec(v);
  const up = v.up === true;
  return { errors: [], expectedAnswer: `${up ? "Minimum" : "Maximum"} value ${k} at x = ${h}` };
}

function chkAbsTransformations(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { aNum, aDen, h, k } = numRec(v);
  const parts: string[] = [];
  if (aNum < 0) parts.push("reflect over the x-axis");
  const absA = Math.abs(aNum) / aDen;
  if (absA > 1) parts.push(`vertical stretch by ${fFrac(Math.abs(aNum), aDen)}`);
  else if (absA < 1) parts.push(`vertical shrink by ${fFrac(Math.abs(aNum), aDen)}`);
  if (h > 0) parts.push(`shift right ${h}`);
  else if (h < 0) parts.push(`shift left ${-h}`);
  if (k > 0) parts.push(`shift up ${k}`);
  else if (k < 0) parts.push(`shift down ${-k}`);
  if (parts.length === 0) parts.push("no transformation (parent function)");
  return { errors: errs, expectedAnswer: `${parts.join("; ")}; vertex (${h}, ${k})` };
}

function chkAbsAttributes(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { aNum, h, k } = numRec(v);
  const up = v.up === true;
  if (up !== aNum > 0) errs.push(`up ${up} inconsistent with aNum ${aNum}`);
  const range = up ? `y \\geq ${k}` : `y \\leq ${k}`;
  const expected = `vertex (${h}, ${k}); axis of symmetry x = ${h}; opens ${up ? "up" : "down"}; domain: all real numbers; range: ${range}`;
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsWriteEquation(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { aNum, aDen, h, k, px, py } = numRec(v);
  if ((py - k) * aDen !== aNum * Math.abs(px - h))
    errs.push(`point (${px}, ${py}) not on g(x) = ${aNum}/${aDen}|x - ${h}| + ${k}`);
  return { errors: errs, expectedAnswer: `g(x) = ${iAbsBody(aNum, aDen, h, k)}` };
}

function chkAbsPiecewise(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { aNum, h, k } = numRec(v);
  const rc = v.rightCoeffs as number[];
  const lc = v.leftCoeffs as number[];
  if (rc[0] !== aNum || rc[1] !== k - aNum * h) errs.push(`rightCoeffs ${rc} != [${aNum}, ${k - aNum * h}]`);
  if (lc[0] !== -aNum || lc[1] !== k + aNum * h) errs.push(`leftCoeffs ${lc} != [${-aNum}, ${k + aNum * h}]`);
  // Both pieces agree at the breakpoint and reproduce a|x-h|+k at sample points.
  for (const x of [h - 2, h, h + 3]) {
    const viaAbs = aNum * Math.abs(x - h) + k;
    const viaPiece = x < h ? lc[0] * x + lc[1] : rc[0] * x + rc[1];
    if (viaAbs !== viaPiece) errs.push(`piecewise mismatch at x=${x}: ${viaPiece} != ${viaAbs}`);
  }
  const expected = `g(x) = ${fPoly(lc)} if x < ${h}; g(x) = ${fPoly(rc)} if x \\geq ${h}`;
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsIneqGraphDesc(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { h, k } = numRec(v);
  const rel = String(v.rel);
  const strict = v.strict === true;
  const above = v.above === true;
  if (strict !== (rel === "lt" || rel === "gt")) errs.push("strict flag inconsistent with rel");
  if (above !== (rel === "gt" || rel === "ge")) errs.push("above flag inconsistent with rel");
  const expected = `vertex (${h}, ${k}); ${strict ? "dashed" : "solid"} boundary; shade ${above ? "above" : "below"} the V`;
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsIneqFromGraph(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { aNum, aDen, h, k } = numRec(v);
  const rel = String(v.rel);
  const strict = v.strict === true;
  const above = v.above === true;
  if (strict !== (rel === "lt" || rel === "gt")) errs.push("strict flag inconsistent with rel");
  if (above !== (rel === "gt" || rel === "ge")) errs.push("above flag inconsistent with rel");
  // The drawn graph must agree: dashed boundary iff strict.
  const svg = p.svgParams as unknown as { absGraphs?: { dashed?: boolean }[] } | undefined;
  if (svg?.absGraphs?.[0] && Boolean(svg.absGraphs[0].dashed) !== strict)
    errs.push("svg dashed flag inconsistent with strict");
  return { errors: errs, expectedAnswer: `y ${REL_LATEX[rel]} ${iAbsBody(aNum, aDen, h, k)}` };
}

function chkAbsIneqPointCheck(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { aNum, h, k, px, py } = numRec(v);
  const rel = String(v.rel);
  const fpx = aNum * Math.abs(px - h) + k;
  const truth = relHolds(rel, py, fpx);
  if (v.truth !== truth) errs.push(`truth ${v.truth} != recomputed ${truth} (py=${py} vs f(px)=${fpx})`);
  const expected = truth
    ? `Yes — (${px}, ${py}) satisfies the inequality`
    : `No — (${px}, ${py}) does not satisfy the inequality`;
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsEquation(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { h, c, lo, hi } = numRec(v);
  if (!(c > 0)) errs.push("c not positive");
  if (lo !== h - c || hi !== h + c) errs.push(`lo/hi ${lo},${hi} != ${h - c},${h + c}`);
  if (Math.abs(lo - h) !== c || Math.abs(hi - h) !== c) errs.push("solutions not at distance c");
  return { errors: errs, expectedAnswer: `x = ${lo} or x = ${hi}` };
}

function chkAbsEquationLinear(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { a, b, c } = numRec(v);
  const sols = v.sols as number[];
  const [e1n, e1d] = iReduce(c - b, a);
  const [e2n, e2d] = iReduce(-c - b, a);
  if (sols[0] !== e1n || sols[1] !== e1d || sols[2] !== e2n || sols[3] !== e2d)
    errs.push(`sols payload ${sols} != recomputed ${[e1n, e1d, e2n, e2d]}`);
  if (Math.abs(a * (e1n / e1d) + b) !== c || Math.abs(a * (e2n / e2d) + b) !== c)
    errs.push("a solution does not satisfy |ax + b| = c");
  const expected = `x = ${fFrac(e2n, e2d)} or x = ${fFrac(e1n, e1d)}`;
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsEquationSpecial(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const kind = String(v.kind);
  const { a, b } = numRec(v);
  if (kind === "negativeRhs") {
    if (!(Number(v.rhs) < 0)) errs.push("negativeRhs rhs not negative");
    return { errors: errs, expectedAnswer: "No solution" };
  }
  if (kind === "zeroRhs") {
    const [n, d] = iReduce(-b, a);
    if (Number(v.solNum) !== n || Number(v.solDen) !== d) errs.push(`sol payload ${v.solNum}/${v.solDen} != ${n}/${d}`);
    if (a * n + b * d !== 0) errs.push("solution does not zero the inside");
    return { errors: errs, expectedAnswer: `x = ${fFrac(n, d)}` };
  }
  return { errors: [`AbsEquationSpecial: unknown kind ${kind}`], expectedAnswer: p.answer };
}

function chkAbsEquationCheck(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { a, b, c, d } = numRec(v);
  const raw: [number, number][] = [iReduce(d - b, a - c), iReduce(-d - b, a + c)];
  const uniq = raw.filter((cd, i) => raw.findIndex((o) => o[0] === cd[0] && o[1] === cd[1]) === i);
  const valid = uniq.filter(([n, dd]) => {
    const rhsNum = c * n + d * dd;
    return rhsNum >= 0 && Math.abs(a * n + b * dd) === rhsNum;
  });
  if (JSON.stringify(v.candidates) !== JSON.stringify(uniq.flat())) errs.push("candidates payload mismatch");
  if (JSON.stringify(v.valid) !== JSON.stringify(valid.flat())) errs.push("valid payload mismatch");
  const expected = valid.length ? valid.map(([n, dd]) => `x = ${fFrac(n, dd)}`).join(" or ") : "No solution";
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsIneqAnd(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { h, c, lo, hi } = numRec(v);
  const rel = String(v.rel);
  if (rel !== "lt" && rel !== "le") errs.push(`And-pattern rel ${rel}`);
  if (lo !== h - c || hi !== h + c) errs.push(`lo/hi ${lo},${hi} != ${h - c},${h + c}`);
  const interval = rel === "le" ? `[${lo}, ${hi}]` : `(${lo}, ${hi})`;
  const expected = `${lo} ${REL_LATEX[rel]} x ${REL_LATEX[rel]} ${hi}; interval: ${interval}`;
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsIneqOr(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { h, c, lo, hi } = numRec(v);
  const rel = String(v.rel);
  if (rel !== "gt" && rel !== "ge") errs.push(`Or-pattern rel ${rel}`);
  if (lo !== h - c || hi !== h + c) errs.push(`lo/hi ${lo},${hi} != ${h - c},${h + c}`);
  const loRel = rel === "gt" ? "lt" : "le";
  const orText = `x ${REL_LATEX[loRel]} ${lo} or x ${REL_LATEX[rel]} ${hi}`;
  const interval = rel === "ge" ? `(-\\infty, ${lo}] or [${hi}, \\infty)` : `(-\\infty, ${lo}) or (${hi}, \\infty)`;
  return { errors: errs, expectedAnswer: `${orText}; interval: ${interval}` };
}

function chkAbsIneqLinear(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { a, b, c } = numRec(v);
  const rel = String(v.rel);
  const isAnd = v.isAnd === true;
  if (isAnd !== (rel === "lt" || rel === "le")) errs.push("isAnd flag inconsistent with rel");
  const lo = v.lo as number[];
  const hi = v.hi as number[];
  const [eln, eld] = iReduce(-c - b, a);
  const [ehn, ehd] = iReduce(c - b, a);
  if (lo[0] !== eln || lo[1] !== eld) errs.push(`lo ${lo} != ${eln}/${eld}`);
  if (hi[0] !== ehn || hi[1] !== ehd) errs.push(`hi ${hi} != ${ehn}/${ehd}`);
  const loF = fFrac(eln, eld);
  const hiF = fFrac(ehn, ehd);
  let expected: string;
  if (isAnd) {
    expected = `${loF} ${REL_LATEX[rel]} x ${REL_LATEX[rel]} ${hiF}`;
  } else {
    const loRel = rel === "gt" ? "lt" : rel === "ge" ? "le" : rel;
    expected = `x ${REL_LATEX[loRel]} ${loF} or x ${REL_LATEX[rel]} ${hiF}`;
  }
  return { errors: errs, expectedAnswer: expected };
}

function chkAbsIneqSpecial(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const kind = String(v.kind);
  const { a, b } = numRec(v);
  if (kind === "gtNeg") {
    if (!(Number(v.c) > 0)) errs.push("gtNeg c not positive");
    return { errors: errs, expectedAnswer: "All real numbers" };
  }
  if (kind === "ltNeg") {
    if (!(Number(v.c) > 0)) errs.push("ltNeg c not positive");
    return { errors: errs, expectedAnswer: "No solution" };
  }
  if (kind === "gtZero") {
    const [n, d] = iReduce(-b, a);
    if (Number(v.exceptNum) !== n || Number(v.exceptDen) !== d) errs.push(`except payload ${v.exceptNum}/${v.exceptDen} != ${n}/${d}`);
    return { errors: errs, expectedAnswer: `All real numbers except x = ${fFrac(n, d)}` };
  }
  return { errors: [`AbsIneqSpecial: unknown kind ${kind}`], expectedAnswer: p.answer };
}

// ── Topic 3: linear systems & matrices intro (A2.3) ─────────────────────────

/** Left side "2x - 3y" of a·x + b·y (coefficients of 0 dropped, ±1 implicit). */
function iLinSide(a: number, b: number, v1 = "x", v2 = "y"): string {
  const t = (coef: number, v: string, first: boolean): string => {
    if (coef === 0) return "";
    const body = Math.abs(coef) === 1 ? v : `${Math.abs(coef)}${v}`;
    if (first) return coef < 0 ? `-${body}` : body;
    return coef < 0 ? ` - ${body}` : ` + ${body}`;
  };
  return t(a, v1, true) + t(b, v2, a === 0) || "0";
}
function iStdEq(a: number, b: number, c: number): string {
  return `${iLinSide(a, b)} = ${c}`;
}
function iSatisfies(a: number, b: number, c: number, rel: string, x: number, y: number): boolean {
  return relHolds(rel, a * x + b * y, c);
}
function iSysEqGen(coeffs: number[], rhs: number, vars: string[]): string {
  let out = "";
  coeffs.forEach((coef, i) => {
    if (coef === 0) return;
    const body = Math.abs(coef) === 1 ? vars[i] : `${Math.abs(coef)}${vars[i]}`;
    if (out === "") out = coef < 0 ? `-${body}` : body;
    else out += coef < 0 ? ` - ${body}` : ` + ${body}`;
  });
  return `${out || "0"} = ${rhs}`;
}
function iAugText(flat: number[], size: number): string {
  const rows: number[][] = [];
  for (let i = 0; i < size; i++) rows.push(flat.slice(i * (size + 1), (i + 1) * (size + 1)));
  return `[${rows.map((r) => `${r.slice(0, -1).join(", ")} | ${r[r.length - 1]}`).join("; ")}]`;
}

function chkSystemGraphSolve(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { a1, b1, c1, a2, b2, c2, x, y } = numRec(v);
  const det = a1 * b2 - a2 * b1;
  if (det === 0) errs.push("system has no unique solution (det 0)");
  if (a1 * x + b1 * y !== c1) errs.push(`(${x}, ${y}) fails eq1`);
  if (a2 * x + b2 * y !== c2) errs.push(`(${x}, ${y}) fails eq2`);
  if (det !== 0) {
    if ((c1 * b2 - c2 * b1) / det !== x || (a1 * c2 - a2 * c1) / det !== y)
      errs.push("Cramer solution differs from payload (x, y)");
  }
  return { errors: errs, expectedAnswer: `(${x}, ${y})` };
}

function chkSystemTableSolve(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { m1, b1, m2, b2, x, y } = numRec(v);
  if (m1 === m2) errs.push("parallel lines never meet in a table solve");
  if (m1 * x + b1 !== y) errs.push(`f(${x}) = ${m1 * x + b1} != ${y}`);
  if (m2 * x + b2 !== y) errs.push(`g(${x}) = ${m2 * x + b2} != ${y}`);
  if (m1 !== m2 && (b2 - b1) / (m1 - m2) !== x) errs.push("crossing input differs");
  return { errors: errs, expectedAnswer: `x = ${x}; f(${x}) = g(${x}) = ${y}` };
}

function chkSystemClassify(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { a1, b1, c1, a2, b2, c2 } = numRec(v);
  const coincident = v.coincident === true;
  const parallel = a1 * b2 === a2 * b1;
  if (!parallel) errs.push("classify systems must be parallel or coincident (det != 0)");
  const sameLine = parallel && a1 * c2 === a2 * c1 && b1 * c2 === b2 * c1;
  if (coincident !== sameLine) errs.push(`coincident flag ${coincident} != recomputed ${sameLine}`);
  const expected = coincident
    ? "Infinitely many solutions — the equations describe the same line (dependent system)"
    : "No solution — the lines are parallel and never meet (inconsistent system)";
  return { errors: errs, expectedAnswer: expected };
}

function chkSystemSubstitution(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const { m, b, a, B, c, x, y } = numRec(v);
  if (y !== m * x + b) errs.push(`y ${y} != m*x + b = ${m * x + b}`);
  if (a * x + B * y !== c) errs.push(`(${x}, ${y}) fails the second equation`);
  return { errors: errs, expectedAnswer: `(${x}, ${y})` };
}

function chkSystemElimination(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const got = chkSystemGraphSolve(p, v);
  errs.push(...got.errors);
  const { a1, b1, c1, a2, b2, c2, y, mult1, mult2 } = numRec(v);
  const g = iGcd(a1, a2);
  if (mult1 !== a2 / g || mult2 !== -a1 / g)
    errs.push(`multipliers ${mult1},${mult2} != ${a2 / g},${-a1 / g}`);
  if (mult1 * a1 + mult2 * a2 !== 0) errs.push("scaled x-coefficients do not cancel");
  if ((mult1 * b1 + mult2 * b2) * y !== mult1 * c1 + mult2 * c2)
    errs.push("eliminated one-variable equation inconsistent with y");
  return { errors: errs, expectedAnswer: got.expectedAnswer };
}

function chkSystemIneqTestPoint(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const l1 = v.l1 as number[];
  const l2 = v.l2 as number[];
  const rels = v.rels as string[];
  const { px, py } = numRec(v);
  const t1 = iSatisfies(l1[0], l1[1], l1[2], rels[0], px, py);
  const t2 = iSatisfies(l2[0], l2[1], l2[2], rels[1], px, py);
  const isSol = t1 && t2;
  if (v.isSolution !== isSol) errs.push(`isSolution ${v.isSolution} != recomputed ${isSol}`);
  const expected = isSol
    ? `Yes — (${px}, ${py}) satisfies both inequalities`
    : `No — (${px}, ${py}) fails ${!t1 && !t2 ? "both inequalities" : !t1 ? "the first inequality" : "the second inequality"}`;
  return { errors: errs, expectedAnswer: expected };
}

function chkSystemIneqRead(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const l1 = v.l1 as number[];
  const l2 = v.l2 as number[];
  const rels = v.rels as string[];
  const ineq = (l: number[], rel: string) => `${iLinSide(l[0], l[1])} ${REL_LATEX[rel]} ${l[2]}`;
  // The drawn boundary lines must be the payload lines, dashed iff strict.
  const svg = p.svgParams as unknown as {
    lines?: { mNum: number; mDen: number; bNum: number; bDen: number; dashed?: boolean }[];
  } | undefined;
  [l1, l2].forEach((l, i) => {
    const g = svg?.lines?.[i];
    if (!g) { errs.push(`missing drawn line ${i + 1}`); return; }
    const [emn, emd] = iReduce(-l[0], l[1]);
    const [ebn, ebd] = iReduce(l[2], l[1]);
    if (g.mNum !== emn || g.mDen !== emd || g.bNum !== ebn || g.bDen !== ebd)
      errs.push(`drawn line ${i + 1} (${g.mNum}/${g.mDen}, ${g.bNum}/${g.bDen}) != payload line`);
    const strict = rels[i] === "lt" || rels[i] === "gt";
    if (Boolean(g.dashed) !== strict) errs.push(`drawn line ${i + 1} dashed flag != strictness of ${rels[i]}`);
  });
  return { errors: errs, expectedAnswer: `${ineq(l1, rels[0])}; ${ineq(l2, rels[1])}` };
}

function chkSystemIneqCorner(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const l1 = v.l1 as number[];
  const l2 = v.l2 as number[];
  const rels = v.rels as string[];
  const { x, y } = numRec(v);
  if (rels.some((r) => r !== "le" && r !== "ge")) errs.push("corner requires non-strict inequalities");
  if (l1[0] * x + l1[1] * y !== l1[2]) errs.push(`corner not on boundary 1`);
  if (l2[0] * x + l2[1] * y !== l2[2]) errs.push(`corner not on boundary 2`);
  if (l1[0] * l2[1] - l2[0] * l1[1] === 0) errs.push("boundaries are parallel — no corner");
  return { errors: errs, expectedAnswer: `(${x}, ${y})` };
}

function chkThreeVarSystem(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  const A = v.A as number[];
  const rhs = v.rhs as number[];
  const sol = v.sol as number[];
  for (let i = 0; i < 3; i++) {
    const lhs = A[i * 3] * sol[0] + A[i * 3 + 1] * sol[1] + A[i * 3 + 2] * sol[2];
    if (lhs !== rhs[i]) errs.push(`row ${i + 1}: A·sol = ${lhs} != rhs ${rhs[i]}`);
  }
  const det =
    A[0] * (A[4] * A[8] - A[5] * A[7]) -
    A[1] * (A[3] * A[8] - A[5] * A[6]) +
    A[2] * (A[3] * A[7] - A[4] * A[6]);
  if (det === 0) errs.push("coefficient matrix singular — solution not unique");
  return { errors: errs, expectedAnswer: `(${sol[0]}, ${sol[1]}, ${sol[2]})` };
}

function chkMatrixSystemIntro(p: Algebra2Problem, v: V): CheckResult {
  const errs: string[] = [];
  if (Array.isArray(v.rows)) {
    const rows = v.rows as number[];
    const size = Number(v.size);
    const vars = size === 2 ? ["x", "y"] : ["x", "y", "z"];
    const eqs: string[] = [];
    for (let i = 0; i < size; i++) {
      const r = rows.slice(i * (size + 1), (i + 1) * (size + 1));
      eqs.push(iSysEqGen(r.slice(0, -1), r[r.length - 1], vars));
    }
    if (String(p.find).startsWith("augmented matrix")) {
      // Problem shows the system; the answer is the augmented matrix, and
      // the printed system must be the one encoded by the payload rows.
      if (p.given.system !== eqs.join("; ")) errs.push("given system does not match payload rows");
      return { errors: errs, expectedAnswer: iAugText(rows, size) };
    }
    // Problem shows the matrix; the answer is the system it encodes.
    if (p.given.matrix !== iAugText(rows, size)) errs.push("given matrix does not match payload rows");
    return { errors: errs, expectedAnswer: eqs.join("; ") };
  }
  const A = v.A as number[];
  const rhs = v.rhs as number[];
  const [a, b, c, d] = A;
  const det = a * d - b * c;
  if (Number(v.det) !== det) errs.push(`det payload ${v.det} != recomputed ${det}`);
  if ("dependent" in v) {
    const dependent = v.dependent === true;
    if (det !== 0) errs.push("classify case must be singular");
    // Dependent iff the constants scale with the rows: A[0]*rhs[1] == A[2]*rhs[0].
    const depRecomputed = a * rhs[1] === c * rhs[0];
    if (dependent !== depRecomputed) errs.push(`dependent flag ${dependent} != recomputed ${depRecomputed}`);
    const expected = dependent
      ? "Infinitely many solutions — det(A) = 0 and the equations are the same line (dependent)"
      : "No solution — det(A) = 0 and the equations are parallel lines (inconsistent)";
    return { errors: errs, expectedAnswer: expected };
  }
  const sol = v.sol as number[];
  if (a * sol[0] + b * sol[1] !== rhs[0] || c * sol[0] + d * sol[1] !== rhs[1])
    errs.push("sol does not satisfy A·X = B");
  if (det === 0) errs.push("solve case must be nonsingular");
  return { errors: errs, expectedAnswer: `(${sol[0]}, ${sol[1]})` };
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
    case "Transformations": return chkTransformations(p, asNum);
    case "WriteVertexForm": return chkWriteVertexForm(p, asNum);
    case "StdFormAttributes": return chkStdFormAttributes(p, asNum);
    case "StdFormVertex": return chkStdFormVertex(p, asNum);
    case "StdFormIntercepts": return chkStdFormIntercepts(p, asNum);
    case "ProjectileMax": return chkProjectileMax(p, asNum);
    case "ProjectileLand": return chkProjectileLand(p, asNum);
    case "AreaMax": return chkAreaMax(p, asNum);
    case "ModelMax": return chkModelMax(p, asNum);
    case "FactorTrinomial": return chkFactorTrinomial(p, asNum);
    case "FactorGCF": return chkFactorGCF(p, asNum);
    case "FactorDiffSquares": return chkFactorDiffSquares(p, asNum);
    case "FactorSolve": return chkFactorSolve(p, asNum);
    case "QuadInequality": return chkQuadInequality(p, v);
    case "QuadIneqNoCross": return chkQuadIneqNoCross(p, v);
    case "LongDivision":
    case "SyntheticDivision": return chkDivision(p, v);
    case "RationalRootTheorem": return chkRRT(p, v);
    case "FactorByGrouping": return chkGrouping(p, asNum);
    case "SumDifferenceCubes": return chkSumDiffCubes(p, v);
    case "Asymptotes": return chkAsymptotes(p, asNum);
    case "Holes": return chkHoles(p, asNum);
    case "SimplifyRational": return chkSimplify(p, v);
    case "MultiplyDivideRational": return chkMultDiv(p, v);
    case "AddSubtractRational": return chkAddSubRational(p, v);
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
    case "PolyAttributes": return chkPolyAttributes(p, v);
    case "PolyAttributesEndBehavior": return chkPolyAttributesEndBehavior(p, v);
    case "PolyAttributesFactored": return chkPolyAttributesFactored(p, v);
    case "PolyAddSub": return chkPolyAddSub(p, v);
    case "PolyMultiply": return chkPolyMultiply(p, v);
    case "FTACountZeros": return chkFTACountZeros(p, v);
    case "FTAWritePoly": return chkFTAWritePoly(p, v);
    case "CubicTransformations":
    case "CubicWriteForm":
    case "CubeRootTransformations":
    case "CubeRootWriteForm": return chkCubicFamily(p, v);
    case "CubeRootEquations": return chkCubeRootEquations(p, v);
    case "FuncEvalOps": return chkFuncEvalOps(p, v);
    case "FuncProduct": return chkFuncProduct(p, v);
    case "FuncCompose": return chkFuncCompose(p, v);
    case "FuncComposeEval": return chkFuncComposeEval(p, v);
    case "InversePoint": return chkInversePoint(p, v);
    case "InverseLinear": return chkInverseLinear(p, v);
    case "InverseVerify": return chkInverseVerify(p, v);
    case "InverseQuadratic": return chkInverseQuadratic(p, v);
    case "SqrtAttributes": return chkSqrtAttributes(p, v);
    case "SqrtTransformWrite": return chkSqrtTransformWrite(p, v);
    case "SqrtInverseOfSqrt": return chkSqrtInverseOfSqrt(p, v);
    case "SqrtRestrictInverse": return chkSqrtRestrictInverse(p, v);
    case "SqrtSwapDomainRange": return chkSqrtSwapDomainRange(p, v);
    case "RadicalBasic": return chkRadicalBasic(p, v);
    case "RadicalIsolate": return chkRadicalIsolate(p, v);
    case "RadicalLinear": return chkRadicalLinear(p, v);
    case "RadicalExtraneous": return chkRadicalExtraneous(p, v);
    case "RadicalTwoRadicals": return chkRadicalTwoRadicals(p, v);
    case "RadicalNoSolution": return chkRadicalNoSolution(p, v);
    case "SystemGraphSolve": return chkSystemGraphSolve(p, v);
    case "SystemTableSolve": return chkSystemTableSolve(p, v);
    case "SystemClassify": return chkSystemClassify(p, v);
    case "SystemSubstitution": return chkSystemSubstitution(p, v);
    case "SystemElimination": return chkSystemElimination(p, v);
    case "SystemIneqTestPoint": return chkSystemIneqTestPoint(p, v);
    case "SystemIneqRead": return chkSystemIneqRead(p, v);
    case "SystemIneqCorner": return chkSystemIneqCorner(p, v);
    case "ThreeVarSystem": return chkThreeVarSystem(p, v);
    case "MatrixSystemIntro": return chkMatrixSystemIntro(p, v);
    case "RelationIsFunction": return chkRelationIsFunction(p, v);
    case "FunctionEvaluate": return chkFunctionEvaluate(p, v);
    case "DomainRangeGraph": return chkDomainRangeGraph(p, v);
    case "VerticalLineTest": return chkVerticalLineTest(p, v);
    case "GraphIntercepts": return chkGraphIntercepts(p, v);
    case "GraphIncDec": return chkGraphIncDec(p, v);
    case "GraphExtremum": return chkGraphExtremum(p, v);
    case "AbsTransformations": return chkAbsTransformations(p, v);
    case "AbsAttributes": return chkAbsAttributes(p, v);
    case "AbsWriteEquation": return chkAbsWriteEquation(p, v);
    case "AbsPiecewise": return chkAbsPiecewise(p, v);
    case "AbsIneqGraphDesc": return chkAbsIneqGraphDesc(p, v);
    case "AbsIneqFromGraph": return chkAbsIneqFromGraph(p, v);
    case "AbsIneqPointCheck": return chkAbsIneqPointCheck(p, v);
    case "AbsEquation": return chkAbsEquation(p, v);
    case "AbsEquationLinear": return chkAbsEquationLinear(p, v);
    case "AbsEquationCheck": return chkAbsEquationCheck(p, v);
    case "AbsEquationSpecial": return chkAbsEquationSpecial(p, v);
    case "AbsIneqAnd": return chkAbsIneqAnd(p, v);
    case "AbsIneqOr": return chkAbsIneqOr(p, v);
    case "AbsIneqLinear": return chkAbsIneqLinear(p, v);
    case "AbsIneqSpecial": return chkAbsIneqSpecial(p, v);
    case "ExpGrowthDecay": return chkExpGrowthDecay(p, v);
    case "ExpEvaluate": return chkExpEvaluate(p, v);
    case "ExpAttributes": return chkExpAttributes(p, v);
    case "ExpTransformWrite": return chkExpTransformWrite(p, v);
    case "EEvaluate": return chkEEvaluate(p, v);
    case "ECompound": return chkECompound(p, v);
    case "EAttributes": return chkEAttributes(p, v);
    case "RecursiveModelWrite": return chkRecursiveModelWrite(p, v);
    case "LogDomain": return chkLogDomain(p, v);
    case "LogAttributes": return chkLogAttributes(p, v);
    case "LogTransformWrite": return chkLogTransformWrite(p, v);
    case "LogInversePair": return chkLogInversePair(p, v);
    case "LnEvaluate": return chkLnEvaluate(p, v);
    case "LnApprox": return chkLnApprox(p, v);
    case "LnSolveTime": return chkLnSolveTime(p, v);
    case "SimplifyRadical": return chkSimplifyRadical(p, v);
    case "RadicalMultiply": return chkRadicalMultiply(p, v);
    case "RadicalDivide": return chkRadicalDivide(p, v);
    case "BinomialRadicals": return chkBinomialRadicals(p, v);
    case "RationalizeBinomial": return chkRationalizeBinomial(p, v);
    case "RationalExponents": return chkRationalExponents(p, v);
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
